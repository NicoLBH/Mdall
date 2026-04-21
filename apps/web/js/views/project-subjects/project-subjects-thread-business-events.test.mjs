import test from "node:test";
import assert from "node:assert/strict";

import {
  BUSINESS_ACTIVITY_CONFIG,
  buildBusinessActivitySummary,
  getBusinessActivityAppearance,
  mapBusinessEventRowToThreadActivity,
  summarizeCollectionChange
} from "./project-subjects-thread-business-events.js";

test("mapBusinessEventRowToThreadActivity mappe un événement subject_history", () => {
  const row = {
    id: "h1",
    subject_id: "s1",
    event_type: "subject_labels_changed",
    actor_label: "Jean Dupont",
    created_at: "2026-06-15T10:00:00.000Z",
    event_payload: {
      field: "labels",
      display: { result_label: "a retiré le label Structure" }
    }
  };

  const mapped = mapBusinessEventRowToThreadActivity(row);

  assert.equal(mapped.type, "ACTIVITY");
  assert.equal(mapped.kind, "subject_labels_changed");
  assert.equal(mapped.actor, "Jean Dupont");
  assert.equal(mapped.meta.source, "subject_history");
  assert.equal(mapped.message, "a retiré le label Structure");
});

test("summarizeCollectionChange produit des résumés intelligents", () => {
  assert.equal(
    summarizeCollectionChange({
      delta: { added: [{ label: "Jean Dupont" }], removed: [] }
    }, "assigné"),
    "a ajouté Jean Dupont"
  );

  assert.equal(
    summarizeCollectionChange({
      delta: { added: [], removed: [{ label: "Structure" }] }
    }, "label"),
    "a retiré Structure"
  );

  assert.equal(
    summarizeCollectionChange({
      delta: { added: [{ label: "A" }, { label: "B" }], removed: [{ label: "C" }] }
    }, "label"),
    "a mis à jour (+2 / -1 labels)"
  );
});

test("buildBusinessActivitySummary applique l'ordre de fallback", () => {
  const appearance = getBusinessActivityAppearance("subject_labels_changed");

  assert.equal(
    buildBusinessActivitySummary({
      payload: { display: { result_label: "a retiré le label Structure" } },
      appearance,
      fallbackMessage: "fallback"
    }),
    "a retiré le label Structure"
  );

  assert.equal(
    buildBusinessActivitySummary({
      payload: {
        delta: { added: [{ label: "Conformité" }], removed: [] }
      },
      appearance,
      fallbackMessage: "fallback"
    }),
    "a ajouté Conformité"
  );

  assert.equal(
    buildBusinessActivitySummary({
      payload: {},
      appearance,
      fallbackMessage: "fallback"
    }),
    "fallback"
  );
});

test("BUSINESS_ACTIVITY_CONFIG couvre les event_type métier attendus", () => {
  const expected = [
    "subject_title_updated",
    "subject_description_updated",
    "subject_assignees_changed",
    "subject_labels_changed",
    "subject_situations_changed",
    "subject_objectives_changed",
    "subject_parent_added",
    "subject_parent_removed",
    "subject_child_added",
    "subject_child_removed",
    "subject_blocked_by_added",
    "subject_blocked_by_removed",
    "subject_blocking_for_added",
    "subject_blocking_for_removed",
    "subject_closed",
    "subject_reopened"
  ];

  expected.forEach((eventType) => {
    assert.ok(BUSINESS_ACTIVITY_CONFIG[eventType], `missing config for ${eventType}`);
  });
});
