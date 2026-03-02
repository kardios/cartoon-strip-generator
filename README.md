# Cartoon Strip Generator

Generate editorial-style cartoon strips from a news article URL.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create local environment file:
```bash
cp .env.example .env.local
```

3. Fill in required keys in `.env.local`.

4. Start the app:
```bash
npm run dev
```

5. Open `http://localhost:3000`.
6. Paste an article URL and click `MAKE CARTOON STRIP`.

Note: UI labels may change slightly over time; if the exact button text differs, use the main primary action button for generation.

## Prerequisites

- Node.js `20.9+` (Node 20 LTS recommended)
- npm
- API keys for:
  - Gemini
  - Jina AI
  - fal.ai
- Optional: Telegram bot token + chat ID for delivery

## Environment Variables

Defined in [`.env.example`](.env.example):

- `GEMINI_API_KEY` (required): Gemini API key used for article extraction
- `JINA_API_KEY` (required): Jina AI key used to fetch article text
- `FAL_KEY` (required): fal.ai key used for image generation
- `TELEGRAM_BOT_TOKEN` (optional): bot token used for Telegram delivery
- `TELEGRAM_CHAT_ID` (optional): destination chat ID
- `TELEGRAM_ENABLED` (optional): set `false` to disable Telegram delivery (default `true`)
- `GEMINI_MODEL` (optional): Gemini model override (default `gemini-flash-latest`)

If Telegram vars are missing (or disabled), generation still works and Telegram delivery is skipped.

## How It Works

Server flow in [`app/api/generate/route.ts`](app/api/generate/route.ts):

1. Validate request input (`articleUrl`, `panelCount`, `style`, `slant`)
2. Fetch article text with Jina via [`lib/fetch-article.ts`](lib/fetch-article.ts)
3. Extract structured concept data with Gemini via [`lib/extract-article.ts`](lib/extract-article.ts)
4. Build final image prompt via [`lib/prompt-builder.ts`](lib/prompt-builder.ts)
5. Generate image with fal.ai (`fal-ai/nano-banana-pro`)
6. Attempt Telegram delivery via [`lib/telegram.ts`](lib/telegram.ts)
7. Return image, extraction, prompt, and Telegram status flags

Frontend flow in [`app/page.tsx`](app/page.tsx):

- Default selections:
  - `panelCount = 3`
  - `style = clean_editorial`
  - `slant = playful`
- Displays generated image, article analysis, prompt, and supports download/regenerate.
- Loading steps are UI-timed indicators, not backend phase telemetry.

## API Reference

### `POST /api/generate`

Request body:

```json
{
  "articleUrl": "https://example.com/news-story",
  "panelCount": 3,
  "style": "clean_editorial",
  "slant": "neutral"
}
```

Field constraints:

- `panelCount`: `1 | 3 | 4`
- `style`: `clean_editorial | funky_surreal | cute_but_dark`
- `slant`: `neutral | playful | dark`

Success response (200) includes:

- `imageUrl`
- `extraction`
- `prompt`
- `telegramDelivered`
- `telegramPhotoDelivered`
- `telegramPromptDelivered`
- `telegramError` (optional, sanitized)

### Error Responses

Invalid URL or invalid enums (400):

```json
{ "error": "Please enter a valid URL" }
```

Article fetch failure (400):

```json
{ "error": "Could not fetch article. Please check the URL and try again." }
```

API auth issue (401):

```json
{ "error": "API key error. Please check your API keys in .env.local" }
```

Quota/rate limit issue (429):

```json
{ "error": "API quota exceeded. Please wait a minute and try again." }
```

Generic generation failure (500):

```json
{ "error": "Failed to generate cartoon strip: <details>" }
```

## Telegram Delivery

When enabled, the app sends:

- Generated image via `sendPhoto`
- Prompt artifact via `sendDocument` as `cartoon-prompt.txt`

Prompt artifact contains only:

- `articleUrl`
- `panelCount`, `style`, `slant`
- `imagePrompt`

Operational behavior:

- Delivery is non-blocking: generation can succeed even if Telegram fails.
- Telegram requests use timeout + retry logic.
- Photo delivery tries URL first, then multipart upload fallback.
- Prompt document is created as a temporary file and deleted immediately after send attempt (best-effort cleanup).

## Data and Privacy Notes

- Article content and prompt are sent to third-party services (Jina, Gemini, fal.ai, and optionally Telegram).
- Bot token and chat ID are server-side only; do not expose them to client code.
- Keep `.env.local` out of version control.

## Troubleshooting

- Telegram not receiving messages:
  - start chat with your bot (`/start`)
  - verify `TELEGRAM_CHAT_ID`
  - verify `TELEGRAM_ENABLED` is not `false`
- API key errors:
  - confirm keys are present in `.env.local`
  - restart dev server after env changes
- Slow or failed generations:
  - external API latency/quota issues are common failure sources

## Development

Scripts from [`package.json`](package.json):

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - run ESLint

Key files:

- [`app/page.tsx`](app/page.tsx)
- [`app/api/generate/route.ts`](app/api/generate/route.ts)
- [`lib/fetch-article.ts`](lib/fetch-article.ts)
- [`lib/extract-article.ts`](lib/extract-article.ts)
- [`lib/prompt-builder.ts`](lib/prompt-builder.ts)
- [`lib/telegram.ts`](lib/telegram.ts)

## Not Included / Non-Goals

- Authentication/authorization
- Rate limiting/abuse protection
- Automated test suite
- Persistent analytics/logging store
