/**
 * Ce qu'un clic demande, sur l'écran des sujets.
 *
 * ## Pourquoi ce fichier existe
 *
 * Le rail, la barre et les menus d'en-tête ont été livrés complets — chaque
 * entrée portant sa requête, chaque menu ses attributs — et **rien ne
 * fonctionnait**. Les tests passaient : ils vérifiaient le balisage, et le
 * balisage était juste. Personne ne l'écoutait.
 *
 * Un balisage juste que nul ne lit a exactement l'air de marcher. C'est le
 * défaut le plus coûteux de la série, et il n'a été vu qu'à l'écran.
 *
 * La décision « ce clic demande quoi ? » est donc sortie du gestionnaire
 * d'événements, où elle ne s'exécutait qu'avec un navigateur. Ces tests
 * l'appellent.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { ATTRIBUTS_ECOUTES, GESTE, gesteDesSujets } from "./gestes-des-sujets.js";

/** Un nœud, et de quoi remonter ses parents — ce que `closest` fait. */
function noeud(attributs = {}, parent = null) {
  return {
    attributs,
    parent,
    disabled: attributs.disabled === true,
    getAttribute: (nom) => (nom in attributs ? String(attributs[nom]) : null),
    closest(selecteur) {
      const nom = selecteur.replace(/^\[|\]$/g, "");
      let courant = this;
      while (courant) {
        if (nom in courant.attributs) return courant;
        courant = courant.parent;
      }
      return null;
    }
  };
}

/* ── Chaque geste est reconnu ────────────────────────────────────────────── */

test("chaque attribut de l'écran rend son geste", () => {
  const attendus = [
    ["data-sujets-lecture", GESTE.LECTURE, "assigné:moi"],
    ["data-sujets-decrocher", GESTE.DECROCHER, "e-1"],
    ["data-sujets-sousvue", GESTE.SOUS_VUE, "labels"],
    ["data-sujets-ecran", GESTE.ECRAN, "situations"],
    ["data-project-rail-collapse", GESTE.REPLI, ""],
    ["data-sujets-menu", GESTE.MENU, "sujets-label"],
    ["data-sujets-vider", GESTE.VIDER, ""],
    ["data-sujets-epingler", GESTE.EPINGLER, ""],
    ["data-sujets-suggestion", GESTE.SUGGESTION, "2"]
  ];

  for (const [attribut, geste, valeur] of attendus) {
    const lu = gesteDesSujets(noeud({ [attribut]: valeur }));
    assert.equal(lu.geste, geste, `« ${attribut} » ne rend pas son geste`);
    assert.equal(lu.valeur, valeur);
  }
});

/** Chaque attribut écouté a son geste : aucun n'est déclaré pour rien. */
test("tous les attributs écoutés mènent quelque part", () => {
  for (const attribut of ATTRIBUTS_ECOUTES) {
    assert.notEqual(gesteDesSujets(noeud({ [attribut]: "x" })).geste, GESTE.RIEN,
      `« ${attribut} » est écouté sans rien déclencher`);
  }
});

/* ── Ce qui remonte, et dans quel ordre ──────────────────────────────────── */

/**
 * **La croix est à l'intérieur de l'entrée.** Lue dans l'autre sens, retirer
 * une vue épinglée poserait d'abord la requête de celle qu'on retire — et l'on
 * verrait la liste changer sous ses yeux au moment où on la supprime.
 */
test("la croix d'une épingle l'emporte sur l'entrée qui la contient", () => {
  const entree = noeud({ "data-sujets-lecture": "priorité:haute" });
  const croix = noeud({ "data-sujets-decrocher": "e-1" }, entree);

  assert.equal(gesteDesSujets(croix).geste, GESTE.DECROCHER);
  assert.equal(gesteDesSujets(croix).valeur, "e-1");
  // Et l'entrée elle-même pose bien sa requête.
  assert.equal(gesteDesSujets(entree).geste, GESTE.LECTURE);
});

/** Un clic dans l'icône d'une entrée remonte jusqu'à l'entrée. */
test("un clic dans une entrée remonte jusqu'à elle", () => {
  const entree = noeud({ "data-sujets-lecture": "mention:moi" });
  const icone = noeud({}, noeud({}, entree));

  assert.equal(gesteDesSujets(icone).geste, GESTE.LECTURE);
  assert.equal(gesteDesSujets(icone).valeur, "mention:moi");
});

/**
 * Une entrée de menu porte `data-sujets-lecture` et vit dans un menu qui porte
 * `data-sujets-menu-liste`. Cliquer l'entrée pose la requête ; cliquer le
 * bouton ouvre le menu. Les confondre ferait un menu qui filtre en s'ouvrant.
 */
test("le bouton d'un menu et ses entrées ne se confondent pas", () => {
  const bouton = noeud({ "data-sujets-menu": "sujets-label" });
  const liste = noeud({ "data-sujets-menu-liste": "sujets-label" });
  const entree = noeud({ "data-sujets-lecture": "label:l-1" }, liste);

  assert.equal(gesteDesSujets(bouton).geste, GESTE.MENU);
  assert.equal(gesteDesSujets(entree).geste, GESTE.LECTURE);
});

/* ── Ce qui ne demande rien ──────────────────────────────────────────────── */

test("un clic ailleurs ne demande rien", () => {
  assert.equal(gesteDesSujets(noeud({})).geste, GESTE.RIEN);
  assert.equal(gesteDesSujets(noeud({ "data-autre-chose": "x" })).geste, GESTE.RIEN);
  assert.equal(gesteDesSujets(null).geste, GESTE.RIEN);
  assert.equal(gesteDesSujets({}).geste, GESTE.RIEN);
});

/** Le nœud revient avec le geste : c'est lui qui porte `disabled`. */
test("le geste rend le nœud qui l'a déclenché", () => {
  const bouton = noeud({ "data-sujets-epingler": "", disabled: true });
  const lu = gesteDesSujets(bouton);

  assert.equal(lu.geste, GESTE.EPINGLER);
  assert.equal(lu.noeud, bouton);
  assert.equal(lu.noeud.disabled, true);
});

/** Une requête vide est une requête : c'est elle qui efface le filtrage. */
test("la requête vide de « Tous les sujets » est un geste", () => {
  const lu = gesteDesSujets(noeud({ "data-sujets-lecture": "" }));

  assert.equal(lu.geste, GESTE.LECTURE);
  assert.equal(lu.valeur, "");
});
