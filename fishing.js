const SAVE_KEY = "darkstone_save_v1"; //0000aerrerererererererxfdbgsdfgsvsdv

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

function ensureFishing(save){
  save = save && typeof save === "object" ? save : {};
  if (!Number.isFinite(Number(save.fishingLevel))) save.fishingLevel = 1;
  if (!Number.isFinite(Number(save.fishingXP))) save.fishingXP = 0;
  if (!Number.isFinite(Number(save.fishingXPNext))) save.fishingXPNext = 100;
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

const SPOTS = [

{ id:"Mangrove_Spirit_Swamp", req:1,  title:"Mangrove Spirit Swamp", img:"images/fishing_spots/Mangrove_Spirit_Swamp.png" },

{ id:"Crystal_Stream", req:10, title:"Crystal Stream", img:"images/fishing_spots/Crystal_Stream.png" },

{ id:"Emerald_Forest_Lake", req:20, title:"Emerald Forest Lake", img:"images/fishing_spots/Emerald_Forest_Lake.png" },

{ id:"Canyon_Thunder_River", req:30, title:"Canyon Thunder River", img:"images/fishing_spots/Canyon_Thunder_River.png" },

{ id:"Moon_Lotus_Pond", req:40, title:"Moon Lotus Pond", img:"images/fishing_spots/Moon_Lotus_Pond.png" },

{ id:"Frozen_Aurora_River", req:50, title:"Frozen Aurora River", img:"images/fishing_spots/Frozen_Aurora_River.png" },

{ id:"Glacier_Mirror_Lake", req:60, title:"Glacier Mirror Lake", img:"images/fishing_spots/Glacier_Mirror_Lake.png" },

{ id:"Sunken_Coral_Sea", req:70, title:"Sunken Coral Sea", img:"images/fishing_spots/Sunken_Coral_Sea.png" },

{ id:"Abyssal_Glow_Depths", req:80, title:"Abyssal Glow Depths", img:"images/fishing_spots/Abyssal_Glow_Depths.png" },

{ id:"Leviathan_Rift_Trench", req:90, title:"Leviathan Rift Trench", img:"images/fishing_spots/Leviathan_Rift_Trench.png" }

];
function renderHeader(){
  const s = ensureFishing(loadSave());

  document.getElementById("fishLevel").textContent = String(s.fishingLevel);
  document.getElementById("fishXPCurrent").textContent = String(s.fishingXP);
  document.getElementById("fishXPNext").textContent = String(s.fishingXPNext);

  const pct = s.fishingXPNext > 0 ? clamp((s.fishingXP / s.fishingXPNext) * 100, 0, 100) : 0;
  document.getElementById("fishXPBar").style.width = pct.toFixed(1) + "%";
  document.getElementById("fishXPBar").style.background = xpBarGradient(pct);
}

function renderSpots(){
  const grid = document.getElementById("spotGrid");
  if (!grid) return;

  const s = ensureFishing(loadSave());
  grid.innerHTML = "";

  SPOTS.forEach(spot => {
    const effectiveLevel = s.fishingLevel + getGatheringPotionBonus(s);
    const locked = effectiveLevel < spot.req;

    const card = document.createElement("div");
    card.style.background = "#151520";
    card.style.border = "2px solid #333";
    card.style.borderRadius = "12px";
    card.style.padding = "12px";
    card.style.textAlign = "left";
    card.style.cursor = locked ? "not-allowed" : "pointer";
    card.style.opacity = locked ? "0.55" : "1";

    card.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;">
        <img src="${spot.img}" alt="${spot.title}"
          style="width:72px;height:72px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:900;font-size:16px;margin-bottom:4px;">${spot.title}</div>
          <div style="opacity:.85;font-size:12px;">Req Fishing Lv <b>${spot.req}</b></div>
          <div style="opacity:.75;font-size:12px;margin-top:6px;">Two fish types • 70% / 30%</div>
        </div>
      </div>
      ${locked ? `<div style="margin-top:10px;color:#ff6b6b;font-weight:800;">LOCKED</div>` : ``}
    `;

    if (!locked){
      card.addEventListener("click", () => {
        window.location.href = `fishing_action.html?spot=${encodeURIComponent(spot.id)}`;
      });
    }

    grid.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderSpots();
  window.addEventListener("ds:save", () => {
    renderHeader();
    renderSpots();
  });
});
