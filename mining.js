// mining.js — Darkstone Chronicles (UPDATED ORE TIERS)

const SAVE_KEY = "darkstone_save_v1";

function loadSave(){
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
  catch { return {}; }
}
function setSave(next){
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
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

// ✅ New ore progression (11 ores, includes coal)
const ORES = [
  { id:"copper_ore",      name:"Copper Ore",       req:1,  img:"images/ores/copper_ore.png" },
  { id:"silver_ore",      name:"Silver Ore",       req:10, img:"images/ores/silver_ore.png" },
  { id:"iron_ore",        name:"Iron Ore",         req:20, img:"images/ores/iron_ore.png" },
  { id:"mithril_ore",     name:"Mithril Ore",      req:30, img:"images/ores/mithril_ore.png" },
  { id:"adamant_ore",     name:"Adamant Ore",      req:40, img:"images/ores/adamant_ore.png" },
  { id:"obsidian_ore",    name:"Obsidian Ore",     req:50, img:"images/ores/obsidian_ore.png" },
  { id:"crystal_ore",     name:"Crystal Ore",      req:60, img:"images/ores/crystal_ore.png" },
  { id:"sulfur_ore",      name:"Sulfur Ore",       req:70, img:"images/ores/sulfur_ore.png" },
  { id:"rose_quartz_ore", name:"Rose Quartz Ore",  req:80, img:"images/ores/rose_quartz_ore.png" },
  { id:"darkstone_ore",   name:"Darkstone Ore",    req:90, img:"images/ores/darkstone_ore.png" }
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

  const pct = save.miningXPNext > 0
    ? Math.max(0, Math.min(100, (save.miningXP / save.miningXPNext) * 100))
    : 0;

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

  ORES.forEach(o => {
    const effectiveLevel = save.miningLevel + getGatheringPotionBonus(save);
    const locked = effectiveLevel < o.req;

    const card = document.createElement("div");
    card.style.background = "#151520";
    card.style.border = "2px solid #333";
    card.style.borderRadius = "12px";
    card.style.padding = "12px";
    card.style.cursor = locked ? "not-allowed" : "pointer";
    card.style.opacity = locked ? "0.55" : "1";

    card.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;">
        <img src="${o.img}" alt="${o.name}"
             style="width:64px;height:64px;border-radius:10px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
        <div>
          <div style="font-size:16px;font-weight:700;">${o.name}</div>
          <div style="opacity:.9;font-size:12px;margin-top:4px;">Req Mining Lv <b>${o.req}</b></div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      if (locked) {
        alert(`Requires Mining Level ${o.req}`);
        return;
      }
      window.location.href = `mining_action.html?ore=${encodeURIComponent(o.id)}`;
    });

    grid.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  renderMiningHeader();
  renderOreGrid();
});
