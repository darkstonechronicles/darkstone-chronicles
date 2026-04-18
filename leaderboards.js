(() => {
  const CATEGORY_DEFS = [
    {
      key: "hero_level",
      label: "Hero Level",
      source: "public",
      field: "hero_level",
      icon: "images/ui/fight.png",
      pageTitle: "Hero Level",
      subtitle: "Top players by hero level.",
      valueHeader: "Level / XP"
    },
    {
      key: "dungeons_completed",
      label: "Dungeons",
      source: "public",
      field: "dungeons_completed",
      icon: "images/ui/dungeons.png",
      pageTitle: "Dungeons Completed",
      subtitle: "Top players by dungeon completions.",
      valueHeader: "Completed"
    },
    {
      key: "mining_level",
      label: "Mining",
      source: "public",
      field: "mining_level",
      icon: "images/ui/mining.png",
      pageTitle: "Mining Level",
      subtitle: "Top players by mining level.",
      valueHeader: "Level / XP"
    },
    {
      key: "forge_level",
      label: "Forge",
      source: "public",
      field: "forge_level",
      icon: "images/ui/forge.png",
      pageTitle: "Forge Level",
      subtitle: "Top players by forge level.",
      valueHeader: "Level / XP"
    },
    {
      key: "woodcutting_level",
      label: "Woodcutting",
      source: "public",
      field: "woodcutting_level",
      icon: "images/ui/woodcutting.png",
      pageTitle: "Woodcutting Level",
      subtitle: "Top players by woodcutting level.",
      valueHeader: "Level / XP"
    },
    {
      key: "carpentry_level",
      label: "Carpentry",
      source: "public",
      field: "carpentry_level",
      icon: "images/ui/carpentry.png",
      pageTitle: "Carpentry Level",
      subtitle: "Top players by carpentry level.",
      valueHeader: "Level / XP"
    },
    {
      key: "hunting_level",
      label: "Hunting",
      source: "public",
      field: "hunting_level",
      icon: "images/ui/hunting.png",
      pageTitle: "Hunting Level",
      subtitle: "Top players by hunting level.",
      valueHeader: "Level / XP"
    },
    {
      key: "fishing_level",
      label: "Fishing",
      source: "public",
      field: "fishing_level",
      icon: "images/ui/fishing.png",
      pageTitle: "Fishing Level",
      subtitle: "Top players by fishing level.",
      valueHeader: "Level / XP"
    },
    {
      key: "cooking_level",
      label: "Cooking",
      source: "public",
      field: "cooking_level",
      icon: "images/ui/cooking.png",
      pageTitle: "Cooking Level",
      subtitle: "Top players by cooking level.",
      valueHeader: "Level / XP"
    },
    {
      key: "herbalism_level",
      label: "Herbalism",
      source: "public",
      field: "herbalism_level",
      icon: "images/ui/herbalism.png",
      pageTitle: "Herbalism Level",
      subtitle: "Top players by herbalism level.",
      valueHeader: "Level / XP"
    }
  ];

  const TEMPLATE = `
    <div id="leaderboardsRoot" style="max-width:980px;margin:0 auto;">
      <h1 style="margin-bottom:6px;">Leaderboards</h1>
      <div style="opacity:.85;margin-bottom:14px;">Choose a leaderboard category.</div>
      <div id="leaderboardsCategoryWrap" style="margin-bottom:22px;">
        <div id="leaderboardsCategoryGrid" class="leaderboardsCategoryGrid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:start;"></div>
      </div>
      <div id="leaderboardsView" style="margin-top:18px;"></div>
    </div>
  `;

  const state = {
    activeCategory: "hero_level",
    profiles: [],
    publicStats: [],
    loading: false,
    error: ""
  };

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const fmt = (v) => new Intl.NumberFormat("el-GR").format(num(v, 0));
  const esc = (v) => String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  function currentUserId() {
    return String(window.DSAuth?.getUser?.()?.id || "").trim();
  }

  async function loadLeaderboardData(force = false) {
    if (state.loading && !force) return;
    try {
      await window.DSAuth?.ready;
    } catch {}
    state.loading = true;
    state.error = "";
    const client = window.DSAuth?.getClient?.();
    if (!client) {
      state.error = "Leaderboard service is unavailable.";
      state.loading = false;
      renderLeaderboardView();
      return;
    }

    try {
      const [profilesRes, publicRes] = await Promise.all([
        client.from("profiles").select("id, display_name, avatar_url"),
        client.from("player_public_stats").select("user_id, hero_name, hero_level, hero_xp, mining_level, mining_xp, forge_level, forge_xp, woodcutting_level, woodcutting_xp, carpentry_level, carpentry_xp, hunting_level, hunting_xp, fishing_level, fishing_xp, cooking_level, cooking_xp, herbalism_level, herbalism_xp, dungeons_completed")
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (publicRes.error) throw publicRes.error;

      state.profiles = Array.isArray(profilesRes.data) ? profilesRes.data : [];
      state.publicStats = Array.isArray(publicRes.data) ? publicRes.data : [];
    } catch (error) {
      console.error("[leaderboards] load failed", error);
      state.error = error?.message || "Failed to load leaderboards.";
    } finally {
      state.loading = false;
      renderLeaderboardView();
    }
  }

  function profileMap() {
    return new Map(state.profiles.map((profile) => [String(profile.id || ""), profile]));
  }

  function buildHeroRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(1, num(row.hero_level, 1)),
          xp: Math.max(0, num(row.hero_xp, 0))
        };
      })
      .sort((a, b) => b.value - a.value || b.xp - a.xp || a.name.localeCompare(b.name));
  }

  function buildDungeonRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(0, num(row.dungeons_completed, 0))
        };
      })
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  }

  function buildMiningRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(1, num(row.mining_level, 1)),
          xp: Math.max(0, num(row.mining_xp, 0))
        };
      })
      .sort((a, b) => b.value - a.value || b.xp - a.xp || a.name.localeCompare(b.name));
  }

  function buildForgeRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(1, num(row.forge_level, 1)),
          xp: Math.max(0, num(row.forge_xp, 0))
        };
      })
      .sort((a, b) => b.value - a.value || b.xp - a.xp || a.name.localeCompare(b.name));
  }

  function buildWoodcuttingRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(1, num(row.woodcutting_level, 1)),
          xp: Math.max(0, num(row.woodcutting_xp, 0))
        };
      })
      .sort((a, b) => b.value - a.value || b.xp - a.xp || a.name.localeCompare(b.name));
  }

  function buildCarpentryRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(1, num(row.carpentry_level, 1)),
          xp: Math.max(0, num(row.carpentry_xp, 0))
        };
      })
      .sort((a, b) => b.value - a.value || b.xp - a.xp || a.name.localeCompare(b.name));
  }

  function buildHuntingRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(1, num(row.hunting_level, 1)),
          xp: Math.max(0, num(row.hunting_xp, 0))
        };
      })
      .sort((a, b) => b.value - a.value || b.xp - a.xp || a.name.localeCompare(b.name));
  }

  function buildFishingRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(1, num(row.fishing_level, 1)),
          xp: Math.max(0, num(row.fishing_xp, 0))
        };
      })
      .sort((a, b) => b.value - a.value || b.xp - a.xp || a.name.localeCompare(b.name));
  }

  function buildCookingRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(1, num(row.cooking_level, 1)),
          xp: Math.max(0, num(row.cooking_xp, 0))
        };
      })
      .sort((a, b) => b.value - a.value || b.xp - a.xp || a.name.localeCompare(b.name));
  }

  function buildHerbalismRows() {
    const map = profileMap();
    return state.publicStats
      .map((row) => {
        const profile = map.get(String(row.user_id || "")) || {};
        return {
          id: String(row.user_id || ""),
          name: String(profile.display_name || row.hero_name || "Hero").trim() || "Hero",
          avatar: String(profile.avatar_url || "images/hero.png").trim() || "images/hero.png",
          value: Math.max(1, num(row.herbalism_level, 1)),
          xp: Math.max(0, num(row.herbalism_xp, 0))
        };
      })
      .sort((a, b) => b.value - a.value || b.xp - a.xp || a.name.localeCompare(b.name));
  }

  function getRowsForCategory(category) {
    if (category?.key === "herbalism_level") return buildHerbalismRows();
    if (category?.key === "cooking_level") return buildCookingRows();
    if (category?.key === "fishing_level") return buildFishingRows();
    if (category?.key === "hunting_level") return buildHuntingRows();
    if (category?.key === "carpentry_level") return buildCarpentryRows();
    if (category?.key === "woodcutting_level") return buildWoodcuttingRows();
    if (category?.key === "forge_level") return buildForgeRows();
    if (category?.key === "mining_level") return buildMiningRows();
    if (category?.key === "dungeons_completed") return buildDungeonRows();
    return buildHeroRows();
  }

  function renderCategoryGrid() {
    const grid = document.getElementById("leaderboardsCategoryGrid");
    if (!grid) return;
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
    grid.style.gap = "14px";
    grid.style.alignItems = "start";
    grid.innerHTML = CATEGORY_DEFS.map((category) => `
      <button class="leaderboardCategoryBtn" type="button" data-leaderboards-category="${esc(category.key)}" style="appearance:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:10px;width:100%;max-width:none;min-width:0;padding:8px 8px 10px;border:${state.activeCategory === category.key ? "2px solid rgba(199,155,68,.9)" : "2px solid transparent"};border-radius:14px;background:${state.activeCategory === category.key ? "rgba(199,155,68,.10)" : "transparent"};color:#f4f1e8;cursor:pointer;">
        <span class="leaderboardCategoryIconFrame" style="width:76px;height:76px;padding:4px;border-radius:6px;border:1px solid rgba(126, 94, 50, .88);background:linear-gradient(180deg, rgba(86,64,38,.24), rgba(18,18,22,.14) 46%, rgba(0,0,0,.08) 100%), linear-gradient(180deg, #2e241b 0%, #151519 100%);box-shadow:0 0 0 1px rgba(28,20,12,.88), inset 0 1px 0 rgba(255,228,178,.08), inset 0 0 0 1px rgba(255,214,143,.04), inset 0 -10px 16px rgba(0,0,0,.14), 0 10px 18px rgba(0,0,0,.18);">
          <img class="hubIconImg" src="${esc(category.icon)}" alt="" aria-hidden="true">
        </span>
        <span class="leaderboardCategoryLabel" style="display:block;font-size:14px;font-weight:800;line-height:1.2;text-align:center;color:#f4f1e8;">${esc(category.label)}</span>
      </button>
    `).join("");

    grid.querySelectorAll("[data-leaderboards-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeCategory = btn.dataset.leaderboardsCategory || "hero_level";
        renderCategoryGrid();
        renderLeaderboardView();
      });
    });
  }

  function renderLeaderboardView() {
    const root = document.getElementById("leaderboardsView");
    if (!root) return;
    const category = CATEGORY_DEFS.find((entry) => entry.key === state.activeCategory) || CATEGORY_DEFS[0];

    if (state.loading) {
      root.innerHTML = `<div style="padding:18px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.02);">Loading leaderboard...</div>`;
      return;
    }

    if (state.error) {
      root.innerHTML = `<div style="padding:18px;border-radius:12px;border:1px solid rgba(179,72,92,.35);background:rgba(78,22,34,.24);color:#ffd8de;">${esc(state.error)}</div>`;
      return;
    }

    const rows = getRowsForCategory(category);
    const myId = currentUserId();
    const myIndex = rows.findIndex((row) => row.id && row.id === myId);
    const myRow = myIndex >= 0 ? rows[myIndex] : null;

    root.innerHTML = `
      <div style="display:grid;gap:14px;">
        <section style="padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.02);display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">
          <div>
            <div style="font-size:20px;font-weight:900;">${esc(category.pageTitle)} Leaderboard</div>
            <div style="opacity:.82;">${esc(category.subtitle || "Top players.")}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;opacity:.7;">Your Position</div>
            <div style="font-size:18px;font-weight:900;color:#ead39b;">${myRow ? `#${myIndex + 1}` : "Unranked"}</div>
          </div>
        </section>
        <section style="padding:0;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.02);overflow:hidden;">
          <div style="display:grid;grid-template-columns:86px minmax(0,1fr) 260px;padding:12px 14px;background:rgba(255,255,255,.04);font-weight:800;gap:10px;">
            <div>Rank</div>
            <div>Player</div>
            <div style="text-align:right;">${esc(category.valueHeader || "Value")}</div>
          </div>
          ${rows.length ? rows.slice(0, 100).map((row, index) => `
            <div style="display:grid;grid-template-columns:86px minmax(0,1fr) 260px;padding:12px 14px;gap:10px;align-items:center;border-top:1px solid rgba(255,255,255,.06);background:${row.id && row.id === myId ? "rgba(199,155,68,.10)" : "transparent"};">
              <div style="font-weight:900;color:${index < 3 ? "#ead39b" : "#f1f2f6"};">#${index + 1}</div>
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <img src="${esc(row.avatar)}" alt="${esc(row.name)}" style="width:42px;height:42px;border-radius:10px;border:2px solid #333;object-fit:cover;">
                <div style="min-width:0;">
                  <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(row.name)}</div>
                  <div style="opacity:.72;font-size:12px;">${row.id && row.id === myId ? "You" : "Player"}</div>
                </div>
              </div>
              <div style="text-align:right;font-weight:900;font-size:18px;color:#ead39b;white-space:nowrap;">${category.key === "hero_level" || category.key === "mining_level" || category.key === "forge_level" || category.key === "woodcutting_level" || category.key === "carpentry_level" || category.key === "hunting_level" || category.key === "fishing_level" || category.key === "cooking_level" || category.key === "herbalism_level" ? `${row.value} [${fmt(row.xp)} XP]` : fmt(row.value)}</div>
            </div>
          `).join("") : `<div style="padding:18px 14px;">No leaderboard data yet.</div>`}
        </section>
      </div>
    `;
  }

  function mountLeaderboards(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = TEMPLATE;
    document.title = "Darkstone Chronicles - Leaderboards";
    renderCategoryGrid();
    renderLeaderboardView();
    loadLeaderboardData(true);
    return true;
  }

  function initStandaloneLeaderboards() {
    if (!document.getElementById("leaderboardsRoot")) return false;
    mountLeaderboards(document.getElementById("leftPanel"));
    document.title = "Darkstone Chronicles - Leaderboards";
    return true;
  }

  window.DSLeaderboards = {
    mount: mountLeaderboards
  };

  window.addEventListener("DOMContentLoaded", () => {
    initStandaloneLeaderboards();
  });
  window.addEventListener("ds:auth", () => {
    if (document.getElementById("leaderboardsRoot")) {
      loadLeaderboardData(true);
    }
  });
})();
