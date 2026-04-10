// forge_action.js — Forge action page (correct paths: images/bars)
// Forge action page: smelt bars + craft gear
// ✅ Stats-safe: forge stats increments INSIDE the same save object (won’t be overwritten)

const SAVE_KEY = "darkstone_save_v1";
const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const ORE_SIGIL_ITEM = {
  type: "material",
  id: "ore_sigil",
  name: "Ore Sigil",
  img: "images/items/sigils/ore_sigil.png"
};

function loadSave(){
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
  catch { return {}; }
}
function setSave(next){
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
}
function xpBarGradient(pct){
  if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
  if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
  if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
  return "linear-gradient(90deg,#2f9e5b,#7be39e)";
}
function roundLevelXP(v){
  v = Math.max(1, Math.round(Number(v) || 1));
  if (v >= 10000000) return Math.ceil(v / 50000) * 50000;
  if (v >= 1000000) return Math.ceil(v / 10000) * 10000;
  if (v >= 100000) return Math.ceil(v / 5000) * 5000;
  if (v >= 10000) return Math.ceil(v / 500) * 500;
  if (v >= 1000) return Math.ceil(v / 100) * 100;
  return Math.round(v);
}

function ensureForge(save){
  save = save && typeof save === "object" ? save : {};
  if (!Array.isArray(save.inventory)) save.inventory = [];

  if (!Number.isFinite(Number(save.blacksmithLevel))) save.blacksmithLevel = 1;
  if (!Number.isFinite(Number(save.blacksmithXP))) save.blacksmithXP = 0;
  save.blacksmithXPNext = xpNextForLevel(save.blacksmithLevel);

  if (!Number.isFinite(Number(save.inventoryMaxSlots))) save.inventoryMaxSlots = 1000;

  return save;
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
function getArtisanPotionBonus(save){
  const cons = (save && typeof save.consumables === "object") ? save.consumables : {};
  let bonus = 0;
  ["quick_potion1","quick_potion2"].forEach((slot) => {
    const it = cons[slot];
    if (!it) return;
    const qty = Number.isFinite(Number(it.quantity ?? it.qty)) ? Number(it.quantity ?? it.qty) : 1;
    if (qty <= 0) return;
    const id = String(it.id || "").toLowerCase();
    const name = String(it.name || "").toLowerCase();
    if (!id.includes("artisan_insight") && !name.includes("artisan insight")) return;
    bonus += getPotionTier(it);
  });
  return bonus;
}
function tickArtisanPotionActions(save, actions = 1){
  if (!save || typeof save !== "object") return false;
  if (!save.consumables || typeof save.consumables !== "object") return false;
  let changed = false;
  ["quick_potion1","quick_potion2"].forEach((slot) => {
    const it = save.consumables[slot];
    if (!it) return;
    const id = String(it.id || "").toLowerCase();
    const name = String(it.name || "").toLowerCase();
    if (!id.includes("artisan_insight") && !name.includes("artisan insight")) return;
    let qty = Number.isFinite(Number(it.quantity ?? it.qty)) ? Number(it.quantity ?? it.qty) : 1;
    if (qty <= 0) { save.consumables[slot] = null; changed = true; return; }
    let left = Number(it.actionsLeft);
    if (!Number.isFinite(left) || left <= 0) left = 100;
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
        remaining = 100;
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

// ------------------------------------
// Recipes
// ------------------------------------
const BAR_IMG = "images/bars";
const CRAFT_IMG = "images/items/forge_crafted";
const CRAFT_ICON_BG = "#14361d";
const MATERIALS = [
  { id:"copper",      name:"Copper",      reqLevel: 1 },
  { id:"silver",      name:"Silver",      reqLevel:10 },
  { id:"iron",        name:"Iron",        reqLevel:20 },
  { id:"mithril",     name:"Mithril",     reqLevel:30 },
  { id:"adamant",     name:"Adamant",     reqLevel:40 },
  { id:"obsidian",    name:"Obsidian",    reqLevel:50 },
  { id:"crystal",     name:"Crystal",     reqLevel:60 },
  { id:"sulfur",      name:"Sulfur",      reqLevel:70 },
  { id:"rose_quartz", name:"Rose Quartz", reqLevel:80 },
  { id:"darkstone",   name:"Darkstone",   reqLevel:90 }
];
const MAIN_HAND_NAMES = {
  copper: "Sword",
  silver: "Mace",
  iron: "Axe",
  mithril: "Sword",
  adamant: "Axe",
  obsidian: "Sword",
  crystal: "Sword",
  sulfur: "Sword",
  rose_quartz: "Sword",
  darkstone: "Mace"
};
const CRAFT_SLOTS = [
  { id:"helmet",    name:"Helmet",    slot:"helmet",    atk:0, def:3, barCost:5 },
  { id:"chest",     name:"Chest",     slot:"chest",     atk:0, def:4, barCost:5 },
  { id:"belt",      name:"Belt",      slot:"belt",      atk:0, def:2, barCost:5 },
  { id:"pants",     name:"Pants",     slot:"pants",     atk:0, def:3, barCost:5 },
  { id:"gloves",    name:"Gloves",    slot:"gloves",    atk:0, def:2, barCost:5 },
  { id:"boots",     name:"Boots",     slot:"boots",     atk:0, def:2, barCost:5 },
  { id:"main_hand", name:"Main Hand", slot:"mainHand",  atk:3, def:0, barCost:5 },
  { id:"shield",    name:"Shield",    slot:"offHand",   atk:0, def:3, barCost:5 },
  { id:"bracers",   name:"Bracers",   slot:"bracers",   atk:0, def:2, barCost:5 },
  { id:"shoulders", name:"Shoulders", slot:"shoulders", atk:0, def:2, barCost:5 }
];

function gatherXpForReq(req){
  const lvl = Math.max(1, Number(req) || 1);
  return 10 + Math.floor(lvl / 10) * 20;
}

function mkRecipe(id, name, req, oreName){
  const mult = 1 + (Number(req || 1) / 20);
  const targetSmeltXp = gatherXpForReq(req) * 4;
  const baseXP = Math.max(1, Math.round(targetSmeltXp / mult));
  return {
    id,
    mode: "smelt",
    name,
    req,
    img: `${BAR_IMG}/${id}.png`,
    input: [
      { name: oreName, qty: 5 }
    ],
    output: { type:"material", name, img: `${BAR_IMG}/${id}.png`, qty: 1 },
    baseXP
  };
}

function craftXpForReq(req){
  const lvl = Math.max(1, Number(req) || 1);
  return 10 + Math.floor(lvl / 10) * 4;
}

function titleFromMaterialId(id){
  return MATERIALS.find(m => m.id === id)?.name || String(id || "");
}

function craftDisplayName(material, slotDef){
  const suffix = slotDef.id === "main_hand"
    ? (MAIN_HAND_NAMES[material.id] || slotDef.name)
    : slotDef.name;
  return `${material.name} ${suffix}`;
}

function mkCraftRecipe(material, slotDef){
  const req = material.reqLevel;
  const baseXP = gatherXpForReq(req) * 6;
  return {
    id: `${material.id}_${slotDef.id}`,
    mode: "craft",
    name: craftDisplayName(material, slotDef),
    req: req,
    img: `${CRAFT_IMG}/${material.id}/${material.id}_${slotDef.id}.png`,
    input: [
      { name: `${material.name} Bar`, qty: slotDef.barCost }
    ],
    output: {
      type: "gear",
      crafted: true,
      slot: slotDef.slot,
      name: craftDisplayName(material, slotDef),
      img: `${CRAFT_IMG}/${material.id}/${material.id}_${slotDef.id}.png`,
      rarity: "uncommon",
      reqLevel: req,
      atk: slotDef.atk + Math.floor(req / 10),
      def: slotDef.def + Math.floor(req / 10),
      qty: 1
    },
    baseXP
  };
}

const RECIPES = [
  ...MATERIALS.map(m => mkRecipe(`${m.id}_bar`, `${m.name} Bar`, m.reqLevel, `${m.name} Ore`)),
  ...MATERIALS.flatMap(m => CRAFT_SLOTS.map(slot => mkCraftRecipe(m, slot)))
];

function getRecipeFromUrl(){
  const p = new URLSearchParams(location.search);
  return p.get("recipe") || "copper_bar";
}
function getRecipeDef(id){
  return RECIPES.find(r => r.id === id) || RECIPES[0];
}

// -------------------------
// Inventory helpers (units capacity)
// -------------------------
function usedUnits(inv){
  let u = 0;
  for (const it of inv){
    if (!it) continue;
    const q = Number(it.quantity ?? it.qty);
    u += Number.isFinite(q) ? Math.max(1, q) : 1;
  }
  return u;
}
function hasSpaceFor(save, addUnits){
  const maxUnits = Number(save.inventoryMaxSlots || 1000);
  return usedUnits(save.inventory) + addUnits <= maxUnits;
}

function findStackByName(inv, name){
  return inv.findIndex(it => it && (it.name || "").toLowerCase() === name.toLowerCase());
}
function getQtyByName(inv, name){
  const idx = findStackByName(inv, name);
  if (idx < 0) return 0;
  const it = inv[idx];
  const q = Number(it.quantity ?? it.qty);
  return Number.isFinite(q) ? Math.max(1, q) : 1;
}
function removeByName(save, name, qtyNeeded){
  const idx = findStackByName(save.inventory, name);
  if (idx < 0) return false;

  const it = save.inventory[idx];
  const q = Number(it.quantity ?? it.qty);
  const have = Number.isFinite(q) ? Math.max(1, q) : 1;

  if (have > qtyNeeded){
    it.quantity = have - qtyNeeded;
    return true;
  }
  if (have === qtyNeeded){
    save.inventory.splice(idx, 1);
    return true;
  }
  return false;
}

// Stacking compatible with ui.js
function itemStackKey(it){
  return [
    it.type || "",
    it.crafted ? "crafted" : "",
    it.name || "",
    it.slot || "",
    it.reqLevel ?? 1,
    it.atk ?? 0,
    it.def ?? 0,
    it.rarity || "",
    it.img || ""
  ].join("::");
}
function addToInventoryStack(save, item, qty){
  const key = itemStackKey(item);
  const ex = save.inventory.find(i => i && itemStackKey(i) === key);
  if (ex){
    ex.quantity = (Number(ex.quantity) || 1) + qty;
  } else {
    save.inventory.push({ ...item, quantity: qty });
  }
}

function addSigilToInventory(save, item, qty){
  const key = itemStackKey(item);
  const exIdx = save.inventory.findIndex(i => i && itemStackKey(i) === key);
  if (exIdx >= 0){
    const ex = save.inventory[exIdx];
    ex.quantity = (Number(ex.quantity) || 1) + qty;
  } else {
    save.inventory.unshift({ ...item, quantity: qty });
  }
}

// -------------------------
// ✅ Stats helper (writes inside SAME save object)
// -------------------------
function incStat(save, key, amount = 1){
  if (!save || typeof save !== "object") return;
  if (!save.stats || typeof save.stats !== "object") save.stats = {};
  if (!save.stats.total || typeof save.stats.total !== "object") save.stats.total = {};

  const add = Number.isFinite(Number(amount)) ? Number(amount) : 1;
  const cur = Number.isFinite(Number(save.stats.total[key])) ? Number(save.stats.total[key]) : 0;
  save.stats.total[key] = cur + add;
}

// -------------------------
// XP scaling
// -------------------------
function xpNextForLevel(lvl){
  const L = Math.max(1, Math.floor(Number(lvl) || 1));
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
function gainBlacksmithXP(save, baseXP, reqLevel, artisanXpPct = 0){
  const mult = 1 + (Number(reqLevel || 1) / 20);
  const forgeBonusMult = 1 + (Number(save.forgeAcademyLevel) || 0) * 0.0005;
  const gained = Math.round(Number(baseXP || 0) * mult * forgeBonusMult * (1 + artisanXpPct));
  save.blacksmithXP += gained;

  while (save.blacksmithXP >= save.blacksmithXPNext){
    save.blacksmithXP -= save.blacksmithXPNext;
    save.blacksmithLevel += 1;
    save.blacksmithXPNext = xpNextForLevel(save.blacksmithLevel);
  }
  return gained;
}
function getArtisanPetState(save){
  const pet = save?.pets?.artisan;
  const bonuses = window.DS?.pets?.getArtisanPetBonuses ? (window.DS.pets.getArtisanPetBonuses(pet) || {}) : {};
  return {
    name: String(pet?.name || ""),
    xpPct: num(bonuses.professionXpPct, 0),
    doublePct: num(bonuses.doubleCraftPct, 0)
  };
}
function renderArtisanPetBonus(save){
  const el = document.getElementById("artisanPetBonusText");
  if (!el) return;
  const pet = getArtisanPetState(save);
  if (!pet.name || pet.xpPct <= 0) {
    el.textContent = "";
    el.style.display = "none";
    return;
  }
  el.style.display = "";
  el.textContent = `+${(pet.xpPct * 100).toFixed(2)}% XP (${pet.name})`;
}

// -------------------------
// DOM
// -------------------------
const backBtn  = document.getElementById("backBtn");
const startBtn = document.getElementById("startBtn");
const stopBtn  = document.getElementById("stopBtn");

const barImg  = document.getElementById("barImg");
const barName = document.getElementById("barName");
const barReq  = document.getElementById("barReq");

const timerWrap = document.getElementById("timerWrap");
const timerText = document.getElementById("timerText");
const timerBar  = document.getElementById("timerBar");

const msgEl = document.getElementById("msg");

const targetInput  = document.getElementById("targetInput");
const targetBtn    = document.getElementById("targetBtn");
const targetStatus = document.getElementById("targetStatus");

const lvlEl  = document.getElementById("bsLevel");
const curEl  = document.getElementById("bsXPCurrent");
const nextEl = document.getElementById("bsXPNext");
const xpBarEl  = document.getElementById("bsXPBar");
const artisanBonusPetValue = document.getElementById("artisanBonusPetValue");
const artisanBonusDoubleValue = document.getElementById("artisanBonusDoubleValue");
const artisanBonusBuildingValue = document.getElementById("artisanBonusBuildingValue");
const artisanBonusPotionValue = document.getElementById("artisanBonusPotionValue");

window.addEventListener("ds:pause", () => stopForgeAction(true));

function renderForgeHeader(){
  const save = ensureForge(loadSave());

  if (lvlEl) lvlEl.textContent = String(save.blacksmithLevel);
  if (curEl) curEl.textContent = String(save.blacksmithXP);
  if (nextEl) nextEl.textContent = String(save.blacksmithXPNext);

  const pct = save.blacksmithXPNext > 0
    ? Math.max(0, Math.min(100, (save.blacksmithXP / save.blacksmithXPNext) * 100))
    : 0;

  if (xpBarEl) {
    xpBarEl.style.width = pct.toFixed(1) + "%";
    xpBarEl.style.background = xpBarGradient(pct);
  }
}

function formatPct(value, digits = 2){
  const pct = Math.max(0, num(value, 0) * 100);
  const rounded = Math.round(pct * (10 ** digits)) / (10 ** digits);
  return `+${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(digits).replace(/\.?0+$/, "")}%`;
}

function renderBonusBox(save){
  const petBonus = getArtisanPetState(save);
  const buildingPct = num(save?.forgeAcademyLevel, 0) * 0.0005;
  if (artisanBonusPetValue) artisanBonusPetValue.textContent = formatPct(num(petBonus.xpPct, 0));
  if (artisanBonusDoubleValue) artisanBonusDoubleValue.textContent = formatPct(num(petBonus.doublePct, 0));
  if (artisanBonusBuildingValue) artisanBonusBuildingValue.textContent = formatPct(buildingPct);
  if (artisanBonusPotionValue) artisanBonusPotionValue.textContent = formatPct(0);
}

// -------------------------
// Smelting loop + timer bar
// -------------------------
const CD_MS = 6000;
// -------------------------
// Global action lock (prevents multi-actions + enforces absolute cooldown)
// -------------------------
const ACTION_ID = "forge";
const ACTION_LOCK_KEY = "ds_action_lock_v1";

function loadActionLock(){
  try { return JSON.parse(localStorage.getItem(ACTION_LOCK_KEY) || "null"); }
  catch { return null; }
}
function saveActionLock(lock){
  localStorage.setItem(ACTION_LOCK_KEY, JSON.stringify(lock || null));
}
function isLockExpired(lock, now){
  if (!lock || !lock.active) return true;
  const last = Number(lock.lastPing || 0);
  return (now - last) > CD_MS * 2;
}
function acquireActionLock(){
  const now = Date.now();
  const lock = loadActionLock();
  if (lock && !isLockExpired(lock, now)) {
    if (lock.actionId && lock.actionId !== ACTION_ID) {
      return { ok:false, msg:"You are tired. Another action is running." };
    }
    if (now < Number(lock.nextAllowedTs || 0)) {
      const wait = Math.max(0, Number(lock.nextAllowedTs) - now);
      return { ok:false, msg:`You are tired. Wait ${(wait/1000).toFixed(1)}s.` };
    }
  }
  const nextAllowedTs = now + CD_MS;
  saveActionLock({ actionId: ACTION_ID, active:true, nextAllowedTs, lastPing: now });
  return { ok:true };
}
function getActionWaitMs(){
  const now = Date.now();
  const lock = loadActionLock();
  if (lock && lock.actionId === ACTION_ID && Number.isFinite(Number(lock.nextAllowedTs))){
    return Math.max(0, Number(lock.nextAllowedTs) - now);
  }
  return CD_MS;
}
function touchActionLock(){
  const now = Date.now();
  const lock = loadActionLock();
  if (!lock || lock.actionId !== ACTION_ID) return;
  lock.active = true;
  lock.lastPing = now;
  lock.nextAllowedTs = now + CD_MS;
  saveActionLock(lock);
}
function releaseActionLock(){
  const lock = loadActionLock();
  if (lock && lock.actionId === ACTION_ID){
    lock.active = false;
    saveActionLock(lock);
  }
}
let smeltActive = false;
let smeltTimer = null;

let cdAnim = null;
let cdStart = 0;

let targetRemaining = 0;

function setMsg(t){
  if (msgEl) msgEl.innerHTML = t || "";
}

function buildForgeMessage(recipe, xpGain, sigilDrop, isLast = false){
  const lastText = isLast ? " (last)" : "";
  return `Crafted 1 <img src="${recipe.output.img}" alt="${recipe.output.name}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${recipe.output.name}${lastText} (+${xpGain} XP)${sigilDrop ? " | Ore Sigil +1" : ""}`;
}

function stopCooldownUI(){
  if (cdAnim) cancelAnimationFrame(cdAnim);
  cdAnim = null;

  if (timerWrap) timerWrap.style.display = "none";
  if (timerBar) timerBar.style.width = "0%";
  if (timerText) timerText.textContent = (CD_MS/1000).toFixed(1) + "s";
}

function startCooldownUI(remainingMs = CD_MS){
  if (!timerWrap || !timerBar || !timerText) return;

  timerWrap.style.display = "";
  const rem = Math.max(0, Math.min(CD_MS, remainingMs));
  cdStart = performance.now() - (CD_MS - rem);

  const tick = (now) => {
    if (!smeltActive || window.DS?.isPaused){
      cdAnim = null;
      return;
    }

    const elapsed = now - cdStart;
    const t = Math.min(1, elapsed / CD_MS);

    timerBar.style.width = (t * 100).toFixed(1) + "%";
    const remain = Math.max(0, (CD_MS - elapsed) / 1000);
    timerText.textContent = remain.toFixed(1) + "s";

    if (t < 1){
      cdAnim = requestAnimationFrame(tick);
    } else {
      cdAnim = null;
    }
  };

  if (cdAnim) cancelAnimationFrame(cdAnim);
  cdAnim = requestAnimationFrame(tick);
}

function updateTargetUI(){
  if (!targetStatus) return;
  targetStatus.textContent = (targetRemaining > 0) ? `Remaining: ${targetRemaining}` : "";
}

function startForgeAction(){
  if (window.DS?.isPaused) return;
  if (smeltActive) return;
  const lock = acquireActionLock();
  if (!lock.ok){ setMsg(lock.msg); return; }

  smeltActive = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;

  setMsg("Forge action started.");
  touchActionLock();
  scheduleNextAction(true);
}

function stopForgeAction(silent=false){
  smeltActive = false;

  if (smeltTimer){
    clearTimeout(smeltTimer);
    smeltTimer = null;
  }

  stopCooldownUI();

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  targetRemaining = 0;
  updateTargetUI();

  if (!silent) setMsg("Forge action stopped.");
}

function scheduleNextAction(runImmediately=false){
  if (!smeltActive) return;
  if (window.DS?.isPaused) return;

  if (runImmediately){
    forgeTick();
    return;
  }

  const waitMs = getActionWaitMs();
  startCooldownUI(waitMs);
  smeltTimer = setTimeout(() => forgeTick(), waitMs);
}

function recipeLine(r){
  const inputs = r.input.map(x => `${x.qty} ${x.name}`).join(" + ");
  return `Req Lv ${r.req} - ${inputs} -> ${r.output.qty} ${r.output.name}`;
}

function canRunRecipe(save, r){
  const effectiveLevel = save.blacksmithLevel + getArtisanPotionBonus(save);
  if (effectiveLevel < r.req) return { ok:false, why:`❌ Requires Blacksmith Level ${r.req}.` };

  for (const x of r.input){
    const have = getQtyByName(save.inventory, x.name);
    if (have < x.qty) return { ok:false, why:`❌ Need ${x.name} x${x.qty}.` };
  }

  if (!hasSpaceFor(save, r.output.qty)){
    return { ok:false, why:"❌ No more inventory space." };
  }

  return { ok:true, why:"" };
}

function forgeTick(){
  if (!smeltActive) return;
  if (window.DS?.isPaused) return;

  const r = getRecipeDef(getRecipeFromUrl());
  const save = ensureForge(loadSave());
  const petBonus = getArtisanPetState(save);

  const check = canRunRecipe(save, r);
  if (!check.ok){
    setMsg(check.why);
    stopForgeAction(true);
    return;
  }

  // consume inputs
  for (const x of r.input){
    const ok = removeByName(save, x.name, x.qty);
    if (!ok){
      setMsg(`Missing ${x.name}.`);
      stopForgeAction(true);
      setSave(save);
      return;
    }
  }

  // add output
  addToInventoryStack(save, {
    type:r.output.type,
    crafted: !!r.output.crafted,
    slot:r.output.slot,
    name:r.output.name,
    img:r.output.img,
    rarity:r.output.rarity,
    reqLevel:r.output.reqLevel,
    atk:r.output.atk,
    def:r.output.def
  }, r.output.qty);
  const doubled = Math.random() < petBonus.doublePct;
  if (doubled) {
    addToInventoryStack(save, {
      type:r.output.type,
      crafted: !!r.output.crafted,
      slot:r.output.slot,
      name:r.output.name,
      img:r.output.img,
      rarity:r.output.rarity,
      reqLevel:r.output.reqLevel,
      atk:r.output.atk,
      def:r.output.def
    }, r.output.qty);
  }

  let sigilDrop = false;
  if (Math.random() < (1 / 250)) {
    addSigilToInventory(save, { ...ORE_SIGIL_ITEM }, 1);
    sigilDrop = true;
  }

  // ✅ STATS (safe: stored in same save object)
  incStat(save, r.mode === "smelt" ? "barsCrafted" : "itemsCrafted", r.output.qty);
  tickArtisanPotionActions(save, 1);

  // xp
  save.blacksmithXPNext = xpNextForLevel(save.blacksmithLevel);
  const xpMult = 1 + (Number(r.req || 1) / 20);
  const forgeBonusMult = 1 + (Number(save.forgeAcademyLevel) || 0) * 0.0005;
  const totalXpGain = Math.max(1, Math.round(Number(r.baseXP || 0) * xpMult * forgeBonusMult * (1 + petBonus.xpPct)));
  const petSplit = window.DS?.pets?.splitXpWithPet
    ? window.DS.pets.splitXpWithPet(save, "artisan", totalXpGain)
    : { playerXpGain: totalXpGain, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
  const xpGain = petSplit.playerXpGain;
  save.blacksmithXP += xpGain;
  while (save.blacksmithXP >= save.blacksmithXPNext){
    save.blacksmithXP -= save.blacksmithXPNext;
    save.blacksmithLevel += 1;
    save.blacksmithXPNext = xpNextForLevel(save.blacksmithLevel);
  }

  setSave(save);
  window.dispatchEvent(new Event("ds:save"));
  renderForgeHeader();
  renderBonusBox(save);

  // target decrement
  if (targetRemaining > 0){
    targetRemaining -= 1;
    updateTargetUI();
    if (targetRemaining <= 0){
      setMsg(`Target completed! ${buildForgeMessage(r, xpGain, sigilDrop, true)}${petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : ""}${petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : ""}${doubled ? ` <span style="color:#9ff0b7;">Double Craft!</span>` : ""}`);
      stopForgeAction(true);
      return;
    }
  }

  setMsg(buildForgeMessage(r, xpGain, sigilDrop, false) + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Craft!</span>` : ""));
  touchActionLock();
  scheduleNextAction(false);
}

function startTargetForge(){
  const val = Number(targetInput?.value);
  if (!Number.isFinite(val) || val <= 0){
    alert("Enter a valid target amount (e.g. 100).");
    return;
  }
  targetRemaining = Math.floor(val);
  updateTargetUI();

  if (!smeltActive) startForgeAction();
  else setMsg(`Target set: ${targetRemaining}`);
}

// -------------------------
// Boot
// -------------------------
window.addEventListener("DOMContentLoaded", () => {
  const r = getRecipeDef(getRecipeFromUrl());

  if (barImg) barImg.src = r.img;
  if (barImg) barImg.style.background = r.mode === "craft" ? CRAFT_ICON_BG : "#0f0f16";
  if (barName) barName.textContent = r.name;
  if (barReq) barReq.textContent = recipeLine(r);
  const actionLabel = document.querySelector("#timerWrap span");
  if (actionLabel) actionLabel.textContent = r.mode === "smelt" ? "Smelting..." : "Crafting...";
  if (targetBtn) targetBtn.textContent = r.mode === "smelt" ? "🎯 Smelt Target" : "🎯 Craft Target";

  const save = ensureForge(loadSave());
  renderForgeHeader();
  renderBonusBox(save);
  stopCooldownUI();

  backBtn?.addEventListener("click", () => {
    stopForgeAction(true);
    window.location.href = "forge.html";
  });

  startBtn?.addEventListener("click", startForgeAction);
  stopBtn?.addEventListener("click", () => stopForgeAction(false));

  targetBtn?.addEventListener("click", startTargetForge);

  if (stopBtn) stopBtn.disabled = true;
});

window.addEventListener("ds:save", () => {
  const save = ensureForge(loadSave());
  renderForgeHeader();
  renderBonusBox(save);
});


