(() => {
const SAVE_KEY = "darkstone_save_v1";
const WOOD_SIGIL_ITEM = {
  type: "material",
  name: "Wood Sigil",
  img: "images/items/sigils/wood_sigil.png"
};
const WOOD_SAWMILL_TEMPLATE = `
  <div class="profXpShell">
    <div class="profXpCard">
      <div class="profXpHead">
        <span aria-hidden="true">&#129717;</span>
        <span>Carpentry Lvl: <span id="woodLevel">1</span></span>
      </div>
      <div style="width:100%;">
        <div class="profXpTrack">
          <div id="woodXPBar" style="height:100%;width:0%;background:#ffd27d;"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="woodXPCurrent">0</span>/<span id="woodXPNext">100</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="profXpShell">
    <div id="artisanBonusBox" class="profBonusCard" style="padding:12px;width:100%;min-height:56px;display:flex;align-items:flex-start;gap:10px;">
      <div style="font-weight:800;font-size:14px;white-space:nowrap;line-height:1.05;text-align:center;">Bonus<br>XP</div>
      <div style="width:1px;align-self:stretch;background:#333;"></div>
      <div id="artisanBonusContent" style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;gap:2px;padding-top:2px;">
        <div id="artisanBonusTop" style="display:grid;grid-template-columns:0.8fr 1px 1.5fr 1px 1fr 1px 1fr;gap:8px;font-size:11px;font-weight:700;opacity:.9;text-align:center;align-items:center;">
          <div>Pet</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div style="font-size:10px;line-height:1;white-space:nowrap;align-self:center;">Double Craft</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div>Building</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div>Potion</div>
        </div>
        <div style="height:1px;background:#333;width:100%;"></div>
        <div id="artisanBonusBottom" style="display:grid;grid-template-columns:0.8fr 1px 1.5fr 1px 1fr 1px 1fr;gap:8px;min-height:14px;align-items:stretch;text-align:center;font-size:11px;font-weight:700;color:#cfe7ff;">
          <div id="artisanBonusPetValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="artisanBonusDoubleValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="artisanBonusBuildingValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="artisanBonusPotionValue">+0%</div>
        </div>
      </div>
    </div>
  </div>

  <div class="profActionRow">
    <button id="backBtn">Back</button>
    <button id="startBtn">Start</button>
    <button id="stopBtn" disabled>Stop</button>
  </div>

  <div class="profActionCard">
    <div style="display:flex;gap:12px;align-items:center;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:74px;">
        <div id="plankName" style="font-weight:800;font-size:18px;text-align:center;">-</div>
        <img id="plankImg" src="" alt="Plank" class="profChoiceThumb" style="width:74px;height:74px;border-radius:12px;object-fit:cover;">
      </div>
      <div style="flex:1;">
        <div id="timerWrap" style="margin-top:10px;display:none;">
          <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
            <span>Crafting...</span>
            <span id="timerText">6.0s</span>
          </div>
          <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
            <div id="timerBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
          </div>
        </div>

        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <div style="opacity:.85;font-size:12px;">Target amount:</div>
          <input id="targetInput" type="number" min="1" step="1" placeholder="e.g. 100" class="profTargetInput">
          <button id="targetBtn">Craft Target</button>
          <div id="targetStatus" style="opacity:.85;font-size:12px;"></div>
        </div>
      </div>
    </div>

    <div id="msg" style="margin-top:12px;opacity:.9;"></div>
  </div>
`;

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
  if (!Number.isFinite(Number(save.inventoryMaxSlots))) save.inventoryMaxSlots = 1000;
  save.carpentryLevel = Math.max(1, num(save.carpentryLevel, 1));
  save.carpentryXP = Math.max(0, num(save.carpentryXP, 0));
  save.carpentryXPNext = xpNextForLevel(save.carpentryLevel);
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

const RECIPES = [
  { id:"ash_plank",       name:"Ash Plank",       req: 1,  logName:"Ash Log",       img:"images/wood/planks/ash_plank.png" },
  { id:"pine_plank",      name:"Pine Plank",      req:10,  logName:"Pine Log",      img:"images/wood/planks/pine_plank.png" },
  { id:"birch_plank",     name:"Birch Plank",     req:20,  logName:"Birch Log",     img:"images/wood/planks/birch_plank.png" },
  { id:"oak_plank",       name:"Oak Plank",       req:30,  logName:"Oak Log",       img:"images/wood/planks/oak_plank.png" },
  { id:"cedar_plank",     name:"Cedar Plank",     req:40,  logName:"Cedar Log",     img:"images/wood/planks/cedar_plank.png" },
  { id:"maple_plank",     name:"Maple Plank",     req:50,  logName:"Maple Log",     img:"images/wood/planks/maple_plank.png" },
  { id:"ironwood_plank",  name:"Ironwood Plank",  req:60,  logName:"Ironwood Log",  img:"images/wood/planks/ironwood_plank.png" },
  { id:"heartwood_plank", name:"Heartwood Plank", req:70,  logName:"Heartwood Log", img:"images/wood/planks/heartwood_plank.png" },
  { id:"darkwood_plank",  name:"Darkwood Plank",  req:80,  logName:"Darkwood Log",  img:"images/wood/planks/darkwood_plank.png" },
  { id:"ebony_plank",     name:"Ebony Plank",     req:90,  logName:"Ebony Log",     img:"images/wood/planks/ebony_plank.png" }
];
function getRecipeFromTarget(targetHref = window.location.href){
  try {
    const url = new URL(targetHref, window.location.href);
    return url.searchParams.get("recipe") || "ash_plank";
  } catch {
    return "ash_plank";
  }
}
function getRecipeDef(id){
  return RECIPES.find(r => r.id === id) || RECIPES[0];
}
function incStat(save, key, amount = 1){
  if (!save || typeof save !== "object") return;
  if (!save.stats || typeof save.stats !== "object") save.stats = {};
  if (!save.stats.total || typeof save.stats.total !== "object") save.stats.total = {};
  const add = Number.isFinite(Number(amount)) ? Number(amount) : 1;
  const cur = Number.isFinite(Number(save.stats.total[key])) ? Number(save.stats.total[key]) : 0;
  save.stats.total[key] = cur + add;
}
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
function itemStackKey(it){
  return [
    it.type || "",
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
  if (window.DSInventory?.addItem) {
    return window.DSInventory.addItem(save, item, qty, { stack: true, stackKeyFn: itemStackKey });
  }
  const key = itemStackKey(item);
  const ex = save.inventory.find(i => i && itemStackKey(i) === key);
  if (ex) ex.quantity = (Number(ex.quantity) || 1) + qty;
  else save.inventory.push({ ...item, quantity: qty });
  return { ok: true, added: qty };
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

let backBtn = null;
let startBtn = null;
let stopBtn = null;
let plankImg = null;
let plankName = null;
let plankReq = null;
let timerWrap = null;
let timerText = null;
let timerBar = null;
let msgEl = null;
let targetInput = null;
let targetBtn = null;
let targetStatus = null;
let lvlEl = null;
let curEl = null;
let nextEl = null;
let barEl = null;
let artisanBonusPetValue = null;
let artisanBonusDoubleValue = null;
let artisanBonusBuildingValue = null;
let artisanBonusPotionValue = null;
let currentRecipeId = "ash_plank";

function bindDom(){
  backBtn = document.getElementById("backBtn");
  startBtn = document.getElementById("startBtn");
  stopBtn = document.getElementById("stopBtn");
  plankImg = document.getElementById("plankImg");
  plankName = document.getElementById("plankName");
  plankReq = document.getElementById("plankReq");
  timerWrap = document.getElementById("timerWrap");
  timerText = document.getElementById("timerText");
  timerBar = document.getElementById("timerBar");
  msgEl = document.getElementById("msg");
  targetInput = document.getElementById("targetInput");
  targetBtn = document.getElementById("targetBtn");
  targetStatus = document.getElementById("targetStatus");
  lvlEl = document.getElementById("woodLevel");
  curEl = document.getElementById("woodXPCurrent");
  nextEl = document.getElementById("woodXPNext");
  barEl = document.getElementById("woodXPBar");
  artisanBonusPetValue = document.getElementById("artisanBonusPetValue");
  artisanBonusDoubleValue = document.getElementById("artisanBonusDoubleValue");
  artisanBonusBuildingValue = document.getElementById("artisanBonusBuildingValue");
  artisanBonusPotionValue = document.getElementById("artisanBonusPotionValue");
}

window.addEventListener("ds:pause", () => stopCraft(true));
function setMsg(t){ if (msgEl) msgEl.innerHTML = t || ""; }
function buildWoodCraftMessage(recipe, xpGain, sigilDrop, isLast = false){
  const lastText = isLast ? " (last)" : "";
  return `Crafted 1 <img src="${recipe.img}" alt="${recipe.name}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${recipe.name}${lastText} (+${xpGain} XP)${sigilDrop ? " | Wood Sigil +1" : ""}`;
}
function renderHeader(){
  const s = ensureWood(loadSave());
  if (lvlEl) lvlEl.textContent = String(s.carpentryLevel);
  if (curEl) curEl.textContent = String(s.carpentryXP);
  if (nextEl) nextEl.textContent = String(s.carpentryXPNext);
  const pct = s.carpentryXPNext > 0 ? clamp((s.carpentryXP / s.carpentryXPNext) * 100, 0, 100) : 0;
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
  const petBonus = getArtisanPetState(save);
  if (artisanBonusPetValue) artisanBonusPetValue.textContent = formatPct(num(petBonus.xpPct, 0));
  if (artisanBonusDoubleValue) artisanBonusDoubleValue.textContent = formatPct(num(petBonus.doublePct, 0));
  if (artisanBonusBuildingValue) artisanBonusBuildingValue.textContent = formatPct(0);
  if (artisanBonusPotionValue) artisanBonusPotionValue.textContent = formatPct(0);
}

const CD_MS = 6000;
const ACTION_ID = "wood_sawmill";
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
function startCraft(){
  if (window.DS?.isPaused) return;
  if (active) return;
  const lock = acquireActionLock();
  if (!lock.ok){ setMsg(lock.msg); return; }
  active = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;
  setMsg("Crafting started.");
  scheduleNext(true);
}
function stopCraft(silent=false){
  active = false;
  if (timer){ clearTimeout(timer); timer = null; }
  stopCooldownUI();
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  targetRemaining = 0;
  updateTargetUI();
  if (!silent) setMsg("Crafting stopped.");
}
function scheduleNext(runImmediately=false){
  if (!active || window.DS?.isPaused) return;
  if (runImmediately){
    craftTick();
    return;
  }
  const waitMs = getActionWaitMs();
  startCooldownUI(waitMs);
  timer = setTimeout(() => craftTick(), waitMs);
}
function canCraft(save, r){
  const effectiveLevel = save.carpentryLevel + getArtisanPotionBonus(save);
  if (effectiveLevel < r.req) return { ok:false, why:`Requires Carpentry Level ${r.req}.` };
  const have = getQtyByName(save.inventory, r.logName);
  if (have < 5) return { ok:false, why:`Need ${r.logName} x5.` };
  if (!hasSpaceFor(save, 1)) return { ok:false, why:"No more inventory space." };
  return { ok:true, why:"" };
}
function craftTick(){
  if (!active || window.DS?.isPaused) return;
  const r = getRecipeDef(currentRecipeId || "ash_plank");
  const save = ensureWood(loadSave());
  const petBonus = getArtisanPetState(save);
  const check = canCraft(save, r);
  if (!check.ok){
    setMsg(check.why);
    stopCraft(true);
    return;
  }
  const ok = removeByName(save, r.logName, 5);
  if (!ok){
    setMsg(`Missing ${r.logName}.`);
    stopCraft(true);
    setSave(save);
    return;
  }
  addToInventoryStack(save, { type:"material", name:r.name, img:r.img }, 1);
  const doubled = Math.random() < petBonus.doublePct;
  if (doubled) addToInventoryStack(save, { type:"material", name:r.name, img:r.img }, 1);
  let sigilDrop = false;
  if (Math.random() < (1 / 250)) {
    addToInventoryStack(save, { ...WOOD_SIGIL_ITEM }, 1);
    sigilDrop = true;
  }
  incStat(save, "planksCrafted", 1);
  tickArtisanPotionActions(save, 1);
  const targetXp = gatherXpForReq(r.req) * 4;
  const mult = 1 + (Number(r.req || 1) / 20);
  const baseXP = Math.max(1, Math.round(targetXp / mult));
  const totalXpGain = Math.max(1, Math.round(Number(baseXP || 0) * (1 + (Number(r.req || 1) / 20)) * (1 + petBonus.xpPct)));
  const petSplit = window.DS?.pets?.splitXpWithPet
    ? window.DS.pets.splitXpWithPet(save, "artisan", totalXpGain)
    : { playerXpGain: totalXpGain, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
  const xpGain = petSplit.playerXpGain;
  save.carpentryXP += xpGain;
  while (save.carpentryXP >= save.carpentryXPNext){
    save.carpentryXP -= save.carpentryXPNext;
    save.carpentryLevel += 1;
    save.carpentryXPNext = xpNextForLevel(save.carpentryLevel);
    window.DS?.announcements?.professionLevel?.(save, "Carpentry", save.carpentryLevel);
  }
  setSave(save);
  window.dispatchEvent(new Event("ds:save"));
  renderHeader();
  renderBonusBox(save);
  if (targetRemaining > 0){
    targetRemaining -= 1;
    updateTargetUI();
    if (targetRemaining <= 0){
      setMsg(`Target completed! ${buildWoodCraftMessage(r, xpGain, sigilDrop, true)}${petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : ""}${petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : ""}${doubled ? ` <span style="color:#9ff0b7;">Double Craft!</span>` : ""}`);
      stopCraft(true);
      return;
    }
  }
  setMsg(buildWoodCraftMessage(r, xpGain, sigilDrop, false) + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Craft!</span>` : ""));
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
  if (!active) startCraft();
  else setMsg(`Target set: ${targetRemaining}`);
}
function initWoodSawmillRoute(targetHref = window.location.href){
  currentRecipeId = getRecipeFromTarget(targetHref);
  const r = getRecipeDef(currentRecipeId);
  if (plankImg) plankImg.src = r.img;
  if (plankName) plankName.textContent = r.name;
  if (plankReq) plankReq.textContent = "";
  const save = ensureWood(loadSave());
  renderHeader();
  renderBonusBox(save);
  stopCooldownUI();
  backBtn?.addEventListener("click", () => {
    stopCraft(true);
    if (window.DSUI?.navigateWithinShell?.("carpentry.html")) return;
    window.location.href = "carpentry.html";
  });
  startBtn?.addEventListener("click", startCraft);
  stopBtn?.addEventListener("click", () => stopCraft(false));
  targetBtn?.addEventListener("click", startTarget);
  if (stopBtn) stopBtn.disabled = true;
}
function mountWoodSawmillAction(root = null, targetHref = "wood_sawmill_action.html"){
  const left = root || document.getElementById("leftPanel");
  if (!left) return false;
  stopCraft(true);
  left.innerHTML = WOOD_SAWMILL_TEMPLATE;
  document.title = "Darkstone Chronicles - Carpentry";
  bindDom();
  initWoodSawmillRoute(targetHref);
  return true;
}
function initStandaloneWoodSawmill(){
  if (!document.getElementById("backBtn")) return false;
  document.title = "Darkstone Chronicles - Carpentry";
  bindDom();
  initWoodSawmillRoute(window.location.href);
  return true;
}

window.DSWoodSawmillAction = { mount: mountWoodSawmillAction };
window.addEventListener("DOMContentLoaded", () => {
  initStandaloneWoodSawmill();
});
window.addEventListener("ds:save", () => {
  const save = ensureWood(loadSave());
  renderHeader();
  renderBonusBox(save);
});
})();
