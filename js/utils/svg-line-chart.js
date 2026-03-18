import { escapeHtml } from "./escape-html.js";

function clampNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function formatTickLabel(value, digits = 1) {
  if (!Number.isFinite(value)) return "";
  const rounded = Number(value.toFixed(digits));
  return String(rounded).replace(/\.0+$/, "").replace(".", ",");
}

function buildNiceTicks(maxValue, tickCount = 4) {
  const max = Math.max(0, clampNumber(maxValue, 0));
  if (max <= 0) return [0, 1, 2, 3, 4];

  const roughStep = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep || 1));
  const residual = roughStep / magnitude;
  let niceResidual = 1;
  if (residual > 1 && residual <= 2) niceResidual = 2;
  else if (residual > 2 && residual <= 5) niceResidual = 5;
  else if (residual > 5) niceResidual = 10;
  const step = niceResidual * magnitude;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = 0; value <= niceMax + 1e-9; value += step) {
    ticks.push(Number(value.toFixed(8)));
  }
  return ticks;
}

function getValidPoints(points = []) {
  return points.filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
}

function buildLinePath(points, xScale, yScale) {
  const valid = getValidPoints(points);
  if (!valid.length) return "";
  return valid.map((point, index) => {
    const x = xScale(point.x).toFixed(3);
    const y = yScale(point.y).toFixed(3);
    return `${index === 0 ? "M" : "L"}${x},${y}`;
  }).join("");
}

function buildAreaPath(points, xScale, yScale, baselineValue) {
  const valid = getValidPoints(points);
  if (!valid.length) return "";
  const firstX = xScale(valid[0].x).toFixed(3);
  const lastX = xScale(valid[valid.length - 1].x).toFixed(3);
  const baselineY = yScale(baselineValue).toFixed(3);
  const linePath = buildLinePath(valid, xScale, yScale);
  return `${linePath}L${lastX},${baselineY}L${firstX},${baselineY}Z`;
}

export function renderSvgLineChart({
  title = "",
  subtitle = "",
  ariaDescription = "",
  width = 394,
  height = 207,
  margin = { top: 28, right: 18, bottom: 40, left: 50 },
  xLabel = "",
  yLabel = "",
  xDomain = [0, 4],
  yDomain = [0, 1],
  xTicks = [],
  yTicks = [],
  xGrid = {},
  yGrid = {},
  series = []
} = {}) {
  const safeWidth = Math.max(320, clampNumber(width, 394));
  const safeHeight = Math.max(180, clampNumber(height, 207));
  const innerWidth = Math.max(80, safeWidth - margin.left - margin.right);
  const innerHeight = Math.max(60, safeHeight - margin.top - margin.bottom);
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const xScale = (value) => ((value - xMin) / xRange) * innerWidth;
  const yScale = (value) => innerHeight - ((value - yMin) / yRange) * innerHeight;
  const descriptionId = `chart-desc-${Math.random().toString(36).slice(2, 10)}`;
  const safeXGrid = {
    show: xGrid.show !== false,
    skipFirst: xGrid.skipFirst !== false,
    lineStyle: xGrid.lineStyle === "solid" ? "solid" : "dashed"
  };
  const safeYGrid = {
    show: yGrid.show !== false,
    skipFirst: yGrid.skipFirst !== false,
    lineStyle: yGrid.lineStyle === "solid" ? "solid" : "dashed"
  };

  return `
    <div class="svg-line-chart">
      <svg class="svg-line-chart__svg" width="${safeWidth}" height="${safeHeight}" role="img" aria-describedby="${descriptionId}">
        <desc id="${descriptionId}">${escapeHtml(ariaDescription || subtitle || title)}</desc>
        <g transform="translate(${margin.left},${margin.top})">
          ${safeYGrid.show ? `
            <g class="svg-line-chart__grid svg-line-chart__grid--y svg-line-chart__grid--${safeYGrid.lineStyle}">
              ${yTicks.filter((_, index) => !(safeYGrid.skipFirst && index === 0)).map((tick) => {
                const y = yScale(tick);
                return `<g class="svg-line-chart__tick" transform="translate(0,${y.toFixed(3)})"><line x2="${innerWidth}" y2="0"></line></g>`;
              }).join("")}
            </g>
          ` : ""}
          ${safeXGrid.show ? `
            <g class="svg-line-chart__grid svg-line-chart__grid--x svg-line-chart__grid--${safeXGrid.lineStyle}" transform="translate(0,${innerHeight})">
              ${xTicks.filter((_, index) => !(safeXGrid.skipFirst && index === 0)).map((tick) => {
                const x = xScale(tick);
                return `<g class="svg-line-chart__tick" transform="translate(${x.toFixed(3)},0)"><line y2="-${innerHeight}"></line></g>`;
              }).join("")}
            </g>
          ` : ""}
          <g class="svg-line-chart__axis svg-line-chart__axis--x" transform="translate(0,${innerHeight})">
            <path d="M0.5,0.5H${(innerWidth + 0.5).toFixed(1)}"></path>
            ${xTicks.map((tick) => {
              const x = xScale(tick);
              return `<g class="svg-line-chart__axis-tick" transform="translate(${x.toFixed(3)},0)"><text y="16">${escapeHtml(formatTickLabel(tick, 1))}</text></g>`;
            }).join("")}
          </g>
          <g class="svg-line-chart__axis svg-line-chart__axis--y">
            <path d="M0.5,${(innerHeight + 0.5).toFixed(1)}V0.5"></path>
            ${yTicks.map((tick) => {
              const y = yScale(tick);
              return `<g class="svg-line-chart__axis-tick" transform="translate(0,${y.toFixed(3)})"><text x="-8" dy="0.32em">${escapeHtml(formatTickLabel(tick, 2))}</text></g>`;
            }).join("")}
          </g>
          ${series.map((item, index) => {
            const className = `svg-line-chart__series svg-line-chart__series--${index + 1}`;
            const linePath = buildLinePath(item?.points || [], xScale, yScale);
            const areaPath = buildAreaPath(item?.points || [], xScale, yScale, yMin);
            const showStroke = item?.stroke !== false;
            const showFill = item?.fill === true;
            const showPoints = item?.pointsVisible === true;
            const validPoints = getValidPoints(item?.points || []);
            return `
              <g class="${className}">
                ${showFill && areaPath ? `<path class="svg-line-chart__area" d="${areaPath}"></path>` : ""}
                ${showStroke && linePath ? `<path class="svg-line-chart__line" d="${linePath}"></path>` : ""}
                ${showPoints ? validPoints.map((point) => `<circle class="svg-line-chart__point" cx="${xScale(point.x).toFixed(3)}" cy="${yScale(point.y).toFixed(3)}" r="3.5"></circle>`).join("") : ""}
              </g>
            `;
          }).join("")}
          ${xLabel ? `<text class="svg-line-chart__axis-label" text-anchor="middle" x="${(innerWidth / 2).toFixed(3)}" y="${(innerHeight + 32).toFixed(3)}">${escapeHtml(xLabel)}</text>` : ""}
          ${yLabel ? `<text class="svg-line-chart__axis-label" transform="rotate(-90)" x="${(-innerHeight / 2).toFixed(3)}" y="-40" text-anchor="middle">${escapeHtml(yLabel)}</text>` : ""}
        </g>
      </svg>
      ${(title || subtitle || series.some((item) => item?.label)) ? `
        <div class="svg-line-chart__meta">
          ${title ? `<div class="svg-line-chart__title">${escapeHtml(title)}</div>` : ""}
          ${subtitle ? `<div class="svg-line-chart__subtitle">${escapeHtml(subtitle)}</div>` : ""}
          ${series.some((item) => item?.label) ? `
            <div class="svg-line-chart__legend">
              ${series.map((item, index) => item?.label ? `<div class="svg-line-chart__legend-item"><span class="svg-line-chart__legend-swatch svg-line-chart__legend-swatch--${index + 1}"></span><span>${escapeHtml(item.label)}</span></div>` : "").join("")}
            </div>
          ` : ""}
        </div>
      ` : ""}
    </div>
  `;
}

export function getNiceChartTicks(maxValue, tickCount = 4) {
  return buildNiceTicks(maxValue, tickCount);
}
