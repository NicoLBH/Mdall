import test from "node:test";
import assert from "node:assert/strict";

import { autosizeTextarea, bindAutosizeTextarea } from "./textarea-autosize.js";

test("autosizeTextarea calcule la hauteur avec 3 lignes de confort", () => {
  global.window = {
    getComputedStyle() {
      return { lineHeight: "20px", minHeight: "120px" };
    }
  };

  const textarea = {
    isConnected: true,
    style: { height: "120px", overflowY: "auto" },
    scrollHeight: 210,
    offsetHeight: 120
  };

  const result = autosizeTextarea(textarea, { minHeightFallback: 110, comfortLines: 3 });

  assert.equal(textarea.style.overflowY, "hidden");
  assert.equal(textarea.style.height, "270px");
  assert.equal(result?.nextHeight, 270);
  assert.equal(result?.minHeight, 120);
});

test("autosizeTextarea retourne null si textarea invalide (sans style)", () => {
  const textarea = { isConnected: false };
  const result = autosizeTextarea(textarea);
  assert.equal(result, null);
});

test("bindAutosizeTextarea expose un resize manuel et RAF", () => {
  global.window = {
    getComputedStyle() {
      return { lineHeight: "20px", minHeight: "100px" };
    }
  };
  global.requestAnimationFrame = (fn) => fn();
  const textarea = {
    isConnected: true,
    style: { height: "100px", overflowY: "auto" },
    scrollHeight: 120,
    offsetHeight: 100,
    offsetParent: {}
  };
  const binder = bindAutosizeTextarea(textarea, { minHeightFallback: 90, comfortLines: 3, initialCause: "mount" });
  const immediate = binder.resizeNow("input");
  binder.resizeNextFrame("raf-open");
  assert.equal(immediate?.nextHeight, 180);
  assert.equal(textarea.style.height, "180px");
});
