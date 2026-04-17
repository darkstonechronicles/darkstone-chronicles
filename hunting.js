(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const HUNTING_TEMPLATE = `
    <div class="profXpShell">
      <div class="profXpCard">
        <div class="profXpHead">
          <span aria-hidden="true">&#127993;</span>
          <span>Hunting Lvl: <span id="huntLevel">1</span></span>
        </div>
        <div style="width:100%;">
          <div class="profXpTrack">
            <div id="huntXPBar" style="height:100%;width:0%;background:#ffaa00;"></div>
            <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
            <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="huntXPCurrent">0</span>/<span id="huntXPNext">100</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="profSection">
      <h2 class="profSectionTitle">Choose a Target</h2>
      <div id="targetGrid" class="profChoiceGrid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));"></div>
      <div id="msg" style="margin-top:12px;opacity:.9;text-align:center;"></div>
    </div>
  `;

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }
  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function xpBarGradient(pct){
    if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
    if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
    if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
    return "linear-gradient(90deg,#2f9e5b,#7be39e)";
  }
  function ensureHunting(save){
    save = save && typeof save === "object" ? save : {};
    if (!Number.isFinite(Number(save.huntingLevel))) save.huntingLevel = 1;
    if (!Number.isFinite(Number(save.huntingXP))) save.huntingXP = 0;
    if (!Number.isFinite(Number(save.huntingXPNext))) save.huntingXPNext = 100;
    if (!Array.isArray(save.inventory)) save.inventory = [];
    if (!Number.isFinite(Number(save.inventoryMaxSlots))) save.inventoryMaxSlots = 1000;
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

  const TARGETS = [
    { id:"shadow_hare", name:"Shadow Hare", req:1, img:"images/hunting/shadow_hare.png", rawName:"Raw Shadow Hare Meat", rawImg:"images/meat/shadow_hare_raw.png" },
    { id:"rotfeather_turkey", name:"Rotfeather Turkey", req:10, img:"images/hunting/rotfeather_turkey.png", rawName:"Raw Rotfeather Turkey Meat", rawImg:"images/meat/rotfeather_turkey_raw.png" },
    { id:"gloom_fox", name:"Gloom Fox", req:20, img:"images/hunting/gloom_fox.png", rawName:"Raw Gloom Fox Meat", rawImg:"images/meat/gloom_fox_raw.png" },
    { id:"bloodtusk_boar", name:"Bloodtusk Boar", req:30, img:"images/hunting/bloodtusk_boar.png", rawName:"Raw Bloodtusk Boar Meat", rawImg:"images/meat/bloodtusk_boar_raw.png" },
    { id:"night_wolf", name:"Night Wolf", req:40, img:"images/hunting/night_wolf.png", rawName:"Raw Night Wolf Meat", rawImg:"images/meat/night_wolf_raw.png" },
    { id:"stonehorn_ram", name:"Stonehorn Ram", req:50, img:"images/hunting/stonehorn_ram.png", rawName:"Raw Stonehorn Ram Meat", rawImg:"images/meat/stonehorn_ram_raw.png" },
    { id:"thorn_stag", name:"Thorn Stag", req:60, img:"images/hunting/thorn_stag.png", rawName:"Raw Thorn Stag Meat", rawImg:"images/meat/thorn_stag_raw.png" },
    { id:"grave_bear", name:"Grave Bear", req:70, img:"images/hunting/grave_bear.png", rawName:"Raw Grave Bear Meat", rawImg:"images/meat/bear_raw.png" },
    { id:"dire_warg", name:"Dire Warg", req:80, img:"images/hunting/dire_warg.png", rawName:"Raw Dire Warg Meat", rawImg:"images/meat/dire_warg_raw.png" },
    { id:"forest_troll", name:"Forest Troll", req:90, img:"images/hunting/forest_troll.png", rawName:"Raw Forest Troll Meat", rawImg:"images/meat/troll_raw.png" }
  ];

  function countByName(inv, name){
    const it = inv.find((x) => x && String(x.name || "").toLowerCase() === String(name).toLowerCase());
    if (!it) return 0;
    return Math.max(1, num(it.quantity ?? it.qty, 1));
  }
  function usedUnits(inv){
    let used = 0;
    for (const it of inv){
      if (!it) continue;
      used += Math.max(1, num(it.quantity ?? it.qty, 1));
    }
    return used;
  }
  function showCardNotice(card, text){
    if (!card) return;
    card.querySelector(".huntCardNotice")?.remove();
    const notice = document.createElement("div");
    notice.className = "huntCardNotice";
    notice.textContent = text;
    notice.style.marginTop = "10px";
    notice.style.padding = "8px 10px";
    notice.style.borderRadius = "10px";
    notice.style.border = "1px solid rgba(255,120,120,.35)";
    notice.style.background = "rgba(120,26,32,.28)";
    notice.style.color = "#ffb3b3";
    notice.style.fontSize = "12px";
    notice.style.fontWeight = "800";
    notice.style.textAlign = "center";
    card.appendChild(notice);
    window.setTimeout(() => {
      if (notice.isConnected) notice.remove();
    }, 2200);
  }

  function renderHeader(){
    const s = ensureHunting(loadSave());
    const lvlEl = document.getElementById("huntLevel");
    const curEl = document.getElementById("huntXPCurrent");
    const nextEl = document.getElementById("huntXPNext");
    const barEl = document.getElementById("huntXPBar");
    if (lvlEl) lvlEl.textContent = String(s.huntingLevel);
    if (curEl) curEl.textContent = String(s.huntingXP);
    if (nextEl) nextEl.textContent = String(s.huntingXPNext);
    const pct = s.huntingXPNext > 0 ? clamp((s.huntingXP / s.huntingXPNext) * 100, 0, 100) : 0;
    if (barEl) {
      barEl.style.width = pct.toFixed(1) + "%";
      barEl.style.background = xpBarGradient(pct);
    }
  }

  function renderTargets(){
    const s = ensureHunting(loadSave());
    const grid = document.getElementById("targetGrid");
    if (!grid) return;
    const arrows = countByName(s.inventory, "Arrows");
    const full = usedUnits(s.inventory) >= num(s.inventoryMaxSlots, 1000);
    grid.innerHTML = "";

    TARGETS.forEach((t) => {
      const effectiveLevel = s.huntingLevel + getGatheringPotionBonus(s);
      const locked = effectiveLevel < t.req;
      const card = document.createElement("div");
      card.className = "profChoiceCard";
      card.style.padding = "12px";
      card.style.cursor = locked ? "not-allowed" : "pointer";
      card.style.opacity = locked ? ".6" : "1";
      if (!locked) card.dataset.openTabHref = `hunting_action.html?target=${encodeURIComponent(t.id)}`;

      card.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${t.img}" alt="${t.name}" class="profChoiceThumb" style="width:74px;height:74px;border-radius:12px;object-fit:cover;">
          <div style="flex:1;text-align:left;">
            <div class="profChoiceTitle" style="font-weight:900;font-size:18px;">${t.name}</div>
            <div class="profChoiceMeta" style="font-size:12px;margin-top:4px;">Requires Hunting Level <b>${t.req}</b></div>
            <div class="profChoiceMeta" style="font-size:12px;margin-top:6px;display:flex;align-items:center;gap:6px;">
              <span>Drops:</span>
              <img src="${t.rawImg}" style="width:22px;height:22px;border-radius:6px;border:1px solid #333;background:#0f0f16;">
              <b>${t.rawName}</b>
            </div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        if (locked) {
          showCardNotice(card, `Requires Hunting Level ${t.req}.`);
          return;
        }
        if (full) {
          showCardNotice(card, "No more inventory space.");
          return;
        }
        if (arrows <= 0) {
          showCardNotice(card, "You need Arrows.");
          return;
        }
        const href = String(card.dataset.openTabHref || `hunting_action.html?target=${encodeURIComponent(t.id)}`);
        if (window.DSUI?.navigateWithinShell?.(href)) return;
        window.location.href = href;
      });

      grid.appendChild(card);
    });
  }

  function renderHuntingView() {
    if (!document.getElementById("targetGrid")) return;
    renderHeader();
    renderTargets();
  }

  function mountHunting(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = HUNTING_TEMPLATE;
    document.title = "Darkstone Chronicles - Hunting";
    renderHuntingView();
    return true;
  }

  function initStandaloneHunting() {
    if (!document.getElementById("targetGrid")) return false;
    document.title = "Darkstone Chronicles - Hunting";
    renderHuntingView();
    return true;
  }

  window.DSHunting = {
    mount: mountHunting,
    getAdminItems: () => TARGETS.map((t) => ({
      type: "meat",
      id: `${t.id}_raw`,
      name: t.rawName,
      img: t.rawImg,
      quantity: 1
    }))
  };
  window.addEventListener("DOMContentLoaded", () => { initStandaloneHunting(); });
  window.addEventListener("ds:save", renderHuntingView);
})();
