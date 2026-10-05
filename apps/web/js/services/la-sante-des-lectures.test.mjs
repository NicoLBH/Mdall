/**
 * L'épreuve de la santé des lectures.
 *
 * **La propriété qui compte : on ne confond pas trois choses.** « La lecture a
 * relevé vingt points », « elle a relevé zéro point » et « on n'a pas mesuré ce
 * qu'elle a relevé » appellent trois gestes différents, et `Number(null)` vaut
 * zéro — qui est fini. C'est le défaut que la règle 5 nomme, et celui qui rend
 * une console d'exploitation dangereuse : un chiffre faux y est pire que pas de
 * chiffre du tout.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_DIT_LE_STATUT, CE_QUE_LA_SANTE_NE_DIT_PAS, LA_FENETRE_EN_JOURS, LES_INDICATEURS,
  LES_FAMILLES_LUES, ceQueLaSanteDit, laFamilleDeLaSante, laFileDeLaSante,
  lesFamillesDeLaSante, lesProcedesDe
} from "./la-sante-des-lectures.js";
import { FAMILLE } from "./les-familles-de-document.js";

/** Ce que la porte rend, avec les noms qu'elle donne. */
const uneFamille = (surcharge = {}) => ({
  famille: FAMILLE.CR,
  lectures: 0, avecAnalyse: 0, avecReleve: 0, sansReleve: 0, releveInconnu: 0,
  documents: 0, derniere: "", procedes: [],
  ...surcharge
});

/* ── Les trois cas d'un relevé ────────────────────────────────────────────── */

/**
 * **Le cœur de ce module.** Trois lectures : une qui a relevé vingt points, une
 * qui n'a rien relevé, une dont on n'a pas mesuré le relevé. Le taux doit porter
 * sur **deux**, et non sur trois : la troisième n'a pas relevé zéro, on ne sait
 * pas ce qu'elle a relevé.
 */
test("ce qu'on n'a pas mesuré ne tombe pas dans le dénominateur", () => {
  const une = laFamilleDeLaSante(uneFamille({
    lectures: 3, avecAnalyse: 3, avecReleve: 1, sansReleve: 1, releveInconnu: 1
  }));

  const releve = une.indicateurs.find((un) => un.cle === "releve");
  assert.equal(releve.taux.part, 1);
  assert.equal(releve.taux.sur, 2, "la lecture non mesurée a été comptée comme un échec");
  assert.match(releve.taux.dit, /1\/2/);

  // Et elle se dit à part, pour qu'on ne la croie pas perdue.
  assert.equal(une.releveInconnu, 1);
});

/** Et quand rien n'est mesuré, il n'y a pas de taux — et non un taux de zéro. */
test("sans rien de mesuré, il n'y a pas de taux", () => {
  const une = laFamilleDeLaSante(uneFamille({
    lectures: 4, avecAnalyse: 4, avecReleve: 0, sansReleve: 0, releveInconnu: 4
  }));

  // `0/0` vaut NaN, et « NaN % » se lit comme un mauvais chiffre plutôt que
  // comme une absence de mesure.
  assert.equal(une.indicateurs.find((un) => un.cle === "releve").taux, null);
  // L'autre indicateur, lui, a son assiette : les quatre lectures existent.
  assert.equal(une.indicateurs.find((un) => un.cle === "analyse").taux.sur, 4);
});

/* ── L'analyse gelée ──────────────────────────────────────────────────────── */

/**
 * **Une lecture sans analyse gelée est le pire défaut qu'on puisse avoir sans le
 * voir** : le tableau annonce « analysé », on clique, il n'y a rien à rouvrir.
 */
test("les lectures qui n'ont rien rendu se comptent sur toutes les lectures", () => {
  const une = laFamilleDeLaSante(uneFamille({ lectures: 3, avecAnalyse: 2 }));
  const analyse = une.indicateurs.find((un) => un.cle === "analyse");

  assert.equal(analyse.taux.sur, 3, "l'assiette n'est pas le nombre de lectures");
  assert.equal(analyse.taux.part, 2);
  // Et la phrase dit le geste : c'est la fonction de bord qu'il faut regarder.
  assert.match(analyse.quandIlManque, /ne rouvrent\s+rien/);
});

/* ── Les procédés ─────────────────────────────────────────────────────────── */

/**
 * **Deux procédés en vie font deux états du système, et non une moyenne.** Le
 * plus récent n'est « l'état du système » que si c'est celui en service, et la
 * base ne le sait pas.
 */
test("chaque procédé porte sa part, et l'assiette est la famille", () => {
  const procedes = lesProcedesDe(uneFamille({
    lectures: 4,
    procedes: [{ procede: "A · v1", combien: 3 }, { procede: "B · v1", combien: 1 }]
  }));

  assert.deepEqual(procedes.map((un) => [un.procede, un.taux.dit]),
    [["A · v1", "3/4 (75 %)"], ["B · v1", "1/4 (25 %)"]]);
});

/** Un procédé sans nom se dit, plutôt que de s'afficher vide. */
test("un procédé que la base n'a pas nommé porte quand même un nom", () => {
  const [un] = lesProcedesDe(uneFamille({ procedes: [{ procede: "  ", combien: 2 }] }));
  assert.equal(un.procede, "procédé non dit");
});

/* ── Ce qu'on ne sait pas nommer ──────────────────────────────────────────── */

/**
 * **Une famille hors du registre ne se dessine pas.** Elle s'afficherait sous sa
 * clé brute — « rapports » au lieu de « Bureau de contrôle » —, et l'on croirait
 * à une famille nouvelle là où c'est une faute de frappe (règle 5).
 */
test("une famille que le registre ne connaît pas ne se dessine pas", () => {
  assert.equal(laFamilleDeLaSante(uneFamille({ famille: "des_plans" })), null);
  assert.equal(laFamilleDeLaSante(null), null);

  assert.deepEqual(
    lesFamillesDeLaSante({ familles: [uneFamille({ famille: "des_plans" })] }), []);
});

/**
 * **La copie des noms ne peut pas diverger du registre.**
 *
 * Ce module recopie les trois familles au lieu d'importer
 * `les-familles-de-document.js`, et ce n'est pas un oubli : ce registre nomme
 * `cr_lectures`, `fil_lectures` et `rapport_lectures` — les tables de contenu —,
 * et la console n'emporte aucun module qui les nomme. C'est la cloison qui
 * permet de dire qu'une console d'administration ne peut pas lire le chantier
 * de quelqu'un.
 *
 * Ce qui rend la copie tenable est **ici** : les deux listes se chargent
 * ensemble du côté du site, et se confrontent. Une famille ajoutée là-bas, un
 * nom changé, une icône renommée, et cette épreuve tombe.
 */
test("les trois familles recopiées sont exactement celles du registre", async () => {
  const { LES_FAMILLES, ceQueDitLaFamille } = await import("./les-familles-de-document.js");

  assert.deepEqual(
    LES_FAMILLES_LUES.map((une) => une.cle).slice().sort(),
    LES_FAMILLES.slice().sort(),
    "la santé des lectures ne nomme pas les mêmes familles que le registre");

  for (const une of LES_FAMILLES_LUES) {
    const ce = ceQueDitLaFamille(une.cle);
    assert.equal(une.nom, ce.nom, `« ${une.cle} » ne porte plus le nom du registre`);
    assert.equal(une.icone, ce.icone, `« ${une.cle} » ne porte plus l'icône du registre`);
  }

  // Et ce qui sort du module porte bien ces noms-là.
  const une = laFamilleDeLaSante(uneFamille({ famille: FAMILLE.CONTROLE, lectures: 1 }));
  assert.equal(une.nom, ceQueDitLaFamille(FAMILLE.CONTROLE).nom);
});

/**
 * **Et la cloison elle-même** : ce module ne doit tirer aucun registre de
 * lecture. L'épreuve lit ses imports, parce que c'est le seul endroit où ce
 * défaut se voit — tout marcherait, et la console emporterait simplement un
 * module de trop.
 */
test("la santé des lectures n'importe aucun registre de lecture", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(
    fileURLToPath(new URL("./la-sante-des-lectures.js", import.meta.url)), "utf8");

  const imports = [...source.matchAll(/^import .*? from "(.+?)";$/gm)].map((un) => un[1]);
  assert.ok(!imports.includes("./les-familles-de-document.js"),
    "le registre de lecture est revenu : la console emporterait les tables de contenu");
});

/* ── Les relectures ───────────────────────────────────────────────────────── */

/**
 * **Vingt lectures sur quatre documents n'est pas vingt lectures sur vingt
 * documents** : la première est un réglage de consigne en cours, la seconde un
 * chantier qui avance.
 */
test("les relectures se voient dans le nombre de documents", () => {
  const une = laFamilleDeLaSante(uneFamille({ lectures: 20, documents: 4 }));
  assert.match(une.dit, /20 lectures/);
  assert.match(une.surCombienDeDocuments, /sur 4 documents/);

  // Un fil n'est pas une ligne de Fichiers : compter ses documents rendrait
  // zéro, ce qui se lirait « aucun document lu ».
  const fil = laFamilleDeLaSante(uneFamille({ famille: FAMILLE.MAIL, lectures: 3 }));
  assert.equal(fil.surCombienDeDocuments, "");
});

/* ── La file ──────────────────────────────────────────────────────────────── */

/**
 * **Une lecture qui n'aboutit pas n'écrit rien** dans les trois tables : elle est
 * invisible aux taux ci-dessus, et c'est la file qui la porte.
 */
test("la file dit ce qui a abouti, et ce qui est encore en route", () => {
  const file = laFileDeLaSante({ files: [
    { geste: "comptes_rendus", statut: "fini", combien: 4 },
    { geste: "rapports", statut: "fini", combien: 2 },
    { geste: "comptes_rendus", statut: "echec", combien: 1 },
    { geste: "comptes_rendus", statut: "en_attente", combien: 3 }
  ] });

  // Les gestes se fondent : la question est « ce qui part arrive-t-il ? ».
  assert.equal(file.aboutissement.part, 6);
  /**
   * **Ce qui est en route sort du dénominateur.** Une ligne en attente n'a pas
   * échoué, elle n'a pas fini : la compter comme un échec ferait chuter le taux
   * à chaque lancement, et l'on chercherait une panne dans le travail en cours.
   */
  assert.equal(file.aboutissement.sur, 7);
  assert.equal(file.enRoute, 3);
});

/** Rien dans la file : pas de taux, et non un taux de zéro. */
test("une file vide ne rend pas un taux d'échec", () => {
  const file = laFileDeLaSante({ files: [] });
  assert.equal(file.aboutissement, null);
  assert.deepEqual(file.parStatut, []);
});

/** Un statut que Mdall ne nomme pas s'affiche, et dit qu'il ne se nomme pas. */
test("un statut inconnu ne disparaît pas et ne s'invente pas de nom", () => {
  const file = laFileDeLaSante({ files: [{ statut: "repris", combien: 2 }] });
  assert.equal(file.parStatut.length, 1);
  assert.match(file.parStatut[0].dit, /que Mdall ne nomme pas/);
  assert.equal(CE_QUE_DIT_LE_STATUT.repris, undefined);
});

/* ── La phrase de tête ────────────────────────────────────────────────────── */

/**
 * **Jamais un pourcentage global.** Les trois familles n'ont ni le même procédé,
 * ni la même difficulté : un taux unique les moyennerait et cacherait exactement
 * celle qui va mal.
 */
test("la phrase de tête ne rend aucun taux global", () => {
  const dit = ceQueLaSanteDit({ familles: [
    uneFamille({ lectures: 10, avecAnalyse: 2 }),
    uneFamille({ famille: FAMILLE.CONTROLE, lectures: 4, avecAnalyse: 4 })
  ] });

  assert.match(dit, /14 lectures/);
  assert.match(dit, /2 familles/);
  assert.doesNotMatch(dit, /%/, "la phrase de tête porte un taux global");
  assert.match(dit, /Chaque famille se lit séparément/);
});

/**
 * **« Rien n'a été lu » n'est pas un défaut**, et ne doit pas se lire comme une
 * panne : c'est qu'il ne s'est rien passé.
 */
test("aucune lecture ne se dit pas comme une panne", () => {
  for (const rien of [null, undefined, {}, { familles: [] }]) {
    const dit = ceQueLaSanteDit(rien);
    assert.match(dit, /Aucun document n'a été lu/);
    assert.match(dit, /Ce n'est pas un défaut/);
  }
});

/** La fenêtre est dite : « 14 lectures » ne se compare à rien sans elle. */
test("la phrase dit sur combien de jours elle compte", () => {
  assert.match(ceQueLaSanteDit({ familles: [uneFamille({ lectures: 1 })] }, 7),
    /sur les 7 derniers jours/);
  assert.match(ceQueLaSanteDit(null),
    new RegExp(`sur les ${LA_FENETRE_EN_JOURS} derniers jours`));
});

/* ── Ce que ces comptes ne disent pas ─────────────────────────────────────── */

/**
 * **Sans ce paragraphe, un écran vert se lit « les documents sont bien lus »**,
 * ce qu'aucun de ces nombres ne dit. Ils comptent ce qui est arrivé, pas ce qui
 * est juste — et c'est toute la différence entre cette page et un banc.
 */
test("la page dit qu'elle ne mesure pas la justesse", () => {
  const tout = CE_QUE_LA_SANTE_NE_DIT_PAS
    .map((un) => `${un.quoi} ${un.pourquoi}`).join(" ");

  assert.match(tout, /Si ce qui a été relevé est juste/);
  assert.match(tout, /jeu de référence/, "elle ne renvoie pas vers ce qui le mesure");
  assert.match(tout, /n'a jamais été lancé/);

  for (const un of CE_QUE_LA_SANTE_NE_DIT_PAS) {
    assert.ok(un.pourquoi.length > 40, `« ${un.quoi} » n'est pas expliqué`);
  }
});

/** Et chaque indicateur déclare ce qu'il ne voit pas, comme les outils de banc. */
test("chaque indicateur dit ce qu'il ne sait pas voir", () => {
  for (const un of LES_INDICATEURS) {
    assert.ok(un.aveugle?.length > 20, `${un.cle} ne dit pas ce qu'il ne voit pas`);
    assert.ok(un.question?.endsWith("?"), `${un.cle} ne porte pas de question`);
    assert.ok(un.quandTout && un.quandIlManque, `${un.cle} n'a pas ses deux phrases`);
  }
});
