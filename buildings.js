(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const MAX_LEVEL = 150;
  const BUILDING_BONUS_PER_LEVEL = 0.0005;
  const BUILDINGS_TEMPLATE = `
    <h1>Buildings</h1>

    <div id="buildingsWrap" style="max-width:900px;margin:0 auto;display:grid;gap:18px;">
      <div id="buildingsGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;justify-items:center;"></div>
      <div id="buildingDetail" style="display:none;background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:14px;padding:16px;box-shadow:var(--card-medieval-shadow);"></div>
    </div>

    <div id="msg" style="margin-top:10px;text-align:center;opacity:.9;color:#d9ccb0;"></div>
  `;

  let selectedBuildingId = null;

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function setSave(next){
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

  const BUILDINGS = [
    {
      id: "barracks",
      name: "Barracks",
      levelKey: "barracksLevel",
      sigilName: "War Sigil",
      bonusPerLevel: BUILDING_BONUS_PER_LEVEL,
      bonusText: "Fighting Fields ATK/DEF",
      desc: "Permanent bonus in Fight only.",
      img: "images/buildings/barracks.png"
    },
    {
      id: "cryptHall",
      name: "Crypt Hall",
      levelKey: "cryptHallLevel",
      sigilName: "Crypt Sigil",
      bonusPerLevel: BUILDING_BONUS_PER_LEVEL,
      bonusText: "Dungeon ATK/DEF",
      desc: "Bonus applies only inside Dungeons.",
      img: "images/buildings/crypt_hall.png"
    },
    {
      id: "minerHut",
      name: "Miner Hut",
      levelKey: "minerHutLevel",
      sigilName: "Ore Sigil",
      bonusPerLevel: BUILDING_BONUS_PER_LEVEL,
      bonusText: "Mining XP",
      desc: "Bonus applies only to Mining XP.",
      img: "images/buildings/miner_hut.png"
    },
    {
      id: "forgeAcademy",
      name: "Forge Academy",
      levelKey: "forgeAcademyLevel",
      sigilName: "Ore Sigil",
      bonusPerLevel: BUILDING_BONUS_PER_LEVEL,
      bonusText: "Blacksmith XP",
      desc: "Bonus applies only to smelting XP.",
      img: "images/buildings/forge_academy.png"
    },
    {
      id: "foresterLodge",
      name: "Forester Lodge",
      levelKey: "foresterLodgeLevel",
      sigilName: "Wood Sigil",
      bonusPerLevel: BUILDING_BONUS_PER_LEVEL,
      bonusText: "Woodcutting XP",
      desc: "Bonus applies only to wood gathering XP.",
      img: "images/buildings/miner_hut.png"
    },
    {
      id: "carpenterWorkshop",
      name: "Carpenter Workshop",
      levelKey: "carpenterWorkshopLevel",
      sigilName: "Wood Sigil",
      bonusPerLevel: BUILDING_BONUS_PER_LEVEL,
      bonusText: "Carpentry XP",
      desc: "Bonus applies only to plank crafting XP.",
      img: "images/buildings/forge_academy.png"
    }
  ];

  const TIERS = [
    { min: 1, max: 30, bar: "Copper Bar", plank: "Ash Plank", sigilBase: 1 },
    { min: 31, max: 60, bar: "Silver Bar", plank: "Pine Plank", sigilBase: 4 },
    { min: 61, max: 90, bar: "Iron Bar", plank: "Birch Plank", sigilBase: 7 },
    { min: 91, max: 120, bar: "Mithril Bar", plank: "Oak Plank", sigilBase: 10 },
    { min: 121, max: 150, bar: "Adamant Bar", plank: "Cedar Plank", sigilBase: 13 }
  ];

  function getTierForLevel(level){
    return TIERS.find((t) => level >= t.min && level <= t.max) || null;
  }

  function getCostForLevel(level, sigilName){
    if (level < 1 || level > MAX_LEVEL) return null;
    const tier = getTierForLevel(level);
    if (!tier) return null;

    const offset = Math.floor((level - tier.min) / 10);
    const qty = 5 + (offset * 5);
    const sigils = tier.sigilBase + offset;

    return [
      { name: tier.bar, qty },
      { name: tier.plank, qty },
      { name: sigilName, qty: sigils }
    ];
  }

  function getQtyByName(inv, name){
    const it = inv.find((x) => x && String(x.name || "").toLowerCase() === String(name).toLowerCase());
    if (!it) return 0;
    const q = Number(it.quantity ?? it.qty);
    return Number.isFinite(q) ? Math.max(1, q) : 1;
  }

  function removeByName(save, name, qtyNeeded){
    const idx = save.inventory.findIndex((it) => it && String(it.name || "").toLowerCase() === String(name).toLowerCase());
    if (idx < 0) return false;
    const it = save.inventory[idx];
    const q = Number(it.quantity ?? it.qty);
    const have = Number.isFinite(q) ? Math.max(1, q) : 1;

    if (have > qtyNeeded){
      it.quantity = have - qtyNeeded;
      return true;
    }
    if (have === qtyNeeded){
      save.inventory.splice(idx, 1);
      return true;
    }
    return false;
  }

  function bonusPct(level, perLevel){
    return Math.max(0, num(level, 0)) * Math.max(0, num(perLevel, 0));
  }

  function formatBonusPct(value){
    const pct = Math.max(0, num(value, 0) * 100);
    const rounded = Math.round(pct * 100) / 100;
    return Number.isInteger(rounded)
      ? rounded.toFixed(0)
      : rounded.toFixed(2).replace(/\.?0+$/, "");
  }

  function setMsg(t){
    const el = document.getElementById("msg");
    if (el) el.textContent = t || "";
  }

  function canPay(save, cost){
    for (const c of cost){
      if (getQtyByName(save.inventory, c.name) < c.qty) return false;
    }
    return true;
  }

  function payCost(save, cost){
    for (const c of cost){
      const ok = removeByName(save, c.name, c.qty);
      if (!ok) return false;
    }
    return true;
  }

  function renderBuildings(){
    const grid = document.getElementById("buildingsGrid");
    const detail = document.getElementById("buildingDetail");
    if (!grid || !detail) return;

    const save = loadSave();
    if (!Array.isArray(save.inventory)) save.inventory = [];
    BUILDINGS.forEach((b) => {
      if (!Number.isFinite(Number(save[b.levelKey]))) save[b.levelKey] = 0;
    });

    grid.innerHTML = "";

    for (const b of BUILDINGS){
      const lvl = Math.max(0, num(save[b.levelKey], 0));
      const isSelected = selectedBuildingId === b.id;
      const card = document.createElement("button");
      card.type = "button";
      card.style.width = "100%";
      card.style.maxWidth = "160px";
      card.style.padding = "0";
      card.style.border = "0";
      card.style.background = "transparent";
      card.style.color = "#fff";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.alignItems = "center";
      card.style.gap = "10px";
      card.style.cursor = "pointer";
      card.innerHTML = `
        <span style="width:84px;height:84px;padding:4px;border-radius:10px;border:1px solid ${isSelected ? "rgba(166,124,64,.98)" : "rgba(126,94,50,.88)"};background:linear-gradient(180deg, rgba(46,35,23,.96) 0%, rgba(24,20,19,.98) 100%);box-shadow:${isSelected ? "0 0 0 1px rgba(60,40,16,.82), inset 0 1px 0 rgba(255,232,184,.12), inset 0 -10px 18px rgba(0,0,0,.22), 0 12px 20px rgba(0,0,0,.2)" : "0 0 0 1px rgba(28,20,12,.84), inset 0 1px 0 rgba(255,228,178,.08), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18)"};">
          <img src="${b.img}" alt="${b.name}" style="width:100%;height:100%;display:block;object-fit:cover;border-radius:6px;">
        </span>
        <span style="min-width:138px;padding:8px 10px;border-radius:10px;border:1px solid ${isSelected ? "rgba(166,124,64,.98)" : "rgba(126,94,50,.88)"};background:linear-gradient(180deg, rgba(86,64,38,.34), rgba(26,23,26,.16) 42%, rgba(0,0,0,.10) 100%), linear-gradient(180deg, #34281d 0%, #1d1a1d 100%);text-align:center;line-height:1.2;box-shadow:${isSelected ? "0 0 0 1px rgba(60,40,16,.82), inset 0 1px 0 rgba(255,232,184,.12), inset 0 -10px 18px rgba(0,0,0,.22), 0 12px 20px rgba(0,0,0,.2)" : "0 0 0 1px rgba(28,20,12,.9), inset 0 1px 0 rgba(255,228,178,.08), inset 0 0 0 1px rgba(255,214,143,.04), inset 0 -8px 14px rgba(0,0,0,.16), 0 8px 16px rgba(0,0,0,.18)"};">
          <span style="display:block;font-size:14px;font-weight:900;color:#f3ead6;text-shadow:0 1px 0 rgba(74,47,14,.95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">${b.name}</span>
          <span style="display:block;margin-top:4px;font-size:12px;opacity:.9;color:#e7d7b6;">Level ${lvl}/${MAX_LEVEL}</span>
        </span>
      `;
      card.addEventListener("click", () => {
        selectedBuildingId = (selectedBuildingId === b.id) ? null : b.id;
        renderBuildings();
      });
      grid.appendChild(card);
    }

    const b = BUILDINGS.find((x) => x.id === selectedBuildingId);
    if (!b){
      detail.style.display = "none";
      detail.innerHTML = "";
      return;
    }

    const lvl = Math.max(0, num(save[b.levelKey], 0));
    const nextLvl = lvl + 1;
    const cost = getCostForLevel(nextLvl, b.sigilName);
    const maxed = lvl >= MAX_LEVEL;
    const costLines = cost ? cost.map((c) => `${c.qty} ${c.name}`).join(" | ") : "Max level reached";

    detail.style.display = "block";
    detail.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;">
        <img src="${b.img}" alt="${b.name}" style="width:96px;height:96px;border-radius:12px;border:1px solid rgba(126,94,50,.88);object-fit:cover;background:linear-gradient(180deg, rgba(46,35,23,.96) 0%, rgba(24,20,19,.98) 100%);box-shadow:0 0 0 1px rgba(28,20,12,.84), inset 0 1px 0 rgba(255,228,178,.08), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
        <div style="flex:1;min-width:240px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-size:22px;font-weight:900;color:#f3ead6;text-shadow:0 1px 0 rgba(74,47,14,.95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">${b.name}</div>
            <div style="padding:6px 10px;border-radius:999px;background:linear-gradient(180deg, rgba(46,35,23,.96) 0%, rgba(24,20,19,.98) 100%);border:1px solid rgba(126,94,50,.88);color:#f3ead6;box-shadow:0 0 0 1px rgba(28,20,12,.84), inset 0 1px 0 rgba(255,228,178,.08), inset 0 -10px 16px rgba(0,0,0,.14);">Level ${lvl}/${MAX_LEVEL}</div>
          </div>
          <div style="margin-top:6px;opacity:.9;color:#d9ccb0;">${b.desc}</div>
          <div style="margin-top:12px;font-size:14px;color:#f3ead6;">Current bonus: <b>+${formatBonusPct(bonusPct(lvl, b.bonusPerLevel))}%</b> ${b.bonusText}</div>
          <div style="margin-top:6px;font-size:14px;color:#f3ead6;">Next level bonus: <b>+${formatBonusPct(bonusPct(nextLvl, b.bonusPerLevel))}%</b> ${b.bonusText}</div>
        </div>
      </div>
      <div style="margin-top:14px;padding:12px;border-radius:12px;background:linear-gradient(180deg, rgba(46,35,23,.92) 0%, rgba(18,18,22,.96) 100%);border:1px solid rgba(126,94,50,.88);box-shadow:0 0 0 1px rgba(28,20,12,.84), inset 0 1px 0 rgba(255,228,178,.06), inset 0 -10px 16px rgba(0,0,0,.14);">
        <div style="font-size:15px;font-weight:900;margin-bottom:8px;color:#f3ead6;text-shadow:0 1px 0 rgba(74,47,14,.95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Upgrade Requirements</div>
        <div style="font-size:13px;opacity:.96;color:#f3ead6;">${costLines}</div>
      </div>
      <div style="margin-top:12px;display:flex;justify-content:flex-end;">
        <button id="upgradeSelectedBtn" ${maxed ? "disabled" : ""}>${maxed ? "Max Level" : `Upgrade to Lv ${nextLvl}`}</button>
      </div>
    `;

    detail.querySelector("#upgradeSelectedBtn")?.addEventListener("click", () => doUpgrade(b.id));
  }

  function doUpgrade(id){
    const b = BUILDINGS.find((x) => x.id === id);
    if (!b) return;

    const save = loadSave();
    if (!Array.isArray(save.inventory)) save.inventory = [];
    if (!Number.isFinite(Number(save[b.levelKey]))) save[b.levelKey] = 0;

    const lvl = Math.max(0, num(save[b.levelKey], 0));
    if (lvl >= MAX_LEVEL){
      setMsg(`${b.name} is already max level.`);
      return;
    }

    const nextLvl = lvl + 1;
    const cost = getCostForLevel(nextLvl, b.sigilName);
    if (!cost){
      setMsg("Invalid upgrade level.");
      return;
    }
    if (!canPay(save, cost)){
      setMsg("Not enough materials.");
      return;
    }
    if (!payCost(save, cost)){
      setMsg("Failed to consume materials.");
      return;
    }

    save[b.levelKey] = nextLvl;
    setSave(save);
    window.dispatchEvent(new Event("ds:save"));
    setMsg(`${b.name} upgraded to Level ${nextLvl}.`);
    renderBuildings();
  }

  function mountBuildings(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = BUILDINGS_TEMPLATE;
    document.title = "Darkstone Chronicles - Buildings";
    renderBuildings();
    return true;
  }

  function initStandaloneBuildings() {
    if (!document.getElementById("buildingsGrid")) return false;
    document.title = "Darkstone Chronicles - Buildings";
    renderBuildings();
    return true;
  }

  window.DSBuildings = {
    mount: mountBuildings
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneBuildings();
  });
})();
