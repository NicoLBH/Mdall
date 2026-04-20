import { getAuthorIdentity } from "../ui/author-identity.js";
import { renderSubjectMarkdownToolbar } from "../ui/subject-rich-editor.js";

export function createProjectSubjectsDescription(config = {}) {
  const VERSIONS_LOG_PREFIX = "[subject-description-versions]";
  const stateRefIds = new WeakMap();
  let lastLoggedStateRefId = "";
  let stateRefSeq = 0;
  const {
    store,
    ensureViewUiState,
    firstNonEmpty,
    escapeHtml,
    svgIcon,
    mdToHtml,
    fmtTs,
    nowIso,
    setOverlayChromeOpenState,
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
    updateSubjectDescription,
    loadSubjectDescriptionVersions
  } = config;

  const createUploadSessionId = () => {
    if (window?.crypto?.randomUUID) return window.crypto.randomUUID();
    const chunk = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${chunk()}${chunk()}-${chunk()}-${chunk()}-${chunk()}-${chunk()}${chunk()}${chunk()}`;
  };

  function logDescriptionVersions(message, payload = {}) {
    console.info(`${VERSIONS_LOG_PREFIX} ${message}`, {
      timestamp: new Date().toISOString(),
      ...payload
    });
  }

  function getSubjectsViewStore() {
    ensureViewUiState();
    if (!store.projectSubjectsView || typeof store.projectSubjectsView !== "object") {
      store.projectSubjectsView = {};
    }
    return store.projectSubjectsView;
  }

  function getStateRefId(state) {
    if (!state || typeof state !== "object") return "no-state";
    if (!stateRefIds.has(state)) {
      stateRefSeq += 1;
      stateRefIds.set(state, `description-versions-ui-${stateRefSeq}`);
    }
    return stateRefIds.get(state);
  }

  function isHtmlElement(value) {
    if (!value || typeof value !== "object") return false;
    if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return true;
    return typeof value.querySelector === "function" || typeof value.getBoundingClientRect === "function";
  }

  function ensureDescriptionEditState() {
    const view = getSubjectsViewStore();
    view.descriptionEdit ??= {
      entityType: null,
      entityId: null,
      draft: "",
      previewMode: false,
      uploadSessionId: "",
      attachments: [],
      isSaving: false,
      error: ""
    };
    if (!Array.isArray(view.descriptionEdit.attachments)) view.descriptionEdit.attachments = [];
    if (typeof view.descriptionEdit.previewMode !== "boolean") view.descriptionEdit.previewMode = false;
    if (typeof view.descriptionEdit.isSaving !== "boolean") view.descriptionEdit.isSaving = false;
    if (typeof view.descriptionEdit.error !== "string") view.descriptionEdit.error = "";
    if (typeof view.descriptionEdit.uploadSessionId !== "string") view.descriptionEdit.uploadSessionId = "";
    return view.descriptionEdit;
  }

  function ensureDescriptionVersionsUiState() {
    const view = getSubjectsViewStore();
    const existing = view.descriptionVersionsUi;
    view.descriptionVersionsUi ??= {
      entityType: null,
      entityId: null,
      isOpen: false,
      isLoading: false,
      error: "",
      versions: [],
      selectedVersionId: "",
      modalOpen: false,
      loadToken: 0
    };
    if (!Array.isArray(view.descriptionVersionsUi.versions)) view.descriptionVersionsUi.versions = [];
    if (typeof view.descriptionVersionsUi.error !== "string") view.descriptionVersionsUi.error = "";
    if (typeof view.descriptionVersionsUi.isOpen !== "boolean") view.descriptionVersionsUi.isOpen = false;
    if (typeof view.descriptionVersionsUi.isLoading !== "boolean") view.descriptionVersionsUi.isLoading = false;
    if (typeof view.descriptionVersionsUi.selectedVersionId !== "string") view.descriptionVersionsUi.selectedVersionId = "";
    if (typeof view.descriptionVersionsUi.modalOpen !== "boolean") view.descriptionVersionsUi.modalOpen = false;
    if (!Number.isFinite(Number(view.descriptionVersionsUi.loadToken))) view.descriptionVersionsUi.loadToken = 0;
    const stateRefId = getStateRefId(view.descriptionVersionsUi);
    if (!existing || lastLoggedStateRefId !== stateRefId) {
      lastLoggedStateRefId = stateRefId;
      logDescriptionVersions("state init", {
        store: "store.projectSubjectsView.descriptionVersionsUi",
        hasExistingState: !!existing,
        stateRefId
      });
    }
    return view.descriptionVersionsUi;
  }

  function formatRelativeTimeFromNow(ts = "") {
    const target = new Date(String(ts || ""));
    if (Number.isNaN(target.getTime())) return "à l'instant";
    const deltaMs = Date.now() - target.getTime();
    const deltaMinutes = Math.round(deltaMs / 60000);
    if (Math.abs(deltaMinutes) < 1) return "à l'instant";
    if (Math.abs(deltaMinutes) < 60) return `il y a ${Math.abs(deltaMinutes)} min`;
    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 24) return `il y a ${Math.abs(deltaHours)} h`;
    const deltaDays = Math.round(deltaHours / 24);
    if (Math.abs(deltaDays) < 30) return `il y a ${Math.abs(deltaDays)} j`;
    const deltaMonths = Math.round(deltaDays / 30);
    if (Math.abs(deltaMonths) < 12) return `il y a ${Math.abs(deltaMonths)} mois`;
    const deltaYears = Math.round(deltaMonths / 12);
    return `il y a ${Math.abs(deltaYears)} an${Math.abs(deltaYears) > 1 ? "s" : ""}`;
  }

  function formatVersionTimestamp(ts = "") {
    return typeof fmtTs === "function" ? fmtTs(ts) : String(ts || "—");
  }

  function buildVersionInitials(version = {}) {
    const first = String(version?.actor_first_name || "").trim();
    const last = String(version?.actor_last_name || "").trim();
    const email = String(version?.actor_email || "").trim();
    const fromNames = `${first.charAt(0)}${last.charAt(0)}`.trim();
    if (fromNames) return fromNames.toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
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

  function buildDescriptionVersionsLoadError(error) {
    const status = Number(error?.status || 0);
    const statusChunk = status > 0 ? ` (HTTP ${status})` : "";
    const detail = String(error?.details || error?.message || error || "").trim();
    const normalizedDetail = detail || "Impossible de récupérer les versions de description.";
    return `Échec du chargement des versions${statusChunk}. ${normalizedDetail}`;
  }

  function resetDescriptionVersionsUiForTargetChange(ui, options = {}) {
    ui.selectedVersionId = "";
    ui.versions = [];
    ui.error = "";
    if (options.resetLoading !== false) ui.isLoading = false;
  }

  function syncDescriptionVersionsTarget(root) {
    const ui = ensureDescriptionVersionsUiState();
    const target = currentDecisionTarget(root);
    const nextEntityTypeRaw = target?.type ? getSelectionEntityType(target.type) : "";
    const nextEntityType = nextEntityTypeRaw === "sujet" ? "sujet" : "";
    const nextEntityId = nextEntityType ? String(target?.id || "") : "";
    const previousEntityType = String(ui.entityType || "");
    const previousEntityId = String(ui.entityId || "");
    const wasOpen = !!ui.isOpen;
    const changed = previousEntityType !== nextEntityType || previousEntityId !== nextEntityId;

    if (changed) {
      resetDescriptionVersionsUiForTargetChange(ui);
      ui.entityType = nextEntityType;
      ui.entityId = nextEntityId;
      logDescriptionVersions("target changed", {
        previousEntityType,
        previousEntityId,
        nextEntityType,
        nextEntityId,
        wasOpen
      });
    }
    if (!nextEntityType && ui.isOpen) ui.isOpen = false;

    return {
      changed,
      wasOpen,
      isOpen: !!ui.isOpen,
      entityType: String(ui.entityType || ""),
      entityId: String(ui.entityId || ""),
      previousEntityType,
      previousEntityId
    };
  }

  async function ensureDescriptionVersionsLoaded(root, entityType, entityId, options = {}) {
    const ui = ensureDescriptionVersionsUiState();
    const forceReload = !!options.forceReload;
    const sameTarget = ui.entityType === entityType && ui.entityId === entityId;
    const versionsInMemory = Array.isArray(ui.versions) ? ui.versions.length : 0;
    const previousLoading = !!ui.isLoading;
    logDescriptionVersions("ensure start", {
      entityType,
      entityId,
      forceReload,
      sameTarget,
      previousIsLoading: previousLoading,
      versionsInMemory,
      stateRefId: getStateRefId(ui)
    });
    if (!forceReload && sameTarget && !ui.error && Array.isArray(ui.versions) && ui.versions.length && !previousLoading) {
      logDescriptionVersions("ensure early return: cache hit", {
        entityType,
        entityId,
        cachedVersionsCount: ui.versions.length
      });
      return;
    }
    const loadToken = Number(ui.loadToken || 0) + 1;
    ui.loadToken = loadToken;
    logDescriptionVersions("ensure loading begin", {
      entityType,
      entityId,
      loadToken,
      previousIsLoading: previousLoading,
      versionsCount: versionsInMemory
    });
    ui.isLoading = true;
    ui.error = "";
    ui.entityType = entityType;
    ui.entityId = entityId;
    logDescriptionVersions("rerender loading snapshot", {
      loadToken,
      snapshot: {
        entityType: ui.entityType,
        entityId: ui.entityId,
        isLoading: ui.isLoading,
        versionsCount: Array.isArray(ui.versions) ? ui.versions.length : 0,
        error: ui.error,
        stateRefId: getStateRefId(ui)
      }
    });
    rerenderScope(root);
    try {
      const versions = entityType === "sujet" && typeof loadSubjectDescriptionVersions === "function"
        ? await loadSubjectDescriptionVersions(entityId)
        : [];
      const currentUi = ensureDescriptionVersionsUiState();
      const isStaleResponse = Number(currentUi.loadToken || 0) !== loadToken;
      const normalizedVersions = Array.isArray(versions) ? versions : [];
      logDescriptionVersions("fetch resolved", {
        entityType,
        entityId,
        loadToken,
        rowsCount: normalizedVersions.length,
        selectedVersionId: String(currentUi.selectedVersionId || ""),
        ignoredAsStale: isStaleResponse,
        stateRefId: getStateRefId(currentUi)
      });
      if (isStaleResponse) {
        logDescriptionVersions("stale response ignored", {
          entityType,
          entityId,
          loadToken,
          versionsCount: normalizedVersions.length
        });
        return;
      }
      currentUi.versions = normalizedVersions;
      if (!currentUi.selectedVersionId && currentUi.versions.length) {
        currentUi.selectedVersionId = String(currentUi.versions[0]?.id || "");
      }
      if (!currentUi.versions.length) {
        logDescriptionVersions("ensure loaded with empty result set", {
          entityType,
          entityId
        });
        const descriptionState = getEntityDescriptionState(entityType, entityId);
        const hasCurrentDescription = !!String(descriptionState?.body || "").trim();
        if (hasCurrentDescription) {
          console.warn(
            `${VERSIONS_LOG_PREFIX} subject has current description but no historical version rows; check backfill / RPC deployment`,
            {
              timestamp: new Date().toISOString(),
              entityType,
              entityId
            }
          );
        }
      }
    } catch (error) {
      const currentUi = ensureDescriptionVersionsUiState();
      const isStaleResponse = Number(currentUi.loadToken || 0) !== loadToken;
      if (isStaleResponse) {
        logDescriptionVersions("stale response ignored", {
          entityType,
          entityId,
          loadToken,
          stage: "catch"
        });
      } else {
        currentUi.error = buildDescriptionVersionsLoadError(error);
      }
      console.error(`${VERSIONS_LOG_PREFIX} ensure failed`, {
        timestamp: new Date().toISOString(),
        entityType,
        entityId,
        forceReload,
        sameTarget,
        loadToken,
        ignoredAsStale: isStaleResponse,
        error
      });
    } finally {
      const currentUi = ensureDescriptionVersionsUiState();
      if (Number(currentUi.loadToken || 0) === loadToken) currentUi.isLoading = false;
      logDescriptionVersions("finally", {
        entityType,
        entityId,
        loadToken,
        isLoadingFinal: !!currentUi.isLoading,
        versionsCountFinal: Array.isArray(currentUi.versions) ? currentUi.versions.length : 0,
        hasError: !!currentUi.error,
        selectedVersionId: String(currentUi.selectedVersionId || ""),
        stateRefId: getStateRefId(currentUi)
      });
      rerenderScope(root);
    }
  }

  function closeDescriptionVersionsDropdown() {
    const ui = ensureDescriptionVersionsUiState();
    ui.isOpen = false;
    hideDescriptionVersionsDropdownHost();
  }

  function retryDescriptionVersionsLoad(root) {
    syncDescriptionVersionsTarget(root);
    const ui = ensureDescriptionVersionsUiState();
    if (!ui.entityType || !ui.entityId) return;
    void ensureDescriptionVersionsLoaded(root, ui.entityType, ui.entityId, { forceReload: true });
  }

  function toggleDescriptionVersionsDropdown(root) {
    const sync = syncDescriptionVersionsTarget(root);
    if (!sync.entityType || !sync.entityId) return;
    const entityType = sync.entityType;
    const entityId = sync.entityId;
    const ui = ensureDescriptionVersionsUiState();
    const prevOpen = !!ui.isOpen;
    ui.isOpen = !ui.isOpen;
    const willLoad = ui.isOpen && entityType === "sujet";
    logDescriptionVersions("toggle dropdown", {
      entityType,
      entityId,
      targetChanged: sync.changed,
      previousIsOpen: prevOpen,
      nextIsOpen: !!ui.isOpen,
      triggeredLoad: willLoad
    });
    if (ui.isOpen && entityType === "sujet") {
      void ensureDescriptionVersionsLoaded(root, entityType, entityId, { forceReload: sync.changed && sync.wasOpen });
    } else {
      hideDescriptionVersionsDropdownHost();
    }
    rerenderScope(root);
  }

  function openDescriptionVersionModal(root, versionId = "") {
    const ui = ensureDescriptionVersionsUiState();
    ui.selectedVersionId = String(versionId || "");
    ui.modalOpen = false;
    ui.isOpen = false;
    hideDescriptionVersionsDropdownHost();
    const version = Array.isArray(ui.versions)
      ? ui.versions.find((entry) => String(entry?.id || "") === ui.selectedVersionId)
      : null;
    logDescriptionVersions("item click", {
      versionId: ui.selectedVersionId,
      foundVersion: !!version
    });
    if (!version) {
      rerenderScope(root);
      return;
    }
    ui.modalOpen = openDescriptionVersionInDetailsModal(version);
    rerenderScope(root);
  }

  function closeDescriptionVersionModal(root, options = {}) {
    const ui = ensureDescriptionVersionsUiState();
    ui.modalOpen = false;
    if (options.skipDomClose !== true) closeDescriptionVersionDetailsModalDom();
    rerenderScope(root);
  }

  function closeDescriptionVersionDetailsModalDom() {
    const modal = document.getElementById("detailsModal");
    const body = document.getElementById("detailsBodyModal");
    if (!modal || modal.dataset.descriptionVersionModalOpen !== "true") return;
    body?.classList.remove("details-body-modal--description-version");
    if (typeof setOverlayChromeOpenState === "function") {
      setOverlayChromeOpenState(modal, false);
    } else {
      modal.classList.add("hidden");
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    }
    modal.dataset.descriptionVersionModalOpen = "false";
    document.body.classList.remove("modal-open");
  }

  function openDescriptionVersionInDetailsModal(version = {}) {
    const modal = document.getElementById("detailsModal");
    const title = document.getElementById("detailsTitleModal");
    const meta = document.getElementById("detailsMetaModal");
    const body = document.getElementById("detailsBodyModal");
    if (!modal || !title || !meta || !body) return false;

    const displayName = String(version?.actor_name || "Utilisateur");
    const dateLabel = formatVersionTimestamp(version?.created_at);
    const dateRelativeLabel = formatRelativeTimeFromNow(version?.created_at);
    const initials = buildVersionInitials(version);
    const avatarUrl = resolveVersionAvatarUrl(version);
    const bodyMarkdown = String(version?.description_markdown || "");
    const fullDateLabel = `${dateRelativeLabel} · ${dateLabel}`;
    logDescriptionVersions("modal open", {
      title: "Version de description",
      author: displayName,
      created_at: String(version?.created_at || ""),
      markdownLength: bodyMarkdown.length
    });

    title.textContent = "Version de description";
    meta.textContent = fullDateLabel;
    body.classList.add("details-body-modal--description-version");
    body.innerHTML = `
      <article class="description-version-details">
        <header class="description-version-details__header">
          <span class="description-version-details__avatar">
            ${avatarUrl
              ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}">`
              : `<span class="description-version-details__avatar-fallback">${escapeHtml(initials)}</span>`}
          </span>
          <div class="description-version-details__author">
            <div class="description-version-details__name">${escapeHtml(displayName)}</div>
            <div class="description-version-details__date" title="${escapeHtml(dateLabel)}">${escapeHtml(dateRelativeLabel)}</div>
          </div>
        </header>
        <div class="description-version-details__body gh-comment-body">
          ${mdToHtml(bodyMarkdown || "")}
        </div>
      </article>
    `;

    if (typeof setOverlayChromeOpenState === "function") {
      setOverlayChromeOpenState(modal, true);
    } else {
      modal.classList.remove("hidden");
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    }
    modal.dataset.descriptionVersionModalOpen = "true";
    document.body.classList.add("modal-open");
    return true;
  }

  function resolveVersionAvatarUrl(version = {}) {
    if (version?.actor_is_system === true || (!version?.actor_user_id && !version?.actor_person_id)) {
      return "/assets/images/avatar-entreprise.jfif";
    }
    const directAvatar = firstNonEmpty(
      version?.actor_avatar_url,
      version?.actor_avatar,
      version?.actor_user_avatar
    );
    if (directAvatar) return directAvatar;

    if (String(version?.actor_user_id || "") === String(store?.user?.id || "")) {
      return String(store?.user?.avatar || "");
    }

    const collaborators = Array.isArray(store?.projectForm?.collaborators) ? store.projectForm.collaborators : [];
    const actorUserId = String(version?.actor_user_id || "");
    const actorPersonId = String(version?.actor_person_id || "");
    const collaborator = collaborators.find((entry) => {
      const linkedUserId = String(entry?.userId || entry?.linkedUserId || "");
      const personId = String(entry?.personId || entry?.id || "");
      return (actorUserId && linkedUserId === actorUserId) || (actorPersonId && personId === actorPersonId);
    });
    return String(firstNonEmpty(
      collaborator?.avatar,
      collaborator?.avatarUrl,
      collaborator?.photo_url
    ));
  }

  function renderDescriptionVersionsTrigger(root, entityType, entityId) {
    syncDescriptionVersionsTarget(root);
    const ui = ensureDescriptionVersionsUiState();
    const isTarget = ui.entityType === entityType && ui.entityId === entityId;
    const isOpen = isTarget && ui.isOpen;
    const count = isTarget && Array.isArray(ui.versions) ? ui.versions.length : 0;
    const anchorKey = `${entityType}::${entityId}`;
    return `
      <div class="issues-head-menu description-versions-dropdown ${isOpen ? "is-open" : ""}">
        <button
          class="issues-head-menu__btn description-versions-dropdown__trigger"
          type="button"
          data-action="toggle-description-versions"
          data-description-versions-anchor="${escapeHtml(anchorKey)}"
          aria-expanded="${isOpen ? "true" : "false"}"
          aria-haspopup="menu"
          title="Versions"
        >
          <span>Versions${count ? ` (${count})` : ""}</span>
          <span class="description-versions-dropdown__caret">${svgIcon("chevron-down")}</span>
        </button>
      </div>
    `;
  }

  function renderDescriptionVersionsDropdownContent(entityType, entityId) {
    const ui = ensureDescriptionVersionsUiState();
    const isTarget = ui.entityType === entityType && ui.entityId === entityId;
    const versions = isTarget && Array.isArray(ui.versions) ? ui.versions : [];
    const count = versions.length;
    logDescriptionVersions("dropdown render", {
      entityType,
      entityId,
      isTarget,
      isOpen: !!(isTarget && ui.isOpen),
      isLoading: !!ui.isLoading,
      versionsLength: count,
      stateRefId: getStateRefId(ui)
    });
    const loadingHtml = ui.isLoading ? `<div class="description-versions-dropdown__status">Chargement des versions…</div>` : "";
    const errorHtml = !ui.isLoading && ui.error
      ? `
        <div class="description-versions-dropdown__status color-danger">${escapeHtml(ui.error)}</div>
        <div class="description-versions-dropdown__status-actions">
          <button type="button" class="gh-btn" data-action="reload-description-versions">Réessayer</button>
        </div>
      `
      : "";
    const listHtml = !ui.isLoading && !ui.error && versions.length
      ? versions.map((version) => {
          const versionId = String(version?.id || "");
          const displayName = String(version?.actor_name || "Utilisateur");
          const timestampLabel = formatRelativeTimeFromNow(version?.created_at);
          const absoluteTimestampLabel = formatVersionTimestamp(version?.created_at);
          const initials = buildVersionInitials(version);
          const avatarUrl = resolveVersionAvatarUrl(version);
          return `
            <button type="button" class="gh-menu__item description-versions-dropdown__item" data-action="open-description-version-modal" data-version-id="${escapeHtml(versionId)}" title="${escapeHtml(absoluteTimestampLabel)}">
              <span class="description-versions-dropdown__avatar">
                ${avatarUrl
                  ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}">`
                  : `<span class="description-versions-dropdown__avatar-fallback">${escapeHtml(initials)}</span>`}
              </span>
              <span class="description-versions-dropdown__item-inline">
                <span class="description-versions-dropdown__item-name">${escapeHtml(displayName)}</span>
                <span class="description-versions-dropdown__item-meta">${escapeHtml(timestampLabel)}</span>
              </span>
            </button>
          `;
        }).join("")
      : (!ui.isLoading && !ui.error ? `<div class="description-versions-dropdown__status">Aucune version disponible.</div>` : "");

    return `
      <div class="gh-menu issues-head-menu__dropdown description-versions-dropdown__menu ${isTarget && ui.isOpen ? "gh-menu--open" : ""}" data-role="description-versions-dropdown" role="menu">
        <div class="gh-menu__title description-versions-dropdown__title">versions (${count})</div>
        ${loadingHtml}
        ${errorHtml}
        <div class="description-versions-dropdown__list">${listHtml}</div>
      </div>
    `;
  }

  function ensureDescriptionVersionsDropdownHost() {
    let host = document.getElementById("descriptionVersionsDropdownHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "descriptionVersionsDropdownHost";
      host.className = "description-versions-dropdown-host";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
    }
    return host;
  }

  function hideDescriptionVersionsDropdownHost() {
    const host = ensureDescriptionVersionsDropdownHost();
    host.innerHTML = "";
    host.setAttribute("aria-hidden", "true");
  }

  function resolveDescriptionVersionsAnchor(root, entityType, entityId) {
    const anchorKey = `${entityType}::${entityId}`;
    const selector = `[data-description-versions-anchor="${CSS.escape(anchorKey)}"]`;
    const inRoot = root?.querySelector?.(selector);
    if (isHtmlElement(inRoot)) return inRoot;
    const fallback = document.querySelector(selector);
    return isHtmlElement(fallback) ? fallback : null;
  }

  function syncDescriptionVersionsDropdownPosition(root) {
    const ui = ensureDescriptionVersionsUiState();
    const host = ensureDescriptionVersionsDropdownHost();
    if (host.getAttribute("aria-hidden") === "true") return;
    const anchor = resolveDescriptionVersionsAnchor(root, ui.entityType, ui.entityId);
    if (!anchor) {
      hideDescriptionVersionsDropdownHost();
      return;
    }
    const menu = host.querySelector("[data-role='description-versions-dropdown']");
    if (!isHtmlElement(menu)) return;
    const anchorRect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const margin = 12;
    let left = anchorRect.right - menuRect.width;
    let top = anchorRect.bottom + 6;
    if (left < margin) left = margin;
    if (left + menuRect.width > viewportWidth - margin) {
      left = Math.max(margin, viewportWidth - menuRect.width - margin);
    }
    if (top + menuRect.height > viewportHeight - margin) {
      top = Math.max(margin, anchorRect.top - menuRect.height - 6);
    }
    host.style.position = "fixed";
    host.style.left = `${Math.round(left)}px`;
    host.style.top = `${Math.round(top)}px`;
  }

  function renderDescriptionVersionsDropdownHost(root) {
    const sync = syncDescriptionVersionsTarget(root);
    const ui = ensureDescriptionVersionsUiState();
    if (ui.isOpen && sync.changed && sync.entityType === "sujet" && sync.entityId) {
      void ensureDescriptionVersionsLoaded(root, sync.entityType, sync.entityId, { forceReload: true });
    }
    const host = ensureDescriptionVersionsDropdownHost();
    const entityType = String(ui.entityType || "");
    const entityId = String(ui.entityId || "");
    if (!ui.isOpen || !entityType || !entityId) {
      hideDescriptionVersionsDropdownHost();
      return host;
    }
    host.innerHTML = renderDescriptionVersionsDropdownContent(entityType, entityId);
    host.setAttribute("aria-hidden", "false");
    if (!ui.isLoading && !ui.error && (!Array.isArray(ui.versions) || ui.versions.length === 0) && entityType === "sujet") {
      void ensureDescriptionVersionsLoaded(root, entityType, entityId);
    }
    syncDescriptionVersionsDropdownPosition(root);
    return host;
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
    const versionsTriggerHtml = entityType === "sujet" ? renderDescriptionVersionsTrigger(null, entityType, entityId) : "";
    const editButtonHtml = `
      <button class="icon-btn icon-btn--sm gh-comment-edit-btn" data-action="edit-description" type="button" aria-label="Modifier la description" title="Modifier la description">
        ${svgIcon("pencil")}
      </button>
    `;
    const headerHtml = `
      <div class="gh-comment-header gh-comment-header--editable">
        <div class="gh-comment-header-main">${authorHtml}</div>
        <div class="gh-comment-header-actions">${versionsTriggerHtml}${editButtonHtml}</div>
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
    const view = getSubjectsViewStore();
    view.descriptionEdit = {
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
    const view = getSubjectsViewStore();
    view.descriptionEdit = {
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
    toggleDescriptionVersionsDropdown,
    closeDescriptionVersionsDropdown,
    openDescriptionVersionModal,
    closeDescriptionVersionModal,
    retryDescriptionVersionsLoad,
    renderDescriptionVersionsDropdownHost,
    syncDescriptionVersionsDropdownPosition,
    applyDescriptionSave,
    startDescriptionEdit,
    renderDescriptionCard
  };
}
