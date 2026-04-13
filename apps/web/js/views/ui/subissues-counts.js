function normalizeProblemsCounts(closedCount, totalCount) {
  const total = Math.max(0, Number(totalCount) || 0);
  const closed = Math.max(0, Math.min(total, Number(closedCount) || 0));
  return { closed, total, ratio: total ? (closed / total) : 0 };
}

function resolveProblemsCountsOptions(options = {}) {
  const size = Math.max(0, Number(options.size) || 16);
  const className = String(options.className || "").trim();
  const completeIcon = String(options.completeIcon || options.svgIssueClosed || "");
  const ariaLabel = typeof options.ariaLabel === "string" && options.ariaLabel.trim()
    ? options.ariaLabel.trim()
    : "";
  return { size, className, completeIcon, ariaLabel };
}

/**
 * Renders the shared subissues progress icon.
 *
 * API invariants for phase 2:
 * - closedCount and totalCount are already computed by the caller.
 * - this component only normalizes, clamps and renders.
 * - completeIcon is optional and only affects the fully-complete state.
 * - svgIssueClosed is preserved as a compatibility alias until call sites are fully harmonized.
 */
export function renderProblemsCountsIconHtml(closedCount, totalCount, options = {}) {
  const { closed, total, ratio } = normalizeProblemsCounts(closedCount, totalCount);
  const { size, className, completeIcon, ariaLabel } = resolveProblemsCountsOptions(options);
  const wrapperClassName = ["subissues-problems-icon", className].filter(Boolean).join(" ");
  const computedAriaLabel = ariaLabel || (total > 0
    ? `Sujets fermés : ${closed}/${total}`
    : "Aucun sous-sujet");

  if (total > 0 && closed === total && completeIcon) {
    return `<span class="${wrapperClassName}" aria-label="${computedAriaLabel}">${completeIcon}</span>`;
  }

  const r = 8;
  const cx = 10;
  const cy = 10;
  const a = ratio * Math.PI * 2;

  let wedge = "";
  if (ratio > 0) {
    const x = cx + r * Math.sin(a);
    const y = cy - r * Math.cos(a);
    const large = a > Math.PI ? 1 : 0;
    wedge = `<path d="M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z" fill="rgba(137,87,229,.55)" opacity="0.75"></path>`;
  }

  return `
    <span class="${wrapperClassName}" aria-label="${computedAriaLabel}">
      <svg viewBox="0 0 20 20" width="${size}" height="${size}" class="subissues-problems-icon__svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(139,148,158,.55)" stroke-width="2"></circle>
        ${wedge}
      </svg>
    </span>
  `;
}
