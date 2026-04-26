import test from "node:test";
import assert from "node:assert/strict";

import {
  renderHandwritingComposerOverlay,
  __handwritingComposerOverlayInternals
} from "./handwriting-composer-overlay.js";

test("renderHandwritingComposerOverlay expose les actions attendues", () => {
  const html = renderHandwritingComposerOverlay({
    subjectId: "subject-123",
    draft: { strokes: [{ id: "s1", points: [{ x: 0.1, y: 0.1 }] }] }
  });

  assert.match(html, /Rédaction manuscrite/);
  assert.match(html, /data-action="handwriting-clear"/);
  assert.match(html, /data-action="handwriting-undo"/);
  assert.match(html, /data-action="handwriting-recognize-insert"/);
  assert.match(html, /data-action="handwriting-close"/);
  assert.match(html, /data-role="handwriting-overlay-error"/);
  assert.match(html, /data-subject-id="subject-123"/);
});

test("exportRecognitionImageDataUrl génère une image data URL exploitable", () => {
  const operations = [];
  const fakeContext = {
    fillStyle: "",
    strokeStyle: "",
    lineCap: "",
    lineJoin: "",
    lineWidth: 1,
    fillRect: () => operations.push("fillRect"),
    beginPath: () => operations.push("beginPath"),
    arc: () => operations.push("arc"),
    fill: () => operations.push("fill"),
    moveTo: () => operations.push("moveTo"),
    lineTo: () => operations.push("lineTo"),
    stroke: () => operations.push("stroke")
  };

  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      return {
        width: 0,
        height: 0,
        getContext() {
          return fakeContext;
        },
        toDataURL(type, quality) {
          assert.equal(type, "image/jpeg");
          assert.equal(quality, 0.88);
          return "data:image/jpeg;base64,test";
        }
      };
    }
  };

  const imageDataUrl = __handwritingComposerOverlayInternals.exportRecognitionImageDataUrl({
    strokes: [{ id: "s1", width: 2.4, points: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.6 }] }],
    width: 2200,
    height: 1200
  });

  assert.equal(imageDataUrl, "data:image/jpeg;base64,test");
  assert.ok(operations.includes("fillRect"));
  assert.ok(operations.includes("stroke"));
});

test("shouldAcceptPointerStart accepte pen puis refuse touch après détection stylet", () => {
  const gate = __handwritingComposerOverlayInternals.createPointerStartGate();
  const now = 1000;
  const penDecision = gate.shouldAcceptPointerStart({ pointerType: "pen", pointerId: 1 }, now);
  assert.equal(penDecision.accepted, true);
  assert.equal(gate.state.hasSeenPenInput, true);

  const touchDecision = gate.shouldAcceptPointerStart({ pointerType: "touch", pointerId: 2 }, now + 10);
  assert.equal(touchDecision.accepted, false);
  assert.equal(touchDecision.reason, "palm-touch-after-pen");
});

test("shouldAcceptPointerStart garde mouse pour debug sans pointeur actif", () => {
  const gate = __handwritingComposerOverlayInternals.createPointerStartGate();
  const mouseDecision = gate.shouldAcceptPointerStart({ pointerType: "mouse", pointerId: 3 }, 500);
  assert.equal(mouseDecision.accepted, true);
});

test("shouldAcceptPointerStart refuse un pointer concurrent", () => {
  const gate = __handwritingComposerOverlayInternals.createPointerStartGate();
  gate.state.activePointerId = 7;
  gate.state.activePointerType = "pen";
  const otherPointer = gate.shouldAcceptPointerStart({ pointerType: "touch", pointerId: 8 }, 500);
  assert.equal(otherPointer.accepted, false);
  assert.equal(otherPointer.reason, "active-pointer");
});
