import test from "node:test";
import assert from "node:assert/strict";

import { AVIS_STATUS, RESOLUTION_REASON, countByStatus, summariseAvisStatus } from "./status.mjs";

const DOCUMENTS = [
  { source_id: "r1", issued_at: "2024-01-10" },
  { source_id: "r2", issued_at: "2024-06-10" },
  { source_id: "r3", issued_at: "2025-01-10" }
];

function continuity(documentId, reference, value, extra = {}) {
  return { key: `continuity:${documentId}:${reference}`, kind: "continuity", state: "PREDICTED", value, ...extra };
}

test("un avis encore listé reste ouvert, avec son ancienneté", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "56", { state: "NEW" }),
      continuity("r3", "56", { state: "MATCHED", previous_document_id: "r1" })
    ],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.OPEN);
  assert.equal(summary.raised_in, "r1");
  assert.equal(summary.raised_at, "2024-01-10");
  assert.equal(summary.age_days, 366);
});

test("un avis déclaré levé est résolu, et cite sa preuve", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "57", { state: "NEW" }),
      continuity("r2", "57", { state: "NOT_FOUND", previous_document_id: "r1" }, {
        lifting_statement: { sentence: "L'avis 57 est levé.", source_page: 4, source_document_id: "r2" }
      })
    ],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.RESOLVED);
  assert.equal(summary.resolution_reason, RESOLUTION_REASON.DECLARED_LIFTED);
  assert.match(summary.evidence.sentence, /L'avis 57 est levé/);
});

test("un avis repassé favorable est résolu, sans qu'aucune phrase ne le déclare", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "146", { state: "NEW" }),
      continuity("r2", "146", { state: "MATCHED_BY_TITLE", previous_document_id: "r1" }, {
        matched_opinion_raw: "F"
      })
    ],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.RESOLVED);
  assert.equal(summary.resolution_reason, RESOLUTION_REASON.BACK_TO_FAVOURABLE);
});

test("un avis disparu sans explication n'est ni ouvert ni levé", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "62", { state: "NEW" }),
      continuity("r2", "62", { state: "NOT_FOUND", previous_document_id: "r1" })
    ],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.NO_NEWS, "l'absence ne vaut pas clôture");
  assert.equal(summary.resolution_reason, null);
  assert.equal(summary.last_seen_document_id, "r1");
});

test("les avis sont classés : ouverts d'abord, puis sans nouvelles, puis résolus", () => {
  const summaries = summariseAvisStatus(
    [
      continuity("r1", "1", { state: "NEW" }),
      continuity("r2", "1", { state: "NOT_FOUND", previous_document_id: "r1" }),
      continuity("r1", "2", { state: "NEW" }),
      continuity("r3", "2", { state: "MATCHED", previous_document_id: "r1" }),
      continuity("r1", "3", { state: "NEW" }),
      continuity("r2", "3", { state: "NOT_FOUND", previous_document_id: "r1" }, {
        lifting_statement: { sentence: "L'avis 3 est levé." }
      })
    ],
    DOCUMENTS
  );

  assert.deepEqual(summaries.map((summary) => summary.status), [
    AVIS_STATUS.OPEN,
    AVIS_STATUS.NO_NEWS,
    AVIS_STATUS.RESOLVED
  ]);
  assert.deepEqual(countByStatus(summaries), { OPEN: 1, RESOLVED: 1, NO_NEWS: 1 });
});

test("les documents hors de la chronologie retenue sont ignorés", () => {
  const summaries = summariseAvisStatus(
    [continuity("r1", "9", { state: "NEW" }), continuity("hors-lot", "9", { state: "MATCHED" })],
    DOCUMENTS
  );

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].last_document_id, "r1");
});
