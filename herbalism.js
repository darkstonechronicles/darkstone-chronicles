(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const HERBALISM_TEMPLATE = `
    <div class="profXpShell">
      <div class="profXpCard">
        <div class="profXpHead">
          <span aria-hidden="true">&#127807;</span>
          <span>Herbalism Lvl: <span id="herbLevel">1</span></span>
        </div>
        <div style="width:100%;">
          <div class="profXpTrack">
            <div id="herbXPBar" style="height:100%;width:0%;background:#ffaa00;"></div>
            <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
            <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="herbXPCurrent">0</span>/<span id="herbXPNext">100</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="profSection">
      <h2 class="profSectionTitle">Choose a Zone</h2>
      <div id="herbGrid" class="profChoiceGrid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));"></div>
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
    { id:"verdant_hollow", name:"Verdant Hollow", req:1, herbName:"Greenleaf", zoneImg:"images/herbalism/zones/verdant_hollow.webp" },
    { id:"sunspire_plains", name:"Sunspire Plains", req:15, herbName:"Sungrass", zoneImg:"images/herbalism/zones/sunspire_plains.webp" },
    { id:"ironwood_depths", name:"Ironwood Depths", req:30, herbName:"Ironroot", zoneImg:"images/herbalism/zones/ironwood_depths.webp" },
    { id:"frostpetal_vale", name:"Frostpetal Vale", req:45, herbName:"Frost Bloom", zoneImg:"images/herbalism/zones/frostpetal_vale.webp" },
    { id:"duskmire_thicket", name:"Duskmire Thicket", req:60, herbName:"Shadow Mint", zoneImg:"images/herbalism/zones/duskmire_thicket.webp" },
    { id:"aurathorn_expanse", name:"Aurathorn Expanse", req:75, herbName:"Goldthorn", zoneImg:"images/herbalism/zones/aurathorn_expanse.webp" },
    { id:"emberfall_sanctuary", name:"Emberfall Sanctuary", req:90, herbName:"Ember Lotus", zoneImg:"images/herbalism/zones/emberfall_sanctuary.webp" }
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
    const pct = save.herbalismXPNext > 0 ? Math.max(0, Math.min(100, (save.herbalismXP / save.herbalismXPNext) * 100)) : 0;
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
      card.className = "profChoiceCard";
      card.style.padding = "12px";
      card.style.cursor = locked ? "not-allowed" : "pointer";
      card.style.opacity = locked ? "0.55" : "1";
      if (!locked) card.dataset.openTabHref = `herbalism_action.html?zone=${encodeURIComponent(zone.id)}`;
      card.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;">
          <img src="${zone.zoneImg}" alt="${zone.name}" class="profChoiceThumb" style="width:64px;height:64px;border-radius:10px;object-fit:cover;">
          <div style="min-width:0;">
            <div class="profChoiceTitle" style="font-size:16px;font-weight:700;">${zone.name}</div>
            <div class="profChoiceMeta" style="font-size:12px;margin-top:4px;">Req Herbalism Lv <b>${zone.req}</b></div>
            <div class="profChoiceMeta" style="opacity:.85;font-size:12px;margin-top:4px;">Gather: ${zone.herbName}</div>
          </div>
        </div>
      `;
      card.addEventListener("click", () => {
        if (locked) {
          alert(`Requires Herbalism Level ${zone.req}`);
          return;
        }
        const href = String(card.dataset.openTabHref || `herbalism_action.html?zone=${encodeURIComponent(zone.id)}`);
        if (window.DSUI?.navigateWithinShell?.(href)) return;
        window.location.href = href;
      });
      grid.appendChild(card);
    });
  }

  function renderHerbalismView() {
    if (!document.getElementById("herbGrid")) return;
    renderHerbalismHeader();
    renderHerbGrid();
  }

  function mountHerbalism(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = HERBALISM_TEMPLATE;
    document.title = "Darkstone Chronicles - Herbalism";
    renderHerbalismView();
    return true;
  }

  function initStandaloneHerbalism() {
    if (!document.getElementById("herbGrid")) return false;
    document.title = "Darkstone Chronicles - Herbalism";
    renderHerbalismView();
    return true;
  }

  window.DSHerbalism = {
    mount: mountHerbalism,
    getAdminItems: () => HERB_ZONES.map((zone) => ({
      type: "material",
      id: String(zone.herbName || "").toLowerCase().replace(/\s+/g, "_"),
      name: zone.herbName,
      img: `images/herbalism/herbs/${String(zone.herbName || "").toLowerCase().replace(/\s+/g, "_")}.png`,
      quantity: 1
    }))
  };
  window.addEventListener("DOMContentLoaded", () => { initStandaloneHerbalism(); });
  window.addEventListener("ds:save", renderHerbalismView);
})();
