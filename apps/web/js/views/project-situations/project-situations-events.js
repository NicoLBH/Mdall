import { bindLightTabs } from "../ui/light-tabs.js";
import { renderProjectSituationDrilldown } from "../project-situation-drilldown.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderSelectMenuSection } from "../ui/select-menu.js";
import {
  buildSituationGridColumnWidthsScopeKey,
  getSituationGridColumnCssVariables,
  getSituationGridColumnDefinitions,
  normalizeSituationGridColumnWidths
} from "./project-situations-view-grid.js";
import { buildSubjectHierarchyIndexes } from "../../services/subject-hierarchy.js";
import { getExpandedSubjectIdsSet, resolveSituationTreeData } from "./project-situations-tree-data.js";
import { situationsDeLecture } from "../../services/lectures-du-carnet.js";
import {
  compositionDepuisLaSituation, compositionNeuve, refusDeLaComposition, situationAEcrire
} from "../../services/situation-en-composition.js";
import { phraseDesPerdus } from "../../services/requete-dun-filtre.js";
import { requeteDeLaSituation, situationDuRepere } from "../../services/situation-comme-une-vue.js";
import {
  BLOC_DES_FILTRES, basculerUnMenuDenTete, dansUnBlocDeFiltres,
  fermerLesMenusDenTete, ouvrirUnMenuDenTete
} from "../ui/menus-den-tete.js";


const SITUATION_GRID_KANBAN_OPTIONS = [
  { key: "non_active", label: "Non activé", hint: "Hors de la pile active." },
  { key: "to_activate", label: "À activer", hint: "Prêt à être pris en charge." },
  { key: "in_progress", label: "En cours", hint: "Travail en cours." },
  { key: "in_arbitration", label: "En arbitrage", hint: "Décision en attente." },
  { key: "resolved", label: "Résolu", hint: "Sujet clôturé côté situation." }
];
const TRAJECTORY_LEFT_COLUMN_WIDTH = {
  min: 72,
  max: 640,
  default: 320
};
const TRAJECTORY_ROW_HEIGHT = 40;
const TRAJECTORY_ZOOM_VALUES = new Set(["hour", "half-day", "day", "week", "month"]);

function normalizeTrajectoryZoom(value, fallback = "day") {
  const normalized = String(value || "").trim().toLowerCase();
  return TRAJECTORY_ZOOM_VALUES.has(normalized) ? normalized : fallback;
}

function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, yyyy, mm, dd] = dateOnlyMatch;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
  }
  return new Date(value);
}

function toTimelineDisplayDate(value, zoom = "day") {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return date;
  if (String(zoom || "").trim().toLowerCase() === "day") {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  }
  return date;
}

function flattenVisibleSubjectIds({
  rootSubjectIds = [],
  childrenBySubjectId = {},
  expandedSubjectIds = new Set()
} = {}) {
  const visibleIds = [];
  const visit = (subjectId) => {
    const normalizedId = String(subjectId || "").trim();
    if (!normalizedId) return;
    visibleIds.push(normalizedId);
    if (!expandedSubjectIds.has(normalizedId)) return;
    const children = Array.isArray(childrenBySubjectId?.[normalizedId])
      ? childrenBySubjectId[normalizedId]
      : [];
    children.forEach(visit);
  };
  (Array.isArray(rootSubjectIds) ? rootSubjectIds : []).forEach(visit);
  return visibleIds;
}

export function createProjectSituationsEvents({
  store,
  uiState,
  /**
   * Ce qui rend une liste quoi qu'on lui donne.
   *
   * **Déclaré ici parce qu'il était employé sans l'être.** Deux appels le
   * prenaient dans le vide — `ReferenceError` au clic sur une entrée du rail,
   * et au moment d'enregistrer une situation. Le nom venait d'un module voisin
   * où il est une dépendance ; recopié sans sa porte, il ne ratait pas
   * bruyamment : il ne ratait qu'à l'exécution, chez quelqu'un.
   */
  safeArray = (valeur) => (Array.isArray(valeur) ? valeur : []),
  rerender,
  refreshSituationsData,
  createSituationRecord,
  updateSituationRecord,
  /** Effacer une situation. Sans retour : l'écran demande avant, pas après. */
  supprimerLaSituation = async () => undefined,
  /** Marquer sienne une situation d'avant le cloisonnement. */
  reprendreLaSituation = async () => "",
  /** L'ancien filtre d'une situation, repris en requête — ou `null`. */
  repriseDeLAncienFiltre = () => null,
  setSelectedSituationId,
  getSituationById,
  loadSituationSelection,
  /** Le vocabulaire du carnet : sans lui, aucune requête du rail ne se relit. */
  champsDeLEcran = () => [],
  loadSituationInsightsData,
  closeSituationDrilldown,
  openSituationDrilldownFromSelection,
  openSubjectDrilldown,
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
  setSituationGridKanbanStatus,
  setSituationGridSubjectParent,
  reorderSituationGridSubjectChildren,
  reorderSituationGridRootSubjects
}) {
  let insightsRequestId = 0;
  let trajectoryRuntimeModulesPromise = null;

  function loadTrajectoryRuntimeModules() {
    if (!trajectoryRuntimeModulesPromise) {
      trajectoryRuntimeModulesPromise = Promise.all([
        import("./trajectory/trajectory-time-scale.js"),
        import("./trajectory/trajectory-model.js"),
        import("./trajectory/trajectory-dom-renderer.js"),
        import("./trajectory/trajectory-virtualizer.js")
      ]);
    }
    return trajectoryRuntimeModulesPromise;
  }

  function isSituationInsightsDebugEnabled() {
    try {
      return window.localStorage?.getItem("debug:situation-insights") === "1";
    } catch (_) {
      return false;
    }
  }

  function logSituationInsights(message, payload = {}) {
    if (!isSituationInsightsDebugEnabled()) return;
    console.info(`[situation-insights] ${message}`, payload);
  }

  function isSituationGridDropdownDebugEnabled() {
    try {
      const storageValue = String(window.localStorage?.getItem("debug:situation-grid-dropdown") || "").trim().toLowerCase();
      const sessionValue = String(window.sessionStorage?.getItem("debug:situation-grid-dropdown") || "").trim().toLowerCase();
      return storageValue === "1" || storageValue === "true" || sessionValue === "1" || sessionValue === "true";
    } catch (_) {
      return false;
    }
  }

  function logSituationGridDropdown(message, payload = {}) {
    if (!isSituationGridDropdownDebugEnabled()) return;
    console.info(`[situation-grid-dropdown] ${message}`, payload);
  }

  function logSituationGridSupabaseMutation(payload = {}) {
    if (!isSituationGridDropdownDebugEnabled()) return;
    console.info("[situation-grid-dropdown] supabase-mutation", payload);
  }

  function getSharedDropdownDebugMeta() {
    const dropdown = store?.projectSubjectsView?.subjectMetaDropdown || {};
    return {
      openedFrom: String(dropdown?.openedFrom || ""),
      metaScope: String(dropdown?.scope || "")
    };
  }

  function buildSituationGridDropdownDebugPayload({
    field = "",
    subjectId = "",
    situationId = "",
    value = "",
    event = null
  } = {}) {
    return {
      field,
      subjectId,
      situationId,
      value,
      target: event?.target?.outerHTML?.slice?.(0, 200) || "",
      ...getSharedDropdownDebugMeta()
    };
  }

  function resolveCurrentProjectId() {
    return String(
      store?.currentProjectId
      || store?.projectForm?.projectId
      || store?.projectForm?.id
      || ""
    ).trim();
  }

  function ensureSituationGridCellDropdownState() {
    if (!uiState.situationGridCellDropdown || typeof uiState.situationGridCellDropdown !== "object") {
      uiState.situationGridCellDropdown = {
        open: false,
        field: "",
        subjectId: "",
        situationId: "",
        anchor: null
      };
    }
    return uiState.situationGridCellDropdown;
  }

  function closeSituationGridCellDropdown() {
    const state = ensureSituationGridCellDropdownState();
    const scrollNode = state.anchor?.closest?.(".project-situation-grid__scroll, .situation-grid__scroll") || null;
    const preservedScrollTop = Number(scrollNode?.scrollTop || 0);
    const preservedScrollLeft = Number(scrollNode?.scrollLeft || 0);
    const host = document.getElementById("subjectMetaDropdownHost");
    if (host?.dataset) delete host.dataset.situationGridOwned;
    logSituationGridDropdown("close", buildSituationGridDropdownDebugPayload({
      field: state.field,
      subjectId: state.subjectId,
      situationId: state.situationId
    }));
    state.anchor?.closest?.(".situation-grid__cell")?.classList?.remove?.("situation-grid__cell--active");
    if (state.anchor?.setAttribute) state.anchor.setAttribute("aria-expanded", "false");
    state.open = false;
    state.field = "";
    state.subjectId = "";
    state.situationId = "";
    state.anchor = null;
    closeSharedSubjectDropdowns?.();
    if (scrollNode) {
      scrollNode.scrollTop = preservedScrollTop;
      scrollNode.scrollLeft = preservedScrollLeft;
    }
  }

  function setSituationGridDropdownRoot(root) {
    if (uiState && typeof uiState === "object") {
      uiState.situationGridDropdownRoot = root || null;
    }
  }

  function bindSituationGridSubissueDropdownHost(root) {
    if (!uiState || typeof uiState !== "object") return;
    const host = document.getElementById("subjectMetaDropdownHost");
    if (!host) return;
    if (uiState?.situationGridSubissueDropdownHost === host && uiState?.situationGridSubissueDropdownAbortController) return;
    uiState?.situationGridSubissueDropdownAbortController?.abort?.();
    uiState.situationGridSubissueDropdownHost = host;
    uiState.situationGridSubissueDropdownAbortController = new AbortController();
    const signal = uiState.situationGridSubissueDropdownAbortController.signal;
    host.addEventListener("click", async (event) => {
      const eventTarget = event.target instanceof Element ? event.target : null;
      if (!eventTarget) return;
      if (String(host.dataset?.situationGridOwned || "") !== "1") return;
      const state = ensureSituationGridCellDropdownState();
      if (!state.open || String(state.field || "").trim().toLowerCase() !== "subissue-actions") return;

      const createButton = eventTarget.closest('[data-action="open-create-subissue"]');
      if (createButton) {
        event.preventDefault();
        event.stopPropagation();
        const parentSubjectId = String(state.subjectId || "").trim();
        if (!parentSubjectId) return;
        closeSituationGridCellDropdown();
        openSharedCreateSubissueModal?.({
          parentSubjectId,
          sourceSubjectId: parentSubjectId,
          scopeHost: "main",
          root
        });
        return;
      }

      const existingButton = eventTarget.closest('[data-action="open-link-existing-subissue"]');
      if (existingButton) {
        event.preventDefault();
        event.stopPropagation();
        const dropdown = store?.projectSubjectsView?.subjectMetaDropdown;
        if (!dropdown || typeof dropdown !== "object") return;
        dropdown.subissueActionsView = "existing-subissue";
        dropdown.subissueActionIntent = "link-existing";
        dropdown.subissueActionSubjectId = String(state.subjectId || "").trim();
        dropdown.subissueActionScopeHost = "main";
        dropdown.query = "";
        dropdown.activeKey = "";
        setSharedSubjectMetaDropdownQuery?.("", root);
        const refreshedHost = document.getElementById("subjectMetaDropdownHost");
        if (refreshedHost?.dataset) refreshedHost.dataset.situationGridOwned = "1";
        bindSituationGridSubissueDropdownHost(root);
        return;
      }

      const subissueExistingEntry = eventTarget.closest("[data-subject-subissue-existing-entry]");
      if (subissueExistingEntry) {
        event.preventDefault();
        event.stopPropagation();
        const childSubjectId = String(subissueExistingEntry.dataset?.subjectSubissueExistingEntry || "").trim();
        const parentSubjectId = String(state.subjectId || store?.projectSubjectsView?.subjectMetaDropdown?.subissueActionSubjectId || "").trim();
        if (!parentSubjectId || !childSubjectId || parentSubjectId === childSubjectId) return;
        const linked = await linkExistingSubjectAsSubissueFromSharedDropdown?.({
          parentSubjectId,
          childSubjectId,
          root
        });
        if (!linked) return;
        closeSituationGridCellDropdown();
        await refreshSituationsData?.();
        rerender(root);
      }
    }, { capture: true, signal });
  }

  function resolveSituationGridDropdownRoot() {
    if (uiState?.situationGridDropdownRoot?.isConnected) return uiState.situationGridDropdownRoot;
    const state = ensureSituationGridCellDropdownState();
    if (state.anchor?.isConnected) {
      return state.anchor.closest(".project-shell__content") || state.anchor.ownerDocument?.querySelector?.(".project-shell__content") || document;
    }
    return document.querySelector(".project-shell__content") || document;
  }

  function openSituationGridCellDropdown(root, { field = "", anchor = null, subjectId = "", situationId = "" } = {}) {
    if (!anchor) return;
    const scopeRoot = resolveSituationGridDropdownRoot();
    const normalizedField = String(field || "").trim().toLowerCase();
    const instanceKey = normalizedField === "subissue-actions"
      ? "situation-grid-subissue-actions"
      : "situation-grid";
    const state = ensureSituationGridCellDropdownState();
    closeSituationGridCellDropdown();
    state.open = true;
    state.field = String(field || "").trim().toLowerCase();
    state.subjectId = String(subjectId || "").trim();
    state.situationId = String(situationId || "").trim();
    state.anchor = anchor;
    anchor.closest?.(".situation-grid__cell")?.classList?.add?.("situation-grid__cell--active");
    anchor.setAttribute("aria-expanded", "true");
    logSituationGridDropdown("open", buildSituationGridDropdownDebugPayload({
      field: state.field,
      subjectId: state.subjectId,
      situationId: state.situationId
    }));
    if (state.field === "kanban") {
      const opened = openSharedSubjectKanbanDropdown?.({
        root: scopeRoot,
        subjectId: state.subjectId,
        situationId: state.situationId
      });
      if (!opened) closeSituationGridCellDropdown();
      return;
    }

    const opened = openSharedSubjectMetaDropdown?.({
      root: scopeRoot,
      field: state.field,
      subjectId: state.subjectId,
      anchor,
      scope: "situation-grid",
      scopeHost: "main",
      instanceKey,
      openedFrom: "situation-grid"
    });
    if (opened && state.field === "subissue-actions" && store?.projectSubjectsView?.subjectMetaDropdown) {
      const dropdown = store.projectSubjectsView.subjectMetaDropdown;
      dropdown.subissueActionsView = "menu";
      dropdown.query = "";
      dropdown.activeKey = "";
      dropdown.subissueActionSubjectId = state.subjectId;
      dropdown.subissueActionScopeHost = "main";
      dropdown.subissueActionIntent = "";
      setSharedSubjectMetaDropdownQuery?.("", scopeRoot);
      const refreshedHost = document.getElementById("subjectMetaDropdownHost");
      if (refreshedHost?.dataset) refreshedHost.dataset.situationGridOwned = "1";
      bindSituationGridSubissueDropdownHost(root);
    }
    if (!opened) closeSituationGridCellDropdown();
  }

  function getKanbanLabel(status = "") {
    const meta = {
      non_active: { label: "Non activé", bg: "rgba(46, 160, 67, 0.15)", border: "rgb(35, 134, 54)", text: "rgb(63, 185, 80)" },
      to_activate: { label: "À activer", bg: "rgba(56, 139, 253, 0.1)", border: "rgb(31, 111, 235)", text: "rgb(88, 166, 255)" },
      in_progress: { label: "En cours", bg: "rgba(187, 128, 9, 0.15)", border: "rgb(158, 106, 3)", text: "rgb(210, 153, 34)" },
      in_arbitration: { label: "En arbitrage", bg: "rgba(171, 125, 248, 0.15)", border: "rgb(137, 87, 229)", text: "rgb(188, 140, 255)" },
      resolved: { label: "Résolu", bg: "rgba(219, 109, 40, 0.1)", border: "rgb(189, 86, 29)", text: "rgb(255, 161, 107)" }
    };
    return (meta[String(status || "").trim().toLowerCase()] || meta.non_active).label;
  }

  function getKanbanTone(status = "") {
    const meta = {
      non_active: { bg: "rgba(46, 160, 67, 0.15)", border: "rgb(35, 134, 54)", text: "rgb(63, 185, 80)" },
      to_activate: { bg: "rgba(56, 139, 253, 0.1)", border: "rgb(31, 111, 235)", text: "rgb(88, 166, 255)" },
      in_progress: { bg: "rgba(187, 128, 9, 0.15)", border: "rgb(158, 106, 3)", text: "rgb(210, 153, 34)" },
      in_arbitration: { bg: "rgba(171, 125, 248, 0.15)", border: "rgb(137, 87, 229)", text: "rgb(188, 140, 255)" },
      resolved: { bg: "rgba(219, 109, 40, 0.1)", border: "rgb(189, 86, 29)", text: "rgb(255, 161, 107)" }
    };
    return meta[String(status || "").trim().toLowerCase()] || meta.non_active;
  }

  function patchSituationGridKanbanCell({ root, subjectId = "", situationId = "" } = {}) {
    if (!root || !subjectId || !situationId) return;
    const trigger = [...root.querySelectorAll('[data-situation-grid-edit-cell="kanban"]')]
      .find((node) => String(node.getAttribute("data-situation-grid-subject-id") || "").trim() === subjectId
        && String(node.getAttribute("data-situation-grid-situation-id") || "").trim() === situationId);
    if (!trigger) return;
    const nextStatus = String(store?.situationsView?.kanbanStatusBySituationId?.[situationId]?.[subjectId] || "non_active").trim().toLowerCase();
    const badge = trigger.querySelector(".subject-kanban-badge");
    if (!badge) return;
    badge.textContent = getKanbanLabel(nextStatus);
    const tone = getKanbanTone(nextStatus);
    badge.style.setProperty("--subject-kanban-badge-bg", tone.bg);
    badge.style.setProperty("--subject-kanban-badge-border", tone.border);
    badge.style.setProperty("--subject-kanban-badge-text", tone.text);
  }

  function showSituationGridInlineError(root, message = "") {
    const grid = root?.querySelector?.(".situation-grid");
    if (!grid) return;
    const text = String(message || "").trim() || "Mise à jour impossible.";
    let node = grid.querySelector(".situation-grid__inline-error");
    if (!node) {
      node = document.createElement("div");
      node.className = "settings-inline-error situation-grid__inline-error";
      grid.prepend(node);
    }
    node.textContent = text;
    window.setTimeout(() => {
      node?.remove();
    }, 3500);
  }

  function normalizeGridDropdownTogglePayload(actionNode, attrName) {
    return String(actionNode?.getAttribute(attrName) || "").trim();
  }

  function findSituationGridEditAnchor(root, { field = "", subjectId = "", situationId = "" } = {}) {
    const normalizedField = String(field || "").trim().toLowerCase();
    const normalizedSubjectId = String(subjectId || "").trim();
    const normalizedSituationId = String(situationId || "").trim();
    if (!root || !normalizedField || !normalizedSubjectId) return null;
    return [...root.querySelectorAll(`[data-situation-grid-edit-cell="${normalizedField}"]`)]
      .find((node) => String(node.getAttribute("data-situation-grid-subject-id") || "").trim() === normalizedSubjectId
        && String(node.getAttribute("data-situation-grid-situation-id") || "").trim() === normalizedSituationId) || null;
  }

  async function handleSharedDropdownAction(root, actionNode, event = null) {
    const state = ensureSituationGridCellDropdownState();
    const subjectId = String(state.subjectId || actionNode?.getAttribute("data-subject-id") || "").trim();
    const situationId = String(state.situationId || actionNode?.getAttribute("data-situation-id") || "").trim();
    const field = String(state.field || "").trim().toLowerCase();
    if (!subjectId) return false;
    let actionType = "";
    let value = "";
    let action = null;
    if (actionNode.matches("[data-subject-assignee-toggle]")) {
      actionType = "assignee";
      value = normalizeGridDropdownTogglePayload(actionNode, "data-subject-assignee-toggle");
      action = toggleSubjectAssigneeFromSharedDropdown;
    }
    if (actionNode.matches("[data-subject-label-toggle]")) {
      actionType = "label";
      value = normalizeGridDropdownTogglePayload(actionNode, "data-subject-label-toggle");
      action = toggleSubjectLabelFromSharedDropdown;
    }
    if (actionNode.matches("[data-objective-select]")) {
      actionType = "objective";
      value = normalizeGridDropdownTogglePayload(actionNode, "data-objective-select");
      action = toggleSubjectObjectiveFromSharedDropdown;
    }
    if (!actionType) return false;
    const shouldKeepOpen = actionType === "assignee";
    if (!shouldKeepOpen) closeSituationGridCellDropdown();
    if (!value) return true;

    const payload = {
      ...buildSituationGridDropdownDebugPayload({ field, subjectId, situationId, value, event }),
      type: actionType
    };
    logSituationGridDropdown("shared-action:start", payload);
    logSituationGridSupabaseMutation({
      action: actionType === "assignee"
        ? "assignee:toggle"
        : actionType === "label"
          ? "label:toggle"
          : "objective:toggle",
      field,
      subjectId,
      situationId,
      value,
      method: actionType === "objective"
        ? "POST|DELETE"
        : actionType === "assignee"
          ? "POST|DELETE"
          : "POST|DELETE",
      endpoint: actionType === "objective"
        ? "/rest/v1/milestone_subjects"
        : actionType === "assignee"
          ? "/rest/v1/subject_assignees"
          : "/rest/v1/subject_labels",
      payload: actionType === "objective"
        ? {
            milestone_id: value,
            subject_id: subjectId
          }
        : actionType === "assignee"
          ? {
              person_id: value,
              subject_id: subjectId
            }
          : {
              label_id: value,
              subject_id: subjectId
            }
    });
    try {
      const success = await action?.(subjectId, value, { root, skipRerender: true });
      if (success === true) {
        logSituationGridDropdown("shared-action:success", payload);
        if (!shouldKeepOpen) {
          rerender(root);
          return true;
        }
        rerender(root);
        const refreshedRoot = resolveSituationGridDropdownRoot();
        const anchor = findSituationGridEditAnchor(refreshedRoot, { field, subjectId, situationId });
        if (anchor) openSituationGridCellDropdown(refreshedRoot, { field, anchor, subjectId, situationId });
        return true;
      }
      logSituationGridDropdown("shared-action:false-result", payload);
      showSituationGridInlineError(root, "La mise à jour a échoué.");
      return false;
    } catch (error) {
      logSituationGridDropdown("shared-action:error", {
        ...payload,
        message: error instanceof Error ? error.message : String(error || "")
      });
      throw error;
    }
  }

  function getGridColumnStorageKey(scopeKey = "") {
    return scopeKey ? `mdall:situation-grid:column-widths:${scopeKey}` : "";
  }

  function readStoredGridColumnWidths(scopeKey = "") {
    const storageKey = getGridColumnStorageKey(scopeKey);
    if (!storageKey) return null;
    try {
      const raw = window.localStorage?.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function persistGridColumnWidths(scopeKey = "", widths = {}) {
    const storageKey = getGridColumnStorageKey(scopeKey);
    if (!storageKey) return;
    try {
      window.localStorage?.setItem(storageKey, JSON.stringify(widths));
    } catch (_) {
      // No-op: localStorage may be blocked in private contexts.
    }
  }

  function ensureGridColumnWidthsByScope() {
    if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
    if (!store.situationsView.gridColumnWidthsByScope || typeof store.situationsView.gridColumnWidthsByScope !== "object") {
      store.situationsView.gridColumnWidthsByScope = {};
    }
    return store.situationsView.gridColumnWidthsByScope;
  }

  function applyGridColumnWidthsToNode(gridNode, widths = {}) {
    if (!gridNode || !gridNode.style) return;
    const cssVars = getSituationGridColumnCssVariables(widths);
    Object.entries(cssVars).forEach(([name, value]) => {
      gridNode.style.setProperty(name, value);
    });
  }

  function hydrateSituationGridColumnWidths(gridNode) {
    if (!gridNode) return;
    const situationId = String(gridNode.getAttribute("data-situation-grid") || "").trim();
    if (!situationId) return;
    const projectId = String(gridNode.getAttribute("data-situation-grid-project-id") || "").trim() || resolveCurrentProjectId();
    const scopeKey = String(gridNode.getAttribute("data-situation-grid-scope") || "").trim()
      || buildSituationGridColumnWidthsScopeKey(projectId, situationId);
    const byScope = ensureGridColumnWidthsByScope();
    const fromStore = byScope[scopeKey] && typeof byScope[scopeKey] === "object" ? byScope[scopeKey] : null;
    const fromStorage = readStoredGridColumnWidths(scopeKey);
    const normalized = normalizeSituationGridColumnWidths(fromStore || fromStorage || {});
    byScope[scopeKey] = normalized;
    applyGridColumnWidthsToNode(gridNode, normalized);
    if (!gridNode.getAttribute("data-situation-grid-scope")) {
      gridNode.setAttribute("data-situation-grid-scope", scopeKey);
    }
  }

  function bindSituationGridColumnResize(root) {
    const columnsByKey = new Map(getSituationGridColumnDefinitions().map((column) => [column.key, column]));
    root.querySelectorAll(".situation-grid[data-situation-grid]").forEach((gridNode) => {
      hydrateSituationGridColumnWidths(gridNode);
      gridNode.querySelectorAll("[data-situation-grid-resize-handle]").forEach((handle) => {
        handle.addEventListener("pointerdown", (event) => {
          const target = event.currentTarget;
          const columnKey = String(target?.getAttribute("data-situation-grid-resize-handle") || "").trim();
          const columnMeta = columnsByKey.get(columnKey);
          if (!columnMeta) return;

          const scopeKey = String(gridNode.getAttribute("data-situation-grid-scope") || "").trim();
          const byScope = ensureGridColumnWidthsByScope();
          const scopedWidths = normalizeSituationGridColumnWidths(byScope[scopeKey] || {});
          byScope[scopeKey] = scopedWidths;
          const startX = Number(event.clientX) || 0;
          const initialWidth = Number(scopedWidths[columnKey]) || columnMeta.minWidth;

          const onPointerMove = (moveEvent) => {
            const pointerX = Number(moveEvent.clientX) || 0;
            const nextWidth = Math.max(columnMeta.minWidth, Math.round(initialWidth + (pointerX - startX)));
            scopedWidths[columnKey] = nextWidth;
            applyGridColumnWidthsToNode(gridNode, scopedWidths);
          };

          const onPointerUp = () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerUp);
            byScope[scopeKey] = normalizeSituationGridColumnWidths(scopedWidths);
            persistGridColumnWidths(scopeKey, byScope[scopeKey]);
          };

          event.preventDefault();
          event.stopPropagation();
          window.addEventListener("pointermove", onPointerMove);
          window.addEventListener("pointerup", onPointerUp);
          window.addEventListener("pointercancel", onPointerUp);
        });
      });
    });
  }

  function getTrajectoryColumnStorageKey(situationId = "") {
    const normalizedSituationId = String(situationId || "").trim();
    return normalizedSituationId ? `mdall:situation-trajectory:left-column:${normalizedSituationId}` : "";
  }

  function readStoredTrajectoryColumnWidth(situationId = "") {
    const storageKey = getTrajectoryColumnStorageKey(situationId);
    if (!storageKey) return null;
    try {
      const raw = Number(window.localStorage?.getItem(storageKey));
      return Number.isFinite(raw) ? raw : null;
    } catch (_) {
      return null;
    }
  }

  function persistTrajectoryColumnWidth(situationId = "", width = TRAJECTORY_LEFT_COLUMN_WIDTH.default) {
    const storageKey = getTrajectoryColumnStorageKey(situationId);
    if (!storageKey) return;
    try {
      window.localStorage?.setItem(storageKey, String(width));
    } catch (_) {
      // No-op.
    }
  }

  function ensureTrajectoryColumnWidthsBySituationId() {
    if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
    if (!store.situationsView.trajectoryLeftColumnWidthBySituationId || typeof store.situationsView.trajectoryLeftColumnWidthBySituationId !== "object") {
      store.situationsView.trajectoryLeftColumnWidthBySituationId = {};
    }
    return store.situationsView.trajectoryLeftColumnWidthBySituationId;
  }

  function ensureTrajectoryZoomBySituationId() {
    if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
    if (!store.situationsView.trajectoryZoomBySituationId || typeof store.situationsView.trajectoryZoomBySituationId !== "object") {
      store.situationsView.trajectoryZoomBySituationId = {};
    }
    return store.situationsView.trajectoryZoomBySituationId;
  }

  function normalizeTrajectoryColumnWidth(width) {
    const numericWidth = Number(width);
    if (!Number.isFinite(numericWidth)) return TRAJECTORY_LEFT_COLUMN_WIDTH.default;
    return Math.max(TRAJECTORY_LEFT_COLUMN_WIDTH.min, Math.min(TRAJECTORY_LEFT_COLUMN_WIDTH.max, Math.round(numericWidth)));
  }

  function applyTrajectoryColumnWidth(trajectoryNode, width) {
    if (!trajectoryNode || !trajectoryNode.style) return;
    trajectoryNode.style.setProperty("--situation-trajectory-left-width", `${normalizeTrajectoryColumnWidth(width)}px`);
  }

  function syncTrajectoryHorizontalOffset(trajectoryNode) {
    if (!trajectoryNode) return;
    const viewportNode = trajectoryNode.querySelector("[data-situation-trajectory-viewport]")
      || trajectoryNode.querySelector(".situation-trajectory__viewport");
    const timelineContentNode = trajectoryNode.querySelector("[data-situation-trajectory-timeline-content]");
    if (!viewportNode || !timelineContentNode) return;
    timelineContentNode.style.transform = `translate3d(${-Math.max(0, Number(viewportNode.scrollLeft) || 0)}px,0,0)`;
  }

  function hydrateTrajectoryColumnWidth(root) {
    root.querySelectorAll("[data-situation-trajectory][data-situation-id]").forEach((trajectoryNode) => {
      const situationId = String(trajectoryNode.getAttribute("data-situation-id") || "").trim();
      if (!situationId) return;
      const widthsBySituationId = ensureTrajectoryColumnWidthsBySituationId();
      const fromStore = widthsBySituationId[situationId];
      const fromStorage = readStoredTrajectoryColumnWidth(situationId);
      const nextWidth = normalizeTrajectoryColumnWidth(fromStore ?? fromStorage);
      widthsBySituationId[situationId] = nextWidth;
      applyTrajectoryColumnWidth(trajectoryNode, nextWidth);
      syncTrajectoryHorizontalOffset(trajectoryNode);
    });
  }

  function bindTrajectoryColumnResize(root) {
    hydrateTrajectoryColumnWidth(root);
    root.querySelectorAll("[data-situation-trajectory-splitter]").forEach((splitterNode) => {
      splitterNode.addEventListener("pointerdown", (event) => {
        const trajectoryNode = splitterNode.closest("[data-situation-trajectory][data-situation-id]");
        if (!trajectoryNode) return;
        const situationId = String(trajectoryNode.getAttribute("data-situation-id") || "").trim();
        if (!situationId) return;
        const widthsBySituationId = ensureTrajectoryColumnWidthsBySituationId();
        const startX = Number(event.clientX) || 0;
        const initialWidth = normalizeTrajectoryColumnWidth(
          widthsBySituationId[situationId]
            ?? readStoredTrajectoryColumnWidth(situationId)
            ?? trajectoryNode.style.getPropertyValue("--situation-trajectory-left-width")
        );
        widthsBySituationId[situationId] = initialWidth;
        applyTrajectoryColumnWidth(trajectoryNode, initialWidth);

        const onPointerMove = (moveEvent) => {
          const pointerX = Number(moveEvent.clientX) || 0;
          const nextWidth = normalizeTrajectoryColumnWidth(initialWidth + (pointerX - startX));
          widthsBySituationId[situationId] = nextWidth;
          applyTrajectoryColumnWidth(trajectoryNode, nextWidth);
          syncTrajectoryHorizontalOffset(trajectoryNode);
        };

        const onPointerUp = () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", onPointerUp);
          trajectoryNode.classList.remove("is-resizing-left");
          persistTrajectoryColumnWidth(situationId, widthsBySituationId[situationId]);
          syncTrajectoryHorizontalOffset(trajectoryNode);
        };

        event.preventDefault();
        event.stopPropagation();
        trajectoryNode.classList.add("is-resizing-left");
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
      });
    });
  }

  function resolveTrajectorySubjects(situationId = "") {
    const selectedSituationId = String(store?.situationsView?.selectedSituationId || "").trim();
    if (situationId && selectedSituationId && situationId !== selectedSituationId) return [];
    const selectedSituationSubjects = Array.isArray(uiState?.selectedSituationSubjects)
      ? uiState.selectedSituationSubjects
      : [];
    const rawSubjectsResult = store?.projectSubjectsView?.rawSubjectsResult || {};
    const {
      subjectsById,
      childrenBySubjectId,
      rootSubjectIds,
      selectedSubjectIds
    } = resolveSituationTreeData(selectedSituationSubjects, rawSubjectsResult);
    const expandedSubjectIds = getExpandedSubjectIdsSet({
      store,
      situationId: selectedSituationId || situationId,
      rootSubjectIds,
      fallbackExpandedIds: [...selectedSubjectIds]
    });
    const orderedVisibleSubjectIds = flattenVisibleSubjectIds({
      rootSubjectIds,
      childrenBySubjectId,
      expandedSubjectIds
    });
    return orderedVisibleSubjectIds
      .map((subjectId) => subjectsById?.[subjectId])
      .filter(Boolean);
  }

  function resolveTrajectoryHistoryBySubjectId(situationId = "") {
    const bySituationId = store?.projectSubjectsView?.trajectoryHistoryBySituationId;
    if (!bySituationId || typeof bySituationId !== "object") return {};
    const scoped = bySituationId[situationId];
    if (!scoped || typeof scoped !== "object") return {};
    return scoped.statusEventsBySubjectId || scoped.eventsBySubjectId || {};
  }

  function resolveTrajectoryHistoryState(situationId = "", subjects = []) {
    const bySituationId = store?.projectSubjectsView?.trajectoryHistoryBySituationId;
    if (!bySituationId || typeof bySituationId !== "object") {
      return { status: "loading", isComplete: false, errorMessage: "" };
    }
    const scoped = bySituationId[situationId];
    if (!scoped || typeof scoped !== "object") {
      return { status: "loading", isComplete: false, errorMessage: "" };
    }
    const subjectIdsSignature = [...new Set((Array.isArray(subjects) ? subjects : [])
      .map((subject) => String(subject?.id || "").trim())
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .join(",");
    const scopedSignature = String(scoped?.subjectIdsSignature || "").trim();
    if (subjectIdsSignature && scopedSignature && scopedSignature !== subjectIdsSignature) {
      return { status: "loading", isComplete: false, errorMessage: "" };
    }
    return {
      status: String(scoped?.historyStatus || "").trim().toLowerCase() || "ready",
      isComplete: scoped?.isComplete === true,
      errorMessage: String(scoped?.errorMessage || "").trim()
    };
  }


  function resolveTrajectoryRelationEvents(situationId = "") {
    const bySituationId = store?.projectSubjectsView?.trajectoryHistoryBySituationId;
    if (!bySituationId || typeof bySituationId !== "object") return [];
    const scoped = bySituationId[situationId];
    if (!scoped || typeof scoped !== "object") return [];
    if (Array.isArray(scoped.relationEvents)) return scoped.relationEvents;
    const eventsBySubjectId = scoped.eventsBySubjectId;
    if (!eventsBySubjectId || typeof eventsBySubjectId !== "object") return [];
    const relationTypes = new Set([
      "subject_parent_added",
      "subject_parent_removed",
      "subject_child_added",
      "subject_child_removed",
      "subject_blocked_by_added",
      "subject_blocked_by_removed",
      "subject_blocking_for_added",
      "subject_blocking_for_removed"
    ]);
    return Object.values(eventsBySubjectId)
      .flatMap((events) => (Array.isArray(events) ? events : []))
      .filter((event) => relationTypes.has(String(event?.event_type || "").trim().toLowerCase()));
  }

  function resolveTrajectorySituationStartDate(situationId = "") {
    const normalizedSituationId = String(situationId || "").trim();
    if (!normalizedSituationId) return null;
    const situations = Array.isArray(store?.situationsView?.data) ? store.situationsView.data : [];
    const currentSituation = situations.find((entry) => String(entry?.id || "").trim() === normalizedSituationId) || null;
    return currentSituation?.created_at || null;
  }

  function resolveTrajectoryProjectStartDate() {
    return store?.projectForm?.project?.created_at
      || store?.project?.created_at
      || null;
  }

  function resolveTrajectoryTimelineEndDate() {
    const endDate = new Date();
    endDate.setUTCMonth(endDate.getUTCMonth() + 6);
    return endDate;
  }

  function formatTrajectoryStickyTimelineLabel(date, zoom = "day") {
    const safeDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(safeDate.getTime())) return { label: "", title: "" };
    const normalizedZoom = String(zoom || "day").trim().toLowerCase();
    if (normalizedZoom === "hour") {
      return {
        label: safeDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        title: ""
      };
    }
    if (normalizedZoom === "half-day") {
      return {
        label: safeDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
        title: safeDate.toLocaleDateString("fr-FR", { year: "numeric" })
      };
    }
    if (normalizedZoom === "day") {
      return {
        label: safeDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        title: ""
      };
    }
    if (normalizedZoom === "week") {
      const monday = new Date(safeDate.getTime());
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(monday.getDate() + diff);
      const sunday = new Date(monday.getTime());
      sunday.setDate(sunday.getDate() + 6);
      return {
        label: `${monday.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} → ${sunday.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`,
        title: ""
      };
    }
    return {
      label: safeDate.toLocaleDateString("fr-FR", { year: "numeric" }),
      title: ""
    };
  }

  function renderTrajectoryTimelineTicks(timelineContentNode, timeScale, { objectivesById = {} } = {}) {
    if (!timelineContentNode || !timeScale || typeof timeScale.buildTicks !== "function") return;
    const ticks = timeScale.buildTicks({
      scrollLeft: 0,
      viewportWidth: Math.max(1, Number(timeScale.totalWidth) || 1),
      overscanPx: 0
    });
    if (!ticks.length) {
      timelineContentNode.innerHTML = "";
      return;
    }

    const toLocalIsoDate = (value) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    const todayIsoDate = toLocalIsoDate(new Date());

    const zoom = String(timeScale.zoom || "day").trim().toLowerCase();
    const dayTicksHtml = ticks.map((tick, index) => {
      const nextTick = ticks[index + 1];
      const tickWidth = Math.max(24, (nextTick?.x ?? timeScale.totalWidth) - tick.x);
      const date = tick.date instanceof Date ? tick.date : new Date(tick.timestamp);
      const isoDate = toLocalIsoDate(date);
      const isToday = isoDate === todayIsoDate;
      let label = String(date.getDate());
      if (zoom === "hour") {
        label = `${String(date.getHours()).padStart(2, "0")}:00`;
      } else if (zoom === "half-day") {
        label = date.getHours() < 12 ? "AM" : "PM";
      } else if (zoom === "week") {
        const end = new Date(date.getTime());
        end.setDate(end.getDate() + 6);
        const startLabel = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        const endLabel = end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        label = `${startLabel} → ${endLabel}`;
      } else if (zoom === "month") {
        label = date.toLocaleDateString("fr-FR", { month: "short" });
      }
      return `<time role="columnheader" data-index="${index}" datetime="${isoDate}" class="situation-trajectory__timeline-day${isToday ? " is-today" : ""}" style="left:${tick.x}px;width:${tickWidth}px;">${escapeHtml(label)}</time>`;
    }).join("");

    const monthTicksHtml = ticks
      .filter((tick, index) => {
        const date = tick.date instanceof Date ? tick.date : new Date(tick.timestamp);
        if (index === 0) return true;
        const previousDate = ticks[index - 1]?.date instanceof Date ? ticks[index - 1].date : new Date(ticks[index - 1]?.timestamp);
        if (zoom === "hour" || zoom === "half-day" || zoom === "day") {
          return previousDate
            ? date.getMonth() !== previousDate.getMonth() || date.getFullYear() !== previousDate.getFullYear()
            : true;
        }
        if (zoom === "week") {
          return previousDate
            ? date.getFullYear() !== previousDate.getFullYear() || date.getMonth() !== previousDate.getMonth()
            : true;
        }
        return previousDate ? date.getFullYear() !== previousDate.getFullYear() : true;
      })
      .map((tick) => {
        const date = tick.date instanceof Date ? tick.date : new Date(tick.timestamp);
        const label = zoom === "month"
          ? date.toLocaleDateString("fr-FR", { year: "numeric" })
          : date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        return `<time datetime="${toLocalIsoDate(date)}" class="situation-trajectory__timeline-month" style="left:${tick.x}px;">${escapeHtml(label)}</time>`;
      }).join("");

    const objectiveLabelsHtml = Object.values(objectivesById || {})
      .filter((objective) => objective && objective.due_date && objective.title)
      .map((objective) => {
        const dueDate = toTimelineDisplayDate(objective.due_date, timeScale.zoom);
        if (Number.isNaN(dueDate.getTime())) return "";
        const x = timeScale.timeToX(dueDate);
        const safeTitle = escapeHtml(String(objective.title));
        return `<div class="situation-trajectory__timeline-objective" style="left:${x}px;" title="${safeTitle}">${safeTitle}</div>`;
      })
      .filter(Boolean)
      .join("");

    timelineContentNode.innerHTML = `
      <div role="row" class="situation-trajectory__timeline-row situation-trajectory__timeline-row--months">${monthTicksHtml}${objectiveLabelsHtml}</div>
      <div role="row" class="situation-trajectory__timeline-row situation-trajectory__timeline-row--days">${dayTicksHtml}</div>
    `;

    timelineContentNode.querySelectorAll(".situation-trajectory__timeline-objective").forEach((objectiveNode) => {
      const halfWidth = Math.round((objectiveNode.offsetWidth || 0) / 2);
      objectiveNode.style.marginLeft = `${-halfWidth}px`;
      const lineHeight = Math.max(
        0,
        (timelineContentNode.clientHeight || 0) - ((objectiveNode.offsetTop || 0) + (objectiveNode.offsetHeight || 0))
      );
      objectiveNode.style.setProperty("--trajectory-objective-line-height", `${lineHeight}px`);
    });
  }

  function bindTrajectoryDom(root) {
    const trajectoryNodes = [...root.querySelectorAll("[data-situation-trajectory][data-situation-id]")];
    if (!trajectoryNodes.length) return;

    const layout = String(store?.situationsView?.selectedSituationLayout || "").trim().toLowerCase();
    if (layout !== "roadmap") return;

    loadTrajectoryRuntimeModules()
      .then(([timeScaleModule, modelModule, domRendererModule, virtualizerModule]) => {
        const { createTrajectoryTimeScale } = timeScaleModule || {};
        const { buildTrajectoryModel } = modelModule || {};
        const { renderTrajectoryDom } = domRendererModule || {};
        const { getTrajectoryVisibleWindow } = virtualizerModule || {};
        if (typeof createTrajectoryTimeScale !== "function"
          || typeof buildTrajectoryModel !== "function"
          || typeof renderTrajectoryDom !== "function"
          || typeof getTrajectoryVisibleWindow !== "function") {
          return;
        }

        trajectoryNodes.forEach((trajectoryNode) => {
          const situationId = String(trajectoryNode.getAttribute("data-situation-id") || "").trim();
          const viewportNode = trajectoryNode.querySelector("[data-situation-trajectory-viewport]")
            || trajectoryNode.querySelector(".situation-trajectory__viewport");
          const sceneNode = trajectoryNode.querySelector("[data-situation-trajectory-scene]");
          const svgNode = trajectoryNode.querySelector("[data-situation-trajectory-svg]");
          const itemsRootNode = trajectoryNode.querySelector("[data-situation-trajectory-items]");
          const leftContentNode = trajectoryNode.querySelector("[data-situation-trajectory-left-content]");
          const timelineContentNode = trajectoryNode.querySelector("[data-situation-trajectory-timeline-content]");
          const timelineStickyLabelNode = trajectoryNode.querySelector("[data-situation-trajectory-timeline-sticky-label]");
          const scrollSizerNode = trajectoryNode.querySelector("[data-situation-trajectory-scroll-sizer]");
          const spinnerNode = trajectoryNode.querySelector("[data-situation-trajectory-spinner]");
          if (!viewportNode || !sceneNode || !svgNode || !itemsRootNode) return;

          const subjects = resolveTrajectorySubjects(situationId);
          const rawSubjectsResult = store?.projectSubjectsView?.rawSubjectsResult || {};
          const objectiveIdsBySubjectId = rawSubjectsResult.objectiveIdsBySubjectId || {};
          const objectivesById = rawSubjectsResult.objectivesById || {};
          const historyBySubjectId = resolveTrajectoryHistoryBySubjectId(situationId);
          const historyState = resolveTrajectoryHistoryState(situationId, subjects);
          const relationEvents = resolveTrajectoryRelationEvents(situationId);
          const situationStartDate = resolveTrajectorySituationStartDate(situationId);

          const effectiveTimelineAnchorDate = situationStartDate
            || resolveTrajectoryProjectStartDate()
            || subjects.reduce((acc, subject) => {
              const createdAt = subject?.created_at ? new Date(subject.created_at) : null;
              if (!createdAt || Number.isNaN(createdAt.getTime())) return acc;
              if (!acc) return createdAt;
              return createdAt.getTime() < acc.getTime() ? createdAt : acc;
            }, null)
            || new Date();

          const timelineStartDate = new Date(effectiveTimelineAnchorDate);
          timelineStartDate.setUTCMonth(timelineStartDate.getUTCMonth() - 1);

          const zoomBySituationId = ensureTrajectoryZoomBySituationId();
          const timeScale = createTrajectoryTimeScale({
            startDate: timelineStartDate,
            endDate: resolveTrajectoryTimelineEndDate(),
            zoom: normalizeTrajectoryZoom(zoomBySituationId[situationId], "day")
          });

          if (historyState.status !== "ready" || historyState.isComplete !== true) {
            if (itemsRootNode) itemsRootNode.innerHTML = "";
            if (svgNode) svgNode.innerHTML = "";
            if (spinnerNode) {
              spinnerNode.hidden = false;
              const spinnerLabel = spinnerNode.querySelector("span:last-child");
              if (spinnerLabel) {
                spinnerLabel.textContent = historyState.status === "error"
                  ? "Trajectoire indisponible : historique incomplet."
                  : "Chargement de la trajectoire…";
              }
            }
            console.warn("[trajectory] history.incomplete", {
              situationId,
              status: historyState.status,
              isComplete: historyState.isComplete,
              message: historyState.errorMessage || ""
            });
            return;
          }

          const { rows } = buildTrajectoryModel({
            subjects,
            subjectHistoryEvents: historyBySubjectId,
            objectivesById,
            objectiveIdsBySubjectId,
            projectStartDate: effectiveTimelineAnchorDate,
            today: new Date()
          });

          const totalWidth = Math.max(viewportNode.clientWidth || 0, timeScale.totalWidth);
          const contentHeight = Math.max(360, rows.length * TRAJECTORY_ROW_HEIGHT);
          if (scrollSizerNode) {
            scrollSizerNode.style.width = `${totalWidth}px`;
            scrollSizerNode.style.height = `${contentHeight}px`;
          }
          if (timelineContentNode) {
            timelineContentNode.style.width = `${totalWidth}px`;
            renderTrajectoryTimelineTicks(timelineContentNode, timeScale, { objectivesById });
          }

          sceneNode.style.width = `${totalWidth}px`;
          sceneNode.style.height = `${contentHeight}px`;
          sceneNode.style.setProperty("--situation-trajectory-scene-width", `${totalWidth}px`);
          sceneNode.style.setProperty("--situation-trajectory-scene-height", `${contentHeight}px`);


          let rafId = 0;
          const renderFrame = () => {
            rafId = 0;
            const scrollTop = viewportNode.scrollTop;
            const scrollLeft = viewportNode.scrollLeft;


            const windowState = getTrajectoryVisibleWindow({
              rowCount: rows.length,
              rowHeight: TRAJECTORY_ROW_HEIGHT,
              scrollTop,
              scrollLeft,
              viewportWidth: viewportNode.clientWidth,
              viewportHeight: viewportNode.clientHeight,
              totalWidth: timeScale.totalWidth,
              overscanRows: 4,
              overscanPx: 160
            });

            if (spinnerNode) spinnerNode.hidden = !windowState.isFastScrolling;
            if (leftContentNode) leftContentNode.style.transform = `translateY(${-scrollTop}px)`;
            if (timelineContentNode) timelineContentNode.style.transform = `translate3d(${-scrollLeft}px,0,0)`;
            if (timelineStickyLabelNode && typeof timeScale.xToTime === "function") {
              const stickyDate = timeScale.xToTime(scrollLeft);
              const stickyLabel = formatTrajectoryStickyTimelineLabel(stickyDate, timeScale.zoom);
              timelineStickyLabelNode.textContent = stickyLabel.label;
              timelineStickyLabelNode.title = stickyLabel.title;
              timelineStickyLabelNode.hidden = !stickyLabel.label;
            }

            renderTrajectoryDom({
              scene: sceneNode,
              svg: svgNode,
              itemsRoot: itemsRootNode,
              rows,
              relationEvents,
              timeScale,
              scrollLeft,
              scrollTop,
              viewportWidth: viewportNode.clientWidth,
              viewportHeight: viewportNode.clientHeight,
              rowHeight: TRAJECTORY_ROW_HEIGHT,
              overscan: { rows: 4, px: 160 }
            });
          };

          const scheduleRender = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(renderFrame);
          };

          if (!viewportNode.dataset.trajectoryDomBound) {
            viewportNode.dataset.trajectoryDomBound = "true";
            viewportNode.addEventListener("scroll", scheduleRender, { passive: true });
          }

          const initialAnchorDate = new Date(effectiveTimelineAnchorDate);
          if (Number.isFinite(initialAnchorDate.getTime()) && !viewportNode.dataset.trajectoryInitialAnchorApplied) {
            const initialScrollLeft = Math.max(0, Math.round(timeScale.timeToX(initialAnchorDate)));
            viewportNode.scrollLeft = initialScrollLeft;
            viewportNode.dataset.trajectoryInitialAnchorApplied = "true";
          }

          scheduleRender();
        });
      })
      .catch((error) => {
        console.error("[trajectory] runtime.load.error", error);
      });
  }

  async function handleSituationGridKanbanAction(root, actionNode, event = null) {
    const state = ensureSituationGridCellDropdownState();
    const field = String(state.field || "").trim().toLowerCase();
    const subjectId = String(state.subjectId || "").trim();
    const situationId = String(state.situationId || "").trim();
    const nextStatus = String(actionNode?.getAttribute("data-subject-kanban-select") || "").trim().toLowerCase();
    const previousStatus = String(store?.situationsView?.kanbanStatusBySituationId?.[situationId]?.[subjectId] || "non_active").trim().toLowerCase();
    const payload = buildSituationGridDropdownDebugPayload({ field, subjectId, situationId, value: nextStatus, event });
    if (!subjectId || !situationId || !nextStatus || nextStatus === previousStatus) {
      closeSituationGridCellDropdown();
      return;
    }

    if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
    store.situationsView.kanbanStatusBySituationId = {
      ...(store.situationsView.kanbanStatusBySituationId || {}),
      [situationId]: {
        ...((store.situationsView.kanbanStatusBySituationId || {})[situationId] || {}),
        [subjectId]: nextStatus
      }
    };
    patchSituationGridKanbanCell({ root, subjectId, situationId });
    closeSituationGridCellDropdown();
    try {
      logSituationGridDropdown("kanban-action:start", payload);
      logSituationGridSupabaseMutation({
        action: "kanban:update",
        field: "kanban",
        subjectId,
        situationId,
        value: nextStatus,
        method: "PATCH",
        endpoint: "/rest/v1/situation_subjects",
        payload: {
          where: {
            situation_id: `eq.${situationId}`,
            subject_id: `eq.${subjectId}`
          },
          body: {
            kanban_status: nextStatus
          }
        }
      });
      await setSituationGridKanbanStatus?.(situationId, subjectId, nextStatus);
      logSituationGridDropdown("kanban-action:success", payload);
    } catch (error) {
      store.situationsView.kanbanStatusBySituationId = {
        ...(store.situationsView.kanbanStatusBySituationId || {}),
        [situationId]: {
          ...((store.situationsView.kanbanStatusBySituationId || {})[situationId] || {}),
          [subjectId]: previousStatus
        }
      };
      patchSituationGridKanbanCell({ root, subjectId, situationId });
      logSituationGridDropdown("kanban-action:error", {
        ...payload,
        message: error instanceof Error ? error.message : String(error || "")
      });
      console.error("situation grid kanban update failed", error);
      showSituationGridInlineError(root, error instanceof Error ? error.message : "La mise à jour du statut kanban a échoué.");
    }
  }

  function bindSituationGridEditableCells(root) {
    const scopeRoot = root?.closest?.(".project-shell__content") || root;
    setSituationGridDropdownRoot(scopeRoot);
    root.querySelectorAll("[data-situation-grid-edit-cell]").forEach((node) => {
      node.addEventListener("click", (event) => {
        const caretNode = event.target instanceof Element
          ? event.target.closest(".situation-grid__editable-caret")
          : null;
        if (!caretNode) return;
        event.preventDefault();
        event.stopPropagation();
        const field = String(node.getAttribute("data-situation-grid-edit-cell") || "").trim().toLowerCase();
        const subjectId = String(node.getAttribute("data-situation-grid-subject-id") || "").trim();
        const situationId = String(node.getAttribute("data-situation-grid-situation-id") || store?.situationsView?.selectedSituationId || "").trim();
        if (!field || !subjectId) return;
        const dropdownState = ensureSituationGridCellDropdownState();
        if (dropdownState.open
          && dropdownState.field === field
          && dropdownState.subjectId === subjectId
          && dropdownState.situationId === situationId) {
          closeSituationGridCellDropdown();
          return;
        }
        openSituationGridCellDropdown(root, { field, anchor: node, subjectId, situationId });
      });
    });
    root.querySelectorAll("[data-action='open-subissue-action-menu'][data-subject-id]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(node.getAttribute("data-subject-id") || "").trim();
        const situationId = String(node.getAttribute("data-situation-grid-situation-id") || store?.situationsView?.selectedSituationId || "").trim();
        if (!subjectId) return;
        const state = ensureSituationGridCellDropdownState();
        if (state.open && state.field === "subissue-actions" && state.subjectId === subjectId && state.anchor === node) {
          closeSituationGridCellDropdown();
          return;
        }
        openSituationGridCellDropdown(root, {
          field: "subissue-actions",
          anchor: node,
          subjectId,
          situationId
        });
      });
    });
    uiState?.situationGridDropdownAbortController?.abort?.();
    uiState.situationGridDropdownAbortController = new AbortController();
    const signal = uiState.situationGridDropdownAbortController.signal;
    logSituationGridDropdown("bind-global", { field: "", subjectId: "", situationId: "" });

    const shouldIgnoreOutsideClose = (eventTarget, state) => {
      const host = document.getElementById("subjectMetaDropdownHost");
      const hostDropdown = host?.querySelector?.(".subject-meta-dropdown");
      if (hostDropdown?.contains(eventTarget)) return true;
      if (state.anchor && (state.anchor === eventTarget || state.anchor.contains(eventTarget))) return true;
      return false;
    };

    const handleGridDropdownItemClickCapture = async (event) => {
      const eventTarget = event.target instanceof Element ? event.target : null;
      if (!eventTarget) return;
      const root = resolveSituationGridDropdownRoot();
      const actionNode = eventTarget.closest(
        "[data-subject-kanban-select],[data-subject-assignee-toggle],[data-subject-label-toggle],[data-objective-select]"
      );
      if (actionNode) {
        const state = ensureSituationGridCellDropdownState();
        if (!state.open) return;
        event.preventDefault();
        event.stopPropagation();
        try {
          const field = String(state.field || "").trim().toLowerCase();
          const subjectId = String(state.subjectId || "").trim();
          const situationId = String(state.situationId || "").trim();
          const value = String(
            actionNode.getAttribute("data-subject-kanban-select")
            || actionNode.getAttribute("data-subject-assignee-toggle")
            || actionNode.getAttribute("data-subject-label-toggle")
            || actionNode.getAttribute("data-objective-select")
            || ""
          ).trim();
          logSituationGridDropdown("host-capture:item-click", buildSituationGridDropdownDebugPayload({
            field,
            subjectId,
            situationId,
            value,
            event
          }));
          if (actionNode.matches("[data-subject-kanban-select]")) {
            await handleSituationGridKanbanAction(root, actionNode, event);
            return;
          }
          await handleSharedDropdownAction(root, actionNode, event);
        } catch (error) {
          console.error("situation grid shared dropdown action failed", error);
          showSituationGridInlineError(root, error instanceof Error ? error.message : "La mise à jour a échoué.");
        }
        return;
      }
    };

    const host = document.getElementById("subjectMetaDropdownHost");
    host?.addEventListener("click", handleGridDropdownItemClickCapture, { capture: true, signal });
    document.addEventListener("click", async (event) => {
      await handleGridDropdownItemClickCapture(event);
      const eventTarget = event.target instanceof Element ? event.target : null;
      if (!eventTarget) return;

      const state = ensureSituationGridCellDropdownState();
      if (!state.open) return;
      if (shouldIgnoreOutsideClose(eventTarget, state)) return;
      logSituationGridDropdown("outside-click-close", buildSituationGridDropdownDebugPayload({
        field: state.field,
        subjectId: state.subjectId,
        situationId: state.situationId,
        event
      }));
      closeSituationGridCellDropdown();
    }, { capture: true, signal });

    document.addEventListener("input", (event) => {
      const eventTarget = event.target instanceof Element ? event.target : null;
      if (!eventTarget) return;
      const root = resolveSituationGridDropdownRoot();
      const metaSearch = eventTarget.closest("[data-subject-meta-search]");
      if (metaSearch && ensureSituationGridCellDropdownState().open) {
        setSharedSubjectMetaDropdownQuery?.(metaSearch.value || "", root);
        return;
      }
      const kanbanSearch = eventTarget.closest("[data-subject-kanban-search]");
      if (kanbanSearch && ensureSituationGridCellDropdownState().open) {
        setSharedSubjectKanbanDropdownQuery?.(kanbanSearch.value || "", root);
      }
    }, { signal });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const state = ensureSituationGridCellDropdownState();
      if (!state.open) return;
      event.preventDefault();
      closeSituationGridCellDropdown();
    }, { signal });

    document.addEventListener("pointerdown", (event) => {
      const eventTarget = event.target instanceof Element ? event.target : null;
      if (!eventTarget) return;
      const state = ensureSituationGridCellDropdownState();
      if (!state.open) return;
      if (shouldIgnoreOutsideClose(eventTarget, state)) return;
      logSituationGridDropdown("outside-pointerdown-close", buildSituationGridDropdownDebugPayload({
        field: state.field,
        subjectId: state.subjectId,
        situationId: state.situationId,
        event
      }));
      closeSituationGridCellDropdown();
    }, { capture: true, signal });
  }

  function isSituationGridDndDebugEnabled() {
    try {
      return window.localStorage?.getItem("mdall:debug-situation-grid-dnd") === "1";
    } catch (_) {
      return false;
    }
  }

  function logSituationGridDnd(message, payload = {}) {
    if (!isSituationGridDndDebugEnabled()) return;
    console.info(`[situation-grid-dnd] ${message}`, payload);
  }

  function normalizeSubjectId(value) {
    return String(value || "").trim();
  }

  function sortSubjectIdsByOrder(subjectIds = [], subjectsById = {}) {
    return [...new Set((Array.isArray(subjectIds) ? subjectIds : []).map((value) => normalizeSubjectId(value)).filter(Boolean))]
      .sort((leftId, rightId) => {
        const left = subjectsById[leftId] || {};
        const right = subjectsById[rightId] || {};
        const leftOrder = Number(left?.parent_child_order ?? left?.raw?.parent_child_order);
        const rightOrder = Number(right?.parent_child_order ?? right?.raw?.parent_child_order);
        const leftHasOrder = Number.isFinite(leftOrder) && leftOrder > 0;
        const rightHasOrder = Number.isFinite(rightOrder) && rightOrder > 0;
        if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) return leftOrder - rightOrder;
        if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;
        return String(left?.title || leftId).localeCompare(String(right?.title || rightId), "fr");
      });
  }

  function applySituationGridHierarchyPatch({ subjectId = "", nextParentId = "", orderedByParentId = {} } = {}) {
    const raw = store?.projectSubjectsView?.rawSubjectsResult;
    if (!raw || typeof raw !== "object" || !raw.subjectsById || typeof raw.subjectsById !== "object") return false;

    const normalizedSubjectId = normalizeSubjectId(subjectId);
    if (!normalizedSubjectId || !raw.subjectsById[normalizedSubjectId]) return false;

    const normalizedNextParentId = normalizeSubjectId(nextParentId);
    const subject = raw.subjectsById[normalizedSubjectId];
    subject.parent_subject_id = normalizedNextParentId || null;
    if (subject.raw && typeof subject.raw === "object") {
      subject.raw.parent_subject_id = normalizedNextParentId || null;
    }

    Object.entries(orderedByParentId || {}).forEach(([parentId, childIds]) => {
      const normalizedParentId = normalizeSubjectId(parentId);
      const normalizedChildIds = [...new Set((Array.isArray(childIds) ? childIds : [])
        .map((value) => normalizeSubjectId(value))
        .filter(Boolean))];
      normalizedChildIds.forEach((childId, index) => {
        const child = raw.subjectsById[childId];
        if (!child) return;
        child.parent_subject_id = normalizedParentId || null;
        child.parent_child_order = index + 1;
        if (child.raw && typeof child.raw === "object") {
          child.raw.parent_subject_id = normalizedParentId || null;
          child.raw.parent_child_order = index + 1;
        }
      });
    });

    const rows = Object.values(raw.subjectsById);
    const hierarchy = buildSubjectHierarchyIndexes(rows, raw.subjectsById);
    raw.childrenBySubjectId = hierarchy.childrenBySubjectId;
    raw.parentBySubjectId = hierarchy.parentBySubjectId;
    raw.rootSubjectIds = hierarchy.rootSubjectIds;
    return true;
  }

  function bindSituationGridDnd(root) {
    const sortableRows = Array.from(root.querySelectorAll(".situation-grid [data-subissue-sortable-row='true']"));
    if (!sortableRows.length) return;
    const dropContainer = sortableRows[0]?.parentElement || null;
    let draggingRow = null;
    let dropTargetRow = null;
    let dropPlacement = "";

    const clearDropIndicators = () => {
      sortableRows.forEach((row) => {
        row.classList.remove("is-subissue-drop-before", "is-subissue-drop-after", "is-subissue-dragging");
        row.style.removeProperty("--situation-grid-drop-indent");
      });
    };

    const applyDropIndicator = (row, placement) => {
      if (!row || !placement) return;
      const depth = Math.max(0, Number(row.dataset.subissueDepth || 0));
      const indent = (depth + 2) * 20;
      clearDropIndicators();
      row.classList.add(placement === "before" ? "is-subissue-drop-before" : "is-subissue-drop-after");
      row.style.setProperty("--situation-grid-drop-indent", `${indent}px`);
      if (draggingRow) draggingRow.classList.add("is-subissue-dragging");
      dropTargetRow = row;
      dropPlacement = placement;
    };

    const resolveDropTargetFromPointer = (clientY) => {
      const candidates = sortableRows.filter((row) => row !== draggingRow);
      if (!candidates.length) return { row: null, placement: "" };
      let target = candidates[0];
      for (const row of candidates) {
        const rect = row.getBoundingClientRect();
        if (clientY <= rect.bottom) {
          target = row;
          break;
        }
        target = row;
      }
      const rect = target.getBoundingClientRect();
      const placement = clientY < (rect.top + rect.height / 2) ? "before" : "after";
      return { row: target, placement };
    };

    const persistDropFromTarget = async (targetRow) => {
      const row = targetRow || dropTargetRow;
      if (!draggingRow || !row || draggingRow === row || !dropPlacement) return;
      const sourceId = normalizeSubjectId(draggingRow.dataset.childSubjectId);
      const targetId = normalizeSubjectId(row.dataset.childSubjectId);
      const nextParentId = normalizeSubjectId(row.dataset.parentSubjectId);
      if (!sourceId || !targetId || sourceId === targetId) return;

      const raw = store?.projectSubjectsView?.rawSubjectsResult || {};
      const rootIds = sortSubjectIdsByOrder(raw?.rootSubjectIds || [], raw.subjectsById || {});
      const sourceParentId = normalizeSubjectId(
        raw?.parentBySubjectId?.[sourceId]
        || raw?.subjectsById?.[sourceId]?.parent_subject_id
        || raw?.subjectsById?.[sourceId]?.raw?.parent_subject_id
      );
      const resolveChildrenForParent = (parentId) => {
        const normalizedParentId = normalizeSubjectId(parentId);
        if (!normalizedParentId) return rootIds;
        return Array.isArray(raw?.childrenBySubjectId?.[normalizedParentId]) ? raw.childrenBySubjectId[normalizedParentId] : [];
      };
      const sourceSiblings = sortSubjectIdsByOrder(resolveChildrenForParent(sourceParentId), raw.subjectsById || {});
      const targetSiblings = sortSubjectIdsByOrder(resolveChildrenForParent(nextParentId), raw.subjectsById || {});
      const nextSourceSiblings = sourceSiblings.filter((id) => id !== sourceId);
      const nextTargetSiblings = sourceParentId === nextParentId
        ? nextSourceSiblings
        : targetSiblings.filter((id) => id !== sourceId);
      const targetIndex = nextTargetSiblings.indexOf(targetId);
      if (targetIndex < 0) return;
      const insertionIndex = dropPlacement === "before" ? targetIndex : targetIndex + 1;
      nextTargetSiblings.splice(Math.max(0, insertionIndex), 0, sourceId);

      logSituationGridDnd("drop", {
        sourceId,
        targetId,
        fromParentId: sourceParentId,
        toParentId: nextParentId,
        placement: dropPlacement
      });

      try {
        if (sourceParentId !== nextParentId) {
          await setSituationGridSubjectParent?.(sourceId, nextParentId || null);
        }
        if (nextParentId) {
          await reorderSituationGridSubjectChildren?.(nextParentId, nextTargetSiblings);
        } else {
          await reorderSituationGridRootSubjects?.(nextTargetSiblings);
        }
        if (sourceParentId && sourceParentId !== nextParentId) {
          await reorderSituationGridSubjectChildren?.(sourceParentId, nextSourceSiblings);
        }

        applySituationGridHierarchyPatch({
          subjectId: sourceId,
          nextParentId,
          orderedByParentId: {
            [nextParentId]: nextTargetSiblings,
            ...(sourceParentId && sourceParentId !== nextParentId ? { [sourceParentId]: nextSourceSiblings } : {})
          }
        });
        logSituationGridDnd("persist-success", {
          sourceId,
          nextParentId,
          nextTargetSiblings
        });
        rerender(root);
      } catch (error) {
        logSituationGridDnd("persist-error", {
          sourceId,
          targetId,
          message: error instanceof Error ? error.message : String(error || "")
        });
        console.error("situation grid dnd persist failed", error);
        showSituationGridInlineError(root, error instanceof Error ? error.message : "Impossible de déplacer ce sujet.");
        rerender(root);
      }
    };

    if (dropContainer) {
      dropContainer.addEventListener("dragover", (event) => {
        if (!draggingRow) return;
        event.preventDefault();
        const { row, placement } = resolveDropTargetFromPointer(Number(event.clientY || 0));
        if (!row || !placement) return;
        applyDropIndicator(row, placement);
        logSituationGridDnd("dragover", {
          sourceId: normalizeSubjectId(draggingRow.dataset.childSubjectId),
          targetId: normalizeSubjectId(row.dataset.childSubjectId),
          placement
        });
      });

      dropContainer.addEventListener("drop", async (event) => {
        if (!draggingRow) return;
        event.preventDefault();
        const { row, placement } = resolveDropTargetFromPointer(Number(event.clientY || 0));
        if (row && placement) {
          dropPlacement = placement;
          dropTargetRow = row;
        }
        try {
          await persistDropFromTarget(dropTargetRow);
        } finally {
          clearDropIndicators();
          draggingRow = null;
          dropTargetRow = null;
          dropPlacement = "";
        }
      });
    }

    sortableRows.forEach((row) => {
      row.addEventListener("dragstart", (event) => {
        const subjectId = normalizeSubjectId(row.dataset.childSubjectId);
        if (!subjectId) {
          event.preventDefault();
          return;
        }
        draggingRow = row;
        dropPlacement = "";
        row.classList.add("is-subissue-dragging");
        event.dataTransfer?.setData("text/plain", subjectId);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        logSituationGridDnd("dragstart", {
          subjectId,
          parentSubjectId: normalizeSubjectId(row.dataset.parentSubjectId),
          depth: Number(row.dataset.subissueDepth || 0)
        });
      });

      row.addEventListener("dragend", () => {
        clearDropIndicators();
        draggingRow = null;
        dropTargetRow = null;
        dropPlacement = "";
      });
    });
  }

  async function refreshInsightsData(root) {
    const situationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituation = getSituationById(situationId);
    if (!selectedSituation) return;

    const requestId = ++insightsRequestId;
    uiState.insightsLoading = true;
    uiState.insightsError = "";
    rerender(root);

    const startedAt = Date.now();
    logSituationInsights("load:start", { situationId, range: uiState.insightsRange });
    try {
      const insightsData = await loadSituationInsightsData(selectedSituation, { range: uiState.insightsRange });
      if (requestId !== insightsRequestId) return;
      uiState.insightsData = insightsData;
      uiState.insightsSituationId = situationId;
      uiState.insightsLoading = false;
      uiState.insightsError = "";
      logSituationInsights("load:success", {
        situationId,
        range: uiState.insightsRange,
        durationMs: Date.now() - startedAt
      });
      rerender(root);
    } catch (error) {
      if (requestId !== insightsRequestId) return;
      uiState.insightsLoading = false;
      uiState.insightsError = error instanceof Error ? error.message : "Impossible de charger les indicateurs.";
      logSituationInsights("load:error", {
        situationId,
        range: uiState.insightsRange,
        durationMs: Date.now() - startedAt,
        error: uiState.insightsError
      });
      rerender(root);
    }
  }
  /** Les chantiers qu'on sait nommer — la même liste que partout (règle 4). */
  /**
   * La situation qu'une requête désigne — une lecture, ou l'une des miennes.
   *
   * **On la retrouve par sa requête et non par son rang** : le rail mêle les
   * lectures et mes situations, et compter les entrées ferait dépendre le clic
   * de l'ordre d'affichage (règle 4).
   */
  function situationQuiPorte(requete) {
    const cherche = String(requete || "").trim();
    if (!cherche) return null;

    const champs = champsDeLEcran();
    const toutes = [...situationsDeLecture(champs), ...safeArray(store.situationsView?.data)];

    return toutes.find((situation) => requeteDeLaSituation(situation) === cherche) || null;
  }

  /**
   * « Nouvelle situation » : le formulaire d'une vue.
   *
   * **La fenêtre d'avant demandait une mécanique avant une intention.** Elle
   * proposait « manuelle » ou « automatique » — deux mots qui disent comment la
   * base s'y prendra, pas ce qu'on veut suivre —, et son mode automatique ne
   * savait produire qu'une liste de tous les sujets ouverts. On ouvre donc le
   * formulaire d'une vue : un habit, un nom, une phrase, une requête, et le
   * tableau de ce qu'elle retient, dessous (étape 3).
   *
   * Sur les deux écrans depuis l'étape 4 : chacun a son vocabulaire, et
   * `champsDeLEcran` va le chercher là où il est.
   */
  function ouvrirLaComposition(root) {
    uiState.situationEnCours = compositionNeuve();
    uiState.situationEnCoursErreur = "";
    uiState.situationEnCoursGarde = "";
    rerender(root);
  }

  /**
   * Rouvrir une situation pour la modifier — le même formulaire, rempli.
   *
   * ## Ce que le crayon ouvrait avant
   *
   * Un panneau de réglages avec des cases à cocher, des champs
   * « IDs séparés par des virgules » et un choix de mécanique. On y modifiait
   * un filtre sans jamais voir ce qu'il retenait. C'est le même formulaire que
   * la création qui s'ouvre désormais, avec le tableau dessous (étape 4).
   *
   * ## Une situation d'avant arrive avec sa requête reprise
   *
   * Tant que la reprise dit tout ce que l'ancien filtre disait. Sinon la
   * requête reste **vide** et l'écran le dit : enregistrer une requête qui en
   * dirait moins ferait disparaître des sujets d'une liste que quelqu'un
   * regarde tous les jours, et rien ne l'expliquerait. Une requête vide est
   * refusée à l'enregistrement — on ne peut donc pas le faire par mégarde.
   */
  function ouvrirLaCompositionDeLaSituation(root, situationId) {
    const situation = getSituationById(situationId || store.situationsView?.selectedSituationId);
    if (!situation) return;

    const sienne = requeteDeLaSituation(situation);
    const reprise = sienne ? null : repriseDeLAncienFiltre(situation);
    const reprenable = reprise && !reprise.perdus.length;

    uiState.insightsPanelOpen = false;
    uiState.situationEnCours = compositionDepuisLaSituation(situation, {
      requete: sienne || (reprenable ? reprise.requete : "")
    });
    uiState.situationEnCoursErreur = "";
    uiState.situationEnCoursGarde = phraseDesPerdus(reprise?.perdus ?? []);
    rerender(root);
  }

  /**
   * Épingler une situation au rail, ou l'en retirer.
   *
   * **Le rail est court.** Une situation y monte quand on l'y met, et pas
   * parce qu'elle existe : c'est la règle que les vues portent déjà, et un
   * carnet de vingt-six situations en montre l'utilité.
   *
   * Le menu se referme : le laisser ouvert sur une entrée qui vient de changer
   * de nom — « Épingler » devenu « Désépingler » — fait douter d'avoir cliqué.
   */
  async function basculerLEpingle(root, situationId) {
    const situation = getSituationById(situationId);
    if (!situation) return;

    uiState.menuDeLaSituation = "";
    try {
      await updateSituationRecord(situation.id, { au_rail: situation.au_rail !== true });
      await refreshSituationsData(root, { forceSubjects: false });
    } catch (error) {
      console.error("epingler la situation failed", error);
      uiState.error = error instanceof Error ? error.message : "L'épingle n'a pas pu être posée.";
      rerender(root);
    }
  }

  /**
   * Reprendre une situation que personne n'a.
   *
   * **La promesse de l'étape 1, enfin tenue.** L'écran disait « Reprenez-la
   * pour pouvoir la modifier » et rien ne permettait de le faire : sur un
   * carnet qui ne contient que des situations d'avant, aucun geste n'était
   * possible — ni épingler, ni effacer, ni modifier.
   *
   * La base n'autorise qu'une transition : de personne à moi. Si elle rend
   * vide, c'est que quelqu'un l'a prise entre-temps, et on le **dit** plutôt
   * que de laisser croire au succès (règle 5).
   */
  async function reprendreLaSienne(root, situationId) {
    const situation = getSituationById(situationId);
    if (!situation) return;

    uiState.menuDeLaSituation = "";
    try {
      const reprise = await reprendreLaSituation(situation.id);
      if (!reprise) {
        uiState.error = "Cette situation appartient déjà à quelqu'un : elle n'a pas été reprise.";
        rerender(root);
        return;
      }
      await refreshSituationsData(root, { forceSubjects: false });
    } catch (error) {
      console.error("reprendre la situation failed", error);
      uiState.error = error instanceof Error ? error.message : "La situation n'a pas pu être reprise.";
      rerender(root);
    }
  }

  /**
   * Effacer une situation.
   *
   * **On demande avant, en nommant ce qui part.** Il n'y a pas d'effacement
   * doux : une situation n'est pas une affirmation de la mémoire, elle n'a pas
   * d'histoire à préserver. Mais elle porte une façon de travailler, et la
   * perdre sans l'avoir dit serait pire que de la garder.
   *
   * **Les sujets ne bougent pas.** Ils appartiennent au projet, pas au carnet
   * de quelqu'un, et la phrase le dit — sans quoi on n'ose pas cliquer.
   */
  async function effacerLaSituation(root, situationId) {
    const situation = getSituationById(situationId);
    if (!situation) return;

    uiState.menuDeLaSituation = "";
    const nom = String(situation.title || "cette situation");
    if (!window.confirm(
      `Effacer « ${nom} » ? Elle disparaît de votre carnet, sans retour. `
      + "Les sujets qu'elle retenait restent dans leurs projets."
    )) {
      rerender(root);
      return;
    }

    try {
      await supprimerLaSituation(situation.id);
      // On ne reste pas sur le détail de ce qui n'existe plus.
      if (String(store.situationsView?.selectedSituationId || "") === String(situation.id)) {
        setSelectedSituationId(null);
      }
      await refreshSituationsData(root, { forceSubjects: false });
    } catch (error) {
      console.error("supprimer la situation failed", error);
      uiState.error = error instanceof Error ? error.message : "La situation n'a pas pu être effacée.";
      rerender(root);
    }
  }

  /** Fermer le formulaire sans rien écrire. */
  function annulerLaComposition(root) {
    uiState.situationEnCours = null;
    uiState.situationEnCoursErreur = "";
    uiState.situationEnCoursGarde = "";
    rerender(root);
  }

  /**
   * Poser une valeur dans la forme en cours.
   *
   * **Le nom et la description ne redessinent pas.** Redessiner à chaque frappe
   * renverrait le curseur à la fin du champ ; on écrit dans l'état, et l'écran
   * se redessine au prochain geste qui le demande. C'est la règle de la barre
   * de recherche, et elle vaut ici pour la même raison.
   */
  function poserDansLaComposition(champ, valeur, { redessiner = true, root = null } = {}) {
    const forme = uiState.situationEnCours;
    if (!forme) return;

    forme[champ] = valeur;
    // Ce qu'on vient de corriger n'est plus un refus : le laisser affiché
    // ferait relire un reproche auquel on a déjà répondu.
    uiState.situationEnCoursErreur = "";
    if (redessiner && root) rerender(root);
  }

  /**
   * Les menus de filtre de l'en-tête du tableau, pendant qu'on écrit.
   *
   * ## Le défaut qu'ils réparent
   *
   * Le formulaire demandait une requête sans dire un mot de la grammaire qui la
   * lit : on tapait un mot, le tableau rendait zéro, et rien n'indiquait qu'il
   * fallait écrire `label:` ou `projet:` — ni quelles valeurs existaient.
   *
   * ## Un clic pose un jeton, il ne navigue pas
   *
   * Chaque entrée porte la requête complète qu'elle produirait. On la recopie
   * donc dans la composition, telle quelle : la barre reste l'endroit où la
   * requête se lit et se corrige au clavier, et le menu n'a aucun état à lui.
   *
   * ## Le menu se rouvre après le redessin
   *
   * Poser un filtre redessine le tableau — c'est tout l'intérêt. Le menu part
   * avec, et l'on se retrouvait à recliquer le bouton entre deux valeurs d'un
   * champ à choix multiple, où l'on en coche justement plusieurs d'affilée.
   */
  function brancherLesFiltresDuFormulaire(root) {
    const bloc = root?.querySelector?.(`[${BLOC_DES_FILTRES}]`);
    if (!bloc) return;

    bloc.querySelectorAll("[data-sujets-menu]").forEach((bouton) => {
      bouton.addEventListener("click", (event) => {
        event.preventDefault();
        basculerUnMenuDenTete(root, String(bouton.getAttribute("data-sujets-menu") || ""));
      });
    });

    bloc.querySelectorAll("[data-sujets-lecture]").forEach((entree) => {
      entree.addEventListener("click", (event) => {
        event.preventDefault();
        const nomDuMenu = String(
          entree.closest("[data-sujets-menu-liste]")?.getAttribute("data-sujets-menu-liste") || ""
        );
        poserDansLaComposition(
          "requete", String(entree.getAttribute("data-sujets-lecture") || ""), { root }
        );
        ouvrirUnMenuDenTete(root, nomDuMenu);
      });
    });

    // **La recherche à l'intérieur d'un menu** restreint la liste des valeurs,
    // et rien d'autre : on cherche un label, on ne cherche pas des sujets. Le
    // curseur est remis là où il était, sinon le deuxième caractère le
    // renverrait au début du champ.
    bloc.querySelectorAll("[data-sujets-filtre-recherche]").forEach((champ) => {
      champ.addEventListener("input", (event) => {
        const cle = String(champ.getAttribute("data-sujets-filtre-recherche") || "");
        const nomDuMenu = String(
          champ.closest("[data-sujets-menu-liste]")?.getAttribute("data-sujets-menu-liste") || ""
        );
        const debut = event.target.selectionStart;
        const fin = event.target.selectionEnd;

        uiState.chercheDansLesFiltres = {
          ...(uiState.chercheDansLesFiltres && typeof uiState.chercheDansLesFiltres === "object"
            ? uiState.chercheDansLesFiltres
            : {}),
          [cle]: String(event.target.value || "")
        };
        rerender(root);
        ouvrirUnMenuDenTete(root, nomDuMenu);

        const remis = root.querySelector(`[data-sujets-filtre-recherche="${cle}"]`);
        if (!remis) return;
        remis.focus();
        if (Number.isFinite(debut) && Number.isFinite(fin)) remis.setSelectionRange(debut, fin);
      });
    });

    // Un clic ailleurs dans le formulaire referme ce qui était ouvert : un menu
    // resté ouvert derrière ce qu'on regarde se lit comme un défaut
    // d'affichage. Le rail, lui, redessine tout.
    root.querySelector(".sujets-vue-forme")?.addEventListener("click", (event) => {
      if (!dansUnBlocDeFiltres(event.target)) fermerLesMenusDenTete(root);
    });
  }

  /**
   * Ouvrir le choix de l'habit, ou le refermer.
   *
   * **Annuler remet ce qu'on avait en ouvrant.** Le choix se voit tout de suite
   * sur le bouton — c'est ce qui permet de comparer deux couleurs —, mais
   * renoncer doit rendre l'état d'avant, sinon le mot « Annuler » ne veut rien
   * dire. Même geste que sur le formulaire d'une vue.
   */
  function basculerLHabitDeLaComposition(root, { garder = true } = {}) {
    const forme = uiState.situationEnCours;
    if (!forme) return;

    if (!forme.habitOuvert) {
      forme.habitAvant = { icone: forme.icone ?? "", couleur: forme.couleur ?? "" };
      forme.habitOuvert = true;
      rerender(root);
      return;
    }

    if (!garder && forme.habitAvant) {
      forme.icone = forme.habitAvant.icone;
      forme.couleur = forme.habitAvant.couleur;
    }
    forme.habitOuvert = false;
    forme.habitAvant = null;
    rerender(root);
  }

  /**
   * Enregistrer la situation qu'on vient d'écrire.
   *
   * **Le refus se décide dans le service**, qui s'exécute en test : une requête
   * vide, un nom vide, un homonyme, une lecture du rail déjà en place. L'écran
   * le montre, il ne le juge pas.
   */
  async function enregistrerLaComposition(root) {
    const forme = uiState.situationEnCours;
    if (!forme) return;

    const refus = refusDeLaComposition({
      composition: forme,
      situations: safeArray(store.situationsView?.data),
      lectures: situationsDeLecture(champsDeLEcran())
    });
    if (refus) {
      uiState.situationEnCoursErreur = refus;
      rerender(root);
      return;
    }

    try {
      const ecrite = situationAEcrire(forme);
      // **Modifier et créer écrivent la même chose.** Un formulaire qui
      // enverrait deux jeux de colonnes selon le bouton finirait par en oublier
      // une d'un côté — c'est ainsi que l'habit et la requête ne partaient pas
      // à la création (règle 4).
      const enregistree = forme.id
        ? await updateSituationRecord(forme.id, ecrite)
        : await createSituationRecord(ecrite);

      uiState.situationEnCours = null;
      uiState.situationEnCoursErreur = "";
      uiState.situationEnCoursGarde = "";
      setSelectedSituationId(enregistree?.id || forme.id || null);
      await refreshSituationsData(root, { forceSubjects: false });
    } catch (error) {
      console.error("createSituation failed", error);
      // Une situation qui ne s'enregistre pas n'efface pas ce qu'on a écrit :
      // le formulaire reste, et l'on peut réessayer.
      uiState.createError = error instanceof Error ? error.message : "La création de la situation a échoué.";
      rerender(root);
    }
  }

  function openInsightsPanel(root) {
    const situationId = String(store.situationsView?.selectedSituationId || "").trim();
    uiState.insightsPanelOpen = true;
    const hasFreshData = Boolean(uiState.insightsData && uiState.insightsSituationId === situationId);
    uiState.insightsLoading = !hasFreshData;
    if (!hasFreshData) {
      uiState.insightsError = "";
      uiState.insightsData = null;
      uiState.insightsSituationId = "";
    }
    rerender(root);
    if (!hasFreshData) {
      refreshInsightsData(root).catch(() => undefined);
    }
  }

  function closeInsightsPanel(root) {
    uiState.insightsPanelOpen = false;
    rerender(root);
  }

  function bindEditPanelEvents(root) {
    root.querySelectorAll("[data-open-situation-edit]").forEach((node) => {
      node.addEventListener("click", () => {
        const situationId = String(node.getAttribute("data-open-situation-edit") || "").trim();
        ouvrirLaCompositionDeLaSituation(root, situationId);
      });
    });

    root.querySelectorAll("[data-open-situation-insights]").forEach((node) => {
      node.addEventListener("click", () => openInsightsPanel(root));
    });

    root.querySelectorAll("[data-close-situation-insights]").forEach((node) => {
      node.addEventListener("click", () => closeInsightsPanel(root));
    });

    root.querySelectorAll("[data-situation-insights-range]").forEach((node) => {
      node.addEventListener("click", async () => {
        if (String(uiState.insightsActiveChart || "burnup") !== "burnup") return;
        const nextRange = String(node.getAttribute("data-situation-insights-range") || "").trim().toLowerCase();
        if (!nextRange || uiState.insightsRange === nextRange) return;
        uiState.insightsRange = nextRange;
        await refreshInsightsData(root);
      });
    });

    root.querySelectorAll("[data-situation-insights-chart]").forEach((node) => {
      node.addEventListener("click", async () => {
        const nextChart = String(node.getAttribute("data-situation-insights-chart") || "").trim().toLowerCase();
        if (!["burnup", "labels", "objectives"].includes(nextChart)) return;
        if (uiState.insightsActiveChart === nextChart) return;
        uiState.insightsActiveChart = nextChart;
        rerender(root);
        const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
        const hasFreshData = uiState.insightsSituationId === selectedSituationId;
        const missingData = (
          !hasFreshData
          || (nextChart === "burnup" && !uiState.insightsData?.burnup)
          || (nextChart === "labels" && !uiState.insightsData?.labels)
          || (nextChart === "objectives" && !uiState.insightsData?.objectives)
        );
        if (!uiState.insightsLoading && missingData) {
          await refreshInsightsData(root);
        }
      });
    });

  }

  function ensureSituationsPaginationState() {
    if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
    if (!store.situationsView.pagination || typeof store.situationsView.pagination !== "object") {
      store.situationsView.pagination = { currentPage: 1, pageSize: 25 };
    }
    return store.situationsView.pagination;
  }
  function isPaginationDebugEnabled() {
    try {
      return String(window?.localStorage?.getItem?.("debug:pagination") || "").trim() === "1";
    } catch (_) {
      return false;
    }
  }
  function logPagination({ entity, previousPage, nextPage, totalPages }) {
    if (!isPaginationDebugEnabled()) return;
    console.info("[pagination]", { entity, previousPage, nextPage, totalPages });
  }

  function bindEvents(root) {
    function ensureTrajectoryZoomDropdownHost() {
      let host = document.getElementById("trajectoryZoomDropdownHost");
      if (!host) {
        host = document.createElement("div");
        host.id = "trajectoryZoomDropdownHost";
        host.className = "trajectory-zoom-dropdown-host";
        host.setAttribute("aria-hidden", "true");
        document.body.appendChild(host);
      }
      return host;
    }

    function closeTrajectoryZoomDropdown(rootNode = null) {
      const host = ensureTrajectoryZoomDropdownHost();
      const openMenu = host.querySelector("[data-situation-trajectory-zoom-menu]");
      const ownerDropdownId = String(host.dataset.ownerDropdownId || "").trim();
      if (openMenu && ownerDropdownId) {
        openMenu.classList.remove("situation-trajectory__zoom-menu--portal");
        const ownerDropdown = document.querySelector(`[data-situation-trajectory-zoom-dropdown-id="${CSS.escape(ownerDropdownId)}"]`);
        const ownerAnchor = ownerDropdown?.querySelector?.("[data-situation-trajectory-zoom-menu-anchor]");
        if (ownerAnchor) ownerAnchor.appendChild(openMenu);
      }
      host.innerHTML = "";
      host.dataset.ownerDropdownId = "";
      host.style.left = "0px";
      host.style.top = "0px";
      host.setAttribute("aria-hidden", "true");

      const searchRoot = rootNode || root || document;
      searchRoot.querySelectorAll("[data-situation-trajectory-zoom-menu]").forEach((node) => {
        node.classList.remove("gh-menu--open");
        node.hidden = true;
      });
      searchRoot.querySelectorAll("[data-situation-trajectory-zoom-trigger]").forEach((node) => {
        node.setAttribute("aria-expanded", "false");
      });
    }

    function openTrajectoryZoomDropdown(triggerNode, menuNode) {
      const host = ensureTrajectoryZoomDropdownHost();
      const dropdownNode = triggerNode?.closest?.(".situation-trajectory__zoom-dropdown");
      if (!dropdownNode || !menuNode) return;
      if (!dropdownNode.dataset.situationTrajectoryZoomDropdownId) {
        dropdownNode.dataset.situationTrajectoryZoomDropdownId = `trajectory-zoom-${Math.random().toString(36).slice(2)}`;
      }
      const dropdownId = dropdownNode.dataset.situationTrajectoryZoomDropdownId;
      dropdownNode.setAttribute("data-situation-trajectory-zoom-dropdown-id", dropdownId);

      const triggerRect = triggerNode.getBoundingClientRect();
      host.innerHTML = "";
      host.appendChild(menuNode);
      host.dataset.ownerDropdownId = dropdownId;
      host.setAttribute("aria-hidden", "false");
      menuNode.classList.add("situation-trajectory__zoom-menu--portal");
      menuNode.hidden = false;
      menuNode.classList.add("gh-menu--open");
      triggerNode.setAttribute("aria-expanded", "true");

      const menuRect = menuNode.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const margin = 12;
      let left = triggerRect.right - menuRect.width;
      let top = triggerRect.bottom + 6;
      if (left < margin) left = margin;
      if (left + menuRect.width > viewportWidth - margin) left = Math.max(margin, viewportWidth - menuRect.width - margin);
      if (top + menuRect.height > viewportHeight - margin) top = Math.max(margin, triggerRect.top - menuRect.height - 6);
      host.style.left = `${Math.round(left)}px`;
      host.style.top = `${Math.round(top)}px`;
    }

    const openButton = root.querySelector("#openCreateSituationButton");
    if (openButton) {
      openButton.onclick = () => ouvrirLaComposition(root);
    }

    // **Le kebab d'une ligne du tableau.** Le menu est celui des vues ; ses
    // entrées portent donc les attributs des vues, et c'est ici qu'elles
    // atterrissent sur une situation.
    root.querySelectorAll("[data-situations-menu]").forEach((bouton) => {
      bouton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = String(bouton.getAttribute("data-situations-menu") || "");
        uiState.menuDeLaSituation = String(uiState.menuDeLaSituation || "") === id ? "" : id;
        rerender(root);
      });
    });
    root.querySelectorAll("[data-sujets-vue-epingler]").forEach((entree) => {
      entree.addEventListener("click", async (event) => {
        event.preventDefault();
        await basculerLEpingle(root, String(entree.getAttribute("data-sujets-vue-epingler") || ""));
      });
    });
    // **« Modifier la situation », depuis le menu du détail.** Le menu est celui
    // des vues : son entrée porte donc l'attribut des vues, et c'est ici qu'elle
    // atterrit sur le formulaire d'une situation. Sans cette écoute, l'entrée
    // s'affiche et le clic ne fait rien.
    root.querySelectorAll("[data-sujets-vue-modifier]").forEach((entree) => {
      entree.addEventListener("click", (event) => {
        event.preventDefault();
        ouvrirLaCompositionDeLaSituation(
          root, String(entree.getAttribute("data-sujets-vue-modifier") || "")
        );
      });
    });
    root.querySelectorAll("[data-situations-reprendre]").forEach((entree) => {
      entree.addEventListener("click", async (event) => {
        event.preventDefault();
        await reprendreLaSienne(root, String(entree.getAttribute("data-situations-reprendre") || ""));
      });
    });
    root.querySelectorAll("[data-sujets-decrocher]").forEach((entree) => {
      entree.addEventListener("click", async (event) => {
        event.preventDefault();
        await effacerLaSituation(root, String(entree.getAttribute("data-sujets-decrocher") || ""));
      });
    });

    // **Les gestes du formulaire d'une situation.** Ce sont ceux du formulaire
    // d'une vue, aux mêmes attributs : le dessin est partagé, l'écoute suit.
    root.querySelector("[data-sujets-vue-annuler]")?.addEventListener("click", (event) => {
      event.preventDefault();
      annulerLaComposition(root);
    });
    root.querySelector("[data-sujets-vue-enregistrer]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      await enregistrerLaComposition(root);
    });
    root.querySelector("[data-sujets-vue-habit]")?.addEventListener("click", (event) => {
      event.preventDefault();
      basculerLHabitDeLaComposition(root);
    });
    root.querySelector("[data-sujets-vue-habit-annuler]")?.addEventListener("click", (event) => {
      event.preventDefault();
      basculerLHabitDeLaComposition(root, { garder: false });
    });
    root.querySelector("[data-sujets-vue-habit-appliquer]")?.addEventListener("click", (event) => {
      event.preventDefault();
      basculerLHabitDeLaComposition(root, { garder: true });
    });
    root.querySelectorAll("[data-sujets-vue-couleur]").forEach((choix) => {
      choix.addEventListener("click", (event) => {
        event.preventDefault();
        poserDansLaComposition("couleur", String(choix.getAttribute("data-sujets-vue-couleur") || ""), { root });
      });
    });
    root.querySelectorAll("[data-sujets-vue-icone]").forEach((choix) => {
      choix.addEventListener("click", (event) => {
        event.preventDefault();
        poserDansLaComposition("icone", String(choix.getAttribute("data-sujets-vue-icone") || ""), { root });
      });
    });

    const nomDeLaSituation = root.querySelector("[data-sujets-vue-nom]");
    if (nomDeLaSituation) {
      nomDeLaSituation.oninput = (event) => {
        poserDansLaComposition("nom", String(event.target.value || ""), { redessiner: false });
      };
    }
    const motDeLaSituation = root.querySelector("[data-sujets-vue-description]");
    if (motDeLaSituation) {
      motDeLaSituation.oninput = (event) => {
        poserDansLaComposition("description", String(event.target.value || ""), { redessiner: false });
      };
    }

    // **La requête redessine**, elle : c'est tout l'intérêt du tableau dessous.
    // Le curseur est remis là où il était, sinon le deuxième caractère le
    // renverrait au début du champ et la saisie deviendrait impossible.
    const champDeLaRequete = root.querySelector("[data-sujets-recherche]");
    if (champDeLaRequete) {
      champDeLaRequete.oninput = (event) => {
        const position = event.target.selectionStart;
        poserDansLaComposition("requete", String(event.target.value || ""), { root });

        const remis = root.querySelector("[data-sujets-recherche]");
        if (!remis) return;
        remis.focus();
        const ou = Number.isFinite(position) ? position : remis.value.length;
        remis.setSelectionRange(ou, ou);
      };
    }
    root.querySelector("[data-sujets-vider]")?.addEventListener("click", (event) => {
      event.preventDefault();
      poserDansLaComposition("requete", "", { root });
    });

    // **L'état d'une situation, qui n'est pas une recherche.** Une situation
    // fermée retiendrait les mêmes sujets ; c'est pourtant par là qu'on la
    // range, et c'est la seule chose que le formulaire demande en plus.
    root.querySelectorAll('input[name="situationStatut"]').forEach((bouton) => {
      bouton.addEventListener("change", (event) => {
        poserDansLaComposition("statut", String(event.currentTarget.value || ""), { redessiner: false });
      });
    });

    brancherLesFiltresDuFormulaire(root);

    // **L'épingle du rail replié ouvre la liste des épinglées.**
    //
    // Replié, le rail ne montre que des icônes, et les épinglées se rangent
    // sous une seule — sinon vingt-six situations font vingt-six pastilles de
    // couleur sans un mot. Le bouton était dessiné et rien ne l'écoutait : on
    // cliquait, il ne se passait rien, et les épinglées devenaient
    // inatteignables dès qu'on repliait le rail.
    root.querySelector("[data-sujets-epingles-menu]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      uiState.menuDesEpinglesDuCarnet = uiState.menuDesEpinglesDuCarnet !== true;
      rerender(root);
    });

    // **Le rail du carnet.** Chaque entrée porte la requête de ce qu'elle
    // ouvre : les lectures comme mes situations. Cliquer l'une ou l'autre fait
    // donc la même chose — ouvrir une situation et voir ses sujets.
    root.querySelectorAll("[data-sujets-lecture]").forEach((entree) => {
      entree.addEventListener("click", async (event) => {
        // **Les menus de filtre du formulaire portent le même attribut**, et
        // ils ne changent pas d'écran : ils écrivent dans la requête qu'on
        // compose. Sans ce garde-fou, cliquer un label refermait la situation
        // qu'on était en train d'écrire et affichait la liste à la place.
        if (dansUnBlocDeFiltres(entree)) return;

        event.preventDefault();
        const requete = String(entree.getAttribute("data-sujets-lecture") || "");

        // **Le rail est une navigation, et elle referme ce qu'on écrivait.**
        // Laisser la forme en place ferait réapparaître le formulaire en
        // revenant sur « Situations », à la place de la liste qu'on venait
        // chercher — et l'on croirait la liste perdue.
        uiState.situationEnCours = null;
        uiState.situationEnCoursErreur = "";
        // La liste du rail replié se referme au clic : elle vient de changer
        // d'écran, et un menu resté ouvert derrière se lit comme un défaut.
        uiState.menuDesEpinglesDuCarnet = false;

        store.situationsView.requeteDuCarnet = requete;
        // **Une situation qu'on remplit à la main n'a pas de requête**, et son
        // entrée du rail porte donc son repère. On l'ouvre par son identifiant
        // au lieu de chercher qui porte cette recherche — sans quoi elle
        // n'aurait rien à porter, et l'épingler ne faisait rien.
        const epinglee = situationDuRepere(requete);
        // Sans requête, c'est la première entrée : la liste des situations
        // elle-même, et non une situation.
        store.situationsView.selectedSituationId = epinglee
          || (requete ? (situationQuiPorte(requete)?.id || null) : null);

        rerender(root);
        if (store.situationsView.selectedSituationId) {
          await loadSituationSelection(store.situationsView.selectedSituationId);
          rerender(root);
        }
      });
    });

    // **La recherche du carnet.** On redessine à chaque frappe, et l'on rend le
    // curseur là où il était : sans cela, taper le deuxième caractère le
    // renverrait au début du champ, ce qui rend la saisie impossible.
    const champDeRecherche = root.querySelector("[data-situations-recherche]");
    if (champDeRecherche) {
      champDeRecherche.oninput = (event) => {
        store.situationsView.search = String(event.target.value || "");
        store.situationsView.page = 1;
        rerender(root);

        const remis = root.querySelector("[data-situations-recherche]");
        if (!remis) return;
        remis.focus();
        const fin = remis.value.length;
        remis.setSelectionRange(fin, fin);
      };
    }

    const videRecherche = root.querySelector("[data-situations-vider]");
    if (videRecherche) {
      videRecherche.onclick = () => {
        store.situationsView.search = "";
        store.situationsView.page = 1;
        rerender(root);
      };
    }

    root.querySelectorAll("[data-open-situation-drilldown]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
        if (!selectedSituationId) return;
        const selectedSituation = getSituationById(selectedSituationId);
        if (!selectedSituation) return;

        // **Le même bouton ouvre et referme.** Il ne savait qu'ouvrir : une
        // fois le panneau là, recliquer le rouvrait, et il fallait aller
        // chercher sa croix. C'est le geste qu'on attend d'un bouton de
        // barre latérale — déplier, replier.
        if (store.situationsView?.drilldown?.isOpen === true) {
          closeSituationDrilldown?.();
          return;
        }

        if (typeof openSituationDrilldownFromSelection === "function") {
          // **La situation se donne.** Le panneau cherche la sienne dans le
          // magasin de l'onglet Sujets d'un projet, que cet écran-ci ne
          // remplit pas : sans elle, la sélection échouait et le panneau ne
          // s'ouvrait pas — le bouton ne faisait rien.
          openSituationDrilldownFromSelection(selectedSituationId, {
            context: "situation", variant: "situation-kanban", situation: selectedSituation
          });
        }

        const drilldownBody = document.getElementById("drilldownBody");
        if (!drilldownBody) return;
        drilldownBody.innerHTML = renderProjectSituationDrilldown(selectedSituation, {
          closeButtonId: "projectSituationDrilldownClose"
        });

        drilldownBody.querySelector(".project-situation-drilldown__section-action")?.addEventListener("click", () => {
          ouvrirLaCompositionDeLaSituation(root, selectedSituationId);
        });
      });
    });

    root.querySelectorAll("button[data-open-situation]").forEach((node) => {
      node.addEventListener("click", async () => {
        const situationId = String(node.getAttribute("data-open-situation") || "").trim();
        if (!situationId) return;
        setSelectedSituationId(situationId);
            uiState.insightsPanelOpen = false;
        uiState.insightsLoading = false;
        uiState.insightsError = "";
        uiState.insightsData = null;
        uiState.insightsSituationId = "";
        const loadingPromise = loadSituationSelection(situationId);
        rerender(root);
        await loadingPromise;
        rerender(root);
      });
    });

    if (!root.dataset.situationSubjectOpenBound) {
      root.dataset.situationSubjectOpenBound = "true";
      root.addEventListener("click", (event) => {
        const trigger = event.target?.closest?.("[data-open-situation-subject]");
        if (!trigger || !root.contains(trigger)) return;
        const subjectId = String(trigger.getAttribute("data-open-situation-subject") || "").trim();
        if (!subjectId) return;
        event.preventDefault();
        event.stopPropagation();
        const source = trigger.closest(".situation-trajectory__items, .situation-trajectory__scene, .situation-trajectory")
          ? "trajectory-dom"
          : "situations-view";
        if (source === "trajectory-dom") {
        }
        if (typeof openSubjectDrilldown === "function") {
          openSubjectDrilldown(subjectId);
        }
      });
    }

    root.querySelectorAll("[data-situations-status-filter]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        const value = String(node.getAttribute("data-situations-status-filter") || "open").trim().toLowerCase() === "closed" ? "closed" : "open";
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        if (!store.situationsView.filters || typeof store.situationsView.filters !== "object") {
          store.situationsView.filters = { status: value };
        }
        store.situationsView.situationsStatusFilter = value;
        store.situationsView.filters.status = value;
        ensureSituationsPaginationState().currentPage = 1;
        rerender(root);
      });
    });

    root.querySelectorAll('[data-pagination-entity="situations"][data-pagination-page]').forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        const nextPage = Math.max(1, Number.parseInt(node.getAttribute("data-pagination-page") || "1", 10) || 1);
        const pagination = ensureSituationsPaginationState();
        const totalPages = Math.max(1, Number.parseInt(pagination.totalPages, 10) || 1);
        const previousPage = Math.max(1, Number.parseInt(pagination.currentPage, 10) || 1);
        pagination.currentPage = Math.min(nextPage, totalPages);
        logPagination({ entity: "situations", previousPage, nextPage: pagination.currentPage, totalPages });
        rerender(root);
      });
    });

    bindLightTabs(root, {
      selector: ".project-situation-layout-tabs [data-light-tab-target]",
      onChange: (nextTabId) => {
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        const normalizedTabId = String(nextTabId || "").trim().toLowerCase();
        const resolvedTabId = normalizedTabId === "planning" ? "roadmap" : normalizedTabId;
        const nextLayout = ["grille", "tableau", "roadmap"].includes(resolvedTabId) ? resolvedTabId : "tableau";
        if (store.situationsView.selectedSituationLayout === nextLayout) return;
        store.situationsView.selectedSituationLayout = nextLayout;
        rerender(root);
        if (nextLayout === "roadmap" && typeof loadSituationSelection === "function") {
          const selectedSituationId = String(store?.situationsView?.selectedSituationId || "").trim();
          if (selectedSituationId) {
            loadSituationSelection(selectedSituationId)
              .then(() => rerender(root))
              .catch((error) => {
                console.error("[trajectory] history.load.on.layout.error", error);
                rerender(root);
              });
          }
        }
      }
    });

    root.querySelectorAll("[data-situation-grid-toggle]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(node.getAttribute("data-situation-grid-toggle") || "").trim();
        const situationId = String(node.getAttribute("data-situation-grid-situation-id") || "").trim();
        if (!subjectId || !situationId) return;
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        if (!store.situationsView.gridExpandedSubjectIdsBySituationId || typeof store.situationsView.gridExpandedSubjectIdsBySituationId !== "object") {
          store.situationsView.gridExpandedSubjectIdsBySituationId = {};
        }
        const currentValues = store.situationsView.gridExpandedSubjectIdsBySituationId[situationId];
        const expandedSet = new Set(
          Array.isArray(currentValues)
            ? currentValues.map((value) => String(value || "").trim()).filter(Boolean)
            : []
        );
        if (expandedSet.has(subjectId)) expandedSet.delete(subjectId);
        else expandedSet.add(subjectId);
        store.situationsView.gridExpandedSubjectIdsBySituationId[situationId] = [...expandedSet];
        rerender(root);
      });
    });

    bindSituationGridColumnResize(root);
    bindTrajectoryColumnResize(root);
    bindTrajectoryDom(root);
    root.querySelectorAll("[data-situation-trajectory-opacity-input]").forEach((node) => {
      const applyOpacity = () => {
        const situationId = String(node.getAttribute("data-situation-trajectory-opacity-input") || "").trim();
        if (!situationId) return;
        const raw = Number(node.value);
        const nextOpacity = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.95;
        if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
        if (!store.situationsView.trajectoryCardOpacityBySituationId || typeof store.situationsView.trajectoryCardOpacityBySituationId !== "object") {
          store.situationsView.trajectoryCardOpacityBySituationId = {};
        }
        store.situationsView.trajectoryCardOpacityBySituationId[situationId] = nextOpacity;
        const trajectoryNode = node.closest("[data-situation-trajectory]");
        if (trajectoryNode) {
          trajectoryNode.style.setProperty("--situation-trajectory-card-opacity", String(nextOpacity.toFixed(2)));
          trajectoryNode.style.setProperty("--situation-trajectory-title-opacity", String(nextOpacity.toFixed(2)));
          trajectoryNode.setAttribute("data-trajectory-opacity-zero", nextOpacity === 0 ? "true" : "false");
        }
        const valueNode = root.querySelector(`[data-situation-trajectory-opacity-value="${situationId}"]`);
        if (valueNode) valueNode.textContent = nextOpacity.toFixed(2);
      };
      node.addEventListener("input", applyOpacity);
      node.addEventListener("change", applyOpacity);
      applyOpacity();
    });
    root.querySelectorAll("[data-situation-trajectory-zoom-trigger]").forEach((triggerNode) => {
      triggerNode.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const dropdownNode = triggerNode.closest(".situation-trajectory__zoom-dropdown");
        const menuNode = dropdownNode?.querySelector("[data-situation-trajectory-zoom-menu]");
        if (!menuNode) return;
        const isOpen = menuNode.classList.contains("gh-menu--open");
        closeTrajectoryZoomDropdown(root);
        if (!isOpen) {
          openTrajectoryZoomDropdown(triggerNode, menuNode);
        }
      });
    });
    root.querySelectorAll("[data-situation-trajectory-zoom-option]").forEach((optionNode) => {
      optionNode.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextZoom = normalizeTrajectoryZoom(optionNode.getAttribute("data-situation-trajectory-zoom-option"), "day");
        const menuNode = optionNode.closest("[data-situation-trajectory-zoom-menu]");
        const situationId = String(menuNode?.getAttribute("data-situation-trajectory-zoom-situation-id") || "").trim();
        if (!situationId) return;
        const bySituationId = ensureTrajectoryZoomBySituationId();
        bySituationId[situationId] = nextZoom;
        rerender(root);
      });
    });
    if (!root.dataset.trajectoryZoomDropdownDocBound) {
      root.dataset.trajectoryZoomDropdownDocBound = "true";
      document.addEventListener("click", () => {
        closeTrajectoryZoomDropdown(root);
      });
      window.addEventListener("resize", () => closeTrajectoryZoomDropdown(root));
      window.addEventListener("scroll", () => closeTrajectoryZoomDropdown(root), true);
    }
    bindSituationGridEditableCells(root);
    bindSituationGridDnd(root);

    bindEditPanelEvents(root);
  }

  return {
    situationQuiPorte,
    basculerLEpingle,
    effacerLaSituation,
    reprendreLaSienne,
    ouvrirLaComposition,
    ouvrirLaCompositionDeLaSituation,
    annulerLaComposition,
    enregistrerLaComposition,
    bindEvents
  };
}
