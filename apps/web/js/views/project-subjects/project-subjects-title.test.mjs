import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSubjectsTitle } from "./project-subjects-title.js";

function createRootWithInput(value = "") {
  const input = { value };
  return {
    querySelector: (selector) => selector === "[data-subject-title-draft]" ? input : null
  };
}

test("subject title edit: Enter with unchanged draft cancels edit", async () => {
  const store = { projectSubjectsView: {} };
  let rerenderCount = 0;
  let updateCalls = 0;

  const api = createProjectSubjectsTitle({
    store,
    ensureViewUiState: () => { store.projectSubjectsView ||= {}; },
    currentDecisionTarget: () => ({ type: "sujet", id: "subject-1", item: { id: "subject-1", title: "Titre initial" } }),
    getSelectionEntityType: (type) => type,
    getEntityByType: () => ({ id: "subject-1", title: "Titre initial" }),
    rerenderScope: () => { rerenderCount += 1; },
    updateSubjectTitle: async () => { updateCalls += 1; return {}; }
  });

  const root = createRootWithInput("Titre initial");
  assert.equal(api.startSubjectTitleEdit(root), true);
  api.syncSubjectTitleDraft(root);
  await api.applySubjectTitleSave(root);

  const editState = api.getSubjectTitleEditState();
  assert.equal(editState.entityType, null);
  assert.equal(editState.entityId, null);
  assert.equal(updateCalls, 0);
  assert.ok(rerenderCount >= 2);
});

test("subject title edit: Enter with changed draft saves via RPC", async () => {
  const store = { projectSubjectsView: {} };
  const targetItem = { id: "subject-2", title: "Ancien titre", raw: { title: "Ancien titre" } };
  const rpcCalls = [];

  const api = createProjectSubjectsTitle({
    store,
    ensureViewUiState: () => { store.projectSubjectsView ||= {}; },
    currentDecisionTarget: () => ({ type: "sujet", id: "subject-2", item: targetItem }),
    getSelectionEntityType: (type) => type,
    getEntityByType: () => targetItem,
    rerenderScope: () => {},
    updateSubjectTitle: async (payload) => {
      rpcCalls.push(payload);
      return {
        id: "subject-2",
        project_id: "project-1",
        title: "Nouveau titre",
        normalized_title: "nouveau titre",
        updated_at: "2026-04-21T10:00:00.000Z"
      };
    }
  });

  api.startSubjectTitleEdit(createRootWithInput("Ancien titre"));
  const editState = api.getSubjectTitleEditState();
  editState.draft = "Nouveau titre";
  await api.applySubjectTitleSave({ querySelector: () => null });

  assert.equal(rpcCalls.length, 1);
  assert.deepEqual(rpcCalls[0], { subjectId: "subject-2", title: "Nouveau titre" });
  assert.equal(targetItem.title, "Nouveau titre");
  assert.equal(targetItem.raw.title, "Nouveau titre");
});

test("subject title edit: local canonical mutation updates subjectsById entry", () => {
  const store = {
    projectSubjectsView: {
      rawSubjectsResult: {
        subjectsById: {
          "subject-3": {
            id: "subject-3",
            title: "Avant",
            raw: { title: "Avant" }
          }
        }
      },
      subjectsData: [
        {
          id: "situation-1",
          sujets: [
            { id: "subject-3", title: "Avant", raw: { title: "Avant" } }
          ]
        }
      ]
    }
  };

  const api = createProjectSubjectsTitle({
    store,
    ensureViewUiState: () => {},
    currentDecisionTarget: () => null,
    getSelectionEntityType: (type) => type,
    getEntityByType: () => null,
    rerenderScope: () => {},
    updateSubjectTitle: async () => ({})
  });

  api.applySubjectTitleToLocalState("subject-3", {
    title: "Après",
    normalized_title: "apres",
    updated_at: "2026-04-21T11:00:00.000Z"
  });

  assert.equal(store.projectSubjectsView.rawSubjectsResult.subjectsById["subject-3"].title, "Après");
  assert.equal(store.projectSubjectsView.rawSubjectsResult.subjectsById["subject-3"].raw.title, "Après");
  assert.equal(store.projectSubjectsView.subjectsData[0].sujets[0].title, "Après");
});
