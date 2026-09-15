import { escapeHtml } from "../../utils/escape-html.js";

/**
 * ## Ce qu'on demande à la création, et ce qu'on demande après
 *
 * La fenêtre de création demandait d'abord un **type** — « Manuelle » ou
 * « Automatique » — avant même qu'on ait écrit un titre. C'est une question de
 * mécanique posée au moment où l'on a une intention : on sait qu'on veut « ma
 * semaine », on ne sait pas encore si on la remplira à la main.
 *
 * Elle ne demande donc plus que ce qu'on a en tête : un titre, une description.
 * **Une situation naît en retenant les sujets qu'on y met**, ce qui est le cas
 * ordinaire et ne se décide pas.
 *
 * Le choix reste, mais à sa place : dans la fenêtre de modification, une fois
 * la situation ouverte et qu'on sait ce qu'on veut en faire. Il y est dit en
 * français plutôt qu'en jargon — « les sujets que j'y mets » contre « ceux qui
 * répondent à une recherche » — et il n'est plus figé à la création : une
 * situation qu'on a commencée à la main peut devenir une recherche.
 *
 * Sur quels chantiers la requête porte.
 *
 * **Des noms, pas des identifiants.** Les autres champs de ce formulaire se
 * saisissent en identifiants ; celui-ci ne le peut pas — on ne retient pas les
 * identifiants de quinze chantiers, on retient « Résidence Bertrand ».
 *
 * **La liste se propose à la frappe**, par une `datalist` : c'est le navigateur
 * qui filtre, et rien de neuf n'est dessiné. Inventer un menu ici obligerait à
 * le recalibrer à côté des autres champs, qui sont des `input` ordinaires.
 *
 * Aucun chantier écrit n'est pas un filtre : la requête porte sur tout le
 * périmètre de la situation (étape 4).
 */
function renderChantiersField(mode, form, projets = []) {
  const liste = `situationChantiers-${mode}`;
  const options = (Array.isArray(projets) ? projets : [])
    .map((projet) => `<option value="${escapeHtml(String(projet?.name ?? projet?.nom ?? ""))}"></option>`)
    .join("");

  return `
    <label class="settings-modal__field">
      <span class="settings-modal__label">Chantiers (noms séparés par des virgules)</span>
      <input
        type="text"
        class="gh-input settings-modal__input"
        data-situation-${mode}-field="automaticProjectNames"
        value="${escapeHtml(form?.automaticProjectNames || "")}"
        list="${escapeHtml(liste)}"
        placeholder="Tous ceux de la situation"
        autocomplete="off"
        spellcheck="false">
      <datalist id="${escapeHtml(liste)}">${options}</datalist>
    </label>
  `;
}

function renderCheckboxField(key, label, checked, dataAttr) {
  return `<label class="project-lot-modal__radio"><input type="checkbox" ${dataAttr}="${escapeHtml(key)}" ${checked ? "checked" : ""}><span>${escapeHtml(label)}</span></label>`;
}

export function renderSituationForm({
  form,
  mode = "create",
  /** Les chantiers qu'on sait nommer, proposés à la frappe. */
  projets = [],
  normalizeSituationMode,
  error = "",
  submitting = false,
  submitButtonId = "",
  submitLabel = "",
  submitPendingLabel = ""
} = {}) {
  const resolvedMode = mode === "edit" ? "edit" : "create";
  const automaticMode = normalizeSituationMode(form?.mode) === "automatic";
  const submitDisabled = submitting || !String(form?.title || "").trim();

  return `
    <label class="settings-modal__field">
      <span class="settings-modal__label">Titre</span>
      <input
        type="text"
        class="gh-input settings-modal__input"
        data-situation-${resolvedMode}-field="title"
        value="${escapeHtml(form?.title || "")}"
        autocomplete="off"
        spellcheck="false"
      >
    </label>

    <label class="settings-modal__field">
      <span class="settings-modal__label">Description</span>
      <textarea
        class="gh-input settings-modal__input"
        data-situation-${resolvedMode}-field="description"
        rows="4"
      >${escapeHtml(form?.description || "")}</textarea>
    </label>

    ${resolvedMode === "edit" ? `
      <div class="settings-modal__field">
        <span class="settings-modal__label">Ce qu'elle retient</span>
        <div class="project-lot-modal__groups" role="radiogroup" aria-label="Ce que la situation retient">
          <label class="project-lot-modal__radio">
            <input type="radio" name="situation${resolvedMode}Mode" value="manual" ${automaticMode ? "" : "checked"}>
            <span>Les sujets que j'y mets</span>
          </label>
          <label class="project-lot-modal__radio">
            <input type="radio" name="situation${resolvedMode}Mode" value="automatic" ${automaticMode ? "checked" : ""}>
            <span>Ceux qui répondent à une recherche</span>
          </label>
        </div>
      </div>
    ` : ""}

    ${resolvedMode === "edit" ? `
      <div class="settings-modal__field">
        <span class="settings-modal__label">Statut</span>
        <div class="project-lot-modal__groups" role="radiogroup" aria-label="Statut de situation">
          <label class="project-lot-modal__radio">
            <input type="radio" name="situationEditStatus" value="open" ${String(form?.status || "open") === "closed" ? "" : "checked"}>
            <span>Ouverte</span>
          </label>
          <label class="project-lot-modal__radio">
            <input type="radio" name="situationEditStatus" value="closed" ${String(form?.status || "open") === "closed" ? "checked" : ""}>
            <span>Fermée</span>
          </label>
        </div>
      </div>
    ` : ""}

    ${automaticMode ? `
      <div class="settings-modal__field">
        <span class="settings-modal__label">Filtre automatique</span>
        <div class="subject-filters__chips" style="margin-top:8px;">
          ${renderCheckboxField("automaticStatusOpen", "Statut ouvert", !!form?.automaticStatusOpen, `data-situation-${resolvedMode}-checkbox`)}
          ${renderCheckboxField("automaticStatusClosed", "Statut fermé", !!form?.automaticStatusClosed, `data-situation-${resolvedMode}-checkbox`)}
          ${renderCheckboxField("automaticPriorityLow", "Priorité basse", !!form?.automaticPriorityLow, `data-situation-${resolvedMode}-checkbox`)}
          ${renderCheckboxField("automaticPriorityMedium", "Priorité moyenne", !!form?.automaticPriorityMedium, `data-situation-${resolvedMode}-checkbox`)}
          ${renderCheckboxField("automaticPriorityHigh", "Priorité haute", !!form?.automaticPriorityHigh, `data-situation-${resolvedMode}-checkbox`)}
          ${renderCheckboxField("automaticPriorityCritical", "Priorité critique", !!form?.automaticPriorityCritical, `data-situation-${resolvedMode}-checkbox`)}
          ${renderCheckboxField("automaticBlockedOnly", "Bloqués seulement", !!form?.automaticBlockedOnly, `data-situation-${resolvedMode}-checkbox`)}
        </div>
      </div>

      <label class="settings-modal__field">
        <span class="settings-modal__label">Objectifs (IDs séparés par des virgules)</span>
        <input type="text" class="gh-input settings-modal__input" data-situation-${resolvedMode}-field="automaticObjectiveIds" value="${escapeHtml(form?.automaticObjectiveIds || "")}" autocomplete="off" spellcheck="false">
      </label>

      <label class="settings-modal__field">
        <span class="settings-modal__label">Labels (IDs séparés par des virgules)</span>
        <input type="text" class="gh-input settings-modal__input" data-situation-${resolvedMode}-field="automaticLabelIds" value="${escapeHtml(form?.automaticLabelIds || "")}" autocomplete="off" spellcheck="false">
      </label>

      <label class="settings-modal__field">
        <span class="settings-modal__label">Assignés (IDs séparés par des virgules)</span>
        <input type="text" class="gh-input settings-modal__input" data-situation-${resolvedMode}-field="automaticAssigneeIds" value="${escapeHtml(form?.automaticAssigneeIds || "")}" autocomplete="off" spellcheck="false">
      </label>

      ${renderChantiersField(resolvedMode, form, projets)}
    ` : ""}

    ${error ? `<div class="gh-alert gh-alert--error settings-modal__feedback">${escapeHtml(error)}</div>` : ""}

    <button type="button" class="gh-btn gh-btn--primary settings-modal__submit" id="${escapeHtml(submitButtonId)}" ${submitDisabled ? "disabled" : ""}>
      ${submitting ? escapeHtml(submitPendingLabel || submitLabel) : escapeHtml(submitLabel)}
    </button>
  `;
}
