function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toInteger(value, fallback = 0) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.floor(numberValue);
}

export function getTrajectoryVisibleWindow({
  rowCount = 0,
  rowHeight = 32,
  scrollTop = 0,
  scrollLeft = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  totalWidth = 0,
  overscanRows = 4,
  overscanPx = 160
} = {}) {
  const safeRowCount = Math.max(0, toInteger(rowCount));
  const safeRowHeight = Math.max(1, Number(rowHeight) || 32);

  const safeScrollTop = Math.max(0, Number(scrollTop) || 0);
  const safeScrollLeft = Math.max(0, Number(scrollLeft) || 0);
  const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
  const safeViewportHeight = Math.max(0, Number(viewportHeight) || 0);
  const safeTotalWidth = Math.max(0, Number(totalWidth) || 0);

  const safeOverscanRows = Math.max(0, toInteger(overscanRows));
  const safeOverscanPx = Math.max(0, Number(overscanPx) || 0);

  let rowStart = 0;
  let rowEnd = -1;

  if (safeRowCount > 0) {
    const maxRowIndex = safeRowCount - 1;
    rowStart = clamp(Math.floor(safeScrollTop / safeRowHeight) - safeOverscanRows, 0, maxRowIndex);
    rowEnd = clamp(
      Math.ceil((safeScrollTop + safeViewportHeight) / safeRowHeight) + safeOverscanRows,
      rowStart,
      maxRowIndex
    );
  }

  const visibleRowCount = rowEnd >= rowStart ? (rowEnd - rowStart + 1) : 0;
  const maxScrollLeft = Math.max(0, safeTotalWidth - safeViewportWidth);

  const timeScrollLeft = clamp(safeScrollLeft - safeOverscanPx, 0, maxScrollLeft);
  const timeViewportWidth = Math.max(0, Math.min(
    safeTotalWidth > 0 ? safeTotalWidth - timeScrollLeft : safeViewportWidth,
    safeViewportWidth + (safeOverscanPx * 2)
  ));

  const isFastScrolling = safeViewportHeight > 0
    ? Math.abs(safeScrollTop / safeViewportHeight) > 4
    : false;

  const window = {
    rowStart,
    rowEnd,
    visibleRowCount,
    timeScrollLeft,
    timeViewportWidth,
    isFastScrolling
  };

  console.info("[trajectory] virtualizer.window", {
    rowStart,
    rowEnd,
    scrollLeft: safeScrollLeft
  });

  return window;
}

export function __trajectoryVirtualizerTestUtils() {
  return {
    clamp,
    toInteger
  };
}
