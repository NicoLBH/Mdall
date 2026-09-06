import test from "node:test";
import assert from "node:assert/strict";

import { depotDeLaProposition, resumeDuDepot, PROVENANCE } from "./proposition-depot.js";

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
