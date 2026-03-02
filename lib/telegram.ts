import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface TelegramApiSuccess<T = unknown> {
  ok: true;
  result: T;
}

interface TelegramApiFailure {
  ok: false;
  description?: string;
  error_code?: number;
}

type TelegramApiResponse<T = unknown> = TelegramApiSuccess<T> | TelegramApiFailure;

export interface TelegramDeliveryResult {
  telegramDelivered: boolean;
  telegramPhotoDelivered: boolean;
  telegramPromptDelivered: boolean;
  telegramError?: string;
}

interface SendTelegramOutputInput {
  imageUrl: string;
  articleUrl: string;
  panelCount: number;
  style: string;
  slant: string;
  imagePrompt: string;
  caption: string;
}

const TELEGRAM_TIMEOUT_MS = 8000;
const TELEGRAM_MAX_ATTEMPTS = 2;

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const enabledValue = process.env.TELEGRAM_ENABLED?.trim().toLowerCase();
  const enabled = enabledValue ? enabledValue !== "false" : true;

  if (!enabled || !botToken || !chatId) {
    return null;
  }

  return { botToken, chatId };
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot<redacted>")
    .replace(/chat_id["'=:\s-]*\d+/gi, "chat_id=<redacted>");
}

function shouldRetry(statusCode: number, attempt: number): boolean {
  return attempt < TELEGRAM_MAX_ATTEMPTS && (statusCode >= 500 || statusCode === 429);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = TELEGRAM_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callTelegramApi<T>(
  botToken: string,
  method: string,
  body: BodyInit,
  headers?: HeadersInit
): Promise<TelegramApiSuccess<T>> {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  let lastError = "Unknown Telegram error";

  for (let attempt = 1; attempt <= TELEGRAM_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers,
        body,
      });
      const payload = (await response.json()) as TelegramApiResponse<T>;

      if (response.ok && payload.ok) {
        return payload;
      }

      const description =
        "description" in payload && payload.description
          ? payload.description
          : `HTTP ${response.status}`;
      lastError = sanitizeErrorMessage(description);

      if (!shouldRetry(response.status, attempt)) {
        break;
      }
    } catch (error) {
      lastError = sanitizeErrorMessage(
        error instanceof Error ? error.message : "Network failure while calling Telegram"
      );
      if (attempt >= TELEGRAM_MAX_ATTEMPTS) {
        break;
      }
    }
  }

  throw new Error(lastError);
}

async function sendTelegramPhotoByUrl(
  botToken: string,
  chatId: string,
  imageUrl: string,
  caption: string
): Promise<void> {
  const payload = {
    chat_id: chatId,
    photo: imageUrl,
    caption,
  };
  await callTelegramApi(botToken, "sendPhoto", JSON.stringify(payload), {
    "Content-Type": "application/json",
  });
}

async function sendTelegramPhotoByUpload(
  botToken: string,
  chatId: string,
  imageUrl: string,
  caption: string
): Promise<void> {
  const imageResponse = await fetchWithTimeout(imageUrl, {}, TELEGRAM_TIMEOUT_MS);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image for Telegram upload (${imageResponse.status})`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", caption);
  formData.append("photo", new Blob([imageBuffer]), "cartoon-strip.png");

  await callTelegramApi(botToken, "sendPhoto", formData);
}

async function sendTelegramPromptDocument(
  botToken: string,
  chatId: string,
  filePath: string
): Promise<void> {
  const fileBytes = await readFile(filePath);
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", "Prompt used for generation");
  formData.append("document", new Blob([fileBytes], { type: "text/plain" }), "cartoon-prompt.txt");

  await callTelegramApi(botToken, "sendDocument", formData);
}

function buildPromptArtifactContent(input: SendTelegramOutputInput): string {
  return [
    `createdAt: ${new Date().toISOString()}`,
    `articleUrl: ${input.articleUrl}`,
    `panelCount: ${input.panelCount}`,
    `style: ${input.style}`,
    `slant: ${input.slant}`,
    "",
    "imagePrompt:",
    input.imagePrompt,
    "",
  ].join("\n");
}

async function createTemporaryPromptFile(input: SendTelegramOutputInput): Promise<string> {
  const filePath = join(tmpdir(), `cartoon-prompt-${randomUUID()}.txt`);
  const content = buildPromptArtifactContent(input);
  await writeFile(filePath, content, "utf8");
  return filePath;
}

async function cleanupTemporaryFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      const message =
        error instanceof Error ? sanitizeErrorMessage(error.message) : "Temporary file cleanup failed";
      console.error("Telegram prompt temp file cleanup failed:", message);
    }
  }
}

export async function sendTelegramOutput(
  input: SendTelegramOutputInput
): Promise<TelegramDeliveryResult> {
  const config = getTelegramConfig();
  if (!config) {
    return {
      telegramDelivered: false,
      telegramPhotoDelivered: false,
      telegramPromptDelivered: false,
    };
  }

  const { botToken, chatId } = config;
  let photoDelivered = false;
  let promptDelivered = false;
  let firstError: string | undefined;

  try {
    await sendTelegramPhotoByUrl(botToken, chatId, input.imageUrl, input.caption);
    photoDelivered = true;
  } catch (urlError) {
    try {
      await sendTelegramPhotoByUpload(botToken, chatId, input.imageUrl, input.caption);
      photoDelivered = true;
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Photo delivery failed";
      firstError = sanitizeErrorMessage(message);
      console.error("Telegram photo delivery failed:", firstError);
      const originalMessage =
        urlError instanceof Error ? sanitizeErrorMessage(urlError.message) : undefined;
      if (originalMessage) {
        console.error("Telegram photo URL attempt failed:", originalMessage);
      }
    }
  }

  try {
    const tempFilePath = await createTemporaryPromptFile(input);
    try {
      await sendTelegramPromptDocument(botToken, chatId, tempFilePath);
      promptDelivered = true;
    } finally {
      await cleanupTemporaryFile(tempFilePath);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompt delivery failed";
    const safeMessage = sanitizeErrorMessage(message);
    firstError = firstError ?? safeMessage;
    console.error("Telegram prompt document delivery failed:", safeMessage);
  }

  return {
    telegramDelivered: photoDelivered && promptDelivered,
    telegramPhotoDelivered: photoDelivered,
    telegramPromptDelivered: promptDelivered,
    telegramError: firstError,
  };
}
