(() => {
  const SAVE_KEY = "darkstone_save_v1";

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function setSave(next){
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  function ensureSave(save){
    save = save && typeof save === "object" ? save : {};
    if (!Array.isArray(save.inventory)) save.inventory = [];
    if (!Array.isArray(save.bank)) save.bank = [];
    if (!Number.isFinite(Number(save.inventoryMaxSlots))) save.inventoryMaxSlots = 1000;
    return save;
  }

  function itemStackKey(it){
    return [
      it.type || "",
      it.crafted ? "crafted" : "",
      it.name || "",
      it.baseName || "",
      it.setId || "",
      it.slot || "",
      it.reqLevel ?? 1,
      it.atk ?? 0,
      it.def ?? 0,
      it.rarity || "",
      it.img || "",
      it.upg ?? 0,
      it.healHp ?? 0,
      it.healStamina ?? 0
    ].join("::");
  }

  function addToStack(arr, item, qty = 1){
    const key = itemStackKey(item);
    const ex = arr.find(i => i && itemStackKey(i) === key);
    if (ex) ex.quantity = num(ex.quantity, 1) + qty;
    else arr.push({ ...item, quantity: qty });
  }

  function removeFromBankIndex(save, idx, qty = 1){
    const it = save.bank[idx];
    if (!it) return null;
    const q = num(it.quantity ?? it.qty, 1);
    const take = clamp(qty, 1, q);
    const picked = { ...it, quantity: take };
    if (q > take) {
      it.quantity = q - take;
    } else {
      save.bank.splice(idx, 1);
    }
    return picked;
  }

  function usedInventoryUnits(inv){
    let u = 0;
    for (const it of inv || []) {
      if (!it) continue;
      u += Math.max(1, num(it.quantity ?? it.qty, 1));
    }
    return u;
  }

  function hasInventorySpace(save, addUnits){
    return usedInventoryUnits(save.inventory) + addUnits <= num(save.inventoryMaxSlots, 1000);
  }

  function getBgForItem(it){
    if (it?.setId) return "#2a0a0d";
    if (it?.crafted) return "#14361d";
    switch (String(it?.rarity || "").toLowerCase()) {
      case "mythic": return "#0b2a2e";
      case "legendary": return "#2b1a0b";
      case "epic": return "#1a0f2e";
      case "rare": return "#0f1b2e";
      case "uncommon": return "#0f141b";
      case "common": return "#0b0b0b";
      default: return "#0f0f16";
    }
  }

  function getBorderForItem(it){
    if (it?.setId) return "#7c2d35";
    if (it?.crafted) return "#2d7a3d";
    switch (String(it?.rarity || "").toLowerCase()) {
      case "mythic": return "#2aa7b0";
      case "legendary": return "#d18a1f";
      case "epic": return "#7d4bc2";
      case "rare": return "#3d73c9";
      case "uncommon": return "#4c667f";
      case "common": return "#3a3a46";
      default: return "#333";
    }
  }

  const bankGrid = document.getElementById("bankGrid");
  const bankEmpty = document.getElementById("bankEmpty");
  const bankFilterList = document.getElementById("bankFilterList");
  const bankPreview = document.getElementById("bankPreview");

  let selectedIndex = null;
  let activeFilter = "all";

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "equipment", label: "Equipment" },
    { id: "fish", label: "Fish" },
    { id: "meat", label: "Meat" },
    { id: "food", label: "Food" },
    { id: "materials", label: "Materials" },
    { id: "other", label: "Other" }
  ];

  function isGearItem(it){
    return (it?.type === "gear") || !!it?.slot;
  }

  function matchesFilter(it, filterId){
    switch (filterId) {
      case "all": return true;
      case "equipment": return isGearItem(it);
      case "fish": return String(it?.type || "") === "fish";
      case "meat": return String(it?.type || "") === "meat";
      case "food": return String(it?.type || "") === "food";
      case "materials": {
        const t = String(it?.type || "");
        return t === "material" || t === "ore" || t === "consumable";
      }
      case "other": {
        return !matchesFilter(it, "equipment")
          && !matchesFilter(it, "fish")
          && !matchesFilter(it, "meat")
          && !matchesFilter(it, "food")
          && !matchesFilter(it, "materials");
      }
      default: return true;
    }
  }

  function renderFilters(save){
    if (!bankFilterList) return;
    const bank = Array.isArray(save.bank) ? save.bank : [];
    const counts = Object.fromEntries(FILTERS.map(f => [f.id, 0]));
    for (const it of bank) {
      if (!it) continue;
      for (const f of FILTERS) {
        if (matchesFilter(it, f.id)) counts[f.id] += Math.max(1, num(it.quantity ?? it.qty, 1));
      }
    }

    bankFilterList.innerHTML = "";
    FILTERS.forEach((filter) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `${filter.label} (${counts[filter.id] || 0})`;
      btn.style.width = "100%";
      btn.style.height = "34px";
      btn.style.minHeight = "34px";
      btn.style.padding = "6px 8px";
      btn.style.fontSize = "11px";
      btn.style.lineHeight = "1";
      btn.style.justifyContent = "space-between";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      if (activeFilter === filter.id) {
        btn.style.borderColor = "#c79b44";
        btn.style.background = "linear-gradient(180deg, rgba(255,245,210,.16), rgba(255,255,255,.04) 36%, rgba(0,0,0,.10) 100%), linear-gradient(180deg, #6f5320 0%, #3e2d11 100%)";
      }
      btn.addEventListener("click", () => {
        activeFilter = filter.id;
        selectedIndex = null;
        renderBank();
      });
      bankFilterList.appendChild(btn);
    });
  }

  function renderBankInspector(){
    if (!bankPreview) return;
    const save = ensureSave(loadSave());
    const item = Number.isFinite(selectedIndex) ? save.bank[selectedIndex] : null;

    if (!item) {
      bankPreview.innerHTML = `<div style="opacity:.6;font-size:12px;text-align:center;">Select an item</div>`;
      return;
    }

    const q = Math.max(1, num(item.quantity ?? item.qty, 1));
    const imgBg = getBgForItem(item);
    const border = getBorderForItem(item);
    bankPreview.innerHTML = `
      <div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
        <img src="${item.img || ""}" alt="${item.name || "Item"}" style="width:92px;height:92px;border-radius:12px;border:2px solid ${border};background:${imgBg};object-fit:cover;">
        <div style="font-weight:800;font-size:13px;line-height:1.2;">${item.name || "Item"}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:nowrap;width:100%;max-width:160px;">
          <button id="bankWithdrawBtn" type="button" style="min-width:96px;padding:8px 10px;font-size:12px;">Withdraw</button>
          <input id="bankWithdrawQty" type="number" min="1" max="${q}" value="${q}" style="width:52px;min-width:52px;padding:7px 6px;border-radius:10px;border:2px solid #333;background:#0f0f16;color:#fff;outline:none;text-align:center;">
        </div>
        <div id="bankMsg" style="margin-top:4px;text-align:center;opacity:.9;font-size:12px;"></div>
      </div>
    `;

    const msgEl = document.getElementById("bankMsg");
    const setMsg = (t) => { if (msgEl) msgEl.textContent = t || ""; };
    const qtyInput = document.getElementById("bankWithdrawQty");
    const btn = document.getElementById("bankWithdrawBtn");
    const getQty = () => {
      let v = Math.floor(Number(qtyInput?.value));
      if (!Number.isFinite(v)) v = q;
      v = clamp(v, 1, q);
      if (qtyInput) qtyInput.value = String(v);
      return v;
    };
    btn?.addEventListener("click", () => {
      withdrawSelected(getQty(), setMsg);
    });
  }

  function withdrawSelected(qty, setMsg){
    const save = ensureSave(loadSave());
    const item = Number.isFinite(selectedIndex) ? save.bank[selectedIndex] : null;
    if (!item) {
      setMsg?.("Item missing.");
      renderBank();
      return;
    }

    const takeQty = clamp(qty, 1, Math.max(1, num(item.quantity ?? item.qty, 1)));
    if (!hasInventorySpace(save, takeQty)) {
      setMsg?.("Not enough inventory space.");
      return;
    }

    const picked = removeFromBankIndex(save, selectedIndex, takeQty);
    if (!picked) {
      setMsg?.("Item missing.");
      renderBank();
      return;
    }

    addToStack(save.inventory, picked, takeQty);
    setSave(save);

    selectedIndex = null;
    setMsg?.(`Withdrew x${takeQty}.`);
    renderBank();
  }

  function renderBank(){
    if (!bankGrid) return;
    const save = ensureSave(loadSave());
    const bank = Array.isArray(save.bank) ? save.bank : [];
    renderFilters(save);

    bankGrid.innerHTML = "";
    const visibleBank = bank
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => it && matchesFilter(it, activeFilter));
    if (bankEmpty) {
      bankEmpty.style.display = visibleBank.length ? "none" : "";
      bankEmpty.textContent = bank.length
        ? "No items in this category."
        : "Your bank is empty.";
    }

    visibleBank.forEach(({ it, idx }) => {
      const q = Math.max(1, num(it.quantity ?? it.qty, 1));
      const slot = document.createElement("div");
      slot.className = "dsSlot";
      if (it.setId) {
        slot.classList.add("dsSetItem");
      } else if (it.crafted) {
        slot.classList.add("dsCraftedItem");
      } else {
        const rarityKey = String(it.rarity || "").toLowerCase();
        if (rarityKey) slot.classList.add("dsRarity-" + rarityKey);
      }
      slot.style.cursor = "pointer";
      if (selectedIndex === idx) {
        slot.style.boxShadow = "0 0 0 2px #d7b06a inset, 0 0 0 1px rgba(255,214,122,.35)";
        slot.style.outline = "2px solid #d7b06a";
        slot.style.outlineOffset = "1px";
      } else {
        slot.style.boxShadow = "";
        slot.style.outline = "";
        slot.style.outlineOffset = "";
      }
      slot.title = `${it.name || "Item"}${q > 1 ? ` - x${q}` : ""}`;

      if (it.img) {
        const img = document.createElement("img");
        img.src = it.img;
        img.alt = it.name || "Item";
        slot.appendChild(img);
      }

      const upg = num(it.upg, 0);
      if (upg > 0) {
        const b = document.createElement("div");
        b.className = "dsUpg";
        b.textContent = `+${upg}`;
        slot.appendChild(b);
      }

      if (q > 1) {
        const qty = document.createElement("div");
        qty.className = "dsQty";
        qty.textContent = String(q);
        slot.appendChild(qty);
      }

      slot.addEventListener("click", () => {
        selectedIndex = idx;
        renderBank();
      });
      bankGrid.appendChild(slot);
    });

    const BANK_COLS = 6;
    const BANK_MIN_SLOTS = 50;
    const totalSlots = Math.max(BANK_MIN_SLOTS, Math.ceil(visibleBank.length / BANK_COLS) * BANK_COLS);
    const placeholders = Math.max(0, totalSlots - visibleBank.length);
    for (let i = 0; i < placeholders; i++) {
      const empty = document.createElement("div");
      empty.className = "dsSlot";
      empty.style.cursor = "default";
      empty.style.background = "#0d1016";
      empty.style.border = "1px solid #262a35";
      empty.style.opacity = "0.55";
      bankGrid.appendChild(empty);
    }

    renderBankInspector();
  }

  window.addEventListener("DOMContentLoaded", renderBank);
  window.addEventListener("ds:save", renderBank);
})();
