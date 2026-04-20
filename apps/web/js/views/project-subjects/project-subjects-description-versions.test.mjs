import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSubjectsDescription } from "./project-subjects-description.js";

test("description versions: un rerender pendant le chargement ne bloque pas isLoading", async () => {
  const fakeNodesById = new Map();
  const fakeAnchor = {
    getBoundingClientRect: () => ({ top: 100, right: 320, bottom: 140, left: 260, width: 60, height: 40 })
  };
  const fakeBody = {
    appendChild: (node) => {
      if (node?.id) fakeNodesById.set(node.id, node);
      return node;
    }
  };
  globalThis.window = {
    innerWidth: 1200,
    innerHeight: 900
  };
  globalThis.CSS = { escape: (value) => String(value || "") };
  globalThis.document = {
    body: fakeBody,
    documentElement: { clientWidth: 1200, clientHeight: 900 },
    createElement: () => ({
      id: "",
      className: "",
      style: {},
      innerHTML: "",
      attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
      querySelector: () => null
    }),
    getElementById: (id) => fakeNodesById.get(id) || null,
    querySelector: (selector) => String(selector || "").includes("data-description-versions-anchor") ? fakeAnchor : null
  };

  const store = {
    user: { id: "user-1", avatar: "" },
    projectForm: { collaborators: [] },
    projectSubjectsView: {},
    situationsView: {}
  };

  const runBucketState = { descriptions: { sujet: {}, situation: {} } };
  let deferredResolve;
  let loadCalls = 0;
  let simulatedInterruptionDone = false;

  const api = createProjectSubjectsDescription({
    store,
    ensureViewUiState: () => {
      store.projectSubjectsView ||= {};
    },
    firstNonEmpty: (...values) => values.find((value) => String(value ?? "").trim()) || "",
    escapeHtml: (value) => String(value ?? ""),
    svgIcon: () => "",
    mdToHtml: (value) => String(value || ""),
    fmtTs: () => "20/04/2026",
    nowIso: () => new Date().toISOString(),
    setOverlayChromeOpenState: () => {},
    SVG_AVATAR_HUMAN: "",
    renderCommentComposer: () => "",
    getRunBucket: () => ({ bucket: runBucketState }),
    persistRunBucket: (updater) => updater(runBucketState),
    getSelectionEntityType: (type) => type,
    getEntityByType: (type, id) => ({ id, title: `${type}-${id}`, raw: { description: "Description" } }),
    getEntityReviewMeta: () => ({}),
    setEntityReviewMeta: () => {},
    currentDecisionTarget: () => ({ type: "sujet", id: "subject-1", item: { id: "subject-1" } }),
    rerenderScope: () => {
      // Simule un rerender qui relit l'état au milieu du await.
      if (simulatedInterruptionDone) return;
      simulatedInterruptionDone = true;
      api.closeDescriptionVersionsDropdown();
    },
    markEntityValidated: () => {},
    updateSubjectDescription: async () => ({}),
    loadSubjectDescriptionVersions: async () => {
      loadCalls += 1;
      return await new Promise((resolve) => {
        deferredResolve = resolve;
      });
    }
  });

  api.toggleDescriptionVersionsDropdown({});
  deferredResolve?.([
    {
      id: "v1",
      actor_user_id: "user-1",
      actor_person_id: "person-1",
      actor_first_name: "Ada",
      actor_last_name: "Lovelace",
      actor_name: "Ada Lovelace",
      description_markdown: "Version 1",
      created_at: new Date(Date.now() - 60_000).toISOString()
    }
  ]);

  await new Promise((resolve) => setTimeout(resolve, 0));

  const versionsUi = store.projectSubjectsView.descriptionVersionsUi;
  assert.equal(loadCalls, 1);
  assert.equal(versionsUi.isLoading, false);
  assert.equal(versionsUi.versions.length, 1);

  api.toggleDescriptionVersionsDropdown({});
  const root = {
    querySelector: () => fakeAnchor
  };
  const html = api.renderDescriptionCard({
    type: "sujet",
    item: { id: "subject-1", title: "Sujet", raw: { description: "Description" } }
  });
  api.renderDescriptionVersionsDropdownHost(root);
  const hostHtml = (globalThis.document?.getElementById?.("descriptionVersionsDropdownHost")?.innerHTML || "");

  assert.match(html, /Versions \(1\)/);
  assert.doesNotMatch(hostHtml, /Chargement des versions/);
  assert.match(hostHtml, /Ada Lovelace/);
  assert.match(hostHtml, /il y a/);

  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.CSS;
});
