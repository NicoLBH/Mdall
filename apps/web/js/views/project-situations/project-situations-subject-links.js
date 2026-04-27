function normalizeId(value) {
  return String(value || "").trim();
}

export function hasBlockedByRelation(subjectId, store = {}, rawSubjectsResult = {}) {
  const normalizedSubjectId = normalizeId(subjectId);
  if (!normalizedSubjectId) return false;
  const linksBySubjectId = rawSubjectsResult?.linksBySubjectId && typeof rawSubjectsResult.linksBySubjectId === "object"
    ? rawSubjectsResult.linksBySubjectId
    : (store?.projectSubjectsView?.linksBySubjectId && typeof store.projectSubjectsView.linksBySubjectId === "object"
      ? store.projectSubjectsView.linksBySubjectId
      : {});
  const scopedLinks = Array.isArray(linksBySubjectId?.[normalizedSubjectId]) ? linksBySubjectId[normalizedSubjectId] : [];
  const subjectLinks = Array.isArray(store?.projectSubjectsView?.subjectLinks) ? store.projectSubjectsView.subjectLinks : [];
  return [...scopedLinks, ...subjectLinks].some((link) => {
    const linkType = String(link?.link_type || "").trim().toLowerCase();
    if (linkType !== "blocked_by") return false;
    const sourceId = normalizeId(link?.source_subject_id);
    return sourceId === normalizedSubjectId;
  });
}
