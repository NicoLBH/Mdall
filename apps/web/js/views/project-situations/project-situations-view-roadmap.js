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

function renderZoomOptions() {
  return TRAJECTORY_ZOOM_OPTIONS
    .map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`)
    .join("");
}

function normalizeLeftColumnWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return TRAJECTORY_LEFT_WIDTH.default;
  return Math.max(TRAJECTORY_LEFT_WIDTH.min, Math.min(TRAJECTORY_LEFT_WIDTH.max, Math.round(width)));
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

  console.info("[trajectory] render.shell", { situationId, subjectCount });

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

    console.info("[trajectory] render.tree", { subjectCount: selectedSubjectIds.size, rootCount: rootSubjectIds.length });

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
        style="--situation-trajectory-left-width:${leftColumnWidth}px;"
      >
        <header class="situation-trajectory__toolbar">
          <div class="situation-trajectory__toolbar-title">Trajectoire · ${escapeHtml(title)}</div>
          <label class="situation-trajectory__zoom" for="trajectoryZoomSelect">
            <span>Zoom</span>
            <select id="trajectoryZoomSelect" name="trajectoryZoom">
              ${renderZoomOptions()}
            </select>
          </label>
        </header>

        <div class="situation-trajectory__timeline" role="presentation">
          <div class="situation-trajectory__timeline-left"></div>
          <div class="situation-trajectory__timeline-track">
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
            ${leftColumnHtml}
            <button
              type="button"
              class="situation-trajectory__left-resize-handle"
              data-situation-trajectory-splitter
              data-situation-trajectory-splitter-situation-id="${escapeHtml(situationId)}"
              aria-label="Redimensionner la colonne des sujets"
              title="Redimensionner la colonne des sujets"
            ></button>
          </aside>

          <div class="situation-trajectory__viewport" aria-label="Trajectoire des sujets">
            <canvas class="situation-trajectory__canvas"></canvas>
            ${emptyState}
          </div>
        </div>
      </div>
    </section>
  `;
}
