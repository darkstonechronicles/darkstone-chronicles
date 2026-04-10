const SAVE_KEY = "darkstone_save_v1";

function loadSave(){
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
  catch { return {}; }
}
function xpBarGradient(pct){
  if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
  if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
  if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
  return "linear-gradient(90deg,#2f9e5b,#7be39e)";
}
function ensureHerbalism(save){
  save = save && typeof save === "object" ? save : {};
  if (!Number.isFinite(Number(save.herbalismLevel))) save.herbalismLevel = 1;
  if (!Number.isFinite(Number(save.herbalismXP))) save.herbalismXP = 0;
  if (!Number.isFinite(Number(save.herbalismXPNext))) save.herbalismXPNext = 100;
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

const HERB_ZONES = [
  { id:"verdant_hollow", name:"Verdant Hollow", req:1, herbId:"greenleaf", herbName:"Greenleaf", zoneImg:"images/herbalism/zones/verdant_hollow.png", herbImg:"images/herbalism/herbs/greenleaf.png" },
  { id:"sunspire_plains", name:"Sunspire Plains", req:15, herbId:"sungrass", herbName:"Sungrass", zoneImg:"images/herbalism/zones/sunspire_plains.png", herbImg:"images/herbalism/herbs/sungrass.png" },
  { id:"ironwood_depths", name:"Ironwood Depths", req:30, herbId:"ironroot", herbName:"Ironroot", zoneImg:"images/herbalism/zones/ironwood_depths.png", herbImg:"images/herbalism/herbs/ironroot.png" },
  { id:"frostpetal_vale", name:"Frostpetal Vale", req:45, herbId:"frost_bloom", herbName:"Frost Bloom", zoneImg:"images/herbalism/zones/frostpetal_vale.png", herbImg:"images/herbalism/herbs/frost_bloom.png" },
  { id:"duskmire_thicket", name:"Duskmire Thicket", req:60, herbId:"shadow_mint", herbName:"Shadow Mint", zoneImg:"images/herbalism/zones/duskmire_thicket.png", herbImg:"images/herbalism/herbs/shadow_mint.png" },
  { id:"aurathorn_expanse", name:"Aurathorn Expanse", req:75, herbId:"goldthorn", herbName:"Goldthorn", zoneImg:"images/herbalism/zones/aurathorn_expanse.png", herbImg:"images/herbalism/herbs/goldthorn.png" },
  { id:"emberfall_sanctuary", name:"Emberfall Sanctuary", req:90, herbId:"ember_lotus", herbName:"Ember Lotus", zoneImg:"images/herbalism/zones/emberfall_sanctuary.png", herbImg:"images/herbalism/herbs/ember_lotus.png" }
];

function renderHerbalismHeader(){
  const save = ensureHerbalism(loadSave());
  const lvlEl = document.getElementById("herbLevel");
  const curEl = document.getElementById("herbXPCurrent");
  const nextEl = document.getElementById("herbXPNext");
  const barEl = document.getElementById("herbXPBar");

  if (lvlEl) lvlEl.textContent = String(save.herbalismLevel);
  if (curEl) curEl.textContent = String(save.herbalismXP);
  if (nextEl) nextEl.textContent = String(save.herbalismXPNext);

  const pct = save.herbalismXPNext > 0
    ? Math.max(0, Math.min(100, (save.herbalismXP / save.herbalismXPNext) * 100))
    : 0;

  if (barEl) {
    barEl.style.width = pct.toFixed(1) + "%";
    barEl.style.background = xpBarGradient(pct);
  }
}

function renderHerbGrid(){
  const save = ensureHerbalism(loadSave());
  const grid = document.getElementById("herbGrid");
  if (!grid) return;

  grid.innerHTML = "";

  HERB_ZONES.forEach((zone) => {
    const effectiveLevel = save.herbalismLevel + getGatheringPotionBonus(save);
    const locked = effectiveLevel < zone.req;
    const card = document.createElement("div");
    card.style.background = "#151520";
    card.style.border = "2px solid #333";
    card.style.borderRadius = "12px";
    card.style.padding = "12px";
    card.style.cursor = locked ? "not-allowed" : "pointer";
    card.style.opacity = locked ? "0.55" : "1";

    card.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;">
        <img src="${zone.zoneImg}" alt="${zone.name}" style="width:64px;height:64px;border-radius:10px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
        <div style="min-width:0;">
          <div style="font-size:16px;font-weight:700;">${zone.name}</div>
          <div style="opacity:.9;font-size:12px;margin-top:4px;">Req Herbalism Lv <b>${zone.req}</b></div>
          <div style="opacity:.85;font-size:12px;margin-top:4px;">Gather: ${zone.herbName}</div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      if (locked) {
        alert(`Requires Herbalism Level ${zone.req}`);
        return;
      }
      window.location.href = `herbalism_action.html?zone=${encodeURIComponent(zone.id)}`;
    });

    grid.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  renderHerbalismHeader();
  renderHerbGrid();
});
