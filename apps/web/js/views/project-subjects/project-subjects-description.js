import { getAuthorIdentity } from "../ui/author-identity.js";
export function createProjectSubjectsDescription(config = {}) {
  const {
    store,
    ensureViewUiState,
    firstNonEmpty,
    escapeHtml,
    svgIcon,
    mdToHtml,
    nowIso,
    SVG_AVATAR_HUMAN,
    getRunBucket,
    persistRunBucket,
    getSelectionEntityType,
    getEntityByType,
    getEntityReviewMeta,
    setEntityReviewMeta,
    currentDecisionTarget,
    rerenderScope,
    addActivity,
    markEntityValidated
  } = config;

  function getSujetSummary(sujet) {
    const raw = sujet?.raw || {};
    return firstNonEmpty(raw.description, sujet?.description, raw.summary, raw.message, raw.comment, raw.reasoning, raw.analysis, sujet?.title, "Aucune synthèse disponible.");
  }

  function getSituationSummary(situation) {
    const raw = situation?.raw || {};
    return firstNonEmpty(raw.summary, raw.message, raw.comment, raw.reasoning, raw.analysis, situation?.title, "Aucune synthèse disponible.");
  }

  function getDescriptionDefaults(selectionOrType, entityId = null) {
    let selection = null;
    let entityType = selectionOrType;
    let id = entityId;

    if (selectionOrType && typeof selectionOrType === "object" && selectionOrType.type) {
      selection = selectionOrType;
      entityType = getSelectionEntityType(selection.type);
      id = selection.item?.id || entityId;
    }

    const entity = selection?.item || getEntityByType(entityType, id);
    const body = entityType === "sujet"
      ? getSujetSummary(entity)
      : getSituationSummary(entity);

    return {
      body: String(body || ""),
      author: firstNonEmpty(entity?.agent, entity?.raw?.agent, "system"),
      agent: String(firstNonEmpty(entity?.agent, entity?.raw?.agent, "system")).toLowerCase(),
      avatar_type: "agent",
      avatar_initial: entityType === "sujet" ? "P" : "S"
    };
  }

  function getEntityDescriptionState(selectionOrType, entityId = null) {
    const { bucket } = getRunBucket();
    let selection = null;
    let entityType = selectionOrType;
    let id = entityId;

    if (selectionOrType && typeof selectionOrType === "object" && selectionOrType.type) {
      selection = selectionOrType;
      entityType = getSelectionEntityType(selection.type);
      id = selection.item?.id || entityId;
    }

    const defaults = getDescriptionDefaults(selection || entityType, id);
    const stored = bucket?.descriptions?.[entityType]?.[id] || {};
    return {
      ...defaults,
      ...stored,
      body: firstNonEmpty(stored.body, defaults.body, ""),
      author: firstNonEmpty(stored.author, defaults.author, "system"),
      agent: String(firstNonEmpty(stored.agent, defaults.agent, "system")).toLowerCase(),
      avatar_type: firstNonEmpty(stored.avatar_type, defaults.avatar_type, "agent"),
      avatar_initial: firstNonEmpty(stored.avatar_initial, defaults.avatar_initial, "S")
    };
  }

  function setEntityDescriptionState(entityType, entityId, patch = {}, options = {}) {
    const ts = options.ts || nowIso();
    persistRunBucket((bucket) => {
      bucket.descriptions = bucket.descriptions || { sujet: {}, situation: {} };
      bucket.descriptions[entityType] = bucket.descriptions[entityType] || {};
      const prev = getEntityDescriptionState(entityType, entityId);
      const nextBody = firstNonEmpty(patch.body, prev.body, "");
      const nextAgent = String(firstNonEmpty(patch.agent, prev.agent, "system")).toLowerCase();
      const isHumanEdited = Boolean(
        bucket.descriptions[entityType][entityId]?.is_human_edited
        || (nextAgent === "human" && String(nextBody || "").trim() !== String(prev.body || "").trim())
      );
      bucket.descriptions[entityType][entityId] = {
        ...prev,
        ...(bucket.descriptions[entityType][entityId] || {}),
        ...patch,
        is_human_edited: isHumanEdited,
        updated_at: ts
      };
    });

    const meta = getEntityReviewMeta(entityType, entityId);
    setEntityReviewMeta(entityType, entityId, {
      has_human_edit: Boolean(getRunBucket().bucket?.descriptions?.[entityType]?.[entityId]?.is_human_edited)
    }, options);
  }

  function claimDescriptionAsHuman(entityType, entityId, options = {}) {
    const current = getEntityDescriptionState(entityType, entityId);
    if (String(current.agent || "").toLowerCase() === "human" && current.avatar_type === "human") return false;

    setEntityDescriptionState(entityType, entityId, {
      body: current.body,
      author: "human",
      agent: "human",
      avatar_type: "human",
      avatar_initial: "H"
    }, options);

    return true;
  }

  function isEditingDescription(selection) {
    ensureViewUiState();
    if (!selection?.item?.id) return false;
    const entityType = getSelectionEntityType(selection.type);
    return store.situationsView.descriptionEdit?.entityType === entityType
      && store.situationsView.descriptionEdit?.entityId === selection.item.id;
  }

  function renderDescriptionCard(selection) {
    const entityType = getSelectionEntityType(selection.type);
    const entityId = selection.item.id;
    const description = getEntityDescriptionState(selection);
    const editing = isEditingDescription(selection);
    const identity = getAuthorIdentity({
      author: description.author || "system",
      agent: description.agent || description.avatar_type || "system",
      currentUserAvatar: store?.user?.avatar,
      humanAvatarHtml: SVG_AVATAR_HUMAN,
      fallbackName: "System"
    });
    const isHuman = identity.isHuman;
    const authorHtml = `<div class="gh-comment-author mono">${escapeHtml(identity.displayName)}</div>`;
    const editButtonHtml = `
      <button class="icon-btn icon-btn--sm gh-comment-edit-btn" data-action="edit-description" type="button" aria-label="Modifier la description" title="Modifier la description">
        ${svgIcon("pencil")}
      </button>
    `;

    const headerHtml = `
      <div class="gh-comment-header gh-comment-header--editable">
        <div class="gh-comment-header-main">${authorHtml}</div>
        <div class="gh-comment-header-actions">${editButtonHtml}</div>
      </div>
    `;

    const bodyHtml = editing
      ? `
        <div class="gh-comment-body gh-comment-body--editable">
          <textarea class="comment-editor__textarea description-editor__textarea" data-description-editor rows="7">${escapeHtml(store.situationsView.descriptionEdit?.draft || description.body || "")}</textarea>
          <div class="description-editor__actions">
            <button class="gh-btn" data-action="cancel-description-edit" type="button">Annuler</button>
            <button class="gh-btn gh-btn--comment" data-action="save-description-edit" data-entity-type="${escapeHtml(entityType)}" data-entity-id="${escapeHtml(entityId)}" type="button">Sauvegarder</button>
          </div>
        </div>
      `
      : `<div class="gh-comment-body">${mdToHtml(description.body || "")}</div>`;

    return `
      <div class="gh-comment gh-comment--description">
        ${identity.avatarHtml
          ? `<div class="gh-avatar ${identity.avatarType === "human" ? "gh-avatar--human" : ""}" aria-hidden="true">${identity.avatarHtml}</div>`
          : `<div class="gh-avatar" aria-hidden="true"><span class="gh-avatar-initial">${escapeHtml(identity.avatarInitial || description.avatar_initial || "S")}</span></div>`}
        <div class="gh-comment-box">
          ${headerHtml}
          ${bodyHtml}
        </div>
      </div>
    `;
  }

  function clearDescriptionEditState() {
    ensureViewUiState();
    store.situationsView.descriptionEdit = {
      entityType: null,
      entityId: null,
      draft: ""
    };
  }

  function syncDescriptionEditorDraft(root) {
    const ta = root.querySelector("[data-description-editor]");
    if (!ta) return;
    store.situationsView.descriptionEdit.draft = ta.value;
  }

  async function applyDescriptionSave(root) {
    const target = currentDecisionTarget(root);
    if (!target) return;

    const entityType = getSelectionEntityType(target.type);
    const entityId = target.id;
    const ta = root.querySelector("[data-description-editor]");
    if (!ta) return;

    const nextBody = String(ta.value || "").trim();
    if (!nextBody) return;

    const current = getEntityDescriptionState(entityType, entityId);
    const previousBody = String(current.body || "").trim();
    const initialAuthor = firstNonEmpty(current.author, target.item?.agent, "system");
    const initialAgent = String(firstNonEmpty(current.agent, target.item?.agent, "system")).toLowerCase();

    if (nextBody === previousBody && initialAgent === "human") {
      clearDescriptionEditState();
      rerenderScope(root);
      return;
    }

    addActivity(entityType, entityId, "description_version_initial", previousBody, {
      previous_author: initialAuthor
    }, { actor: initialAuthor, agent: initialAgent || "system" });

    setEntityDescriptionState(entityType, entityId, {
      body: nextBody,
      author: "human",
      agent: "human",
      avatar_type: "human",
      avatar_initial: "H"
    }, { actor: "Human", agent: "human" });

    markEntityValidated(entityType, entityId, { actor: "Human", agent: "human" });

    addActivity(entityType, entityId, "description_version_saved", nextBody, {
      previous_author: initialAuthor
    }, { actor: "Human", agent: "human" });

    clearDescriptionEditState();
    rerenderScope(root);
  }

  function startDescriptionEdit(root) {
    const target = currentDecisionTarget(root);
    if (!target) return false;
    const entityType = getSelectionEntityType(target.type);
    const current = getEntityDescriptionState(entityType, target.id);
    store.situationsView.descriptionEdit = {
      entityType,
      entityId: target.id,
      draft: current.body || ""
    };
    rerenderScope(root);
    return true;
  }

  return {
    getSujetSummary,
    getSituationSummary,
    getDescriptionDefaults,
    getEntityDescriptionState,
    setEntityDescriptionState,
    claimDescriptionAsHuman,
    clearDescriptionEditState,
    syncDescriptionEditorDraft,
    applyDescriptionSave,
    startDescriptionEdit,
    renderDescriptionCard
  };
}
