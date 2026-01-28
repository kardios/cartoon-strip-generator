import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { fetchArticle } from "@/lib/fetch-article";
import { extractArticle, ArticleExtraction } from "@/lib/extract-article";
import {
  buildPrompt,
  PanelCount,
  Style,
  Slant,
} from "@/lib/prompt-builder";

fal.config({
  credentials: process.env.FAL_KEY,
});

interface GenerateRequest {
  articleUrl: string;
  panelCount: PanelCount;
  style: Style;
  slant: Slant;
}

interface GenerateResponse {
  imageUrl: string;
  extraction: ArticleExtraction;
  prompt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { articleUrl, panelCount, style, slant } = body;

    // Validate inputs
    if (!articleUrl || articleUrl.trim().length === 0) {
      return NextResponse.json(
        { error: "Article URL is required" },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(articleUrl);
    } catch {
      return NextResponse.json(
        { error: "Please enter a valid URL" },
        { status: 400 }
      );
    }

    if (![1, 3, 4].includes(panelCount)) {
      return NextResponse.json(
        { error: "Panel count must be 1, 3, or 4" },
        { status: 400 }
      );
    }

    if (!["clean_editorial", "funky_surreal", "cute_but_dark"].includes(style)) {
      return NextResponse.json(
        { error: "Invalid style" },
        { status: 400 }
      );
    }

    if (!["neutral", "playful", "dark"].includes(slant)) {
      return NextResponse.json(
        { error: "Invalid slant" },
        { status: 400 }
      );
    }

    // Step 1: Fetch the article content using Jina.ai
    const articleText = await fetchArticle(articleUrl);

    // Step 2: Extract structured visual elements using Gemini
    const extraction = await extractArticle(articleText);

    // Step 3: Build the image generation prompt
    const imagePrompt = buildPrompt({
      extraction,
      panelCount,
      style,
      slant,
    });

    // Step 4: Generate the cartoon strip using fal.ai nano-banana-pro
    const result = await fal.subscribe("fal-ai/nano-banana-pro", {
      input: {
        prompt: imagePrompt,
        image_size: "landscape_16_9",
        num_images: 1,
      },
    });

    // Extract image URL from result
    const imageUrl = (result.data as { images?: { url: string }[] })?.images?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    const response: GenerateResponse = {
      imageUrl,
      extraction,
      prompt: imagePrompt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Generation error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check for specific error types
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a minute and try again." },
        { status: 429 }
      );
    }
    
    if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
      return NextResponse.json(
        { error: "API key error. Please check your API keys in .env.local" },
        { status: 401 }
      );
    }

    if (errorMessage.includes("Failed to fetch article")) {
      return NextResponse.json(
        { error: "Could not fetch article. Please check the URL and try again." },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to generate cartoon strip: ${errorMessage}` },
      { status: 500 }
    );
  }
}
