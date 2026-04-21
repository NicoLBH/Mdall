import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSubjectsDescription } from "./project-subjects-description.js";

function installFakeDom(anchorByKey = {}) {
  const fakeNodesById = new Map();
  globalThis.window = { innerWidth: 1200, innerHeight: 900 };
  globalThis.CSS = { escape: (value) => String(value || "") };
  globalThis.document = {
    body: {
      appendChild: (node) => {
        if (node?.id) fakeNodesById.set(node.id, node);
        return node;
      }
    },
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
    querySelector: (selector) => {
      const match = String(selector || "").match(/data-description-versions-anchor=\"([^\"]+)\"/);
      return match ? anchorByKey[match[1]] || null : null;
    }
  };
}

function cleanupFakeDom() {
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.CSS;
}

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

test("description versions: en dropdown ouvert, un changement de ticket recharge la bonne cible", async () => {
  const fakeAnchors = {
    "sujet::subject-1": { getBoundingClientRect: () => ({ top: 100, right: 320, bottom: 140, left: 260, width: 60, height: 40 }) },
    "sujet::subject-2": { getBoundingClientRect: () => ({ top: 120, right: 340, bottom: 160, left: 280, width: 60, height: 40 }) }
  };
  installFakeDom(fakeAnchors);

  const store = { user: { id: "u1" }, projectForm: { collaborators: [] }, projectSubjectsView: {}, situationsView: {} };
  const runBucketState = { descriptions: { sujet: {}, situation: {} } };
  let selectedSubjectId = "subject-1";
  const loads = [];

  const api = createProjectSubjectsDescription({
    store,
    ensureViewUiState: () => { store.projectSubjectsView ||= {}; },
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
    currentDecisionTarget: () => ({ type: "sujet", id: selectedSubjectId, item: { id: selectedSubjectId } }),
    rerenderScope: () => {},
    markEntityValidated: () => {},
    updateSubjectDescription: async () => ({}),
    loadSubjectDescriptionVersions: async (subjectId) => {
      loads.push(subjectId);
      return [{
        id: `v-${subjectId}`,
        actor_user_id: "",
        actor_person_id: "",
        actor_name: "Mdall",
        actor_is_system: true,
        description_markdown: `${subjectId}-markdown`,
        created_at: new Date().toISOString()
      }];
    }
  });

  api.toggleDescriptionVersionsDropdown({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(loads, ["subject-1"]);

  selectedSubjectId = "subject-2";
  api.renderDescriptionVersionsDropdownHost({ querySelector: () => fakeAnchors[`sujet::${selectedSubjectId}`] });
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.renderDescriptionVersionsDropdownHost({ querySelector: () => fakeAnchors[`sujet::${selectedSubjectId}`] });

  assert.deepEqual(loads, ["subject-1", "subject-2"]);
  assert.equal(store.projectSubjectsView.descriptionVersionsUi.entityId, "subject-2");
  const hostHtml = globalThis.document.getElementById("descriptionVersionsDropdownHost")?.innerHTML || "";
  assert.match(hostHtml, /subject-2-markdown|Mdall/);
  assert.doesNotMatch(hostHtml, /subject-1-markdown/);
  assert.equal(store.projectSubjectsView.descriptionVersionsUi.selectedVersionId, "v-subject-2");

  cleanupFakeDom();
});

test("description versions: dropdown fermé puis changement de sujet charge directement la nouvelle cible à l'ouverture", async () => {
  const fakeAnchors = {
    "sujet::subject-a": { getBoundingClientRect: () => ({ top: 100, right: 320, bottom: 140, left: 260, width: 60, height: 40 }) },
    "sujet::subject-b": { getBoundingClientRect: () => ({ top: 100, right: 340, bottom: 140, left: 280, width: 60, height: 40 }) }
  };
  installFakeDom(fakeAnchors);

  const store = { user: { id: "u1" }, projectForm: { collaborators: [] }, projectSubjectsView: {}, situationsView: {} };
  let selectedSubjectId = "subject-a";
  const loads = [];
  const api = createProjectSubjectsDescription({
    store,
    ensureViewUiState: () => { store.projectSubjectsView ||= {}; },
    firstNonEmpty: (...values) => values.find((value) => String(value ?? "").trim()) || "",
    escapeHtml: (value) => String(value ?? ""),
    svgIcon: () => "",
    mdToHtml: (value) => String(value || ""),
    fmtTs: () => "20/04/2026",
    nowIso: () => new Date().toISOString(),
    setOverlayChromeOpenState: () => {},
    SVG_AVATAR_HUMAN: "",
    renderCommentComposer: () => "",
    getRunBucket: () => ({ bucket: { descriptions: { sujet: {}, situation: {} } } }),
    persistRunBucket: () => {},
    getSelectionEntityType: (type) => type,
    getEntityByType: (type, id) => ({ id, title: `${type}-${id}`, raw: { description: "Description" } }),
    getEntityReviewMeta: () => ({}),
    setEntityReviewMeta: () => {},
    currentDecisionTarget: () => ({ type: "sujet", id: selectedSubjectId, item: { id: selectedSubjectId } }),
    rerenderScope: () => {},
    markEntityValidated: () => {},
    updateSubjectDescription: async () => ({}),
    loadSubjectDescriptionVersions: async (subjectId) => {
      loads.push(subjectId);
      return [{ id: `v-${subjectId}`, actor_name: subjectId, description_markdown: subjectId, created_at: new Date().toISOString() }];
    }
  });

  api.toggleDescriptionVersionsDropdown({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.toggleDescriptionVersionsDropdown({});

  selectedSubjectId = "subject-b";
  api.toggleDescriptionVersionsDropdown({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.renderDescriptionVersionsDropdownHost({ querySelector: () => fakeAnchors[`sujet::${selectedSubjectId}`] });

  assert.deepEqual(loads, ["subject-a", "subject-b"]);
  assert.equal(store.projectSubjectsView.descriptionVersionsUi.entityId, "subject-b");
  assert.match(globalThis.document.getElementById("descriptionVersionsDropdownHost")?.innerHTML || "", /subject-b/);
  assert.doesNotMatch(globalThis.document.getElementById("descriptionVersionsDropdownHost")?.innerHTML || "", /subject-a/);

  cleanupFakeDom();
});

test("description versions: une réponse tardive de A est ignorée après passage à B", async () => {
  const fakeAnchors = {
    "sujet::A": { getBoundingClientRect: () => ({ top: 100, right: 320, bottom: 140, left: 260, width: 60, height: 40 }) },
    "sujet::B": { getBoundingClientRect: () => ({ top: 120, right: 340, bottom: 160, left: 280, width: 60, height: 40 }) }
  };
  installFakeDom(fakeAnchors);

  const store = { user: { id: "u1" }, projectForm: { collaborators: [] }, projectSubjectsView: {}, situationsView: {} };
  let selectedSubjectId = "A";
  const deferred = new Map();
  const api = createProjectSubjectsDescription({
    store,
    ensureViewUiState: () => { store.projectSubjectsView ||= {}; },
    firstNonEmpty: (...values) => values.find((value) => String(value ?? "").trim()) || "",
    escapeHtml: (value) => String(value ?? ""),
    svgIcon: () => "",
    mdToHtml: (value) => String(value || ""),
    fmtTs: () => "20/04/2026",
    nowIso: () => new Date().toISOString(),
    setOverlayChromeOpenState: () => {},
    SVG_AVATAR_HUMAN: "",
    renderCommentComposer: () => "",
    getRunBucket: () => ({ bucket: { descriptions: { sujet: {}, situation: {} } } }),
    persistRunBucket: () => {},
    getSelectionEntityType: (type) => type,
    getEntityByType: (type, id) => ({ id, title: `${type}-${id}`, raw: { description: "Description" } }),
    getEntityReviewMeta: () => ({}),
    setEntityReviewMeta: () => {},
    currentDecisionTarget: () => ({ type: "sujet", id: selectedSubjectId, item: { id: selectedSubjectId } }),
    rerenderScope: () => {},
    markEntityValidated: () => {},
    updateSubjectDescription: async () => ({}),
    loadSubjectDescriptionVersions: async (subjectId) => {
      return await new Promise((resolve) => {
        deferred.set(subjectId, resolve);
      });
    }
  });

  api.toggleDescriptionVersionsDropdown({});
  selectedSubjectId = "B";
  api.renderDescriptionVersionsDropdownHost({ querySelector: () => fakeAnchors["sujet::B"] });
  deferred.get("B")?.([{ id: "v-B", actor_name: "B", description_markdown: "B", created_at: new Date().toISOString() }]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  deferred.get("A")?.([{ id: "v-A", actor_name: "A", description_markdown: "A", created_at: new Date().toISOString() }]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.renderDescriptionVersionsDropdownHost({ querySelector: () => fakeAnchors["sujet::B"] });

  const hostHtml = globalThis.document.getElementById("descriptionVersionsDropdownHost")?.innerHTML || "";
  assert.match(hostHtml, /v-B|>B</);
  assert.doesNotMatch(hostHtml, /v-A|>A</);
  assert.equal(store.projectSubjectsView.descriptionVersionsUi.entityId, "B");
  assert.equal(store.projectSubjectsView.descriptionVersionsUi.selectedVersionId, "v-B");

  cleanupFakeDom();
});

test("description versions: la version système affiche Heimdall sans fallback bitmap", async () => {
  installFakeDom({
    "sujet::subject-1": { getBoundingClientRect: () => ({ top: 100, right: 320, bottom: 140, left: 260, width: 60, height: 40 }) }
  });
  const store = { user: { id: "u1" }, projectForm: { collaborators: [] }, projectSubjectsView: {}, situationsView: {} };
  const api = createProjectSubjectsDescription({
    store,
    ensureViewUiState: () => { store.projectSubjectsView ||= {}; },
    firstNonEmpty: (...values) => values.find((value) => String(value ?? "").trim()) || "",
    escapeHtml: (value) => String(value ?? ""),
    svgIcon: (name) => `<svg data-icon="${name}"></svg>`,
    mdToHtml: (value) => String(value || ""),
    fmtTs: () => "20/04/2026",
    nowIso: () => new Date().toISOString(),
    setOverlayChromeOpenState: () => {},
    SVG_AVATAR_HUMAN: "",
    renderCommentComposer: () => "",
    getRunBucket: () => ({ bucket: { descriptions: { sujet: {}, situation: {} } } }),
    persistRunBucket: () => {},
    getSelectionEntityType: (type) => type,
    getEntityByType: (type, id) => ({ id, title: `${type}-${id}`, raw: { description: "Description" } }),
    getEntityReviewMeta: () => ({}),
    setEntityReviewMeta: () => {},
    currentDecisionTarget: () => ({ type: "sujet", id: "subject-1", item: { id: "subject-1" } }),
    rerenderScope: () => {},
    markEntityValidated: () => {},
    updateSubjectDescription: async () => ({}),
    loadSubjectDescriptionVersions: async () => [{
      id: "v1",
      actor_name: "Mdall",
      actor_is_system: true,
      actor_user_id: "",
      actor_person_id: "",
      description_markdown: "system",
      created_at: new Date().toISOString()
    }]
  });

  api.toggleDescriptionVersionsDropdown({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.renderDescriptionVersionsDropdownHost({ querySelector: () => ({ getBoundingClientRect: () => ({ top: 100, right: 320, bottom: 140, left: 260, width: 60, height: 40 }) }) });
  const hostHtml = globalThis.document.getElementById("descriptionVersionsDropdownHost")?.innerHTML || "";
  assert.match(hostHtml, /icons\.svg#heimdall/);
  assert.doesNotMatch(hostHtml, /avatar-entreprise\.jfif/);

  cleanupFakeDom();
});

test("description versions: l'auteur de la carte est réaligné sur la dernière version chargée", async () => {
  installFakeDom({
    "sujet::subject-1": { getBoundingClientRect: () => ({ top: 100, right: 320, bottom: 140, left: 260, width: 60, height: 40 }) }
  });
  const runBucketState = {
    descriptions: {
      sujet: {
        "subject-1": {
          body: "Description initiale",
          author: "Ancien auteur",
          agent: "human",
          avatar_type: "human",
          avatar_initial: "A"
        }
      },
      situation: {}
    }
  };
  const store = { user: { id: "u1" }, projectForm: { collaborators: [] }, projectSubjectsView: {}, situationsView: {} };
  const api = createProjectSubjectsDescription({
    store,
    ensureViewUiState: () => { store.projectSubjectsView ||= {}; },
    firstNonEmpty: (...values) => values.find((value) => String(value ?? "").trim()) || "",
    escapeHtml: (value) => String(value ?? ""),
    svgIcon: (name) => `<svg data-icon="${name}"></svg>`,
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
    rerenderScope: () => {},
    markEntityValidated: () => {},
    updateSubjectDescription: async () => ({}),
    loadSubjectDescriptionVersions: async () => [{
      id: "v-last",
      actor_name: "Nouveau Auteur",
      actor_user_id: "u2",
      actor_person_id: "p2",
      description_markdown: "new",
      created_at: new Date().toISOString()
    }]
  });

  api.toggleDescriptionVersionsDropdown({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  const html = api.renderDescriptionCard({
    type: "sujet",
    item: { id: "subject-1", title: "Sujet", raw: { description: "Description initiale" } }
  });
  assert.match(html, /Nouveau Auteur/);
  assert.doesNotMatch(html, /Ancien auteur/);

  cleanupFakeDom();
});

test("description card: précharge les versions et affiche un spinner auteur en attendant", async () => {
  installFakeDom({
    "sujet::subject-1": { getBoundingClientRect: () => ({ top: 100, right: 320, bottom: 140, left: 260, width: 60, height: 40 }) }
  });
  const runBucketState = { descriptions: { sujet: {}, situation: {} } };
  let deferredResolve;
  let loadCalls = 0;
  const store = { user: { id: "u1" }, projectForm: { collaborators: [] }, projectSubjectsView: {}, situationsView: {} };
  const api = createProjectSubjectsDescription({
    store,
    ensureViewUiState: () => { store.projectSubjectsView ||= {}; },
    firstNonEmpty: (...values) => values.find((value) => String(value ?? "").trim()) || "",
    escapeHtml: (value) => String(value ?? ""),
    svgIcon: (name) => `<svg data-icon="${name}"></svg>`,
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
    rerenderScope: () => {},
    markEntityValidated: () => {},
    updateSubjectDescription: async () => ({}),
    loadSubjectDescriptionVersions: async () => {
      loadCalls += 1;
      return await new Promise((resolve) => {
        deferredResolve = resolve;
      });
    }
  });

  const htmlBefore = api.renderDescriptionCard({
    type: "sujet",
    item: { id: "subject-1", title: "Sujet", raw: { description: "Description initiale" } }
  });
  assert.equal(loadCalls, 1);
  assert.match(htmlBefore, /Chargement auteur…/);
  assert.match(htmlBefore, /data-icon="attachment-upload-spinner"/);

  deferredResolve?.([{
    id: "v-last",
    actor_name: "Dernier Auteur",
    actor_user_id: "u9",
    actor_person_id: "p9",
    description_markdown: "new",
    created_at: new Date().toISOString()
  }]);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const htmlAfter = api.renderDescriptionCard({
    type: "sujet",
    item: { id: "subject-1", title: "Sujet", raw: { description: "Description initiale" } }
  });
  assert.match(htmlAfter, /Dernier Auteur/);
  assert.doesNotMatch(htmlAfter, /Chargement auteur…/);

  cleanupFakeDom();
});
