(() => {
  const PROFESSIONS_TEMPLATE = `
    <h1 style="margin-bottom:6px;">Professions</h1>
    <div style="opacity:.85;margin-bottom:14px;">
      Choose a profession to continue.
    </div>

    <div id="homeHub">
      <button class="hubNav" id="goMine">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#9935;&#65039;</span>
        </span>
        <span class="hubLabel">Mining</span>
      </button>

      <button class="hubNav" id="goForge">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#9874;&#65039;</span>
        </span>
        <span class="hubLabel">Forge</span>
      </button>

      <button class="hubNav" id="goWoodcut">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#129717;</span>
        </span>
        <span class="hubLabel">Woodcutting</span>
      </button>

      <button class="hubNav" id="goCarp">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#129717;</span>
        </span>
        <span class="hubLabel">Carpentry</span>
      </button>

      <button class="hubNav" id="goHunt">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#127993;</span>
        </span>
        <span class="hubLabel">Hunting</span>
      </button>

      <button class="hubNav" id="goFish">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#127907;</span>
        </span>
        <span class="hubLabel">Fishing</span>
      </button>

      <button class="hubNav" id="goCook">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#127859;</span>
        </span>
        <span class="hubLabel">Cooking</span>
      </button>

      <button class="hubNav" id="goEnchant">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#10024;</span>
        </span>
        <span class="hubLabel">Enchanting</span>
      </button>

      <button class="hubNav" id="goHerb">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#127807;</span>
        </span>
        <span class="hubLabel">Herbalism</span>
      </button>

      <button class="hubNav" id="goAlchemy">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#9879;&#65039;</span>
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
    if (!el("goMine")) return false;
    document.title = "Darkstone Chronicles - Professions";
    bindProfessionsNav(document);
    return true;
  }

  window.DSProfessions = {
    mount: mountProfessions
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneProfessions();
  });
})();
