import test from "node:test";
import assert from "node:assert/strict";

import { replaceTextareaValueFromHandwriting } from "./textarea-insert.js";

test("replaceTextareaValueFromHandwriting remplace la valeur et dispatch input", () => {
  let inputTriggered = false;
  const textarea = {
    value: "ancien",
    selectionStart: 0,
    selectionEnd: 0,
    focus() {},
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
    dispatchEvent(event) {
      inputTriggered = event?.type === "input" && event?.bubbles === true;
    }
  };

  const ok = replaceTextareaValueFromHandwriting(textarea, "## Nouveau");

  assert.equal(ok, true);
  assert.equal(textarea.value, "## Nouveau");
  assert.equal(textarea.selectionStart, "## Nouveau".length);
  assert.equal(textarea.selectionEnd, "## Nouveau".length);
  assert.equal(inputTriggered, true);
});
