(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const STATS_TEMPLATE = `
    <h1>📊 My Stats</h1>

    <div style="max-width:900px;margin:0 auto 12px;display:flex;gap:10px;justify-content:center;">
      <button id="backBtn">⬅ Back</button>
    </div>

    <div id="statsWrap" style="max-width:900px;margin:0 auto;"></div>
  `;

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function getTotalStats(save){
    const t = save?.stats?.total || {};
    return {
      fightsWon: num(t.fightsWon, 0),
      fightsLost: num(t.fightsLost, 0),
      dungeonsCompleted: num(t.dungeonsCompleted, 0),

      miningTicks: num(t.miningTicks, 0),
      barsCrafted: num(t.barsCrafted, 0),

      woodGatherTicks: num(t.woodGatherTicks, 0),
      planksCrafted: num(t.planksCrafted, 0),

      huntingTicks: num(t.huntingTicks, 0),
      fishingTicks: num(t.fishingTicks, 0),
      cookingCrafts: num(t.cookingCrafts, 0),

      goldEarned: num(t.goldEarned, 0),
      itemsDropped: num(t.itemsDropped, 0),
      mythicsFound: num(t.mythicsFound, 0)
    };
  }

  function row(label, value){
    return `
      <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid #2a2a3a;">
        <div style="opacity:.92;">${label}</div>
        <div style="font-weight:900;">${value}</div>
      </div>
    `;
  }

  function section(title, inner){
    return `
      <div style="background:#151520;border:2px solid #333;border-radius:12px;overflow:hidden;margin-bottom:12px;">
        <div style="padding:10px 12px;font-weight:900;border-bottom:1px solid #2a2a3a;">${title}</div>
        ${inner}
      </div>
    `;
  }

  function renderStats(){
    const save = loadSave();
    const s = getTotalStats(save);

    const wrap = document.getElementById("statsWrap");
    if (!wrap) return;

    const combats = section("Combat", [
      row("Fights Won", s.fightsWon),
      row("Fights Lost", s.fightsLost),
      row("Dungeons Completed", s.dungeonsCompleted),
      row("Items Dropped", s.itemsDropped),
      row("Mythics Found", s.mythicsFound),
      row("Gold Earned (from tracked events)", s.goldEarned)
    ].join(""));

    const crafting = section("Professions", [
      row("Mining Actions (ticks)", s.miningTicks),
      row("Bars Crafted", s.barsCrafted),
      row("Wood Gather Actions (ticks)", s.woodGatherTicks),
      row("Planks Crafted", s.planksCrafted),
      row("Hunting Actions", s.huntingTicks),
      row("Fishing Actions", s.fishingTicks),
      row("Cooking Crafts", s.cookingCrafts)
    ].join(""));

    wrap.innerHTML = combats + crafting;
  }

  function bindStatsEvents() {
    const backBtn = document.getElementById("backBtn");
    if (!backBtn || backBtn.dataset.dsStatsBound === "1") return;
    backBtn.dataset.dsStatsBound = "1";
    backBtn.addEventListener("click", () => {
      if (window.DSUI?.navigateWithinShell?.("index.html")) return;
      window.location.href = "index.html";
    });
  }

  function mountStats(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = STATS_TEMPLATE;
    document.title = "Darkstone Chronicles - My Stats";
    bindStatsEvents();
    renderStats();
    return true;
  }

  function initStandaloneStats(){
    if (!document.getElementById("statsWrap")) return false;
    document.title = "Darkstone Chronicles - My Stats";
    bindStatsEvents();
    renderStats();
    return true;
  }

  window.DSStats = {
    mount: mountStats
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneStats();
  });

  window.addEventListener("ds:save", renderStats);
})();
