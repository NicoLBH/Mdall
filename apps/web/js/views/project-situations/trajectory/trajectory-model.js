function normalizeId(value) {
  return String(value || "").trim();
}

function resolveSubjectDisplayIdentifier(subject = {}, subjectId = "") {
  const orderNumber = Number(
    subject?.subject_number
    ?? subject?.subjectNumber
    ?? subject?.raw?.subject_number
    ?? subject?.raw?.subjectNumber
  );
  if (Number.isFinite(orderNumber) && orderNumber > 0) return `#${Math.floor(orderNumber)}`;
  return subjectId ? `#${subjectId}` : "";
}

function toDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, yyyy, mm, dd] = dateOnlyMatch;
      const localDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      return Number.isFinite(localDate.getTime()) ? localDate : null;
    }
  }
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

function toObjectiveDeltaArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.keys(value);
  return [];
}

function normalizeObjectiveIds(value) {
  return asArray(value).map((entry) => normalizeId(entry)).filter(Boolean);
}

function resolveObjectiveMilestonePoints(event = {}, ts, currentStatus = "open") {
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  const action = normalizeId(payload.action).toLowerCase();
  const delta = payload?.delta && typeof payload.delta === "object" ? payload.delta : {};
  const added = toObjectiveDeltaArray(delta.added);
  const removed = toObjectiveDeltaArray(delta.removed);

  const hasAdded = action === "added" || action === "replaced" || added.length > 0;
  const hasRemoved = action === "removed" || action === "replaced" || removed.length > 0;
  const points = [];

  if (hasRemoved) {
    points.push({
      at: new Date(ts),
      status: normalizeStatus(currentStatus),
      icon: "milestone",
      source: "subject_objectives_changed",
      contributesToLifecycle: false,
      milestoneAction: "removed",
      markerColor: "var(--muted)",
      offsetIndex: 0
    });
  }

  if (hasAdded) {
    points.push({
      at: new Date(ts),
      status: normalizeStatus(currentStatus),
      icon: "milestone",
      source: "subject_objectives_changed",
      contributesToLifecycle: false,
      milestoneAction: "added",
      markerColor: "#fff",
      offsetIndex: hasRemoved ? 1 : 0
    });
  }

  return points;
}

function resolveSubjectHistoryKeys(subject = {}) {
  const keys = new Set([
    normalizeId(subject?.id),
    normalizeId(subject?.subject_id),
    normalizeId(subject?.subjectId),
    normalizeId(subject?.subject_number),
    normalizeId(subject?.subjectNumber),
    normalizeId(subject?.raw?.id),
    normalizeId(subject?.raw?.subject_id),
    normalizeId(subject?.raw?.subjectId),
    normalizeId(subject?.raw?.subject_number),
    normalizeId(subject?.raw?.subjectNumber)
  ]);
  keys.delete("");
  return [...keys];
}

function collectEventsForSubject(subjectHistoryEvents, subjectHistoryKeys = []) {
  const keysSet = new Set(asArray(subjectHistoryKeys).map((value) => normalizeId(value)).filter(Boolean));
  if (!keysSet.size) return [];
  if (Array.isArray(subjectHistoryEvents)) {
    return subjectHistoryEvents.filter((event) => keysSet.has(normalizeId(event?.subject_id)));
  }
  if (subjectHistoryEvents && typeof subjectHistoryEvents === "object") {
    const collected = [];
    for (const key of keysSet) {
      collected.push(...asArray(subjectHistoryEvents[key]));
    }
    return collected;
  }
  return [];
}

function resolveObjectiveDatesFromIds(objectiveIds = [], objectivesById = {}) {
  return normalizeObjectiveIds(objectiveIds)
    .map((objectiveId) => objectivesById?.[objectiveId] || { id: objectiveId })
    .map((objective = {}) => ({
      objectiveId: normalizeId(objective.id) || normalizeId(objective.objective_id),
      dueDate: toDate(objective.due_date || objective.dueDate)
    }))
    .filter((entry) => !!entry.objectiveId && !!entry.dueDate)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

function splitSegmentByBoundaries(segment, boundaries = []) {
  const splitPoints = boundaries
    .filter((ts) => ts > segment.startAt.getTime() && ts < segment.endAt.getTime())
    .sort((a, b) => a - b);

  if (!splitPoints.length) return [segment];

  const splits = [];
  let startTs = segment.startAt.getTime();
  for (const boundaryTs of splitPoints) {
    if (boundaryTs <= startTs) continue;
    splits.push({ ...segment, startAt: new Date(startTs), endAt: new Date(boundaryTs) });
    startTs = boundaryTs;
  }
  if (segment.endAt.getTime() > startTs) {
    splits.push({ ...segment, startAt: new Date(startTs), endAt: new Date(segment.endAt.getTime()) });
  }
  return splits;
}

function resolveSegmentStyle({ status, startAt, endAt, overdueWindows = [] }) {
  const statusKey = normalizeStatus(status);
  const startTs = startAt.getTime();
  const endTs = endAt.getTime();
  const isOverdue = overdueWindows.some((window) => startTs >= window.startTs && endTs <= window.endTs);

  return {
    lineStyle: statusKey === "open" ? "solid" : "dashed",
    lineColor: isOverdue ? "red" : (statusKey === "open" ? "green" : "gray")
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

function resolveLifecycleStatusFromEvent(event = {}, fallbackStatus = "closed") {
  const eventType = normalizeId(event?.event_type).toLowerCase();
  if (["subject_rejected", "review_rejected", "subject_invalidated"].includes(eventType)) {
    return "closed_invalid";
  }
  if (eventType === "subject_closed") {
    return normalizeCloseStatus(event, fallbackStatus);
  }
  return "open";
}

function buildLifecycleSegments({
  subjectId = "",
  subjectCreatedTs,
  lifecycleEvents = [],
  endTs,
  fallbackClosedStatus = "closed"
} = {}) {
  const safeEndTs = Math.max(endTs, subjectCreatedTs);
  let state = "open";
  let currentStart = subjectCreatedTs;
  const segments = [];

  for (const event of lifecycleEvents) {
    const eventType = normalizeId(event?.event_type).toLowerCase();
    const eventTs = toTimestamp(event?.created_at, currentStart);
    const safeEventTs = Math.min(Math.max(eventTs, subjectCreatedTs), safeEndTs);

    if (eventType === "subject_reopened") {
      if (state !== "open" && safeEventTs > currentStart) {
        segments.push({
          subjectId,
          status: state,
          startAt: new Date(currentStart),
          endAt: new Date(safeEventTs)
        });
        state = "open";
        currentStart = safeEventTs;
      }
      continue;
    }

    if (!["subject_closed", "subject_rejected", "review_rejected", "subject_invalidated"].includes(eventType)) {
      continue;
    }

    if (state === "open" && safeEventTs > currentStart) {
      segments.push({
        subjectId,
        status: "open",
        startAt: new Date(currentStart),
        endAt: new Date(safeEventTs)
      });
      state = resolveLifecycleStatusFromEvent(event, fallbackClosedStatus);
      currentStart = safeEventTs;
    }
  }

  if (safeEndTs > currentStart) {
    segments.push({
      subjectId,
      status: state,
      startAt: new Date(currentStart),
      endAt: new Date(safeEndTs)
    });
  }

  return segments;
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
    const subjectTitle = String(subject?.title || subjectId || "Sujet");
    const subjectNumber = resolveSubjectDisplayIdentifier(subject, subjectId);
    const currentObjectiveIds = normalizeObjectiveIds(objectiveIdsBySubjectId[subjectId]);
    const currentObjectiveDates = resolveObjectiveDatesFromIds(currentObjectiveIds, objectivesById);
    const objectiveDates = currentObjectiveDates;
    const latestObjectiveTs = objectiveDates.length ? objectiveDates[objectiveDates.length - 1].dueDate.getTime() : null;

    const subjectHistoryKeys = resolveSubjectHistoryKeys(subject);
    const events = collectEventsForSubject(subjectHistoryEvents, subjectHistoryKeys)
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
    const pushStatusPoint = (ts, status, source, extra = {}) => {
      const safeTs = Math.max(subjectCreatedTs, ts);
      const safeStatus = normalizeStatus(status);
      statusPoints.push({
        at: new Date(safeTs),
        status: safeStatus,
        icon: extra.icon || toStatusIcon(safeStatus),
        source,
        contributesToLifecycle: extra.contributesToLifecycle !== false,
        hasBlockedIndicator: extra.hasBlockedIndicator === true,
        milestoneAction: extra.milestoneAction || "",
        markerColor: extra.markerColor || "",
        offsetIndex: Number.isInteger(extra.offsetIndex) ? extra.offsetIndex : undefined
      });
    };

    pushStatusPoint(subjectCreatedTs, "open", createdEvent ? "subject_created" : "subject_fallback_created_at");

    for (const event of events) {
      const ts = event.created_at.getTime();
      if (event.event_type === "subject_created") {
        continue;
      } else if (event.event_type === "subject_closed") {
        pushStatusPoint(ts, normalizeCloseStatus(event, subject.status), event.event_type);
      } else if (event.event_type === "subject_reopened") {
        pushStatusPoint(ts, "open", event.event_type);
      } else if (["subject_rejected", "review_rejected", "subject_invalidated"].includes(event.event_type)) {
        pushStatusPoint(ts, "closed_invalid", event.event_type);
      } else if (event.event_type === "subject_blocked_by_added") {
        const currentStatus = resolveStatusAtTimestamp(statusPoints, ts, fallbackStartStatus);
        pushStatusPoint(ts, currentStatus, event.event_type, {
          icon: "open",
          contributesToLifecycle: false,
          hasBlockedIndicator: true
        });
      } else if (event.event_type === "subject_objectives_changed") {
        const currentStatus = resolveStatusAtTimestamp(statusPoints, ts, fallbackStartStatus);
        const milestonePoints = resolveObjectiveMilestonePoints(event, ts, currentStatus);
        for (const point of milestonePoints) {
          pushStatusPoint(ts, point.status, point.source, {
            icon: point.icon,
            contributesToLifecycle: false,
            milestoneAction: point.milestoneAction,
            markerColor: point.markerColor,
            offsetIndex: point.offsetIndex
          });
        }
      }
    }

    statusPoints.sort((a, b) => a.at.getTime() - b.at.getTime());

    const lifecycleEvents = events.filter((event) => (
      ["subject_closed", "subject_reopened", "subject_rejected", "review_rejected", "subject_invalidated"].includes(event.event_type)
    ));
    const objectiveTimelineEvents = events
      .filter((event) => event.event_type === "subject_objectives_changed")
      .map((event) => {
        const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
        const delta = payload?.delta && typeof payload.delta === "object" ? payload.delta : {};
        return {
          atTs: event.created_at.getTime(),
          added: normalizeObjectiveIds(toObjectiveDeltaArray(delta.added)),
          removed: normalizeObjectiveIds(toObjectiveDeltaArray(delta.removed))
        };
      })
      .sort((a, b) => a.atTs - b.atTs);
    const rawSegments = buildLifecycleSegments({
      subjectId,
      subjectCreatedTs,
      lifecycleEvents,
      endTs,
      fallbackClosedStatus: subject.status
    });

    const finalSegment = rawSegments[rawSegments.length - 1] || null;
    const finalStatus = normalizeStatus(finalSegment?.status || fallbackStartStatus);
    const finalClosedTs = finalStatus === "open" ? null : (finalSegment?.startAt?.getTime?.() ?? null);
    const objectiveIdsFromHistory = objectiveTimelineEvents.flatMap((entry) => [...entry.added, ...entry.removed]);
    const candidateObjectiveIds = [...new Set([...currentObjectiveIds, ...objectiveIdsFromHistory])];
    const candidateObjectiveDates = resolveObjectiveDatesFromIds(candidateObjectiveIds, objectivesById);

    const isObjectiveAssignedAt = (objectiveId, targetTs) => {
      let assigned = currentObjectiveIds.includes(objectiveId);
      for (let index = objectiveTimelineEvents.length - 1; index >= 0; index -= 1) {
        const event = objectiveTimelineEvents[index];
        if (event.atTs <= targetTs) continue;
        const hasAdded = event.added.includes(objectiveId);
        const hasRemoved = event.removed.includes(objectiveId);
        if (hasAdded && !hasRemoved) assigned = false;
        else if (hasRemoved && !hasAdded) assigned = true;
      }
      return assigned;
    };

    const overdueWindows = candidateObjectiveDates
      .map((entry) => {
        const dueTs = entry.dueDate.getTime();
        let endTsForObjective = null;
        if (finalStatus === "open") {
          if (isObjectiveAssignedAt(entry.objectiveId, todayTs)) {
            endTsForObjective = todayTs;
          }
        } else if (Number.isFinite(finalClosedTs) && isObjectiveAssignedAt(entry.objectiveId, finalClosedTs)) {
          endTsForObjective = finalClosedTs;
        }
        if (!Number.isFinite(endTsForObjective) || endTsForObjective <= dueTs) return null;
        return { objectiveId: entry.objectiveId, startTs: dueTs, endTs: endTsForObjective };
      })
      .filter(Boolean);

    const splitBoundaries = [...new Set([
      ...objectiveDates.map((entry) => entry.dueDate.getTime()),
      ...overdueWindows.flatMap((window) => [window.startTs, window.endTs])
    ])];

    const lifecycleSegments = rawSegments
      .flatMap((segment) => splitSegmentByBoundaries(segment, splitBoundaries))
      .map((segment) => ({
        ...segment,
        ...resolveSegmentStyle({
          status: segment.status,
          startAt: segment.startAt,
          endAt: segment.endAt,
          overdueWindows
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
      subjectTitle,
      subjectNumber,
      statusPoints,
      lifecycleSegments,
      objectiveMarkers
    };
  });

  return { rows };
}

export function __trajectoryModelTestUtils() {
  return {
    buildLifecycleSegments,
    collectEventsForSubject,
    normalizeStatus,
    normalizeCloseStatus,
    resolveSubjectHistoryKeys,
    resolveLifecycleStatusFromEvent,
    resolveObjectiveDates: resolveObjectiveDatesFromIds,
    resolveStatusAtTimestamp,
    splitSegmentByObjectiveBoundaries: splitSegmentByBoundaries,
    resolveSegmentStyle
  };
}
