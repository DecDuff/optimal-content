import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidYoutubeOrVideoUrl } from "@/lib/validation";
import type { TaskRow } from "@/types/database";

const TITLE_MAX = 200;
const DESC_MAX = 8_000;

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  const admin = createSupabaseAdmin();

  if (scope === "mine") {
    const { data, error } = await admin
      .from("tasks")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (process.env.NODE_ENV === "development") {
      console.info("[api/tasks mine]", { count: data?.length ?? 0, userId: user.id });
    }
    return NextResponse.json({ tasks: (data ?? []) as TaskRow[] });
  }

  if (scope === "open") {
    const { data, error } = await admin
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .neq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tasks: (data ?? []) as TaskRow[] });
  }

  if (scope === "optimizer") {
    const { data, error } = await admin
      .from("tasks")
      .select("*")
      .eq("optimizer_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tasks: (data ?? []) as TaskRow[] });
  }

  return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
}

type CreateBody = {
  title: string;
  description: string;
  video_url: string;
  /** USD cents (integer). Maps to DB column `budget`. */
  budget: number;
};

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "creator") {
      return NextResponse.json({ success: false, error: "Only creators can post tasks" }, { status: 403 });
    }

    let body: CreateBody;
    try {
      body = (await request.json()) as CreateBody;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const { title, description, video_url, budget } = body;
    const t = title?.trim() ?? "";
    const d = description?.trim() ?? "";
    const v = video_url?.trim() ?? "";

    if (!t || !d || !v) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }
    if (t.length > TITLE_MAX || d.length > DESC_MAX) {
      return NextResponse.json({ success: false, error: "Title or description exceeds maximum length" }, { status: 400 });
    }
    if (!isValidYoutubeOrVideoUrl(v)) {
      return NextResponse.json({ success: false, error: "Enter a valid video URL (https)" }, { status: 400 });
    }
    if (!Number.isInteger(budget) || budget < 50) {
      return NextResponse.json(
        { success: false, error: "budget must be an integer >= 50 (cents)" },
        { status: 400 }
      );
    }

    const { data: task, error } = await admin
      .from("tasks")
      .insert({
        creator_id: user.id,
        title: t,
        description: d,
        video_url: v,
        budget,
        status: "open",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: task as TaskRow });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
