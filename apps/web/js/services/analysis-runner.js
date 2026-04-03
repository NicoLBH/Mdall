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
    parasismique: "Analyse parasismique",
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
    "id,title,description,priority,status,situation_id,parent_subject_id,subject_type,analysis_run_id"
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

async function fetchObservationsForRun(runId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_observations`);
  url.searchParams.set(
    "select",
    "id,title,description,priority,resolution_status,resolved_subject_id,observation_type"
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
    throw new Error(`subject_observations fetch failed (${res.status}): ${txt}`);
  }

  return res.json();
}

async function fetchSituationsByIds(ids = []) {
  const safeIds = Array.from(new Set((Array.isArray(ids) ? ids : []).filter(Boolean)));
  if (!safeIds.length) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/situations`);
  url.searchParams.set("select", "id,title,description,status,priority");
  url.searchParams.set("id", `in.(${safeIds.join(",")})`);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`situations fetch failed (${res.status}): ${txt}`);
  }

  return res.json();
}

async function buildFinalResultFromDatabase(runId) {
  const [subjects, observations] = await Promise.all([
    fetchSubjectsForRun(runId),
    fetchObservationsForRun(runId)
  ]);

  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeObservations = Array.isArray(observations) ? observations : [];
  const situationIds = Array.from(new Set(safeSubjects.map((item) => item?.situation_id).filter(Boolean)));
  const situationsRows = await fetchSituationsByIds(situationIds);
  const situationsById = new Map((situationsRows || []).map((row) => [row.id, row]));

  const problems = [];
  const avis = [];
  const situationMap = new Map();

  function ensureSituation(situationId) {
    if (!situationId) return null;
    const source = situationsById.get(situationId);
    if (!source) return null;

    if (!situationMap.has(situationId)) {
      situationMap.set(situationId, {
        situation_id: situationId,
        title: source?.title || situationId,
        description: source?.description || "",
        status: source?.status || "open",
        priority: source?.priority || "medium",
        problem_ids: []
      });
    }
    return situationMap.get(situationId);
  }

  for (const subject of safeSubjects) {
    const problemId = String(subject?.id || "");
    if (!problemId) continue;

    const situation = ensureSituation(subject?.situation_id);
    if (!situation) continue;

    situation.problem_ids.push(problemId);

    problems.push({
      problem_id: problemId,
      title: subject?.title || "Sujet sans titre",
      description: subject?.description || "",
      priority: subject?.priority || situation.priority || "medium",
      status: subject?.status || "open",
      agent: subject?.subject_type || "system",
      situation_id: subject?.situation_id || null,
      avis_ids: []
    });
  }

  const problemById = new Map(problems.map((item) => [item.problem_id, item]));

  for (const obs of safeObservations) {
    const targetId = obs?.resolved_subject_id || null;
    if (!targetId || !problemById.has(targetId)) continue;

    const avisId = String(obs?.id || "");
    if (!avisId) continue;

    avis.push({
      avis_id: avisId,
      title: obs?.title || "Observation",
      message: obs?.description || "",
      verdict: String(obs?.resolution_status || "").toUpperCase() === "RESOLVED" ? "S" : "-",
      priority: obs?.priority || problemById.get(targetId)?.priority || "medium",
      status: "open",
      agent: obs?.observation_type || "system"
    });

    problemById.get(targetId).avis_ids.push(avisId);
  }

  for (const problem of problems) {
    if (problem.avis_ids.length) continue;
    const syntheticAvisId = `${problem.problem_id}::summary`;
    avis.push({
      avis_id: syntheticAvisId,
      title: problem.title,
      message: problem.description || "Sujet créé sans observation détaillée restituable côté front.",
      verdict: "-",
      priority: problem.priority || "medium",
      status: problem.status || "open",
      agent: problem.agent || "system"
    });
    problem.avis_ids.push(syntheticAvisId);
  }

  return {
    run_id: runId,
    status: "SUCCEEDED",
    situations: Array.from(situationMap.values()),
    problems,
    avis
  };
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
  const avis = [];

  for (const situation of nested || []) {
    for (const sujet of situation?.sujets || []) {
      for (const item of sujet?.avis || []) {
        avis.push({
          id: String(item?.id || ""),
          verdict: firstNonEmpty(item?.raw?.verdict, item?.verdict, "")
        });
      }
    }
  }

  const criticalAvis = avis.filter((item) => {
    const verdict = String(item?.verdict || "").toUpperCase();
    return verdict === "S" || verdict === "D";
  }).length;

  const blockingAvis = avis.filter((item) => String(item?.verdict || "").toUpperCase() === "D").length;

  return {
    totalAvis: avis.length,
    criticalAvis,
    blockingAvis,
    avis
  };
}

function applyRunResult(final, runId, statusLabel, runLogId = "", options = {}) {
  const documentIds = getPreferredAnalysisDocumentIds(options.documentIds || []);
  const nested = normalizeFinalResult(final, { documentIds });
  const insightDetails = buildAnalysisInsightDetails(nested);
  setLastAnalysisDocumentIds(documentIds);

  store.situationsView.data = nested;
  store.situationsView.rawResult = final;
  store.situationsView.page = 1;
  store.situationsView.expandedSituations = new Set();
  store.situationsView.expandedSujets = new Set();

  const firstSituationId = nested?.[0]?.id || null;
  store.situationsView.selectedSituationId = firstSituationId;
  store.situationsView.selectedSujetId = null;
  store.situationsView.selectedAvisId = null;

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

export function resetAnalysisUi() {
  activePollToken += 1;
  activeRunPromise = null;

  store.situationsView.data = [];
  store.situationsView.rawResult = null;
  store.situationsView.expandedSituations = new Set();
  store.situationsView.expandedSujets = new Set();
  store.situationsView.selectedSituationId = null;
  store.situationsView.selectedSujetId = null;
  store.situationsView.selectedAvisId = null;
  store.situationsView.verdictFilter = "ALL";
  store.situationsView.search = "";
  store.situationsView.page = 1;

  setRunMeta("");
  setSystemStatus("idle", "Idle", "—");
  document.dispatchEvent(new CustomEvent("analysisStateChanged"));
  rerenderRoute();
}
