import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BackupPayload = {
  reason?: string;
  revision?: number;
  saveData?: Record<string, unknown> | null;
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

function isMeaningfulSave(saveData: unknown) {
  const save = saveData && typeof saveData === "object" ? saveData as Record<string, unknown> : {};
  return Object.keys(save).length > 0 && (
    Boolean(save.heroCreated) ||
    Array.isArray(save.inventory) ||
    int(save.heroLevel, 0) > 0 ||
    str(save.heroName).length > 0
  );
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

  let payload: BackupPayload = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const reason = str(payload.reason, "sync").slice(0, 80) || "sync";
  const revision = int(payload.revision, 0);
  const saveData = payload.saveData && typeof payload.saveData === "object" ? payload.saveData : {};

  if (!revision) {
    return json({ ok: false, error: "Revision is required." }, { status: 400 });
  }

  if (!isMeaningfulSave(saveData)) {
    return json({ ok: true, skipped: true, reason, revision });
  }

  const { data: latestBackup, error: latestBackupError } = await admin
    .from("player_save_backups")
    .select("revision")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestBackupError) {
    return json({ ok: false, error: latestBackupError.message }, { status: 500 });
  }

  const latestRevision = int(latestBackup?.revision, 0);
  if (latestRevision >= revision) {
    return json({ ok: true, skipped: true, reason, revision: latestRevision });
  }

  const { error: insertError } = await admin.from("player_save_backups").insert({
    user_id: user.id,
    actor_user_id: user.id,
    reason,
    save_data: saveData,
    revision,
  });

  if (insertError) {
    return json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return json({
    ok: true,
    created: true,
    reason,
    revision,
  });
});
