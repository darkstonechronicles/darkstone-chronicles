(() => {
  const SAVE_KEY = "darkstone_save_v1";
  const CHANNEL = "darkstone-party-hall";
  const MAX_MEMBERS = 4;
  const OPEN_TTL = 30000;
  const OPEN_PING_MS = 12000;
  const ACTIVITIES = ["Idle", "Mining Expedition", "Dungeon Run", "Boss Hunt"];
  const DEFAULT_BONUSES = ["+10% XP", "+8% Loot Chance", "+5% Resource Gain"];

  const state = {
    tab: "my_party",
    selectedPartyId: null,
    channel: null,
    open: new Map(),
    pingTimer: 0,
    cleanTimer: 0
  };

  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function loadSave(){ try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; } catch { return {}; } }
  function setSave(next){ localStorage.setItem(SAVE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("ds:save")); }
  function ensureSave(save){
    save = save && typeof save === "object" ? save : {};
    if (!save.partyHall || typeof save.partyHall !== "object") save.partyHall = {};
    if (!Array.isArray(save.partyHall.invites)) save.partyHall.invites = [];
    if (!save.partyHall.party || typeof save.partyHall.party !== "object") save.partyHall.party = null;
    return save;
  }
  function sameName(a, b){ return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase(); }
  function hero(save = ensureSave(loadSave())){
    return {
      id: String(window.DSAuth?.getUser?.()?.id || "").trim(),
      name: String(save.heroName || save.playerName || "Hero").trim() || "Hero",
      portrait: String(save.heroPortrait || "images/hero.png").trim() || "images/hero.png",
      level: Math.max(1, num(save.heroLevel, 1))
    };
  }
  function normalizeParty(p){
    if (!p || typeof p !== "object") return null;
    const party = { ...p };
    party.id = String(party.id || "").trim() || `party-${Date.now()}`;
    party.name = String(party.name || "Party").trim() || "Party";
    party.status = String(party.status || "Private").trim() || "Private";
    party.activity = String(party.activity || "Idle").trim() || "Idle";
    party.maxMembers = Math.max(1, num(party.maxMembers, MAX_MEMBERS));
    party.minLevel = Math.max(1, num(party.minLevel, 1));
    party.autoAcceptRequests = !!party.autoAcceptRequests;
    party.bonuses = Array.isArray(party.bonuses) && party.bonuses.length ? party.bonuses : [...DEFAULT_BONUSES];
    party.members = Array.isArray(party.members) ? party.members.map((m) => ({
      id: String(m?.id || "").trim(),
      name: String(m?.name || "").trim() || "Hero",
      portrait: String(m?.portrait || "images/hero.png").trim() || "images/hero.png",
      role: m?.role === "leader" ? "leader" : "member",
      ready: !!m?.ready
    })) : [];
    party.leaderName = String(party.leaderName || party.members.find((m) => m.role === "leader")?.name || "").trim();
    return party;
  }
  function party(save = ensureSave(loadSave())){ return normalizeParty(save.partyHall.party); }
  function role(save = ensureSave(loadSave())){
    const p = party(save); const h = hero(save);
    const me = p?.members?.find((m) => sameName(m.name, h.name));
    return me?.role === "leader" ? "leader" : (me ? "member" : "none");
  }

  function ensurePopupHost() {
    let host = document.getElementById("dsPartyPopupHost");
    if (host) return host;
    host = document.createElement("div");
    host.id = "dsPartyPopupHost";
    host.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:260;display:flex;flex-direction:column;gap:12px;pointer-events:none;";
    document.body.appendChild(host);
    return host;
  }

  function rerenderIfVisible() {
    if (document.getElementById("partyHallCard")) renderPartyHall();
    renderInvitePopups();
  }

  function updateOpen(p, seenAt = Date.now()) {
    const partyData = normalizeParty(p);
    if (!partyData) return;
    if (String(partyData.status).toLowerCase() !== "open") {
      state.open.delete(partyData.id);
      return;
    }
    state.open.set(partyData.id, {
      id: partyData.id,
      name: partyData.name,
      leaderName: partyData.leaderName,
      members: partyData.members.length,
      maxMembers: partyData.maxMembers,
      activity: partyData.activity,
      requirement: `Level ${partyData.minLevel}+`,
      status: partyData.status,
      bonuses: partyData.bonuses,
      party: partyData,
      seenAt
    });
  }

  function cleanupOpen() {
    const now = Date.now();
    for (const [id, entry] of state.open.entries()) if (now - num(entry.seenAt, 0) > OPEN_TTL) state.open.delete(id);
  }

  async function playerDirectory() {
    try {
      const snap = await window.DSAuth?.fetchPresenceSnapshot?.();
      return Array.isArray(snap?.players) ? snap.players : [];
    } catch { return []; }
  }

  function syncFromRemote(p) {
    const save = ensureSave(loadSave());
    const h = hero(save);
    const local = party(save);
    const includesMe = p.members.some((m) => sameName(m.name, h.name));
    const sameParty = local && String(local.id) === String(p.id);
    if (includesMe || sameParty) {
      save.partyHall.party = includesMe ? p : null;
      setSave(save);
    }
  }

  function channel() {
    const client = window.DSAuth?.getClient?.();
    if (!client) return null;
    if (state.channel) return state.channel;
    state.channel = client.channel(CHANNEL, { config: { broadcast: { self: true } } });
    state.channel
      .on("broadcast", { event: "party_state" }, ({ payload }) => {
        const p = normalizeParty(payload?.party); if (!p) return;
        updateOpen(p); syncFromRemote(p); rerenderIfVisible();
      })
      .on("broadcast", { event: "party_disband" }, ({ payload }) => {
        const id = String(payload?.partyId || "").trim();
        state.open.delete(id);
        const save = ensureSave(loadSave());
        if (save.partyHall.party?.id === id) { save.partyHall.party = null; setSave(save); }
        rerenderIfVisible();
      })
      .on("broadcast", { event: "party_invite" }, ({ payload }) => onInvite(payload))
      .on("broadcast", { event: "party_join_request" }, ({ payload }) => onJoinRequest(payload))
      .on("broadcast", { event: "party_invite_response" }, ({ payload }) => onInviteResponse(payload))
      .subscribe();
    return state.channel;
  }

  async function send(event, payload) {
    const ch = channel();
    if (!ch) return false;
    try {
      await ch.send({ type: "broadcast", event, payload: payload || {} });
      return true;
    } catch (e) {
      console.error("[party] broadcast failed", event, e);
      return false;
    }
  }

  function addInvite(save, invite) {
    const key = `${invite.partyId}::${String(invite.fromName || "").toLowerCase()}`;
    save.partyHall.invites = (save.partyHall.invites || []).filter((entry) => `${entry.partyId}::${String(entry.fromName || "").toLowerCase()}` !== key);
    save.partyHall.invites.unshift(invite);
    save.partyHall.invites = save.partyHall.invites.slice(0, 8);
  }

  function removeInvite(save, inviteId) {
    save.partyHall.invites = (save.partyHall.invites || []).filter((entry) => String(entry.id || "") !== String(inviteId || ""));
  }

  async function onInvite(payload) {
    const save = ensureSave(loadSave());
    const h = hero(save);
    if (!sameName(payload?.toName, h.name)) return;
    if (save.partyHall.party) return;
    const p = normalizeParty(payload?.party);
    if (!p) return;
    addInvite(save, {
      id: String(payload?.inviteId || `${p.id}-${Date.now()}`),
      partyId: p.id,
      fromName: String(payload?.fromName || p.leaderName || "Leader").trim() || "Leader",
      partyName: p.name,
      membersText: `${p.members.length} / ${p.maxMembers}`,
      activity: p.activity,
      party: p
    });
    setSave(save);
    rerenderIfVisible();
  }

  async function onJoinRequest(payload) {
    const save = ensureSave(loadSave());
    const p = party(save);
    const h = hero(save);
    if (!p) return;
    if (!sameName(p.leaderName, h.name)) return;
    if (String(payload?.partyId || "") !== String(p.id || "")) return;
    const player = payload?.player || {};
    if (!String(player.name || "").trim()) return;
    if (p.members.some((m) => sameName(m.name, player.name))) return;
    if (p.members.length >= p.maxMembers) return;
    if (String(payload?.mode || "open") === "open" && String(p.status).toLowerCase() !== "open") return;
    p.members.push({
      id: String(player.id || "").trim(),
      name: String(player.name || "").trim(),
      portrait: String(player.portrait || "images/hero.png").trim() || "images/hero.png",
      role: "member",
      ready: false
    });
    save.partyHall.party = p;
    setSave(save);
    await send("party_state", { party: p });
  }

  async function onInviteResponse(payload) {
    if (String(payload?.response || "") !== "accept") return;
    await onJoinRequest({
      partyId: payload?.partyId,
      mode: "invite",
      player: payload?.player
    });
  }

  async function broadcastPartyState() {
    cleanupOpen();
    const save = ensureSave(loadSave());
    const p = party(save);
    if (!p || role(save) !== "leader") return;
    updateOpen(p);
    await send("party_state", { party: p });
  }

  function startTimers() {
    if (!state.pingTimer) state.pingTimer = window.setInterval(() => { broadcastPartyState(); }, OPEN_PING_MS);
    if (!state.cleanTimer) state.cleanTimer = window.setInterval(() => { cleanupOpen(); if (document.getElementById("partyFindList")) renderFindPartyCards(); }, 5000);
  }

  async function createParty() {
    const save = ensureSave(loadSave());
    const h = hero(save);
    const name = String(document.getElementById("partyCreateName")?.value || "").trim() || `${h.name}'s Party`;
    const status = String(document.querySelector('input[name="partyTypeCreate"]:checked')?.value || "Private");
    save.partyHall.party = normalizeParty({
      id: `party-${h.id || h.name}-${Date.now()}`,
      name,
      leaderName: h.name,
      status,
      activity: "Idle",
      maxMembers: MAX_MEMBERS,
      minLevel: h.level,
      autoAcceptRequests: false,
      bonuses: [...DEFAULT_BONUSES],
      members: [{ id: h.id, name: h.name, portrait: h.portrait, role: "leader", ready: true }]
    });
    setSave(save);
    state.tab = "my_party";
    await broadcastPartyState();
    renderPartyHall();
  }

  async function leaveParty() {
    const save = ensureSave(loadSave());
    const p = party(save);
    const h = hero(save);
    const myRole = role(save);
    if (!p) return;
    if (myRole === "leader") {
      save.partyHall.party = null;
      setSave(save);
      state.open.delete(p.id);
      await send("party_disband", { partyId: p.id });
      renderPartyHall();
      return;
    }
    p.members = p.members.filter((m) => !sameName(m.name, h.name));
    save.partyHall.party = null;
    setSave(save);
    await send("party_state", { party: p });
    renderPartyHall();
  }

  async function toggleReady() {
    const save = ensureSave(loadSave());
    const p = party(save);
    const h = hero(save);
    if (!p) return;
    const me = p.members.find((m) => sameName(m.name, h.name));
    if (!me) return;
    me.ready = !me.ready;
    save.partyHall.party = p;
    setSave(save);
    await send("party_state", { party: p });
    renderPartyHall();
  }

  async function updateLeaderSetting(kind, value) {
    const save = ensureSave(loadSave());
    const p = party(save);
    if (!p) return;
    if (kind === "status") p.status = value;
    if (kind === "activity") p.activity = value;
    if (kind === "minLevel") p.minLevel = Math.max(1, num(value, 1));
    if (kind === "autoAcceptRequests") p.autoAcceptRequests = !!value;
    save.partyHall.party = p;
    setSave(save);
    await send("party_state", { party: p });
    renderPartyHall();
  }

  async function sendInvite() {
    const save = ensureSave(loadSave());
    const p = party(save);
    const h = hero(save);
    const msg = document.getElementById("partyHallMsg");
    if (!p) return;
    const nickname = String(document.getElementById("partyInviteName")?.value || "").trim();
    if (!nickname) { if (msg) msg.textContent = "Write a nickname first."; return; }
    if (sameName(nickname, h.name)) { if (msg) msg.textContent = "You cannot invite yourself."; return; }
    const players = await playerDirectory();
    const target = players.find((player) => sameName(player.name, nickname));
    if (!target) { if (msg) msg.textContent = "Nickname not found."; return; }
    await send("party_invite", {
      inviteId: `${p.id}-${Date.now()}`,
      fromName: h.name,
      toName: target.name,
      party: p
    });
    if (msg) msg.textContent = `Invite sent to ${target.name}.`;
    const input = document.getElementById("partyInviteName");
    if (input) input.value = "";
  }

  async function requestJoin(partyId) {
    const entry = state.open.get(partyId);
    const save = ensureSave(loadSave());
    const h = hero(save);
    const msg = document.getElementById("partyHallMsg");
    if (!entry || !entry.party) return;
    if (save.partyHall.party) { if (msg) msg.textContent = "You are already in a party."; return; }
    if (msg) msg.textContent = `Join request sent to ${entry.name}.`;
    await send("party_join_request", {
      partyId,
      mode: "open",
      player: { id: h.id, name: h.name, portrait: h.portrait }
    });
  }

  async function acceptInviteById(inviteId) {
    const save = ensureSave(loadSave());
    const invite = (save.partyHall.invites || []).find((entry) => String(entry.id || "") === String(inviteId || ""));
    const h = hero(save);
    if (!invite) return;
    removeInvite(save, invite.id);
    setSave(save);
    await send("party_invite_response", {
      partyId: invite.partyId,
      response: "accept",
      player: { id: h.id, name: h.name, portrait: h.portrait }
    });
    rerenderIfVisible();
  }

  function declineInviteById(inviteId) {
    const save = ensureSave(loadSave());
    removeInvite(save, inviteId);
    setSave(save);
    rerenderIfVisible();
  }

  function tabsMarkup() {
    const tabs = [["my_party", "My Party"], ["find_party", "Find Party"], ["invites", "Invites"]];
    return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">${tabs.map(([id, label]) => `<button type="button" data-party-tab="${id}" style="min-width:128px;padding:10px 14px;border-radius:10px;border:2px solid ${state.tab === id ? "#c79b44" : "#333"};background:${state.tab === id ? "linear-gradient(180deg, rgba(255,245,210,.16), rgba(255,255,255,.04) 36%, rgba(0,0,0,.10) 100%), linear-gradient(180deg, #6f5320 0%, #3e2d11 100%)" : "#1b1b24"};color:#f1f2f6;font-weight:800;cursor:pointer;">${label}</button>`).join("")}</div>`;
  }

  function memberRowsMarkup(p) {
    const rows = [];
    for (let i = 0; i < p.maxMembers; i += 1) {
      const m = p.members[i];
      if (!m) {
        rows.push(`<div style="padding:16px 12px;border:1px dashed rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.01);opacity:.7;">[Empty Slot]</div>`);
        continue;
      }
      rows.push(`<div style="display:grid;grid-template-columns:52px 1fr auto auto;gap:12px;align-items:center;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02);"><img src="${esc(m.portrait)}" alt="${esc(m.name)}" style="width:52px;height:52px;border-radius:12px;border:2px solid #333;object-fit:cover;"><div style="font-weight:800;">${esc(m.name)}</div><div style="opacity:.82;">${m.role === "leader" ? "Leader" : "Member"}</div><div style="color:${m.ready ? "#9df0aa" : "#d6c7a1"};font-weight:800;">[${m.ready ? "Ready" : "Not Ready"}]</div></div>`);
    }
    return rows.join("");
  }

  function noPartyMarkup() {
    return `<section style="display:grid;gap:14px;"><div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);text-align:center;"><div style="font-size:18px;font-weight:800;margin-bottom:8px;">No Active Party</div><div style="opacity:.82;">You are not currently in a party.</div></div><div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:16px;font-weight:800;margin-bottom:12px;">Create Party</div><div style="display:grid;gap:14px;max-width:520px;"><div><div style="font-weight:800;margin-bottom:8px;">Party Type:</div><label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><input type="radio" name="partyTypeCreate" value="Private" checked> Private</label><label style="display:flex;align-items:center;gap:8px;"><input type="radio" name="partyTypeCreate" value="Open"> Open</label></div><div><div style="font-weight:800;margin-bottom:8px;">Party Name:</div><input id="partyCreateName" type="text" value="Dark Hunters" style="width:100%;max-width:320px;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;"></div><div><button id="partyCreateBtn" type="button">Create Party</button></div></div></div><div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:15px;font-weight:800;margin-bottom:10px;">Quick Info</div><div style="display:grid;gap:4px;opacity:.9;"><div>- Max members: 4</div><div>- You can only be in one party</div><div>- Open parties appear in Find Party</div></div></div></section>`;
  }

  function leaderMarkup(p) {
    return `<div style="display:grid;gap:14px;"><section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 16px;"><div><strong>Party Name:</strong> ${esc(p.name)}</div><div><strong>Leader:</strong> You</div><div><strong>Members:</strong> ${p.members.length} / ${p.maxMembers}</div><div><strong>Status:</strong> ${esc(p.status)}</div><div><strong>Activity:</strong> ${esc(p.activity)}</div></section><section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:15px;font-weight:800;margin-bottom:10px;">Members</div><div style="display:grid;gap:10px;">${memberRowsMarkup(p)}</div></section><section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:15px;font-weight:800;margin-bottom:10px;">Party Actions</div><div style="display:flex;gap:10px;flex-wrap:wrap;"><button id="partyInviteFocusBtn" type="button">Invite Player</button><button id="partyToggleStatusBtn" type="button">Change Party Type</button><button id="partyStartActivityBtn" type="button">Start Activity</button><button id="partyDisbandBtn" type="button">Disband Party</button><button id="partyLeaveBtn" type="button">Leave Party</button></div></section><section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:15px;font-weight:800;margin-bottom:10px;">Invite Player</div><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><input id="partyInviteName" type="text" placeholder="Player Nickname" style="width:260px;max-width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;"><button id="partySendInviteBtn" type="button">Send Invite</button></div></section><section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:15px;font-weight:800;margin-bottom:10px;">Party Settings</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;"><div><div style="font-weight:800;margin-bottom:8px;">Party Type:</div><label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><input type="radio" name="leaderPartyType" value="Private" ${p.status === "Private" ? "checked" : ""}> Private</label><label style="display:flex;align-items:center;gap:8px;"><input type="radio" name="leaderPartyType" value="Open" ${p.status === "Open" ? "checked" : ""}> Open</label></div><div><div style="font-weight:800;margin-bottom:8px;">Activity:</div><select id="partyActivitySelect" style="width:100%;max-width:220px;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">${ACTIVITIES.map((a) => `<option value="${esc(a)}" ${p.activity === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></div><div><div style="font-weight:800;margin-bottom:8px;">Minimum Level:</div><input id="partyMinLevelInput" type="number" min="1" value="${num(p.minLevel, 1)}" style="width:100%;max-width:120px;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;"></div><div><div style="font-weight:800;margin-bottom:8px;">Auto Accept Requests:</div><label style="display:flex;align-items:center;gap:8px;"><input id="partyAutoAcceptInput" type="checkbox" ${p.autoAcceptRequests ? "checked" : ""}> ${p.autoAcceptRequests ? "On" : "Off"}</label></div></div></section></div>`;
  }

  function memberMarkup(p) {
    return `<div style="display:grid;gap:14px;"><section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 16px;"><div><strong>Party Name:</strong> ${esc(p.name)}</div><div><strong>Leader:</strong> ${esc(p.leaderName)}</div><div><strong>Members:</strong> ${p.members.length} / ${p.maxMembers}</div><div><strong>Status:</strong> ${esc(p.status)}</div><div><strong>Activity:</strong> ${esc(p.activity)}</div></section><section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:15px;font-weight:800;margin-bottom:10px;">Members</div><div style="display:grid;gap:10px;">${memberRowsMarkup(p)}</div></section><section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:15px;font-weight:800;margin-bottom:10px;">Party Bonuses</div><div style="display:grid;gap:4px;">${(p.bonuses || []).map((b) => `<div>${esc(b)}</div>`).join("")}</div></section><section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:15px;font-weight:800;margin-bottom:10px;">Actions</div><div style="display:flex;gap:10px;flex-wrap:wrap;"><button id="partyReadyBtn" type="button">Ready / Not Ready</button><button id="partyLeaveBtn" type="button">Leave Party</button></div></section></div>`;
  }

  function findMarkup() {
    const detail = state.selectedPartyId ? state.open.get(state.selectedPartyId) : null;
    if (detail) return `<section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:16px;font-weight:800;margin-bottom:12px;">Party Details</div><div style="display:grid;gap:8px;"><div><strong>Party Name:</strong> ${esc(detail.name)}</div><div><strong>Leader:</strong> ${esc(detail.leaderName)}</div><div><strong>Members:</strong> ${detail.members} / ${detail.maxMembers}</div><div><strong>Activity:</strong> ${esc(detail.activity)}</div><div><strong>Requirement:</strong> ${esc(detail.requirement)}</div><div><strong>Status:</strong> ${esc(detail.status)}</div></div><div style="margin-top:14px;"><div style="font-weight:800;margin-bottom:8px;">Party Bonus:</div><div style="display:grid;gap:4px;">${(detail.bonuses || []).map((b) => `<div>${esc(b)}</div>`).join("")}</div></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;"><button type="button" data-party-request="${esc(detail.id)}">Request Join</button><button type="button" id="partyBackToListBtn">Back</button></div></section>`;
    return `<section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="font-size:16px;font-weight:800;margin-bottom:12px;">Available Parties</div><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:16px;"><label style="display:grid;gap:6px;"><span style="font-weight:800;">Search:</span><input id="partySearchInput" type="text" value="" style="width:260px;max-width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;"></label><label style="display:grid;gap:6px;"><span style="font-weight:800;">Filter Activity:</span><select id="partyActivityFilter" style="width:220px;max-width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;"><option value="Any">Any</option>${ACTIVITIES.filter((a) => a !== "Idle").map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join("")}</select></label></div><div id="partyFindList" style="display:grid;gap:12px;"></div></section>`;
  }

  function invitesMarkup(save) {
    const invites = save.partyHall.invites || [];
    if (!invites.length) return `<section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);"><div style="opacity:.78;">No pending invites.</div></section>`;
    return invites.map((invite) => `<section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);max-width:420px;margin-bottom:12px;"><div style="font-size:16px;font-weight:800;margin-bottom:12px;">Party Invite</div><div style="display:grid;gap:6px;"><div>${esc(invite.fromName)} invited you to join:</div><div style="font-size:18px;font-weight:900;color:#ead39b;margin-top:4px;">${esc(invite.partyName)}</div><div>Members: ${esc(invite.membersText)}</div><div>Activity: ${esc(invite.activity)}</div></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;"><button type="button" data-party-accept="${esc(invite.id)}">Accept</button><button type="button" data-party-decline="${esc(invite.id)}">Decline</button></div></section>`).join("");
  }

  function renderFindPartyCards() {
    const list = document.getElementById("partyFindList");
    if (!list) return;
    const search = String(document.getElementById("partySearchInput")?.value || "").trim().toLowerCase();
    const activity = String(document.getElementById("partyActivityFilter")?.value || "Any");
    const entries = Array.from(state.open.values()).filter((entry) => (!search || entry.name.toLowerCase().includes(search) || entry.leaderName.toLowerCase().includes(search)) && (activity === "Any" || entry.activity === activity));
    list.innerHTML = entries.length ? entries.map((entry) => `<div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);display:grid;gap:6px;"><div><strong>Party:</strong> ${esc(entry.name)}</div><div><strong>Leader:</strong> ${esc(entry.leaderName)}</div><div><strong>Members:</strong> ${entry.members} / ${entry.maxMembers}</div><div><strong>Activity:</strong> ${esc(entry.activity)}</div><div><strong>Status:</strong> ${esc(entry.status)}</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;"><button type="button" data-party-view="${esc(entry.id)}">View</button><button type="button" data-party-request="${esc(entry.id)}">Request Join</button></div></div>`).join("") : `<div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);opacity:.78;">No open parties right now.</div>`;
    bindActions();
  }

  function bindActions() {
    document.querySelectorAll("[data-party-tab]").forEach((btn) => btn.addEventListener("click", () => { state.tab = btn.dataset.partyTab || "my_party"; state.selectedPartyId = null; renderPartyHall(); }));
    document.getElementById("partyCreateBtn")?.addEventListener("click", createParty);
    document.getElementById("partySendInviteBtn")?.addEventListener("click", sendInvite);
    document.getElementById("partyInviteFocusBtn")?.addEventListener("click", () => document.getElementById("partyInviteName")?.focus());
    document.getElementById("partyToggleStatusBtn")?.addEventListener("click", () => { const p = party(ensureSave(loadSave())); if (p) updateLeaderSetting("status", p.status === "Private" ? "Open" : "Private"); });
    document.getElementById("partyStartActivityBtn")?.addEventListener("click", () => updateLeaderSetting("activity", document.getElementById("partyActivitySelect")?.value || "Idle"));
    document.getElementById("partyDisbandBtn")?.addEventListener("click", leaveParty);
    document.getElementById("partyLeaveBtn")?.addEventListener("click", leaveParty);
    document.getElementById("partyReadyBtn")?.addEventListener("click", toggleReady);
    document.getElementById("partyActivitySelect")?.addEventListener("change", (e) => updateLeaderSetting("activity", e.target.value));
    document.getElementById("partyMinLevelInput")?.addEventListener("change", (e) => updateLeaderSetting("minLevel", e.target.value));
    document.getElementById("partyAutoAcceptInput")?.addEventListener("change", (e) => updateLeaderSetting("autoAcceptRequests", !!e.target.checked));
    document.querySelectorAll('input[name="leaderPartyType"]').forEach((input) => input.addEventListener("change", (e) => updateLeaderSetting("status", e.target.value)));
    document.getElementById("partySearchInput")?.addEventListener("input", renderFindPartyCards);
    document.getElementById("partyActivityFilter")?.addEventListener("change", renderFindPartyCards);
    document.getElementById("partyBackToListBtn")?.addEventListener("click", () => { state.selectedPartyId = null; renderPartyHall(); });
    document.querySelectorAll("[data-party-view]").forEach((btn) => btn.addEventListener("click", () => { state.selectedPartyId = btn.dataset.partyView || null; renderPartyHall(); }));
    document.querySelectorAll("[data-party-request]").forEach((btn) => btn.addEventListener("click", () => requestJoin(btn.dataset.partyRequest || "")));
    document.querySelectorAll("[data-party-accept]").forEach((btn) => btn.addEventListener("click", () => acceptInviteById(btn.dataset.partyAccept || "")));
    document.querySelectorAll("[data-party-decline]").forEach((btn) => btn.addEventListener("click", () => declineInviteById(btn.dataset.partyDecline || "")));
  }

  function renderInvitePopups() {
    const host = ensurePopupHost();
    const save = ensureSave(loadSave());
    const invites = save.partyHall.invites || [];
    host.innerHTML = invites.map((invite) => `<div style="width:min(360px, calc(100vw - 32px));padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg, rgba(20,23,36,.98), rgba(12,14,24,.98));box-shadow:0 18px 42px rgba(0,0,0,.34);pointer-events:auto;"><div style="font-size:15px;font-weight:900;margin-bottom:10px;color:#ead39b;">Party Invite</div><div style="display:grid;gap:6px;font-size:14px;"><div>${esc(invite.fromName)} invited you to join:</div><div style="font-size:18px;font-weight:900;color:#ead39b;margin-top:4px;">${esc(invite.partyName)}</div><div>Members: ${esc(invite.membersText)}</div><div>Activity: ${esc(invite.activity)}</div></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;"><button type="button" data-party-accept="${esc(invite.id)}">Accept</button><button type="button" data-party-decline="${esc(invite.id)}">Decline</button></div></div>`).join("");
    host.querySelectorAll("[data-party-accept]").forEach((btn) => btn.addEventListener("click", () => acceptInviteById(btn.dataset.partyAccept || "")));
    host.querySelectorAll("[data-party-decline]").forEach((btn) => btn.addEventListener("click", () => declineInviteById(btn.dataset.partyDecline || "")));
  }

  function renderPartyHall() {
    const shell = document.getElementById("partyHallCard");
    if (!shell) return;
    const save = ensureSave(loadSave());
    const p = party(save);
    const myRole = role(save);
    let body = "";
    if (state.tab === "my_party") body = !p ? noPartyMarkup() : (myRole === "leader" ? leaderMarkup(p) : memberMarkup(p));
    if (state.tab === "find_party") body = findMarkup();
    if (state.tab === "invites") body = invitesMarkup(save);
    shell.innerHTML = `${tabsMarkup()}<div id="partyHallMsg" style="min-height:18px;margin-bottom:10px;color:#ead39b;"></div>${body}`;
    bindActions();
    if (state.tab === "find_party" && !state.selectedPartyId) renderFindPartyCards();
  }

  function mountPartyHall(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = `<div id="partyHallRoot" style="max-width:980px;margin:0 auto;"><div style="text-align:center;margin-bottom:12px;"><h1 style="margin:0;color:#ead39b;text-shadow:0 1px 0 rgba(87,58,16,.95),0 0 10px rgba(0,0,0,.34),0 2px 8px rgba(0,0,0,.72);">PARTY HALL</h1></div><div id="partyHallCard" style="background:rgba(0,0,0,.15);border:3px solid rgba(0,0,0,.55);padding:14px;border-radius:12px;"></div></div>`;
    document.title = "Darkstone Chronicles - Party Hall";
    state.selectedPartyId = null;
    renderPartyHall();
    return true;
  }

  function initStandalonePartyHall() {
    if (!document.getElementById("partyHallRoot")) return false;
    document.title = "Darkstone Chronicles - Party Hall";
    renderPartyHall();
    return true;
  }

  async function initRealtime() {
    try {
      await window.DSAuth?.ready;
      if (!window.DSAuth?.getClient?.()) return;
      channel();
      startTimers();
      renderInvitePopups();
      broadcastPartyState();
    } catch (e) {
      console.error("[party] init failed", e);
    }
  }

  window.DSPartyHall = { mount: mountPartyHall, initRealtime };
  window.addEventListener("DOMContentLoaded", () => { initStandalonePartyHall(); initRealtime(); });
  window.addEventListener("ds:auth", () => { initRealtime(); });
  window.addEventListener("ds:save", () => { renderInvitePopups(); });
})();
