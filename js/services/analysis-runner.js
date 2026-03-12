import { store } from "../store.js";
import { rerenderRoute } from "../router.js";
import { syncProjectSituationsRunbar } from "../views/project-situations-runbar.js";

const START_URL_PROD = "https://nicolbh.app.n8n.cloud/webhook/rapsobot-poc";
const SUPABASE_URL = "https://smsizuijtrqogupgjnyj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0JlI9Nc1tyGmjuBZX9Oznw_Zlnfq6gC";

const FETCH_TIMEOUT_MS = 60_000;
const POLL_BASE_MS = 2000;
const POLL_MAX_INTERVAL_MS = 20_000;
const POLL_MAX_MS = 12 * 60_000;
const POLL_FAST_TRIES = 5;

function el(id) {
  return document.getElementById(id);
}

function setRunMeta(runId) {
  store.ui.runId = runId || "";
  const node = el("runAnalysisMetaTop");
  if (node) {
    node.textContent = runId ? `run_id=${runId}` : "";
  }
  syncProjectSituationsRunbar({
    run_id: store.ui.runId || "",
    status: store.ui.systemStatus?.state || "idle"
  });
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

  let runbarStatus = "idle";
  if (state === "running") runbarStatus = "running";
  else if (state === "done") runbarStatus = "done";
  else if (state === "error") runbarStatus = "error";

  syncProjectSituationsRunbar({
    run_id: store.ui.runId || "",
    status: runbarStatus,
    label,
    meta
  });
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
  const url = new URL(`${SUPABASE_URL}/rest/v1/rapsobot_runs`);
  url.searchParams.set("select", "run_id,status,phase,phase_progress,phase_msg,payload,updated_at");
  url.searchParams.set("run_id", `eq.${runId}`);
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
  return rows?.[0] || { status: "UNKNOWN", payload: null };
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

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function normalizeFinalResult(final) {
  const situations = Array.isArray(final?.situations) ? final.situations : [];
  const problems = Array.isArray(final?.problems) ? final.problems : [];
  const avisList = Array.isArray(final?.avis) ? final.avis : [];

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

    return {
      id: situationId,
      title: firstNonEmpty(
        situation.title,
        situation.label,
        situation.name,
        situation.situation,
        situation.topic,
        situationId
      ),
      priority: firstNonEmpty(situation.priority, situation.prio, "P3"),
      status: firstNonEmpty(situation.status, "open"),
      raw: situation,
      sujets: problemIds.map((problemId) => {
        const problem = problemsById.get(problemId) || {};
        const avisIds = Array.isArray(problem.avis_ids) ? problem.avis_ids : [];

        return {
          id: firstNonEmpty(problem.problem_id, problem.id, problemId),
          title: firstNonEmpty(
            problem.title,
            problem.label,
            problem.name,
            problem.problem,
            problem.topic,
            problemId
          ),
          priority: firstNonEmpty(problem.priority, problem.prio, situation.priority, "P3"),
          status: firstNonEmpty(problem.status, "open"),
          agent: firstNonEmpty(problem.agent, problem.owner, "system"),
          raw: problem,
          avis: avisIds.map((avisId) => {
            const avis = avisById.get(avisId) || {};

            return {
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
              priority: firstNonEmpty(avis.priority, avis.prio, problem.priority, situation.priority, "P3"),
              status: firstNonEmpty(avis.status, "open"),
              agent: firstNonEmpty(avis.agent, problem.agent, "system"),
              raw: avis
            };
          })
        };
      })
    };
  });
}

function applyRunResult(final, runId, statusLabel) {
  const nested = normalizeFinalResult(final);

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

  setRunMeta(runId || final?.run_id || "");
  setSystemStatus("done", "Terminé", statusLabel || "READY_FOR_REVIEW");
  rerenderRoute();
}

async function pollRunStatus({ runId }) {
  const t0 = Date.now();
  let tries = 0;

  while (Date.now() - t0 < POLL_MAX_MS) {
    tries += 1;
    setSystemStatus("running", "En cours d’analyse", `poll #${tries}`);

    let data = null;

    try {
      data = await fetchRunRowFromSupabase(runId);
    } catch {
      await new Promise((r) => setTimeout(r, computePollDelayMs(tries)));
      continue;
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
      progress !== undefined && progress !== null ? `· ${progress}%` : "",
      phaseMsg ? `· ${phaseMsg}` : ""
    ].join(" ").replace(/\s+/g, " ").trim();

    setSystemStatus("running", "En cours d’analyse", meta || `poll #${tries}`);
    setRunMeta(runId);

    if ((status === "READY_FOR_REVIEW" || status === "DONE" || status === "READY") && payload) {
      let final = payload.final_result || payload;

      if (Array.isArray(final)) {
        final = final[0] || {};
      }

      if (final && Array.isArray(final.final_result)) {
        final = final.final_result[0] || {};
      }

      applyRunResult(final, runId, status);
      return true;
    }

    await new Promise((r) => setTimeout(r, computePollDelayMs(tries, progress)));
  }

  setSystemStatus("error", "Timeout", "polling");
  return false;
}

export async function runAnalysis() {
  const inputs = readInputs();

  if (!inputs.pdfFile) {
    setSystemStatus("error", "Erreur", "pdf manquant");
    alert("PDF manquant. Va dans l’onglet Documents et sélectionne un fichier PDF.");
    return;
  }

  const runId = `RUN-${Date.now()}`;
  setRunMeta(runId);
  setSystemStatus("running", "En cours d’analyse", "POST /webhook");

  const user_reference = {
    commune_cp: inputs.communeCp,
    importance: inputs.importance,
    soilClass: inputs.soilClass,
    liquefaction: inputs.liquefaction,
    referential: inputs.referential
  };

  try {
    const form = new FormData();
    form.append("run_id", runId);
    form.append("user_reference", JSON.stringify(user_reference));
    form.append("pdf", inputs.pdfFile, inputs.pdfFile.name);

    const res = await fetchWithTimeout(
      START_URL_PROD,
      { method: "POST", body: form },
      FETCH_TIMEOUT_MS
    );

    const text = await res.text();
    let data = null;

    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    data = normalizeStatusResponse(data);

    const final = data?.final_result || data;

    if (
      final &&
      typeof final === "object" &&
      Array.isArray(final.situations) &&
      Array.isArray(final.problems) &&
      Array.isArray(final.avis)
    ) {
      applyRunResult(final, final.run_id || runId, final.status || "OK");
      return;
    }

    setSystemStatus("running", "En cours d’analyse", "ACK reçu");
    await pollRunStatus({ runId });
  } catch (error) {
    if (isAbortError(error)) {
      setSystemStatus("running", "En cours d’analyse", "timeout POST → polling");
    } else {
      setSystemStatus("running", "En cours d’analyse", "POST erreur → polling");
    }

    await pollRunStatus({ runId });
  }
}

export function resetAnalysisUi() {
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
  rerenderRoute();
}
