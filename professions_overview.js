(() => {
  const SAVE_KEY = "darkstone_save_v1";

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const TRACKS = [
    { key: "mining", label: "Mining", emoji: "⛏️" },
    { key: "blacksmith", label: "Forge", emoji: "⚒️" },
    { key: "woodcutting", label: "Woodcutting", emoji: "🪵" },
    { key: "carpentry", label: "Carpentry", emoji: "🪚" },
    { key: "hunting", label: "Hunting", emoji: "🏹" },
    { key: "fishing", label: "Fishing", emoji: "🎣" },
    { key: "cooking", label: "Cooking", emoji: "🍳" },
    { key: "enchanting", label: "Enchanting", emoji: "✨" },
    { key: "herbalism", label: "Herbalism", emoji: "🌿" },
    { key: "alchemy", label: "Alchemy", emoji: "⚗️" }
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
      <div style="height:12px;background:#0f0f16;border:2px solid #333;border-radius:999px;overflow:hidden;margin-top:10px;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${colorA},${colorB});"></div>
      </div>
    `;
  }

  function card(title, level, xp, next, emoji) {
    return `
      <div style="background:#151520;border:2px solid #333;border-radius:12px;padding:10px 11px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="font-weight:900;font-size:12px;line-height:1.15;min-width:0;flex:1;">${emoji} ${title}</div>
          <div style="font-weight:900;font-size:11px;line-height:1.15;white-space:nowrap;flex:0 0 auto;">Lv ${level}</div>
        </div>
        <div style="opacity:.86;margin-top:5px;font-size:11px;">${xp} / ${next}</div>
        ${progressBar(xp, next).replace("margin-top:10px;", "margin-top:6px;")}
      </div>
    `;
  }

  function render() {
    const save = loadSave();
    const heroLevel = Math.max(1, num(save.heroLevel, 1));
    const heroXP = Math.max(0, num(save.heroXP, 0));
    const heroXPNext = Math.max(1, num(save.heroXPNext, xpNextForLevel(heroLevel)));

    const grid = document.getElementById("overviewGrid");
    if (!grid) return;

    grid.innerHTML = [
      card("Hero Level", heroLevel, heroXP, heroXPNext, "🛡️"),
      ...TRACKS.map((track) => {
        const data = getTrack(save, track.key);
        return card(track.label, data.level, data.xp, data.next, track.emoji);
      })
    ].join("");
  }

  function boot() {
    document.getElementById("backBtn")?.addEventListener("click", () => {
      window.location.href = "professions.html";
    });

    render();
    window.addEventListener("ds:save", render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
