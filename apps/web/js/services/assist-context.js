import { store } from "../store.js";

function parseHash() {
  const hash = String(location.hash || "").replace(/^#/, "").trim();
  if (!hash) return ["dashboard"];
  return hash.split("/");
}

function inferScope(parts) {
  return parts[0] === "project" && parts[1] ? "project" : "global";
}

function inferTab(parts) {
  return parts[0] === "project" ? parts[2] || "dashboard" : parts[0] || "dashboard";
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function findSituationById(id) {
  return safeArray(store.situationsView?.data).find((item) => String(item?.id || "") === String(id || "")) || null;
}

function findSubjectInTree(subjectId, subjects = [], situation = null) {
  for (const subject of safeArray(subjects)) {
    if (String(subject?.id || "") === String(subjectId || "")) {
      return { subject, situation };
    }
    const nested = findSubjectInTree(subjectId, subject?.children, situation);
    if (nested) return nested;
  }
  return null;
}

function findSubjectById(id) {
  for (const situation of safeArray(store.situationsView?.data)) {
    const hit = findSubjectInTree(id, situation?.sujets, situation);
    if (hit) return hit;
  }
  return null;
}

function summarizeSituations() {
  const data = safeArray(store.situationsView?.data);

  let subjectCount = 0;
  let openSubjects = 0;
  let closedSubjects = 0;

  const visit = (subjects = []) => {
    for (const subject of safeArray(subjects)) {
      subjectCount += 1;
      if (String(subject?.status || "open").toLowerCase() === "closed") closedSubjects += 1;
      else openSubjects += 1;
      visit(subject?.children);
    }
  };

  for (const situation of data) {
    visit(situation?.sujets);
  }

  return {
    situations_count: data.length,
    subjects_count: subjectCount,
    open_subjects_count: openSubjects,
    closed_subjects_count: closedSubjects
  };
}

function buildSelectionContext() {
  const selectedSituationId = store.situationsView?.selectedSituationId || null;
  const selectedSubjectId = store.situationsView?.selectedSubjectId || store.situationsView?.selectedSujetId || null;

  if (selectedSubjectId) {
    const hit = findSubjectById(selectedSubjectId);
    if (hit) {
      return {
        level: "subject",
        ids: {
          situation_id: hit.situation?.id || null,
          subject_id: hit.subject?.id || null
        },
        labels: {
          situation: hit.situation?.title || hit.situation?.label || "",
          subject: hit.subject?.title || hit.subject?.label || ""
        },
        status: hit.subject?.status || "open",
        priority: hit.subject?.priority || "medium"
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
          subject_id: null
        },
        labels: {
          situation: situation?.title || situation?.label || "",
          subject: ""
        },
        status: situation?.status || "open",
        priority: situation?.priority || "medium"
      };
    }
  }

  return {
    level: "none",
    ids: {
      situation_id: null,
      subject_id: null
    },
    labels: {
      situation: "",
      subject: ""
    },
    status: "",
    priority: ""
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

  return {
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
        search: store.situationsView?.search || "",
        display_depth: store.situationsView?.displayDepth || "situations",
        page: store.situationsView?.page || 1,
        page_size: store.situationsView?.pageSize || 80
      },
      summary: summarizeSituations(),
      selection: buildSelectionContext()
    },
    assistant: {
      mode: store.ui?.assistant?.mode || "auto",
      conversation_length: safeArray(store.ui?.assistant?.messages).length
    },
    global_navigation: {
      available_sections: ["dashboard", "projects", "project/documents", "project/situations", "project/sujets", "project/insights", "project/parametres"]
    },
    capabilities: {
      global: ["resume_notifications", "prioritize_projects"],
      project: ["summarize_subjects", "group_by_situations", "highlight_blockers"]
    }
  };
}
