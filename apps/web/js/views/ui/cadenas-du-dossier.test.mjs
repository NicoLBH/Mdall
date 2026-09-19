/**
 * Le cadenas d'un dossier privé, dans l'arbre **et** dans le tableau.
 *
 * Deux vues montrent le même état. Le jour où l'une des deux l'oublie, un
 * dossier privé ressemble à un dossier ordinaire là où on le regarde le plus —
 * et c'est le genre de manque qu'on ne remarque qu'après l'avoir partagé.
 *
 * Ces épreuves tiennent les deux à la même source.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { LE_CADENAS, laMarqueDuDossier } from "../../services/le-dossier-des-mails.js";
import { renderLigneDArbre } from "../project-memoire-fichiers.js";

const noeud = (dessus = {}) => ({
  aller: "documents:1", libelle: "Mails", profondeur: 1, genre: "dossier", ...dessus
});

test("un dossier privé porte le cadenas dans l'arbre", () => {
  const html = renderLigneDArbre(noeud({ marque: laMarqueDuDossier({ prive: true }) }));
  assert.ok(html.includes("documents-tree__marque"));
  assert.ok(html.includes(LE_CADENAS.icone));
  assert.ok(html.includes(LE_CADENAS.titre));
});

test("un dossier ordinaire n'en porte pas dans l'arbre", () => {
  const html = renderLigneDArbre(noeud({ marque: laMarqueDuDossier({ prive: false }) }));
  assert.equal(html.includes("documents-tree__marque"), false);
  assert.equal(html.includes(LE_CADENAS.icone), false);
});

test("l'arbre garde son libellé et son compte à côté du cadenas", () => {
  const html = renderLigneDArbre(noeud({ marque: laMarqueDuDossier({ prive: true }), compte: 4 }));
  assert.ok(html.includes("Mails"));
  assert.ok(html.includes("diff-tree__compte"));
});

test("les deux vues lisent le même cadenas", () => {
  // Défaut invisible autrement : un écran qui dessinerait son propre cadenas
  // passerait toutes les épreuves du cadenas de l'autre.
  const arbre = readFileSync(new URL("../project-memoire-fichiers.js", import.meta.url), "utf8");
  const tableau = readFileSync(new URL("../project-documents.js", import.meta.url), "utf8");
  assert.ok(arbre.includes("noeud.marque.icone"), "l'arbre ne lit pas la marque");
  assert.ok(tableau.includes("laMarqueDuDossier(folder)"), "le tableau ne lit pas la marque");
  assert.ok(tableau.includes("laMarqueDuDossier(dossier)"), "l'arbre des documents ne lit pas la marque");
  // Aucune des deux ne fabrique son propre cadenas.
  assert.equal(arbre.includes(LE_CADENAS.icone), false, "l'arbre écrit l'icône en dur");
  assert.equal(tableau.includes(LE_CADENAS.icone), false, "le tableau écrit l'icône en dur");
});

test("le cadenas est une icône que la planche porte", () => {
  const planche = readFileSync(new URL("../../../assets/icons.svg", import.meta.url), "utf8");
  assert.ok(planche.includes(`id="${LE_CADENAS.icone}"`));
});
