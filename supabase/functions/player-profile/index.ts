import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EQUIPMENT_SLOTS = [
  "mainHand",
  "offHand",
  "helmet",
  "shoulders",
  "chest",
  "bracers",
  "gloves",
  "belt",
  "pants",
  "boots",
  "ring",
  "amulet",
];

type JsonRecord = Record<string, unknown>;

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

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function int(value: unknown, fallback = 0) {
  return Math.trunc(num(value, fallback));
}

function sanitizeItem(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as JsonRecord;
  return {
    name: str(item.name, "Item"),
    img: str(item.img),
    type: str(item.type),
    slot: str(item.slot),
    rarity: str(item.rarity),
    setId: str(item.setId),
    crafted: item.crafted === true,
    atk: Math.max(0, int(item.atk, 0)),
    def: Math.max(0, int(item.def, 0)),
    upg: Math.max(0, int(item.upg, 0)),
    reqLevel: Math.max(1, int(item.reqLevel, 1)),
  };
}

function sanitizeEquipment(raw: unknown) {
  const source = raw && typeof raw === "object" ? raw as JsonRecord : {};
  const next: Record<string, ReturnType<typeof sanitizeItem> | null> = {};
  for (const slot of EQUIPMENT_SLOTS) {
    next[slot] = sanitizeItem(source[slot]);
  }
  return next;
}

function buildOverview(profile: JsonRecord, publicStats: JsonRecord, save: JsonRecord) {
  const totalStats = save.stats && typeof save.stats === "object"
    ? (((save.stats as JsonRecord).total as JsonRecord | undefined) || {})
    : {};
  return {
    heroName: str(profile.display_name || publicStats.hero_name || save.heroName || save.playerName, "Hero"),
    heroLevel: Math.max(1, int(publicStats.hero_level ?? save.heroLevel, 1)),
    heroXP: Math.max(0, int(publicStats.hero_xp ?? save.heroXP, 0)),
    combatPower: Math.max(
      0,
      int(publicStats.combat_power, int(save.attackTotal, int(save.heroAtk ?? save.heroAttack, 0)) + int(save.defenseTotal, int(save.heroDef ?? save.heroDefense, 0))),
    ),
    totalGold: Math.max(0, int(publicStats.total_gold ?? save.gold, 0)),
    dungeonsCompleted: Math.max(0, int(publicStats.dungeons_completed ?? totalStats.dungeonsCompleted, 0)),
    heroHP: Math.max(0, int(save.heroHP, 0)),
    heroHPMax: Math.max(0, int(save.heroHPMax, 0)),
    stamina: Math.max(0, int(save.stamina, 0)),
    staminaMax: Math.max(0, int(save.staminaMax, 0)),
    heroAttack: Math.max(0, int(save.attackTotal ?? save.heroAtk ?? save.heroAttack, 0)),
    heroDefense: Math.max(0, int(save.defenseTotal ?? save.heroDef ?? save.heroDefense, 0)),
    stats: {
      mining: { level: Math.max(1, int(publicStats.mining_level ?? save.miningLevel, 1)), xp: Math.max(0, int(publicStats.mining_xp ?? save.miningXP, 0)) },
      forge: { level: Math.max(1, int(publicStats.forge_level ?? save.blacksmithLevel ?? save.forgeLevel, 1)), xp: Math.max(0, int(publicStats.forge_xp ?? save.blacksmithXP ?? save.forgeXP, 0)) },
      woodcutting: { level: Math.max(1, int(publicStats.woodcutting_level ?? save.woodcuttingLevel ?? save.woodworkingLevel, 1)), xp: Math.max(0, int(publicStats.woodcutting_xp ?? save.woodcuttingXP ?? save.woodworkingXP, 0)) },
      carpentry: { level: Math.max(1, int(publicStats.carpentry_level ?? save.carpentryLevel, 1)), xp: Math.max(0, int(publicStats.carpentry_xp ?? save.carpentryXP, 0)) },
      hunting: { level: Math.max(1, int(publicStats.hunting_level ?? save.huntingLevel, 1)), xp: Math.max(0, int(publicStats.hunting_xp ?? save.huntingXP, 0)) },
      fishing: { level: Math.max(1, int(publicStats.fishing_level ?? save.fishingLevel, 1)), xp: Math.max(0, int(publicStats.fishing_xp ?? save.fishingXP, 0)) },
      cooking: { level: Math.max(1, int(publicStats.cooking_level ?? save.cookingLevel, 1)), xp: Math.max(0, int(publicStats.cooking_xp ?? save.cookingXP, 0)) },
      herbalism: { level: Math.max(1, int(publicStats.herbalism_level ?? save.herbalismLevel, 1)), xp: Math.max(0, int(publicStats.herbalism_xp ?? save.herbalismXP, 0)) },
      alchemy: { level: Math.max(1, int(publicStats.alchemy_level ?? save.alchemyLevel, 1)), xp: Math.max(0, int(publicStats.alchemy_xp ?? save.alchemyXP, 0)) },
      enchanting: { level: Math.max(1, int(publicStats.enchanting_level ?? save.enchantingLevel, 1)), xp: Math.max(0, int(publicStats.enchanting_xp ?? save.enchantingXP, 0)) },
    },
  };
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: "Supabase environment is not configured." }, { status: 500 });
  }

  if (!authHeader.trim()) {
    return json({ error: "Missing bearer token." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "Invalid or expired session." }, { status: 401 });
  }

  let payload: JsonRecord = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const targetUserId = str(payload.targetUserId);
  if (!targetUserId) {
    return json({ error: "Target player is required." }, { status: 400 });
  }

  const [profileRes, publicRes, saveRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, avatar_url, last_seen_at, last_seen_page")
      .eq("id", targetUserId)
      .maybeSingle(),
    admin
      .from("player_public_stats")
      .select("user_id, hero_name, hero_level, hero_xp, total_gold, combat_power, dungeons_completed, mining_level, mining_xp, forge_level, forge_xp, woodcutting_level, woodcutting_xp, carpentry_level, carpentry_xp, hunting_level, hunting_xp, fishing_level, fishing_xp, cooking_level, cooking_xp, herbalism_level, herbalism_xp, alchemy_level, alchemy_xp, enchanting_level, enchanting_xp")
      .eq("user_id", targetUserId)
      .maybeSingle(),
    admin
      .from("player_saves")
      .select("save_data")
      .eq("user_id", targetUserId)
      .maybeSingle(),
  ]);

  if (profileRes.error) return json({ error: profileRes.error.message }, { status: 500 });
  if (publicRes.error) return json({ error: publicRes.error.message }, { status: 500 });
  if (saveRes.error) return json({ error: saveRes.error.message }, { status: 500 });

  const profile = profileRes.data && typeof profileRes.data === "object" ? profileRes.data as JsonRecord : null;
  if (!profile) {
    return json({ error: "Player not found." }, { status: 404 });
  }

  const publicStats = publicRes.data && typeof publicRes.data === "object" ? publicRes.data as JsonRecord : {};
  const save = saveRes.data?.save_data && typeof saveRes.data.save_data === "object"
    ? saveRes.data.save_data as JsonRecord
    : {};

  return json({
    ok: true,
    profile: {
      id: str(profile.id),
      name: str(profile.display_name || publicStats.hero_name, "Hero"),
      avatarUrl: str(profile.avatar_url || save.heroPortrait, "images/hero.png"),
      lastSeenAt: profile.last_seen_at || null,
      lastSeenPage: str(profile.last_seen_page),
    },
    overview: buildOverview(profile, publicStats, save),
    equipment: sanitizeEquipment(save.equipment),
  });
});
