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

test("autosizeTextarea respecte un plancher manuel quand la hauteur utilisateur est plus grande", () => {
  global.window = {
    getComputedStyle() {
      return { lineHeight: "20px", minHeight: "110px" };
    }
  };

  const textarea = {
    isConnected: true,
    style: { height: "180px", overflowY: "auto" },
    dataset: { autosizeLastHeight: "180" },
    scrollHeight: 140,
    offsetHeight: 260,
    offsetParent: {}
  };

  const result = autosizeTextarea(textarea, { minHeightFallback: 110, comfortLines: 3 });

  assert.equal(result?.manualFloor, 260);
  assert.equal(result?.nextHeight, 260);
  assert.equal(textarea.style.height, "260px");
  assert.equal(textarea.dataset.manualResizeFloor, "260");
});

test("autosizeTextarea peut dépasser le plancher manuel si le contenu est plus long", () => {
  global.window = {
    getComputedStyle() {
      return { lineHeight: "20px", minHeight: "110px" };
    }
  };

  const textarea = {
    isConnected: true,
    style: { height: "260px", overflowY: "auto" },
    dataset: { autosizeLastHeight: "260", manualResizeFloor: "260" },
    scrollHeight: 340,
    offsetHeight: 260,
    offsetParent: {}
  };

  const result = autosizeTextarea(textarea, { minHeightFallback: 110, comfortLines: 3 });

  assert.equal(result?.manualFloor, 260);
  assert.equal(result?.nextHeight, 400);
  assert.equal(textarea.style.height, "400px");
});

test("autosizeTextarea applique le minHeight fallback quand le CSS est trop faible", () => {
  global.window = {
    getComputedStyle() {
      return { lineHeight: "20px", minHeight: "0px" };
    }
  };

  const textarea = {
    isConnected: true,
    style: { height: "90px", overflowY: "auto" },
    scrollHeight: 90,
    offsetHeight: 90,
    offsetParent: {}
  };

  const result = autosizeTextarea(textarea, { minHeightFallback: 326, comfortLines: 0 });
  assert.equal(result?.nextHeight, 326);
  assert.equal(textarea.style.height, "326px");
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
