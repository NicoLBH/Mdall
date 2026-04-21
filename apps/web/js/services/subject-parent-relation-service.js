import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentUserDirectoryPersonId } from "./project-supabase-sync.js";

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

  const actorPersonId = normalizeId(await resolveCurrentUserDirectoryPersonId());
  if (!actorPersonId) {
    throw new Error("Impossible de résoudre l'identité utilisateur pour historiser la relation parent.");
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_subject_parent_with_history`, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({
      p_subject_id: normalizedSubjectId,
      p_parent_subject_id: normalizedParentSubjectId || null,
      p_actor_person_id: actorPersonId
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mise à jour du sujet parent impossible (${res.status}) : ${text}`);
  }

  const rpcPayload = await res.json().catch(() => ({}));
  const updatedRow = {
    parent_subject_id: normalizeId(rpcPayload?.next_parent_subject_id) || null,
    parent_linked_at: rpcPayload?.parent_linked_at || null,
    parent_child_order: rpcPayload?.parent_child_order ?? null
  };
  return {
    subjectId: normalizedSubjectId,
    parentSubjectId: normalizeId(updatedRow.parent_subject_id),
    updatedRow
  };
}

export async function reorderSubjectChildrenInSupabase({ parentSubjectId, orderedChildIds = [] } = {}) {
  const normalizedParentSubjectId = normalizeId(parentSubjectId);
  if (!normalizedParentSubjectId) throw new Error("parentSubjectId est requis.");
  const normalizedOrderedChildIds = [...new Set((Array.isArray(orderedChildIds) ? orderedChildIds : []).map(normalizeId).filter(Boolean))];
  if (!normalizedOrderedChildIds.length) throw new Error("orderedChildIds est requis.");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reorder_subject_children`, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({
      p_parent_subject_id: normalizedParentSubjectId,
      p_child_subject_ids: normalizedOrderedChildIds
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Réordonnancement des sous-sujets impossible (${res.status}) : ${text}`);
  }

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}
