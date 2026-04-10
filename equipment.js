// equipment.js — Darkstone Chronicles (Paperdoll Equip UI + Stats Breakout + Set Bonus)
// ✅ recomputeTotals (base + gear) + Cryptwarden set bonus (2/4=2%, 3/4=4%, 4/4=6% total ATK)
// ✅ writes: attackTotal/defenseTotal + _atkBase/_defBase/_atkFromGear/_defFromGear/setBonusAtkPct
// ✅ renders breakout UI IF you have elements with these ids:
//    baseAtk, baseDef, gearAtk, gearDef, setPct, totalAtk, totalDef

(() => {
  const SAVE_KEY = "darkstone_save_v1";

  // ---------- helpers ----------
  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function itemStackKey(it){
    return [
      it.type || "",
      it.crafted ? "crafted" : "",
      it.name || "",
      it.baseName || "",
      it.setId || "",
      it.slot || "",
      it.reqLevel ?? 1,
      it.atk ?? 0,
      it.def ?? 0,
      it.rarity || "",
      it.img || "",
      it.upg ?? 0
    ].join("::");
  }

  function addToStack(arr, item, qty = 1){
    const key = itemStackKey(item);
    const ex = arr.find(i => i && itemStackKey(i) === key);
    if (ex) ex.quantity = num(ex.quantity, 1) + qty;
    else arr.push({ ...item, quantity: qty });
  }

  function loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }
  function setSave(next) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  function ensureEquipment(save) {
    save = save && typeof save === "object" ? save : {};

    if (!Array.isArray(save.inventory)) save.inventory = [];
    if (!save.equipment || typeof save.equipment !== "object") save.equipment = {};

    const slots = [
      "mainHand","offHand",
      "helmet","shoulders",
      "chest","bracers","gloves",
      "belt","pants","boots",
      "ring","amulet"
    ];
    for (const k of slots) if (!(k in save.equipment)) save.equipment[k] = null;

    // ✅ HARD FLOOR so you never see 0 bases by accident
    save.heroLevel   = Math.max(1, num(save.heroLevel, 1));
    save.heroAttack  = Math.max(10, num(save.heroAttack, 10));
    save.heroDefense = Math.max(10, num(save.heroDefense, 10));
    save.barracksLevel = Math.max(0, Math.round(num(save.barracksLevel, 0)));
    save.cryptHallLevel = Math.max(0, Math.round(num(save.cryptHallLevel, 0)));
    save.minerHutLevel = Math.max(0, Math.round(num(save.minerHutLevel, 0)));
    save.forgeAcademyLevel = Math.max(0, Math.round(num(save.forgeAcademyLevel, 0)));

    return save;
  }

  function getSave() {
    return ensureEquipment(loadSave());
  }

  // ---------- set bonus ----------
  function getSetCounts(equipment) {
    const counts = {};
    Object.values(equipment || {}).forEach(it => {
      if (!it) return;
      const sid = String(it.setId || "").toLowerCase();
      if (sid) {
        counts[sid] = (counts[sid] || 0) + 1;
        return;
      }
      const n = String(it.baseName || it.name || "").toLowerCase();
      if (n.includes("cryptwarden")) counts.cryptwarden = (counts.cryptwarden || 0) + 1;
    });
    return counts;
  }

  function tierPct(count, tiers){
    let pct = 0;
    for (const [need, val] of tiers){
      if (count >= need) pct = val;
    }
    return pct;
  }

  function getSetBonusPcts(equipment) {
    const counts = getSetCounts(equipment);
    const cryptCount = counts.cryptwarden || 0;
    const iceCount = counts.icewarden || 0;
    const frostCount = counts.frostveil || 0;

    const cryptAtk = tierPct(cryptCount, [[2,0.02],[3,0.04],[4,0.06]]);
    const icePct = tierPct(iceCount, [[2,0.02],[4,0.04],[6,0.06],[8,0.08],[10,0.10]]);
    const goldPct = tierPct(frostCount, [[2,0.04],[4,0.08],[6,0.12]]);

    return {
      atkPct: cryptAtk + icePct,
      defPct: icePct,
      goldPct
    };
  }

  function recomputeTotalsLocal(save) {
    // base stats
    const baseAtk = Math.max(10, num(save.heroAttack, 10));
    const baseDef = Math.max(10, num(save.heroDefense, 10));

    // gear bonuses
    let atkB = 0, defB = 0;
    Object.values(save.equipment || {}).forEach(it => {
      if (!it) return;
      atkB += Math.max(0, num(it.atk, 0));
      defB += Math.max(0, num(it.def, 0));
    });

    const petBonuses = getCombatPetBonuses(save);
    const rawAtk = baseAtk + atkB + petBonuses.atkFlat;
    const rawDef = baseDef + defB + petBonuses.defFlat;

    const bonuses = getSetBonusPcts(save.equipment);
    const atkWithSet = Math.floor(rawAtk * (1 + bonuses.atkPct + petBonuses.atkPct));
    const defWithSet = Math.floor(rawDef * (1 + bonuses.defPct + petBonuses.defPct));

    save.attackTotal = atkWithSet;
    save.defenseTotal = defWithSet;

    // breakout fields (for your equipment page table)
    save.setBonusAtkPct = bonuses.atkPct + petBonuses.atkPct;
    save.setBonusDefPct = bonuses.defPct + petBonuses.defPct;
    save.setBonusGoldPct = bonuses.goldPct;
    save._atkBase = baseAtk;
    save._defBase = baseDef;
    save._atkFromGear = atkB;
    save._defFromGear = defB;
    save._atkFromPet = petBonuses.atkFlat;
    save._defFromPet = petBonuses.defFlat;
    save._petBonusAtkPct = petBonuses.atkPct;
    save._petBonusDefPct = petBonuses.defPct;

    return save;
  }

  function buildingBonusPct(level){
    return Math.max(0, num(level, 0)) * 0.0005; // 0.05% per level
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

  function getPotionBonuses(save){
    let atkPct = 0;
    let defPct = 0;
    const cons = (save && typeof save.consumables === "object") ? save.consumables : {};
    const quickSlots = ["quick_potion1","quick_potion2"];
    const legacySlots = ["potion1","potion2"];
    const slotsToCheck = quickSlots.some((k) => cons[k]) ? quickSlots : legacySlots;
    slotsToCheck.forEach((slot) => {
      const it = cons[slot];
      if (!it) return;
      const qty = num(it.quantity ?? it.qty, 1);
      if (qty <= 0) return;
      const id = String(it.id || "").toLowerCase();
      const name = String(it.name || "").toLowerCase();
      const isStrength = id.includes("strength") || name.includes("strength potion");
      const isDefense = id.includes("defense") || name.includes("defense potion");
      if (!isStrength && !isDefense) return;
      const pct = getPotionTier(it) * 0.04;
      if (isStrength) atkPct += pct;
      if (isDefense) defPct += pct;
    });
    return { atkPct, defPct };
  }
  function getCombatPetBonuses(save){
    const api = window.DS?.pets;
    const pet = save?.pets?.combat;
    if (!api?.getCombatPetBonuses || !pet) return { atkFlat: 0, defFlat: 0, atkPct: 0, defPct: 0 };
    const bonuses = api.getCombatPetBonuses(pet) || {};
    return {
      atkFlat: num(bonuses.atkFlat, 0),
      defFlat: num(bonuses.defFlat, 0),
      atkPct: num(bonuses.atkPct, 0),
      defPct: num(bonuses.defPct, 0)
    };
  }
  function fmtSignedCompact(value){
    const v = num(value, 0);
    const abs = Math.abs(v);
    const hasDecimal = Math.abs(abs - Math.round(abs)) > 0.0001;
    const txt = hasDecimal ? abs.toFixed(1) : String(Math.round(abs));
    return `${v >= 0 ? "+" : "-"}${txt}`;
  }

  // ---------- labels ----------
  const SLOT_LABEL = {
    helmet: "Helmet",
    shoulders: "Shoulders",
    chest: "Chest",
    bracers: "Bracers",
    gloves: "Gloves",
    belt: "Belt",
    pants: "Pants",
    boots: "Boots",
    mainHand: "Main Hand",
    offHand: "Off Hand",
    ring: "Ring",
    amulet: "Amulet"
  };

  // ---------- styles ----------
  function injectEquipStylesOnce() {
    if (document.getElementById("ds-equip-styles")) return;
    const s = document.createElement("style");
    s.id = "ds-equip-styles";
    s.textContent = `
      .knightBg{
        position:absolute; inset:0;
        background:
          radial-gradient(70% 60% at 5 30%, rgba(255,255,255,.08), transparent 60%),
          radial-gradient(70% 60% at 50% 75%, rgba(255,255,255,.05), transparent 65%),
          linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,0)),
          #0f0f16;
        opacity:.95;
        pointer-events:none;
      }

      :root{
        --rarity-common:#0b0b0b;
        --rarity-uncommon:#0f141b;
        --rarity-rare:#0f1b2e;
        --rarity-epic:#1a0f2e;
        --rarity-legendary:#2b1a0b;
        --rarity-mythic:#0b2a2e;
        --rarity-set:#2a0a0d;
        --rarity-crafted:#14361d;
      }

      .pdSlot{
        position:absolute;
        width:54px;height:54px;
        transform:translateX(-50%);
        border-radius:11px;
        border:2px solid rgba(120,120,160,.65);
        background: rgba(15,15,22,.25);
        box-shadow: 0 8px 18px rgba(0,0,0,.32);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;
        user-select:none;
      }
      #paperdoll .pdSlot.dsRarity-common{background:var(--rarity-common);}
      #paperdoll .pdSlot.dsRarity-uncommon{background:var(--rarity-uncommon);}
      #paperdoll .pdSlot.dsRarity-rare{background:var(--rarity-rare);}
      #paperdoll .pdSlot.dsRarity-epic{background:var(--rarity-epic);}
      #paperdoll .pdSlot.dsRarity-legendary{background:var(--rarity-legendary);}
      #paperdoll .pdSlot.dsRarity-mythic{background:var(--rarity-mythic);}
      #paperdoll .pdSlot.dsSetItem{background:var(--rarity-set);}
      #paperdoll .pdSlot.dsCraftedItem{background:var(--rarity-crafted);}
      .pdSlot:hover{filter:brightness(1.12);}
      .pdSlot.hasItem{
        border-color: rgba(170,170,220,.85);
      }
      .pdSlot img{
        width:48px;height:48px;border-radius:9px;
        object-fit:cover;display:block;
      }
      .pdUpgBadge{
        position:absolute;
        top:-7px;
        right:-7px;
        min-width:19px;
        height:19px;
        padding:0 5px;
        border-radius:999px;
        background:#d18a1f;
        color:#111;
        font-weight:900;
        font-size:10px;
        display:flex;
        align-items:center;
        justify-content:center;
        border:2px solid #f6d58d;
        box-shadow:0 4px 12px rgba(0,0,0,.35);
        z-index:3;
        pointer-events:none;
      }
      .pdStat{
        position:absolute;
        left:50%;
        top:46px;
        transform:translateX(-50%);
        font-size:9px;
        font-weight:800;
        text-align:center;
        white-space:nowrap;
        line-height:1.1;
        text-shadow:0 1px 6px rgba(0,0,0,.7);
        pointer-events:none;
      }
      .pdStatAtk{color:#ff6b6b;}
      .pdStatDef{color:#6bff9e;}
      .pdStatSep{color:rgba(255,255,255,.6);padding:0 4px;}
      .pdEmpty{
        font-size:11px;
        opacity:.85;
        text-align:center;
        line-height:1.05;
        padding:0 4px;
        text-shadow: 0 1px 6px rgba(0,0,0,.6);
      }

      #statsTabs button{
        padding:6px 10px;
        border-radius:10px;
        border:2px solid #333;
        background:#1b1b24;
        color:#eee;
        cursor:pointer;
        font-weight:800;
        font-size:12px;
      }
      #statsTabs button:hover{
        filter:brightness(1.08);
      }
      #statsTabs button.statsTabActive{
        border-color:#e0b36a;
        background:#d4a04f;
        color:#1a1206;
        text-shadow:none;
        filter:none;
      }
    `;
    document.head.appendChild(s);
  }

  // ---------- stats breakout render ----------
  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(value);
  }

  let currentStatsTab = "fight";

function renderBreakout() {
  const s = getSave();

  // σιγουρέψου ότι τα totals/breakouts είναι φρέσκα
  recomputeTotalsLocal(s);
  setSave(s);

  const baseAtk = num(s._atkBase, 0);
  const baseDef = num(s._defBase, 0);
  const ga = num(s._atkFromGear, 0);
  const gd = num(s._defFromGear, 0);
  const petAtk = num(s._atkFromPet, 0);
  const petDef = num(s._defFromPet, 0);

  const rawAtk = baseAtk + ga + petAtk;
  const rawDef = baseDef + gd + petDef;

  const setAtk = num(s.setBonusAtkPct, 0);
  const setDef = num(s.setBonusDefPct, 0);
  const petPctAtk = num(s._petBonusAtkPct, 0);
  const petPctDef = num(s._petBonusDefPct, 0);
  const bPct = (currentStatsTab === "dungeon")
    ? buildingBonusPct(s.cryptHallLevel)
    : buildingBonusPct(s.barracksLevel);
  const potionBonuses = getPotionBonuses(s);

  const basePctAtk = setAtk + bPct;
  const basePctDef = setDef + bPct;

  const baseTotalAtk = Math.floor(rawAtk * (1 + basePctAtk));
  const baseTotalDef = Math.floor(rawDef * (1 + basePctDef));
  const totalAtk = Math.floor(baseTotalAtk * (1 + potionBonuses.atkPct));
  const totalDef = Math.floor(baseTotalDef * (1 + potionBonuses.defPct));
  const pctAtk = ((1 + basePctAtk) * (1 + potionBonuses.atkPct)) - 1;
  const pctDef = ((1 + basePctDef) * (1 + potionBonuses.defPct)) - 1;

  // base
  setText("baseAtk", baseAtk);
  setText("baseDef", baseDef);

  // gear (με +)
  setText("gearAtk", `${fmtSignedCompact(ga + petAtk)}${petAtk > 0 ? ` (${fmtSignedCompact(petAtk)} pet)` : ""}`);
  setText("gearDef", `${fmtSignedCompact(gd + petDef)}${petDef > 0 ? ` (${fmtSignedCompact(petDef)} pet)` : ""}`);

  // % bonus (set + buildings)
  setText("pctAtk", `${(pctAtk * 100).toFixed(2)}%${petPctAtk > 0 ? ` (+${(petPctAtk * 100).toFixed(2)}% pet)` : ""}`);
  setText("pctDef", `${(pctDef * 100).toFixed(2)}%${petPctDef > 0 ? ` (+${(petPctDef * 100).toFixed(2)}% pet)` : ""}`);

  // totals
  setText("totalAtk", totalAtk);
  setText("totalDef", totalDef);
}

  // ---------- render paperdoll ----------
  function renderPaperdoll() {
    const save = getSave();
    const nodes = document.querySelectorAll(".pdSlot");

    nodes.forEach(node => {
      const slotKey = node.dataset.slot;
      const it = save.equipment?.[slotKey] || null;

      node.classList.remove("hasItem", "dsSetItem", "dsCraftedItem");
      node.classList.forEach(c => { if (c.startsWith("dsRarity-")) node.classList.remove(c); });
      node.innerHTML = "";

      if (it && it.img) {
        node.classList.add("hasItem");

        if (it.setId) {
          node.classList.add("dsSetItem");
        } else if (it.crafted) {
          node.classList.add("dsCraftedItem");
        } else {
          const rarityKey = String(it.rarity || "").toLowerCase();
          if (rarityKey) node.classList.add("dsRarity-" + rarityKey);
        }

        const img = document.createElement("img");
        img.src = it.img;
        img.alt = it.name || SLOT_LABEL[slotKey] || slotKey;
        node.appendChild(img);

        const upg = Math.max(0, num(it.upg, 0));
        if (upg > 0) {
          const badge = document.createElement("div");
          badge.className = "pdUpgBadge";
          badge.textContent = `+${upg}`;
          node.appendChild(badge);
        }

        const a = num(it.atk,0);
        const d = num(it.def,0);
        const statParts = [];
        if (a) statParts.push(`ATK +${a}`);
        if (d) statParts.push(`DEF +${d}`);
        const statText = statParts.length ? statParts.join(" ") : "No stats";
        node.title = `${SLOT_LABEL[slotKey] || slotKey}: ${it.name || "Item"} (${statText})`;

        if (statParts.length) {
          const s = document.createElement("div");
          s.className = "pdStat";
          if (a && d) {
            s.innerHTML = `<span class="pdStatAtk">ATK ${a}</span><span class="pdStatSep">/</span><span class="pdStatDef">DEF ${d}</span>`;
          } else if (a) {
            s.classList.add("pdStatAtk");
            s.textContent = `ATK ${a}`;
          } else if (d) {
            s.classList.add("pdStatDef");
            s.textContent = `DEF ${d}`;
          }
          node.appendChild(s);
        }
      } else {
        const label = SLOT_LABEL[slotKey] || slotKey;
        const t = document.createElement("div");
        t.className = "pdEmpty";
        t.textContent = label;
        node.appendChild(t);

        node.title = `${label}: Empty`;
      }

      // click unequip if has item
      node.onclick = null;
      if (it) {
        node.addEventListener("click", () => {
          const s = getSave();
          const cur = s.equipment?.[slotKey];
          if (!cur) return;

          addToStack(s.inventory, cur, 1);
          s.equipment[slotKey] = null;

          recomputeTotalsLocal(s);
          setSave(s);

          renderPaperdoll();
          renderBreakout();
        });
      }
    });
  }

  // ---------- quick equip via SHIFT+click inventory ----------
  function hookInventoryShiftEquip() {
    const grid = document.getElementById("inventoryGrid");
    if (!grid) return;

    grid.addEventListener("click", (e) => {
      const slotEl = e.target.closest(".dsSlot");
      if (!slotEl) return;

      // keep normal click for global inspector
      if (!e.shiftKey) return;

      const idx = Number(slotEl.dataset.index);
      if (!Number.isFinite(idx)) return;

      const s = getSave();
      const item = s.inventory[idx];
      if (!item) return;

      if (item.type !== "gear" || !item.slot) return;

      const req = Math.max(1, num(item.reqLevel, 1));
      if (s.heroLevel < req) {
        alert(`Requires Level ${req}`);
        return;
      }

      const slotKey = item.slot;
      const prev = s.equipment[slotKey];

      // take 1 from stack if stacked (gear normally shouldn't stack, but safe)
      const q = Math.max(1, num(item.quantity ?? item.qty, 1));
      const picked = { ...item, quantity: 1 };

      if (q > 1) item.quantity = q - 1;
      else s.inventory.splice(idx, 1);

      s.equipment[slotKey] = picked;
      if (prev) addToStack(s.inventory, prev, 1);

      recomputeTotalsLocal(s);
      setSave(s);

      renderPaperdoll();
      renderBreakout();
    });
  }

  function setStatsTab(tab){
    currentStatsTab = (tab === "dungeon") ? "dungeon" : "fight";
    const fightBtn = document.getElementById("tabFight");
    const dungeonBtn = document.getElementById("tabDungeon");
    fightBtn?.classList.toggle("statsTabActive", currentStatsTab === "fight");
    dungeonBtn?.classList.toggle("statsTabActive", currentStatsTab === "dungeon");
    renderBreakout();
  }

  // ---------- boot ----------
  window.addEventListener("DOMContentLoaded", () => {
    injectEquipStylesOnce();

    // Ensure totals exist at least once on load
    const s = getSave();
    recomputeTotalsLocal(s);
    setSave(s);

    renderPaperdoll();
    setStatsTab("fight");
    hookInventoryShiftEquip();

    // if something changes while you're on this page (equip via inspector, etc.)
    window.addEventListener("ds:save", () => {
      renderPaperdoll();
      renderBreakout();
    });

    document.getElementById("tabFight")?.addEventListener("click", () => setStatsTab("fight"));
    document.getElementById("tabDungeon")?.addEventListener("click", () => setStatsTab("dungeon"));
  });
})();






