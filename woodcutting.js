(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const WOODCUTTING_TEMPLATE = `
    <div class="profXpShell">
      <div class="profXpCard">
        <div class="profXpHead">
          <span aria-hidden="true">&#129717;</span>
          <span>Woodcutting Lvl: <span id="woodLevel">1</span></span>
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
      <div id="woodGatherPanel">
        <h2 class="profSectionTitle">Choose a Log to Gather</h2>
        <div id="woodGrid" class="profChoiceGrid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));"></div>
      </div>
    </div>
  `;

  const num = (v,f=0) => (Number.isFinite(Number(v)) ? Number(v) : f);

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
  function ensureWood(save){
    save = save && typeof save === "object" ? save : {};
    save.woodcuttingLevel = Math.max(1, num(save.woodcuttingLevel, 1));
    save.woodcuttingXP = Math.max(0, num(save.woodcuttingXP, 0));
    save.woodcuttingXPNext = Math.max(1, num(save.woodcuttingXPNext, 100));
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

  const WOODS = [
    { id:"ash", name:"Ash", req:1, img:"images/wood/logs/ash_log.png" },
    { id:"pine", name:"Pine", req:10, img:"images/wood/logs/pine_log.png" },
    { id:"birch", name:"Birch", req:20, img:"images/wood/logs/birch_log.png" },
    { id:"oak", name:"Oak", req:30, img:"images/wood/logs/oak_log.png" },
    { id:"cedar", name:"Cedar", req:40, img:"images/wood/logs/cedar_log.png" },
    { id:"maple", name:"Maple", req:50, img:"images/wood/logs/maple_log.png" },
    { id:"ironwood", name:"Ironwood", req:60, img:"images/wood/logs/ironwood_log.png" },
    { id:"heartwood", name:"Heartwood", req:70, img:"images/wood/logs/heartwood_log.png" },
    { id:"darkwood", name:"Darkwood", req:80, img:"images/wood/logs/darkwood_log.png" },
    { id:"ebony", name:"Ebony", req:90, img:"images/wood/logs/ebony_log.png" }
  ];

  function renderHeader(){
    const save = ensureWood(loadSave());
    document.getElementById("woodLevel").textContent = String(save.woodcuttingLevel);
    document.getElementById("woodXPCurrent").textContent = String(save.woodcuttingXP);
    document.getElementById("woodXPNext").textContent = String(save.woodcuttingXPNext);
    const pct = Math.max(0, Math.min(100, (save.woodcuttingXP / Math.max(1, save.woodcuttingXPNext)) * 100));
    document.getElementById("woodXPBar").style.width = `${pct.toFixed(1)}%`;
    document.getElementById("woodXPBar").style.background = xpBarGradient(pct);
  }

  function renderWoodGrid(){
    const save = ensureWood(loadSave());
    const grid = document.getElementById("woodGrid");
    if (!grid) return;
    grid.innerHTML = "";

    WOODS.forEach((w) => {
      const effectiveLevel = save.woodcuttingLevel + getGatheringPotionBonus(save);
      const locked = effectiveLevel < w.req;
      const card = document.createElement("div");
      card.className = "profChoiceCard";
      card.style.padding = "12px";
      card.style.cursor = locked ? "not-allowed" : "pointer";
      card.style.opacity = locked ? "0.55" : "1";
      if (!locked) card.dataset.openTabHref = `wood_gather_action.html?wood=${encodeURIComponent(w.id)}`;

      card.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;">
          <img src="${w.img}" alt="${w.name}" class="profChoiceThumb" style="width:64px;height:64px;border-radius:10px;object-fit:cover;">
          <div>
            <div class="profChoiceTitle" style="font-size:16px;font-weight:700;">${w.name}</div>
            <div class="profChoiceMeta" style="font-size:12px;margin-top:4px;">Req Wood Lv <b>${w.req}</b></div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        if (locked) return alert(`Requires Woodcutting Level ${w.req}`);
        const href = String(card.dataset.openTabHref || `wood_gather_action.html?wood=${encodeURIComponent(w.id)}`);
        if (window.DSUI?.navigateWithinShell?.(href)) return;
        window.location.href = href;
      });

      grid.appendChild(card);
    });
  }

  function renderWoodcuttingView() {
    if (!document.getElementById("woodGrid")) return;
    renderHeader();
    renderWoodGrid();
  }

  function mountWoodcutting(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = WOODCUTTING_TEMPLATE;
    document.title = "Darkstone Chronicles - Woodcutting";
    renderWoodcuttingView();
    return true;
  }

  function initStandaloneWoodcutting() {
    if (!document.getElementById("woodGrid")) return false;
    document.title = "Darkstone Chronicles - Woodcutting";
    renderWoodcuttingView();
    return true;
  }

  window.DSWoodcutting = {
    mount: mountWoodcutting,
    getAdminItems: () => WOODS.map((w) => ({
      type: "material",
      id: `${w.id}_log`,
      name: `${w.name} Log`,
      img: w.img,
      quantity: 1
    }))
  };
  window.addEventListener("DOMContentLoaded", () => { initStandaloneWoodcutting(); });
  window.addEventListener("ds:save", renderWoodcuttingView);
})();
