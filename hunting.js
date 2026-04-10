const SAVE_KEY = "darkstone_save_v1";

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

function ensureHunting(save){
  save = save && typeof save === "object" ? save : {};
  if (!Number.isFinite(Number(save.huntingLevel))) save.huntingLevel = 1;
  if (!Number.isFinite(Number(save.huntingXP))) save.huntingXP = 0;
  if (!Number.isFinite(Number(save.huntingXPNext))) save.huntingXPNext = 100;
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

const TARGETS = [
  {
    id:"shadow_hare",
    name:"Shadow Hare",
    req:1,
    img:"images/hunting/shadow_hare.png",
    rawName:"Raw Shadow Hare Meat",
    rawImg:"images/meat/shadow_hare_raw.png",
    cookedName:"Cooked Shadow Hare Meat",
    cookedImg:"images/meat/shadow_hare_cooked.png",
    stamina:2
  },

  {
    id:"rotfeather_turkey",
    name:"Rotfeather Turkey",
    req:10,
    img:"images/hunting/rotfeather_turkey.png",
    rawName:"Raw Rotfeather Turkey Meat",
    rawImg:"images/meat/rotfeather_turkey_raw.png",
    cookedName:"Cooked Rotfeather Turkey Meat",
    cookedImg:"images/meat/rotfeather_turkey_cooked.png",
    stamina:3
  },

  {
    id:"gloom_fox",
    name:"Gloom Fox",
    req:20,
    img:"images/hunting/gloom_fox.png",
    rawName:"Raw Gloom Fox Meat",
    rawImg:"images/meat/gloom_fox_raw.png",
    cookedName:"Cooked Gloom Fox Meat",
    cookedImg:"images/meat/gloom_fox_cooked.png",
    stamina:4
  },

  {
    id:"bloodtusk_boar",
    name:"Bloodtusk Boar",
    req:30,
    img:"images/hunting/bloodtusk_boar.png",
    rawName:"Raw Bloodtusk Boar Meat",
    rawImg:"images/meat/bloodtusk_boar_raw.png",
    cookedName:"Cooked Bloodtusk Boar Meat",
    cookedImg:"images/meat/bloodtusk_boar_cooked.png",
    stamina:5
  },

  {
    id:"night_wolf",
    name:"Night Wolf",
    req:40,
    img:"images/hunting/night_wolf.png",
    rawName:"Raw Night Wolf Meat",
    rawImg:"images/meat/night_wolf_raw.png",
    cookedName:"Cooked Night Wolf Meat",
    cookedImg:"images/meat/night_wolf_cooked.png",
    stamina:6
  },

  {
    id:"stonehorn_ram",
    name:"Stonehorn Ram",
    req:50,
    img:"images/hunting/stonehorn_ram.png",
    rawName:"Raw Stonehorn Ram Meat",
    rawImg:"images/meat/stonehorn_ram_raw.png",
    cookedName:"Cooked Stonehorn Ram Meat",
    cookedImg:"images/meat/stonehorn_ram_cooked.png",
    stamina:7
  },

  {
    id:"thorn_stag",
    name:"Thorn Stag",
    req:60,
    img:"images/hunting/thorn_stag.png",
    rawName:"Raw Thorn Stag Meat",
    rawImg:"images/meat/thorn_stag_raw.png",
    cookedName:"Cooked Thorn Stag Meat",
    cookedImg:"images/meat/thorn_stag_cooked.png",
    stamina:8
  },

  {
    id:"grave_bear",
    name:"Grave Bear",
    req:70,
    img:"images/hunting/grave_bear.png",
    rawName:"Raw Grave Bear Meat",
    rawImg:"images/meat/bear_raw.png",
    cookedName:"Cooked Grave Bear Meat",
    cookedImg:"images/meat/bear_cooked.png",
    stamina:9
  },

  {
    id:"dire_warg",
    name:"Dire Warg",
    req:80,
    img:"images/hunting/dire_warg.png",
    rawName:"Raw Dire Warg Meat",
    rawImg:"images/meat/dire_warg_raw.png",
    cookedName:"Cooked Dire Warg Meat",
    cookedImg:"images/meat/dire_warg_cooked.png",
    stamina:10
  },

  {
    id:"forest_troll",
    name:"Forest Troll",
    req:90,
    img:"images/hunting/forest_troll.png",
    rawName:"Raw Forest Troll Meat",
    rawImg:"images/meat/troll_raw.png",
    cookedName:"Cooked Forest Troll Meat",
    cookedImg:"images/meat/troll_cooked.png",
    stamina:11
  }
];

function countByName(inv, name){
  const it = inv.find(x => x && String(x.name||"").toLowerCase() === String(name).toLowerCase());
  if (!it) return 0;
  return Math.max(1, num(it.quantity ?? it.qty, 1));
}

// used units = sum quantities
function usedUnits(inv){
  let used = 0;
  for (const it of inv){
    if (!it) continue;
    used += Math.max(1, num(it.quantity ?? it.qty, 1));
  }
  return used;
}

function renderHeader(){
  const s = ensureHunting(loadSave());

  const lvlEl = document.getElementById("huntLevel");
  const curEl = document.getElementById("huntXPCurrent");
  const nextEl = document.getElementById("huntXPNext");
  const barEl = document.getElementById("huntXPBar");
  const arrowEl = document.getElementById("arrowCount");

  if (lvlEl) lvlEl.textContent = String(s.huntingLevel);
  if (curEl) curEl.textContent = String(s.huntingXP);
  if (nextEl) nextEl.textContent = String(s.huntingXPNext);

  const pct = s.huntingXPNext > 0 ? clamp((s.huntingXP / s.huntingXPNext) * 100, 0, 100) : 0;
  if (barEl) {
    barEl.style.width = pct.toFixed(1) + "%";
    barEl.style.background = xpBarGradient(pct);
  }

  if (arrowEl) arrowEl.textContent = String(countByName(s.inventory, "Arrows"));
}

function renderTargets(){
  const s = ensureHunting(loadSave());
  const grid = document.getElementById("targetGrid");
  const msg = document.getElementById("msg");
  if (!grid) return;

  const arrows = countByName(s.inventory, "Arrows");
  const full = usedUnits(s.inventory) >= num(s.inventoryMaxSlots, 1000);

  grid.innerHTML = "";

  TARGETS.forEach(t => {
    const effectiveLevel = s.huntingLevel + getGatheringPotionBonus(s);
    const locked = effectiveLevel < t.req;
    const card = document.createElement("div");
    card.style.background = "#151520";
    card.style.border = "2px solid #333";
    card.style.borderRadius = "12px";
    card.style.padding = "12px";
    card.style.cursor = locked ? "not-allowed" : "pointer";
    card.style.opacity = locked ? ".6" : "1";

    card.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;">
        <img src="${t.img}" alt="${t.name}"
          style="width:74px;height:74px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
        <div style="flex:1;text-align:left;">
          <div style="font-weight:900;font-size:18px;">${t.name}</div>
          <div style="opacity:.85;font-size:12px;margin-top:4px;">Requires Hunting Level <b>${t.req}</b></div>
          <div style="opacity:.85;font-size:12px;margin-top:6px;display:flex;align-items:center;gap:6px;">
  <span>Drops:</span>
  <img src="${t.rawImg}" 
       style="width:22px;height:22px;border-radius:6px;border:1px solid #333;background:#0f0f16;">
  <b>${t.rawName}</b>
</div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      if (locked) { msg.textContent = `❌ Requires Hunting Level ${t.req}.`; return; }
      if (full) { msg.textContent = "❌ No more inventory space"; return; }
      if (arrows <= 0) { msg.textContent = "❌ You need Arrows."; return; }

      window.location.href = `hunting_action.html?target=${encodeURIComponent(t.id)}`;
    });

    grid.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderTargets();

  // live refresh when save changes
  window.addEventListener("ds:save", () => {
    renderHeader();
    renderTargets();
  });
});
