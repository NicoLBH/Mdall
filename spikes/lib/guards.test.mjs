import test from "node:test";
import assert from "node:assert/strict";

import {
  absenceIsNotAConclusion,
  commonGuards,
  createAmbiguityNotPresentedAsCertain,
  excerptMustExistInSource,
  provenanceRequired,
  runGuards
} from "./guards.mjs";

const SOURCES = [
  {
    source_id: "doc-a",
    content_available: true,
    content: "ITEM 65 : défavorable — note de calcul non conforme.\nITEM 66 : favorable."
  },
  { source_id: "doc-pdf", content_available: false, content: null }
];

test("provenanceRequired signale une affirmation sans provenance exploitable", () => {
  const issues = provenanceRequired.detect({
    predicted: [
      { key: "sans-provenance", state: "PREDICTED", value: { x: 1 } },
      { key: "provenance-partielle", state: "PREDICTED", value: { x: 1 }, provenance: { source_id: "doc-a" } },
      {
        key: "complete",
        state: "PREDICTED",
        value: { x: 1 },
        provenance: { source_id: "doc-a", excerpt: "ITEM 66 : favorable." }
      }
    ]
  });

  assert.deepEqual(issues.map((issue) => issue.key), ["sans-provenance", "provenance-partielle"]);
  assert.match(issues[1].message, /excerpt/);
});

test("provenanceRequired n'exige rien d'une abstention", () => {
  const issues = provenanceRequired.detect({
    predicted: [{ key: "ambigu", state: "AMBIGUOUS" }]
  });

  assert.deepEqual(issues, []);
});

test("excerptMustExistInSource attrape une citation inventée", () => {
  const issues = excerptMustExistInSource.detect({
    sources: SOURCES,
    predicted: [
      {
        key: "vrai",
        state: "PREDICTED",
        provenance: { source_id: "doc-a", excerpt: "ITEM 66 :   favorable." }
      },
      {
        key: "invente",
        state: "PREDICTED",
        provenance: { source_id: "doc-a", excerpt: "ITEM 66 : favorable sous réserve du PV" }
      },
      {
        key: "source-inconnue",
        state: "PREDICTED",
        provenance: { source_id: "doc-z", excerpt: "peu importe" }
      }
    ]
  });

  assert.deepEqual(issues.map((issue) => issue.key), ["invente", "source-inconnue"]);
});

test("excerptMustExistInSource ne juge pas une source dont le contenu n'est pas disponible", () => {
  const issues = excerptMustExistInSource.detect({
    sources: SOURCES,
    predicted: [{ key: "pdf", state: "PREDICTED", provenance: { source_id: "doc-pdf", excerpt: "quelque chose" } }]
  });

  assert.deepEqual(issues, []);
});

test("absenceIsNotAConclusion attrape une clôture déduite d'une absence", () => {
  const issues = absenceIsNotAConclusion.detect({
    predicted: [
      { key: "levee-deduite", state: "PREDICTED", value: { statut: "levé" }, derived_from_absence: true },
      { key: "absence-signalee", state: "AMBIGUOUS", derived_from_absence: true },
      { key: "normal", state: "PREDICTED", value: { statut: "favorable" } }
    ]
  });

  assert.deepEqual(issues.map((issue) => issue.key), ["levee-deduite"]);
});

test("createAmbiguityNotPresentedAsCertain attrape candidats multiples et confiance basse", () => {
  const guard = createAmbiguityNotPresentedAsCertain({ assertionThreshold: 0.6 });
  const issues = guard.detect({
    predicted: [
      { key: "deux-candidats", state: "PREDICTED", confidence: 0.95, candidates: [{ a: 1 }, { b: 2 }] },
      { key: "confiance-basse", state: "PREDICTED", confidence: 0.4 },
      { key: "ok", state: "PREDICTED", confidence: 0.8 },
      { key: "abstenu", state: "AMBIGUOUS", confidence: 0.1 }
    ]
  });

  assert.deepEqual(issues.map((issue) => issue.key), ["deux-candidats", "confiance-basse"]);
});

test("runGuards agrège les violations en les rattachant à leur garde-fou", () => {
  const violations = runGuards(commonGuards, {
    sources: SOURCES,
    predicted: [{ key: "faute", state: "PREDICTED", value: { x: 1 }, derived_from_absence: true }]
  });

  const ids = violations.map((violation) => violation.guard_id).sort();
  assert.deepEqual(ids, ["absence_is_not_a_conclusion", "provenance_required"]);
  assert.ok(violations.every((violation) => violation.guard_label && violation.message));
});

test("runGuards ne renvoie rien quand tout est conforme", () => {
  const violations = runGuards(commonGuards, {
    sources: SOURCES,
    predicted: [
      {
        key: "propre",
        state: "PREDICTED",
        value: { statut: "favorable" },
        provenance: { source_id: "doc-a", excerpt: "ITEM 66 : favorable." }
      }
    ]
  });

  assert.deepEqual(violations, []);
});
