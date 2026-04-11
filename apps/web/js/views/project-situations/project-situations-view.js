import { escapeHtml } from "../../utils/escape-html.js";
import { renderSettingsModal } from "../ui/settings-modal.js";
import { renderStatusBadge } from "../ui/status-badges.js";

export function createProjectSituationsView({
  store,
  uiState,
  getDefaultCreateForm,
  normalizeSituationMode,
  renderSituationsTable,
  getSituationById,
  renderSituationKanban
}) {
  function renderCreateSituationModal() {
    if (!uiState.createModalOpen) return "";

    const form = uiState.createForm || getDefaultCreateForm();
    const automaticMode = normalizeSituationMode(form.mode) === "automatic";
    const submitDisabled = uiState.createSubmitting || !String(form.title || "").trim();

    return renderSettingsModal({
      modalId: "projectCreateSituationModal",
      title: "Nouvelle situation",
      subtitle: "Crée une vraie situation projet stockée dans Supabase.",
      closeDataAttribute: "data-close-project-situation-modal",
      bodyHtml: `
        <label class="settings-modal__field">
          <span class="settings-modal__label">Titre</span>
          <input
            type="text"
            class="gh-input settings-modal__input"
            data-situation-create-field="title"
            value="${escapeHtml(form.title)}"
            autocomplete="off"
            spellcheck="false"
          >
        </label>

        <label class="settings-modal__field">
          <span class="settings-modal__label">Description</span>
          <textarea
            class="gh-input settings-modal__input"
            data-situation-create-field="description"
            rows="4"
          >${escapeHtml(form.description)}</textarea>
        </label>

        <div class="settings-modal__field">
          <span class="settings-modal__label">Type</span>
          <div class="project-lot-modal__groups" role="radiogroup" aria-label="Type de situation">
            <label class="project-lot-modal__radio">
              <input type="radio" name="situationCreateMode" value="manual" ${form.mode !== "automatic" ? "checked" : ""}>
              <span>Manuelle</span>
            </label>
            <label class="project-lot-modal__radio">
              <input type="radio" name="situationCreateMode" value="automatic" ${form.mode === "automatic" ? "checked" : ""}>
              <span>Automatique</span>
            </label>
          </div>
        </div>

        ${automaticMode ? `
          <div class="settings-modal__field">
            <span class="settings-modal__label">Filtre automatique</span>
            <div class="subject-filters__chips" style="margin-top:8px;">
              <label class="project-lot-modal__radio"><input type="checkbox" data-situation-create-checkbox="automaticStatusOpen" ${form.automaticStatusOpen ? "checked" : ""}><span>Statut ouvert</span></label>
              <label class="project-lot-modal__radio"><input type="checkbox" data-situation-create-checkbox="automaticStatusClosed" ${form.automaticStatusClosed ? "checked" : ""}><span>Statut fermé</span></label>
              <label class="project-lot-modal__radio"><input type="checkbox" data-situation-create-checkbox="automaticPriorityLow" ${form.automaticPriorityLow ? "checked" : ""}><span>Priorité basse</span></label>
              <label class="project-lot-modal__radio"><input type="checkbox" data-situation-create-checkbox="automaticPriorityMedium" ${form.automaticPriorityMedium ? "checked" : ""}><span>Priorité moyenne</span></label>
              <label class="project-lot-modal__radio"><input type="checkbox" data-situation-create-checkbox="automaticPriorityHigh" ${form.automaticPriorityHigh ? "checked" : ""}><span>Priorité haute</span></label>
              <label class="project-lot-modal__radio"><input type="checkbox" data-situation-create-checkbox="automaticPriorityCritical" ${form.automaticPriorityCritical ? "checked" : ""}><span>Priorité critique</span></label>
              <label class="project-lot-modal__radio"><input type="checkbox" data-situation-create-checkbox="automaticBlockedOnly" ${form.automaticBlockedOnly ? "checked" : ""}><span>Bloqués seulement</span></label>
            </div>
          </div>

          <label class="settings-modal__field">
            <span class="settings-modal__label">Objectifs (IDs séparés par des virgules)</span>
            <input type="text" class="gh-input settings-modal__input" data-situation-create-field="automaticObjectiveIds" value="${escapeHtml(form.automaticObjectiveIds)}" autocomplete="off" spellcheck="false">
          </label>

          <label class="settings-modal__field">
            <span class="settings-modal__label">Labels (IDs séparés par des virgules)</span>
            <input type="text" class="gh-input settings-modal__input" data-situation-create-field="automaticLabelIds" value="${escapeHtml(form.automaticLabelIds)}" autocomplete="off" spellcheck="false">
          </label>

          <label class="settings-modal__field">
            <span class="settings-modal__label">Assignés (IDs séparés par des virgules)</span>
            <input type="text" class="gh-input settings-modal__input" data-situation-create-field="automaticAssigneeIds" value="${escapeHtml(form.automaticAssigneeIds)}" autocomplete="off" spellcheck="false">
          </label>
        ` : ""}

        ${uiState.createError ? `<div class="gh-alert gh-alert--error settings-modal__feedback">${escapeHtml(uiState.createError)}</div>` : ""}

        <button type="button" class="gh-btn gh-btn--primary settings-modal__submit" id="projectCreateSituationSubmit" ${submitDisabled ? "disabled" : ""}>
          ${uiState.createSubmitting ? "Création…" : "Créer la situation"}
        </button>
      `
    });
  }

  function renderSelectedSituationDetails() {
    const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituation = getSituationById(selectedSituationId);

    if (!selectedSituation) {
      return `
        <section class="gh-panel gh-panel--details" aria-label="Situation sélectionnée">
          <div class="gh-panel__head gh-panel__head--tight">Aucune situation sélectionnée</div>
          <div class="details-body situation-kanban-modal-detail">Sélectionne une situation dans le tableau pour ouvrir son détail.</div>
        </section>
      `;
    }

    const modeBadge = renderStatusBadge({
      label: normalizeSituationMode(selectedSituation.mode) === "automatic" ? "Automatique" : "Manuelle",
      tone: normalizeSituationMode(selectedSituation.mode) === "automatic" ? "accent" : "default"
    });
    const statusBadge = renderStatusBadge({
      label: String(selectedSituation.status || "open") === "closed" ? "Fermée" : "Ouverte",
      tone: String(selectedSituation.status || "open") === "closed" ? "muted" : "success"
    });

    return `
      <section class="gh-panel gh-panel--details" aria-label="Détail de situation">
        <div class="gh-panel__head gh-panel__head--tight">
          <div style="display:flex;flex-direction:column;gap:10px;width:100%;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <div class="details-title">${escapeHtml(selectedSituation.title || "Situation")}</div>
                ${selectedSituation.description ? `<div class="issue-row-meta-text" style="margin-top:6px;max-width:860px;">${escapeHtml(selectedSituation.description)}</div>` : ""}
              </div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${statusBadge}${modeBadge}<span class="mono-small">${uiState.selectedSituationSubjects.length} sujet(s)</span></div>
            </div>
          </div>
        </div>
        <div class="details-body situation-kanban-modal-detail">
          ${uiState.selectedSituationError ? `<div class="settings-inline-error">${escapeHtml(uiState.selectedSituationError)}</div>` : ""}
          ${uiState.selectedSituationLoading
            ? `<div class="settings-empty-state">Chargement des sujets de la situation…</div>`
            : renderSituationKanban(selectedSituation, uiState.selectedSituationSubjects, { loading: uiState.selectedSituationLoading })}
        </div>
      </section>
    `;
  }

  function renderPage() {
    return `
      <section class="project-simple-page project-simple-page--settings">
        <div class="project-simple-scroll" id="projectSituationsScroll">
          <div class="settings-content project-page-shell project-page-shell--content">
            <div style="display:flex;justify-content:flex-end;align-items:center;margin:0 0 16px;">
              <button type="button" class="gh-btn gh-btn--primary" id="openCreateSituationButton">Nouvelle situation</button>
            </div>
            <section class="gh-panel gh-panel--results" aria-label="Results">
              ${renderSituationsTable()}
            </section>
            <div style="height:16px;"></div>
            ${renderSelectedSituationDetails()}
          </div>
        </div>
        ${renderCreateSituationModal()}
      </section>
    `;
  }

  function bindViewEvents() {}

  return {
    renderCreateSituationModal,
    renderSelectedSituationDetails,
    renderPage,
    bindViewEvents
  };
}
