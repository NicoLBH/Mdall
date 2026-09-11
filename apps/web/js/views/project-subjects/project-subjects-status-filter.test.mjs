import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSubjectsSelectors } from "./project-subjects-selectors.js";

/**
 * Le filtre « Ouverts / Fermés » des sujets, et pourquoi il a cassé deux fois.
 *
 * ## Ce qui n'allait pas, et que la première réparation n'a pas atteint
 *
 * Le filtre vivait dans **quatre** cases, entretenues par des copies dans les
 * deux sens : `subjectsStatusFilter` et `filters.status`, dans l'ancien état des
 * Situations **et** dans celui des Sujets. La première réparation a ajouté une
 * copie de plus — ce qui n'a fait que déplacer la divergence.
 *
 * Car `store.situationsView.filters.status` était partagé par **deux filtres
 * différents** : celui des Sujets et celui des Situations. Chaque normalisation
 * y réécrivait depuis sa propre source. Passer par l'onglet Situations remettait
 * donc « Ouverts » au tableau des Sujets, et le clic disparaissait au rendu
 * suivant sans que rien ne le dise.
 *
 * Une valeur écrite à deux endroits finit par diverger (règle 4). Le remède
 * n'est pas une copie de plus : c'est qu'il n'y en ait plus qu'une.
 */

/** Les sélecteurs, réduits à ce que le filtre leur demande. */
function selecteursSur(store) {
  return createProjectSubjectsSelectors({
    store,
    ensureViewUiState: () => {},
    getRunBucket: () => ({}),
    getCustomSubjects: () => [],
    normalizeSubjectSituationIds: () => [],
    normalizeBackendPriority: (valeur) => String(valeur ?? ""),
    getEffectiveSujetStatus: () => "",
    matchSearch: () => true,
    firstNonEmpty: (...valeurs) => valeurs.find(Boolean) ?? ""
  });
}

const unStore = () => ({
  projectSubjectsView: { filters: { status: "open", priority: "" } },
  situationsView: { filters: { status: "open", priority: "" } }
});

/** Le geste de l'utilisateur, écrit comme le gestionnaire de clic l'écrit. */
function clique(store, valeur) {
  store.projectSubjectsView.subjectsStatusFilter = valeur;
  store.projectSubjectsView.filters.status = valeur;
}

test("cliquer « Fermés » change le filtre", () => {
  const store = unStore();
  const selecteurs = selecteursSur(store);

  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "open");
  clique(store, "closed");
  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "closed");
});

/**
 * **Le test qui manquait.** La lecture se fait à chaque rendu ; il ne suffit pas
 * qu'elle soit juste une fois. C'est au second appel que le choix disparaissait.
 */
test("le choix survit aux rendus suivants", () => {
  const store = unStore();
  const selecteurs = selecteursSur(store);

  clique(store, "closed");
  selecteurs.getCurrentSubjectsStatusFilter();
  selecteurs.getCurrentSubjectsStatusFilter();

  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "closed", "le filtre s'est remis tout seul sur « Ouverts »");
});

/**
 * Le cas réel : on clique « Fermés » dans les Sujets, on passe par les
 * Situations — dont la normalisation écrit son propre statut dans l'ancien
 * état —, et l'on revient.
 */
test("passer par les Situations ne remet pas le filtre des Sujets sur « Ouverts »", () => {
  const store = unStore();
  const selecteurs = selecteursSur(store);

  clique(store, "closed");

  // Ce que fait `ensureSituationsViewState` : son propre filtre, dans l'ancien
  // état, sur la case que les deux se disputaient.
  store.situationsView.situationsStatusFilter = "open";
  store.situationsView.filters.status = "open";
  store.situationsView.subjectsStatusFilter = "open";

  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "closed");
});

test("le filtre de priorité ne se laisse pas écraser non plus", () => {
  // Il portait la même faute, en sommeil faute d'un second écrivain.
  const store = unStore();
  const selecteurs = selecteursSur(store);

  store.projectSubjectsView.subjectsPriorityFilter = "high";
  store.situationsView.subjectsPriorityFilter = "";
  store.situationsView.filters.priority = "";

  assert.equal(selecteurs.getCurrentSubjectsPriorityFilter(), "high");
});

/**
 * Ce qui ne devait pas partir avec la correction : les autres filtres de
 * l'ancien état continuent de suivre. Eux n'ont jamais été disputés, et les
 * couper au passage aurait remplacé un défaut par un autre.
 */
test("les autres filtres de l'ancien état suivent toujours", () => {
  const store = unStore();
  const selecteurs = selecteursSur(store);

  store.situationsView.filters.labelIds = ["etancheite"];
  selecteurs.getCurrentSubjectsStatusFilter();

  assert.deepEqual(store.projectSubjectsView.filters.labelIds, ["etancheite"]);
});

test("un filtre inconnu se lit « ouverts », jamais autre chose", () => {
  const store = unStore();
  const selecteurs = selecteursSur(store);

  store.projectSubjectsView.subjectsStatusFilter = "n'importe quoi";
  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "open");
});
