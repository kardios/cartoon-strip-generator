import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ArticleExtraction {
  concept: string;
  centralImage: string;
  supportingDetails: string;
  tension: string;
  visualMetaphor: string;
}

export async function extractArticle(articleText: string): Promise<ArticleExtraction> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a visual storyteller preparing material for an editorial cartoon. Analyze this news article and extract elements for a compelling, SIMPLE cartoon.

Remember: The best editorial cartoons have ONE strong central image, not a busy collage. Less is more.

Respond in this EXACT format (include the labels):

CONCEPT: [2-3 sentences describing the situation, what happened/is happening, and why it matters]

CENTRAL IMAGE: [The ONE key visual that captures the essence of this story. Be specific: describe a single character, object, or scene that could be the hero of the cartoon. Do not list multiple options.]

SUPPORTING DETAILS: [1-2 optional background elements that could enhance the central image, or write "none needed" if the central image is strong enough alone]

TENSION: [1 sentence describing the core conflict, irony, or contrast that makes this story interesting]

VISUAL METAPHOR: [1-2 sentences suggesting how this could be shown as a cartoon - what's the visual joke, symbol, or representation that captures the essence?]

Article:
${articleText}

Remember: Focus on what would make a SIMPLE, CLEAR cartoon. One strong image beats ten weak ones.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text().trim();

  // Parse the response
  const conceptMatch = text.match(/CONCEPT:\s*(.+?)(?=\n\nCENTRAL IMAGE:|$)/s);
  const centralImageMatch = text.match(/CENTRAL IMAGE:\s*(.+?)(?=\n\nSUPPORTING DETAILS:|$)/s);
  const supportingDetailsMatch = text.match(/SUPPORTING DETAILS:\s*(.+?)(?=\n\nTENSION:|$)/s);
  const tensionMatch = text.match(/TENSION:\s*(.+?)(?=\n\nVISUAL METAPHOR:|$)/s);
  const visualMetaphorMatch = text.match(/VISUAL METAPHOR:\s*(.+?)$/s);

  return {
    concept: conceptMatch?.[1]?.trim() || "Unable to extract concept",
    centralImage: centralImageMatch?.[1]?.trim() || "Unable to extract central image",
    supportingDetails: supportingDetailsMatch?.[1]?.trim() || "none needed",
    tension: tensionMatch?.[1]?.trim() || "Unable to extract tension",
    visualMetaphor: visualMetaphorMatch?.[1]?.trim() || "Unable to extract visual metaphor",
  };
}
