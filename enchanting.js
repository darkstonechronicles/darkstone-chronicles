(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const PICK_KEY = "ds_enchant_pick_v1";
  const ORB_PICK_KEY = "ds_enchant_orb_pick_v1";
  const ENCHANTING_TEMPLATE = `
    <h1 style="margin-bottom:6px;">Enchanting</h1>
    <div style="opacity:.85;margin-bottom:14px;">
      Select gear from your inventory and enchant it with an enchanting orb.
    </div>

    <div class="profXpShell">
      <div class="profXpCard">
        <div class="profXpHead">
          <span aria-hidden="true">&#10024;</span>
          <span>Enchanting Lvl: <span id="enchLevel">1</span></span>
        </div>
        <div class="profXpTrack">
          <div id="enchXPBar" style="height:100%;width:0%;background:linear-gradient(90deg,#d18a1f,#f3c463);"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="enchXPCurrent">0</span>/<span id="enchXPNext">100</span></div>
        </div>
      </div>
    </div>

    <div class="profXpShell">
      <div class="profBonusCard" style="padding:12px;width:100%;min-height:56px;display:flex;align-items:flex-start;gap:10px;">
        <div style="font-weight:800;font-size:14px;white-space:nowrap;line-height:1.05;text-align:center;">Bonus<br>XP</div>
        <div style="width:1px;align-self:stretch;background:#333;"></div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;gap:2px;padding-top:2px;">
          <div style="display:grid;grid-template-columns:1fr;gap:8px;font-size:11px;font-weight:700;opacity:.9;text-align:center;align-items:center;">
            <div>Building</div>
          </div>
          <div style="height:1px;background:#333;width:100%;"></div>
          <div style="display:grid;grid-template-columns:1fr;gap:8px;min-height:14px;align-items:stretch;text-align:center;font-size:11px;font-weight:700;color:#cfe7ff;">
            <div id="enchBonusBuildingValue">+0%</div>
          </div>
        </div>
      </div>
    </div>

    <div id="selectedCard" class="profActionCard" style="display:none;">
      <div style="font-weight:900;font-size:16px;margin-bottom:10px;">Selected Item</div>

      <div id="selWrap" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <div id="selImgFrame" style="position:relative;width:84px;height:84px;display:none;">
          <img id="selImg" src="" alt="" class="profChoiceThumb" style="width:84px;height:84px;border-radius:12px;object-fit:cover;">
          <div id="selUpgBadge" style="position:absolute;top:-8px;right:-8px;min-width:28px;height:28px;padding:0 8px;border-radius:999px;background:#d18a1f;color:#111;font-weight:900;font-size:13px;display:none;align-items:center;justify-content:center;border:2px solid #f6d58d;"></div>
        </div>
        <div style="min-width:260px;flex:1;">
          <div id="selName" style="font-weight:900;font-size:18px;">No item selected</div>
          <div id="selInfo" style="opacity:.85;margin-top:4px;">Pick a gear item from the list below.</div>
          <div id="selStats" style="opacity:.9;margin-top:6px;">-</div>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:12px 0;">

      <div style="font-weight:900;margin-bottom:8px;">Requirements</div>
      <div style="opacity:.9;margin-bottom:6px;">Selected Orb: <b><span id="selectedOrbText">None</span></b></div>
      <div style="opacity:.9;margin-bottom:6px;">Effect: <b><span id="selectedOrbEffect">-</span></b></div>
      <div style="opacity:.9;margin-bottom:10px;">Success chance: <b><span id="chanceText">-</span></b></div>
      <div id="orbList" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin:10px 0 12px;"></div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="btnEnchant" disabled>Enchant</button>
        <button id="btnBack">Back</button>
      </div>

      <div id="enchMsg" style="margin-top:10px;opacity:.92;"></div>
    </div>

    <div id="listCard" class="profActionCard" style="margin-top:12px;">
      <div style="font-weight:900;font-size:16px;margin-bottom:10px;">Select Item For Enchant</div>
      <div id="gearList" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;"></div>
    </div>
  `;

  const BAR_TIERS = [
    "Copper Bar","Silver Bar","Iron Bar","Mithril Bar","Adamant Bar",
    "Obsidian Bar","Crystal Bar","Sulfur Bar","Rose Quartz Bar","Darkstone Bar"
  ];
  const PLANK_TIERS = [
    "Ash Plank","Pine Plank","Birch Plank","Oak Plank","Cedar Plank",
    "Maple Plank","Ironwood Plank","Heartwood Plank","Darkwood Plank","Ebony Plank"
  ];
  const ORB_TIERS = {
    refined: { label: "Refined", power: 1, baseChance: 0.40 },
    flawless: { label: "Flawless", power: 2, baseChance: 0.35 },
    masterwork: { label: "Masterwork", power: 3, baseChance: 0.30 },
    exquisite: { label: "Exquisite", power: 4, baseChance: 0.25 }
  };
  const ORB_TYPES = {
    attack: { label: "Attack", field: "atk", pct: false },
    defense: { label: "Defense", field: "def", pct: false },
    xp: { label: "Combat XP", field: "enchantXpPct", pct: true },
    gold: { label: "Gold", field: "enchantGoldPct", pct: true },
    luck: { label: "Luck", field: "enchantLuckPct", pct: true }
  };

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const el = (id) => document.getElementById(id);

  let shellMounted = false;
  let shellDetailMode = false;

  function xpBarGradient(pct) {
    if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
    if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
    if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
    return "linear-gradient(90deg,#2f9e5b,#7be39e)";
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

  function loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function hasInventorySpace(save, addUnits = 1) {
    if (window.DSInventory?.hasSpaceFor) return window.DSInventory.hasSpaceFor(save, addUnits);
    let used = 0;
    for (const it of save.inventory || []) {
      if (!it) continue;
      used += Math.max(1, num(it.quantity ?? it.qty, 1));
    }
    return used + Math.max(1, num(addUnits, 1)) <= num(save.inventoryMaxSlots, 1000);
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

  function getEffectiveEnchantLevel(save){
    return Math.max(1, num(save.enchantingLevel, 1)) + getArtisanPotionBonus(save);
  }

  function tickArtisanPotionActions(save, actions = 1){
    if (!save || typeof save !== "object") return false;
    if (!save.consumables || typeof save.consumables !== "object") return false;
    let changed = false;
    ["quick_potion1","quick_potion2"].forEach((slot) => {
      const it = save.consumables[slot];
      if (!it) return;
      const id = String(it.id || "").toLowerCase();
      const name = String(it.name || "").toLowerCase();
      if (!id.includes("artisan_insight") && !name.includes("artisan insight")) return;
      let qty = Number.isFinite(Number(it.quantity ?? it.qty)) ? Number(it.quantity ?? it.qty) : 1;
      if (qty <= 0) { save.consumables[slot] = null; changed = true; return; }
      let left = Number(it.actionsLeft);
      if (!Number.isFinite(left) || left <= 0) left = 100;
      let remaining = Math.max(0, Math.floor(left));
      let steps = Math.max(1, Math.floor(actions));
      while (steps-- > 0 && qty > 0){
        remaining -= 1;
        if (remaining <= 0){
          qty -= 1;
          if (qty <= 0){
            save.consumables[slot] = null;
            remaining = 0;
            changed = true;
            break;
          }
          remaining = 100;
        }
      }
      if (save.consumables[slot]) {
        it.quantity = qty;
        it.actionsLeft = remaining;
        changed = true;
      }
    });
    return changed;
  }

  function setSave(next) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  function ensureSave(s) {
    s = s && typeof s === "object" ? s : {};
    if (!Array.isArray(s.inventory)) s.inventory = [];
    if (!s.equipment || typeof s.equipment !== "object") s.equipment = {};
    s.heroAttack = num(s.heroAttack, 10);
    s.heroDefense = num(s.heroDefense, 10);
    s.enchantingLevel = Math.max(1, num(s.enchantingLevel, 1));
    s.enchantingXP = Math.max(0, num(s.enchantingXP, 0));
    s.enchantingXPNext = Math.max(1, num(s.enchantingXPNext, xpNextForLevel(s.enchantingLevel)));
    s.enchanterSanctumLevel = Math.max(0, Math.round(num(s.enchanterSanctumLevel, 0)));
    return s;
  }

  function stripPlus(name) {
    return String(name || "").replace(/\s*\+\d+$/, "");
  }

  function ensureBaseName(item) {
    if (!item) return "";
    if (item.baseName && String(item.baseName).trim()) return String(item.baseName);
    const base = stripPlus(item.name);
    item.baseName = base;
    return base;
  }

  function upgradeLevel(item) {
    return Math.max(0, num(item?.upg, 0));
  }

  function setUpgName(item) {
    const base = ensureBaseName(item);
    const upg = upgradeLevel(item);
    item.name = upg > 0 ? `${base} +${upg}` : base;
  }

  function stableKey(it) {
    const base = it?.baseName ? String(it.baseName) : stripPlus(it?.name);
    return [it?.type || "", base || "", it?.slot || "", it?.reqLevel ?? 1, it?.rarity || ""].join("::");
  }

  function getPick() {
    try { return JSON.parse(localStorage.getItem(PICK_KEY) || "null"); }
    catch { return null; }
  }

  function clearPick() { localStorage.removeItem(PICK_KEY); }
  function setPick(pick) { localStorage.setItem(PICK_KEY, JSON.stringify(pick)); }
  function getOrbPickId() {
    try { return String(localStorage.getItem(ORB_PICK_KEY) || "").trim(); }
    catch { return ""; }
  }
  function setOrbPickId(id) {
    try { localStorage.setItem(ORB_PICK_KEY, String(id || "")); }
    catch {}
  }

  function isDetailMode() {
    if (shellMounted) return shellDetailMode;
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("view") === "item";
    } catch { return false; }
  }

  function goToListMode() {
    clearPick();
    if (shellMounted) {
      shellDetailMode = false;
      render();
      return;
    }
    window.location.href = "enchanting.html";
  }

  function goToDetailMode() {
    if (shellMounted) {
      shellDetailMode = true;
      render();
      return;
    }
    window.location.href = "enchanting.html?view=item";
  }

  function navigateToProfessions() {
    if (window.DSUI?.navigateWithinShell?.("professions.html")) return;
    window.location.href = "professions.html";
  }

  function buildPick(index, item) {
    const copy = { ...item };
    ensureBaseName(copy);
    return { index, key: stableKey(copy), ts: Date.now() };
  }

  function isGearItem(item) {
    return item?.type === "gear" || !!item?.slot;
  }

  function normalizeEnchantRarity(item) {
    const key = String(item?.rarity || "").toLowerCase();
    if (key === "common") return "common";
    if (key === "uncommon") return "uncommon";
    if (key === "rare") return "rare";
    return "legendary";
  }

  function maxEnchantForItem(item) {
    const rarity = normalizeEnchantRarity(item);
    if (rarity === "common") return 5;
    if (rarity === "uncommon") return 7;
    if (rarity === "rare") return 9;
    return 12;
  }

  function getItemTier(item) {
    const reqLevel = Math.max(1, num(item?.reqLevel, 1));
    return clamp(Math.floor(reqLevel / 10) + 1, 1, 10);
  }

  function reqEnchantLevelForTier(tier) { return tier <= 1 ? 1 : (tier - 1) * 10; }

  function materialForTier(tier) {
    const idx = clamp(tier, 1, 10) - 1;
    return { bar: BAR_TIERS[idx], plank: PLANK_TIERS[idx] };
  }

  function parseEnchantOrb(item) {
    const id = String(item?.id || "").toLowerCase();
    const name = String(item?.name || "").toLowerCase();
    const tierKey = Object.keys(ORB_TIERS).find((key) => id.startsWith(`${key}_orb_of_`) || name.startsWith(`${key} orb of `));
    const typeKey = Object.keys(ORB_TYPES).find((key) => id.endsWith(`_orb_of_${key}`) || name.endsWith(`orb of ${key}`));
    if (!tierKey || !typeKey) return null;
    const tier = ORB_TIERS[tierKey];
    const type = ORB_TYPES[typeKey];
    return {
      id: String(item.id || ""),
      name: String(item.name || `${tier.label} Orb of ${type.label}`),
      img: String(item.img || ""),
      tierKey,
      typeKey,
      tierLabel: tier.label,
      typeLabel: type.label,
      power: tier.power,
      baseChance: tier.baseChance,
      effectText: type.pct ? `+${tier.power}% ${type.label}` : `+${tier.power} ${type.label}`,
      field: type.field,
      pct: type.pct
    };
  }

  function getEnchantOrbs(save) {
    const grouped = new Map();
    (save.inventory || []).forEach((item) => {
      const orb = parseEnchantOrb(item);
      if (!orb) return;
      const qty = Math.max(1, num(item.quantity ?? item.qty, 1));
      const prev = grouped.get(orb.id);
      if (prev) prev.qty += qty;
      else grouped.set(orb.id, { ...orb, qty });
    });
    return [...grouped.values()].sort((a, b) => (a.power - b.power) || a.typeLabel.localeCompare(b.typeLabel));
  }

  function getSelectedOrb(save) {
    const orbs = getEnchantOrbs(save);
    if (!orbs.length) return null;
    const picked = getOrbPickId();
    return orbs.find((orb) => orb.id === picked) || orbs[0];
  }

  function getUnitsByName(inv, name) {
    return inv.reduce((sum, it) => {
      if (!it) return sum;
      if (String(it.name || "").toLowerCase() !== String(name).toLowerCase()) return sum;
      return sum + Math.max(1, num(it.quantity ?? it.qty, 1));
    }, 0);
  }

  function removeUnitsByName(save, name, qtyNeeded) {
    let remaining = Math.max(0, num(qtyNeeded, 0));
    for (let i = save.inventory.length - 1; i >= 0 && remaining > 0; i -= 1) {
      const it = save.inventory[i];
      if (!it) continue;
      if (String(it.name || "").toLowerCase() !== String(name).toLowerCase()) continue;
      const qty = Math.max(1, num(it.quantity ?? it.qty, 1));
      if (qty <= remaining) {
        remaining -= qty;
        save.inventory.splice(i, 1);
      } else {
        it.quantity = qty - remaining;
        remaining = 0;
      }
    }
    return remaining === 0;
  }

  function removeOneById(save, id) {
    const idx = (save.inventory || []).findIndex((it) => String(it?.id || "") === String(id || ""));
    if (idx < 0) return false;
    const item = save.inventory[idx];
    const qty = Math.max(1, num(item.quantity ?? item.qty, 1));
    if (qty > 1) item.quantity = qty - 1;
    else save.inventory.splice(idx, 1);
    return true;
  }

  function recomputeTotals(save) {
    const baseAtk = num(save.heroAttack, 10);
    const baseDef = num(save.heroDefense, 10);
    let atkBonus = 0;
    let defBonus = 0;
    Object.values(save.equipment || {}).forEach((it) => {
      if (!it) return;
      atkBonus += num(it.atk, 0);
      defBonus += num(it.def, 0);
    });
    save.attackTotal = baseAtk + atkBonus;
    save.defenseTotal = baseDef + defBonus;
  }

  function getEnchantingBuildingPct(save) {
    return Math.max(0, num(save?.enchanterSanctumLevel, 0)) * 0.0005;
  }

  function formatPct(value) {
    return `+${(num(value, 0) * 100).toFixed(1)}%`;
  }

  function gainEnchantXP(save, amount) {
    const totalMult = 1 + getEnchantingBuildingPct(save);
    save.enchantingXP += Math.max(0, Math.round(num(amount, 0) * totalMult));
    save.enchantingXPNext = xpNextForLevel(save.enchantingLevel);
    while (save.enchantingXP >= save.enchantingXPNext) {
      save.enchantingXP -= save.enchantingXPNext;
      save.enchantingLevel += 1;
      save.enchantingXPNext = xpNextForLevel(save.enchantingLevel);
      window.DS?.announcements?.professionLevel?.(save, "Enchanting", save.enchantingLevel);
    }
  }

  function successChance(save, orb) {
    if (!orb) return 0;
    const effectiveLevel = getEffectiveEnchantLevel(save);
    return clamp(num(orb.baseChance, 0.4) + Math.max(0, effectiveLevel - 1) * 0.005, 0.05, 0.95);
  }

  function applyEnchantStats(item, orb) {
    if (!orb) return;
    if (orb.field === "atk") item.atk = num(item.atk, 0) + orb.power;
    else if (orb.field === "def") item.def = num(item.def, 0) + orb.power;
    else item[orb.field] = num(item[orb.field], 0) + (orb.power * 0.01);
    if (!Array.isArray(item.enchantHistory)) item.enchantHistory = [];
    item.enchantHistory.push({ type: orb.typeKey, tier: orb.tierKey, power: orb.power });
  }

  function enchantSummary(item) {
    const parts = [];
    if (num(item?.atk, 0) > 0) parts.push(`ATK +${num(item.atk, 0)}`);
    if (num(item?.def, 0) > 0) parts.push(`DEF +${num(item.def, 0)}`);
    if (num(item?.enchantXpPct, 0) > 0) parts.push(`XP +${Math.round(num(item.enchantXpPct, 0) * 100)}%`);
    if (num(item?.enchantGoldPct, 0) > 0) parts.push(`Gold +${Math.round(num(item.enchantGoldPct, 0) * 100)}%`);
    if (num(item?.enchantLuckPct, 0) > 0) parts.push(`Luck +${Math.round(num(item.enchantLuckPct, 0) * 100)}%`);
    return parts;
  }

  function getGearEntries(save) {
    return save.inventory.map((item, index) => ({ item, index })).filter(({ item }) => isGearItem(item));
  }

  function findSelectedItem(save, pick, allowFallback = false) {
    if (!pick) return { idx: null, item: null };
    const idx = num(pick.index, -1);
    const key = String(pick.key || "");
    if (idx >= 0 && idx < save.inventory.length) {
      const atIndex = save.inventory[idx];
      if (atIndex) {
        ensureBaseName(atIndex);
        if (stableKey(atIndex) === key) return { idx, item: atIndex };
      }
    }
    const idx2 = save.inventory.findIndex((it) => {
      if (!it) return false;
      ensureBaseName(it);
      return stableKey(it) === key;
    });
    if (idx2 >= 0) return { idx: idx2, item: save.inventory[idx2] };
    if (!allowFallback) return { idx: null, item: null };
    const gears = getGearEntries(save);
    if (gears.length === 0) return { idx: null, item: null };
    return { idx: gears[0].index, item: gears[0].item };
  }

  function rarityColors(item) {
    if (item?.setId) return { bg: "#2a0a0d", border: "#8d3b45" };
    if (item?.crafted) return { bg: "#14361d", border: "#2d7a43" };
    const rarity = String(item?.rarity || "").toLowerCase();
    if (rarity === "common") return { bg: "#0b0b0b", border: "#3a3a46" };
    if (rarity === "uncommon") return { bg: "#0f141b", border: "#4c667f" };
    if (rarity === "rare") return { bg: "#0f1b2e", border: "#3d73c9" };
    if (rarity === "epic") return { bg: "#1a0f2e", border: "#7d4bc2" };
    if (rarity === "legendary") return { bg: "#2b1a0b", border: "#d18a1f" };
    if (rarity === "mythic") return { bg: "#5a0b12", border: "#ff3b45" };
    return { bg: "#101019", border: "#333" };
  }

  function renderTop(save) {
    if (el("enchLevel")) el("enchLevel").textContent = String(save.enchantingLevel);
    if (el("enchXPCurrent")) el("enchXPCurrent").textContent = String(save.enchantingXP);
    if (el("enchXPNext")) el("enchXPNext").textContent = String(save.enchantingXPNext);
    if (el("enchXPBar")) {
      const pct = clamp((save.enchantingXP / Math.max(1, save.enchantingXPNext)) * 100, 0, 100);
      el("enchXPBar").style.width = `${pct}%`;
      el("enchXPBar").style.background = xpBarGradient(pct);
    }
    if (el("enchBonusBuildingValue")) el("enchBonusBuildingValue").textContent = formatPct(getEnchantingBuildingPct(save));
  }

  function renderGearList(save, selectedIndex) {
    const wrap = el("gearList");
    if (!wrap) return;
    const gears = getGearEntries(save);
    wrap.innerHTML = "";
    if (gears.length === 0) {
      const empty = document.createElement("div");
      empty.style.opacity = ".85";
      empty.textContent = "No gear found in inventory.";
      wrap.appendChild(empty);
      return;
    }
    gears.forEach(({ item, index }) => {
      ensureBaseName(item);
      setUpgName(item);
      const colors = rarityColors(item);
      const node = document.createElement("button");
      node.type = "button";
      node.style.display = "flex";
      node.style.alignItems = "center";
      node.style.gap = "10px";
      node.style.padding = "10px";
      node.style.borderRadius = "10px";
      node.style.border = index === selectedIndex ? "2px solid #f1d18a" : `1px solid ${colors.border}`;
      node.style.background = colors.bg;
      node.style.color = "#fff";
      node.style.textAlign = "left";
      node.style.cursor = "pointer";
      const tier = getItemTier(item);
      const rarity = normalizeEnchantRarity(item);
      const upg = upgradeLevel(item);
      const maxUpg = maxEnchantForItem(item);
      const qty = Math.max(1, num(item.quantity ?? item.qty, 1));
      node.innerHTML = `
        <div style="position:relative;width:54px;height:54px;flex:0 0 auto;">
          <img src="${item.img || ""}" alt="${item.name || "Item"}" class="profChoiceThumb" style="width:54px;height:54px;border-radius:10px;object-fit:cover;background:${colors.bg};border-color:${colors.border};">
          ${upg > 0 ? `<div style="position:absolute;top:-6px;right:-6px;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#d18a1f;color:#111;font-weight:900;font-size:11px;display:flex;align-items:center;justify-content:center;border:2px solid #f6d58d;">+${upg}</div>` : ``}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:900;">${item.name || "Item"}</div>
          <div style="opacity:.82;font-size:12px;margin-top:2px;">Tier ${tier} | ${rarity} | +${upg}/${maxUpg}${qty > 1 ? ` | x${qty}` : ""}</div>
        </div>
      `;
      node.addEventListener("click", () => {
        setPick(buildPick(index, item));
        goToDetailMode();
      });
      wrap.appendChild(node);
    });
  }

  function renderSelected(save, selectedIndex, selectedItem) {
    const msgEl = el("enchMsg");
    if (msgEl && !msgEl.textContent) msgEl.textContent = "";
    if (!selectedItem) {
      if (el("selName")) el("selName").textContent = "No item selected";
      if (el("selInfo")) el("selInfo").textContent = "Pick a gear item from the list below.";
      if (el("selStats")) el("selStats").textContent = "-";
      if (el("selImgFrame")) el("selImgFrame").style.display = "none";
      if (el("selImg")) el("selImg").style.display = "none";
      if (el("selUpgBadge")) el("selUpgBadge").style.display = "none";
      if (el("selectedOrbText")) el("selectedOrbText").textContent = "None";
      if (el("selectedOrbEffect")) el("selectedOrbEffect").textContent = "-";
      if (el("orbList")) el("orbList").innerHTML = "";
      if (el("chanceText")) el("chanceText").textContent = "-";
      if (el("btnEnchant")) el("btnEnchant").disabled = true;
      renderGearList(save, selectedIndex);
      return;
    }
    ensureBaseName(selectedItem);
    setUpgName(selectedItem);
    const upg = upgradeLevel(selectedItem);
    const maxUpg = maxEnchantForItem(selectedItem);
    const colors = rarityColors(selectedItem);
    const orbs = getEnchantOrbs(save);
    const selectedOrb = getSelectedOrb(save);
    const chance = successChance(save, selectedOrb);
    const canEnchant = !!selectedOrb && upg < maxUpg;
    if (el("selName")) el("selName").textContent = selectedItem.name || "Item";
    if (el("selInfo")) el("selInfo").textContent = `${normalizeEnchantRarity(selectedItem)} | Max +${maxUpg} | Item level ignored`;
    if (el("selStats")) {
      const statParts = enchantSummary(selectedItem);
      statParts.push(`Current +${upg}`);
      el("selStats").textContent = statParts.join(" | ");
    }
    if (el("selImg")) {
      if (selectedItem.img) {
        el("selImg").src = selectedItem.img;
        el("selImg").alt = selectedItem.name || "Item";
        el("selImg").style.border = `2px solid ${colors.border}`;
        el("selImg").style.background = colors.bg;
        el("selImg").style.display = "block";
        if (el("selImgFrame")) el("selImgFrame").style.display = "block";
      } else {
        if (el("selImgFrame")) el("selImgFrame").style.display = "none";
        el("selImg").style.display = "none";
      }
    }
    if (el("selUpgBadge")) {
      if (upg > 0) {
        el("selUpgBadge").textContent = `+${upg}`;
        el("selUpgBadge").style.display = "flex";
      } else {
        el("selUpgBadge").style.display = "none";
      }
    }
    if (el("selWrap")) {
      el("selWrap").style.background = colors.bg;
      el("selWrap").style.border = `2px solid ${colors.border}`;
      el("selWrap").style.borderRadius = "12px";
      el("selWrap").style.padding = "12px";
    }
    if (el("selectedOrbText")) el("selectedOrbText").textContent = selectedOrb ? `${selectedOrb.name} x${selectedOrb.qty}` : "None";
    if (el("selectedOrbEffect")) el("selectedOrbEffect").textContent = selectedOrb ? selectedOrb.effectText : "-";
    if (el("orbList")) {
      el("orbList").innerHTML = "";
      if (!orbs.length) {
        const empty = document.createElement("div");
        empty.style.opacity = ".85";
        empty.textContent = "No enchanting orbs found.";
        el("orbList").appendChild(empty);
      } else {
        orbs.forEach((orb) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.style.display = "flex";
          btn.style.alignItems = "center";
          btn.style.gap = "8px";
          btn.style.padding = "8px";
          btn.style.borderRadius = "10px";
          btn.style.border = selectedOrb?.id === orb.id ? "2px solid #f1d18a" : "1px solid rgba(255,255,255,.14)";
          btn.style.background = "rgba(17,19,31,.86)";
          btn.style.color = "#f4f1e8";
          btn.style.cursor = "pointer";
          btn.innerHTML = `
            <img src="${orb.img}" alt="${orb.name}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;">
            <span style="min-width:0;text-align:left;">
              <span style="display:block;font-weight:900;font-size:12px;">${orb.name} x${orb.qty}</span>
              <span style="display:block;opacity:.82;font-size:11px;">${orb.effectText}</span>
            </span>
          `;
          btn.addEventListener("click", () => {
            setOrbPickId(orb.id);
            render();
          });
          el("orbList").appendChild(btn);
        });
      }
    }
    if (upg >= maxUpg) {
      if (el("chanceText")) el("chanceText").textContent = "MAX";
      if (el("btnEnchant")) el("btnEnchant").disabled = true;
      if (msgEl) msgEl.textContent = `Max enchant reached for this item (+${maxUpg}).`;
    } else if (!selectedOrb) {
      if (el("chanceText")) el("chanceText").textContent = "-";
      if (el("btnEnchant")) el("btnEnchant").disabled = true;
      if (msgEl) msgEl.textContent = "You need an enchanting orb.";
    } else {
      if (el("chanceText")) el("chanceText").textContent = `${(chance * 100).toFixed(1)}%`;
      if (el("btnEnchant")) el("btnEnchant").disabled = !canEnchant;
      if (msgEl && msgEl.textContent === "You need an enchanting orb.") msgEl.textContent = "";
    }
    renderGearList(save, selectedIndex);
  }

  function renderMode(detailMode) {
    if (el("selectedCard")) el("selectedCard").style.display = detailMode ? "block" : "none";
    if (el("listCard")) el("listCard").style.display = detailMode ? "none" : "block";
    if (el("btnEnchant")) el("btnEnchant").style.display = detailMode ? "inline-flex" : "none";
    if (el("btnBack")) el("btnBack").textContent = detailMode ? "Back" : "Professions";
  }

  function render() {
    const save = ensureSave(loadSave());
    const detailMode = isDetailMode();
    const pick = detailMode ? getPick() : null;
    const found = detailMode ? findSelectedItem(save, pick, false) : { idx: null, item: null };
    if (detailMode && !found.item) {
      goToListMode();
      return;
    }
    if (detailMode && found.item && (!pick || found.idx !== num(pick.index, -1))) {
      setPick(buildPick(found.idx, found.item));
    }
    renderTop(save);
    renderMode(detailMode);
    if (detailMode) renderSelected(save, found.idx, found.item);
    else renderGearList(save, null);
  }

  function doEnchant() {
    const save = ensureSave(loadSave());
    const found = findSelectedItem(save, getPick());
    const idx = found.idx;
    const item = found.item;
    if (idx == null || !item) {
      if (el("enchMsg")) el("enchMsg").textContent = "No item selected.";
      render();
      return;
    }
    ensureBaseName(item);
    const upg = upgradeLevel(item);
    const maxUpg = maxEnchantForItem(item);
    const selectedOrb = getSelectedOrb(save);
    if (upg >= maxUpg) {
      if (el("enchMsg")) el("enchMsg").textContent = `Max enchant reached (+${maxUpg}).`;
      render();
      return;
    }
    if (!selectedOrb) {
      if (el("enchMsg")) el("enchMsg").textContent = "You need an enchanting orb.";
      render();
      return;
    }
    if (!removeOneById(save, selectedOrb.id)) {
      if (el("enchMsg")) el("enchMsg").textContent = "Orb removal failed.";
      setSave(save);
      render();
      return;
    }
    const stackQty = Math.max(1, num(item.quantity ?? item.qty, 1));
    if (stackQty > 1 && !hasInventorySpace(save, 1)) {
      if (el("enchMsg")) el("enchMsg").textContent = "No more inventory space.";
      render();
      return;
    }
    const chance = successChance(save, selectedOrb);
    const rolledSuccess = Math.random() <= chance;
    if (rolledSuccess) {
      let enchantedItem = item;
      if (stackQty > 1) {
        item.quantity = stackQty - 1;
        enchantedItem = { ...item, quantity: 1 };
      }
      ensureBaseName(enchantedItem);
      enchantedItem.upg = upgradeLevel(enchantedItem) + 1;
      applyEnchantStats(enchantedItem, selectedOrb);
      setUpgName(enchantedItem);
      if (stackQty > 1) {
        if (window.DSInventory?.addItem) {
          const res = window.DSInventory.addItem(save, enchantedItem, 1, { stack: false });
          if (!res?.ok) {
            if (el("enchMsg")) el("enchMsg").textContent = "No more inventory space.";
            render();
            return;
          }
        } else {
          save.inventory.push(enchantedItem);
        }
        const newIndex = save.inventory.findIndex((invIt, invIdx) => invIdx !== idx && invIt === enchantedItem);
        setPick(buildPick(newIndex >= 0 ? newIndex : (save.inventory.length - 1), save.inventory[newIndex >= 0 ? newIndex : (save.inventory.length - 1)]));
      } else {
        setPick(buildPick(idx, item));
      }
      gainEnchantXP(save, 20 + selectedOrb.power * 8);
      if (el("enchMsg")) el("enchMsg").textContent = `Success! ${enchantedItem.name} gained ${selectedOrb.effectText}.`;
    } else {
      gainEnchantXP(save, 10 + selectedOrb.power * 5);
      setPick(buildPick(idx, item));
      if (el("enchMsg")) el("enchMsg").textContent = "Failed. The orb was consumed.";
    }
    tickArtisanPotionActions(save, 1);
    recomputeTotals(save);
    setSave(save);
    render();
  }

  function bindEvents() {
    el("btnBack")?.addEventListener("click", () => {
      if (isDetailMode()) {
        goToListMode();
        return;
      }
      navigateToProfessions();
    });
    el("btnEnchant")?.addEventListener("click", doEnchant);
  }

  function mountEnchanting(root = null) {
    const left = root || el("leftPanel");
    if (!left) return false;
    left.innerHTML = ENCHANTING_TEMPLATE;
    document.title = "Darkstone Chronicles - Enchanting";
    shellMounted = true;
    shellDetailMode = !!getPick();
    bindEvents();
    render();
    return true;
  }

  function bootStandalone() {
    if (!el("gearList")) return false;
    document.title = "Darkstone Chronicles - Enchanting";
    shellMounted = false;
    bindEvents();
    render();
    return true;
  }

  window.DSEnchanting = { mount: mountEnchanting };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootStandalone);
  else bootStandalone();

  window.addEventListener("ds:save", render);
})();
