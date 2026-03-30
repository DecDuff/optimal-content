import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeWebhookSecret } from "@/lib/env/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const taskId = session.metadata?.task_id;
    if (!taskId) {
      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    let chargeId: string | null = null;
    if (paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
      const lc = pi.latest_charge;
      chargeId = typeof lc === "string" ? lc : lc?.id ?? null;
    }

    const admin = createSupabaseAdmin();
    const { data: row } = await admin.from("tasks").select("id, stripe_charge_id").eq("id", taskId).maybeSingle();

    if (row && !row.stripe_charge_id) {
      await admin
        .from("tasks")
        .update({
          status: "open",
          stripe_payment_intent_id: paymentIntentId,
          stripe_charge_id: chargeId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);
    }
  }

  return NextResponse.json({ received: true });
}
