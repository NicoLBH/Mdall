import { estMonCarnet } from "../../services/mon-carnet.js";

export function createProjectSituationsPersistence({
  store,
  uiState,
  safeArray,
  loadFlatSubjectsForCurrentProject,
  loadSituationsForCurrentProject,
  loadMesSituations,
  loadManualSituationSubjectIds,
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
      const subjects = await loadSubjectsForSituation(selectedSituation, store.projectSubjectsView);
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
   * Combien de sujets chaque situation porte.
   *
   * ## Deux écrans, deux choses connues
   *
   * Sur l'écran d'un projet, les sujets du projet sont chargés : on résout
   * chaque situation contre eux, manuelle comme automatique.
   *
   * Dans le carnet, non — les sujets vivent dans des chantiers qu'on n'a pas
   * ouverts. Une situation **manuelle** se compte quand même : sa liste est
   * écrite en base, et la longueur d'une liste ne demande pas de connaître ce
   * qu'elle contient. Une situation **automatique** est une requête ; sans les
   * sujets, elle n'a pas de réponse.
   *
   * **Celles-là n'entrent donc pas dans le compte**, et la colonne dit « — ».
   * Leur donner zéro les ferait passer pour vides, ce qui est une affirmation,
   * pas une absence (règle 5).
   */
  async function compterLesSujets(situations) {
    const entrees = await Promise.all(situations.map(async (situation) => {
      const id = String(situation?.id || "");

      if (estMonCarnet(store)) {
        if (String(situation?.mode || "manual") !== "manual") return null;
        const ids = await loadManualSituationSubjectIds(id).catch(() => null);
        return ids ? [id, safeArray(ids).length] : null;
      }

      const subjects = await loadSubjectsForSituation(situation, store.projectSubjectsView).catch(() => []);
      return [id, safeArray(subjects).length];
    }));

    return Object.fromEntries(entrees.filter(Boolean));
  }

  async function refreshSituationsData({ forceSubjects = false } = {}) {
    // Le carnet n'a pas de projet courant : lui demander les sujets « du projet
    // courant » lèverait, et ce qu'il montre ne vient pas de là.
    const carnet = estMonCarnet(store);
    if (!carnet) await loadFlatSubjectsForCurrentProject({ force: forceSubjects });

    const situations = carnet ? await loadMesSituations() : await loadSituationsForCurrentProject();
    store.situationsView.kanbanStatusBySituationId = await loadSituationKanbanStatusMap(situations.map((situation) => String(situation?.id || ""))).catch(() => ({}));
    uiState.countsBySituationId = await compterLesSujets(situations);

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
