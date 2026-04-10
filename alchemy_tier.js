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
function ensureAlchemy(save){
  save = save && typeof save === "object" ? save : {};
  if (!Number.isFinite(Number(save.alchemyLevel))) save.alchemyLevel = 1;
  if (!Number.isFinite(Number(save.alchemyXP))) save.alchemyXP = 0;
  if (!Number.isFinite(Number(save.alchemyXPNext))) save.alchemyXPNext = 100;
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

function getPotionBonusLine(potionId, tier){
  const safeTier = Math.max(1, Math.min(5, Number(tier) || 1));
  const pct = safeTier * 4;
  const luckPct = safeTier * 3;
  if (potionId === "strength") return `+${pct}% Attack (100 actions)`;
  if (potionId === "defense") return `+${pct}% Defense (100 actions)`;
  if (potionId === "gathering_insight") return `+${safeTier} Gathering Levels (100 actions)`;
  if (potionId === "artisan_insight") return `+${safeTier} Artisan Levels (100 actions)`;
  if (potionId === "luck") return `+${luckPct}% Drop Chance (100 actions)`;
  return "";
}

function getTierFromUrl(){
  const p = new URLSearchParams(location.search);
  return Math.min(7, Math.max(1, Number(p.get("tier") || 1)));
}

function renderAlchemyHeader(){
  const save = ensureAlchemy(loadSave());
  const lvlEl = document.getElementById("alchemyLevel");
  const curEl = document.getElementById("alchemyXPCurrent");
  const nextEl = document.getElementById("alchemyXPNext");
  const barEl = document.getElementById("alchemyXPBar");

  if (lvlEl) lvlEl.textContent = String(save.alchemyLevel);
  if (curEl) curEl.textContent = String(save.alchemyXP);
  if (nextEl) nextEl.textContent = String(save.alchemyXPNext);

  const pct = save.alchemyXPNext > 0 ? Math.max(0, Math.min(100, (save.alchemyXP / save.alchemyXPNext) * 100)) : 0;
  if (barEl) {
    barEl.style.width = pct.toFixed(1) + "%";
    barEl.style.background = xpBarGradient(pct);
  }
}

function renderTier(){
  const save = ensureAlchemy(loadSave());
  const tier = getTierFromUrl();
  const herb = HERBS.find((x) => x.tier === tier) || HERBS[0];
  const grid = document.getElementById("potionGrid");
  const title = document.getElementById("tierTitle");
  if (!grid) return;

  if (title) title.textContent = `Tier ${ROMAN[tier - 1]} Potions`;
  grid.innerHTML = "";

  POTION_TYPES.forEach((potion) => {
    const effectiveLevel = save.alchemyLevel + getArtisanPotionBonus(save);
    const locked = effectiveLevel < herb.req;
    const fullName = `${potion.label} ${ROMAN[tier - 1]}`;
    const icon = `images/alchemy/potions/${potion.id}_${tier}.png`;
    const bonusLine = getPotionBonusLine(potion.id, tier);
    const card = document.createElement("div");
    card.style.background = "#151520";
    card.style.border = "2px solid #333";
    card.style.borderRadius = "12px";
    card.style.padding = "12px";
    card.style.cursor = locked ? "not-allowed" : "pointer";
    card.style.opacity = locked ? "0.55" : "1";

    card.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;">
        <img src="${icon}" alt="${fullName}" style="width:64px;height:64px;border-radius:10px;border:2px solid #333;object-fit:cover;background:#131826;">
        <div style="min-width:0;">
          <div style="font-size:16px;font-weight:700;">${fullName}</div>
          <div style="opacity:.9;font-size:12px;margin-top:4px;">${bonusLine}</div>
          <div style="opacity:.85;font-size:12px;margin-top:4px;">Needs 3 ${herb.herbName} + 1 Empty Vial</div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      if (locked) {
        alert(`Requires Alchemy Level ${herb.req}`);
        return;
      }
      window.location.href = `alchemy_action.html?recipe=${encodeURIComponent(`${potion.id}_${tier}`)}`;
    });

    grid.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  renderAlchemyHeader();
  renderTier();
  document.getElementById("backBtn")?.addEventListener("click", () => {
    window.location.href = "alchemy.html";
  });
});
