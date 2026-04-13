import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { getAuthorIdentity } from "../ui/author-identity.js";
import { getChildrenBySubjectIdMapFromRawResult } from "../../services/subject-hierarchy.js";

const KANBAN_STATUSES = [
  { key: "non_active", label: "Non activé", hint: "Sujet détecté mais pas encore engagé." },
  { key: "to_activate", label: "A activer", hint: "Sujet prêt à être lancé." },
  { key: "in_progress", label: "En cours", hint: "Sujet actuellement traité." },
  { key: "in_arbitration", label: "En arbitrage", hint: "Décision ou arbitrage attendu." },
  { key: "resolved", label: "Résolu", hint: "Sujet traité ou clos." }
];

function normalizeIssueLifecycleStatus(status = "") {
  return String(status || "").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function renderIssueStateIcon(subject) {
  const isClosed = normalizeIssueLifecycleStatus(subject?.status) === "closed";
  return `<span class="issue-status-icon situation-kanban-card__status-icon" aria-hidden="true">${
    isClosed
      ? svgIcon("check-circle", { style: "color: var(--fgColor-done)" })
      : svgIcon("issue-opened", { style: "color: var(--fgColor-open)" })
  }</span>`;
}

function getSubjectProgress(subject, subjectsById = {}, childrenBySubjectId = {}) {
  const subjectId = String(subject?.id || "");
  const childIds = Array.isArray(childrenBySubjectId?.[subjectId]) ? childrenBySubjectId[subjectId] : [];
  const childSubjects = childIds.map((id) => subjectsById?.[id]).filter(Boolean);
  const total = childSubjects.length;
  if (!total) return null;
  const resolved = childSubjects.filter((child) => normalizeIssueLifecycleStatus(child?.status) === "closed").length;
  const percent = Math.max(0, Math.min(100, Math.round((resolved / total) * 100)));
  return { resolved, total, percent };
}

function renderAuthorAvatar(subject, currentUserAvatar) {
  const identity = getAuthorIdentity({
    author: subject?.author || subject?.owner || subject?.produced_by || subject?.agent || subject?.raw?.author || subject?.raw?.agent || "system",
    agent: subject?.agent || subject?.produced_by || subject?.raw?.agent || "system",
    avatarUrl: subject?.author_avatar_url || subject?.avatar || subject?.owner_avatar || "",
    currentUserAvatar,
    fallbackName: "System",
    avatarImageOptions: { className: "situation-kanban-card__avatar", alt: "", loading: true },
    humanAvatarImageOptions: { className: "situation-kanban-card__avatar", alt: "", loading: true },
    systemAvatarOptions: { className: "situation-kanban-card__avatar-fallback situation-kanban-card__avatar-fallback--system" }
  });
  if (identity.avatarHtml) return identity.avatarHtml;
  return `<span class="situation-kanban-card__avatar-fallback" aria-hidden="true">${svgIcon("avatar-human", { className: "octicon octicon-person" })}</span>`;
}

export function createProjectSituationsKanbanView({
  store,
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

  function renderSituationKanban(situation, subjects = [], options = {}) {
    const columns = getKanbanColumns();
    const cardsByColumn = Object.fromEntries(columns.map((column) => [column.key, []]));
    const normalizedSituationId = String(situation?.id || "").trim();
    const rawSubjectsResult = store?.projectSubjectsView?.rawSubjectsResult && typeof store.projectSubjectsView.rawSubjectsResult === "object"
      ? store.projectSubjectsView.rawSubjectsResult
      : {};
    const subjectsById = rawSubjectsResult.subjectsById && typeof rawSubjectsResult.subjectsById === "object"
      ? rawSubjectsResult.subjectsById
      : {};
    const childrenBySubjectId = getChildrenBySubjectIdMapFromRawResult(rawSubjectsResult);
    const currentUserAvatar = String(store?.user?.avatar || "").trim();

    subjects.forEach((subject) => {
      const statusKey = getSujetKanbanStatus(subject?.id, normalizedSituationId) || "non_active";
      const columnKey = cardsByColumn[statusKey] ? statusKey : "non_active";
      cardsByColumn[columnKey].push(subject);
    });

    if (!normalizedSituationId) {
      return `<div class="settings-empty-state">Sélectionne une situation pour afficher le kanban.</div>`;
    }

    if (!subjects.length && !options.loading) {
      return `<div class="settings-empty-state">Aucun sujet n’est actuellement rattaché à cette situation.</div>`;
    }

    return `
      <section class="situation-kanban" aria-label="Kanban de situation" data-situation-kanban-board="${escapeHtml(normalizedSituationId)}">
        ${columns.map((column) => `
          <section class="situation-kanban__col" data-situation-kanban-column="${escapeHtml(column.key)}">
            <header class="situation-kanban__head">
              <div>
                <div class="situation-kanban__hint"><span class="situation-kanban__dot situation-kanban__dot--${escapeHtml(column.key.replace(/_/g, '-'))}"></span>${escapeHtml(column.label)}</div>
                <div class="mono-small">${escapeHtml(column.hint)}</div>
              </div>
              <span class="situation-kanban__count mono">${cardsByColumn[column.key].length}</span>
            </header>
            <div class="situation-kanban__cards" data-situation-kanban-dropzone="${escapeHtml(column.key)}" data-situation-kanban-situation-id="${escapeHtml(normalizedSituationId)}">
              ${cardsByColumn[column.key].length
                ? cardsByColumn[column.key].map((subject) => {
                    const progress = getSubjectProgress(subject, subjectsById, childrenBySubjectId);
                    return `
                      <article
                        class="situation-kanban-card"
                        data-situation-kanban-card="${escapeHtml(subject.id)}"
                        data-situation-kanban-subject-id="${escapeHtml(subject.id)}"
                        data-situation-kanban-status="${escapeHtml(column.key)}"
                        data-situation-kanban-situation-id="${escapeHtml(normalizedSituationId)}"
                        draggable="true"
                      >
                        <div class="situation-kanban-card__meta">
                          <div class="situation-kanban-card__meta-lead">
                            ${renderIssueStateIcon(subject)}
                            <span class="mono-small issue-row-meta-text">Mdall #${escapeHtml(subject.id)}</span>
                          </div>
                          ${renderAuthorAvatar(subject, currentUserAvatar)}
                        </div>
                        <button
                          type="button"
                          class="situation-kanban-card__title row-title-trigger"
                          data-open-situation-subject="${escapeHtml(subject.id)}"
                        >${escapeHtml(String(subject?.title || subject?.id || "Sujet"))}</button>
                        ${progress ? `
                          <div class="situation-kanban-card__progress">
                            <div class="situation-kanban-card__progress-meta">
                              <span class="mono">${progress.resolved} / ${progress.total}</span>
                              <span>${progress.percent}%</span>
                            </div>
                            <div class="situation-kanban-card__progress-bar" aria-hidden="true">
                              <span class="situation-kanban-card__progress-value" style="width:${progress.percent}%"></span>
                            </div>
                          </div>
                        ` : ""}
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
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const subjectId = String(node.getAttribute("data-open-situation-subject") || "").trim();
        if (!subjectId) return;
        openSubjectDrilldown(subjectId, { variant: "situation-kanban" });
      });
    });

    root.querySelectorAll("[data-situation-kanban-card]").forEach((node) => {
      node.addEventListener("dragstart", (event) => {
        const subjectId = String(node.getAttribute("data-situation-kanban-subject-id") || "").trim();
        const situationId = String(node.getAttribute("data-situation-kanban-situation-id") || "").trim();
        const fromStatus = String(node.getAttribute("data-situation-kanban-status") || "").trim();
        if (!subjectId || !situationId || !fromStatus) return;
        node.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/json", JSON.stringify({ subjectId, situationId, fromStatus }));
      });

      node.addEventListener("dragend", () => {
        node.classList.remove("is-dragging");
        root.querySelectorAll(".situation-kanban__col").forEach((col) => col.classList.remove("is-drop-target"));
      });
    });

    root.querySelectorAll("[data-situation-kanban-dropzone]").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        zone.closest(".situation-kanban__col")?.classList.add("is-drop-target");
      });

      zone.addEventListener("dragleave", () => {
        zone.closest(".situation-kanban__col")?.classList.remove("is-drop-target");
      });

      zone.addEventListener("drop", async (event) => {
        event.preventDefault();
        zone.closest(".situation-kanban__col")?.classList.remove("is-drop-target");
        let payload = null;
        try {
          payload = JSON.parse(event.dataTransfer.getData("application/json") || "{}");
        } catch {
          payload = null;
        }
        const subjectId = String(payload?.subjectId || "").trim();
        const situationId = String(payload?.situationId || "").trim();
        const fromStatus = String(payload?.fromStatus || "").trim();
        const targetStatus = String(zone.getAttribute("data-situation-kanban-dropzone") || "").trim();
        if (!subjectId || !situationId || !targetStatus || fromStatus === targetStatus) return;

        try {
          const updated = await setSujetKanbanStatus(subjectId, targetStatus, { situationId });
          if (!updated) return;
          await refreshAfterKanbanChange?.();
        } catch (error) {
          console.error("situation kanban drop failed", error);
          window.alert(`Mise à jour Supabase impossible : ${String(error?.message || error || "Erreur inconnue")}`);
        }
      });
    });
  }

  return {
    getKanbanColumns,
    renderSituationKanban,
    bindKanbanEvents
  };
}
