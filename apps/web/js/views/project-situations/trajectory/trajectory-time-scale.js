const ZOOM_UNIT_MS = {
  hour: 60 * 60 * 1000,
  "half-day": 12 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000
};

const DEFAULT_PX_PER_UNIT = {
  hour: 48,
  "half-day": 56,
  day: 72,
  week: 120,
  month: 220
};

function normalizeZoom(zoom = "day") {
  const value = String(zoom || "day").trim().toLowerCase();
  return ZOOM_UNIT_MS[value] ? value : "day";
}

function parseDateLike(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, yyyy, mm, dd] = dateOnlyMatch;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
  }
  return new Date(value);
}

function toTimestamp(value, { fallback = null } = {}) {
  const date = parseDateLike(value);
  const ts = date.getTime();
  if (Number.isFinite(ts)) return ts;
  if (fallback === null) return Date.now();
  return toTimestamp(fallback);
}

function alignTimestampToUnitStart(timestamp, zoom) {
  const date = new Date(timestamp);
  if (zoom === "month") {
    return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  }
  if (zoom === "week") {
    const aligned = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = aligned.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    aligned.setDate(aligned.getDate() + diff);
    return aligned.getTime();
  }
  if (zoom === "day") {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }
  if (zoom === "half-day") {
    const hour = date.getHours() >= 12 ? 12 : 0;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).getTime();
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
}

function formatTickLabel(timestamp, zoom) {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  if (zoom === "hour") return `${dd}/${mm} ${hh}:00`;
  if (zoom === "half-day") return `${dd}/${mm} ${Number(hh) < 12 ? "AM" : "PM"}`;
  if (zoom === "day") return `${dd}/${mm}`;
  if (zoom === "week") return `Semaine ${Math.max(1, Math.ceil(Number(dd) / 7))} · ${mm}/${yyyy}`;
  return `${mm}/${yyyy}`;
}

export function createTrajectoryTimeScale({
  startDate,
  endDate,
  zoom = "day",
  pxPerUnit
} = {}) {
  const normalizedZoom = normalizeZoom(zoom);
  const unitMs = ZOOM_UNIT_MS[normalizedZoom];
  const pxPerUnitValue = Math.max(1, Number(pxPerUnit) || DEFAULT_PX_PER_UNIT[normalizedZoom]);

  const rawStartTs = toTimestamp(startDate);
  const startTs = alignTimestampToUnitStart(rawStartTs, normalizedZoom);
  const rawEndTs = toTimestamp(endDate, { fallback: startTs + unitMs });
  const endTs = Math.max(startTs + 1, rawEndTs);
  const durationMs = Math.max(1, endTs - startTs);

  const pxPerMs = pxPerUnitValue / unitMs;
  const totalWidth = Math.max(1, Math.ceil(durationMs * pxPerMs));

  function timeToX(date) {
    const ts = toTimestamp(date, { fallback: startTs });
    return Math.round((ts - startTs) * pxPerMs);
  }

  function xToTime(x) {
    const offsetPx = Number(x) || 0;
    const ts = startTs + Math.round(offsetPx / pxPerMs);
    return new Date(ts);
  }

  function getVisibleTimeRange({ scrollLeft = 0, viewportWidth = 0, overscanPx = 0 } = {}) {
    const safeScrollLeft = Math.max(0, Number(scrollLeft) || 0);
    const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
    const safeOverscanPx = Math.max(0, Number(overscanPx) || 0);

    const visibleStartX = Math.max(0, safeScrollLeft - safeOverscanPx);
    const visibleEndX = Math.min(totalWidth, safeScrollLeft + safeViewportWidth + safeOverscanPx);

    return {
      start: xToTime(visibleStartX),
      end: xToTime(visibleEndX),
      startX: visibleStartX,
      endX: visibleEndX
    };
  }

  function buildTicks({ scrollLeft = 0, viewportWidth = 0, overscanPx = 0 } = {}) {
    const range = getVisibleTimeRange({ scrollLeft, viewportWidth, overscanPx });
    const rangeStartTs = Math.max(startTs, range.start.getTime());
    const rangeEndTs = Math.min(endTs, range.end.getTime());
    const firstTickTs = Math.floor((rangeStartTs - startTs) / unitMs) * unitMs + startTs;

    const ticks = [];
    for (let ts = firstTickTs; ts <= rangeEndTs + unitMs; ts += unitMs) {
      if (ts < startTs || ts > endTs) continue;
      ticks.push({
        timestamp: ts,
        date: new Date(ts),
        x: timeToX(ts),
        label: formatTickLabel(ts, normalizedZoom)
      });
    }

    return ticks;
  }


  return {
    startDate: new Date(startTs),
    endDate: new Date(endTs),
    zoom: normalizedZoom,
    unitMs,
    pxPerUnit: pxPerUnitValue,
    pxPerMs,
    totalWidth,
    timeToX,
    xToTime,
    getVisibleTimeRange,
    buildTicks
  };
}
