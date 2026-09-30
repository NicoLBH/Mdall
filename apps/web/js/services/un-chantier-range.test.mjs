/**
 * Ranger un chantier, et ce que ce rangement refuse de faire.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  RANGEMENT, cestUnChantierRange, leGesteDuRangement, lesChantiersDe,
  lesComptesDuRangement, rangementValide
} from "./un-chantier-range.js";

const DES_CHANTIERS = [
  { id: "a", name: "Médiathèque" },
  { id: "b", name: "Gymnase", archivedAt: "2026-03-12T00:00:00.000Z" },
  { id: "c", name: "Vestiaires" }
];

test("les chantiers se rangent en deux piles, et le compte suit", () => {
  assert.deepEqual(lesChantiersDe(DES_CHANTIERS).map((un) => un.id), ["a", "c"]);
  assert.deepEqual(lesChantiersDe(DES_CHANTIERS, RANGEMENT.RANGES).map((un) => un.id), ["b"]);
  assert.deepEqual(lesComptesDuRangement(DES_CHANTIERS), { actifs: 2, archives: 1 });
});

/**
 * **Une date illisible ne range pas.** Mieux vaut un chantier de trop dans la
 * liste des vivants qu'un chantier disparu sans raison : on ne fait disparaître
 * que sur une date qu'on a su lire (règle 5).
 */
test("une date qu'on ne sait pas lire laisse le chantier en cours", () => {
  const boiteux = [{ id: "d", archivedAt: "rangé l'an dernier" }];
  assert.equal(cestUnChantierRange(boiteux[0]), false);
  assert.deepEqual(lesChantiersDe(boiteux).map((un) => un.id), ["d"]);
  assert.deepEqual(lesComptesDuRangement(boiteux), { actifs: 1, archives: 0 });
});

test("sans date, un chantier est en cours", () => {
  assert.equal(cestUnChantierRange({ id: "a" }), false);
  assert.equal(cestUnChantierRange({ id: "a", archivedAt: "" }), false);
  assert.equal(cestUnChantierRange({ id: "a", archivedAt: null }), false);
  assert.equal(cestUnChantierRange(null), false);
});

test("un filtre inconnu retombe sur les chantiers en cours", () => {
  assert.equal(rangementValide("archives"), RANGEMENT.RANGES);
  assert.equal(rangementValide("livres"), RANGEMENT.EN_COURS);
  assert.equal(rangementValide(""), RANGEMENT.EN_COURS);
  assert.equal(rangementValide(null), RANGEMENT.EN_COURS);
});

test("rien n'entre, rien ne sort", () => {
  assert.deepEqual(lesChantiersDe(null), []);
  assert.deepEqual(lesComptesDuRangement(null), { actifs: 0, archives: 0 });
});

/**
 * **Les deux comptes portent sur la même liste.** Un compte d'archives calculé
 * ailleurs finirait par annoncer douze archives dans un filtre qui n'en montre
 * que trois (règle 4).
 */
test("les deux comptes font le total de la liste", () => {
  const comptes = lesComptesDuRangement(DES_CHANTIERS);
  assert.equal(comptes.actifs + comptes.archives, DES_CHANTIERS.length);
});

/**
 * **Le bouton dit le geste, et dit que rien n'est supprimé.** « Archiver » sans
 * cette phrase se lit comme une suppression, et personne ne clique.
 */
test("le geste proposé suit l'état, et promet que rien ne disparaît", () => {
  const ranger = leGesteDuRangement({ id: "a" });
  assert.equal(ranger.quoi, "ranger");
  assert.match(ranger.bouton, /Archiver/);
  assert.match(ranger.dit, /rien ne sera supprimé/);

  const sortir = leGesteDuRangement({ id: "b", archivedAt: "2026-03-12T00:00:00.000Z" });
  assert.equal(sortir.quoi, "sortir");
  assert.match(sortir.bouton, /Remettre en cours/);
  assert.match(sortir.dit, /intact/);
});
