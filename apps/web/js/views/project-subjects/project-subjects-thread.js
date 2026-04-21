import { getAuthorIdentity } from "../ui/author-identity.js";
import { renderSubjectMarkdownToolbar } from "../ui/subject-rich-editor.js";
import { renderSubjectAttachmentTile } from "./project-subjects-attachments-ui.js";
import {
  buildBusinessActivitySummary,
  getBusinessActivityAppearance,
  mapBusinessEventRowToThreadActivity as mapBusinessEventRowToThreadActivityShared
} from "./project-subjects-thread-business-events.js";
export function createProjectSubjectsThread(config = {}) {
  const {
    store,
    ensureViewUiState,
    firstNonEmpty,
    nowIso,
    fmtTs,
    mdToHtml,
    escapeHtml,
    svgIcon,
    SVG_AVATAR_HUMAN,
    SVG_ISSUE_CLOSED,
    SVG_ISSUE_REOPENED,
    SVG_TL_CLOSED,
    SVG_TL_REOPENED,
    renderGhActionButton,
    renderMessageThread,
    renderMessageThreadComment,
    renderMessageThreadActivity,
    renderMessageThreadEvent,
    renderCommentComposer,
    renderReviewStateIcon,
    getRunBucket,
    persistRunBucket,
    getEntityByType,
    getActiveSelection,
    getSelectionEntityType,
    getSituationBySujetId,
    getNestedSujet,
    getEffectiveSujetStatus,
    getEffectiveSituationStatus,
    subjectMessagesService,
    requestRerender,
    scheduleThreadRerender,
    entityDisplayLinkHtml,
    inferAgent,
    normActorName,
    miniAuthorIconHtml
  } = config;

  const subjectTimelineCache = new Map();
  const subjectTimelineState = new Map();
  const subjectReadMarkState = new Map();
  let threadRenderDepth = 0;
  const renderScopeDebugEnabled = (() => {
    try {
      const search = String(window?.location?.search || "");
      if (search.includes("debugRenderScopes=1")) return true;
      const localValue = String(window?.localStorage?.getItem?.("mdall:debug-render-scopes") || "").trim().toLowerCase();
      const sessionValue = String(window?.sessionStorage?.getItem?.("mdall:debug-render-scopes") || "").trim().toLowerCase();
      const globalValue = String(window?.__MDALL_DEBUG_RENDER_SCOPES__ || "").trim().toLowerCase();
      return localValue === "1"
        || localValue === "true"
        || sessionValue === "1"
        || sessionValue === "true"
        || globalValue === "1"
        || globalValue === "true";
    } catch {
      return false;
    }
  })();
  const MAX_REPLY_VISUAL_DEPTH = 2;
  const THREAD_REACTION_CHOICES = [
    { code: "thumbs_up", label: "J'aime", emoji: "👍", assetPath: "assets/images/reactions/thumbs-up.png" },
    { code: "thumbs_down", label: "Je n'aime pas", emoji: "👎", assetPath: "assets/images/reactions/thumbs-down.png" },
    { code: "grinning", label: "Sourire", emoji: "😄", assetPath: "assets/images/reactions/grinning.png" },
    { code: "party", label: "Fête", emoji: "🎉", assetPath: "assets/images/reactions/party.png" },
    { code: "thinking", label: "Pensif", emoji: "😕", assetPath: "assets/images/reactions/thinking.png" },
    { code: "heart", label: "Cœur", emoji: "❤️", assetPath: "assets/images/reactions/heart.png" },
    { code: "rocket", label: "Fusée", emoji: "🚀", assetPath: "assets/images/reactions/rocket.png" },
    { code: "eyes", label: "Regard", emoji: "👀", assetPath: "assets/images/reactions/eyes.png" }
  ];

  function normalizeId(value) {
    return String(value || "").trim();
  }

  function debugRenderScope(scope, payload = {}) {
    if (!renderScopeDebugEnabled) return;
    console.log("[subject-render-scope]", String(scope || "unknown"), payload);
  }

  function getProjectCollaborators() {
    return Array.isArray(store?.projectForm?.collaborators) ? store.projectForm.collaborators : [];
  }

  function resolveAuthorProfile(row = {}) {
    const personId = normalizeId(row?.author_person_id);
    const collaborator = getProjectCollaborators().find((entry) => {
      const collaboratorPersonId = normalizeId(entry?.personId || entry?.id);
      return !!collaboratorPersonId && collaboratorPersonId === personId;
    }) || null;

    const displayName = firstNonEmpty(
      collaborator?.displayName,
      collaborator?.fullName,
      `${firstNonEmpty(collaborator?.firstName, "")} ${firstNonEmpty(collaborator?.lastName, "")}`.trim(),
      collaborator?.name,
      collaborator?.email,
      personId ? `Person ${personId.slice(0, 8)}` : "Human"
    );

    return {
      displayName: String(displayName || "Human"),
      avatarUrl: String(firstNonEmpty(collaborator?.avatarUrl, collaborator?.avatar, ""))
    };
  }

  function mapMessageRowToThreadComment(row = {}) {
    if (row?.deleted_at) return null;
    const authorProfile = resolveAuthorProfile(row);
    const isFrozen = !!row.is_frozen;
    const stateLabel = isFrozen ? "figé (vu par un tiers)" : "modifiable";
    return {
      ts: firstNonEmpty(row.created_at, nowIso()),
      entity_type: "sujet",
      entity_id: normalizeId(row.subject_id),
      type: "COMMENT",
      actor: authorProfile.displayName,
      agent: "human",
      message: String(row.body_markdown || ""),
      pending: false,
      request_id: null,
      meta: {
        source: "supabase",
        id: normalizeId(row.id),
        parent_message_id: normalizeId(row.parent_message_id),
        author_person_id: normalizeId(row.author_person_id),
        author_user_id: normalizeId(row.author_user_id),
        author_avatar_url: authorProfile.avatarUrl,
        depth: 0,
        reply_preview: "",
        is_frozen: isFrozen,
        is_deleted: false,
        state_label: stateLabel,
        mentions: Array.isArray(row?.mentions) ? row.mentions : [],
        attachments: Array.isArray(row?.attachments) ? row.attachments : [],
        reactions: Array.isArray(row?.reactions) ? row.reactions : []
      },
      stateLabel
    };
  }

  function getCurrentUserReactionActor(row = {}) {
    const currentUserId = normalizeId(store?.user?.id);
    const currentPersonId = normalizeId(store?.user?.personId || store?.profile?.personId);
    const reactorUserId = normalizeId(row?.reactor_user_id);
    const reactorPersonId = normalizeId(row?.reactor_person_id);
    if (currentUserId && reactorUserId && currentUserId === reactorUserId) return true;
    if (currentPersonId && reactorPersonId && currentPersonId === reactorPersonId) return true;
    return false;
  }

  function buildMessageReactionSummary(rows = []) {
    const grouped = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const reactionCode = String(row?.reaction_code || "").trim();
      if (!reactionCode) return;
      const current = grouped.get(reactionCode) || {
        code: reactionCode,
        count: 0,
        reactedByCurrentUser: false
      };
      current.count += 1;
      current.reactedByCurrentUser = current.reactedByCurrentUser || getCurrentUserReactionActor(row);
      grouped.set(reactionCode, current);
    });
    return grouped;
  }

  function getMentionUiState() {
    ensureViewUiState();
    const state = store.situationsView;
    if (!state.mentionUi || typeof state.mentionUi !== "object") {
      state.mentionUi = {
        open: false,
        query: "",
        activeIndex: 0,
        triggerStart: -1,
        triggerEnd: -1,
        suggestions: [],
        composerKey: ""
      };
    }
    if (typeof state.mentionUi.composerKey !== "string") state.mentionUi.composerKey = "";
    return state.mentionUi;
  }

  function getEmojiUiState() {
    ensureViewUiState();
    const state = store.situationsView;
    if (!state.emojiUi || typeof state.emojiUi !== "object") {
      state.emojiUi = {
        open: false,
        query: "",
        activeIndex: 0,
        triggerStart: -1,
        triggerEnd: -1,
        suggestions: [],
        composerKey: ""
      };
    }
    return state.emojiUi;
  }

  function getSubjectRefUiState() {
    ensureViewUiState();
    const state = store.situationsView;
    if (!state.subjectRefUi || typeof state.subjectRefUi !== "object") {
      state.subjectRefUi = {
        open: false,
        query: "",
        activeIndex: 0,
        triggerStart: -1,
        triggerEnd: -1,
        suggestions: [],
        composerKey: ""
      };
    }
    if (typeof state.subjectRefUi.composerKey !== "string") state.subjectRefUi.composerKey = "";
    return state.subjectRefUi;
  }

  function getReplyContextState() {
    ensureViewUiState();
    const state = store.situationsView;
    if (!state.replyContext || typeof state.replyContext !== "object") {
      state.replyContext = {
        subjectId: "",
        parentMessageId: "",
        parentPreview: ""
      };
    }
    return state.replyContext;
  }

  function getComposerAttachmentsState() {
    ensureViewUiState();
    const state = store.situationsView;
    if (!state.subjectComposerAttachments || typeof state.subjectComposerAttachments !== "object") {
      state.subjectComposerAttachments = {
        subjectId: "",
        uploadSessionId: "",
        items: []
      };
    }
    if (!Array.isArray(state.subjectComposerAttachments.items)) {
      state.subjectComposerAttachments.items = [];
    }
    return state.subjectComposerAttachments;
  }

  function clearReplyContext() {
    const context = getReplyContextState();
    context.subjectId = "";
    context.parentMessageId = "";
    context.parentPreview = "";
  }

  function setReplyContext({ subjectId = "", parentMessageId = "", parentPreview = "" } = {}) {
    const context = getReplyContextState();
    context.subjectId = normalizeId(subjectId);
    context.parentMessageId = normalizeId(parentMessageId);
    context.parentPreview = String(parentPreview || "").trim();
  }

  function getReplyContextForSubject(subjectId = "") {
    const context = getReplyContextState();
    const normalizedSubjectId = normalizeId(subjectId);
    if (!normalizedSubjectId) return null;
    if (normalizeId(context.subjectId) !== normalizedSubjectId) return null;
    const parentMessageId = normalizeId(context.parentMessageId);
    if (!parentMessageId) return null;
    return {
      subjectId: normalizedSubjectId,
      parentMessageId,
      parentPreview: String(context.parentPreview || "")
    };
  }

  function buildReplyPreview(markdown = "") {
    const normalized = String(markdown || "")
      .replace(/\s+/g, " ")
      .replace(/^#+\s*/g, "")
      .trim();
    if (!normalized) return "";
    return normalized.length > 120 ? `${normalized.slice(0, 117)}…` : normalized;
  }

  function getInlineReplyUiState() {
    ensureViewUiState();
    const state = store.situationsView;
    if (!state.inlineReplyUi || typeof state.inlineReplyUi !== "object") {
      state.inlineReplyUi = {
        expandedMessageId: "",
        draftsByMessageId: {},
        previewByMessageId: {},
        attachmentsByMessageId: {},
        uploadSessionByMessageId: {}
      };
    }
    if (typeof state.inlineReplyUi.expandedMessageId !== "string") state.inlineReplyUi.expandedMessageId = "";
    if (!state.inlineReplyUi.draftsByMessageId || typeof state.inlineReplyUi.draftsByMessageId !== "object") {
      state.inlineReplyUi.draftsByMessageId = {};
    }
    if (!state.inlineReplyUi.previewByMessageId || typeof state.inlineReplyUi.previewByMessageId !== "object") {
      state.inlineReplyUi.previewByMessageId = {};
    }
    if (!state.inlineReplyUi.attachmentsByMessageId || typeof state.inlineReplyUi.attachmentsByMessageId !== "object") {
      state.inlineReplyUi.attachmentsByMessageId = {};
    }
    if (!state.inlineReplyUi.uploadSessionByMessageId || typeof state.inlineReplyUi.uploadSessionByMessageId !== "object") {
      state.inlineReplyUi.uploadSessionByMessageId = {};
    }
    if (typeof state.inlineReplyUi.editMessageId !== "string") state.inlineReplyUi.editMessageId = "";
    if (!state.inlineReplyUi.editDraftsByMessageId || typeof state.inlineReplyUi.editDraftsByMessageId !== "object") {
      state.inlineReplyUi.editDraftsByMessageId = {};
    }
    if (!state.inlineReplyUi.editPreviewByMessageId || typeof state.inlineReplyUi.editPreviewByMessageId !== "object") {
      state.inlineReplyUi.editPreviewByMessageId = {};
    }
    if (!state.inlineReplyUi.editAttachmentsByMessageId || typeof state.inlineReplyUi.editAttachmentsByMessageId !== "object") {
      state.inlineReplyUi.editAttachmentsByMessageId = {};
    }
    if (!state.inlineReplyUi.editUploadSessionByMessageId || typeof state.inlineReplyUi.editUploadSessionByMessageId !== "object") {
      state.inlineReplyUi.editUploadSessionByMessageId = {};
    }
    return state.inlineReplyUi;
  }

  function decorateNestedMessageComments(comments = []) {
    const list = Array.isArray(comments) ? comments : [];
    if (!list.length) return [];

    const byId = new Map();
    list.forEach((comment) => {
      const commentId = normalizeId(comment?.meta?.id);
      if (commentId) byId.set(commentId, comment);
    });

    const depthCache = new Map();
    const parentChain = (comment) => {
      const chain = [];
      let current = comment;
      const seen = new Set();
      while (current) {
        const currentId = normalizeId(current?.meta?.id);
        if (!currentId || seen.has(currentId)) break;
        seen.add(currentId);
        const parentId = normalizeId(current?.meta?.parent_message_id);
        if (!parentId) break;
        chain.push(parentId);
        current = byId.get(parentId) || null;
      }
      return chain;
    };

    list.forEach((comment) => {
      const commentId = normalizeId(comment?.meta?.id);
      if (!commentId) return;
      if (depthCache.has(commentId)) return;
      const chain = parentChain(comment);
      depthCache.set(commentId, chain.length);
    });

    return list.map((comment) => {
      const commentId = normalizeId(comment?.meta?.id);
      const parentId = normalizeId(comment?.meta?.parent_message_id);
      const parentComment = parentId ? byId.get(parentId) : null;
      const depth = Math.min(MAX_REPLY_VISUAL_DEPTH, Number(depthCache.get(commentId) || 0));
      return {
        ...comment,
        meta: {
          ...(comment.meta || {}),
          depth,
          reply_preview: parentComment ? buildReplyPreview(parentComment.message) : ""
        }
      };
    });
  }

  function queueSubjectMessageReadMarking(subjectId, messages = []) {
    const normalizedSubjectId = normalizeId(subjectId);
    if (!normalizedSubjectId || !subjectMessagesService) return;
    const state = subjectReadMarkState.get(normalizedSubjectId) || { pending: false, markedIds: new Set() };
    if (state.pending) return;

    const toMark = (Array.isArray(messages) ? messages : [])
      .filter((message) => !message?.deleted_at)
      .map((message) => normalizeId(message?.id))
      .filter((messageId, idx, list) => !!messageId && list.indexOf(messageId) === idx && !state.markedIds.has(messageId));
    if (!toMark.length) return;

    state.pending = true;
    subjectReadMarkState.set(normalizedSubjectId, state);

    (async () => {
      let shouldRefresh = false;
      for (const messageId of toMark) {
        try {
          await subjectMessagesService.markMessageRead(messageId, { subjectId: normalizedSubjectId });
          state.markedIds.add(messageId);
          shouldRefresh = true;
        } catch (error) {
          console.warn("[subject-messages] mark read failed", { subjectId: normalizedSubjectId, messageId, error });
        }
      }

      if (shouldRefresh) {
        ensureSubjectTimelineLoaded(normalizedSubjectId, { force: true });
      }
    })()
      .finally(() => {
        const latestState = subjectReadMarkState.get(normalizedSubjectId);
        if (latestState) {
          latestState.pending = false;
          subjectReadMarkState.set(normalizedSubjectId, latestState);
        }
      });
  }

  function mapEventRowToThreadActivity(row = {}) {
    const eventType = String(row.event_type || "");
    const eventPayload = row.event_payload || {};
    return {
      ts: firstNonEmpty(row.created_at, nowIso()),
      entity_type: "sujet",
      entity_id: normalizeId(row.subject_id),
      type: "ACTIVITY",
      kind: eventType.toLowerCase(),
      actor: row.actor_person_id ? `Person ${normalizeId(row.actor_person_id).slice(0, 8)}` : "System",
      agent: "system",
      message: String(eventPayload.message || ""),
      meta: {
        source: "supabase",
        id: normalizeId(row.id),
        event_type: eventType,
        event_payload: eventPayload
      }
    };
  }

  function mapBusinessEventRowToThreadActivity(row = {}) {
    return mapBusinessEventRowToThreadActivityShared(row, { firstNonEmpty, nowIso });
  }

  function mapTimelineRowToThreadEntry(row = {}) {
    const kind = String(row?.kind || "").toLowerCase();
    if (kind === "message") {
      return mapMessageRowToThreadComment(row.message || {});
    }
    if (kind === "event") {
      return mapEventRowToThreadActivity(row.event || {});
    }
    if (kind === "business_event") {
      return mapBusinessEventRowToThreadActivity(row.event || {});
    }
    return null;
  }

  function requestScopeRerender() {
    if (typeof scheduleThreadRerender === "function") {
      debugRenderScope("thread", { source: "timeline-refresh", mode: "scheduled" });
      scheduleThreadRerender();
      return;
    }
    if (typeof requestRerender === "function") {
      const detailsHost = document.getElementById("situationsDetailsHost");
      const threadHost = detailsHost?.querySelector?.("[data-details-thread-host]");
      if (!threadHost) return;
      debugRenderScope("thread", { source: "timeline-refresh", mode: "fallback-request-rerender" });
      requestRerender(threadHost);
    }
  }

  function ensureSubjectTimelineLoaded(subjectId, options = {}) {
    const normalizedSubjectId = normalizeId(subjectId);
    if (!normalizedSubjectId || !subjectMessagesService) return;

    if (threadRenderDepth > 0) {
      console.warn("[subject-messages] timeline load requested during thread render and was ignored", {
        subjectId: normalizedSubjectId
      });
      return;
    }

    const force = !!options.force;
    const currentState = subjectTimelineState.get(normalizedSubjectId) || { loading: false, requestId: 0 };
    if (!force && subjectTimelineCache.has(normalizedSubjectId)) {
      debugRenderScope("thread-timeline-fetch", { subjectId: normalizedSubjectId, action: "skip-cache-hit" });
      return;
    }
    if (currentState.loading && !force) {
      debugRenderScope("thread-timeline-fetch", { subjectId: normalizedSubjectId, action: "skip-loading" });
      return;
    }

    const requestId = Number(currentState.requestId || 0) + 1;
    subjectTimelineState.set(normalizedSubjectId, { loading: true, requestId });
    debugRenderScope("thread-timeline-fetch", {
      subjectId: normalizedSubjectId,
      action: force ? "start-force" : "start"
    });
    subjectMessagesService.listTimeline(normalizedSubjectId)
      .then((timeline) => {
        const latestState = subjectTimelineState.get(normalizedSubjectId) || {};
        if (Number(latestState.requestId || 0) !== requestId) return;

        const messages = Array.isArray(timeline?.messages) ? timeline.messages : [];
        const events = Array.isArray(timeline?.events) ? timeline.events : [];
        const businessEvents = Array.isArray(timeline?.businessEvents) ? timeline.businessEvents : [];
        const rows = Array.isArray(timeline?.rows) ? timeline.rows : [];
        const mappedRows = rows.map((row) => mapTimelineRowToThreadEntry(row)).filter(Boolean);
        const mappedComments = mappedRows.filter((entry) => String(entry?.type || "").toUpperCase() === "COMMENT");
        const nestedComments = decorateNestedMessageComments(mappedComments);
        const nestedById = new Map(nestedComments.map((comment) => [normalizeId(comment?.meta?.id), comment]));
        subjectTimelineCache.set(normalizedSubjectId, {
          rows: mappedRows.map((entry) => {
            if (String(entry?.type || "").toUpperCase() !== "COMMENT") return entry;
            const nested = nestedById.get(normalizeId(entry?.meta?.id));
            return nested || entry;
          }),
          comments: nestedComments,
          activities: events.map((row) => mapEventRowToThreadActivity(row)),
          businessActivities: businessEvents.map((row) => mapBusinessEventRowToThreadActivity(row)),
          conversation: timeline?.conversation || null
        });
        debugRenderScope("thread-timeline-refresh", {
          subjectId: normalizedSubjectId,
          rowsCount: mappedRows.length
        });
        queueSubjectMessageReadMarking(normalizedSubjectId, messages);
        requestScopeRerender();
      })
      .catch((error) => {
        debugRenderScope("thread-timeline-fetch", { subjectId: normalizedSubjectId, action: "error" });
        console.warn("[subject-messages] timeline load failed", error);
      })
      .finally(() => {
        const latestState = subjectTimelineState.get(normalizedSubjectId) || {};
        if (Number(latestState.requestId || 0) !== requestId) return;
        subjectTimelineState.set(normalizedSubjectId, { loading: false, requestId });
      });
  }

  function ensureTimelineLoadedForSelection(selection = null, options = {}) {
    const currentSelection = selection || getActiveSelection();
    if (!currentSelection || String(currentSelection.type || "").toLowerCase() !== "sujet") return;
    const subjectId = normalizeId(currentSelection?.item?.id);
    if (!subjectId) return;
    ensureSubjectTimelineLoaded(subjectId, options);
  }

  async function addComment(entityType, entityId, message, options = {}) {
    const normalizedEntityType = String(entityType || "").toLowerCase();
    const normalizedEntityId = normalizeId(entityId);
    const normalizedMessage = String(message || "").trim();
    const normalizedUploadSessionId = normalizeId(options.uploadSessionId);
    if (!normalizedMessage && !normalizedUploadSessionId) return null;

    if (normalizedEntityType === "sujet" && normalizedEntityId && subjectMessagesService) {
      const created = options.parentMessageId
        ? await subjectMessagesService.createReply({
            subjectId: normalizedEntityId,
            parentMessageId: options.parentMessageId,
            bodyMarkdown: normalizedMessage,
            uploadSessionId: normalizedUploadSessionId || undefined,
            mentions: Array.isArray(options.mentions) ? options.mentions : []
          })
        : await subjectMessagesService.createMessage({
            subjectId: normalizedEntityId,
            bodyMarkdown: normalizedMessage,
            uploadSessionId: normalizedUploadSessionId || undefined,
            mentions: Array.isArray(options.mentions) ? options.mentions : []
          });

      if (normalizedUploadSessionId && created?.id) {
        await subjectMessagesService.linkAttachmentsToMessage({
          subjectId: normalizedEntityId,
          messageId: created.id,
          uploadSessionId: normalizedUploadSessionId
        });
      }

      ensureSubjectTimelineLoaded(normalizedEntityId, { force: true });
      return created;
    }

    persistRunBucket((bucket) => {
      bucket.comments.push({
        ts: nowIso(),
        entity_type: entityType,
        entity_id: entityId,
        type: "COMMENT",
        actor: options.actor || "Human",
        agent: options.agent || "human",
        message: String(message || ""),
        pending: !!options.pending,
        request_id: options.request_id || null,
        meta: options.meta || {}
      });
    });

    return null;
  }

  async function editSubjectMessage(subjectId, messageId, { bodyMarkdown = "", uploadSessionId = "" } = {}) {
    const normalizedSubjectId = normalizeId(subjectId);
    const normalizedMessageId = normalizeId(messageId);
    const nextBody = String(bodyMarkdown || "");
    const normalizedUploadSessionId = normalizeId(uploadSessionId);
    if (!normalizedSubjectId || !normalizedMessageId || !subjectMessagesService) return null;
    const updated = await subjectMessagesService.editMessage({
      messageId: normalizedMessageId,
      subjectId: normalizedSubjectId,
      bodyMarkdown: nextBody,
      uploadSessionId: normalizedUploadSessionId || undefined
    });
    ensureSubjectTimelineLoaded(normalizedSubjectId, { force: true });
    return updated;
  }

  async function deleteSubjectMessage(subjectId, messageId) {
    const normalizedSubjectId = normalizeId(subjectId);
    const normalizedMessageId = normalizeId(messageId);
    if (!normalizedSubjectId || !normalizedMessageId || !subjectMessagesService) return null;
    const deleted = await subjectMessagesService.deleteMessage(normalizedMessageId);
    ensureSubjectTimelineLoaded(normalizedSubjectId, { force: true });
    return deleted;
  }

  async function toggleSubjectMessageReaction(subjectId, messageId, reactionCode) {
    const normalizedSubjectId = normalizeId(subjectId);
    const normalizedMessageId = normalizeId(messageId);
    const normalizedReactionCode = String(reactionCode || "").trim();
    if (!normalizedSubjectId || !normalizedMessageId || !normalizedReactionCode || !subjectMessagesService) return null;
    const reaction = await subjectMessagesService.toggleMessageReaction(normalizedMessageId, normalizedReactionCode);
    ensureSubjectTimelineLoaded(normalizedSubjectId, { force: true });
    return reaction;
  }

  function addActivity(entityType, entityId, kind, message = "", meta = {}, options = {}) {
    persistRunBucket((bucket) => {
      bucket.activities.push({
        ts: nowIso(),
        entity_type: entityType,
        entity_id: entityId,
        type: "ACTIVITY",
        kind,
        actor: options.actor || "Human",
        agent: options.agent || "human",
        message: String(message || ""),
        meta: meta || {}
      });
    });
  }

  function decisionStatus(decision) {
    const d = String(decision || "").toUpperCase();
    if (d === "CLOSED") return "closed";
    if (d === "REOPENED" || d === "OPEN") return "open";
    return null;
  }

  function setDecision(entityType, entityId, decision, note = "", options = {}) {
    const actor = options.actor || "Human";
    const agent = options.agent || "human";
    const ts = options.ts || nowIso();
    const nextDecision = String(decision || "");
    const nextNote = String(note || "");

    persistRunBucket((bucket) => {
      bucket.decisions[entityType] = bucket.decisions[entityType] || {};
      const prev = bucket.decisions[entityType][entityId] || null;
      bucket.decisions[entityType][entityId] = {
        ts,
        actor,
        decision: nextDecision,
        note: nextNote
      };

      const prevStatus = decisionStatus(prev?.decision);
      const nextStatus = decisionStatus(nextDecision);
      if ((entityType === "sujet" || entityType === "situation") && nextStatus && nextStatus !== prevStatus) {
        const parentSituation = entityType === "sujet" ? getSituationBySujetId(entityId) : null;
        const targetId = entityType === "sujet" ? (parentSituation?.id || entityId) : entityId;
        bucket.activities.push({
          ts,
          entity_type: "situation",
          entity_id: targetId,
          type: "ACTIVITY",
          kind: nextStatus === "closed" ? "issue_closed" : "issue_reopened",
          actor,
          agent,
          message: nextNote,
          meta: entityType === "sujet" ? { problem_id: entityId } : { situation_id: entityId }
        });
      }
    });
  }

  function getDecision(entityType, entityId) {
    const { bucket } = getRunBucket();
    return bucket?.decisions?.[entityType]?.[entityId] || null;
  }

  function getThreadForSelection() {
    ensureViewUiState();
    const selection = getActiveSelection();
    if (!selection) return [];

    const { bucket } = getRunBucket();
    const localComments = Array.isArray(bucket?.comments) ? bucket.comments : [];
    const activities = Array.isArray(bucket?.activities) ? bucket.activities : [];
    const events = [];

    const situation = selection.type === "situation"
      ? selection.item
      : selection.type === "sujet"
        ? getSituationBySujetId(selection.item.id)
        : null;
    const subject = selection.type === "sujet" ? selection.item : null;
    const rootTs = firstNonEmpty(store.situationsView?.rawResult?.updated_at, store.situationsView?.rawResult?.created_at, nowIso());

    if (situation) {
      events.push({
        ts: rootTs,
        actor: "System",
        agent: inferAgent(situation),
        type: "SITUATION",
        entity_type: "situation",
        entity_id: situation.id,
        message: `${firstNonEmpty(situation.title, situation.id, "(sans titre)")}
priority=${firstNonEmpty(situation.priority, "")}
sujets=${(situation.sujets || []).length}`
      });
    }
    if (subject) {
      events.push({
        ts: rootTs,
        actor: "System",
        agent: inferAgent(subject),
        type: "SUJET",
        entity_type: "sujet",
        entity_id: subject.id,
        message: `${firstNonEmpty(subject.title, subject.id, "Non classé")}
priority=${firstNonEmpty(subject.priority, "")}`
      });
    }

    const allowedComments = new Set();
    const allowedActivities = new Set();
    const entityKey = (type, id) => `${String(type || "").toLowerCase()}:${String(id || "")}`;

    if (subject) {
      allowedComments.add(entityKey("sujet", subject.id));
      allowedActivities.add(entityKey("sujet", subject.id));
      if (situation) allowedActivities.add(entityKey("situation", situation.id));
    } else if (situation) {
      allowedComments.add(entityKey("situation", situation.id));
      allowedActivities.add(entityKey("situation", situation.id));
    }

    const isViewingSubject = !!subject;

    const persistedTimeline = subject ? (subjectTimelineCache.get(normalizeId(subject.id)) || null) : null;
    const comments = subject ? [] : localComments;
    const persistedActivities = subject ? [] : [];
    const persistedRows = subject ? (persistedTimeline?.rows || []) : [];

    const humanEvents = [...comments, ...activities, ...persistedActivities, ...persistedRows].filter((e) => {
      const k = entityKey(e.entity_type, e.entity_id);
      const t = String(e?.type || "").toUpperCase();

      if (t === "COMMENT") return allowedComments.has(k);
      if (t !== "ACTIVITY") return allowedComments.has(k) || allowedActivities.has(k);
      if (!allowedActivities.has(k)) return false;

      if (isViewingSubject && String(e?.entity_type || "").toLowerCase() === "situation") {
        const meta = e?.meta || {};
        if (meta?.problem_id) return String(meta.problem_id) === String(subject.id);
      }

      return true;
    });

    if (subject) {
      return humanEvents.sort((x, y) => String(x.ts || "").localeCompare(String(y.ts || "")));
    }

    const orderRank = (e) => {
      const t = String(e?.type || "").toUpperCase();
      if (t === "SITUATION") return 0;
      if (t === "SUJET") return 1;
      return 2;
    };

    return [...events, ...humanEvents].sort((x, y) => {
      const xr = orderRank(x);
      const yr = orderRank(y);
      if (xr !== yr) return xr - yr;
      return String(x.ts || "").localeCompare(String(y.ts || ""));
    });
  }

  function groupThreadReplies(thread = []) {
    const commentEntries = (Array.isArray(thread) ? thread : [])
      .filter((entry) => String(entry?.type || "").toUpperCase() === "COMMENT");
    const commentsById = new Map();
    const childrenByParentId = new Map();

    commentEntries.forEach((entry) => {
      const id = normalizeId(entry?.meta?.id);
      if (!id) return;
      commentsById.set(id, entry);
    });

    commentEntries.forEach((entry) => {
      const id = normalizeId(entry?.meta?.id);
      const parentId = normalizeId(entry?.meta?.parent_message_id);
      if (!id || !parentId || !commentsById.has(parentId)) return;
      const current = childrenByParentId.get(parentId) || [];
      current.push(entry);
      childrenByParentId.set(parentId, current);
    });

    childrenByParentId.forEach((list, parentId) => {
      childrenByParentId.set(
        parentId,
        list.sort((left, right) => String(left?.ts || "").localeCompare(String(right?.ts || "")))
      );
    });

    return { commentsById, childrenByParentId };
  }

  function renderInlineReplyComposer({ commentId, isExpanded, draft, previewMode, attachments = [], depth = 0 }) {
    if (!commentId) return "";
    const pendingAttachments = Array.isArray(attachments) ? attachments : [];
    const normalizedDraft = String(draft || "");
    const hasReadyAttachment = pendingAttachments.some((attachment) => String(attachment?.uploadStatus || "").trim() === "ready" && !attachment?.error);
    const canSubmit = !!normalizedDraft.trim() || hasReadyAttachment;
    const pendingAttachmentsHtml = pendingAttachments.length
      ? `
        <div class="subject-composer-attachments">
          ${pendingAttachments.map((attachment, index) => `
            <div class="subject-composer-attachment-item">
              ${renderAttachmentTile(attachment, {
                forceImage: !!attachment.isImage,
                uploadState: attachment.error
                  ? "error"
                  : String(attachment.uploadStatus || "").trim() === "uploading"
                    ? "uploading"
                    : "ready",
                uploadStateText: attachment.error ? "Erreur d’upload" : ""
              })}
              <button
                class="subject-composer-attachment-remove"
                type="button"
                data-action="thread-reply-attachment-remove"
                data-message-id="${escapeHtml(commentId)}"
                data-attachment-id="${escapeHtml(normalizeId(attachment.id))}"
                data-temp-id="${escapeHtml(String(attachment.tempId || index))}"
                aria-label="Retirer la pièce jointe"
              >
                ${svgIcon("x")}
              </button>
            </div>
          `).join("")}
        </div>
      `
      : "";

    const inlineEditorClass = Number(depth || 0) > 0
      ? "thread-inline-reply-editor thread-inline-reply-editor--nested"
      : "thread-inline-reply-editor thread-inline-reply-editor--root";
    return `
      <div class="${inlineEditorClass} ${isExpanded ? "" : "hidden"}" data-inline-reply-editor="${escapeHtml(commentId)}" ${isExpanded ? "" : "aria-hidden=\"true\""}>
        ${renderCommentComposer({
          hideAvatar: true,
          hideTitle: true,
          previewMode,
          textareaId: `threadReplyBox-${commentId}`,
          previewId: `threadReplyPreview-${commentId}`,
          textareaValue: normalizedDraft,
          textareaAttributes: {
            "data-thread-reply-draft": commentId
          },
          placeholder: "Écrire une réponse, glisser-déposer une pièce jointe...",
          tabWriteAction: "thread-reply-tab-write",
          tabPreviewAction: "thread-reply-tab-preview",
          tabsClassName: "comment-composer__tabs--thread-reply",
          composerClassName: "comment-composer--thread-reply-editor",
          toolbarHtml: renderSubjectMarkdownToolbar({ buttonAction: "thread-reply-format", svgIcon, extraData: { messageId: commentId } }),
          previewHtml: normalizedDraft.trim()
            ? mdToHtml(normalizedDraft, { preserveMessageLineBreaks: true })
            : "",
          actionsHtml: `
            <div class="thread-inline-reply-editor__actions">
              <button class="gh-btn" type="button" data-action="thread-reply-cancel" data-message-id="${escapeHtml(commentId)}">Annuler</button>
              <button class="gh-btn gh-btn--comment gh-btn--primary" type="button" data-action="thread-reply-submit" data-message-id="${escapeHtml(commentId)}" ${canSubmit ? "" : "disabled"}>Répondre</button>
            </div>
          `,
          previewEmptyHint: "Use Markdown to format your reply",
          footerHtml: `
            <input
              id="threadReplyAttachmentInput-${escapeHtml(commentId)}"
              type="file"
              class="subject-composer-file-input"
              data-role="thread-reply-file-input"
              data-message-id="${escapeHtml(commentId)}"
              multiple
            />
            <div
              class="subject-composer-attachments-preview ${pendingAttachments.length ? "" : "hidden"}"
              data-role="thread-reply-attachments-preview"
              data-message-id="${escapeHtml(commentId)}"
              aria-live="polite"
            >
              ${pendingAttachmentsHtml}
            </div>
          `
        })}
      </div>
    `;
  }

  function renderInlineEditComposer({ commentId, depth = 0, isEditing = false, draft = "", previewMode = false, originalMessage = "", attachments = [] } = {}) {
    if (!commentId) return "";
    const normalizedDraft = String(draft || "");
    const pendingAttachments = Array.isArray(attachments) ? attachments : [];
    const hasReadyAttachment = pendingAttachments.some((attachment) => String(attachment?.uploadStatus || "").trim() === "ready" && !attachment?.error);
    const isNestedReplyEdit = Number(depth || 0) > 0;
    const editModeClass = isNestedReplyEdit
      ? "thread-inline-edit-editor--nested"
      : "thread-inline-edit-editor--root";
    const composerEditClass = isNestedReplyEdit
      ? "comment-composer--thread-edit-nested"
      : "comment-composer--thread-edit-root";
    const submitLabel = Number(depth || 0) > 0 ? "Mettre à jour la réponse" : "Mettre à jour le commentaire";
    const canSubmit = !!normalizedDraft.trim() || hasReadyAttachment;
    const pendingAttachmentsHtml = pendingAttachments.length
      ? `
        <div class="subject-composer-attachments">
          ${pendingAttachments.map((attachment, index) => `
            <div class="subject-composer-attachment-item">
              ${renderAttachmentTile(attachment, {
                forceImage: !!attachment.isImage,
                uploadState: attachment.error
                  ? "error"
                  : String(attachment.uploadStatus || "").trim() === "uploading"
                    ? "uploading"
                    : "ready",
                uploadStateText: attachment.error ? "Erreur d’upload" : ""
              })}
              <button
                class="subject-composer-attachment-remove"
                type="button"
                data-action="thread-edit-attachment-remove"
                data-message-id="${escapeHtml(commentId)}"
                data-attachment-id="${escapeHtml(normalizeId(attachment.id))}"
                data-temp-id="${escapeHtml(String(attachment.tempId || index))}"
                aria-label="Retirer la pièce jointe"
              >
                ${svgIcon("x")}
              </button>
            </div>
          `).join("")}
        </div>
      `
      : "";
    return `
      <div class="thread-inline-edit-editor ${editModeClass} ${isEditing ? "" : "hidden"}" data-inline-edit-editor="${escapeHtml(commentId)}" ${isEditing ? "" : "aria-hidden=\"true\""}>
        ${renderCommentComposer({
          hideAvatar: true,
          hideTitle: true,
          previewMode,
          textareaId: `threadEditBox-${commentId}`,
          previewId: `threadEditPreview-${commentId}`,
          textareaValue: normalizedDraft,
          textareaAttributes: {
            "data-thread-edit-draft": commentId
          },
          placeholder: "Modifier le message, glisser-déposer une pièce jointe...",
          tabWriteAction: "thread-edit-tab-write",
          tabPreviewAction: "thread-edit-tab-preview",
          tabsClassName: "comment-composer__tabs--thread-reply",
          composerClassName: `comment-composer--thread-reply-editor ${composerEditClass}`,
          toolbarHtml: renderSubjectMarkdownToolbar({ buttonAction: "thread-edit-format", svgIcon, extraData: { messageId: commentId } }),
          previewHtml: normalizedDraft.trim()
            ? mdToHtml(normalizedDraft, { preserveMessageLineBreaks: true })
            : "",
          actionsHtml: `
            <div class="thread-inline-reply-editor__actions">
              <button class="gh-btn" type="button" data-action="thread-edit-cancel" data-message-id="${escapeHtml(commentId)}">Annuler</button>
              <button class="gh-btn gh-btn--comment gh-btn--primary" type="button" data-action="thread-edit-submit" data-message-id="${escapeHtml(commentId)}" data-original-body="${escapeHtml(String(originalMessage || ""))}" ${canSubmit ? "" : "disabled"}>${submitLabel}</button>
            </div>
          `,
          previewEmptyHint: "Use Markdown to format your comment",
          footerHtml: `
            <input
              id="threadEditAttachmentInput-${escapeHtml(commentId)}"
              type="file"
              class="subject-composer-file-input"
              data-role="thread-edit-file-input"
              data-message-id="${escapeHtml(commentId)}"
              multiple
            />
            <div
              class="subject-composer-attachments-preview ${pendingAttachments.length ? "" : "hidden"}"
              data-role="thread-edit-attachments-preview"
              data-message-id="${escapeHtml(commentId)}"
              aria-live="polite"
            >
              ${pendingAttachmentsHtml}
            </div>
          `
        })}
      </div>
    `;
  }

  function resolveThreadCommentIdentity(entry) {
    const currentUserId = normalizeId(store?.user?.id);
    const authorUserId = normalizeId(entry?.meta?.author_user_id);
    const isCurrentUserAuthor = !!authorUserId && !!currentUserId && authorUserId === currentUserId;
    const agent = isCurrentUserAuthor ? "human" : "member";
    const isRapso = agent === "specialist_ps";
    if (isRapso) {
      return { displayName: "Agent specialist_ps", avatarType: "agent", avatarHtml: "", avatarInitial: "AS" };
    }
    return getAuthorIdentity({
      author: entry?.actor,
      agent,
      avatarUrl: entry?.meta?.author_avatar_url || "",
      currentUserAvatar: isCurrentUserAuthor ? store?.user?.avatar : "",
      humanAvatarHtml: SVG_AVATAR_HUMAN,
      fallbackName: "System"
    });
  }

  function renderThreadCommentActions(entry) {
    const commentId = normalizeId(entry?.meta?.id);
    if (!commentId) return "";
    const isEditable = !entry?.meta?.is_frozen && !entry?.meta?.is_deleted;
    const messageReactionSummary = buildMessageReactionSummary(entry?.meta?.reactions || []);
    return `
      <div class="thread-comment-menu">
        <button
          class="thread-comment-menu__trigger"
          type="button"
          aria-label="Actions du message"
          data-action="thread-reply-menu-toggle"
          data-message-id="${escapeHtml(commentId)}"
        >
          ${svgIcon("kebab-horizontal")}
        </button>
        <div class="thread-comment-menu__dropdown">
          ${isEditable
            ? `
              <button class="gh-menu__item" type="button" data-action="thread-message-edit" data-message-id="${escapeHtml(commentId)}" data-message-body="${escapeHtml(String(entry?.message || ""))}">Modifier le message</button>
              <button class="gh-menu__item" type="button" data-action="thread-message-delete" data-message-id="${escapeHtml(commentId)}">Supprimer le message</button>
              <div class="thread-comment-menu__divider" role="separator" aria-hidden="true"></div>
            `
            : ""}
          <button class="gh-menu__item" type="button" data-action="thread-reply-open" data-message-id="${escapeHtml(commentId)}">Répondre au message</button>
          <div class="thread-comment-menu__divider" role="separator" aria-hidden="true"></div>
          <div class="thread-comment-menu__reactions-label">Réagir au message</div>
          <div class="thread-comment-menu__reactions-grid">
            ${THREAD_REACTION_CHOICES.map((choice) => `
              <button
                class="thread-comment-menu__reaction-btn ${messageReactionSummary.get(choice.code)?.reactedByCurrentUser ? "is-active" : ""}"
                type="button"
                data-action="thread-message-reaction-toggle"
                data-message-id="${escapeHtml(commentId)}"
                data-reaction-code="${escapeHtml(choice.code)}"
                title="${escapeHtml(choice.label)}"
                aria-label="${escapeHtml(choice.label)}"
              >
                <img
                  src="${escapeHtml(choice.assetPath)}"
                  alt=""
                  loading="lazy"
                  onerror="this.style.display='none'; this.parentElement?.querySelector('.thread-reaction-fallback')?.classList.remove('hidden');"
                />
                <span class="thread-reaction-fallback hidden" aria-hidden="true">${escapeHtml(choice.emoji)}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderThreadCommentNode(entry, { idx = 0, depth = 0, childrenByParentId = new Map(), replyUi = {} } = {}) {
    const commentId = normalizeId(entry?.meta?.id);
    if (!commentId) return "";
    const identity = resolveThreadCommentIdentity(entry);
    const tsHtml = entry?.ts ? `<div class="mono-small">${escapeHtml(fmtTs(entry.ts))}</div>` : "";
    const childReplies = childrenByParentId.get(commentId) || [];
    const nestedDepth = Math.min(MAX_REPLY_VISUAL_DEPTH, Math.max(1, Number(depth || 0)));
    const classes = depth > 0
      ? `message-thread__comment--nested message-thread__comment--reply-item message-thread__comment--depth-${nestedDepth}`
      : "";
    const isExpanded = replyUi.expandedMessageId === commentId;
    const isEditing = replyUi.editMessageId === commentId;
    const draft = String(replyUi.draftsByMessageId?.[commentId] || "");
    const previewMode = !!replyUi.previewByMessageId?.[commentId];
    const hasExplicitEditDraft = !!replyUi.editDraftsByMessageId
      && Object.prototype.hasOwnProperty.call(replyUi.editDraftsByMessageId, commentId);
    const editDraft = hasExplicitEditDraft
      ? String(replyUi.editDraftsByMessageId?.[commentId] || "")
      : String(entry?.message || "");
    const editPreviewMode = !!replyUi.editPreviewByMessageId?.[commentId];
    const attachments = Array.isArray(replyUi.attachmentsByMessageId?.[commentId])
      ? replyUi.attachmentsByMessageId[commentId]
      : [];
    const editAttachments = Array.isArray(replyUi.editAttachmentsByMessageId?.[commentId])
      ? replyUi.editAttachmentsByMessageId[commentId]
      : [];
    const messageReactionSummary = buildMessageReactionSummary(entry?.meta?.reactions || []);
    const reactionsSummaryList = THREAD_REACTION_CHOICES
      .map((choice) => ({ ...choice, ...(messageReactionSummary.get(choice.code) || { count: 0, reactedByCurrentUser: false }) }))
      .filter((choice) => Number(choice.count) > 0);
    const repliesHtml = childReplies.length
      ? `
        <div class="thread-comment-replies thread-comment-replies--github">
          ${childReplies.map((reply, replyIdx) => renderThreadCommentNode(reply, {
            idx: idx + replyIdx + 1,
            depth: depth + 1,
            childrenByParentId,
            replyUi
          })).join("")}
        </div>
      `
      : "";

    return renderMessageThreadComment({
      idx,
      author: identity.displayName,
      tsHtml,
      headerRightHtml: renderThreadCommentActions(entry),
      bodyHtml: `
        <div class="thread-comment-content-capsule ${isEditing ? "hidden" : ""}" data-thread-comment-content="${escapeHtml(commentId)}">
          ${mdToHtml(entry?.message || "", { preserveMessageLineBreaks: true })}
        </div>
        ${renderInlineEditComposer({
          commentId,
          depth,
          isEditing,
          draft: editDraft,
          previewMode: editPreviewMode,
          originalMessage: String(entry?.message || ""),
          attachments: editAttachments
        })}
        ${(Array.isArray(entry?.meta?.attachments) && entry.meta.attachments.length)
          ? `<div class="subject-attachment-grid">${entry.meta.attachments.map((attachment) => renderAttachmentTile(attachment)).join("")}</div>`
          : ""}
        ${(childReplies.length || reactionsSummaryList.length)
          ? `
            <div class="thread-comment-footer">
              ${reactionsSummaryList.length
                ? `
                  <div class="thread-comment-footer__reactions">
                    ${reactionsSummaryList.map((reaction) => `
                      <span class="arkolia-identity-chip thread-comment-reaction-chip ${reaction.reactedByCurrentUser ? "is-active" : ""}">
                        <img
                          src="${escapeHtml(reaction.assetPath)}"
                          alt=""
                          loading="lazy"
                          onerror="this.style.display='none'; this.parentElement?.querySelector('.thread-reaction-fallback')?.classList.remove('hidden');"
                        />
                        <span class="thread-reaction-fallback hidden" aria-hidden="true">${escapeHtml(reaction.emoji)}</span>
                        <span>${reaction.count}</span>
                      </span>
                    `).join("")}
                  </div>
                `
                : ""}
              ${childReplies.length
                ? `<span class="mono-small color-fg-muted thread-comment-footer__replies-count">${childReplies.length} réponse${childReplies.length > 1 ? "s" : ""}</span>`
                : ""}
            </div>
          `
          : ""}
        ${repliesHtml}
        <div class="thread-comment-reply-box">
          ${renderInlineReplyComposer({
            commentId,
            isExpanded,
            draft,
            previewMode,
            attachments,
            depth
          })}
        </div>
      `,
      avatarType: identity.avatarType,
      avatarHtml: identity.avatarHtml,
      avatarInitial: identity.avatarInitial,
      className: classes
    });
  }

  function renderAttachmentTile(attachment = {}, options = {}) {
    return renderSubjectAttachmentTile(attachment, {
      ...options,
      escapeHtml,
      svgIcon
    });
  }

  function readDeltaEntries(payload = {}, key = "added") {
    const list = payload?.delta?.[key];
    if (!Array.isArray(list)) return [];
    return list
      .map((entry) => firstNonEmpty(entry?.label, entry?.title, entry?.name, entry?.id))
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  function summarizeCollectionChange(payload = {}, entityLabel = "élément") {
    const added = readDeltaEntries(payload, "added");
    const removed = readDeltaEntries(payload, "removed");
    if (added.length === 1 && !removed.length) return `a ajouté ${added[0]}`;
    if (removed.length === 1 && !added.length) return `a retiré ${removed[0]}`;
    if (added.length || removed.length) {
      const parts = [];
      if (added.length) parts.push(`+${added.length}`);
      if (removed.length) parts.push(`-${removed.length}`);
      return `a mis à jour (${parts.join(" / ")} ${entityLabel}${added.length + removed.length > 1 ? "s" : ""})`;
    }
    return "";
  }

  const BUSINESS_ACTIVITY_CONFIG = {
    subject_title_updated: { icon: "pencil", tone: "business-edit", verb: "a modifié le titre" },
    subject_description_updated: { icon: "note", tone: "business-edit", verb: "a modifié la description" },
    subject_assignees_changed: {
      icon: "person-add",
      tone: "business-people",
      verb: "a mis à jour les assignés",
      summarize: (payload) => summarizeCollectionChange(payload, "assigné")
    },
    subject_labels_changed: {
      icon: "tag",
      tone: "business-labels",
      verb: "a mis à jour les labels",
      summarize: (payload) => summarizeCollectionChange(payload, "label")
    },
    subject_situations_changed: {
      icon: "project",
      tone: "business-rel",
      verb: "a mis à jour les situations",
      summarize: (payload) => summarizeCollectionChange(payload, "situation")
    },
    subject_objectives_changed: {
      icon: "goal",
      tone: "business-rel",
      verb: "a mis à jour les objectifs",
      summarize: (payload) => summarizeCollectionChange(payload, "objectif")
    },
    subject_parent_added: { icon: "arrow-up", tone: "business-rel", verb: "a ajouté un parent" },
    subject_parent_removed: { icon: "arrow-up", tone: "business-rel", verb: "a retiré un parent" },
    subject_child_added: { icon: "arrow-down", tone: "business-rel", verb: "a ajouté un sous-sujet" },
    subject_child_removed: { icon: "arrow-down", tone: "business-rel", verb: "a retiré un sous-sujet" },
    subject_blocked_by_added: { icon: "blocked", tone: "business-alert", verb: "a ajouté un blocage entrant" },
    subject_blocked_by_removed: { icon: "blocked", tone: "business-alert", verb: "a retiré un blocage entrant" },
    subject_blocking_for_added: { icon: "blocked", tone: "business-alert", verb: "a ajouté un blocage sortant" },
    subject_blocking_for_removed: { icon: "blocked", tone: "business-alert", verb: "a retiré un blocage sortant" },
    subject_closed: { icon: "check-circle", tone: "business-alert", verb: "a fermé le sujet" },
    subject_reopened: { icon: "issue-reopened", tone: "business-open", verb: "a rouvert le sujet" }
  };

  function getBusinessActivityAppearance(eventType = "") {
    const normalized = String(eventType || "").toLowerCase();
    return BUSINESS_ACTIVITY_CONFIG[normalized] || {
      icon: "history",
      tone: "business-neutral",
      verb: "a mis à jour le sujet"
    };
  }

  function renderThreadBlock() {
    threadRenderDepth += 1;
    try {
      const thread = getThreadForSelection();
      if (!thread.length) return "";
      const replyUi = getInlineReplyUiState();
      const { childrenByParentId } = groupThreadReplies(thread);
      let commentRenderIdx = 0;

      const itemsHtml = thread.map((e, idx) => {
      const type = String(e?.type || "").toUpperCase();

      if (type === "COMMENT") {
        const parentId = normalizeId(e?.meta?.parent_message_id);
        if (parentId) return "";
        const rendered = renderThreadCommentNode(e, {
          idx: commentRenderIdx,
          depth: 0,
          childrenByParentId,
          replyUi
        });
        commentRenderIdx += 1;
        return rendered;
      }

      if (type === "ACTIVITY") {
        const kind = String(e?.kind || "").toLowerCase();
        if (kind === "message_deleted") return "";
        if (String(e?.meta?.source || "") === "subject_history") {
          const activityIdentity = getAuthorIdentity({
            author: e?.actor,
            agent: "human",
            currentUserAvatar: store?.user?.avatar,
            humanAvatarHtml: SVG_AVATAR_HUMAN,
            fallbackName: "Utilisateur"
          });
          const appearance = getBusinessActivityAppearance(e?.meta?.event_type || kind);
          const payload = e?.meta?.event_payload && typeof e.meta.event_payload === "object" ? e.meta.event_payload : {};
          const ts = fmtTs(e?.ts || "");
          const note = buildBusinessActivitySummary({
            payload,
            appearance,
            fallbackMessage: e?.message,
            firstNonEmpty
          });
          const noteHtml = note ? `<div class="tl-note">${escapeHtml(note)}</div>` : "";

          return renderMessageThreadActivity({
            idx,
            className: `thread-item--business thread-item--${appearance.tone} thread-item--event-${String(e?.meta?.event_type || "").toLowerCase()}`,
            iconHtml: `<span class="tl-ico tl-ico--business tl-ico--${appearance.tone}" aria-hidden="true">${svgIcon(appearance.icon)}</span>`,
            authorIconHtml: activityIdentity.avatarHtml
              ? `<span class="tl-author tl-author--custom" aria-hidden="true">${activityIdentity.avatarHtml}</span>`
              : miniAuthorIconHtml("human"),
            textHtml: `
              <span class="tl-author-name">${escapeHtml(activityIdentity.displayName)}</span>
              <span class="mono-small"> ${escapeHtml(appearance.verb)} </span>
              <span class="mono-small">· ${escapeHtml(ts)}</span>
            `,
            noteHtml
          });
        }
        const agent = e?.agent || "system";
        const activityIdentity = getAuthorIdentity({
          author: e?.actor,
          agent,
          currentUserAvatar: store?.user?.avatar,
          humanAvatarHtml: SVG_AVATAR_HUMAN,
          fallbackName: "System"
        });
        const displayName = activityIdentity.displayName;
        const ts = fmtTs(e?.ts || "");
        let iconHtml = `<span class="tl-ico tl-ico--muted" aria-hidden="true"></span>`;
        let verb = "updated";
        let targetHtml = "";

        if (kind === "issue_closed") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-closed" aria-hidden="true">${SVG_TL_CLOSED}</span>`;
          const sujetId = e?.meta?.problem_id;
          const sujet = sujetId ? getNestedSujet(sujetId) : null;
          const sujetTitle = sujet?.title ? `${escapeHtml(sujet.title)} ` : "";
          verb = "closed";
          targetHtml = sujetId ? `sujet ${sujetTitle}${entityDisplayLinkHtml("sujet", sujetId)}` : "this";
        } else if (kind === "issue_reopened") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${SVG_TL_REOPENED}</span>`;
          const sujetId = e?.meta?.problem_id;
          const sujet = sujetId ? getNestedSujet(sujetId) : null;
          const sujetTitle = sujet?.title ? `${escapeHtml(sujet.title)} ` : "";
          verb = "reopened";
          targetHtml = sujetId ? `sujet ${sujetTitle}${entityDisplayLinkHtml("sujet", sujetId)}` : "this";
        } else if (kind === "review_validated" || kind === "review_rejected" || kind === "review_dismissed" || kind === "review_restored") {
          const entityType = String(e?.entity_type || "").toLowerCase();
          const entityId = String(e?.entity_id || "");
          const entity = getEntityByType(entityType, entityId);
          const entityTitle = entity?.title ? `${escapeHtml(entity.title)} ` : "";
          const counts = e?.meta?.counts || {};
          const descendants = Math.max(0, Number(counts?.sujet || 0) + Number(counts?.situation || 0) - 1);

          if (kind === "review_validated") {
            iconHtml = renderReviewStateIcon("validated", { entityType });
            verb = "validated";
          } else if (kind === "review_restored") {
            iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${SVG_TL_REOPENED}</span>`;
            verb = "restored";
          } else {
            iconHtml = renderReviewStateIcon(kind === "review_dismissed" ? "dismissed" : "rejected", { entityType, isSeen: true });
            verb = kind === "review_dismissed" ? "dismissed" : "rejected";
          }

          targetHtml = entityId
            ? `${entityType} ${entityTitle}${entityDisplayLinkHtml(entityType, entityId)}${descendants > 0 ? ` · ${descendants} descendant(s)` : ""}`
            : "this";
        } else if (kind === "description_version_initial" || kind === "description_version_saved" || kind === "subject_description_updated") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${svgIcon("pencil")}</span>`;
          verb = kind === "description_version_initial"
            ? "archived description"
            : kind === "subject_description_updated"
              ? "updated description on"
              : "saved description";
          const entityType = String(e?.entity_type || "").toLowerCase();
          const entityId = String(e?.entity_id || "");
          const entity = getEntityByType(entityType, entityId);
          const entityTitle = entity?.title ? `${escapeHtml(entity.title)} ` : "";
          targetHtml = entityId ? `${entityType} ${entityTitle}${entityDisplayLinkHtml(entityType, entityId)}` : "this";
        } else if (kind === "message_posted") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${svgIcon("comment-discussion")}</span>`;
          verb = "posted a message on";
          targetHtml = "this conversation";
        } else if (kind === "message_edited") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${svgIcon("pencil")}</span>`;
          verb = "edited a message on";
          targetHtml = "this conversation";
        } else if (kind === "message_frozen") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-closed" aria-hidden="true">${svgIcon("lock")}</span>`;
          verb = "froze a message on";
          targetHtml = "this conversation";
        } else if (kind === "conversation_locked") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-closed" aria-hidden="true">${svgIcon("lock")}</span>`;
          verb = "locked";
          targetHtml = "the conversation";
        } else if (kind === "conversation_unlocked") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${svgIcon("unlock")}</span>`;
          verb = "unlocked";
          targetHtml = "the conversation";
        } else if (kind === "attachments_linked") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${svgIcon("paperclip")}</span>`;
          verb = "added attachments to";
          targetHtml = "this conversation";
        }

        const note = String(e?.message || "").trim();
        const noteHtml = note ? `<div class="tl-note">${mdToHtml(note)}</div>` : "";

        return renderMessageThreadActivity({
          idx,
          iconHtml,
          authorIconHtml: activityIdentity.avatarHtml
            ? `<span class="tl-author tl-author--custom" aria-hidden="true">${activityIdentity.avatarHtml}</span>`
            : miniAuthorIconHtml(agent),
          textHtml: `
            <span class="tl-author-name">${escapeHtml(displayName)}</span>
            <span class="mono-small"> ${escapeHtml(verb)} ${targetHtml || ""} </span>
            <span class="mono-small">at ${escapeHtml(ts)}</span>
          `,
          noteHtml
        });
      }

      return renderMessageThreadEvent({
        idx,
        badgeHtml: `
          <div class="thread-badge__subissue">
            ${svgIcon("issue-tracks", {
              className: "octicon octicon-issue-tracks Octicon__StyledOcticon-sc-jtj3m8-0 TimelineRow-module__Octicon__SMhVa"
            })}
          </div>
        `,
        headHtml: `
          <div class="mono">
            <span>${escapeHtml(getAuthorIdentity({ author: e.actor, agent: e.agent, fallbackName: "System" }).displayName)}</span>
            <span> attached this to </span>
            <span>${escapeHtml(e.entity_type || "")} n° ${entityDisplayLinkHtml(e.entity_type, e.entity_id)}</span>
            <span>·</span>
            <span> (agent=${escapeHtml(e.agent || "system")})</span>
            <div class="mono">in ${escapeHtml(fmtTs(e.ts || ""))}</div>
          </div>
        `,
        bodyHtml: escapeHtml(e.message || "")
      });
      }).join("");

      return `
        <div class="gh-timeline-title gh-timeline-title--hidden mono">Discussion</div>
        ${renderMessageThread({ itemsHtml })}
      `;
    } finally {
      threadRenderDepth = Math.max(0, threadRenderDepth - 1);
    }
  }

  function renderIssueStatusAction(selection) {
    if (!selection?.type || !selection?.item?.id) return "";

    const item = selection.item;
    const issueStatus = selection.type === "sujet"
      ? getEffectiveSujetStatus(item.id)
      : getEffectiveSituationStatus(item.id);
    const isOpen = String(issueStatus || "open").toLowerCase() === "open";

    return renderGhActionButton({
      id: `issue-status-${selection.type}-${item.id}`,
      label: isOpen ? "Close" : "Reopen",
      icon: isOpen ? SVG_ISSUE_CLOSED : SVG_ISSUE_REOPENED,
      tone: "default",
      size: "sm",
      className: "js-issue-status-action",
      mainAction: isOpen ? "issue:close:realized" : "issue:reopen",
      items: isOpen
        ? [
            {
              label: "Fermé comme réalisé",
              action: "issue:close:realized",
              icon: SVG_ISSUE_CLOSED
            },
            {
              label: "Fermé comme non pertinent",
              action: "issue:close:dismissed",
              icon: renderReviewStateIcon("dismissed", { entityType: getSelectionEntityType(selection.type) })
            },
            {
              label: "Fermé comme dupliqué",
              action: "issue:close:duplicate",
              icon: renderReviewStateIcon("rejected", { entityType: getSelectionEntityType(selection.type) })
            }
          ]
        : [
            {
              label: "Ré-ouvrir",
              action: "issue:reopen",
              icon: SVG_ISSUE_REOPENED
            },
            {
              label: "Fermé comme non pertinent",
              action: "issue:close:dismissed",
              icon: renderReviewStateIcon("dismissed", { entityType: getSelectionEntityType(selection.type) })
            },
            {
              label: "Fermé comme dupliqué",
              action: "issue:close:duplicate",
              icon: renderReviewStateIcon("rejected", { entityType: getSelectionEntityType(selection.type) })
            }
          ]
    });
  }

  function renderCommentBox(selection) {
    ensureViewUiState();
    const item = selection?.item || null;
    if (!item) return "";

    const type = selection.type;
    const issueStatus = type === "sujet"
      ? getEffectiveSujetStatus(item.id)
      : getEffectiveSituationStatus(item.id);

    const previewMode = !!store.situationsView.commentPreviewMode;
    const helpMode = !!store.situationsView.helpMode;

    const hintHtml = "";

    const issueStatusActionHtml = renderIssueStatusAction(selection);
    const replyContext = type === "sujet" ? getReplyContextForSubject(item?.id) : null;
    const contextHtml = replyContext
      ? `
        <div class="comment-composer__context">
          <div class="comment-composer__context-text mono-small">
            Réponse à un message${replyContext.parentPreview ? ` : “${escapeHtml(replyContext.parentPreview)}”` : ""}
          </div>
          <button class="gh-btn gh-btn--sm" type="button" data-action="clear-reply-target">Annuler la réponse</button>
        </div>
      `
      : "";

    const toolbarHtml = renderSubjectMarkdownToolbar({ buttonAction: "composer-format", svgIcon });

    const attachmentState = getComposerAttachmentsState();
    const normalizedSubjectId = type === "sujet" ? normalizeId(item.id) : "";
    const pendingAttachments = normalizedSubjectId && normalizeId(attachmentState.subjectId) === normalizedSubjectId
      ? attachmentState.items
      : [];
    const actionsHtml = `
      <button class="gh-btn gh-btn--help-mode ${helpMode ? "is-on" : ""}" data-action="toggle-help" type="button">Help</button>

      ${issueStatusActionHtml}

      <button class="gh-btn gh-action__main gh-btn--primary gh-btn--md" data-action="add-comment" type="button">Commenter</button>
    `;

    const pendingAttachmentsHtml = pendingAttachments.length
      ? `
        <div class="subject-composer-attachments">
          ${pendingAttachments.map((attachment, index) => `
            <div class="subject-composer-attachment-item">
              ${renderAttachmentTile(attachment, {
                forceImage: !!attachment.isImage,
                uploadState: attachment.error
                  ? "error"
                  : String(attachment.uploadStatus || "").trim() === "uploading"
                    ? "uploading"
                    : "ready",
                uploadStateText: attachment.error ? "Erreur d’upload" : ""
              })}
              <button
                class="subject-composer-attachment-remove"
                type="button"
                data-action="composer-attachment-remove"
                data-attachment-id="${escapeHtml(normalizeId(attachment.id))}"
                data-temp-id="${escapeHtml(String(attachment.tempId || index))}"
                aria-label="Retirer la pièce jointe"
              >
                ${svgIcon("x")}
              </button>
            </div>
          `).join("")}
        </div>
      `
      : "";

    const composerAttachmentsHtml = type === "sujet"
      ? `
        <input id="subjectComposerAttachmentInput" type="file" class="subject-composer-file-input" data-role="subject-composer-file-input" multiple />
        <div
          class="subject-composer-attachments-preview ${pendingAttachments.length ? "" : "hidden"}"
          data-role="subject-composer-attachments-preview"
          aria-live="polite"
        >
          ${pendingAttachmentsHtml}
        </div>
      `
      : "";

    return renderCommentComposer({
      title: "Ajouter un commentaire",
      avatarHtml: getAuthorIdentity({
        author: store?.user?.name,
        agent: "human",
        currentUserAvatar: store?.user?.avatar,
        humanAvatarHtml: SVG_AVATAR_HUMAN,
        fallbackName: "Human"
      }).avatarHtml,
      previewMode,
      helpMode,
      textareaId: "humanCommentBox",
      previewId: "humanCommentPreview",
      textareaValue: String(store.situationsView.commentDraft || ""),
      placeholder: helpMode
        ? "Help (éphémère) — décrivez l’écran / l’action souhaitée."
        : "Ecrire une réponse, glisser-déposer une pièce jointe...",
      hintHtml,
      contextHtml,
      actionsHtml,
      toolbarHtml,
      tabsClassName: "comment-composer__tabs--main",
      previewHtml: previewMode && String(store.situationsView.commentDraft || "").trim()
        ? mdToHtml(String(store.situationsView.commentDraft || ""), { preserveMessageLineBreaks: true })
        : "",
      previewEmptyHint: "Utilisez le Markdown pour formater votre commentaire",
      footerHtml: composerAttachmentsHtml
    });
  }

  return {
    addComment,
    editSubjectMessage,
    deleteSubjectMessage,
    toggleSubjectMessageReaction,
    addActivity,
    setDecision,
    getDecision,
    getThreadForSelection,
    setReplyContext,
    clearReplyContext,
    getReplyContextForSubject,
    buildReplyPreview,
    getMentionUiState,
    getEmojiUiState,
    getSubjectRefUiState,
    getComposerAttachmentsState,
    getInlineReplyUiState,
    ensureTimelineLoadedForSelection,
    renderThreadBlock,
    renderIssueStatusAction,
    renderCommentBox
  };
}
