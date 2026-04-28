import test from "node:test";
import assert from "node:assert/strict";
import { createTrajectoryTimeScale } from "./trajectory-time-scale.js";
import { renderTrajectoryDom, __trajectoryDomRendererTestUtils } from "./trajectory-dom-renderer.js";

class MockNode {
  constructor(tagName = "div") {
    this.tagName = String(tagName || "div").toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.className = "";
    this.clientHeight = 0;
    this.clientWidth = 0;
    this.type = "";
    this.title = "";
    this._innerHTML = "";
    this.classList = {
      add: (...tokens) => {
        const current = new Set(String(this.className || "").split(/\s+/).filter(Boolean));
        tokens.map((token) => String(token || "").trim()).filter(Boolean).forEach((token) => current.add(token));
        this.className = [...current].join(" ");
      }
    };
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  appendChild(node) {
    if (!node) return null;
    if (node.isFragment) {
      for (const child of [...node.childNodes]) this.appendChild(child);
      node.childNodes = [];
      return node;
    }
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  removeChild(node) {
    const index = this.childNodes.indexOf(node);
    if (index >= 0) {
      this.childNodes.splice(index, 1);
      node.parentNode = null;
    }
    return node;
  }

  setAttribute(name, value) {
    const key = String(name || "");
    const safeValue = String(value ?? "");
    this.attributes[key] = safeValue;
    if (key === "class") this.className = safeValue;
    if (key.startsWith("data-")) {
      const datasetKey = key
        .slice(5)
        .split("-")
        .map((part, index) => (index === 0 ? part : (part.charAt(0).toUpperCase() + part.slice(1))))
        .join("");
      this.dataset[datasetKey] = safeValue;
    }
  }

  getAttribute(name) {
    return this.attributes[String(name || "")] || null;
  }

  set innerHTML(_) {
    this._innerHTML = String(_ || "");
    this.childNodes = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

class MockFragment extends MockNode {
  constructor() {
    super("#fragment");
    this.isFragment = true;
  }
}

function createMockDocument() {
  return {
    createElement: (tagName) => new MockNode(tagName),
    createElementNS: (_ns, tagName) => new MockNode(tagName),
    createDocumentFragment: () => new MockFragment()
  };
}

function walk(node, visit) {
  if (!node) return;
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
}

function queryByClass(root, className) {
  const matches = [];
  walk(root, (node) => {
    const classes = String(node.className || "").split(/\s+/).filter(Boolean);
    if (classes.includes(className)) matches.push(node);
  });
  return matches;
}

function createRows(count) {
  return Array.from({ length: count }, (_unused, index) => ({
    subjectId: `subject-${index}`,
    subjectTitle: `Sujet ${index}`,
    subjectNumber: `#${index + 1}`,
    lifecycleSegments: [
      {
        subjectId: `subject-${index}`,
        status: "open",
        startAt: new Date("2026-01-02T00:00:00.000Z"),
        endAt: new Date("2026-01-04T00:00:00.000Z"),
        lineColor: "green",
        lineStyle: "solid"
      }
    ],
    statusPoints: [
      {
        at: new Date("2026-01-03T00:00:00.000Z"),
        status: "open",
        source: "subject_created"
      }
    ],
    objectiveMarkers: [
      {
        objectiveId: `obj-${index}`,
        at: new Date("2026-01-05T00:00:00.000Z"),
        markerType: "check",
        markerColor: "green"
      }
    ]
  }));
}

test("renderTrajectoryDom rend uniquement les lignes visibles et les éléments attendus", () => {
  const originalDocument = globalThis.document;
  const originalNow = Date.now;
  globalThis.document = createMockDocument();
  Date.now = () => new Date("2026-01-03T00:00:00.000Z").getTime();

  const scene = new MockNode("div");
  scene.clientHeight = 600;
  const svg = new MockNode("svg");
  const itemsRoot = new MockNode("div");

  const rows = createRows(5);
  const timeScale = createTrajectoryTimeScale({
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-01-10T00:00:00.000Z",
    zoom: "day",
    pxPerUnit: 12
  });

  const result = renderTrajectoryDom({
    scene,
    svg,
    itemsRoot,
    rows,
    relationEvents: [
      {
        event_type: "subject_parent_added",
        subject_id: "subject-2",
        created_at: "2026-01-03T00:00:00.000Z",
        payload: { counterpart_subject_id: "subject-3" }
      }
    ],
    timeScale,
    scrollLeft: 0,
    scrollTop: 40,
    viewportWidth: 300,
    viewportHeight: 20,
    rowHeight: 20,
    overscan: 0
  });

  assert.equal(result.rowStart, 2);
  assert.equal(result.rowEnd, 3);
  assert.equal(result.visibleRows, 2);

  const segments = queryByClass(itemsRoot, "situation-trajectory__segment");
  assert.equal(segments.length, 2);
  assert.deepEqual(
    [...new Set(segments.map((node) => node.dataset.trajectorySubjectId))].sort(),
    ["subject-2", "subject-3"]
  );
  const segmentTitles = queryByClass(itemsRoot, "situation-trajectory__segment-title");
  const segmentNumbers = queryByClass(itemsRoot, "situation-trajectory__segment-number");
  assert.equal(segmentTitles.length, 2);
  assert.equal(segmentNumbers.length, 2);

  const points = queryByClass(itemsRoot, "situation-trajectory__point");
  assert.equal(points.length, 2);
  assert.ok(points.every((node) => !!node.dataset.openSituationSubject));

  const markers = queryByClass(itemsRoot, "situation-trajectory__marker");
  assert.equal(markers.length, 2);

  const todayLines = queryByClass(svg, "situation-trajectory__svg-line--today");
  assert.equal(todayLines.length, 1);

  const hierarchyLinks = queryByClass(svg, "situation-trajectory__hierarchy-link");
  assert.ok(hierarchyLinks.length >= 1);


  globalThis.document = originalDocument;
  Date.now = originalNow;
});

test("__trajectoryDomRendererTestUtils expose les helpers clés", () => {
  const {
    buildRelationLinks,
    resolvePointIcon,
    collectObjectiveVerticalTimestamps,
    toRenderTimestamp
  } = __trajectoryDomRendererTestUtils();

  assert.equal(typeof buildRelationLinks, "function");
  assert.equal(typeof resolvePointIcon, "function");
  assert.equal(typeof collectObjectiveVerticalTimestamps, "function");
  assert.equal(typeof toRenderTimestamp, "function");

  assert.equal(resolvePointIcon({ source: "subject_reopened", status: "open" }, { status: "closed" }), "reopen");

  const timestamps = collectObjectiveVerticalTimestamps([
    { objectiveMarkers: [{ at: "2026-01-05T00:00:00.000Z" }, { at: "2026-01-05T00:00:00.000Z" }] },
    { objectiveMarkers: [{ at: "2026-01-07T00:00:00.000Z" }] }
  ]);
  assert.equal(timestamps.length, 2);

  const dayRenderTs = toRenderTimestamp("2026-01-07T08:10:00.000Z", { zoom: "day" });
  const dayRenderDate = new Date(dayRenderTs);
  assert.equal(dayRenderDate.getHours(), 12);

  const links = buildRelationLinks([
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
    }
  ], { relationType: "hierarchy" });
  assert.equal(links.length, 1);
});

test("renderTrajectoryDom conserve le timestamp réel pour subject_closed en zoom day", () => {
  const originalDocument = globalThis.document;
  globalThis.document = createMockDocument();

  const scene = new MockNode("div");
  scene.clientHeight = 300;
  const svg = new MockNode("svg");
  const itemsRoot = new MockNode("div");

  const rows = [
    {
      subjectId: "subject-1",
      lifecycleSegments: [
        {
          subjectId: "subject-1",
          status: "open",
          startAt: new Date("2026-04-11T09:27:08.186Z"),
          endAt: new Date("2026-04-19T22:00:00.000Z"),
          lineColor: "green",
          lineStyle: "solid"
        }
      ],
      statusPoints: [{ at: new Date("2026-04-19T22:00:00.000Z"), status: "closed", source: "subject_closed" }],
      objectiveMarkers: [{ objectiveId: "obj-1", at: new Date("2026-04-17T00:00:00.000Z"), markerType: "check" }]
    }
  ];

  const timeScale = createTrajectoryTimeScale({
    startDate: "2026-04-01T00:00:00.000Z",
    endDate: "2026-04-30T00:00:00.000Z",
    zoom: "day",
    pxPerUnit: 12
  });

  renderTrajectoryDom({
    scene,
    svg,
    itemsRoot,
    rows,
    relationEvents: [],
    timeScale,
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 2000,
    viewportHeight: 200,
    rowHeight: 20,
    overscan: 0
  });

  const [segment] = queryByClass(itemsRoot, "situation-trajectory__segment");
  const [point] = queryByClass(itemsRoot, "situation-trajectory__point");
  const [marker] = queryByClass(itemsRoot, "situation-trajectory__marker");

  assert.ok(segment);
  assert.ok(point);
  assert.ok(marker);

  const { toRenderTimestamp } = __trajectoryDomRendererTestUtils();
  const realClosedTs = new Date("2026-04-19T22:00:00.000Z").getTime();
  const centeredClosedTs = toRenderTimestamp("2026-04-19T22:00:00.000Z", timeScale);
  const markerTs = toRenderTimestamp("2026-04-17T00:00:00.000Z", timeScale);

  const expectedPointLeft = `${timeScale.timeToX(realClosedTs)}px`;
  const centeredPointLeft = `${timeScale.timeToX(centeredClosedTs)}px`;
  const expectedMarkerLeft = `${timeScale.timeToX(markerTs)}px`;

  assert.equal(point.style.left, expectedPointLeft);
  assert.notEqual(point.style.left, centeredPointLeft);
  assert.equal(marker.style.left, expectedMarkerLeft);

  globalThis.document = originalDocument;
});

test("renderTrajectoryDom calcule left/width des segments depuis les timestamps réels en zoom day", () => {
  const originalDocument = globalThis.document;
  globalThis.document = createMockDocument();

  const scene = new MockNode("div");
  scene.clientHeight = 300;
  const svg = new MockNode("svg");
  const itemsRoot = new MockNode("div");

  const rows = [
    {
      subjectId: "subject-1",
      lifecycleSegments: [
        {
          subjectId: "subject-1",
          status: "closed",
          startAt: new Date("2026-04-11T09:27:08.186Z"),
          endAt: new Date("2026-04-19T22:00:00.000Z"),
          lineColor: "green",
          lineStyle: "solid"
        }
      ],
      statusPoints: [],
      objectiveMarkers: []
    }
  ];

  const timeScale = createTrajectoryTimeScale({
    startDate: "2026-04-01T00:00:00.000Z",
    endDate: "2026-04-30T00:00:00.000Z",
    zoom: "day",
    pxPerUnit: 12
  });

  renderTrajectoryDom({
    scene,
    svg,
    itemsRoot,
    rows,
    relationEvents: [],
    timeScale,
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 2000,
    viewportHeight: 200,
    rowHeight: 20,
    overscan: 0
  });

  const [segment] = queryByClass(itemsRoot, "situation-trajectory__segment");
  assert.ok(segment);

  const { toRenderTimestamp } = __trajectoryDomRendererTestUtils();
  const realStartTs = new Date("2026-04-11T09:27:08.186Z").getTime();
  const realEndTs = new Date("2026-04-19T22:00:00.000Z").getTime();
  const centeredStartTs = toRenderTimestamp("2026-04-11T09:27:08.186Z", timeScale);
  const centeredEndTs = toRenderTimestamp("2026-04-19T22:00:00.000Z", timeScale);

  const expectedLeft = `${timeScale.timeToX(realStartTs)}px`;
  const expectedWidth = `${timeScale.timeToX(realEndTs) - timeScale.timeToX(realStartTs)}px`;
  const centeredLeft = `${timeScale.timeToX(centeredStartTs)}px`;
  const centeredWidth = `${timeScale.timeToX(centeredEndTs) - timeScale.timeToX(centeredStartTs)}px`;

  assert.equal(segment.style.left, expectedLeft);
  assert.equal(segment.style.width, expectedWidth);
  assert.notEqual(segment.style.left, centeredLeft);
  assert.notEqual(segment.style.width, centeredWidth);

  globalThis.document = originalDocument;
});

test("renderTrajectoryDom applique les classes red+dashed et dessine un lien removed enfant -> parent avec circle+arrow", () => {
  const originalDocument = globalThis.document;
  const originalNow = Date.now;
  globalThis.document = createMockDocument();
  Date.now = () => new Date("2026-01-06T00:00:00.000Z").getTime();

  const scene = new MockNode("div");
  scene.clientHeight = 600;
  const svg = new MockNode("svg");
  const itemsRoot = new MockNode("div");

  const rows = [
    {
      subjectId: "parent-1",
      lifecycleSegments: [],
      statusPoints: [],
      objectiveMarkers: []
    },
    {
      subjectId: "child-1",
      lifecycleSegments: [
        {
          subjectId: "child-1",
          status: "closed",
          startAt: new Date("2026-01-05T00:00:00.000Z"),
          endAt: new Date("2026-01-07T00:00:00.000Z"),
          lineColor: "red",
          lineStyle: "dashed"
        }
      ],
      statusPoints: [],
      objectiveMarkers: []
    }
  ];

  const timeScale = createTrajectoryTimeScale({
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-01-10T00:00:00.000Z",
    zoom: "day",
    pxPerUnit: 12
  });

  renderTrajectoryDom({
    scene,
    svg,
    itemsRoot,
    rows,
    relationEvents: [
      {
        event_type: "subject_parent_removed",
        subject_id: "child-1",
        created_at: "2026-01-06T00:00:00.000Z",
        payload: { counterpart_subject_id: "parent-1" }
      }
    ],
    timeScale,
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 600,
    viewportHeight: 200,
    rowHeight: 20,
    overscan: 0
  });

  const [redDashedSegment] = queryByClass(itemsRoot, "situation-trajectory__segment--dashed");
  assert.ok(redDashedSegment);
  assert.ok(String(redDashedSegment.className).includes("situation-trajectory__segment--red"));

  const removedPaths = queryByClass(svg, "situation-trajectory__hierarchy-link")
    .filter((node) => node.tagName === "PATH" && String(node.className).includes("is-removed"));
  const removedCircles = queryByClass(svg, "situation-trajectory__hierarchy-link")
    .filter((node) => node.tagName === "CIRCLE" && String(node.className).includes("is-removed"));
  const removedArrows = queryByClass(svg, "situation-trajectory__hierarchy-link")
    .filter((node) => node.tagName === "POLYGON" && String(node.className).includes("is-removed"));

  assert.equal(removedPaths.length, 1);
  assert.equal(removedCircles.length, 1);
  assert.equal(removedArrows.length, 1);
  assert.equal(removedCircles[0].getAttribute("cy"), "30");

  globalThis.document = originalDocument;
  Date.now = originalNow;
});

test("renderTrajectoryDom dessine les liens bloqué par en rouge avec icône blocked au milieu", () => {
  const originalDocument = globalThis.document;
  globalThis.document = createMockDocument();

  const scene = new MockNode("div");
  scene.clientHeight = 300;
  const svg = new MockNode("svg");
  const itemsRoot = new MockNode("div");

  const rows = [
    { subjectId: "blocker", lifecycleSegments: [], statusPoints: [], objectiveMarkers: [] },
    { subjectId: "blocked", lifecycleSegments: [], statusPoints: [], objectiveMarkers: [] }
  ];

  const timeScale = createTrajectoryTimeScale({
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-01-10T00:00:00.000Z",
    zoom: "day",
    pxPerUnit: 12
  });

  renderTrajectoryDom({
    scene,
    svg,
    itemsRoot,
    rows,
    relationEvents: [
      {
        event_type: "subject_blocked_by_added",
        subject_id: "blocked",
        created_at: "2026-01-06T00:00:00.000Z",
        payload: { counterpart_subject_id: "blocker" }
      }
    ],
    timeScale,
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 600,
    viewportHeight: 200,
    rowHeight: 20,
    overscan: 0
  });

  const blockedPaths = queryByClass(svg, "situation-trajectory__hierarchy-link--blocked")
    .filter((node) => node.tagName === "PATH");
  const blockedIcons = queryByClass(svg, "situation-trajectory__hierarchy-link--blocked")
    .filter((node) => node.tagName === "SVG");

  assert.equal(blockedPaths.length, 1);
  assert.equal(blockedIcons.length, 1);
  assert.equal(blockedIcons[0].getAttribute("width"), "12");
  assert.ok(String(blockedIcons[0].childNodes[0]?.getAttribute("href") || "").includes("#blocked"));

  globalThis.document = originalDocument;
});

test("renderTrajectoryDom affiche une icône par point de statut et ajoute l'indicateur bloqué", () => {
  const originalDocument = globalThis.document;
  globalThis.document = createMockDocument();

  const scene = new MockNode("div");
  scene.clientHeight = 600;
  const svg = new MockNode("svg");
  const itemsRoot = new MockNode("div");

  const rows = [
    {
      subjectId: "subject-1",
      lifecycleSegments: [
        {
          subjectId: "subject-1",
          status: "open",
          startAt: new Date("2026-01-01T00:00:00.000Z"),
          endAt: new Date("2026-02-20T00:00:00.000Z"),
          lineColor: "green",
          lineStyle: "solid"
        }
      ],
      statusPoints: [
        { at: new Date("2026-01-01T00:00:00.000Z"), status: "open", source: "subject_created", icon: "open" },
        { at: new Date("2026-01-20T00:00:00.000Z"), status: "closed", source: "subject_closed", icon: "close" },
        { at: new Date("2026-02-04T00:00:00.000Z"), status: "open", source: "subject_reopened", icon: "open" },
        { at: new Date("2026-02-10T00:00:00.000Z"), status: "open", source: "subject_blocked_by_added", icon: "open", hasBlockedIndicator: true },
        { at: new Date("2026-02-18T00:00:00.000Z"), status: "closed_invalid", source: "subject_rejected", icon: "reject" }
      ],
      objectiveMarkers: []
    }
  ];

  const timeScale = createTrajectoryTimeScale({
    startDate: "2025-12-28T00:00:00.000Z",
    endDate: "2026-02-25T00:00:00.000Z",
    zoom: "day",
    pxPerUnit: 8
  });

  renderTrajectoryDom({
    scene,
    svg,
    itemsRoot,
    rows,
    relationEvents: [],
    timeScale,
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 1200,
    viewportHeight: 200,
    rowHeight: 20,
    overscan: 0
  });

  const points = queryByClass(itemsRoot, "situation-trajectory__point");
  assert.equal(points.length, 5);
  assert.ok(points.some((node) => String(node.className).includes("situation-trajectory__point--close")));
  assert.ok(points.some((node) => String(node.className).includes("situation-trajectory__point--reject")));
  assert.ok(points.some((node) => String(node.innerHTML || "").includes("situation-trajectory__status-blocked-indicator")));

  globalThis.document = originalDocument;
});

test("renderTrajectoryDom affiche les milestones avec classes dédiées, icône milestone et décalage sur timestamp identique", () => {
  const originalDocument = globalThis.document;
  globalThis.document = createMockDocument();

  const scene = new MockNode("div");
  scene.clientHeight = 600;
  const svg = new MockNode("svg");
  const itemsRoot = new MockNode("div");

  const rows = [
    {
      subjectId: "subject-ms",
      lifecycleSegments: [],
      statusPoints: [
        {
          at: new Date("2026-01-10T00:00:00.000Z"),
          status: "open",
          source: "subject_objectives_changed",
          icon: "milestone",
          milestoneAction: "removed",
          markerColor: "var(--muted)",
          contributesToLifecycle: false,
          offsetIndex: 0
        },
        {
          at: new Date("2026-01-10T00:00:00.000Z"),
          status: "open",
          source: "subject_objectives_changed",
          icon: "milestone",
          milestoneAction: "added",
          markerColor: "#fff",
          contributesToLifecycle: false,
          offsetIndex: 1
        }
      ],
      objectiveMarkers: []
    }
  ];

  const timeScale = createTrajectoryTimeScale({
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-01-20T00:00:00.000Z",
    zoom: "day",
    pxPerUnit: 10
  });

  renderTrajectoryDom({
    scene,
    svg,
    itemsRoot,
    rows,
    relationEvents: [],
    timeScale,
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 800,
    viewportHeight: 200,
    rowHeight: 20,
    overscan: 0
  });

  const points = queryByClass(itemsRoot, "situation-trajectory__point");
  assert.equal(points.length, 2);
  assert.ok(points.every((node) => String(node.className).includes("situation-trajectory__point--milestone")));
  assert.ok(points.some((node) => String(node.className).includes("situation-trajectory__point--milestone-added")));
  assert.ok(points.some((node) => String(node.className).includes("situation-trajectory__point--milestone-removed")));
  assert.ok(points.every((node) => String(node.innerHTML || "").includes("milestone")));

  const leftPositions = points.map((node) => node.style.left);
  assert.equal(new Set(leftPositions).size, 2);

  globalThis.document = originalDocument;
});
