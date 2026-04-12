export function createProjectSubjectsActions(config) {
  const {
    store,
    DRAFT_SUBJECT_ID,
    ensureViewUiState,
    buildDefaultDraftSubjectMeta,
    persistRunBucket,
    nowIso,
    normalizeSujetKanbanStatus,
    getSujetKanbanStatus,
    getNestedSituation,
    getNestedSujet,
    getSituationSubjects,
    currentDecisionTarget,
    getSelectionEntityType,
    normalizeReviewState,
    setDecision,
    addActivity,
    getEntityReviewMeta,
    stashReviewRestoreSnapshot,
    restoreEntityReviewMeta,
    markEntityValidated,
    claimDescriptionAsHuman,
    setEntityReviewState,
    rerenderScope,
    reloadSubjectsFromSupabase,
    loadSituationsForCurrentProject,
    addSubjectToSituation,
    removeSubjectFromSituation,
    persistSubjectIssueActionToSupabase,
    showError,
    getSubjectSidebarMeta,
    normalizeSubjectObjectiveIds,
    normalizeSubjectSituationIds,
    normalizeSubjectLabels,
    normalizeSubjectLabelKey,
    getObjectives,
    addSubjectToObjectiveInSupabase,
    removeSubjectFromObjectiveInSupabase,
    rerenderPanels
  } = config;

  function setSujetKanbanStatus(sujetId, nextStatus, options = {}) {
    const normalized = normalizeSujetKanbanStatus(nextStatus);
    const situationId = String(options.situationId || "");
    if (!sujetId || !normalized || !situationId) return false;

    const previous = getSujetKanbanStatus(sujetId, situationId);
    if (previous === normalized) return false;

    persistRunBucket((bucket) => {
      bucket.workflow = bucket.workflow || { sujet_kanban_status: {} };
      bucket.workflow.sujet_kanban_status = bucket.workflow.sujet_kanban_status || {};
      const statusMap = bucket.workflow.sujet_kanban_status;
      if (typeof statusMap[situationId] !== "object" || Array.isArray(statusMap[situationId])) statusMap[situationId] = {};
      statusMap[situationId][sujetId] = normalized;
      bucket.activities.push({
        ts: options.ts || nowIso(),
        entity_type: "situation",
        entity_id: situationId,
        type: "ACTIVITY",
        kind: "sujet_kanban_status_changed",
        actor: options.actor || "Human",
        agent: options.agent || "human",
        message: "",
        meta: {
          sujet_id: sujetId,
          situation_id: situationId,
          from: previous,
          to: normalized
        }
      });
    });

    return true;
  }

  function setSubjectObjectiveIds(subjectId, objectiveIds) {
    const subjectKey = String(subjectId || "");
    const nextIds = normalizeSubjectObjectiveIds(objectiveIds);
    if (subjectKey === DRAFT_SUBJECT_ID) {
      ensureViewUiState();
      store.situationsView.createSubjectForm.meta = {
        ...buildDefaultDraftSubjectMeta(),
        ...(store.situationsView.createSubjectForm.meta || {}),
        objectiveIds: nextIds
      };
      return;
    }
    persistRunBucket((bucket) => {
      bucket.subjectMeta = bucket.subjectMeta && typeof bucket.subjectMeta === "object" ? bucket.subjectMeta : {};
      bucket.subjectMeta.sujet = bucket.subjectMeta.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
      const current = bucket.subjectMeta.sujet[subjectKey] && typeof bucket.subjectMeta.sujet[subjectKey] === "object" ? bucket.subjectMeta.sujet[subjectKey] : {};
      bucket.subjectMeta.sujet[subjectKey] = {
        ...current,
        objectiveIds: nextIds
      };

    });
  }

  function setSubjectSituationIds(subjectId, situationIds) {
    const subjectKey = String(subjectId || "");
    const nextIds = normalizeSubjectSituationIds(situationIds);
    if (subjectKey === DRAFT_SUBJECT_ID) {
      ensureViewUiState();
      store.situationsView.createSubjectForm.meta = {
        ...buildDefaultDraftSubjectMeta(),
        ...(store.situationsView.createSubjectForm.meta || {}),
        situationIds: nextIds
      };
      return;
    }
    persistRunBucket((bucket) => {
      bucket.subjectMeta = bucket.subjectMeta && typeof bucket.subjectMeta === "object" ? bucket.subjectMeta : {};
      bucket.subjectMeta.sujet = bucket.subjectMeta.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
      const current = bucket.subjectMeta.sujet[subjectKey] && typeof bucket.subjectMeta.sujet[subjectKey] === "object" ? bucket.subjectMeta.sujet[subjectKey] : {};
      bucket.subjectMeta.sujet[subjectKey] = {
        ...current,
        situationIds: nextIds
      };
    });
  }

  function syncSubjectSituationMaps(subjectId, situationId, shouldLink) {
    const raw = store.projectSubjectsView?.rawSubjectsResult;
    if (!raw || typeof raw !== "object") return;

    raw.subjectIdsBySituationId = raw.subjectIdsBySituationId && typeof raw.subjectIdsBySituationId === "object"
      ? raw.subjectIdsBySituationId
      : {};

    const subjectKey = String(subjectId || "");
    const situationKey = String(situationId || "");
    const currentIds = Array.isArray(raw.subjectIdsBySituationId[situationKey])
      ? raw.subjectIdsBySituationId[situationKey].map((value) => String(value || "")).filter(Boolean)
      : [];

    raw.subjectIdsBySituationId[situationKey] = shouldLink
      ? [...new Set([...currentIds, subjectKey])]
      : currentIds.filter((value) => value !== subjectKey);

    const situation = (Array.isArray(store.situationsView?.data) ? store.situationsView.data : []).find((item) => String(item?.id || "") === situationKey);
    if (situation) {
      raw.situationsById = raw.situationsById && typeof raw.situationsById === "object" ? raw.situationsById : {};
      raw.relationOptionsById = raw.relationOptionsById && typeof raw.relationOptionsById === "object" ? raw.relationOptionsById : {};
      raw.situationsById[situationKey] = situation;
      raw.relationOptionsById[situationKey] = situation;
    }
  }

  async function toggleSubjectSituation(subjectId, situationId, options = {}) {
    const subjectKey = String(subjectId || "");
    const situationKey = String(situationId || "");
    if (!subjectKey || !situationKey) return false;

    const meta = getSubjectSidebarMeta(subjectKey);
    const wasLinked = meta.situationIds.includes(situationKey);
    const nextIds = wasLinked
      ? meta.situationIds.filter((id) => id !== situationKey)
      : [...meta.situationIds, situationKey];

    setSubjectSituationIds(subjectKey, nextIds);
    syncSubjectSituationMaps(subjectKey, situationKey, !wasLinked);

    if (options.root) rerenderScope(options.root);

    try {
      if (wasLinked) await removeSubjectFromSituation(situationKey, subjectKey);
      else await addSubjectToSituation(situationKey, subjectKey);
      await loadSituationsForCurrentProject().catch(() => []);
      return true;
    } catch (error) {
      setSubjectSituationIds(subjectKey, meta.situationIds);
      syncSubjectSituationMaps(subjectKey, situationKey, wasLinked);
      if (options.root) rerenderScope(options.root);
      console.warn("toggleSubjectSituation failed", error);
      showError(`Mise à jour Supabase impossible : ${String(error?.message || error || "Erreur inconnue")}`);
      return false;
    }
  }

  function setSubjectLabels(subjectId, labels) {
    const subjectKey = String(subjectId || "");
    const nextLabels = normalizeSubjectLabels(labels);
    if (subjectKey === DRAFT_SUBJECT_ID) {
      ensureViewUiState();
      store.situationsView.createSubjectForm.meta = {
        ...buildDefaultDraftSubjectMeta(),
        ...(store.situationsView.createSubjectForm.meta || {}),
        labels: nextLabels
      };
      return;
    }
    persistRunBucket((bucket) => {
      bucket.subjectMeta = bucket.subjectMeta && typeof bucket.subjectMeta === "object" ? bucket.subjectMeta : {};
      bucket.subjectMeta.sujet = bucket.subjectMeta.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
      const current = bucket.subjectMeta.sujet[subjectKey] && typeof bucket.subjectMeta.sujet[subjectKey] === "object" ? bucket.subjectMeta.sujet[subjectKey] : {};
      bucket.subjectMeta.sujet[subjectKey] = {
        ...current,
        labels: nextLabels
      };
    });
  }

  function toggleSubjectLabel(subjectId, label) {
    const subjectKey = String(subjectId || "");
    const labelValue = String(label || "").trim();
    const labelKey = normalizeSubjectLabelKey(labelValue);
    if (!subjectKey || !labelKey) return;
    const meta = getSubjectSidebarMeta(subjectKey);
    const hasLabel = meta.labels.some((value) => normalizeSubjectLabelKey(value) === labelKey);
    const nextLabels = hasLabel
      ? meta.labels.filter((value) => normalizeSubjectLabelKey(value) !== labelKey)
      : [...meta.labels, labelValue];
    setSubjectLabels(subjectKey, nextLabels);
  }

  function syncSubjectObjectiveMaps(subjectId, objectiveId, shouldLink) {
    const raw = store.projectSubjectsView?.rawSubjectsResult;
    if (!raw || typeof raw !== "object") return;

    raw.objectiveIdsBySubjectId = raw.objectiveIdsBySubjectId && typeof raw.objectiveIdsBySubjectId === "object"
      ? raw.objectiveIdsBySubjectId
      : {};
    raw.objectivesById = raw.objectivesById && typeof raw.objectivesById === "object"
      ? raw.objectivesById
      : {};
    raw.objectives = Array.isArray(raw.objectives) ? raw.objectives : [];

    const subjectKey = String(subjectId || "");
    const objectiveKey = String(objectiveId || "");
    if (!subjectKey || !objectiveKey) return;

    const currentObjectiveIds = Array.isArray(raw.objectiveIdsBySubjectId[subjectKey])
      ? raw.objectiveIdsBySubjectId[subjectKey].map((value) => String(value || "")).filter(Boolean)
      : [];
    raw.objectiveIdsBySubjectId[subjectKey] = shouldLink
      ? [...new Set([...currentObjectiveIds, objectiveKey])]
      : currentObjectiveIds.filter((value) => value !== objectiveKey);

    const objective = raw.objectives.find((item) => String(item?.id || "") === objectiveKey) || raw.objectivesById[objectiveKey] || null;
    if (!objective) return;

    const currentSubjectIds = Array.isArray(objective.subjectIds)
      ? objective.subjectIds.map((value) => String(value || "")).filter(Boolean)
      : [];
    objective.subjectIds = shouldLink
      ? [...new Set([...currentSubjectIds, subjectKey])]
      : currentSubjectIds.filter((value) => value !== subjectKey);
    raw.objectivesById[objectiveKey] = objective;
  }

  async function toggleSubjectObjective(subjectId, objectiveId, options = {}) {
    const subjectKey = String(subjectId || "");
    const objectiveKey = String(objectiveId || "");
    if (!subjectKey || !objectiveKey) return false;

    const meta = getSubjectSidebarMeta(subjectKey);
    const previousIds = Array.isArray(meta.objectiveIds)
      ? meta.objectiveIds.map((id) => String(id || "")).filter(Boolean)
      : [];
    const wasLinked = previousIds.includes(objectiveKey);
    const nextIds = wasLinked
      ? previousIds.filter((id) => id !== objectiveKey)
      : [...previousIds, objectiveKey];

    setSubjectObjectiveIds(subjectKey, nextIds);
    syncSubjectObjectiveMaps(subjectKey, objectiveKey, !wasLinked);

    if (options.root) rerenderScope(options.root);
    else rerenderPanels();

    try {
      if (wasLinked) await removeSubjectFromObjectiveInSupabase(objectiveKey, subjectKey);
      else await addSubjectToObjectiveInSupabase(objectiveKey, subjectKey);
      return true;
    } catch (error) {
      setSubjectObjectiveIds(subjectKey, previousIds);
      syncSubjectObjectiveMaps(subjectKey, objectiveKey, wasLinked);
      if (options.root) rerenderScope(options.root);
      else rerenderPanels();
      console.warn("toggleSubjectObjective failed", error);
      showError(`Mise à jour Supabase impossible : ${String(error?.message || error || "Erreur inconnue")}`);
      return false;
    }
  }

  function setSubjectObjective(subjectId, objectiveId) {
    const normalizedObjectiveId = String(objectiveId || "").trim();
    setSubjectObjectiveIds(subjectId, normalizedObjectiveId ? [normalizedObjectiveId] : []);
  }

  function buildCascadeCounts() {
    return { situation: 0, sujet: 0 };
  }

  function getCascadeTargets(entityType, entityId, mode = "self") {
    const targets = [];
    const pushTarget = (type, id) => {
      if (!type || !id) return;
      targets.push({ type, id });
    };

    if (entityType === "sujet") {
      const sujet = getNestedSujet(entityId);
      if (!sujet) return targets;
      pushTarget("sujet", entityId);
      return targets;
    }

    if (entityType === "situation") {
      const situation = getNestedSituation(entityId);
      if (!situation) return targets;
      if (mode === "descendants") {
        for (const sujet of getSituationSubjects(situation)) {
          pushTarget("sujet", sujet.id);
        }
      }
      pushTarget("situation", entityId);
    }

    return targets;
  }

  function applyValidationCascade(entityType, entityId, mode = "self") {
    const targets = getCascadeTargets(entityType, entityId, mode);
    const counts = buildCascadeCounts();

    for (const target of targets) {
      markEntityValidated(target.type, target.id, { actor: "Human", agent: "human" });
      claimDescriptionAsHuman(target.type, target.id, { actor: "Human", agent: "human" });
      counts[target.type] += 1;
    }

    return { applied: targets.length, skipped: 0, counts };
  }

  function applyRestoreCascade(entityType, entityId, mode = "self") {
    const targets = getCascadeTargets(entityType, entityId, mode);
    const counts = buildCascadeCounts();
    let applied = 0;
    let skipped = 0;

    for (const target of targets) {
      const ok = restoreEntityReviewMeta(target.type, target.id, { actor: "Human", agent: "human" });
      if (ok) {
        applied += 1;
        counts[target.type] += 1;
      } else {
        skipped += 1;
      }
    }

    return { applied, skipped, counts };
  }


  function applyReviewStateRecursively(entityType, entityId, nextState, mode = "descendants") {
    const targets = getCascadeTargets(entityType, entityId, mode);
    const normalized = normalizeReviewState(nextState);
    const counts = buildCascadeCounts();
    let applied = 0;
    let skipped = 0;

    for (const target of targets) {
      if (normalized === "rejected" || normalized === "dismissed") {
        stashReviewRestoreSnapshot(target.type, target.id, { actor: "Human", agent: "human" });
      }

      const ok = setEntityReviewState(target.type, target.id, normalized, { actor: "Human", agent: "human" });
      if (ok) {
        applied += 1;
        counts[target.type] += 1;
      } else {
        skipped += 1;
      }
    }

    return { applied, skipped, counts };
  }

  function applyReviewStateChange(root, nextState) {
    const target = currentDecisionTarget(root);
    if (!target) return;

    const entityType = getSelectionEntityType(target.type);
    const entityId = target.id;
    const normalized = normalizeReviewState(nextState);
    const mode = "descendants";

    if ((normalized === "rejected" || normalized === "dismissed") && entityType === "sujet") {
      const ok = window.confirm(
        "Rejeter ce sujet appliquera aussi l’état de review à son regroupement courant. Voulez-vous continuer ? Vous pourrez récupérer ensuite l'état précédent."
      );
      if (!ok) return;
    }

    if ((normalized === "rejected" || normalized === "dismissed") && entityType === "situation") {
      const ok = window.confirm(
        "Rejeter cette situation entraînera le rejet automatique de tous ses sujets. Voulez-vous continuer ? Vous pourrez récupérer ensuite l'état précédent."
      );
      if (!ok) return;
    }

    const result = applyReviewStateRecursively(entityType, entityId, normalized, mode);

    addActivity(entityType, entityId, `review_${normalized}`, "", {
      review_state: normalized,
      applied: result.applied,
      skipped: result.skipped,
      mode,
      counts: result.counts
    }, { actor: "Human", agent: "human" });

    if (result.skipped > 0) {
      window.alert(`${result.skipped} élément(s) déjà diffusé(s) ont été conservé(s).`);
    }

    rerenderScope(root);
  }

  function applyRestoreReviewState(root) {
    const target = currentDecisionTarget(root);
    if (!target) return;

    const entityType = getSelectionEntityType(target.type);
    const entityId = target.id;
    const mode = "descendants";
    const result = applyRestoreCascade(entityType, entityId, mode);

    addActivity(entityType, entityId, "review_restored", "", {
      applied: result.applied,
      skipped: result.skipped,
      mode,
      counts: result.counts
    }, { actor: "Human", agent: "human" });

    rerenderScope(root);
  }

  function applyValidateEntity(root, mode = "self") {
    const target = currentDecisionTarget(root);
    if (!target) return;

    const entityType = getSelectionEntityType(target.type);
    const entityId = target.id;
    const result = applyValidationCascade(entityType, entityId, mode);

    addActivity(entityType, entityId, "review_validated", "", {
      applied: result.applied,
      skipped: result.skipped,
      mode,
      counts: result.counts
    }, { actor: "Human", agent: "human" });

    rerenderScope(root);
  }

  function applyIssueCloseOrReopen(nextStatus, root) {
    const target = currentDecisionTarget(root);
    if (!target) return;

    if (target.type === "sujet") {
      setDecision("sujet", target.id, nextStatus === "closed" ? "CLOSED" : "REOPENED", "", { actor: "Human", agent: "human" });
    } else {
      setDecision("situation", target.id, nextStatus === "closed" ? "CLOSED" : "REOPENED", "", { actor: "Human", agent: "human" });
    }

    rerenderScope(root);
  }

  function applyOptimisticSubjectIssueAction(subjectId, action) {
    const subject = getNestedSujet(subjectId);
    if (!subject) return null;

    const normalized = String(action || "");
    const previous = {
      status: subject.status,
      closure_reason: subject.closure_reason,
      closed_at: subject.closed_at,
      review_state: subject.review_state,
      raw: subject.raw && typeof subject.raw === "object"
        ? {
            status: subject.raw.status,
            closure_reason: subject.raw.closure_reason,
            closed_at: subject.raw.closed_at,
            review_state: subject.raw.review_state
          }
        : null
    };

    if (normalized === "issue:reopen") {
      subject.status = "open";
      subject.closure_reason = null;
      subject.closed_at = null;
      setDecision("sujet", subjectId, "REOPENED", "", { actor: "Human", agent: "human" });
      if (subject.raw && typeof subject.raw === "object") {
        subject.raw.status = "open";
        subject.raw.closure_reason = null;
        subject.raw.closed_at = null;
      }
      return previous;
    }

    if (normalized === "issue:close:realized") {
      subject.status = "closed";
      subject.closure_reason = "realized";
      subject.closed_at = nowIso();
      setDecision("sujet", subjectId, "CLOSED", "", { actor: "Human", agent: "human" });
      if (subject.raw && typeof subject.raw === "object") {
        subject.raw.status = "closed";
        subject.raw.closure_reason = "realized";
        subject.raw.closed_at = subject.closed_at;
      }
      return previous;
    }

    if (normalized === "issue:close:dismissed") {
      subject.status = "closed_invalid";
      subject.closure_reason = "non_pertinent";
      subject.closed_at = nowIso();
      setDecision("sujet", subjectId, "CLOSED", "", { actor: "Human", agent: "human" });
      setEntityReviewState("sujet", subjectId, "dismissed");
      if (subject.raw && typeof subject.raw === "object") {
        subject.raw.status = "closed_invalid";
        subject.raw.closure_reason = "non_pertinent";
        subject.raw.closed_at = subject.closed_at;
        subject.raw.review_state = "dismissed";
      }
      return previous;
    }

    if (normalized === "issue:close:duplicate") {
      subject.status = "closed_duplicate";
      subject.closure_reason = "duplicate";
      subject.closed_at = nowIso();
      setDecision("sujet", subjectId, "CLOSED", "", { actor: "Human", agent: "human" });
      setEntityReviewState("sujet", subjectId, "rejected");
      if (subject.raw && typeof subject.raw === "object") {
        subject.raw.status = "closed_duplicate";
        subject.raw.closure_reason = "duplicate";
        subject.raw.closed_at = subject.closed_at;
        subject.raw.review_state = "rejected";
      }
      return previous;
    }

    return previous;
  }

  function revertOptimisticSubjectIssueAction(subjectId, previous = null) {
    const subject = getNestedSujet(subjectId);
    if (!subject || !previous) return;

    subject.status = previous.status;
    subject.closure_reason = previous.closure_reason;
    subject.closed_at = previous.closed_at;
    if (subject.raw && typeof subject.raw === "object") {
      subject.raw.status = previous.raw?.status;
      subject.raw.closure_reason = previous.raw?.closure_reason;
      subject.raw.closed_at = previous.raw?.closed_at;
      subject.raw.review_state = previous.raw?.review_state;
    }
  }

  async function applyIssueStatusAction(root, action) {
    const normalized = String(action || "");
    if (!normalized) return;

    const target = currentDecisionTarget(root);
    const isSubjectTarget = target?.type === "sujet";
    let optimisticPrevious = null;

    if (isSubjectTarget) {
      const subject = getNestedSujet(target.id);
      if (!subject) return;

      optimisticPrevious = applyOptimisticSubjectIssueAction(target.id, normalized);
      rerenderScope(root);

      try {
        await persistSubjectIssueActionToSupabase(subject, normalized);
      } catch (error) {
        revertOptimisticSubjectIssueAction(target.id, optimisticPrevious);
        await reloadSubjectsFromSupabase(root, { rerender: true, updateModal: true }).catch(() => {
          rerenderScope(root);
        });
        console.warn("persistSubjectIssueActionToSupabase failed", error);
        showError(`Mise à jour Supabase impossible : ${String(error?.message || error || "Erreur inconnue")}`);
        return;
      }
    }

    if (normalized === "issue:reopen") {
      if (isSubjectTarget) {
        await reloadSubjectsFromSupabase(root, { rerender: true, updateModal: true });
        return;
      }
      applyIssueCloseOrReopen("open", root);
      return;
    }

    if (normalized === "issue:close:realized") {
      if (isSubjectTarget) {
        await reloadSubjectsFromSupabase(root, { rerender: true, updateModal: true });
        return;
      }
      applyIssueCloseOrReopen("closed", root);
      return;
    }

    if (normalized === "issue:close:dismissed") {
      if (!isSubjectTarget) {
        applyReviewStateChange(root, "dismissed");
        applyIssueCloseOrReopen("closed", root);
        return;
      }
      await reloadSubjectsFromSupabase(root, { rerender: true, updateModal: true });
      return;
    }

    if (normalized === "issue:close:duplicate") {
      if (!isSubjectTarget) {
        applyReviewStateChange(root, "rejected");
        applyIssueCloseOrReopen("closed", root);
        return;
      }
      await reloadSubjectsFromSupabase(root, { rerender: true, updateModal: true });
    }
  }

  return {
    setSujetKanbanStatus,
    setSubjectObjectiveIds,
    setSubjectSituationIds,
    toggleSubjectSituation,
    setSubjectLabels,
    toggleSubjectLabel,
    toggleSubjectObjective,
    setSubjectObjective,
    applyReviewStateChange,
    applyRestoreReviewState,
    applyValidateEntity,
    applyIssueStatusAction
  };
}
