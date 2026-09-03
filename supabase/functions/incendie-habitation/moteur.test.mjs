/**
 * Le moteur : ce qu'il conclut, ce qu'il refuse de conclure, et pourquoi.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { evaluerCondition, evaluerModule, grapheDu, ordonner, raisonner, VRAI, FAUX, INCONNU } from "./moteur.js";

const source = { nature: "reglement", article: "3", citation: "…" };

test("une condition vaut vrai, faux, ou « je ne sais pas »", () => {
  const condition = { nature: "individuelle", etages: { auPlus: 1 } };
  assert.equal(evaluerCondition(condition, { nature: "individuelle", etages: 1 }).etat, VRAI);
  assert.equal(evaluerCondition(condition, { nature: "collective", etages: 1 }).etat, FAUX);
  assert.equal(evaluerCondition(condition, { nature: "individuelle" }).etat, INCONNU);
});

test("un « faux » certain clôt le débat, un « inconnu » réclame tout ce qui manque", () => {
  // Ne pas s'arrêter au premier manque : sinon le questionnaire se déroulerait
  // une question à la fois, chacune rouvrant la suivante.
  const { etat, manque } = evaluerCondition({ a: 1, b: 2, c: 3 }, { a: 1 });
  assert.equal(etat, INCONNU);
  assert.deepEqual(manque, ["b", "c"]);
  assert.deepEqual(evaluerCondition({ a: 1, b: 2 }, { a: 9 }), { etat: FAUX, manque: [] });
});

test("une comparaison numérique sur ce qui n'est pas un nombre ne devient pas fausse", () => {
  // La dire fausse ferait basculer une règle sur une saisie mal typée.
  assert.equal(evaluerCondition({ h: { auPlus: 28 } }, { h: "environ trente" }).etat, INCONNU);
  assert.equal(evaluerCondition({ h: { auPlus: 28 } }, { h: "27,5" }).etat, VRAI);
});

test("« renseigne » se prononce sur l'absence elle-même", () => {
  assert.equal(evaluerCondition({ x: { renseigne: true } }, {}).etat, FAUX);
  assert.equal(evaluerCondition({ x: { renseigne: true } }, { x: "quoi que ce soit" }).etat, VRAI);
  assert.equal(evaluerCondition({ x: { renseigne: false } }, {}).etat, VRAI);
});

test("une appartenance se lit comme le texte l'écrit", () => {
  assert.equal(evaluerCondition({ i: ["isolee", "jumelee"] }, { i: "jumelee" }).etat, VRAI);
  assert.equal(evaluerCondition({ i: ["isolee", "jumelee"] }, { i: "bande" }).etat, FAUX);
});

test("un opérateur inconnu échoue plutôt que de passer pour vrai", () => {
  assert.throws(() => evaluerCondition({ x: { aPeuPres: 3 } }, { x: 3 }), /Opérateur de condition inconnu/);
});

/* ── L'ordre des règles ──────────────────────────────────────────────────── */

const familles = {
  id: "f", titre: "Famille", produit: "famille",
  regles: [
    { si: { nature: "individuelle", etages: { auPlus: 1 } }, alors: { valeur: "1" }, source },
    { si: { nature: "individuelle" }, alors: { valeur: "2" }, source },
    { si: { nature: "collective" }, alors: { valeur: "3" }, source }
  ]
};

test("la première règle qui mord l'emporte, comme dans le texte", () => {
  assert.equal(evaluerModule(familles, { nature: "individuelle", etages: 1 }).valeur, "1");
  assert.equal(evaluerModule(familles, { nature: "individuelle", etages: 4 }).valeur, "2");
});

test("une règle antérieure encore indécise empêche de conclure", () => {
  // La deuxième règle est vraie, mais la première pourrait l'être aussi : on ne
  // sait pas combien d'étages. Conclure serait tirer à pile ou face.
  const issue = evaluerModule(familles, { nature: "individuelle" });
  assert.equal(issue.statut, "en attente");
  assert.deepEqual(issue.manque, ["etages"]);
});

test("mais si toutes les branches en lice disent la même chose, on ne demande rien", () => {
  // Poser une question dont les deux réponses mènent au même degré coupe-feu
  // allonge le questionnaire sans rien apprendre à personne.
  const convergent = {
    id: "c", titre: "C", produit: "cf",
    regles: [
      { si: { sousSol: true }, alors: { valeur: "CF 1/2 h" }, source },
      { si: { sousSol: false }, alors: { valeur: "CF 1/2 h" }, source }
    ]
  };
  const issue = evaluerModule(convergent, {});
  assert.equal(issue.statut, "conclu");
  assert.equal(issue.valeur, "CF 1/2 h");
  assert.equal(issue.convergent, true);
  assert.equal(issue.sourcesConvergentes, undefined);   // c'est `sources` qui les porte
  assert.equal(issue.sources.length, 2);
});

test("des branches qui divergent, elles, se font poser la question", () => {
  const divergent = {
    id: "d", titre: "D", produit: "cf",
    regles: [
      { si: { sousSol: true }, alors: { valeur: "CF 1/4 h" }, source },
      { si: { sousSol: false }, alors: { valeur: null, sansObjet: "rien" }, source }
    ]
  };
  assert.equal(evaluerModule(divergent, {}).statut, "en attente");
});

test("aucune règle ne vise ce cas : c'est un silence du texte, pas un manque", () => {
  const issue = evaluerModule({ id: "s", titre: "S", produit: "x", silence: "Rien ne vise ce cas.",
    regles: [{ si: { a: 1 }, alors: { valeur: "oui" }, source }] }, { a: 2 });
  assert.equal(issue.statut, "conclu");
  assert.equal(issue.valeur, null);
  assert.match(issue.sansObjet, /Rien ne vise/);
});

test("une valeur peut se reprendre d'un autre fait, éventuellement diminuée", () => {
  const repris = {
    id: "r", titre: "R", produit: "retenus",
    regles: [
      { si: { duplex: true }, alors: { valeur: { fait: "etages", moins: 1 } }, source },
      { si: { duplex: false }, alors: { valeur: { fait: "etages" } }, source }
    ]
  };
  assert.equal(evaluerModule(repris, { duplex: true, etages: 4 }).valeur, 3);
  assert.equal(evaluerModule(repris, { duplex: false, etages: 4 }).valeur, 4);
  // Le fait repris manque : on attend, on n'invente pas un zéro.
  assert.equal(evaluerModule(repris, { duplex: true }).statut, "en attente");
});

/* ── Le graphe ───────────────────────────────────────────────────────────── */

const petitCorpus = [
  { id: "a", titre: "A", produit: "a", source: { article: "1" },
    regles: [{ si: { question1: true }, alors: { valeur: "A!" }, source }] },
  { id: "b", titre: "B", produit: "b", source: { article: "2" },
    regles: [{ si: { a: "A!", question2: 3 }, alors: { valeur: "B!" }, source }] }
];

test("les questions source sont les faits que personne ne produit", () => {
  const g = grapheDu(petitCorpus);
  assert.deepEqual(g.questionsSource, ["question1", "question2"]);
  assert.deepEqual(g.liens, [{ de: "a", vers: "b", fait: "a" }]);
});

test("les modules se résolvent dans l'ordre des dépendances", () => {
  assert.deepEqual(ordonner([petitCorpus[1], petitCorpus[0]]).map((m) => m.id), ["a", "b"]);
});

test("un corpus circulaire échoue plutôt que de tourner en rond", () => {
  const boucle = [
    { id: "a", titre: "A", produit: "a", regles: [{ si: { b: 1 }, alors: { valeur: 1 }, source }] },
    { id: "b", titre: "B", produit: "b", regles: [{ si: { a: 1 }, alors: { valeur: 1 }, source }] }
  ];
  assert.throws(() => ordonner(boucle), /circulaire/);
});

test("ce qu'un module conclut devient un fait pour les suivants", () => {
  const { faits } = raisonner(petitCorpus, { question1: true, question2: 3 });
  assert.equal(faits.a, "A!");
  assert.equal(faits.b, "B!");
});

test("une réponse donnée à la main l'emporte sur la déduction", () => {
  // Sur un cas d'espèce — terrain en forte pente, déclassement municipal —
  // c'est l'humain qui tranche, et l'utilitaire lui laisse la main.
  const { faits } = raisonner(petitCorpus, { question1: true, a: "imposé", question2: 3 });
  assert.equal(faits.a, "imposé");
});
