import { store } from "../store.js";
import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { renderProjectSituationsRunbar, bindProjectSituationsRunbar } from "./project-situations-runbar.js";
import { loadFlatSubjectsForCurrentProject } from "../services/project-subjects-supabase.js";
import {
  loadSituationsForCurrentProject,
  createSituation,
  loadSubjectsForSituation
} from "../services/project-situations-supabase.js";
import { createProjectSituationsState, getDefaultCreateForm } from "./project-situations/project-situations-state.js";
import { createProjectSituationsSelectors } from "./project-situations/project-situations-selectors.js";
import { createProjectSituationsSelection } from "./project-situations/project-situations-selection.js";
import { createProjectSituationsPersistence } from "./project-situations/project-situations-persistence.js";
import { createProjectSituationsTable } from "./project-situations/project-situations-table.js";
import { createProjectSituationsView } from "./project-situations/project-situations-view.js";
import { createProjectSituationsEvents } from "./project-situations/project-situations-events.js";
import { createProjectSituationsReviewState } from "./project-situations/project-situations-review-state.js";
import { createProjectSituationsThread } from "./project-situations/project-situations-thread.js";
import { createProjectSituationsKanbanView } from "./project-situations/project-situations-view-kanban.js";
import { renderGlobalHeader } from "./global-header.js";

export { getEffectiveSujetStatus, getEffectiveSituationStatus } from "./project-subjects.js";
import {
  getSujetKanbanStatusForSituation,
  setSujetKanbanStatusForSituation,
  openSubjectDrilldownFromSituation
} from "./project-subjects.js";

const { uiState, ensureSituationsViewState } = createProjectSituationsState({ store });

const {
  safeArray,
  firstNonEmpty,
  normalizeSituationMode,
  normalizeSituationStatus,
  getSituations,
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
  createSituationRecord
} = createProjectSituationsPersistence({
  store,
  uiState,
  safeArray,
  loadFlatSubjectsForCurrentProject,
  loadSituationsForCurrentProject,
  loadSubjectsForSituation,
  createSituation
});

const {
  renderSituationsTable
} = createProjectSituationsTable({
  store,
  uiState,
  getSituations,
  normalizeSituationMode,
  normalizeSituationStatus,
  renderSituationCount,
  formatSituationUpdatedLabel
});

const {
  renderPage,
  bindViewEvents
} = createProjectSituationsView({
  store,
  uiState,
  getDefaultCreateForm,
  normalizeSituationMode,
  renderSituationsTable,
  getSituationById,
  renderSituationKanban: (...args) => kanbanView.renderSituationKanban(...args)
});

createProjectSituationsReviewState({ store, uiState });
createProjectSituationsThread({ store, uiState });
const kanbanView = createProjectSituationsKanbanView({
  getSujetKanbanStatus: (...args) => getSujetKanbanStatusForSituation(...args),
  setSujetKanbanStatus: (...args) => setSujetKanbanStatusForSituation(...args),
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

function rerender(root) {
  if (!root || !document.body.contains(root)) return;
  root.className = "project-shell__content";
  syncProjectHeader(root);
  renderGlobalHeader();
  root.innerHTML = renderPage();
  syncSituationsToolbar();
  registerProjectPrimaryScrollSource(document.getElementById("projectSituationsScroll"));
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
  uiState,
  getDefaultCreateForm,
  normalizeSituationMode,
  buildCreateSituationPayload,
  rerender,
  refreshSituationsData,
  createSituationRecord,
  setSelectedSituationId,
  loadSituationSelection
});

export function renderProjectSituations(root) {
  rerender(root);
  refreshSituationsData(root, { forceSubjects: false }).catch(() => undefined);
}
