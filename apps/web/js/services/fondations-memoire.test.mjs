/**
 * Ce que le projet sait déjà, versé dans le calcul — et ce qu'on refuse d'en
 * déduire.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { RAPPELS, rappelsDeLaMemoire, preremplir, alertesDeLaMemoire } from "./fondations-memoire.js";

const dire = (sujet, valeur, extra = {}) => ({
  subject_key: sujet, payload: { value: valeur },
  statement: `${sujet} : ${valeur}`, decided_at: "2026-01-15T00:00:00.000Z", ...extra
});

const MEMOIRE = [
  dire("profondeur-hors-gel", "0.575"),
  dire("zone-sismique", "4"),
  dire("categorie-importance", "III"),
  dire("classe-de-sol", "B"),
  dire("altitude", "450")
];

test("on ne retient de la mémoire que ce qui entre dans ce calcul", () => {
  const trouves = rappelsDeLaMemoire(MEMOIRE);
  assert.deepEqual(Object.keys(trouves).sort(),
    ["categorieImportance", "profondeurHorsGel", "typeSolEc8", "zoneSismique"]);
  // L'altitude est dans la mémoire mais ne dit rien d'une fondation.
  assert.equal(trouves.altitude, undefined);
});

test("chaque rappel porte son énoncé et sa date : sans eux, ce n'est qu'une valeur de plus", () => {
  const trouves = rappelsDeLaMemoire(MEMOIRE);
  assert.equal(trouves.zoneSismique.valeur, "4");
  assert.match(trouves.zoneSismique.enonce, /zone-sismique/);
  assert.equal(trouves.zoneSismique.trancheeLe, "2026-01-15T00:00:00.000Z");
});

test("une mémoire vide ne rend rien plutôt que des valeurs par défaut", () => {
  assert.deepEqual(rappelsDeLaMemoire([]), {});
  assert.deepEqual(rappelsDeLaMemoire(null), {});
  assert.deepEqual(rappelsDeLaMemoire([{ subject_key: "zone-sismique", payload: {} }]), {});
});

test("la première affirmation courante d'un sujet l'emporte", () => {
  const trouves = rappelsDeLaMemoire([dire("zone-sismique", "4"), dire("zone-sismique", "3")]);
  assert.equal(trouves.zoneSismique.valeur, "4");
});

const LISTES = {
  zoneSismique: ["2", "3", "4", "5"],
  categorieImportance: ["II", "III", "IV"],
  typeSolEc8: ["A", "B", "C", "D", "E"]
};

test("le pré-remplissage dit lesquels des champs viennent de la mémoire", () => {
  const { valeurs, venuesDeLaMemoire } = preremplir({}, rappelsDeLaMemoire(MEMOIRE), LISTES);
  assert.equal(valeurs.zoneSismique, "4");
  assert.equal(valeurs.categorieImportance, "III");
  assert.equal(valeurs.typeSolEc8, "B");
  assert.deepEqual(Object.keys(venuesDeLaMemoire).sort(), ["categorieImportance", "typeSolEc8", "zoneSismique"]);
});

test("la profondeur hors gel ne remplit aucun champ : elle en contrôle un", () => {
  const { venuesDeLaMemoire } = preremplir({}, rappelsDeLaMemoire(MEMOIRE), LISTES);
  assert.equal(venuesDeLaMemoire.profondeurHorsGel, undefined);
});

test("une valeur que la liste ne propose pas ne s'impose pas", () => {
  // Elle rendrait le formulaire invalide sans qu'on comprenne d'où ça vient.
  const rappels = rappelsDeLaMemoire([dire("zone-sismique", "1"), dire("classe-de-sol", "Z")]);
  const { valeurs, venuesDeLaMemoire } = preremplir({ zoneSismique: "2" }, rappels, LISTES);
  assert.equal(valeurs.zoneSismique, "2");
  assert.deepEqual(venuesDeLaMemoire, {});
});

test("une assise au-dessus de la profondeur hors gel est signalée", () => {
  const rappels = rappelsDeLaMemoire(MEMOIRE);
  const alertes = alertesDeLaMemoire({ araseSuperieure: -0.1, hauteurLz: 0.4 }, rappels);
  assert.equal(alertes.length, 1);
  // Une virgule décimale, comme partout ailleurs dans l'écran.
  assert.match(alertes[0].texte, /0,575/);
  assert.doesNotMatch(alertes[0].texte, /0\.575/);
  assert.match(alertes[0].texte, /gèlerait/);
});

test("une assise assez profonde ne déclenche rien", () => {
  const rappels = rappelsDeLaMemoire(MEMOIRE);
  assert.deepEqual(alertesDeLaMemoire({ araseSuperieure: -0.1, hauteurLz: 0.8 }, rappels), []);
  // Juste à la limite, ça passe : 0,575 exactement n'est pas « au-dessus ».
  assert.deepEqual(alertesDeLaMemoire({ araseSuperieure: -0.075, hauteurLz: 0.5 }, rappels), []);
});

test("sans profondeur hors gel en mémoire, on ne reproche rien", () => {
  // Ne pas savoir n'autorise pas à prétendre que c'est bon, ni que c'est mauvais.
  assert.deepEqual(alertesDeLaMemoire({ araseSuperieure: -0.1, hauteurLz: 0.1 }, {}), []);
});

test("chaque rappel déclaré vise un sujet de la mémoire", () => {
  for (const rappel of RAPPELS) {
    assert.ok(rappel.sujet, `${rappel.cle} doit nommer son sujet`);
    assert.ok(rappel.libelle, `${rappel.cle} doit se lire`);
  }
});
