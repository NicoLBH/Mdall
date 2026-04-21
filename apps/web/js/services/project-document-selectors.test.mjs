import test from "node:test";
import assert from "node:assert/strict";

import { getSelectionDocumentRefs } from "./project-document-selectors.js";
import { store } from "../store.js";

test("document refs: conserve les refs multiples et garde un fallback quand docs non hydratés", () => {
  store.projectDocuments = {
    items: [
      { id: "doc-1", name: "Document 1", phaseCode: "APS", phaseLabel: "Avant Projet Sommaire" }
    ],
    activeDocumentId: null,
    lastAnalysisDocumentIds: []
  };

  const refs = getSelectionDocumentRefs({
    item: {
      id: "subject-1",
      document_id: "doc-1",
      document_ref_ids: ["doc-2", "doc-1"],
      raw: {
        document_ref_ids: ["doc-3"],
        document_id: "doc-1"
      }
    }
  });

  assert.equal(refs.length, 3);
  assert.deepEqual(refs.map((ref) => ref.id), ["doc-2", "doc-1", "doc-3"]);
  assert.equal(refs.find((ref) => ref.id === "doc-1")?.name, "Document 1");
  assert.equal(refs.find((ref) => ref.id === "doc-2")?.name, "doc-2");
  assert.equal(refs.find((ref) => ref.id === "doc-3")?.name, "doc-3");
});
