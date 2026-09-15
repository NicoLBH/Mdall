import { estMonCarnet } from "../../services/mon-carnet.js";
import { projetsDeCesSituations } from "../../services/perimetre-dune-situation.js";
import { avancementDe } from "../../services/avancement-dune-situation.js";

export function createProjectSituationsPersistence({
  store,
  uiState,
  safeArray,
  loadFlatSubjectsForCurrentProject,
  loadSituationsForCurrentProject,
  loadMesSituations,
  chargerLesSujetsDesChantiers,
  chargerLesPersonnesDesChantiers,
  loadSubjectsForSituation,
  ensureTrajectoryHistory,
  loadSituationKanbanStatusMap,
  createSituation,
  updateSituation
}) {
  function getSituationById(situationId) {
    const normalizedId = String(situationId || "").trim();
    if (!normalizedId) return null;
    return safeArray(store.situationsView?.data).find((situation) => String(situation?.id || "") === normalizedId) || null;
  }

  async function loadSituationSelection(situationId) {
    const normalizedId = String(situationId || "").trim();
    const selectedSituation = getSituationById(normalizedId);

    uiState.selectedSituationLoading = true;
    uiState.selectedSituationError = "";
    uiState.selectedSituationSubjects = [];

    if (!selectedSituation) {
      uiState.selectedSituationLoading = false;
      return [];
    }

    try {
      const subjects = await loadSubjectsForSituation(selectedSituation, sujetsDeReference());
      uiState.selectedSituationSubjects = safeArray(subjects);
      if (typeof ensureTrajectoryHistory === "function") {
        await ensureTrajectoryHistory({
          situationId: normalizedId,
          subjects: uiState.selectedSituationSubjects
        });
      }
      return uiState.selectedSituationSubjects;
    } catch (error) {
      console.error("loadSituationSelection failed", error);
      uiState.selectedSituationError = error instanceof Error ? error.message : "Impossible de charger les sujets de la situation.";
      uiState.selectedSituationSubjects = [];
      return [];
    } finally {
      uiState.selectedSituationLoading = false;
    }
  }

  /**
   * Les sujets contre lesquels les situations se résolvent.
   *
   * Sur l'écran d'un projet, ce sont ceux du projet. Dans le carnet, ce sont
   * ceux des chantiers que les situations désignent — et il faut aller les
   * chercher, sinon manuelles comme automatiques rendent une liste vide, ce qui
   * se lit comme un chantier sans travail alors que c'est un écran sans données
   * (règle 5, étape 3 bis).
   *
   * Une situation qui regarde **tout** ne nomme aucun chantier : il n'y a rien à
   * charger pour elle, et ce n'est pas une absence à combler.
   */
  async function sujetsContreLesquelsResoudre(situations) {
    if (!estMonCarnet(store)) return store.projectSubjectsView;

    const chantiers = projetsDeCesSituations(situations);
    const charge = await chargerLesSujetsDesChantiers(chantiers).catch(() => null);

    // **Les personnes vont avec.** Sans elles, `champsDesSujets` ne déclare ni
    // « assigné », ni « auteur », ni « mention » — et trois des quatre lectures
    // du rail disparaissent sans que rien ne dise pourquoi (règle 5).
    store.situationsView.personnesDuCarnet =
      await chargerLesPersonnesDesChantiers(chantiers).catch(() => []);

    // Gardée pour la sélection : ouvrir une situation ne doit pas tout relire.
    store.situationsView.sujetsDuCarnet = charge;
    return charge;
  }

  /** Les sujets d'une situation, cherchés là où l'écran courant les a rangés. */
  function sujetsDeReference() {
    return estMonCarnet(store) ? store.situationsView?.sujetsDuCarnet : store.projectSubjectsView;
  }

  /**
   * Combien de sujets chaque situation porte.
   *
   * Le même calcul sur les deux écrans, contre des sujets différents. Une
   * situation dont la charge n'a pas pu être lue n'entre pas dans le compte —
   * la colonne dira « — » plutôt que « 0 », parce qu'on ne sait pas.
   */
  async function compterLesSujets(situations, sujets) {
    if (!sujets) return { comptes: {}, avancements: {} };

    const entrees = await Promise.all(situations.map(async (situation) => {
      const id = String(situation?.id || "");
      const subjects = await loadSubjectsForSituation(situation, sujets).catch(() => null);
      return subjects ? [id, safeArray(subjects)] : null;
    }));

    const comptes = {};
    const avancements = {};

    for (const [id, subjects] of entrees.filter(Boolean)) {
      comptes[id] = subjects.length;
      // **Sur ce que la situation retient**, et non sur `progress_percent` :
      // cette colonne compte l'ancienne `subjects.situation_id`, que personne
      // n'écrit plus, et qu'une situation automatique ne porte pas du tout
      // (étape 5). Une seule vérité, celle qu'on affiche (règle 4).
      avancements[id] = avancementDe(subjects);
    }

    return { comptes, avancements };
  }

  async function refreshSituationsData({ forceSubjects = false } = {}) {
    // Le carnet n'a pas de projet courant : lui demander les sujets « du projet
    // courant » lèverait, et ce qu'il montre ne vient pas de là.
    const carnet = estMonCarnet(store);
    if (!carnet) await loadFlatSubjectsForCurrentProject({ force: forceSubjects });

    const situations = carnet ? await loadMesSituations() : await loadSituationsForCurrentProject();
    store.situationsView.kanbanStatusBySituationId = await loadSituationKanbanStatusMap(situations.map((situation) => String(situation?.id || ""))).catch(() => ({}));

    // Les sujets d'abord : sans eux, compter revient à compter zéro.
    const sujets = await sujetsContreLesquelsResoudre(situations);
    const { comptes, avancements } = await compterLesSujets(situations, sujets);
    uiState.countsBySituationId = comptes;
    uiState.avancementParSituationId = avancements;

    const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituationExists = selectedSituationId
      ? situations.some((situation) => String(situation?.id || "") === selectedSituationId)
      : false;

    if (selectedSituationId && !selectedSituationExists) {
      store.situationsView.selectedSituationId = null;
    }

    if (selectedSituationExists) {
      await loadSituationSelection(selectedSituationId);
    } else {
      uiState.selectedSituationSubjects = [];
      uiState.selectedSituationError = "";
      uiState.selectedSituationLoading = false;
    }

    return situations;
  }

  async function createSituationRecord(payload) {
    const created = await createSituation(store.currentProjectId, payload);
    return created;
  }

  async function updateSituationRecord(situationId, patch) {
    const updated = await updateSituation(situationId, patch);
    return updated;
  }

  return {
    getSituationById,
    loadSituationSelection,
    refreshSituationsData,
    createSituationRecord,
    updateSituationRecord
  };
}
