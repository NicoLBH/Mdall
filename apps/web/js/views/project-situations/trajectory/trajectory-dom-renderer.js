import { getTrajectoryVisibleWindow } from "./trajectory-virtualizer.js";
import { svgIcon } from "../../../ui/icons.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const HIERARCHY_EVENT_TYPES = new Set([
  "subject_parent_added",
  "subject_parent_removed",
  "subject_child_added",
  "subject_child_removed"
]);

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
  if (["closed_invalid", "invalid", "rejected"].includes(status)) return "reject";
  if (["closed", "closed_duplicate", "duplicate"].includes(status)) return "close";
  if (previousPoint && String(previousPoint?.status || "").trim().toLowerCase() !== "open") return "reopen";
  return "open";
}

function resolvePointSymbol(pointType = "open") {
  if (pointType === "close") return "check-circle";
  if (pointType === "reject") return "skip";
  return "issue-opened";
}

function normalizeId(value) {
  return String(value || "").trim();
}

function formatDateLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "date inconnue";
  return date.toISOString().replace("T", " ").replace(".000Z", "Z");
}

function formatPointEventLabel(point = {}) {
  const source = String(point?.source || "").trim().toLowerCase();
  if (source === "subject_created") return "création";
  if (source === "subject_closed") return "fermeture";
  if (source === "subject_reopened") return "réouverture";
  return source || "mise à jour";
}

function buildHierarchyLinks(relationEvents = []) {
  const dedupe = new Map();
  for (const event of asArray(relationEvents)) {
    const type = String(event?.event_type || "").trim().toLowerCase();
    if (!HIERARCHY_EVENT_TYPES.has(type)) continue;

    const subjectId = normalizeId(event?.subject_id);
    const counterpartId = normalizeId(event?.payload?.counterpart_subject_id || event?.counterpart_subject_id);
    if (!subjectId || !counterpartId) continue;

    const at = new Date(event?.created_at || event?.at || Date.now());
    if (Number.isNaN(at.getTime())) continue;

    const isParentEvent = type.startsWith("subject_parent_");
    const parentId = isParentEvent ? counterpartId : subjectId;
    const childId = isParentEvent ? subjectId : counterpartId;
    const action = type.endsWith("_removed") ? "removed" : "added";
    const key = `${parentId}|${childId}|${at.toISOString()}|${action}`;

    if (!dedupe.has(key) || isParentEvent) {
      dedupe.set(key, {
        parentId,
        childId,
        action,
        at
      });
    }
  }
  return [...dedupe.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
}

function clearChildren(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

function createSvgLine({ x, y1, y2, classNames = [] } = {}) {
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", String(x));
  line.setAttribute("x2", String(x));
  line.setAttribute("y1", String(y1));
  line.setAttribute("y2", String(y2));
  line.setAttribute("class", ["situation-trajectory__svg-line", ...classNames].join(" "));
  return line;
}

function createHierarchyPath({ x, parentY, childY, isRemoved = false, isReverse = false } = {}) {
  const startY = isReverse ? childY : parentY;
  const endY = isReverse ? parentY : childY;
  const direction = endY >= startY ? 1 : -1;

  const laneStartX = x + 2;
  const laneMidX = x + 10;
  const laneEndX = x + 18;
  const curvePad = direction * 6;

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute(
    "d",
    [
      `M ${laneStartX} ${startY}`,
      `L ${laneMidX - 3} ${startY}`,
      `Q ${laneMidX} ${startY} ${laneMidX} ${startY + curvePad}`,
      `L ${laneMidX} ${endY - curvePad}`,
      `Q ${laneMidX} ${endY} ${laneEndX} ${endY}`
    ].join(" ")
  );
  path.setAttribute("class", `situation-trajectory__hierarchy-link${isRemoved ? " is-removed" : ""}`);

  const markerCircle = (() => {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(laneStartX));
    circle.setAttribute("cy", String(startY));
    circle.setAttribute("r", "2.5");
    circle.setAttribute("class", `situation-trajectory__hierarchy-link${isRemoved ? " is-removed" : ""}`);
    return circle;
  })();

  const arrow = document.createElementNS(SVG_NS, "polygon");
  const arrowSize = 4;
  arrow.setAttribute(
    "points",
    [
      `${laneEndX},${endY}`,
      `${laneEndX - arrowSize},${endY - (direction * arrowSize)}`,
      `${laneEndX - arrowSize},${endY + (direction * arrowSize)}`
    ].join(" ")
  );
  arrow.setAttribute("class", `situation-trajectory__hierarchy-link${isRemoved ? " is-removed" : ""}`);

  return { path, markerCircle, arrow };
}

export function renderTrajectoryDom({
  scene,
  svg,
  itemsRoot,
  rows = [],
  relationEvents = [],
  timeScale,
  scrollLeft = 0,
  scrollTop = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  rowHeight = 32,
  overscan = { rows: 4, px: 160 }
} = {}) {
  if (!scene || !svg || !itemsRoot || !timeScale || typeof timeScale.timeToX !== "function") {
    return {
      visibleRows: 0,
      visibleStart: null,
      visibleEnd: null
    };
  }

  const safeRows = asArray(rows);
  const rowCount = safeRows.length;
  const safeRowHeight = Math.max(1, Number(rowHeight) || 32);
  const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
  const safeViewportHeight = Math.max(0, Number(viewportHeight) || 0);
  const safeScrollLeft = Math.max(0, Number(scrollLeft) || 0);
  const safeScrollTop = Math.max(0, Number(scrollTop) || 0);

  const overscanConfig = normalizeOverscan(overscan);
  const visibleWindow = getTrajectoryVisibleWindow({
    rowCount,
    rowHeight: safeRowHeight,
    scrollTop: safeScrollTop,
    scrollLeft: safeScrollLeft,
    viewportWidth: safeViewportWidth,
    viewportHeight: safeViewportHeight,
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

  const contentWidth = Math.max(safeViewportWidth, Number(timeScale.totalWidth) || 0);
  const contentHeight = Math.max(360, rowCount * safeRowHeight, Number(scene.clientHeight) || 0);

  svg.setAttribute("viewBox", `0 0 ${contentWidth} ${contentHeight}`);
  svg.setAttribute("width", String(contentWidth));
  svg.setAttribute("height", String(contentHeight));

  clearChildren(svg);
  clearChildren(itemsRoot);

  const fragmentSvg = document.createDocumentFragment();
  const fragmentItems = document.createDocumentFragment();

  const todayTs = resolveTodayTimestamp(timeScale);
  if (todayTs >= visibleStartTs && todayTs <= visibleEndTs) {
    const todayLine = createSvgLine({
      x: timeScale.timeToX(todayTs),
      y1: 0,
      y2: contentHeight,
      classNames: ["situation-trajectory__svg-line--today"]
    });
    fragmentSvg.appendChild(todayLine);
  }

  const objectiveTimestamps = collectObjectiveVerticalTimestamps(safeRows);
  for (const ts of objectiveTimestamps) {
    if (ts < visibleStartTs || ts > visibleEndTs) continue;
    const objectiveLine = createSvgLine({
      x: timeScale.timeToX(ts),
      y1: 0,
      y2: contentHeight,
      classNames: ["situation-trajectory__svg-line--objective"]
    });
    fragmentSvg.appendChild(objectiveLine);
  }

  let segmentCount = 0;
  let pointCount = 0;
  let markerCount = 0;

  for (let index = rowStart; index <= rowEnd; index += 1) {
    const row = safeRows[index];
    if (!row) continue;
    const y = (index * safeRowHeight) + (safeRowHeight / 2);
    const subjectId = normalizeId(row?.subjectId);

    for (const segment of asArray(row.lifecycleSegments)) {
      const startTs = toTimestamp(segment.startAt);
      const endTs = toTimestamp(segment.endAt);
      if (!intersectsRange(startTs, endTs, visibleStartTs, visibleEndTs)) continue;

      const segmentNode = document.createElement("div");
      const segmentColor = String(segment?.lineColor || "").trim().toLowerCase();
      const segmentStyle = String(segment?.lineStyle || "").trim().toLowerCase();
      segmentNode.className = [
        "situation-trajectory__segment",
        segmentColor ? `situation-trajectory__segment--${segmentColor}` : "",
        segmentStyle === "dashed" ? "situation-trajectory__segment--dashed" : ""
      ].filter(Boolean).join(" ");
      segmentNode.style.left = `${timeScale.timeToX(startTs)}px`;
      segmentNode.style.top = `${y}px`;
      segmentNode.style.width = `${Math.max(0, timeScale.timeToX(endTs) - timeScale.timeToX(startTs))}px`;
      if (subjectId) {
        segmentNode.dataset.trajectorySubjectId = subjectId;
        segmentNode.dataset.openSituationSubject = subjectId;
      }
      segmentNode.title = `Sujet ${subjectId || "inconnu"} · ${formatDateLabel(segment.startAt)} → ${formatDateLabel(segment.endAt)} · statut ${String(segment?.status || "open").trim().toLowerCase() || "open"}`;
      fragmentItems.appendChild(segmentNode);
      segmentCount += 1;
    }

    const statusPoints = asArray(row.statusPoints);
    for (let pointIndex = 0; pointIndex < statusPoints.length; pointIndex += 1) {
      const point = statusPoints[pointIndex];
      const ts = toTimestamp(point.at);
      if (ts < visibleStartTs || ts > visibleEndTs) continue;

      const pointNode = document.createElement("button");
      pointNode.type = "button";
      pointNode.className = "situation-trajectory__point";
      pointNode.style.left = `${timeScale.timeToX(ts)}px`;
      pointNode.style.top = `${y}px`;

      const pointType = resolvePointIcon(point, statusPoints[pointIndex - 1] || null);
      pointNode.classList.add(`situation-trajectory__point--${pointType}`);
      pointNode.dataset.trajectoryPointType = pointType;
      pointNode.innerHTML = `<span class="situation-trajectory__point-icon" aria-hidden="true">${svgIcon(resolvePointSymbol(pointType), { className: "octicon", width: 16, height: 16 })}</span>`;
      if (subjectId) {
        pointNode.dataset.trajectorySubjectId = subjectId;
        pointNode.dataset.openSituationSubject = subjectId;
      }
      pointNode.setAttribute("tabindex", "0");
      pointNode.setAttribute("role", "button");
      pointNode.title = `Sujet ${subjectId || "inconnu"} · ${formatDateLabel(point.at)} · ${formatPointEventLabel(point)}`;
      fragmentItems.appendChild(pointNode);
      pointCount += 1;
    }

    for (const marker of asArray(row.objectiveMarkers)) {
      const ts = toTimestamp(marker.at);
      if (ts < visibleStartTs || ts > visibleEndTs) continue;

      const markerNode = document.createElement("button");
      markerNode.type = "button";
      const markerType = String(marker?.markerType || "").trim().toLowerCase() || "cross";
      markerNode.className = `situation-trajectory__marker situation-trajectory__marker--${markerType}`;
      markerNode.style.left = `${timeScale.timeToX(ts)}px`;
      markerNode.style.top = `${y}px`;

      if (subjectId) {
        markerNode.dataset.trajectorySubjectId = subjectId;
        markerNode.dataset.openSituationSubject = subjectId;
      }
      const objectiveId = normalizeId(marker?.objectiveId);
      if (objectiveId) markerNode.dataset.trajectoryObjectiveId = objectiveId;
      markerNode.setAttribute("tabindex", "0");
      markerNode.setAttribute("role", "button");
      markerNode.title = `Objectif ${objectiveId || "inconnu"} · ${formatDateLabel(marker.at)} · ${markerType === "check" ? "check" : "cross"}`;
      fragmentItems.appendChild(markerNode);
      markerCount += 1;
    }
  }

  const rowIndexBySubjectId = new Map();
  safeRows.forEach((row, index) => {
    const subjectId = normalizeId(row?.subjectId);
    if (subjectId) rowIndexBySubjectId.set(subjectId, index);
  });

  const hierarchyLinks = buildHierarchyLinks(relationEvents);
  const linkRowMin = Math.max(0, rowStart - 2);
  const linkRowMax = Math.min(Math.max(0, rowCount - 1), rowEnd + 2);
  let linkCount = 0;

  for (const link of hierarchyLinks) {
    const parentIndex = rowIndexBySubjectId.get(link.parentId);
    const childIndex = rowIndexBySubjectId.get(link.childId);
    if (!Number.isInteger(parentIndex) || !Number.isInteger(childIndex)) continue;

    if ((parentIndex < linkRowMin || parentIndex > linkRowMax)
      && (childIndex < linkRowMin || childIndex > linkRowMax)) {
      continue;
    }

    const ts = toTimestamp(link.at);
    if (ts < visibleStartTs || ts > visibleEndTs) continue;

    const x = timeScale.timeToX(ts);
    const parentY = (parentIndex * safeRowHeight) + (safeRowHeight / 2);
    const childY = (childIndex * safeRowHeight) + (safeRowHeight / 2);

    const { path, markerCircle, arrow } = createHierarchyPath({
      x,
      parentY,
      childY,
      isRemoved: link.action === "removed",
      isReverse: link.action === "removed"
    });

    fragmentSvg.appendChild(path);
    if (markerCircle) fragmentSvg.appendChild(markerCircle);
    fragmentSvg.appendChild(arrow);
    linkCount += 1;
  }

  svg.appendChild(fragmentSvg);
  itemsRoot.appendChild(fragmentItems);

  const visibleRows = rowCount ? (rowEnd - rowStart + 1) : 0;
  const visibleStart = new Date(visibleStartTs).toISOString();
  const visibleEnd = new Date(visibleEndTs).toISOString();


  return {
    visibleRows,
    visibleStart,
    visibleEnd,
    rowStart,
    rowEnd
  };
}

export function __trajectoryDomRendererTestUtils() {
  return {
    normalizeOverscan,
    collectObjectiveVerticalTimestamps,
    resolvePointIcon,
    intersectsRange,
    buildHierarchyLinks
  };
}
