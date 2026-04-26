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
