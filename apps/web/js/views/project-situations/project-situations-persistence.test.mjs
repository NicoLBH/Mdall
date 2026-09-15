/**
 * Ce que l'écran des situations va chercher, selon d'où on le regarde.
 *
 * Le chemin s'exécute ici en entier, avec de fausses portes : on voit ce qui
 * est appelé, ce qui ne l'est pas, et ce qui atterrit dans le magasin. Un test
 * qui se contenterait de lire le code passerait sur l'appel qu'on a oublié de
 * brancher.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSituationsPersistence } from "./project-situations-persistence.js";

const MANUELLE = { id: "s-manuelle", mode: "manual", title: "Ma semaine" };
const AUTOMATIQUE = { id: "s-auto", mode: "automatic", title: "Tous les sujets ouverts" };

function monter({ currentProjectId = null, situationsDuProjet = [], mesSituations = [] } = {}) {
  const appels = [];
  const store = {
    currentProjectId,
    situationsView: { data: [], selectedSituationId: null },
    projectSubjectsView: {}
  };
  const uiState = { countsBySituationId: {} };

  const portes = createProjectSituationsPersistence({
    store,
    uiState,
    safeArray: (valeur) => (Array.isArray(valeur) ? valeur : []),
    loadFlatSubjectsForCurrentProject: async () => {
      appels.push("sujets-du-projet");
      return [];
    },
    loadSituationsForCurrentProject: async () => {
      appels.push("situations-du-projet");
      return situationsDuProjet;
    },
    loadMesSituations: async () => {
      appels.push("mes-situations");
      return mesSituations;
    },
    loadManualSituationSubjectIds: async (id) => {
      appels.push(`liste-manuelle:${id}`);
      return ["a", "b", "c"];
    },
    loadSubjectsForSituation: async (situation) => {
      appels.push(`sujets-de:${situation.id}`);
      return [{ id: "x" }, { id: "y" }];
    },
    ensureTrajectoryHistory: async () => {},
    loadSituationKanbanStatusMap: async () => ({}),
    createSituation: async () => ({}),
    updateSituation: async () => ({})
  });

  return { portes, appels, store, uiState };
}

/* ── Sur l'écran d'un projet ─────────────────────────────────────────────── */

test("l'écran d'un projet charge les situations du projet, et ses sujets", async () => {
  const { portes, appels, uiState } = monter({
    currentProjectId: "projet-1",
    situationsDuProjet: [MANUELLE, AUTOMATIQUE]
  });

  await portes.refreshSituationsData();

  assert.ok(appels.includes("sujets-du-projet"));
  assert.ok(appels.includes("situations-du-projet"));
  assert.ok(!appels.includes("mes-situations"), "le carnet n'a rien à faire ici");
  // Les deux se comptent : les sujets du projet sont là pour les résoudre.
  assert.deepEqual(uiState.countsBySituationId, { "s-manuelle": 2, "s-auto": 2 });
});

/* ── Dans le carnet ──────────────────────────────────────────────────────── */

/**
 * **Le carnet n'a pas de projet courant.** Lui demander « les sujets du projet
 * courant » lèverait, et ce qu'il montre ne vient pas de là.
 */
test("le carnet charge mes situations, et ne réclame pas les sujets d'un projet", async () => {
  const { portes, appels } = monter({ mesSituations: [MANUELLE] });

  await portes.refreshSituationsData();

  assert.ok(appels.includes("mes-situations"));
  assert.ok(!appels.includes("situations-du-projet"));
  assert.ok(!appels.includes("sujets-du-projet"), "il n'y a pas de projet courant à interroger");
});

/**
 * **Une liste se compte sans qu'on sache ce qu'elle contient.** Une situation
 * manuelle porte sa liste en base : sa longueur est un fait, même quand les
 * sujets vivent dans des chantiers qu'on n'a pas ouverts.
 */
test("dans le carnet, une situation manuelle se compte quand même", async () => {
  const { portes, uiState, appels } = monter({ mesSituations: [MANUELLE] });

  await portes.refreshSituationsData();

  assert.equal(uiState.countsBySituationId["s-manuelle"], 3);
  assert.ok(appels.includes("liste-manuelle:s-manuelle"));
});

/**
 * **Une automatique est une requête, et sans les sujets elle n'a pas de
 * réponse.** Lui donner zéro la ferait passer pour vide — une affirmation, pas
 * une absence. Elle n'entre donc pas dans le compte, et la colonne dit « — ».
 */
test("dans le carnet, une situation automatique ne reçoit pas un faux zéro", async () => {
  const { portes, uiState, appels } = monter({ mesSituations: [AUTOMATIQUE] });

  await portes.refreshSituationsData();

  assert.ok(
    !Object.prototype.hasOwnProperty.call(uiState.countsBySituationId, "s-auto"),
    "aucune entrée : la colonne dira « — », pas « 0 »"
  );
  assert.equal(uiState.countsBySituationId["s-auto"], undefined);
  assert.ok(!appels.includes("sujets-de:s-auto"), "on ne résout rien contre des sujets qu'on n'a pas");
});

/** Et les deux ensemble : l'une comptée, l'autre honnêtement muette. */
test("le carnet dit ce qu'il sait, et se tait sur le reste", async () => {
  const { portes, uiState } = monter({ mesSituations: [MANUELLE, AUTOMATIQUE] });

  await portes.refreshSituationsData();

  assert.deepEqual(uiState.countsBySituationId, { "s-manuelle": 3 });
});

/**
 * Une situation sélectionnée qui n'est plus dans la liste se déselectionne :
 * sinon le détail montrerait le contenu d'une situation qu'on ne voit plus.
 */
test("une sélection qui n'existe plus est abandonnée", async () => {
  const { portes, store } = monter({ mesSituations: [MANUELLE] });
  store.situationsView.selectedSituationId = "s-disparue";

  await portes.refreshSituationsData();

  assert.equal(store.situationsView.selectedSituationId, null);
});
