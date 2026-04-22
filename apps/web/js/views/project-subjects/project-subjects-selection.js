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
  const SUBJECTS_SELECTION_DEBUG_FLAG = "__MDALL_DEBUG_SUBJECTS_SELECTION__";

  function isSelectionDebugEnabled() {
    return typeof window !== "undefined" && window?.[SUBJECTS_SELECTION_DEBUG_FLAG] === true;
  }

  function debugSelection(eventName, payload = {}) {
    if (!isSelectionDebugEnabled()) return;
    console.info(`[subjects-selection] ${eventName}`, payload);
  }

  function markUserSelectionRevision(reason, selection = {}) {
    ensureViewUiState();
    const viewState = store.projectSubjectsView || {};
    const beforeRevision = Number(viewState.selectionRevision || 0);
    const nextRevision = beforeRevision + 1;
    viewState.selectionRevision = nextRevision;
    debugSelection("user select", {
      projectId: String(store.currentProjectId || "").trim() || null,
      requestId: Number(viewState.lastLoadRequestId || 0),
      selectionRevision: nextRevision,
      selectedSubjectIdBefore: normalizeSelectionSubjectId({
        selectedSubjectId: viewState.selectedSubjectId,
        selectedSujetId: viewState.selectedSujetId
      }),
      selectedSubjectIdAfter: normalizeSelectionSubjectId(selection),
      reason
    });
    return nextRevision;
  }

  function normalizeSelectionSubjectId(selection = {}) {
    return selection?.selectedSubjectId || selection?.selectedSujetId || null;
  }

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
    markUserSelectionRevision("select-situation", { selectedSubjectId: null });
    getViewState().showTableOnly = true;
    viewState.detailsModalOpen = false;
    syncLegacySituationsView({
      selectedSituationId: situation.id,
      selectedSubjectId: null,
      showTableOnly: true,
      detailsModalOpen: false
    });
    document.body.classList.remove("modal-open");
    rerenderPanels();
    return { type: "situation", item: situation };
  }

  function getDocumentScrollTop() {
    return Number(window.scrollY || window.pageYOffset || document.documentElement?.scrollTop || document.body?.scrollTop || 0);
  }

  function selectSubject(subjectId) {
    const sujet = getNestedSujet(subjectId);
    if (!sujet) return null;
    const situation = getSituationBySujetId(subjectId);
    const viewState = getViewState();
    if (viewState.showTableOnly) {
      viewState.tableScrollRestoreY = getDocumentScrollTop();
    }
    setActiveSelection({ selectedSituationId: situation?.id || null, selectedSubjectId: sujet.id });
    markUserSelectionRevision("select-subject", { selectedSubjectId: sujet.id });
    if (situation?.id) viewState.expandedSituations.add(situation.id);
    viewState.rightSubissuesOpen = true;
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

  function resolveScopeFromRoot(root) {
    if (root?.closest?.("[data-create-subject-form]")) return "draft";
    if (root?.closest?.("#drilldownPanel")) return "drilldown";
    return "active";
  }

  function debugSelectionScope(payload = {}) {
    if (!isSelectionDebugEnabled()) return;
    console.info("[subject-selection-scope] resolve", payload);
  }

  function getSelectionForScope(scopeName = "active", options = {}) {
    const normalizedScope = String(scopeName || "active").trim().toLowerCase();
    const {
      fallbackToActive = false,
      debugInputType = "scope",
      debugInputValue = scopeName
    } = options;
    let selection = null;
    if (normalizedScope === "draft") {
      selection = getDraftSubjectSelection?.() || null;
    } else if (normalizedScope === "drilldown") {
      selection = getDrilldownSelection();
    } else {
      selection = getActiveSelection();
    }

    if (!selection && fallbackToActive && normalizedScope !== "active") {
      selection = getActiveSelection();
    }

    debugSelectionScope({
      inputType: debugInputType,
      inputValue: debugInputValue,
      resolvedScope: normalizedScope,
      selectionId: selection?.item?.id || null
    });
    return selection || null;
  }

  function getScopedSelectionFromRoot(root, options = {}) {
    const resolvedScope = resolveScopeFromRoot(root);
    return getSelectionForScope(resolvedScope, {
      fallbackToActive: options.fallbackToActive === true,
      debugInputType: "root",
      debugInputValue: resolvedScope
    });
  }

  function getScopedSelection(root) {
    return getScopedSelectionFromRoot(root, { fallbackToActive: true });
  }

  function currentDecisionTarget(root) {
    const selection = getScopedSelectionFromRoot(root, { fallbackToActive: true });
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
    getSelectionForScope,
    getScopedSelectionFromRoot,
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
