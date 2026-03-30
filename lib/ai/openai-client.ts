import OpenAI from "openai";

/** Returns client when `OPENAI_API_KEY` is set; otherwise null (optional AI features skip). */
export function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}
