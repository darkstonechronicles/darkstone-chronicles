(() => {
  const POLL_MS = 15000;
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
    monsterModalOpen: false,
    data: null,
    loading: false,
    actionBusy: false,
    initialized: false,
    pollTimer: 0,
    lastMessage: "",
    lastError: "",
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

  function openParties() {
    return Array.isArray(state.data?.openParties) ? state.data.openParties : [];
  }

  function invites() {
    return Array.isArray(state.data?.invites) ? state.data.invites : [];
  }

  function myJoinRequests() {
    return Array.isArray(state.data?.myJoinRequests) ? state.data.myJoinRequests : [];
  }

  function selectedPartyFightMonster() {
    return PARTY_FIGHT_MONSTERS.find((entry) => entry.id === state.selectedPartyFightMonsterId) || null;
  }

  function selectedPartyMonsterFromParty(party) {
    return PARTY_FIGHT_MONSTERS.find((entry) => entry.id === String(party?.selectedMonsterId || "").trim()) || null;
  }

  async function loadPartyState({ silent = false } = {}) {
    if (!window.DSAuth?.invokePartyAction) return null;
    if (state.loading && silent) return state.data;
    state.loading = true;
    try {
      const data = await window.DSAuth.invokePartyAction({ action: "bootstrap" });
      state.data = data || null;
      if (!silent && !state.lastError) setNotice(state.lastMessage || "");
      renderInvitePopups();
      if (hasPartyPage()) renderPartyHall();
      return data;
    } catch (error) {
      if (!silent) {
        state.lastError = error?.message || "Failed to load Party Hall.";
      }
      if (hasPartyPage()) renderPartyHall();
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
    const me = profile();
    return `
      <section style="display:grid;gap:14px;">
        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
            <label style="display:grid;gap:6px;">
              <span style="font-weight:800;">Party Name</span>
              <input id="partyCreateName" type="text" value="${esc(`${me.heroName}'s Party`)}" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
            </label>
            <label style="display:grid;gap:6px;">
              <span style="font-weight:800;">Party Type</span>
              <select id="partyCreateVisibility" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
                <option value="private">Private</option>
                <option value="open">Open</option>
              </select>
            </label>
            <label style="display:grid;gap:6px;">
              <span style="font-weight:800;">Minimum Level</span>
              <input id="partyCreateMinLevel" type="number" min="1" value="${num(me.heroLevel, 1)}" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
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
            <input id="partyInviteName" type="text" placeholder="Hero Name" style="width:100%;padding:10px 12px;border-radius:10px;border:2px solid #333;background:#101019;color:#fff;">
          </label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
            <button id="partySendInviteBtn" type="button">Send Invite</button>
            <button id="partyCloseInviteModalBtn" type="button">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  function chooseMonsterModalMarkup() {
    if (!state.monsterModalOpen) return "";
    return `
      <div id="partyMonsterModalBackdrop" style="position:fixed;inset:0;z-index:980;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:18px;">
        <div style="width:min(940px, 100%);padding:18px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg, rgba(24,27,40,.98), rgba(14,16,27,.98));box-shadow:0 24px 60px rgba(0,0,0,.42);">
          <div style="font-size:20px;font-weight:900;margin-bottom:12px;">Choose Monster</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            ${PARTY_FIGHT_MONSTERS.map((monster) => `
              <button
                type="button"
                data-party-choose-monster="${esc(monster.id)}"
                style="text-align:left;padding:0;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(255,255,255,.03);overflow:hidden;cursor:pointer;"
              >
                <img src="${esc(monster.img)}" alt="${esc(monster.name)}" style="display:block;width:100%;aspect-ratio:1 / 1;object-fit:cover;background:#0f121a;">
                <div style="padding:12px;">
                  <div style="font-size:15px;font-weight:900;color:#f3ead6;">${esc(monster.name)}</div>
                  <div style="opacity:.78;font-size:12px;margin-top:4px;">${esc(monster.role)}</div>
                </div>
              </button>
            `).join("")}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
            <button id="partyCloseMonsterModalBtn" type="button">Cancel</button>
          </div>
        </div>
      </div>
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
              <div style="display:grid;grid-template-columns:110px auto;gap:16px;align-items:center;">
                <img src="${esc(selectedMonster.img)}" alt="${esc(selectedMonster.name)}" style="width:110px;height:110px;border-radius:18px;border:3px solid #c79b44;object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.28);">
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
        ${chooseMonsterModalMarkup()}
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

    const memberCount = num(party.memberCount, 0);
    const minReady = memberCount >= 2;
    const isActive = party.state === "active";
    const activeSession = party.activeSession || null;
    const selectedMonster = selectedPartyFightMonster();

    if (selectedMonster) {
      return `
        <section style="display:grid;gap:14px;">
          <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);display:grid;grid-template-columns:minmax(220px,280px) 1fr;gap:16px;align-items:start;">
            <img src="${esc(selectedMonster.img)}" alt="${esc(selectedMonster.name)}" style="width:100%;max-width:280px;aspect-ratio:1 / 1;object-fit:cover;border-radius:16px;border:2px solid rgba(255,255,255,.12);background:#0f121a;">
            <div style="display:grid;gap:10px;">
              <div>
                <div style="font-size:22px;font-weight:900;color:#f3ead6;">${esc(selectedMonster.name)}</div>
                <div style="opacity:.78;font-size:13px;">${esc(selectedMonster.role)} - ${esc(selectedMonster.levelText)}</div>
              </div>
              <div style="opacity:.9;line-height:1.45;">${esc(selectedMonster.description)}</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 16px;padding-top:4px;">
                <div><strong>Party:</strong> ${esc(party.name)}</div>
                <div><strong>Members:</strong> ${memberCount} / ${num(party.maxMembers, 4)}</div>
                <div><strong>State:</strong> ${esc(party.state)}</div>
                <div><strong>Leader:</strong> ${esc(party.leaderName)}</div>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:6px;">
                <button id="partyFightBackBtn" type="button">Back To Monsters</button>
                ${isLeader() ? `<button id="partyFightMonsterStartBtn" type="button" ${!party.canStartActivity || isActive ? "disabled" : ""}>Start Fight</button>` : ``}
                <button id="partyFightReadyBtn" type="button" ${party.state !== "forming" ? "disabled" : ""}>${(party.members || []).find((entry) => entry.isSelf)?.ready ? "Set Not Ready" : "Set Ready"}</button>
                ${isLeader() ? `<button id="partyFightEndBtn" type="button" ${!isActive ? "disabled" : ""}>End Party Fight</button>` : ``}
              </div>
              <div style="opacity:.74;font-size:12px;">
                ${minReady
                  ? "Only the leader can start the fight, and all non-leader members must be ready."
                  : "At least 2 party members are required before this fight can begin."}
              </div>
            </div>
          </div>

          <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
            <div style="font-size:15px;font-weight:800;margin-bottom:10px;">Fight Roster</div>
            <div style="display:grid;gap:10px;">${memberRowsMarkup(party, false)}</div>
          </div>

          <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
            <div style="font-size:15px;font-weight:800;margin-bottom:10px;">Current Session</div>
            ${activeSession ? `
              <div style="display:grid;gap:6px;">
                <div><strong>Session:</strong> Active</div>
                <div><strong>Activity:</strong> ${esc(activeSession.activity || "Party Fight")}</div>
                <div><strong>Started By:</strong> ${esc(activeSession.startedByHeroName || party.leaderName)}</div>
                <div><strong>Started At:</strong> ${esc(activeSession.startedAt || "")}</div>
              </div>
            ` : `<div style="opacity:.82;">No Party Fight session is running right now.</div>`}
          </div>
        </section>
      `;
    }

    return `
      <section style="display:grid;gap:14px;">
        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="font-size:16px;font-weight:800;margin-bottom:10px;">Party Fight</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 16px;">
            <div><strong>Party:</strong> ${esc(party.name)}</div>
            <div><strong>Members:</strong> ${memberCount} / ${num(party.maxMembers, 4)}</div>
            <div><strong>State:</strong> ${esc(party.state)}</div>
            <div><strong>Activity:</strong> ${esc(party.activity)}</div>
          </div>
        </div>

        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="font-size:15px;font-weight:800;margin-bottom:10px;">Choose Monster</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            ${PARTY_FIGHT_MONSTERS.map((monster) => `
              <button
                type="button"
                data-party-fight-monster="${esc(monster.id)}"
                style="text-align:left;padding:0;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(255,255,255,.03);overflow:hidden;cursor:pointer;"
              >
                <img src="${esc(monster.img)}" alt="${esc(monster.name)}" style="display:block;width:100%;aspect-ratio:1 / 1;object-fit:cover;background:#0f121a;">
                <div style="padding:12px;">
                  <div style="font-size:15px;font-weight:900;color:#f3ead6;">${esc(monster.name)}</div>
                  <div style="opacity:.78;font-size:12px;margin-top:4px;">${esc(monster.role)}</div>
                  <div style="opacity:.74;font-size:12px;margin-top:6px;">${esc(monster.levelText)}</div>
                </div>
              </button>
            `).join("")}
          </div>
        </div>

        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="font-size:15px;font-weight:800;margin-bottom:10px;">Session Status</div>
          ${activeSession ? `
            <div style="display:grid;gap:6px;">
              <div><strong>Session:</strong> Active</div>
              <div><strong>Activity:</strong> ${esc(activeSession.activity || "Party Fight")}</div>
              <div><strong>Started By:</strong> ${esc(activeSession.startedByHeroName || party.leaderName)}</div>
              <div><strong>Started At:</strong> ${esc(activeSession.startedAt || "")}</div>
            </div>
            ${isLeader() ? `<div style="margin-top:12px;"><button id="partyFightEndBtn" type="button">End Party Fight</button></div>` : ``}
          ` : `
            <div style="opacity:.82;">Pick one of the monsters above to open its fight panel.</div>
          `}
        </div>

        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);">
          <div style="font-size:15px;font-weight:800;margin-bottom:10px;">Party Fight Controls</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button id="partyFightReadyBtn" type="button" ${party.state !== "forming" ? "disabled" : ""}>${(party.members || []).find((entry) => entry.isSelf)?.ready ? "Set Not Ready" : "Set Ready"}</button>
          </div>
          <div style="margin-top:8px;opacity:.74;font-size:12px;">
            ${minReady
              ? "All non-leader members must be ready before the leader can start Party Fight."
              : "At least 2 party members are required before Party Fight can begin."}
          </div>
        </div>

        <div style="padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.02);opacity:.88;">
          <div style="font-size:15px;font-weight:800;margin-bottom:10px;">Next Step</div>
          <div>To Party Fight will steksei pano se xwristo mode mesa sto Party Hall, oxi pano sto existing Fight i Dungeons pages.</div>
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
    if (state.tab === "my_party") {
      if (!party) return createPartyMarkup();
      return isLeader() ? leaderPartyMarkup(party) : memberPartyMarkup(party);
    }
    if (state.tab === "find_party") return findPartyMarkup();
    return invitesMarkup();
  }

  function bindActions() {
    document.querySelectorAll("[data-party-tab]").forEach((btn) => btn.addEventListener("click", () => {
      state.tab = btn.dataset.partyTab || "my_party";
      state.selectedPartyId = null;
      renderPartyHall();
    }));

    document.getElementById("partyCreateBtn")?.addEventListener("click", async () => {
      const name = document.getElementById("partyCreateName")?.value || "";
      const visibility = document.getElementById("partyCreateVisibility")?.value || "private";
      const maxMembers = 4;
      const minLevel = Number(document.getElementById("partyCreateMinLevel")?.value || 1);
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
      state.monsterModalOpen = true;
      renderPartyHall();
    });

    document.getElementById("partyCloseMonsterModalBtn")?.addEventListener("click", () => {
      state.monsterModalOpen = false;
      renderPartyHall();
    });

    document.getElementById("partyMonsterModalBackdrop")?.addEventListener("click", (event) => {
      if (event.target?.id !== "partyMonsterModalBackdrop") return;
      state.monsterModalOpen = false;
      renderPartyHall();
    });

    document.querySelectorAll("[data-party-choose-monster]").forEach((btn) => btn.addEventListener("click", async () => {
      const party = myParty();
      const selectedMonsterId = btn.dataset.partyChooseMonster || "";
      if (!party || !selectedMonsterId) return;
      await runAction({ action: "choose_monster", partyId: party.id, selectedMonsterId }, "");
      state.monsterModalOpen = false;
      renderPartyHall();
    }));

    document.getElementById("partyCloseInviteModalBtn")?.addEventListener("click", () => {
      state.inviteModalOpen = false;
      renderPartyHall();
    });

    document.getElementById("partyInviteModalBackdrop")?.addEventListener("click", (event) => {
      if (event.target?.id !== "partyInviteModalBackdrop") return;
      state.inviteModalOpen = false;
      renderPartyHall();
    });

    document.getElementById("partySendInviteBtn")?.addEventListener("click", async () => {
      const party = myParty();
      if (!party) return;
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
    shell.innerHTML = `
      ${tabsMarkup()}
      ${bodyMarkup()}
    `;
    bindActions();
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

  async function initRealtime() {
    if (!window.DSAuth?.invokePartyAction) return;
    if (state.initialized) {
      startPolling();
      await loadPartyState({ silent: true });
      return;
    }
    state.initialized = true;
    startPolling();
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
