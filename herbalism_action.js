(() => {

const SAVE_KEY = "darkstone_save_v1";
const HERBALISM_ACTION_TEMPLATE = `
  <div style="max-width:340px;margin:0 auto 12px;">
    <div style="background:#151520;border:2px solid #333;border-radius:12px;padding:10px 12px;width:100%;">
      <div style="font-weight:900;font-size:18px;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;text-align:center;">
        <span aria-hidden="true">&#127807;</span>
        <span>Herbalism Lvl: <span id="herbLevel">1</span></span>
      </div>
      <div style="width:100%;">
        <div style="height:12px;background:#0f0f16;border:1px solid #2a2a3a;border-radius:999px;overflow:hidden;position:relative;">
          <div id="herbXPBar" style="height:100%;width:0%;background:linear-gradient(90deg,#b84a4a,#e06a6a);"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="herbXPCurrent">0</span>/<span id="herbXPNext">100</span></div>
        </div>
      </div>
    </div>
  </div>

  <div style="max-width:340px;margin:0 auto 12px;">
    <div id="gatheringBonusBox" style="background:#151520;border:2px solid #333;border-radius:12px;padding:12px;width:100%;min-height:56px;display:flex;align-items:flex-start;gap:10px;">
      <div style="font-weight:800;font-size:14px;white-space:nowrap;line-height:1.05;text-align:center;">Bonus<br>XP</div>
      <div style="width:1px;align-self:stretch;background:#333;"></div>
      <div id="gatheringBonusContent" style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;gap:2px;padding-top:2px;">
        <div id="gatheringBonusTop" style="display:grid;grid-template-columns:0.8fr 1px 1.5fr 1px 1fr 1px 1fr;gap:8px;font-size:11px;font-weight:700;opacity:.9;text-align:center;align-items:center;">
          <div>Pet</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div style="font-size:10px;line-height:1;white-space:nowrap;align-self:center;">Double Gather</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div>Building</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div>Potion</div>
        </div>
        <div style="height:1px;background:#333;width:100%;"></div>
        <div id="gatheringBonusBottom" style="display:grid;grid-template-columns:0.8fr 1px 1.5fr 1px 1fr 1px 1fr;gap:8px;min-height:14px;align-items:stretch;text-align:center;font-size:11px;font-weight:700;color:#cfe7ff;">
          <div id="gatheringBonusPetValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="gatheringBonusDoubleValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="gatheringBonusBuildingValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="gatheringBonusPotionValue">+0%</div>
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
        <div style="font-weight:800;font-size:18px;text-align:center;" id="zoneName">Zone</div>
        <img id="zoneImg" src="" alt="Zone" style="width:74px;height:74px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
      </div>
      <div style="flex:1;">
        <div id="timerWrap" style="margin-top:10px;display:none;">
          <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
            <span>Gathering...</span>
            <span id="timerText">6.0s</span>
          </div>
          <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
            <div id="timerBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
          </div>
        </div>

        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <div style="opacity:.85;font-size:12px;">Target amount:</div>
          <input id="targetInput" type="number" min="1" step="1" placeholder="e.g. 100" style="width:120px;padding:8px 10px;border-radius:10px;border:2px solid #333;background:#0f0f16;color:#fff;">
          <button id="targetBtn">Gather Target</button>
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
const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
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
function ensureHerbalism(save){
  save = save && typeof save === "object" ? save : {};
  if (!Number.isFinite(Number(save.herbalismLevel))) save.herbalismLevel = 1;
  if (!Number.isFinite(Number(save.herbalismXP))) save.herbalismXP = 0;
  save.herbalismXPNext = xpNextForLevel(save.herbalismLevel);
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

const HERB_ZONES = [
  { id:"verdant_hollow", name:"Verdant Hollow", req:1, herbId:"greenleaf", herbName:"Greenleaf", zoneImg:"images/herbalism/zones/verdant_hollow.png", herbImg:"images/herbalism/herbs/greenleaf.png" },
  { id:"sunspire_plains", name:"Sunspire Plains", req:15, herbId:"sungrass", herbName:"Sungrass", zoneImg:"images/herbalism/zones/sunspire_plains.png", herbImg:"images/herbalism/herbs/sungrass.png" },
  { id:"ironwood_depths", name:"Ironwood Depths", req:30, herbId:"ironroot", herbName:"Ironroot", zoneImg:"images/herbalism/zones/ironwood_depths.png", herbImg:"images/herbalism/herbs/ironroot.png" },
  { id:"frostpetal_vale", name:"Frostpetal Vale", req:45, herbId:"frost_bloom", herbName:"Frost Bloom", zoneImg:"images/herbalism/zones/frostpetal_vale.png", herbImg:"images/herbalism/herbs/frost_bloom.png" },
  { id:"duskmire_thicket", name:"Duskmire Thicket", req:60, herbId:"shadow_mint", herbName:"Shadow Mint", zoneImg:"images/herbalism/zones/duskmire_thicket.png", herbImg:"images/herbalism/herbs/shadow_mint.png" },
  { id:"aurathorn_expanse", name:"Aurathorn Expanse", req:75, herbId:"goldthorn", herbName:"Goldthorn", zoneImg:"images/herbalism/zones/aurathorn_expanse.png", herbImg:"images/herbalism/herbs/goldthorn.png" },
  { id:"emberfall_sanctuary", name:"Emberfall Sanctuary", req:90, herbId:"ember_lotus", herbName:"Ember Lotus", zoneImg:"images/herbalism/zones/emberfall_sanctuary.png", herbImg:"images/herbalism/herbs/ember_lotus.png" }
];

function getZoneFromUrl(){
  const p = new URLSearchParams(location.search);
  return p.get("zone") || "verdant_hollow";
}
function getZoneDef(id){
  return HERB_ZONES.find((zone) => zone.id === id) || HERB_ZONES[0];
}
function itemStackKey(it){
  return [it.type || "", it.name || "", it.img || ""].join("::");
}
function addToInventoryStack(save, item, qty){
  const key = itemStackKey(item);
  const ex = save.inventory.find((i) => i && itemStackKey(i) === key);
  if (ex) ex.quantity = (Number(ex.quantity) || 1) + qty;
  else save.inventory.push({ ...item, quantity: qty });
}
function incStat(save, key, amount = 1){
  if (!save || typeof save !== "object") return;
  if (!save.stats || typeof save.stats !== "object") save.stats = {};
  if (!save.stats.total || typeof save.stats.total !== "object") save.stats.total = {};
  const add = Number.isFinite(Number(amount)) ? Number(amount) : 1;
  const cur = Number.isFinite(Number(save.stats.total[key])) ? Number(save.stats.total[key]) : 0;
  save.stats.total[key] = cur + add;
}

let backBtn = null;
let startBtn = null;
let stopBtn = null;
let zoneImg = null;
let zoneName = null;
let herbName = null;
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
let gatheringBonusPetValue = null;
let gatheringBonusDoubleValue = null;
let gatheringBonusBuildingValue = null;
let gatheringBonusPotionValue = null;
let currentZoneId = "verdant_hollow";

function bindDom(){
  backBtn = document.getElementById("backBtn");
  startBtn = document.getElementById("startBtn");
  stopBtn = document.getElementById("stopBtn");
  zoneImg = document.getElementById("zoneImg");
  zoneName = document.getElementById("zoneName");
  herbName = document.getElementById("herbName");
  timerWrap = document.getElementById("timerWrap");
  timerText = document.getElementById("timerText");
  timerBar = document.getElementById("timerBar");
  msgEl = document.getElementById("msg");
  targetInput = document.getElementById("targetInput");
  targetBtn = document.getElementById("targetBtn");
  targetStatus = document.getElementById("targetStatus");
  lvlEl = document.getElementById("herbLevel");
  curEl = document.getElementById("herbXPCurrent");
  nextEl = document.getElementById("herbXPNext");
  barEl = document.getElementById("herbXPBar");
  gatheringBonusPetValue = document.getElementById("gatheringBonusPetValue");
  gatheringBonusDoubleValue = document.getElementById("gatheringBonusDoubleValue");
  gatheringBonusBuildingValue = document.getElementById("gatheringBonusBuildingValue");
  gatheringBonusPotionValue = document.getElementById("gatheringBonusPotionValue");
}

window.addEventListener("ds:pause", () => stopGathering(true));
window.addEventListener("ds:resume", () => {});

function renderHerbalismHeader(){
  const save = ensureHerbalism(loadSave());
  if (lvlEl) lvlEl.textContent = String(save.herbalismLevel);
  if (curEl) curEl.textContent = String(save.herbalismXP);
  if (nextEl) nextEl.textContent = String(save.herbalismXPNext);

  const pct = save.herbalismXPNext > 0 ? Math.max(0, Math.min(100, (save.herbalismXP / save.herbalismXPNext) * 100)) : 0;
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

const CD_MS = 6000;
let gatheringActive = false;
let gatherTimer = null;
let cdAnim = null;
let cdStart = 0;
let targetRemaining = 0;

const ACTION_ID = "herbalism";
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

function gatherXpForReq(req){
  const lvl = Math.max(1, Number(req) || 1);
  return 10 + Math.floor(lvl / 10) * 20;
}
function setMsg(text){
  if (msgEl) msgEl.innerHTML = text || "";
}
function buildHerbMessage(zone, herbXp, isLast = false){
  const lastText = isLast ? " (last)" : "";
  return `You obtained 1 <img src="${zone.herbImg}" alt="${zone.herbName}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${zone.herbName}${lastText} (+${herbXp} Herbalism XP)`;
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
    if (!gatheringActive || window.DS?.isPaused) {
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

function startGathering(){
  if (window.DS?.isPaused || gatheringActive) return;
  const lock = acquireActionLock();
  if (!lock.ok) {
    setMsg(lock.msg);
    return;
  }
  gatheringActive = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;
  setMsg("Gathering started.");
  scheduleNextGather(true);
}
function stopGathering(silent = false){
  gatheringActive = false;
  if (gatherTimer) {
    clearTimeout(gatherTimer);
    gatherTimer = null;
  }
  stopCooldownUI();
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  targetRemaining = 0;
  updateTargetUI();
  if (!silent) setMsg("Gathering stopped.");
}
function scheduleNextGather(runImmediately = false){
  if (!gatheringActive || window.DS?.isPaused) return;
  if (runImmediately) {
    gatherTick();
    return;
  }
  const waitMs = getActionWaitMs();
  startCooldownUI(waitMs);
  gatherTimer = setTimeout(() => gatherTick(), waitMs);
}
function gatherTick(){
  if (!gatheringActive || window.DS?.isPaused) return;
  const zone = getZoneDef(currentZoneId || getZoneFromUrl());
  const save = ensureHerbalism(loadSave());

  const effectiveLevel = save.herbalismLevel + getGatheringPotionBonus(save);
  if (effectiveLevel < zone.req) {
    setMsg(`Requires Herbalism Level ${zone.req}.`);
    stopGathering(true);
    return;
  }

  const petBonus = getGatheringPetState(save);
  addToInventoryStack(save, { type:"material", id:zone.herbId, name:zone.herbName, img:zone.herbImg }, 1);
  const doubled = Math.random() < petBonus.doublePct;
  if (doubled) addToInventoryStack(save, { type:"material", id:zone.herbId, name:zone.herbName, img:zone.herbImg }, 1);
  incStat(save, "herbalismTicks", 1);
  tickGatheringPotionActions(save, 1);

  const totalHerbXp = Math.max(1, Math.round(gatherXpForReq(zone.req) * (1 + petBonus.xpPct)));
  const petSplit = window.DS?.pets?.splitXpWithPet
    ? window.DS.pets.splitXpWithPet(save, "gathering", totalHerbXp)
    : { playerXpGain: totalHerbXp, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
  const herbXp = petSplit.playerXpGain;
  save.herbalismXP += herbXp;
  while (save.herbalismXP >= save.herbalismXPNext) {
    save.herbalismXP -= save.herbalismXPNext;
    save.herbalismLevel += 1;
    save.herbalismXPNext = xpNextForLevel(save.herbalismLevel);
  }

  setSave(save);
  window.dispatchEvent(new Event("ds:save"));
  renderHerbalismHeader();
  renderBonusBox(save);

  if (targetRemaining > 0) {
    targetRemaining -= 1;
    updateTargetUI();
    if (targetRemaining <= 0) {
      setMsg(`Target completed! ${buildHerbMessage(zone, herbXp, true)}${petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : ""}${petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : ""}${doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""}`);
      stopGathering(true);
      return;
    }
  }

  setMsg(buildHerbMessage(zone, herbXp, false) + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""));
  touchActionLock();
  scheduleNextGather(false);
}
function startTargetGathering(){
  const val = Number(targetInput?.value);
  if (!Number.isFinite(val) || val <= 0) {
    alert("Enter a valid target amount (e.g. 100).");
    return;
  }
  targetRemaining = Math.floor(val);
  updateTargetUI();
  if (!gatheringActive) startGathering();
  else setMsg(`Target set: ${targetRemaining}`);
}

function initHerbalismActionRoute(zoneId){
  currentZoneId = zoneId || getZoneFromUrl();
  const zone = getZoneDef(currentZoneId);
  if (zoneImg) zoneImg.src = zone.zoneImg;
  if (zoneName) zoneName.textContent = zone.name;
  if (herbName) herbName.textContent = zone.herbName;

  const save = ensureHerbalism(loadSave());
  renderHerbalismHeader();
  renderBonusBox(save);
  stopCooldownUI();

  backBtn?.addEventListener("click", () => {
    stopGathering(true);
    if (window.DSUI?.navigateWithinShell?.("herbalism.html")) return;
    window.location.href = "herbalism.html";
  });
  startBtn?.addEventListener("click", startGathering);
  stopBtn?.addEventListener("click", () => stopGathering(false));
  targetBtn?.addEventListener("click", startTargetGathering);

  if (stopBtn) stopBtn.disabled = true;
}

function mountHerbalismAction(root = null, targetHref = "herbalism_action.html"){
  const left = root || document.getElementById("leftPanel");
  if (!left) return false;
  stopGathering(true);
  left.innerHTML = HERBALISM_ACTION_TEMPLATE;
  document.title = "Darkstone Chronicles - Herbalism Action";
  bindDom();
  const parsed = (() => {
    try { return new URL(targetHref, window.location.href); }
    catch { return null; }
  })();
  const zoneId = parsed?.searchParams.get("zone") || "verdant_hollow";
  initHerbalismActionRoute(zoneId);
  return true;
}

function initStandaloneHerbalismAction(){
  if (!document.getElementById("backBtn")) return false;
  document.title = "Darkstone Chronicles - Herbalism Action";
  bindDom();
  initHerbalismActionRoute(getZoneFromUrl());
  return true;
}

window.DSHerbalismAction = { mount: mountHerbalismAction };

window.addEventListener("DOMContentLoaded", () => {
  initStandaloneHerbalismAction();
});

window.addEventListener("ds:save", () => {
  const save = ensureHerbalism(loadSave());
  renderHerbalismHeader();
  renderBonusBox(save);
});
})();
