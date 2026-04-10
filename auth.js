(() => {
  const LOGIN_PAGE = "login.html";
  const SAVE_KEY = "darkstone_save_v1";
  const SAVE_OWNER_KEY = "darkstone_save_owner_v1";
  const SUPABASE_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
  const CONFIG = {
    url: "https://ibpwrvtsnuhbylexuoil.supabase.co",
    anonKey: "sb_publishable_TLEC6vRVLjVzDOsmbXs4uA_X0MUXTYi"
  };

  const state = {
    client: null,
    session: null,
    user: null,
    cloud: {
      userId: "",
      ready: false,
      preparing: null,
      syncing: false,
      syncTimer: 0,
      revision: 0,
      suppressSync: false
    }
  };

  function isConfigured() {
    return /^https?:\/\//i.test(String(CONFIG.url || "").trim()) &&
      !String(CONFIG.anonKey || "").includes("PASTE_YOUR_SUPABASE_ANON_KEY_HERE");
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
    return String(window.location.pathname || "").split("/").pop().toLowerCase() || "index.html";
  }

  function currentRelativeUrl() {
    const page = currentPage();
    return `${page}${window.location.search || ""}${window.location.hash || ""}`;
  }

  function getReturnTo() {
    const params = new URLSearchParams(window.location.search || "");
    const queryTarget = String(params.get("returnTo") || "").trim();
    const storedTarget = String(sessionStorage.getItem("ds:returnTo") || "").trim();
    const target = queryTarget || storedTarget || "index.html";
    if (!/^[a-z0-9_.-]+\.html([?#].*)?$/i.test(target)) return "index.html";
    return target;
  }

  function readLocalSave() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function writeLocalSave(save, ownerId = "") {
    state.cloud.suppressSync = true;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save && typeof save === "object" ? save : {}));
      if (ownerId) localStorage.setItem(SAVE_OWNER_KEY, ownerId);
    } finally {
      state.cloud.suppressSync = false;
    }
  }

  function getLocalOwnerId() {
    return String(localStorage.getItem(SAVE_OWNER_KEY) || "").trim();
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

  async function syncCloudSaveNow() {
    if (!state.client || !state.user?.id || state.cloud.syncing || !state.cloud.ready) return;
    state.cloud.syncing = true;
    try {
      const localSave = readLocalSave();
      const stats = buildPublicStats(localSave, state.user);
      const nextRevision = Math.max(1, Number(state.cloud.revision || 0) + 1);

      const { error: saveError } = await state.client.from("player_saves").upsert({
        user_id: state.user.id,
        save_data: localSave,
        revision: nextRevision,
        last_synced_at: new Date().toISOString()
      });
      if (saveError) throw saveError;

      const { error: statsError } = await state.client.from("player_public_stats").upsert({
        user_id: state.user.id,
        ...stats
      });
      if (statsError) throw statsError;

      state.cloud.revision = nextRevision;
      localStorage.setItem(SAVE_OWNER_KEY, state.user.id);
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "synced", revision: nextRevision }
      }));
    } catch (error) {
      console.error("[auth] cloud save sync failed", error);
      window.dispatchEvent(new CustomEvent("ds:cloud-save", {
        detail: { status: "error", error: error?.message || String(error) }
      }));
    } finally {
      state.cloud.syncing = false;
    }
  }

  function scheduleCloudSaveSync() {
    if (!state.user?.id || !state.cloud.ready || state.cloud.suppressSync) return;
    if (state.cloud.syncTimer) window.clearTimeout(state.cloud.syncTimer);
    state.cloud.syncTimer = window.setTimeout(() => {
      state.cloud.syncTimer = 0;
      syncCloudSaveNow();
    }, 900);
  }

  async function preparePlayerState() {
    await ready;
    if (!state.client || !state.user?.id) return { ok: false, reason: "no-session" };
    if (state.cloud.ready && state.cloud.userId === state.user.id) return { ok: true };
    if (state.cloud.preparing) return state.cloud.preparing;

    state.cloud.preparing = (async () => {
      const localSave = readLocalSave();
      const localOwnerId = getLocalOwnerId();
      const remote = await fetchRemoteSave();
      const remoteSave = remote?.save_data && typeof remote.save_data === "object" ? remote.save_data : {};
      const remoteHasSave = hasMeaningfulSave(remoteSave);
      const localHasSave = hasMeaningfulSave(localSave);
      const ownerMatches = !localOwnerId || localOwnerId === state.user.id;

      if (remoteHasSave) {
        writeLocalSave(remoteSave, state.user.id);
        state.cloud.revision = Number(remote?.revision || 1) || 1;
      } else if (localHasSave && ownerMatches) {
        await upsertProfileAndStats(localSave);
        const { error: saveError } = await state.client.from("player_saves").upsert({
          user_id: state.user.id,
          save_data: localSave,
          revision: 1,
          last_synced_at: new Date().toISOString()
        });
        if (saveError) throw saveError;
        state.cloud.revision = 1;
        localStorage.setItem(SAVE_OWNER_KEY, state.user.id);
      } else {
        if (!ownerMatches) {
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

  const ready = (async () => {
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

    state.client.auth.onAuthStateChange((event, session) => {
      state.session = session || null;
      state.user = session?.user || null;
      if (!state.user?.id) {
        state.cloud.userId = "";
        state.cloud.ready = false;
        state.cloud.revision = 0;
      }
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
    if (session?.user) return { ok: true, session, user: session.user };

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
    if (state.cloud.syncTimer) {
      window.clearTimeout(state.cloud.syncTimer);
      state.cloud.syncTimer = 0;
    }
    await state.client.auth.signOut();
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

  function getUserLabel() {
    const email = String(state.user?.email || "").trim();
    if (email) return email;
    const meta = state.user?.user_metadata || {};
    return String(meta.full_name || meta.name || "Signed In").trim() || "Signed In";
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key, value) => {
    originalSetItem(key, value);
    if (key === SAVE_KEY) scheduleCloudSaveSync();
  };

  window.DSAuth = {
    config: CONFIG,
    currentPage,
    preparePlayerState,
    getReturnTo,
    getSession,
    getUser,
    getUserLabel,
    isConfigured,
    ready,
    redirectIfLoggedIn,
    requireAuth,
    signInWithGoogle,
    signOut,
    syncCloudSaveNow
  };
})();
