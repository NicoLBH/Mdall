import { escapeHtml } from "../../utils/escape-html.js";
import { renderCountBadge } from "./status-badges.js";

export function renderTableHeadFilterToggle({
  groupClassName = "",
  buttonClassName = "",
  activeValue = "open",
  items = []
} = {}) {
  const groupClass = ["table-head-filter-group", groupClassName].filter(Boolean).join(" ");

  return `
    <div class="${groupClass}">
      ${items.map(({ label = "", value = "", count = 0, dataAttr = "" }) => {
        const attrName = String(dataAttr || "").trim();
        const dataAttribute = attrName ? ` data-${escapeHtml(attrName)}="${escapeHtml(value)}"` : "";
        const classes = ["table-head-filter", buttonClassName, activeValue === value ? "is-active" : ""].filter(Boolean).join(" ");
        const ariaLabel = `${count} ${String(label || "").toLowerCase()}`;
        return `
          <button
            type="button"
            class="${classes}"
            aria-pressed="${activeValue === value ? "true" : "false"}"${dataAttribute}
          >
            <span class="table-head-filter__label">${escapeHtml(label)}</span>
            ${renderCountBadge(count, { className: "project-tabs__counter", ariaLabel })}
          </button>
        `;
      }).join("")}
    </div>
  `;
}
