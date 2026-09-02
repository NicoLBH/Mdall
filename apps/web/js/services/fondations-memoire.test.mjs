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

// Les clés telles que la mémoire les écrit vraiment — dérivées des libellés des
// utilitaires — et les valeurs telles qu'ils les enregistrent : des phrases.
const MEMOIRE = [
  dire("profondeur-hors-gel", "0,575 m"),
  dire("zone-de-sismicite", "4 — Moyenne"),
  dire("categorie-d-importance", "Catégorie d'importance III"),
  dire("classe-de-sol", "Classe de sol B"),
  dire("altitude", "450 m")
];

test("on ne retient de la mémoire que ce qui entre dans ce calcul", () => {
  const trouves = rappelsDeLaMemoire(MEMOIRE);
  assert.deepEqual(Object.keys(trouves).sort(),
    ["categorieImportance", "profondeurHorsGel", "typeSolEc8", "zoneSismique"]);
  // L'altitude est dans la mémoire mais ne dit rien d'une fondation.
  assert.equal(trouves.altitude, undefined);
});

test("la mémoire parle en phrases, le formulaire attend des jetons", () => {
  const trouves = rappelsDeLaMemoire(MEMOIRE);
  assert.equal(trouves.zoneSismique.valeur, "4");
  assert.equal(trouves.categorieImportance.valeur, "III");
  assert.equal(trouves.typeSolEc8.valeur, "B");
  assert.equal(trouves.profondeurHorsGel.valeur, "0.575");
});

test("chaque rappel garde la phrase d'origine : « 4 » tout seul ne dit pas d'où il sort", () => {
  const trouves = rappelsDeLaMemoire(MEMOIRE);
  assert.equal(trouves.zoneSismique.brut, "4 — Moyenne");
  assert.match(trouves.zoneSismique.enonce, /zone-de-sismicite/);
  assert.equal(trouves.zoneSismique.trancheeLe, "2026-01-15T00:00:00.000Z");
});

test("un même fait s'écrit sous plusieurs noms selon qui l'a établi", () => {
  // « Zone sismique » saisie à la main, « Zone de sismicité » par l'utilitaire :
  // n'en attendre qu'une, c'est ne rien trouver la plupart du temps.
  for (const sujet of ["zone-de-sismicite", "zone-sismique", "sismicite"]) {
    assert.equal(rappelsDeLaMemoire([dire(sujet, "3")]).zoneSismique?.valeur, "3", sujet);
  }
  for (const sujet of ["categorie-d-importance", "categorie-importance", "importance"]) {
    assert.equal(rappelsDeLaMemoire([dire(sujet, "II")]).categorieImportance?.valeur, "II", sujet);
  }
  for (const sujet of ["classe-de-sol", "type-de-sol", "categorie-de-sol", "sol-ec8"]) {
    assert.equal(rappelsDeLaMemoire([dire(sujet, "C")]).typeSolEc8?.valeur, "C", sujet);
  }
  for (const sujet of ["profondeur-hors-gel", "hors-gel", "profondeur-minimale-hors-gel"]) {
    assert.equal(rappelsDeLaMemoire([dire(sujet, "0,80 m")]).profondeurHorsGel?.valeur, "0.8", sujet);
  }
});

test("une clé portée sur une zone du projet parle du même sujet", () => {
  // `sujet@portee` : la portée range l'affirmation, elle ne change pas son sujet.
  const trouves = rappelsDeLaMemoire([dire("profondeur-hors-gel@lot-2", "0,99 m")]);
  assert.equal(trouves.profondeurHorsGel.valeur, "0.99");
});

test("l'énoncé sert de repli quand le payload ne porte pas la valeur", () => {
  const trouves = rappelsDeLaMemoire([
    { subject_key: "zone-de-sismicite", payload: {}, statement: "Zone de sismicité 4 (moyenne)" }
  ]);
  assert.equal(trouves.zoneSismique.valeur, "4");
});

test("une mémoire vide ne rend rien plutôt que des valeurs par défaut", () => {
  assert.deepEqual(rappelsDeLaMemoire([]), {});
  assert.deepEqual(rappelsDeLaMemoire(null), {});
  assert.deepEqual(rappelsDeLaMemoire([{ subject_key: "zone-de-sismicite", payload: {} }]), {});
});

test("une phrase où le jeton attendu ne figure pas ne rend rien", () => {
  // Mieux vaut ne rien pré-remplir qu'inventer un chiffre.
  assert.deepEqual(rappelsDeLaMemoire([dire("classe-de-sol", "à déterminer")]), {});
});

test("la première affirmation courante d'un sujet l'emporte", () => {
  const trouves = rappelsDeLaMemoire([dire("zone-de-sismicite", "4"), dire("zone-de-sismicite", "3")]);
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
  const rappels = rappelsDeLaMemoire([dire("zone-de-sismicite", "1"), dire("classe-de-sol", "Z")]);
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

test("le cas rapporté : H = 0,99 m et un massif de 0,60 m alertent", () => {
  const rappels = rappelsDeLaMemoire([dire("profondeur-hors-gel", "0,99 m")]);
  const alertes = alertesDeLaMemoire({ araseSuperieure: -0.1, hauteurLz: 0.6 }, rappels);
  assert.equal(alertes.length, 1);
  assert.match(alertes[0].texte, /0,990/);
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

test("chaque rappel déclaré vise au moins un sujet de la mémoire", () => {
  for (const rappel of RAPPELS) {
    assert.ok(rappel.sujets?.length, `${rappel.cle} doit nommer ses sujets`);
    assert.ok(rappel.libelle, `${rappel.cle} doit se lire`);
    assert.equal(typeof rappel.lire, "function", `${rappel.cle} doit savoir lire une phrase`);
  }
});
