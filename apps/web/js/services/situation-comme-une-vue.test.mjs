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
import { epinglesDuRail } from "./rail-des-sujets.js";

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
 * **La forme se vérifie en la faisant traverser le rail**, pas en la décrivant.
 *
 * Le test d'avant décrivait un objet — `nom`, `active` — et passait, pendant
 * que le rail lisait `titre` et `auRail` et écartait **toutes** mes situations
 * en silence. Une fixture qui recopie les hypothèses du code ne teste que
 * elle-même ; celle-ci donne la forme à `epinglesDuRail` et regarde ce qui en
 * ressort.
 */
test("une situation traverse le rail et en ressort avec son nom", () => {
  const [epingle] = epinglesDuRail(
    [situationCommeUneEpingle({
      id: "s-1", title: "Ma semaine", icon: "clock-fill", color: "bleu",
      requete: "assigné:moi", au_rail: true
    })],
    "assigné:moi"
  );

  assert.ok(epingle, "elle ne doit pas être écartée du rail");
  assert.equal(epingle.nom, "Ma semaine", "son nom, et non sa requête");
  assert.equal(epingle.requete, "assigné:moi");
  assert.equal(epingle.icone, "clock-fill");
  assert.equal(epingle.couleur, "bleu");
  assert.equal(epingle.active, true, "et c'est le rail qui dit laquelle on regarde");
});

/**
 * **Le rail garde celles qu'on y a mises, et elles seules.**
 *
 * Il les montrait toutes : sur un carnet qui compte vingt-six situations, la
 * barre de gauche devenait une liste qu'on ne parcourt plus — l'inverse de ce à
 * quoi un rail sert. Le tableau les montre toutes ; le rail, celles qu'on y a
 * épinglées. C'est la règle que les vues portent déjà.
 */
test("seules les situations épinglées occupent le rail", () => {
  const trois = ["s-1", "s-2", "s-3"].map((id, rang) => situationCommeUneEpingle({
    id, title: `Situation ${rang}`, requete: `label:l${rang}`, au_rail: rang === 1
  }));

  assert.deepEqual(epinglesDuRail(trois, "").map((epingle) => epingle.nom), ["Situation 1"]);
});

/** La base écrit `au_rail` ; le code français le lit aussi sous son nom. */
test("les deux façons de nommer l'épingle se lisent", () => {
  assert.equal(situationCommeUneEpingle({ id: "s", auRail: true }).auRail, true);
  assert.equal(situationCommeUneEpingle({ id: "s", au_rail: true }).auRail, true);
  assert.equal(situationCommeUneEpingle({ id: "s" }).auRail, false);
});

/** Celle qu'on ne regarde pas ne s'allume pas — et c'est le rail qui le décide. */
test("celle qu'on ne regarde pas ne s'allume pas", () => {
  const [epingle] = epinglesDuRail(
    [situationCommeUneEpingle({
      id: "s-1", title: "Ma semaine", requete: "auteur:moi", au_rail: true
    })],
    "assigné:moi"
  );

  assert.equal(epingle.active, false);
});

/**
 * **Une situation sans requête n'entre pas au rail**, et c'est juste : une
 * entrée du rail pose une requête, et une entrée muette ne ferait rien au clic.
 * C'est le cas des situations d'avant l'étape 4, qui portent un filtre et pas
 * encore de requête.
 */
test("une situation sans requête n'occupe pas le rail", () => {
  assert.deepEqual(
    epinglesDuRail([situationCommeUneEpingle({ id: "s-1", title: "Ma semaine", au_rail: true })], ""),
    []
  );
});

/** Une situation sans titre se nomme quand même : une entrée muette ne se clique pas. */
test("une situation sans titre porte un nom", () => {
  assert.equal(situationCommeUneEpingle({ id: "s-1" }).titre, "Situation");
  assert.equal(situationCommeUneEpingle(null).titre, "Situation");
});
