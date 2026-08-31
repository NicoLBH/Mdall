import test from "node:test";
import assert from "node:assert/strict";

import {
  FIGURE_AVIS_PREFIX,
  REPORTED,
  avisFromFigures,
  figureAvisKey,
  isFigureAvisKey,
  mergeAvis
} from "./avis-from-figures.js";
import { diffAvis } from "./proposition-review.js";

// Relevé sur les deux fiches réelles du projet ALTIMA : six lignes sur la
// première, trois sur la seconde, et une seule porte un numéro.
const figure = (patch = {}) => ({
  id: "fig-1",
  document_id: "doc-1",
  page: 1,
  rubric: "Fondations superficielles",
  avis_letter: "F",
  avis_reference: null,
  observation: null,
  sha256: "aaaaaaaaaaaabbbbbbbb",
  ...patch
});

test("une ligne avec sa lettre devient un avis", () => {
  const avis = avisFromFigures([figure()]);

  assert.equal(avis.length, 1);
  assert.equal(avis[0].title, "Fondations superficielles");
  assert.equal(avis[0].opinion_raw, "F");
  assert.equal(avis[0].status, REPORTED, "on constate, on ne traduit pas la lettre en état");
  assert.equal(avis[0].reference, null, "une ligne favorable n'a pas de numéro imprimé");
});

test("une image sans lettre ni numéro n'est pas un avis", () => {
  // Un plan de situation, une façade, un logo : en faire des avis remplirait la
  // mémoire du projet d'illustrations.
  assert.deepEqual(avisFromFigures([figure({ avis_letter: null, avis_reference: null })]), []);
});

test("une ligne numérotée garde son numéro comme identité", () => {
  const avis = avisFromFigures([figure({ avis_reference: "440", avis_letter: "D" })]);

  assert.equal(avis[0].key, "440", "le numéro du bureau de contrôle survit à un recalcul");
  assert.equal(avis[0].reference, "440");
  assert.equal(isFigureAvisKey(avis[0].key), false);
});

test("deux photos différentes sur le même intitulé et la même lettre font deux avis", () => {
  const avis = avisFromFigures([
    figure({ id: "a", sha256: "1111111111112222" }),
    figure({ id: "b", sha256: "3333333333334444" })
  ]);

  assert.equal(avis.length, 2, "ce que le document montre les distingue");
  assert.notEqual(avis[0].key, avis[1].key);
});

test("deux lectures du même rapport rendent les mêmes avis", () => {
  const premiere = avisFromFigures([figure()]);
  const seconde = avisFromFigures([figure({ id: "autre-id-de-ligne" })]);

  assert.deepEqual(
    premiere.map((entry) => entry.key),
    seconde.map((entry) => entry.key),
    "l'empreinte de l'image ne dépend pas de l'identifiant de la ligne en base"
  );
});

test("la même figure lue deux fois n'entre qu'une fois", () => {
  assert.equal(avisFromFigures([figure(), figure()]).length, 1);
});

test("sans empreinte, la ligne reste identifiable par sa place dans le document", () => {
  const avis = avisFromFigures([figure({ sha256: null })]);

  assert.equal(avis.length, 1, "une ligne qu'on ne sait pas rapprocher entre, plutôt que d'être oubliée");
  assert.ok(avis[0].key.startsWith(FIGURE_AVIS_PREFIX));
});

test("la clé d'une ligne sans numéro se reconnaît", () => {
  assert.equal(isFigureAvisKey(figureAvisKey(figure())), true);
  assert.equal(isFigureAvisKey("440"), false);
});

test("l'avis porte sa provenance : son document et sa page", () => {
  const avis = avisFromFigures([figure({ page: 3, document_id: "doc-9" })]);

  assert.equal(avis[0].sourceId, "doc-9");
  assert.equal(avis[0].page, 3);
});

test("l'observation de la ligne devient son extrait", () => {
  const avis = avisFromFigures([figure({ observation: "Absence de quelques U horizontaux" })]);
  assert.equal(avis[0].evidence, "Absence de quelques U horizontaux");
});

test("un avis relevé par le moteur n'est pas redoublé par sa photo", () => {
  const moteur = [{ reference: "440", title: "Systèmes constructifs:", status: "OPEN", opinion_raw: "D" }];
  const lignes = avisFromFigures([figure({ avis_reference: "440", avis_letter: "D" })]);

  const complet = mergeAvis(moteur, lignes);

  assert.equal(complet.length, 1, "la lecture du moteur prime : elle porte l'état");
  assert.equal(complet[0].status, "OPEN");
});

test("les lignes que le moteur n'a pas vues s'ajoutent après lui", () => {
  const moteur = [{ reference: "440", status: "OPEN", opinion_raw: "D" }];
  const complet = mergeAvis(moteur, avisFromFigures([figure()]));

  assert.equal(complet.length, 2);
  assert.equal(complet[0].reference, "440");
});

/* ── Ce que cela donne, bout en bout ─────────────────────────────────────── */

test("une ligne de fiche entre comme nouvel avis, puis n'y revient plus", () => {
  const lignes = avisFromFigures([figure()]);

  const premier = diffAvis([], lignes);
  assert.equal(premier.added.length, 1, "elle entre plutôt que d'être oubliée");

  // Une fois fusionnée, elle est ce que le projet tient pour vrai : la
  // relecture du même rapport ne doit plus la reproposer.
  const memoire = [{ external_reference: lignes[0].key, status: REPORTED, opinion_raw: "F" }];
  const second = diffAvis(memoire, lignes);

  assert.equal(second.added.length, 0);
  assert.equal(second.changed.length, 0);
  assert.equal(second.unchanged, 1);
});

test("une ligne dont la lettre change est un vrai changement", () => {
  const lignes = avisFromFigures([figure({ avis_letter: "D" })]);
  const memoire = [{ external_reference: lignes[0].key, status: REPORTED, opinion_raw: "F" }];

  const diff = diffAvis(memoire, lignes);
  assert.equal(diff.changed.length, 1);
  assert.equal(diff.changed[0].previousOpinion, "F");
});
