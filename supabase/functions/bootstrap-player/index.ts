import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BootstrapPayload = {
  heroName?: string;
  heroPortrait?: string;
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

function getSafeString(value: unknown, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function isUniqueViolation(message: string) {
  return /duplicate key value|unique constraint|already exists/i.test(String(message || ""));
}

function buildPublicStats(payload: BootstrapPayload, email: string) {
  const save = payload.saveData && typeof payload.saveData === "object" ? payload.saveData : {};
  const totalStats = typeof (save as Record<string, unknown>).stats === "object"
    ? (((save as Record<string, unknown>).stats as Record<string, unknown>).total as Record<string, unknown> | undefined) || {}
    : {};
  const heroName = getSafeString(
    payload.heroName ?? (save as Record<string, unknown>).heroName,
    email.split("@")[0] || "Hero",
  );
  const heroLevel = Math.max(1, Number((save as Record<string, unknown>).heroLevel ?? 1) || 1);
  const heroXP = Math.max(0, Number((save as Record<string, unknown>).heroXP ?? 0) || 0);
  const miningLevel = Math.max(1, Number((save as Record<string, unknown>).miningLevel ?? 1) || 1);
  const miningXP = Math.max(0, Number((save as Record<string, unknown>).miningXP ?? 0) || 0);
  const forgeLevel = Math.max(1, Number((save as Record<string, unknown>).blacksmithLevel ?? (save as Record<string, unknown>).forgeLevel ?? 1) || 1);
  const forgeXP = Math.max(0, Number((save as Record<string, unknown>).blacksmithXP ?? (save as Record<string, unknown>).forgeXP ?? 0) || 0);
  const woodcuttingLevel = Math.max(1, Number((save as Record<string, unknown>).woodcuttingLevel ?? (save as Record<string, unknown>).woodworkingLevel ?? 1) || 1);
  const woodcuttingXP = Math.max(0, Number((save as Record<string, unknown>).woodcuttingXP ?? (save as Record<string, unknown>).woodworkingXP ?? 0) || 0);
  const carpentryLevel = Math.max(1, Number((save as Record<string, unknown>).carpentryLevel ?? 1) || 1);
  const carpentryXP = Math.max(0, Number((save as Record<string, unknown>).carpentryXP ?? 0) || 0);
  const huntingLevel = Math.max(1, Number((save as Record<string, unknown>).huntingLevel ?? 1) || 1);
  const huntingXP = Math.max(0, Number((save as Record<string, unknown>).huntingXP ?? 0) || 0);
  const fishingLevel = Math.max(1, Number((save as Record<string, unknown>).fishingLevel ?? 1) || 1);
  const fishingXP = Math.max(0, Number((save as Record<string, unknown>).fishingXP ?? 0) || 0);
  const cookingLevel = Math.max(1, Number((save as Record<string, unknown>).cookingLevel ?? 1) || 1);
  const cookingXP = Math.max(0, Number((save as Record<string, unknown>).cookingXP ?? 0) || 0);
  const herbalismLevel = Math.max(1, Number((save as Record<string, unknown>).herbalismLevel ?? 1) || 1);
  const herbalismXP = Math.max(0, Number((save as Record<string, unknown>).herbalismXP ?? 0) || 0);
  const alchemyLevel = Math.max(1, Number((save as Record<string, unknown>).alchemyLevel ?? 1) || 1);
  const alchemyXP = Math.max(0, Number((save as Record<string, unknown>).alchemyXP ?? 0) || 0);
  const enchantingLevel = Math.max(1, Number((save as Record<string, unknown>).enchantingLevel ?? 1) || 1);
  const enchantingXP = Math.max(0, Number((save as Record<string, unknown>).enchantingXP ?? 0) || 0);
  const dungeonsCompleted = Math.max(0, Number(totalStats.dungeonsCompleted ?? 0) || 0);
  const totalGold = Math.max(0, Number((save as Record<string, unknown>).gold ?? 0) || 0);
  const combatPower = Math.max(
    0,
    Number((save as Record<string, unknown>).heroAtk ?? 0) +
      Number((save as Record<string, unknown>).heroDef ?? 0),
  );

  return { heroName, heroLevel, heroXP, miningLevel, miningXP, forgeLevel, forgeXP, woodcuttingLevel, woodcuttingXP, carpentryLevel, carpentryXP, huntingLevel, huntingXP, fishingLevel, fishingXP, cookingLevel, cookingXP, herbalismLevel, herbalismXP, alchemyLevel, alchemyXP, enchantingLevel, enchantingXP, dungeonsCompleted, totalGold, combatPower };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase environment is not configured." }, { status: 500 });
  }

  if (!token) {
    return json({ error: "Missing bearer token." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return json({ error: "Invalid or expired session." }, { status: 401 });
  }

  let payload: BootstrapPayload = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const email = getSafeString(user.email, "hero@darkstone.local");
  const avatarUrl = getSafeString(
    payload.heroPortrait ?? user.user_metadata?.avatar_url,
    "",
  );
  const stats = buildPublicStats(payload, email);
  const explicitHeroName = getSafeString(payload.heroName ?? (payload.saveData as Record<string, unknown> | null)?.heroName, "");

  if (explicitHeroName && (explicitHeroName.length < 3 || explicitHeroName.length > 20)) {
    return json({ error: "Hero name must be between 3 and 20 characters." }, { status: 400 });
  }

  if (explicitHeroName) {
    const { error: heroNameError } = await admin.from("hero_names").upsert({
      user_id: user.id,
      hero_name: explicitHeroName,
    });

    if (heroNameError) {
      if (isUniqueViolation(heroNameError.message)) {
        return json({ error: "That hero name is already taken." }, { status: 409 });
      }
      return json({ error: heroNameError.message }, { status: 500 });
    }
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    email,
    display_name: stats.heroName,
    avatar_url: avatarUrl || null,
  });

  if (profileError) {
    return json({ error: profileError.message }, { status: 500 });
  }

  const { data: existingSave } = await admin
    .from("player_saves")
    .select("revision")
    .eq("user_id", user.id)
    .maybeSingle();

  if (payload.saveData) {
    const nextRevision = Number(existingSave?.revision ?? 0) + 1;
    const { error: saveError } = await admin.from("player_saves").upsert({
      user_id: user.id,
      save_data: payload.saveData,
      revision: nextRevision,
      last_synced_at: new Date().toISOString(),
    });

    if (saveError) {
      return json({ error: saveError.message }, { status: 500 });
    }
  } else if (!existingSave) {
    const { error: initSaveError } = await admin.from("player_saves").insert({
      user_id: user.id,
      save_data: {},
      revision: 1,
      last_synced_at: new Date().toISOString(),
    });

    if (initSaveError) {
      return json({ error: initSaveError.message }, { status: 500 });
    }
  }

  const { error: statsError } = await admin.from("player_public_stats").upsert({
    user_id: user.id,
    hero_name: stats.heroName,
    hero_level: stats.heroLevel,
    hero_xp: stats.heroXP,
    mining_level: stats.miningLevel,
    mining_xp: stats.miningXP,
    forge_level: stats.forgeLevel,
    forge_xp: stats.forgeXP,
    woodcutting_level: stats.woodcuttingLevel,
    woodcutting_xp: stats.woodcuttingXP,
    carpentry_level: stats.carpentryLevel,
    carpentry_xp: stats.carpentryXP,
    hunting_level: stats.huntingLevel,
    hunting_xp: stats.huntingXP,
    fishing_level: stats.fishingLevel,
    fishing_xp: stats.fishingXP,
    cooking_level: stats.cookingLevel,
    cooking_xp: stats.cookingXP,
    herbalism_level: stats.herbalismLevel,
    herbalism_xp: stats.herbalismXP,
    alchemy_level: stats.alchemyLevel,
    alchemy_xp: stats.alchemyXP,
    enchanting_level: stats.enchantingLevel,
    enchanting_xp: stats.enchantingXP,
    dungeons_completed: stats.dungeonsCompleted,
    total_gold: stats.totalGold,
    combat_power: stats.combatPower,
  });

  if (statsError) {
    return json({ error: statsError.message }, { status: 500 });
  }

  return json({
    ok: true,
    userId: user.id,
    profile: {
      email,
      displayName: stats.heroName,
      avatarUrl,
    },
    stats,
    saveImported: Boolean(payload.saveData),
  });
});
