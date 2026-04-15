(() => {
  const HOME_TEMPLATE = `
    <div id="homeHub">
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goFight" type="button" aria-label="Fighting Fields" data-open-tab-href="fight.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtFight"></span>
            <span class="hubIconArtLabel">FIGHT</span>
          </span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goProfessions" type="button" aria-label="Professions" data-open-tab-href="professions.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtProfessions"></span>
            <span class="hubIconArtLabel">PROFESSIONS</span>
          </span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goOverview" type="button" aria-label="Overview" data-open-tab-href="professions_overview.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtOverview"></span>
            <span class="hubIconArtLabel">OVERVIEW</span>
          </span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goDungeons" type="button" aria-label="Dungeons" data-open-tab-href="dungeons.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtDungeons"></span>
            <span class="hubIconArtLabel">DUNGEONS</span>
          </span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goBuildings" type="button" aria-label="Buildings" data-open-tab-href="buildings.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtBuildings"></span>
            <span class="hubIconArtLabel">BUILDINGS</span>
          </span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goChallenges" type="button" aria-label="Challenges" data-open-tab-href="challenges.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtChallenges"></span>
            <span class="hubIconArtLabel">CHALLENGES</span>
          </span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goEquip" type="button" aria-label="Equipment" data-open-tab-href="equipment.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtEquipment"></span>
            <span class="hubIconArtLabel">EQUIPMENT</span>
          </span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goMarket" type="button" aria-label="Market" data-open-tab-href="market.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtMarket"></span>
            <span class="hubIconArtLabel">MARKET</span>
          </span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goBank" type="button" aria-label="Bank" data-open-tab-href="bank.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtBank"></span>
            <span class="hubIconArtLabel">BANK</span>
          </span>
        </button>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn hubNavBtnImage" id="goStats" type="button" aria-label="My Stats" data-open-tab-href="stats.html">
          <span class="hubIconArt hubIconArtFrameWrap" aria-hidden="true">
            <span class="hubIconArtFrame"></span>
            <span class="hubIconArtOverlay hubIconArtStats"></span>
            <span class="hubIconArtLabel">MY STATS</span>
          </span>
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
