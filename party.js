(() => {
  const POLL_MS = 45000;
  const ACTIVE_PARTY_FIGHT_POLL_MS = 12000;
  const REALTIME_FALLBACK_POLL_MS = 120000;
  const ACTIVE_PARTY_FIGHT_REALTIME_FALLBACK_POLL_MS = 20000;
  const INVITE_NOTICE_POLL_MS = 120000;
  const PARTY_HALL_MIN_LEVEL = 20;
  const PARTY_BATTLE_ENCOUNTER_MS = 6000;
  const PARTY_FIGHT_MONSTERS = [
    {
      id: "gravefang-hydra",
      name: "Mirehook Ravager",
      img: "images/mobs/party/mirehook_ravager.webp",
      attack: 350,
      defense: 210,
      role: "Swamp Skirmisher",
      levelText: "Requires Hero Lv 20+",
      description: "The first Party Hall raid target. Tuned around a level 30-style enemy pushed up for full party play."
    },
    {
      id: "embermaw-colossus",
      name: "Gloomtail Stalker",
      img: "images/mobs/party/gloomtail_stalker.webp",
      attack: 49,
      defense: 31,
      role: "Agile Predator",
      levelText: "Recommended Party Lv 16+",
      description: "A fast shadow beast that pressures weaker members and rewards steady damage pacing."
    },
    {
      id: "thornveil-broodmother",
      name: "Ashhide Brute",
      img: "images/mobs/party/ashhide_brute.webp",
      attack: 54,
      defense: 43,
      role: "Frontline Bruiser",
      levelText: "Recommended Party Lv 18+",
      description: "A heavy ash-covered fighter with reliable pressure and enough armor to punish scattered attacks."
    },
    {
      id: "stormglass-seraph",
      name: "Frostvein Harrier",
      img: "images/mobs/party/frostvein_harrier.webp",
      attack: 61,
      defense: 39,
      role: "Winged Striker",
      levelText: "Recommended Party Lv 20+",
      description: "A sharp ice-winged hunter that hits hard and forces the party to survive sudden burst windows."
    },
    {
      id: "cryptwarden-revenant",
      name: "Ironroot Mauler",
      img: "images/mobs/party/ironroot_mauler.webp",
      attack: 66,
      defense: 58,
      role: "Heavy Mauler",
      levelText: "Recommended Party Lv 22+",
      description: "A slow but brutal tree-and-stone monster that demands sustained damage from a prepared party."
    }
  ];
  const PARTY_MONSTER_ID_ALIASES = {
    "mirehook-ravager": "gravefang-hydra",
    "gloomtail-stalker": "embermaw-colossus",
    "ashhide-brute": "thornveil-broodmother",
    "frostvein-harrier": "stormglass-seraph",
    "ironroot-mauler": "cryptwarden-revenant",
  };

  const state = {
    tab: "my_party",
    selectedPartyId: null,
    selectedPartyFightMonsterId: null,
    inviteModalOpen: false,
    monsterSelectionOpen: false,
    monsterInfoOpen: false,
    data: null,
    loading: false,
    actionBusy: false,
    initialized: false,
    pollTimer: 0,
    pollIntervalMs: 0,
    realtimeChannel: null,
    realtimePartyId: "",
    realtimeSubscribed: false,
    inviteChannel: null,
    inviteUserId: "",
    inviteRealtimeSubscribed: false,
    inviteRefreshTimer: 0,
    inviteNoticePollTimer: 0,
    realtimeRefreshTimer: 0,
    uiTimer: 0,
    uiRaf: 0,
    boundaryFetchAt: 0,
    boundaryResolvedCount: -1,
    boundaryFetchTimer: 0,
    battleLoopTimer: 0,
    battleAutoActive: false,
    battleNextActionAt: 0,
    lastMessage: "",
    lastError: "",
    lastPersonalFightResult: null,
    battleView: false,
    createDraft: null,
    inviteDraft: "",
  };

  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const hasPartyPage = () => !!document.getElementById("partyHallCard");
  const partyMonsterId = (v) => PARTY_MONSTER_ID_ALIASES[String(v || "").trim()] || String(v || "").trim();
  const normalizeAvatarUrl = (src) => {
    const value = String(src || "").trim();
    if (!value) return "images/heroes/hero_1.webp";
    if (/^images\/hero\.png(?:$|[?#])/i.test(value)) return "images/heroes/hero_1.webp";
    if (/^images\/heroes\/.+\.png(?:$|[?#])/i.test(value)) return value.replace(/\.png(?=$|[?#])/i, ".webp");
    return value;
  };

  function setNotice(message = "", isError = false) {
    state.lastMessage = isError ? "" : String(message || "");
    state.lastError = isError ? String(message || "") : "";
    const el = document.getElementById("partyHallMsg");
    if (!el) return;
    el.textContent = state.lastError || state.lastMessage || "";
    el.style.color = state.lastError ? "#ffd8de" : "#ead39b";
  }

  function ensurePopupHost() {
    let host = document.getElementById("dsPartyPopupHost");
    if (host) return host;
    host = document.createElement("div");
    host.id = "dsPartyPopupHost";
    host.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:900;display:flex;flex-direction:column;gap:12px;pointer-events:none;";
    document.body.appendChild(host);
    return host;
  }

  function profile() {
    return state.data?.profile || {
      id: "",
      heroName: "Hero",
      heroLevel: 1,
      avatarUrl: "images/heroes/hero_1.webp",
    };
  }

  function myParty() {
    return state.data?.myParty || null;
  }

  function dispatchPartyStateChanged() {
    window.dispatchEvent(new CustomEvent("ds:party", {
      detail: { partyId: String(myParty()?.id || "") }
    }));
  }

  function myRole() {
    return String(myParty()?.role || "none");
  }

  function isLeader() {
    return myRole() === "leader";
  }

  function isActivePartyFight(party = myParty()) {
    return !!party && party.state === "active" && String(party.activity || "").toLowerCase().includes("party fight");
  }

  function defaultCreateDraft() {
    const me = profile();
    return {
      name: `${me.heroName}'s Party`,
      visibility: "private",
      minLevel: String(Math.max(PARTY_HALL_MIN_LEVEL, num(me.heroLevel, 1))),
    };
  }

  function getCreateDraft() {
    if (!state.createDraft) state.createDraft = defaultCreateDraft();
    return state.createDraft;
  }

  function syncCreateDraftFromDom() {
    const nameInput = document.getElementById("partyCreateName");
    const visibilityInput = document.getElementById("partyCreateVisibility");
    const minLevelInput = document.getElementById("partyCreateMinLevel");
    if (!nameInput && !visibilityInput && !minLevelInput) return;
    const draft = getCreateDraft();
    if (nameInput) draft.name = nameInput.value;
    if (visibilityInput) draft.visibility = visibilityInput.value || "private";
    if (minLevelInput) draft.minLevel = minLevelInput.value;
  }

  function isCreatePartyFormActive() {
    const form = document.getElementById("partyCreateForm");
    return !!form && !!document.activeElement && form.contains(document.activeElement);
  }

  function syncInviteDraftFromDom() {
    const input = document.getElementById("partyInviteName")
      || document.getElementById("partyInlineInviteName")
      || document.getElementById("partyInlineInviteNamePending");
    if (input) state.inviteDraft = input.value;
  }

  function isInviteFormActive() {
    const modal = document.getElementById("partyInviteModalBackdrop");
    return !!modal && !!document.activeElement && modal.contains(document.activeElement);
  }

  function isInlineInviteFormActive() {
    const inlineInput = document.getElementById("partyInlineInviteName")
      || document.getElementById("partyInlineInviteNamePending");
    return !!inlineInput && document.activeElement === inlineInput;
  }

  function isPartyInputActive() {
    return isCreatePartyFormActive() || isInviteFormActive() || isInlineInviteFormActive();
  }

  function preservePartyInputsFromDom() {
    syncCreateDraftFromDom();
    syncInviteDraftFromDom();
  }

  function shouldSkipSilentRender() {
    return !!document.getElementById("partyCreateForm")
      || !!document.getElementById("partyInviteModalBackdrop")
      || isInlineInviteFormActive()
      || isPartyInputActive();
  }

  function openParties() {
    return Array.isArray(state.data?.openParties) ? state.data.openParties : [];
  }

  function invites() {
    return Array.isArray(state.data?.invites) ? state.data.invites : [];
  }

  function publishInviteNotice(count) {
    const safeCount = Math.max(0, Math.floor(num(count, 0)));
    window.dispatchEvent(new CustomEvent("ds:party-invite-notice", {
      detail: {
        active: safeCount > 0,
        count: safeCount
      }
    }));
  }

  function publishInviteNoticeFromState() {
    publishInviteNotice(invites().length);
  }

  function partyPoints() {
    return Math.max(0, num(state.data?.profile?.partyPoints, 0));
  }

  function myJoinRequests() {
    return Array.isArray(state.data?.myJoinRequests) ? state.data.myJoinRequests : [];
  }

  function selectedMonsterRewardPreview(monster) {
    if (!monster) return null;
    if (String(monster.id || "") === "gravefang-hydra") {
      return {
        partyPoints: "2-5 PP each",
        xp: "132 XP each",
        gold: "124-200 Gold each",
        extras: [
          "Orb of Creation: 1/100",
          "Rough Gem: 1/75",
          "Mythic Ring Placeholder: 1/10000",
          "Mythic Amulet Placeholder: 1/10000",
          "Mythic Bracers Placeholder: 1/10000",
          "Mythic Shoulders Placeholder: 1/10000",
        ],
      };
    }
    return null;
  }

  function hallSummaryMarkup() {
    const me = profile();
    return `
      <section style="margin-bottom:14px;padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03);display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:center;">
        <div>
          <div style="font-size:12px;opacity:.74;">Party Hall Hero</div>
          <div style="font-size:18px;font-weight:900;">${esc(me.heroName || "Hero")}</div>
        </div>
        <div>
          <div style="font-size:12px;opacity:.74;">Hero Level</div>
          <div style="font-size:18px;font-weight:900;">${num(me.heroLevel, 1)}</div>
        </div>
        <div>
          <div style="font-size:12px;opacity:.74;">Party Points</div>
          <div style="font-size:18px;font-weight:900;color:#f0d58b;">${partyPoints()} PP</div>
        </div>
        <div style="font-size:12px;opacity:.82;">Party Hall access and the first monster both require hero level ${PARTY_HALL_MIN_LEVEL}+.</div>
      </section>
    `;
  }

  function partyMonsterProgress() {
    return Array.isArray(state.data?.partyMonsterProgress) ? state.data.partyMonsterProgress : [];
  }

  function partyFightBonuses() {
    const profileBonuses = state.data?.profile?.partyFightBonuses;
    if (profileBonuses && typeof profileBonuses === "object") {
      return {
        atkPct: Math.max(0, num(profileBonuses.atkPct, 0)),
        defPct: Math.max(0, num(profileBonuses.defPct, 0)),
      };
    }
    return {
      atkPct: Math.max(0, num(state.data?.partyFightBonuses?.atkPct, 0)),
      defPct: Math.max(0, num(state.data?.partyFightBonuses?.defPct, 0)),
    };
  }

  function partyMonsterMilestones(monsterId) {
    const profileMilestones = state.data?.profile?.partyMonsterMilestones;
    if (profileMilestones && typeof profileMilestones === "object") {
      const rows = profileMilestones[partyMonsterId(monsterId)];
      if (Array.isArray(rows)) return rows;
    }
    const topLevel = state.data?.partyMonsterMilestones;
    if (topLevel && typeof topLevel === "object") {
      const rows = topLevel[partyMonsterId(monsterId)];
      if (Array.isArray(rows)) return rows;
    }
    return [];
  }

  function monsterProgressEntry(monsterId) {
    const id = partyMonsterId(monsterId);
    const existing = partyMonsterProgress().find((entry) => partyMonsterId(entry?.monsterId) === id);
    if (existing) return existing;
    const index = PARTY_FIGHT_MONSTERS.findIndex((entry) => entry.id === id);
    const previousMonster = index > 0 ? PARTY_FIGHT_MONSTERS[index - 1] : null;
    return {
      monsterId: id,
      kills: 0,
      unlocked: index === 0,
      unlockRequirementMonsterId: previousMonster?.id || "",
      unlockRequirementKills: index === 0 ? 0 : 1000,
      unlockProgress: index === 0 ? 1000 : 0,
    };
  }

  function selectedPartyFightMonster() {
    return PARTY_FIGHT_MONSTERS.find((entry) => entry.id === state.selectedPartyFightMonsterId) || null;
  }

  function selectedPartyMonsterFromParty(party) {
    return PARTY_FIGHT_MONSTERS.find((entry) => entry.id === partyMonsterId(party?.selectedMonsterId)) || null;
  }

  function activeSessionPayload(party) {
    const payload = party?.activeSession?.resultPayload;
    return payload && typeof payload === "object" ? payload : {};
  }

  function activePartyFightMonster(party) {
    const payload = activeSessionPayload(party);
    const payloadMonsterId = partyMonsterId(payload.selectedMonsterId);
    return PARTY_FIGHT_MONSTERS.find((entry) => entry.id === payloadMonsterId) || selectedPartyMonsterFromParty(party);
  }

  function activeEncounter(party) {
    const payload = activeSessionPayload(party);
    const encounter = payload.latestEncounter;
    return encounter && typeof encounter === "object" ? encounter : null;
  }

  function recentEncounters(party) {
    const payload = activeSessionPayload(party);
    return Array.isArray(payload.recentEncounters) ? payload.recentEncounters : [];
  }

  function formatEncounterCountdown(party) {
    const session = party?.activeSession;
    const payload = activeSessionPayload(party);
    const encounterMs = Math.max(1000, num(payload.encounterMs, 6000));
    const startedAt = Date.parse(String(session?.startedAt || ""));
    if (!Number.isFinite(startedAt)) return "6.0s";
    const elapsed = Math.max(0, Date.now() - startedAt);
    const cycleElapsed = elapsed % encounterMs;
    const remain = Math.max(0, (encounterMs - cycleElapsed) / 1000);
    return `${remain.toFixed(1)}s`;
  }

  function encounterCountdownMs(party) {
    const session = party?.activeSession;
    const payload = activeSessionPayload(party);
    const encounterMs = Math.max(1000, num(payload.encounterMs, 6000));
    const startedAt = Date.parse(String(session?.startedAt || ""));
    if (!Number.isFinite(startedAt)) return encounterMs;
    const elapsed = Math.max(0, Date.now() - startedAt);
    const cycleElapsed = elapsed % encounterMs;
    return Math.max(0, encounterMs - cycleElapsed);
  }

  function encounterProgressPct(party) {
    const session = party?.activeSession;
    const payload = activeSessionPayload(party);
    const encounterMs = Math.max(1000, num(payload.encounterMs, 6000));
    const startedAt = Date.parse(String(session?.startedAt || ""));
    if (!Number.isFinite(startedAt)) return 0;
    const elapsed = Math.max(0, Date.now() - startedAt);
    const cycleElapsed = elapsed % encounterMs;
    return Math.max(0, Math.min(100, (cycleElapsed / encounterMs) * 100));
  }

  function partyFightPlayerGroups(members) {
    const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
    if (safeMembers.length <= 2) return [safeMembers];
    if (safeMembers.length === 3) return [[safeMembers[0]], [safeMembers[1], safeMembers[2]]];
    return [safeMembers.slice(0, 2), safeMembers.slice(2, 4)];
  }

  function queuePartyFightBoundaryFetch(expectedResolvedCount, delayMs = 0) {
    if (state.boundaryFetchTimer) window.clearTimeout(state.boundaryFetchTimer);
    state.boundaryFetchTimer = window.setTimeout(() => {
      state.boundaryFetchTimer = 0;
      if (document.hidden || !isActivePartyFight() || state.actionBusy) return;
      const currentResolvedCount = Math.max(0, num(activeSessionPayload(myParty()).resolvedCount, 0));
      if (currentResolvedCount >= expectedResolvedCount) return;
      Promise.resolve(loadPartyState({ silent: true, forceRender: true })).catch(() => {});
      window.setTimeout(() => {
        if (!document.hidden && isActivePartyFight() && !state.loading && !state.actionBusy) {
          const nextResolvedCount = Math.max(0, num(activeSessionPayload(myParty()).resolvedCount, 0));
          if (nextResolvedCount < expectedResolvedCount) {
            Promise.resolve(loadPartyState({ silent: true, forceRender: true })).catch(() => {});
          }
        }
      }, 160);
      window.setTimeout(() => {
        if (!document.hidden && isActivePartyFight() && !state.loading && !state.actionBusy) {
          const nextResolvedCount = Math.max(0, num(activeSessionPayload(myParty()).resolvedCount, 0));
          if (nextResolvedCount < expectedResolvedCount) {
            Promise.resolve(loadPartyState({ silent: true, forceRender: true })).catch(() => {});
          }
        }
      }, 420);
    }, Math.max(0, delayMs));
  }

  function queueRealtimeRefresh(delayMs = 80) {
    if (state.realtimeRefreshTimer) window.clearTimeout(state.realtimeRefreshTimer);
    state.realtimeRefreshTimer = window.setTimeout(() => {
      state.realtimeRefreshTimer = 0;
      if (document.hidden || state.loading || state.actionBusy) return;
      Promise.resolve(loadPartyState({ silent: true, forceRender: isActivePartyFight() })).catch(() => {});
    }, Math.max(0, delayMs));
  }

  function currentPollIntervalMs() {
    if (state.realtimeSubscribed) {
      return isActivePartyFight()
        ? ACTIVE_PARTY_FIGHT_REALTIME_FALLBACK_POLL_MS
        : REALTIME_FALLBACK_POLL_MS;
    }
    return isActivePartyFight() ? ACTIVE_PARTY_FIGHT_POLL_MS : POLL_MS;
  }

  function syncPartyRealtimeSubscription() {
    const client = window.DSAuth?.getClient?.();
    if (!client?.channel) return;
    const partyId = String(myParty()?.id || "");
    if (state.realtimePartyId === partyId) return;
    if (state.realtimeChannel) {
      Promise.resolve(client.removeChannel?.(state.realtimeChannel)).catch(() => {});
      state.realtimeChannel = null;
      state.realtimePartyId = "";
      state.realtimeSubscribed = false;
    }
    if (!partyId) return;
    const refresh = () => queueRealtimeRefresh(50);
    const channel = client
      .channel(`party-hall-${partyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "parties", filter: `id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_activity_sessions", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_invites", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_join_requests", filter: `party_id=eq.${partyId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_events", filter: `party_id=eq.${partyId}` }, refresh);
    channel.subscribe((status) => {
      state.realtimeSubscribed = status === "SUBSCRIBED";
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        state.realtimeSubscribed = false;
      }
      restartPollingIfNeeded();
    });
    state.realtimeChannel = channel;
    state.realtimePartyId = partyId;
  }

  async function refreshInviteNotice() {
    const client = window.DSAuth?.getClient?.();
    const userId = String(window.DSAuth?.getUser?.()?.id || "").trim();
    if (!client?.from || !userId) {
      publishInviteNoticeFromState();
      return;
    }

    try {
      const { data, error } = await client
        .from("party_invites")
        .select("id")
        .eq("to_user_id", userId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .limit(10);
      if (error) throw error;
      publishInviteNotice(Array.isArray(data) ? data.length : 0);
    } catch (error) {
      console.warn("[PartyHall] invite notice check failed", error);
      publishInviteNoticeFromState();
      if (hasPartyPage() && !state.loading && !state.actionBusy) {
        Promise.resolve(loadPartyState({ silent: true })).catch(() => {});
      }
    }
  }

  function queueInviteRefresh(delayMs = 250) {
    if (state.inviteRefreshTimer) window.clearTimeout(state.inviteRefreshTimer);
    state.inviteRefreshTimer = window.setTimeout(() => {
      state.inviteRefreshTimer = 0;
      if (document.hidden) return;
      Promise.resolve(refreshInviteNotice()).catch(() => {});
      if (hasPartyPage() && !state.loading && !state.actionBusy) {
        Promise.resolve(loadPartyState({ silent: true })).catch(() => {});
      }
    }, Math.max(0, delayMs));
  }

  function startInviteNoticePolling() {
    if (state.inviteNoticePollTimer) return;
    state.inviteNoticePollTimer = window.setInterval(() => {
      if (document.hidden) return;
      if (state.inviteRealtimeSubscribed) return;
      Promise.resolve(refreshInviteNotice()).catch(() => {});
    }, INVITE_NOTICE_POLL_MS);
  }

  function stopInviteNoticePolling() {
    if (!state.inviteNoticePollTimer) return;
    window.clearInterval(state.inviteNoticePollTimer);
    state.inviteNoticePollTimer = 0;
  }

  async function initInviteWatcher() {
    try {
      await window.DSAuth?.ready;
    } catch {}
    const client = window.DSAuth?.getClient?.();
    const userId = String(window.DSAuth?.getUser?.()?.id || "").trim();
    if (!client?.channel || !userId) return;
    if (state.inviteChannel && state.inviteUserId === userId) return;
    if (state.inviteChannel) {
      Promise.resolve(client.removeChannel?.(state.inviteChannel)).catch(() => {});
      state.inviteChannel = null;
      state.inviteUserId = "";
      state.inviteRealtimeSubscribed = false;
    }

    const refresh = () => queueInviteRefresh(250);
    const channel = client
      .channel(`party-invites-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_invites", filter: `to_user_id=eq.${userId}` }, refresh);
    channel.subscribe((status) => {
      state.inviteRealtimeSubscribed = status === "SUBSCRIBED";
      if (state.inviteRealtimeSubscribed) {
        stopInviteNoticePolling();
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        state.inviteRealtimeSubscribed = false;
      }
      startInviteNoticePolling();
    });
    state.inviteChannel = channel;
    state.inviteUserId = userId;
    startInviteNoticePolling();
    queueInviteRefresh(1200);
  }

  function canAutoRunPartyBattle(party = myParty()) {
    const members = Array.isArray(party?.members) ? party.members : [];
    const monster = selectedPartyMonsterFromParty(party);
    return members.length >= 2 && !!monster && !!monsterProgressEntry(monster.id)?.unlocked;
  }

  function clearPartyBattleLoopTimer() {
    if (!state.battleLoopTimer) return;
    window.clearTimeout(state.battleLoopTimer);
    state.battleLoopTimer = 0;
  }

  function stopAutoPartyBattle({ keepView = true } = {}) {
    clearPartyBattleLoopTimer();
    state.battleAutoActive = false;
    state.battleNextActionAt = 0;
    if (!keepView) state.battleView = false;
  }

  function scheduleAutoPartyBattle(delayMs = PARTY_BATTLE_ENCOUNTER_MS) {
    clearPartyBattleLoopTimer();
    if (!state.battleAutoActive || !state.battleView) return;
    state.battleLoopTimer = window.setTimeout(async () => {
      state.battleLoopTimer = 0;
      await runAutoPartyBattleTick();
    }, Math.max(0, delayMs));
  }

  async function runAutoPartyBattleTick() {
    if (!state.battleAutoActive || !state.battleView) return;
    if (!canAutoRunPartyBattle()) {
      stopAutoPartyBattle({ keepView: true });
      if (hasPartyPage()) renderPartyHall();
      return;
    }
    if (state.actionBusy) {
      scheduleAutoPartyBattle(250);
      return;
    }
    const data = await runAction({ action: "resolve_party_fight" }, "");
    if (!data) {
      stopAutoPartyBattle({ keepView: true });
      return;
    }
    state.battleNextActionAt = Date.now() + PARTY_BATTLE_ENCOUNTER_MS;
    if (hasPartyPage()) renderPartyHall();
    scheduleAutoPartyBattle(PARTY_BATTLE_ENCOUNTER_MS);
  }

  function startAutoPartyBattle() {
    if (!state.battleView) state.battleView = true;
    if (!canAutoRunPartyBattle()) {
      stopAutoPartyBattle({ keepView: true });
      if (hasPartyPage()) renderPartyHall();
      return;
    }
    if (state.battleAutoActive) return;
    state.battleAutoActive = true;
    state.battleNextActionAt = Date.now();
    scheduleAutoPartyBattle(0);
  }

  function updatePartyFightTimerUI() {
    const wrap = document.getElementById("partyFightCooldownWrap");
    const text = document.getElementById("partyFightCooldownText");
    const bar = document.getElementById("partyFightCooldownBar");
    if (!wrap || !text || !bar) return;
    if (!state.battleView || !state.battleAutoActive) {
      wrap.style.display = "none";
      bar.style.width = "0%";
      text.textContent = "6.0s";
      return;
    }
    wrap.style.display = "";
    const remainingMs = Math.max(0, num(state.battleNextActionAt, 0) - Date.now());
    text.textContent = `${(remainingMs / 1000).toFixed(1)}s`;
    const progress = state.actionBusy
      ? 100
      : Math.max(0, Math.min(100, ((PARTY_BATTLE_ENCOUNTER_MS - remainingMs) / PARTY_BATTLE_ENCOUNTER_MS) * 100));
    bar.style.width = `${progress.toFixed(1)}%`;
  }

  async function loadPartyState({ silent = false, forceRender = false } = {}) {
    if (!window.DSAuth?.invokePartyAction) return null;
    if (state.loading && silent) return state.data;
    state.loading = true;
    try {
      const previousParty = state.data?.myParty || null;
      const previousResolvedCount = num(activeSessionPayload(previousParty).resolvedCount, -1);
      const previousActive = isActivePartyFight(previousParty);
      const data = await window.DSAuth.invokePartyAction({ action: "bootstrap" });
      state.data = data || null;
      if (state.battleAutoActive && !canAutoRunPartyBattle(state.data?.myParty || null)) {
        stopAutoPartyBattle({ keepView: true });
      }
      dispatchPartyStateChanged();
      const nextResolvedCount = num(activeSessionPayload(state.data?.myParty || null).resolvedCount, -1);
      const nextParty = state.data?.myParty || null;
      const nextActive = isActivePartyFight(nextParty);
      if (nextResolvedCount > previousResolvedCount) {
        state.boundaryResolvedCount = nextResolvedCount;
        window.DSAuth?.syncCloudSaveNow?.();
      }
      const activeParty = state.data?.myParty || null;
      const noticeMessage = isActivePartyFight(activeParty) ? "" : String(activeParty?.noticeMessage || "").trim();
      if (noticeMessage) {
        setNotice(noticeMessage);
      } else if (!silent && !state.lastError) {
        setNotice(state.lastMessage || "");
      }
      publishInviteNoticeFromState();
      renderInvitePopups();
      const sameActivePartyFrame = silent
        && previousActive
        && nextActive
        && previousResolvedCount === nextResolvedCount
        && String(previousParty?.id || "") === String(nextParty?.id || "")
        && String(previousParty?.noticeMessage || "") === String(nextParty?.noticeMessage || "");
      if (hasPartyPage() && !(silent && !forceRender && (shouldSkipSilentRender() || sameActivePartyFrame))) renderPartyHall();
      restartPollingIfNeeded();
      syncPartyRealtimeSubscription();
      return data;
    } catch (error) {
      if (!silent) {
        state.lastError = error?.message || "Failed to load Party Hall.";
      }
      if (hasPartyPage() && !silent) renderPartyHall();
      publishInviteNoticeFromState();
      renderInvitePopups();
      return null;
    } finally {
      state.loading = false;
    }
  }

  async function runAction(payload, successMessage) {
    if (state.actionBusy) return null;
    state.actionBusy = true;
    setNotice("Applying party action...");
    try {
      const data = await window.DSAuth?.invokePartyAction?.(payload || {});
      state.data = data || state.data;
      state.lastPersonalFightResult = data?.personalFightResult || null;
      dispatchPartyStateChanged();
      state.lastError = "";
      const nextMessage = successMessage !== undefined ? successMessage : data?.message;
      setNotice(nextMessage || "");
      publishInviteNoticeFromState();
      renderInvitePopups();
      if (hasPartyPage()) renderPartyHall();
      window.setTimeout(() => {
        if (!document.hidden) Promise.resolve(loadPartyState({ silent: true })).catch(() => {});
      }, 250);
      return data;
    } catch (error) {
      setNotice(error?.message || "Party action failed.", true);
      if (hasPartyPage()) renderPartyHall();
      return null;
    } finally {
      state.actionBusy = false;
    }
  }

  function openMyPartyScreen() {
    state.tab = "my_party";
    state.selectedPartyId = null;
    state.monsterSelectionOpen = false;
    state.monsterInfoOpen = false;
    state.inviteModalOpen = false;
    const onPartyPage = /(^|\/)party_hall\.html$/i.test(String(window.location.pathname || ""));
    if (onPartyPage && hasPartyPage()) {
      renderPartyHall();
      return;
    }
    if (window.DSUI?.navigateWithinShell?.("party_hall.html")) return;
    window.location.href = "party_hall.html";
  }

  function activePartyFightForNavigation() {
    const party = myParty();
    if (!party) return null;
    return isActivePartyFight(party) ? party : null;
  }

  function confirmStopPartyFightForNavigation() {
    const party = activePartyFightForNavigation();
    if (!party) return true;
    const ok = window.confirm("Party Fight is active. If you press OK, the Party Fight will stop. Continue?");
    if (!ok) return false;
    runAction({ action: "end_activity", partyId: party.id, result: "cancelled", nextActivity: "Party Fight" }, "Party Fight stopped.");
    return true;
  }

  function createPartyMarkup() {
    const draft = getCreateDraft();
    return `
      <section style="display:grid;gap:14px;">
        <div id="partyCreateForm" style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
            <label style="display:grid;gap:6px;">
              <span style="font-weight:800;">Party Name</span>
              <input id="partyCreateName" type="text" value="${esc(draft.name)}" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
            </label>
            <label style="display:grid;gap:6px;">
              <span style="font-weight:800;">Party Type</span>
              <select id="partyCreateVisibility" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
                <option value="private" ${draft.visibility === "private" ? "selected" : ""}>Private</option>
                <option value="open" ${draft.visibility === "open" ? "selected" : ""}>Open</option>
              </select>
            </label>
            <label style="display:grid;gap:6px;">
              <span style="font-weight:800;">Minimum Level</span>
              <input id="partyCreateMinLevel" type="number" min="${PARTY_HALL_MIN_LEVEL}" value="${esc(draft.minLevel)}" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
            </label>
          </div>
          <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
            <button id="partyCreateBtn" type="button">Create Party</button>
          </div>
        </div>
        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);display:grid;gap:4px;opacity:.9;">
          <div>- Private means only invited players can join.</div>
          <div>- Open means players can find your party and join this lobby.</div>
          <div>- Party Hall members must be level ${PARTY_HALL_MIN_LEVEL}+.</div>
          <div>- Every party has 4 slots: 1 leader and 3 member slots.</div>
          <div>- More settings can be changed after the party is created.</div>
        </div>
      </section>
    `;
  }

  function memberRowsMarkup(party, showLeaderTools) {
    const meId = String(profile().id || "");
    return party.members.map((member) => `
      <div style="display:grid;grid-template-columns:52px 1fr auto auto ${showLeaderTools && !member.isLeader ? "auto" : ""};gap:12px;align-items:center;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02);">
        <img src="${esc(normalizeAvatarUrl(member.avatarUrl))}" alt="${esc(member.heroName)}" style="width:52px;height:52px;border-radius:12px;border:2px solid #333;object-fit:cover;">
        <div>
          <div style="font-weight:800;">${esc(member.heroName)}</div>
          <div style="opacity:.76;font-size:12px;">Level ${num(member.heroLevel, 1)}${member.userId === meId ? " - You" : ""}</div>
        </div>
        <div style="opacity:.82;">${member.isLeader ? "Leader" : "Member"}</div>
        <div style="color:#d6c7a1;font-weight:800;">Active</div>
        ${showLeaderTools && !member.isLeader ? `<button type="button" data-party-kick="${esc(member.userId)}" disabled title="Kick member will be added next.">Kick</button>` : ""}
      </div>
    `).join("");
  }

  function pendingInvitesMarkup(party) {
    const pending = Array.isArray(party.pendingInvites) ? party.pendingInvites : [];
    if (!pending.length) return `<div style="opacity:.72;">No pending invites.</div>`;
    return pending.map((entry) => `
      <div style="padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02);display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;">
        <img src="${esc(normalizeAvatarUrl(entry.avatarUrl))}" alt="${esc(entry.heroName)}" style="width:44px;height:44px;border-radius:12px;border:2px solid #333;object-fit:cover;">
        <div>
          <div style="font-weight:800;">${esc(entry.heroName)}</div>
          <div style="opacity:.72;font-size:12px;">Level ${num(entry.heroLevel, 1)}</div>
        </div>
        <div style="opacity:.72;font-size:12px;">Pending</div>
      </div>
    `).join("");
  }

  function pendingInvitesPageMarkup(party) {
    const canInvite = isLeader();
    return `
      <section style="display:grid;gap:14px;">
        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="display:grid;gap:12px;margin-bottom:12px;">
            <div>
              <div style="font-size:16px;font-weight:800;">Pending Invites</div>
              <div style="opacity:.76;font-size:12px;margin-top:4px;">Invites sent by the party leader.</div>
            </div>
            ${canInvite ? `
              <div style="display:grid;grid-template-columns:auto minmax(180px,320px);gap:10px;align-items:center;justify-content:start;">
                <button id="partySendInlineInviteBtn" type="button">Invite Player</button>
                <input id="partyInlineInviteNamePending" type="text" value="${esc(state.inviteDraft)}" placeholder="Hero Name" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
              </div>
            ` : ``}
          </div>
          <div style="display:grid;gap:10px;">${pendingInvitesMarkup(party)}</div>
        </div>
      </section>
    `;
  }

  function pendingJoinRequestsMarkup(party) {
    const requests = Array.isArray(party.pendingJoinRequests) ? party.pendingJoinRequests : [];
    if (!requests.length) return `<div style="opacity:.72;">No pending join requests.</div>`;
    return requests.map((entry) => `
      <div style="padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02);display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;">
        <img src="${esc(normalizeAvatarUrl(entry.avatarUrl))}" alt="${esc(entry.heroName)}" style="width:44px;height:44px;border-radius:12px;border:2px solid #333;object-fit:cover;">
        <div>
          <div style="font-weight:800;">${esc(entry.heroName)}</div>
          <div style="opacity:.72;font-size:12px;">Level ${num(entry.heroLevel, 1)}${entry.message ? ` - ${esc(entry.message)}` : ""}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" data-party-approve-request="${esc(entry.id)}">Approve</button>
          <button type="button" data-party-reject-request="${esc(entry.id)}">Reject</button>
        </div>
      </div>
    `).join("");
  }

  function inviteModalMarkup() {
    if (!state.inviteModalOpen) return "";
    return `
      <div id="partyInviteModalBackdrop" style="position:fixed;inset:0;z-index:980;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:18px;">
        <div style="width:min(460px, 100%);padding:18px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg, rgba(24,27,40,.98), rgba(14,16,27,.98));box-shadow:0 24px 60px rgba(0,0,0,.42);">
          <div style="font-size:20px;font-weight:900;margin-bottom:8px;">Invite Player</div>
          <div style="opacity:.78;margin-bottom:14px;">Write the game name of the player you want to invite to your private party.</div>
          <label style="display:grid;gap:6px;">
            <span style="font-weight:800;">Game Name</span>
            <input id="partyInviteName" type="text" value="${esc(state.inviteDraft)}" placeholder="Hero Name" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
          </label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
            <button id="partySendInviteBtn" type="button">Send Invite</button>
            <button id="partyCloseInviteModalBtn" type="button">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  function chooseMonsterPageMarkup(party) {
    return `
      <section style="display:grid;gap:14px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-start;">
          <button id="partyMonsterBackBtn" type="button">Back</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
          ${PARTY_FIGHT_MONSTERS.map((monster) => {
            const progress = monsterProgressEntry(monster.id);
            const unlocked = !!progress?.unlocked;
            const selected = partyMonsterId(party?.selectedMonsterId) === monster.id;
            const requirementMonster = PARTY_FIGHT_MONSTERS.find((entry) => entry.id === String(progress?.unlockRequirementMonsterId || "")) || null;
            return `
              <button
                type="button"
                data-party-choose-monster="${esc(monster.id)}"
                ${unlocked ? "" : "disabled"}
                style="text-align:left;padding:0;border:1px solid ${selected ? "#c79b44" : "rgba(255,255,255,.10)"};border-radius:14px;background:${unlocked ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.015)"};overflow:hidden;cursor:${unlocked ? "pointer" : "not-allowed"};opacity:${unlocked ? "1" : ".58"};"
              >
                <img src="${esc(monster.img)}" alt="${esc(monster.name)}" style="display:block;width:100%;aspect-ratio:1 / 1;object-fit:cover;background:#0f121a;filter:${unlocked ? "none" : "grayscale(1)"};">
                <div style="padding:12px;">
                  <div style="font-size:15px;font-weight:900;color:#f3ead6;">${esc(monster.name)}</div>
                  <div style="opacity:.82;font-size:12px;margin-top:4px;">${esc(monster.levelText || "")}</div>
                  <div class="dungeonStats" style="grid-template-columns:repeat(2,minmax(0,54px));justify-content:start;margin-top:8px;padding-top:0;border-top:0;">
                    <div class="dungeonStatBox">
                      <div class="dungeonStatIcon" aria-hidden="true">&#9876;&#65039;</div>
                      <div class="dungeonStatValue">${num(monster.attack, 0)}</div>
                    </div>
                    <div class="dungeonStatBox">
                      <div class="dungeonStatIcon" aria-hidden="true">&#128737;&#65039;</div>
                      <div class="dungeonStatValue">${num(monster.defense, 0)}</div>
                    </div>
                  </div>
                  ${unlocked
                    ? `<div style="opacity:.82;font-size:12px;margin-top:8px;">Kills: ${num(progress?.kills, 0)}</div>`
                    : `<div style="opacity:.82;font-size:12px;margin-top:8px;">Unlock: 1000 kills of ${esc(requirementMonster?.name || "previous monster")} (${num(progress?.unlockProgress, 0)}/1000)</div>`}
                </div>
              </button>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function partySlotCardMarkup(member) {
    const frameColor = member.isLeader ? "#43c26b" : "#c79b44";
    const statusText = member.isLeader ? "Leader" : "Member";
    const canKick = isLeader() && !member.isSelf && !member.isLeader;
    return `
      <div style="display:grid;justify-items:center;align-content:start;gap:10px;text-align:center;">
        <div style="min-height:38px;display:flex;align-items:center;justify-content:center;">
          ${canKick ? `<button type="button" data-party-kick-member="${esc(member.userId)}" style="padding:7px 14px;border-radius:10px;">Kick</button>` : ``}
        </div>
        <div style="min-height:28px;display:flex;align-items:center;justify-content:center;">
          <div style="padding:4px 10px;border-radius:999px;background:${member.isLeader ? "rgba(67,194,107,.16)" : "rgba(199,155,68,.14)"};border:1px solid ${member.isLeader ? "rgba(67,194,107,.32)" : "rgba(199,155,68,.28)"};color:${member.isLeader ? "#bff0ca" : "#f0d9a8"};font-weight:900;font-size:12px;">${statusText}</div>
        </div>
        <img src="${esc(normalizeAvatarUrl(member.avatarUrl))}" alt="${esc(member.heroName)}" style="width:110px;height:110px;border-radius:18px;border:3px solid ${frameColor};object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.28);">
        <div style="font-weight:900;font-size:18px;line-height:1.1;">${esc(member.heroName)}</div>
        <div style="font-size:12px;opacity:.82;letter-spacing:.02em;">ATT ${num(member.heroAttack, 0)}  DEF ${num(member.heroDefense, 0)}</div>
      </div>
    `;
  }

  function partyEmptySlotMarkup() {
    return `
      <div style="display:grid;justify-items:center;align-content:start;gap:10px;text-align:center;">
        <div style="min-height:38px;"></div>
        <div style="min-height:28px;"></div>
        <div style="width:110px;height:110px;border-radius:18px;border:2px dashed rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:34px;opacity:.55;">+</div>
        <div style="height:36px;"></div>
      </div>
    `;
  }

  function inlineInviteFormMarkup() {
    if (!isLeader()) return "";
    return `
      <div style="display:grid;grid-template-columns:auto minmax(180px,320px);gap:10px;align-items:center;justify-content:start;margin-bottom:14px;">
        <button id="partySendInlineInviteBtn" type="button">Invite Player</button>
        <input id="partyInlineInviteName" type="text" value="${esc(state.inviteDraft)}" placeholder="Hero Name" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
      </div>
    `;
  }

  function partySlotsMarkup(party) {
    const members = Array.isArray(party.members) ? party.members : [];
    const totalAttack = num(party?.totalAttack, members.reduce((sum, member) => sum + num(member?.heroAttack, 0), 0));
    const totalDefense = num(party?.totalDefense, members.reduce((sum, member) => sum + num(member?.heroDefense, 0), 0));
    const totalHp = num(party?.totalHp, members.reduce((sum, member) => sum + num(member?.heroHP, 0), 0));
    const totalHpMax = num(party?.totalHpMax, members.reduce((sum, member) => sum + num(member?.heroHPMax, 0), 0));
    const selectedMonster = selectedPartyMonsterFromParty(party);
    const selectedMonsterProgress = selectedMonster ? monsterProgressEntry(selectedMonster.id) : null;
    const milestones = selectedMonster ? partyMonsterMilestones(selectedMonster.id) : [];
    const bonuses = partyFightBonuses();
    const canRunFight = members.length >= 2 && !!selectedMonster && !!selectedMonsterProgress?.unlocked;
    const latest = state.lastPersonalFightResult;
    const slots = [];
    for (let index = 0; index < 4; index += 1) {
      const member = members[index] || null;
      if (member) {
        slots.push(partySlotCardMarkup(member));
      } else {
        slots.push(partyEmptySlotMarkup());
      }
    }
    return `
      <section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.02);">
        ${inlineInviteFormMarkup()}
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;align-items:start;">
          ${slots.join("")}
        </div>
        <div style="margin-top:18px;display:grid;justify-items:center;gap:10px;text-align:center;">
          ${selectedMonster
            ? `
              <div style="position:relative;display:grid;grid-template-columns:110px auto;gap:16px;align-items:center;">
                <div style="position:relative;">
                  <img src="${esc(selectedMonster.img)}" alt="${esc(selectedMonster.name)}" style="width:110px;height:110px;border-radius:18px;border:3px solid #c79b44;object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.28);">
                  <button id="partyMonsterInfoBtn" type="button" style="position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(15,18,28,.92);color:#f3ead6;font-weight:900;padding:0;line-height:1;min-width:0;">i</button>
                  ${state.monsterInfoOpen ? `
                    <div style="position:absolute;top:34px;right:0;z-index:4;min-width:180px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg, rgba(20,23,36,.98), rgba(12,14,24,.98));box-shadow:0 18px 42px rgba(0,0,0,.34);text-align:left;">
                      <div style="font-size:12px;font-weight:900;color:#f3ead6;">${esc(selectedMonster.name)}</div>
                      <div style="margin-top:6px;font-size:12px;opacity:.86;">Kills: ${num(selectedMonsterProgress?.kills, 0)}</div>
                      ${selectedMonsterProgress?.unlocked ? `` : `<div style="margin-top:4px;font-size:12px;opacity:.76;">Counts start after unlock.</div>`}
                    </div>
                  ` : ``}
                </div>
                <div style="display:grid;gap:10px;justify-items:start;text-align:left;">
                  <div class="dungeonStats" style="grid-template-columns:minmax(0,66px);justify-content:start;margin-top:0;padding-top:0;border-top:0;width:66px;">
                    <div class="dungeonStatBox">
                      <div class="dungeonStatIcon" aria-hidden="true">&#9876;&#65039;</div>
                      <div class="dungeonStatValue">${num(selectedMonster.attack, 0)}</div>
                    </div>
                    <div class="dungeonStatBox">
                      <div class="dungeonStatIcon" aria-hidden="true">&#128737;&#65039;</div>
                      <div class="dungeonStatValue">${num(selectedMonster.defense, 0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            `
            : `<div style="width:110px;height:110px;border-radius:18px;border:2px dashed rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:18px;opacity:.55;">Monster</div>`}
          <div style="font-weight:900;font-size:18px;line-height:1.1;">${esc(selectedMonster?.name || "No Monster Selected")}</div>
          ${isLeader() ? `<button id="partyChooseMonsterBtn" type="button">Choose Monster</button>` : ``}
        </div>
        <div style="margin-top:14px;padding:10px 14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03);text-align:center;font-weight:800;">
          Total Attack : ${num(totalAttack, 0)} , Total Defense : ${num(totalDefense, 0)} , Party HP : ${num(totalHp, 0)} / ${num(totalHpMax, 0)}
        </div>
        <div style="margin-top:12px;padding:10px 14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03);text-align:center;font-weight:800;">
          Party Fight Bonus : ATK +${(Math.max(0, num(bonuses.atkPct, 0)) * 100).toFixed(1)}% , DEF +${(Math.max(0, num(bonuses.defPct, 0)) * 100).toFixed(1)}%
        </div>
        <div style="margin-top:14px;display:grid;gap:12px;">
          <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(255,255,255,.025);display:grid;gap:10px;">
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
              <div style="font-size:16px;font-weight:900;">Party Fight</div>
              <button id="partyOpenBattleBtn" type="button" ${canRunFight ? "" : "disabled"}>Start Battle</button>
            </div>
            <div style="font-size:12px;opacity:.84;">
              Needs 2+ party members. Start Battle opens the fight and auto-resolves one action every 6 seconds using your own stamina and healing while the party shares stat and HP contribution.
            </div>
            ${selectedMonster ? `
              <div style="font-size:12px;opacity:.82;">
                Your kills on ${esc(selectedMonster.name)}: ${num(selectedMonsterProgress?.kills, 0)}
              </div>
            ` : `<div style="font-size:12px;opacity:.82;">Choose a monster first.</div>`}
            ${latest ? `
              <div style="padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03);display:grid;gap:6px;">
                <div style="font-weight:900;">Latest Result: ${esc(String(latest.outcome || "").toUpperCase())}</div>
                <div style="font-size:12px;opacity:.86;">Rounds: ${num(latest.rounds, 0)} | Damage Dealt: ${num(latest.totalDamageDealt, 0)} | Damage Taken: ${num(latest.personalDamageTaken, 0)}</div>
                <div style="font-size:12px;opacity:.86;">Rewards: XP ${num(latest.xp, 0)} | Gold ${num(latest.gold, 0)}${num(latest.partyPoints, 0) > 0 ? ` | PP ${num(latest.partyPoints, 0)}` : ""}</div>
                <div style="font-size:12px;opacity:.86;">Party HP: ${num(latest.partyHpRemaining, 0)} / ${num(latest.partyHpMax, 0)} | Stamina Left: ${num(latest.staminaRemaining, 0)}</div>
                ${Array.isArray(latest.milestoneRewards) && latest.milestoneRewards.length ? `<div style="font-size:12px;color:#f0d58b;">Milestones: ${latest.milestoneRewards.map((entry) => esc(entry.rewardLabel || "Reward")).join(" | ")}</div>` : ``}
              </div>
            ` : ``}
          </div>
          ${selectedMonster && milestones.length ? `
            <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(255,255,255,.025);display:grid;gap:10px;">
              <div style="font-size:15px;font-weight:900;">${esc(selectedMonster.name)} Milestones</div>
              ${milestones.map((entry) => `
                <div style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02);">
                  <div style="font-weight:900;">${num(entry.kills, 0)}</div>
                  <div style="font-size:12px;opacity:.86;">${esc(entry.rewardLabel || "Reward")} (${num(entry.progress, 0)}/${num(entry.kills, 0)})</div>
                  <div style="font-size:12px;font-weight:900;color:${entry.claimed ? "#9df0aa" : entry.reached ? "#f0d58b" : "#d6c7a1"};">${entry.claimed ? "Claimed" : entry.reached ? "Ready" : "Locked"}</div>
                </div>
              `).join("")}
            </div>
          ` : ``}
        </div>
      </section>
    `;
  }

  function leaderPartyMarkup(party) {
    return `
      <div style="display:grid;gap:14px;">
        ${partySlotsMarkup(party)}

        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-start;">
          <button id="partyDisbandBtn" type="button">Disband Party</button>
          <button id="partyLeaveBtn" type="button">Leave Party</button>
        </div>
        ${inviteModalMarkup()}
      </div>
    `;
  }

  function memberPartyMarkup(party) {
    return `
      <div style="display:grid;gap:14px;">
        ${partySlotsMarkup(party)}
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-start;">
          <button id="partyLeaveBtn" type="button">Leave Party</button>
        </div>
      </div>
    `;
  }

  function openPartyListMarkup() {
    const entries = openParties();
    if (!entries.length) {
      return `<div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);opacity:.78;">No open parties right now.</div>`;
    }
    return entries.map((entry) => `
      <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);display:grid;gap:6px;">
        <div><strong>Party:</strong> ${esc(entry.name)}</div>
        <div><strong>Leader:</strong> ${esc(entry.leaderName)}</div>
        <div><strong>Members:</strong> ${num(entry.memberCount, 0)} / ${num(entry.maxMembers, 4)}</div>
        <div><strong>Activity:</strong> ${esc(entry.activity)}</div>
        <div><strong>Requirement:</strong> Level ${num(entry.minLevel, 1)}+</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
          <button type="button" data-party-view="${esc(entry.id)}">View</button>
          <button type="button" data-party-request="${esc(entry.id)}" ${myParty() ? "disabled" : ""}>Join</button>
        </div>
      </div>
    `).join("");
  }

  function selectedOpenPartyMarkup() {
    const detail = openParties().find((entry) => String(entry.id) === String(state.selectedPartyId || ""));
    if (!detail) return "";
    return `
      <section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
        <div style="font-size:16px;font-weight:800;margin-bottom:12px;">Party Details</div>
        <div style="display:grid;gap:8px;">
          <div><strong>Party Name:</strong> ${esc(detail.name)}</div>
          <div><strong>Leader:</strong> ${esc(detail.leaderName)}</div>
          <div><strong>Members:</strong> ${num(detail.memberCount, 0)} / ${num(detail.maxMembers, 4)}</div>
          <div><strong>Activity:</strong> ${esc(detail.activity)}</div>
          <div><strong>Requirement:</strong> Level ${num(detail.minLevel, 1)}+</div>
          <div><strong>Auto Accept:</strong> ${detail.autoAcceptRequests ? "On" : "Off"}</div>
        </div>
        <div style="margin-top:14px;font-weight:800;">Current Roster</div>
        <div style="display:grid;gap:8px;margin-top:10px;">
          ${(detail.members || []).map((member) => `
            <div style="display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;padding:8px 10px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.02);">
              <img src="${esc(normalizeAvatarUrl(member.avatarUrl))}" alt="${esc(member.heroName)}" style="width:40px;height:40px;border-radius:10px;border:2px solid #333;object-fit:cover;">
              <div>${esc(member.heroName)} <span style="opacity:.72;">Lv ${num(member.heroLevel, 1)}</span></div>
              <div style="opacity:.72;">${member.role === "leader" ? "Leader" : "Member"}</div>
            </div>
          `).join("")}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
          <button type="button" data-party-request="${esc(detail.id)}" ${myParty() ? "disabled" : ""}>Join</button>
          <button type="button" id="partyBackToListBtn">Back</button>
        </div>
      </section>
    `;
  }

  function findPartyMarkup() {
    return state.selectedPartyId
      ? selectedOpenPartyMarkup()
      : `
        <section style="display:grid;gap:14px;">
          <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
            <div style="font-size:16px;font-weight:800;margin-bottom:12px;">Open Parties</div>
            <div id="partyOpenList" style="display:grid;gap:12px;">${openPartyListMarkup()}</div>
          </div>
        </section>
      `;
  }

  function invitesMarkup() {
    const myInvites = invites();
    const pendingRequests = myJoinRequests();
    return `
      <section style="display:grid;gap:14px;">
        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="font-size:16px;font-weight:800;margin-bottom:12px;">Incoming Invites</div>
          ${myInvites.length ? myInvites.map((invite) => `
            <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);max-width:440px;margin-bottom:12px;">
              <div style="font-size:16px;font-weight:800;margin-bottom:10px;">${esc(invite.partyName)}</div>
              <div style="display:grid;gap:6px;">
                <div>Invited by: ${esc(invite.fromHeroName)}</div>
                <div>Members: ${num(invite.memberCount, 0)} / ${num(invite.maxMembers, 4)}</div>
                <div>Activity: ${esc(invite.activity)}</div>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
                <button type="button" data-party-accept-invite="${esc(invite.id)}">Accept</button>
                <button type="button" data-party-decline-invite="${esc(invite.id)}">Decline</button>
              </div>
            </div>
          `).join("") : `<div style="opacity:.78;">No pending invites.</div>`}
        </div>

        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="font-size:16px;font-weight:800;margin-bottom:12px;">My Join Requests</div>
          ${pendingRequests.length ? pendingRequests.map((request) => `
            <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);max-width:440px;margin-bottom:12px;">
              <div style="font-size:16px;font-weight:800;margin-bottom:10px;">${esc(request.partyName)}</div>
              <div style="display:grid;gap:6px;">
                <div>Leader: ${esc(request.leaderName)}</div>
                <div>Members: ${num(request.memberCount, 0)} / ${num(request.maxMembers, 4)}</div>
                <div>Activity: ${esc(request.activity)}</div>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
                <button type="button" data-party-cancel-request="${esc(request.id)}">Cancel Request</button>
              </div>
            </div>
          `).join("") : `<div style="opacity:.78;">No pending join requests.</div>`}
        </div>
      </section>
    `;
  }

  function partyFightMarkup() {
    const party = myParty();
    if (!party) {
      return `
        <section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="font-size:16px;font-weight:800;margin-bottom:10px;">Party Fight</div>
          <div style="opacity:.82;">Create or join a party first. Party Fight will only be available for parties with 2 to 4 members.</div>
        </section>
      `;
    }

    const members = Array.isArray(party.members) ? party.members : [];
    const groups = partyFightPlayerGroups(members);
    const monster = selectedPartyMonsterFromParty(party);
    const latestRound = state.lastPersonalFightResult || null;
    const totalAttack = num(party?.totalAttack, members.reduce((sum, member) => sum + num(member?.heroAttack, 0), 0));
    const totalDefense = num(party?.totalDefense, members.reduce((sum, member) => sum + num(member?.heroDefense, 0), 0));
    const totalHp = num(latestRound?.partyHpRemaining, num(party?.totalHp, members.reduce((sum, member) => sum + num(member?.heroHP, 0), 0)));
    const totalHpMax = num(latestRound?.partyHpMax, num(party?.totalHpMax, members.reduce((sum, member) => sum + num(member?.heroHPMax, 0), 0)));
    const totalHpPct = Math.max(0, Math.min(100, (Math.max(0, totalHp) / Math.max(1, totalHpMax)) * 100));
    const monsterHpRemaining = num(latestRound?.monsterHpRemaining, num(monster?.hp, 0));
    const monsterHpMax = Math.max(1, num(latestRound?.monsterHpMax, num(monster?.hp, 1)));
    const monsterHpPct = Math.max(0, Math.min(100, (Math.max(0, monsterHpRemaining) / monsterHpMax) * 100));
    const canAttack = members.length >= 2 && !!monster && !!monsterProgressEntry(monster.id)?.unlocked;
    const latestDrops = Array.isArray(latestRound?.drops) ? latestRound.drops.filter((entry) => entry && typeof entry === "object") : [];
    return `
      <section style="display:grid;gap:14px;">
        <div style="padding:16px;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.02);display:grid;gap:16px;">
          <div id="partyFightCooldownWrap" style="display:${state.battleAutoActive ? "block" : "none"};">
            <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
              <span>Next attack</span>
              <span id="partyFightCooldownText">${state.actionBusy ? "0.0s" : "6.0s"}</span>
            </div>
            <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
              <div id="partyFightCooldownBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
            <div>
              <div style="font-size:28px;font-weight:900;line-height:1.05;">Party Battle</div>
              <div style="font-size:12px;opacity:.84;margin-top:4px;">Use your own stamina and healing. The party adds shared ATK, DEF, and HP contribution.</div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button id="partyBattleBackBtn" type="button">Back</button>
              <button id="partyBattleStopBtn" type="button" ${state.battleAutoActive ? "" : "disabled"}>Stop Battle</button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:minmax(0,1.3fr) 126px minmax(220px,.9fr);gap:18px;align-items:center;">
            <div style="display:grid;grid-template-columns:repeat(${groups.length}, minmax(0,1fr));gap:14px;align-items:start;">
              ${groups.map((group) => `
                <div style="display:grid;gap:12px;justify-items:center;">
                  ${group.map((member) => {
                    return `
                      <div style="display:grid;justify-items:center;gap:8px;text-align:center;">
                        <img src="${esc(normalizeAvatarUrl(member.avatarUrl))}" alt="${esc(member.heroName)}" style="width:96px;height:96px;border-radius:18px;border:3px solid ${member.isLeader ? "#43c26b" : "rgba(255,255,255,.22)"};object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.32);">
                        <div style="font-weight:900;font-size:17px;line-height:1.1;">${esc(member.heroName)}</div>
                        <div style="font-size:10px;opacity:.8;line-height:1.2;">ATK ${num(member?.heroAttack, 0)} | DEF ${num(member?.heroDefense, 0)}</div>
                      </div>
                    `;
                  }).join("")}
                </div>
              `).join("")}
            </div>

            <div style="display:grid;justify-items:center;">
              <img src="images/ui/my_vs_icon.webp" alt="VS" style="width:126px;height:126px;object-fit:contain;display:block;">
            </div>

            <div style="display:grid;justify-items:center;gap:10px;text-align:center;">
              ${monster
                ? `
                  <img src="${esc(monster.img)}" alt="${esc(monster.name)}" style="width:124px;height:124px;border-radius:20px;border:3px solid #c79b44;object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.32);">
                  <div style="font-size:22px;font-weight:900;line-height:1.1;">${esc(monster.name)}</div>
                  <div style="width:min(220px,100%);display:grid;gap:6px;">
                    <div style="height:8px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
                      <div style="height:100%;width:${monsterHpPct.toFixed(1)}%;border-radius:999px;background:linear-gradient(90deg,#d34f4f,#ff8a65);"></div>
                    </div>
                    <div style="font-size:11px;opacity:.86;">${num(monsterHpRemaining, 0)} / ${num(monsterHpMax, 0)} HP</div>
                  </div>
                  <div style="min-height:18px;margin-top:2px;padding:4px 8px;border-radius:999px;border:1px solid rgba(199,155,68,.35);background:rgba(59,43,18,.78);box-shadow:0 0 10px rgba(150,110,30,.14);font-size:10px;font-weight:700;line-height:1;text-align:center;color:#f5e7c0;">
                    ATK ${num(monster.attack, 0)} | DEF ${num(monster.defense, 0)}
                  </div>
                `
                : `<div style="width:124px;height:124px;border-radius:20px;border:2px dashed rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;opacity:.55;">Monster</div>`
              }
            </div>
          </div>

          <div style="display:grid;gap:10px;">
            <div style="padding:12px 14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03);display:grid;gap:8px;text-align:left;font-weight:800;">
              <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
                <div>Party HP Pool</div>
                <div style="font-size:12px;opacity:.86;">ATK ${num(totalAttack, 0)} | DEF ${num(totalDefense, 0)}</div>
              </div>
              <div style="height:10px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
                <div style="height:100%;width:${totalHpPct.toFixed(1)}%;border-radius:999px;background:linear-gradient(90deg,#2dbf73,#7dff9b);"></div>
              </div>
              <div style="font-size:12px;opacity:.86;">${num(totalHp, 0)} / ${num(totalHpMax, 0)} HP</div>
            </div>
              <div style="padding:12px 14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03);display:grid;gap:8px;text-align:left;font-weight:800;">
              ${latestRound ? `
                <div style="font-size:13px;">Result: ${esc(String(latestRound.outcome || "").toUpperCase())} in ${num(latestRound.rounds, 0)} rounds</div>
                <div style="font-size:12px;opacity:.86;">Damage dealt: ${num(latestRound.totalDamageDealt, 0)} | Damage taken: ${num(latestRound.personalDamageTaken, 0)} | Stamina left: ${num(latestRound.staminaRemaining, 0)}</div>
                <div style="font-size:12px;opacity:.86;">Rewards: XP ${num(latestRound.xp, 0)} | Gold ${num(latestRound.gold, 0)}${num(latestRound.partyPoints, 0) > 0 ? ` | PP ${num(latestRound.partyPoints, 0)}` : ""}</div>
                ${latestDrops.length ? `<div style="font-size:12px;opacity:.86;">Drops: ${latestDrops.map((entry) => `${esc(entry.name || "Drop")} x${num(entry.quantity, 1)}`).join(" | ")}</div>` : ``}
                ${Array.isArray(latestRound.milestoneRewards) && latestRound.milestoneRewards.length ? `<div style="font-size:12px;color:#f0d58b;">Milestones: ${latestRound.milestoneRewards.map((entry) => esc(entry.rewardLabel || "Reward")).join(" | ")}</div>` : ``}
              ` : `
                <div style="font-size:13px;text-align:center;">Battle starts automatically every 6 seconds after you press Start Battle.</div>
              `}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function tabsMarkup() {
    const party = myParty();
    const tabs = party
      ? [
          ["my_party", "My Party"],
          ["pending_invites", "Pending Invites"]
        ]
      : [
          ["my_party", "Create Party"],
          ["find_party", "Find Party"],
          ["invites", "Invites"]
        ];
    return `
      <div style="display:grid;grid-template-columns:repeat(${tabs.length},minmax(0,1fr));gap:10px;margin-bottom:16px;">
        ${tabs.map(([id, label]) => `
          <button
            type="button"
            data-party-tab="${id}"
            style="width:100%;padding:12px 14px;border-radius:10px;border:2px solid ${state.tab === id ? "#c79b44" : "#333"};background:${state.tab === id ? "linear-gradient(180deg, rgba(255,245,210,.16), rgba(255,255,255,.04) 36%, rgba(0,0,0,.10) 100%), linear-gradient(180deg, #6f5320 0%, #3e2d11 100%)" : "#1b1b24"};color:#f1f2f6;font-weight:800;cursor:pointer;"
          >${label}</button>
        `).join("")}
      </div>
    `;
  }

  function bodyMarkup() {
    const party = myParty();
    if (state.loading && !state.data) {
      return `<div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);opacity:.78;">Loading Party Hall...</div>`;
    }
    if (!state.data && state.lastError) {
      return `<div style="padding:14px;border:1px solid rgba(179,72,92,.45);border-radius:12px;background:rgba(78,22,34,.35);color:#ffd8de;">${esc(state.lastError)}</div>`;
    }
    if (party && state.battleView) {
      return partyFightMarkup();
    }
    if (party && isLeader() && state.monsterSelectionOpen) {
      return chooseMonsterPageMarkup(party);
    }
    if (state.tab === "my_party") {
      if (!party) return createPartyMarkup();
      return isLeader() ? leaderPartyMarkup(party) : memberPartyMarkup(party);
    }
    if (party && state.tab === "pending_invites") return pendingInvitesPageMarkup(party);
    if (state.tab === "find_party") return findPartyMarkup();
    return invitesMarkup();
  }

  function normalizePartyTab() {
    const party = myParty();
    if (!party) {
      if (!["my_party", "find_party", "invites"].includes(String(state.tab || ""))) {
        state.tab = "my_party";
      }
      return;
    }
    if (state.tab === "pending_invites") return;
    state.tab = "my_party";
    state.selectedPartyId = null;
  }

  function noticeMarkup() {
    const message = state.lastError || state.lastMessage || "";
    const isError = !!state.lastError;
    return `
      <div
        id="partyHallMsg"
        style="min-height:22px;margin:-4px 0 12px;text-align:center;font-weight:900;color:${isError ? "#ffd8de" : "#ead39b"};"
      >${esc(message)}</div>
    `;
  }

  function bindActions() {
    document.getElementById("partyCreateName")?.addEventListener("input", syncCreateDraftFromDom);
    document.getElementById("partyCreateVisibility")?.addEventListener("change", syncCreateDraftFromDom);
    document.getElementById("partyCreateMinLevel")?.addEventListener("input", syncCreateDraftFromDom);
    document.getElementById("partyInviteName")?.addEventListener("input", syncInviteDraftFromDom);
    document.getElementById("partyInlineInviteName")?.addEventListener("input", syncInviteDraftFromDom);
    document.getElementById("partyInlineInviteNamePending")?.addEventListener("input", syncInviteDraftFromDom);

    document.querySelectorAll("[data-party-tab]").forEach((btn) => btn.addEventListener("click", () => {
      stopAutoPartyBattle({ keepView: false });
      state.tab = btn.dataset.partyTab || "my_party";
      state.selectedPartyId = null;
      state.monsterSelectionOpen = false;
      state.monsterInfoOpen = false;
      renderPartyHall();
    }));

    document.getElementById("partyCreateBtn")?.addEventListener("click", async () => {
      syncCreateDraftFromDom();
      const draft = getCreateDraft();
      const name = draft.name || "";
      const visibility = draft.visibility || "private";
      const maxMembers = 4;
      const minLevel = Math.max(PARTY_HALL_MIN_LEVEL, Number(draft.minLevel || PARTY_HALL_MIN_LEVEL));
      const activity = "Party Fight";
      const autoAcceptRequests = String(visibility).toLowerCase() === "open";
      await runAction({
        action: "create_party",
        name,
        visibility,
        maxMembers,
        minLevel,
        activity,
        autoAcceptRequests
      }, "");
    });

    document.querySelectorAll("[data-party-open-invite-modal]").forEach((btn) => btn.addEventListener("click", () => {
      state.inviteModalOpen = true;
      renderPartyHall();
      window.setTimeout(() => document.getElementById("partyInviteName")?.focus(), 0);
    }));

    document.getElementById("partyChooseMonsterBtn")?.addEventListener("click", () => {
      stopAutoPartyBattle({ keepView: false });
      state.monsterSelectionOpen = true;
      state.monsterInfoOpen = false;
      renderPartyHall();
    });

    document.getElementById("partyMonsterBackBtn")?.addEventListener("click", () => {
      state.monsterSelectionOpen = false;
      renderPartyHall();
    });

    document.querySelectorAll("[data-party-choose-monster]").forEach((btn) => btn.addEventListener("click", async () => {
      const party = myParty();
      const selectedMonsterId = btn.dataset.partyChooseMonster || "";
      if (!party || !selectedMonsterId) return;
      await runAction({ action: "choose_monster", partyId: party.id, selectedMonsterId }, "");
      stopAutoPartyBattle({ keepView: false });
      state.monsterSelectionOpen = false;
      state.monsterInfoOpen = false;
      renderPartyHall();
    }));

    document.getElementById("partyMonsterInfoBtn")?.addEventListener("click", (event) => {
      event.stopPropagation();
      state.monsterInfoOpen = !state.monsterInfoOpen;
      renderPartyHall();
    });

    document.getElementById("partyCloseInviteModalBtn")?.addEventListener("click", () => {
      syncInviteDraftFromDom();
      state.inviteModalOpen = false;
      renderPartyHall();
    });

    document.getElementById("partyInviteModalBackdrop")?.addEventListener("click", (event) => {
      if (event.target?.id !== "partyInviteModalBackdrop") return;
      syncInviteDraftFromDom();
      state.inviteModalOpen = false;
      renderPartyHall();
    });

    document.getElementById("partySendInviteBtn")?.addEventListener("click", async () => {
      const party = myParty();
      if (!party) return;
      syncInviteDraftFromDom();
      const targetHeroName = String(document.getElementById("partyInviteName")?.value || "").trim();
      if (!targetHeroName) {
        setNotice("Write a hero name first.", true);
        return;
      }
      await runAction({
        action: "invite_player",
        partyId: party.id,
        targetHeroName
      }, `Invite sent to ${targetHeroName}.`);
      state.inviteModalOpen = false;
      state.inviteDraft = "";
      const input = document.getElementById("partyInviteName");
      if (input) input.value = "";
    });

    document.getElementById("partySendInlineInviteBtn")?.addEventListener("click", async () => {
      const party = myParty();
      if (!party) return;
      syncInviteDraftFromDom();
      const input = document.getElementById("partyInlineInviteName") || document.getElementById("partyInlineInviteNamePending");
      const targetHeroName = String(input?.value || "").trim();
      if (!targetHeroName) {
        setNotice("Write a hero name first.", true);
        input?.focus();
        return;
      }
      await runAction({
        action: "invite_player",
        partyId: party.id,
        targetHeroName
      }, `Invite sent to ${targetHeroName}.`);
      state.inviteDraft = "";
      if (input) input.value = "";
    });

    ["partyInlineInviteName", "partyInlineInviteNamePending"].forEach((id) => {
      document.getElementById(id)?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        document.getElementById("partySendInlineInviteBtn")?.click();
      });
    });

    document.getElementById("partyLeaveBtn")?.addEventListener("click", async () => {
      stopAutoPartyBattle({ keepView: false });
      await runAction({ action: "leave_party" }, "");
    });

    document.getElementById("partyOpenBattleBtn")?.addEventListener("click", () => {
      state.battleView = true;
      renderPartyHall();
      startAutoPartyBattle();
    });

    document.getElementById("partyBattleBackBtn")?.addEventListener("click", () => {
      stopAutoPartyBattle({ keepView: false });
      renderPartyHall();
    });

    document.getElementById("partyBattleStopBtn")?.addEventListener("click", () => {
      stopAutoPartyBattle({ keepView: true });
      renderPartyHall();
    });

    document.querySelectorAll("[data-party-kick-member]").forEach((btn) => btn.addEventListener("click", async () => {
      const targetUserId = String(btn.dataset.partyKickMember || "");
      const party = myParty();
      const member = Array.isArray(party?.members) ? party.members.find((entry) => String(entry?.userId || "") === targetUserId) : null;
      const name = String(member?.heroName || "this player");
      if (!targetUserId || !party) return;
      if (!window.confirm(`Kick ${name} from the party?`)) return;
      stopAutoPartyBattle({ keepView: false });
      await runAction({ action: "kick_member", partyId: party.id, targetUserId }, `${name} was kicked from the party.`);
    }));

    document.getElementById("partyDisbandBtn")?.addEventListener("click", async () => {
      const party = myParty();
      if (!party) return;
      stopAutoPartyBattle({ keepView: false });
      await runAction({ action: "disband_party", partyId: party.id }, "Party disbanded.");
    });

    document.querySelectorAll("[data-party-view]").forEach((btn) => btn.addEventListener("click", () => {
      state.selectedPartyId = btn.dataset.partyView || null;
      renderPartyHall();
    }));

    document.getElementById("partyBackToListBtn")?.addEventListener("click", () => {
      state.selectedPartyId = null;
      renderPartyHall();
    });

    document.querySelectorAll("[data-party-request]").forEach((btn) => btn.addEventListener("click", async () => {
      const partyId = btn.dataset.partyRequest || "";
      if (!partyId) return;
      const data = await runAction({ action: "request_join", partyId }, "Joined party.");
      if (!data) return;
      state.tab = "my_party";
      state.selectedPartyId = null;
      stopAutoPartyBattle({ keepView: false });
      state.monsterSelectionOpen = false;
      state.monsterInfoOpen = false;
      renderPartyHall();
    }));

    document.querySelectorAll("[data-party-accept-invite]").forEach((btn) => btn.addEventListener("click", async () => {
      const data = await runAction({ action: "respond_invite", inviteId: btn.dataset.partyAcceptInvite || "", response: "accept" }, "Joined party.");
      if (data) openMyPartyScreen();
    }));

    document.querySelectorAll("[data-party-decline-invite]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "respond_invite", inviteId: btn.dataset.partyDeclineInvite || "", response: "decline" }, "");
    }));

    document.querySelectorAll("[data-party-approve-request]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "respond_join_request", requestId: btn.dataset.partyApproveRequest || "", response: "approve" }, "");
    }));

    document.querySelectorAll("[data-party-reject-request]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "respond_join_request", requestId: btn.dataset.partyRejectRequest || "", response: "reject" }, "");
    }));

    document.querySelectorAll("[data-party-cancel-request]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "cancel_join_request", requestId: btn.dataset.partyCancelRequest || "" }, "");
    }));
  }

  function renderInvitePopups() {
    publishInviteNoticeFromState();
    const host = document.getElementById("partyInvitePopupHost");
    if (host) host.innerHTML = "";
  }

  function renderPartyHall() {
    const shell = document.getElementById("partyHallCard");
    if (!shell) return;
    preservePartyInputsFromDom();
    normalizePartyTab();
    shell.innerHTML = `
      ${hallSummaryMarkup()}
      ${tabsMarkup()}
      ${noticeMarkup()}
      ${bodyMarkup()}
    `;
    bindActions();
    updatePartyFightTimerUI();
  }

  function mountPartyHall(root = null) {
    const left = root || document.getElementById("leftPanel");
    if (!left) return false;
    left.innerHTML = `
      <div id="partyHallRoot" style="max-width:980px;margin:0 auto;">
        <div id="partyHallCard" style="background:rgba(0,0,0,.15);border:3px solid rgba(0,0,0,.55);padding:14px;border-radius:12px;"></div>
      </div>
    `;
    document.title = "Darkstone Chronicles - Party Hall";
    state.selectedPartyId = null;
    renderPartyHall();
    loadPartyState();
    return true;
  }

  function initStandalonePartyHall() {
    if (!document.getElementById("partyHallRoot")) return false;
    document.title = "Darkstone Chronicles - Party Hall";
    renderPartyHall();
    loadPartyState();
    return true;
  }

  function startPolling() {
    const intervalMs = currentPollIntervalMs();
    if (state.pollTimer && state.pollIntervalMs === intervalMs) return;
    if (state.pollTimer) window.clearInterval(state.pollTimer);
    state.pollIntervalMs = intervalMs;
    state.pollTimer = window.setInterval(() => {
      if (document.hidden) return;
      loadPartyState({ silent: true });
    }, intervalMs);
  }

  function restartPollingIfNeeded() {
    if (!state.initialized) return;
    const intervalMs = currentPollIntervalMs();
    if (!state.pollTimer || state.pollIntervalMs !== intervalMs) startPolling();
  }

  function startUiTimer() {
    if (!("requestAnimationFrame" in window)) return;
    if (state.uiRaf) return;
    const tick = () => {
      if (!document.hidden) {
        updatePartyFightTimerUI();
      }
      state.uiRaf = window.requestAnimationFrame(tick);
    };
    state.uiRaf = window.requestAnimationFrame(tick);
  }

  function startFallbackUiTimer() {
    if (state.uiTimer || "requestAnimationFrame" in window) return;
    state.uiTimer = window.setInterval(() => {
      if (document.hidden) return;
      updatePartyFightTimerUI();
    }, 100);
  }

  async function initRealtime() {
    if (!window.DSAuth?.invokePartyAction) return;
    if (!hasPartyPage()) return;
    if (state.initialized) {
      startPolling();
      startUiTimer();
      startFallbackUiTimer();
      await loadPartyState({ silent: true });
      return;
    }
    state.initialized = true;
    startPolling();
    startUiTimer();
    startFallbackUiTimer();
    await loadPartyState({ silent: true });
  }

  window.DSPartyHall = {
    mount: mountPartyHall,
    initRealtime,
    initInviteWatcher,
    confirmStopPartyFightForNavigation,
    getCurrentPartyId: () => String(myParty()?.id || "")
  };
  window.addEventListener("DOMContentLoaded", () => {
    initStandalonePartyHall();
    initInviteWatcher();
    if (hasPartyPage()) initRealtime();
  });
  window.addEventListener("ds:auth", () => {
    initInviteWatcher();
    if (hasPartyPage()) initRealtime();
  });
  window.addEventListener("visibilitychange", () => {
    if (!document.hidden) queueInviteRefresh(250);
    if (!document.hidden && hasPartyPage()) loadPartyState({ silent: true });
  });
})();
