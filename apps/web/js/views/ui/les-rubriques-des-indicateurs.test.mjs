/**
 * Les rubriques des Indicateurs : ce qu'elles nomment, et ce qu'elles refusent
 * de laisser vide.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  RUBRIQUES, RUBRIQUE_PAR_DEFAUT, laRubrique, rubriqueValide
} from "./les-rubriques-des-indicateurs.js";

test("les cinq rubriques sont nommées, dans l'ordre", () => {
  assert.deepEqual(RUBRIQUES.map((une) => une.dit),
    ["Exécution", "Pilotage", "Forme", "Correspondance", "Consommation"]);
});

/**
 * **Deux rubriques de même clé se masqueraient l'une l'autre** : le menu en
 * montrerait deux, et le clic sur la seconde ouvrirait la première.
 */
test("aucune clé ne se répète, et chacune porte une icône", () => {
  const cles = RUBRIQUES.map((une) => une.cle);
  assert.equal(new Set(cles).size, cles.length);
  for (const une of RUBRIQUES) {
    assert.equal(Boolean(une.cle && une.dit && une.icone), true, une.cle);
  }
});

/**
 * **Une clé inconnue ouvre la première**, elle ne laisse pas l'écran vide : un
 * état gardé d'une version où la rubrique s'appelait autrement donnerait une
 * page blanche qu'on prendrait pour une panne.
 */
test("une rubrique inconnue retombe sur la première", () => {
  assert.equal(rubriqueValide("forme"), "forme");
  assert.equal(rubriqueValide("carburant"), RUBRIQUE_PAR_DEFAUT);
  assert.equal(rubriqueValide(""), RUBRIQUE_PAR_DEFAUT);
  assert.equal(rubriqueValide(null), RUBRIQUE_PAR_DEFAUT);
  assert.equal(RUBRIQUE_PAR_DEFAUT, "execution");
});

test("la rubrique entière se retrouve par sa clé", () => {
  assert.equal(laRubrique("correspondance").dit, "Correspondance");
  assert.equal(laRubrique("inconnue").cle, RUBRIQUE_PAR_DEFAUT);
});
