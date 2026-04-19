﻿// ui.js — Darkstone Chronicles (GLOBAL HUD + Inventory + GLOBAL Item Inspector)
// ✅ Hero Panel: HEALTH / STAMINA / XP bars with text inside (compact width)
// ✅ Nav buttons restored: Home / Fight / Dungeons / Professions / Market
// ✅ Online + Offline regen with independent timestamps:
//    - HP +20 / 10min (hpRegenTs)
//    - Stamina +10 / 4min (staminaRegenTs)
// ✅ Persistent HP: heroHP + heroHPMax
// ✅ Inventory: tooltip, click inspector, drag&drop swap order
// ✅ Inspector replaces left panel and PAUSES background loops (DS.pause/resume)
// ✅ Live updates via localStorage hook (ds:save)
// ✅ Gear NEVER stacks. Sell Stack only for non-gear stacks.
// ✅ NEW: DS.stats.inc(key, amount) (personal lifetime stats in same save)

(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const ACTION_LOCK_KEY = "ds_action_lock_v1";
  const INV_TAB_KEY = "darkstone_inventory_tab_v1";
  const EQUIP_STATS_MODE_KEY = "darkstone_equip_stats_mode_v1";
  const CHAT_KEY = "darkstone_chat_v1";
  const CHAT_TAB_KEY = "darkstone_chat_tab_v1";
  const PETS_PANEL_COLLAPSED_KEY = "darkstone_pets_panel_collapsed_v1";
  const TAB_SYNC_CHANNEL = "darkstone_tab_sync_v1";
  const REFRESH_MS = 800;
  const GLOBAL_CHAT_FETCH_LIMIT = 80;
  const GLOBAL_CHAT_COOLDOWN_MS = 2000;
  const GLOBAL_CHAT_DUPLICATE_WINDOW_MS = 6000;
  const CHAT_CHANNELS = ["global", "market", "clan", "friends"];
  const PET_SLOT_DEFS = [
    { key: "combat", label: "Combat Pet", shortLabel: "Combat", emoji: "⚔️" },
    { key: "artisan", label: "Artisan Pet", shortLabel: "Artisan", emoji: "🛠️" },
    { key: "gathering", label: "Gathering Pet", shortLabel: "Gathering", emoji: "⛏️" },
    { key: "fortune", label: "Fortune Pet", shortLabel: "Fortune", emoji: "🍀" }
  ];
  const COMBAT_PET_FAMILIES = {
    wolf: [
      { tier: 1, name: "Wolf Cub", cost: 100000, atkPerLevel: 0.20, defPerLevel: 0.20, img: "images/pets/combat_wolf_cub.png", iconText: "WC" },
      { tier: 2, name: "Wild Wolf", cost: 1000000, atkPerLevel: 0.30, defPerLevel: 0.30, img: "images/pets/combat_wild_wolf.png", iconText: "WW" },
      { tier: 3, name: "Dire Wolf", cost: 10000000, atkPerLevel: 0.40, defPerLevel: 0.40, img: "images/pets/combat_dire_wolf.png", iconText: "DW" },
      { tier: 4, name: "Warfang Alpha", cost: 100000000, atkPerLevel: 0.50, defPerLevel: 0.50, img: "images/pets/combat_warfang_alpha.png", iconText: "WA" },
      { tier: 5, name: "Shadowfang Beast", cost: 1000000000, atkPerLevel: 0.60, defPerLevel: 0.60, img: "images/pets/combat_shadowfang_beast.png", iconText: "SB" }
    ]
  };
  const COMBAT_PET_MILESTONES = [
    { level: 10, atkPct: 0.01, defPct: 0.00 },
    { level: 25, atkPct: 0.00, defPct: 0.01 },
    { level: 50, atkPct: 0.01, defPct: 0.00 },
    { level: 75, atkPct: 0.00, defPct: 0.01 },
    { level: 100, atkPct: 0.01, defPct: 0.01 }
  ];
  const GATHERING_PET_FAMILIES = {
    burrower: [
      { tier: 1, name: "Burrower Pup", cost: 100000, professionXpPctPerLevel: 0.0010, img: "images/pets/gathering_burrower_pup.png", iconText: "BP" },
      { tier: 2, name: "Stoneburrow Mole", cost: 1000000, professionXpPctPerLevel: 0.0015, img: "images/pets/gathering_stoneburrow_mole.png", iconText: "SM" },
      { tier: 3, name: "Ironhide Mole", cost: 10000000, professionXpPctPerLevel: 0.0020, img: "images/pets/gathering_ironhide_mole.png", iconText: "IM" },
      { tier: 4, name: "Crystalburrow Alpha", cost: 100000000, professionXpPctPerLevel: 0.0025, img: "images/pets/gathering_crystalburrow_alpha.png", iconText: "CA" },
      { tier: 5, name: "Ancient Earthshaper", cost: 1000000000, professionXpPctPerLevel: 0.0030, img: "images/pets/gathering_ancient_earthshaper.png", iconText: "AE" }
    ]
  };
  const GATHERING_PET_MILESTONES = [
    { level: 10, doubleGatherPct: 0.01 },
    { level: 25, doubleGatherPct: 0.01 },
    { level: 50, doubleGatherPct: 0.01 },
    { level: 75, doubleGatherPct: 0.01 },
    { level: 100, doubleGatherPct: 0.02 }
  ];
  const ARTISAN_PET_FAMILIES = {
    workshop: [
      { tier: 1, name: "Workshop Mouse", cost: 100000, professionXpPctPerLevel: 0.0010, img: "images/pets/artisan_workshop_mouse.png", iconText: "WM" },
      { tier: 2, name: "Craft Imp", cost: 1000000, professionXpPctPerLevel: 0.0015, img: "images/pets/artisan_craft_imp.png", iconText: "CI" },
      { tier: 3, name: "Forge Elemental", cost: 10000000, professionXpPctPerLevel: 0.0020, img: "images/pets/artisan_forge_elemental.png", iconText: "FE" },
      { tier: 4, name: "Ember Servitor", cost: 100000000, professionXpPctPerLevel: 0.0025, img: "images/pets/artisan_ember_servitor.png", iconText: "ES" },
      { tier: 5, name: "Eternal Homunculus", cost: 1000000000, professionXpPctPerLevel: 0.0030, img: "images/pets/artisan_eternal_homunculus.png", iconText: "EH" }
    ]
  };
  const ARTISAN_PET_MILESTONES = [
    { level: 10, doubleCraftPct: 0.01 },
    { level: 25, doubleCraftPct: 0.01 },
    { level: 50, doubleCraftPct: 0.01 },
    { level: 75, doubleCraftPct: 0.01 },
    { level: 100, doubleCraftPct: 0.02 }
  ];
  const FORTUNE_PET_FAMILIES = {
    fortune: [
      { tier: 1, name: "Coin Ferret", cost: 100000, goldPctPerLevel: 0.0010, img: "images/pets/fortune_coin_ferret.png", iconText: "CF" },
      { tier: 2, name: "Lucky Raven", cost: 1000000, goldPctPerLevel: 0.0015, img: "images/pets/fortune_lucky_raven.png", iconText: "LR" },
      { tier: 3, name: "Golden Trickfox", cost: 10000000, goldPctPerLevel: 0.0020, img: "images/pets/fortune_golden_trickfox.png", iconText: "GT" },
      { tier: 4, name: "Treasure Wisp", cost: 100000000, goldPctPerLevel: 0.0025, img: "images/pets/fortune_treasure_wisp.png", iconText: "TW" },
      { tier: 5, name: "Gilded Gremlin King", cost: 1000000000, goldPctPerLevel: 0.0030, img: "images/pets/fortune_gilded_gremlin_king.png", iconText: "GG" }
    ]
  };
  const FORTUNE_PET_MILESTONES = [
    { level: 10, luckPct: 0.01 },
    { level: 25, luckPct: 0.01 },
    { level: 50, luckPct: 0.01 },
    { level: 75, luckPct: 0.01 },
    { level: 100, luckPct: 0.02 }
  ];

  // ===== Regen settings =====
  const HP_REGEN_AMOUNT = 20;
  const HP_REGEN_EVERY_MS = 10 * 60 * 1000; // 10 min
  const ST_REGEN_AMOUNT = 10;
  const ST_REGEN_EVERY_MS = 4 * 60 * 1000;  // 4 min

  // -------------------------
  // Global Pause API + Stats API
  // -------------------------
  window.DS = window.DS || {};
  if (typeof window.DS.isPaused !== "boolean") window.DS.isPaused = false;

  window.DS.pause = () => {
    window.DS.isPaused = true;
    window.dispatchEvent(new Event("ds:pause"));
  };

  window.DS.resume = () => {
    window.DS.isPaused = false;
    window.dispatchEvent(new Event("ds:resume"));
  };

  const __tabSyncClientId = (() => {
    try {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    } catch {}
    return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  })();
  let __tabSyncChannel = null;

  // ✅ Stats API (bulletproof: does NOT rely on ensureSave scope)
  window.DS.stats = window.DS.stats || {};
  window.DS.stats.inc = function(key, amount){
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const save = raw ? JSON.parse(raw) : {};
      if (!save || typeof save !== "object") return;

      if (!save.stats || typeof save.stats !== "object") save.stats = {};
      if (!save.stats.total || typeof save.stats.total !== "object") save.stats.total = {};

      const add = Number.isFinite(Number(amount)) ? Number(amount) : 1;
      const cur = Number.isFinite(Number(save.stats.total[key])) ? Number(save.stats.total[key]) : 0;

      save.stats.total[key] = cur + add;
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (e) {
      console.error("[DS.stats.inc] failed", e);
    }
  };

  // -------------------------
  // Helpers
  // -------------------------
  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (v) => String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const stripPlus = (name) => String(name || "").replace(/\s*\+\d+$/, "");
  function roundLevelXP(v){
    v = Math.max(1, Math.round(Number(v) || 1));
    if (v >= 10000000) return Math.ceil(v / 50000) * 50000;
    if (v >= 1000000) return Math.ceil(v / 10000) * 10000;
    if (v >= 100000) return Math.ceil(v / 5000) * 5000;
    if (v >= 10000) return Math.ceil(v / 500) * 500;
    if (v >= 1000) return Math.ceil(v / 100) * 100;
    return Math.round(v);
  }
  function xpNextForLevel(level){
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
  function fmtMMSS(ms){
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }
  function regenRemainingMs(now, ts, intervalMs){
    const t = Number.isFinite(Number(ts)) ? Number(ts) : now;
    const elapsed = Math.max(0, now - t);
    let rem = intervalMs - (elapsed % intervalMs);
    if (rem === intervalMs) rem = 0;
    return rem;
  }
  function petXpNextForLevel(level){
    return xpNextForLevel(level);
  }
  function getCombatPetXpGain(combatXp){
    return Math.max(0, Math.floor(num(combatXp, 0) * 0.10));
  }
  function splitXpWithPet(save, slotKey, totalXp){
    const total = Math.max(0, Math.floor(num(totalXp, 0)));
    if (!save || typeof save !== "object" || !save.pets || !slotKey) {
      return { totalXp: total, playerXpGain: total, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
    }
    const currentPet = normalizePet(slotKey, save.pets[slotKey]);
    if (!currentPet || !currentPet.active || total <= 0) {
      return { totalXp: total, playerXpGain: total, petXpGain: 0, petLevelUps: 0, petLevel: currentPet?.level || 0, petName: currentPet?.name || "" };
    }

    const petXpGain = Math.max(0, Math.floor(total * 0.10));
    const playerXpGain = Math.max(0, total - petXpGain);
    let petLevelUps = 0;

    currentPet.xp = Math.max(0, Math.floor(num(currentPet.xp, 0))) + petXpGain;
    currentPet.xpNext = Math.max(1, Math.floor(num(currentPet.xpNext, petXpNextForLevel(currentPet.level))));

    while (currentPet.xp >= currentPet.xpNext) {
      currentPet.xp -= currentPet.xpNext;
      currentPet.level += 1;
      currentPet.xpNext = petXpNextForLevel(currentPet.level);
      petLevelUps += 1;
    }

    save.pets[slotKey] = normalizePet(slotKey, currentPet);
    return {
      totalXp: total,
      playerXpGain,
      petXpGain,
      petLevelUps,
      petLevel: currentPet.level,
      petName: currentPet.name || ""
    };
  }
  function getCombatPetMilestoneBonuses(level){
    const L = Math.max(1, Math.floor(num(level, 1)));
    return COMBAT_PET_MILESTONES.reduce((acc, milestone) => {
      if (L >= milestone.level) {
        acc.atkPct += num(milestone.atkPct, 0);
        acc.defPct += num(milestone.defPct, 0);
      }
      return acc;
    }, { atkPct: 0, defPct: 0 });
  }
  function getGatheringPetMilestoneBonuses(level){
    const L = Math.max(1, Math.floor(num(level, 1)));
    return GATHERING_PET_MILESTONES.reduce((acc, milestone) => {
      if (L >= milestone.level) acc.doubleGatherPct += num(milestone.doubleGatherPct, 0);
      return acc;
    }, { doubleGatherPct: 0 });
  }
  function getArtisanPetMilestoneBonuses(level){
    const L = Math.max(1, Math.floor(num(level, 1)));
    return ARTISAN_PET_MILESTONES.reduce((acc, milestone) => {
      if (L >= milestone.level) acc.doubleCraftPct += num(milestone.doubleCraftPct, 0);
      return acc;
    }, { doubleCraftPct: 0 });
  }
  function getFortunePetMilestoneBonuses(level){
    const L = Math.max(1, Math.floor(num(level, 1)));
    return FORTUNE_PET_MILESTONES.reduce((acc, milestone) => {
      if (L >= milestone.level) acc.luckPct += num(milestone.luckPct, 0);
      return acc;
    }, { luckPct: 0 });
  }
  function getPetTierData(slotKey, family, tier){
    let tiers = [];
    if (slotKey === "combat") tiers = COMBAT_PET_FAMILIES[String(family || "").toLowerCase()] || [];
    else if (slotKey === "gathering") tiers = GATHERING_PET_FAMILIES[String(family || "").toLowerCase()] || [];
    else if (slotKey === "artisan") tiers = ARTISAN_PET_FAMILIES[String(family || "").toLowerCase()] || [];
    else if (slotKey === "fortune") tiers = FORTUNE_PET_FAMILIES[String(family || "").toLowerCase()] || [];
    return tiers.find((x) => num(x.tier, 0) === num(tier, 1)) || null;
  }
  function getPetTierForLevel(level){
    const L = Math.max(1, Math.floor(num(level, 1)));
    if (L >= 100) return 5;
    if (L >= 75) return 4;
    if (L >= 50) return 3;
    if (L >= 25) return 2;
    return 1;
  }
  function getNextPetEvolveLevel(tier){
    const currentTier = Math.max(1, Math.floor(num(tier, 1)));
    if (currentTier >= 5) return 0;
    return currentTier * 25;
  }
  function isPetAwaitingEvolution(slotKey, pet){
    const safePet = pet && typeof pet === "object" ? pet : normalizePet(slotKey, pet);
    if (!safePet) return false;
    return getPetTierForLevel(safePet.level) > num(safePet.tier, 1);
  }
  function normalizePet(slotKey, pet){
    if (!pet || typeof pet !== "object") return null;
    const next = { ...pet };
    next.slot = String(next.slot || slotKey || "").toLowerCase();
    next.active = !("active" in next) ? true : Boolean(next.active);
    next.family = String(next.family || (slotKey === "combat" ? "wolf" : (slotKey === "gathering" ? "burrower" : (slotKey === "artisan" ? "workshop" : (slotKey === "fortune" ? "fortune" : slotKey)))) || "").toLowerCase();
    next.level = Math.max(1, Math.round(num(next.level, 1)));
    next.tier = Math.max(1, Math.round(num(next.tier, 1)));
    next.xp = Math.max(0, Math.round(num(next.xp, 0)));
    next.xpNext = Math.max(1, Math.round(num(next.xpNext, petXpNextForLevel(next.level))));
    const tierData = getPetTierData(slotKey, next.family, next.tier);
    const nextTierData = getPetTierData(slotKey, next.family, next.tier + 1);
    if (tierData) {
      next.name = String(tierData.name || next.name || PET_SLOT_DEFS.find((x) => x.key === slotKey)?.label || "Pet");
      next.img = String(tierData.img || next.img || "");
      next.iconText = String(tierData.iconText || next.iconText || "PET");
      next.atkPerLevel = num(tierData.atkPerLevel, next.atkPerLevel);
      next.defPerLevel = num(tierData.defPerLevel, next.defPerLevel);
      next.professionXpPctPerLevel = num(tierData.professionXpPctPerLevel, next.professionXpPctPerLevel);
      next.goldPctPerLevel = num(tierData.goldPctPerLevel, next.goldPctPerLevel);
      next.nextUpgradeCost = num(nextTierData?.cost, next.nextUpgradeCost);
    } else {
      next.name = String(next.name || PET_SLOT_DEFS.find((x) => x.key === slotKey)?.label || "Pet");
      next.img = String(next.img || "");
      next.iconText = String(next.iconText || "PET");
      next.atkPerLevel = num(next.atkPerLevel, 0);
      next.defPerLevel = num(next.defPerLevel, 0);
      next.professionXpPctPerLevel = num(next.professionXpPctPerLevel, 0);
      next.goldPctPerLevel = num(next.goldPctPerLevel, 0);
      next.nextUpgradeCost = num(next.nextUpgradeCost, 0);
    }
    return next;
  }
  function getCombatPetBonuses(pet){
    const safePet = normalizePet("combat", pet);
    if (!safePet) return { atkFlat: 0, defFlat: 0, atkPct: 0, defPct: 0 };
    const level = Math.max(1, Math.floor(num(safePet.level, 1)));
    const flatAtk = num(safePet.atkPerLevel, 0) * level;
    const flatDef = num(safePet.defPerLevel, 0) * level;
    const milestones = getCombatPetMilestoneBonuses(level);
    return {
      atkFlat: flatAtk,
      defFlat: flatDef,
      atkPct: num(milestones.atkPct, 0),
      defPct: num(milestones.defPct, 0)
    };
  }
  function getGatheringPetBonuses(pet){
    const safePet = normalizePet("gathering", pet);
    if (!safePet) return { professionXpPct: 0, doubleGatherPct: 0 };
    const level = Math.max(1, Math.floor(num(safePet.level, 1)));
    const milestones = getGatheringPetMilestoneBonuses(level);
    return {
      professionXpPct: num(safePet.professionXpPctPerLevel, 0) * level,
      doubleGatherPct: num(milestones.doubleGatherPct, 0)
    };
  }
  function getArtisanPetBonuses(pet){
    const safePet = normalizePet("artisan", pet);
    if (!safePet) return { professionXpPct: 0, doubleCraftPct: 0 };
    const level = Math.max(1, Math.floor(num(safePet.level, 1)));
    const milestones = getArtisanPetMilestoneBonuses(level);
    return {
      professionXpPct: num(safePet.professionXpPctPerLevel, 0) * level,
      doubleCraftPct: num(milestones.doubleCraftPct, 0)
    };
  }
  function getFortunePetBonuses(pet){
    const safePet = normalizePet("fortune", pet);
    if (!safePet) return { goldPct: 0, luckPct: 0 };
    const level = Math.max(1, Math.floor(num(safePet.level, 1)));
    const milestones = getFortunePetMilestoneBonuses(level);
    return {
      goldPct: num(safePet.goldPctPerLevel, 0) * level,
      luckPct: num(milestones.luckPct, 0)
    };
  }
  function getEmptyPetsState(){
    return Object.fromEntries(PET_SLOT_DEFS.map((slot) => [slot.key, null]));
  }
  function isPetsPanelCollapsed(){
    try { return localStorage.getItem(PETS_PANEL_COLLAPSED_KEY) === "1"; }
    catch { return false; }
  }
  function setPetsPanelCollapsed(next){
    try { localStorage.setItem(PETS_PANEL_COLLAPSED_KEY, next ? "1" : "0"); }
    catch {}
  }
  window.DS.pets = {
    slots: PET_SLOT_DEFS,
    combatFamilies: COMBAT_PET_FAMILIES,
    gatheringFamilies: GATHERING_PET_FAMILIES,
    artisanFamilies: ARTISAN_PET_FAMILIES,
    fortuneFamilies: FORTUNE_PET_FAMILIES,
    combatMilestones: COMBAT_PET_MILESTONES,
    gatheringMilestones: GATHERING_PET_MILESTONES,
    artisanMilestones: ARTISAN_PET_MILESTONES,
    fortuneMilestones: FORTUNE_PET_MILESTONES,
    petXpNextForLevel,
    getCombatPetXpGain,
    splitXpWithPet,
    getCombatPetMilestoneBonuses,
    getGatheringPetMilestoneBonuses,
    getArtisanPetMilestoneBonuses,
    getFortunePetMilestoneBonuses,
    getCombatPetBonuses,
    getGatheringPetBonuses,
    getArtisanPetBonuses,
    getFortunePetBonuses,
    normalizePet,
    isPetActive: (slotKey, pet) => !!normalizePet(slotKey, pet)?.active,
    getPetTierForLevel,
    getNextPetEvolveLevel,
    isPetAwaitingEvolution
  };

  // ✅ Gear slots + gear detector (used everywhere)
  const GEAR_SLOTS = new Set([
    "mainHand","offHand",
    "helmet","shoulders","chest","bracers","gloves",
    "belt","pants","boots",
    "ring","amulet"
  ]);
  const CONSUMABLE_SLOTS = ["potion1","potion2","consumable1","consumable2"];
  function isGearItem(it){
    return (it?.type === "gear") || (it?.slot && GEAR_SLOTS.has(it.slot));
  }

  // ✅ Round XPNext to "nice" numbers (persisted)
  function roundXPNext(v){
    v = Number(v) || 0;
    if (v <= 0) return 0;
    const step = (v >= 10000) ? 500 : 100;
    return Math.ceil(v / step) * step;
  }

  function loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }


  function hasCreatedHero(save) {
    const s = save && typeof save === "object" ? save : {};
    if (Boolean(s.heroCreated) && String(s.heroName || "").trim().length > 0 && String(s.heroPortrait || "").trim().length > 0) {
      return true;
    }
    return Object.keys(s).length > 0;
  }

  function setSave(next) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  function loadChatState() {
    try {
      const raw = JSON.parse(localStorage.getItem(CHAT_KEY) || "{}") || {};
      const next = {};
      CHAT_CHANNELS.forEach((channel) => {
        next[channel] = Array.isArray(raw[channel]) ? raw[channel] : [];
      });
      return next;
    } catch {
      return Object.fromEntries(CHAT_CHANNELS.map((channel) => [channel, []]));
    }
  }

  function setChatState(next) {
    localStorage.setItem(CHAT_KEY, JSON.stringify(next));
  }

  function createLiveChatChannelState() {
    return {
      messages: [],
      loaded: false,
      loading: false,
      sending: false,
      subscribed: false,
      channel: null,
      pollTimer: 0,
      signature: "",
      pendingMap: {},
      lastSendAt: 0,
      lastSentText: ""
    };
  }

  const __liveChatState = {
    global: createLiveChatChannelState(),
    market: createLiveChatChannelState()
  };
  const __chatDrafts = Object.fromEntries(CHAT_CHANNELS.map((channel) => [channel, ""]));

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getSupabaseClient() {
    return window.DSAuth?.getClient?.() || null;
  }

  function isLiveChatTab(tab) {
    return tab === "global" || tab === "market";
  }

  function getLiveChatState(tab) {
    return isLiveChatTab(tab) ? __liveChatState[tab] : null;
  }

  function normalizeRemoteChatMessage(row) {
    if (!row || typeof row !== "object") return null;
    return {
      id: Number(row.id || 0) || Date.now(),
      author: String(row.author_name || "Player").trim() || "Player",
      text: String(row.body || "").trim(),
      ts: Date.parse(row.created_at || "") || Date.now(),
      pending: false
    };
  }

  function getChatMessageSignature(messages) {
    return (Array.isArray(messages) ? messages : [])
      .map((msg) => `${Number(msg?.id || 0)}:${Number(msg?.ts || 0)}:${String(msg?.author || "")}:${String(msg?.text || "")}`)
      .join("|");
  }

  async function loadLiveChatMessages(tab, force = false) {
    const state = getLiveChatState(tab);
    if ((state.loaded && !force) || state.loading) return;

    const client = getSupabaseClient();
    if (!client) return;

    state.loading = true;
    try {
      const { data, error } = await client
        .from("chat_messages")
        .select("id, author_name, body, created_at")
        .eq("channel_kind", tab)
        .order("created_at", { ascending: false })
        .limit(GLOBAL_CHAT_FETCH_LIMIT);
      if (error) throw error;

      const rows = Array.isArray(data) ? data.map(normalizeRemoteChatMessage).filter(Boolean).reverse() : [];
      const pendingRows = Object.values(state.pendingMap || {});
      const mergedRows = [...rows];
      pendingRows.forEach((pendingMsg) => {
        const alreadyMatched = rows.some((msg) =>
          msg.author === pendingMsg.author &&
          msg.text === pendingMsg.text &&
          Math.abs(Number(msg.ts || 0) - Number(pendingMsg.ts || 0)) < 15000
        );
        if (!alreadyMatched) mergedRows.push(pendingMsg);
      });
      mergedRows.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
      const nextSignature = getChatMessageSignature(mergedRows);
      const changed = nextSignature !== state.signature;
      state.messages = mergedRows.slice(-GLOBAL_CHAT_FETCH_LIMIT);
      state.signature = nextSignature;
      state.loaded = true;
      if (__chatTab === tab && (changed || !force)) renderChatPanel(ensureSave(loadSave()));
    } catch (error) {
      console.error(`[chat] failed to load ${tab} messages`, error);
    } finally {
      state.loading = false;
    }
  }

  async function ensureLiveChatSubscription(tab) {
    const state = getLiveChatState(tab);
    if (state.subscribed) return;

    const client = getSupabaseClient();
    if (!client) return;

    const channel = client.channel(`darkstone-${tab}-chat`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `channel_kind=eq.${tab}`
      },
      (payload) => {
        const nextMessage = normalizeRemoteChatMessage(payload?.new);
        if (!nextMessage) return;
        Object.keys(state.pendingMap || {}).forEach((key) => {
          const pendingMsg = state.pendingMap[key];
          if (!pendingMsg) return;
          const sameAuthor = pendingMsg.author === nextMessage.author;
          const sameText = pendingMsg.text === nextMessage.text;
          const nearTime = Math.abs(Number(pendingMsg.ts || 0) - Number(nextMessage.ts || 0)) < 15000;
          if (sameAuthor && sameText && nearTime) delete state.pendingMap[key];
        });
        const exists = state.messages.some((msg) => Number(msg.id || 0) === nextMessage.id);
        if (exists) return;
        state.messages = [...state.messages, nextMessage].slice(-GLOBAL_CHAT_FETCH_LIMIT);
        state.signature = getChatMessageSignature(state.messages);
        state.loaded = true;
        if (__chatTab === tab) renderChatPanel(ensureSave(loadSave()));
      }
    );
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        state.subscribed = true;
      }
    });
    state.channel = channel;
  }

  async function sendLiveChatMessage(tab, save, text) {
    const state = getLiveChatState(tab);
    if (state.sending) return { ok: false };

    const client = getSupabaseClient();
    const user = window.DSAuth?.getUser?.();
    if (!client || !user?.id) {
      return { ok: false, error: "Chat is not ready yet." };
    }

    const now = Date.now();
    const trimmedText = String(text || "").trim();
    if (!trimmedText) {
      return { ok: false, error: "Write a message first." };
    }

    const cooldownRemaining = GLOBAL_CHAT_COOLDOWN_MS - (now - Number(state.lastSendAt || 0));
    if (cooldownRemaining > 0) {
      return { ok: false, error: `Wait ${Math.ceil(cooldownRemaining / 1000)}s before sending again.` };
    }

    const normalizedLast = String(state.lastSentText || "").trim().toLowerCase();
    const normalizedNext = trimmedText.toLowerCase();
    if (
      normalizedLast &&
      normalizedLast === normalizedNext &&
      (now - Number(state.lastSendAt || 0)) < GLOBAL_CHAT_DUPLICATE_WINDOW_MS
    ) {
      return { ok: false, error: "Do not send the same message repeatedly." };
    }

    state.sending = true;
    const optimisticId = `pending:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      id: optimisticId,
      author: getChatAuthorName(save),
      text: trimmedText,
      ts: now,
      pending: true
    };
    state.lastSendAt = now;
    state.lastSentText = trimmedText;
    state.pendingMap[optimisticId] = optimisticMessage;
    state.messages = [...state.messages, optimisticMessage].slice(-GLOBAL_CHAT_FETCH_LIMIT);
    state.signature = getChatMessageSignature(state.messages);
    if (__chatTab === tab) renderChatPanel(ensureSave(loadSave()));
    try {
      const { error } = await client.from("chat_messages").insert({
        channel_kind: tab,
        user_id: user.id,
        author_name: getChatAuthorName(save),
        body: trimmedText
      });
      if (error) throw error;
      return { ok: true };
    } catch (error) {
      delete state.pendingMap[optimisticId];
      state.messages = state.messages.filter((msg) => msg.id !== optimisticId);
      state.signature = getChatMessageSignature(state.messages);
      if (__chatTab === tab) renderChatPanel(ensureSave(loadSave()));
      console.error(`[chat] failed to send ${tab} message`, error);
      return { ok: false, error: error?.message || "Failed to send message." };
    } finally {
      state.sending = false;
    }
  }

  function ensureLiveChatPolling(tab) {
    const state = getLiveChatState(tab);
    if (state.pollTimer) return;
    state.pollTimer = window.setInterval(() => {
      if (document.hidden) return;
      loadLiveChatMessages(tab, true);
    }, 3000);
  }

  function calcHpMax(level){
    return 100 + (Math.max(1, num(level, 1)) - 1) * 10;
  }

  function calcStaminaMax(level){
    return 100 + (Math.max(1, num(level, 1)) - 1) * 5;
  }

  function unstackGear(arr){
    // no-op: gear can stack to save space
    return;
  }

  function ensureSave(s) {
    s = s && typeof s === "object" ? s : {};

    if (!Array.isArray(s.inventory)) s.inventory = [];
    if (!Array.isArray(s.bank)) s.bank = [];

    // Migrate cooked fish to heal HP (old saves may have stamina)
    const cookedFishIds = new Set([
      "cooked_mud_minnow",
      "cooked_bog_carp",
      "cooked_shiner_fish",
      "cooked_golden_perch",
      "cooked_spiny_sunfish",
      "cooked_striped_bass",
      "cooked_stone_catfish",
      "cooked_crystal_pike",
      "cooked_moon_carp",
      "cooked_glass_eel",
      "cooked_frost_salmon",
      "cooked_glacier_char",
      "cooked_ice_sturgeon",
      "cooked_spiral_horn_gar",
      "cooked_storm_mackerel",
      "cooked_lantern_pike",
      "cooked_ghost_ray",
      "cooked_hammerhead_pike",
      "cooked_void_angler",
      "cooked_leviathan_marlin"
    ]);
    const fixCookedFish = (arr) => {
      for (const it of arr) {
        if (!it || it.type !== "food") continue;
        if (!cookedFishIds.has(String(it.id || ""))) continue;
        const st = num(it.healStamina, 0);
        const hp = num(it.healHp, 0);
        if (st > 0 && hp <= 0) it.healHp = st;
        if (st > 0) it.healStamina = 0;
      }
    };
    fixCookedFish(s.inventory);
    fixCookedFish(s.bank);

    // gear can stack to save space
    unstackGear(s.inventory);
    unstackGear(s.bank);

  if (!s.equipment || typeof s.equipment !== "object") s.equipment = {};
  for (const k of GEAR_SLOTS) if (!(k in s.equipment)) s.equipment[k] = null;
  if (!s.consumables || typeof s.consumables !== "object") s.consumables = {};
  for (const k of CONSUMABLE_SLOTS) if (!(k in s.consumables)) s.consumables[k] = null;
  if (!("quick_potion1" in s.consumables)) s.consumables.quick_potion1 = null;
  if (!("quick_potion2" in s.consumables)) s.consumables.quick_potion2 = null;
  if (!("quick_meat" in s.consumables)) s.consumables.quick_meat = null;
  if (!("quick_cooked_fish" in s.consumables)) s.consumables.quick_cooked_fish = null;
  if (!("quick_consumable1" in s.consumables)) s.consumables.quick_consumable1 = null;
  if (!("quick_consumable2" in s.consumables)) s.consumables.quick_consumable2 = null;
  if (!s.pets || typeof s.pets !== "object") s.pets = getEmptyPetsState();
  for (const slot of PET_SLOT_DEFS) {
    if (!(slot.key in s.pets)) s.pets[slot.key] = null;
    s.pets[slot.key] = normalizePet(slot.key, s.pets[slot.key]);
  }

    s.heroName = String(s.heroName || s.playerName || "Hero").trim() || "Hero";
    s.playerName = s.heroName;
    s.heroPortrait = String(s.heroPortrait || "images/hero.png").trim() || "images/hero.png";
    s.heroCreated = hasCreatedHero(s) || s.heroCreated === true;

    s.heroLevel = num(s.heroLevel, 1);
    s.heroXP = Math.max(0, Math.round(num(s.heroXP, 0)));
    s.heroXPNext = xpNextForLevel(s.heroLevel);

    // ===== Mining =====
    s.miningLevel = num(s.miningLevel, 1);
    s.miningXP = num(s.miningXP, 0);
    s.miningXPNext = xpNextForLevel(s.miningLevel);

    // ===== Fishing =====
    s.fishingLevel = num(s.fishingLevel, 1);
    s.fishingXP = num(s.fishingXP, 0);
    s.fishingXPNext = xpNextForLevel(s.fishingLevel);

    // ===== Blacksmith =====
    s.blacksmithLevel = num(s.blacksmithLevel, 1);
    s.blacksmithXP = num(s.blacksmithXP, 0);
    s.blacksmithXPNext = xpNextForLevel(s.blacksmithLevel);

    // ===== Cooking =====
    s.cookingLevel = num(s.cookingLevel, 1);
    s.cookingXP = num(s.cookingXP, 0);
    s.cookingXPNext = xpNextForLevel(s.cookingLevel);

    // ===== Woodcutting / Carpentry (migrate from old woodworking) =====
    const legacyWoodLevel = num(s.woodworkingLevel, 0);
    const legacyWoodXP = num(s.woodworkingXP, 0);
    const legacyWoodNext = num(s.woodworkingXPNext, 0);

    if (!Number.isFinite(Number(s.woodcuttingLevel)) && legacyWoodLevel > 0) s.woodcuttingLevel = legacyWoodLevel;
    if (!Number.isFinite(Number(s.woodcuttingXP)) && legacyWoodLevel > 0) s.woodcuttingXP = legacyWoodXP;
    if (!Number.isFinite(Number(s.woodcuttingXPNext)) && legacyWoodLevel > 0) s.woodcuttingXPNext = legacyWoodNext;

    if (!Number.isFinite(Number(s.carpentryLevel)) && legacyWoodLevel > 0) s.carpentryLevel = legacyWoodLevel;
    if (!Number.isFinite(Number(s.carpentryXP)) && legacyWoodLevel > 0) s.carpentryXP = legacyWoodXP;
    if (!Number.isFinite(Number(s.carpentryXPNext)) && legacyWoodLevel > 0) s.carpentryXPNext = legacyWoodNext;

    s.woodcuttingLevel = num(s.woodcuttingLevel, 1);
    s.woodcuttingXP = num(s.woodcuttingXP, 0);
    s.woodcuttingXPNext = xpNextForLevel(s.woodcuttingLevel);

    s.carpentryLevel = num(s.carpentryLevel, 1);
    s.carpentryXP = num(s.carpentryXP, 0);
    s.carpentryXPNext = xpNextForLevel(s.carpentryLevel);

    // ===== Hunting =====
    s.huntingLevel = num(s.huntingLevel, 1);
    s.huntingXP = num(s.huntingXP, 0);
    s.huntingXPNext = xpNextForLevel(s.huntingLevel);

    // ===== Enchanting =====
    s.enchantingLevel = num(s.enchantingLevel, 1);
    s.enchantingXP = num(s.enchantingXP, 0);
    s.enchantingXPNext = xpNextForLevel(s.enchantingLevel);

    // ===== Herbalism =====
    s.herbalismLevel = num(s.herbalismLevel, 1);
    s.herbalismXP = num(s.herbalismXP, 0);
    s.herbalismXPNext = xpNextForLevel(s.herbalismLevel);

    // ===== Alchemy =====
    s.alchemyLevel = num(s.alchemyLevel, 1);
    s.alchemyXP = num(s.alchemyXP, 0);
    s.alchemyXPNext = xpNextForLevel(s.alchemyLevel);

    // ✅ Stamina max scales with HERO level
    const stMax = calcStaminaMax(s.heroLevel);
    const prevStMax = Math.max(1, num(s.staminaMax, stMax));
    const prevSt = clamp(num(s.stamina, prevStMax), 0, prevStMax);

    if (prevStMax !== stMax) {
      const ratio = prevStMax > 0 ? (prevSt / prevStMax) : 1;
      s.staminaMax = stMax;
      s.stamina = Math.round(clamp(ratio * s.staminaMax, 0, s.staminaMax));
    } else {
      s.staminaMax = stMax;
      const hasStaminaField = Number.isFinite(Number(s.stamina));
      s.stamina = hasStaminaField ? clamp(prevSt, 0, s.staminaMax) : s.staminaMax;
    }

    s.heroAttack = num(s.heroAttack, 10);
    s.heroDefense = num(s.heroDefense, 10);
    s.heroStatPoints = Math.max(0, Math.round(num(s.heroStatPoints, 0)));
    s.attackTotal = num(s.attackTotal, s.heroAttack);
    s.defenseTotal = num(s.defenseTotal, s.heroDefense);

    // ===== Buildings =====
    s.barracksLevel = Math.max(0, Math.round(num(s.barracksLevel, 0)));
    s.cryptHallLevel = Math.max(0, Math.round(num(s.cryptHallLevel, 0)));
    s.minerHutLevel = Math.max(0, Math.round(num(s.minerHutLevel, 0)));
    s.forgeAcademyLevel = Math.max(0, Math.round(num(s.forgeAcademyLevel, 0)));

    s.gold = num(s.gold, 0);
    s.inventoryMaxSlots = num(s.inventoryMaxSlots, 1000);

    // HP persistent (keep ratio if hpMax changes)
    const hpMax = calcHpMax(s.heroLevel);
    const prevMax = Math.max(1, num(s.heroHPMax, hpMax));
    const prevHp = clamp(num(s.heroHP, prevMax), 0, prevMax);

    if (prevMax !== hpMax) {
      const ratio = prevMax > 0 ? (prevHp / prevMax) : 1;
      s.heroHPMax = hpMax;
      s.heroHP = Math.round(clamp(ratio * s.heroHPMax, 0, s.heroHPMax));
    } else {
      s.heroHPMax = hpMax;
      s.heroHP = clamp(prevHp, 0, s.heroHPMax);
    }

    // ✅ regen timestamps
    if (!Number.isFinite(Number(s.staminaRegenTs))) s.staminaRegenTs = Date.now();
    if (!Number.isFinite(Number(s.hpRegenTs))) s.hpRegenTs = Date.now();

    // ===== Stats (personal, lifetime) =====
    if (!s.stats || typeof s.stats !== "object") s.stats = {};
    if (!s.stats.total || typeof s.stats.total !== "object") s.stats.total = {};

    const T = s.stats.total;
    if (!Number.isFinite(Number(T.fightsWon))) T.fightsWon = 0;
    if (!Number.isFinite(Number(T.fightsLost))) T.fightsLost = 0;
    if (!Number.isFinite(Number(T.dungeonsCompleted))) T.dungeonsCompleted = 0;

    if (!Number.isFinite(Number(T.miningTicks))) T.miningTicks = 0;
    if (!Number.isFinite(Number(T.barsCrafted))) T.barsCrafted = 0;

    if (!Number.isFinite(Number(T.huntingTicks))) T.huntingTicks = 0;
    if (!Number.isFinite(Number(T.fishingTicks))) T.fishingTicks = 0;
    if (!Number.isFinite(Number(T.cookingCrafts))) T.cookingCrafts = 0;

    if (!Number.isFinite(Number(T.woodGatherTicks))) T.woodGatherTicks = 0;
    if (!Number.isFinite(Number(T.planksCrafted))) T.planksCrafted = 0;

    if (!Number.isFinite(Number(T.goldEarned))) T.goldEarned = 0;
    if (!Number.isFinite(Number(T.itemsDropped))) T.itemsDropped = 0;
    if (!Number.isFinite(Number(T.mythicsFound))) T.mythicsFound = 0;

    return s;
  }

  // -------------------------
  // localStorage hook -> ds:save (same tab)
  // -------------------------
  function notifySaveObservers() {
    window.dispatchEvent(new Event("ds:save"));
  }

  function emitCrossTabSignal(type, payload = {}) {
    try {
      if (!("BroadcastChannel" in window)) return;
      if (!__tabSyncChannel) __tabSyncChannel = new BroadcastChannel(TAB_SYNC_CHANNEL);
      __tabSyncChannel.postMessage({
        sourceId: __tabSyncClientId,
        type: String(type || "").trim(),
        at: Date.now(),
        ...payload
      });
    } catch (error) {
      console.warn("[UI] tab sync post failed", error);
    }
  }

  function handleExternalSaveChange() {
    notifySaveObservers();
    forceRerenderNow();
  }

  function setupTabSyncOnce() {
    if (window.__dsTabSyncReady) return;
    window.__dsTabSyncReady = true;

    if ("BroadcastChannel" in window) {
      try {
        __tabSyncChannel = new BroadcastChannel(TAB_SYNC_CHANNEL);
        __tabSyncChannel.addEventListener("message", (event) => {
          const data = event?.data || {};
          if (!data || data.sourceId === __tabSyncClientId) return;
          if (data.type === "save-updated") {
            handleExternalSaveChange();
            return;
          }
          if (data.type === "action-lock-updated") {
            forceRerenderNow();
          }
        });
      } catch (error) {
        console.warn("[UI] tab sync channel setup failed", error);
      }
    }
  }

  function hookLocalStorageOnce() {
    if (window.__dsHookedStorage) return;
    window.__dsHookedStorage = true;

    const _setItem = localStorage.setItem.bind(localStorage);
    const _removeItem = localStorage.removeItem.bind(localStorage);
    localStorage.setItem = (k, v) => {
      _setItem(k, v);
      if (k === SAVE_KEY) {
        notifySaveObservers();
        emitCrossTabSignal("save-updated");
      } else if (k === ACTION_LOCK_KEY) {
        emitCrossTabSignal("action-lock-updated");
      }
    };
    localStorage.removeItem = (k) => {
      _removeItem(k);
      if (k === SAVE_KEY) {
        notifySaveObservers();
        emitCrossTabSignal("save-updated");
      } else if (k === ACTION_LOCK_KEY) {
        emitCrossTabSignal("action-lock-updated");
      }
    };
  }

  // -------------------------
  // Regen tick
  // -------------------------
  function applyRegenTick(){
    if (window.DS?.isPaused) return;

    const now = Date.now();
    const s = ensureSave(loadSave());
    let didWrite = false;

    const stTs = num(s.staminaRegenTs, now);
    const stTicks = Math.floor(Math.max(0, now - stTs) / ST_REGEN_EVERY_MS);
    if (stTicks > 0) {
      s.stamina = clamp(num(s.stamina, 0) + stTicks * ST_REGEN_AMOUNT, 0, s.staminaMax);
      s.staminaRegenTs = stTs + stTicks * ST_REGEN_EVERY_MS;
      didWrite = true;
    }

    const hpTs = num(s.hpRegenTs, now);
    const hpTicks = Math.floor(Math.max(0, now - hpTs) / HP_REGEN_EVERY_MS);
    if (hpTicks > 0) {
      s.heroHP = clamp(num(s.heroHP, 0) + hpTicks * HP_REGEN_AMOUNT, 0, s.heroHPMax);
      s.hpRegenTs = hpTs + hpTicks * HP_REGEN_EVERY_MS;
      didWrite = true;
    }

    const stMax = Math.max(1, num(s.staminaMax, 100));
    const stNow = clamp(num(s.stamina, 0), 0, stMax);
    if (stNow / stMax <= 0.30) {
      const slot = s.consumables?.quick_meat;
      const qty = num(slot?.quantity ?? slot?.qty, 0);
      const per = getCookedMeatStamina(slot);
      if (slot && qty > 0 && per > 0) {
        const eatQty = Math.min(10, qty);
        s.stamina = clamp(stNow + per * eatQty, 0, stMax);
        if (qty > eatQty) slot.quantity = qty - eatQty;
        else s.consumables.quick_meat = null;
        didWrite = true;
      }
    }

    const hpMax = Math.max(1, num(s.heroHPMax, 100));
    const hpNow = clamp(num(s.heroHP, 0), 0, hpMax);
    if (hpNow / hpMax < 0.25) {
      const slot = s.consumables?.quick_cooked_fish;
      const qty = num(slot?.quantity ?? slot?.qty, 0);
      const per = num(slot?.healHp, 0);
      if (slot && qty > 0 && per > 0) {
        const eatQty = Math.min(10, qty);
        s.heroHP = clamp(hpNow + per * eatQty, 0, hpMax);
        if (qty > eatQty) slot.quantity = qty - eatQty;
        else s.consumables.quick_cooked_fish = null;
        didWrite = true;
      }
    }

    if (didWrite) setSave(s);
  }

  // -------------------------
  // Styles
  // -------------------------
  function injectStylesOnce() {
    if (document.getElementById("ds-core-styles")) return;
    const s = document.createElement("style");
    s.id = "ds-core-styles";
    s.textContent = `
      #hudRoot{
        max-width:1100px;
        margin:12px auto 10px;
        padding:0 10px;
        position:relative;
        z-index:260;
        pointer-events:none;
      }
      #hudRoot,
      #mainLayout{
        transition:opacity .28s ease, transform .28s ease, filter .28s ease;
        will-change:opacity, transform, filter;
      }
      body.ds-page-enter-prep #hudRoot,
      body.ds-page-enter-prep #mainLayout{
        opacity:0;
        transform:translateY(10px) scale(.992);
        filter:blur(8px);
      }
      body.ds-page-transitioning{
        pointer-events:none;
      }
      body.ds-page-transitioning #hudRoot,
      body.ds-page-transitioning #mainLayout{
        opacity:0;
        transform:translateY(12px) scale(.992);
        filter:blur(8px);
      }

      #mainLayout{
        max-width:1100px;margin:0 auto;
        display:grid;
        grid-template-columns:minmax(0,1fr) 420px;
        gap:16px;align-items:start;
        padding:0 10px 24px;
      }
      #leftPanel{min-height:200px;min-width:0;}
      #inventoryPanel{min-width:0;}
      #rightColumn{
        min-width:0;
        display:flex;
        flex-direction:column;
        gap:16px;
        align-items:stretch;
        padding-top:14px;
      }
      #rightColumn > *{
        width:100%;
        max-width:none;
        box-sizing:border-box;
        align-self:stretch;
      }
      .dsInnerCard{
        border:1px solid rgba(122, 91, 49, .8);
        background:linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));
        box-shadow:
          0 0 0 1px rgba(32,23,14,.82),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 18px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.16);
      }
      #chatPlaceholderPanel,
      #quickConsumablesPanel,
      #petsPanel,
      .dsHeroPanel{
        background:
          radial-gradient(circle at top, rgba(255,220,150,.06), transparent 28%),
          linear-gradient(180deg, rgba(40,31,22,.94), rgba(17,15,18,.96));
        border:1px solid rgba(138, 102, 52, .95);
        border-radius:14px;
        box-shadow:
          0 0 0 1px rgba(34,24,12,.95),
          0 0 0 3px rgba(106,76,36,.72),
          0 0 0 4px rgba(20,14,10,.96),
          inset 0 1px 0 rgba(255,228,178,.10),
          inset 0 0 0 1px rgba(255,214,143,.07),
          inset 0 -12px 22px rgba(0,0,0,.18),
          0 16px 30px rgba(0,0,0,.24);
      }
      #chatPlaceholderPanel{
        width:100%;
        min-width:0;
        margin-left:0;
        min-height:320px;
        padding:12px;
        box-sizing:border-box;
        margin-top:0;
      }
      #quickConsumablesPanel{
        width:100%;
        min-width:0;
        margin-left:0;
        padding:10px;
        box-sizing:border-box;
        margin-top:10px;
        position:relative;
      }
      #petsPanel{
        width:100%;
        min-width:0;
        margin-left:0;
        padding:10px;
        box-sizing:border-box;
      }
      .petsHeader{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        margin-bottom:8px;
        color:#eef2ff;
        font-size:13px;
        font-weight:800;
      }
      .petsToggleBtn{
        width:26px;
        height:26px;
        border-radius:8px;
        border:1px solid rgba(255,255,255,.12);
        background:#1b2233;
        color:#eef2ff;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:13px;
        font-weight:900;
        line-height:1;
        padding:0;
      }
      .petsGrid{
        display:grid;
        grid-template-columns:repeat(4, minmax(0, 1fr));
        gap:8px;
      }
      .petSlotCard{
        min-height:148px;
        border-radius:12px;
        border:1px solid rgba(122, 91, 49, .8);
        background:linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));
        padding:10px 8px;
        box-sizing:border-box;
        display:flex;
        flex-direction:column;
        gap:8px;
        justify-content:flex-start;
        align-items:center;
        box-shadow:
          0 0 0 1px rgba(32,23,14,.82),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 18px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.16);
      }
      .petSlotCard.petSlotEmpty{
        border-style:dashed;
        border-color:#3a3a4a;
        background:#12121a;
        cursor:pointer;
      }
      .petTop{
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:flex-start;
        gap:8px;
        min-width:0;
        width:100%;
      }
      .petStatusPill{
        width:auto;
        max-width:100%;
        min-height:14px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:999px;
        font-size:7px;
        font-weight:800;
        letter-spacing:.05px;
        text-transform:uppercase;
        padding:0 6px;
        box-sizing:border-box;
        text-align:center;
        display:flex;
        align-items:center;
        justify-content:center;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        line-height:1;
        align-self:center;
      }
      .petStatusPill.petToggleActive{
        background:#1e6b3b;
        border-color:#2d9a56;
        color:#effff4;
      }
      .petStatusPill.petToggleInactive{
        background:#7c2323;
        border-color:#c24444;
        color:#fff0f0;
      }
      .petIcon{
        width:56px;
        height:56px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,.10);
        background:#0e1119;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        flex:0 0 auto;
        font-size:26px;
        color:#eef2ff;
        font-weight:800;
        letter-spacing:.3px;
        cursor:pointer;
      }
      .petIcon img{
        width:100%;
        height:100%;
        object-fit:cover;
      }
      .petMeta{
        display:flex;
        flex-direction:column;
        gap:2px;
        width:100%;
        align-items:center;
        text-align:center;
        flex:1;
      }
      .petName{
        font-size:11px;
        font-weight:800;
        color:#f2f4fb;
        line-height:1.15;
        word-break:normal;
        white-space:nowrap;
        min-height:1.2em;
        display:flex;
        align-items:flex-start;
        justify-content:center;
      }
      .petTier{
        font-size:9px;
        color:#b4bad1;
        letter-spacing:.3px;
        margin-top:auto;
      }
      .petLevelRow{
        display:none;
      }
      .petXpWrap{
        position:relative;
        width:100%;
        height:18px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background:#0f0f16;
        overflow:hidden;
      }
      .petXpFill{
        height:100%;
        border-radius:999px;
        background:#4aa3ff;
      }
      .petXpText{
        position:absolute;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:4px;
        padding:0 6px;
        font-size:8px;
        color:#f3f5fb;
        font-weight:800;
        text-shadow:0 1px 2px rgba(0,0,0,.75);
        pointer-events:none;
        white-space:nowrap;
        font-variant-numeric:tabular-nums;
      }
      .petEmptyLabel{
        font-size:11px;
        font-weight:800;
        color:#d7dcef;
        text-align:center;
      }
      .petEmptyHint{
        font-size:9px;
        color:#9097ab;
        text-align:center;
      }
      .petXpLvl,
      .petXpValue{
        white-space:nowrap;
      }
      .petXpValue{
        font-size:7px;
        letter-spacing:-.1px;
      }
      .quickConsGrid{
        display:grid;
        grid-template-columns:repeat(6, minmax(0, 1fr));
        gap:8px;
        justify-items:center;
      }
      .quickMeatPopup{
        margin-top:10px;
        border:1px solid rgba(122, 91, 49, .8);
        border-radius:10px;
        background:linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));
        padding:10px;
        display:none;
        box-shadow:
          0 0 0 1px rgba(32,23,14,.82),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 18px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.16);
      }
      .quickMeatRow{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        padding:6px 0;
        border-bottom:1px solid rgba(255,255,255,.06);
        font-size:12px;
      }
      .quickMeatRow:last-child{border-bottom:0;}
      .quickMeatRow button{height:24px;padding:0 8px;}
      .quickMeatEmpty{font-size:12px;opacity:.8;text-align:center;}
      .quickMeatMsg{font-size:12px;margin-top:6px;opacity:.9;text-align:center;}
      .chatPanelInner{
        width:100%;
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .chatTabs{
        display:grid;
        grid-template-columns:repeat(4, minmax(0, 1fr));
        gap:4px;
      }
      .chatTab{
        padding:4px 3px;
        border-radius:7px;
        border:2px solid #333;
        background:#1b1b24;
        color:#e9edf7;
        cursor:pointer;
        font-size:10px;
        font-weight:800;
        text-transform:capitalize;
      }
      .chatTab.chatTabActive{
        background:#2b4f8f;
        border-color:#4f7fd1;
        color:#eef4ff;
      }
      .chatMessages{
          min-height:220px;
          max-height:220px;
          overflow-y:auto;
          padding:6px 8px;
          border-radius:10px;
          border:1px solid rgba(122, 91, 49, .8);
          background:linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));
          display:flex;
          flex-direction:column;
          gap:2px;
          box-shadow:
            0 0 0 1px rgba(32,23,14,.82),
            inset 0 1px 0 rgba(255,228,178,.06),
            inset 0 0 0 1px rgba(255,214,143,.04),
            inset 0 -10px 18px rgba(0,0,0,.14),
            0 10px 18px rgba(0,0,0,.16);
        }
        .chatMsg{
          padding:2px 0;
          border-radius:0;
          background:transparent;
          border:0;
        }
        .chatMsgHead{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          font-size:11px;
        }
      .chatMsgAuthor{font-weight:800;color:#f3e2a2;}
      .chatMsgTime{opacity:.62;white-space:nowrap;}
      .chatMsgText{
        font-size:12px;
        line-height:1.35;
        color:#eef2ff;
        word-break:break-word;
        min-width:0;
        flex:1;
      }
      .chatEmpty{
        min-height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        color:rgba(255,255,255,.55);
        font-size:12px;
        padding:10px;
      }
      .chatComposer{
          display:grid;
          grid-template-columns:minmax(0,1fr) auto;
          gap:8px;
          align-items:center;
        }
      .chatComposer input{
          width:100%;
          padding:7px 10px;
          border-radius:9px;
          border:2px solid #333;
          background:#0f0f16;
          color:#fff;
          outline:none;
        }
      .chatComposer button{
          min-width:84px;
          padding:5px 14px;
          border-radius:9px;
          border:1px solid var(--btn-premium-primary-border);
          background:var(--btn-premium-primary-bg);
          color:#f4f1e8;
          font-weight:800;
          letter-spacing:.2px;
          text-shadow:0 1px 0 rgba(0,0,0,.75);
          box-shadow:
            0 12px 24px rgba(0,0,0,.28),
            0 0 0 1px rgba(0,0,0,.45),
            0 0 16px var(--btn-premium-primary-glow),
            inset 0 1px 0 rgba(255,255,255,.10),
            inset 0 -1px 0 rgba(0,0,0,.28);
          cursor:pointer;
          transition:
            transform .14s ease,
            border-color .14s ease,
            box-shadow .14s ease,
            filter .14s ease;
        }
        .chatComposer button:hover{
          transform:translateY(-1px);
          border-color:#dfb15a;
          box-shadow:
            0 14px 28px rgba(0,0,0,.32),
            0 0 0 1px rgba(0,0,0,.5),
            0 0 22px rgba(228, 181, 77, .24),
            inset 0 1px 0 rgba(255,255,255,.14),
            inset 0 -1px 0 rgba(0,0,0,.26);
          filter:brightness(1.03);
        }
        .chatComposer button:active{
          transform:translateY(1px);
          box-shadow:
            0 8px 18px rgba(0,0,0,.24),
            0 0 0 1px rgba(0,0,0,.45),
            inset 0 2px 3px rgba(0,0,0,.24),
            inset 0 1px 0 rgba(255,255,255,.05);
        }

      .dsHeaderRow{
        display:flex;
        flex-direction:column;
        gap:10px;
        align-items:stretch;
        pointer-events:none;
      }

      .dsHeaderTop{
        display:flex;
        gap:12px;
        align-items:flex-start;
        justify-content:flex-start;
        flex-wrap:wrap;
      }
      .dsHomeNavRow{
        display:block;
        width:100%;
        margin-left:0;
        pointer-events:auto;
        position:relative;
        z-index:200;
      }
      .dsHeaderControls{
        margin-left:auto;
        display:flex;
        flex-direction:column;
        align-items:flex-end;
        gap:2px;
        flex:0 0 auto;
        pointer-events:auto;
      }
      .dsHeaderAccount{
        position:relative;
        flex:0 0 auto;
        z-index:280;
        pointer-events:auto;
      }
      .dsHeaderPresence{
        position:relative;
        flex:0 0 auto;
        z-index:280;
        pointer-events:auto;
      }
      .dsAccountBtn{
        min-height:42px;
        min-width:170px;
        padding:9px 10px;
        border-radius:11px;
        border:1px solid rgba(126, 94, 50, .88);
        background:
          linear-gradient(180deg, rgba(86,64,38,.40), rgba(26,23,26,.18) 42%, rgba(0,0,0,.10) 100%),
          linear-gradient(180deg, #34281d 0%, #1d1a1d 100%);
        color:#f3ead6;
        font-size:13px;
        font-weight:800;
        letter-spacing:0;
        cursor:pointer;
        box-shadow:
          0 0 0 1px rgba(28,20,12,.9),
          inset 0 1px 0 rgba(255,228,178,.08),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -8px 14px rgba(0,0,0,.16),
          0 8px 16px rgba(0,0,0,.18);
        pointer-events:auto;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        text-shadow:0 1px 0 rgba(0,0,0,.72);
        transition:
          transform .14s ease,
          box-shadow .14s ease,
          border-color .14s ease,
          filter .14s ease;
      }
      .dsAccountBtn:hover{
        filter:brightness(1.04);
        border-color:rgba(171, 130, 67, .96);
        box-shadow:
          0 0 0 1px rgba(28,20,12,.92),
          inset 0 1px 0 rgba(255,236,194,.12),
          inset 0 0 0 1px rgba(255,214,143,.06),
          inset 0 -8px 14px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.22);
        transform:translateY(-1px);
      }
      .dsAccountBtnFrame{
        width:170px;
        height:50px;
        min-height:0;
        padding:0;
        border:0;
        background:transparent;
        box-shadow:none;
        filter:none;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        overflow:visible;
      }
      .dsAccountBtnFrame:hover{
        filter:none;
      }
      .dsAccountBtnFrameArt{
        width:100%;
        height:100%;
        display:block;
        position:relative;
        background-image:url("images/ui/nav_button_frame.png");
        background-repeat:no-repeat;
        background-position:center;
        background-size:100% 100%;
        filter:drop-shadow(0 8px 18px rgba(0,0,0,.30));
        transition:transform .14s ease, filter .14s ease;
      }
      .dsAccountBtnFrame:hover .dsAccountBtnFrameArt{
        transform:translateY(-1px) scale(1.02);
        filter:drop-shadow(0 12px 22px rgba(0,0,0,.38));
      }
      .dsAccountBtnFrameLabel{
        position:absolute;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#ead39b;
        font-family:Georgia, "Times New Roman", serif;
        font-size:12px;
        font-weight:900;
        letter-spacing:.8px;
        text-transform:uppercase;
        text-shadow:
          0 1px 0 rgba(87, 58, 16, .95),
          0 0 10px rgba(0,0,0,.34),
          0 2px 8px rgba(0,0,0,.72);
        transform:translateY(-2px);
        pointer-events:none;
      }
      .dsAccountMenu{
        position:absolute;
        top:calc(100% + 8px);
        right:0;
        width:min(320px, 78vw);
        padding:12px;
        border-radius:14px;
        border:1px solid rgba(122, 91, 49, .8);
        background:linear-gradient(180deg, rgba(52,39,27,.9), rgba(20,18,20,.94));
        box-shadow:
          0 0 0 1px rgba(32,23,14,.82),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 18px rgba(0,0,0,.14),
          0 18px 42px rgba(0,0,0,.36);
        display:none;
        z-index:320;
        pointer-events:auto;
      }
      .dsAccountMenu.dsAccountMenuOpen{
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .dsAccountLabel{
        font-size:11px;
        opacity:.68;
        font-weight:800;
        letter-spacing:.3px;
      }
      .dsAccountEmail{
        font-size:13px;
        font-weight:800;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .dsAccountLogout{
        min-height:38px;
        padding:8px 12px;
        border-radius:10px;
        border:1px solid #6f3d48;
        background:linear-gradient(180deg,#4d2129,#2e1217);
        color:#ffe7ea;
        font-weight:800;
        cursor:pointer;
      }

      .dsHeroPanel{
        flex:0 0 auto;
        width:340px;
        max-width:340px;
        display:flex;gap:8px;align-items:flex-start;
        padding:10px;box-sizing:border-box;
        pointer-events:auto;
      }

      .dsHeroPortrait{cursor:pointer;flex:0 0 auto;text-decoration:none;display:inline-flex;}
      .dsHeroPortrait img{width:72px;height:72px;border-radius:12px;border:2px solid #333;object-fit:cover;display:block;}
      .dsHeroActions{display:flex;flex-direction:column;gap:6px;flex:0 0 auto;}
      .dsStatBtn{
        width:34px;height:34px;padding:0;border-radius:999px;border:2px solid #2d7a3d;
        background:#16361f;color:#8dff9b;cursor:pointer;font-size:22px;
        line-height:1;display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 0 1px rgba(0,0,0,.35) inset;
      }
      .dsStatSide{
        flex:0 0 auto;
        display:flex;
        align-items:center;
        box-sizing:border-box;
        pointer-events:auto;
      }
      .dsHeroStats{flex:1;min-width:0;}
      .dsLine{margin:0 0 6px 0;opacity:.92;font-size:13px}
      .dsHeroMetaText{
        color:#ead39b;
        text-shadow:
          0 1px 0 rgba(87, 58, 16, .95),
          0 0 10px rgba(0,0,0,.34),
          0 2px 8px rgba(0,0,0,.72);
      }

      .dsBarStack{display:flex;flex-direction:column;gap:6px;margin-top:6px;}
      .dsBarWrap{
        position:relative;
        background:#0f0f16;border:1px solid #2a2a3a;border-radius:999px;
        overflow:hidden;height:14px;
      }
      .dsBarFill{height:100%;width:0%;}
      .dsBarTextIn{
        position:absolute; inset:0;
        display:flex; align-items:center; justify-content:center;
        font-size:11px; font-weight:800;
        color:#ead39b;
        text-shadow:
          0 1px 0 rgba(87, 58, 16, .95),
          0 0 10px rgba(0,0,0,.34),
          0 2px 8px rgba(0,0,0,.72);
        pointer-events:none;
        opacity:.95;
        padding-right:42px;
      }
      .dsBarTimer{
        position:absolute; right:6px; top:50%;
        transform:translateY(-50%);
        font-size:10px; font-weight:800;
        color:#ead39b;
        text-shadow:
          0 1px 0 rgba(87, 58, 16, .95),
          0 0 10px rgba(0,0,0,.34),
          0 2px 8px rgba(0,0,0,.72);
        pointer-events:none;
        opacity:.85;
        letter-spacing:.2px;
      }

      .dsNav{
        width:100%;
        margin:0;
        display:grid;
        grid-template-columns:repeat(8, minmax(0, 1fr));
        gap:8px;
        align-items:stretch;
        background:
          radial-gradient(circle at top, rgba(255,220,150,.06), transparent 28%),
          linear-gradient(180deg, rgba(40,31,22,.94), rgba(17,15,18,.96));
        border:1px solid rgba(138, 102, 52, .95);
        border-radius:14px;
        padding:10px 12px;box-sizing:border-box;
        pointer-events:auto;
        overflow:hidden;
        position:relative;
        z-index:200;
        box-shadow:
          0 0 0 1px rgba(34,24,12,.95),
          0 0 0 3px rgba(106,76,36,.72),
          0 0 0 4px rgba(20,14,10,.96),
          inset 0 1px 0 rgba(255,228,178,.10),
          inset 0 0 0 1px rgba(255,214,143,.07),
          inset 0 -12px 22px rgba(0,0,0,.18),
          0 16px 30px rgba(0,0,0,.24);
      }
      body.ds-home-page .dsNav{
        width:100%;
        margin:0;
        grid-template-columns:repeat(8, minmax(0, 1fr));
        gap:8px;
        padding:10px 12px;
      }
      .dsNav button{
        width:100%;
        padding:9px 10px;
        position:relative;
        z-index:201;
        border-radius:11px;
        border:1px solid rgba(126, 94, 50, .88);
        background:
          linear-gradient(180deg, rgba(86,64,38,.40), rgba(26,23,26,.18) 42%, rgba(0,0,0,.10) 100%),
          linear-gradient(180deg, #34281d 0%, #1d1a1d 100%);
        color:#f3ead6;
        cursor:pointer;
        font-size:13px;
        display:flex;align-items:center;justify-content:center;gap:8px;
        box-shadow:
          0 0 0 1px rgba(28,20,12,.9),
          inset 0 1px 0 rgba(255,228,178,.08),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -8px 14px rgba(0,0,0,.16),
          0 8px 16px rgba(0,0,0,.18);
        text-shadow:0 1px 0 rgba(0,0,0,.72);
        transition:
          transform .14s ease,
          box-shadow .14s ease,
          border-color .14s ease,
          filter .14s ease;
      }
      .dsNavIconImg{
        width:24px;
        height:24px;
        display:block;
        object-fit:contain;
        flex:0 0 24px;
        padding:2px;
        border-radius:7px;
        background:
          linear-gradient(180deg, rgba(86,64,38,.20), rgba(20,18,20,.10) 46%, rgba(0,0,0,.06) 100%),
          linear-gradient(180deg, rgba(48,36,25,.78) 0%, rgba(24,21,22,.88) 100%);
        box-shadow:
          0 0 0 1px rgba(28,20,12,.72),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 -6px 10px rgba(0,0,0,.12);
        filter:drop-shadow(0 3px 6px rgba(0,0,0,.18));
      }
      .dsNav button.dsNavImageBtn{
        padding:0;
        border:0;
        background:transparent;
      }
      .dsNav button:hover{
        filter:brightness(1.04);
        border-color:rgba(171, 130, 67, .96);
        box-shadow:
          0 0 0 1px rgba(28,20,12,.92),
          inset 0 1px 0 rgba(255,236,194,.12),
          inset 0 0 0 1px rgba(255,214,143,.06),
          inset 0 -8px 14px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.22);
        transform:translateY(-1px);
      }
      .dsNav button.dsNavImageBtn:hover{filter:none;}
      .dsNav button:active{
        transform:translateY(1px);
        box-shadow:
          0 0 0 1px rgba(28,20,12,.92),
          inset 0 2px 3px rgba(0,0,0,.24),
          inset 0 1px 0 rgba(255,228,178,.04),
          0 5px 10px rgba(0,0,0,.16);
      }

      .dsNavImageArt{
        width:min(100%, 168px);
        aspect-ratio: 3 / 1;
        display:block;
        position:relative;
        transition:transform .14s ease, filter .14s ease;
      }
      body.ds-home-page .dsNavImageArt{
        width:100%;
        aspect-ratio: 3.35 / 1;
      }
      .dsNavImageArt::before{
        content:"";
        position:absolute;
        inset:0;
        background-repeat:no-repeat;
        background-position:center;
        background-size:auto 208%;
        filter:drop-shadow(0 8px 18px rgba(0,0,0,.34));
        transform:scaleY(1.40);
        transform-origin:center;
        transition:transform .14s ease, filter .14s ease;
      }
      .dsNav button.dsNavImageBtn:hover .dsNavImageArt{
        transform:translateY(-1px) scale(1.02);
      }
      .dsNav button.dsNavImageBtn:hover .dsNavImageArt::before{
        filter:drop-shadow(0 12px 24px rgba(0,0,0,.42));
        transform:scaleY(1.44);
      }
      .dsNavImageArtHome::before{
        background-image:url("images/ui/nav_button_frame.png");
      }
      .dsNavImageArtFight::before{
        background-image:url("images/ui/nav_button_frame.png");
      }
      .dsNavImageArtDungeons::before{
        background-image:url("images/ui/nav_button_frame.png");
      }
      .dsNavImageArtBuildings::before{
        background-image:url("images/ui/nav_button_frame.png");
      }
      .dsNavImageArtChallenges::before{
        background-image:url("images/ui/nav_button_frame.png");
      }
      .dsNavImageArtProfessions::before{
        background-image:url("images/ui/nav_button_frame.png");
      }
      .dsNavImageArtMarket::before{
        background-image:url("images/ui/nav_button_frame.png");
      }
      .dsNavImageArtBank::before{
        background-image:url("images/ui/nav_button_frame.png");
      }
      .dsNavImageLabel{
        position:absolute;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:0 18px;
        color:#ead39b;
        font-family:Georgia, "Times New Roman", serif;
        font-size:14px;
        font-weight:900;
        letter-spacing:1.2px;
        text-transform:uppercase;
        transform:translateY(-6px);
        text-shadow:
          0 1px 0 rgba(87, 58, 16, .95),
          0 0 10px rgba(0,0,0,.34),
          0 2px 8px rgba(0,0,0,.72);
        pointer-events:none;
      }
      .dsNavImageLabelHome{
        transform:translateY(-6px);
      }
      .dsNavImageLabelFight{
        transform:translateY(-6px);
        font-size:13px;
        letter-spacing:1px;
      }
      .dsNavImageLabelDungeons{
        transform:translateY(-6px);
        font-size:12px;
        letter-spacing:.8px;
      }
      .dsNavImageLabelBuildings{
        transform:translateY(-6px);
        font-size:12px;
        letter-spacing:.7px;
      }
      .dsNavImageLabelChallenges{
        transform:translateY(-6px);
        font-size:11px;
        letter-spacing:.55px;
      }
      .dsNavImageLabelProfessions{
        transform:translateY(-6px);
        font-size:11px;
        letter-spacing:.45px;
      }
      .dsNavImageLabelMarket{
        transform:translateY(-6px);
        font-size:12px;
        letter-spacing:.8px;
      }
      .dsNavImageLabelBank{
        transform:translateY(-6px);
        font-size:12px;
        letter-spacing:1px;
      }
      body.ds-home-page .dsNavImageLabel{
        padding:0 10px;
        font-size:11px;
        letter-spacing:.6px;
        transform:translateY(-5px);
      }
      body.ds-home-page .dsNavImageLabelFight,
      body.ds-home-page .dsNavImageLabelHome,
      body.ds-home-page .dsNavImageLabelMarket,
      body.ds-home-page .dsNavImageLabelBank{
        font-size:11px;
      }
      body.ds-home-page .dsNavImageLabelDungeons,
      body.ds-home-page .dsNavImageLabelBuildings{
        font-size:10px;
        letter-spacing:.45px;
      }
      body.ds-home-page .dsNavImageLabelChallenges,
      body.ds-home-page .dsNavImageLabelProfessions{
        font-size:9px;
        letter-spacing:.3px;
      }

      .navIcon{width:14px;height:14px;display:block;flex:0 0 auto;}
      .navEmoji{font-size:15px;line-height:1;display:block;flex:0 0 auto;}

      #inventoryPanel{
        width:100%;
        background:
          radial-gradient(circle at top, rgba(255,220,150,.06), transparent 28%),
          linear-gradient(180deg, rgba(40,31,22,.94), rgba(17,15,18,.96));
        border:1px solid rgba(138, 102, 52, .95);
        border-radius:14px;
        padding:8px 12px 6px;box-sizing:border-box;
        position:relative;
        margin-top:0;
        z-index:45;
        overflow:hidden;
        box-shadow:
          0 0 0 1px rgba(34,24,12,.95),
          0 0 0 3px rgba(106,76,36,.72),
          0 0 0 4px rgba(20,14,10,.96),
          inset 0 1px 0 rgba(255,228,178,.10),
          inset 0 0 0 1px rgba(255,214,143,.07),
          inset 0 -12px 22px rgba(0,0,0,.18),
          0 16px 30px rgba(0,0,0,.24);
      }
      #inventoryStickySlot{
        display:none;
      }
      #inventoryFloatingHost{
        position:fixed;
        top:0;
        left:0;
        width:0;
        z-index:20;
      }
      .invHeader{display:flex;align-items:center;justify-content:flex-start;margin-bottom:5px;gap:10px;}
      #invTitleText{
        color:#ead39b;
        text-shadow:
          0 1px 0 rgba(87, 58, 16, .95),
          0 0 10px rgba(0,0,0,.34),
          0 2px 8px rgba(0,0,0,.72);
      }
      .invTabs{display:flex;gap:8px;align-items:center;}
      .invTab{
        min-width:96px;height:26px;padding:0 12px;border-radius:8px;border:2px solid #333;
        background:#1b1b24;color:#eee;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:800;
      }
      .invTab.invTabActive{
        background:#2b4f8f;border-color:#4f7fd1;color:#eef4ff;
      }
      .invEquipPanel{
        width:100%;
        display:flex;
        flex-direction:column;
        gap:12px;
      }
      .invEquipPaperdoll{
        position:relative;
        width:100%;
        height:286px;
        border:1px solid rgba(122, 91, 49, .8);
        border-radius:12px;
        overflow:hidden;
        background:
          radial-gradient(circle at center, rgba(255,220,150,.05), transparent 45%),
          linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));
        box-shadow:
          0 0 0 1px rgba(32,23,14,.82),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 18px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.16);
      }
      .invEquipFigure{
        position:absolute;
        inset:0;
        pointer-events:none;
      }
      .invEquipFigure::before{
        content:"";
        position:absolute;
        left:50%;
        top:26px;
        width:44px;
        height:44px;
        transform:translateX(-50%);
        border-radius:50%;
        background:rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.08);
      }
      .invEquipFigure::after{
        content:"";
        position:absolute;
        left:50%;
        top:84px;
        width:82px;
        height:132px;
        transform:translateX(-50%);
        border-radius:28px 28px 18px 18px;
        background:rgba(255,255,255,.03);
        border:1px solid rgba(255,255,255,.06);
        box-shadow:
          -60px 12px 0 -20px rgba(255,255,255,.03),
          60px 12px 0 -20px rgba(255,255,255,.03),
          -30px 142px 0 -18px rgba(255,255,255,.03),
          30px 142px 0 -18px rgba(255,255,255,.03);
      }
      .invEquipModeTabs{
        display:flex;
        gap:8px;
        justify-content:center;
      }
      .invEquipModeBtn{
        width:112px;
        flex:0 0 112px;
        height:28px;
        border-radius:8px;
        border:1px solid #333;
        background:#151520;
        color:#eee;
        font-size:11px;
        font-weight:800;
        cursor:pointer;
      }
      .invEquipModeBtn.invEquipModeActive{
        background:#2b4f8f;
        border-color:#4f7fd1;
        color:#eef4ff;
      }
      .invConsumables{
        display:flex;
        gap:8px;
        justify-content:center;
        flex-wrap:wrap;
      }
      .invConsWrap{
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:4px;
      }
      .invConsSlot{
        width:52px;
        height:52px;
        border-radius:10px;
        border:1px dashed #3a3a4a;
        background:#12121a;
        color:#8a8fa3;
        font-size:9px;
        text-transform:uppercase;
        letter-spacing:.4px;
        position:relative;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:4px;
      }
      button.invConsSlot{
        appearance:none;
        border:1px dashed #3a3a4a;
        background:#12121a;
        color:#8a8fa3;
        padding:4px;
      }
      .invConsActions{
        min-width:52px;
        height:16px;
        padding:0 4px;
        border-radius:6px;
        border:1px solid #2d2f3f;
        background:#101018;
        color:#a3a7b8;
        font-size:9px;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
      }
      .invConsPotion{
        border-style:solid;
        border-color:#3b4a6b;
        color:#a8b7d8;
        background:#141a26;
      }
      .invConsSlot img{
        width:100%;
        height:100%;
        object-fit:cover;
        border-radius:8px;
      }
      .invConsQty{
        position:absolute;
        right:4px;
        bottom:4px;
        background:rgba(0,0,0,.65);
        border:1px solid rgba(255,255,255,.2);
        color:#fff;
        font-size:10px;
        font-weight:800;
        padding:1px 4px;
        border-radius:6px;
        pointer-events:none;
      }
      .invEquipSlots{
        position:absolute;
        inset:0;
      }
      .invEquipSlot{
        position:absolute;
        width:48px;
        min-height:48px;
        border:1px solid rgba(255,255,255,.08);
        border-radius:10px;
        background:#11111a;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:4px;
        padding:6px 4px;
        box-sizing:border-box;
      }
      .invEquipSlot[data-slot="helmet"]{left:50%;top:12px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="chest"]{left:50%;top:74px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="belt"]{left:50%;top:124px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="pants"]{left:50%;top:174px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="bracers"]{left:24%;top:74px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="mainHand"]{left:24%;top:124px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="gloves"]{left:24%;top:174px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="ring"]{left:24%;top:224px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="shoulders"]{left:76%;top:74px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="offHand"]{left:76%;top:124px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="boots"]{left:76%;top:174px;transform:translateX(-50%);}
      .invEquipSlot[data-slot="amulet"]{left:76%;top:224px;transform:translateX(-50%);}
      .invEquipSlot.dsRarity-common{background:var(--rarity-common);}
      .invEquipSlot.dsRarity-uncommon{background:var(--rarity-uncommon);}
      .invEquipSlot.dsRarity-rare{background:var(--rarity-rare);}
      .invEquipSlot.dsRarity-epic{background:var(--rarity-epic);}
      .invEquipSlot.dsRarity-legendary{background:var(--rarity-legendary);}
      .invEquipSlot.dsRarity-mythic{background:var(--rarity-mythic);}
      .invEquipSlot.dsSetItem{background:var(--rarity-set);}
      .invEquipSlot.dsCraftedItem{background:var(--rarity-crafted);}
      .invEquipSlot img{
        width:28px;
        height:28px;
        object-fit:cover;
        border-radius:8px;
        display:block;
      }
      .invEquipEmpty{
        width:28px;
        height:28px;
        border-radius:8px;
        border:1px dashed rgba(255,255,255,.12);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:9px;
        opacity:.5;
      }
      .invEquipLabel{
        font-size:8px;
        line-height:1.1;
        text-align:center;
        opacity:.85;
      }
      .invEquipSlot[data-slot="ring"] .invEquipLabel,
      .invEquipSlot[data-slot="amulet"] .invEquipLabel{
        font-size:7px;
      }
      .invEquipStats{
        display:grid;
        grid-template-columns:repeat(2, minmax(0, 1fr));
        gap:8px;
        margin-top:6px;
      }
      .invEquipStat{
        border:1px solid rgba(122, 91, 49, .8);
        border-radius:10px;
        background:linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));
        padding:8px 10px;
        box-shadow:
          0 0 0 1px rgba(32,23,14,.82),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 18px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.16);
      }
      .invEquipStatLabel{
        font-size:11px;
        opacity:.76;
      }
      .invEquipStatValue{
        margin-top:4px;
        font-size:16px;
        font-weight:800;
      }
      .invFooter{display:flex;justify-content:flex-end;margin-top:10px;}
      .invMeta{display:flex;align-items:center;gap:8px;}
      .invMetaFooter{
        padding:6px 10px;
        border-radius:10px;
        border:1px solid rgba(122, 91, 49, .8);
        background:linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));
        box-shadow:
          0 0 0 1px rgba(32,23,14,.82),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 18px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.16);
      }
      .invMetaItem{
        display:flex;
        align-items:center;
        gap:6px;
        font-size:12px;
        font-weight:700;
        opacity:.95;
      }
      .invMetaEmoji{
        font-size:15px;
        line-height:1;
        display:block;
      }
      .invGold{opacity:.92;white-space:nowrap;}
      .invBodyFrame{
        width:100%;
        display:flex;
        justify-content:center;
        padding:10px 10px 8px;
        border-radius:14px;
        border:1px solid rgba(122, 91, 49, .8);
        background:linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));
        box-shadow:
          0 0 0 1px rgba(32,23,14,.82),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 18px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.16);
      }
      #questPanel{
        background:transparent;border:0;border-radius:0;
        padding:0;
        width:100%;
        flex:1 1 auto;
      }
      .questCard{
        border:1px solid rgba(122, 91, 49, .8);
        border-radius:10px;padding:12px;margin:0;width:100%;box-sizing:border-box;
        background:linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));
        box-shadow:
          0 0 0 1px rgba(32,23,14,.82),
          inset 0 1px 0 rgba(255,228,178,.06),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 18px rgba(0,0,0,.14),
          0 10px 18px rgba(0,0,0,.16);
      }
      .questCard.questClickable{cursor:pointer;}
      .questCard.questClickable:hover{filter:brightness(1.08);}

      :root{
        --rarity-common:#0b0b0b;
        --rarity-uncommon:#0f141b;
        --rarity-rare:#0f1b2e;
        --rarity-epic:#1a0f2e;
        --rarity-legendary:#2b1a0b;
        --rarity-mythic:#0b2a2e;
        --rarity-set:#2a0a0d;
        --rarity-crafted:#14361d;
      }


      /* ✅ 8 columns, no horizontal scroll */
      #inventoryGrid{
        display:grid;
        grid-template-columns:repeat(8,40px);
        gap:4px;
        justify-content:center;
        padding:4px;
        width:max-content;
        max-width:100%;
        box-sizing:border-box;
      }

      .dsSlot{
        width:40px;height:40px;border:1px solid #2a2a3a;border-radius:6px;
        background:var(--rarity-common);position:relative;overflow:hidden;cursor:pointer;
        box-sizing:border-box;
      }
      .dsSlot.dsRarity-common{background:var(--rarity-common);}
      .dsSlot.dsRarity-uncommon{background:var(--rarity-uncommon);}
      .dsSlot.dsRarity-rare{background:var(--rarity-rare);}
      .dsSlot.dsRarity-epic{background:var(--rarity-epic);}
      .dsSlot.dsRarity-legendary{background:var(--rarity-legendary);}
      .dsSlot.dsRarity-mythic{background:var(--rarity-mythic);}
      .dsSlot.dsSetItem{background:var(--rarity-set);}
      .dsSlot.dsCraftedItem{background:var(--rarity-crafted);}
      .dsSlot.dragOver{outline:2px solid #888;}
      .dsSlot img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}

      .dsQty{position:absolute;right:3px;bottom:2px;font-size:11px;background:rgba(0,0,0,.65);padding:1px 4px;border-radius:6px;pointer-events:none;}

      .dsUpg{
        position:absolute;
        left:3px;
        top:3px;
        font-size:8px;
        font-weight:900;
        background:rgba(0,0,0,.55);
        border:1px solid rgba(255,255,255,.10);
        padding:1px 3px;
        border-radius:7px;
        line-height:1;
        opacity:.92;
        pointer-events:none;
      }

      #dsInspector{
        background:#151520;border:2px solid #333;border-radius:12px;padding:12px;
        max-width:900px;margin:12px auto 0;box-sizing:border-box;
      }
      .dsBtnRow{margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;}
      .dsBtnRow button{padding:10px 12px;border-radius:10px;border:2px solid #333;background:#1b1b24;color:#fff;cursor:pointer;}
      .dsBtnRow button:disabled{opacity:.5;cursor:not-allowed;}
      .dsSellRow{margin-top:10px;display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;}
      .dsSellRow .dsSellInfo{
        padding:8px 12px;border-radius:10px;border:2px solid #333;
        background:#1b1b24;color:#fff;font-weight:800;white-space:nowrap;
      }
      .dsSellRow input{
        width:90px;padding:8px 10px;border-radius:10px;border:2px solid #333;
        background:#0f0f16;color:#fff;outline:none;
      }
      .dsSellRow .dsSellMeta{opacity:.85;font-size:12px;}

      @media (max-width: 980px){
        #mainLayout{
          grid-template-columns:minmax(0,1fr);
          gap:14px;
        }
        #rightColumn{
          width:100%;
        }
        #inventoryPanel{
          margin-top:0;
        }
        .dsHeroPanel,
        .dsNav{
          width:100%;
          max-width:none;
        }
        .dsNav{
          margin:0;
          grid-template-columns:repeat(2, minmax(0, 1fr));
          padding:8px;
        }
        body.ds-home-page .dsNav{
          grid-template-columns:repeat(4, minmax(0, 1fr));
          gap:8px;
          width:100%;
        }
      }

      @media (max-width: 760px){
        #hudRoot{
          margin:8px auto 8px;
          padding:0 8px;
        }
        .dsHeaderTop{
          display:grid;
          grid-template-columns:minmax(0, 1fr) auto;
          align-items:start;
          gap:8px;
        }
        .dsHeroPanel{
          width:auto;
          max-width:none;
          min-width:0;
          padding:8px;
          gap:6px;
        }
        .dsHeroPortrait img{
          width:58px;
          height:58px;
        }
        .dsLine{
          margin:0 0 4px 0;
          font-size:12px;
        }
        .dsBarStack{
          gap:4px;
          margin-top:4px;
        }
        .dsBarWrap{
          height:13px;
        }
        .dsBarTextIn{
          font-size:10px;
          padding-right:36px;
        }
        .dsBarTimer{
          right:5px;
          font-size:9px;
        }
        .dsHeaderAccount{
          margin-left:0;
          grid-column:2;
          grid-row:1;
          align-self:start;
        }
        .dsHeaderPresence{
          grid-column:1 / -1;
          grid-row:3;
          justify-self:start;
        }
        .dsAccountBtn{
          min-height:38px;
          min-width:132px;
          padding:8px 12px;
        }
        .dsAccountBtnFrameArt{
          width:100%;
          height:100%;
        }
        .dsAccountBtnFrameLabel{
          font-size:9px;
          letter-spacing:.6px;
          transform:translateY(-1px);
        }
        .dsAccountBtnFrame{
          width:132px;
          height:40px;
        }
        .dsStatSide{
          grid-column:2;
          grid-row:2;
          justify-self:end;
        }
        #mainLayout{
          padding:0 8px 16px;
          gap:12px;
        }
        #leftPanel,
        #inventoryPanel,
        #chatPlaceholderPanel,
        #quickConsumablesPanel,
        #petsPanel{
          border-radius:10px;
        }
        #inventoryPanel{
          padding:8px 8px 6px;
        }
        #inventoryGrid{
          grid-template-columns:repeat(5, 40px);
          justify-content:center;
        }
        .invHeader{
          flex-wrap:wrap;
          gap:8px;
        }
        .invTabs{
          width:100%;
          justify-content:space-between;
          gap:6px;
        }
        .invTab{
          flex:1 1 0;
          min-width:0;
          padding:0 8px;
        }
        .petsGrid{
          grid-template-columns:repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 480px){
        .dsHeroPortrait img{
          width:52px;
          height:52px;
        }
        .dsLine{
          font-size:11px;
        }
        .dsBarTextIn{
          font-size:9px;
          padding-right:32px;
        }
        .dsAccountBtn{
          min-height:34px;
          padding:7px 10px;
          font-size:12px;
        }
        .dsNav{
          grid-template-columns:repeat(4, minmax(0, 1fr));
          gap:5px;
          padding:5px;
        }
        .dsNav button{
          min-height:36px;
          padding:7px 3px;
          font-size:10px;
          gap:4px;
        }
        .dsNavIconImg{
          width:21px;
          height:21px;
          flex:0 0 21px;
          padding:1px;
          border-radius:6px;
        }
        .dsNav button.dsNavImageBtn{
          padding:0;
        }
        .dsNavImageArt{
          width:min(100%, 110px);
        }
        .dsNavImageArt::before{
          background-size:auto 182%;
          transform:scaleY(1.28);
        }
        .dsNavImageLabel{
          padding:0 10px;
          font-size:9px;
          letter-spacing:.7px;
        }
        .dsNavImageLabelHome{
          transform:translateY(-3px);
        }
        .dsNavImageLabelFight{
          transform:translateY(-3px);
          font-size:8px;
        }
        .dsNavImageLabelDungeons{
          transform:translateY(-3px);
          font-size:7px;
          letter-spacing:.5px;
        }
        .dsNavImageLabelBuildings{
          transform:translateY(-3px);
          font-size:7px;
          letter-spacing:.45px;
        }
        .dsNavImageLabelChallenges{
          transform:translateY(-3px);
          font-size:6px;
          letter-spacing:.3px;
        }
        .dsNavImageLabelProfessions{
          transform:translateY(-3px);
          font-size:6px;
          letter-spacing:.25px;
        }
        .dsNavImageLabelMarket{
          transform:translateY(-3px);
          font-size:7px;
          letter-spacing:.45px;
        }
        .dsNavImageLabelBank{
          transform:translateY(-3px);
          font-size:8px;
          letter-spacing:.55px;
        }
        .navEmoji{
          font-size:11px;
        }
        #inventoryGrid{
          grid-template-columns:repeat(4, 40px);
        }
      }
    `;
    document.head.appendChild(s);
  }

  function formatPageLabel(page) {
    const key = normalizePagePath(page).replace(/\.html$/i, "");
    const labels = {
      index: "Home",
      fight: "Fight",
      dungeons: "Dungeons",
      buildings: "Buildings",
      challenges: "Challenges",
      professions: "Professions",
      market: "Market",
      bank: "Bank",
      stats: "Stats",
      stats_alloc: "Allocate Stats",
      equipment: "Equipment",
      professions_overview: "Overview"
    };
    return labels[key] || key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Traveling";
  }

  // -------------------------
  // Ensure core DOM exists
  // -------------------------
  function ensureCoreDOM() {
  injectStylesOnce();

  let hudRoot = document.getElementById("hudRoot");
  if (!hudRoot) {
    hudRoot = document.createElement("div");
    hudRoot.id = "hudRoot";
    document.body.prepend(hudRoot);
  }

  let main = document.getElementById("mainLayout");
  if (!main) {
    main = document.createElement("div");
    main.id = "mainLayout";
    document.body.appendChild(main);
  }

  let left = document.getElementById("leftPanel");
  if (!left) {
    left = document.createElement("div");
    left.id = "leftPanel";
    main.appendChild(left);
  }

  let right = document.getElementById("rightColumn");
  if (!right) {
    right = document.createElement("div");
    right.id = "rightColumn";
    main.appendChild(right);
  }

  let invPanel = document.getElementById("inventoryPanel");
  if (!invPanel) {
    invPanel = document.createElement("div");
    invPanel.id = "inventoryPanel";
  }
    let chatPanel = document.getElementById("chatPlaceholderPanel");
    if (!chatPanel) {
      chatPanel = document.createElement("div");
      chatPanel.id = "chatPlaceholderPanel";
    }
    const save = ensureSave(loadSave());
    let quickPanel = document.getElementById("quickConsumablesPanel");
    if (!quickPanel) {
      quickPanel = document.createElement("div");
      quickPanel.id = "quickConsumablesPanel";
    }
    let petsPanel = document.getElementById("petsPanel");
    if (!petsPanel) {
      petsPanel = document.createElement("div");
      petsPanel.id = "petsPanel";
    }
    const petsCollapsed = isPetsPanelCollapsed();
    petsPanel.innerHTML = `
        <div class="petsHeader">
          <span>Pets</span>
          <button type="button" class="petsToggleBtn" id="petsToggleBtn" title="${petsCollapsed ? "Show Pets" : "Hide Pets"}">${petsCollapsed ? "▾" : "▴"}</button>
        </div>
        <div class="petsGrid" id="petsGrid" style="display:${petsCollapsed ? "none" : "grid"};">
          ${PET_SLOT_DEFS.map((slot) => {
            const pet = save?.pets?.[slot.key];
            if (!pet) {
              return `
                <div class="petSlotCard petSlotEmpty" title="${slot.label}" data-empty-pet-slot="1">
                  <div class="petTop">
                    <div class="petIcon">${slot.emoji}</div>
                    <div class="petMeta">
                      <div class="petName">${slot.label}</div>
                      <div class="petTier">No Pet</div>
                    </div>
                  </div>
                  <div class="petEmptyHint">Buy from Market</div>
                </div>
              `;
            }
            const level = Math.max(1, Math.round(num(pet.level, 1)));
            const xp = Math.max(0, Math.round(num(pet.xp, 0)));
            const xpNext = Math.max(1, Math.round(num(pet.xpNext, petXpNextForLevel(level))));
            const pct = clamp((xp / xpNext) * 100, 0, 100);
            const icon = pet.img ? `<img src="${pet.img}" alt="${pet.name || slot.label}">` : String(pet.iconText || slot.emoji || "PET");
            const isActive = pet.active !== false;
            return `
              <div class="petSlotCard" title="${pet.name || slot.label}">
                <div class="petStatusPill ${isActive ? "petToggleActive" : "petToggleInactive"}">
                  ${isActive ? "Active" : "Unequipped"}
                </div>
                <div class="petTop">
                  <div class="petIcon" data-pet-inspect="${slot.key}">${icon}</div>
                  <div class="petMeta">
                    <div class="petName">${pet.name || slot.label}</div>
                    <div class="petTier">Level ${level}</div>
                  </div>
                </div>
                <div class="petXpWrap">
                  <div class="petXpFill" style="width:${pct}%"></div>
                  <div class="petXpText">
                    <span class="petXpLvl">XP</span>
                    <span class="petXpValue">${xp}/${xpNext}</span>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
    `;
    petsPanel.querySelector("#petsToggleBtn")?.addEventListener("click", () => {
      const next = !isPetsPanelCollapsed();
      setPetsPanelCollapsed(next);
      const grid = petsPanel.querySelector("#petsGrid");
      const btn = petsPanel.querySelector("#petsToggleBtn");
      if (grid) grid.style.display = next ? "none" : "grid";
      if (btn) {
        btn.textContent = next ? "▾" : "▴";
        btn.title = next ? "Show Pets" : "Hide Pets";
      }
    });
    petsPanel.querySelectorAll("[data-pet-inspect]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const slotKey = String(btn.getAttribute("data-pet-inspect") || "").toLowerCase();
        if (!slotKey) return;
        openPetInspector(slotKey);
      });
    });
    petsPanel.querySelectorAll("[data-empty-pet-slot]").forEach((card) => {
      card.addEventListener("click", () => {
        restoreLeftPanelNodes();
        window.DS?.resume?.();
        window.location.href = "market.html#pets";
      });
    });
    quickPanel.innerHTML = `
        <div class="quickConsGrid">
          ${[
            { key: "quick_potion1", label: "Potion 1", kind: "potion" },
            { key: "quick_potion2", label: "Potion 2", kind: "potion" },
            { key: "quick_meat", label: "Cooked Meat", kind: "meat" },
            { key: "quick_cooked_fish", label: "Cooked Fish", kind: "cooked_fish" }
          ].map((slot) => {
            const it = save?.consumables?.[slot.key];
            const cls = `invConsSlot${slot.kind === "potion" ? " invConsPotion" : ""}`;
            const potionBonus = getPotionBonusText(it);
            const title = it ? `${it.name || slot.label}${potionBonus ? ` — ${potionBonus}` : ""}` : slot.label;
            const qty = num(it?.quantity ?? it?.qty, 1);
            const isPotion = isPotionItem(it);
            const emptyPotionImg = slot.kind === "potion" ? "images/alchemy/tiers/tier_1.png" : "";
            const emptyMeatImg = slot.kind === "meat" ? "images/meat/night_wolf_cooked.png" : "";
            const emptyFishImg = slot.kind === "cooked_fish" ? "images/food/cooked_golden_perch.png" : "";
            const emptySlotImg = emptyPotionImg || emptyMeatImg || emptyFishImg;
            let actionsText = "";
            if (it && isPotion){
              let left = num(it.actionsLeft, 100);
              if (!Number.isFinite(left) || left <= 0) left = 100;
              const totalActions = Math.max(0, Math.floor(left)) + Math.max(0, (qty - 1) * 100);
              actionsText = `Actions: ${totalActions}`;
            }
            const tag = (slot.kind === "meat" || slot.kind === "cooked_fish") ? "button" : "div";
            return `
              <div class="invConsWrap">
                <${tag} class="${cls}" data-quick-slot="${slot.key}" data-quick-kind="${slot.kind}" title="${title}" ${tag === "button" ? "type=\"button\"" : ""}>
                  ${it?.img
                    ? `<img src="${it.img}" alt="${it.name || slot.label}">`
                    : (emptySlotImg
                      ? `<img src="${emptySlotImg}" alt="${slot.label}" style="opacity:.6;filter:grayscale(.45);">`
                      : slot.label)}
                  ${it?.img && qty > 1 ? `<div class="invConsQty">${qty}</div>` : ``}
                </${tag}>
                ${actionsText ? `<div class="invConsActions">${actionsText}</div>` : ``}
              </div>
            `;
          }).join("")}
        </div>
        <div id="quickMeatPopup" class="quickMeatPopup"></div>
    `;
    if (chatPanel.parentElement !== right) {
      right.appendChild(chatPanel);
    }
    if (quickPanel.parentElement !== right) {
      right.insertBefore(quickPanel, chatPanel);
    }
    if (petsPanel.parentElement !== right) {
      right.insertBefore(petsPanel, quickPanel);
    }
    if (invPanel.parentElement !== right) {
      right.insertBefore(invPanel, petsPanel);
    } else if (chatPanel.parentElement === right && invPanel.nextElementSibling !== chatPanel) {
      right.insertBefore(invPanel, petsPanel);
    } else if (petsPanel.parentElement === right && invPanel.nextElementSibling !== petsPanel) {
      right.insertBefore(invPanel, petsPanel);
    } else if (right.firstElementChild !== invPanel) {
      right.prepend(invPanel);
    }
  invPanel.style.position = "";
  invPanel.style.top = "";
  invPanel.style.left = "";
  invPanel.style.right = "";
  invPanel.style.width = "";
    invPanel.style.zIndex = "";

    const meatPopup = quickPanel.querySelector("#quickMeatPopup");
    const renderMeatPopup = () => {
      if (!meatPopup) return;
      const s = ensureSave(loadSave());
      const inv = Array.isArray(s.inventory) ? s.inventory : [];
      const items = inv
        .map((it, idx) => ({ it, idx }))
        .filter((x) => isCookedMeatItem(x.it) && num(x.it.quantity ?? x.it.qty, 1) > 0);
      if (!items.length) {
        meatPopup.innerHTML = `<div class="quickMeatEmpty">You don't have any cooked meat in your bag.</div>`;
        return;
      }
      meatPopup.innerHTML = `
        ${items.map(({ it, idx }) => {
          const qty = num(it.quantity ?? it.qty, 1);
          const per = getCookedMeatStamina(it);
          return `
            <div class="quickMeatRow" data-meat-idx="${idx}">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:800;">${it.name || "Cooked Meat"}</div>
                <div style="opacity:.8;font-size:11px;">Qty: ${qty} • Stamina: +${per}</div>
              </div>
              <input type="number" min="1" max="${qty}" value="1" style="width:56px;">
              <button type="button">Equip</button>
            </div>
          `;
        }).join("")}
        <div class="quickMeatMsg" id="quickMeatMsg"></div>
      `;
      meatPopup.querySelectorAll(".quickMeatRow").forEach((row) => {
        const btn = row.querySelector("button");
        const input = row.querySelector("input");
        const idx = Number(row.dataset.meatIdx);
        btn?.addEventListener("click", () => {
          const s2 = ensureSave(loadSave());
          const invIt = s2.inventory?.[idx];
          if (!invIt || !isCookedMeatItem(invIt)) return;
          const maxQty = num(invIt.quantity ?? invIt.qty, 1);
          let take = Math.floor(Number(input?.value));
          if (!Number.isFinite(take)) take = 1;
          take = clamp(take, 1, maxQty);

          const slot = s2.consumables?.quick_meat;
          if (slot && String(slot.name || "") !== String(invIt.name || "")) {
            const msgEl = meatPopup.querySelector("#quickMeatMsg");
            if (msgEl) msgEl.textContent = "Slot already has different cooked meat.";
            return;
          }
          const picked = consumeFromInventoryIndex(s2, idx, take);
          if (!picked) return;
          picked.quantity = take;
          if (!s2.consumables || typeof s2.consumables !== "object") s2.consumables = {};
          if (s2.consumables.quick_meat) {
            s2.consumables.quick_meat.quantity = num(s2.consumables.quick_meat.quantity ?? s2.consumables.quick_meat.qty, 1) + take;
          } else {
            s2.consumables.quick_meat = picked;
          }
          setSave(s2);
          renderMeatPopup();
        });
      });
    };

    quickPanel.querySelectorAll("[data-quick-slot]").forEach((slotEl) => {
      slotEl.addEventListener("click", () => {
        const slotKey = slotEl.dataset.quickSlot;
        const kind = slotEl.dataset.quickKind || "";
        if (!slotKey) return;
        const s = ensureSave(loadSave());
        const it = s.consumables?.[slotKey];
        if (!it) {
          if (kind === "potion") {
            openQuickPotionPicker(slotKey);
            if (meatPopup) meatPopup.style.display = "none";
            return;
          }
          if (kind === "meat" || kind === "cooked_fish") {
            openQuickConsumablePicker(slotKey);
            if (meatPopup) meatPopup.style.display = "none";
          }
          return;
        }
        if (kind === "potion") {
          openQuickPotionPicker(slotKey);
          if (meatPopup) meatPopup.style.display = "none";
          return;
        }
        if (kind === "meat" || kind === "cooked_fish") {
          openQuickConsumableInspector(slotKey);
          if (meatPopup) meatPopup.style.display = "none";
          return;
        }
      });
    });

  if (!invPanel.querySelector("#inventoryGrid") || !invPanel.querySelector("#invTabInv")) {
    invPanel.innerHTML = `
        <div class="invHeader">
            <div class="invTabs">
              <button id="invTabInv" class="invTab invTabActive" type="button" title="Inventory">Inventory</button>
              <button id="invTabQuest" class="invTab" type="button" title="Challenges">Challenges</button>
              <button id="invTabEquip" class="invTab" type="button" title="Equipment">Equipment</button>
            </div>
        </div>
        <div class="invBodyFrame">
          <div id="inventoryGrid"></div>
          <div id="questPanel" style="display:none;"></div>
          <div id="equipmentPanel" style="display:none;"></div>
        </div>
        <div class="invFooter">
          <div class="invMeta">
            <div class="invMetaItem invMetaFooter invGold">
            <span class="invMetaEmoji" aria-hidden="true">&#128176;</span>
            <span id="goldValue">0</span>
          </div>
          <div class="invMetaItem invMetaFooter">
            <span class="invMetaEmoji" aria-hidden="true">&#128230;</span>
            <span id="invCap"></span>
          </div>
        </div>
      </div>
    `;
  }

  if (!invPanel.querySelector("#invCap")) {
    const cap = document.createElement("span");
    cap.id = "invCap";
    invPanel.querySelector(".invMetaItem")?.appendChild(cap);
  }
  if (!invPanel.querySelector("#questPanel")) {
    const qp = document.createElement("div");
    qp.id = "questPanel";
    qp.style.display = "none";
    invPanel.querySelector(".invBodyFrame")?.appendChild(qp);
  }
  if (!invPanel.querySelector("#equipmentPanel")) {
    const ep = document.createElement("div");
    ep.id = "equipmentPanel";
    ep.style.display = "none";
    invPanel.querySelector(".invBodyFrame")?.appendChild(ep);
  }
}

// -------------------------
// Inventory tabs (Inventory / Quests)
// -------------------------
  let __invTab = "inventory";
  let __equipStatsMode = "fight";
  let __chatTab = "global";
  let __inventoryPanelHeight = 0;

function loadChatTabPreference(){
  try {
    const stored = String(localStorage.getItem(CHAT_TAB_KEY) || "").toLowerCase();
    return CHAT_CHANNELS.includes(stored) ? stored : "global";
  } catch {
    return "global";
  }
}

function saveChatTabPreference(tab){
  try {
    localStorage.setItem(CHAT_TAB_KEY, CHAT_CHANNELS.includes(tab) ? tab : "global");
  } catch {}
}

function loadEquipStatsModePreference(){
  try {
    const stored = String(localStorage.getItem(EQUIP_STATS_MODE_KEY) || "").toLowerCase();
    return stored === "dungeon" ? "dungeon" : "fight";
  } catch {
    return "fight";
  }
}

function saveEquipStatsModePreference(mode){
  try {
    localStorage.setItem(EQUIP_STATS_MODE_KEY, mode === "dungeon" ? "dungeon" : "fight");
  } catch {}
}

function loadInvTabPreference(){
  try {
    const stored = localStorage.getItem(INV_TAB_KEY);
    return ["inventory", "quest", "equipment"].includes(stored) ? stored : "inventory";
  } catch {
    return "inventory";
  }
}

  function saveInvTabPreference(tab){
    try {
      localStorage.setItem(INV_TAB_KEY, ["inventory", "quest", "equipment"].includes(tab) ? tab : "inventory");
    } catch {}
  }

function setInvTab(tab){
  __invTab = ["inventory", "quest", "equipment"].includes(tab) ? tab : "inventory";
  saveInvTabPreference(__invTab);
  const invPanel = document.getElementById("inventoryPanel");
  const invBtn = document.getElementById("invTabInv");
  const questBtn = document.getElementById("invTabQuest");
  const equipBtn = document.getElementById("invTabEquip");
  const grid = document.getElementById("inventoryGrid");
  const quest = document.getElementById("questPanel");
  const equipment = document.getElementById("equipmentPanel");
  const footer = document.querySelector("#inventoryPanel .invFooter");

  invBtn?.classList.toggle("invTabActive", __invTab === "inventory");
  questBtn?.classList.toggle("invTabActive", __invTab === "quest");
  equipBtn?.classList.toggle("invTabActive", __invTab === "equipment");

  if (grid) grid.style.display = (__invTab === "inventory") ? "" : "none";
  if (quest) quest.style.display = (__invTab === "quest") ? "" : "none";
  if (equipment) equipment.style.display = (__invTab === "equipment") ? "" : "none";
  if (footer) {
    footer.style.visibility = (__invTab === "inventory") ? "visible" : "hidden";
    footer.style.pointerEvents = (__invTab === "inventory") ? "" : "none";
  }

  if (!invPanel) return;

  if (__invTab === "inventory") {
    invPanel.style.minHeight = "";
    requestAnimationFrame(() => {
      __inventoryPanelHeight = invPanel.offsetHeight;
    });
    return;
  }

  if (__inventoryPanelHeight > 0) {
    invPanel.style.minHeight = `${__inventoryPanelHeight}px`;
  }
}

function hookInvTabs(){
  __invTab = loadInvTabPreference();
  __equipStatsMode = loadEquipStatsModePreference();
  document.getElementById("invTabInv")?.addEventListener("click", () => setInvTab("inventory"));
  document.getElementById("invTabQuest")?.addEventListener("click", () => setInvTab("quest"));
  document.getElementById("invTabEquip")?.addEventListener("click", () => setInvTab("equipment"));
  setInvTab(__invTab);
}

  function syncRightColumnToNav() {
    return;
  }

function getChatAuthorName(save){
  const rawName = String(save?.heroName || save?.playerName || "").trim();
  if (rawName) return rawName;
  return `Hero Lv ${num(save?.heroLevel, 1)}`;
}

function fmtChatTime(ts){
  const d = new Date(num(ts, Date.now()));
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getChatMessagesForTab(tab){
  if (isLiveChatTab(tab)) return getLiveChatState(tab)?.messages || [];
  const chatState = loadChatState();
  return Array.isArray(chatState[tab]) ? chatState[tab] : [];
}

function getChatDraft(tab){
  return String(__chatDrafts[tab] || "");
}

function setChatDraft(tab, value){
  __chatDrafts[CHAT_CHANNELS.includes(tab) ? tab : "global"] = String(value || "");
}

function getChatInputSelectionSnapshot() {
  const active = document.activeElement;
  if (!active || active.id !== "chatInput") return null;
  return {
    value: String(active.value || ""),
    start: Number(active.selectionStart ?? 0),
    end: Number(active.selectionEnd ?? 0)
  };
}

  function renderChatPanel(save){
    const panel = document.getElementById("chatPlaceholderPanel");
    if (!panel) return;
    const inputSnapshot = getChatInputSelectionSnapshot();
    const previousMessagesEl = panel.querySelector("#chatMessages");
    const previousScroll = previousMessagesEl ? {
      top: previousMessagesEl.scrollTop,
      height: previousMessagesEl.scrollHeight,
      clientHeight: previousMessagesEl.clientHeight
    } : null;
  
    __chatTab = loadChatTabPreference();
    const activeMessages = getChatMessagesForTab(__chatTab);
    const visibleMessages = [...activeMessages].reverse();
    const liveState = getLiveChatState(__chatTab);
    if (isLiveChatTab(__chatTab) && liveState && !liveState.loaded && !liveState.loading) {
      loadLiveChatMessages(__chatTab);
    }
  
    panel.innerHTML = `
      <div class="chatPanelInner">
        <div class="chatTabs">
          ${CHAT_CHANNELS.map((channel) => `
            <button type="button" class="chatTab ${channel === __chatTab ? "chatTabActive" : ""}" data-chat-tab="${channel}">${channel}</button>
          `).join("")}
        </div>
        <div class="chatComposer">
          <input id="chatInput" type="text" maxlength="180" placeholder="Write a message..." value="${escapeHtml(getChatDraft(__chatTab))}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          <button id="chatSendBtn" type="button">Send</button>
        </div>
        <div id="chatMessages" class="chatMessages">
          ${isLiveChatTab(__chatTab) && liveState?.loading && !visibleMessages.length ? `<div class="chatEmpty">Loading ${escapeHtml(__chatTab)} chat...</div>` : ""}
          ${visibleMessages.length ? visibleMessages.map((msg) => `
            <div class="chatMsg">
              <div class="chatMsgHead">
                <div style="display:flex;align-items:center;gap:4px;min-width:0;flex:1;">
                  <span class="chatMsgAuthor">${escapeHtml(msg.author || "Player")}:</span>
                  <span class="chatMsgText">${escapeHtml(String(msg.text || ""))}</span>
                </div>
                <span class="chatMsgTime">${fmtChatTime(msg.ts)}</span>
              </div>
            </div>
          `).join("") : `${!(isLiveChatTab(__chatTab) && liveState?.loading) ? `<div class="chatEmpty">No messages yet in ${escapeHtml(__chatTab)} chat.</div>` : ""}`}
        </div>
      </div>
    `;

  panel.querySelectorAll(".chatTab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextTab = String(btn.dataset.chatTab || "global").toLowerCase();
      __chatTab = CHAT_CHANNELS.includes(nextTab) ? nextTab : "global";
      saveChatTabPreference(__chatTab);
      renderChatPanel(save);
    });
    });
  
    const messagesEl = panel.querySelector("#chatMessages");
    if (messagesEl) {
      const previousDistanceFromTop = previousScroll
        ? Math.max(0, previousScroll.top)
        : 0;
      const wasNearTop = !previousScroll || previousDistanceFromTop <= 48;

      if (wasNearTop) {
        messagesEl.scrollTop = 0;
      } else if (previousScroll) {
        messagesEl.scrollTop = previousScroll.top;
      }
    }

  const input = panel.querySelector("#chatInput");
  const sendBtn = panel.querySelector("#chatSendBtn");
  input?.addEventListener("input", () => {
    setChatDraft(__chatTab, input.value);
  });
  if (input && inputSnapshot && getChatDraft(__chatTab) === inputSnapshot.value) {
    input.focus({ preventScroll: true });
    const start = Math.max(0, Math.min(input.value.length, inputSnapshot.start));
    const end = Math.max(0, Math.min(input.value.length, inputSnapshot.end));
    try {
      input.setSelectionRange(start, end);
    } catch {}
  }
  const sendMessage = async () => {
    const text = String(input?.value || "").trim();
    if (!text) return;
    if (isLiveChatTab(__chatTab)) {
      const result = await sendLiveChatMessage(__chatTab, save, text);
      if (!result.ok) {
        if (input) {
          input.value = text;
          input.title = result.error || "Failed to send message.";
        }
        renderChatPanel(ensureSave(loadSave()));
        return;
      }
      if (input) {
        input.value = "";
        input.title = "";
      }
      setChatDraft(__chatTab, "");
      renderChatPanel(ensureSave(loadSave()));
      return;
    }
    const nextState = loadChatState();
    const channelMessages = Array.isArray(nextState[__chatTab]) ? nextState[__chatTab] : [];
    channelMessages.push({
      author: getChatAuthorName(save),
      text,
      ts: Date.now()
    });
    nextState[__chatTab] = channelMessages.slice(-80);
    setChatState(nextState);
    if (input) input.value = "";
    setChatDraft(__chatTab, "");
    renderChatPanel(ensureSave(loadSave()));
  };

  sendBtn?.addEventListener("click", sendMessage);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });
}

function getChallengeTracking(save){
  const active = save?.challenges?.active;
  if (!active) return null;

  const labels = {
    fightsWon: "Fighting",
    dungeonsCompleted: "Dungeon Complete",
    miningTicks: "Mining",
    woodGatherTicks: "Wood Gather",
    fishingTicks: "Fishing",
    huntingTicks: "Hunting",
    barsCrafted: "Smelt Bars",
    planksCrafted: "Make Planks"
  };
  const units = {
    fightsWon: "fights won",
    dungeonsCompleted: "dungeons completed",
    miningTicks: "mining actions",
    woodGatherTicks: "wood gather actions",
    fishingTicks: "fishing actions",
    huntingTicks: "hunting actions",
    barsCrafted: "bars smelted",
    planksCrafted: "planks crafted"
  };
  const icons = {
    fightsWon: "&#9876;&#65039;",
    dungeonsCompleted: "&#127984;",
    miningTicks: "&#9935;&#65039;",
    woodGatherTicks: "&#129717;",
    fishingTicks: "&#127907;",
    huntingTicks: "&#127993;",
    barsCrafted: "&#9874;&#65039;",
    planksCrafted: "&#129717;"
  };
  const links = {
    fightsWon: "fight.html",
    dungeonsCompleted: "dungeons.html",
    miningTicks: "mining.html",
    woodGatherTicks: "wood_gather.html",
    fishingTicks: "fishing.html",
    huntingTicks: "hunting.html",
    barsCrafted: "forge.html",
    planksCrafted: "wood_sawmill.html"
  };

  const stats = save?.stats?.total || {};
  const currentStat = num(stats[active.optionId], 0);
  const startValue = num(active.startValue, 0);
  const target = num(active.target, 0);
  const progress = Math.max(0, Math.min(target, currentStat - startValue));

  return {
    name: labels[active.optionId] || "Challenge",
    icon: icons[active.optionId] || "&#127919;",
    href: links[active.optionId] || "challenges.html",
    unit: units[active.optionId] || "actions",
    progress,
    target
  };
}

function renderQuestPanel(save){
  const panel = document.getElementById("questPanel");
  if (!panel) return;

  const tracking = getChallengeTracking(save);
  if (!tracking){
    panel.innerHTML = `
      <div class="questCard questClickable" id="challengeQuestCard">
        <div style="font-weight:800;">Challenge</div>
        <div style="opacity:.85;font-size:12px;margin-top:4px;">You do not have an active challenge. Click here to choose one.</div>
      </div>
    `;
    panel.querySelector("#challengeQuestCard")?.addEventListener("click", () => {
      window.location.href = "challenges.html";
    });
    return;
  }

  const isComplete = tracking.progress >= tracking.target;
  panel.innerHTML = `
    <div class="questCard questClickable" id="challengeQuestCard" style="${isComplete ? "border-color:#4d8f62;background:rgba(44,88,56,.22);" : ""}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div style="width:38px;height:38px;flex:0 0 38px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#101019;border:1px solid rgba(255,255,255,.08);font-size:20px;">
          <span aria-hidden="true">${tracking.icon}</span>
        </div>
        <div style="min-width:0;flex:1;">
          <div style="font-weight:800;">Challenge</div>
          <div style="opacity:.92;font-size:13px;margin-top:4px;">${tracking.name}</div>
          <div style="opacity:.85;font-size:12px;margin-top:4px;">Progress: ${new Intl.NumberFormat("el-GR").format(tracking.progress)}/${new Intl.NumberFormat("el-GR").format(tracking.target)} ${tracking.unit}</div>
        </div>
        ${isComplete ? `<div style="min-width:100px;padding:8px 12px;align-self:center;text-align:center;border-radius:10px;border:1px solid #4d8f62;background:rgba(44,88,56,.18);font-weight:800;color:#bdf3ca;">Complete</div>` : ""}
      </div>
    </div>
  `;
  panel.querySelector("#challengeQuestCard")?.addEventListener("click", () => {
    if (isComplete) {
      claimActiveChallengeFromQuest();
      return;
    }
    window.location.href = tracking.href;
  });
}

function getEquipmentContextStats(save){
  const fmt = (v) => new Intl.NumberFormat("el-GR").format(num(v, 0));
  const buildingBonusPct = (level) => Math.max(0, num(level, 0)) * 0.0005;
  const getCombatPetBonusesForUI = (state) => {
    const api = window.DS?.pets;
    const pet = state?.pets?.combat;
    if (!api?.getCombatPetBonuses || !pet) return { atkFlat: 0, defFlat: 0, atkPct: 0, defPct: 0 };
    const bonuses = api.getCombatPetBonuses(pet) || {};
    return {
      atkFlat: num(bonuses.atkFlat, 0),
      defFlat: num(bonuses.defFlat, 0),
      atkPct: num(bonuses.atkPct, 0),
      defPct: num(bonuses.defPct, 0)
    };
  };
  const baseAtk = num(save.heroAttack, 10);
  const baseDef = num(save.heroDefense, 10);
  let gearAtk = 0;
  let gearDef = 0;
  Object.values(save.equipment || {}).forEach((item) => {
    if (!item) return;
    gearAtk += num(item.atk, 0);
    gearDef += num(item.def, 0);
  });
  const petBonuses = getCombatPetBonusesForUI(save);
  const rawAtk = baseAtk + gearAtk + petBonuses.atkFlat;
    const rawDef = baseDef + gearDef + petBonuses.defFlat;
    const setAtk = num(save.setBonusAtkPct, 0);
    const setDef = num(save.setBonusDefPct, 0);
    const buildingPct = __equipStatsMode === "dungeon"
      ? buildingBonusPct(save.cryptHallLevel)
      : buildingBonusPct(save.barracksLevel);
    const baseTotalAtk = Math.floor(rawAtk * (1 + setAtk + buildingPct));
    const baseTotalDef = Math.floor(rawDef * (1 + setDef + buildingPct));
    const potionBonuses = getPotionBonusesForUI(save);
    const totalAtk = Math.floor(baseTotalAtk * (1 + potionBonuses.atkPct));
    const totalDef = Math.floor(baseTotalDef * (1 + potionBonuses.defPct));
    const modeLabel = __equipStatsMode === "dungeon" ? "Dungeon" : "Fight";
    const atkPctTxt = potionBonuses.atkPct > 0 ? ` (+${Math.round(potionBonuses.atkPct * 100)}%)` : "";
    const defPctTxt = potionBonuses.defPct > 0 ? ` (+${Math.round(potionBonuses.defPct * 100)}%)` : "";
    return [
      { label: `${modeLabel} Attack${atkPctTxt}`, value: fmt(totalAtk) },
      { label: `${modeLabel} Defense${defPctTxt}`, value: fmt(totalDef) }
    ];
  }

function renderEquipmentPanel(save){
  const panel = document.getElementById("equipmentPanel");
  if (!panel) return;

  const slotOrder = ["helmet","chest","belt","pants","bracers","mainHand","gloves","ring","shoulders","offHand","boots","amulet"];
  const slotShort = {
    mainHand: "MH",
    offHand: "OH",
    helmet: "Helm",
    shoulders: "Shld",
    chest: "Chest",
    bracers: "Brac",
    gloves: "Glove",
    belt: "Belt",
    pants: "Pants",
    boots: "Boots",
    ring: "Ring",
    amulet: "Amul"
  };
  const stats = getEquipmentContextStats(save);

  panel.innerHTML = `
    <div class="invEquipPanel">
      <div class="invEquipModeTabs">
        <button type="button" class="invEquipModeBtn ${__equipStatsMode === "fight" ? "invEquipModeActive" : ""}" data-equip-mode="fight">Fight</button>
        <button type="button" class="invEquipModeBtn ${__equipStatsMode === "dungeon" ? "invEquipModeActive" : ""}" data-equip-mode="dungeon">Dungeon</button>
      </div>
      <div class="invEquipPaperdoll">
        <div class="invEquipFigure" aria-hidden="true"></div>
        <div class="invEquipSlots">
        ${slotOrder.map((slot) => {
          const item = save.equipment?.[slot];
          const rarityKey = String(item?.rarity || "").toLowerCase();
          const extraClass = item
            ? item.setId ? " dsSetItem" : item.crafted ? " dsCraftedItem" : (rarityKey ? ` dsRarity-${rarityKey}` : "")
            : "";
          const title = item
            ? `${item.name || slot}${num(item.atk, 0) ? ` - ATK +${num(item.atk, 0)}` : ""}${num(item.def, 0) ? ` - DEF +${num(item.def, 0)}` : ""}`
            : slot;
          return `
            <div class="invEquipSlot${extraClass}" data-slot="${slot}" title="${title}">
              ${item?.img ? `<img src="${item.img}" alt="${item.name || slot}">` : `<div class="invEquipEmpty">${slotShort[slot] || slot}</div>`}
              <div class="invEquipLabel">${slotShort[slot] || slot}</div>
            </div>
          `;
        }).join("")}
        </div>
      </div>
        <div class="invEquipStats">
          ${stats.map((stat) => `
            <div class="invEquipStat">
              <div class="invEquipStatLabel">${stat.label}</div>
              <div class="invEquipStatValue">${stat.value}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    panel.querySelectorAll("[data-equip-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        __equipStatsMode = btn.dataset.equipMode === "dungeon" ? "dungeon" : "fight";
        saveEquipStatsModePreference(__equipStatsMode);
        renderEquipmentPanel(ensureSave(loadSave()));
      });
    });
  }

function claimActiveChallengeFromQuest(){
  const save = ensureSave(loadSave());
  const active = save?.challenges?.active;
  if (!active) return;

  const rewardTable = {
    fightsWon: { 5: 1, 180: 2, 450: 5, 850: 10 },
    dungeonsCompleted: { 5: 1, 9: 2, 20: 5, 35: 10 },
    miningTicks: { 5: 1, 180: 2, 450: 5, 850: 10 },
    woodGatherTicks: { 5: 1, 180: 2, 450: 5, 850: 10 },
    fishingTicks: { 5: 1, 180: 2, 450: 5, 850: 10 },
    huntingTicks: { 5: 1, 180: 2, 450: 5, 850: 10 },
    barsCrafted: { 5: 1, 180: 2, 450: 5, 850: 10 },
    planksCrafted: { 5: 1, 180: 2, 450: 5, 850: 10 }
  };

  const stats = save?.stats?.total || {};
  const currentStat = num(stats[active.optionId], 0);
  const startValue = num(active.startValue, 0);
  const target = num(active.target, 0);
  const progress = Math.max(0, Math.min(target, currentStat - startValue));
  if (progress < target) return;

  if (!save.challenges.claimCounts || typeof save.challenges.claimCounts !== "object") save.challenges.claimCounts = {};
  if (!save.challenges.claimCounts[active.optionId] || typeof save.challenges.claimCounts[active.optionId] !== "object"){
    save.challenges.claimCounts[active.optionId] = {};
  }
  if (!Number.isFinite(Number(save.challenges.points))) save.challenges.points = 0;

  const reward = num(rewardTable[active.optionId]?.[target], 0);
  save.challenges.claimCounts[active.optionId][String(target)] = num(save.challenges.claimCounts[active.optionId][String(target)], 0) + 1;
  save.challenges.points += reward;
  save.challenges.active = null;
  setSave(save);
  window.dispatchEvent(new Event("ds:save"));
}

// -------------------------
// Header render
// -------------------------
  function renderHeader(save) {
  const hudRoot = document.getElementById("hudRoot");
  if (!hudRoot) return;

  const lvl = num(save.heroLevel, 1);

  const hpMax = Math.max(1, num(save.heroHPMax, calcHpMax(lvl)));
  const hpNow = clamp(num(save.heroHP, hpMax), 0, hpMax);
  const hpPct = clamp((hpNow / hpMax) * 100, 0, 100);

  const stMax = Math.max(1, num(save.staminaMax, 100));
  const stNow = clamp(num(save.stamina, stMax), 0, stMax);
  const stPct = clamp((stNow / stMax) * 100, 0, 100);

  const now = Date.now();
  const hpRemain = hpNow >= hpMax
    ? "FULL"
    : fmtMMSS(regenRemainingMs(now, save.hpRegenTs, HP_REGEN_EVERY_MS));
  const stRemain = stNow >= stMax
    ? "FULL"
    : fmtMMSS(regenRemainingMs(now, save.staminaRegenTs, ST_REGEN_EVERY_MS));

  const xpNow = Math.max(0, num(save.heroXP, 0));
  const xpNext = Math.max(1, num(save.heroXPNext, 100));
  const xpPct = clamp((xpNow / xpNext) * 100, 0, 100);
  const currentPage = normalizePagePath(window.location.pathname || "index.html");
  document.body.classList.toggle("ds-home-page", currentPage === "index.html");

  const statPts = Math.max(0, num(save.heroStatPoints, 0));
  const authLabel = getAuthUserLabel();
  const isAdminUser = !!window.DSAuth?.isAdmin?.();
  const isHomePage = currentPage === "index.html";
  const navMarkup = `
      <div class="dsNav">
        <button id="navHome" aria-label="Home" data-open-tab-href="index.html">
          <img class="dsNavIconImg" src="images/ui/home.png" alt="" aria-hidden="true">
          Home
        </button>
        <button id="navFight" aria-label="Fight" data-open-tab-href="fight.html">
          <img class="dsNavIconImg" src="images/ui/fight.png" alt="" aria-hidden="true">
          Fight
        </button>
        <button id="navDungeons" aria-label="Dungeons" data-open-tab-href="dungeons.html">
          <img class="dsNavIconImg" src="images/ui/dungeons.png" alt="" aria-hidden="true">
          Dungeons
        </button>
        <button id="navBuildings" aria-label="Buildings" data-open-tab-href="buildings.html">
          <img class="dsNavIconImg" src="images/ui/buildings.png" alt="" aria-hidden="true">
          Buildings
        </button>
        <button id="navLeaderboards" aria-label="Leaderboards" data-open-tab-href="leaderboards.html">
          <img class="dsNavIconImg" src="images/ui/stats.png" alt="" aria-hidden="true">
          Leaderboards
        </button>
        <button id="navProfessions" aria-label="Professions" data-open-tab-href="professions.html">
          <img class="dsNavIconImg" src="images/ui/professions.png" alt="" aria-hidden="true">
          Professions
        </button>
        <button id="navMarket" aria-label="Market" data-open-tab-href="market.html">
          <img class="dsNavIconImg" src="images/ui/market.png" alt="" aria-hidden="true">
          Market
        </button>
        <button id="navPartyHall" aria-label="Party Hall" data-open-tab-href="party_hall.html">
          <img class="dsNavIconImg" src="images/ui/party.png" alt="" aria-hidden="true">
          Party Hall
        </button>
      </div>`;
  const controlsMarkup = `
        <div class="dsHeaderControls">
          <div class="dsHeaderAccount">
            <button id="authAccountBtn" class="dsAccountBtn" type="button" aria-haspopup="menu" aria-expanded="false">
              <span class="navEmoji" aria-hidden="true">👤</span>
              Account
            </button>
            <div id="authAccountMenu" class="dsAccountMenu" role="menu" aria-hidden="true">
              <div class="dsAccountLabel">ACCOUNT</div>
              <div class="dsAccountEmail">${authLabel || "Signed In"}</div>
              ${isAdminUser ? `<button id="authAdminToolsBtn" class="dsAccountLogout" type="button" style="border-color:#4a6dc2;background:linear-gradient(180deg,#233b73,#18274f);color:#eef3ff;">Admin Tools</button>` : ``}
              <button id="authLogoutBtn" class="dsAccountLogout" type="button">Logout</button>
            </div>
          </div>
          <div class="dsHeaderPresence">
            <button id="dsPresenceBtn" class="dsAccountBtn" type="button" aria-haspopup="menu" aria-expanded="${__presenceState.menuOpen ? "true" : "false"}">
              <span class="navEmoji" aria-hidden="true">👥</span>
              Online : ${__presenceState.onlineCount}
            </button>
            <div id="dsPresenceMenu" class="dsAccountMenu ${__presenceState.menuOpen ? "dsAccountMenuOpen" : ""}" role="menu" aria-hidden="${__presenceState.menuOpen ? "false" : "true"}" style="width:min(540px, calc(100vw - 24px));max-height:min(420px, 70vh);overflow:auto;right:0;left:auto;">
              <div class="dsAccountLabel">PLAYER ACTIVITY</div>
              <div class="dsAccountEmail">${__presenceState.onlineCount} online right now</div>
              <div style="margin-top:8px;">
                ${getPresenceMenuMarkup()}
              </div>
            </div>
          </div>
        </div>`;

  hudRoot.innerHTML = `
    <div class="dsHeaderRow">
      <div class="dsHeaderTop">
        <div class="dsHeroPanel">
          <div class="dsHeroPortrait" id="heroPortrait" title="Open Equipment">
            <img src="${save.heroPortrait || "images/hero.png"}" alt="${save.heroName || "Hero"}">
          </div>
          <div class="dsHeroStats">
            <p class="dsLine" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <span class="dsHeroMetaText">${save.heroName || "Hero"}</span>
              <span class="dsHeroMetaText">Level: ${lvl}</span>
            </p>

            <div class="dsBarStack">
              <div class="dsBarWrap" title="Health">
                <div class="dsBarFill" style="width:${hpPct}%;background:#2dff7c;"></div>
                <div class="dsBarTextIn">HEALTH ${hpNow}/${hpMax}</div>
                <div class="dsBarTimer" title="Next +20 HP">${hpRemain}</div>
              </div>

              <div class="dsBarWrap" title="Stamina">
                <div class="dsBarFill" style="width:${stPct}%;background:#ff5252;"></div>
                <div class="dsBarTextIn">STAMINA ${stNow}/${stMax}</div>
                <div class="dsBarTimer" title="Next +10 ST">${stRemain}</div>
              </div>

              <div class="dsBarWrap" title="Hero XP (Fights)">
                <div class="dsBarFill" style="width:${xpPct}%;background:#4aa3ff;"></div>
                <div class="dsBarTextIn">XP ${xpNow}/${xpNext}</div>
              </div>
            </div>
          </div>
        </div>

        ${statPts > 0 ? `
        <div class="dsStatSide">
          <button id="navStats" class="dsStatBtn" title="Allocate stat points">
            +
          </button>
        </div>
        ` : ""}
        ${controlsMarkup}
      </div>

      <div class="dsHomeNavRow">${navMarkup}</div>
    </div>
  `;

  document.getElementById("heroPortrait")?.addEventListener("click", () => navigateWithFade("equipment.html"));
  document.getElementById("navStats")?.addEventListener("click", () => navigateWithFade("stats_alloc.html"));
  document.getElementById("navHome")?.addEventListener("click", () => navigateWithFade("index.html"));
  document.getElementById("navFight")?.addEventListener("click", () => navigateWithFade("fight.html"));
  document.getElementById("navDungeons")?.addEventListener("click", () => navigateWithFade("dungeons.html"));
  document.getElementById("navBuildings")?.addEventListener("click", () => navigateWithFade("buildings.html"));
  document.getElementById("navLeaderboards")?.addEventListener("click", () => navigateWithFade("leaderboards.html"));
  document.getElementById("navProfessions")?.addEventListener("click", () => navigateWithFade("professions.html"));
  document.getElementById("navMarket")?.addEventListener("click", () => navigateWithFade("market.html"));
  document.getElementById("navPartyHall")?.addEventListener("click", () => navigateWithFade("party_hall.html"));
  bindPresenceMenu();
  const accountBtn = document.getElementById("authAccountBtn");
  const accountMenu = document.getElementById("authAccountMenu");
  const closeAccountMenu = () => {
    if (!accountBtn || !accountMenu) return;
    accountBtn.setAttribute("aria-expanded", "false");
    accountMenu.classList.remove("dsAccountMenuOpen");
    accountMenu.setAttribute("aria-hidden", "true");
  };
  const openAccountMenu = () => {
    if (!accountBtn || !accountMenu) return;
    accountBtn.setAttribute("aria-expanded", "true");
    accountMenu.classList.add("dsAccountMenuOpen");
    accountMenu.setAttribute("aria-hidden", "false");
  };
  accountBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (accountMenu?.classList.contains("dsAccountMenuOpen")) closeAccountMenu();
    else openAccountMenu();
  });
  accountMenu?.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", closeAccountMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAccountMenu();
  });
  document.getElementById("authLogoutBtn")?.addEventListener("click", async () => {
    try {
      closeAccountMenu();
      await window.DSAuth?.signOut?.();
    } catch (error) {
      console.error("[UI] logout failed", error);
    }
  });
  document.getElementById("authAdminToolsBtn")?.addEventListener("click", () => {
    closeAccountMenu();
    bindAdminToolsModal();
    openAdminToolsModal();
  });
}

  function syncRightColumnToNav(force = false) {
    return;
  }

function renderGold(save) {
  const el = document.getElementById("goldValue");
  if (el) el.textContent = new Intl.NumberFormat("el-GR").format(num(save.gold, 0));
}

function getAuthUserLabel() {
  if (!window.DSAuth?.getUserLabel) return "";
  return String(window.DSAuth.getUserLabel() || "").trim();
}

const __presenceState = {
  loading: false,
  loaded: false,
  menuOpen: false,
  players: [],
  onlineCount: 0,
  lastFetchAt: 0,
  error: ""
};

function formatPresenceAgo(isoString) {
  if (!isoString) return "Never";
  const ms = new Date(isoString).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "Never";
  const diff = Math.max(0, Date.now() - ms);
  const sec = Math.floor(diff / 1000);
  if (sec < 15) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function formatPresenceExact(isoString) {
  if (!isoString) return "No activity yet";
  const ms = new Date(isoString).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "No activity yet";
  return new Intl.DateTimeFormat("el-GR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(ms);
}

async function refreshPresenceSnapshot(force = false) {
  if (__presenceState.loading) return;
  if (!force && __presenceState.loaded && (Date.now() - __presenceState.lastFetchAt) < 30000) return;
  if (!window.DSAuth?.fetchPresenceSnapshot) return;

  __presenceState.loading = true;
  try {
    const snapshot = await window.DSAuth.fetchPresenceSnapshot();
    __presenceState.players = Array.isArray(snapshot?.players) ? snapshot.players : [];
    __presenceState.onlineCount = num(snapshot?.onlineCount, 0);
    __presenceState.loaded = true;
    __presenceState.error = "";
    __presenceState.lastFetchAt = Date.now();
  } catch (error) {
    console.error("[UI] presence fetch failed", error);
    __presenceState.error = error?.message || "Failed to load player presence.";
    __presenceState.lastFetchAt = Date.now();
  } finally {
    __presenceState.loading = false;
    forceRerenderNow();
  }
}

function getPresenceMenuMarkup() {
  if (__presenceState.error) {
    return `<div style="font-size:12px;color:#ffd8de;">${__presenceState.error}</div>`;
  }
  if (__presenceState.loading && !__presenceState.loaded) {
    return `<div style="font-size:12px;opacity:.82;">Loading players...</div>`;
  }
  const onlinePlayers = __presenceState.players.filter((player) => player?.isOnline);
  if (!onlinePlayers.length) {
    return `<div style="font-size:12px;opacity:.82;">No players online right now.</div>`;
  }

  return onlinePlayers.slice(0, 24).map((player) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.06);">
      <div style="position:relative;flex:0 0 auto;">
        <img src="${player.avatarUrl || "images/hero.png"}" alt="${player.name}" style="width:38px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);object-fit:cover;background:#10131d;">
        <span style="position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border-radius:999px;border:2px solid #111723;background:#31d07f;"></span>
      </div>
      <div style="min-width:0;flex:1;">
        <div style="font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${player.name}</div>
      </div>
    </div>
  `).join("");
}

function bindPresenceMenu() {
  const btn = document.getElementById("dsPresenceBtn");
  const menu = document.getElementById("dsPresenceMenu");
  if (!btn || !menu) return;

  const closeMenu = () => {
    __presenceState.menuOpen = false;
    btn.setAttribute("aria-expanded", "false");
    menu.classList.remove("dsAccountMenuOpen");
    menu.setAttribute("aria-hidden", "true");
  };

  const openMenu = async () => {
    __presenceState.menuOpen = true;
    btn.setAttribute("aria-expanded", "true");
    menu.classList.add("dsAccountMenuOpen");
    menu.setAttribute("aria-hidden", "false");
    await refreshPresenceSnapshot(true);
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (__presenceState.menuOpen) closeMenu();
    else openMenu();
  });
  menu.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

let __adminPanelBound = false;
let __adminPanelOpen = false;
let __adminItemCatalog = [];

function adminItemStackKey(item) {
  return [
    item?.type || "",
    item?.id || "",
    item?.name || "",
    item?.slot || "",
    item?.reqLevel ?? 1,
    item?.atk ?? 0,
    item?.def ?? 0,
    item?.rarity || "",
    item?.img || "",
    item?.crafted ? "crafted" : "",
    item?.setId || ""
  ].join("::");
}

function normalizeAdminItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const item = { ...raw };
  if (!item.name) return null;
  item.name = String(item.name || "").trim();
  if (!item.name) return null;
  item.type = String(item.type || (item.slot ? "gear" : "material") || "material").trim();
  if (item.id != null) item.id = String(item.id);
  if (item.slot != null) item.slot = String(item.slot);
  if (item.img != null) item.img = String(item.img);
  if (item.rarity != null) item.rarity = String(item.rarity);
  if (item.baseName != null) item.baseName = String(item.baseName);
  if (item.setId != null) item.setId = String(item.setId);
  if (item.atk != null) item.atk = num(item.atk, 0);
  if (item.def != null) item.def = num(item.def, 0);
  if (item.reqLevel != null) item.reqLevel = Math.max(1, Math.trunc(num(item.reqLevel, 1)));
  if (item.healHp != null) item.healHp = num(item.healHp, 0);
  if (item.healStamina != null) item.healStamina = num(item.healStamina, 0);
  item.quantity = 1;
  return item;
}

function adminItemThumbHtml(item) {
  const fallback = String(item?.name || "?").slice(0, 2).toUpperCase();
  if (!item?.img) return `<span style="font-size:10px;font-weight:900;">${fallback}</span>`;
  return `<img src="${item.img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.remove();const fb=document.createElement('span');fb.textContent='${fallback}';fb.style.fontSize='10px';fb.style.fontWeight='900';this.parentNode&&this.parentNode.appendChild(fb);">`;
}

function buildAdminItemCatalog() {
  const manualItems = [
    { type: "consumable", id: "arrows", name: "Arrows", img: "images/items/arrows.png" },
    { type: "material", id: "empty_vial", name: "Empty Vial", img: "images/alchemy/items/empty_vial.png" }
  ];
  const getters = [
    window.DSFight?.getAdminItems,
    window.DS_DUNGEON?.getAdminItems,
    window.DSMining?.getAdminItems,
    window.DSWoodcutting?.getAdminItems,
    window.DSHunting?.getAdminItems,
    window.DSHerbalism?.getAdminItems,
    window.DSFishingAction?.getAdminItems,
    window.DSCooking?.getAdminItems,
    window.DSAlchemyTier?.getAdminItems,
    window.DSForgeAction?.getAdminItems
  ];
  const all = [...manualItems];
  getters.forEach((getItems) => {
    try {
      const items = typeof getItems === "function" ? getItems() : [];
      if (Array.isArray(items)) all.push(...items);
    } catch (error) {
      console.warn("[admin] item catalog source failed", error);
    }
  });
  const deduped = new Map();
  all.forEach((raw) => {
    const item = normalizeAdminItem(raw);
    if (!item) return;
    deduped.set(adminItemStackKey(item), item);
  });
  return Array.from(deduped.values()).sort((a, b) => {
    const nameCmp = String(a.name || "").localeCompare(String(b.name || ""), "en", { sensitivity: "base" });
    if (nameCmp !== 0) return nameCmp;
    return String(a.type || "").localeCompare(String(b.type || ""), "en", { sensitivity: "base" });
  });
}

function renderAdminItemPicker(modal) {
  if (!modal) return;
  __adminItemCatalog = buildAdminItemCatalog();
  const searchEl = modal.querySelector("#dsAdminItemSearch");
  const qtyEl = modal.querySelector("#dsAdminItemQty");
  const resultsEl = modal.querySelector("#dsAdminItemResults");
  const selectedEl = modal.querySelector("#dsAdminItemSelected");
  const giveBtn = modal.querySelector("#dsAdminGiveItem");
  if (!searchEl || !qtyEl || !resultsEl || !selectedEl || !giveBtn) return;

  const selectedKey = String(modal.dataset.adminSelectedItemKey || "");
  const query = String(searchEl.value || "").trim().toLowerCase();
  const results = __adminItemCatalog.filter((item) => {
    if (!query) return true;
    const hay = [
      item.name,
      item.id,
      item.type,
      item.slot,
      item.rarity
    ].map((part) => String(part || "").toLowerCase()).join(" ");
    return hay.includes(query);
  }).slice(0, 60);

  const selectedItem = __adminItemCatalog.find((item) => adminItemStackKey(item) === selectedKey) || null;
  selectedEl.textContent = selectedItem
    ? `${selectedItem.name} (${selectedItem.type}${selectedItem.slot ? ` • ${selectedItem.slot}` : ""})`
    : "No item selected.";
  giveBtn.disabled = !selectedItem;

  resultsEl.innerHTML = results.length ? "" : `<div style="padding:10px 12px;opacity:.72;color:#d9ccb0;">No items found.</div>`;
  results.forEach((item) => {
    const key = adminItemStackKey(item);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "townBtn";
    row.style.width = "100%";
    row.style.minHeight = "0";
    row.style.padding = "8px 10px";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.gap = "10px";
    row.style.textAlign = "left";
    if (selectedKey === key) {
      row.style.borderColor = "rgba(166,124,64,.98)";
      row.style.background = "linear-gradient(180deg, rgba(84,60,30,.98) 0%, rgba(58,40,20,.98) 100%)";
      row.style.color = "#fff1cf";
    }
    row.innerHTML = `
      <span style="display:flex;align-items:center;gap:10px;min-width:0;">
        <span style="width:34px;height:34px;flex:0 0 34px;border-radius:8px;border:1px solid rgba(126,94,50,.88);background:linear-gradient(180deg, rgba(46,35,23,.96) 0%, rgba(24,20,19,.98) 100%);box-shadow:0 0 0 1px rgba(28,20,12,.84), inset 0 1px 0 rgba(255,228,178,.08);display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${adminItemThumbHtml(item)}
        </span>
        <span style="display:flex;flex-direction:column;min-width:0;">
          <span style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</span>
          <span style="font-size:11px;opacity:.78;">${item.type}${item.slot ? ` • ${item.slot}` : ""}${item.reqLevel ? ` • Lv ${item.reqLevel}` : ""}</span>
        </span>
      </span>
      <span style="font-size:11px;opacity:.82;white-space:nowrap;">${item.rarity || item.crafted ? (item.rarity || "crafted") : ""}</span>
    `;
    row.addEventListener("click", () => {
      modal.dataset.adminSelectedItemKey = key;
      renderAdminItemPicker(modal);
    });
    resultsEl.appendChild(row);
  });
}

function getAdminPetSlotOptions() {
  return [
    { key: "combat", label: "Combat Pet" },
    { key: "gathering", label: "Gathering Pet" },
    { key: "artisan", label: "Artisan Pet" },
    { key: "fortune", label: "Fortune Pet" }
  ];
}

function getAdminProfessionOptions() {
  return [
    { key: "mining", label: "Mining" },
    { key: "forge", label: "Forge" },
    { key: "woodcutting", label: "Woodcutting" },
    { key: "carpentry", label: "Carpentry" },
    { key: "hunting", label: "Hunting" },
    { key: "fishing", label: "Fishing" },
    { key: "cooking", label: "Cooking" },
    { key: "herbalism", label: "Herbalism" },
    { key: "alchemy", label: "Alchemy" },
    { key: "enchanting", label: "Enchanting" }
  ];
}

function setAdminPetLevel(slotKey, targetLevel) {
  const s = ensureSave(loadSave());
  const normalizedSlot = String(slotKey || "").trim().toLowerCase();
  const currentPet = normalizePet(normalizedSlot, s?.pets?.[normalizedSlot]);
  if (!currentPet) return { ok: false, msg: "No pet equipped in that slot." };
  currentPet.level = Math.max(1, Math.floor(num(targetLevel, 1)));
  currentPet.tier = Math.min(num(currentPet.tier, 1), getPetTierForLevel(currentPet.level));
  currentPet.xp = 0;
  currentPet.xpNext = petXpNextForLevel(currentPet.level);
  s.pets[normalizedSlot] = normalizePet(normalizedSlot, currentPet);
  setSave(s);
  window.dispatchEvent(new Event("ds:save"));
  return { ok: true, msg: `${currentPet.name || "Pet"} set to level ${currentPet.level}.` };
}

function ensureAdminToolsModal() {
  let modal = document.getElementById("dsAdminModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "dsAdminModal";
  modal.style.cssText = [
    "display:none",
    "position:fixed",
    "inset:0",
    "z-index:1000",
    "background:rgba(4,6,12,.72)",
    "backdrop-filter:blur(8px)",
    "padding:18px",
    "align-items:center",
    "justify-content:center"
  ].join(";");

  modal.innerHTML = `
    <div id="dsAdminModalCard" style="position:relative;z-index:1;width:min(760px, calc(100vw - 24px));max-height:min(84vh, 760px);overflow:auto;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg, rgba(20,23,36,.98), rgba(12,14,24,.98));box-shadow:0 24px 60px rgba(0,0,0,.42);padding:16px 16px 14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
        <div>
          <div style="font-size:11px;opacity:.68;font-weight:800;letter-spacing:.3px;">ADMIN ONLY</div>
          <div style="font-size:20px;font-weight:900;">Admin Tools</div>
        </div>
        <button id="dsAdminClose" type="button" class="townBtn" style="width:auto;min-width:0;padding:8px 12px;">Close</button>
      </div>

      <div id="dsAdminStatus" style="margin-bottom:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:12px;opacity:.92;">Ready.</div>

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
        <button id="dsAdminGold100m" type="button" class="townBtn" style="width:100%;">+100M Gold</button>
        <button id="dsAdminGold1b" type="button" class="townBtn" style="width:100%;">+1B Gold</button>
        <button id="dsAdminSetLv10" type="button" class="townBtn" style="width:100%;">Set Level 10</button>
        <button id="dsAdminSetLv50" type="button" class="townBtn" style="width:100%;">Set Level 50</button>
        <button id="dsAdminSetLv100" type="button" class="townBtn" style="width:100%;">Set Level 100</button>
        <button id="dsAdminRefill" type="button" class="townBtn" style="width:100%;">Refill HP / ST</button>
        <button id="dsAdminClearGlobalChat" type="button" class="townBtn" style="width:100%;grid-column:1 / -1;border-color:#8a4d5e;background:linear-gradient(180deg,#5a2431,#3d1620);color:#fff0f3;">Clear Global Chat</button>
      </div>

      <div style="margin-top:14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;font-weight:800;opacity:.88;">Custom Gold Add</span>
          <input id="dsAdminGoldInput" type="number" min="0" step="1" placeholder="1000000" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;font-weight:800;opacity:.88;">Set Level</span>
          <input id="dsAdminLevelInput" type="number" min="1" step="1" placeholder="25" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
        </label>
      </div>

      <div style="margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
        <button id="dsAdminApplyGold" type="button" class="townBtn" style="width:100%;">Apply Gold</button>
        <button id="dsAdminApplyLevel" type="button" class="townBtn" style="width:100%;">Apply Level</button>
      </div>

      <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08);display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:10px;align-items:end;">
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;font-weight:800;opacity:.88;">Target Hero Name</span>
          <input id="dsAdminTargetHeroName" type="text" placeholder="kentros" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
        </label>
        <button id="dsAdminResetPetsLv1" type="button" class="townBtn" style="width:100%;">Reset Pets to Lv 1</button>
      </div>

      <div style="margin-top:10px;display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:10px;align-items:end;">
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;font-weight:800;opacity:.88;">Set Gold</span>
          <input id="dsAdminTargetGoldInput" type="number" min="0" step="1" placeholder="5000000" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
        </label>
        <button id="dsAdminSetTargetGold" type="button" class="townBtn" style="width:100%;">Set Target Gold</button>
      </div>

      <div style="margin-top:10px;display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:10px;align-items:end;">
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;font-weight:800;opacity:.88;">Hero Level</span>
          <input id="dsAdminTargetHeroLevelInput" type="number" min="1" step="1" placeholder="50" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
        </label>
        <button id="dsAdminSetTargetHeroLevel" type="button" class="townBtn" style="width:100%;">Set Hero Level</button>
      </div>

      <div style="margin-top:10px;display:grid;grid-template-columns:minmax(0,1fr) 120px 170px;gap:10px;align-items:end;">
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;font-weight:800;opacity:.88;">Pet Slot</span>
          <select id="dsAdminPetSlot" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
            ${getAdminPetSlotOptions().map((slot) => `<option value="${slot.key}">${slot.label}</option>`).join("")}
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;font-weight:800;opacity:.88;">Pet Level</span>
          <input id="dsAdminPetLevelInput" type="number" min="1" step="1" placeholder="25" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
        </label>
        <button id="dsAdminApplyPetLevel" type="button" class="townBtn" style="width:100%;">Set Pet Level</button>
      </div>

      <div style="margin-top:10px;display:grid;grid-template-columns:minmax(0,1fr) 120px 170px;gap:10px;align-items:end;">
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;font-weight:800;opacity:.88;">Profession</span>
          <select id="dsAdminProfessionSelect" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
            ${getAdminProfessionOptions().map((profession) => `<option value="${profession.key}">${profession.label}</option>`).join("")}
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:12px;font-weight:800;opacity:.88;">Profession Level</span>
          <input id="dsAdminProfessionLevelInput" type="number" min="1" step="1" placeholder="25" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
        </label>
        <button id="dsAdminSetProfessionLevel" type="button" class="townBtn" style="width:100%;">Set Profession Level</button>
      </div>

      <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08);">
        <div style="font-size:15px;font-weight:900;color:#f3ead6;margin-bottom:10px;">Grant Item</div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) 96px auto;gap:10px;align-items:end;">
          <label style="display:flex;flex-direction:column;gap:6px;">
            <span style="font-size:12px;font-weight:800;opacity:.88;">Search Item</span>
            <input id="dsAdminItemSearch" type="text" placeholder="e.g. War Sigil, Copper Ore, Ember Axe" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;">
            <span style="font-size:12px;font-weight:800;opacity:.88;">Qty</span>
            <input id="dsAdminItemQty" type="number" min="1" step="1" value="1" style="height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 10px;">
          </label>
          <button id="dsAdminGiveItem" type="button" class="townBtn" style="width:170px;">Give Selected Item</button>
        </div>
        <div id="dsAdminItemSelected" style="margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:12px;color:#d9ccb0;">No item selected.</div>
        <div id="dsAdminItemResults" style="margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:300px;overflow:auto;padding-right:2px;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
}

function closeAdminToolsModal() {
  const modal = document.getElementById("dsAdminModal");
  if (!modal) return;
  modal.style.display = "none";
  __adminPanelOpen = false;
}

function openAdminToolsModal() {
  const modal = ensureAdminToolsModal();
  modal.style.display = "flex";
  __adminPanelOpen = true;
  renderAdminItemPicker(modal);
}

function bindAdminToolsModal() {
  if (__adminPanelBound) return;
  const modal = ensureAdminToolsModal();
  const statusEl = modal.querySelector("#dsAdminStatus");

  const setStatus = (text, isError = false) => {
    if (!statusEl) return;
    statusEl.textContent = String(text || "Ready.");
    statusEl.style.color = isError ? "#ffd8de" : "#eef2ff";
    statusEl.style.borderColor = isError ? "rgba(179,72,92,.4)" : "rgba(255,255,255,.08)";
    statusEl.style.background = isError ? "rgba(78,22,34,.4)" : "rgba(255,255,255,.03)";
  };

  const runGrant = async (payload, successText) => {
    try {
      setStatus("Applying admin grant...");
      await window.DSAuth?.invokeAdminGrant?.(payload);
      setStatus(successText || "Admin grant applied.");
      renderAll();
    } catch (error) {
      console.error("[admin] grant failed", error);
      setStatus(error?.message || "Admin grant failed.", true);
    }
  };

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeAdminToolsModal();
  });
  modal.querySelector("#dsAdminClose")?.addEventListener("click", closeAdminToolsModal);

  modal.querySelector("#dsAdminGold100m")?.addEventListener("click", () => runGrant({ add: { gold: 100000000 } }, "Added 100M gold."));
  modal.querySelector("#dsAdminGold1b")?.addEventListener("click", () => runGrant({ add: { gold: 1000000000 } }, "Added 1B gold."));
  modal.querySelector("#dsAdminSetLv10")?.addEventListener("click", () => runGrant({ set: { heroLevel: 10, heroXP: 0 } }, "Set hero level to 10."));
  modal.querySelector("#dsAdminSetLv50")?.addEventListener("click", () => runGrant({ set: { heroLevel: 50, heroXP: 0 } }, "Set hero level to 50."));
  modal.querySelector("#dsAdminSetLv100")?.addEventListener("click", () => runGrant({ set: { heroLevel: 100, heroXP: 0 } }, "Set hero level to 100."));
  modal.querySelector("#dsAdminRefill")?.addEventListener("click", () => {
    const save = ensureSave(loadSave());
    runGrant({
      set: {
        heroHP: num(save.heroHPMax, calcHpMax(num(save.heroLevel, 1))),
        heroHPMax: num(save.heroHPMax, calcHpMax(num(save.heroLevel, 1))),
        stamina: num(save.staminaMax, calcStaminaMax(num(save.heroLevel, 1))),
        staminaMax: num(save.staminaMax, calcStaminaMax(num(save.heroLevel, 1)))
      }
    }, "Refilled HP and stamina.");
  });
  modal.querySelector("#dsAdminClearGlobalChat")?.addEventListener("click", async () => {
    try {
      setStatus("Clearing global chat...");
      await window.DSAuth?.invokeAdminGrant?.({ clearChat: "global" });
      await loadLiveChatMessages("global", true);
      renderAll();
      setStatus("Global chat cleared.");
    } catch (error) {
      console.error("[admin] clear global chat failed", error);
      setStatus(error?.message || "Failed to clear global chat.", true);
    }
  });

  modal.querySelector("#dsAdminApplyGold")?.addEventListener("click", () => {
    const input = modal.querySelector("#dsAdminGoldInput");
    const amount = Number(input?.value || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("Enter a valid gold amount.", true);
      return;
    }
    runGrant({ add: { gold: Math.trunc(amount) } }, `Added ${new Intl.NumberFormat("el-GR").format(Math.trunc(amount))} gold.`);
  });

  modal.querySelector("#dsAdminApplyLevel")?.addEventListener("click", () => {
    const input = modal.querySelector("#dsAdminLevelInput");
    const level = Number(input?.value || 0);
    if (!Number.isFinite(level) || level < 1) {
      setStatus("Enter a valid level.", true);
      return;
    }
    runGrant({ set: { heroLevel: Math.trunc(level), heroXP: 0 } }, `Set hero level to ${Math.trunc(level)}.`);
  });

  modal.querySelector("#dsAdminApplyPetLevel")?.addEventListener("click", () => {
    const slotInput = modal.querySelector("#dsAdminPetSlot");
    const levelInput = modal.querySelector("#dsAdminPetLevelInput");
    const slotKey = String(slotInput?.value || "").trim().toLowerCase();
    const level = Number(levelInput?.value || 0);
    if (!slotKey) {
      setStatus("Choose a pet slot.", true);
      return;
    }
    if (!Number.isFinite(level) || level < 1) {
      setStatus("Enter a valid pet level.", true);
      return;
    }
    const result = setAdminPetLevel(slotKey, Math.trunc(level));
    setStatus(result.msg, !result.ok);
  });

  modal.querySelector("#dsAdminSetTargetGold")?.addEventListener("click", () => {
    const heroInput = modal.querySelector("#dsAdminTargetHeroName");
    const goldInput = modal.querySelector("#dsAdminTargetGoldInput");
    const heroName = String(heroInput?.value || "").trim();
    const amount = Number(goldInput?.value || 0);
    if (!heroName) {
      setStatus("Enter a hero name first.", true);
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setStatus("Enter a valid gold amount.", true);
      return;
    }
    runGrant({
      targetHeroName: heroName,
      set: { gold: Math.trunc(amount) }
    }, `Set gold to ${new Intl.NumberFormat("el-GR").format(Math.trunc(amount))} for ${heroName}.`);
  });

  modal.querySelector("#dsAdminSetTargetHeroLevel")?.addEventListener("click", () => {
    const heroInput = modal.querySelector("#dsAdminTargetHeroName");
    const levelInput = modal.querySelector("#dsAdminTargetHeroLevelInput");
    const heroName = String(heroInput?.value || "").trim();
    const level = Number(levelInput?.value || 0);
    if (!heroName) {
      setStatus("Enter a hero name first.", true);
      return;
    }
    if (!Number.isFinite(level) || level < 1) {
      setStatus("Enter a valid hero level.", true);
      return;
    }
    runGrant({
      targetHeroName: heroName,
      set: { heroLevel: Math.trunc(level), heroXP: 0 }
    }, `Set hero level to ${Math.trunc(level)} for ${heroName}.`);
  });

  modal.querySelector("#dsAdminSetProfessionLevel")?.addEventListener("click", () => {
    const heroInput = modal.querySelector("#dsAdminTargetHeroName");
    const professionInput = modal.querySelector("#dsAdminProfessionSelect");
    const levelInput = modal.querySelector("#dsAdminProfessionLevelInput");
    const heroName = String(heroInput?.value || "").trim();
    const profession = String(professionInput?.value || "").trim().toLowerCase();
    const level = Number(levelInput?.value || 0);
    if (!heroName) {
      setStatus("Enter a hero name first.", true);
      return;
    }
    if (!profession) {
      setStatus("Choose a profession.", true);
      return;
    }
    if (!Number.isFinite(level) || level < 1) {
      setStatus("Enter a valid profession level.", true);
      return;
    }
    const professionLabel = getAdminProfessionOptions().find((entry) => entry.key === profession)?.label || profession;
    runGrant({
      targetHeroName: heroName,
      profession: { key: profession, level: Math.trunc(level), xp: 0 }
    }, `Set ${professionLabel} to level ${Math.trunc(level)} for ${heroName}.`);
  });

  modal.querySelector("#dsAdminResetPetsLv1")?.addEventListener("click", () => {
    const input = modal.querySelector("#dsAdminTargetHeroName");
    const heroName = String(input?.value || "").trim();
    if (!heroName) {
      setStatus("Enter a hero name first.", true);
      return;
    }
    runGrant({
      targetHeroName: heroName,
      pets: { resetToLevel: 1 }
    }, `Reset pets to level 1 for ${heroName}.`);
  });

  const itemSearch = modal.querySelector("#dsAdminItemSearch");
  const itemQty = modal.querySelector("#dsAdminItemQty");
  itemSearch?.addEventListener("input", () => renderAdminItemPicker(modal));
  itemQty?.addEventListener("change", () => {
    const qty = Math.max(1, Math.trunc(num(itemQty.value, 1)));
    itemQty.value = String(qty);
  });
  modal.querySelector("#dsAdminGiveItem")?.addEventListener("click", () => {
    const key = String(modal.dataset.adminSelectedItemKey || "");
    const item = __adminItemCatalog.find((entry) => adminItemStackKey(entry) === key);
    if (!item) {
      setStatus("Select an item first.", true);
      return;
    }
    const qty = Math.max(1, Math.trunc(num(itemQty?.value, 1)));
    if (itemQty) itemQty.value = String(qty);
    runGrant({ items: [{ ...item, quantity: qty }] }, `Granted ${qty}x ${item.name}.`);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && __adminPanelOpen) closeAdminToolsModal();
  });

  __adminPanelBound = true;
}

function normalizePagePath(path) {
  const normalized = String(path || "")
    .replace(/\\/g, "/")
    .split("/").pop()
    .split("?")[0]
    .split("#")[0]
    .toLowerCase()
    .trim();
  return normalized || "index.html";
}

const SHELL_ROUTES = new Set(["index.html", "fight.html", "dungeons.html", "dungeon_run.html", "buildings.html", "challenges.html", "leaderboards.html", "market.html", "bank.html", "party_hall.html", "professions.html", "professions_overview.html", "equipment.html", "stats.html", "stats_alloc.html", "mining.html", "mining_action.html", "hunting.html", "hunting_action.html", "fishing.html", "fishing_action.html", "cooking.html", "cooking_action.html", "herbalism.html", "herbalism_action.html", "alchemy.html", "alchemy_tier.html", "alchemy_action.html", "carpentry.html", "woodcutting.html", "wood_gather_action.html", "wood_sawmill_action.html", "forge.html", "forge_action.html", "enchanting.html"]);
const SHELL_INSTANT_ROUTES = new Set(["mining_action.html", "hunting_action.html", "fishing_action.html", "cooking_action.html", "herbalism_action.html", "alchemy_action.html", "wood_gather_action.html", "wood_sawmill_action.html", "forge_action.html"]);

function canUseShellRouting(currentPage, targetPage) {
  return SHELL_ROUTES.has(currentPage) && SHELL_ROUTES.has(targetPage);
}

function mountShellView(targetPage, targetHref = targetPage) {
  const left = document.getElementById("leftPanel");
  if (!left) return false;

  window.dispatchEvent(new Event("ds:pause"));

  if (targetPage === "index.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSHome?.mount?.(left);
  }

  if (targetPage === "fight.html") {
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSFight?.mount?.(left);
  }

  if (targetPage === "dungeons.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DS_DUNGEON?.mountDungeonList?.(left);
  }

  if (targetPage === "dungeon_run.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    return !!window.DS_DUNGEON?.mountDungeonRun?.(left);
  }

  if (targetPage === "buildings.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSBuildings?.mount?.(left);
  }

  if (targetPage === "challenges.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSChallenges?.mount?.(left);
  }

  if (targetPage === "market.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSMarket?.mount?.(left);
  }

  if (targetPage === "bank.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSBank?.mount?.(left);
  }

  if (targetPage === "party_hall.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSPartyHall?.mount?.(left);
  }

  if (targetPage === "leaderboards.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSLeaderboards?.mount?.(left);
  }

  if (targetPage === "professions.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSProfessions?.mount?.(left);
  }

  if (targetPage === "professions_overview.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSOverview?.mount?.(left);
  }

  if (targetPage === "mining.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSMining?.mount?.(left);
  }

  if (targetPage === "mining_action.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSMiningAction?.mount?.(left, targetHref);
  }

  if (targetPage === "hunting.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSHunting?.mount?.(left);
  }

  if (targetPage === "hunting_action.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSHuntingAction?.mount?.(left, targetHref);
  }

  if (targetPage === "fishing.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSFishing?.mount?.(left);
  }

  if (targetPage === "fishing_action.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSFishingAction?.mount?.(left, targetHref);
  }

  if (targetPage === "cooking.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSCooking?.mount?.(left);
  }

  if (targetPage === "cooking_action.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSCookingAction?.mount?.(left, targetHref);
  }

  if (targetPage === "herbalism.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSHerbalism?.mount?.(left);
  }

  if (targetPage === "herbalism_action.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSHerbalismAction?.mount?.(left, targetHref);
  }

  if (targetPage === "alchemy.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSAlchemy?.mount?.(left);
  }

  if (targetPage === "alchemy_tier.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSAlchemyTier?.mount?.(left, targetHref);
  }

  if (targetPage === "alchemy_action.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSAlchemyAction?.mount?.(left, targetHref);
  }

  if (targetPage === "carpentry.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSCarpentry?.mount?.(left);
  }

  if (targetPage === "woodcutting.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSWoodcutting?.mount?.(left);
  }

  if (targetPage === "wood_gather_action.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSWoodGatherAction?.mount?.(left, targetHref);
  }

  if (targetPage === "wood_sawmill_action.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSWoodSawmillAction?.mount?.(left, targetHref);
  }

  if (targetPage === "forge.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSForge?.mount?.(left);
  }

  if (targetPage === "forge_action.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSForgeAction?.mount?.(left, targetHref);
  }

  if (targetPage === "enchanting.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSEnchanting?.mount?.(left);
  }

  if (targetPage === "equipment.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSEquipment?.mount?.(left);
  }

  if (targetPage === "stats.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSStats?.mount?.(left);
  }

  if (targetPage === "stats_alloc.html") {
    window.DSFight?.unmount?.();
    window.DS_DUNGEON?.unmountDungeonList?.();
    window.DS_DUNGEON?.unmountDungeonRun?.();
    return !!window.DSStatsAlloc?.mount?.(left);
  }

  return false;
}

function navigateWithinShell(targetHref, options = {}) {
  const targetPage = normalizePagePath(targetHref);
  const currentPage = normalizePagePath(window.location.pathname || "index.html");
  if (!canUseShellRouting(currentPage, targetPage)) return false;
  if (targetPage === currentPage && !options.force) {
    const didMountSameRoute = mountShellView(targetPage, targetHref);
    if (!didMountSameRoute) {
      restoreLeftPanelNodes();
      window.DS?.resume?.();
    }
    return true;
  }

  if (SHELL_INSTANT_ROUTES.has(targetPage)) {
    const didMount = mountShellView(targetPage, targetHref);
    if (!didMount) return false;
    if (!options.skipHistory) {
      window.history.pushState({ dsShellRoute: targetPage }, "", targetHref);
    }
    window.DSAuth?.markPresenceNow?.(true).catch((error) => {
      console.error("[UI] immediate presence update failed", error);
    });
    return true;
  }

  document.body.classList.add("ds-page-transitioning");
  window.setTimeout(() => {
    const didMount = mountShellView(targetPage, targetHref);
    if (!didMount) {
      document.body.classList.remove("ds-page-transitioning");
      window.location.href = targetHref;
      return;
    }

    if (!options.skipHistory) {
      window.history.pushState({ dsShellRoute: targetPage }, "", targetHref);
    }
    window.DSAuth?.markPresenceNow?.(true).catch((error) => {
      console.error("[UI] immediate presence update failed", error);
    });
    requestAnimationFrame(() => {
      document.body.classList.remove("ds-page-transitioning");
    });
  }, 140);

  return true;
}

function navigateWithFade(targetHref) {
  const targetPage = normalizePagePath(targetHref);
  if (!targetPage) return;

  restoreLeftPanelNodes();
  window.DS?.resume?.();

  if (navigateWithinShell(targetHref)) return;

  try {
    sessionStorage.setItem("ds:page-enter", "1");
  } catch {}
  document.body.classList.add("ds-page-transitioning");

  window.setTimeout(() => {
    window.location.href = targetHref;
  }, 220);
}

window.DSUI = Object.assign(window.DSUI || {}, {
  navigateWithinShell
});

// -------------------------
// Inventory render + DnD swap
// -------------------------
let __invSig = "";
let dragFromIndex = null;
let __inventoryContextMenu = null;
let __initialInspectorHandled = false;

function invSignature(save) {
  const inv = Array.isArray(save.inventory) ? save.inventory : [];
  return `${num(save.gold,0)}|${num(save.heroXP,0)}|${num(save.stamina,0)}|${num(save.heroHP,0)}|${inv.length}|` +
    inv.map(it => {
      if (!it) return "_";
      return [
        it.type||"", it.name||"", it.slot||"", it.reqLevel??1,
        it.atk??0, it.def??0, it.rarity||"", it.img||"",
        it.crafted ? 1 : 0,
        it.quantity ?? it.qty ?? 1,
        it.upg ?? 0,
        it.baseName || "",
        it.healHp ?? 0,
        it.healStamina ?? 0
      ].join("::");
    }).join("~");
}

function setInvCap(save) {
  const capEl = document.getElementById("invCap");
  if (!capEl) return;

  const inv = Array.isArray(save.inventory) ? save.inventory : [];
  const maxUnits = num(save.inventoryMaxSlots, 1000);

  let usedUnits = 0;
  for (const it of inv) {
    if (!it) continue;
    const q = num(it.quantity ?? it.qty, 1);
    usedUnits += Math.max(1, q);
  }
  capEl.textContent = `${usedUnits}/${maxUnits}`;
}

function closeInventoryContextMenu() {
  if (!__inventoryContextMenu) return;
  __inventoryContextMenu.style.display = "none";
  delete __inventoryContextMenu.dataset.inspectIndex;
  delete __inventoryContextMenu.dataset.targetHref;
}

function getInspectorTabUrl(invIndex) {
  const idx = Math.max(0, Math.floor(Number(invIndex) || 0));
  const url = new URL("index.html", window.location.href);
  url.searchParams.set("inspectInv", String(idx));
  return url.toString();
}

function openInspectorInNewTab(invIndex) {
  const idx = Math.max(0, Math.floor(Number(invIndex) || 0));
  window.open(getInspectorTabUrl(idx), "_blank", "noopener");
}

function openHrefInNewTab(href) {
  const target = String(href || "").trim();
  if (!target) return;
  window.open(new URL(target, window.location.href).toString(), "_blank", "noopener");
}

function ensureInventoryContextMenu() {
  if (__inventoryContextMenu?.isConnected) return __inventoryContextMenu;

  const menu = document.createElement("div");
  menu.id = "dsInventoryContextMenu";
  Object.assign(menu.style, {
    position: "fixed",
    zIndex: "240",
    display: "none",
    minWidth: "220px",
    padding: "8px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(16,18,28,.96)",
    boxShadow: "0 16px 40px rgba(0,0,0,.35)",
    backdropFilter: "blur(10px)"
  });
  menu.innerHTML = `
    <button type="button" id="dsInvCtxOpenTab" class="townBtn" style="width:100%;min-width:0;padding:10px 12px;font-size:13px;">
      Open in New Tab
    </button>
  `;
  menu.querySelector("#dsInvCtxOpenTab")?.addEventListener("click", () => {
    const targetHref = String(menu.dataset.targetHref || "").trim();
    const inspectIndex = Number(menu.dataset.inspectIndex);
    if (targetHref) {
      openHrefInNewTab(targetHref);
    } else if (Number.isFinite(inspectIndex) && inspectIndex >= 0) {
      openInspectorInNewTab(inspectIndex);
    } else {
      return;
    }
    closeInventoryContextMenu();
  });
  document.body.appendChild(menu);
  document.addEventListener("click", closeInventoryContextMenu);
  document.addEventListener("scroll", closeInventoryContextMenu, true);
  window.addEventListener("blur", closeInventoryContextMenu);
  window.addEventListener("resize", closeInventoryContextMenu);
  __inventoryContextMenu = menu;
  return menu;
}

function showInventoryContextMenu(invIndex, clientX, clientY) {
  const menu = ensureInventoryContextMenu();
  menu.dataset.inspectIndex = String(Math.max(0, Math.floor(Number(invIndex) || 0)));
  delete menu.dataset.targetHref;
  menu.style.display = "block";

  const pad = 12;
  const rect = menu.getBoundingClientRect();
  const maxLeft = Math.max(pad, window.innerWidth - rect.width - pad);
  const maxTop = Math.max(pad, window.innerHeight - rect.height - pad);
  menu.style.left = `${Math.min(Math.max(pad, clientX), maxLeft)}px`;
  menu.style.top = `${Math.min(Math.max(pad, clientY), maxTop)}px`;
}

function showOpenInNewTabMenu(href, clientX, clientY) {
  const target = String(href || "").trim();
  if (!target) return;
  const menu = ensureInventoryContextMenu();
  menu.dataset.targetHref = target;
  delete menu.dataset.inspectIndex;
  menu.style.display = "block";

  const pad = 12;
  const rect = menu.getBoundingClientRect();
  const maxLeft = Math.max(pad, window.innerWidth - rect.width - pad);
  const maxTop = Math.max(pad, window.innerHeight - rect.height - pad);
  menu.style.left = `${Math.min(Math.max(pad, clientX), maxLeft)}px`;
  menu.style.top = `${Math.min(Math.max(pad, clientY), maxTop)}px`;
}

function getRequestedInspectorIndex() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const raw = params.get("inspectInv");
    if (raw == null || String(raw).trim() === "") return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    const idx = Math.floor(value);
    return idx >= 0 ? idx : null;
  } catch {
    return null;
  }
}

function maybeOpenRequestedInspector() {
  if (__initialInspectorHandled) return;
  __initialInspectorHandled = true;
  const idx = getRequestedInspectorIndex();
  if (idx == null) return;
  const save = ensureSave(loadSave());
  const item = save.inventory?.[idx];
  if (!item) return;
  openInspector(idx, item);
}

function renderInventory(save) {
  const grid = document.getElementById("inventoryGrid");
  if (!grid) return;

  if (!grid.dataset.dsClickHooked) {
    grid.dataset.dsClickHooked = "1";
    const handleInvClick = (e) => {
      const slot = e.target.closest(".dsSlot");
      if (!slot) return;
      const idx = Number(slot.dataset.index);
      if (!Number.isFinite(idx)) return;
      const s = ensureSave(loadSave());
      const it = s.inventory?.[idx];
      if (!it) return;
      openInspector(idx, it);
    };
    grid.addEventListener("click", handleInvClick);
    grid.addEventListener("contextmenu", (e) => {
      const slot = e.target.closest(".dsSlot");
      if (!slot) return;
      const idx = Number(slot.dataset.index);
      if (!Number.isFinite(idx)) return;
      e.preventDefault();
      showInventoryContextMenu(idx, e.clientX, e.clientY);
    });
    // capture phase fallback in case something stops propagation
    document.addEventListener("click", handleInvClick, true);
    document.addEventListener("contextmenu", (e) => {
      const target = e.target.closest("[data-open-tab-href]");
      if (!target || target.closest(".dsSlot")) return;
      const href = String(target.getAttribute("data-open-tab-href") || "").trim();
      if (!href) return;
      e.preventDefault();
      showOpenInNewTabMenu(href, e.clientX, e.clientY);
    });
  }

  const sig = invSignature(save);
  if (sig === __invSig) return;
  __invSig = sig;

  setInvCap(save);

  const inv = Array.isArray(save.inventory) ? save.inventory : [];
  const prevScroll = grid.scrollTop;
  grid.innerHTML = "";

  inv.forEach((it, i) => {
    if (!it) return;

    const slot = document.createElement("div");
    slot.className = "dsSlot";
    if (it.setId) {
      slot.classList.add("dsSetItem");
    } else if (it.crafted) {
      slot.classList.add("dsCraftedItem");
    } else {
      const rarityKey = String(it.rarity || "").toLowerCase();
      if (rarityKey) slot.classList.add("dsRarity-" + rarityKey);
    }
    slot.dataset.index = String(i);
    slot.draggable = true;

    slot.addEventListener("dragstart", (e) => {
      dragFromIndex = i;
      e.dataTransfer?.setData("text/plain", String(i));
    });

    slot.addEventListener("dragover", (e) => {
      e.preventDefault();
      slot.classList.add("dragOver");
    });

    slot.addEventListener("dragleave", () => slot.classList.remove("dragOver"));

    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("dragOver");
      const from = dragFromIndex;
      const to = i;
      dragFromIndex = null;
      if (from == null || to == null || from === to) return;

      const s = ensureSave(loadSave());
      const arr = s.inventory;
      const tmp = arr[from];
      arr[from] = arr[to];
      arr[to] = tmp;
      setSave(s);
    });

    if (it.img) {
      const img = document.createElement("img");
      img.src = it.img;
      img.alt = it.name || "item";
      slot.appendChild(img);

      const upg = num(it.upg, 0);
      if (upg > 0) {
        const b = document.createElement("div");
        b.className = "dsUpg";
        b.textContent = `+${upg}`;
        slot.appendChild(b);
      }
    }

    const q = num(it.quantity ?? it.qty, 1);
    if (q > 1) {
      const qty = document.createElement("div");
      qty.className = "dsQty";
      qty.textContent = String(q);
      slot.appendChild(qty);
    }

    const atk = num(it.atk, 0);
    const def = num(it.def, 0);
    const req = num(it.reqLevel, 1);
  const rarity = it.rarity ? ` - ${it.rarity}` : "";
    const statsLine = (() => {
      const parts = [];
      if (atk) parts.push(`ATK +${atk}`);
      if (def) parts.push(`DEF +${def}`);
    return parts.length ? ` - ${parts.join(" ")}` : "";
  })();
  const reqLine = isGearItem(it) ? ` - Req Lv ${req}` : "";

    const hp = num(it.healHp, 0);
    const st = num(it.healStamina, 0);
    const eatLine = (it.type === "food" && (hp > 0 || st > 0))
    ? ` - Provides${hp > 0 ? ` +${hp} HP` : ""}${st > 0 ? ` +${st} ST` : ""}`
    : "";

    const upg = num(it.upg, 0);
    const nameHasPlus = /\+\d+$/.test(String(it.name || ""));
  const upgLine = (upg > 0 && !nameHasPlus) ? ` - +${upg}` : "";

  slot.title = `${it.name || "Item"}${upgLine}${rarity}${reqLine}${statsLine}${eatLine}${q > 1 ? ` - x${q}` : ""}`;

    slot.addEventListener("click", (e) => {
      if (e.defaultPrevented) return;
      openInspector(i, it);
    });
    grid.appendChild(slot);
  });

  grid.scrollTop = prevScroll;
}

// -------------------------
// Inspector (replace left panel)
// -------------------------
let __leftStashEl = null;
let __leftScroll = 0;

function stashLeftPanelNodes() {
  const left = document.getElementById("leftPanel");
  if (!left) return;

  if (!__leftStashEl) {
    __leftStashEl = document.createElement("div");
    __leftStashEl.id = "dsLeftStash";
    __leftStashEl.style.display = "none";
    document.body.appendChild(__leftStashEl);
  }
  if (__leftStashEl.childNodes.length > 0) return;

  __leftScroll = left.scrollTop || 0;
  while (left.firstChild) {
    __leftStashEl.appendChild(left.firstChild);
  }
}

function restoreLeftPanelNodes() {
  const left = document.getElementById("leftPanel");
  if (!left || !__leftStashEl) return;

  left.innerHTML = "";
  while (__leftStashEl.firstChild) {
    left.appendChild(__leftStashEl.firstChild);
  }
  left.scrollTop = __leftScroll || 0;
}

function ensureInspectorBoxReplace() {
  const left = document.getElementById("leftPanel");
  if (left) {
    stashLeftPanelNodes();
    left.innerHTML = `<div id="dsInspector"></div>`;
    return document.getElementById("dsInspector");
  }

  // Fallback: place inspector in inventory panel if left panel is missing
  const invPanel = document.getElementById("inventoryPanel");
  if (!invPanel) return null;
  let box = document.getElementById("dsInspector");
  if (!box) {
    box = document.createElement("div");
    box.id = "dsInspector";
    invPanel.prepend(box);
  }
  return box;
}

function rarityMult(r) {
  switch ((r || "").toLowerCase()) {
    case "common": return 1;
    case "uncommon": return 2;
    case "rare": return 4;
    case "epic": return 8;
    case "legendary": return 12;
    case "mythic": return 20;
    default: return 1;
  }
}

  function canEquip(save, item) {
    if (!item || !isGearItem(item) || !item.slot) return false;
    return save.heroLevel >= num(item.reqLevel, 1);
  }
  function isPotionItem(item) {
    if (!item) return false;
    if (String(item.subType || "").toLowerCase() === "potion") return true;
    return /potion/i.test(String(item.name || ""));
  }
  function isMeatItem(item){
    if (!item) return false;
    if (String(item.type || "").toLowerCase() === "meat") return true;
    return /meat/i.test(String(item.name || ""));
  }
  function isCookedFishItem(item){
    if (!item) return false;
    const id = String(item.id || "").toLowerCase();
    const name = String(item.name || "").toLowerCase();
    const type = String(item.type || "").toLowerCase();
    const healHp = num(item.healHp, 0);
    if (id.startsWith("cooked_") && !id.includes("meat")) return true;
    if (name.includes("cooked") && !name.includes("meat") && (name.includes("fish") || type === "food" || healHp > 0)) return true;
    if (type === "food" && healHp > 0 && id.startsWith("cooked_") && !name.includes("meat")) return true;
    return false;
  }
  function isCookedMeatItem(item){
    if (!item) return false;
    const name = String(item.name || "").toLowerCase();
    return name.includes("cooked") && name.includes("meat");
  }
  const COOKED_MEAT_STAMINA = {
    "Cooked Shadow Hare Meat": 2,
    "Cooked Rotfeather Turkey Meat": 3,
    "Cooked Gloom Fox Meat": 4,
    "Cooked Bloodtusk Boar Meat": 5,
    "Cooked Night Wolf Meat": 6,
    "Cooked Stonehorn Ram Meat": 7,
    "Cooked Thorn Stag Meat": 8,
    "Cooked Grave Bear Meat": 9,
    "Cooked Dire Warg Meat": 10,
    "Cooked Forest Troll Meat": 11
  };
  function getCookedMeatStamina(item){
    const st = Number(item?.healStamina ?? item?.healSt);
    if (Number.isFinite(st) && st > 0) return st;
    const name = String(item?.name || "");
    return COOKED_MEAT_STAMINA[name] || 0;
  }
  function getPotionTier(item){
    if (!item) return 1;
    const id = String(item.id || "");
    const m = id.match(/_(\d+)$/);
    if (m) return Math.max(1, Math.min(7, Number(m[1]) || 1));
    const name = String(item.name || "").toUpperCase();
    const roman = [" VII"," VI"," V"," IV"," III"," II"," I"];
    const map = { " I":1, " II":2, " III":3, " IV":4, " V":5, " VI":6, " VII":7 };
    for (const r of roman) if (name.includes(r)) return map[r];
    return 1;
  }
  function getPotionBonusText(item){
    if (!isPotionItem(item)) return "";
    const tier = Math.max(1, Math.min(5, getPotionTier(item)));
    const pct = tier * 4;
    const luckPct = tier * 3;
    const id = String(item.id || "").toLowerCase();
    const name = String(item.name || "").toLowerCase();
    if (id.includes("strength") || name.includes("strength potion")) return `+${pct}% Attack (100 actions)`;
    if (id.includes("defense") || name.includes("defense potion")) return `+${pct}% Defense (100 actions)`;
    if (id.includes("luck") || name.includes("luck potion")) return `+${luckPct}% Drop Chance (100 actions)`;
    return "";
  }
  function getPotionBonusesForUI(save){
    let atkPct = 0;
    let defPct = 0;
    let luckPct = 0;
    const cons = (save && typeof save.consumables === "object") ? save.consumables : {};
    ["quick_potion1","quick_potion2"].forEach((slot) => {
      const it = cons[slot];
      if (!it) return;
      const qty = num(it.quantity ?? it.qty, 1);
      if (qty <= 0) return;
      const id = String(it.id || "").toLowerCase();
      const name = String(it.name || "").toLowerCase();
      const isStrength = id.includes("strength") || name.includes("strength potion");
      const isDefense = id.includes("defense") || name.includes("defense potion");
      const isLuck = id.includes("luck") || name.includes("luck potion");
      if (!isStrength && !isDefense && !isLuck) return;
      const tier = Math.max(1, Math.min(5, getPotionTier(it)));
      const pct = tier * 0.04;
      const luck = tier * 0.03;
      if (isStrength) atkPct += pct;
      if (isDefense) defPct += pct;
      if (isLuck) luckPct += luck;
    });
    return { atkPct, defPct, luckPct };
  }
  function isSamePotion(a, b){
    if (!a || !b) return false;
    if (a.id && b.id) return a.id === b.id;
    return String(a.name || "") === String(b.name || "") && String(a.img || "") === String(b.img || "");
  }

  function itemStackKey(it) {
    return [
      it.type || "",
      it.crafted ? "crafted" : "",
      it.name || "",
      it.baseName || "",
      it.setId || "",
      it.slot || "",
      it.reqLevel ?? 1,
      it.atk ?? 0,
      it.def ?? 0,
      it.rarity || "",
      it.img || "",
      it.upg ?? 0,
      it.actionsLeft ?? ""
    ].join("::");
  }

function addToStack(arr, item, qty = 1) {
  const key = itemStackKey(item);
  const ex = arr.find(i => i && itemStackKey(i) === key);
  if (ex) ex.quantity = num(ex.quantity, 1) + qty;
  else arr.push({ ...item, quantity: qty });
}

function inventoryUsedUnits(inv) {
  let used = 0;
  for (const it of inv || []) {
    if (!it) continue;
    used += Math.max(1, num(it.quantity ?? it.qty, 1));
  }
  return used;
}

function inventoryMaxUnits(save) {
  return Math.max(0, num(save?.inventoryMaxSlots, 1000));
}

function inventoryHasSpaceFor(save, addUnits = 1) {
  return inventoryUsedUnits(save?.inventory) + Math.max(0, num(addUnits, 0)) <= inventoryMaxUnits(save);
}

function addInventoryItem(save, item, qty = 1, options = {}) {
  if (!save || !item) return { ok: false, reason: "invalid" };
  if (!Array.isArray(save.inventory)) save.inventory = [];

  const amount = Math.max(1, num(qty, 1));
  if (!inventoryHasSpaceFor(save, amount)) {
    return {
      ok: false,
      reason: "full",
      used: inventoryUsedUnits(save.inventory),
      max: inventoryMaxUnits(save)
    };
  }

  const stack = options.stack !== false;
  const prepend = options.prepend === true;
  const stackKeyFn = typeof options.stackKeyFn === "function" ? options.stackKeyFn : itemStackKey;

  if (stack) {
    const key = stackKeyFn(item);
    const ex = save.inventory.find(i => i && stackKeyFn(i) === key);
    if (ex) ex.quantity = num(ex.quantity, 1) + amount;
    else if (prepend) save.inventory.unshift({ ...item, quantity: amount });
    else save.inventory.push({ ...item, quantity: amount });
    return { ok: true, added: amount };
  }

  for (let i = 0; i < amount; i += 1) {
    if (prepend) save.inventory.unshift({ ...item, quantity: 1 });
    else save.inventory.push({ ...item, quantity: 1 });
  }
  return { ok: true, added: amount };
}

window.DSInventory = Object.assign(window.DSInventory || {}, {
  usedUnits: inventoryUsedUnits,
  maxUnits: inventoryMaxUnits,
  hasSpaceFor: inventoryHasSpaceFor,
  addItem: addInventoryItem
});

function consumeFromInventoryIndex(save, idx, qty = 1) {
  const it = save.inventory[idx];
  if (!it) return null;
  const q = num(it.quantity ?? it.qty, 1);
  if (q > qty) { it.quantity = q - qty; return { ...it, quantity: qty }; }
  save.inventory.splice(idx, 1);
  return { ...it, quantity: qty };
}

function removeStackAtIndex(save, idx) {
  const it = save.inventory[idx];
  if (!it) return null;
  save.inventory.splice(idx, 1);
  return it;
}

function getQuickFoodTargetSlot(item){
  if (isCookedMeatItem(item)) return "quick_meat";
  if (isCookedFishItem(item)) return "quick_cooked_fish";
  return null;
}

function getQuickFoodSlotLabel(slotKey){
  if (slotKey === "quick_meat") return "Cooked Meat";
  if (slotKey === "quick_cooked_fish") return "Cooked Fish";
  return "Consumable";
}

function getQuickPotionSlotLabel(slotKey){
  return slotKey === "quick_potion2" ? "Potion 2" : "Potion 1";
}

function equipInventoryPotionToQuickSlot(save, invIndex, slotKey, takeQty){
  const invIt = save.inventory?.[invIndex];
  if (!invIt) return { ok:false, msg:"Item missing." };
  if (!isPotionItem(invIt)) return { ok:false, msg:"Not a potion." };

  const existing = save.consumables?.[slotKey];
  const currentQty = num(existing?.quantity ?? existing?.qty, 0);
  const invQty = num(invIt.quantity ?? invIt.qty, 1);
  let qty = Math.max(1, Math.floor(num(takeQty, 1)));
  qty = clamp(qty, 1, Math.min(10 - currentQty, invQty));
  if (qty <= 0) return { ok:false, msg:"Slot is full." };

  if (existing && !isSamePotion(existing, invIt)) {
    return { ok:false, msg:`${getQuickPotionSlotLabel(slotKey)} has different potion.` };
  }

  const picked = consumeFromInventoryIndex(save, invIndex, qty);
  if (!picked) return { ok:false, msg:"Item missing." };
  picked.quantity = qty;
  if (!Number.isFinite(Number(picked.actionsLeft)) || Number(picked.actionsLeft) <= 0) picked.actionsLeft = 100;

  if (!save.consumables || typeof save.consumables !== "object") save.consumables = {};
  if (existing) {
    if (!Number.isFinite(Number(existing.actionsLeft)) || Number(existing.actionsLeft) <= 0) existing.actionsLeft = 100;
    existing.quantity = currentQty + qty;
  } else {
    save.consumables[slotKey] = picked;
  }
  return { ok:true, msg:`Drank ${qty} into ${getQuickPotionSlotLabel(slotKey)}.` };
}

function openQuickPotionPicker(slotKey){
  const save = ensureSave(loadSave());
  const equipped = save.consumables?.[slotKey] || null;
  const currentQty = num(equipped?.quantity ?? equipped?.qty, 0);
  const remainingCap = Math.max(0, 10 - currentQty);
  const items = (save.inventory || [])
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => isPotionItem(it) && num(it.quantity ?? it.qty, 1) > 0)
    .filter(({ it }) => !equipped || isSamePotion(equipped, it));

  const box = ensureInspectorBoxReplace();
  if (!box) return;
  window.DS?.pause?.();

  const equippedInfo = equipped ? `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px;">
      <img src="${equipped.img || ""}" alt="${equipped.name || "Potion"}" style="width:72px;height:72px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
      <div style="flex:1;">
        <div style="font-weight:900;font-size:18px;">${equipped.name || getQuickPotionSlotLabel(slotKey)}</div>
        <div style="opacity:.85;margin-top:4px;">In slot: <b>${currentQty}/10</b></div>
        <div style="opacity:.85;margin-top:4px;">${getPotionBonusText(equipped) || ""}</div>
        <div style="opacity:.75;margin-top:6px;font-size:12px;">Remove is unavailable. Wait until the potion actions finish.</div>
      </div>
    </div>
  ` : `<div style="opacity:.85;margin-top:6px;">Choose a potion to drink into <b>${getQuickPotionSlotLabel(slotKey)}</b>.</div>`;

  box.className = "dsInspector";
  if (!items.length || remainingCap <= 0) {
    box.innerHTML = `
      <div style="font-weight:900;font-size:20px;">${getQuickPotionSlotLabel(slotKey)}</div>
      ${equippedInfo}
      <div style="margin-top:10px;opacity:.88;">${remainingCap <= 0 ? "Slot already has 10 potions." : "No available matching potions in your inventory."}</div>
    `;
    return;
  }

  box.innerHTML = `
    <div style="font-weight:900;font-size:20px;">${getQuickPotionSlotLabel(slotKey)}</div>
    <div style="margin-top:10px;display:grid;gap:10px;">
      ${equippedInfo}
      ${items.map(({ it, idx }) => {
        const q = num(it.quantity ?? it.qty, 1);
        const maxTake = Math.min(remainingCap, q);
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;border:2px solid #333;background:#151520;color:#fff;text-align:left;">
            <img src="${it.img || ""}" alt="${it.name || "Potion"}" style="width:54px;height:54px;border-radius:10px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:900;">${it.name || "Potion"}</div>
              <div style="opacity:.82;font-size:12px;margin-top:4px;">${getPotionBonusText(it) || ""} • Qty: ${q}</div>
            </div>
            <input type="number" min="1" max="${maxTake}" value="1" data-quick-potion-qty="${idx}" style="width:64px;padding:8px 6px;border-radius:10px;border:2px solid #333;background:#0f0f16;color:#fff;">
            <button type="button" data-quick-potion-pick="${idx}" style="padding:8px 12px;border-radius:10px;border:2px solid #333;background:#222638;color:#fff;font-weight:800;cursor:pointer;">Drink</button>
          </div>
        `;
      }).join("")}
    </div>
    <div id="dsMsg" style="margin-top:10px;opacity:.9;text-align:center;"></div>
  `;

  const msg = (t) => {
    const m = document.getElementById("dsMsg");
    if (m) m.textContent = t;
  };

  box.querySelectorAll("[data-quick-potion-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.quickPotionPick);
      const qtyInput = box.querySelector(`[data-quick-potion-qty="${idx}"]`);
      let takeQty = Math.floor(Number(qtyInput?.value));
      if (!Number.isFinite(takeQty)) takeQty = 1;
      const s = ensureSave(loadSave());
      const res = equipInventoryPotionToQuickSlot(s, idx, slotKey, takeQty);
      if (!res.ok) { msg(`❌ ${res.msg}`); return; }
      setSave(s);
      msg(`✅ ${res.msg}`);
      openQuickPotionPicker(slotKey);
    });
  });
}

function equipInventoryFoodToQuickSlot(save, invIndex, slotKey){
  const invIt = save.inventory?.[invIndex];
  if (!invIt) return { ok:false, msg:"Item missing." };
  const allowedSlot = getQuickFoodTargetSlot(invIt);
  if (!allowedSlot || allowedSlot !== slotKey) return { ok:false, msg:"Cannot equip this there." };

  const invQty = num(invIt.quantity ?? invIt.qty, 1);
  let takeQty = Math.max(1, Math.floor(num(arguments[3], 1)));
  takeQty = clamp(takeQty, 1, Math.min(200, invQty));

  const picked = consumeFromInventoryIndex(save, invIndex, takeQty);
  if (!picked) return { ok:false, msg:"Item missing." };
  picked.quantity = takeQty;

  if (!save.consumables || typeof save.consumables !== "object") save.consumables = {};
  const existing = save.consumables[slotKey];
  if (existing && String(existing.name || "") === String(picked.name || "")) {
    existing.quantity = num(existing.quantity ?? existing.qty, 1) + takeQty;
  } else if (!existing) {
    save.consumables[slotKey] = picked;
  } else {
    addToStack(save.inventory, picked, takeQty);
    return { ok:false, msg:`${getQuickFoodSlotLabel(slotKey)} slot already has different item.` };
  }
  return { ok:true, msg:`Equipped to ${getQuickFoodSlotLabel(slotKey)}.` };
}

function unequipQuickSlotToInventory(save, slotKey){
  const it = save.consumables?.[slotKey];
  if (!it) return { ok:false, msg:"Nothing equipped." };
  const qty = num(it.quantity ?? it.qty, 1);
  let takeQty = Math.max(1, Math.floor(num(arguments[2], 1)));
  takeQty = clamp(takeQty, 1, qty);
  if (!inventoryHasSpaceFor(save, takeQty)) {
    return { ok:false, msg:"No more inventory space." };
  }
  if (qty > takeQty) {
    it.quantity = qty - takeQty;
    addToStack(save.inventory, { ...it, quantity: takeQty }, takeQty);
  } else {
    save.consumables[slotKey] = null;
    addToStack(save.inventory, { ...it, quantity: takeQty }, takeQty);
  }
  return { ok:true, msg:`Unequipped from ${getQuickFoodSlotLabel(slotKey)}.` };
}

function openQuickConsumableInspector(slotKey) {
  const save = ensureSave(loadSave());
  const item = save.consumables?.[slotKey];
  if (!item) {
    restoreLeftPanelNodes();
    window.DS?.resume?.();
    return;
  }

  const q = num(item.quantity ?? item.qty, 1);
  const healHp = num(item.healHp, 0);
  const healSt = num(item.healStamina, 0);
  const detailParts = [];
  if (healHp > 0) detailParts.push(`Provides +${healHp} HP`);
  if (healSt > 0) detailParts.push(`Provides +${healSt} ST`);
  detailParts.push(`Quantity: ${q}`);

  const html = `
    <div style="display:flex;gap:12px;align-items:center;">
      <img src="${item.img || ""}" alt="${item.name || "Item"}"
        style="width:84px;height:84px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
      <div style="flex:1;">
        <div style="font-weight:900;font-size:20px;">${item.name || "Item"}</div>
        <div style="opacity:.85;margin-top:4px;">Equipped in: <b>${getQuickFoodSlotLabel(slotKey)}</b></div>
        <div style="opacity:.9;margin-top:6px;">${detailParts.join(" • ")}</div>
      </div>
    </div>

    <div class="dsBtnRow">
      <button id="dsUnequipQuickFood">Remove</button>
      <input id="dsUnequipQuickFoodQty" type="number" min="1" max="${q}" value="${q}" style="width:88px;padding:8px 10px;border-radius:10px;border:2px solid #333;background:#0f0f16;color:#fff;">
      <button id="dsUnequipQuickFoodAll">Remove All</button>
    </div>

    <div id="dsMsg" style="margin-top:10px;opacity:.9;text-align:center;"></div>
  `;

  const box = ensureInspectorBoxReplace();
  if (!box) return;
  window.DS?.pause?.();
  box.className = "dsInspector";
  box.innerHTML = html;

  const msg = (t) => {
    const m = document.getElementById("dsMsg");
    if (m) m.textContent = t;
  };

  const getUnequipQty = () => {
    const input = document.getElementById("dsUnequipQuickFoodQty");
    let v = Math.floor(Number(input?.value));
    if (!Number.isFinite(v)) v = 1;
    v = clamp(v, 1, q);
    if (input) input.value = String(v);
    return v;
  };

  document.getElementById("dsUnequipQuickFood")?.addEventListener("click", () => {
    const s = ensureSave(loadSave());
    const res = unequipQuickSlotToInventory(s, slotKey, getUnequipQty());
    if (!res.ok) { msg(`❌ ${res.msg}`); return; }
    setSave(s);
    msg(`✅ ${res.msg}`);
    restoreLeftPanelNodes();
    window.DS?.resume?.();
  });

  document.getElementById("dsUnequipQuickFoodAll")?.addEventListener("click", () => {
    const s = ensureSave(loadSave());
    const qtyNow = num(s.consumables?.[slotKey]?.quantity ?? s.consumables?.[slotKey]?.qty, 1);
    const res = unequipQuickSlotToInventory(s, slotKey, qtyNow);
    if (!res.ok) { msg(`❌ ${res.msg}`); return; }
    setSave(s);
    msg(`✅ ${res.msg}`);
    restoreLeftPanelNodes();
    window.DS?.resume?.();
  });
}

function openQuickConsumablePicker(slotKey) {
  const save = ensureSave(loadSave());
  const matchFn = slotKey === "quick_meat" ? isCookedMeatItem : isCookedFishItem;
  const items = (save.inventory || [])
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => matchFn(it) && num(it.quantity ?? it.qty, 1) > 0);

  const box = ensureInspectorBoxReplace();
  if (!box) return;
  window.DS?.pause?.();

  if (!items.length) {
    box.className = "dsInspector";
    box.innerHTML = `
      <div style="font-weight:900;font-size:20px;">${getQuickFoodSlotLabel(slotKey)}</div>
      <div style="margin-top:10px;opacity:.88;">No available ${getQuickFoodSlotLabel(slotKey).toLowerCase()} items in your inventory.</div>
    `;
    return;
  }

  box.className = "dsInspector";
  box.innerHTML = `
    <div style="font-weight:900;font-size:20px;">Equip ${getQuickFoodSlotLabel(slotKey)}</div>
    <div style="margin-top:10px;display:grid;gap:10px;">
      ${items.map(({ it, idx }) => {
        const q = num(it.quantity ?? it.qty, 1);
        const hp = num(it.healHp, 0);
        const st = num(it.healStamina, 0);
        const maxTake = Math.min(200, q);
        const details = [];
        if (hp > 0) details.push(`+${hp} HP`);
        if (st > 0) details.push(`+${st} ST`);
        details.push(`Qty: ${q}`);
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;border:2px solid #333;background:#151520;color:#fff;text-align:left;">
            <img src="${it.img || ""}" alt="${it.name || "Item"}" style="width:54px;height:54px;border-radius:10px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:900;">${it.name || "Item"}</div>
              <div style="opacity:.82;font-size:12px;margin-top:4px;">${details.join(" • ")}</div>
            </div>
            <input type="number" min="1" max="${maxTake}" value="${maxTake}" data-quick-pick-qty="${idx}" style="width:64px;padding:8px 6px;border-radius:10px;border:2px solid #333;background:#0f0f16;color:#fff;">
            <button type="button" data-quick-pick="${idx}" style="padding:8px 12px;border-radius:10px;border:2px solid #333;background:#222638;color:#fff;font-weight:800;cursor:pointer;">Equip</button>
          </div>
        `;
      }).join("")}
    </div>
    <div id="dsMsg" style="margin-top:10px;opacity:.9;text-align:center;"></div>
  `;

  const msg = (t) => {
    const m = document.getElementById("dsMsg");
    if (m) m.textContent = t;
  };

  box.querySelectorAll("[data-quick-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.quickPick);
      const qtyInput = box.querySelector(`[data-quick-pick-qty="${idx}"]`);
      let takeQty = Math.floor(Number(qtyInput?.value));
      if (!Number.isFinite(takeQty)) takeQty = 1;
      const s = ensureSave(loadSave());
      const res = equipInventoryFoodToQuickSlot(s, idx, slotKey, takeQty);
      if (!res.ok) { msg(`❌ ${res.msg}`); return; }
      setSave(s);
      msg(`✅ ${res.msg}`);
      openQuickConsumableInspector(slotKey);
    });
  });
}

function getSetCounts(equipment){
  const counts = {};
  Object.values(equipment || {}).forEach(it => {
    if(!it) return;
    const sid = String(it.setId || "").toLowerCase();
    if (sid) {
      counts[sid] = (counts[sid] || 0) + 1;
      return;
    }
    const n = String(it.baseName || it.name || "").toLowerCase();
    if (n.includes("cryptwarden")) counts.cryptwarden = (counts.cryptwarden || 0) + 1;
  });
  return counts;
}

function tierPct(count, tiers){
  let pct = 0;
  for (const [need, val] of tiers){
    if (count >= need) pct = val;
  }
  return pct;
}

function getSetBonusPcts(equipment){
  const counts = getSetCounts(equipment);
  const cryptCount = counts.cryptwarden || 0;
  const iceCount = counts.icewarden || 0;
  const frostCount = counts.frostveil || 0;

  const cryptAtk = tierPct(cryptCount, [[2,0.02],[3,0.04],[4,0.06]]);
  const icePct = tierPct(iceCount, [[2,0.02],[4,0.04],[6,0.06],[8,0.08],[10,0.10]]);
  const goldPct = tierPct(frostCount, [[2,0.04],[4,0.08],[6,0.12]]);

  return {
    atkPct: cryptAtk + icePct,
    defPct: icePct,
    goldPct
  };
}

function recomputeTotals(save) {
  const baseAtk = num(save.heroAttack, 10);
  const baseDef = num(save.heroDefense, 10);
  const petApi = window.DS?.pets;
  const petBonuses = petApi?.getCombatPetBonuses ? (petApi.getCombatPetBonuses(save?.pets?.combat) || {}) : {};

  let atkB = 0, defB = 0;
  Object.values(save.equipment || {}).forEach(it => {
    if (!it) return;
    atkB += num(it.atk, 0);
    defB += num(it.def, 0);
  });

  const rawAtk = baseAtk + atkB + num(petBonuses.atkFlat, 0);
  const rawDef = baseDef + defB + num(petBonuses.defFlat, 0);

  const bonuses = getSetBonusPcts(save.equipment);
  const atkWithSet = Math.floor(rawAtk * (1 + bonuses.atkPct + num(petBonuses.atkPct, 0)));
  const defWithSet = Math.floor(rawDef * (1 + bonuses.defPct + num(petBonuses.defPct, 0)));

  save.attackTotal = atkWithSet;
  save.defenseTotal = defWithSet;
  save.setBonusAtkPct = bonuses.atkPct + num(petBonuses.atkPct, 0);
  save.setBonusDefPct = bonuses.defPct + num(petBonuses.defPct, 0);
  save.setBonusGoldPct = bonuses.goldPct;
  save._atkFromPet = num(petBonuses.atkFlat, 0);
  save._defFromPet = num(petBonuses.defFlat, 0);
  save._petBonusAtkPct = num(petBonuses.atkPct, 0);
  save._petBonusDefPct = num(petBonuses.defPct, 0);
}

function sellPrice(item) {
    const base = 5 + num(item.atk, 0) * 3 + num(item.def, 0) * 3;
    return Math.max(1, Math.floor(base * rarityMult(item.rarity)));
  }

function showBankSentPopup(itemName, qty) {
  const box = ensureInspectorBoxReplace();
  if (!box) return;
  box.innerHTML = `
    <div style="display:flex;min-height:120px;align-items:center;justify-content:center;">
      <div style="padding:12px 16px;border-radius:12px;border:1px solid #8b6a2a;background:linear-gradient(180deg,#22252f 0%,#141722 100%);box-shadow:0 10px 24px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06);text-align:center;color:#fff;">
        <div style="font-weight:800;font-size:16px;line-height:1.2;white-space:nowrap;">Sent ${qty}x ${itemName || "Item"} to the bank.</div>
      </div>
    </div>
  `;
}

function openPetInspector(slotKey) {
  const save = ensureSave(loadSave());
  const pet = normalizePet(slotKey, save?.pets?.[slotKey]);
  if (!pet) {
    restoreLeftPanelNodes();
    window.DS?.resume?.();
    return;
  }

  const level = Math.max(1, Math.round(num(pet.level, 1)));
  const xp = Math.max(0, Math.round(num(pet.xp, 0)));
  const xpNext = Math.max(1, Math.round(num(pet.xpNext, petXpNextForLevel(level))));
  const slotDef = PET_SLOT_DEFS.find((x) => x.key === slotKey);
  const isActive = pet.active !== false;
  const nextTier = getPetTierData(slotKey, pet.family, num(pet.tier, 1) + 1);
  const evolveLevel = getNextPetEvolveLevel(pet.tier);
  const awaitingEvolution = isPetAwaitingEvolution(slotKey, pet);
  const imgHtml = pet.img
    ? `<img src="${pet.img}" alt="${pet.name || slotDef?.label || "Pet"}" style="width:84px;height:84px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">`
    : `<div style="width:84px;height:84px;border-radius:12px;border:2px solid #333;background:#0f0f16;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#eef2ff;">${pet.iconText || slotDef?.emoji || "PET"}</div>`;

  const bonusParts = [];
  if (slotKey === "combat") {
    bonusParts.push(`Attack/Defense + ${Math.round(num(pet.atkPerLevel, 0) * level * 100) / 100}`);
    const combatMilestones = getCombatPetMilestoneBonuses(level);
    const atkPct = Math.round(num(combatMilestones.atkPct, 0) * 1000) / 10;
    const defPct = Math.round(num(combatMilestones.defPct, 0) * 1000) / 10;
    if (atkPct > 0 || defPct > 0) {
      const pctParts = [];
      if (atkPct > 0) pctParts.push(`Attack +${atkPct}%`);
      if (defPct > 0) pctParts.push(`Defense +${defPct}%`);
      bonusParts.push(pctParts.join("<br>"));
    }
  } else if (slotKey === "fortune") {
    bonusParts.push(`Gold Bonus +${Math.round(num(pet.goldPctPerLevel, 0) * level * 1000) / 10}%`);
    const fortuneMilestones = getFortunePetMilestoneBonuses(level);
    const luckPct = Math.round(num(fortuneMilestones.luckPct, 0) * 1000) / 10;
    if (luckPct > 0) bonusParts.push(`Luck +${luckPct}%`);
  } else if (slotKey === "gathering") {
    bonusParts.push(`Gathering XP +${Math.round(num(pet.professionXpPctPerLevel, 0) * level * 1000) / 10}%`);
    const gatheringMilestones = getGatheringPetMilestoneBonuses(level);
    const doubleGatherPct = Math.round(num(gatheringMilestones.doubleGatherPct, 0) * 1000) / 10;
    if (doubleGatherPct > 0) bonusParts.push(`Double Gather Chance +${doubleGatherPct}%`);
  } else if (slotKey === "artisan") {
    bonusParts.push(`Artisan XP +${Math.round(num(pet.professionXpPctPerLevel, 0) * level * 1000) / 10}%`);
    const artisanMilestones = getArtisanPetMilestoneBonuses(level);
    const doubleCraftPct = Math.round(num(artisanMilestones.doubleCraftPct, 0) * 1000) / 10;
    if (doubleCraftPct > 0) bonusParts.push(`Double Craft Chance +${doubleCraftPct}%`);
  }
  const nextTierHtml = nextTier ? `
    <div style="display:flex;gap:10px;align-items:center;justify-content:flex-end;min-width:170px;">
      <div style="text-align:right;">
        <div style="opacity:.82;font-size:12px;">Evolves at Level ${evolveLevel}</div>
        <div style="opacity:.72;font-size:11px;margin-top:3px;">Next Tier: ${nextTier.name || "Tier " + nextTier.tier}</div>
      </div>
      ${nextTier.img
        ? `<img src="${nextTier.img}" alt="${nextTier.name || "Next Tier"}" style="width:52px;height:52px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">`
        : `<div style="width:52px;height:52px;border-radius:12px;border:2px solid #333;background:#0f0f16;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#eef2ff;">${nextTier.iconText || "PET"}</div>`}
    </div>
  ` : `
    <div style="text-align:right;min-width:170px;">
      <div style="opacity:.82;font-size:12px;">Max Tier Reached</div>
    </div>
  `;

  const box = ensureInspectorBoxReplace();
  if (!box) return;
  window.DS?.pause?.();
  box.className = "dsInspector";
  box.innerHTML = `
    <div style="display:flex;gap:16px;align-items:flex-start;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:0 0 auto;min-width:84px;">
        ${imgHtml}
        <div style="opacity:.88;font-size:12px;">Level ${level}</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:flex-start;min-height:108px;">
        <div style="font-weight:900;font-size:20px;line-height:1.15;margin-top:0;">${pet.name || slotDef?.label || "Pet"}</div>
        ${bonusParts.length ? `<div style="opacity:.9;margin-top:8px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;line-height:1.2;">${bonusParts.map((part) => `<div>${part}</div>`).join("")}</div>` : ``}
      </div>
      ${nextTierHtml}
    </div>
    <div class="dsBtnRow">
      <button id="dsPetToggle">${isActive ? "Unequip" : "Equip"}</button>
      ${nextTier && awaitingEvolution ? `<button id="dsPetEvolve">Evolve (${new Intl.NumberFormat("el-GR").format(num(pet.nextUpgradeCost, 0))} Gold)</button>` : ``}
    </div>
    <div id="dsMsg" style="margin-top:10px;opacity:.9;text-align:center;"></div>
  `;

  const msg = (t) => {
    const m = document.getElementById("dsMsg");
    if (m) m.textContent = t;
  };

  document.getElementById("dsPetToggle")?.addEventListener("click", () => {
    const s = ensureSave(loadSave());
    const currentPet = normalizePet(slotKey, s?.pets?.[slotKey]);
    if (!currentPet) { msg("Pet missing."); return; }
    currentPet.active = !currentPet.active;
    s.pets[slotKey] = currentPet;
    setSave(s);
    window.dispatchEvent(new Event("ds:save"));
    openPetInspector(slotKey);
  });
  document.getElementById("dsPetEvolve")?.addEventListener("click", () => {
    const s = ensureSave(loadSave());
    const currentPet = normalizePet(slotKey, s?.pets?.[slotKey]);
    if (!currentPet) { msg("Pet missing."); return; }
    const nextTierData = getPetTierData(slotKey, currentPet.family, num(currentPet.tier, 1) + 1);
    if (!nextTierData) { msg("No further evolution."); return; }
    if (!isPetAwaitingEvolution(slotKey, currentPet)) { msg("Pet is not ready to evolve."); return; }
    const cost = Math.max(0, num(currentPet.nextUpgradeCost, nextTierData.cost));
    s.gold = num(s.gold, 0);
    if (s.gold < cost) { msg("Not enough gold."); return; }
    s.gold -= cost;
    currentPet.tier = num(currentPet.tier, 1) + 1;
    currentPet.xp = 0;
    currentPet.xpNext = petXpNextForLevel(currentPet.level);
    s.pets[slotKey] = normalizePet(slotKey, currentPet);
    setSave(s);
    window.dispatchEvent(new Event("ds:save"));
    openPetInspector(slotKey);
  });
}

function openInspector(invIndex, item) {
  const save = ensureSave(loadSave());
  item = item || save.inventory?.[invIndex];
  if (!item) {
    restoreLeftPanelNodes();
    window.DS?.resume?.();
    return;
  }
  const isSetItem = !!item.setId;
  const isCraftedItem = !!item.crafted;
  const rarityKey = String(item.rarity || "").toLowerCase();
  const q = num(item.quantity ?? item.qty, 1);
  const imgBg = isSetItem
    ? "var(--rarity-set)"
    : isCraftedItem
    ? "var(--rarity-crafted)"
    : (rarityKey ? `var(--rarity-${rarityKey})` : "#0f0f16");

      const isGear = isGearItem(item);
      const isPotion = isPotionItem(item);
      const quickFoodSlot = getQuickFoodTargetSlot(item);
      const showSellQty = true;

    const p1 = sellPrice(item);

    const healHp = num(item.healHp, 0);
    const healSt = num(item.healStamina, 0);
    const showEat = (item.type === "food" && (healHp > 0 || healSt > 0));

      const detailLine = (() => {
        const a = num(item.atk, 0);
        const d = num(item.def, 0);
        const parts = [];
        if (a) parts.push(`ATK +${a}`);
        if (d) parts.push(`DEF +${d}`);
        const potionBonus = getPotionBonusText(item);
        if (potionBonus) parts.push(potionBonus);
        if (showEat) {
          const eatParts = [];
          if (healHp > 0) eatParts.push(`+${healHp} HP`);
          if (healSt > 0) eatParts.push(`+${healSt} ST`);
          if (eatParts.length) parts.push(`Provides ${eatParts.join(", ")}`);
      }
      if (parts.length) {
        parts.push(`Quantity: ${q}`);
        return parts.join(" • ");
      }
      if (q > 0) return `Quantity: ${q}`;
      return "—";
    })();

  const html = `
      <div style="display:flex;gap:12px;align-items:center;">
            <img src="${item.img || ""}" alt="${item.name || "Item"}"
           style="width:84px;height:84px;border-radius:12px;border:2px solid #333;object-fit:cover;background:${imgBg};">
        <div style="flex:1;">
          <div style="font-weight:900;font-size:20px;">${item.name || "Item"}</div>
          <div style="opacity:.85;margin-top:4px;">
            ${item.rarity ? `Rarity: <b>${item.rarity}</b>` : "" }
            ${isGear ? ` • Slot: <b>${item.slot || "-"}</b>` : "" }
            ${isGear ? ` • Req Lv <b>${num(item.reqLevel,1)}</b>` : "" }
          </div>
          <div style="opacity:.9;margin-top:6px;">
            ${detailLine}
          </div>
        </div>
      </div>

        <div class="dsBtnRow">
          ${isGear ? `<button id="dsEquip" ${canEquip(save,item) ? "" : "disabled"}>🛡 Equip</button>` : ``}
          ${isPotion ? `<button id="dsEquipPotion">🧪 Equip Potion</button>` : ``}
        </div>

      ${showEat ? `
        <div class="dsSellRow">
          <button id="dsEatQtyBtn">Eat Amount</button>
          <input id="dsEatQty" type="number" min="1" max="${q}" value="1">
          <div id="dsEatInfo" class="dsSellInfo">
            <span id="dsEatTotalText">Total: ${healHp > 0 ? `+${healHp} HP` : ``}${healHp > 0 && healSt > 0 ? `, ` : ``}${healSt > 0 ? `+${healSt} ST` : ``}</span>
            <span id="dsEatNeedInfo" style="font-size:11px;font-style:italic;opacity:.8;"></span>
          </div>
        </div>
      ` : ``}

      ${showSellQty ? `
        <div class="dsSellRow">
          <button id="dsSellQtyBtn">Sell Amount</button>
          <input id="dsSellQty" type="number" min="1" max="${q}" value="1">
          <div id="dsSellPrice" class="dsSellInfo">Price: ${p1} Gold</div>
        </div>
      ` : ``}

      <div class="dsSellRow">
        <button id="dsBankBtn">🏦 Send to Bank</button>
        <input id="dsBankQty" type="number" min="1" max="${q}" value="${q}">
      </div>

      <div id="dsMsg" style="margin-top:10px;opacity:.9;text-align:center;"></div>
    `;

  let box = null;
  try {
    box = ensureInspectorBoxReplace();
    if (!box) return;
    window.DS?.pause?.();
    box.className = "dsInspector";
    box.innerHTML = html;
    if (!box.firstElementChild) {
      box.innerHTML = `<div style="color:#fff;font-weight:800;">${item.name || "Item"}</div>`;
    }
  } catch (e) {
    restoreLeftPanelNodes();
    window.DS?.resume?.();
    console.error("[UI] openInspector failed", e);
    return;
  }

    const msg = (t) => {
      const m = document.getElementById("dsMsg");
      if (m) m.textContent = t;
    };

      document.getElementById("dsEquip")?.addEventListener("click", () => {
        const s = ensureSave(loadSave());
        const invIt = s.inventory[invIndex];
        if (!invIt) { msg("❌ Item missing."); return; }
        if (!canEquip(s, invIt)) { msg("❌ Cannot equip."); return; }

      const slotKey = invIt.slot;
      const prev = s.equipment[slotKey] || null;

      const picked = consumeFromInventoryIndex(s, invIndex, 1);
      if (!picked) { msg("❌ Item missing."); return; }

      s.equipment[slotKey] = picked;
      if (prev) addToStack(s.inventory, prev, 1);

      recomputeTotals(s);
        setSave(s);
        msg("✅ Equipped.");
      });

      document.getElementById("dsEquipPotion")?.addEventListener("click", () => {
        const s = ensureSave(loadSave());
        const invIt = s.inventory[invIndex];
        if (!invIt) { msg("❌ Item missing."); return; }
        if (!isPotionItem(invIt)) { msg("❌ Not a potion."); return; }

        const p1 = s.consumables?.quick_potion1;
        const p2 = s.consumables?.quick_potion2;
        let slotKey = null;
        if (p1 && isSamePotion(p1, invIt) && num(p1.quantity ?? p1.qty, 1) < 10) slotKey = "quick_potion1";
        else if (p2 && isSamePotion(p2, invIt) && num(p2.quantity ?? p2.qty, 1) < 10) slotKey = "quick_potion2";
        else if (!p1) slotKey = "quick_potion1";
        else if (!p2) slotKey = "quick_potion2";
        if (!slotKey) { msg("❌ Potion slots are full (max 10 each)."); return; }

        const picked = consumeFromInventoryIndex(s, invIndex, 1);
        if (!picked) { msg("❌ Item missing."); return; }
        picked.quantity = 1;
        if (!Number.isFinite(Number(picked.actionsLeft)) || Number(picked.actionsLeft) <= 0) picked.actionsLeft = 100;

        if (!s.consumables || typeof s.consumables !== "object") s.consumables = {};
        const existing = s.consumables[slotKey];
        if (existing && isSamePotion(existing, picked)) {
          if (!Number.isFinite(Number(existing.actionsLeft)) || Number(existing.actionsLeft) <= 0) existing.actionsLeft = 100;
          existing.quantity = num(existing.quantity ?? existing.qty, 1) + 1;
        } else {
          s.consumables[slotKey] = picked;
        }
        setSave(s);
        msg(`✅ Equipped to ${slotKey === "quick_potion1" ? "Potion 1" : "Potion 2"}.`);
      });

    const eatQtyInput = document.getElementById("dsEatQty");
    const eatQtyBtn = document.getElementById("dsEatQtyBtn");
    const eatTotalText = document.getElementById("dsEatTotalText");
    const eatNeedInfo = (() => {
      const parts = [];
      if (healHp > 0) {
        const missingHp = Math.max(0, num(save.heroHPMax, 0) - num(save.heroHP, 0));
        parts.push(`Full HP: ${Math.floor(missingHp / healHp)}`);
      }
      if (healSt > 0) {
        const missingSt = Math.max(0, num(save.staminaMax, 0) - num(save.stamina, 0));
        parts.push(`Full ST: ${Math.floor(missingSt / healSt)}`);
      }
      return ` (${parts.join(" • ")})`;
    })();
    const eatNeedInfoEl = document.getElementById("dsEatNeedInfo");
    if (eatNeedInfoEl) eatNeedInfoEl.textContent = eatNeedInfo;
    const getEatQty = (maxQty) => {
      if (!eatQtyInput) return 1;
      let v = Math.floor(Number(eatQtyInput.value));
      if (!Number.isFinite(v)) v = 1;
      v = clamp(v, 1, Math.max(1, maxQty));
      eatQtyInput.value = String(v);
      return v;
    };
    const updateEatInfo = () => {
      if (!eatTotalText) return;
      const eatQty = getEatQty(q);
      const parts = [];
      if (healHp > 0) parts.push(`+${healHp * eatQty} HP`);
      if (healSt > 0) parts.push(`+${healSt * eatQty} ST`);
      eatTotalText.textContent = `Total: ${parts.join(", ")}`;
    };
    eatQtyInput?.addEventListener("input", updateEatInfo);
    eatQtyInput?.addEventListener("change", updateEatInfo);
    updateEatInfo();

    const handleEat = () => {
      const s = ensureSave(loadSave());
      const invIt = s.inventory[invIndex];
      if (!invIt) { msg("❌ Item missing."); return; }

      const hp = num(invIt.healHp, 0);
      const st = num(invIt.healStamina, 0);
      if (!(invIt.type === "food" && (hp > 0 || st > 0))) { msg("❌ Cannot eat this."); return; }

      const invQty = num(invIt.quantity ?? invIt.qty, 1);
      const eatQty = clamp(getEatQty(invQty), 1, invQty);
      const removed = consumeFromInventoryIndex(s, invIndex, eatQty);
      if (!removed) { msg("❌ Item missing."); return; }

      if (hp > 0) s.heroHP = clamp(num(s.heroHP, 0) + (hp * eatQty), 0, s.heroHPMax);
      if (st > 0) s.stamina = clamp(num(s.stamina, 0) + (st * eatQty), 0, s.staminaMax);

      setSave(s);

      const parts = [];
      if (hp > 0) parts.push(`+${hp * eatQty} HP`);
      if (st > 0) parts.push(`+${st * eatQty} ST`);
      msg(`✅ Ate ${eatQty} ${removed.name || "Food"} (${parts.join(", ")}).`);

      if (!s.inventory[invIndex]) {
        restoreLeftPanelNodes();
        window.DS?.resume?.();
      }
    };

    eatQtyBtn?.addEventListener("click", handleEat);

    const qtyInput = document.getElementById("dsSellQty");
    const qtyBtn = document.getElementById("dsSellQtyBtn");
    const qtyPrice = document.getElementById("dsSellPrice");
    const getQty = () => {
      if (!qtyInput) return 1;
      let v = Math.floor(Number(qtyInput.value));
      if (!Number.isFinite(v)) v = 1;
      v = clamp(v, 1, q);
      qtyInput.value = String(v);
      return v;
    };
    const updateQtyBtn = () => {
      if (!qtyBtn) return;
      const v = getQty();
      qtyBtn.textContent = `Sell Amount`;
      if (qtyPrice) qtyPrice.textContent = `Price: ${p1 * v} Gold`;
    };
    qtyInput?.addEventListener("input", updateQtyBtn);
    qtyInput?.addEventListener("change", updateQtyBtn);
    updateQtyBtn();

    qtyBtn?.addEventListener("click", () => {
      const s = ensureSave(loadSave());
      const invIt = s.inventory[invIndex];
      if (!invIt) { msg("❌ Item missing."); return; }

      const invQty = num(invIt.quantity ?? invIt.qty, 1);
      const sellQty = clamp(getQty(), 1, invQty);

      if (sellQty >= invQty){
        removeStackAtIndex(s, invIndex);
      } else {
        invIt.quantity = invQty - sellQty;
      }

      const total = sellPrice(invIt) * sellQty;
      s.gold = num(s.gold, 0) + total;
      setSave(s);
      msg(`Sold x${sellQty} for +${total} gold.`);
      const cur = s.inventory[invIndex];
      const newQty = cur ? num(cur.quantity ?? cur.qty, 1) : 0;
      if (newQty <= 0){
        restoreLeftPanelNodes();
        window.DS?.resume?.();
        return;
      }
      openInspector(invIndex);
    });

    const bankQtyInput = document.getElementById("dsBankQty");
    const bankBtn = document.getElementById("dsBankBtn");
    const getBankQty = () => {
      if (!bankQtyInput) return q;
      let v = Math.floor(Number(bankQtyInput.value));
      if (!Number.isFinite(v)) v = q;
      v = clamp(v, 1, q);
      bankQtyInput.value = String(v);
      return v;
    };
    const updateBankBtn = () => {
      if (!bankBtn) return;
      getBankQty();
      bankBtn.textContent = `🏦 Send to Bank`;
    };
    bankQtyInput?.addEventListener("input", updateBankBtn);
    bankQtyInput?.addEventListener("change", updateBankBtn);
    updateBankBtn();

    bankBtn?.addEventListener("click", () => {
      const s = ensureSave(loadSave());
      const invIt = s.inventory[invIndex];
      if (!invIt) { msg("❌ Item missing."); return; }

      const sendQty = clamp(getBankQty(), 1, num(invIt.quantity ?? invIt.qty, 1));
      const stack = consumeFromInventoryIndex(s, invIndex, sendQty);
      if (!stack) { msg("❌ Item missing."); return; }

      addToStack(s.bank, stack, num(stack.quantity ?? stack.qty, 1));
      setSave(s);
      const sentName = stack.name || invIt.name || "Item";
      showBankSentPopup(sentName, sendQty);
    });
  }

  // -------------------------
  // Render loop
  // -------------------------
function renderAll() {
  ensureCoreDOM();
  const save = ensureSave(loadSave());
  renderHeader(save);
  renderChatPanel(save);
  renderGold(save);
  renderInventory(save);
  renderQuestPanel(save);
  renderEquipmentPanel(save);
  setInvTab(__invTab);
  syncRightColumnToNav();
}

  function forceRerenderNow() {
    __invSig = "";
    renderAll();
  }

  let __saveRenderQueued = false;
  function scheduleSaveRerender() {
    if (__saveRenderQueued) return;
    __saveRenderQueued = true;
    requestAnimationFrame(() => {
      __saveRenderQueued = false;
      forceRerenderNow();
    });
  }

  function showBootError(message) {
    document.body.style.opacity = "1";
    document.body.style.filter = "none";
    document.body.innerHTML = `
      <div class="charCreatePage">
        <div class="charCreateWrap">
          <div class="charCreateCard loginCard">
            <h1>Darkstone Chronicles</h1>
            <div class="charCreateSub">The game could not finish loading.</div>
            <div class="charCreateMsg" style="min-height:0;margin-top:18px;">${String(message || "Unknown startup error.")}</div>
          </div>
        </div>
      </div>
    `;
  }

  function currentAssetVersion() {
    try {
      const fromUrl = String(new URL(window.location.href).searchParams.get("appVersion") || "").trim();
      if (fromUrl) return fromUrl;
      const script = document.currentScript ||
        Array.from(document.scripts).find((node) => String(node.src || "").includes("/ui.js") || String(node.src || "").endsWith("ui.js"));
      return String(new URL(String(script?.src || ""), window.location.href).searchParams.get("v") || "").trim();
    } catch {
      return "";
    }
  }

  function ensureOptionalScript(src) {
    return new Promise((resolve, reject) => {
      const version = currentAssetVersion();
      const resolvedSrc = (() => {
        try {
          const url = new URL(src, window.location.href);
          if (version && !url.searchParams.get("v")) url.searchParams.set("v", version);
          return url.toString();
        } catch {
          return src;
        }
      })();

      const existing = Array.from(document.scripts).find((script) => {
        const currentSrc = String(script.getAttribute("src") || "").split("?")[0];
        return currentSrc === src;
      });
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = resolvedSrc;
      script.async = false;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${resolvedSrc}`)), { once: true });
      document.body.appendChild(script);
    });
  }

  async function boot() {
    const shouldAnimateEntry = (() => {
      try {
        return sessionStorage.getItem("ds:page-enter") === "1";
      } catch {
        return false;
      }
    })();
    if (shouldAnimateEntry) {
      document.body.classList.add("ds-page-enter-prep");
      try {
        sessionStorage.removeItem("ds:page-enter");
      } catch {}
    }

    try {
      if (window.DSAuth?.requireAuth) {
        const authResult = await window.DSAuth.requireAuth();
        if (!authResult.ok) {
          if (authResult.reason === "not-configured") {
            showBootError("Supabase login is connected, but the frontend anon key is still missing.");
          }
          window.__dsBootReady?.();
          return;
        }
        await window.DSAuth.preparePlayerState?.();
        await window.DSAuth.refreshAdminStatus?.();
        await window.DSAuth.markPresenceNow?.(true);
      }

      if (!window.DSPartyHall) {
        await ensureOptionalScript("party.js");
      }
      if (!window.DSLeaderboards) {
        await ensureOptionalScript("leaderboards.js");
      }
      await window.DSPartyHall?.initRealtime?.();

      const page = String(window.location.pathname || "").split("/").pop().toLowerCase();
      const rawSave = loadSave();
      if (page !== "create_character.html" && !hasCreatedHero(rawSave)) {
        window.location.href = "create_character.html";
        return;
      }

      hookLocalStorageOnce();
      setupTabSyncOnce();
      ensureCoreDOM();
      hookInvTabs();
      await loadLiveChatMessages("global");
      await loadLiveChatMessages("market");
      await ensureLiveChatSubscription("global");
      await ensureLiveChatSubscription("market");
      ensureLiveChatPolling("global");
      ensureLiveChatPolling("market");

      const _s = ensureSave(loadSave());
      setSave(_s);

      setInterval(() => {
        try { applyRegenTick(); } catch(e) { console.error("[UI] regen tick failed", e); }
      }, 2000);
      setInterval(() => {
        refreshPresenceSnapshot().catch((error) => {
          console.error("[UI] background presence refresh failed", error);
        });
      }, 60000);
      window.addEventListener("ds:presence-updated", () => {
        refreshPresenceSnapshot(true).catch((error) => {
          console.error("[UI] presence refresh after heartbeat failed", error);
        });
      });
      window.addEventListener("ds:auth", async () => {
        try {
          await window.DSAuth?.refreshAdminStatus?.();
          await refreshPresenceSnapshot(true);
        } catch (error) {
          console.error("[UI] admin refresh failed", error);
        }
        forceRerenderNow();
      });
      window.addEventListener("ds:save", () => {
        scheduleSaveRerender();
      });
      window.addEventListener("resize", syncRightColumnToNav);
      window.addEventListener("popstate", (event) => {
        const targetPage = normalizePagePath(event.state?.dsShellRoute || window.location.pathname || "");
        if (!SHELL_ROUTES.has(targetPage)) return;
        const targetHref = `${window.location.pathname || targetPage}${window.location.search || ""}`;
        navigateWithinShell(targetHref, { force: true, skipHistory: true });
      });
      window.addEventListener("storage", (e) => {
        if (e.key === SAVE_KEY) {
          handleExternalSaveChange();
          return;
        }
        if (e.key === ACTION_LOCK_KEY) {
          forceRerenderNow();
          return;
        }
        if (e.key === CHAT_KEY || e.key === CHAT_TAB_KEY) forceRerenderNow();
      });

      renderAll();
      maybeOpenRequestedInspector();
      refreshPresenceSnapshot(true).catch((error) => {
        console.error("[UI] initial presence refresh failed", error);
      });
      requestAnimationFrame(syncRightColumnToNav);
      requestAnimationFrame(() => {
        document.body.classList.remove("ds-page-enter-prep");
        document.body.classList.remove("ds-page-transitioning");
        window.__dsBootReady?.();
      });

      console.log("[UI] boot ok, key =", SAVE_KEY);
    } catch (error) {
      console.error("[UI] boot failed", error);
      showBootError(error?.message || "Unexpected startup error.");
      window.__dsBootReady?.();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();











