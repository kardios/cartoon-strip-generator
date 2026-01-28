import { ArticleExtraction } from "./extract-article";

export type PanelCount = 1 | 3 | 4;
export type Style = "clean_editorial" | "funky_surreal" | "cute_but_dark";
export type Slant = "neutral" | "playful" | "dark";

export interface PromptInput {
  extraction: ArticleExtraction;
  panelCount: PanelCount;
  style: Style;
  slant: Slant;
}

const styleDescriptions: Record<Style, string> = {
  clean_editorial:
    "classic New Yorker editorial cartoon style inspired by David Low and Herblock, " +
    "confident ink lines, cross-hatching for shadows, limited 2-3 color palette, " +
    "caricature with dignified restraint, white space as a compositional element",

  funky_surreal:
    "pop surrealism meets underground comix, inspired by Robert Crumb and Peter Bagge, " +
    "grotesque exaggeration, melting forms, impossible physics, " +
    "electric neon colors against dark backgrounds, visible chaos energy",

  cute_but_dark:
    "Sanrio meets Edward Gorey aesthetic, kawaii characters with hollow eyes, " +
    "soft rounded forms in muted pastels, cute creatures in ominous situations, " +
    "the adorable confronting the macabre, unsettling sweetness",
};

const slantDescriptions: Record<Slant, string> = {
  neutral:
    "documentary witness tone, presenting facts visually without editorializing, " +
    "letting the situation speak for itself, journalism in visual form, " +
    "the reader draws their own conclusions",

  playful:
    "witty setup-and-punchline structure, absurdist wordplay through visuals, " +
    "gentle ribbing not harsh mockery, the joke lands with a smile not a wince, " +
    "clever reversals and unexpected visual puns",

  dark:
    "gallows humor that makes you laugh then feel guilty, " +
    "uncomfortable truths delivered with deadpan timing, " +
    "the punchline is the tragedy itself, nihilistic wit, " +
    "finding absurdity in genuine suffering",
};

function getPanelGuidance(panelCount: PanelCount): string {
  switch (panelCount) {
    case 1:
      return `Panel guidance:
- present a single strong visual metaphor or punchline
- communicate the idea instantly without sequential storytelling
- the central image should dominate the frame`;
    case 3:
      return `Panel guidance:
- panel 1: establish the situation with the central image
- panel 2: introduce tension, irony, or contrast
- panel 3: deliver the visual payoff or realization
- maintain focus on the central image throughout`;
    case 4:
      return `Panel guidance:
- panel 1–2: gradual setup and escalation featuring the central image
- panel 3: complication or twist
- panel 4: consequence, punchline, or dark resolution
- the central image should anchor the narrative`;
  }
}

export function buildPrompt(input: PromptInput): string {
  const { extraction, panelCount, style, slant } = input;

  const styleDescription = styleDescriptions[style];
  const slantDescription = slantDescriptions[slant];
  const panelGuidance = getPanelGuidance(panelCount);

  return `Create a ${panelCount}-panel cartoon strip based on a news article.

Story Concept:
${extraction.concept}

Central Image (this is the HERO of your cartoon - build everything around it):
${extraction.centralImage}

Supporting Details (use sparingly, only if they strengthen the central image):
${extraction.supportingDetails}

Core Tension:
${extraction.tension}

Visual Metaphor Suggestion:
${extraction.visualMetaphor}

Visual Style:
${styleDescription}

Creative Slant:
${slantDescription}

${panelGuidance}

IMPORTANT - SIMPLICITY GUIDELINES:
- Prioritize clarity over completeness
- A single strong image is better than a busy scene
- Empty space and visual breathing room make cartoons more impactful
- You may OMIT supporting details if they would clutter the composition
- Focus on the central image - it should be immediately readable
- Avoid cramming in too many elements

The cartoon strip must:
- clearly read as a comic strip with ${panelCount} distinct panel${panelCount === 1 ? "" : "s"}
- feature the central image prominently
- use visual storytelling to communicate the core tension
- use exaggerated expressions and simplified characters
- avoid photorealism and realistic portraiture
- focus on ideas and situations rather than specific real individuals

Composition guidelines:
- panels should be clearly separated and readable
- backgrounds should be minimal and not distract from the central image
- use negative space intentionally
- the viewer's eye should go to the central image first

Do not include:
- copyrighted characters
- recognizable real people unless strictly necessary
- excessive text or long dialogue
- realistic photographic styles
- cluttered or busy compositions

Keep content suitable for general audiences.`;
}
