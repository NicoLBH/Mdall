import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";

export function renderGhInput({
  id,
  value = "",
  placeholder = "",
  type = "text",
  icon = "",
  outerIcon = "",
  className = "",
  inputClassName = "",
  readonly = false,
  disabled = false,
  dataAttrs = {},
  ariaLabel = ""
}) {
  const attrs = Object.entries(dataAttrs)
    .map(([key, val]) => `data-${escapeHtml(key)}="${escapeHtml(val)}"`)
    .join(" ");

  return `
    <div class="gh-input-wrap ${icon ? "gh-input-wrap--inner-icon" : ""} ${outerIcon ? "gh-input-wrap--outer-icon" : ""} ${className}">
      ${outerIcon ? `<span class="gh-input-wrap__outer-icon">${outerIcon}</span>` : ""}
      <div class="gh-input-wrap__control">
        ${icon ? `<span class="gh-input-wrap__icon">${icon}</span>` : ""}
        <input
          id="${escapeHtml(id)}"
          type="${escapeHtml(type)}"
          class="gh-input ${inputClassName}"
          value="${escapeHtml(value)}"
          placeholder="${escapeHtml(placeholder)}"
          ${ariaLabel ? `aria-label="${escapeHtml(ariaLabel)}"` : ""}
          ${readonly ? "readonly" : ""}
          ${disabled ? "disabled" : ""}
          ${attrs}
        >
      </div>
    </div>
  `;
}

export function renderGhEditableField({
  id,
  label = "",
  value = "",
  placeholder = "",
  iconName = "pencil"
}) {
  const pencil = svgIcon(iconName, { className: "octicon" });
  const check = svgIcon("check", { className: "octicon" });

  return `
    <div class="form-row form-row--settings">
      ${label ? `<label for="${escapeHtml(id)}">${escapeHtml(label)}</label>` : ""}
      <div class="gh-editable-field" data-editable-field>
        <input
          id="${escapeHtml(id)}"
          type="text"
          class="gh-input gh-editable-field__input"
          value="${escapeHtml(value)}"
          placeholder="${escapeHtml(placeholder)}"
          readonly
          data-editable-input
        >
        <button
          type="button"
          class="gh-btn gh-btn--ghost gh-editable-field__btn"
          data-editable-toggle
          aria-label="Modifier"
          data-edit-label="Modifier"
          data-validate-label="Valider"
        >
          <span class="gh-editable-field__btn-icon" data-editable-icon>${pencil}</span>
          <span class="gh-editable-field__btn-text" data-editable-text>Modifier</span>
        </button>

        <template data-icon-edit>${pencil}</template>
        <template data-icon-validate>${check}</template>
      </div>
    </div>
  `;
}

export function bindGhEditableFields(root = document, { onValidate } = {}) {
  root.querySelectorAll("[data-editable-field]").forEach((field) => {
    const input = field.querySelector("[data-editable-input]");
    const btn = field.querySelector("[data-editable-toggle]");
    const btnText = field.querySelector("[data-editable-text]");
    const btnIcon = field.querySelector("[data-editable-icon]");
    const editIcon = field.querySelector("[data-icon-edit]")?.innerHTML || "";
    const validateIcon = field.querySelector("[data-icon-validate]")?.innerHTML || "";

    if (!input || !btn || btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      const isEditing = field.classList.contains("is-editing");

      if (!isEditing) {
        field.classList.add("is-editing");
        input.removeAttribute("readonly");
        input.focus();
        input.select();
        btnText.textContent = btn.dataset.validateLabel || "Valider";
        btnIcon.innerHTML = validateIcon;
        return;
      }

      field.classList.remove("is-editing");
      input.setAttribute("readonly", "readonly");
      btnText.textContent = btn.dataset.editLabel || "Modifier";
      btnIcon.innerHTML = editIcon;

      if (typeof onValidate === "function") {
        onValidate(input.id, input.value, input);
      }
    });
  });
}
