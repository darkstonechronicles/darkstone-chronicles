// wood_gather.js — selection page for wood tiers (USES LOG ICONS so they won't be broken)

(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const num = (v,f=0) => (Number.isFinite(Number(v)) ? Number(v) : f);

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }
  function ensureWood(save){
    save = save && typeof save === "object" ? save : {};
    save.woodcuttingLevel = Math.max(1, num(save.woodcuttingLevel, 1));
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

  // Icons point to the WebP log art used across the inventory and gather screens.
  const WOODS = [
    { id:"ash",      name:"Ash",      req: 1,  img:"images/wood/logs/ash_log.webp" },
    { id:"pine",     name:"Pine",     req:10,  img:"images/wood/logs/pine_log.webp" },
    { id:"birch",    name:"Birch",    req:20,  img:"images/wood/logs/birch_log.webp" },
    { id:"oak",      name:"Oak",      req:30,  img:"images/wood/logs/oak_log.webp" },
    { id:"cedar",    name:"Cedar",    req:40,  img:"images/wood/logs/cedar_log.webp" },
    { id:"maple",    name:"Maple",    req:50,  img:"images/wood/logs/maple_log.webp" },
    { id:"ironwood", name:"Ironwood", req:60,  img:"images/wood/logs/ironwood_log.webp" },
    { id:"heartwood",name:"Heartwood",req:70,  img:"images/wood/logs/heartwood_log.webp" },
    { id:"darkwood", name:"Darkwood", req:80,  img:"images/wood/logs/darkwood_log.webp" },
    { id:"ebony",    name:"Ebony",    req:90,  img:"images/wood/logs/ebony_log.webp" }
  ];

  function boot(){
    const save = ensureWood(loadSave());
    const grid = document.getElementById("woodGrid");
    if (!grid) return;

    grid.innerHTML = "";

    WOODS.forEach(w => {
      const effectiveLevel = save.woodcuttingLevel + getGatheringPotionBonus(save);
      const locked = effectiveLevel < w.req;

      const card = document.createElement("div");
      card.style.background = "#151520";
      card.style.border = "2px solid #333";
      card.style.borderRadius = "12px";
      card.style.padding = "12px";
      card.style.cursor = locked ? "not-allowed" : "pointer";
      card.style.opacity = locked ? "0.55" : "1";

      card.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;">
          <img src="${w.img}" alt="${w.name}"
               style="width:64px;height:64px;border-radius:10px;border:2px solid #333;object-fit:cover;background:#0f0f16;">
          <div>
            <div style="font-size:16px;font-weight:700;">${w.name}</div>
            <div style="opacity:.9;font-size:12px;margin-top:4px;">Req Wood Lv <b>${w.req}</b></div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        if (locked) return alert(`Requires Woodcutting Level ${w.req}`);
        window.location.href = `wood_gather_action.html?wood=${encodeURIComponent(w.id)}`;
      });

      grid.appendChild(card);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
