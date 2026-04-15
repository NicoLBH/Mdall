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

async function fetchNextParentChildOrder(parentSubjectId) {
  const normalizedParentSubjectId = normalizeId(parentSubjectId);
  if (!normalizedParentSubjectId) return null;

  const url = new URL(`${SUPABASE_URL}/rest/v1/subjects`);
  url.searchParams.set("select", "parent_child_order");
  url.searchParams.set("parent_subject_id", `eq.${normalizedParentSubjectId}`);
  url.searchParams.set("order", "parent_child_order.desc.nullslast");
  url.searchParams.set("limit", "1");

  const headers = await buildSupabaseAuthHeaders({ Accept: "application/json" });
  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Impossible de calculer l'ordre des sous-sujets (${res.status}) : ${text}`);
  }

  const rows = await res.json().catch(() => []);
  const row = (Array.isArray(rows) ? rows[0] : rows) || null;
  const lastOrder = Number(row?.parent_child_order);
  return Number.isFinite(lastOrder) && lastOrder > 0 ? lastOrder + 1 : 1;
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

  const nowIso = new Date().toISOString();
  const nextOrder = normalizedParentSubjectId
    ? await fetchNextParentChildOrder(normalizedParentSubjectId)
    : null;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/subjects?id=eq.${encodeURIComponent(normalizedSubjectId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      parent_subject_id: normalizedParentSubjectId || null,
      parent_linked_at: normalizedParentSubjectId ? nowIso : null,
      parent_child_order: normalizedParentSubjectId ? nextOrder : null
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
