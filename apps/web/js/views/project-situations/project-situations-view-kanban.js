import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderStatusBadge } from "../ui/status-badges.js";

const KANBAN_STATUSES = [
  { key: "non_active", label: "Non activé", hint: "Sujet détecté mais pas encore engagé." },
  { key: "to_activate", label: "A activer", hint: "Sujet prêt à être lancé." },
  { key: "in_progress", label: "En cours", hint: "Sujet actuellement traité." },
  { key: "in_arbitration", label: "En arbitrage", hint: "Décision ou arbitrage attendu." },
  { key: "resolved", label: "Résolu", hint: "Sujet traité ou clos." }
];

export function createProjectSituationsKanbanView({
  getSujetKanbanStatus,
  setSujetKanbanStatus,
  openSubjectDrilldown,
  refreshAfterKanbanChange
}) {
  function getKanbanColumns() {
    return KANBAN_STATUSES.map((status, index) => ({
      ...status,
      index
    }));
  }

  function getStatusMeta(statusKey) {
    return KANBAN_STATUSES.find((status) => status.key === statusKey) || KANBAN_STATUSES[0];
  }

  function renderPriorityBadge(subject) {
    const priority = String(subject?.priority || "medium").trim().toLowerCase();
    const label = {
      low: "Basse",
      medium: "Moyenne",
      high: "Haute",
      critical: "Critique"
    }[priority] || "Moyenne";
    const tone = {
      low: "default",
      medium: "accent",
      high: "attention",
      critical: "danger"
    }[priority] || "accent";
    return renderStatusBadge({ label, tone });
  }

  function renderSubjectStatusBadge(subject) {
    const isClosed = String(subject?.status || "open").trim().toLowerCase() === "closed";
    return renderStatusBadge({
      label: isClosed ? "Fermé" : "Ouvert",
      tone: isClosed ? "muted" : "success"
    });
  }

  function renderSituationKanban(situation, subjects = [], options = {}) {
    const columns = getKanbanColumns();
    const cardsByColumn = Object.fromEntries(columns.map((column) => [column.key, []]));
    const normalizedSituationId = String(situation?.id || "").trim();

    subjects.forEach((subject) => {
      const statusKey = getSujetKanbanStatus(subject?.id, normalizedSituationId) || "non_active";
      const columnKey = cardsByColumn[statusKey] ? statusKey : "non_active";
      cardsByColumn[columnKey].push(subject);
    });

    if (!normalizedSituationId) {
      return `<div class="settings-empty-state">Sélectionne une situation pour afficher le kanban.</div>`;
    }

    if (!subjects.length && !options.loading) {
      return `<div class="settings-empty-state">Aucun sujet n’est actuellement résolu pour cette situation.</div>`;
    }

    return `
      <section class="situation-kanban" aria-label="Kanban de situation">
        ${columns.map((column) => `
          <section class="situation-kanban__col" data-situation-kanban-column="${escapeHtml(column.key)}">
            <header class="situation-kanban__head">
              <div>
                <div class="situation-kanban__hint"><span class="situation-kanban__dot situation-kanban__dot--${escapeHtml(column.key.replace(/_/g, '-'))}"></span>${escapeHtml(column.label)}</div>
                <div class="mono-small">${escapeHtml(column.hint)}</div>
              </div>
              <span class="situation-kanban__count mono">${cardsByColumn[column.key].length}</span>
            </header>
            <div class="situation-kanban__cards">
              ${cardsByColumn[column.key].length
                ? cardsByColumn[column.key].map((subject) => {
                    const currentStatus = getSujetKanbanStatus(subject?.id, normalizedSituationId) || column.key;
                    const currentIndex = columns.findIndex((entry) => entry.key === currentStatus);
                    const previous = currentIndex > 0 ? columns[currentIndex - 1] : null;
                    const next = currentIndex >= 0 && currentIndex < columns.length - 1 ? columns[currentIndex + 1] : null;
                    return `
                      <article class="situation-kanban-card" data-situation-kanban-card="${escapeHtml(subject.id)}">
                        <div class="situation-kanban-card__meta">
                          <span class="situation-kanban-card__meta-lead mono-small">${escapeHtml(subject.id)}</span>
                          ${renderSubjectStatusBadge(subject)}
                        </div>
                        <button
                          type="button"
                          class="situation-kanban-card__title"
                          data-open-situation-subject="${escapeHtml(subject.id)}"
                        >${escapeHtml(String(subject?.title || subject?.id || "Sujet"))}</button>
                        <div class="situation-kanban-card__footer">
                          ${renderPriorityBadge(subject)}
                          <div class="issue-row-meta-text mono-small">${escapeHtml(getStatusMeta(currentStatus).label)}</div>
                        </div>
                        <div class="situation-kanban-card__footer">
                          <div style="display:flex;gap:8px;">
                            <button
                              type="button"
                              class="gh-btn gh-btn--sm"
                              data-situation-kanban-move="prev"
                              data-situation-kanban-subject-id="${escapeHtml(subject.id)}"
                              data-situation-kanban-situation-id="${escapeHtml(normalizedSituationId)}"
                              ${previous ? "" : "disabled"}
                              aria-label="Déplacer à gauche"
                            >${svgIcon("chevron-left", { className: "octicon octicon-chevron-left" })}</button>
                            <button
                              type="button"
                              class="gh-btn gh-btn--sm"
                              data-situation-kanban-move="next"
                              data-situation-kanban-subject-id="${escapeHtml(subject.id)}"
                              data-situation-kanban-situation-id="${escapeHtml(normalizedSituationId)}"
                              ${next ? "" : "disabled"}
                              aria-label="Déplacer à droite"
                            >${svgIcon("chevron-right", { className: "octicon octicon-chevron-right" })}</button>
                          </div>
                          <button
                            type="button"
                            class="gh-btn gh-btn--sm"
                            data-open-situation-subject="${escapeHtml(subject.id)}"
                          >Ouvrir</button>
                        </div>
                      </article>
                    `;
                  }).join("")
                : `<div class="situation-kanban__empty">Aucun sujet dans cette colonne.</div>`}
            </div>
          </section>
        `).join("")}
      </section>
    `;
  }

  function bindKanbanEvents(root) {
    root.querySelectorAll("[data-open-situation-subject]").forEach((node) => {
      node.addEventListener("click", () => {
        const subjectId = String(node.getAttribute("data-open-situation-subject") || "").trim();
        if (!subjectId) return;
        openSubjectDrilldown(subjectId);
      });
    });

    root.querySelectorAll("[data-situation-kanban-move]").forEach((node) => {
      node.addEventListener("click", async () => {
        const direction = String(node.getAttribute("data-situation-kanban-move") || "").trim();
        const subjectId = String(node.getAttribute("data-situation-kanban-subject-id") || "").trim();
        const situationId = String(node.getAttribute("data-situation-kanban-situation-id") || "").trim();
        if (!subjectId || !situationId) return;

        const currentKey = getSujetKanbanStatus(subjectId, situationId) || "non_active";
        const currentIndex = KANBAN_STATUSES.findIndex((status) => status.key === currentKey);
        const targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
        const nextStatus = KANBAN_STATUSES[targetIndex]?.key || "";
        if (!nextStatus) return;

        const updated = setSujetKanbanStatus(subjectId, nextStatus, { situationId });
        if (!updated) return;
        await refreshAfterKanbanChange?.();
      });
    });
  }

  return {
    getKanbanColumns,
    renderSituationKanban,
    bindKanbanEvents
  };
}
