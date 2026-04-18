(() => {
  function currentPage() {
    return String(window.location.pathname || "").split("/").pop().toLowerCase() || "index.html";
  }

  const HOME_TEMPLATE = `
    <div id="homeHub">
      <div class="hubNav">
        <button class="hubNavBtn" id="goFight" type="button" aria-label="Fighting Fields" data-open-tab-href="fight.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/fight.png" alt=""></span>
        </button>
        <div class="hubLabel">Fighting Fields</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goProfessions" type="button" aria-label="Professions" data-open-tab-href="professions.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/professions.png" alt=""></span>
        </button>
        <div class="hubLabel">Professions</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goOverview" type="button" aria-label="Overview" data-open-tab-href="professions_overview.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/overview.png" alt=""></span>
        </button>
        <div class="hubLabel">Overview</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goDungeons" type="button" aria-label="Dungeons" data-open-tab-href="dungeons.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/dungeons.png" alt=""></span>
        </button>
        <div class="hubLabel">Dungeons</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goBuildings" type="button" aria-label="Buildings" data-open-tab-href="buildings.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/buildings.png" alt=""></span>
        </button>
        <div class="hubLabel">Buildings</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goChallenges" type="button" aria-label="Challenges" data-open-tab-href="challenges.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/challenges.png" alt=""></span>
        </button>
        <div class="hubLabel">Challenges</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goEquip" type="button" aria-label="Equipment" data-open-tab-href="equipment.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg hubIconImgEquip" src="images/ui/equipment.png" alt=""></span>
        </button>
        <div class="hubLabel">Equipment</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goMarket" type="button" aria-label="Market" data-open-tab-href="market.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/market.png" alt=""></span>
        </button>
        <div class="hubLabel">Market</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goBank" type="button" aria-label="Bank" data-open-tab-href="bank.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/bank.png" alt=""></span>
        </button>
        <div class="hubLabel">Bank</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goStats" type="button" aria-label="My Stats" data-open-tab-href="stats.html">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/stats.png" alt=""></span>
        </button>
        <div class="hubLabel">My Stats</div>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goSendItem" type="button" aria-label="Send Item">
          <span class="hubIconFrame" aria-hidden="true"><img class="hubIconImg" src="images/ui/party.png" alt=""></span>
        </button>
        <div class="hubLabel">Send Item</div>
      </div>
    </div>
  `;

  const el = (id, scope = document) => scope.getElementById(id);
  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

  function loadSave() {
    try { return JSON.parse(localStorage.getItem("darkstone_save_v1") || "{}") || {}; }
    catch { return {}; }
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isGearItem(item) {
    return (item?.type === "gear") || Boolean(item?.slot);
  }

  function getSendableInventoryEntries() {
    const save = loadSave();
    const inventory = Array.isArray(save.inventory) ? save.inventory : [];
    return inventory
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item && Math.max(1, num(item.quantity ?? item.qty, 1)) > 0);
  }

  function ensureSendItemModal() {
    let modal = document.getElementById("dsSendItemModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "dsSendItemModal";
    modal.__sendState = {
      open: false,
      selectedIndex: -1,
      sending: false,
      recipientName: "",
      status: "",
      error: false
    };
    modal.style.cssText = [
      "display:none",
      "position:fixed",
      "inset:0",
      "z-index:360",
      "background:rgba(5,7,12,.72)",
      "backdrop-filter:blur(8px)",
      "padding:16px",
      "align-items:center",
      "justify-content:center"
    ].join(";");

    modal.innerHTML = `
      <div id="dsSendItemCard" style="width:min(980px, calc(100vw - 24px));max-height:min(86vh, 860px);overflow:auto;border-radius:16px;border:1px solid rgba(166,124,64,.72);background:linear-gradient(180deg, rgba(34,26,20,.98), rgba(15,12,14,.98));box-shadow:0 24px 60px rgba(0,0,0,.42);padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
          <div>
            <div style="font-size:12px;font-weight:800;opacity:.72;letter-spacing:.4px;">TEMPORARY FEATURE</div>
            <div style="font-size:22px;font-weight:900;color:#f3ead6;">Send Item</div>
          </div>
          <button id="dsSendItemClose" type="button" style="min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(166,124,64,.82);background:linear-gradient(180deg,#4e3a22,#2b2015);color:#fff3d7;font-weight:800;cursor:pointer;">Close</button>
        </div>

        <div id="dsSendItemStatus" style="margin-bottom:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:13px;color:#eef2ff;">Choose a player and an item from your inventory.</div>

        <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:14px;">
          <div style="min-width:0;">
            <div style="font-size:15px;font-weight:900;color:#f3ead6;margin-bottom:8px;">Your Inventory</div>
            <div id="dsSendItemList" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;"></div>
          </div>

          <div style="min-width:0;display:grid;gap:12px;align-content:start;">
            <div style="padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);display:grid;gap:10px;">
              <label style="display:grid;gap:6px;">
                <span style="font-size:12px;font-weight:800;opacity:.86;">Recipient Nickname</span>
                <input id="dsSendItemRecipient" type="text" placeholder="Type exact nickname" style="height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 12px;">
              </label>
              <label style="display:grid;gap:6px;">
                <span style="font-size:12px;font-weight:800;opacity:.86;">Quantity</span>
                <input id="dsSendItemQty" type="number" min="1" step="1" value="1" style="height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#10131d;color:#eef2ff;padding:0 12px;">
              </label>
              <div id="dsSendItemSelected" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:13px;color:#d9ccb0;">No item selected.</div>
              <button id="dsSendItemConfirm" type="button" style="height:42px;border-radius:12px;border:1px solid rgba(166,124,64,.86);background:linear-gradient(180deg,#6c4a24,#3b2814);color:#fff2d6;font-size:14px;font-weight:900;cursor:pointer;">Send Item</button>
              <div style="font-size:12px;opacity:.76;line-height:1.4;">If the other player does not have enough inventory space, the transfer will be blocked.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      modal.__sendState.open = false;
      modal.style.display = "none";
    };

    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    modal.querySelector("#dsSendItemClose")?.addEventListener("click", close);

    modal.querySelector("#dsSendItemRecipient")?.addEventListener("input", (e) => {
      modal.__sendState.recipientName = String(e.target.value || "");
    });

    modal.querySelector("#dsSendItemQty")?.addEventListener("input", () => {
      renderSendItemModal();
    });

    modal.querySelector("#dsSendItemList")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-send-item-index]");
      if (!btn) return;
      modal.__sendState.selectedIndex = Math.max(0, Math.floor(Number(btn.dataset.sendItemIndex) || 0));
      renderSendItemModal();
    });

    modal.querySelector("#dsSendItemConfirm")?.addEventListener("click", async () => {
      const state = modal.__sendState || {};
      if (state.sending) return;

      const entries = getSendableInventoryEntries();
      const selected = entries.find((entry) => entry.index === state.selectedIndex) || null;
      if (!selected?.item) {
        state.status = "Choose an item first.";
        state.error = true;
        renderSendItemModal();
        return;
      }

      const recipientInput = modal.querySelector("#dsSendItemRecipient");
      const qtyInput = modal.querySelector("#dsSendItemQty");
      const recipientName = String(recipientInput?.value || state.recipientName || "").trim();
      const maxQty = isGearItem(selected.item) ? 1 : Math.max(1, num(selected.item.quantity ?? selected.item.qty, 1));
      let quantity = Math.floor(Number(qtyInput?.value));
      if (!Number.isFinite(quantity)) quantity = 1;
      quantity = Math.max(1, Math.min(maxQty, quantity));
      if (qtyInput) qtyInput.value = String(quantity);

      if (!recipientName) {
        state.status = "Write the other player's nickname.";
        state.error = true;
        renderSendItemModal();
        return;
      }

      try {
        state.sending = true;
        state.status = "Sending item...";
        state.error = false;
        renderSendItemModal();
        const result = await window.DSAuth?.invokeSendItem?.({
          recipientName,
          item: selected.item,
          quantity
        });
        const sentName = String(result?.sentItem?.name || selected.item.name || "Item");
        state.status = `Sent ${quantity}x ${sentName} to ${recipientName}.`;
        state.error = false;
        state.selectedIndex = -1;
        renderSendItemModal();
      } catch (error) {
        state.status = error?.message || "Failed to send item.";
        state.error = true;
        renderSendItemModal();
      } finally {
        state.sending = false;
        renderSendItemModal();
      }
    });

    document.body.appendChild(modal);
    return modal;
  }

  function renderSendItemModal() {
    const modal = ensureSendItemModal();
    const state = modal.__sendState || {};
    const entries = getSendableInventoryEntries();
    const selected = entries.find((entry) => entry.index === state.selectedIndex) || null;
    const recipientInput = modal.querySelector("#dsSendItemRecipient");
    const qtyInput = modal.querySelector("#dsSendItemQty");
    const statusEl = modal.querySelector("#dsSendItemStatus");
    const listEl = modal.querySelector("#dsSendItemList");
    const selectedEl = modal.querySelector("#dsSendItemSelected");
    const confirmBtn = modal.querySelector("#dsSendItemConfirm");

    if (recipientInput && recipientInput.value !== String(state.recipientName || "")) {
      recipientInput.value = String(state.recipientName || "");
    }

    if (statusEl) {
      statusEl.textContent = state.status || "Choose a player and an item from your inventory.";
      statusEl.style.color = state.error ? "#ffd8de" : "#eef2ff";
      statusEl.style.borderColor = state.error ? "rgba(179,72,92,.4)" : "rgba(255,255,255,.08)";
      statusEl.style.background = state.error ? "rgba(78,22,34,.4)" : "rgba(255,255,255,.03)";
    }

    if (listEl) {
      listEl.innerHTML = entries.length
        ? entries.map(({ item, index }) => {
            const qty = Math.max(1, num(item.quantity ?? item.qty, 1));
            const active = selected?.index === index;
            return `
              <button type="button" data-send-item-index="${index}" style="display:flex;align-items:center;gap:10px;min-width:0;padding:10px;border-radius:12px;border:1px solid ${active ? "rgba(199,155,68,.98)" : "rgba(255,255,255,.08)"};background:${active ? "linear-gradient(180deg, rgba(111,83,32,.58), rgba(48,34,18,.92))" : "rgba(255,255,255,.03)"};color:#f3ead6;cursor:pointer;text-align:left;">
                <span style="width:44px;height:44px;flex:0 0 auto;border-radius:10px;border:1px solid rgba(166,124,64,.6);background:#0f1219;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  ${item.img ? `<img src="${esc(item.img)}" alt="${esc(item.name || "Item")}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:11px;font-weight:900;">IT</span>`}
                </span>
                <span style="min-width:0;display:flex;flex-direction:column;gap:3px;">
                  <span style="font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.name || "Item")}</span>
                  <span style="font-size:11px;opacity:.78;">${esc(item.type || "item")}${item.slot ? ` • ${esc(item.slot)}` : ""}${qty > 1 ? ` • x${qty}` : ""}</span>
                </span>
              </button>
            `;
          }).join("")
        : `<div style="padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);opacity:.82;">Your inventory is empty.</div>`;
    }

    if (selectedEl) {
      if (!selected?.item) {
        selectedEl.textContent = "No item selected.";
      } else {
        const qty = Math.max(1, num(selected.item.quantity ?? selected.item.qty, 1));
        selectedEl.textContent = `${selected.item.name || "Item"}${selected.item.slot ? ` (${selected.item.slot})` : ""} • Available: ${qty}`;
      }
    }

    const maxQty = selected?.item
      ? (isGearItem(selected.item) ? 1 : Math.max(1, num(selected.item.quantity ?? selected.item.qty, 1)))
      : 1;
    if (qtyInput) {
      let qty = Math.floor(Number(qtyInput.value));
      if (!Number.isFinite(qty)) qty = 1;
      qty = Math.max(1, Math.min(maxQty, qty));
      qtyInput.value = String(qty);
      qtyInput.max = String(maxQty);
      qtyInput.disabled = !selected?.item || maxQty <= 1 || state.sending;
    }

    if (confirmBtn) {
      const qty = qtyInput ? Math.max(1, Math.floor(Number(qtyInput.value) || 1)) : 1;
      confirmBtn.disabled = !selected?.item || state.sending || !entries.length;
      confirmBtn.textContent = state.sending ? "Sending..." : `Send${selected?.item ? ` ${qty}x ${selected.item.name || "Item"}` : " Item"}`;
      confirmBtn.style.opacity = confirmBtn.disabled ? ".7" : "1";
      confirmBtn.style.cursor = confirmBtn.disabled ? "default" : "pointer";
    }
  }

  function openSendItemModal() {
    const modal = ensureSendItemModal();
    modal.__sendState.open = true;
    modal.style.display = "flex";
    renderSendItemModal();
  }

  function navigateHomeTarget(href) {
    if (window.DSUI?.navigateWithinShell?.(href)) return;
    window.location.href = href;
  }

  function bindHomeNav(scope = document) {
    const bindings = [
      ["goFight", "fight.html"],
      ["goProfessions", "professions.html"],
      ["goOverview", "professions_overview.html"],
      ["goDungeons", "dungeons.html"],
      ["goBuildings", "buildings.html"],
      ["goChallenges", "challenges.html"],
      ["goEquip", "equipment.html"],
      ["goMarket", "market.html"],
      ["goBank", "bank.html"],
      ["goStats", "stats.html"]
    ];

    bindings.forEach(([id, href]) => {
      const btn = el(id, scope);
      if (!btn || btn.dataset.dsHomeBound === "1") return;
      btn.dataset.dsHomeBound = "1";
      btn.addEventListener("click", () => navigateHomeTarget(href));
    });

    const sendBtn = el("goSendItem", scope);
    if (sendBtn && sendBtn.dataset.dsHomeBound !== "1") {
      sendBtn.dataset.dsHomeBound = "1";
      sendBtn.addEventListener("click", () => openSendItemModal());
    }
  }

  function mountHome(root = null) {
    const left = root || el("leftPanel");
    if (!left) return false;
    left.innerHTML = HOME_TEMPLATE;
    document.title = "Darkstone Chronicles";
    bindHomeNav(document);
    return true;
  }

  function initExistingHome() {
    if (currentPage() !== "index.html") return false;
    if (!el("homeHub")) return false;
    return mountHome();
  }

  window.DSHome = {
    mount: mountHome,
    openSendItemModal
  };

  window.addEventListener("DOMContentLoaded", () => {
    initExistingHome();
  });
})();
