/**
 * Ce qu'une étude de fondations propose — trois lignes, et pas quatre-vingts.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  affirmationsDeLEtude, entreesVersables, fonctionVersable, resultatVersable,
  tableauDesEntrees, tableauDuResultat, phraseDuResultat, verdictDe, ecrire
} from "./fondations-versement.js";
import { applicationsDeLaMemoire } from "./memoire-applications.js";
import { planDeRecalcul, NOEUD, natureDuNoeud, sortiesDesRegles } from "./memoire-plan.js";
import { cerveauDuProjet } from "./memoire-cerveau.js";
import { evaluerLaRegle, rejouerLaRegle, DOUTE, VERDICT } from "./memoire-evaluateur.js";
import {
  SUJET_HORS_GEL, SUJET_DONNEES, SUJET_RESULTAT
} from "../utilitaires/dimensionnement_fondations_superficielles_V1.js";

const SEMELLES = [
  { id: "a", designation: "File A", nombre: 9,
    entrees: { sectionLx: 1.2, sectionLy: 1.2, hauteurLz: 0.9, araseSuperieure: -0.1, hauteurFut: 0, futA: 0, futB: 0 } },
  { id: "b", designation: "Pignon", nombre: 4,
    entrees: { sectionLx: 1.5, sectionLy: 1.5, hauteurLz: 1, araseSuperieure: -0.1, hauteurFut: 0, futA: 0, futB: 0 } }
];

const RESULTATS = [
  { resultat: { bilan: { verifie: true, ratio: 0.82 } } },
  { resultat: { bilan: { verifie: false, ratio: 1.14 } } }
];

test("un nombre s'écrit à la française — la mémoire compare des phrases", () => {
  assert.equal(ecrire(1.2), "1,20");
  assert.equal(ecrire(0.99, 3), "0,990");
  assert.equal(ecrire("pas un nombre"), "");
});

test("un verdict a trois états, jamais deux", () => {
  // « Je ne sais pas » n'est pas « ça ne passe pas ».
  assert.equal(verdictDe(true), "vérifiée");
  assert.equal(verdictDe(false), "en défaut");
  assert.equal(verdictDe(null), "non calculée");
});

test("une étude propose trois lignes : ses entrées, l'appel, son résultat", () => {
  // La première version en proposait quatre-vingts — sept sujets par massif —
  // et écrivait les cotes dans le fichier de code.
  const lignes = affirmationsDeLEtude(SEMELLES, RESULTATS, "Bâtiment A");
  assert.deepEqual(lignes.map((ligne) => ligne.sujet), [
    SUJET_DONNEES,
    "Prédimensionnement des fondations superficielles",
    SUJET_RESULTAT
  ]);
});

test("les entrées partent telles que le calcul les reçoit", () => {
  // C'est ce qui doit repartir au serveur à l'identique le jour d'une reprise.
  // Les mettre en phrases obligerait à les relire, et une relecture est une
  // occasion de changer un chiffre sans le vouloir.
  const table = tableauDesEntrees(SEMELLES);
  assert.equal(table.length, 2);
  // Tout devient du texte, et en français : la mémoire est un texte, et un
  // aller-retour qui change la forme d'une valeur fait mentir le diff.
  assert.deepEqual(table[0], {
    designation: "File A",
    nombre: "9",
    entrees: {
      sectionLx: "1,2", sectionLy: "1,2", hauteurLz: "0,9", araseSuperieure: "-0,1",
      hauteurFut: "0", futA: "0", futB: "0"
    }
  });
});

test("le tableau d'entrée se verse comme une donnée de base, avec sa forme", () => {
  const entrees = entreesVersables(SEMELLES, "Bâtiment A");
  assert.equal(entrees.nature, "donnee-de-base");
  assert.equal(entrees.valeur, "2 lignes", "sa valeur dit la taille, jamais le contenu");
  assert.equal(entrees.tableau.length, 2);
  // « type: tableau » n'apprend rien tant qu'on ignore ce qu'il y a dans une ligne.
  assert.ok(entrees.structure.some((champ) => champ.nom === "hypothèses réglementaires"));
  assert.match(entrees.quoi, /un massif par ligne/);
});

test("l'appel se verse comme une fonction, et nomme ses deux entrées", () => {
  const fonction = fonctionVersable(SEMELLES, "Bâtiment A");
  assert.equal(fonction.referentiel, true, "une fonction se range dans un .ref");
  // Un enchaînement déterministe : mêmes entrées, même sortie. C'est ce qui
  // permet de le rejouer pour vérifier.
  assert.equal(fonction.agent.genre, "agent-D");
  assert.equal(fonction.agent.utilitaire, "dimensionnement_fondations_superficielles");
  assert.equal(fonction.agent.version, "V1");
  assert.deepEqual(fonction.agent.lit, [SUJET_HORS_GEL, SUJET_DONNEES]);
  // Un seul résultat, nommé. Ce qu'il contient se lit là où il est rangé.
  assert.deepEqual(fonction.agent.ecrit, [{ sujet: SUJET_RESULTAT }]);
  assert.equal(fonction.valeur, "2 massifs");
});

test("le résultat est un tableau, sous un seul nom", () => {
  const resultat = resultatVersable(SEMELLES, RESULTATS, "Bâtiment A");
  assert.equal(resultat.sujet, SUJET_RESULTAT);
  assert.equal(resultat.tableau.length, 2);
  assert.deepEqual(resultat.tableau[0], {
    "désignation": "File A",
    "nombre de massifs": "9",
    "section Lx": "1,20 m",
    "section Ly": "1,20 m",
    "hauteur": "0,90 m",
    "arase supérieure": "-0,10 m",
    "volume de béton": "11,66 m3",
    "vérification": "vérifiée",
    "ratio déterminant": "0,820",
    // Ce que le calcul a reçu pour cette ligne-là : sans lui, on ne peut ni
    // vérifier ce résultat ni le refaire.
    "entrées": {
      sectionLx: "1,2", sectionLy: "1,2", hauteurLz: "0,9", araseSuperieure: "-0,1",
      hauteurFut: "0", futA: "0", futB: "0"
    }
  });
  assert.ok(resultat.structure.some((champ) => champ.nom === "vérification"));
});

test("un tableau dont un massif ne tient pas n'est pas acquis", () => {
  assert.equal(resultatVersable(SEMELLES, RESULTATS, "").statut, "contesté");
  assert.equal(resultatVersable(SEMELLES, [RESULTATS[0], null], "").statut, "en attente");
  assert.equal(resultatVersable([SEMELLES[0]], [RESULTATS[0]], "").statut, "retenu");
});

test("la phrase du résultat sépare les trois états, elle ne les additionne pas", () => {
  // « 10 massifs, 9 vérifiées » laisserait croire qu'une seule est en défaut
  // alors qu'elle n'a peut-être pas été calculée du tout.
  const dit = phraseDuResultat(SEMELLES, RESULTATS);
  assert.match(dit, /1 vérifiée/);
  assert.match(dit, /1 en défaut/);
  assert.doesNotMatch(dit, /non calculée/, "aucune ne manque ici");
});

test("une semelle dont le calcul a échoué reste dans le tableau", () => {
  // La taire ferait croire que le projet compte un massif de moins, et c'est
  // celui-là qu'il faut voir.
  const table = tableauDuResultat(SEMELLES, [RESULTATS[0], { error: "le serveur a refusé" }]);
  assert.equal(table.length, 2);
  assert.equal(table[1]["vérification"], "non calculée");
});

test("une étude vide ne propose rien — pas même une fonction qui n'aurait rien fait", () => {
  assert.deepEqual(affirmationsDeLEtude([], [], "Bâtiment A"), []);
  assert.equal(fonctionVersable([], "Bâtiment A"), null);
  assert.equal(entreesVersables([], "Bâtiment A"), null);
});

test("les entrées de saisie ne deviennent pas des sujets du projet", () => {
  // Elles vivent **dans** le tableau, sous un seul nom. Les éclater remplirait
  // la mémoire de trois cents lignes qui ne décident de rien.
  const sujets = affirmationsDeLEtude(SEMELLES, RESULTATS, "").map((ligne) => ligne.sujet).join(" | ");
  for (const saisie of ["angle", "enrobage", "butée", "section lx"]) {
    assert.doesNotMatch(sujets.toLowerCase(), new RegExp(saisie), `${saisie} n'est pas un sujet`);
  }
});

/** La mémoire telle qu'elle est après le versement, en assertions. */
function memoireDuProjet() {
  let rang = 0;
  const enAssertion = (ligne) => ({
    id: `a${++rang}`, project_id: "p", subject_key: ligne.sujet,
    statement: `${ligne.sujet} : ${ligne.valeur}`,
    payload: {
      subject: ligne.sujet, value: ligne.valeur, zones: ligne.zones,
      referentiel: ligne.referentiel === true ? true : null,
      agent: ligne.agent ?? null, utilitaire: ligne.utilitaire ?? null,
      lectures: ligne.lectures ?? null, domain: ligne.domaine ?? null,
      tableau: ligne.tableau ?? null, structure: ligne.structure ?? null
    },
    nature: ligne.nature ?? null, domain: ligne.domaine ?? null
  });

  return [
    { id: "z0", project_id: "p", subject_key: "Altitude du site", statement: "Altitude du site : 1 200 m",
      payload: { subject: "Altitude du site", value: "1200 m", zones: ["Bâtiment A"] }, nature: "donnee-de-base" },
    { id: "z1", project_id: "p", subject_key: SUJET_HORS_GEL, statement: "Profondeur hors gel : 0,99 m",
      payload: { subject: SUJET_HORS_GEL, value: "0,99 m", zones: ["Bâtiment A"],
        utilitaire: "deduction_profondeur_hors_gel_altitude_V1",
        lectures: [{ sujet: "Altitude du site", valeur: "1200 m" }] }, nature: "contrainte" },
    ...affirmationsDeLEtude(SEMELLES, RESULTATS, "Bâtiment A", {
      rappels: { profondeurHorsGel: { valeur: "0.99" } }
    }).map(enAssertion)
  ];
}

test("la chaîne tient : altitude → profondeur hors gel → le résultat du calcul", () => {
  const memoire = memoireDuProjet();
  const applications = applicationsDeLaMemoire(memoire, { projectId: "p" });

  // L'agent du hors gel lit l'altitude.
  assert.ok(applications.some((ligne) =>
    ligne.output_assertion_id === "z1" && ligne.input_assertion_id === "z0"));

  // Et la fonction native lit **les deux** entrées pour produire le résultat.
  const parLaFonction = applications.filter((ligne) => ligne.rule_assertion_id === "a2");
  assert.deepEqual(parLaFonction.map((ligne) => ligne.input_subject), [SUJET_HORS_GEL, SUJET_DONNEES]);
  assert.ok(parLaFonction.every((ligne) => ligne.output_assertion_id === "a3"));
  assert.equal(parLaFonction[0].input_assertion_id, "z1");
  assert.equal(parLaFonction[1].input_assertion_id, "a1", "le tableau d'entrée est une entrée du calcul");
});

test("le résultat est dérivé, jamais du socle : une variante doit le refaire", () => {
  const memoire = memoireDuProjet();
  const produites = sortiesDesRegles(memoire);
  const resultat = memoire.find((a) => a.subject_key === SUJET_RESULTAT);
  const entrees = memoire.find((a) => a.subject_key === SUJET_DONNEES);

  assert.equal(natureDuNoeud(resultat, { produites }), NOEUD.REJOUABLE);
  // Les entrées, elles, sont du socle : le projet les pose.
  assert.equal(natureDuNoeud(entrees, { produites }), NOEUD.SOCLE);

  const plan = planDeRecalcul(memoire);
  assert.equal(plan.rejouables, 1);
  assert.equal(plan.cycles.length, 0);
});

test("le cerveau la compte comme une fonction, et ne l'annonce pas comme une lacune", () => {
  const memoire = memoireDuProjet();
  const applications = applicationsDeLaMemoire(memoire, { projectId: "p" });
  const cerveau = cerveauDuProjet(memoire, applications, { avecLesFonctions: true });

  assert.equal(cerveau.compte.fonctions, 1);
  assert.equal(cerveau.compte.reglesSansEntree, 0, "elle a deux entrées, et elles sont enregistrées");
  // Une fonction native ne conclut pas sur son propre nom : sa conclusion est
  // le sujet qu'elle a écrit, et il est versé.
  assert.equal(cerveau.compte.conclusionsSansValeur, 0);
});

test("le navigateur ne prétend pas rejouer ce dont il n'a pas la loi", () => {
  const fonction = memoireDuProjet().find((a) => a.payload?.agent);

  const evaluation = evaluerLaRegle(fonction);
  assert.equal(evaluation.decidable, false);
  assert.deepEqual(evaluation.doutes, [DOUTE.LOI_NON_ECRITE]);

  // Sans cette sortie, zéro condition se combinait en « vrai » et le rejeu
  // annonçait que la fonction tient — sans avoir rien calculé.
  assert.equal(rejouerLaRegle(fonction).verdict, VERDICT.INDECIDABLE);
});
