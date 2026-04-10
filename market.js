const SAVE_KEY = "darkstone_save_v1";
const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

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

document.querySelectorAll("[data-market-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = String(btn.dataset.marketTab || "misc");
    document.querySelectorAll("[data-market-tab]").forEach((el) => {
      el.classList.toggle("marketTabBtnActive", el === btn);
      el.style.borderColor = el === btn ? "#4f7fd1" : "";
      el.style.background = el === btn ? "#2b4f8f" : "";
      el.style.color = el === btn ? "#eef4ff" : "";
    });
    const misc = document.getElementById("marketMiscTab");
    const pets = document.getElementById("marketPetsTab");
    if (misc) misc.style.display = tab === "misc" ? "" : "none";
    if (pets) pets.style.display = tab === "pets" ? "" : "none";
  });
});

function activateMarketTab(tab){
  const wanted = String(tab || "misc");
  const btn = document.querySelector(`[data-market-tab="${wanted}"]`);
  if (btn) btn.click();
}

document.getElementById("buyArrowsBtn")?.addEventListener("click", () => {
  const s = loadSave();
  if (!Array.isArray(s.inventory)) s.inventory = [];
  s.gold = num(s.gold, 0);

  const price = 10;
  if (s.gold < price){
    setMsg("Not enough gold.");
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

refreshPetBuyState();

if (String(window.location.hash || "").toLowerCase() === "#pets") {
  activateMarketTab("pets");
}
