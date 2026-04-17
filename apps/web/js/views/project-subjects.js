import { store, DEFAULT_PROJECT_PHASES } from "../store.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import {
  loadFlatSubjectsForCurrentProject,
  createObjective as createObjectiveInSupabase,
  updateObjective as updateObjectiveInSupabase,
  closeObjective as closeObjectiveInSupabase,
  reopenObjective as reopenObjectiveInSupabase,
  addSubjectToObjective as addSubjectToObjectiveInSupabase,
  removeSubjectFromObjective as removeSubjectFromObjectiveInSupabase,
  createLabel as createLabelInSupabase,
  updateLabel as updateLabelInSupabase,
  deleteLabel as deleteLabelInSupabase,
  addLabelToSubject as addLabelToSubjectInSupabase,
  removeLabelFromSubject as removeLabelFromSubjectInSupabase,
  replaceSubjectAssignees as replaceSubjectAssigneesInSupabase
} from "../services/project-subjects-supabase.js";
import { loadSituationsForCurrentProject, addSubjectToSituation, removeSubjectFromSituation } from "../services/project-situations-supabase.js";
import {
  setSubjectParentRelationInSupabase as setSubjectParentRelationInSupabaseService,
  reorderSubjectChildrenInSupabase as reorderSubjectChildrenInSupabaseService
} from "../services/subject-parent-relation-service.js";
import {
  createBlockedByRelationInSupabase as createBlockedByRelationInSupabaseService,
  deleteBlockedByRelationInSupabase as deleteBlockedByRelationInSupabaseService
} from "../services/subject-blocking-relation-service.js";
import {
  bindProjectSituationsRunbar,
  syncProjectSituationsRunbar
} from "./project-situations-runbar.js";
import { closeGlobalNav } from "./global-nav.js";
import {
  setProjectViewHeader,
  refreshProjectShellChrome,
  setProjectCompactEnabled
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
import {
  persistSubjectIssueActionToSupabase,
  resolveCurrentUserDirectoryPersonId,
  syncProjectCollaboratorsFromSupabase
} from "../services/project-supabase-sync.js";
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
  humanStoreKey: "project-subjects-human-store-v1"
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
  getNestedSujet: (entityId) => getNestedSujet(entityId)
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
  getCustomSubjects: (...args) => projectSubjectsView.getCustomSubjects(...args),
  normalizeSubjectSituationIds: (...args) => projectSubjectsView.normalizeSubjectSituationIds(...args),
  normalizeBackendPriority: (...args) => projectSubjectsView.normalizeBackendPriority(...args),
  getEffectiveSujetStatus,
  matchSearch: (...args) => projectSubjectsView.matchSearch(...args),
  firstNonEmpty
});

const {
  getFilteredSituations,
  getStandaloneCustomSubjects,
  getFilteredStandaloneSubjects,
  getFilteredFlatSubjects,
  getPaginatedFilteredFlatSubjects,
  getSubjectsPaginationState,
  getSubjectsDataSourceInfo,
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
  getSituationBySujetId,
  getChildSubjects,
  getBlockedBySubjects,
  getBlockingSubjects
} = subjectsSelectors;


const projectSubjectsSelection = createProjectSubjectsSelection({
  store,
  ensureViewUiState,
  getNestedSituation,
  getNestedSujet,
  getSituationBySujetId,
  getDraftSubjectSelection: (...args) => projectSubjectsView.getDraftSubjectSelection(...args),
  rerenderPanels: (...args) => projectSubjectsView.rerenderPanels(...args),
  markEntitySeen
});

const {
  getActiveSelection,
  getDrilldownSelection,
  getSelectionEntityType,
  getScopedSelection,
  currentDecisionTarget,
  selectSituation,
  selectSubject,
  selectSujet,
  openSubjectDetails,
  openDrilldownFromSituation,
  openDrilldownFromSubject,
  openDrilldownFromSujet,
  openSubjectDrilldown
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
  getNestedSujet,
  getEffectiveSujetStatus,
  getEffectiveSituationStatus,
  entityDisplayLinkHtml: (...args) => projectSubjectsView.entityDisplayLinkHtml(...args),
  inferAgent: (...args) => projectSubjectsView.inferAgent(...args),
  normActorName: (...args) => projectSubjectsView.normActorName(...args),
  miniAuthorIconHtml: (...args) => projectSubjectsView.miniAuthorIconHtml(...args)
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
  rerenderScope: (...args) => projectSubjectsView.rerenderScope(...args),
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
  getDropdownController: () => projectSubjectsView.dropdownController,
  renderSubjectMetaDropdownHost: (...args) => projectSubjectsView.renderSubjectMetaDropdownHost(...args),
  getScopedSelection,
  getSubjectMetaMenuEntries: (...args) => projectSubjectsView.getSubjectMetaMenuEntries(...args),
  getSubjectSidebarMeta: (...args) => projectSubjectsView.getSubjectSidebarMeta(...args),
  rerenderScope: (...args) => projectSubjectsView.rerenderScope(...args),
  syncSubjectMetaDropdownPosition: (...args) => projectSubjectsView.syncSubjectMetaDropdownPosition(...args),
  getSubjectMetaScopeRoot: (...args) => projectSubjectsView.getSubjectMetaScopeRoot(...args),
  getSubjectKanbanMenuEntries: (...args) => projectSubjectsView.getSubjectKanbanMenuEntries(...args),
  getSetSujetKanbanStatus: () => setSujetKanbanStatus,
  setSubjectMetaActiveEntry: (...args) => projectSubjectsView.setSubjectMetaActiveEntry(...args),
  getToggleSubjectObjective: () => toggleSubjectObjective,
  getToggleSubjectSituation: () => toggleSubjectSituation,
  getToggleSubjectLabel: () => toggleSubjectLabel,
  getToggleSubjectAssignee: () => toggleSubjectAssignee,
  getSetSubjectParent: () => setSubjectParent,
  getToggleSubjectBlockedByRelation: () => toggleSubjectBlockedByRelation,
  getToggleSubjectBlockingForRelation: () => toggleSubjectBlockingForRelation,
  getReorderSubjectChildren: () => reorderSubjectChildren,
  syncDescriptionEditorDraft,
  startDescriptionEdit,
  clearDescriptionEditState,
  applyDescriptionSave,
  syncCommentPreview: (...args) => projectSubjectsView.syncCommentPreview(...args),
  applyCommentAction: (...args) => projectSubjectsView.applyCommentAction(...args),
  getApplyIssueStatusAction: () => applyIssueStatusAction,
  showError,
  updateDrilldownPanel: () => projectSubjectDrilldown.updateDrilldownPanel(),
  openDrilldownFromSubjectPanel: (subjectId) => projectSubjectDrilldown.openDrilldownFromSubject(subjectId),
  openDrilldownFromSujetPanel: (sujetId) => projectSubjectDrilldown.openDrilldownFromSujet(sujetId),
  selectSubject,
  selectSujet,
  rerenderPanels: (...args) => projectSubjectsView.rerenderPanels(...args),
  resetSubjectsViewTransientState,
  resetObjectiveEditState,
  resetCreateSubjectForm: (...args) => projectSubjectsView.resetCreateSubjectForm(...args),
  closeDetailsModal: () => projectSubjectDetail.closeDetailsModal(),
  closeDrilldown: () => projectSubjectDrilldown.closeDrilldown(),
  syncSituationsPrimaryScrollSource: (...args) => projectSubjectsView.syncSituationsPrimaryScrollSource(...args),
  reloadSubjectsFromSupabase: (...args) => projectSubjectsView.reloadSubjectsFromSupabase(...args),
  openCreateSubjectForm: (...args) => projectSubjectsView.openCreateSubjectForm(...args),
  createSubjectFromDraft: (...args) => projectSubjectsView.createSubjectFromDraft(...args),
  normalizeBackendPriority: (...args) => projectSubjectsView.normalizeBackendPriority(...args),
  selectSituation,
  bindOverlayChromeDismiss,
  bindOverlayChromeCompact,
  getProjectSubjectMilestones: () => projectSubjectMilestones,
  getProjectSubjectLabels: () => projectSubjectLabels,
  renderSubjectMetaFieldValue: (...args) => projectSubjectsView.renderSubjectMetaFieldValue(...args),
  getSubjectsCurrentRoot: () => subjectsCurrentRoot,
  resolveCurrentUserAssigneeId: () => resolveCurrentUserDirectoryPersonId({
    email: store.user?.email || "",
    firstName: store.user?.firstName || "",
    lastName: store.user?.lastName || "",
    company: store.user?.publicProfile?.company || ""
  })
});

const {
  resetSubjectsTabView,
  bindSubjectsTabReset,
  wireDetailsInteractive,
  bindDetailsScroll,
  bindSituationsEvents
} = projectSubjectsEvents;

const projectSubjectsDetailsRenderer = createProjectSubjectsDetailsRenderer({
  getActiveSelection,
  getSelectionEntityType,
  getEffectiveSujetStatus,
  getEffectiveSituationStatus,
  getEntityReviewMeta,
  getReviewTitleStateClass,
  entityDisplayLinkHtml: (...args) => projectSubjectsView.entityDisplayLinkHtml(...args),
  problemsCountsHtml: (...args) => projectSubjectsView.problemsCountsHtml(...args),
  renderSubjectBlockedByHeadHtml: (...args) => projectSubjectsView.renderSubjectBlockedByHeadHtml(...args),
  renderSubjectParentHeadHtml: (...args) => projectSubjectsView.renderSubjectParentHeadHtml(...args),
  firstNonEmpty,
  escapeHtml,
  statePill: (...args) => projectSubjectsView.statePill(...args),
  renderDescriptionCard,
  renderSubIssuesForSujet: (...args) => projectSubjectsView.renderSubIssuesForSujet(...args),
  renderSubIssuesForSituation: (...args) => projectSubjectsView.renderSubIssuesForSituation(...args),
  renderThreadBlock,
  renderCommentBox,
  renderDetailedMetaForSelection: (...args) => projectSubjectsView.renderDetailedMetaForSelection(...args),
  renderSubjectMetaControls: (...args) => projectSubjectsView.renderSubjectMetaControls(...args),
  renderDocumentRefsCard: (...args) => projectSubjectsView.renderDocumentRefsCard(...args)
});

const {
  renderDetailsTitleWrapHtml: renderSharedDetailsTitleWrapHtml,
  renderDetailsChromeHeadHtml: renderSharedDetailsChromeHeadHtml,
  renderDetailsHtml: renderSharedDetailsHtml
} = projectSubjectsDetailsRenderer;

const projectSubjectDetail = createProjectSubjectDetailController({
  store,
  setOverlayChromeOpenState,
  getActiveSelection,
  getSelectionEntityType,
  renderDetailsHtml: renderSharedDetailsHtml,
  renderDetailsTitleWrapHtml: renderSharedDetailsTitleWrapHtml,
  renderDetailsChromeHeadHtml: renderSharedDetailsChromeHeadHtml,
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
  promoteActionHtml: `
    <button
      class="icon-btn icon-btn--sm js-drilldown-promote-selection"
      type="button"
      aria-label="Afficher ce sujet dans le panneau principal"
      title="Afficher dans le panneau principal"
    >
      ${svgIcon("screen-full", { className: "octicon octicon-screen-full" })}
    </button>
  `,
  openDrilldownFromSituationSelection: openDrilldownFromSituation,
  openDrilldownFromSubjectSelection: openDrilldownFromSubject,
  openDrilldownFromSujetSelection: openDrilldownFromSujet,
  selectSituationSelection: selectSituation,
  selectSubjectSelection: selectSubject,
  selectSujetSelection: selectSujet,
  renderDetailsHtml: renderSharedDetailsHtml,
  renderDetailsTitleWrapHtml: renderSharedDetailsTitleWrapHtml,
  renderDetailsChromeHeadHtml: renderSharedDetailsChromeHeadHtml,
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
  renderSubjectsToolbarButton: (...args) => projectSubjectsView.renderSubjectsToolbarButton(...args),
  renderSituationsAddAction: (...args) => projectSubjectsView.renderSituationsAddAction(...args),
  getObjectiveById: (...args) => projectSubjectsView.getObjectiveById(...args),
  getObjectives: (...args) => projectSubjectsView.getObjectives(...args),
  createObjectiveInSupabase,
  updateObjectiveInSupabase,
  closeObjectiveInSupabase,
  reopenObjectiveInSupabase,
  reloadSubjectsFromSupabase: (root, options) => reloadSubjectsFromSupabase(root, options),
  getSubjectsCurrentRoot: () => subjectsCurrentRoot,
  persistRunBucket,
  statePill: (...args) => projectSubjectsView.statePill(...args),
  getCurrentSubjectsStatusFilter,
  getCurrentSubjectsPriorityFilter,
  sujetMatchesStatusFilter,
  sujetMatchesPriorityFilter,
  getSituationBySujetId,
  getNestedSujet,
  renderFlatSujetRow,
  getSituationsTableGridTemplate,
  renderSituationsTableHeadHtml,
  getSubjectsTableDeps: (...args) => projectSubjectsView.getSubjectsTableDeps(...args),
  renderSubjectsPriorityHeadHtml: (...args) => projectSubjectsView.renderSubjectsPriorityHeadHtml(...args),
  problemsCountsIconHtml: (...args) => projectSubjectsView.problemsCountsIconHtml(...args),
  rerenderPanels: () => rerenderPanels()
});

const projectSubjectLabels = createProjectSubjectLabelsController({
  store,
  escapeHtml,
  svgIcon,
  renderIssuesTable,
  normalizeSubjectLabelKey: (...args) => projectSubjectsView.normalizeSubjectLabelKey(...args),
  getSubjectSidebarMeta: (...args) => projectSubjectsView.getSubjectSidebarMeta(...args),
  createLabel: (...args) => createLabelInSupabase(...args),
  updateLabel: (...args) => updateLabelInSupabase(...args),
  deleteLabel: (...args) => deleteLabelInSupabase(...args),
  reloadSubjectsFromSupabase: (...args) => reloadSubjectsFromSupabase(...args),
  getSubjectsCurrentRoot: () => subjectsCurrentRoot
});

const projectSubjectsActions = createProjectSubjectsActions({
  store,
  DRAFT_SUBJECT_ID,
  ensureViewUiState,
  buildDefaultDraftSubjectMeta: (...args) => projectSubjectsView.buildDefaultDraftSubjectMeta(...args),
  persistRunBucket,
  nowIso,
  normalizeSujetKanbanStatus: (...args) => projectSubjectsView.normalizeSujetKanbanStatus(...args),
  getSujetKanbanStatus: (...args) => projectSubjectsView.getSujetKanbanStatus(...args),
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
  loadSituationsForCurrentProject: (...args) => loadSituationsForCurrentProject(...args),
  addSubjectToSituation: (...args) => addSubjectToSituation(...args),
  removeSubjectFromSituation: (...args) => removeSubjectFromSituation(...args),
  persistSubjectIssueActionToSupabase,
  showError,
  getSubjectSidebarMeta: (...args) => projectSubjectsView.getSubjectSidebarMeta(...args),
  normalizeSubjectObjectiveIds: (...args) => projectSubjectsView.normalizeSubjectObjectiveIds(...args),
  normalizeSubjectSituationIds: (...args) => projectSubjectsView.normalizeSubjectSituationIds(...args),
  normalizeSubjectLabels: (...args) => projectSubjectsView.normalizeSubjectLabels(...args),
  normalizeSubjectLabelKey: (...args) => projectSubjectsView.normalizeSubjectLabelKey(...args),
  getSubjectLabelDefinition: (...args) => projectSubjectLabels.getSubjectLabelDefinition(...args),
  getObjectives: (...args) => projectSubjectsView.getObjectives(...args),
  addLabelToSubjectInSupabase: (...args) => addLabelToSubjectInSupabase(...args),
  removeLabelFromSubjectInSupabase: (...args) => removeLabelFromSubjectInSupabase(...args),
  replaceSubjectAssigneesInSupabase: (...args) => replaceSubjectAssigneesInSupabase(...args),
  addSubjectToObjectiveInSupabase: (...args) => addSubjectToObjectiveInSupabase(...args),
  removeSubjectFromObjectiveInSupabase: (...args) => removeSubjectFromObjectiveInSupabase(...args),
  setSubjectParentInSupabase: (subjectId, parentSubjectId) => setSubjectParentRelationInSupabaseService({
    subjectId,
    parentSubjectId,
    rawSubjectsResult: store.projectSubjectsView?.rawSubjectsResult || null
  }),
  createBlockedByRelationInSupabase: (subjectId, blockedBySubjectId) => createBlockedByRelationInSupabaseService({
    subjectId,
    blockedBySubjectId,
    rawSubjectsResult: store.projectSubjectsView?.rawSubjectsResult || null
  }),
  deleteBlockedByRelationInSupabase: (subjectId, blockedBySubjectId) => deleteBlockedByRelationInSupabaseService({
    subjectId,
    blockedBySubjectId
  }),
  reorderSubjectChildrenInSupabase: (parentSubjectId, orderedChildIds) => reorderSubjectChildrenInSupabaseService({
    parentSubjectId,
    orderedChildIds
  }),
  rerenderPanels: (...args) => projectSubjectsView.rerenderPanels(...args)
});

const {
  setSujetKanbanStatus,
  setSubjectObjectiveIds,
  setSubjectSituationIds,
  toggleSubjectAssignee,
  toggleSubjectSituation,
  setSubjectParent,
  toggleSubjectBlockedByRelation,
  toggleSubjectBlockingForRelation,
  reorderSubjectChildren,
  setSubjectLabels,
  toggleSubjectLabel,
  toggleSubjectObjective,
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


function rerenderSubjectsPanelsWhenConnected(root, remainingAttempts = 12) {
  if (!root) return;
  if (root.isConnected || document.getElementById("situationsPanelHost")?.isConnected) {
    rerenderPanels();
    syncSituationsPrimaryScrollSource();
    return;
  }
  if (remainingAttempts <= 1) return;
  requestAnimationFrame(() => {
    rerenderSubjectsPanelsWhenConnected(root, remainingAttempts - 1);
  });
}

/* =========================================================
   Legacy DOM / archive parity helpers
========================================================= */


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
  SVG_AVATAR_HUMAN,
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
  renderStateDot,
  normalizeVerdict,
  normalizeReviewState,
  getSelectionDocumentRefs,
  renderSelectMenuSection,
  mdToHtml,
  firstNonEmpty,
  nowIso,
  fmtTs,
  getDecision: (...args) => getDecision(...args),
  getEntityDescriptionState: (...args) => getEntityDescriptionState(...args),
  setEntityDescriptionState: (...args) => setEntityDescriptionState(...args),
  getEntityReviewMeta: (...args) => getEntityReviewMeta(...args),
  getReviewTitleStateClass: (...args) => getReviewTitleStateClass(...args),
  getNestedSituation: (...args) => getNestedSituation(...args),
  getNestedSujet: (...args) => getNestedSujet(...args),
  getSituationSubjects: (...args) => getSituationSubjects(...args),
  getChildSubjects: (...args) => getChildSubjects(...args),
  getBlockedBySubjects: (...args) => getBlockedBySubjects(...args),
  getBlockingSubjects: (...args) => getBlockingSubjects(...args),
  getFilteredStandaloneSubjects: (...args) => getFilteredStandaloneSubjects(...args),
  getFilteredFlatSubjects: (...args) => getFilteredFlatSubjects(...args),
  getPaginatedFilteredFlatSubjects: (...args) => getPaginatedFilteredFlatSubjects(...args),
  getSubjectsPaginationState: (...args) => getSubjectsPaginationState(...args),
  getSubjectsDataSourceInfo: (...args) => getSubjectsDataSourceInfo(...args),
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
  loadExistingSubjectsForCurrentProject: loadFlatSubjectsForCurrentProject,
  getSubjectsCurrentRoot: () => subjectsCurrentRoot,
  getFilteredSituations: (...args) => getFilteredSituations(...args),
  getVisibleCounts: (...args) => getVisibleCounts(...args),
  renderProjectSubjectsTable,
  wireDetailsInteractive: (...args) => projectSubjectsEvents.wireDetailsInteractive(...args),
  bindDetailsScroll: (...args) => projectSubjectsEvents.bindDetailsScroll(...args),
  refreshProjectShellChrome,
  setProjectCompactEnabled,
  currentDecisionTarget: (...args) => currentDecisionTarget(...args),
  addComment: (...args) => addComment(...args),
  getScopedSelection: (...args) => getScopedSelection(...args)
});

const {
  priorityBadge,
  normalizeSubjectObjectiveIds,
  normalizeSubjectSituationIds,
  normalizeSubjectLabels,
  renderCreateSubjectFormHtml,
  rerenderSubjectsToolbar,
  syncSituationsPrimaryScrollSource,
  rerenderPanels,
  rerenderScope,
  applyCommentAction
} = projectSubjectsView;

const normalizeBackendPriority = (...args) => projectSubjectsView.normalizeBackendPriority(...args);
const statePill = (...args) => projectSubjectsView.statePill(...args);
const entityDisplayLinkHtml = (...args) => projectSubjectsView.entityDisplayLinkHtml(...args);
const renderDocumentRefsCard = (...args) => projectSubjectsView.renderDocumentRefsCard(...args);
const inferAgent = (...args) => projectSubjectsView.inferAgent(...args);
const normActorName = (...args) => projectSubjectsView.normActorName(...args);
const miniAuthorIconHtml = (...args) => projectSubjectsView.miniAuthorIconHtml(...args);
const getDraftSubjectSelection = (...args) => projectSubjectsView.getDraftSubjectSelection(...args);
const buildDefaultDraftSubjectMeta = (...args) => projectSubjectsView.buildDefaultDraftSubjectMeta(...args);
const resetCreateSubjectForm = (...args) => projectSubjectsView.resetCreateSubjectForm(...args);
const openCreateSubjectForm = (...args) => projectSubjectsView.openCreateSubjectForm(...args);
const getCustomSubjects = (...args) => projectSubjectsView.getCustomSubjects(...args);
const createSubjectFromDraft = (...args) => projectSubjectsView.createSubjectFromDraft(...args);
const normalizeSujetKanbanStatus = (...args) => projectSubjectsView.normalizeSujetKanbanStatus(...args);
const getSujetKanbanStatus = (...args) => projectSubjectsView.getSujetKanbanStatus(...args);
const normalizeSubjectLabelKey = (...args) => projectSubjectsView.normalizeSubjectLabelKey(...args);
const getSubjectSidebarMeta = (...args) => projectSubjectsView.getSubjectSidebarMeta(...args);
const getObjectives = (...args) => projectSubjectsView.getObjectives(...args);
const getObjectiveById = (...args) => projectSubjectsView.getObjectiveById(...args);
const reloadSubjectsFromSupabase = (...args) => projectSubjectsView.reloadSubjectsFromSupabase(...args);
const problemsCountsHtml = (...args) => projectSubjectsView.problemsCountsHtml(...args);
const problemsCountsIconHtml = (...args) => projectSubjectsView.problemsCountsIconHtml(...args);
const renderDetailedMetaForSelection = (...args) => projectSubjectsView.renderDetailedMetaForSelection(...args);
const renderSubjectMetaControls = (...args) => projectSubjectsView.renderSubjectMetaControls(...args);
const renderSubIssuesForSujet = (...args) => projectSubjectsView.renderSubIssuesForSujet(...args);
const renderSubIssuesForSituation = (...args) => projectSubjectsView.renderSubIssuesForSituation(...args);
const closeSubjectMetaDropdown = (...args) => projectSubjectsView.closeSubjectMetaDropdown(...args);
const closeSubjectKanbanDropdown = (...args) => projectSubjectsView.closeSubjectKanbanDropdown(...args);
const getSubjectMetaMenuEntries = (...args) => projectSubjectsView.getSubjectMetaMenuEntries(...args);
const setSubjectMetaActiveEntry = (...args) => projectSubjectsView.setSubjectMetaActiveEntry(...args);
const getSubjectKanbanMenuEntries = (...args) => projectSubjectsView.getSubjectKanbanMenuEntries(...args);
const renderSubjectMetaDropdownHost = (...args) => projectSubjectsView.renderSubjectMetaDropdownHost(...args);
const focusSubjectMetaSearch = (...args) => projectSubjectsView.focusSubjectMetaSearch(...args);
const focusSubjectKanbanSearch = (...args) => projectSubjectsView.focusSubjectKanbanSearch(...args);
const syncSubjectMetaDropdownPosition = (...args) => projectSubjectsView.syncSubjectMetaDropdownPosition(...args);
const getSubjectMetaScopeRoot = (...args) => projectSubjectsView.getSubjectMetaScopeRoot(...args);
const renderSubjectsToolbarButton = (...args) => projectSubjectsView.renderSubjectsToolbarButton(...args);
const renderSituationsAddAction = (...args) => projectSubjectsView.renderSituationsAddAction(...args);
const renderSubjectsPriorityHeadHtml = (...args) => projectSubjectsView.renderSubjectsPriorityHeadHtml(...args);
const getSubjectsTableDeps = (...args) => projectSubjectsView.getSubjectsTableDeps(...args);
const syncCommentPreview = (...args) => projectSubjectsView.syncCommentPreview(...args);

export function getEffectiveSujetStatus(...args) {
  return projectSubjectsView.getEffectiveSujetStatus(...args);
}


export function getEffectiveSituationStatus(...args) {
  return projectSubjectsView.getEffectiveSituationStatus(...args);
}

export function getSujetKanbanStatusForSituation(...args) {
  return getSujetKanbanStatus(...args);
}

export function setSujetKanbanStatusForSituation(...args) {
  return setSujetKanbanStatus(...args);
}

export function openSubjectDrilldownFromSituation(...args) {
  return projectSubjectDrilldown.openDrilldownFromSubject(...args);
}

let collaboratorsHydrationInFlight = null;

function ensureSubjectsCollaboratorsLoaded() {
  const collaborators = Array.isArray(store.projectForm?.collaborators) ? store.projectForm.collaborators : [];
  if (collaborators.length || collaboratorsHydrationInFlight) return;
  collaboratorsHydrationInFlight = syncProjectCollaboratorsFromSupabase({ force: false })
    .then(() => {
      rerenderPanels();
    })
    .catch((error) => {
      console.warn("[project-subjects] collaborators preload failed", error);
    })
    .finally(() => {
      collaboratorsHydrationInFlight = null;
    });
}







/* =========================================================
   Public render
========================================================= */

export function renderProjectSubjects(root) {
  ensureSubjectsCollaboratorsLoaded();
  const subjectsViewState = ensureViewUiState();
  projectSubjectDrilldown.ensureDrilldownDom();
  subjectsCurrentRoot = root;
  bindSubjectsTabReset();
  subjectsViewState.subjectsSubview = "subjects";
  subjectsViewState.selectedObjectiveId = "";
  subjectsViewState.showTableOnly = true;
  if (!store.situationsView || typeof store.situationsView !== "object") {
    store.situationsView = {};
  }
  store.situationsView.subjectsSubview = "subjects";
  store.situationsView.selectedObjectiveId = "";
  store.situationsView.showTableOnly = true;
  store.situationsView.displayDepth = "sujets";

  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Sujets",
    variant: "situations",
    toolbarHtml: ""
  });

  const headerRoot = document.getElementById("projectViewHeaderHost");
  const toolbarHost = document.getElementById("situationsToolbarHost");
  store.projectSubjectsView.subjectsSubview = String(store.projectSubjectsView.subjectsSubview || "subjects");
  if (store.projectSubjectsView.subjectsSubview !== "objectives") {
    store.projectSubjectsView.selectedObjectiveId = "";
  }
  const data = store.projectSubjectsView.subjectsData || [];
  const firstSituationId = data[0]?.id || null;
  const currentProjectScopeId = String(store.currentProjectId || "").trim() || null;
  if (!store.projectSubjectsView.loaded || store.projectSubjectsView.projectScopeId !== currentProjectScopeId) {
    store.projectSubjectsView.loading = true;
  }

  if (toolbarHost) {
    toolbarHost.dataset.toolbarOwner = "subjects";
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
  rerenderSubjectsPanelsWhenConnected(root);
  bindSituationsEvents(root, headerRoot);

  reloadSubjectsFromSupabase(root, {
    rerender: true,
    updateModal: true
  }).catch(() => undefined);
  bindProjectSituationsRunbar(toolbarHost || root || document);

  syncProjectSituationsRunbar({
    run_id: store.ui?.runId || "",
    status: store.ui?.systemStatus?.state || "idle",
    label: store.ui?.systemStatus?.label || "",
    meta: store.ui?.systemStatus?.meta || "",
    isBusy: store.ui?.systemStatus?.state === "running"
  });
}
