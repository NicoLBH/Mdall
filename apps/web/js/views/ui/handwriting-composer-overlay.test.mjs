import test from "node:test";
import assert from "node:assert/strict";

import { renderHandwritingComposerOverlay } from "./handwriting-composer-overlay.js";

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
