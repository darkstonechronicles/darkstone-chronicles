const SAVE_KEY = "darkstone_save_v1";
const COOKING_TEMPLATE = `
  <div style="max-width:340px;margin:0 auto 12px;">
    <div style="background:#151520;border:2px solid #333;border-radius:12px;padding:10px 12px;width:100%;">
      <div style="font-weight:900;font-size:18px;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;text-align:center;">
        <span aria-hidden="true">&#127859;</span>
        <span>Cooking Lvl: <span id="cookLevel">1</span></span>
      </div>
      <div style="width:100%;">
        <div style="height:12px;background:#0f0f16;border:1px solid #2a2a3a;border-radius:999px;overflow:hidden;position:relative;">
          <div id="cookXPBar" style="height:100%;width:0%;background:#ffaa00;"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="cookXPCurrent">0</span>/<span id="cookXPNext">100</span></div>
        </div>
      </div>
    </div>
  </div>

  <div style="max-width:900px;margin:0 auto;">
    <h2 style="margin:0 0 10px;">Choose a Recipe</h2>
    <div id="recipeGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;"></div>
    <div id="emptyRecipesMsg" style="display:none;margin-top:10px;opacity:.78;font-style:italic;text-align:center;">
      You do not have anything to cook.
    </div>
  </div>
`;
const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function xpBarGradient(pct){
  if (pct < 25) return "linear-gradient(90deg,#b84a4a,#e06a6a)";
  if (pct < 50) return "linear-gradient(90deg,#c66a2b,#eea043)";
  if (pct < 75) return "linear-gradient(90deg,#4e9a43,#79c96b)";
  return "linear-gradient(90deg,#2f9e5b,#7be39e)";
}

function loadSave(){
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
  catch { return {}; }
}

function ensureCooking(save){
  save = save && typeof save === "object" ? save : {};
  if (!Number.isFinite(Number(save.cookingLevel))) save.cookingLevel = 1;
  if (!Number.isFinite(Number(save.cookingXP))) save.cookingXP = 0;
  if (!Number.isFinite(Number(save.cookingXPNext))) save.cookingXPNext = 100;
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
// ===== Fish =====

{ id:"cooked_mud_minnow", title:"Cooked Mud Minnow", req:1,
in:{type:"fish", id:"mud_minnow", name:"Mud Minnow", qty:1, img:"images/fish/mud_minnow.png"},
out:{type:"food", id:"cooked_mud_minnow", name:"Cooked Mud Minnow", img:"images/food/cooked_mud_minnow.png", healHp:4, qty:1}
},

{ id:"cooked_bog_carp", title:"Cooked Bog Carp", req:1,
in:{type:"fish", id:"bog_carp", name:"Bog Carp", qty:1, img:"images/fish/bog_carp.png"},
out:{type:"food", id:"cooked_bog_carp", name:"Cooked Bog Carp", img:"images/food/cooked_bog_carp.png", healHp:6, qty:1}
},

{ id:"cooked_shiner_fish", title:"Cooked Shiner Fish", req:10,
in:{type:"fish", id:"shiner_fish", name:"Shiner Fish", qty:1, img:"images/fish/shiner_fish.png"},
out:{type:"food", id:"cooked_shiner_fish", name:"Cooked Shiner Fish", img:"images/food/cooked_shiner_fish.png", healHp:6, qty:1}
},

{ id:"cooked_golden_perch", title:"Cooked Golden Perch", req:10,
in:{type:"fish", id:"golden_perch", name:"Golden Perch", qty:1, img:"images/fish/golden_perch.png"},
out:{type:"food", id:"cooked_golden_perch", name:"Cooked Golden Perch", img:"images/food/cooked_golden_perch.png", healHp:8, qty:1}
},

{ id:"cooked_spiny_sunfish", title:"Cooked Spiny Sunfish", req:20,
in:{type:"fish", id:"spiny_sunfish", name:"Spiny Sunfish", qty:1, img:"images/fish/spiny_sunfish.png"},
out:{type:"food", id:"cooked_spiny_sunfish", name:"Cooked Spiny Sunfish", img:"images/food/cooked_spiny_sunfish.png", healHp:8, qty:1}
},

{ id:"cooked_striped_bass", title:"Cooked Striped Bass", req:20,
in:{type:"fish", id:"striped_bass", name:"Striped Bass", qty:1, img:"images/fish/striped_bass.png"},
out:{type:"food", id:"cooked_striped_bass", name:"Cooked Striped Bass", img:"images/food/cooked_striped_bass.png", healHp:10, qty:1}
},

{ id:"cooked_stone_catfish", title:"Cooked Stone Catfish", req:30,
in:{type:"fish", id:"stone_catfish", name:"Stone Catfish", qty:1, img:"images/fish/stone_catfish.png"},
out:{type:"food", id:"cooked_stone_catfish", name:"Cooked Stone Catfish", img:"images/food/cooked_stone_catfish.png", healHp:10, qty:1}
},

{ id:"cooked_crystal_pike", title:"Cooked Crystal Pike", req:30,
in:{type:"fish", id:"crystal_pike", name:"Crystal Pike", qty:1, img:"images/fish/crystal_pike.png"},
out:{type:"food", id:"cooked_crystal_pike", name:"Cooked Crystal Pike", img:"images/food/cooked_crystal_pike.png", healHp:12, qty:1}
},

{ id:"cooked_moon_carp", title:"Cooked Moon Carp", req:40,
in:{type:"fish", id:"moon_carp", name:"Moon Carp", qty:1, img:"images/fish/moon_carp.png"},
out:{type:"food", id:"cooked_moon_carp", name:"Cooked Moon Carp", img:"images/food/cooked_moon_carp.png", healHp:12, qty:1}
},

{ id:"cooked_glass_eel", title:"Cooked Glass Eel", req:40,
in:{type:"fish", id:"glass_eel", name:"Glass Eel", qty:1, img:"images/fish/glass_eel.png"},
out:{type:"food", id:"cooked_glass_eel", name:"Cooked Glass Eel", img:"images/food/cooked_glass_eel.png", healHp:14, qty:1}
},

{ id:"cooked_frost_salmon", title:"Cooked Frost Salmon", req:50,
in:{type:"fish", id:"frost_salmon", name:"Frost Salmon", qty:1, img:"images/fish/frost_salmon.png"},
out:{type:"food", id:"cooked_frost_salmon", name:"Cooked Frost Salmon", img:"images/food/cooked_frost_salmon.png", healHp:14, qty:1}
},

{ id:"cooked_glacier_char", title:"Cooked Glacier Char", req:50,
in:{type:"fish", id:"glacier_char", name:"Glacier Char", qty:1, img:"images/fish/glacier_char.png"},
out:{type:"food", id:"cooked_glacier_char", name:"Cooked Glacier Char", img:"images/food/cooked_glacier_char.png", healHp:16, qty:1}
},

{ id:"cooked_ice_sturgeon", title:"Cooked Ice Sturgeon", req:60,
in:{type:"fish", id:"ice_sturgeon", name:"Ice Sturgeon", qty:1, img:"images/fish/ice_sturgeon.png"},
out:{type:"food", id:"cooked_ice_sturgeon", name:"Cooked Ice Sturgeon", img:"images/food/cooked_ice_sturgeon.png", healHp:16, qty:1}
},

{ id:"cooked_spiral_horn_gar", title:"Cooked Spiral Horn Gar", req:60,
in:{type:"fish", id:"spiral_horn_gar", name:"Spiral Horn Gar", qty:1, img:"images/fish/spiral_horn_gar.png"},
out:{type:"food", id:"cooked_spiral_horn_gar", name:"Cooked Spiral Horn Gar", img:"images/food/cooked_spiral_horn_gar.png", healHp:18, qty:1}
},

{ id:"cooked_storm_mackerel", title:"Cooked Storm Mackerel", req:70,
in:{type:"fish", id:"storm_mackerel", name:"Storm Mackerel", qty:1, img:"images/fish/storm_mackerel.png"},
out:{type:"food", id:"cooked_storm_mackerel", name:"Cooked Storm Mackerel", img:"images/food/cooked_storm_mackerel.png", healHp:18, qty:1}
},

{ id:"cooked_lantern_pike", title:"Cooked Lantern Pike", req:70,
in:{type:"fish", id:"lantern_pike", name:"Lantern Pike", qty:1, img:"images/fish/lantern_pike.png"},
out:{type:"food", id:"cooked_lantern_pike", name:"Cooked Lantern Pike", img:"images/food/cooked_lantern_pike.png", healHp:20, qty:1}
},

{ id:"cooked_ghost_ray", title:"Cooked Ghost Ray", req:80,
in:{type:"fish", id:"ghost_ray", name:"Ghost Ray", qty:1, img:"images/fish/ghost_ray.png"},
out:{type:"food", id:"cooked_ghost_ray", name:"Cooked Ghost Ray", img:"images/food/cooked_ghost_ray.png", healHp:20, qty:1}
},

{ id:"cooked_hammerhead_pike", title:"Cooked Hammerhead Pike", req:80,
in:{type:"fish", id:"hammerhead_pike", name:"Hammerhead Pike", qty:1, img:"images/fish/hammerhead_pike.png"},
out:{type:"food", id:"cooked_hammerhead_pike", name:"Cooked Hammerhead Pike", img:"images/food/cooked_hammerhead_pike.png", healHp:22, qty:1}
},

{ id:"cooked_void_angler", title:"Cooked Void Angler", req:90,
in:{type:"fish", id:"void_angler", name:"Void Angler", qty:1, img:"images/fish/void_angler.png"},
out:{type:"food", id:"cooked_void_angler", name:"Cooked Void Angler", img:"images/food/cooked_void_angler.png", healHp:22, qty:1}
},

{ id:"cooked_leviathan_marlin", title:"Cooked Leviathan Marlin", req:90,
in:{type:"fish", id:"leviathan_marlin", name:"Leviathan Marlin", qty:1, img:"images/fish/leviathan_marlin.png"},
out:{type:"food", id:"cooked_leviathan_marlin", name:"Cooked Leviathan Marlin", img:"images/food/cooked_leviathan_marlin.png", healHp:24, qty:1}
},
// ===== Dark Hunting Meat =====

{
  id:"cooked_shadow_hare_meat",
  title:"Cooked Shadow Hare Meat",
  req:1,
  in:{type:"meat", id:"raw_shadow_hare_meat", name:"Raw Shadow Hare Meat", qty:1, img:"images/meat/shadow_hare_raw.png"},
  out:{type:"food", id:"cooked_shadow_hare_meat", name:"Cooked Shadow Hare Meat", img:"images/meat/shadow_hare_cooked.png", healStamina:2, qty:1}
},

{
  id:"cooked_rotfeather_turkey_meat",
  title:"Cooked Rotfeather Turkey Meat",
  req:10,
  in:{type:"meat", id:"raw_rotfeather_turkey_meat", name:"Raw Rotfeather Turkey Meat", qty:1, img:"images/meat/rotfeather_turkey_raw.png"},
  out:{type:"food", id:"cooked_rotfeather_turkey_meat", name:"Cooked Rotfeather Turkey Meat", img:"images/meat/rotfeather_turkey_cooked.png", healStamina:3, qty:1}
},

{
  id:"cooked_gloom_fox_meat",
  title:"Cooked Gloom Fox Meat",
  req:20,
  in:{type:"meat", id:"raw_gloom_fox_meat", name:"Raw Gloom Fox Meat", qty:1, img:"images/meat/gloom_fox_raw.png"},
  out:{type:"food", id:"cooked_gloom_fox_meat", name:"Cooked Gloom Fox Meat", img:"images/meat/gloom_fox_cooked.png", healStamina:4, qty:1}
},

{
  id:"cooked_bloodtusk_boar_meat",
  title:"Cooked Bloodtusk Boar Meat",
  req:30,
  in:{type:"meat", id:"raw_bloodtusk_boar_meat", name:"Raw Bloodtusk Boar Meat", qty:1, img:"images/meat/bloodtusk_boar_raw.png"},
  out:{type:"food", id:"cooked_bloodtusk_boar_meat", name:"Cooked Bloodtusk Boar Meat", img:"images/meat/bloodtusk_boar_cooked.png", healStamina:5, qty:1}
},

{
  id:"cooked_night_wolf_meat",
  title:"Cooked Night Wolf Meat",
  req:40,
  in:{type:"meat", id:"raw_night_wolf_meat", name:"Raw Night Wolf Meat", qty:1, img:"images/meat/night_wolf_raw.png"},
  out:{type:"food", id:"cooked_night_wolf_meat", name:"Cooked Night Wolf Meat", img:"images/meat/night_wolf_cooked.png", healStamina:6, qty:1}
},

{
  id:"cooked_stonehorn_ram_meat",
  title:"Cooked Stonehorn Ram Meat",
  req:50,
  in:{type:"meat", id:"raw_stonehorn_ram_meat", name:"Raw Stonehorn Ram Meat", qty:1, img:"images/meat/stonehorn_ram_raw.png"},
  out:{type:"food", id:"cooked_stonehorn_ram_meat", name:"Cooked Stonehorn Ram Meat", img:"images/meat/stonehorn_ram_cooked.png", healStamina:7, qty:1}
},

{
  id:"cooked_thorn_stag_meat",
  title:"Cooked Thorn Stag Meat",
  req:60,
  in:{type:"meat", id:"raw_thorn_stag_meat", name:"Raw Thorn Stag Meat", qty:1, img:"images/meat/thorn_stag_raw.png"},
  out:{type:"food", id:"cooked_thorn_stag_meat", name:"Cooked Thorn Stag Meat", img:"images/meat/thorn_stag_cooked.png", healStamina:8, qty:1}
},

{
  id:"cooked_grave_bear_meat",
  title:"Cooked Grave Bear Meat",
  req:70,
  in:{type:"meat", id:"raw_grave_bear_meat", name:"Raw Grave Bear Meat", qty:1, img:"images/meat/bear_raw.png"},
  out:{type:"food", id:"cooked_grave_bear_meat", name:"Cooked Grave Bear Meat", img:"images/meat/bear_cooked.png", healStamina:9, qty:1}
},

{
  id:"cooked_dire_warg_meat",
  title:"Cooked Dire Warg Meat",
  req:80,
  in:{type:"meat", id:"raw_dire_warg_meat", name:"Raw Dire Warg Meat", qty:1, img:"images/meat/dire_warg_raw.png"},
  out:{type:"food", id:"cooked_dire_warg_meat", name:"Cooked Dire Warg Meat", img:"images/meat/dire_warg_cooked.png", healStamina:10, qty:1}
},

{
  id:"cooked_forest_troll_meat",
  title:"Cooked Forest Troll Meat",
  req:90,
  in:{type:"meat", id:"raw_forest_troll_meat", name:"Raw Forest Troll Meat", qty:1, img:"images/meat/troll_raw.png"},
  out:{type:"food", id:"cooked_forest_troll_meat", name:"Cooked Forest Troll Meat", img:"images/meat/troll_cooked.png", healStamina:11, qty:1}
},];

function renderHeader(){
  const s = ensureCooking(loadSave());
  document.getElementById("cookLevel").textContent = String(s.cookingLevel);
  document.getElementById("cookXPCurrent").textContent = String(s.cookingXP);
  document.getElementById("cookXPNext").textContent = String(s.cookingXPNext);

  const pct = s.cookingXPNext > 0 ? clamp((s.cookingXP / s.cookingXPNext) * 100, 0, 100) : 0;
  document.getElementById("cookXPBar").style.width = pct.toFixed(1) + "%";
  document.getElementById("cookXPBar").style.background = xpBarGradient(pct);
}

function invCount(save, type, id){
  let c = 0;
  for (const it of save.inventory || []){
    if (!it) continue;
    if ((it.type || "") === type && (it.id || "") === id){
      c += Math.max(1, num(it.quantity ?? it.qty, 1));
    }
  }
  return c;
}

function effectText(out){
  const hp = num(out.healHp, 0);
  const st = num(out.healStamina, 0);

  if (hp > 0 && st > 0) return `Heals <b>+${hp} HP</b> • Restores <b>+${st} ST</b>`;
  if (hp > 0) return `Heals <b>+${hp} HP</b>`;
  if (st > 0) return `Restores <b>+${st} ST</b>`;
  return `—`;
}

function renderRecipes(){
  const grid = document.getElementById("recipeGrid");
  const emptyMsg = document.getElementById("emptyRecipesMsg");
  if (!grid) return;

  const s = ensureCooking(loadSave());
  grid.innerHTML = "";

  const availableRecipes = RECIPES.filter(r => invCount(s, r.in.type, r.in.id) > 0);
  if (emptyMsg) emptyMsg.style.display = availableRecipes.length ? "none" : "block";

  availableRecipes.forEach(r => {
    const effectiveLevel = s.cookingLevel + getArtisanPotionBonus(s);
    const locked = effectiveLevel < r.req;
    const have = invCount(s, r.in.type, r.in.id);
    const enough = have >= r.in.qty;

    const card = document.createElement("div");
    card.style.background = "#151520";
    card.style.border = "2px solid #333";
    card.style.borderRadius = "12px";
    card.style.padding = "12px";
    card.style.textAlign = "left";
    card.style.cursor = locked ? "not-allowed" : "pointer";
    card.style.opacity = locked ? "0.55" : "1";
    card.style.height = "140px";
    if (!locked) card.dataset.openTabHref = `cooking_action.html?recipe=${encodeURIComponent(r.id)}`;

  card.innerHTML = `
<div style="display:grid;grid-template-columns:90px 1fr;gap:14px;align-items:stretch;height:100%;">

  <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:100%;">

    <img src="${r.in.img}" alt="${r.in.name}"
      style="width:80px;height:80px;border-radius:14px;border:2px solid #333;object-fit:cover;background:#0f0f16;">

    <div style="
      margin-top:6px;
      font-weight:900;
      font-size:13px;
      color:${locked ? "#ff6b6b" : (enough ? "#2dff7c" : "#ffcc66")}
    ">
      ${locked ? "LOCKED" : (enough ? "READY" : "MISSING")}
    </div>

  </div>

  <div>

    <div style="
  font-weight:900;
  font-size:16px;
  height:38px;
  line-height:18px;
  overflow:hidden;
">
      ${r.title}
    </div>

    <div style="opacity:.85;font-size:12px;">
      Req Cooking Lv <b>${r.req}</b> • ${effectText(r.out)}
    </div>

    <div style="opacity:.85;font-size:12px;margin-top:4px;">
      Need: <b>${r.in.name}</b> x${r.in.qty}
    </div>

    <div style="opacity:.85;font-size:12px;margin-top:2px;">
      You have: <b>${have}</b>
    </div>

  </div>

</div>
`;

    if (!locked){
      card.addEventListener("click", () => {
        const href = String(card.dataset.openTabHref || `cooking_action.html?recipe=${encodeURIComponent(r.id)}`);
        if (window.DSUI?.navigateWithinShell?.(href)) return;
        window.location.href = href;
      });
    }

    grid.appendChild(card);
  });
}

function renderCookingView() {
  if (!document.getElementById("recipeGrid")) return;
  document.title = "Darkstone Chronicles - Cooking";
  renderHeader();
  renderRecipes();
}

function mountCooking(root = null) {
  const left = root || document.getElementById("leftPanel");
  if (!left) return false;
  left.innerHTML = COOKING_TEMPLATE;
  renderCookingView();
  return true;
}

function initStandaloneCooking() {
  if (!document.getElementById("recipeGrid")) return false;
  renderCookingView();
  return true;
}

window.DSCooking = { mount: mountCooking };

window.addEventListener("DOMContentLoaded", () => {
  initStandaloneCooking();
});

window.addEventListener("ds:save", renderCookingView);
