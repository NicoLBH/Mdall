export function createProjectSituationsPersistence({
  store,
  uiState,
  safeArray,
  loadFlatSubjectsForCurrentProject,
  loadSituationsForCurrentProject,
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

  async function refreshSituationsData({ forceSubjects = false } = {}) {
    await loadFlatSubjectsForCurrentProject({ force: forceSubjects });
    const situations = await loadSituationsForCurrentProject();
    store.situationsView.kanbanStatusBySituationId = await loadSituationKanbanStatusMap(situations.map((situation) => String(situation?.id || ""))).catch(() => ({}));
    const countsEntries = await Promise.all(situations.map(async (situation) => {
      const subjects = await loadSubjectsForSituation(situation, store.projectSubjectsView).catch(() => []);
      return [String(situation?.id || ""), safeArray(subjects).length];
    }));
    uiState.countsBySituationId = Object.fromEntries(countsEntries);

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
