function normalizeId(value) {
  return String(value || "").trim();
}

function toDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function toTimestamp(value, fallbackTs = Date.now()) {
  const date = toDate(value);
  if (date) return date.getTime();
  return fallbackTs;
}

function normalizeStatus(status = "") {
  const value = String(status || "").trim().toLowerCase();
  if (["rejected", "invalid"].includes(value)) return "closed_invalid";
  if (["duplicate"].includes(value)) return "closed_duplicate";
  if (["closed", "closed_invalid", "closed_duplicate"].includes(value)) return value;
  return "open";
}

function normalizeCloseStatus(event = {}, fallbackStatus = "closed") {
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  const payloadStatus = normalizeStatus(
    payload.closed_status
      || payload.closedStatus
      || payload.status
      || payload.reason
      || payload.close_reason
      || fallbackStatus
  );
  if (payloadStatus === "open") return "closed";
  return payloadStatus;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectEventsForSubject(subjectId, subjectHistoryEvents) {
  if (Array.isArray(subjectHistoryEvents)) {
    return subjectHistoryEvents.filter((event) => normalizeId(event?.subject_id) === subjectId);
  }
  if (subjectHistoryEvents && typeof subjectHistoryEvents === "object") {
    return asArray(subjectHistoryEvents[subjectId]);
  }
  return [];
}

function resolveObjectiveDates({ subjectId, objectivesById = {}, objectiveIdsBySubjectId = {} } = {}) {
  return asArray(objectiveIdsBySubjectId[subjectId])
    .map((objectiveId) => objectivesById?.[objectiveId])
    .map((objective = {}) => ({
      objectiveId: normalizeId(objective.id),
      dueDate: toDate(objective.due_date || objective.dueDate)
    }))
    .filter((entry) => !!entry.objectiveId && !!entry.dueDate)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

function splitSegmentByObjectiveBoundaries(segment, objectiveDates = []) {
  const boundaries = objectiveDates
    .map((entry) => entry.dueDate.getTime())
    .filter((ts) => ts > segment.startAt.getTime() && ts < segment.endAt.getTime());

  if (!boundaries.length) return [segment];

  const splits = [];
  let startTs = segment.startAt.getTime();
  for (const boundaryTs of boundaries) {
    splits.push({
      ...segment,
      startAt: new Date(startTs),
      endAt: new Date(boundaryTs)
    });
    startTs = boundaryTs;
  }
  splits.push({
    ...segment,
    startAt: new Date(startTs),
    endAt: new Date(segment.endAt.getTime())
  });
  return splits;
}

function resolveSegmentStyle({ status, endAt, objectiveDates }) {
  const statusKey = normalizeStatus(status);
  const endTs = endAt.getTime();
  const hasObjectivePassed = objectiveDates.some((entry) => endTs > entry.dueDate.getTime());

  if (hasObjectivePassed) {
    return {
      lineStyle: statusKey === "open" ? "solid" : "dashed",
      lineColor: "red"
    };
  }

  if (statusKey === "open") {
    return {
      lineStyle: "solid",
      lineColor: "green"
    };
  }

  return {
    lineStyle: "dashed",
    lineColor: "gray"
  };
}

function resolveStatusAtTimestamp(statusPoints = [], targetTs, fallback = "open") {
  let resolved = normalizeStatus(fallback);
  for (const point of statusPoints) {
    if (point.at.getTime() > targetTs) break;
    resolved = normalizeStatus(point.status);
  }
  return resolved;
}

function toStatusIcon(status = "open") {
  const normalized = normalizeStatus(status);
  if (normalized === "closed_invalid") return "reject";
  if (normalized === "closed_duplicate") return "close";
  if (normalized.startsWith("closed")) return "close";
  return "open";
}

export function buildTrajectoryModel({
  subjects = [],
  subjectHistoryEvents = {},
  objectivesById = {},
  objectiveIdsBySubjectId = {},
  projectStartDate,
  today = new Date()
} = {}) {
  const todayTs = toTimestamp(today);
  const fallbackProjectStartTs = toTimestamp(projectStartDate, todayTs);

  const rows = asArray(subjects).map((subject = {}) => {
    const subjectId = normalizeId(subject.id);
    const objectiveDates = resolveObjectiveDates({ subjectId, objectivesById, objectiveIdsBySubjectId });
    const latestObjectiveTs = objectiveDates.length ? objectiveDates[objectiveDates.length - 1].dueDate.getTime() : null;

    const events = collectEventsForSubject(subjectId, subjectHistoryEvents)
      .map((event = {}) => ({
        ...event,
        event_type: normalizeId(event.event_type).toLowerCase(),
        created_at: toDate(event.created_at)
      }))
      .filter((event) => !!event.created_at)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

    const createdEvent = events.find((event) => event.event_type === "subject_created");
    const subjectCreatedTs = toTimestamp(
      createdEvent?.created_at || subject.created_at,
      fallbackProjectStartTs
    );

    const endTs = Math.max(todayTs, latestObjectiveTs || 0, subjectCreatedTs);
    const fallbackStartStatus = normalizeStatus(subject.status);

    const statusPoints = [];
    const upsertStatusPoint = (ts, status, source) => {
      const safeTs = Math.max(subjectCreatedTs, ts);
      const safeStatus = normalizeStatus(status);
      const existing = statusPoints.find((point) => point.at.getTime() === safeTs);
      if (existing) {
        existing.status = safeStatus;
        existing.icon = toStatusIcon(safeStatus);
        existing.source = source;
        return;
      }
      statusPoints.push({
        at: new Date(safeTs),
        status: safeStatus,
        icon: toStatusIcon(safeStatus),
        source
      });
    };

    upsertStatusPoint(subjectCreatedTs, "open", createdEvent ? "subject_created" : "subject_fallback_created_at");

    for (const event of events) {
      const ts = event.created_at.getTime();
      if (event.event_type === "subject_created") {
        upsertStatusPoint(ts, "open", event.event_type);
      } else if (event.event_type === "subject_closed") {
        upsertStatusPoint(ts, normalizeCloseStatus(event, subject.status), event.event_type);
      } else if (event.event_type === "subject_reopened") {
        upsertStatusPoint(ts, "open", event.event_type);
      } else if (["subject_rejected", "review_rejected", "subject_invalidated"].includes(event.event_type)) {
        upsertStatusPoint(ts, "closed_invalid", event.event_type);
      }
    }

    statusPoints.sort((a, b) => a.at.getTime() - b.at.getTime());

    const rawSegments = [];
    for (let index = 0; index < statusPoints.length; index += 1) {
      const point = statusPoints[index];
      const nextPoint = statusPoints[index + 1];
      const segmentStartTs = point.at.getTime();
      const segmentEndTs = nextPoint ? nextPoint.at.getTime() : endTs;
      if (segmentEndTs <= segmentStartTs) continue;
      rawSegments.push({
        subjectId,
        status: point.status,
        startAt: new Date(segmentStartTs),
        endAt: new Date(segmentEndTs)
      });
    }

    const lifecycleSegments = rawSegments
      .flatMap((segment) => splitSegmentByObjectiveBoundaries(segment, objectiveDates))
      .map((segment) => ({
        ...segment,
        ...resolveSegmentStyle({
          status: segment.status,
          endAt: segment.endAt,
          objectiveDates
        })
      }));

    const objectiveMarkers = objectiveDates.map((entry) => {
      const statusAtDueDate = resolveStatusAtTimestamp(statusPoints, entry.dueDate.getTime(), fallbackStartStatus);
      const isClosedAtDueDate = normalizeStatus(statusAtDueDate) !== "open";
      return {
        subjectId,
        objectiveId: entry.objectiveId,
        at: new Date(entry.dueDate.getTime()),
        markerType: isClosedAtDueDate ? "check" : "cross",
        markerColor: isClosedAtDueDate ? "green" : "red",
        statusAtDueDate
      };
    });


    return {
      subjectId,
      statusPoints,
      lifecycleSegments,
      objectiveMarkers
    };
  });

  return { rows };
}

export function __trajectoryModelTestUtils() {
  return {
    normalizeStatus,
    normalizeCloseStatus,
    resolveObjectiveDates,
    resolveStatusAtTimestamp,
    splitSegmentByObjectiveBoundaries,
    resolveSegmentStyle
  };
}
