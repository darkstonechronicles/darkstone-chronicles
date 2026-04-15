(() => {

const SAVE_KEY = "darkstone_save_v1";
const FISHING_ACTION_TEMPLATE = `
  <div style="max-width:340px;margin:0 auto 12px;">
    <div style="background:#151520;border:2px solid #333;border-radius:12px;padding:10px 12px;width:100%;">
      <div style="font-weight:900;font-size:18px;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;text-align:center;">
        <span aria-hidden="true">&#127907;</span>
        <span>Fishing Lvl: <span id="fishLevel">1</span></span>
      </div>
      <div style="width:100%;">
        <div style="height:12px;background:#0f0f16;border:1px solid #2a2a3a;border-radius:999px;overflow:hidden;position:relative;">
          <div id="fishXPBar" style="height:100%;width:0%;background:#7dff9f;"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="fishXPCurrent">0</span>/<span id="fishXPNext">100</span></div>
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
        <div style="font-weight:800;font-size:13px;line-height:1.05;text-align:center;" id="spotName">Region</div>
        <img id="spotImg" src="" alt="Spot" style="width:74px;height:74px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
      </div>
      <div style="flex:1;">
        <div id="timerWrap" style="margin-top:10px;display:none;">
          <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
            <span>Fishing...</span>
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
          <button id="targetBtn">Fish Target</button>
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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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

function ensureFishing(save){
  save = save && typeof save === "object" ? save : {};
  if (!Number.isFinite(Number(save.fishingLevel))) save.fishingLevel = 1;
  if (!Number.isFinite(Number(save.fishingXP))) save.fishingXP = 0;
  save.fishingXPNext = xpNextForLevel(save.fishingLevel);
  if (!Array.isArray(save.inventory)) save.inventory = [];
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
function gatherXpForReq(req){
  const lvl = Math.max(1, Number(req) || 1);
  return 10 + Math.floor(lvl / 10) * 20;
}

const SPOTS = [

{
 id:"Mangrove_Spirit_Swamp",
 req:1,
 title:"Mangrove Spirit Swamp",
 img:"images/fishing_spots/Mangrove_Spirit_Swamp.png",
 fish:[
  { id:"mud_minnow", name:"Mud Minnow", img:"images/fish/mud_minnow.png", chance:0.70 },
  { id:"bog_carp", name:"Bog Carp", img:"images/fish/bog_carp.png", chance:0.30 }
 ]
},

{
 id:"Crystal_Stream",
 req:10,
 title:"Crystal Stream",
 img:"images/fishing_spots/Crystal_Stream.png",
 fish:[
  { id:"shiner_fish", name:"Shiner Fish", img:"images/fish/shiner_fish.png", chance:0.70 },
  { id:"golden_perch", name:"Golden Perch", img:"images/fish/golden_perch.png", chance:0.30 }
 ]
},

{
 id:"Emerald_Forest_Lake",
 req:20,
 title:"Emerald Forest Lake",
 img:"images/fishing_spots/Emerald_Forest_Lake.png",
 fish:[
  { id:"spiny_sunfish", name:"Spiny Sunfish", img:"images/fish/spiny_sunfish.png", chance:0.70 },
  { id:"striped_bass", name:"Striped Bass", img:"images/fish/striped_bass.png", chance:0.30 }
 ]
},

{
 id:"Canyon_Thunder_River",
 req:30,
 title:"Canyon Thunder River",
 img:"images/fishing_spots/Canyon_Thunder_River.png",
 fish:[
  { id:"stone_catfish", name:"Stone Catfish", img:"images/fish/stone_catfish.png", chance:0.70 },
  { id:"crystal_pike", name:"Crystal Pike", img:"images/fish/crystal_pike.png", chance:0.30 }
 ]
},

{
 id:"Moon_Lotus_Pond",
 req:40,
 title:"Moon Lotus Pond",
 img:"images/fishing_spots/Moon_Lotus_Pond.png",
 fish:[
  { id:"moon_carp", name:"Moon Carp", img:"images/fish/moon_carp.png", chance:0.70 },
  { id:"glass_eel", name:"Glass Eel", img:"images/fish/glass_eel.png", chance:0.30 }
 ]
},

{
 id:"Frozen_Aurora_River",
 req:50,
 title:"Frozen Aurora River",
 img:"images/fishing_spots/Frozen_Aurora_River.png",
 fish:[
  { id:"frost_salmon", name:"Frost Salmon", img:"images/fish/frost_salmon.png", chance:0.70 },
  { id:"glacier_char", name:"Glacier Char", img:"images/fish/glacier_char.png", chance:0.30 }
 ]
},

{
 id:"Glacier_Mirror_Lake",
 req:60,
 title:"Glacier Mirror Lake",
 img:"images/fishing_spots/Glacier_Mirror_Lake.png",
 fish:[
  { id:"ice_sturgeon", name:"Ice Sturgeon", img:"images/fish/ice_sturgeon.png", chance:0.70 },
  { id:"spiral_horn_gar", name:"Spiral Horn Gar", img:"images/fish/spiral_horn_gar.png", chance:0.30 }
 ]
},

{
 id:"Sunken_Coral_Sea",
 req:70,
 title:"Sunken Coral Sea",
 img:"images/fishing_spots/Sunken_Coral_Sea.png",
 fish:[
  { id:"storm_mackerel", name:"Storm Mackerel", img:"images/fish/storm_mackerel.png", chance:0.70 },
  { id:"lantern_pike", name:"Lantern Pike", img:"images/fish/lantern_pike.png", chance:0.30 }
 ]
},

{
 id:"Abyssal_Glow_Depths",
 req:80,
 title:"Abyssal Glow Depths",
 img:"images/fishing_spots/Abyssal_Glow_Depths.png",
 fish:[
  { id:"ghost_ray", name:"Ghost Ray", img:"images/fish/ghost_ray.png", chance:0.70 },
  { id:"hammerhead_pike", name:"Hammerhead Pike", img:"images/fish/hammerhead_pike.png", chance:0.30 }
 ]
},

{
 id:"Leviathan_Rift_Trench",
 req:90,
 title:"Leviathan Rift Trench",
 img:"images/fishing_spots/Leviathan_Rift_Trench.png",
 fish:[
  { id:"void_angler", name:"Void Angler", img:"images/fish/void_angler.png", chance:0.70 },
  { id:"leviathan_marlin", name:"Leviathan Marlin", img:"images/fish/leviathan_marlin.png", chance:0.30 }
 ]
}

];
function getSpotFromUrl(){
  const p = new URLSearchParams(location.search);
  return p.get("spot") || "Mangrove_Spirit_Swamp";
}
function getSpotDef(id){
  return SPOTS.find(s => s.id === id) || SPOTS[0];
}

// ---- inventory capacity in UNITS (sum quantities) ----
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
  return usedUnits(save.inventory) + addUnits <= Number(save.inventoryMaxSlots || 1000);
}

// stack key (DO NOT include img so path changes won't break stacks)
function itemStackKey(it){
  return [it.type||"", it.id||"", it.name||""].join("::");
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

// -------------------------
// Stats helper (writes inside SAME save object)
// -------------------------
function incStat(save, key, amount = 1){
  if (!save || typeof save !== "object") return;
  if (!save.stats || typeof save.stats !== "object") save.stats = {};
  if (!save.stats.total || typeof save.stats.total !== "object") save.stats.total = {};

  const add = Number.isFinite(Number(amount)) ? Number(amount) : 1;
  const cur = Number.isFinite(Number(save.stats.total[key])) ? Number(save.stats.total[key]) : 0;
  save.stats.total[key] = cur + add;
}

// ---- UI header render ----
function renderFishingHeader(){
  const s = ensureFishing(loadSave());
  document.getElementById("fishLevel").textContent = String(s.fishingLevel);
  document.getElementById("fishXPCurrent").textContent = String(s.fishingXP);
  document.getElementById("fishXPNext").textContent = String(s.fishingXPNext);

  const pct = s.fishingXPNext > 0 ? clamp((s.fishingXP / s.fishingXPNext) * 100, 0, 100) : 0;
  document.getElementById("fishXPBar").style.width = pct.toFixed(1) + "%";
  document.getElementById("fishXPBar").style.background = xpBarGradient(pct);
}

function formatPct(value, digits = 2){
  const pct = Math.max(0, num(value, 0) * 100);
  const rounded = Math.round(pct * (10 ** digits)) / (10 ** digits);
  return `+${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(digits).replace(/\.?0+$/, "")}%`;
}

function renderBonusBox(save){
  const petBonus = getGatheringPetState(save);
  const petEl = document.getElementById("gatheringBonusPetValue");
  const doubleEl = document.getElementById("gatheringBonusDoubleValue");
  const buildingEl = document.getElementById("gatheringBonusBuildingValue");
  const potionEl = document.getElementById("gatheringBonusPotionValue");
  if (petEl) petEl.textContent = formatPct(num(petBonus.xpPct, 0));
  if (doubleEl) doubleEl.textContent = formatPct(num(petBonus.doublePct, 0));
  if (buildingEl) buildingEl.textContent = formatPct(0);
  if (potionEl) potionEl.textContent = formatPct(0);
}

// ---- timer loop (same style as mining_action) ----
const CD_MS = 6000;

// -------------------------
// Global action lock (prevents multi-actions + enforces absolute cooldown)
// -------------------------
const ACTION_ID = "fishing";
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

let fishingActive = false;
let fishingTimer = null;

let cdAnim = null;
let cdStart = 0;

let targetRemaining = 0;
let currentSpotId = "Mangrove_Spirit_Swamp";

let backBtn = null;
let startBtn = null;
let stopBtn  = null;

let spotImg = null;
let spotName = null;
let spotInfo = null;

let timerWrap = null;
let timerText = null;
let timerBar  = null;

let msgEl = null;

let targetInput  = null;
let targetBtn    = null;
let targetStatus = null;

function bindDom(){
  backBtn = document.getElementById("backBtn");
  startBtn = document.getElementById("startBtn");
  stopBtn = document.getElementById("stopBtn");

  spotImg = document.getElementById("spotImg");
  spotName = document.getElementById("spotName");
  spotInfo = document.getElementById("spotInfo");

  timerWrap = document.getElementById("timerWrap");
  timerText = document.getElementById("timerText");
  timerBar = document.getElementById("timerBar");

  msgEl = document.getElementById("msg");

  targetInput = document.getElementById("targetInput");
  targetBtn = document.getElementById("targetBtn");
  targetStatus = document.getElementById("targetStatus");
}

function setMsg(t){
  if (msgEl) msgEl.innerHTML = t || "";
}

function buildFishMessage(fish, xpGain, isLast = false){
  const lastText = isLast ? " (last)" : "";
  return `You caught 1 <img src="${fish.img}" alt="${fish.name}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${fish.name}${lastText} (+${xpGain} XP)`;
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
    if (!fishingActive || window.DS?.isPaused){
      cdAnim = null;
      return;
    }

    const elapsed = now - cdStart;
    const t = Math.min(1, elapsed / CD_MS);

    timerBar.style.width = (t * 100).toFixed(1) + "%";
    const remain = Math.max(0, (CD_MS - elapsed) / 1000);
    timerText.textContent = remain.toFixed(1) + "s";

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

// pause from inspector
window.addEventListener("ds:pause", () => stopFishing(true));
window.addEventListener("ds:resume", () => { /* no auto-start */ });

function startFishing(){
  if (window.DS?.isPaused) return;
  if (fishingActive) return;
  const lock = acquireActionLock();
  if (!lock.ok){ setMsg(lock.msg); return; }

  fishingActive = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;

  setMsg("Fishing started.");
  scheduleNext(true);
}

function stopFishing(silent=false){
  fishingActive = false;

  if (fishingTimer){
    clearTimeout(fishingTimer);
    fishingTimer = null;
  }

  stopCooldownUI();

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  targetRemaining = 0;
  updateTargetUI();

  if (!silent) setMsg("Fishing stopped.");
}

function scheduleNext(runImmediately=false){
  if (!fishingActive) return;
  if (window.DS?.isPaused) return;

  if (runImmediately){
    fishTick();
    return;
  }

  const waitMs = getActionWaitMs();
  startCooldownUI(waitMs);
  fishingTimer = setTimeout(() => fishTick(), waitMs);
}

function rollFish(spot){
  const r = Math.random();
  let acc = 0;
  for (const f of spot.fish){
    acc += f.chance;
    if (r <= acc) return f;
  }
  return spot.fish[spot.fish.length - 1];
}

function fishTick(){
  if (!fishingActive) return;
  if (window.DS?.isPaused) return;

  const spotId = currentSpotId || getSpotFromUrl();
  const spot = getSpotDef(spotId);

  const s = ensureFishing(loadSave());

  const effectiveLevel = s.fishingLevel + getGatheringPotionBonus(s);
  if (effectiveLevel < spot.req){
    setMsg(`Requires Fishing Level ${spot.req}.`);
    stopFishing(true);
    return;
  }

  if (!hasSpaceFor(s, 1)){
    setMsg("No more inventory space.");
    stopFishing(true);
    setSave(s);
    return;
  }

  const f = rollFish(spot);
  const petBonus = getGatheringPetState(s);

  addToInventoryStack(s, {
    type: "fish",
    id: f.id,
    name: f.name,
    img: f.img
  }, 1);
  const doubled = Math.random() < petBonus.doublePct;
  if (doubled) {
    addToInventoryStack(s, {
      type: "fish",
      id: f.id,
      name: f.name,
      img: f.img
    }, 1);
  }

  // Stats
  incStat(s, "fishingTicks", 1);
  tickGatheringPotionActions(s, 1);

  // XP gain (simple core)
  const totalXpGain = Math.max(1, Math.round(gatherXpForReq(spot.req) * (1 + petBonus.xpPct)));
  const petSplit = window.DS?.pets?.splitXpWithPet
    ? window.DS.pets.splitXpWithPet(s, "gathering", totalXpGain)
    : { playerXpGain: totalXpGain, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
  const xpGain = petSplit.playerXpGain;
  s.fishingXP += xpGain;

  while (s.fishingXP >= s.fishingXPNext){
    s.fishingXP -= s.fishingXPNext;
    s.fishingLevel += 1;
    s.fishingXPNext = xpNextForLevel(s.fishingLevel);
  }

  setSave(s);
  window.dispatchEvent(new Event("ds:save"));
  renderFishingHeader();
  renderBonusBox(s);

  if (targetRemaining > 0){
    targetRemaining -= 1;
    updateTargetUI();
    if (targetRemaining <= 0){
      setMsg("Target completed! " + buildFishMessage(f, xpGain, true) + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""));
      stopFishing(true);
      return;
    }
  }

  setMsg(buildFishMessage(f, xpGain, false) + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""));
  touchActionLock();
  scheduleNext(false);
}

function startTargetFishing(){
  const val = Number(targetInput?.value);
  if (!Number.isFinite(val) || val <= 0){
    alert("Enter a valid target amount (e.g. 100).");
    return;
  }
  targetRemaining = Math.floor(val);
  updateTargetUI();

  if (!fishingActive) startFishing();
  else setMsg("Target set: " + targetRemaining);
}

function initFishingActionRoute(spotId){
  currentSpotId = spotId || getSpotFromUrl();
  const spot = getSpotDef(currentSpotId);
  if (spotImg) spotImg.src = spot.img;
  if (spotName) spotName.textContent = spot.title;
  if (spotInfo) spotInfo.textContent = `Req Fishing Lv ${spot.req} - 70% / 30% fish`;

  const save = ensureFishing(loadSave());
  renderFishingHeader();
  renderBonusBox(save);
  stopCooldownUI();

  backBtn?.addEventListener("click", () => {
    stopFishing(true);
    if (window.DSUI?.navigateWithinShell?.("fishing.html")) return;
    window.location.href = "fishing.html";
  });

  startBtn?.addEventListener("click", startFishing);
  stopBtn?.addEventListener("click", () => stopFishing(false));
  targetBtn?.addEventListener("click", startTargetFishing);

  if (stopBtn) stopBtn.disabled = true;
}

function mountFishingAction(root = null, targetHref = "fishing_action.html"){
  const left = root || document.getElementById("leftPanel");
  if (!left) return false;
  stopFishing(true);
  left.innerHTML = FISHING_ACTION_TEMPLATE;
  document.title = "Darkstone Chronicles - Fishing Action";
  bindDom();
  const parsed = (() => {
    try { return new URL(targetHref, window.location.href); }
    catch { return null; }
  })();
  const spotId = parsed?.searchParams.get("spot") || "Mangrove_Spirit_Swamp";
  initFishingActionRoute(spotId);
  return true;
}

function initStandaloneFishingAction(){
  if (!document.getElementById("backBtn")) return false;
  document.title = "Darkstone Chronicles - Fishing Action";
  bindDom();
  initFishingActionRoute(getSpotFromUrl());
  return true;
}

window.DSFishingAction = { mount: mountFishingAction };

window.addEventListener("DOMContentLoaded", () => {
  initStandaloneFishingAction();
});

window.addEventListener("ds:save", () => {
  const save = ensureFishing(loadSave());
  renderFishingHeader();
  renderBonusBox(save);
});
})();

