(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const SALE_HISTORY_KEY = "darkstone_market_sale_history_v1";
  const fmt = new Intl.NumberFormat("el-GR");
  const MARKET_PAGE_SIZE = 80;
  const LISTINGS_PER_PAGE = 7;
  const GEAR_SLOTS = [
    ["all", "All Gear"],
    ["mainHand", "Main Hand"],
    ["offHand", "Off Hand"],
    ["helmet", "Helmet"],
    ["shoulders", "Shoulders"],
    ["chest", "Chest"],
    ["bracers", "Bracers"],
    ["gloves", "Gloves"],
    ["belt", "Belt"],
    ["pants", "Pants"],
    ["boots", "Boots"],
    ["ring", "Ring"],
    ["amulet", "Amulet"],
    ["shield", "Shield"]
  ];
  const GENERAL_SHOP_ITEMS = [
    {
      id: "arrows_100",
      kind: "item",
      name: "Arrows x100",
      img: "images/items/arrows.png",
      price: 10,
      quantity: 100,
      item: { type: "consumable", id: "arrows", name: "Arrows", img: "images/items/arrows.png" },
      meta: "Used for hunting."
    },
    {
      id: "empty_vial",
      kind: "item",
      name: "Empty Vial",
      img: "images/alchemy/items/empty_vial.png",
      price: 10,
      quantity: 1,
      item: { type: "material", id: "empty_vial", name: "Empty Vial", img: "images/alchemy/items/empty_vial.png" },
      meta: "Used for alchemy potions."
    },
    {
      id: "pet_combat",
      kind: "pet",
      slot: "combat",
      name: "Wolf Cub",
      img: "images/pets/combat_wolf_cub.png",
      price: 100000,
      meta: "Combat Pet Tier 1",
      pet: { slot: "combat", family: "wolf", tier: 1, name: "Wolf Cub", atkPerLevel: 0.20, defPerLevel: 0.20, img: "images/pets/combat_wolf_cub.png", iconText: "WC" }
    },
    {
      id: "pet_gathering",
      kind: "pet",
      slot: "gathering",
      name: "Burrower Pup",
      img: "images/pets/gathering_burrower_pup.png",
      price: 100000,
      meta: "Gathering Pet Tier 1",
      pet: { slot: "gathering", family: "burrower", tier: 1, name: "Burrower Pup", professionXpPctPerLevel: 0.0010, img: "images/pets/gathering_burrower_pup.png", iconText: "BP" }
    },
    {
      id: "pet_artisan",
      kind: "pet",
      slot: "artisan",
      name: "Workshop Mouse",
      img: "images/pets/artisan_workshop_mouse.png",
      price: 100000,
      meta: "Artisan Pet Tier 1",
      pet: { slot: "artisan", family: "workshop", tier: 1, name: "Workshop Mouse", professionXpPctPerLevel: 0.0010, img: "images/pets/artisan_workshop_mouse.png", iconText: "WM" }
    },
    {
      id: "pet_fortune",
      kind: "pet",
      slot: "fortune",
      name: "Coin Ferret",
      img: "images/pets/fortune_coin_ferret.png",
      price: 100000,
      meta: "Fortune Pet Tier 1",
      pet: { slot: "fortune", family: "fortune", tier: 1, name: "Coin Ferret", goldPctPerLevel: 0.0010, img: "images/pets/fortune_coin_ferret.png", iconText: "CF" }
    }
  ];

  const state = {
    view: "latest",
    gearSlot: "all",
    page: 1,
    inspectListingId: "",
    listings: [],
    myListings: [],
    saleHistory: loadSaleHistory(),
    activeSaleNotice: null,
    selectedInvIndex: -1,
    loading: false,
    status: "",
    realtimeChannel: null,
    realtimeTimer: 0,
    appliedSaleEvents: new Set()
  };

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function loadSaleHistory(){
    try {
      const rows = JSON.parse(localStorage.getItem(SALE_HISTORY_KEY) || "[]");
      return Array.isArray(rows) ? rows.slice(0, 50) : [];
    } catch {
      return [];
    }
  }

  function saveSaleHistory(rows){
    const next = Array.isArray(rows) ? rows.slice(0, 50) : [];
    localStorage.setItem(SALE_HISTORY_KEY, JSON.stringify(next));
    state.saleHistory = next;
  }

  function addSaleHistory(entry){
    const next = [entry, ...loadSaleHistory()]
      .filter((row, idx, arr) => row?.key && arr.findIndex((x) => x?.key === row.key) === idx)
      .slice(0, 50);
    saveSaleHistory(next);
  }

  function mergeSaleHistory(entries){
    const next = [...(Array.isArray(entries) ? entries : []), ...loadSaleHistory()]
      .filter((row, idx, arr) => row?.key && arr.findIndex((x) => x?.key === row.key) === idx)
      .sort((a, b) => num(b.at, 0) - num(a.at, 0))
      .slice(0, 50);
    saveSaleHistory(next);
  }

  function setSave(next){
    localStorage.setItem(SAVE_KEY, JSON.stringify(next && typeof next === "object" ? next : {}));
    window.dispatchEvent(new Event("ds:save"));
  }

  function getUserId(){
    try { return window.DSAuth?.getUser?.()?.id || ""; }
    catch { return ""; }
  }

  function isGearItem(it){
    const slots = new Set(GEAR_SLOTS.map(([key]) => key).filter((key) => key !== "all"));
    return it?.type === "gear" || (it?.slot && slots.has(String(it.slot)));
  }

  function getQty(it){
    return Math.max(1, Math.floor(num(it?.quantity ?? it?.qty, 1)));
  }

  function isSellableItem(it){
    if (!it || typeof it !== "object") return false;
    if (!String(it.name || "").trim()) return false;
    return getQty(it) > 0;
  }

  function itemMeta(it){
    const parts = [];
    if (it?.slot) parts.push(slotLabel(it.slot));
    if (it?.rarity) parts.push(String(it.rarity));
    if (num(it?.atk, 0)) parts.push(`${num(it.atk)} ATK`);
    if (num(it?.def, 0)) parts.push(`${num(it.def)} DEF`);
    if (num(it?.reqLevel, 0)) parts.push(`R.LVL ${num(it.reqLevel)}`);
    return parts.join(" • ");
  }

  function slotLabel(slot){
    const found = GEAR_SLOTS.find(([key]) => key === slot);
    return found ? found[1] : String(slot || "-");
  }

  function defaultSellPrice(item){
    const base = 5 + num(item?.atk, 0) * 3 + num(item?.def, 0) * 3;
    const rarity = String(item?.rarity || "").toLowerCase();
    const mult = rarity === "legendary" ? 8 : rarity === "epic" ? 5 : rarity === "rare" ? 3 : rarity === "uncommon" ? 1.6 : 1;
    return Math.max(1, Math.floor(base * mult));
  }

  function marketIcon(kind){
    if (kind === "gear") return "images/ui/equipment.png";
    if (kind === "materials") return "images/ui/bank.png";
    return "images/ui/market.png";
  }

  function findBuyQtyInput(id){
    return Array.from(document.querySelectorAll("[data-buy-qty]"))
      .find((el) => String(el.dataset.buyQty || "") === String(id)) || null;
  }

  function isMarketPage(){
    return /(^|\/)market\.html$/i.test(String(window.location.pathname || ""));
  }

  function template(){
    return `
      <style>
        .marketShell{max-width:980px;margin:0 auto;color:#f3ead6;}
        .marketHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}
        .marketHeader h1{margin:0!important;}
        .marketHeaderActions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;}
        .marketMyBtn{width:auto!important;min-height:34px!important;padding:7px 12px!important;border-radius:6px!important;font-size:12px!important;white-space:nowrap;}
        .marketMyBtn.is-active{border-color:#d0a14f!important;color:#fff1cf!important;background:linear-gradient(180deg,rgba(82,58,28,.96),rgba(35,24,14,.98))!important;}
        .marketTop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:6px 0 14px;}
        .marketHeroBtn{min-height:86px;display:grid;grid-template-rows:44px auto;justify-items:center;align-items:center;gap:6px;padding:10px;border-radius:8px;border:1px solid rgba(126,94,50,.86);background:linear-gradient(180deg,rgba(26,28,34,.96),rgba(10,11,15,.96));box-shadow:inset 0 1px 0 rgba(255,232,184,.08),0 12px 24px rgba(0,0,0,.2);color:#f3ead6;cursor:pointer;}
        .marketHeroBtn.is-active{border-color:#d0a14f;background:linear-gradient(180deg,rgba(82,58,28,.96),rgba(35,24,14,.98));}
        .marketHeroBtn img{width:42px;height:42px;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(0,0,0,.45));}
        .marketPanel{background:linear-gradient(180deg,rgba(13,14,18,.9),rgba(8,9,12,.96));border:1px solid rgba(87,87,94,.86);border-radius:8px;padding:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 16px 30px rgba(0,0,0,.22);}
        .marketSearchTitle{max-width:560px;margin:0 auto 10px;padding:6px 12px;border:1px solid rgba(96,96,104,.72);border-radius:8px;text-align:center;color:#aeb0b8;background:rgba(0,0,0,.18);}
        .marketSlotBar{display:grid;grid-template-columns:repeat(7,minmax(56px,1fr));gap:4px;margin-bottom:12px;}
        .marketSlotBtn{min-height:44px!important;border-radius:4px!important;padding:6px!important;font-size:12px!important;}
        .marketSlotBtn.is-active{border-color:#d0a14f!important;color:#fff1cf!important;}
        .marketTable{width:100%;border-collapse:collapse;table-layout:fixed;}
        .marketTable th,.marketTable td{border:1px solid rgba(83,83,90,.72);padding:8px;text-align:center;vertical-align:middle;background:rgba(0,0,0,.16);}
        .marketTable th{font-weight:900;color:#d9d9df;background:rgba(0,0,0,.28);}
        .marketItemCell{display:flex;align-items:center;gap:10px;text-align:left;min-width:0;}
        .marketItemIcon{width:48px;height:48px;flex:0 0 48px;border:1px solid rgba(92,92,102,.8);border-radius:6px;background:#101219;object-fit:cover;}
        .marketItemIconBtn{width:48px;height:48px;flex:0 0 48px;padding:0!important;min-height:0!important;border:0!important;background:transparent!important;box-shadow:none!important;cursor:pointer;}
        .marketItemIconBtn:hover{transform:none!important;filter:brightness(1.16);}
        .marketItemName{font-weight:900;color:#f3ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .marketItemMeta{font-size:12px;color:#aeb0b8;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .marketGold{color:#f0d326;font-weight:900;}
        .marketQtyInput{width:72px;padding:8px;border-radius:6px;border:1px solid rgba(126,94,50,.86);background:#090a0e;color:#fff;text-align:center;}
        .marketSellGrid{display:grid;grid-template-columns:minmax(220px,1fr) 92px 120px auto;gap:8px;align-items:end;margin-top:12px;}
        .marketField{display:grid;gap:5px;text-align:left;color:#d9ccb0;font-size:12px;}
        .marketField select,.marketField input{min-height:38px;border-radius:6px;border:1px solid rgba(126,94,50,.86);background:#090a0e;color:#fff;padding:8px;}
        .marketStatus{margin-top:10px;min-height:20px;color:#d9ccb0;text-align:center;}
        .marketEmpty{padding:22px;text-align:center;color:#aeb0b8;border:1px solid rgba(83,83,90,.5);background:rgba(0,0,0,.12);}
        .marketPager{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;margin-top:10px;}
        .marketPagerBtn{width:auto!important;min-width:38px!important;min-height:34px!important;padding:6px 10px!important;border-radius:6px!important;}
        .marketPagerBtn.is-active{border-color:#d0a14f!important;color:#fff1cf!important;background:linear-gradient(180deg,rgba(82,58,28,.96),rgba(35,24,14,.98))!important;}
        .marketModalBackdrop{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72);}
        .marketModal{width:min(720px,96vw);border:1px solid rgba(126,94,50,.95);border-radius:10px;background:linear-gradient(180deg,rgba(22,23,31,.98),rgba(9,10,14,.98));box-shadow:0 24px 80px rgba(0,0,0,.62),inset 0 1px 0 rgba(255,232,184,.08);padding:16px;color:#f3ead6;}
        .marketModalTop{display:flex;align-items:flex-start;gap:14px;}
        .marketModalIcon{width:84px;height:84px;border-radius:8px;border:2px solid #333;background:#0f0f16;object-fit:cover;flex:0 0 auto;}
        .marketModalName{font-size:24px;font-weight:900;line-height:1.1;}
        .marketModalMeta{margin-top:7px;color:#cfc6b5;line-height:1.35;}
        .marketModalClose{width:auto!important;min-height:34px!important;padding:7px 11px!important;margin-left:auto;}
        .marketModalActions{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px;}
        .marketModalQty{width:84px;padding:9px 10px;border-radius:8px;border:1px solid rgba(126,94,50,.86);background:#090a0e;color:#fff;text-align:center;}
        .marketModalInfo{padding:9px 12px;border-radius:8px;border:1px solid #333;background:#15151e;color:#f0d326;font-weight:900;}
        .marketHistoryHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;}
        .marketHistoryClear{width:auto!important;min-height:32px!important;padding:6px 10px!important;border-radius:6px!important;font-size:12px!important;}
        .marketHistoryList{display:grid;gap:6px;margin-top:8px;}
        .marketHistoryRow{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:9px;align-items:center;border:1px solid rgba(83,83,90,.58);background:rgba(0,0,0,.14);padding:7px;border-radius:6px;text-align:left;}
        .marketHistoryRow img{width:40px;height:40px;border-radius:6px;border:1px solid rgba(92,92,102,.8);object-fit:cover;background:#101219;}
        .marketHistoryName{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .marketHistoryMeta{font-size:12px;color:#aeb0b8;margin-top:2px;}
        .marketShopGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
        .marketShopCard{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid rgba(83,83,90,.72);border-radius:8px;background:rgba(0,0,0,.16);padding:10px;text-align:left;}
        .marketShopCard.is-owned{border-color:rgba(55,190,104,.56);background:rgba(22,75,42,.14);}
        .marketShopCard img{width:64px;height:64px;border-radius:8px;border:1px solid rgba(92,92,102,.8);object-fit:cover;background:#101219;}
        .marketShopName{font-size:17px;font-weight:900;color:#f3ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .marketShopMeta{margin-top:4px;font-size:12px;color:#aeb0b8;line-height:1.35;}
        .marketOwnedText{color:#9dffb4;font-weight:900;}
        @media(max-width:760px){
          .marketHeader{align-items:flex-start;}
          .marketHeaderActions{justify-content:flex-end;}
          .marketTop{grid-template-columns:1fr;}
          .marketShopGrid{grid-template-columns:1fr;}
          .marketShopCard{grid-template-columns:54px minmax(0,1fr);}
          .marketShopCard img{width:54px;height:54px;}
          .marketShopCard button{grid-column:1 / -1;}
          .marketSlotBar{grid-template-columns:repeat(3,minmax(0,1fr));}
          .marketSellGrid{grid-template-columns:1fr 1fr;}
          .marketTable{font-size:13px;}
          .marketItemIcon{width:40px;height:40px;flex-basis:40px;}
          .marketItemIconBtn{width:40px;height:40px;flex-basis:40px;}
          .marketModalTop{align-items:center;}
          .marketModalIcon{width:70px;height:70px;}
          .marketModalName{font-size:20px;}
        }
      </style>
      <div class="marketShell">
        <div class="marketHeader">
          <h1>Market</h1>
          <div class="marketHeaderActions">
            <button type="button" class="marketMyBtn ${state.view === "generalShop" ? "is-active" : ""}" data-market-view="generalShop">General Shop</button>
            <button type="button" class="marketMyBtn ${state.view === "myListings" ? "is-active" : ""}" data-market-view="myListings">My Listings</button>
          </div>
        </div>
        <div class="marketTop">
          <button type="button" class="marketHeroBtn ${state.view === "latest" ? "is-active" : ""}" data-market-view="latest">
            <img src="${marketIcon("latest")}" alt="">
            <span>Latest Items</span>
          </button>
          <button type="button" class="marketHeroBtn ${state.view === "gear" ? "is-active" : ""}" data-market-view="gear">
            <img src="${marketIcon("gear")}" alt="">
            <span>Combat Gear</span>
          </button>
          <button type="button" class="marketHeroBtn ${state.view === "materials" ? "is-active" : ""}" data-market-view="materials">
            <img src="${marketIcon("materials")}" alt="">
            <span>Materials</span>
          </button>
        </div>

        <div class="marketPanel">
          <div class="marketSearchTitle">${viewTitle()}</div>
          ${state.view === "gear" ? renderGearSlots() : ""}
          ${state.view === "generalShop" ? renderGeneralShop() : `
            <div id="marketListings">${renderListings()}</div>
            ${renderSellBox()}
            ${renderMarketHistory()}
          `}
          <div id="shopMsg" class="marketStatus">${esc(state.status)}</div>
        </div>
        ${renderInspectorModal()}
      </div>
    `;
  }

  function viewTitle(){
    if (state.view === "gear") return state.gearSlot === "all" ? "Combat Items" : `Combat Items • ${slotLabel(state.gearSlot)}`;
    if (state.view === "materials") return "Materials";
    if (state.view === "generalShop") return "General Shop";
    if (state.view === "myListings") return `My Active Listings ${state.myListings.length}/10`;
    return "Items Recently Added To The Market";
  }

  function renderGeneralShop(){
    const save = loadSave();
    return `
      <div class="marketShopGrid">
        ${GENERAL_SHOP_ITEMS.map((item) => {
          const owned = item.kind === "pet" && !!save?.pets?.[item.slot];
          return `
            <div class="marketShopCard ${owned ? "is-owned" : ""}">
              <img src="${esc(item.img)}" alt="">
              <div style="min-width:0;">
                <div class="marketShopName">${esc(item.name)}</div>
                <div class="marketShopMeta">
                  ${esc(item.meta || "")}<br>
                  ${owned ? `<span class="marketOwnedText">Owned</span>` : `Price: <span class="marketGold">${fmt.format(num(item.price, 0))} gold</span>`}
                </div>
              </div>
              <button type="button" data-buy-shop-item="${esc(item.id)}" ${owned ? "disabled" : ""}>${owned ? "Owned" : "Buy"}</button>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderGearSlots(){
    return `
      <div class="marketSlotBar">
        ${GEAR_SLOTS.map(([key, label]) => `
          <button type="button" class="marketSlotBtn ${state.gearSlot === key ? "is-active" : ""}" data-market-slot="${esc(key)}">${esc(label)}</button>
        `).join("")}
      </div>
    `;
  }

  function filteredListings(){
    const userId = getUserId();
    if (state.view === "myListings") return state.myListings;
    return state.listings.filter((listing) => {
      if (state.view === "latest") return true;
      if (state.view === "materials") return listing.category === "materials";
      if (state.view === "gear") {
        if (listing.category !== "gear") return false;
        return state.gearSlot === "all" || listing.gear_slot === state.gearSlot;
      }
      return true;
    });
  }

  function renderListings(){
    if (state.loading) return `<div class="marketEmpty">Loading market...</div>`;
    const rows = filteredListings();
    if (!rows.length) return `<div class="marketEmpty">No active listings here yet.</div>`;
    const userId = getUserId();
    const totalPages = Math.max(1, Math.ceil(rows.length / LISTINGS_PER_PAGE));
    state.page = Math.max(1, Math.min(Math.floor(num(state.page, 1)), totalPages));
    const start = (state.page - 1) * LISTINGS_PER_PAGE;
    const visibleRows = rows.slice(start, start + LISTINGS_PER_PAGE);
    return `
      <table class="marketTable">
        <thead>
          <tr>
            <th style="width:38%;">Item</th>
            <th style="width:12%;">Quantity</th>
            <th style="width:16%;">Price EA</th>
            <th style="width:12%;">R.LVL</th>
            <th style="width:22%;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${visibleRows.map((listing) => renderListingRow(listing, userId)).join("")}
        </tbody>
      </table>
      ${renderPagination(totalPages)}
    `;
  }

  function renderPagination(totalPages){
    if (totalPages <= 1) return "";
    return `
      <div class="marketPager">
        ${Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => `
          <button type="button" class="marketPagerBtn ${state.page === page ? "is-active" : ""}" data-market-page="${page}">${page}</button>
        `).join("")}
      </div>
    `;
  }

  function renderListingRow(listing, userId){
    const item = listing.item || {};
    const qty = Math.max(1, Math.floor(num(listing.quantity, 1)));
    const req = num(item.reqLevel, 0);
    const mine = userId && listing.seller_user_id === userId;
    return `
      <tr>
        <td>
          <div class="marketItemCell">
            <button type="button" class="marketItemIconBtn" data-inspect-listing="${esc(listing.id)}" aria-label="Inspect ${esc(listing.item_name || item.name || "Item")}">
              <img class="marketItemIcon" src="${esc(listing.item_img || item.img || marketIcon(listing.category))}" alt="">
            </button>
            <div style="min-width:0;">
              <div class="marketItemName">${esc(listing.item_name || item.name || "Item")}</div>
              <div class="marketItemMeta">${esc(itemMeta(item) || `Seller: ${listing.seller_name || "Hero"}`)}</div>
            </div>
          </div>
        </td>
        <td>${fmt.format(qty)}</td>
        <td class="marketGold">${fmt.format(num(listing.price_each, 0))} gold</td>
        <td>${req ? esc(req) : "-"}</td>
        <td>
          ${mine ? `
            <button type="button" data-cancel-listing="${esc(listing.id)}">Cancel</button>
          ` : `
            <input class="marketQtyInput" type="number" min="1" max="${qty}" value="1" data-buy-qty="${esc(listing.id)}">
            <button type="button" data-buy-listing="${esc(listing.id)}">Buy</button>
          `}
        </td>
      </tr>
    `;
  }

  function renderInspectorModal(){
    const listing = selectedListing(state.inspectListingId);
    if (!listing) return "";
    const userId = getUserId();
    const item = listing.item || {};
    const qty = Math.max(1, Math.floor(num(listing.quantity, 1)));
    const priceEach = Math.max(1, Math.floor(num(listing.price_each, 1)));
    const mine = userId && listing.seller_user_id === userId;
    const details = itemMeta(item);
    const statParts = [];
    if (item?.slot) statParts.push(`Slot: ${slotLabel(item.slot)}`);
    if (item?.rarity) statParts.push(`Rarity: ${item.rarity}`);
    if (num(item?.reqLevel, 0)) statParts.push(`Required Level: ${num(item.reqLevel, 1)}`);
    if (num(item?.atk, 0)) statParts.push(`Attack +${num(item.atk, 0)}`);
    if (num(item?.def, 0)) statParts.push(`Defense +${num(item.def, 0)}`);
    return `
      <div class="marketModalBackdrop" data-close-market-inspector="1">
        <div class="marketModal" role="dialog" aria-modal="true" aria-label="${esc(listing.item_name || item.name || "Market Item")}" data-market-modal="1">
          <div class="marketModalTop">
            <img class="marketModalIcon" src="${esc(listing.item_img || item.img || marketIcon(listing.category))}" alt="">
            <div style="min-width:0;flex:1;">
              <div class="marketModalName">${esc(listing.item_name || item.name || "Item")}</div>
              <div class="marketModalMeta">
                Seller: <b>${esc(listing.seller_name || "Hero")}</b><br>
                Quantity: <b>${fmt.format(qty)}</b><br>
                Price EA: <span class="marketGold">${fmt.format(priceEach)} gold</span>
                ${details ? `<br>${esc(details)}` : ""}
                ${statParts.length ? `<br>${esc(statParts.join(" - "))}` : ""}
              </div>
            </div>
            <button type="button" class="marketModalClose" data-close-market-inspector="1">Close</button>
          </div>
          <div class="marketModalActions">
            ${mine ? `
              <button type="button" data-cancel-listing="${esc(listing.id)}">Cancel Listing</button>
            ` : `
              <input class="marketModalQty" type="number" min="1" max="${qty}" value="1" data-inspector-buy-qty="${esc(listing.id)}">
              <button type="button" data-inspector-buy-listing="${esc(listing.id)}">Buy</button>
              <div class="marketModalInfo">Max: ${fmt.format(qty)}</div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  function renderSellBox(){
    const save = loadSave();
    const inventory = Array.isArray(save.inventory) ? save.inventory : [];
    const myListingCount = state.myListings.length;
    const listingLimitReached = myListingCount >= 10;
    const sellable = inventory
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => isSellableItem(it));
    const selected = sellable.find(({ idx }) => idx === state.selectedInvIndex) || sellable[0] || null;
    if (selected && state.selectedInvIndex < 0) state.selectedInvIndex = selected.idx;
    const q = selected ? getQty(selected.it) : 1;
    const price = selected ? defaultSellPrice(selected.it) : 1;

    return `
      <div class="marketSearchTitle" style="margin-top:16px;">Sell An Item Or Material</div>
      <div class="marketSellGrid">
        <label class="marketField">
          Item
          <select id="marketSellItem" ${sellable.length && !listingLimitReached ? "" : "disabled"}>
            ${sellable.length ? sellable.map(({ it, idx }) => `
              <option value="${idx}" ${idx === state.selectedInvIndex ? "selected" : ""}>
                ${esc(it.name || "Item")} x${getQty(it)}${isGearItem(it) ? ` • ${slotLabel(it.slot)}` : ""}
              </option>
            `).join("") : `<option>No inventory items</option>`}
          </select>
        </label>
        <label class="marketField">
          Qty
          <input id="marketSellQty" type="number" min="1" max="${q}" value="1" ${selected && !listingLimitReached ? "" : "disabled"}>
        </label>
        <label class="marketField">
          Price EA
          <input id="marketSellPrice" type="number" min="1" value="${price}" ${selected && !listingLimitReached ? "" : "disabled"}>
        </label>
        <button id="marketListBtn" type="button" ${selected && !listingLimitReached ? "" : "disabled"}>List</button>
      </div>
      <div class="marketItemMeta" style="margin-top:8px;text-align:center;">
        My Listings: ${myListingCount}/10${listingLimitReached ? " - cancel one listing before adding another." : ""}
      </div>
      ${selected ? `
        <div class="marketItemMeta" style="margin-top:8px;text-align:center;">
          ${esc(selected.it.name || "Item")} ${itemMeta(selected.it) ? `• ${esc(itemMeta(selected.it))}` : ""} • Available x${fmt.format(q)}
        </div>
      ` : ""}
    `;
  }

  function renderMarketHistory(){
    const rows = state.saleHistory || [];
    return `
      <div class="marketHistoryHeader">
        <div class="marketSearchTitle" style="margin:0;flex:1;">Market History</div>
        <button type="button" class="marketHistoryClear" data-clear-market-history="1" ${rows.length ? "" : "disabled"}>Clear</button>
      </div>
      <div class="marketHistoryList">
        ${rows.length ? rows.slice(0, 10).map((row) => `
          <div class="marketHistoryRow">
            <img src="${esc(row.img || marketIcon(row.category || "latest"))}" alt="">
            <div style="min-width:0;">
              <div class="marketHistoryName">${esc(row.itemName || "Item")}</div>
              <div class="marketHistoryMeta">Sold x${fmt.format(num(row.quantity, 1))} • ${esc(formatHistoryTime(row.at))}</div>
            </div>
            <div class="marketGold">+${fmt.format(num(row.gold, 0))}</div>
          </div>
        `).join("") : `<div class="marketEmpty">No sales in this browser yet.</div>`}
      </div>
    `;
  }

  function formatHistoryTime(at){
    const ms = Number(at || 0);
    if (!Number.isFinite(ms) || ms <= 0) return "recently";
    try {
      return new Intl.DateTimeFormat("el-GR", { dateStyle: "short", timeStyle: "short" }).format(ms);
    } catch {
      return "recently";
    }
  }

  async function loadListings(){
    const client = window.DSAuth?.getClient?.();
    if (!client) {
      state.status = "Sign in to use the player market.";
      render();
      return;
    }

    state.loading = true;
    render();
    try {
      let { data, error } = await client.rpc("get_market_listings", {
        p_limit: MARKET_PAGE_SIZE
      });

      if (error && /function .*get_market_listings/i.test(String(error.message || ""))) {
        const fallback = await client
          .from("market_listings")
          .select("id,seller_user_id,seller_name,item,item_name,item_img,item_rarity,category,gear_slot,quantity,price_each,created_at")
          .eq("status", "active")
          .gt("quantity", 0)
          .order("created_at", { ascending: false })
          .limit(MARKET_PAGE_SIZE);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      const marketListings = Array.isArray(data) ? data : [];
      let myListings = [];
      const myResult = await client.rpc("get_my_market_listings");
      if (!myResult.error && Array.isArray(myResult.data)) {
        myListings = myResult.data;
      } else {
        const userId = getUserId();
        myListings = marketListings.filter((listing) => userId && listing.seller_user_id === userId);
      }
      const salesResult = await client.rpc("get_my_market_sales", { p_limit: 30 });
      if (!salesResult.error && Array.isArray(salesResult.data)) {
        mergeSaleHistory(salesResult.data.map((sale) => ({
          key: `sale:${sale.id || sale.listing_id || ""}`,
          listingId: sale.listing_id || "",
          itemName: sale.item_name || sale.item?.name || "Item",
          img: sale.item_img || sale.item?.img || "",
          category: sale.category || "",
          quantity: num(sale.quantity, 1),
          priceEach: num(sale.price_each, 0),
          gold: num(sale.total_gold, 0),
          at: Date.parse(sale.sold_at || "") || Date.now(),
          item: sale.item || {}
        })));
      }
      const merged = new Map();
      marketListings.forEach((listing) => merged.set(String(listing.id), listing));
      myListings.forEach((listing) => merged.set(String(listing.id), listing));
      state.listings = Array.from(merged.values()).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      state.myListings = myListings;
      const totalPages = Math.max(1, Math.ceil(filteredListings().length / LISTINGS_PER_PAGE));
      state.page = Math.max(1, Math.min(Math.floor(num(state.page, 1)), totalPages));
      state.status = "";
    } catch (error) {
      state.status = error?.message || "Could not load market.";
    } finally {
      state.loading = false;
      render();
    }
  }

  function applySellerGoldFromRealtime(payload){
    if (!payload || payload.eventType !== "UPDATE") return;
    const userId = getUserId();
    const prev = payload.old || {};
    const next = payload.new || {};
    if (!userId || String(next.seller_user_id || "") !== String(userId)) return;
    if (String(next.buyer_user_id || "") === String(userId)) return;

    const oldQty = Math.max(0, Math.floor(num(prev.quantity, next.quantity)));
    const newQty = Math.max(0, Math.floor(num(next.quantity, oldQty)));
    const soldQty = Math.max(0, oldQty - newQty);
    const priceEach = Math.max(0, Math.floor(num(next.price_each, prev.price_each)));
    const earnedGold = soldQty * priceEach;
    if (earnedGold <= 0) return;

    const eventKey = [
      next.id || prev.id || "",
      oldQty,
      newQty,
      next.status || "",
      next.buyer_user_id || "",
      priceEach
    ].join("::");
    if (state.appliedSaleEvents.has(eventKey)) return;
    state.appliedSaleEvents.add(eventKey);
    if (state.appliedSaleEvents.size > 80) {
      state.appliedSaleEvents = new Set(Array.from(state.appliedSaleEvents).slice(-40));
    }

    const save = loadSave();
    save.gold = Math.max(0, num(save.gold, 0)) + earnedGold;
    setSave(save);
    const sale = {
      key: eventKey,
      listingId: next.id || prev.id || "",
      itemName: next.item_name || prev.item_name || "Item",
      img: next.item_img || prev.item_img || next.item?.img || prev.item?.img || "",
      category: next.category || prev.category || "",
      quantity: soldQty,
      priceEach,
      gold: earnedGold,
      sellerName: next.seller_name || prev.seller_name || "Hero",
      at: Date.now(),
      item: next.item || prev.item || {}
    };
    addSaleHistory(sale);
    showSaleNotice(sale);
    if (isMarketPage()) setStatus(`Sold ${sale.itemName} x${soldQty}. +${fmt.format(earnedGold)} gold.`);
  }

  function scheduleRealtimeRefresh(payload){
    if (!isMarketPage()) return;
    if (state.realtimeTimer) window.clearTimeout(state.realtimeTimer);
    state.realtimeTimer = window.setTimeout(() => {
      state.realtimeTimer = 0;
      loadListings();
    }, 250);
  }

  function bindRealtime(){
    const client = window.DSAuth?.getClient?.();
    if (!client || state.realtimeChannel) return;
    try {
      state.realtimeChannel = client
        .channel("market-listings-live")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "market_listings"
        }, scheduleRealtimeRefresh)
        .subscribe();
    } catch (error) {
      console.warn("[market] realtime subscription failed", error);
      state.realtimeChannel = null;
    }
  }

  function ensureNoticeStyles(){
    if (document.getElementById("marketNoticeStyles")) return;
    const style = document.createElement("style");
    style.id = "marketNoticeStyles";
    style.textContent = `
      .marketSaleNotice{position:fixed;right:18px;top:96px;z-index:120;min-width:220px;max-width:min(340px,calc(100vw - 24px));border:1px solid rgba(55,190,104,.9);border-radius:8px;background:linear-gradient(180deg,rgba(15,46,30,.98),rgba(7,20,13,.98));box-shadow:0 16px 46px rgba(0,0,0,.42),inset 0 1px 0 rgba(204,255,220,.12);color:#9dffb4;padding:11px 13px;font-weight:900;text-align:left;cursor:pointer;}
      .marketSaleNotice small{display:block;margin-top:3px;color:#d7ffe0;font-weight:700;opacity:.88;}
      .marketSalePopupBackdrop{position:fixed;inset:0;z-index:121;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72);}
      .marketSalePopup{width:min(560px,96vw);border:1px solid rgba(55,190,104,.86);border-radius:10px;background:linear-gradient(180deg,rgba(22,23,31,.98),rgba(9,10,14,.98));box-shadow:0 24px 80px rgba(0,0,0,.62),inset 0 1px 0 rgba(204,255,220,.08);padding:16px;color:#f3ead6;}
      .marketSalePopupTop{display:flex;gap:13px;align-items:center;}
      .marketSalePopupTop img{width:72px;height:72px;border-radius:8px;border:2px solid #333;background:#101219;object-fit:cover;}
      .marketSalePopupTitle{font-size:22px;font-weight:900;color:#9dffb4;}
      .marketSalePopupMeta{margin-top:6px;color:#d9ccb0;line-height:1.4;}
      .marketSalePopupActions{display:flex;justify-content:center;margin-top:14px;}
      .marketGold{color:#f0d326;font-weight:900;}
      @media(max-width:760px){.marketSaleNotice{top:82px;right:12px;left:12px;max-width:none;}}
    `;
    document.head.appendChild(style);
  }

  function showSaleNotice(sale){
    ensureNoticeStyles();
    state.activeSaleNotice = sale;
    document.querySelector(".marketSaleNotice")?.remove();
    const notice = document.createElement("button");
    notice.type = "button";
    notice.className = "marketSaleNotice";
    notice.innerHTML = `You sold an item<small>${esc(sale.itemName)} x${fmt.format(num(sale.quantity, 1))} • +${fmt.format(num(sale.gold, 0))} gold</small>`;
    notice.addEventListener("click", () => showSalePopup(sale));
    document.body.appendChild(notice);
    window.setTimeout(() => {
      if (notice.isConnected) notice.remove();
    }, 12000);
  }

  function showSalePopup(sale){
    ensureNoticeStyles();
    document.querySelector(".marketSalePopupBackdrop")?.remove();
    const popup = document.createElement("div");
    popup.className = "marketSalePopupBackdrop";
    popup.innerHTML = `
      <div class="marketSalePopup" role="dialog" aria-modal="true">
        <div class="marketSalePopupTop">
          <img src="${esc(sale.img || marketIcon(sale.category || "latest"))}" alt="">
          <div style="min-width:0;flex:1;">
            <div class="marketSalePopupTitle">You sold ${esc(sale.itemName || "an item")}</div>
            <div class="marketSalePopupMeta">
              Quantity: <b>${fmt.format(num(sale.quantity, 1))}</b><br>
              Price EA: <b>${fmt.format(num(sale.priceEach, 0))} gold</b><br>
              Total: <span class="marketGold">+${fmt.format(num(sale.gold, 0))} gold</span>
            </div>
          </div>
        </div>
        <div class="marketSalePopupActions">
          <button type="button" data-close-sale-popup="1">Close</button>
        </div>
      </div>
    `;
    popup.addEventListener("click", (event) => {
      if (event.target === popup || event.target?.dataset?.closeSalePopup) popup.remove();
    });
    document.body.appendChild(popup);
  }

  function selectedListing(id){
    return state.listings.find((listing) => String(listing.id) === String(id)) || null;
  }

  function addShopItemToInventory(save, item, quantity){
    if (window.DSInventory?.addItem) {
      return window.DSInventory.addItem(save, item, quantity, { stack: true });
    }
    if (!Array.isArray(save.inventory)) save.inventory = [];
    const key = `${item.type || ""}::${item.id || item.name || ""}`;
    const existing = save.inventory.find((it) => it && `${it.type || ""}::${it.id || it.name || ""}` === key);
    if (existing) existing.quantity = num(existing.quantity, 1) + quantity;
    else save.inventory.push({ ...item, quantity });
    return { ok: true };
  }

  function buyGeneralShopItem(id){
    const shopItem = GENERAL_SHOP_ITEMS.find((item) => item.id === id);
    if (!shopItem) {
      setStatus("Shop item is no longer available.");
      return;
    }

    const save = loadSave();
    save.gold = Math.max(0, Math.floor(num(save.gold, 0)));
    if (save.gold < shopItem.price) {
      setStatus(`Not enough gold. Need ${fmt.format(shopItem.price)} gold.`);
      return;
    }

    if (shopItem.kind === "pet") {
      if (!save.pets || typeof save.pets !== "object") save.pets = {};
      if (save.pets[shopItem.slot]) {
        setStatus(`You already have a ${shopItem.meta}.`);
        return;
      }
      const xpNext = window.DS?.pets?.petXpNextForLevel ? window.DS.pets.petXpNextForLevel(1) : 100;
      const pet = {
        ...shopItem.pet,
        active: true,
        level: 1,
        xp: 0,
        xpNext,
        nextUpgradeCost: 1000000
      };
      save.gold -= shopItem.price;
      save.pets[shopItem.slot] = window.DS?.pets?.normalizePet ? window.DS.pets.normalizePet(shopItem.slot, pet) : pet;
      setSave(save);
      window.DSAuth?.syncCloudSaveNow?.();
      setStatus(`Bought ${shopItem.name}.`);
      render();
      return;
    }

    const added = addShopItemToInventory(save, shopItem.item, shopItem.quantity);
    if (!added?.ok) {
      setStatus("Not enough inventory space.");
      return;
    }
    save.gold -= shopItem.price;
    setSave(save);
    window.DSAuth?.syncCloudSaveNow?.();
    setStatus(`Bought ${shopItem.name}.`);
    render();
  }

  async function listSelectedItem(){
    if (state.myListings.length >= 10) {
      setStatus("You can only have 10 active market listings. Cancel one first.");
      return;
    }
    const save = loadSave();
    const inv = Array.isArray(save.inventory) ? save.inventory : [];
    const item = inv[state.selectedInvIndex];
    if (!item) {
      setStatus("Choose an item from your inventory.");
      return;
    }
    const maxQty = getQty(item);
    const qtyEl = document.getElementById("marketSellQty");
    const priceEl = document.getElementById("marketSellPrice");
    const qty = Math.max(1, Math.min(maxQty, Math.floor(num(qtyEl?.value, 1))));
    const priceEach = Math.max(1, Math.floor(num(priceEl?.value, defaultSellPrice(item))));

    setStatus("Listing item...");
    try {
      await window.DSAuth.invokeCreateMarketListing({ item, quantity: qty, priceEach });
      state.selectedInvIndex = -1;
      state.view = "myListings";
      state.page = 1;
      state.inspectListingId = "";
      await loadListings();
      setStatus(`Listed ${item.name || "Item"} x${qty} for ${fmt.format(priceEach)} gold EA.`);
      document.querySelector(".marketShell")?.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (error) {
      setStatus(error?.message || "Could not list item.");
    }
  }

  function findInspectorBuyQtyInput(id){
    return Array.from(document.querySelectorAll("[data-inspector-buy-qty]"))
      .find((el) => String(el.dataset.inspectorBuyQty || "") === String(id)) || null;
  }

  async function buyListing(id, explicitQty = null){
    const listing = selectedListing(id);
    if (!listing) {
      setStatus("Listing is no longer visible.");
      return;
    }
    const qtyEl = findBuyQtyInput(id);
    const wantedQty = explicitQty == null ? qtyEl?.value : explicitQty;
    const qty = Math.max(1, Math.min(num(listing.quantity, 1), Math.floor(num(wantedQty, 1))));
    setStatus("Buying item...");
    try {
      await window.DSAuth.invokeBuyMarketListing({ listingId: id, quantity: qty });
      state.inspectListingId = "";
      await loadListings();
      setStatus(`Bought ${listing.item_name || "Item"} x${qty}.`);
    } catch (error) {
      setStatus(error?.message || "Could not buy item.");
    }
  }

  async function cancelListing(id){
    setStatus("Cancelling listing...");
    try {
      await window.DSAuth.invokeCancelMarketListing({ listingId: id });
      state.inspectListingId = "";
      await loadListings();
      setStatus("Listing cancelled and returned to your inventory.");
    } catch (error) {
      setStatus(error?.message || "Could not cancel listing.");
    }
  }

  function setStatus(text){
    state.status = text || "";
    const el = document.getElementById("shopMsg");
    if (el) el.textContent = state.status;
  }

  function bind(){
    document.querySelectorAll("[data-market-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.view = String(btn.dataset.marketView || "latest");
        state.page = 1;
        state.inspectListingId = "";
        render();
      });
    });
    document.querySelectorAll("[data-market-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.gearSlot = String(btn.dataset.marketSlot || "all");
        state.page = 1;
        render();
      });
    });
    document.querySelectorAll("[data-market-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.page = Math.max(1, Math.floor(num(btn.dataset.marketPage, 1)));
        render();
      });
    });
    document.querySelectorAll("[data-inspect-listing]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.inspectListingId = String(btn.dataset.inspectListing || "");
        render();
      });
    });
    document.querySelectorAll("[data-close-market-inspector]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        if (btn.classList.contains("marketModalBackdrop") && event.target !== btn) return;
        state.inspectListingId = "";
        render();
      });
    });
    document.querySelectorAll("[data-buy-listing]").forEach((btn) => {
      btn.addEventListener("click", () => buyListing(btn.dataset.buyListing));
    });
    document.querySelectorAll("[data-inspector-buy-listing]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.inspectorBuyListing;
        const qtyEl = findInspectorBuyQtyInput(id);
        buyListing(id, qtyEl?.value);
      });
    });
    document.querySelectorAll("[data-cancel-listing]").forEach((btn) => {
      btn.addEventListener("click", () => cancelListing(btn.dataset.cancelListing));
    });
    document.querySelectorAll("[data-buy-shop-item]").forEach((btn) => {
      btn.addEventListener("click", () => buyGeneralShopItem(String(btn.dataset.buyShopItem || "")));
    });
    document.getElementById("marketSellItem")?.addEventListener("change", (event) => {
      state.selectedInvIndex = Math.floor(num(event.target.value, -1));
      render();
    });
    document.getElementById("marketListBtn")?.addEventListener("click", listSelectedItem);
    document.querySelector("[data-clear-market-history]")?.addEventListener("click", () => {
      saveSaleHistory([]);
      render();
    });
  }

  function render(){
    const left = document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = template();
    document.title = "Darkstone Chronicles - Market";
    bind();
    return true;
  }

  function mountMarket(root = null) {
    if (!root && !isMarketPage()) {
      bindRealtime();
      return false;
    }
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    if (String(window.location.hash || "").toLowerCase() === "#pets") {
      state.view = "generalShop";
    }
    render();
    bindRealtime();
    loadListings();
    return true;
  }

  window.DSMarket = {
    mount: mountMarket,
    refresh: loadListings
  };

  window.addEventListener("ds:save", () => {
    if (isMarketPage() && document.getElementById("marketSellItem")) render();
  });

  window.addEventListener("DOMContentLoaded", () => {
    bindRealtime();
    if (isMarketPage() && document.getElementById("leftPanel")) mountMarket();
  });
})();
