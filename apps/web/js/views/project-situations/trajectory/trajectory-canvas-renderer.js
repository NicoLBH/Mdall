import { getTrajectoryVisibleWindow } from "./trajectory-virtualizer.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toTimestamp(value, fallback = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  const ts = date.getTime();
  return Number.isFinite(ts) ? ts : fallback;
}

function intersectsRange(startTs, endTs, visibleStartTs, visibleEndTs) {
  return endTs >= visibleStartTs && startTs <= visibleEndTs;
}

function normalizeOverscan(overscan) {
  if (typeof overscan === "number") {
    return { rows: Math.max(0, Math.floor(overscan)), px: 160 };
  }
  return {
    rows: Math.max(0, Math.floor(Number(overscan?.rows) || 4)),
    px: Math.max(0, Number(overscan?.px) || 160)
  };
}

function getVisibleRowWindow({ rowCount, rowHeight, scrollTop, viewportHeight, overscanRows }) {
  const { rowStart, rowEnd } = getTrajectoryVisibleWindow({
    rowCount,
    rowHeight,
    scrollTop,
    viewportHeight,
    overscanRows,
    scrollLeft: 0,
    viewportWidth: 0,
    totalWidth: 0,
    overscanPx: 0
  });
  return { rowStart, rowEnd };
}

function setupCanvas(canvas, viewportWidth, viewportHeight) {
  const width = Math.max(1, Math.floor(Number(viewportWidth) || 0));
  const height = Math.max(1, Math.floor(Number(viewportHeight) || 0));
  const dpr = Math.max(1, Number(globalThis.devicePixelRatio) || 1);

  const displayWidth = Math.max(1, Math.round(width * dpr));
  const displayHeight = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== displayWidth) canvas.width = displayWidth;
  if (canvas.height !== displayHeight) canvas.height = displayHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  return { ctx, width, height, dpr };
}

function drawVerticalLine(ctx, { x, height, color = "#cf222e", alpha = 1, dashed = false }) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  if (dashed) ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x + 0.5, 0);
  ctx.lineTo(x + 0.5, height);
  ctx.stroke();
  ctx.restore();
}

function drawSegment(ctx, { x1, x2, y, lineColor, lineStyle }) {
  if (x2 <= x1) return;
  ctx.save();
  ctx.strokeStyle = lineColor === "red"
    ? "#cf222e"
    : lineColor === "green"
      ? "#1a7f37"
      : "#8c959f";
  ctx.lineWidth = 2;
  if (lineStyle === "dashed") ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function drawStatusIcon(ctx, { x, y, icon = "open" }) {
  ctx.save();
  if (icon === "open") {
    ctx.fillStyle = "#1a7f37";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === "rejected") {
    ctx.strokeStyle = "#cf222e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 4);
    ctx.lineTo(x + 4, y + 4);
    ctx.moveTo(x + 4, y - 4);
    ctx.lineTo(x - 4, y + 4);
    ctx.stroke();
  } else if (icon === "reopen") {
    ctx.strokeStyle = "#1a7f37";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4, Math.PI * 0.15, Math.PI * 1.75);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#8c959f";
    ctx.beginPath();
    ctx.rect(x - 4, y - 4, 8, 8);
    ctx.fill();
  }
  ctx.restore();
}

function drawObjectiveMarker(ctx, { x, y, markerType, markerColor }) {
  ctx.save();
  const color = markerColor === "green" ? "#1a7f37" : "#cf222e";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (markerType === "check") {
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x - 1, y + 4);
    ctx.lineTo(x + 5, y - 4);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 4);
    ctx.lineTo(x + 4, y + 4);
    ctx.moveTo(x + 4, y - 4);
    ctx.lineTo(x - 4, y + 4);
    ctx.stroke();
  }
  ctx.restore();
}

function resolveTodayTimestamp(timeScale) {
  const startTs = toTimestamp(timeScale?.startDate, Date.now());
  const endTs = toTimestamp(timeScale?.endDate, startTs + 1);
  return clamp(Date.now(), startTs, endTs);
}

function collectObjectiveVerticalTimestamps(rows = []) {
  const values = new Set();
  for (const row of rows) {
    for (const marker of asArray(row?.objectiveMarkers)) {
      values.add(toTimestamp(marker?.at));
    }
  }
  return [...values].sort((a, b) => a - b);
}

function resolvePointIcon(point = {}, previousPoint = null) {
  const explicit = String(point?.icon || "").trim();
  if (explicit) return explicit;
  const source = String(point?.source || "").trim().toLowerCase();
  if (source === "subject_reopened") return "reopen";
  if (source === "subject_closed") return "close";
  const status = String(point?.status || "").trim().toLowerCase();
  if (["closed_invalid", "invalid", "rejected"].includes(status)) return "rejected";
  if (["closed", "closed_duplicate", "duplicate"].includes(status)) return "close";
  if (previousPoint && String(previousPoint?.status || "").trim().toLowerCase() !== "open") return "reopen";
  return "open";
}

export function renderTrajectoryCanvas({
  canvas,
  rows = [],
  timeScale,
  scrollLeft = 0,
  scrollTop = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  rowHeight = 32,
  overscan = { rows: 4, px: 160 }
} = {}) {
  if (!canvas || typeof canvas.getContext !== "function" || !timeScale || typeof timeScale.timeToX !== "function") {
    return {
      visibleRows: 0,
      visibleStart: null,
      visibleEnd: null
    };
  }

  const overscanConfig = normalizeOverscan(overscan);
  const { ctx, width, height } = setupCanvas(canvas, viewportWidth, viewportHeight);

  const safeRows = asArray(rows);
  const rowCount = safeRows.length;
  const visibleWindow = getTrajectoryVisibleWindow({
    rowCount,
    rowHeight,
    scrollTop,
    scrollLeft,
    viewportWidth: width,
    viewportHeight: height,
    totalWidth: timeScale.totalWidth,
    overscanRows: overscanConfig.rows,
    overscanPx: overscanConfig.px
  });

  const { rowStart, rowEnd, timeScrollLeft, timeViewportWidth } = visibleWindow;

  const visibleTimeRange = timeScale.getVisibleTimeRange({
    scrollLeft: timeScrollLeft,
    viewportWidth: timeViewportWidth,
    overscanPx: 0
  });

  const visibleStartTs = toTimestamp(visibleTimeRange.start);
  const visibleEndTs = toTimestamp(visibleTimeRange.end);

  const todayTs = resolveTodayTimestamp(timeScale);
  if (todayTs >= visibleStartTs && todayTs <= visibleEndTs) {
    const x = timeScale.timeToX(todayTs) - scrollLeft;
    drawVerticalLine(ctx, { x, height, color: "#cf222e", alpha: 1 });
  }

  const objectiveTimestamps = collectObjectiveVerticalTimestamps(safeRows);
  for (const ts of objectiveTimestamps) {
    if (ts < visibleStartTs || ts > visibleEndTs) continue;
    const x = timeScale.timeToX(ts) - scrollLeft;
    drawVerticalLine(ctx, { x, height, color: "#cf222e", alpha: 0.5, dashed: true });
  }

  const safeRowHeight = Math.max(1, Number(rowHeight) || 32);
  for (let index = rowStart; index <= rowEnd; index += 1) {
    const row = safeRows[index];
    if (!row) continue;
    const y = (index * safeRowHeight) - scrollTop + (safeRowHeight / 2);
    if (y < -safeRowHeight || y > height + safeRowHeight) continue;

    for (const segment of asArray(row.lifecycleSegments)) {
      const startTs = toTimestamp(segment.startAt);
      const endTs = toTimestamp(segment.endAt);
      if (!intersectsRange(startTs, endTs, visibleStartTs, visibleEndTs)) continue;

      const segmentX1 = timeScale.timeToX(startTs) - scrollLeft;
      const segmentX2 = timeScale.timeToX(endTs) - scrollLeft;
      drawSegment(ctx, {
        x1: segmentX1,
        x2: segmentX2,
        y,
        lineColor: segment.lineColor,
        lineStyle: segment.lineStyle
      });
    }

    const statusPoints = asArray(row.statusPoints);
    for (let pointIndex = 0; pointIndex < statusPoints.length; pointIndex += 1) {
      const point = statusPoints[pointIndex];
      const ts = toTimestamp(point.at);
      if (ts < visibleStartTs || ts > visibleEndTs) continue;
      const x = timeScale.timeToX(ts) - scrollLeft;
      drawStatusIcon(ctx, {
        x,
        y,
        icon: resolvePointIcon(point, statusPoints[pointIndex - 1] || null)
      });
    }

    for (const marker of asArray(row.objectiveMarkers)) {
      const ts = toTimestamp(marker.at);
      if (ts < visibleStartTs || ts > visibleEndTs) continue;
      const x = timeScale.timeToX(ts) - scrollLeft;
      drawObjectiveMarker(ctx, {
        x,
        y,
        markerType: marker.markerType,
        markerColor: marker.markerColor
      });
    }
  }

  const visibleRows = rowCount ? (rowEnd - rowStart + 1) : 0;
  const visibleStart = new Date(visibleStartTs).toISOString();
  const visibleEnd = new Date(visibleEndTs).toISOString();

  console.info("[trajectory] canvas.render", { visibleRows, visibleStart, visibleEnd });

  return {
    visibleRows,
    visibleStart,
    visibleEnd,
    rowStart,
    rowEnd
  };
}

export function __trajectoryCanvasRendererTestUtils() {
  return {
    normalizeOverscan,
    getVisibleRowWindow,
    collectObjectiveVerticalTimestamps,
    resolvePointIcon,
    intersectsRange
  };
}
