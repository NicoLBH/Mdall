/**
 * Les onglets de la console : ce qu'ils nomment, et ce qu'ils refusent de
 * laisser vide.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ONGLETS_DE_LA_CONSOLE, ONGLET_PAR_DEFAUT, ongletDeLaConsoleValide
} from "./les-onglets-de-la-console.js";

test("la console a un onglet, et il s'appelle Carburant", () => {
  assert.deepEqual(ONGLETS_DE_LA_CONSOLE.map((un) => un.dit), ["Carburant"]);
  assert.equal(ONGLET_PAR_DEFAUT, "carburant");
});

test("chaque onglet porte une clé et une icône, et aucune clé ne se répète", () => {
  const cles = ONGLETS_DE_LA_CONSOLE.map((un) => un.cle);
  assert.equal(new Set(cles).size, cles.length);
  for (const un of ONGLETS_DE_LA_CONSOLE) {
    assert.equal(Boolean(un.cle && un.dit && un.icone), true, un.cle);
  }
});

/**
 * **Une adresse gardée en favori vers un onglet retiré doit mener quelque
 * part**, plutôt que sur un blanc qu'on prendrait pour une panne.
 */
test("une clé inconnue retombe sur le premier onglet", () => {
  assert.equal(ongletDeLaConsoleValide("carburant"), "carburant");
  assert.equal(ongletDeLaConsoleValide("archive"), ONGLET_PAR_DEFAUT);
  assert.equal(ongletDeLaConsoleValide(""), ONGLET_PAR_DEFAUT);
  assert.equal(ongletDeLaConsoleValide(null), ONGLET_PAR_DEFAUT);
});
