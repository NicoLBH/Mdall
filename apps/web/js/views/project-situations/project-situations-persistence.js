export function createProjectSituationsPersistence({
  store,
  uiState,
  safeArray,
  loadFlatSubjectsForCurrentProject,
  loadSituationsForCurrentProject,
  loadSubjectsForSituation,
  createSituation
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

  async function refreshSituationsData({ forceSubjects = false } = {}) {
    await loadFlatSubjectsForCurrentProject({ force: forceSubjects });
    const situations = await loadSituationsForCurrentProject();
    const countsEntries = await Promise.all(situations.map(async (situation) => {
      const subjects = await loadSubjectsForSituation(situation, store.projectSubjectsView).catch(() => []);
      return [String(situation?.id || ""), safeArray(subjects).length];
    }));
    uiState.countsBySituationId = Object.fromEntries(countsEntries);

    const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim() || String(situations[0]?.id || "").trim();
    if (selectedSituationId && selectedSituationId !== store.situationsView?.selectedSituationId) {
      store.situationsView.selectedSituationId = selectedSituationId;
    }

    if (selectedSituationId) {
      await loadSituationSelection(selectedSituationId);
    } else {
      uiState.selectedSituationSubjects = [];
      uiState.selectedSituationError = "";
      uiState.selectedSituationLoading = false;
    }

    return situations;
  }

  async function createSituationRecord(payload) {
    return createSituation(null, payload);
  }

  return {
    getSituationById,
    loadSituationSelection,
    refreshSituationsData,
    createSituationRecord
  };
}
