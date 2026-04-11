export function createProjectSituationsEvents({
  uiState,
  getDefaultCreateForm,
  normalizeSituationMode,
  buildCreateSituationPayload,
  rerender,
  refreshSituationsData,
  createSituationRecord,
  setSelectedSituationId,
  loadSituationSelection
}) {
  function openCreateModal(root) {
    uiState.createModalOpen = true;
    uiState.createSubmitting = false;
    uiState.createError = "";
    uiState.createForm = getDefaultCreateForm();
    rerender(root);
  }

  function closeCreateModal(root) {
    uiState.createModalOpen = false;
    uiState.createSubmitting = false;
    uiState.createError = "";
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

  function bindEvents(root) {
    const openButton = root.querySelector("#openCreateSituationButton");
    if (openButton) {
      openButton.onclick = () => openCreateModal(root);
    }

    root.querySelectorAll("button[data-open-situation]").forEach((node) => {
      node.addEventListener("click", async () => {
        const situationId = String(node.getAttribute("data-open-situation") || "").trim();
        if (!situationId) return;
        setSelectedSituationId(situationId);
        const loadingPromise = loadSituationSelection(situationId);
        rerender(root);
        await loadingPromise;
        rerender(root);
      });
    });

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

    const submitButton = modal.querySelector("#projectCreateSituationSubmit");
    if (submitButton) {
      submitButton.addEventListener("click", () => {
        submitCreateSituation(root);
      });
    }
  }

  return {
    openCreateModal,
    closeCreateModal,
    submitCreateSituation,
    bindEvents
  };
}
