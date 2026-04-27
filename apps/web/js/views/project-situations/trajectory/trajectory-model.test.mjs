import test from "node:test";
import assert from "node:assert/strict";
import { buildTrajectoryModel, __trajectoryModelTestUtils } from "./trajectory-model.js";

test("buildTrajectoryModel construit les segments open/closed avant et après objectif", () => {
  const result = buildTrajectoryModel({
    subjects: [
      {
        id: "s-1",
        created_at: "2026-01-01T00:00:00.000Z",
        status: "open"
      }
    ],
    subjectHistoryEvents: {
      "s-1": [
        { subject_id: "s-1", event_type: "subject_created", created_at: "2026-01-01T00:00:00.000Z" },
        { subject_id: "s-1", event_type: "subject_closed", created_at: "2026-01-03T00:00:00.000Z", payload: { closed_status: "closed" } },
        { subject_id: "s-1", event_type: "subject_reopened", created_at: "2026-01-07T00:00:00.000Z" }
      ]
    },
    objectivesById: {
      "o-1": { id: "o-1", due_date: "2026-01-05T00:00:00.000Z" }
    },
    objectiveIdsBySubjectId: {
      "s-1": ["o-1"]
    },
    projectStartDate: "2025-12-01T00:00:00.000Z",
    today: "2026-01-10T00:00:00.000Z"
  });

  assert.equal(result.rows.length, 1);
  const [row] = result.rows;
  assert.equal(row.subjectId, "s-1");

  assert.deepEqual(
    row.lifecycleSegments.map((segment) => ({
      start: segment.startAt.toISOString(),
      end: segment.endAt.toISOString(),
      color: segment.lineColor,
      style: segment.lineStyle
    })),
    [
      {
        start: "2026-01-01T00:00:00.000Z",
        end: "2026-01-03T00:00:00.000Z",
        color: "green",
        style: "solid"
      },
      {
        start: "2026-01-03T00:00:00.000Z",
        end: "2026-01-05T00:00:00.000Z",
        color: "gray",
        style: "dashed"
      },
      {
        start: "2026-01-05T00:00:00.000Z",
        end: "2026-01-07T00:00:00.000Z",
        color: "red",
        style: "dashed"
      },
      {
        start: "2026-01-07T00:00:00.000Z",
        end: "2026-01-10T00:00:00.000Z",
        color: "red",
        style: "solid"
      }
    ]
  );

  assert.deepEqual(
    row.objectiveMarkers.map((marker) => ({
      at: marker.at.toISOString(),
      type: marker.markerType,
      color: marker.markerColor
    })),
    [
      {
        at: "2026-01-05T00:00:00.000Z",
        type: "check",
        color: "green"
      }
    ]
  );
});

test("buildTrajectoryModel utilise subject.created_at si subject_created absent et prolonge jusqu'à objectif futur", () => {
  const result = buildTrajectoryModel({
    subjects: [
      {
        id: "s-2",
        created_at: "2026-01-01T00:00:00.000Z",
        status: "open"
      }
    ],
    subjectHistoryEvents: {
      "s-2": []
    },
    objectivesById: {
      "o-future": { id: "o-future", due_date: "2026-03-01T00:00:00.000Z" }
    },
    objectiveIdsBySubjectId: {
      "s-2": ["o-future"]
    },
    today: "2026-01-15T00:00:00.000Z"
  });

  const [row] = result.rows;
  assert.equal(row.lifecycleSegments.length, 1);
  assert.equal(row.lifecycleSegments[0].lineColor, "green");
  assert.equal(row.lifecycleSegments[0].lineStyle, "solid");
  assert.equal(row.lifecycleSegments[0].endAt.toISOString(), "2026-03-01T00:00:00.000Z");

  assert.equal(row.objectiveMarkers[0].markerType, "cross");
  assert.equal(row.objectiveMarkers[0].markerColor, "red");
});

test("normalizeCloseStatus remonte closed_invalid et closed_duplicate depuis le payload", () => {
  const { normalizeCloseStatus } = __trajectoryModelTestUtils();
  assert.equal(normalizeCloseStatus({ payload: { closed_status: "invalid" } }), "closed_invalid");
  assert.equal(normalizeCloseStatus({ payload: { status: "closed_duplicate" } }), "closed_duplicate");
  assert.equal(normalizeCloseStatus({ payload: {} }), "closed");
});

test("buildTrajectoryModel crée toujours un premier point open depuis subject.created_at sans subject_created", () => {
  const result = buildTrajectoryModel({
    subjects: [
      {
        id: "s-no-created-event",
        created_at: "2026-01-01T00:00:00.000Z",
        status: "closed"
      }
    ],
    subjectHistoryEvents: {
      "s-no-created-event": []
    },
    today: "2026-01-02T00:00:00.000Z"
  });

  const [row] = result.rows;
  assert.equal(row.statusPoints[0].status, "open");
  assert.equal(row.statusPoints[0].icon, "open");
  assert.equal(row.statusPoints[0].source, "subject_fallback_created_at");
  assert.equal(row.statusPoints[0].at.toISOString(), "2026-01-01T00:00:00.000Z");
});

test("buildTrajectoryModel rend un segment red dashed après objectif quand le sujet est fermé après objectif", () => {
  const result = buildTrajectoryModel({
    subjects: [
      {
        id: "s-after-objective-close",
        created_at: "2026-01-01T00:00:00.000Z",
        status: "closed"
      }
    ],
    subjectHistoryEvents: {
      "s-after-objective-close": [
        { subject_id: "s-after-objective-close", event_type: "subject_created", created_at: "2026-01-01T00:00:00.000Z" },
        { subject_id: "s-after-objective-close", event_type: "subject_reopened", created_at: "2026-01-07T00:00:00.000Z" },
        { subject_id: "s-after-objective-close", event_type: "subject_closed", created_at: "2026-01-08T00:00:00.000Z", payload: { closed_status: "closed" } }
      ]
    },
    objectivesById: {
      "o-1": { id: "o-1", due_date: "2026-01-05T00:00:00.000Z" }
    },
    objectiveIdsBySubjectId: {
      "s-after-objective-close": ["o-1"]
    },
    today: "2026-01-10T00:00:00.000Z"
  });

  const [row] = result.rows;
  const redDashedSegment = row.lifecycleSegments.find((segment) => segment.startAt.toISOString() === "2026-01-08T00:00:00.000Z");
  assert.ok(redDashedSegment);
  assert.equal(redDashedSegment.lineColor, "red");
  assert.equal(redDashedSegment.lineStyle, "dashed");
});

test("buildTrajectoryModel mappe les événements de rejet vers closed_invalid/reject", () => {
  const result = buildTrajectoryModel({
    subjects: [
      {
        id: "s-reject-event",
        created_at: "2026-01-01T00:00:00.000Z",
        status: "open"
      }
    ],
    subjectHistoryEvents: {
      "s-reject-event": [
        { subject_id: "s-reject-event", event_type: "subject_created", created_at: "2026-01-01T00:00:00.000Z" },
        { subject_id: "s-reject-event", event_type: "subject_rejected", created_at: "2026-01-03T00:00:00.000Z" }
      ]
    },
    today: "2026-01-05T00:00:00.000Z"
  });

  const [row] = result.rows;
  const rejectPoint = row.statusPoints.find((point) => point.source === "subject_rejected");
  assert.ok(rejectPoint);
  assert.equal(rejectPoint.status, "closed_invalid");
  assert.equal(rejectPoint.icon, "reject");
});
