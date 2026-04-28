(() => {

const SAVE_KEY = "darkstone_save_v1";
const WARDEN_SIGIL_ITEM = {
  type: "material",
  id: "warden_sigil",
  name: "Warden Sigil",
  img: "images/items/sigils/warden_sigil.webp"
};
const WARDEN_SIGIL_DROP_CHANCE = 1 / 250;
const ROUGH_GEM_DROP_CHANCE = 1 / 100;
const ROUGH_GEM_POOL = [
  { type:"material", id:"rough_ruby", name:"Rough Ruby", img:"images/gems/rough_ruby.webp" },
  { type:"material", id:"rough_sapphire", name:"Rough Sapphire", img:"images/gems/rough_sapphire.webp" },
  { type:"material", id:"rough_emerald", name:"Rough Emerald", img:"images/gems/rough_emerald.webp" },
  { type:"material", id:"rough_topaz", name:"Rough Topaz", img:"images/gems/rough_topaz.webp" },
  { type:"material", id:"rough_amethyst", name:"Rough Amethyst", img:"images/gems/rough_amethyst.webp" }
];
const HUNTING_ACTION_TEMPLATE = `
  <div style="max-width:340px;margin:0 auto 12px;">
    <div class="profXpCard">
      <div style="font-weight:900;font-size:18px;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;text-align:center;">
        <span aria-hidden="true">&#127993;</span>
        <span>Hunting Lvl: <span id="huntLevel">1</span></span>
      </div>
      <div style="width:100%;">
        <div class="profXpTrack">
          <div id="huntXPBar" style="height:100%;width:0%;background:#ffaa00;"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="huntXPCurrent">0</span>/<span id="huntXPNext">100</span></div>
        </div>
      </div>
    </div>
  </div>

  <div style="max-width:340px;margin:0 auto 12px;">
    <div id="gatheringBonusBox" class="profBonusCard" style="padding:12px;width:100%;min-height:56px;display:flex;align-items:flex-start;gap:10px;">
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

  <div class="profActionCard">
    <div style="display:flex;gap:12px;align-items:center;">
      <img id="targetImg" src="" alt="Target"
        class="profChoiceThumb" style="width:74px;height:74px;border-radius:12px;object-fit:cover;">
      <div style="flex:1;">
        <div style="font-weight:800;font-size:18px;" id="dropName">-</div>
        <div id="gatheringPetBonusText" style="margin-top:4px;text-align:center;font-size:11px;opacity:.88;color:#cfe7ff;"></div>
        <div id="timerWrap" style="margin-top:10px;display:none;">
          <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
            <span>Hunting...</span>
            <span id="timerText">6.0s</span>
          </div>
          <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
            <div id="timerBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
          </div>
        </div>

        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <div style="opacity:.85;font-size:12px;">Target amount:</div>
          <input id="targetInput" type="number" min="1" step="1" placeholder="e.g. 100"
            class="profTargetInput">
          <button id="targetBtn">Hunt Target</button>
          <div id="targetStatus" style="opacity:.85;font-size:12px;"></div>
        </div>
      </div>
    </div>

    <div id="msg" style="margin-top:12px;opacity:.9;"></div>
  </div>
`;

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

function loadSave(){
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
  catch { return {}; }
}
function setSave(next){
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
}
function appendHuntingReceipt(save, receipt){
  if (!save || typeof save !== "object") return;
  const current = Array.isArray(save.recentGatherRewards) ? save.recentGatherRewards : [];
  current.unshift(receipt && typeof receipt === "object" ? receipt : {});
  save.recentGatherRewards = current.slice(0, 20);
}
function commitHuntingTick(save, payload = {}){
  const next = save && typeof save === "object" ? save : {};
  const receipt = {
    id: `hunting:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
    at: new Date().toISOString(),
    profession: "hunting",
    itemName: String(payload.itemName || ""),
    itemId: String(payload.itemId || ""),
    xp: Math.max(0, num(payload.xp, 0)),
    doubled: payload.doubled === true,
    sigilDrop: payload.sigilDrop === true,
    roughGem: payload.roughGem ? String(payload.roughGem.name || "") : "",
    petXp: Math.max(0, num(payload.petXp, 0))
  };
  appendHuntingReceipt(next, receipt);
  next.lastGatherRewardAt = Date.now();
  setSave(next);
  window.dispatchEvent(new Event("ds:save"));
  window.DSAuth?.prioritizeCloudSaveSync?.();
  void window.DSAuth?.invokeActionJournal?.({
    actionId: receipt.id,
    actionKind: "gathering-tick",
    sourcePage: "hunting_action.html",
    payload: {
      profession: receipt.profession,
      itemId: receipt.itemId,
      itemName: receipt.itemName,
      xp: receipt.xp,
      doubled: receipt.doubled,
      sigilDrop: receipt.sigilDrop,
      roughGem: receipt.roughGem,
      petXp: receipt.petXp,
      completedAt: receipt.at
    }
  }).catch((error) => {
    console.warn("[hunting] action journal failed", error);
  });
}

function ensureHunting(save){
  save = save && typeof save === "object" ? save : {};
  if (!Number.isFinite(Number(save.huntingLevel))) save.huntingLevel = 1;
  if (!Number.isFinite(Number(save.huntingXP))) save.huntingXP = 0;
  save.huntingXPNext = xpNextForLevel(save.huntingLevel);
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

const TARGETS = [

{ id:"shadow_hare",
  name:"Shadow Hare",
  req:1,
  img:"images/hunting/shadow_hare.webp",
  rawName:"Raw Shadow Hare Meat",
  rawImg:"images/meat/shadow_hare_raw.webp",
  cookedName:"Cooked Shadow Hare Meat",
  cookedImg:"images/meat/shadow_hare_cooked.webp",
  stamina:2
},

{ id:"rotfeather_turkey",
  name:"Rotfeather Turkey",
  req:10,
  img:"images/hunting/rotfeather_turkey.webp",
  rawName:"Raw Rotfeather Turkey Meat",
  rawImg:"images/meat/rotfeather_turkey_raw.webp",
  cookedName:"Cooked Rotfeather Turkey Meat",
  cookedImg:"images/meat/rotfeather_turkey_cooked.webp",
  stamina:3
},

{ id:"gloom_fox",
  name:"Gloom Fox",
  req:20,
  img:"images/hunting/gloom_fox.webp",
  rawName:"Raw Gloom Fox Meat",
  rawImg:"images/meat/gloom_fox_raw.webp",
  cookedName:"Cooked Gloom Fox Meat",
  cookedImg:"images/meat/gloom_fox_cooked.webp",
  stamina:4
},

{ id:"bloodtusk_boar",
  name:"Bloodtusk Boar",
  req:30,
  img:"images/hunting/bloodtusk_boar.webp",
  rawName:"Raw Bloodtusk Boar Meat",
  rawImg:"images/meat/bloodtusk_boar_raw.webp",
  cookedName:"Cooked Bloodtusk Boar Meat",
  cookedImg:"images/meat/bloodtusk_boar_cooked.webp",
  stamina:5
},

{ id:"night_wolf",
  name:"Night Wolf",
  req:40,
  img:"images/hunting/night_wolf.webp",
  rawName:"Raw Night Wolf Meat",
  rawImg:"images/meat/night_wolf_raw.webp",
  cookedName:"Cooked Night Wolf Meat",
  cookedImg:"images/meat/night_wolf_cooked.webp",
  stamina:6
},

{ id:"stonehorn_ram",
  name:"Stonehorn Ram",
  req:50,
  img:"images/hunting/stonehorn_ram.webp",
  rawName:"Raw Stonehorn Ram Meat",
  rawImg:"images/meat/stonehorn_ram_raw.webp",
  cookedName:"Cooked Stonehorn Ram Meat",
  cookedImg:"images/meat/stonehorn_ram_cooked.webp",
  stamina:7
},

{ id:"thorn_stag",
  name:"Thorn Stag",
  req:60,
  img:"images/hunting/thorn_stag.webp",
  rawName:"Raw Thorn Stag Meat",
  rawImg:"images/meat/thorn_stag_raw.webp",
  cookedName:"Cooked Thorn Stag Meat",
  cookedImg:"images/meat/thorn_stag_cooked.webp",
  stamina:8
},

{ id:"grave_bear",
  name:"Grave Bear",
  req:70,
  img:"images/hunting/grave_bear.webp",
  rawName:"Raw Grave Bear Meat",
  rawImg:"images/meat/bear_raw.webp",
  cookedName:"Cooked Grave Bear Meat",
  cookedImg:"images/meat/bear_cooked.webp",
  stamina:9
},

{ id:"dire_warg",
  name:"Dire Warg",
  req:80,
  img:"images/hunting/dire_warg.webp",
  rawName:"Raw Dire Warg Meat",
  rawImg:"images/meat/dire_warg_raw.webp",
  cookedName:"Cooked Dire Warg Meat",
  cookedImg:"images/meat/dire_warg_cooked.webp",
  stamina:10
},

{ id:"forest_troll",
  name:"Forest Troll",
  req:90,
  img:"images/hunting/forest_troll.webp",
  rawName:"Raw Forest Troll Meat",
  rawImg:"images/meat/troll_raw.webp",
  cookedName:"Cooked Forest Troll Meat",
  cookedImg:"images/meat/troll_cooked.webp",
  stamina:11
}

];
function getTargetId(){
  const p = new URLSearchParams(location.search);
  return p.get("target") || "shadow_hare";
}
function getTargetDef(id){
  return TARGETS.find(t => t.id === id) || TARGETS[0];
}

function usedUnits(inv){
  let used = 0;
  for (const it of inv){
    if (!it) continue;
    used += Math.max(1, num(it.quantity ?? it.qty, 1));
  }
  return used;
}

function itemStackKey(it){
  return [it.type||"", it.id||"", it.name||""].join("::");
}
function addToInventoryStack(save, item, qty){
  if (window.DSInventory?.addItem) {
    return window.DSInventory.addItem(save, item, qty, { stack: true, stackKeyFn: itemStackKey });
  }
  const key = itemStackKey(item);
  const ex = save.inventory.find(i => i && itemStackKey(i) === key);
  if (ex) ex.quantity = Math.max(1, num(ex.quantity, 1)) + qty;
  else save.inventory.push({ ...item, quantity: qty });
  return { ok: true, added: qty };
}

function rollRoughGemDrop(){
  if (Math.random() >= ROUGH_GEM_DROP_CHANCE) return null;
  const pick = ROUGH_GEM_POOL[Math.floor(Math.random() * ROUGH_GEM_POOL.length)];
  return pick ? { ...pick, quantity: 1 } : null;
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

function countByName(inv, name){
  const it = inv.find(x => x && String(x.name||"").toLowerCase() === String(name).toLowerCase());
  if (!it) return 0;
  return Math.max(1, num(it.quantity ?? it.qty, 1));
}

function consumeByName(save, name, qtyNeeded){
  const idx = save.inventory.findIndex(it => it && String(it.name||"").toLowerCase() === String(name).toLowerCase());
  if (idx < 0) return false;
  const it = save.inventory[idx];
  const q = Math.max(1, num(it.quantity ?? it.qty, 1));
  if (q > qtyNeeded){ it.quantity = q - qtyNeeded; return true; }
  if (q === qtyNeeded){ save.inventory.splice(idx, 1); return true; }
  return false;
}

// -------------------------
// DOM
// -------------------------
let backBtn = null;
let startBtn = null;
let stopBtn  = null;

let targetImgEl = null;
let targetNameEl = null;
let dropNameEl = null;

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
let arrowEl = null;
let gatheringBonusPetValue = null;
let gatheringBonusDoubleValue = null;
let gatheringBonusBuildingValue = null;
let gatheringBonusPotionValue = null;
let currentTargetId = "shadow_hare";

function bindDom(){
  backBtn = document.getElementById("backBtn");
  startBtn = document.getElementById("startBtn");
  stopBtn = document.getElementById("stopBtn");

  targetImgEl = document.getElementById("targetImg");
  targetNameEl = document.getElementById("targetName");
  dropNameEl = document.getElementById("dropName");

  timerWrap = document.getElementById("timerWrap");
  timerText = document.getElementById("timerText");
  timerBar = document.getElementById("timerBar");

  msgEl = document.getElementById("msg");

  targetInput = document.getElementById("targetInput");
  targetBtn = document.getElementById("targetBtn");
  targetStatus = document.getElementById("targetStatus");

  lvlEl = document.getElementById("huntLevel");
  curEl = document.getElementById("huntXPCurrent");
  nextEl = document.getElementById("huntXPNext");
  barEl = document.getElementById("huntXPBar");
  arrowEl = document.getElementById("arrowCount");
  gatheringBonusPetValue = document.getElementById("gatheringBonusPetValue");
  gatheringBonusDoubleValue = document.getElementById("gatheringBonusDoubleValue");
  gatheringBonusBuildingValue = document.getElementById("gatheringBonusBuildingValue");
  gatheringBonusPotionValue = document.getElementById("gatheringBonusPotionValue");
}

// -------------------------
// Pause from inspector
// -------------------------
window.addEventListener("ds:pause", () => stopHunting(true));
window.addEventListener("ds:resume", () => { /* no auto-start */ });

// -------------------------
// UI header
// -------------------------
function renderHuntHeader(){
  const save = ensureHunting(loadSave());

  if (lvlEl) lvlEl.textContent = String(save.huntingLevel);
  if (curEl) curEl.textContent = String(save.huntingXP);
  if (nextEl) nextEl.textContent = String(save.huntingXPNext);

  const pct = save.huntingXPNext > 0
    ? clamp((save.huntingXP / save.huntingXPNext) * 100, 0, 100)
    : 0;
  if (barEl) {
    barEl.style.width = pct.toFixed(1) + "%";
    barEl.style.background = xpBarGradient(pct);
  }

  if (arrowEl) arrowEl.textContent = String(countByName(save.inventory, "Arrows"));
}

function formatPct(value, digits = 2){
  const pct = Math.max(0, num(value, 0) * 100);
  const rounded = Math.round(pct * (10 ** digits)) / (10 ** digits);
  return `+${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(digits).replace(/\.?0+$/, "")}%`;
}

function renderBonusBox(save){
  const petBonus = getGatheringPetState(save);
  const buildingPct = Math.max(0, num(save?.hunterLodgeLevel, 0)) * 0.0005;
  if (gatheringBonusPetValue) gatheringBonusPetValue.textContent = formatPct(num(petBonus.xpPct, 0));
  if (gatheringBonusDoubleValue) gatheringBonusDoubleValue.textContent = formatPct(num(petBonus.doublePct, 0));
  if (gatheringBonusBuildingValue) gatheringBonusBuildingValue.textContent = formatPct(buildingPct);
  if (gatheringBonusPotionValue) gatheringBonusPotionValue.textContent = formatPct(0);
}

// -------------------------
// Loop + timer bar
// -------------------------
const CD_MS = 6000;
// -------------------------
// Global action lock (prevents multi-actions + enforces absolute cooldown)
// -------------------------
const ACTION_ID = "hunting";
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
let huntingActive = false;
let huntingTimer = null;

let cdAnim = null;
let cdStart = 0;

let targetRemaining = 0;

function setMsg(t){
  if (msgEl) msgEl.innerHTML = t || "";
}

function buildHuntMessage(target, xpGain, sigilDrop = false, isLast = false){
  const lastText = isLast ? " (last)" : "";
  return `You obtained 1 <img src="${target.rawImg}" alt="${target.rawName}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${target.rawName}${lastText} (-1 Arrow, +${xpGain} XP)${sigilDrop ? " | Warden Sigil +1" : ""}`;
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
    if (!huntingActive || window.DS?.isPaused){
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

function startHunting(){
  if (window.DS?.isPaused) return;
  if (huntingActive) return;
  const lock = acquireActionLock();
  if (!lock.ok){ setMsg(lock.msg); return; }

  // precheck arrows + space
  const s = ensureHunting(loadSave());
  if (countByName(s.inventory, "Arrows") <= 0){
    setMsg("You need Arrows.");
    return;
  }
  if (usedUnits(s.inventory) >= num(s.inventoryMaxSlots, 1000)){
    setMsg("No more inventory space.");
    return;
  }

  huntingActive = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;

  setMsg("Hunting started.");
  touchActionLock();
  scheduleNext(true);
}

function stopHunting(silent=false){
  huntingActive = false;

  if (huntingTimer){
    clearTimeout(huntingTimer);
    huntingTimer = null;
  }

  stopCooldownUI();

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;

  targetRemaining = 0;
  updateTargetUI();

  if (!silent) setMsg("Hunting stopped.");
}

function scheduleNext(runImmediately=false){
  if (!huntingActive) return;
  if (window.DS?.isPaused) return;

  if (runImmediately){
    huntTick();
    return;
  }

  const waitMs = getActionWaitMs();
  startCooldownUI(waitMs);
  huntingTimer = setTimeout(() => huntTick(), waitMs);
}

function grantHuntXP(save, amount){
  save.huntingXP += amount;

  while (save.huntingXP >= save.huntingXPNext){
    save.huntingXP -= save.huntingXPNext;
    save.huntingLevel += 1;
    save.huntingXPNext = xpNextForLevel(save.huntingLevel);
    window.DS?.announcements?.professionLevel?.(save, "Hunting", save.huntingLevel);
  }
}

function huntTick(){
  if (!huntingActive) return;
  if (window.DS?.isPaused) return;

  const targetId = currentTargetId || getTargetId();
  const t = getTargetDef(targetId);

  const save = ensureHunting(loadSave());
  const petBonus = getGatheringPetState(save);

  // level req check
  const effectiveLevel = save.huntingLevel + getGatheringPotionBonus(save);
  if (effectiveLevel < t.req){
    setMsg(`Requires Hunting Level ${t.req}.`);
    stopHunting(true);
    return;
  }

  // arrows check (consume 1)
  const haveArrows = countByName(save.inventory, "Arrows");
  if (haveArrows <= 0){
    setMsg("Out of arrows.");
    stopHunting(true);
    setSave(save);
    renderHuntHeader();
    return;
  }

  // capacity check
  if (usedUnits(save.inventory) >= num(save.inventoryMaxSlots, 1000)){
    setMsg("No more inventory space.");
    stopHunting(true);
    setSave(save);
    renderHuntHeader();
    return;
  }

  const okConsume = consumeByName(save, "Arrows", 1);
  if (!okConsume){
    setMsg("Out of arrows.");
    stopHunting(true);
    setSave(save);
    renderHuntHeader();
    return;
  }

  // give raw meat
 addToInventoryStack(save, {
  type: "meat",
  id: `raw_${t.id}_meat`,
  name: t.rawName,
  img: t.rawImg
}, 1);
  const doubled = Math.random() < petBonus.doublePct;
  if (doubled) {
    addToInventoryStack(save, {
      type: "meat",
      id: `raw_${t.id}_meat`,
      name: t.rawName,
      img: t.rawImg
    }, 1);
  }
  const roughGemDrop = rollRoughGemDrop();
  if (roughGemDrop) addToInventoryStack(save, roughGemDrop, 1);
  let sigilDrop = false;
  if (Math.random() < WARDEN_SIGIL_DROP_CHANCE) {
    addToInventoryStack(save, { ...WARDEN_SIGIL_ITEM }, 1);
    sigilDrop = true;
  }

  // Stats
  incStat(save, "huntingTicks", 1);
  tickGatheringPotionActions(save, 1);

  // XP gain (ρυθμίζεις αν θες)
  const buildingPct = Math.max(0, num(save.hunterLodgeLevel, 0)) * 0.0005;
  const totalXpGain = Math.max(1, Math.round(gatherXpForReq(t.req) * (1 + petBonus.xpPct + buildingPct)));
  const petSplit = window.DS?.pets?.splitXpWithPet
    ? window.DS.pets.splitXpWithPet(save, "gathering", totalXpGain)
    : { playerXpGain: totalXpGain, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
  const xpGain = petSplit.playerXpGain;
  grantHuntXP(save, xpGain);

  commitHuntingTick(save, {
    itemName: t.rawName,
    itemId: `raw_${t.id}_meat`,
    xp: xpGain,
    doubled,
    sigilDrop,
    roughGem: roughGemDrop,
    petXp: petSplit.petXpGain
  });
  renderHuntHeader();
  renderBonusBox(save);

  // target mode decrement
  if (targetRemaining > 0){
    targetRemaining -= 1;
    updateTargetUI();
    if (targetRemaining <= 0){
      setMsg(`Target completed! ${buildHuntMessage(t, xpGain, sigilDrop, true)}${roughGemDrop ? ` <span style="color:#9ff0b7;">| <img src="${roughGemDrop.img}" alt="${roughGemDrop.name}" style="width:16px;height:16px;vertical-align:-3px;margin:0 4px;border-radius:4px;">${roughGemDrop.name} dropped!</span>` : ""}${petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : ""}${petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : ""}${doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""}`);
      stopHunting(true);
      return;
    }
  }

  setMsg(buildHuntMessage(t, xpGain, sigilDrop, false) + (roughGemDrop ? ` <span style="color:#9ff0b7;">| <img src="${roughGemDrop.img}" alt="${roughGemDrop.name}" style="width:16px;height:16px;vertical-align:-3px;margin:0 4px;border-radius:4px;">${roughGemDrop.name} dropped!</span>` : "") + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Gather!</span>` : ""));

  touchActionLock();
  scheduleNext(false);
}

// -------------------------
// Target Hunting
// -------------------------
function startTarget(){
  const val = Number(targetInput?.value);
  if (!Number.isFinite(val) || val <= 0){
    alert("Enter a valid target amount (e.g. 100).");
    return;
  }
  targetRemaining = Math.floor(val);
  updateTargetUI();

  if (!huntingActive) startHunting();
  else setMsg(`Target set: ${targetRemaining}`);
}

// -------------------------
// Boot
// -------------------------
function initHuntingActionRoute(targetId){
  currentTargetId = targetId || getTargetId();
  const t = getTargetDef(currentTargetId);
  if (targetImgEl) targetImgEl.src = t.img;
  if (targetNameEl) targetNameEl.textContent = t.name;
  if (dropNameEl) {
  dropNameEl.innerHTML = `
    <span style="display:flex;align-items:center;gap:8px;">
      <span>Drops:</span>
      <img src="${t.rawImg}" 
           style="width:26px;height:26px;border-radius:6px;border:1px solid #333;background:#0f0f16;">
      <b>${t.rawName}</b>
    </span>
  `;
}
  const save = ensureHunting(loadSave());
  renderHuntHeader();
  renderBonusBox(save);
  stopCooldownUI();

  backBtn?.addEventListener("click", () => {
    stopHunting(true);
    if (window.DSUI?.navigateWithinShell?.("hunting.html")) return;
    window.location.href = "hunting.html";
  });

  startBtn?.addEventListener("click", startHunting);
  stopBtn?.addEventListener("click", () => stopHunting(false));
  targetBtn?.addEventListener("click", startTarget);

  if (stopBtn) stopBtn.disabled = true;
}

function mountHuntingAction(root = null, targetHref = "hunting_action.html"){
  const left = root || document.getElementById("leftPanel");
  if (!left) return false;
  stopHunting(true);
  left.innerHTML = HUNTING_ACTION_TEMPLATE;
  document.title = "Darkstone Chronicles - Hunting Action";
  bindDom();
  const parsed = (() => {
    try { return new URL(targetHref, window.location.href); }
    catch { return null; }
  })();
  const targetId = parsed?.searchParams.get("target") || "shadow_hare";
  initHuntingActionRoute(targetId);
  return true;
}

function initStandaloneHuntingAction(){
  if (!document.getElementById("backBtn")) return false;
  document.title = "Darkstone Chronicles - Hunting Action";
  bindDom();
  initHuntingActionRoute(getTargetId());
  return true;
}

window.DSHuntingAction = { mount: mountHuntingAction };

window.addEventListener("DOMContentLoaded", () => {
  initStandaloneHuntingAction();
});

window.addEventListener("ds:save", () => {
  const save = ensureHunting(loadSave());
  renderHuntHeader();
  renderBonusBox(save);
});

})();

