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
    chargerLesPersonnesDesChantiers: async (chantiers) => {
      appels.push(`personnes-des-chantiers:${chantiers.join("+")}`);
      return [{ personId: "u-1", name: "Manoa" }];
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

/* ── Où en est chaque situation ──────────────────────────────────────────── */

/**
 * **L'avancement se calcule sur ce que la situation retient**, et non sur
 * `progress_percent` : cette colonne compte l'ancienne `subjects.situation_id`,
 * que personne n'écrit plus, et qu'une situation automatique ne porte pas du
 * tout (étape 5).
 */
test("l'avancement se calcule en même temps que le compte", async () => {
  const { portes, uiState } = monter({
    currentProjectId: "projet-1",
    situationsDuProjet: [MANUELLE]
  });

  await portes.refreshSituationsData();

  // Les deux faux sujets rendus par la porte sont ouverts : rien de clos.
  assert.deepEqual(uiState.avancementParSituationId["s-manuelle"], { total: 2, clos: 0, pourcentage: 0 });
});

/**
 * **Ne pas savoir n'est pas zéro.** Une situation dont les sujets n'ont pas pu
 * être lus n'a pas d'entrée — et l'écran n'affiche rien plutôt que « 0 % », qui
 * se lirait comme « rien n'a avancé » (règle 5).
 */
test("sans charge, aucune situation ne reçoit un avancement nul", async () => {
  const { portes, uiState } = monter({ mesSituations: [MANUELLE], chargeIllisible: true });

  await portes.refreshSituationsData();

  assert.deepEqual(uiState.avancementParSituationId, {});
});

/**
 * **Les personnes vont avec les sujets.** Sans elles, `champsDesSujets` ne
 * déclare ni « assigné », ni « auteur », ni « mention » — et trois des quatre
 * lectures du rail disparaissent sans que rien ne dise pourquoi (règle 5).
 */
test("le carnet charge aussi les personnes de ses chantiers", async () => {
  const { portes, appels, store } = monter({
    mesSituations: [{ ...MANUELLE, perimetre: { portee: "projet", projets: ["chantier-a"] } }]
  });

  await portes.refreshSituationsData();

  assert.ok(appels.includes("personnes-des-chantiers:chantier-a"));
  assert.deepEqual(store.situationsView.personnesDuCarnet, [{ personId: "u-1", name: "Manoa" }]);
});

/** Sur l'écran d'un projet, on ne va rien chercher de tel : il a les siennes. */
test("l'écran d'un projet ne recharge pas les personnes", async () => {
  const { portes, appels } = monter({ currentProjectId: "projet-1", situationsDuProjet: [MANUELLE] });

  await portes.refreshSituationsData();

  assert.ok(!appels.some((appel) => appel.startsWith("personnes-des-chantiers")));
});

/* ── Ouvrir une lecture du rail ──────────────────────────────────────────── */

const CHAMPS_DU_CARNET = [
  { key: "assigné", label: "Assignés", values: [{ value: "@moi", token: "moi" }], multiple: true },
  { key: "auteur", label: "Auteur", values: [{ value: "@moi", token: "moi" }] },
  { key: "mention", label: "Mentions", values: [{ value: "@moi", token: "moi" }], multiple: true },
  { key: "activité", label: "Activité", values: [{ value: "recente", token: "récente" }] }
];

function monterLeCarnet({ sujets = [], meta = {}, moi = "u-1" } = {}) {
  const store = {
    currentProjectId: null,
    situationsView: { data: [], selectedSituationId: null },
    projectSubjectsView: {}
  };
  const uiState = { countsBySituationId: {} };

  const portes = createProjectSituationsPersistence({
    store,
    uiState,
    safeArray: (valeur) => (Array.isArray(valeur) ? valeur : []),
    loadFlatSubjectsForCurrentProject: async () => [],
    loadSituationsForCurrentProject: async () => [],
    loadMesSituations: async () => [],
    chargerLesSujetsDesChantiers: async () => ({
      subjectsData: sujets,
      rawSubjectsResult: { subjects: sujets }
    }),
    chargerLesPersonnesDesChantiers: async () => [],
    champsDuCarnet: () => CHAMPS_DU_CARNET,
    metaDuCarnet: () => meta,
    moiDuCarnet: () => moi,
    loadSubjectsForSituation: async () => {
      throw new Error("une lecture ne doit pas passer par la porte des situations écrites");
    },
    ensureTrajectoryHistory: async () => {},
    loadSituationKanbanStatusMap: async () => ({}),
    createSituation: async () => ({}),
    updateSituation: async () => ({})
  });

  return { portes, store, uiState };
}

/**
 * **Le rail promettait sans tenir.** Cliquer « Assigné à moi » ne trouvait rien
 * à ouvrir : `getSituationById` ne connaissait que les situations écrites, et
 * les lectures n'en sont pas — elles existent parce que la question se pose à
 * tout le monde, pas parce qu'on les a rangées quelque part.
 */
test("une lecture du rail se retrouve comme une situation", () => {
  const { portes } = monterLeCarnet();

  assert.equal(portes.getSituationById("lecture:miens")?.title, "Assigné à moi");
  assert.equal(portes.getSituationById("lecture:recents")?.title, "Activité récente");
  assert.equal(portes.getSituationById("lecture:zoiseau"), null);
});

/**
 * **Une situation qui porte une requête se relit avec la grammaire des
 * sujets**, et non par la porte des situations écrites — celle-ci lève dans ce
 * montage, ce qui est exactement ce qu'on veut vérifier.
 *
 * « Assigné à moi » ne retient que les miens : c'est tout ce qu'elle promet, et
 * une lecture qui rendrait la liste entière serait pire qu'absente.
 */
test("les sujets d'une lecture se résolvent par sa requête", async () => {
  const { portes, uiState } = monterLeCarnet({
    sujets: [
      { id: "s-1", title: "Étanchéité", status: "open" },
      { id: "s-2", title: "Chaufferie", status: "open" }
    ],
    meta: { "s-1": { assignes: ["u-1"] }, "s-2": { assignes: ["u-2"] } },
    moi: "u-1"
  });

  // La liste doit être chargée avant qu'on ouvre quoi que ce soit.
  await portes.refreshSituationsData();
  await portes.loadSituationSelection("lecture:miens");

  assert.deepEqual(uiState.selectedSituationSubjects.map((sujet) => sujet.id), ["s-1"]);
});

/**
 * **Sans savoir qui regarde, « assigné:moi » ne s'applique pas** — et la liste
 * passe entière plutôt que de se vider. Une liste vide ferait croire qu'on n'a
 * aucun sujet, alors qu'on ne sait pas de qui il s'agit (règle 5).
 */
test("sans savoir qui regarde, la lecture ne vide pas la liste", async () => {
  const { portes, uiState } = monterLeCarnet({
    sujets: [{ id: "s-1", status: "open" }, { id: "s-2", status: "open" }],
    meta: { "s-1": { assignes: ["u-1"] } },
    moi: ""
  });

  await portes.refreshSituationsData();
  await portes.loadSituationSelection("lecture:miens");

  assert.deepEqual(uiState.selectedSituationSubjects.map((sujet) => sujet.id), ["s-1", "s-2"]);
});

/** Et son compte suit le même chemin : un seul calcul, pas deux (règle 4). */
test("le compte d'une lecture vient de la même résolution", async () => {
  const { portes, uiState, store } = monterLeCarnet({
    sujets: [{ id: "s-1", status: "open" }, { id: "s-2", status: "open" }],
    meta: { "s-1": { assignes: ["u-1"] }, "s-2": { assignes: ["u-2"] } },
    moi: "u-1"
  });

  store.situationsView.data = [];
  await portes.refreshSituationsData();
  await portes.loadSituationSelection("lecture:miens");

  assert.equal(uiState.selectedSituationSubjects.length, 1);
});
