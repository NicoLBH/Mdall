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
  openSharedSubjectMetaDropdown,
  openSharedSubjectKanbanDropdown,
  closeSharedSubjectDropdowns,
  setSharedSubjectMetaDropdownQuery,
  setSharedSubjectKanbanDropdownQuery,
  toggleSubjectAssigneeFromSharedDropdown,
  toggleSubjectLabelFromSharedDropdown,
  toggleSubjectObjectiveFromSharedDropdown,
  setSituationGridKanbanStatus
}) {
  let insightsRequestId = 0;

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
    if (state.anchor?.setAttribute) state.anchor.setAttribute("aria-expanded", "false");
    state.open = false;
    state.field = "";
    state.subjectId = "";
    state.situationId = "";
    state.anchor = null;
    closeSharedSubjectDropdowns?.();
  }

  function openSituationGridCellDropdown(root, { field = "", anchor = null, subjectId = "", situationId = "" } = {}) {
    if (!anchor) return;
    const state = ensureSituationGridCellDropdownState();
    closeSituationGridCellDropdown();
    state.open = true;
    state.field = String(field || "").trim().toLowerCase();
    state.subjectId = String(subjectId || "").trim();
    state.situationId = String(situationId || "").trim();
    state.anchor = anchor;
    anchor.setAttribute("aria-expanded", "true");
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
    const map = {
      non_active: "Non activé",
      to_activate: "À activer",
      in_progress: "En cours",
      in_arbitration: "En arbitrage",
      resolved: "Résolu"
    };
    return map[String(status || "").trim().toLowerCase()] || map.non_active;
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

  async function handleSharedDropdownAction(root, actionNode) {
    const state = ensureSituationGridCellDropdownState();
    const subjectId = String(state.subjectId || actionNode?.getAttribute("data-subject-id") || "").trim();
    if (!subjectId) return false;
    if (actionNode.matches("[data-subject-assignee-toggle]")) {
      const assigneeId = normalizeGridDropdownTogglePayload(actionNode, "data-subject-assignee-toggle");
      if (!assigneeId) return true;
      await toggleSubjectAssigneeFromSharedDropdown?.(subjectId, assigneeId, { rerender: false });
      rerender(root);
      return true;
    }
    if (actionNode.matches("[data-subject-label-toggle]")) {
      const labelKey = normalizeGridDropdownTogglePayload(actionNode, "data-subject-label-toggle");
      if (!labelKey) return true;
      await toggleSubjectLabelFromSharedDropdown?.(subjectId, labelKey, { rerender: false });
      rerender(root);
      return true;
    }
    if (actionNode.matches("[data-objective-select]")) {
      const objectiveId = normalizeGridDropdownTogglePayload(actionNode, "data-objective-select");
      if (!objectiveId) return true;
      await toggleSubjectObjectiveFromSharedDropdown?.(subjectId, objectiveId, { rerender: false });
      rerender(root);
      return true;
    }
    return false;
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

  function bindSituationGridEditableCells(root) {
    root.querySelectorAll("[data-situation-grid-edit-cell]").forEach((node) => {
      node.addEventListener("click", (event) => {
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

    if (document.body.dataset.situationGridDropdownGlobalBound !== "true") {
      document.body.dataset.situationGridDropdownGlobalBound = "true";

      document.addEventListener("click", async (event) => {
        const eventTarget = event.target instanceof Element ? event.target : null;
        if (!eventTarget) return;
        const actionNode = eventTarget.closest(
          "[data-subject-kanban-select],[data-subject-assignee-toggle],[data-subject-label-toggle],[data-objective-select]"
        );
        if (actionNode) {
          const state = ensureSituationGridCellDropdownState();
          if (!state.open) return;
          if (actionNode.matches("[data-subject-kanban-select]")) {
            const nextStatus = String(actionNode.getAttribute("data-subject-kanban-select") || "").trim();
            const previousStatus = String(store?.situationsView?.kanbanStatusBySituationId?.[state.situationId]?.[state.subjectId] || "non_active").trim().toLowerCase();
            if (!nextStatus || nextStatus === previousStatus) {
              closeSituationGridCellDropdown();
              return;
            }
            if (!store.situationsView || typeof store.situationsView !== "object") store.situationsView = {};
            store.situationsView.kanbanStatusBySituationId = {
              ...(store.situationsView.kanbanStatusBySituationId || {}),
              [state.situationId]: {
                ...((store.situationsView.kanbanStatusBySituationId || {})[state.situationId] || {}),
                [state.subjectId]: nextStatus
              }
            };
            patchSituationGridKanbanCell({ root, subjectId: state.subjectId, situationId: state.situationId });
            closeSituationGridCellDropdown();
            try {
              await setSituationGridKanbanStatus?.(state.situationId, state.subjectId, nextStatus);
            } catch (error) {
              store.situationsView.kanbanStatusBySituationId = {
                ...(store.situationsView.kanbanStatusBySituationId || {}),
                [state.situationId]: {
                  ...((store.situationsView.kanbanStatusBySituationId || {})[state.situationId] || {}),
                  [state.subjectId]: previousStatus
                }
              };
              patchSituationGridKanbanCell({ root, subjectId: state.subjectId, situationId: state.situationId });
              console.error("situation grid kanban update failed", error);
              showSituationGridInlineError(root, error instanceof Error ? error.message : "La mise à jour du statut kanban a échoué.");
            }
            return;
          }

          try {
            await handleSharedDropdownAction(root, actionNode);
          } catch (error) {
            console.error("situation grid shared dropdown action failed", error);
            showSituationGridInlineError(root, error instanceof Error ? error.message : "La mise à jour a échoué.");
          } finally {
            closeSituationGridCellDropdown();
          }
          return;
        }

        const state = ensureSituationGridCellDropdownState();
        if (!state.open) return;
        const host = document.getElementById("subjectMetaDropdownHost");
        if (host?.contains(eventTarget)) return;
        if (state.anchor && state.anchor.contains(eventTarget)) return;
        closeSituationGridCellDropdown();
      });

      document.addEventListener("input", (event) => {
        const eventTarget = event.target instanceof Element ? event.target : null;
        if (!eventTarget) return;
        const metaSearch = eventTarget.closest("[data-subject-meta-search]");
        if (metaSearch && ensureSituationGridCellDropdownState().open) {
          setSharedSubjectMetaDropdownQuery?.(metaSearch.value || "", root);
          return;
        }
        const kanbanSearch = eventTarget.closest("[data-subject-kanban-search]");
        if (kanbanSearch && ensureSituationGridCellDropdownState().open) {
          setSharedSubjectKanbanDropdownQuery?.(kanbanSearch.value || "", root);
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!ensureSituationGridCellDropdownState().open) return;
        event.preventDefault();
        closeSituationGridCellDropdown();
      });

      document.addEventListener("pointerdown", (event) => {
        const eventTarget = event.target instanceof Element ? event.target : null;
        if (!eventTarget) return;
        const state = ensureSituationGridCellDropdownState();
        if (!state.open) return;
        const host = document.getElementById("subjectMetaDropdownHost");
        if (host?.contains(eventTarget)) return;
        if (state.anchor && state.anchor.contains(eventTarget)) return;
        closeSituationGridCellDropdown();
      }, true);
    }
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
    bindSituationGridEditableCells(root);

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
