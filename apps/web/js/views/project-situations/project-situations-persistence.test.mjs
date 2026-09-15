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

function monter({ currentProjectId = null, situationsDuProjet = [], mesSituations = [], chargeIllisible = false } = {}) {
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
    chargerLesSujetsDesChantiers: async (chantiers) => {
      appels.push(`sujets-des-chantiers:${chantiers.join("+")}`);
      if (chargeIllisible) throw new Error("chantiers illisibles");
      return { subjectsData: [{ id: "x" }], rawSubjectsResult: { subjects: [{ id: "x" }] } };
    },
    loadSubjectsForSituation: async (situation, sujets) => {
      appels.push(`sujets-de:${situation.id}`);
      return sujets ? [{ id: "x" }, { id: "y" }] : null;
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
 * **Le carnet va chercher les sujets des chantiers que ses situations
 * désignent.** Sans eux, manuelles comme automatiques rendaient une liste vide
 * — ce qui se lit comme un chantier sans travail, alors que c'était un écran
 * sans données (règle 5).
 */
test("le carnet charge les sujets des chantiers de ses situations", async () => {
  const { portes, appels, uiState } = monter({
    mesSituations: [
      { ...MANUELLE, perimetre: { portee: "projet", projets: ["chantier-a"] } },
      { ...AUTOMATIQUE, perimetre: { portee: "choisis", projets: ["chantier-a", "chantier-b"] } }
    ]
  });

  await portes.refreshSituationsData();

  assert.ok(appels.includes("sujets-des-chantiers:chantier-a+chantier-b"), "une seule fois chaque chantier");
  // Les deux se comptent maintenant : l'automatique aussi a de quoi répondre.
  assert.deepEqual(uiState.countsBySituationId, { "s-manuelle": 2, "s-auto": 2 });
});

/**
 * **Une situation qui regarde tout ne nomme aucun chantier**, et ce n'est pas
 * une absence à combler : lui chercher des chantiers reviendrait à demander à
 * la base la liste de tout.
 */
test("celle qui regarde tout n'envoie chercher aucun chantier", async () => {
  const { portes, appels } = monter({ mesSituations: [{ ...MANUELLE, perimetre: { portee: "tous" } }] });

  await portes.refreshSituationsData();

  assert.ok(appels.includes("sujets-des-chantiers:"), "on demande, mais sans nommer de chantier");
});

/**
 * **Une charge qu'on n'a pas pu lire ne vaut pas zéro sujet.** La colonne dira
 * « — » : on ne sait pas, et le dire est la seule chose honnête à faire.
 */
test("sans charge, aucune situation ne reçoit un faux zéro", async () => {
  const { portes, uiState } = monter({
    mesSituations: [MANUELLE],
    chargeIllisible: true
  });

  await portes.refreshSituationsData();

  assert.deepEqual(uiState.countsBySituationId, {}, "aucune entrée : la colonne dira « — »");
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
