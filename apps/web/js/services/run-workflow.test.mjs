import test from "node:test";
import assert from "node:assert/strict";

import { NODE, buildRunGraph, formatStepDuration } from "./run-workflow.js";

const EXECUTION = {
  id: "run-1",
  name: "Analyse du suivi des avis",
  details: {
    corpus: {
      proposition: "#3 — Rapports d'étape SOCOTEC",
      documentCount: 17,
      avisCount: 41,
      trackedAvisCount: 23,
      guardViolationCount: 0,
      engineVersion: "ct-continuity/1",
      packs: ["socotec v3"],
      documents: ["RICT.pdf"]
    }
  }
};

test("le chemin va de la cause au suivi", () => {
  const chemin = buildRunGraph(EXECUTION).map((entry) => entry.id);

  assert.deepEqual(chemin, ["proposition", "corpus", "lecture", "avis", "suivi", "gardes"]);
});

test("une exécution lancée à la main n'invente pas de cause", () => {
  // « Déclenchement manuel » en boîte ferait croire à un maillon qui n'existe
  // pas : une main n'est pas une étape du calcul.
  const chemin = buildRunGraph({
    ...EXECUTION,
    details: { corpus: { ...EXECUTION.details.corpus, proposition: null } }
  }).map((entry) => entry.id);

  assert.deepEqual(chemin, ["corpus", "lecture", "avis", "suivi", "gardes"]);
});

test("aucun nœud n'est dessiné sans donnée", () => {
  // C'est la règle du fichier. Une étape verte avec une durée plausible ferait
  // un joli dessin qui ment — exactement ce qu'un journal ne doit pas faire.
  const chemin = buildRunGraph({
    id: "run-2",
    details: { corpus: { documentCount: 3, trackedAvisCount: 0, guardViolationCount: 0 } }
  }).map((entry) => entry.id);

  assert.deepEqual(chemin, ["corpus", "suivi", "gardes"], "ni lecture ni avis : rien n'en est connu");
});

test("l'absence de violation se dit, elle ne se tait pas", () => {
  const gardes = buildRunGraph(EXECUTION).at(-1);

  assert.equal(gardes.detail, "aucune violation");
  assert.equal(gardes.tone, NODE.OK);
});

test("une garde violée change le ton, pas seulement le texte", () => {
  const gardes = buildRunGraph({
    ...EXECUTION,
    details: { corpus: { ...EXECUTION.details.corpus, guardViolationCount: 2 } }
  }).at(-1);

  assert.equal(gardes.detail, "2 violation(s)");
  assert.equal(gardes.tone, NODE.WARN);
});

test("l'ancien pipeline dit le peu qu'il sait, sans le compléter", () => {
  const chemin = buildRunGraph({
    id: "run-3",
    name: "Analyse de document",
    documentName: "RICT.pdf",
    outcomeStatus: "error",
    summary: "extraction impossible"
  });

  assert.deepEqual(chemin.map((entry) => entry.id), ["document", "analyse", "resultat"]);
  assert.equal(chemin[2].tone, NODE.ERROR);
  assert.equal(chemin[2].detail, "extraction impossible");
});

test("sans exécution, il n'y a rien à dessiner", () => {
  assert.deepEqual(buildRunGraph({}), []);
});

test("une phase mesurée porte sa durée, les autres n'en inventent pas", () => {
  // Un chiffre plausible serait pire qu'une absence : on s'y fierait.
  const chemin = buildRunGraph({
    ...EXECUTION,
    details: {
      corpus: {
        ...EXECUTION.details.corpus,
        steps: [
          { id: "lecture", label: "Lecture", ms: 4200 },
          { id: "avis", label: "Avis relevés", ms: 310 }
        ]
      }
    }
  });

  const parId = Object.fromEntries(chemin.map((entry) => [entry.id, entry]));
  assert.equal(parId.lecture.duration, 4200);
  assert.equal(parId.avis.duration, 310);
  assert.equal(parId.corpus.duration, null, "non mesurée : pas de durée");
  assert.equal(parId.gardes.duration, null);
});

test("une durée se dit court", () => {
  assert.equal(formatStepDuration(320), "320 ms");
  assert.equal(formatStepDuration(4200), "4.2 s");
  assert.equal(formatStepDuration(45000), "45 s");
  assert.equal(formatStepDuration(90000), "1 min 30s");
  assert.equal(formatStepDuration(null), "");
});
