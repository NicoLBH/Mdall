import { store } from "../store.js";
import { escapeHtml } from "../utils/escape-html.js";
import { renderStatusBadge } from "./ui/status-badges.js";
import { renderSettingsModal } from "./ui/settings-modal.js";
import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { renderProjectSituationsRunbar, bindProjectSituationsRunbar } from "./project-situations-runbar.js";
import { loadFlatSubjectsForCurrentProject } from "../services/project-subjects-supabase.js";
import {
  loadSituationsForCurrentProject,
  createSituation,
  loadSubjectsForSituation
} from "../services/project-situations-supabase.js";

const situationsUiState = {
  loading: false,
  error: "",
  countsBySituationId: {},
  createModalOpen: false,
  createSubmitting: false,
  createError: "",
  createForm: getDefaultCreateForm()
};

function getDefaultCreateForm() {
  return {
    title: "",
    description: "",
    mode: "manual",
    automaticStatusOpen: true,
    automaticStatusClosed: false,
    automaticPriorityLow: false,
    automaticPriorityMedium: false,
    automaticPriorityHigh: false,
    automaticPriorityCritical: false,
    automaticBlockedOnly: false,
    automaticObjectiveIds: "",
    automaticLabelIds: "",
    automaticAssigneeIds: ""
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function normalizeSituationMode(value) {
  return String(value || "manual").trim().toLowerCase() === "automatic" ? "automatic" : "manual";
}

function normalizeSituationStatus(value) {
  return String(value || "open").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function syncSituationsToolbar(root = document) {
  const toolbarHost = document.getElementById("situationsToolbarHost");
  if (!toolbarHost) return;
  toolbarHost.innerHTML = renderProjectSituationsRunbar();
  bindProjectSituationsRunbar(root || toolbarHost);
}

function parseCsvList(value) {
  return [...new Set(String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean))];
}

function buildCreateSituationPayload() {
  const form = situationsUiState.createForm || getDefaultCreateForm();
  const mode = normalizeSituationMode(form.mode);
  const status = [
    form.automaticStatusOpen ? "open" : "",
    form.automaticStatusClosed ? "closed" : ""
  ].filter(Boolean);
  const priorities = [
    form.automaticPriorityLow ? "low" : "",
    form.automaticPriorityMedium ? "medium" : "",
    form.automaticPriorityHigh ? "high" : "",
    form.automaticPriorityCritical ? "critical" : ""
  ].filter(Boolean);

  return {
    title: firstNonEmpty(form.title, "Nouvelle situation"),
    description: firstNonEmpty(form.description, ""),
    status: "open",
    mode,
    filter_definition: mode === "automatic"
      ? {
          status,
          priorities,
          objectiveIds: parseCsvList(form.automaticObjectiveIds),
          labelIds: parseCsvList(form.automaticLabelIds),
          assigneeIds: parseCsvList(form.automaticAssigneeIds),
          blockedOnly: Boolean(form.automaticBlockedOnly)
        }
      : null
  };
}

function getSituations() {
  return safeArray(store.situationsView?.data)
    .map((situation) => ({
      ...situation,
      id: String(situation?.id || ""),
      title: firstNonEmpty(situation?.title, "Situation"),
      description: firstNonEmpty(situation?.description, ""),
      status: normalizeSituationStatus(situation?.status),
      mode: normalizeSituationMode(situation?.mode)
    }))
    .filter((situation) => situation.id)
    .sort((left, right) => {
      const leftTs = Date.parse(left?.created_at || "") || 0;
      const rightTs = Date.parse(right?.created_at || "") || 0;
      if (leftTs !== rightTs) return leftTs - rightTs;
      return left.title.localeCompare(right.title, "fr");
    });
}

function renderStatePill(status) {
  return renderStatusBadge({
    label: normalizeSituationStatus(status) === "closed" ? "Fermée" : "Ouverte",
    tone: normalizeSituationStatus(status) === "closed" ? "muted" : "success"
  });
}

function renderModePill(mode) {
  return renderStatusBadge({
    label: normalizeSituationMode(mode) === "automatic" ? "Automatique" : "Manuelle",
    tone: normalizeSituationMode(mode) === "automatic" ? "accent" : "default"
  });
}

function renderSituationCount(situationId) {
  const count = situationsUiState.countsBySituationId[String(situationId || "")];
  if (Number.isFinite(count)) return String(count);
  return situationsUiState.loading ? "…" : "0";
}

function renderSituationsTable() {
  const situations = getSituations();

  if (situationsUiState.error) {
    return `<div class="settings-inline-error">${escapeHtml(situationsUiState.error)}</div>`;
  }

  if (situationsUiState.loading && !situations.length) {
    return '<div class="settings-empty-note">Chargement des situations…</div>';
  }

  if (!situations.length) {
    return `
      <div class="data-table-shell__empty">
        Aucune situation n’est disponible pour ce projet.
      </div>
    `;
  }

  return `
    <div class="data-table-shell">
      <div class="data-table-shell__table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Description</th>
              <th>Statut</th>
              <th>Mode</th>
              <th>Nb sujets</th>
            </tr>
          </thead>
          <tbody>
            ${situations.map((situation) => `
              <tr class="${store.situationsView?.selectedSituationId === situation.id ? "is-selected" : ""}" data-open-situation="${escapeHtml(situation.id)}" style="cursor:pointer;">
                <td>
                  <button type="button" class="link-like" data-open-situation="${escapeHtml(situation.id)}">
                    ${escapeHtml(situation.title)}
                  </button>
                </td>
                <td>${situation.description ? escapeHtml(situation.description) : '<span class="color-fg-muted">—</span>'}</td>
                <td>${renderStatePill(situation.status)}</td>
                <td>${renderModePill(situation.mode)}</td>
                <td>${escapeHtml(renderSituationCount(situation.id))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCreateSituationModal() {
  if (!situationsUiState.createModalOpen) return "";

  const form = situationsUiState.createForm || getDefaultCreateForm();
  const automaticMode = normalizeSituationMode(form.mode) === "automatic";
  const submitDisabled = situationsUiState.createSubmitting || !String(form.title || "").trim();

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

      ${situationsUiState.createError ? `<div class="gh-alert gh-alert--error settings-modal__feedback">${escapeHtml(situationsUiState.createError)}</div>` : ""}

      <button type="button" class="gh-btn gh-btn--primary settings-modal__submit" id="projectCreateSituationSubmit" ${submitDisabled ? "disabled" : ""}>
        ${situationsUiState.createSubmitting ? "Création…" : "Créer la situation"}
      </button>
    `
  });
}

function renderPage() {
  return `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectSituationsScroll">
        <div class="settings-content" style="max-width:1216px;margin:0 auto;padding:24px 32px 40px;">
          <section class="settings-section">
            <div class="settings-card settings-card-less">
              <div class="settings-card__head">
                <div>
                  <h4>Pilotage par situations</h4>
                  <p>Chaque situation est désormais chargée depuis Supabase et expose un mode métier unique: manuel ou automatique.</p>
                </div>
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                  <span class="settings-badge mono">SITUATION VIEW</span>
                  <button type="button" class="gh-btn gh-btn--primary" id="openCreateSituationButton">Nouvelle situation</button>
                </div>
              </div>
            </div>
          </section>

          <section class="settings-section">
            <div class="settings-card settings-card-less">
              <div class="settings-card__head">
                <div>
                  <h4>Liste des situations</h4>
                  <p>Source de vérité: table <span class="mono">situations</span>, avec résolution dynamique du nombre de sujets par situation.</p>
                </div>
              </div>
              ${renderSituationsTable()}
            </div>
          </section>
        </div>
      </div>
      ${renderCreateSituationModal()}
    </section>
  `;
}

function rerender(root) {
  if (!root || !document.body.contains(root)) return;
  root.className = "project-shell__content";
  root.innerHTML = renderPage();
  syncSituationsToolbar(root);
  registerProjectPrimaryScrollSource(document.getElementById("projectSituationsScroll"));
  bindEvents(root);
}

async function refreshSituationsData(root, { forceSubjects = false } = {}) {
  situationsUiState.loading = true;
  situationsUiState.error = "";
  rerender(root);

  try {
    await loadFlatSubjectsForCurrentProject({ force: forceSubjects });
    const situations = await loadSituationsForCurrentProject();
    const countsEntries = await Promise.all(situations.map(async (situation) => {
      const subjects = await loadSubjectsForSituation(situation, store.projectSubjectsView).catch(() => []);
      return [String(situation?.id || ""), safeArray(subjects).length];
    }));
    situationsUiState.countsBySituationId = Object.fromEntries(countsEntries);
  } catch (error) {
    console.error("refreshSituationsData failed", error);
    situationsUiState.error = error instanceof Error ? error.message : "Impossible de charger les situations.";
  } finally {
    situationsUiState.loading = false;
    rerender(root);
  }
}

function openCreateModal(root) {
  situationsUiState.createModalOpen = true;
  situationsUiState.createSubmitting = false;
  situationsUiState.createError = "";
  situationsUiState.createForm = getDefaultCreateForm();
  rerender(root);
}

function closeCreateModal(root) {
  situationsUiState.createModalOpen = false;
  situationsUiState.createSubmitting = false;
  situationsUiState.createError = "";
  rerender(root);
}

async function submitCreateSituation(root) {
  const payload = buildCreateSituationPayload();
  if (!String(payload.title || "").trim()) {
    situationsUiState.createError = "Le titre est obligatoire.";
    rerender(root);
    return;
  }

  situationsUiState.createSubmitting = true;
  situationsUiState.createError = "";
  rerender(root);

  try {
    const created = await createSituation(null, payload);
    store.situationsView.selectedSituationId = created?.id || null;
    situationsUiState.createModalOpen = false;
    situationsUiState.createSubmitting = false;
    situationsUiState.createForm = getDefaultCreateForm();
    await refreshSituationsData(root, { forceSubjects: false });
  } catch (error) {
    console.error("createSituation failed", error);
    situationsUiState.createSubmitting = false;
    situationsUiState.createError = error instanceof Error ? error.message : "La création de la situation a échoué.";
    rerender(root);
  }
}

function bindEvents(root) {
  const openButton = root.querySelector("#openCreateSituationButton");
  if (openButton) {
    openButton.onclick = () => openCreateModal(root);
  }

  root.querySelectorAll("[data-open-situation]").forEach((node) => {
    node.addEventListener("click", () => {
      const situationId = String(node.getAttribute("data-open-situation") || "").trim();
      if (!situationId) return;
      store.situationsView.selectedSituationId = situationId;
      rerender(root);
    });
  });

  const modal = document.getElementById("projectCreateSituationModal");
  if (!modal) return;

  modal.querySelectorAll("[data-close-project-situation-modal]").forEach((node) => {
    node.addEventListener("click", () => closeCreateModal(root));
  });

  modal.querySelectorAll("[data-situation-create-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const key = String(event.currentTarget?.getAttribute("data-situation-create-field") || "").trim();
      if (!key) return;
      situationsUiState.createForm[key] = event.currentTarget.value;
      situationsUiState.createError = "";
    });
  });

  modal.querySelectorAll('input[name="situationCreateMode"]').forEach((field) => {
    field.addEventListener("change", (event) => {
      situationsUiState.createForm.mode = event.currentTarget.value === "automatic" ? "automatic" : "manual";
      situationsUiState.createError = "";
      rerender(root);
    });
  });

  modal.querySelectorAll("[data-situation-create-checkbox]").forEach((field) => {
    field.addEventListener("change", (event) => {
      const key = String(event.currentTarget?.getAttribute("data-situation-create-checkbox") || "").trim();
      if (!key) return;
      situationsUiState.createForm[key] = !!event.currentTarget.checked;
      situationsUiState.createError = "";
    });
  });

  const submitButton = modal.querySelector("#projectCreateSituationSubmit");
  if (submitButton) {
    submitButton.addEventListener("click", () => {
      submitCreateSituation(root);
    });
  }
}

export function renderProjectSituations(root) {
  setProjectViewHeader({
    contextLabel: "Situations",
    variant: "situations"
  });

  rerender(root);
  refreshSituationsData(root, { forceSubjects: false }).catch(() => undefined);
}
