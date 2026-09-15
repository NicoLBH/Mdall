import test from "node:test";
import assert from "node:assert/strict";

import {
  chantiersDeCesSujets,
  identifiantsDesProjets,
  nomsDesProjets,
  nomsEcrits,
  phraseDesProjetsIncertains,
  projetsQuiRepondent
} from "./projets-du-filtre.js";

const BERTRAND = "11111111-1111-4111-8111-111111111111";
const NOVACLIM = "22222222-2222-4222-8222-222222222222";
const VERIFAS = "33333333-3333-4333-8333-333333333333";

const PROJETS = [
  { id: BERTRAND, name: "Résidence Bertrand" },
  { id: NOVACLIM, name: "Novaclim — chaufferie" },
  { id: VERIFAS, name: "Verifas Bertrand" }
];

/* ── Ce que la frappe propose ────────────────────────────────────────────── */

/**
 * **Ceux qui commencent par ce qu'on tape d'abord.** On tape le début d'un nom,
 * et voir « Résidence Bertrand » arriver après un chantier qui contient le mot
 * au milieu donne l'impression que la liste ne répond pas.
 */
test("ce qui commence par la frappe passe devant ce qui la contient", () => {
  // « Verifas » commence par « ver » ; « Résidence Bertrand » ne le contient
  // même pas — c'est donc sur un autre jeu qu'on lit l'ordre.
  const reponses = projetsQuiRepondent("nova", [
    { id: BERTRAND, name: "Rénovation Bertrand" },
    { id: NOVACLIM, name: "Novaclim — chaufferie" }
  ]).map((projet) => projet.id);

  assert.deepEqual(reponses, [NOVACLIM, BERTRAND], "celui qui commence d'abord, bien qu'il soit écrit second");
});

/** Et à égalité, l'ordre d'origine est conservé : rien n'est réordonné pour rien. */
test("deux chantiers qui commencent pareil gardent leur ordre", () => {
  const reponses = projetsQuiRepondent("ber", [
    { id: BERTRAND, name: "Bertrand A" },
    { id: NOVACLIM, name: "Bertrand B" }
  ]).map((projet) => projet.id);

  assert.deepEqual(reponses, [BERTRAND, NOVACLIM]);
});

test("une frappe vide propose tout : c'est l'ouverture du menu", () => {
  assert.equal(projetsQuiRepondent("", PROJETS).length, 3);
  assert.equal(projetsQuiRepondent("   ", PROJETS).length, 3);
});

/** On ne tape ni les accents ni la casse dans un champ de recherche. */
test("ni l'accent ni la casse n'empêchent de trouver", () => {
  assert.deepEqual(projetsQuiRepondent("RESIDENCE", PROJETS).map((p) => p.id), [BERTRAND]);
  assert.deepEqual(projetsQuiRepondent("résidence", PROJETS).map((p) => p.id), [BERTRAND]);
});

test("une frappe qui ne répond à rien propose une liste vide, pas tout", () => {
  assert.deepEqual(projetsQuiRepondent("zoiseau", PROJETS), []);
});

/* ── Ce que la saisie désigne ────────────────────────────────────────────── */

test("un nom écrit désigne son chantier", () => {
  const { ids, inconnus } = identifiantsDesProjets("Résidence Bertrand", PROJETS);

  assert.deepEqual(ids, [BERTRAND]);
  assert.deepEqual(inconnus, []);
});

test("plusieurs noms se séparent par des virgules", () => {
  const { ids } = identifiantsDesProjets("Résidence Bertrand, novaclim — chaufferie", PROJETS);

  assert.deepEqual(ids, [BERTRAND, NOVACLIM]);
});

/**
 * **Un nom qui ne désigne rien se dit.** Une faute de frappe donne un filtre
 * qui ne retient aucun sujet — et une situation vide se lit comme un chantier
 * sans travail, pas comme une erreur de saisie (règle 5).
 */
test("un nom qui ne désigne rien est rendu, pas avalé", () => {
  const { ids, inconnus } = identifiantsDesProjets("Résidence Bertrnad", PROJETS);

  assert.deepEqual(ids, []);
  assert.deepEqual(inconnus, ["Résidence Bertrnad"]);
});

/**
 * **Et un nom qui en désigne deux.** Choisir le premier serait un tirage au
 * sort silencieux : on filtrerait sur un chantier sans savoir lequel.
 */
test("un nom porté par deux chantiers ne se tranche pas tout seul", () => {
  const doublons = [
    { id: BERTRAND, name: "Résidence Bertrand" },
    { id: NOVACLIM, name: "Résidence Bertrand" }
  ];
  const { ids, ambigus } = identifiantsDesProjets("Résidence Bertrand", doublons);

  assert.deepEqual(ids, [], "rien n'est retenu au hasard");
  assert.deepEqual(ambigus, ["Résidence Bertrand"]);
});

/** Une requête copiée-collée porte des identifiants : elle doit survivre. */
test("un identifiant écrit tel quel est reconnu aussi", () => {
  assert.deepEqual(identifiantsDesProjets(BERTRAND, PROJETS).ids, [BERTRAND]);
});

test("le même chantier écrit deux fois ne pose pas deux conditions", () => {
  assert.deepEqual(identifiantsDesProjets("Résidence Bertrand, résidence bertrand", PROJETS).ids, [BERTRAND]);
});

/* ── Réécrire le champ ───────────────────────────────────────────────────── */

test("les identifiants se réécrivent en noms", () => {
  assert.equal(nomsDesProjets([BERTRAND, NOVACLIM], PROJETS), "Résidence Bertrand, Novaclim — chaufferie");
});

/**
 * **Un identifiant qu'on ne sait plus nommer reste écrit tel quel.** L'effacer
 * ferait disparaître du filtre une condition que personne n'a retirée, et la
 * situation changerait de contenu sans que rien ne le dise (règle 6).
 */
test("un chantier qu'on ne sait plus nommer ne disparaît pas du filtre", () => {
  assert.equal(nomsDesProjets([BERTRAND, "chantier-oublie"], PROJETS), "Résidence Bertrand, chantier-oublie");
});

/* ── Ce qu'on en dit ─────────────────────────────────────────────────────── */

test("l'incertitude se dit, et dit ce qu'elle coûte", () => {
  assert.match(phraseDesProjetsIncertains({ inconnus: ["Bertrnad"] }), /« Bertrnad » ne désigne aucun chantier/);
  assert.match(phraseDesProjetsIncertains({ ambigus: ["Résidence"] }), /en désigne plusieurs/);
  assert.match(phraseDesProjetsIncertains({ inconnus: ["a"], ambigus: ["b"] }), /n'est donc pas posé/);
});

test("quand tout est reconnu, il n'y a rien à dire", () => {
  assert.equal(phraseDesProjetsIncertains(), "");
  assert.equal(phraseDesProjetsIncertains({ inconnus: [], ambigus: [] }), "");
});

/* ── Les formes d'entrée ─────────────────────────────────────────────────── */

/** Le carnet range les noms en objet `{id: nom}` : les deux formes se lisent. */
test("les chantiers se lisent en liste comme en objet", () => {
  const enObjet = { [BERTRAND]: "Résidence Bertrand" };

  assert.deepEqual(identifiantsDesProjets("Résidence Bertrand", enObjet).ids, [BERTRAND]);
  assert.deepEqual(projetsQuiRepondent("rés", enObjet).map((p) => p.id), [BERTRAND]);
});

test("sans chantier connu, tout nom écrit est rendu comme inconnu", () => {
  const { ids, inconnus } = identifiantsDesProjets("Résidence Bertrand", []);

  assert.deepEqual(ids, []);
  assert.deepEqual(inconnus, ["Résidence Bertrand"], "et surtout pas un filtre vide silencieux");
});

test("un champ vide ne désigne rien et ne se plaint de rien", () => {
  assert.deepEqual(nomsEcrits(""), []);
  assert.deepEqual(nomsEcrits(" , ,  "), []);
  assert.deepEqual(identifiantsDesProjets("", PROJETS), { ids: [], inconnus: [], ambigus: [] });
});

/* ── Les chantiers présents dans une liste ───────────────────────────────── */

/**
 * **Pas ceux qu'on sait nommer : ceux qui sont là.** Proposer de filtrer sur un
 * chantier absent de la liste promet un résultat vide, et un filtre sans effet
 * fait chercher ce qu'on a mal tapé plutôt que ce qui n'est pas là.
 */
test("les chantiers proposés sont ceux que la liste contient", () => {
  const sujets = [
    { id: "s-1", project_id: BERTRAND },
    { id: "s-2", project_id: BERTRAND },
    { id: "s-3", project_id: NOVACLIM }
  ];

  assert.deepEqual(chantiersDeCesSujets(sujets, PROJETS), [
    { id: BERTRAND, name: "Résidence Bertrand" },
    { id: NOVACLIM, name: "Novaclim — chaufferie" }
  ]);
});

/**
 * Un chantier présent mais qu'on ne sait pas nommer se déclare quand même : le
 * taire retirerait de la liste des sujets qu'on ne pourrait plus atteindre.
 */
test("un chantier présent qu'on ne sait pas nommer se déclare sous son identifiant", () => {
  assert.deepEqual(
    chantiersDeCesSujets([{ id: "s-1", project_id: "chantier-oublie" }], PROJETS),
    [{ id: "chantier-oublie", name: "chantier-oublie" }]
  );
});

test("un sujet sans chantier n'en invente pas un", () => {
  assert.deepEqual(chantiersDeCesSujets([{ id: "s-1" }, { id: "s-2", project_id: "  " }], PROJETS), []);
  assert.deepEqual(chantiersDeCesSujets([], PROJETS), []);
  assert.deepEqual(chantiersDeCesSujets(), []);
});
