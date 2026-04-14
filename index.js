(() => {
  const LOG_KEY = "ds_home_log_v1";
  const LOG_MAX = 10;

  const HOME_TEMPLATE = `
    <div id="homeHub">
      <div class="hubNav">
        <button class="hubNavBtn" id="goFight" type="button" aria-label="Fighting Fields">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#9876;&#65039;</span></span>
        </button>
        <span class="hubLabel">Fighting Fields</span>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goProfessions" type="button" aria-label="Professions">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#9874;&#65039;</span></span>
        </button>
        <span class="hubLabel">Professions</span>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goOverview" type="button" aria-label="Overview">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#128214;</span></span>
        </button>
        <span class="hubLabel">Overview</span>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goDungeons" type="button" aria-label="Dungeons">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#127984;</span></span>
        </button>
        <span class="hubLabel">Dungeons</span>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goBuildings" type="button" aria-label="Buildings">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#127970;</span></span>
        </button>
        <span class="hubLabel">Buildings</span>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goChallenges" type="button" aria-label="Challenges">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#127919;</span></span>
        </button>
        <span class="hubLabel">Challenges</span>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goEquip" type="button" aria-label="Equipment">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#128737;&#65039;</span></span>
        </button>
        <span class="hubLabel">Equipment</span>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goMarket" type="button" aria-label="Market">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#128176;</span></span>
        </button>
        <span class="hubLabel">Market</span>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goBank" type="button" aria-label="Bank">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#127974;</span></span>
        </button>
        <span class="hubLabel">Bank</span>
      </div>
      <div class="hubNav">
        <button class="hubNavBtn" id="goStats" type="button" aria-label="My Stats">
          <span class="hubIconFrame"><span class="hubEmoji" aria-hidden="true">&#128202;</span></span>
        </button>
        <span class="hubLabel">My Stats</span>
      </div>
    </div>

    <h2 style="margin:18px 0 10px;">Town Log</h2>
    <div id="log"></div>
  `;

  const el = (id, scope = document) => scope.getElementById(id);

  function loadLog() {
    try {
      const arr = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveLog(arr) {
    localStorage.setItem(LOG_KEY, JSON.stringify(arr.slice(0, LOG_MAX)));
  }

  function pushLog(text) {
    const arr = loadLog();
    arr.unshift({ t: Date.now(), text });
    saveLog(arr);
    renderLog();
  }

  function renderLog() {
    const logEl = el("log");
    if (!logEl) return;

    const arr = loadLog();
    logEl.innerHTML = "";

    if (arr.length === 0) {
      const empty = document.createElement("div");
      empty.className = "log-item";
      empty.textContent = "No recent events.";
      logEl.appendChild(empty);
      return;
    }

    for (const it of arr) {
      const d = document.createElement("div");
      d.className = "log-item";
      d.textContent = it.text;
      logEl.appendChild(d);
    }
  }

  function navigateHomeTarget(href, logText) {
    if (logText) pushLog(logText);
    if (window.DSUI?.navigateWithinShell?.(href)) return;
    window.location.href = href;
  }

  function bindHomeNav(scope = document) {
    const bindings = [
      ["goFight", "fight.html", "Traveled to the Fight zone."],
      ["goProfessions", "professions.html", "Opened professions."],
      ["goOverview", "professions_overview.html", "Opened overview."],
      ["goDungeons", "dungeons.html", "Entered the Whispering Crypt."],
      ["goBuildings", "buildings.html", "Opened buildings."],
      ["goChallenges", "challenges.html", "Opened challenges."],
      ["goEquip", "equipment.html", "Opened equipment."],
      ["goMarket", "market.html", "Visited the market."],
      ["goBank", "bank.html", "Visited the bank."],
      ["goStats", "stats.html", "Opened stats."]
    ];

    bindings.forEach(([id, href, logText]) => {
      const btn = el(id, scope);
      if (!btn || btn.dataset.dsHomeBound === "1") return;
      btn.dataset.dsHomeBound = "1";
      btn.addEventListener("click", () => navigateHomeTarget(href, logText));
    });
  }

  function mountHome(root = null) {
    const left = root || el("leftPanel");
    if (!left) return false;
    left.innerHTML = HOME_TEMPLATE;
    document.title = "Darkstone Chronicles";
    bindHomeNav(document);
    renderLog();
    return true;
  }

  function initExistingHome() {
    if (!el("homeHub")) return false;
    document.title = "Darkstone Chronicles";
    bindHomeNav(document);
    renderLog();
    return true;
  }

  window.DSHome = {
    mount: mountHome,
    renderLog,
    pushLog
  };

  window.addEventListener("DOMContentLoaded", () => {
    initExistingHome();
  });
})();
