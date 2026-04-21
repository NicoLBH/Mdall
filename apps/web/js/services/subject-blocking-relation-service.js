import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentUserDirectoryPersonId } from "./project-supabase-sync.js";

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

  const actorPersonId = normalizeId(await resolveCurrentUserDirectoryPersonId());
  if (!actorPersonId) {
    throw new Error("Impossible de résoudre l'identité utilisateur pour historiser la relation bloquante.");
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_subject_blocked_by_relation_with_history`, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Accept: "application/json"
    }),
    body: JSON.stringify({
      p_subject_id: sourceKey,
      p_blocked_by_subject_id: targetKey,
      p_should_exist: true,
      p_actor_person_id: actorPersonId
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ajout de la relation bloquante impossible (${res.status}) : ${text}`);
  }

  return await res.json().catch(() => ({}));
}

export async function deleteBlockedByRelationInSupabase({ subjectId, blockedBySubjectId, rawSubjectsResult = null } = {}) {
  const sourceKey = normalizeId(subjectId);
  const targetKey = normalizeId(blockedBySubjectId);
  if (!sourceKey) throw new Error("subjectId est requis.");
  if (!targetKey) throw new Error("blockedBySubjectId est requis.");

  if (rawSubjectsResult) {
    assertBlockingRelationAllowed({
      subjectId: sourceKey,
      blockedBySubjectId: targetKey,
      rawSubjectsResult
    });
  }

  const actorPersonId = normalizeId(await resolveCurrentUserDirectoryPersonId());
  if (!actorPersonId) {
    throw new Error("Impossible de résoudre l'identité utilisateur pour historiser la relation bloquante.");
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_subject_blocked_by_relation_with_history`, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Accept: "application/json"
    }),
    body: JSON.stringify({
      p_subject_id: sourceKey,
      p_blocked_by_subject_id: targetKey,
      p_should_exist: false,
      p_actor_person_id: actorPersonId
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Suppression de la relation bloquante impossible (${res.status}) : ${text}`);
  }

  return await res.json().catch(() => ({}));
}
