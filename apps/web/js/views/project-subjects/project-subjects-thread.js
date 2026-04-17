import { getAuthorIdentity } from "../ui/author-identity.js";
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
    entityDisplayLinkHtml,
    inferAgent,
    normActorName,
    miniAuthorIconHtml
  } = config;

  const subjectTimelineCache = new Map();
  const subjectTimelineState = new Map();

  function normalizeId(value) {
    return String(value || "").trim();
  }

  function mapMessageRowToThreadComment(row = {}) {
    return {
      ts: firstNonEmpty(row.created_at, nowIso()),
      entity_type: "sujet",
      entity_id: normalizeId(row.subject_id),
      type: "COMMENT",
      actor: row.author_person_id ? `Person ${normalizeId(row.author_person_id).slice(0, 8)}` : "Human",
      agent: "human",
      message: String(row.deleted_at ? "[message supprimé]" : row.body_markdown || ""),
      pending: false,
      request_id: null,
      meta: {
        source: "supabase",
        id: normalizeId(row.id),
        parent_message_id: normalizeId(row.parent_message_id),
        is_frozen: !!row.is_frozen
      }
    };
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

  function mapTimelineRowToThreadEntry(row = {}) {
    const kind = String(row?.kind || "").toLowerCase();
    if (kind === "message") {
      return mapMessageRowToThreadComment(row.message || {});
    }
    if (kind === "event") {
      return mapEventRowToThreadActivity(row.event || {});
    }
    return null;
  }

  function requestScopeRerender() {
    if (typeof requestRerender === "function") {
      requestRerender(document.getElementById("situationsDetailsHost") || document);
    }
  }

  function ensureSubjectTimelineLoaded(subjectId, options = {}) {
    const normalizedSubjectId = normalizeId(subjectId);
    if (!normalizedSubjectId || !subjectMessagesService) return;

    const force = !!options.force;
    const currentState = subjectTimelineState.get(normalizedSubjectId) || { loading: false, requestId: 0 };
    if (currentState.loading && !force) return;

    const requestId = Number(currentState.requestId || 0) + 1;
    subjectTimelineState.set(normalizedSubjectId, { loading: true, requestId });
    subjectMessagesService.listTimeline(normalizedSubjectId)
      .then((timeline) => {
        const latestState = subjectTimelineState.get(normalizedSubjectId) || {};
        if (Number(latestState.requestId || 0) !== requestId) return;

        const messages = Array.isArray(timeline?.messages) ? timeline.messages : [];
        const events = Array.isArray(timeline?.events) ? timeline.events : [];
        const rows = Array.isArray(timeline?.rows) ? timeline.rows : [];
        subjectTimelineCache.set(normalizedSubjectId, {
          rows: rows.map((row) => mapTimelineRowToThreadEntry(row)).filter(Boolean),
          comments: messages.map((row) => mapMessageRowToThreadComment(row)),
          activities: events.map((row) => mapEventRowToThreadActivity(row)),
          conversation: timeline?.conversation || null
        });
        requestScopeRerender();
      })
      .catch((error) => {
        console.warn("[subject-messages] timeline load failed", error);
      })
      .finally(() => {
        const latestState = subjectTimelineState.get(normalizedSubjectId) || {};
        if (Number(latestState.requestId || 0) !== requestId) return;
        subjectTimelineState.set(normalizedSubjectId, { loading: false, requestId });
      });
  }

  async function addComment(entityType, entityId, message, options = {}) {
    const normalizedEntityType = String(entityType || "").toLowerCase();
    const normalizedEntityId = normalizeId(entityId);
    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) return null;

    if (normalizedEntityType === "sujet" && normalizedEntityId && subjectMessagesService) {
      const created = options.parentMessageId
        ? await subjectMessagesService.createReply({
            subjectId: normalizedEntityId,
            parentMessageId: options.parentMessageId,
            bodyMarkdown: normalizedMessage
          })
        : await subjectMessagesService.createMessage({
            subjectId: normalizedEntityId,
            bodyMarkdown: normalizedMessage
          });

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
      ensureSubjectTimelineLoaded(subject.id);
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

  function renderThreadBlock() {
    const thread = getThreadForSelection();
    if (!thread.length) return "";

    const itemsHtml = thread.map((e, idx) => {
      const type = String(e?.type || "").toUpperCase();

      if (type === "COMMENT") {
        const agent = String(e?.agent || "").toLowerCase();
        const isRapso = agent === "specialist_ps";
        const identity = isRapso
          ? { displayName: "Agent specialist_ps", avatarType: "agent", avatarHtml: "", avatarInitial: "AS" }
          : getAuthorIdentity({
              author: e?.actor,
              agent,
              currentUserAvatar: store?.user?.avatar,
              humanAvatarHtml: SVG_AVATAR_HUMAN,
              fallbackName: "System"
            });
        const tsHtml = e?.ts ? `<div class="mono-small">${escapeHtml(fmtTs(e.ts))}</div>` : "";

        return renderMessageThreadComment({
          idx,
          author: identity.displayName,
          tsHtml,
          bodyHtml: mdToHtml(e?.message || ""),
          avatarType: identity.avatarType,
          avatarHtml: identity.avatarHtml,
          avatarInitial: identity.avatarInitial
        });
      }

      if (type === "ACTIVITY") {
        const kind = String(e?.kind || "").toLowerCase();
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
        } else if (kind === "description_version_initial" || kind === "description_version_saved") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${svgIcon("pencil")}</span>`;
          verb = kind === "description_version_initial" ? "archived description" : "saved description";
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
        } else if (kind === "message_deleted") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-closed" aria-hidden="true">${svgIcon("trash")}</span>`;
          verb = "deleted a message on";
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

    const hintHtml = `
      <div class="rapso-mention-hint comment-composer__hint">
        <span>Astuce : mentionne <span class="mono">@rapso</span> dans ton commentaire.</span>
      </div>
    `;

    const issueStatusActionHtml = renderIssueStatusAction(selection);

    const actionsHtml = `
      <button class="gh-btn gh-btn--help-mode ${helpMode ? "is-on" : ""}" data-action="toggle-help" type="button">Help</button>

      ${issueStatusActionHtml}

      <button class="gh-btn gh-btn--comment" data-action="add-comment" type="button">Comment</button>
    `;

    return renderCommentComposer({
      title: "Add a comment",
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
      placeholder: helpMode
        ? "Help (éphémère) — décrivez l’écran / l’action souhaitée."
        : `Réponse humaine (Markdown) sur ce ${type === "sujet" ? "sujet" : "regroupement"} — mentionne @rapso pour solliciter l’agent.`,
      hintHtml,
      actionsHtml
    });
  }

  return {
    addComment,
    addActivity,
    setDecision,
    getDecision,
    getThreadForSelection,
    renderThreadBlock,
    renderIssueStatusAction,
    renderCommentBox
  };
}
