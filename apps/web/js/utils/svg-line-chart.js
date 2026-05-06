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

function buildLinePath(points, xScale, yScale, curve = "linear") {
  const valid = getValidPoints(points);
  if (!valid.length) return "";
  if (curve === "smooth" && valid.length > 2) {
    const coords = valid.map((point) => ({
      x: xScale(point.x),
      y: yScale(point.y)
    }));
    let path = `M${coords[0].x.toFixed(3)},${coords[0].y.toFixed(3)}`;
    for (let index = 1; index < coords.length - 1; index += 1) {
      const current = coords[index];
      const next = coords[index + 1];
      const midX = ((current.x + next.x) / 2).toFixed(3);
      const midY = ((current.y + next.y) / 2).toFixed(3);
      path += `Q${current.x.toFixed(3)},${current.y.toFixed(3)} ${midX},${midY}`;
    }
    const penultimate = coords[coords.length - 2];
    const last = coords[coords.length - 1];
    path += `Q${penultimate.x.toFixed(3)},${penultimate.y.toFixed(3)} ${last.x.toFixed(3)},${last.y.toFixed(3)}`;
    return path;
  }
  return valid.map((point, index) => {
    const x = xScale(point.x).toFixed(3);
    const y = yScale(point.y).toFixed(3);
    return `${index === 0 ? "M" : "L"}${x},${y}`;
  }).join("");
}

function buildAreaPath(points, xScale, yScale, baselineValue, curve = "linear") {
  const valid = getValidPoints(points);
  if (!valid.length) return "";
  const baselinePoints = Array.isArray(baselineValue)
    ? getValidPoints(baselineValue)
    : [];
  if (baselinePoints.length) {
    const baselineByX = new Map(baselinePoints.map((point) => [point.x, point.y]));
    const linePath = buildLinePath(valid, xScale, yScale, curve);
    const baselinePath = [...valid]
      .reverse()
      .map((point, index) => {
        const baselineY = yScale(clampNumber(baselineByX.get(point.x), 0)).toFixed(3);
        const x = xScale(point.x).toFixed(3);
        return `${index === 0 ? "L" : "L"}${x},${baselineY}`;
      })
      .join("");
    return `${linePath}${baselinePath}Z`;
  }
  const firstX = xScale(valid[0].x).toFixed(3);
  const lastX = xScale(valid[valid.length - 1].x).toFixed(3);
  const baselineY = yScale(baselineValue).toFixed(3);
  const linePath = buildLinePath(valid, xScale, yScale, curve);
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
  interactive = false,
  xTickFormatter = null,
  yTickFormatter = null,
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
  const chartId = `chart-${Math.random().toString(36).slice(2, 10)}`;
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

  const chartModel = interactive ? encodeURIComponent(JSON.stringify({
    width: safeWidth,
    height: safeHeight,
    margin,
    xDomain: [xMin, xMax],
    yDomain: [yMin, yMax],
    series: series.map((item) => ({
      label: item?.label || "",
      points: getValidPoints(item?.points || [])
    }))
  })) : "";

  return `
    <div class="svg-line-chart${interactive ? " svg-line-chart--interactive" : ""}"${interactive ? ` data-chart-model="${chartModel}" data-chart-id="${chartId}"` : ""}>
      <div class="svg-line-chart__frame">
      <svg class="svg-line-chart__svg" viewBox="0 0 ${safeWidth} ${safeHeight}" preserveAspectRatio="xMidYMid meet" role="img" aria-describedby="${descriptionId}"${interactive ? ` data-chart-svg="${chartId}"` : ""}>
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
              const label = typeof xTickFormatter === "function" ? xTickFormatter(tick) : formatTickLabel(tick, 1);
              return `<g class="svg-line-chart__axis-tick" transform="translate(${x.toFixed(3)},0)"><text y="16">${escapeHtml(label)}</text></g>`;
            }).join("")}
          </g>
          <g class="svg-line-chart__axis svg-line-chart__axis--y">
            <path d="M0.5,${(innerHeight + 0.5).toFixed(1)}V0.5"></path>
            ${yTicks.map((tick) => {
              const y = yScale(tick);
              const label = typeof yTickFormatter === "function" ? yTickFormatter(tick) : formatTickLabel(tick, 2);
              return `<g class="svg-line-chart__axis-tick" transform="translate(0,${y.toFixed(3)})"><text x="-8" dy="0.32em">${escapeHtml(label)}</text></g>`;
            }).join("")}
          </g>
          ${series.map((item, index) => {
            const className = `svg-line-chart__series svg-line-chart__series--${index + 1}`;
            const curve = item?.curve === "smooth" ? "smooth" : "linear";
            const linePath = buildLinePath(item?.points || [], xScale, yScale, curve);
            const areaPath = buildAreaPath(item?.points || [], xScale, yScale, item?.areaBaselinePoints || yMin, curve);
            const showStroke = item?.stroke !== false;
            const showFill = item?.fill === true;
            const showPoints = item?.pointsVisible === true;
            const validPoints = getValidPoints(item?.points || []);
            const seriesColor = typeof item?.color === "string" ? item.color : "";
            const lineDasharray = typeof item?.lineDasharray === "string" ? item.lineDasharray : "";
            const lineWidth = Number.isFinite(Number(item?.lineWidth)) ? Math.max(1, Number(item.lineWidth)) : null;
            const areaColor = typeof item?.areaColor === "string" ? item.areaColor : "";
            const areaOpacity = Number.isFinite(Number(item?.areaOpacity)) ? Math.max(0, Math.min(1, Number(item.areaOpacity))) : null;
            return `
              <g class="${className}"${seriesColor ? ` style="color:${escapeHtml(seriesColor)};"` : ""}>
                ${showFill && areaPath ? `<path class="svg-line-chart__area" d="${areaPath}"${areaColor || areaOpacity !== null ? ` style="${areaColor ? `fill:${escapeHtml(areaColor)};` : ""}${areaOpacity !== null ? `opacity:${areaOpacity};` : ""}"` : ""}></path>` : ""}
                ${showStroke && linePath ? `<path class="svg-line-chart__line" d="${linePath}"${lineDasharray || lineWidth ? ` style="${lineDasharray ? `stroke-dasharray:${escapeHtml(lineDasharray)};` : ""}${lineWidth ? `stroke-width:${lineWidth};` : ""}"` : ""}></path>` : ""}
                ${showPoints ? validPoints.map((point) => `<circle class="svg-line-chart__point" cx="${xScale(point.x).toFixed(3)}" cy="${yScale(point.y).toFixed(3)}" r="3.5"></circle>`).join("") : ""}
              </g>
            `;
          }).join("")}
          ${xLabel ? `<text class="svg-line-chart__axis-label" text-anchor="middle" x="${(innerWidth / 2).toFixed(3)}" y="${(innerHeight + 32).toFixed(3)}">${escapeHtml(xLabel)}</text>` : ""}
          ${yLabel ? `<text class="svg-line-chart__axis-label" transform="rotate(-90)" x="${(-innerHeight / 2).toFixed(3)}" y="-40" text-anchor="middle">${escapeHtml(yLabel)}</text>` : ""}
          ${interactive ? `<g class="svg-line-chart__hover" data-chart-hover="${chartId}" hidden><circle class="svg-line-chart__hover-point" r="4.5" cx="0" cy="0"></circle></g>` : ""}
        </g>
      </svg>
      ${interactive ? `<div class="svg-line-chart__tooltip" data-chart-tooltip="${chartId}" hidden></div>` : ""}
      </div>
      ${(title || subtitle || series.some((item) => item?.label)) ? `
        <div class="svg-line-chart__meta">
          ${title ? `<div class="svg-line-chart__title">${escapeHtml(title)}</div>` : ""}
          ${subtitle ? `<div class="svg-line-chart__subtitle">${escapeHtml(subtitle)}</div>` : ""}
          ${series.some((item) => item?.label) ? `
            <div class="svg-line-chart__legend">
              ${series.map((item, index) => {
                if (!item?.label) return "";
                const markerClass = item?.legendMarker === "circle" ? "svg-line-chart__legend-swatch--circle" : "";
                const markerStyle = item?.color ? ` style="color:${escapeHtml(String(item.color))};"` : "";
                return `<div class="svg-line-chart__legend-item"><span class="svg-line-chart__legend-swatch svg-line-chart__legend-swatch--${index + 1} ${markerClass}"${markerStyle}></span><span>${escapeHtml(item.label)}</span></div>`;
              }).join("")}
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
