// equipment.js — Darkstone Chronicles (Paperdoll Equip UI + Stats Breakout + Set Bonus)
// ✅ reusable shell mount + standalone init

(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const EQUIPMENT_TEMPLATE = `
    <div class="equipWrap" style="max-width:900px;margin:0 auto;">
      <div class="equipCard" style="background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:14px;padding:12px;box-shadow:var(--card-medieval-shadow);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div style="font-weight:900;color:#f3ead6;text-shadow:0 1px 0 rgba(74,47,14,.95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Equipped</div>
          <div style="opacity:.84;font-size:12px;color:#d9ccb0;">Click a slot to unequip</div>
        </div>

        <div style="display:flex;gap:10px;align-items:stretch;margin-top:10px;">
          <div id="paperdoll" style="flex:0 0 58%;position:relative;height:350px;border:1px solid var(--card-medieval-border);border-radius:14px;overflow:hidden;background:var(--card-medieval-bg);box-shadow:var(--card-medieval-shadow);">
            <div class="knightBg" aria-hidden="true"></div>

            <div id="slot_helmet" class="pdSlot" data-slot="helmet" style="left:46%;top:6px;"></div>
            <div id="slot_chest" class="pdSlot" data-slot="chest" style="left:46%;top:88px;"></div>
            <div id="slot_belt" class="pdSlot" data-slot="belt" style="left:46%;top:152px;"></div>
            <div id="slot_pants" class="pdSlot" data-slot="pants" style="left:46%;top:218px;"></div>

            <div id="slot_bracers" class="pdSlot" data-slot="bracers" style="left:18%;top:78px;"></div>
            <div id="slot_mainHand" class="pdSlot" data-slot="mainHand" style="left:18%;top:142px;"></div>
            <div id="slot_gloves" class="pdSlot" data-slot="gloves" style="left:18%;top:206px;"></div>
            <div id="slot_ring" class="pdSlot" data-slot="ring" style="left:18%;top:270px;"></div>

            <div id="slot_shoulders" class="pdSlot" data-slot="shoulders" style="left:76%;top:78px;"></div>
            <div id="slot_offHand" class="pdSlot" data-slot="offHand" style="left:76%;top:142px;"></div>
            <div id="slot_boots" class="pdSlot" data-slot="boots" style="left:76%;top:206px;"></div>
            <div id="slot_amulet" class="pdSlot" data-slot="amulet" style="left:76%;top:270px;"></div>
          </div>

          <div id="statsPanel" style="flex:1;min-width:0;background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:14px;padding:12px;box-shadow:var(--card-medieval-shadow);">
            <div style="font-weight:900;color:#f3ead6;text-shadow:0 1px 0 rgba(74,47,14,.95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Stats Breakdown</div>

            <div id="statsTabs" style="display:flex;gap:8px;flex-wrap:nowrap;margin-top:8px;">
              <button id="tabFight" type="button" style="flex:1;min-width:0;">Fighting Fields</button>
              <button id="tabDungeon" type="button" style="flex:1;min-width:0;">Dungeons</button>
            </div>

            <div style="margin-top:8px;">
              <table id="statsTable" style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;color:#f3ead6;">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:6px;border-bottom:1px solid rgba(166,124,64,.38);color:#f3ead6;">Stat</th>
                    <th style="text-align:right;padding:6px;border-bottom:1px solid rgba(166,124,64,.38);color:#f3ead6;">Base</th>
                    <th style="text-align:right;padding:6px;border-bottom:1px solid rgba(166,124,64,.38);color:#f3ead6;">Equip/Pet</th>
                    <th style="text-align:right;padding:6px;border-bottom:1px solid rgba(166,124,64,.38);color:#f3ead6;">Bonus</th>
                    <th style="text-align:right;padding:6px;border-bottom:1px solid rgba(166,124,64,.38);color:#f3ead6;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding:6px;border-bottom:1px solid rgba(166,124,64,.28);color:#f3ead6;">Attack</td>
                    <td id="baseAtk" style="padding:6px;text-align:right;border-bottom:1px solid rgba(166,124,64,.28);color:#f3ead6;">0</td>
                    <td id="gearAtk" style="padding:6px;text-align:right;border-bottom:1px solid rgba(166,124,64,.28);color:#f3ead6;">+0</td>
                    <td id="pctAtk" style="padding:6px;text-align:right;border-bottom:1px solid rgba(166,124,64,.28);color:#f3ead6;">0%</td>
                    <td id="totalAtk" style="padding:6px;text-align:right;border-bottom:1px solid rgba(166,124,64,.28);font-weight:900;color:#fff1cf;">0</td>
                  </tr>
                  <tr>
                    <td style="padding:6px;color:#f3ead6;">Defense</td>
                    <td id="baseDef" style="padding:6px;text-align:right;color:#f3ead6;">0</td>
                    <td id="gearDef" style="padding:6px;text-align:right;color:#f3ead6;">+0</td>
                    <td id="pctDef" style="padding:6px;text-align:right;color:#f3ead6;">0%</td>
                    <td id="totalDef" style="padding:6px;text-align:right;font-weight:900;color:#fff1cf;">0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let currentStatsTab = "fight";

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
      "mainHand", "offHand",
      "helmet", "shoulders",
      "chest", "bracers", "gloves",
      "belt", "pants", "boots",
      "ring", "amulet"
    ];
    for (const k of slots) if (!(k in save.equipment)) save.equipment[k] = null;

    save.heroLevel = Math.max(1, num(save.heroLevel, 1));
    save.heroAttack = Math.max(10, num(save.heroAttack, 10));
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

  function getSetCounts(equipment) {
    const counts = {};
    Object.values(equipment || {}).forEach((it) => {
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

    const cryptAtk = tierPct(cryptCount, [[2, 0.02], [3, 0.04], [4, 0.06]]);
    const icePct = tierPct(iceCount, [[2, 0.02], [4, 0.04], [6, 0.06], [8, 0.08], [10, 0.10]]);
    const goldPct = tierPct(frostCount, [[2, 0.04], [4, 0.08], [6, 0.12]]);

    return {
      atkPct: cryptAtk + icePct,
      defPct: icePct,
      goldPct
    };
  }

  function buildingBonusPct(level){
    return Math.max(0, num(level, 0)) * 0.0005;
  }

  function getPotionTier(item){
    if (!item) return 1;
    const id = String(item.id || "");
    const m = id.match(/_(\d+)$/);
    if (m) return Math.max(1, Math.min(7, Number(m[1]) || 1));
    const name = String(item.name || "").toUpperCase();
    const roman = [" VII", " VI", " V", " IV", " III", " II", " I"];
    const map = { " I": 1, " II": 2, " III": 3, " IV": 4, " V": 5, " VI": 6, " VII": 7 };
    for (const r of roman) if (name.includes(r)) return map[r];
    return 1;
  }

  function getPotionBonuses(save){
    let atkPct = 0;
    let defPct = 0;
    const cons = (save && typeof save.consumables === "object") ? save.consumables : {};
    const quickSlots = ["quick_potion1", "quick_potion2"];
    const legacySlots = ["potion1", "potion2"];
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

  function recomputeTotalsLocal(save) {
    const baseAtk = Math.max(10, num(save.heroAttack, 10));
    const baseDef = Math.max(10, num(save.heroDefense, 10));

    let atkB = 0;
    let defB = 0;
    Object.values(save.equipment || {}).forEach((it) => {
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

  function fmtSignedCompact(value){
    const v = num(value, 0);
    const abs = Math.abs(v);
    const hasDecimal = Math.abs(abs - Math.round(abs)) > 0.0001;
    const txt = hasDecimal ? abs.toFixed(1) : String(Math.round(abs));
    return `${v >= 0 ? "+" : "-"}${txt}`;
  }

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

  function injectEquipStylesOnce() {
    if (document.getElementById("ds-equip-styles")) return;
    const s = document.createElement("style");
    s.id = "ds-equip-styles";
    s.textContent = `
      .knightBg{
        position:absolute; inset:0;
        background:
          radial-gradient(circle at top left, rgba(122,77,34,.18), transparent 34%),
          radial-gradient(circle at bottom right, rgba(71,98,158,.08), transparent 30%),
          linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01)),
          #151520;
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
        border:1px solid rgba(166,124,64,.82);
        background:
          linear-gradient(180deg, rgba(46,35,23,.96) 0%, rgba(24,20,19,.98) 100%);
        box-shadow:
          0 0 0 1px rgba(34,24,14,.84),
          inset 0 1px 0 rgba(255,224,171,.08),
          inset 0 0 0 1px rgba(255,214,143,.04),
          inset 0 -10px 16px rgba(0,0,0,.18),
          0 10px 18px rgba(0,0,0,.2);
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
      .pdSlot:hover{
        filter:brightness(1.06);
        transform:translateX(-50%) translateY(-1px);
      }
      .pdSlot.hasItem{
        border-color:rgba(205,163,96,.94);
        box-shadow:
          0 0 0 1px rgba(34,24,14,.84),
          inset 0 1px 0 rgba(255,233,186,.11),
          inset 0 0 0 1px rgba(255,214,143,.05),
          inset 0 -10px 16px rgba(0,0,0,.18),
          0 12px 20px rgba(0,0,0,.22);
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
        opacity:.92;
        color:#f1e3be;
        text-align:center;
        line-height:1.05;
        padding:0 4px;
        text-shadow: 0 1px 6px rgba(0,0,0,.6);
      }

      #statsTabs button{
        padding:6px 10px;
        border-radius:14px;
        border:1px solid rgba(126,94,50,.88);
        background:
          linear-gradient(180deg, rgba(70,78,101,.96) 0%, rgba(40,48,67,.98) 100%);
        color:#f3ead6;
        cursor:pointer;
        font-weight:800;
        font-size:12px;
        box-shadow:
          0 0 0 1px rgba(28,20,12,.84),
          inset 0 1px 0 rgba(255,255,255,.07),
          inset 0 -10px 18px rgba(0,0,0,.18),
          0 10px 18px rgba(0,0,0,.18);
      }
      #statsTabs button:hover{filter:brightness(1.08);}
      #statsTabs button.statsTabActive{
        border-color:rgba(166,124,64,.98);
        background:linear-gradient(180deg, rgba(84,60,30,.98) 0%, rgba(58,40,20,.98) 100%);
        color:#fff1cf;
        text-shadow:0 1px 0 rgba(74,47,14,.95);
        box-shadow:
          0 0 0 1px rgba(60,40,16,.82),
          inset 0 1px 0 rgba(255,232,184,.12),
          inset 0 -10px 18px rgba(0,0,0,.22),
          0 12px 20px rgba(0,0,0,.2);
        filter:none;
      }
    `;
    document.head.appendChild(s);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(value);
  }

  function renderBreakout() {
    const s = getSave();
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

    setText("baseAtk", baseAtk);
    setText("baseDef", baseDef);
    setText("gearAtk", `${fmtSignedCompact(ga + petAtk)}${petAtk > 0 ? ` (${fmtSignedCompact(petAtk)} pet)` : ""}`);
    setText("gearDef", `${fmtSignedCompact(gd + petDef)}${petDef > 0 ? ` (${fmtSignedCompact(petDef)} pet)` : ""}`);
    setText("pctAtk", `${(pctAtk * 100).toFixed(2)}%${petPctAtk > 0 ? ` (+${(petPctAtk * 100).toFixed(2)}% pet)` : ""}`);
    setText("pctDef", `${(pctDef * 100).toFixed(2)}%${petPctDef > 0 ? ` (+${(petPctDef * 100).toFixed(2)}% pet)` : ""}`);
    setText("totalAtk", totalAtk);
    setText("totalDef", totalDef);
  }

  function renderPaperdoll() {
    const save = getSave();
    const nodes = document.querySelectorAll(".pdSlot");

    nodes.forEach((node) => {
      const slotKey = node.dataset.slot;
      const it = save.equipment?.[slotKey] || null;

      node.classList.remove("hasItem", "dsSetItem", "dsCraftedItem");
      node.classList.forEach((c) => { if (c.startsWith("dsRarity-")) node.classList.remove(c); });
      node.innerHTML = "";

      if (it && it.img) {
        node.classList.add("hasItem");

        if (it.setId) node.classList.add("dsSetItem");
        else if (it.crafted) node.classList.add("dsCraftedItem");
        else {
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

        const a = num(it.atk, 0);
        const d = num(it.def, 0);
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

      node.onclick = null;
      if (it) {
        node.addEventListener("click", () => {
          const s = getSave();
          const cur = s.equipment?.[slotKey];
          if (!cur) return;
          if (window.DSInventory?.hasSpaceFor && !window.DSInventory.hasSpaceFor(s, 1)) {
            alert("No more inventory space.");
            return;
          }

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

  function hookInventoryShiftEquip() {
    const grid = document.getElementById("inventoryGrid");
    if (!grid || grid.dataset.dsEquipShiftBound === "1") return;
    grid.dataset.dsEquipShiftBound = "1";

    grid.addEventListener("click", (e) => {
      const slotEl = e.target.closest(".dsSlot");
      if (!slotEl) return;
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

  function bindEquipmentEvents() {
    document.getElementById("tabFight")?.addEventListener("click", () => setStatsTab("fight"));
    document.getElementById("tabDungeon")?.addEventListener("click", () => setStatsTab("dungeon"));
  }

  function refreshEquipmentView() {
    if (!document.getElementById("paperdoll")) return;
    renderPaperdoll();
    renderBreakout();
  }

  function mountEquipment(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    injectEquipStylesOnce();
    left.innerHTML = EQUIPMENT_TEMPLATE;
    document.title = "Darkstone Chronicles - Equipment";

    const s = getSave();
    recomputeTotalsLocal(s);
    setSave(s);

    bindEquipmentEvents();
    hookInventoryShiftEquip();
    setStatsTab(currentStatsTab);
    renderPaperdoll();
    return true;
  }

  function initStandaloneEquipment() {
    if (!document.getElementById("paperdoll")) return false;
    injectEquipStylesOnce();
    document.title = "Darkstone Chronicles - Equipment";

    const s = getSave();
    recomputeTotalsLocal(s);
    setSave(s);

    bindEquipmentEvents();
    hookInventoryShiftEquip();
    setStatsTab(currentStatsTab);
    renderPaperdoll();
    return true;
  }

  window.DSEquipment = {
    mount: mountEquipment
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneEquipment();
  });

  window.addEventListener("ds:save", refreshEquipmentView);
})();
