import type OpenAI from "openai";

export type TaskBrief = {
  title: string;
  description: string;
  video_url?: string | null;
};

async function fetchTextPreview(submissionUrl: string): Promise<string | null> {
  try {
    const u = new URL(submissionUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(submissionUrl, {
      signal: ctrl.signal,
      headers: {
        Accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.8",
        "User-Agent": "OptimalContent-AI-Verify/1.0",
      },
      redirect: "follow",
    });
    clearTimeout(tid);

    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/text|json|html|xml|javascript/i.test(ct)) return null;

    const text = await res.text();
    const stripped = text
      .slice(0, 8000)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return stripped.slice(0, 3500) || null;
  } catch {
    return null;
  }
}

const SYSTEM = `You are a quality checker for marketplace task submissions. You receive the ORIGINAL TASK and a SUBMITTED DELIVERABLE (URL, plus optional fetched text preview).

Return ONLY JSON: {"pass": true} or {"pass": false}

Set pass to false if:
- The URL is not a plausible https deliverable link, or looks like a joke/placeholder
- The preview (if any) is only lorem ipsum, random keystrokes, or clearly unrelated to the task
- The submission obviously cannot satisfy what the task asked for

Set pass to true if:
- The URL looks like a legitimate doc, cloud drive, GitHub, Notion, Figma, or similar work product link
- The preview (if present) shows substantive content aligned with the task, OR the URL path/host makes a strong case even without preview

Be strict about gibberish and lenient about format when intent is clear.`;

/**
 * Returns true if the deliverable passes an automated baseline check.
 */
export async function verifySubmissionWithAI(
  client: OpenAI,
  task: TaskBrief,
  submissionUrl: string
): Promise<boolean> {
  const preview = await fetchTextPreview(submissionUrl);

  const userBlock = `TASK TITLE:
${task.title}

TASK DESCRIPTION:
${task.description}

CREATOR VIDEO URL:
${task.video_url?.trim() || "n/a"}

SUBMITTED DELIVERABLE URL:
${submissionUrl}

${preview ? `FETCHED TEXT PREVIEW (truncated, may be empty for SPA):\n${preview}` : "No usable text preview was fetched — judge using the task + URL only."}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userBlock },
    ],
    response_format: { type: "json_object" },
    temperature: 0.05,
    max_tokens: 120,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return false;

  try {
    const o = JSON.parse(raw) as { pass?: boolean };
    return o.pass === true;
  } catch {
    return false;
  }
}
