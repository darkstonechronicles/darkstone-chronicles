(() => {
const SAVE_KEY = "darkstone_save_v1";
const ALCHEMY_TIER_TEMPLATE = `
  <div style="max-width:340px;margin:0 auto 12px;">
    <div style="background:#151520;border:2px solid #333;border-radius:12px;padding:10px 12px;width:100%;">
      <div style="font-weight:900;font-size:18px;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;text-align:center;">
        <span aria-hidden="true">&#9879;&#65039;</span>
        <span>Alchemy Lvl: <span id="alchemyLevel">1</span></span>
      </div>
      <div style="width:100%;">
        <div style="height:12px;background:#0f0f16;border:1px solid #2a2a3a;border-radius:999px;overflow:hidden;position:relative;">
          <div id="alchemyXPBar" style="height:100%;width:0%;background:#7dc0ff;"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="alchemyXPCurrent">0</span>/<span id="alchemyXPNext">100</span></div>
        </div>
      </div>
    </div>
  </div>

  <div style="max-width:980px;margin:0 auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 10px;">
      <h2 id="tierTitle" style="margin:0;">Tier Potions</h2>
      <button id="backBtn" type="button" style="padding:8px 12px;border-radius:10px;border:2px solid #2a2a3a;background:#151520;color:#cfcfe6;font-weight:800;cursor:pointer;">Back</button>
    </div>
    <div id="potionGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;"></div>
  </div>
`;

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

let currentTier = 1;

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

function getTierFromTarget(targetHref = window.location.href){
  try {
    const url = new URL(targetHref, window.location.href);
    return Math.min(7, Math.max(1, Number(url.searchParams.get("tier") || 1)));
  } catch {
    return 1;
  }
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
  const herb = HERBS.find((x) => x.tier === currentTier) || HERBS[0];
  const grid = document.getElementById("potionGrid");
  const title = document.getElementById("tierTitle");
  if (!grid) return;

  if (title) title.textContent = `Tier ${ROMAN[currentTier - 1]} Potions`;
  grid.innerHTML = "";

  POTION_TYPES.forEach((potion) => {
    const effectiveLevel = save.alchemyLevel + getArtisanPotionBonus(save);
    const locked = effectiveLevel < herb.req;
    const fullName = `${potion.label} ${ROMAN[currentTier - 1]}`;
    const icon = `images/alchemy/potions/${potion.id}_${currentTier}.png`;
    const bonusLine = getPotionBonusLine(potion.id, currentTier);
    const card = document.createElement("div");
    card.style.background = "#151520";
    card.style.border = "2px solid #333";
    card.style.borderRadius = "12px";
    card.style.padding = "12px";
    card.style.cursor = locked ? "not-allowed" : "pointer";
    card.style.opacity = locked ? "0.55" : "1";
    if (!locked) card.dataset.openTabHref = `alchemy_action.html?recipe=${encodeURIComponent(`${potion.id}_${currentTier}`)}`;

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
      const href = String(card.dataset.openTabHref || `alchemy_action.html?recipe=${encodeURIComponent(`${potion.id}_${currentTier}`)}`);
      if (window.DSUI?.navigateWithinShell?.(href)) return;
      window.location.href = href;
    });

    grid.appendChild(card);
  });
}

function initAlchemyTierRoute(targetHref = window.location.href) {
  currentTier = getTierFromTarget(targetHref);
  renderAlchemyHeader();
  renderTier();
  document.getElementById("backBtn")?.addEventListener("click", () => {
    if (window.DSUI?.navigateWithinShell?.("alchemy.html")) return;
    window.location.href = "alchemy.html";
  });
}

function mountAlchemyTier(root = null, targetHref = "alchemy_tier.html") {
  const left = root || document.getElementById("leftPanel");
  if (!left) return false;
  left.innerHTML = ALCHEMY_TIER_TEMPLATE;
  document.title = "Darkstone Chronicles - Alchemy Tier";
  initAlchemyTierRoute(targetHref);
  return true;
}

function initStandaloneAlchemyTier(){
  if (!document.getElementById("potionGrid")) return false;
  document.title = "Darkstone Chronicles - Alchemy Tier";
  initAlchemyTierRoute(window.location.href);
  return true;
}

window.DSAlchemyTier = { mount: mountAlchemyTier };
window.addEventListener("DOMContentLoaded", () => { initStandaloneAlchemyTier(); });
window.addEventListener("ds:save", () => {
  if (!document.getElementById("potionGrid")) return;
  renderAlchemyHeader();
  renderTier();
});
})();
