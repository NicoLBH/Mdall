import { bindLightTabs } from "../ui/light-tabs.js";
import { renderProjectSituationDrilldown } from "../project-situation-drilldown.js";

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
  openSituationDrilldownFromSelection
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
