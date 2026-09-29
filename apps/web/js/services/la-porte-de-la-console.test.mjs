import test from "node:test";
import assert from "node:assert/strict";

import { LA_CONSOLE, laPorteEstOuverte } from "./la-porte-de-la-console.js";

test("une ligne rendue ouvre la porte", () => {
  assert.equal(laPorteEstOuverte({ data: [{ ouvert_le: "2026-09-29T00:00:00Z" }], error: null }), true);
});

test("aucune ligne laisse la porte fermée", () => {
  assert.equal(laPorteEstOuverte({ data: [], error: null }), false);
});

/**
 * **Une lecture qui échoue ferme.** C'est le sens le moins coûteux de
 * l'erreur : un administrateur qui ne voit pas son entrée recharge la page ;
 * l'inverse montrerait une porte à tout le monde le jour où la base tombe.
 */
test("une erreur ferme la porte, même si des lignes accompagnent", () => {
  assert.equal(laPorteEstOuverte({ data: [{ ouvert_le: "x" }], error: { message: "boom" } }), false);
});

test("l'absence de réponse ferme la porte", () => {
  assert.equal(laPorteEstOuverte(null), false);
  assert.equal(laPorteEstOuverte(), false);
  assert.equal(laPorteEstOuverte({ data: null, error: null }), false);
});

/**
 * **On ne compare pas l'adresse ici.** La base l'a déjà fait, en minuscules des
 * deux côtés ; le refaire dans le navigateur ajouterait un second juge, et
 * c'est celui-là qui se tromperait le jour d'une majuscule.
 */
test("le contenu de la ligne ne décide de rien", () => {
  assert.equal(laPorteEstOuverte({ data: [{}], error: null }), true);
});

test("l'entrée de la console porte son nom, son adresse et son icône à un seul endroit", () => {
  assert.equal(LA_CONSOLE.nom, "Console administrateur");
  // Relative : la console est déposée à côté de l'application, pas à la racine
  // d'un domaine.
  assert.equal(LA_CONSOLE.adresse, "console/");
  assert.equal(LA_CONSOLE.adresse.startsWith("/"), false);
  assert.equal(Object.isFrozen(LA_CONSOLE), true);
});
