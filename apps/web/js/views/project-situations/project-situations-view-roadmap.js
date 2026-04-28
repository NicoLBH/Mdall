import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderSubjectTreeGrid } from "../shared/subject-tree-grid.js";
import { getExpandedSubjectIdsSet, resolveSituationTreeData } from "./project-situations-tree-data.js";
import { hasBlockedByRelation } from "./project-situations-subject-links.js";

const TRAJECTORY_ZOOM_OPTIONS = [
  { value: "hour", label: "Heure" },
  { value: "half-day", label: "Demi-journée" },
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" }
];
const TRAJECTORY_ZOOM_VALUES = new Set(TRAJECTORY_ZOOM_OPTIONS.map((option) => String(option.value || "").trim().toLowerCase()));
const TRAJECTORY_LEFT_WIDTH = {
  min: 72,
  max: 640,
  default: 320
};

function normalizeId(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function resolveProjectId(situation = {}) {
  return normalizeId(situation?.project_id)
    || normalizeId(situation?.projectId)
    || normalizeId(situation?.project?.id)
    || "";
}

function normalizeIssueLifecycleStatus(status = "") {
  return String(status || "").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function getSubjectDisplayIdentifier(subject = {}) {
  const orderNumber = Number(subject?.subject_number ?? subject?.subjectNumber ?? subject?.raw?.subject_number ?? subject?.raw?.subjectNumber);
  if (Number.isFinite(orderNumber) && orderNumber > 0) return `#${Math.floor(orderNumber)}`;
  const subjectId = normalizeId(subject?.id);
  return subjectId ? `#${subjectId}` : "";
}

function renderIssueStateIcon(subject = {}, { isBlocked = false } = {}) {
  const isClosed = normalizeIssueLifecycleStatus(subject?.status) === "closed";
  const blockedIconHtml = isBlocked
    ? `<span class="subject-status-blocked-indicator situation-trajectory__status-blocked-indicator" aria-hidden="true">${svgIcon("blocked", { className: "octicon octicon-blocked", width: 12, height: 12 })}</span>`
    : "";
  return `<span class="issue-status-icon situation-trajectory__status-icon" aria-hidden="true">${
    isClosed
      ? svgIcon("check-circle", { style: "color: var(--fgColor-done)" })
      : svgIcon("issue-opened", { style: "color: var(--fgColor-open)" })
  }${blockedIconHtml}</span>`;
}

function normalizeRoadmapTrajectoryZoom(value, fallback = "day") {
  const normalized = String(value || "").trim().toLowerCase();
  if (TRAJECTORY_ZOOM_VALUES.has(normalized)) return normalized;
  return fallback;
}

function getTrajectoryZoomLabel(zoom = "day") {
  const normalized = normalizeRoadmapTrajectoryZoom(zoom);
  return TRAJECTORY_ZOOM_OPTIONS.find((option) => option.value === normalized)?.label || "Jour";
}

function renderZoomDropdownOptions(selectedZoom = "day") {
  const normalizedSelectedZoom = normalizeRoadmapTrajectoryZoom(selectedZoom);
  return TRAJECTORY_ZOOM_OPTIONS.map((option) => {
    const normalizedOption = normalizeRoadmapTrajectoryZoom(option.value);
    return `
      <button
        type="button"
        class="gh-menu__item${normalizedOption === normalizedSelectedZoom ? " is-active" : ""}"
        role="menuitemradio"
        aria-checked="${normalizedOption === normalizedSelectedZoom ? "true" : "false"}"
        data-situation-trajectory-zoom-option="${escapeHtml(normalizedOption)}"
      >
        ${escapeHtml(option.label)}
      </button>
    `;
  }).join("");
}

function normalizeLeftColumnWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return TRAJECTORY_LEFT_WIDTH.default;
  return Math.max(TRAJECTORY_LEFT_WIDTH.min, Math.min(TRAJECTORY_LEFT_WIDTH.max, Math.round(width)));
}

function normalizeTrajectoryOpacity(value, fallback = 0.95) {
  const opacity = Number(value);
  if (!Number.isFinite(opacity)) return fallback;
  return Math.max(0, Math.min(1, opacity));
}

export function renderSituationRoadmapView(situation, subjects = [], options = {}) {
  const subjectCount = Array.isArray(subjects) ? subjects.length : 0;
  const title = String(situation?.title || "Situation");
  const situationId = normalizeId(situation?.id);
  const projectId = resolveProjectId(situation);
  const rawSubjectsResult = options?.store?.projectSubjectsView?.rawSubjectsResult && typeof options.store.projectSubjectsView.rawSubjectsResult === "object"
    ? options.store.projectSubjectsView.rawSubjectsResult
    : {};
  const leftColumnWidth = normalizeLeftColumnWidth(options?.store?.situationsView?.trajectoryLeftColumnWidthBySituationId?.[situationId]);
  const cardOpacity = normalizeTrajectoryOpacity(options?.store?.situationsView?.trajectoryCardOpacityBySituationId?.[situationId], 0.95);
  const cardOpacityLabel = cardOpacity.toFixed(2);
  const selectedZoom = normalizeRoadmapTrajectoryZoom(options?.store?.situationsView?.trajectoryZoomBySituationId?.[situationId], "day");
  const selectedZoomLabel = getTrajectoryZoomLabel(selectedZoom);


  const projectDataAttribute = projectId ? ` data-project-id="${escapeHtml(projectId)}"` : "";
  let leftColumnHtml = "";
  let emptyState = "";

  if (!subjectCount) {
    emptyState = `
      <div class="settings-empty-state situation-trajectory__empty-state" role="status">
        Aucun sujet n'est disponible pour la trajectoire de <strong>${escapeHtml(title)}</strong>.
      </div>
    `;
  } else {
    const {
      selectedSubjectIds,
      subjectsById,
      childrenBySubjectId,
      rootSubjectIds
    } = resolveSituationTreeData(subjects, rawSubjectsResult);
    const expandedSubjectIds = getExpandedSubjectIdsSet({
      store: options?.store,
      situationId,
      rootSubjectIds,
      fallbackExpandedIds: [...selectedSubjectIds]
    });


    if (!selectedSubjectIds.size || !rootSubjectIds.length) {
      emptyState = `
        <div class="settings-empty-state situation-trajectory__empty-state" role="status">
          Aucun sujet exploitable n’a été trouvé pour cette situation.
        </div>
      `;
    } else {
      leftColumnHtml = renderSubjectTreeGrid({
        subjectsById,
        childrenBySubjectId,
        rootSubjectIds,
        expandedSubjectIds,
        dndMode: "none",
        rowClassName: "situation-trajectory__subject-row",
        className: "situation-trajectory__subject-rows",
        escapeHtml,
        renderTitleCell: ({ subject, subjectId, depth, hasChildren, isExpanded }) => {
          const indentWidth = Math.max(0, depth) * 20;
          const identifier = getSubjectDisplayIdentifier(subject);
          const subjectTitle = String(subject?.title || subjectId || "Sujet");
          const isBlocked = hasBlockedByRelation(subjectId, options?.store || {}, rawSubjectsResult);
          return `
            <div class="situation-grid__cell situation-grid__cell--title situation-trajectory__subject-cell">
              <div class="situation-grid__title-content situation-trajectory__subject-main" style="--situation-grid-indent:${indentWidth}px;">
                <span class="situation-grid__indent" aria-hidden="true"></span>
                ${hasChildren
                  ? `<button
                      type="button"
                      class="situation-grid__toggle situation-trajectory__toggle"
                      data-situation-grid-toggle="${escapeHtml(subjectId)}"
                      data-situation-grid-situation-id="${escapeHtml(situationId)}"
                      aria-expanded="${isExpanded ? "true" : "false"}"
                      aria-label="${isExpanded ? "Replier" : "Déplier"} ${escapeHtml(subjectTitle)}"
                    >
                      ${svgIcon(isExpanded ? "chevron-down" : "chevron-right", { className: isExpanded ? "octicon octicon-chevron-down" : "octicon octicon-chevron-right" })}
                    </button>`
                  : `<span class="situation-grid__toggle situation-grid__toggle--placeholder situation-trajectory__toggle situation-trajectory__toggle--placeholder" aria-hidden="true"></span>`}
                ${renderIssueStateIcon(subject, { isBlocked })}
                <button type="button" class="situation-grid__subject-title situation-trajectory__subject-title" data-open-situation-subject="${escapeHtml(subjectId)}">${escapeHtml(subjectTitle)}</button>
                <span class="situation-grid__subject-id situation-trajectory__subject-number mono">${escapeHtml(identifier)}</span>
              </div>
            </div>
          `;
        }
      });
    }
  }

  return `
    <section
      class="project-situation-alt-view project-situation-alt-view--roadmap"
      aria-label="Vue trajectoire"
    >
      <div
        class="situation-trajectory"
        data-situation-trajectory
        data-situation-id="${escapeHtml(situationId)}"${projectDataAttribute}
        style="--situation-trajectory-left-width:${leftColumnWidth}px;--situation-trajectory-card-opacity:${cardOpacityLabel};--situation-trajectory-title-opacity:${cardOpacityLabel};"
      >
        <div class="situation-trajectory__timeline" role="presentation">
          <div class="situation-trajectory__timeline-track" data-situation-trajectory-timeline-track>
            <div class="situation-trajectory__toolbar">
              <label class="situation-trajectory__opacity" for="trajectoryOpacityRange-${escapeHtml(situationId)}">
                <span>Opacity</span>
                <input
                  id="trajectoryOpacityRange-${escapeHtml(situationId)}"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value="${escapeHtml(cardOpacityLabel)}"
                  data-situation-trajectory-opacity-input="${escapeHtml(situationId)}"
                />
                <output class="mono" data-situation-trajectory-opacity-value="${escapeHtml(situationId)}">${escapeHtml(cardOpacityLabel)}</output>
              </label>
              <div class="situation-trajectory__zoom">
                <div class="situation-trajectory__zoom-dropdown">
                  <button
                    type="button"
                    class="gh-btn situation-trajectory__zoom-trigger"
                    aria-label="Choisir le zoom de la trajectoire"
                    aria-haspopup="true"
                    aria-expanded="false"
                    data-situation-trajectory-zoom-trigger
                    data-situation-trajectory-zoom-situation-id="${escapeHtml(situationId)}"
                  >
                    ${svgIcon("zoom-in", { className: "octicon octicon-zoom-in", width: 16, height: 16 })}
                    <span data-situation-trajectory-zoom-current-label>${escapeHtml(selectedZoomLabel)}</span>
                    ${svgIcon("chevron-down", { className: "gh-chevron", width: 16, height: 16 })}
                  </button>
                  <div data-situation-trajectory-zoom-menu-anchor>
                    <div
                      class="gh-menu situation-trajectory__zoom-menu"
                      role="menu"
                      hidden
                      data-situation-trajectory-zoom-menu
                      data-situation-trajectory-zoom-situation-id="${escapeHtml(situationId)}"
                    >
                      ${renderZoomDropdownOptions(selectedZoom)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              class="situation-trajectory__timeline-sticky-label"
              data-situation-trajectory-timeline-sticky-label
              aria-live="polite"
            ></div>
            <div class="situation-trajectory__timeline-content" data-situation-trajectory-timeline-content></div>
            <button
              type="button"
              class="situation-trajectory__splitter"
              data-situation-trajectory-splitter
              data-situation-trajectory-splitter-situation-id="${escapeHtml(situationId)}"
              aria-label="Redimensionner la colonne des sujets"
              title="Redimensionner la colonne des sujets"
            >
              ${svgIcon("unfold", { className: "octicon octicon-unfold", width: 16, height: 16 })}
            </button>
          </div>
        </div>

        <div class="situation-trajectory__body">
          <aside class="situation-trajectory__left" aria-label="Sujets">
            <div class="situation-trajectory__left-content" data-situation-trajectory-left-content>
              ${leftColumnHtml}
            </div>
            <button
              type="button"
              class="situation-trajectory__left-resize-handle"
              data-situation-trajectory-splitter
              data-situation-trajectory-splitter-situation-id="${escapeHtml(situationId)}"
              aria-label="Redimensionner la colonne des sujets"
              title="Redimensionner la colonne des sujets"
            ></button>
          </aside>

          <div class="situation-trajectory__viewport" aria-label="Trajectoire des sujets" data-situation-trajectory-viewport>
            <div class="situation-trajectory__scroll-sizer" data-situation-trajectory-scroll-sizer aria-hidden="true"></div>
            <div class="situation-trajectory__scene" data-situation-trajectory-scene>
              <svg class="situation-trajectory__svg" data-situation-trajectory-svg aria-hidden="true"></svg>
              <div class="situation-trajectory__items" data-situation-trajectory-items></div>
            </div>
            <div class="situation-trajectory__spinner" data-situation-trajectory-spinner hidden>
              <span class="ui-spinner ui-spinner--sm" aria-hidden="true"><span class="ui-spinner__ring"></span></span>
              <span>Chargement de la trajectoire…</span>
            </div>
            ${emptyState}
          </div>
        </div>
      </div>
    </section>
  `;
}
