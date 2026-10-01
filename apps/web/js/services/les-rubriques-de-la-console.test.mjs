/**
 * **Les rubriques de la console, et l'ordre de la chaîne.**
 *
 * La console posait sept blocs à la suite sur une seule page.
 *
 * > « L'affichage est laborieux, trop d'informations sur la même page. »
 *
 * On ne lit pas sept blocs : on fait défiler jusqu'à trouver, et l'on finit par
 * ne plus regarder du tout.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  LES_RUBRIQUES, LE_CARBURANT, laRubriqueDite, laRubriqueValide
} from "./les-rubriques-de-la-console.js";

/**
 * **L'ordre suit la chaîne**, il n'est pas décoratif :
 *
 *   ce qu'on a reçu → ce qu'on en reconnaît → ce qu'on en prédit → ce qui manque.
 *
 * Sans matière, rien ne se reconnaît ; sans reconnaissance, rien ne se prédit.
 * Une rubrique lue avant la précédente ne veut rien dire.
 */
test("l'ordre des rubriques est celui de la chaîne", () => {
  assert.deepEqual(LES_RUBRIQUES.map((une) => une.cle),
    [LE_CARBURANT, "reconnaissance", "prediction", "sujets", "manques"]);
});

/**
 * **Chacune porte la question à laquelle elle répond**, pas le nom de la table
 * qu'elle lit : on cherche une réponse, pas un écran.
 */
test("chaque rubrique porte sa question et son explication", () => {
  for (const une of LES_RUBRIQUES) {
    assert.ok(une.libelle, `« ${une.cle} » n'a pas de nom`);
    assert.match(une.question, /\?$/, `« ${une.cle} » ne pose pas de question`);
    assert.ok(une.explication.length > 30,
      `« ${une.cle} » doit dire ce qu'elle change pour le lecteur`);
    assert.ok(une.icone, `« ${une.cle} » n'a pas d'icône`);
  }

  const cles = LES_RUBRIQUES.map((une) => une.cle);
  assert.equal(new Set(cles).size, cles.length,
    "deux rubriques de même clé montreraient la même chose");
});

/**
 * **Chaque icône existe dans le jeu.** `svgIcon` rend une référence au sprite :
 * un nom absent ne lève pas, il dessine **une case vide**, et rien ne le
 * signale (règle 10).
 */
test("chaque rubrique nomme une icône qui existe", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const sprite = readFileSync(
    fileURLToPath(new URL("../../assets/icons.svg", import.meta.url)), "utf8"
  );

  for (const une of LES_RUBRIQUES) {
    assert.ok(sprite.includes(`<symbol id="${une.icone}"`),
      `« ${une.icone} » n'est pas dans le jeu d'icônes : la rubrique dessinerait une case vide`);
  }
});

/**
 * **Une clé inconnue ouvre la première**, elle ne laisse pas la page vide : une
 * adresse gardée en favori vers une rubrique retirée doit mener quelque part,
 * plutôt que sur un blanc qu'on prendrait pour une panne.
 */
test("une rubrique inconnue ramène au carburant", () => {
  assert.equal(laRubriqueValide("sujets"), "sujets");
  assert.equal(laRubriqueValide("ce-qui-nexiste-pas"), LE_CARBURANT);
  assert.equal(laRubriqueValide(""), LE_CARBURANT);
  assert.equal(laRubriqueValide(), LE_CARBURANT);
  assert.equal(laRubriqueDite("prediction").libelle, "Ce qui s'enchaîne");
  assert.equal(laRubriqueDite("n'importe quoi").cle, LE_CARBURANT);
});

/**
 * **Le carburant est le premier, et c'est le défaut.** C'est de lui que dépend
 * tout le reste : sans matière, aucun prédicteur n'a de chance.
 */
test("le carburant est la rubrique par défaut", () => {
  assert.equal(LES_RUBRIQUES[0].cle, LE_CARBURANT);
  assert.equal(laRubriqueDite().cle, LE_CARBURANT);
});
