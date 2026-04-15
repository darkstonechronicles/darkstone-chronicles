(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const FORGE_TEMPLATE = `
    <div style="max-width:340px;margin:0 auto 12px;">
      <div style="background:#151520;border:2px solid #333;border-radius:12px;padding:10px 12px;width:100%;">
        <div style="font-weight:900;font-size:18px;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;text-align:center;">
          <span aria-hidden="true">&#9874;&#65039;</span>
          <span>Forge Lvl: <span id="bsLevel">1</span></span>
        </div>
        <div style="width:100%;">
          <div style="height:12px;background:#0f0f16;border:1px solid #2a2a3a;border-radius:999px;overflow:hidden;position:relative;">
            <div id="bsXPBar" style="height:100%;width:0%;background:#7dff9f;"></div>
            <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
            <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="bsXPCurrent">0</span>/<span id="bsXPNext">100</span></div>
          </div>
        </div>
      </div>
    </div>

    <div style="max-width:900px;margin:0 auto;">
      <div id="forgeTabs">
        <button id="tabSmelt" class="forgeTabBtn is-active" type="button">Smelt Bars</button>
        <button id="tabCraft" class="forgeTabBtn" type="button">Craft Items</button>
      </div>

      <div id="forgeSmeltPanel">
        <h2 style="margin:0 0 10px;">Choose a Bar to Smelt</h2>
        <div id="barGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;"></div>
      </div>

      <div id="forgeCraftPanel" style="display:none;">
        <h2 style="margin:0 0 10px;">Craft Items</h2>
        <div id="craftCategoryView">
          <div id="craftMaterialTabs" style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px;"></div>
        </div>
        <div id="craftItemsView" style="display:none;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;">
            <div id="craftItemsTitle" style="font-size:18px;font-weight:800;"></div>
            <button id="craftBackBtn" type="button" style="padding:8px 12px;border-radius:10px;border:2px solid #2a2a3a;background:#151520;color:#cfcfe6;font-weight:800;cursor:pointer;">Back</button>
          </div>
          <div id="craftGrid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;"></div>
        </div>
      </div>
    </div>
  `;

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

  let bsLevel = null;
  let bsXPCurrent = null;
  let bsXPNext = null;
  let bsXPBar = null;
  let tabSmelt = null;
  let tabCraft = null;
  let forgeSmeltPanel = null;
  let forgeCraftPanel = null;
  let barGrid = null;
  let craftMaterialTabs = null;
  let craftCategoryView = null;
  let craftItemsView = null;
  let craftItemsTitle = null;
  let craftGrid = null;
  let craftBackBtn = null;

  let activeTab = "smelt";
  let selectedMaterialId = "";
  let eventsBound = false;

  function loadSave(){
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
  function ensureForge(save){
    save = save && typeof save === "object" ? save : {};
    save.blacksmithLevel = Math.max(1, Math.floor(num(save.blacksmithLevel, 1)));
    save.blacksmithXP = Math.max(0, Math.floor(num(save.blacksmithXP, 0)));
    save.blacksmithXPNext = xpNextForLevel(save.blacksmithLevel);
    return save;
  }

  const MATERIALS = [
    { id:"copper", name:"Copper", reqLevel:1 },
    { id:"silver", name:"Silver", reqLevel:10 },
    { id:"iron", name:"Iron", reqLevel:20 },
    { id:"mithril", name:"Mithril", reqLevel:30 },
    { id:"adamant", name:"Adamant", reqLevel:40 },
    { id:"obsidian", name:"Obsidian", reqLevel:50 },
    { id:"crystal", name:"Crystal", reqLevel:60 },
    { id:"sulfur", name:"Sulfur", reqLevel:70 },
    { id:"rose_quartz", name:"Rose Quartz", reqLevel:80 },
    { id:"darkstone", name:"Darkstone", reqLevel:90 }
  ];
  const MAIN_HAND_NAMES = {
    copper: "Sword",
    silver: "Mace",
    iron: "Axe",
    mithril: "Sword",
    adamant: "Axe",
    obsidian: "Sword",
    crystal: "Sword",
    sulfur: "Sword",
    rose_quartz: "Sword",
    darkstone: "Mace"
  };
  const CRAFT_SLOTS = [
    { id:"helmet", label:"Helmet" },
    { id:"chest", label:"Chest" },
    { id:"belt", label:"Belt" },
    { id:"pants", label:"Pants" },
    { id:"gloves", label:"Gloves" },
    { id:"boots", label:"Boots" },
    { id:"main_hand", label:"Main Hand" },
    { id:"shield", label:"Shield" },
    { id:"bracers", label:"Bracers" },
    { id:"shoulders", label:"Shoulders" }
  ];

  function smeltRecipeId(material){ return `${material.id}_bar`; }
  function craftRecipeId(material, slotDef){ return `${material.id}_${slotDef.id}`; }
  function craftItemName(material, slotDef){
    const suffix = slotDef.id === "main_hand" ? (MAIN_HAND_NAMES[material.id] || slotDef.label) : slotDef.label;
    return `${material.name} ${suffix}`;
  }
  function openRecipe(recipeId){
    const href = `forge_action.html?recipe=${encodeURIComponent(recipeId)}`;
    if (window.DSUI?.navigateWithinShell?.(href)) return;
    window.location.href = href;
  }
  function button(label, disabled, onClick){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "townBtn";
    btn.textContent = label;
    btn.style.minWidth = "120px";
    btn.style.padding = "10px 14px";
    if (disabled) {
      btn.disabled = true;
      btn.style.opacity = ".55";
      btn.style.cursor = "not-allowed";
    } else {
      btn.addEventListener("click", onClick);
    }
    return btn;
  }
  function makeCard(){
    const card = document.createElement("div");
    card.style.background = "#151520";
    card.style.border = "2px solid #333";
    card.style.borderRadius = "14px";
    card.style.padding = "14px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "10px";
    card.style.minHeight = "220px";
    return card;
  }
  function makeImage(src, bg){
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.style.width = "86px";
    img.style.height = "86px";
    img.style.objectFit = "contain";
    img.style.display = "block";
    img.style.margin = "0 auto";
    img.style.background = bg || "#0f0f16";
    img.style.border = "1px solid #2a2a3a";
    img.style.borderRadius = "12px";
    return img;
  }

  function bindDom() {
    bsLevel = document.getElementById("bsLevel");
    bsXPCurrent = document.getElementById("bsXPCurrent");
    bsXPNext = document.getElementById("bsXPNext");
    bsXPBar = document.getElementById("bsXPBar");
    tabSmelt = document.getElementById("tabSmelt");
    tabCraft = document.getElementById("tabCraft");
    forgeSmeltPanel = document.getElementById("forgeSmeltPanel");
    forgeCraftPanel = document.getElementById("forgeCraftPanel");
    barGrid = document.getElementById("barGrid");
    craftMaterialTabs = document.getElementById("craftMaterialTabs");
    craftCategoryView = document.getElementById("craftCategoryView");
    craftItemsView = document.getElementById("craftItemsView");
    craftItemsTitle = document.getElementById("craftItemsTitle");
    craftGrid = document.getElementById("craftGrid");
    craftBackBtn = document.getElementById("craftBackBtn");
    eventsBound = false;
  }

  function renderHeader(){
    const save = ensureForge(loadSave());
    if (bsLevel) bsLevel.textContent = String(save.blacksmithLevel);
    if (bsXPCurrent) bsXPCurrent.textContent = String(save.blacksmithXP);
    if (bsXPNext) bsXPNext.textContent = String(save.blacksmithXPNext);
    const pct = save.blacksmithXPNext > 0 ? Math.max(0, Math.min(100, (save.blacksmithXP / save.blacksmithXPNext) * 100)) : 0;
    if (bsXPBar) {
      bsXPBar.style.width = `${pct.toFixed(1)}%`;
      bsXPBar.style.background = xpBarGradient(pct);
    }
  }

  function renderSmeltCards(){
    if (!barGrid) return;
    const save = ensureForge(loadSave());
    barGrid.innerHTML = "";
    MATERIALS.forEach((material) => {
      const locked = save.blacksmithLevel < material.reqLevel;
      const card = document.createElement("div");
      card.style.background = "#151520";
      card.style.border = "2px solid #333";
      card.style.borderRadius = "12px";
      card.style.padding = "12px";
      card.style.cursor = locked ? "not-allowed" : "pointer";
      card.style.opacity = locked ? "0.55" : "1";
      card.style.display = "flex";
      card.style.gap = "12px";
      card.style.alignItems = "center";
      if (!locked) card.dataset.openTabHref = `forge_action.html?recipe=${encodeURIComponent(smeltRecipeId(material))}`;

      const img = document.createElement("img");
      img.src = `images/bars/${smeltRecipeId(material)}.png`;
      img.alt = `${material.name} Bar`;
      img.style.width = "64px";
      img.style.height = "64px";
      img.style.borderRadius = "12px";
      img.style.border = "2px solid #333";
      img.style.objectFit = "cover";
      img.style.background = "#0f0f16";
      img.onerror = () => { img.style.display = "none"; };

      const info = document.createElement("div");
      info.style.flex = "1";

      const title = document.createElement("div");
      title.style.fontWeight = "900";
      title.style.fontSize = "16px";
      title.textContent = `${material.name} Bar`;

      const req = document.createElement("div");
      req.style.opacity = ".88";
      req.style.marginTop = "4px";
      req.style.color = locked ? "#ff9090" : "";
      req.textContent = `Req Lv ${material.reqLevel}`;

      const cost = document.createElement("div");
      cost.style.opacity = ".85";
      cost.style.marginTop = "6px";
      cost.textContent = `Needs 5 ${material.name} Ore`;

      info.appendChild(title);
      info.appendChild(req);
      info.appendChild(cost);

      card.appendChild(img);
      card.appendChild(info);

      if (!locked) card.addEventListener("click", () => openRecipe(smeltRecipeId(material)));
      barGrid.appendChild(card);
    });
  }

  function renderCraftMaterials(){
    if (!craftMaterialTabs) return;
    const save = ensureForge(loadSave());
    craftMaterialTabs.innerHTML = "";
    craftMaterialTabs.style.display = "grid";
    craftMaterialTabs.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
    craftMaterialTabs.style.gap = "12px";

    MATERIALS.forEach((material) => {
      const locked = save.blacksmithLevel < material.reqLevel;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.background = "#151520";
      btn.style.border = selectedMaterialId === material.id && !locked ? "2px solid #5f8cff" : "2px solid #333";
      btn.style.borderRadius = "12px";
      btn.style.padding = "12px 10px";
      btn.style.display = "flex";
      btn.style.flexDirection = "column";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.gap = "4px";
      btn.style.cursor = locked ? "not-allowed" : "pointer";
      btn.style.opacity = locked ? ".55" : "1";
      btn.style.minHeight = "118px";

      const img = document.createElement("img");
      img.src = `images/items/forge_crafted/${material.id}/${material.id}_chest.png`;
      img.alt = material.name;
      img.style.width = "54px";
      img.style.height = "54px";
      img.style.borderRadius = "12px";
      img.style.border = "2px solid #333";
      img.style.objectFit = "cover";
      img.style.background = "#14361d";
      img.onerror = () => { img.style.display = "none"; };

      const label = document.createElement("div");
      label.style.fontWeight = "800";
      label.style.fontSize = "14px";
      label.style.textAlign = "center";
      label.style.lineHeight = "1.1";
      label.style.marginTop = "2px";
      label.textContent = material.name;

      const subLabel = document.createElement("div");
      subLabel.style.fontSize = "11px";
      subLabel.style.opacity = ".8";
      subLabel.style.textAlign = "center";
      subLabel.style.lineHeight = "1";
      subLabel.textContent = "Equipment";

      const reqLabel = document.createElement("div");
      reqLabel.style.fontSize = "11px";
      reqLabel.style.opacity = locked ? ".95" : ".72";
      reqLabel.style.color = locked ? "#ff9090" : "#b8b9c9";
      reqLabel.style.textAlign = "center";
      reqLabel.style.lineHeight = "1";
      reqLabel.textContent = `Req Lv ${material.reqLevel}`;

      btn.appendChild(img);
      btn.appendChild(label);
      btn.appendChild(subLabel);
      btn.appendChild(reqLabel);

      if (locked) {
        btn.disabled = true;
        btn.title = `Requires Forge Level ${material.reqLevel}`;
      } else {
        btn.addEventListener("click", () => {
          selectedMaterialId = material.id;
          renderCraftMaterials();
          renderCraftItems();
        });
      }
      craftMaterialTabs.appendChild(btn);
    });
  }

  function renderCraftItems(){
    if (!craftGrid || !craftItemsView || !craftCategoryView || !craftItemsTitle) return;
    const material = MATERIALS.find((m) => m.id === selectedMaterialId) || MATERIALS[0];
    craftCategoryView.style.display = "none";
    craftItemsView.style.display = "";
    craftItemsTitle.textContent = `${material.name} Items`;
    craftGrid.innerHTML = "";

    CRAFT_SLOTS.forEach((slotDef) => {
      const recipeId = craftRecipeId(material, slotDef);
      const card = makeCard();
      const title = document.createElement("div");
      title.style.fontWeight = "900";
      title.style.fontSize = "18px";
      title.style.textAlign = "center";
      title.style.lineHeight = "1.1";
      title.textContent = craftItemName(material, slotDef);
      const cost = document.createElement("div");
      cost.style.textAlign = "center";
      cost.style.color = "#b8b9c9";
      cost.style.fontSize = "12px";
      cost.style.lineHeight = "1.1";
      cost.textContent = `Needs 5 ${material.name} Bar`;
      card.append(
        makeImage(`images/items/forge_crafted/${material.id}/${recipeId}.png`, "#14361d"),
        title,
        cost,
        button("Craft", false, () => openRecipe(recipeId))
      );
      card.dataset.openTabHref = `forge_action.html?recipe=${encodeURIComponent(recipeId)}`;
      craftGrid.appendChild(card);
    });
  }

  function renderActiveTab(){
    tabSmelt?.classList.toggle("is-active", activeTab === "smelt");
    tabCraft?.classList.toggle("is-active", activeTab === "craft");
    if (forgeSmeltPanel) forgeSmeltPanel.style.display = activeTab === "smelt" ? "" : "none";
    if (forgeCraftPanel) forgeCraftPanel.style.display = activeTab === "craft" ? "" : "none";

    if (activeTab === "smelt") {
      renderSmeltCards();
      return;
    }

    if (!selectedMaterialId) {
      const save = ensureForge(loadSave());
      selectedMaterialId = (MATERIALS.find((m) => save.blacksmithLevel >= m.reqLevel) || MATERIALS[0]).id;
    }
    if (craftCategoryView) craftCategoryView.style.display = "";
    if (craftItemsView) craftItemsView.style.display = "none";
    renderCraftMaterials();
  }

  function bindEvents() {
    if (eventsBound) return;
    tabSmelt?.addEventListener("click", () => {
      activeTab = "smelt";
      renderActiveTab();
    });
    tabCraft?.addEventListener("click", () => {
      activeTab = "craft";
      renderActiveTab();
    });
    craftBackBtn?.addEventListener("click", () => {
      if (craftCategoryView) craftCategoryView.style.display = "";
      if (craftItemsView) craftItemsView.style.display = "none";
    });
    eventsBound = true;
  }

  function renderForgeView() {
    renderHeader();
    renderActiveTab();
  }

  function mountForge(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = FORGE_TEMPLATE;
    document.title = "Darkstone Chronicles - Forge";
    bindDom();
    bindEvents();
    renderForgeView();
    return true;
  }

  function initStandaloneForge() {
    if (!document.getElementById("tabSmelt")) return false;
    document.title = "Darkstone Chronicles - Forge";
    bindDom();
    bindEvents();
    renderForgeView();
    return true;
  }

  window.DSForge = { mount: mountForge };
  window.addEventListener("DOMContentLoaded", () => { initStandaloneForge(); });
  window.addEventListener("ds:save", renderForgeView);
})();
