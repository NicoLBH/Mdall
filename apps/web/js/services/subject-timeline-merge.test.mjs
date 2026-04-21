import test from "node:test";
import assert from "node:assert/strict";

import { toTimelineRows } from "./subject-timeline-merge.js";

test("toTimelineRows fusionne les 3 flux avec tri chronologique global", () => {
  const rows = toTimelineRows(
    [{ id: "m1", created_at: "2026-06-15T10:00:00.000Z" }],
    [{ id: "e1", event_type: "message_posted", created_at: "2026-06-15T11:00:00.000Z" }],
    [{ id: "h1", event_type: "subject_labels_changed", created_at: "2026-06-15T10:30:00.000Z" }]
  );

  assert.deepEqual(rows.map((row) => row.kind), ["message", "business_event", "event"]);
  assert.equal(rows[0].message.id, "m1");
  assert.equal(rows[1].event.id, "h1");
  assert.equal(rows[2].event.id, "e1");
});

test("toTimelineRows conserve les événements conversationnels existants", () => {
  const rows = toTimelineRows(
    [],
    [{ id: "ev-conv", event_type: "message_posted", created_at: "2026-06-16T09:00:00.000Z" }],
    []
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "event");
  assert.equal(rows[0].event.event_type, "message_posted");
});
