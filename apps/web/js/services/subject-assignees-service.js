function normalizeAssigneeId(value) {
  return String(value || "").trim();
}

export function normalizeAssigneeIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeAssigneeId(value)).filter(Boolean))];
}

export function resolveSubjectAssigneeIds({
  subjectMetaAssignees,
  assigneeMap,
  subjectId,
  subject
} = {}) {
  const normalizedSubjectId = String(subjectId || "").trim();
  const map = assigneeMap && typeof assigneeMap === "object" ? assigneeMap : {};

  if (Array.isArray(subjectMetaAssignees)) {
    return normalizeAssigneeIds(subjectMetaAssignees);
  }

  const mapped = normalizeAssigneeIds(map[normalizedSubjectId]);
  if (mapped.length) return mapped;

  return normalizeAssigneeIds([
    subject?.assignee_person_id,
    subject?.raw?.assignee_person_id
  ]);
}

export function findCollaboratorByAssigneeId(collaboratorsById, assigneeId) {
  const key = normalizeAssigneeId(assigneeId);
  if (!key || !(collaboratorsById instanceof Map)) return null;
  return collaboratorsById.get(key) || null;
}
