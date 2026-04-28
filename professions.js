(() => {
  function currentPage() {
    return String(window.location.pathname || "").split("/").pop().toLowerCase() || "index.html";
  }

  const PROFESSIONS_TEMPLATE = `
    <h1 style="margin-bottom:6px;">Professions</h1>
    <div style="opacity:.85;margin-bottom:14px;">
      Choose a profession to continue.
    </div>

    <div id="homeHub">
      <button class="hubNav" id="goMine" data-open-tab-href="mining.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/mining.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Mining</span>
      </button>

      <button class="hubNav" id="goForge" data-open-tab-href="forge.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/forge.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Forge</span>
      </button>

      <button class="hubNav" id="goWoodcut" data-open-tab-href="woodcutting.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/woodcutting.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Woodcutting</span>
      </button>

      <button class="hubNav" id="goCarp" data-open-tab-href="carpentry.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/carpentry.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Carpentry</span>
      </button>

      <button class="hubNav" id="goHunt" data-open-tab-href="hunting.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/hunting.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Hunting</span>
      </button>

      <button class="hubNav" id="goFish" data-open-tab-href="fishing.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/fishing.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Fishing</span>
      </button>

      <button class="hubNav" id="goCook" data-open-tab-href="cooking.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/cooking.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Cooking</span>
      </button>

      <button class="hubNav" id="goEnchant" data-open-tab-href="enchanting.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/enchanting.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Enchanting</span>
      </button>

      <button class="hubNav" id="goJewelcraft" data-open-tab-href="jewelcrafting.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/jewelcrafting.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Jewelcrafting</span>
      </button>

      <button class="hubNav" id="goHerb" data-open-tab-href="herbalism.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/herbalism.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Herbalism</span>
      </button>

      <button class="hubNav" id="goAlchemy" data-open-tab-href="alchemy.html">
        <span class="hubIconFrame">
          <img class="hubIconImg" src="images/ui/alchemy.webp" alt="" aria-hidden="true">
        </span>
        <span class="hubLabel">Alchemy</span>
      </button>
    </div>
  `;

  const el = (id, scope = document) => scope.getElementById(id);

  function navigateProfessionTarget(href) {
    if (window.DSUI?.navigateWithinShell?.(href)) return;
    window.location.href = href;
  }

  function bindProfessionsNav(scope = document) {
    const bindings = [
      ["goMine", "mining.html"],
      ["goForge", "forge.html"],
      ["goWoodcut", "woodcutting.html"],
      ["goCarp", "carpentry.html"],
      ["goHunt", "hunting.html"],
      ["goFish", "fishing.html"],
      ["goCook", "cooking.html"],
      ["goEnchant", "enchanting.html"],
      ["goJewelcraft", "jewelcrafting.html"],
      ["goHerb", "herbalism.html"],
      ["goAlchemy", "alchemy.html"]
    ];

    bindings.forEach(([id, href]) => {
      const btn = el(id, scope);
      if (!btn || btn.dataset.dsProfBound === "1") return;
      btn.dataset.dsProfBound = "1";
      btn.addEventListener("click", () => navigateProfessionTarget(href));
    });
  }

  function mountProfessions(root = null) {
    const left = root || el("leftPanel");
    if (!left) return false;
    left.innerHTML = PROFESSIONS_TEMPLATE;
    document.title = "Darkstone Chronicles - Professions";
    bindProfessionsNav(document);
    return true;
  }

  function initStandaloneProfessions() {
    if (currentPage() !== "professions.html") return false;
    return mountProfessions();
  }

  window.DSProfessions = {
    mount: mountProfessions
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneProfessions();
  });
})();
