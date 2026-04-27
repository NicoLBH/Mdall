function normalizeId(value) {
  return String(value || "").trim();
}

function sortSubjectIds(subjectIds = [], subjectsById = {}) {
  return [...subjectIds].sort((leftId, rightId) => {
    const left = subjectsById[leftId] || {};
    const right = subjectsById[rightId] || {};

    const leftOrder = Number(left?.parent_child_order ?? left?.raw?.parent_child_order);
    const rightOrder = Number(right?.parent_child_order ?? right?.raw?.parent_child_order);
    const leftHasOrder = Number.isFinite(leftOrder) && leftOrder > 0;
    const rightHasOrder = Number.isFinite(rightOrder) && rightOrder > 0;

    if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;

    const leftTs = Date.parse(String(left?.created_at || left?.raw?.created_at || "")) || 0;
    const rightTs = Date.parse(String(right?.created_at || right?.raw?.created_at || "")) || 0;
    if (leftTs !== rightTs) return leftTs - rightTs;

    return String(left?.title || leftId).localeCompare(String(right?.title || rightId), "fr");
  });
}

export function resolveSituationTreeData(situationSubjects = [], rawSubjectsResult = {}) {
  const selectedSubjectIds = new Set(
    (Array.isArray(situationSubjects) ? situationSubjects : [])
      .map((subject) => normalizeId(subject?.id))
      .filter(Boolean)
  );

  const rawSubjectsById = rawSubjectsResult?.subjectsById && typeof rawSubjectsResult.subjectsById === "object"
    ? rawSubjectsResult.subjectsById
    : {};
  const rawChildrenBySubjectId = rawSubjectsResult?.childrenBySubjectId && typeof rawSubjectsResult.childrenBySubjectId === "object"
    ? rawSubjectsResult.childrenBySubjectId
    : {};
  const rawParentBySubjectId = rawSubjectsResult?.parentBySubjectId && typeof rawSubjectsResult.parentBySubjectId === "object"
    ? rawSubjectsResult.parentBySubjectId
    : {};

  const subjectsById = {};
  selectedSubjectIds.forEach((subjectId) => {
    const selectedSubject = (situationSubjects || []).find((subject) => normalizeId(subject?.id) === subjectId);
    subjectsById[subjectId] = rawSubjectsById[subjectId] || selectedSubject || null;
  });

  const childrenBySubjectId = {};
  selectedSubjectIds.forEach((subjectId) => {
    const childIds = Array.isArray(rawChildrenBySubjectId?.[subjectId])
      ? rawChildrenBySubjectId[subjectId]
      : [];
    childrenBySubjectId[subjectId] = sortSubjectIds(
      childIds
        .map((childId) => normalizeId(childId))
        .filter((childId) => selectedSubjectIds.has(childId)),
      subjectsById
    );
  });

  const rootSubjectIds = sortSubjectIds(
    [...selectedSubjectIds].filter((subjectId) => {
      const subject = subjectsById?.[subjectId] || {};
      const parentFromRaw = normalizeId(rawParentBySubjectId?.[subjectId]);
      const parentFromSubject = normalizeId(subject?.parent_subject_id || subject?.raw?.parent_subject_id);
      const parentId = parentFromRaw || parentFromSubject;
      return !parentId || !selectedSubjectIds.has(parentId);
    }),
    subjectsById
  );

  return {
    selectedSubjectIds,
    subjectsById,
    childrenBySubjectId,
    rootSubjectIds
  };
}

export function getExpandedSubjectIdsSet({ store, situationId, rootSubjectIds = [], fallbackExpandedIds = [] }) {
  const bySituation = store?.situationsView?.gridExpandedSubjectIdsBySituationId;
  const stored = bySituation && typeof bySituation === "object" ? bySituation[situationId] : null;

  if (stored instanceof Set) return stored;
  if (Array.isArray(stored)) {
    return new Set(stored.map((value) => normalizeId(value)).filter(Boolean));
  }

  const seed = Array.isArray(fallbackExpandedIds) && fallbackExpandedIds.length
    ? fallbackExpandedIds
    : rootSubjectIds;
  return new Set(seed.map((value) => normalizeId(value)).filter(Boolean));
}
