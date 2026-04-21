export function createProjectSubjectsTitle(config = {}) {
  const {
    store,
    ensureViewUiState,
    currentDecisionTarget,
    getSelectionEntityType,
    getEntityByType,
    rerenderScope,
    updateSubjectTitle
  } = config;

  function getSubjectsViewStore() {
    ensureViewUiState?.();
    if (!store.projectSubjectsView || typeof store.projectSubjectsView !== "object") {
      store.projectSubjectsView = {};
    }
    return store.projectSubjectsView;
  }

  function ensureSubjectTitleEditState() {
    const view = getSubjectsViewStore();
    view.subjectTitleEdit ??= {
      entityType: null,
      entityId: null,
      draft: "",
      initialTitle: "",
      isSaving: false,
      error: ""
    };
    if (typeof view.subjectTitleEdit.isSaving !== "boolean") view.subjectTitleEdit.isSaving = false;
    if (typeof view.subjectTitleEdit.error !== "string") view.subjectTitleEdit.error = "";
    if (typeof view.subjectTitleEdit.initialTitle !== "string") view.subjectTitleEdit.initialTitle = "";
    return view.subjectTitleEdit;
  }

  function getSubjectTitleEditState() {
    return ensureSubjectTitleEditState();
  }

  function clearSubjectTitleEditState() {
    const view = getSubjectsViewStore();
    view.subjectTitleEdit = {
      entityType: null,
      entityId: null,
      draft: "",
      initialTitle: "",
      isSaving: false,
      error: ""
    };
  }

  function getCurrentTitle(entityType, entityId, targetItem = null) {
    const fromTarget = String(targetItem?.title || "");
    if (fromTarget) return fromTarget;
    const entity = getEntityByType?.(entityType, entityId);
    return String(entity?.title || "");
  }

  function isEditingSubjectTitle(selection = null) {
    const edit = ensureSubjectTitleEditState();
    if (edit.entityType !== "sujet") return false;
    if (!selection?.item?.id) return false;
    const entityType = getSelectionEntityType?.(selection.type);
    return entityType === "sujet" && String(edit.entityId || "") === String(selection.item.id || "");
  }

  function startSubjectTitleEdit(root) {
    const target = currentDecisionTarget?.(root);
    if (!target) return false;
    const entityType = getSelectionEntityType?.(target.type);
    if (entityType !== "sujet") return false;

    const currentTitle = getCurrentTitle(entityType, target.id, target.item);
    const view = getSubjectsViewStore();
    view.subjectTitleEdit = {
      entityType,
      entityId: target.id,
      draft: currentTitle,
      initialTitle: currentTitle,
      isSaving: false,
      error: ""
    };
    rerenderScope?.(root);
    return true;
  }

  function cancelSubjectTitleEdit(root = null) {
    clearSubjectTitleEditState();
    if (root) rerenderScope?.(root);
  }

  function syncSubjectTitleDraft(root) {
    if (!root || typeof root.querySelector !== "function") return;
    const input = root.querySelector("[data-subject-title-draft]");
    if (!input) return;
    const edit = ensureSubjectTitleEditState();
    edit.draft = String(input.value || "");
    edit.error = "";
  }

  function applySubjectTitleToLocalState(subjectId, payload = {}, target = null) {
    const subjectKey = String(subjectId || "").trim();
    if (!subjectKey) return;
    const nextTitle = String(payload?.title || "");
    const nextNormalizedTitle = String(payload?.normalized_title || "");
    const nextUpdatedAt = String(payload?.updated_at || "");

    if (target?.item && typeof target.item === "object") {
      target.item.title = nextTitle;
      if (Object.prototype.hasOwnProperty.call(target.item, "normalized_title") || nextNormalizedTitle) {
        target.item.normalized_title = nextNormalizedTitle;
      }
      if (nextUpdatedAt) target.item.updated_at = nextUpdatedAt;
      if (target.item.raw && typeof target.item.raw === "object") {
        target.item.raw.title = nextTitle;
        if (Object.prototype.hasOwnProperty.call(target.item.raw, "normalized_title") || nextNormalizedTitle) {
          target.item.raw.normalized_title = nextNormalizedTitle;
        }
        if (nextUpdatedAt) target.item.raw.updated_at = nextUpdatedAt;
      }
    }

    const rawSubjectsResult = store.projectSubjectsView?.rawSubjectsResult;
    const rawSubject = rawSubjectsResult?.subjectsById?.[subjectKey];
    if (rawSubject && typeof rawSubject === "object") {
      rawSubject.title = nextTitle;
      rawSubject.normalized_title = nextNormalizedTitle;
      if (nextUpdatedAt) rawSubject.updated_at = nextUpdatedAt;
      if (rawSubject.raw && typeof rawSubject.raw === "object") {
        rawSubject.raw.title = nextTitle;
        rawSubject.raw.normalized_title = nextNormalizedTitle;
        if (nextUpdatedAt) rawSubject.raw.updated_at = nextUpdatedAt;
      }
    }

    const subjectsData = Array.isArray(store.projectSubjectsView?.subjectsData)
      ? store.projectSubjectsView.subjectsData
      : [];
    const stack = [...subjectsData];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (String(node.id || "") === subjectKey) {
        node.title = nextTitle;
        if (Object.prototype.hasOwnProperty.call(node, "normalized_title") || nextNormalizedTitle) {
          node.normalized_title = nextNormalizedTitle;
        }
        if (nextUpdatedAt) node.updated_at = nextUpdatedAt;
        if (node.raw && typeof node.raw === "object") {
          node.raw.title = nextTitle;
          if (Object.prototype.hasOwnProperty.call(node.raw, "normalized_title") || nextNormalizedTitle) {
            node.raw.normalized_title = nextNormalizedTitle;
          }
          if (nextUpdatedAt) node.raw.updated_at = nextUpdatedAt;
        }
      }
      if (Array.isArray(node.sujets)) stack.push(...node.sujets);
      if (Array.isArray(node.subjects)) stack.push(...node.subjects);
      if (Array.isArray(node.children)) stack.push(...node.children);
    }
  }

  async function applySubjectTitleSave(root) {
    const target = currentDecisionTarget?.(root);
    if (!target) return;
    const entityType = getSelectionEntityType?.(target.type);
    if (entityType !== "sujet") return;

    const edit = ensureSubjectTitleEditState();
    if (edit.isSaving) return;

    const subjectId = String(target.id || "");
    const initialTitle = String(edit.initialTitle || getCurrentTitle(entityType, subjectId, target.item) || "");
    const draftTitle = String(edit.draft || "");
    const trimmedInitial = initialTitle.trim();
    const trimmedDraft = draftTitle.trim();

    if (!trimmedDraft) {
      edit.error = "Le titre du sujet ne peut pas être vide.";
      rerenderScope?.(root);
      return;
    }

    if (trimmedDraft === trimmedInitial) {
      cancelSubjectTitleEdit(root);
      return;
    }

    edit.isSaving = true;
    edit.error = "";
    rerenderScope?.(root);

    try {
      const payload = await updateSubjectTitle?.({
        subjectId,
        title: trimmedDraft
      });
      const nextTitle = String(payload?.title || trimmedDraft);
      applySubjectTitleToLocalState(subjectId, {
        ...payload,
        title: nextTitle
      }, target);
      clearSubjectTitleEditState();
      rerenderScope?.(root);
    } catch (error) {
      edit.isSaving = false;
      edit.error = String(error?.message || error || "Impossible d'enregistrer le titre.");
      rerenderScope?.(root);
    }
  }

  return {
    ensureSubjectTitleEditState,
    getSubjectTitleEditState,
    isEditingSubjectTitle,
    startSubjectTitleEdit,
    cancelSubjectTitleEdit,
    syncSubjectTitleDraft,
    applySubjectTitleSave,
    applySubjectTitleToLocalState
  };
}
