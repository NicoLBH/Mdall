import { escapeHtml } from "../../utils/escape-html.js";

const TRAJECTORY_ZOOM_OPTIONS = [
  { value: "hour", label: "Heure" },
  { value: "half-day", label: "Demi-journée" },
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" }
];

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

function renderZoomOptions() {
  return TRAJECTORY_ZOOM_OPTIONS
    .map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`)
    .join("");
}

export function renderSituationRoadmapView(situation, subjects = []) {
  const subjectCount = Array.isArray(subjects) ? subjects.length : 0;
  const title = String(situation?.title || "Situation");
  const situationId = normalizeId(situation?.id);
  const projectId = resolveProjectId(situation);

  console.info("[trajectory] render.shell", { situationId, subjectCount });

  const projectDataAttribute = projectId ? ` data-project-id="${escapeHtml(projectId)}"` : "";
  const emptyState = subjectCount
    ? ""
    : `
      <div class="settings-empty-state situation-trajectory__empty-state" role="status">
        Aucun sujet n'est disponible pour la trajectoire de <strong>${escapeHtml(title)}</strong>.
      </div>
    `;

  return `
    <section
      class="project-situation-alt-view project-situation-alt-view--roadmap"
      aria-label="Vue trajectoire"
    >
      <div
        class="situation-trajectory"
        data-situation-trajectory
        data-situation-id="${escapeHtml(situationId)}"${projectDataAttribute}
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

        <div class="situation-trajectory__timeline" role="presentation"></div>

        <div class="situation-trajectory__body">
          <aside class="situation-trajectory__left" aria-label="Sujets"></aside>

          <div class="situation-trajectory__viewport" aria-label="Trajectoire des sujets">
            <canvas class="situation-trajectory__canvas"></canvas>
            ${emptyState}
          </div>
        </div>
      </div>
    </section>
  `;
}
