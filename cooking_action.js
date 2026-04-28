// cooking_action.js — Darkstone Chronicles
// ✅ 6s timer loop + Start/Stop + Target
// ✅ Consumes 1 raw ingredient -> produces 1 cooked food (stackable)
// ✅ Cooking XP + Level up
// ✅ Pauses immediately when ui.js Inspector opens (ds:pause)
// ✅ FIX: Images resolved correctly on file:/// using new URL(..., document.baseURI)

(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const WARDEN_SIGIL_ITEM = {
    type: "material",
    id: "warden_sigil",
    name: "Warden Sigil",
    img: "images/items/sigils/warden_sigil.webp"
  };
  const WARDEN_SIGIL_DROP_CHANCE = 1 / 250;
  const COOKING_ACTION_TEMPLATE = `
  <div class="profXpShell">
    <div class="profXpCard">
      <div class="profXpHead">
        <span aria-hidden="true">&#127859;</span>
        <span>Cooking Lvl: <span id="cookLevel">1</span></span>
      </div>
      <div style="width:100%;">
        <div class="profXpTrack">
          <div id="cookXPBar" style="height:100%;width:0%;background:#ffaa00;"></div>
          <div style="position:absolute;top:50%;left:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;">XP</div>
          <div style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:11px;font-weight:800;line-height:1;color:#f4f1e8;text-shadow:0 1px 3px rgba(0,0,0,.75);pointer-events:none;"><span id="cookXPCurrent">0</span>/<span id="cookXPNext">100</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="profXpShell">
    <div id="artisanBonusBox" class="profBonusCard" style="padding:12px;width:100%;min-height:56px;display:flex;align-items:flex-start;gap:10px;">
      <div style="font-weight:800;font-size:14px;white-space:nowrap;line-height:1.05;text-align:center;">Bonus<br>XP</div>
      <div style="width:1px;align-self:stretch;background:#333;"></div>
      <div id="artisanBonusContent" style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;gap:2px;padding-top:2px;">
        <div id="artisanBonusTop" style="display:grid;grid-template-columns:0.8fr 1px 1.5fr 1px 1fr 1px 1fr;gap:8px;font-size:11px;font-weight:700;opacity:.9;text-align:center;align-items:center;">
          <div>Pet</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div style="font-size:10px;line-height:1;white-space:nowrap;align-self:center;">Double Craft</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div>Building</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div>Potion</div>
        </div>
        <div style="height:1px;background:#333;width:100%;"></div>
        <div id="artisanBonusBottom" style="display:grid;grid-template-columns:0.8fr 1px 1.5fr 1px 1fr 1px 1fr;gap:8px;min-height:14px;align-items:stretch;text-align:center;font-size:11px;font-weight:700;color:#cfe7ff;">
          <div id="artisanBonusPetValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="artisanBonusDoubleValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="artisanBonusBuildingValue">+0%</div>
          <div style="width:1px;align-self:stretch;background:#333;"></div>
          <div id="artisanBonusPotionValue">+0%</div>
        </div>
      </div>
    </div>
  </div>

  <div class="profActionRow">
    <button id="backBtn">Back</button>
    <button id="startBtn">Start</button>
    <button id="stopBtn" disabled>Stop</button>
  </div>

  <div class="profActionCard">
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
      <div style="display:flex;gap:12px;align-items:center;">
        <img id="inImg" src="" alt="Input"
          class="profChoiceThumb" style="width:64px;height:64px;border-radius:12px;object-fit:cover;">
        <div style="opacity:.85;font-weight:900;">-></div>
        <img id="outImg" src="" alt="Food"
          class="profChoiceThumb" style="width:64px;height:64px;border-radius:12px;object-fit:cover;">
      </div>

      <div style="flex:1;min-width:240px;">
        <div style="font-weight:800;font-size:18px;" id="recipeName">Recipe</div>
        <div style="opacity:.85;font-size:12px;margin-top:4px;" id="recipeInfo"></div>
        <div id="timerWrap" style="margin-top:10px;display:none;">
          <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
            <span>Cooking...</span>
            <span id="timerText">6.0s</span>
          </div>
          <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
            <div id="timerBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
          </div>
        </div>

        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <div style="opacity:.85;font-size:12px;">Target amount:</div>
          <input id="targetInput" type="number" min="1" step="1" placeholder="e.g. 100"
            class="profTargetInput">
          <button id="targetBtn">Cook Target</button>
          <div id="targetStatus" style="opacity:.85;font-size:12px;"></div>
        </div>
      </div>
    </div>

    <div id="msg" style="margin-top:12px;opacity:.9;"></div>
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
  function setSave(next) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }
  function appendCookingReceipt(save, receipt){
    if (!save || typeof save !== "object") return;
    const current = Array.isArray(save.recentCraftRewards) ? save.recentCraftRewards : [];
    current.unshift(receipt && typeof receipt === "object" ? receipt : {});
    save.recentCraftRewards = current.slice(0, 20);
  }
  function commitCookingTick(save, payload = {}){
    const next = save && typeof save === "object" ? save : {};
    const receipt = {
      id: `cooking:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
      at: new Date().toISOString(),
      profession: "cooking",
      itemName: String(payload.itemName || ""),
      itemId: String(payload.itemId || ""),
      outputQty: Math.max(1, num(payload.outputQty, 1)),
      xp: Math.max(0, num(payload.xp, 0)),
      doubled: payload.doubled === true,
      sigilDrop: payload.sigilDrop === true,
      petXp: Math.max(0, num(payload.petXp, 0))
    };
    appendCookingReceipt(next, receipt);
    next.lastCraftRewardAt = Date.now();
    setSave(next);
    window.dispatchEvent(new Event("ds:save"));
    window.DSAuth?.prioritizeCloudSaveSync?.();
    void window.DSAuth?.invokeActionJournal?.({
      actionId: receipt.id,
      actionKind: "crafting-tick",
      sourcePage: "cooking_action.html",
      payload: {
        profession: receipt.profession,
        itemId: receipt.itemId,
        itemName: receipt.itemName,
        outputQty: receipt.outputQty,
        xp: receipt.xp,
        doubled: receipt.doubled,
        sigilDrop: receipt.sigilDrop,
        petXp: receipt.petXp,
        completedAt: receipt.at
      }
    }).catch((error) => {
      console.warn("[cooking] action journal failed", error);
    });
  }

  function ensureCooking(save) {
    save = save && typeof save === "object" ? save : {};
    if (!Number.isFinite(Number(save.cookingLevel))) save.cookingLevel = 1;
    if (!Number.isFinite(Number(save.cookingXP))) save.cookingXP = 0;
    save.cookingXPNext = xpNextForLevel(save.cookingLevel);

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

  // --------------------------------------------------
  // Inventory helpers (units capacity like your system)
  // --------------------------------------------------
  function usedUnits(inv) {
    let u = 0;
    for (const it of inv) {
      if (!it) continue;
      const q = Number(it.quantity ?? it.qty);
      u += Number.isFinite(q) ? Math.max(1, q) : 1;
    }
    return u;
  }
  function hasSpaceFor(save, addUnits) {
    return usedUnits(save.inventory) + addUnits <= Number(save.inventoryMaxSlots || 1000);
  }

  // stack key ignores img (so changing paths later won't break stacks)
  function itemStackKey(it) {
    return [it.type || "", it.id || "", it.name || ""].join("::");
  }
  function addToInventoryStack(save, item, qty) {
    if (window.DSInventory?.addItem) {
      return window.DSInventory.addItem(save, item, qty, { stack: true, stackKeyFn: itemStackKey });
    }
    const key = itemStackKey(item);
    const ex = save.inventory.find(i => i && itemStackKey(i) === key);
    if (ex) ex.quantity = (Number(ex.quantity) || 1) + qty;
    else save.inventory.push({ ...item, quantity: qty });
    return { ok: true, added: qty };
  }

  // --------------------------------------------------
  // Stats helper (writes inside SAME save object)
  // --------------------------------------------------
  function incStat(save, key, amount = 1){
    if (!save || typeof save !== "object") return;
    if (!save.stats || typeof save.stats !== "object") save.stats = {};
    if (!save.stats.total || typeof save.stats.total !== "object") save.stats.total = {};

    const add = Number.isFinite(Number(amount)) ? Number(amount) : 1;
    const cur = Number.isFinite(Number(save.stats.total[key])) ? Number(save.stats.total[key]) : 0;
    save.stats.total[key] = cur + add;
  }

  function countByTypeId(save, type, id) {
    let c = 0;
    for (const it of save.inventory) {
      if (!it) continue;
      if ((it.type || "") === type && (it.id || "") === id) {
        c += Math.max(1, num(it.quantity ?? it.qty, 1));
      }
    }
    return c;
  }

  function consumeOneByTypeId(save, type, id) {
    const idx = save.inventory.findIndex(it => it && (it.type || "") === type && (it.id || "") === id);
    if (idx < 0) return false;

    const it = save.inventory[idx];
    const q = Math.max(1, num(it.quantity ?? it.qty, 1));
    if (q > 1) it.quantity = q - 1;
    else save.inventory.splice(idx, 1);
    return true;
  }

  // --------------------------------------------------
  // ✅ Robust asset url for file:/// and normal
  // --------------------------------------------------
  function absAsset(p) {
    if (!p) return "";
    try { return new URL(p, document.baseURI).href; }
    catch { return p; }
  }

const RECIPES = [
// ======================
// Dark Hunting Meat
// ======================

{
id:"cooked_shadow_hare_meat",
title:"Cooked Shadow Hare Meat",
req:1,
in:{type:"meat", id:"raw_shadow_hare_meat", name:"Raw Shadow Hare Meat", qty:1, img:"images/meat/shadow_hare_raw.webp"},
out:{type:"food", id:"cooked_shadow_hare_meat", name:"Cooked Shadow Hare Meat", img:"images/meat/shadow_hare_cooked.webp", healHp:0, healStamina:2}
},

{
id:"cooked_rotfeather_turkey_meat",
title:"Cooked Rotfeather Turkey Meat",
req:10,
in:{type:"meat", id:"raw_rotfeather_turkey_meat", name:"Raw Rotfeather Turkey Meat", qty:1, img:"images/meat/rotfeather_turkey_raw.webp"},
out:{type:"food", id:"cooked_rotfeather_turkey_meat", name:"Cooked Rotfeather Turkey Meat", img:"images/meat/rotfeather_turkey_cooked.webp", healHp:0, healStamina:3}
},

{
id:"cooked_gloom_fox_meat",
title:"Cooked Gloom Fox Meat",
req:20,
in:{type:"meat", id:"raw_gloom_fox_meat", name:"Raw Gloom Fox Meat", qty:1, img:"images/meat/gloom_fox_raw.webp"},
out:{type:"food", id:"cooked_gloom_fox_meat", name:"Cooked Gloom Fox Meat", img:"images/meat/gloom_fox_cooked.webp", healHp:0, healStamina:4}
},

{
id:"cooked_bloodtusk_boar_meat",
title:"Cooked Bloodtusk Boar Meat",
req:30,
in:{type:"meat", id:"raw_bloodtusk_boar_meat", name:"Raw Bloodtusk Boar Meat", qty:1, img:"images/meat/bloodtusk_boar_raw.webp"},
out:{type:"food", id:"cooked_bloodtusk_boar_meat", name:"Cooked Bloodtusk Boar Meat", img:"images/meat/bloodtusk_boar_cooked.webp", healHp:0, healStamina:5}
},

{
id:"cooked_night_wolf_meat",
title:"Cooked Night Wolf Meat",
req:40,
in:{type:"meat", id:"raw_night_wolf_meat", name:"Raw Night Wolf Meat", qty:1, img:"images/meat/night_wolf_raw.webp"},
out:{type:"food", id:"cooked_night_wolf_meat", name:"Cooked Night Wolf Meat", img:"images/meat/night_wolf_cooked.webp", healHp:0, healStamina:6}
},

{
id:"cooked_stonehorn_ram_meat",
title:"Cooked Stonehorn Ram Meat",
req:50,
in:{type:"meat", id:"raw_stonehorn_ram_meat", name:"Raw Stonehorn Ram Meat", qty:1, img:"images/meat/stonehorn_ram_raw.webp"},
out:{type:"food", id:"cooked_stonehorn_ram_meat", name:"Cooked Stonehorn Ram Meat", img:"images/meat/stonehorn_ram_cooked.webp", healHp:0, healStamina:7}
},

{
id:"cooked_thorn_stag_meat",
title:"Cooked Thorn Stag Meat",
req:60,
in:{type:"meat", id:"raw_thorn_stag_meat", name:"Raw Thorn Stag Meat", qty:1, img:"images/meat/thorn_stag_raw.webp"},
out:{type:"food", id:"cooked_thorn_stag_meat", name:"Cooked Thorn Stag Meat", img:"images/meat/thorn_stag_cooked.webp", healHp:0, healStamina:8}
},

{
id:"cooked_grave_bear_meat",
title:"Cooked Grave Bear Meat",
req:70,
in:{type:"meat", id:"raw_grave_bear_meat", name:"Raw Grave Bear Meat", qty:1, img:"images/meat/bear_raw.webp"},
out:{type:"food", id:"cooked_grave_bear_meat", name:"Cooked Grave Bear Meat", img:"images/meat/bear_cooked.webp", healHp:0, healStamina:9}
},

{
id:"cooked_dire_warg_meat",
title:"Cooked Dire Warg Meat",
req:80,
in:{type:"meat", id:"raw_dire_warg_meat", name:"Raw Dire Warg Meat", qty:1, img:"images/meat/dire_warg_raw.webp"},
out:{type:"food", id:"cooked_dire_warg_meat", name:"Cooked Dire Warg Meat", img:"images/meat/dire_warg_cooked.webp", healHp:0, healStamina:10}
},

{
id:"cooked_forest_troll_meat",
title:"Cooked Forest Troll Meat",
req:90,
in:{type:"meat", id:"raw_forest_troll_meat", name:"Raw Forest Troll Meat", qty:1, img:"images/meat/troll_raw.webp"},
out:{type:"food", id:"cooked_forest_troll_meat", name:"Cooked Forest Troll Meat", img:"images/meat/troll_cooked.webp", healHp:0, healStamina:11}
},

// ======================
// Fish Cooking
// ======================

{
id:"cooked_mud_minnow",
title:"Cooked Mud Minnow",
req:1,
in:{type:"fish", id:"mud_minnow", name:"Mud Minnow", qty:1, img:"images/fish/mud_minnow.webp"},
out:{type:"food", id:"cooked_mud_minnow", name:"Cooked Mud Minnow", img:"images/food/cooked_mud_minnow.webp", healHp:4, healStamina:0}
},

{
id:"cooked_bog_carp",
title:"Cooked Bog Carp",
req:1,
in:{type:"fish", id:"bog_carp", name:"Bog Carp", qty:1, img:"images/fish/bog_carp.webp"},
out:{type:"food", id:"cooked_bog_carp", name:"Cooked Bog Carp", img:"images/food/cooked_bog_carp.webp", healHp:6, healStamina:0}
},

{
id:"cooked_shiner_fish",
title:"Cooked Shiner Fish",
req:10,
in:{type:"fish", id:"shiner_fish", name:"Shiner Fish", qty:1, img:"images/fish/shiner_fish.webp"},
out:{type:"food", id:"cooked_shiner_fish", name:"Cooked Shiner Fish", img:"images/food/cooked_shiner_fish.webp", healHp:6, healStamina:0}
},

{
id:"cooked_golden_perch",
title:"Cooked Golden Perch",
req:10,
in:{type:"fish", id:"golden_perch", name:"Golden Perch", qty:1, img:"images/fish/golden_perch.webp"},
out:{type:"food", id:"cooked_golden_perch", name:"Cooked Golden Perch", img:"images/food/cooked_golden_perch.webp", healHp:8, healStamina:0}
},

{
id:"cooked_spiny_sunfish",
title:"Cooked Spiny Sunfish",
req:20,
in:{type:"fish", id:"spiny_sunfish", name:"Spiny Sunfish", qty:1, img:"images/fish/spiny_sunfish.webp"},
out:{type:"food", id:"cooked_spiny_sunfish", name:"Cooked Spiny Sunfish", img:"images/food/cooked_spiny_sunfish.webp", healHp:8, healStamina:0}
},

{
id:"cooked_striped_bass",
title:"Cooked Striped Bass",
req:20,
in:{type:"fish", id:"striped_bass", name:"Striped Bass", qty:1, img:"images/fish/striped_bass.webp"},
out:{type:"food", id:"cooked_striped_bass", name:"Cooked Striped Bass", img:"images/food/cooked_striped_bass.webp", healHp:10, healStamina:0}
},

{
id:"cooked_stone_catfish",
title:"Cooked Stone Catfish",
req:30,
in:{type:"fish", id:"stone_catfish", name:"Stone Catfish", qty:1, img:"images/fish/stone_catfish.webp"},
out:{type:"food", id:"cooked_stone_catfish", name:"Cooked Stone Catfish", img:"images/food/cooked_stone_catfish.webp", healHp:10, healStamina:0}
},

{
id:"cooked_crystal_pike",
title:"Cooked Crystal Pike",
req:30,
in:{type:"fish", id:"crystal_pike", name:"Crystal Pike", qty:1, img:"images/fish/crystal_pike.webp"},
out:{type:"food", id:"cooked_crystal_pike", name:"Cooked Crystal Pike", img:"images/food/cooked_crystal_pike.webp", healHp:12, healStamina:0}
},

{
id:"cooked_moon_carp",
title:"Cooked Moon Carp",
req:40,
in:{type:"fish", id:"moon_carp", name:"Moon Carp", qty:1, img:"images/fish/moon_carp.webp"},
out:{type:"food", id:"cooked_moon_carp", name:"Cooked Moon Carp", img:"images/food/cooked_moon_carp.webp", healHp:12, healStamina:0}
},

{
id:"cooked_glass_eel",
title:"Cooked Glass Eel",
req:40,
in:{type:"fish", id:"glass_eel", name:"Glass Eel", qty:1, img:"images/fish/glass_eel.webp"},
out:{type:"food", id:"cooked_glass_eel", name:"Cooked Glass Eel", img:"images/food/cooked_glass_eel.webp", healHp:14, healStamina:0}
},

{
id:"cooked_frost_salmon",
title:"Cooked Frost Salmon",
req:50,
in:{type:"fish", id:"frost_salmon", name:"Frost Salmon", qty:1, img:"images/fish/frost_salmon.webp"},
out:{type:"food", id:"cooked_frost_salmon", name:"Cooked Frost Salmon", img:"images/food/cooked_frost_salmon.webp", healHp:14, healStamina:0}
},

{
id:"cooked_glacier_char",
title:"Cooked Glacier Char",
req:50,
in:{type:"fish", id:"glacier_char", name:"Glacier Char", qty:1, img:"images/fish/glacier_char.webp"},
out:{type:"food", id:"cooked_glacier_char", name:"Cooked Glacier Char", img:"images/food/cooked_glacier_char.webp", healHp:16, healStamina:0}
},

{
id:"cooked_ice_sturgeon",
title:"Cooked Ice Sturgeon",
req:60,
in:{type:"fish", id:"ice_sturgeon", name:"Ice Sturgeon", qty:1, img:"images/fish/ice_sturgeon.webp"},
out:{type:"food", id:"cooked_ice_sturgeon", name:"Cooked Ice Sturgeon", img:"images/food/cooked_ice_sturgeon.webp", healHp:16, healStamina:0}
},

{
id:"cooked_spiral_horn_gar",
title:"Cooked Spiral Horn Gar",
req:60,
in:{type:"fish", id:"spiral_horn_gar", name:"Spiral Horn Gar", qty:1, img:"images/fish/spiral_horn_gar.webp"},
out:{type:"food", id:"cooked_spiral_horn_gar", name:"Cooked Spiral Horn Gar", img:"images/food/cooked_spiral_horn_gar.webp", healHp:18, healStamina:0}
},

{
id:"cooked_storm_mackerel",
title:"Cooked Storm Mackerel",
req:70,
in:{type:"fish", id:"storm_mackerel", name:"Storm Mackerel", qty:1, img:"images/fish/storm_mackerel.webp"},
out:{type:"food", id:"cooked_storm_mackerel", name:"Cooked Storm Mackerel", img:"images/food/cooked_storm_mackerel.webp", healHp:18, healStamina:0}
},

{
id:"cooked_lantern_pike",
title:"Cooked Lantern Pike",
req:70,
in:{type:"fish", id:"lantern_pike", name:"Lantern Pike", qty:1, img:"images/fish/lantern_pike.webp"},
out:{type:"food", id:"cooked_lantern_pike", name:"Cooked Lantern Pike", img:"images/food/cooked_lantern_pike.webp", healHp:20, healStamina:0}
},

{
id:"cooked_ghost_ray",
title:"Cooked Ghost Ray",
req:80,
in:{type:"fish", id:"ghost_ray", name:"Ghost Ray", qty:1, img:"images/fish/ghost_ray.webp"},
out:{type:"food", id:"cooked_ghost_ray", name:"Cooked Ghost Ray", img:"images/food/cooked_ghost_ray.webp", healHp:20, healStamina:0}
},

{
id:"cooked_hammerhead_pike",
title:"Cooked Hammerhead Pike",
req:80,
in:{type:"fish", id:"hammerhead_pike", name:"Hammerhead Pike", qty:1, img:"images/fish/hammerhead_pike.webp"},
out:{type:"food", id:"cooked_hammerhead_pike", name:"Cooked Hammerhead Pike", img:"images/food/cooked_hammerhead_pike.webp", healHp:22, healStamina:0}
},

{
id:"cooked_void_angler",
title:"Cooked Void Angler",
req:90,
in:{type:"fish", id:"void_angler", name:"Void Angler", qty:1, img:"images/fish/void_angler.webp"},
out:{type:"food", id:"cooked_void_angler", name:"Cooked Void Angler", img:"images/food/cooked_void_angler.webp", healHp:22, healStamina:0}
},

{
id:"cooked_leviathan_marlin",
title:"Cooked Leviathan Marlin",
req:90,
in:{type:"fish", id:"leviathan_marlin", name:"Leviathan Marlin", qty:1, img:"images/fish/leviathan_marlin.webp"},
out:{type:"food", id:"cooked_leviathan_marlin", name:"Cooked Leviathan Marlin", img:"images/food/cooked_leviathan_marlin.webp", healHp:24, healStamina:0}
},

];
  function cookingXpForRecipe(recipe){
    const r = recipe && typeof recipe === "object" ? recipe : {};
    const req = Math.max(1, num(r.req, 1));
    const effectValue = Math.max(0, num(r.out?.healHp, 0), num(r.out?.healStamina, 0));
    return Math.max(4, 4 + effectValue + Math.floor(req / 10) * 4);
  }
  function getRecipeFromUrl() {
    const p = new URLSearchParams(location.search);
    return p.get("recipe") || "cooked_shadow_hare_meat";
  }
  function getRecipeDef(id) {
    return RECIPES.find(r => r.id === id) || RECIPES[0];
  }

  // --------------------------------------------------
  // DOM
  // --------------------------------------------------
  let backBtn = null;
  let startBtn = null;
  let stopBtn = null;

  let inImg = null;
  let outImg = null;
  let recipeName = null;
  let recipeInfo = null;

  let timerWrap = null;
  let timerText = null;
  let timerBar = null;

  let msgEl = null;

  let targetInput = null;
  let targetBtn = null;
  let targetStatus = null;

  let lvlEl = null;
  let curEl = null;
  let nextEl = null;
  let barEl = null;
  let artisanBonusPetValue = null;
  let artisanBonusDoubleValue = null;
  let artisanBonusBuildingValue = null;
  let artisanBonusPotionValue = null;
  let currentRecipeId = "cooked_shadow_hare_meat";

  function bindDom() {
    backBtn = document.getElementById("backBtn");
    startBtn = document.getElementById("startBtn");
    stopBtn = document.getElementById("stopBtn");

    inImg = document.getElementById("inImg");
    outImg = document.getElementById("outImg");
    recipeName = document.getElementById("recipeName");
    recipeInfo = document.getElementById("recipeInfo");

    timerWrap = document.getElementById("timerWrap");
    timerText = document.getElementById("timerText");
    timerBar = document.getElementById("timerBar");

    msgEl = document.getElementById("msg");

    targetInput = document.getElementById("targetInput");
    targetBtn = document.getElementById("targetBtn");
    targetStatus = document.getElementById("targetStatus");

    lvlEl = document.getElementById("cookLevel");
    curEl = document.getElementById("cookXPCurrent");
    nextEl = document.getElementById("cookXPNext");
    barEl = document.getElementById("cookXPBar");
    artisanBonusPetValue = document.getElementById("artisanBonusPetValue");
    artisanBonusDoubleValue = document.getElementById("artisanBonusDoubleValue");
    artisanBonusBuildingValue = document.getElementById("artisanBonusBuildingValue");
    artisanBonusPotionValue = document.getElementById("artisanBonusPotionValue");
  }

  // Pause/resume from ui.js inspector
  window.addEventListener("ds:pause", () => stopCooking(true));
  window.addEventListener("ds:resume", () => { /* never auto-start */ });

  // --------------------------------------------------
  // Header render
  // --------------------------------------------------
function renderCookingHeader() {
    const s = ensureCooking(loadSave());

    if (lvlEl) lvlEl.textContent = String(s.cookingLevel);
    if (curEl) curEl.textContent = String(s.cookingXP);
    if (nextEl) nextEl.textContent = String(s.cookingXPNext);

    const pct = s.cookingXPNext > 0
      ? clamp((s.cookingXP / s.cookingXPNext) * 100, 0, 100)
      : 0;

  if (barEl) {
    barEl.style.width = pct.toFixed(1) + "%";
    barEl.style.background = xpBarGradient(pct);
  }
}

  function formatPct(value, digits = 2){
    const pct = Math.max(0, num(value, 0) * 100);
    const rounded = Math.round(pct * (10 ** digits)) / (10 ** digits);
    return `+${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(digits).replace(/\.?0+$/, "")}%`;
  }

  function renderBonusBox(save){
    const petBonus = getArtisanPetState(save);
    const buildingPct = Math.max(0, num(save?.cookhouseLevel, 0)) * 0.0005;
    if (artisanBonusPetValue) artisanBonusPetValue.textContent = formatPct(num(petBonus.xpPct, 0));
    if (artisanBonusDoubleValue) artisanBonusDoubleValue.textContent = formatPct(num(petBonus.doublePct, 0));
    if (artisanBonusBuildingValue) artisanBonusBuildingValue.textContent = formatPct(buildingPct);
    if (artisanBonusPotionValue) artisanBonusPotionValue.textContent = formatPct(0);
  }

  // --------------------------------------------------
  // Loop + timer UI
  // --------------------------------------------------
  const CD_MS = 6000;
// -------------------------
// Global action lock (prevents multi-actions + enforces absolute cooldown)
// -------------------------
const ACTION_ID = "cooking";
const ACTION_LOCK_KEY = "ds_action_lock_v1";

function loadActionLock(){
  try { return JSON.parse(localStorage.getItem(ACTION_LOCK_KEY) || "null"); }
  catch { return null; }
}
function saveActionLock(lock){
  localStorage.setItem(ACTION_LOCK_KEY, JSON.stringify(lock || null));
}
function isLockExpired(lock, now){
  if (!lock || !lock.active) return true;
  const last = Number(lock.lastPing || 0);
  return (now - last) > CD_MS * 2;
}
function acquireActionLock(){
  const now = Date.now();
  const lock = loadActionLock();
  if (lock && !isLockExpired(lock, now)) {
    if (lock.actionId && lock.actionId !== ACTION_ID) {
      return { ok:false, msg:"You are tired. Another action is running." };
    }
    if (now < Number(lock.nextAllowedTs || 0)) {
      const wait = Math.max(0, Number(lock.nextAllowedTs) - now);
      return { ok:false, msg:`You are tired. Wait ${(wait/1000).toFixed(1)}s.` };
    }
  }
  const nextAllowedTs = now + CD_MS;
  saveActionLock({ actionId: ACTION_ID, active:true, nextAllowedTs, lastPing: now });
  return { ok:true };
}
function getActionWaitMs(){
  const now = Date.now();
  const lock = loadActionLock();
  if (lock && lock.actionId === ACTION_ID && Number.isFinite(Number(lock.nextAllowedTs))){
    return Math.max(0, Number(lock.nextAllowedTs) - now);
  }
  return CD_MS;
}
function touchActionLock(){
  const now = Date.now();
  const lock = loadActionLock();
  if (!lock || lock.actionId !== ACTION_ID) return;
  lock.active = true;
  lock.lastPing = now;
  lock.nextAllowedTs = now + CD_MS;
  saveActionLock(lock);
}
function releaseActionLock(){
  const lock = loadActionLock();
  if (lock && lock.actionId === ACTION_ID){
    lock.active = false;
    saveActionLock(lock);
  }
}
  let cookingActive = false;
  let cookingTimer = null;

  let cdAnim = null;
  let cdStart = 0;
  let targetRemaining = 0;

  function setMsg(t) {
    if (msgEl) msgEl.innerHTML = t || "";
  }
  function getArtisanPetState(save){
    const pet = save?.pets?.artisan;
    const bonuses = window.DS?.pets?.getArtisanPetBonuses ? (window.DS.pets.getArtisanPetBonuses(pet) || {}) : {};
    return {
      name: String(pet?.name || ""),
      xpPct: num(bonuses.professionXpPct, 0),
      doublePct: num(bonuses.doubleCraftPct, 0)
    };
  }
  function renderArtisanPetBonus(save){
    const el = document.getElementById("artisanPetBonusText");
    if (!el) return;
    const pet = getArtisanPetState(save);
    if (!pet.name || pet.xpPct <= 0) {
      el.textContent = "";
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    el.textContent = `+${(pet.xpPct * 100).toFixed(2)}% XP (${pet.name})`;
  }

  function buildCookMessage(recipe, xpGain, sigilDrop = false, isLast = false) {
    const lastText = isLast ? " (last)" : "";
    return `You cooked 1 <img src="${recipe.out.img}" alt="${recipe.out.name}" style="width:18px;height:18px;vertical-align:-3px;margin:0 4px 0 6px;border-radius:4px;object-fit:cover;">${recipe.out.name}${lastText} (+${xpGain} XP)${sigilDrop ? " | Warden Sigil +1" : ""}`;
  }

  function stopCooldownUI() {
    if (cdAnim) cancelAnimationFrame(cdAnim);
    cdAnim = null;

    if (timerWrap) timerWrap.style.display = "none";
    if (timerBar) timerBar.style.width = "0%";
    if (timerText) timerText.textContent = (CD_MS / 1000).toFixed(1) + "s";
  }

  function startCooldownUI(remainingMs = CD_MS) {
    if (!timerWrap || !timerBar || !timerText) return;

    timerWrap.style.display = "";
    const rem = Math.max(0, Math.min(CD_MS, remainingMs));
    cdStart = performance.now() - (CD_MS - rem);

    const tick = (now) => {
      if (!cookingActive || window.DS?.isPaused) {
        cdAnim = null;
        return;
      }

      const elapsed = now - cdStart;
      const t = Math.min(1, elapsed / CD_MS);

      timerBar.style.width = (t * 100).toFixed(1) + "%";
      const remain = Math.max(0, (CD_MS - elapsed) / 1000);
      timerText.textContent = remain.toFixed(1) + "s";

      if (t < 1) cdAnim = requestAnimationFrame(tick);
      else cdAnim = null;
    };

    if (cdAnim) cancelAnimationFrame(cdAnim);
    cdAnim = requestAnimationFrame(tick);
  }

  function updateTargetUI() {
    if (!targetStatus) return;
    targetStatus.textContent = targetRemaining > 0 ? `Remaining: ${targetRemaining}` : "";
  }

  function startCooking() {
    if (window.DS?.isPaused) return;
    if (cookingActive) return;
    const lock = acquireActionLock();
    if (!lock.ok){ setMsg(lock.msg); return; }

    cookingActive = true;
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    setMsg("Cooking started.");
    touchActionLock();
    scheduleNext(true);
  }

  function stopCooking(silent = false) {
    cookingActive = false;

    if (cookingTimer) {
      clearTimeout(cookingTimer);
      cookingTimer = null;
    }

    stopCooldownUI();

    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    targetRemaining = 0;
    updateTargetUI();

    if (!silent) setMsg("Cooking stopped.");
  }

  function scheduleNext(runImmediately = false) {
    if (!cookingActive) return;
    if (window.DS?.isPaused) return;

    if (runImmediately) {
      cookTick();
      return;
    }

    const waitMs = getActionWaitMs();
    startCooldownUI(waitMs);
    cookingTimer = setTimeout(() => cookTick(), waitMs);
  }

  function cookTick() {
    if (!cookingActive) return;
    if (window.DS?.isPaused) return;

    const rid = currentRecipeId || getRecipeFromUrl();
    const r = getRecipeDef(rid);
    const s = ensureCooking(loadSave());

    const effectiveLevel = s.cookingLevel + getArtisanPotionBonus(s);
    if (effectiveLevel < r.req) {
      setMsg(`Requires Cooking Level ${r.req}.`);
      stopCooking(true);
      return;
    }

    const have = countByTypeId(s, r.in.type, r.in.id);
    if (have < r.in.qty) {
      setMsg(`Need ${r.in.name} x${r.in.qty}.`);
      stopCooking(true);
      setSave(s);
      return;
    }

    if (!hasSpaceFor(s, 1)) {
      setMsg("No more inventory space.");
      stopCooking(true);
      setSave(s);
      return;
    }

    const ok = consumeOneByTypeId(s, r.in.type, r.in.id);
    if (!ok) {
      setMsg("Ingredient missing.");
      stopCooking(true);
      setSave(s);
      return;
    }

    const petBonus = getArtisanPetState(s);
    // add output (food)
    addToInventoryStack(s, {
      type: "food",
      id: r.out.id,
      name: r.out.name,
      img: r.out.img,
      healHp: num(r.out.healHp, 0),
      healStamina: num(r.out.healStamina, 0)
    }, 1);
    const doubled = Math.random() < petBonus.doublePct;
    if (doubled) {
      addToInventoryStack(s, {
        type: "food",
        id: r.out.id,
        name: r.out.name,
        img: r.out.img,
        healHp: num(r.out.healHp, 0),
        healStamina: num(r.out.healStamina, 0)
      }, 1);
    }
    let sigilDrop = false;
    if (Math.random() < WARDEN_SIGIL_DROP_CHANCE) {
      addToInventoryStack(s, { ...WARDEN_SIGIL_ITEM }, 1);
      sigilDrop = true;
    }

    // Stats
    incStat(s, "cookingCrafts", 1);
    tickArtisanPotionActions(s, 1);

    // XP gain
    const buildingPct = Math.max(0, num(s.cookhouseLevel, 0)) * 0.0005;
    const totalXpGain = Math.max(1, Math.round(cookingXpForRecipe(r) * (1 + petBonus.xpPct + buildingPct)));
    const petSplit = window.DS?.pets?.splitXpWithPet
      ? window.DS.pets.splitXpWithPet(s, "artisan", totalXpGain)
      : { playerXpGain: totalXpGain, petXpGain: 0, petLevelUps: 0, petLevel: 0, petName: "" };
    const xpGain = petSplit.playerXpGain;
    s.cookingXP += xpGain;
    while (s.cookingXP >= s.cookingXPNext) {
      s.cookingXP -= s.cookingXPNext;
      s.cookingLevel += 1;
      s.cookingXPNext = xpNextForLevel(s.cookingLevel);
      window.DS?.announcements?.professionLevel?.(s, "Cooking", s.cookingLevel);
    }

    commitCookingTick(s, {
      itemName: r.out.name,
      itemId: r.out.id,
      outputQty: 1 + (doubled ? 1 : 0),
      xp: xpGain,
      doubled,
      sigilDrop,
      petXp: petSplit.petXpGain
    });
    renderCookingHeader();
    renderBonusBox(s);

    if (targetRemaining > 0) {
      targetRemaining -= 1;
      updateTargetUI();
      if (targetRemaining <= 0) {
        setMsg(`Target completed! ${buildCookMessage(r, xpGain, sigilDrop, true)}${petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : ""}${petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : ""}${doubled ? ` <span style="color:#9ff0b7;">Double Craft!</span>` : ""}`);
        stopCooking(true);
        return;
      }
    }

    setMsg(buildCookMessage(r, xpGain, sigilDrop, false) + (petSplit.petXpGain > 0 ? ` <span style="color:#9fb5ff;">| Pet XP +${petSplit.petXpGain}</span>` : "") + (petSplit.petLevelUps > 0 ? ` <span style="color:#f7df8a;">| ${petSplit.petName} Lvl ${petSplit.petLevel}</span>` : "") + (doubled ? ` <span style="color:#9ff0b7;">Double Craft!</span>` : ""));
    touchActionLock();
    scheduleNext(false);
  }

  // Target cooking
  function startTargetCooking() {
    const val = Number(targetInput?.value);
    if (!Number.isFinite(val) || val <= 0) {
      alert("Enter a valid target amount (e.g. 100).");
      return;
    }

    targetRemaining = Math.floor(val);
    updateTargetUI();

    if (!cookingActive) startCooking();
    else setMsg(`Target set: ${targetRemaining}`);
  }

  function initCookingActionRoute(recipeId) {
    currentRecipeId = recipeId || getRecipeFromUrl();
    const r = getRecipeDef(currentRecipeId);

    // images (FIXED)
    if (inImg) inImg.src = absAsset(r.in.img);
    if (outImg) outImg.src = absAsset(r.out.img);

    // labels
    if (recipeName) recipeName.textContent = r.title;

    if (recipeInfo) {
      const hp = num(r.out.healHp, 0);
      const st = num(r.out.healStamina, 0);

      const effect =
        hp > 0 && st > 0 ? `+${hp} HP, +${st} Stamina` :
        hp > 0 ? `+${hp} HP` :
        st > 0 ? `+${st} Stamina` : `—`;

      recipeInfo.textContent = `Req Cooking Lv ${r.req} - Input: ${r.in.name} x${r.in.qty} -> ${effect}`;
    }

    const save = ensureCooking(loadSave());
    renderCookingHeader();
    renderBonusBox(save);
    stopCooldownUI();

    backBtn?.addEventListener("click", () => {
      stopCooking(true);
      if (window.DSUI?.navigateWithinShell?.("cooking.html")) return;
      window.location.href = "cooking.html";
    });

    startBtn?.addEventListener("click", startCooking);
    stopBtn?.addEventListener("click", () => stopCooking(false));
    targetBtn?.addEventListener("click", startTargetCooking);

    if (stopBtn) stopBtn.disabled = true;
  }

  function mountCookingAction(root = null, targetHref = "cooking_action.html") {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    stopCooking(true);
    left.innerHTML = COOKING_ACTION_TEMPLATE;
    document.title = "Darkstone Chronicles - Cooking Action";
    bindDom();
    const parsed = (() => {
      try { return new URL(targetHref, window.location.href); }
      catch { return null; }
    })();
    const recipeId = parsed?.searchParams.get("recipe") || "cooked_shadow_hare_meat";
    initCookingActionRoute(recipeId);
    return true;
  }

  function initStandaloneCookingAction() {
    if (!document.getElementById("backBtn")) return false;
    document.title = "Darkstone Chronicles - Cooking Action";
    bindDom();
    initCookingActionRoute(getRecipeFromUrl());
    return true;
  }

  window.DSCookingAction = { mount: mountCookingAction };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneCookingAction();
  });

  window.addEventListener("ds:save", () => {
    const save = ensureCooking(loadSave());
    renderCookingHeader();
    renderBonusBox(save);
  });
})();




