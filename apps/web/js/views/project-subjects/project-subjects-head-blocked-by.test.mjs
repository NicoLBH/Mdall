import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSubjectsView } from "./project-subjects-view.js";

function buildView(overrides = {}) {
  const base = {
    getProjectSubjectLabels: () => ({
      getSubjectLabelDefinition: () => null,
      renderSubjectLabelBadge: () => ""
    }),
    firstNonEmpty: (...values) => values.find((value) => value !== undefined && value !== null && value !== "") || "",
    normalizeReviewState: (value = "") => String(value || "").toLowerCase(),
    normalizeVerdict: (value = "") => String(value || "").toLowerCase(),
    getEntityDisplayRef: (_entityType, entityId) => `#${entityId || ""}`,
    escapeHtml: (value) => String(value ?? ""),
    svgIcon: (name) => `<svg>${name}</svg>`,
    getBlockedBySubjects: () => [],
    getNestedSujet: () => ({ status: "open" }),
    getDecision: () => null,
    store: { user: null, projectForm: { collaborators: [] }, projectSubjectsView: {} }
  };

  const deps = new Proxy({ ...base, ...overrides }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => "";
    }
  });

  return createProjectSubjectsView(deps);
}

test("head: sujet ouvert bloqué par sujet ouvert affiche le badge Bloqué par", () => {
  const view = buildView({
    getBlockedBySubjects: () => [{ id: "A", title: "Sujet A" }],
    getNestedSujet: (subjectId) => ({ id: subjectId, status: "open" })
  });

  const html = view.renderSubjectBlockedByHeadHtml({ id: "B", title: "Sujet B" }, { compact: false });

  assert.match(html, /Bloqué par/);
  assert.match(html, /Sujet A/);
});

test("head: sujet ouvert bloqué uniquement par sujet fermé n'affiche pas le badge", () => {
  const view = buildView({
    getBlockedBySubjects: () => [{ id: "A", title: "Sujet A" }],
    getNestedSujet: (subjectId) => ({ id: subjectId, status: subjectId === "A" ? "closed" : "open" })
  });

  const html = view.renderSubjectBlockedByHeadHtml({ id: "B", title: "Sujet B" }, { compact: false });

  assert.equal(html, "");
});

test("head: sujet ouvert avec bloqueurs ouverts/fermés affiche un compteur basé sur les ouverts", () => {
  const view = buildView({
    getBlockedBySubjects: () => [
      { id: "A", title: "Sujet A" },
      { id: "C", title: "Sujet C" },
      { id: "D", title: "Sujet D" }
    ],
    getNestedSujet: (subjectId) => ({ id: subjectId, status: subjectId === "A" ? "closed_done" : "open" })
  });

  const html = view.renderSubjectBlockedByHeadHtml({ id: "B", title: "Sujet B" }, { compact: true });

  assert.match(html, /details-blocked-badge/);
  assert.match(html, />2</);
  assert.match(html, /Bloqué par 2 sujets/);
});

test("head: sujet fermé bloqué par sujet ouvert n'affiche jamais le badge", () => {
  const view = buildView({
    getBlockedBySubjects: () => [{ id: "A", title: "Sujet A" }],
    getNestedSujet: (subjectId) => ({ id: subjectId, status: subjectId === "B" ? "closed_review" : "open" })
  });

  const html = view.renderSubjectBlockedByHeadHtml({ id: "B", title: "Sujet B" }, { compact: false });

  assert.equal(html, "");
});
