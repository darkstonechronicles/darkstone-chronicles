(() => {
  const PACKS = [
    { id: "ds_30", amount: 30, priceLabel: "EUR 4.00", valueLabel: "Starter Pack", accent: "rgba(160,120,64,.88)" },
    { id: "ds_80", amount: 80, priceLabel: "EUR 8.00", valueLabel: "Popular Pack", accent: "rgba(50,168,132,.92)" },
    { id: "ds_180", amount: 180, priceLabel: "EUR 16.00", valueLabel: "Hero Pack", accent: "rgba(195,140,58,.92)" },
    { id: "ds_400", amount: 400, priceLabel: "EUR 30.00", valueLabel: "Legend Pack", accent: "rgba(177,71,71,.92)" }
  ];

  function currentSave() {
    try {
      return JSON.parse(localStorage.getItem("darkstone_save_v1") || "{}") || {};
    } catch {
      return {};
    }
  }

  function renderStatus(message = "", tone = "neutral") {
    const statusEl = document.getElementById("shopStatus");
    if (!statusEl) return;
    const show = String(message || "").trim();
    statusEl.textContent = show;
    statusEl.style.display = show ? "block" : "none";
    statusEl.style.borderColor = tone === "error"
      ? "rgba(214,96,96,.55)"
      : tone === "success"
        ? "rgba(86,182,120,.55)"
        : "rgba(166,124,64,.34)";
    statusEl.style.color = tone === "error"
      ? "#ffd4d4"
      : tone === "success"
        ? "#d7ffe1"
        : "#f3ead6";
  }

  function shopShell(wallet, statusHtml = "") {
    return `
      <div style="max-width:980px;margin:0 auto;">
        <div style="padding:20px 22px;border-radius:22px;border:1px solid rgba(166,124,64,.42);background:linear-gradient(180deg,rgba(58,42,26,.42),rgba(20,16,18,.86));box-shadow:0 20px 44px rgba(0,0,0,.22);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="width:64px;height:64px;border-radius:18px;border:1px solid rgba(214,170,80,.8);background:linear-gradient(180deg,rgba(28,24,18,.96),rgba(10,9,12,.96));display:grid;place-items:center;box-shadow:0 12px 28px rgba(0,0,0,.26);">
                <img src="images/ui/darkstone_coin.webp" alt="" style="width:42px;height:42px;object-fit:contain;display:block;">
              </div>
              <div>
                <h1 style="margin:0 0 4px;">Darkstone Coin Shop</h1>
                <div style="color:#d9ccb0;opacity:.88;">Choose a pack to open secure checkout.</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:16px;border:1px solid rgba(166,124,64,.5);background:linear-gradient(180deg,rgba(42,34,23,.86),rgba(17,14,18,.92));color:#fff0cf;box-shadow:0 12px 24px rgba(0,0,0,.18);">
              <span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#d8c59c;">Balance</span>
              <img src="images/ui/darkstone_coin.webp" alt="" style="width:22px;height:22px;object-fit:contain;display:block;">
              <span style="font-size:24px;font-weight:900;">
                ${new Intl.NumberFormat("el-GR").format(Math.max(0, Number(wallet) || 0))}
              </span>
            </div>
          </div>
          <div id="shopStatus" style="display:none;margin-bottom:14px;padding:12px 14px;border-radius:14px;border:1px solid rgba(166,124,64,.34);background:rgba(11,12,18,.36);font-size:14px;font-weight:700;"></div>
          ${statusHtml}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
            ${PACKS.map(buildPackCard).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderShop(root, wallet, checkoutState = "") {
    const statusCard = checkoutState === "success"
      ? `
        <div style="margin-bottom:14px;padding:12px 14px;border-radius:14px;border:1px solid rgba(86,182,120,.55);background:rgba(18,47,29,.38);font-size:14px;font-weight:800;color:#d7ffe1;">
          Your purchase was completed successfully. Refreshing your Darkstone Coin balance...
        </div>
      `
      : "";
    root.innerHTML = shopShell(wallet, statusCard);
    bindButtons();
    if (checkoutState === "success") {
      renderStatus("Your purchase was completed successfully. Darkstone Coin balance is being synced...", "success");
    } else if (checkoutState === "cancel") {
      renderStatus("Checkout was canceled.", "neutral");
    } else {
      renderStatus("", "neutral");
    }
  }

  function buildPackCard(pack) {
    return `
      <div style="padding:16px 14px;border-radius:20px;border:1px solid rgba(166,124,64,.42);background:linear-gradient(180deg,rgba(58,42,26,.62),rgba(16,14,18,.94));box-shadow:0 18px 38px rgba(0,0,0,.22);text-align:center;">
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:30px;font-weight:900;line-height:1;color:#fff4dc;margin-bottom:8px;">
          <span>${pack.amount}</span>
          <img src="images/ui/darkstone_coin.webp" alt="" style="width:24px;height:24px;object-fit:contain;display:block;filter:drop-shadow(0 2px 6px rgba(0,0,0,.25));">
        </div>
        <div style="font-size:15px;font-weight:800;line-height:1.2;color:#d8cab0;white-space:nowrap;margin-bottom:10px;">
          Darkstone Coins
        </div>
        <div style="font-size:18px;font-weight:900;color:#f5d98c;margin-bottom:14px;">
          ${pack.priceLabel}
        </div>
        <button data-dark-stone-pack="${pack.id}" type="button" style="width:100%;height:48px;border-radius:14px;border:1px solid rgba(118,196,187,.62);background:linear-gradient(180deg,#4d8a87,#1d5358);color:#f3f8f6;font-size:18px;font-weight:900;cursor:pointer;box-shadow:0 10px 22px rgba(0,0,0,.2);">
          Buy
        </button>
      </div>
    `;
  }

  function bindButtons() {
    document.querySelectorAll("[data-dark-stone-pack]").forEach((btn) => {
      if (btn.dataset.dsBound === "1") return;
      btn.dataset.dsBound = "1";
      btn.addEventListener("click", async () => {
        const packageId = String(btn.dataset.darkStonePack || "").trim();
        if (!packageId) return;
        try {
          btn.disabled = true;
          renderStatus("Preparing secure checkout...", "neutral");
          const pageUrl = new URL(window.location.href);
          pageUrl.search = "";
          pageUrl.hash = "";
          const body = await window.DSAuth?.invokeCreateDarkStoneCheckout?.({
            packageId,
            successUrl: pageUrl.toString(),
            cancelUrl: pageUrl.toString()
          });
          const checkoutUrl = String(body?.checkoutUrl || "").trim();
          if (!checkoutUrl) throw new Error("Missing checkout url.");
          window.location.href = checkoutUrl;
        } catch (error) {
          console.error("[shop] checkout failed", error);
          renderStatus(String(error?.message || "Unable to open checkout right now."), "error");
          btn.disabled = false;
        }
      });
    });
  }

  function mount(root) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    const save = currentSave();
    const wallet = Math.max(0, Number(save.darkStones) || 0);
    const params = new URLSearchParams(window.location.search || "");
    const checkoutState = String(params.get("darkStoneCheckout") || "").trim().toLowerCase();
    renderShop(left, wallet, checkoutState);

    if (checkoutState === "success") {
      window.DSAuth?.refreshPremiumWallet?.()
        .then((result) => {
          const nextWallet = Math.max(0, Number(result?.darkStones || 0) || 0);
          renderShop(left, nextWallet, "");
          renderStatus(`Purchase completed successfully. Your balance is now ${new Intl.NumberFormat("el-GR").format(nextWallet)} Darkstone Coin.`, "success");
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("darkStoneCheckout");
          window.history.replaceState({}, "", cleanUrl.toString());
        })
        .catch((error) => {
          console.error("[shop] premium wallet refresh failed", error);
          renderStatus("Purchase completed, but the balance refresh failed. Try a page refresh.", "error");
        });
    }

    document.title = "Darkstone Chronicles - Shop";
    return true;
  }

  window.DSShop = { mount };
})();
