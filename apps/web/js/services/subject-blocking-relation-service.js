import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeProjectId(subject = {}) {
  return normalizeId(subject?.project_id || subject?.projectId || subject?.raw?.project_id);
}

function getSubject(rawSubjectsResult, subjectId) {
  const key = normalizeId(subjectId);
  if (!key) return null;
  return rawSubjectsResult?.subjectsById?.[key] || null;
}

function hasReverseBlockedByRelation(rawSubjectsResult, sourceSubjectId, targetSubjectId) {
  const sourceKey = normalizeId(sourceSubjectId);
  const targetKey = normalizeId(targetSubjectId);
  if (!sourceKey || !targetKey) return false;
  const links = Array.isArray(rawSubjectsResult?.linksBySubjectId?.[targetKey])
    ? rawSubjectsResult.linksBySubjectId[targetKey]
    : [];
  return links.some((link) => {
    const linkType = String(link?.link_type || "").toLowerCase();
    return linkType === "blocked_by"
      && normalizeId(link?.source_subject_id) === targetKey
      && normalizeId(link?.target_subject_id) === sourceKey;
  });
}

function assertBlockingRelationAllowed({ subjectId, blockedBySubjectId, rawSubjectsResult }) {
  const sourceKey = normalizeId(subjectId);
  const targetKey = normalizeId(blockedBySubjectId);
  if (!sourceKey) throw new Error("subjectId est requis.");
  if (!targetKey) throw new Error("blockedBySubjectId est requis.");
  if (sourceKey === targetKey) {
    throw new Error("Un sujet ne peut pas être lié à lui-même.");
  }

  const sourceSubject = getSubject(rawSubjectsResult, sourceKey);
  const targetSubject = getSubject(rawSubjectsResult, targetKey);
  if (!sourceSubject || !targetSubject) {
    throw new Error("Le sujet sélectionné est introuvable.");
  }

  const sourceProjectId = normalizeProjectId(sourceSubject);
  const targetProjectId = normalizeProjectId(targetSubject);
  if (sourceProjectId && targetProjectId && sourceProjectId !== targetProjectId) {
    throw new Error("Les sujets doivent appartenir au même projet.");
  }

  if (hasReverseBlockedByRelation(rawSubjectsResult, sourceKey, targetKey)) {
    throw new Error("Cette relation est invalide : les deux sujets ne peuvent pas se bloquer mutuellement.");
  }
}

export async function createBlockedByRelationInSupabase({ subjectId, blockedBySubjectId, rawSubjectsResult = null } = {}) {
  const sourceKey = normalizeId(subjectId);
  const targetKey = normalizeId(blockedBySubjectId);
  assertBlockingRelationAllowed({
    subjectId: sourceKey,
    blockedBySubjectId: targetKey,
    rawSubjectsResult
  });

  const sourceSubject = getSubject(rawSubjectsResult, sourceKey);
  const projectId = normalizeProjectId(sourceSubject);
  if (!projectId) {
    throw new Error("project_id introuvable pour le sujet source.");
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_links`);
  url.searchParams.set("on_conflict", "project_id,source_subject_id,target_subject_id,link_type");

  const headers = await buildSupabaseAuthHeaders({
    "Content-Type": "application/json",
    Accept: "application/json",
    Prefer: "resolution=merge-duplicates,return=representation"
  });

  const payload = [{
    project_id: projectId,
    source_subject_id: sourceKey,
    target_subject_id: targetKey,
    link_type: "blocked_by"
  }];

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ajout de la relation bloquante impossible (${res.status}) : ${text}`);
  }

  const rows = await res.json().catch(() => []);
  return rows[0] || null;
}

export async function deleteBlockedByRelationInSupabase({ subjectId, blockedBySubjectId } = {}) {
  const sourceKey = normalizeId(subjectId);
  const targetKey = normalizeId(blockedBySubjectId);
  if (!sourceKey) throw new Error("subjectId est requis.");
  if (!targetKey) throw new Error("blockedBySubjectId est requis.");

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_links`);
  url.searchParams.set("source_subject_id", `eq.${sourceKey}`);
  url.searchParams.set("target_subject_id", `eq.${targetKey}`);
  url.searchParams.set("link_type", "eq.blocked_by");

  const headers = await buildSupabaseAuthHeaders({
    Accept: "application/json"
  });

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers,
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Suppression de la relation bloquante impossible (${res.status}) : ${text}`);
  }

  return true;
}
