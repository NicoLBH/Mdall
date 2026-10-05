/**
 * L'épreuve des quatre crans.
 *
 * ## Ce qu'elle cherche
 *
 * Pas que les phrases soient jolies. Trois choses, et chacune a un défaut
 * précis en face :
 *
 * 1. **Une règle versée n'a pas de nature** et porte le `kind` d'une donnée de
 *    base. Classée par sa nature, elle tomberait au cran 1 — c'est le défaut
 *    exact que `estUneRegle` a été écrite pour réparer ailleurs, et il
 *    reviendrait ici.
 * 2. **Un cran vide doit rester dans la liste.** Un écran à trois crans sur
 *    quatre se lit « le quatrième va de soi ».
 * 3. **Un chemin va d'une conclusion à une autre.** Si une entrée de donnée
 *    comptait comme amont, toute fonction aurait autant de chemins qu'elle a
 *    d'entrées, et la liste dirait « tout dépend de tout ».
 *
 * ## Les fixtures ont la forme que `blocsDeLaProposition` rend
 *
 * `{cle, sujet, nature, regle, lit, produit, lignes, sansBloc}`. `lit` et
 * `produit` viennent de `lecturesDeLaRegle` et `sortiesDeLaFonction` — les
 * mêmes que le graphe de la mémoire —, et l'épreuve les passe par elles pour
 * ne pas recopier leur résultat à la main.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CRAN, LES_CRANS, ceQuUnBlocRelie, ceQueLaTraductionDit, leCranDit, leCranDunBloc,
  lesBlocsParCran, lesCheminsEntreBlocs
} from "./les-crans-de-la-traduction.js";
import { NATURE } from "./assertion-taxonomy.js";

/** Un bloc, tel que l'écrivain le rend. */
const unBloc = (cle, { sujet = cle, nature = "", regle = false, lit = [], produit = [],
  lignes = [{ nature: "affirmation", jetons: [] }], sansBloc = "" } = {}) =>
  ({ cle, sujet, nature, regle, lit, produit, lignes, sansBloc });

/** Une affirmation de règle, dans la forme que la mémoire conserve. */
const uneRegle = (sujet, lit = []) => ({
  subject_key: `regle:${sujet}`,
  payload: {
    subject: sujet, value: "x", referentiel: true,
    regle: { conditions: lit.map((nom) => ({ sujet: nom, operateur: "=", valeur: ["y"] })) }
  }
});

/* ── Le cran d'un bloc ────────────────────────────────────────────────────── */

test("une règle versée va au cran des fonctions, et non à celui des données", () => {
  // Elle n'a pas de nature, et son `kind` est celui d'une donnée de base : la
  // classer par sa nature la rangerait au cran 1, sous « ce que ce document
  // affirme », alors qu'elle n'affirme rien — elle déduit.
  assert.equal(leCranDunBloc(unBloc("r", { regle: true })), CRAN.FONCTION);
  assert.equal(leCranDunBloc(unBloc("r", { regle: true, nature: NATURE.DONNEE_BASE })),
    CRAN.FONCTION, "la nature a gagné sur `estUneRegle` : l'ordre des tests est inversé");
});

test("les quatre natures de valeur vont au cran des données", () => {
  for (const nature of [NATURE.CONSTAT, NATURE.DONNEE_BASE, NATURE.HYPOTHESE, NATURE.DECISION]) {
    assert.equal(leCranDunBloc(unBloc("a", { nature })), CRAN.DONNEE, nature);
  }
});

test("une contrainte a son cran à elle", () => {
  // La frontière du métier : si je ne suis pas d'accord, ai-je un recours ?
  // Non → elle s'impose du dehors, et ce n'est pas une donnée du projet.
  assert.equal(leCranDunBloc(unBloc("c", { nature: NATURE.CONTRAINTE })), CRAN.CONTRAINTE);
});

test("un raisonnement est une fonction, pas une donnée", () => {
  assert.equal(leCranDunBloc(unBloc("ra", { nature: NATURE.RAISONNEMENT })), CRAN.FONCTION);
});

test("l'intendance n'a pas de cran, et n'en prend pas un par défaut", () => {
  // Un document qui entre au corpus n'affirme rien sur l'ouvrage. Le ranger
  // dans les données ferait compter un mouvement de suivi comme une valeur.
  assert.equal(leCranDunBloc(unBloc("i", { nature: NATURE.INTENDANCE })), "");
});

test("un bloc sans code n'a pas de cran", () => {
  // Un retrait retire, un refus ne verse pas : leur donner un cran les ferait
  // compter dans un groupe qui annonce ce que la mémoire écrira.
  for (const sansBloc of ["retrait", "refusee", "rien"]) {
    assert.equal(leCranDunBloc(unBloc("x", { nature: NATURE.CONSTAT, sansBloc })), "");
  }
});

test("une nature inconnue ne se range pas d'office dans les données", () => {
  // Un écran complet et faux est pire qu'un écran incomplet : on lirait « ce
  // document affirme ceci » d'une ligne dont personne ne sait ce qu'elle est.
  assert.equal(leCranDunBloc(unBloc("?", { nature: "une-nature-quon-na-pas-ecrite" })), "");
  assert.equal(leCranDunBloc(unBloc("?")), "");
});

test("à défaut de nature, une ligne de code `regle` suffit", () => {
  // Le dernier recours, et volontairement le dernier : il lit le rendu, là où
  // les autres lisent la charge.
  assert.equal(
    leCranDunBloc(unBloc("r", { lignes: [{ nature: "regle" }, { nature: "detail" }] })),
    CRAN.FONCTION);
});

test("rien d'illisible ne fait tomber le classement", () => {
  for (const rien of [null, undefined, "", 0, [], "un bloc"]) {
    assert.equal(leCranDunBloc(rien), "");
  }
});

/* ── Les groupes ──────────────────────────────────────────────────────────── */

test("les trois crans sont dans la liste, même vides", () => {
  const { groupes } = lesBlocsParCran([unBloc("a", { nature: NATURE.CONSTAT })]);

  assert.equal(groupes.length, 3, "le cran des chemins groupe des blocs : il se lit entre eux");
  assert.deepEqual(groupes.map((un) => un.cle), [CRAN.DONNEE, CRAN.CONTRAINTE, CRAN.FONCTION]);
  assert.deepEqual(groupes.map((un) => un.estVide), [false, true, true]);
});

/**
 * **Le drapeau n'écrase pas la phrase**, et c'est un défaut qu'on a eu.
 *
 * `vide` porte la phrase qui dit ce que l'absence du cran veut dire. Le groupe
 * y écrivait un booléen : le module rendait un objet parfaitement valide, toutes
 * ses épreuves passaient, et l'écran affichait « true » à la place de la phrase.
 * Rien ne tombait ici — c'est l'épreuve du panneau qui l'a vu, au premier rendu.
 */
test("un cran vide garde sa phrase à côté de son drapeau", () => {
  const { groupes } = lesBlocsParCran([]);
  for (const un of groupes) {
    assert.equal(un.estVide, true);
    assert.equal(typeof un.vide, "string",
      "le drapeau a écrasé la phrase : l'écran affichera « true »");
    assert.ok(un.vide.length > 30);
  }
});

test("chaque cran déclare sa question, sa phrase de vide, et d'où il vient", () => {
  // Sans la phrase de vide, grouper ne ferait que déplacer des cartes.
  for (const un of LES_CRANS) {
    assert.ok(un.vide?.length > 30, `${un.cle} ne dit pas ce que son absence veut dire`);
    assert.ok(un.question?.endsWith("?"), `${un.cle} ne porte pas de question`);
    assert.ok(un.dou?.length > 30, `${un.cle} ne dit pas d'où il vient`);
  }
});

test("les blocs sans cran sortent à part, et ne se fondent pas", () => {
  const { groupes, sansCran } = lesBlocsParCran([
    unBloc("a", { nature: NATURE.CONSTAT }),
    unBloc("i", { nature: NATURE.INTENDANCE }),
    unBloc("x", { nature: NATURE.CONSTAT, sansBloc: "retrait" })
  ]);

  assert.equal(groupes.find((un) => un.cle === CRAN.DONNEE).blocs.length, 1,
    "un bloc sans cran est compté dans un groupe qui annonce autre chose que lui");
  assert.equal(sansCran.length, 2);
});

test("l'ordre des crans est celui de la chaîne", () => {
  // Sans donnée, rien à contraindre ; sans contrainte, aucune fonction ; sans
  // fonctions, aucun chemin. Un cran lu avant le précédent ne veut rien dire.
  assert.deepEqual(LES_CRANS.map((un) => un.rang), [1, 2, 3, 4]);
  assert.deepEqual(LES_CRANS.map((un) => un.cle),
    [CRAN.DONNEE, CRAN.CONTRAINTE, CRAN.FONCTION, CRAN.CHEMIN]);
});

/* ── Ce qu'un bloc relie ──────────────────────────────────────────────────── */

test("ce qu'un bloc lit et produit vient du graphe de la mémoire", () => {
  // Pas d'un second calcul : il aurait dessiné, sur l'écran de la proposition,
  // une chaîne que la Mémoire ne montre pas — et c'est la pire divergence,
  // parce qu'elle porte sur ce qui entraîne quoi.
  const relie = ceQuUnBlocRelie(uneRegle("Famille du bâtiment", ["Hauteur", "Logements"]));
  assert.deepEqual(relie.lit, ["Hauteur", "Logements"]);
  assert.deepEqual(relie.produit, ["Famille du bâtiment"]);
});

test("rien d'illisible ne fait tomber ce qu'un bloc relie", () => {
  for (const rien of [null, undefined, "", 0, "une affirmation"]) {
    assert.deepEqual(ceQuUnBlocRelie(rien), { lit: [], produit: [] });
  }
});

/* ── Le cran 4 : les chemins ──────────────────────────────────────────────── */

test("un chemin relie deux fonctions par le nom que l'une conclut", () => {
  const amont = ceQuUnBlocRelie(uneRegle("Famille du bâtiment", ["Hauteur"]));
  const aval = ceQuUnBlocRelie(uneRegle("Colonne sèche", ["Famille du bâtiment"]));

  const chemins = lesCheminsEntreBlocs([
    unBloc("f1", { sujet: "Famille du bâtiment", regle: true, ...amont }),
    unBloc("f2", { sujet: "Colonne sèche", regle: true, ...aval })
  ]);

  assert.equal(chemins.length, 1);
  assert.equal(chemins[0].par, "Famille du bâtiment");
  assert.equal(chemins[0].amont.sujet, "Famille du bâtiment");
  assert.equal(chemins[0].aval.sujet, "Colonne sèche");
  // La phrase est dans le module : c'est elle qui fait du chemin un
  // raisonnement lisible plutôt qu'une flèche.
  assert.equal(chemins[0].dit,
    "« Colonne sèche » emploie « Famille du bâtiment », que « Famille du bâtiment » conclut.");
});

test("une donnée lue par une fonction n'est pas un chemin", () => {
  // Sinon toute fonction aurait autant de chemins qu'elle a d'entrées, et la
  // liste dirait « tout dépend de tout » — ce qui ne se lit pas.
  const chemins = lesCheminsEntreBlocs([
    unBloc("a", { sujet: "Hauteur", nature: NATURE.DONNEE_BASE, produit: ["Hauteur"] }),
    unBloc("f", { sujet: "Famille du bâtiment", regle: true,
      lit: ["Hauteur"], produit: ["Famille du bâtiment"] })
  ]);
  assert.deepEqual(chemins, []);
});

test("une fonction ne fait pas chemin avec elle-même", () => {
  // Un nom lu et produit par la même fonction est presque toujours une
  // homonymie de sujets ; ce serait affiché comme un raisonnement circulaire.
  const chemins = lesCheminsEntreBlocs([
    unBloc("f", { sujet: "Hauteur", regle: true, lit: ["Hauteur"], produit: ["Hauteur"] })
  ]);
  assert.deepEqual(chemins, []);
});

test("le même chemin ne se compte pas deux fois", () => {
  const chemins = lesCheminsEntreBlocs([
    unBloc("f1", { sujet: "A", regle: true, produit: ["A", "A"] }),
    unBloc("f2", { sujet: "B", regle: true, lit: ["A", "A"], produit: ["B"] })
  ]);
  assert.equal(chemins.length, 1, "un chemin dit « emploie », pas « combien de fois »");
});

test("une chaîne de trois fonctions donne deux chemins", () => {
  const chemins = lesCheminsEntreBlocs([
    unBloc("f1", { sujet: "A", regle: true, lit: ["Hauteur"], produit: ["A"] }),
    unBloc("f2", { sujet: "B", regle: true, lit: ["A"], produit: ["B"] }),
    unBloc("f3", { sujet: "C", regle: true, lit: ["B"], produit: ["C"] })
  ]);
  assert.equal(chemins.length, 2);
  assert.deepEqual(chemins.map((un) => un.par).sort(), ["A", "B"]);
});

/* ── La phrase du haut ────────────────────────────────────────────────────── */

test("la phrase compte par cran, et nomme ceux qui sont vides", () => {
  const dit = ceQueLaTraductionDit([
    unBloc("a1", { nature: NATURE.CONSTAT }),
    unBloc("a2", { nature: NATURE.CONSTAT })
  ]);
  assert.match(dit, /2 données/);
  assert.match(dit, /Aucune contrainte, aucune fonction/);
  assert.match(dit, /n'en porte pas/);
});

test("douze données sans fonction ne se disent pas comme quatre fonctions", () => {
  // « 12 blocs » seul ne dit pas ce qui a été compris : les deux lectures sont
  // opposées, et c'est tout ce qu'on voudrait savoir.
  const douze = ceQueLaTraductionDit(
    Array.from({ length: 12 }, (un, rang) => unBloc(`a${rang}`, { nature: NATURE.CONSTAT })));
  assert.match(douze, /12 données/);
  assert.match(douze, /Aucun chemin entre fonctions/);

  const quatre = ceQueLaTraductionDit([
    unBloc("f1", { sujet: "A", regle: true, produit: ["A"] }),
    unBloc("f2", { sujet: "B", regle: true, lit: ["A"], produit: ["B"] })
  ]);
  assert.match(quatre, /2 fonctions/);
  assert.match(quatre, /1 chemin entre fonctions/);
  assert.doesNotMatch(quatre, /chemins/, "le singulier n'est pas accordé");
});

test("rien de transcrit se dit, et ne se tait pas", () => {
  const dit = ceQueLaTraductionDit([]);
  assert.match(dit, /Rien n'a été transcrit/);
  assert.match(dit, /que la lecture ait su isoler/);
});

test("les blocs sans cran se comptent dans la phrase", () => {
  const dit = ceQueLaTraductionDit([
    unBloc("a", { nature: NATURE.CONSTAT }),
    unBloc("i", { nature: NATURE.INTENDANCE })
  ]);
  assert.match(dit, /1 bloc dont le cran n'est pas déterminé/);
  // Et pas de `${}` resté dans une chaîne simple.
  assert.doesNotMatch(dit, /\$\{/, "une interpolation est écrite dans une chaîne non modelée");
});

test("un cran inconnu ne se dessine pas", () => {
  assert.equal(leCranDit("un-cran-quon-na-pas-ecrit"), null);
  assert.equal(leCranDit(""), null);
  assert.equal(leCranDit(CRAN.CHEMIN).rang, 4);
});
