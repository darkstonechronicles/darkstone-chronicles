// wood_sawmill.js — selection page for plank recipes (locked by carpentry level)

(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const num = (v,f=0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function ensureWood(save){
    save = save && typeof save === "object" ? save : {};
    save.carpentryLevel = Math.max(1, num(save.carpentryLevel, 1));
    save.carpentryXP = Math.max(0, num(save.carpentryXP, 0));
    save.carpentryXPNext = Math.max(1, num(save.carpentryXPNext, 100));
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

  const RECIPES = [
    { id:"ash_plank",      name:"Ash Plank",      req: 1,  inputText:"5 Ash Log",      img:"images/wood/planks/ash_plank.png" },
    { id:"pine_plank",     name:"Pine Plank",     req:10,  inputText:"5 Pine Log",     img:"images/wood/planks/pine_plank.png" },
    { id:"birch_plank",    name:"Birch Plank",    req:20,  inputText:"5 Birch Log",    img:"images/wood/planks/birch_plank.png" },
    { id:"oak_plank",      name:"Oak Plank",      req:30,  inputText:"5 Oak Log",      img:"images/wood/planks/oak_plank.png" },
    { id:"cedar_plank",    name:"Cedar Plank",    req:40,  inputText:"5 Cedar Log",    img:"images/wood/planks/cedar_plank.png" },
    { id:"maple_plank",    name:"Maple Plank",    req:50,  inputText:"5 Maple Log",    img:"images/wood/planks/maple_plank.png" },
    { id:"ironwood_plank", name:"Ironwood Plank", req:60,  inputText:"5 Ironwood Log", img:"images/wood/planks/ironwood_plank.png" },
    { id:"heartwood_plank",name:"Heartwood Plank",req:70,  inputText:"5 Heartwood Log",img:"images/wood/planks/heartwood_plank.png" },
    { id:"darkwood_plank", name:"Darkwood Plank", req:80,  inputText:"5 Darkwood Log", img:"images/wood/planks/darkwood_plank.png" },
    { id:"ebony_plank",    name:"Ebony Plank",    req:90,  inputText:"5 Ebony Log",    img:"images/wood/planks/ebony_plank.png" }
  ];

  function el(id){ return document.getElementById(id); }

  function renderTop(save){
    el("woodLevel").textContent = String(save.carpentryLevel);
    el("woodXPCurrent").textContent = String(save.carpentryXP);
    el("woodXPNext").textContent = String(save.carpentryXPNext);
    const pct = clamp((save.carpentryXP / Math.max(1, save.carpentryXPNext)) * 100, 0, 100);
    el("woodXPBar").style.width = `${pct}%`;
  }

  function renderGrid(save){
    const grid = el("plankGrid");
    grid.innerHTML = "";

    RECIPES.forEach(r => {
      const effectiveLevel = save.carpentryLevel + getArtisanPotionBonus(save);
      const locked = effectiveLevel < r.req;

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

      const img = document.createElement("img");
      img.src = r.img;
      img.alt = r.name;
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
      title.textContent = r.name;

      const req = document.createElement("div");
      req.style.opacity = ".88";
      req.style.marginTop = "4px";
      req.textContent = `Req Lv ${r.req}`;

      const mats = document.createElement("div");
      mats.style.opacity = ".85";
      mats.style.marginTop = "6px";
      mats.textContent = r.inputText;

      info.appendChild(title);
      info.appendChild(req);
      info.appendChild(mats);

      card.appendChild(img);
      card.appendChild(info);

      if (!locked) {
        card.addEventListener("click", () => {
          window.location.href = `wood_sawmill_action.html?recipe=${encodeURIComponent(r.id)}`;
        });
      }

      grid.appendChild(card);
    });
  }

  function boot(){
    const save = ensureWood(loadSave());
    renderTop(save);
    renderGrid(save);

    window.addEventListener("ds:save", () => {
      const s = ensureWood(loadSave());
      renderTop(s);
      renderGrid(s);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
