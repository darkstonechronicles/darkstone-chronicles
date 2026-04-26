(() => {
  const LOGIN_PAGE = "login.html";
  const SAVE_KEY = "darkstone_save_v1";
  const SAVE_OWNER_KEY = "darkstone_save_owner_v1";
  const SAVE_META_KEY = "darkstone_save_meta_v1";
  const SAVE_BACKUP_KEY = "darkstone_save_backup_latest_v1";
  const ACTIVE_SESSION_KEY = "darkstone_active_client_session_v1";
  const ACTIVE_SESSION_PENDING_KEY = "ds:claim-active-session";
  const ACTIVE_SESSION_HANDOFF_GRACE_MS = 1500;
  const CLOUD_SAVE_DEBOUNCE_MS = 250;
  const LOCAL_SAVE_SYNC_DELAY_MS = 120;
  const SUPABASE_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
  const APP_VERSION_URL = "version.json";
  const APP_VERSION_RELOAD_PREFIX = "ds:app-version-reload:";
  const APP_VERSION_BROADCAST_KEY = "ds:app-version-latest";
  const APP_VERSION_POLL_MS = 10 * 1000;
  const APP_VERSION_HIDDEN_POLL_MS = 60 * 1000;
  const PRESENCE_HEARTBEAT_MS = 45 * 1000;
  const PRESENCE_MIN_UPDATE_MS = 20 * 1000;
  const ONLINE_WINDOW_MS = 2 * 60 * 1000;
  const CONFIG = {
    url: "https://ibpwrvtsnuhbylexuoil.supabase.co",
    anonKey: "sb_publishable_TLEC6vRVLjVzDOsmbXs4uA_X0MUXTYi"
  };

  const state = {
    client: null,
    session: null,
    user: null,
    admin: {
      checkedUserId: "",
      checked: false,
      isAdmin: false,
      checking: null
    },
    cloud: {
      userId: "",
      ready: false,
      preparing: null,
      syncing: false,
      pendingSync: false,
      syncTimer: 0,
      revision: 0,
      suppressSync: false
    },
    presence: {
      timer: 0,
      lastSentAt: 0,
      sending: null
    },
    sessionGuard: {
      clientSessionId: "",
      invalidated: false,
      checking: null,
      justClaimedActiveSession: false
    },
    appVersionPollTimer: 0,
    appVersionChecking: null,
    appVersionLastCheckAt: 0
  };

  function isConfigured() {
    return /^https?:\/\//i.test(String(CONFIG.url || "").trim()) &&
      !String(CONFIG.anonKey || "").includes("PASTE_YOUR_SUPABASE_ANON_KEY_HERE");
  }

  function getCurrentAssetVersion() {
    try {
      const script = document.currentScript ||
        Array.from(document.scripts).find((node) => String(node.src || "").includes("/auth.js"));
      const src = String(script?.src || "");
      if (!src) return "";
      return String(new URL(src, window.location.href).searchParams.get("v") || "").trim();
    } catch {
      return "";
    }
  }

  function hasReloadedForVersion(version) {
    try {
      return sessionStorage.getItem(`${APP_VERSION_RELOAD_PREFIX}${version}`) === "1";
    } catch {
      return false;
    }
  }

  function markReloadedForVersion(version) {
    try {
      sessionStorage.setItem(`${APP_VERSION_RELOAD_PREFIX}${version}`, "1");
    } catch {}
  }

  function reloadForAppVersion(version) {
    const latestVersion = String(version || "").trim();
    if (!latestVersion || hasReloadedForVersion(latestVersion)) return false;
    markReloadedForVersion(latestVersion);
    try {
      localStorage.setItem(APP_VERSION_BROADCAST_KEY, `${latestVersion}:${Date.now()}`);
    } catch {}
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("appVersion", latestVersion);
    window.location.replace(nextUrl.toString());
    return true;
  }

  async function checkForAppUpdateOnBoot({ force = false } = {}) {
    const currentVersion = getCurrentAssetVersion();
    if (!currentVersion || !/^https?:$/i.test(String(window.location.protocol || ""))) return false;
    const now = Date.now();
    if (!force && now - state.appVersionLastCheckAt < 2500) return false;
    if (state.appVersionChecking) return state.appVersionChecking;
    state.appVersionLastCheckAt = now;

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = window.setTimeout(() => controller?.abort(), 3000);
    state.appVersionChecking = (async () => {
      const res = await fetch(`${APP_VERSION_URL}?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        signal: controller?.signal
      });
      if (!res.ok) return false;
      const body = await res.json().catch(() => ({}));
      const latestVersion = String(body?.version || "").trim();
      if (!latestVersion || latestVersion === currentVersion) return false;
      return reloadForAppVersion(latestVersion);
    })();
    try {
      return await state.appVersionChecking;
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("[auth] app version check failed", error);
      }
      return false;
    } finally {
      state.appVersionChecking = null;
      window.clearTimeout(timeout);
    }
  }

  function startAppVersionPolling() {
    if (state.appVersionPollTimer || !getCurrentAssetVersion()) return;
    state.appVersionPollTimer = window.setInterval(() => {
      const hidden = document.visibilityState === "hidden";
      const minAge = hidden ? APP_VERSION_HIDDEN_POLL_MS : APP_VERSION_POLL_MS;
      if (Date.now() - state.appVersionLastCheckAt < minAge) return;
      checkForAppUpdateOnBoot({ force: true });
    }, APP_VERSION_POLL_MS);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src === src);
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.addEventListener("load", () => {
        script.dataset.loaded = "1";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function currentPage() {
    const page = String(window.location.pathname || "").split("/").pop().toLowerCase().trim();
    if (!page) return "index.html";
    if (!page.includes(".")) return `${page}.html`;
    return page;
  }

  function currentRelativeUrl() {
    const page = currentPage();
    return `${page}${window.location.search || ""}${window.location.hash || ""}`;
  }

  function getPresencePageLabel(page = currentPage()) {
    const normalized = String(page || "").toLowerCase().split(/[?#]/)[0].trim();
    const labels = {
      "index.html": "Home",
      "fight.html": "Fighting",
      "dungeons.html": "Dungeons",
      "dungeon_run.html": "Dungeon Run",
      "professions.html": "Professions",
      "professions_overview.html": "Overview",
      "market.html": "Market",
      "shop.html": "Shop",
      "bank.html": "Bank",
      "buildings.html": "Buildings",
      "challenges.html": "Challenges",
      "equipment.html": "Equipment",
      "stats.html": "Stats",
      "stats_alloc.html": "Stat Allocation",
      "mining.html": "Mining",
      "mining_action.html": "Mining",
      "forge.html": "Forge",
      "forge_action.html": "Forge",
      "woodcutting.html": "Woodcutting",
      "carpentry.html": "Carpentry",
      "wood_gather.html": "Woodcutting",
      "wood_gather_action.html": "Woodcutting",
      "wood_sawmill.html": "Sawmill",
      "wood_sawmill_action.html": "Sawmill",
      "hunting.html": "Hunting",
      "hunting_action.html": "Hunting",
      "fishing.html": "Fishing",
      "fishing_action.html": "Fishing",
      "cooking.html": "Cooking",
      "cooking_action.html": "Cooking",
      "herbalism.html": "Herbalism",
      "herbalism_action.html": "Herbalism",
      "alchemy.html": "Alchemy",
      "alchemy_action.html": "Alchemy",
      "alchemy_tier.html": "Alchemy Tier",
      "enchanting.html": "Enchanting",
      "jewelcrafting.html": "Jewelcrafting",
      "jewelcrafting_action.html": "Jewelcrafting",
      "party_hall.html": "Party Hall",
      "create_character.html": "Character Creation",
      "login.html": "Login"
    };
    return labels[normalized] || "In Game";
  }

  function getReturnTo() {
    const params = new URLSearchParams(window.location.search || "");
    const queryTarget = String(params.get("returnTo") || "").trim();
    const storedTarget = String(sessionStorage.getItem("ds:returnTo") || "").trim();
    const target = queryTarget || storedTarget || "index.html";
    if (!/^[a-z0-9_.-]+\.html([?#].*)?$/i.test(target)) return "index.html";
    return target;
  }

  function generateClientSessionId() {
    try {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    } catch {}
    return `ds-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function ensureClientSessionId(reset = false) {
    try {
      if (!reset) {
        const existing = String(localStorage.getItem(ACTIVE_SESSION_KEY) || "").trim();
        if (existing) {
          state.sessionGuard.clientSessionId = existing;
          return existing;
        }
      }
      const next = generateClientSessionId();
      localStorage.setItem(ACTIVE_SESSION_KEY, next);
      state.sessionGuard.clientSessionId = next;
      return next;
    } catch {
      const fallback = generateClientSessionId();
      state.sessionGuard.clientSessionId = fallback;
      return fallback;
    }
  }

  function markPendingActiveSessionClaim() {
    try {
      sessionStorage.setItem(ACTIVE_SESSION_PENDING_KEY, String(Date.now()));
    } catch {}
  }

  function consumePendingActiveSessionClaim() {
    try {
      const raw = String(sessionStorage.getItem(ACTIVE_SESSION_PENDING_KEY) || "").trim();
      sessionStorage.removeItem(ACTIVE_SESSION_PENDING_KEY);
      const requestedAt = Number(raw || 0);
      return Number.isFinite(requestedAt) && requestedAt > 0 ? requestedAt : 0;
    } catch {
      return 0;
    }
  }

  function readLocalSave() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function readLocalSaveMeta() {
    try {
      const meta = JSON.parse(localStorage.getItem(SAVE_META_KEY) || "{}") || {};
      return meta && typeof meta === "object" ? meta : {};
    } catch {
      return {};
    }
  }

  function writeLocalSaveMeta(patch = {}) {
    const current = readLocalSaveMeta();
    const next = { ...current, ...(patch && typeof patch === "object" ? patch : {}) };
    try {
      localStorage.setItem(SAVE_META_KEY, JSON.stringify(next));
    } catch {}
    return next;
  }

  function markLocalSaveChanged() {
    writeLocalSaveMeta({
      lastLocalSaveAt: Date.now(),
      lastLocalClientSessionId: ensureClientSessionId(false)
    });
  }

  function markLocalSaveSynced(at = Date.now(), revision = state.cloud.revision) {
    const nextRevision = Math.max(0, Number(revision || 0) || 0);
    writeLocalSaveMeta({
      lastCloudSyncAt: at,
      cloudRevision: nextRevision
    });
  }

  function hasUnsyncedLocalSave() {
    const meta = readLocalSaveMeta();
    const lastLocalSaveAt = Number(meta.lastLocalSaveAt || 0);
    const lastCloudSyncAt = Number(meta.lastCloudSyncAt || 0);
    return lastLocalSaveAt > 0 && lastLocalSaveAt > lastCloudSyncAt;
  }

  function writeLocalSave(save, ownerId = "", revision = state.cloud.revision) {
    state.cloud.suppressSync = true;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save && typeof save === "object" ? save : {}));
      if (ownerId) localStorage.setItem(SAVE_OWNER_KEY, ownerId);
      const now = Date.now();
      writeLocalSaveMeta({
        lastLocalSaveAt: now,
        lastCloudSyncAt: now,
        cloudRevision: Math.max(0, Number(revision || 0) || 0),
        lastLocalClientSessionId: ensureClientSessionId(false)
      });
    } finally {
      state.cloud.suppressSync = false;
    }
  }

  function getLocalOwnerId() {
    return String(localStorage.getItem(SAVE_OWNER_KEY) || "").trim();
  }

  function normalizeRemoteSavePayload(remote) {
    return remote?.save_data && typeof remote.save_data === "object" ? remote.save_data : {};
  }

  function applyRemoteSaveSnapshot(remote) {
    backupLocalSave("remote-snapshot-applied");
    const remoteSave = normalizeRemoteSavePayload(remote);
    state.cloud.revision = Math.max(1, Number(remote?.revision || 1) || 1);
    writeLocalSave(remoteSave, state.user?.id || "", state.cloud.revision);
    window.dispatchEvent(new Event("ds:save"));
    return remoteSave;
  }

  function applyRemoteEmptySaveSnapshot(remote, reason = "remote-empty-snapshot-applied") {
    backupLocalSave(reason);
    state.cloud.revision = Math.max(1, Number(remote?.revision || 1) || 1);
    writeLocalSave({}, state.user?.id || "", state.cloud.revision);
    window.dispatchEvent(new Event("ds:save"));
    return {};
  }

  function isAdminResetSave(save) {
    return Boolean(save && typeof save === "object" && save.__adminReset);
  }

  function hasMeaningfulSave(save) {
    const next = save && typeof save === "object" ? save : {};
    return Object.keys(next).length > 0 && (
      Boolean(next.heroCreated) ||
      Array.isArray(next.inventory) ||
      Number(next.heroLevel || 0) > 0 ||
      String(next.heroName || "").trim().length > 0
    );
  }

  function backupLocalSave(reason = "unknown") {
    const save = readLocalSave();
    if (!hasMeaningfulSave(save)) return false;
    try {
      localStorage.setItem(SAVE_BACKUP_KEY, JSON.stringify({
        reason: String(reason || "unknown"),
        backedUpAt: Date.now(),
        ownerId: getLocalOwnerId(),
        meta: readLocalSaveMeta(),
        save
      }));
      return true;
    } catch {
      return false;
    }
  }

  function saveProgressScore(save) {
    const next = save && typeof save === "object" ? save : {};
    const statNames = [
      "hero", "mining", "forge", "blacksmith", "woodcutting", "woodworking",
      "carpentry", "hunting", "fishing", "cooking", "herbalism", "alchemy", "enchanting", "jewelcrafting"
    ];
    let score = 0;
    statNames.forEach((name, index) => {
      const level = Math.max(0, Number(next[`${name}Level`] || 0) || 0);
      const xp = Math.max(0, Number(next[`${name}XP`] || 0) || 0);
      score += (level * 1000000 + xp) * (index + 1);
    });
    score += Math.max(0, Number(next.gold || 0) || 0);
    score += Math.max(0, Number(next.darkStones || 0) || 0) * 1000;
    [
      "barracksLevel", "cryptHallLevel", "minerHutLevel", "forgeAcademyLevel",
      "foresterLodgeLevel", "carpenterWorkshopLevel", "herbalistConservatoryLevel",
      "alchemistLaboratoryLevel", "hunterLodgeLevel", "anglerPierLevel", "cookhouseLevel",
      "enchanterSanctumLevel", "jewelcrafterAtelierLevel"
    ].forEach((key, index) => {
      score += Math.max(0, Number(next[key] || 0) || 0) * 100000 * (index + 1);
    });
    if (Array.isArray(next.inventory)) {
      score += next.inventory.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1) || 1), 0) * 10;
    }
    const totalStats = next.stats && typeof next.stats === "object" && next.stats.total && typeof next.stats.total === "object"
      ? next.stats.total
      : {};
    Object.values(totalStats).forEach((value) => {
      score += Math.max(0, Number(value || 0) || 0);
    });
    return score;
  }

  function buildPublicStats(save, user) {
    const next = save && typeof save === "object" ? save : {};
    const userMeta = user?.user_metadata || {};
    const fallbackName = String(
      userMeta.full_name ||
      userMeta.name ||
      String(user?.email || "").split("@")[0] ||
      "Hero"
    ).trim() || "Hero";

    return {
      hero_name: String(next.heroName || next.playerName || fallbackName).trim() || fallbackName,
      hero_level: Math.max(1, Number(next.heroLevel || 1) || 1),
      hero_xp: Math.max(0, Number(next.heroXP || 0) || 0),
      mining_level: Math.max(1, Number(next.miningLevel || 1) || 1),
      mining_xp: Math.max(0, Number(next.miningXP || 0) || 0),
      forge_level: Math.max(1, Number(next.blacksmithLevel || next.forgeLevel || 1) || 1),
      forge_xp: Math.max(0, Number(next.blacksmithXP || next.forgeXP || 0) || 0),
      woodcutting_level: Math.max(1, Number(next.woodcuttingLevel || next.woodworkingLevel || 1) || 1),
      woodcutting_xp: Math.max(0, Number(next.woodcuttingXP || next.woodworkingXP || 0) || 0),
      carpentry_level: Math.max(1, Number(next.carpentryLevel || 1) || 1),
      carpentry_xp: Math.max(0, Number(next.carpentryXP || 0) || 0),
      hunting_level: Math.max(1, Number(next.huntingLevel || 1) || 1),
      hunting_xp: Math.max(0, Number(next.huntingXP || 0) || 0),
      fishing_level: Math.max(1, Number(next.fishingLevel || 1) || 1),
      fishing_xp: Math.max(0, Number(next.fishingXP || 0) || 0),
      cooking_level: Math.max(1, Number(next.cookingLevel || 1) || 1),
      cooking_xp: Math.max(0, Number(next.cookingXP || 0) || 0),
      herbalism_level: Math.max(1, Number(next.herbalismLevel || 1) || 1),
      herbalism_xp: Math.max(0, Number(next.herbalismXP || 0) || 0),
      alchemy_level: Math.max(1, Number(next.alchemyLevel || 1) || 1),
      alchemy_xp: Math.max(0, Number(next.alchemyXP || 0) || 0),
      enchanting_level: Math.max(1, Number(next.enchantingLevel || 1) || 1),
      enchanting_xp: Math.max(0, Number(next.enchantingXP || 0) || 0),
      dungeons_completed: Math.max(0, Number(next?.stats?.total?.dungeonsCompleted || 0) || 0),
      total_gold: Math.max(0, Number(next.gold || 0) || 0),
      combat_power: Math.max(0, (Number(next.heroAtk || 0) || 0) + (Number(next.heroDef || 0) || 0))
    };
  }

  async function fetchRemoteSave() {
    if (!state.client || !state.user?.id) return null;
    const { data, error } = await state.client
      .from("player_saves")
      .select("save_data, revision, updated_at")
      .eq("user_id", state.user.id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function upsertProfileAndStats(save) {
    if (!state.client || !state.user?.id) return;
    const userMeta = state.user.user_metadata || {};
    const stats = buildPublicStats(save, state.user);

    const { error: profileError } = await state.client.from("profiles").upsert({
      id: state.user.id,
      email: state.user.email || null,
      display_name: stats.hero_name,
      avatar_url: save?.heroPortrait || userMeta.avatar_url || null
    });
    if (profileError) throw profileError;

    const { error: statsError } = await state.client.from("player_public_stats").upsert({
      user_id: state.user.id,
      ...stats
    });
    if (statsError) throw statsError;
  }

  async function fetchProfileSessionState() {
    if (!state.client || !state.user?.id) return null;
    const { data, error } = await state.client
      .from("profiles")
      .select("active_session_id, active_session_claimed_at")
      .eq("id", state.user.id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function writeRemoteSaveWithRevision(localSave, options = {}) {
    if (!state.client || !state.user?.id) return { ok: false, reason: "no-session" };

    const nextSave = localSave && typeof localSave === "object" ? localSave : {};
    const allowCreate = options.allowCreate !== false;
    const allowRemoteOverride = options.allowRemoteOverride === true;
    const knownRevision = Math.max(0, Number(state.cloud.revision || 0) || 0);
    const remote = await fetchRemoteSave();
    const remoteRevision = Math.max(0, Number(remote?.revision || 0) || 0);

    if (remote && remoteRevision > knownRevision && !allowRemoteOverride) {
      applyRemoteSaveSnapshot(remote);
      return { ok: false, reason: "stale-remote", remote };
    }

    const nowIso = new Date().toISOString();
    if (remote) {
      const nextRevision = remoteRevision + 1;
      const { data, error } = await state.client
        .from("player_saves")
        .update({
          save_data: nextSave,
          revision: nextRevision,
          last_synced_at: nowIso
        })
        .eq("user_id", state.user.id)
        .eq("revision", remoteRevision)
        .select("revision")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        const latestRemote = await fetchRemoteSave();
        if (latestRemote) {
          applyRemoteSaveSnapshot(latestRemote);
          return { ok: false, reason: "conflict", remote: latestRemote };
        }
        throw new Error("Cloud save update conflicted.");
      }

      state.cloud.revision = nextRevision;
      return { ok: true, revision: nextRevision };
    }

    if (!allowCreate) {
      return { ok: false, reason: "missing-remote" };
    }

    const initialRevision = Math.max(1, knownRevision || 1);
    const { error: insertError } = await state.client.from("player_saves").upsert({
      user_id: state.user.id,
      save_data: nextSave,
      revision: initialRevision,
      last_synced_at: nowIso
    });
    if (insertError) throw insertError;
    state.cloud.revision = initialRevision;
    return { ok: true, revision: initialRevision };
  }

  async function claimActiveSession(resetClientSessionId = false) {
    if (!state.client || !state.user?.id) return false;
    const clientSessionId = ensureClientSessionId(resetClientSessionId);
    const { error } = await state.client
      .from("profiles")
      .update({
        active_session_id: clientSessionId,
        active_session_claimed_at: new Date().toISOString()
      })
      .eq("id", state.user.id);
    if (error) throw error;
    state.sessionGuard.invalidated = false;
    state.sessionGuard.justClaimedActiveSession = true;
    return true;
  }

  async function handleSessionReplaced() {
    if (state.sessionGuard.invalidated) return false;
    state.sessionGuard.invalidated = true;
    stopPresenceHeartbeat();
    if (state.cloud.syncTimer) {
      window.clearTimeout(state.cloud.syncTimer);
      state.cloud.syncTimer = 0;
    }
    state.cloud.ready = false;
    state.cloud.syncing = false;
    try {
      alert("Your account was opened on another device. Please sign in again.");
    } catch {}
    try {
      await state.client?.auth?.signOut?.({ scope: "local" });
    } catch (error) {
      console.error("[auth] local sign out after session replace failed", error);
    }
    const target = `${LOGIN_PAGE}?reason=session-replaced`;
    window.location.replace(target);
    return false;
  }

  async function validateActiveSession(options = {}) {
    const { claimIfMissing = false, forceClaim = false, resetClientSessionId = false } = options || {};
    if (!state.client || !state.user?.id) return false;
    if (state.sessionGuard.invalidated) return false;
    if (state.sessionGuard.checking) return state.sessionGuard.checking;

    state.sessionGuard.checking = (async () => {
      if (forceClaim) {
        await claimActiveSession(resetClientSessionId);
        return true;
      }

      const remote = await fetchProfileSessionState();
      const remoteSessionId = String(remote?.active_session_id || "").trim();
      const localSessionId = ensureClientSessionId(resetClientSessionId);

      if (!remoteSessionId) {
        if (claimIfMissing) {
          await claimActiveSession(false);
          return true;
        }
        return true;
      }

      if (remoteSessionId === localSessionId) return true;
      await handleSessionReplaced();
      return false;
    })();

    try {
      return await state.sessionGuard.checking;
    } finally {
      state.sessionGuard.checking = null;
    }
  }

  async function syncCloudSaveNow() {
    if (!state.client || !state.user?.id || state.cloud.syncing || !state.cloud.ready) return;
    if (!(await validateActiveSession())) return;
    state.cloud.syncing = true;
    try {
      const localSave = readLocalSave();
      const saveResult = await writeRemoteSaveWithRevision(localSave);
      if (!saveResult.ok) {
        if (saveResult.reason === "stale-remote" || saveResult.reason === "conflict") {
          const remote = await fetchRemoteSave();
          if (remote?.save_data && typeof remote.save_data === "object") {
            applyRemoteSaveSnapshot(remote);
          } else {
            markLocalSaveSynced();
          }
          localStorage.setItem(SAVE_OWNER_KEY, state.user.id);
          window.dispatchEvent(new CustomEvent("ds:cloud-save", {
            detail: { status: "synced", revision: state.cloud.revision, source: "remote" }
          }));
          return;
        }
        throw new Error(saveResult.reason || "Cloud save sync failed.");
      }

      await upsertProfileAndStats(localSave);
      localStorage.setItem(SAVE_OWNER_KEY, state.user.id);
      markLocalSaveSynced();
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "synced", revision: state.cloud.revision }
      }));
    } catch (error) {
      console.error("[auth] cloud save sync failed", error);
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "error", error: error?.message || String(error) }
      }));
    } finally {
      state.cloud.syncing = false;
      if (state.cloud.pendingSync) {
        state.cloud.pendingSync = false;
        scheduleCloudSaveSync(0);
      }
    }
  }

  function scheduleCloudSaveSync(delayMs = CLOUD_SAVE_DEBOUNCE_MS) {
    if (!state.user?.id || !state.cloud.ready || state.cloud.suppressSync) return;
    if (state.cloud.syncing) {
      state.cloud.pendingSync = true;
      return;
    }
    if (state.cloud.syncTimer) window.clearTimeout(state.cloud.syncTimer);
    state.cloud.syncTimer = window.setTimeout(() => {
      state.cloud.syncTimer = 0;
      syncCloudSaveNow();
    }, Math.max(0, Number(delayMs) || 0));
  }

  async function preparePlayerState() {
    await ready;
    if (!state.client || !state.user?.id) return { ok: false, reason: "no-session" };
    if (!(await validateActiveSession({ claimIfMissing: true }))) return { ok: false, reason: "session-replaced" };
    if (state.cloud.ready && state.cloud.userId === state.user.id) return { ok: true };
    if (state.cloud.preparing) return state.cloud.preparing;

    state.cloud.preparing = (async () => {
      const localSave = readLocalSave();
      const localMeta = readLocalSaveMeta();
      const localOwnerId = getLocalOwnerId();
      const remote = await fetchRemoteSave();
      const remoteSave = normalizeRemoteSavePayload(remote);
      const remoteRevision = Math.max(0, Number(remote?.revision || 0) || 0);
      const remoteHasSave = hasMeaningfulSave(remoteSave);
      const remoteIsAdminReset = isAdminResetSave(remoteSave);
      const localHasSave = hasMeaningfulSave(localSave);
      const ownerMatches = !localOwnerId || localOwnerId === state.user.id;
      const localBaseRevision = Math.max(0, Number(localMeta.cloudRevision || 0) || 0);
      const hasKnownLocalBaseRevision = localMeta.cloudRevision != null && Number(localMeta.cloudRevision || 0) > 0;
      const localClientSessionId = String(localMeta.lastLocalClientSessionId || "").trim();
      const currentClientSessionId = ensureClientSessionId(false);
      const sameClientUnsyncedLocalSave =
        hasUnsyncedLocalSave() &&
        !state.sessionGuard.justClaimedActiveSession &&
        (!localClientSessionId || localClientSessionId === currentClientSessionId);
      const hasLegacyUnsyncedLocalSave =
        !hasKnownLocalBaseRevision &&
        hasUnsyncedLocalSave() &&
        !state.sessionGuard.justClaimedActiveSession;
      const sameClientLocalProgressAhead =
        !state.sessionGuard.justClaimedActiveSession &&
        localClientSessionId &&
        localClientSessionId === currentClientSessionId &&
        saveProgressScore(localSave) > saveProgressScore(remoteSave);
      const preferLocalSave =
        localHasSave &&
        ownerMatches &&
        !state.sessionGuard.justClaimedActiveSession &&
        !remoteIsAdminReset &&
        (hasUnsyncedLocalSave() || sameClientLocalProgressAhead) &&
        (!remoteHasSave || localBaseRevision >= remoteRevision || sameClientUnsyncedLocalSave || hasLegacyUnsyncedLocalSave || sameClientLocalProgressAhead);

      if (remote && !remoteHasSave && localHasSave && ownerMatches && remoteRevision > localBaseRevision) {
        applyRemoteEmptySaveSnapshot(remote, remoteIsAdminReset ? "admin-reset-applied" : "remote-empty-save-applied");
      } else if (preferLocalSave) {
        const saveResult = await writeRemoteSaveWithRevision(localSave, { allowRemoteOverride: true });
        if (saveResult.ok) {
          await upsertProfileAndStats(localSave);
          localStorage.setItem(SAVE_OWNER_KEY, state.user.id);
          markLocalSaveSynced();
        }
      } else if (remoteHasSave) {
        applyRemoteSaveSnapshot(remote);
      } else if (localHasSave && ownerMatches) {
        const saveResult = await writeRemoteSaveWithRevision(localSave, { allowCreate: true });
        if (!saveResult.ok) throw new Error(saveResult.reason || "Cloud save init failed.");
        await upsertProfileAndStats(localSave);
        localStorage.setItem(SAVE_OWNER_KEY, state.user.id);
        markLocalSaveSynced();
      } else {
        if (!ownerMatches) {
          backupLocalSave("owner-mismatch-cleared");
          writeLocalSave({}, state.user.id);
        }
        await upsertProfileAndStats({});
        const { error: initSaveError } = await state.client.from("player_saves").upsert({
          user_id: state.user.id,
          save_data: {},
          revision: 1,
          last_synced_at: new Date().toISOString()
        });
        if (initSaveError) throw initSaveError;
        state.cloud.revision = Number(remote?.revision || 1) || 1;
      }

      state.cloud.userId = state.user.id;
      state.cloud.ready = true;
      state.sessionGuard.justClaimedActiveSession = false;
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "ready", revision: state.cloud.revision }
      }));
      return { ok: true };
    })();

    try {
      return await state.cloud.preparing;
    } finally {
      state.cloud.preparing = null;
    }
  }

  async function refreshAdminStatus() {
    await ready;
    if (!state.client || !state.user?.id) {
      state.admin.checkedUserId = "";
      state.admin.checked = false;
      state.admin.isAdmin = false;
      return false;
    }

    if (state.admin.checked && state.admin.checkedUserId === state.user.id) {
      return state.admin.isAdmin;
    }

    if (state.admin.checking) return state.admin.checking;

    state.admin.checking = (async () => {
      const { data, error } = await state.client
        .from("admin_users")
        .select("user_id")
        .eq("user_id", state.user.id)
        .maybeSingle();

      if (error) {
        console.error("[auth] admin status check failed", error);
        state.admin.checkedUserId = state.user.id;
        state.admin.checked = true;
        state.admin.isAdmin = false;
        return false;
      }

      state.admin.checkedUserId = state.user.id;
      state.admin.checked = true;
      state.admin.isAdmin = !!data;
      return state.admin.isAdmin;
    })();

    try {
      return await state.admin.checking;
    } finally {
      state.admin.checking = null;
    }
  }

  function stopPresenceHeartbeat() {
    if (state.presence.timer) {
      window.clearInterval(state.presence.timer);
      state.presence.timer = 0;
    }
    state.presence.lastSentAt = 0;
    state.presence.sending = null;
  }

  async function markPresenceNow(force = false) {
    await ready;
    if (!state.client || !state.user?.id) return false;
    if (!(await validateActiveSession())) return false;
    if (state.presence.sending) return state.presence.sending;

    const now = Date.now();
    if (!force && now - Number(state.presence.lastSentAt || 0) < PRESENCE_MIN_UPDATE_MS) {
      return false;
    }

    state.presence.sending = (async () => {
      const payload = {
        id: state.user.id,
        email: state.user.email || null,
        last_seen_at: new Date().toISOString(),
        last_seen_page: getPresencePageLabel()
      };

      const { error } = await state.client.from("profiles").upsert(payload);
      if (error) {
        console.error("[auth] presence update failed", error);
        return false;
      }

      state.presence.lastSentAt = Date.now();
      window.dispatchEvent(new CustomEvent("ds:presence-updated", {
        detail: { at: state.presence.lastSentAt, page: payload.last_seen_page }
      }));
      return true;
    })();

    try {
      return await state.presence.sending;
    } finally {
      state.presence.sending = null;
    }
  }

  function startPresenceHeartbeat() {
    if (state.presence.timer || !state.user?.id) return;
    markPresenceNow(true).catch((error) => {
      console.error("[auth] initial presence update failed", error);
    });
    state.presence.timer = window.setInterval(() => {
      if (document.hidden) return;
      markPresenceNow().catch((error) => {
        console.error("[auth] presence heartbeat failed", error);
      });
    }, PRESENCE_HEARTBEAT_MS);
  }

  async function fetchPresenceSnapshot() {
    await ready;
    if (!state.client) return { ok: false, players: [], onlineCount: 0, onlineWindowMs: ONLINE_WINDOW_MS };

    const { data, error } = await state.client
      .from("profiles")
      .select("id, display_name, avatar_url, last_seen_at, last_seen_page, player_public_stats(hero_level)")
      .order("last_seen_at", { ascending: false, nullsFirst: false });

    if (error) throw error;

    const now = Date.now();
    const players = (Array.isArray(data) ? data : []).map((row) => {
      const seenAt = row?.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
      const isOnline = seenAt > 0 && (now - seenAt) <= ONLINE_WINDOW_MS;
      return {
        id: String(row?.id || ""),
        name: String(row?.display_name || "Hero").trim() || "Hero",
        avatarUrl: String(row?.avatar_url || "").trim(),
        heroLevel: Math.max(1, Number(row?.player_public_stats?.hero_level || 1) || 1),
        lastSeenAt: row?.last_seen_at || null,
        lastSeenPage: String(row?.last_seen_page || "").trim(),
        isOnline
      };
    });

    return {
      ok: true,
      players,
      onlineCount: players.filter((player) => player.isOnline).length,
      onlineWindowMs: ONLINE_WINDOW_MS
    };
  }

  function isAdmin() {
    return !!state.admin.isAdmin;
  }

  async function invokeAdminGrant(payload = {}) {
    await ready;
    if (!state.client || !state.user?.id) {
      throw new Error("No active session.");
    }

    const isAllowed = await refreshAdminStatus();
    if (!isAllowed) {
      throw new Error("Admin access required.");
    }

    const session = await getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Missing access token.");

    const res = await fetch(`${CONFIG.url}/functions/v1/admin-grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": CONFIG.anonKey
      },
      body: JSON.stringify(payload || {})
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) {
      throw new Error(body?.error || body?.message || `Admin grant failed (${res.status})`);
    }

    if (body?.save && typeof body.save === "object" && String(body?.userId || "") === String(state.user.id || "")) {
      state.cloud.revision = Math.max(Number(state.cloud.revision || 0), Number(body.revision || 0) || 0);
      writeLocalSave(body.save, state.user.id, state.cloud.revision);
      window.dispatchEvent(new Event("ds:save"));
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "synced", revision: state.cloud.revision }
      }));
    }

    return body;
  }

  async function invokeSendItem(payload = {}) {
    await ready;
    if (!state.client || !state.user?.id) {
      throw new Error("No active session.");
    }

    const activeOk = await validateActiveSession({ claimIfMissing: true });
    if (!activeOk) {
      throw new Error("Session replaced on another device.");
    }

    const recipientName = String(payload?.recipientName || "").trim();
    const item = payload?.item && typeof payload.item === "object" ? payload.item : null;
    const quantity = Math.max(1, Math.floor(Number(payload?.quantity) || 1));

    if (!recipientName) throw new Error("Recipient nickname is required.");
    if (!item) throw new Error("Choose an item to send.");

    const { data, error } = await state.client.rpc("send_inventory_item", {
      p_recipient_name: recipientName,
      p_item: item,
      p_quantity: quantity
    });

    if (error) throw new Error(error.message || "Item send failed.");
    if (!data || data.ok !== true) {
      throw new Error(String(data?.error || "Item send failed."));
    }

    const nextSave = data.senderSave && typeof data.senderSave === "object" ? data.senderSave : null;
    const nextRevision = Math.max(1, Number(data.senderRevision || 0) || 1);
    if (nextSave) {
      state.cloud.revision = nextRevision;
      writeLocalSave(nextSave, state.user.id, nextRevision);
      state.cloud.userId = state.user.id;
      state.cloud.ready = true;
      markLocalSaveSynced(Date.now(), nextRevision);
      window.dispatchEvent(new Event("ds:save"));
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "synced", revision: nextRevision, source: "send-item" }
      }));
    }

    return data;
  }

  async function invokeCreateMarketListing(payload = {}) {
    await ready;
    if (!state.client || !state.user?.id) {
      throw new Error("No active session.");
    }

    const activeOk = await validateActiveSession({ claimIfMissing: true });
    if (!activeOk) {
      throw new Error("Session replaced on another device.");
    }

    const item = payload?.item && typeof payload.item === "object" ? payload.item : null;
    const quantity = Math.max(1, Math.floor(Number(payload?.quantity) || 1));
    const priceEach = Math.max(1, Math.floor(Number(payload?.priceEach) || 1));
    if (!item) throw new Error("Choose an item to list.");

    const { data, error } = await state.client.rpc("create_market_listing", {
      p_item: item,
      p_quantity: quantity,
      p_price_each: priceEach
    });
    if (error) throw new Error(error.message || "Market listing failed.");
    if (!data || data.ok !== true) {
      throw new Error(String(data?.error || "Market listing failed."));
    }

    const nextSave = data.sellerSave && typeof data.sellerSave === "object" ? data.sellerSave : null;
    const nextRevision = Math.max(1, Number(data.sellerRevision || 0) || 1);
    if (nextSave) {
      state.cloud.revision = nextRevision;
      writeLocalSave(nextSave, state.user.id, nextRevision);
      state.cloud.userId = state.user.id;
      state.cloud.ready = true;
      markLocalSaveSynced(Date.now(), nextRevision);
      window.dispatchEvent(new Event("ds:save"));
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "synced", revision: nextRevision, source: "market-listing" }
      }));
    }

    return data;
  }

  async function invokeBuyMarketListing(payload = {}) {
    await ready;
    if (!state.client || !state.user?.id) {
      throw new Error("No active session.");
    }

    const activeOk = await validateActiveSession({ claimIfMissing: true });
    if (!activeOk) {
      throw new Error("Session replaced on another device.");
    }

    const listingId = String(payload?.listingId || "").trim();
    const quantity = Math.max(1, Math.floor(Number(payload?.quantity) || 1));
    if (!listingId) throw new Error("Choose a market listing.");

    const { data, error } = await state.client.rpc("buy_market_listing", {
      p_listing_id: listingId,
      p_quantity: quantity
    });
    if (error) throw new Error(error.message || "Market purchase failed.");
    if (!data || data.ok !== true) {
      throw new Error(String(data?.error || "Market purchase failed."));
    }

    const nextSave = data.buyerSave && typeof data.buyerSave === "object" ? data.buyerSave : null;
    const nextRevision = Math.max(1, Number(data.buyerRevision || 0) || 1);
    if (nextSave) {
      state.cloud.revision = nextRevision;
      writeLocalSave(nextSave, state.user.id, nextRevision);
      state.cloud.userId = state.user.id;
      state.cloud.ready = true;
      markLocalSaveSynced(Date.now(), nextRevision);
      window.dispatchEvent(new Event("ds:save"));
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "synced", revision: nextRevision, source: "market-buy" }
      }));
    }

    return data;
  }

  async function invokeCancelMarketListing(payload = {}) {
    await ready;
    if (!state.client || !state.user?.id) {
      throw new Error("No active session.");
    }

    const activeOk = await validateActiveSession({ claimIfMissing: true });
    if (!activeOk) {
      throw new Error("Session replaced on another device.");
    }

    const listingId = String(payload?.listingId || "").trim();
    if (!listingId) throw new Error("Choose a market listing.");

    const { data, error } = await state.client.rpc("cancel_market_listing", {
      p_listing_id: listingId
    });
    if (error) throw new Error(error.message || "Cancel listing failed.");
    if (!data || data.ok !== true) {
      throw new Error(String(data?.error || "Cancel listing failed."));
    }

    const nextSave = data.sellerSave && typeof data.sellerSave === "object" ? data.sellerSave : null;
    const nextRevision = Math.max(1, Number(data.sellerRevision || 0) || 1);
    if (nextSave) {
      state.cloud.revision = nextRevision;
      writeLocalSave(nextSave, state.user.id, nextRevision);
      state.cloud.userId = state.user.id;
      state.cloud.ready = true;
      markLocalSaveSynced(Date.now(), nextRevision);
      window.dispatchEvent(new Event("ds:save"));
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "synced", revision: nextRevision, source: "market-cancel" }
      }));
    }

    return data;
  }

  async function invokePlayerProfile(payload = {}) {
    await ready;
    if (!state.client || !state.user?.id) {
      throw new Error("No active session.");
    }

    const targetUserId = String(payload?.targetUserId || "").trim();
    if (!targetUserId) throw new Error("Player id is required.");

    const { data, error } = await state.client.rpc("get_public_player_profile", {
      p_target_user_id: targetUserId
    });
    if (error) throw new Error(error.message || "Player profile failed.");
    if (!data || data.ok !== true) {
      throw new Error(String(data?.error || "Player profile failed."));
    }

    return data;
  }

  async function invokePartyAction(payload = {}) {
    await ready;
    if (!state.client || !state.user?.id) {
      throw new Error("No active session.");
    }

    const activeOk = await validateActiveSession({ claimIfMissing: true });
    if (!activeOk) {
      throw new Error("Session replaced on another device.");
    }

    const session = await getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Missing access token.");

    const res = await fetch(`${CONFIG.url}/functions/v1/party-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": CONFIG.anonKey
      },
      body: JSON.stringify(payload || {})
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      throw new Error(body?.error || body?.message || `Party action failed (${res.status})`);
    }

    return body;
  }

  async function invokeCreateDarkStoneCheckout(payload = {}) {
    await ready;
    if (!state.client || !state.user?.id) {
      throw new Error("No active session.");
    }

    const activeOk = await validateActiveSession({ claimIfMissing: true });
    if (!activeOk) {
      throw new Error("Session replaced on another device.");
    }

    const session = await getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Missing access token.");

    const res = await fetch(`${CONFIG.url}/functions/v1/create-dark-stone-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": CONFIG.anonKey
      },
      body: JSON.stringify(payload || {})
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      throw new Error(body?.error || body?.message || `Dark Stone checkout failed (${res.status})`);
    }

    return body;
  }

  async function refreshPremiumWallet() {
    await ready;
    if (!state.client || !state.user?.id) {
      throw new Error("No active session.");
    }

    const activeOk = await validateActiveSession({ claimIfMissing: true });
    if (!activeOk) {
      throw new Error("Session replaced on another device.");
    }

    const { data, error } = await state.client
      .from("premium_wallets")
      .select("dark_stones, lifetime_purchased, lifetime_spent")
      .eq("user_id", state.user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Premium wallet refresh failed.");
    }

    const nextSave = readLocalSave();
    nextSave.darkStones = Math.max(0, Number(data?.dark_stones || 0) || 0);
    writeLocalSave(nextSave, state.user.id, state.cloud.revision);
    state.cloud.userId = state.user.id;
    state.cloud.ready = true;
    markLocalSaveSynced();
    window.dispatchEvent(new Event("ds:save"));
    window.dispatchEvent(new CustomEvent("ds:cloud-save", {
      detail: { status: "synced", revision: state.cloud.revision, source: "premium-wallet-refresh" }
    }));

    return {
      ok: true,
      darkStones: nextSave.darkStones,
      lifetimePurchased: Math.max(0, Number(data?.lifetime_purchased || 0) || 0),
      lifetimeSpent: Math.max(0, Number(data?.lifetime_spent || 0) || 0),
    };
  }

  const ready = (async () => {
    if (await checkForAppUpdateOnBoot()) return false;
    if (!isConfigured()) return false;
    if (!window.supabase?.createClient) {
      await loadScript(SUPABASE_SCRIPT_SRC);
    }
    if (!window.supabase?.createClient) {
      throw new Error("Supabase browser client is unavailable.");
    }

    state.client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
        persistSession: true
      }
    });

    const { data } = await state.client.auth.getSession();
    state.session = data?.session || null;
    state.user = data?.session?.user || null;
    ensureClientSessionId(false);
    const pendingClaimRequestedAt = consumePendingActiveSessionClaim();
    if (state.user?.id) {
      if (pendingClaimRequestedAt > 0) {
        const elapsed = Math.max(0, Date.now() - pendingClaimRequestedAt);
        const waitMs = Math.max(0, ACTIVE_SESSION_HANDOFF_GRACE_MS - elapsed);
        if (waitMs > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        }
        await validateActiveSession({ forceClaim: true, resetClientSessionId: true });
      } else {
        await validateActiveSession({ claimIfMissing: true });
      }
    }
    if (state.user?.id) startPresenceHeartbeat();
    startAppVersionPolling();

    state.client.auth.onAuthStateChange((event, session) => {
      state.session = session || null;
      state.user = session?.user || null;
      state.admin.checkedUserId = "";
      state.admin.checked = false;
      state.admin.isAdmin = false;
      state.admin.checking = null;
      state.sessionGuard.invalidated = false;
      state.sessionGuard.checking = null;
      state.sessionGuard.justClaimedActiveSession = false;
      if (!state.user?.id) {
        stopPresenceHeartbeat();
        state.cloud.userId = "";
        state.cloud.ready = false;
        state.cloud.revision = 0;
      } else {
        startPresenceHeartbeat();
      }
      startAppVersionPolling();
      window.dispatchEvent(new CustomEvent("ds:auth", {
        detail: {
          event,
          session: state.session,
          user: state.user
        }
      }));
    });

    return true;
  })();

  async function getSession() {
    await ready;
    if (!state.client) return null;
    const { data } = await state.client.auth.getSession();
    state.session = data?.session || null;
    state.user = data?.session?.user || null;
    return state.session;
  }

  async function requireAuth() {
    if (!isConfigured()) return { ok: false, reason: "not-configured" };

    const session = await getSession();
    if (session?.user) {
      const activeOk = await validateActiveSession({ claimIfMissing: true });
      if (activeOk) return { ok: true, session, user: session.user };
      return { ok: false, reason: "session-replaced" };
    }

    if (currentPage() !== LOGIN_PAGE) {
      sessionStorage.setItem("ds:returnTo", currentRelativeUrl());
      window.location.replace(`${LOGIN_PAGE}?returnTo=${encodeURIComponent(currentRelativeUrl())}`);
    }
    return { ok: false, reason: "no-session" };
  }

  async function signInWithGoogle(returnTo = getReturnTo()) {
    await ready;
    if (!state.client) throw new Error("Supabase auth is not configured.");

    const cleanReturnTo = /^[a-z0-9_.-]+\.html([?#].*)?$/i.test(String(returnTo || "")) ? String(returnTo) : "index.html";
    sessionStorage.setItem("ds:returnTo", cleanReturnTo);
    markPendingActiveSessionClaim();

    const redirectTo = new URL(cleanReturnTo, `${window.location.origin}/`).toString();
    const { error } = await state.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) throw error;
  }

  async function signOut() {
    await ready;
    if (!state.client) return;
    stopPresenceHeartbeat();
    if (state.cloud.syncTimer) {
      window.clearTimeout(state.cloud.syncTimer);
      state.cloud.syncTimer = 0;
    }
    state.sessionGuard.invalidated = false;
    await state.client.auth.signOut({ scope: "local" });
    window.location.replace(LOGIN_PAGE);
  }

  async function redirectIfLoggedIn() {
    const session = await getSession();
    if (!session?.user) return false;
    const target = getReturnTo();
    sessionStorage.removeItem("ds:returnTo");
    window.location.replace(target);
    return true;
  }

  function getUser() {
    return state.user;
  }

  function getClient() {
    return state.client;
  }

  function getUserLabel() {
    const email = String(state.user?.email || "").trim();
    if (email) return email;
    const meta = state.user?.user_metadata || {};
    return String(meta.full_name || meta.name || "Signed In").trim() || "Signed In";
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key, value) => {
    originalSetItem(key, value);
    if (key === SAVE_KEY) {
      if (!state.cloud.suppressSync) markLocalSaveChanged();
      scheduleCloudSaveSync(LOCAL_SAVE_SYNC_DELAY_MS);
    }
  };

  function flushCloudSaveSoon() {
    if (!state.user?.id || !state.cloud.ready || !hasUnsyncedLocalSave()) return;
    syncCloudSaveNow();
  }

  window.addEventListener("pagehide", flushCloudSaveSoon);
  window.addEventListener("pageshow", () => {
    checkForAppUpdateOnBoot({ force: true });
  });
  window.addEventListener("focus", () => {
    checkForAppUpdateOnBoot({ force: true });
  });
  window.addEventListener("online", () => {
    checkForAppUpdateOnBoot({ force: true });
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== APP_VERSION_BROADCAST_KEY) return;
    const latestVersion = String(event.newValue || "").split(":")[0].trim();
    const currentVersion = getCurrentAssetVersion();
    if (latestVersion && latestVersion !== currentVersion) {
      reloadForAppVersion(latestVersion);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushCloudSaveSoon();
    if (document.visibilityState === "visible") checkForAppUpdateOnBoot({ force: true });
  });

  window.DSAuth = {
    config: CONFIG,
    currentPage,
    preparePlayerState,
    getReturnTo,
    getSession,
    getClient,
    getUser,
    getUserLabel,
    getPresencePageLabel,
    isConfigured,
    ready,
    redirectIfLoggedIn,
    requireAuth,
    refreshAdminStatus,
    fetchPresenceSnapshot,
    markPresenceNow,
    signInWithGoogle,
    signOut,
    syncCloudSaveNow,
    isAdmin,
    invokeAdminGrant,
    invokeSendItem,
    invokeCreateMarketListing,
    invokeBuyMarketListing,
    invokeCancelMarketListing,
    invokePlayerProfile,
    invokePartyAction,
    invokeCreateDarkStoneCheckout,
    refreshPremiumWallet
  };
})();
