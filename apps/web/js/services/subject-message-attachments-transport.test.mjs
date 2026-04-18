import test from "node:test";
import assert from "node:assert/strict";

import {
  EDGE_UPLOAD_MODE,
  resolveSubjectAttachmentUploadTransportMode
} from "./subject-message-attachments-transport.js";

function withWindow(windowValue, fn) {
  const previousWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  if (windowValue === undefined) {
    delete globalThis.window;
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: windowValue
    });
  }

  try {
    return fn();
  } finally {
    if (previousWindowDescriptor) {
      Object.defineProperty(globalThis, "window", previousWindowDescriptor);
    } else {
      delete globalThis.window;
    }
  }
}

test("active l'upload edge par défaut quand aucun override n'est défini", () => {
  withWindow({ location: { hostname: "app.example.com" } }, () => {
    assert.equal(resolveSubjectAttachmentUploadTransportMode(), EDGE_UPLOAD_MODE.EDGE_ONLY);
  });
});

test("un host github.io ne désactive pas l'upload edge", () => {
  withWindow({ location: { hostname: "nicolbh.github.io" } }, () => {
    assert.equal(resolveSubjectAttachmentUploadTransportMode(), EDGE_UPLOAD_MODE.EDGE_ONLY);
  });
});

test("respecte un override explicite pour désactiver l'edge upload", () => {
  withWindow({
    location: { hostname: "nicolbh.github.io" },
    MDALL_CONFIG: { enableEdgeAttachmentUpload: false }
  }, () => {
    assert.equal(
      resolveSubjectAttachmentUploadTransportMode(),
      EDGE_UPLOAD_MODE.EDGE_WITH_DIRECT_FALLBACK
    );
  });
});
