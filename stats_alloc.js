(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const BASE_ATK = 10;
  const BASE_DEF = 10;
  const STATS_ALLOC_TEMPLATE = `
    <h1>Stat Points</h1>

    <div style="width:90%;max-width:700px;margin:0 auto 12px;display:flex;gap:10px;justify-content:center;">
      <button id="backBtn">Back</button>
    </div>

    <div id="allocWrap" style="width:90%;max-width:700px;margin:0 auto;"></div>
  `;

  const num = (v, f=0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

  function loadSave(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function setSave(next){
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  }

  function savePatch(patch){
    const s = loadSave();
    Object.assign(s, patch);
    setSave(s);
  }

  function getEquipBonuses(save){
    let atkB = 0, defB = 0;
    const eq = (save && typeof save.equipment === "object") ? save.equipment : {};
    Object.values(eq).forEach(it => {
      if(!it) return;
      atkB += num(it.atk, 0);
      defB += num(it.def, 0);
    });
    return { atkB, defB };
  }

  function recomputeTotalsAndSave(){
    const cur = loadSave();
    const baseAtk = num(cur.heroAttack, BASE_ATK);
    const baseDef = num(cur.heroDefense, BASE_DEF);
    const { atkB, defB } = getEquipBonuses(cur);
    const attackTotal = baseAtk + atkB;
    const defenseTotal = baseDef + defB;
    savePatch({ attackTotal, defenseTotal });
  }

  function render(){
    const wrap = document.getElementById("allocWrap");
    if(!wrap) return;

    const s = loadSave();
    const points = Math.max(0, num(s.heroStatPoints, 0));

    wrap.innerHTML = `
      <div style="background:#151520;border:2px solid #333;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="font-weight:900;">Spend Stat Points</div>
          <div style="opacity:.9;">Points left: <b id="statPointsLeft">0</b></div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:8px;background:#1b1b24;border:1px solid #333;border-radius:10px;padding:8px 10px;">
            <span style="min-width:70px;">Attack</span>
            <button id="statAtkMinus">-</button>
            <span id="statAtkVal" style="min-width:20px;text-align:center;">0</span>
            <button id="statAtkPlus">+</button>
          </div>

          <div style="display:flex;align-items:center;gap:8px;background:#1b1b24;border:1px solid #333;border-radius:10px;padding:8px 10px;">
            <span style="min-width:70px;">Defense</span>
            <button id="statDefMinus">-</button>
            <span id="statDefVal" style="min-width:20px;text-align:center;">0</span>
            <button id="statDefPlus">+</button>
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <button id="statApplyBtn">Apply</button>
          <button id="statResetBtn" style="background:#2a1b1b;">Reset All Stats</button>
          <div style="opacity:.85;">Spend any split (e.g., 3 ATK / 2 DEF).</div>
        </div>
      </div>
    `;

    let allocAtk = 0;
    let allocDef = 0;

    const leftEl = wrap.querySelector("#statPointsLeft");
    const atkVal = wrap.querySelector("#statAtkVal");
    const defVal = wrap.querySelector("#statDefVal");
    const atkPlus = wrap.querySelector("#statAtkPlus");
    const atkMinus = wrap.querySelector("#statAtkMinus");
    const defPlus = wrap.querySelector("#statDefPlus");
    const defMinus = wrap.querySelector("#statDefMinus");
    const applyBtn = wrap.querySelector("#statApplyBtn");
    const resetBtn = wrap.querySelector("#statResetBtn");

    function updateUI(){
      const spent = allocAtk + allocDef;
      const left = Math.max(0, points - spent);
      if(leftEl) leftEl.textContent = String(left);
      if(atkVal) atkVal.textContent = String(allocAtk);
      if(defVal) defVal.textContent = String(allocDef);

      if(atkPlus) atkPlus.disabled = left <= 0;
      if(defPlus) defPlus.disabled = left <= 0;
      if(atkMinus) atkMinus.disabled = allocAtk <= 0;
      if(defMinus) defMinus.disabled = allocDef <= 0;
      if(applyBtn) applyBtn.disabled = spent <= 0;
    }

    atkPlus?.addEventListener("click", () => {
      if(points - (allocAtk + allocDef) <= 0) return;
      allocAtk++;
      updateUI();
    });
    atkMinus?.addEventListener("click", () => {
      if(allocAtk <= 0) return;
      allocAtk--;
      updateUI();
    });
    defPlus?.addEventListener("click", () => {
      if(points - (allocAtk + allocDef) <= 0) return;
      allocDef++;
      updateUI();
    });
    defMinus?.addEventListener("click", () => {
      if(allocDef <= 0) return;
      allocDef--;
      updateUI();
    });

    applyBtn?.addEventListener("click", () => {
      const spend = allocAtk + allocDef;
      if(spend <= 0) return;

      const cur = loadSave();
      const curPts = Math.max(0, num(cur.heroStatPoints, 0));
      if(spend > curPts) return;

      const newAtk = num(cur.heroAttack, BASE_ATK) + allocAtk;
      const newDef = num(cur.heroDefense, BASE_DEF) + allocDef;
      savePatch({
        heroAttack: newAtk,
        heroDefense: newDef,
        heroStatPoints: curPts - spend
      });
      recomputeTotalsAndSave();
      render();
    });

    resetBtn?.addEventListener("click", () => {
      const cur = loadSave();
      const curAtk = num(cur.heroAttack, BASE_ATK);
      const curDef = num(cur.heroDefense, BASE_DEF);
      const spent = Math.max(0, (curAtk - BASE_ATK) + (curDef - BASE_DEF));
      const curPts = Math.max(0, num(cur.heroStatPoints, 0));
      const newPts = curPts + spent;

      savePatch({
        heroAttack: BASE_ATK,
        heroDefense: BASE_DEF,
        heroStatPoints: newPts
      });
      recomputeTotalsAndSave();
      render();
    });

    updateUI();
  }

  function initStatsAllocRoute(){
    document.getElementById("backBtn")?.addEventListener("click", () => {
      if (window.DSUI?.navigateWithinShell?.("index.html")) return;
      window.location.href = "index.html";
    });

    render();
  }

  function mountStatsAlloc(root = null){
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = STATS_ALLOC_TEMPLATE;
    document.title = "Darkstone Chronicles - Stat Points";
    initStatsAllocRoute();
    return true;
  }

  function boot(){
    if (!document.getElementById("allocWrap")) return false;
    document.title = "Darkstone Chronicles - Stat Points";
    initStatsAllocRoute();
    return true;
  }

  window.DSStatsAlloc = { mount: mountStatsAlloc };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.addEventListener("ds:save", render);
})();
