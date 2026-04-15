(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const ALCHEMY_TEMPLATE = `
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
      <h2 style="margin:0 0 10px;">Choose a Tier</h2>
      <div id="alchemyTierGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;"></div>
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

  const ALCHEMY_TIERS = [
    { tier:1, req:1, herbName:"Greenleaf", title:"Tier I Potions", icon:"images/alchemy/tiers/tier_1.png" },
    { tier:2, req:15, herbName:"Sungrass", title:"Tier II Potions", icon:"images/alchemy/tiers/tier_2.png" },
    { tier:3, req:30, herbName:"Ironroot", title:"Tier III Potions", icon:"images/alchemy/tiers/tier_3.png" },
    { tier:4, req:45, herbName:"Frost Bloom", title:"Tier IV Potions", icon:"images/alchemy/tiers/tier_4.png" },
    { tier:5, req:60, herbName:"Shadow Mint", title:"Tier V Potions", icon:"images/alchemy/tiers/tier_5.png" },
    { tier:6, req:75, herbName:"Goldthorn", title:"Tier VI Potions", icon:"images/alchemy/tiers/tier_6.png" },
    { tier:7, req:90, herbName:"Ember Lotus", title:"Tier VII Potions", icon:"images/alchemy/tiers/tier_7.png" }
  ];

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

  function renderTierGrid(){
    const save = ensureAlchemy(loadSave());
    const grid = document.getElementById("alchemyTierGrid");
    if (!grid) return;
    grid.innerHTML = "";

    ALCHEMY_TIERS.forEach((tier) => {
      const effectiveLevel = save.alchemyLevel + getArtisanPotionBonus(save);
      const locked = effectiveLevel < tier.req;
      const card = document.createElement("div");
      card.style.background = "#151520";
      card.style.border = "2px solid #333";
      card.style.borderRadius = "12px";
      card.style.padding = "12px";
      card.style.cursor = locked ? "not-allowed" : "pointer";
      card.style.opacity = locked ? "0.55" : "1";
      if (!locked) card.dataset.openTabHref = `alchemy_tier.html?tier=${tier.tier}`;
      card.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;">
          <img src="${tier.icon}" alt="${tier.title}" style="width:64px;height:64px;border-radius:10px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
          <div style="min-width:0;">
            <div style="font-size:16px;font-weight:700;">${tier.title}</div>
            <div style="opacity:.9;font-size:12px;margin-top:4px;">Req Alchemy Lv <b>${tier.req}</b></div>
            <div style="opacity:.85;font-size:12px;margin-top:4px;">Base Herb: ${tier.herbName}</div>
          </div>
        </div>
      `;
      card.addEventListener("click", () => {
        if (locked) {
          alert(`Requires Alchemy Level ${tier.req}`);
          return;
        }
        const href = String(card.dataset.openTabHref || `alchemy_tier.html?tier=${tier.tier}`);
        if (window.DSUI?.navigateWithinShell?.(href)) return;
        window.location.href = href;
      });
      grid.appendChild(card);
    });
  }

  function renderAlchemyView() {
    if (!document.getElementById("alchemyTierGrid")) return;
    renderAlchemyHeader();
    renderTierGrid();
  }

  function mountAlchemy(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = ALCHEMY_TEMPLATE;
    document.title = "Darkstone Chronicles - Alchemy";
    renderAlchemyView();
    return true;
  }

  function initStandaloneAlchemy() {
    if (!document.getElementById("alchemyTierGrid")) return false;
    document.title = "Darkstone Chronicles - Alchemy";
    renderAlchemyView();
    return true;
  }

  window.DSAlchemy = { mount: mountAlchemy };
  window.addEventListener("DOMContentLoaded", () => { initStandaloneAlchemy(); });
  window.addEventListener("ds:save", renderAlchemyView);
})();
