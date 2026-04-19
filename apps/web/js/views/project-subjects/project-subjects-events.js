import { applyMarkdownComposerAction } from "../../utils/markdown-composer.js";
import {
  applyMentionSuggestion,
  extractStructuredMentions,
  resolveMentionTriggerContext
} from "../../utils/subject-mentions.js";
import {
  applyEmojiSuggestion,
  resolveEmojiTriggerContext,
  searchEmojiSuggestions
} from "../../utils/emoji-autocomplete.js";
import { computeTextareaCaretRect } from "../../utils/textarea-caret-position.js";

export function createProjectSubjectsEvents(config) {
  const EMOJI_GRID_COLUMNS = 6;
  const CARET_NAVIGATION_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);
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
    getInlineReplyUiState,
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
    getToggleSubjectBlockedByRelation,
    getToggleSubjectBlockingForRelation,
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
    resolveCurrentUserAssigneeId,
    addComment,
    editSubjectMessage,
    deleteSubjectMessage,
    toggleSubjectMessageReaction,
    getMentionUiState,
    getEmojiUiState,
    getComposerAttachmentsState,
    mdToHtml,
    listCollaboratorsForMentions,
    uploadAttachmentFile,
    removeTemporaryAttachment
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
    const toggleSubjectBlockedByRelation = getToggleSubjectBlockedByRelation?.();
    const toggleSubjectBlockingForRelation = getToggleSubjectBlockingForRelation?.();
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
          if (field === "relations") {
            const relationsView = String(getSubjectsViewState().subjectMetaDropdown?.relationsView || "");
            if (relationsView === "parent") {
              if (typeof setSubjectParent !== "function") return;
              await applyNonDestructiveMetaToggle(root, field, () => setSubjectParent(subjectSelection.item.id, activeKey, { root, skipRerender: true }));
              return;
            }
            if (relationsView === "blocked_by") {
              if (typeof toggleSubjectBlockedByRelation !== "function") return;
              await applyNonDestructiveMetaToggle(root, field, () => toggleSubjectBlockedByRelation(subjectSelection.item.id, activeKey, { root, skipRerender: true }));
              return;
            }
            if (relationsView === "blocking_for") {
              if (typeof toggleSubjectBlockingForRelation !== "function") return;
              await applyNonDestructiveMetaToggle(root, field, () => toggleSubjectBlockingForRelation(subjectSelection.item.id, activeKey, { root, skipRerender: true }));
              return;
            }
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

    dropdownHost.querySelectorAll("[data-subject-relations-open-blocked-by]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const dropdown = getSubjectsViewState().subjectMetaDropdown || {};
        dropdown.relationsView = "blocked_by";
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

    dropdownHost.querySelectorAll("[data-subject-relations-open-blocking-for]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const dropdown = getSubjectsViewState().subjectMetaDropdown || {};
        dropdown.relationsView = "blocking_for";
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

    dropdownHost.querySelectorAll("[data-subject-relations-blocked-by-entry]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        if (typeof toggleSubjectBlockedByRelation !== "function") return;
        const relationSubjectId = String(btn.dataset.subjectRelationsBlockedByEntry || "");
        await applyNonDestructiveMetaToggle(root, "relations", () => toggleSubjectBlockedByRelation(subjectSelection.item.id, relationSubjectId, { root, skipRerender: true }));
      };
    });

    dropdownHost.querySelectorAll("[data-subject-relations-blocking-for-entry]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectSelection = getScopedSelection(root);
        if (subjectSelection?.type !== "sujet") return;
        if (typeof toggleSubjectBlockingForRelation !== "function") return;
        const relationSubjectId = String(btn.dataset.subjectRelationsBlockingForEntry || "");
        await applyNonDestructiveMetaToggle(root, "relations", () => toggleSubjectBlockingForRelation(subjectSelection.item.id, relationSubjectId, { root, skipRerender: true }));
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

    const getEmojiState = () => {
      if (typeof getEmojiUiState === "function") return getEmojiUiState();
      if (!store.situationsView.emojiUi || typeof store.situationsView.emojiUi !== "object") {
        store.situationsView.emojiUi = {
          open: false,
          query: "",
          activeIndex: 0,
          triggerStart: -1,
          triggerEnd: -1,
          suggestions: [],
          composerKey: ""
        };
      }
      return store.situationsView.emojiUi;
    };

    const escapeHtml = (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const closeEmojiPopup = ({
      rerender = true
    } = {}) => {
      const emojiState = getEmojiState();
      emojiState.open = false;
      emojiState.query = "";
      emojiState.activeIndex = 0;
      emojiState.triggerStart = -1;
      emojiState.triggerEnd = -1;
      emojiState.suggestions = [];
      emojiState.composerKey = "";
      if (rerender) rerenderAutocompleteUi();
      else syncAutocompletePopups();
    };

    const getTextareaSelector = ({ composerKey = "main", messageId = "" } = {}) => {
      if (composerKey === "main") return "#humanCommentBox";
      if (composerKey === "reply" && messageId) return `[data-thread-reply-draft="${selectorValue(messageId)}"]`;
      if (composerKey === "edit" && messageId) return `[data-thread-edit-draft="${selectorValue(messageId)}"]`;
      return "";
    };

    const splitComposerKey = (composerKey = "") => {
      const normalized = String(composerKey || "").trim();
      if (!normalized || normalized === "main") return { mode: "main", messageId: "" };
      const [mode = "", messageId = ""] = normalized.split(":");
      return { mode, messageId };
    };

    const getTextareaForComposerKey = (composerKey = "") => {
      const { mode, messageId } = splitComposerKey(composerKey);
      const selector = getTextareaSelector({ composerKey: mode, messageId });
      return selector ? root.querySelector(selector) : null;
    };

    const focusComposerTextarea = (composerKey = "") => {
      const textarea = getTextareaForComposerKey(composerKey);
      if (!textarea) return null;
      textarea.focus({ preventScroll: true });
      return textarea;
    };

    const getAutocompleteLayer = () => {
      const layer = document.querySelector("#subject-autocomplete-layer");
      if (!layer) return null;
      const mentionRoot = layer.querySelector("#subject-mention-popup-root");
      const emojiRoot = layer.querySelector("#subject-emoji-popup-root");
      if (!mentionRoot || !emojiRoot) return null;
      return { layer, mentionRoot, emojiRoot };
    };

    const renderMentionPopupHtml = () => {
      const mentionState = getMentionState();
      if (!mentionState?.open) return "";
      const suggestions = Array.isArray(mentionState.suggestions) ? mentionState.suggestions : [];
      return `
        <div class="subject-mention-popup" data-autocomplete-popup="mention" data-composer-key="${escapeHtml(String(mentionState.composerKey || ""))}" role="listbox" aria-label="Suggestions de mention">
          ${suggestions.length
    ? suggestions.map((suggestion, index) => {
      const personId = String(suggestion?.personId || "").trim();
      const isActive = Number(mentionState.activeIndex || 0) === index;
      return `
              <button
                class="subject-mention-popup__item ${isActive ? "is-active" : ""}"
                type="button"
                role="option"
                aria-selected="${isActive ? "true" : "false"}"
                data-action="mention-pick"
                data-composer-key="${escapeHtml(String(mentionState.composerKey || ""))}"
                data-person-id="${escapeHtml(personId)}"
                data-label="${escapeHtml(String(suggestion?.label || ""))}"
              >
                <span class="subject-mention-popup__name">${escapeHtml(String(suggestion?.label || ""))}</span>
                <span class="subject-mention-popup__meta">${escapeHtml(String(suggestion?.email || ""))}</span>
              </button>
            `;
    }).join("")
    : `<div class="subject-mention-popup__empty">Aucun collaborateur trouvé</div>`}
        </div>
      `;
    };

    const renderEmojiPopupHtml = () => {
      const emojiState = getEmojiState();
      if (!emojiState?.open) return "";
      const suggestions = Array.isArray(emojiState.suggestions) ? emojiState.suggestions : [];
      return `
        <div class="subject-mention-popup subject-emoji-popup" data-autocomplete-popup="emoji" data-composer-key="${escapeHtml(String(emojiState.composerKey || ""))}" role="listbox" aria-label="Suggestions d’emoji">
          ${suggestions.length
    ? `
              <div class="subject-emoji-popup__grid">
                ${suggestions.map((suggestion, index) => {
      const isActive = Number(emojiState.activeIndex || 0) === index;
      const shortcode = String(suggestion?.shortcode || "").trim();
      return `
                    <button
                      class="subject-emoji-popup__cell ${isActive ? "is-active" : ""}"
                      type="button"
                      role="option"
                      aria-selected="${isActive ? "true" : "false"}"
                      aria-label="${escapeHtml(shortcode ? `:${shortcode}:` : "emoji")}"
                      title="${escapeHtml(shortcode ? `:${shortcode}:` : "emoji")}"
                      data-action="emoji-pick"
                      data-composer-key="${escapeHtml(String(emojiState.composerKey || ""))}"
                      data-emoji="${escapeHtml(String(suggestion?.emoji || ""))}"
                      data-shortcode="${escapeHtml(shortcode)}"
                    >
                      ${escapeHtml(String(suggestion?.emoji || ""))}
                    </button>
                  `;
    }).join("")}
              </div>
            `
    : `<div class="subject-mention-popup__empty">Aucun emoji trouvé</div>`}
        </div>
      `;
    };

    const positionAutocompletePopup = (textarea, popup, popupRoot) => {
      if (!textarea || !popup || !popup.isConnected) return;
      const caretRect = computeTextareaCaretRect(textarea, textarea.selectionStart || 0);
      if (!caretRect) return;
      popup.style.maxWidth = "min(360px, calc(100vw - 16px))";
      if (String(popup.dataset.autocompletePopup || "") === "mention") {
        popup.style.width = "min(340px, calc(100vw - 16px))";
      } else {
        popup.style.width = "";
      }
      popup.style.zIndex = "900";
      const popupRect = popup.getBoundingClientRect();
      const gap = 8;
      const viewportH = window.innerHeight || 0;
      const viewportW = window.innerWidth || 0;
      const placeBelow = caretRect.bottom + gap + popupRect.height <= viewportH - 8;
      const top = placeBelow
        ? caretRect.bottom + gap
        : Math.max(8, caretRect.top - popupRect.height - gap);
      const left = Math.min(
        Math.max(8, caretRect.left),
        Math.max(8, viewportW - popupRect.width - 8)
      );
      if (popupRoot) {
        popupRoot.style.top = `${Math.round(top)}px`;
        popupRoot.style.left = `${Math.round(left)}px`;
      }
    };

    const positionAllAutocompletePopups = () => {
      const autocompleteLayer = getAutocompleteLayer();
      if (!autocompleteLayer) return;
      const mentionState = getMentionState();
      const emojiState = getEmojiState();
      const mentionPopup = autocompleteLayer.mentionRoot.querySelector(".subject-mention-popup");
      const emojiPopup = autocompleteLayer.emojiRoot.querySelector(".subject-mention-popup");
      if (mentionState.open && mentionPopup) {
        const mentionTextarea = getTextareaForComposerKey(String(mentionState.composerKey || ""));
        if (mentionTextarea) positionAutocompletePopup(mentionTextarea, mentionPopup, autocompleteLayer.mentionRoot);
        else autocompleteLayer.mentionRoot.classList.add("hidden");
      }
      if (emojiState.open && emojiPopup) {
        const emojiTextarea = getTextareaForComposerKey(String(emojiState.composerKey || ""));
        if (emojiTextarea) positionAutocompletePopup(emojiTextarea, emojiPopup, autocompleteLayer.emojiRoot);
        else autocompleteLayer.emojiRoot.classList.add("hidden");
      }
    };

    const syncAutocompletePopups = () => {
      const autocompleteLayer = getAutocompleteLayer();
      if (!autocompleteLayer) return;
      const mentionState = getMentionState();
      const emojiState = getEmojiState();

      if (mentionState.open) {
        autocompleteLayer.mentionRoot.innerHTML = renderMentionPopupHtml();
        autocompleteLayer.mentionRoot.classList.remove("hidden");
      } else {
        autocompleteLayer.mentionRoot.innerHTML = "";
        autocompleteLayer.mentionRoot.classList.add("hidden");
      }
      if (emojiState.open) {
        autocompleteLayer.emojiRoot.innerHTML = renderEmojiPopupHtml();
        autocompleteLayer.emojiRoot.classList.remove("hidden");
      } else {
        autocompleteLayer.emojiRoot.innerHTML = "";
        autocompleteLayer.emojiRoot.classList.add("hidden");
      }

      positionAllAutocompletePopups();
    };

    const rerenderAutocompleteUi = () => {
      syncAutocompletePopups();
    };

    let mentionCollaborators = [];
    let mentionCollaboratorsLoaded = false;
    let mentionLoadPromise = null;

    const getMentionState = () => {
      if (typeof getMentionUiState === "function") return getMentionUiState();
      if (!store.situationsView.mentionUi || typeof store.situationsView.mentionUi !== "object") {
        store.situationsView.mentionUi = {
          open: false,
          query: "",
          activeIndex: 0,
          triggerStart: -1,
          triggerEnd: -1,
          suggestions: [],
          composerKey: ""
        };
      }
      if (typeof store.situationsView.mentionUi.composerKey !== "string") {
        store.situationsView.mentionUi.composerKey = "";
      }
      return store.situationsView.mentionUi;
    };

    const closeMentionPopup = ({ rerender = true } = {}) => {
      const mentionState = getMentionState();
      mentionState.open = false;
      mentionState.query = "";
      mentionState.activeIndex = 0;
      mentionState.triggerStart = -1;
      mentionState.triggerEnd = -1;
      mentionState.suggestions = [];
      mentionState.composerKey = "";
      if (rerender) rerenderAutocompleteUi();
      else syncAutocompletePopups();
    };

    const ensureMentionCollaboratorsLoaded = async () => {
      if (mentionCollaboratorsLoaded) return mentionCollaborators;
      if (mentionLoadPromise) return mentionLoadPromise;
      const selection = getScopedSelection(root);
      if (!selection?.item?.project_id || typeof listCollaboratorsForMentions !== "function") {
        mentionCollaborators = [];
        mentionCollaboratorsLoaded = true;
        return mentionCollaborators;
      }
      mentionLoadPromise = listCollaboratorsForMentions(selection.item.project_id)
        .then((rows) => {
          mentionCollaborators = Array.isArray(rows) ? rows : [];
          mentionCollaboratorsLoaded = true;
          return mentionCollaborators;
        })
        .catch((error) => {
          console.warn("[subject-mentions] collaborators load failed", error);
          mentionCollaborators = [];
          mentionCollaboratorsLoaded = true;
          return mentionCollaborators;
        })
        .finally(() => {
          mentionLoadPromise = null;
        });
      return mentionLoadPromise;
    };

    const syncMentionPopupForTextarea = async (textarea, composerKey, { forceOpen = false } = {}) => {
      if (!textarea) return;
      const mentionState = getMentionState();
      const context = resolveMentionTriggerContext(textarea.value || "", textarea.selectionStart || 0);
      if (!context && !forceOpen) {
        if (mentionState.open && String(mentionState.composerKey || "") === composerKey) {
          const { mode, messageId } = splitComposerKey(composerKey);
          closeMentionPopup({
            selector: getTextareaSelector({ composerKey: mode, messageId }),
            shouldFocus: true,
            caretStart: Number(textarea.selectionStart || 0),
            caretEnd: Number(textarea.selectionEnd || 0)
          });
        }
        return;
      }
      const query = String(context?.query || "").trim().toLowerCase();
      const { mode, messageId } = splitComposerKey(composerKey);
      const selector = getTextareaSelector({ composerKey: mode, messageId });
      if (!mentionCollaboratorsLoaded) {
        mentionState.triggerStart = Number(context?.triggerStart ?? -1);
        mentionState.triggerEnd = Number(context?.triggerEnd ?? -1);
        mentionState.query = query;
        mentionState.suggestions = [];
        mentionState.open = true;
        mentionState.activeIndex = 0;
        mentionState.composerKey = composerKey;
        rerenderAutocompleteUi({
          selector,
          shouldFocus: true,
          caretStart: Number(textarea.selectionStart || 0),
          caretEnd: Number(textarea.selectionEnd || 0)
        });
        void ensureMentionCollaboratorsLoaded().then(() => {
          const activeTextarea = getTextareaForComposerKey(composerKey);
          if (activeTextarea) void syncMentionPopupForTextarea(activeTextarea, composerKey, { forceOpen: true });
        });
        return;
      }

      const suggestions = mentionCollaborators
        .filter((entry) => {
          if (!query) return true;
          return [
            String(entry?.label || "").toLowerCase(),
            String(entry?.email || "").toLowerCase()
          ].some((field) => field.includes(query));
        })
        .slice(0, 8);

      mentionState.triggerStart = Number(context?.triggerStart ?? -1);
      mentionState.triggerEnd = Number(context?.triggerEnd ?? -1);
      mentionState.query = query;
      mentionState.suggestions = suggestions;
      mentionState.open = !!context || forceOpen;
      mentionState.activeIndex = Math.max(0, Math.min(Number(mentionState.activeIndex || 0), Math.max(0, suggestions.length - 1)));
      mentionState.composerKey = composerKey;
      rerenderAutocompleteUi({
        selector,
        shouldFocus: true,
        caretStart: Number(textarea.selectionStart || 0),
        caretEnd: Number(textarea.selectionEnd || 0)
      });
    };

    const pickMentionSuggestion = (suggestion, composerKey = "main") => {
      const textarea = getTextareaForComposerKey(composerKey);
      if (!textarea) return;
      const mentionState = getMentionState();
      const context = {
        triggerStart: mentionState.triggerStart,
        triggerEnd: Number(textarea.selectionStart || mentionState.triggerEnd || 0)
      };
      const result = applyMentionSuggestion(textarea.value || "", context, suggestion);
      textarea.value = result.nextText;
      const { mode, messageId = "" } = splitComposerKey(composerKey);
      if (mode === "main") {
        store.situationsView.commentDraft = String(result.nextText || "");
      } else {
        const replyUi = resolveInlineReplyUiState();
        if (mode === "reply") {
          replyUi.draftsByMessageId[messageId] = String(result.nextText || "");
          syncInlineReplySubmitButton(messageId);
        } else if (mode === "edit") {
          replyUi.editDraftsByMessageId[messageId] = String(result.nextText || "");
          syncInlineEditSubmitButton(messageId);
        }
        syncInlineReplyTextareaHeight(textarea);
      }
      textarea.focus();
      textarea.selectionStart = result.nextCursorIndex;
      textarea.selectionEnd = result.nextCursorIndex;
      closeMentionPopup({ rerender: false });
      closeEmojiPopup({ rerender: false });
      if (store.situationsView.commentPreviewMode) syncCommentPreview(root);
      const selector = getTextareaSelector({ composerKey: mode, messageId });
      rerenderAutocompleteUi({
        selector,
        shouldFocus: true,
        caretStart: result.nextCursorIndex,
        caretEnd: result.nextCursorIndex
      });
    };

    const commentTextarea = root.querySelector("#humanCommentBox");
    if (commentTextarea) {
      const getComposerAttachments = () => {
        if (typeof getComposerAttachmentsState === "function") return getComposerAttachmentsState();
        if (!store.situationsView.subjectComposerAttachments || typeof store.situationsView.subjectComposerAttachments !== "object") {
          store.situationsView.subjectComposerAttachments = {
            subjectId: "",
            uploadSessionId: "",
            items: []
          };
        }
        if (!Array.isArray(store.situationsView.subjectComposerAttachments.items)) {
          store.situationsView.subjectComposerAttachments.items = [];
        }
        return store.situationsView.subjectComposerAttachments;
      };

      const createUploadSessionId = () => {
        try {
          if (window?.crypto?.randomUUID) return String(window.crypto.randomUUID());
        } catch {}
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      };

      const ensureComposerAttachmentContext = () => {
        const selection = getScopedSelection(root);
        const state = getComposerAttachments();
        const subjectId = selection?.type === "sujet" ? String(selection?.item?.id || "").trim() : "";
        if (!subjectId) return { subjectId: "", state };
        if (String(state.subjectId || "") !== subjectId) {
          clearComposerAttachmentItems(state);
          state.subjectId = subjectId;
          state.uploadSessionId = "";
        }
        if (!String(state.uploadSessionId || "")) {
          state.uploadSessionId = createUploadSessionId();
        }
        return { subjectId, state };
      };

      const isImageFile = (file) => String(file?.type || "").toLowerCase().startsWith("image/");
      const toObjectUrl = (file) => {
        try {
          return isImageFile(file) && window?.URL?.createObjectURL ? window.URL.createObjectURL(file) : "";
        } catch {
          return "";
        }
      };

      const revokeObjectUrl = (value) => {
        try {
          if (value && window?.URL?.revokeObjectURL) window.URL.revokeObjectURL(value);
        } catch {}
      };

      const releaseAttachmentPreviewUrls = (attachment = {}) => {
        revokeObjectUrl(String(attachment?.localPreviewUrl || ""));
      };

      const clearComposerAttachmentItems = (state) => {
        const items = Array.isArray(state?.items) ? state.items : [];
        items.forEach((entry) => releaseAttachmentPreviewUrls(entry));
        if (state && typeof state === "object") state.items = [];
      };

      const addComposerFiles = async (files = []) => {
        const list = Array.from(files || []).filter((entry) => !!entry);
        if (!list.length) return;
        const selection = getScopedSelection(root);
        if (selection?.type !== "sujet") return;
        const projectId = String(selection?.item?.project_id || "").trim();
        if (!projectId) {
          showError("Projet introuvable pour l’upload des pièces jointes.");
          return;
        }
        const { subjectId, state } = ensureComposerAttachmentContext();
        if (!subjectId || typeof uploadAttachmentFile !== "function") return;

        for (const file of list) {
          const tempId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const localPreview = toObjectUrl(file);
          const pending = {
            id: "",
            tempId,
            file_name: String(file?.name || "fichier"),
            mime_type: String(file?.type || ""),
            size_bytes: Number(file?.size || 0),
            localPreviewUrl: localPreview,
            remoteObjectUrl: "",
            previewUrl: localPreview,
            isImage: isImageFile(file),
            uploadStatus: "uploading",
            previewStatus: localPreview ? "local" : "none",
            error: ""
          };
          state.items.push(pending);
          rerenderScope(root);

          try {
            const uploaded = await uploadAttachmentFile({
              subjectId,
              projectId,
              uploadSessionId: state.uploadSessionId,
              file,
              sortOrder: state.items.length - 1
            });
            pending.id = String(uploaded?.id || "");
            pending.storage_path = String(uploaded?.storage_path || "");
            pending.remoteObjectUrl = String(uploaded?.object_url || "");
            pending.object_url = pending.remoteObjectUrl;
            pending.uploadStatus = "ready";
            pending.error = "";
            if (pending.isImage) {
              if (pending.remoteObjectUrl) {
                pending.previewStatus = pending.localPreviewUrl ? "local" : "remote";
                if (!pending.previewUrl) pending.previewUrl = pending.remoteObjectUrl;
              } else if (pending.localPreviewUrl) {
                pending.previewStatus = "local";
              } else {
                pending.previewStatus = "none";
              }
            } else {
              pending.previewStatus = "none";
            }
          } catch (error) {
            pending.uploadStatus = "error";
            pending.previewStatus = pending.localPreviewUrl ? "local" : "none";
            pending.error = String(error?.message || error || "Erreur d'upload");
          }
          rerenderScope(root);
        }
      };

      const removeComposerAttachmentById = async (tempId = "", attachmentId = "") => {
        const state = getComposerAttachments();
        const normalizedAttachmentId = String(attachmentId || "").trim();
        const targetIndex = state.items.findIndex((entry) => String(entry?.tempId || "") === String(tempId || "") || String(entry?.id || "") === normalizedAttachmentId);
        if (targetIndex < 0) return;
        const current = state.items[targetIndex];
        state.items.splice(targetIndex, 1);
        rerenderScope(root);
        releaseAttachmentPreviewUrls(current);
        if (normalizedAttachmentId && typeof removeTemporaryAttachment === "function") {
          try {
            await removeTemporaryAttachment({ attachmentId: normalizedAttachmentId });
          } catch (error) {
            console.warn("[subject-attachments] remove temporary attachment failed", error);
          }
        }
      };

      const syncMainEmojiPopup = ({ composerKey = "main" } = {}) => {
        const emojiState = getEmojiState();
        const context = resolveEmojiTriggerContext(commentTextarea.value || "", commentTextarea.selectionStart || 0);
        if (!context) {
          if (emojiState.open) closeEmojiPopup();
          return;
        }
        const query = String(context?.query || "").trim().toLowerCase();
        const suggestions = searchEmojiSuggestions(query, 200);
        emojiState.triggerStart = Number(context?.triggerStart ?? -1);
        emojiState.triggerEnd = Number(context?.triggerEnd ?? -1);
        emojiState.query = query;
        emojiState.suggestions = suggestions;
        emojiState.composerKey = composerKey;
        emojiState.open = true;
        emojiState.activeIndex = Math.max(0, Math.min(Number(emojiState.activeIndex || 0), Math.max(0, suggestions.length - 1)));
        rerenderAutocompleteUi({
          selector: "#humanCommentBox",
          shouldFocus: true,
          caretStart: Number(commentTextarea.selectionStart || 0),
          caretEnd: Number(commentTextarea.selectionEnd || 0)
        });
      };

      const syncMentionPopup = async ({ forceOpen = false } = {}) => {
        await syncMentionPopupForTextarea(commentTextarea, "main", { forceOpen });
      };
      const pickEmojiSuggestion = (suggestion) => {
        const emojiState = getEmojiState();
        const context = {
          triggerStart: emojiState.triggerStart,
          triggerEnd: Number(commentTextarea.selectionStart || emojiState.triggerEnd || 0)
        };
        const result = applyEmojiSuggestion(commentTextarea.value || "", context, suggestion);
        commentTextarea.value = result.nextText;
        store.situationsView.commentDraft = String(result.nextText || "");
        commentTextarea.focus();
        commentTextarea.selectionStart = result.nextCursorIndex;
        commentTextarea.selectionEnd = result.nextCursorIndex;
        closeEmojiPopup({ rerender: false });
        if (store.situationsView.commentPreviewMode) syncCommentPreview(root);
        syncMainComposerTextareaHeight();
        rerenderAutocompleteUi({
          selector: "#humanCommentBox",
          shouldFocus: true,
          caretStart: result.nextCursorIndex,
          caretEnd: result.nextCursorIndex
        });
      };
      const syncMainComposerAutocomplete = async () => {
        const mentionContext = resolveMentionTriggerContext(commentTextarea.value || "", commentTextarea.selectionStart || 0);
        if (mentionContext) {
          await syncMentionPopup();
          closeEmojiPopup({ rerender: false });
          return;
        }
        if (getMentionState().open) closeMentionPopup({ rerender: false });
        syncMainEmojiPopup({ composerKey: "main" });
      };

      const syncMainComposerTextareaHeight = () => {
        const computedStyle = window.getComputedStyle(commentTextarea);
        const lineHeight = Math.max(16, Math.round(parseFloat(computedStyle.lineHeight) || 20));
        const minHeight = Math.max(170, Math.round(parseFloat(computedStyle.minHeight) || 170));
        const comfortExtraLines = 3;
        const extraPadding = lineHeight * comfortExtraLines;
        commentTextarea.style.overflowY = "hidden";
        commentTextarea.style.height = "auto";
        const nextHeight = Math.max(minHeight, commentTextarea.scrollHeight + extraPadding);
        commentTextarea.style.height = `${nextHeight}px`;
      };

      syncMainComposerTextareaHeight();

      commentTextarea.addEventListener("input", () => {
        store.situationsView.commentDraft = String(commentTextarea.value || "");
        syncMainComposerTextareaHeight();
        void syncMainComposerAutocomplete();
        if (store.situationsView.commentPreviewMode) syncCommentPreview(root);
      });
      commentTextarea.addEventListener("keydown", (ev) => {
        const mentionState = getMentionState();
        const emojiState = getEmojiState();
        if (ev.key === "Escape") {
          if (mentionState.open && String(mentionState.composerKey || "") === "main") {
            ev.preventDefault();
            closeMentionPopup({
              selector: "#humanCommentBox",
              shouldFocus: true,
              caretStart: Number(commentTextarea.selectionStart || 0),
              caretEnd: Number(commentTextarea.selectionEnd || 0)
            });
            return;
          }
          if (emojiState.open && String(emojiState.composerKey || "") === "main") {
            ev.preventDefault();
            closeEmojiPopup({
              selector: "#humanCommentBox",
              shouldFocus: true,
              caretStart: Number(commentTextarea.selectionStart || 0),
              caretEnd: Number(commentTextarea.selectionEnd || 0)
            });
            return;
          }
        }
        if (mentionState.open && Array.isArray(mentionState.suggestions) && mentionState.suggestions.length) {
          if (ev.key === "ArrowDown") {
            ev.preventDefault();
            mentionState.activeIndex = (Number(mentionState.activeIndex || 0) + 1) % mentionState.suggestions.length;
            rerenderAutocompleteUi({
              selector: "#humanCommentBox",
              shouldFocus: true,
              caretStart: Number(commentTextarea.selectionStart || 0),
              caretEnd: Number(commentTextarea.selectionEnd || 0)
            });
            return;
          }
          if (ev.key === "ArrowUp") {
            ev.preventDefault();
            mentionState.activeIndex = (Number(mentionState.activeIndex || 0) - 1 + mentionState.suggestions.length) % mentionState.suggestions.length;
            rerenderAutocompleteUi({
              selector: "#humanCommentBox",
              shouldFocus: true,
              caretStart: Number(commentTextarea.selectionStart || 0),
              caretEnd: Number(commentTextarea.selectionEnd || 0)
            });
            return;
          }
          if (ev.key === "Enter") {
            ev.preventDefault();
            pickMentionSuggestion(mentionState.suggestions[Number(mentionState.activeIndex || 0)] || mentionState.suggestions[0]);
            return;
          }
        }
        if (emojiState.open && Array.isArray(emojiState.suggestions) && emojiState.suggestions.length && String(emojiState.composerKey || "") === "main") {
          if (ev.key === "ArrowDown") {
            ev.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) + EMOJI_GRID_COLUMNS) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: "#humanCommentBox",
              shouldFocus: true,
              caretStart: Number(commentTextarea.selectionStart || 0),
              caretEnd: Number(commentTextarea.selectionEnd || 0)
            });
            return;
          }
          if (ev.key === "ArrowUp") {
            ev.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) - EMOJI_GRID_COLUMNS + emojiState.suggestions.length) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: "#humanCommentBox",
              shouldFocus: true,
              caretStart: Number(commentTextarea.selectionStart || 0),
              caretEnd: Number(commentTextarea.selectionEnd || 0)
            });
            return;
          }
          if (ev.key === "ArrowRight") {
            ev.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) + 1) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: "#humanCommentBox",
              shouldFocus: true,
              caretStart: Number(commentTextarea.selectionStart || 0),
              caretEnd: Number(commentTextarea.selectionEnd || 0)
            });
            return;
          }
          if (ev.key === "ArrowLeft") {
            ev.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) - 1 + emojiState.suggestions.length) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: "#humanCommentBox",
              shouldFocus: true,
              caretStart: Number(commentTextarea.selectionStart || 0),
              caretEnd: Number(commentTextarea.selectionEnd || 0)
            });
            return;
          }
          if (ev.key === "Enter") {
            ev.preventDefault();
            pickEmojiSuggestion(emojiState.suggestions[Number(emojiState.activeIndex || 0)] || emojiState.suggestions[0]);
            return;
          }
        }
        if (CARET_NAVIGATION_KEYS.has(ev.key)) {
          requestAnimationFrame(() => { void syncMainComposerAutocomplete(); });
        }
        if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          applyCommentAction(root);
        }
      });
      const syncMainAutocompleteFromCaret = () => {
        void syncMainComposerAutocomplete();
      };
      commentTextarea.addEventListener("click", syncMainAutocompleteFromCaret);
      commentTextarea.addEventListener("keyup", syncMainAutocompleteFromCaret);
      commentTextarea.addEventListener("scroll", () => {
        positionAllAutocompletePopups();
      });

      root.querySelectorAll("[data-action='composer-format'][data-format]").forEach((btn) => {
        btn.onclick = () => {
          const action = String(btn.dataset.format || "").trim();
          if (!action) return;
          const didApply = applyMarkdownComposerAction(commentTextarea, action);
          if (!didApply) return;
          if (action === "mention") void syncMentionPopup({ forceOpen: true });
          else {
            closeMentionPopup({ rerender: false });
            closeEmojiPopup({ rerender: false });
          }
          store.situationsView.commentDraft = String(commentTextarea.value || "");
          syncMainComposerTextareaHeight();
          if (store.situationsView.commentPreviewMode) syncCommentPreview(root);
        };
      });

      const mainComposerRoot = commentTextarea.closest(".comment-composer");
      const attachmentInput = mainComposerRoot?.querySelector("[data-role='subject-composer-file-input']")
        || root.querySelector("[data-role='subject-composer-file-input']");
      const attachmentDropzone = mainComposerRoot?.querySelector(".comment-composer__editor");
      root.querySelectorAll("[data-action='composer-attachments-pick']").forEach((btn) => {
        btn.onclick = () => attachmentInput?.click();
      });
      if (attachmentInput) {
        attachmentInput.addEventListener("change", async (event) => {
          const files = Array.from(event?.target?.files || []);
          if (files.length) await addComposerFiles(files);
          attachmentInput.value = "";
        });
      }

      if (attachmentDropzone && attachmentInput) {
        ["dragenter", "dragover"].forEach((eventName) => {
          attachmentDropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
            attachmentDropzone.classList.add("is-dragover");
          });
        });
        ["dragleave", "dragend", "drop"].forEach((eventName) => {
          attachmentDropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
            attachmentDropzone.classList.remove("is-dragover");
          });
        });
        attachmentDropzone.addEventListener("drop", async (event) => {
          const files = Array.from(event?.dataTransfer?.files || []);
          if (files.length) await addComposerFiles(files);
        });
      }

      root.querySelectorAll("[data-action='composer-attachment-remove']").forEach((btn) => {
        btn.onclick = async () => {
          await removeComposerAttachmentById(
            String(btn.dataset.tempId || ""),
            String(btn.dataset.attachmentId || "")
          );
        };
      });

      if (root.dataset.subjectMentionDocumentBound !== "true") {
        document.addEventListener("click", (event) => {
          const target = event?.target;
          if (!target || !(target instanceof Element)) return;
          if (
            target.closest("#subject-autocomplete-layer")
            || target.closest("#humanCommentBox")
            || target.closest("[data-thread-reply-draft]")
            || target.closest("[data-thread-edit-draft]")
          ) {
            return;
          }
          const mentionState = getMentionState();
          if (!mentionState.open) return;
          closeMentionPopup();
        });
        root.dataset.subjectMentionDocumentBound = "true";
      }

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

    const isDrilldownScope = !!root.closest?.("#drilldownPanel");
    const scopedUiState = (() => {
      const uiState = getSubjectsViewState();
      if (!isDrilldownScope) return uiState;
      if (!uiState.drilldown || typeof uiState.drilldown !== "object") {
        uiState.drilldown = {};
      }
      return uiState.drilldown;
    })();

    if (typeof scopedUiState.rightSubissuesOpen !== "boolean") scopedUiState.rightSubissuesOpen = true;
    if (!(scopedUiState.rightSubissuesExpandedSubjectIds instanceof Set)) {
      scopedUiState.rightSubissuesExpandedSubjectIds = new Set(
        Array.isArray(scopedUiState.rightSubissuesExpandedSubjectIds)
          ? scopedUiState.rightSubissuesExpandedSubjectIds
          : []
      );
    }
    if (typeof scopedUiState.rightSubissueMenuOpenId !== "string") scopedUiState.rightSubissueMenuOpenId = "";

    const rerenderDetailsScope = () => {
      if (isDrilldownScope) {
        updateDrilldownPanel();
      } else {
        rerenderPanels();
      }
    };

    root.querySelectorAll("[data-action='toggle-subissues']").forEach((btn) => {
      btn.onclick = () => {
        scopedUiState.rightSubissuesOpen = !scopedUiState.rightSubissuesOpen;
        rerenderDetailsScope();
      };
    });

    const setSubjectParent = getSetSubjectParent?.();
    const subissuesExpandedSet = scopedUiState.rightSubissuesExpandedSubjectIds;

    root.querySelectorAll("[data-subissue-tree-toggle]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(btn.dataset.subissueTreeToggle || "");
        if (!subjectId) return;
        if (subissuesExpandedSet.has(subjectId)) subissuesExpandedSet.delete(subjectId);
        else subissuesExpandedSet.add(subjectId);
        rerenderDetailsScope();
      };
    });

    root.querySelectorAll("[data-subissue-actions-trigger]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(btn.dataset.subissueActionsTrigger || "");
        scopedUiState.rightSubissueMenuOpenId = String(scopedUiState.rightSubissueMenuOpenId || "") === subjectId ? "" : subjectId;
        rerenderDetailsScope();
      };
    });

    root.querySelectorAll("[data-subissue-remove-parent]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(btn.dataset.subissueRemoveParent || "");
        if (!subjectId || typeof setSubjectParent !== "function") return;
        await setSubjectParent(subjectId, "", { root, skipRerender: false });
        scopedUiState.rightSubissueMenuOpenId = "";
        subissuesExpandedSet.delete(subjectId);
        rerenderDetailsScope();
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

    root.querySelectorAll(".js-details-parent-subject-link[data-parent-subject-id]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const parentSubjectId = String(btn.dataset.parentSubjectId || "");
        if (parentSubjectId) (openDrilldownFromSubjectPanel || openDrilldownFromSujetPanel)(parentSubjectId);
      };
    });

    root.querySelectorAll(".subject-meta-parent-card[data-parent-subject-id]").forEach((card) => {
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
        const draftMessage = String(store?.situationsView?.commentDraft || "").trim();
        const attachmentState = typeof getComposerAttachmentsState === "function"
          ? getComposerAttachmentsState()
          : null;
        const hasReadyAttachment = Array.isArray(attachmentState?.items)
          && attachmentState.items.some((attachment) => {
            const status = String(attachment?.uploadStatus || "").trim();
            return status === "ready" && !attachment?.error;
          });
        if (!draftMessage && !hasReadyAttachment) return;
        await applyCommentAction(root);
      };
    });

    const selectorValue = (value) => String(value || "").replace(/["\\]/g, "\\$&");
    const threadReplyDebugEnabled = (() => {
      try {
        const search = String(window?.location?.search || "");
        if (search.includes("debugSubjectReplies=1")) return true;
        const localValue = String(window?.localStorage?.getItem?.("mdall:debug-subject-replies") || "").trim().toLowerCase();
        return localValue === "1" || localValue === "true";
      } catch {
        return false;
      }
    })();
    const debugThreadReply = (eventName, payload = {}) => {
      if (!threadReplyDebugEnabled) return;
      console.log("[subject-thread-reply]", eventName, payload);
    };
    const resolveInlineReplyUiState = () => {
      if (typeof getInlineReplyUiState === "function") {
        const state = getInlineReplyUiState();
        if (state && typeof state === "object") return state;
      }
      if (!store.situationsView || typeof store.situationsView !== "object") {
        store.situationsView = {};
      }
      if (!store.situationsView.inlineReplyUi || typeof store.situationsView.inlineReplyUi !== "object") {
        store.situationsView.inlineReplyUi = {
          expandedMessageId: "",
          draftsByMessageId: {},
          previewByMessageId: {},
          attachmentsByMessageId: {},
          uploadSessionByMessageId: {},
          editMessageId: "",
          editDraftsByMessageId: {},
          editPreviewByMessageId: {}
        };
      }
      if (!store.situationsView.inlineReplyUi.previewByMessageId || typeof store.situationsView.inlineReplyUi.previewByMessageId !== "object") {
        store.situationsView.inlineReplyUi.previewByMessageId = {};
      }
      if (!store.situationsView.inlineReplyUi.attachmentsByMessageId || typeof store.situationsView.inlineReplyUi.attachmentsByMessageId !== "object") {
        store.situationsView.inlineReplyUi.attachmentsByMessageId = {};
      }
      if (!store.situationsView.inlineReplyUi.uploadSessionByMessageId || typeof store.situationsView.inlineReplyUi.uploadSessionByMessageId !== "object") {
        store.situationsView.inlineReplyUi.uploadSessionByMessageId = {};
      }
      if (typeof store.situationsView.inlineReplyUi.editMessageId !== "string") {
        store.situationsView.inlineReplyUi.editMessageId = "";
      }
      if (!store.situationsView.inlineReplyUi.editDraftsByMessageId || typeof store.situationsView.inlineReplyUi.editDraftsByMessageId !== "object") {
        store.situationsView.inlineReplyUi.editDraftsByMessageId = {};
      }
      if (!store.situationsView.inlineReplyUi.editPreviewByMessageId || typeof store.situationsView.inlineReplyUi.editPreviewByMessageId !== "object") {
        store.situationsView.inlineReplyUi.editPreviewByMessageId = {};
      }
      debugThreadReply("reply_state_fallback", { hasAccessor: typeof getInlineReplyUiState === "function" });
      return store.situationsView.inlineReplyUi;
    };
    const createUploadSessionId = () => {
      try {
        if (window?.crypto?.randomUUID) return String(window.crypto.randomUUID());
      } catch {}
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };
    const isImageFile = (file) => String(file?.type || "").toLowerCase().startsWith("image/");
    const toObjectUrl = (file) => {
      try {
        return isImageFile(file) && window?.URL?.createObjectURL ? window.URL.createObjectURL(file) : "";
      } catch {
        return "";
      }
    };
    const revokeObjectUrl = (value) => {
      try {
        if (value && window?.URL?.revokeObjectURL) window.URL.revokeObjectURL(value);
      } catch {}
    };
    const releaseAttachmentPreviewUrls = (attachment = {}) => {
      revokeObjectUrl(String(attachment?.localPreviewUrl || ""));
    };
    const getInlineReplyAttachmentsState = (messageId = "", { createIfMissing = false } = {}) => {
      const normalizedMessageId = String(messageId || "").trim();
      const replyUi = resolveInlineReplyUiState();
      if (!normalizedMessageId) return { replyUi, items: [], uploadSessionId: "" };
      if (!Array.isArray(replyUi.attachmentsByMessageId[normalizedMessageId])) {
        if (createIfMissing) replyUi.attachmentsByMessageId[normalizedMessageId] = [];
      }
      if (createIfMissing && !String(replyUi.uploadSessionByMessageId[normalizedMessageId] || "")) {
        replyUi.uploadSessionByMessageId[normalizedMessageId] = createUploadSessionId();
      }
      return {
        replyUi,
        items: Array.isArray(replyUi.attachmentsByMessageId[normalizedMessageId]) ? replyUi.attachmentsByMessageId[normalizedMessageId] : [],
        uploadSessionId: String(replyUi.uploadSessionByMessageId[normalizedMessageId] || "")
      };
    };
    const canSubmitInlineReply = (messageId = "") => {
      const normalizedMessageId = String(messageId || "").trim();
      if (!normalizedMessageId) return false;
      const replyUi = resolveInlineReplyUiState();
      const message = String(replyUi.draftsByMessageId?.[normalizedMessageId] || "").trim();
      if (message) return true;
      const inlineAttachmentsState = getInlineReplyAttachmentsState(normalizedMessageId);
      return Array.isArray(inlineAttachmentsState?.items)
        && inlineAttachmentsState.items.some((attachment) => String(attachment?.uploadStatus || "").trim() === "ready" && !attachment?.error);
    };
    const syncInlineReplySubmitButton = (messageId = "") => {
      const normalizedMessageId = String(messageId || "").trim();
      if (!normalizedMessageId) return;
      const submitButton = root.querySelector(
        `[data-action='thread-reply-submit'][data-message-id="${selectorValue(normalizedMessageId)}"]`
      );
      if (!submitButton) return;
      submitButton.disabled = !canSubmitInlineReply(normalizedMessageId);
    };
    const canSubmitInlineEdit = (messageId = "") => {
      const normalizedMessageId = String(messageId || "").trim();
      if (!normalizedMessageId) return false;
      const replyUi = resolveInlineReplyUiState();
      return !!String(replyUi.editDraftsByMessageId?.[normalizedMessageId] || "").trim();
    };
    const syncInlineEditSubmitButton = (messageId = "") => {
      const normalizedMessageId = String(messageId || "").trim();
      if (!normalizedMessageId) return;
      const submitButton = root.querySelector(
        `[data-action='thread-edit-submit'][data-message-id="${selectorValue(normalizedMessageId)}"]`
      );
      if (!submitButton) return;
      submitButton.disabled = !canSubmitInlineEdit(normalizedMessageId);
    };
    const syncInlineReplyTextareaHeight = (textarea) => {
      if (!textarea) return;
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = Math.max(16, Math.round(parseFloat(computedStyle.lineHeight) || 20));
      const minHeight = Math.max(110, Math.round(parseFloat(computedStyle.minHeight) || 110));
      const comfortExtraLines = 3;
      const extraPadding = lineHeight * comfortExtraLines;
      textarea.style.overflowY = "hidden";
      textarea.style.height = "auto";
      const nextHeight = Math.max(minHeight, textarea.scrollHeight + extraPadding);
      textarea.style.height = `${nextHeight}px`;
    };
    const toggleInlineReplyEditorVisibility = (messageId = "", visible = false) => {
      const normalizedMessageId = String(messageId || "").trim();
      if (!normalizedMessageId) return;
      const editor = root.querySelector(`[data-inline-reply-editor="${selectorValue(normalizedMessageId)}"]`);
      if (!editor) return;
      if (!visible && editor.contains(document.activeElement)) {
        const activeElement = document.activeElement;
        if (activeElement && typeof activeElement.blur === "function") activeElement.blur();
      }
      editor.classList.toggle("hidden", !visible);
      if (visible) editor.removeAttribute("aria-hidden");
      else editor.setAttribute("aria-hidden", "true");
    };
    const toggleInlineEditEditorVisibility = (messageId = "", visible = false) => {
      const normalizedMessageId = String(messageId || "").trim();
      if (!normalizedMessageId) return;
      const editor = root.querySelector(`[data-inline-edit-editor="${selectorValue(normalizedMessageId)}"]`);
      const content = root.querySelector(`[data-thread-comment-content="${selectorValue(normalizedMessageId)}"]`);
      if (editor) {
        if (!visible && editor.contains(document.activeElement)) {
          const activeElement = document.activeElement;
          if (activeElement && typeof activeElement.blur === "function") activeElement.blur();
        }
        editor.classList.toggle("hidden", !visible);
        if (visible) editor.removeAttribute("aria-hidden");
        else editor.setAttribute("aria-hidden", "true");
      }
      if (content) content.classList.toggle("hidden", !!visible);
    };
    const clearInlineReplyAttachmentsState = (messageId = "", { keepUploadSession = false } = {}) => {
      const normalizedMessageId = String(messageId || "").trim();
      if (!normalizedMessageId) return;
      const replyUi = resolveInlineReplyUiState();
      const items = Array.isArray(replyUi.attachmentsByMessageId?.[normalizedMessageId])
        ? replyUi.attachmentsByMessageId[normalizedMessageId]
        : [];
      items.forEach((attachment) => releaseAttachmentPreviewUrls(attachment));
      delete replyUi.attachmentsByMessageId[normalizedMessageId];
      if (!keepUploadSession) delete replyUi.uploadSessionByMessageId[normalizedMessageId];
    };
    const addInlineReplyFiles = async (messageId = "", files = []) => {
      const normalizedMessageId = String(messageId || "").trim();
      const list = Array.from(files || []).filter((entry) => !!entry);
      if (!normalizedMessageId || !list.length) return;
      const selection = getScopedSelection(root);
      if (selection?.type !== "sujet") return;
      const subjectId = String(selection?.item?.id || "").trim();
      const projectId = String(selection?.item?.project_id || "").trim();
      if (!subjectId || !projectId || typeof uploadAttachmentFile !== "function") {
        showError("Projet introuvable pour l’upload des pièces jointes.");
        return;
      }
      const { items, uploadSessionId } = getInlineReplyAttachmentsState(normalizedMessageId, { createIfMissing: true });
      const effectiveSessionId = uploadSessionId || createUploadSessionId();
      if (!uploadSessionId) {
        const replyUi = resolveInlineReplyUiState();
        replyUi.uploadSessionByMessageId[normalizedMessageId] = effectiveSessionId;
      }
      for (const file of list) {
        const tempId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const localPreview = toObjectUrl(file);
        const pending = {
          id: "",
          tempId,
          file_name: String(file?.name || "fichier"),
          mime_type: String(file?.type || ""),
          size_bytes: Number(file?.size || 0),
          localPreviewUrl: localPreview,
          remoteObjectUrl: "",
          previewUrl: localPreview,
          isImage: isImageFile(file),
          uploadStatus: "uploading",
          previewStatus: localPreview ? "local" : "none",
          error: ""
        };
        items.push(pending);
        rerenderScope(root);
        try {
          const uploaded = await uploadAttachmentFile({
            subjectId,
            projectId,
            uploadSessionId: effectiveSessionId,
            file,
            sortOrder: items.length - 1,
            parentMessageId: normalizedMessageId
          });
          pending.id = String(uploaded?.id || "");
          pending.storage_path = String(uploaded?.storage_path || "");
          pending.remoteObjectUrl = String(uploaded?.object_url || "");
          pending.object_url = pending.remoteObjectUrl;
          pending.uploadStatus = "ready";
          pending.error = "";
          if (pending.isImage) {
            if (pending.remoteObjectUrl) {
              pending.previewStatus = pending.localPreviewUrl ? "local" : "remote";
              if (!pending.previewUrl) pending.previewUrl = pending.remoteObjectUrl;
            } else if (pending.localPreviewUrl) {
              pending.previewStatus = "local";
            } else {
              pending.previewStatus = "none";
            }
          } else {
            pending.previewStatus = "none";
          }
        } catch (error) {
          pending.uploadStatus = "error";
          pending.previewStatus = pending.localPreviewUrl ? "local" : "none";
          pending.error = String(error?.message || error || "Erreur d'upload");
        }
        rerenderScope(root);
      }
    };
    const removeInlineReplyAttachmentById = async (messageId = "", tempId = "", attachmentId = "") => {
      const normalizedMessageId = String(messageId || "").trim();
      if (!normalizedMessageId) return;
      const { items } = getInlineReplyAttachmentsState(normalizedMessageId);
      const normalizedAttachmentId = String(attachmentId || "").trim();
      const targetIndex = items.findIndex((entry) => String(entry?.tempId || "") === String(tempId || "") || String(entry?.id || "") === normalizedAttachmentId);
      if (targetIndex < 0) return;
      const current = items[targetIndex];
      items.splice(targetIndex, 1);
      rerenderScope(root);
      releaseAttachmentPreviewUrls(current);
      if (!items.length) clearInlineReplyAttachmentsState(normalizedMessageId, { keepUploadSession: true });
      if (normalizedAttachmentId && typeof removeTemporaryAttachment === "function") {
        try {
          await removeTemporaryAttachment({ attachmentId: normalizedAttachmentId });
        } catch (error) {
          console.warn("[subject-attachments] remove temporary attachment failed", error);
        }
      }
    };

    root.querySelectorAll("[data-action='thread-reply-menu-toggle'][data-message-id]").forEach((btn) => {
      btn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const menu = btn.closest(".thread-comment-menu");
        if (!menu) return;
        const dropdown = menu.querySelector(".thread-comment-menu__dropdown");
        if (!dropdown) return;
        debugThreadReply("menu_toggle", { messageId: btn.dataset.messageId || "", wasOpen: dropdown.classList.contains("is-open") });

        root.querySelectorAll(".thread-comment-menu__dropdown.is-open").forEach((opened) => {
          if (opened !== dropdown) opened.classList.remove("is-open");
        });
        dropdown.classList.toggle("is-open");
      };
    });

    root.querySelectorAll("[data-action='thread-reply-open'][data-message-id]").forEach((btn) => {
      btn.onclick = () => {
        const messageId = String(btn.dataset.messageId || "").trim();
        if (!messageId) return;
        const parentMessageText = String(
          btn.closest(".thread-item--comment")
            ?.querySelector(".gh-comment-body")
            ?.textContent || ""
        ).trim();
        debugThreadReply("menu_action_reply", { messageId, parentMessageLength: parentMessageText.length });
        btn.closest(".thread-comment-menu__dropdown")?.classList.remove("is-open");
        const replyUi = resolveInlineReplyUiState();
        const previouslyExpandedMessageId = String(replyUi.expandedMessageId || "").trim();
        if (previouslyExpandedMessageId && previouslyExpandedMessageId !== messageId) {
          clearInlineReplyAttachmentsState(previouslyExpandedMessageId);
        }
        if (!String(replyUi.draftsByMessageId?.[messageId] || "").trim()) replyUi.draftsByMessageId[messageId] = "";
        replyUi.previewByMessageId[messageId] = false;
        replyUi.expandedMessageId = messageId;
        debugThreadReply("reply_opened", {
          messageId,
          hasDraft: !!String(replyUi.draftsByMessageId?.[messageId] || "").trim()
        });
        if (previouslyExpandedMessageId && previouslyExpandedMessageId !== messageId) {
          toggleInlineReplyEditorVisibility(previouslyExpandedMessageId, false);
        }
        toggleInlineReplyEditorVisibility(messageId, true);
        const textarea = root.querySelector(`[data-thread-reply-draft="${selectorValue(messageId)}"]`);
        if (textarea) {
          textarea.value = String(replyUi.draftsByMessageId?.[messageId] || "");
          syncInlineReplyTextareaHeight(textarea);
          syncInlineReplySubmitButton(messageId);
          requestAnimationFrame(() => {
            debugThreadReply("reply_editor_presence", { messageId, found: true });
            textarea.focus();
          });
        } else {
          rerenderScope(root);
        }
      };
    });

    root.querySelectorAll("[data-action='thread-message-edit'][data-message-id]").forEach((btn) => {
      btn.onclick = () => {
        const messageId = String(btn.dataset.messageId || "").trim();
        if (!messageId) return;
        btn.closest(".thread-comment-menu__dropdown")?.classList.remove("is-open");
        const replyUi = resolveInlineReplyUiState();
        const currentBody = String(btn.dataset.messageBody || "");
        if (!String(replyUi.editDraftsByMessageId?.[messageId] || "").trim()) {
          replyUi.editDraftsByMessageId[messageId] = currentBody;
        }
        const previousEditMessageId = String(replyUi.editMessageId || "").trim();
        replyUi.editPreviewByMessageId[messageId] = false;
        replyUi.editMessageId = messageId;
        if (previousEditMessageId && previousEditMessageId !== messageId) {
          toggleInlineEditEditorVisibility(previousEditMessageId, false);
        }
        toggleInlineEditEditorVisibility(messageId, true);
        const textarea = root.querySelector(`[data-thread-edit-draft="${selectorValue(messageId)}"]`);
        if (textarea) {
          textarea.value = String(replyUi.editDraftsByMessageId?.[messageId] || "");
          syncInlineReplyTextareaHeight(textarea);
          syncInlineEditSubmitButton(messageId);
          requestAnimationFrame(() => textarea.focus());
        } else {
          rerenderScope(root);
        }
      };
    });

    root.querySelectorAll("[data-action='thread-message-delete'][data-message-id]").forEach((btn) => {
      btn.onclick = async () => {
        const selection = getScopedSelection(root);
        if (selection?.type !== "sujet") return;
        const messageId = String(btn.dataset.messageId || "").trim();
        if (!messageId) return;
        const confirmed = window.confirm("Supprimer ce message ?");
        if (!confirmed) return;
        btn.closest(".thread-comment-menu__dropdown")?.classList.remove("is-open");
        try {
          await deleteSubjectMessage?.(selection.item.id, messageId);
        } catch (error) {
          showError(`Suppression impossible : ${String(error?.message || error || "Erreur inconnue")}`);
        }
      };
    });

    root.querySelectorAll("[data-action='thread-message-reaction-toggle'][data-message-id][data-reaction-code]").forEach((btn) => {
      btn.onclick = async () => {
        const selection = getScopedSelection(root);
        if (selection?.type !== "sujet") return;
        const messageId = String(btn.dataset.messageId || "").trim();
        const reactionCode = String(btn.dataset.reactionCode || "").trim();
        if (!messageId || !reactionCode) return;
        btn.closest(".thread-comment-menu__dropdown")?.classList.remove("is-open");
        try {
          await toggleSubjectMessageReaction?.(selection.item.id, messageId, reactionCode);
        } catch (error) {
          showError(`Réaction impossible : ${String(error?.message || error || "Erreur inconnue")}`);
        }
      };
    });

    const syncInlineEmojiPopup = (textarea, composerKey) => {
      const emojiState = getEmojiState();
      const mentionContext = resolveMentionTriggerContext(textarea.value || "", textarea.selectionStart || 0);
      if (mentionContext) {
        if (emojiState.open && String(emojiState.composerKey || "") === composerKey) closeEmojiPopup();
        return;
      }
      const context = resolveEmojiTriggerContext(textarea.value || "", textarea.selectionStart || 0);
      if (!context) {
        if (emojiState.open && String(emojiState.composerKey || "") === composerKey) closeEmojiPopup();
        return;
      }
      const query = String(context?.query || "").trim().toLowerCase();
      const suggestions = searchEmojiSuggestions(query, 200);
      emojiState.open = true;
      emojiState.query = query;
      emojiState.activeIndex = Math.max(0, Math.min(Number(emojiState.activeIndex || 0), Math.max(0, suggestions.length - 1)));
      emojiState.triggerStart = Number(context?.triggerStart ?? -1);
      emojiState.triggerEnd = Number(context?.triggerEnd ?? -1);
      emojiState.suggestions = suggestions;
      emojiState.composerKey = composerKey;
      const { mode, messageId = "" } = splitComposerKey(composerKey);
      const selector = getTextareaSelector({ composerKey: mode, messageId });
      rerenderAutocompleteUi({
        selector,
        shouldFocus: true,
        caretStart: Number(textarea.selectionStart || 0),
        caretEnd: Number(textarea.selectionEnd || 0)
      });
    };

    const syncInlineAutocomplete = async (textarea, composerKey) => {
      const mentionContext = resolveMentionTriggerContext(textarea.value || "", textarea.selectionStart || 0);
      if (mentionContext) {
        await syncMentionPopupForTextarea(textarea, composerKey);
        closeEmojiPopup({ rerender: false });
        return;
      }
      const mentionState = getMentionState();
      if (mentionState.open && String(mentionState.composerKey || "") === composerKey) {
        closeMentionPopup({ rerender: false });
      }
      syncInlineEmojiPopup(textarea, composerKey);
    };

    const applyInlineEmojiSuggestion = (textarea, suggestion = {}) => {
      const emojiState = getEmojiState();
      const context = {
        triggerStart: emojiState.triggerStart,
        triggerEnd: Number(textarea.selectionStart || emojiState.triggerEnd || 0)
      };
      const result = applyEmojiSuggestion(textarea.value || "", context, suggestion);
      textarea.value = String(result.nextText || "");
      textarea.focus();
      textarea.selectionStart = result.nextCursorIndex;
      textarea.selectionEnd = result.nextCursorIndex;
      closeEmojiPopup({ rerender: false });
      return result;
    };

    const applyEmojiSuggestionByComposerKey = (composerKey, suggestion = {}) => {
      const normalizedKey = String(composerKey || "").trim();
      if (!normalizedKey) return;
      const textarea = getTextareaForComposerKey(normalizedKey);
      if (!textarea) return;
      const [mode = "main", messageId = ""] = normalizedKey.split(":");
      if (normalizedKey === "main") {
        const emojiState = getEmojiState();
        const context = {
          triggerStart: emojiState.triggerStart,
          triggerEnd: Number(textarea.selectionStart || emojiState.triggerEnd || 0)
        };
        const result = applyEmojiSuggestion(textarea.value || "", context, suggestion);
        textarea.value = result.nextText;
        store.situationsView.commentDraft = String(result.nextText || "");
        textarea.focus();
        textarea.selectionStart = result.nextCursorIndex;
        textarea.selectionEnd = result.nextCursorIndex;
        closeEmojiPopup({ rerender: false });
        if (store.situationsView.commentPreviewMode) syncCommentPreview(root);
        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = Math.max(16, Math.round(parseFloat(computedStyle.lineHeight) || 20));
        const minHeight = Math.max(170, Math.round(parseFloat(computedStyle.minHeight) || 170));
        const comfortExtraLines = 3;
        const extraPadding = lineHeight * comfortExtraLines;
        textarea.style.overflowY = "hidden";
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(minHeight, textarea.scrollHeight + extraPadding)}px`;
        rerenderAutocompleteUi();
        return;
      }
      const result = applyInlineEmojiSuggestion(textarea, suggestion);
      const replyUi = resolveInlineReplyUiState();
      if (mode === "reply") {
        replyUi.draftsByMessageId[messageId] = String(result.nextText || "");
        syncInlineReplySubmitButton(messageId);
      } else {
        replyUi.editDraftsByMessageId[messageId] = String(result.nextText || "");
        syncInlineEditSubmitButton(messageId);
      }
      syncInlineReplyTextareaHeight(textarea);
      rerenderAutocompleteUi();
    };

    root.querySelectorAll("[data-thread-reply-draft]").forEach((textarea) => {
      syncInlineReplyTextareaHeight(textarea);
      textarea.addEventListener("input", () => {
        const messageId = String(textarea.dataset.threadReplyDraft || "").trim();
        if (!messageId) return;
        const replyUi = resolveInlineReplyUiState();
        replyUi.draftsByMessageId[messageId] = String(textarea.value || "");
        syncInlineReplyTextareaHeight(textarea);
        syncInlineReplySubmitButton(messageId);
        void syncInlineAutocomplete(textarea, `reply:${messageId}`);
      });
      textarea.addEventListener("keydown", (event) => {
        const messageId = String(textarea.dataset.threadReplyDraft || "").trim();
        const composerKey = `reply:${messageId}`;
        const mentionState = getMentionState();
        const emojiState = getEmojiState();
        if (event.key === "Escape") {
          if (mentionState.open && String(mentionState.composerKey || "") === composerKey) {
            event.preventDefault();
            closeMentionPopup({
              selector: getTextareaSelector({ composerKey: "reply", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (emojiState.open && String(emojiState.composerKey || "") === composerKey) {
            event.preventDefault();
            closeEmojiPopup({
              selector: getTextareaSelector({ composerKey: "reply", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
        }
        if (mentionState.open && String(mentionState.composerKey || "") === composerKey && Array.isArray(mentionState.suggestions) && mentionState.suggestions.length) {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const delta = event.key === "ArrowDown" ? 1 : -1;
            mentionState.activeIndex = (Number(mentionState.activeIndex || 0) + delta + mentionState.suggestions.length) % mentionState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "reply", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            pickMentionSuggestion(mentionState.suggestions[Number(mentionState.activeIndex || 0)] || mentionState.suggestions[0], composerKey);
            return;
          }
        }
        if (emojiState.open && String(emojiState.composerKey || "") === composerKey && Array.isArray(emojiState.suggestions) && emojiState.suggestions.length) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) + EMOJI_GRID_COLUMNS) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "reply", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) - EMOJI_GRID_COLUMNS + emojiState.suggestions.length) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "reply", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) + 1) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "reply", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) - 1 + emojiState.suggestions.length) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "reply", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const result = applyInlineEmojiSuggestion(textarea, emojiState.suggestions[Number(emojiState.activeIndex || 0)] || emojiState.suggestions[0]);
            const replyUi = resolveInlineReplyUiState();
            if (messageId) replyUi.draftsByMessageId[messageId] = String(result.nextText || "");
            syncInlineReplyTextareaHeight(textarea);
            syncInlineReplySubmitButton(messageId);
            return;
          }
        }
        if (CARET_NAVIGATION_KEYS.has(event.key)) {
          requestAnimationFrame(() => { void syncInlineAutocomplete(textarea, composerKey); });
        }
        if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
        event.preventDefault();
        const submitButton = textarea.closest(".thread-inline-reply-editor")?.querySelector("[data-action='thread-reply-submit'][data-message-id]");
        if (messageId) syncInlineReplySubmitButton(messageId);
        if (submitButton && !submitButton.disabled) submitButton.click();
      });
      const composerKey = `reply:${String(textarea.dataset.threadReplyDraft || "").trim()}`;
      textarea.addEventListener("click", () => { void syncInlineAutocomplete(textarea, composerKey); });
      textarea.addEventListener("keyup", () => { void syncInlineAutocomplete(textarea, composerKey); });
      textarea.addEventListener("scroll", () => positionAllAutocompletePopups());
    });

    root.querySelectorAll("[data-thread-edit-draft]").forEach((textarea) => {
      syncInlineReplyTextareaHeight(textarea);
      textarea.addEventListener("input", () => {
        const messageId = String(textarea.dataset.threadEditDraft || "").trim();
        if (!messageId) return;
        const replyUi = resolveInlineReplyUiState();
        replyUi.editDraftsByMessageId[messageId] = String(textarea.value || "");
        syncInlineReplyTextareaHeight(textarea);
        syncInlineEditSubmitButton(messageId);
        void syncInlineAutocomplete(textarea, `edit:${messageId}`);
      });
      textarea.addEventListener("keydown", (event) => {
        const messageId = String(textarea.dataset.threadEditDraft || "").trim();
        const composerKey = `edit:${messageId}`;
        const mentionState = getMentionState();
        const emojiState = getEmojiState();
        if (event.key === "Escape") {
          if (mentionState.open && String(mentionState.composerKey || "") === composerKey) {
            event.preventDefault();
            closeMentionPopup({
              selector: getTextareaSelector({ composerKey: "edit", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (emojiState.open && String(emojiState.composerKey || "") === composerKey) {
            event.preventDefault();
            closeEmojiPopup({
              selector: getTextareaSelector({ composerKey: "edit", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
        }
        if (mentionState.open && String(mentionState.composerKey || "") === composerKey && Array.isArray(mentionState.suggestions) && mentionState.suggestions.length) {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const delta = event.key === "ArrowDown" ? 1 : -1;
            mentionState.activeIndex = (Number(mentionState.activeIndex || 0) + delta + mentionState.suggestions.length) % mentionState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "edit", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            pickMentionSuggestion(mentionState.suggestions[Number(mentionState.activeIndex || 0)] || mentionState.suggestions[0], composerKey);
            return;
          }
        }
        if (emojiState.open && String(emojiState.composerKey || "") === composerKey && Array.isArray(emojiState.suggestions) && emojiState.suggestions.length) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) + EMOJI_GRID_COLUMNS) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "edit", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) - EMOJI_GRID_COLUMNS + emojiState.suggestions.length) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "edit", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) + 1) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "edit", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            emojiState.activeIndex = (Number(emojiState.activeIndex || 0) - 1 + emojiState.suggestions.length) % emojiState.suggestions.length;
            rerenderAutocompleteUi({
              selector: getTextareaSelector({ composerKey: "edit", messageId }),
              shouldFocus: true,
              caretStart: Number(textarea.selectionStart || 0),
              caretEnd: Number(textarea.selectionEnd || 0)
            });
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const result = applyInlineEmojiSuggestion(textarea, emojiState.suggestions[Number(emojiState.activeIndex || 0)] || emojiState.suggestions[0]);
            const replyUi = resolveInlineReplyUiState();
            if (messageId) replyUi.editDraftsByMessageId[messageId] = String(result.nextText || "");
            syncInlineReplyTextareaHeight(textarea);
            syncInlineEditSubmitButton(messageId);
            return;
          }
        }
        if (CARET_NAVIGATION_KEYS.has(event.key)) {
          requestAnimationFrame(() => { void syncInlineAutocomplete(textarea, composerKey); });
        }
        if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
        event.preventDefault();
        const submitButton = textarea.closest(".thread-inline-edit-editor")?.querySelector("[data-action='thread-edit-submit'][data-message-id]");
        if (messageId) syncInlineEditSubmitButton(messageId);
        if (submitButton && !submitButton.disabled) submitButton.click();
      });
      const composerKey = `edit:${String(textarea.dataset.threadEditDraft || "").trim()}`;
      textarea.addEventListener("click", () => { void syncInlineAutocomplete(textarea, composerKey); });
      textarea.addEventListener("keyup", () => { void syncInlineAutocomplete(textarea, composerKey); });
      textarea.addEventListener("scroll", () => positionAllAutocompletePopups());
    });

    root.querySelectorAll("[data-action='thread-reply-tab-write']").forEach((btn) => {
      btn.onclick = () => {
        const messageId = String(btn.closest("[data-inline-reply-editor]")?.dataset.inlineReplyEditor || "").trim();
        if (!messageId) return;
        const replyUi = resolveInlineReplyUiState();
        replyUi.previewByMessageId[messageId] = false;
        const writeTab = btn.closest(".comment-composer")?.querySelector("[data-action='thread-reply-tab-write']");
        const previewTab = btn.closest(".comment-composer")?.querySelector("[data-action='thread-reply-tab-preview']");
        const composerRoot = btn.closest(".comment-composer");
        const textareaWrap = composerRoot?.querySelector(".comment-composer__editor");
        const previewWrap = composerRoot?.querySelector(".comment-composer__preview-wrap");
        writeTab?.classList.add("is-active");
        previewTab?.classList.remove("is-active");
        writeTab?.setAttribute("aria-selected", "true");
        previewTab?.setAttribute("aria-selected", "false");
        textareaWrap?.classList.remove("hidden");
        previewWrap?.classList.add("hidden");
      };
    });

    root.querySelectorAll("[data-action='thread-reply-tab-preview']").forEach((btn) => {
      btn.onclick = () => {
        const messageId = String(btn.closest("[data-inline-reply-editor]")?.dataset.inlineReplyEditor || "").trim();
        if (!messageId) return;
        const replyUi = resolveInlineReplyUiState();
        replyUi.previewByMessageId[messageId] = true;
        const composerRoot = btn.closest(".comment-composer");
        const textarea = composerRoot?.querySelector(`[data-thread-reply-draft="${selectorValue(messageId)}"]`);
        const previewWrap = composerRoot?.querySelector(".comment-composer__preview");
        const previewWrapContainer = composerRoot?.querySelector(".comment-composer__preview-wrap");
        const writeTab = composerRoot?.querySelector("[data-action='thread-reply-tab-write']");
        const previewTab = composerRoot?.querySelector("[data-action='thread-reply-tab-preview']");
        writeTab?.classList.remove("is-active");
        previewTab?.classList.add("is-active");
        writeTab?.setAttribute("aria-selected", "false");
        previewTab?.setAttribute("aria-selected", "true");
        composerRoot?.querySelector(".comment-composer__editor")?.classList.add("hidden");
        previewWrapContainer?.classList.remove("hidden");
        if (previewWrap) {
          const markdown = String(textarea?.value || replyUi.draftsByMessageId?.[messageId] || "");
          previewWrap.innerHTML = markdown.trim() ? mdToHtml(markdown) : `<div class="comment-composer__preview-empty">Use Markdown to format your reply</div>`;
        }
      };
    });

    root.querySelectorAll("[data-action='thread-edit-tab-write']").forEach((btn) => {
      btn.onclick = () => {
        const messageId = String(btn.closest("[data-inline-edit-editor]")?.dataset.inlineEditEditor || "").trim();
        if (!messageId) return;
        const replyUi = resolveInlineReplyUiState();
        replyUi.editPreviewByMessageId[messageId] = false;
        const composerRoot = btn.closest(".comment-composer");
        const writeTab = composerRoot?.querySelector("[data-action='thread-edit-tab-write']");
        const previewTab = composerRoot?.querySelector("[data-action='thread-edit-tab-preview']");
        writeTab?.classList.add("is-active");
        previewTab?.classList.remove("is-active");
        writeTab?.setAttribute("aria-selected", "true");
        previewTab?.setAttribute("aria-selected", "false");
        composerRoot?.querySelector(".comment-composer__editor")?.classList.remove("hidden");
        composerRoot?.querySelector(".comment-composer__preview-wrap")?.classList.add("hidden");
      };
    });

    root.querySelectorAll("[data-action='thread-edit-tab-preview']").forEach((btn) => {
      btn.onclick = () => {
        const messageId = String(btn.closest("[data-inline-edit-editor]")?.dataset.inlineEditEditor || "").trim();
        if (!messageId) return;
        const replyUi = resolveInlineReplyUiState();
        replyUi.editPreviewByMessageId[messageId] = true;
        const composerRoot = btn.closest(".comment-composer");
        const textarea = composerRoot?.querySelector(`[data-thread-edit-draft="${selectorValue(messageId)}"]`);
        const previewWrap = composerRoot?.querySelector(".comment-composer__preview");
        const previewWrapContainer = composerRoot?.querySelector(".comment-composer__preview-wrap");
        const writeTab = composerRoot?.querySelector("[data-action='thread-edit-tab-write']");
        const previewTab = composerRoot?.querySelector("[data-action='thread-edit-tab-preview']");
        writeTab?.classList.remove("is-active");
        previewTab?.classList.add("is-active");
        writeTab?.setAttribute("aria-selected", "false");
        previewTab?.setAttribute("aria-selected", "true");
        composerRoot?.querySelector(".comment-composer__editor")?.classList.add("hidden");
        previewWrapContainer?.classList.remove("hidden");
        if (previewWrap) {
          const markdown = String(textarea?.value || replyUi.editDraftsByMessageId?.[messageId] || "");
          previewWrap.innerHTML = markdown.trim() ? mdToHtml(markdown) : `<div class="comment-composer__preview-empty">Use Markdown to format your comment</div>`;
        }
      };
    });

    root.querySelectorAll("[data-action='thread-reply-format'][data-format][data-message-id]").forEach((btn) => {
      btn.onclick = () => {
        const action = String(btn.dataset.format || "").trim();
        const messageId = String(btn.dataset.messageId || "").trim();
        if (!action || !messageId) return;
        const textarea = root.querySelector(`[data-thread-reply-draft="${selectorValue(messageId)}"]`);
        if (!textarea) return;
        const didApply = applyMarkdownComposerAction(textarea, action);
        if (!didApply) return;
        const replyUi = resolveInlineReplyUiState();
        replyUi.draftsByMessageId[messageId] = String(textarea.value || "");
        syncInlineReplyTextareaHeight(textarea);
        syncInlineReplySubmitButton(messageId);
        if (action === "mention") void syncMentionPopupForTextarea(textarea, `reply:${messageId}`, { forceOpen: true });
        else {
          closeMentionPopup({ rerender: false });
          closeEmojiPopup({ rerender: false });
        }
        textarea.focus();
      };
    });

    root.querySelectorAll("[data-action='thread-edit-format'][data-format][data-message-id]").forEach((btn) => {
      btn.onclick = () => {
        const action = String(btn.dataset.format || "").trim();
        const messageId = String(btn.dataset.messageId || "").trim();
        if (!action || !messageId) return;
        const textarea = root.querySelector(`[data-thread-edit-draft="${selectorValue(messageId)}"]`);
        if (!textarea) return;
        const didApply = applyMarkdownComposerAction(textarea, action);
        if (!didApply) return;
        const replyUi = resolveInlineReplyUiState();
        replyUi.editDraftsByMessageId[messageId] = String(textarea.value || "");
        syncInlineReplyTextareaHeight(textarea);
        syncInlineEditSubmitButton(messageId);
        if (action === "mention") void syncMentionPopupForTextarea(textarea, `edit:${messageId}`, { forceOpen: true });
        else {
          closeMentionPopup({ rerender: false });
          closeEmojiPopup({ rerender: false });
        }
        textarea.focus();
      };
    });
    root.querySelectorAll("[data-action='thread-reply-attachments-pick'][data-message-id]").forEach((btn) => {
      btn.onclick = () => {
        const messageId = String(btn.dataset.messageId || "").trim();
        if (!messageId) return;
        const input = root.querySelector(`[data-role='thread-reply-file-input'][data-message-id="${selectorValue(messageId)}"]`);
        input?.click();
      };
    });
    root.querySelectorAll("[data-role='thread-reply-file-input'][data-message-id]").forEach((input) => {
      input.addEventListener("change", async (event) => {
        const messageId = String(input.dataset.messageId || "").trim();
        const files = Array.from(event?.target?.files || []);
        if (messageId && files.length) await addInlineReplyFiles(messageId, files);
        input.value = "";
      });
    });
    root.querySelectorAll("[data-inline-reply-editor]").forEach((editor) => {
      const messageId = String(editor.dataset.inlineReplyEditor || "").trim();
      if (!messageId) return;
      const dropzone = editor.querySelector(".comment-composer__editor");
      if (!dropzone) return;
      ["dragenter", "dragover"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (event) => {
          event.preventDefault();
          event.stopPropagation();
          dropzone.classList.add("is-dragover");
        });
      });
      ["dragleave", "dragend", "drop"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (event) => {
          event.preventDefault();
          event.stopPropagation();
          dropzone.classList.remove("is-dragover");
        });
      });
      dropzone.addEventListener("drop", async (event) => {
        const files = Array.from(event?.dataTransfer?.files || []);
        if (files.length) await addInlineReplyFiles(messageId, files);
      });
    });
    root.querySelectorAll("[data-action='thread-reply-attachment-remove'][data-message-id]").forEach((btn) => {
      btn.onclick = async () => {
        await removeInlineReplyAttachmentById(
          String(btn.dataset.messageId || ""),
          String(btn.dataset.tempId || ""),
          String(btn.dataset.attachmentId || "")
        );
      };
    });

    root.querySelectorAll("[data-action='thread-reply-cancel'][data-message-id]").forEach((btn) => {
      btn.onclick = () => {
        const messageId = String(btn.dataset.messageId || "").trim();
        debugThreadReply("reply_cancel", { messageId });
        const replyUi = resolveInlineReplyUiState();
        if (messageId) replyUi.draftsByMessageId[messageId] = "";
        if (messageId) replyUi.previewByMessageId[messageId] = false;
        if (messageId) clearInlineReplyAttachmentsState(messageId);
        replyUi.expandedMessageId = "";
        toggleInlineReplyEditorVisibility(messageId, false);
      };
    });

    root.querySelectorAll("[data-action='thread-reply-submit'][data-message-id]").forEach((btn) => {
      btn.onclick = async () => {
        const selection = getScopedSelection(root);
        if (selection?.type !== "sujet") return;
        const parentMessageId = String(btn.dataset.messageId || "").trim();
        if (!parentMessageId) return;
        const replyUi = resolveInlineReplyUiState();
        const message = String(replyUi.draftsByMessageId?.[parentMessageId] || "").trim();
        const inlineAttachmentsState = getInlineReplyAttachmentsState(parentMessageId);
        const hasReadyAttachment = Array.isArray(inlineAttachmentsState?.items)
          && inlineAttachmentsState.items.some((attachment) => String(attachment?.uploadStatus || "").trim() === "ready" && !attachment?.error);
        if (!message && !hasReadyAttachment) return;
        const mentions = extractStructuredMentions(message);
        const uploadSessionId = hasReadyAttachment ? String(inlineAttachmentsState.uploadSessionId || "").trim() : "";
        debugThreadReply("reply_submit", { parentMessageId, messageLength: message.length });
        await addComment("sujet", selection.item.id, message, {
          actor: "Human",
          agent: "human",
          parentMessageId,
          uploadSessionId,
          mentions
        });
        replyUi.draftsByMessageId[parentMessageId] = "";
        replyUi.previewByMessageId[parentMessageId] = false;
        clearInlineReplyAttachmentsState(parentMessageId);
        replyUi.expandedMessageId = "";
        rerenderScope(root);
      };
    });

    root.querySelectorAll("[data-action='thread-edit-cancel'][data-message-id]").forEach((btn) => {
      btn.onclick = () => {
        const messageId = String(btn.dataset.messageId || "").trim();
        const replyUi = resolveInlineReplyUiState();
        if (messageId) replyUi.editPreviewByMessageId[messageId] = false;
        replyUi.editMessageId = "";
        toggleInlineEditEditorVisibility(messageId, false);
      };
    });

    root.querySelectorAll("[data-action='thread-edit-submit'][data-message-id]").forEach((btn) => {
      btn.onclick = async () => {
        const selection = getScopedSelection(root);
        if (selection?.type !== "sujet") return;
        const messageId = String(btn.dataset.messageId || "").trim();
        if (!messageId) return;
        const replyUi = resolveInlineReplyUiState();
        const nextBody = String(replyUi.editDraftsByMessageId?.[messageId] || "");
        const normalized = nextBody.trim();
        if (!normalized) return;
        const currentBody = String(btn.dataset.originalBody || "");
        if (normalized === currentBody.trim()) {
          replyUi.editPreviewByMessageId[messageId] = false;
          replyUi.editMessageId = "";
          rerenderScope(root);
          return;
        }
        try {
          await editSubjectMessage?.(selection.item.id, messageId, normalized);
          replyUi.editPreviewByMessageId[messageId] = false;
          replyUi.editMessageId = "";
        } catch (error) {
          showError(`Modification impossible : ${String(error?.message || error || "Erreur inconnue")}`);
        } finally {
          rerenderScope(root);
        }
      };
    });

    root.querySelectorAll(".thread-comment-menu__dropdown").forEach((dropdown) => {
      dropdown.addEventListener("click", (event) => event.stopPropagation());
    });

    if (root.dataset.threadReplyDropdownDocumentBound !== "true") {
      document.addEventListener("click", () => {
        root.querySelectorAll(".thread-comment-menu__dropdown.is-open").forEach((opened) => {
          opened.classList.remove("is-open");
        });
      });
      root.dataset.threadReplyDropdownDocumentBound = "true";
    }
    const autocompleteLayer = getAutocompleteLayer();
    if (autocompleteLayer && autocompleteLayer.layer.dataset.subjectAutocompleteBound !== "true") {
      autocompleteLayer.layer.addEventListener("mousedown", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("[data-action='mention-pick'], [data-action='emoji-pick']")) {
          event.preventDefault();
        }
      });
      autocompleteLayer.layer.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const mentionBtn = target.closest("[data-action='mention-pick'][data-person-id]");
        if (mentionBtn instanceof HTMLElement) {
          pickMentionSuggestion({
            personId: String(mentionBtn.dataset.personId || "").trim(),
            label: String(mentionBtn.dataset.label || "").trim()
          }, String(mentionBtn.dataset.composerKey || "main"));
          return;
        }
        const emojiBtn = target.closest("[data-action='emoji-pick'][data-composer-key]");
        if (!(emojiBtn instanceof HTMLElement)) return;
        const composerKey = String(emojiBtn.dataset.composerKey || "").trim();
        if (!composerKey) return;
        applyEmojiSuggestionByComposerKey(composerKey, {
          emoji: String(emojiBtn.dataset.emoji || "").trim(),
          shortcode: String(emojiBtn.dataset.shortcode || "").trim()
        });
      });
      autocompleteLayer.layer.dataset.subjectAutocompleteBound = "true";
    }
    if (root.dataset.subjectEmojiDocumentBound !== "true") {
      document.addEventListener("click", (event) => {
        const target = event?.target;
        if (!target || !(target instanceof Element)) return;
        if (target.closest("#subject-autocomplete-layer")) return;
        if (
          target.closest("#humanCommentBox")
          || target.closest("[data-thread-reply-draft]")
          || target.closest("[data-thread-edit-draft]")
        ) {
          return;
        }
        const emojiState = getEmojiState();
        if (!emojiState.open) return;
        closeEmojiPopup();
      });
      root.dataset.subjectEmojiDocumentBound = "true";
    }
    if (root.dataset.subjectAutocompletePositionBound !== "true") {
      const syncPopupPositions = () => {
        requestAnimationFrame(() => positionAllAutocompletePopups());
      };
      window.addEventListener("resize", syncPopupPositions);
      window.addEventListener("scroll", syncPopupPositions);
      document.addEventListener("scroll", syncPopupPositions, true);
      document.addEventListener("selectionchange", () => {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLTextAreaElement)) return;
        if (!root.contains(activeElement)) return;
        positionAllAutocompletePopups();
      });
      root.dataset.subjectAutocompletePositionBound = "true";
    }
    if (root.dataset.subjectAutocompleteEscapeBound !== "true") {
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        const mentionState = getMentionState();
        const emojiState = getEmojiState();
        const mentionOpen = !!mentionState.open;
        const emojiOpen = !!emojiState.open;
        if (!mentionOpen && !emojiOpen) return;
        event.preventDefault();
        const fallbackComposerKey = String(mentionState.composerKey || emojiState.composerKey || "main");
        closeMentionPopup({ rerender: false });
        closeEmojiPopup({ rerender: false });
        rerenderAutocompleteUi();
        focusComposerTextarea(fallbackComposerKey);
      });
      root.dataset.subjectAutocompleteEscapeBound = "true";
    }
    requestAnimationFrame(() => positionAllAutocompletePopups());

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

      const parentSubjectCard = event.target.closest(".subject-meta-parent-card[data-parent-subject-id]");
      if (parentSubjectCard) {
        event.preventDefault();
        event.stopPropagation();
        const parentSubjectId = String(parentSubjectCard.dataset.parentSubjectId || "");
        if (parentSubjectId) {
          (openDrilldownFromSubjectPanel || openDrilldownFromSujetPanel)(parentSubjectId);
        }
        return;
      }

      const parentSubjectLink = event.target.closest(".js-details-parent-subject-link[data-parent-subject-id]");
      if (parentSubjectLink) {
        event.preventDefault();
        event.stopPropagation();
        const parentSubjectId = String(parentSubjectLink.dataset.parentSubjectId || "");
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
