import type OpenAI from "openai";

const SYSTEM = `You are an assistant for a video optimization marketplace. Given a creator's raw brief, output ONLY valid JSON with these keys:
- polishedDescription: string — a clearer, professional brief that preserves intent; max 8000 characters.
- suggestedTags: array of exactly 3 short tags. Prefer these labels when they fit: Thumbnail, SEO, Hook, Editing. Otherwise use specific custom labels (e.g. "B-roll", "Color grading"). No empty strings, no duplicates.
- difficulty: exactly one of "Beginner", "Intermediate", "Advanced" based on scope, depth, and ambiguity of the brief.`;

export type ClassifyTaskOutput = {
  polishedDescription: string;
  suggestedTags: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
};

export async function classifyTaskDescription(
  client: OpenAI,
  description: string,
  title?: string
): Promise<ClassifyTaskOutput | null> {
  const trimmed = description.trim();
  if (trimmed.length < 8) return null;

  const userMsg = title?.trim()
    ? `Title hint: ${title.trim()}\n\nRaw brief:\n${trimmed}`
    : `Raw brief:\n${trimmed}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userMsg },
    ],
    response_format: { type: "json_object" },
    temperature: 0.35,
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;

  let parsed: { polishedDescription?: unknown; suggestedTags?: unknown; difficulty?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return null;
  }

  const polished = String(parsed.polishedDescription ?? "").trim().slice(0, 8000);
  if (polished.length < 10) return null;

  let tags = Array.isArray(parsed.suggestedTags)
    ? parsed.suggestedTags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  while (tags.length < 3) tags.push("General");
  tags = tags.slice(0, 3);

  const rawDiff = String(parsed.difficulty ?? "Intermediate").trim();
  const difficulty: ClassifyTaskOutput["difficulty"] = (
    ["Beginner", "Intermediate", "Advanced"] as const
  ).includes(rawDiff as ClassifyTaskOutput["difficulty"])
    ? (rawDiff as ClassifyTaskOutput["difficulty"])
    : "Intermediate";

  return { polishedDescription: polished, suggestedTags: tags, difficulty };
}
