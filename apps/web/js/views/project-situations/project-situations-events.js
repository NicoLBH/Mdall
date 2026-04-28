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

function syncSubmitButtonState(button, { submitting = false, title = "" } = {}) {
  if (!button) return;
  button.disabled = submitting || !String(title || "").trim();
}

function parseCsvList(value) {
  return [...new Set(String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean))];
}

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
  openSubjectDrilldown,
  openSharedSubjectMetaDropdown,
  openSharedSubjectKanbanDropdown,
  closeSharedSubjectDropdowns,
  setSharedSubjectMetaDropdownQuery,
  setSharedSubjectKanbanDropdownQuery,
  toggleSubjectAssigneeFromSharedDropdown,
  toggleSubjectLabelFromSharedDropdown,
  toggleSubjectObjectiveFromSharedDropdown,
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
    const state = ensureSituationGridCellDropdownState();
    const host = document.getElementById("subjectMetaDropdownHost");
    closeSituationGridCellDropdown();
    state.open = true;
    state.field = String(field || "").trim().toLowerCase();
    state.subjectId = String(subjectId || "").trim();
    state.situationId = String(situationId || "").trim();
    state.anchor = anchor;
    if (host?.dataset) host.dataset.situationGridOwned = "1";
    anchor.closest?.(".situation-grid__cell")?.classList?.add?.("situation-grid__cell--active");
    anchor.setAttribute("aria-expanded", "true");
    logSituationGridDropdown("open", buildSituationGridDropdownDebugPayload({
      field: state.field,
      subjectId: state.subjectId,
      situationId: state.situationId
    }));
    if (state.field === "kanban") {
      const opened = openSharedSubjectKanbanDropdown?.({
        root,
        subjectId: state.subjectId,
        situationId: state.situationId
      });
      if (!opened) closeSituationGridCellDropdown();
      return;
    }

    const opened = openSharedSubjectMetaDropdown?.({
      root,
      field: state.field,
      subjectId: state.subjectId,
      anchor,
      scope: "situation-grid",
      scopeHost: "main",
      instanceKey: "situation-grid",
      openedFrom: "situation-grid"
    });
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
      "subject_child_removed"
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

    const dayTicksHtml = ticks.map((tick, index) => {
      const nextTick = ticks[index + 1];
      const tickWidth = Math.max(24, (nextTick?.x ?? timeScale.totalWidth) - tick.x);
      const date = tick.date instanceof Date ? tick.date : new Date(tick.timestamp);
      const dayLabel = String(date.getDate());
      const isoDate = toLocalIsoDate(date);
      const isToday = isoDate === todayIsoDate;
      return `<time role="columnheader" data-index="${index}" datetime="${isoDate}" class="situation-trajectory__timeline-day${isToday ? " is-today" : ""}" style="left:${tick.x}px;width:${tickWidth}px;">${dayLabel}</time>`;
    }).join("");

    const monthTicksHtml = ticks
      .filter((tick, index) => {
        const date = tick.date instanceof Date ? tick.date : new Date(tick.timestamp);
        return index === 0 || date.getDate() === 1;
      })
      .map((tick) => {
        const date = tick.date instanceof Date ? tick.date : new Date(tick.timestamp);
        const label = date.toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric"
        });
        return `<time datetime="${toLocalIsoDate(date)}" class="situation-trajectory__timeline-month" style="left:${tick.x}px;">${label}</time>`;
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
    setSituationGridDropdownRoot(root);
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
  function buildEditSituationPayload() {
    const form = uiState.editForm || getDefaultCreateForm();
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
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      status: String(form.status || "open") === "closed" ? "closed" : "open",
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

  function openCreateModal(root) {
    uiState.createModalOpen = true;
    uiState.createSubmitting = false;
    uiState.createError = "";
    uiState.createForm = getDefaultCreateForm();
    rerender(root);
    syncSubmitButtonState(document.getElementById("projectCreateSituationSubmit"), {
      submitting: uiState.createSubmitting,
      title: uiState.createForm.title
    });
  }

  function closeCreateModal(root) {
    uiState.createModalOpen = false;
    uiState.createSubmitting = false;
    uiState.createError = "";
    rerender(root);
  }

  function openEditPanel(root, situationId) {
    const selectedSituation = getSituationById(situationId || store.situationsView?.selectedSituationId);
    if (!selectedSituation) return;
    uiState.editPanelOpen = true;
    uiState.insightsPanelOpen = false;
    uiState.editSubmitting = false;
    uiState.editError = "";
    uiState.editForm = getSituationEditForm(selectedSituation);
    rerender(root);
  }

  function closeEditPanel(root) {
    uiState.editPanelOpen = false;
    uiState.editSubmitting = false;
    uiState.editError = "";
    rerender(root);
  }

  function openInsightsPanel(root) {
    const situationId = String(store.situationsView?.selectedSituationId || "").trim();
    uiState.insightsPanelOpen = true;
    uiState.editPanelOpen = false;
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

  async function submitCreateSituation(root) {
    const payload = buildCreateSituationPayload();
    if (!String(payload.title || "").trim()) {
      uiState.createError = "Le titre est obligatoire.";
      rerender(root);
      return;
    }

    uiState.createSubmitting = true;
    uiState.createError = "";
    rerender(root);

    try {
      const created = await createSituationRecord(payload);
      setSelectedSituationId(created?.id || null);
      uiState.createModalOpen = false;
      uiState.createSubmitting = false;
      uiState.createForm = getDefaultCreateForm();
      await refreshSituationsData(root, { forceSubjects: false });
    } catch (error) {
      console.error("createSituation failed", error);
      uiState.createSubmitting = false;
      uiState.createError = error instanceof Error ? error.message : "La création de la situation a échoué.";
      rerender(root);
    }
  }

  async function submitEditSituation(root) {
    const situationId = String(store.situationsView?.selectedSituationId || "").trim();
    const payload = buildEditSituationPayload();

    if (!String(payload.title || "").trim()) {
      uiState.editError = "Le titre est obligatoire.";
      rerender(root);
      return;
    }
    if (!situationId) {
      uiState.editError = "Impossible d'identifier la situation à modifier.";
      rerender(root);
      return;
    }

    uiState.editSubmitting = true;
    uiState.editError = "";
    rerender(root);

    try {
      await updateSituationRecord(situationId, payload);
      await refreshSituationsData(root, { forceSubjects: false });
      uiState.editPanelOpen = false;
      uiState.editSubmitting = false;
      uiState.editError = "";
      await loadSituationSelection(situationId);
      rerender(root);
    } catch (error) {
      console.error("updateSituation failed", error);
      uiState.editSubmitting = false;
      uiState.editError = error instanceof Error ? error.message : "La mise à jour de la situation a échoué.";
      rerender(root);
    }
  }

  function bindCreateModalEvents(root) {
    const modal = document.getElementById("projectCreateSituationModal");
    if (!modal) return;

    modal.querySelectorAll("[data-close-project-situation-modal]").forEach((node) => {
      node.addEventListener("click", () => closeCreateModal(root));
    });

    modal.querySelectorAll("[data-situation-create-field]").forEach((field) => {
      field.addEventListener("input", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-create-field") || "").trim();
        if (!key) return;
        uiState.createForm[key] = event.currentTarget.value;
        uiState.createError = "";
        syncSubmitButtonState(modal.querySelector("#projectCreateSituationSubmit"), {
          submitting: uiState.createSubmitting,
          title: uiState.createForm.title
        });
      });
    });

    modal.querySelectorAll('input[name="situationCreateMode"]').forEach((field) => {
      field.addEventListener("change", (event) => {
        uiState.createForm.mode = event.currentTarget.value === "automatic" ? "automatic" : "manual";
        uiState.createError = "";
        rerender(root);
      });
    });

    modal.querySelectorAll("[data-situation-create-checkbox]").forEach((field) => {
      field.addEventListener("change", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-create-checkbox") || "").trim();
        if (!key) return;
        uiState.createForm[key] = !!event.currentTarget.checked;
        uiState.createError = "";
      });
    });

    modal.querySelector("#projectCreateSituationSubmit")?.addEventListener("click", async () => {
      await submitCreateSituation(root);
    });

    modal.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitCreateSituation(root);
    });
  }

  function bindEditPanelEvents(root) {
    root.querySelectorAll("[data-open-situation-edit]").forEach((node) => {
      node.addEventListener("click", () => {
        const situationId = String(node.getAttribute("data-open-situation-edit") || "").trim();
        openEditPanel(root, situationId);
      });
    });

    root.querySelectorAll("[data-close-situation-edit]").forEach((node) => {
      node.addEventListener("click", () => closeEditPanel(root));
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

    root.querySelectorAll("[data-situation-edit-field]").forEach((field) => {
      field.addEventListener("input", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-edit-field") || "").trim();
        if (!key) return;
        uiState.editForm[key] = event.currentTarget.value;
        uiState.editError = "";
        syncSubmitButtonState(root.querySelector("#projectEditSituationSubmit"), {
          submitting: uiState.editSubmitting,
          title: uiState.editForm.title
        });
      });
    });

    root.querySelectorAll('input[name="situationEditStatus"]').forEach((field) => {
      field.addEventListener("change", (event) => {
        uiState.editForm.status = event.currentTarget.value === "closed" ? "closed" : "open";
        uiState.editError = "";
      });
    });

    root.querySelectorAll("[data-situation-edit-checkbox]").forEach((field) => {
      field.addEventListener("change", (event) => {
        const key = String(event.currentTarget?.getAttribute("data-situation-edit-checkbox") || "").trim();
        if (!key) return;
        uiState.editForm[key] = !!event.currentTarget.checked;
        uiState.editError = "";
      });
    });

    root.querySelector("#projectEditSituationSubmit")?.addEventListener("click", async () => {
      await submitEditSituation(root);
    });
  }

  function bindEvents(root) {
    const openButton = root.querySelector("#openCreateSituationButton");
    if (openButton) {
      openButton.onclick = () => openCreateModal(root);
    }

    root.querySelectorAll("[data-open-situation-drilldown]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
        if (!selectedSituationId) return;
        const selectedSituation = getSituationById(selectedSituationId);
        if (!selectedSituation) return;

        if (typeof openSituationDrilldownFromSelection === "function") {
          openSituationDrilldownFromSelection(selectedSituationId, { context: "situation", variant: "situation-kanban" });
        }

        const drilldownBody = document.getElementById("drilldownBody");
        if (!drilldownBody) return;
        drilldownBody.innerHTML = renderProjectSituationDrilldown(selectedSituation, {
          closeButtonId: "projectSituationDrilldownClose"
        });

        drilldownBody.querySelector("#projectSituationDrilldownClose")?.addEventListener("click", () => {
          document.getElementById("drilldownClose")?.click();
        });

        drilldownBody.querySelector(".project-situation-drilldown__section-action")?.addEventListener("click", () => {
          openEditPanel(root, selectedSituationId);
        });
      });
    });

    root.querySelectorAll("button[data-open-situation]").forEach((node) => {
      node.addEventListener("click", async () => {
        const situationId = String(node.getAttribute("data-open-situation") || "").trim();
        if (!situationId) return;
        setSelectedSituationId(situationId);
        uiState.editPanelOpen = false;
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
        root.querySelectorAll("[data-situation-trajectory-zoom-menu]").forEach((node) => {
          node.classList.remove("gh-menu--open");
          node.hidden = true;
        });
        root.querySelectorAll("[data-situation-trajectory-zoom-trigger]").forEach((node) => {
          node.setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          menuNode.hidden = false;
          menuNode.classList.add("gh-menu--open");
          triggerNode.setAttribute("aria-expanded", "true");
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
        root.querySelectorAll("[data-situation-trajectory-zoom-menu]").forEach((node) => {
          node.classList.remove("gh-menu--open");
          node.hidden = true;
        });
        root.querySelectorAll("[data-situation-trajectory-zoom-trigger]").forEach((node) => {
          node.setAttribute("aria-expanded", "false");
        });
      });
    }
    bindSituationGridEditableCells(root);
    bindSituationGridDnd(root);

    bindCreateModalEvents(root);
    bindEditPanelEvents(root);
  }

  return {
    openCreateModal,
    closeCreateModal,
    submitCreateSituation,
    bindEvents
  };
}
