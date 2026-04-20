(() => {
  const POLL_MS = 1500;
  const PARTY_FIGHT_MONSTERS = [
    {
      id: "gravefang-hydra",
      name: "Gravefang Hydra",
      img: "images/mobs/fighting/zone10/void_devourer.png",
      attack: 58,
      defense: 46,
      role: "Multi-Target Bruiser",
      levelText: "Recommended Party Lv 18+",
      description: "A many-headed void beast that rewards coordinated focus fire and punishes weak target priority."
    },
    {
      id: "embermaw-colossus",
      name: "Embermaw Colossus",
      img: "images/mobs/fighting/zone9/inferno_titan.png",
      attack: 64,
      defense: 60,
      role: "Frontline Tank",
      levelText: "Recommended Party Lv 22+",
      description: "A molten giant with crushing melee phases and dangerous burst windows."
    },
    {
      id: "thornveil-broodmother",
      name: "Thornveil Broodmother",
      img: "images/mobs/fighting/zone7/heart_of_the_thicket.png",
      attack: 49,
      defense: 38,
      role: "Summoner",
      levelText: "Recommended Party Lv 16+",
      description: "A corrupted forest matriarch that overwhelms slow parties with constant reinforcements."
    },
    {
      id: "stormglass-seraph",
      name: "Stormglass Seraph",
      img: "images/mobs/fighting/zone8/ancient_storm_avatar.png",
      attack: 61,
      defense: 41,
      role: "Ranged Caster",
      levelText: "Recommended Party Lv 20+",
      description: "An aerial caster that chains pressure across the whole party with storm magic."
    },
    {
      id: "cryptwarden-revenant",
      name: "Cryptwarden Revenant",
      img: "images/mobs/fighting/zone2/lord_of_the_broken_keep.png",
      attack: 44,
      defense: 52,
      role: "Control Boss",
      levelText: "Recommended Party Lv 14+",
      description: "An armored undead commander built around control effects and punishing mispositioning."
    }
  ];

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
    uiTimer: 0,
    boundaryFetchAt: 0,
    boundaryResolvedCount: -1,
    lastMessage: "",
    lastError: "",
    createDraft: null,
    inviteDraft: "",
  };

  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
  const hasPartyPage = () => !!document.getElementById("partyHallCard");

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
      avatarUrl: "images/hero.png",
    };
  }

  function myParty() {
    return state.data?.myParty || null;
  }

  function myRole() {
    return String(myParty()?.role || "none");
  }

  function isLeader() {
    return myRole() === "leader";
  }

  function defaultCreateDraft() {
    const me = profile();
    return {
      name: `${me.heroName}'s Party`,
      visibility: "private",
      minLevel: String(num(me.heroLevel, 1)),
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
    const input = document.getElementById("partyInviteName");
    if (input) state.inviteDraft = input.value;
  }

  function isInviteFormActive() {
    const modal = document.getElementById("partyInviteModalBackdrop");
    return !!modal && !!document.activeElement && modal.contains(document.activeElement);
  }

  function isPartyInputActive() {
    return isCreatePartyFormActive() || isInviteFormActive();
  }

  function preservePartyInputsFromDom() {
    syncCreateDraftFromDom();
    syncInviteDraftFromDom();
  }

  function shouldSkipSilentRender() {
    return !!document.getElementById("partyCreateForm")
      || !!document.getElementById("partyInviteModalBackdrop")
      || isPartyInputActive();
  }

  function openParties() {
    return Array.isArray(state.data?.openParties) ? state.data.openParties : [];
  }

  function invites() {
    return Array.isArray(state.data?.invites) ? state.data.invites : [];
  }

  function myJoinRequests() {
    return Array.isArray(state.data?.myJoinRequests) ? state.data.myJoinRequests : [];
  }

  function partyMonsterProgress() {
    return Array.isArray(state.data?.partyMonsterProgress) ? state.data.partyMonsterProgress : [];
  }

  function monsterProgressEntry(monsterId) {
    return partyMonsterProgress().find((entry) => String(entry?.monsterId || "") === String(monsterId || "")) || null;
  }

  function selectedPartyFightMonster() {
    return PARTY_FIGHT_MONSTERS.find((entry) => entry.id === state.selectedPartyFightMonsterId) || null;
  }

  function selectedPartyMonsterFromParty(party) {
    return PARTY_FIGHT_MONSTERS.find((entry) => entry.id === String(party?.selectedMonsterId || "").trim()) || null;
  }

  function activeSessionPayload(party) {
    const payload = party?.activeSession?.resultPayload;
    return payload && typeof payload === "object" ? payload : {};
  }

  function activePartyFightMonster(party) {
    const payload = activeSessionPayload(party);
    const payloadMonsterId = String(payload.selectedMonsterId || "").trim();
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
    const resolvedCount = Math.max(0, num(payload.resolvedCount, 0));
    const nextAt = startedAt + ((resolvedCount + 1) * encounterMs);
    const remain = Math.max(0, (nextAt - Date.now()) / 1000);
    return `${remain.toFixed(1)}s`;
  }

  function encounterCountdownMs(party) {
    const session = party?.activeSession;
    const payload = activeSessionPayload(party);
    const encounterMs = Math.max(1000, num(payload.encounterMs, 6000));
    const startedAt = Date.parse(String(session?.startedAt || ""));
    if (!Number.isFinite(startedAt)) return encounterMs;
    const resolvedCount = Math.max(0, num(payload.resolvedCount, 0));
    const nextAt = startedAt + ((resolvedCount + 1) * encounterMs);
    return Math.max(0, nextAt - Date.now());
  }

  function encounterProgressPct(party) {
    const session = party?.activeSession;
    const payload = activeSessionPayload(party);
    const encounterMs = Math.max(1000, num(payload.encounterMs, 6000));
    const startedAt = Date.parse(String(session?.startedAt || ""));
    if (!Number.isFinite(startedAt)) return 0;
    const resolvedCount = Math.max(0, num(payload.resolvedCount, 0));
    const currentCycleStart = startedAt + (resolvedCount * encounterMs);
    const elapsed = Math.max(0, Date.now() - currentCycleStart);
    return Math.max(0, Math.min(100, (elapsed / encounterMs) * 100));
  }

  function partyFightPlayerGroups(members) {
    const safeMembers = Array.isArray(members) ? members.filter(Boolean) : [];
    if (safeMembers.length <= 2) return [safeMembers];
    if (safeMembers.length === 3) return [[safeMembers[0]], [safeMembers[1], safeMembers[2]]];
    return [safeMembers.slice(0, 2), safeMembers.slice(2, 4)];
  }

  function updatePartyFightTimerUI() {
    const wrap = document.getElementById("partyFightCooldownWrap");
    const text = document.getElementById("partyFightCooldownText");
    const bar = document.getElementById("partyFightCooldownBar");
    if (!wrap || !text || !bar) return;
    const party = myParty();
    const isActivePartyFight = party && party.state === "active" && String(party.activity || "").toLowerCase().includes("party fight");
    if (!isActivePartyFight) {
      wrap.style.display = "none";
      bar.style.width = "0%";
      text.textContent = "6.0s";
      return;
    }
    wrap.style.display = "";
    text.textContent = formatEncounterCountdown(party);
    bar.style.width = `${encounterProgressPct(party).toFixed(1)}%`;

    const payload = activeSessionPayload(party);
    const resolvedCount = Math.max(0, num(payload.resolvedCount, 0));
    const remainMs = encounterCountdownMs(party);
    if (remainMs <= 150 && !state.loading && !state.actionBusy) {
      const now = Date.now();
      const sameRound = state.boundaryResolvedCount === resolvedCount;
      if (!sameRound || (now - state.boundaryFetchAt) >= 350) {
        state.boundaryResolvedCount = resolvedCount;
        state.boundaryFetchAt = now;
        Promise.resolve(loadPartyState({ silent: true })).catch(() => {});
      }
    }
  }

  async function loadPartyState({ silent = false } = {}) {
    if (!window.DSAuth?.invokePartyAction) return null;
    if (state.loading && silent) return state.data;
    state.loading = true;
    try {
      const previousParty = state.data?.myParty || null;
      const previousResolvedCount = num(activeSessionPayload(previousParty).resolvedCount, -1);
      const data = await window.DSAuth.invokePartyAction({ action: "bootstrap" });
      state.data = data || null;
      const nextResolvedCount = num(activeSessionPayload(state.data?.myParty || null).resolvedCount, -1);
      if (nextResolvedCount > previousResolvedCount) {
        state.boundaryResolvedCount = nextResolvedCount;
        window.DSAuth?.syncCloudSaveNow?.();
      }
      const noticeMessage = String(state.data?.myParty?.noticeMessage || "").trim();
      if (noticeMessage) {
        setNotice(noticeMessage);
      } else if (!silent && !state.lastError) {
        setNotice(state.lastMessage || "");
      }
      renderInvitePopups();
      if (hasPartyPage() && !(silent && shouldSkipSilentRender())) renderPartyHall();
      return data;
    } catch (error) {
      if (!silent) {
        state.lastError = error?.message || "Failed to load Party Hall.";
      }
      if (hasPartyPage() && !silent) renderPartyHall();
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
      state.lastError = "";
      setNotice(data?.message || successMessage || "Party updated.");
      renderInvitePopups();
      if (hasPartyPage()) renderPartyHall();
      return data;
    } catch (error) {
      setNotice(error?.message || "Party action failed.", true);
      if (hasPartyPage()) renderPartyHall();
      return null;
    } finally {
      state.actionBusy = false;
    }
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
              <input id="partyCreateMinLevel" type="number" min="1" value="${esc(draft.minLevel)}" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
            </label>
          </div>
          <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
            <button id="partyCreateBtn" type="button">Create Party</button>
          </div>
        </div>
        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);display:grid;gap:4px;opacity:.9;">
          <div>- Private means only invited players can join.</div>
          <div>- Open means players can find your party and send a join request.</div>
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
        <img src="${esc(member.avatarUrl)}" alt="${esc(member.heroName)}" style="width:52px;height:52px;border-radius:12px;border:2px solid #333;object-fit:cover;">
        <div>
          <div style="font-weight:800;">${esc(member.heroName)}</div>
          <div style="opacity:.76;font-size:12px;">Level ${num(member.heroLevel, 1)}${member.userId === meId ? " - You" : ""}</div>
        </div>
        <div style="opacity:.82;">${member.isLeader ? "Leader" : "Member"}</div>
        <div style="color:${member.ready ? "#9df0aa" : "#d6c7a1"};font-weight:800;">${member.ready ? "Ready" : "Not Ready"}</div>
        ${showLeaderTools && !member.isLeader ? `<button type="button" data-party-kick="${esc(member.userId)}" disabled title="Kick member will be added next.">Kick</button>` : ""}
      </div>
    `).join("");
  }

  function pendingInvitesMarkup(party) {
    const pending = Array.isArray(party.pendingInvites) ? party.pendingInvites : [];
    if (!pending.length) return `<div style="opacity:.72;">No pending invites.</div>`;
    return pending.map((entry) => `
      <div style="padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02);display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;">
        <img src="${esc(entry.avatarUrl)}" alt="${esc(entry.heroName)}" style="width:44px;height:44px;border-radius:12px;border:2px solid #333;object-fit:cover;">
        <div>
          <div style="font-weight:800;">${esc(entry.heroName)}</div>
          <div style="opacity:.72;font-size:12px;">Level ${num(entry.heroLevel, 1)}</div>
        </div>
        <div style="opacity:.72;font-size:12px;">Pending</div>
      </div>
    `).join("");
  }

  function pendingJoinRequestsMarkup(party) {
    const requests = Array.isArray(party.pendingJoinRequests) ? party.pendingJoinRequests : [];
    if (!requests.length) return `<div style="opacity:.72;">No pending join requests.</div>`;
    return requests.map((entry) => `
      <div style="padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02);display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;">
        <img src="${esc(entry.avatarUrl)}" alt="${esc(entry.heroName)}" style="width:44px;height:44px;border-radius:12px;border:2px solid #333;object-fit:cover;">
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
            const selected = String(party?.selectedMonsterId || "") === monster.id;
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
                  <div style="opacity:.78;font-size:12px;margin-top:4px;">${esc(monster.role)}</div>
                  <div style="opacity:.74;font-size:12px;margin-top:6px;">ATK ${num(monster.attack, 0)}  DEF ${num(monster.defense, 0)}</div>
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

  function partySlotCardMarkup(member, label) {
    const frameColor = member.isLeader || member.ready ? "#43c26b" : "#c45151";
    return `
      <div style="display:grid;justify-items:center;align-content:start;gap:10px;text-align:center;">
        <div style="padding:4px 10px;border-radius:999px;background:rgba(231,192,110,.14);border:1px solid rgba(231,192,110,.18);color:#f0d38d;font-weight:800;font-size:12px;">${esc(label)}</div>
        <img src="${esc(member.avatarUrl)}" alt="${esc(member.heroName)}" style="width:110px;height:110px;border-radius:18px;border:3px solid ${frameColor};object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.28);">
        <div style="font-weight:900;font-size:18px;line-height:1.1;">${esc(member.heroName)}</div>
        <div style="font-size:12px;opacity:.82;letter-spacing:.02em;">ATT ${num(member.heroAttack, 0)}  DEF ${num(member.heroDefense, 0)}</div>
      </div>
    `;
  }

  function partyEmptySlotMarkup(party) {
    const isPrivate = String(party.visibility || "").toLowerCase() === "private";
    return `
      <div style="display:grid;justify-items:center;align-content:start;gap:10px;text-align:center;">
        <div style="padding:4px 10px;border-radius:999px;background:transparent;border:1px solid transparent;color:transparent;font-weight:800;font-size:12px;">Empty</div>
        <div style="width:110px;height:110px;border-radius:18px;border:2px dashed rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:34px;opacity:.55;">+</div>
        ${isPrivate ? `<button type="button" data-party-open-invite-modal="1">Invite</button>` : `<div style="height:36px;"></div>`}
      </div>
    `;
  }

  function partySlotsMarkup(party) {
    const members = Array.isArray(party.members) ? party.members : [];
    const totalAttack = members.reduce((sum, member) => sum + num(member?.heroAttack, 0), 0);
    const totalDefense = members.reduce((sum, member) => sum + num(member?.heroDefense, 0), 0);
    const selectedMonster = selectedPartyMonsterFromParty(party);
    const selectedMonsterProgress = selectedMonster ? monsterProgressEntry(selectedMonster.id) : null;
    const slots = [];
    for (let index = 0; index < 4; index += 1) {
      const member = members[index] || null;
      if (member) {
        slots.push(partySlotCardMarkup(member, member.isLeader ? "Leader" : (member.ready ? "Ready" : "Not Ready")));
      } else {
        slots.push(partyEmptySlotMarkup(party));
      }
    }
    return `
      <section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.02);">
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
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:26px;padding:0 8px;border-radius:999px;background:rgba(179,72,92,.16);border:1px solid rgba(179,72,92,.24);color:#ffb7c1;font-size:11px;font-weight:900;">ATK</span>
                    <span style="font-weight:800;">${num(selectedMonster.attack, 0)}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:26px;padding:0 8px;border-radius:999px;background:rgba(79,121,194,.16);border:1px solid rgba(79,121,194,.24);color:#c3d8ff;font-size:11px;font-weight:900;">DEF</span>
                    <span style="font-weight:800;">${num(selectedMonster.defense, 0)}</span>
                  </div>
                </div>
              </div>
            `
            : `<div style="width:110px;height:110px;border-radius:18px;border:2px dashed rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:18px;opacity:.55;">Monster</div>`}
          <div style="font-weight:900;font-size:18px;line-height:1.1;">${esc(selectedMonster?.name || "No Monster Selected")}</div>
          ${isLeader() ? `<button id="partyChooseMonsterBtn" type="button">Choose Monster</button>` : ``}
        </div>
        <div style="margin-top:14px;padding:10px 14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03);text-align:center;font-weight:800;">
          Total Attack : ${num(totalAttack, 0)} , Total Defense : ${num(totalDefense, 0)}
        </div>
      </section>
    `;
  }

  function leaderPartyMarkup(party) {
    const canStart = !!party.canStartActivity;
    const active = party.state === "active";
    const isPrivate = String(party.visibility || "").toLowerCase() === "private";
    const hasSelectedMonster = !!String(party.selectedMonsterId || "").trim();
    return `
      <div style="display:grid;gap:14px;">
        ${partySlotsMarkup(party)}

        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-start;">
          <button id="partyStartActivityBtn" type="button" ${!canStart || active || !hasSelectedMonster ? "disabled" : ""}>Start Party Fight</button>
          <button id="partyDisbandBtn" type="button">Disband Party</button>
          <button id="partyLeaveBtn" type="button">Leave Party</button>
        </div>

        ${isPrivate ? `` : `
          <section style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
            <div style="font-size:15px;font-weight:800;margin-bottom:10px;">Open Party Status</div>
            <div style="opacity:.8;margin-bottom:10px;">Players can find your party from the Find Party tab and join this lobby.</div>
            <div style="display:grid;gap:10px;">${pendingJoinRequestsMarkup(party)}</div>
          </section>
        `}
        ${inviteModalMarkup()}
      </div>
    `;
  }

  function memberPartyMarkup(party) {
    const me = (party.members || []).find((entry) => entry.isSelf);
    return `
      <div style="display:grid;gap:14px;">
        ${partySlotsMarkup(party)}
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-start;">
          <button id="partyReadyBtn" type="button" ${party.state !== "forming" ? "disabled" : ""}>${me?.ready ? "Not Ready" : "Ready"}</button>
          <button id="partyLeaveBtn" type="button" ${party.state === "active" ? "disabled" : ""}>Leave Party</button>
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
          <button type="button" data-party-request="${esc(entry.id)}" ${myParty() ? "disabled" : ""}>Request Join</button>
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
              <img src="${esc(member.avatarUrl)}" alt="${esc(member.heroName)}" style="width:40px;height:40px;border-radius:10px;border:2px solid #333;object-fit:cover;">
              <div>${esc(member.heroName)} <span style="opacity:.72;">Lv ${num(member.heroLevel, 1)}</span></div>
              <div style="opacity:.72;">${member.role === "leader" ? "Leader" : member.ready ? "Ready" : "Not Ready"}</div>
            </div>
          `).join("")}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
          <button type="button" data-party-request="${esc(detail.id)}" ${myParty() ? "disabled" : ""}>Request Join</button>
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
    const monster = activePartyFightMonster(party);
    const encounter = activeEncounter(party);
    const latestRound = encounter;
    const partyDealt = Array.isArray(encounter?.players)
      ? encounter.players.reduce((sum, player) => sum + num(player?.damageDealt, 0), 0)
      : 0;
    return `
      <section style="display:grid;gap:14px;">
        <div style="padding:16px;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:rgba(255,255,255,.02);display:grid;gap:16px;">
          <div id="partyFightCooldownWrap" style="display:block;">
            <div style="display:flex;justify-content:space-between;font-size:12px;opacity:.9;">
              <span>Next action</span>
              <span id="partyFightCooldownText">${esc(formatEncounterCountdown(party))}</span>
            </div>
            <div style="height:5px;background:#222;border:1px solid #333;border-radius:6px;margin-top:6px;overflow:hidden;">
              <div id="partyFightCooldownBar" style="height:100%;width:${encounterProgressPct(party).toFixed(1)}%;border-radius:6px;background:linear-gradient(90deg,#b63a3a,#e05555);"></div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:minmax(0,1.3fr) 126px minmax(220px,.9fr);gap:18px;align-items:center;">
            <div style="display:grid;grid-template-columns:repeat(${groups.length}, minmax(0,1fr));gap:14px;align-items:start;">
              ${groups.map((group) => `
                <div style="display:grid;gap:12px;justify-items:center;">
                  ${group.map((member) => {
                    const latest = Array.isArray(encounter?.players) ? encounter.players.find((entry) => String(entry?.userId || "") === String(member?.userId || "")) : null;
                    const memberHpMax = Math.max(1, num(member?.heroHPMax, 100));
                    const memberHp = Math.max(0, num(member?.heroHP, memberHpMax));
                    const hpMax = Math.max(1, num(latest?.hpMax, memberHpMax));
                    const hpRemaining = Math.max(0, num(latest?.hpRemaining, memberHp));
                    const hpPct = Math.max(0, Math.min(100, (hpRemaining / hpMax) * 100));
                    return `
                      <div style="display:grid;justify-items:center;gap:8px;text-align:center;">
                        <img src="${esc(member.avatarUrl)}" alt="${esc(member.heroName)}" style="width:96px;height:96px;border-radius:18px;border:3px solid ${member.isLeader ? "#43c26b" : "rgba(255,255,255,.22)"};object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.32);">
                        <div style="width:82px;height:4px;background:#222;border:1px solid #333;border-radius:999px;overflow:hidden;">
                          <div style="height:100%;width:${hpPct.toFixed(1)}%;border-radius:999px;background:linear-gradient(90deg,#00ff88,#00bb55);"></div>
                        </div>
                        <div style="font-size:10px;opacity:.85;line-height:1;">${hpRemaining} / ${hpMax} HP</div>
                        <div style="font-weight:900;font-size:17px;line-height:1.1;">${esc(member.heroName)}</div>
                        ${latest ? `<div style="min-height:18px;margin-top:2px;padding:4px 8px;border-radius:999px;border:1px solid rgba(210, 80, 80, .35);background:rgba(60, 18, 18, .82);box-shadow:0 0 10px rgba(150, 30, 30, .16);font-size:10px;font-weight:700;line-height:1;text-align:center;color:#ffe1e1;">Damage Taken : ${num(latest.damageTaken, 0)}</div>` : ``}
                      </div>
                    `;
                  }).join("")}
                </div>
              `).join("")}
            </div>

            <div style="display:grid;justify-items:center;">
              <img src="images/ui/my_vs_icon.png" alt="VS" style="width:126px;height:126px;object-fit:contain;display:block;">
            </div>

            <div style="display:grid;justify-items:center;gap:10px;text-align:center;">
              ${monster
                ? `
                  <img src="${esc(monster.img)}" alt="${esc(monster.name)}" style="width:124px;height:124px;border-radius:20px;border:3px solid #c79b44;object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.32);">
                  <div style="font-size:22px;font-weight:900;line-height:1.1;">${esc(monster.name)}</div>
                  <div style="min-height:18px;margin-top:2px;padding:4px 8px;border-radius:999px;border:1px solid rgba(70, 190, 120, .35);background:rgba(20, 50, 30, .78);box-shadow:0 0 10px rgba(20, 120, 60, .14);font-size:10px;font-weight:700;line-height:1;text-align:center;color:#dff7e8;">
                    Party dealt : ${num(partyDealt, 0)} Dmg
                  </div>
                `
                : `<div style="width:124px;height:124px;border-radius:20px;border:2px dashed rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;opacity:.55;">Monster</div>`
              }
            </div>
          </div>

          <div style="display:grid;gap:10px;">
            <div style="padding:12px 14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03);display:grid;gap:8px;text-align:left;font-weight:800;">
              ${latestRound ? (() => {
                const entryPlayers = Array.isArray(latestRound?.players) ? latestRound.players : [];
                const entryXp = entryPlayers.length ? num(entryPlayers[0]?.xp, 0) : 0;
                const entryGold = entryPlayers.length ? num(entryPlayers[0]?.gold, 0) : 0;
                const combatRounds = Math.max(0, num(latestRound?.rounds, 0));
                const wonText = String(latestRound?.outcome || "").toLowerCase() === "victory" ? "Party Won" : "Party Finished";
                return `
                  <div style="font-size:13px;">
                    ${wonText} in ${combatRounds} rounds : Everyone Got ${entryXp} XP , ${entryGold} Gold
                  </div>
                `;
              })() : `<div style="font-size:13px;text-align:center;">No rounds yet.</div>`}
            </div>
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-start;">
          ${isLeader()
            ? `
              <button id="partyFightEndBtn" type="button">End Party Fight</button>
              <button id="partyDisbandBtn" type="button">Disband Party</button>
              <button id="partyLeaveBtn" type="button">Leave Party</button>
            `
            : `<button id="partyLeaveBtn" type="button" disabled>Leave Party</button>`
          }
        </div>
      </section>
    `;
  }

  function tabsMarkup() {
    const tabs = [
      ["my_party", myParty() ? "My Party" : "Create Party"],
      ["find_party", "Find Party"],
      ["invites", "Invites"]
    ];
    return `
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px;">
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
    if (party && party.state === "active" && String(party.activity || "").toLowerCase().includes("party fight")) {
      return partyFightMarkup();
    }
    if (party && isLeader() && state.monsterSelectionOpen) {
      return chooseMonsterPageMarkup(party);
    }
    if (state.tab === "my_party") {
      if (!party) return createPartyMarkup();
      return isLeader() ? leaderPartyMarkup(party) : memberPartyMarkup(party);
    }
    if (state.tab === "find_party") return findPartyMarkup();
    return invitesMarkup();
  }

  function bindActions() {
    document.getElementById("partyCreateName")?.addEventListener("input", syncCreateDraftFromDom);
    document.getElementById("partyCreateVisibility")?.addEventListener("change", syncCreateDraftFromDom);
    document.getElementById("partyCreateMinLevel")?.addEventListener("input", syncCreateDraftFromDom);
    document.getElementById("partyInviteName")?.addEventListener("input", syncInviteDraftFromDom);

    document.querySelectorAll("[data-party-tab]").forEach((btn) => btn.addEventListener("click", () => {
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
      const minLevel = Number(draft.minLevel || 1);
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
      }, "Invite sent.");
      state.inviteModalOpen = false;
      state.inviteDraft = "";
      const input = document.getElementById("partyInviteName");
      if (input) input.value = "";
    });

    document.getElementById("partyReadyBtn")?.addEventListener("click", async () => {
      await runAction({ action: "set_ready" }, "Ready state updated.");
    });

    document.getElementById("partyLeaveBtn")?.addEventListener("click", async () => {
      await runAction({ action: "leave_party" }, "Party updated.");
    });

    document.getElementById("partyDisbandBtn")?.addEventListener("click", async () => {
      const party = myParty();
      if (!party) return;
      await runAction({ action: "disband_party", partyId: party.id }, "Party disbanded.");
    });

    document.getElementById("partyStartActivityBtn")?.addEventListener("click", async () => {
      const party = myParty();
      if (!party) return;
      state.tab = "my_party";
      await runAction({ action: "start_activity", partyId: party.id, activity: "Party Fight" }, "");
    });

    document.getElementById("partyFightEndBtn")?.addEventListener("click", async () => {
      const party = myParty();
      if (!party) return;
      await runAction({ action: "end_activity", partyId: party.id, result: "completed", nextActivity: "Party Fight" }, "Party Fight ended.");
    });

    document.getElementById("partyFightReadyBtn")?.addEventListener("click", async () => {
      await runAction({ action: "set_ready" }, "Ready state updated.");
    });

    document.getElementById("partyFightBackBtn")?.addEventListener("click", () => {
      state.selectedPartyFightMonsterId = null;
      renderPartyHall();
    });

    document.getElementById("partyFightMonsterStartBtn")?.addEventListener("click", async () => {
      const party = myParty();
      const monster = selectedPartyFightMonster();
      if (!party || !monster) return;
      await runAction({
        action: "start_activity",
        partyId: party.id,
        activity: `Party Fight - ${monster.name}`
      }, `${monster.name} fight started.`);
    });

    document.querySelectorAll("[data-party-fight-monster]").forEach((btn) => btn.addEventListener("click", () => {
      state.selectedPartyFightMonsterId = btn.dataset.partyFightMonster || null;
      renderPartyHall();
    }));

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
      await runAction({ action: "request_join", partyId }, "Join request sent.");
    }));

    document.querySelectorAll("[data-party-accept-invite]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "respond_invite", inviteId: btn.dataset.partyAcceptInvite || "", response: "accept" }, "Invite accepted.");
    }));

    document.querySelectorAll("[data-party-decline-invite]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "respond_invite", inviteId: btn.dataset.partyDeclineInvite || "", response: "decline" }, "Invite declined.");
    }));

    document.querySelectorAll("[data-party-approve-request]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "respond_join_request", requestId: btn.dataset.partyApproveRequest || "", response: "approve" }, "Join request approved.");
    }));

    document.querySelectorAll("[data-party-reject-request]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "respond_join_request", requestId: btn.dataset.partyRejectRequest || "", response: "reject" }, "Join request rejected.");
    }));

    document.querySelectorAll("[data-party-cancel-request]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "cancel_join_request", requestId: btn.dataset.partyCancelRequest || "" }, "Join request cancelled.");
    }));
  }

  function renderInvitePopups() {
    const host = ensurePopupHost();
    const items = invites();
    host.innerHTML = items.map((invite) => `
      <div style="width:min(360px, calc(100vw - 32px));padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg, rgba(20,23,36,.98), rgba(12,14,24,.98));box-shadow:0 18px 42px rgba(0,0,0,.34);pointer-events:auto;">
        <div style="font-size:15px;font-weight:900;margin-bottom:10px;color:#ead39b;">Party Invite</div>
        <div style="display:grid;gap:6px;font-size:14px;">
          <div>${esc(invite.fromHeroName)} invited you to join:</div>
          <div style="font-size:18px;font-weight:900;color:#ead39b;margin-top:4px;">${esc(invite.partyName)}</div>
          <div>Members: ${num(invite.memberCount, 0)} / ${num(invite.maxMembers, 4)}</div>
          <div>Activity: ${esc(invite.activity)}</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
          <button type="button" data-popup-accept="${esc(invite.id)}">Accept</button>
          <button type="button" data-popup-decline="${esc(invite.id)}">Decline</button>
        </div>
      </div>
    `).join("");
    host.querySelectorAll("[data-popup-accept]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "respond_invite", inviteId: btn.dataset.popupAccept || "", response: "accept" }, "Invite accepted.");
    }));
    host.querySelectorAll("[data-popup-decline]").forEach((btn) => btn.addEventListener("click", async () => {
      await runAction({ action: "respond_invite", inviteId: btn.dataset.popupDecline || "", response: "decline" }, "Invite declined.");
    }));
  }

  function renderPartyHall() {
    const shell = document.getElementById("partyHallCard");
    if (!shell) return;
    preservePartyInputsFromDom();
    shell.innerHTML = `
      ${tabsMarkup()}
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
    if (state.pollTimer) return;
    state.pollTimer = window.setInterval(() => {
      if (document.hidden) return;
      loadPartyState({ silent: true });
    }, POLL_MS);
  }

  function startUiTimer() {
    if (state.uiTimer) return;
    state.uiTimer = window.setInterval(() => {
      if (document.hidden) return;
      updatePartyFightTimerUI();
    }, 100);
  }

  async function initRealtime() {
    if (!window.DSAuth?.invokePartyAction) return;
    if (state.initialized) {
      startPolling();
      startUiTimer();
      await loadPartyState({ silent: true });
      return;
    }
    state.initialized = true;
    startPolling();
    startUiTimer();
    await loadPartyState({ silent: true });
  }

  window.DSPartyHall = { mount: mountPartyHall, initRealtime };
  window.addEventListener("DOMContentLoaded", () => {
    initStandalonePartyHall();
    initRealtime();
  });
  window.addEventListener("ds:auth", () => {
    initRealtime();
  });
  window.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadPartyState({ silent: true });
  });
})();
