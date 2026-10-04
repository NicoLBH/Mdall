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
  LA_RUBRIQUE_PAR_DEFAUT, LES_COMPTES, LES_RUBRIQUES, LE_CARBURANT, laPremiereRubriqueDe,
  laRubriqueDite, laRubriqueValide, lesRubriquesDeLonglet, ongletDeLaRubrique
} from "./les-rubriques-de-la-console.js";
import {
  ONGLET, ONGLETS_DE_LA_CONSOLE, ONGLET_PAR_DEFAUT
} from "./les-onglets-de-la-console.js";

/**
 * **L'ordre suit la chaîne**, il n'est pas décoratif :
 *
 *   ce qu'on a reçu → ce qu'on en reconnaît → ce qu'on en prédit →
 *   de quoi on parle → ce que cela énonce → ce qui manque.
 *
 * Sans matière, rien ne se reconnaît ; sans reconnaissance, rien ne se prédit.
 * Une rubrique lue avant la précédente ne veut rien dire.
 */
test("l'ordre des rubriques est celui de la chaîne", () => {
  assert.deepEqual(LES_RUBRIQUES.map((une) => une.cle),
    [LES_COMPTES, "sante", "usage", "consultations",
     LE_CARBURANT, "reconnaissance", "prediction", "sujets", "idees", "manques"]);

  // **Les comptes viennent avant la chaîne, pas dedans** : ils répondent à une
  // autre question — qui est là —, et c'est la première qu'on se pose. La
  // chaîne du carburant, elle, garde son ordre entier.
  assert.deepEqual(lesRubriquesDeLonglet(ONGLET.CARBURANT).map((une) => une.cle),
    [LE_CARBURANT, "reconnaissance", "prediction", "sujets", "idees", "manques"]);

  /**
   * **L'exploitation va de « est-ce que cela répond » à « qui a regardé ».**
   *
   * La santé d'abord : si rien ne répond, les chiffres d'usage de l'écran
   * suivant sont ceux d'une installation en panne, et on les lirait comme un
   * creux d'activité. Les consultations ferment, parce qu'elles portent sur la
   * console elle-même et non sur le produit.
   */
  assert.deepEqual(lesRubriquesDeLonglet(ONGLET.EXPLOITATION).map((une) => une.cle),
    ["sante", "usage", "consultations"]);
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
test("une rubrique inconnue ramène à la première", () => {
  assert.equal(laRubriqueValide("sujets"), "sujets");
  assert.equal(laRubriqueValide("ce-qui-nexiste-pas"), LA_RUBRIQUE_PAR_DEFAUT);
  assert.equal(laRubriqueValide(""), LA_RUBRIQUE_PAR_DEFAUT);
  assert.equal(laRubriqueValide(), LA_RUBRIQUE_PAR_DEFAUT);
  assert.equal(laRubriqueDite("prediction").libelle, "Ce qui s'enchaîne");
  assert.equal(laRubriqueDite("n'importe quoi").cle, LA_RUBRIQUE_PAR_DEFAUT);
});

/**
 * **La rubrique par défaut est la première du premier onglet, et elle est
 * déduite.**
 *
 * Écrite, elle aurait pu désigner une rubrique d'un autre onglet que celui qui
 * est en tête : la console se serait ouverte sur « Utilisateurs » en montrant le
 * carburant, avec un rail qui ne porte pas la rubrique affichée.
 */
test("la rubrique par défaut relève bien du premier onglet", () => {
  assert.equal(LA_RUBRIQUE_PAR_DEFAUT, LES_RUBRIQUES[0].cle);
  assert.equal(ongletDeLaRubrique(LA_RUBRIQUE_PAR_DEFAUT), ONGLET_PAR_DEFAUT);
  assert.equal(laRubriqueDite().cle, LA_RUBRIQUE_PAR_DEFAUT);
});

/* ── Les onglets et leurs rubriques ────────────────────────────── */

/**
 * **Chaque rubrique déclare son onglet, et cet onglet existe.**
 *
 * Une rubrique qui nommerait un onglet retiré disparaîtrait de tous les rails —
 * sans erreur, sans trace : son entrée manquerait, et c'est tout (règle 10).
 */
test("chaque rubrique relève d'un onglet qui existe", () => {
  const onglets = new Set(ONGLETS_DE_LA_CONSOLE.map((un) => un.cle));
  for (const une of LES_RUBRIQUES) {
    assert.ok(onglets.has(une.onglet),
      `« ${une.cle} » relève de « ${une.onglet} », qui n'est pas un onglet`);
  }
});

/**
 * **Chaque onglet mène quelque part.**
 *
 * Un onglet sans rubrique serait un lien qui ouvre la rubrique par défaut : on
 * cliquerait sur « Carburant » et l'on arriverait aux comptes, sans comprendre
 * pourquoi.
 */
test("aucun onglet n'est vide, et chacun mène à sa première rubrique", () => {
  for (const un of ONGLETS_DE_LA_CONSOLE) {
    const rubriques = lesRubriquesDeLonglet(un.cle);
    assert.ok(rubriques.length > 0, `« ${un.cle} » n'a aucune rubrique`);

    const premiere = laPremiereRubriqueDe(un.cle);
    assert.equal(premiere, rubriques[0].cle);
    // Et le lien de l'onglet ramène bien à cet onglet : c'est ce qui le
    // souligne au clic.
    assert.equal(ongletDeLaRubrique(premiere), un.cle);
  }
});

/**
 * **Un onglet n'est pas une adresse.** Le fragment nomme une rubrique ; donner
 * `#utilisateurs` à un lien ouvrirait une rubrique inconnue, donc la rubrique
 * par défaut.
 */
test("la clé d'un onglet n'est pas une rubrique", () => {
  for (const un of ONGLETS_DE_LA_CONSOLE) {
    // Le carburant est l'exception, et elle est voulue : l'onglet et sa
    // première rubrique portent le même nom, parce que c'est le même sujet.
    if (un.cle === LE_CARBURANT) continue;
    assert.notEqual(laRubriqueValide(un.cle), un.cle,
      `« ${un.cle} » est à la fois un onglet et une rubrique`);
  }
});
