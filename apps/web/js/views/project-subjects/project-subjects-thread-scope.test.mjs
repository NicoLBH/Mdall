import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createProjectSubjectsThread } from "./project-subjects-thread.js";
import { createProjectSubjectsDetailsRenderer } from "./project-subjects-details-renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createThreadHarness({ activeSelection, drilldownSelection, subjectMessagesService, scheduleThreadRerender } = {}) {
  const store = {
    user: {},
    projectForm: { collaborators: [] },
    situationsView: {
      rawResult: {},
      commentDraft: "",
      commentPreviewMode: false
    }
  };
  return createProjectSubjectsThread({
    store,
    ensureViewUiState: () => store.situationsView,
    firstNonEmpty: (...values) => values.find((value) => value !== undefined && value !== null && value !== "") || "",
    nowIso: () => "2026-01-01T00:00:00.000Z",
    fmtTs: (value) => String(value || ""),
    mdToHtml: (value) => String(value || ""),
    escapeHtml: (value) => String(value || ""),
    svgIcon: () => "",
    SVG_AVATAR_HUMAN: "",
    SVG_ISSUE_CLOSED: "",
    SVG_ISSUE_REOPENED: "",
    SVG_TL_CLOSED: "",
    SVG_TL_REOPENED: "",
    renderGhActionButton: () => "",
    renderMessageThread: ({ itemsHtml }) => itemsHtml,
    renderMessageThreadComment: () => "",
    renderMessageThreadActivity: () => "",
    renderMessageThreadEvent: () => "",
    renderCommentComposer: () => "",
    renderReviewStateIcon: () => "",
    getRunBucket: () => ({ bucket: { comments: [], activities: [], decisions: {} } }),
    persistRunBucket: () => {},
    getEntityByType: () => null,
    getActiveSelection: () => activeSelection || null,
    getDrilldownSelection: () => drilldownSelection || null,
    getSelectionEntityType: () => "sujet",
    getSituationBySujetId: () => null,
    getNestedSujet: () => null,
    getEffectiveSujetStatus: () => "open",
    getEffectiveSituationStatus: () => "open",
    subjectMessagesService,
    requestRerender: () => {},
    scheduleThreadRerender: scheduleThreadRerender || (() => {}),
    entityDisplayLinkHtml: () => "",
    inferAgent: () => "system",
    normActorName: () => "System",
    miniAuthorIconHtml: () => ""
  });
}

test("renderDetailsDiscussionHtml scope le thread/composer sur la sélection explicitement fournie", () => {
  const calls = [];
  const renderer = createProjectSubjectsDetailsRenderer({
    getActiveSelection: () => ({ type: "sujet", item: { id: "A" } }),
    getSelectionEntityType: () => "sujet",
    getEffectiveSujetStatus: () => "open",
    getEffectiveSituationStatus: () => "open",
    getEntityReviewMeta: () => ({ review_state: "pending" }),
    getReviewTitleStateClass: () => "",
    getSubjectTitleEditState: () => ({}),
    isEditingSubjectTitle: () => false,
    entityDisplayLinkHtml: () => "",
    problemsCountsHtml: () => "",
    renderSubjectBlockedByHeadHtml: () => "",
    renderSubjectParentHeadHtml: () => "",
    firstNonEmpty: (...values) => values.find((value) => value !== undefined && value !== null && value !== "") || "",
    escapeHtml: (value) => String(value || ""),
    statePill: () => "",
    renderDescriptionCard: () => "",
    renderSubIssuesForSujet: () => "",
    renderSubIssuesForSituation: () => "",
    renderThreadBlock: (selection, options) => {
      calls.push({ type: "thread", selectionId: selection?.item?.id, host: options?.scopeHost });
      return `<thread-${selection?.item?.id}>`;
    },
    renderCommentBox: (selection, options) => {
      calls.push({ type: "composer", selectionId: selection?.item?.id, host: options?.scopeHost });
      return `<composer-${selection?.item?.id}>`;
    },
    renderDetailedMetaForSelection: () => "",
    renderSubjectMetaControls: () => "",
    priorityBadge: () => "",
    renderDocumentRefsCard: () => ""
  });

  const drilldownSelection = { type: "sujet", item: { id: "B" } };
  const discussion = renderer.renderDetailsDiscussionHtml(drilldownSelection, { scopeHost: "drilldown" });

  assert.match(discussion.threadHtml, /thread-B/);
  assert.match(discussion.composerHtml, /composer-B/);
  assert.deepEqual(calls, [
    { type: "thread", selectionId: "B", host: "drilldown" },
    { type: "composer", selectionId: "B", host: "drilldown" }
  ]);
});

test("renderDetailsBody n'utilise pas de variable subissue fantôme et injecte le footer via renderDescriptionCard", () => {
  const captured = [];
  const renderer = createProjectSubjectsDetailsRenderer({
    getActiveSelection: () => ({ type: "sujet", item: { id: "S1", title: "Sujet 1" } }),
    getSelectionEntityType: () => "sujet",
    getEffectiveSujetStatus: () => "open",
    getEffectiveSituationStatus: () => "open",
    getEntityReviewMeta: () => ({ review_state: "pending" }),
    getReviewTitleStateClass: () => "",
    getSubjectTitleEditState: () => ({}),
    isEditingSubjectTitle: () => false,
    entityDisplayLinkHtml: () => "",
    problemsCountsHtml: () => "",
    renderSubjectBlockedByHeadHtml: () => "",
    renderSubjectParentHeadHtml: () => "",
    firstNonEmpty: (...values) => values.find((value) => value !== undefined && value !== null && value !== "") || "",
    escapeHtml: (value) => String(value || ""),
    statePill: () => "",
    renderDescriptionCard: (_selection, options = {}) => {
      captured.push(String(options.footerActionsHtml || ""));
      return "<description-card />";
    },
    renderSubIssuesForSujet: () => "",
    renderSubIssuesForSituation: () => "",
    getChildSubjectList: () => [],
    renderAddSubissueActionButton: () => "<add-subissue-action />",
    renderThreadBlock: () => "",
    renderCommentBox: () => "",
    renderDetailedMetaForSelection: () => "",
    renderSubjectMetaControls: () => "",
    priorityBadge: () => "",
    renderDocumentRefsCard: () => ""
  });

  const details = renderer.renderDetailsHtml({ type: "sujet", item: { id: "S1", title: "Sujet 1" } });
  assert.match(details.bodyHtml, /<description-card \/>/);
  assert.equal(captured.length, 1);
  assert.match(captured[0], /<add-subissue-action \/>/);
});

test("ensureTimelineLoadedForSelection charge le subjectId de la sélection fournie", async () => {
  const loadedSubjectIds = [];
  const rerenderHosts = [];
  const thread = createThreadHarness({
    activeSelection: { type: "sujet", item: { id: "A" } },
    subjectMessagesService: {
      listTimeline: async (subjectId) => {
        loadedSubjectIds.push(subjectId);
        return { rows: [], messages: [], events: [], businessEvents: [] };
      }
    },
    scheduleThreadRerender: ({ scopeHost } = {}) => {
      rerenderHosts.push(scopeHost || "main");
    }
  });

  thread.ensureTimelineLoadedForSelection({ type: "sujet", item: { id: "B" } }, { scopeHost: "drilldown" });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(loadedSubjectIds, ["B"]);
  assert.deepEqual(rerenderHosts, ["drilldown"]);
});

test("getThreadForSelection(selection) utilise la sélection fournie et pas la sélection active", async () => {
  const thread = createThreadHarness({
    activeSelection: { type: "sujet", item: { id: "A" } },
    subjectMessagesService: {
      listTimeline: async (subjectId) => ({
        rows: [
          {
            kind: "message",
            message: {
              id: `msg-${subjectId}`,
              subject_id: subjectId,
              body_markdown: `Message ${subjectId}`,
              created_at: "2026-01-01T00:00:00.000Z"
            }
          }
        ],
        messages: [],
        events: [],
        businessEvents: []
      })
    }
  });

  thread.ensureTimelineLoadedForSelection({ type: "sujet", item: { id: "B" } });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const entries = thread.getThreadForSelection({ type: "sujet", item: { id: "B" } });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.entity_id, "B");
  assert.equal(entries[0]?.message, "Message B");
});

test("rerender scoped drilldown n'écrase pas le host principal (protection câblée dans la vue)", () => {
  const viewPath = path.resolve(__dirname, "./project-subjects-view.js");
  const source = fs.readFileSync(viewPath, "utf8");

  assert.match(source, /isDrilldownScopeRoot && drilldownBody && \(isThreadScopeRoot \|\| isComposerScopeRoot\)/);
  assert.match(source, /renderDetailsDiscussionScopes\(drilldownBody, \{/);
  assert.match(source, /selectionOverride: getSelectionForScope\("drilldown"\)/);
});
