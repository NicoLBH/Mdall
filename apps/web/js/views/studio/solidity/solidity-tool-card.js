import { escapeHtml } from "../../../utils/escape-html.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";

export function renderSolidityToolCard({
  toolKey,
  title,
  subtitle,
  statusText,
  detailsHtml,
  isLoading,
  hasResult
}) {
  const actionLabel = isLoading ? "Calcul en cours..." : hasResult ? "Recalculer" : "Calculer";

  return `
    <section class="arkolia-identity-preview arkolia-assise-card" data-solidity-tool-card="${escapeHtml(toolKey)}">
      <header class="arkolia-identity-preview__header">
        <div>
          <h3 class="arkolia-identity-preview__title">${escapeHtml(title)}</h3>
          <p class="arkolia-identity-preview__meta">${escapeHtml(subtitle || "")}</p>
        </div>
      </header>
      <div class="arkolia-identity-preview__body">
        <p class="arkolia-identity-preview__meta">${escapeHtml(statusText || "")}</p>
        <div class="arkolia-identity-preview__coordinates">${detailsHtml || ""}</div>
      </div>
      <footer class="arkolia-identity-preview__footer" style="display:flex;gap:8px;">
        ${renderGhActionButton({
          id: `solidityToolCalculate-${toolKey}`,
          label: actionLabel,
          tone: "primary",
          size: "md",
          disabled: !!isLoading,
          mainAction: ""
        })}
        ${renderGhActionButton({
          id: `solidityToolToSubject-${toolKey}`,
          label: "Transformer en sujet",
          tone: "default",
          size: "md",
          disabled: !hasResult,
          mainAction: ""
        })}
      </footer>
    </section>
  `;
}
