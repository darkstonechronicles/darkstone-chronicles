const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = process.cwd();
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4173;
const DEBUG_PORT = 9333;

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
  }[ext] || "application/octet-stream";
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.resolve(ROOT, `.${requested}`);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, body) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": "no-store" });
      res.end(body);
    });
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

async function waitForJson(url, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];

  ws.addEventListener("message", (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message || JSON.stringify(data.error)));
      else resolve(data.result || {});
      return;
    }
    events.push(data);
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        events,
        send(method, params = {}) {
          const nextId = ++id;
          ws.send(JSON.stringify({ id: nextId, method, params }));
          return new Promise((res, rej) => pending.set(nextId, { resolve: res, reject: rej }));
        },
        close() {
          ws.close();
        }
      });
    }, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}

const preload = `
(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const OWNER_KEY = "darkstone_save_owner_v1";
  const META_KEY = "darkstone_save_meta_v1";
  const SESSION_KEY = "darkstone_active_client_session_v1";
  const userId = "smoke-user";
  const localSave = { heroCreated: true, heroName: "SamePC", playerName: "SamePC", heroLevel: 11, heroXP: 42, gold: 2200, inventory: [] };
  const remoteSave = { heroCreated: true, heroName: "SamePC", playerName: "SamePC", heroLevel: 10, heroXP: 10, gold: 1800, inventory: [] };
  if (!localStorage.getItem(SAVE_KEY)) localStorage.setItem(SAVE_KEY, JSON.stringify(localSave));
  if (!localStorage.getItem(OWNER_KEY)) localStorage.setItem(OWNER_KEY, userId);
  if (!localStorage.getItem(META_KEY)) localStorage.setItem(META_KEY, JSON.stringify({ lastLocalSaveAt: Date.now(), lastCloudSyncAt: Date.now() - 60000 }));
  localStorage.setItem(SESSION_KEY, "client-session-1");
  const remoteStorageKey = "__dsSmokeRemote";
  const initialRemote = { save_data: remoteSave, revision: 4, updated_at: new Date().toISOString() };
  const savedRemote = JSON.parse(localStorage.getItem(remoteStorageKey) || "null") || initialRemote;
  window.__dsSmoke = { playerSaveUpdates: [], playerSaveUpserts: [], remoteStorageKey, remoteSaveRow: savedRemote };
  window.crypto = window.crypto || {};
  window.crypto.randomUUID = () => "client-session-1";
  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : String(input?.url || "");
    if (url.includes("/functions/v1/save-backup")) {
      const body = JSON.parse(String(init?.body || "{}") || "{}");
      return new Response(JSON.stringify({
        ok: true,
        revision: Number(body?.revision || 1) || 1,
        reason: String(body?.reason || "sync")
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.includes("/functions/v1/party-action")) {
      return new Response(JSON.stringify({
        ok: true,
        myParty: null,
        invites: [],
        requests: [],
        parties: []
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.includes("/functions/v1/action-journal")) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.includes("/functions/v1/admin-grant") || url.includes("/functions/v1/create-dark-stone-checkout")) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (nativeFetch) return nativeFetch(input, init);
    throw new Error("fetch is not available");
  };

  function resultFor(table) {
    if (table === "player_saves") return window.__dsSmoke.remoteSaveRow;
    if (table === "profiles") return { id: userId, email: "smoke@example.test", display_name: "SamePC", active_session_id: "client-session-1", active_session_claimed_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), last_seen_page: "Home" };
    if (table === "player_public_stats") return [];
    if (table === "chat_messages") return [];
    if (table === "admin_users") return null;
    return [];
  }

  function query(table) {
    const chain = {
      select() { return this; },
      eq() { return this; },
      gt() { return this; },
      neq() { return this; },
      in() { return this; },
      order() { return this; },
      limit() { return this; },
      range() { return this; },
      single() { return Promise.resolve({ data: resultFor(table), error: null }); },
      maybeSingle() { return Promise.resolve({ data: resultFor(table), error: null }); },
      insert(payload) { return Promise.resolve({ data: payload, error: null }); },
      upsert(payload) {
        if (table === "player_saves") {
          window.__dsSmoke.playerSaveUpserts.push(payload);
          window.__dsSmoke.remoteSaveRow = { save_data: payload.save_data || {}, revision: payload.revision || 1, updated_at: new Date().toISOString() };
          localStorage.setItem(window.__dsSmoke.remoteStorageKey, JSON.stringify(window.__dsSmoke.remoteSaveRow));
        }
        return Promise.resolve({ data: payload, error: null });
      },
      update(payload) {
        return {
          eq() { return this; },
          select() { return this; },
          maybeSingle() {
            if (table === "player_saves") {
              window.__dsSmoke.playerSaveUpdates.push(payload);
              window.__dsSmoke.remoteSaveRow = { ...window.__dsSmoke.remoteSaveRow, ...payload };
              localStorage.setItem(window.__dsSmoke.remoteStorageKey, JSON.stringify(window.__dsSmoke.remoteSaveRow));
            }
            return Promise.resolve({ data: { revision: payload.revision || 1 }, error: null });
          }
        };
      },
      then(resolve, reject) {
        const value = resultFor(table);
        return Promise.resolve({ data: Array.isArray(value) ? value : (value ? [value] : []), error: null }).then(resolve, reject);
      }
    };
    return chain;
  }

  window.supabase = {
    createClient() {
      return {
        auth: {
          getSession: () => Promise.resolve({ data: { session: { access_token: "smoke-token", user: { id: userId, email: "smoke@example.test", user_metadata: {} } } } }),
          onAuthStateChange() {},
          signOut: () => Promise.resolve({ error: null })
        },
        from: query,
        rpc: () => Promise.resolve({ data: { ok: true }, error: null }),
        channel: () => ({ on() { return this; }, subscribe(cb) { if (cb) setTimeout(() => cb("SUBSCRIBED"), 0); return this; }, send: () => Promise.resolve("ok") }),
        removeChannel: () => Promise.resolve("ok")
      };
    }
  };
})();
`;

async function main() {
  if (!fs.existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}`);
  const server = await startServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ds-smoke-"));
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "about:blank"
  ], { stdio: "ignore" });

  try {
    const version = await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const cdp = await connectCdp(version.webSocketDebuggerUrl);
    await cdp.send("Target.createTarget", { url: "about:blank" });
    const targets = await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
    const pageTarget = targets.find((target) => target.type === "page" && target.url === "about:blank") || targets.find((target) => target.type === "page");
    const page = await connectCdp(pageTarget.webSocketDebuggerUrl);

    await page.send("Runtime.enable");
    await page.send("Page.enable");
    await page.send("Log.enable");
    await page.send("Page.addScriptToEvaluateOnNewDocument", { source: preload });
    await page.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/index.html` });
    await new Promise((resolve) => setTimeout(resolve, 4500));
    await page.send("Runtime.evaluate", {
      expression: `(() => {
        const key = "darkstone_save_v1";
        const save = JSON.parse(localStorage.getItem(key) || "{}");
        save.heroLevel = 12;
        save.heroXP = 99;
        save.gold = 2600;
        localStorage.setItem(key, JSON.stringify(save));
        return true;
      })()`,
      returnByValue: true
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
    await page.send("Page.reload", { ignoreCache: true });
    await new Promise((resolve) => setTimeout(resolve, 4500));

    const result = await page.send("Runtime.evaluate", {
      expression: `JSON.stringify({
        href: location.href,
        title: document.title,
        bootReady: document.documentElement.classList.contains("ds-boot-ready"),
        heroLevel: JSON.parse(localStorage.getItem("darkstone_save_v1") || "{}").heroLevel,
        cloudRevision: JSON.parse(localStorage.getItem("darkstone_save_meta_v1") || "{}").cloudRevision,
        updates: window.__dsSmoke.playerSaveUpdates.length,
        bodyText: document.body.innerText.slice(0, 300)
      })`,
      returnByValue: true
    });
    const summary = JSON.parse(result.result.value);
    const isRelevantError = (event) => {
      const entryUrl = String(event.params?.entry?.url || "");
      if (entryUrl.endsWith("/favicon.ico")) return false;
      if (event.method === "Runtime.exceptionThrown") return true;
      if (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params?.entry?.level)) return true;
      if (event.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(event.params?.type)) return true;
      return false;
    };
    const errors = page.events.filter(isRelevantError);

    if (!summary.bootReady) throw new Error(`Game did not finish booting: ${JSON.stringify(summary)}`);
    if (summary.heroLevel !== 12) throw new Error(`Expected same-PC local progression to survive reload. Got ${JSON.stringify(summary)}`);
    if (summary.updates < 1) throw new Error(`Expected local progression to sync upward. Got ${JSON.stringify(summary)}`);
    if (errors.length) {
      throw new Error(`Browser reported ${errors.length} errors/warnings: ${JSON.stringify(errors.slice(0, 5))}`);
    }

    const pages = [
      {
        path: "create_character.html",
        validate(pageSummary) {
          const href = String(pageSummary.href || "");
          const title = String(pageSummary.title || "");
          if (href.endsWith("/create_character.html")) return title.includes("Create Character");
          return href.endsWith("/index.html") && title.includes("Darkstone Chronicles");
        },
        expected: "Create Character title or redirect back to index when a hero already exists"
      },
      {
        path: "dungeons.html",
        validate(pageSummary) {
          return String(pageSummary.title || "").includes("Dungeons");
        },
        expected: "Dungeons title"
      },
      {
        path: "forge.html",
        validate(pageSummary) {
          return String(pageSummary.title || "").includes("Forge");
        },
        expected: "Forge title"
      },
      {
        path: "jewelcrafting.html",
        validate(pageSummary) {
          return String(pageSummary.title || "").includes("Jewelcrafting");
        },
        expected: "Jewelcrafting title"
      },
      {
        path: "market.html",
        validate(pageSummary) {
          return String(pageSummary.title || "").includes("Market");
        },
        expected: "Market title"
      }
    ];

    for (const target of pages) {
      const errorBaseline = page.events.length;
      await page.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/${target.path}` });
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const inspection = await page.send("Runtime.evaluate", {
        expression: `JSON.stringify((() => {
          const imgs = Array.from(document.images || []);
          const broken = imgs
            .filter((img) => {
              const src = String(img.getAttribute("src") || img.src || "");
              if (!src || src.endsWith("/favicon.ico")) return false;
              const style = window.getComputedStyle(img);
              if (style.display === "none" || style.visibility === "hidden") return false;
              return !img.complete || img.naturalWidth === 0;
            })
            .map((img) => String(img.getAttribute("src") || img.src || ""));
          return {
            href: location.href,
            title: document.title,
            bootReady: document.documentElement.classList.contains("ds-boot-ready"),
            broken,
            bodyText: document.body.innerText.slice(0, 180)
          };
        })())`,
        returnByValue: true
      });
      const pageSummary = JSON.parse(inspection.result.value);
      const newErrors = page.events.slice(errorBaseline).filter(isRelevantError);
      if (!pageSummary.bootReady) throw new Error(`Page did not finish booting: ${target.path} ${JSON.stringify(pageSummary)}`);
      if (typeof target.validate === "function" && !target.validate(pageSummary)) {
        throw new Error(`Unexpected page state on ${target.path} (expected ${target.expected}): ${JSON.stringify(pageSummary)}`);
      }
      if (pageSummary.broken.length) {
        throw new Error(`Broken images on ${target.path}: ${JSON.stringify(pageSummary.broken.slice(0, 10))}`);
      }
      if (newErrors.length) {
        throw new Error(`Browser errors on ${target.path}: ${JSON.stringify(newErrors.slice(0, 5))}`);
      }
      console.log(`PASS page smoke ${target.path} ${JSON.stringify(pageSummary)}`);
    }

    console.log(`PASS browser hard-refresh smoke ${JSON.stringify(summary)}`);
    page.close();
    cdp.close();
  } finally {
    try {
      spawnSync("taskkill", ["/PID", String(chrome.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      chrome.kill();
    }
    server.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
