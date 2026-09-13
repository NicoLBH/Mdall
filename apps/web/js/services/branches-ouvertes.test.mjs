/**
 * Le magasin des propositions ouvertes : ce qu'il rend, et quand.
 *
 * La lecture elle-même n'est pas rejouée ici — elle traverse la base, et ce
 * fichier n'en a pas. Ce qui se teste est la seule chose qui puisse mentir :
 * ce que le magasin **rend en attendant**, et ce qu'il fait quand on change de
 * projet. Les trois réponses ne se confondent pas, et c'est tout l'enjeu.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { store } from "../store.js";
import { branchesOuvertes, lesBranchesOntChange, oublierLesBranches } from "./branches-ouvertes.js";

test("sans projet affiché, rien n'est proposé et rien n'est prétendu", () => {
  store.currentProjectId = null;
  assert.deepEqual(branchesOuvertes(), []);
});

test("avant que la lecture ait répondu, le menu n'offre rien", () => {
  // `[]`, et non `null` : il n'y a rien à offrir *encore*. Rendre `null` ferait
  // afficher « lecture impossible » à chaque ouverture d'écran, pour une lecture
  // qui est simplement en route.
  oublierLesBranches();
  store.currentProjectId = "aurora-campus";
  assert.deepEqual(branchesOuvertes(), []);
});

test("changer de projet oublie le précédent au lieu de le proposer", () => {
  // Le pire des cas : proposer d'ajouter à une proposition d'un autre projet.
  // La clé de cache est celle de l'écran, immédiate, justement pour que ce
  // basculement se voie sans attendre d'avoir résolu quoi que ce soit.
  oublierLesBranches();
  store.currentProjectId = "aurora-campus";
  branchesOuvertes();
  store.currentProjectId = "autre-projet";
  assert.deepEqual(branchesOuvertes(), []);
});

test("oublier remet le magasin à zéro", () => {
  store.currentProjectId = "aurora-campus";
  branchesOuvertes();
  oublierLesBranches();
  assert.deepEqual(branchesOuvertes(), []);
  store.currentProjectId = null;
});

/* ── Le menu qui se refermait en s'ouvrant ───────────────────────────────── */

/**
 * **Le défaut que ce test existe pour empêcher.**
 *
 * La liste se relit à chaque ouverture du menu « Transformer » — c'est voulu :
 * proposer d'ajouter un lot à une proposition qu'un collègue vient de fusionner
 * enverrait le lot dans une branche fermée. Mais la relecture redessinait
 * l'écran **à tous les coups**, y compris quand elle n'avait rien appris : le
 * bouton était remplacé, et le menu qui venait de s'ouvrir disparaissait avec
 * lui. On cliquait, rien ne restait affiché, et l'on ne pouvait plus rien
 * proposer.
 */
test("une relecture qui n'apprend rien ne redessine pas", () => {
  const avant = [{ id: "p1", title: "Reprise des fondations" }];
  const apres = [{ id: "p1", title: "Reprise des fondations" }];

  assert.equal(lesBranchesOntChange(avant, apres), false);
});

test("une proposition de plus, de moins, ou renommée, redessine", () => {
  const une = [{ id: "p1", title: "Reprise des fondations" }];

  assert.equal(lesBranchesOntChange(une, [...une, { id: "p2", title: "Cloisons" }]), true);
  assert.equal(lesBranchesOntChange(une, []), true);
  assert.equal(lesBranchesOntChange(une, [{ id: "p1", title: "Reprise des semelles" }]), true);
});

/**
 * `null` n'est pas `[]` : l'un dit qu'on n'a pas pu regarder, l'autre qu'il n'y
 * a rien. Le menu ne les affiche pas pareil, donc le passage de l'un à l'autre
 * doit redessiner (règle 5).
 */
test("« on ne sait pas » et « il n'y en a aucune » ne se confondent pas", () => {
  assert.equal(lesBranchesOntChange(null, []), true);
  assert.equal(lesBranchesOntChange([], null), true);
  assert.equal(lesBranchesOntChange(null, null), false);
});
