// mining_action.js — Mining action page (UPDATED: 11 ores + stats safe)
// - Start / Stop / Back
// - 6s cooldown bar + timer text (requestAnimationFrame)
// - Target amount
// - DS pause stops immediately
// - Gives 1 ore per tick, stacks in inventory
// - Mining XP scaling + level up
// - ✅ Stats: miningTicks increments safely (won’t be overwritten by setSave)

(() => {

const SAVE_KEY = "darkstone_save_v1";
const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const ORE_SIGIL_ITEM = {
  type: "material",
  id: "ore_sigil",
  name: "Ore Sigil",
  img: "images/items/sigils/ore_sigil.png"
};
const MINING_ACTION_TEMPLATE = `
  <div style="max-width:340px;margin:0 auto 12px;">
    <div style="background:#151520;border:2px solid #333;border-radius:12px;padding:10px 12px;width:100%;">
      <div style="font-weight:900;font-size:18px;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;text-align:center;">
        <span aria-hidden="true">&#9935;&#65039;</span>
        <span>Mining Lvl: <span id="mineLevel">1</span></span>
      </div>
      <div style="width:100%;">
        <div style="height:12px;background:#0f0f16;border:1px solid #2a2a3a;border-radius:999px;overflow:hidden;position:relative;">
          <div id="mineXPBar" style="height:100%;width:0%;background:#ffaa00;"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="mineXPCurrent">0</span>/<span id="mineXPNext">100</span></div>
        </div>
      </div>
    </div>
  </div>

  <div style="max-width:340px;margin:0 auto 12px;">
    <div id="miningBonusBox" style="background:#151520;border:2px solid #333;border-radius:12px;padding:12px;width:100%;min-height:56px;display:flex;align-items:flex-start;gap:10px;">
      <div style="font-weight:800;font-size:14px;white-space:nowrap;line-height:1.05;text-align:center;">Bonus<br>XP</div>
      <div style="width:1px;align-self:stretch;background:#333;"></div>
      <div id="miningBonusContent" style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;gap:2px;padding-top:2px;">
        <div id="miningBonusTop" style="display:grid;grid-template-columns:0.8fr 1px 1.5fr 1px 1fr 1px 1fr;gap:8px;font-size:11px;font-weight:700;opacity:.9;text-align:center;align-items:center;">
          <div>Pet</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div style="font-size:10px;line-height:1;white-space:nowrap;align-self:center;">Double Gather</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div>Building</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div>Potion</div>
        </div>
        <div style="height:1px;background:#333;width:100%;"></div>
        <div id="miningBonusBottom" style="display:grid;grid-template-columns:0.8fr 1px 1.5fr 1px 1fr 1px 1fr;gap:8px;min-height:14px;align-items:stretch;text-align:center;font-size:11px;font-weight:700;color:#cfe7ff;">
          <div id="miningBonusPetValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="miningBonusDoubleValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="miningBonusBuildingValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="miningBonusPotionValue">+0%</div>
        </div>
      </div>
    </div>
  </div>

  <div style="width:90%;max-width:700px;margin:0 auto 12px;display:flex;gap:10px;justify-content:center;">
    <button id="backBtn">Back</button>
    <button id="startBtn">Start</button>
    <button id="stopBtn" disabled>Stop</button>
  </div>

  <div style="background:#151520;border:2px solid #333;border-radius:12px;padding:12px;max-width:900px;margin:0 auto;">
    <div style="display:flex;gap:12px;align-items:center;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:74px;">
        <div style="font-weight:800;font-size:18px;text-align:center;" id="oreName">Ore</div>
        <img id="oreImg" src="" alt="Ore" style="width:74px;height:74px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
      </div>
      <div style="flex:1;">
        <div id="timerWrap" style="margin-top:10px;display:none;">
          <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
            <span>Mining...</span>
            <span id="timerText">6.0s</span>
          </div>
          <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
            <div id="timerBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
          </div>
        </div>

        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <div style="opacity:.85;font-size:12px;">Target amount:</div>
          <input id="targetInput" type="number" min="1" step="1" placeholder="e.g. 100"
            style="width:120px;padding:8px 10px;border-radius:10px;border:2px solid #333;background:#0f0f16;color:#fff;">
          <button id="targetBtn">Mine Target</button>
          <div id="targetStatus" style="opacity:.85;font-size:12px;"></div>
        </div>
      </div>
    </div>

    <div id="msg" style="margin-top:12px;opacity:.9;"></div>
  </div>
`;

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

function ensureMining(save){
  save = save && typeof save === "object" ? save : {};
  if (!Number.isFinite(Number(save.miningLevel))) save.miningLevel = 1;
  if (!Number.isFinite(Number(save.miningXP))) save.miningXP = 0;
  save.miningXPNext = xpNextForLevel(save.miningLevel);
  if (!Array.isArray(save.inventory)) save.inventory = [];
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

// ✅ New ore progression (11 ores, includes coal) — must match mining.js + forge_action.js names
const ORES = [
  { id:"copper_ore",      name:"Copper Ore",       req:1,  img:"images/ores/copper_ore.png" },
  { id:"silver_ore",      name:"Silver Ore",       req:10, img:"images/ores/silver_ore.png" },
  { id:"iron_ore",        name:"Iron Ore",         req:20, img:"images/ores/iron_ore.png" },
  { id:"mithril_ore",     name:"Mithril Ore",      req:30, img:"images/ores/mithril_ore.png" },
  { id:"adamant_ore",     name:"Adamant Ore",      req:40, img:"images/ores/adamant_ore.png" },
  { id:"obsidian_ore",    name:"Obsidian Ore",     req:50, img:"images/ores/obsidian_ore.png" },
  { id:"crystal_ore",     name:"Crystal Ore",      req:60, img:"images/ores/crystal_ore.png" },
  { id:"sulfur_ore",      name:"Sulfur Ore",       req:70, img:"images/ores/sulfur_ore.png" },
  { id:"rose_quartz_ore", name:"Rose Quartz Ore",  req:80, img:"images/ores/rose_quartz_ore.png" },
  { id:"darkstone_ore",   name:"Darkstone Ore",    req:90, img:"images/ores/darkstone_ore.png" }
];

function getOreFromUrl(){
  const p = new URLSearchParams(location.search);
  return p.get("ore") || "copper_ore";
}
function getOreDef(id){
  return ORES.find(o => o.id === id) || ORES[0];
}

// -------------------------
// Stack helper (ore stack)
// -------------------------
function itemStackKey(it){
  return [it.type||"", it.name||"", it.img||""].join("::");
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
    // put it near the front so it is visible immediately
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
// DOM
// -------------------------
let backBtn = null;
let startBtn = null;
let stopBtn  = null;
let oreImg  = null;
let oreName = null;
let timerWrap = null;
let timerText = null;
let timerBar  = null;
let msgEl = null;
let targetInput  = null;
let targetBtn    = null;
let targetStatus = null;
let lvlEl  = null;
let curEl  = null;
let nextEl = null;
let barEl  = null;
let miningBonusPetValue = null;
let miningBonusDoubleValue = null;
let miningBonusBuildingValue = null;
let miningBonusPotionValue = null;
let currentOreId = "copper_ore";

function bindDom(){
  backBtn = document.getElementById("backBtn");
  startBtn = document.getElementById("startBtn");
  stopBtn = document.getElementById("stopBtn");
  oreImg = document.getElementById("oreImg");
  oreName = document.getElementById("oreName");
  timerWrap = document.getElementById("timerWrap");
  timerText = document.getElementById("timerText");
  timerBar = document.getElementById("timerBar");
  msgEl = document.getElementById("msg");
  targetInput = document.getElementById("targetInput");
  targetBtn = document.getElementById("targetBtn");
  targetStatus = document.getElementById("targetStatus");
  lvlEl = document.getElementById("mineLevel");
  curEl = document.getElementById("mineXPCurrent");
  nextEl = document.getElementById("mineXPNext");
  barEl = document.getElementById("mineXPBar");
  miningBonusPetValue = document.getElementById("miningBonusPetValue");
  miningBonusDoubleValue = document.getElementById("miningBonusDoubleValue");
  miningBonusBuildingValue = document.getElementById("miningBonusBuildingValue");
  miningBonusPotionValue = document.getElementById("miningBonusPotionValue");
}

// -------------------------
// Global pause/resume from ui.js inspector
// -------------------------
window.addEventListener("ds:pause", () => stopMining(true));
window.addEventListener("ds:resume", () => { /* no auto-start */ });

// -------------------------
// UI: Mining header
// -------------------------
function renderMiningHeader(){
  const save = ensureMining(loadSave());

  if (lvlEl) lvlEl.textContent = String(save.miningLevel);
  if (curEl) curEl.textContent = String(save.miningXP);
  if (nextEl) nextEl.textContent = String(save.miningXPNext);

  const pct = save.miningXPNext > 0
    ? Math.max(0, Math.min(100, (save.miningXP / save.miningXPNext) * 100))
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

function renderMiningBonusBox(save){
  const petBonus = getGatheringPetState(save);
  const petXpPct = num(petBonus.xpPct, 0);
  const doublePct = num(petBonus.doublePct, 0);
  const buildingPct = num(save?.minerHutLevel, 0) * 0.0005;
  const potionPct = 0;

  if (miningBonusPetValue) miningBonusPetValue.textContent = formatPct(petXpPct);
  if (miningBonusDoubleValue) miningBonusDoubleValue.textContent = formatPct(doublePct);
  if (miningBonusBuildingValue) miningBonusBuildingValue.textContent = formatPct(buildingPct);
  if (miningBonusPotionValue) miningBonusPotionValue.textContent = formatPct(potionPct);
}

// -------------------------
// Mining loop + timer bar
// -------------------------
const CD_MS = 6000;
let miningActive = false;
let miningTimer = null;

let cdAnim = null;
let cdStart = 0;

let targetRemaining = 0;

// -------------------------
// Global action lock (prevents multi-actions + enforces absolute cooldown)
// -------------------------
const ACTION_ID = "mining";
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

function gatherXpForReq(req){
  const lvl = Math.max(1, Number(req) || 1);
  return 10 + Math.floor(lvl / 10) * 20;
}

function setMsg(t){
  if (msgEl) msgEl.innerHTML = t || "";
}

function buildOreMessage(ore, xpGain, sigilDrop, isLast = false){
  const lastText = isLast ? " (last)" : "";
  return `You obtained 1 <img src="${ore.img}" alt="${ore.name}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${ore.name}${lastText} (+${xpGain} XP)${sigilDrop ? " | Ore Sigil +1" : ""}`;
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
    if (!miningActive || window.DS?.isPaused){
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

function startMining(){
  if (window.DS?.isPaused) return;
  if (miningActive) return;
  const lock = acquireActionLock();
  if (!lock.ok){ setMsg(lock.msg); return; }

  miningActive = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;

  setMsg("Mining started.");
  scheduleNextMine(true);
}

function stopMining(silent=false){
  miningActive = false;

  if (miningTimer){
    clearTimeout(miningTimer);
    miningTimer = null;
  }

  stopCooldownUI();

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  targetRemaining = 0;
  updateTargetUI();

  if (!silent) setMsg("Mining stopped.");
}

function scheduleNextMine(runImmediately=false){
  if (!miningActive) return;
  if (window.DS?.isPaused) return;

  if (runImmediately){
    mineTick();
    return;
  }

  const waitMs = getActionWaitMs();
  startCooldownUI(waitMs);
  miningTimer = setTimeout(() => mineTick(), waitMs);
}

function mineTick(){
  if (!miningActive) return;
  if (window.DS?.isPaused) return;

  const oreId = currentOreId || getOreFromUrl();
  const ore = getOreDef(oreId);

  const save = ensureMining(loadSave());
  const petBonus = getGatheringPetState(save);

    const effectiveLevel = save.miningLevel + getGatheringPotionBonus(save);
    if (effectiveLevel < ore.req){
      setMsg(`Requires Mining Level ${ore.req}.`);
      stopMining(true);
      return;
    }

  // ✅ give 1 ore
  addToInventoryStack(save, {
    type: "ore",
    id: ore.id,
    name: ore.name,
    img: ore.img
  }, 1);
  const doubled = Math.random() < petBonus.doublePct;
  if (doubled) {
    addToInventoryStack(save, {
      type: "ore",
      id: ore.id,
      name: ore.name,
      img: ore.img
    }, 1);
  }

  // ✅ STATS (safe: stored in same save object)
    incStat(save, "miningTicks", 1);
    tickGatheringPotionActions(save, 1);

  // XP gain (scaled by ore tier + building bonus)
  const baseXpGain = gatherXpForReq(ore.req);
  const miningBonusMult = 1 + (Number(save.minerHutLevel) || 0) * 0.0005;
  const totalXpGain = Math.max(1, Math.round(baseXpGain * miningBonusMult * (1 + petBonus.xpPct)));
  const petSplit = window.DS?.pets?.splitXpWithPet
    ? window.DS.pets.splitXpWithPet(save, "gathering", totalXpGain)
    : { playerXpGain: totalXpGain, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
  const xpGain = petSplit.playerXpGain;
  save.miningXP += xpGain;

  while (save.miningXP >= save.miningXPNext){
    save.miningXP -= save.miningXPNext;
    save.miningLevel += 1;
    save.miningXPNext = xpNextForLevel(save.miningLevel);
  }

  let sigilDrop = false;
  if (Math.random() < (1 / 250)) {
    addSigilToInventory(save, { ...ORE_SIGIL_ITEM }, 1);
    sigilDrop = true;
  }

  setSave(save);
  window.dispatchEvent(new Event("ds:save"));
  renderMiningHeader();
  renderMiningBonusBox(save);

  if (targetRemaining > 0){
    targetRemaining -= 1;
    updateTargetUI();
    if (targetRemaining <= 0){
      setMsg(`Target completed! ${buildOreMessage(ore, xpGain, sigilDrop, true)}${petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : ""}${petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : ""}${doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""}`);
      stopMining(true);
      return;
    }
  }

  setMsg(buildOreMessage(ore, xpGain, sigilDrop, false) + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""));
  touchActionLock();
  scheduleNextMine(false);
}

// -------------------------
// Target Mining
// -------------------------
function startTargetMining(){
  const val = Number(targetInput?.value);
  if (!Number.isFinite(val) || val <= 0){
    alert("Enter a valid target amount (e.g. 100).");
    return;
  }
  targetRemaining = Math.floor(val);
  updateTargetUI();

  if (!miningActive) startMining();
  else setMsg(`Target set: ${targetRemaining}`);
}

// -------------------------
// Boot
// -------------------------
function initMiningActionRoute(oreId){
  currentOreId = oreId || getOreFromUrl();
  const ore = getOreDef(oreId);

  if (oreImg) oreImg.src = ore.img;
  if (oreName) oreName.textContent = ore.name;

  const save = ensureMining(loadSave());
  renderMiningHeader();
  renderMiningBonusBox(save);
  stopCooldownUI();

  backBtn?.addEventListener("click", () => {
    stopMining(true);
    if (window.DSUI?.navigateWithinShell?.("mining.html")) return;
    window.location.href = "mining.html";
  });

  startBtn?.addEventListener("click", startMining);
  stopBtn?.addEventListener("click", () => stopMining(false));

  targetBtn?.addEventListener("click", startTargetMining);

  if (stopBtn) stopBtn.disabled = true;
}

function mountMiningAction(root = null, targetHref = "mining_action.html"){
  const left = root || document.getElementById("leftPanel");
  if (!left) return false;
  stopMining(true);
  left.innerHTML = MINING_ACTION_TEMPLATE;
  document.title = "Darkstone Chronicles - Mining Action";
  bindDom();
  const parsed = (() => {
    try { return new URL(targetHref, window.location.href); }
    catch { return null; }
  })();
  const oreId = parsed?.searchParams.get("ore") || "copper_ore";
  initMiningActionRoute(oreId);
  return true;
}

function initStandaloneMiningAction(){
  if (!document.getElementById("backBtn")) return false;
  document.title = "Darkstone Chronicles - Mining Action";
  bindDom();
  initMiningActionRoute(getOreFromUrl());
  return true;
}

window.DSMiningAction = { mount: mountMiningAction };

window.addEventListener("DOMContentLoaded", () => {
  initStandaloneMiningAction();
});

window.addEventListener("ds:save", () => {
  const save = ensureMining(loadSave());
  renderMiningHeader();
  renderMiningBonusBox(save);
});

})();
