import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DARK_STONE_PACKS = {
  ds_30: { id: "ds_30", name: "30 Dark Stones", darkStones: 30, amountCents: 400, currency: "eur" },
  ds_80: { id: "ds_80", name: "80 Dark Stones", darkStones: 80, amountCents: 800, currency: "eur" },
  ds_180: { id: "ds_180", name: "180 Dark Stones", darkStones: 180, amountCents: 1600, currency: "eur" },
  ds_400: { id: "ds_400", name: "400 Dark Stones", darkStones: 400, amountCents: 3000, currency: "eur" },
} as const;

type PackId = keyof typeof DARK_STONE_PACKS;

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

function str(value: unknown, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const siteUrl = str(Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL"), "http://localhost:3000");
  const authHeader = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !stripeSecretKey) {
    return json({ error: "Missing required environment configuration." }, { status: 500 });
  }

  if (!authHeader.trim()) return json({ error: "Missing bearer token." }, { status: 401 });

  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
    },
  });
  const authBody = await authRes.json().catch(() => ({}));
  const user = authRes.ok && authBody && typeof authBody === "object" ? authBody as Record<string, unknown> : null;
  if (!authRes.ok || !user?.id) {
    return json({ error: String((authBody as Record<string, unknown>)?.message || (authBody as Record<string, unknown>)?.error || "Invalid or expired session.") }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const packageId = str(body.packageId).toLowerCase() as PackId;
  const pack = DARK_STONE_PACKS[packageId];
  if (!pack) return json({ error: "Invalid Dark Stone package." }, { status: 400 });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stripe = new Stripe(stripeSecretKey);

  const successUrl = new URL(str(body.successUrl), siteUrl);
  if (!successUrl.searchParams.get("darkStoneCheckout")) successUrl.searchParams.set("darkStoneCheckout", "success");
  const cancelUrl = new URL(str(body.cancelUrl), siteUrl);
  if (!cancelUrl.searchParams.get("darkStoneCheckout")) cancelUrl.searchParams.set("darkStoneCheckout", "cancel");

  await admin.from("premium_wallets").upsert({ user_id: user.id }, { onConflict: "user_id" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    client_reference_id: String(user.id),
    customer_email: str(user.email),
    metadata: {
      user_id: String(user.id),
      package_id: pack.id,
      dark_stones: String(pack.darkStones),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pack.currency,
          unit_amount: pack.amountCents,
          product_data: {
            name: pack.name,
            description: `${pack.darkStones} premium Dark Stones for Darkstone Chronicles`,
          },
        },
      },
    ],
  });

  const { error: insertError } = await admin.from("premium_checkout_sessions").insert({
    user_id: user.id,
    provider: "stripe",
    package_id: pack.id,
    currency: pack.currency,
    amount_cents: pack.amountCents,
    dark_stones: pack.darkStones,
    status: "pending",
    stripe_session_id: session.id,
    checkout_url: session.url,
    metadata: {
      stripe_mode: session.mode,
      customer_email: str(user.email),
    },
  });

  if (insertError) {
    return json({ error: insertError.message }, { status: 500 });
  }

  return json({
    ok: true,
    package: pack,
    checkoutUrl: session.url,
    stripeSessionId: session.id,
  });
});
