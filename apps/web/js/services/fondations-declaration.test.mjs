/**
 * La déclaration des zones de saisie, et ce qu'elle refuse.
 *
 * Ces tests ne calculent rien : ils vérifient que l'écran et le serveur parlent
 * du même formulaire, et qu'une valeur absurde est arrêtée ici plutôt que
 * d'aller chercher une réponse ailleurs.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  ZONES, CHOIX, CAS_DE_CHARGE, COMPOSANTES,
  champsNumeriques, entreesParDefaut, entreesInvalides, uniteAffichee, estPertinent
} from "./fondations-declaration.js";
import { DEFAUTS, REGLEMENTS, REPARTITIONS, UNITES, CAS, COMPOSANTES as COMPOSANTES_MOTEUR }
  from "../../../../supabase/functions/fondations-stabilite-externe/calcul.js";

test("chaque champ déclaré existe dans le moteur, avec la même valeur par défaut", () => {
  for (const champ of champsNumeriques()) {
    assert.ok(champ.cle in DEFAUTS, `${champ.cle} est inconnu du moteur`);
    assert.equal(champ.defaut, DEFAUTS[champ.cle], `${champ.cle} n'a pas le même défaut des deux côtés`);
  }
});

test("les listes de choix sont celles que le moteur accepte", () => {
  const par = Object.fromEntries(CHOIX.map((c) => [c.cle, c]));
  assert.deepEqual(par.reglement.valeurs, REGLEMENTS);
  assert.deepEqual(par.repartition.valeurs, REPARTITIONS);
  assert.deepEqual(par.unites.valeurs, UNITES);
  for (const choix of CHOIX) {
    assert.ok(choix.valeurs.includes(choix.defaut), `${choix.cle} : le défaut n'est pas dans la liste`);
  }
});

test("les cas de charge et leurs composantes sont ceux du moteur", () => {
  // Le moteur cite Gmax et Gmin, que la descente de charges déduit du seul G.
  assert.deepEqual(CAS_DE_CHARGE.map((c) => c.cle), CAS.slice(1).map((c) => (c === "Gmin" ? "G" : c)));
  assert.deepEqual(COMPOSANTES.map((c) => c.cle), COMPOSANTES_MOTEUR);
});

test("les valeurs de départ passent le contrôle", () => {
  assert.deepEqual(entreesInvalides(entreesParDefaut()), []);
});

test("une valeur illisible est arrêtée, et nommée", () => {
  const entrees = { ...entreesParDefaut(), sectionLx: "un mètre vingt" };
  const problemes = entreesInvalides(entrees);
  assert.equal(problemes.length, 1);
  assert.equal(problemes[0].cle, "sectionLx");
  assert.match(problemes[0].raison, /illisible/);
});

test("une virgule décimale est acceptée : c'est ainsi qu'on écrit ici", () => {
  assert.deepEqual(entreesInvalides({ ...entreesParDefaut(), sectionLx: "1,25" }), []);
});

test("les bornes déclarées sont tenues", () => {
  const trop = entreesInvalides({ ...entreesParDefaut(), buteeMobilisee: 140 });
  assert.equal(trop[0].cle, "buteeMobilisee");
  const negatif = entreesInvalides({ ...entreesParDefaut(), hauteurLz: -1 });
  assert.equal(negatif[0].cle, "hauteurLz");
});

test("une semelle sans côté est arrêtée avant d'atteindre le serveur", () => {
  const problemes = entreesInvalides({ ...entreesParDefaut(), sectionLy: 0 });
  assert.ok(problemes.some((p) => p.cle === "sectionLy"));
});

test("l'annexe F de l'EC8-5 est calculable, et ses champs deviennent pertinents", () => {
  const entrees = { ...entreesParDefaut(), reglement: "EC8-5 Annexe F" };
  assert.deepEqual(entreesInvalides(entrees), []);

  const zone = CHOIX.find((c) => c.cle === "zoneSismique");
  assert.equal(estPertinent(zone, entreesParDefaut()), false);
  assert.equal(estPertinent(zone, entrees), true);
  // Ce qui n'est pas conditionnel l'est toujours.
  assert.equal(estPertinent(CHOIX.find((c) => c.cle === "reglement"), entrees), true);
});

test("les zones et catégories que l'annexe F ne couvre pas ne sont pas proposées", () => {
  // Zone 1 et catégorie I ne figurent pas dans les tables de l'EC8 : les offrir
  // ferait échouer le calcul après coup, au lieu de le dire tout de suite.
  const zone = CHOIX.find((c) => c.cle === "zoneSismique");
  assert.deepEqual(zone.valeurs, ["2", "3", "4", "5"]);
  const categorie = CHOIX.find((c) => c.cle === "categorieImportance");
  assert.deepEqual(categorie.valeurs, ["II", "III", "IV"]);
});

test("une charge illisible est nommée par son cas et sa composante", () => {
  const entrees = entreesParDefaut();
  entrees.charges.W2.Hx = "beaucoup";
  const problemes = entreesInvalides(entrees);
  assert.equal(problemes[0].cle, "charge-W2-Hx");
  assert.match(problemes[0].raison, /W2 \/ Hx/);
});

test("une charge laissée vide vaut zéro, elle n'est pas une erreur", () => {
  const entrees = entreesParDefaut();
  entrees.charges.Sn.V = "";
  assert.deepEqual(entreesInvalides(entrees), []);
});

test("les unités suivent le système choisi, elles ne sont jamais laissées à deviner", () => {
  const par = Object.fromEntries(champsNumeriques().map((c) => [c.cle, c]));
  assert.equal(uniteAffichee(par.poidsVolumiqueSol, "{ daN ; daNm }"), "daN/m³");
  assert.equal(uniteAffichee(par.poidsVolumiqueSol, "{ kN ; kNm }"), "kN/m³");
  assert.equal(uniteAffichee(par.lestMin, "{ T ; Tm }"), "T");
  assert.equal(uniteAffichee(par.cohesionNonDrainee, "{ T ; Tm }"), "T/m²");
  // La contrainte suit le règlement d'unités : le kilonewton amène le MPa.
  assert.equal(uniteAffichee(par.contrainteLimite, "{ kN ; kNm }"), "MPa");
  assert.equal(uniteAffichee(par.contrainteLimite, "{ daN ; daNm }"), "bar");
  // Ce qui ne dépend pas du système reste écrit tel quel.
  assert.equal(uniteAffichee(par.sectionLx, "{ kN ; kNm }"), "m");
  assert.equal(uniteAffichee(par.angleFrottement, "{ T ; Tm }"), "°");
});

test("chaque zone porte un titre et au moins un champ", () => {
  for (const zone of ZONES) {
    assert.ok(zone.titre, "une zone sans titre ne se lit pas");
    assert.ok(zone.champs.length > 0, `${zone.cle} est vide`);
  }
});
