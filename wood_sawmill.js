(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const CARPENTRY_TEMPLATE = `
    <div class="profXpShell">
      <div class="profXpCard">
        <div class="profXpHead">
          <span aria-hidden="true">&#129717;</span>
          <span>Carpentry Lvl: <span id="woodLevel">1</span></span>
        </div>
        <div style="width:100%;">
          <div class="profXpTrack">
            <div id="woodXPBar" style="height:100%;width:0%;background:#ffd27d;"></div>
            <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
            <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="woodXPCurrent">0</span>/<span id="woodXPNext">100</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="profSection">
      <div id="carpentryTabs">
        <button id="tabPlanks" class="forgeTabBtn is-active" type="button">Craft Planks</button>
        <button id="tabDefenseCharms" class="forgeTabBtn" type="button">Defense Charms</button>
      </div>

      <div id="woodPlanksPanel">
        <h2 class="profSectionTitle">Choose a Plank to Craft</h2>
        <div id="plankGrid" class="profChoiceGrid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));"></div>
      </div>

      <div id="defenseCharmPanel" style="display:none;">
        <h2 class="profSectionTitle">Defense Charms</h2>
        <div id="defenseCharmGrid" class="profChoiceGrid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));"></div>
      </div>
    </div>
  `;

  const num = (v,f=0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }
  function ensureWood(save){
    save = save && typeof save === "object" ? save : {};
    save.carpentryLevel = Math.max(1, num(save.carpentryLevel, 1));
    save.carpentryXP = Math.max(0, num(save.carpentryXP, 0));
    save.carpentryXPNext = Math.max(1, num(save.carpentryXPNext, 100));
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
  function xpBarGradient(pct){
    if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
    if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
    if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
    return "linear-gradient(90deg,#2f9e5b,#7be39e)";
  }

  const RECIPES = [
    { id:"ash_plank", name:"Ash Plank", req:1, inputText:"5 Ash Log", img:"images/wood/planks/ash_plank.png" },
    { id:"pine_plank", name:"Pine Plank", req:10, inputText:"5 Pine Log", img:"images/wood/planks/pine_plank.png" },
    { id:"birch_plank", name:"Birch Plank", req:20, inputText:"5 Birch Log", img:"images/wood/planks/birch_plank.png" },
    { id:"oak_plank", name:"Oak Plank", req:30, inputText:"5 Oak Log", img:"images/wood/planks/oak_plank.png" },
    { id:"cedar_plank", name:"Cedar Plank", req:40, inputText:"5 Cedar Log", img:"images/wood/planks/cedar_plank.png" },
    { id:"maple_plank", name:"Maple Plank", req:50, inputText:"5 Maple Log", img:"images/wood/planks/maple_plank.png" },
    { id:"ironwood_plank", name:"Ironwood Plank", req:60, inputText:"5 Ironwood Log", img:"images/wood/planks/ironwood_plank.png" },
    { id:"heartwood_plank", name:"Heartwood Plank", req:70, inputText:"5 Heartwood Log", img:"images/wood/planks/heartwood_plank.png" },
    { id:"darkwood_plank", name:"Darkwood Plank", req:80, inputText:"5 Darkwood Log", img:"images/wood/planks/darkwood_plank.png" },
    { id:"ebony_plank", name:"Ebony Plank", req:90, inputText:"5 Ebony Log", img:"images/wood/planks/ebony_plank.png" }
  ];
  const CHARM_IMG = "images/charms";
  const CHARM_RECIPES = RECIPES.map((r, index) => {
    const woodId = r.id.replace(/_plank$/, "");
    const woodName = r.name.replace(/\s+Plank$/i, "");
    return {
      id: `${woodId}_defense_charm`,
      name: `${woodName} Defense Charm`,
      req: r.req,
      inputText: `3 ${r.name}`,
      img: `${CHARM_IMG}/${woodId}_defense_charm.png`,
      defenseBonus: (index + 1) * 10
    };
  });

  let activeTab = "planks";

  function renderTop(save){
    document.getElementById("woodLevel").textContent = String(save.carpentryLevel);
    document.getElementById("woodXPCurrent").textContent = String(save.carpentryXP);
    document.getElementById("woodXPNext").textContent = String(save.carpentryXPNext);
    const pct = clamp((save.carpentryXP / Math.max(1, save.carpentryXPNext)) * 100, 0, 100);
    document.getElementById("woodXPBar").style.width = `${pct}%`;
    document.getElementById("woodXPBar").style.background = xpBarGradient(pct);
  }

  function renderGrid(save){
    const grid = document.getElementById("plankGrid");
    if (!grid) return;
    grid.innerHTML = "";
    RECIPES.forEach((r) => {
      const effectiveLevel = save.carpentryLevel + getArtisanPotionBonus(save);
      const locked = effectiveLevel < r.req;
      const card = document.createElement("div");
      card.className = "profChoiceCard";
      card.style.padding = "12px";
      card.style.cursor = locked ? "not-allowed" : "pointer";
      card.style.opacity = locked ? "0.55" : "1";
      card.style.display = "flex";
      card.style.gap = "12px";
      card.style.alignItems = "center";
      if (!locked) card.dataset.openTabHref = `wood_sawmill_action.html?recipe=${encodeURIComponent(r.id)}`;

      const img = document.createElement("img");
      img.src = r.img;
      img.alt = r.name;
      img.style.width = "64px";
      img.style.height = "64px";
      img.style.borderRadius = "12px";
      img.className = "profChoiceThumb";
      img.style.objectFit = "cover";
      img.onerror = () => { img.style.display = "none"; };

      const info = document.createElement("div");
      info.style.flex = "1";
      info.innerHTML = `<div class="profChoiceTitle" style="font-weight:900;font-size:16px;">${r.name}</div><div class="profChoiceMeta" style="margin-top:4px;">Req Lv ${r.req}</div><div class="profChoiceMeta" style="opacity:.85;margin-top:6px;">${r.inputText}</div>`;

      card.appendChild(img);
      card.appendChild(info);
      if (!locked) {
        card.addEventListener("click", () => {
          const href = String(card.dataset.openTabHref || `wood_sawmill_action.html?recipe=${encodeURIComponent(r.id)}`);
          if (window.DSUI?.navigateWithinShell?.(href)) return;
          window.location.href = href;
        });
      }
      grid.appendChild(card);
    });
  }

  function renderDefenseCharmGrid(save){
    const grid = document.getElementById("defenseCharmGrid");
    if (!grid) return;
    grid.innerHTML = "";
    CHARM_RECIPES.forEach((r) => {
      const effectiveLevel = save.carpentryLevel + getArtisanPotionBonus(save);
      const locked = effectiveLevel < r.req;
      const card = document.createElement("div");
      card.className = "profChoiceCard";
      card.style.padding = "12px";
      card.style.cursor = locked ? "not-allowed" : "pointer";
      card.style.opacity = locked ? "0.55" : "1";
      card.style.display = "flex";
      card.style.gap = "12px";
      card.style.alignItems = "center";
      if (!locked) card.dataset.openTabHref = `wood_sawmill_action.html?recipe=${encodeURIComponent(r.id)}`;

      const img = document.createElement("img");
      img.src = r.img;
      img.alt = r.name;
      img.style.width = "64px";
      img.style.height = "64px";
      img.style.borderRadius = "12px";
      img.className = "profChoiceThumb";
      img.style.objectFit = "cover";
      img.onerror = () => { img.style.display = "none"; };

      const info = document.createElement("div");
      info.style.flex = "1";
      info.innerHTML = `<div class="profChoiceTitle" style="font-weight:900;font-size:16px;">${r.name}</div><div class="profChoiceMeta" style="margin-top:4px;">Req Lv ${r.req}</div><div class="profChoiceMeta" style="opacity:.85;margin-top:6px;">${r.inputText}</div><div class="profChoiceMeta" style="opacity:.85;margin-top:4px;">Defense +${r.defenseBonus}</div>`;

      card.appendChild(img);
      card.appendChild(info);
      if (!locked) {
        card.addEventListener("click", () => {
          const href = String(card.dataset.openTabHref || `wood_sawmill_action.html?recipe=${encodeURIComponent(r.id)}`);
          if (window.DSUI?.navigateWithinShell?.(href)) return;
          window.location.href = href;
        });
      }
      grid.appendChild(card);
    });
  }

  function setActiveTab(tab){
    activeTab = tab === "defense_charms" ? "defense_charms" : "planks";
    document.getElementById("tabPlanks")?.classList.toggle("is-active", activeTab === "planks");
    document.getElementById("tabDefenseCharms")?.classList.toggle("is-active", activeTab === "defense_charms");
    const planks = document.getElementById("woodPlanksPanel");
    const charms = document.getElementById("defenseCharmPanel");
    if (planks) planks.style.display = activeTab === "planks" ? "" : "none";
    if (charms) charms.style.display = activeTab === "defense_charms" ? "" : "none";
  }

  function renderCarpentryView() {
    if (!document.getElementById("plankGrid")) return;
    const save = ensureWood(loadSave());
    renderTop(save);
    renderGrid(save);
    renderDefenseCharmGrid(save);
    setActiveTab(activeTab);
  }

  function mountCarpentry(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = CARPENTRY_TEMPLATE;
    document.title = "Darkstone Chronicles - Carpentry";
    renderCarpentryView();
    document.getElementById("tabPlanks")?.addEventListener("click", () => setActiveTab("planks"));
    document.getElementById("tabDefenseCharms")?.addEventListener("click", () => setActiveTab("defense_charms"));
    return true;
  }

  function initStandaloneCarpentry() {
    if (!document.getElementById("plankGrid")) return false;
    document.title = "Darkstone Chronicles - Carpentry";
    renderCarpentryView();
    document.getElementById("tabPlanks")?.addEventListener("click", () => setActiveTab("planks"));
    document.getElementById("tabDefenseCharms")?.addEventListener("click", () => setActiveTab("defense_charms"));
    return true;
  }

  window.DSCarpentry = { mount: mountCarpentry };
  window.addEventListener("DOMContentLoaded", () => { initStandaloneCarpentry(); });
  window.addEventListener("ds:save", renderCarpentryView);
})();
