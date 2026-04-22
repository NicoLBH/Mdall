import { getDisplayAuthorName, getAuthorIdentity } from "../ui/author-identity.js";
import { renderProblemsCountsIconHtml } from "../ui/subissues-counts.js";
import { formatObjectiveDueDateLabel } from "./project-subject-milestones.js";
import {
  findCollaboratorByAssigneeId,
  normalizeAssigneeIds,
  resolveSubjectAssigneeIds
} from "../../services/subject-assignees-service.js";
import {
  createSelectDropdownController,
  ensureSelectDropdownHost,
  getSubjectSelectDropdownScopeRoot,
  renderSelectDropdownHost,
  syncSelectDropdownPosition
} from "../ui/select-dropdown-controller.js";
import { extractStructuredMentions } from "../../utils/subject-mentions.js";
import { renderCommentComposer } from "../ui/comment-composer.js";
import { renderSubjectMarkdownToolbar } from "../ui/subject-rich-editor.js";
export function createProjectSubjectsView(deps) {
  const {
    store,
    DRAFT_SUBJECT_ID,
    DEFAULT_PROJECT_PHASES,
    SVG_ISSUE_OPEN,
    SVG_ISSUE_CLOSED,
    SVG_AVATAR_HUMAN,
    ensureViewUiState,
    getSubjectsViewState,
    currentRunKey,
    getRunBucket,
    persistRunBucket,
    escapeHtml,
    svgIcon,
    renderGhActionButton,
    renderProjectTableToolbar,
    renderProjectTableToolbarGroup,
    renderProjectTableToolbarSearch,
    renderIssuesTable,
    renderSubIssuesTable,
    renderSubIssuesPanel,
    renderDataTableHead,
    renderDataTableEmptyState,
    renderTableHeadFilterToggle,
    renderStatusBadge,
    renderStateDot,
    normalizeVerdict,
    normalizeReviewState,
    getSelectionDocumentRefs,
    renderSelectMenuSection,
    mdToHtml,
    firstNonEmpty,
    nowIso,
    fmtTs,
    getDecision,
    getEntityDescriptionState,
    setEntityDescriptionState,
    getEntityReviewMeta,
    getReviewTitleStateClass,
    getNestedSituation,
    getNestedSujet,
    getSituationSubjects,
    getChildSubjects,
    getBlockedBySubjects,
    getBlockingSubjects,
    getFilteredStandaloneSubjects,
    getFilteredFlatSubjects,
    getCurrentSubjectsStatusFilter,
    getCurrentSubjectsPriorityFilter,
    sujetMatchesStatusFilter,
    sujetMatchesPriorityFilter,
    getAvailableSubjectPriorities,
    getSubjectsStatusCounts,
    getProjectSubjectMilestones,
    getProjectSubjectLabels,
    getProjectSubjectDetail,
    getProjectSubjectDrilldown,
    ensureProjectCollaboratorsLoaded,
    resetObjectiveEditState,
    loadExistingSubjectsForCurrentProject,
    getSubjectsCurrentRoot,
    getFilteredSituations,
    getVisibleCounts,
    renderProjectSubjectsTable,
    wireDetailsInteractive,
    bindDetailsScroll,
    refreshProjectShellChrome,
    setProjectCompactEnabled,
    currentDecisionTarget,
    addComment,
    getSelectionForScope,
    getScopedSelection,
    ensureTimelineLoadedForSelection,
    createManualSubject,
    replaceSubjectAssigneesInSupabase,
    replaceSubjectLabelsInSupabase,
    replaceSubjectSituationsInSupabase,
    replaceSubjectObjectivesInSupabase,
    updateSubjectDescriptionInSupabase,
    uploadAttachmentFile
  } = deps;

  const {
    getSubjectLabelDefinition,
    renderSubjectLabelBadge
  } = getProjectSubjectLabels();

  let collaboratorsHydrationInFlight = false;

function issueIcon(status = "open", options = {}) {
  const {
    reviewState = "pending",
    entityType = "",
    isSeen = false
  } = options;

  const normalizedReview = normalizeReviewState(reviewState);
  if (normalizedReview === "rejected" || normalizedReview === "dismissed") {
    const svg = svgIcon("skip", { style: "color: rgb(145, 152, 161)" });
    return `<span class="issue-status-icon" aria-hidden="true">${svg}</span>`;
  }

  const isOpen = normalizeIssueLifecycleStatus(status) !== "closed";
  const svg = isOpen
    ? svgIcon("issue-opened", { style: "color: var(--fgColor-open)" })
    : svgIcon("check-circle", { style: "color: var(--fgColor-done)" });

  return `<span class="issue-status-icon" aria-hidden="true">${svg}</span>`;
}

function normalizeBackendPriority(priority = "") {
  const raw = String(priority ?? "").trim();
  if (!raw) return "";
  const value = raw.toLowerCase();
  if (value === "hight") return "high";
  if (["low", "medium", "high", "critical"].includes(value)) return value;
  if (value === "p1") return "critical";
  if (value === "p2") return "high";
  if (value === "p3") return "medium";
  return value;
}

function priorityBadge(priority = "medium") {
  const normalized = normalizeBackendPriority(priority) || "medium";
  return renderStatusBadge({
    label: normalized,
    tone: normalized
  });
}


function normalizeIssueLifecycleStatus(status = "open") {
  const normalized = String(status || "open").toLowerCase();
  return normalized.startsWith("closed") ? "closed" : "open";
}

function statePill(status = "open", options = {}) {
  const {
    reviewState = "pending",
    entityType = ""
  } = options;

  const normalizedReview = normalizeReviewState(reviewState);
  if (normalizedReview === "rejected" || normalizedReview === "dismissed") {
    const rejectedIcon = svgIcon("skip", { style: "color: #fff" });
    return `<span class="gh-state gh-state--rejected"><span class="gh-state-dot" aria-hidden="true">${rejectedIcon}</span>Rejected</span>`;
  }

  const isOpen = normalizeIssueLifecycleStatus(status) !== "closed";
  return `<span class="gh-state ${isOpen ? "gh-state--open" : "gh-state--closed"}"><span class="gh-state-dot" aria-hidden="true">${isOpen ? SVG_ISSUE_OPEN : SVG_ISSUE_CLOSED}</span>${isOpen ? "Open" : "Closed"}</span>`;
}

function chevron(isOpen, isVisible = true) {
  if (!isVisible) return "";
  return `
    <span class="subject-meta-collapsible-toggle__chevron" aria-hidden="true">
      ${svgIcon(isOpen ? "chevron-up" : "chevron-down", { className: isOpen ? "octicon octicon-chevron-up" : "octicon octicon-chevron-down" })}
    </span>
  `;
}

function entityLinkHtml(type, id, text) {
  const safeType = escapeHtml(type || "");
  const safeId = escapeHtml(id || "");
  const safeText = text || safeId;
  return `<a href="#" class="entity-link" data-nav-type="${safeType}" data-nav-id="${safeId}">${safeText}</a>`;
}

function buildEntityDisplayRefMap() {
  const data = Array.isArray(store.projectSubjectsView?.subjectsData) ? store.projectSubjectsView.subjectsData : [];
  const map = new Map();
  let index = 1;

  const register = (type, id, refOverride = "") => {
    const safeType = String(type || "").toLowerCase();
    const safeId = String(id || "").trim();
    if (!safeType || !safeId) return;
    const key = `${safeType}:${safeId}`;
    if (map.has(key)) return;
    if (refOverride) {
      map.set(key, refOverride);
      return;
    }
    map.set(key, `#${index}`);
    index += 1;
  };

  for (const situation of data) {
    register("situation", situation?.id);
    const sujets = Array.isArray(situation?.sujets) ? situation.sujets : [];
    for (const sujet of sujets) {
      const orderNumber = Number(sujet?.subject_number ?? sujet?.subjectNumber);
      const subjectRef = Number.isFinite(orderNumber) && orderNumber > 0 ? `#${Math.floor(orderNumber)}` : "";
      register("sujet", sujet?.id, subjectRef);
    }
  }

  return map;
}

function getEntityDisplayRef(type, id) {
  const safeType = String(type || "").toLowerCase();
  const safeId = String(id || "").trim();
  if (!safeId) return "";
  if (safeType === "sujet") {
    const subject = getNestedSujet(safeId);
    const orderNumber = Number(subject?.subject_number ?? subject?.subjectNumber);
    if (Number.isFinite(orderNumber) && orderNumber > 0) {
      return `#${Math.floor(orderNumber)}`;
    }
  }
  const map = buildEntityDisplayRefMap();
  if (safeType === "sujet") {
    return map.get(`${safeType}:${safeId}`) || "#?";
  }
  return map.get(`${safeType}:${safeId}`) || `#${safeId}`;
}

function entityDisplayLinkHtml(type, id) {
  return entityLinkHtml(type, id, escapeHtml(getEntityDisplayRef(type, id)));
}

function getDocumentDisplayName(document = {}) {
  const fileName = String(document?.fileName || "").trim();
  const title = String(document?.title || "").trim();
  const name = String(document?.name || "").trim();
  const id = String(document?.id || "").trim();
  const extension = String(document?.extension || "").trim().replace(/^\./, "");
  const baseName = fileName || title || name || id || "Document";
  if (!baseName) return "Document";
  if (!extension) return baseName;
  const lowered = baseName.toLowerCase();
  const normalizedExtension = extension.toLowerCase();
  return lowered.endsWith(`.${normalizedExtension}`) ? baseName : `${baseName}.${normalizedExtension}`;
}


function renderDocumentRefsCard(selection) {
  const refs = getSelectionDocumentRefs(selection);
  if (!refs.length) return "";

  return `
    <div class="details-document-refs" aria-label="Références documentaires">
      <div class="details-document-refs__label">Références documentaires</div>
      <div class="details-document-refs__list">
        ${refs.map((doc) => `
          <span class="details-document-ref">
            <span class="details-document-ref__name">${escapeHtml(getDocumentDisplayName(doc))}</span>
            <span class="details-document-ref__phase">${escapeHtml(doc.phaseCode)}${doc.phaseLabel ? ` · ${escapeHtml(doc.phaseLabel)}` : ""}</span>
          </span>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSubjectsStatusHeadHtml() {
  const current = getCurrentSubjectsStatusFilter();
  const query = String(store.situationsView.search || "").trim().toLowerCase();
  const counts = getSubjectsStatusCounts(query);
  return renderTableHeadFilterToggle({
    activeValue: current,
    items: [
      { label: "Ouverts", value: "open", count: counts.open, dataAttr: "subjects-status-filter" },
      { label: "Fermés", value: "closed", count: counts.closed, dataAttr: "subjects-status-filter" }
    ]
  });
}

function renderSubjectsPriorityHeadHtml() {
  const current = getCurrentSubjectsPriorityFilter();
  const priorities = getAvailableSubjectPriorities();
  const labels = {
    critical: "Critique",
    high: "Haute",
    medium: "Moyenne",
    low: "Basse"
  };
  const currentLabel = current ? (labels[current] || current) : "Priorité";
  const options = ["", ...priorities];

  return `
    <div class="issues-head-menu">
      <button
        class="issues-head-menu__btn"
        id="subjectsPriorityHeadBtn"
        type="button"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <span>${escapeHtml(currentLabel)}</span>
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu issues-head-menu__dropdown" id="subjectsPriorityHeadDropdown">
        ${options.map((value) => {
          const normalized = normalizeBackendPriority(value || "");
          const isActive = normalized === current;
          const label = normalized ? (labels[normalized] || normalized) : "Toutes";
          return `
            <button
              class="gh-menu__item ${isActive ? "is-active" : ""}"
              type="button"
              data-subjects-priority-filter="${escapeHtml(normalized)}"
            >
              ${escapeHtml(label)}
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function inferAgent(obj) {
  return obj?.produced_by || obj?.agent || obj?.by || obj?.source || "system";
}

function normActorName(actor, agent) {
  const a = String(actor || "").trim();
  const g = String(agent || "").trim();
  return getDisplayAuthorName(a, { agent: g, fallback: g === "human" ? "Human" : "System" });
}

function verdictKey(v) {
  return String(v || "").toUpperCase();
}

function verdictToneClass(v) {
  const s = verdictKey(v);
  if (s === "D") return "d";
  if (s === "S") return "s";
  if (s === "F" || s === "OK") return "f";
  if (s === "HM") return "hm";
  if (s === "PM") return "pm";
  if (s === "SO") return "so";
  return "muted";
}

function miniAuthorIconHtml(agent) {
  const a = String(agent || "").toLowerCase();
  if (a === "human") {
    return `<span class="tl-author tl-author--human" aria-hidden="true">${SVG_AVATAR_HUMAN}</span>`;
  }
  if (a === "system") {
    return `<span class="tl-author tl-author--agent tl-author--system" aria-hidden="true">${getAuthorIdentity({ author: "system", agent: "system" }).avatarHtml}</span>`;
  }
  return `<span class="tl-author tl-author--agent mono" aria-hidden="true">R</span>`;
}

function verdictIconHtml(v) {
  const k = verdictKey(v);
  const cls = `tl-ico tl-ico--verdict tl-ico--${verdictToneClass(k)}`;
  const txt = escapeHtml(k || "—");
  return `<span class="${cls}" aria-label="Verdict ${txt}">${txt}</span>`;
}

function matchSearch(parts, query) {
  if (!query) return true;
  const haystack = parts
    .filter((part) => part !== undefined && part !== null)
    .map((part) => String(part).toLowerCase())
    .join(" ");
  return haystack.includes(query);
}

/* =========================================================
   Local archive-like human store / overlays
========================================================= */

const SUJET_KANBAN_STATUSES = [
  { key: "non_active", label: "Non activé", hint: "Sujet détecté mais pas encore engagé." },
  { key: "to_activate", label: "A activer", hint: "Sujet prêt à être lancé." },
  { key: "in_progress", label: "En cours", hint: "Sujet actuellement traité." },
  { key: "in_arbitration", label: "En arbitrage", hint: "Décision ou arbitrage attendu." },
  { key: "resolved", label: "Résolu", hint: "Sujet traité ou clos." }
];
const SUJET_KANBAN_STATUS_KEYS = new Set(SUJET_KANBAN_STATUSES.map((status) => status.key));
const SUJET_KANBAN_BADGE_STYLE = {
  non_active: { background: "rgba(46, 160, 67, 0.15)", border: "rgb(35, 134, 54)", text: "rgb(63, 185, 80)" },
  to_activate: { background: "rgba(56, 139, 253, 0.1)", border: "rgb(31, 111, 235)", text: "rgb(88, 166, 255)" },
  in_progress: { background: "rgba(187, 128, 9, 0.15)", border: "rgb(158, 106, 3)", text: "rgb(210, 153, 34)" },
  in_arbitration: { background: "rgba(171, 125, 248, 0.15)", border: "rgb(137, 87, 229)", text: "rgb(188, 140, 255)" },
  resolved: { background: "rgba(219, 109, 40, 0.1)", border: "rgb(189, 86, 29)", text: "rgb(255, 161, 107)" }
};
const DEFAULT_OBJECTIVE_TITLES = [
  "Programme validé",
  "Esquisse retenue",
  "Estimation projet validée",
  "Permis déposé",
  "Permis obtenu",
  "Permis purgé",
  "Marchés de travaux signés",
  "Travaux démarrés",
  "Gros oeuvre terminé",
  "Bâtiment clos couvert",
  "Travaux terminés",
  "Réception prononcée"
];

function getDraftSubjectSelection() {
  ensureViewUiState();
  if (!store.situationsView.createSubjectForm?.isOpen) return null;
  return {
    type: "sujet",
    item: {
      id: DRAFT_SUBJECT_ID,
      title: String(store.situationsView.createSubjectForm.title || "").trim() || "Nouveau sujet",
      status: "open",
      priority: "P3",
      agent: "human",
      avis: []
    }
  };
}

function createSubjectUploadSessionId() {
  try {
    if (window?.crypto?.randomUUID) return String(window.crypto.randomUUID());
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function revokeObjectUrl(url = "") {
  try {
    if (url && window?.URL?.revokeObjectURL) window.URL.revokeObjectURL(url);
  } catch {}
}

function normalizeCreateSubjectDraftAttachments(attachments = []) {
  return (Array.isArray(attachments) ? attachments : []).map((attachment, index) => ({
    id: String(attachment?.id || ""),
    tempId: String(attachment?.tempId || `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`),
    file: attachment?.file || null,
    file_name: String(attachment?.file_name || attachment?.name || attachment?.fileName || "Pièce jointe"),
    mime_type: String(attachment?.mime_type || attachment?.mimeType || attachment?.file?.type || ""),
    size_bytes: Number(attachment?.size_bytes || attachment?.sizeBytes || attachment?.file?.size || 0) || 0,
    isImage: Boolean(attachment?.isImage || String(attachment?.mime_type || attachment?.mimeType || attachment?.file?.type || "").toLowerCase().startsWith("image/")),
    localPreviewUrl: String(attachment?.localPreviewUrl || ""),
    remoteObjectUrl: String(attachment?.remoteObjectUrl || attachment?.object_url || ""),
    previewUrl: String(attachment?.previewUrl || attachment?.localPreviewUrl || attachment?.remoteObjectUrl || attachment?.object_url || ""),
    uploadStatus: String(attachment?.uploadStatus || "draft"),
    error: String(attachment?.error || "")
  }));
}

function clearCreateSubjectDraftAttachments(attachments = []) {
  normalizeCreateSubjectDraftAttachments(attachments).forEach((attachment) => {
    revokeObjectUrl(String(attachment?.localPreviewUrl || ""));
  });
}

function buildDefaultDraftSubjectMeta() {
  const selectedSituationId = String(
    ""
  );
  return {
    assignees: [],
    labels: [],
    objectiveIds: [],
    situationIds: selectedSituationId ? [selectedSituationId] : [],
    relations: []
  };
}

function resetCreateSubjectForm(options = {}) {
  ensureViewUiState();
  const keepCreateMore = !!options.keepCreateMore;
  const previous = store.situationsView.createSubjectForm || {};
  clearCreateSubjectDraftAttachments(previous.attachments);
  store.situationsView.createSubjectForm = {
    isOpen: false,
    title: "",
    description: "",
    previewMode: false,
    createMore: keepCreateMore ? !!previous.createMore : false,
    meta: buildDefaultDraftSubjectMeta(),
    validationError: "",
    isSubmitting: false,
    uploadSessionId: "",
    attachments: []
  };
}

function openCreateSubjectForm() {
  resetObjectiveEditState();
  closeSubjectMetaDropdown();
  closeSubjectKanbanDropdown();
  ensureViewUiState();
  const previousCreateMore = !!store.situationsView.createSubjectForm?.createMore;
  store.situationsView.subjectsSubview = "subjects";
  store.situationsView.showTableOnly = true;
  store.situationsView.createSubjectForm = {
    isOpen: true,
    title: "",
    description: "",
    previewMode: false,
    createMore: previousCreateMore,
    meta: buildDefaultDraftSubjectMeta(),
    validationError: "",
    isSubmitting: false,
    uploadSessionId: "",
    attachments: []
  };
}

function getCustomSubjects() {
  const { bucket } = getRunBucket();
  return (Array.isArray(bucket.customSubjects) ? bucket.customSubjects : []).map((subject, index) => ({
    id: String(subject?.id || `sujet-local-${index + 1}`),
    title: String(subject?.title || `Sujet ${index + 1}`),
    status: String(subject?.status || "open").toLowerCase(),
    priority: String(subject?.priority || "P3").toUpperCase(),
    agent: String(subject?.agent || "human").toLowerCase(),
    raw: subject?.raw && typeof subject.raw === "object" ? subject.raw : {},
    avis: Array.isArray(subject?.avis) ? subject.avis : []
  }));
}

function resolveDraftLabelIds(labels = []) {
  return [...new Set((Array.isArray(labels) ? labels : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((value) => String(getSubjectLabelDefinition(value)?.id || "").trim())
    .filter(Boolean))];
}

async function createSubjectFromDraft() {
  ensureViewUiState();
  const formState = store.situationsView.createSubjectForm || {};
  if (formState.isSubmitting) {
    return { ok: false, reason: "in-flight" };
  }

  const titleInput = document.querySelector("[data-create-subject-title]");
  const descriptionInput = document.querySelector("[data-create-subject-description]");
  const liveTitle = String(titleInput?.value || "");
  const liveDescription = String(descriptionInput?.value || "");

  if (liveTitle && liveTitle !== String(formState.title || "")) {
    formState.title = liveTitle;
    store.situationsView.createSubjectForm.title = liveTitle;
  }
  if (liveDescription && liveDescription !== String(formState.description || "")) {
    formState.description = liveDescription;
    store.situationsView.createSubjectForm.description = liveDescription;
  }

  const title = String(formState.title || "").trim();
  if (!title) {
    store.situationsView.createSubjectForm.validationError = "Le titre du sujet est obligatoire.";
    return { ok: false, reason: "missing-title" };
  }

  const draftMeta = getSubjectSidebarMeta(DRAFT_SUBJECT_ID);
  const nextMeta = {
    assignees: Array.isArray(draftMeta?.assignees) ? draftMeta.assignees.map((value) => String(value || "").trim()).filter(Boolean) : [],
    labels: normalizeSubjectLabels(draftMeta?.labels),
    objectiveIds: normalizeSubjectObjectiveIds(draftMeta?.objectiveIds),
    situationIds: normalizeSubjectSituationIds(draftMeta?.situationIds),
    relations: Array.isArray(draftMeta?.relations) ? draftMeta.relations.map((value) => String(value || "").trim()).filter(Boolean) : []
  };

  const description = String(formState.description || "").trim();
  const draftAttachments = normalizeCreateSubjectDraftAttachments(formState.attachments);

  store.situationsView.createSubjectForm.validationError = "";
  store.situationsView.createSubjectForm.isSubmitting = true;

  try {
    const createdSubject = await createManualSubject({
      title,
      subjectType: "explicit_problem"
    });

    const subjectId = String(createdSubject?.id || "").trim();
    if (!subjectId) {
      throw new Error("Le backend n'a pas renvoyé d'identifiant de sujet.");
    }

    if (nextMeta.assignees.length) {
      await replaceSubjectAssigneesInSupabase(subjectId, nextMeta.assignees);
    }

    const labelIds = resolveDraftLabelIds(nextMeta.labels);
    if (labelIds.length) {
      await replaceSubjectLabelsInSupabase(subjectId, labelIds);
    }

    if (nextMeta.situationIds.length) {
      await replaceSubjectSituationsInSupabase(subjectId, nextMeta.situationIds);
    }

    if (nextMeta.objectiveIds.length) {
      await replaceSubjectObjectivesInSupabase(subjectId, nextMeta.objectiveIds);
    }

    const hasDraftAttachments = draftAttachments.length > 0;
    let uploadSessionId = String(formState.uploadSessionId || "").trim();
    if (hasDraftAttachments && !uploadSessionId) {
      uploadSessionId = createSubjectUploadSessionId();
      store.situationsView.createSubjectForm.uploadSessionId = uploadSessionId;
    }

    if (hasDraftAttachments) {
      for (let index = 0; index < draftAttachments.length; index += 1) {
        const attachment = draftAttachments[index];
        if (!(attachment?.file instanceof Blob)) continue;
        await uploadAttachmentFile({
          subjectId,
          uploadSessionId,
          file: attachment.file,
          sortOrder: index
        });
      }
    }

    if (description || uploadSessionId) {
      await updateSubjectDescriptionInSupabase({
        subjectId,
        description,
        uploadSessionId
      });
    }

    await reloadSubjectsFromSupabase(getSubjectsCurrentRoot(), {
      rerender: false,
      updateModal: false
    });

    const persistedSubject = getNestedSujet(subjectId);
    const selectedSituationId = String(
      persistedSubject?.situation_id
      || persistedSubject?.situationId
      || nextMeta.situationIds[0]
      || store.situationsView.selectedSituationId
      || ""
    ).trim() || null;

    store.situationsView.selectedSujetId = subjectId;
    store.situationsView.selectedSubjectId = subjectId;
    store.situationsView.selectedSituationId = selectedSituationId;
    store.projectSubjectsView.selectedSujetId = subjectId;
    store.projectSubjectsView.selectedSubjectId = subjectId;
    store.projectSubjectsView.selectedSituationId = selectedSituationId;

    persistRunBucket((bucket) => {
      bucket.subjectMeta = bucket.subjectMeta && typeof bucket.subjectMeta === "object" ? bucket.subjectMeta : {};
      bucket.subjectMeta.sujet = bucket.subjectMeta.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
      bucket.subjectMeta.sujet[subjectId] = {
        ...(bucket.subjectMeta.sujet[subjectId] || {}),
        assignees: nextMeta.assignees,
        labels: nextMeta.labels,
        objectiveIds: nextMeta.objectiveIds,
        situationIds: nextMeta.situationIds
      };
    });

    return { ok: true, subjectId };
  } catch (error) {
    const message = String(error?.message || error || "Erreur inconnue");
    store.situationsView.createSubjectForm.validationError = `Création du sujet impossible : ${message}`;
    return { ok: false, reason: "create-failed", error };
  } finally {
    if (store.situationsView?.createSubjectForm && typeof store.situationsView.createSubjectForm === "object") {
      store.situationsView.createSubjectForm.isSubmitting = false;
    }
  }
}

function normalizeSujetKanbanStatus(value) {
  const key = String(value || "").trim().toLowerCase();
  return SUJET_KANBAN_STATUS_KEYS.has(key) ? key : null;
}

function getDefaultSujetKanbanStatus(sujetId) {
  const effectiveStatus = String(getEffectiveSujetStatus(sujetId) || "open").toLowerCase();
  return effectiveStatus === "closed" ? "resolved" : "non_active";
}

function getSujetKanbanStatus(sujetId, situationId = "") {
  const { bucket } = getRunBucket();
  const normalizedSituationId = String(situationId || "");
  const statusMap = bucket?.workflow?.sujet_kanban_status;
  const scopedStored = normalizeSujetKanbanStatus(normalizedSituationId ? statusMap?.[normalizedSituationId]?.[sujetId] : null);
  if (scopedStored) return scopedStored;
  const persistedMap = store?.situationsView?.kanbanStatusBySituationId;
  const persistedScoped = normalizeSujetKanbanStatus(normalizedSituationId ? persistedMap?.[normalizedSituationId]?.[sujetId] : null);
  if (persistedScoped) return persistedScoped;
  const legacyStored = normalizeSujetKanbanStatus(statusMap?.[sujetId]);
  return legacyStored || getDefaultSujetKanbanStatus(sujetId);
}

function getSujetKanbanStatusMeta(sujetId, situationId = "") {
  const key = getSujetKanbanStatus(sujetId, situationId);
  return SUJET_KANBAN_STATUSES.find((status) => status.key === key) || SUJET_KANBAN_STATUSES[0];
}

function renderSujetKanbanStatusBadge(sujetId, situationId = "") {
  const meta = getSujetKanbanStatusMeta(sujetId, situationId);
  const tone = SUJET_KANBAN_BADGE_STYLE[meta.key] || SUJET_KANBAN_BADGE_STYLE.non_active;
  return `<span class="subject-kanban-badge" style="--subject-kanban-badge-bg:${tone.background};--subject-kanban-badge-border:${tone.border};--subject-kanban-badge-text:${tone.text};">${escapeHtml(meta.label)}</span>`;
}

function normalizeSubjectObjectiveIds(objectiveIds) {
  const normalized = [...new Set((Array.isArray(objectiveIds) ? objectiveIds : []).map((value) => String(value || "").trim()).filter(Boolean))];
  return normalized.length ? [normalized[0]] : [];
}

function normalizeSubjectSituationIds(situationIds) {
  return [...new Set((Array.isArray(situationIds) ? situationIds : []).map((value) => String(value || "")).filter(Boolean))];
}

function normalizeSubjectLabelKey(label) {
  return String(label || "").trim().toLowerCase();
}

function normalizeSubjectLabels(labels) {
  const seen = new Set();
  return (Array.isArray(labels) ? labels : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeSubjectLabelKey(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getSubjectSidebarMeta(subjectId) {
  ensureViewUiState();
  const normalizedSubjectId = String(subjectId || "");
  if (normalizedSubjectId === DRAFT_SUBJECT_ID && store.situationsView.createSubjectForm?.isOpen) {
    const meta = store.situationsView.createSubjectForm.meta || buildDefaultDraftSubjectMeta();
    return {
      assignees: Array.isArray(meta.assignees) ? meta.assignees.map((value) => String(value || "")).filter(Boolean) : [],
      labels: normalizeSubjectLabels(meta.labels),
      objectiveIds: normalizeSubjectObjectiveIds(meta.objectiveIds),
      situationIds: normalizeSubjectSituationIds(meta.situationIds),
      relations: Array.isArray(meta.relations) ? meta.relations.map((value) => String(value || "")).filter(Boolean) : []
    };
  }

  const { bucket } = getRunBucket();
  const subjectMeta = bucket?.subjectMeta?.sujet?.[normalizedSubjectId] || {};

  const subject = getNestedSujet(normalizedSubjectId);
  const rawResult = (store.projectSubjectsView?.rawSubjectsResult && typeof store.projectSubjectsView.rawSubjectsResult === "object")
    ? store.projectSubjectsView.rawSubjectsResult
    : ((store.projectSubjectsView?.rawResult && typeof store.projectSubjectsView.rawResult === "object")
      ? store.projectSubjectsView.rawResult
      : {});
  const subjectIdsBySituationId = rawResult?.subjectIdsBySituationId && typeof rawResult.subjectIdsBySituationId === "object"
    ? rawResult.subjectIdsBySituationId
    : {};

  const objectiveIdsBySubjectId = rawResult?.objectiveIdsBySubjectId && typeof rawResult.objectiveIdsBySubjectId === "object"
    ? rawResult.objectiveIdsBySubjectId
    : {};

  const objectiveIds = Array.isArray(subjectMeta.objectiveIds) && subjectMeta.objectiveIds.length
    ? normalizeSubjectObjectiveIds(subjectMeta.objectiveIds)
    : normalizeSubjectObjectiveIds(
        Array.isArray(objectiveIdsBySubjectId[normalizedSubjectId]) && objectiveIdsBySubjectId[normalizedSubjectId].length
          ? objectiveIdsBySubjectId[normalizedSubjectId]
          : getObjectives()
              .filter((objective) => Array.isArray(objective.subjectIds) && objective.subjectIds.includes(normalizedSubjectId))
              .map((objective) => String(objective.id || ""))
              .filter(Boolean)
      );

  const linkedSituationIdsFromMap = Object.entries(subjectIdsBySituationId)
    .filter(([, ids]) => Array.isArray(ids) && ids.map((value) => String(value || "")).includes(normalizedSubjectId))
    .map(([situationId]) => String(situationId || ""))
    .filter(Boolean);

  const storedSituationIds = normalizeSubjectSituationIds(subjectMeta.situationIds);
  const derivedSituationIds = normalizeSubjectSituationIds([
    ...storedSituationIds,
    ...linkedSituationIdsFromMap,
    String(subject?.raw?.situation_id || subject?.situation_id || "")
  ]);

  const labelIdsBySubjectId = rawResult?.labelIdsBySubjectId && typeof rawResult.labelIdsBySubjectId === "object"
    ? rawResult.labelIdsBySubjectId
    : {};
  const labelsById = rawResult?.labelsById && typeof rawResult.labelsById === "object"
    ? rawResult.labelsById
    : {};
  const storedLabels = normalizeSubjectLabels(subjectMeta.labels);
  const derivedLabels = normalizeSubjectLabels(
    (Array.isArray(labelIdsBySubjectId[normalizedSubjectId]) ? labelIdsBySubjectId[normalizedSubjectId] : [])
      .map((labelId) => labelsById[String(labelId || "")])
      .filter(Boolean)
      .map((labelDef) => String(labelDef?.name || labelDef?.label || labelDef?.label_key || labelDef?.key || "").trim())
  );
  const resolvedLabels = derivedLabels.length ? derivedLabels : storedLabels;
  const assigneePersonIdsBySubjectId = rawResult?.assigneePersonIdsBySubjectId && typeof rawResult.assigneePersonIdsBySubjectId === "object"
    ? rawResult.assigneePersonIdsBySubjectId
    : {};
  const derivedAssignees = resolveSubjectAssigneeIds({
    subjectMetaAssignees: subjectMeta.assignees,
    assigneeMap: assigneePersonIdsBySubjectId,
    subjectId: normalizedSubjectId,
    subject
  });

  return {
    assignees: normalizeAssigneeIds(derivedAssignees),
    labels: resolvedLabels,
    objectiveIds,
    situationIds: derivedSituationIds,
    relations: Array.isArray(subjectMeta.relations) ? subjectMeta.relations.map((value) => String(value || "")).filter(Boolean) : []
  };
}

function getSubjectObjectives(subjectId) {
  const meta = getSubjectSidebarMeta(subjectId);
  return meta.objectiveIds.map((objectiveId) => getObjectiveById(objectiveId)).filter(Boolean);
}

function getEffectiveSujetStatus(sujetId) {
  const sujet = getNestedSujet(sujetId);
  const decision = getDecision("sujet", sujetId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";
  return normalizeIssueLifecycleStatus(firstNonEmpty(sujet?.status, "open"));
}

function getEffectiveAvisVerdict(avisId) {
  const decision = getDecision("avis", avisId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d.startsWith("VALIDATED_")) return d.replace("VALIDATED_", "");

  const legacyCompatSubject = getNestedSujet(avisId);
  return normalizeVerdict(
    legacyCompatSubject?.verdict
    || legacyCompatSubject?.raw?.verdict
    || legacyCompatSubject?.source_verdict
  ) || "-";
}

function getEffectiveSituationStatus(situationId) {
  const situation = getNestedSituation(situationId);
  const decision = getDecision("situation", situationId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";
  return normalizeIssueLifecycleStatus(firstNonEmpty(situation?.status, "open"));
}

/* =========================================================
   Data access
========================================================= */

/* =========================================================
   Effective counts / title helpers
========================================================= */

function getChildSubjectList(subject) {
  const subjectId = String(subject?.id || "");
  if (!subjectId) return [];
  const children = Array.isArray(getChildSubjects(subjectId)) ? getChildSubjects(subjectId) : [];
  return children
    .filter(Boolean)
    .sort((left, right) => {
      const leftOrder = Number(left?.parent_child_order ?? left?.raw?.parent_child_order);
      const rightOrder = Number(right?.parent_child_order ?? right?.raw?.parent_child_order);
      const leftHasOrder = Number.isFinite(leftOrder) && leftOrder > 0;
      const rightHasOrder = Number.isFinite(rightOrder) && rightOrder > 0;
      if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) return leftOrder - rightOrder;
      if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;

      const leftLinkedTs = Date.parse(firstNonEmpty(left?.parent_linked_at, left?.raw?.parent_linked_at, left?.created_at, left?.raw?.created_at) || "") || 0;
      const rightLinkedTs = Date.parse(firstNonEmpty(right?.parent_linked_at, right?.raw?.parent_linked_at, right?.created_at, right?.raw?.created_at) || "") || 0;
      if (leftLinkedTs !== rightLinkedTs) return leftLinkedTs - rightLinkedTs;
      return String(firstNonEmpty(left?.title, left?.id, "")).localeCompare(String(firstNonEmpty(right?.title, right?.id, "")), "fr");
    });
}

function problemsCountsIconHtml(closedCount, totalCount) {
  return renderProblemsCountsIconHtml(closedCount, totalCount);
}

function problemsCountsHtml(item, options = {}) {
  const entityType = String(options.entityType || "situation").toLowerCase();
  const hideIfEmpty = options.hideIfEmpty === true;
  const linkedSubjects = entityType === "sujet"
    ? getChildSubjectList(item)
    : getSituationSubjects(item);
  const totalSubjects = linkedSubjects.length;
  if (hideIfEmpty && totalSubjects <= 0) return "";
  const openSubjects = linkedSubjects.filter((subject) => String(getEffectiveSujetStatus(subject?.id) || "open").toLowerCase() === "open").length;
  const closedSubjects = Math.max(0, totalSubjects - openSubjects);
  const ariaLabel = `${openSubjects} sous-sujets ouverts, ${closedSubjects} fermés, ${totalSubjects} au total`;
  return `<div class="subissues-counts subissues-counts--problems" aria-label="${escapeHtml(ariaLabel)}">${problemsCountsIconHtml(closedSubjects, totalSubjects)}<span>${closedSubjects} / ${totalSubjects}</span></div>`;
}

function subissuesHeadCountsHtml(subjects = []) {
  const linkedSubjects = Array.isArray(subjects) ? subjects : [];
  const totalSubjects = linkedSubjects.length;
  const openSubjects = linkedSubjects.filter((subject) => String(getEffectiveSujetStatus(subject?.id) || "open").toLowerCase() === "open").length;
  const closedSubjects = Math.max(0, totalSubjects - openSubjects);
  const ariaLabel = `${openSubjects} sous-sujets ouverts, ${closedSubjects} fermés, ${totalSubjects} au total`;
  return `<div class="subissues-counts subissues-counts--problems subissues-counts--head" aria-label="${escapeHtml(ariaLabel)}">${problemsCountsIconHtml(closedSubjects, totalSubjects)}<span>${closedSubjects} / ${totalSubjects}</span></div>`;
}

function renderSubissueInlineMetaHtml(subjectNode, childSubjects = []) {
  const subjectId = String(subjectNode?.id || "");
  if (!subjectId) return "";
  const displayRef = getEntityDisplayRef("sujet", subjectId);
  const hasChildren = Array.isArray(childSubjects) && childSubjects.length > 0;
  const openChildren = hasChildren
    ? childSubjects.filter((subject) => String(getEffectiveSujetStatus(subject?.id) || "open").toLowerCase() === "open").length
    : 0;
  const closedChildren = hasChildren ? Math.max(0, childSubjects.length - openChildren) : 0;
  const childrenCounterHtml = hasChildren
    ? `<span class="subissues-counts subissues-counts--problems subissue-inline-children-counter" aria-label="${escapeHtml(`${openChildren} sous-sujets ouverts, ${closedChildren} fermés, ${childSubjects.length} au total`)}">${problemsCountsIconHtml(closedChildren, childSubjects.length)}<span>${closedChildren} / ${childSubjects.length}</span></span>`
    : "";
  return `
    <span class="subissue-inline-meta mono-small">
      <span class="subissue-inline-ref">${escapeHtml(displayRef)}</span>
      ${childrenCounterHtml}
    </span>
  `;
}

/* =========================================================
   Table render
========================================================= */


function formatRelativeTimeLabel(ts, prefix = "updated") {
  if (!ts) return `${prefix} recently`;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return `${prefix} recently`;

  const diffMs = Date.now() - date.getTime();
  const future = diffMs < 0;
  const absSeconds = Math.max(1, Math.round(Math.abs(diffMs) / 1000));

  const units = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"]
  ];

  let value = 1;
  let unit = "second";
  for (const [seconds, label] of units) {
    if (absSeconds >= seconds) {
      value = Math.floor(absSeconds / seconds);
      unit = label;
      break;
    }
  }

  const plural = value > 1 ? "s" : "";
  if (future) return `${prefix} in ${value} ${unit}${plural}`;
  return `${prefix} ${value} ${unit}${plural} ago`;
}

function getEntityListTimestamp(entityType, entity) {
  const description = entity?.id ? getEntityDescriptionState(entityType, entity.id) : null;
  return firstNonEmpty(
    description?.updated_at,
    entity?.updated_at,
    entity?.created_at,
    entity?.raw?.updated_at,
    entity?.raw?.created_at,
    store.situationsView?.rawResult?.updated_at,
    store.situationsView?.rawResult?.created_at,
    nowIso()
  );
}

function rowSelectedClass(kind, id) {
  if (kind === "situation" && store.situationsView.selectedSituationId === id && !store.situationsView.selectedSujetId) return " selected subissue-row--selected";
  if (kind === "sujet" && store.situationsView.selectedSujetId === id) return " selected subissue-row--selected";
  return "";
}

function renderSituationRow(situation) {
  const expanded = store.situationsView.expandedSituations.has(situation.id);
  const hasSujets = getSituationSubjects(situation).length > 0;
  const effStatus = getEffectiveSituationStatus(situation.id);
  const meta = getEntityReviewMeta("situation", situation.id);
  const titleSeenClass = getReviewTitleStateClass("situation", situation.id);

  return `
    <div class="issue-row issue-row--sit click js-row-situation${rowSelectedClass("situation", situation.id)}" data-situation-id="${escapeHtml(situation.id)}">
      <div class="cell cell-theme lvl0">
        <span class="js-toggle-situation" data-situation-id="${escapeHtml(situation.id)}">${chevron(expanded, hasSujets)}</span>
        ${issueIcon(effStatus, { reviewState: meta.review_state, entityType: "situation", isSeen: meta.is_seen })}
        <span class="theme-text theme-text--sit ${titleSeenClass}">${escapeHtml(firstNonEmpty(situation.title, situation.id, "(sans titre)"))}</span>
      </div>
      <div class="cell cell-prio">${priorityBadge(situation.priority)}</div>
      <div class="cell cell-agent"></div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("situation", situation.id))}</div>
    </div>
  `;
}

function renderSujetRow(sujet) {
  const expanded = store.situationsView.expandedSujets.has(sujet.id);
  const childSubjects = getChildSubjectList(sujet);
  const effStatus = getEffectiveSujetStatus(sujet.id);
  const meta = getEntityReviewMeta("sujet", sujet.id);
  const titleSeenClass = getReviewTitleStateClass("sujet", sujet.id);

  return `
    <div class="issue-row issue-row--pb click js-row-sujet${rowSelectedClass("sujet", sujet.id)}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl1">
        ${issueIcon(effStatus, { reviewState: meta.review_state, entityType: "sujet", isSeen: meta.is_seen })}
        <span class="theme-text theme-text--pb ${titleSeenClass}">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
      </div>
      <div class="cell cell-prio">${priorityBadge(sujet.priority)}</div>
      <div class="cell cell-agent"></div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("sujet", sujet.id))}</div>
    </div>
  `;
}

function getSubjectsTableDeps() {
  return {
    store,
    escapeHtml,
    svgIcon,
    renderIssuesTable,
    renderDataTableHead,
    renderSubjectsStatusHeadHtml,
    renderSubjectsPriorityHeadHtml,
    getCurrentSubjectsStatusFilter,
    getCurrentSubjectsPriorityFilter,
    getFilteredStandaloneSubjects,
    getFilteredFlatSubjects,
    getSituationSubjects,
    sujetMatchesStatusFilter,
    sujetMatchesPriorityFilter,
    getEffectiveSujetStatus,
    getEntityReviewMeta,
    getReviewTitleStateClass,
    getEntityDisplayRef,
    getEntityDescriptionState,
    formatRelativeTimeLabel,
    getEntityListTimestamp,
    getSubjectSidebarMeta,
    getSubjectLabelDefinition: getProjectSubjectLabels().getSubjectLabelDefinition,
    renderSubjectLabelBadge: getProjectSubjectLabels().renderSubjectLabelBadge,
    getObjectiveById,
    getChildSubjects,
    getBlockedBySubjects,
    getHeadVisibleBlockedBySubjects,
    issueIcon,
    priorityBadge,
    firstNonEmpty
  };
}

/* =========================================================
   Details / summary / metadata
========================================================= */

function renderMetaItem(label, valueHtml) {
  return `
    <div class="meta-item">
      <div class="meta-k">${escapeHtml(label)}</div>
      <div class="meta-v">${valueHtml}</div>
    </div>
  `;
}

function renderDetailedMetaForSelection(selection) {
  if (!selection) return "";

  const item = selection.item;
  const raw = item.raw || {};
  const decision = getDecision(selection.type, item.id);

  const common = [
    renderMetaItem("ID", `<span class="mono">${escapeHtml(item.id)}</span>`),
    renderMetaItem("Title", escapeHtml(firstNonEmpty(item.title, item.id))),
    renderMetaItem("Agent", `<span class="mono">${escapeHtml(getDisplayAuthorName(firstNonEmpty(item.agent, raw.agent, "system"), { agent: firstNonEmpty(item.agent, raw.agent, "system"), fallback: "System" }))}</span>`),
    renderMetaItem("Priority", priorityBadge(firstNonEmpty(item.priority, raw.priority, "medium"))),
    renderMetaItem("Run", `<span class="mono">${escapeHtml(currentRunKey())}</span>`),
    renderMetaItem("Historique humain", decision ? `<span class="mono">${escapeHtml(decision.decision)} · ${escapeHtml(fmtTs(decision.ts))}</span>` : "—")
  ];

  if (selection.type === "sujet") {
    const situations = getSubjectSituations(item.id);
    const situationLabel = situations.length
      ? situations.map((situation) => String(situation?.id || "")).filter(Boolean).join(", ")
      : "—";
    const entries = [
      ...common,
      renderMetaItem(situations.length > 1 ? "Situations parentes" : "Situation parent", `<span class="mono">${escapeHtml(situationLabel)}</span>`),
      renderMetaItem("Sous-sujets", `<span class="mono">${escapeHtml(String(getChildSubjectList(item).length))}</span>`)
    ];
    return entries.join("");
  }

  const entries = [
    ...common,
    renderMetaItem("Status effectif", statePill(getEffectiveSituationStatus(item.id))),
    renderMetaItem("Status source", statePill(firstNonEmpty(raw.status, item.status, "open"))),
    renderMetaItem("Sujets", `<span class="mono">${escapeHtml(String(getSituationSubjects(item).length))}</span>`)
  ];
  return entries.join("");
}


function getSubjectSituations(subjectId) {
  const normalizedId = String(subjectId || "");
  const meta = getSubjectSidebarMeta(normalizedId);
  return meta.situationIds.map((situationId) => getNestedSituation(situationId)).filter(Boolean);
}

function summarizeSubjectMetaValue(items, emptyLabel = "Aucun") {
  if (!Array.isArray(items) || !items.length) return emptyLabel;
  if (items.length === 1) return items[0];
  return `${items[0]} +${items.length - 1}`;
}

function renderSubjectMetaField({ field, label, valueHtml }) {
  const dropdown = getSubjectsViewState().subjectMetaDropdown || {};
  const isOpen = dropdown.field === field;
  return `
    <section class="subject-meta-field ${isOpen ? "is-open" : ""}">
      <button
        type="button"
        class="subject-meta-field__trigger"
        data-subject-meta-trigger="${escapeHtml(field)}"
        data-subject-meta-anchor="${escapeHtml(field)}"
        aria-expanded="${isOpen ? "true" : "false"}"
      >
        <span class="subject-meta-field__label-row">
          <span class="subject-meta-field__label">${escapeHtml(label)}</span>
          <span class="subject-meta-field__gear" aria-hidden="true">${svgIcon("gear", { className: "octicon octicon-gear" })}</span>
        </span>
      </button>
      <div class="subject-meta-field__value">${valueHtml}</div>
    </section>
  `;
}

function renderSubjectMetaButtonValue(text, metaText = "") {
  return `
    <span class="subject-meta-field__value-text">${escapeHtml(text)}</span>
    ${metaText ? `<span class="subject-meta-field__value-meta">${escapeHtml(metaText)}</span>` : ""}
  `;
}

function getObjectiveSubjectCounts(objective) {
  const linkedIds = Array.isArray(objective?.subjectIds) ? objective.subjectIds : [];
  const linkedSubjects = linkedIds
    .map((subjectId) => getNestedSujet(subjectId))
    .filter(Boolean);

  if (linkedSubjects.length) {
    let open = 0;
    let closed = 0;
    for (const sujet of linkedSubjects) {
      if (sujetMatchesStatusFilter(sujet, "closed")) closed += 1;
      else open += 1;
    }
    return { open, closed, total: linkedSubjects.length, linkedSubjects };
  }

  const total = Number.isFinite(Number(objective?.subjectsCount)) ? Number(objective.subjectsCount) : 0;
  const closed = Math.max(0, Math.min(total, Number.isFinite(Number(objective?.closedSubjectsCount)) ? Number(objective.closedSubjectsCount) : 0));
  const open = Math.max(0, total - closed);
  return { open, closed, total, linkedSubjects: [] };
}

function renderObjectiveCounterIcon(objective) {
  const counts = getObjectiveSubjectCounts(objective);
  return problemsCountsIconHtml(counts.closed, counts.total);
}

function getSubjectSituationStatusLabel(situation, subjectId) {
  const linkedSubject = getSituationSubjects(situation).find((item) => String(item?.id || "") === String(subjectId || ""));
  const status = getEffectiveSujetStatus(linkedSubject?.id || subjectId) || linkedSubject?.status || "open";
  return normalizeIssueLifecycleStatus(status) === "closed" ? "Closed" : "Open";
}

function renderSubjectSituationKanbanButton(situation, subjectId) {
  const dropdown = getSubjectsViewState().subjectKanbanDropdown || {};
  const situationId = String(situation?.id || "");
  const isOpen = String(dropdown.subjectId || "") === String(subjectId || "") && String(dropdown.situationId || "") === situationId;
  return `
    <button
      type="button"
      class="subject-situation-kanban-trigger ${isOpen ? "is-open" : ""}"
      data-subject-kanban-trigger="${escapeHtml(subjectId)}"
      data-subject-kanban-situation-id="${escapeHtml(situationId)}"
      data-subject-kanban-anchor="${escapeHtml(subjectId)}::${escapeHtml(situationId)}"
      aria-expanded="${isOpen ? "true" : "false"}"
    >
      ${renderSujetKanbanStatusBadge(subjectId, situationId)}
      <span class="subject-situation-kanban-trigger__chevron" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
    </button>
  `;
}

function renderSubjectSituationCard(situation, subjectId) {
  const situationStatus = String(getEffectiveSituationStatus(situation?.id) || situation?.status || "open").toLowerCase();
  const isClosedSituation = situationStatus !== "open";
  return `
    <span class="subject-meta-situation-card">
      <span class="subject-meta-situation-card__head">
        <span class="subject-meta-situation-card__icon">${svgIcon(isClosedSituation ? "table-check" : "table", { className: "ui-icon octicon octicon-table" })}</span>
        <span class="subject-meta-situation-card__title">${escapeHtml(firstNonEmpty(situation.title, situation.id, "Situation"))}</span>
        ${isClosedSituation ? `<span class="subject-meta-situation-card__state">Fermée</span>` : ""}
      </span>
      <span class="subject-meta-situation-card__meta">
        <span>Status · ${escapeHtml(getSubjectSituationStatusLabel(situation, subjectId))}</span>
        ${renderSubjectSituationKanbanButton(situation, subjectId)}
      </span>
    </span>
  `;
}

function renderSubjectSituationsValue(subjectId) {
  const situations = getSubjectSituations(subjectId);
  if (!situations.length) return renderSubjectMetaButtonValue("Aucune situation");

  const openSituations = situations.filter((situation) => String(getEffectiveSituationStatus(situation?.id) || situation?.status || "open").toLowerCase() === "open");
  const closedSituations = situations.filter((situation) => String(getEffectiveSituationStatus(situation?.id) || situation?.status || "open").toLowerCase() !== "open");
  const showClosedSituations = !!getSubjectsViewState().subjectMetaDropdown?.showClosedSituations;
  const closedCount = closedSituations.length;
  const closedLabel = closedCount > 1
    ? `Afficher ${closedCount} situations fermées`
    : `Afficher ${closedCount} situation fermée`;

  return `
    <span class="subject-meta-field__chips">
      ${openSituations.map((situation) => renderSubjectSituationCard(situation, subjectId)).join("")}
      ${showClosedSituations ? `
        <span class="subject-meta-field__chips subject-meta-field__chips--closed">
          ${closedSituations.map((situation) => renderSubjectSituationCard(situation, subjectId)).join("")}
        </span>
      ` : ""}
      ${closedCount ? `
        <button
          type="button"
          class="subject-meta-collapsible-toggle"
          data-subject-situations-closed-toggle="true"
          aria-expanded="${showClosedSituations ? "true" : "false"}"
        >
          <span class="subject-meta-collapsible-toggle__label">${escapeHtml(showClosedSituations ? "Montrer moins" : closedLabel)}</span>
          <span class="subject-meta-collapsible-toggle__chevron" aria-hidden="true">${svgIcon(showClosedSituations ? "chevron-up" : "chevron-down", { className: showClosedSituations ? "octicon octicon-chevron-up" : "octicon octicon-chevron-down" })}</span>
        </button>
      ` : ""}
    </span>
  `;
}


function renderSubjectLabelsValue(subjectId) {
  const labels = getSubjectSidebarMeta(subjectId).labels
    .map((label) => getSubjectLabelDefinition(label))
    .filter(Boolean);
  if (!labels.length) return renderSubjectMetaButtonValue("Aucun label");
  return `
    <span class="subject-meta-labels-list">
      ${labels.map((labelDef) => renderSubjectLabelBadge(labelDef)).join("")}
    </span>
  `;
}

function renderSubjectObjectivesValue(subjectId) {
  const objectives = getSubjectObjectives(subjectId);
  const objective = objectives[0] || null;
  if (!objective) return renderSubjectMetaButtonValue("Aucun objectif");
  const secondaryLabel = objectives.length > 1
    ? `${objectives.length} objectifs`
    : formatObjectiveDueDateLabel(objective);
  return `
    <span class="subject-meta-objective-card">
      <span class="subject-meta-objective-card__count">${renderObjectiveCounterIcon(objective)}</span>
      <span class="subject-meta-objective-card__title">${escapeHtml(objective.title)}</span>
      <span class="subject-meta-objective-card__date">${escapeHtml(secondaryLabel)}</span>
    </span>
  `;
}

function ensureCollaboratorsHydrated() {
  if (collaboratorsHydrationInFlight) return;
  const collaborators = Array.isArray(store.projectForm?.collaborators) ? store.projectForm.collaborators : [];
  if (collaborators.length) return;
  if (typeof ensureProjectCollaboratorsLoaded !== "function") return;
  collaboratorsHydrationInFlight = true;
  Promise.resolve(ensureProjectCollaboratorsLoaded())
    .then(() => {
      rerenderPanels();
    })
    .catch((error) => {
      console.warn("[subject-assignees] collaborators load failed", error);
    })
    .finally(() => {
      collaboratorsHydrationInFlight = false;
    });
}

function getActiveProjectCollaborators() {
  ensureCollaboratorsHydrated();
  const collaborators = Array.isArray(store.projectForm?.collaborators) ? store.projectForm.collaborators : [];
  return collaborators
    .filter((collaborator) => String(collaborator?.status || "Actif").toLowerCase() !== "retiré")
    .map((collaborator) => ({
      id: String(collaborator?.personId || collaborator?.id || ""),
      userId: String(collaborator?.userId || collaborator?.linkedUserId || ""),
      name: firstNonEmpty(collaborator?.name, [collaborator?.firstName, collaborator?.lastName].filter(Boolean).join(" "), collaborator?.email, "Utilisateur"),
      role: firstNonEmpty(collaborator?.role, "Collaborateur"),
      roleGroupCode: String(collaborator?.roleGroupCode || "").trim().toLowerCase(),
      roleGroupLabel: firstNonEmpty(collaborator?.roleGroupLabel, ""),
      email: firstNonEmpty(collaborator?.email, ""),
      avatarStoragePath: firstNonEmpty(collaborator?.avatarStoragePath, ""),
      avatarUrl: firstNonEmpty(collaborator?.avatarUrl, collaborator?.avatar, "")
    }))
    .filter((collaborator) => !!collaborator.id);
}

function getCollaboratorGroupLabel(collaborator) {
  const code = String(collaborator?.roleGroupCode || "").trim().toLowerCase();
  const label = String(collaborator?.roleGroupLabel || "").trim();
  if (label) return label;
  if (code.includes("moa")) return "Maîtrise d'ouvrage";
  if (code.includes("moe")) return "Maîtrise d'œuvre";
  if (code.includes("entre")) return "Entreprises";
  return "Divers";
}

function renderCollaboratorAvatar(collaborator = {}) {
  const displayName = firstNonEmpty(collaborator.name, collaborator.email, "U");
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";
  const isCurrentUser = String(collaborator?.userId || "") && String(collaborator.userId) === String(store.user?.id || "");
  const avatarUrl = firstNonEmpty(collaborator?.avatarUrl, isCurrentUser ? String(store.user?.avatar || "") : "");
  if (avatarUrl) {
    return `<span class="subject-assignee-avatar"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" class="subject-assignee-avatar__img"></span>`;
  }
  return `<span class="subject-assignee-avatar subject-assignee-avatar--fallback" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

function renderSubjectAssigneesValue(subjectId) {
  const assigneeIds = getSubjectSidebarMeta(subjectId).assignees;
  const collaborators = getActiveProjectCollaborators();
  const collaboratorsById = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]));
  const selected = normalizeAssigneeIds(assigneeIds)
    .map((assigneeId) => findCollaboratorByAssigneeId(collaboratorsById, assigneeId) || {
      id: assigneeId,
      userId: "",
      name: `Collaborateur ${assigneeId.slice(0, 8)}`,
      role: "Collaborateur",
      roleGroupCode: "",
      roleGroupLabel: "",
      email: "",
      avatarUrl: ""
    })
    .filter(Boolean);

  if (!selected.length) {
    return `
      <span class="subject-meta-assignees-empty">
        <span class="subject-meta-assignees-empty__text">Personne</span>
        <span aria-hidden="true"> - </span>
        <button type="button" class="subject-meta-assign-self-link" data-subject-assign-self="${escapeHtml(subjectId)}">Assigner à moi-même</button>
      </span>
    `;
  }

  return `
    <span class="subject-meta-assignees-list">
      ${selected.map((collaborator) => `
        <span class="subject-meta-assignee-row">
          <span class="subject-meta-assignee-row__avatar">${renderCollaboratorAvatar(collaborator)}</span>
          <span class="subject-meta-assignee-row__content">
            <span class="subject-meta-assignee-row__name">${escapeHtml(collaborator.name)}</span>
            <span class="subject-meta-assignee-row__role">${escapeHtml(collaborator.role)}</span>
          </span>
        </span>
      `).join("")}
    </span>
  `;
}

function getSubjectParentSubject(subjectId) {
  const subject = getNestedSujet(subjectId);
  if (!subject) return null;
  const parentSubjectId = firstNonEmpty(
    subject.parent_subject_id,
    subject.parentSubjectId,
    subject.raw?.parent_subject_id
  );
  if (!parentSubjectId) return null;
  return getNestedSujet(parentSubjectId);
}

function renderSubjectRelationSubjectCard(subject, options = {}) {
  const relationLabel = String(firstNonEmpty(options.label, "")).trim();
  const displayRef = getEntityDisplayRef("sujet", subject?.id);
  const status = getEffectiveSujetStatus(subject?.id);
  const descriptionState = getEntityDescriptionState("sujet", subject?.id) || {};
  const author = getDisplayAuthorName(firstNonEmpty(descriptionState.author, subject?.agent, subject?.raw?.agent, "system"), {
    agent: firstNonEmpty(descriptionState.agent, subject?.agent, subject?.raw?.agent, "system"),
    fallback: "System"
  });
  const authorAndRef = `${author}/${displayRef}`;
  const extraCountHtml = options.countHtml ? `<span class="subject-meta-parent-card__count">${options.countHtml}</span>` : "";
  return `
    <button type="button" class="subject-meta-parent-card" data-parent-subject-id="${escapeHtml(subject?.id || "")}">
      ${relationLabel ? `<span class="subject-meta-parent-card__label">${escapeHtml(relationLabel)}</span>` : ""}
      <span class="subject-meta-parent-card__body">
        <span class="subject-meta-parent-card__icon">${issueIcon(status)}</span>
        <span class="subject-meta-parent-card__title">${escapeHtml(firstNonEmpty(subject?.title, subject?.id, "Sujet"))}</span>
        ${extraCountHtml}
        <span class="subject-meta-parent-card__meta">${escapeHtml(authorAndRef)}</span>
      </span>
    </button>
  `;
}

function renderSubjectRelationsCards(subjectId) {
  const parentSubject = getSubjectParentSubject(subjectId);
  const blockedBySubjects = Array.isArray(getBlockedBySubjects(subjectId)) ? getBlockedBySubjects(subjectId) : [];
  const blockingSubjects = Array.isArray(getBlockingSubjects(subjectId)) ? getBlockingSubjects(subjectId) : [];

  const groups = [];
  if (parentSubject) {
    const parentChildren = getChildSubjectList(parentSubject);
    groups.push(`
      <div class="subject-meta-relations-group">
        ${renderSubjectRelationSubjectCard(parentSubject, {
    label: "Sujet parent",
    countHtml: subissuesHeadCountsHtml(parentChildren)
  })}
      </div>
    `);
  }

  if (blockedBySubjects.length) {
    groups.push(`
      <div class="subject-meta-relations-group">
        <div class="subject-meta-relations-group__title">Est bloqué par <span class="subject-meta-relations-group__counter">${blockedBySubjects.length}</span></div>
        <div class="subject-meta-relations-group__list">
          ${blockedBySubjects.map((item) => renderSubjectRelationSubjectCard(item)).join("")}
        </div>
      </div>
    `);
  }

  if (blockingSubjects.length) {
    groups.push(`
      <div class="subject-meta-relations-group">
        <div class="subject-meta-relations-group__title">Est bloquant pour <span class="subject-meta-relations-group__counter">${blockingSubjects.length}</span></div>
        <div class="subject-meta-relations-group__list">
          ${blockingSubjects.map((item) => renderSubjectRelationSubjectCard(item)).join("")}
        </div>
      </div>
    `);
  }

  if (!groups.length) return renderSubjectMetaButtonValue("Aucune relation");

  return `<div class="subject-meta-relations-cards">${groups.join('<div class="subject-meta-relations-divider" aria-hidden="true"></div>')}</div>`;
}

function getHeadVisibleBlockedBySubjects(subjectId) {
  const normalizedSubjectId = firstNonEmpty(subjectId?.id, subjectId);
  if (!normalizedSubjectId) return [];

  const subjectStatus = normalizeIssueLifecycleStatus(getEffectiveSujetStatus(normalizedSubjectId));
  if (subjectStatus === "closed") return [];

  const blockedBySubjects = Array.isArray(getBlockedBySubjects(normalizedSubjectId))
    ? getBlockedBySubjects(normalizedSubjectId)
    : [];

  return blockedBySubjects.filter((blocker) => {
    const blockerStatus = normalizeIssueLifecycleStatus(getEffectiveSujetStatus(blocker?.id));
    return blockerStatus === "open";
  });
}

function renderSubjectBlockedByHeadHtml(subject, options = {}) {
  const compact = options.compact === true;
  const blockedBySubjects = getHeadVisibleBlockedBySubjects(subject?.id || subject);
  if (!blockedBySubjects.length) return "";

  const iconHtml = `<span class="details-blocked-badge__icon">${svgIcon("blocked", { className: "octicon octicon-blocked fgColor-danger" })}</span>`;

  if (blockedBySubjects.length === 1) {
    const blocker = blockedBySubjects[0] || {};
    const blockerTitle = escapeHtml(firstNonEmpty(blocker?.title, blocker?.id, "Sujet"));
    const blockerRef = escapeHtml(getEntityDisplayRef("sujet", blocker?.id));
    if (compact) {
      return `
        <span class="details-blocked-badge details-blocked-badge--compact" title="Bloqué par ${blockerTitle}">
          ${iconHtml}
          <span class="details-blocked-badge__title">${blockerRef}</span>
        </span>
      `;
    }
    return `
      <span class="details-blocked-badge" title="Bloqué par ${blockerTitle}">
        ${iconHtml}
        <span class="details-blocked-badge__label">Bloqué par :</span>
        <span class="details-blocked-badge__title">${blockerTitle}</span>
      </span>
    `;
  }

  const countLabel = escapeHtml(String(blockedBySubjects.length));
  if (compact) {
    return `
      <span class="details-blocked-badge details-blocked-badge--compact" title="Bloqué par ${countLabel} sujets">
        ${iconHtml}
        <span class="details-blocked-badge__title">${countLabel}</span>
      </span>
    `;
  }

  return `
    <span class="details-blocked-badge" title="Bloqué par ${countLabel} sujets">
      ${iconHtml}
      <span class="details-blocked-badge__label">Bloqué par</span>
      <span class="details-blocked-badge__title">${countLabel}</span>
    </span>
  `;
}

function renderSubjectParentHeadHtml(subject, options = {}) {
  const compact = options.compact === true;
  const parentSubject = getSubjectParentSubject(subject?.id || subject);
  if (!parentSubject) return "";
  const title = escapeHtml(firstNonEmpty(parentSubject.title, parentSubject.id, "Sujet parent"));
  const parentRef = escapeHtml(firstNonEmpty(getEntityDisplayRef("sujet", parentSubject.id), `#${parentSubject.id || ""}`));
  const linkTitle = compact ? parentRef : title;
  const parentSubjectId = escapeHtml(String(parentSubject.id || ""));
  const wrapperClass = compact ? "details-parent-badge details-parent-badge--compact" : "details-parent-badge";
  return `
    <span class="${wrapperClass}" title="Sujet parent : ${title}">
      <span class="details-parent-badge__icon">${issueIcon(getEffectiveSujetStatus(parentSubject.id))}</span>
      <span class="details-parent-badge__label">Parent :</span>
      <button
        type="button"
        class="details-parent-badge__link js-details-parent-subject-link"
        data-parent-subject-id="${parentSubjectId}"
        aria-label="Ouvrir le sujet parent ${title}"
      >
        <span class="details-parent-badge__title">${linkTitle}</span>
      </button>
    </span>
  `;
}

function renderSubjectMetaFieldValue(subject, field) {
  if (!subject || String(subject.type || "") === "") return "";
  if (field === "assignees") return renderSubjectAssigneesValue(subject.id);
  if (field === "labels") return renderSubjectLabelsValue(subject.id);
  if (field === "situations") return renderSubjectSituationsValue(subject.id);
  if (field === "objectives") return renderSubjectObjectivesValue(subject.id);
  if (field === "relations") return renderSubjectRelationsCards(subject.id);
  return renderSubjectMetaButtonValue("Aucune donnée");
}

function getSubjectLastActivityTimestamp(subject = {}) {
  const updatedAt = firstNonEmpty(
    getEntityDescriptionState("sujet", subject.id)?.updated_at,
    subject.updated_at,
    subject.raw?.updated_at,
    subject.created_at,
    subject.raw?.created_at
  );
  const ts = Date.parse(updatedAt || "");
  return Number.isFinite(ts) ? ts : 0;
}

function collectDescendantSubjectIds(subjectId, visited = new Set()) {
  const rootId = String(subjectId || "");
  if (!rootId || visited.has(rootId)) return visited;
  visited.add(rootId);

  const children = Array.isArray(getChildSubjects(rootId)) ? getChildSubjects(rootId) : [];
  for (const child of children) {
    const childId = String(child?.id || "");
    if (!childId || visited.has(childId)) continue;
    collectDescendantSubjectIds(childId, visited);
  }
  return visited;
}

function getRelationParentSuggestions(subject, query = "") {
  const currentSubjectId = String(subject?.id || "");
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const forbiddenParentIds = collectDescendantSubjectIds(currentSubjectId);
  const map = store.projectSubjectsView?.rawSubjectsResult?.subjectsById || {};
  const candidates = Object.values(map)
    .filter((item) => {
      const itemId = String(item?.id || "");
      if (!itemId || forbiddenParentIds.has(itemId)) return false;
      return matchSearch([item?.title, item?.id], normalizedQuery);
    })
    .sort((left, right) => {
      const tsDiff = getSubjectLastActivityTimestamp(right) - getSubjectLastActivityTimestamp(left);
      if (tsDiff !== 0) return tsDiff;
      return String(firstNonEmpty(left?.title, left?.id, "")).localeCompare(String(firstNonEmpty(right?.title, right?.id, "")), "fr");
    });
  return candidates.slice(0, 13);
}

function getRelationSubjectSuggestions(subject, query = "", options = {}) {
  const currentSubjectId = String(subject?.id || "");
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const excludedIds = new Set((Array.isArray(options.excludeSubjectIds) ? options.excludeSubjectIds : []).map((value) => String(value || "")).filter(Boolean));
  const map = store.projectSubjectsView?.rawSubjectsResult?.subjectsById || {};
  const candidates = Object.values(map)
    .filter((item) => {
      const itemId = String(item?.id || "");
      if (!itemId || itemId === currentSubjectId || excludedIds.has(itemId)) return false;
      return matchSearch([item?.title, item?.id], normalizedQuery);
    })
    .sort((left, right) => {
      const tsDiff = getSubjectLastActivityTimestamp(right) - getSubjectLastActivityTimestamp(left);
      if (tsDiff !== 0) return tsDiff;
      return String(firstNonEmpty(left?.title, left?.id, "")).localeCompare(String(firstNonEmpty(right?.title, right?.id, "")), "fr");
    });
  return candidates.slice(0, 20);
}

function buildRelationSelectItem(candidate, { dropdownState, isSelected = false, dataAttr }) {
  const candidateId = String(candidate?.id || "");
  return {
    key: candidateId,
    isActive: String(dropdownState?.activeKey || "") === candidateId,
    isSelected,
    iconHtml: `
      <span class="select-menu__situation-iconset" aria-hidden="true">
        <span class="select-menu__checkbox ${isSelected ? "is-checked" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
        <span class="select-menu__situation-icon">${issueIcon(getEffectiveSujetStatus(candidateId))}</span>
      </span>
    `,
    title: firstNonEmpty(candidate?.title, candidateId, "Sujet"),
    metaHtml: escapeHtml(getEntityDisplayRef("sujet", candidateId)),
    dataAttrs: { [dataAttr]: candidateId }
  };
}

function buildSubjectMetaMenuItems(subject, field) {
  const dropdownState = getSubjectsViewState().subjectMetaDropdown || {};
  const query = String(dropdownState.query || "").trim().toLowerCase();

  if (field === "assignees") {
    const selectedAssigneeIds = new Set(getSubjectSidebarMeta(subject.id).assignees.map((value) => String(value || "")));
    const collaborators = getActiveProjectCollaborators()
      .filter((collaborator) => matchSearch([collaborator.name, collaborator.role, collaborator.roleGroupLabel, collaborator.email], query));

    const items = collaborators.map((collaborator) => ({
      key: collaborator.id,
      isActive: String(dropdownState.activeKey || "") === collaborator.id,
      isSelected: selectedAssigneeIds.has(collaborator.id),
      iconHtml: `
        <span class="select-menu__assignee-iconset" aria-hidden="true">
          <span class="select-menu__checkbox ${selectedAssigneeIds.has(collaborator.id) ? "is-checked" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
          ${renderCollaboratorAvatar(collaborator)}
        </span>
      `,
      title: collaborator.name,
      metaHtml: escapeHtml(collaborator.role),
      dataAttrs: { "subject-assignee-toggle": collaborator.id },
      groupLabel: getCollaboratorGroupLabel(collaborator)
    }));

    const groupedItemsMap = new Map();
    for (const item of items) {
      const groupLabel = String(item.groupLabel || "Divers");
      if (!groupedItemsMap.has(groupLabel)) groupedItemsMap.set(groupLabel, []);
      groupedItemsMap.get(groupLabel).push(item);
    }
    const preferredOrder = ["Maîtrise d'ouvrage", "Maîtrise d'œuvre", "Entreprises", "Divers"];
    const groupedSections = Array.from(groupedItemsMap.entries())
      .sort((left, right) => {
        const leftIndex = preferredOrder.indexOf(left[0]);
        const rightIndex = preferredOrder.indexOf(right[0]);
        const safeLeft = leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER;
        const safeRight = rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER;
        if (safeLeft !== safeRight) return safeLeft - safeRight;
        return String(left[0]).localeCompare(String(right[0]), "fr");
      })
      .map(([title, groupItems]) => ({ title, items: groupItems }));

    return {
      groupedSections,
      items
    };
  }

  if (field === "objectives") {
    const selectedObjectiveIds = new Set(getSubjectSidebarMeta(subject.id).objectiveIds);
    const objectives = getObjectives();
    const matches = (objective) => matchSearch([objective.title, formatObjectiveDueDateLabel(objective), objective.id], query);
    const toItem = (objective) => {
      const isSelected = selectedObjectiveIds.has(String(objective.id || ""));
      return {
        key: String(objective.id || ""),
        isActive: String(dropdownState.activeKey || "") === String(objective.id || ""),
        isSelected,
        iconHtml: `
          <span class="select-menu__objective-iconset" aria-hidden="true">
            <span class="select-menu__objective-check ${isSelected ? "is-visible" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
            <span class="select-menu__objective-milestone">${svgIcon("milestone", { className: "octicon octicon-milestone" })}</span>
          </span>
        `,
        title: objective.title,
        metaHtml: escapeHtml(formatObjectiveDueDateLabel(objective)),
        dataAttrs: { "objective-select": String(objective.id || "") }
      };
    };
    return {
      openItems: objectives.filter((objective) => !objective.closed && matches(objective)).map(toItem),
      closedItems: objectives.filter((objective) => objective.closed && matches(objective)).map(toItem)
    };
  }

  if (field === "situations") {
    const selectedSituationIds = new Set(getSubjectSidebarMeta(subject.id).situationIds);
    const situationSource = Object.keys(store.projectSubjectsView?.rawSubjectsResult?.situationsById || {}).length
      ? Object.values(store.projectSubjectsView?.rawSubjectsResult?.situationsById || {})
      : (Array.isArray(store.situationsView?.data) && store.situationsView.data.length
        ? store.situationsView.data
        : Object.values(store.projectSubjectsView?.rawSubjectsResult?.relationOptionsById || {}));
    const situations = situationSource.filter((situation) => matchSearch([situation.title, situation.id], query));
    const toItem = (situation) => {
      const isSelected = selectedSituationIds.has(String(situation.id || ""));
      return {
        key: String(situation.id || ""),
        isActive: String(dropdownState.activeKey || "") === String(situation.id || ""),
        isSelected,
        iconHtml: `
          <span class="select-menu__situation-iconset" aria-hidden="true">
            <span class="select-menu__checkbox ${isSelected ? "is-checked" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
            <span class="select-menu__situation-icon">${svgIcon(String(getEffectiveSituationStatus(situation.id) || situation.status || "open").toLowerCase() === "open" ? "table" : "table-check", { className: "ui-icon octicon octicon-table" })}</span>
          </span>
        `,
        title: firstNonEmpty(situation.title, situation.id, "Situation"),
        metaHtml: escapeHtml(situation.id),
        dataAttrs: { "situation-toggle": String(situation.id || "") }
      };
    };
    return {
      openItems: situations.filter((situation) => String(getEffectiveSituationStatus(situation.id) || situation.status || "open").toLowerCase() === "open").map(toItem),
      closedItems: situations.filter((situation) => String(getEffectiveSituationStatus(situation.id) || situation.status || "open").toLowerCase() !== "open").map(toItem)
    };
  }

  if (field === "labels") {
    const selectedLabelKeys = new Set(getSubjectSidebarMeta(subject.id).labels.map((label) => normalizeSubjectLabelKey(label)));
    const items = getProjectSubjectLabels().getSubjectLabelDefinitions()
      .filter((labelDef) => matchSearch([labelDef.label, labelDef.description, labelDef.key], query))
      .map((labelDef) => ({
        key: String(labelDef.key || ""),
        isActive: String(dropdownState.activeKey || "") === String(labelDef.key || ""),
        isSelected: selectedLabelKeys.has(normalizeSubjectLabelKey(labelDef.key)),
        iconHtml: `
          <span class="select-menu__label-iconset" aria-hidden="true">
            <span class="select-menu__checkbox ${selectedLabelKeys.has(normalizeSubjectLabelKey(labelDef.key)) ? "is-checked" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
            <span class="select-menu__label-dot" style="--select-menu-label-dot:${escapeHtml(labelDef.textColor || labelDef.borderColor || labelDef.color || '#8b949e')};"></span>
          </span>
        `,
        title: labelDef.label,
        metaHtml: escapeHtml(labelDef.description),
        dataAttrs: { "subject-label-toggle": String(labelDef.key || "") }
      }));
    return {
      items,
      emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun label disponible."
    };
  }

  if (field === "relations") {
    const relationsView = String(dropdownState.relationsView || "menu");
    if (relationsView === "parent") {
      const selectedParent = getSubjectParentSubject(subject.id);
      const selectedParentId = String(selectedParent?.id || "");
      const suggestions = getRelationParentSuggestions(subject, query);
      const suggestionItems = suggestions
        .filter((item) => String(item?.id || "") !== selectedParentId)
        .map((candidate) => buildRelationSelectItem(candidate, {
          dropdownState,
          dataAttr: "subject-relations-parent-entry"
        }));

      const selectedItem = selectedParent
        ? buildRelationSelectItem(selectedParent, {
          dropdownState,
          isSelected: true,
          dataAttr: "subject-relations-parent-entry"
        })
        : null;

      return {
        selectedItem,
        suggestionItems,
        items: [selectedItem, ...suggestionItems].filter(Boolean),
        emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun sujet suggéré."
      };
    }

    if (relationsView === "blocked_by" || relationsView === "blocking_for") {
      const blockedBySubjects = Array.isArray(getBlockedBySubjects(subject.id)) ? getBlockedBySubjects(subject.id) : [];
      const blockingSubjects = Array.isArray(getBlockingSubjects(subject.id)) ? getBlockingSubjects(subject.id) : [];
      const selectedSubjects = relationsView === "blocked_by" ? blockedBySubjects : blockingSubjects;
      const oppositeSubjects = relationsView === "blocked_by" ? blockingSubjects : blockedBySubjects;
      const selectedIds = new Set(selectedSubjects.map((item) => String(item?.id || "")).filter(Boolean));
      const oppositeIds = new Set(oppositeSubjects.map((item) => String(item?.id || "")).filter(Boolean));
      const dataAttr = relationsView === "blocked_by" ? "subject-relations-blocked-by-entry" : "subject-relations-blocking-for-entry";

      const selectedItems = selectedSubjects
        .map((candidate) => buildRelationSelectItem(candidate, {
          dropdownState,
          isSelected: true,
          dataAttr
        }));

      const suggestionItems = getRelationSubjectSuggestions(subject, query, {
        excludeSubjectIds: [...selectedIds, ...oppositeIds]
      }).map((candidate) => buildRelationSelectItem(candidate, {
        dropdownState,
        isSelected: false,
        dataAttr
      }));

      return {
        selectedItems,
        suggestionItems,
        items: [...selectedItems, ...suggestionItems],
        emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun sujet suggéré."
      };
    }
  }

  const emptyHintMap = {
    assignees: "Aucun assigné pour le moment.",
    labels: "Aucun label pour le moment.",
    relations: "Aucune relation pour le moment."
  };
  return { items: [], emptyHint: emptyHintMap[field] || "Aucune donnée." };
}

function renderSubjectMetaDropdown(subject, field) {
  const dropdownState = getSubjectsViewState().subjectMetaDropdown || {};
  const query = String(dropdownState.query || "");

  if (field === "assignees") {
    const { groupedSections = [] } = buildSubjectMetaMenuItems(subject, field);
    return `
      <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
        <div class="subject-meta-dropdown__title">Sélectionner des assignés</div>
        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="Filtrer les assignés" autocomplete="off">
        </div>
        <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
        <div class="subject-meta-dropdown__body">
          ${groupedSections.length
            ? groupedSections.map((section) => renderSelectMenuSection({
              title: section.title,
              items: section.items,
              emptyTitle: "Aucun collaborateur",
              emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun collaborateur disponible."
            })).join("")
            : renderSelectMenuSection({
              items: [],
              emptyTitle: "Aucun collaborateur",
              emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun collaborateur disponible."
            })}
        </div>
      </div>
    `;
  }

  if (field === "relations") {
    const relationsView = String(dropdownState.relationsView || "menu");
    if (relationsView === "parent" || relationsView === "blocked_by" || relationsView === "blocking_for") {
      const { selectedItem, selectedItems = [], suggestionItems = [], emptyHint } = buildSubjectMetaMenuItems(subject, field);
      const selectedSectionItems = selectedItem ? [selectedItem] : selectedItems;
      const searchPlaceholder = relationsView === "parent"
        ? "Rechercher un sujet parent"
        : "Rechercher un sujet";
      return `
        <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
          <button type="button" class="subject-meta-relations-back" data-subject-relations-back>
            <span class="subject-meta-relations-back__icon">${svgIcon("arrow-left", { className: "octicon octicon-arrow-left" })}</span>
            <span class="subject-meta-relations-back__label">Gérer les relations</span>
          </button>
          <div class="subject-meta-dropdown__search">
            <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
            <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="${escapeHtml(searchPlaceholder)}" autocomplete="off">
          </div>
          <div class="subject-meta-dropdown__body">
            ${relationsView === "parent" && !selectedItem ? `
              <div class="select-menu__section">
                <button type="button" class="select-menu__item subject-meta-relations-menu__item" data-subject-relations-remove-parent>
                  <span class="select-menu__item-mainrow">
                    <span class="select-menu__item-content">
                      <span class="select-menu__item-title">Aucun sujet parent</span>
                      <span class="select-menu__item-meta">Retirer la relation existante</span>
                    </span>
                  </span>
                </button>
              </div>
            ` : renderSelectMenuSection({ title: "Sélectionné", items: selectedSectionItems, emptyTitle: "Aucune sélection", emptyHint: "Aucun sujet sélectionné." })}
            ${renderSelectMenuSection({
              title: "Suggestions",
              items: suggestionItems,
              emptyTitle: "Aucune suggestion",
              emptyHint
            })}
          </div>
        </div>
      `;
    }

    return `
      <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
        <div class="subject-meta-dropdown__body">
          <div class="select-menu__section">
            <button type="button" class="select-menu__item subject-meta-relations-menu__item" role="menuitem" data-subject-relations-open-parent>
              <span class="select-menu__item-mainrow">
                <span class="select-menu__item-content">
                  <span class="select-menu__item-title">Modifier ou supprimer le sujet parent</span>
                </span>
              </span>
            </button>
            <button type="button" class="select-menu__item subject-meta-relations-menu__item" role="menuitem" data-subject-relations-open-blocked-by>
              <span class="select-menu__item-mainrow">
                <span class="select-menu__item-content">
                  <span class="select-menu__item-title">Ajouter ou modifier « Est bloqué par »</span>
                </span>
              </span>
            </button>
            <button type="button" class="select-menu__item subject-meta-relations-menu__item" role="menuitem" data-subject-relations-open-blocking-for>
              <span class="select-menu__item-mainrow">
                <span class="select-menu__item-content">
                  <span class="select-menu__item-title">Ajouter ou modifier « Est bloquant pour »</span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (field === "objectives") {
    const { openItems, closedItems } = buildSubjectMetaMenuItems(subject, field);
    return `
      <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
        <div class="subject-meta-dropdown__title">Sélectionner des objectifs</div>
        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="Filtrer les objectifs" autocomplete="off">
        </div>
        <div class="subject-meta-dropdown__body">
          ${renderSelectMenuSection({ title: "Ouverts", items: openItems, emptyTitle: "Aucun objectif ouvert", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun objectif ouvert disponible." })}
          ${renderSelectMenuSection({ title: "Fermés", items: closedItems, emptyTitle: "Aucun objectif fermé", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun objectif fermé disponible." })}
        </div>
      </div>
    `;
  }

  if (field === "situations") {
    const { openItems, closedItems } = buildSubjectMetaMenuItems(subject, field);
    return `
      <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
        <div class="subject-meta-dropdown__title">Sélectionnez des situations</div>
        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="Rechercher une situation" autocomplete="off">
        </div>
        <div class="subject-meta-dropdown__body">
          <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
          ${renderSelectMenuSection({ items: openItems, emptyTitle: "Aucune situation ouverte", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucune situation ouverte disponible." })}
          <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
          ${renderSelectMenuSection({ title: "Situations fermées", items: closedItems, emptyTitle: "Aucune situation fermée", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucune situation fermée disponible." })}
        </div>
      </div>
    `;
  }

  const { items, emptyHint } = buildSubjectMetaMenuItems(subject, field);
  const titles = {
    assignees: "Assigner ce sujet",
    labels: "Appliquer des labels au sujet",
    relations: "Gérer les relations"
  };
  return `
    <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
      <div class="subject-meta-dropdown__title">${escapeHtml(titles[field] || "Paramètres")}</div>
      ${field === "labels" ? `
        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="Filtrer les labels" autocomplete="off">
        </div>
        <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
      ` : ""}
      <div class="subject-meta-dropdown__body">
        ${renderSelectMenuSection({ items, emptyTitle: "Aucune donnée", emptyHint: emptyHint || "Cette liste sera branchée plus tard." })}
      </div>
    </div>
  `;
}

function getSubjectKanbanMenuEntries(subjectId, situationId, query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  return SUJET_KANBAN_STATUSES
    .filter((status) => matchSearch([status.label, status.hint, status.key], normalizedQuery))
    .map((status) => ({
      key: status.key,
      isActive: String(getSubjectsViewState().subjectKanbanDropdown?.activeKey || "") === status.key,
      isSelected: getSujetKanbanStatus(subjectId, situationId) === status.key,
      iconHtml: `
        <span class="subject-kanban-menu__iconset" aria-hidden="true">
          <span class="subject-kanban-menu__check ${getSujetKanbanStatus(subjectId, situationId) === status.key ? "is-visible" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
          <span class="subject-kanban-menu__dot subject-kanban-menu__dot--${escapeHtml(String(status.key || "").replace(/_/g, "-"))}"></span>
        </span>
      `,
      title: status.label,
      metaHtml: escapeHtml(status.hint),
      dataAttrs: {
        "subject-kanban-select": status.key,
        "subject-kanban-situation-id": situationId,
        "subject-kanban-subject-id": subjectId
      }
    }));
}

function renderSubjectKanbanDropdown(subjectId, situationId) {
  const dropdownState = getSubjectsViewState().subjectKanbanDropdown || {};
  const query = String(dropdownState.query || "");
  const items = getSubjectKanbanMenuEntries(subjectId, situationId, query);
  return `
    <div class="subject-meta-dropdown subject-kanban-dropdown gh-menu gh-menu--open" role="dialog">
      <div class="subject-meta-dropdown__search">
        <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
        <input type="search" class="subject-meta-dropdown__search-input" data-subject-kanban-search="${escapeHtml(subjectId)}" data-subject-kanban-search-situation-id="${escapeHtml(situationId)}" value="${escapeHtml(query)}" placeholder="Filtrer les étapes" autocomplete="off">
      </div>
      <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
      <div class="subject-meta-dropdown__body">
        ${renderSelectMenuSection({ items, emptyTitle: "Aucune étape", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucune étape disponible." })}
      </div>
    </div>
  `;
}

function renderSubjectMetaControls(subject) {
  const meta = getSubjectSidebarMeta(subject.id);
  const selectedObjectives = meta.objectiveIds.map((objectiveId) => getObjectiveById(objectiveId)).filter(Boolean);
  return `
    <div class="subject-meta-controls">
      ${renderSubjectMetaField({
        field: "assignees",
        label: "Assigné à",
        valueHtml: renderSubjectAssigneesValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "labels",
        label: "Labels",
        valueHtml: renderSubjectLabelsValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "situations",
        label: "Situations",
        valueHtml: renderSubjectSituationsValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "objectives",
        label: "Objectifs",
        valueHtml: renderSubjectObjectivesValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "relations",
        label: "Relations",
        valueHtml: renderSubjectRelationsCards(subject.id)
      })}
    </div>
  `;
}

function renderSubissueAssigneesCellHtml(subjectId) {
  const collaborators = getActiveProjectCollaborators();
  const collaboratorsById = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]));
  const assigneeIds = normalizeAssigneeIds(getSubjectSidebarMeta(subjectId).assignees);
  const selected = assigneeIds
    .map((assigneeId) => findCollaboratorByAssigneeId(collaboratorsById, assigneeId) || {
      id: assigneeId,
      userId: "",
      name: `Collaborateur ${String(assigneeId || "").slice(0, 8)}`,
      email: "",
      avatarUrl: ""
    })
    .slice(0, 3);

  if (!selected.length) {
    return `
      <span class="subissues-assignees-placeholder" aria-hidden="true">
        <span class="gh-user-menu__item-icon">
          <svg class="ui-icon octicon octicon-person" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" overflow="visible" aria-hidden="true" focusable="false">
            <use href="assets/icons.svg#person" xlink:href="assets/icons.svg#person"></use>
          </svg>
        </span>
      </span>
    `;
  }

  return `
    <span class="issue-row-assignees" aria-label="${escapeHtml(`${selected.length} assigné(s)`)}}">
      ${selected.map((collaborator) => renderCollaboratorAvatar({
        ...collaborator,
        avatarUrl: firstNonEmpty(
          collaborator?.avatarUrl,
          String(collaborator?.userId || "") === String(store?.user?.id || "") ? String(store?.user?.avatar || "") : ""
        )
      })).join("")}
    </span>
  `;
}

function renderSubIssuesForSujet(sujet, options = {}) {
  ensureViewUiState();
  const sujetRowClass = options.sujetRowClass || "js-row-sujet";
  const childSubjects = getChildSubjectList(sujet);
  if (!childSubjects.length) return "";
  const expandedIds = options.expandedSubjectIds instanceof Set
    ? options.expandedSubjectIds
    : (() => {
      const uiState = getSubjectsViewState();
      if (!(uiState.rightSubissuesExpandedSubjectIds instanceof Set)) {
        uiState.rightSubissuesExpandedSubjectIds = new Set(
          Array.isArray(uiState.rightSubissuesExpandedSubjectIds) ? uiState.rightSubissuesExpandedSubjectIds : []
        );
      }
      return uiState.rightSubissuesExpandedSubjectIds;
    })();
  const openMenuId = String(firstNonEmpty(options.openMenuId, getSubjectsViewState().rightSubissueMenuOpenId, ""));
  const rows = [];
  const walkSubissueTree = (subjectNode, depth = 0, parentId = "") => {
    const subjectId = String(subjectNode?.id || "");
    if (!subjectId) return;
    const nestedChildren = getChildSubjectList(subjectNode);
    const hasChildren = nestedChildren.length > 0;
    const isExpanded = hasChildren && expandedIds.has(subjectId);
    const canDrag = depth === 0;
    const isRowMenuOpen = openMenuId === subjectId;
    const nestedSpacerCells = depth > 0
      ? new Array(depth).fill('<div class="cell cell-subissue-drag-spacer" aria-hidden="true"></div>').join("")
      : "";

    rows.push(`
      <div
        class="issue-row issue-row--pb click ${sujetRowClass}${canDrag ? " subissues-sortable-row" : " subissues-tree-row"}"
        data-sujet-id="${escapeHtml(subjectId)}"
        ${canDrag ? `data-subissue-sortable-row="true"` : ""}
        data-subissue-tree-row="${escapeHtml(subjectId)}"
        data-subissue-depth="${depth}"
        data-parent-subject-id="${escapeHtml(String(parentId || sujet?.id || ""))}"
        data-child-subject-id="${escapeHtml(subjectId)}"
        draggable="${canDrag ? "true" : "false"}"
      >
        <div class="cell cell-subissue-drag-handle">
          ${canDrag
            ? `<button type="button" class="subissue-drag-handle" data-subissue-drag-handle aria-label="Réordonner le sous-sujet">
                ${svgIcon("grabber", { className: "octicon octicon-grabber" })}
              </button>`
            : ""}
        </div>
        ${nestedSpacerCells}
        <div class="cell cell-subissue-drag-spacer">
          ${hasChildren
            ? `<button type="button" class="subissue-tree-toggle js-subissue-tree-toggle" data-subissue-tree-toggle="${escapeHtml(subjectId)}" aria-label="${isExpanded ? "Replier" : "Déplier"} le sous-sujet">
                ${svgIcon(isExpanded ? "chevron-down" : "chevron-right", { className: isExpanded ? "octicon octicon-chevron-down" : "octicon octicon-chevron-right" })}
              </button>`
            : ""}
        </div>
        <div class="subissue-row-main">
          <div class="cell cell-theme cell-theme--full">
            ${issueIcon(getEffectiveSujetStatus(subjectId))}
            <span class="theme-text theme-text--pb">${escapeHtml(firstNonEmpty(subjectNode.title, subjectId, ""))}</span>
            ${renderSubissueInlineMetaHtml(subjectNode, nestedChildren)}
          </div>
          <div class="cell cell-subissue-assignees-value">
            ${renderSubissueAssigneesCellHtml(subjectId)}
          </div>
          <div class="cell cell-subissue-actions">
            <button type="button" class="subissue-actions-trigger" data-subissue-actions-trigger="${escapeHtml(subjectId)}" aria-label="Actions du sous-sujet">
              ${svgIcon("kebab-horizontal", { className: "octicon octicon-kebab-horizontal" })}
            </button>
            ${isRowMenuOpen
              ? `<div class="subissue-actions-menu gh-menu gh-menu--open" role="menu">
                  <button type="button" class="select-menu__item subissue-actions-menu__item" role="menuitem" data-subissue-remove-parent="${escapeHtml(subjectId)}">
                    <span class="select-menu__item-text">
                      <span class="select-menu__item-title">Enlever le sous-sujet</span>
                    </span>
                  </button>
                </div>`
              : ""}
          </div>
        </div>
      </div>
    `);

    if (!isExpanded) return;
    nestedChildren.forEach((nestedChild) => walkSubissueTree(nestedChild, depth + 1, subjectId));
  };

  childSubjects.forEach((childSujet) => walkSubissueTree(childSujet, 0, String(sujet?.id || "")));

  const body = renderSubIssuesTable({
    className: "issues-table subissues-table subissues-table--sortable",
    rowsHtml: rows.join(""),
    emptyTitle: "Aucun sous-sujet"
  });

  return renderSubIssuesPanel({
    title: "Sous-sujets",
    leftMetaHtml: subissuesHeadCountsHtml(childSubjects),
    rightMetaHtml: "",
    bodyHtml: body,
    isOpen: options.isOpen !== false
  });
}

function renderSubIssuesForSituation(situation, options = {}) {
  ensureViewUiState();

  const expandedSet = options.expandedSujets || store.situationsView.rightExpandedSujets;
  const sujetRowClass = options.sujetRowClass || "js-sub-right-select-sujet";
  const sujetToggleClass = options.sujetToggleClass || "js-sub-right-toggle-sujet";
  const rows = [];
  for (const sujet of getSituationSubjects(situation)) {
    const open = expandedSet.has(sujet.id);
    const childSubjects = getChildSubjectList(sujet);
    const hasChildSubjects = childSubjects.length > 0;
    const effStatus = getEffectiveSujetStatus(sujet.id);

    rows.push(`
      <div class="issue-row issue-row--pb click ${sujetRowClass}" data-sujet-id="${escapeHtml(sujet.id)}">
        <div class="cell cell-theme cell-theme--full lvl0">
          <span class="${sujetToggleClass}" data-sujet-id="${escapeHtml(sujet.id)}">${chevron(open, hasChildSubjects)}</span>
          ${issueIcon(effStatus)}
          <span class="theme-text theme-text--pb">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
          <span class="subissues-inline-count mono">${childSubjects.length} sous-sujets</span>
        </div>
      </div>
    `);

    if (open) {
      for (const childSujet of childSubjects) {
        rows.push(`
          <div class="issue-row issue-row--pb click ${sujetRowClass}" data-sujet-id="${escapeHtml(childSujet.id)}">
            <div class="cell cell-theme cell-theme--full lvl1">
              ${issueIcon(getEffectiveSujetStatus(childSujet.id))}
              <span class="theme-text theme-text--pb">${escapeHtml(firstNonEmpty(childSujet.title, childSujet.id, ""))}</span>
            </div>
          </div>
        `);
      }
    }
  }

  const body = renderSubIssuesTable({
    rowsHtml: rows.join(""),
    emptyTitle: "Aucun sujet"
  });

  return renderSubIssuesPanel({
    title: "Sujets rattachés",
    leftMetaHtml: problemsCountsHtml(situation),
    rightMetaHtml: "",
    bodyHtml: body,
    isOpen: !!store.situationsView.rightSubissuesOpen
  });
}



function scheduleSubjectsPanelsRerender(callback, options = {}) {
  const maxAttempts = Number.isFinite(Number(options?.maxAttempts)) ? Math.max(1, Number(options.maxAttempts)) : 12;
  let attempt = 0;

  const tryRerender = () => {
    const connectedRoot = getSubjectsCurrentRoot();
    const connectedPanelHost = document.getElementById("situationsPanelHost");
    if (connectedRoot?.isConnected || connectedPanelHost?.isConnected) {
      callback();
      return;
    }
    attempt += 1;
    if (attempt >= maxAttempts) return;
    requestAnimationFrame(tryRerender);
  };

  tryRerender();
}

async function reloadSubjectsFromSupabase(root = getSubjectsCurrentRoot(), options = {}) {
  const targetRoot = root || getSubjectsCurrentRoot();
  const shouldRerender = options?.rerender !== false;
  const shouldUpdateModal = !!options?.updateModal;
  const primaryScrollState = getDocumentScrollState();

  const data = await loadExistingSubjectsForCurrentProject({ force: true });

  const rerenderLoadedPanels = () => {
    rerenderPanels();
    restoreDocumentScrollState(primaryScrollState);
  };

  if (shouldRerender) {
    const currentRoot = targetRoot?.isConnected ? targetRoot : getSubjectsCurrentRoot();
    const panelHost = document.getElementById("situationsPanelHost");
    if (currentRoot?.isConnected || panelHost?.isConnected) {
      rerenderLoadedPanels();
    } else {
      requestAnimationFrame(() => {
        const nextRoot = getSubjectsCurrentRoot();
        const nextPanelHost = document.getElementById("situationsPanelHost");
        if (!nextRoot?.isConnected && !nextPanelHost?.isConnected) return;
        rerenderLoadedPanels();
      });
    }
  }

  if (store.situationsView.drilldown?.isOpen) {
    getProjectSubjectDrilldown().updateDrilldownPanel();
  }

  return data;
}


function getScrollableElementScrollState(element) {
  if (!element) return null;
  return {
    scrollTop: Number(element.scrollTop || 0)
  };
}

function restoreScrollableElementScrollState(element, state) {
  if (!element || !state) return;
  const maxScrollTop = Math.max(0, Number(element.scrollHeight || 0) - Number(element.clientHeight || 0));
  element.scrollTop = Math.max(0, Math.min(Number(state.scrollTop || 0), maxScrollTop));
}

function getDocumentScrollState() {
  return {
    scrollTop: Number(window.scrollY || window.pageYOffset || document.documentElement?.scrollTop || document.body?.scrollTop || 0)
  };
}

function restoreDocumentScrollState(state) {
  if (!state) return;
  window.scrollTo({ top: Math.max(0, Number(state.scrollTop || 0)), behavior: "auto" });
}

function syncSituationsPrimaryScrollSource() {
  refreshProjectShellChrome("situations");
}

function rerenderPanels() {
  ensureViewUiState();
  document.body.classList.remove("project-subject-details-top-compact");
  document.body.classList.remove("project-subject-normal-detail-flow");

  const detailsScrollState = getDocumentScrollState();
  const filteredSituations = getFilteredSituations();
  const counts = getVisibleCounts(filteredSituations);
  const panelHost = document.getElementById("situationsPanelHost");
  const searchInput = document.getElementById("situationsSearch");

  if (searchInput) searchInput.value = store.situationsView.search || "";

  rerenderSubjectsToolbar();

  const shouldDisableProjectCompact = !!panelHost
    && !store.situationsView.createSubjectForm?.isOpen
    && String(store.situationsView.subjectsSubview || "subjects") === "subjects"
    && !store.situationsView.showTableOnly;
  document.body.classList.toggle("project-subject-normal-detail-flow", shouldDisableProjectCompact);
  setProjectCompactEnabled(!shouldDisableProjectCompact);

  if (panelHost) {
    if (store.situationsView.createSubjectForm?.isOpen) {
      panelHost.innerHTML = `<div id="subjectCreateFormHost" class="project-table-host">${renderCreateSubjectFormHtml()}</div>`;
      const createFormRoot = panelHost.querySelector("[data-create-subject-form]");
      wireDetailsInteractive(createFormRoot);
      syncSituationsPrimaryScrollSource();
    } else if (String(store.situationsView.subjectsSubview || "subjects") === "labels") {
      panelHost.innerHTML = `<div id="labelsTableHost" class="project-table-host">${getProjectSubjectLabels().renderLabelsTableHtml()}</div>`;
      syncSituationsPrimaryScrollSource();
    } else if (String(store.situationsView.subjectsSubview || "subjects") === "objectives") {
      panelHost.innerHTML = `<div id="objectivesTableHost" class="project-table-host">${getProjectSubjectMilestones().renderObjectivesTableHtml()}</div>`;
      syncSituationsPrimaryScrollSource();
    } else if (store.situationsView.showTableOnly) {
      panelHost.innerHTML = `<div id="situationsTableHost" class="project-table-host">${renderProjectSubjectsTable({
        filteredSituations,
        deps: getSubjectsTableDeps()
      })}</div>`;
      syncSituationsPrimaryScrollSource();
    } else {
      const details = getProjectSubjectDetail().renderDetailsHtml(null, {
        showExpand: false,
        renderDiscussion: false,
        discussionScopeHost: "main",
        subissuesOptions: {
          sujetRowClass: "js-modal-drilldown-sujet",
          sujetToggleClass: "js-modal-toggle-sujet",
          avisRowClass: "js-modal-drilldown-avis",
          expandedSujets: store.situationsView.rightExpandedSujets,
          expandedSubjectIds: store.situationsView.rightSubissuesExpandedSubjectIds,
          openMenuId: store.situationsView.rightSubissueMenuOpenId,
          isOpen: store.situationsView.rightSubissuesOpen
        }
      });
      panelHost.innerHTML = `
        <section id="situationsDetailsChrome" class="overlay-chrome gh-panel gh-panel--details subject-details-shell" aria-label="Details">
          ${getProjectSubjectDetail().renderNormalDetailsChromeHeadHtml(null, { headId: "situationsDetailsTitle", headClassName: "drilldown__head" })}
          <div class="overlay-chrome__body details-body subject-details-body" id="situationsDetailsHost">${details.bodyHtml}</div>
        </section>
      `;
      const detailsHost = document.getElementById("situationsDetailsHost");
      renderDetailsDiscussionScopes(detailsHost);
      wireDetailsInteractive(detailsHost);
      bindDetailsScroll(document);
      restoreDocumentScrollState(detailsScrollState);
      requestAnimationFrame(() => {
        restoreDocumentScrollState(detailsScrollState);
        const currentDetailsHost = document.getElementById("situationsDetailsHost");
        currentDetailsHost?.__syncCondensedTitle?.();
      });
      syncSituationsPrimaryScrollSource();
    }
  }

  if (store.situationsView.drilldown?.isOpen) getProjectSubjectDrilldown().updateDrilldownPanel();
  refreshProjectShellChrome("situations");
}



/* =========================================================
   Details actions (archive-like)
========================================================= */



function rerenderScope(root) {
  const detailsHost = document.getElementById("situationsDetailsHost");
  const detailsModalBody = document.getElementById("detailsBodyModal");
  const shouldRerenderDetailsModal = !!detailsModalBody
    && detailsModalBody.isConnected
    && !!root?.closest?.("#detailsBodyModal")
    && !!(store.projectSubjectsView?.detailsModalOpen || store.situationsView?.detailsModalOpen);
  const shouldRerenderDetailsOnly = !!detailsHost
    && detailsHost.isConnected
    && !store.situationsView.createSubjectForm?.isOpen
    && String(store.situationsView.subjectsSubview || "subjects") === "subjects"
    && !store.situationsView.showTableOnly
    && !!root?.closest?.("#situationsDetailsHost");
  const isThreadScopeRoot = !!root?.closest?.("[data-details-thread-host]");
  const isComposerScopeRoot = !!root?.closest?.("[data-details-composer-host]");
  const drilldownBody = document.getElementById("drilldownBody");
  const isDrilldownScopeRoot = !!root?.closest?.("#drilldownPanel");

  if (shouldRerenderDetailsModal) {
    debugRenderScope("details-modal", { mode: "full-modal-rerender" });
    getProjectSubjectDetail().updateDetailsModal();
    return;
  }

  if (shouldRerenderDetailsOnly) {
    if (isThreadScopeRoot || isComposerScopeRoot) {
      debugRenderScope(isThreadScopeRoot ? "thread" : "composer", { mode: "scoped-rerender" });
      renderDetailsDiscussionScopes(detailsHost, {
        renderThread: isThreadScopeRoot,
        renderComposer: isComposerScopeRoot
      });
      return;
    }
    debugRenderScope("details-shell", { mode: "full-details-rerender" });
    const detailsScrollState = getScrollableElementScrollState(detailsHost);
    const details = getProjectSubjectDetail().renderDetailsHtml(null, {
      showExpand: false,
      renderDiscussion: false,
      discussionScopeHost: "main",
      subissuesOptions: {
        sujetRowClass: "js-modal-drilldown-sujet",
        sujetToggleClass: "js-modal-toggle-sujet",
        avisRowClass: "js-modal-drilldown-avis",
        expandedSujets: store.situationsView.rightExpandedSujets,
        expandedSubjectIds: store.situationsView.rightSubissuesExpandedSubjectIds,
        openMenuId: store.situationsView.rightSubissueMenuOpenId,
        isOpen: store.situationsView.rightSubissuesOpen
      }
    });
    detailsHost.innerHTML = details.bodyHtml;
    renderDetailsDiscussionScopes(detailsHost);
    wireDetailsInteractive(detailsHost);
    bindDetailsScroll(document);
    restoreScrollableElementScrollState(detailsHost, detailsScrollState);
    requestAnimationFrame(() => {
      restoreScrollableElementScrollState(detailsHost, detailsScrollState);
      const currentDetailsHost = document.getElementById("situationsDetailsHost");
      currentDetailsHost?.__syncCondensedTitle?.();
    });
  } else {
    if (isDrilldownScopeRoot && drilldownBody && (isThreadScopeRoot || isComposerScopeRoot)) {
      debugRenderScope(isThreadScopeRoot ? "thread" : "composer", { mode: "scoped-rerender", host: "drilldown" });
      debugThreadScope("rerender", {
        host: "drilldown",
        reason: isThreadScopeRoot ? "thread-scope" : "composer-scope"
      });
      renderDetailsDiscussionScopes(drilldownBody, {
        renderThread: isThreadScopeRoot,
        renderComposer: isComposerScopeRoot,
        selectionOverride: getSelectionForScope("drilldown")
      });
      return;
    }
    rerenderPanels();
  }

  if (root?.closest?.("#drilldownPanel") && drilldownBody) {
    getProjectSubjectDrilldown().updateDrilldownPanel();
  }
}

const scheduledScopeRenders = new Map();
let scheduledScopeRendersFrame = 0;

function isRenderScopeDebugEnabled() {
  try {
    const search = String(window?.location?.search || "");
    if (search.includes("debugRenderScopes=1")) return true;
    const localValue = String(window?.localStorage?.getItem?.("mdall:debug-render-scopes") || "").trim().toLowerCase();
    const sessionValue = String(window?.sessionStorage?.getItem?.("mdall:debug-render-scopes") || "").trim().toLowerCase();
    const globalValue = String(window?.__MDALL_DEBUG_RENDER_SCOPES__ || "").trim().toLowerCase();
    return localValue === "1"
      || localValue === "true"
      || sessionValue === "1"
      || sessionValue === "true"
      || globalValue === "1"
      || globalValue === "true";
  } catch {
    return false;
  }
}

function debugRenderScope(scope, payload = {}) {
  if (!isRenderScopeDebugEnabled()) return;
  console.log("[subject-render-scope]", String(scope || "unknown"), payload);
}

function debugThreadScope(scope, payload = {}) {
  if (!isRenderScopeDebugEnabled()) return;
  console.log("[subject-thread-scope]", String(scope || "unknown"), payload);
}

function scheduleScopedRerender(scopeKey, resolveRoot) {
  const normalizedScopeKey = String(scopeKey || "").trim();
  if (!normalizedScopeKey) return;
  const resolver = typeof resolveRoot === "function" ? resolveRoot : () => resolveRoot;
  scheduledScopeRenders.set(normalizedScopeKey, resolver);
  debugRenderScope(`${normalizedScopeKey}:scheduled`);
  if (scheduledScopeRendersFrame) return;
  scheduledScopeRendersFrame = requestAnimationFrame(() => {
    const pendingRenders = Array.from(scheduledScopeRenders.entries());
    scheduledScopeRenders.clear();
    scheduledScopeRendersFrame = 0;
    pendingRenders.forEach(([pendingScopeKey, currentResolver]) => {
      const root = currentResolver?.();
      if (!root) return;
      debugRenderScope(`${pendingScopeKey}:flushed`);
      rerenderScope(root);
    });
  });
}

function scheduleDetailsThreadRerender(options = {}) {
  const scopeHost = String(options?.scopeHost || "main").trim().toLowerCase() === "drilldown" ? "drilldown" : "main";
  scheduleScopedRerender(`details-thread:${scopeHost}`, () => {
    const detailsHost = scopeHost === "drilldown"
      ? document.getElementById("drilldownBody")
      : document.getElementById("situationsDetailsHost");
    return detailsHost?.querySelector?.("[data-details-thread-host]") || null;
  });
}

function scheduleDetailsComposerRerender(options = {}) {
  const scopeHost = String(options?.scopeHost || "main").trim().toLowerCase() === "drilldown" ? "drilldown" : "main";
  scheduleScopedRerender(`details-composer:${scopeHost}`, () => {
    const detailsHost = scopeHost === "drilldown"
      ? document.getElementById("drilldownBody")
      : document.getElementById("situationsDetailsHost");
    return detailsHost?.querySelector?.("[data-details-composer-host]") || detailsHost || document;
  });
}

function renderDetailsDiscussionScopes(detailsHost, options = {}) {
  if (!detailsHost || !detailsHost.isConnected) return;
  const {
    renderThread = true,
    renderComposer = true,
    selectionOverride = null
  } = options;
  if (!renderThread && !renderComposer) return;
  const scopeHost = detailsHost?.closest?.("#drilldownPanel") ? "drilldown" : "main";
  const scopedSelection = selectionOverride || getSelectionForScope(scopeHost);

  if (renderThread) {
    ensureTimelineLoadedForSelection(scopedSelection, { scopeHost });
    debugRenderScope("thread", { host: scopeHost, reason: "renderDetailsDiscussionScopes:load" });
    debugThreadScope("load-timeline", {
      host: scopeHost,
      subjectId: String(scopedSelection?.item?.id || ""),
      force: false
    });
  }
  const discussion = getProjectSubjectDetail().renderDetailsDiscussionHtml(scopedSelection, {
    renderThread,
    renderComposer,
    scopeHost
  });
  if (renderThread) {
    debugRenderScope("thread", { host: scopeHost, target: "details-thread-host" });
    debugThreadScope("render", {
      host: scopeHost,
      subjectId: String(scopedSelection?.item?.id || ""),
      source: "renderDetailsDiscussionScopes.thread"
    });
    const threadHost = detailsHost.querySelector("[data-details-thread-host]");
    if (threadHost) {
      threadHost.innerHTML = discussion.threadHtml;
      wireDetailsInteractive(threadHost);
    }
  }
  if (renderComposer) {
    debugRenderScope("composer", { host: scopeHost, target: "details-composer-host" });
    debugThreadScope("render", {
      host: scopeHost,
      subjectId: String(scopedSelection?.item?.id || ""),
      source: "renderDetailsDiscussionScopes.composer"
    });
    const composerHost = detailsHost.querySelector("[data-details-composer-host]");
    if (composerHost) {
      composerHost.innerHTML = discussion.composerHtml;
      wireDetailsInteractive(composerHost);
    }
  }
}

async function applyCommentAction(root) {
  const target = currentDecisionTarget(root);
  if (!target) return;

  const ta = root.querySelector("#humanCommentBox");
  if (!ta) return;

  const message = String(ta.value || "").trim();
  const composerAttachments = store.situationsView?.subjectComposerAttachments || {};
  const hasAttachmentsForTarget = target.type === "sujet"
    && String(composerAttachments?.subjectId || "").trim() === String(target.id || "").trim()
    && Array.isArray(composerAttachments?.items)
    && composerAttachments.items.some((entry) => String(entry?.uploadStatus || "").trim() === "ready" && !entry?.error);
  if (!message && !hasAttachmentsForTarget) return;
  const mentions = extractStructuredMentions(message);

  const helpActive = !!store.situationsView.helpMode;
  if (helpActive) {
    ta.value = "";
    store.situationsView.commentDraft = "";
    store.situationsView.commentPreviewMode = false;
    return;
  }

  const replyContext = store.situationsView?.replyContext || {};
  const replySubjectId = String(replyContext?.subjectId || "").trim();
  const parentMessageId = target.type === "sujet" && replySubjectId === String(target.id || "").trim()
    ? String(replyContext?.parentMessageId || "").trim()
    : "";
  const uploadSessionId = hasAttachmentsForTarget ? String(composerAttachments?.uploadSessionId || "").trim() : "";

  await addComment(target.type, target.id, message, {
    actor: "Human",
    agent: "human",
    parentMessageId: parentMessageId || undefined,
    mentions,
    uploadSessionId: uploadSessionId || undefined
  });
  ta.value = "";
  store.situationsView.commentDraft = "";
  store.situationsView.commentPreviewMode = false;
  if (store.situationsView?.replyContext) {
    store.situationsView.replyContext.subjectId = "";
    store.situationsView.replyContext.parentMessageId = "";
    store.situationsView.replyContext.parentPreview = "";
  }
  if (store.situationsView?.subjectComposerAttachments && target.type === "sujet") {
    const pendingItems = Array.isArray(store.situationsView.subjectComposerAttachments.items)
      ? store.situationsView.subjectComposerAttachments.items
      : [];
    pendingItems.forEach((entry) => {
      try {
        const localPreviewUrl = String(entry?.localPreviewUrl || "").trim();
        if (localPreviewUrl && window?.URL?.revokeObjectURL) {
          window.URL.revokeObjectURL(localPreviewUrl);
        }
      } catch {}
    });
    store.situationsView.subjectComposerAttachments.subjectId = String(target.id || "");
    store.situationsView.subjectComposerAttachments.uploadSessionId = "";
    store.situationsView.subjectComposerAttachments.items = [];
  }
  const detailsHost = document.getElementById("situationsDetailsHost");
  const composerHost = root?.closest?.("[data-details-composer-host]")
    || detailsHost?.querySelector?.("[data-details-composer-host]");
  if (composerHost) {
    scheduleDetailsComposerRerender();
  } else {
    rerenderScope(root);
  }

}

function syncCommentPreview(root) {
  const ta = root.querySelector("#humanCommentBox");
  const preview = root.querySelector("#humanCommentPreview");
  if (!preview) return;

  const markdown = String(ta?.value || store.situationsView.commentDraft || "");
  const rendered = mdToHtml(markdown);
  if (!rendered) {
    const emptyHint = String(preview.dataset.emptyHint || "Use Markdown to format your comment");
    preview.innerHTML = `<div class="comment-composer__preview-empty">${escapeHtml(emptyHint)}</div>`;
    return;
  }

  preview.innerHTML = rendered;
}


const subjectSelectDropdown = createSelectDropdownController({
  getViewState: getSubjectsViewState,
  bindingKey: "project-subjects-dropdown",
  getScopeRoot: () => getSubjectSelectDropdownScopeRoot(getSubjectsViewState),
  ensureHost: ensureSelectDropdownHost,
  renderHost: (root) => renderSelectDropdownHost({
    getViewState: getSubjectsViewState,
    root,
    getScopedSelection,
    renderMetaDropdown: renderSubjectMetaDropdown,
    renderKanbanDropdown: renderSubjectKanbanDropdown,
    ensureHost: ensureSelectDropdownHost
  }),
  onSyncPosition: (scopeRoot) => syncSelectDropdownPosition({
    getViewState: getSubjectsViewState,
    root: scopeRoot,
    getScopeRoot: () => getSubjectSelectDropdownScopeRoot(getSubjectsViewState),
    ensureHost: ensureSelectDropdownHost
  })
});

function closeSubjectMetaDropdown() {
  subjectSelectDropdown.closeMeta();
}

function closeSubjectKanbanDropdown() {
  subjectSelectDropdown.closeKanban();
}

function getSubjectMetaMenuEntries(subject, field) {
  const config = buildSubjectMetaMenuItems(subject, field);
  if (field === "objectives" || field === "situations") return [...(config.openItems || []), ...(config.closedItems || [])];
  return config.items || [];
}

function setSubjectMetaActiveEntry(subject, field, direction = 1) {
  const entries = getSubjectMetaMenuEntries(subject, field);
  if (!entries.length) {
    getSubjectsViewState().subjectMetaDropdown.activeKey = "";
    return;
  }
  const currentKey = String(getSubjectsViewState().subjectMetaDropdown.activeKey || "");
  const currentIndex = entries.findIndex((entry) => String(entry?.key || "") === currentKey);
  const nextIndex = currentIndex >= 0
    ? (currentIndex + direction + entries.length) % entries.length
    : 0;
  getSubjectsViewState().subjectMetaDropdown.activeKey = String(entries[nextIndex]?.key || "");
}

function ensureSubjectMetaDropdownHost() {
  return ensureSelectDropdownHost();
}

function getSubjectMetaScopeRoot() {
  return getSubjectSelectDropdownScopeRoot(getSubjectsViewState);
}

function renderSubjectMetaDropdownHost(root) {
  return subjectSelectDropdown.renderHost(root);
}

function rerenderSubjectMetaScopes() {
  rerenderPanels();
  if (document.getElementById("drilldownBody")) getProjectSubjectDrilldown().updateDrilldownPanel();
}

function focusSubjectMetaSearch(root, field) {
  subjectSelectDropdown.focusSearch({ field });
}

function focusSubjectKanbanSearch(subjectId, situationId) {
  subjectSelectDropdown.focusSearch({ subjectId, situationId });
}

function syncSubjectMetaDropdownPosition(root) {
  subjectSelectDropdown.syncPosition(root);
}

function renderSubjectsToolbarButton({ id, label, icon, action, tone = "default" }) {
  return renderGhActionButton({
    id,
    label,
    icon,
    tone,
    size: "md",
    mainAction: action,
    withChevron: false
  });
}

function renderSituationsAddAction() {
  return renderSubjectsToolbarButton({
    id: "situationsAddAction",
    label: "Nouveau sujet",
    tone: "primary",
    action: "add-sujet"
  });
}

function renderObjectivesCreateAction() {
  return renderSubjectsToolbarButton({
    id: "objectivesCreateAction",
    label: "Nouvel objectif",
    tone: "primary",
    action: "add-objective"
  });
}

function renderSubjectsLabelsAction() {
  return renderSubjectsToolbarButton({
    id: "subjectsLabelsAction",
    label: "Labels",
    icon: svgIcon("tag", { className: "octicon octicon-tag" }),
    action: "open-labels"
  });
}

function renderSubjectsObjectivesAction() {
  return renderSubjectsToolbarButton({
    id: "subjectsObjectivesAction",
    label: "Objectifs",
    icon: svgIcon("milestone", { className: "octicon octicon-milestone" }),
    action: "open-objectives"
  });
}

function renderCreateSubjectMetaControls() {
  const subject = getDraftSubjectSelection()?.item || { id: DRAFT_SUBJECT_ID };
  const meta = getSubjectSidebarMeta(subject.id);
  const objective = meta.objectiveIds.map((objectiveId) => getObjectiveById(objectiveId)).filter(Boolean)[0] || null;
  return `
    <div class="subject-meta-controls subject-meta-controls--create">
      ${renderSubjectMetaField({
        field: "assignees",
        label: "Assigné à",
        valueHtml: renderSubjectAssigneesValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "labels",
        label: "Labels",
        valueHtml: renderSubjectLabelsValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "situations",
        label: "Situations",
        valueHtml: renderSubjectSituationsValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "objectives",
        label: "Objectifs",
        valueHtml: objective ? renderSubjectObjectivesValue(subject.id) : renderSubjectMetaButtonValue("Aucun objectif")
      })}
    </div>
  `;
}

function renderCreateSubjectFormHtml() {
  ensureViewUiState();
  const form = store.situationsView.createSubjectForm || {};
  const avatar = String(store.user?.avatar || "assets/images/260093543.png");
  const previewHtml = mdToHtml(String(form.description || "").trim());
  return `
    <section class="subject-create-shell" data-create-subject-form>
      <div class="subject-create-layout">
        <div class="subject-create-main">
          <div class="subject-create-header">
            <img src="${escapeHtml(avatar)}" alt="Avatar" class="subject-create-header__avatar">
            <div class="subject-create-header__title">Create new issue</div>
          </div>

          <label class="subject-create-field">
            <span class="subject-create-field__label">Add a title <span class="subject-create-field__required">*</span></span>
            <input type="text" class="subject-create-input" data-create-subject-title value="${escapeHtml(String(form.title || ""))}" placeholder="Title" autocomplete="off">
          </label>

          <div class="subject-create-field subject-create-field--editor">
            <div class="subject-create-field__label">Add a description</div>
            ${renderCommentComposer({
              hideAvatar: true,
              hideTitle: true,
              previewMode: !!form.previewMode,
              textareaId: "createSubjectDescriptionBox",
              previewId: "createSubjectDescriptionPreview",
              textareaValue: String(form.description || ""),
              textareaAttributes: {
                "data-create-subject-description": "true"
              },
              placeholder: "Type your description here...",
              tabWriteAction: "create-subject-tab-write",
              tabPreviewAction: "create-subject-tab-preview",
              tabsClassName: "comment-composer__tabs--thread-reply",
              composerClassName: "comment-composer--thread-reply-editor",
              toolbarHtml: renderSubjectMarkdownToolbar({ buttonAction: "create-subject-format", svgIcon }),
              previewHtml: previewHtml || "",
              previewEmptyHint: "Use Markdown to format your comment",
              footerHtml: `
                <input type="file" class="subject-composer-file-input" data-role="create-subject-file-input" multiple />
                <div class="subject-composer-attachments-preview ${(Array.isArray(form.attachments) && form.attachments.length) ? "" : "hidden"}" data-role="create-subject-attachments-preview" aria-live="polite">
                  ${renderSubjectAttachmentsPreviewList({
                    attachments: normalizeCreateSubjectDraftAttachments(form.attachments),
                    removeAction: "create-subject-attachment-remove",
                    escapeHtml,
                    svgIcon
                  })}
                </div>
              `
            })}
            ${form.validationError ? `<div class="subject-create-form__error">${escapeHtml(form.validationError)}</div>` : ""}
          </div>

          <div class="subject-create-footer">
            <div class="subject-create-footer__left">
              <label class="subject-create-checkbox">
                <input type="checkbox" data-create-subject-create-more ${form.createMore ? "checked" : ""}>
                <span>En ajouter d'autres</span>
              </label>
            </div>
            <div class="subject-create-footer__right">
              <button type="button" class="gh-btn" data-create-subject-cancel>Annuler</button>
              <button type="button" class="gh-btn gh-btn--primary" data-create-subject-submit ${form.isSubmitting ? "disabled" : ""}>${form.isSubmitting ? "Création..." : "Ajouter"}</button>
            </div>
          </div>
        </div>
        <aside class="subject-create-aside details-meta-col">
          ${renderCreateSubjectMetaControls()}
        </aside>
      </div>
    </section>
  `;
}

function renderSituationsViewHeaderHtml() {
  if (store.situationsView.createSubjectForm?.isOpen) {
    return "";
  }
  if (String(store.situationsView.subjectsSubview || "subjects") === "labels") {
    return renderProjectTableToolbar({
      className: "project-table-toolbar--situations project-table-toolbar--labels",
      leftHtml: renderProjectTableToolbarGroup({
        html: '<div class="project-table-toolbar__title">Labels</div>'
      }),
      rightHtml: renderProjectTableToolbarGroup({
        html: renderSubjectsToolbarButton({ id: "labelsCreateAction", label: "Nouveau label", action: "add-label", tone: "primary" })
      })
    });
  }

  if (String(store.situationsView.subjectsSubview || "subjects") === "objectives") {
    return getProjectSubjectMilestones().renderObjectivesViewHeaderHtml();
  }

  const rightHtml = [
    renderProjectTableToolbarGroup({
      html: renderProjectTableToolbarSearch({
        id: "situationsSearch",
        value: String(store.situationsView.search || ""),
        placeholder: "topic / EC8 / mot-clé…"
      })
    }),
    renderProjectTableToolbarGroup({
      html: renderSubjectsLabelsAction()
    }),
    renderProjectTableToolbarGroup({
      html: renderSubjectsObjectivesAction()
    }),
    renderProjectTableToolbarGroup({
      html: renderSituationsAddAction()
    })
  ].join("");

  return renderProjectTableToolbar({
    className: "project-table-toolbar--situations",
    leftHtml: "",
    rightHtml
  });
}

function rerenderSubjectsToolbar() {
  const toolbarHost = document.getElementById("situationsToolbarHost");
  if (!toolbarHost) return;
  if (toolbarHost.dataset.toolbarOwner === "situations") {
    toolbarHost.innerHTML = "";
    return;
  }
  if (!store.situationsView?.showTableOnly) {
    toolbarHost.innerHTML = "";
    return;
  }
  const headerHtml = renderSituationsViewHeaderHtml();
  if (!String(headerHtml || "").trim()) {
    toolbarHost.innerHTML = "";
    return;
  }
  toolbarHost.innerHTML = `
    <div class="project-situations__table-toolbar project-page-shell project-page-shell--toolbar">
      ${headerHtml}
    </div>
  `;
}

function formatObjectiveMeta(objective) {
  const dueDate = objective?.dueDate
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(objective.dueDate))
    : "Pas de date définie";
  const counts = getObjectiveSubjectCounts(objective);
  return `${dueDate} - ${counts.closed}/${counts.total} sujets fermés`;
}



function getObjectives() {
  const rawResult = (store.projectSubjectsView?.rawSubjectsResult && typeof store.projectSubjectsView.rawSubjectsResult === "object")
    ? store.projectSubjectsView.rawSubjectsResult
    : ((store.projectSubjectsView?.rawResult && typeof store.projectSubjectsView.rawResult === "object")
      ? store.projectSubjectsView.rawResult
      : null);

  return Array.isArray(rawResult?.objectives) ? rawResult.objectives : [];
}

function getObjectiveById(objectiveId) {
  const normalizedObjectiveId = String(objectiveId || "");
  const rawResult = (store.projectSubjectsView?.rawSubjectsResult && typeof store.projectSubjectsView.rawSubjectsResult === "object")
    ? store.projectSubjectsView.rawSubjectsResult
    : ((store.projectSubjectsView?.rawResult && typeof store.projectSubjectsView.rawResult === "object")
      ? store.projectSubjectsView.rawResult
      : null);

  if (rawResult?.objectivesHydrated && rawResult?.objectivesById && typeof rawResult.objectivesById === "object") {
    return rawResult.objectivesById[normalizedObjectiveId] || null;
  }

  return getObjectives().find((objective) => String(objective?.id || "") === normalizedObjectiveId) || null;
}


  return {
    dropdownController: subjectSelectDropdown,
    normalizeBackendPriority,
    priorityBadge,
    statePill,
    entityDisplayLinkHtml,
    renderDocumentRefsCard,
    inferAgent,
    normActorName,
    miniAuthorIconHtml,
    verdictIconHtml,
    getDraftSubjectSelection,
    buildDefaultDraftSubjectMeta,
    resetCreateSubjectForm,
    openCreateSubjectForm,
    getCustomSubjects,
    createSubjectFromDraft,
    normalizeSujetKanbanStatus,
    getSujetKanbanStatus,
    normalizeSubjectObjectiveIds,
    normalizeSubjectSituationIds,
    normalizeSubjectLabelKey,
    normalizeSubjectLabels,
    getSubjectSidebarMeta,
    getObjectives,
    getObjectiveById,
    matchSearch,
    reloadSubjectsFromSupabase,
    getEffectiveSujetStatus,
    getHeadVisibleBlockedBySubjects,
    getEffectiveAvisVerdict,
    getEffectiveSituationStatus,
    problemsCountsHtml,
    problemsCountsIconHtml,
    renderSubjectBlockedByHeadHtml,
    renderSubjectParentHeadHtml,
    renderDetailedMetaForSelection,
    renderSubjectMetaControls,
    renderSubjectMetaFieldValue,
    renderSubIssuesForSujet,
    renderSubIssuesForSituation,
    closeSubjectMetaDropdown,
    closeSubjectKanbanDropdown,
    getSubjectMetaMenuEntries,
    setSubjectMetaActiveEntry,
    getSubjectKanbanMenuEntries,
    renderSubjectMetaDropdownHost,
    focusSubjectMetaSearch,
    focusSubjectKanbanSearch,
    syncSubjectMetaDropdownPosition,
    getSubjectMetaScopeRoot,
    renderSubjectsToolbarButton,
    renderSituationsAddAction,
    renderSubjectsPriorityHeadHtml,
    getSubjectsTableDeps,
    renderCreateSubjectFormHtml,
    rerenderSubjectsToolbar,
    syncSituationsPrimaryScrollSource,
    rerenderPanels,
    rerenderScope,
    scheduleScopedRerender,
    scheduleDetailsThreadRerender,
    scheduleDetailsComposerRerender,
    syncCommentPreview,
    applyCommentAction
  };
}
