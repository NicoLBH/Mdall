import { svgIcon } from "../../ui/icons.js";

let actionButtonGlobalBound = false;

function closeAllActionMenus(exceptId = "") {
  document.querySelectorAll(".gh-action").forEach((root) => {
    if (!exceptId || root.dataset.actionId !== exceptId) {
      root.classList.remove("is-open");
      const toggle = root.querySelector("[data-action-toggle]");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function escapeAttr(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function normalizeSelectOptions(options = []) {
  return options.map((option) => {
    if (option && typeof option === "object") {
      return {
        value: String(option.value ?? option.label ?? ""),
        label: String(option.label ?? option.value ?? "")
      };
    }

    return {
      value: String(option ?? ""),
      label: String(option ?? "")
    };
  });
}

function renderMenuItems(items = []) {
  return items.map((item) => `
    <button
      type="button"
      class="gh-menu__item${item.danger ? " is-danger" : ""}"
      data-menu-action="${escapeAttr(item.action || "")}"
    >
      ${item.icon ? `<span class="gh-menu__item-icon">${item.icon}</span>` : ""}
      <span>${item.label || ""}</span>
    </button>
  `).join("");
}

export function renderGhActionButton({
  id,
  label = "",
  icon = "",
  tone = "default",
  size = "md",
  items = [],
  mainAction = "",
  withChevron = true,
  iconOnly = false,
  disabled = false,
  className = ""
}) {
  const hasMenu = Array.isArray(items) && items.length > 0;
  const btnToneClass = tone ? `gh-btn--${tone}` : "";
  const btnSizeClass = size ? `gh-btn--${size}` : "";
  const rootClasses = [
    "gh-action",
    hasMenu ? "gh-action--split" : "gh-action--single",
    className
  ].filter(Boolean).join(" ");

  const contentHtml = `
    ${icon ? `<span class="gh-action__icon">${icon}</span>` : ""}
    ${!iconOnly ? `<span class="gh-action__label">${label}</span>` : ""}
  `;

  if (!hasMenu) {
    return `
      <div
        class="${rootClasses}"
        data-action-id="${escapeAttr(id)}"
        data-main-action="${escapeAttr(mainAction)}"
      >
        <button
          type="button"
          class="gh-btn gh-action__main ${btnToneClass} ${btnSizeClass}"
          data-action-main
          ${disabled ? "disabled" : ""}
        >
          ${contentHtml}
        </button>
      </div>
    `;
  }

  return `
    <div
      class="${rootClasses}"
      data-action-id="${escapeAttr(id)}"
      data-main-action="${escapeAttr(mainAction)}"
    >
      <button
        type="button"
        class="gh-btn gh-action__main ${btnToneClass} ${btnSizeClass}"
        data-action-main
        ${disabled ? "disabled" : ""}
      >
        ${contentHtml}
      </button>

      <button
        type="button"
        class="gh-btn gh-action__toggle ${btnToneClass} ${btnSizeClass}"
        data-action-toggle
        aria-haspopup="menu"
        aria-expanded="false"
        aria-label="Ouvrir le menu"
        ${disabled ? "disabled" : ""}
      >
        ${withChevron ? svgIcon("chevron-down", { className: "gh-chevron" }) : ""}
      </button>

      <div class="gh-menu" role="menu">
        ${renderMenuItems(items)}
      </div>
    </div>
  `;
}

export function renderGhSelectMenu({
  id,
  label = "",
  value = "",
  options = [],
  tone = "default",
  size = "md",
  icon = "",
  fieldClassName = "",
  buttonClassName = ""
}) {
  const normalizedOptions = normalizeSelectOptions(options);
  const activeOption = normalizedOptions.find((option) => option.value === String(value)) || normalizedOptions[0] || { value: "", label: "" };

  return `
    <div
      class="gh-select-field ${fieldClassName}"
      data-select-menu
      data-select-id="${escapeAttr(id)}"
      data-select-value="${escapeAttr(activeOption.value)}"
    >
      ${label ? `<div class="gh-select-field__label">${escapeAttr(label)}</div>` : ""}
      ${renderGhActionButton({
        id: `${id}__action`,
        label: activeOption.label,
        icon,
        tone,
        size,
        className: `gh-select-field__action ${buttonClassName}`.trim(),
        items: normalizedOptions.map((option) => ({
          label: option.label,
          action: `select:${encodeURIComponent(option.value)}`
        }))
      })}
    </div>
  `;
}

export function bindGhActionButtons() {
  if (actionButtonGlobalBound) return;
  actionButtonGlobalBound = true;

  document.addEventListener("click", (event) => {
    const main = event.target.closest?.("[data-action-main]");
    const toggle = event.target.closest?.("[data-action-toggle]");
    const menuItem = event.target.closest?.("[data-menu-action]");
    const root = event.target.closest?.(".gh-action");

    if (toggle && root) {
      event.preventDefault();
      event.stopPropagation();

      const id = root.dataset.actionId || "";
      const isOpen = root.classList.contains("is-open");

      closeAllActionMenus(isOpen ? "" : id);
      root.classList.toggle("is-open", !isOpen);

      toggle.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      return;
    }

    if (main && root) {
      const action = root.dataset.mainAction || "";
      if (action) {
        root.dispatchEvent(new CustomEvent("ghaction:action", {
          bubbles: true,
          detail: { action }
        }));
      }
      closeAllActionMenus();
      return;
    }

    if (menuItem && root) {
      const action = menuItem.dataset.menuAction || "";
      const label =
        menuItem.querySelector("span:last-child")?.textContent?.trim() ||
        menuItem.textContent?.trim() ||
        "";

      root.dispatchEvent(new CustomEvent("ghaction:action", {
        bubbles: true,
        detail: { action, label }
      }));
      closeAllActionMenus();
      return;
    }

    if (!event.target.closest?.(".gh-action")) {
      closeAllActionMenus();
    }
  });

  window.addEventListener("blur", () => {
    closeAllActionMenus();
  });
}

export function bindGhSelectMenus(root = document, { onChange } = {}) {
  root.querySelectorAll("[data-select-menu]").forEach((field) => {
    if (field.dataset.selectBound === "true") return;
    field.dataset.selectBound = "true";

    const actionRoot = field.querySelector(".gh-action");
    if (!actionRoot) return;

    actionRoot.addEventListener("ghaction:action", (event) => {
      const action = String(event.detail?.action || "");
      if (!action.startsWith("select:")) return;

      const value = decodeURIComponent(action.slice("select:".length));
      const label = String(event.detail?.label || value || "");
      const labelNode = actionRoot.querySelector(".gh-action__label");

      field.dataset.selectValue = value;
      if (labelNode) labelNode.textContent = label;

      if (typeof onChange === "function") {
        onChange(field.dataset.selectId || "", value, field, label);
      }
    });
  });
}

/* compat */
export const renderGhSplitButton = renderGhActionButton;
export const bindGhSplitButtons = bindGhActionButtons;

export function initGhActionButton(root, { mainAction = "" } = {}) {
  if (!root) return;
  root.dataset.mainAction = mainAction;
}

/* compat */
export const initGhSplitButton = initGhActionButton;
