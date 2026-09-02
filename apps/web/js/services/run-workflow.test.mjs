import test from "node:test";
import assert from "node:assert/strict";

import { NODE, buildRunGraph, describeReadingStack, formatStepDuration } from "./run-workflow.js";

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

test("la boîte « Lecture » ne répète pas un pack par livrable", () => {
  // Relevé sur une exécution réelle : dix fiches SOCOTEC donnaient
  // « socotec v1 · socotec v1 · … ». La boîte dit avec quoi on a lu, pas
  // combien de fois on s'en est servi.
  const nodes = buildRunGraph({
    details: {
      corpus: {
        documentCount: 10,
        engineVersion: "ct-lab v3",
        packs: ["socotec v1", "socotec v1", "socotec v1", "apave v2"],
        trackedAvisCount: 4
      }
    }
  });

  const lecture = nodes.find((entry) => entry.id === "lecture");
  assert.equal(lecture.detail, "ct-lab v3 · socotec v1 · apave v2");
});

test("« Lu par » nomme chaque pack une seule fois, où qu'on le lise", () => {
  // Les packs sont relevés par livrable. La même jointure était recopiée à
  // trois endroits — le graphe, le détail d'une exécution, l'analyse d'une
  // proposition — et deux d'entre eux répétaient « socotec v1 ».
  assert.equal(
    describeReadingStack("ct-lab v3", ["socotec v1", "socotec v1", "apave v2", "socotec v1"]),
    "ct-lab v3 · socotec v1 · apave v2"
  );
});

test("sans moteur ni pack, « Lu par » ne dit rien plutôt que de dire du vide", () => {
  assert.equal(describeReadingStack(null, []), "");
  assert.equal(describeReadingStack("", ["  ", null]), "");
});

test("un moteur seul se dit seul", () => {
  assert.equal(describeReadingStack("ct-lab v3"), "ct-lab v3");
});

test("une étape conservée pour son journal n'affiche pas « 0 ms »", () => {
  // Elle n'a pas été chronométrée : lui prêter une durée nulle la ferait
  // passer pour instantanée, ce qui est une affirmation, pas une absence.
  const graphe = buildRunGraph({
    details: { corpus: { documentCount: 2, trackedAvisCount: 3, guardViolationCount: 0,
      steps: [
        { id: "corpus", label: "Corpus relu", ms: 120 },
        { id: "gardes", label: "Gardes", ms: null, lignes: [{ texte: "aucune violation" }] }
      ] } }
  });
  const parId = Object.fromEntries(graphe.map((n) => [n.id, n]));
  assert.equal(parId.corpus.duration, 120);
  assert.equal(parId.gardes.duration, null);
});
