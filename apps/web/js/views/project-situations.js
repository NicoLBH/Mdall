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
  reorderSubjectChildrenInSupabase,
  reorderRootSubjectsInSupabase
} from "../services/subject-parent-relation-service.js";
import {
  loadSituationsForCurrentProject,
  loadMesSituations,
  createSituation,
  updateSituation,
  loadSubjectsForSituation,
  loadSituationInsightsData,
  setSituationSubjectKanbanStatus,
  loadSituationKanbanStatusMap,
  reorderSituationKanbanSubjects
} from "../services/project-situations-supabase.js";
import { chargerLesSujetsDesChantiers } from "../services/project-subjects-supabase.js";
import { chargerLesPersonnesDesChantiers } from "../services/profile-supabase-sync.js";
import { estMonCarnet } from "../services/mon-carnet.js";
import { champsDuCarnet as construireLesChampsDuCarnet } from "../services/vocabulaire-du-carnet.js";
import { metaDesSujets, moiDansLeProjet } from "../services/meta-des-sujets.js";
import { loadProjectSituationsTrajectoryHistory } from "../services/project-situations-trajectory-service.js";
import { createProjectSituationsState } from "./project-situations/project-situations-state.js";
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
  toggleSubjectObjectiveFromSharedDropdown,
  openSharedCreateSubissueModal,
  linkExistingSubjectAsSubissueFromSharedDropdown,
  champsDuProjetOuvert,
  metaDuProjetOuvert,
  moiDansLeProjetOuvert
} from "./project-subjects.js";

const { uiState, ensureSituationsViewState } = createProjectSituationsState({ store });

const {
  safeArray,
  firstNonEmpty,
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

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeSubjectIdsFromSelection(subjects = []) {
  return [...new Set((Array.isArray(subjects) ? subjects : [])
    .map((subject) => normalizeId(subject?.id))
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

async function ensureTrajectoryHistory({ situationId = "", subjects = [] } = {}) {
  const normalizedSituationId = normalizeId(situationId);
  const subjectIds = normalizeSubjectIdsFromSelection(subjects);
  const subjectIdsSignature = subjectIds.join(",");

  if (!store.projectSubjectsView || typeof store.projectSubjectsView !== "object") {
    store.projectSubjectsView = {};
  }
  const cacheBySituationId = store.projectSubjectsView.trajectoryHistoryBySituationId && typeof store.projectSubjectsView.trajectoryHistoryBySituationId === "object"
    ? store.projectSubjectsView.trajectoryHistoryBySituationId
    : {};
  store.projectSubjectsView.trajectoryHistoryBySituationId = cacheBySituationId;

  const cached = cacheBySituationId[normalizedSituationId];
  const cachedSignature = String(cached?.subjectIdsSignature || "").trim();
  const hasUsableCachedPayload = cached
    && typeof cached === "object"
    && cached.eventsBySubjectId
    && cached.statusEventsBySubjectId
    && Array.isArray(cached.relationEvents)
    && cached.historyStatus === "ready"
    && cached.isComplete === true;


  if (hasUsableCachedPayload && cachedSignature === subjectIdsSignature) {
    return cached;
  }

  if (!normalizedSituationId || !subjectIds.length) {
    const emptyPayload = {
      eventsBySubjectId: {},
      relationEvents: [],
      statusEventsBySubjectId: {},
      subjectIdsSignature,
      historyStatus: "ready",
      isComplete: true,
      errorMessage: ""
    };
    cacheBySituationId[normalizedSituationId] = emptyPayload;
    return emptyPayload;
  }

  cacheBySituationId[normalizedSituationId] = {
    eventsBySubjectId: {},
    relationEvents: [],
    statusEventsBySubjectId: {},
    subjectIdsSignature,
    historyStatus: "loading",
    isComplete: false,
    errorMessage: ""
  };

  try {
    const history = await loadProjectSituationsTrajectoryHistory({
      projectId: normalizeId(store?.currentProjectId || store?.projectForm?.projectId || ""),
      subjectIds
    });
    const payload = {
      eventsBySubjectId: history?.eventsBySubjectId && typeof history.eventsBySubjectId === "object" ? history.eventsBySubjectId : {},
      relationEvents: Array.isArray(history?.relationEvents) ? history.relationEvents : [],
      statusEventsBySubjectId: history?.statusEventsBySubjectId && typeof history.statusEventsBySubjectId === "object" ? history.statusEventsBySubjectId : {},
      subjectIdsSignature,
      historyStatus: "ready",
      isComplete: true,
      errorMessage: ""
    };
    cacheBySituationId[normalizedSituationId] = payload;
    return payload;
  } catch (error) {
    console.error("[trajectory] history.ensure.error", error);
    const errorPayload = {
      eventsBySubjectId: {},
      relationEvents: [],
      statusEventsBySubjectId: {},
      subjectIdsSignature,
      historyStatus: "error",
      isComplete: false,
      errorMessage: error instanceof Error ? error.message : "Impossible de charger l'historique de trajectoire."
    };
    cacheBySituationId[normalizedSituationId] = errorPayload;
    return errorPayload;
  }
}

const {
  getSituationById,
  loadSituationSelection,
  refreshSituationsData: refreshSituationsDataInternal,
  sujetsQueRetient,
  repriseDeLAncienFiltre,
  createSituationRecord,
  updateSituationRecord
} = createProjectSituationsPersistence({
  store,
  uiState,
  safeArray,
  loadFlatSubjectsForCurrentProject,
  loadSituationsForCurrentProject,
  loadMesSituations,
  chargerLesSujetsDesChantiers,
  chargerLesPersonnesDesChantiers,
  champsDeLEcran,
  metaDeLEcran,
  moiDeLEcran,
  loadSubjectsForSituation,
  ensureTrajectoryHistory,
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
  renderSituationsTable,
  getSituationById,
  sujetsQueRetient,
  champsDeLEcran,
  moiDeLEcran,
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
  reorderSituationKanbanSubjects: async (situationId, kanbanStatus, orderedSubjectIds = []) => {
    await reorderSituationKanbanSubjects(situationId, kanbanStatus, orderedSubjectIds);
    return true;
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

/**
 * Le vocabulaire de l'écran, et ce qu'il faut pour relire une requête.
 *
 * ## Deux écrans, deux vocabulaires, une seule porte
 *
 * Le même tableau de situations se monte à deux endroits, et leurs requêtes ne
 * parlent pas de la même chose : le carnet connaît les labels et les gens de
 * tous mes chantiers, l'écran d'un projet connaît en plus **ses lots et ses
 * situations**. Prendre le vocabulaire du carnet sur l'écran d'un projet y
 * ferait disparaître `lot:` — la même requête retiendrait deux choses selon
 * l'onglet d'où on la regarde (règle 4).
 *
 * Chacun a donc le sien, construit par l'écran à qui il appartient, et le choix
 * se fait ici, une fois. Les trois vont ensemble : les champs disent ce qui
 * s'écrit, la surcouche dit ce que chaque sujet porte, « moi » dit qui regarde.
 * Une requête relue avec les champs d'un écran et la surcouche d'un autre ne
 * rendrait pas la même chose.
 */
function chargeDuCarnet() {
  return store.situationsView?.sujetsDuCarnet?.rawSubjectsResult ?? {};
}

function champsDeLEcran() {
  if (!estMonCarnet(store)) return champsDuProjetOuvert();

  return construireLesChampsDuCarnet({
    charge: chargeDuCarnet(),
    personnes: store.situationsView?.personnesDuCarnet ?? [],
    nomsDesProjets: store.situationsView?.nomsDesProjets ?? {}
  });
}

function metaDeLEcran() {
  if (!estMonCarnet(store)) return metaDuProjetOuvert();

  const charge = chargeDuCarnet();
  return metaDesSujets({
    sujets: Array.isArray(charge.subjects) ? charge.subjects : [],
    raw: charge,
    collaborateurs: store.situationsView?.personnesDuCarnet ?? []
  });
}

/**
 * Qui regarde, **en identifiant de personne**.
 *
 * `store.user.id` est un compte Mdall ; les assignations et les mentions
 * portent des identifiants de personne. Les deux sont des UUID et se comparent
 * sans erreur : « assigné:moi » ne rendrait jamais rien.
 */
function moiDeLEcran() {
  if (!estMonCarnet(store)) return moiDansLeProjetOuvert();

  return moiDansLeProjet({
    collaborateurs: store.situationsView?.personnesDuCarnet ?? [],
    utilisateur: store.user?.id ?? ""
  });
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
  champsDeLEcran,
  store,
  uiState,
  safeArray,
  rerender,
  refreshSituationsData,
  createSituationRecord,
  updateSituationRecord,
  repriseDeLAncienFiltre,
  setSelectedSituationId,
  getSituationById,
  loadSituationSelection,
  loadSituationInsightsData,
  openSituationDrilldownFromSelection,
  openSubjectDrilldown: (...args) => openSubjectDrilldownFromSituation(...args),
  openSharedSubjectMetaDropdown: (...args) => openSharedSubjectMetaDropdown(...args),
  openSharedSubjectKanbanDropdown: (...args) => openSharedSubjectKanbanDropdown(...args),
  closeSharedSubjectDropdowns: (...args) => closeSharedSubjectDropdowns(...args),
  setSharedSubjectMetaDropdownQuery: (...args) => setSharedSubjectMetaDropdownQuery(...args),
  setSharedSubjectKanbanDropdownQuery: (...args) => setSharedSubjectKanbanDropdownQuery(...args),
  toggleSubjectAssigneeFromSharedDropdown: (...args) => toggleSubjectAssigneeFromSharedDropdown(...args),
  toggleSubjectLabelFromSharedDropdown: (...args) => toggleSubjectLabelFromSharedDropdown(...args),
  toggleSubjectObjectiveFromSharedDropdown: (...args) => toggleSubjectObjectiveFromSharedDropdown(...args),
  openSharedCreateSubissueModal: (...args) => openSharedCreateSubissueModal(...args),
  linkExistingSubjectAsSubissueFromSharedDropdown: (...args) => linkExistingSubjectAsSubissueFromSharedDropdown(...args),
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
  },
  reorderSituationGridRootSubjects: async (orderedRootSubjectIds = []) => {
    const normalizedRootIds = [...new Set((Array.isArray(orderedRootSubjectIds) ? orderedRootSubjectIds : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean))];
    if (!normalizedRootIds.length) return [];
    return reorderRootSubjectsInSupabase({
      orderedRootSubjectIds: normalizedRootIds
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
