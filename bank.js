(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const BANK_TEMPLATE = `
    <h1>Bank</h1>

    <div class="bankShell" style="display:flex;justify-content:center;padding:12px 10px;border-radius:14px;border:1px solid var(--card-medieval-border);background:var(--card-medieval-bg);box-shadow:var(--card-medieval-shadow);max-width:900px;margin:0 auto 12px;">
      <div class="bankLayout" style="width:100%;max-width:700px;display:grid;grid-template-columns:120px max-content 1px 1fr;gap:14px;align-items:start;">
        <div id="bankFilterList" style="display:flex;flex-direction:column;gap:8px;"></div>
        <div id="bankGrid" style="display:grid;grid-template-columns:repeat(6,40px);gap:4px;justify-content:center;padding:4px;width:max-content;max-width:100%;"></div>
        <div class="bankDivider" style="width:1px;align-self:stretch;background:linear-gradient(180deg, rgba(199,155,68,.06), rgba(199,155,68,.42) 18%, rgba(199,155,68,.42) 82%, rgba(199,155,68,.06));"></div>
        <div id="bankPreview" style="min-height:220px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(122, 91, 49, .8);border-radius:12px;background:linear-gradient(180deg, rgba(52,39,27,.78), rgba(20,18,20,.86));box-shadow:0 0 0 1px rgba(32,23,14,.82),inset 0 1px 0 rgba(255,228,178,.06),inset 0 0 0 1px rgba(255,214,143,.04),inset 0 -10px 18px rgba(0,0,0,.14),0 10px 18px rgba(0,0,0,.16);padding:12px;"></div>
      </div>
      <div id="bankEmpty" style="display:none;opacity:.88;text-align:center;padding:18px 10px;color:#d9ccb0;">Your bank is empty.</div>
    </div>
  `;

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isSigilImage = (img) => /^images\/items\/sigils\//i.test(String(img || ""));
  const SIGIL_IMAGE_BY_KEY = {
    war_sigil: "images/items/sigils/war_sigil.webp",
    "war sigil": "images/items/sigils/war_sigil.webp",
    crypt_sigil: "images/items/sigils/crypt_sigil.webp",
    "crypt sigil": "images/items/sigils/crypt_sigil.webp",
    ore_sigil: "images/items/sigils/ore_sigil.webp",
    "ore sigil": "images/items/sigils/ore_sigil.webp",
    wood_sigil: "images/items/sigils/wood_sigil.webp",
    "wood sigil": "images/items/sigils/wood_sigil.webp",
    verdant_sigil: "images/items/sigils/verdant_sigil.webp",
    "verdant sigil": "images/items/sigils/verdant_sigil.webp",
    warden_sigil: "images/items/sigils/warden_sigil.webp",
    "warden sigil": "images/items/sigils/warden_sigil.webp",
  };

  function normalizeSigilImage(item) {
    if (!item || typeof item !== "object") return;
    const idKey = String(item.id || "").trim().toLowerCase();
    const nameKey = String(item.name || "").trim().toLowerCase();
    const img = SIGIL_IMAGE_BY_KEY[idKey] || SIGIL_IMAGE_BY_KEY[nameKey] || "";
    if (img) item.img = img;
  }

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
    save.inventory.forEach(normalizeSigilImage);
    save.bank.forEach(normalizeSigilImage);
    return save;
  }

  function itemStackKey(it){
    return [
      it.type || "",
      it.id || "",
      it.crafted ? "crafted" : "",
      it.name || "",
      it.baseName || "",
      it.setId || "",
      it.slot || "",
      it.reqLevel ?? 1,
      it.atk ?? 0,
      it.def ?? 0,
      it.attackBonus ?? 0,
      it.defenseBonus ?? 0,
      it.rarity || "",
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
      case "mythic": return "#5a0b12";
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
      case "mythic": return "#ff3b45";
      case "legendary": return "#d18a1f";
      case "epic": return "#7d4bc2";
      case "rare": return "#3d73c9";
      case "uncommon": return "#4c667f";
      case "common": return "#3a3a46";
      default: return "#333";
    }
  }

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
    const bankFilterList = document.getElementById("bankFilterList");
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
      btn.className = "townBtn";
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
      btn.style.fontWeight = "900";
      btn.style.color = "#f3ead6";
      if (activeFilter === filter.id) {
        btn.style.borderColor = "rgba(166, 124, 64, .98)";
        btn.style.background = "linear-gradient(180deg, rgba(84,60,30,.98) 0%, rgba(58,40,20,.98) 100%)";
        btn.style.color = "#fff1cf";
        btn.style.boxShadow = "0 0 0 1px rgba(60,40,16,.82), inset 0 1px 0 rgba(255,232,184,.12), inset 0 -10px 18px rgba(0,0,0,.22), 0 12px 20px rgba(0,0,0,.2)";
      }
      btn.addEventListener("click", () => {
        activeFilter = filter.id;
        selectedIndex = null;
        renderBank();
      });
      bankFilterList.appendChild(btn);
    });
  }

  function renderBankInspector(emptyMessage = ""){
    const bankPreview = document.getElementById("bankPreview");
    if (!bankPreview) return;
    const save = ensureSave(loadSave());
    const item = Number.isFinite(selectedIndex) ? save.bank[selectedIndex] : null;

    if (emptyMessage) {
      bankPreview.innerHTML = `<div style="opacity:.82;font-size:16px;line-height:1.35;text-align:center;color:#d9ccb0;max-width:220px;">${emptyMessage}</div>`;
      return;
    }

    if (!item) {
      bankPreview.innerHTML = `<div style="opacity:.72;font-size:12px;text-align:center;color:#d9ccb0;">Select an item</div>`;
      return;
    }

    const q = Math.max(1, num(item.quantity ?? item.qty, 1));
    const imgBg = getBgForItem(item);
    const border = getBorderForItem(item);
    bankPreview.innerHTML = `
      <div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
        <img src="${item.img || ""}" alt="${item.name || "Item"}" style="width:92px;height:92px;border-radius:12px;border:2px solid ${border};background:${imgBg};object-fit:${isSigilImage(item.img) ? "contain" : "cover"};padding:${isSigilImage(item.img) ? "6px" : "0"};box-sizing:border-box;">
        <div style="font-weight:800;font-size:13px;line-height:1.2;color:#f3ead6;text-shadow:0 1px 0 rgba(74,47,14,.95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">${item.name || "Item"}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:nowrap;width:100%;max-width:160px;">
          <button id="bankWithdrawBtn" class="townBtn" type="button" style="min-width:96px;padding:8px 10px;font-size:12px;">Withdraw</button>
          <input id="bankWithdrawQty" type="number" min="1" max="${q}" value="${q}" style="width:52px;min-width:52px;padding:7px 6px;border-radius:10px;border:1px solid rgba(126,94,50,.88);background:linear-gradient(180deg, rgba(46,35,23,.96) 0%, rgba(24,20,19,.98) 100%);color:#f3ead6;outline:none;text-align:center;box-shadow:0 0 0 1px rgba(28,20,12,.84), inset 0 1px 0 rgba(255,228,178,.08), inset 0 -10px 16px rgba(0,0,0,.14);">
        </div>
        <div id="bankMsg" style="margin-top:4px;text-align:center;opacity:.9;font-size:12px;color:#d9ccb0;"></div>
      </div>
    `;
    window.DSImage?.bindFallbacks?.(bankPreview);

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
    const bankGrid = document.getElementById("bankGrid");
    const bankEmpty = document.getElementById("bankEmpty");
    if (!bankGrid) return;
    const save = ensureSave(loadSave());
    const bank = Array.isArray(save.bank) ? save.bank : [];
    renderFilters(save);

    bankGrid.innerHTML = "";
    const visibleBank = bank
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => it && matchesFilter(it, activeFilter));
    if (bankEmpty) bankEmpty.style.display = "none";

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
        if (isSigilImage(it.img)) {
          img.style.objectFit = "contain";
          img.style.padding = "3px";
          img.style.boxSizing = "border-box";
          img.style.background = "rgba(0,0,0,.18)";
        }
        window.DSImage?.bindFallback?.(img);
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
    const BANK_MIN_ROWS = 2;
    const BANK_MIN_SLOTS = BANK_COLS * BANK_MIN_ROWS;
    const totalSlots = Math.max(BANK_MIN_SLOTS, Math.ceil(visibleBank.length / BANK_COLS) * BANK_COLS);
    const placeholders = Math.max(0, totalSlots - visibleBank.length);
    for (let i = 0; i < placeholders; i++) {
      const empty = document.createElement("div");
      empty.className = "dsSlot";
      empty.style.cursor = "default";
      empty.style.background = "linear-gradient(180deg, rgba(24,20,19,.92), rgba(14,15,20,.96))";
      empty.style.border = "1px solid rgba(72,56,34,.64)";
      empty.style.boxShadow = "0 0 0 1px rgba(28,20,12,.58), inset 0 1px 0 rgba(255,228,178,.03)";
      empty.style.opacity = "0.72";
      bankGrid.appendChild(empty);
    }

    renderBankInspector(!visibleBank.length
      ? (bank.length ? "No items in this category." : "Your bank is empty.")
      : ""
    );
  }

  function mountBank(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = BANK_TEMPLATE;
    document.title = "Darkstone Chronicles - Bank";
    renderBank();
    return true;
  }

  function initStandaloneBank() {
    if (!document.getElementById("bankGrid")) return false;
    document.title = "Darkstone Chronicles - Bank";
    renderBank();
    return true;
  }

  window.DSBank = {
    mount: mountBank
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneBank();
  });

  window.addEventListener("ds:save", renderBank);
})();
