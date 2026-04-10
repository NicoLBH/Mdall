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

  function ensureRunBucketShape(all, key) {
    if (!all.runs[key]) {
      all.runs[key] = {
        comments: [],
        activities: [],
        descriptions: {
          avis: {},
          sujet: {},
          situation: {}
        },
        decisions: {
          avis: {},
          sujet: {},
          situation: {}
        },
        review: {
          avis: {},
          sujet: {},
          situation: {}
        },
        objectives: [],
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
    if (!bucket.descriptions) {
      bucket.descriptions = {
        avis: {},
        sujet: {},
        situation: {}
      };
      saveHumanStore(all);
    }
    if (!bucket.review) {
      bucket.review = {
        avis: {},
        sujet: {},
        situation: {}
      };
      saveHumanStore(all);
    }
    if (!Array.isArray(bucket.objectives)) {
      bucket.objectives = [];
      saveHumanStore(all);
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
      saveHumanStore(all);
    }

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
