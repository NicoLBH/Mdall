function normalizeSearchValue(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveCanonicalSource(view = {}) {
  const rawSubjectsResult = view?.rawSubjectsResult;
  const subjectsById = rawSubjectsResult?.subjectsById;
  if (subjectsById && typeof subjectsById === "object" && !Array.isArray(subjectsById)) {
    return {
      sourceType: "subjectsById",
      sourceRef: subjectsById,
      rows: Object.values(subjectsById)
    };
  }

  const flatSubjects = Array.isArray(view?.subjectsData) ? view.subjectsData : [];
  return {
    sourceType: "subjectsData",
    sourceRef: flatSubjects,
    rows: flatSubjects
  };
}

function normalizeSubjectEntry(subject = {}, { statusResolver } = {}) {
  const id = String(subject?.id || "").trim();
  if (!id) return null;

  const subjectNumber = parsePositiveInt(subject?.subject_number ?? subject?.subjectNumber);
  if (!subjectNumber) return null;

  const title = String(subject?.title || "").trim() || `Sujet #${subjectNumber}`;
  const resolvedStatus = typeof statusResolver === "function" ? statusResolver(subject) : subject?.status;
  const status = String(resolvedStatus || "open").trim().toLowerCase() || "open";

  return {
    id,
    subjectId: id,
    subjectNumber,
    title,
    status,
    searchTitleNormalized: normalizeSearchValue(title),
    searchNumberNormalized: String(subjectNumber)
  };
}

function buildIndex(view = {}, options = {}) {
  const { sourceType, sourceRef, rows } = resolveCanonicalSource(view);
  const entries = [];
  const byId = new Map();
  const byNumber = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const normalized = normalizeSubjectEntry(row, options);
    if (!normalized?.id || byId.has(normalized.id)) continue;
    byId.set(normalized.id, normalized);
    if (!byNumber.has(normalized.subjectNumber)) byNumber.set(normalized.subjectNumber, normalized);
    entries.push(normalized);
  }

  entries.sort((left, right) => {
    if (left.subjectNumber !== right.subjectNumber) return left.subjectNumber - right.subjectNumber;
    return left.title.localeCompare(right.title, "fr", { sensitivity: "base" });
  });

  return {
    sourceType,
    sourceRef,
    entries,
    byId,
    byNumber
  };
}

function ensureCache(view = {}, options = {}) {
  const cached = view?.subjectRefIndexCache;
  const { sourceType, sourceRef } = resolveCanonicalSource(view);
  if (cached && cached.sourceType === sourceType && cached.sourceRef === sourceRef) {
    return cached;
  }
  const next = buildIndex(view, options);
  if (view && typeof view === "object") {
    view.subjectRefIndexCache = next;
  }
  return next;
}

export function invalidateSubjectRefIndex(view = {}) {
  if (!view || typeof view !== "object") return;
  view.subjectRefIndexCache = null;
}

export function getAllSubjectRefEntries(view = {}, options = {}) {
  return ensureCache(view, options).entries;
}

export function getSubjectRefById(view = {}, subjectId, options = {}) {
  const id = String(subjectId || "").trim();
  if (!id) return null;
  return ensureCache(view, options).byId.get(id) || null;
}

export function getSubjectRefByNumber(view = {}, subjectNumber, options = {}) {
  const num = parsePositiveInt(subjectNumber);
  if (!num) return null;
  return ensureCache(view, options).byNumber.get(num) || null;
}

export function searchSubjectRefs(view = {}, query = "", limit = 8, options = {}) {
  const index = ensureCache(view, options);
  const normalizedQuery = normalizeSearchValue(query);
  const max = Math.max(1, Number(limit || 8));
  if (!normalizedQuery) return index.entries.slice(0, max);

  const isNumericQuery = /^\d+$/.test(normalizedQuery);
  const results = [];

  if (isNumericQuery) {
    const exact = index.byNumber.get(Number(normalizedQuery));
    if (exact) results.push(exact);
    for (const entry of index.entries) {
      if (results.length >= max) break;
      if (exact && entry.id === exact.id) continue;
      if (entry.searchNumberNormalized.startsWith(normalizedQuery)) {
        results.push(entry);
      }
    }
    return results.slice(0, max);
  }

  for (const entry of index.entries) {
    if (results.length >= max) break;
    if (entry.searchTitleNormalized.includes(normalizedQuery)) {
      results.push(entry);
    }
  }

  return results;
}
