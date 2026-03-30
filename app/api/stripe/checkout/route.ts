import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type { TaskRow } from "@/types/database";

function appOrigin(request: Request): string {
  return (
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { task_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const taskId = body.task_id;
  if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: task, error: fetchErr } = await admin
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (fetchErr || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const t = task as TaskRow;
  const needsPay = t.status === "open" && !t.stripe_charge_id;
  if (!needsPay) {
    return NextResponse.json({ error: "Task is not awaiting payment" }, { status: 400 });
  }

  const stripe = getStripe();
  const origin = appOrigin(request);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: t.budget,
          product_data: {
            name: `Optimal Content — ${t.title.slice(0, 80)}`,
            description: "Task escrow (platform holds until delivery approved)",
          },
        },
      },
    ],
    success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?checkout=cancel`,
    metadata: {
      task_id: t.id,
      creator_id: user.id,
    },
    payment_intent_data: {
      metadata: {
        task_id: t.id,
        creator_id: user.id,
      },
    },
  });

  await admin
    .from("tasks")
    .update({
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", t.id);

  return NextResponse.json({ url: session.url });
}
