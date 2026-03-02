# Cartoon Strip Generator

Generate editorial-style cartoon strips from a news article URL.

The app:
- fetches article text via Jina AI
- extracts visual story elements with Gemini
- generates a final comic image via fal.ai (`nano-banana-pro`)

## Prerequisites

- Node.js 18+ (Node.js 20 recommended)
- npm
- API keys for Gemini, Jina AI, and fal.ai

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env.local
```

3. Fill in values in `.env.local`.

## Environment Variables

Defined in [`.env.example`](.env.example):

- `GEMINI_API_KEY`: Google Gemini API key
- `JINA_API_KEY`: Jina AI API key for article text extraction
- `FAL_KEY`: fal.ai API key for image generation
- `GEMINI_MODEL` (optional): Gemini model override  
  Default: `gemini-flash-latest`

If `GEMINI_MODEL` is unset (or blank), the app falls back to `gemini-flash-latest`.

## Run Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint

## API

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

Successful response includes:
- `imageUrl` (generated image URL)
- `extraction` (Gemini-structured concept data)
- `prompt` (final prompt sent to fal.ai)
