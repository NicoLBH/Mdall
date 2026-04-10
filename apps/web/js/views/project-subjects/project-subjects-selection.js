export function createProjectSubjectsSelection({
  store,
  ensureViewUiState,
  getNestedSituation,
  getNestedSujet,
  getNestedAvis,
  getSituationBySujetId,
  getSituationByAvisId,
  getSujetByAvisId,
  getDraftSubjectSelection,
  getEffectiveAvisVerdict,
  openDetailsModal,
  rerenderPanels,
  markEntitySeen
}) {
  function getSelectionFromIds(selectionState, options = {}) {
    const {
      includeFallback = false,
      fallbackSource = store.situationsView.data || []
    } = options;

    if (selectionState?.selectedAvisId) {
      const avis = getNestedAvis(selectionState.selectedAvisId);
      if (avis) return { type: "avis", item: avis };
    }
    if (selectionState?.selectedSujetId) {
      const sujet = getNestedSujet(selectionState.selectedSujetId);
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
    ensureViewUiState();
    return getSelectionFromIds(store.situationsView, {
      includeFallback: true,
      fallbackSource: store.situationsView.data || []
    });
  }

  function getDrilldownSelection() {
    ensureViewUiState();
    return getSelectionFromIds(store.situationsView.drilldown);
  }

  function setActiveSelection(selection) {
    ensureViewUiState();
    store.situationsView.selectedSituationId = selection?.selectedSituationId || null;
    store.situationsView.selectedSujetId = selection?.selectedSujetId || null;
    store.situationsView.selectedAvisId = selection?.selectedAvisId || null;
    return getActiveSelection();
  }

  function setDrilldownSelection(selection) {
    ensureViewUiState();
    store.situationsView.drilldown.selectedSituationId = selection?.selectedSituationId || null;
    store.situationsView.drilldown.selectedSujetId = selection?.selectedSujetId || null;
    store.situationsView.drilldown.selectedAvisId = selection?.selectedAvisId || null;
    return getDrilldownSelection();
  }

  function clearSelection(scope = "active") {
    if (scope === "drilldown") return setDrilldownSelection(null);
    return setActiveSelection(null);
  }

  function selectSituation(situationId) {
    const situation = getNestedSituation(situationId);
    if (!situation) return null;

    setActiveSelection({
      selectedSituationId: situation.id,
      selectedSujetId: null,
      selectedAvisId: null
    });

    store.situationsView.showTableOnly = true;
    openDetailsModal();
    return { type: "situation", item: situation };
  }

  function selectSujet(sujetId) {
    const sujet = getNestedSujet(sujetId);
    if (!sujet) return null;

    const situation = getSituationBySujetId(sujetId);
    setActiveSelection({
      selectedSituationId: situation?.id || null,
      selectedSujetId: sujet.id,
      selectedAvisId: null
    });

    if (situation?.id) store.situationsView.expandedSituations.add(situation.id);

    store.situationsView.showTableOnly = true;
    openDetailsModal();
    return { type: "sujet", item: sujet };
  }

  function selectAvis(avisId) {
    const avis = getNestedAvis(avisId);
    if (!avis) return null;

    const sujet = getSujetByAvisId(avisId);
    const situation = getSituationByAvisId(avisId);

    setActiveSelection({
      selectedSituationId: situation?.id || null,
      selectedSujetId: sujet?.id || null,
      selectedAvisId: avis.id
    });

    if (situation?.id) store.situationsView.expandedSituations.add(situation.id);
    if (sujet?.id) store.situationsView.expandedSujets.add(sujet.id);

    store.situationsView.tempAvisVerdictFor = avis.id;
    store.situationsView.tempAvisVerdict = getEffectiveAvisVerdict(avis.id) || "F";

    store.situationsView.showTableOnly = false;
    markEntitySeen("avis", avis.id, { source: "details" });
    rerenderPanels();
    return { type: "avis", item: avis };
  }

  function getScopedSelection(root) {
    if (root?.closest?.("[data-create-subject-form]")) {
      return getDraftSubjectSelection();
    }
    if (root?.closest?.("#drilldownPanel")) {
      const selection = getDrilldownSelection();
      if (selection) return selection;
    }
    return getActiveSelection();
  }

  function currentDecisionTarget(root) {
    const selection = getScopedSelection(root);
    if (!selection?.item?.id) return null;
    return {
      type: selection.type,
      id: selection.item.id,
      item: selection.item
    };
  }

  function openDrilldownFromSituation(situationId) {
    const situation = getNestedSituation(situationId);
    if (!situation) return null;

    setDrilldownSelection({
      selectedSituationId: situation.id,
      selectedSujetId: null,
      selectedAvisId: null
    });
    markEntitySeen("situation", situation.id, { source: "drilldown" });
    return { type: "situation", item: situation };
  }

  function openDrilldownFromSujet(sujetId) {
    const sujet = getNestedSujet(sujetId);
    if (!sujet) return null;

    const situation = getSituationBySujetId(sujetId);
    setDrilldownSelection({
      selectedSituationId: situation?.id || null,
      selectedSujetId: sujet.id,
      selectedAvisId: null
    });

    store.situationsView.drilldown.expandedSujets.add(sujet.id);
    markEntitySeen("sujet", sujet.id, { source: "drilldown" });
    return { type: "sujet", item: sujet };
  }

  function openDrilldownFromAvis(avisId) {
    const avis = getNestedAvis(avisId);
    if (!avis) return null;

    const sujet = getSujetByAvisId(avisId);
    const situation = getSituationByAvisId(avisId);
    setDrilldownSelection({
      selectedSituationId: situation?.id || null,
      selectedSujetId: sujet?.id || null,
      selectedAvisId: avis.id
    });

    if (sujet?.id) store.situationsView.drilldown.expandedSujets.add(sujet.id);
    markEntitySeen("avis", avis.id, { source: "drilldown" });
    return { type: "avis", item: avis };
  }

  return {
    getActiveSelection,
    getDrilldownSelection,
    getScopedSelection,
    currentDecisionTarget,
    getSelectionFromIds,
    setActiveSelection,
    setDrilldownSelection,
    clearSelection,
    selectSituation,
    selectSujet,
    selectAvis,
    openDrilldownFromSituation,
    openDrilldownFromSujet,
    openDrilldownFromAvis
  };
}
