(() => {
const SAVE_KEY = "darkstone_save_v1";
const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const ALCHEMY_ACTION_TEMPLATE = `
  <div class="profXpShell">
    <div class="profXpCard">
      <div class="profXpHead">
        <span aria-hidden="true">&#9879;&#65039;</span>
        <span>Alchemy Lvl: <span id="alchemyLevel">1</span></span>
      </div>
      <div style="width:100%;">
        <div class="profXpTrack">
          <div id="alchemyXPBar" style="height:100%;width:0%;background:linear-gradient(90deg,#b84a4a,#e06a6a);"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="alchemyXPCurrent">0</span>/<span id="alchemyXPNext">100</span></div>
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
        <div style="font-weight:800;font-size:14px;line-height:1.05;text-align:center;" id="potionName">Potion</div>
        <img id="potionImg" src="" alt="Potion" class="profChoiceThumb" style="width:74px;height:74px;border-radius:12px;object-fit:cover;">
      </div>
      <div style="flex:1;">
        <div id="timerWrap" style="margin-top:10px;display:none;">
          <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
            <span>Brewing...</span>
            <span id="timerText">6.0s</span>
          </div>
          <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
            <div id="timerBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
          </div>
        </div>

        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <div style="opacity:.85;font-size:12px;">Target amount:</div>
          <input id="targetInput" type="number" min="1" step="1" placeholder="e.g. 100" class="profTargetInput">
          <button id="targetBtn">Brew Target</button>
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
function ensureAlchemy(save){
  save = save && typeof save === "object" ? save : {};
  if (!Array.isArray(save.inventory)) save.inventory = [];
  if (!Number.isFinite(Number(save.alchemyLevel))) save.alchemyLevel = 1;
  if (!Number.isFinite(Number(save.alchemyXP))) save.alchemyXP = 0;
  save.alchemyXPNext = xpNextForLevel(save.alchemyLevel);
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

const ROMAN = ["I","II","III","IV","V","VI","VII"];
const HERBS = [
  { tier:1, req:1, herbName:"Greenleaf" },
  { tier:2, req:15, herbName:"Sungrass" },
  { tier:3, req:30, herbName:"Ironroot" },
  { tier:4, req:45, herbName:"Frost Bloom" },
  { tier:5, req:60, herbName:"Shadow Mint" },
  { tier:6, req:75, herbName:"Goldthorn" },
  { tier:7, req:90, herbName:"Ember Lotus" }
];
const POTION_TYPES = [
  { id:"strength", label:"Strength Potion" },
  { id:"defense", label:"Defense Potion" },
  { id:"gathering_insight", label:"Gathering Insight" },
  { id:"artisan_insight", label:"Artisan Insight" },
  { id:"luck", label:"Luck Potion" }
];

function gatherXpForReq(req){
  const lvl = Math.max(1, Number(req) || 1);
  return 10 + Math.floor(lvl / 10) * 20;
}
function usedUnits(inv){
  let units = 0;
  for (const it of inv) {
    if (!it) continue;
    const q = Number(it.quantity ?? it.qty);
    units += Number.isFinite(q) ? Math.max(1, q) : 1;
  }
  return units;
}
function hasSpaceFor(save, addUnits){
  return usedUnits(save.inventory) + addUnits <= Number(save.inventoryMaxSlots || 1000);
}
function itemStackKey(it){
  return [it.type || "", it.name || "", it.img || "", it.rarity || ""].join("::");
}
function addToInventoryStack(save, item, qty){
  if (window.DSInventory?.addItem) {
    return window.DSInventory.addItem(save, item, qty, { stack: true, stackKeyFn: itemStackKey });
  }
  const key = itemStackKey(item);
  const ex = save.inventory.find((i) => i && itemStackKey(i) === key);
  if (ex) ex.quantity = (Number(ex.quantity) || 1) + qty;
  else save.inventory.push({ ...item, quantity: qty });
  return { ok: true, added: qty };
}
function findStackByName(inv, name){
  return inv.findIndex((it) => it && (it.name || "").toLowerCase() === name.toLowerCase());
}
function getQtyByName(inv, name){
  const idx = findStackByName(inv, name);
  if (idx < 0) return 0;
  const q = Number(inv[idx].quantity ?? inv[idx].qty);
  return Number.isFinite(q) ? Math.max(1, q) : 1;
}
function removeByName(save, name, qtyNeeded){
  const idx = findStackByName(save.inventory, name);
  if (idx < 0) return false;
  const it = save.inventory[idx];
  const have = Math.max(1, Number(it.quantity ?? it.qty) || 1);
  if (have < qtyNeeded) return false;
  if (have === qtyNeeded) save.inventory.splice(idx, 1);
  else it.quantity = have - qtyNeeded;
  return true;
}
function incStat(save, key, amount = 1){
  if (!save || typeof save !== "object") return;
  if (!save.stats || typeof save.stats !== "object") save.stats = {};
  if (!save.stats.total || typeof save.stats.total !== "object") save.stats.total = {};
  const add = Number.isFinite(Number(amount)) ? Number(amount) : 1;
  const cur = Number.isFinite(Number(save.stats.total[key])) ? Number(save.stats.total[key]) : 0;
  save.stats.total[key] = cur + add;
}

function buildRecipes(){
  return HERBS.flatMap((herb) =>
    POTION_TYPES.map((potion) => ({
      id: `${potion.id}_${herb.tier}`,
      name: `${potion.label} ${ROMAN[herb.tier - 1]}`,
      req: herb.req,
      herbName: herb.herbName,
      img: `images/alchemy/potions/${potion.id}_${herb.tier}.png`,
      input: [
        { name: herb.herbName, qty: 3 },
        { name: "Empty Vial", qty: 1 }
      ],
      output: {
        type: "consumable",
        subType: "potion",
        id: `${potion.id}_potion_${herb.tier}`,
        name: `${potion.label} ${ROMAN[herb.tier - 1]}`,
        img: `images/alchemy/potions/${potion.id}_${herb.tier}.png`,
        rarity: "uncommon"
      },
      baseXP: gatherXpForReq(herb.req) * 4,
      tier: herb.tier
    }))
  );
}

const RECIPES = buildRecipes();
function getRecipeFromTarget(targetHref = window.location.href){
  try {
    const url = new URL(targetHref, window.location.href);
    return url.searchParams.get("recipe") || "strength_1";
  } catch {
    return "strength_1";
  }
}
function getRecipeDef(id){
  return RECIPES.find((r) => r.id === id) || RECIPES[0];
}

let backBtn = null;
let startBtn = null;
let stopBtn = null;
let potionImg = null;
let potionName = null;
let potionReq = null;
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
let xpBarEl = null;
let artisanBonusPetValue = null;
let artisanBonusDoubleValue = null;
let artisanBonusBuildingValue = null;
let artisanBonusPotionValue = null;
let currentRecipeId = "strength_1";

function bindDom(){
  backBtn = document.getElementById("backBtn");
  startBtn = document.getElementById("startBtn");
  stopBtn = document.getElementById("stopBtn");
  potionImg = document.getElementById("potionImg");
  potionName = document.getElementById("potionName");
  potionReq = document.getElementById("potionReq");
  timerWrap = document.getElementById("timerWrap");
  timerText = document.getElementById("timerText");
  timerBar = document.getElementById("timerBar");
  msgEl = document.getElementById("msg");
  targetInput = document.getElementById("targetInput");
  targetBtn = document.getElementById("targetBtn");
  targetStatus = document.getElementById("targetStatus");
  lvlEl = document.getElementById("alchemyLevel");
  curEl = document.getElementById("alchemyXPCurrent");
  nextEl = document.getElementById("alchemyXPNext");
  xpBarEl = document.getElementById("alchemyXPBar");
  artisanBonusPetValue = document.getElementById("artisanBonusPetValue");
  artisanBonusDoubleValue = document.getElementById("artisanBonusDoubleValue");
  artisanBonusBuildingValue = document.getElementById("artisanBonusBuildingValue");
  artisanBonusPotionValue = document.getElementById("artisanBonusPotionValue");
}

window.addEventListener("ds:pause", () => stopAlchemyAction(true));

function renderAlchemyHeader(){
  const save = ensureAlchemy(loadSave());
  if (lvlEl) lvlEl.textContent = String(save.alchemyLevel);
  if (curEl) curEl.textContent = String(save.alchemyXP);
  if (nextEl) nextEl.textContent = String(save.alchemyXPNext);

  const pct = save.alchemyXPNext > 0 ? Math.max(0, Math.min(100, (save.alchemyXP / save.alchemyXPNext) * 100)) : 0;
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
  if (artisanBonusPetValue) artisanBonusPetValue.textContent = formatPct(num(petBonus.xpPct, 0));
  if (artisanBonusDoubleValue) artisanBonusDoubleValue.textContent = formatPct(num(petBonus.doublePct, 0));
  if (artisanBonusBuildingValue) artisanBonusBuildingValue.textContent = formatPct(0);
  if (artisanBonusPotionValue) artisanBonusPotionValue.textContent = formatPct(0);
}

const CD_MS = 6000;
const ACTION_ID = "alchemy";
const ACTION_LOCK_KEY = "ds_action_lock_v1";
let actionActive = false;
let actionTimer = null;
let cdAnim = null;
let cdStart = 0;
let targetRemaining = 0;

function loadActionLock(){
  try { return JSON.parse(localStorage.getItem(ACTION_LOCK_KEY) || "null"); }
  catch { return null; }
}
function saveActionLock(lock){
  localStorage.setItem(ACTION_LOCK_KEY, JSON.stringify(lock || null));
}
function isLockExpired(lock, now){
  if (!lock || !lock.active) return true;
  return (now - Number(lock.lastPing || 0)) > CD_MS * 2;
}
function acquireActionLock(){
  const now = Date.now();
  const lock = loadActionLock();
  if (lock && !isLockExpired(lock, now)) {
    if (lock.actionId && lock.actionId !== ACTION_ID) return { ok:false, msg:"You are tired. Another action is running." };
    if (now < Number(lock.nextAllowedTs || 0)) {
      const wait = Math.max(0, Number(lock.nextAllowedTs) - now);
      return { ok:false, msg:`You are tired. Wait ${(wait / 1000).toFixed(1)}s.` };
    }
  }
  saveActionLock({ actionId: ACTION_ID, active: true, nextAllowedTs: now + CD_MS, lastPing: now });
  return { ok:true };
}
function getActionWaitMs(){
  const now = Date.now();
  const lock = loadActionLock();
  if (lock && lock.actionId === ACTION_ID && Number.isFinite(Number(lock.nextAllowedTs))) {
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

function setMsg(text){
  if (msgEl) msgEl.innerHTML = text || "";
}
function buildPotionMessage(recipe, xpGain, isLast = false){
  const lastText = isLast ? " (last)" : "";
  return `You brewed 1 <img src="${recipe.img}" alt="${recipe.name}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${recipe.name}${lastText} (+${xpGain} XP)`;
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
function stopCooldownUI(){
  if (cdAnim) cancelAnimationFrame(cdAnim);
  cdAnim = null;
  if (timerWrap) timerWrap.style.display = "none";
  if (timerBar) timerBar.style.width = "0%";
  if (timerText) timerText.textContent = (CD_MS / 1000).toFixed(1) + "s";
}
function startCooldownUI(remainingMs = CD_MS){
  if (!timerWrap || !timerBar || !timerText) return;
  timerWrap.style.display = "";
  const rem = Math.max(0, Math.min(CD_MS, remainingMs));
  cdStart = performance.now() - (CD_MS - rem);
  const tick = (now) => {
    if (!actionActive || window.DS?.isPaused) {
      cdAnim = null;
      return;
    }
    const elapsed = now - cdStart;
    const t = Math.min(1, elapsed / CD_MS);
    timerBar.style.width = (t * 100).toFixed(1) + "%";
    timerText.textContent = Math.max(0, (CD_MS - elapsed) / 1000).toFixed(1) + "s";
    if (t < 1) cdAnim = requestAnimationFrame(tick);
    else cdAnim = null;
  };
  if (cdAnim) cancelAnimationFrame(cdAnim);
  cdAnim = requestAnimationFrame(tick);
}
function updateTargetUI(){
  if (!targetStatus) return;
  targetStatus.textContent = targetRemaining > 0 ? `Remaining: ${targetRemaining}` : "";
}
function gainAlchemyXP(save, baseXP, artisanXpPct = 0){
  const gained = Math.max(1, Math.round(Number(baseXP || 0) * (1 + artisanXpPct)));
  save.alchemyXP += gained;
  while (save.alchemyXP >= save.alchemyXPNext) {
    save.alchemyXP -= save.alchemyXPNext;
    save.alchemyLevel += 1;
    save.alchemyXPNext = xpNextForLevel(save.alchemyLevel);
  }
  return gained;
}

function startAlchemyAction(){
  if (window.DS?.isPaused || actionActive) return;
  const lock = acquireActionLock();
  if (!lock.ok) {
    setMsg(lock.msg);
    return;
  }
  actionActive = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;
  setMsg("Brewing started.");
  scheduleNextAction(true);
}
function stopAlchemyAction(silent = false){
  actionActive = false;
  if (actionTimer) {
    clearTimeout(actionTimer);
    actionTimer = null;
  }
  stopCooldownUI();
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  targetRemaining = 0;
  updateTargetUI();
  if (!silent) setMsg("Brewing stopped.");
}
function scheduleNextAction(runImmediately = false){
  if (!actionActive || window.DS?.isPaused) return;
  if (runImmediately) {
    actionTick();
    return;
  }
  const waitMs = getActionWaitMs();
  startCooldownUI(waitMs);
  actionTimer = setTimeout(() => actionTick(), waitMs);
}
function actionTick(){
  if (!actionActive || window.DS?.isPaused) return;
  const recipe = getRecipeDef(currentRecipeId || getRecipeFromTarget());
  const save = ensureAlchemy(loadSave());
  const petBonus = getArtisanPetState(save);

  const effectiveLevel = save.alchemyLevel + getArtisanPotionBonus(save);
  if (effectiveLevel < recipe.req) {
    setMsg(`Requires Alchemy Level ${recipe.req}.`);
    stopAlchemyAction(true);
    return;
  }
  if (!hasSpaceFor(save, 1)) {
    setMsg("Inventory is full.");
    stopAlchemyAction(true);
    return;
  }
  for (const input of recipe.input) {
    if (getQtyByName(save.inventory, input.name) < input.qty) {
      setMsg(`Missing ${input.qty} ${input.name}.`);
      stopAlchemyAction(true);
      return;
    }
  }
  for (const input of recipe.input) removeByName(save, input.name, input.qty);

  addToInventoryStack(save, recipe.output, 1);
  const doubled = Math.random() < petBonus.doublePct;
  if (doubled) addToInventoryStack(save, recipe.output, 1);
  incStat(save, "alchemyTicks", 1);
  tickArtisanPotionActions(save, 1);
  const totalXpGain = Math.max(1, Math.round(Number(recipe.baseXP || 0) * (1 + petBonus.xpPct)));
  const petSplit = window.DS?.pets?.splitXpWithPet
    ? window.DS.pets.splitXpWithPet(save, "artisan", totalXpGain)
    : { playerXpGain: totalXpGain, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
  const xpGain = petSplit.playerXpGain;
  save.alchemyXP += xpGain;
  while (save.alchemyXP >= save.alchemyXPNext) {
    save.alchemyXP -= save.alchemyXPNext;
    save.alchemyLevel += 1;
    save.alchemyXPNext = xpNextForLevel(save.alchemyLevel);
  }

  setSave(save);
  window.dispatchEvent(new Event("ds:save"));
  renderAlchemyHeader();
  renderBonusBox(save);

  if (targetRemaining > 0) {
    targetRemaining -= 1;
    updateTargetUI();
    if (targetRemaining <= 0) {
      setMsg(`Target completed! ${buildPotionMessage(recipe, xpGain, true)}${petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : ""}${petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : ""}${doubled ? ` <span style="color:#9ff0b7;">Double Craft!</span>` : ""}`);
      stopAlchemyAction(true);
      return;
    }
  }

  setMsg(buildPotionMessage(recipe, xpGain, false) + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Craft!</span>` : ""));
  touchActionLock();
  scheduleNextAction(false);
}
function startTargetAlchemyAction(){
  const val = Number(targetInput?.value);
  if (!Number.isFinite(val) || val <= 0) {
    alert("Enter a valid target amount (e.g. 100).");
    return;
  }
  targetRemaining = Math.floor(val);
  updateTargetUI();
  if (!actionActive) startAlchemyAction();
  else setMsg(`Target set: ${targetRemaining}`);
}

function initAlchemyActionRoute(targetHref = window.location.href){
  currentRecipeId = getRecipeFromTarget(targetHref);
  const recipe = getRecipeDef(currentRecipeId);
  if (potionImg) potionImg.src = recipe.img;
  if (potionName) potionName.textContent = recipe.name;
  const save = ensureAlchemy(loadSave());
  if (potionReq) potionReq.textContent = `Req Lv ${recipe.req} | Needs 3 ${recipe.herbName} + 1 Empty Vial`;

  renderAlchemyHeader();
  renderBonusBox(save);
  stopCooldownUI();

  backBtn?.addEventListener("click", () => {
    stopAlchemyAction(true);
    const href = `alchemy_tier.html?tier=${recipe.tier}`;
    if (window.DSUI?.navigateWithinShell?.(href)) return;
    window.location.href = href;
  });
  startBtn?.addEventListener("click", startAlchemyAction);
  stopBtn?.addEventListener("click", () => stopAlchemyAction(false));
  targetBtn?.addEventListener("click", startTargetAlchemyAction);
  if (stopBtn) stopBtn.disabled = true;
}

function mountAlchemyAction(root = null, targetHref = "alchemy_action.html"){
  const left = root || document.getElementById("leftPanel");
  if (!left) return false;
  stopAlchemyAction(true);
  left.innerHTML = ALCHEMY_ACTION_TEMPLATE;
  document.title = "Darkstone Chronicles - Alchemy Action";
  bindDom();
  initAlchemyActionRoute(targetHref);
  return true;
}

function initStandaloneAlchemyAction(){
  if (!document.getElementById("backBtn")) return false;
  document.title = "Darkstone Chronicles - Alchemy Action";
  bindDom();
  initAlchemyActionRoute(window.location.href);
  return true;
}

window.DSAlchemyAction = { mount: mountAlchemyAction };

window.addEventListener("DOMContentLoaded", () => {
  initStandaloneAlchemyAction();
});

window.addEventListener("ds:save", () => {
  const save = ensureAlchemy(loadSave());
  renderAlchemyHeader();
  renderBonusBox(save);
});
})();
