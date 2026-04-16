// fight.js — Darkstone Chronicles (Zones 1–3, clean + auto-start on mob click)
// ✅ Auto-fight encounter every 6s
// ✅ -2 stamina / encounter
// ✅ Damage formula:
//    - if ATK <= DEF => 0–1 dmg (chip)
//    - else => (ATK-DEF) with ±10% variance
// ✅ Anti-soup cap: MAX_ROUNDS = 15, then enemy flees (no rewards)
// ✅ Zones use reqLevel (locked if hero level too low)
// ✅ Battle hero HP uses persistent save heroHP/heroHPMax (matches global HUD)
// ✅ Unique drops: 2 rolls per mob (both can drop) with rarity-based chances
// ✅ Zone-wide mythic: can drop from any mob in the zone (ultra rare)
// ✅ Mob click starts fight immediately (no need for Attack)
// ✅ Zone 3 added: Desert Wastes (Req Lv 30) with your exact mob+item mapping

(() => {
const SAVE_KEY = "darkstone_save_v1";

// =========================
// SAVE / LOAD
// =========================
function loadSave(){
  const raw = localStorage.getItem(SAVE_KEY);
  if(!raw) return {};
  try { return JSON.parse(raw); } catch(e){ return {}; }
}

function savePatch(patch){
  const raw = localStorage.getItem(SAVE_KEY);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch(e){ data = {}; }
  Object.assign(data, patch);
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function getCurrentSave(){ return loadSave(); }

const num = (v, f=0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const POTION_ACTIONS = 100;
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
function getPotionBonuses(save){
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
function tickPotionActions(save, actions = 1){
  if (!save || typeof save !== "object") return false;
  if (!save.consumables || typeof save.consumables !== "object") return false;
  let changed = false;
    ["quick_potion1","quick_potion2"].forEach((slot) => {
      const it = save.consumables[slot];
      if (!it) return;
      const id = String(it.id || "").toLowerCase();
    const name = String(it.name || "").toLowerCase();
    const isStrength = id.includes("strength") || name.includes("strength potion");
    const isDefense = id.includes("defense") || name.includes("defense potion");
    const isLuck = id.includes("luck") || name.includes("luck potion");
    if (!isStrength && !isDefense && !isLuck) return;
    let qty = num(it.quantity ?? it.qty, 1);
    if (qty <= 0) { save.consumables[slot] = null; changed = true; return; }
    let left = Number(it.actionsLeft);
    if (!Number.isFinite(left) || left <= 0) left = POTION_ACTIONS;
    let remaining = Math.max(0, Math.floor(left));
    let steps = Math.max(1, Math.floor(actions));
    while (steps-- > 0 && qty > 0){
      remaining -= 1;
      if (remaining <= 0){
        qty -= 1;
        if (qty <= 0){
          save.consumables[slot] = null;
          remaining = 0;
          changed = true;
          break;
        }
        remaining = POTION_ACTIONS;
      }
    }
    if (save.consumables[slot]) {
      it.quantity = qty;
      it.actionsLeft = remaining;
      changed = true;
    }
  });
  return changed;
}
function fightXPForMobLevel(level){
  const mobLevel = clamp(num(level, 1), 1, 99);
  const t = (mobLevel - 1) / 98;
  return Math.round(10 + 190 * t);
}
function getMobCombatStats(mob){
  const lvl = Math.max(1, num(mob?.lvl, 1));
  const baseAtk = Math.max(1, num(mob?.atk, 1));
  const baseDef = Math.max(0, num(mob?.def, 0));

  if (lvl <= 3) {
    return { ...mob, atk: baseAtk, def: baseDef };
  }

  const boostedAtk = Math.max(baseAtk, Math.round(8 + lvl * 4));
  const boostedDef = Math.max(baseDef, Math.round(2 + lvl * 2));
  return { ...mob, atk: boostedAtk, def: boostedDef };
}

// =========================
// SETTINGS
// =========================
const ENCOUNTER_COST = 2;
const ENCOUNTER_CD_MS = 6000;
const MAX_ROUNDS = 15;
const STAT_POINTS_PER_LEVEL = 5;

const VAR_MIN = 0.90;
const VAR_MAX = 1.10;
const WAR_SIGIL_CHANCE = 1 / 250;
const WAR_SIGIL_ITEM = { type:"material", name:"War Sigil", img:"images/items/sigils/war_sigil.png" };

function roundXPNext(v){
  v = Number(v) || 0;
  if (v <= 0) return 0;
  const step = (v >= 10000) ? 500 : 100;
  return Math.ceil(v / step) * step;
}

// =========================
// DATA: Zones + Mobs
// =========================
const ZONES = [

{
id: "whispering_woods",
name: "Whispering Woods",
reqLevel: 1,
img: "images/zones/whispering_woods.png",
mobs: [

{ 
id:"mossling",
name:"Mossling",
lvl:1,
hp:25,
atk:6,
def:2,
img:"images/mobs/fighting/zone1/mossling.png"
},

{ 
id:"thorn_rabbit",
name:"Thorn Rabbit",
lvl:3,
hp:35,
atk:7,
def:3,
img:"images/mobs/fighting/zone1/thorn_rabbit.png"
},

{ 
id:"rootling_stalker",
name:"Rootling Stalker",
lvl:5,
hp:45,
atk:9,
def:4,
img:"images/mobs/fighting/zone1/rootling_stalker.png"
},

{ 
id:"briar_wolf",
name:"Briar Wolf",
lvl:7,
hp:65,
atk:12,
def:6,
img:"images/mobs/fighting/zone1/briar_wolf.png"
},

{ 
id:"ancient_bark_guardian",
name:"Bark Guardian",
lvl:9,
hp:110,
atk:16,
def:10,
img:"images/mobs/fighting/zone1/ancient_bark_guardian.png"
}

]
},

{
id: "fogmoor_marsh",
name: "Fogmoor Marsh",
reqLevel: 10,
img: "images/zones/fogmoor_marsh.png",
mobs: [

{
id:"bog_slime",
name:"Bog Slime",
lvl:11,
hp:120,
atk:22,
def:10,
img:"images/mobs/fighting/zone2/bog_slime.png"
},

{
id:"swamp_leech",
name:"Swamp Leech",
lvl:13,
hp:140,
atk:24,
def:11,
img:"images/mobs/fighting/zone2/swamp_leech.png"
},

{
id:"rottoad",
name:"Rottoad",
lvl:15,
hp:165,
atk:27,
def:13,
img:"images/mobs/fighting/zone2/rottoad.png"
},

{
id:"marsh_stalker",
name:"Marsh Stalker",
lvl:17,
hp:200,
atk:30,
def:15,
img:"images/mobs/fighting/zone2/marsh_stalker.png"
},

{
id:"plague_mirebeast",
name:"Plague Mirebeast",
lvl:19,
hp:260,
atk:34,
def:18,
img:"images/mobs/fighting/zone2/plague_mirebeast.png"
}

]
},

{
id: "ravenhill_fields",
name: "Ravenhill Fields",
reqLevel: 20,
img: "images/zones/ravenhill_fields.png",
mobs: [

{
id:"grave_crow",
name:"Grave Crow",
lvl:21,
hp:300,
atk:45,
def:22,
img:"images/mobs/fighting/zone3/grave_crow.png"
},

{
id:"bone_scavenger",
name:"Bone Scavenger",
lvl:23,
hp:340,
atk:48,
def:24,
img:"images/mobs/fighting/zone3/bone_scavenger.png"
},

{
id:"rotting_soldier",
name:"Rotting Soldier",
lvl:25,
hp:380,
atk:52,
def:27,
img:"images/mobs/fighting/zone3/rotting_soldier.png"
},

{
id:"carrion_hound",
name:"Carrion Hound",
lvl:27,
hp:430,
atk:56,
def:30,
img:"images/mobs/fighting/zone3/carrion_hound.png"
},

{
id:"warlord_revenant",
name:"Warlord Revenant",
lvl:29,
hp:520,
atk:65,
def:36,
img:"images/mobs/fighting/zone3/warlord_revenant.png"
}

]
},

{
id: "grimroot_forest",
name: "Grimroot Forest",
reqLevel: 30,
img: "images/zones/grimroot_forest.png",
mobs: [

{
id:"spore_bat",
name:"Spore Bat",
lvl:31,
hp:650,
atk:80,
def:40,
img:"images/mobs/fighting/zone4/spore_bat.png"
},

{
id:"root_creeper",
name:"Root Creeper",
lvl:33,
hp:720,
atk:85,
def:42,
img:"images/mobs/fighting/zone4/root_creeper.png"
},

{
id:"fungus_brute",
name:"Fungus Brute",
lvl:35,
hp:820,
atk:92,
def:48,
img:"images/mobs/fighting/zone4/fungus_brute.png"
},

{
id:"corrupted_treant",
name:"Corrupted Treant",
lvl:37,
hp:950,
atk:100,
def:55,
img:"images/mobs/fighting/zone4/corrupted_treant.png"
},

{
id:"ancient_root_titan",
name:"Ancient Root Titan",
lvl:39,
hp:1200,
atk:115,
def:65,
img:"images/mobs/fighting/zone4/ancient_root_titan.png"
}

]
},

{
id: "ashen_plains",
name: "Ashen Plains",
reqLevel: 40,
img: "images/zones/ashen_plains.png",
mobs: [

{
id:"ash_vulture",
name:"Ash Vulture",
lvl:41,
hp:1500,
atk:150,
def:80,
img:"images/mobs/fighting/zone5/ash_vulture.png"
},

{
id:"lava_crawler",
name:"Lava Crawler",
lvl:43,
hp:1650,
atk:160,
def:85,
img:"images/mobs/fighting/zone5/lava_crawler.png"
},

{
id:"cinder_beast",
name:"Cinder Beast",
lvl:45,
hp:1850,
atk:170,
def:92,
img:"images/mobs/fighting/zone5/cinder_beast.png"
},

{
id:"magma_brute",
name:"Magma Brute",
lvl:47,
hp:2100,
atk:185,
def:100,
img:"images/mobs/fighting/zone5/magma_brute.png"
},

{
id:"infernal_colossus",
name:"Infernal Colossus",
lvl:49,
hp:2600,
atk:210,
def:115,
img:"images/mobs/fighting/zone5/infernal_colossus.png"
}

]
},

{
id: "blackfang_canyon",
name: "Blackfang Canyon",
reqLevel: 50,
img: "images/zones/blackfang_canyon.png",
mobs: [

{
id:"ridge_hawk",
name:"Ridge Hawk",
lvl:51,
hp:3200,
atk:260,
def:140,
img:"images/mobs/fighting/zone6/ridge_hawk.png"
},

{
id:"stone_lurker",
name:"Stone Lurker",
lvl:53,
hp:3500,
atk:275,
def:150,
img:"images/mobs/fighting/zone6/stone_lurker.png"
},

{
id:"fang_stalker",
name:"Fang Stalker",
lvl:55,
hp:3800,
atk:290,
def:160,
img:"images/mobs/fighting/zone6/fang_stalker.png"
},

{
id:"obsidian_ravager",
name:"Obsidian Ravager",
lvl:57,
hp:4200,
atk:310,
def:175,
img:"images/mobs/fighting/zone6/obsidian_ravager.png"
},

{
id:"blackfang_devourer",
name:"Blackfang Alpha",
lvl:59,
hp:5000,
atk:340,
def:190,
img:"images/mobs/fighting/zone6/blackfang_devourer.png"
}

]
},

{
id: "bloodthorn_thicket",
name: "Bloodthorn Grove",
reqLevel: 60,
img: "images/zones/bloodthorn_thicket.png",
mobs: [

{
id:"thorn_harpy",
name:"Thorn Harpy",
lvl:61,
hp:5800,
atk:360,
def:200,
img:"images/mobs/fighting/zone7/thorn_harpy.png"
},

{
id:"bloodroot_parasite",
name:"Bloodroot Parasite",
lvl:63,
hp:6200,
atk:380,
def:210,
img:"images/mobs/fighting/zone7/bloodroot_parasite.png"
},

{
id:"razorback_bramble",
name:"Thornback Boar",
lvl:65,
hp:6600,
atk:400,
def:220,
img:"images/mobs/fighting/zone7/razorback_bramble.png"
},

{
id:"crimson_thorn_warden",
name:"Thorn Warden",
lvl:67,
hp:7200,
atk:420,
def:240,
img:"images/mobs/fighting/zone7/crimson_thorn_warden.png"
},

{
id:"heart_of_the_thicket",
name:"Thicket Heart",
lvl:69,
hp:8200,
atk:460,
def:260,
img:"images/mobs/fighting/zone7/heart_of_the_thicket.png"
}

]
},

{
id: "dreadmist_highlands",
name: "Dreadmist Vale",
reqLevel: 70,
img: "images/zones/dreadmist_highlands.png",
mobs: [

{
id:"mist_raven",
name:"Mist Raven",
lvl:71,
hp:9500,
atk:520,
def:290,
img:"images/mobs/fighting/zone8/mist_raven.png"
},

{
id:"highland_wraith",
name:"Highland Wraith",
lvl:73,
hp:10000,
atk:540,
def:305,
img:"images/mobs/fighting/zone8/highland_wraith.png"
},

{
id:"frosthorn_ram",
name:"Frosthorn Ram",
lvl:75,
hp:10800,
atk:570,
def:320,
img:"images/mobs/fighting/zone8/frosthorn_ram.png"
},

{
id:"stone_sentinel",
name:"Stone Sentinel",
lvl:77,
hp:11800,
atk:600,
def:340,
img:"images/mobs/fighting/zone8/stone_sentinel.png"
},

{
id:"ancient_storm_avatar",
name:"Storm Avatar",
lvl:79,
hp:13500,
atk:650,
def:370,
img:"images/mobs/fighting/zone8/ancient_storm_avatar.png"
}

]
},

{
id: "obsidian_wastes",
name: "Obsidian Wastes",
reqLevel: 80,
img: "images/zones/obsidian_wastes.png",
mobs: [

{
id:"lava_serpent",
name:"Lava Serpent",
lvl:81,
hp:12000,
atk:600,
def:340,
img:"images/mobs/fighting/zone9/lava_serpent.png"
},

{
id:"obsidian_gargoyle",
name:"Obsidian Gargoyle",
lvl:83,
hp:12800,
atk:630,
def:360,
img:"images/mobs/fighting/zone9/obsidian_gargoyle.png"
},

{
id:"magma_behemoth",
name:"Magma Behemoth",
lvl:85,
hp:13800,
atk:660,
def:380,
img:"images/mobs/fighting/zone9/magma_behemoth.png"
},

{
id:"ash_revenant",
name:"Ash Revenant",
lvl:87,
hp:15000,
atk:700,
def:400,
img:"images/mobs/fighting/zone9/ash_revenant.png"
},

{
id:"inferno_titan",
name:"Inferno Titan",
lvl:89,
hp:17000,
atk:760,
def:430,
img:"images/mobs/fighting/zone9/inferno_titan.png"
}

]
},

{
id: "abyssal_rift",
name: "Abyssal Rift",
reqLevel: 90,
img: "images/zones/abyssal_rift.png",
mobs: [

{
id:"void_skyray",
name:"Void Skyray",
lvl:91,
hp:15000,
atk:720,
def:410,
img:"images/mobs/fighting/zone10/void_skyray.png"
},

{
id:"rift_crawler",
name:"Rift Crawler",
lvl:93,
hp:16000,
atk:760,
def:430,
img:"images/mobs/fighting/zone10/rift_crawler.png"
},

{
id:"abyss_watcher",
name:"Abyss Watcher",
lvl:95,
hp:17200,
atk:800,
def:455,
img:"images/mobs/fighting/zone10/abyss_watcher.png"
},

{
id:"void_devourer",
name:"Void Devourer",
lvl:97,
hp:18800,
atk:850,
def:480,
img:"images/mobs/fighting/zone10/void_devourer.png"
},

{
id:"eternal_rift_sovereign",
name:"Rift Sovereign",
lvl:99,
hp:22000,
atk:920,
def:520,
img:"images/mobs/fighting/zone10/eternal_rift_sovereign.png"
}

]
}

];
// =========================
// RANDOM HELPERS
// =========================
function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min, max){
  return min + Math.random() * (max - min);
}

// =========================
// GOLD + INVENTORY WRITE
// =========================
function addGold(amount){
  const raw = localStorage.getItem(SAVE_KEY);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch(e){ data = {}; }
  data.gold = (data.gold ?? 0) + amount;
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function itemStackKey(it){
  return [
    it.type || "",
    it.name || "",
    it.baseName || "",
    it.setId || "",
    it.slot || "",
    it.reqLevel ?? 1,
    it.atk ?? 0,
    it.def ?? 0,
    it.rarity || "",
    it.img || "",
    it.upg ?? 0
  ].join("::");
}

// ✅ fight-side: gear CAN stack (ui.js also allows stacking)
function addItemToSave(item){
  const raw = localStorage.getItem(SAVE_KEY);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch(e){ data = {}; }
  if(!Array.isArray(data.inventory)) data.inventory = [];

  const qty = Math.max(1, num(item.quantity ?? item.qty, 1));
  const invApi = window.DSInventory;
  if (invApi?.addItem) {
    const res = invApi.addItem(data, item, qty, { stack: true, stackKeyFn: itemStackKey });
    if (!res?.ok) return false;
  } else {
    const key = itemStackKey(item);
    const ex = data.inventory.find(i => i && itemStackKey(i) === key);
    if(ex) ex.quantity = (ex.quantity ?? 1) + qty;
    else data.inventory.push({ ...item, quantity: qty });
  }

  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  return true;
}

function rollGold(zoneId, mobLvl){
  const base =
    zoneId === "desert_wastes" ? { min: 55, max: 85 } :
    zoneId === "iron_revenant_keep" ? { min: 10, max: 18 } :
    { min: 2, max: 6 };

  const bonusMin = Math.floor(mobLvl / 4);
  const bonusMax = Math.floor(mobLvl / 2);
  return randInt(base.min + bonusMin, base.max + bonusMax);
}

// =========================
// ITEMS (Zone 1 + Zone 2 + Zone 3 libraries)
// =========================
const Z1_ITEM_PATH = "images/items/dropsfromzones/zone1";
const Z2_ITEM_PATH = "images/items/dropsfromzones/zone2";
const Z3_ITEM_PATH = "images/items/dropsfromzones/zone3";
const Z4_ITEM_PATH = "images/items/dropsfromzones/zone4";
const Z5_ITEM_PATH = "images/items/dropsfromzones/zone5";
const Z6_ITEM_PATH = "images/items/dropsfromzones/zone6";
const Z7_ITEM_PATH = "images/items/dropsfromzones/zone7";
const Z8_ITEM_PATH = "images/items/dropsfromzones/zone8";
const Z9_ITEM_PATH = "images/items/dropsfromzones/zone9";
const Z10_ITEM_PATH = "images/items/dropsfromzones/zone10";

const ITEM_LIBRARY = {
  // ===== Zone 1 =====
  // Common (one per slot)
  ww_common_main_hand: { type:"gear", slot:"mainHand", name:"Whispering Blade",       atk:2, def:0, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_main_hand.png` },
  ww_common_off_hand:  { type:"gear", slot:"offHand",  name:"Whispering Blade",       atk:2, def:0, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_off_hand.png` },
  ww_common_shield:    { type:"gear", slot:"offHand",  name:"Whispering Shield",      atk:0, def:2, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_shield.png` },
  ww_common_helmet:    { type:"gear", slot:"helmet",   name:"Whispering Hood",        atk:0, def:2, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_helmet.png` },
  ww_common_shoulders: { type:"gear", slot:"shoulders",name:"Whispering Mantle",      atk:0, def:1, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_shoulders.png` },
  ww_common_chest:     { type:"gear", slot:"chest",    name:"Whispering Jerkin",      atk:0, def:3, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_chest.png` },
  ww_common_bracers:   { type:"gear", slot:"bracers",  name:"Whispering Bracers",     atk:0, def:1, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_bracers.png` },
  ww_common_gloves:    { type:"gear", slot:"gloves",   name:"Whispering Gloves",      atk:0, def:1, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_gloves.png` },
  ww_common_belt:      { type:"gear", slot:"belt",     name:"Whispering Belt",        atk:0, def:1, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_belt.png` },
  ww_common_pants:     { type:"gear", slot:"pants",    name:"Whispering Trousers",    atk:0, def:2, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_pants.png` },
  ww_common_boots:     { type:"gear", slot:"boots",    name:"Whispering Boots",       atk:0, def:1, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_boots.png` },
  ww_common_ring:      { type:"gear", slot:"ring",     name:"Whispering Ring",        atk:1, def:0, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_ring.png` },
  ww_common_amulet:    { type:"gear", slot:"amulet",   name:"Whispering Amulet",      atk:1, def:0, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ww_common_amulet.png` },

  // Rare (helmet, chest, belt, pants, gloves, boots)
  ww_rare_helmet:      { type:"gear", slot:"helmet",   name:"Warden's Leaf Helm",     atk:0, def:4, reqLevel:1,  rarity:"rare",     img:`${Z1_ITEM_PATH}/ww_rare_helmet.png` },
  ww_rare_chest:       { type:"gear", slot:"chest",    name:"Warden's Leaf Cuirass",  atk:0, def:6, reqLevel:1,  rarity:"rare",     img:`${Z1_ITEM_PATH}/ww_rare_chest.png` },
  ww_rare_belt:        { type:"gear", slot:"belt",     name:"Warden's Leaf Belt",     atk:0, def:3, reqLevel:1,  rarity:"rare",     img:`${Z1_ITEM_PATH}/ww_rare_belt.png` },
  ww_rare_pants:       { type:"gear", slot:"pants",    name:"Warden's Leaf Pants",    atk:0, def:4, reqLevel:1,  rarity:"rare",     img:`${Z1_ITEM_PATH}/ww_rare_pants.png` },
  ww_rare_gloves:      { type:"gear", slot:"gloves",   name:"Warden's Leaf Gloves",   atk:0, def:3, reqLevel:1,  rarity:"rare",     img:`${Z1_ITEM_PATH}/ww_rare_gloves.png` },
  ww_rare_boots:       { type:"gear", slot:"boots",    name:"Warden's Leaf Boots",    atk:0, def:3, reqLevel:1,  rarity:"rare",     img:`${Z1_ITEM_PATH}/ww_rare_boots.png` },

  // Legendary (bracers, mainHand, offHand, shoulders, ring, amulet)
  ww_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Elderbark Bracers",      atk:0, def:6, reqLevel:1,  rarity:"legendary", img:`${Z1_ITEM_PATH}/ww_legendary_bracers.png` },
  ww_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Elderbark Greatblade",  atk:10, def:0, reqLevel:1,  rarity:"legendary", img:`${Z1_ITEM_PATH}/ww_legendary_main_hand.png` },
  ww_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Elderbark Greatblade",  atk:8, def:0, reqLevel:1,   rarity:"legendary", img:`${Z1_ITEM_PATH}/ww_legendary_off_hand.png` },
  ww_legendary_shield:   { type:"gear", slot:"offHand",  name:"Elderbark Shield",      atk:0, def:8, reqLevel:1,   rarity:"legendary", img:`${Z1_ITEM_PATH}/ww_legendary_shield.png` },
  ww_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Elderbark Mantle",      atk:0, def:5, reqLevel:1,   rarity:"legendary", img:`${Z1_ITEM_PATH}/ww_legendary_shoulders.png` },
  ww_legendary_ring:     { type:"gear", slot:"ring",     name:"Elderbark Ring",        atk:3, def:2, reqLevel:1,   rarity:"legendary", img:`${Z1_ITEM_PATH}/ww_legendary_ring.png` },
  ww_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Elderbark Amulet",      atk:3, def:2, reqLevel:1,   rarity:"legendary", img:`${Z1_ITEM_PATH}/ww_legendary_amulet.png` },

  // ===== Zone 2 =====
  // Common (one per slot)
  fm_common_main_hand: { type:"gear", slot:"mainHand", name:"Fogmoor Cleaver",        atk:5, def:0, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_main_hand.png` },
  fm_common_off_hand:  { type:"gear", slot:"offHand",  name:"Fogmoor Cleaver",        atk:5, def:0, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_off_hand.png` },
  fm_common_shield:    { type:"gear", slot:"offHand",  name:"Fogmoor Shield",         atk:0, def:5, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_shield.png` },
  fm_common_helmet:    { type:"gear", slot:"helmet",   name:"Mirehide Helm",          atk:0, def:5, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_helmet.png` },
  fm_common_shoulders: { type:"gear", slot:"shoulders",name:"Mirehide Mantle",        atk:0, def:3, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_shoulders.png` },
  fm_common_chest:     { type:"gear", slot:"chest",    name:"Mirehide Vest",          atk:0, def:7, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_chest.png` },
  fm_common_bracers:   { type:"gear", slot:"bracers",  name:"Mirehide Bracers",       atk:0, def:3, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_bracers.png` },
  fm_common_gloves:    { type:"gear", slot:"gloves",   name:"Mirehide Gloves",        atk:0, def:3, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_gloves.png` },
  fm_common_belt:      { type:"gear", slot:"belt",     name:"Mirehide Belt",          atk:0, def:3, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_belt.png` },
  fm_common_pants:     { type:"gear", slot:"pants",    name:"Mirehide Trousers",      atk:0, def:6, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_pants.png` },
  fm_common_boots:     { type:"gear", slot:"boots",    name:"Mirehide Boots",         atk:0, def:3, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_boots.png` },
  fm_common_ring:      { type:"gear", slot:"ring",     name:"Mireband Ring",          atk:2, def:1, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_ring.png` },
  fm_common_amulet:    { type:"gear", slot:"amulet",   name:"Mireband Amulet",        atk:2, def:1, reqLevel:10, rarity:"common",   img:`${Z2_ITEM_PATH}/fm_common_amulet.png` },

  // Rare (helmet, chest, belt, pants, gloves, boots)
  fm_rare_helmet:      { type:"gear", slot:"helmet",   name:"Bogwarden Helm",         atk:0, def:9, reqLevel:10, rarity:"rare",     img:`${Z2_ITEM_PATH}/fm_rare_helmet.png` },
  fm_rare_chest:       { type:"gear", slot:"chest",    name:"Bogwarden Cuirass",      atk:0, def:12,reqLevel:10, rarity:"rare",     img:`${Z2_ITEM_PATH}/fm_rare_chest.png` },
  fm_rare_belt:        { type:"gear", slot:"belt",     name:"Bogwarden Belt",         atk:0, def:6, reqLevel:10, rarity:"rare",     img:`${Z2_ITEM_PATH}/fm_rare_belt.png` },
  fm_rare_pants:       { type:"gear", slot:"pants",    name:"Bogwarden Pants",        atk:0, def:10,reqLevel:10, rarity:"rare",     img:`${Z2_ITEM_PATH}/fm_rare_pants.png` },
  fm_rare_gloves:      { type:"gear", slot:"gloves",   name:"Bogwarden Gloves",       atk:0, def:6, reqLevel:10, rarity:"rare",     img:`${Z2_ITEM_PATH}/fm_rare_gloves.png` },
  fm_rare_boots:       { type:"gear", slot:"boots",    name:"Bogwarden Boots",        atk:0, def:6, reqLevel:10, rarity:"rare",     img:`${Z2_ITEM_PATH}/fm_rare_boots.png` },

  // Legendary (bracers, mainHand, offHand, shoulders, ring, amulet)
  fm_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Mirelord Bracers",       atk:0, def:12,reqLevel:10, rarity:"legendary", img:`${Z2_ITEM_PATH}/fm_legendary_bracers.png` },
  fm_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Mirelord Glaive",        atk:18, def:0, reqLevel:10, rarity:"legendary", img:`${Z2_ITEM_PATH}/fm_legendary_main_hand.png` },
  fm_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Mirelord Glaive",        atk:16, def:0, reqLevel:10, rarity:"legendary", img:`${Z2_ITEM_PATH}/fm_legendary_off_hand.png` },
  fm_legendary_shield:   { type:"gear", slot:"offHand",  name:"Mirelord Shield",        atk:0,  def:16,reqLevel:10, rarity:"legendary", img:`${Z2_ITEM_PATH}/fm_legendary_shield.png` },
  fm_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Mirelord Mantle",        atk:0,  def:10,reqLevel:10, rarity:"legendary", img:`${Z2_ITEM_PATH}/fm_legendary_shoulders.png` },
  fm_legendary_ring:     { type:"gear", slot:"ring",     name:"Mirelord Ring",          atk:6,  def:4, reqLevel:10, rarity:"legendary", img:`${Z2_ITEM_PATH}/fm_legendary_ring.png` },
  fm_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Mirelord Amulet",        atk:6,  def:4, reqLevel:10, rarity:"legendary", img:`${Z2_ITEM_PATH}/fm_legendary_amulet.png` },

  // ===== Zone 3 =====
  // Common (one per slot)
  rh_common_main_hand: { type:"gear", slot:"mainHand", name:"Ravenhill Sabre",       atk:9, def:0, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_main_hand.png` },
  rh_common_off_hand:  { type:"gear", slot:"offHand",  name:"Ravenhill Sabre",       atk:9, def:0, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_off_hand.png` },
  rh_common_shield:    { type:"gear", slot:"offHand",  name:"Gravebound Shield",     atk:0, def:9, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_shield.png` },
  rh_common_helmet:    { type:"gear", slot:"helmet",   name:"Gravebound Helm",       atk:0, def:9, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_helmet.png` },
  rh_common_shoulders: { type:"gear", slot:"shoulders",name:"Gravebound Mantle",     atk:0, def:6, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_shoulders.png` },
  rh_common_chest:     { type:"gear", slot:"chest",    name:"Gravebound Cuirass",    atk:0, def:14,reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_chest.png` },
  rh_common_bracers:   { type:"gear", slot:"bracers",  name:"Gravebound Bracers",    atk:0, def:6, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_bracers.png` },
  rh_common_gloves:    { type:"gear", slot:"gloves",   name:"Gravebound Gloves",     atk:0, def:6, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_gloves.png` },
  rh_common_belt:      { type:"gear", slot:"belt",     name:"Gravebound Belt",       atk:0, def:6, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_belt.png` },
  rh_common_pants:     { type:"gear", slot:"pants",    name:"Gravebound Trousers",   atk:0, def:12,reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_pants.png` },
  rh_common_boots:     { type:"gear", slot:"boots",    name:"Gravebound Boots",      atk:0, def:6, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_boots.png` },
  rh_common_ring:      { type:"gear", slot:"ring",     name:"Graveband Ring",        atk:4, def:2, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_ring.png` },
  rh_common_amulet:    { type:"gear", slot:"amulet",   name:"Graveband Amulet",      atk:4, def:2, reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/rh_common_amulet.png` },

  // Rare (helmet, chest, belt, pants, gloves, boots)
  rh_rare_helmet:      { type:"gear", slot:"helmet",   name:"Cryptwarden Helm",      atk:0, def:16,reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/rh_rare_helmet.png` },
  rh_rare_chest:       { type:"gear", slot:"chest",    name:"Cryptwarden Cuirass",   atk:0, def:22,reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/rh_rare_chest.png` },
  rh_rare_belt:        { type:"gear", slot:"belt",     name:"Cryptwarden Belt",      atk:0, def:10,reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/rh_rare_belt.png` },
  rh_rare_pants:       { type:"gear", slot:"pants",    name:"Cryptwarden Pants",     atk:0, def:18,reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/rh_rare_pants.png` },
  rh_rare_gloves:      { type:"gear", slot:"gloves",   name:"Cryptwarden Gloves",    atk:0, def:10,reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/rh_rare_gloves.png` },
  rh_rare_boots:       { type:"gear", slot:"boots",    name:"Cryptwarden Boots",     atk:0, def:10,reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/rh_rare_boots.png` },

  // Legendary (bracers, mainHand, offHand, shoulders, ring, amulet)
  rh_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Ravenlord Bracers",     atk:0, def:20,reqLevel:20, rarity:"legendary", img:`${Z3_ITEM_PATH}/rh_legendary_bracers.png` },
  rh_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Ravenlord Greatsword", atk:26, def:0, reqLevel:20, rarity:"legendary", img:`${Z3_ITEM_PATH}/rh_legendary_main_hand.png` },
  rh_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Ravenlord Greatsword", atk:26, def:0, reqLevel:20, rarity:"legendary", img:`${Z3_ITEM_PATH}/rh_legendary_off_hand.png` },
  rh_legendary_shield:   { type:"gear", slot:"offHand",  name:"Ravenlord Shield",     atk:0,  def:26,reqLevel:20, rarity:"legendary", img:`${Z3_ITEM_PATH}/rh_legendary_shield.png` },
  rh_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Ravenlord Mantle",     atk:0,  def:16,reqLevel:20, rarity:"legendary", img:`${Z3_ITEM_PATH}/rh_legendary_shoulders.png` },
  rh_legendary_ring:     { type:"gear", slot:"ring",     name:"Ravenlord Ring",       atk:8,  def:4, reqLevel:20, rarity:"legendary", img:`${Z3_ITEM_PATH}/rh_legendary_ring.png` },
  rh_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Ravenlord Amulet",     atk:8,  def:4, reqLevel:20, rarity:"legendary", img:`${Z3_ITEM_PATH}/rh_legendary_amulet.png` },

  // ===== Zone 4 =====
  // Common (one per slot)
  gr_common_main_hand: { type:"gear", slot:"mainHand", name:"Grimroot Hatchet",     atk:12, def:0, reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_main_hand.png` },
  gr_common_off_hand:  { type:"gear", slot:"offHand",  name:"Grimroot Hatchet",     atk:12, def:0, reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_off_hand.png` },
  gr_common_shield:    { type:"gear", slot:"offHand",  name:"Rootbound Shield",     atk:0,  def:12,reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_shield.png` },
  gr_common_helmet:    { type:"gear", slot:"helmet",   name:"Rootbound Helm",       atk:0,  def:12,reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_helmet.png` },
  gr_common_shoulders: { type:"gear", slot:"shoulders",name:"Rootbound Mantle",     atk:0,  def:8, reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_shoulders.png` },
  gr_common_chest:     { type:"gear", slot:"chest",    name:"Rootbound Cuirass",    atk:0,  def:18,reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_chest.png` },
  gr_common_bracers:   { type:"gear", slot:"bracers",  name:"Rootbound Bracers",    atk:0,  def:8, reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_bracers.png` },
  gr_common_gloves:    { type:"gear", slot:"gloves",   name:"Rootbound Gloves",     atk:0,  def:8, reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_gloves.png` },
  gr_common_belt:      { type:"gear", slot:"belt",     name:"Rootbound Belt",       atk:0,  def:8, reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_belt.png` },
  gr_common_pants:     { type:"gear", slot:"pants",    name:"Rootbound Trousers",   atk:0,  def:16,reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_pants.png` },
  gr_common_boots:     { type:"gear", slot:"boots",    name:"Rootbound Boots",      atk:0,  def:8, reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_boots.png` },
  gr_common_ring:      { type:"gear", slot:"ring",     name:"Rootbind Ring",        atk:5,  def:3, reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_ring.png` },
  gr_common_amulet:    { type:"gear", slot:"amulet",   name:"Rootbind Amulet",      atk:5,  def:3, reqLevel:30, rarity:"common",   img:`${Z4_ITEM_PATH}/gr_common_amulet.png` },

  // Rare (helmet, chest, belt, pants, gloves, boots)
  gr_rare_helmet:      { type:"gear", slot:"helmet",   name:"Fungalgrove Helm",     atk:0,  def:20,reqLevel:30, rarity:"rare",     img:`${Z4_ITEM_PATH}/gr_rare_helmet.png` },
  gr_rare_chest:       { type:"gear", slot:"chest",    name:"Fungalgrove Cuirass",  atk:0,  def:28,reqLevel:30, rarity:"rare",     img:`${Z4_ITEM_PATH}/gr_rare_chest.png` },
  gr_rare_belt:        { type:"gear", slot:"belt",     name:"Fungalgrove Belt",     atk:0,  def:12,reqLevel:30, rarity:"rare",     img:`${Z4_ITEM_PATH}/gr_rare_belt.png` },
  gr_rare_pants:       { type:"gear", slot:"pants",    name:"Fungalgrove Pants",    atk:0,  def:22,reqLevel:30, rarity:"rare",     img:`${Z4_ITEM_PATH}/gr_rare_pants.png` },
  gr_rare_gloves:      { type:"gear", slot:"gloves",   name:"Fungalgrove Gloves",   atk:0,  def:12,reqLevel:30, rarity:"rare",     img:`${Z4_ITEM_PATH}/gr_rare_gloves.png` },
  gr_rare_boots:       { type:"gear", slot:"boots",    name:"Fungalgrove Boots",    atk:0,  def:12,reqLevel:30, rarity:"rare",     img:`${Z4_ITEM_PATH}/gr_rare_boots.png` },

  // Legendary (bracers, mainHand, offHand, shoulders, ring, amulet)
  gr_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Grimroot Bracers",     atk:0,  def:28,reqLevel:30, rarity:"legendary", img:`${Z4_ITEM_PATH}/gr_legendary_bracers.png` },
  gr_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Grimroot Greatsaw",    atk:34, def:0, reqLevel:30, rarity:"legendary", img:`${Z4_ITEM_PATH}/gr_legendary_main_hand.png` },
  gr_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Grimroot Greatsaw",    atk:34, def:0, reqLevel:30, rarity:"legendary", img:`${Z4_ITEM_PATH}/gr_legendary_off_hand.png` },
  gr_legendary_shield:   { type:"gear", slot:"offHand",  name:"Grimroot Shield",      atk:0,  def:34,reqLevel:30, rarity:"legendary", img:`${Z4_ITEM_PATH}/gr_legendary_shield.png` },
  gr_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Grimroot Mantle",      atk:0,  def:22,reqLevel:30, rarity:"legendary", img:`${Z4_ITEM_PATH}/gr_legendary_shoulders.png` },
  gr_legendary_ring:     { type:"gear", slot:"ring",     name:"Grimroot Ring",        atk:10, def:6, reqLevel:30, rarity:"legendary", img:`${Z4_ITEM_PATH}/gr_legendary_ring.png` },
  gr_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Grimroot Amulet",      atk:10, def:6, reqLevel:30, rarity:"legendary", img:`${Z4_ITEM_PATH}/gr_legendary_amulet.png` },

  // ===== Zone 5 =====
  // Common (one per slot)
  ap_common_main_hand: { type:"gear", slot:"mainHand", name:"Ashen Cleaver",        atk:16, def:0, reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_main_hand.png` },
  ap_common_off_hand:  { type:"gear", slot:"offHand",  name:"Ashen Cleaver",        atk:16, def:0, reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_off_hand.png` },
  ap_common_shield:    { type:"gear", slot:"offHand",  name:"Ashen Shield",         atk:0,  def:16,reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_shield.png` },
  ap_common_helmet:    { type:"gear", slot:"helmet",   name:"Ashen Helm",           atk:0,  def:16,reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_helmet.png` },
  ap_common_shoulders: { type:"gear", slot:"shoulders",name:"Ashen Mantle",         atk:0,  def:11,reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_shoulders.png` },
  ap_common_chest:     { type:"gear", slot:"chest",    name:"Ashen Cuirass",        atk:0,  def:24,reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_chest.png` },
  ap_common_bracers:   { type:"gear", slot:"bracers",  name:"Ashen Bracers",        atk:0,  def:11,reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_bracers.png` },
  ap_common_gloves:    { type:"gear", slot:"gloves",   name:"Ashen Gloves",         atk:0,  def:11,reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_gloves.png` },
  ap_common_belt:      { type:"gear", slot:"belt",     name:"Ashen Belt",           atk:0,  def:11,reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_belt.png` },
  ap_common_pants:     { type:"gear", slot:"pants",    name:"Ashen Trousers",       atk:0,  def:20,reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_pants.png` },
  ap_common_boots:     { type:"gear", slot:"boots",    name:"Ashen Boots",          atk:0,  def:11,reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_boots.png` },
  ap_common_ring:      { type:"gear", slot:"ring",     name:"Ashen Ring",           atk:7,  def:4, reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_ring.png` },
  ap_common_amulet:    { type:"gear", slot:"amulet",   name:"Ashen Amulet",         atk:7,  def:4, reqLevel:40, rarity:"common",   img:`${Z5_ITEM_PATH}/ap_common_amulet.png` },

  // Rare (helmet, chest, belt, pants, gloves, boots)
  ap_rare_helmet:      { type:"gear", slot:"helmet",   name:"Cinder Helm",          atk:0,  def:28,reqLevel:40, rarity:"rare",     img:`${Z5_ITEM_PATH}/ap_rare_helmet.png` },
  ap_rare_chest:       { type:"gear", slot:"chest",    name:"Cinder Cuirass",       atk:0,  def:36,reqLevel:40, rarity:"rare",     img:`${Z5_ITEM_PATH}/ap_rare_chest.png` },
  ap_rare_belt:        { type:"gear", slot:"belt",     name:"Cinder Belt",          atk:0,  def:16,reqLevel:40, rarity:"rare",     img:`${Z5_ITEM_PATH}/ap_rare_belt.png` },
  ap_rare_pants:       { type:"gear", slot:"pants",    name:"Cinder Pants",         atk:0,  def:30,reqLevel:40, rarity:"rare",     img:`${Z5_ITEM_PATH}/ap_rare_pants.png` },
  ap_rare_gloves:      { type:"gear", slot:"gloves",   name:"Cinder Gloves",        atk:0,  def:16,reqLevel:40, rarity:"rare",     img:`${Z5_ITEM_PATH}/ap_rare_gloves.png` },
  ap_rare_boots:       { type:"gear", slot:"boots",    name:"Cinder Boots",         atk:0,  def:16,reqLevel:40, rarity:"rare",     img:`${Z5_ITEM_PATH}/ap_rare_boots.png` },

  // Legendary (bracers, mainHand, offHand, shoulders, ring, amulet)
  ap_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Infernal Bracers",     atk:0,  def:32,reqLevel:40, rarity:"legendary", img:`${Z5_ITEM_PATH}/ap_legendary_bracers.png` },
  ap_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Infernal Greatblade", atk:44, def:0, reqLevel:40, rarity:"legendary", img:`${Z5_ITEM_PATH}/ap_legendary_main_hand.png` },
  ap_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Infernal Greatblade", atk:44, def:0, reqLevel:40, rarity:"legendary", img:`${Z5_ITEM_PATH}/ap_legendary_off_hand.png` },
  ap_legendary_shield:   { type:"gear", slot:"offHand",  name:"Infernal Shield",     atk:0,  def:44,reqLevel:40, rarity:"legendary", img:`${Z5_ITEM_PATH}/ap_legendary_shield.png` },
  ap_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Infernal Mantle",     atk:0,  def:24,reqLevel:40, rarity:"legendary", img:`${Z5_ITEM_PATH}/ap_legendary_shoulders.png` },
  ap_legendary_ring:     { type:"gear", slot:"ring",     name:"Infernal Ring",       atk:12, def:6, reqLevel:40, rarity:"legendary", img:`${Z5_ITEM_PATH}/ap_legendary_ring.png` },
  ap_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Infernal Amulet",     atk:12, def:6, reqLevel:40, rarity:"legendary", img:`${Z5_ITEM_PATH}/ap_legendary_amulet.png` },

  // ===== Zone 6 =====
  bf_common_main_hand: { type:"gear", slot:"mainHand", name:"Blackfang Sabre",      atk:20, def:0, reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_main_hand.png` },
  bf_common_off_hand:  { type:"gear", slot:"offHand",  name:"Blackfang Sabre",      atk:20, def:0, reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_off_hand.png` },
  bf_common_shield:    { type:"gear", slot:"offHand",  name:"Ravager Shield",       atk:0,  def:20,reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_shield.png` },
  bf_common_helmet:    { type:"gear", slot:"helmet",   name:"Blackfang Helm",       atk:0,  def:20,reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_helmet.png` },
  bf_common_shoulders: { type:"gear", slot:"shoulders",name:"Blackfang Mantle",     atk:0,  def:14,reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_shoulders.png` },
  bf_common_chest:     { type:"gear", slot:"chest",    name:"Blackfang Cuirass",    atk:0,  def:30,reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_chest.png` },
  bf_common_bracers:   { type:"gear", slot:"bracers",  name:"Blackfang Bracers",    atk:0,  def:14,reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_bracers.png` },
  bf_common_gloves:    { type:"gear", slot:"gloves",   name:"Blackfang Gloves",     atk:0,  def:14,reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_gloves.png` },
  bf_common_belt:      { type:"gear", slot:"belt",     name:"Blackfang Belt",       atk:0,  def:14,reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_belt.png` },
  bf_common_pants:     { type:"gear", slot:"pants",    name:"Blackfang Trousers",   atk:0,  def:26,reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_pants.png` },
  bf_common_boots:     { type:"gear", slot:"boots",    name:"Blackfang Boots",      atk:0,  def:14,reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_boots.png` },
  bf_common_ring:      { type:"gear", slot:"ring",     name:"Blackfang Ring",       atk:9,  def:5, reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_ring.png` },
  bf_common_amulet:    { type:"gear", slot:"amulet",   name:"Blackfang Amulet",     atk:9,  def:5, reqLevel:50, rarity:"common",   img:`${Z6_ITEM_PATH}/bf_common_amulet.png` },

  bf_rare_helmet:      { type:"gear", slot:"helmet",   name:"Ravager Helm",         atk:0,  def:34,reqLevel:50, rarity:"rare",     img:`${Z6_ITEM_PATH}/bf_rare_helmet.png` },
  bf_rare_chest:       { type:"gear", slot:"chest",    name:"Ravager Cuirass",      atk:0,  def:44,reqLevel:50, rarity:"rare",     img:`${Z6_ITEM_PATH}/bf_rare_chest.png` },
  bf_rare_belt:        { type:"gear", slot:"belt",     name:"Ravager Belt",         atk:0,  def:20,reqLevel:50, rarity:"rare",     img:`${Z6_ITEM_PATH}/bf_rare_belt.png` },
  bf_rare_pants:       { type:"gear", slot:"pants",    name:"Ravager Pants",        atk:0,  def:36,reqLevel:50, rarity:"rare",     img:`${Z6_ITEM_PATH}/bf_rare_pants.png` },
  bf_rare_gloves:      { type:"gear", slot:"gloves",   name:"Ravager Gloves",       atk:0,  def:20,reqLevel:50, rarity:"rare",     img:`${Z6_ITEM_PATH}/bf_rare_gloves.png` },
  bf_rare_boots:       { type:"gear", slot:"boots",    name:"Ravager Boots",        atk:0,  def:20,reqLevel:50, rarity:"rare",     img:`${Z6_ITEM_PATH}/bf_rare_boots.png` },

  bf_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Alpha Bracers",        atk:0,  def:40,reqLevel:50, rarity:"legendary", img:`${Z6_ITEM_PATH}/bf_legendary_bracers.png` },
  bf_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Alpha Greatblade",    atk:52, def:0, reqLevel:50, rarity:"legendary", img:`${Z6_ITEM_PATH}/bf_legendary_main_hand.png` },
  bf_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Alpha Greatblade",    atk:52, def:0, reqLevel:50, rarity:"legendary", img:`${Z6_ITEM_PATH}/bf_legendary_off_hand.png` },
  bf_legendary_shield:   { type:"gear", slot:"offHand",  name:"Alpha Shield",        atk:0,  def:52,reqLevel:50, rarity:"legendary", img:`${Z6_ITEM_PATH}/bf_legendary_shield.png` },
  bf_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Alpha Mantle",        atk:0,  def:28,reqLevel:50, rarity:"legendary", img:`${Z6_ITEM_PATH}/bf_legendary_shoulders.png` },
  bf_legendary_ring:     { type:"gear", slot:"ring",     name:"Alpha Ring",          atk:14, def:8, reqLevel:50, rarity:"legendary", img:`${Z6_ITEM_PATH}/bf_legendary_ring.png` },
  bf_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Alpha Amulet",        atk:14, def:8, reqLevel:50, rarity:"legendary", img:`${Z6_ITEM_PATH}/bf_legendary_amulet.png` },

  // ===== Zone 7 =====
  bt_common_main_hand: { type:"gear", slot:"mainHand", name:"Bloodthorn Blade",     atk:24, def:0, reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_main_hand.png` },
  bt_common_off_hand:  { type:"gear", slot:"offHand",  name:"Bloodthorn Blade",     atk:24, def:0, reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_off_hand.png` },
  bt_common_shield:    { type:"gear", slot:"offHand",  name:"Bloodthorn Shield",    atk:0,  def:24,reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_shield.png` },
  bt_common_helmet:    { type:"gear", slot:"helmet",   name:"Bloodthorn Helm",      atk:0,  def:24,reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_helmet.png` },
  bt_common_shoulders: { type:"gear", slot:"shoulders",name:"Bloodthorn Mantle",    atk:0,  def:16,reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_shoulders.png` },
  bt_common_chest:     { type:"gear", slot:"chest",    name:"Bloodthorn Cuirass",   atk:0,  def:36,reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_chest.png` },
  bt_common_bracers:   { type:"gear", slot:"bracers",  name:"Bloodthorn Bracers",   atk:0,  def:16,reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_bracers.png` },
  bt_common_gloves:    { type:"gear", slot:"gloves",   name:"Bloodthorn Gloves",    atk:0,  def:16,reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_gloves.png` },
  bt_common_belt:      { type:"gear", slot:"belt",     name:"Bloodthorn Belt",      atk:0,  def:16,reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_belt.png` },
  bt_common_pants:     { type:"gear", slot:"pants",    name:"Bloodthorn Trousers",  atk:0,  def:30,reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_pants.png` },
  bt_common_boots:     { type:"gear", slot:"boots",    name:"Bloodthorn Boots",     atk:0,  def:16,reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_boots.png` },
  bt_common_ring:      { type:"gear", slot:"ring",     name:"Bloodthorn Ring",      atk:11, def:6, reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_ring.png` },
  bt_common_amulet:    { type:"gear", slot:"amulet",   name:"Bloodthorn Amulet",    atk:11, def:6, reqLevel:60, rarity:"common",   img:`${Z7_ITEM_PATH}/bt_common_amulet.png` },

  bt_rare_helmet:      { type:"gear", slot:"helmet",   name:"Crimsonthorn Helm",    atk:0,  def:40,reqLevel:60, rarity:"rare",     img:`${Z7_ITEM_PATH}/bt_rare_helmet.png` },
  bt_rare_chest:       { type:"gear", slot:"chest",    name:"Crimsonthorn Cuirass", atk:0,  def:52,reqLevel:60, rarity:"rare",     img:`${Z7_ITEM_PATH}/bt_rare_chest.png` },
  bt_rare_belt:        { type:"gear", slot:"belt",     name:"Crimsonthorn Belt",    atk:0,  def:24,reqLevel:60, rarity:"rare",     img:`${Z7_ITEM_PATH}/bt_rare_belt.png` },
  bt_rare_pants:       { type:"gear", slot:"pants",    name:"Crimsonthorn Pants",   atk:0,  def:42,reqLevel:60, rarity:"rare",     img:`${Z7_ITEM_PATH}/bt_rare_pants.png` },
  bt_rare_gloves:      { type:"gear", slot:"gloves",   name:"Crimsonthorn Gloves",  atk:0,  def:24,reqLevel:60, rarity:"rare",     img:`${Z7_ITEM_PATH}/bt_rare_gloves.png` },
  bt_rare_boots:       { type:"gear", slot:"boots",    name:"Crimsonthorn Boots",   atk:0,  def:24,reqLevel:60, rarity:"rare",     img:`${Z7_ITEM_PATH}/bt_rare_boots.png` },

  bt_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Thicketlord Bracers",  atk:0,  def:48,reqLevel:60, rarity:"legendary", img:`${Z7_ITEM_PATH}/bt_legendary_bracers.png` },
  bt_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Thicketlord Greatblade",atk:60, def:0, reqLevel:60, rarity:"legendary", img:`${Z7_ITEM_PATH}/bt_legendary_main_hand.png` },
  bt_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Thicketlord Greatblade",atk:60, def:0, reqLevel:60, rarity:"legendary", img:`${Z7_ITEM_PATH}/bt_legendary_off_hand.png` },
  bt_legendary_shield:   { type:"gear", slot:"offHand",  name:"Thicketlord Shield",  atk:0,  def:60,reqLevel:60, rarity:"legendary", img:`${Z7_ITEM_PATH}/bt_legendary_shield.png` },
  bt_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Thicketlord Mantle",  atk:0,  def:32,reqLevel:60, rarity:"legendary", img:`${Z7_ITEM_PATH}/bt_legendary_shoulders.png` },
  bt_legendary_ring:     { type:"gear", slot:"ring",     name:"Thicketlord Ring",    atk:16, def:10,reqLevel:60, rarity:"legendary", img:`${Z7_ITEM_PATH}/bt_legendary_ring.png` },
  bt_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Thicketlord Amulet",  atk:16, def:10,reqLevel:60, rarity:"legendary", img:`${Z7_ITEM_PATH}/bt_legendary_amulet.png` },

  // ===== Zone 8 =====
  dh_common_main_hand: { type:"gear", slot:"mainHand", name:"Dreadmist Sabre",      atk:28, def:0, reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_main_hand.png` },
  dh_common_off_hand:  { type:"gear", slot:"offHand",  name:"Dreadmist Sabre",      atk:28, def:0, reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_off_hand.png` },
  dh_common_shield:    { type:"gear", slot:"offHand",  name:"Stormveil Shield",     atk:0,  def:28,reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_shield.png` },
  dh_common_helmet:    { type:"gear", slot:"helmet",   name:"Dreadmist Helm",       atk:0,  def:28,reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_helmet.png` },
  dh_common_shoulders: { type:"gear", slot:"shoulders",name:"Dreadmist Mantle",     atk:0,  def:18,reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_shoulders.png` },
  dh_common_chest:     { type:"gear", slot:"chest",    name:"Dreadmist Cuirass",    atk:0,  def:42,reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_chest.png` },
  dh_common_bracers:   { type:"gear", slot:"bracers",  name:"Dreadmist Bracers",    atk:0,  def:18,reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_bracers.png` },
  dh_common_gloves:    { type:"gear", slot:"gloves",   name:"Dreadmist Gloves",     atk:0,  def:18,reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_gloves.png` },
  dh_common_belt:      { type:"gear", slot:"belt",     name:"Dreadmist Belt",       atk:0,  def:18,reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_belt.png` },
  dh_common_pants:     { type:"gear", slot:"pants",    name:"Dreadmist Trousers",   atk:0,  def:36,reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_pants.png` },
  dh_common_boots:     { type:"gear", slot:"boots",    name:"Dreadmist Boots",      atk:0,  def:18,reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_boots.png` },
  dh_common_ring:      { type:"gear", slot:"ring",     name:"Dreadmist Ring",       atk:13, def:7, reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_ring.png` },
  dh_common_amulet:    { type:"gear", slot:"amulet",   name:"Dreadmist Amulet",     atk:13, def:7, reqLevel:70, rarity:"common",   img:`${Z8_ITEM_PATH}/dh_common_amulet.png` },

  dh_rare_helmet:      { type:"gear", slot:"helmet",   name:"Stormveil Helm",       atk:0,  def:46,reqLevel:70, rarity:"rare",     img:`${Z8_ITEM_PATH}/dh_rare_helmet.png` },
  dh_rare_chest:       { type:"gear", slot:"chest",    name:"Stormveil Cuirass",    atk:0,  def:60,reqLevel:70, rarity:"rare",     img:`${Z8_ITEM_PATH}/dh_rare_chest.png` },
  dh_rare_belt:        { type:"gear", slot:"belt",     name:"Stormveil Belt",       atk:0,  def:28,reqLevel:70, rarity:"rare",     img:`${Z8_ITEM_PATH}/dh_rare_belt.png` },
  dh_rare_pants:       { type:"gear", slot:"pants",    name:"Stormveil Pants",      atk:0,  def:48,reqLevel:70, rarity:"rare",     img:`${Z8_ITEM_PATH}/dh_rare_pants.png` },
  dh_rare_gloves:      { type:"gear", slot:"gloves",   name:"Stormveil Gloves",     atk:0,  def:28,reqLevel:70, rarity:"rare",     img:`${Z8_ITEM_PATH}/dh_rare_gloves.png` },
  dh_rare_boots:       { type:"gear", slot:"boots",    name:"Stormveil Boots",      atk:0,  def:28,reqLevel:70, rarity:"rare",     img:`${Z8_ITEM_PATH}/dh_rare_boots.png` },

  dh_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Highlord Bracers",    atk:0,  def:56,reqLevel:70, rarity:"legendary", img:`${Z8_ITEM_PATH}/dh_legendary_bracers.png` },
  dh_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Highlord Greatblade",atk:68, def:0, reqLevel:70, rarity:"legendary", img:`${Z8_ITEM_PATH}/dh_legendary_main_hand.png` },
  dh_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Highlord Greatblade",atk:68, def:0, reqLevel:70, rarity:"legendary", img:`${Z8_ITEM_PATH}/dh_legendary_off_hand.png` },
  dh_legendary_shield:   { type:"gear", slot:"offHand",  name:"Highlord Shield",    atk:0,  def:68,reqLevel:70, rarity:"legendary", img:`${Z8_ITEM_PATH}/dh_legendary_shield.png` },
  dh_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Highlord Mantle",    atk:0,  def:36,reqLevel:70, rarity:"legendary", img:`${Z8_ITEM_PATH}/dh_legendary_shoulders.png` },
  dh_legendary_ring:     { type:"gear", slot:"ring",     name:"Highlord Ring",      atk:18, def:12,reqLevel:70, rarity:"legendary", img:`${Z8_ITEM_PATH}/dh_legendary_ring.png` },
  dh_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Highlord Amulet",    atk:18, def:12,reqLevel:70, rarity:"legendary", img:`${Z8_ITEM_PATH}/dh_legendary_amulet.png` },

  // ===== Zone 9 =====
  ow_common_main_hand: { type:"gear", slot:"mainHand", name:"Obsidian Fang",        atk:32, def:0, reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_main_hand.png` },
  ow_common_off_hand:  { type:"gear", slot:"offHand",  name:"Obsidian Fang",        atk:32, def:0, reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_off_hand.png` },
  ow_common_shield:    { type:"gear", slot:"offHand",  name:"Ashforged Shield",     atk:0,  def:32,reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_shield.png` },
  ow_common_helmet:    { type:"gear", slot:"helmet",   name:"Obsidian Helm",        atk:0,  def:32,reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_helmet.png` },
  ow_common_shoulders: { type:"gear", slot:"shoulders",name:"Obsidian Mantle",      atk:0,  def:20,reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_shoulders.png` },
  ow_common_chest:     { type:"gear", slot:"chest",    name:"Obsidian Cuirass",     atk:0,  def:48,reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_chest.png` },
  ow_common_bracers:   { type:"gear", slot:"bracers",  name:"Obsidian Bracers",     atk:0,  def:20,reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_bracers.png` },
  ow_common_gloves:    { type:"gear", slot:"gloves",   name:"Obsidian Gloves",      atk:0,  def:20,reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_gloves.png` },
  ow_common_belt:      { type:"gear", slot:"belt",     name:"Obsidian Belt",        atk:0,  def:20,reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_belt.png` },
  ow_common_pants:     { type:"gear", slot:"pants",    name:"Obsidian Trousers",    atk:0,  def:42,reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_pants.png` },
  ow_common_boots:     { type:"gear", slot:"boots",    name:"Obsidian Boots",       atk:0,  def:20,reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_boots.png` },
  ow_common_ring:      { type:"gear", slot:"ring",     name:"Obsidian Ring",        atk:15, def:8, reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_ring.png` },
  ow_common_amulet:    { type:"gear", slot:"amulet",   name:"Obsidian Amulet",      atk:15, def:8, reqLevel:80, rarity:"common",   img:`${Z9_ITEM_PATH}/ow_common_amulet.png` },

  ow_rare_helmet:      { type:"gear", slot:"helmet",   name:"Ashforged Helm",       atk:0,  def:52,reqLevel:80, rarity:"rare",     img:`${Z9_ITEM_PATH}/ow_rare_helmet.png` },
  ow_rare_chest:       { type:"gear", slot:"chest",    name:"Ashforged Cuirass",    atk:0,  def:68,reqLevel:80, rarity:"rare",     img:`${Z9_ITEM_PATH}/ow_rare_chest.png` },
  ow_rare_belt:        { type:"gear", slot:"belt",     name:"Ashforged Belt",       atk:0,  def:32,reqLevel:80, rarity:"rare",     img:`${Z9_ITEM_PATH}/ow_rare_belt.png` },
  ow_rare_pants:       { type:"gear", slot:"pants",    name:"Ashforged Pants",      atk:0,  def:54,reqLevel:80, rarity:"rare",     img:`${Z9_ITEM_PATH}/ow_rare_pants.png` },
  ow_rare_gloves:      { type:"gear", slot:"gloves",   name:"Ashforged Gloves",     atk:0,  def:32,reqLevel:80, rarity:"rare",     img:`${Z9_ITEM_PATH}/ow_rare_gloves.png` },
  ow_rare_boots:       { type:"gear", slot:"boots",    name:"Ashforged Boots",      atk:0,  def:32,reqLevel:80, rarity:"rare",     img:`${Z9_ITEM_PATH}/ow_rare_boots.png` },

  ow_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Volcanic Bracers",    atk:0,  def:64,reqLevel:80, rarity:"legendary", img:`${Z9_ITEM_PATH}/ow_legendary_bracers.png` },
  ow_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Volcanic Greatblade",atk:76, def:0, reqLevel:80, rarity:"legendary", img:`${Z9_ITEM_PATH}/ow_legendary_main_hand.png` },
  ow_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Volcanic Greatblade",atk:76, def:0, reqLevel:80, rarity:"legendary", img:`${Z9_ITEM_PATH}/ow_legendary_off_hand.png` },
  ow_legendary_shield:   { type:"gear", slot:"offHand",  name:"Volcanic Shield",    atk:0,  def:76,reqLevel:80, rarity:"legendary", img:`${Z9_ITEM_PATH}/ow_legendary_shield.png` },
  ow_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Volcanic Mantle",    atk:0,  def:40,reqLevel:80, rarity:"legendary", img:`${Z9_ITEM_PATH}/ow_legendary_shoulders.png` },
  ow_legendary_ring:     { type:"gear", slot:"ring",     name:"Volcanic Ring",      atk:20, def:14,reqLevel:80, rarity:"legendary", img:`${Z9_ITEM_PATH}/ow_legendary_ring.png` },
  ow_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Volcanic Amulet",    atk:20, def:14,reqLevel:80, rarity:"legendary", img:`${Z9_ITEM_PATH}/ow_legendary_amulet.png` },

  // ===== Zone 10 =====
  ar_common_main_hand: { type:"gear", slot:"mainHand", name:"Abyssal Saber",        atk:36, def:0, reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_main_hand.png` },
  ar_common_off_hand:  { type:"gear", slot:"offHand",  name:"Abyssal Saber",        atk:36, def:0, reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_off_hand.png` },
  ar_common_shield:    { type:"gear", slot:"offHand",  name:"Voidforged Shield",    atk:0,  def:36,reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_shield.png` },
  ar_common_helmet:    { type:"gear", slot:"helmet",   name:"Abyssal Helm",         atk:0,  def:36,reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_helmet.png` },
  ar_common_shoulders: { type:"gear", slot:"shoulders",name:"Abyssal Mantle",       atk:0,  def:22,reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_shoulders.png` },
  ar_common_chest:     { type:"gear", slot:"chest",    name:"Abyssal Cuirass",      atk:0,  def:54,reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_chest.png` },
  ar_common_bracers:   { type:"gear", slot:"bracers",  name:"Abyssal Bracers",      atk:0,  def:22,reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_bracers.png` },
  ar_common_gloves:    { type:"gear", slot:"gloves",   name:"Abyssal Gloves",       atk:0,  def:22,reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_gloves.png` },
  ar_common_belt:      { type:"gear", slot:"belt",     name:"Abyssal Belt",         atk:0,  def:22,reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_belt.png` },
  ar_common_pants:     { type:"gear", slot:"pants",    name:"Abyssal Trousers",     atk:0,  def:48,reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_pants.png` },
  ar_common_boots:     { type:"gear", slot:"boots",    name:"Abyssal Boots",        atk:0,  def:22,reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_boots.png` },
  ar_common_ring:      { type:"gear", slot:"ring",     name:"Abyssal Ring",         atk:17, def:9, reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_ring.png` },
  ar_common_amulet:    { type:"gear", slot:"amulet",   name:"Abyssal Amulet",       atk:17, def:9, reqLevel:90, rarity:"common",   img:`${Z10_ITEM_PATH}/ar_common_amulet.png` },

  ar_rare_helmet:      { type:"gear", slot:"helmet",   name:"Voidforged Helm",      atk:0,  def:58,reqLevel:90, rarity:"rare",     img:`${Z10_ITEM_PATH}/ar_rare_helmet.png` },
  ar_rare_chest:       { type:"gear", slot:"chest",    name:"Voidforged Cuirass",   atk:0,  def:76,reqLevel:90, rarity:"rare",     img:`${Z10_ITEM_PATH}/ar_rare_chest.png` },
  ar_rare_belt:        { type:"gear", slot:"belt",     name:"Voidforged Belt",      atk:0,  def:36,reqLevel:90, rarity:"rare",     img:`${Z10_ITEM_PATH}/ar_rare_belt.png` },
  ar_rare_pants:       { type:"gear", slot:"pants",    name:"Voidforged Pants",     atk:0,  def:60,reqLevel:90, rarity:"rare",     img:`${Z10_ITEM_PATH}/ar_rare_pants.png` },
  ar_rare_gloves:      { type:"gear", slot:"gloves",   name:"Voidforged Gloves",    atk:0,  def:36,reqLevel:90, rarity:"rare",     img:`${Z10_ITEM_PATH}/ar_rare_gloves.png` },
  ar_rare_boots:       { type:"gear", slot:"boots",    name:"Voidforged Boots",     atk:0,  def:36,reqLevel:90, rarity:"rare",     img:`${Z10_ITEM_PATH}/ar_rare_boots.png` },

  ar_legendary_bracers:  { type:"gear", slot:"bracers",  name:"Riftlord Bracers",    atk:0,  def:72,reqLevel:90, rarity:"legendary", img:`${Z10_ITEM_PATH}/ar_legendary_bracers.png` },
  ar_legendary_main_hand:{ type:"gear", slot:"mainHand", name:"Riftlord Greatblade",atk:84, def:0, reqLevel:90, rarity:"legendary", img:`${Z10_ITEM_PATH}/ar_legendary_main_hand.png` },
  ar_legendary_off_hand: { type:"gear", slot:"offHand",  name:"Riftlord Greatblade",atk:84, def:0, reqLevel:90, rarity:"legendary", img:`${Z10_ITEM_PATH}/ar_legendary_off_hand.png` },
  ar_legendary_shield:   { type:"gear", slot:"offHand",  name:"Riftlord Shield",    atk:0,  def:84,reqLevel:90, rarity:"legendary", img:`${Z10_ITEM_PATH}/ar_legendary_shield.png` },
  ar_legendary_shoulders:{ type:"gear", slot:"shoulders",name:"Riftlord Mantle",    atk:0,  def:44,reqLevel:90, rarity:"legendary", img:`${Z10_ITEM_PATH}/ar_legendary_shoulders.png` },
  ar_legendary_ring:     { type:"gear", slot:"ring",     name:"Riftlord Ring",      atk:22, def:16,reqLevel:90, rarity:"legendary", img:`${Z10_ITEM_PATH}/ar_legendary_ring.png` },
  ar_legendary_amulet:   { type:"gear", slot:"amulet",   name:"Riftlord Amulet",    atk:22, def:16,reqLevel:90, rarity:"legendary", img:`${Z10_ITEM_PATH}/ar_legendary_amulet.png` },

  ashgrip_gloves:      { type:"gear", slot:"gloves",    name:"Ashgrip Gloves",       atk:0, def:1, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/ashgrip_gloves.png` },
  rustwrap_bracers:    { type:"gear", slot:"bracers",   name:"Rustwrap Bracers",     atk:0, def:1, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/rustwrap_bracers.png` },
  dustwalk_boots:      { type:"gear", slot:"boots",     name:"Dustwalk Boots",       atk:0, def:1, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/dustwalk_boots.png` },
  reinforced_belt:     { type:"gear", slot:"belt",      name:"Reinforced Belt",      atk:0, def:1, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/reinforced_belt.png` },
  miners_ironcap:      { type:"gear", slot:"helmet",    name:"Miner’s Ironcap",      atk:0, def:2, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/miners_ironcap.png` },
  coalweave_trousers:  { type:"gear", slot:"pants",     name:"Coalweave Trousers",   atk:0, def:2, reqLevel:1,  rarity:"common",   img:`${Z1_ITEM_PATH}/coalweave_trousers.png` },

  sootband_ring:       { type:"gear", slot:"ring",      name:"Sootband Ring",        atk:1, def:1, reqLevel:1,  rarity:"uncommon", img:`${Z1_ITEM_PATH}/sootband_ring.png` },
  ember_charm:         { type:"gear", slot:"amulet",    name:"Ember Charm",          atk:1, def:1, reqLevel:1,  rarity:"uncommon", img:`${Z1_ITEM_PATH}/ember_charm.png` },
  charred_buckler:     { type:"gear", slot:"offHand",   name:"Charred Buckler",      atk:0, def:3, reqLevel:1,  rarity:"uncommon", img:`${Z1_ITEM_PATH}/charred_buckler.png` },
  cragstone_shoulders: { type:"gear", slot:"shoulders", name:"Cragstone Shoulders",  atk:0, def:2, reqLevel:1,  rarity:"uncommon", img:`${Z1_ITEM_PATH}/cragstone_shoulders.png` },

  rustpick_blade:      { type:"gear", slot:"mainHand",  name:"Rustpick Blade",       atk:5, def:0, reqLevel:1,  rarity:"rare",     img:`${Z1_ITEM_PATH}/rustpick_blade.png` },
  ashweave_jerkin:     { type:"gear", slot:"chest",     name:"Ashweave Jerkin",      atk:0, def:4, reqLevel:1,  rarity:"rare",     img:`${Z1_ITEM_PATH}/ashweave_jerkin.png` },

  ember_axe:           { type:"gear", slot:"mainHand",  name:"Ember Axe",            atk:9, def:1, reqLevel:1,  rarity:"mythic",   img:`${Z1_ITEM_PATH}/ember_axe.png` },

  // ===== Zone 2 (Req Lv 10) =====
  gravepiercer_blade:             { type:"gear", slot:"mainHand",  name:"Gravepiercer Blade",              atk:12, def:0, reqLevel:10, rarity:"rare",      img:`${Z2_ITEM_PATH}/gravepiercer_blade.png` },
  wardens_blacksteel_shield:      { type:"gear", slot:"offHand",   name:"Warden’s Blacksteel Shield",     atk:0,  def:9, reqLevel:10, rarity:"uncommon",  img:`${Z2_ITEM_PATH}/wardens_blacksteel_shield.png` },
  visor_of_hollow_kings:          { type:"gear", slot:"helmet",    name:"Visor of Hollow Kings",          atk:0,  def:7, reqLevel:10, rarity:"uncommon",  img:`${Z2_ITEM_PATH}/visor_of_hollow_kings.png` },
  revenant_warplate:              { type:"gear", slot:"chest",     name:"Revenant Warplate",              atk:0,  def:12,reqLevel:10, rarity:"rare",      img:`${Z2_ITEM_PATH}/revenant_warplate.png` },
  cryptbound_leggings:            { type:"gear", slot:"pants",     name:"Cryptbound Leggings",            atk:0,  def:8, reqLevel:10, rarity:"common",    img:`${Z2_ITEM_PATH}/cryptbound_leggings.png` },
  gravesoil_marchers:             { type:"gear", slot:"boots",     name:"Gravesoil Marchers",             atk:0,  def:6, reqLevel:10, rarity:"common",    img:`${Z2_ITEM_PATH}/gravesoil_marchers.png` },
  iron_oath_gauntlets:            { type:"gear", slot:"gloves",    name:"Iron Oath Gauntlets",            atk:0,  def:6, reqLevel:10, rarity:"common",    img:`${Z2_ITEM_PATH}/iron_oath_gauntlets.png` },
  executioners_strap:             { type:"gear", slot:"belt",      name:"Executioner’s Strap",            atk:0,  def:6, reqLevel:10, rarity:"common",    img:`${Z2_ITEM_PATH}/executioners_strap.png` },
  pauldrons_of_the_fallen_banner: { type:"gear", slot:"shoulders", name:"Pauldrons of the Fallen Banner", atk:0,  def:7, reqLevel:10, rarity:"uncommon",  img:`${Z2_ITEM_PATH}/pauldrons_of_the_fallen_banner.png` },
  bone_linked_bracers:            { type:"gear", slot:"bracers",   name:"Bone-Linked Bracers",            atk:0,  def:6, reqLevel:10, rarity:"common",    img:`${Z2_ITEM_PATH}/bone_linked_bracers.png` },
  sigil_of_the_broken_oath:       { type:"gear", slot:"amulet",    name:"Sigil of the Broken Oath",       atk:2,  def:2, reqLevel:10, rarity:"uncommon",  img:`${Z2_ITEM_PATH}/sigil_of_the_broken_oath.png` },
  graveband_ring:                 { type:"gear", slot:"ring",      name:"Graveband Ring",                 atk:2,  def:2, reqLevel:10, rarity:"uncommon",  img:`${Z2_ITEM_PATH}/graveband_ring.png` },

  soulrender_blade_of_the_keep:   { type:"gear", slot:"mainHand",  name:"Soulrender Blade of the Keep",   atk:20, def:3, reqLevel:10, rarity:"mythic",    img:`${Z2_ITEM_PATH}/soulrender_blade_of_the_keep.png` },

  // ===== Zone 3 (Req Lv 30) — your list =====
  crown_of_the_scorched_prophet: { type:"gear", slot:"helmet",   name:"Crown of the Scorched Prophet", atk:0,  def:14, reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/crown_of_the_scorched_prophet.png` },
  relic_of_the_first_dawn:       { type:"gear", slot:"amulet",   name:"Relic of the First Dawn",       atk:4,  def:4,  reqLevel:20, rarity:"uncommon", img:`${Z3_ITEM_PATH}/relic_of_the_first_dawn.png` },

  hands_of_the_last_oasis:       { type:"gear", slot:"gloves",   name:"Hands of the Last Oasis",       atk:0,  def:8,  reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/hands_of_the_last_oasis.png` },
  girdle_of_shifting_dunes:      { type:"gear", slot:"belt",     name:"Girdle of Shifting Dunes",      atk:0,  def:8,  reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/girdle_of_shifting_dunes.png` },

  ring_of_the_solar_eclipse:     { type:"gear", slot:"ring",     name:"Ring of the Solar Eclipse",     atk:4,  def:4,  reqLevel:20, rarity:"uncommon", img:`${Z3_ITEM_PATH}/ring_of_the_solar_eclipse.png` },
  bracers_of_the_sunlit_tomb:    { type:"gear", slot:"bracers",  name:"Bracers of the Sunlit Tomb",    atk:0,  def:8,  reqLevel:20, rarity:"common",   img:`${Z3_ITEM_PATH}/bracers_of_the_sunlit_tomb.png` },

  sunpiercer_khopesh:            { type:"gear", slot:"mainHand", name:"Sunpiercer Khopesh",            atk:18, def:0,  reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/sunpiercer_khopesh.png` },
  legwraps_of_the_dustbound:     { type:"gear", slot:"pants",    name:"Legwraps of the Dustbound",     atk:0,  def:10, reqLevel:20, rarity:"uncommon", img:`${Z3_ITEM_PATH}/legwraps_of_the_dustbound.png` },

  aegis_of_buried_dynasties:     { type:"gear", slot:"offHand",  name:"Aegis of Buried Dynasties",     atk:0,  def:16, reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/aegis_of_buried_dynasties.png` },
  sunstrider_greaves:            { type:"gear", slot:"boots",    name:"Sunstrider Greaves",            atk:0,  def:10, reqLevel:20, rarity:"uncommon", img:`${Z3_ITEM_PATH}/sunstrider_greaves.png` },

  raiment_of_gilded_sands:       { type:"gear", slot:"chest",    name:"Raiment of Gilded Sands",       atk:2,  def:22, reqLevel:20, rarity:"epic",     img:`${Z3_ITEM_PATH}/raiment_of_gilded_sands.png` },
  mantle_of_fading_horizons:     { type:"gear", slot:"shoulders",name:"Mantle of Fading Horizons",     atk:0,  def:12, reqLevel:20, rarity:"rare",     img:`${Z3_ITEM_PATH}/mantle_of_fading_horizons.png` },

  // Mythic (zone-wide)
  aegis_of_the_drowned_sun:      { type:"gear", slot:"chest",    name:"Aegis of the Drowned Sun",      atk:6,  def:30, reqLevel:20, rarity:"mythic",   img:`${Z3_ITEM_PATH}/aegis_of_the_drowned_sun.png` }
};

// =========================
// DROPS: 2 unique rolls per mob + zone-wide mythic
// =========================
// Zone fight drop rates
const RARITY_CHANCE = {
  common:    1 / 150,
  rare:      1 / 1000,
  legendary: 1 / 10000
};

const ZONE_MYTHIC_CHANCE = 0.00001; // 1/100000 per kill
const MOB_UNIQUE_DROPS = {
  // Zone 1
  whispering_woods: {
    // 4 items
    mossling: [
      ITEM_LIBRARY.ww_common_helmet,
      ITEM_LIBRARY.ww_common_boots,
      ITEM_LIBRARY.ww_common_shield,
      ITEM_LIBRARY.ww_rare_helmet,
      ITEM_LIBRARY.ww_legendary_ring
    ],
    // 5 items
    thorn_rabbit: [
      ITEM_LIBRARY.ww_common_chest,
      ITEM_LIBRARY.ww_common_belt,
      ITEM_LIBRARY.ww_common_ring,
      ITEM_LIBRARY.ww_rare_chest,
      ITEM_LIBRARY.ww_legendary_shoulders
    ],
    // 5 items
    rootling_stalker: [
      ITEM_LIBRARY.ww_common_gloves,
      ITEM_LIBRARY.ww_common_pants,
      ITEM_LIBRARY.ww_common_amulet,
      ITEM_LIBRARY.ww_rare_belt,
      ITEM_LIBRARY.ww_legendary_bracers
    ],
    // 5 items (2 rares)
    briar_wolf: [
      ITEM_LIBRARY.ww_common_shoulders,
      ITEM_LIBRARY.ww_common_bracers,
      ITEM_LIBRARY.ww_rare_pants,
      ITEM_LIBRARY.ww_rare_gloves,
      ITEM_LIBRARY.ww_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    ancient_bark_guardian: [
      ITEM_LIBRARY.ww_common_main_hand,
      ITEM_LIBRARY.ww_common_off_hand,
      ITEM_LIBRARY.ww_rare_boots,
      ITEM_LIBRARY.ww_legendary_main_hand,
      ITEM_LIBRARY.ww_legendary_off_hand,
      ITEM_LIBRARY.ww_legendary_shield
    ]
  },

  // Zone 2
  fogmoor_marsh: {
    // 4 items
    bog_slime: [
      ITEM_LIBRARY.fm_common_helmet,
      ITEM_LIBRARY.fm_common_boots,
      ITEM_LIBRARY.fm_common_shield,
      ITEM_LIBRARY.fm_rare_helmet,
      ITEM_LIBRARY.fm_legendary_ring
    ],
    // 5 items
    swamp_leech: [
      ITEM_LIBRARY.fm_common_chest,
      ITEM_LIBRARY.fm_common_belt,
      ITEM_LIBRARY.fm_common_ring,
      ITEM_LIBRARY.fm_rare_chest,
      ITEM_LIBRARY.fm_legendary_shoulders
    ],
    // 5 items
    rottoad: [
      ITEM_LIBRARY.fm_common_gloves,
      ITEM_LIBRARY.fm_common_pants,
      ITEM_LIBRARY.fm_common_amulet,
      ITEM_LIBRARY.fm_rare_belt,
      ITEM_LIBRARY.fm_legendary_bracers
    ],
    // 5 items (2 rares)
    marsh_stalker: [
      ITEM_LIBRARY.fm_common_shoulders,
      ITEM_LIBRARY.fm_common_bracers,
      ITEM_LIBRARY.fm_rare_pants,
      ITEM_LIBRARY.fm_rare_gloves,
      ITEM_LIBRARY.fm_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    plague_mirebeast: [
      ITEM_LIBRARY.fm_common_main_hand,
      ITEM_LIBRARY.fm_common_off_hand,
      ITEM_LIBRARY.fm_rare_boots,
      ITEM_LIBRARY.fm_legendary_main_hand,
      ITEM_LIBRARY.fm_legendary_off_hand,
      ITEM_LIBRARY.fm_legendary_shield
    ]
  },

  // Zone 3
  ravenhill_fields: {
    // 4 items
    grave_crow: [
      ITEM_LIBRARY.rh_common_helmet,
      ITEM_LIBRARY.rh_common_boots,
      ITEM_LIBRARY.rh_common_shield,
      ITEM_LIBRARY.rh_rare_helmet,
      ITEM_LIBRARY.rh_legendary_ring
    ],
    // 5 items
    bone_scavenger: [
      ITEM_LIBRARY.rh_common_chest,
      ITEM_LIBRARY.rh_common_belt,
      ITEM_LIBRARY.rh_common_ring,
      ITEM_LIBRARY.rh_rare_chest,
      ITEM_LIBRARY.rh_legendary_shoulders
    ],
    // 5 items
    rotting_soldier: [
      ITEM_LIBRARY.rh_common_gloves,
      ITEM_LIBRARY.rh_common_pants,
      ITEM_LIBRARY.rh_common_amulet,
      ITEM_LIBRARY.rh_rare_belt,
      ITEM_LIBRARY.rh_legendary_bracers
    ],
    // 5 items (2 rares)
    carrion_hound: [
      ITEM_LIBRARY.rh_common_shoulders,
      ITEM_LIBRARY.rh_common_bracers,
      ITEM_LIBRARY.rh_rare_pants,
      ITEM_LIBRARY.rh_rare_gloves,
      ITEM_LIBRARY.rh_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    warlord_revenant: [
      ITEM_LIBRARY.rh_common_main_hand,
      ITEM_LIBRARY.rh_common_off_hand,
      ITEM_LIBRARY.rh_rare_boots,
      ITEM_LIBRARY.rh_legendary_main_hand,
      ITEM_LIBRARY.rh_legendary_off_hand,
      ITEM_LIBRARY.rh_legendary_shield
    ]
  },

  // Zone 4
  grimroot_forest: {
    // 4 items
    spore_bat: [
      ITEM_LIBRARY.gr_common_helmet,
      ITEM_LIBRARY.gr_common_boots,
      ITEM_LIBRARY.gr_common_shield,
      ITEM_LIBRARY.gr_rare_helmet,
      ITEM_LIBRARY.gr_legendary_ring
    ],
    // 5 items
    root_creeper: [
      ITEM_LIBRARY.gr_common_chest,
      ITEM_LIBRARY.gr_common_belt,
      ITEM_LIBRARY.gr_common_ring,
      ITEM_LIBRARY.gr_rare_chest,
      ITEM_LIBRARY.gr_legendary_shoulders
    ],
    // 5 items
    fungus_brute: [
      ITEM_LIBRARY.gr_common_gloves,
      ITEM_LIBRARY.gr_common_pants,
      ITEM_LIBRARY.gr_common_amulet,
      ITEM_LIBRARY.gr_rare_belt,
      ITEM_LIBRARY.gr_legendary_bracers
    ],
    // 5 items (2 rares)
    corrupted_treant: [
      ITEM_LIBRARY.gr_common_shoulders,
      ITEM_LIBRARY.gr_common_bracers,
      ITEM_LIBRARY.gr_rare_pants,
      ITEM_LIBRARY.gr_rare_gloves,
      ITEM_LIBRARY.gr_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    ancient_root_titan: [
      ITEM_LIBRARY.gr_common_main_hand,
      ITEM_LIBRARY.gr_common_off_hand,
      ITEM_LIBRARY.gr_rare_boots,
      ITEM_LIBRARY.gr_legendary_main_hand,
      ITEM_LIBRARY.gr_legendary_off_hand,
      ITEM_LIBRARY.gr_legendary_shield
    ]
  },

  // Zone 5
  ashen_plains: {
    // 4 items
    ash_vulture: [
      ITEM_LIBRARY.ap_common_helmet,
      ITEM_LIBRARY.ap_common_boots,
      ITEM_LIBRARY.ap_common_shield,
      ITEM_LIBRARY.ap_rare_helmet,
      ITEM_LIBRARY.ap_legendary_ring
    ],
    // 5 items
    lava_crawler: [
      ITEM_LIBRARY.ap_common_chest,
      ITEM_LIBRARY.ap_common_belt,
      ITEM_LIBRARY.ap_common_ring,
      ITEM_LIBRARY.ap_rare_chest,
      ITEM_LIBRARY.ap_legendary_shoulders
    ],
    // 5 items
    cinder_beast: [
      ITEM_LIBRARY.ap_common_gloves,
      ITEM_LIBRARY.ap_common_pants,
      ITEM_LIBRARY.ap_common_amulet,
      ITEM_LIBRARY.ap_rare_belt,
      ITEM_LIBRARY.ap_legendary_bracers
    ],
    // 5 items (2 rares)
    magma_brute: [
      ITEM_LIBRARY.ap_common_shoulders,
      ITEM_LIBRARY.ap_common_bracers,
      ITEM_LIBRARY.ap_rare_pants,
      ITEM_LIBRARY.ap_rare_gloves,
      ITEM_LIBRARY.ap_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    infernal_colossus: [
      ITEM_LIBRARY.ap_common_main_hand,
      ITEM_LIBRARY.ap_common_off_hand,
      ITEM_LIBRARY.ap_rare_boots,
      ITEM_LIBRARY.ap_legendary_main_hand,
      ITEM_LIBRARY.ap_legendary_off_hand,
      ITEM_LIBRARY.ap_legendary_shield
    ]
  },

  // Zone 6
  blackfang_canyon: {
    // 4 items
    ridge_hawk: [
      ITEM_LIBRARY.bf_common_helmet,
      ITEM_LIBRARY.bf_common_boots,
      ITEM_LIBRARY.bf_common_shield,
      ITEM_LIBRARY.bf_rare_helmet,
      ITEM_LIBRARY.bf_legendary_ring
    ],
    // 5 items
    stone_lurker: [
      ITEM_LIBRARY.bf_common_chest,
      ITEM_LIBRARY.bf_common_belt,
      ITEM_LIBRARY.bf_common_ring,
      ITEM_LIBRARY.bf_rare_chest,
      ITEM_LIBRARY.bf_legendary_shoulders
    ],
    // 5 items
    fang_stalker: [
      ITEM_LIBRARY.bf_common_gloves,
      ITEM_LIBRARY.bf_common_pants,
      ITEM_LIBRARY.bf_common_amulet,
      ITEM_LIBRARY.bf_rare_belt,
      ITEM_LIBRARY.bf_legendary_bracers
    ],
    // 5 items (2 rares)
    obsidian_ravager: [
      ITEM_LIBRARY.bf_common_shoulders,
      ITEM_LIBRARY.bf_common_bracers,
      ITEM_LIBRARY.bf_rare_pants,
      ITEM_LIBRARY.bf_rare_gloves,
      ITEM_LIBRARY.bf_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    blackfang_devourer: [
      ITEM_LIBRARY.bf_common_main_hand,
      ITEM_LIBRARY.bf_common_off_hand,
      ITEM_LIBRARY.bf_rare_boots,
      ITEM_LIBRARY.bf_legendary_main_hand,
      ITEM_LIBRARY.bf_legendary_off_hand,
      ITEM_LIBRARY.bf_legendary_shield
    ]
  },

  // Zone 7
  bloodthorn_thicket: {
    // 4 items
    thorn_harpy: [
      ITEM_LIBRARY.bt_common_helmet,
      ITEM_LIBRARY.bt_common_boots,
      ITEM_LIBRARY.bt_common_shield,
      ITEM_LIBRARY.bt_rare_helmet,
      ITEM_LIBRARY.bt_legendary_ring
    ],
    // 5 items
    bloodroot_parasite: [
      ITEM_LIBRARY.bt_common_chest,
      ITEM_LIBRARY.bt_common_belt,
      ITEM_LIBRARY.bt_common_ring,
      ITEM_LIBRARY.bt_rare_chest,
      ITEM_LIBRARY.bt_legendary_shoulders
    ],
    // 5 items
    razorback_bramble: [
      ITEM_LIBRARY.bt_common_gloves,
      ITEM_LIBRARY.bt_common_pants,
      ITEM_LIBRARY.bt_common_amulet,
      ITEM_LIBRARY.bt_rare_belt,
      ITEM_LIBRARY.bt_legendary_bracers
    ],
    // 5 items (2 rares)
    crimson_thorn_warden: [
      ITEM_LIBRARY.bt_common_shoulders,
      ITEM_LIBRARY.bt_common_bracers,
      ITEM_LIBRARY.bt_rare_pants,
      ITEM_LIBRARY.bt_rare_gloves,
      ITEM_LIBRARY.bt_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    heart_of_the_thicket: [
      ITEM_LIBRARY.bt_common_main_hand,
      ITEM_LIBRARY.bt_common_off_hand,
      ITEM_LIBRARY.bt_rare_boots,
      ITEM_LIBRARY.bt_legendary_main_hand,
      ITEM_LIBRARY.bt_legendary_off_hand,
      ITEM_LIBRARY.bt_legendary_shield
    ]
  },

  // Zone 8
  dreadmist_highlands: {
    // 4 items
    mist_raven: [
      ITEM_LIBRARY.dh_common_helmet,
      ITEM_LIBRARY.dh_common_boots,
      ITEM_LIBRARY.dh_common_shield,
      ITEM_LIBRARY.dh_rare_helmet,
      ITEM_LIBRARY.dh_legendary_ring
    ],
    // 5 items
    highland_wraith: [
      ITEM_LIBRARY.dh_common_chest,
      ITEM_LIBRARY.dh_common_belt,
      ITEM_LIBRARY.dh_common_ring,
      ITEM_LIBRARY.dh_rare_chest,
      ITEM_LIBRARY.dh_legendary_shoulders
    ],
    // 5 items
    frosthorn_ram: [
      ITEM_LIBRARY.dh_common_gloves,
      ITEM_LIBRARY.dh_common_pants,
      ITEM_LIBRARY.dh_common_amulet,
      ITEM_LIBRARY.dh_rare_belt,
      ITEM_LIBRARY.dh_legendary_bracers
    ],
    // 5 items (2 rares)
    stone_sentinel: [
      ITEM_LIBRARY.dh_common_shoulders,
      ITEM_LIBRARY.dh_common_bracers,
      ITEM_LIBRARY.dh_rare_pants,
      ITEM_LIBRARY.dh_rare_gloves,
      ITEM_LIBRARY.dh_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    ancient_storm_avatar: [
      ITEM_LIBRARY.dh_common_main_hand,
      ITEM_LIBRARY.dh_common_off_hand,
      ITEM_LIBRARY.dh_rare_boots,
      ITEM_LIBRARY.dh_legendary_main_hand,
      ITEM_LIBRARY.dh_legendary_off_hand,
      ITEM_LIBRARY.dh_legendary_shield
    ]
  },

  // Zone 9
  obsidian_wastes: {
    // 4 items
    lava_serpent: [
      ITEM_LIBRARY.ow_common_helmet,
      ITEM_LIBRARY.ow_common_boots,
      ITEM_LIBRARY.ow_common_shield,
      ITEM_LIBRARY.ow_rare_helmet,
      ITEM_LIBRARY.ow_legendary_ring
    ],
    // 5 items
    obsidian_gargoyle: [
      ITEM_LIBRARY.ow_common_chest,
      ITEM_LIBRARY.ow_common_belt,
      ITEM_LIBRARY.ow_common_ring,
      ITEM_LIBRARY.ow_rare_chest,
      ITEM_LIBRARY.ow_legendary_shoulders
    ],
    // 5 items
    magma_behemoth: [
      ITEM_LIBRARY.ow_common_gloves,
      ITEM_LIBRARY.ow_common_pants,
      ITEM_LIBRARY.ow_common_amulet,
      ITEM_LIBRARY.ow_rare_belt,
      ITEM_LIBRARY.ow_legendary_bracers
    ],
    // 5 items (2 rares)
    ash_revenant: [
      ITEM_LIBRARY.ow_common_shoulders,
      ITEM_LIBRARY.ow_common_bracers,
      ITEM_LIBRARY.ow_rare_pants,
      ITEM_LIBRARY.ow_rare_gloves,
      ITEM_LIBRARY.ow_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    inferno_titan: [
      ITEM_LIBRARY.ow_common_main_hand,
      ITEM_LIBRARY.ow_common_off_hand,
      ITEM_LIBRARY.ow_rare_boots,
      ITEM_LIBRARY.ow_legendary_main_hand,
      ITEM_LIBRARY.ow_legendary_off_hand,
      ITEM_LIBRARY.ow_legendary_shield
    ]
  },

  // Zone 10
  abyssal_rift: {
    // 4 items
    void_skyray: [
      ITEM_LIBRARY.ar_common_helmet,
      ITEM_LIBRARY.ar_common_boots,
      ITEM_LIBRARY.ar_common_shield,
      ITEM_LIBRARY.ar_rare_helmet,
      ITEM_LIBRARY.ar_legendary_ring
    ],
    // 5 items
    rift_crawler: [
      ITEM_LIBRARY.ar_common_chest,
      ITEM_LIBRARY.ar_common_belt,
      ITEM_LIBRARY.ar_common_ring,
      ITEM_LIBRARY.ar_rare_chest,
      ITEM_LIBRARY.ar_legendary_shoulders
    ],
    // 5 items
    abyss_watcher: [
      ITEM_LIBRARY.ar_common_gloves,
      ITEM_LIBRARY.ar_common_pants,
      ITEM_LIBRARY.ar_common_amulet,
      ITEM_LIBRARY.ar_rare_belt,
      ITEM_LIBRARY.ar_legendary_bracers
    ],
    // 5 items (2 rares)
    void_devourer: [
      ITEM_LIBRARY.ar_common_shoulders,
      ITEM_LIBRARY.ar_common_bracers,
      ITEM_LIBRARY.ar_rare_pants,
      ITEM_LIBRARY.ar_rare_gloves,
      ITEM_LIBRARY.ar_legendary_amulet
    ],
    // 5 items (2 legendaries: main/off-hand)
    eternal_rift_sovereign: [
      ITEM_LIBRARY.ar_common_main_hand,
      ITEM_LIBRARY.ar_common_off_hand,
      ITEM_LIBRARY.ar_rare_boots,
      ITEM_LIBRARY.ar_legendary_main_hand,
      ITEM_LIBRARY.ar_legendary_off_hand,
      ITEM_LIBRARY.ar_legendary_shield
    ]
  },

  // Zone 2 (legacy / other zone)
  iron_revenant_keep: {
    bone_archer:             [ ITEM_LIBRARY.bone_linked_bracers, ITEM_LIBRARY.gravesoil_marchers ],
    rusted_revenant:         [ ITEM_LIBRARY.cryptbound_leggings, ITEM_LIBRARY.executioners_strap ],
    crypt_acolyte:           [ ITEM_LIBRARY.sigil_of_the_broken_oath, ITEM_LIBRARY.graveband_ring ],
    dread_hound:             [ ITEM_LIBRARY.iron_oath_gauntlets, ITEM_LIBRARY.visor_of_hollow_kings ],
    iron_revenant_captain:   [ ITEM_LIBRARY.wardens_blacksteel_shield, ITEM_LIBRARY.gravepiercer_blade ],
    shieldbearer_wraith:     [ ITEM_LIBRARY.revenant_warplate, ITEM_LIBRARY.pauldrons_of_the_fallen_banner ],
    lord_of_the_broken_keep: [ ITEM_LIBRARY.gravepiercer_blade, ITEM_LIBRARY.revenant_warplate ]
  },

  // Zone 3 (your mapping)
  desert_wastes: {
    dune_herald:                 [ ITEM_LIBRARY.crown_of_the_scorched_prophet, ITEM_LIBRARY.relic_of_the_first_dawn ],
    sand_apostle:                [ ITEM_LIBRARY.hands_of_the_last_oasis, ITEM_LIBRARY.girdle_of_shifting_dunes ],
    vulture_of_the_last_light:   [ ITEM_LIBRARY.ring_of_the_solar_eclipse, ITEM_LIBRARY.bracers_of_the_sunlit_tomb ],
    sun_cursed_nomad:            [ ITEM_LIBRARY.sunpiercer_khopesh, ITEM_LIBRARY.legwraps_of_the_dustbound ],
    scarab_of_the_divine_vault:  [ ITEM_LIBRARY.aegis_of_buried_dynasties, ITEM_LIBRARY.sunstrider_greaves ],
    king_of_shifting_thrones:    [ ITEM_LIBRARY.raiment_of_gilded_sands, ITEM_LIBRARY.mantle_of_fading_horizons ],
    sovereign_of_the_drowned_sun:[ ITEM_LIBRARY.raiment_of_gilded_sands, ITEM_LIBRARY.sunpiercer_khopesh ]
  }
};

const ZONE_MYTHIC = {
  whispering_woods: ITEM_LIBRARY.ember_axe,
  iron_revenant_keep: ITEM_LIBRARY.soulrender_blade_of_the_keep,
  desert_wastes: ITEM_LIBRARY.aegis_of_the_drowned_sun
};

function normalizeRarity(r){
  const key = String(r || "").toLowerCase();
  if (key === "uncommon") return "rare";
  if (key === "epic") return "legendary";
  return key;
}

function rollUniqueDrops(zoneId, mobId){
  const z = MOB_UNIQUE_DROPS[zoneId];
  if(!z) return [];
  const list = z[mobId];
  if(!Array.isArray(list) || list.length === 0) return [];
  const save = getCurrentSave();
  const fortune = getFortunePetBonuses(save);
  const potionBonuses = getPotionBonuses(save);
  const luckMult = 1 + Math.max(0, num(fortune.luckPct, 0)) + Math.max(0, num(potionBonuses.luckPct, 0));

  const out = [];
  for(const it of list){
    if(!it) continue;
    const r = normalizeRarity(it.rarity);
    const p = (RARITY_CHANCE[r] ?? 0) * luckMult;
    if(Math.random() < p) out.push({ ...it, quantity: 1 });
  }
  return out;
}

function rollZoneMythic(zoneId){
  const it = ZONE_MYTHIC[zoneId];
  if(!it) return null;
  const save = getCurrentSave();
  const fortune = getFortunePetBonuses(save);
  const potionBonuses = getPotionBonuses(save);
  const chance = ZONE_MYTHIC_CHANCE * (1 + Math.max(0, num(fortune.luckPct, 0)) + Math.max(0, num(potionBonuses.luckPct, 0)));
  return (Math.random() < chance) ? { ...it, quantity: 1 } : null;
}

// =========================
// DAMAGE FORMULA
// =========================
function calcDamage(att, def){
  att = num(att, 0);
  def = num(def, 0);

  if(att <= def){
    return (Math.random() < 0.5) ? 0 : 1;
  }

  const diff = att - def;
  const v = randFloat(VAR_MIN, VAR_MAX);
  const dmg = Math.floor(diff * v);
  return Math.max(1, dmg);
}

// =========================
// EQUIPMENT TOTALS SYNC
// =========================
function getEquipBonuses(saveObj){
  let atkB = 0, defB = 0;
  const eq = (saveObj && typeof saveObj.equipment === "object") ? saveObj.equipment : {};
  Object.keys(eq).forEach(k => {
    const it = eq[k];
    if(!it) return;
    atkB += Number.isFinite(Number(it.atk)) ? Number(it.atk) : 0;
    defB += Number.isFinite(Number(it.def)) ? Number(it.def) : 0;
  });
  return { atkB, defB };
}

function buildingBonus(level){
  const lvl = Math.max(0, num(level, 0));
  return 1 + (lvl * 0.0005);
}

function getSetCounts(equipment){
  const counts = {};
  Object.values(equipment || {}).forEach(it => {
    if(!it) return;
    const sid = String(it.setId || "").toLowerCase();
    if (sid){
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
function getCombatPetBonuses(saveObj){
  const api = window.DS?.pets;
  const pet = saveObj?.pets?.combat;
  if (!api?.getCombatPetBonuses || !pet) return { atkFlat: 0, defFlat: 0, atkPct: 0, defPct: 0 };
  const bonuses = api.getCombatPetBonuses(pet) || {};
  return {
    atkFlat: num(bonuses.atkFlat, 0),
    defFlat: num(bonuses.defFlat, 0),
    atkPct: num(bonuses.atkPct, 0),
    defPct: num(bonuses.defPct, 0)
  };
}
function getFortunePetBonuses(saveObj){
  const api = window.DS?.pets;
  const pet = saveObj?.pets?.fortune;
  if (!api?.getFortunePetBonuses || !pet) return { goldPct: 0, luckPct: 0 };
  const bonuses = api.getFortunePetBonuses(pet) || {};
  return {
    goldPct: num(bonuses.goldPct, 0),
    luckPct: num(bonuses.luckPct, 0)
  };
}

function recomputeTotalsAndSave(){
  const cur = getCurrentSave();

  const baseAtk = cur.heroAttack ?? 10;
  const baseDef = cur.heroDefense ?? 10;

  const { atkB, defB } = getEquipBonuses(cur);
  const bonuses = getSetBonusPcts(cur.equipment);
  const petBonuses = getCombatPetBonuses(cur);

  const rawAtk = baseAtk + atkB + petBonuses.atkFlat;
  const rawDef = baseDef + defB + petBonuses.defFlat;

  const totalAtk = Math.floor(rawAtk * (1 + bonuses.atkPct + petBonuses.atkPct));
  const totalDef = Math.floor(rawDef * (1 + bonuses.defPct + petBonuses.defPct));

  savePatch({
    attackTotal: totalAtk,
    defenseTotal: totalDef,
    setBonusAtkPct: bonuses.atkPct + petBonuses.atkPct,
    setBonusDefPct: bonuses.defPct + petBonuses.defPct,
    setBonusGoldPct: bonuses.goldPct,
    _atkFromPet: petBonuses.atkFlat,
    _defFromPet: petBonuses.defFlat,
    _petBonusAtkPct: petBonuses.atkPct,
    _petBonusDefPct: petBonuses.defPct
  });

  return { baseAtk, baseDef, totalAtk, totalDef };
}

// =========================
// DOM (bound on mount)
// =========================
let zonesGrid = null;
let zonesWrap = null;
let mobsWrap = null;
let mobsGrid = null;
let zoneTitle = null;
let fightPageTitle = null;

let battleWrap = null;
let heroImg = null;
let mobImg = null;
let heroInfo = null;
let mobInfo = null;
let goldBonusBox = null;
let dropChanceBox = null;
let rewardBonusRow = null;
let heroHpBar = null;
let mobHpBar = null;
let heroHpText = null;
let mobHpText = null;
let heroDamageText = null;
let mobDamageText = null;
let battleLog = null;
let petStack = null;
let combatPetBadge = null;
let combatPetIcon = null;
let combatPetXpBar = null;
let fortunePetBadge = null;
let fortunePetIcon = null;
let fortunePetXpBar = null;

let attackBtn = null;
let runBtn = null;
let toZonesBtn = null;

let cooldownWrap = null;
let cooldownBar = null;
let cooldownText = null;

let __fightMounted = false;
let __fightRoot = null;

const FIGHT_TEMPLATE = `
  <div style="display:flex;align-items:center;justify-content:space-between;width:90%;max-width:900px;margin:0 auto 10px;">
    <h1 id="fightPageTitle" style="margin:0;color:#ead39b;text-shadow:0 1px 0 rgba(87, 58, 16, .95),0 0 10px rgba(0,0,0,.34),0 2px 8px rgba(0,0,0,.72);">Fight</h1>
    <button id="toZonesBtn" style="display:none;">Zones</button>
  </div>

  <div id="cooldownWrap" style="margin-top:12px;display:none;">
    <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
      <span>Next attack</span>
      <span id="cooldownText">6.0s</span>
    </div>
    <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
      <div id="cooldownBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
    </div>
  </div>

  <div id="zonesWrap" style="width:90%;max-width:900px;margin:0 auto;">
    <div id="zonesGrid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;justify-items:center;"></div>
  </div>

  <div id="mobsWrap" style="width:90%;max-width:900px;margin:18px auto;display:none;">
    <div id="mobsGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;"></div>
  </div>

  <div id="battleWrap" style="width:90%;max-width:700px;margin:18px auto;display:none;">
    <div id="rewardBonusRow" style="display:none;margin:0 auto 8px;max-width:520px;justify-content:center;gap:8px;flex-wrap:wrap;">
      <div id="goldBonusBox" style="display:none;text-align:center;padding:6px 10px;border-radius:999px;border:2px solid #8a6a1f;background:#2a2212;color:#ffd27a;font-weight:700;font-size:12px;letter-spacing:.3px;">Gold Bonus +0%</div>
      <div id="dropChanceBox" style="display:none;text-align:center;padding:6px 10px;border-radius:999px;border:2px solid #2b6a8a;background:#12212a;color:#8fd8ff;font-weight:700;font-size:12px;letter-spacing:.3px;">Drop Chance +0%</div>
    </div>

    <div style="position:relative;display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:16px;background:#151520;border-radius:12px;border:2px solid #333;padding:34px 12px 18px;min-height:186px;box-sizing:border-box;">
      <div style="display:flex;justify-content:center;align-items:start;align-self:start;min-width:0;">
        <div style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;width:168px;">
          <div id="heroInfo" style="position:absolute;left:50%;top:-28px;transform:translateX(-50%);font-size:13px;opacity:.9;text-align:center;white-space:nowrap;"></div>
          <div style="display:flex;align-items:flex-start;justify-content:center;gap:10px;width:100%;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:0 0 auto;">
              <img id="heroImg" src="images/hero.png" alt="Hero" style="width:82px;height:82px;border-radius:10px;border:2px solid #333;object-fit:cover;flex:0 0 auto;">
              <div style="width:74px;height:4px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
                <div id="heroHpBar" style="height:100%;width:100%;border-radius:999px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
              </div>
              <div id="heroHpText" style="font-size:10px;opacity:.85;line-height:1;"></div>
              <div id="heroDamageText" style="min-height:18px;margin-top:2px;padding:4px 8px;border-radius:999px;border:1px solid rgba(210, 80, 80, .35);background:rgba(60, 18, 18, .82);box-shadow:0 0 10px rgba(150, 30, 30, .16);font-size:10px;font-weight:700;line-height:1;text-align:center;color:#ffe1e1;"></div>
            </div>
            <div id="petStack" style="display:none;flex-direction:column;align-items:center;justify-content:space-between;height:82px;flex:0 0 auto;">
              <div id="combatPetBadge" style="display:none;flex-direction:column;align-items:center;gap:3px;flex:0 0 auto;">
                <div id="combatPetIcon" style="width:34px;height:34px;border-radius:9px;border:2px solid #333;background:#101522;color:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;overflow:hidden;box-sizing:border-box;"></div>
                <div style="width:34px;height:4px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
                  <div id="combatPetXpBar" style="height:100%;width:0%;border-radius:999px;background:#4aa3ff;"></div>
                </div>
              </div>
              <div id="fortunePetBadge" style="display:none;flex-direction:column;align-items:center;gap:3px;flex:0 0 auto;">
                <div id="fortunePetIcon" style="width:34px;height:34px;border-radius:9px;border:2px solid #333;background:#101522;color:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;overflow:hidden;box-sizing:border-box;"></div>
                <div style="width:34px;height:4px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
                  <div id="fortunePetXpBar" style="height:100%;width:0%;border-radius:999px;background:#4aa3ff;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;align-items:start;justify-content:center;align-self:start;min-width:126px;padding-top:10px;">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;">
          <img src="images/ui/my_vs_icon.png" alt="VS" style="width:126px;height:126px;object-fit:contain;display:block;">
        </div>
      </div>

      <div style="display:flex;justify-content:center;align-items:start;align-self:start;min-width:0;">
        <div style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;width:120px;">
          <div id="mobInfo" style="position:absolute;left:50%;top:-28px;transform:translateX(-50%);font-size:13px;opacity:.9;text-align:center;white-space:nowrap;"></div>
          <img id="mobImg" src="" alt="Mob" style="width:82px;height:82px;border-radius:10px;border:2px solid #333;object-fit:cover;">
          <div style="width:74px;height:4px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
            <div id="mobHpBar" style="height:100%;width:100%;border-radius:999px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
          </div>
          <div id="mobHpText" style="font-size:10px;opacity:.85;line-height:1;"></div>
          <div id="mobDamageText" style="min-height:18px;margin-top:2px;padding:4px 8px;border-radius:999px;border:1px solid rgba(70, 190, 120, .35);background:rgba(20, 50, 30, .78);box-shadow:0 0 10px rgba(20, 120, 60, .14);font-size:10px;font-weight:700;line-height:1;text-align:center;color:#dff7e8;"></div>
        </div>
      </div>

      <div id="battleLog" style="grid-column:1 / -1;min-height:18px;margin-top:6px;font-size:12px;line-height:1.2;opacity:.92;text-align:center;"></div>
    </div>

    <div style="margin-top:12px;display:flex;gap:10px;justify-content:center;">
      <button id="attackBtn">Attack</button>
      <button id="runBtn">Run</button>
    </div>
  </div>
`;

function ensureFightShellStyles() {
  if (document.getElementById("ds-fight-shell-styles")) return;
  const style = document.createElement("style");
  style.id = "ds-fight-shell-styles";
  style.textContent = `
    @media (max-width: 680px) {
      #zonesWrap { width: 100% !important; }
      #zonesGrid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 10px !important; }
      .fightZoneCard { max-width: 74px !important; }
      .fightZoneCardInner { gap: 6px !important; }
      .fightZoneImg { width: 56px !important; height: 56px !important; border-radius: 8px !important; }
      .fightZoneInfo { width: 74px !important; min-height: 48px !important; padding: 4px 5px !important; border-radius: 8px !important; }
      .fightZoneName { font-size: 10px !important; line-height: 1.05 !important; white-space: normal !important; word-break: break-word !important; }
      .fightZoneMeta { margin-top: 2px !important; font-size: 10px !important; line-height: 1.05 !important; }
      #mobsWrap { width: 100% !important; }
      #mobsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 8px !important; }
      .fightMobCard { padding: 8px !important; border-radius: 10px !important; }
      .fightMobImg { width: 64px !important; height: 64px !important; margin-bottom: 4px !important; }
      .fightMobName { font-size: 11px !important; min-height: 28px !important; line-height: 1.1 !important; }
      .fightMobLevel { font-size: 10px !important; }
      .fightMobStats { gap: 4px !important; }
      .fightMobStats > div { width: 34px !important; height: 34px !important; font-size: 9px !important; }
      .fightMobStats > div > div:first-child { font-size: 11px !important; }
      .mobLootPanel {
        position: fixed !important;
        width: min(228px, calc(100vw - 18px)) !important;
        max-width: calc(100vw - 18px) !important;
        max-height: min(360px, 56vh) !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 7px !important;
        z-index: 120 !important;
      }
      .mobLootPanel > div:first-child { margin-bottom: 6px !important; }
      .mobLootPanel > div:first-child > div:first-child { font-size: 11px !important; }
      .mobLootPanel > div:first-child .mobLootClose { width: 22px !important; height: 22px !important; font-size: 11px !important; }
      .mobLootPanel > div:last-child { gap: 5px !important; }
      .mobLootPanel > div:last-child > div { gap: 6px !important; padding: 5px 6px !important; border-radius: 7px !important; }
      .mobLootPanel > div:last-child > div > img { width: 28px !important; height: 28px !important; border-radius: 5px !important; }
      .mobLootPanel > div:last-child > div > div > div:first-child { font-size: 11px !important; line-height: 1.05 !important; }
      .mobLootPanel > div:last-child > div > div > div:last-child { font-size: 9px !important; line-height: 1.1 !important; }
    }
    @media (max-width: 480px) {
      #mobsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .mobLootPanel {
        width: min(214px, calc(100vw - 14px)) !important;
        max-width: calc(100vw - 14px) !important;
        max-height: min(340px, 54vh) !important;
        padding: 6px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function bindFightDom(scope = document) {
  zonesGrid = scope.getElementById("zonesGrid");
  zonesWrap = scope.getElementById("zonesWrap");
  mobsWrap = scope.getElementById("mobsWrap");
  mobsGrid = scope.getElementById("mobsGrid");
  zoneTitle = scope.getElementById("zoneTitle");
  fightPageTitle = scope.getElementById("fightPageTitle");
  battleWrap = scope.getElementById("battleWrap");
  heroImg = scope.getElementById("heroImg");
  mobImg = scope.getElementById("mobImg");
  heroInfo = scope.getElementById("heroInfo");
  mobInfo = scope.getElementById("mobInfo");
  goldBonusBox = scope.getElementById("goldBonusBox");
  dropChanceBox = scope.getElementById("dropChanceBox");
  rewardBonusRow = scope.getElementById("rewardBonusRow");
  heroHpBar = scope.getElementById("heroHpBar");
  mobHpBar = scope.getElementById("mobHpBar");
  heroHpText = scope.getElementById("heroHpText");
  mobHpText = scope.getElementById("mobHpText");
  heroDamageText = scope.getElementById("heroDamageText");
  mobDamageText = scope.getElementById("mobDamageText");
  battleLog = scope.getElementById("battleLog");
  petStack = scope.getElementById("petStack");
  combatPetBadge = scope.getElementById("combatPetBadge");
  combatPetIcon = scope.getElementById("combatPetIcon");
  combatPetXpBar = scope.getElementById("combatPetXpBar");
  fortunePetBadge = scope.getElementById("fortunePetBadge");
  fortunePetIcon = scope.getElementById("fortunePetIcon");
  fortunePetXpBar = scope.getElementById("fortunePetXpBar");
  attackBtn = scope.getElementById("attackBtn");
  runBtn = scope.getElementById("runBtn");
  toZonesBtn = scope.getElementById("toZonesBtn");
  cooldownWrap = scope.getElementById("cooldownWrap");
  cooldownBar = scope.getElementById("cooldownBar");
  cooldownText = scope.getElementById("cooldownText");
}

function isCompactFightMobile() {
  return window.matchMedia("(max-width: 680px)").matches;
}

function applyLootPanelLayout(panel, anchorEl = null) {
  if (!panel) return;
  if (isCompactFightMobile()) {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 640;
    const panelWidth = Math.min(250, Math.max(210, viewportWidth - 110));
    const panelHeight = Math.min(360, Math.max(280, viewportHeight * 0.52));
    let left = Math.max(10, (viewportWidth - panelWidth) / 2);
    let top = Math.max(12, (viewportHeight - panelHeight) / 2);

    if (anchorEl && typeof anchorEl.getBoundingClientRect === "function") {
      const anchorCard = anchorEl.closest?.(".fightMobCard");
      const rect = (anchorCard || anchorEl).getBoundingClientRect();
      left = Math.min(
        Math.max(10, rect.left + (rect.width / 2) - (panelWidth / 2)),
        Math.max(10, viewportWidth - panelWidth - 10)
      );
      const preferredTop = rect.top + 8;
      const maxTop = Math.max(12, viewportHeight - panelHeight - 12);
      top = Math.min(Math.max(12, preferredTop), maxTop);
      if (top < 12) top = 12;
    }

    panel.style.position = "fixed";
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.transform = "";
    panel.style.width = `${Math.round(panelWidth)}px`;
    panel.style.maxWidth = `${Math.round(panelWidth)}px`;
    panel.style.maxHeight = `${Math.round(panelHeight)}px`;
    panel.style.overflowY = "auto";
    panel.style.overflowX = "hidden";
    panel.style.zIndex = "120";
  } else {
    panel.style.position = "absolute";
    panel.style.left = "calc(100% + 8px)";
    panel.style.top = "8px";
    panel.style.transform = "";
    panel.style.width = "260px";
    panel.style.maxWidth = "min(260px,calc(100vw - 40px))";
    panel.style.maxHeight = "";
    panel.style.overflowY = "";
    panel.style.overflowX = "";
    panel.style.zIndex = "20";
  }
}

// =========================
// RUNTIME STATE
// =========================
let currentZone = null;
let currentMobData = null;
let currentMob = null;

let autoFighting = false;
let autoTimer = null;
let cdAnimId = null;
let cdStart = 0;

function openLootPanelFor(lootPanel, currentOpenPanelRef, anchorEl = null) {
  if (!lootPanel) return currentOpenPanelRef || null;
  if (currentOpenPanelRef && currentOpenPanelRef !== lootPanel) {
    currentOpenPanelRef.style.display = "none";
  }
  applyLootPanelLayout(lootPanel, anchorEl);
  lootPanel.style.display = "block";
  return lootPanel;
}

function closeLootPanelFor(lootPanel, currentOpenPanelRef) {
  if (!lootPanel) return currentOpenPanelRef || null;
  lootPanel.style.display = "none";
  return currentOpenPanelRef === lootPanel ? null : currentOpenPanelRef;
}

function pushBattleLog(text){
  if (!battleLog) return;
  battleLog.innerHTML = text || "";
}

// =========================
// HERO STATE from save
// =========================
function getHeroState(){
  const s = loadSave();

  const totals = recomputeTotalsAndSave();
  const heroLevel = num(s.heroLevel, 1);

  const hpMax = Math.max(1, num(s.heroHPMax, 100));
  const hpNow = clamp(num(s.heroHP, hpMax), 0, hpMax);

  const staminaMax = Math.max(1, num(s.staminaMax, 100));
  const staminaNow = clamp(num(s.stamina, staminaMax), 0, staminaMax);

  const barracksMult = buildingBonus(s.barracksLevel);
  const atk = Math.floor(num(s.attackTotal, totals.totalAtk) * barracksMult);
  const def = Math.floor(num(s.defenseTotal, totals.totalDef) * barracksMult);

  return {
    level: heroLevel,
    atk,
    def,
    hpMax,
    hp: hpNow,
    staminaMax,
    stamina: staminaNow,
    heroXP: num(s.heroXP, 0),
    heroXPNext: xpNextForLevel(heroLevel),
    portrait: String(s.heroPortrait || "images/hero.png")
  };
}

function setHeroHPToSave(hp, hpMax){
  savePatch({
    heroHP: hp,
    heroHPMax: hpMax,
    lastActiveTs: Date.now()
  });
}

function spendStamina(cost){
  const s = loadSave();
  const st = clamp(num(s.stamina, 0), 0, num(s.staminaMax, 100));
  if(st < cost) return false;
  savePatch({ stamina: st - cost });
  return true;
}

// =========================
// UI helpers
// =========================
function setHpBars(hero){
  const heroPct = hero.hpMax > 0 ? Math.max(0, (hero.hp / hero.hpMax) * 100) : 0;
  heroHpBar.style.width = heroPct + "%";
  heroHpBar.style.background = "linear-gradient(90deg, #00ff88, #00bb55)";
  heroHpText.textContent = `${Math.max(0, hero.hp)} / ${hero.hpMax} HP`;

  const mobPct = currentMob.hpMax > 0 ? Math.max(0, (currentMob.hp / currentMob.hpMax) * 100) : 0;
  mobHpBar.style.width = mobPct + "%";
  mobHpBar.style.background = "linear-gradient(90deg, #ff5555, #bb0000)";
  mobHpText.textContent = `${Math.max(0, currentMob.hp)} / ${currentMob.hpMax} HP`;
}

function refreshHeroInfo(hero){
  heroInfo.textContent = "";
  updateGoldBonusBox();
}
function getPetDisplay(slotKey){
  const s = loadSave();
  const pet = window.DS?.pets?.normalizePet ? window.DS.pets.normalizePet(slotKey, s?.pets?.[slotKey]) : s?.pets?.[slotKey];
  if (pet && pet.active === false) return null;
  if (!pet || typeof pet !== "object") return null;
  const level = Math.max(1, num(pet.level, 1));
  const xp = Math.max(0, num(pet.xp, 0));
  const xpNext = Math.max(1, num(pet.xpNext, 100));
  return {
    name: String(pet.name || "Combat Pet"),
    img: String(pet.img || "").trim(),
    iconText: String(pet.iconText || "PET"),
    xpPct: clamp((xp / xpNext) * 100, 0, 100)
  };
}
function renderCombatPetBadge(){
  if (!petStack || !combatPetBadge || !combatPetIcon || !combatPetXpBar || !fortunePetBadge || !fortunePetIcon || !fortunePetXpBar) return;
  const combatPet = getPetDisplay("combat");
  const fortunePet = getPetDisplay("fortune");

  const renderPet = (pet, badge, icon, xpBar) => {
    if (!pet) {
      badge.style.display = "none";
      icon.innerHTML = "";
      icon.textContent = "";
      xpBar.style.width = "0%";
      return false;
    }
    badge.style.display = "flex";
    if (pet.img) {
      icon.innerHTML = `<img src="${pet.img}" alt="${pet.name}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
      icon.innerHTML = "";
      icon.textContent = pet.iconText;
    }
    xpBar.style.width = `${pet.xpPct}%`;
    return true;
  };

  const hasCombat = renderPet(combatPet, combatPetBadge, combatPetIcon, combatPetXpBar);
  const hasFortune = renderPet(fortunePet, fortunePetBadge, fortunePetIcon, fortunePetXpBar);
  petStack.style.display = (hasCombat || hasFortune) ? "flex" : "none";
  if (hasCombat && hasFortune) {
    petStack.style.justifyContent = "space-between";
  } else {
    petStack.style.justifyContent = "center";
  }
}
function addCombatPetXP(totalCombatXP){
  const api = window.DS?.pets;
  const total = Math.max(0, Math.floor(num(totalCombatXP, 0)));
  if (!api) {
    return {
      playerXpGain: total,
      combatPetXpGain: 0,
      fortunePetXpGain: 0,
      combatLevelUps: 0,
      fortuneLevelUps: 0,
      combatPetName: "",
      fortunePetName: "",
      combatNewLevel: 0,
      fortuneNewLevel: 0
    };
  }

  const s = loadSave();
  if (!s.pets || typeof s.pets !== "object") s.pets = {};

  const combatPetXpGain = api?.isPetActive?.("combat", s.pets.combat) ? Math.max(0, Math.floor(total * 0.10)) : 0;
  const fortunePetXpGain = api?.isPetActive?.("fortune", s.pets.fortune) ? Math.max(0, Math.floor(total * 0.10)) : 0;
  const playerXpGain = Math.max(0, total - combatPetXpGain - fortunePetXpGain);

  let combatLevelUps = 0;
  let combatPetName = "";
  let combatNewLevel = 0;
  if (combatPetXpGain > 0 && api.splitXpWithPet) {
    const result = api.splitXpWithPet(s, "combat", combatPetXpGain * 10);
    combatLevelUps = num(result?.petLevelUps, 0);
    combatPetName = String(result?.petName || "Combat Pet");
    combatNewLevel = num(result?.petLevel, 0);
  }

  let fortuneLevelUps = 0;
  let fortunePetName = "";
  let fortuneNewLevel = 0;
  if (fortunePetXpGain > 0 && api.splitXpWithPet) {
    const result = api.splitXpWithPet(s, "fortune", fortunePetXpGain * 10);
    fortuneLevelUps = num(result?.petLevelUps, 0);
    fortunePetName = String(result?.petName || "Fortune Pet");
    fortuneNewLevel = num(result?.petLevel, 0);
  }

  localStorage.setItem(SAVE_KEY, JSON.stringify(s));

  return {
    playerXpGain,
    combatPetXpGain,
    fortunePetXpGain,
    combatLevelUps,
    fortuneLevelUps,
    combatPetName,
    fortunePetName,
    combatNewLevel,
    fortuneNewLevel
  };
}

function setEncounterDamage(heroTaken = 0, mobDealt = 0){
  if (heroDamageText) heroDamageText.textContent = `Damage Taken: ${Math.max(0, Number(heroTaken) || 0)}`;
  if (mobDamageText) mobDamageText.textContent = `Damage Dealt: ${Math.max(0, Number(mobDealt) || 0)}`;
}

function updateGoldBonusBox(){
  if(!goldBonusBox || !dropChanceBox || !rewardBonusRow) return;
  const cur = getCurrentSave();
  const pct = getSetBonusPcts(cur.equipment).goldPct ?? 0;
  const fortuneBonuses = getFortunePetBonuses(cur);
  const potionBonuses = getPotionBonuses(cur);
  const petDropPct = Math.max(0, num(fortuneBonuses.luckPct, 0));
  const potionDropPct = Math.max(0, num(potionBonuses.luckPct, 0));
  const totalDropPct = petDropPct + potionDropPct;

  if(pct > 0){
    goldBonusBox.style.display = "";
    goldBonusBox.textContent = `Gold Bonus +${Math.round(pct * 100)}%`;
  }else{
    goldBonusBox.style.display = "none";
  }

  if(totalDropPct > 0){
    dropChanceBox.style.display = "";
    dropChanceBox.textContent = `Drop Chance +${Math.round(totalDropPct * 100)}%`;
    dropChanceBox.title = `Pet +${Math.round(petDropPct * 100)}% | Potion +${Math.round(potionDropPct * 100)}%`;
  }else{
    dropChanceBox.style.display = "none";
    dropChanceBox.title = "";
  }

  rewardBonusRow.style.display = (pct > 0 || totalDropPct > 0) ? "flex" : "none";
}

// =========================
// Cooldown UI
// =========================
function stopCooldownUI(){
  if(cdAnimId) cancelAnimationFrame(cdAnimId);
  cdAnimId = null;
  if(cooldownWrap) cooldownWrap.style.display = "none";
  if(cooldownBar) cooldownBar.style.width = "0%";
  if(cooldownText) cooldownText.textContent = (ENCOUNTER_CD_MS/1000).toFixed(1) + "s";
}

function startCooldownUI(){
  if(!cooldownWrap || !cooldownBar || !cooldownText) return;
  cooldownWrap.style.display = "";
  cdStart = performance.now();

  const tick = (now) => {
    const elapsed = now - cdStart;
    const t = Math.min(1, elapsed / ENCOUNTER_CD_MS);

    cooldownBar.style.width = (t * 100).toFixed(1) + "%";
    cooldownBar.style.background = "linear-gradient(90deg,#b63a3a,#e05555)";

    const remain = Math.max(0, (ENCOUNTER_CD_MS - elapsed) / 1000);
    cooldownText.textContent = remain.toFixed(1) + "s";

    if(t < 1 && autoFighting){
      cdAnimId = requestAnimationFrame(tick);
    } else {
      cdAnimId = null;
    }
  };

  if(cdAnimId) cancelAnimationFrame(cdAnimId);
  cdAnimId = requestAnimationFrame(tick);
}

function stopAutoFight(silent=false){
  autoFighting = false;
  if(autoTimer){
    clearTimeout(autoTimer);
    autoTimer = null;
  }
  if(!silent) pushBattleLog("⏹ Stopped.");
  stopCooldownUI();
}

function scheduleNextEncounter(){
  if(!autoFighting) return;
  if (window.DS?.isPaused) return;

  startCooldownUI();
  autoTimer = setTimeout(() => runEncounter(), ENCOUNTER_CD_MS);
}

// Pause integration
function handleFightPause() {
  stopAutoFight(true);
}

function handleFightSave() {
  if (!battleWrap || battleWrap.style.display === "none") return;
  renderCombatPetBadge();
}

// =========================
// Zones UI
// =========================
function showZones(){
  stopAutoFight(true);

  const hero = getHeroState();

  if (fightPageTitle) fightPageTitle.textContent = "Choose a Zone";
  if (toZonesBtn) toZonesBtn.style.display = "none";
  zonesWrap.style.display = "";
  mobsWrap.style.display = "none";
  battleWrap.style.display = "none";
  zonesGrid.innerHTML = "";

  ZONES.forEach(z => {
    const locked = hero.level < (z.reqLevel ?? 1);

    const card = document.createElement("div");
    card.className = `fightZoneCard${locked ? " isLocked" : ""}`;
    if (locked) card.style.cursor = "not-allowed";

    card.innerHTML = `
      <div class="fightZoneCardInner">
        <img src="${z.img}" alt="${z.name}"
             class="fightZoneImg">
        <div class="fightZoneInfo">
          <div class="fightZoneName">${z.name}</div>
          <div class="fightZoneMeta">Req Lv ${z.reqLevel ?? 1}</div>
          ${locked ? `<div class="fightZoneMeta isLocked">Locked</div>` : ``}
        </div>
      </div>
    `;

    if(!locked){
      card.addEventListener("click", () => showMobs(z));
    }
    zonesGrid.appendChild(card);
  });
}

function showMobs(zone){
  stopAutoFight(true);

  currentZone = zone;
  if (fightPageTitle) fightPageTitle.textContent = zone.name;
  if (toZonesBtn) toZonesBtn.style.display = "";
  zonesWrap.style.display = "none";
  mobsWrap.style.display = "";
  battleWrap.style.display = "none";

  if (zoneTitle) zoneTitle.textContent = zone.name;
  mobsGrid.innerHTML = "";
  let openLootPanel = null;

zone.mobs.forEach(m => {
  const mob = getMobCombatStats(m);
  const card = document.createElement("div");
  card.className = "fightMobCard";

  const loot = (MOB_UNIQUE_DROPS?.[zone.id]?.[m.id]) || [];
  const mythic = ZONE_MYTHIC?.[zone.id] || null;
  const lootItems = [...loot];
  if (mythic) lootItems.push({ ...mythic, _label: "Zone Mythic" });

  const lootHtml = lootItems.length ? lootItems.map(it => {
    const stats = [];
    if (Number.isFinite(Number(it.atk)) && Number(it.atk) !== 0) stats.push(`ATK ${it.atk}`);
    if (Number.isFinite(Number(it.def)) && Number(it.def) !== 0) stats.push(`DEF ${it.def}`);
    if (Number.isFinite(Number(it.reqLevel))) stats.push(`Req Lv ${it.reqLevel}`);
    const meta = [it._label || it.rarity || it.type || "", ...stats].filter(Boolean).join(" • ");
    const isSetItem = !!it.setId;
    const isCraftedItem = !!it.crafted;
    const rarityKey = normalizeRarity(it.rarity || "");
    const rarityBg =
      isSetItem ? "#2a0a0d" :
      isCraftedItem ? "#14361d" :
      rarityKey === "mythic" ? "#0b2a2e" :
      rarityKey === "legendary" ? "#2b1a0b" :
      rarityKey === "epic" ? "#1a0f2e" :
      rarityKey === "rare" ? "#0f1b2e" :
      rarityKey === "uncommon" ? "#0f141b" :
      rarityKey === "common" ? "#0b0b0b" :
      "#1b1b24";
    const rarityBorder =
      isSetItem ? "#7c2d35" :
      isCraftedItem ? "#2d7a3d" :
      rarityKey === "mythic" ? "#2aa7b0" :
      rarityKey === "legendary" ? "#d18a1f" :
      rarityKey === "epic" ? "#7d4bc2" :
      rarityKey === "rare" ? "#3d73c9" :
      rarityKey === "uncommon" ? "#4c667f" :
      rarityKey === "common" ? "#3a3a46" :
      "#2a2a3a";

    return `
    <div style="display:flex;gap:8px;align-items:center;background:#151520;border:1px solid ${rarityBorder};border-radius:8px;padding:6px 8px;">
      <img src="${it.img || ""}" alt="${it.name || "Item"}" style="width:32px;height:32px;border-radius:6px;border:1px solid ${rarityBorder};background:${rarityBg};object-fit:cover;flex:0 0 auto;">
      <div style="min-width:0;display:flex;flex-direction:column;align-items:flex-start;text-align:left;">
        <div style="font-size:12px;font-weight:800;line-height:1.1;">${it.name || "Item"}</div>
        <div style="font-size:10px;opacity:.75;line-height:1.25;">${meta}</div>
      </div>
    </div>
  `;
  }).join("") : `<div style="opacity:.8;font-size:12px;">No known drops.</div>`;

  card.innerHTML = `
<div class="fightMobCardInner">

  <button type="button" class="mobLootBtn" style="position:absolute;top:8px;right:8px;width:28px;height:28px;background:#222438;border:1px solid #3a3d5c;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:2;">
    <img src="images/ui/my_treasure_chest.png" alt="Loot" style="width:18px;height:18px;display:block;image-rendering:auto;">
  </button>

  <img src="${mob.img}" 
    class="fightMobImg">

  <div class="fightMobName">
    ${mob.name}
  </div>

  <div class="fightMobLevel">
    Level ${mob.lvl}
  </div>

  <div class="fightMobStats">

    <div class="fightMobStat">
      <div style="font-size:14px;">❤️</div>
      <div>${mob.hp}</div>
    </div>

    <div class="fightMobStat">
      <div style="font-size:14px;">⚔️</div>
      <div>${mob.atk}</div>
    </div>

    <div class="fightMobStat">
      <div style="font-size:14px;">🛡</div>
      <div>${mob.def}</div>
    </div>

  </div>

</div>

<div class="mobLootPanel" style="display:none;position:absolute;left:calc(100% + 8px);top:8px;width:260px;max-width:min(260px,calc(100vw - 40px));z-index:20;background:#10121c;border:1px solid #3a3d5c;border-radius:12px;padding:10px;box-shadow:0 10px 24px rgba(0,0,0,.45);">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
    <div style="font-weight:800;font-size:12px;opacity:.95;">Drops</div>
    <button type="button" class="mobLootClose" style="background:#222438;border:1px solid #3a3d5c;color:#ddd;width:24px;height:24px;border-radius:999px;font-size:12px;cursor:pointer;">x</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:6px;">
    ${lootHtml}
  </div>
</div>
`;

    const lootBtn = card.querySelector(".mobLootBtn");
    const lootPanel = card.querySelector(".mobLootPanel");
    const lootClose = card.querySelector(".mobLootClose");

    const toggleLootPanel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!lootPanel) return;

      const willOpen = lootPanel.style.display === "none";
      openLootPanel = willOpen
        ? openLootPanelFor(lootPanel, openLootPanel, lootBtn)
        : closeLootPanelFor(lootPanel, openLootPanel);
    };
    lootBtn?.addEventListener("click", toggleLootPanel);
    lootBtn?.addEventListener("touchend", toggleLootPanel, { passive: false });

    lootClose?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLootPanel = closeLootPanelFor(lootPanel, openLootPanel);
    });

    lootPanel?.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // ✅ Click mob starts immediately
    card.addEventListener("click", (e) => {
      if (e.target?.closest?.(".mobLootBtn, .mobLootPanel, .mobLootClose")) return;
      startBattle(mob, true);
    });
    mobsGrid.appendChild(card);
  });

  mobsGrid.onclick = (e) => {
    if (e.target === mobsGrid && openLootPanel) {
      openLootPanel.style.display = "none";
      openLootPanel = null;
    }
  };
}

// =========================
// Battle start
// =========================
function startBattle(mobData, autoStart=true){
  stopAutoFight(true);
  window.DS?.resume?.();

  currentMobData = mobData;
  if (fightPageTitle) fightPageTitle.textContent = "Battle";

  mobsWrap.style.display = "none";
  battleWrap.style.display = "";

  const hero = getHeroState();
  renderCombatPetBadge();
  heroImg.src = hero.portrait || "images/hero.png";
  mobImg.src = mobData.img;

  battleLog.innerHTML = "";

  mobInfo.textContent = `${mobData.name} • Lv ${mobData.lvl}`;
  refreshHeroInfo(hero);

  currentMob = { ...mobData, hpMax: mobData.hp, hp: mobData.hp };
  setHpBars(hero);
  setEncounterDamage(0, 0);

  if(autoStart !== false){
    autoFighting = true;
    pushBattleLog(`▶ Auto-Resolve started. Encounter every ${ENCOUNTER_CD_MS/1000}s.`);
    runEncounter();
    if (autoFighting && !autoTimer) scheduleNextEncounter();
  } else {
    pushBattleLog(`⚔️ Engaged ${mobData.name}.`);
  }
}

// =========================
// Encounter resolve
// =========================
function runEncounter(){
  if (window.DS?.isPaused) return;
  if(!autoFighting) return;

  if(!currentMobData || !currentZone){
    pushBattleLog("❌ No target selected.");
    stopAutoFight(true);
    return;
  }

  // pay stamina
  const heroBefore = getHeroState();
  if(heroBefore.stamina < ENCOUNTER_COST || !spendStamina(ENCOUNTER_COST)){
    pushBattleLog(`😴 Not enough stamina. Need ${ENCOUNTER_COST}.`);
    stopAutoFight(true);
    return;
  }

    const potionSave = loadSave();
    const potionBonus = getPotionBonuses(potionSave);
    let hero = getHeroState();
    if (potionBonus.atkPct || potionBonus.defPct){
      hero.atk = Math.floor(hero.atk * (1 + potionBonus.atkPct));
      hero.def = Math.floor(hero.def * (1 + potionBonus.defPct));
    }

  // fresh mob each encounter
  currentMob = { ...currentMobData, hpMax: currentMobData.hp, hp: currentMobData.hp };

  let rounds = 0;
  let totalHeroDamageTaken = 0;
  let totalDamageDealt = 0;

  while(hero.hp > 0 && currentMob.hp > 0 && rounds < MAX_ROUNDS){
    rounds++;

    const heroDmg = calcDamage(hero.atk, currentMob.def);
    totalDamageDealt += heroDmg;
    currentMob.hp -= heroDmg;
    if(currentMob.hp <= 0) break;

    const mobDmg = calcDamage(currentMob.atk, hero.def);
    totalHeroDamageTaken += mobDmg;
    hero.hp -= mobDmg;
  }

  hero.hp = Math.max(0, hero.hp);
  currentMob.hp = Math.max(0, currentMob.hp);

    setHeroHPToSave(hero.hp, hero.hpMax);

    setHpBars(hero);
    refreshHeroInfo(hero);
    setEncounterDamage(totalHeroDamageTaken, totalDamageDealt);
    if (tickPotionActions(potionSave, 1)) {
      savePatch({ consumables: potionSave.consumables });
    }

    if(hero.hp <= 0){
window.DS?.stats?.inc("fightsLost", 1);
    pushBattleLog(`❌ You were defeated by ${currentMob.name} in ${rounds} rounds.`);
    stopAutoFight(true);
    return;
  }

  if(currentMob.hp > 0 && rounds >= MAX_ROUNDS){
    pushBattleLog(`🏃 ${currentMob.name} fled after ${MAX_ROUNDS} rounds. (No rewards)`);
    scheduleNextEncounter();
    return;
  }

  // win rewards
  // win rewards
const zoneId = currentZone.id;
const xpGain = fightXPForMobLevel(currentMob.lvl);
const petXpResult = addCombatPetXP(xpGain);
const playerXpGain = Math.max(0, Math.floor(num(petXpResult.playerXpGain, xpGain)));
const curSave = getCurrentSave();
const setGoldBonusPct = getSetBonusPcts(curSave.equipment).goldPct ?? 0;
const fortuneBonuses = getFortunePetBonuses(curSave);
const goldBonusPct = setGoldBonusPct + Math.max(0, num(fortuneBonuses.goldPct, 0));
const goldBase = rollGold(zoneId, currentMob.lvl);
const goldGain = Math.floor(goldBase * (1 + goldBonusPct));
const goldBonus = Math.max(0, goldGain - goldBase);
addGold(goldGain);

const mobId = currentMobData.id;

const uniques = rollUniqueDrops(zoneId, mobId);
for(const it of uniques) addItemToSave(it);

const mythic = rollZoneMythic(zoneId);
if(mythic) addItemToSave(mythic);

const warSigil = Math.random() < WAR_SIGIL_CHANCE ? { ...WAR_SIGIL_ITEM, quantity: 1 } : null;
if (warSigil) addItemToSave(warSigil);

// ✅ STATS (μόνο στο win)
window.DS?.stats?.inc("fightsWon", 1);
window.DS?.stats?.inc("goldEarned", goldGain);
if (uniques.length) window.DS?.stats?.inc("itemsDropped", uniques.length);
if (mythic) window.DS?.stats?.inc("mythicsFound", 1);

const obtainedDrops = [];
if (uniques[0]) obtainedDrops.push(uniques[0]);
if (mythic) obtainedDrops.push(mythic);
if (warSigil) obtainedDrops.push(warSigil);

const obtainedHtml = obtainedDrops.length
  ? `<div style="margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;"><span style="display:inline-flex;align-items:center;line-height:1;">You obtained:</span>${obtainedDrops.map(it => `<span style="display:inline-flex;align-items:center;gap:5px;line-height:1;"><img src="${it.img || ""}" alt="${it.name || "Item"}" style="width:16px;height:16px;border-radius:4px;object-fit:cover;">${it.name || "Item"}${(Number(it.quantity) || 1) > 1 ? ` x${Number(it.quantity) || 1}` : ""}</span>`).join("")}</div>`
  : "";

const petXpParts = [];
if (petXpResult.combatPetXpGain > 0) petXpParts.push(`${petXpResult.combatPetName} XP +${petXpResult.combatPetXpGain}`);
if (petXpResult.fortunePetXpGain > 0) petXpParts.push(`${petXpResult.fortunePetName} XP +${petXpResult.fortunePetXpGain}`);
const petXpHtml = petXpParts.length ? `<span style="opacity:.92;"> | ${petXpParts.join(" | ")}</span>` : ``;
const petLevelHtml = `${petXpResult.combatLevelUps > 0 ? `<div style="margin-top:4px;color:#9ff0b7;font-weight:800;">${petXpResult.combatPetName} reached Lvl ${petXpResult.combatNewLevel}</div>` : ``}${petXpResult.fortuneLevelUps > 0 ? `<div style="margin-top:4px;color:#9ff0b7;font-weight:800;">${petXpResult.fortunePetName} reached Lvl ${petXpResult.fortuneNewLevel}</div>` : ``}`;
pushBattleLog(`✅ Won vs ${currentMob.name} in ${rounds} rounds. 🏆 XP +${playerXpGain} | 💰 Gold +${goldGain}${goldBonus > 0 ? ` (${goldBonus} bonus)` : ""}${petXpHtml}${petLevelHtml}${obtainedHtml}`);

  addHeroXP(playerXpGain);

  hero = getHeroState();
  setHeroHPToSave(hero.hp, hero.hpMax);

  scheduleNextEncounter();
}

// =========================
// Hero XP
// =========================
function addHeroXP(xp){
  const s = loadSave();

  let heroLevel = Math.max(1, num(s.heroLevel, 1));
  let heroXP = num(s.heroXP, 0) + xp;
  let heroXPNext = xpNextForLevel(heroLevel);

  let baseAtk = num(s.heroAttack, 10);
  let baseDef = num(s.heroDefense, 10);
  let statPoints = Math.max(0, num(s.heroStatPoints, 0));

  while(heroXP >= heroXPNext){
    heroXP -= heroXPNext;
    heroLevel++;

    heroXPNext = xpNextForLevel(heroLevel);

    statPoints += STAT_POINTS_PER_LEVEL;

    pushBattleLog(`✨ Level Up! Hero Level ${heroLevel} (+${STAT_POINTS_PER_LEVEL} Stat Points)`);
  }

  savePatch({
    heroLevel,
    heroXP,
    heroXPNext: xpNextForLevel(heroLevel),
    heroAttack: baseAtk,
    heroDefense: baseDef,
    heroStatPoints: statPoints
  });

  recomputeTotalsAndSave();
}

// =========================
// Buttons / Nav
// =========================
function handleFightZonesClick() {
  showZones();
}

// Attack is optional (kept)
function handleFightAttackClick() {
  if(!currentMobData || !currentZone){
    pushBattleLog("❌ Select a mob first.");
    return;
  }
  if(!autoFighting){
    autoFighting = true;
    pushBattleLog(`▶ Auto-Resolve started. Encounter every ${ENCOUNTER_CD_MS/1000}s.`);
    runEncounter();
    if (autoFighting && !autoTimer) scheduleNextEncounter();
    return;
  }
  pushBattleLog("ℹ️ Already running...");
}

function handleFightRunClick() {
  stopAutoFight(true);
  if(currentZone) showMobs(currentZone);
}

function attachFightEvents() {
  if (!toZonesBtn || !attackBtn || !runBtn) return;
  toZonesBtn.addEventListener("click", handleFightZonesClick);
  attackBtn.addEventListener("click", handleFightAttackClick);
  runBtn.addEventListener("click", handleFightRunClick);
  window.addEventListener("ds:pause", handleFightPause);
  window.addEventListener("ds:save", handleFightSave);
}

function detachFightEvents() {
  toZonesBtn?.removeEventListener("click", handleFightZonesClick);
  attackBtn?.removeEventListener("click", handleFightAttackClick);
  runBtn?.removeEventListener("click", handleFightRunClick);
  window.removeEventListener("ds:pause", handleFightPause);
  window.removeEventListener("ds:save", handleFightSave);
}

function mountFight(root = null) {
  if (root) {
    root.innerHTML = FIGHT_TEMPLATE;
    __fightRoot = root;
  } else {
    __fightRoot = document.getElementById("leftPanel");
  }

  ensureFightShellStyles();
  bindFightDom(document);
  if (!zonesGrid || !zonesWrap || !mobsWrap || !mobsGrid || !battleWrap) return false;

  if (__fightMounted) detachFightEvents();

  __fightMounted = true;
  currentZone = null;
  currentMobData = null;
  currentMob = null;
  autoFighting = false;
  autoTimer = null;
  stopCooldownUI();
  attachFightEvents();
  document.title = "Darkstone Chronicles - Fight";
  showZones();
  return true;
}

function unmountFight() {
  if (!__fightMounted) return;
  stopAutoFight(true);
  detachFightEvents();
  __fightMounted = false;
  currentZone = null;
  currentMobData = null;
  currentMob = null;
}

// =========================
// Start page
// =========================
window.DSFight = {
  mount: mountFight,
  unmount: unmountFight
};

if (document.getElementById("zonesGrid")) {
  mountFight();
}

})();



