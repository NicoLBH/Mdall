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
  openDetailsModal,
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
  updateDrilldownPanel,
  openDrilldownFromSujetPanel,
  openDrilldownFromAvisPanel,
  selectSujet,
  rerenderPanels,
  resetSubjectsViewTransientState,
  resetObjectiveEditState,
  resetCreateSubjectForm,
  closeDetailsModal,
  closeDrilldown,
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
  openDetailsModal
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

function issueIcon(status = "open", options = {}) {
  const {
    reviewState = "pending",
    entityType = "",
    isSeen = false
  } = options;

  const normalizedReview = normalizeReviewState(reviewState);
  if (normalizedReview === "rejected" || normalizedReview === "dismissed") {
    const iconName = String(entityType || "").toLowerCase() === "avis" ? "slash" : "skip";
    const svg = svgIcon(iconName, { style: "color: rgb(145, 152, 161)" });
    return `<span class="issue-status-icon" aria-hidden="true">${svg}</span>`;
  }

  const isOpen = normalizeIssueLifecycleStatus(status) !== "closed";
  const svg = isOpen
    ? svgIcon("issue-opened", { style: "color: var(--fgColor-open)" })
    : svgIcon("check-circle", { style: "color: var(--fgColor-done)" });

  return `<span class="issue-status-icon" aria-hidden="true">${svg}</span>`;
}


function normalizeBackendPriority(priority = "") {
  const raw = String(priority ?? "").trim();
  if (!raw) return "";
  const value = raw.toLowerCase();
  if (value === "hight") return "high";
  if (["low", "medium", "high", "critical"].includes(value)) return value;
  if (value === "p1") return "critical";
  if (value === "p2") return "high";
  if (value === "p3") return "medium";
  return value;
}

function priorityBadge(priority = "medium") {
  const normalized = normalizeBackendPriority(priority) || "medium";
  return renderStatusBadge({
    label: normalized,
    tone: normalized
  });
}


function renderVerboseAvisVerdictPill(verdict) {
  const labels = {
    F: "Favorable",
    S: "Suspendu",
    D: "Défavorable",
    HM: "Hors Mission",
    PM: "Pour Mémoire",
    SO: "Sans Objet"
  };
  const normalized = normalizeVerdict(verdict);
  const classMap = {
    F: "verdict-F",
    S: "verdict-S",
    D: "verdict-D",
    HM: "verdict-HM",
    PM: "verdict-PM",
    SO: "verdict-SO"
  };
  const badgeClass = classMap[normalized] ? `verdict-badge ${classMap[normalized]}` : "verdict-badge";
  return `<span class="${badgeClass}">${escapeHtml(labels[normalized] || String(verdict || "—"))}</span>`;
}
function normalizeIssueLifecycleStatus(status = "open") {
  const normalized = String(status || "open").toLowerCase();
  return normalized.startsWith("closed") ? "closed" : "open";
}

function statePill(status = "open", options = {}) {
  const {
    reviewState = "pending",
    entityType = ""
  } = options;

  const normalizedReview = normalizeReviewState(reviewState);
  if (normalizedReview === "rejected" || normalizedReview === "dismissed") {
    const iconName = String(entityType || "").toLowerCase() === "avis" ? "slash" : "skip";
    const rejectedIcon = svgIcon(iconName, { style: "color: #fff" });
    return `<span class="gh-state gh-state--rejected"><span class="gh-state-dot" aria-hidden="true">${rejectedIcon}</span>Rejected</span>`;
  }

  const isOpen = normalizeIssueLifecycleStatus(status) !== "closed";
  return `<span class="gh-state ${isOpen ? "gh-state--open" : "gh-state--closed"}"><span class="gh-state-dot" aria-hidden="true">${isOpen ? SVG_ISSUE_OPEN : SVG_ISSUE_CLOSED}</span>${isOpen ? "Open" : "Closed"}</span>`;
}

function chevron(isOpen, isVisible = true) {
  if (!isVisible) return "";
  return `<span class="chev">${isOpen ? "▾" : "▸"}</span>`;
}

function entityLinkHtml(type, id, text) {
  const safeType = escapeHtml(type || "");
  const safeId = escapeHtml(id || "");
  const safeText = text || safeId;
  return `<a href="#" class="entity-link" data-nav-type="${safeType}" data-nav-id="${safeId}">${safeText}</a>`;
}

function buildEntityDisplayRefMap() {
  const data = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
  const map = new Map();
  let index = 1;

  const register = (type, id) => {
    const safeType = String(type || "").toLowerCase();
    const safeId = String(id || "").trim();
    if (!safeType || !safeId) return;
    const key = `${safeType}:${safeId}`;
    if (map.has(key)) return;
    map.set(key, `#${index}`);
    index += 1;
  };

  for (const situation of data) {
    register("situation", situation?.id);
    const sujets = Array.isArray(situation?.sujets) ? situation.sujets : [];
    for (const sujet of sujets) {
      register("sujet", sujet?.id);
      const avisList = Array.isArray(sujet?.avis) ? sujet.avis : [];
      for (const avis of avisList) {
        register("avis", avis?.id);
      }
    }
  }

  return map;
}

function getEntityDisplayRef(type, id) {
  const map = buildEntityDisplayRefMap();
  const safeType = String(type || "").toLowerCase();
  const safeId = String(id || "").trim();
  if (!safeId) return "";
  return map.get(`${safeType}:${safeId}`) || `#${safeId}`;
}

function entityDisplayLinkHtml(type, id) {
  return entityLinkHtml(type, id, escapeHtml(getEntityDisplayRef(type, id)));
}


function renderDocumentRefsCard(selection) {
  const refs = getSelectionDocumentRefs(selection);
  if (!refs.length) return "";

  return `
    <div class="details-document-refs" aria-label="Références documentaires">
      <div class="details-document-refs__label">Références documentaires</div>
      <div class="details-document-refs__list">
        ${refs.map((doc) => `
          <span class="details-document-ref">
            <span class="details-document-ref__name">${escapeHtml(doc.name)}</span>
            <span class="details-document-ref__phase">${escapeHtml(doc.phaseCode)}${doc.phaseLabel ? ` · ${escapeHtml(doc.phaseLabel)}` : ""}</span>
          </span>
        `).join("")}
      </div>
    </div>
  `;
}

function renderVerdictHeadFilter() {
  const current = String(store.situationsView.verdictFilter || "ALL").toUpperCase();

  const options = [
    "ALL",
    "F",
    "D",
    "S",
    "HM",
    "PM",
    "SO",
  ];

  const currentLabel = current === "ALL" ? "Verdict" : current;

  return `
    <div class="issues-head-menu">
      <button
        class="issues-head-menu__btn"
        id="verdictHeadBtn"
        type="button"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <span>${escapeHtml(currentLabel)}</span>
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu issues-head-menu__dropdown" id="verdictHeadDropdown">
        ${options.map((v) => `
          <button
            class="gh-menu__item ${v === current ? "is-active" : ""}"
            type="button"
            data-verdict="${escapeHtml(v)}"
          >
            ${escapeHtml(v)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSubjectsStatusHeadHtml() {
  const current = getCurrentSubjectsStatusFilter();
  const query = String(store.situationsView.search || "").trim().toLowerCase();
  const counts = getSubjectsStatusCounts(query);
  return renderTableHeadFilterToggle({
    activeValue: current,
    items: [
      { label: "Ouverts", value: "open", count: counts.open, dataAttr: "subjects-status-filter" },
      { label: "Fermés", value: "closed", count: counts.closed, dataAttr: "subjects-status-filter" }
    ]
  });
}

function renderSubjectsPriorityHeadHtml() {
  const current = getCurrentSubjectsPriorityFilter();
  const priorities = getAvailableSubjectPriorities();
  const labels = {
    critical: "Critique",
    high: "Haute",
    medium: "Moyenne",
    low: "Basse"
  };
  const currentLabel = current ? (labels[current] || current) : "Priorité";
  const options = ["", ...priorities];

  return `
    <div class="issues-head-menu">
      <button
        class="issues-head-menu__btn"
        id="subjectsPriorityHeadBtn"
        type="button"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <span>${escapeHtml(currentLabel)}</span>
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu issues-head-menu__dropdown" id="subjectsPriorityHeadDropdown">
        ${options.map((value) => {
          const normalized = normalizeBackendPriority(value || "");
          const isActive = normalized === current;
          const label = normalized ? (labels[normalized] || normalized) : "Toutes";
          return `
            <button
              class="gh-menu__item ${isActive ? "is-active" : ""}"
              type="button"
              data-subjects-priority-filter="${escapeHtml(normalized)}"
            >
              ${escapeHtml(label)}
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function inferAgent(obj) {
  return obj?.produced_by || obj?.agent || obj?.by || obj?.source || "system";
}

function normActorName(actor, agent) {
  const a = String(actor || "").trim();
  if (a) return a;
  const g = String(agent || "").trim();
  if (!g) return "System";
  return g === "human" ? "Human" : g;
}

function verdictKey(v) {
  return String(v || "").toUpperCase();
}

function verdictToneClass(v) {
  const s = verdictKey(v);
  if (s === "D") return "d";
  if (s === "S") return "s";
  if (s === "F" || s === "OK") return "f";
  if (s === "HM") return "hm";
  if (s === "PM") return "pm";
  if (s === "SO") return "so";
  return "muted";
}

function miniAuthorIconHtml(agent) {
  const a = String(agent || "").toLowerCase();
  if (a === "human") {
    return `<span class="tl-author tl-author--human" aria-hidden="true">${SVG_AVATAR_HUMAN}</span>`;
  }
  return `<span class="tl-author tl-author--agent mono" aria-hidden="true">R</span>`;
}

function verdictIconHtml(v) {
  const k = verdictKey(v);
  const cls = `tl-ico tl-ico--verdict tl-ico--${verdictToneClass(k)}`;
  const txt = escapeHtml(k || "—");
  return `<span class="${cls}" aria-label="Verdict ${txt}">${txt}</span>`;
}

function matchSearch(parts, query) {
  if (!query) return true;
  const haystack = parts
    .filter((part) => part !== undefined && part !== null)
    .map((part) => String(part).toLowerCase())
    .join(" ");
  return haystack.includes(query);
}

/* =========================================================
   Local archive-like human store / overlays
========================================================= */

const SUJET_KANBAN_STATUSES = [
  { key: "non_active", label: "Non activé", hint: "Sujet détecté mais pas encore engagé." },
  { key: "to_activate", label: "A activer", hint: "Sujet prêt à être lancé." },
  { key: "in_progress", label: "En cours", hint: "Sujet actuellement traité." },
  { key: "in_arbitration", label: "En arbitrage", hint: "Décision ou arbitrage attendu." },
  { key: "resolved", label: "Résolu", hint: "Sujet traité ou clos." }
];
const SUJET_KANBAN_STATUS_KEYS = new Set(SUJET_KANBAN_STATUSES.map((status) => status.key));
const SUJET_KANBAN_BADGE_STYLE = {
  non_active: { background: "rgba(46, 160, 67, 0.15)", border: "rgb(35, 134, 54)", text: "rgb(63, 185, 80)" },
  to_activate: { background: "rgba(56, 139, 253, 0.1)", border: "rgb(31, 111, 235)", text: "rgb(88, 166, 255)" },
  in_progress: { background: "rgba(187, 128, 9, 0.15)", border: "rgb(158, 106, 3)", text: "rgb(210, 153, 34)" },
  in_arbitration: { background: "rgba(171, 125, 248, 0.15)", border: "rgb(137, 87, 229)", text: "rgb(188, 140, 255)" },
  resolved: { background: "rgba(219, 109, 40, 0.1)", border: "rgb(189, 86, 29)", text: "rgb(255, 161, 107)" }
};
const DEFAULT_OBJECTIVE_TITLES = [
  "Programme validé",
  "Esquisse retenue",
  "Estimation projet validée",
  "Permis déposé",
  "Permis obtenu",
  "Permis purgé",
  "Marchés de travaux signés",
  "Travaux démarrés",
  "Gros oeuvre terminé",
  "Bâtiment clos couvert",
  "Travaux terminés",
  "Réception prononcée"
];

function getDraftSubjectSelection() {
  ensureViewUiState();
  if (!store.situationsView.createSubjectForm?.isOpen) return null;
  return {
    type: "sujet",
    item: {
      id: DRAFT_SUBJECT_ID,
      title: String(store.situationsView.createSubjectForm.title || "").trim() || "Nouveau sujet",
      status: "open",
      priority: "P3",
      agent: "human",
      avis: []
    }
  };
}

function buildDefaultDraftSubjectMeta() {
  const selectedSituationId = String(
    store.situationsView.selectedSituationId
    || (store.situationsView.data || []).find((situation) => String(getEffectiveSituationStatus(situation?.id) || situation?.status || "open").toLowerCase() === "open")?.id
    || (store.situationsView.data || [])[0]?.id
    || ""
  );
  return {
    assignees: [],
    labels: [],
    objectiveIds: [],
    situationIds: selectedSituationId ? [selectedSituationId] : [],
    relations: []
  };
}

function resetCreateSubjectForm(options = {}) {
  ensureViewUiState();
  const keepCreateMore = !!options.keepCreateMore;
  const previous = store.situationsView.createSubjectForm || {};
  store.situationsView.createSubjectForm = {
    isOpen: false,
    title: "",
    description: "",
    previewMode: false,
    createMore: keepCreateMore ? !!previous.createMore : false,
    meta: buildDefaultDraftSubjectMeta(),
    validationError: ""
  };
}

function openCreateSubjectForm() {
  resetObjectiveEditState();
  closeSubjectMetaDropdown();
  closeSubjectKanbanDropdown();
  ensureViewUiState();
  const previousCreateMore = !!store.situationsView.createSubjectForm?.createMore;
  store.situationsView.subjectsSubview = "subjects";
  store.situationsView.showTableOnly = true;
  store.situationsView.createSubjectForm = {
    isOpen: true,
    title: "",
    description: "",
    previewMode: false,
    createMore: previousCreateMore,
    meta: buildDefaultDraftSubjectMeta(),
    validationError: ""
  };
}

function getCustomSubjects() {
  const { bucket } = getRunBucket();
  return (Array.isArray(bucket.customSubjects) ? bucket.customSubjects : []).map((subject, index) => ({
    id: String(subject?.id || `sujet-local-${index + 1}`),
    title: String(subject?.title || `Sujet ${index + 1}`),
    status: String(subject?.status || "open").toLowerCase(),
    priority: String(subject?.priority || "P3").toUpperCase(),
    agent: String(subject?.agent || "human").toLowerCase(),
    raw: subject?.raw && typeof subject.raw === "object" ? subject.raw : {},
    avis: Array.isArray(subject?.avis) ? subject.avis : []
  }));
}

function createCustomSubjectId() {
  const stamp = new Date();
  const compact = [
    stamp.getFullYear(),
    String(stamp.getMonth() + 1).padStart(2, "0"),
    String(stamp.getDate()).padStart(2, "0"),
    "-",
    String(stamp.getHours()).padStart(2, "0"),
    String(stamp.getMinutes()).padStart(2, "0"),
    String(stamp.getSeconds()).padStart(2, "0"),
    "-",
    Math.random().toString(36).slice(2, 6)
  ].join("");
  return `sujet-local-${compact}`;
}

function createSubjectFromDraft() {
  ensureViewUiState();
  const draft = getSubjectsViewState().createSubjectForm || {};
  const title = String(draft.title || "").trim();
  if (!title) {
    store.situationsView.createSubjectForm.validationError = "Le titre du sujet est obligatoire.";
    return { ok: false, reason: "missing-title" };
  }

  const subjectId = createCustomSubjectId();
  const nextMeta = {
    assignees: Array.isArray(draft.meta?.assignees) ? draft.meta.assignees.map((value) => String(value || "")).filter(Boolean) : [],
    labels: normalizeSubjectLabels(draft.meta?.labels),
    objectiveIds: normalizeSubjectObjectiveIds(draft.meta?.objectiveIds),
    situationIds: normalizeSubjectSituationIds(draft.meta?.situationIds),
    relations: Array.isArray(draft.meta?.relations) ? draft.meta.relations.map((value) => String(value || "")).filter(Boolean) : []
  };

  persistRunBucket((bucket) => {
    bucket.customSubjects = Array.isArray(bucket.customSubjects) ? bucket.customSubjects : [];
    bucket.customSubjects.unshift({
      id: subjectId,
      title,
      status: "open",
      priority: "P3",
      agent: "human",
      raw: {
        created_by: String(store.user?.id || "human"),
        created_at: nowIso()
      },
      avis: []
    });
    bucket.subjectMeta = bucket.subjectMeta && typeof bucket.subjectMeta === "object" ? bucket.subjectMeta : {};
    bucket.subjectMeta.sujet = bucket.subjectMeta.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
    bucket.subjectMeta.sujet[subjectId] = {
      ...(bucket.subjectMeta.sujet[subjectId] || {}),
      assignees: nextMeta.assignees,
      labels: nextMeta.labels,
      objectiveIds: nextMeta.objectiveIds,
      situationIds: nextMeta.situationIds,
      relations: nextMeta.relations
    };
  });

  setEntityDescriptionState("sujet", subjectId, {
    body: String(draft.description || "").trim(),
    author: firstNonEmpty(store.user?.name, store.user?.firstName, "human"),
    agent: "human",
    avatar_type: "human",
    avatar_initial: "H"
  }, { actor: "Human", agent: "human" });

  setSubjectObjectiveIds(subjectId, nextMeta.objectiveIds);
  store.situationsView.selectedSujetId = subjectId;
  store.situationsView.selectedAvisId = null;
  store.situationsView.selectedSituationId = nextMeta.situationIds[0] || store.situationsView.selectedSituationId || null;
  store.situationsView.createSubjectForm.validationError = "";
  return { ok: true, subjectId };
}

function normalizeSujetKanbanStatus(value) {
  const key = String(value || "").trim().toLowerCase();
  return SUJET_KANBAN_STATUS_KEYS.has(key) ? key : null;
}

function getDefaultSujetKanbanStatus(sujetId) {
  const effectiveStatus = String(getEffectiveSujetStatus(sujetId) || "open").toLowerCase();
  return effectiveStatus === "closed" ? "resolved" : "non_active";
}

function getSujetKanbanStatus(sujetId, situationId = "") {
  const { bucket } = getRunBucket();
  const normalizedSituationId = String(situationId || "");
  const statusMap = bucket?.workflow?.sujet_kanban_status;
  const scopedStored = normalizeSujetKanbanStatus(normalizedSituationId ? statusMap?.[normalizedSituationId]?.[sujetId] : null);
  if (scopedStored) return scopedStored;
  const legacyStored = normalizeSujetKanbanStatus(statusMap?.[sujetId]);
  return legacyStored || getDefaultSujetKanbanStatus(sujetId);
}

function getSujetKanbanStatusMeta(sujetId, situationId = "") {
  const key = getSujetKanbanStatus(sujetId, situationId);
  return SUJET_KANBAN_STATUSES.find((status) => status.key === key) || SUJET_KANBAN_STATUSES[0];
}

function renderSujetKanbanStatusBadge(sujetId, situationId = "") {
  const meta = getSujetKanbanStatusMeta(sujetId, situationId);
  const tone = SUJET_KANBAN_BADGE_STYLE[meta.key] || SUJET_KANBAN_BADGE_STYLE.non_active;
  return `<span class="subject-kanban-badge" style="--subject-kanban-badge-bg:${tone.background};--subject-kanban-badge-border:${tone.border};--subject-kanban-badge-text:${tone.text};">${escapeHtml(meta.label)}</span>`;
}

function normalizeSubjectObjectiveIds(objectiveIds) {
  const normalized = [...new Set((Array.isArray(objectiveIds) ? objectiveIds : []).map((value) => String(value || "")).filter(Boolean))];
  return normalized.length ? [normalized[0]] : [];
}

function normalizeSubjectSituationIds(situationIds) {
  return [...new Set((Array.isArray(situationIds) ? situationIds : []).map((value) => String(value || "")).filter(Boolean))];
}

function normalizeSubjectLabelKey(label) {
  return String(label || "").trim().toLowerCase();
}

function normalizeSubjectLabels(labels) {
  const seen = new Set();
  return (Array.isArray(labels) ? labels : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeSubjectLabelKey(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getSubjectSidebarMeta(subjectId) {
  ensureViewUiState();
  if (String(subjectId || "") === DRAFT_SUBJECT_ID && store.situationsView.createSubjectForm?.isOpen) {
    const meta = store.situationsView.createSubjectForm.meta || buildDefaultDraftSubjectMeta();
    return {
      assignees: Array.isArray(meta.assignees) ? meta.assignees.map((value) => String(value || "")).filter(Boolean) : [],
      labels: normalizeSubjectLabels(meta.labels),
      objectiveIds: normalizeSubjectObjectiveIds(meta.objectiveIds),
      situationIds: normalizeSubjectSituationIds(meta.situationIds),
      relations: Array.isArray(meta.relations) ? meta.relations.map((value) => String(value || "")).filter(Boolean) : []
    };
  }
  const { bucket } = getRunBucket();
  const subjectMeta = bucket?.subjectMeta?.sujet?.[subjectId] || {};
  const objectiveIds = Array.isArray(subjectMeta.objectiveIds)
    ? normalizeSubjectObjectiveIds(subjectMeta.objectiveIds)
    : normalizeSubjectObjectiveIds(
        getObjectives()
          .filter((objective) => Array.isArray(objective.subjectIds) && objective.subjectIds.includes(String(subjectId || "")))
          .map((objective) => String(objective.id || ""))
          .filter(Boolean)
      );
  const derivedSituationIds = (store.situationsView.data || [])
    .filter((situation) => (situation.sujets || []).some((sujet) => String(sujet?.id || "") === String(subjectId || "")))
    .map((situation) => String(situation.id || ""))
    .filter(Boolean);
  const situationIds = Array.isArray(subjectMeta.situationIds)
    ? normalizeSubjectSituationIds(subjectMeta.situationIds)
    : normalizeSubjectSituationIds(derivedSituationIds);
  return {
    assignees: Array.isArray(subjectMeta.assignees) ? subjectMeta.assignees.map((value) => String(value || "")).filter(Boolean) : [],
    labels: normalizeSubjectLabels(subjectMeta.labels),
    objectiveIds,
    situationIds,
    relations: Array.isArray(subjectMeta.relations) ? subjectMeta.relations.map((value) => String(value || "")).filter(Boolean) : []
  };
}

function getSubjectObjectives(subjectId) {
  const meta = getSubjectSidebarMeta(subjectId);
  return meta.objectiveIds.map((objectiveId) => getObjectiveById(objectiveId)).filter(Boolean);
}

export function getEffectiveSujetStatus(sujetId) {
  const sujet = getNestedSujet(sujetId);
  const decision = getDecision("sujet", sujetId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";
  return normalizeIssueLifecycleStatus(firstNonEmpty(sujet?.status, "open"));
}

export function getEffectiveAvisVerdict(avisId) {
  const avis = getNestedAvis(avisId);
  const decision = getDecision("avis", avisId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d.startsWith("VALIDATED_")) return d.replace("VALIDATED_", "");
  return normalizeVerdict(avis?.verdict) || "-";
}

export function getEffectiveSituationStatus(situationId) {
  const situation = getNestedSituation(situationId);
  const decision = getDecision("situation", situationId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";
  return normalizeIssueLifecycleStatus(firstNonEmpty(situation?.status, "open"));
}

/* =========================================================
   Data access
========================================================= */

/* =========================================================
   Effective counts / title helpers
========================================================= */

function verdictCountsObject() {
  return { F: 0, S: 0, D: 0, HM: 0, PM: 0, SO: 0 };
}

function problemVerdictStats(problem) {
  const counts = verdictCountsObject();
  for (const item of problem?.avis || []) {
    const v = String(getEffectiveAvisVerdict(item.id) || "").toUpperCase();
    if (counts[v] !== undefined) counts[v] += 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

function situationVerdictStats(situation) {
  const counts = verdictCountsObject();
  for (const sujet of situation?.sujets || []) {
    for (const avis of sujet.avis || []) {
      const v = String(getEffectiveAvisVerdict(avis.id) || "").toUpperCase();
      if (counts[v] !== undefined) counts[v] += 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

function buildVerdictBarHtml(counts, options = {}) {
  const legend = options.legend !== false;
  const total = Object.values(counts || {}).reduce((a, b) => a + b, 0) || 1;
  const order = ["F", "S", "D", "HM", "PM", "SO"];

  const segs = order.map((v) => {
    const c = Number(counts?.[v] || 0);
    if (!c) return "";
    const pct = (c / total) * 100;
    return `<span class="verdict-bar__seg verdict-bar__seg--${v.toLowerCase()}" style="--verdict-seg-width:${pct.toFixed(2)}%"></span>`;
  }).join("");

  const bar = `<div class="verdict-bar">${segs || `<span class="verdict-bar__seg verdict-bar__seg--empty" style="--verdict-seg-width:100%"></span>`}</div>`;

  if (!legend) {
    return `<div class="subissues-counts subissues-counts--verdicts">${bar}</div>`;
  }

  const legendHtml = order.map((v) => {
    const c = Number(counts?.[v] || 0);
    if (!c) return "";
    const pct = total ? (c / total) * 100 : 0;
    return `
      <span class="verdict-legend__item">
        ${renderStateDot(v)}
        <span class="verdict-legend__count">${c} <b>${escapeHtml(v)}</b></span>
        <span class="verdict-legend__pct">(${pct.toFixed(0)}%)</span>
      </span>
    `;
  }).join("");

  return `
    <div class="subissues-counts subissues-counts--verdicts">
      ${bar}
      <div class="verdict-legend">${legendHtml}</div>
    </div>
  `;
}

function problemsCountsIconHtml(closedCount, totalCount) {
  const total = Math.max(0, Number(totalCount) || 0);
  const closed = Math.max(0, Math.min(total, Number(closedCount) || 0));

  if (total > 0 && closed === total) {
    return `<span class="subissues-problems-icon" aria-label="Tous les sujets sont closed">${SVG_ISSUE_CLOSED}</span>`;
  }

  const ratio = total ? (closed / total) : 0;
  const r = 8;
  const cx = 10;
  const cy = 10;
  const a = ratio * Math.PI * 2;

  let wedge = "";
  if (ratio > 0) {
    const x = cx + r * Math.sin(a);
    const y = cy - r * Math.cos(a);
    const large = a > Math.PI ? 1 : 0;
    wedge = `<path d="M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z" fill="rgba(137,87,229,.55)" opacity="0.75"></path>`;
  }

  return `
    <span class="subissues-problems-icon" aria-label="Sujets closed: ${closed}/${total}">
      <svg viewBox="0 0 20 20" width="16" height="16" class="subissues-problems-icon__svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(139,148,158,.55)" stroke-width="2"></circle>
        ${wedge}
      </svg>
    </span>
  `;
}

function problemsCountsHtml(situation) {
  const problems = situation?.sujets || [];
  const totalPb = problems.length;
  const closedPb = problems.filter((x) => String(getEffectiveSujetStatus(x.id) || "closed").toLowerCase() !== "open").length;
  return `<div class="subissues-counts subissues-counts--problems">${problemsCountsIconHtml(closedPb, totalPb)}<span>${closedPb} sur ${totalPb}</span></div>`;
}

/* =========================================================
   Table render
========================================================= */


function formatRelativeTimeLabel(ts, prefix = "updated") {
  if (!ts) return `${prefix} recently`;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return `${prefix} recently`;

  const diffMs = Date.now() - date.getTime();
  const future = diffMs < 0;
  const absSeconds = Math.max(1, Math.round(Math.abs(diffMs) / 1000));

  const units = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"]
  ];

  let value = 1;
  let unit = "second";
  for (const [seconds, label] of units) {
    if (absSeconds >= seconds) {
      value = Math.floor(absSeconds / seconds);
      unit = label;
      break;
    }
  }

  const plural = value > 1 ? "s" : "";
  if (future) return `${prefix} in ${value} ${unit}${plural}`;
  return `${prefix} ${value} ${unit}${plural} ago`;
}

function getEntityListTimestamp(entityType, entity) {
  const description = entity?.id ? getEntityDescriptionState(entityType, entity.id) : null;
  return firstNonEmpty(
    description?.updated_at,
    entity?.updated_at,
    entity?.created_at,
    entity?.raw?.updated_at,
    entity?.raw?.created_at,
    store.situationsView?.rawResult?.updated_at,
    store.situationsView?.rawResult?.created_at,
    nowIso()
  );
}

function rowSelectedClass(kind, id) {
  if (kind === "situation" && store.situationsView.selectedSituationId === id && !store.situationsView.selectedSujetId && !store.situationsView.selectedAvisId) return " selected subissue-row--selected";
  if (kind === "sujet" && store.situationsView.selectedSujetId === id && !store.situationsView.selectedAvisId) return " selected subissue-row--selected";
  if (kind === "avis" && store.situationsView.selectedAvisId === id) return " selected subissue-row--selected";
  return "";
}

function renderSituationRow(situation) {
  const expanded = store.situationsView.expandedSituations.has(situation.id);
  const hasSujets = getSituationSubjects(situation).length > 0;
  const effStatus = getEffectiveSituationStatus(situation.id);
  const meta = getEntityReviewMeta("situation", situation.id);
  const titleSeenClass = getReviewTitleStateClass("situation", situation.id);

  return `
    <div class="issue-row issue-row--sit click js-row-situation${rowSelectedClass("situation", situation.id)}" data-situation-id="${escapeHtml(situation.id)}">
      <div class="cell cell-theme lvl0">
        <span class="js-toggle-situation" data-situation-id="${escapeHtml(situation.id)}">${chevron(expanded, hasSujets)}</span>
        ${issueIcon(effStatus, { reviewState: meta.review_state, entityType: "situation", isSeen: meta.is_seen })}
        <span class="theme-text theme-text--sit ${titleSeenClass}">${escapeHtml(firstNonEmpty(situation.title, situation.id, "(sans titre)"))}</span>
      </div>
      <div class="cell cell-prio">${priorityBadge(situation.priority)}</div>
      <div class="cell cell-agent"></div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("situation", situation.id))}</div>
    </div>
  `;
}

function renderSujetRow(sujet) {
  const expanded = store.situationsView.expandedSujets.has(sujet.id);
  const hasAvis = (sujet.avis || []).length > 0;
  const effStatus = getEffectiveSujetStatus(sujet.id);
  const meta = getEntityReviewMeta("sujet", sujet.id);
  const titleSeenClass = getReviewTitleStateClass("sujet", sujet.id);

  return `
    <div class="issue-row issue-row--pb click js-row-sujet${rowSelectedClass("sujet", sujet.id)}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl1">
        ${issueIcon(effStatus, { reviewState: meta.review_state, entityType: "sujet", isSeen: meta.is_seen })}
        <span class="theme-text theme-text--pb ${titleSeenClass}">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
      </div>
      <div class="cell cell-prio">${priorityBadge(sujet.priority)}</div>
      <div class="cell cell-agent"></div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("sujet", sujet.id))}</div>
    </div>
  `;
}

function renderAvisRow(avis) {
  const effVerdict = getEffectiveAvisVerdict(avis.id);
  const titleSeenClass = getReviewTitleStateClass("avis", avis.id);

  return `
    <div class="issue-row issue-row--avis click js-row-avis${rowSelectedClass("avis", avis.id)}" data-avis-id="${escapeHtml(avis.id)}">
      <div class="cell cell-theme lvl2">
        <span class="theme-text theme-text--avis ${titleSeenClass}">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
      </div>
      <div class="cell cell-verdict">${renderVerdictPill(effVerdict)}</div>
      <div class="cell cell-prio"></div>
      <div class="cell cell-agent mono-small">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("avis", avis.id))}</div>
    </div>
  `;
}

function renderFlatAvisRow(avis, sujetId, situationId) {
  const effVerdict = getEffectiveAvisVerdict(avis.id);
  const lineage = [situationId, sujetId].filter(Boolean).join(" · ");
  const titleSeenClass = getReviewTitleStateClass("avis", avis.id);

  return `
    <div class="issue-row issue-row--avis click js-row-avis${rowSelectedClass("avis", avis.id)}" data-avis-id="${escapeHtml(avis.id)}">
      <div class="cell cell-theme lvl0">
        ${issueIcon("open")}
        <span class="theme-text theme-text--avis ${titleSeenClass}">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
        ${lineage ? `<span class="mono subissues-inline-count">${escapeHtml(lineage)}</span>` : ""}
      </div>
      <div class="cell cell-verdict">${renderVerdictPill(effVerdict)}</div>
      <div class="cell cell-prio"></div>
      <div class="cell cell-agent mono-small">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("avis", avis.id))}</div>
    </div>
  `;
}
function getSubjectsTableDeps() {
  return {
    store,
    escapeHtml,
    svgIcon,
    renderIssuesTable,
    renderDataTableHead,
    renderSubjectsStatusHeadHtml,
    renderSubjectsPriorityHeadHtml,
    getCurrentSubjectsStatusFilter,
    getCurrentSubjectsPriorityFilter,
    getFilteredStandaloneSubjects,
    getSituationSubjects,
    sujetMatchesStatusFilter,
    sujetMatchesPriorityFilter,
    getEffectiveSujetStatus,
    getEntityReviewMeta,
    getReviewTitleStateClass,
    getEntityDisplayRef,
    getEntityDescriptionState,
    formatRelativeTimeLabel,
    getEntityListTimestamp,
    getSubjectSidebarMeta,
    getSubjectLabelDefinition: projectSubjectLabels.getSubjectLabelDefinition,
    renderSubjectLabelBadge: projectSubjectLabels.renderSubjectLabelBadge,
    getObjectiveById,
    issueIcon,
    priorityBadge,
    firstNonEmpty
  };
}

/* =========================================================
   Details / summary / metadata
========================================================= */

function renderMetaItem(label, valueHtml) {
  return `
    <div class="meta-item">
      <div class="meta-k">${escapeHtml(label)}</div>
      <div class="meta-v">${valueHtml}</div>
    </div>
  `;
}

function renderDetailedMetaForSelection(selection) {
  if (!selection) return "";

  const item = selection.item;
  const raw = item.raw || {};
  const decision = getDecision(selection.type, item.id);

  const common = [
    renderMetaItem("ID", `<span class="mono">${escapeHtml(item.id)}</span>`),
    renderMetaItem("Title", escapeHtml(firstNonEmpty(item.title, item.id))),
    renderMetaItem("Agent", `<span class="mono">${escapeHtml(firstNonEmpty(item.agent, raw.agent, "system"))}</span>`),
    renderMetaItem("Priority", priorityBadge(firstNonEmpty(item.priority, raw.priority, "medium"))),
    renderMetaItem("Run", `<span class="mono">${escapeHtml(currentRunKey())}</span>`),
    renderMetaItem("Historique humain", decision ? `<span class="mono">${escapeHtml(decision.decision)} · ${escapeHtml(fmtTs(decision.ts))}</span>` : "—")
  ];

  if (selection.type === "avis") {
    const sujet = getSujetByAvisId(item.id);
    const situation = getSituationByAvisId(item.id);
    const entries = [
      ...common,
      renderMetaItem("Situation parent", `<span class="mono">${escapeHtml(situation?.id || "—")}</span>`),
      renderMetaItem("Sujet parent", `<span class="mono">${escapeHtml(sujet?.id || "—")}</span>`),
      renderMetaItem("Verdict effectif", renderVerdictPill(getEffectiveAvisVerdict(item.id))),
      renderMetaItem("Verdict source", renderVerdictPill(firstNonEmpty(raw.verdict, item.verdict, "-"))),
      renderMetaItem("Severity", `<span class="mono">${escapeHtml(firstNonEmpty(raw.severity, "—"))}</span>`),
      renderMetaItem("Source", `<span class="mono">${escapeHtml(firstNonEmpty(raw.source, "—"))}</span>`)
    ];
    return entries.join("");
  }

  if (selection.type === "sujet") {
    const situations = getSubjectSituations(item.id);
    const situationLabel = situations.length
      ? situations.map((situation) => String(situation?.id || "")).filter(Boolean).join(", ")
      : "—";
    const entries = [
      ...common,
      renderMetaItem(situations.length > 1 ? "Situations parentes" : "Situation parent", `<span class="mono">${escapeHtml(situationLabel)}</span>`),
      renderMetaItem("Sous-sujets", `<span class="mono">${escapeHtml(String((item.avis || []).length))}</span>`)
    ];
    return entries.join("");
  }

  const stats = situationVerdictStats(item);
  const entries = [
    ...common,
    renderMetaItem("Status effectif", statePill(getEffectiveSituationStatus(item.id))),
    renderMetaItem("Status source", statePill(firstNonEmpty(raw.status, item.status, "open"))),
    renderMetaItem("Sujets", `<span class="mono">${escapeHtml(String(getSituationSubjects(item).length))}</span>`),
    renderMetaItem("Verdicts", buildVerdictBarHtml(stats.counts, { legend: true }))
  ];
  return entries.join("");
}


function getSubjectSituations(subjectId) {
  const normalizedId = String(subjectId || "");
  const meta = getSubjectSidebarMeta(normalizedId);
  return meta.situationIds.map((situationId) => getNestedSituation(situationId)).filter(Boolean);
}

function summarizeSubjectMetaValue(items, emptyLabel = "Aucun") {
  if (!Array.isArray(items) || !items.length) return emptyLabel;
  if (items.length === 1) return items[0];
  return `${items[0]} +${items.length - 1}`;
}

function renderSubjectMetaField({ field, label, valueHtml }) {
  const dropdown = getSubjectsViewState().subjectMetaDropdown || {};
  const isOpen = dropdown.field === field;
  return `
    <section class="subject-meta-field ${isOpen ? "is-open" : ""}">
      <button
        type="button"
        class="subject-meta-field__trigger"
        data-subject-meta-trigger="${escapeHtml(field)}"
        data-subject-meta-anchor="${escapeHtml(field)}"
        aria-expanded="${isOpen ? "true" : "false"}"
      >
        <span class="subject-meta-field__label-row">
          <span class="subject-meta-field__label">${escapeHtml(label)}</span>
          <span class="subject-meta-field__gear" aria-hidden="true">${svgIcon("gear", { className: "octicon octicon-gear" })}</span>
        </span>
      </button>
      <div class="subject-meta-field__value">${valueHtml}</div>
    </section>
  `;
}

function renderSubjectMetaButtonValue(text, metaText = "") {
  return `
    <span class="subject-meta-field__value-text">${escapeHtml(text)}</span>
    ${metaText ? `<span class="subject-meta-field__value-meta">${escapeHtml(metaText)}</span>` : ""}
  `;
}

function renderObjectiveCounterIcon(objective) {
  const counts = getObjectiveSubjectCounts(objective);
  return problemsCountsIconHtml(counts.closed, counts.total);
}

function getSubjectSituationStatusLabel(situation, subjectId) {
  const linkedSubject = getSituationSubjects(situation).find((item) => String(item?.id || "") === String(subjectId || ""));
  const status = getEffectiveSujetStatus(linkedSubject?.id || subjectId) || linkedSubject?.status || "open";
  return normalizeIssueLifecycleStatus(status) === "closed" ? "Closed" : "Open";
}

function renderSubjectSituationKanbanButton(situation, subjectId) {
  const dropdown = getSubjectsViewState().subjectKanbanDropdown || {};
  const situationId = String(situation?.id || "");
  const isOpen = String(dropdown.subjectId || "") === String(subjectId || "") && String(dropdown.situationId || "") === situationId;
  return `
    <button
      type="button"
      class="subject-situation-kanban-trigger ${isOpen ? "is-open" : ""}"
      data-subject-kanban-trigger="${escapeHtml(subjectId)}"
      data-subject-kanban-situation-id="${escapeHtml(situationId)}"
      data-subject-kanban-anchor="${escapeHtml(subjectId)}::${escapeHtml(situationId)}"
      aria-expanded="${isOpen ? "true" : "false"}"
    >
      ${renderSujetKanbanStatusBadge(subjectId, situationId)}
      <span class="subject-situation-kanban-trigger__chevron" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
    </button>
  `;
}

function renderSubjectSituationCard(situation, subjectId) {
  const situationStatus = String(getEffectiveSituationStatus(situation?.id) || situation?.status || "open").toLowerCase();
  const isClosedSituation = situationStatus !== "open";
  return `
    <span class="subject-meta-situation-card">
      <span class="subject-meta-situation-card__head">
        <span class="subject-meta-situation-card__icon">${svgIcon(isClosedSituation ? "table-check" : "table", { className: "ui-icon octicon octicon-table" })}</span>
        <span class="subject-meta-situation-card__title">${escapeHtml(firstNonEmpty(situation.title, situation.id, "Situation"))}</span>
        ${isClosedSituation ? `<span class="subject-meta-situation-card__state">Fermée</span>` : ""}
      </span>
      <span class="subject-meta-situation-card__meta">
        <span>Status · ${escapeHtml(getSubjectSituationStatusLabel(situation, subjectId))}</span>
        ${renderSubjectSituationKanbanButton(situation, subjectId)}
      </span>
    </span>
  `;
}

function renderSubjectSituationsValue(subjectId) {
  const situations = getSubjectSituations(subjectId);
  if (!situations.length) return renderSubjectMetaButtonValue("Aucune situation");
  return `
    <span class="subject-meta-field__chips">
      ${situations.map((situation) => renderSubjectSituationCard(situation, subjectId)).join("")}
    </span>
  `;
}


function renderSubjectLabelsValue(subjectId) {
  const labels = getSubjectSidebarMeta(subjectId).labels
    .map((label) => getSubjectLabelDefinition(label))
    .filter(Boolean);
  if (!labels.length) return renderSubjectMetaButtonValue("Aucun label");
  return `
    <span class="subject-meta-labels-list">
      ${labels.map((labelDef) => renderSubjectLabelBadge(labelDef)).join("")}
    </span>
  `;
}

function renderSubjectObjectivesValue(subjectId) {
  const objective = getSubjectObjectives(subjectId)[0] || null;
  if (!objective) return renderSubjectMetaButtonValue("Aucun objectif");
  return `
    <span class="subject-meta-objective-card">
      <span class="subject-meta-objective-card__count">${renderObjectiveCounterIcon(objective)}</span>
      <span class="subject-meta-objective-card__title">${escapeHtml(objective.title)}</span>
      <span class="subject-meta-objective-card__date">${escapeHtml(formatObjectiveDueDateLabel(objective))}</span>
    </span>
  `;
}

function buildSubjectMetaMenuItems(subject, field) {
  const dropdownState = getSubjectsViewState().subjectMetaDropdown || {};
  const query = String(dropdownState.query || "").trim().toLowerCase();

  if (field === "objectives") {
    const selectedObjectiveId = String(getSubjectSidebarMeta(subject.id).objectiveIds[0] || "");
    const objectives = getObjectives();
    const matches = (objective) => matchSearch([objective.title, formatObjectiveDueDateLabel(objective), objective.id], query);
    const toItem = (objective) => {
      const isSelected = selectedObjectiveId === String(objective.id || "");
      return {
        key: String(objective.id || ""),
        isActive: String(dropdownState.activeKey || "") === String(objective.id || ""),
        isSelected,
        iconHtml: `
          <span class="select-menu__objective-iconset" aria-hidden="true">
            <span class="select-menu__objective-check ${isSelected ? "is-visible" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
            <span class="select-menu__objective-milestone">${svgIcon("milestone", { className: "octicon octicon-milestone" })}</span>
          </span>
        `,
        title: objective.title,
        metaHtml: escapeHtml(formatObjectiveDueDateLabel(objective)),
        dataAttrs: { "objective-select": String(objective.id || "") }
      };
    };
    return {
      openItems: objectives.filter((objective) => !objective.closed && matches(objective)).map(toItem),
      closedItems: objectives.filter((objective) => objective.closed && matches(objective)).map(toItem)
    };
  }

  if (field === "situations") {
    const selectedSituationIds = new Set(getSubjectSidebarMeta(subject.id).situationIds);
    const situations = (store.situationsView.data || []).filter((situation) => matchSearch([situation.title, situation.id], query));
    const toItem = (situation) => {
      const isSelected = selectedSituationIds.has(String(situation.id || ""));
      return {
        key: String(situation.id || ""),
        isActive: String(dropdownState.activeKey || "") === String(situation.id || ""),
        isSelected,
        iconHtml: `
          <span class="select-menu__situation-iconset" aria-hidden="true">
            <span class="select-menu__checkbox ${isSelected ? "is-checked" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
            <span class="select-menu__situation-icon">${svgIcon(String(getEffectiveSituationStatus(situation.id) || situation.status || "open").toLowerCase() === "open" ? "table" : "table-check", { className: "ui-icon octicon octicon-table" })}</span>
          </span>
        `,
        title: firstNonEmpty(situation.title, situation.id, "Situation"),
        metaHtml: escapeHtml(situation.id),
        dataAttrs: { "situation-toggle": String(situation.id || "") }
      };
    };
    return {
      openItems: situations.filter((situation) => String(getEffectiveSituationStatus(situation.id) || situation.status || "open").toLowerCase() === "open").map(toItem),
      closedItems: situations.filter((situation) => String(getEffectiveSituationStatus(situation.id) || situation.status || "open").toLowerCase() !== "open").map(toItem)
    };
  }

  if (field === "labels") {
    const selectedLabelKeys = new Set(getSubjectSidebarMeta(subject.id).labels.map((label) => normalizeSubjectLabelKey(label)));
    const items = projectSubjectLabels.getSubjectLabelDefinitions()
      .filter((labelDef) => matchSearch([labelDef.label, labelDef.description, labelDef.key], query))
      .map((labelDef) => ({
        key: String(labelDef.key || ""),
        isActive: String(dropdownState.activeKey || "") === String(labelDef.key || ""),
        isSelected: selectedLabelKeys.has(normalizeSubjectLabelKey(labelDef.key)),
        iconHtml: `
          <span class="select-menu__label-iconset" aria-hidden="true">
            <span class="select-menu__checkbox ${selectedLabelKeys.has(normalizeSubjectLabelKey(labelDef.key)) ? "is-checked" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
            <span class="select-menu__label-dot" style="--select-menu-label-dot:${escapeHtml(labelDef.textColor || labelDef.borderColor || labelDef.color || '#8b949e')};"></span>
          </span>
        `,
        title: labelDef.label,
        metaHtml: escapeHtml(labelDef.description),
        dataAttrs: { "subject-label-toggle": String(labelDef.key || "") }
      }));
    return {
      items,
      emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun label disponible."
    };
  }

  const emptyHintMap = {
    assignees: "Aucun assigné pour le moment.",
    labels: "Aucun label pour le moment.",
    relations: "Aucune relation pour le moment."
  };
  return { items: [], emptyHint: emptyHintMap[field] || "Aucune donnée." };
}

function renderSubjectMetaDropdown(subject, field) {
  const dropdownState = getSubjectsViewState().subjectMetaDropdown || {};
  const query = String(dropdownState.query || "");

  if (field === "objectives") {
    const { openItems, closedItems } = buildSubjectMetaMenuItems(subject, field);
    return `
      <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
        <div class="subject-meta-dropdown__title">Sélectionner des objectifs</div>
        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="Filtrer les objectifs" autocomplete="off">
        </div>
        <div class="subject-meta-dropdown__body">
          ${renderSelectMenuSection({ title: "Ouverts", items: openItems, emptyTitle: "Aucun objectif ouvert", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun objectif ouvert disponible." })}
          ${renderSelectMenuSection({ title: "Fermés", items: closedItems, emptyTitle: "Aucun objectif fermé", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun objectif fermé disponible." })}
        </div>
      </div>
    `;
  }

  if (field === "situations") {
    const { openItems, closedItems } = buildSubjectMetaMenuItems(subject, field);
    return `
      <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
        <div class="subject-meta-dropdown__title">Situations liées</div>
        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="Filtrer les situations" autocomplete="off">
        </div>
        <div class="subject-meta-dropdown__body">
          ${renderSelectMenuSection({ title: "Ouvertes", items: openItems, emptyTitle: "Aucune situation ouverte", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucune situation ouverte disponible." })}
          ${renderSelectMenuSection({ title: "Fermées", items: closedItems, emptyTitle: "Aucune situation fermée", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucune situation fermée disponible." })}
        </div>
      </div>
    `;
  }

  const { items, emptyHint } = buildSubjectMetaMenuItems(subject, field);
  const titles = {
    assignees: "Assigner ce sujet",
    labels: "Appliquer des labels au sujet",
    relations: "Gérer les relations"
  };
  return `
    <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
      <div class="subject-meta-dropdown__title">${escapeHtml(titles[field] || "Paramètres")}</div>
      ${field === "labels" ? `
        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="Filtrer les labels" autocomplete="off">
        </div>
        <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
      ` : ""}
      <div class="subject-meta-dropdown__body">
        ${renderSelectMenuSection({ items, emptyTitle: "Aucune donnée", emptyHint: emptyHint || "Cette liste sera branchée plus tard." })}
      </div>
    </div>
  `;
}

function getSubjectKanbanMenuEntries(subjectId, situationId, query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  return SUJET_KANBAN_STATUSES
    .filter((status) => matchSearch([status.label, status.hint, status.key], normalizedQuery))
    .map((status) => ({
      key: status.key,
      isActive: String(store.situationsView.subjectKanbanDropdown?.activeKey || "") === status.key,
      isSelected: getSujetKanbanStatus(subjectId, situationId) === status.key,
      iconHtml: `
        <span class="subject-kanban-menu__iconset" aria-hidden="true">
          <span class="subject-kanban-menu__check ${getSujetKanbanStatus(subjectId, situationId) === status.key ? "is-visible" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
          <span class="subject-kanban-menu__dot subject-kanban-menu__dot--${escapeHtml(String(status.key || "").replace(/_/g, "-"))}"></span>
        </span>
      `,
      title: status.label,
      metaHtml: escapeHtml(status.hint),
      dataAttrs: {
        "subject-kanban-select": status.key,
        "subject-kanban-situation-id": situationId,
        "subject-kanban-subject-id": subjectId
      }
    }));
}

function renderSubjectKanbanDropdown(subjectId, situationId) {
  const dropdownState = getSubjectsViewState().subjectKanbanDropdown || {};
  const query = String(dropdownState.query || "");
  const items = getSubjectKanbanMenuEntries(subjectId, situationId, query);
  return `
    <div class="subject-meta-dropdown subject-kanban-dropdown gh-menu gh-menu--open" role="dialog">
      <div class="subject-meta-dropdown__search">
        <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
        <input type="search" class="subject-meta-dropdown__search-input" data-subject-kanban-search="${escapeHtml(subjectId)}" data-subject-kanban-search-situation-id="${escapeHtml(situationId)}" value="${escapeHtml(query)}" placeholder="Filtrer les étapes" autocomplete="off">
      </div>
      <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
      <div class="subject-meta-dropdown__body">
        ${renderSelectMenuSection({ items, emptyTitle: "Aucune étape", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucune étape disponible." })}
      </div>
    </div>
  `;
}

function renderSubjectMetaControls(subject) {
  const meta = getSubjectSidebarMeta(subject.id);
  const selectedObjectives = meta.objectiveIds.map((objectiveId) => getObjectiveById(objectiveId)).filter(Boolean);
  return `
    <div class="subject-meta-controls">
      ${renderSubjectMetaField({
        field: "assignees",
        label: "Assigné à",
        valueHtml: renderSubjectMetaButtonValue(summarizeSubjectMetaValue(meta.assignees, "Personne"))
      })}
      ${renderSubjectMetaField({
        field: "labels",
        label: "Labels",
        valueHtml: renderSubjectLabelsValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "situations",
        label: "Situations",
        valueHtml: renderSubjectSituationsValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "objectives",
        label: "Objectifs",
        valueHtml: renderSubjectObjectivesValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "relations",
        label: "Relations",
        valueHtml: renderSubjectMetaButtonValue(summarizeSubjectMetaValue(meta.relations, "Aucune relation"))
      })}
    </div>
  `;
}

function renderSubIssuesForSujet(sujet, options = {}) {
  ensureViewUiState();
  const avisRowClass = options.avisRowClass || "js-row-avis";
  const rows = (sujet.avis || []).map((avis) => {
    const effVerdict = getEffectiveAvisVerdict(avis.id);
    return `
      <div class="issue-row issue-row--avis click ${avisRowClass}" data-avis-id="${escapeHtml(avis.id)}">
        <div class="cell cell-theme cell-theme--full lvl0">
          <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
        </div>
      </div>
    `;
  }).join("");

  const body = renderSubIssuesTable({
    rowsHtml: rows,
    emptyTitle: "Aucun sous-sujet"
  });

  return renderSubIssuesPanel({
    title: "Sous-sujets",
    leftMetaHtml: `<div class="subissues-counts subissues-counts--total"><span class="mono">${(sujet.avis || []).length}</span></div>`,
    rightMetaHtml: "",
    bodyHtml: body,
    isOpen: !!store.situationsView.rightSubissuesOpen
  });
}

function renderSubIssuesForSituation(situation, options = {}) {
  ensureViewUiState();

  const expandedSet = options.expandedSujets || store.situationsView.rightExpandedSujets;
  const sujetRowClass = options.sujetRowClass || "js-sub-right-select-sujet";
  const sujetToggleClass = options.sujetToggleClass || "js-sub-right-toggle-sujet";
  const avisRowClass = options.avisRowClass || "js-row-avis";

  const rows = [];
  for (const sujet of getSituationSubjects(situation)) {
    const open = expandedSet.has(sujet.id);
    const hasAvis = (sujet.avis || []).length > 0;
    const effStatus = getEffectiveSujetStatus(sujet.id);

    rows.push(`
      <div class="issue-row issue-row--pb click ${sujetRowClass}" data-sujet-id="${escapeHtml(sujet.id)}">
        <div class="cell cell-theme cell-theme--full lvl0">
          <span class="${sujetToggleClass}" data-sujet-id="${escapeHtml(sujet.id)}">${chevron(open, hasAvis)}</span>
          ${issueIcon(effStatus)}
          <span class="theme-text theme-text--pb">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
          <span class="subissues-inline-count mono">${(sujet.avis || []).length} avis</span>
        </div>
      </div>
    `);

    if (open) {
      for (const avis of sujet.avis || []) {
        const effVerdict = getEffectiveAvisVerdict(avis.id);
        rows.push(`
          <div class="issue-row issue-row--avis click ${avisRowClass}" data-avis-id="${escapeHtml(avis.id)}">
            <div class="cell cell-theme cell-theme--full lvl1">
              <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
            </div>
          </div>
        `);
      }
    }
  }

  const stats = situationVerdictStats(situation);
  const body = renderSubIssuesTable({
    rowsHtml: rows.join(""),
    emptyTitle: "Aucun sujet"
  });

  return renderSubIssuesPanel({
    title: "Sujets rattachés",
    leftMetaHtml: problemsCountsHtml(situation),
    rightMetaHtml: "",
    bodyHtml: body,
    isOpen: !!store.situationsView.rightSubissuesOpen
  });
}


function renderDetailsTitleWrapHtml(selection) {
  return projectSubjectDetail.renderDetailsTitleWrapHtml(selection);
}

function renderDetailsHtml(selectionOverride = null, options = {}) {
  return projectSubjectDetail.renderDetailsHtml(selectionOverride, options);
}

function updateDetailsModal() {
  projectSubjectDetail.updateDetailsModal();
}

function ensureDrilldownDom() {
  projectSubjectDrilldown.ensureDrilldownDom();
}

function updateDrilldownPanel() {
  projectSubjectDrilldown.updateDrilldownPanel();
}

function openDrilldownFromSujetPanel(sujetId) {
  projectSubjectDrilldown.openDrilldownFromSujet(sujetId);
}

function openDrilldownFromAvisPanel(avisId) {
  projectSubjectDrilldown.openDrilldownFromAvis(avisId);
}

function closeDrilldown() {
  projectSubjectDrilldown.closeDrilldown();
}

async function reloadSubjectsFromSupabase(root = subjectsCurrentRoot, options = {}) {
  const targetRoot = root || subjectsCurrentRoot;
  const shouldRerender = options?.rerender !== false;
  const shouldUpdateModal = !!options?.updateModal;

  const data = await loadExistingSubjectsForCurrentProject({ force: true });

  if (shouldRerender && targetRoot?.isConnected) {
    rerenderPanels();
  }

  if (shouldUpdateModal) {
    updateDetailsModal();
  }

  if (store.situationsView.drilldown?.isOpen) {
    updateDrilldownPanel();
  }

  return data;
}

function openDetailsModal() {
  projectSubjectDetail.openDetailsModal();
}

function closeDetailsModal() {
  projectSubjectDetail.closeDetailsModal();
}

function syncSituationsPrimaryScrollSource() {
  const panelHost = document.getElementById("situationsPanelHost");

  if (store.situationsView.createSubjectForm?.isOpen) {
    registerProjectPrimaryScrollSource(document.getElementById("projectSituationsScroll") || panelHost || null);
    return;
  }

  if (store.situationsView.showTableOnly) {
    const mainScrollBody = panelHost?.querySelector(".data-table-shell__body") || null;
    registerProjectPrimaryScrollSource(mainScrollBody);

    if (!mainScrollBody) return;

    requestAnimationFrame(() => {
      const currentPanelHost = document.getElementById("situationsPanelHost");
      const currentMainScrollBody = currentPanelHost?.querySelector(".data-table-shell__body") || null;
      if (!currentMainScrollBody || currentMainScrollBody !== mainScrollBody) return;
      registerProjectPrimaryScrollSource(currentMainScrollBody);
    });
    return;
  }

  const detailsHost = document.getElementById("situationsDetailsHost");
  registerProjectPrimaryScrollSource(detailsHost || null);
}

function rerenderPanels() {
  ensureViewUiState();

  const filteredSituations = getFilteredSituations();
  const counts = getVisibleCounts(filteredSituations);
  const panelHost = document.getElementById("situationsPanelHost");
  const searchInput = document.getElementById("situationsSearch");

  if (searchInput) searchInput.value = store.situationsView.search || "";

  rerenderSubjectsToolbar();

  if (panelHost) {
    if (store.situationsView.createSubjectForm?.isOpen) {
      panelHost.innerHTML = `<div id="subjectCreateFormHost" class="project-table-host">${renderCreateSubjectFormHtml()}</div>`;
      const createFormRoot = panelHost.querySelector("[data-create-subject-form]");
      wireDetailsInteractive(createFormRoot);
      syncSituationsPrimaryScrollSource();
    } else if (String(store.situationsView.subjectsSubview || "subjects") === "labels") {
      panelHost.innerHTML = `<div id="labelsTableHost" class="project-table-host">${projectSubjectLabels.renderLabelsTableHtml()}</div>`;
      syncSituationsPrimaryScrollSource();
    } else if (String(store.situationsView.subjectsSubview || "subjects") === "objectives") {
      panelHost.innerHTML = `<div id="objectivesTableHost" class="project-table-host">${projectSubjectMilestones.renderObjectivesTableHtml()}</div>`;
      syncSituationsPrimaryScrollSource();
    } else if (store.situationsView.showTableOnly) {
      panelHost.innerHTML = `<div id="situationsTableHost" class="project-table-host">${renderProjectSubjectsTable({
        filteredSituations,
        deps: getSubjectsTableDeps()
      })}</div>`;
      syncSituationsPrimaryScrollSource();
    } else {
      const details = renderDetailsHtml(null, {
        subissuesOptions: {
          sujetRowClass: "js-modal-drilldown-sujet",
          sujetToggleClass: "js-modal-toggle-sujet",
          avisRowClass: "js-modal-drilldown-avis",
          expandedSujets: store.situationsView.rightExpandedSujets
        }
      });
      panelHost.innerHTML = `
        <section class="gh-panel gh-panel--details gh-panel--details-standalone" aria-label="Details">
          <div class="gh-panel__head gh-panel__head--tight" id="situationsDetailsTitle">${details.titleHtml}</div>
          <div class="details-body" id="situationsDetailsHost">${details.bodyHtml}</div>
        </section>
      `;
      const detailsHost = document.getElementById("situationsDetailsHost");
      wireDetailsInteractive(detailsHost);
      bindDetailsScroll(document);
      detailsHost?.__syncCondensedTitle?.();
      syncSituationsPrimaryScrollSource();
    }
  }

  updateDetailsModal();
  if (store.situationsView.drilldown?.isOpen) updateDrilldownPanel();
  refreshProjectShellChrome("situations");
}



/* =========================================================
   Details actions (archive-like)
========================================================= */



function rerenderScope(root) {
  rerenderPanels();
  if (root?.closest?.("#detailsModal") && store.situationsView.detailsModalOpen) {
    updateDetailsModal();
  }
  if (root?.closest?.("#drilldownPanel") && store.situationsView.drilldown?.isOpen) {
    updateDrilldownPanel();
  }
}

async function applyCommentAction(root) {
  const target = currentDecisionTarget(root);
  if (!target) return;

  const ta = root.querySelector("#humanCommentBox");
  if (!ta) return;

  const message = String(ta.value || "").trim();
  if (!message) return;

  const helpActive = !!store.situationsView.helpMode || projectSubjectsLegacyRapso.isHelpTrigger(message);
  if (helpActive) {
    ta.value = "";
    store.situationsView.commentPreviewMode = false;
    await projectSubjectsLegacyRapso.askHelpEphemeral({
      rootEl: root,
      type: target.type,
      id: target.id,
      humanMessage: message,
      scope: root.closest("#detailsModal") ? "modal" : (root.closest("#drilldownPanel") ? "overlay" : "details")
    });
    return;
  }

  addComment(target.type, target.id, message, { actor: "Human", agent: "human" });
  ta.value = "";
  store.situationsView.commentPreviewMode = false;
  rerenderScope(root);

  if (/@rapso\b/i.test(message)) {
    await projectSubjectsLegacyRapso.askRapsoAndAppendReply({ type: target.type, id: target.id, humanMessage: message });
  }
}

function syncCommentPreview(root) {
  const ta = root.querySelector("#humanCommentBox");
  const preview = root.querySelector("#humanCommentPreview");
  if (!preview) return;
  preview.innerHTML = mdToHtml(ta?.value || "");
}


function closeSubjectMetaDropdown() {
  if (store.situationsView.subjectMetaDropdown) {
    store.situationsView.subjectMetaDropdown.field = null;
    store.situationsView.subjectMetaDropdown.query = "";
    store.situationsView.subjectMetaDropdown.activeKey = "";
  }
}

function closeSubjectKanbanDropdown() {
  if (store.situationsView.subjectKanbanDropdown) {
    store.situationsView.subjectKanbanDropdown.subjectId = "";
    store.situationsView.subjectKanbanDropdown.situationId = "";
    store.situationsView.subjectKanbanDropdown.query = "";
    store.situationsView.subjectKanbanDropdown.activeKey = "";
  }
}

function getSubjectMetaMenuEntries(subject, field) {
  const config = buildSubjectMetaMenuItems(subject, field);
  if (field === "objectives" || field === "situations") return [...(config.openItems || []), ...(config.closedItems || [])];
  return config.items || [];
}

function setSubjectMetaActiveEntry(subject, field, direction = 1) {
  const entries = getSubjectMetaMenuEntries(subject, field);
  if (!entries.length) {
    store.situationsView.subjectMetaDropdown.activeKey = "";
    return;
  }
  const currentKey = String(store.situationsView.subjectMetaDropdown.activeKey || "");
  const currentIndex = entries.findIndex((entry) => String(entry?.key || "") === currentKey);
  const nextIndex = currentIndex >= 0
    ? (currentIndex + direction + entries.length) % entries.length
    : 0;
  store.situationsView.subjectMetaDropdown.activeKey = String(entries[nextIndex]?.key || "");
}

function ensureSubjectMetaDropdownHost() {
  let host = document.getElementById("subjectMetaDropdownHost");
  if (host) return host;
  host = document.createElement("div");
  host.id = "subjectMetaDropdownHost";
  host.className = "subject-meta-dropdown-host";
  document.body.appendChild(host);
  return host;
}

function getSubjectMetaScopeRoot() {
  if (store.situationsView.createSubjectForm?.isOpen) return document.querySelector("[data-create-subject-form]");
  if (store.situationsView.drilldown?.isOpen) return document.getElementById("drilldownBody");
  if (store.situationsView.detailsModalOpen) return document.getElementById("detailsBodyModal");
  return document.getElementById("situationsDetailsHost");
}

function renderSubjectMetaDropdownHost(root) {
  const host = ensureSubjectMetaDropdownHost();
  const field = String(store.situationsView.subjectMetaDropdown?.field || "");
  const kanbanDropdown = store.situationsView.subjectKanbanDropdown || {};
  const selection = getScopedSelection(root);
  if (selection?.type !== "sujet") {
    host.innerHTML = "";
    host.setAttribute("aria-hidden", "true");
    return host;
  }
  if (field) {
    host.innerHTML = renderSubjectMetaDropdown(selection.item, field);
    host.setAttribute("aria-hidden", "false");
    return host;
  }
  if (String(kanbanDropdown.subjectId || "") === String(selection.item.id || "") && String(kanbanDropdown.situationId || "")) {
    host.innerHTML = renderSubjectKanbanDropdown(selection.item.id, String(kanbanDropdown.situationId || ""));
    host.setAttribute("aria-hidden", "false");
    return host;
  }
  host.innerHTML = "";
  host.setAttribute("aria-hidden", "true");
  return host;
}

function rerenderSubjectMetaScopes() {
  rerenderPanels();
  if (store.situationsView.detailsModalOpen) updateDetailsModal();
  if (store.situationsView.drilldown?.isOpen) updateDrilldownPanel();
}

function focusSubjectMetaSearch(root, field) {
  requestAnimationFrame(() => {
    const input = ensureSubjectMetaDropdownHost().querySelector(`[data-subject-meta-search="${field}"]`);
    input?.focus();
    input?.select?.();
  });
}

function focusSubjectKanbanSearch(subjectId, situationId) {
  requestAnimationFrame(() => {
    const input = ensureSubjectMetaDropdownHost().querySelector(`[data-subject-kanban-search="${CSS.escape(String(subjectId || ""))}"][data-subject-kanban-search-situation-id="${CSS.escape(String(situationId || ""))}"]`);
    input?.focus();
    input?.select?.();
  });
}

function syncSubjectMetaDropdownPosition(root) {
  const field = String(store.situationsView.subjectMetaDropdown?.field || "");
  const kanbanDropdown = store.situationsView.subjectKanbanDropdown || {};
  const host = ensureSubjectMetaDropdownHost();
  let anchorSelector = "";
  if (field) {
    anchorSelector = `[data-subject-meta-anchor="${field}"]`;
  } else if (String(kanbanDropdown.subjectId || "") && String(kanbanDropdown.situationId || "")) {
    anchorSelector = `[data-subject-kanban-anchor="${CSS.escape(String(kanbanDropdown.subjectId || ""))}::${CSS.escape(String(kanbanDropdown.situationId || ""))}"]`;
  } else {
    host.innerHTML = "";
    host.setAttribute("aria-hidden", "true");
    return;
  }
  requestAnimationFrame(() => {
    const scopeRoot = root || getSubjectMetaScopeRoot();
    const anchor = scopeRoot?.querySelector?.(anchorSelector);
    const dropdown = host.querySelector(".subject-meta-dropdown");
    if (!anchor || !dropdown) {
      host.innerHTML = "";
      host.setAttribute("aria-hidden", "true");
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const dropdownWidth = 320;
    const gutter = 12;
    const left = Math.max(gutter, Math.min(rect.right - dropdownWidth, viewportWidth - dropdownWidth - gutter));
    const maxHeight = Math.max(240, Math.min(420, viewportHeight - rect.bottom - gutter - 8));
    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${Math.max(gutter, rect.bottom - 4)}px`;
    dropdown.style.width = `${dropdownWidth}px`;
    dropdown.style.maxHeight = `${maxHeight}px`;
    host.setAttribute("aria-hidden", "false");
  });
}

function renderSubjectsToolbarButton({ id, label, icon, action, tone = "default" }) {
  return renderGhActionButton({
    id,
    label,
    icon,
    tone,
    size: "md",
    mainAction: action,
    withChevron: false
  });
}

function renderSituationsAddAction() {
  return renderSubjectsToolbarButton({
    id: "situationsAddAction",
    label: "Nouveau sujet",
    tone: "primary",
    action: "add-sujet"
  });
}

function renderObjectivesCreateAction() {
  return renderSubjectsToolbarButton({
    id: "objectivesCreateAction",
    label: "Nouvel objectif",
    tone: "primary",
    action: "add-objective"
  });
}

function renderSubjectsLabelsAction() {
  return renderSubjectsToolbarButton({
    id: "subjectsLabelsAction",
    label: "Labels",
    icon: svgIcon("tag", { className: "octicon octicon-tag" }),
    action: "open-labels"
  });
}

function renderSubjectsObjectivesAction() {
  return renderSubjectsToolbarButton({
    id: "subjectsObjectivesAction",
    label: "Objectifs",
    icon: svgIcon("milestone", { className: "octicon octicon-milestone" }),
    action: "open-objectives"
  });
}

function renderCreateSubjectMetaControls() {
  const subject = getDraftSubjectSelection()?.item || { id: DRAFT_SUBJECT_ID };
  const meta = getSubjectSidebarMeta(subject.id);
  const objective = meta.objectiveIds.map((objectiveId) => getObjectiveById(objectiveId)).filter(Boolean)[0] || null;
  return `
    <div class="subject-meta-controls subject-meta-controls--create">
      ${renderSubjectMetaField({
        field: "assignees",
        label: "Assigné à",
        valueHtml: renderSubjectMetaButtonValue(summarizeSubjectMetaValue(meta.assignees, "Personne"))
      })}
      ${renderSubjectMetaField({
        field: "labels",
        label: "Labels",
        valueHtml: renderSubjectLabelsValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "situations",
        label: "Situations",
        valueHtml: renderSubjectSituationsValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "objectives",
        label: "Objectifs",
        valueHtml: objective ? renderSubjectObjectivesValue(subject.id) : renderSubjectMetaButtonValue("Aucun objectif")
      })}
    </div>
  `;
}

function renderCreateSubjectFormHtml() {
  ensureViewUiState();
  const form = store.situationsView.createSubjectForm || {};
  const avatar = String(store.user?.avatar || "assets/images/260093543.png");
  const previewHtml = mdToHtml(String(form.description || "").trim());
  return `
    <section class="subject-create-shell" data-create-subject-form>
      <div class="subject-create-layout">
        <div class="subject-create-main">
          <div class="subject-create-header">
            <img src="${escapeHtml(avatar)}" alt="Avatar" class="subject-create-header__avatar">
            <div class="subject-create-header__title">Create new issue</div>
          </div>

          <label class="subject-create-field">
            <span class="subject-create-field__label">Add a title <span class="subject-create-field__required">*</span></span>
            <input type="text" class="subject-create-input" data-create-subject-title value="${escapeHtml(String(form.title || ""))}" placeholder="Title" autocomplete="off">
          </label>

          <div class="subject-create-field subject-create-field--editor">
            <div class="subject-create-field__label">Add a description</div>
            <div class="comment-box gh-comment-boxwrap subject-create-editor">
              <div class="comment-tabs comment-composer__tabs" role="tablist" aria-label="Description tabs">
                <button class="comment-tab ${!form.previewMode ? "is-active" : ""}" data-create-subject-tab="write" type="button">Write</button>
                <button class="comment-tab ${form.previewMode ? "is-active" : ""}" data-create-subject-tab="preview" type="button">Preview</button>
                <div class="subject-create-editor__toolbar" aria-hidden="true">
                  <span class="subject-create-editor__tool">H</span>
                  <span class="subject-create-editor__tool">B</span>
                  <span class="subject-create-editor__tool"><em>I</em></span>
                  <span class="subject-create-editor__tool">•</span>
                  <span class="subject-create-editor__tool">&lt;/&gt;</span>
                  <span class="subject-create-editor__tool">🔗</span>
                  <span class="subject-create-editor__tool">@</span>
                </div>
              </div>
              <div class="subject-create-editor__body ${form.previewMode ? "is-preview" : ""}">
                <textarea class="textarea comment-composer__textarea subject-create-textarea ${form.previewMode ? "hidden" : ""}" data-create-subject-description placeholder="Type your description here...">${escapeHtml(String(form.description || ""))}</textarea>
                <div class="comment-preview comment-composer__preview subject-create-preview ${form.previewMode ? "" : "hidden"}" data-create-subject-preview>${previewHtml || '<span class="subject-create-preview-empty">Aucun contenu à prévisualiser.</span>'}</div>
              </div>
            </div>
            ${form.validationError ? `<div class="subject-create-form__error">${escapeHtml(form.validationError)}</div>` : ""}
          </div>

          <div class="subject-create-footer">
            <div class="subject-create-footer__left">
              <label class="subject-create-checkbox">
                <input type="checkbox" data-create-subject-create-more ${form.createMore ? "checked" : ""}>
                <span>Create more</span>
              </label>
            </div>
            <div class="subject-create-footer__right">
              <button type="button" class="gh-btn" data-create-subject-cancel>Cancel</button>
              <button type="button" class="gh-btn gh-btn--primary" data-create-subject-submit>Create</button>
            </div>
          </div>
        </div>
        <aside class="subject-create-aside details-meta-col">
          ${renderCreateSubjectMetaControls()}
        </aside>
      </div>
    </section>
  `;
}

function renderSituationsViewHeaderHtml() {
  if (store.situationsView.createSubjectForm?.isOpen) {
    return "";
  }
  if (String(store.situationsView.subjectsSubview || "subjects") === "labels") {
    return renderProjectTableToolbar({
      className: "project-table-toolbar--situations project-table-toolbar--labels",
      leftHtml: renderProjectTableToolbarGroup({
        html: '<div class="project-table-toolbar__title">Labels</div>'
      }),
      rightHtml: renderProjectTableToolbarGroup({
        html: renderSubjectsToolbarButton({ id: "labelsCreateAction", label: "Nouveau label", action: "add-label", tone: "primary" })
      })
    });
  }

  if (String(store.situationsView.subjectsSubview || "subjects") === "objectives") {
    return projectSubjectMilestones.renderObjectivesViewHeaderHtml();
  }

  const rightHtml = [
    renderProjectTableToolbarGroup({
      html: renderProjectTableToolbarSearch({
        id: "situationsSearch",
        value: String(store.situationsView.search || ""),
        placeholder: "topic / EC8 / mot-clé…"
      })
    }),
    renderProjectTableToolbarGroup({
      html: renderSubjectsLabelsAction()
    }),
    renderProjectTableToolbarGroup({
      html: renderSubjectsObjectivesAction()
    }),
    renderProjectTableToolbarGroup({
      html: renderSituationsAddAction()
    })
  ].join("");

  return renderProjectTableToolbar({
    className: "project-table-toolbar--situations",
    leftHtml: "",
    rightHtml
  });
}

function rerenderSubjectsToolbar() {
  const toolbarHost = document.getElementById("situationsToolbarHost");
  if (!toolbarHost) return;
  const headerHtml = renderSituationsViewHeaderHtml();
  if (!String(headerHtml || "").trim()) {
    toolbarHost.innerHTML = "";
    return;
  }
  toolbarHost.innerHTML = `
    <div class="project-situations__table-toolbar project-page-shell project-page-shell--toolbar">
      ${headerHtml}
    </div>
  `;
}

function formatObjectiveMeta(objective) {
  const dueDate = objective?.dueDate
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(objective.dueDate))
    : "Pas de date définie";
  const counts = getObjectiveSubjectCounts(objective);
  return `${dueDate} - ${counts.closed}/${counts.total} sujets fermés`;
}



function buildDefaultObjectives() {
  const phasesCatalog = Array.isArray(store.projectForm?.phasesCatalog) && store.projectForm.phasesCatalog.length
    ? store.projectForm.phasesCatalog
    : DEFAULT_PROJECT_PHASES;

  return phasesCatalog
    .filter((phase) => phase?.enabled !== false)
    .sort((left, right) => {
      const leftOrder = Number(left?.order || left?.phaseOrder || 0) || 0;
      const rightOrder = Number(right?.order || right?.phaseOrder || 0) || 0;
      return leftOrder - rightOrder;
    })
    .map((phase, index) => ({
      id: `phase-${String(phase?.code || index + 1).trim().toLowerCase()}`,
      title: String(phase?.label || phase?.code || `Objectif ${index + 1}`),
      dueDate: String(phase?.phaseDate || ""),
      description: "",
      closed: false,
      subjectIds: [],
      subjectsCount: 0,
      closedSubjectsCount: 0,
      phaseCode: String(phase?.code || "")
    }));
}

function getObjectives() {
  const { bucket } = getRunBucket();
  if (Array.isArray(bucket?.objectives) && bucket.objectives.length) return bucket.objectives;

  const defaultObjectives = buildDefaultObjectives();
  if (!defaultObjectives.length) return [];

  persistRunBucket((draft) => {
    if (!Array.isArray(draft.objectives) || !draft.objectives.length) {
      draft.objectives = defaultObjectives.map((objective) => ({ ...objective }));
    }
  });

  const refreshedBucket = getRunBucket().bucket;
  return Array.isArray(refreshedBucket?.objectives) ? refreshedBucket.objectives : [];
}

function getObjectiveById(objectiveId) {
  return getObjectives().find((objective) => String(objective?.id || "") === String(objectiveId || "")) || null;
}


/* =========================================================
   Public render
========================================================= */

export function renderProjectSubjects(root) {
  ensureViewUiState();
  ensureDrilldownDom();
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
  updateDetailsModal();

  syncProjectSituationsRunbar({
    run_id: store.ui?.runId || "",
    status: store.ui?.systemStatus?.state || "idle",
    label: store.ui?.systemStatus?.label || "",
    meta: store.ui?.systemStatus?.meta || "",
    isBusy: store.ui?.systemStatus?.state === "running"
  });
}
