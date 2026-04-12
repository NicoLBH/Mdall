export function renderProblemsCountsIconHtml(closedCount, totalCount, options = {}) {
  const total = Math.max(0, Number(totalCount) || 0);
  const closed = Math.max(0, Math.min(total, Number(closedCount) || 0));
  const svgIssueClosed = String(options.svgIssueClosed || "");

  if (total > 0 && closed === total && svgIssueClosed) {
    return `<span class="subissues-problems-icon" aria-label="Tous les sujets sont fermés">${svgIssueClosed}</span>`;
  }

  const ratio = total ? (closed / total) : 0;
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
    <span class="subissues-problems-icon" aria-label="Sujets fermés : ${closed}/${total}">
      <svg viewBox="0 0 20 20" width="16" height="16" class="subissues-problems-icon__svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(139,148,158,.55)" stroke-width="2"></circle>
        ${wedge}
      </svg>
    </span>
  `;
}
