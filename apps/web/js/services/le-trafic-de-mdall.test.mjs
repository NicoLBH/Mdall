/**
 * Ce que le trafic dit, et les deux chiffres qu'on ne doit jamais confondre.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUE_LE_TEMPS_MESURE, CE_QUE_LE_TRAFIC_NE_DIT_PAS, ceQueLeTraficDit, laDureeDite,
  lesPasDuTrafic, leTotalDuTrafic
} from "./le-trafic-de-mdall.js";

/** Deux jours : trois venues de deux comptes, puis cinq de quatre. */
const DEUX_JOURS = [
  { le: "2026-10-03T00:00:00Z", venues: 3, comptes: 2, secondes_actives: 3040,
    secondes_medianes: 700, secondes_maximum: 2100 },
  { le: "2026-10-04T00:00:00Z", venues: 5, comptes: 4, secondes_actives: 6000,
    secondes_medianes: 1100, secondes_maximum: 2400 }
];

/**
 * **Une durée se lit dans l'unité où on la pense.**
 *
 * « 2 100 s » ne se compare à rien de ce qu'on connaît ; « 35 min » si. Et
 * jamais de décimale sur des minutes : la mesure a un grain d'une minute,
 * l'afficher plus fin serait une précision qu'elle n'a pas.
 */
test("une durée se dit en secondes, minutes ou heures", () => {
  assert.equal(laDureeDite(0), "0 seconde");
  assert.equal(laDureeDite(45), "45 secondes");
  assert.equal(laDureeDite(60), "1 minute");
  assert.equal(laDureeDite(600), "10 minutes");
  assert.equal(laDureeDite(2100), "35 minutes");
  assert.equal(laDureeDite(7200), "2 heures");
  assert.equal(laDureeDite(9000), "2 heures 30");

  /**
   * **Soixante minutes se disent une heure.**
   *
   * Le seuil était à quatre-vingt-dix, et une colonne du tableau alignait
   * « 60 minutes » juste au-dessus de « 1 heure 30 » : deux unités pour deux
   * cases voisines, et l'œil ne compare plus rien.
   */
  assert.equal(laDureeDite(3600), "1 heure");
  // Le seuil porte sur les **minutes arrondies**, et non sur les secondes :
  // 3 599 secondes font soixante minutes, donc une heure.
  assert.equal(laDureeDite(3599), "1 heure");
  assert.equal(laDureeDite(3540), "59 minutes");
  // Et aucune durée ne se dit en minutes au-delà de soixante.
  for (const secondes of [3600, 4000, 5400, 7200, 14200]) {
    assert.doesNotMatch(laDureeDite(secondes), /^\d+ minutes$/,
      `« ${laDureeDite(secondes)} » se dit en minutes alors qu'il y a une heure`);
  }

  // Jamais de secondes au-delà de la minute, ni de décimale sur des minutes.
  assert.doesNotMatch(laDureeDite(2100), /seconde|,/);
  // Et rien ne lève sur une absence ou un négatif.
  assert.equal(laDureeDite(null), "0 seconde");
  assert.equal(laDureeDite(-90), "0 seconde");
});

/**
 * **Les venues ne sont pas les comptes, et c'est le chiffre qu'on croit lire.**
 *
 * Un produit ouvert quinze fois par jour par la même personne et un produit
 * ouvert une fois par quinze personnes n'appellent ni le même tarif, ni le même
 * écran d'accueil, ni la même inquiétude.
 */
test("un pas garde les venues et les comptes séparés", () => {
  const pas = lesPasDuTrafic(DEUX_JOURS);

  assert.equal(pas.length, 2);
  assert.equal(pas[0].venues, 3);
  assert.equal(pas[0].comptes, 2);
  assert.notEqual(pas[0].venues, pas[0].comptes,
    "le jeu d'essai ne distingue pas les deux : l'épreuve ne prouverait rien");

  // La moyenne est **par venue** : c'est la longueur d'une visite qu'on regarde
  // pour savoir si le produit se consulte ou s'y travaille.
  assert.equal(Math.round(pas[0].moyenne), Math.round(3040 / 3));
  assert.equal(pas[0].mediane, 700);
  assert.equal(pas[0].maximum, 2100);
});

/** Zéro venue rend zéro, et non « NaN min » — qui ferait douter du tableau. */
test("un pas sans venue ne rend pas NaN", () => {
  const pas = lesPasDuTrafic([{ le: "2026-10-05", venues: 0, comptes: 0, secondes_actives: 0 }]);
  assert.equal(pas[0].moyenne, 0);
  assert.ok(Number.isFinite(pas[0].moyenne));

  for (const rien of [null, undefined, "pas un tableau"]) {
    assert.deepEqual(lesPasDuTrafic(rien), []);
  }
});

/**
 * **Les comptes ne s'additionnent pas d'un pas à l'autre.**
 *
 * Quelqu'un venu lundi et mardi compte une fois chaque jour ; les sommer en
 * ferait deux personnes. On rend donc le plus haut pas observé, nommé pour ce
 * qu'il est, plutôt qu'un total fabriqué (règle 5).
 */
test("le total ne somme pas les comptes d'un pas à l'autre", () => {
  const total = leTotalDuTrafic(DEUX_JOURS);

  assert.equal(total.venues, 8, "les venues, elles, s'additionnent");
  assert.equal(total.secondes, 9040);
  assert.equal(total.comptesAuPlus, 4,
    "les comptes des deux pas sont sommés : six personnes au lieu de quatre");
  assert.notEqual(total.comptesAuPlus, 6);
  assert.equal(total.quandAuPlus, "2026-10-04T00:00:00Z");
  assert.equal(total.maximum, 2400);

  /**
   * **Une fenêtre sans venue rend zéro, et non `NaN`.**
   *
   * C'est le cas le plus fréquent des premiers mois : on regarde un mois
   * d'avant la mesure. « NaN minute par venue en moyenne » ferait douter de tout
   * le tableau, y compris des chiffres qui sont justes.
   */
  const vide = leTotalDuTrafic([]);
  assert.equal(vide.moyenne, 0);
  assert.ok(Number.isFinite(vide.moyenne), "la moyenne d'une fenêtre vide n'est pas un nombre");
  assert.equal(vide.venues, 0);
  assert.equal(vide.comptesAuPlus, 0);
  assert.equal(vide.pas, 0);

  for (const rien of [null, undefined, "pas un tableau"]) {
    assert.ok(Number.isFinite(leTotalDuTrafic(rien).moyenne));
  }
});

/** La phrase d'ensemble distingue toujours les deux. */
test("la phrase distingue les venues des comptes", () => {
  const dit = ceQueLeTraficDit(DEUX_JOURS);
  assert.match(dit, /8 venues/);
  assert.match(dit, /4 comptes au plus sur un même pas/,
    `la phrase confond les venues et les comptes : « ${dit} »`);
  assert.match(dit, /par venue en moyenne/);
});

/**
 * **Une fenêtre vide ne se dit pas « personne ».**
 *
 * Ce peut être une fenêtre d'avant la mesure : la table des venues n'existe que
 * depuis novembre, et tout ce qui précède est vide sans que personne n'ait
 * manqué (règle 5).
 */
test("une fenêtre vide ne dit pas que personne n'est venu", () => {
  const dit = ceQueLeTraficDit([]);
  assert.match(dit, /avant la mesure/,
    `une fenêtre vide s'annonce comme une fenêtre sans personne : « ${dit} »`);

  // Et quand on sait depuis quand on mesure, on le dit.
  const date = ceQueLeTraficDit([], { depuis: "24 novembre 2026" });
  assert.match(date, /24 novembre 2026/);
  assert.match(date, /rien n'était compté|rien n&#x27;était compté/);

  assert.ok(ceQueLeTraficDit(null).length > 20);
});

/**
 * **Les trois angles morts sont nommés**, et chacun avec sa raison.
 *
 * Le premier est le plus important : une venue ne porte ni écran ni chantier,
 * et c'est ce qui empêche ce tableau de devenir un journal de navigation.
 */
test("ce que le trafic ne dit pas est nommé, avec sa raison", () => {
  const quoi = CE_QUE_LE_TRAFIC_NE_DIT_PAS.map((un) => un.quoi).join(" | ");
  assert.match(quoi, /Qui a fait quoi/);
  assert.match(quoi, /temps de travail/i);
  assert.match(quoi, /comptes distincts/i);

  for (const un of CE_QUE_LE_TRAFIC_NE_DIT_PAS) {
    assert.ok(un.pourquoi.length > 60,
      `« ${un.quoi} » est nommé sans raison : on le remettra au tour prochain`);
  }

  // Le premier dit pourquoi : un journal de navigation saurait qui lit quoi
  // sans jamais lire une ligne.
  assert.match(CE_QUE_LE_TRAFIC_NE_DIT_PAS[0].pourquoi, /journal de navigation/);
  // Et la phrase du temps est **celle des venues**, pas une seconde écrite ici.
  assert.equal(CE_QUE_LE_TRAFIC_NE_DIT_PAS[1].pourquoi, CE_QUE_LE_TEMPS_MESURE);
});
