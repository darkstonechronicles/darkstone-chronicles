const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SAVE_KEY = "darkstone_save_v1";
const SAVE_OWNER_KEY = "darkstone_save_owner_v1";
const SAVE_META_KEY = "darkstone_save_meta_v1";
const USER_ID = "user-1";

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    dump() {
      return Object.fromEntries(store.entries());
    }
  };
}

function tableClient(table, state) {
  const chain = {
    _select: "",
    _filters: {},
    select(columns) {
      this._select = columns || "";
      return this;
    },
    eq(column, value) {
      this._filters[column] = value;
      return this;
    },
    order() {
      return this;
    },
    async maybeSingle() {
      if (table === "player_saves") {
        return { data: state.remoteSaveRow, error: null };
      }
      if (table === "profiles") {
        return {
          data: {
            active_session_id: state.activeSessionId || "",
            active_session_claimed_at: null
          },
          error: null
        };
      }
      if (table === "admin_users") {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
    async update(payload) {
      if (table === "player_saves") {
        state.playerSaveUpdates.push(payload);
        state.remoteSaveRow = {
          ...state.remoteSaveRow,
          ...payload
        };
      }
      if (table === "profiles" && payload.active_session_id) {
        state.activeSessionId = payload.active_session_id;
      }
      return { data: { revision: payload.revision || 1 }, error: null, select: () => chain };
    },
    async upsert(payload) {
      state.upserts.push({ table, payload });
      if (table === "player_saves") {
        state.playerSaveUpserts.push(payload);
        state.remoteSaveRow = {
          save_data: payload.save_data || {},
          revision: payload.revision || 1,
          updated_at: new Date().toISOString()
        };
      }
      if (table === "profiles" && payload.active_session_id) {
        state.activeSessionId = payload.active_session_id;
      }
      return { data: payload, error: null };
    },
    async insert(payload) {
      state.inserts.push({ table, payload });
      return { data: payload, error: null };
    }
  };

  chain.update = (payload) => {
    chain._updatePayload = payload;
    return {
      eq() {
        return this;
      },
      select() {
        return this;
      },
      async maybeSingle() {
        state.playerSaveUpdates.push(payload);
        state.remoteSaveRow = {
          ...state.remoteSaveRow,
          ...payload
        };
        return { data: { revision: payload.revision || 1 }, error: null };
      }
    };
  };

  return chain;
}

async function runScenario({
  name,
  localSave,
  remoteSave,
  localBaseRevision,
  remoteRevision,
  activeSessionId = "",
  lastLocalClientSessionId,
  expectRemoteWins
}) {
  const now = Date.now();
  const meta = {
    lastLocalSaveAt: now,
    lastCloudSyncAt: now - 60_000
  };
  if (localBaseRevision != null) meta.cloudRevision = localBaseRevision;
  if (lastLocalClientSessionId !== undefined) meta.lastLocalClientSessionId = lastLocalClientSessionId;

  const localStorage = createStorage({
    [SAVE_KEY]: JSON.stringify(localSave),
    [SAVE_OWNER_KEY]: USER_ID,
    [SAVE_META_KEY]: JSON.stringify(meta)
  });

  const sessionStorage = createStorage();
  const state = {
    activeSessionId,
    remoteSaveRow: {
      save_data: remoteSave,
      revision: remoteRevision,
      updated_at: new Date().toISOString()
    },
    playerSaveUpdates: [],
    playerSaveUpserts: [],
    upserts: [],
    inserts: []
  };

  const context = {
    console,
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
    Error,
    Promise,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    localStorage,
    sessionStorage,
    alert() {},
    window: null,
    document: null
  };

  context.window = {
    location: {
      pathname: "/index.html",
      search: "",
      hash: "",
      origin: "https://game.test",
      replace(url) {
        this.replacedWith = url;
      }
    },
    crypto: {
      randomUUID() {
        return "client-session-1";
      }
    },
    supabase: {
      createClient() {
        return {
          auth: {
            async getSession() {
              return {
                data: {
                  session: {
                    access_token: "token",
                    user: {
                      id: USER_ID,
                      email: "hero@example.test",
                      user_metadata: {}
                    }
                  }
                }
              };
            },
            onAuthStateChange() {},
            async signOut() {
              return { error: null };
            }
          },
          from(table) {
            return tableClient(table, state);
          }
        };
      }
    },
    addEventListener() {},
    dispatchEvent() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  context.window.window = context.window;
  context.window.localStorage = localStorage;
  context.window.sessionStorage = sessionStorage;
  context.window.console = console;
  context.window.Date = Date;
  context.window.URL = URL;
  context.window.URLSearchParams = URLSearchParams;
  context.window.CustomEvent = function CustomEvent(type, init) {
    return { type, detail: init && init.detail };
  };
  context.window.Event = function Event(type) {
    return { type };
  };

  context.document = {
    hidden: false,
    visibilityState: "visible",
    scripts: [],
    head: { appendChild() {} },
    createElement() {
      return {
        dataset: {},
        addEventListener() {}
      };
    },
    addEventListener() {}
  };
  context.window.document = context.document;
  context.CustomEvent = context.window.CustomEvent;
  context.Event = context.window.Event;

  vm.createContext(context);
  const authSource = fs.readFileSync(path.join(process.cwd(), "auth.js"), "utf8");
  vm.runInContext(authSource, context, { filename: "auth.js" });

  await Promise.race([
    context.window.DSAuth.preparePlayerState(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${name}: preparePlayerState timed out`)), 2000);
    })
  ]);

  const finalSave = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
  const finalMeta = JSON.parse(localStorage.getItem(SAVE_META_KEY) || "{}");

  if (expectRemoteWins) {
    if (finalSave.heroName !== remoteSave.heroName || finalSave.heroLevel !== remoteSave.heroLevel) {
      throw new Error(`${name}: expected remote save to win. Got ${JSON.stringify(finalSave)}`);
    }
    if (state.playerSaveUpdates.length > 0 || state.playerSaveUpserts.length > 0) {
      throw new Error(`${name}: expected no player_saves overwrite from stale local cache.`);
    }
    if (Number(finalMeta.cloudRevision || 0) !== remoteRevision) {
      throw new Error(`${name}: expected local cloudRevision ${remoteRevision}. Got ${JSON.stringify(finalMeta)}`);
    }
  } else {
    if (state.playerSaveUpdates.length !== 1) {
      throw new Error(`${name}: expected one cloud update. Got ${state.playerSaveUpdates.length}`);
    }
    const uploadedSave = state.playerSaveUpdates[0].save_data;
    if (uploadedSave.heroName !== localSave.heroName || uploadedSave.heroLevel !== localSave.heroLevel) {
      throw new Error(`${name}: expected local save to upload. Got ${JSON.stringify(uploadedSave)}`);
    }
    if (Number(finalMeta.cloudRevision || 0) !== remoteRevision + 1) {
      throw new Error(`${name}: expected local cloudRevision ${remoteRevision + 1}. Got ${JSON.stringify(finalMeta)}`);
    }
  }

  console.log(`PASS ${name}`);
}

async function runAll() {
  await runScenario({
    name: "stale local save did not overwrite newer cloud save",
    localSave: {
      heroCreated: true,
      heroName: "OldPC",
      heroLevel: 1,
      gold: 10
    },
    remoteSave: {
      heroCreated: true,
      heroName: "MobileWin",
      heroLevel: 8,
      gold: 999
    },
    localBaseRevision: 1,
    remoteRevision: 2,
    activeSessionId: "",
    expectRemoteWins: true
  });

  await runScenario({
    name: "current local unsynced save uploads to cloud",
    localSave: {
      heroCreated: true,
      heroName: "FreshPC",
      heroLevel: 9,
      gold: 1200
    },
    remoteSave: {
      heroCreated: true,
      heroName: "FreshPC",
      heroLevel: 8,
      gold: 900
    },
    localBaseRevision: 2,
    remoteRevision: 2,
    activeSessionId: "client-session-1",
    expectRemoteWins: false
  });

  await runScenario({
    name: "same pc legacy unsynced save survives hard refresh",
    localSave: {
      heroCreated: true,
      heroName: "SamePC",
      heroLevel: 11,
      gold: 2200
    },
    remoteSave: {
      heroCreated: true,
      heroName: "SamePC",
      heroLevel: 10,
      gold: 1800
    },
    localBaseRevision: null,
    remoteRevision: 4,
    activeSessionId: "client-session-1",
    expectRemoteWins: false
  });

  await runScenario({
    name: "same mobile known-revision unsynced save survives hard refresh",
    localSave: {
      heroCreated: true,
      heroName: "Mobile",
      heroLevel: 14,
      gold: 3300
    },
    remoteSave: {
      heroCreated: true,
      heroName: "Mobile",
      heroLevel: 12,
      gold: 2500
    },
    localBaseRevision: 5,
    remoteRevision: 6,
    activeSessionId: "client-session-1",
    lastLocalClientSessionId: "client-session-1",
    expectRemoteWins: false
  });

  process.exitCode = 0;
  process.exit();
}

runAll().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
  process.exit();
});
