export function createProjectSubjectsSelection({
  store,
  ensureViewUiState,
  getNestedSituation,
  getNestedSujet,
  getSituationBySujetId,
  getDraftSubjectSelection,
  rerenderPanels,
  markEntitySeen
}) {
  function syncLegacySituationsView(selection = {}) {
    if (!(store.situationsView && typeof store.situationsView === "object")) return;
    if (Object.prototype.hasOwnProperty.call(selection, "selectedSituationId")) {
      store.situationsView.selectedSituationId = selection.selectedSituationId || null;
    }
    if (Object.prototype.hasOwnProperty.call(selection, "selectedSubjectId") || Object.prototype.hasOwnProperty.call(selection, "selectedSujetId")) {
      const selectedSubjectId = selection.selectedSubjectId || selection.selectedSujetId || null;
      store.situationsView.selectedSujetId = selectedSubjectId;
      store.situationsView.selectedSubjectId = selectedSubjectId;
    }
    if (Object.prototype.hasOwnProperty.call(selection, "showTableOnly")) {
      store.situationsView.showTableOnly = !!selection.showTableOnly;
    }
    if (Object.prototype.hasOwnProperty.call(selection, "detailsModalOpen")) {
      store.situationsView.detailsModalOpen = !!selection.detailsModalOpen;
    }
  }

  function getViewState() {
    ensureViewUiState();
    return store.projectSubjectsView || store.situationsView || {};
  }

  function getSelectionFromIds(selectionState, options = {}) {
    const { includeFallback = false, fallbackSource = getViewState().data || [] } = options;

    if (selectionState?.selectedSujetId || selectionState?.selectedSubjectId) {
      const sujet = getNestedSujet(selectionState.selectedSubjectId || selectionState.selectedSujetId);
      if (sujet) return { type: "sujet", item: sujet };
    }
    if (selectionState?.selectedSituationId) {
      const situation = getNestedSituation(selectionState.selectedSituationId);
      if (situation) return { type: "situation", item: situation };
    }

    if (!includeFallback) return null;
    const firstSituation = Array.isArray(fallbackSource) ? (fallbackSource[0] || null) : null;
    return firstSituation ? { type: "situation", item: firstSituation } : null;
  }

  function getActiveSelection() {
    return getSelectionFromIds(getViewState(), { includeFallback: true, fallbackSource: getViewState().data || [] });
  }

  function getDrilldownSelection() {
    return getSelectionFromIds(getViewState().drilldown);
  }

  function setActiveSelection(selection) {
    const v = getViewState();
    v.selectedSituationId = selection?.selectedSituationId || null;
    v.selectedSujetId = selection?.selectedSubjectId || selection?.selectedSujetId || null;
    v.selectedSubjectId = v.selectedSujetId;
    return getActiveSelection();
  }

  function setDrilldownSelection(selection) {
    const v = getViewState();
    v.drilldown.selectedSituationId = selection?.selectedSituationId || null;
    v.drilldown.selectedSujetId = selection?.selectedSubjectId || selection?.selectedSujetId || null;
    v.drilldown.selectedSubjectId = v.drilldown.selectedSujetId;
    return getDrilldownSelection();
  }

  function clearSelection(scope = "active") {
    if (scope === "drilldown") return setDrilldownSelection(null);
    return setActiveSelection(null);
  }

  function selectSituation(situationId) {
    const situation = getNestedSituation(situationId);
    if (!situation) return null;
    setActiveSelection({ selectedSituationId: situation.id, selectedSubjectId: null });
    getViewState().showTableOnly = true;
    syncLegacySituationsView({
      selectedSituationId: situation.id,
      selectedSubjectId: null,
      showTableOnly: true
    });
    openDetailsModal();
    return { type: "situation", item: situation };
  }

  function selectSubject(subjectId) {
    const sujet = getNestedSujet(subjectId);
    if (!sujet) return null;
    const situation = getSituationBySujetId(subjectId);
    const viewState = getViewState();
    setActiveSelection({ selectedSituationId: situation?.id || null, selectedSubjectId: sujet.id });
    if (situation?.id) viewState.expandedSituations.add(situation.id);
    viewState.showTableOnly = false;
    viewState.detailsModalOpen = false;
    syncLegacySituationsView({
      selectedSituationId: situation?.id || null,
      selectedSubjectId: sujet.id,
      showTableOnly: false,
      detailsModalOpen: false
    });
    document.body.classList.remove("modal-open");
    window.scrollTo({ top: 0, behavior: "auto" });
    rerenderPanels();
    return { type: "sujet", item: sujet };
  }

  function selectSujet(sujetId) {
    return selectSubject(sujetId);
  }

  function openSubjectDetails(subjectId) {
    if (subjectId) return selectSubject(subjectId);
    return getActiveSelection();
  }

  function getSelectionEntityType(type) {
    return type === "sujet" ? "sujet" : type;
  }

  function getScopedSelection(root) {
    if (root?.closest?.("[data-create-subject-form]")) return getDraftSubjectSelection();
    if (root?.closest?.("#drilldownPanel")) {
      const selection = getDrilldownSelection();
      if (selection) return selection;
    }
    return getActiveSelection();
  }

  function currentDecisionTarget(root) {
    const selection = getScopedSelection(root);
    if (!selection?.item?.id) return null;
    return { type: selection.type, id: selection.item.id, item: selection.item };
  }

  function openDrilldownFromSituation(situationId) {
    const situation = getNestedSituation(situationId);
    if (!situation) return null;
    setDrilldownSelection({ selectedSituationId: situation.id, selectedSubjectId: null });
    markEntitySeen("situation", situation.id, { source: "drilldown" });
    return { type: "situation", item: situation };
  }

  function openDrilldownFromSubject(subjectId) {
    const sujet = getNestedSujet(subjectId);
    if (!sujet) return null;
    const situation = getSituationBySujetId(subjectId);
    setDrilldownSelection({ selectedSituationId: situation?.id || null, selectedSubjectId: sujet.id });
    getViewState().drilldown.expandedSubjectIds.add(sujet.id);
    markEntitySeen("sujet", sujet.id, { source: "drilldown" });
    return { type: "sujet", item: sujet };
  }

  function openDrilldownFromSujet(sujetId) {
    return openDrilldownFromSubject(sujetId);
  }

  function openSubjectDrilldown(subjectId) {
    return openDrilldownFromSubject(subjectId);
  }

  return {
    getActiveSelection,
    getDrilldownSelection,
    getSelectionEntityType,
    getScopedSelection,
    currentDecisionTarget,
    getSelectionFromIds,
    setActiveSelection,
    setDrilldownSelection,
    clearSelection,
    selectSituation,
    selectSubject,
    selectSujet,
    openSubjectDetails,
    openDrilldownFromSituation,
    openDrilldownFromSubject,
    openDrilldownFromSujet,
    openSubjectDrilldown
  };
}
