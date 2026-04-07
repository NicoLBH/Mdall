import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";

export function renderSettingsModal({
  modalId = "settingsModal",
  title = "",
  bodyHtml = "",
  closeDataAttribute = "data-close-settings-modal"
} = {}) {
  return `
    <div class="personal-settings-delete-modal" id="${escapeHtml(modalId)}">
      <div class="personal-settings-delete-modal__backdrop" ${escapeHtml(closeDataAttribute)}="true"></div>

      <div class="personal-settings-delete-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="${escapeHtml(`${modalId}Title`)}">
        <div class="personal-settings-delete-modal__head">
          <div id="${escapeHtml(`${modalId}Title`)}" class="personal-settings-delete-modal__title">${escapeHtml(title)}</div>
          <button type="button" class="personal-settings-delete-modal__close" ${escapeHtml(closeDataAttribute)}="true" aria-label="Fermer">
            ${svgIcon("x")}
          </button>
        </div>

        <div class="personal-settings-delete-modal__body">
          ${bodyHtml}
        </div>
      </div>
    </div>
  `;
}
