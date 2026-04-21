(() => {
  const SAVE_KEY = "darkstone_save_v1";

  const JEWELCRAFTING_TEMPLATE = `
    <style>
      .forgeTabBtn{
        min-width:170px;
        padding:16px 18px;
        border-radius:12px;
        border:1px solid var(--btn-premium-border);
        background:var(--btn-premium-bg);
        color:#f1f2f6;
        font-weight:800;
        letter-spacing:.2px;
        text-shadow:0 1px 0 rgba(0,0,0,.75);
        box-shadow:var(--btn-premium-shadow);
        cursor:pointer;
        transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease,filter .14s ease,opacity .14s ease;
        opacity:.78;
      }
      .forgeTabBtn:hover{
        transform:translateY(-1px);
        border-color:var(--btn-premium-hover-border);
        box-shadow:0 14px 28px rgba(0,0,0,.3),0 0 0 1px rgba(0,0,0,.48),0 0 18px var(--btn-premium-hover-glow),inset 0 1px 0 rgba(255,255,255,.12),inset 0 -1px 0 rgba(0,0,0,.3);
        filter:brightness(1.03);
        opacity:1;
      }
      .forgeTabBtn.is-active{
        border-color:var(--btn-premium-primary-border);
        background:var(--btn-premium-primary-bg);
        color:#f6e7c5;
        box-shadow:0 12px 24px rgba(0,0,0,.28),0 0 0 1px rgba(0,0,0,.45),0 0 24px rgba(228,181,77,.28),inset 0 1px 0 rgba(255,255,255,.10),inset 0 2px 0 rgba(255,245,210,.18),inset 0 -2px 0 rgba(0,0,0,.32);
        filter:brightness(1.06);
        opacity:1;
      }
      .gemStageCard{
        appearance:none;
        -webkit-appearance:none;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:flex-start;
        gap:14px;
        padding:12px 8px 8px;
        width:100%;
        border:none !important;
        outline:none;
        background:transparent !important;
        box-shadow:none !important;
        border-radius:0;
        cursor:pointer;
        transition:transform .14s ease, filter .14s ease;
      }
      .gemStageCard::before,
      .gemStageCard::after{
        display:none !important;
      }
      .gemStageCard:hover{
        transform:translateY(-2px);
        filter:brightness(1.04);
      }
      .gemStageIcon{
        width:96px;
        height:96px;
        border-radius:16px;
        object-fit:cover;
        border:2px solid rgba(214,183,103,.9);
        box-shadow:0 8px 22px rgba(0,0,0,.35);
        background:rgba(10,12,18,.72);
      }
      .gemStageLabel{
        width:118px;
        min-height:58px;
        padding:9px 12px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,.08);
        background:rgba(17,19,31,.78);
        color:#f4f1e8;
        font-weight:800;
        font-size:13px;
        line-height:1.1;
        text-align:center;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:4px;
        text-shadow:0 1px 0 rgba(0,0,0,.8);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
      }
      .gemStageTitle{
        display:block;
        width:100%;
      }
      .gemStageMeta{
        display:block;
        width:100%;
        min-height:13px;
        font-size:10px;
        font-weight:700;
        line-height:1;
        opacity:.82;
      }
    </style>

    <div class="profXpShell">
      <div class="profXpCard">
        <div class="profXpHead">
          <span aria-hidden="true">&#128142;</span>
          <span>Jewelcrafting Lvl: <span id="jewelcraftLevel">1</span></span>
        </div>
        <div style="width:100%;">
          <div class="profXpTrack">
            <div id="jewelcraftXPBar" style="height:100%;width:0%;background:linear-gradient(90deg,#3aa4ff,#7bdbff);"></div>
            <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
            <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="jewelcraftXPCurrent">0</span>/<span id="jewelcraftXPNext">100</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="profSection">
      <div id="jewelcraftTabs" style="display:flex;gap:14px;flex-wrap:wrap;margin:0 0 14px;">
        <button id="tabGemcrafting" class="forgeTabBtn is-active" type="button">Gemcrafting</button>
        <button id="tabJewelcrafting" class="forgeTabBtn" type="button">Jewelry</button>
      </div>

      <div id="gemcraftingPanel">
        <div id="gemcraftingHome">
          <div id="gemcraftingCategoryGrid" class="profChoiceGrid" style="grid-template-columns:repeat(4,minmax(0,1fr));"></div>
        </div>
        <div id="gemcraftingDetail" style="display:none;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 14px;">
            <button id="gemcraftingBackBtn" class="forgeTabBtn" type="button" style="min-width:140px;">Back</button>
            <h2 id="gemcraftingDetailTitle" class="profSectionTitle" style="margin:0;"></h2>
          </div>
          <div id="gemcraftingDetailGrid" class="profChoiceGrid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));"></div>
        </div>
      </div>

      <div id="jewelcraftingPanel" style="display:none;">
        <div class="profActionCard" style="min-height:180px;display:flex;align-items:center;justify-content:center;text-align:center;">
          <div style="opacity:.82;font-weight:700;">Jewelcrafting recipes will be added here.</div>
        </div>
      </div>
    </div>
  `;

  const REFINE_RECIPES = [
    { id: "rough_ruby", name: "Rough Ruby", refinedName: "Refined Ruby", reqLevel: 1, img: "images/gems/rough_ruby.png", refinedImg: "images/gems/refined_ruby.png", needText: "Needs 1 Rough Ruby" },
    { id: "rough_sapphire", name: "Rough Sapphire", refinedName: "Refined Sapphire", reqLevel: 1, img: "images/gems/rough_sapphire.png", refinedImg: "images/gems/refined_sapphire.png", needText: "Needs 1 Rough Sapphire" },
    { id: "rough_emerald", name: "Rough Emerald", refinedName: "Refined Emerald", reqLevel: 1, img: "images/gems/rough_emerald.png", refinedImg: "images/gems/refined_emerald.png", needText: "Needs 1 Rough Emerald" },
    { id: "rough_topaz", name: "Rough Topaz", refinedName: "Refined Topaz", reqLevel: 1, img: "images/gems/rough_topaz.png", refinedImg: "images/gems/refined_topaz.png", needText: "Needs 1 Rough Topaz" },
    { id: "rough_amethyst", name: "Rough Amethyst", refinedName: "Refined Amethyst", reqLevel: 1, img: "images/gems/rough_amethyst.png", refinedImg: "images/gems/refined_amethyst.png", needText: "Needs 1 Rough Amethyst" }
  ];

  const FLAWLESS_RECIPES = [
    { id: "refined_ruby", name: "Refined Ruby", refinedName: "Flawless Ruby", reqLevel: 5, img: "images/gems/refined_ruby.png", refinedImg: "images/gems/flawless_ruby.png", needText: "Needs 3 Refined Ruby" },
    { id: "refined_sapphire", name: "Refined Sapphire", refinedName: "Flawless Sapphire", reqLevel: 5, img: "images/gems/refined_sapphire.png", refinedImg: "images/gems/flawless_sapphire.png", needText: "Needs 3 Refined Sapphire" },
    { id: "refined_emerald", name: "Refined Emerald", refinedName: "Flawless Emerald", reqLevel: 5, img: "images/gems/refined_emerald.png", refinedImg: "images/gems/flawless_emerald.png", needText: "Needs 3 Refined Emerald" },
    { id: "refined_topaz", name: "Refined Topaz", refinedName: "Flawless Topaz", reqLevel: 5, img: "images/gems/refined_topaz.png", refinedImg: "images/gems/flawless_topaz.png", needText: "Needs 3 Refined Topaz" },
    { id: "refined_amethyst", name: "Refined Amethyst", refinedName: "Flawless Amethyst", reqLevel: 5, img: "images/gems/refined_amethyst.png", refinedImg: "images/gems/flawless_amethyst.png", needText: "Needs 3 Refined Amethyst" }
  ];

  const MASTERWORK_RECIPES = [
    { id: "flawless_ruby", name: "Flawless Ruby", refinedName: "Masterwork Ruby", reqLevel: 10, img: "images/gems/flawless_ruby.png", refinedImg: "images/gems/masterwork_ruby.png", needText: "Needs 3 Flawless Ruby" },
    { id: "flawless_sapphire", name: "Flawless Sapphire", refinedName: "Masterwork Sapphire", reqLevel: 10, img: "images/gems/flawless_sapphire.png", refinedImg: "images/gems/masterwork_sapphire.png", needText: "Needs 3 Flawless Sapphire" },
    { id: "flawless_emerald", name: "Flawless Emerald", refinedName: "Masterwork Emerald", reqLevel: 10, img: "images/gems/flawless_emerald.png", refinedImg: "images/gems/masterwork_emerald.png", needText: "Needs 3 Flawless Emerald" },
    { id: "flawless_topaz", name: "Flawless Topaz", refinedName: "Masterwork Topaz", reqLevel: 10, img: "images/gems/flawless_topaz.png", refinedImg: "images/gems/masterwork_topaz.png", needText: "Needs 3 Flawless Topaz" },
    { id: "flawless_amethyst", name: "Flawless Amethyst", refinedName: "Masterwork Amethyst", reqLevel: 10, img: "images/gems/flawless_amethyst.png", refinedImg: "images/gems/masterwork_amethyst.png", needText: "Needs 3 Flawless Amethyst" }
  ];

  const EXQUISITE_RECIPES = [
    { id: "masterwork_ruby", name: "Masterwork Ruby", refinedName: "Exquisite Ruby", reqLevel: 15, img: "images/gems/masterwork_ruby.png", refinedImg: "images/gems/exquisite_ruby.png", needText: "Needs 3 Masterwork Ruby" },
    { id: "masterwork_sapphire", name: "Masterwork Sapphire", refinedName: "Exquisite Sapphire", reqLevel: 15, img: "images/gems/masterwork_sapphire.png", refinedImg: "images/gems/exquisite_sapphire.png", needText: "Needs 3 Masterwork Sapphire" },
    { id: "masterwork_emerald", name: "Masterwork Emerald", refinedName: "Exquisite Emerald", reqLevel: 15, img: "images/gems/masterwork_emerald.png", refinedImg: "images/gems/exquisite_emerald.png", needText: "Needs 3 Masterwork Emerald" },
    { id: "masterwork_topaz", name: "Masterwork Topaz", refinedName: "Exquisite Topaz", reqLevel: 15, img: "images/gems/masterwork_topaz.png", refinedImg: "images/gems/exquisite_topaz.png", needText: "Needs 3 Masterwork Topaz" },
    { id: "masterwork_amethyst", name: "Masterwork Amethyst", refinedName: "Exquisite Amethyst", reqLevel: 15, img: "images/gems/masterwork_amethyst.png", refinedImg: "images/gems/exquisite_amethyst.png", needText: "Needs 3 Masterwork Amethyst" }
  ];

  const GEM_VIEWS = {
    refine: { title: "Refine Gems", recipes: REFINE_RECIPES },
    flawless: { title: "Flawless Gems", recipes: FLAWLESS_RECIPES },
    masterwork: { title: "Masterwork Gems", recipes: MASTERWORK_RECIPES },
    exquisite: { title: "Exquisite Gems", recipes: EXQUISITE_RECIPES }
  };

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

  let activeMainTab = "gemcrafting";
  let activeGemView = "home";
  let currentHref = window.location.href;

  function loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function roundLevelXP(v){
    v = Math.max(1, Math.round(Number(v) || 1));
    if (v >= 10000000) return Math.ceil(v / 50000) * 50000;
    if (v >= 1000000) return Math.ceil(v / 10000) * 10000;
    if (v >= 100000) return Math.ceil(v / 5000) * 5000;
    if (v >= 10000) return Math.ceil(v / 500) * 500;
    if (v >= 1000) return Math.ceil(v / 100) * 100;
    return Math.round(v);
  }

  function xpNextForLevel(level){
    const L = Math.max(1, Math.floor(Number(level) || 1));
    let xp = 100;
    for (let cur = 2; cur <= L; cur++) {
      const prev = cur - 1;
      let rate = 1.01;
      if (prev <= 3) rate = 2.0;
      else if (prev <= 6) rate = 1.5;
      else if (prev <= 10) rate = 1.3;
      else if (prev <= 20) rate = 1.18;
      else if (prev <= 35) rate = 1.12;
      else if (prev <= 50) rate = 1.10;
      else if (prev <= 70) rate = 1.075;
      else if (prev <= 85) rate = 1.06;
      else if (prev <= 99) rate = 1.05;
      else if (prev <= 105) rate = 1.05 - 0.002 * (prev - 100);
      else if (prev <= 200) {
        const t = (prev - 105) / 95;
        rate = 1.04 - 0.03 * t;
      }
      xp *= rate;
    }
    return roundLevelXP(xp);
  }

  function xpBarGradient(pct){
    if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
    if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
    if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
    return "linear-gradient(90deg,#2f9e5b,#7be39e)";
  }

  function ensureSave(save) {
    save = save && typeof save === "object" ? save : {};
    save.jewelcraftingLevel = Math.max(1, num(save.jewelcraftingLevel, 1));
    save.jewelcraftingXP = Math.max(0, num(save.jewelcraftingXP, 0));
    save.jewelcraftingXPNext = Math.max(1, num(save.jewelcraftingXPNext, xpNextForLevel(save.jewelcraftingLevel)));
    return save;
  }

  function getViewFromHref(href = window.location.href) {
    try {
      const url = new URL(href, window.location.origin);
      const view = String(url.searchParams.get("view") || "").trim().toLowerCase();
      return GEM_VIEWS[view] ? view : "home";
    } catch {
      return "home";
    }
  }

  function renderHeader() {
    const save = ensureSave(loadSave());
    const lvlEl = document.getElementById("jewelcraftLevel");
    const curEl = document.getElementById("jewelcraftXPCurrent");
    const nextEl = document.getElementById("jewelcraftXPNext");
    const barEl = document.getElementById("jewelcraftXPBar");
    if (lvlEl) lvlEl.textContent = String(save.jewelcraftingLevel);
    if (curEl) curEl.textContent = String(save.jewelcraftingXP);
    if (nextEl) nextEl.textContent = String(save.jewelcraftingXPNext);
    const pct = save.jewelcraftingXPNext > 0 ? Math.max(0, Math.min(100, (save.jewelcraftingXP / save.jewelcraftingXPNext) * 100)) : 0;
    if (barEl) {
      barEl.style.width = `${pct.toFixed(1)}%`;
      barEl.style.background = xpBarGradient(pct);
    }
  }

  function openGemView(view) {
    const href = view === "home" ? "jewelcrafting.html" : `jewelcrafting.html?view=${encodeURIComponent(view)}`;
    if (window.DSUI?.navigateWithinShell?.(href, { force: true })) return;
    window.location.href = href;
  }

  function renderRecipeCard(grid, recipe) {
    const save = ensureSave(loadSave());
    const locked = save.jewelcraftingLevel < recipe.reqLevel;
    const card = document.createElement("div");
    card.className = "profChoiceCard";
    card.style.display = "flex";
    card.style.gap = "12px";
    card.style.alignItems = "center";
    card.style.padding = "12px";
    card.style.borderRadius = "12px";
    card.style.cursor = locked ? "not-allowed" : "pointer";
    card.style.opacity = locked ? "0.55" : "1";
    if (!locked) card.dataset.openTabHref = `jewelcrafting_action.html?recipe=${encodeURIComponent(recipe.id)}`;

    const img = document.createElement("img");
    img.src = recipe.refinedImg || recipe.img;
    img.alt = recipe.refinedName;
    img.className = "profChoiceThumb";
    img.style.width = "64px";
    img.style.height = "64px";
    img.style.borderRadius = "12px";
    img.style.objectFit = "cover";

    const info = document.createElement("div");
    info.style.flex = "1";

    const title = document.createElement("div");
    title.className = "profChoiceTitle";
    title.style.fontWeight = "900";
    title.style.fontSize = "16px";
    title.textContent = recipe.refinedName;

    const req = document.createElement("div");
    req.className = "profChoiceMeta";
    req.style.marginTop = "4px";
    req.style.color = locked ? "#ff9090" : "";
    req.textContent = `Req Lv ${recipe.reqLevel}`;

    const meta = document.createElement("div");
    meta.className = "profChoiceMeta";
    meta.style.marginTop = "6px";
    meta.textContent = recipe.needText || "";

    info.appendChild(title);
    info.appendChild(req);
    info.appendChild(meta);
    card.appendChild(img);
    card.appendChild(info);

    if (!locked) {
      card.addEventListener("click", () => {
        const href = `jewelcrafting_action.html?recipe=${encodeURIComponent(recipe.id)}`;
        if (window.DSUI?.navigateWithinShell?.(href)) return;
        window.location.href = href;
      });
    }

    grid.appendChild(card);
  }

  function renderGemcraftingHome() {
    const grid = document.getElementById("gemcraftingCategoryGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const save = ensureSave(loadSave());
    [
      { view: "refine", title: "Refine", meta: "", img: "images/gems/refined_ruby.png", reqLevel: 1 },
      { view: "flawless", title: "Flawless", meta: "Req Level 5", img: "images/gems/flawless_ruby.png", reqLevel: 5 },
      { view: "masterwork", title: "Masterwork", meta: "Req Level 10", img: "images/gems/masterwork_ruby.png", reqLevel: 10 },
      { view: "exquisite", title: "Exquisite", meta: "Req Level 15", img: "images/gems/exquisite_ruby.png", reqLevel: 15 }
    ].forEach((entry) => {
      const locked = save.jewelcraftingLevel < entry.reqLevel;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "gemStageCard";
      card.style.width = "100%";
      card.disabled = locked;
      card.style.opacity = locked ? "0.58" : "1";
      card.style.cursor = locked ? "not-allowed" : "pointer";

      const img = document.createElement("img");
      img.src = entry.img;
      img.alt = entry.title;
      img.className = "gemStageIcon";
      if (locked) img.style.filter = "grayscale(.35) brightness(.82)";

      const label = document.createElement("div");
      label.className = "gemStageLabel";
      const title = document.createElement("span");
      title.className = "gemStageTitle";
      title.textContent = entry.title;
      const meta = document.createElement("span");
      meta.className = "gemStageMeta";
      meta.textContent = entry.meta || "";

      label.appendChild(title);
      label.appendChild(meta);
      card.appendChild(img);
      card.appendChild(label);
      if (!locked) card.addEventListener("click", () => openGemView(entry.view));
      grid.appendChild(card);
    });
  }

  function renderGemcraftingDetail() {
    const homeEl = document.getElementById("gemcraftingHome");
    const detailEl = document.getElementById("gemcraftingDetail");
    const titleEl = document.getElementById("gemcraftingDetailTitle");
    const grid = document.getElementById("gemcraftingDetailGrid");
    if (!homeEl || !detailEl || !titleEl || !grid) return;

    if (activeGemView === "home" || !GEM_VIEWS[activeGemView]) {
      homeEl.style.display = "";
      detailEl.style.display = "none";
      return;
    }

    homeEl.style.display = "none";
    detailEl.style.display = "";
    titleEl.textContent = GEM_VIEWS[activeGemView].title;
    grid.innerHTML = "";
    GEM_VIEWS[activeGemView].recipes.forEach((recipe) => renderRecipeCard(grid, recipe));
  }

  function updateTabs() {
    const tabsRow = document.getElementById("jewelcraftTabs");
    const gemBtn = document.getElementById("tabGemcrafting");
    const jewelBtn = document.getElementById("tabJewelcrafting");
    const gemPanel = document.getElementById("gemcraftingPanel");
    const jewelPanel = document.getElementById("jewelcraftingPanel");
    const showTopTabs = activeMainTab !== "gemcrafting" || activeGemView === "home";
    if (tabsRow) tabsRow.style.display = showTopTabs ? "flex" : "none";
    if (gemBtn) gemBtn.classList.toggle("is-active", activeMainTab === "gemcrafting");
    if (jewelBtn) jewelBtn.classList.toggle("is-active", activeMainTab === "jewelcrafting");
    if (gemPanel) gemPanel.style.display = activeMainTab === "gemcrafting" ? "" : "none";
    if (jewelPanel) jewelPanel.style.display = activeMainTab === "jewelcrafting" ? "" : "none";
    renderGemcraftingDetail();
  }

  function bindEvents() {
    document.getElementById("tabGemcrafting")?.addEventListener("click", () => {
      activeMainTab = "gemcrafting";
      updateTabs();
    });
    document.getElementById("tabJewelcrafting")?.addEventListener("click", () => {
      activeMainTab = "jewelcrafting";
      updateTabs();
    });
    document.getElementById("gemcraftingBackBtn")?.addEventListener("click", () => {
      openGemView("home");
    });
  }

  function mount(root = null, href = window.location.href) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    currentHref = href;
    activeGemView = getViewFromHref(href);
    left.innerHTML = JEWELCRAFTING_TEMPLATE;
    document.title = "Darkstone Chronicles - Jewelcrafting";
    activeMainTab = "gemcrafting";
    renderHeader();
    renderGemcraftingHome();
    updateTabs();
    bindEvents();
    return true;
  }

  function currentPage() {
    return String(window.location.pathname || "").split("/").pop().toLowerCase() || "index.html";
  }

  window.DSJewelcrafting = { mount };

  window.addEventListener("DOMContentLoaded", () => {
    if (currentPage() !== "jewelcrafting.html") return;
    mount(null, window.location.href);
  });
})();
