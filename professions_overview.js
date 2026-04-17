(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const OVERVIEW_TEMPLATE = `
    <div style="display:flex;justify-content:flex-start;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
      <h1 style="margin:0;">Professions Overview</h1>
    </div>

    <div id="overviewGrid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;"></div>
  `;

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cp = (...codes) => String.fromCodePoint(...codes);

  const TRACKS = [
    { key: "mining", label: "Mining", emoji: cp(0x26CF, 0xFE0F) },
    { key: "blacksmith", label: "Forge", emoji: cp(0x2692, 0xFE0F) },
    { key: "woodcutting", label: "Woodcutting", emoji: cp(0x1FAB5) },
    { key: "carpentry", label: "Carpentry", emoji: cp(0x1FAB5) },
    { key: "hunting", label: "Hunting", emoji: cp(0x1F3F9) },
    { key: "fishing", label: "Fishing", emoji: cp(0x1F3A3) },
    { key: "cooking", label: "Cooking", emoji: cp(0x1F373) },
    { key: "enchanting", label: "Enchanting", emoji: cp(0x2728) },
    { key: "herbalism", label: "Herbalism", emoji: cp(0x1F33F) },
    { key: "alchemy", label: "Alchemy", emoji: cp(0x2697, 0xFE0F) }
  ];

  function roundLevelXP(v){
    v = Math.max(1, Math.round(Number(v) || 1));
    if (v >= 10000000) return Math.ceil(v / 50000) * 50000;
    if (v >= 1000000) return Math.ceil(v / 10000) * 10000;
    if (v >= 100000) return Math.ceil(v / 5000) * 5000;
    if (v >= 10000) return Math.ceil(v / 500) * 500;
    if (v >= 1000) return Math.ceil(v / 100) * 100;
    return Math.round(v);
  }

  function xpNextForLevel(level){
    const L = Math.max(1, Math.floor(Number(level) || 1));
    let xp = 100;
    for (let cur = 2; cur <= L; cur++) {
      const prev = cur - 1;
      let rate = 1.01;
      if (prev <= 3) rate = 2.0;
      else if (prev <= 6) rate = 1.5;
      else if (prev <= 10) rate = 1.3;
      else if (prev <= 20) rate = 1.18;
      else if (prev <= 35) rate = 1.12;
      else if (prev <= 50) rate = 1.10;
      else if (prev <= 70) rate = 1.075;
      else if (prev <= 85) rate = 1.06;
      else if (prev <= 99) rate = 1.05;
      else if (prev <= 105) rate = 1.05 - 0.002 * (prev - 100);
      else if (prev <= 200) {
        const t = (prev - 105) / 95;
        rate = 1.04 - 0.03 * t;
      }
      xp *= rate;
    }
    return roundLevelXP(xp);
  }

  function loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function getTrack(save, key) {
    const levelKey = `${key}Level`;
    const xpKey = `${key}XP`;
    const nextKey = `${key}XPNext`;
    const level = Math.max(1, num(save[levelKey], 1));
    const xp = Math.max(0, num(save[xpKey], 0));
    const next = Math.max(1, num(save[nextKey], xpNextForLevel(level)));
    return { level, xp, next };
  }

  function progressColors(pct) {
    if (pct < 25) return ["#b84a4a", "#e06a6a"];
    if (pct < 50) return ["#c66a2b", "#eea043"];
    if (pct < 75) return ["#4e9a43", "#79c96b"];
    return ["#2f9e5b", "#7be39e"];
  }

  function progressBar(xp, next) {
    const pct = clamp((xp / Math.max(1, next)) * 100, 0, 100);
    const [colorA, colorB] = progressColors(pct);
    return `
      <div style="height:12px;background:linear-gradient(180deg,#1b191c,#111116);border:1px solid rgba(126,94,50,.62);border-radius:999px;overflow:hidden;margin-top:6px;box-shadow:0 0 0 1px rgba(28,20,12,.65), inset 0 1px 0 rgba(255,228,178,.05);">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${colorA},${colorB});"></div>
      </div>
    `;
  }

  function card(title, level, xp, next, emoji) {
    return `
      <div style="background:linear-gradient(180deg, rgba(86,64,38,.34), rgba(26,23,26,.16) 42%, rgba(0,0,0,.10) 100%), linear-gradient(180deg, #34281d 0%, #1d1a1d 100%);border:1px solid rgba(126,94,50,.88);border-radius:12px;padding:10px 11px;box-shadow:0 0 0 1px rgba(28,20,12,.84), inset 0 1px 0 rgba(255,228,178,.08), inset 0 0 0 1px rgba(255,214,143,.04), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="font-weight:900;font-size:12px;line-height:1.15;min-width:0;flex:1;color:#f3ead6;text-shadow:0 1px 0 rgba(74,47,14,.95),0 0 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.58);">${emoji} ${title}</div>
          <div style="font-weight:900;font-size:11px;line-height:1.15;white-space:nowrap;flex:0 0 auto;color:#e7d7b6;">Lv ${level}</div>
        </div>
        <div style="opacity:.88;margin-top:5px;font-size:11px;color:#f3ead6;">${xp} / ${next}</div>
        ${progressBar(xp, next)}
      </div>
    `;
  }

  function renderOverview() {
    const save = loadSave();
    const heroLevel = Math.max(1, num(save.heroLevel, 1));
    const heroXP = Math.max(0, num(save.heroXP, 0));
    const heroXPNext = Math.max(1, num(save.heroXPNext, xpNextForLevel(heroLevel)));

    const grid = document.getElementById("overviewGrid");
    if (!grid) return;

    grid.innerHTML = [
      card("Hero Level", heroLevel, heroXP, heroXPNext, cp(0x1F9D9, 0x200D, 0x2642, 0xFE0F)),
      ...TRACKS.map((track) => {
        const data = getTrack(save, track.key);
        return card(track.label, data.level, data.xp, data.next, track.emoji);
      })
    ].join("");
  }

  function mountOverview(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = OVERVIEW_TEMPLATE;
    document.title = "Darkstone Chronicles - Professions Overview";
    renderOverview();
    return true;
  }

  function initStandaloneOverview() {
    if (!document.getElementById("overviewGrid")) return false;
    document.title = "Darkstone Chronicles - Professions Overview";
    renderOverview();
    return true;
  }

  window.DSOverview = {
    mount: mountOverview
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneOverview();
  });

  window.addEventListener("ds:save", renderOverview);
})();
