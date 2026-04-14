(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const CANCEL_COST_GOLD = 100;
  const CHALLENGES_TEMPLATE = `
    <h1 style="margin-bottom:6px;">Challenges</h1>
    <div style="opacity:.85;margin-bottom:14px;font-style:italic;">
      Pick a challenge category and track your progress.
    </div>

    <div id="homeHub">
      <button class="hubNav" id="challengeTypeFight">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#9876;&#65039;</span>
        </span>
        <span class="hubLabel">Fighting</span>
      </button>
      <button class="hubNav" id="challengeTypeGathering">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#9935;&#65039;</span>
        </span>
        <span class="hubLabel">Gathering</span>
      </button>
      <button class="hubNav" id="challengeTypeArtisan">
        <span class="hubIconFrame">
          <span class="hubEmoji" aria-hidden="true">&#9874;&#65039;</span>
        </span>
        <span class="hubLabel">Artisan</span>
      </button>
    </div>

    <div id="challengeSubtypes" style="display:none;max-width:900px;margin:8px auto 0;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;"></div>
    <div id="challengeList" style="display:none;max-width:900px;margin:16px auto 0;"></div>
  `;

  const DEFAULT_THRESHOLDS = [
    { target: 5, points: 1 },
    { target: 180, points: 2 },
    { target: 450, points: 5 },
    { target: 850, points: 10 }
  ];

  const DUNGEON_THRESHOLDS = [
    { target: 5, points: 1 },
    { target: 9, points: 2 },
    { target: 20, points: 5 },
    { target: 35, points: 10 }
  ];

  const CHALLENGE_TYPES = {
    fight: {
      options: [
        { id: "fightsWon", name: "Fighting", icon: "&#9876;&#65039;", unit: "fights won", thresholds: DEFAULT_THRESHOLDS },
        { id: "dungeonsCompleted", name: "Dungeon Complete", icon: "&#127984;", unit: "dungeons completed", thresholds: DUNGEON_THRESHOLDS }
      ]
    },
    gathering: {
      options: [
        { id: "miningTicks", name: "Mining", icon: "&#9935;&#65039;", unit: "mining actions", thresholds: DEFAULT_THRESHOLDS },
        { id: "woodGatherTicks", name: "Wood Gather", icon: "&#129717;", unit: "wood gather actions", thresholds: DEFAULT_THRESHOLDS },
        { id: "fishingTicks", name: "Fishing", icon: "&#127907;", unit: "fishing actions", thresholds: DEFAULT_THRESHOLDS },
        { id: "huntingTicks", name: "Hunting", icon: "&#127993;", unit: "hunting actions", thresholds: DEFAULT_THRESHOLDS }
      ]
    },
    artisan: {
      options: [
        { id: "barsCrafted", name: "Smelt Bars", icon: "&#9874;&#65039;", unit: "bars smelted", thresholds: DEFAULT_THRESHOLDS },
        { id: "planksCrafted", name: "Make Planks", icon: "&#129717;", unit: "planks crafted", thresholds: DEFAULT_THRESHOLDS }
      ]
    }
  };

  let selectedType = null;
  let selectedOptionId = null;

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function setSave(next){
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  function num(v, f = 0){
    return Number.isFinite(Number(v)) ? Number(v) : f;
  }

  function fmt(v){
    return new Intl.NumberFormat("el-GR").format(num(v, 0));
  }

  function getStatsFromSave(save){
    const total = save?.stats?.total || {};
    return {
      fightsWon: num(total.fightsWon, 0),
      dungeonsCompleted: num(total.dungeonsCompleted, 0),
      miningTicks: num(total.miningTicks, 0),
      woodGatherTicks: num(total.woodGatherTicks, 0),
      fishingTicks: num(total.fishingTicks, 0),
      huntingTicks: num(total.huntingTicks, 0),
      barsCrafted: num(total.barsCrafted, 0),
      planksCrafted: num(total.planksCrafted, 0)
    };
  }

  function ensureChallenges(save){
    save = save && typeof save === "object" ? save : {};
    if (!save.challenges || typeof save.challenges !== "object") save.challenges = {};
    if (!Number.isFinite(Number(save.challenges.points))) save.challenges.points = 0;
    if (!save.challenges.claimCounts || typeof save.challenges.claimCounts !== "object") save.challenges.claimCounts = {};
    if (!save.challenges.active || typeof save.challenges.active !== "object") save.challenges.active = null;

    for (const type of Object.values(CHALLENGE_TYPES)){
      for (const option of type.options){
        if (!save.challenges.claimCounts[option.id] || typeof save.challenges.claimCounts[option.id] !== "object"){
          save.challenges.claimCounts[option.id] = {};
        }
        for (const row of option.thresholds){
          const key = String(row.target);
          if (!Number.isFinite(Number(save.challenges.claimCounts[option.id][key]))){
            save.challenges.claimCounts[option.id][key] = 0;
          }
        }
      }
    }

    return save;
  }

  function getChallengeOption(){
    const type = CHALLENGE_TYPES[selectedType];
    return type?.options?.find((x) => x.id === selectedOptionId) || null;
  }

  function getActiveProgress(save, optionId, target){
    const active = save?.challenges?.active;
    if (!active) return 0;
    if (active.optionId !== optionId || num(active.target, 0) !== num(target, 0)) return 0;

    const stats = getStatsFromSave(save);
    const currentStat = num(stats[optionId], 0);
    const startValue = num(active.startValue, 0);
    return Math.max(0, Math.min(num(target, 0), currentStat - startValue));
  }

  function isActiveChallenge(save, optionId, target){
    const active = save?.challenges?.active;
    return !!active && active.optionId === optionId && num(active.target, 0) === num(target, 0);
  }

  function startChallenge(target){
    const option = getChallengeOption();
    if (!option) return;

    const save = ensureChallenges(loadSave());
    if (save.challenges.active) return;

    const stats = getStatsFromSave(save);
    save.challenges.active = {
      optionId: option.id,
      target: num(target, 0),
      startValue: num(stats[option.id], 0)
    };
    setSave(save);
    renderChallengeList();
  }

  function claimChallenge(target){
    const option = getChallengeOption();
    if (!option) return;

    const save = ensureChallenges(loadSave());
    if (!isActiveChallenge(save, option.id, target)) return;

    const progress = getActiveProgress(save, option.id, target);
    if (progress < num(target, 0)) return;

    const row = option.thresholds.find((x) => x.target === target);
    if (!row) return;

    const key = String(target);
    save.challenges.claimCounts[option.id][key] = num(save.challenges.claimCounts[option.id][key], 0) + 1;
    save.challenges.points = num(save.challenges.points, 0) + row.points;
    save.challenges.active = null;
    setSave(save);
    window.dispatchEvent(new Event("ds:save"));
    renderChallengeList();
  }

  function cancelActiveChallenge(){
    const save = ensureChallenges(loadSave());
    if (!save.challenges.active) return;

    const gold = num(save.gold, 0);
    if (gold < CANCEL_COST_GOLD){
      return;
    }

    save.gold = gold - CANCEL_COST_GOLD;
    save.challenges.active = null;
    setSave(save);
    window.dispatchEvent(new Event("ds:save"));
    renderChallengeList();
  }

  function renderSubtypes(){
    const wrap = document.getElementById("challengeSubtypes");
    if (!wrap) return;

    if (!selectedType){
      wrap.style.display = "none";
      wrap.innerHTML = "";
      return;
    }

    const type = CHALLENGE_TYPES[selectedType];
    wrap.style.display = "grid";
    wrap.innerHTML = "";

    for (const option of type.options){
      const active = selectedOptionId === option.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "townBtn";
      btn.style.background = active ? "#2a2212" : "#101019";
      btn.style.borderColor = active ? "#e0b36a" : "#333";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.gap = "8px";
      btn.innerHTML = `<span style="font-size:18px;" aria-hidden="true">${option.icon}</span><span>${option.name}</span>`;
      btn.addEventListener("click", () => {
        selectedOptionId = option.id;
        renderSubtypes();
        renderChallengeList();
      });
      wrap.appendChild(btn);
    }
  }

  function renderChallengeList(){
    const list = document.getElementById("challengeList");
    if (!list) return;

    const option = getChallengeOption();
    if (!selectedType || !option){
      list.style.display = "none";
      list.innerHTML = "";
      return;
    }

    const save = ensureChallenges(loadSave());
    setSave(save);
    const totalPoints = num(save.challenges.points, 0);
    const active = save.challenges.active;
    const canCancel = !!active && num(save.gold, 0) >= CANCEL_COST_GOLD;

    let statusText = "No active challenge.";
    if (active){
      const activeOption = Object.values(CHALLENGE_TYPES)
        .flatMap((type) => type.options)
        .find((x) => x.id === active.optionId);
      if (activeOption){
        statusText = `Active: ${activeOption.name} - ${fmt(active.target)} ${activeOption.unit}`;
      }
    }

    list.style.display = "block";
    list.innerHTML = `
      <div style="background:#151520;border:2px solid #333;border-radius:14px;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-size:20px;font-weight:900;">${option.name}</div>
            <div style="opacity:.86;margin-top:4px;">${statusText}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
            ${active ? `<button class="townBtn" id="cancelChallengeBtn" ${canCancel ? "" : "disabled"} style="width:auto;min-width:132px;padding:8px 12px;">Cancel (-${fmt(CANCEL_COST_GOLD)} gold)</button>` : ""}
            <div style="padding:8px 12px;border-radius:999px;background:#101019;border:1px solid rgba(255,255,255,.08);font-weight:800;">
              Challenge Points: ${fmt(totalPoints)}
            </div>
          </div>
        </div>
        <div style="margin-top:14px;display:grid;gap:10px;">
          ${option.thresholds.map((row) => {
            const key = String(row.target);
            const claimedCount = num(save.challenges.claimCounts[option.id]?.[key], 0);
            const isActive = isActiveChallenge(save, option.id, row.target);
            const progress = getActiveProgress(save, option.id, row.target);
            const complete = isActive && progress >= row.target;
            const hasOtherActive = !!active && !isActive;
            const canStart = !active;
            return `
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px;border-radius:12px;border:1px solid ${isActive ? "#e0b36a" : "rgba(255,255,255,.08)"};background:${isActive ? "#2a2212" : "#101019"};">
                <div>
                  <div style="font-weight:900;">${fmt(row.target)} ${option.unit}</div>
                  <div style="opacity:.82;font-size:12px;margin-top:4px;">Reward: ${row.points} point${row.points === 1 ? "" : "s"} | Claimed: ${fmt(claimedCount)} time${claimedCount === 1 ? "" : "s"}</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                  <div style="font-weight:800;color:${complete ? "#f0c36f" : "#cfd3da"};">${fmt(progress)}/${fmt(row.target)}</div>
                  ${isActive
                    ? `<button class="townBtn challengeActionBtn" data-action="${complete ? "claim" : "active"}" data-target="${row.target}" ${complete ? "" : "disabled"} style="width:auto;min-width:92px;padding:8px 12px;">${complete ? "Claim" : "Started"}</button>`
                    : `<button class="townBtn challengeActionBtn" data-action="start" data-target="${row.target}" ${canStart ? "" : "disabled"} style="width:auto;min-width:92px;padding:8px 12px;">${hasOtherActive ? "Locked" : "Start"}</button>`
                  }
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    list.querySelectorAll(".challengeActionBtn").forEach((btn) => {
      const action = btn.getAttribute("data-action");
      const target = Number(btn.getAttribute("data-target"));
      if (action === "start"){
        btn.addEventListener("click", () => startChallenge(target));
      } else if (action === "claim"){
        btn.addEventListener("click", () => claimChallenge(target));
      }
    });
    list.querySelector("#cancelChallengeBtn")?.addEventListener("click", cancelActiveChallenge);
  }

  function pickType(typeId){
    selectedType = typeId;
    selectedOptionId = CHALLENGE_TYPES[typeId]?.options?.[0]?.id || null;
    renderSubtypes();
    renderChallengeList();
  }

  function bindChallengeTypeButtons() {
    document.getElementById("challengeTypeFight")?.addEventListener("click", () => pickType("fight"));
    document.getElementById("challengeTypeGathering")?.addEventListener("click", () => pickType("gathering"));
    document.getElementById("challengeTypeArtisan")?.addEventListener("click", () => pickType("artisan"));
  }

  function mountChallenges(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = CHALLENGES_TEMPLATE;
    document.title = "Darkstone Chronicles - Challenges";

    const save = ensureChallenges(loadSave());
    setSave(save);
    bindChallengeTypeButtons();
    pickType(selectedType || "fight");
    return true;
  }

  function initStandaloneChallenges() {
    if (!document.getElementById("challengeList")) return false;
    document.title = "Darkstone Chronicles - Challenges";

    const save = ensureChallenges(loadSave());
    setSave(save);
    bindChallengeTypeButtons();
    pickType("fight");
    return true;
  }

  window.DSChallenges = {
    mount: mountChallenges
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneChallenges();
  });
})();
