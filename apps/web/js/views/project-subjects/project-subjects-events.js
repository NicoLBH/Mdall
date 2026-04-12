export function createProjectSubjectsEvents(config) {
  const {
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
    getSetSujetKanbanStatus,
    setSubjectMetaActiveEntry,
    getToggleSubjectObjective,
    getToggleSubjectSituation,
    getToggleSubjectLabel,
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
    getProjectSubjectMilestones
  } = config;

  let subjectMetaDropdownDocumentBound = false;
  let modalEventsBound = false;
  let subjectsTabResetBound = false;

  function bindSubjectMetaDropdownDocumentEvents() {
    if (subjectMetaDropdownDocumentBound) return;
    subjectMetaDropdownDocumentBound = true;

    document.addEventListener("click", (event) => {
      const state = getSubjectsViewState();
      const hasMetaOpen = !!state.subjectMetaDropdown?.field;
      const hasKanbanOpen = !!state.subjectKanbanDropdown?.subjectId && !!state.subjectKanbanDropdown?.situationId;
      if (!hasMetaOpen && !hasKanbanOpen) return;
      if (event.target.closest("#subjectMetaDropdownHost .subject-meta-dropdown")) return;
      if (event.target.closest("[data-subject-meta-trigger]")) return;
      if (event.target.closest("[data-subject-kanban-trigger]")) return;
      closeSubjectMetaDropdown();
      closeSubjectKanbanDropdown();
      rerenderScope();
    });

    window.addEventListener("resize", () => {
      const state = getSubjectsViewState();
      if (!state.subjectMetaDropdown?.field && !(state.subjectKanbanDropdown?.subjectId && state.subjectKanbanDropdown?.situationId)) return;
      syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
    });

    document.addEventListener("scroll", () => {
      const state = getSubjectsViewState();
      if (!state.subjectMetaDropdown?.field && !(state.subjectKanbanDropdown?.subjectId && state.subjectKanbanDropdown?.situationId)) return;
      syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
    }, true);
  }

  function resetSubjectsTabView(reason = "manual") {
    resetSubjectsViewTransientState();

    closeSubjectMetaDropdown();
    closeSubjectKanbanDropdown();
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
    const applyIssueStatusAction = getApplyIssueStatusAction?.();

    root.querySelectorAll("[data-subject-meta-trigger]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const field = String(btn.dataset.subjectMetaTrigger || "");
        const dropdown = getSubjectsViewState().subjectMetaDropdown || {};
        const isAlreadyOpen = dropdown.field === field;
        if (isAlreadyOpen) {
          closeSubjectMetaDropdown();
        } else {
          closeSubjectKanbanDropdown();
          dropdown.field = field;
          dropdown.query = "";
          dropdown.showClosedSituations = false;
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
          focusSubjectMetaSearch(root, field);
          syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
        }
      };
    });

    root.querySelectorAll("[data-subject-situations-closed-toggle]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const dropdownState = getSubjectsViewState().subjectMetaDropdown || {};
        dropdownState.showClosedSituations = !dropdownState.showClosedSituations;
        rerenderScope(root);
      };
    });

    root.querySelectorAll("[data-subject-kanban-trigger]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(btn.dataset.subjectKanbanTrigger || "");
        const situationId = String(btn.dataset.subjectKanbanSituationId || "");
        const dropdown = getSubjectsViewState().subjectKanbanDropdown || {};
        const isAlreadyOpen = String(dropdown.subjectId || "") === subjectId && String(dropdown.situationId || "") === situationId;
        if (isAlreadyOpen) {
          closeSubjectKanbanDropdown();
        } else {
          closeSubjectMetaDropdown();
          dropdown.subjectId = subjectId;
          dropdown.situationId = situationId;
          dropdown.query = "";
          const entries = getSubjectKanbanMenuEntries(subjectId, situationId, "");
          dropdown.activeKey = String((entries.find((entry) => entry.isSelected) || entries[0] || {}).key || "");
        }
        rerenderScope(root);
        if (!isAlreadyOpen) {
          focusSubjectKanbanSearch(subjectId, situationId);
          syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
        }
      };
    });

    dropdownHost.querySelectorAll("[data-subject-kanban-search]").forEach((input) => {
      input.addEventListener("input", () => {
        const subjectId = String(input.dataset.subjectKanbanSearch || "");
        const situationId = String(input.dataset.subjectKanbanSearchSituationId || "");
        getSubjectsViewState().subjectKanbanDropdown.query = String(input.value || "");
        const entries = getSubjectKanbanMenuEntries(subjectId, situationId, input.value || "");
        getSubjectsViewState().subjectKanbanDropdown.activeKey = String((entries.find((entry) => entry.isSelected) || entries[0] || {}).key || "");
        rerenderScope(root);
        focusSubjectKanbanSearch(subjectId, situationId);
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
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
          rerenderScope(root);
          focusSubjectKanbanSearch(subjectId, situationId);
          syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeSubjectKanbanDropdown();
          rerenderScope(root);
          return;
        }
        if (event.key === "Enter") {
          const activeKey = String(getSubjectsViewState().subjectKanbanDropdown.activeKey || "");
          if (!activeKey) return;
          event.preventDefault();
          setSujetKanbanStatus(subjectId, activeKey, { situationId });
          closeSubjectKanbanDropdown();
          rerenderScope(root);
        }
      });
    });

    dropdownHost.querySelectorAll("[data-subject-meta-search]").forEach((input) => {
      input.addEventListener("input", () => {
        const field = String(input.dataset.subjectMetaSearch || "");
        getSubjectsViewState().subjectMetaDropdown.query = String(input.value || "");
        const selection = getScopedSelection(root);
        const subject = selection?.type === "sujet" ? selection.item : null;
        const entries = subject ? getSubjectMetaMenuEntries(subject, field) : [];
        const currentKey = String(getSubjectsViewState().subjectMetaDropdown.activeKey || "");
        getSubjectsViewState().subjectMetaDropdown.activeKey = entries.some((entry) => String(entry?.key || "") === currentKey)
          ? currentKey
          : String(entries[0]?.key || "");
        rerenderScope(root);
        focusSubjectMetaSearch(root, field);
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
      });

      input.addEventListener("keydown", async (event) => {
        const field = String(input.dataset.subjectMetaSearch || "");
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setSubjectMetaActiveEntry(subjectSelection.item, field, event.key === "ArrowDown" ? 1 : -1);
          rerenderScope(root);
          focusSubjectMetaSearch(root, field);
          syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeSubjectMetaDropdown();
          rerenderScope(root);
          return;
        }
        if (event.key === "Enter") {
          const activeKey = String(getSubjectsViewState().subjectMetaDropdown.activeKey || "");
          if (!activeKey) return;
          if (field === "objectives") {
            event.preventDefault();
            await toggleSubjectObjective(subjectSelection.item.id, activeKey, { root });
            focusSubjectMetaSearch(root, field);
            syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
            return;
          }
          if (field === "situations") {
            event.preventDefault();
            await toggleSubjectSituation(subjectSelection.item.id, activeKey, { root });
            focusSubjectMetaSearch(root, field);
            syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
            return;
          }
          if (field === "labels") {
            event.preventDefault();
            toggleSubjectLabel(subjectSelection.item.id, activeKey);
            rerenderScope(root);
            focusSubjectMetaSearch(root, field);
            syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
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
        await toggleSubjectObjective(subjectSelection.item.id, objectiveId, { root });
        focusSubjectMetaSearch(root, "objectives");
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
      };
    });

    dropdownHost.querySelectorAll("[data-situation-toggle]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        await toggleSubjectSituation(subjectSelection.item.id, String(btn.dataset.situationToggle || ""), { root });
        focusSubjectMetaSearch(root, "situations");
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
      };
    });

    dropdownHost.querySelectorAll("[data-subject-label-toggle]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        toggleSubjectLabel(subjectSelection.item.id, String(btn.dataset.subjectLabelToggle || ""));
        rerenderScope(root);
        focusSubjectMetaSearch(root, "labels");
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
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
        closeSubjectKanbanDropdown();
        rerenderScope(root);
      };
    });

    dropdownHost.querySelectorAll("[data-subject-meta-close]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeSubjectMetaDropdown();
        rerenderScope(root);
      };
    });

    dropdownHost.querySelectorAll("[data-subject-kanban-close]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeSubjectKanbanDropdown();
        rerenderScope(root);
      };
    });

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

  }

  function bindModalEvents() {
    if (modalEventsBound) return;
    modalEventsBound = true;

    const modal = document.getElementById("detailsModal");

    bindOverlayChromeDismiss(modal, {
      onClose: closeDetailsModal
    });

    document.getElementById("detailsClose")?.addEventListener("click", closeDetailsModal);

    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (store.situationsView.detailsModalOpen) closeDetailsModal();
      if (store.situationsView.drilldown?.isOpen) closeDrilldown();
    });
  }

  function bindCondensedTitleScroll(scrollEl, classHost, key) {
    bindOverlayChromeCompact(scrollEl, classHost, key);
  }

  function bindDetailsScroll(root) {
    bindCondensedTitleScroll(
      root.querySelector("#situationsDetailsHost"),
      root.querySelector(".gh-panel--details"),
      "details"
    );

    bindCondensedTitleScroll(
      document.getElementById("detailsBodyModal"),
      document.querySelector("#detailsModal .modal__inner"),
      "modal"
    );

    bindCondensedTitleScroll(
      document.getElementById("drilldownBody"),
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

      const labelColorToggle = event.target.closest("[data-label-color-toggle]");
      if (labelColorToggle) {
        event.preventDefault();
        const labelsState = getLabelsUiState();
        if (labelsState.labelEditModal && typeof labelsState.labelEditModal === "object") {
          labelsState.labelEditModal.colorPickerOpen = !labelsState.labelEditModal.colorPickerOpen;
        }
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
        closeSubjectMetaDropdown();
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


      const expandBtn = event.target.closest("#detailsExpand");
      if (expandBtn) {
        event.preventDefault();
        config.openDetailsModal?.();
        return;
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
    resetSubjectsTabView,
    bindSubjectsTabReset,
    wireDetailsInteractive,
    bindModalEvents,
    bindCondensedTitleScroll,
    bindDetailsScroll,
    bindSituationsEvents
  };
}
