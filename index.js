(() => {
  const HOME_TEMPLATE = `
    <div id="homeHub">
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goFight" type="button" aria-label="Fighting Fields">
          <span class="hubIconArt hubIconArtFight" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goProfessions" type="button" aria-label="Professions">
          <span class="hubIconArt hubIconArtProfessions" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goOverview" type="button" aria-label="Overview">
          <span class="hubIconArt hubIconArtOverview" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goDungeons" type="button" aria-label="Dungeons">
          <span class="hubIconArt hubIconArtDungeons" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goBuildings" type="button" aria-label="Buildings">
          <span class="hubIconArt hubIconArtBuildings" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goChallenges" type="button" aria-label="Challenges">
          <span class="hubIconArt hubIconArtChallenges" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goEquip" type="button" aria-label="Equipment">
          <span class="hubIconArt hubIconArtEquipment" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goMarket" type="button" aria-label="Market">
          <span class="hubIconArt hubIconArtMarket" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goBank" type="button" aria-label="Bank">
          <span class="hubIconArt hubIconArtBank" aria-hidden="true"></span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goStats" type="button" aria-label="My Stats">
          <span class="hubIconArt hubIconArtStats" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;

  const el = (id, scope = document) => scope.getElementById(id);

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
    if (!el("homeHub")) return false;
    document.title = "Darkstone Chronicles";
    bindHomeNav(document);
    return true;
  }

  window.DSHome = {
    mount: mountHome
  };

  window.addEventListener("DOMContentLoaded", () => {
    initExistingHome();
  });
})();
