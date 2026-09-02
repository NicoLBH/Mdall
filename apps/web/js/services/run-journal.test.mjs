/**
 * Le journal d'exécution : ce qu'il consigne, et ce qu'il refuse d'inventer.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  NIVEAU, STATUT, LIGNES_MAX,
  journal, numeroter, compterLignes, estGroupe,
  etapesDe, etapeDe, etapesConsultables, resumerEtape, marquerNonAtteintes
} from "./run-journal.js";

test("un carnet consigne dans l'ordre où on lui parle", () => {
  const j = journal();
  j.dire("douze livrables").avertir("un livrable écarté").echouer("un livrable illisible");
  assert.deepEqual(j.lignes(), [
    { texte: "douze livrables", niveau: NIVEAU.INFO },
    { texte: "un livrable écarté", niveau: NIVEAU.AVERTISSEMENT },
    { texte: "un livrable illisible", niveau: NIVEAU.ECHEC }
  ]);
});

test("une ligne vide n'est pas consignée : elle ne dirait rien", () => {
  const j = journal();
  j.dire("").dire("   ").dire(null);
  assert.deepEqual(j.lignes(), []);
});

test("un groupe prend le pire état de ce qu'il contient, quoi qu'on en dise", () => {
  const j = journal();
  j.groupe("R-118.pdf", (g) => { g.dire("34 pages"); g.echouer("non rapatrié"); });
  j.groupe("R-119.pdf", (g) => { g.dire("12 pages"); g.avertir("2 pages sans texte"); });
  j.groupe("R-120.pdf", (g) => { g.dire("8 pages"); });
  const [a, b, c] = j.lignes();
  assert.equal(a.statut, STATUT.ECHEC);
  assert.equal(b.statut, NIVEAU.AVERTISSEMENT);
  assert.equal(c.statut, STATUT.OK);
});

test("un journal ne fait jamais échouer ce qu'il observe", () => {
  const j = journal();
  assert.doesNotThrow(() => j.groupe("le groupe qui casse", () => { throw new Error("boum"); }));
  assert.equal(j.lignes().length, 1);
  assert.equal(j.lignes()[0].groupe, "le groupe qui casse");
});

test("la numérotation compte aussi les lignes repliées, et c'est le point", () => {
  const j = journal();
  j.dire("première");
  j.groupe("un groupe de trois", (g) => { g.dire("a"); g.dire("b"); g.dire("c"); });
  j.dire("après le groupe");

  const lignes = numeroter(j.lignes());
  assert.equal(lignes[0].numero, 1);
  assert.equal(lignes[1].numero, 2);
  assert.deepEqual(lignes[1].lignes.map((l) => l.numero), [3, 4, 5]);
  // Replié, l'écran saute de 2 à 6 : ce trou dit qu'il y a trois lignes dessous.
  assert.equal(lignes[2].numero, 6);
});

test("compterLignes compte le repli avec son en-tête", () => {
  const j = journal();
  j.dire("une");
  j.groupe("deux", (g) => { g.dire("a"); g.dire("b"); });
  assert.equal(compterLignes(j.lignes()), 4);
});

test("un journal trop long est tronqué, et le dit", () => {
  const j = journal();
  for (let i = 0; i < LIGNES_MAX + 50; i += 1) j.dire(`ligne ${i}`);
  const lignes = j.lignes();
  assert.equal(lignes.length, LIGNES_MAX + 1);
  assert.match(lignes.at(-1).texte, /tronqué/);
  assert.equal(lignes.at(-1).niveau, NIVEAU.AVERTISSEMENT);
});

test("estGroupe distingue un repli d'un fait", () => {
  assert.equal(estGroupe({ groupe: "x", lignes: [] }), true);
  assert.equal(estGroupe({ texte: "x" }), false);
  assert.equal(estGroupe(null), false);
});

const EXECUTION = {
  details: { corpus: { steps: [
    { id: "corpus", label: "Corpus relu", ms: 120, statut: "ok", lignes: [{ texte: "12 livrables", niveau: "info" }] },
    { id: "lecture", label: "Lecture", ms: 4200, statut: "ok", lignes: [
      { groupe: "R-118.pdf", statut: "ok", lignes: [{ texte: "34 pages", niveau: "info" }] }
    ] },
    { id: "avis", label: "Avis relevés", ms: 90, statut: "ok" },
    { id: "", label: "sans identifiant", ms: 1 }
  ] } }
};

test("une étape sans identifiant est écartée : on ne saurait ni la relier ni y revenir", () => {
  assert.deepEqual(etapesDe(EXECUTION).map((s) => s.id), ["corpus", "lecture", "avis"]);
});

test("seules les étapes qui ont tenu un journal sont consultables", () => {
  const ouvrables = etapesConsultables(EXECUTION);
  assert.equal(ouvrables.has("corpus"), true);
  assert.equal(ouvrables.has("lecture"), true);
  // « avis » a une durée mais aucun journal : son titre ne doit pas promettre
  // une page qui serait vide.
  assert.equal(ouvrables.has("avis"), false);
});

test("une étape se retrouve par son identifiant, et rien n'est approché", () => {
  assert.equal(etapeDe(EXECUTION, "lecture").label, "Lecture");
  assert.equal(etapeDe(EXECUTION, "lect"), null);
  assert.equal(etapeDe(EXECUTION, ""), null);
  assert.equal(etapeDe({}, "lecture"), null);
});

test("le résumé d'une étape compte les lignes, les alertes et les échecs", () => {
  const j = journal();
  j.dire("a");
  j.groupe("g", (g) => { g.dire("b"); g.avertir("c"); g.echouer("d"); });
  assert.deepEqual(resumerEtape({ lignes: j.lignes() }), { total: 5, avertissements: 1, echecs: 1 });
});

test("après un échec, les étapes suivantes sont dites non atteintes, pas réussies", () => {
  const marquees = marquerNonAtteintes([
    { id: "corpus", statut: STATUT.OK },
    { id: "lecture", statut: STATUT.ECHEC },
    { id: "avis", statut: STATUT.OK },
    { id: "suivi", statut: STATUT.OK }
  ]);
  assert.deepEqual(marquees.map((s) => s.statut),
    [STATUT.OK, STATUT.ECHEC, STATUT.NON_ATTEINTE, STATUT.NON_ATTEINTE]);
});

test("sans étapes conservées, tout rend du vide plutôt que des suppositions", () => {
  assert.deepEqual(etapesDe({}), []);
  assert.deepEqual(etapesDe(null), []);
  assert.equal(etapesConsultables({}).size, 0);
  assert.deepEqual(numeroter(null), []);
  assert.equal(compterLignes(undefined), 0);
});
