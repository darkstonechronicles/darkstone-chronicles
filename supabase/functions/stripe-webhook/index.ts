import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

function int(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? Math.trunc(next) : fallback;
}

function str(value: unknown, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
    return json({ error: "Missing required environment configuration." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing Stripe signature." }, { status: 400 });

  const body = await req.text();
  const stripe = new Stripe(stripeSecretKey);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
  } catch (error) {
    return json({ error: `Webhook verification failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = str(session.metadata?.user_id || session.client_reference_id);
    const packageId = str(session.metadata?.package_id);
    const darkStones = Math.max(0, int(session.metadata?.dark_stones, 0));
    const stripeSessionId = str(session.id);
    const stripePaymentIntentId = str(session.payment_intent);

    if (!userId || !packageId || darkStones <= 0 || !stripeSessionId) {
      return json({ error: "Missing required checkout metadata." }, { status: 400 });
    }

    const { data: existingTx } = await admin
      .from("premium_transactions")
      .select("id")
      .eq("source", "stripe_checkout")
      .eq("source_ref", stripeSessionId)
      .maybeSingle();

    if (!existingTx) {
      const { data: walletRow, error: walletFetchError } = await admin
        .from("premium_wallets")
        .select("dark_stones, lifetime_purchased, lifetime_spent")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletFetchError) return json({ error: walletFetchError.message }, { status: 500 });

      const nextBalance = Math.max(0, int(walletRow?.dark_stones, 0)) + darkStones;
      const nextPurchased = Math.max(0, int(walletRow?.lifetime_purchased, 0)) + darkStones;

      const { error: walletUpsertError } = await admin
        .from("premium_wallets")
        .upsert({
          user_id: userId,
          dark_stones: nextBalance,
          lifetime_purchased: nextPurchased,
          lifetime_spent: Math.max(0, int(walletRow?.lifetime_spent, 0)),
        }, { onConflict: "user_id" });

      if (walletUpsertError) return json({ error: walletUpsertError.message }, { status: 500 });

      const { error: txInsertError } = await admin
        .from("premium_transactions")
        .insert({
          user_id: userId,
          kind: "purchase",
          currency: "dark_stone",
          amount: darkStones,
          balance_after: nextBalance,
          source: "stripe_checkout",
          source_ref: stripeSessionId,
          metadata: {
            package_id: packageId,
            stripe_session_id: stripeSessionId,
            stripe_payment_intent_id: stripePaymentIntentId,
            amount_total: session.amount_total,
            currency: session.currency,
          },
        });

      if (txInsertError) return json({ error: txInsertError.message }, { status: 500 });
    }

    const { error: checkoutUpdateError } = await admin
      .from("premium_checkout_sessions")
      .update({
        status: "completed",
        stripe_payment_intent_id: stripePaymentIntentId || null,
        fulfilled_at: new Date().toISOString(),
        metadata: {
          stripe_payment_status: session.payment_status,
          customer_email: session.customer_details?.email || session.customer_email || null,
        },
      })
      .eq("stripe_session_id", stripeSessionId);

    if (checkoutUpdateError) return json({ error: checkoutUpdateError.message }, { status: 500 });
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const stripeSessionId = str(session.id);
    if (stripeSessionId) {
      await admin
        .from("premium_checkout_sessions")
        .update({ status: "expired" })
        .eq("stripe_session_id", stripeSessionId);
    }
  }

  return json({ received: true });
});
