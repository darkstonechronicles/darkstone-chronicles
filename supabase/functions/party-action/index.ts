import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

type PartyRow = {
  id: string;
  leader_user_id: string;
  name: string;
  visibility: string;
  state: string;
  activity: string;
  selected_monster_id: string;
  min_level: number;
  max_members: number;
  auto_accept_requests: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
  disbanded_at: string | null;
};

type MemberRow = {
  party_id: string;
  user_id: string;
  role: string;
  ready: boolean;
  joined_at: string;
  updated_at: string;
};

type InviteRow = {
  id: string;
  party_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  metadata: JsonRecord | null;
};

type JoinRequestRow = {
  id: string;
  party_id: string;
  user_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  message: string;
};

type ActivitySessionRow = {
  id: string;
  party_id: string;
  activity: string;
  status: string;
  started_by_user_id: string;
  member_snapshot: unknown;
  result_payload: unknown;
  created_at: string;
  started_at: string;
  ended_at: string | null;
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

function str(value: unknown, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function int(value: unknown, fallback = 0) {
  return Math.trunc(num(value, fallback));
}

function bigintLike(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : fallback;
}

function readCombatStat(saveData: unknown, keys: string[]) {
  const save = saveData && typeof saveData === "object" ? saveData as Record<string, unknown> : {};
  for (const key of keys) {
    if (!(key in save)) continue;
    return bigintLike(save[key], 0);
  }
  return 0;
}

function normalizeVisibility(value: unknown) {
  return str(value, "private").toLowerCase() === "open" ? "open" : "private";
}

function normalizeActivity(value: unknown) {
  const next = str(value, "Idle");
  return next.slice(0, 60) || "Idle";
}

function normalizeMonsterId(value: unknown) {
  return str(value).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
}

function normalizePartyName(value: unknown, fallback: string) {
  const next = str(value, fallback).slice(0, 40);
  if (next.length < 3) throw new Error("Party name must be at least 3 characters.");
  return next;
}

function formatIsoNow() {
  return new Date().toISOString();
}

async function logPartyEvent(admin: ReturnType<typeof createClient>, partyId: string | null, actorUserId: string | null, eventKind: string, payload: JsonRecord = {}) {
  try {
    await admin.from("party_events").insert({
      party_id: partyId,
      actor_user_id: actorUserId,
      event_kind: eventKind,
      payload,
    });
  } catch (error) {
    console.error("[party-action] event log failed", eventKind, error);
  }
}

async function cleanupExpiredRows(admin: ReturnType<typeof createClient>) {
  const now = formatIsoNow();
  await admin
    .from("party_invites")
    .update({ status: "expired", responded_at: now })
    .eq("status", "pending")
    .lte("expires_at", now);
  await admin
    .from("party_join_requests")
    .update({ status: "expired", responded_at: now })
    .eq("status", "pending")
    .lte("expires_at", now);
}

async function getCurrentPartyId(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("party_members")
    .select("party_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return str(data?.party_id);
}

async function getPartyRow(admin: ReturnType<typeof createClient>, partyId: string) {
  const { data, error } = await admin
    .from("parties")
    .select("id, leader_user_id, name, visibility, state, activity, selected_monster_id, min_level, max_members, auto_accept_requests, locked, created_at, updated_at, disbanded_at")
    .eq("id", partyId)
    .maybeSingle();
  if (error) throw error;
  return (data as PartyRow | null) || null;
}

async function getPartyMembers(admin: ReturnType<typeof createClient>, partyId: string) {
  const { data, error } = await admin
    .from("party_members")
    .select("party_id, user_id, role, ready, joined_at, updated_at")
    .eq("party_id", partyId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as MemberRow[];
}

async function getUserSummaries(admin: ReturnType<typeof createClient>, userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map<string, JsonRecord>();

  const [profilesRes, statsRes, savesRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, avatar_url, last_seen_at, last_seen_page")
      .in("id", ids),
    admin
      .from("player_public_stats")
      .select("user_id, hero_name, hero_level")
      .in("user_id", ids),
    admin
      .from("player_saves")
      .select("user_id, save_data")
      .in("user_id", ids),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (statsRes.error) throw statsRes.error;
  if (savesRes.error) throw savesRes.error;

  const statsMap = new Map<string, JsonRecord>();
  for (const row of (statsRes.data || []) as JsonRecord[]) {
    statsMap.set(str(row.user_id), row);
  }

  const savesMap = new Map<string, JsonRecord>();
  for (const row of (savesRes.data || []) as JsonRecord[]) {
    savesMap.set(str(row.user_id), row);
  }

  const summaryMap = new Map<string, JsonRecord>();
  for (const row of (profilesRes.data || []) as JsonRecord[]) {
    const userId = str(row.id);
    const stats = statsMap.get(userId) || {};
    const save = savesMap.get(userId) || {};
    const saveData = save.save_data;
    summaryMap.set(userId, {
      id: userId,
      heroName: str((stats as JsonRecord).hero_name || row.display_name, "Hero"),
      heroLevel: Math.max(1, int((stats as JsonRecord).hero_level, 1)),
      avatarUrl: str(row.avatar_url, "images/hero.png") || "images/hero.png",
      heroAttack: readCombatStat(saveData, ["attackTotal", "heroAtk", "heroAttack"]),
      heroDefense: readCombatStat(saveData, ["defenseTotal", "heroDef", "heroDefense"]),
      lastSeenAt: row.last_seen_at || null,
      lastSeenPage: str(row.last_seen_page),
    });
  }

  for (const id of ids) {
    if (!summaryMap.has(id)) {
      summaryMap.set(id, {
        id,
        heroName: "Hero",
        heroLevel: 1,
        avatarUrl: "images/hero.png",
        heroAttack: 0,
        heroDefense: 0,
        lastSeenAt: null,
        lastSeenPage: "",
      });
    }
  }

  return summaryMap;
}

async function getPendingInvitesForParty(admin: ReturnType<typeof createClient>, partyId: string) {
  const now = formatIsoNow();
  const { data, error } = await admin
    .from("party_invites")
    .select("id, party_id, from_user_id, to_user_id, status, created_at, expires_at, responded_at, metadata")
    .eq("party_id", partyId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as InviteRow[];
}

async function getPendingJoinRequestsForParty(admin: ReturnType<typeof createClient>, partyId: string) {
  const now = formatIsoNow();
  const { data, error } = await admin
    .from("party_join_requests")
    .select("id, party_id, user_id, status, created_at, expires_at, responded_at, message")
    .eq("party_id", partyId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as JoinRequestRow[];
}

async function getActiveSessionForParty(admin: ReturnType<typeof createClient>, partyId: string) {
  const { data, error } = await admin
    .from("party_activity_sessions")
    .select("id, party_id, activity, status, started_by_user_id, member_snapshot, result_payload, created_at, started_at, ended_at")
    .eq("party_id", partyId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ActivitySessionRow | null) || null;
}

async function buildPartySnapshot(admin: ReturnType<typeof createClient>, partyId: string, viewerUserId: string) {
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) return null;

  const members = await getPartyMembers(admin, party.id);
  const memberIds = members.map((entry) => entry.user_id);
  const summaries = await getUserSummaries(admin, [party.leader_user_id, ...memberIds]);
  const leaderSummary = summaries.get(party.leader_user_id) || {};
  const memberList = members.map((entry) => {
    const summary = summaries.get(entry.user_id) || {};
    return {
      userId: entry.user_id,
      heroName: str(summary.heroName, "Hero"),
      heroLevel: Math.max(1, int(summary.heroLevel, 1)),
      avatarUrl: str(summary.avatarUrl, "images/hero.png"),
      heroAttack: Math.max(0, int(summary.heroAttack, 0)),
      heroDefense: Math.max(0, int(summary.heroDefense, 0)),
      role: entry.role === "leader" ? "leader" : "member",
      ready: !!entry.ready,
      joinedAt: entry.joined_at,
      isLeader: entry.role === "leader",
      isSelf: entry.user_id === viewerUserId,
    };
  });
  const memberCount = memberList.length;
  const role = memberList.find((entry) => entry.userId === viewerUserId)?.role || "none";
  const nonLeaderMembers = memberList.filter((entry) => !entry.isLeader);
  const canStartActivity = party.state === "forming" && memberCount >= 2 && memberCount <= party.max_members && nonLeaderMembers.every((entry) => entry.ready);

  const snapshot: JsonRecord = {
    id: party.id,
    name: party.name,
    visibility: party.visibility,
    state: party.state,
    activity: party.activity,
    selectedMonsterId: str(party.selected_monster_id),
    minLevel: party.min_level,
    maxMembers: party.max_members,
    autoAcceptRequests: !!party.auto_accept_requests,
    locked: !!party.locked,
    createdAt: party.created_at,
    updatedAt: party.updated_at,
    leaderUserId: party.leader_user_id,
    leaderName: str(leaderSummary.heroName, "Hero"),
    role,
    memberCount,
    canStartActivity,
    members: memberList,
    pendingInvites: [],
    pendingJoinRequests: [],
    activeSession: null,
  };

  const activeSession = await getActiveSessionForParty(admin, party.id);
  if (activeSession) {
    const relatedSummaries = await getUserSummaries(admin, [activeSession.started_by_user_id]);
    const startedBy = relatedSummaries.get(activeSession.started_by_user_id) || {};
    snapshot.activeSession = {
      id: activeSession.id,
      activity: activeSession.activity,
      status: activeSession.status,
      startedByUserId: activeSession.started_by_user_id,
      startedByHeroName: str(startedBy.heroName, "Hero"),
      startedAt: activeSession.started_at,
      endedAt: activeSession.ended_at,
    };
  }

  if (role === "leader") {
    const [pendingInvites, pendingJoinRequests] = await Promise.all([
      getPendingInvitesForParty(admin, party.id),
      getPendingJoinRequestsForParty(admin, party.id),
    ]);
    const relatedSummaries = await getUserSummaries(admin, [
      ...pendingInvites.map((entry) => entry.to_user_id),
      ...pendingJoinRequests.map((entry) => entry.user_id),
    ]);
    snapshot.pendingInvites = pendingInvites.map((entry) => {
      const summary = relatedSummaries.get(entry.to_user_id) || {};
      return {
        id: entry.id,
        userId: entry.to_user_id,
        heroName: str(summary.heroName, "Hero"),
        heroLevel: Math.max(1, int(summary.heroLevel, 1)),
        avatarUrl: str(summary.avatarUrl, "images/hero.png"),
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
      };
    });
    snapshot.pendingJoinRequests = pendingJoinRequests.map((entry) => {
      const summary = relatedSummaries.get(entry.user_id) || {};
      return {
        id: entry.id,
        userId: entry.user_id,
        heroName: str(summary.heroName, "Hero"),
        heroLevel: Math.max(1, int(summary.heroLevel, 1)),
        avatarUrl: str(summary.avatarUrl, "images/hero.png"),
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
        message: str(entry.message),
      };
    });
  }

  return snapshot;
}

async function getBootstrapState(admin: ReturnType<typeof createClient>, userId: string) {
  await cleanupExpiredRows(admin);

  const profileMap = await getUserSummaries(admin, [userId]);
  const profile = profileMap.get(userId) || {
    id: userId,
    heroName: "Hero",
    heroLevel: 1,
    avatarUrl: "images/hero.png",
    lastSeenAt: null,
    lastSeenPage: "",
  };

  const myPartyId = await getCurrentPartyId(admin, userId);
  const myParty = myPartyId ? await buildPartySnapshot(admin, myPartyId, userId) : null;

  const now = formatIsoNow();
  const [invitesRes, myRequestsRes, openPartiesRes] = await Promise.all([
    admin
      .from("party_invites")
      .select("id, party_id, from_user_id, to_user_id, status, created_at, expires_at, responded_at, metadata")
      .eq("to_user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
    admin
      .from("party_join_requests")
      .select("id, party_id, user_id, status, created_at, expires_at, responded_at, message")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
    admin
      .from("parties")
      .select("id, leader_user_id, name, visibility, state, activity, selected_monster_id, min_level, max_members, auto_accept_requests, locked, created_at, updated_at, disbanded_at")
      .eq("visibility", "open")
      .eq("state", "forming")
      .is("disbanded_at", null)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  if (invitesRes.error) throw invitesRes.error;
  if (myRequestsRes.error) throw myRequestsRes.error;
  if (openPartiesRes.error) throw openPartiesRes.error;

  const invites = (Array.isArray(invitesRes.data) ? invitesRes.data : []) as InviteRow[];
  const myJoinRequests = (Array.isArray(myRequestsRes.data) ? myRequestsRes.data : []) as JoinRequestRow[];
  const openParties = (Array.isArray(openPartiesRes.data) ? openPartiesRes.data : []) as PartyRow[];

  const relatedPartyIds = Array.from(new Set([
    ...invites.map((entry) => entry.party_id),
    ...myJoinRequests.map((entry) => entry.party_id),
    ...openParties.map((entry) => entry.id),
  ]));
  const relatedMembersRes = relatedPartyIds.length
    ? await admin
        .from("party_members")
        .select("party_id, user_id, role, ready, joined_at, updated_at")
        .in("party_id", relatedPartyIds)
        .order("joined_at", { ascending: true })
    : { data: [], error: null };
  if (relatedMembersRes.error) throw relatedMembersRes.error;
  const relatedMembers = (Array.isArray(relatedMembersRes.data) ? relatedMembersRes.data : []) as MemberRow[];

  const summaryIds = Array.from(new Set([
    ...openParties.map((entry) => entry.leader_user_id),
    ...invites.map((entry) => entry.from_user_id),
    ...relatedMembers.map((entry) => entry.user_id),
  ]));
  const summaries = await getUserSummaries(admin, summaryIds);
  const partyById = new Map<string, PartyRow>(openParties.map((entry) => [entry.id, entry]));
  for (const partyId of relatedPartyIds) {
    if (partyById.has(partyId)) continue;
    const row = await getPartyRow(admin, partyId);
    if (row && !row.disbanded_at) partyById.set(partyId, row);
  }
  const membersByParty = new Map<string, MemberRow[]>();
  for (const entry of relatedMembers) {
    const list = membersByParty.get(entry.party_id) || [];
    list.push(entry);
    membersByParty.set(entry.party_id, list);
  }

  const inviteCards = invites
    .map((entry) => {
      const party = partyById.get(entry.party_id);
      if (!party || party.disbanded_at) return null;
      const from = summaries.get(entry.from_user_id) || {};
      const partyMembers = membersByParty.get(entry.party_id) || [];
      return {
        id: entry.id,
        partyId: entry.party_id,
        fromUserId: entry.from_user_id,
        fromHeroName: str(from.heroName, "Hero"),
        partyName: party.name,
        activity: party.activity,
        memberCount: partyMembers.length,
        maxMembers: party.max_members,
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
      };
    })
    .filter(Boolean);

  const requestCards = myJoinRequests
    .map((entry) => {
      const party = partyById.get(entry.party_id);
      if (!party || party.disbanded_at) return null;
      const leader = summaries.get(party.leader_user_id) || {};
      const partyMembers = membersByParty.get(entry.party_id) || [];
      return {
        id: entry.id,
        partyId: entry.party_id,
        partyName: party.name,
        leaderName: str(leader.heroName, "Hero"),
        activity: party.activity,
        memberCount: partyMembers.length,
        maxMembers: party.max_members,
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
      };
    })
    .filter(Boolean);

  const openCards = openParties
    .map((entry) => {
      const partyMembers = membersByParty.get(entry.id) || [];
      if (partyMembers.length >= entry.max_members) return null;
      const leader = summaries.get(entry.leader_user_id) || {};
      return {
        id: entry.id,
        name: entry.name,
        activity: entry.activity,
        visibility: entry.visibility,
        minLevel: entry.min_level,
        maxMembers: entry.max_members,
        memberCount: partyMembers.length,
        autoAcceptRequests: !!entry.auto_accept_requests,
        leaderUserId: entry.leader_user_id,
        leaderName: str(leader.heroName, "Hero"),
        members: partyMembers.map((member) => {
          const summary = summaries.get(member.user_id) || {};
          return {
            userId: member.user_id,
            heroName: str(summary.heroName, "Hero"),
            heroLevel: Math.max(1, int(summary.heroLevel, 1)),
            avatarUrl: str(summary.avatarUrl, "images/hero.png"),
            heroAttack: Math.max(0, int(summary.heroAttack, 0)),
            heroDefense: Math.max(0, int(summary.heroDefense, 0)),
            role: member.role === "leader" ? "leader" : "member",
            ready: !!member.ready,
          };
        }),
      };
    })
    .filter(Boolean);

  return {
    ok: true,
    profile,
    myParty,
    invites: inviteCards,
    myJoinRequests: requestCards,
    openParties: openCards,
  };
}

async function resolveHeroTarget(admin: ReturnType<typeof createClient>, heroName: string) {
  const normalized = str(heroName).toLowerCase();
  if (!normalized) throw new Error("Hero name is required.");
  const { data, error } = await admin
    .from("hero_names")
    .select("user_id, hero_name")
    .eq("normalized_name", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data?.user_id) throw new Error(`Hero '${heroName}' not found.`);
  return {
    userId: str(data.user_id),
    heroName: str(data.hero_name, heroName),
  };
}

async function getUserHeroLevel(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("player_public_stats")
    .select("hero_level")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Math.max(1, int(data?.hero_level, 1));
}

async function createParty(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  if (await getCurrentPartyId(admin, userId)) {
    throw new Error("You are already in a party.");
  }

  const summary = (await getUserSummaries(admin, [userId])).get(userId) || {};
  const name = normalizePartyName(payload.name, `${str(summary.heroName, "Hero")}'s Party`);
  const visibility = normalizeVisibility(payload.visibility);
  const activity = normalizeActivity(payload.activity);
  const heroLevel = Math.max(1, int(summary.heroLevel, 1));
  const minLevel = Math.max(1, int(payload.minLevel, heroLevel));
  const maxMembers = Math.min(4, Math.max(2, int(payload.maxMembers, 4)));
  const autoAcceptRequests = payload.autoAcceptRequests === true;

  const { data, error } = await admin
    .from("parties")
    .insert({
      leader_user_id: userId,
        name,
        visibility,
        state: "forming",
        activity,
        selected_monster_id: "",
        min_level: minLevel,
      max_members: maxMembers,
      auto_accept_requests: autoAcceptRequests,
      locked: false,
    })
    .select("id")
    .single();
  if (error) throw error;

  const partyId = str(data.id);
  const memberInsert = await admin.from("party_members").insert({
    party_id: partyId,
    user_id: userId,
    role: "leader",
    ready: false,
  });
  if (memberInsert.error) throw memberInsert.error;

  await logPartyEvent(admin, partyId, userId, "party_created", {
    visibility,
    activity,
    minLevel,
    maxMembers,
  });
}

async function updateParty(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (party.state !== "forming" || party.locked) throw new Error("Party cannot be edited right now.");

  const currentMembers = await getPartyMembers(admin, partyId);
  const nextMaxMembers = payload.maxMembers != null ? Math.min(4, Math.max(2, int(payload.maxMembers, party.max_members))) : party.max_members;
  if (nextMaxMembers < currentMembers.length) {
    throw new Error("Party size cannot be lower than the current member count.");
  }

  const nextValues = {
    name: payload.name != null ? normalizePartyName(payload.name, party.name) : party.name,
    visibility: payload.visibility != null ? normalizeVisibility(payload.visibility) : party.visibility,
    activity: payload.activity != null ? normalizeActivity(payload.activity) : party.activity,
    selected_monster_id: payload.selectedMonsterId != null ? normalizeMonsterId(payload.selectedMonsterId) : party.selected_monster_id,
    min_level: payload.minLevel != null ? Math.max(1, int(payload.minLevel, party.min_level)) : party.min_level,
    max_members: nextMaxMembers,
    auto_accept_requests: payload.autoAcceptRequests != null ? payload.autoAcceptRequests === true : party.auto_accept_requests,
  };

  const { error } = await admin
    .from("parties")
    .update(nextValues)
    .eq("id", partyId);
  if (error) throw error;

  await logPartyEvent(admin, partyId, userId, "party_updated", {
    visibility: nextValues.visibility,
    activity: nextValues.activity,
    selectedMonsterId: nextValues.selected_monster_id,
    minLevel: nextValues.min_level,
    maxMembers: nextValues.max_members,
    autoAcceptRequests: nextValues.auto_accept_requests,
  });
}

async function invitePlayer(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Only the leader can send invites.");
  if (party.state !== "forming" || party.locked) throw new Error("Party is locked right now.");

  const target = await resolveHeroTarget(admin, str(payload.targetHeroName));
  if (target.userId === userId) throw new Error("You cannot invite yourself.");
  if (await getCurrentPartyId(admin, target.userId)) throw new Error(`${target.heroName} is already in a party.`);

  const members = await getPartyMembers(admin, partyId);
  if (members.length >= party.max_members) throw new Error("Party is already full.");

  const existingInvite = await admin
    .from("party_invites")
    .select("id")
    .eq("party_id", partyId)
    .eq("to_user_id", target.userId)
    .eq("status", "pending")
    .gt("expires_at", formatIsoNow())
    .maybeSingle();
  if (existingInvite.error) throw existingInvite.error;
  if (existingInvite.data?.id) throw new Error(`${target.heroName} already has a pending invite.`);

  const insertRes = await admin.from("party_invites").insert({
    party_id: partyId,
    from_user_id: userId,
    to_user_id: target.userId,
    status: "pending",
  });
  if (insertRes.error) throw insertRes.error;

  await logPartyEvent(admin, partyId, userId, "party_invited_player", {
    targetUserId: target.userId,
    targetHeroName: target.heroName,
  });
}

async function chooseMonster(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (party.state !== "forming" || party.locked) throw new Error("Monster selection is locked right now.");

  const selectedMonsterId = normalizeMonsterId(payload.selectedMonsterId);
  const { error } = await admin
    .from("parties")
    .update({ selected_monster_id: selectedMonsterId })
    .eq("id", partyId);
  if (error) throw error;

  await logPartyEvent(admin, partyId, userId, "party_monster_selected", {
    selectedMonsterId,
  });
}

async function respondInvite(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const inviteId = str(payload.inviteId);
  const response = str(payload.response).toLowerCase();
  if (!inviteId) throw new Error("Invite id is required.");
  if (response !== "accept" && response !== "decline") throw new Error("Invalid invite response.");

  const { data, error } = await admin
    .from("party_invites")
    .select("id, party_id, from_user_id, to_user_id, status, created_at, expires_at, responded_at, metadata")
    .eq("id", inviteId)
    .maybeSingle();
  if (error) throw error;
  const invite = data as InviteRow | null;
  if (!invite || invite.to_user_id !== userId) throw new Error("Invite not found.");
  if (invite.status !== "pending") throw new Error("Invite is no longer pending.");
  if (new Date(invite.expires_at).getTime() <= Date.now()) throw new Error("Invite has expired.");

  const now = formatIsoNow();
  if (response === "decline") {
    const updateRes = await admin
      .from("party_invites")
      .update({ status: "declined", responded_at: now })
      .eq("id", invite.id)
      .eq("status", "pending");
    if (updateRes.error) throw updateRes.error;
    await logPartyEvent(admin, invite.party_id, userId, "party_invite_declined", { inviteId: invite.id });
    return;
  }

  if (await getCurrentPartyId(admin, userId)) throw new Error("You are already in a party.");
  const party = await getPartyRow(admin, invite.party_id);
  if (!party || party.disbanded_at) throw new Error("Party no longer exists.");
  if (party.state !== "forming" || party.locked) throw new Error("Party is not accepting new members.");
  const members = await getPartyMembers(admin, invite.party_id);
  if (members.length >= party.max_members) throw new Error("Party is already full.");

  const memberInsert = await admin.from("party_members").insert({
    party_id: invite.party_id,
    user_id: userId,
    role: "member",
    ready: false,
  });
  if (memberInsert.error) throw memberInsert.error;

  const inviteUpdate = await admin
    .from("party_invites")
    .update({ status: "accepted", responded_at: now })
    .eq("id", invite.id)
    .eq("status", "pending");
  if (inviteUpdate.error) throw inviteUpdate.error;

  await admin
    .from("party_join_requests")
    .update({ status: "cancelled", responded_at: now })
    .eq("party_id", invite.party_id)
    .eq("user_id", userId)
    .eq("status", "pending");

  await logPartyEvent(admin, invite.party_id, userId, "party_invite_accepted", { inviteId: invite.id });
}

async function requestJoin(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId);
  if (!partyId) throw new Error("Party id is required.");
  if (await getCurrentPartyId(admin, userId)) throw new Error("You are already in a party.");

  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.visibility !== "open") throw new Error("This party is private.");
  if (party.state !== "forming" || party.locked) throw new Error("Party is not accepting new members.");

  const myLevel = await getUserHeroLevel(admin, userId);
  if (myLevel < party.min_level) throw new Error(`This party requires hero level ${party.min_level}+.`);

  const members = await getPartyMembers(admin, partyId);
  if (members.length >= party.max_members) throw new Error("Party is already full.");

  if (party.auto_accept_requests) {
    const memberInsert = await admin.from("party_members").insert({
      party_id: partyId,
      user_id: userId,
      role: "member",
      ready: false,
    });
    if (memberInsert.error) throw memberInsert.error;

    const requestInsert = await admin.from("party_join_requests").insert({
      party_id: partyId,
      user_id: userId,
      status: "approved",
      responded_at: formatIsoNow(),
      message: str(payload.message).slice(0, 240),
    });
    if (requestInsert.error) throw requestInsert.error;

    await logPartyEvent(admin, partyId, userId, "party_join_auto_approved", {});
    return;
  }

  const existingRequest = await admin
    .from("party_join_requests")
    .select("id")
    .eq("party_id", partyId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .gt("expires_at", formatIsoNow())
    .maybeSingle();
  if (existingRequest.error) throw existingRequest.error;
  if (existingRequest.data?.id) throw new Error("You already have a pending join request for this party.");

  const requestInsert = await admin.from("party_join_requests").insert({
    party_id: partyId,
    user_id: userId,
    status: "pending",
    message: str(payload.message).slice(0, 240),
  });
  if (requestInsert.error) throw requestInsert.error;

  await logPartyEvent(admin, partyId, userId, "party_join_requested", {});
}

async function respondJoinRequest(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const requestId = str(payload.requestId);
  const response = str(payload.response).toLowerCase();
  if (!requestId) throw new Error("Join request id is required.");
  if (response !== "approve" && response !== "reject") throw new Error("Invalid join request response.");

  const { data, error } = await admin
    .from("party_join_requests")
    .select("id, party_id, user_id, status, created_at, expires_at, responded_at, message")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  const request = data as JoinRequestRow | null;
  if (!request) throw new Error("Join request not found.");
  const party = await getPartyRow(admin, request.party_id);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (request.status !== "pending") throw new Error("Join request is no longer pending.");

  const now = formatIsoNow();
  if (response === "reject") {
    const updateRes = await admin
      .from("party_join_requests")
      .update({ status: "rejected", responded_at: now })
      .eq("id", request.id)
      .eq("status", "pending");
    if (updateRes.error) throw updateRes.error;
    await logPartyEvent(admin, request.party_id, userId, "party_join_rejected", { requestId: request.id, targetUserId: request.user_id });
    return;
  }

  if (await getCurrentPartyId(admin, request.user_id)) throw new Error("That player is already in a party.");
  if (party.state !== "forming" || party.locked) throw new Error("Party is not accepting new members.");
  const members = await getPartyMembers(admin, request.party_id);
  if (members.length >= party.max_members) throw new Error("Party is already full.");

  const memberInsert = await admin.from("party_members").insert({
    party_id: request.party_id,
    user_id: request.user_id,
    role: "member",
    ready: false,
  });
  if (memberInsert.error) throw memberInsert.error;

  const updateRes = await admin
    .from("party_join_requests")
    .update({ status: "approved", responded_at: now })
    .eq("id", request.id)
    .eq("status", "pending");
  if (updateRes.error) throw updateRes.error;

  await logPartyEvent(admin, request.party_id, userId, "party_join_approved", { requestId: request.id, targetUserId: request.user_id });
}

async function cancelJoinRequest(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const requestId = str(payload.requestId);
  if (!requestId) throw new Error("Join request id is required.");
  const updateRes = await admin
    .from("party_join_requests")
    .update({ status: "cancelled", responded_at: formatIsoNow() })
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "pending");
  if (updateRes.error) throw updateRes.error;
}

async function setReady(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("You are not in a party.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.state !== "forming" || party.locked) throw new Error("Ready state can only change while the party is forming.");
  const nextReady = payload.ready == null ? null : payload.ready === true;
  const members = await getPartyMembers(admin, partyId);
  const currentMember = members.find((entry) => entry.user_id === userId);
  if (!currentMember) throw new Error("Party member not found.");
  const ready = nextReady == null ? !currentMember.ready : nextReady;
  const updateRes = await admin
    .from("party_members")
    .update({ ready })
    .eq("party_id", partyId)
    .eq("user_id", userId);
  if (updateRes.error) throw updateRes.error;
  await logPartyEvent(admin, partyId, userId, ready ? "party_ready_on" : "party_ready_off", {});
}

async function leaveParty(admin: ReturnType<typeof createClient>, userId: string) {
  const partyId = await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("You are not in a party.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.state === "active" || party.locked) throw new Error("You cannot leave while the party is in an active activity.");

  const members = await getPartyMembers(admin, partyId);
  const me = members.find((entry) => entry.user_id === userId);
  if (!me) throw new Error("Party member not found.");

  if (me.role === "leader") {
    const others = members.filter((entry) => entry.user_id !== userId);
    if (!others.length) {
      await disbandParty(admin, userId, { partyId });
      return;
    }

    const nextLeader = others[0];
    const leaderUpdate = await admin
      .from("party_members")
      .update({ role: "leader", ready: false })
      .eq("party_id", partyId)
      .eq("user_id", nextLeader.user_id);
    if (leaderUpdate.error) throw leaderUpdate.error;

    const deleteRes = await admin
      .from("party_members")
      .delete()
      .eq("party_id", partyId)
      .eq("user_id", userId);
    if (deleteRes.error) throw deleteRes.error;

    const partyUpdate = await admin
      .from("parties")
      .update({ leader_user_id: nextLeader.user_id })
      .eq("id", partyId);
    if (partyUpdate.error) throw partyUpdate.error;

    await logPartyEvent(admin, partyId, userId, "party_leader_transferred", { newLeaderUserId: nextLeader.user_id });
    return;
  }

  const deleteRes = await admin
    .from("party_members")
    .delete()
    .eq("party_id", partyId)
    .eq("user_id", userId);
  if (deleteRes.error) throw deleteRes.error;

  await logPartyEvent(admin, partyId, userId, "party_member_left", {});
}

async function disbandParty(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");

  const now = formatIsoNow();
  const partyUpdate = await admin
    .from("parties")
    .update({
      state: "disbanded",
      visibility: "private",
      locked: true,
      disbanded_at: now,
    })
    .eq("id", partyId);
  if (partyUpdate.error) throw partyUpdate.error;

  const [memberDelete, inviteUpdate, requestUpdate, sessionUpdate] = await Promise.all([
    admin.from("party_members").delete().eq("party_id", partyId),
    admin.from("party_invites").update({ status: "revoked", responded_at: now }).eq("party_id", partyId).eq("status", "pending"),
    admin.from("party_join_requests").update({ status: "rejected", responded_at: now }).eq("party_id", partyId).eq("status", "pending"),
    admin.from("party_activity_sessions").update({ status: "cancelled", ended_at: now }).eq("party_id", partyId).eq("status", "active"),
  ]);
  if (memberDelete.error) throw memberDelete.error;
  if (inviteUpdate.error) throw inviteUpdate.error;
  if (requestUpdate.error) throw requestUpdate.error;
  if (sessionUpdate.error) throw sessionUpdate.error;

  await logPartyEvent(admin, partyId, userId, "party_disbanded", {});
}

async function startActivity(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (party.state !== "forming" || party.locked) throw new Error("Party cannot start an activity right now.");

  const members = await getPartyMembers(admin, partyId);
  if (members.length < 2) throw new Error("A party needs at least 2 players to start.");
  if (members.length > party.max_members) throw new Error("Party has too many members.");
  if (!members.filter((entry) => entry.role !== "leader").every((entry) => entry.ready)) {
    throw new Error("All non-leader party members must be ready first.");
  }

  const summaries = await getUserSummaries(admin, members.map((entry) => entry.user_id));
  const memberSnapshot = members.map((entry) => {
    const summary = summaries.get(entry.user_id) || {};
    return {
      userId: entry.user_id,
      heroName: str(summary.heroName, "Hero"),
      heroLevel: Math.max(1, int(summary.heroLevel, 1)),
      avatarUrl: str(summary.avatarUrl, "images/hero.png"),
      role: entry.role,
      ready: !!entry.ready,
    };
  });
  const activity = normalizeActivity(payload.activity || party.activity);
  if (activity.toLowerCase().includes("party fight") && !str(party.selected_monster_id)) {
    throw new Error("Choose a monster before starting Party Fight.");
  }

  const [sessionInsert, partyUpdate] = await Promise.all([
    admin.from("party_activity_sessions").insert({
      party_id: partyId,
      activity,
      status: "active",
      started_by_user_id: userId,
      member_snapshot: memberSnapshot,
    }),
    admin.from("parties").update({
      state: "active",
      activity,
      locked: true,
    }).eq("id", partyId),
  ]);
  if (sessionInsert.error) throw sessionInsert.error;
  if (partyUpdate.error) throw partyUpdate.error;

  await logPartyEvent(admin, partyId, userId, "party_activity_started", { activity });
}

async function endActivity(admin: ReturnType<typeof createClient>, userId: string, payload: JsonRecord) {
  const partyId = str(payload.partyId) || await getCurrentPartyId(admin, userId);
  if (!partyId) throw new Error("Party not found.");
  const party = await getPartyRow(admin, partyId);
  if (!party || party.disbanded_at) throw new Error("Party not found.");
  if (party.leader_user_id !== userId) throw new Error("Leader access required.");
  if (party.state !== "active") throw new Error("Party is not in an active activity.");

  const now = formatIsoNow();
  const activeSession = await getActiveSessionForParty(admin, partyId);
  if (activeSession) {
    const sessionUpdate = await admin
      .from("party_activity_sessions")
      .update({
        status: str(payload.result, "completed").toLowerCase() === "failed" ? "failed" : "completed",
        ended_at: now,
        result_payload: payload.resultPayload && typeof payload.resultPayload === "object" ? payload.resultPayload : {},
      })
      .eq("id", activeSession.id);
    if (sessionUpdate.error) throw sessionUpdate.error;
  }

  const [partyUpdate, readyReset] = await Promise.all([
    admin.from("parties").update({
      state: "forming",
      locked: false,
      activity: normalizeActivity(payload.nextActivity || party.activity),
    }).eq("id", partyId),
    admin.from("party_members").update({ ready: false }).eq("party_id", partyId),
  ]);
  if (partyUpdate.error) throw partyUpdate.error;
  if (readyReset.error) throw readyReset.error;

  await logPartyEvent(admin, partyId, userId, "party_activity_ended", {
    result: str(payload.result, "completed").toLowerCase(),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase environment is not configured." }, { status: 500 });
  }
  if (!token) {
    return json({ error: "Missing bearer token." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user?.id) {
    return json({ error: "Invalid or expired session." }, { status: 401 });
  }

  let payload: JsonRecord = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const action = str(payload.action, "bootstrap").toLowerCase();

  try {
    if (action === "bootstrap") {
      return json(await getBootstrapState(admin, user.id));
    }
    if (action === "create_party") {
      await createParty(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party created." });
    }
    if (action === "update_party") {
      await updateParty(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party updated." });
    }
    if (action === "invite_player") {
      await invitePlayer(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Invite sent." });
    }
    if (action === "choose_monster") {
      await chooseMonster(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Monster selected." });
    }
    if (action === "respond_invite") {
      await respondInvite(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Invite response saved." });
    }
    if (action === "request_join") {
      await requestJoin(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Join request sent." });
    }
    if (action === "respond_join_request") {
      await respondJoinRequest(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Join request updated." });
    }
    if (action === "cancel_join_request") {
      await cancelJoinRequest(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Join request cancelled." });
    }
    if (action === "set_ready") {
      await setReady(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Ready state updated." });
    }
    if (action === "leave_party") {
      await leaveParty(admin, user.id);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party updated." });
    }
    if (action === "disband_party") {
      await disbandParty(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party disbanded." });
    }
    if (action === "start_activity") {
      await startActivity(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party activity started." });
    }
    if (action === "end_activity") {
      await endActivity(admin, user.id, payload);
      return json({ ...(await getBootstrapState(admin, user.id)), message: "Party activity ended." });
    }

    return json({ error: `Unknown action '${action}'.` }, { status: 400 });
  } catch (error) {
    console.error("[party-action] failed", action, error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Party action failed.",
    }, { status: 400 });
  }
});
