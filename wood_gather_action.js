// wood_gather_action.js — Gather action (LOG ICONS + timer bar + stats safe)
// - Start / Stop / Back
// - 6s cooldown bar + timer text (requestAnimationFrame)
// - Target amount
// - DS pause stops immediately
// - Gives 1 log per tick, stacks in inventory
// - Woodcutting XP scaling + level up
// - ✅ Stats-safe: woodGatherTicks increments INSIDE the same save object (won’t be overwritten)

const SAVE_KEY = "darkstone_save_v1";
const WOOD_SIGIL_ITEM = {
  type: "material",
  name: "Wood Sigil",
  img: "images/items/sigils/wood_sigil.png"
};

const num = (v,f=0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
function xpBarGradient(pct){
  if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
  if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
  if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
  return "linear-gradient(90deg,#2f9e5b,#7be39e)";
}

function loadSave(){
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
  catch { return {}; }
}
function setSave(next){
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
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

function ensureWood(save){
  save = save && typeof save === "object" ? save : {};
  if (!Array.isArray(save.inventory)) save.inventory = [];

  save.woodcuttingLevel = Math.max(1, num(save.woodcuttingLevel, 1));
  save.woodcuttingXP = Math.max(0, num(save.woodcuttingXP, 0));
  save.woodcuttingXPNext = xpNextForLevel(save.woodcuttingLevel);

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
function getGatheringPotionBonus(save){
  const cons = (save && typeof save.consumables === "object") ? save.consumables : {};
  let bonus = 0;
  ["quick_potion1","quick_potion2"].forEach((slot) => {
    const it = cons[slot];
    if (!it) return;
    const qty = Number.isFinite(Number(it.quantity ?? it.qty)) ? Number(it.quantity ?? it.qty) : 1;
    if (qty <= 0) return;
    const id = String(it.id || "").toLowerCase();
    const name = String(it.name || "").toLowerCase();
    if (!id.includes("gathering_insight") && !name.includes("gathering insight")) return;
    bonus += getPotionTier(it);
  });
  return bonus;
}
function tickGatheringPotionActions(save, actions = 1){
  if (!save || typeof save !== "object") return false;
  if (!save.consumables || typeof save.consumables !== "object") return false;
  let changed = false;
  ["quick_potion1","quick_potion2"].forEach((slot) => {
    const it = save.consumables[slot];
    if (!it) return;
    const id = String(it.id || "").toLowerCase();
    const name = String(it.name || "").toLowerCase();
    if (!id.includes("gathering_insight") && !name.includes("gathering insight")) return;
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
function getGatheringPetState(save){
  const pet = save?.pets?.gathering;
  const bonuses = window.DS?.pets?.getGatheringPetBonuses ? (window.DS.pets.getGatheringPetBonuses(pet) || {}) : {};
  return {
    name: String(pet?.name || ""),
    xpPct: num(bonuses.professionXpPct, 0),
    doublePct: num(bonuses.doubleGatherPct, 0)
  };
}
function renderGatheringPetBonus(save){
  const el = document.getElementById("gatheringPetBonusText");
  if (!el) return;
  const pet = getGatheringPetState(save);
  if (!pet.name || pet.xpPct <= 0) {
    el.textContent = "";
    el.style.display = "none";
    return;
  }
  el.style.display = "";
  el.textContent = `+${(pet.xpPct * 100).toFixed(2)}% XP (${pet.name})`;
}

// ✅ Uses log icons for selection/header (same path that works in inventory)
const WOODS = [
  { id:"ash",      name:"Ash",      req: 1,  img:"images/wood/logs/ash_log.png" },
  { id:"pine",     name:"Pine",     req:10,  img:"images/wood/logs/pine_log.png" },
  { id:"birch",    name:"Birch",    req:20,  img:"images/wood/logs/birch_log.png" },
  { id:"oak",      name:"Oak",      req:30,  img:"images/wood/logs/oak_log.png" },
  { id:"cedar",    name:"Cedar",    req:40,  img:"images/wood/logs/cedar_log.png" },
  { id:"maple",    name:"Maple",    req:50,  img:"images/wood/logs/maple_log.png" },
  { id:"ironwood", name:"Ironwood", req:60,  img:"images/wood/logs/ironwood_log.png" },
  { id:"heartwood",name:"Heartwood",req:70,  img:"images/wood/logs/heartwood_log.png" },
  { id:"darkwood", name:"Darkwood", req:80,  img:"images/wood/logs/darkwood_log.png" },
  { id:"ebony",    name:"Ebony",    req:90,  img:"images/wood/logs/ebony_log.png" }
];

function getWoodFromUrl(){
  const p = new URLSearchParams(location.search);
  return p.get("wood") || "ash";
}
function getWoodDef(id){
  return WOODS.find(w => w.id === id) || WOODS[0];
}

// stacking compatible with ui.js (simple key)
function itemStackKey(it){
  return [it.type||"", it.name||"", it.img||""].join("::");
}
function addToInventoryStack(save, item, qty){
  const key = itemStackKey(item);
  const ex = save.inventory.find(i => i && itemStackKey(i) === key);
  if (ex) ex.quantity = (Number(ex.quantity) || 1) + qty;
  else save.inventory.push({ ...item, quantity: qty });
}

// ✅ Stats helper (writes inside SAME save object)
function incStat(save, key, amount = 1){
  if (!save || typeof save !== "object") return;
  if (!save.stats || typeof save.stats !== "object") save.stats = {};
  if (!save.stats.total || typeof save.stats.total !== "object") save.stats.total = {};

  const add = Number.isFinite(Number(amount)) ? Number(amount) : 1;
  const cur = Number.isFinite(Number(save.stats.total[key])) ? Number(save.stats.total[key]) : 0;
  save.stats.total[key] = cur + add;
}

// DOM
const backBtn = document.getElementById("backBtn");
const startBtn = document.getElementById("startBtn");
const stopBtn  = document.getElementById("stopBtn");

const woodImg  = document.getElementById("woodImg");
const woodName = document.getElementById("woodName");
const woodReq  = document.getElementById("woodReq");

const timerWrap = document.getElementById("timerWrap");
const timerText = document.getElementById("timerText");
const timerBar  = document.getElementById("timerBar");

const msgEl = document.getElementById("msg");

const targetInput  = document.getElementById("targetInput");
const targetBtn    = document.getElementById("targetBtn");
const targetStatus = document.getElementById("targetStatus");

const lvlEl  = document.getElementById("woodLevel");
const curEl  = document.getElementById("woodXPCurrent");
const nextEl = document.getElementById("woodXPNext");
const barEl  = document.getElementById("woodXPBar");
const gatheringBonusPetValue = document.getElementById("gatheringBonusPetValue");
const gatheringBonusDoubleValue = document.getElementById("gatheringBonusDoubleValue");
const gatheringBonusBuildingValue = document.getElementById("gatheringBonusBuildingValue");
const gatheringBonusPotionValue = document.getElementById("gatheringBonusPotionValue");

// pause integration
window.addEventListener("ds:pause", () => stopGather(true));

function setMsg(t){ if (msgEl) msgEl.innerHTML = t || ""; }

function buildWoodGatherMessage(logName, logImg, xpGain, sigilDrop, isLast = false){
  const lastText = isLast ? " (last)" : "";
  return `You obtained 1 <img src="${logImg}" alt="${logName}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${logName}${lastText} (+${xpGain} XP)${sigilDrop ? " | Wood Sigil +1" : ""}`;
}

function renderHeader(){
  const save = ensureWood(loadSave());

  if (lvlEl) lvlEl.textContent = String(save.woodcuttingLevel);
  if (curEl) curEl.textContent = String(save.woodcuttingXP);
  if (nextEl) nextEl.textContent = String(save.woodcuttingXPNext);

  const pct = save.woodcuttingXPNext > 0
    ? clamp((save.woodcuttingXP / save.woodcuttingXPNext) * 100, 0, 100)
    : 0;

  if (barEl) {
    barEl.style.width = pct.toFixed(1) + "%";
    barEl.style.background = xpBarGradient(pct);
  }
}

function formatPct(value, digits = 2){
  const pct = Math.max(0, num(value, 0) * 100);
  const rounded = Math.round(pct * (10 ** digits)) / (10 ** digits);
  return `+${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(digits).replace(/\.?0+$/, "")}%`;
}

function renderBonusBox(save){
  const petBonus = getGatheringPetState(save);
  if (gatheringBonusPetValue) gatheringBonusPetValue.textContent = formatPct(num(petBonus.xpPct, 0));
  if (gatheringBonusDoubleValue) gatheringBonusDoubleValue.textContent = formatPct(num(petBonus.doublePct, 0));
  if (gatheringBonusBuildingValue) gatheringBonusBuildingValue.textContent = formatPct(0);
  if (gatheringBonusPotionValue) gatheringBonusPotionValue.textContent = formatPct(0);
}

// ---- Timer / loop
const CD_MS = 6000;
// -------------------------
// Global action lock (prevents multi-actions + enforces absolute cooldown)
// -------------------------
const ACTION_ID = "wood_gather";
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
let active = false;
let timer = null;

let cdAnim = null;
let cdStart = 0;

let targetRemaining = 0;

function gatherXpForReq(req){
  const lvl = Math.max(1, Number(req) || 1);
  return 10 + Math.floor(lvl / 10) * 20;
}

function stopCooldownUI(){
  if (cdAnim) cancelAnimationFrame(cdAnim);
  cdAnim = null;

  if (timerWrap) timerWrap.style.display = "none";
  if (timerBar) {
    timerBar.style.width = "0%";
    timerBar.style.background = "linear-gradient(90deg,#b63a3a,#e05555)";
  }
  if (timerText) timerText.textContent = (CD_MS/1000).toFixed(1) + "s";
}

function startCooldownUI(remainingMs = CD_MS){
  if (!timerWrap || !timerBar || !timerText) return;

  timerWrap.style.display = "block";
  timerWrap.style.visibility = "visible";

  timerBar.style.background = "linear-gradient(90deg,#b63a3a,#e05555)";
  timerBar.style.width = "0%";

  const rem = Math.max(0, Math.min(CD_MS, remainingMs));
  cdStart = performance.now() - (CD_MS - rem);

  const tickAnim = (now) => {
    if (!active || window.DS?.isPaused) { cdAnim = null; return; }

    const elapsed = now - cdStart;
    const t = Math.min(1, elapsed / CD_MS);

    timerBar.style.width = (t * 100).toFixed(1) + "%";
    const remain = Math.max(0, (CD_MS - elapsed) / 1000);
    timerText.textContent = remain.toFixed(1) + "s";

    if (t < 1) cdAnim = requestAnimationFrame(tickAnim);
    else cdAnim = null;
  };

  if (cdAnim) cancelAnimationFrame(cdAnim);
  cdAnim = requestAnimationFrame(tickAnim);
}

function updateTargetUI(){
  if (!targetStatus) return;
  targetStatus.textContent = (targetRemaining > 0) ? `Remaining: ${targetRemaining}` : "";
}

function startGather(){
  if (window.DS?.isPaused) return;
  if (active) return;
  const lock = acquireActionLock();
  if (!lock.ok){ setMsg(lock.msg); return; }

  active = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;

  setMsg("Gathering started.");
  scheduleNext(true);
}

function stopGather(silent=false){
  active = false;

  if (timer){
    clearTimeout(timer);
    timer = null;
  }

  stopCooldownUI();

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  targetRemaining = 0;
  updateTargetUI();

  if (!silent) setMsg("Gathering stopped.");
}

function scheduleNext(runImmediately=false){
  if (!active || window.DS?.isPaused) return;

  if (runImmediately){
    gatherTick();
    return;
  }

  const waitMs = getActionWaitMs();
  startCooldownUI(waitMs);
  timer = setTimeout(() => gatherTick(), waitMs);
}

function gatherTick(){
  if (!active || window.DS?.isPaused) return;

  const wood = getWoodDef(getWoodFromUrl());
  const save = ensureWood(loadSave());

  const effectiveLevel = save.woodcuttingLevel + getGatheringPotionBonus(save);
  if (effectiveLevel < wood.req){
    setMsg(`Requires Woodcutting Level ${wood.req}.`);
    stopGather(true);
    return;
  }

  const petBonus = getGatheringPetState(save);
  // give 1 log
  const logName = `${wood.name} Log`;
  const logImg  = `images/wood/logs/${wood.id}_log.png`;
  addToInventoryStack(save, { type:"material", name: logName, img: logImg }, 1);
  const doubled = Math.random() < petBonus.doublePct;
  if (doubled) addToInventoryStack(save, { type:"material", name: logName, img: logImg }, 1);

  // ✅ STATS (safe: stored in same save object)
  incStat(save, "woodGatherTicks", 1);
  tickGatheringPotionActions(save, 1);

  // XP (scaled by wood tier)
  const totalXpGain = Math.max(1, Math.round(gatherXpForReq(wood.req) * (1 + petBonus.xpPct)));
  const petSplit = window.DS?.pets?.splitXpWithPet
    ? window.DS.pets.splitXpWithPet(save, "gathering", totalXpGain)
    : { playerXpGain: totalXpGain, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
  const xpGain = petSplit.playerXpGain;
  save.woodcuttingXP += xpGain;
  while (save.woodcuttingXP >= save.woodcuttingXPNext){
    save.woodcuttingXP -= save.woodcuttingXPNext;
    save.woodcuttingLevel += 1;
    save.woodcuttingXPNext = xpNextForLevel(save.woodcuttingLevel);
  }

  setSave(save);
  window.dispatchEvent(new Event("ds:save"));
  renderHeader();
  renderBonusBox(save);

  let sigilDrop = false;
  if (Math.random() < (1 / 250)) {
    addToInventoryStack(save, { ...WOOD_SIGIL_ITEM }, 1);
    sigilDrop = true;
  }

  if (targetRemaining > 0){
    targetRemaining -= 1;
    updateTargetUI();
    if (targetRemaining <= 0){
      setMsg(`Target completed! ${buildWoodGatherMessage(logName, logImg, xpGain, sigilDrop, true)}${petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : ""}${petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : ""}${doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""}`);
      stopGather(true);
      return;
    }
  }

  setMsg(buildWoodGatherMessage(logName, logImg, xpGain, sigilDrop, false) + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""));
  touchActionLock();
  scheduleNext();
}

function startTarget(){
  const val = Number(targetInput?.value);
  if (!Number.isFinite(val) || val <= 0){
    alert("Enter a valid target amount (e.g. 100).");
    return;
  }
  targetRemaining = Math.floor(val);
  updateTargetUI();
  if (!active) startGather();
  else setMsg(`Target set: ${targetRemaining}`);
}

window.addEventListener("DOMContentLoaded", () => {
  const wood = getWoodDef(getWoodFromUrl());

  if (woodImg) woodImg.src = wood.img;
  if (woodName) woodName.textContent = wood.name;
  if (woodReq)  woodReq.textContent = "";

  const save = ensureWood(loadSave());
  renderHeader();
  renderBonusBox(save);
  stopCooldownUI();

  backBtn?.addEventListener("click", () => { stopGather(true); window.location.href = "woodcutting.html"; });
  startBtn?.addEventListener("click", startGather);
  stopBtn?.addEventListener("click", () => stopGather(false));
  targetBtn?.addEventListener("click", startTarget);

  if (stopBtn) stopBtn.disabled = true;
});

window.addEventListener("ds:save", () => {
  const save = ensureWood(loadSave());
  renderHeader();
  renderBonusBox(save);
});


