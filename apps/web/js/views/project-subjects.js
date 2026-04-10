import { store, DEFAULT_PROJECT_PHASES } from "../store.js";
import { ASK_LLM_URL_PROD } from "../constants.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import { loadExistingSubjectsForCurrentProject } from "../services/analysis-runner.js";
import {
  bindProjectSituationsRunbar,
  syncProjectSituationsRunbar
} from "./project-situations-runbar.js";
import { closeGlobalNav } from "./global-nav.js";
import {
  setProjectViewHeader,
  registerProjectPrimaryScrollSource,
  refreshProjectShellChrome
} from "./project-shell-chrome.js";
import { svgIcon } from "../ui/icons.js";
import { renderGhActionButton } from "./ui/gh-split-button.js";
import {
  renderDataTableShell,
  renderDataTableHead,
  renderDataTableEmptyState
} from "./ui/data-table-shell.js";
import {
  renderIssuesTable,
  renderSubIssuesTable,
  renderSubIssuesPanel
} from "./ui/issues-table.js";
import {
  renderProjectTableToolbar,
  renderProjectTableToolbarGroup,
  renderProjectTableToolbarSearch,
  renderProjectTableToolbarMeta
} from "./ui/project-table-toolbar.js";
import {
  renderMessageCard,
  renderMessageThread,
  renderMessageThreadComment,
  renderMessageThreadActivity,
  renderMessageThreadEvent
} from "./ui/message-thread.js";
import { renderCommentComposer } from "./ui/comment-composer.js";
import { renderTableHeadFilterToggle } from "./ui/table-head-filter-toggle.js";
import {
  renderOverlayChrome,
  renderOverlayChromeHead,
  setOverlayChromeOpenState,
  bindOverlayChromeDismiss,
  bindOverlayChromeCompact
} from "./ui/overlay-chrome.js";
import {
  normalizeVerdict,
  normalizeReviewState,
  renderStatusBadge,
  renderVerdictPill,
  renderStateDot,
  renderReviewStateIcon,
  renderCountBadge
} from "./ui/status-badges.js";
import { escapeHtml } from "../utils/escape-html.js";
import { renderSelectMenuSection } from "./ui/select-menu.js";
import {
  formatSharedDateInputValue,
  parseSharedDateInputValue,
  renderSharedDatePicker,
  shiftSharedCalendarMonth,
  toSharedDateInputValue
} from "./ui/shared-date-picker.js";
import { getSelectionDocumentRefs } from "../services/project-document-selectors.js";
import { persistSubjectIssueActionToSupabase } from "../services/project-supabase-sync.js";
import {
  getSituationsTableGridTemplate,
  renderFlatSujetRow,
  renderProjectSubjectsTable,
  renderSituationsTableHeadHtml
} from "./project-subjects/project-subjects-table.js";
import { createProjectSubjectDetailController } from "./project-subjects/project-subject-detail.js";
import { createProjectSubjectDrilldownController } from "./project-subjects/project-subject-drilldown.js";
import { createProjectSubjectMilestonesController } from "./project-subjects/project-subject-milestones.js";
import { createProjectSubjectsDetailsRenderer } from "./project-subjects/project-subjects-details-renderer.js";
import { createProjectSubjectLabelsController } from "./project-subjects/project-subject-labels.js";
import { createProjectSubjectsSelectors } from "./project-subjects/project-subjects-selectors.js";
import { createProjectSubjectsState } from "./project-subjects/project-subjects-state.js";
import { createProjectSubjectsPersistence } from "./project-subjects/project-subjects-persistence.js";
import { createProjectSubjectsSelection } from "./project-subjects/project-subjects-selection.js";
import { createProjectSubjectsReviewState } from "./project-subjects/project-subjects-review-state.js";
import { createProjectSubjectsDescription } from "./project-subjects/project-subjects-description.js";
import { createProjectSubjectsThread } from "./project-subjects/project-subjects-thread.js";
import { createProjectSubjectsActions } from "./project-subjects/project-subjects-actions.js";
import {
  HUMAN_STORE_KEY,
  createProjectSubjectsLegacyRapso
} from "./project-subjects/project-subjects-legacy-rapso.js";
import { createProjectSubjectsEvents } from "./project-subjects/project-subjects-events.js";
import { createProjectSubjectsView } from "./project-subjects/project-subjects-view.js";

let subjectsCurrentRoot = null;
let subjectsSupabaseReloadToken = 0;
const DRAFT_SUBJECT_ID = "__draft_subject__";

const SVG_ISSUE_OPEN = svgIcon("issue-opened");
const SVG_ISSUE_CLOSED = svgIcon("check-circle");
const SVG_ISSUE_REOPENED = SVG_ISSUE_OPEN;
const SVG_AVATAR_HUMAN = svgIcon("avatar-human", {
  width: 22,
  height: 22,
  className: "ui-icon ui-icon--block",
  style: "display:block"
});
const SVG_TL_CLOSED = svgIcon("check-circle", {
  className: "octicon octicon-check-circle Octicon__StyledOcticon-sc-jtj3m8-0 cdmDIS TimelineRow-module__Octicon__SMhVa"
});
const SVG_TL_REOPENED = svgIcon("issue-reopened", {
  className: "octicon octicon-issue-reopened Octicon__StyledOcticon-sc-jtj3m8-0 cdmDIS TimelineRow-module__Octicon__SMhVa"
});
const SVG_COMMENT = svgIcon("comment");


const projectSubjectsState = createProjectSubjectsState({ store });
const {
  ensureViewUiState,
  getSubjectsViewState,
  resetSubjectsViewTransientState,
  getSubjectsTabResetState: getSubjectsTabResetStateBase
} = projectSubjectsState;

const projectSubjectsPersistence = createProjectSubjectsPersistence({
  store,
  firstNonEmpty,
  humanStoreKey: HUMAN_STORE_KEY
});

const {
  currentRunKey,
  getRunBucket,
  persistRunBucket
} = projectSubjectsPersistence;

const projectSubjectsReviewState = createProjectSubjectsReviewState({
  store,
  firstNonEmpty,
  nowIso,
  normalizeReviewState,
  renderReviewStateIcon,
  getRunBucket,
  persistRunBucket,
  getNestedSituation: (entityId) => getNestedSituation(entityId),
  getNestedSujet: (entityId) => getNestedSujet(entityId),
  getNestedAvis: (entityId) => getNestedAvis(entityId)
});

const {
  getEntityByType,
  getEntityReviewMeta,
  setEntityReviewMeta,
  stashReviewRestoreSnapshot,
  restoreEntityReviewMeta,
  markEntitySeen,
  markEntityValidated,
  setEntityReviewState,
  getReviewTitleStateClass,
  renderEntityReviewLeadIcon
} = projectSubjectsReviewState;

const subjectsSelectors = createProjectSubjectsSelectors({
  store,
  ensureViewUiState,
  getRunBucket,
  getCustomSubjects,
  normalizeSubjectSituationIds,
  normalizeBackendPriority,
  getEffectiveAvisVerdict,
  getEffectiveSujetStatus,
  matchSearch,
  firstNonEmpty
});

const {
  getFilteredSituations,
  getStandaloneCustomSubjects,
  getFilteredStandaloneSubjects,
  getCurrentSubjectsStatusFilter,
  getCurrentSubjectsPriorityFilter,
  sujetMatchesPriorityFilter,
  getAvailableSubjectPriorities,
  sujetMatchesStatusFilter,
  getSubjectsStatusCounts,
  getVisibleCounts,
  getNestedSituation,
  getCanonicalSujetById,
  getSituationSubjects,
  getNestedSujet,
  getNestedAvis,
  getSituationBySujetId,
  getSituationByAvisId,
  getSujetByAvisId
} = subjectsSelectors;


const projectSubjectsSelection = createProjectSubjectsSelection({
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
  openDetailsModal: () => projectSubjectDetail.openDetailsModal(),
  rerenderPanels,
  markEntitySeen
});

const {
  getActiveSelection,
  getDrilldownSelection,
  getSelectionEntityType,
  getScopedSelection,
  currentDecisionTarget,
  selectSituation,
  selectSujet,
  selectAvis,
  openDrilldownFromSituation,
  openDrilldownFromSujet,
  openDrilldownFromAvis
} = projectSubjectsSelection;

const projectSubjectsThread = createProjectSubjectsThread({
  store,
  ensureViewUiState,
  firstNonEmpty,
  nowIso,
  fmtTs,
  mdToHtml,
  escapeHtml,
  svgIcon,
  SVG_AVATAR_HUMAN,
  SVG_ISSUE_CLOSED,
  SVG_ISSUE_REOPENED,
  SVG_TL_CLOSED,
  SVG_TL_REOPENED,
  renderGhActionButton,
  renderMessageThread,
  renderMessageThreadComment,
  renderMessageThreadActivity,
  renderMessageThreadEvent,
  renderCommentComposer,
  renderReviewStateIcon,
  getRunBucket,
  persistRunBucket,
  getEntityByType,
  getActiveSelection,
  getSelectionEntityType,
  getSituationBySujetId,
  getSituationByAvisId,
  getSujetByAvisId,
  getNestedSujet,
  getNestedAvis,
  getEffectiveAvisVerdict,
  getEffectiveSujetStatus,
  getEffectiveSituationStatus,
  entityDisplayLinkHtml,
  inferAgent,
  normActorName,
  miniAuthorIconHtml,
  verdictIconHtml
});

const {
  addComment,
  addActivity,
  setDecision,
  getDecision,
  getThreadForSelection,
  renderThreadBlock,
  renderIssueStatusAction,
  renderCommentBox
} = projectSubjectsThread;

const projectSubjectsDescription = createProjectSubjectsDescription({
  store,
  ensureViewUiState,
  firstNonEmpty,
  escapeHtml,
  svgIcon,
  mdToHtml,
  nowIso,
  SVG_AVATAR_HUMAN,
  getRunBucket,
  persistRunBucket,
  getSelectionEntityType,
  getEntityByType,
  getEntityReviewMeta,
  setEntityReviewMeta,
  currentDecisionTarget,
  rerenderScope: (root) => rerenderScope(root),
  addActivity: (entityType, entityId, kind, message, meta, options) => addActivity(entityType, entityId, kind, message, meta, options),
  markEntityValidated: (entityType, entityId, options) => markEntityValidated(entityType, entityId, options)
});

const {
  getEntityDescriptionState,
  setEntityDescriptionState,
  claimDescriptionAsHuman,
  clearDescriptionEditState,
  syncDescriptionEditorDraft,
  applyDescriptionSave,
  startDescriptionEdit,
  renderDescriptionCard
} = projectSubjectsDescription;

const projectSubjectsEvents = createProjectSubjectsEvents({
  store,
  PROJECT_TAB_RESELECTED_EVENT,
  getSubjectsViewState,
  getSubjectsTabResetState,
  renderSubjectMetaDropdownHost,
  getScopedSelection,
  getSubjectMetaMenuEntries,
  getSubjectSidebarMeta,
  rerenderScope,
  focusSubjectMetaSearch,
  focusSubjectKanbanSearch,
  syncSubjectMetaDropdownPosition,
  getSubjectMetaScopeRoot,
  closeSubjectMetaDropdown,
  closeSubjectKanbanDropdown,
  getSubjectKanbanMenuEntries,
  getSetSujetKanbanStatus: () => setSujetKanbanStatus,
  setSubjectMetaActiveEntry,
  getSetSubjectObjective: () => setSubjectObjective,
  getToggleSubjectSituation: () => toggleSubjectSituation,
  getToggleSubjectLabel: () => toggleSubjectLabel,
  syncDescriptionEditorDraft,
  startDescriptionEdit,
  clearDescriptionEditState,
  applyDescriptionSave,
  syncCommentPreview,
  applyCommentAction,
  getApplyIssueStatusAction: () => applyIssueStatusAction,
  showError,
  updateDrilldownPanel: () => projectSubjectDrilldown.updateDrilldownPanel(),
  openDrilldownFromSujetPanel: (sujetId) => projectSubjectDrilldown.openDrilldownFromSujet(sujetId),
  openDrilldownFromAvisPanel: (avisId) => projectSubjectDrilldown.openDrilldownFromAvis(avisId),
  selectSujet,
  rerenderPanels,
  resetSubjectsViewTransientState,
  resetObjectiveEditState,
  resetCreateSubjectForm,
  closeDetailsModal: () => projectSubjectDetail.closeDetailsModal(),
  closeDrilldown: () => projectSubjectDrilldown.closeDrilldown(),
  syncSituationsPrimaryScrollSource,
  reloadSubjectsFromSupabase,
  openCreateSubjectForm,
  createSubjectFromDraft,
  normalizeBackendPriority,
  selectSituation,
  selectAvis,
  bindOverlayChromeDismiss,
  bindOverlayChromeCompact,
  getProjectSubjectMilestones: () => projectSubjectMilestones,
  getSubjectsCurrentRoot: () => subjectsCurrentRoot,
  openDetailsModal: () => projectSubjectDetail.openDetailsModal()
});

const {
  resetSubjectsTabView,
  bindSubjectsTabReset,
  wireDetailsInteractive,
  bindModalEvents,
  bindDetailsScroll,
  bindSituationsEvents
} = projectSubjectsEvents;

const projectSubjectsDetailsRenderer = createProjectSubjectsDetailsRenderer({
  getActiveSelection,
  getSelectionEntityType,
  getEffectiveAvisVerdict,
  getEffectiveSujetStatus,
  getEffectiveSituationStatus,
  getEntityReviewMeta,
  getReviewTitleStateClass,
  entityDisplayLinkHtml,
  problemsCountsHtml,
  firstNonEmpty,
  escapeHtml,
  renderVerboseAvisVerdictPill,
  statePill,
  renderDescriptionCard,
  getSujetByAvisId,
  renderSubIssuesForSujet,
  renderSubIssuesForSituation,
  renderThreadBlock,
  renderCommentBox,
  renderDetailedMetaForSelection,
  renderSubjectMetaControls,
  renderDocumentRefsCard
});

const {
  renderDetailsTitleWrapHtml: renderSharedDetailsTitleWrapHtml,
  renderDetailsHtml: renderSharedDetailsHtml
} = projectSubjectsDetailsRenderer;

const projectSubjectDetail = createProjectSubjectDetailController({
  store,
  setOverlayChromeOpenState,
  getActiveSelection,
  getSelectionEntityType,
  renderDetailsHtml: renderSharedDetailsHtml,
  renderDetailsTitleWrapHtml: renderSharedDetailsTitleWrapHtml,
  wireDetailsInteractive,
  bindDetailsScroll,
  ensureDrilldownDom: () => projectSubjectDrilldown.ensureDrilldownDom(),
  closeGlobalNav,
  markEntitySeen
});

const projectSubjectDrilldown = createProjectSubjectDrilldownController({
  store,
  setOverlayChromeOpenState,
  closeGlobalNav,
  renderOverlayChrome,
  renderOverlayChromeHead,
  bindOverlayChromeDismiss,
  getDrilldownSelection,
  openDrilldownFromSituationSelection: openDrilldownFromSituation,
  openDrilldownFromSujetSelection: openDrilldownFromSujet,
  openDrilldownFromAvisSelection: openDrilldownFromAvis,
  renderDetailsHtml: renderSharedDetailsHtml,
  renderDetailsTitleWrapHtml: renderSharedDetailsTitleWrapHtml,
  wireDetailsInteractive,
  bindDetailsScroll,
  ensureViewUiState
});

const projectSubjectMilestones = createProjectSubjectMilestonesController({
  store,
  ensureViewUiState,
  escapeHtml,
  svgIcon,
  renderProjectTableToolbar,
  renderProjectTableToolbarGroup,
  renderTableHeadFilterToggle,
  renderIssuesTable,
  renderDataTableEmptyState,
  renderSharedDatePicker,
  formatSharedDateInputValue,
  parseSharedDateInputValue,
  shiftSharedCalendarMonth,
  toSharedDateInputValue,
  renderSubjectsToolbarButton,
  renderSituationsAddAction,
  getObjectiveById,
  getObjectives,
  persistRunBucket,
  statePill,
  getCurrentSubjectsStatusFilter,
  getCurrentSubjectsPriorityFilter,
  sujetMatchesStatusFilter,
  sujetMatchesPriorityFilter,
  getSituationBySujetId,
  getNestedSujet,
  renderFlatSujetRow,
  getSituationsTableGridTemplate,
  renderSituationsTableHeadHtml,
  getSubjectsTableDeps,
  renderSubjectsPriorityHeadHtml,
  problemsCountsIconHtml,
  rerenderPanels: () => rerenderPanels()
});

const projectSubjectLabels = createProjectSubjectLabelsController({
  store,
  escapeHtml,
  renderIssuesTable,
  normalizeSubjectLabelKey,
  getSubjectSidebarMeta
});

const projectSubjectsActions = createProjectSubjectsActions({
  store,
  DRAFT_SUBJECT_ID,
  ensureViewUiState,
  buildDefaultDraftSubjectMeta,
  persistRunBucket,
  nowIso,
  normalizeSujetKanbanStatus,
  getSujetKanbanStatus,
  getNestedSituation,
  getNestedSujet,
  getSituationSubjects,
  currentDecisionTarget,
  getSelectionEntityType,
  normalizeReviewState,
  setDecision,
  addActivity,
  getEntityReviewMeta,
  stashReviewRestoreSnapshot,
  restoreEntityReviewMeta,
  markEntityValidated,
  claimDescriptionAsHuman,
  setEntityReviewState,
  rerenderScope: (root) => rerenderScope(root),
  reloadSubjectsFromSupabase: (root, options) => reloadSubjectsFromSupabase(root, options),
  persistSubjectIssueActionToSupabase,
  showError,
  getSubjectSidebarMeta,
  normalizeSubjectObjectiveIds,
  normalizeSubjectSituationIds,
  normalizeSubjectLabels,
  normalizeSubjectLabelKey,
  getObjectives
});

const {
  setSujetKanbanStatus,
  setSubjectObjectiveIds,
  setSubjectSituationIds,
  toggleSubjectSituation,
  setSubjectLabels,
  toggleSubjectLabel,
  setSubjectObjective,
  applyReviewStateChange,
  applyRestoreReviewState,
  applyValidateEntity,
  applyIssueStatusAction
} = projectSubjectsActions;


function resetObjectiveEditState() {
  projectSubjectMilestones.resetObjectiveEditState();
}

function getSubjectsTabResetState() {
  return {
    ...getSubjectsTabResetStateBase(),
    hasConnectedRoot: !!(subjectsCurrentRoot && subjectsCurrentRoot.isConnected)
  };
}

/* =========================================================
   Legacy DOM / archive parity helpers
========================================================= */

function verdictTone(verdict) {
  const map = {
    F: "verdict-f",
    S: "verdict-s",
    D: "verdict-d",
    HM: "verdict-hm",
    PM: "verdict-pm",
    SO: "verdict-so"
  };
  return map[String(verdict || "").toUpperCase()] || "default";
}

function renderVerdictActionButtons(activeVerdict) {
  const verdicts = ["F", "S", "D", "HM", "PM", "SO"];

  return `
    <div class="verdict-switch" role="group" aria-label="Verdict">
      ${verdicts.map((v) => `
        <div class="verdict-switch__item ${v === activeVerdict ? "is-active" : ""}">
          ${renderGhActionButton({
            id: `verdict-${v}`,
            label: v,
            tone: verdictTone(v),
            size: "sm",
            mainAction: `set-verdict:${v}`,
            withChevron: false,
            className: "verdict-switch__action"
          })}
        </div>
      `).join("")}
    </div>
  `;
}

function mdToHtml(text) {
  const safe = escapeHtml(text || "");
  return safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function nowIso() {
  return new Date().toISOString();
}

function showError(message) {
  console.error(message);
}

const projectSubjectsView = createProjectSubjectsView({
  store,
  DRAFT_SUBJECT_ID,
  DEFAULT_PROJECT_PHASES,
  SVG_ISSUE_OPEN,
  SVG_ISSUE_CLOSED,
  ensureViewUiState,
  getSubjectsViewState,
  currentRunKey,
  getRunBucket,
  persistRunBucket,
  escapeHtml,
  svgIcon,
  renderGhActionButton,
  renderProjectTableToolbar,
  renderProjectTableToolbarGroup,
  renderProjectTableToolbarSearch,
  renderIssuesTable,
  renderSubIssuesTable,
  renderSubIssuesPanel,
  renderDataTableHead,
  renderDataTableEmptyState,
  renderTableHeadFilterToggle,
  renderStatusBadge,
  renderVerdictPill,
  renderStateDot,
  normalizeVerdict,
  normalizeReviewState,
  getSelectionDocumentRefs,
  renderSelectMenuSection,
  mdToHtml,
  firstNonEmpty,
  nowIso,
  getDecision: (...args) => getDecision(...args),
  getEntityDescriptionState: (...args) => getEntityDescriptionState(...args),
  setEntityDescriptionState: (...args) => setEntityDescriptionState(...args),
  getEntityReviewMeta: (...args) => getEntityReviewMeta(...args),
  getReviewTitleStateClass: (...args) => getReviewTitleStateClass(...args),
  getNestedSituation: (...args) => getNestedSituation(...args),
  getNestedSujet: (...args) => getNestedSujet(...args),
  getNestedAvis: (...args) => getNestedAvis(...args),
  getSituationSubjects: (...args) => getSituationSubjects(...args),
  getFilteredStandaloneSubjects: (...args) => getFilteredStandaloneSubjects(...args),
  getCurrentSubjectsStatusFilter: (...args) => getCurrentSubjectsStatusFilter(...args),
  getCurrentSubjectsPriorityFilter: (...args) => getCurrentSubjectsPriorityFilter(...args),
  sujetMatchesStatusFilter: (...args) => sujetMatchesStatusFilter(...args),
  sujetMatchesPriorityFilter: (...args) => sujetMatchesPriorityFilter(...args),
  getAvailableSubjectPriorities: (...args) => getAvailableSubjectPriorities(...args),
  getSubjectsStatusCounts: (...args) => getSubjectsStatusCounts(...args),
  getProjectSubjectMilestones: () => projectSubjectMilestones,
  getProjectSubjectLabels: () => projectSubjectLabels,
  getProjectSubjectDetail: () => projectSubjectDetail,
  getProjectSubjectDrilldown: () => projectSubjectDrilldown,
  getProjectSubjectsLegacyRapso: () => projectSubjectsLegacyRapso,
  loadExistingSubjectsForCurrentProject,
  getSubjectsCurrentRoot: () => subjectsCurrentRoot,
  registerProjectPrimaryScrollSource,
  getFilteredSituations: (...args) => getFilteredSituations(...args),
  getVisibleCounts: (...args) => getVisibleCounts(...args),
  renderProjectSubjectsTable,
  wireDetailsInteractive: (...args) => wireDetailsInteractive(...args),
  bindDetailsScroll: (...args) => bindDetailsScroll(...args),
  refreshProjectShellChrome,
  currentDecisionTarget: (...args) => currentDecisionTarget(...args),
  addComment: (...args) => addComment(...args),
  getScopedSelection: (...args) => getScopedSelection(...args)
});

const {
  normalizeBackendPriority,
  priorityBadge,
  renderVerboseAvisVerdictPill,
  statePill,
  entityDisplayLinkHtml,
  renderDocumentRefsCard,
  inferAgent,
  normActorName,
  miniAuthorIconHtml,
  verdictIconHtml,
  getDraftSubjectSelection,
  buildDefaultDraftSubjectMeta,
  resetCreateSubjectForm,
  openCreateSubjectForm,
  getCustomSubjects,
  createSubjectFromDraft,
  normalizeSujetKanbanStatus,
  getSujetKanbanStatus,
  normalizeSubjectObjectiveIds,
  normalizeSubjectSituationIds,
  normalizeSubjectLabelKey,
  normalizeSubjectLabels,
  getSubjectSidebarMeta,
  getObjectives,
  getObjectiveById,
  problemsCountsHtml,
  problemsCountsIconHtml,
  renderDetailedMetaForSelection,
  renderSubjectMetaControls,
  renderSubIssuesForSujet,
  renderSubIssuesForSituation,
  closeSubjectMetaDropdown,
  closeSubjectKanbanDropdown,
  getSubjectMetaMenuEntries,
  setSubjectMetaActiveEntry,
  getSubjectKanbanMenuEntries,
  renderSubjectMetaDropdownHost,
  focusSubjectMetaSearch,
  focusSubjectKanbanSearch,
  syncSubjectMetaDropdownPosition,
  getSubjectMetaScopeRoot,
  renderSubjectsToolbarButton,
  renderSituationsAddAction,
  renderSubjectsPriorityHeadHtml,
  getSubjectsTableDeps,
  renderCreateSubjectFormHtml,
  rerenderSubjectsToolbar,
  syncSituationsPrimaryScrollSource,
  rerenderPanels,
  rerenderScope,
  syncCommentPreview,
  applyCommentAction
} = projectSubjectsView;

export function getEffectiveSujetStatus(...args) {
  return projectSubjectsView.getEffectiveSujetStatus(...args);
}

export function getEffectiveAvisVerdict(...args) {
  return projectSubjectsView.getEffectiveAvisVerdict(...args);
}

export function getEffectiveSituationStatus(...args) {
  return projectSubjectsView.getEffectiveSituationStatus(...args);
}


const projectSubjectsLegacyRapso = createProjectSubjectsLegacyRapso({
  store,
  ASK_LLM_URL_PROD,
  escapeHtml,
  renderMessageThreadComment,
  nowIso,
  fmtTs,
  mdToHtml,
  SVG_AVATAR_HUMAN,
  firstNonEmpty,
  getRunBucket,
  getNestedSituation,
  getSituationBySujetId,
  getSituationByAvisId,
  getNestedSujet,
  getSujetByAvisId,
  getNestedAvis,
  getEffectiveSituationStatus,
  getEffectiveSujetStatus,
  getEffectiveAvisVerdict,
  addComment,
  persistRunBucket,
  rerenderPanels,
  showError
});





/* =========================================================
   Public render
========================================================= */

export function renderProjectSubjects(root) {
  ensureViewUiState();
  projectSubjectDrilldown.ensureDrilldownDom();
  subjectsCurrentRoot = root;
  bindSubjectsTabReset();
  store.situationsView.showTableOnly = true;
  store.situationsView.displayDepth = "sujets";

  reloadSubjectsFromSupabase(root, {
    rerender: true,
    updateModal: true
  }).catch(() => undefined);

  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Sujets",
    variant: "situations",
    toolbarHtml: ""
  });

  const headerRoot = document.getElementById("projectViewHeaderHost");
  const toolbarHost = document.getElementById("situationsToolbarHost");
  store.situationsView.subjectsSubview = String(store.situationsView.subjectsSubview || "subjects");
  if (store.situationsView.subjectsSubview !== "objectives") {
    store.situationsView.selectedObjectiveId = "";
  }
  const data = store.situationsView.data || [];
  const firstSituationId = data[0]?.id || null;

  if (!store.situationsView.selectedSituationId && firstSituationId) {
    store.situationsView.selectedSituationId = firstSituationId;
  }
  if (!store.situationsView.expandedSituations.size && firstSituationId) {
    store.situationsView.expandedSituations.add(firstSituationId);
  }

  if (toolbarHost) {
    rerenderSubjectsToolbar();
  }

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectSituationsScroll">
        <div class="settings-content project-page-shell project-page-shell--content">
          <section class="gh-panel gh-panel--results" aria-label="Results">
            <div id="situationsPanelHost"></div>
          </section>
        </div>
      </div>
    </section>
  `;

  rerenderPanels();
  syncSituationsPrimaryScrollSource();
  bindSituationsEvents(root, headerRoot);
  bindProjectSituationsRunbar(toolbarHost || root || document);
  bindModalEvents();
  projectSubjectDetail.updateDetailsModal();

  syncProjectSituationsRunbar({
    run_id: store.ui?.runId || "",
    status: store.ui?.systemStatus?.state || "idle",
    label: store.ui?.systemStatus?.label || "",
    meta: store.ui?.systemStatus?.meta || "",
    isBusy: store.ui?.systemStatus?.state === "running"
  });
}
