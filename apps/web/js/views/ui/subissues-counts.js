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
      <path
        class="subissues-problems-icon__completed-check"
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M10.0206 11.1074C9.68518 11.3949 9.18014 11.3561 8.8926 11.0206L5.8926 7.52061C5.62055 7.20322 5.63873 6.72989 5.93432 6.4343L7.43432 4.9343C7.74674 4.62188 8.25327 4.62188 8.56569 4.9343C8.87811 5.24672 8.87811 5.75325 8.56569 6.06567L7.58953 7.04182L10.1074 9.97935C10.3949 10.3148 10.3561 10.8198 10.0206 11.1074Z"
      ></path>
      <circle
        class="subissues-problems-icon__completed-ring"
        cx="8"
        cy="8"
        r="6"
        fill="transparent"
        stroke-width="2"
      ></circle>
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
