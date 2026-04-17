(() => {
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
