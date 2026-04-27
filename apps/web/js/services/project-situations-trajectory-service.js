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

const STATUS_EVENT_TYPES = new Set([
  "subject_created",
  "subject_closed",
  "subject_reopened",
  "subject_rejected",
  "review_rejected",
  "subject_invalidated"
]);

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
  return {
    ...row,
    event_type: eventType,
    subject_id: subjectId,
    created_at: createdAt,
    payload: row.payload && typeof row.payload === "object" ? row.payload : {}
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

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_history`);
  url.searchParams.set("select", "id,project_id,subject_id,event_type,payload,created_at,created_by");
  url.searchParams.set("project_id", `eq.${resolvedProjectId}`);
  url.searchParams.set("subject_id", buildInFilterValue(scopedSubjectIds));
  url.searchParams.set("event_type", `in.(${TRAJECTORY_EVENT_TYPES.join(",")})`);
  url.searchParams.set("order", "created_at.asc");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`trajectory history fetch failed (${response.status}): ${text}`);
  }

  const normalizedEvents = safeArray(await response.json())
    .map(normalizeHistoryRow)
    .filter((event) => !!normalizeId(event.subject_id))
    .filter((event) => TRAJECTORY_EVENT_TYPES.includes(event.event_type));

  const eventsBySubjectId = groupEventsBySubjectId(normalizedEvents);
  const relationEvents = normalizedEvents.filter((event) => RELATION_EVENT_TYPES.has(event.event_type));
  const statusEventsBySubjectId = groupEventsBySubjectId(
    normalizedEvents.filter((event) => STATUS_EVENT_TYPES.has(event.event_type))
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
