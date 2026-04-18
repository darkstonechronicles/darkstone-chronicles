import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GrantItem = Record<string, unknown> & {
  type?: string;
  slot?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  img?: string;
};

type GrantPayload = {
  clearChat?: "global" | "market";
  set?: {
    gold?: number;
    heroLevel?: number;
    heroXP?: number;
    heroXPNext?: number;
    heroHP?: number;
    heroHPMax?: number;
    stamina?: number;
    staminaMax?: number;
    heroAttack?: number;
    heroDefense?: number;
    heroStatPoints?: number;
  };
  add?: {
    gold?: number;
    heroXP?: number;
    heroStatPoints?: number;
  };
  items?: GrantItem[];
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

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeInt(value: unknown, fallback = 0) {
  return Math.trunc(num(value, fallback));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundLevelXP(value: number) {
  const v = Math.max(1, Math.round(Number(value) || 1));
  if (v >= 10000000) return Math.ceil(v / 50000) * 50000;
  if (v >= 1000000) return Math.ceil(v / 10000) * 10000;
  if (v >= 100000) return Math.ceil(v / 5000) * 5000;
  if (v >= 10000) return Math.ceil(v / 500) * 500;
  if (v >= 1000) return Math.ceil(v / 100) * 100;
  return Math.round(v);
}

function xpNextForLevel(level: number) {
  const L = Math.max(1, Math.floor(Number(level) || 1));
  let xp = 100;
  for (let cur = 2; cur <= L; cur++) {
    const prev = cur - 1;
    let rate = 1.01;
    if (prev <= 3) rate = 2.0;
    else if (prev <= 6) rate = 1.5;
    else if (prev <= 10) rate = 1.3;
    else if (prev <= 20) rate = 1.18;
    else if (prev <= 35) rate = 1.12;
    else if (prev <= 50) rate = 1.10;
    else if (prev <= 70) rate = 1.075;
    else if (prev <= 85) rate = 1.06;
    else if (prev <= 99) rate = 1.05;
    else if (prev <= 105) rate = 1.05 - 0.002 * (prev - 100);
    else if (prev <= 200) {
      const t = (prev - 105) / 95;
      rate = 1.04 - 0.03 * t;
    }
    xp *= rate;
  }
  return roundLevelXP(xp);
}

function calcHpMax(level: number) {
  return 100 + (Math.max(1, safeInt(level, 1)) - 1) * 10;
}

function calcStaminaMax(level: number) {
  return 100 + (Math.max(1, safeInt(level, 1)) - 1) * 5;
}

function getItemStackKey(item: Record<string, unknown>) {
  return [
    item.type || "",
    item.name || "",
    item.baseName || "",
    item.setId || "",
    item.slot || "",
    item.reqLevel ?? 1,
    item.atk ?? 0,
    item.def ?? 0,
    item.rarity || "",
    item.img || "",
    item.upg ?? 0,
  ].join("::");
}

function addItemToInventory(save: Record<string, unknown>, rawItem: GrantItem) {
  if (!rawItem || typeof rawItem !== "object") return;
  if (!Array.isArray(save.inventory)) save.inventory = [];

  const quantity = Math.max(1, safeInt(rawItem.quantity ?? rawItem.qty, 1));
  const item = {
    ...rawItem,
    quantity,
  };

  const inventory = save.inventory as Record<string, unknown>[];
  const isGear = item.type === "gear" || Boolean(item.slot);
  if (isGear) {
    for (let i = 0; i < quantity; i++) inventory.push({ ...item, quantity: 1 });
    return;
  }

  const stackableTypes = new Set(["ore", "material", "consumable", "food", "fish", "meat"]);
  if (stackableTypes.has(String(item.type || ""))) {
    const key = getItemStackKey(item);
    const existing = inventory.find((entry) => entry && getItemStackKey(entry) === key);
    if (existing) {
      existing.quantity = Math.max(1, safeInt(existing.quantity, 1)) + quantity;
    } else {
      inventory.push({ ...item, quantity });
    }
    return;
  }

  for (let i = 0; i < quantity; i++) inventory.push({ ...item, quantity: 1 });
}

function buildPublicStats(save: Record<string, unknown>, email: string) {
  const fallbackName = email.split("@")[0] || "Hero";
  const heroName = String(save.heroName || save.playerName || fallbackName).trim() || fallbackName;
  const heroLevel = Math.max(1, safeInt(save.heroLevel, 1));
  const heroXP = Math.max(0, safeInt(save.heroXP, 0));
  const miningLevel = Math.max(1, safeInt(save.miningLevel, 1));
  const miningXP = Math.max(0, safeInt(save.miningXP, 0));
  const forgeLevel = Math.max(1, safeInt(save.blacksmithLevel ?? save.forgeLevel, 1));
  const forgeXP = Math.max(0, safeInt(save.blacksmithXP ?? save.forgeXP, 0));
  const woodcuttingLevel = Math.max(1, safeInt(save.woodcuttingLevel ?? save.woodworkingLevel, 1));
  const woodcuttingXP = Math.max(0, safeInt(save.woodcuttingXP ?? save.woodworkingXP, 0));
  const carpentryLevel = Math.max(1, safeInt(save.carpentryLevel, 1));
  const carpentryXP = Math.max(0, safeInt(save.carpentryXP, 0));
  const huntingLevel = Math.max(1, safeInt(save.huntingLevel, 1));
  const huntingXP = Math.max(0, safeInt(save.huntingXP, 0));
  const fishingLevel = Math.max(1, safeInt(save.fishingLevel, 1));
  const fishingXP = Math.max(0, safeInt(save.fishingXP, 0));
  const cookingLevel = Math.max(1, safeInt(save.cookingLevel, 1));
  const cookingXP = Math.max(0, safeInt(save.cookingXP, 0));
  const totalStats = save.stats && typeof save.stats === "object"
    ? (((save.stats as Record<string, unknown>).total as Record<string, unknown> | undefined) || {})
    : {};
  const dungeonsCompleted = Math.max(0, safeInt(totalStats.dungeonsCompleted, 0));
  const totalGold = Math.max(0, safeInt(save.gold, 0));
  const combatPower = Math.max(
    0,
    safeInt(save.heroAttack ?? save.heroAtk, 0) + safeInt(save.heroDefense ?? save.heroDef, 0),
  );
  return {
    hero_name: heroName,
    hero_level: heroLevel,
    hero_xp: heroXP,
    mining_level: miningLevel,
    mining_xp: miningXP,
    forge_level: forgeLevel,
    forge_xp: forgeXP,
    woodcutting_level: woodcuttingLevel,
    woodcutting_xp: woodcuttingXP,
    carpentry_level: carpentryLevel,
    carpentry_xp: carpentryXP,
    hunting_level: huntingLevel,
    hunting_xp: huntingXP,
    fishing_level: fishingLevel,
    fishing_xp: fishingXP,
    cooking_level: cookingLevel,
    cooking_xp: cookingXP,
    dungeons_completed: dungeonsCompleted,
    total_gold: totalGold,
    combat_power: combatPower,
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

  const { data: adminRow, error: adminError } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    return json({ error: adminError.message }, { status: 500 });
  }

  if (!adminRow) {
    return json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  let payload: GrantPayload = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const { data: existingSaveRow, error: saveFetchError } = await admin
    .from("player_saves")
    .select("save_data, revision")
    .eq("user_id", user.id)
    .maybeSingle();

  if (saveFetchError) {
    return json({ error: saveFetchError.message }, { status: 500 });
  }

  const save =
    existingSaveRow?.save_data && typeof existingSaveRow.save_data === "object"
      ? { ...(existingSaveRow.save_data as Record<string, unknown>) }
      : {};

  const setOps = payload.set || {};
  const addOps = payload.add || {};
  const clearChat = payload.clearChat;

  if (clearChat === "global" || clearChat === "market") {
    const { error: clearChatError } = await admin
      .from("chat_messages")
      .delete()
      .eq("channel_kind", clearChat);

    if (clearChatError) {
      return json({ error: clearChatError.message }, { status: 500 });
    }
  }

  if (setOps.gold != null) save.gold = Math.max(0, safeInt(setOps.gold, 0));
  if (addOps.gold != null) save.gold = Math.max(0, safeInt(save.gold, 0) + safeInt(addOps.gold, 0));

  if (setOps.heroLevel != null) {
    save.heroLevel = Math.max(1, safeInt(setOps.heroLevel, 1));
    if (setOps.heroXPNext == null) save.heroXPNext = xpNextForLevel(safeInt(save.heroLevel, 1));
    if (setOps.heroHPMax == null) save.heroHPMax = calcHpMax(safeInt(save.heroLevel, 1));
    if (setOps.staminaMax == null) save.staminaMax = calcStaminaMax(safeInt(save.heroLevel, 1));
  }

  if (setOps.heroXP != null) save.heroXP = Math.max(0, safeInt(setOps.heroXP, 0));
  if (addOps.heroXP != null) save.heroXP = Math.max(0, safeInt(save.heroXP, 0) + safeInt(addOps.heroXP, 0));

  if (setOps.heroXPNext != null) save.heroXPNext = Math.max(1, safeInt(setOps.heroXPNext, 100));
  else if (save.heroLevel != null) save.heroXPNext = Math.max(1, safeInt(save.heroXPNext, xpNextForLevel(safeInt(save.heroLevel, 1))));

  if (setOps.heroHPMax != null) save.heroHPMax = Math.max(1, safeInt(setOps.heroHPMax, calcHpMax(safeInt(save.heroLevel, 1))));
  else save.heroHPMax = Math.max(1, safeInt(save.heroHPMax, calcHpMax(safeInt(save.heroLevel, 1))));

  if (setOps.heroHP != null) save.heroHP = clamp(safeInt(setOps.heroHP, safeInt(save.heroHPMax, 100)), 0, safeInt(save.heroHPMax, 100));
  else save.heroHP = clamp(safeInt(save.heroHP, safeInt(save.heroHPMax, 100)), 0, safeInt(save.heroHPMax, 100));

  if (setOps.staminaMax != null) save.staminaMax = Math.max(1, safeInt(setOps.staminaMax, calcStaminaMax(safeInt(save.heroLevel, 1))));
  else save.staminaMax = Math.max(1, safeInt(save.staminaMax, calcStaminaMax(safeInt(save.heroLevel, 1))));

  if (setOps.stamina != null) save.stamina = clamp(safeInt(setOps.stamina, safeInt(save.staminaMax, 100)), 0, safeInt(save.staminaMax, 100));
  else save.stamina = clamp(safeInt(save.stamina, safeInt(save.staminaMax, 100)), 0, safeInt(save.staminaMax, 100));

  if (setOps.heroAttack != null) {
    save.heroAttack = Math.max(0, safeInt(setOps.heroAttack, 0));
    save.heroAtk = save.heroAttack;
  }
  if (setOps.heroDefense != null) {
    save.heroDefense = Math.max(0, safeInt(setOps.heroDefense, 0));
    save.heroDef = save.heroDefense;
  }
  if (setOps.heroStatPoints != null) save.heroStatPoints = Math.max(0, safeInt(setOps.heroStatPoints, 0));
  if (addOps.heroStatPoints != null) save.heroStatPoints = Math.max(0, safeInt(save.heroStatPoints, 0) + safeInt(addOps.heroStatPoints, 0));

  const items = Array.isArray(payload.items) ? payload.items : [];
  for (const item of items) addItemToInventory(save, item);

  const nextRevision = Math.max(1, safeInt(existingSaveRow?.revision, 0) + 1);
  const { error: saveError } = await admin.from("player_saves").upsert({
    user_id: user.id,
    save_data: save,
    revision: nextRevision,
    last_synced_at: new Date().toISOString(),
  });

  if (saveError) {
    return json({ error: saveError.message }, { status: 500 });
  }

  const publicStats = buildPublicStats(save, user.email || "hero@darkstone.local");
  const { error: statsError } = await admin.from("player_public_stats").upsert({
    user_id: user.id,
    ...publicStats,
  });

  if (statsError) {
    return json({ error: statsError.message }, { status: 500 });
  }

  return json({
    ok: true,
    userId: user.id,
    revision: nextRevision,
    save,
    publicStats,
  });
});
