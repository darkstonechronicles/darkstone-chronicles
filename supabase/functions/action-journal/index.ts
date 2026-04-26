import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JournalPayload = {
  actionId?: string;
  actionKind?: string;
  sourcePage?: string;
  baseRevision?: number;
  payload?: Record<string, unknown> | null;
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

function str(value: unknown, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function int(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: "Supabase environment is not configured." }, { status: 500 });
  }

  if (!token) {
    return json({ ok: false, error: "Missing bearer token." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return json({ ok: false, error: "Invalid or expired session." }, { status: 401 });
  }

  let payload: JournalPayload = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const actionId = str(payload.actionId).slice(0, 160);
  const actionKind = str(payload.actionKind).slice(0, 80);
  const sourcePage = str(payload.sourcePage).slice(0, 120);
  const baseRevision = int(payload.baseRevision, 0);
  const actionPayload = payload.payload && typeof payload.payload === "object" ? payload.payload : {};

  if (!actionId) {
    return json({ ok: false, error: "Action id is required." }, { status: 400 });
  }
  if (!actionKind) {
    return json({ ok: false, error: "Action kind is required." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await admin
    .from("player_action_journal")
    .select("id, action_id")
    .eq("user_id", user.id)
    .eq("action_id", actionId)
    .maybeSingle();

  if (existingError) {
    return json({ ok: false, error: existingError.message }, { status: 500 });
  }

  if (existing?.id) {
    return json({ ok: true, duplicate: true, actionId });
  }

  const { error: insertError } = await admin.from("player_action_journal").insert({
    user_id: user.id,
    action_id: actionId,
    action_kind: actionKind,
    source_page: sourcePage,
    status: "committed",
    base_revision: baseRevision,
    payload: actionPayload,
  });

  if (insertError) {
    return json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return json({
    ok: true,
    created: true,
    actionId,
    actionKind,
  });
});
