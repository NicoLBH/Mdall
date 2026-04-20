import { renderSharedDetailsTitleWrap, renderSharedDetailsTitleHtml, renderSharedDetailsChromeHeadHtml } from "../ui/detail-header.js";

export function createProjectSubjectsDetailsRenderer(config) {
  const {
    getActiveSelection,
    getSelectionEntityType,
    getEffectiveSujetStatus,
    getEffectiveSituationStatus,
    getEntityReviewMeta,
    getReviewTitleStateClass,
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
    renderDocumentRefsCard
  } = config;

  function renderDetailsTitleWrapHtml(selection) {
    return renderSharedDetailsTitleWrap(selection, {
      emptyText: "Sélectionner un élément",
      buildTitleTextHtml(currentSelection) {
        const item = currentSelection.item;
        const entityType = getSelectionEntityType(currentSelection.type);
        const titleSeenClass = getReviewTitleStateClass(entityType, item.id);
        const titleHtml = `<span class="details-title-text ${titleSeenClass}">${escapeHtml(firstNonEmpty(item.title, item.id, "Détail"))}</span>`;
        if (currentSelection.type === "sujet") {
          return `${titleHtml} <span class="details-title-inline-ref mono">${entityDisplayLinkHtml(currentSelection.type, item.id)}</span>`;
        }
        return titleHtml;
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
            topHtml: titleTextHtml,
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
    return renderSharedDetailsChromeHeadHtml(selection, {
      headId: options.headId || "",
      headClassName: options.headClassName || "",
      closeId: options.closeId || "",
      closeLabel: options.closeLabel || "Fermer",
      titleWrapHtml: renderDetailsTitleWrapHtml(selection),
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
    const threadHtml = shouldRenderDiscussion ? renderThreadBlock() : "";
    const commentBoxHtml = shouldRenderDiscussion ? renderCommentBox(selection) : "";
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

  function renderDetailsDiscussionHtml(selectionOverride = null) {
    const selection = selectionOverride || getActiveSelection();
    if (!selection) {
      return {
        threadHtml: "",
        composerHtml: ""
      };
    }
    return {
      threadHtml: renderThreadBlock(),
      composerHtml: renderCommentBox(selection)
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
