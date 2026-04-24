import { escapeHtml } from "../utils/escape-html.js";

function normalizeSituation(situation) {
  if (!situation || typeof situation !== "object") {
    return { title: "Situation", description: "" };
  }
  return {
    title: String(situation.title || "Situation"),
    description: String(situation.description || "")
  };
}

export function renderProjectSituationDrilldown(situation, options = {}) {
  const normalizedSituation = normalizeSituation(situation);
  const closeButtonId = String(options.closeButtonId || "drilldownClose");
  const closeButtonLabel = String(options.closeButtonLabel || "Fermer");
  const editActionLabel = String(options.editActionLabel || "Modifier");
  const shortDescriptionLabel = String(options.shortDescriptionLabel || "Description courte");

  return `
    <div class="project-situation-drilldown" data-project-situation-drilldown="true">
      <div class="project-situation-drilldown__header">
        <div class="project-situation-drilldown__title">${escapeHtml(normalizedSituation.title)}</div>
        <button
          type="button"
          id="${escapeHtml(closeButtonId)}"
          class="project-situation-drilldown__close"
          aria-label="${escapeHtml(closeButtonLabel)}"
          title="${escapeHtml(closeButtonLabel)}"
        >✕</button>
      </div>

      <div class="project-situation-drilldown__section">
        <div class="project-situation-drilldown__section-head">
          <span class="project-situation-drilldown__section-title">
            <svg class="icon project-situation-drilldown__section-icon" aria-hidden="true" focusable="false">
              <use href="assets/icons.svg#situation-description" xlink:href="assets/icons.svg#situation-description"></use>
            </svg>
            ${escapeHtml(shortDescriptionLabel)}
          </span>
          <button
            type="button"
            class="project-situation-drilldown__section-action"
            aria-label="${escapeHtml(editActionLabel)}"
            title="${escapeHtml(editActionLabel)}"
          >
            <svg class="icon project-situation-drilldown__action-icon" aria-hidden="true" focusable="false">
              <use href="assets/icons.svg#pencil" xlink:href="assets/icons.svg#pencil"></use>
            </svg>
          </button>
        </div>

        <div class="project-situation-drilldown__section-content">${escapeHtml(normalizedSituation.description)}</div>
      </div>
    </div>
  `;
}
