import { renderSharedDetailsTitleWrap, renderSharedDetailsTitleHtml, renderSharedDetailsChromeHeadHtml } from "../ui/detail-header.js";

export function createProjectSubjectsDetailsRenderer(config) {
  const {
    getActiveSelection,
    getSelectionEntityType,
    getEffectiveSujetStatus,
    getEffectiveSituationStatus,
    getEntityReviewMeta,
    getReviewTitleStateClass,
    getSubjectTitleEditState,
    isEditingSubjectTitle,
    entityDisplayLinkHtml,
    problemsCountsHtml,
    renderSubjectBlockedByHeadHtml,
    renderSubjectParentHeadHtml,
    firstNonEmpty,
    escapeHtml,
    statePill,
    renderDescriptionCard,
    renderSubIssuesForSujet,
    renderSubIssuesForSituation,
    renderThreadBlock,
    renderCommentBox,
    renderDetailedMetaForSelection,
    renderSubjectMetaControls,
    priorityBadge,
    renderDocumentRefsCard,
    canRenderCreateFromDetailAction
  } = config;

  function renderSubjectTitleContent(currentSelection, options = {}) {
    const item = currentSelection.item;
    const entityType = getSelectionEntityType(currentSelection.type);
    const titleSeenClass = getReviewTitleStateClass(entityType, item.id);
    if (options.compact) {
      return `
        <div class="subject-title-display subject-title-display--compact">
          <div class="subject-title-display__main">
            <span class="details-title-text ${titleSeenClass}">${escapeHtml(firstNonEmpty(item.title, item.id, "Détail"))}</span>
            <span class="details-title-inline-ref">${entityDisplayLinkHtml(currentSelection.type, item.id)}</span>
          </div>
        </div>
      `;
    }

    const editState = getSubjectTitleEditState?.() || {};
    const isEditing = isEditingSubjectTitle?.(currentSelection) === true;
    const initialTitleTrimmed = String(editState.initialTitle || item.title || "").trim();
    const draftValue = String(editState.draft ?? item.title ?? "");
    const draftTrimmed = draftValue.trim();
    const isSaving = isEditing && editState.isSaving === true;
    const hasDraftChange = draftTrimmed && draftTrimmed !== initialTitleTrimmed;
    const canSave = isEditing && !isSaving && hasDraftChange;
    const errorHtml = isEditing && String(editState.error || "").trim()
      ? `<div class="subject-title-edit__error">${escapeHtml(editState.error)}</div>`
      : "";

    if (!isEditing) {
      const showCreateFromDetailAction = options.showCreateFromDetailAction === true
        && (typeof canRenderCreateFromDetailAction === "function"
          ? canRenderCreateFromDetailAction(currentSelection)
          : true);
      return `
        <div class="subject-title-display">
          <div class="subject-title-display__main">
            <span class="details-title-text ${titleSeenClass}">${escapeHtml(firstNonEmpty(item.title, item.id, "Détail"))}</span>
            <span class="details-title-inline-ref">${entityDisplayLinkHtml(currentSelection.type, item.id)}</span>
          </div>
          <div class="subject-title-display__spacer" aria-hidden="true"></div>
          <div class="subject-title-display__actions">
            <button class="gh-btn gh-btn--sm subject-title-edit__action" type="button" data-action="edit-subject-title">Modifier</button>
            ${showCreateFromDetailAction ? `<button class="gh-btn gh-action__main gh-btn--primary gh-btn--md" type="button" data-action="open-create-subject-from-detail">Nouveau sujet</button>` : ""}
          </div>
        </div>
      `;
    }

    return `
      <div class="subject-title-edit subject-title-edit--inline ${options.compact ? "subject-title-edit--compact" : ""}">
        <div class="subject-title-edit__row">
          <div class="subject-title-edit__input-wrap">
            <input
              class="subject-title-edit__input objective-edit-form__input"
              type="text"
              value="${escapeHtml(draftValue)}"
              data-subject-title-draft
              autocomplete="off"
              ${isSaving ? "disabled" : ""}
            />
          </div>
          <div class="subject-title-edit__actions">
            <button class="gh-btn gh-btn--sm subject-title-edit__action" type="button" data-action="cancel-subject-title-edit" ${isSaving ? "disabled" : ""}>Annuler</button>
            <button class="gh-btn gh-btn--primary gh-btn--sm subject-title-edit__action subject-title-edit__save-btn" type="button" data-action="save-subject-title-edit" ${canSave ? "" : "disabled"}>
              <span>Enregistrer</span>
              <span class="subject-title-edit__shortcut" aria-hidden="true">⏎</span>
            </button>
          </div>
        </div>
        ${errorHtml}
      </div>
    `;
  }

  function renderDetailsTitleWrapHtml(selection, options = {}) {
    const showCreateFromDetailAction = options.showCreateFromDetailAction === true;
    return renderSharedDetailsTitleWrap(selection, {
      emptyText: "Sélectionner un élément",
      buildTitleTextHtml(currentSelection) {
        if (currentSelection.type === "sujet") {
          return renderSubjectTitleContent(currentSelection, { showCreateFromDetailAction });
        }
        const item = currentSelection.item;
        const entityType = getSelectionEntityType(currentSelection.type);
        const titleSeenClass = getReviewTitleStateClass(entityType, item.id);
        return `<span class="details-title-text ${titleSeenClass}">${escapeHtml(firstNonEmpty(item.title, item.id, "Détail"))}</span>`;
      },
      buildIdHtml(currentSelection) {
        if (currentSelection.type === "sujet") return "";
        return entityDisplayLinkHtml(currentSelection.type, currentSelection.item.id);
      },
      buildExpandedBottomHtml(currentSelection) {
        const item = currentSelection.item;
        if (currentSelection.type === "sujet") {
          const countsHtml = problemsCountsHtml(item, { entityType: "sujet", hideIfEmpty: true });
          const blockedByHtml = renderSubjectBlockedByHeadHtml(item, { compact: false });
          const parentHtml = renderSubjectParentHeadHtml(item, { compact: false });
          const relationsHtml = `${blockedByHtml}${parentHtml}`;
          const dividerHtml = relationsHtml ? `<span class="details-title-divider" aria-hidden="true"></span>` : "";
          return `${statePill(getEffectiveSujetStatus(item.id), {
            reviewState: getEntityReviewMeta("sujet", item.id).review_state,
            entityType: "sujet"
          })}${countsHtml}${dividerHtml}${relationsHtml}`;
        }
        return `${statePill(getEffectiveSituationStatus(item.id), {
          reviewState: getEntityReviewMeta("situation", item.id).review_state,
          entityType: "situation"
        })}${problemsCountsHtml(item, { entityType: "situation" })}`;
      },
      buildCompactConfig(currentSelection, { titleTextHtml }) {
        const item = currentSelection.item;
        if (currentSelection.type === "sujet") {
          const countsHtml = problemsCountsHtml(item, { entityType: "sujet", hideIfEmpty: true });
          const blockedByHtml = renderSubjectBlockedByHeadHtml(item, { compact: true });
          const parentHtml = renderSubjectParentHeadHtml(item, { compact: true });
          return {
            variant: "grid",
            wrapClass: "details-title--compact-grid",
            leftHtml: statePill(getEffectiveSujetStatus(item.id), {
              reviewState: getEntityReviewMeta("sujet", item.id).review_state,
              entityType: "sujet"
            }),
            topHtml: renderSubjectTitleContent(currentSelection, { compact: true }),
            bottomHtml: `${countsHtml}${blockedByHtml}${parentHtml}`
          };
        }
        return {
          variant: "grid",
          wrapClass: "details-title--compact-grid",
          leftHtml: statePill(getEffectiveSituationStatus(item.id), {
            reviewState: getEntityReviewMeta("situation", item.id).review_state,
            entityType: "situation"
          }),
          topHtml: titleTextHtml,
          bottomHtml: `${problemsCountsHtml(item, { entityType: "situation" })}`
        };
      }
    });
  }

  function renderDetailsChromeHeadHtml(selection, options = {}) {
    const showCreateFromDetailAction = options.showCreateFromDetailAction === true;
    const shouldRenderCreateFromDetailAction = showCreateFromDetailAction
      && selection?.type === "sujet"
      && (typeof canRenderCreateFromDetailAction === "function"
        ? canRenderCreateFromDetailAction(selection)
        : true);
    const createFromDetailActionHtml = shouldRenderCreateFromDetailAction
      ? `
        <button
          type="button"
          class="gh-btn gh-action__main gh-btn--primary gh-btn--md"
          data-action="open-create-subject-from-detail"
        >Nouveau sujet</button>
      `
      : "";
    return renderSharedDetailsChromeHeadHtml(selection, {
      headId: options.headId || "",
      headClassName: options.headClassName || "",
      closeId: options.closeId || "",
      closeLabel: options.closeLabel || "Fermer",
      titleWrapHtml: renderDetailsTitleWrapHtml(selection, {
        showCreateFromDetailAction: options.showCreateFromDetailAction === true
      }),
      emptyPanelTitle: "Sélectionner un élément",
      buildMetaHtml(currentSelection) {
        return escapeHtml(currentSelection?.item?.id || "—");
      }
    });
  }

  function renderDetailsTitleHtml(selection, options = {}) {
    const showExpand = options.showExpand !== false;
    return renderSharedDetailsTitleHtml(selection, {
      showExpand,
      titleWrapHtml: renderDetailsTitleWrapHtml(selection),
      emptyPanelTitle: "Sélectionner un élément",
      buildKickerText() {
        return "";
      },
      buildMetaHtml(currentSelection) {
        return escapeHtml(currentSelection?.item?.id || "—");
      }
    });
  }

  function renderDetailsBody(selection, options = {}) {
    if (!selection) {
      return `<div class="emptyState">Sélectionne une situation ou un sujet pour afficher les détails.</div>`;
    }

    const item = selection.item;
    const descCard = renderDescriptionCard(selection);
    const subIssuesHtml = selection.type === "sujet"
      ? renderSubIssuesForSujet(item, options.subissuesOptions || {})
      : renderSubIssuesForSituation(item, options.subissuesOptions || {});
    const shouldRenderDiscussion = options.renderDiscussion !== false;
    const discussionScopeHost = String(options.discussionScopeHost || "").trim().toLowerCase() === "drilldown" ? "drilldown" : "main";
    const threadHtml = shouldRenderDiscussion
      ? renderThreadBlock(selection, { scopeHost: discussionScopeHost, source: "renderDetailsBody" })
      : "";
    const commentBoxHtml = shouldRenderDiscussion
      ? renderCommentBox(selection, { scopeHost: discussionScopeHost, source: "renderDetailsBody" })
      : "";
    const subjectMetaControlsHtml = selection.type === "sujet" ? renderSubjectMetaControls(item) : "";
    const subjectPriorityHtml = selection.type === "sujet"
      ? `
        <div class="subject-sidebar-priority">
          <span class="subject-sidebar-priority__label">Priority</span>
          <span class="subject-sidebar-priority__value">${priorityBadge(firstNonEmpty(item.priority, item.raw?.priority, "medium"))}</span>
        </div>
      `
      : "";
    const metaHtml = selection.type === "sujet" ? "" : renderDetailedMetaForSelection(selection);
    const metaTitleHtml = selection.type === "sujet" ? "" : `<div class="meta-title">Metadata</div>`;

    return `
      <div class="details-grid">
        <div class="details-main">
          <div class="gh-timeline">
            ${descCard}
            ${renderDocumentRefsCard(selection)}
            ${subIssuesHtml}
            <div class="subject-details-thread-host" data-details-thread-host>
              ${threadHtml}
            </div>
            <div class="subject-details-composer-host" data-details-composer-host>
              ${commentBoxHtml}
            </div>
          </div>
        </div>
        <aside class="details-meta-col">
          ${subjectMetaControlsHtml}
          ${subjectPriorityHtml}
          ${metaTitleHtml}
          ${metaHtml}
        </aside>
      </div>
    `;
  }

  function renderDetailsHtml(selectionOverride = null, options = {}) {
    const selection = selectionOverride || getActiveSelection();
    return {
      titleHtml: renderDetailsTitleHtml(selection, { showExpand: options.showExpand !== false }),
      bodyHtml: renderDetailsBody(selection, options),
      modalTitle: selection ? firstNonEmpty(selection.item.title, selection.item.id, "Détail") : "Sélectionner un élément",
      modalMeta: selection ? firstNonEmpty(selection.item.id, "") : "—"
    };
  }

  function renderDetailsDiscussionHtml(selectionOverride = null, options = {}) {
    const selection = selectionOverride || getActiveSelection();
    const {
      renderThread = true,
      renderComposer = true,
      scopeHost = "main"
    } = options;
    const normalizedScopeHost = String(scopeHost || "").trim().toLowerCase() === "drilldown" ? "drilldown" : "main";
    if (!selection) {
      return {
        threadHtml: "",
        composerHtml: ""
      };
    }
    return {
      threadHtml: renderThread
        ? renderThreadBlock(selection, { scopeHost: normalizedScopeHost, source: "renderDetailsDiscussionHtml" })
        : "",
      composerHtml: renderComposer
        ? renderCommentBox(selection, { scopeHost: normalizedScopeHost, source: "renderDetailsDiscussionHtml" })
        : ""
    };
  }

  return {
    renderDetailsTitleWrapHtml,
    renderDetailsTitleHtml,
    renderDetailsChromeHeadHtml,
    renderDetailsBody,
    renderDetailsHtml,
    renderDetailsDiscussionHtml
  };
}
