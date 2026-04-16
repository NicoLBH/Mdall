export function createProjectSubjectsEvents(config) {
  const {
    store,
    PROJECT_TAB_RESELECTED_EVENT,
    getSubjectsViewState,
    getSubjectsTabResetState,
    getDropdownController,
    renderSubjectMetaDropdownHost,
    getScopedSelection,
    getSubjectMetaMenuEntries,
    getSubjectSidebarMeta,
    rerenderScope,
    syncSubjectMetaDropdownPosition,
    getSubjectMetaScopeRoot,
    getSubjectKanbanMenuEntries,
    getSetSujetKanbanStatus,
    setSubjectMetaActiveEntry,
    getToggleSubjectObjective,
    getToggleSubjectSituation,
    getToggleSubjectLabel,
    getToggleSubjectAssignee,
    getSetSubjectParent,
    getReorderSubjectChildren,
    syncDescriptionEditorDraft,
    startDescriptionEdit,
    clearDescriptionEditState,
    applyDescriptionSave,
    syncCommentPreview,
    applyCommentAction,
    getApplyIssueStatusAction,
    showError,
    updateDrilldownPanel,
    openDrilldownFromSubjectPanel,
    openDrilldownFromSujetPanel,
    selectSubject,
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
    bindOverlayChromeDismiss,
    bindOverlayChromeCompact,
    getProjectSubjectMilestones,
    renderSubjectMetaFieldValue,
    resolveCurrentUserAssigneeId
  } = config;

  let detachDropdownDocumentEvents = null;
  let modalEventsBound = false;
  let subjectsTabResetBound = false;

  function isSubissuesDndDebugEnabled() {
    try {
      const search = String(window?.location?.search || "");
      if (search.includes("debugSubissuesDnd=1")) return true;
      const storageValue = String(window?.localStorage?.getItem?.("mdall:debug-subissues-dnd") || "").trim().toLowerCase();
      const sessionStorageValue = String(window?.sessionStorage?.getItem?.("mdall:debug-subissues-dnd") || "").trim().toLowerCase();
      const globalFlag = String(window?.__MDALL_DEBUG_SUBISSUES_DND__ || "").trim().toLowerCase();
      return storageValue === "1" || storageValue === "true" || sessionStorageValue === "1" || sessionStorageValue === "true" || globalFlag === "1" || globalFlag === "true";
    } catch {
      return false;
    }
  }

  function debugSubissuesDnd(eventName, payload = {}) {
    if (!isSubissuesDndDebugEnabled()) return;
    console.log("[subissues-dnd]", eventName, payload);
  }

  function dropdownController() {
    return getDropdownController();
  }

  function bindSubjectMetaDropdownDocumentEvents() {
    if (typeof detachDropdownDocumentEvents === "function") return detachDropdownDocumentEvents;
    detachDropdownDocumentEvents = dropdownController().bindDocumentEvents({
      onRerender: () => rerenderScope(),
      onSyncPosition: (scopeRoot) => syncSubjectMetaDropdownPosition(scopeRoot),
      getScopeRoot: getSubjectMetaScopeRoot
    });
    return detachDropdownDocumentEvents;
  }

  function detachSubjectMetaDropdownDocumentEvents() {
    if (typeof detachDropdownDocumentEvents !== "function") return;
    detachDropdownDocumentEvents();
    detachDropdownDocumentEvents = null;
  }

  async function resolveSelfCollaboratorAssigneeId() {
    const currentUserId = String(store.user?.id || "").trim();
    const currentEmail = String(store.user?.email || "").trim().toLowerCase();
    const collaborators = Array.isArray(store.projectForm?.collaborators) ? store.projectForm.collaborators : [];
    if (!collaborators.length) {
      if (typeof resolveCurrentUserAssigneeId === "function") {
        return String(await resolveCurrentUserAssigneeId() || "");
      }
      return "";
    }

    const collaboratorByUserId = collaborators.find((collaborator) => {
      const collaboratorUserId = String(collaborator?.userId || collaborator?.linkedUserId || "").trim();
      return collaboratorUserId && currentUserId && collaboratorUserId === currentUserId;
    });
    if (collaboratorByUserId) return String(collaboratorByUserId?.personId || collaboratorByUserId?.id || "");

    const collaboratorByEmail = collaborators.find((collaborator) => {
      const collaboratorEmail = String(collaborator?.email || "").trim().toLowerCase();
      return collaboratorEmail && currentEmail && collaboratorEmail === currentEmail;
    });
    if (collaboratorByEmail) return String(collaboratorByEmail?.personId || collaboratorByEmail?.id || "");

    if (typeof resolveCurrentUserAssigneeId === "function") {
      return String(await resolveCurrentUserAssigneeId() || "");
    }

    return "";
  }

  function resetSubjectsTabView(reason = "manual") {
    resetSubjectsViewTransientState();

    dropdownController().closeMeta();
    dropdownController().closeKanban();
    resetObjectiveEditState();
    store.situationsView.subjectsSubview = "subjects";
    store.situationsView.selectedObjectiveId = "";
    store.situationsView.showTableOnly = true;
    resetCreateSubjectForm();

    if (store.situationsView.detailsModalOpen) {
      closeDetailsModal();
    }
    if (store.situationsView.drilldown?.isOpen) {
      closeDrilldown();
    }
    const currentRoot = config.getSubjectsCurrentRoot?.();
    if (currentRoot && currentRoot.isConnected) {
      rerenderPanels();
      syncSituationsPrimaryScrollSource();
    }
  }

  function bindSubjectSituationFieldInteractions(root, fieldRoot) {
    if (!root || !fieldRoot) return;

    fieldRoot.querySelectorAll("[data-subject-situations-closed-toggle]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const dropdownState = getSubjectsViewState().subjectMetaDropdown || {};
        const scrollState = dropdownController().captureContextScrollState(root);
        dropdownState.showClosedSituations = !dropdownState.showClosedSituations;
        rerenderScope(root);
        dropdownController().restoreContextScrollState(scrollState);
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
      };
    });

    fieldRoot.querySelectorAll("[data-subject-kanban-trigger]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(btn.dataset.subjectKanbanTrigger || "");
        const situationId = String(btn.dataset.subjectKanbanSituationId || "");
        const dropdown = getSubjectsViewState().subjectKanbanDropdown || {};
        const isAlreadyOpen = String(dropdown.subjectId || "") === subjectId && String(dropdown.situationId || "") === situationId;
        if (isAlreadyOpen) {
          dropdownController().closeKanban();
        } else {
          dropdownController().closeMeta();
          dropdownController().openKanban({ subjectId, situationId });
          const entries = getSubjectKanbanMenuEntries(subjectId, situationId, "");
          dropdown.activeKey = String((entries.find((entry) => entry.isSelected) || entries[0] || {}).key || "");
        }
        refreshSubjectMetaDropdownUi(root, {
          preserveScroll: true,
          preserveFocus: !isAlreadyOpen,
          focusArgs: !isAlreadyOpen ? { subjectId, situationId } : null
        });
      };
    });
  }

  function bindDropdownHostInteractiveElements(root, dropdownHost) {
    if (!root || !dropdownHost) return;
    const setSujetKanbanStatus = getSetSujetKanbanStatus?.();
    const toggleSubjectObjective = getToggleSubjectObjective?.();
    const toggleSubjectSituation = getToggleSubjectSituation?.();
    const toggleSubjectLabel = getToggleSubjectLabel?.();
    const toggleSubjectAssignee = getToggleSubjectAssignee?.();
    const setSubjectParent = getSetSubjectParent?.();
    const reorderSubjectChildren = getReorderSubjectChildren?.();

    dropdownHost.querySelectorAll("[data-subject-kanban-search]").forEach((input) => {
      input.addEventListener("input", () => {
        const subjectId = String(input.dataset.subjectKanbanSearch || "");
        const situationId = String(input.dataset.subjectKanbanSearchSituationId || "");
        dropdownController().setKanbanQuery(input.value || "");
        const entries = getSubjectKanbanMenuEntries(subjectId, situationId, input.value || "");
        getSubjectsViewState().subjectKanbanDropdown.activeKey = String((entries.find((entry) => entry.isSelected) || entries[0] || {}).key || "");
        refreshSubjectMetaDropdownUi(root, { preserveScroll: true, preserveFocus: true, focusArgs: { subjectId, situationId } });
      });

      input.addEventListener("keydown", (event) => {
        const subjectId = String(input.dataset.subjectKanbanSearch || "");
        const situationId = String(input.dataset.subjectKanbanSearchSituationId || "");
        const entries = getSubjectKanbanMenuEntries(subjectId, situationId, getSubjectsViewState().subjectKanbanDropdown.query || "");
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!entries.length) return;
          const currentKey = String(getSubjectsViewState().subjectKanbanDropdown.activeKey || "");
          const currentIndex = entries.findIndex((entry) => String(entry?.key || "") === currentKey);
          const nextIndex = currentIndex >= 0 ? (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length : 0;
          getSubjectsViewState().subjectKanbanDropdown.activeKey = String(entries[nextIndex]?.key || "");
          refreshSubjectMetaDropdownUi(root, { preserveScroll: true, preserveFocus: true, focusArgs: { subjectId, situationId } });
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          dropdownController().closeKanban();
          rerenderScope(root);
          return;
        }
        if (event.key === "Enter") {
          const activeKey = String(getSubjectsViewState().subjectKanbanDropdown.activeKey || "");
          if (!activeKey) return;
          event.preventDefault();
          setSujetKanbanStatus(subjectId, activeKey, { situationId });
          dropdownController().closeKanban();
          rerenderScope(root);
        }
      });
    });

    dropdownHost.querySelectorAll("[data-subject-meta-search]").forEach((input) => {
      input.addEventListener("input", () => {
        const field = String(input.dataset.subjectMetaSearch || "");
        dropdownController().setMetaQuery(input.value || "");
        const selection = getScopedSelection(root);
        const subject = selection?.type === "sujet" ? selection.item : null;
        const entries = subject ? getSubjectMetaMenuEntries(subject, field) : [];
        const currentKey = String(getSubjectsViewState().subjectMetaDropdown.activeKey || "");
        getSubjectsViewState().subjectMetaDropdown.activeKey = entries.some((entry) => String(entry?.key || "") === currentKey)
          ? currentKey
          : String(entries[0]?.key || "");
        refreshSubjectMetaDropdownUi(root, { preserveScroll: true, preserveFocus: true, focusArgs: { field } });
      });

      input.addEventListener("keydown", async (event) => {
        const field = String(input.dataset.subjectMetaSearch || "");
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setSubjectMetaActiveEntry(subjectSelection.item, field, event.key === "ArrowDown" ? 1 : -1);
          refreshSubjectMetaDropdownUi(root, { preserveScroll: true, preserveFocus: true, focusArgs: { field } });
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          dropdownController().closeMeta();
          rerenderScope(root);
          return;
        }
        if (event.key === "Enter") {
          const activeKey = String(getSubjectsViewState().subjectMetaDropdown.activeKey || "");
          if (!activeKey) return;
          event.preventDefault();
          if (field === "relations" && String(getSubjectsViewState().subjectMetaDropdown?.relationsView || "") === "parent") {
            if (typeof setSubjectParent !== "function") return;
            await applyNonDestructiveMetaToggle(root, field, () => setSubjectParent(subjectSelection.item.id, activeKey, { root, skipRerender: true }));
            return;
          }
          if (field === "objectives") {
            await applyNonDestructiveMetaToggle(root, field, () => toggleSubjectObjective(subjectSelection.item.id, activeKey, { root, skipRerender: true }));
            return;
          }
          if (field === "situations") {
            await applyNonDestructiveMetaToggle(root, field, () => toggleSubjectSituation(subjectSelection.item.id, activeKey, { root, skipRerender: true }));
            return;
          }
          if (field === "labels") {
            await applyNonDestructiveMetaToggle(root, field, () => toggleSubjectLabel(subjectSelection.item.id, activeKey, { root, skipRerender: true }));
            return;
          }
          if (field === "assignees") {
            await applyNonDestructiveMetaToggle(root, field, () => toggleSubjectAssignee(subjectSelection.item.id, activeKey, { root, skipRerender: true }));
          }
        }
      });
    });

    dropdownHost.querySelectorAll("[data-objective-select]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        const objectiveId = String(btn.dataset.objectiveSelect || "");
        await applyNonDestructiveMetaToggle(root, "objectives", () => toggleSubjectObjective(subjectSelection.item.id, objectiveId, { root, skipRerender: true }));
      };
    });

    dropdownHost.querySelectorAll("[data-situation-toggle]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        const situationId = String(btn.dataset.situationToggle || "");
        await applyNonDestructiveMetaToggle(root, "situations", () => toggleSubjectSituation(subjectSelection.item.id, situationId, { root, skipRerender: true }));
      };
    });

    dropdownHost.querySelectorAll("[data-subject-label-toggle]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        const labelKey = String(btn.dataset.subjectLabelToggle || "");
        await applyNonDestructiveMetaToggle(root, "labels", () => toggleSubjectLabel(subjectSelection.item.id, labelKey, { root, skipRerender: true }));
      };
    });

    dropdownHost.querySelectorAll("[data-subject-assignee-toggle]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        const assigneeId = String(btn.dataset.subjectAssigneeToggle || "");
        await applyNonDestructiveMetaToggle(root, "assignees", () => toggleSubjectAssignee(subjectSelection.item.id, assigneeId, { root, skipRerender: true }));
      };
    });

    dropdownHost.querySelectorAll("[data-subject-relations-parent-entry]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        if (typeof setSubjectParent !== "function") return;
        const parentSubjectId = String(btn.dataset.subjectRelationsParentEntry || "");
        await applyNonDestructiveMetaToggle(root, "relations", () => setSubjectParent(subjectSelection.item.id, parentSubjectId, { root, skipRerender: true }));
      };
    });

    dropdownHost.querySelectorAll("[data-subject-relations-remove-parent]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        if (typeof setSubjectParent !== "function") return;
        await applyNonDestructiveMetaToggle(root, "relations", () => setSubjectParent(subjectSelection.item.id, "", { root, skipRerender: true }));
      };
    });

    dropdownHost.querySelectorAll("[data-subject-relations-open-parent]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const dropdown = getSubjectsViewState().subjectMetaDropdown || {};
        dropdown.relationsView = "parent";
        dropdown.query = "";
        dropdown.activeKey = "";
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type === "sujet") {
          const entries = getSubjectMetaMenuEntries(subjectSelection.item, "relations");
          dropdown.activeKey = String((entries.find((entry) => entry.isSelected) || entries[0] || {}).key || "");
        }
        refreshSubjectMetaDropdownUi(root, { preserveScroll: true, preserveFocus: true, focusArgs: { field: "relations" } });
      };
    });

    dropdownHost.querySelectorAll("[data-subject-relations-back]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const dropdown = getSubjectsViewState().subjectMetaDropdown || {};
        dropdown.relationsView = "menu";
        dropdown.query = "";
        dropdown.activeKey = "";
        refreshSubjectMetaDropdownUi(root, { preserveScroll: true, preserveFocus: false });
      };
    });

    dropdownHost.querySelectorAll("[data-subject-kanban-select]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(btn.dataset.subjectKanbanSubjectId || "");
        const situationId = String(btn.dataset.subjectKanbanSituationId || "");
        const nextStatus = String(btn.dataset.subjectKanbanSelect || "");
        setSujetKanbanStatus(subjectId, nextStatus, { situationId });
        dropdownController().closeKanban();
        rerenderScope(root);
      };
    });

    dropdownHost.querySelectorAll("[data-subject-meta-close]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropdownController().closeMeta();
        rerenderScope(root);
      };
    });

    dropdownHost.querySelectorAll("[data-subject-kanban-close]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropdownController().closeKanban();
        rerenderScope(root);
      };
    });
  }

  function refreshSubjectMetaDropdownUi(root, { field = "", preserveScroll = false, preserveFocus = false, focusArgs = null } = {}) {
    if (!root) return null;
    const selection = getScopedSelection(root);
    if (selection?.type === "sujet" && field && typeof renderSubjectMetaFieldValue === "function") {
      const fieldSection = root.querySelector(`[data-subject-meta-trigger="${field}"]`)?.closest?.(".subject-meta-field") || null;
      const fieldValue = fieldSection?.querySelector?.(".subject-meta-field__value") || null;
      if (fieldValue) {
        fieldValue.innerHTML = renderSubjectMetaFieldValue(selection.item, field);
        if (field === "situations") bindSubjectSituationFieldInteractions(root, fieldSection);
      }
    }

    const scrollState = preserveScroll ? dropdownController().captureContextScrollState(root) : null;
    const nextDropdownHost = renderSubjectMetaDropdownHost(root);
    bindDropdownHostInteractiveElements(root, nextDropdownHost);
    if (scrollState) dropdownController().restoreContextScrollState(scrollState);
    if (preserveFocus && focusArgs) dropdownController().focusSearch(focusArgs);
    syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
    return nextDropdownHost;
  }

  async function applyNonDestructiveMetaToggle(root, field, toggleCallback) {
    const scrollState = dropdownController().captureContextScrollState(root);
    await toggleCallback();
    refreshSubjectMetaDropdownUi(root, { field, preserveScroll: false, preserveFocus: true, focusArgs: { field } });
    dropdownController().restoreContextScrollState(scrollState);
    dropdownController().focusSearch({ field });
    syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
  }

  function bindSubjectsTabReset() {
    if (subjectsTabResetBound) return;
    subjectsTabResetBound = true;

    window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
      const detail = event?.detail || {};
      const tabId = String(detail.tabId || "");
      if (tabId !== "subjects" && tabId !== "sujets") return;

      const state = getSubjectsTabResetState();

      const activeProjectId = String(store.currentProjectId || "");
      const eventProjectId = String(detail.projectId || "");
      if (eventProjectId && activeProjectId && eventProjectId !== activeProjectId) {
        return;
      }

      const hasOverlayState = state.detailsModalOpen
        || state.drilldownOpen
        || state.subjectMetaDropdownOpen
        || state.subjectKanbanDropdownOpen;
      const hasSubviewState = state.subjectsSubview !== "subjects"
        || !!state.selectedObjectiveId
        || state.objectiveEditOpen
        || state.createSubjectFormOpen;
      const hasMainViewState = !state.showTableOnly;
      if (!state.hasConnectedRoot) {
        return;
      }

      reloadSubjectsFromSupabase(config.getSubjectsCurrentRoot?.(), {
        rerender: true,
        updateModal: true
      }).catch(() => undefined);

      if (!hasOverlayState && !hasSubviewState && !hasMainViewState) {
        return;
      }

      resetSubjectsTabView("subjects-tab-reselected");
    });
  }


  function wireDetailsInteractive(root) {
    if (!root) return;

    bindSubjectMetaDropdownDocumentEvents();
    const dropdownHost = renderSubjectMetaDropdownHost(root);
    const scopedSelection = getScopedSelection(root);
    const projectSubjectMilestones = getProjectSubjectMilestones?.();
    const setSujetKanbanStatus = getSetSujetKanbanStatus?.();
    const toggleSubjectObjective = getToggleSubjectObjective?.();
    const toggleSubjectSituation = getToggleSubjectSituation?.();
    const toggleSubjectLabel = getToggleSubjectLabel?.();
    const toggleSubjectAssignee = getToggleSubjectAssignee?.();
    const applyIssueStatusAction = getApplyIssueStatusAction?.();
    const reorderSubjectChildren = getReorderSubjectChildren?.();

    root.querySelectorAll("[data-subject-meta-trigger]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const field = String(btn.dataset.subjectMetaTrigger || "");
        const dropdown = getSubjectsViewState().subjectMetaDropdown || {};
        const isAlreadyOpen = dropdown.field === field;
        if (isAlreadyOpen) {
          dropdownController().closeMeta();
        } else {
          dropdownController().closeKanban();
          dropdownController().openMeta({ field, showClosedSituations: false });
          dropdown.relationsView = field === "relations" ? "menu" : "";
          const entries = scopedSelection?.type === "sujet" ? getSubjectMetaMenuEntries(scopedSelection.item, field) : [];
          const selectedObjectiveKey = field === "objectives" && scopedSelection?.type === "sujet"
            ? String(getSubjectSidebarMeta(scopedSelection.item.id).objectiveIds[0] || "")
            : "";
          const selectedLabelKey = field === "labels" && scopedSelection?.type === "sujet"
            ? String((getSubjectSidebarMeta(scopedSelection.item.id).labels[0] || "")).trim().toLowerCase()
            : "";
          const preferredKey = selectedObjectiveKey || selectedLabelKey;
          dropdown.activeKey = preferredKey && entries.some((entry) => String(entry?.key || "") === preferredKey)
            ? preferredKey
            : String(entries[0]?.key || "");
        }
        rerenderScope(root);
        if (!isAlreadyOpen) {
          dropdownController().focusSearch({ field });
          syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
        }
      };
    });

    root.querySelectorAll(".subject-meta-field").forEach((fieldRoot) => {
      bindSubjectSituationFieldInteractions(root, fieldRoot);
    });

    bindDropdownHostInteractiveElements(root, dropdownHost);

    syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());

    const descriptionTextarea = root.querySelector("[data-description-editor]");
    if (descriptionTextarea) {
      descriptionTextarea.addEventListener("input", () => {
        syncDescriptionEditorDraft(root);
      });
    }

    root.querySelectorAll("[data-action='edit-description']").forEach((btn) => {
      btn.onclick = () => {
        startDescriptionEdit(root);
      };
    });

    root.querySelectorAll("[data-action='cancel-description-edit']").forEach((btn) => {
      btn.onclick = () => {
        clearDescriptionEditState();
        rerenderScope(root);
      };
    });

    root.querySelectorAll("[data-action='save-description-edit']").forEach((btn) => {
      btn.onclick = async () => {
        await applyDescriptionSave(root);
      };
    });

    const commentTextarea = root.querySelector("#humanCommentBox");
    if (commentTextarea) {
      commentTextarea.addEventListener("input", () => {
        if (store.situationsView.commentPreviewMode) syncCommentPreview(root);
      });
      commentTextarea.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          applyCommentAction(root);
        }
      });

      root.querySelectorAll(".js-issue-status-action").forEach((actionRoot) => {
        if (actionRoot.dataset.issueStatusBound === "true") return;
        actionRoot.dataset.issueStatusBound = "true";

        actionRoot.addEventListener("ghaction:action", async (event) => {
          const action = String(event.detail?.action || "");
          try {
            await applyIssueStatusAction(root, action);
          } catch (error) {
            console.warn("applyIssueStatusAction failed", error);
            showError(`Action impossible : ${String(error?.message || error || "Erreur inconnue")}`);
          }
        });
      });
    }

    root.querySelectorAll("[data-action='toggle-subissues']").forEach((btn) => {
      btn.onclick = () => {
        store.situationsView.rightSubissuesOpen = !store.situationsView.rightSubissuesOpen;
        rerenderPanels();
      };
    });

    const setSubjectParent = getSetSubjectParent?.();
    const subissuesExpandedSet = (() => {
      const uiState = getSubjectsViewState();
      if (!(uiState.rightSubissuesExpandedSubjectIds instanceof Set)) {
        uiState.rightSubissuesExpandedSubjectIds = new Set(Array.isArray(uiState.rightSubissuesExpandedSubjectIds) ? uiState.rightSubissuesExpandedSubjectIds : []);
      }
      if (typeof uiState.rightSubissueMenuOpenId !== "string") uiState.rightSubissueMenuOpenId = "";
      return uiState.rightSubissuesExpandedSubjectIds;
    })();

    root.querySelectorAll("[data-subissue-tree-toggle]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(btn.dataset.subissueTreeToggle || "");
        if (!subjectId) return;
        if (subissuesExpandedSet.has(subjectId)) subissuesExpandedSet.delete(subjectId);
        else subissuesExpandedSet.add(subjectId);
        rerenderPanels();
      };
    });

    root.querySelectorAll("[data-subissue-actions-trigger]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(btn.dataset.subissueActionsTrigger || "");
        const uiState = getSubjectsViewState();
        uiState.rightSubissueMenuOpenId = String(uiState.rightSubissueMenuOpenId || "") === subjectId ? "" : subjectId;
        rerenderPanels();
      };
    });

    root.querySelectorAll("[data-subissue-remove-parent]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(btn.dataset.subissueRemoveParent || "");
        if (!subjectId || typeof setSubjectParent !== "function") return;
        await setSubjectParent(subjectId, "", { root, skipRerender: false });
        const uiState = getSubjectsViewState();
        uiState.rightSubissueMenuOpenId = "";
        subissuesExpandedSet.delete(subjectId);
        rerenderPanels();
      };
    });

    const sortableRows = Array.from(root.querySelectorAll("[data-subissue-sortable-row='true']"));
    if (sortableRows.length) {
      debugSubissuesDnd("debug-enabled", {
        scope: "wireDetailsInteractive",
        rows: sortableRows.length
      });

      let dragPreviewNode = null;
      let dragPreviewOffsetX = 0;
      let dragPreviewOffsetY = 0;
      let detachGlobalDragTracking = null;
      let draggedSubissueContext = null;

      const clearDragPreview = () => {
        const previewRoot = document.getElementById("nativeDragPreviewRoot");
        const previewCard = document.getElementById("nativeDragPreviewCard");
        if (previewRoot) previewRoot.classList.remove("is-active");
        if (previewRoot) previewRoot.style.transform = "";
        if (previewCard) {
          previewCard.textContent = "";
          previewCard.removeAttribute("data-child-subject-id");
          previewCard.removeAttribute("style");
        }
        dragPreviewNode = null;
        dragPreviewOffsetX = 0;
        dragPreviewOffsetY = 0;
        if (typeof detachGlobalDragTracking === "function") {
          detachGlobalDragTracking();
          detachGlobalDragTracking = null;
        }
      };

      const clearDragClasses = () => {
        sortableRows.forEach((row) => {
          row.classList.remove("is-subissue-dragging", "is-subissue-drag-gap", "is-subissue-drop-before", "is-subissue-drop-after");
        });
      };

      const collapseSubissueTreeForDrag = (container) => {
        const expandedSnapshot = Array.from(subissuesExpandedSet);
        subissuesExpandedSet.clear();
        if (container) {
          Array.from(container.querySelectorAll("[data-subissue-tree-row]"))
            .filter((item) => item.dataset.subissueSortableRow !== "true")
            .forEach((item) => item.remove());
        }
        return expandedSnapshot;
      };

      const restoreExpandedSubissueTreeAfterDrag = (expandedSnapshot = []) => {
        subissuesExpandedSet.clear();
        expandedSnapshot.forEach((subjectId) => {
          const key = String(subjectId || "").trim();
          if (key) subissuesExpandedSet.add(key);
        });
      };

      const resolveCssCustomProp = (styles, name, fallback = "") => {
        const rawName = String(name || "").trim();
        if (!styles || !rawName.startsWith("--")) return String(fallback || "");
        const resolved = String(styles.getPropertyValue(rawName) || "").trim();
        if (resolved) return resolved;
        return String(fallback || "");
      };

      const getNativeSubissueDragPreviewNodes = () => {
        const previewRoot = document.getElementById("nativeDragPreviewRoot");
        const previewCard = document.getElementById("nativeDragPreviewCard");
        if (!previewRoot || !previewCard) return { previewRoot: null, previewCard: null };
        return { previewRoot, previewCard };
      };

      const mountSubissueDragPreview = ({ row, rowRect, rowStyles, issuesCols, childSubjectId }) => {
        const { previewRoot, previewCard } = getNativeSubissueDragPreviewNodes();
        if (!previewRoot || !previewCard) return null;

        const previewBackgroundColor = resolveCssCustomProp(rowStyles, "--bbg", resolveCssCustomProp(rowStyles, "--bg", "#0d1117"));
        const previewBorderColor = resolveCssCustomProp(rowStyles, "--border", "rgba(139,148,158,.35)");
        const previewBorderRadius = resolveCssCustomProp(rowStyles, "--radius", "6px");
        const previewTitle = String(
          row.querySelector(".theme-text--pb")?.textContent
          || row.querySelector(".js-row-title-trigger")?.textContent
          || row.querySelector("[data-subissue-title]")?.textContent
          || row.textContent
          || ""
        ).replace(/\s+/g, " ").trim();
        const previewRowClone = row.cloneNode(true);

        previewCard.setAttribute("data-child-subject-id", childSubjectId);
        previewCard.innerHTML = "";
        previewCard.style.width = `${Math.max(1, Math.round(rowRect.width))}px`;
        if (issuesCols) previewCard.style.setProperty("--issues-cols", issuesCols);
        previewCard.style.display = "grid";
        previewCard.style.gridTemplateColumns = issuesCols || rowStyles.gridTemplateColumns;
        previewCard.style.height = "48px";
        previewCard.style.minHeight = "48px";
        previewCard.style.alignItems = "center";
        previewCard.style.boxSizing = "border-box";
        previewCard.style.overflow = "hidden";
        previewCard.style.opacity = "1";
        previewCard.style.backgroundColor = previewBackgroundColor;
        previewCard.style.borderStyle = "solid";
        previewCard.style.borderWidth = "1px";
        previewCard.style.borderColor = previewBorderColor;
        previewCard.style.borderRadius = previewBorderRadius;
        previewCard.style.boxShadow = "0 14px 36px rgba(1,4,9,.55), 0 0 0 1px rgba(1,4,9,.35)";
        previewRowClone.classList.remove("is-subissue-dragging", "is-subissue-drag-gap", "is-subissue-drop-before", "is-subissue-drop-after");
        previewRowClone.removeAttribute("draggable");
        previewRowClone.querySelectorAll("button").forEach((button) => {
          button.tabIndex = -1;
          button.setAttribute("aria-hidden", "true");
        });
        Array.from(previewRowClone.children).forEach((child) => {
          previewCard.appendChild(child.cloneNode(true));
        });
        const previewPaintRect = previewCard.getBoundingClientRect();

        debugSubissuesDnd("dragstart-preview", {
          rowRect: {
            width: rowRect.width,
            height: rowRect.height
          },
          previewPaintRect: {
            width: previewPaintRect.width,
            height: previewPaintRect.height
          },
          issuesCols,
          rowGridTemplateColumns: rowStyles.gridTemplateColumns,
          previewInline: {
            width: previewCard.style.width,
            display: previewCard.style.display,
            gridTemplateColumns: previewCard.style.gridTemplateColumns,
            backgroundColor: previewCard.style.backgroundColor,
            borderStyle: previewCard.style.borderStyle,
            borderWidth: previewCard.style.borderWidth,
            borderColor: previewCard.style.borderColor,
            borderRadius: previewCard.style.borderRadius,
            boxShadow: previewCard.style.boxShadow,
            opacity: previewCard.style.opacity
          }
        });

        return previewCard;
      };

      const moveSubissueDragPreview = (clientX, clientY) => {
        const { previewRoot } = getNativeSubissueDragPreviewNodes();
        if (!previewRoot || !previewRoot.classList.contains("is-active")) return;
        const x = Math.round(Number(clientX || 0) - dragPreviewOffsetX);
        const y = Math.round(Number(clientY || 0) - dragPreviewOffsetY);
        previewRoot.style.transform = `translate(${x}px, ${y}px)`;
      };

      const isInsideSortableSubissuesContainer = (target, container) => {
        if (!target || !container) return false;
        return target === container || container.contains(target);
      };

      const startGlobalSubissueDragTracking = () => {
        if (typeof detachGlobalDragTracking === "function") return;

        const onDocumentDragOver = (event) => {
          const draggingRow = root.querySelector(".is-subissue-dragging");
          if (!draggingRow) return;
          moveSubissueDragPreview(event.clientX, event.clientY);
          const container = draggingRow.parentElement;
          const inContainer = isInsideSortableSubissuesContainer(event.target, container);
          if (!inContainer) {
            if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
            return;
          }
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        };

        const stop = () => {
          document.removeEventListener("dragover", onDocumentDragOver, true);
          detachGlobalDragTracking = null;
        };

        document.addEventListener("dragover", onDocumentDragOver, true);
        detachGlobalDragTracking = stop;
      };

      const createSubissueDragCanvasPreview = ({ rowRect, rowStyles, title }) => {
        const width = Math.max(1, Math.round(rowRect.width));
        const height = Math.max(36, Math.round(rowRect.height));
        const dpr = Math.max(1, Number(window.devicePixelRatio || 1));
        const previewBackgroundColor = resolveCssCustomProp(rowStyles, "--bbg", resolveCssCustomProp(rowStyles, "--bg", "#0d1117"));
        const previewBorderColor = resolveCssCustomProp(rowStyles, "--border", "rgba(139,148,158,.35)");
        const previewTextColor = resolveCssCustomProp(rowStyles, "--text", "#e6edf3");
        const previewRadius = Number.parseFloat(resolveCssCustomProp(rowStyles, "--radius", "6")) || 6;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.scale(dpr, dpr);

        const drawRoundedRectPath = (x, y, w, h, r) => {
          const radius = Math.max(0, Math.min(r, w / 2, h / 2));
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + w, y, x + w, y + h, radius);
          ctx.arcTo(x + w, y + h, x, y + h, radius);
          ctx.arcTo(x, y + h, x, y, radius);
          ctx.arcTo(x, y, x + w, y, radius);
          ctx.closePath();
        };

        drawRoundedRectPath(0.5, 0.5, width - 1, height - 1, previewRadius);
        ctx.fillStyle = previewBackgroundColor;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = previewBorderColor;
        ctx.stroke();
        ctx.fillStyle = previewTextColor;
        ctx.font = `500 13px ${String(rowStyles.fontFamily || "system-ui, sans-serif")}`;
        ctx.textBaseline = "middle";
        const safeTitle = String(title || "").trim() || "Sous-sujet";
        const textX = 12;
        const textY = Math.round(height / 2);
        ctx.fillText(safeTitle, textX, textY, Math.max(0, width - textX - 12));
        return canvas;
      };

      const animateSubissueRowReflow = (container, mutateDom) => {
        if (!container || typeof mutateDom !== "function") return;
        const rowsBefore = Array.from(container.querySelectorAll("[data-subissue-sortable-row='true']"));
        const beforeTopByRow = new Map(rowsBefore.map((item) => [item, item.getBoundingClientRect().top]));
        mutateDom();
        const rowsAfter = Array.from(container.querySelectorAll("[data-subissue-sortable-row='true']"));
        rowsAfter.forEach((item) => {
          const beforeTop = beforeTopByRow.get(item);
          if (typeof beforeTop !== "number") return;
          const afterTop = item.getBoundingClientRect().top;
          const delta = beforeTop - afterTop;
          if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) return;
          item.style.transition = "none";
          item.style.transform = `translateY(${delta}px)`;
          requestAnimationFrame(() => {
            item.style.transition = "transform .18s ease";
            item.style.transform = "";
            const clearInlineTransition = () => {
              item.style.transition = "";
            };
            item.addEventListener("transitionend", clearInlineTransition, { once: true });
          });
        });
      };

      sortableRows.forEach((row) => {
        row.addEventListener("pointerdown", (event) => {
          row.dataset.subissueDragFromHandle = event.target?.closest?.("[data-subissue-drag-handle]") ? "true" : "false";
        });

        row.addEventListener("dragstart", (event) => {
          const dragFromHandle = row.dataset.subissueDragFromHandle === "true";
          row.dataset.subissueDragFromHandle = "false";
          if (!dragFromHandle) {
            event.preventDefault();
            return;
          }

          const childSubjectId = String(row.dataset.childSubjectId || "");
          if (!childSubjectId) {
            event.preventDefault();
            return;
          }
          const container = row.parentElement;
          const expandedSnapshot = collapseSubissueTreeForDrag(container);
          draggedSubissueContext = {
            childSubjectId,
            expandedSnapshot,
            dropCommitted: false
          };
          const uiState = getSubjectsViewState();
          uiState.rightSubissueMenuOpenId = "";
          event.dataTransfer?.setData("text/plain", childSubjectId);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";

          const rowRect = row.getBoundingClientRect();
          const rowStyles = window.getComputedStyle(row);
          const issuesCols = String(rowStyles.getPropertyValue("--issues-cols") || "").trim();
          dragPreviewNode = mountSubissueDragPreview({
            row,
            rowRect,
            rowStyles,
            issuesCols,
            childSubjectId
          });
          const canvasDragPreview = createSubissueDragCanvasPreview({
            rowRect,
            rowStyles,
            title: dragPreviewNode?.textContent || ""
          });
          if (event.dataTransfer) {
            const offsetX = Math.max(0, Math.round(event.clientX - rowRect.left));
            const offsetY = Math.max(0, Math.round(event.clientY - rowRect.top));
            dragPreviewOffsetX = offsetX;
            dragPreviewOffsetY = offsetY;
            if (!canvasDragPreview && dragPreviewNode) {
              const previewRoot = document.getElementById("nativeDragPreviewRoot");
              if (previewRoot) previewRoot.classList.add("is-active");
              dragPreviewNode.getBoundingClientRect();
            }
            const dragImageNode = canvasDragPreview || dragPreviewNode || row;
            event.dataTransfer.setDragImage(dragImageNode, offsetX, offsetY);
            debugSubissuesDnd("dragstart-setDragImage", {
              offsetX,
              offsetY,
              hasNativePreview: !!dragPreviewNode,
              dragImageKind: canvasDragPreview ? "canvas" : (dragPreviewNode ? "dom" : "row"),
              usesVisibleDomPreviewHost: !canvasDragPreview && !!dragPreviewNode
            });
          }
          const previewRoot = document.getElementById("nativeDragPreviewRoot");
          if (previewRoot && dragPreviewNode) {
            previewRoot.classList.add("is-active");
            moveSubissueDragPreview(event.clientX, event.clientY);
          }
          startGlobalSubissueDragTracking();
          row.classList.add("is-subissue-dragging", "is-subissue-drag-gap");
        });

        row.addEventListener("dragover", (event) => {
          const draggingRow = root.querySelector(".is-subissue-dragging");
          if (!draggingRow || draggingRow === row) return;
          event.preventDefault();
          moveSubissueDragPreview(event.clientX, event.clientY);

          const container = row.parentElement;
          if (!container || draggingRow.parentElement !== container) return;
          const rect = row.getBoundingClientRect();
          const insertAfter = event.clientY >= (rect.top + rect.height / 2);
          if (insertAfter) {
            if (row.nextElementSibling === draggingRow) return;
            animateSubissueRowReflow(container, () => {
              container.insertBefore(draggingRow, row.nextElementSibling);
            });
            debugSubissuesDnd("dragover-move-gap", {
              childSubjectId: String(row.dataset.childSubjectId || ""),
              insertAfter: true
            });
            return;
          }
          if (row.previousElementSibling === draggingRow) return;
          animateSubissueRowReflow(container, () => {
            container.insertBefore(draggingRow, row);
          });
          debugSubissuesDnd("dragover-move-gap", {
            childSubjectId: String(row.dataset.childSubjectId || ""),
            insertAfter: false
          });
        });

        row.addEventListener("drop", async (event) => {
          const draggingRow = root.querySelector(".is-subissue-dragging");
          if (!draggingRow || draggingRow === row) return;
          event.preventDefault();

          const parentSubjectId = String(row.dataset.parentSubjectId || "");
          if (!parentSubjectId || typeof reorderSubjectChildren !== "function") {
            debugSubissuesDnd("drop aborted: reorder unavailable", {
              parentSubjectId,
              hasReorderHandler: typeof reorderSubjectChildren === "function"
            });
            clearDragClasses();
            clearDragPreview();
            return;
          }

          const container = row.parentElement;
          if (!container) {
            clearDragClasses();
            return;
          }
          const sourceId = String(draggingRow.dataset.childSubjectId || "");
          const targetId = String(row.dataset.childSubjectId || "");
          if (!sourceId || !targetId || sourceId === targetId) {
            debugSubissuesDnd("drop aborted: invalid source/target ids", { sourceId, targetId });
            clearDragClasses();
            clearDragPreview();
            return;
          }

          const orderedChildIds = Array.from(container.querySelectorAll("[data-subissue-sortable-row='true']"))
            .map((item) => String(item.dataset.childSubjectId || ""))
            .filter(Boolean);
          debugSubissuesDnd("drop-reorder", { parentSubjectId, sourceId, targetId, orderedChildIds });
          restoreExpandedSubissueTreeAfterDrag(draggedSubissueContext?.expandedSnapshot || []);
          await reorderSubjectChildren(parentSubjectId, orderedChildIds, { root, skipRerender: false });
          if (draggedSubissueContext) draggedSubissueContext.dropCommitted = true;
          draggedSubissueContext = null;
          clearDragClasses();
          clearDragPreview();
        });

        row.addEventListener("dragend", async () => {
          const dndContext = draggedSubissueContext;
          const shouldCommitOrderOnDragEnd = dndContext && !dndContext.dropCommitted;
          restoreExpandedSubissueTreeAfterDrag(dndContext?.expandedSnapshot || []);
          if (shouldCommitOrderOnDragEnd) {
            const container = row.parentElement;
            const parentSubjectId = String(row.dataset.parentSubjectId || "");
            const orderedChildIds = Array.from(container?.querySelectorAll?.("[data-subissue-sortable-row='true']") || [])
              .map((item) => String(item.dataset.childSubjectId || ""))
              .filter(Boolean);
            if (parentSubjectId && orderedChildIds.length && typeof reorderSubjectChildren === "function") {
              await reorderSubjectChildren(parentSubjectId, orderedChildIds, { root, skipRerender: false });
            } else {
              rerenderPanels();
            }
          }
          draggedSubissueContext = null;
          clearDragClasses();
          clearDragPreview();
          row.dataset.subissueDragFromHandle = "false";
        });
      });
    }

    const isDrilldownScope = !!root.closest?.("#drilldownPanel");
    root.querySelectorAll(".js-sub-right-toggle-sujet, .js-modal-toggle-sujet, .js-drilldown-toggle-sujet").forEach((btn) => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        const sujetId = String(btn.dataset.sujetId || "");
        if (!sujetId) return;
        const expandedSet = isDrilldownScope ? store.situationsView.drilldown.expandedSujets : store.situationsView.rightExpandedSujets;
        if (expandedSet.has(sujetId)) expandedSet.delete(sujetId);
        else expandedSet.add(sujetId);
        if (isDrilldownScope) updateDrilldownPanel();
        else rerenderPanels();
      };
    });

    root.querySelectorAll(".js-sub-right-select-sujet").forEach((btn) => {
      btn.onclick = () => {
        const sujetId = String(btn.dataset.sujetId || "");
        if (sujetId) selectSujet(sujetId);
      };
    });

    root.querySelectorAll(".js-modal-drilldown-sujet, .js-drilldown-select-sujet").forEach((btn) => {
      btn.onclick = () => {
        const sujetId = String(btn.dataset.sujetId || "");
        if (sujetId) (openDrilldownFromSubjectPanel || openDrilldownFromSujetPanel)(sujetId);
      };
    });

    root.querySelectorAll("[data-parent-subject-id]").forEach((card) => {
      card.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const parentSubjectId = String(card.dataset.parentSubjectId || "");
        if (parentSubjectId) (openDrilldownFromSubjectPanel || openDrilldownFromSujetPanel)(parentSubjectId);
      };
    });

    root.querySelectorAll("[data-action='tab-write']").forEach((btn) => {
      btn.onclick = () => {
        store.situationsView.commentPreviewMode = false;
        rerenderPanels();
      };
    });

    root.querySelectorAll("[data-action='tab-preview']").forEach((btn) => {
      btn.onclick = () => {
        store.situationsView.commentPreviewMode = true;
        rerenderPanels();
      };
    });

    root.querySelectorAll("[data-action='toggle-help']").forEach((btn) => {
      btn.onclick = () => {
        store.situationsView.helpMode = !store.situationsView.helpMode;
        rerenderPanels();
      };
    });

    root.querySelectorAll("[data-action='add-comment']").forEach((btn) => {
      btn.onclick = async () => {
        await applyCommentAction(root);
      };
    });

    root.querySelectorAll("[data-subject-assign-self]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const subjectIdFromButton = String(btn.dataset.subjectAssignSelf || "").trim();
        const selection = getScopedSelection(root);
        const subjectIdFromSelection = selection?.type === "sujet"
          ? String(selection?.item?.id || "").trim()
          : "";
        const subjectId = subjectIdFromButton || subjectIdFromSelection;

        if (!subjectId) {
          showError("Impossible d'identifier le sujet à assigner.");
          return;
        }

        const selfAssigneeId = await resolveSelfCollaboratorAssigneeId();
        if (!selfAssigneeId) {
          showError("Votre profil n'est pas présent dans la liste des collaborateurs du projet.");
          traceAssignSelf("abort_missing_assignee");
          return;
        }
        const meta = getSubjectSidebarMeta(subjectId);
        const alreadyAssigned = Array.isArray(meta.assignees) && meta.assignees.some((id) => String(id || "") === selfAssigneeId);
        if (alreadyAssigned) return;
        if (typeof toggleSubjectAssignee !== "function") {
          showError("Action indisponible: gestionnaire d'assignation introuvable.");
          return;
        }
        try {
          await toggleSubjectAssignee(subjectId, selfAssigneeId, { root, skipRerender: false });
        } catch (error) {
          showError(`Mise à jour des assignés impossible : ${String(error?.message || error || "Erreur inconnue")}`);
        }
      };
    });

  }

  function bindCondensedTitleScroll(scrollEl, classHost, key, options = {}) {
    bindOverlayChromeCompact(scrollEl, classHost, key, options);
  }

  function bindDetailsScroll(root) {
    const normalDetailsHead = root.querySelector("#situationsDetailsTitle");
    const normalDetailsChrome = root.querySelector("#situationsDetailsChrome");
    bindCondensedTitleScroll(
      normalDetailsHead ? document : root.querySelector("#situationsDetailsHost"),
      normalDetailsChrome || normalDetailsHead,
      "details",
      {
        onCompactChange(scrolled) {
          document.body.classList.toggle("project-subject-details-top-compact", !!scrolled);
        }
      }
    );

    bindCondensedTitleScroll(
      document.getElementById("detailsBodyModal"),
      document.querySelector("#detailsModal .modal__inner"),
      "modal"
    );

    bindCondensedTitleScroll(
      document.querySelector("#drilldownPanel .drilldown__inner"),
      document.querySelector("#drilldownPanel .drilldown__inner"),
      "drilldown"
    );
  }

  function bindSituationsEvents(root, headerRoot) {
    if (root?.dataset?.subjectsEventsBound === "1") return;
    if (root?.dataset) root.dataset.subjectsEventsBound = "1";
    const toolbarRoot = document.getElementById("situationsToolbarHost");
    const projectSubjectMilestones = getProjectSubjectMilestones?.();
    const projectSubjectLabels = config.getProjectSubjectLabels?.();

    const getLabelsUiState = () => projectSubjectLabels?.getLabelsUiState?.() || {};
    const closeLabelsMenus = () => {
      const labelsState = getLabelsUiState();
      labelsState.labelsSortMenuOpen = false;
      labelsState.labelsRowMenuOpen = "";
      if (labelsState.labelEditModal && typeof labelsState.labelEditModal === "object") {
        labelsState.labelEditModal.colorPickerOpen = false;
      }
    };
    const openLabelModal = (mode = "edit", labelKey = "") => {
      const labelsState = getLabelsUiState();
      const labelDef = labelKey ? projectSubjectLabels?.getSubjectLabelDefinition?.(labelKey) : null;
      labelsState.labelEditModal = {
        isOpen: true,
        mode,
        targetId: String(labelDef?.id || ""),
        targetKey: labelDef?.key || "",
        name: String(labelDef?.label || ""),
        description: String(labelDef?.description || ""),
        color: String(labelDef?.hexColor || "#8b949e"),
        colorPickerOpen: false
      };
      labelsState.labelsSortMenuOpen = false;
      labelsState.labelsRowMenuOpen = "";
    };

    toolbarRoot?.addEventListener("input", (event) => {
      const searchInput = event.target.closest?.("#situationsSearch");
      if (!searchInput) return;
      store.situationsView.search = String(searchInput.value || "");
      rerenderPanels();
    });

    root.addEventListener("input", (event) => {
      const labelsSearchInput = event.target.closest?.("#labelsSearchInput");
      if (labelsSearchInput) {
        const labelsState = getLabelsUiState();
        labelsState.labelsSearch = String(labelsSearchInput.value || "");
        rerenderPanels();
        return;
      }
      const labelModalInput = event.target.closest?.("[data-label-modal-input]");
      if (labelModalInput) {
        const labelsState = getLabelsUiState();
        const modal = labelsState.labelEditModal || {};
        const field = String(labelModalInput.dataset.labelModalInput || "");
        modal[field] = String(labelModalInput.value || "");
        labelsState.labelEditModal = modal;
      }
    });
    root.addEventListener("focusin", (event) => {
      const colorInput = event.target.closest?.(".labels-modal__color-input");
      if (!colorInput) return;
      const labelsState = getLabelsUiState();
      if (labelsState.labelEditModal && typeof labelsState.labelEditModal === "object" && !labelsState.labelEditModal.colorPickerOpen) {
        labelsState.labelEditModal.colorPickerOpen = true;
        rerenderPanels();
      }
    });

    const handleSubjectsGhAction = (event) => {
      const action = String(event.detail?.action || "");
      if (!action) return;
      if (action === "add-sujet") {
        event.preventDefault();
        openCreateSubjectForm();
        rerenderPanels();
        return;
      }
      if (projectSubjectMilestones?.handleToolbarAction(action, event)) {
        return;
      }

      if (action === "add-label") {
        event.preventDefault();
        openLabelModal("create");
        rerenderPanels();
        return;
      }
      if (action === "open-labels") {
        event.preventDefault();
        resetObjectiveEditState();
        store.situationsView.subjectsSubview = "labels";
        store.situationsView.selectedObjectiveId = "";
        store.situationsView.showTableOnly = true;
        rerenderPanels();
      }
    };

    toolbarRoot?.addEventListener("ghaction:action", handleSubjectsGhAction);
    root.addEventListener("ghaction:action", handleSubjectsGhAction);

    toolbarRoot?.addEventListener("click", (event) => {
      if (projectSubjectMilestones?.handleToolbarClick(event)) {
        return;
      }
    });

    document.addEventListener("click", (event) => {
      if (String(store.situationsView.subjectsSubview || "subjects") !== "labels") return;
      if (event.target.closest(".labels-sort-menu") || event.target.closest(".labels-row-menu") || event.target.closest(".labels-modal__color-input-wrap") || event.target.closest("#labelsEditModal")) {
        return;
      }
      const labelsState = getLabelsUiState();
      if (!labelsState.labelsSortMenuOpen && !labelsState.labelsRowMenuOpen && !(labelsState.labelEditModal && labelsState.labelEditModal.colorPickerOpen)) return;
      closeLabelsMenus();
      rerenderPanels();
    });

    syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());

    root.addEventListener("click", (event) => {
      const closeLabelModalButton = event.target.closest("[data-close-label-modal]");
      if (closeLabelModalButton) {
        event.preventDefault();
        const labelsState = getLabelsUiState();
        if (labelsState.labelEditModal && typeof labelsState.labelEditModal === "object") {
          labelsState.labelEditModal.isOpen = false;
          labelsState.labelEditModal.colorPickerOpen = false;
        }
        rerenderPanels();
        return;
      }

      const labelsSortToggle = event.target.closest("[data-labels-sort-toggle]");
      if (labelsSortToggle) {
        event.preventDefault();
        const labelsState = getLabelsUiState();
        labelsState.labelsSortMenuOpen = !labelsState.labelsSortMenuOpen;
        labelsState.labelsRowMenuOpen = "";
        rerenderPanels();
        return;
      }

      const labelsSortByButton = event.target.closest("[data-labels-sort-by]");
      if (labelsSortByButton) {
        event.preventDefault();
        const labelsState = getLabelsUiState();
        labelsState.labelsSortBy = String(labelsSortByButton.dataset.labelsSortBy || "name");
        labelsState.labelsSortMenuOpen = false;
        rerenderPanels();
        return;
      }

      const labelsSortDirectionButton = event.target.closest("[data-labels-sort-direction]");
      if (labelsSortDirectionButton) {
        event.preventDefault();
        const labelsState = getLabelsUiState();
        labelsState.labelsSortDirection = String(labelsSortDirectionButton.dataset.labelsSortDirection || "asc");
        labelsState.labelsSortMenuOpen = false;
        rerenderPanels();
        return;
      }

      const labelColorResetButton = event.target.closest("[data-label-color-reset]");
      if (labelColorResetButton) {
        event.preventDefault();
        const labelsState = getLabelsUiState();
        if (labelsState.labelEditModal && typeof labelsState.labelEditModal === "object") {
          labelsState.labelEditModal.color = "#8b949e";
          labelsState.labelEditModal.colorPickerOpen = false;
        }
        rerenderPanels();
        return;
      }

      const labelRowMenuToggle = event.target.closest("[data-label-row-menu-toggle]");
      if (labelRowMenuToggle) {
        event.preventDefault();
        const labelsState = getLabelsUiState();
        const key = String(labelRowMenuToggle.dataset.labelRowMenuToggle || "");
        labelsState.labelsRowMenuOpen = String(labelsState.labelsRowMenuOpen || "") === key ? "" : key;
        labelsState.labelsSortMenuOpen = false;
        rerenderPanels();
        return;
      }

      const labelEditButton = event.target.closest("[data-label-edit]");
      if (labelEditButton) {
        event.preventDefault();
        openLabelModal("edit", String(labelEditButton.dataset.labelEdit || ""));
        rerenderPanels();
        return;
      }

      const labelDeleteButton = event.target.closest("[data-label-delete]");
      if (labelDeleteButton) {
        event.preventDefault();
        projectSubjectLabels?.deleteLabelFromModal?.(String(labelDeleteButton.dataset.labelDelete || ""))
          .then(() => {
            rerenderPanels();
          })
          .catch((error) => {
            showError(`Suppression du label impossible : ${String(error?.message || error || "Erreur inconnue")}`);
            rerenderPanels();
          });
        return;
      }

      const labelModalSaveButton = event.target.closest("[data-label-modal-save]");
      if (labelModalSaveButton) {
        event.preventDefault();
        projectSubjectLabels?.saveLabelFromModal?.()
          .then(() => {
            rerenderPanels();
          })
          .catch((error) => {
            showError(`Enregistrement du label impossible : ${String(error?.message || error || "Erreur inconnue")}`);
            rerenderPanels();
          });
        rerenderPanels();
        return;
      }

      const labelModalDeleteButton = event.target.closest("[data-label-modal-delete]");
      if (labelModalDeleteButton) {
        event.preventDefault();
        projectSubjectLabels?.deleteLabelFromModal?.()
          .then(() => {
            rerenderPanels();
          })
          .catch((error) => {
            showError(`Suppression du label impossible : ${String(error?.message || error || "Erreur inconnue")}`);
            rerenderPanels();
          });
        rerenderPanels();
        return;
      }

      const labelColorValueButton = event.target.closest("[data-label-color-value]");
      if (labelColorValueButton) {
        event.preventDefault();
        const labelsState = getLabelsUiState();
        if (labelsState.labelEditModal && typeof labelsState.labelEditModal === "object") {
          labelsState.labelEditModal.color = String(labelColorValueButton.dataset.labelColorValue || "#8b949e");
          labelsState.labelEditModal.colorPickerOpen = false;
        }
        rerenderPanels();
        return;
      }

      const createSubjectTabButton = event.target.closest("[data-create-subject-tab]");
      if (createSubjectTabButton && store.situationsView.createSubjectForm?.isOpen) {
        event.preventDefault();
        store.situationsView.createSubjectForm.previewMode = String(createSubjectTabButton.dataset.createSubjectTab || "write") === "preview";
        rerenderPanels();
        return;
      }

      const createSubjectCancelButton = event.target.closest("[data-create-subject-cancel]");
      if (createSubjectCancelButton && store.situationsView.createSubjectForm?.isOpen) {
        event.preventDefault();
        dropdownController().closeMeta();
        resetCreateSubjectForm({ keepCreateMore: true });
        rerenderPanels();
        return;
      }

      const createSubjectSubmitButton = event.target.closest("[data-create-subject-submit]");
      if (createSubjectSubmitButton && store.situationsView.createSubjectForm?.isOpen) {
        event.preventDefault();
        const result = createSubjectFromDraft();
        if (!result.ok) {
          rerenderPanels();
          return;
        }
        const keepCreateMore = !!store.situationsView.createSubjectForm?.createMore;
        if (keepCreateMore) {
          openCreateSubjectForm();
        } else {
          resetCreateSubjectForm({ keepCreateMore: true });
        }
        rerenderPanels();
        return;
      }

      if (projectSubjectMilestones?.handleRootClick(event)) {
        return;
      }

      const subjectsStatusFilterButton = event.target.closest("[data-subjects-status-filter]");
      if (subjectsStatusFilterButton) {
        event.preventDefault();
        store.situationsView.subjectsStatusFilter = String(subjectsStatusFilterButton.dataset.subjectsStatusFilter || "open").toLowerCase() === "closed" ? "closed" : "open";
        rerenderPanels();
        return;
      }

      const subjectsPriorityBtn = event.target.closest("#subjectsPriorityHeadBtn");
      if (subjectsPriorityBtn) {
        event.preventDefault();
        event.stopPropagation();

        const currentBtn = root.querySelector("#subjectsPriorityHeadBtn");
        const currentDropdown = root.querySelector("#subjectsPriorityHeadDropdown");
        if (!currentBtn || !currentDropdown) return;

        const isOpen = currentDropdown.classList.contains("gh-menu--open");
        currentDropdown.classList.toggle("gh-menu--open", !isOpen);
        currentBtn.setAttribute("aria-expanded", String(!isOpen));
        return;
      }

      const subjectsPriorityItem = event.target.closest("#subjectsPriorityHeadDropdown [data-subjects-priority-filter]");
      if (subjectsPriorityItem) {
        event.preventDefault();
        event.stopPropagation();

        store.situationsView.subjectsPriorityFilter = normalizeBackendPriority(subjectsPriorityItem.dataset.subjectsPriorityFilter || "");

        const currentBtn = root.querySelector("#subjectsPriorityHeadBtn");
        const currentDropdown = root.querySelector("#subjectsPriorityHeadDropdown");
        if (currentDropdown) currentDropdown.classList.remove("gh-menu--open");
        if (currentBtn) currentBtn.setAttribute("aria-expanded", "false");

        rerenderPanels();
        return;
      }



      const subjectsPriorityDropdown = root.querySelector("#subjectsPriorityHeadDropdown");
      const subjectsPriorityCurrentBtn = root.querySelector("#subjectsPriorityHeadBtn");

      if (
        subjectsPriorityDropdown
        && subjectsPriorityCurrentBtn
        && !event.target.closest("#subjectsPriorityHeadBtn")
        && !event.target.closest("#subjectsPriorityHeadDropdown")
      ) {
        subjectsPriorityDropdown.classList.remove("gh-menu--open");
        subjectsPriorityCurrentBtn.setAttribute("aria-expanded", "false");
      }


      const toggleSituation = event.target.closest(".js-toggle-situation");
      if (toggleSituation) {
        event.preventDefault();
        event.stopPropagation();
        const situationId = String(toggleSituation.dataset.situationId || "");
        if (store.situationsView.expandedSituations.has(situationId)) {
          store.situationsView.expandedSituations.delete(situationId);
        } else {
          store.situationsView.expandedSituations.add(situationId);
        }
        rerenderPanels();
        return;
      }

      const toggleSujet = event.target.closest(".js-toggle-sujet");
      if (toggleSujet) {
        event.preventDefault();
        event.stopPropagation();
        const sujetId = String(toggleSujet.dataset.sujetId || "");
        if (store.situationsView.expandedSujets.has(sujetId)) {
          store.situationsView.expandedSujets.delete(sujetId);
        } else {
          store.situationsView.expandedSujets.add(sujetId);
        }
        rerenderPanels();
        return;
      }

      const objectiveLink = event.target.closest("[data-row-objective-id]");
      if (objectiveLink) {
        event.preventDefault();
        event.stopPropagation();
        const objectiveId = String(objectiveLink.dataset.rowObjectiveId || "");
        if (objectiveId) {
          resetObjectiveEditState();
          store.situationsView.subjectsSubview = "objectives";
          store.situationsView.selectedObjectiveId = objectiveId;
          store.situationsView.showTableOnly = true;
          rerenderPanels();
          return;
        }
      }

      const backToSubjectsTable = event.target.closest("[data-subjects-back='table']");
      if (backToSubjectsTable) {
        event.preventDefault();
        store.situationsView.showTableOnly = true;
        rerenderPanels();
        const restoreY = Number(store.projectSubjectsView?.tableScrollRestoreY || store.situationsView?.tableScrollRestoreY || 0);
        requestAnimationFrame(() => {
          window.scrollTo({ top: Math.max(0, restoreY), behavior: "auto" });
        });
        return;
      }

      const parentSubjectCard = event.target.closest("[data-parent-subject-id]");
      if (parentSubjectCard) {
        event.preventDefault();
        event.stopPropagation();
        const parentSubjectId = String(parentSubjectCard.dataset.parentSubjectId || "");
        if (parentSubjectId) {
          (openDrilldownFromSubjectPanel || openDrilldownFromSujetPanel)(parentSubjectId);
        }
        return;
      }

      const titleTrigger = event.target.closest(".js-row-title-trigger");
      if (titleTrigger) {
        event.preventDefault();
        const entityType = String(titleTrigger.dataset.rowEntityType || "");
        const entityId = String(titleTrigger.dataset.rowEntityId || "");
        if (entityType === "sujet") {
          (selectSubject || selectSujet)(entityId);
          return;
        }
        if (entityType === "situation") {
          selectSituation(entityId);
          return;
        }
      }
    });

    root.addEventListener("input", (event) => {
      const createSubjectTitle = event.target.closest?.("[data-create-subject-title]");
      if (createSubjectTitle && store.situationsView.createSubjectForm?.isOpen) {
        store.situationsView.createSubjectForm.title = String(createSubjectTitle.value || "");
        store.situationsView.createSubjectForm.validationError = "";
        return;
      }
      const createSubjectDescription = event.target.closest?.("[data-create-subject-description]");
      if (createSubjectDescription && store.situationsView.createSubjectForm?.isOpen) {
        store.situationsView.createSubjectForm.description = String(createSubjectDescription.value || "");
        if (store.situationsView.createSubjectForm.previewMode) rerenderPanels();
        return;
      }
      const createSubjectCreateMore = event.target.closest?.("[data-create-subject-create-more]");
      if (createSubjectCreateMore && store.situationsView.createSubjectForm?.isOpen) {
        store.situationsView.createSubjectForm.createMore = !!createSubjectCreateMore.checked;
        return;
      }
      if (projectSubjectMilestones?.handleRootInput(event)) {
        return;
      }
    });

    projectSubjectMilestones?.bindGlobalEvents();
  }

  return {
    bindSubjectMetaDropdownDocumentEvents,
    detachSubjectMetaDropdownDocumentEvents,
    resetSubjectsTabView,
    bindSubjectsTabReset,
    wireDetailsInteractive,
    bindCondensedTitleScroll,
    bindDetailsScroll,
    bindSituationsEvents
  };
}
