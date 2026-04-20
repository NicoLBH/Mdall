import { getAuthorIdentity } from "../ui/author-identity.js";
import { renderSubjectMarkdownToolbar } from "../ui/subject-rich-editor.js";

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
    renderCommentComposer,
    getRunBucket,
    persistRunBucket,
    getSelectionEntityType,
    getEntityByType,
    getEntityReviewMeta,
    setEntityReviewMeta,
    currentDecisionTarget,
    rerenderScope,
    markEntityValidated,
    updateSubjectDescription
  } = config;

  const createUploadSessionId = () => {
    if (window?.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  function ensureDescriptionEditState() {
    ensureViewUiState();
    const state = store.situationsView.descriptionEdit || {};
    store.situationsView.descriptionEdit = {
      entityType: state.entityType || null,
      entityId: state.entityId || null,
      draft: String(state.draft || ""),
      previewMode: !!state.previewMode,
      uploadSessionId: String(state.uploadSessionId || ""),
      attachments: Array.isArray(state.attachments) ? state.attachments : [],
      isSaving: !!state.isSaving,
      error: String(state.error || "")
    };
    return store.situationsView.descriptionEdit;
  }

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
      attachments: Array.isArray(entity?.description_attachments) ? entity.description_attachments : [],
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
      attachments: Array.isArray(stored.attachments) ? stored.attachments : defaults.attachments,
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
      ...meta,
      has_human_edit: Boolean(getRunBucket().bucket?.descriptions?.[entityType]?.[entityId]?.is_human_edited)
    }, options);
  }

  function isEditingDescription(selection) {
    const edit = ensureDescriptionEditState();
    if (!selection?.item?.id) return false;
    const entityType = getSelectionEntityType(selection.type);
    return edit.entityType === entityType && edit.entityId === selection.item.id;
  }

  function claimDescriptionAsHuman(entityType, entityId, options = {}) {
    const current = getEntityDescriptionState(entityType, entityId);
    if (String(current.agent || "").toLowerCase() === "human" && current.avatar_type === "human") return false;
    setEntityDescriptionState(entityType, entityId, {
      body: current.body,
      attachments: Array.isArray(current.attachments) ? current.attachments : [],
      author: "human",
      agent: "human",
      avatar_type: "human",
      avatar_initial: "H"
    }, options);
    return true;
  }

  function renderDescriptionAttachmentTile(attachment = {}, { removable = false, removeAction = "" } = {}) {
    const fileName = String(attachment?.file_name || attachment?.fileName || "Pièce jointe");
    const isImage = String(attachment?.mime_type || attachment?.mimeType || "").startsWith("image/");
    const previewUrl = String(attachment?.localPreviewUrl || attachment?.previewUrl || attachment?.object_url || "");
    const attachmentId = String(attachment?.id || "");
    const tempId = String(attachment?.tempId || "");
    const status = attachment?.error
      ? "Erreur d’upload"
      : String(attachment?.uploadStatus || "").trim() === "uploading"
        ? "Envoi…"
        : "";
    return `
      <div class="subject-composer-attachment-item">
        <div class="subject-attachment subject-attachment--compact">
          ${isImage && previewUrl
            ? `<img class="subject-attachment__image" src="${escapeHtml(previewUrl)}" alt="${escapeHtml(fileName)}" />`
            : `<div class="subject-attachment__file-name mono-small">${escapeHtml(fileName)}</div>`}
          ${status ? `<div class="subject-attachment__state mono-small">${escapeHtml(status)}</div>` : ""}
        </div>
        ${removable
          ? `
            <button
              class="subject-composer-attachment-remove"
              type="button"
              data-action="${escapeHtml(removeAction)}"
              data-attachment-id="${escapeHtml(attachmentId)}"
              data-temp-id="${escapeHtml(tempId)}"
              aria-label="Retirer la pièce jointe"
            >
              ${svgIcon("x")}
            </button>
          `
          : ""}
      </div>
    `;
  }

  function renderDescriptionCard(selection) {
    const entityType = getSelectionEntityType(selection.type);
    const entityId = selection.item.id;
    const description = getEntityDescriptionState(selection);
    const edit = ensureDescriptionEditState();
    const editing = isEditingDescription(selection);
    const identity = getAuthorIdentity({
      author: description.author || "system",
      agent: description.agent || description.avatar_type || "system",
      currentUserAvatar: store?.user?.avatar,
      humanAvatarHtml: SVG_AVATAR_HUMAN,
      fallbackName: "System"
    });
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
      ? (() => {
          const attachments = Array.isArray(edit.attachments) ? edit.attachments : [];
          const hasReadyAttachment = attachments.some((attachment) => String(attachment?.uploadStatus || "").trim() === "ready" && !attachment?.error);
          const canSubmit = !!String(edit.draft || "").trim() || hasReadyAttachment;
          const attachmentsHtml = attachments.length
            ? `<div class="subject-composer-attachments">${attachments.map((attachment) => renderDescriptionAttachmentTile(attachment, { removable: true, removeAction: "description-attachment-remove" })).join("")}</div>`
            : "";
          return `
            ${renderCommentComposer({
              hideAvatar: true,
              hideTitle: true,
              previewMode: !!edit.previewMode,
              textareaId: `descriptionEditBox-${entityId}`,
              previewId: `descriptionEditPreview-${entityId}`,
              textareaValue: String(edit.draft || ""),
              textareaAttributes: {
                "data-description-draft": entityId
              },
              placeholder: "Modifier la description, glisser-déposer une pièce jointe...",
              tabWriteAction: "description-tab-write",
              tabPreviewAction: "description-tab-preview",
              tabsClassName: "comment-composer__tabs--thread-reply",
              composerClassName: "comment-composer--thread-reply-editor comment-composer--thread-edit-root",
              toolbarHtml: renderSubjectMarkdownToolbar({ buttonAction: "description-format", svgIcon, extraData: { entityId } }),
              previewHtml: String(edit.draft || "").trim()
                ? mdToHtml(String(edit.draft || ""), { preserveMessageLineBreaks: true })
                : "",
              previewEmptyHint: "Use Markdown to format your comment",
              actionsHtml: `
                <div class="thread-inline-reply-editor__actions">
                  <button class="gh-btn" data-action="cancel-description-edit" type="button">Annuler</button>
                  <button class="gh-btn gh-btn--comment gh-btn--primary" data-action="save-description-edit" data-entity-type="${escapeHtml(entityType)}" data-entity-id="${escapeHtml(entityId)}" type="button" ${canSubmit && !edit.isSaving ? "" : "disabled"}>${edit.isSaving ? "Mise à jour…" : "Mettre à jour la description"}</button>
                </div>
              `,
              footerHtml: `
                <input
                  id="descriptionAttachmentInput-${escapeHtml(entityId)}"
                  type="file"
                  class="subject-composer-file-input"
                  data-role="description-file-input"
                  data-entity-id="${escapeHtml(entityId)}"
                  multiple
                />
                <div
                  class="subject-composer-attachments-preview ${attachments.length ? "" : "hidden"}"
                  data-role="description-attachments-preview"
                  data-entity-id="${escapeHtml(entityId)}"
                  aria-live="polite"
                >
                  ${attachmentsHtml}
                </div>
                ${edit.error ? `<div class="mono-small color-danger" style="margin-top:8px;">${escapeHtml(edit.error)}</div>` : ""}
              `
            })}
          `;
        })()
      : `
        <div class="gh-comment-body">
          ${mdToHtml(description.body || "")}
          ${Array.isArray(description.attachments) && description.attachments.length
            ? `<div class="subject-composer-attachments" style="margin-top:10px;">${description.attachments.map((attachment) => renderDescriptionAttachmentTile(attachment)).join("")}</div>`
            : ""}
        </div>
      `;

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
      draft: "",
      previewMode: false,
      uploadSessionId: "",
      attachments: [],
      isSaving: false,
      error: ""
    };
  }

  function syncDescriptionEditorDraft(root) {
    const ta = root.querySelector("[data-description-draft]");
    if (!ta) return;
    const edit = ensureDescriptionEditState();
    edit.draft = String(ta.value || "");
  }

  function getDescriptionEditState() {
    return ensureDescriptionEditState();
  }

  function ensureDescriptionUploadSessionId() {
    const edit = ensureDescriptionEditState();
    if (!String(edit.uploadSessionId || "")) edit.uploadSessionId = createUploadSessionId();
    return edit.uploadSessionId;
  }

  async function applyDescriptionSave(root) {
    const target = currentDecisionTarget(root);
    if (!target) return;

    const entityType = getSelectionEntityType(target.type);
    const entityId = target.id;
    const edit = ensureDescriptionEditState();
    const nextBody = String(edit.draft || "").trim();
    const attachments = Array.isArray(edit.attachments) ? edit.attachments : [];
    const hasReadyAttachment = attachments.some((attachment) => String(attachment?.uploadStatus || "").trim() === "ready" && !attachment?.error);
    if (!nextBody && !hasReadyAttachment) return;

    if (entityType !== "sujet" || typeof updateSubjectDescription !== "function") {
      setEntityDescriptionState(entityType, entityId, {
        body: nextBody,
        attachments,
        author: "human",
        agent: "human",
        avatar_type: "human",
        avatar_initial: "H"
      }, { actor: "Human", agent: "human" });
      markEntityValidated(entityType, entityId, { actor: "Human", agent: "human" });
      clearDescriptionEditState();
      rerenderScope(root);
      return;
    }

    edit.isSaving = true;
    edit.error = "";
    rerenderScope(root);

    try {
      const uploadSessionId = hasReadyAttachment ? String(edit.uploadSessionId || "").trim() : "";
      const updated = await updateSubjectDescription({
        subjectId: entityId,
        description: nextBody,
        uploadSessionId
      });

      const persistedBody = String(updated?.description ?? nextBody);
      const persistedAttachments = Array.isArray(updated?.description_attachments)
        ? updated.description_attachments
        : attachments.filter((attachment) => String(attachment?.uploadStatus || "").trim() === "ready" && !attachment?.error);
      setEntityDescriptionState(entityType, entityId, {
        body: persistedBody,
        attachments: persistedAttachments,
        author: "human",
        agent: "human",
        avatar_type: "human",
        avatar_initial: "H"
      }, { actor: "Human", agent: "human" });
      if (target?.item && typeof target.item === "object") {
        target.item.description = persistedBody;
        target.item.description_attachments = persistedAttachments;
      }
      markEntityValidated(entityType, entityId, { actor: "Human", agent: "human" });
      clearDescriptionEditState();
      rerenderScope(root);
    } catch (error) {
      edit.isSaving = false;
      edit.error = String(error?.message || error || "Impossible de mettre à jour la description.");
      rerenderScope(root);
    }
  }

  function startDescriptionEdit(root) {
    const target = currentDecisionTarget(root);
    if (!target) return false;
    const entityType = getSelectionEntityType(target.type);
    const current = getEntityDescriptionState(entityType, target.id);
    store.situationsView.descriptionEdit = {
      entityType,
      entityId: target.id,
      draft: current.body || "",
      previewMode: false,
      uploadSessionId: "",
      attachments: Array.isArray(current.attachments) ? [...current.attachments] : [],
      isSaving: false,
      error: ""
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
    getDescriptionEditState,
    ensureDescriptionUploadSessionId,
    applyDescriptionSave,
    startDescriptionEdit,
    renderDescriptionCard
  };
}
