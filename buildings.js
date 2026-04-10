const SAVE_KEY = "darkstone_save_v1";
const MAX_LEVEL = 150;
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
    bonusPerLevel: 0.05,
    bonusText: "Fighting Fields ATK/DEF",
    desc: "Permanent bonus in Fight only.",
    img: "images/buildings/barracks.png"
  },
  {
    id: "cryptHall",
    name: "Crypt Hall",
    levelKey: "cryptHallLevel",
    sigilName: "Crypt Sigil",
    bonusPerLevel: 0.05,
    bonusText: "Dungeon ATK/DEF",
    desc: "Bonus applies only inside Dungeons.",
    img: "images/buildings/crypt_hall.png"
  },
  {
    id: "minerHut",
    name: "Miner Hut",
    levelKey: "minerHutLevel",
    sigilName: "Ore Sigil",
    bonusPerLevel: 0.0005,
    bonusText: "Mining XP",
    desc: "Bonus applies only to Mining XP.",
    img: "images/buildings/miner_hut.png"
  },
  {
    id: "forgeAcademy",
    name: "Forge Academy",
    levelKey: "forgeAcademyLevel",
    sigilName: "Ore Sigil",
    bonusPerLevel: 0.0005,
    bonusText: "Blacksmith XP",
    desc: "Bonus applies only to smelting XP.",
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

function render(){
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
      <span style="width:84px;height:84px;padding:4px;border-radius:8px;border:2px solid ${isSelected ? "#d4a04f" : "#333"};background:#0f0f16;box-shadow:${isSelected ? "0 0 0 1px #e0b36a inset, 0 10px 24px rgba(0,0,0,.32)" : "0 0 0 1px rgba(255,255,255,.04) inset, 0 10px 24px rgba(0,0,0,.26)"};">
        <img src="${b.img}" alt="${b.name}" style="width:100%;height:100%;display:block;object-fit:cover;border-radius:6px;">
      </span>
      <span style="min-width:138px;padding:8px 10px;border-radius:10px;border:1px solid ${isSelected ? "#e0b36a" : "rgba(255,255,255,.12)"};background:${isSelected ? "#2a2212" : "#101019"};text-align:center;line-height:1.2;">
        <span style="display:block;font-size:14px;font-weight:900;">${b.name}</span>
        <span style="display:block;margin-top:4px;font-size:12px;opacity:.85;">Level ${lvl}/${MAX_LEVEL}</span>
      </span>
    `;
    card.addEventListener("click", () => {
      selectedBuildingId = (selectedBuildingId === b.id) ? null : b.id;
      render();
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
      <img src="${b.img}" alt="${b.name}" style="width:96px;height:96px;border-radius:12px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
      <div style="flex:1;min-width:240px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="font-size:22px;font-weight:900;">${b.name}</div>
          <div style="padding:6px 10px;border-radius:999px;background:#101019;border:1px solid rgba(255,255,255,.08);">Level ${lvl}/${MAX_LEVEL}</div>
        </div>
        <div style="margin-top:6px;opacity:.86;">${b.desc}</div>
        <div style="margin-top:12px;font-size:14px;">Current bonus: <b>+${bonusPct(lvl, b.bonusPerLevel).toFixed(2)}%</b> ${b.bonusText}</div>
        <div style="margin-top:6px;font-size:14px;">Next level bonus: <b>+${bonusPct(nextLvl, b.bonusPerLevel).toFixed(2)}%</b> ${b.bonusText}</div>
      </div>
    </div>
    <div style="margin-top:14px;padding:12px;border-radius:12px;background:#101019;border:1px solid rgba(255,255,255,.08);">
      <div style="font-size:15px;font-weight:900;margin-bottom:8px;">Upgrade Requirements</div>
      <div style="font-size:13px;opacity:.92;">${costLines}</div>
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
  setMsg(`${b.name} upgraded to Level ${nextLvl}.`);
  render();
}

window.addEventListener("DOMContentLoaded", () => {
  render();
});
