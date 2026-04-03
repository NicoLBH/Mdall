import { store } from "../store.js";
import { getPreferredAnalysisDocumentIds, normalizeDocumentRefIds, setLastAnalysisDocumentIds } from "./project-documents-store.js";
import { rerenderRoute } from "../router.js";
import { syncProjectSituationsRunbar } from "../views/project-situations-runbar.js";
import {
  finishRunLogEntry,
  getPrimaryAnalysisAgent,
  startRunLogEntry
} from "./project-automation.js";

const SUPABASE_URL = "https://olgxhfgdzyghlzxmremz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_08nUL61_ATl-6KpD8dOYPw_RM5lMtEz";
const STORAGE_BUCKET = "documents";
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";

const FETCH_TIMEOUT_MS = 60_000;

// logique archive
const POLL_BASE_MS = 2000;
const POLL_MAX_INTERVAL_MS = 20_000;
const POLL_MAX_MS = 12 * 60_000;
const POLL_FAST_TRIES = 5;

let activeRunPromise = null;
let activePollToken = 0;

function generateAnalysisRunId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function el(id) {
  return document.getElementById(id);
}

function syncRunbar(extra = {}) {
  syncProjectSituationsRunbar({
    run_id: store.ui.runId || "",
    status: store.ui.systemStatus?.state || "idle",
    label: store.ui.systemStatus?.label || "",
    meta: store.ui.systemStatus?.meta || "",
    isBusy: store.ui.systemStatus?.state === "running",
    ...extra
  });
}

function getAnalysisRunName(agentKey = "parasismique", triggerType = "manual") {
  const agentLabels = {
    parasismique: "Analyse de document",
    solidite: "Analyse solidité",
    incendie: "Analyse sécurité incendie",
    pmr: "Analyse accessibilité PMR",
    thermique: "Analyse thermique",
    acoustique: "Analyse acoustique"
  };

  const baseLabel = agentLabels[agentKey] || "Analyse spécialisée";
  return triggerType === "document-upload"
    ? `${baseLabel} automatique`
    : `${baseLabel} manuelle`;
}

function setRunMeta(runId) {
  store.ui.runId = runId || "";

  const node = el("runAnalysisMetaTop");
  if (node) {
    node.textContent = runId ? `run_id=${runId}` : "";
  }

  syncRunbar();
}

function setSystemStatus(state, label, meta = "—") {
  store.ui.systemStatus = { state, label, meta };

  const dot = el("sysDot");
  const labelNode = el("sysLabel");
  const metaNode = el("sysMeta");

  if (labelNode) labelNode.textContent = label || "";
  if (metaNode) metaNode.textContent = meta || "—";

  if (dot) {
    dot.classList.remove("is-idle", "is-running", "is-done", "is-error");
    if (state === "running") dot.classList.add("is-running");
    else if (state === "done") dot.classList.add("is-done");
    else if (state === "error") dot.classList.add("is-error");
    else dot.classList.add("is-idle");
  }

  syncRunbar();
}

function getDomValue(id) {
  const node = el(id);
  if (!node) return null;
  if ("value" in node) return node.value;
  return null;
}

function syncProjectFormFromDom() {
  const communeCp = getDomValue("communeCp");
  const importance = getDomValue("importance");
  const soilClass = getDomValue("soilClass");
  const liquefaction = getDomValue("liquefaction");
  const referential = getDomValue("referential");
  const pdfInput = el("pdfFile");

  if (communeCp !== null) store.projectForm.communeCp = communeCp.trim();
  if (importance !== null) store.projectForm.importance = importance;
  if (soilClass !== null) store.projectForm.soilClass = soilClass;
  if (liquefaction !== null) store.projectForm.liquefaction = liquefaction;
  if (referential !== null) store.projectForm.referential = referential;

  if (pdfInput?.files?.[0]) {
    store.projectForm.pdfFile = pdfInput.files[0];
  }
}

function readInputs() {
  syncProjectFormFromDom();

  return {
    communeCp: (store.projectForm.communeCp || "").trim(),
    importance: store.projectForm.importance || "II",
    soilClass: store.projectForm.soilClass || "A",
    liquefaction: store.projectForm.liquefaction || "no",
    referential: store.projectForm.referential || "EC8",
    pdfFile: store.projectForm.pdfFile || null
  };
}

function isAbortError(error) {
  return (
    error?.name === "AbortError" ||
    String(error?.message || "").toLowerCase().includes("abort")
  );
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timerId);
  }
}


function getSupabaseAuthHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra
  };
}

function sanitizeFileName(fileName = "document.pdf") {
  const safe = String(fileName || "document.pdf")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return safe || "document.pdf";
}

function getFrontendProjectKey() {
  return String(store.currentProjectId || store.currentProject?.id || "default").trim() || "default";
}

function readFrontendProjectMap() {
  try {
    const raw = localStorage.getItem(FRONT_PROJECT_MAP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFrontendProjectMap(map) {
  try {
    localStorage.setItem(FRONT_PROJECT_MAP_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // no-op
  }
}

async function restInsert(table, payload, select = "*") {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (select) url.searchParams.set("select", select);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: getSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${table} insert failed (${res.status}): ${txt}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? (rows[0] || null) : rows;
}

async function ensureBackendProject() {
  const frontendProjectKey = getFrontendProjectKey();
  const map = readFrontendProjectMap();
  if (map[frontendProjectKey]) {
    return map[frontendProjectKey];
  }

  const projectName = String(
    store.currentProject?.name || store.projectForm?.projectName || frontendProjectKey
  ).trim() || frontendProjectKey;

  const description = [
    `Front project key: ${frontendProjectKey}`,
    store.projectForm?.city ? `Ville: ${store.projectForm.city}` : "",
    store.projectForm?.currentPhase ? `Phase: ${store.projectForm.currentPhase}` : ""
  ].filter(Boolean).join(" · ");

  const row = await restInsert("projects", {
    name: projectName,
    description
  }, "id,name");

  if (!row?.id) {
    throw new Error("projects insert succeeded without id");
  }

  map[frontendProjectKey] = row.id;
  writeFrontendProjectMap(map);
  return row.id;
}

async function uploadFileToStorage(file, projectId, runId) {
  const safeFileName = sanitizeFileName(file?.name || "document.pdf");
  const path = `${projectId}/${runId}/${safeFileName}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: getSupabaseAuthHeaders({
      "x-upsert": "false",
      "Content-Type": file?.type || "application/pdf"
    }),
    body: file
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`storage upload failed (${res.status}): ${txt}`);
  }

  return {
    storage_bucket: STORAGE_BUCKET,
    storage_path: path
  };
}

async function invokeRunAnalysis(runId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/run-analysis`, {
    method: "POST",
    headers: getSupabaseAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ run_id: runId })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`run-analysis invoke failed (${res.status}): ${txt}`);
  }

  return res.json().catch(() => null);
}

async function fetchSubjectsForRun(runId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/subjects`);
  url.searchParams.set(
    "select",
    "id,project_id,analysis_run_id,parent_subject_id,title,description,priority,status,subject_type,created_at,updated_at"
  );
  url.searchParams.set("analysis_run_id", `eq.${runId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subjects fetch failed (${res.status}): ${txt}`);
  }

  return res.json();
}

async function fetchAnalysisRunProjectId(runId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/analysis_runs`);
  url.searchParams.set("select", "project_id");
  url.searchParams.set("id", `eq.${runId}`);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`analysis_runs fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json();
  return rows?.[0]?.project_id || null;
}

async function fetchSubjectsByProject(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/subjects`);
  url.searchParams.set(
    "select",
    "id,project_id,analysis_run_id,parent_subject_id,title,description,priority,status,subject_type,created_at,updated_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subjects fetch failed (${res.status}): ${txt}`);
  }

  return res.json();
}

function createSubjectViewNode(subject, documentIds = []) {
  const description = firstNonEmpty(subject?.description, "");
  return withDocumentRefs({
    id: String(subject?.id || ""),
    title: firstNonEmpty(subject?.title, subject?.id, "Sujet sans titre"),
    description,
    message: description,
    verdict: firstNonEmpty(subject?.verdict, "-"),
    priority: firstNonEmpty(subject?.priority, "medium"),
    status: firstNonEmpty(subject?.status, "open"),
    agent: firstNonEmpty(subject?.subject_type, "system"),
    parentSubjectId: firstNonEmpty(subject?.parent_subject_id, ""),
    avis: [],
    raw: {
      ...subject,
      message: firstNonEmpty(subject?.message, description),
      description
    },
    ...defaultReviewMeta(subject)
  }, documentIds);
}

function sortSubjectNodes(nodes = []) {
  nodes.sort((left, right) => {
    const leftTs = Date.parse(left?.raw?.created_at || "") || 0;
    const rightTs = Date.parse(right?.raw?.created_at || "") || 0;
    if (leftTs !== rightTs) return leftTs - rightTs;
    return String(left?.title || left?.id || "").localeCompare(String(right?.title || right?.id || ""), "fr");
  });

  for (const node of nodes) {
    if (Array.isArray(node?.avis) && node.avis.length) {
      sortSubjectNodes(node.avis);
    }
  }

  return nodes;
}

function buildSubjectTree(subjectRows = [], options = {}) {
  const documentIds = getPreferredAnalysisDocumentIds(options.documentIds || []);
  const nodeById = new Map();
  const topLevelNodes = [];

  for (const subject of subjectRows || []) {
    const node = createSubjectViewNode(subject, documentIds);
    if (!node.id) continue;
    nodeById.set(node.id, node);
  }

  for (const node of nodeById.values()) {
    const parentId = String(node?.parentSubjectId || "");
    if (parentId && nodeById.has(parentId) && parentId !== node.id) {
      nodeById.get(parentId).avis.push(node);
      continue;
    }
    topLevelNodes.push(node);
  }

  sortSubjectNodes(topLevelNodes);

  return [withDocumentRefs({
    id: "__subjects_root__",
    title: "Sujets",
    description: "Vue synthétique des sujets du projet.",
    priority: "medium",
    status: "open",
    sujets: topLevelNodes,
    raw: {
      situation_id: "__subjects_root__",
      title: "Sujets"
    },
    ...defaultReviewMeta({})
  }, documentIds)];
}

function buildLegacySubjectResult(subjectRows = [], options = {}) {
  const documentIds = getPreferredAnalysisDocumentIds(options.documentIds || []);
  const topLevelProblemIds = [];
  const problems = [];
  const avis = [];

  for (const subject of subjectRows || []) {
    const problemId = String(subject?.id || "");
    if (!problemId) continue;

    const parentId = String(subject?.parent_subject_id || "");
    const childIds = (subjectRows || [])
      .filter((row) => String(row?.parent_subject_id || "") === problemId)
      .map((row) => String(row?.id || ""))
      .filter(Boolean);

    if (!parentId) {
      topLevelProblemIds.push(problemId);
    }

    problems.push(withDocumentRefs({
      problem_id: problemId,
      id: problemId,
      title: subject?.title || "Sujet sans titre",
      description: subject?.description || "",
      priority: subject?.priority || "medium",
      status: subject?.status || "open",
      agent: subject?.subject_type || "system",
      parent_subject_id: parentId || null,
      avis_ids: childIds,
      raw: subject,
      ...defaultReviewMeta(subject)
    }, documentIds));

    if (parentId) {
      avis.push(withDocumentRefs({
        avis_id: problemId,
        id: problemId,
        title: subject?.title || "Sous-sujet",
        message: subject?.description || "",
        verdict: "-",
        priority: subject?.priority || "medium",
        status: subject?.status || "open",
        agent: subject?.subject_type || "system",
        raw: subject,
        ...defaultReviewMeta(subject)
      }, documentIds));
    }
  }

  return {
    run_id: options.runId || "",
    status: "SUCCEEDED",
    subjects: subjectRows,
    situations: [{
      situation_id: "__subjects_root__",
      title: "Sujets",
      description: "Vue synthétique des sujets du projet.",
      status: "open",
      problem_ids: topLevelProblemIds,
      document_ref_ids: documentIds
    }],
    problems,
    avis
  };
}

async function buildFinalResultFromDatabase(runId) {
  const projectId = await fetchAnalysisRunProjectId(runId).catch(() => null);
  const subjects = projectId
    ? await fetchSubjectsByProject(projectId)
    : await fetchSubjectsForRun(runId);
  return buildLegacySubjectResult(subjects, { runId });
}

function normalizeStatusResponse(data) {
  let value = data;

  if (Array.isArray(value)) {
    value = value[0] || {};
  }

  if (value && typeof value.payload === "string") {
    const s = value.payload.trim();
    if (
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith("[") && s.endsWith("]"))
    ) {
      try {
        value.payload = JSON.parse(s);
      } catch {
        // no-op
      }
    }
  }

  return value || {};
}

async function fetchRunRowFromSupabase(runId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/analysis_runs`);
  url.searchParams.set(
    "select",
    "id,status,started_at,finished_at,error_message,structured_output_json,updated_at"
  );
  url.searchParams.set("id", `eq.${runId}`);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Supabase status fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json();
  const row = rows?.[0] || null;

  if (!row) {
    return {
      id: runId,
      status: "UNKNOWN",
      payload: null,
      updated_at: null
    };
  }

  return {
    id: row.id,
    status: row.status,
    payload: row.structured_output_json ?? null,
    error_message: row.error_message ?? null,
    updated_at: row.updated_at ?? null,
    started_at: row.started_at ?? null,
    finished_at: row.finished_at ?? null
  };
}

function computePollDelayMs(tries, progress) {
  if (document.hidden) return 30_000;

  const p = Number.isFinite(Number(progress)) ? Number(progress) : null;

  if (p !== null) {
    if (p < 20) return 20_000;
    if (p < 40) return 15_000;
    if (p < 60) return 10_000;
    if (p < 80) return 6_000;
    return 2_000;
  }

  if (tries <= POLL_FAST_TRIES) return POLL_BASE_MS;

  const pow = Math.min(tries - POLL_FAST_TRIES, 10);
  const delay = POLL_BASE_MS * Math.pow(1.6, pow);
  return Math.min(POLL_MAX_INTERVAL_MS, Math.round(delay));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function defaultReviewMeta(source = {}) {
  return {
    is_seen: !!source?.is_seen,
    review_state: String(source?.review_state || "pending").toLowerCase(),
    is_published: !!source?.is_published,
    last_published_at: source?.last_published_at || null,
    has_changes_since_publish: !!source?.has_changes_since_publish
  };
}

function withDocumentRefs(entity = {}, documentIds = []) {
  return {
    ...entity,
    document_ref_ids: normalizeDocumentRefIds(
      entity?.document_ref_ids && Array.isArray(entity.document_ref_ids)
        ? entity.document_ref_ids
        : documentIds
    )
  };
}

function normalizeFinalResult(final, options = {}) {
  if (Array.isArray(final?.subjects)) {
    return buildSubjectTree(final.subjects, options);
  }

  const situations = Array.isArray(final?.situations) ? final.situations : [];
  const problems = Array.isArray(final?.problems) ? final.problems : [];
  const avisList = Array.isArray(final?.avis) ? final.avis : [];
  const defaultDocumentIds = normalizeDocumentRefIds(options.documentIds || []);

  const problemsById = new Map();
  const avisById = new Map();

  for (const problem of problems) {
    const id = firstNonEmpty(problem.problem_id, problem.id);
    if (id) problemsById.set(id, problem);
  }

  for (const avis of avisList) {
    const id = firstNonEmpty(avis.avis_id, avis.id);
    if (id) avisById.set(id, avis);
  }

  return situations.map((situation) => {
    const situationId = firstNonEmpty(situation.situation_id, situation.id);
    const problemIds = Array.isArray(situation.problem_ids) ? situation.problem_ids : [];
    const situationReview = defaultReviewMeta(situation);

    return withDocumentRefs({
      id: situationId,
      title: firstNonEmpty(
        situation.title,
        situation.label,
        situation.name,
        situation.situation,
        situation.topic,
        situationId
      ),
      priority: firstNonEmpty(situation.priority, situation.prio, "medium"),
      status: firstNonEmpty(situation.status, "open"),
      ...situationReview,
      raw: situation,
      sujets: problemIds.map((problemId) => {
        const problem = problemsById.get(problemId) || {};
        const avisIds = Array.isArray(problem.avis_ids) ? problem.avis_ids : [];
        const sujetReview = defaultReviewMeta(problem);

        return withDocumentRefs({
          id: firstNonEmpty(problem.problem_id, problem.id, problemId),
          title: firstNonEmpty(
            problem.title,
            problem.label,
            problem.name,
            problem.problem,
            problem.topic,
            problemId
          ),
          description: firstNonEmpty(problem.description, problem.message, ""),
          priority: firstNonEmpty(problem.priority, problem.prio, situation.priority, "medium"),
          status: firstNonEmpty(problem.status, "open"),
          agent: firstNonEmpty(problem.agent, problem.owner, "system"),
          ...sujetReview,
          raw: problem,
          avis: avisIds.map((avisId) => {
            const avis = avisById.get(avisId) || {};
            const avisReview = defaultReviewMeta(avis);

            return withDocumentRefs({
              id: firstNonEmpty(avis.avis_id, avis.id, avisId),
              title: firstNonEmpty(
                avis.title,
                avis.topic,
                avis.label,
                avis.name,
                avis.message,
                avisId
              ),
              description: firstNonEmpty(avis.message, avis.description, ""),
              verdict: firstNonEmpty(avis.verdict, "-"),
              priority: firstNonEmpty(avis.priority, avis.prio, problem.priority, situation.priority, "medium"),
              status: firstNonEmpty(avis.status, "open"),
              agent: firstNonEmpty(avis.agent, problem.agent, "system"),
              ...avisReview,
              raw: avis
            }, avis.document_ref_ids || problem.document_ref_ids || situation.document_ref_ids || defaultDocumentIds);
          })
        }, problem.document_ref_ids || situation.document_ref_ids || defaultDocumentIds);
      })
    }, situation.document_ref_ids || defaultDocumentIds);
  });
}

function buildAnalysisInsightDetails(nested = []) {
  let topLevelSubjects = 0;
  let nestedSubjects = 0;

  const visit = (subject) => {
    for (const child of subject?.avis || []) {
      nestedSubjects += 1;
      visit(child);
    }
  };

  for (const situation of nested || []) {
    for (const sujet of situation?.sujets || []) {
      topLevelSubjects += 1;
      visit(sujet);
    }
  }

  return {
    totalSubjects: topLevelSubjects,
    totalNestedSubjects: nestedSubjects,
    totalVisibleSubjects: topLevelSubjects + nestedSubjects
  };
}

function applyRunResult(final, runId, statusLabel, runLogId = "", options = {}) {
  const documentIds = getPreferredAnalysisDocumentIds(options.documentIds || []);
  const nested = normalizeFinalResult(final, { documentIds });
  const insightDetails = buildAnalysisInsightDetails(nested);
  setLastAnalysisDocumentIds(documentIds);

  store.situationsView.data = nested;
  store.situationsView.rawResult = final;
  store.situationsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
  store.situationsView.page = 1;
  store.situationsView.expandedSituations = new Set();
  store.situationsView.expandedSujets = new Set();

  const firstSituationId = nested?.[0]?.id || null;
  const firstSubjectId = nested?.[0]?.sujets?.[0]?.id || null;
  store.situationsView.selectedSituationId = firstSituationId;
  store.situationsView.selectedSujetId = firstSubjectId;
  store.situationsView.selectedAvisId = null;
  store.situationsView.subjectsSelectedNodeId = firstSubjectId || "";

  if (firstSituationId) {
    store.situationsView.expandedSituations.add(firstSituationId);
  }

  if (runLogId) {
    finishRunLogEntry(runLogId, {
      status: "success",
      summary: statusLabel || "READY_FOR_REVIEW",
      details: {
        insights: insightDetails
      }
    });
  }

  setRunMeta(runId || final?.run_id || "");
  setSystemStatus("done", "Terminé", statusLabel || "READY_FOR_REVIEW");
  rerenderRoute();
}

function extractFinalPayload(payload) {
  let final = payload?.final_result || payload;

  if (Array.isArray(final)) {
    final = final[0] || {};
  }

  if (final && Array.isArray(final.final_result)) {
    final = final.final_result[0] || {};
  }

  return final;
}

async function pollRunStatus({ runId, token, runLogId, documentIds = [] }) {
  const t0 = Date.now();
  let tries = 0;

  while (Date.now() - t0 < POLL_MAX_MS) {
    if (token !== activePollToken) {
      return { state: "cancelled" };
    }

    tries += 1;
    setRunMeta(runId);
    setSystemStatus("running", "En cours d’analyse", "IN_PROGRESS");

    let data = null;

    try {
      data = await fetchRunRowFromSupabase(runId);
    } catch {
      if (token !== activePollToken) {
        return { state: "cancelled" };
      }

      setSystemStatus("running", "En cours d’analyse", "RECOVERING");
      await delay(computePollDelayMs(tries));
      continue;
    }

    if (token !== activePollToken) {
      return { state: "cancelled" };
    }

    data = normalizeStatusResponse(data);

    const status = String(data?.status || "").toUpperCase();
    const payload = data?.payload || null;
    const phase = String(data?.phase || "").trim();
    const progress = data?.phase_progress;
    const phaseMsg = String(data?.phase_msg || "").trim();

    const meta = [
      status || "IN_PROGRESS",
      phase ? `· ${phase}` : "",
      progress !== undefined && progress !== null ? `· ${progress}%` : ""
    ].join(" ").replace(/\s+/g, " ").trim();

    const uiMeta = phaseMsg ? `${meta} — ${phaseMsg}` : meta;
    setSystemStatus("running", "En cours d’analyse", uiMeta || `poll #${tries}`);
    setRunMeta(runId);

    if (status === "READY_FOR_REVIEW" || status === "DONE" || status === "READY" || status === "SUCCEEDED") {
      let final = payload ? extractFinalPayload(payload) : null;
      const hasLegacyShape = final
        && typeof final === "object"
        && Array.isArray(final.situations)
        && Array.isArray(final.problems)
        && Array.isArray(final.avis);

      if (!hasLegacyShape) {
        final = await buildFinalResultFromDatabase(runId);
      }

      applyRunResult(final, runId, status, runLogId, { documentIds });
      return { state: "success" };
    }

    await delay(computePollDelayMs(tries, progress));
  }

  if (token === activePollToken) {
    setSystemStatus("error", "Timeout", "polling");
  }

  return { state: "timeout" };
}

export function isAnalysisRunning() {
  return store.ui.systemStatus?.state === "running" && !!activeRunPromise;
}

export function getCurrentAnalysisRunMeta() {
  return {
    runId: store.ui.runId || "",
    state: store.ui.systemStatus?.state || "idle",
    label: store.ui.systemStatus?.label || "",
    meta: store.ui.systemStatus?.meta || ""
  };
}

export async function runAnalysis(options = {}) {
  if (isAnalysisRunning()) {
    return activeRunPromise;
  }

  const inputs = readInputs();

  if (!inputs.pdfFile) {
    setSystemStatus("error", "Erreur", "pdf manquant");
    alert("PDF manquant. Va dans l’onglet Documents et sélectionne un fichier PDF.");
    return;
  }

  const triggerType = options.triggerType || "manual";
  const triggerLabel = options.triggerLabel
    || (triggerType === "document-upload" ? "Dépôt de document" : "Lancement manuel");
  const primaryAgentKey = options.agentKey || getPrimaryAnalysisAgent()?.key || "parasismique";
  const analysisDocumentIds = getPreferredAnalysisDocumentIds(options.documentIds || []);

  const runLogEntry = startRunLogEntry({
    name: getAnalysisRunName(primaryAgentKey, triggerType),
    kind: "analysis",
    agentKey: primaryAgentKey,
    triggerType,
    triggerLabel,
    documentName: options.documentName || inputs.pdfFile?.name || "",
    status: "running",
    summary: options.summary
      || (triggerType === "document-upload"
        ? "Analyse déclenchée automatiquement après dépôt réussi d’un document."
        : "Analyse déclenchée depuis l’onglet Situations.")
  });

  const runId = generateAnalysisRunId();
  const pollToken = ++activePollToken;

  setRunMeta(runId);
  setSystemStatus("running", "En cours d’analyse", "POST /webhook");

  const promise = (async () => {
    try {
      setSystemStatus("running", "En cours d’analyse", "Préparation du projet");
      const backendProjectId = await ensureBackendProject();

      setSystemStatus("running", "En cours d’analyse", "Upload du document");
      const storageInfo = await uploadFileToStorage(inputs.pdfFile, backendProjectId, runId);

      setSystemStatus("running", "En cours d’analyse", "Création du document");
      const documentRow = await restInsert("documents", {
        project_id: backendProjectId,
        filename: inputs.pdfFile.name,
        original_filename: inputs.pdfFile.name,
        mime_type: inputs.pdfFile.type || "application/pdf",
        storage_bucket: storageInfo.storage_bucket,
        storage_path: storageInfo.storage_path,
        file_size_bytes: inputs.pdfFile.size || null,
        upload_status: "uploaded",
        document_kind: "source_pdf"
      }, "id,project_id,storage_bucket,storage_path");

      setSystemStatus("running", "En cours d’analyse", "Création du run");
      await restInsert("analysis_runs", {
        id: runId,
        project_id: backendProjectId,
        document_id: documentRow.id,
        status: "queued",
        trigger_source: triggerType
      }, "id,status");

      if (pollToken !== activePollToken) return;

      setSystemStatus("running", "En cours d’analyse", "Lancement de la pipeline Supabase");
      await invokeRunAnalysis(runId);

      if (pollToken !== activePollToken) return;

      const pollResult = await pollRunStatus({
        runId,
        token: pollToken,
        runLogId: runLogEntry.id,
        documentIds: [documentRow.id]
      });

      if (pollResult?.state === "timeout") {
        finishRunLogEntry(runLogEntry.id, {
          status: "error",
          summary: "Timeout du polling."
        });
      }
    } catch (error) {
      if (pollToken !== activePollToken) return;

      const errorMessage = String(error?.message || error || "Erreur inconnue");
      const looksLikeBucketError = /bucket|storage|not found/i.test(errorMessage);
      setSystemStatus(
        "error",
        "Erreur",
        looksLikeBucketError ? "Bucket documents manquant ou inaccessible" : errorMessage
      );

      finishRunLogEntry(runLogEntry.id, {
        status: "error",
        summary: errorMessage
      });
    } finally {
      if (activeRunPromise === promise) {
        activeRunPromise = null;
      }
      syncRunbar();
      document.dispatchEvent(new CustomEvent("analysisStateChanged"));
    }
  })();

  activeRunPromise = promise;
  return promise;
}

function getMappedBackendProjectId() {
  const frontendProjectKey = getFrontendProjectKey();
  const map = readFrontendProjectMap();
  return map[frontendProjectKey] || "";
}

export async function loadExistingSubjectsForCurrentProject(options = {}) {
  const force = !!options.force;
  const currentProjectScopeId = String(store.currentProjectId || "").trim() || null;
  const existing = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
  if (!force && existing.length && store.situationsView?.projectScopeId === currentProjectScopeId) {
    return existing;
  }

  const backendProjectId = getMappedBackendProjectId();
  if (!backendProjectId) {
    store.situationsView.data = [];
    store.situationsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
    store.situationsView.rawResult = {
      run_id: store.ui.runId || "",
      status: "IDLE",
      subjects: []
    };
    return [];
  }

  const subjects = await fetchSubjectsByProject(backendProjectId);
  const final = buildLegacySubjectResult(subjects, { runId: store.ui.runId || "" });
  const nested = normalizeFinalResult(final, { documentIds: getPreferredAnalysisDocumentIds([]) });

  store.situationsView.data = nested;
  store.situationsView.rawResult = final;
  store.situationsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
  store.situationsView.page = 1;
  store.situationsView.expandedSituations = new Set(nested[0]?.id ? [nested[0].id] : []);
  store.situationsView.expandedSujets = new Set();
  store.situationsView.selectedSituationId = nested[0]?.id || null;
  store.situationsView.selectedSujetId = nested[0]?.sujets?.[0]?.id || null;
  store.situationsView.selectedAvisId = null;
  store.situationsView.subjectsSelectedNodeId = nested[0]?.sujets?.[0]?.id || "";

  return nested;
}

export function resetAnalysisUi() {
  activePollToken += 1;
  activeRunPromise = null;

  store.situationsView.data = [];
  store.situationsView.rawResult = null;
  store.situationsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
  store.situationsView.expandedSituations = new Set();
  store.situationsView.expandedSujets = new Set();
  store.situationsView.selectedSituationId = null;
  store.situationsView.selectedSujetId = null;
  store.situationsView.selectedAvisId = null;
  store.situationsView.subjectsSelectedNodeId = "";
  store.situationsView.verdictFilter = "ALL";
  store.situationsView.search = "";
  store.situationsView.page = 1;

  setRunMeta("");
  setSystemStatus("idle", "Idle", "—");
  document.dispatchEvent(new CustomEvent("analysisStateChanged"));
  rerenderRoute();
}
