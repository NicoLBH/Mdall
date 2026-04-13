import { store } from "../store.js";
import { getPreferredAnalysisDocumentIds, normalizeDocumentRefIds, setLastAnalysisDocumentIds } from "./project-documents-store.js";
import { rerenderRoute } from "../router.js";
import { syncProjectSituationsRunbar } from "../views/project-situations-runbar.js";
import {
  finishRunLogEntry,
  getPrimaryAnalysisAgent,
  startRunLogEntry
} from "./project-automation.js";
import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseAnonKey, getSupabaseUrl } from "../../assets/js/auth.js";
import { buildSubjectHierarchyIndexes } from "./subject-hierarchy.js";

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabaseAnonKey();
const STORAGE_BUCKET = "documents";
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";

const FETCH_TIMEOUT_MS = 60_000;

// logique archive
const POLL_BASE_MS = 2000;
const POLL_MAX_INTERVAL_MS = 20_000;
const POLL_MAX_MS = 12 * 60_000;
const POLL_FAST_TRIES = 5;

function delay(ms = 0) {
  const safeMs = Number.isFinite(ms) ? Math.max(0, Number(ms)) : 0;
  return new Promise((resolve) => globalThis.setTimeout(resolve, safeMs));
}

function computePollDelayMs(tries = 1, progress = null) {
  const numericTries = Number.isFinite(tries) ? Math.max(1, Number(tries)) : 1;
  const numericProgress = Number.isFinite(progress) ? Number(progress) : null;

  if (numericProgress !== null && numericProgress >= 95) return 1_000;
  if (numericProgress !== null && numericProgress >= 80) return 1_500;
  if (numericProgress !== null && numericProgress >= 60) return 2_000;
  if (numericProgress !== null && numericProgress >= 30) return 3_000;
  if (numericTries <= POLL_FAST_TRIES) return POLL_BASE_MS;

  const backoffMs = POLL_BASE_MS + ((numericTries - POLL_FAST_TRIES) * 1_000);
  return Math.min(POLL_MAX_INTERVAL_MS, backoffMs);
}

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


async function getSupabaseAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
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
    headers: await getSupabaseAuthHeaders({
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
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    throw new Error("Utilisateur authentifié introuvable pour la création du projet.");
  }
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
    description,
    owner_id: currentUser.id
  }, "id,name");

  if (!row?.id) {
    throw new Error("projects insert succeeded without id");
  }

  map[frontendProjectKey] = row.id;
  writeFrontendProjectMap(map);
  return row.id;
}

async function uploadFileToStorage(file, projectId, runId) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    throw new Error("Utilisateur authentifié introuvable pour l'upload du document.");
  }

  const safeFileName = sanitizeFileName(file?.name || "document.pdf");
  const path = `${currentUser.id}/${projectId}/${runId}/${safeFileName}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
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
    headers: await getSupabaseAuthHeaders({
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
    "id,project_id,document_id,analysis_run_id,situation_id,parent_subject_id,title,description,priority,status,closure_reason,subject_type,created_at,updated_at,closed_at"
  );
  url.searchParams.set("analysis_run_id", `eq.${runId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
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
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
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
    "id,project_id,document_id,analysis_run_id,situation_id,parent_subject_id,title,description,priority,status,closure_reason,subject_type,created_at,updated_at,closed_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subjects fetch failed (${res.status}): ${txt}`);
  }

  return res.json();
}


async function fetchSituationsByProject(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/situations`);
  url.searchParams.set(
    "select",
    "id,project_id,title,description,objective_text,progress_percent,status,mode,filter_definition,created_at,updated_at,closed_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`situations fetch failed (${res.status}): ${txt}`);
  }

  return res.json();
}

async function fetchSubjectLinksByProject(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_links`);
  url.searchParams.set(
    "select",
    "id,project_id,source_subject_id,target_subject_id,link_type,score,explanation,created_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_links fetch failed (${res.status}): ${txt}`);
  }

  return res.json();
}

function createSubjectViewNode(subject, documentIds = [], childNodes = []) {
  const description = firstNonEmpty(subject?.description, "");
  const children = Array.isArray(childNodes) ? childNodes : [];
  return withDocumentRefs({
    id: String(subject?.id || ""),
    title: firstNonEmpty(subject?.title, subject?.id, "Sujet sans titre"),
    description,
    message: description,
    priority: firstNonEmpty(subject?.priority, "medium"),
    status: firstNonEmpty(subject?.status, "open"),
    agent: firstNonEmpty(subject?.subject_type, "system"),
    parentSubjectId: firstNonEmpty(subject?.parent_subject_id, ""),
    children,
    avis: children,
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
    if (Array.isArray(node?.children) && node.children.length) {
      sortSubjectNodes(node.children);
      node.avis = node.children;
    } else {
      node.children = [];
      node.avis = [];
    }
  }

  return nodes;
}

function buildNormalizedSubjectsResult(subjectRows = [], subjectLinks = [], situations = [], options = {}) {
  const documentIds = getPreferredAnalysisDocumentIds(options.documentIds || []);
  const subjectsById = {};
  const linksBySubjectId = {};
  const situationsById = {};
  const subjectIdsBySituationId = {};

  for (const subject of subjectRows || []) {
    const subjectId = String(subject?.id || "");
    if (!subjectId) continue;
    subjectsById[subjectId] = withDocumentRefs({ ...subject, id: subjectId }, documentIds);
    linksBySubjectId[subjectId] = [];
  }

  const {
    parentBySubjectId,
    childrenBySubjectId,
    rootSubjectIds
  } = buildSubjectHierarchyIndexes(subjectRows, subjectsById);

  for (const link of subjectLinks || []) {
    const sourceId = String(link?.source_subject_id || "");
    const targetId = String(link?.target_subject_id || "");
    if (!sourceId || !targetId) continue;
    const normalized = { ...link, source_subject_id: sourceId, target_subject_id: targetId };
    if (!Array.isArray(linksBySubjectId[sourceId])) linksBySubjectId[sourceId] = [];
    if (!Array.isArray(linksBySubjectId[targetId])) linksBySubjectId[targetId] = [];
    linksBySubjectId[sourceId].push(normalized);
    linksBySubjectId[targetId].push(normalized);
  }

  for (const situation of situations || []) {
    const situationId = String(situation?.id || "");
    if (!situationId) continue;
    situationsById[situationId] = withDocumentRefs({ ...situation, id: situationId }, documentIds);
    subjectIdsBySituationId[situationId] = [];
  }

  for (const subject of subjectRows || []) {
    const subjectId = String(subject?.id || "");
    const situationId = String(subject?.situation_id || "");
    if (!subjectId || !situationId) continue;
    if (!situationsById[situationId]) {
      situationsById[situationId] = withDocumentRefs({
        id: situationId,
        title: `Situation ${situationId}`,
        description: "",
        status: "open",
        raw: { id: situationId }
      }, documentIds);
      subjectIdsBySituationId[situationId] = [];
    }
    subjectIdsBySituationId[situationId].push(subjectId);
  }

  const buildNode = (subjectId) => {
    const subject = subjectsById[subjectId];
    if (!subject) return null;
    const childNodes = (childrenBySubjectId[subjectId] || []).map((childId) => buildNode(childId)).filter(Boolean);
    return createSubjectViewNode(subject, subject.document_ref_ids || documentIds, childNodes);
  };

  const subjectTree = rootSubjectIds.map((subjectId) => buildNode(subjectId)).filter(Boolean);
  sortSubjectNodes(subjectTree);

  return {
    run_id: options.runId || "",
    status: "SUCCEEDED",
    subjects: subjectRows,
    subjectTree,
    subjectLinks,
    situations,
    subjectsById,
    rootSubjectIds,
    childrenBySubjectId,
    parentBySubjectId,
    linksBySubjectId,
    situationsById,
    subjectIdsBySituationId
  };
}

async function buildFinalResultFromDatabase(runId) {
  const projectId = await fetchAnalysisRunProjectId(runId).catch(() => null);
  const [subjects, subjectLinks, situations] = projectId
    ? await Promise.all([
      fetchSubjectsByProject(projectId),
      fetchSubjectLinksByProject(projectId).catch(() => []),
      fetchSituationsByProject(projectId).catch(() => [])
    ])
    : [await fetchSubjectsForRun(runId), [], []];
  return buildNormalizedSubjectsResult(subjects, subjectLinks, situations, { runId });
}

function normalizeFinalResult(final, options = {}) {
  if (final && typeof final === "object" && final.subjectsById && final.childrenBySubjectId) {
    const defaultDocumentIds = normalizeDocumentRefIds(options.documentIds || []);
    const subjectIdsBySituationId = final.subjectIdsBySituationId && typeof final.subjectIdsBySituationId === "object"
      ? final.subjectIdsBySituationId
      : {};
    const situationsById = final.situationsById && typeof final.situationsById === "object"
      ? final.situationsById
      : {};

    const buildNode = (subjectId) => {
      const subject = final.subjectsById?.[subjectId];
      if (!subject) return null;
      const children = (final.childrenBySubjectId?.[subjectId] || []).map((childId) => buildNode(childId)).filter(Boolean);
      return createSubjectViewNode(subject, subject.document_ref_ids || defaultDocumentIds, children);
    };

    const normalizeSituation = (situationId, situation) => {
      const allIds = Array.isArray(subjectIdsBySituationId[situationId]) ? subjectIdsBySituationId[situationId] : [];
      const rootSubjectIds = allIds.filter((subjectId) => {
        const parentId = final.parentBySubjectId?.[subjectId] || null;
        return !parentId || !allIds.includes(parentId);
      });
      const sujets = rootSubjectIds.map((subjectId) => buildNode(subjectId)).filter(Boolean);
      sortSubjectNodes(sujets);
      return withDocumentRefs({
        id: String(situationId || ""),
        title: firstNonEmpty(situation?.title, situation?.label, situation?.name, situation?.situation, situation?.topic, situationId),
        description: firstNonEmpty(situation?.description, ""),
        priority: firstNonEmpty(situation?.priority, situation?.prio, "medium"),
        status: firstNonEmpty(situation?.status, "open"),
        raw: situation,
        sujets,
        ...defaultReviewMeta(situation)
      }, situation?.document_ref_ids || defaultDocumentIds);
    };

    const situations = Object.entries(situationsById).map(([situationId, situation]) => normalizeSituation(situationId, situation));
    if (situations.length) return situations;
    return [{
      id: "subjects",
      title: "Sujets",
      description: "Vue synthétique des sujets du projet.",
      priority: "medium",
      status: "open",
      sujets: (final.rootSubjectIds || []).map((subjectId) => buildNode(subjectId)).filter(Boolean),
      raw: { id: "subjects", title: "Sujets" },
      ...defaultReviewMeta({})
    }];
  }

  if (Array.isArray(final?.subjects)) {
    return normalizeFinalResult(buildNormalizedSubjectsResult(final.subjects, final.subjectLinks || [], final.situations || [], options), options);
  }

  return [];
}

function buildAnalysisInsightDetails(nested = []) {
  let rootSubjects = 0;
  let childSubjects = 0;

  const visit = (subject) => {
    const children = Array.isArray(subject?.children) ? subject.children : Array.isArray(subject?.avis) ? subject.avis : [];
    for (const child of children) {
      childSubjects += 1;
      visit(child);
    }
  };

  for (const situation of nested || []) {
    for (const sujet of situation?.sujets || []) {
      rootSubjects += 1;
      visit(sujet);
    }
  }

  return {
    totalSubjects: rootSubjects + childSubjects,
    rootSubjects,
    childSubjects,
    totalVisibleSubjects: rootSubjects + childSubjects
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
  store.situationsView.selectedSubjectId = firstSubjectId;
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
      const hasNormalizedShape = final
        && typeof final === "object"
        && final.subjectsById
        && final.childrenBySubjectId;

      if (!hasNormalizedShape) {
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
      const currentUser = await getCurrentUser();

      const documentRow = await restInsert("documents", {
        project_id: backendProjectId,
        created_by: currentUser?.id || null,
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
  const subjectLinks = await fetchSubjectLinksByProject(backendProjectId).catch(() => []);
  const situations = await fetchSituationsByProject(backendProjectId).catch(() => []);
  const final = buildNormalizedSubjectsResult(subjects, subjectLinks, situations, { runId: store.ui.runId || "" });
  const nested = normalizeFinalResult(final, { documentIds: getPreferredAnalysisDocumentIds([]) });

  store.situationsView.data = nested;
  store.situationsView.rawResult = final;
  store.situationsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
  store.situationsView.page = 1;
  store.situationsView.expandedSituations = new Set(nested[0]?.id ? [nested[0].id] : []);
  store.situationsView.expandedSujets = new Set();
  store.situationsView.selectedSituationId = nested[0]?.id || null;
  store.situationsView.selectedSujetId = nested[0]?.sujets?.[0]?.id || null;
  store.situationsView.selectedSubjectId = nested[0]?.sujets?.[0]?.id || null;
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
  store.situationsView.subjectsSelectedNodeId = "";
  store.situationsView.search = "";
  store.situationsView.page = 1;

  setRunMeta("");
  setSystemStatus("idle", "Idle", "—");
  document.dispatchEvent(new CustomEvent("analysisStateChanged"));
  rerenderRoute();
}
