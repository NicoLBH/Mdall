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

function renderProblemsProgressRingSvg(ratio, size) {
  const progress = Math.max(0, Math.min(100, Number.isFinite(ratio) ? ratio * 100 : 0));
  const progressOffset = 100 - progress;
  const shadeOffset = 100 - (progress / 2);

  return `
    <svg
      viewBox="0 0 100 100"
      width="${size}"
      height="${size}"
      class="subissues-problems-icon__svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <circle
        class="subissues-problems-icon__shade"
        cx="50"
        cy="50"
        r="20"
        fill="none"
        pathLength="100"
        stroke-dasharray="100"
        stroke-dashoffset="${shadeOffset}"
        stroke-width="40"
      ></circle>
      <circle
        class="subissues-problems-icon__track"
        cx="50"
        cy="50"
        r="42.5"
        fill="none"
        stroke-width="15"
      ></circle>
      <circle
        class="subissues-problems-icon__progress"
        cx="50"
        cy="50"
        r="42.5"
        fill="none"
        pathLength="100"
        stroke-dasharray="100"
        stroke-dashoffset="${progressOffset}"
        stroke-width="15"
        stroke-linecap="round"
      ></circle>
    </svg>
  `;
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
  const wrapperClassName = [
    "subissues-problems-icon",
    total <= 0 ? "subissues-problems-icon--empty" : "",
    ratio >= 1 ? "subissues-problems-icon--complete" : "",
    completeIcon ? "subissues-problems-icon--has-complete-icon" : "",
    className,
  ].filter(Boolean).join(" ");
  const computedAriaLabel = ariaLabel || (total > 0
    ? `Sujets fermés : ${closed}/${total}`
    : "Aucun sous-sujet");

  return `
    <span class="${wrapperClassName}" aria-label="${computedAriaLabel}">
      ${renderProblemsProgressRingSvg(ratio, size)}
    </span>
  `;
}
