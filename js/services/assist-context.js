import { store } from "../store.js";

function parseHash() {
  const hash = String(location.hash || "").replace(/^#/, "").trim();
  if (!hash) return ["dashboard"];
  return hash.split("/");
}

function inferScope(parts) {
  if (parts[0] === "project" && parts[1]) return "project";
  return "global";
}

function inferTab(parts) {
  if (parts[0] === "project") return parts[2] || "dashboard";
  return parts[0] || "dashboard";
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function findSituationById(id) {
  return safeArray(store.situationsView?.data).find((s) => String(s?.id) === String(id));
}

function findSujetById(id) {
  for (const situation of safeArray(store.situationsView?.data)) {
    for (const sujet of safeArray(situation?.sujets)) {
      if (String(sujet?.id) === String(id)) return { sujet, situation };
    }
  }
  return null;
}

function findAvisById(id) {
  for (const situation of safeArray(store.situationsView?.data)) {
    for (const sujet of safeArray(situation?.sujets)) {
      for (const avis of safeArray(sujet?.avis)) {
        if (String(avis?.id) === String(id)) return { avis, sujet, situation };
      }
    }
  }
  return null;
}

function buildSituationsSummary() {
  const data = safeArray(store.situationsView?.data);

  let sujetsCount = 0;
  let avisCount = 0;
  const verdicts = {};
  const statuses = { open: 0, closed: 0 };

  for (const situation of data) {
    const sStatus = String(situation?.status || "open").toLowerCase();
    if (sStatus === "closed") statuses.closed += 1;
    else statuses.open += 1;

    for (const sujet of safeArray(situation?.sujets)) {
      sujetsCount += 1;

      const subjStatus = String(sujet?.status || "open").toLowerCase();
      if (subjStatus === "closed") statuses.closed += 1;
      else statuses.open += 1;

      for (const avis of safeArray(sujet?.avis)) {
        avisCount += 1;
        const avisStatus = String(avis?.status || "open").toLowerCase();
        if (avisStatus === "closed") statuses.closed += 1;
        else statuses.open += 1;

        const verdict = String(avis?.verdict || "").toUpperCase();
        if (verdict) {
          verdicts[verdict] = (verdicts[verdict] || 0) + 1;
        }
      }
    }
  }

  return {
    situations_count: data.length,
    sujets_count: sujetsCount,
    avis_count: avisCount,
    statuses,
    verdicts
  };
}

function buildSelectionContext() {
  const selectedSituationId = store.situationsView?.selectedSituationId || null;
  const selectedSujetId = store.situationsView?.selectedSujetId || null;
  const selectedAvisId = store.situationsView?.selectedAvisId || null;

  if (selectedAvisId) {
    const hit = findAvisById(selectedAvisId);
    if (hit) {
      return {
        level: "avis",
        ids: {
          situation_id: hit.situation?.id || null,
          sujet_id: hit.sujet?.id || null,
          avis_id: hit.avis?.id || null
        },
        labels: {
          situation: hit.situation?.title || hit.situation?.label || "",
          sujet: hit.sujet?.title || hit.sujet?.label || "",
          avis: hit.avis?.title || hit.avis?.label || ""
        },
        status: hit.avis?.status || "open",
        verdict: hit.avis?.verdict || ""
      };
    }
  }

  if (selectedSujetId) {
    const hit = findSujetById(selectedSujetId);
    if (hit) {
      return {
        level: "sujet",
        ids: {
          situation_id: hit.situation?.id || null,
          sujet_id: hit.sujet?.id || null,
          avis_id: null
        },
        labels: {
          situation: hit.situation?.title || hit.situation?.label || "",
          sujet: hit.sujet?.title || hit.sujet?.label || "",
          avis: ""
        },
        status: hit.sujet?.status || "open",
        verdict: ""
      };
    }
  }

  if (selectedSituationId) {
    const situation = findSituationById(selectedSituationId);
    if (situation) {
      return {
        level: "situation",
        ids: {
          situation_id: situation?.id || null,
          sujet_id: null,
          avis_id: null
        },
        labels: {
          situation: situation?.title || situation?.label || "",
          sujet: "",
          avis: ""
        },
        status: situation?.status || "open",
        verdict: ""
      };
    }
  }

  return {
    level: "none",
    ids: {
      situation_id: null,
      sujet_id: null,
      avis_id: null
    },
    labels: {
      situation: "",
      sujet: "",
      avis: ""
    },
    status: "",
    verdict: ""
  };
}

function buildProjectFormContext() {
  const form = store.projectForm || {};
  return {
    commune_cp: form.communeCp || "",
    importance: form.importance || "",
    soil_class: form.soilClass || "",
    liquefaction: form.liquefaction || "",
    referential: form.referential || "",
    has_pdf: !!form.pdfFile,
    pdf_name: form.pdfFile?.name || ""
  };
}

function buildSystemContext() {
  return {
    run_id: store.ui?.runId || "",
    system_status: {
      state: store.ui?.systemStatus?.state || "idle",
      label: store.ui?.systemStatus?.label || "Idle",
      meta: store.ui?.systemStatus?.meta || "—"
    }
  };
}

export function buildAssistContext() {
  const parts = parseHash();
  const scope = inferScope(parts);
  const tab = inferTab(parts);

  const context = {
    app: {
      scope,
      route_parts: parts,
      hash: location.hash || "",
      current_tab: tab
    },
    user: {
      name: store.user?.name || "demo"
    },
    project: {
      current_project_id: store.currentProjectId || null
    },
    system: buildSystemContext(),
    project_form: buildProjectFormContext(),
    situations: {
      filters: {
        verdict_filter: store.situationsView?.verdictFilter || "ALL",
        search: store.situationsView?.search || "",
        display_depth: store.situationsView?.displayDepth || "situations",
        page: store.situationsView?.page || 1,
        page_size: store.situationsView?.pageSize || 80
      },
      summary: buildSituationsSummary(),
      selection: buildSelectionContext()
    },
    assistant: {
      mode: store.ui?.assistant?.mode || "auto",
      conversation_length: safeArray(store.ui?.assistant?.messages).length
    },
    global_navigation: {
      available_sections: ["dashboard", "projects", "project/documents", "project/situations", "project/intervenants", "project/dashboard", "project/identity"]
    },
    capabilities: {
      global: [
        "resume_notifications",
        "prioritize_projects",
        "summarize_portfolio",
        "highlight_urgent_items"
      ],
      project: [
        "draft_comments",
        "prepare_bulk_verdicts",
        "summarize_situation",
        "summarize_sujet",
        "help_on_selected_item"
      ]
    }
  };

  store.ui.assistant.lastContext = context;
  return context;
}
