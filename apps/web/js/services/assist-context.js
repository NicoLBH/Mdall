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

function getRawSubjectsResult() {
  const projectRaw = store.projectSubjectsView?.rawSubjectsResult || store.projectSubjectsView?.rawResult;
  if (projectRaw && typeof projectRaw === "object") return projectRaw;
  const legacyRaw = store.situationsView?.rawResult;
  if (legacyRaw && typeof legacyRaw === "object") return legacyRaw;
  return {};
}

function flattenSubjects(subjects = [], acc = []) {
  for (const subject of safeArray(subjects)) {
    acc.push(subject);
    flattenSubjects(subject?.children, acc);
  }
  return acc;
}

function getSubjectsByIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.subjectsById && typeof raw.subjectsById === "object") return raw.subjectsById;

  const fromProjectView = safeArray(store.projectSubjectsView?.subjectsData);
  if (fromProjectView.length) {
    return Object.fromEntries(fromProjectView
      .map((subject) => [String(subject?.id || ""), subject])
      .filter(([id]) => !!id));
  }

  const fallback = {};
  for (const situation of safeArray(store.situationsView?.data)) {
    for (const subject of flattenSubjects(situation?.sujets)) {
      const id = String(subject?.id || "");
      if (!id) continue;
      fallback[id] = subject;
    }
  }
  return fallback;
}

function getLinksBySubjectIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.linksBySubjectId && typeof raw.linksBySubjectId === "object") return raw.linksBySubjectId;
  return {};
}

function getSituationsByIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.situationsById && typeof raw.situationsById === "object") return raw.situationsById;
  if (raw.relationOptionsById && typeof raw.relationOptionsById === "object") return raw.relationOptionsById;

  const fallback = {};
  for (const situation of safeArray(store.situationsView?.data)) {
    const id = String(situation?.id || "");
    if (!id) continue;
    fallback[id] = situation;
  }
  return fallback;
}

function getRelationIdsBySubjectIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.relationIdsBySubjectId && typeof raw.relationIdsBySubjectId === "object") return raw.relationIdsBySubjectId;

  const fallback = {};
  for (const situation of safeArray(store.situationsView?.data)) {
    const situationId = String(situation?.id || "");
    for (const subject of flattenSubjects(situation?.sujets)) {
      const subjectId = String(subject?.id || "");
      if (!subjectId) continue;
      if (!Array.isArray(fallback[subjectId])) fallback[subjectId] = [];
      if (situationId) fallback[subjectId].push(situationId);
    }
  }
  return fallback;
}

function findSituationById(id) {
  return getSituationsByIdMap()[String(id || "")] || null;
}

function findSubjectById(id) {
  const subject = getSubjectsByIdMap()[String(id || "")] || null;
  if (!subject) return null;

  const relationIds = safeArray(getRelationIdsBySubjectIdMap()[String(id || "")]);
  const situation = relationIds.length ? findSituationById(relationIds[0]) : null;

  return { subject, situation };
}

function isClosedStatus(status) {
  return String(status || "open").toLowerCase() === "closed";
}

function isBlockedSubject(subjectId) {
  return (getLinksBySubjectIdMap()[String(subjectId || "")] || []).some((link) => {
    return String(link?.source_subject_id || "") === String(subjectId || "")
      && String(link?.link_type || "").toLowerCase() === "blocked_by";
  });
}

function isBlockingSubject(subjectId) {
  return (getLinksBySubjectIdMap()[String(subjectId || "")] || []).some((link) => {
    return String(link?.target_subject_id || "") === String(subjectId || "")
      && String(link?.link_type || "").toLowerCase() === "blocked_by";
  });
}

function summarizeSituations() {
  const situationsById = getSituationsByIdMap();
  const subjectsById = getSubjectsByIdMap();
  const subjects = Object.values(subjectsById);

  let openSubjects = 0;
  let closedSubjects = 0;
  let blockedSubjects = 0;
  let blockingSubjects = 0;
  let rootSubjects = 0;

  const childIds = new Set();
  for (const subject of subjects) {
    const parentId = String(subject?.parent_subject_id || subject?.parentSubjectId || "");
    if (parentId) childIds.add(String(subject?.id || ""));
  }

  for (const subject of subjects) {
    if (isClosedStatus(subject?.status)) closedSubjects += 1;
    else openSubjects += 1;
    if (isBlockedSubject(subject?.id)) blockedSubjects += 1;
    if (isBlockingSubject(subject?.id)) blockingSubjects += 1;
    if (!childIds.has(String(subject?.id || ""))) rootSubjects += 1;
  }

  return {
    situations_count: Object.keys(situationsById).length,
    subjects_count: subjects.length,
    root_subjects_count: rootSubjects,
    child_subjects_count: Math.max(0, subjects.length - rootSubjects),
    open_subjects_count: openSubjects,
    closed_subjects_count: closedSubjects,
    blocked_subjects_count: blockedSubjects,
    blocking_subjects_count: blockingSubjects
  };
}

function buildSelectionContext() {
  const selectionSource = store.projectSubjectsView || store.situationsView || {};
  const selectedSituationId = selectionSource?.selectedSituationId || null;
  const selectedSubjectId = selectionSource?.selectedSubjectId || selectionSource?.selectedSujetId || null;

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
        priority: hit.subject?.priority || "medium",
        blocked: isBlockedSubject(hit.subject?.id),
        blocking: isBlockingSubject(hit.subject?.id)
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
        priority: situation?.priority || "medium",
        blocked: false,
        blocking: false
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
    priority: "",
    blocked: false,
    blocking: false
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
  const selection = buildSelectionContext();
  const summary = summarizeSituations();

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
    subjects: {
      filters: {
        search: store.projectSubjectsView?.search || store.situationsView?.search || "",
        display_depth: store.projectSubjectsView?.displayDepth || store.situationsView?.displayDepth || "situations",
        page: store.projectSubjectsView?.page || store.situationsView?.page || 1,
        page_size: store.projectSubjectsView?.pageSize || store.situationsView?.pageSize || 80,
        status: store.projectSubjectsView?.filters?.status || store.situationsView?.filters?.status || "open",
        priority: store.projectSubjectsView?.filters?.priority || store.situationsView?.filters?.priority || "",
        blocking_state: store.projectSubjectsView?.filters?.blockingState || store.situationsView?.filters?.blockingState || ""
      },
      summary,
      selection
    },
    situations: {
      filters: {
        search: store.projectSubjectsView?.search || store.situationsView?.search || "",
        display_depth: store.projectSubjectsView?.displayDepth || store.situationsView?.displayDepth || "situations",
        page: store.projectSubjectsView?.page || store.situationsView?.page || 1,
        page_size: store.projectSubjectsView?.pageSize || store.situationsView?.pageSize || 80
      },
      summary,
      selection
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
