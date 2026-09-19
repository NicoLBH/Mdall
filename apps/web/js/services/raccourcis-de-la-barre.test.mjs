import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { MARQUE_DES_SITUATIONS, RACCOURCIS_GLOBAUX } from "./raccourcis-de-la-barre.js";
import { NOM_DU_CARNET, ROUTE_DU_CARNET } from "./mon-carnet.js";
import { TOUS_LES_PROJETS, TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS } from "./ecrans-transversaux.js";

// ── L'ordre ────────────────────────────────────────────────────────────────

test("l'ordre est sujets, propositions, situations, projets", () => {
  // Le copilote n'est pas de la liste : il ne paraît que dans un projet, et
  // c'est l'en-tête qui le pose devant.
  assert.deepEqual(RACCOURCIS_GLOBAUX.map((un) => un.href), [
    TOUS_LES_SUJETS.route,
    TOUTES_LES_PROPOSITIONS.route,
    ROUTE_DU_CARNET,
    TOUS_LES_PROJETS.route
  ]);
});

test("les projets sont en queue, et non en tête", () => {
  // L'entrée la plus générale se lit comme la plus importante quand elle est
  // la première. C'est le seul déplacement de la liste, et il se pin ici.
  assert.equal(RACCOURCIS_GLOBAUX.at(-1).href, TOUS_LES_PROJETS.route);
  assert.notEqual(RACCOURCIS_GLOBAUX[0].href, TOUS_LES_PROJETS.route);
});

// ── Les noms viennent d'où ils vivent ──────────────────────────────────────

test("chaque nom est celui de l'écran où il mène", () => {
  // La garantie de la règle 10 : renommer « Tous les sujets » là où il vit
  // renomme le raccourci. Un nom recopié passerait cette épreuve à l'écriture
  // et divergerait ensuite en silence.
  const parRoute = new Map(RACCOURCIS_GLOBAUX.map((un) => [un.href, un.nom]));
  assert.equal(parRoute.get(TOUS_LES_SUJETS.route), TOUS_LES_SUJETS.nom);
  assert.equal(parRoute.get(TOUTES_LES_PROPOSITIONS.route), TOUTES_LES_PROPOSITIONS.nom);
  assert.equal(parRoute.get(ROUTE_DU_CARNET), NOM_DU_CARNET);
  assert.equal(parRoute.get(TOUS_LES_PROJETS.route), TOUS_LES_PROJETS.nom);
});

test("aucun raccourci ne part sans nom ni sans adresse", () => {
  // Un lien sans nom n'a ni infobulle ni libellé pour qui n'y voit pas : le
  // bouton est alors une icône muette.
  for (const un of RACCOURCIS_GLOBAUX) {
    assert.ok(un.nom.trim(), `sans nom : ${un.href}`);
    assert.ok(un.href.startsWith("#"), `adresse douteuse : ${un.href}`);
  }
});

// ── Les icônes ─────────────────────────────────────────────────────────────

test("chaque icône existe dans la planche", () => {
  // Défaut précisément invisible : une icône absente ne lève rien et ne peint
  // rien. Le bouton reste cliquable, et vide.
  const planche = readFileSync(new URL("../../assets/icons.svg", import.meta.url), "utf8");
  for (const un of RACCOURCIS_GLOBAUX) {
    assert.ok(planche.includes(`id="${un.icone}"`), `${un.nom} : ${un.icone}`);
  }
});

test("deux raccourcis ne portent pas la même icône", () => {
  // Cinq boutons côte à côte se distinguent par leur dessin et par rien
  // d'autre : deux fois le même en fait deux boutons qu'on ne peut pas viser.
  const dessins = RACCOURCIS_GLOBAUX.map((un) => un.icone);
  assert.equal(new Set(dessins).size, dessins.length, dessins.join(", "));
});

// ── Le geste du carnet ─────────────────────────────────────────────────────

test("seul le carnet porte une marque", () => {
  // Elle existe parce que son adresse ne change pas quand une situation est
  // ouverte : le clic doit refermer la sélection lui-même. Les trois autres
  // changent d'adresse, et n'ont donc rien à faire de plus qu'un lien.
  const marques = RACCOURCIS_GLOBAUX.filter((un) => un.marque);
  assert.deepEqual(marques.map((un) => un.href), [ROUTE_DU_CARNET]);
  assert.equal(marques[0].marque, MARQUE_DES_SITUATIONS);
});
