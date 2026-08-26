import test from "node:test";
import assert from "node:assert/strict";

import { createAbsenceIsNotAConclusion, runGuards } from "../lib/guards.mjs";
import { ctGuards, noMdallSubjectStatus, opinionMustComeFromSource, transitionMustCiteBothSides } from "./guards.mjs";

test("un statut de sujet Mdall dans une prédiction est une violation", () => {
  const issues = noMdallSubjectStatus.detect({
    predicted: [
      { key: "a", state: "PREDICTED", value: { state: "MATCHED" } },
      { key: "b", state: "PREDICTED", value: { subject_status: "closed" } },
      { key: "c", state: "PREDICTED", value: { status: "open" } }
    ]
  });

  assert.deepEqual(issues.map((issue) => issue.key), ["b", "c"]);
});

test("l'état de continuité MATCHED n'est pas confondu avec un statut Mdall", () => {
  const issues = noMdallSubjectStatus.detect({
    predicted: [{ key: "a", state: "PREDICTED", value: { state: "NOT_FOUND", opinion_change: null } }]
  });

  assert.deepEqual(issues, []);
});

test("un avis absent de l'extrait cité est un avis inventé", () => {
  const issues = opinionMustComeFromSource.detect({
    predicted: [
      {
        key: "fidele",
        kind: "extraction",
        state: "PREDICTED",
        value: { opinion_raw: "Défavorable" },
        provenance: { excerpt: "Avis n° 65 : Défavorable — texte." }
      },
      {
        key: "invente",
        kind: "extraction",
        state: "PREDICTED",
        value: { opinion_raw: "Favorable" },
        provenance: { excerpt: "Avis n° 65 : Défavorable — texte." }
      }
    ]
  });

  assert.deepEqual(issues.map((issue) => issue.key), ["invente"]);
});

test("un avis non reconnu (null) ne déclenche pas le garde-fou d'invention", () => {
  const issues = opinionMustComeFromSource.detect({
    predicted: [
      {
        key: "inconnu",
        kind: "extraction",
        state: "PREDICTED",
        value: { opinion_raw: null },
        provenance: { excerpt: "Avis n° 70 : Réservé au lot 04." }
      }
    ]
  });

  assert.deepEqual(issues, []);
});

test("une transition sans document précédent n'est pas vérifiable", () => {
  const issues = transitionMustCiteBothSides.detect({
    predicted: [
      { key: "nouveau", kind: "continuity", state: "PREDICTED", value: { state: "NEW", previous_document_id: null } },
      { key: "orphelin", kind: "continuity", state: "PREDICTED", value: { state: "MATCHED", previous_document_id: null } },
      { key: "complet", kind: "continuity", state: "PREDICTED", value: { state: "MATCHED", previous_document_id: "a" } }
    ]
  });

  assert.deepEqual(issues.map((issue) => issue.key), ["orphelin"]);
});

test("constater une absence est permis, en tirer une levée ne l'est pas", () => {
  const guard = createAbsenceIsNotAConclusion({ nonConclusiveStates: ["NOT_FOUND"] });
  const issues = guard.detect({
    predicted: [
      { key: "constat", state: "PREDICTED", derived_from_absence: true, value: { state: "NOT_FOUND" } },
      { key: "conclusion", state: "PREDICTED", derived_from_absence: true, value: { state: "CLOSED" } },
      { key: "levee", state: "PREDICTED", derived_from_absence: true, value: { state: "MATCHED" } }
    ]
  });

  assert.deepEqual(issues.map((issue) => issue.key), ["conclusion", "levee"]);
});

test("les garde-fous CT ne signalent rien sur des prédictions conformes", () => {
  const violations = runGuards(ctGuards, {
    predicted: [
      {
        key: "extraction:a:65",
        kind: "extraction",
        state: "PREDICTED",
        value: { opinion_raw: "Favorable" },
        provenance: { source_id: "a", excerpt: "Avis n° 65 : Favorable — texte." }
      },
      {
        key: "continuity:b:65",
        kind: "continuity",
        state: "PREDICTED",
        value: { state: "MATCHED", opinion_change: "UNCHANGED", previous_document_id: "a" }
      }
    ]
  });

  assert.deepEqual(violations, []);
});
