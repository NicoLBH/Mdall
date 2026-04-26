import test from "node:test";
import assert from "node:assert/strict";

import {
  hasCoarsePointer,
  supportsPointerEvents,
  shouldShowHandwritingButton
} from "./input-capabilities.js";

test("hasCoarsePointer retourne true quand any-pointer coarse est actif", () => {
  const env = {
    matchMedia(query) {
      return { matches: query === "(any-pointer: coarse)" };
    }
  };

  assert.equal(hasCoarsePointer(env), true);
});

test("shouldShowHandwritingButton retourne false sans fenêtre", () => {
  assert.equal(shouldShowHandwritingButton({}), false);
});

test("shouldShowHandwritingButton retourne false sur desktop non tactile", () => {
  const env = {
    matchMedia() {
      return { matches: false };
    },
    PointerEvent() {},
    navigator: { maxTouchPoints: 0 }
  };

  assert.equal(supportsPointerEvents(env), true);
  assert.equal(shouldShowHandwritingButton(env), false);
});

test("shouldShowHandwritingButton retourne true sur device tactile avec PointerEvent", () => {
  const env = {
    matchMedia() {
      return { matches: false };
    },
    PointerEvent() {},
    navigator: { maxTouchPoints: 5 }
  };

  assert.equal(shouldShowHandwritingButton(env), true);
});
