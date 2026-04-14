function normalizeProblemsCounts(closedCount, totalCount) {
  const rawTotal = Number(totalCount);
  const rawClosed = Number(closedCount);
  const total = Number.isFinite(rawTotal) ? Math.max(0, rawTotal) : 0;
  const closed = Number.isFinite(rawClosed) ? Math.max(0, Math.min(total, rawClosed)) : 0;
  return { closed, total, ratio: total > 0 ? (closed / total) : 0 };
}

function resolveProblemsCountsOptions(options = {}) {
  const size = Math.max(0, Number(options.size) || 16);
  const className = String(options.className || "").trim();
  const ariaLabel = typeof options.ariaLabel === "string" && options.ariaLabel.trim()
    ? options.ariaLabel.trim()
    : "";
  return { size, className, ariaLabel };
}

const ICON_SPRITE_URL = "assets/icons.svg";

function renderCompletedProblemsRingSvg(size) {
  return `
    <svg
      viewBox="0 0 16 16"
      width="${size}"
      height="${size}"
      class="subissues-problems-icon__svg subissues-problems-icon__svg--complete"
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <use href="${ICON_SPRITE_URL}#subissues-problems-completed" xlink:href="${ICON_SPRITE_URL}#subissues-problems-completed"></use>
    </svg>
  `;
}

function renderProblemsProgressRingSvg(ratio, size) {
  if (ratio >= 1) {
    return renderCompletedProblemsRingSvg(size);
  }

  const progress = Math.max(0, Math.min(100, Number.isFinite(ratio) ? ratio * 100 : 0));
  const dasharray = `${progress} 100`;

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
        stroke-dasharray="${dasharray}"
        stroke-dashoffset="0"
        stroke-width="40"
        transform="rotate(-90 50 50)"
      ></circle>
      <circle
        class="subissues-problems-icon__track"
        cx="50"
        cy="50"
        r="42.5"
        fill="none"
        pathLength="100"
        stroke-dasharray="100 100"
        stroke-dashoffset="0"
        stroke-width="15"
      ></circle>
      <circle
        class="subissues-problems-icon__progress"
        cx="50"
        cy="50"
        r="42.5"
        fill="none"
        pathLength="100"
        stroke-dasharray="${dasharray}"
        stroke-dashoffset="0"
        stroke-width="15"
        stroke-linecap="round"
        transform="rotate(-90 50 50)"
      ></circle>
    </svg>
  `;
}

/**
 * Renders the shared subissues progress icon.
 *
 * API invariants:
 * - closedCount and totalCount are already computed by the caller.
 * - this component only normalizes, clamps and renders.
 * - all call sites share the same ring-based rendering contract.
 */
export function renderProblemsCountsIconHtml(closedCount, totalCount, options = {}) {
  const { closed, total, ratio } = normalizeProblemsCounts(closedCount, totalCount);
  const { size, className, ariaLabel } = resolveProblemsCountsOptions(options);
  const wrapperClassName = [
    "subissues-problems-icon",
    total <= 0 ? "subissues-problems-icon--empty" : "",
    ratio <= 0 ? "subissues-problems-icon--zero" : "",
    ratio >= 1 ? "subissues-problems-icon--complete" : "",
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
