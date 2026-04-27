import test from "node:test";
import assert from "node:assert/strict";
import { createTrajectoryTimeScale } from "./trajectory-time-scale.js";
import { renderTrajectoryCanvas, __trajectoryCanvasRendererTestUtils } from "./trajectory-canvas-renderer.js";

function createMockCanvas() {
  const operations = [];
  const ctx = {
    save: () => operations.push(["save"]),
    restore: () => operations.push(["restore"]),
    setTransform: (...args) => operations.push(["setTransform", ...args]),
    clearRect: (...args) => operations.push(["clearRect", ...args]),
    setLineDash: (...args) => operations.push(["setLineDash", ...args]),
    beginPath: () => operations.push(["beginPath"]),
    moveTo: (...args) => operations.push(["moveTo", ...args]),
    lineTo: (...args) => operations.push(["lineTo", ...args]),
    quadraticCurveTo: (...args) => operations.push(["quadraticCurveTo", ...args]),
    stroke: () => operations.push(["stroke"]),
    closePath: () => operations.push(["closePath"]),
    fill: () => operations.push(["fill"]),
    arc: (...args) => operations.push(["arc", ...args]),
    rect: (...args) => operations.push(["rect", ...args]),
    fillText: (...args) => operations.push(["fillText", ...args])
  };

  return {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
    operations
  };
}

test("renderTrajectoryCanvas dessine uniquement la fenêtre visible + instrumentation", () => {
  const originalDpr = globalThis.devicePixelRatio;
  globalThis.devicePixelRatio = 2;

  const timeScale = createTrajectoryTimeScale({
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-01-10T00:00:00.000Z",
    zoom: "day",
    pxPerUnit: 10
  });

  const canvas = createMockCanvas();
  const result = renderTrajectoryCanvas({
    canvas,
    timeScale,
    rows: [
      {
        statusPoints: [{ at: "2026-01-02T00:00:00.000Z", status: "open", source: "subject_created" }],
        lifecycleSegments: [{ startAt: "2026-01-02T00:00:00.000Z", endAt: "2026-01-05T00:00:00.000Z", lineColor: "green", lineStyle: "solid" }],
        objectiveMarkers: [{ at: "2026-01-04T00:00:00.000Z", markerType: "cross", markerColor: "red" }]
      },
      {
        statusPoints: [{ at: "2026-01-09T00:00:00.000Z", status: "open", source: "subject_created" }],
        lifecycleSegments: [{ startAt: "2026-01-09T00:00:00.000Z", endAt: "2026-01-10T00:00:00.000Z", lineColor: "green", lineStyle: "solid" }],
        objectiveMarkers: []
      }
    ],
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 60,
    viewportHeight: 40,
    rowHeight: 20,
    overscan: { rows: 0, px: 0 }
  });

  assert.equal(canvas.width, 120);
  assert.equal(canvas.height, 80);
  assert.equal(result.visibleRows, 2);
  assert.equal(result.rowStart, 0);
  assert.equal(result.rowEnd, 1);

  const strokeCalls = canvas.operations.filter((op) => op[0] === "stroke").length;
  assert.ok(strokeCalls >= 3);

  globalThis.devicePixelRatio = originalDpr;
});

test("test utils: row window + icon resolution", () => {
  const { getVisibleRowWindow, resolvePointIcon, collectObjectiveVerticalTimestamps } = __trajectoryCanvasRendererTestUtils();

  assert.deepEqual(
    getVisibleRowWindow({ rowCount: 100, rowHeight: 20, scrollTop: 200, viewportHeight: 60, overscanRows: 2 }),
    { rowStart: 8, rowEnd: 15 }
  );

  assert.equal(resolvePointIcon({ source: "subject_reopened", status: "open" }, { status: "closed" }), "reopen");
  assert.equal(resolvePointIcon({ status: "closed_invalid" }), "reject");
  assert.equal(resolvePointIcon({ status: "closed" }), "close");

  const timestamps = collectObjectiveVerticalTimestamps([
    { objectiveMarkers: [{ at: "2026-01-05T00:00:00.000Z" }, { at: "2026-01-05T00:00:00.000Z" }] },
    { objectiveMarkers: [{ at: "2026-01-07T00:00:00.000Z" }] }
  ]);
  assert.equal(timestamps.length, 2);
});


test("buildHierarchyLinks déduplique les événements double-sens parent/enfant", () => {
  const { buildHierarchyLinks } = __trajectoryCanvasRendererTestUtils();
  const links = buildHierarchyLinks([
    {
      event_type: "subject_parent_added",
      subject_id: "child-1",
      created_at: "2026-01-03T00:00:00.000Z",
      payload: { counterpart_subject_id: "parent-1" }
    },
    {
      event_type: "subject_child_added",
      subject_id: "parent-1",
      created_at: "2026-01-03T00:00:00.000Z",
      payload: { counterpart_subject_id: "child-1" }
    },
    {
      event_type: "subject_parent_removed",
      subject_id: "child-1",
      created_at: "2026-01-04T00:00:00.000Z",
      payload: { counterpart_subject_id: "parent-1" }
    }
  ]);

  assert.equal(links.length, 2);
  assert.deepEqual(
    links.map((link) => ({
      parentId: link.parentId,
      childId: link.childId,
      action: link.action,
      at: link.at.toISOString()
    })),
    [
      {
        parentId: "parent-1",
        childId: "child-1",
        action: "added",
        at: "2026-01-03T00:00:00.000Z"
      },
      {
        parentId: "parent-1",
        childId: "child-1",
        action: "removed",
        at: "2026-01-04T00:00:00.000Z"
      }
    ]
  );
});
