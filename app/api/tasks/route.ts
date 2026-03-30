import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidYoutubeOrVideoUrl } from "@/lib/validation";
import type { TaskRow } from "@/types/database";

const TITLE_MAX = 200;
const DESC_MAX = 8_000;

const PRESET_TASK_TAGS = ["Thumbnail", "SEO", "Hook", "Editing"] as const;
type PresetTaskTag = (typeof PRESET_TASK_TAGS)[number];
const TAG_MAX_LEN = 40;
const COMPLEXITY_OPTIONS = ["beginner", "intermediate", "expert"] as const;
type ComplexityOption = (typeof COMPLEXITY_OPTIONS)[number];
const TARGET_PLATFORM_OPTIONS = ["youtube_longform", "youtube_shorts", "tiktok", "instagram_reels"] as const;
type TargetPlatformOption = (typeof TARGET_PLATFORM_OPTIONS)[number];

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
    return NextResponse.json({ tasks: (data ?? []) as TaskRow[] });
  }

  if (scope === "open") {
    const { data, error } = await admin
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .eq("is_private", false)
      .neq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tasks: (data ?? []) as TaskRow[] });
  }

  if (scope === "direct_requests") {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || profile.role !== "optimizer") {
      return NextResponse.json({ error: "Only optimizers can load direct requests" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .eq("is_private", true)
      .eq("requested_optimizer_id", user.id)
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
  /** Preset labels and/or one custom tag from the "Other" field (never the literal "Other"). */
  tags: string[];
  complexity_level: ComplexityOption;
  target_platform: TargetPlatformOption;
  /** When set, creates a private direct request for this optimizer (must be role optimizer, not self). */
  requested_optimizer_id?: string | null;
};

function normalizeTaskTag(raw: string): string | null {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t || t.length > TAG_MAX_LEN) return null;
  if ((PRESET_TASK_TAGS as readonly string[]).includes(t)) return t;
  // Custom tag: reasonable characters only (no "Other" stored as sole gimmick — client omits that label)
  if (t.toLowerCase() === "other") return null;
  if (/^[a-zA-Z0-9][a-zA-Z0-9\s\-&.]{0,39}$/.test(t)) return t;
  return null;
}

function sanitizeTaskTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of input) {
    const n = normalizeTaskTag(String(x));
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

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

    const {
      title,
      description,
      video_url,
      budget,
      tags,
      complexity_level,
      target_platform,
      requested_optimizer_id: requestedRaw,
    } = body;
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

    const safeTags = sanitizeTaskTags(tags);
    if (safeTags.length === 0) {
      return NextResponse.json(
        { success: false, error: "Add at least one tag (preset or a valid custom tag)." },
        { status: 400 }
      );
    }
    if (!COMPLEXITY_OPTIONS.includes(complexity_level)) {
      return NextResponse.json(
        { success: false, error: "Invalid complexity_level." },
        { status: 400 }
      );
    }
    if (!TARGET_PLATFORM_OPTIONS.includes(target_platform)) {
      return NextResponse.json(
        { success: false, error: "Invalid target_platform." },
        { status: 400 }
      );
    }

    let requestedOptimizerId: string | null = null;
    let isPrivate = false;
    let expiresAt: string | null = null;

    const reqTrim =
      typeof requestedRaw === "string" ? requestedRaw.trim() : requestedRaw === null ? "" : "";
    if (reqTrim) {
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(reqTrim)) {
        return NextResponse.json(
          { success: false, error: "Invalid requested_optimizer_id" },
          { status: 400 }
        );
      }
      if (reqTrim === user.id) {
        return NextResponse.json(
          { success: false, error: "You cannot direct-request yourself" },
          { status: 400 }
        );
      }
      const { data: target } = await admin
        .from("profiles")
        .select("id, role")
        .eq("id", reqTrim)
        .maybeSingle();
      if (!target || target.role !== "optimizer") {
        return NextResponse.json(
          { success: false, error: "Requested profile must be an optimizer" },
          { status: 400 }
        );
      }
      requestedOptimizerId = reqTrim;
      isPrivate = true;
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    const { data: task, error } = await admin
      .from("tasks")
      .insert({
        creator_id: user.id,
        title: t,
        description: d,
        video_url: v,
        budget,
        tags: safeTags,
        complexity_level,
        target_platform,
        status: "open" as const,
        is_private: isPrivate,
        requested_optimizer_id: requestedOptimizerId,
        expires_at: expiresAt,
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
