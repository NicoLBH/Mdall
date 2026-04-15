import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeAssigneeIds,
  resolveSubjectAssigneeIds,
  findCollaboratorByAssigneeId
} from "./subject-assignees-service.js";

test("normalizeAssigneeIds déduplique et nettoie les identifiants", () => {
  assert.deepEqual(
    normalizeAssigneeIds(["  abc ", "", null, "abc", " def "]),
    ["abc", "def"]
  );
});

test("resolveSubjectAssigneeIds priorise la méta si présente, même vide", () => {
  assert.deepEqual(
    resolveSubjectAssigneeIds({
      subjectMetaAssignees: [],
      assigneeMap: { "s1": ["p1"] },
      subjectId: "s1",
      subject: { assignee_person_id: "p2" }
    }),
    []
  );
});

test("resolveSubjectAssigneeIds retombe sur la map puis sur le primaire du sujet", () => {
  assert.deepEqual(
    resolveSubjectAssigneeIds({
      subjectMetaAssignees: undefined,
      assigneeMap: { "s1": ["p1", "p2"] },
      subjectId: "s1",
      subject: { assignee_person_id: "p3" }
    }),
    ["p1", "p2"]
  );

  assert.deepEqual(
    resolveSubjectAssigneeIds({
      subjectMetaAssignees: undefined,
      assigneeMap: {},
      subjectId: "s1",
      subject: { assignee_person_id: "p3" }
    }),
    ["p3"]
  );
});

test("findCollaboratorByAssigneeId lit une clé nettoyée", () => {
  const byId = new Map([["p1", { id: "p1", name: "Alice" }]]);
  assert.deepEqual(findCollaboratorByAssigneeId(byId, " p1 "), { id: "p1", name: "Alice" });
  assert.equal(findCollaboratorByAssigneeId(byId, "p2"), null);
});
