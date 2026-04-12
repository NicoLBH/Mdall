export function createProjectSubjectsPersistence(deps = {}) {
  const {
    store,
    firstNonEmpty,
    humanStoreKey = "rapsobot-human-store-v2"
  } = deps;

  function currentRunKey() {
    return firstNonEmpty(
      store.currentProjectId,
      store.currentProject?.id,
      store.ui?.runId,
      store.situationsView?.rawResult?.run_id,
      store.situationsView?.rawResult?.runId,
      "default-project"
    );
  }

  function loadHumanStore() {
    try {
      const raw = localStorage.getItem(humanStoreKey);
      if (!raw) return { runs: {} };
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : { runs: {} };
    } catch {
      return { runs: {} };
    }
  }

  function saveHumanStore(data) {
    try {
      localStorage.setItem(humanStoreKey, JSON.stringify(data));
    } catch {
      // no-op
    }
  }

  function createEmptyEntityMap() {
    return {
      sujet: {},
      situation: {}
    };
  }

  function cleanupLegacyRunBucket(bucket) {
    let mutated = false;

    bucket.descriptions = bucket.descriptions && typeof bucket.descriptions === "object"
      ? bucket.descriptions
      : createEmptyEntityMap();
    bucket.decisions = bucket.decisions && typeof bucket.decisions === "object"
      ? bucket.decisions
      : createEmptyEntityMap();
    bucket.review = bucket.review && typeof bucket.review === "object"
      ? bucket.review
      : createEmptyEntityMap();

    [bucket.descriptions, bucket.decisions, bucket.review].forEach((entityMap) => {
      if (entityMap.avis) {
        delete entityMap.avis;
        mutated = true;
      }
      if (!entityMap.sujet || typeof entityMap.sujet !== "object") {
        entityMap.sujet = {};
        mutated = true;
      }
      if (!entityMap.situation || typeof entityMap.situation !== "object") {
        entityMap.situation = {};
        mutated = true;
      }
    });

    if (!bucket.subjectMeta || typeof bucket.subjectMeta !== "object") {
      bucket.subjectMeta = { sujet: {} };
      mutated = true;
    }
    if (!bucket.subjectMeta.sujet || typeof bucket.subjectMeta.sujet !== "object") {
      bucket.subjectMeta.sujet = {};
      mutated = true;
    }
    Object.values(bucket.subjectMeta.sujet).forEach((meta) => {
      if (!meta || typeof meta !== "object" || Array.isArray(meta)) return;
      if (Object.prototype.hasOwnProperty.call(meta, "labels")) {
        delete meta.labels;
        mutated = true;
      }
    });

    ["selectedAvisId", "tempAvisVerdict", "tempAvisVerdictFor", "objectives"].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(bucket, key)) {
        delete bucket[key];
        mutated = true;
      }
    });

    return mutated;
  }

  function ensureRunBucketShape(all, key) {
    if (!all.runs[key]) {
      all.runs[key] = {
        comments: [],
        activities: [],
        descriptions: createEmptyEntityMap(),
        decisions: createEmptyEntityMap(),
        review: createEmptyEntityMap(),
        workflow: {
          sujet_kanban_status: {}
        },
        subjectMeta: {
          sujet: {}
        },
        customSubjects: []
      };
      saveHumanStore(all);
    }

    const bucket = all.runs[key];
    let shouldSave = cleanupLegacyRunBucket(bucket);
    if (!bucket.descriptions) {
      bucket.descriptions = createEmptyEntityMap();
      shouldSave = true;
    }
    if (!bucket.review) {
      bucket.review = createEmptyEntityMap();
      shouldSave = true;
    }
    if (!bucket.workflow || typeof bucket.workflow !== "object") {
      bucket.workflow = { sujet_kanban_status: {} };
      saveHumanStore(all);
    }
    if (!bucket.workflow.sujet_kanban_status) {
      bucket.workflow.sujet_kanban_status = {};
      saveHumanStore(all);
    }
    if (!bucket.subjectMeta || typeof bucket.subjectMeta !== "object") {
      bucket.subjectMeta = { sujet: {} };
      saveHumanStore(all);
    }
    if (!bucket.subjectMeta.sujet || typeof bucket.subjectMeta.sujet !== "object") {
      bucket.subjectMeta.sujet = {};
      saveHumanStore(all);
    }
    if (!Array.isArray(bucket.customSubjects)) {
      bucket.customSubjects = [];
      shouldSave = true;
    }

    if (shouldSave) saveHumanStore(all);

    return bucket;
  }

  function getRunBucket() {
    const all = loadHumanStore();
    const key = currentRunKey();
    const bucket = ensureRunBucketShape(all, key);
    return { all, key, bucket };
  }

  function persistRunBucket(mutator) {
    const { all, key, bucket } = getRunBucket();
    mutator(bucket);
    all.runs[key] = bucket;
    saveHumanStore(all);
  }

  return {
    currentRunKey,
    loadHumanStore,
    saveHumanStore,
    getRunBucket,
    persistRunBucket
  };
}
