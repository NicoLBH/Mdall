import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId } from "./project-supabase-sync.js";

const SUPABASE_URL = getSupabaseUrl();

const TRAJECTORY_EVENT_TYPES = [
  "subject_created",
  "subject_closed",
  "subject_reopened",
  "subject_rejected",
  "review_rejected",
  "subject_invalidated",
  "subject_parent_added",
  "subject_parent_removed",
  "subject_child_added",
  "subject_child_removed",
  "subject_blocked_by_added",
  "subject_blocked_by_removed",
  "subject_blocking_for_added",
  "subject_blocking_for_removed",
  "subject_objectives_changed"
];

const RELATION_EVENT_TYPES = new Set([
  "subject_parent_added",
  "subject_parent_removed",
  "subject_child_added",
  "subject_child_removed",
  "subject_blocked_by_added",
  "subject_blocked_by_removed",
  "subject_blocking_for_added",
  "subject_blocking_for_removed"
]);

const ACTIVITY_EVENT_TYPES = new Set([
  "subject_created",
  "subject_closed",
  "subject_reopened",
  "subject_rejected",
  "review_rejected",
  "subject_invalidated",
  "subject_blocked_by_added",
  "subject_objectives_changed"
]);
const HISTORY_SELECT_CANDIDATES = [
  "id,project_id,subject_id,event_type,event_payload,created_at",
  "id,project_id,subject_id,event_type,payload,created_at",
  "id,project_id,subject_id,event_type,created_at"
];
const TRAJECTORY_HISTORY_RPC_NAME = "list_subject_history_for_trajectory";

function normalizeId(value) {
  return String(value || "").trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function getSupabaseAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
}

async function resolveProjectId(projectId = "") {
  const explicitProjectId = normalizeId(projectId);
  if (explicitProjectId) return explicitProjectId;
  return normalizeId(await resolveCurrentBackendProjectId().catch(() => ""));
}

function buildInFilterValue(subjectIds = []) {
  const normalized = [...new Set(safeArray(subjectIds).map((subjectId) => normalizeId(subjectId)).filter(Boolean))];
  if (!normalized.length) return "";
  return `in.(${normalized.join(",")})`;
}

function normalizeHistoryRow(row = {}) {
  const eventType = normalizeId(row.event_type || row.type).toLowerCase();
  const subjectId = normalizeId(row.subject_id || row.entity_id || row.subjectId);
  const createdAt = row.created_at || row.createdAt || "";
  const payloadCandidate = row.event_payload ?? row.eventPayload ?? row.payload;
  return {
    ...row,
    event_type: eventType,
    subject_id: subjectId,
    created_at: createdAt,
    payload: payloadCandidate && typeof payloadCandidate === "object" ? payloadCandidate : {}
  };
}

function groupEventsBySubjectId(events = []) {
  return events.reduce((acc, event) => {
    const subjectId = normalizeId(event?.subject_id);
    if (!subjectId) return acc;
    if (!Array.isArray(acc[subjectId])) acc[subjectId] = [];
    acc[subjectId].push(event);
    return acc;
  }, {});
}

function isMissingColumnError(status, rawBody = "") {
  return status === 400 && /column subject_history\.[a-z_]+ does not exist/i.test(String(rawBody || ""));
}

function isMissingRpcFunctionError(status, rawBody = "") {
  return (status === 404 || status === 400)
    && /function\s+public\.list_subject_history_for_trajectory|could not find the function/i.test(String(rawBody || ""));
}

async function fetchTrajectoryHistoryViaRpc({ projectId, subjectIds, headers }) {
  const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/${TRAJECTORY_HISTORY_RPC_NAME}`;
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      p_project_id: projectId,
      p_subject_ids: subjectIds
    }),
    cache: "no-store"
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(`trajectory history rpc failed (${response.status}): ${text}`);
    error.status = response.status;
    error.rawBody = text;
    throw error;
  }
  return safeArray(await response.json().catch(() => []));
}

async function fetchTrajectoryHistoryViaRest({ projectId, subjectIds, headers }) {
  let rows = null;
  let lastErrorText = "";
  let lastStatus = 0;
  for (const select of HISTORY_SELECT_CANDIDATES) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/subject_history`);
    url.searchParams.set("select", select);
    url.searchParams.set("project_id", `eq.${projectId}`);
    url.searchParams.set("subject_id", buildInFilterValue(subjectIds));
    url.searchParams.set("event_type", `in.(${TRAJECTORY_EVENT_TYPES.join(",")})`);
    url.searchParams.set("order", "created_at.asc");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      cache: "no-store"
    });

    if (response.ok) {
      rows = safeArray(await response.json());
      break;
    }

    lastStatus = response.status;
    lastErrorText = await response.text().catch(() => "");
    if (!isMissingColumnError(response.status, lastErrorText)) {
      throw new Error(`trajectory history fetch failed (${response.status}): ${lastErrorText}`);
    }
  }

  if (!rows) {
    throw new Error(`trajectory history fetch failed (${lastStatus}): ${lastErrorText}`);
  }
  return rows;
}

export async function loadProjectSituationsTrajectoryHistory({
  projectId,
  subjectIds = []
} = {}) {
  const resolvedProjectId = await resolveProjectId(projectId);
  const scopedSubjectIds = [...new Set(safeArray(subjectIds).map((value) => normalizeId(value)).filter(Boolean))];


  if (!resolvedProjectId || !scopedSubjectIds.length) {
    return {
      eventsBySubjectId: {},
      relationEvents: [],
      statusEventsBySubjectId: {}
    };
  }

  const headers = await getSupabaseAuthHeaders({ Accept: "application/json" });
  let rows = [];
  try {
    rows = await fetchTrajectoryHistoryViaRpc({
      projectId: resolvedProjectId,
      subjectIds: scopedSubjectIds,
      headers
    });
  } catch (error) {
    if (!isMissingRpcFunctionError(error?.status, error?.rawBody)) {
      throw error;
    }
    rows = await fetchTrajectoryHistoryViaRest({
      projectId: resolvedProjectId,
      subjectIds: scopedSubjectIds,
      headers
    });
  }

  const normalizedEvents = safeArray(rows)
    .map(normalizeHistoryRow)
    .filter((event) => !!normalizeId(event.subject_id))
    .filter((event) => TRAJECTORY_EVENT_TYPES.includes(event.event_type));

  const eventsBySubjectId = groupEventsBySubjectId(normalizedEvents);
  const relationEvents = normalizedEvents.filter((event) => RELATION_EVENT_TYPES.has(event.event_type));
  const statusEventsBySubjectId = groupEventsBySubjectId(
    normalizedEvents.filter((event) => ACTIVITY_EVENT_TYPES.has(event.event_type))
  );


  return {
    eventsBySubjectId,
    relationEvents,
    statusEventsBySubjectId
  };
}

export function __trajectoryHistoryServiceTestUtils() {
  return {
    buildInFilterValue,
    normalizeHistoryRow,
    groupEventsBySubjectId
  };
}
