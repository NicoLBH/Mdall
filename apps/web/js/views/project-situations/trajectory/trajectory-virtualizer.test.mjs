import test from "node:test";
import assert from "node:assert/strict";

import { getTrajectoryVisibleWindow, __trajectoryVirtualizerTestUtils } from "./trajectory-virtualizer.js";

test("getTrajectoryVisibleWindow calcule la fenêtre verticale et horizontale avec overscan", () => {
  const result = getTrajectoryVisibleWindow({
    rowCount: 200,
    rowHeight: 24,
    scrollTop: 240,
    scrollLeft: 320,
    viewportWidth: 500,
    viewportHeight: 300,
    totalWidth: 5000,
    overscanRows: 3,
    overscanPx: 100
  });

  assert.deepEqual(result, {
    rowStart: 7,
    rowEnd: 26,
    visibleRowCount: 20,
    timeScrollLeft: 220,
    timeViewportWidth: 700,
    isFastScrolling: false
  });
});

test("getTrajectoryVisibleWindow borne les valeurs pour éviter de sortir des limites", () => {
  const result = getTrajectoryVisibleWindow({
    rowCount: 2,
    rowHeight: 32,
    scrollTop: 999,
    scrollLeft: 999,
    viewportWidth: 400,
    viewportHeight: 100,
    totalWidth: 550,
    overscanRows: 4,
    overscanPx: 300
  });

  assert.equal(result.rowStart, 1);
  assert.equal(result.rowEnd, 1);
  assert.equal(result.visibleRowCount, 1);
  assert.equal(result.timeScrollLeft, 150);
  assert.equal(result.timeViewportWidth, 400);
});

test("__trajectoryVirtualizerTestUtils expose les utilitaires internes", () => {
  const { clamp, toInteger } = __trajectoryVirtualizerTestUtils();
  assert.equal(clamp(10, 0, 5), 5);
  assert.equal(toInteger("12.9"), 12);
});
