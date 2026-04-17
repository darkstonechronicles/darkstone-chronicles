(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const MARKET_TEMPLATE = `
    <h1>Market</h1>

    <div style="background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:14px;padding:12px;max-width:900px;margin:0 auto;box-shadow:var(--card-medieval-shadow);">
      <div id="marketTabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        <button type="button" class="townBtn marketTabBtn marketTabBtnActive" data-market-tab="misc">Misc</button>
        <button type="button" class="townBtn marketTabBtn" data-market-tab="pets">Pets</button>
      </div>

      <div id="marketMiscTab" class="marketTabPanel">
        <h2 style="margin-top:0;color:#f3ead6;text-shadow:0 1px 0 rgba(74, 47, 14, .95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Misc Supplies</h2>

        <div style="display:flex;gap:12px;align-items:center;background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:12px;padding:12px;box-shadow:var(--card-medieval-shadow);">
          <img src="images/items/arrows.png" alt="Arrows" style="width:64px;height:64px;border-radius:12px;border:1px solid rgba(126, 94, 50, .88);object-fit:cover;background:#000;box-shadow:0 0 0 1px rgba(28,20,12,.88), inset 0 1px 0 rgba(255,228,178,.08), inset 0 0 0 1px rgba(255,214,143,.04), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
          <div style="flex:1;">
            <div style="font-weight:900;font-size:18px;color:#f3ead6;text-shadow:0 1px 0 rgba(74, 47, 14, .95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Arrows x100</div>
            <div style="opacity:.85;margin-top:4px;color:#d9ccb0;">Price: <b>10 gold</b></div>
            <div style="opacity:.8;margin-top:4px;font-size:12px;color:#d9ccb0;">Used for hunting.</div>
          </div>
          <button id="buyArrowsBtn">Buy</button>
        </div>

        <div style="display:flex;gap:12px;align-items:center;background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:12px;padding:12px;margin-top:12px;box-shadow:var(--card-medieval-shadow);">
          <img src="images/alchemy/items/empty_vial.png" alt="Empty Vial" style="width:64px;height:64px;border-radius:12px;border:1px solid rgba(126, 94, 50, .88);object-fit:cover;background:#000;box-shadow:0 0 0 1px rgba(28,20,12,.88), inset 0 1px 0 rgba(255,228,178,.08), inset 0 0 0 1px rgba(255,214,143,.04), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
          <div style="flex:1;">
            <div style="font-weight:900;font-size:18px;color:#f3ead6;text-shadow:0 1px 0 rgba(74, 47, 14, .95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Empty Vial</div>
            <div style="opacity:.85;margin-top:4px;color:#d9ccb0;">Price: <b>10 gold</b></div>
            <div style="opacity:.8;margin-top:4px;font-size:12px;color:#d9ccb0;">Used for alchemy potions.</div>
          </div>
          <button id="buyEmptyVialBtn">Buy</button>
        </div>
      </div>

      <div id="marketPetsTab" class="marketTabPanel" style="display:none;">
        <h2 style="margin-top:0;color:#f3ead6;text-shadow:0 1px 0 rgba(74, 47, 14, .95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Pets</h2>

        <div style="display:flex;gap:12px;align-items:center;background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:12px;padding:12px;box-shadow:var(--card-medieval-shadow);">
          <img src="images/pets/combat_wolf_cub.png" alt="Wolf Cub" style="width:64px;height:64px;border-radius:12px;border:1px solid rgba(126, 94, 50, .88);object-fit:cover;background:#121824;box-shadow:0 0 0 1px rgba(28,20,12,.88), inset 0 1px 0 rgba(255,228,178,.08), inset 0 0 0 1px rgba(255,214,143,.04), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:900;font-size:18px;color:#f3ead6;text-shadow:0 1px 0 rgba(74, 47, 14, .95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Wolf Cub</div>
            <div style="opacity:.85;margin-top:4px;color:#d9ccb0;">Unlock cost: <b>100,000 gold</b></div>
            <div style="opacity:.8;margin-top:4px;font-size:12px;color:#d9ccb0;">Combat Pet Tier 1</div>
            <div style="opacity:.8;margin-top:6px;font-size:12px;color:#d9ccb0;">+0.20 Attack per pet level</div>
            <div style="opacity:.8;font-size:12px;color:#d9ccb0;">+0.20 Defense per pet level</div>
            <div style="opacity:.72;margin-top:6px;font-size:11px;color:#d9ccb0;">Combat pet XP: gets 10% of combat XP from fights and dungeons only.</div>
          </div>
          <button id="buyWolfCubBtn">Buy</button>
        </div>

        <div style="display:flex;gap:12px;align-items:center;background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:12px;padding:12px;margin-top:12px;box-shadow:var(--card-medieval-shadow);">
          <img src="images/pets/gathering_burrower_pup.png" alt="Burrower Pup" style="width:64px;height:64px;border-radius:12px;border:1px solid rgba(126, 94, 50, .88);object-fit:cover;background:#121824;box-shadow:0 0 0 1px rgba(28,20,12,.88), inset 0 1px 0 rgba(255,228,178,.08), inset 0 0 0 1px rgba(255,214,143,.04), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:900;font-size:18px;color:#f3ead6;text-shadow:0 1px 0 rgba(74, 47, 14, .95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Burrower Pup</div>
            <div style="opacity:.85;margin-top:4px;color:#d9ccb0;">Unlock cost: <b>100,000 gold</b></div>
            <div style="opacity:.8;margin-top:4px;font-size:12px;color:#d9ccb0;">Gathering Pet Tier 1</div>
            <div style="opacity:.8;margin-top:6px;font-size:12px;color:#d9ccb0;">+0.10% Profession XP per pet level</div>
            <div style="opacity:.8;font-size:12px;color:#d9ccb0;">Milestones give Double Gather Chance</div>
            <div style="opacity:.72;margin-top:6px;font-size:11px;color:#d9ccb0;">Lv 10 +1%, Lv 25 +1%, Lv 50 +1%, Lv 75 +1%, Lv 100 +2%</div>
          </div>
          <button id="buyBurrowerPupBtn">Buy</button>
        </div>

        <div style="display:flex;gap:12px;align-items:center;background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:12px;padding:12px;margin-top:12px;box-shadow:var(--card-medieval-shadow);">
          <img src="images/pets/artisan_workshop_mouse.png" alt="Workshop Mouse" style="width:64px;height:64px;border-radius:12px;border:1px solid rgba(126, 94, 50, .88);object-fit:cover;background:#121824;box-shadow:0 0 0 1px rgba(28,20,12,.88), inset 0 1px 0 rgba(255,228,178,.08), inset 0 0 0 1px rgba(255,214,143,.04), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:900;font-size:18px;color:#f3ead6;text-shadow:0 1px 0 rgba(74, 47, 14, .95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Workshop Mouse</div>
            <div style="opacity:.85;margin-top:4px;color:#d9ccb0;">Unlock cost: <b>100,000 gold</b></div>
            <div style="opacity:.8;margin-top:4px;font-size:12px;color:#d9ccb0;">Artisan Pet Tier 1</div>
            <div style="opacity:.8;margin-top:6px;font-size:12px;color:#d9ccb0;">+0.10% Profession XP per pet level</div>
            <div style="opacity:.8;font-size:12px;color:#d9ccb0;">Milestones give Double Craft Chance</div>
            <div style="opacity:.72;margin-top:6px;font-size:11px;color:#d9ccb0;">Lv 10 +1%, Lv 25 +1%, Lv 50 +1%, Lv 75 +1%, Lv 100 +2%</div>
          </div>
          <button id="buyWorkshopMouseBtn">Buy</button>
        </div>

        <div style="display:flex;gap:12px;align-items:center;background:var(--card-medieval-bg);border:1px solid var(--card-medieval-border);border-radius:12px;padding:12px;margin-top:12px;box-shadow:var(--card-medieval-shadow);">
          <img src="images/pets/fortune_coin_ferret.png" alt="Coin Ferret" style="width:64px;height:64px;border-radius:12px;border:1px solid rgba(126, 94, 50, .88);object-fit:cover;background:#121824;box-shadow:0 0 0 1px rgba(28,20,12,.88), inset 0 1px 0 rgba(255,228,178,.08), inset 0 0 0 1px rgba(255,214,143,.04), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:900;font-size:18px;color:#f3ead6;text-shadow:0 1px 0 rgba(74, 47, 14, .95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">Coin Ferret</div>
            <div style="opacity:.85;margin-top:4px;color:#d9ccb0;">Unlock cost: <b>100,000 gold</b></div>
            <div style="opacity:.8;margin-top:4px;font-size:12px;color:#d9ccb0;">Fortune Pet Tier 1</div>
            <div style="opacity:.8;margin-top:6px;font-size:12px;color:#d9ccb0;">+0.10% Gold per pet level</div>
            <div style="opacity:.8;font-size:12px;color:#d9ccb0;">Milestones give Luck bonus</div>
            <div style="opacity:.72;margin-top:6px;font-size:11px;color:#d9ccb0;">Lv 10 +1%, Lv 25 +1%, Lv 50 +1%, Lv 75 +1%, Lv 100 +2%</div>
          </div>
          <button id="buyCoinFerretBtn">Buy</button>
        </div>
      </div>

      <div id="shopMsg" style="margin-top:10px;opacity:.9;color:#d9ccb0;"></div>
    </div>
  `;

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function setSave(next){
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  function itemStackKey(it){
    return [
      it.type || "",
      it.name || "",
      it.slot || "",
      it.reqLevel ?? 1,
      it.atk ?? 0,
      it.def ?? 0,
      it.rarity || "",
      it.img || ""
    ].join("::");
  }

  function addToStack(arr, item, qty = 1){
    const key = itemStackKey(item);
    const ex = arr.find((i) => i && itemStackKey(i) === key);
    if (ex) ex.quantity = num(ex.quantity, 1) + qty;
    else arr.push({ ...item, quantity: qty });
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

  function ensurePets(save){
    if (!save.pets || typeof save.pets !== "object") save.pets = {};
    if (!("combat" in save.pets)) save.pets.combat = null;
    if (!("artisan" in save.pets)) save.pets.artisan = null;
    if (!("gathering" in save.pets)) save.pets.gathering = null;
    if (!("fortune" in save.pets)) save.pets.fortune = null;
    return save;
  }

  function getWolfCubPet(){
    return {
      slot: "combat",
      family: "wolf",
      tier: 1,
      name: "Wolf Cub",
      img: "",
      iconText: "WC",
      level: 1,
      xp: 0,
      xpNext: 100,
      atkPerLevel: 0.20,
      defPerLevel: 0.20,
      nextUpgradeCost: 1000000
    };
  }

  function getBurrowerPupPet(){
    return {
      slot: "gathering",
      family: "burrower",
      tier: 1,
      name: "Burrower Pup",
      img: "",
      iconText: "BP",
      level: 1,
      xp: 0,
      xpNext: 100,
      professionXpPctPerLevel: 0.0010,
      nextUpgradeCost: 1000000
    };
  }

  function getWorkshopMousePet(){
    return {
      slot: "artisan",
      family: "workshop",
      tier: 1,
      name: "Workshop Mouse",
      img: "",
      iconText: "WM",
      level: 1,
      xp: 0,
      xpNext: 100,
      professionXpPctPerLevel: 0.0010,
      nextUpgradeCost: 1000000
    };
  }

  function getCoinFerretPet(){
    return {
      slot: "fortune",
      family: "fortune",
      tier: 1,
      name: "Coin Ferret",
      img: "",
      iconText: "CF",
      level: 1,
      xp: 0,
      xpNext: 100,
      goldPctPerLevel: 0.0010,
      nextUpgradeCost: 1000000
    };
  }

  function setMsg(text){
    const msg = document.getElementById("shopMsg");
    if (msg) msg.textContent = text;
  }

  function refreshPetBuyState(){
    const s = ensurePets(loadSave());
    const wolfBtn = document.getElementById("buyWolfCubBtn");
    const burrowerBtn = document.getElementById("buyBurrowerPupBtn");
    if (wolfBtn) {
      const owned = !!s.pets?.combat;
      wolfBtn.disabled = owned;
      wolfBtn.textContent = owned ? "Owned" : "Buy";
    }
    if (burrowerBtn) {
      const owned = !!s.pets?.gathering;
      burrowerBtn.disabled = owned;
      burrowerBtn.textContent = owned ? "Owned" : "Buy";
    }
    const artisanBtn = document.getElementById("buyWorkshopMouseBtn");
    if (artisanBtn) {
      const owned = !!s.pets?.artisan;
      artisanBtn.disabled = owned;
      artisanBtn.textContent = owned ? "Owned" : "Buy";
    }
    const fortuneBtn = document.getElementById("buyCoinFerretBtn");
    if (fortuneBtn) {
      const owned = !!s.pets?.fortune;
      fortuneBtn.disabled = owned;
      fortuneBtn.textContent = owned ? "Owned" : "Buy";
    }
  }

  function activateMarketTab(tab){
    const wanted = String(tab || "misc");
    const btn = document.querySelector(`[data-market-tab="${wanted}"]`);
    if (btn) btn.click();
  }

  function bindMarketTabs() {
    document.querySelectorAll("[data-market-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = String(btn.dataset.marketTab || "misc");
        document.querySelectorAll("[data-market-tab]").forEach((el) => {
          el.classList.toggle("marketTabBtnActive", el === btn);
          el.style.borderColor = el === btn ? "rgba(166, 124, 64, .98)" : "";
          el.style.background = el === btn
            ? "linear-gradient(180deg, rgba(84,60,30,.98) 0%, rgba(58,40,20,.98) 100%)"
            : "";
          el.style.color = el === btn ? "#fff1cf" : "";
          el.style.boxShadow = el === btn
            ? "0 0 0 1px rgba(60,40,16,.82), inset 0 1px 0 rgba(255,232,184,.12), inset 0 -10px 18px rgba(0,0,0,.22), 0 12px 20px rgba(0,0,0,.2)"
            : "";
        });
        const misc = document.getElementById("marketMiscTab");
        const pets = document.getElementById("marketPetsTab");
        if (misc) misc.style.display = tab === "misc" ? "" : "none";
        if (pets) pets.style.display = tab === "pets" ? "" : "none";
      });
    });
  }

  function bindMarketActions() {
    document.getElementById("buyArrowsBtn")?.addEventListener("click", () => {
      const s = loadSave();
      if (!Array.isArray(s.inventory)) s.inventory = [];
      s.gold = num(s.gold, 0);

      const price = 10;
      if (s.gold < price){
        setMsg("Not enough gold.");
        return;
      }
      if (!hasInventorySpace(s, 100)) {
        setMsg("Not enough inventory space.");
        return;
      }

      s.gold -= price;
      addToStack(s.inventory, {
        type: "consumable",
        name: "Arrows",
        quantity: 100,
        rarity: "common",
        img: "images/items/arrows.png"
      }, 100);

      setSave(s);
      setMsg("Bought Arrows x100 for 10 gold.");
    });

    document.getElementById("buyEmptyVialBtn")?.addEventListener("click", () => {
      const s = loadSave();
      if (!Array.isArray(s.inventory)) s.inventory = [];
      s.gold = num(s.gold, 0);

      const price = 10;
      if (s.gold < price){
        setMsg("Not enough gold.");
        return;
      }
      if (!hasInventorySpace(s, 1)) {
        setMsg("Not enough inventory space.");
        return;
      }

      s.gold -= price;
      addToStack(s.inventory, {
        type: "material",
        name: "Empty Vial",
        quantity: 1,
        rarity: "common",
        img: "images/alchemy/items/empty_vial.png"
      }, 1);

      setSave(s);
      setMsg("Bought Empty Vial for 10 gold.");
    });

    document.getElementById("buyWolfCubBtn")?.addEventListener("click", () => {
      const s = ensurePets(loadSave());
      s.gold = num(s.gold, 0);
      const price = 100000;

      if (s.pets.combat) {
        setMsg("You already own a combat pet.");
        refreshPetBuyState();
        return;
      }
      if (s.gold < price) {
        setMsg("Not enough gold.");
        return;
      }

      s.gold -= price;
      s.pets.combat = getWolfCubPet();
      setSave(s);
      refreshPetBuyState();
      setMsg("Bought Wolf Cub for 100,000 gold.");
    });

    document.getElementById("buyBurrowerPupBtn")?.addEventListener("click", () => {
      const s = ensurePets(loadSave());
      s.gold = num(s.gold, 0);
      const price = 100000;

      if (s.pets.gathering) {
        setMsg("You already own a gathering pet.");
        refreshPetBuyState();
        return;
      }
      if (s.gold < price) {
        setMsg("Not enough gold.");
        return;
      }

      s.gold -= price;
      s.pets.gathering = getBurrowerPupPet();
      setSave(s);
      refreshPetBuyState();
      setMsg("Bought Burrower Pup for 100,000 gold.");
    });

    document.getElementById("buyWorkshopMouseBtn")?.addEventListener("click", () => {
      const s = ensurePets(loadSave());
      s.gold = num(s.gold, 0);
      const price = 100000;

      if (s.pets.artisan) {
        setMsg("You already own an artisan pet.");
        refreshPetBuyState();
        return;
      }
      if (s.gold < price) {
        setMsg("Not enough gold.");
        return;
      }

      s.gold -= price;
      s.pets.artisan = getWorkshopMousePet();
      setSave(s);
      refreshPetBuyState();
      setMsg("Bought Workshop Mouse for 100,000 gold.");
    });

    document.getElementById("buyCoinFerretBtn")?.addEventListener("click", () => {
      const s = ensurePets(loadSave());
      s.gold = num(s.gold, 0);
      const price = 100000;

      if (s.pets.fortune) {
        setMsg("You already own a fortune pet.");
        refreshPetBuyState();
        return;
      }
      if (s.gold < price) {
        setMsg("Not enough gold.");
        return;
      }

      s.gold -= price;
      s.pets.fortune = getCoinFerretPet();
      setSave(s);
      refreshPetBuyState();
      setMsg("Bought Coin Ferret for 100,000 gold.");
    });
  }

  function mountMarket(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = MARKET_TEMPLATE;
    document.title = "Darkstone Chronicles - Market";
    bindMarketTabs();
    bindMarketActions();
    refreshPetBuyState();
    if (String(window.location.hash || "").toLowerCase() === "#pets") activateMarketTab("pets");
    return true;
  }

  function initStandaloneMarket() {
    if (!document.getElementById("marketTabs")) return false;
    document.title = "Darkstone Chronicles - Market";
    bindMarketTabs();
    bindMarketActions();
    refreshPetBuyState();
    if (String(window.location.hash || "").toLowerCase() === "#pets") activateMarketTab("pets");
    return true;
  }

  window.DSMarket = {
    mount: mountMarket
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneMarket();
  });
})();
