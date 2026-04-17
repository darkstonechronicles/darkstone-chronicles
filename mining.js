(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const MINING_TEMPLATE = `
    <div class="profXpShell">
      <div class="profXpCard">
        <div class="profXpHead">
          <span aria-hidden="true">&#9935;&#65039;</span>
          <span>Mining Lvl: <span id="mineLevel">1</span></span>
        </div>
        <div style="width:100%;">
          <div class="profXpTrack">
            <div id="mineXPBar" style="height:100%;width:0%;background:#ffaa00;"></div>
            <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
            <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="mineXPCurrent">0</span>/<span id="mineXPNext">100</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="profSection">
      <h2 class="profSectionTitle">Choose an Ore</h2>
      <div id="oreGrid" class="profChoiceGrid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));"></div>
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
  function ensureMining(save){
    save = save && typeof save === "object" ? save : {};
    if (!Number.isFinite(Number(save.miningLevel))) save.miningLevel = 1;
    if (!Number.isFinite(Number(save.miningXP))) save.miningXP = 0;
    if (!Number.isFinite(Number(save.miningXPNext))) save.miningXPNext = 100;
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

  const ORES = [
    { id:"copper_ore", name:"Copper Ore", req:1, img:"images/ores/copper_ore.png" },
    { id:"silver_ore", name:"Silver Ore", req:10, img:"images/ores/silver_ore.png" },
    { id:"iron_ore", name:"Iron Ore", req:20, img:"images/ores/iron_ore.png" },
    { id:"mithril_ore", name:"Mithril Ore", req:30, img:"images/ores/mithril_ore.png" },
    { id:"adamant_ore", name:"Adamant Ore", req:40, img:"images/ores/adamant_ore.png" },
    { id:"obsidian_ore", name:"Obsidian Ore", req:50, img:"images/ores/obsidian_ore.png" },
    { id:"crystal_ore", name:"Crystal Ore", req:60, img:"images/ores/crystal_ore.png" },
    { id:"sulfur_ore", name:"Sulfur Ore", req:70, img:"images/ores/sulfur_ore.png" },
    { id:"rose_quartz_ore", name:"Rose Quartz Ore", req:80, img:"images/ores/rose_quartz_ore.png" },
    { id:"darkstone_ore", name:"Darkstone Ore", req:90, img:"images/ores/darkstone_ore.png" }
  ];

  function renderMiningHeader(){
    const save = ensureMining(loadSave());
    const lvlEl = document.getElementById("mineLevel");
    const curEl = document.getElementById("mineXPCurrent");
    const nextEl = document.getElementById("mineXPNext");
    const barEl = document.getElementById("mineXPBar");

    if (lvlEl) lvlEl.textContent = String(save.miningLevel);
    if (curEl) curEl.textContent = String(save.miningXP);
    if (nextEl) nextEl.textContent = String(save.miningXPNext);

    const pct = save.miningXPNext > 0 ? Math.max(0, Math.min(100, (save.miningXP / save.miningXPNext) * 100)) : 0;
    if (barEl) {
      barEl.style.width = pct.toFixed(1) + "%";
      barEl.style.background = xpBarGradient(pct);
    }
  }

  function renderOreGrid(){
    const save = ensureMining(loadSave());
    const grid = document.getElementById("oreGrid");
    if (!grid) return;
    grid.innerHTML = "";

    ORES.forEach((o) => {
      const effectiveLevel = save.miningLevel + getGatheringPotionBonus(save);
      const locked = effectiveLevel < o.req;
      const card = document.createElement("div");
      card.className = "profChoiceCard";
      card.style.padding = "12px";
      card.style.cursor = locked ? "not-allowed" : "pointer";
      card.style.opacity = locked ? "0.55" : "1";
      if (!locked) card.dataset.openTabHref = `mining_action.html?ore=${encodeURIComponent(o.id)}`;

      card.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;">
          <img src="${o.img}" alt="${o.name}" class="profChoiceThumb" style="width:64px;height:64px;border-radius:10px;object-fit:cover;">
          <div>
            <div class="profChoiceTitle" style="font-size:16px;font-weight:700;">${o.name}</div>
            <div class="profChoiceMeta" style="font-size:12px;margin-top:4px;">Req Mining Lv <b>${o.req}</b></div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        if (locked) {
          alert(`Requires Mining Level ${o.req}`);
          return;
        }
        const href = String(card.dataset.openTabHref || `mining_action.html?ore=${encodeURIComponent(o.id)}`);
        if (window.DSUI?.navigateWithinShell?.(href)) return;
        window.location.href = href;
      });

      grid.appendChild(card);
    });
  }

  function renderMiningView() {
    if (!document.getElementById("oreGrid")) return;
    renderMiningHeader();
    renderOreGrid();
  }

  function mountMining(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = MINING_TEMPLATE;
    document.title = "Darkstone Chronicles - Mining";
    renderMiningView();
    return true;
  }

  function initStandaloneMining() {
    if (!document.getElementById("oreGrid")) return false;
    document.title = "Darkstone Chronicles - Mining";
    renderMiningView();
    return true;
  }

  window.DSMining = { mount: mountMining };
  window.addEventListener("DOMContentLoaded", () => { initStandaloneMining(); });
  window.addEventListener("ds:save", renderMiningView);
})();
