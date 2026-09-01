import test from "node:test";
import assert from "node:assert/strict";

import {
  ZONE_TOUT_LOUVRAGE_LABEL,
  definedZones,
  describeZone,
  filterByZone,
  normalizeZoneKey,
  zoneChoices,
  zoneLabel,
  zonesOf
} from "./project-zones.js";

const definition = (label, valeur, patch = {}) => ({
  id: `def-${label}`,
  nature: "donnee-de-base",
  kind: "base-datum",
  payload: { subject: label, value: valeur, zoneDefinition: true, zoneKey: normalizeZoneKey(label) },
  ...patch
});

const ligne = (id, zone = null, patch = {}) => ({ id, nature: "contrainte", zones: zone ? [zone] : null, ...patch });

/* ── Sans zone veut dire partout, pas « on ne sait pas » ─────────────────── */

test("ce qui n'a pas de zone apparaît dans la lecture de chaque zone", () => {
  // La zone de neige ne connaît pas les étages. La retirer de la lecture du
  // rez-de-chaussée donnerait un corpus incomplet sans que rien ne le signale.
  const memoire = [ligne("neige"), ligne("usage-rdc", "zone-a")];

  assert.deepEqual(filterByZone(memoire, "zone-a").map((e) => e.id), ["neige", "usage-rdc"]);
});

test("lire tout l'ouvrage ne filtre rien", () => {
  // C'est la vue d'ensemble, pas la vue de ce qui n'a pas de zone.
  const memoire = [ligne("neige"), ligne("usage-rdc", "zone-a"), ligne("usage-r1", "zone-b")];

  assert.equal(filterByZone(memoire).length, 3);
  assert.equal(filterByZone(memoire, "").length, 3);
});

test("une zone ne montre pas ce qui appartient à une autre", () => {
  const memoire = [ligne("usage-rdc", "zone-a"), ligne("usage-r1", "zone-b")];

  assert.deepEqual(filterByZone(memoire, "Zone B").map((e) => e.id), ["usage-r1"]);
});

/* ── Une zone se définit, elle ne se devine pas ──────────────────────────── */

test("seules les définitions explicites font une zone", () => {
  // Repérer « Zone A » parce que l'énoncé commence par ces deux mots
  // fabriquerait des zones que personne n'a voulues.
  const memoire = [
    ligne("porteuse", "zone-c", { statement: "Zone C : quelque chose" }),
    definition("Zone A", "RDC — ERP type M")
  ];

  assert.deepEqual(definedZones(memoire).map((z) => z.key), ["zone-a"]);
});

test("une définition remplacée ne définit plus rien", () => {
  assert.deepEqual(definedZones([definition("Zone A", "RDC", { superseded_by: "autre" })]), []);
});

test("tout l'ouvrage vient en tête des choix", () => {
  // Une liste qui commencerait par « Zone A » laisserait croire qu'il faut
  // choisir une partie pour lire quoi que ce soit.
  const choix = zoneChoices([definition("Zone B", "Étages"), definition("Zone A", "RDC")]);

  assert.equal(choix[0].label, ZONE_TOUT_LOUVRAGE_LABEL);
  assert.deepEqual(choix.slice(1).map((z) => z.label), ["Zone A", "Zone B"], "puis l'ordre du libellé");
});

test("« Zone A » et « zone a » sont la même zone", () => {
  // Deux clés pour une même zone donneraient deux corpus là où il n'y en a
  // qu'un.
  assert.equal(normalizeZoneKey("Zone A"), normalizeZoneKey("zone a"));
  assert.equal(normalizeZoneKey("Rez-de-chaussée"), "rez-de-chaussee");
});

/* ── Ce qu'on dit d'une zone ─────────────────────────────────────────────── */

test("une zone sans définition le dit, plutôt que d'en inventer une", () => {
  assert.match(describeZone("zone-z", []), /pas de définition/);
  assert.equal(zoneLabel("zone-z", []), "zone-z");
});

test("tout l'ouvrage se dit comme une portée, pas comme une absence", () => {
  assert.match(describeZone(""), /ouvrage entier/);
  assert.equal(zoneLabel(""), ZONE_TOUT_LOUVRAGE_LABEL);
});

test("une zone définie rend sa définition", () => {
  const memoire = [definition("Zone A", "RDC — ERP type M, 5e catégorie")];

  assert.equal(zoneLabel("zone-a", memoire), "Zone A");
  assert.match(describeZone("zone-a", memoire), /ERP type M/);
});

/* ── Une information peut valoir pour plusieurs zones ────────────────────── */

test("une information portant deux zones apparaît dans chacune", () => {
  // Un usage ou une contrainte acoustique vaut souvent pour deux parties sans
  // valoir partout. Devoir choisir obligerait à verser deux fois le même fait.
  const memoire = [ligne("deux", null, { zones: ["zone-a", "zone-b"] }), ligne("autre", null, { zones: ["zone-c"] })];

  assert.deepEqual(filterByZone(memoire, "zone-a").map((e) => e.id), ["deux"]);
  assert.deepEqual(filterByZone(memoire, "zone-b").map((e) => e.id), ["deux"]);
  assert.deepEqual(filterByZone(memoire, "zone-c").map((e) => e.id), ["autre"]);
});

test("une liste de zones vide vaut partout, comme l'absence de zone", () => {
  const memoire = [ligne("vide", null, { zones: [] }), ligne("nulle")];

  assert.equal(filterByZone(memoire, "zone-a").length, 2);
});

test("une seule colonne fait foi : l'ancienne est ignorée", () => {
  // Deux champs pour une même chose finissent par diverger. `zone` a vécu le
  // temps d'une version ; les lignes qui ne portaient qu'elle valent désormais
  // pour l'ensemble.
  assert.deepEqual(zonesOf({ zone: "Zone A" }), []);
  assert.deepEqual(zonesOf({ zone: "Zone A", zones: ["zone-b"] }), ["zone-b"]);
});

test("les doublons d'une même zone n'en font qu'une", () => {
  assert.deepEqual(zonesOf({ zones: ["Zone A", "zone-a", "zone a"] }), ["zone-a"]);
});

test("zonesOf ne suppose rien d'une affirmation sans zone", () => {
  assert.deepEqual(zonesOf({}), []);
  assert.deepEqual(zonesOf(), []);
});
