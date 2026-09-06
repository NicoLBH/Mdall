import test from "node:test";
import assert from "node:assert/strict";

import {
  cheminDeRangement, DOSSIERS, SANS_NATURE, SANS_DOMAINE, rangDuDossier, phraseDuDossier
} from "./memoire-rangement.js";
import { cheminDeFichier } from "./memoire-en-texte.js";

test("une conclusion d'étude incendie est une contrainte, pas une donnée de base", () => {
  const chemin = cheminDeRangement({ nature: "contrainte", domain: "incendie" });
  assert.deepEqual(chemin, ["Contraintes", "Incendie"]);
  assert.equal(cheminDeFichier(chemin), "contraintes/incendie.mdall");
});

test("un relevé va aux données de base", () => {
  assert.equal(cheminDeFichier(cheminDeRangement({ nature: "donnee-de-base", domain: "structure" })),
    "donnees-de-base/structure.mdall");
});

test("une contrainte déduite reste une contrainte : elle s'impose comme les autres", () => {
  // « Profondeur hors gel » sort d'un calcul et s'impose pourtant exactement
  // comme si elle sortait d'un texte. Ce qui la distingue se lit sur sa ligne,
  // derrière la double flèche — pas dans un dossier à part.
  assert.equal(cheminDeFichier(cheminDeRangement({ nature: "contrainte", domain: "structure" })),
    "contraintes/structure.mdall");
});

test("ce qui n'a pas de nature ne devient pas une donnée de base par défaut", () => {
  assert.deepEqual(cheminDeRangement({}), [SANS_NATURE, SANS_DOMAINE]);
  assert.deepEqual(cheminDeRangement({ nature: "n'importe quoi", domain: "incendie" }), [SANS_NATURE, "Incendie"]);
});

test("les dossiers se lisent dans l'ordre de la confiance", () => {
  assert.ok(rangDuDossier(DOSSIERS["donnee-de-base"]) < rangDuDossier(DOSSIERS.contrainte));
  assert.ok(rangDuDossier(DOSSIERS.contrainte) < rangDuDossier(DOSSIERS.hypothese));
  assert.ok(rangDuDossier(SANS_NATURE) > rangDuDossier(DOSSIERS.intendance));
  assert.ok(rangDuDossier("Quelque chose d'autre") >= rangDuDossier(SANS_NATURE));
});

test("chaque dossier dit ce qu'on y range, sinon on y range au hasard", () => {
  assert.match(phraseDuDossier(DOSSIERS.contrainte), /pas de recours/);
  assert.match(phraseDuDossier(DOSSIERS["donnee-de-base"]), /ne se calcule pas/);
  assert.match(phraseDuDossier(SANS_NATURE), /ne devrait pas se remplir/);
});
