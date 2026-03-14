let splitButtonGlobalBound = false;
import { svgIcon } from "../../ui/icons.js";

function closeAllSplitMenus(exceptId = "") {
  document.querySelectorAll(".gh-split").forEach((root) => {
    if (!exceptId || root.dataset.splitId !== exceptId) {
      root.classList.remove("is-open");
    }
  });
}

export function renderGhSplitButton({
  id,
  label = "Action",
  variant = "",
  items = []
}) {
  const itemHtml = items.map((item) => `
    <button
      type="button"
      class="gh-menu__item${item.danger ? " is-danger" : ""}"
      data-menu-action="${item.action}"
    >
      ${item.label}
    </button>
  `).join("");

  return `
    <div class="gh-split ${variant ? `gh-split--${variant}` : ""}" data-split-id="${id}">
      <button
        type="button"
        class="gh-btn ${variant === "primary" ? "gh-btn--primary" : ""} gh-split__main"
        data-split-main
      >
        ${label}
      </button>

      <button
        type="button"
        class="gh-btn ${variant === "primary" ? "gh-btn--primary" : ""} gh-split__toggle"
        data-split-toggle
        aria-haspopup="menu"
        aria-expanded="false"
        aria-label="Ouvrir le menu"
      >
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu" role="menu">
        ${itemHtml}
      </div>
    </div>
  `;
}

export function bindGhSplitButtons() {
  if (splitButtonGlobalBound) return;
  splitButtonGlobalBound = true;

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest?.("[data-split-toggle]");
    const main = event.target.closest?.("[data-split-main]");
    const menuItem = event.target.closest?.("[data-menu-action]");
    const splitRoot = event.target.closest?.(".gh-split");

    if (toggle && splitRoot) {
      event.preventDefault();
      event.stopPropagation();

      const id = splitRoot.dataset.splitId || "";
      const isOpen = splitRoot.classList.contains("is-open");

      closeAllSplitMenus(isOpen ? "" : id);
      splitRoot.classList.toggle("is-open", !isOpen);

      const toggleBtn = splitRoot.querySelector("[data-split-toggle]");
      if (toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      }
      return;
    }

    if (main && splitRoot) {
      const action = splitRoot.dataset.mainAction;
      if (action) {
        splitRoot.dispatchEvent(new CustomEvent("ghsplit:action", {
          bubbles: true,
          detail: { action }
        }));
      }
      closeAllSplitMenus();
      return;
    }

    if (menuItem && splitRoot) {
      const action = menuItem.dataset.menuAction || "";
      splitRoot.dispatchEvent(new CustomEvent("ghsplit:action", {
        bubbles: true,
        detail: { action }
      }));
      closeAllSplitMenus();
      return;
    }

    if (!event.target.closest?.(".gh-split")) {
      closeAllSplitMenus();
    }
  });

  window.addEventListener("blur", () => {
    closeAllSplitMenus();
  });
}

export function initGhSplitButton(root, { mainAction = "" } = {}) {
  if (!root) return;
  root.dataset.mainAction = mainAction;
}
