import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

const PARTY_MONSTER_ORDER = [
  "gravefang-hydra",
  "embermaw-colossus",
  "thornveil-broodmother",
  "stormglass-seraph",
  "cryptwarden-revenant",
];

const PARTY_FIGHT_ENCOUNTER_MS = 6000;
const PARTY_FIGHT_MAX_ROUNDS = 15;
const PARTY_FIGHT_STAT_POINTS_PER_LEVEL = 5;
const PARTY_FIGHT_STAMINA_COST = 5;
const PARTY_FIGHT_AUTO_HP_THRESHOLD = 0.40;
const PARTY_FIGHT_AUTO_STAMINA_THRESHOLD = 0.30;
const POTION_ACTIONS = 100;
const PARTY_FIGHT_MONSTERS: Record<string, JsonRecord> = {
  "gravefang-hydra": {
    id: "gravefang-hydra",
    name: "Gravefang Hydra",
    img: "images/mobs/fighting/zone10/void_devourer.png",
    level: 18,
    attack: 58,
    defense: 46,
    hp: 420,
  },
  "embermaw-colossus": {
    id: "embermaw-colossus",
    name: "Embermaw Colossus",
    img: "images/mobs/fighting/zone9/inferno_titan.png",
    level: 22,
    attack: 64,
    defense: 60,
    hp: 520,
  },
  "thornveil-broodmother": {
    id: "thornveil-broodmother",
    name: "Thornveil Broodmother",
    img: "images/mobs/fighting/zone7/heart_of_the_thicket.png",
    level: 16,
    attack: 49,
    defense: 38,
    hp: 360,
  },
  "stormglass-seraph": {
    id: "stormglass-seraph",
    name: "Stormglass Seraph",
    img: "images/mobs/fighting/zone8/ancient_storm_avatar.png",
    level: 20,
    attack: 61,
    defense: 41,
    hp: 450,
  },
  "cryptwarden-revenant": {
    id: "cryptwarden-revenant",
    name: "Cryptwarden Revenant",
    img: "images/mobs/fighting/zone2/lord_of_the_broken_keep.png",
    level: 14,
    attack: 44,
    defense: 52,
    hp: 400,
  },
};

type PartyRow = {
  id: string;
  leader_user_id: string;
  name: string;
  visibility: string;
  state: string;
  activity: string;
  selected_monster_id: string;
  min_level: number;
  max_members: number;
  auto_accept_requests: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
  disbanded_at: string | null;
};

type MemberRow = {
  party_id: string;
  user_id: string;
  role: string;
  ready: boolean;
  joined_at: string;
  updated_at: string;
};

type InviteRow = {
  id: string;
  party_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  metadata: JsonRecord | null;
};

type JoinRequestRow = {
  id: string;
  party_id: string;
  user_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  message: string;
};

type ActivitySessionRow = {
  id: string;
  party_id: string;
  activity: string;
  status: string;
  started_by_user_id: string;
  member_snapshot: unknown;
  result_payload: unknown;
  created_at: string;
  started_at: string;
  ended_at: string | null;
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

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function int(value: unknown, fallback = 0) {
  return Math.trunc(num(value, fallback));
}

function bigintLike(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : fallback;
}

function readCombatStat(saveData: unknown, keys: string[]) {
  const save = saveData && typeof saveData === "object" ? saveData as Record<string, unknown> : {};
  for (const key of keys) {
    if (!(key in save)) continue;
    return bigintLike(save[key], 0);
  }
  return 0;
}

function normalizeVisibility(value: unknown) {
  return str(value, "private").toLowerCase() === "open" ? "open" : "private";
}

function normalizeActivity(value: unknown) {
  const next = str(value, "Idle");
  return next.slice(0, 60) || "Idle";
}

function normalizeMonsterId(value: unknown) {
  return str(value).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function ensurePartyMonsterKills(saveData: unknown) {
  const save = asRecord(saveData);
  const partyHall = asRecord(save.partyHall);
  const monsterKills = asRecord(partyHall.monsterKills);

  save.partyHall = partyHall;
  partyHall.monsterKills = monsterKills;

  for (const monsterId of PARTY_MONSTER_ORDER) {
    if (!Number.isFinite(Number(monsterKills[monsterId]))) monsterKills[monsterId] = 0;
  }

  return {
    save,
    partyHall,
    monsterKills,
  };
}

function getMonsterKillCount(saveData: unknown, monsterId: string) {
  const { monsterKills } = ensurePartyMonsterKills(saveData);
  return Math.max(0, int(monsterKills[monsterId], 0));
}

function isMonsterUnlocked(saveData: unknown, monsterId: string) {
  const index = PARTY_MONSTER_ORDER.indexOf(monsterId);
  if (index <= 0) return true;
  if (index === -1) return false;
  const previousMonsterId = PARTY_MONSTER_ORDER[index - 1];
  return getMonsterKillCount(saveData, previousMonsterId) >= 1000;
}

function buildMonsterProgress(saveData: unknown) {
  return PARTY_MONSTER_ORDER.map((monsterId, index) => {
    const previousMonsterId = index > 0 ? PARTY_MONSTER_ORDER[index - 1] : "";
    const previousKills = previousMonsterId ? getMonsterKillCount(saveData, previousMonsterId) : 1000;
    return {
      monsterId,
      kills: getMonsterKillCount(saveData, monsterId),
      unlocked: isMonsterUnlocked(saveData, monsterId),
      unlockRequirementMonsterId: previousMonsterId,
      unlockRequirementKills: index === 0 ? 0 : 1000,
      unlockProgress: index === 0 ? 1000 : Math.min(1000, previousKills),
    };
  });
}

function roundLevelXP(value: unknown) {
  const next = Math.max(1, Math.round(Number(value) || 1));
  if (next >= 10000000) return Math.ceil(next / 50000) * 50000;
  if (next >= 1000000) return Math.ceil(next / 10000) * 10000;
  if (next >= 100000) return Math.ceil(next / 5000) * 5000;
  if (next >= 10000) return Math.ceil(next / 500) * 500;
  if (next >= 1000) return Math.ceil(next / 100) * 100;
  return Math.round(next);
}

function xpNextForLevel(level: unknown) {
  const heroLevel = Math.max(1, Math.floor(Number(level) || 1));
  let xp = 100;
  for (let current = 2; current <= heroLevel; current += 1) {
    const previous = current - 1;
    let rate = 1.01;
    if (previous <= 3) rate = 2.0;
    else if (previous <= 6) rate = 1.5;
    else if (previous <= 10) rate = 1.3;
    else if (previous <= 20) rate = 1.18;
    else if (previous <= 35) rate = 1.12;
    else if (previous <= 50) rate = 1.10;
    else if (previous <= 70) rate = 1.075;
    else if (previous <= 85) rate = 1.06;
    else if (previous <= 99) rate = 1.05;
    else if (previous <= 105) rate = 1.05 - 0.002 * (previous - 100);
    else if (previous <= 200) {
      const progress = (previous - 105) / 95;
      rate = 1.04 - 0.03 * progress;
    }
    xp *= rate;
  }
  return roundLevelXP(xp);
}

function calcHpMax(level: unknown) {
  return 100 + (Math.max(1, int(level, 1)) - 1) * 10;
}

function calcStaminaMax(level: unknown) {
  return 100 + (Math.max(1, int(level, 1)) - 1) * 5;
}

function clamp(value: unknown, minValue: number, maxValue: number) {
  return Math.min(maxValue, Math.max(minValue, num(value, minValue)));
}

function fightXPForMobLevel(level: unknown) {
  const mobLevel = clamp(level, 1, 99);
  const progress = (mobLevel - 1) / 98;
  return Math.round(10 + 190 * progress);
}

function rollPartyFightGold(level: unknown) {
  const mobLevel = Math.max(1, int(level, 1));
  const minGold = 55 + Math.floor(mobLevel / 4);
  const maxGold = 85 + Math.floor(mobLevel / 2);
  return Math.floor(Math.random() * (maxGold - minGold + 1)) + minGold;
}

function calcDamage(att: unknown, def: unknown) {
  const attack = num(att, 0);
  const defense = num(def, 0);
  if (attack <= defense) {
    return Math.random() < 0.5 ? 0 : 1;
  }
  const variance = 0.9 + Math.random() * 0.2;
  return Math.max(1, Math.floor((attack - defense) * variance));
}

function randomInt(minValue: number, maxValue: number) {
  const min = Math.ceil(Math.min(minValue, maxValue));
  const max = Math.floor(Math.max(minValue, maxValue));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPartyFightMonster(monsterId: string) {
  return PARTY_FIGHT_MONSTERS[monsterId] || null;
}

function normalizePartyFightPayload(value: unknown, monster: JsonRecord | null) {
  const payload = asRecord(value);
  const recentEncounters = Array.isArray(payload.recentEncounters)
    ? payload.recentEncounters.filter((entry) => entry && typeof entry === "object").slice(-6)
    : [];
  return {
    mode: "party_fight",
    encounterMs: Math.max(1000, int(payload.encounterMs, PARTY_FIGHT_ENCOUNTER_MS)),
    resolvedCount: Math.max(0, int(payload.resolvedCount, 0)),
    selectedMonsterId: str(payload.selectedMonsterId, str(monster?.id)),
    monsterName: str(payload.monsterName, str(monster?.name)),
    monsterImg: str(payload.monsterImg, str(monster?.img)),
    monsterAttack: Math.max(0, int(payload.monsterAttack, int(monster?.attack, 0))),
    monsterDefense: Math.max(0, int(payload.monsterDefense, int(monster?.defense, 0))),
    monsterLevel: Math.max(1, int(payload.monsterLevel, int(monster?.level, 1))),
    monsterHp: Math.max(1, int(payload.monsterHp, int(monster?.hp, 1))),
    latestEncounter: payload.latestEncounter && typeof payload.latestEncounter === "object" ? payload.latestEncounter : null,
    recentEncounters,
    lastResolvedAt: str(payload.lastResolvedAt),
  };
}

function applyHeroRewards(saveData: unknown, xpGain: number, goldGain: number) {
  const save = asRecord(saveData);
  let heroLevel = Math.max(1, int(save.heroLevel, 1));
  let heroXP = Math.max(0, int(save.heroXP, 0)) + Math.max(0, int(xpGain, 0));
  let heroXPNext = Math.max(1, int(save.heroXPNext, xpNextForLevel(heroLevel)));
  let heroStatPoints = Math.max(0, int(save.heroStatPoints, 0));

  while (heroXP >= heroXPNext) {
    heroXP -= heroXPNext;
    heroLevel += 1;
    heroStatPoints += PARTY_FIGHT_STAT_POINTS_PER_LEVEL;
    heroXPNext = xpNextForLevel(heroLevel);
  }

  save.heroLevel = heroLevel;
  save.heroXP = heroXP;
  save.heroXPNext = xpNextForLevel(heroLevel);
  save.heroStatPoints = heroStatPoints;
  save.gold = Math.max(0, bigintLike(save.gold, 0) + Math.max(0, int(goldGain, 0)));

  const nextHpMax = calcHpMax(heroLevel);
  save.heroHPMax = nextHpMax;
  const currentHp = Number.isFinite(Number(save.heroHP)) ? Number(save.heroHP) : nextHpMax;
  save.heroHP = clamp(currentHp, 0, nextHpMax);

  return {
    save,
    heroLevel,
    heroXP,
    totalGold: bigintLike(save.gold, 0),
  };
}

function getCurrentStamina(saveData: unknown) {
  const save = asRecord(saveData);
  const staminaMax = Math.max(1, int(save.staminaMax, calcStaminaMax(save.heroLevel)));
  const currentStamina = Number.isFinite(Number(save.stamina)) ? Number(save.stamina) : staminaMax;
  return Math.max(0, Math.min(staminaMax, Math.trunc(currentStamina)));
}

function ensureConsumables(saveData: unknown) {
  const save = asRecord(saveData);
  const consumables = asRecord(save.consumables);
  save.consumables = consumables;
  return consumables;
}

function quickSlotQuantity(item: unknown) {
  const slot = asRecord(item);
  return Math.max(0, int(slot.quantity ?? slot.qty, 0));
}

function consumeQuickSlotItem(saveData: unknown, slotKey: string, quantity: number) {
  const save = asRecord(saveData);
  const consumables = ensureConsumables(save);
  const slot = asRecord(consumables[slotKey]);
  const currentQty = quickSlotQuantity(slot);
  const consumeQty = Math.max(0, Math.min(currentQty, int(quantity, 0)));
  if (!slot || currentQty <= 0 || consumeQty <= 0) return 0;
  if (currentQty > consumeQty) {
    slot.quantity = currentQty - consumeQty;
    consumables[slotKey] = slot;
  } else {
    consumables[slotKey] = null;
  }
  return consumeQty;
}

function getCookedMeatStamina(item: unknown) {
  const slot = asRecord(item);
  const direct = num(slot.healStamina ?? slot.healSt, 0);
  if (direct > 0) return direct;
  const byName: Record<string, number> = {
    "Cooked Shadow Hare Meat": 2,
    "Cooked Rotfeather Turkey Meat": 3,
    "Cooked Gloom Fox Meat": 4,
    "Cooked Bloodtusk Boar Meat": 5,
    "Cooked Night Wolf Meat": 6,
    "Cooked Stonehorn Ram Meat": 7,
    "Cooked Thorn Stag Meat": 8,
    "Cooked Grave Bear Meat": 9,
    "Cooked Dire Warg Meat": 10,
    "Cooked Forest Troll Meat": 11,
  };
  return byName[str(slot.name)] || 0;
}

function autoUseQuickHpFood(saveData: unknown) {
  const save = asRecord(saveData);
  const hpState = getCurrentHeroHpState(save);
  if (hpState.hp >= hpState.hpMax) return { used: 0, healed: 0, hp: hpState.hp };
  if (hpState.hp > 0 && hpState.hp / hpState.hpMax > PARTY_FIGHT_AUTO_HP_THRESHOLD) {
    return { used: 0, healed: 0, hp: hpState.hp };
  }
  const consumables = ensureConsumables(save);
  const slot = asRecord(consumables.quick_cooked_fish);
  const qty = quickSlotQuantity(slot);
  const healHp = Math.max(0, int(slot.healHp, 0));
  if (qty <= 0 || healHp <= 0) return { used: 0, healed: 0, hp: hpState.hp };

  const missingHp = Math.max(0, hpState.hpMax - hpState.hp);
  const needed = Math.max(1, Math.ceil(missingHp / healHp));
  const used = consumeQuickSlotItem(save, "quick_cooked_fish", Math.min(qty, needed));
  const healed = used * healHp;
  save.heroHPMax = hpState.hpMax;
  save.heroHP = clamp(hpState.hp + healed, 0, hpState.hpMax);
  return { used, healed, hp: int(save.heroHP, hpState.hp) };
}

function autoUseQuickStaminaFood(saveData: unknown, options: { force?: boolean } = {}) {
  const save = asRecord(saveData);
  const staminaMax = Math.max(1, int(save.staminaMax, calcStaminaMax(save.heroLevel)));
  const stamina = getCurrentStamina(save);
  const shouldEat = options.force === true || stamina <= PARTY_FIGHT_STAMINA_COST || stamina / staminaMax <= PARTY_FIGHT_AUTO_STAMINA_THRESHOLD;
  if (!shouldEat || stamina >= staminaMax) return { used: 0, restored: 0, stamina };

  const consumables = ensureConsumables(save);
  const slot = asRecord(consumables.quick_meat);
  const qty = quickSlotQuantity(slot);
  const restoreStamina = getCookedMeatStamina(slot);
  if (qty <= 0 || restoreStamina <= 0) return { used: 0, restored: 0, stamina };

  const missingStamina = Math.max(0, staminaMax - stamina);
  const needed = Math.max(1, Math.ceil(missingStamina / restoreStamina));
  const used = consumeQuickSlotItem(save, "quick_meat", Math.min(qty, needed));
  const restored = used * restoreStamina;
  save.staminaMax = staminaMax;
  save.stamina = clamp(stamina + restored, 0, staminaMax);
  return { used, restored, stamina: int(save.stamina, stamina) };
}

function isPotionItem(item: unknown) {
  const slot = asRecord(item);
  if (str(slot.subType).toLowerCase() === "potion") return true;
  return str(slot.name).toLowerCase().includes("potion");
}

function getPotionTier(item: unknown) {
  const slot = asRecord(item);
  const idMatch = str(slot.id).match(/_(\d+)$/);
  if (idMatch) return Math.max(1, Math.min(7, int(idMatch[1], 1)));
  const name = str(slot.name).toUpperCase();
  const romanMap: Record<string, number> = { " VII": 7, " VI": 6, " V": 5, " IV": 4, " III": 3, " II": 2, " I": 1 };
  for (const [roman, tier] of Object.entries(romanMap)) {
    if (name.includes(roman)) return tier;
  }
  return 1;
}

function getPotionBonuses(saveData: unknown) {
  const consumables = asRecord(asRecord(saveData).consumables);
  let atkPct = 0;
  let defPct = 0;
  let luckPct = 0;
  for (const slotKey of ["quick_potion1", "quick_potion2"]) {
    const slot = asRecord(consumables[slotKey]);
    if (!isPotionItem(slot) || quickSlotQuantity(slot) <= 0) continue;
    const id = str(slot.id).toLowerCase();
    const name = str(slot.name).toLowerCase();
    const tier = Math.max(1, Math.min(5, getPotionTier(slot)));
    if (id.includes("strength") || name.includes("strength potion")) atkPct += tier * 0.04;
    if (id.includes("defense") || name.includes("defense potion")) defPct += tier * 0.04;
    if (id.includes("luck") || name.includes("luck potion")) luckPct += tier * 0.03;
  }
  return { atkPct, defPct, luckPct };
}

function tickPotionActions(saveData: unknown, actions = 1) {
  const save = asRecord(saveData);
  const consumables = asRecord(save.consumables);
  if (!save.consumables || typeof save.consumables !== "object") return false;
  let changed = false;
  for (const slotKey of ["quick_potion1", "quick_potion2"]) {
    const slot = asRecord(consumables[slotKey]);
    if (!isPotionItem(slot)) continue;
    const id = str(slot.id).toLowerCase();
    const name = str(slot.name).toLowerCase();
    const supported = id.includes("strength") || name.includes("strength potion")
      || id.includes("defense") || name.includes("defense potion")
      || id.includes("luck") || name.includes("luck potion");
    if (!supported) continue;

    let qty = quickSlotQuantity(slot);
    if (qty <= 0) {
      consumables[slotKey] = null;
      changed = true;
      continue;
    }
    let actionsLeft = int(slot.actionsLeft, POTION_ACTIONS);
    if (actionsLeft <= 0) actionsLeft = POTION_ACTIONS;
    let steps = Math.max(1, int(actions, 1));
    while (steps > 0 && qty > 0) {
      actionsLeft -= 1;
      steps -= 1;
      if (actionsLeft > 0) continue;
      qty -= 1;
      actionsLeft = POTION_ACTIONS;
    }
    if (qty <= 0) {
      consumables[slotKey] = null;
    } else {
      slot.quantity = qty;
      slot.actionsLeft = actionsLeft;
      consumables[slotKey] = slot;
    }
    changed = true;
  }
  return changed;
}

function spendPartyFightStamina(saveData: unknown, staminaCost: number) {
  const save = asRecord(saveData);
  const staminaMax = Math.max(1, int(save.staminaMax, calcStaminaMax(save.heroLevel)));
  const currentStamina = getCurrentStamina(save);
  save.staminaMax = staminaMax;
  save.stamina = Math.max(0, currentStamina - Math.max(0, int(staminaCost, 0)));
  return {
    save,
    stamina: Math.max(0, int(save.stamina, 0)),
  };
}

function getCurrentHeroHpState(saveData: unknown) {
  const save = asRecord(saveData);
  const hpMax = Math.max(1, int(save.heroHPMax, calcHpMax(save.heroLevel)));
  const currentHp = Number.isFinite(Number(save.heroHP)) ? Number(save.heroHP) : hpMax;
  return {
    hpMax,
    hp: Math.max(0, Math.min(hpMax, Math.trunc(currentHp))),
  };
}

async function persistTouchedUserSaves(admin: ReturnType<typeof createClient>, touchedUsers: Map<string, { save: JsonRecord; revision: number }>) {
  if (!touchedUsers.size) return;
  await Promise.all(Array.from(touchedUsers.entries()).map(async ([memberId, entry]) => {
    const nextRevision = Math.max(1, entry.revision);
    const saveUpsert = await admin.from("player_saves").upsert({
      user_id: memberId,
      save_data: entry.save,
      revision: nextRevision,
      last_synced_at: formatIsoNow(),
    });
    if (saveUpsert.error) throw saveUpsert.error;
    await updatePublicStatsFromSave(admin, memberId, entry.save);
  }));
}

async function updatePublicStatsFromSave(admin: ReturnType<typeof createClient>, userId: string, saveData: unknown) {
  const save = asRecord(saveData);
  const payload: JsonRecord = {
    user_id: userId,
    hero_name: str(save.heroName || save.playerName, "Hero"),
    hero_level: Math.max(1, int(save.heroLevel, 1)),
    hero_xp: Math.max(0, bigintLike(save.heroXP, 0)),
    total_gold: Math.max(0, bigintLike(save.gold, 0)),
    updated_at: formatIsoNow(),
  };
  const { error } = await admin.from("player_public_stats").upsert(payload);
  if (error) throw error;
}

function simulatePartyFightEncounter(members: JsonRecord[], monster: JsonRecord, encounterNumber: number) {
  const playerStates = members.map((member) => ({
    userId: str(member.userId),
    heroName: str(member.heroName, "Hero"),
    avatarUrl: str(member.avatarUrl, "images/hero.png"),
    heroLevel: Math.max(1, int(member.heroLevel, 1)),
    heroAttack: Math.max(0, int(member.heroAttack, 0)),
    heroDefense: Math.max(0, int(member.heroDefense, 0)),
    hpMax: Math.max(1, int(member.hpMax, calcHpMax(member.heroLevel))),
    hp: Math.max(0, int(member.hp, int(member.hpMax, calcHpMax(member.heroLevel)))),
    damageDealt: 0,
    damageTaken: 0,
  }));

  let monsterHp = Math.max(1, int(monster.hp, 1));
  let rounds = 0;

  while (monsterHp > 0 && rounds < PARTY_FIGHT_MAX_ROUNDS && playerStates.some((entry) => entry.hp > 0)) {
    rounds += 1;

    const alivePlayers = playerStates.filter((entry) => entry.hp > 0);
    const partyAttack = alivePlayers.reduce((sum, entry) => sum + entry.heroAttack, 0);
    const partyDefense = alivePlayers.reduce((sum, entry) => sum + entry.heroDefense, 0);

    const partyDamage = calcDamage(partyAttack, monster.defense);
    monsterHp = Math.max(0, monsterHp - partyDamage);

    if (alivePlayers.length) {
      const attackTotal = Math.max(1, alivePlayers.reduce((sum, entry) => sum + Math.max(0, entry.heroAttack), 0));
      let distributedDamage = 0;
      const weighted = alivePlayers.map((player) => {
        const exactShare = partyDamage * (Math.max(0, player.heroAttack) / attackTotal);
        const share = Math.floor(exactShare);
        distributedDamage += share;
        return {
          player,
          share,
          remainder: exactShare - share,
        };
      });
      let leftoverDamage = Math.max(0, partyDamage - distributedDamage);
      weighted
        .sort((a, b) => b.remainder - a.remainder)
        .forEach((entry) => {
          if (leftoverDamage <= 0) return;
          entry.share += 1;
          leftoverDamage -= 1;
        });
      weighted.forEach((entry) => {
        entry.player.damageDealt += entry.share;
      });
    }

    if (monsterHp <= 0) break;

    const aliveAfterAttack = playerStates.filter((entry) => entry.hp > 0);
    if (!aliveAfterAttack.length) break;

    const monsterAttack = Math.max(0, int(monster.attack, 0));
    const monsterDamage = monsterAttack <= partyDefense
      ? randomInt(10, 20)
      : calcDamage(monsterAttack, partyDefense);

    if (aliveAfterAttack.length === 1) {
      const soloPlayer = aliveAfterAttack[0];
      soloPlayer.damageTaken += monsterDamage;
      soloPlayer.hp = Math.max(0, soloPlayer.hp - monsterDamage);
      continue;
    }

    const primaryIndex = randomInt(0, aliveAfterAttack.length - 1);
    const primaryTarget = aliveAfterAttack[primaryIndex];
    const secondaryTargets = aliveAfterAttack.filter((_, index) => index !== primaryIndex);
    let primaryShare = Math.floor(monsterDamage * 0.7);
    let remainingDamage = Math.max(0, monsterDamage - primaryShare);

    if (!secondaryTargets.length) {
      primaryShare = monsterDamage;
      remainingDamage = 0;
    }

    primaryTarget.damageTaken += primaryShare;
    primaryTarget.hp = Math.max(0, primaryTarget.hp - primaryShare);

    if (secondaryTargets.length && remainingDamage > 0) {
      const baseShare = Math.floor(remainingDamage / secondaryTargets.length);
      let remainder = remainingDamage % secondaryTargets.length;
      for (const player of secondaryTargets) {
        const share = baseShare + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        player.damageTaken += share;
        player.hp = Math.max(0, player.hp - share);
      }
    }
  }

  const outcome = monsterHp <= 0
    ? "victory"
    : playerStates.some((entry) => entry.hp > 0)
      ? "stalemate"
      : "defeat";
  const xpGain = outcome === "victory" ? fightXPForMobLevel(monster.level) : 0;
  const goldGain = outcome === "victory" ? rollPartyFightGold(monster.level) : 0;
  const resolvedAt = formatIsoNow();

  return {
    encounterNumber,
    resolvedAt,
    outcome,
    rounds,
    monster: {
      id: str(monster.id),
      name: str(monster.name),
      img: str(monster.img),
      attack: Math.max(0, int(monster.attack, 0)),
      defense: Math.max(0, int(monster.defense, 0)),
      hpMax: Math.max(1, int(monster.hp, 1)),
      hpRemaining: Math.max(0, monsterHp),
    },
    rewardSummary: {
      xp: xpGain,
      gold: goldGain,
    },
    players: playerStates.map((player) => ({
      userId: player.userId,
      heroName: player.heroName,
      avatarUrl: player.avatarUrl,
      heroLevel: player.heroLevel,
      damageDealt: player.damageDealt,
      damageTaken: player.damageTaken,
      hpMax: player.hpMax,
      hpRemaining: player.hp,
      xp: xpGain,
      gold: goldGain,
    })),
  };
}

function normalizePartyName(value: unknown, fallback: string) {
  const next = str(value, fallback).slice(0, 40);
  if (next.length < 3) throw new Error("Party name must be at least 3 characters.");
  return next;
}

function formatIsoNow() {
  return new Date().toISOString();
}

async function logPartyEvent(admin: ReturnType<typeof createClient>, partyId: string | null, actorUserId: string | null, eventKind: string, payload: JsonRecord = {}) {
  try {
    await admin.from("party_events").insert({
      party_id: partyId,
      actor_user_id: actorUserId,
      event_kind: eventKind,
      payload,
    });
  } catch (error) {
    console.error("[party-action] event log failed", eventKind, error);
  }
}

async function cleanupExpiredRows(admin: ReturnType<typeof createClient>) {
  const now = formatIsoNow();
  await admin
    .from("party_invites")
    .update({ status: "expired", responded_at: now })
    .eq("status", "pending")
    .lte("expires_at", now);
  await admin
    .from("party_join_requests")
    .update({ status: "expired", responded_at: now })
    .eq("status", "pending")
    .lte("expires_at", now);
}

async function getCurrentPartyId(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("party_members")
    .select("party_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return str(data?.party_id);
}

async function getPartyRow(admin: ReturnType<typeof createClient>, partyId: string) {
  const { data, error } = await admin
    .from("parties")
    .select("id, leader_user_id, name, visibility, state, activity, selected_monster_id, min_level, max_members, auto_accept_requests, locked, created_at, updated_at, disbanded_at")
    .eq("id", partyId)
    .maybeSingle();
  if (error) throw error;
  return (data as PartyRow | null) || null;
}

async function getPartyMembers(admin: ReturnType<typeof createClient>, partyId: string) {
  const { data, error } = await admin
    .from("party_members")
    .select("party_id, user_id, role, ready, joined_at, updated_at")
    .eq("party_id", partyId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as MemberRow[];
}

async function getUserSummaries(admin: ReturnType<typeof createClient>, userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map<string, JsonRecord>();

  const [profilesRes, statsRes, savesRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, avatar_url, last_seen_at, last_seen_page")
      .in("id", ids),
    admin
      .from("player_public_stats")
      .select("user_id, hero_name, hero_level")
      .in("user_id", ids),
    admin
      .from("player_saves")
      .select("user_id, save_data")
      .in("user_id", ids),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (statsRes.error) throw statsRes.error;
  if (savesRes.error) throw savesRes.error;

  const statsMap = new Map<string, JsonRecord>();
  for (const row of (statsRes.data || []) as JsonRecord[]) {
    statsMap.set(str(row.user_id), row);
  }

  const savesMap = new Map<string, JsonRecord>();
  for (const row of (savesRes.data || []) as JsonRecord[]) {
    savesMap.set(str(row.user_id), row);
  }

  const summaryMap = new Map<string, JsonRecord>();
  for (const row of (profilesRes.data || []) as JsonRecord[]) {
    const userId = str(row.id);
    const stats = statsMap.get(userId) || {};
    const save = savesMap.get(userId) || {};
    const saveData = save.save_data;
    summaryMap.set(userId, {
      id: userId,
      heroName: str((stats as JsonRecord).hero_name || row.display_name, "Hero"),
      heroLevel: Math.max(1, int((stats as JsonRecord).hero_level, 1)),
      avatarUrl: str(row.avatar_url, "images/hero.png") || "images/hero.png",
      heroAttack: readCombatStat(saveData, ["attackTotal", "heroAtk", "heroAttack"]),
      heroDefense: readCombatStat(saveData, ["defenseTotal", "heroDef", "heroDefense"]),
      heroHPMax: getCurrentHeroHpState(saveData).hpMax,
      heroHP: getCurrentHeroHpState(saveData).hp,
      staminaMax: Math.max(1, int(asRecord(saveData).staminaMax, calcStaminaMax(asRecord(saveData).heroLevel))),
      stamina: getCurrentStamina(saveData),
      partyMonsterProgress: buildMonsterProgress(saveData),
      lastSeenAt: row.last_seen_at || null,
      lastSeenPage: str(row.last_seen_page),
    });
  }

  for (const id of ids) {
    if (!summaryMap.has(id)) {
      summaryMap.set(id, {
        id,
        heroName: "Hero",
        heroLevel: 1,
        avatarUrl: "images/hero.png",
        heroAttack: 0,
        heroDefense: 0,
        heroHPMax: calcHpMax(1),
        heroHP: calcHpMax(1),
        staminaMax: calcStaminaMax(1),
        stamina: calcStaminaMax(1),
        partyMonsterProgress: buildMonsterProgress({}),
        lastSeenAt: null,
        lastSeenPage: "",
      });
    }
  }

  return summaryMap;
}

async function getPendingInvitesForParty(admin: ReturnType<typeof createClient>, partyId: string) {
  const now = formatIsoNow();
  const { data, error } = await admin
    .from("party_invites")
    .select("id, party_id, from_user_id, to_user_id, status, created_at, expires_at, responded_at, metadata")
    .eq("party_id", partyId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as InviteRow[];
}

async function getPendingJoinRequestsForParty(admin: ReturnType<typeof createClient>, partyId: string) {
  const now = formatIsoNow();
  const { data, error } = await admin
    .from("party_join_requests")
    .select("id, party_id, user_id, status, created_at, expires_at, responded_at, message")
    .eq("party_id", partyId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as JoinRequestRow[];
}

async function getActiveSessionForParty(admin: ReturnType<typeof createClient>, partyId: string) {
  const { data, error } = await admin
    .from("party_activity_sessions")
    .select("id, party_id, activity, status, started_by_user_id, member_snapshot, result_payload, created_at, started_at, ended_at")
    .eq("party_id", partyId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ActivitySessionRow | null) || null;
}

async function getLatestPartyNotice(admin: ReturnType<typeof createClient>, partyId: string) {
  const { data, error } = await admin
    .from("party_events")
    .select("event_kind, payload, created_at")
    .eq("party_id", partyId)
    .in("event_kind", ["party_activity_stopped_stamina", "party_activity_stopped_death"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return "";
  return str((data as JsonRecord).payload && asRecord((data as JsonRecord).payload).message);
}

async function advancePartyFightSession(
  admin: ReturnType<typeof createClient>,
  party: PartyRow,
  activeSession: ActivitySessionRow,
  viewerUserId: string,
) {
  if (party.leader_user_id !== viewerUserId) return activeSession;
  if (!activeSession.activity.toLowerCase().includes("party fight")) return activeSession;

  const monsterId = str(party.selected_monster_id);
  const monster = getPartyFightMonster(monsterId);
  if (!monster) return activeSession;

  const payload = normalizePartyFightPayload(activeSession.result_payload, monster);
  const startedAtMs = Date.parse(activeSession.started_at || "");
  if (!Number.isFinite(startedAtMs)) return activeSession;

  const elapsedTicks = Math.max(0, Math.floor((Date.now() - startedAtMs) / payload.encounterMs));
  const pendingTicks = Math.max(0, Math.min(24, elapsedTicks - payload.resolvedCount));
  if (!pendingTicks && payload.selectedMonsterId === monsterId && payload.monsterName) {
    return {
      ...activeSession,
      result_payload: payload,
    };
  }

  const members = await getPartyMembers(admin, party.id);
  if (!members.length) return activeSession;

  const memberIds = members.map((entry) => entry.user_id);
  const [summaries, saveRowsRes] = await Promise.all([
    getUserSummaries(admin, memberIds),
    admin.from("player_saves").select("user_id, save_data, revision").in("user_id", memberIds),
  ]);
  if (saveRowsRes.error) throw saveRowsRes.error;

  const saveRows = Array.isArray(saveRowsRes.data) ? saveRowsRes.data : [];
  const saveMap = new Map<string, JsonRecord>();
  for (const row of saveRows as JsonRecord[]) {
    saveMap.set(str(row.user_id), row);
  }

  const touchedUsers = new Map<string, { save: JsonRecord; revision: number }>();
  const getTouchedSave = (memberId: string) => {
    const existing = touchedUsers.get(memberId);
    if (existing) return existing;
    const baseRow = saveMap.get(memberId) || {};
    return {
      save: asRecord(baseRow.save_data),
      revision: Math.max(0, int(baseRow.revision, 0)),
    };
  };

  for (const member of members) {
    const saveRow = getTouchedSave(member.user_id);
    const autoStamina = autoUseQuickStaminaFood(saveRow.save);
    if (autoStamina.used > 0) {
      saveRow.revision += 1;
      touchedUsers.set(member.user_id, saveRow);
    }
    const currentStamina = getCurrentStamina(saveRow.save);
    if (currentStamina <= PARTY_FIGHT_STAMINA_COST) {
      await persistTouchedUserSaves(admin, touchedUsers);
      const summary = summaries.get(member.user_id) || {};
      const exhaustedHeroName = str(summary.heroName, "Hero");
      const message = `${exhaustedHeroName} run out of stamina.`;
      const now = formatIsoNow();
      const [sessionUpdate, partyUpdate, readyReset] = await Promise.all([
        admin
          .from("party_activity_sessions")
          .update({
            status: "completed",
            ended_at: now,
            result_payload: {
              ...normalizePartyFightPayload(activeSession.result_payload, monster),
              stopReason: "stamina",
              stopMessage: message,
            },
          })
          .eq("id", activeSession.id),
        admin
          .from("parties")
          .update({
            state: "forming",
            locked: false,
            activity: "Party Fight",
            selected_monster_id: "",
          })
          .eq("id", party.id),
        admin.from("party_members").update({ ready: false }).eq("party_id", party.id),
      ]);
      if (sessionUpdate.error) throw sessionUpdate.error;
      if (partyUpdate.error) throw partyUpdate.error;
      if (readyReset.error) throw readyReset.error;
      await logPartyEvent(admin, party.id, member.user_id, "party_activity_stopped_stamina", {
        userId: member.user_id,
        heroName: exhaustedHeroName,
        message,
      });
      return null;
    }
  }

  let nextPayload = normalizePartyFightPayload(activeSession.result_payload, monster);
  let currentResolvedCount = nextPayload.resolvedCount;

  for (let index = 0; index < pendingTicks; index += 1) {
    const encounterMembers = members.map((entry) => {
      const summary = summaries.get(entry.user_id) || {};
      const saveRow = getTouchedSave(entry.user_id);
      const heroHpState = getCurrentHeroHpState(saveRow.save);
      const potionBonuses = getPotionBonuses(saveRow.save);
      const baseAttack = readCombatStat(saveRow.save, ["attackTotal", "heroAtk", "heroAttack"]) || int(summary.heroAttack, 0);
      const baseDefense = readCombatStat(saveRow.save, ["defenseTotal", "heroDef", "heroDefense"]) || int(summary.heroDefense, 0);
      return {
        userId: entry.user_id,
        heroName: str(summary.heroName, "Hero"),
        avatarUrl: str(summary.avatarUrl, "images/hero.png"),
        heroLevel: Math.max(1, int(summary.heroLevel, 1)),
        heroAttack: Math.max(0, Math.floor(baseAttack * (1 + Math.max(0, potionBonuses.atkPct)))),
        heroDefense: Math.max(0, Math.floor(baseDefense * (1 + Math.max(0, potionBonuses.defPct)))),
        hpMax: heroHpState.hpMax,
        hp: heroHpState.hp,
      };
    });
    const encounter = simulatePartyFightEncounter(encounterMembers, monster, currentResolvedCount + 1);

    for (const player of encounter.players) {
      const row = getTouchedSave(player.userId);
      row.save.heroHPMax = Math.max(1, int(player.hpMax, calcHpMax(row.save.heroLevel)));
      row.save.heroHP = Math.max(0, int(player.hpRemaining, row.save.heroHPMax));
      const autoHp = autoUseQuickHpFood(row.save);
      if (autoHp.used > 0) {
        player.hpRemaining = autoHp.hp;
        (player as JsonRecord).autoFoodUsed = {
          hpFood: autoHp.used,
          healed: autoHp.healed,
        };
      }
      if (tickPotionActions(row.save, 1) || autoHp.used > 0) {
        row.revision += 1;
      }
      touchedUsers.set(player.userId, row);
    }

    const deadDuringLoop = encounter.players.find((player) => Math.max(0, int(player.hpRemaining, 0)) <= 0);
    if (deadDuringLoop) {
      const deathPayload = {
        ...nextPayload,
        resolvedCount: currentResolvedCount + 1,
        latestEncounter: encounter,
        recentEncounters: [...nextPayload.recentEncounters, encounter].slice(-6),
        lastResolvedAt: encounter.resolvedAt,
      };
      await persistTouchedUserSaves(admin, touchedUsers);

      const deadHeroName = str(deadDuringLoop.heroName, "Hero");
      const message = `${deadHeroName} died.`;
      const now = formatIsoNow();
      const [sessionUpdate, partyUpdate, readyReset] = await Promise.all([
        admin
          .from("party_activity_sessions")
          .update({
            status: "failed",
            ended_at: now,
            result_payload: {
              ...deathPayload,
              stopReason: "death",
              stopMessage: message,
            },
          })
          .eq("id", activeSession.id),
        admin
          .from("parties")
          .update({
            state: "forming",
            locked: false,
            activity: "Party Fight",
            selected_monster_id: "",
          })
          .eq("id", party.id),
        admin.from("party_members").update({ ready: false }).eq("party_id", party.id),
      ]);
      if (sessionUpdate.error) throw sessionUpdate.error;
      if (partyUpdate.error) throw partyUpdate.error;
      if (readyReset.error) throw readyReset.error;
      await logPartyEvent(admin, party.id, deadDuringLoop.userId, "party_activity_stopped_death", {
        userId: deadDuringLoop.userId,
        heroName: deadHeroName,
        message,
      });
      return null;
    }

    if (encounter.outcome === "victory") {
      for (const player of encounter.players) {
        const row = getTouchedSave(player.userId);
        const rewardResult = applyHeroRewards(row.save, int(player.xp, 0), int(player.gold, 0));
        const staminaResult = spendPartyFightStamina(rewardResult.save, PARTY_FIGHT_STAMINA_COST);
        const autoStamina = autoUseQuickStaminaFood(staminaResult.save);
        if (isMonsterUnlocked(rewardResult.save, monsterId)) {
          const monsterData = ensurePartyMonsterKills(staminaResult.save);
          monsterData.monsterKills[monsterId] = getMonsterKillCount(monsterData.save, monsterId) + 1;
          row.save = monsterData.save;
        } else {
          row.save = staminaResult.save;
        }
        if (autoStamina.used > 0) {
          const playerResult = encounter.players.find((entry) => entry.userId === player.userId);
          if (playerResult) {
            (playerResult as JsonRecord).autoStaminaFoodUsed = {
              staminaFood: autoStamina.used,
              restored: autoStamina.restored,
            };
          }
        }
        row.revision += 1;
        touchedUsers.set(player.userId, row);
      }
    }

    currentResolvedCount += 1;
    const recentEncounters = [...nextPayload.recentEncounters, encounter].slice(-6);
    nextPayload = {
      ...nextPayload,
      resolvedCount: currentResolvedCount,
      latestEncounter: encounter,
      recentEncounters,
      lastResolvedAt: encounter.resolvedAt,
      selectedMonsterId: monsterId,
      monsterName: str(monster.name),
      monsterImg: str(monster.img),
      monsterAttack: Math.max(0, int(monster.attack, 0)),
      monsterDefense: Math.max(0, int(monster.defense, 0)),
      monsterLevel: Math.max(1, int(monster.level, 1)),
      monsterHp: Math.max(1, int(monster.hp, 1)),
    };

    const exhaustedDuringLoop = Array.from(touchedUsers.entries()).find(([, entry]) => getCurrentStamina(entry.save) <= PARTY_FIGHT_STAMINA_COST);
    if (exhaustedDuringLoop) {
      const exhaustedSummary = summaries.get(exhaustedDuringLoop[0]) || {};
      const exhaustedHeroName = str(exhaustedSummary.heroName, "Hero");
      const message = `${exhaustedHeroName} run out of stamina.`;
      const now = formatIsoNow();
      const [sessionUpdate, partyUpdate, readyReset] = await Promise.all([
        admin
          .from("party_activity_sessions")
          .update({
            status: "completed",
            ended_at: now,
            result_payload: {
              ...nextPayload,
              stopReason: "stamina",
              stopMessage: message,
            },
          })
          .eq("id", activeSession.id),
        admin
          .from("parties")
          .update({
            state: "forming",
            locked: false,
            activity: "Party Fight",
            selected_monster_id: "",
          })
          .eq("id", party.id),
        admin.from("party_members").update({ ready: false }).eq("party_id", party.id),
      ]);
      if (sessionUpdate.error) throw sessionUpdate.error;
      if (partyUpdate.error) throw partyUpdate.error;
      if (readyReset.error) throw readyReset.error;
      await logPartyEvent(admin, party.id, exhaustedDuringLoop[0], "party_activity_stopped_stamina", {
        userId: exhaustedDuringLoop[0],
        heroName: exhaustedHeroName,
        message,
      });
      return null;
    }
  }

  await persistTouchedUserSaves(admin, touchedUsers);

  const exhaustedEntry = Array.from(touchedUsers.entries()).find(([, entry]) => getCurrentStamina(entry.save) <= PARTY_FIGHT_STAMINA_COST);
  if (exhaustedEntry) {
    const exhaustedSummary = summaries.get(exhaustedEntry[0]) || {};
    const exhaustedHeroName = str(exhaustedSummary.heroName, "Hero");
    const message = `${exhaustedHeroName} run out of stamina.`;
    const now = formatIsoNow();
    const [sessionUpdate, partyUpdate, readyReset] = await Promise.all([
      admin
        .from("party_activity_sessions")
        .update({
          status: "completed",
          ended_at: now,
          result_payload: {
            ...nextPayload,
            stopReason: "stamina",
            stopMessage: message,
          },
        })
        .eq("id", activeSession.id),
      admin
        .from("parties")
        .update({
          state: "forming",
          locked: false,
          activity: "Party Fight",
          selected_monster_id: "",
        })
        .eq("id", party.id),
      admin.from("party_members").update({ ready: false }).eq("party_id", party.id),
    ]);
    if (sessionUpdate.error) throw sessionUpdate.error;
    if (partyUpdate.error) throw partyUpdate.error;
    if (readyReset.error) throw readyReset.error;
    await logPartyEvent(admin, party.id, exhaustedEntry[0], "party_activity_stopped_stamina", {
      userId: exhaustedEntry[0],
      heroName: exhaustedHeroName,
      message,
    });
    return null;
  }

  const sessionUpdate = await admin
    .from("party_activity_sessions")
    .update({
      result_payload: nextPayload,
    })
    .eq("id", activeSession.id);
  if (sessionUpdate.error) throw sessionUpdate.error;

  return {
    ...activeSession,
    result_payload: nextPayload,
  };
}

async function buildPartySnapshot(admin: ReturnType<typeof createClient>, partyId: string, viewerUserId: string) {
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) return null;

  const members = await getPartyMembers(admin, party.id);
  const memberIds = members.map((entry) => entry.user_id);
  const summaries = await getUserSummaries(admin, [party.leader_user_id, ...memberIds]);
  const leaderSummary = summaries.get(party.leader_user_id) || {};
  const memberList = members.map((entry) => {
    const summary = summaries.get(entry.user_id) || {};
    return {
      userId: entry.user_id,
      heroName: str(summary.heroName, "Hero"),
      heroLevel: Math.max(1, int(summary.heroLevel, 1)),
      avatarUrl: str(summary.avatarUrl, "images/hero.png"),
      heroAttack: Math.max(0, int(summary.heroAttack, 0)),
      heroDefense: Math.max(0, int(summary.heroDefense, 0)),
      heroHPMax: Math.max(1, int(summary.heroHPMax, calcHpMax(summary.heroLevel))),
      heroHP: Math.max(0, int(summary.heroHP, int(summary.heroHPMax, calcHpMax(summary.heroLevel)))),
      staminaMax: Math.max(1, int(summary.staminaMax, calcStaminaMax(summary.heroLevel))),
      stamina: Math.max(0, int(summary.stamina, int(summary.staminaMax, calcStaminaMax(summary.heroLevel)))),
      role: entry.role === "leader" ? "leader" : "member",
      ready: !!entry.ready,
      joinedAt: entry.joined_at,
      isLeader: entry.role === "leader",
      isSelf: entry.user_id === viewerUserId,
    };
  });
  const memberCount = memberList.length;
  const role = memberList.find((entry) => entry.userId === viewerUserId)?.role || "none";
  const nonLeaderMembers = memberList.filter((entry) => !entry.isLeader);
  const canStartActivity = party.state === "forming" && memberCount >= 2 && memberCount <= party.max_members && nonLeaderMembers.every((entry) => entry.ready);

  const snapshot: JsonRecord = {
    id: party.id,
    name: party.name,
    visibility: party.visibility,
    state: party.state,
    activity: party.activity,
    selectedMonsterId: str(party.selected_monster_id),
    minLevel: party.min_level,
    maxMembers: party.max_members,
    autoAcceptRequests: !!party.auto_accept_requests,
    locked: !!party.locked,
    createdAt: party.created_at,
    updatedAt: party.updated_at,
    leaderUserId: party.leader_user_id,
    leaderName: str(leaderSummary.heroName, "Hero"),
    role,
    memberCount,
    canStartActivity,
    members: memberList,
    pendingInvites: [],
    pendingJoinRequests: [],
    activeSession: null,
    noticeMessage: "",
  };

  let activeSession = await getActiveSessionForParty(admin, party.id);
  if (activeSession && activeSession.activity.toLowerCase().includes("party fight")) {
    activeSession = await advancePartyFightSession(admin, party, activeSession, viewerUserId);
  }
  if (activeSession) {
    const relatedSummaries = await getUserSummaries(admin, [activeSession.started_by_user_id]);
    const startedBy = relatedSummaries.get(activeSession.started_by_user_id) || {};
    snapshot.activeSession = {
      id: activeSession.id,
      activity: activeSession.activity,
      status: activeSession.status,
      startedByUserId: activeSession.started_by_user_id,
      startedByHeroName: str(startedBy.heroName, "Hero"),
      startedAt: activeSession.started_at,
      endedAt: activeSession.ended_at,
      memberSnapshot: Array.isArray(activeSession.member_snapshot) ? activeSession.member_snapshot : [],
      resultPayload: activeSession.result_payload && typeof activeSession.result_payload === "object" ? activeSession.result_payload : {},
    };
  }

  if (role === "leader") {
    const [pendingInvites, pendingJoinRequests] = await Promise.all([
      getPendingInvitesForParty(admin, party.id),
      getPendingJoinRequestsForParty(admin, party.id),
    ]);
    const relatedSummaries = await getUserSummaries(admin, [
      ...pendingInvites.map((entry) => entry.to_user_id),
      ...pendingJoinRequests.map((entry) => entry.user_id),
    ]);
    snapshot.pendingInvites = pendingInvites.map((entry) => {
      const summary = relatedSummaries.get(entry.to_user_id) || {};
      return {
        id: entry.id,
        userId: entry.to_user_id,
        heroName: str(summary.heroName, "Hero"),
        heroLevel: Math.max(1, int(summary.heroLevel, 1)),
        avatarUrl: str(summary.avatarUrl, "images/hero.png"),
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
      };
    });
    snapshot.pendingJoinRequests = pendingJoinRequests.map((entry) => {
      const summary = relatedSummaries.get(entry.user_id) || {};
      return {
        id: entry.id,
        userId: entry.user_id,
        heroName: str(summary.heroName, "Hero"),
        heroLevel: Math.max(1, int(summary.heroLevel, 1)),
        avatarUrl: str(summary.avatarUrl, "images/hero.png"),
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
        message: str(entry.message),
      };
    });
  }

  snapshot.noticeMessage = await getLatestPartyNotice(admin, party.id);

  return snapshot;
}

async function getBootstrapState(admin: ReturnType<typeof createClient>, userId: string) {
  await cleanupExpiredRows(admin);

  const profileMap = await getUserSummaries(admin, [userId]);
  const profile = profileMap.get(userId) || {
    id: userId,
    heroName: "Hero",
    heroLevel: 1,
    avatarUrl: "images/hero.png",
    lastSeenAt: null,
    lastSeenPage: "",
  };

  const myPartyId = await getCurrentPartyId(admin, userId);
  const myParty = myPartyId ? await buildPartySnapshot(admin, myPartyId, userId) : null;

  const now = formatIsoNow();
  const [invitesRes, myRequestsRes, openPartiesRes] = await Promise.all([
    admin
      .from("party_invites")
      .select("id, party_id, from_user_id, to_user_id, status, created_at, expires_at, responded_at, metadata")
      .eq("to_user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
    admin
      .from("party_join_requests")
      .select("id, party_id, user_id, status, created_at, expires_at, responded_at, message")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
    admin
      .from("parties")
      .select("id, leader_user_id, name, visibility, state, activity, selected_monster_id, min_level, max_members, auto_accept_requests, locked, created_at, updated_at, disbanded_at")
      .eq("visibility", "open")
      .eq("state", "forming")
      .is("disbanded_at", null)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  if (invitesRes.error) throw invitesRes.error;
  if (myRequestsRes.error) throw myRequestsRes.error;
  if (openPartiesRes.error) throw openPartiesRes.error;

  const invites = (Array.isArray(invitesRes.data) ? invitesRes.data : []) as InviteRow[];
  const myJoinRequests = (Array.isArray(myRequestsRes.data) ? myRequestsRes.data : []) as JoinRequestRow[];
  const openParties = (Array.isArray(openPartiesRes.data) ? openPartiesRes.data : []) as PartyRow[];

  const relatedPartyIds = Array.from(new Set([
    ...invites.map((entry) => entry.party_id),
    ...myJoinRequests.map((entry) => entry.party_id),
    ...openParties.map((entry) => entry.id),
  ]));
  const relatedMembersRes = relatedPartyIds.length
    ? await admin
        .from("party_members")
        .select("party_id, user_id, role, ready, joined_at, updated_at")
        .in("party_id", relatedPartyIds)
        .order("joined_at", { ascending: true })
    : { data: [], error: null };
  if (relatedMembersRes.error) throw relatedMembersRes.error;
  const relatedMembers = (Array.isArray(relatedMembersRes.data) ? relatedMembersRes.data : []) as MemberRow[];

  const summaryIds = Array.from(new Set([
    ...openParties.map((entry) => entry.leader_user_id),
    ...invites.map((entry) => entry.from_user_id),
    ...relatedMembers.map((entry) => entry.user_id),
  ]));
  const summaries = await getUserSummaries(admin, summaryIds);
  const partyById = new Map<string, PartyRow>(openParties.map((entry) => [entry.id, entry]));
  for (const partyId of relatedPartyIds) {
    if (partyById.has(partyId)) continue;
    const row = await getPartyRow(admin, partyId);
    if (row && !row.disbanded_at) partyById.set(partyId, row);
  }
  const membersByParty = new Map<string, MemberRow[]>();
  for (const entry of relatedMembers) {
    const list = membersByParty.get(entry.party_id) || [];
    list.push(entry);
    membersByParty.set(entry.party_id, list);
  }

  const inviteCards = invites
    .map((entry) => {
      const party = partyById.get(entry.party_id);
      if (!party || party.disbanded_at) return null;
      const from = summaries.get(entry.from_user_id) || {};
      const partyMembers = membersByParty.get(entry.party_id) || [];
      return {
        id: entry.id,
        partyId: entry.party_id,
        fromUserId: entry.from_user_id,
        fromHeroName: str(from.heroName, "Hero"),
        partyName: party.name,
        activity: party.activity,
        memberCount: partyMembers.length,
        maxMembers: party.max_members,
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
      };
    })
    .filter(Boolean);

  const requestCards = myJoinRequests
    .map((entry) => {
      const party = partyById.get(entry.party_id);
      if (!party || party.disbanded_at) return null;
      const leader = summaries.get(party.leader_user_id) || {};
      const partyMembers = membersByParty.get(entry.party_id) || [];
      return {
        id: entry.id,
        partyId: entry.party_id,
        partyName: party.name,
        leaderName: str(leader.heroName, "Hero"),
        activity: party.activity,
        memberCount: partyMembers.length,
        maxMembers: party.max_members,
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
      };
    })
    .filter(Boolean);

  const openCards = openParties
    .map((entry) => {
      const partyMembers = membersByParty.get(entry.id) || [];
      if (partyMembers.length >= entry.max_members) return null;
      const leader = summaries.get(entry.leader_user_id) || {};
      return {
        id: entry.id,
        name: entry.name,
        activity: entry.activity,
        visibility: entry.visibility,
        minLevel: entry.min_level,
        maxMembers: entry.max_members,
        memberCount: partyMembers.length,
        autoAcceptRequests: !!entry.auto_accept_requests,
        leaderUserId: entry.leader_user_id,
        leaderName: str(leader.heroName, "Hero"),
        members: partyMembers.map((member) => {
          const summary = summaries.get(member.user_id) || {};
          return {
            userId: member.user_id,
            heroName: str(summary.heroName, "Hero"),
            heroLevel: Math.max(1, int(summary.heroLevel, 1)),
            avatarUrl: str(summary.avatarUrl, "images/hero.png"),
            heroAttack: Math.max(0, int(summary.heroAttack, 0)),
            heroDefense: Math.max(0, int(summary.heroDefense, 0)),
            role: member.role === "leader" ? "leader" : "member",
            ready: !!member.ready,
          };
        }),
      };
    })
    .filter(Boolean);

  return {
    ok: true,
    profile,
    myParty,
    partyMonsterProgress: Array.isArray((profile as JsonRecord).partyMonsterProgress) ? (profile as JsonRecord).partyMonsterProgress : buildMonsterProgress({}),
    invites: inviteCards,
    myJoinRequests: requestCards,
    openParties: openCards,
  };
}

async function resolveHeroTarget(admin: ReturnType<typeof createClient>, heroName: string) {
  const normalized = str(heroName).toLowerCase();
  if (!normalized) throw new Error("Hero name is required.");
  const { data, error } = await admin
    .from("hero_names")
    .select("user_id, hero_name")
    .eq("normalized_name", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data?.user_id) throw new Error(`Hero '${heroName}' not found.`);
  return {
    userId: str(data.user_id),
    heroName: str(data.hero_name, heroName),
  };
}

async function getUserHeroLevel(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("player_public_stats")
    .select("hero_level")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Math.max(1, int(data?.hero_level, 1));
}

async function createParty(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  if (await getCurrentPartyId(admin, userId)) {
    throw new Error("You are already in a party.");
  }

  const summary = (await getUserSummaries(admin, [userId])).get(userId) || {};
  const name = normalizePartyName(payload.name, `${str(summary.heroName, "Hero")}'s Party`);
  const visibility = normalizeVisibility(payload.visibility);
  const activity = normalizeActivity(payload.activity);
  const heroLevel = Math.max(1, int(summary.heroLevel, 1));
  const minLevel = Math.max(1, int(payload.minLevel, heroLevel));
  const maxMembers = Math.min(4, Math.max(2, int(payload.maxMembers, 4)));
  const autoAcceptRequests = payload.autoAcceptRequests === true;

  const { data, error } = await admin
    .from("parties")
    .insert({
      leader_user_id: userId,
        name,
        visibility,
        state: "forming",
        activity,
        selected_monster_id: "",
        min_level: minLevel,
      max_members: maxMembers,
      auto_accept_requests: autoAcceptRequests,
      locked: false,
    })
    .select("id")
    .single();
  if (error) throw error;

  const partyId = str(data.id);
  const memberInsert = await admin.from("party_members").insert({
    party_id: partyId,
    user_id: userId,
    role: "leader",
    ready: false,
  });
  if (memberInsert.error) throw memberInsert.error;

  await logPartyEvent(admin, partyId, userId, "party_created", {
    visibility,
    activity,
    minLevel,
    maxMembers,
  });
}

async function updateParty(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (party.state !== "forming" || party.locked) throw new Error("Party cannot be edited right now.");

  const currentMembers = await getPartyMembers(admin, partyId);
  const nextMaxMembers = payload.maxMembers != null ? Math.min(4, Math.max(2, int(payload.maxMembers, party.max_members))) : party.max_members;
  if (nextMaxMembers < currentMembers.length) {
    throw new Error("Party size cannot be lower than the current member count.");
  }

  const nextValues = {
    name: payload.name != null ? normalizePartyName(payload.name, party.name) : party.name,
    visibility: payload.visibility != null ? normalizeVisibility(payload.visibility) : party.visibility,
    activity: payload.activity != null ? normalizeActivity(payload.activity) : party.activity,
    selected_monster_id: payload.selectedMonsterId != null ? normalizeMonsterId(payload.selectedMonsterId) : party.selected_monster_id,
    min_level: payload.minLevel != null ? Math.max(1, int(payload.minLevel, party.min_level)) : party.min_level,
    max_members: nextMaxMembers,
    auto_accept_requests: payload.autoAcceptRequests != null ? payload.autoAcceptRequests === true : party.auto_accept_requests,
  };

  const { error } = await admin
    .from("parties")
    .update(nextValues)
    .eq("id", partyId);
  if (error) throw error;

  await logPartyEvent(admin, partyId, userId, "party_updated", {
    visibility: nextValues.visibility,
    activity: nextValues.activity,
    selectedMonsterId: nextValues.selected_monster_id,
    minLevel: nextValues.min_level,
    maxMembers: nextValues.max_members,
    autoAcceptRequests: nextValues.auto_accept_requests,
  });
}

async function invitePlayer(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Only the leader can send invites.");
  if (party.state !== "forming" || party.locked) throw new Error("Party is locked right now.");

  const target = await resolveHeroTarget(admin, str(payload.targetHeroName));
  if (target.userId === userId) throw new Error("You cannot invite yourself.");
  if (await getCurrentPartyId(admin, target.userId)) throw new Error(`${target.heroName} is already in a party.`);

  const members = await getPartyMembers(admin, partyId);
  if (members.length >= party.max_members) throw new Error("Party is already full.");

  const existingInvite = await admin
    .from("party_invites")
    .select("id")
    .eq("party_id", partyId)
    .eq("to_user_id", target.userId)
    .eq("status", "pending")
    .gt("expires_at", formatIsoNow())
    .maybeSingle();
  if (existingInvite.error) throw existingInvite.error;
  if (existingInvite.data?.id) throw new Error(`${target.heroName} already has a pending invite.`);

  const insertRes = await admin.from("party_invites").insert({
    party_id: partyId,
    from_user_id: userId,
    to_user_id: target.userId,
    status: "pending",
  });
  if (insertRes.error) throw insertRes.error;

  await logPartyEvent(admin, partyId, userId, "party_invited_player", {
    targetUserId: target.userId,
    targetHeroName: target.heroName,
  });
}

async function chooseMonster(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (party.state !== "forming" || party.locked) throw new Error("Monster selection is locked right now.");

  const selectedMonsterId = normalizeMonsterId(payload.selectedMonsterId);
  if (!PARTY_MONSTER_ORDER.includes(selectedMonsterId)) throw new Error("Invalid monster.");
  const { data: leaderSaveRow, error: leaderSaveError } = await admin
    .from("player_saves")
    .select("save_data")
    .eq("user_id", userId)
    .maybeSingle();
  if (leaderSaveError) throw leaderSaveError;
  if (!isMonsterUnlocked(leaderSaveRow?.save_data, selectedMonsterId)) throw new Error("This monster is still locked for you.");
  const { error } = await admin
    .from("parties")
    .update({ selected_monster_id: selectedMonsterId })
    .eq("id", partyId);
  if (error) throw error;

  await logPartyEvent(admin, partyId, userId, "party_monster_selected", {
    selectedMonsterId,
  });
}

async function respondInvite(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const inviteId = str(payload.inviteId);
  const response = str(payload.response).toLowerCase();
  if (!inviteId) throw new Error("Invite id is required.");
  if (response !== "accept" && response !== "decline") throw new Error("Invalid invite response.");

  const { data, error } = await admin
    .from("party_invites")
    .select("id, party_id, from_user_id, to_user_id, status, created_at, expires_at, responded_at, metadata")
    .eq("id", inviteId)
    .maybeSingle();
  if (error) throw error;
  const invite = data as InviteRow | null;
  if (!invite || invite.to_user_id !== userId) throw new Error("Invite not found.");
  if (invite.status !== "pending") throw new Error("Invite is no longer pending.");
  if (new Date(invite.expires_at).getTime() <= Date.now()) throw new Error("Invite has expired.");

  const now = formatIsoNow();
  if (response === "decline") {
    const updateRes = await admin
      .from("party_invites")
      .update({ status: "declined", responded_at: now })
      .eq("id", invite.id)
      .eq("status", "pending");
    if (updateRes.error) throw updateRes.error;
    await logPartyEvent(admin, invite.party_id, userId, "party_invite_declined", { inviteId: invite.id });
    return;
  }

  if (await getCurrentPartyId(admin, userId)) throw new Error("You are already in a party.");
  const party = await getPartyRow(admin, invite.party_id);
  if (!party || party.disbanded_at) throw new Error("Party no longer exists.");
  if (party.state !== "forming" || party.locked) throw new Error("Party is not accepting new members.");
  const members = await getPartyMembers(admin, invite.party_id);
  if (members.length >= party.max_members) throw new Error("Party is already full.");

  const memberInsert = await admin.from("party_members").insert({
    party_id: invite.party_id,
    user_id: userId,
    role: "member",
    ready: false,
  });
  if (memberInsert.error) throw memberInsert.error;

  const inviteUpdate = await admin
    .from("party_invites")
    .update({ status: "accepted", responded_at: now })
    .eq("id", invite.id)
    .eq("status", "pending");
  if (inviteUpdate.error) throw inviteUpdate.error;

  await admin
    .from("party_join_requests")
    .update({ status: "cancelled", responded_at: now })
    .eq("party_id", invite.party_id)
    .eq("user_id", userId)
    .eq("status", "pending");

  await logPartyEvent(admin, invite.party_id, userId, "party_invite_accepted", { inviteId: invite.id });
}

async function requestJoin(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId);
  if (!partyId) throw new Error("Party id is required.");
  if (await getCurrentPartyId(admin, userId)) throw new Error("You are already in a party.");

  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.visibility !== "open") throw new Error("This party is private.");
  if (party.state !== "forming" || party.locked) throw new Error("Party is not accepting new members.");

  const myLevel = await getUserHeroLevel(admin, userId);
  if (myLevel < party.min_level) throw new Error(`This party requires hero level ${party.min_level}+.`);

  const members = await getPartyMembers(admin, partyId);
  if (members.length >= party.max_members) throw new Error("Party is already full.");

  if (party.auto_accept_requests) {
    const memberInsert = await admin.from("party_members").insert({
      party_id: partyId,
      user_id: userId,
      role: "member",
      ready: false,
    });
    if (memberInsert.error) throw memberInsert.error;

    const requestInsert = await admin.from("party_join_requests").insert({
      party_id: partyId,
      user_id: userId,
      status: "approved",
      responded_at: formatIsoNow(),
      message: str(payload.message).slice(0, 240),
    });
    if (requestInsert.error) throw requestInsert.error;

    await logPartyEvent(admin, partyId, userId, "party_join_auto_approved", {});
    return;
  }

  const existingRequest = await admin
    .from("party_join_requests")
    .select("id")
    .eq("party_id", partyId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .gt("expires_at", formatIsoNow())
    .maybeSingle();
  if (existingRequest.error) throw existingRequest.error;
  if (existingRequest.data?.id) throw new Error("You already have a pending join request for this party.");

  const requestInsert = await admin.from("party_join_requests").insert({
    party_id: partyId,
    user_id: userId,
    status: "pending",
    message: str(payload.message).slice(0, 240),
  });
  if (requestInsert.error) throw requestInsert.error;

  await logPartyEvent(admin, partyId, userId, "party_join_requested", {});
}

async function respondJoinRequest(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const requestId = str(payload.requestId);
  const response = str(payload.response).toLowerCase();
  if (!requestId) throw new Error("Join request id is required.");
  if (response !== "approve" && response !== "reject") throw new Error("Invalid join request response.");

  const { data, error } = await admin
    .from("party_join_requests")
    .select("id, party_id, user_id, status, created_at, expires_at, responded_at, message")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  const request = data as JoinRequestRow | null;
  if (!request) throw new Error("Join request not found.");
  const party = await getPartyRow(admin, request.party_id);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (request.status !== "pending") throw new Error("Join request is no longer pending.");

  const now = formatIsoNow();
  if (response === "reject") {
    const updateRes = await admin
      .from("party_join_requests")
      .update({ status: "rejected", responded_at: now })
      .eq("id", request.id)
      .eq("status", "pending");
    if (updateRes.error) throw updateRes.error;
    await logPartyEvent(admin, request.party_id, userId, "party_join_rejected", { requestId: request.id, targetUserId: request.user_id });
    return;
  }

  if (await getCurrentPartyId(admin, request.user_id)) throw new Error("That player is already in a party.");
  if (party.state !== "forming" || party.locked) throw new Error("Party is not accepting new members.");
  const members = await getPartyMembers(admin, request.party_id);
  if (members.length >= party.max_members) throw new Error("Party is already full.");

  const memberInsert = await admin.from("party_members").insert({
    party_id: request.party_id,
    user_id: request.user_id,
    role: "member",
    ready: false,
  });
  if (memberInsert.error) throw memberInsert.error;

  const updateRes = await admin
    .from("party_join_requests")
    .update({ status: "approved", responded_at: now })
    .eq("id", request.id)
    .eq("status", "pending");
  if (updateRes.error) throw updateRes.error;

  await logPartyEvent(admin, request.party_id, userId, "party_join_approved", { requestId: request.id, targetUserId: request.user_id });
}

async function cancelJoinRequest(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const requestId = str(payload.requestId);
  if (!requestId) throw new Error("Join request id is required.");
  const updateRes = await admin
    .from("party_join_requests")
    .update({ status: "cancelled", responded_at: formatIsoNow() })
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "pending");
  if (updateRes.error) throw updateRes.error;
}

async function setReady(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("You are not in a party.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.state !== "forming" || party.locked) throw new Error("Ready state can only change while the party is forming.");
  const nextReady = payload.ready == null ? null : payload.ready === true;
  const members = await getPartyMembers(admin, partyId);
  const currentMember = members.find((entry) => entry.user_id === userId);
  if (!currentMember) throw new Error("Party member not found.");
  const ready = nextReady == null ? !currentMember.ready : nextReady;
  const updateRes = await admin
    .from("party_members")
    .update({ ready })
    .eq("party_id", partyId)
    .eq("user_id", userId);
  if (updateRes.error) throw updateRes.error;
  await logPartyEvent(admin, partyId, userId, ready ? "party_ready_on" : "party_ready_off", {});
}

async function leaveParty(admin: ReturnType<typeof createClient>, userId: string) {
  const partyId = await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("You are not in a party.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.state === "active" || party.locked) throw new Error("You cannot leave while the party is in an active activity.");

  const members = await getPartyMembers(admin, partyId);
  const me = members.find((entry) => entry.user_id === userId);
  if (!me) throw new Error("Party member not found.");

  if (me.role === "leader") {
    const others = members.filter((entry) => entry.user_id !== userId);
    if (!others.length) {
      await disbandParty(admin, userId, { partyId });
      return;
    }

    const nextLeader = others[0];
    const leaderUpdate = await admin
      .from("party_members")
      .update({ role: "leader", ready: false })
      .eq("party_id", partyId)
      .eq("user_id", nextLeader.user_id);
    if (leaderUpdate.error) throw leaderUpdate.error;

    const deleteRes = await admin
      .from("party_members")
      .delete()
      .eq("party_id", partyId)
      .eq("user_id", userId);
    if (deleteRes.error) throw deleteRes.error;

    const partyUpdate = await admin
      .from("parties")
      .update({ leader_user_id: nextLeader.user_id })
      .eq("id", partyId);
    if (partyUpdate.error) throw partyUpdate.error;

    await logPartyEvent(admin, partyId, userId, "party_leader_transferred", { newLeaderUserId: nextLeader.user_id });
    return;
  }

  const deleteRes = await admin
    .from("party_members")
    .delete()
    .eq("party_id", partyId)
    .eq("user_id", userId);
  if (deleteRes.error) throw deleteRes.error;

  await logPartyEvent(admin, partyId, userId, "party_member_left", {});
}

async function disbandParty(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");

  const now = formatIsoNow();
  const partyUpdate = await admin
    .from("parties")
    .update({
      state: "disbanded",
      visibility: "private",
      locked: true,
      disbanded_at: now,
    })
    .eq("id", partyId);
  if (partyUpdate.error) throw partyUpdate.error;

  const [memberDelete, inviteUpdate, requestUpdate, sessionUpdate] = await Promise.all([
    admin.from("party_members").delete().eq("party_id", partyId),
    admin.from("party_invites").update({ status: "revoked", responded_at: now }).eq("party_id", partyId).eq("status", "pending"),
    admin.from("party_join_requests").update({ status: "rejected", responded_at: now }).eq("party_id", partyId).eq("status", "pending"),
    admin.from("party_activity_sessions").update({ status: "cancelled", ended_at: now }).eq("party_id", partyId).eq("status", "active"),
  ]);
  if (memberDelete.error) throw memberDelete.error;
  if (inviteUpdate.error) throw inviteUpdate.error;
  if (requestUpdate.error) throw requestUpdate.error;
  if (sessionUpdate.error) throw sessionUpdate.error;

  await logPartyEvent(admin, partyId, userId, "party_disbanded", {});
}

async function startActivity(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (party.state !== "forming" || party.locked) throw new Error("Party cannot start an activity right now.");

  const members = await getPartyMembers(admin, partyId);
  if (members.length < 2) throw new Error("A party needs at least 2 players to start.");
  if (members.length > party.max_members) throw new Error("Party has too many members.");
  if (!members.filter((entry) => entry.role !== "leader").every((entry) => entry.ready)) {
    throw new Error("All non-leader party members must be ready first.");
  }

  const summaries = await getUserSummaries(admin, members.map((entry) => entry.user_id));
  const memberSnapshot = members.map((entry) => {
    const summary = summaries.get(entry.user_id) || {};
    return {
      userId: entry.user_id,
      heroName: str(summary.heroName, "Hero"),
      heroLevel: Math.max(1, int(summary.heroLevel, 1)),
      avatarUrl: str(summary.avatarUrl, "images/hero.png"),
      heroAttack: Math.max(0, int(summary.heroAttack, 0)),
      heroDefense: Math.max(0, int(summary.heroDefense, 0)),
      heroHPMax: Math.max(1, int(summary.heroHPMax, calcHpMax(summary.heroLevel))),
      heroHP: Math.max(0, int(summary.heroHP, int(summary.heroHPMax, calcHpMax(summary.heroLevel)))),
      staminaMax: Math.max(1, int(summary.staminaMax, calcStaminaMax(summary.heroLevel))),
      stamina: Math.max(0, int(summary.stamina, int(summary.staminaMax, calcStaminaMax(summary.heroLevel)))),
      role: entry.role,
      ready: !!entry.ready,
    };
  });
  const activity = normalizeActivity(payload.activity || party.activity);
  const selectedMonsterId = str(party.selected_monster_id);
  if (activity.toLowerCase().includes("party fight") && !selectedMonsterId) {
    throw new Error("Choose a monster before starting Party Fight.");
  }
  const selectedMonster = getPartyFightMonster(selectedMonsterId);
  const resultPayload = activity.toLowerCase().includes("party fight")
    ? normalizePartyFightPayload({}, selectedMonster)
    : {};

  const [sessionInsert, partyUpdate] = await Promise.all([
    admin.from("party_activity_sessions").insert({
      party_id: partyId,
      activity,
      status: "active",
      started_by_user_id: userId,
      member_snapshot: memberSnapshot,
      result_payload: resultPayload,
    }),
    admin.from("parties").update({
      state: "active",
      activity,
      locked: true,
    }).eq("id", partyId),
  ]);
  if (sessionInsert.error) throw sessionInsert.error;
  if (partyUpdate.error) throw partyUpdate.error;

  await logPartyEvent(admin, partyId, userId, "party_activity_started", { activity });
}

async function endActivity(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (party.state !== "active") throw new Error("Party is not in an active activity.");

  const now = formatIsoNow();
  const result = str(payload.result, "completed").toLowerCase();
  const activeSession = await getActiveSessionForParty(admin, partyId);
  if (activeSession) {
    const sessionUpdate = await admin
      .from("party_activity_sessions")
      .update({
        status: result === "failed" ? "failed" : "completed",
        ended_at: now,
        result_payload: payload.resultPayload && typeof payload.resultPayload === "object"
          ? payload.resultPayload
          : activeSession.result_payload && typeof activeSession.result_payload === "object"
            ? activeSession.result_payload
            : {},
      })
      .eq("id", activeSession.id);
    if (sessionUpdate.error) throw sessionUpdate.error;
  }

  const selectedMonsterId = str(party.selected_monster_id);

  const [partyUpdate, readyReset] = await Promise.all([
    admin.from("parties").update({
      state: "forming",
      locked: false,
      activity: normalizeActivity(payload.nextActivity || party.activity),
      selected_monster_id: "",
    }).eq("id", partyId),
    admin.from("party_members").update({ ready: false }).eq("party_id", partyId),
  ]);
  if (partyUpdate.error) throw partyUpdate.error;
  if (readyReset.error) throw readyReset.error;

  await logPartyEvent(admin, partyId, userId, "party_activity_ended", {
    result,
    selectedMonsterId,
  });
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
  if (userError || !user?.id) {
    return json({ error: "Invalid or expired session." }, { status: 401 });
  }

  let payload: JsonRecord = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const action = str(payload.action, "bootstrap").toLowerCase();

  try {
    if (action === "bootstrap") {
      return json(await getBootstrapState(admin, user.id));
    }
    if (action === "create_party") {
      await createParty(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party created." });
    }
    if (action === "update_party") {
      await updateParty(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party updated." });
    }
    if (action === "invite_player") {
      await invitePlayer(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Invite sent." });
    }
    if (action === "choose_monster") {
      await chooseMonster(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Monster selected." });
    }
    if (action === "respond_invite") {
      await respondInvite(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Invite response saved." });
    }
    if (action === "request_join") {
      await requestJoin(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Join request sent." });
    }
    if (action === "respond_join_request") {
      await respondJoinRequest(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Join request updated." });
    }
    if (action === "cancel_join_request") {
      await cancelJoinRequest(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Join request cancelled." });
    }
    if (action === "set_ready") {
      await setReady(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Ready state updated." });
    }
    if (action === "leave_party") {
      await leaveParty(admin, user.id);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party updated." });
    }
    if (action === "disband_party") {
      await disbandParty(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party disbanded." });
    }
    if (action === "start_activity") {
      await startActivity(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party activity started." });
    }
    if (action === "end_activity") {
      await endActivity(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party activity ended." });
    }

    return json({ error: `Unknown action '${action}'.` }, { status: 400 });
  } catch (error) {
    console.error("[party-action] failed", action, error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Party action failed.",
    }, { status: 400 });
  }
});
