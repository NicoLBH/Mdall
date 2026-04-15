import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

function normalizeId(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function getSubjectsByIdMap(rawSubjectsResult) {
  return rawSubjectsResult?.subjectsById && typeof rawSubjectsResult.subjectsById === "object"
    ? rawSubjectsResult.subjectsById
    : {};
}

function ensureNoParentCycle({ subjectId, parentSubjectId, subjectsById }) {
  if (!parentSubjectId) return;
  if (subjectId === parentSubjectId) {
    throw new Error("Un sujet ne peut pas être son propre parent.");
  }

  const visited = new Set([subjectId]);
  let cursorId = parentSubjectId;
  while (cursorId) {
    if (visited.has(cursorId)) {
      throw new Error("Relation invalide : boucle détectée dans la hiérarchie des sujets.");
    }
    visited.add(cursorId);
    const cursor = subjectsById[cursorId];
    if (!cursor) break;
    cursorId = normalizeId(cursor.parent_subject_id || cursor.parentSubjectId || cursor.raw?.parent_subject_id);
  }
}

function assertParentCandidateExists(parentSubjectId, subjectsById) {
  if (!parentSubjectId) return;
  if (!subjectsById[parentSubjectId]) {
    throw new Error("Le sujet parent sélectionné est introuvable.");
  }
}

function assertSameProject(subject, parentSubject) {
  if (!subject || !parentSubject) return;
  const subjectProjectId = normalizeId(subject.project_id || subject.projectId || subject.raw?.project_id);
  const parentProjectId = normalizeId(parentSubject.project_id || parentSubject.projectId || parentSubject.raw?.project_id);
  if (subjectProjectId && parentProjectId && subjectProjectId !== parentProjectId) {
    throw new Error("Le sujet parent doit appartenir au même projet.");
  }
}

export async function setSubjectParentRelationInSupabase({ subjectId, parentSubjectId = null, rawSubjectsResult = null } = {}) {
  const normalizedSubjectId = normalizeId(subjectId);
  const normalizedParentSubjectId = normalizeId(parentSubjectId);
  if (!normalizedSubjectId) {
    throw new Error("subjectId est requis.");
  }

  const subjectsById = getSubjectsByIdMap(rawSubjectsResult);
  const subject = subjectsById[normalizedSubjectId];
  if (!subject) {
    throw new Error("Le sujet à mettre à jour est introuvable.");
  }

  assertParentCandidateExists(normalizedParentSubjectId, subjectsById);
  ensureNoParentCycle({
    subjectId: normalizedSubjectId,
    parentSubjectId: normalizedParentSubjectId || "",
    subjectsById
  });
  if (normalizedParentSubjectId) {
    assertSameProject(subject, subjectsById[normalizedParentSubjectId]);
  }

  const headers = await buildSupabaseAuthHeaders({
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: "return=representation"
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/subjects?id=eq.${encodeURIComponent(normalizedSubjectId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      parent_subject_id: normalizedParentSubjectId || null
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mise à jour du sujet parent impossible (${res.status}) : ${text}`);
  }

  const rows = await res.json().catch(() => []);
  const updatedRow = (Array.isArray(rows) ? rows[0] : rows) || null;
  return {
    subjectId: normalizedSubjectId,
    parentSubjectId: normalizeId(updatedRow?.parent_subject_id),
    updatedRow
  };
}
