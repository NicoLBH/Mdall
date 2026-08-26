import test from "node:test";
import assert from "node:assert/strict";

import { OUTCOME, REASON } from "../lib/metrics.mjs";
import { countsForKind, createProvenanceChecker, falseClosures, falseMerges } from "./metrics.mjs";

const SOURCES = [
  {
    source_id: "rapport-a",
    content_available: true,
    content: "Page de garde.\nAvis n° 65 : Défavorable — texte.",
    pages: [
      { page: 1, text: "Page de garde." },
      { page: 2, text: "Avis n° 65 : Défavorable — texte." }
    ]
  },
  {
    source_id: "sans-pagination",
    content_available: true,
    content: "Avis n° 66 : Favorable — texte.",
    pages: null
  },
  { source_id: "sans-texte", content_available: false, content: null, pages: null }
];

test("countsForKind sépare extraction et continuité, et compte WRONG_VALUE des deux côtés", () => {
  const outcomes = [
    { outcome: OUTCOME.TRUE_POSITIVE, reason: REASON.MATCHED, expected: { kind: "extraction" }, predicted: { kind: "extraction" } },
    { outcome: OUTCOME.FALSE_POSITIVE, reason: REASON.WRONG_VALUE, expected: { kind: "extraction" }, predicted: { kind: "extraction" } },
    { outcome: OUTCOME.FALSE_NEGATIVE, reason: REASON.MISSED, expected: { kind: "continuity" }, predicted: null },
    { outcome: OUTCOME.TRUE_POSITIVE, reason: REASON.MATCHED, expected: { kind: "continuity" }, predicted: { kind: "continuity" } }
  ];

  assert.deepEqual(countsForKind(outcomes, "extraction"), {
    truePositives: 1,
    falsePositives: 1,
    falseNegatives: 1
  });
  assert.deepEqual(countsForKind(outcomes, "continuity"), {
    truePositives: 1,
    falsePositives: 0,
    falseNegatives: 1
  });
});

test("falseMerges repère un MATCHED affirmé là où la ground truth dit NEW", () => {
  const merges = falseMerges([
    {
      key: "continuity:rapport-c:6S",
      expected: { kind: "continuity", value: { state: "NEW" } },
      predicted: { kind: "continuity", value: { state: "MATCHED", previous_document_id: "rapport-a" } }
    },
    {
      key: "continuity:rapport-b:65",
      expected: { kind: "continuity", value: { state: "MATCHED" } },
      predicted: { kind: "continuity", value: { state: "MATCHED" } }
    }
  ]);

  assert.deepEqual(merges.map((outcome) => outcome.key), ["continuity:rapport-c:6S"]);
});

test("falseClosures repère toute conclusion positive tirée d'une absence", () => {
  const closures = falseClosures([
    { key: "constat", derived_from_absence: true, value: { state: "NOT_FOUND" } },
    { key: "levee", derived_from_absence: true, value: { state: "MATCHED" } },
    { key: "cloture", value: { state: "CLOSED" } },
    { key: "normal", value: { state: "MATCHED" } }
  ]);

  assert.deepEqual(closures.map((prediction) => prediction.key), ["levee", "cloture"]);
});

test("la provenance est fausse si l'extrait n'est pas dans la page citée", () => {
  const check = createProvenanceChecker(SOURCES);

  assert.equal(
    check({ predicted: { provenance: { source_id: "rapport-a", page: 2, excerpt: "Avis n° 65 : Défavorable — texte." } } }),
    true
  );
  assert.equal(
    check({ predicted: { provenance: { source_id: "rapport-a", page: 1, excerpt: "Avis n° 65 : Défavorable — texte." } } }),
    false,
    "bonne source, mauvaise page"
  );
  assert.equal(
    check({ predicted: { provenance: { source_id: "rapport-a", page: 2, excerpt: "Avis n° 65 : Favorable — texte." } } }),
    false,
    "extrait inventé"
  );
});

test("la provenance est fausse si la page est connaissable et non renseignée", () => {
  const check = createProvenanceChecker(SOURCES);

  assert.equal(
    check({ predicted: { provenance: { source_id: "rapport-a", page: null, excerpt: "Avis n° 65 : Défavorable — texte." } } }),
    false
  );
  assert.equal(
    check({ predicted: { provenance: { source_id: "sans-pagination", page: null, excerpt: "Avis n° 66 : Favorable — texte." } } }),
    true,
    "sans pagination disponible, la page ne peut pas être exigée"
  );
});

test("la provenance est fausse sans source, sans extrait ou vers une source inconnue", () => {
  const check = createProvenanceChecker(SOURCES);

  assert.equal(check({ predicted: { provenance: null } }), false);
  assert.equal(check({ predicted: { provenance: { source_id: "inconnu", excerpt: "x" } } }), false);
  assert.equal(check({ predicted: { provenance: { source_id: "rapport-a", page: 2, excerpt: "" } } }), false);
});

test("rien à vérifier renvoie null, et n'entre donc pas dans le dénominateur", () => {
  const check = createProvenanceChecker(SOURCES);

  assert.equal(check({ predicted: null }), null);
  assert.equal(check({ predicted: { provenance: { source_id: "sans-texte", excerpt: "x" } } }), null);
});
