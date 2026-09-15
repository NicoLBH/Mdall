import test from "node:test";
import assert from "node:assert/strict";

import {
  couleurDeLaSituation,
  iconeDeLaSituation,
  requeteDeLaSituation,
  seDitParUneRequete,
  situationCommeUneEpingle
} from "./situation-comme-une-vue.js";
import { COULEURS_DE_VUE, ICONES_DE_VUE } from "./vues-des-sujets.js";

/**
 * **Le jeu d'icônes est celui des vues.** En redéclarer un pour les situations
 * ferait deux listes qui se ressemblent assez pour qu'on les croie identiques
 * et diffèrent assez pour qu'on le voie (règle 10).
 */
test("l'icône vient du jeu des vues, et rien d'autre n'y entre", () => {
  assert.equal(iconeDeLaSituation({ icon: "clock-fill" }), "clock-fill");
  assert.ok(ICONES_DE_VUE.includes(iconeDeLaSituation({ icon: "zoiseau" })), "l'inconnu retombe sur celle par défaut");
  assert.equal(iconeDeLaSituation({}), iconeDeLaSituation(null), "et l'absence fait pareil");
});

test("la couleur vient de la même liste, avec sa valeur", () => {
  const bleu = couleurDeLaSituation({ color: "bleu" });

  assert.equal(bleu.cle, "bleu");
  assert.match(bleu.valeur, /^#/, "de quoi la peindre, sans la redéfinir ici");
  assert.ok(COULEURS_DE_VUE.some((couleur) => couleur.cle === couleurDeLaSituation({}).cle));
});

/** La base écrit `icon`/`color` ; le code français les lit aussi sous leurs noms. */
test("les deux façons de nommer ces colonnes se lisent", () => {
  assert.equal(iconeDeLaSituation({ icone: "people" }), "people");
  assert.equal(couleurDeLaSituation({ couleur: "vert" }).cle, "vert");
});

/* ── La requête ──────────────────────────────────────────────────────────── */

test("une situation dit ce qu'elle retient par sa requête", () => {
  assert.equal(requeteDeLaSituation({ requete: "assigné:moi label:cr-chantier" }), "assigné:moi label:cr-chantier");
  assert.equal(seDitParUneRequete({ requete: "assigné:moi" }), true);
});

/**
 * **Vide n'est pas « rien ».** Une situation sans requête retient ce que son
 * mode et son filtre disent — c'est le cas de toutes celles d'aujourd'hui. La
 * rendre comme une requête vide la ferait passer pour « tous les sujets », ce
 * qui est une affirmation et non une absence (règle 5).
 */
test("une situation sans requête ne se lit pas comme « tous les sujets »", () => {
  assert.equal(requeteDeLaSituation({ mode: "automatic", filter_definition: { status: ["open"] } }), "");
  assert.equal(seDitParUneRequete({ mode: "automatic" }), false);
  assert.equal(seDitParUneRequete(null), false);
  assert.equal(seDitParUneRequete({ requete: "   " }), false, "des blancs ne sont pas une requête");
});

/* ── Sous « Épinglées » ──────────────────────────────────────────────────── */

/**
 * C'est la forme que le rail des sujets consomme déjà pour ses vues : de quoi
 * y poser mes situations sans écrire un second rail (étape 2).
 */
test("une situation se présente comme une vue épinglée", () => {
  const epingle = situationCommeUneEpingle(
    { id: "s-1", title: "Ma semaine", icon: "clock-fill", color: "bleu", requete: "assigné:moi" },
    "assigné:moi"
  );

  assert.deepEqual(epingle, {
    id: "s-1",
    nom: "Ma semaine",
    icone: "clock-fill",
    couleur: "bleu",
    requete: "assigné:moi",
    active: true
  });
});

test("celle qu'on ne regarde pas ne s'allume pas", () => {
  const epingle = situationCommeUneEpingle({ id: "s-1", title: "Ma semaine", requete: "auteur:moi" }, "assigné:moi");

  assert.equal(epingle.active, false);
});

/**
 * **Deux situations muettes se croiraient toutes deux actives.** Sans requête,
 * aucune ne peut être celle qu'on regarde — et allumer deux entrées du rail
 * ferait croire à deux listes ouvertes en même temps.
 */
test("sans requête, aucune situation ne s'allume", () => {
  assert.equal(situationCommeUneEpingle({ id: "s-1", title: "Ma semaine" }, "").active, false);
  assert.equal(situationCommeUneEpingle({ id: "s-2", title: "Autre" }, "").active, false);
});

/** Une situation sans titre se nomme quand même : une entrée muette ne se clique pas. */
test("une situation sans titre porte un nom", () => {
  assert.equal(situationCommeUneEpingle({ id: "s-1" }).nom, "Situation");
  assert.equal(situationCommeUneEpingle(null).nom, "Situation");
});
