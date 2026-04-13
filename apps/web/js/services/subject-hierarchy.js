export function buildSubjectHierarchyIndexes(subjectRows = [], subjectsById = {}) {
  const parentBySubjectId = {};
  const childrenBySubjectId = {};
  const rootSubjectIds = [];

  for (const subjectId of Object.keys(subjectsById || {})) {
    childrenBySubjectId[subjectId] = [];
  }

  for (const subject of subjectRows || []) {
    const subjectId = String(subject?.id || "");
    if (!subjectId) continue;

    if (!Array.isArray(childrenBySubjectId[subjectId])) {
      childrenBySubjectId[subjectId] = [];
    }

    const parentId = String(subject?.parent_subject_id || "");
    parentBySubjectId[subjectId] = parentId || null;

    if (parentId && subjectsById[parentId] && parentId !== subjectId) {
      if (!Array.isArray(childrenBySubjectId[parentId])) {
        childrenBySubjectId[parentId] = [];
      }
      childrenBySubjectId[parentId].push(subjectId);
    } else {
      rootSubjectIds.push(subjectId);
    }
  }

  return {
    parentBySubjectId,
    childrenBySubjectId,
    rootSubjectIds
  };
}
