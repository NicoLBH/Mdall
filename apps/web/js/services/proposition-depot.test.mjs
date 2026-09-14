import test from "node:test";
import assert from "node:assert/strict";

import { depotDeLaProposition, resumeDuDepot, PROVENANCE } from "./proposition-depot.js";
import { affirmationsDUneProposition } from "./proposition-avant-apres.js";
import { passerLesControles, ISSUE } from "./depot-controles.js";
import { ITEM_TYPE } from "./proposition-review.js";

const PROPOSITION = { id: "p1", title: "Incendie habitation", created_at: "2026-09-05T09:00:00Z" };

const avecProvenance = (sujet) => ({
  sujet, payload: { source: "arrêté du 31 janvier 1986 modifié", article: "article 6" }
});
const sansProvenance = (sujet) => ({ sujet, payload: {} });

test("verser des résultats d'utilitaire est un dépôt, même sans un seul fichier", () => {
  const depot = depotDeLaProposition({
    proposition: PROPOSITION,
    affirmations: [avecProvenance("Degré coupe-feu"), avecProvenance("Famille")],
    documents: []
  });

  assert.equal(depot.affirmations, 2);
  assert.equal(depot.livrables, 0);
  assert.equal(depot.provenance, PROVENANCE.VERIFIE);
  assert.equal(resumeDuDepot(depot), "2 affirmations");
});

test("une affirmation qui ne dit pas d'où elle vient ne se vérifie pas", () => {
  const depot = depotDeLaProposition({
    proposition: PROPOSITION,
    affirmations: [avecProvenance("Degré coupe-feu"), sansProvenance("Contrainte de sol")]
  });

  assert.equal(depot.provenance, PROVENANCE.PARTIEL);
  assert.match(depot.pourquoi, /1 affirmation ne dit pas d'où elle vient/);
});

test("un livrable que le stockage n'a pas rendu retire le sceau", () => {
  const depot = depotDeLaProposition({
    proposition: PROPOSITION,
    affirmations: [avecProvenance("Degré coupe-feu")],
    documents: [{ id: "d1" }, { id: "d2" }],
    unreachable: [{ original_filename: "Rapport.pdf" }]
  });

  assert.equal(depot.provenance, PROVENANCE.PARTIEL);
  assert.match(depot.pourquoi, /1 livrable n'a pas pu être lu/);
  assert.equal(resumeDuDepot(depot), "1 affirmation · 2 livrables");
});

test("tant que l'analyse n'a pas abouti, on ne signe pas la provenance", () => {
  const depot = depotDeLaProposition({
    proposition: PROPOSITION,
    affirmations: [avecProvenance("Degré coupe-feu")],
    documents: [{ id: "d1" }],
    analyseFaite: false
  });

  assert.equal(depot.provenance, PROVENANCE.PARTIEL);
  assert.match(depot.pourquoi, /n'a pas encore abouti/);
});

test("un dépôt vide se dit vide, il ne se déclare pas vérifié", () => {
  const depot = depotDeLaProposition({ proposition: PROPOSITION });

  assert.equal(depot.provenance, PROVENANCE.VIDE);
  assert.equal(resumeDuDepot(depot), "rien pour l'instant");
});

test("l'utilitaire qui a calculé une valeur vaut provenance", () => {
  const depot = depotDeLaProposition({
    proposition: PROPOSITION,
    affirmations: [{ sujet: "Zone de neige", payload: { atelier: "neige-vent-gel" } }]
  });

  assert.equal(depot.provenance, PROVENANCE.VERIFIE);
});

test("la ligne du tableau avant/après se lit aussi bien que la ligne brute", () => {
  const depot = depotDeLaProposition({
    proposition: PROPOSITION,
    affirmations: [{ sujet: "Degré coupe-feu", source: "arrêté du 31 janvier 1986", article: "article 6" }]
  });

  assert.equal(depot.provenance, PROVENANCE.VERIFIE);
});

/* ── Le compte rendu, de bout en bout ────────────────────────────────────── */

/**
 * **La chaîne qui a bloqué une fusion sans laisser de geste pour la lever.**
 *
 * Un compte rendu apportant huit relances, treize lots, quatre objectifs et
 * deux labels arrivait ici avec vingt-sept « affirmations » — parce que ces
 * natures-là n'avaient pas été rangées dans l'intendance. Aucune n'a de source
 * à citer : ce ne sont pas des affirmations, ce sont des rangements. Le dépôt
 * passait donc « Provenance incomplète », le contrôle requis tombait, et la
 * proposition n'était plus fusionnable — par un contrôle qui avait raison, sur
 * des lignes qui ne le concernaient pas.
 *
 * Le test exécute les trois services dans l'ordre où l'écran les appelle : le
 * tri, le dépôt, les contrôles. Vérifier chacun séparément aurait laissé passer
 * exactement ce défaut, qui vit dans la **jointure** entre le premier et le
 * second.
 */
test("un compte rendu signé ne retient pas la fusion sur sa provenance", () => {
  const lignes = [
    { item_type: ITEM_TYPE.DOCUMENT, item_key: "doc-1", payload: { name: "1824_CR_10.pdf" } },
    ...Array.from({ length: 21 }, (_, rang) => ({
      item_type: ITEM_TYPE.SUJET, item_key: `12.0${rang}`, payload: { titre: "Un point" }
    })),
    ...Array.from({ length: 8 }, (_, rang) => ({
      item_type: ITEM_TYPE.RELANCE, item_key: `sujet-${rang}`, payload: { titre: "Un point repris" }
    })),
    ...Array.from({ length: 13 }, (_, rang) => ({
      item_type: ITEM_TYPE.LOT, item_key: String(rang + 1), payload: { intitule: "Un lot" }
    })),
    ...Array.from({ length: 4 }, (_, rang) => ({
      item_type: ITEM_TYPE.OBJECTIF, item_key: `2025-05-1${rang}`, payload: { date: `2025-05-1${rang}` }
    })),
    { item_type: ITEM_TYPE.LABEL, item_key: "cr chantier", payload: { nom: "CR chantier" } },
    { item_type: ITEM_TYPE.LABEL, item_key: "urgent", payload: { nom: "Urgent" } }
  ];

  const depot = depotDeLaProposition({
    proposition: PROPOSITION,
    affirmations: affirmationsDUneProposition(lignes),
    documents: [{ id: "doc-1" }]
  });

  assert.equal(depot.affirmations, 0);
  assert.equal(depot.provenance, PROVENANCE.VERIFIE);

  const rendu = passerLesControles({
    depot, conflits: [], blocage: "", documents: [{ id: "doc-1" }],
    unreachable: [], analyseFaite: true, pile: "moteur v3", avis: 0, avisHorsDepot: 0
  });

  assert.equal(rendu.lignes.find((ligne) => ligne.id === "provenance").issue, ISSUE.SANS_OBJET);
  assert.equal(rendu.bloque, false);
});
