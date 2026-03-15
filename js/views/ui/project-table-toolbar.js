import { renderGhInput } from "./gh-input.js";
import { renderGhSelectMenu } from "./gh-split-button.js";
import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";

export function renderProjectTableToolbar({
  className = "",
  leftHtml = "",
  rightHtml = ""
} = {}) {
  return `
    <div class="project-table-toolbar ${className}">
      <div class="project-table-toolbar__left">
        ${leftHtml}
      </div>
      <div class="project-table-toolbar__right">
        ${rightHtml}
      </div>
    </div>
  `;
}

export function renderProjectTableToolbarGroup({
  className = "",
  html = ""
} = {}) {
  return `
    <div class="project-table-toolbar__group ${className}">
      ${html}
    </div>
  `;
}

export function renderProjectTableToolbarSearch({
  id,
  value = "",
  placeholder = "Rechercher…",
  className = "",
  inputClassName = "gh-input--sm gh-input--search"
} = {}) {
  return `
    <div class="project-table-toolbar__search ${className}">
      ${renderGhInput({
        id,
        value,
        placeholder,
        inputClassName,
        outerIcon: svgIcon("search", { className: "octicon octicon-search" }),
        className: "project-table-toolbar__search-field"
      })}
    </div>
  `;
}

export function renderProjectTableToolbarSelect({
  id,
  value = "",
  options = [],
  tone = "default",
  size = "sm",
  className = "",
  fieldClassName = ""
} = {}) {
  return `
    <div class="project-table-toolbar__control ${className}">
      ${renderGhSelectMenu({
        id,
        value,
        options,
        tone,
        size,
        fieldClassName: `gh-select-field--inline ${fieldClassName}`.trim()
      })}
    </div>
  `;
}

export function renderProjectTableToolbarMeta({
  id = "",
  text = "",
  className = ""
} = {}) {
  return `
    <div
      class="project-table-toolbar__meta ${className}"
      ${id ? `id="${escapeHtml(id)}"` : ""}
    >
      ${text}
    </div>
  `;
}
