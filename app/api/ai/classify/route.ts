import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { classifyTaskDescription } from "@/lib/ai/classify-task-description";
import { getOpenAIClient } from "@/lib/ai/openai-client";

export const runtime = "nodejs";

const DESC_MAX = 8_000;

type Body = { description?: string; title?: string };

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getOpenAIClient();
    if (!client) {
      return NextResponse.json(
        { error: "AI is not configured. Add OPENAI_API_KEY to enable polish & tags." },
        { status: 503 }
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const description = typeof body.description === "string" ? body.description : "";
    const title = typeof body.title === "string" ? body.title : undefined;

    if (description.trim().length < 20) {
      return NextResponse.json(
        { error: "Write at least 20 characters of brief before using AI polish." },
        { status: 400 }
      );
    }

    const result = await classifyTaskDescription(client, description, title);
    if (!result) {
      return NextResponse.json({ error: "Could not generate suggestions. Try again." }, { status: 502 });
    }

    if (result.polishedDescription.length > DESC_MAX) {
      result.polishedDescription = result.polishedDescription.slice(0, DESC_MAX);
    }

    const res = NextResponse.json(result);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
