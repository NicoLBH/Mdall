/**
 * La remise du copilote à l'Atelier : ce qui s'ajoute, ce qui se renomme, et ce
 * qui ne se remplace jamais.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  semellesDeLaRemise, nomLibre, planDeLaRemise, vientDuCopilote, VENUE_DU_COPILOTE
} from "./fondations-remise.js";

const EXECUTION = {
  outil: "fondations_predimensionnement_V1",
  valeurs: {
    affaire: "Garros à Labejan",
    appuis: [
      { nom: "File A", quantite: 1, tenue: true, entrees: { sectionLx: 0.9, sectionLy: 0.9, hauteurLz: 0.89 } },
      { nom: "File B", quantite: 2, tenue: true, entrees: { sectionLx: 2.8, sectionLy: 2.8, hauteurLz: 0.89 } },
      // Celui-là n'a pas tenu : proposer une semelle dont on vient de dire
      // qu'elle ne vérifie pas serait proposer une erreur.
      { nom: "File Z", quantite: 1, tenue: false, entrees: { sectionLx: 4, sectionLy: 4, hauteurLz: 0.89 } }
    ]
  }
};

test("seuls les massifs qui tiennent se proposent", () => {
  const semelles = semellesDeLaRemise(EXECUTION);
  assert.deepEqual(semelles.map((s) => s.designation), ["File A", "File B"]);
  assert.equal(semelles[1].nombre, 2);
});

test("chaque semelle proposée porte d'où elle vient", () => {
  // Six mois plus tard, personne ne saura si elle a été dimensionnée à la main
  // ou proposée par un calcul — sauf si elle le dit.
  const [premiere] = semellesDeLaRemise(EXECUTION);
  assert.equal(premiere.entrees.provenance.par, VENUE_DU_COPILOTE);
  assert.equal(premiere.entrees.provenance.outil, "fondations_predimensionnement_V1");
  assert.equal(premiere.entrees.provenance.note, "Garros à Labejan");
  assert.equal(vientDuCopilote({ entrees: premiere.entrees }), true);
  assert.equal(vientDuCopilote({ entrees: { sectionLx: 1 } }), false);
});

test("un nom déjà pris est suffixé, jamais fusionné", () => {
  // Une semelle existante est la décision de quelqu'un : on ne la remplace pas.
  assert.equal(nomLibre("File A", []), "File A");
  assert.equal(nomLibre("File A", ["File A"]), "File A (copilote)");
  assert.equal(nomLibre("File A", ["File A", "File A (copilote)"]), "File A (copilote 2)");
  // La casse ne fait pas deux noms différents.
  assert.equal(nomLibre("File A", ["file a"]), "File A (copilote)");
  assert.equal(nomLibre("", []), "Massif");
});

test("le plan dit ce que l'ajout va faire avant de le faire", () => {
  const plan = planDeLaRemise(semellesDeLaRemise(EXECUTION), [{ designation: "File A" }, { designation: "Semelle S1" }]);

  assert.equal(plan.ajoutees, 2);
  assert.equal(plan.dejaLa, 2);
  assert.equal(plan.renommees, 1);
  assert.deepEqual(plan.semelles.map((s) => s.designation), ["File A (copilote)", "File B"]);
  // Rien de ce qui était là n'est touché : le plan n'ajoute que des lignes.
  assert.equal(plan.semelles.some((s) => s.designation === "Semelle S1"), false);
});

test("deux massifs de même nom dans une même remise ne se marchent pas dessus", () => {
  const plan = planDeLaRemise(
    [{ designation: "Massif", nombre: 1, entrees: {} }, { designation: "Massif", nombre: 1, entrees: {} }],
    []
  );
  assert.deepEqual(plan.semelles.map((s) => s.designation), ["Massif", "Massif (copilote)"]);
});

test("rien à remettre ne remet rien", () => {
  assert.deepEqual(semellesDeLaRemise(null), []);
  assert.deepEqual(semellesDeLaRemise({ valeurs: {} }), []);
  assert.deepEqual(planDeLaRemise([], []).semelles, []);
});
