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
 *
 * ## Où elle vit maintenant, et pourquoi elle a encore bougé
 *
 * Elle vivait dans une case à elle, à côté de la barre de recherche. Deux états
 * filtrants pour un seul tableau : le menu pouvait dire « Fermés » pendant que
 * la barre disait `statut:ouvert`, et l'on ne savait plus lequel commandait.
 *
 * **Le filtre est donc dans la requête**, avec tous les autres. C'est le seul
 * état filtrant du tableau, et c'est celui qu'on peut lire, corriger, copier et
 * épingler. Ces tests portent sur le même souci qu'avant : que rien d'autre ne
 * puisse le contredire.
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
  projectSubjectsView: { requete: "", filters: { status: "open", priority: "" } },
  situationsView: { search: "", filters: { status: "open", priority: "" } }
});

/**
 * Le geste de l'utilisateur : le menu d'en-tête écrit dans la requête, comme
 * la barre et comme le rail. Un seul endroit, trois gestes.
 */
function clique(store, jeton) {
  store.projectSubjectsView.requete = jeton;
}

test("cliquer « Fermés » change le filtre", () => {
  const store = unStore();
  const selecteurs = selecteursSur(store);

  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "open");
  clique(store, "statut:fermé");
  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "closed");
});

/**
 * **Le test qui manquait.** La lecture se fait à chaque rendu ; il ne suffit pas
 * qu'elle soit juste une fois. C'est au second appel que le choix disparaissait.
 */
test("le choix survit aux rendus suivants", () => {
  const store = unStore();
  const selecteurs = selecteursSur(store);

  clique(store, "statut:fermé");
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

  clique(store, "statut:fermé");

  // Ce que fait `ensureSituationsViewState` : son propre filtre, dans l'ancien
  // état, sur la case que les deux se disputaient.
  store.situationsView.situationsStatusFilter = "open";
  store.situationsView.filters.status = "open";
  store.situationsView.subjectsStatusFilter = "open";

  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "closed");
});

/**
 * **Les anciennes cases ne commandent plus rien.** Les laisser lues « au cas
 * où » aurait rendu la divergence possible à nouveau : c'est exactement la
 * copie de trop que la réparation précédente avait ajoutée.
 */
test("une case d'état laissée derrière ne commande plus le filtre", () => {
  const store = unStore();
  const selecteurs = selecteursSur(store);

  store.projectSubjectsView.subjectsStatusFilter = "closed";
  store.projectSubjectsView.filters.status = "closed";

  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "open",
    "une case hors de la requête commande encore le tableau");
});

/** Et la requête se lit dans les deux sens : ce qu'on tape, le menu le montre. */
test("ce qui est tapé dans la barre allume le menu d'en-tête", () => {
  const store = unStore();
  const selecteurs = selecteursSur(store);

  store.projectSubjectsView.requete = "statut:fermé étanchéité";
  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "closed");

  store.projectSubjectsView.requete = "priorité:haute";
  assert.equal(selecteurs.getCurrentSubjectsPriorityFilter(), "high");
});

test("le filtre de priorité ne se laisse pas écraser non plus", () => {
  // Il portait la même faute, en sommeil faute d'un second écrivain.
  const store = unStore();
  const selecteurs = selecteursSur(store);

  store.projectSubjectsView.requete = "priorité:haute";
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

  // Un jeton non reconnu **reste du texte** : il cherche le mot, il ne filtre
  // rien. Interpréter au plus proche ferait disparaître des lignes sans que
  // personne comprenne pourquoi.
  store.projectSubjectsView.requete = "statut:n-importe-quoi";
  assert.equal(selecteurs.getCurrentSubjectsStatusFilter(), "open");
});

/* ── La liste elle-même ──────────────────────────────────────────────────── */

/**
 * **Le trou que la casse a révélé.** Les tests ci-dessus portaient tous sur ce
 * que les menus *lisent* ; aucun ne vérifiait que la liste *obéit*. On pouvait
 * donc supprimer le filtrage entier — rendre tous les sujets, quoi qu'il soit
 * écrit — sans qu'une seule assertion tombe.
 *
 * C'est le pire des défauts possibles sur cet écran : la liste a l'air filtrée,
 * et elle ne l'est pas.
 */

/** Un store avec de vrais sujets, et le vocabulaire du projet. */
function unStoreGarni() {
  const sujets = [
    { id: "s1", title: "Reprise d'étanchéité", status: "open", priority: "high" },
    { id: "s2", title: "Carrelage cuisine", status: "closed", priority: "low" },
    { id: "s3", title: "Étanchéité du pignon", status: "open", priority: "low" }
  ];

  return {
    user: { id: "p-1" },
    projectLots: { items: [] },
    projectCollaborators: { items: [] },
    situationsView: {},
    projectSubjectsView: {
      requete: "",
      filters: {},
      data: [],
      rawSubjectsResult: {
        subjectsById: Object.fromEntries(sujets.map((sujet) => [sujet.id, sujet])),
        labels: [{ id: "l-cr", name: "CR chantier" }],
        labelIdsBySubjectId: { s1: ["l-cr"] },
        objectives: [],
        assigneesBySubjectId: { s1: [{ id: "p-1", name: "Moi" }] },
        subjectLinks: [{ link_type: "blocked_by", source_subject_id: "s3" }]
      }
    }
  };
}

function selecteursGarnis(store) {
  return createProjectSubjectsSelectors({
    store,
    ensureViewUiState: () => {},
    getRunBucket: () => ({ bucket: {} }),
    getCustomSubjects: () => Object.values(store.projectSubjectsView.rawSubjectsResult.subjectsById),
    normalizeSubjectSituationIds: () => [],
    normalizeBackendPriority: (valeur) => String(valeur ?? ""),
    getEffectiveSujetStatus: (id) => {
      const sujets = store.projectSubjectsView.rawSubjectsResult.subjectsById;
      return String(sujets[id]?.status || "open");
    },
    matchSearch: () => true,
    firstNonEmpty: (...valeurs) => valeurs.find(Boolean) ?? ""
  });
}

const idsDe = (selecteurs) => selecteurs.getFilteredFlatSubjects().map((sujet) => sujet.id);

test("la liste obéit à la requête, et pas seulement les menus", () => {
  const store = unStoreGarni();
  const selecteurs = selecteursGarnis(store);

  // Par défaut, le statut vaut « ouverts » : deux des trois sujets.
  assert.deepEqual(idsDe(selecteurs).sort(), ["s1", "s3"]);

  store.projectSubjectsView.requete = "statut:fermé";
  assert.deepEqual(idsDe(selecteurs), ["s2"]);
});

test("chaque champ de la requête restreint vraiment la liste", () => {
  const store = unStoreGarni();
  const selecteurs = selecteursGarnis(store);

  store.projectSubjectsView.requete = "label:cr-chantier";
  assert.deepEqual(idsDe(selecteurs), ["s1"]);

  store.projectSubjectsView.requete = "label:aucun";
  assert.deepEqual(idsDe(selecteurs), ["s3"]);

  store.projectSubjectsView.requete = "assigné:moi";
  assert.deepEqual(idsDe(selecteurs), ["s1"]);

  store.projectSubjectsView.requete = "bloqué:oui";
  assert.deepEqual(idsDe(selecteurs), ["s3"]);

  // Et le texte libre cherche dans le titre, accents mis à part.
  store.projectSubjectsView.requete = "etancheite";
  assert.deepEqual(idsDe(selecteurs).sort(), ["s1", "s3"]);
});

/**
 * **Le statut garde son chemin.** Un sujet fermé par une décision non encore
 * versée n'a pas le statut de sa ligne : la liste lit le statut *effectif*, ce
 * que le service, qui ne connaît pas les décisions, ne peut pas faire.
 */
test("une décision non versée ferme le sujet dans la liste", () => {
  const store = unStoreGarni();
  const selecteurs = createProjectSubjectsSelectors({
    store,
    ensureViewUiState: () => {},
    getRunBucket: () => ({ bucket: {} }),
    getCustomSubjects: () => Object.values(store.projectSubjectsView.rawSubjectsResult.subjectsById),
    normalizeSubjectSituationIds: () => [],
    normalizeBackendPriority: (valeur) => String(valeur ?? ""),
    // s1 est fermé par une décision, sa ligne dit toujours « open ».
    getEffectiveSujetStatus: (id) => (id === "s1" ? "closed" : "open"),
    matchSearch: () => true,
    firstNonEmpty: (...valeurs) => valeurs.find(Boolean) ?? ""
  });

  assert.equal(idsDe(selecteurs).includes("s1"), false);
  store.projectSubjectsView.requete = "statut:fermé";
  assert.ok(idsDe(selecteurs).includes("s1"));
});

/** Le vocabulaire vient du projet : ce qu'il ne porte pas ne se propose pas. */
test("les champs déclarés sont ceux du projet", () => {
  const store = unStoreGarni();
  const selecteurs = selecteursGarnis(store);

  assert.deepEqual(selecteurs.getChampsDesSujets().map((champ) => champ.key),
    ["statut", "priorité", "bloqué", "label", "assigné"]);

  store.projectSubjectsView.rawSubjectsResult.labels = [];
  assert.deepEqual(selecteurs.getChampsDesSujets().map((champ) => champ.key),
    ["statut", "priorité", "bloqué", "assigné"]);
});
