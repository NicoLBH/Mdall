import { store } from "../store.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import {
  PROJECT_SHELL_COMPACT_CHANGE_EVENT,
  setProjectCompactEnabled,
  refreshProjectShellChrome,
  syncProjectShellCompactFromScrollSource,
  registerProjectScrollSources,
  setProjectActiveScrollSource,
  clearProjectActiveScrollSource,
  setProjectViewHeader,
  debugProjectScrollPolicy
} from "./project-shell-chrome.js";
import { renderProjectSituationsRunbar, bindProjectSituationsRunbar } from "./project-situations-runbar.js";
import { loadFlatSubjectsForCurrentProject } from "../services/project-subjects-supabase.js";
import {
  setSubjectParentRelationInSupabase,
  reorderSubjectChildrenInSupabase
} from "../services/subject-parent-relation-service.js";
import {
  loadSituationsForCurrentProject,
  createSituation,
  updateSituation,
  loadSubjectsForSituation,
  loadSituationInsightsData,
  setSituationSubjectKanbanStatus,
  loadSituationKanbanStatusMap
} from "../services/project-situations-supabase.js";
import { createProjectSituationsState, getDefaultCreateForm, getSituationEditForm } from "./project-situations/project-situations-state.js";
import { createProjectSituationsSelectors } from "./project-situations/project-situations-selectors.js";
import { createProjectSituationsSelection } from "./project-situations/project-situations-selection.js";
import { createProjectSituationsPersistence } from "./project-situations/project-situations-persistence.js";
import { createProjectSituationsTable } from "./project-situations/project-situations-table.js";
import { createProjectSituationsView } from "./project-situations/project-situations-view.js";
import { createProjectSituationsEvents } from "./project-situations/project-situations-events.js";
import { createProjectSituationsReviewState } from "./project-situations/project-situations-review-state.js";
import { createProjectSituationsThread } from "./project-situations/project-situations-thread.js";
import { createProjectSituationsKanbanView } from "./project-situations/project-situations-view-kanban.js";
import { resolveKanbanScrollableSource } from "./project-situations-scroll-source.js";
import { renderGlobalHeader } from "./global-header.js";

export { getEffectiveSujetStatus, getEffectiveSituationStatus } from "./project-subjects.js";
import {
  getSujetKanbanStatusForSituation,
  setSujetKanbanStatusForSituation,
  openSubjectDrilldownFromSituation,
  openSituationDrilldownFromSelection,
  openSharedSubjectMetaDropdown,
  openSharedSubjectKanbanDropdown,
  closeSharedSubjectDropdowns,
  setSharedSubjectMetaDropdownQuery,
  setSharedSubjectKanbanDropdownQuery,
  toggleSubjectAssigneeFromSharedDropdown,
  toggleSubjectLabelFromSharedDropdown,
  toggleSubjectObjectiveFromSharedDropdown
} from "./project-subjects.js";

const { uiState, ensureSituationsViewState } = createProjectSituationsState({ store });

const {
  safeArray,
  firstNonEmpty,
  normalizeSituationMode,
  normalizeSituationStatus,
  getSituations,
  getCurrentSituationsStatusFilter,
  getSituationsStatusCounts,
  getPaginatedSituations,
  getSituationsPaginationState,
  getSituationsDataSourceInfo,
  renderSituationCount,
  formatSituationUpdatedLabel
} = createProjectSituationsSelectors({ store, uiState });

const {
  setSelectedSituationId
} = createProjectSituationsSelection({ store, ensureSituationsViewState });

const {
  getSituationById,
  loadSituationSelection,
  refreshSituationsData: refreshSituationsDataInternal,
  createSituationRecord,
  updateSituationRecord
} = createProjectSituationsPersistence({
  store,
  uiState,
  safeArray,
  loadFlatSubjectsForCurrentProject,
  loadSituationsForCurrentProject,
  loadSubjectsForSituation,
  loadSituationKanbanStatusMap,
  createSituation,
  updateSituation
});

const {
  renderSituationsTable
} = createProjectSituationsTable({
  store,
  uiState,
  getSituations,
  getPaginatedSituations,
  getSituationsPaginationState,
  getSituationsDataSourceInfo,
  normalizeSituationMode,
  normalizeSituationStatus,
  renderSituationCount,
  formatSituationUpdatedLabel,
  getCurrentSituationsStatusFilter,
  getSituationsStatusCounts
});

const {
  renderPage,
  bindViewEvents
} = createProjectSituationsView({
  store,
  uiState,
  getDefaultCreateForm,
  getSituationEditForm,
  normalizeSituationMode,
  renderSituationsTable,
  getSituationById,
  renderSituationKanban: (...args) => kanbanView.renderSituationKanban(...args)
});

createProjectSituationsReviewState({ store, uiState });
createProjectSituationsThread({ store, uiState });
const kanbanView = createProjectSituationsKanbanView({
  store,
  getSujetKanbanStatus: (...args) => getSujetKanbanStatusForSituation(...args),
  setSujetKanbanStatus: async (subjectId, nextStatus, options = {}) => {
    const updated = setSujetKanbanStatusForSituation(subjectId, nextStatus, options);
    if (!updated) return false;
    const situationId = String(options?.situationId || "").trim();
    if (!situationId) return false;
    try {
      await setSituationSubjectKanbanStatus(situationId, subjectId, nextStatus);
      if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
      store.situationsView.kanbanStatusBySituationId = {
        ...(store.situationsView.kanbanStatusBySituationId || {}),
        [situationId]: {
          ...((store.situationsView.kanbanStatusBySituationId || {})[situationId] || {}),
          [subjectId]: String(nextStatus || "").trim()
        }
      };
      return true;
    } catch (error) {
      console.error("setSituationSubjectKanbanStatus failed", error);
      await loadSituationKanbanStatusMap([situationId]).then((map) => {
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        store.situationsView.kanbanStatusBySituationId = {
          ...(store.situationsView.kanbanStatusBySituationId || {}),
          ...(map || {})
        };
      }).catch(() => undefined);
      throw error;
    }
  },
  openSubjectDrilldown: (...args) => openSubjectDrilldownFromSituation(...args),
  refreshAfterKanbanChange: async () => {
    const selectedId = String(store.situationsView?.selectedSituationId || "").trim();
    if (!selectedId) return;
    await loadSituationSelection(selectedId);
    const root = document.querySelector(".project-shell__content");
    if (root) rerender(root);
  }
});

function syncSituationsToolbar() {
  const toolbarHost = document.getElementById("situationsToolbarHost");
  if (!toolbarHost) return;
  toolbarHost.dataset.toolbarOwner = "situations";
  toolbarHost.innerHTML = "";
}

function parseCsvList(value) {
  return [...new Set(String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean))];
}

function buildCreateSituationPayload() {
  const form = uiState.createForm || getDefaultCreateForm();
  const mode = normalizeSituationMode(form.mode);
  const status = [
    form.automaticStatusOpen ? "open" : "",
    form.automaticStatusClosed ? "closed" : ""
  ].filter(Boolean);
  const priorities = [
    form.automaticPriorityLow ? "low" : "",
    form.automaticPriorityMedium ? "medium" : "",
    form.automaticPriorityHigh ? "high" : "",
    form.automaticPriorityCritical ? "critical" : ""
  ].filter(Boolean);

  return {
    title: firstNonEmpty(form.title, "Nouvelle situation"),
    description: firstNonEmpty(form.description, ""),
    status: "open",
    mode,
    filter_definition: mode === "automatic"
      ? {
          status,
          priorities,
          objectiveIds: parseCsvList(form.automaticObjectiveIds),
          labelIds: parseCsvList(form.automaticLabelIds),
          assigneeIds: parseCsvList(form.automaticAssigneeIds),
          blockedOnly: Boolean(form.automaticBlockedOnly)
        }
      : null
  };
}

function syncProjectHeader(root) {
  const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
  const selectedSituation = getSituationById(selectedSituationId);

  setProjectViewHeader({
    contextLabel: "Situations",
    variant: "situations",
    hideBar: true,
    compactLabel: "Situations",
    compactLabelSuffix: selectedSituation ? String(selectedSituation.title || "Situation") : "",
    onCompactLabelClick: selectedSituation
      ? () => {
          setSelectedSituationId(null);
          rerender(root);
        }
      : null
  });
}

let situationsTabResetBound = false;
let currentSituationsRoot = null;
let cleanupSituationsListeners = null;

function isKanbanScrollDebugEnabled() {
  try {
    return window.localStorage?.getItem("debug:situation-kanban-scroll") === "1";
  } catch (_) {
    return false;
  }
}

function debugKanbanScroll(label, payload) {
  if (!isKanbanScrollDebugEnabled()) return;
  console.info(label, payload);
}
let cleanupSituationsSyncEvents = null;

function syncSituationsAvailableHeight(root) {
  if (!root || !root.isConnected) return;
  const shell = root.querySelector(".project-page-shell--situation-view");
  if (!shell) return;
  const shellTop = shell.getBoundingClientRect().top;
  const availableHeight = Math.max(320, Math.round(window.innerHeight - shellTop));
  root.style.setProperty("--project-situations-available-h", `${availableHeight}px`);
}

function bindSituationsSyncEvents(root) {
  cleanupSituationsSyncEvents?.();
  const syncHeight = () => syncSituationsAvailableHeight(root);
  window.addEventListener("resize", syncHeight, { passive: true });
  window.addEventListener(PROJECT_SHELL_COMPACT_CHANGE_EVENT, syncHeight);
  cleanupSituationsSyncEvents = () => {
    window.removeEventListener("resize", syncHeight);
    window.removeEventListener(PROJECT_SHELL_COMPACT_CHANGE_EVENT, syncHeight);
  };
}

function bindSituationsTabReset() {
  if (situationsTabResetBound) return;
  situationsTabResetBound = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
    const detail = event?.detail || {};
    const tabId = String(detail.tabId || "").trim().toLowerCase();
    if (tabId !== "situations") return;

    const activeProjectId = String(store.currentProjectId || "").trim();
    const eventProjectId = String(detail.projectId || "").trim();
    if (eventProjectId && activeProjectId && eventProjectId !== activeProjectId) return;
    if (!currentSituationsRoot || !currentSituationsRoot.isConnected) return;

    if (store.situationsView && typeof store.situationsView === "object") {
      store.situationsView.selectedSituationId = null;
    }
    uiState.selectedSituationLoading = false;
    uiState.selectedSituationError = "";
    uiState.selectedSituationSubjects = [];
    uiState.createModalOpen = false;
    uiState.createSubmitting = false;
    uiState.createError = "";
    uiState.editPanelOpen = false;
    uiState.editSubmitting = false;
    uiState.editError = "";
    rerender(currentSituationsRoot);
  });
}

function rerender(root) {
  if (!root || !document.body.contains(root)) return;
  cleanupSituationsListeners?.();
  cleanupSituationsListeners = null;
  const hasSelectedSituation = !!String(store.situationsView?.selectedSituationId || "").trim();
  root.className = `project-shell__content${hasSelectedSituation ? " project-shell__content--situation-kanban" : ""}`;
  renderGlobalHeader();
  syncProjectHeader(root);
  refreshProjectShellChrome();
  root.innerHTML = renderPage();
  bindSituationsSyncEvents(root);
  syncSituationsAvailableHeight(root);
  syncSituationsToolbar();
  const primaryScrollRoot = document.getElementById("projectSituationsScroll");
  const tableScrollBody = root.querySelector(".issues-table .data-table-shell__body");
  const gridScrollBody = root.querySelector(".project-situation-alt-view--grid");
  const roadmapScrollBody = root.querySelector(".project-situation-alt-view--roadmap");
  const kanbanColumns = [...root.querySelectorAll(".situation-kanban__col")];
  const kanbanCardLists = [...root.querySelectorAll(".situation-kanban__cards")];
  if (kanbanColumns.length) {
    registerProjectScrollSources(kanbanCardLists);
  } else {
    clearProjectActiveScrollSource();
    registerProjectScrollSources(primaryScrollRoot, tableScrollBody, gridScrollBody, roadmapScrollBody);
  }
  debugProjectScrollPolicy("render-project-situations", {
    hasSelectedSituation,
    hasKanbanColumns: kanbanColumns.length > 0
  });

  const unbindColumnHandlers = [];
  const kanbanScrollElements = kanbanColumns.length
    ? [...new Set([...kanbanColumns, ...kanbanCardLists].filter(Boolean))]
    : [];

  const resolveAndActivateKanbanScrollableSource = (target, eventType = null, { syncImmediately = false } = {}) => {
    const sourceEl = resolveKanbanScrollableSource(target);
    if (!sourceEl) return;

    setProjectCompactEnabled(true);
    setProjectActiveScrollSource(sourceEl, { syncImmediately });

    const scrollTop = Number(sourceEl.scrollTop || 0);
    const nextCompact = scrollTop > 12;
    const didChange = document.body.classList.contains("project-shell-compact") !== nextCompact;
    debugKanbanScroll("[situations:kanban-scroll-source]", {
      eventType,
      sourceTag: sourceEl.tagName || null,
      sourceClass: sourceEl.className || null,
      scrollTop,
      nextCompact,
      didChange,
      syncImmediately
    });
  };

  kanbanScrollElements.forEach((source) => {
    const onKanbanMouseEnter = (event) => {
      const sourceEl = resolveKanbanScrollableSource(event?.target || source);
      if (!sourceEl) return;
      debugKanbanScroll("[situations:kanban-hover-ignored]", {
        eventType: event?.type || null,
        sourceTag: sourceEl.tagName || null,
        sourceClass: sourceEl.className || null,
        scrollTop: Number(sourceEl.scrollTop || 0),
        ignoredHover: true
      });
    };
    const prepareScrollSource = (event) => {
      resolveAndActivateKanbanScrollableSource(event?.target || source, event?.type || null, {
        syncImmediately: false
      });
    };
    const onKanbanScroll = (event) => {
      const sourceEl = event?.currentTarget;
      if (!sourceEl) return;
      syncProjectShellCompactFromScrollSource(sourceEl);

      const scrollTop = Number(sourceEl.scrollTop || 0);
      const nextCompact = scrollTop > 12;
      const didChange = document.body.classList.contains("project-shell-compact") !== nextCompact;
      debugKanbanScroll("[situations:kanban-scroll]", {
        eventType: event?.type || null,
        sourceTag: sourceEl.tagName || null,
        sourceClass: sourceEl.className || null,
        scrollTop,
        nextCompact,
        didChange
      });
      syncSituationsAvailableHeight(root);
    };
    source.addEventListener("mouseenter", onKanbanMouseEnter);
    source.addEventListener("wheel", prepareScrollSource, { passive: true });
    source.addEventListener("touchstart", prepareScrollSource, { passive: true });
    source.addEventListener("scroll", onKanbanScroll, { passive: true });
    unbindColumnHandlers.push(() => {
      source.removeEventListener("mouseenter", onKanbanMouseEnter);
      source.removeEventListener("wheel", prepareScrollSource);
      source.removeEventListener("touchstart", prepareScrollSource);
      source.removeEventListener("scroll", onKanbanScroll);
    });
  });
  cleanupSituationsListeners = () => {
    unbindColumnHandlers.forEach((unbind) => unbind());
  };
  bindEvents(root);
  bindViewEvents(root);
  kanbanView.bindKanbanEvents(root);
}

async function refreshSituationsData(root, { forceSubjects = false } = {}) {
  uiState.loading = true;
  uiState.error = "";
  rerender(root);

  try {
    await refreshSituationsDataInternal({ forceSubjects });
  } catch (error) {
    console.error("refreshSituationsData failed", error);
    uiState.error = error instanceof Error ? error.message : "Impossible de charger les situations.";
  } finally {
    uiState.loading = false;
    rerender(root);
  }
}

const { bindEvents } = createProjectSituationsEvents({
  store,
  uiState,
  getDefaultCreateForm,
  getSituationEditForm,
  normalizeSituationMode,
  buildCreateSituationPayload,
  rerender,
  refreshSituationsData,
  createSituationRecord,
  updateSituationRecord,
  setSelectedSituationId,
  getSituationById,
  loadSituationSelection,
  loadSituationInsightsData,
  openSituationDrilldownFromSelection,
  openSharedSubjectMetaDropdown: (...args) => openSharedSubjectMetaDropdown(...args),
  openSharedSubjectKanbanDropdown: (...args) => openSharedSubjectKanbanDropdown(...args),
  closeSharedSubjectDropdowns: (...args) => closeSharedSubjectDropdowns(...args),
  setSharedSubjectMetaDropdownQuery: (...args) => setSharedSubjectMetaDropdownQuery(...args),
  setSharedSubjectKanbanDropdownQuery: (...args) => setSharedSubjectKanbanDropdownQuery(...args),
  toggleSubjectAssigneeFromSharedDropdown: (...args) => toggleSubjectAssigneeFromSharedDropdown(...args),
  toggleSubjectLabelFromSharedDropdown: (...args) => toggleSubjectLabelFromSharedDropdown(...args),
  toggleSubjectObjectiveFromSharedDropdown: (...args) => toggleSubjectObjectiveFromSharedDropdown(...args),
  setSituationGridKanbanStatus: async (situationId, subjectId, nextStatus) => {
    const normalizedSituationId = String(situationId || "").trim();
    const normalizedSubjectId = String(subjectId || "").trim();
    const normalizedNextStatus = String(nextStatus || "").trim().toLowerCase();
    if (!normalizedSituationId || !normalizedSubjectId || !normalizedNextStatus) return false;
    try {
      await setSituationSubjectKanbanStatus(normalizedSituationId, normalizedSubjectId, normalizedNextStatus);
      if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
      store.situationsView.kanbanStatusBySituationId = {
        ...(store.situationsView.kanbanStatusBySituationId || {}),
        [normalizedSituationId]: {
          ...((store.situationsView.kanbanStatusBySituationId || {})[normalizedSituationId] || {}),
          [normalizedSubjectId]: normalizedNextStatus
        }
      };
      return true;
    } catch (error) {
      await loadSituationKanbanStatusMap([normalizedSituationId]).then((map) => {
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        store.situationsView.kanbanStatusBySituationId = {
          ...(store.situationsView.kanbanStatusBySituationId || {}),
          ...(map || {})
        };
      }).catch(() => undefined);
      throw error;
    }
  },
  setSituationGridSubjectParent: async (subjectId, parentSubjectId) => {
    return setSubjectParentRelationInSupabase({
      subjectId,
      parentSubjectId,
      rawSubjectsResult: store.projectSubjectsView?.rawSubjectsResult || null
    });
  },
  reorderSituationGridSubjectChildren: async (parentSubjectId, orderedChildIds = []) => {
    const normalizedParentId = String(parentSubjectId || "").trim();
    const normalizedChildIds = [...new Set((Array.isArray(orderedChildIds) ? orderedChildIds : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean))];
    if (!normalizedParentId || !normalizedChildIds.length) return [];
    return reorderSubjectChildrenInSupabase({
      parentSubjectId: normalizedParentId,
      orderedChildIds: normalizedChildIds
    });
  }
});

export function renderProjectSituations(root) {
  bindSituationsTabReset();
  currentSituationsRoot = root;
  // Les vues Situations doivent toujours piloter le compactage via leur source de scroll locale.
  setProjectCompactEnabled(true);
  if (store.situationsView && typeof store.situationsView === "object") {
    store.situationsView.selectedSituationId = null;
  }
  uiState.selectedSituationLoading = false;
  uiState.selectedSituationError = "";
  uiState.selectedSituationSubjects = [];
  cleanupSituationsSyncEvents?.();
  cleanupSituationsSyncEvents = null;
  rerender(root);
  refreshSituationsData(root, { forceSubjects: false }).catch(() => undefined);
}
