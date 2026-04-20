(() => {
  const SAVE_KEY = "darkstone_save_v1";
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

  const state = {
    view: "latest",
    gearSlot: "all",
    page: 1,
    listings: [],
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

  function template(){
    return `
      <style>
        .marketShell{max-width:980px;margin:0 auto;color:#f3ead6;}
        .marketHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}
        .marketHeader h1{margin:0!important;}
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
        @media(max-width:760px){
          .marketTop{grid-template-columns:1fr;}
          .marketSlotBar{grid-template-columns:repeat(3,minmax(0,1fr));}
          .marketSellGrid{grid-template-columns:1fr 1fr;}
          .marketTable{font-size:13px;}
          .marketItemIcon{width:40px;height:40px;flex-basis:40px;}
        }
      </style>
      <div class="marketShell">
        <div class="marketHeader">
          <h1>Market</h1>
          <button type="button" class="marketMyBtn ${state.view === "myListings" ? "is-active" : ""}" data-market-view="myListings">My Listings</button>
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
          <div id="marketListings">${renderListings()}</div>
          ${renderSellBox()}
          <div id="shopMsg" class="marketStatus">${esc(state.status)}</div>
        </div>
      </div>
    `;
  }

  function viewTitle(){
    if (state.view === "gear") return state.gearSlot === "all" ? "Combat Items" : `Combat Items • ${slotLabel(state.gearSlot)}`;
    if (state.view === "materials") return "Materials";
    if (state.view === "myListings") return "My Active Listings";
    return "Items Recently Added To The Market";
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
    return state.listings.filter((listing) => {
      if (state.view === "latest") return true;
      if (state.view === "myListings") return userId && listing.seller_user_id === userId;
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
            <img class="marketItemIcon" src="${esc(listing.item_img || item.img || marketIcon(listing.category))}" alt="">
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

  function renderSellBox(){
    const save = loadSave();
    const inventory = Array.isArray(save.inventory) ? save.inventory : [];
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
          <select id="marketSellItem" ${sellable.length ? "" : "disabled"}>
            ${sellable.length ? sellable.map(({ it, idx }) => `
              <option value="${idx}" ${idx === state.selectedInvIndex ? "selected" : ""}>
                ${esc(it.name || "Item")} x${getQty(it)}${isGearItem(it) ? ` • ${slotLabel(it.slot)}` : ""}
              </option>
            `).join("") : `<option>No inventory items</option>`}
          </select>
        </label>
        <label class="marketField">
          Qty
          <input id="marketSellQty" type="number" min="1" max="${q}" value="1" ${selected ? "" : "disabled"}>
        </label>
        <label class="marketField">
          Price EA
          <input id="marketSellPrice" type="number" min="1" value="${price}" ${selected ? "" : "disabled"}>
        </label>
        <button id="marketListBtn" type="button" ${selected ? "" : "disabled"}>List</button>
      </div>
      ${selected ? `
        <div class="marketItemMeta" style="margin-top:8px;text-align:center;">
          ${esc(selected.it.name || "Item")} ${itemMeta(selected.it) ? `• ${esc(itemMeta(selected.it))}` : ""} • Available x${fmt.format(q)}
        </div>
      ` : ""}
    `;
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
      state.listings = Array.isArray(data) ? data : [];
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
    setStatus(`Sold ${next.item_name || "item"} x${soldQty}. +${fmt.format(earnedGold)} gold.`);
  }

  function scheduleRealtimeRefresh(payload){
    applySellerGoldFromRealtime(payload);
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

  function selectedListing(id){
    return state.listings.find((listing) => String(listing.id) === String(id)) || null;
  }

  async function listSelectedItem(){
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
      await loadListings();
      setStatus(`Listed ${item.name || "Item"} x${qty} for ${fmt.format(priceEach)} gold EA.`);
    } catch (error) {
      setStatus(error?.message || "Could not list item.");
    }
  }

  async function buyListing(id){
    const listing = selectedListing(id);
    if (!listing) {
      setStatus("Listing is no longer visible.");
      return;
    }
    const qtyEl = findBuyQtyInput(id);
    const qty = Math.max(1, Math.min(num(listing.quantity, 1), Math.floor(num(qtyEl?.value, 1))));
    setStatus("Buying item...");
    try {
      await window.DSAuth.invokeBuyMarketListing({ listingId: id, quantity: qty });
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
    document.querySelectorAll("[data-buy-listing]").forEach((btn) => {
      btn.addEventListener("click", () => buyListing(btn.dataset.buyListing));
    });
    document.querySelectorAll("[data-cancel-listing]").forEach((btn) => {
      btn.addEventListener("click", () => cancelListing(btn.dataset.cancelListing));
    });
    document.getElementById("marketSellItem")?.addEventListener("change", (event) => {
      state.selectedInvIndex = Math.floor(num(event.target.value, -1));
      render();
    });
    document.getElementById("marketListBtn")?.addEventListener("click", listSelectedItem);
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
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
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
    if (document.getElementById("marketSellItem")) render();
  });

  window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("leftPanel")) mountMarket();
  });
})();
