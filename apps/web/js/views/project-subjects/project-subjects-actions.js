import { normalizeAssigneeIds } from "../../services/subject-assignees-service.js";
import { nomDeQuiParle } from "../../services/nom-de-qui-parle.js";

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
    persistSubjectIssueActionToSupabase,
    showError,
    getSubjectSidebarMeta,
    normalizeSubjectObjectiveIds,
    normalizeSubjectSituationIds,
    normalizeSubjectLabels,
    normalizeSubjectLabelKey,
    getSubjectLabelDefinition,
    getObjectives,
    addLabelToSubjectInSupabase,
    removeLabelFromSubjectInSupabase,
    addSubjectAssigneeInSupabase,
    removeSubjectAssigneeInSupabase,
    addSubjectToObjectiveInSupabase,
    removeSubjectFromObjectiveInSupabase,
    replaceSubjectSituationsInSupabase,
    setSubjectParentInSupabase,
    createBlockedByRelationInSupabase,
    deleteBlockedByRelationInSupabase,
    reorderSubjectChildrenInSupabase,
    rerenderPanels
  } = config;

  function isSituationGridDropdownDebugEnabled() {
    try {
      const storageValue = String(window.localStorage?.getItem("debug:situation-grid-dropdown") || "").trim().toLowerCase();
      const sessionValue = String(window.sessionStorage?.getItem("debug:situation-grid-dropdown") || "").trim().toLowerCase();
      return storageValue === "1" || storageValue === "true" || sessionValue === "1" || sessionValue === "true";
    } catch (_) {
      return false;
    }
  }

  function logSituationGridSupabaseMutation(payload = {}) {
    if (!isSituationGridDropdownDebugEnabled()) return;
    console.info("[situation-grid-dropdown] supabase-mutation", payload);
  }

  // Le nom sous lequel quelqu'un engage quelque chose. Il vit dans
  // `services/nom-de-qui-parle.js` parce que deux écrans le signent : la
  // fermeture d'un sujet, et la valeur qu'un sujet apporte. Deux constructions
  // du même nom finiraient par ne pas écrire le même (règle 10).
  function resolveDefaultHumanActorLabel() {
    return nomDeQuiParle(store?.user);
  }

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
        actor: options.actor || resolveDefaultHumanActorLabel(),
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

  function normalizeSubjectAssigneeIds(assigneeIds) {
    return normalizeAssigneeIds(assigneeIds);
  }

  function isDraftMetaTarget(subjectId) {
    return String(subjectId || "") === DRAFT_SUBJECT_ID;
  }

  function setSubjectAssigneeIds(subjectId, assigneeIds) {
    const subjectKey = String(subjectId || "");
    const nextIds = normalizeSubjectAssigneeIds(assigneeIds);
    if (subjectKey === DRAFT_SUBJECT_ID) {
      ensureViewUiState();
      store.situationsView.createSubjectForm.meta = {
        ...buildDefaultDraftSubjectMeta(),
        ...(store.situationsView.createSubjectForm.meta || {}),
        assignees: nextIds
      };
      return;
    }
    persistRunBucket((bucket) => {
      bucket.subjectMeta = bucket.subjectMeta && typeof bucket.subjectMeta === "object" ? bucket.subjectMeta : {};
      bucket.subjectMeta.sujet = bucket.subjectMeta.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
      const current = bucket.subjectMeta.sujet[subjectKey] && typeof bucket.subjectMeta.sujet[subjectKey] === "object" ? bucket.subjectMeta.sujet[subjectKey] : {};
      bucket.subjectMeta.sujet[subjectKey] = {
        ...current,
        assignees: nextIds
      };
    });
  }

  function syncSubjectAssigneeMap(subjectId, assigneeIds = []) {
    const raw = store.projectSubjectsView?.rawSubjectsResult;
    if (!raw || typeof raw !== "object") return;
    const subjectKey = String(subjectId || "");
    if (!subjectKey) return;
    raw.assigneePersonIdsBySubjectId = raw.assigneePersonIdsBySubjectId && typeof raw.assigneePersonIdsBySubjectId === "object"
      ? raw.assigneePersonIdsBySubjectId
      : {};
    raw.assigneePersonIdsBySubjectId[subjectKey] = normalizeSubjectAssigneeIds(assigneeIds);
    if (raw.subjectsById && typeof raw.subjectsById === "object" && raw.subjectsById[subjectKey]) {
      raw.subjectsById[subjectKey].assignee_person_id = raw.assigneePersonIdsBySubjectId[subjectKey][0] || null;
    }
  }

  async function toggleSubjectAssignee(subjectId, assigneeId, options = {}) {
    const subjectKey = String(subjectId || "");
    const assigneeKey = String(assigneeId || "").trim();
    if (!subjectKey || !assigneeKey) return false;
    const meta = getSubjectSidebarMeta(subjectKey);
    const currentIds = normalizeSubjectAssigneeIds(meta.assignees);
    const hasAssignee = currentIds.includes(assigneeKey);
    const nextIds = hasAssignee
      ? currentIds.filter((id) => id !== assigneeKey)
      : [...currentIds, assigneeKey];
    setSubjectAssigneeIds(subjectKey, nextIds);
    if (isDraftMetaTarget(subjectKey)) {
      if (!options.skipRerender) {
        if (options.root) rerenderScope(options.root);
        else rerenderPanels();
      }
      return true;
    }
    syncSubjectAssigneeMap(subjectKey, nextIds);

    if (!options.skipRerender) {
      if (options.root) rerenderScope(options.root);
      else rerenderPanels();
    }

    try {
      const action = hasAssignee ? "assignee:remove" : "assignee:add";
      const method = hasAssignee ? "DELETE" : "POST";
      const endpoint = "/rest/v1/subject_assignees";
      const payload = hasAssignee
        ? { subject_id: `eq.${subjectKey}`, person_id: `eq.${assigneeKey}` }
        : { subject_id: subjectKey, person_id: assigneeKey };
      logSituationGridSupabaseMutation({
        action,
        field: "assignees",
        subjectId: subjectKey,
        situationId: String(options.situationId || ""),
        value: assigneeKey,
        method,
        endpoint,
        payload
      });
      if (hasAssignee) await removeSubjectAssigneeInSupabase(subjectKey, assigneeKey);
      else await addSubjectAssigneeInSupabase(subjectKey, assigneeKey);
      return true;
    } catch (error) {
      setSubjectAssigneeIds(subjectKey, currentIds);
      syncSubjectAssigneeMap(subjectKey, currentIds);
      if (!options.skipRerender) {
        if (options.root) rerenderScope(options.root);
        else rerenderPanels();
      }
      console.warn("toggleSubjectAssignee failed", error);
      showError(`Mise à jour des assignés impossible : ${String(error?.message || error || "Erreur inconnue")}`);
      return false;
    }
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

  function syncSubjectParentMap(subjectId, parentSubjectId, options = {}) {
    const raw = store.projectSubjectsView?.rawSubjectsResult;
    if (!raw || typeof raw !== "object") return;
    const subjectKey = String(subjectId || "");
    if (!subjectKey) return;
    const parentKey = String(parentSubjectId || "").trim();
    raw.subjectsById = raw.subjectsById && typeof raw.subjectsById === "object" ? raw.subjectsById : {};
    if (!raw.subjectsById[subjectKey]) return;
    raw.subjectsById[subjectKey].parent_subject_id = parentKey || null;
    raw.subjectsById[subjectKey].parent_linked_at = options.parentLinkedAt || raw.subjectsById[subjectKey].parent_linked_at || null;
    raw.subjectsById[subjectKey].parent_child_order = Number.isFinite(Number(options.parentChildOrder))
      ? Number(options.parentChildOrder)
      : (parentKey ? raw.subjectsById[subjectKey].parent_child_order : null);
    if (raw.subjectsById[subjectKey].raw && typeof raw.subjectsById[subjectKey].raw === "object") {
      raw.subjectsById[subjectKey].raw.parent_subject_id = parentKey || null;
      raw.subjectsById[subjectKey].raw.parent_linked_at = raw.subjectsById[subjectKey].parent_linked_at;
      raw.subjectsById[subjectKey].raw.parent_child_order = raw.subjectsById[subjectKey].parent_child_order;
    }
  }

  async function setSubjectParent(subjectId, parentSubjectId, options = {}) {
    const subjectKey = String(subjectId || "").trim();
    if (!subjectKey) return false;
    const nextParentKey = String(parentSubjectId || "").trim();
    const subject = getNestedSujet(subjectKey);
    if (!subject) return false;
    const previousParent = String(subject.parent_subject_id || subject.parentSubjectId || subject.raw?.parent_subject_id || "").trim();
    if (previousParent === nextParentKey) return true;

    const nowIsoValue = nowIso();
    syncSubjectParentMap(subjectKey, nextParentKey, {
      parentLinkedAt: nextParentKey ? nowIsoValue : null
    });

    if (!options.skipRerender) {
      if (options.root) rerenderScope(options.root);
      else rerenderPanels();
    }

    try {
      const result = await setSubjectParentInSupabase(subjectKey, nextParentKey || null);
      syncSubjectParentMap(subjectKey, nextParentKey, {
        parentLinkedAt: result?.updatedRow?.parent_linked_at || (nextParentKey ? nowIsoValue : null),
        parentChildOrder: result?.updatedRow?.parent_child_order
      });
      return true;
    } catch (error) {
      syncSubjectParentMap(subjectKey, previousParent || null, {
        parentLinkedAt: subject.parent_linked_at || subject.raw?.parent_linked_at || null,
        parentChildOrder: subject.parent_child_order ?? subject.raw?.parent_child_order ?? null
      });
      if (!options.skipRerender) {
        if (options.root) rerenderScope(options.root);
        else rerenderPanels();
      }
      console.warn("setSubjectParent failed", error);
      showError(`Mise à jour du sujet parent impossible : ${String(error?.message || error || "Erreur inconnue")}`);
      return false;
    }
  }

  function syncBlockedByLinkLocally(sourceSubjectId, targetSubjectId, shouldExist) {
    const raw = store.projectSubjectsView?.rawSubjectsResult;
    if (!raw || typeof raw !== "object") return;
    const sourceKey = String(sourceSubjectId || "").trim();
    const targetKey = String(targetSubjectId || "").trim();
    if (!sourceKey || !targetKey) return;

    raw.linksBySubjectId = raw.linksBySubjectId && typeof raw.linksBySubjectId === "object"
      ? raw.linksBySubjectId
      : {};

    const sourceLinks = Array.isArray(raw.linksBySubjectId[sourceKey]) ? raw.linksBySubjectId[sourceKey] : [];
    const targetLinks = Array.isArray(raw.linksBySubjectId[targetKey]) ? raw.linksBySubjectId[targetKey] : [];

    const isSameLink = (link) => String(link?.link_type || "") === "blocked_by"
      && String(link?.source_subject_id || "") === sourceKey
      && String(link?.target_subject_id || "") === targetKey;

    const existing = sourceLinks.find(isSameLink) || targetLinks.find(isSameLink) || null;
    if (shouldExist) {
      const projectId = String(raw?.subjectsById?.[sourceKey]?.project_id || raw?.subjectsById?.[sourceKey]?.raw?.project_id || "").trim() || null;
      const nextLink = existing || {
        id: `${sourceKey}:${targetKey}:blocked_by`,
        project_id: projectId,
        source_subject_id: sourceKey,
        target_subject_id: targetKey,
        link_type: "blocked_by",
        created_at: nowIso()
      };
      if (!sourceLinks.some((link) => isSameLink(link))) sourceLinks.push(nextLink);
      if (!targetLinks.some((link) => isSameLink(link))) targetLinks.push(nextLink);
      raw.linksBySubjectId[sourceKey] = sourceLinks;
      raw.linksBySubjectId[targetKey] = targetLinks;
      return;
    }

    raw.linksBySubjectId[sourceKey] = sourceLinks.filter((link) => !isSameLink(link));
    raw.linksBySubjectId[targetKey] = targetLinks.filter((link) => !isSameLink(link));
  }

  async function toggleSubjectBlockedByRelation(subjectId, blockedBySubjectId, options = {}) {
    const sourceKey = String(subjectId || "").trim();
    const targetKey = String(blockedBySubjectId || "").trim();
    if (!sourceKey || !targetKey) return false;

    const raw = store.projectSubjectsView?.rawSubjectsResult;
    const links = Array.isArray(raw?.linksBySubjectId?.[sourceKey]) ? raw.linksBySubjectId[sourceKey] : [];
    const alreadyLinked = links.some((link) => String(link?.link_type || "") === "blocked_by"
      && String(link?.source_subject_id || "") === sourceKey
      && String(link?.target_subject_id || "") === targetKey);

    syncBlockedByLinkLocally(sourceKey, targetKey, !alreadyLinked);
    if (!options.skipRerender) {
      if (options.root) rerenderScope(options.root);
      else rerenderPanels();
    }

    try {
      if (alreadyLinked) await deleteBlockedByRelationInSupabase(sourceKey, targetKey);
      else await createBlockedByRelationInSupabase(sourceKey, targetKey);
      return true;
    } catch (error) {
      syncBlockedByLinkLocally(sourceKey, targetKey, alreadyLinked);
      if (!options.skipRerender) {
        if (options.root) rerenderScope(options.root);
        else rerenderPanels();
      }
      console.warn("toggleSubjectBlockedByRelation failed", error);
      showError(`Mise à jour de la relation « Est bloqué par » impossible : ${String(error?.message || error || "Erreur inconnue")}`);
      return false;
    }
  }

  async function toggleSubjectBlockingForRelation(subjectId, blockedSubjectId, options = {}) {
    const subjectKey = String(subjectId || "").trim();
    const blockedKey = String(blockedSubjectId || "").trim();
    if (!subjectKey || !blockedKey) return false;
    return toggleSubjectBlockedByRelation(blockedKey, subjectKey, options);
  }

  function applySubjectChildrenOrderLocally(parentSubjectId, orderedChildIds = []) {
    const raw = store.projectSubjectsView?.rawSubjectsResult;
    if (!raw || typeof raw !== "object") return;
    raw.subjectsById = raw.subjectsById && typeof raw.subjectsById === "object" ? raw.subjectsById : {};
    const parentKey = String(parentSubjectId || "");
    orderedChildIds.forEach((childId, index) => {
      const childKey = String(childId || "");
      const child = raw.subjectsById[childKey];
      if (!child) return;
      child.parent_subject_id = parentKey || null;
      child.parent_child_order = index + 1;
      child.parent_linked_at = child.parent_linked_at || child.raw?.parent_linked_at || child.updated_at || child.created_at || nowIso();
      if (child.raw && typeof child.raw === "object") {
        child.raw.parent_subject_id = child.parent_subject_id;
        child.raw.parent_child_order = child.parent_child_order;
        child.raw.parent_linked_at = child.parent_linked_at;
      }
    });
  }

  async function reorderSubjectChildren(parentSubjectId, orderedChildIds = [], options = {}) {
    const parentKey = String(parentSubjectId || "").trim();
    const nextOrderedChildIds = [...new Set((Array.isArray(orderedChildIds) ? orderedChildIds : []).map((value) => String(value || "").trim()).filter(Boolean))];
    if (!parentKey || !nextOrderedChildIds.length) return false;

    const raw = store.projectSubjectsView?.rawSubjectsResult;
    const previousOrderSnapshot = new Map();
    for (const childId of nextOrderedChildIds) {
      const child = raw?.subjectsById?.[childId];
      previousOrderSnapshot.set(childId, {
        parent_subject_id: child?.parent_subject_id ?? child?.raw?.parent_subject_id ?? null,
        parent_child_order: child?.parent_child_order ?? child?.raw?.parent_child_order ?? null,
        parent_linked_at: child?.parent_linked_at ?? child?.raw?.parent_linked_at ?? null
      });
    }

    applySubjectChildrenOrderLocally(parentKey, nextOrderedChildIds);
    if (!options.skipRerender) {
      if (options.root) rerenderScope(options.root);
      else rerenderPanels();
    }

    try {
      await reorderSubjectChildrenInSupabase(parentKey, nextOrderedChildIds);
      return true;
    } catch (error) {
      const snapshotEntries = Array.from(previousOrderSnapshot.entries());
      for (const [childId, snapshot] of snapshotEntries) {
        syncSubjectParentMap(childId, snapshot.parent_subject_id, {
          parentChildOrder: snapshot.parent_child_order,
          parentLinkedAt: snapshot.parent_linked_at
        });
      }
      if (!options.skipRerender) {
        if (options.root) rerenderScope(options.root);
        else rerenderPanels();
      }
      console.warn("reorderSubjectChildren failed", error);
      showError(`Réorganisation des sous-sujets impossible : ${String(error?.message || error || "Erreur inconnue")}`);
      return false;
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
    if (!isDraftMetaTarget(subjectKey)) {
      syncSubjectSituationMaps(subjectKey, situationKey, !wasLinked);
    }

    if (!options.skipRerender) {
      if (options.root) rerenderScope(options.root);
    }

    if (isDraftMetaTarget(subjectKey)) {
      return true;
    }

    try {
      await replaceSubjectSituationsInSupabase(subjectKey, nextIds);
      await loadSituationsForCurrentProject().catch(() => []);
      return true;
    } catch (error) {
      setSubjectSituationIds(subjectKey, meta.situationIds);
      syncSubjectSituationMaps(subjectKey, situationKey, wasLinked);
      if (!options.skipRerender) {
        if (options.root) rerenderScope(options.root);
      }
      console.warn("toggleSubjectSituation failed", error);
      showError(`Mise à jour Supabase impossible : ${String(error?.message || error || "Erreur inconnue")}`);
      return false;
    }
  }

  function setSubjectLabels(subjectId, labels) {
    const subjectKey = String(subjectId || "");
    const nextLabels = normalizeSubjectLabels(labels);
    if (!subjectKey) return;
    if (subjectKey !== DRAFT_SUBJECT_ID) {
      persistRunBucket((bucket) => {
        bucket.subjectMeta = bucket.subjectMeta && typeof bucket.subjectMeta === "object" ? bucket.subjectMeta : {};
        bucket.subjectMeta.sujet = bucket.subjectMeta.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
        const current = bucket.subjectMeta.sujet[subjectKey] && typeof bucket.subjectMeta.sujet[subjectKey] === "object"
          ? bucket.subjectMeta.sujet[subjectKey]
          : {};
        bucket.subjectMeta.sujet[subjectKey] = {
          ...current,
          labels: nextLabels
        };
      });
      return;
    }

    ensureViewUiState();
    store.situationsView.createSubjectForm.meta = {
      ...buildDefaultDraftSubjectMeta(),
      ...(store.situationsView.createSubjectForm.meta || {}),
      labels: nextLabels
    };
  }

  function syncSubjectLabelMaps(subjectId, labelId, shouldLink) {
    const raw = store.projectSubjectsView?.rawSubjectsResult;
    if (!raw || typeof raw !== "object") return;

    raw.labelIdsBySubjectId = raw.labelIdsBySubjectId && typeof raw.labelIdsBySubjectId === "object"
      ? raw.labelIdsBySubjectId
      : {};
    raw.subjectIdsByLabelId = raw.subjectIdsByLabelId && typeof raw.subjectIdsByLabelId === "object"
      ? raw.subjectIdsByLabelId
      : {};

    const subjectKey = String(subjectId || "");
    const labelKey = String(labelId || "");
    if (!subjectKey || !labelKey) return;

    const currentLabelIds = Array.isArray(raw.labelIdsBySubjectId[subjectKey])
      ? raw.labelIdsBySubjectId[subjectKey].map((value) => String(value || "")).filter(Boolean)
      : [];
    raw.labelIdsBySubjectId[subjectKey] = shouldLink
      ? [...new Set([...currentLabelIds, labelKey])]
      : currentLabelIds.filter((value) => value !== labelKey);

    const currentSubjectIds = Array.isArray(raw.subjectIdsByLabelId[labelKey])
      ? raw.subjectIdsByLabelId[labelKey].map((value) => String(value || "")).filter(Boolean)
      : [];
    raw.subjectIdsByLabelId[labelKey] = shouldLink
      ? [...new Set([...currentSubjectIds, subjectKey])]
      : currentSubjectIds.filter((value) => value !== subjectKey);
  }

  async function toggleSubjectLabel(subjectId, label, options = {}) {
    const subjectKey = String(subjectId || "");
    const labelValue = String(label || "").trim();
    const labelKey = normalizeSubjectLabelKey(labelValue);
    if (!subjectKey || !labelKey) return false;

    if (subjectKey === DRAFT_SUBJECT_ID) {
      const meta = getSubjectSidebarMeta(subjectKey);
      const previousLabels = Array.isArray(meta.labels) ? [...meta.labels] : [];
      const hasLabel = previousLabels.some((value) => normalizeSubjectLabelKey(value) === labelKey);
      const nextLabels = hasLabel
        ? previousLabels.filter((value) => normalizeSubjectLabelKey(value) !== labelKey)
        : [...previousLabels, labelValue];
      setSubjectLabels(subjectKey, nextLabels);
      if (!options.skipRerender) {
        if (options.root) rerenderScope(options.root);
        else rerenderPanels();
      }
      return true;
    }

    const labelDefinition = getSubjectLabelDefinition(labelValue);
    const labelId = String(labelDefinition?.id || "").trim();
    const displayLabel = String(
      labelDefinition?.label
      || labelDefinition?.name
      || labelDefinition?.label_key
      || labelDefinition?.key
      || labelValue
    ).trim();

    if (!labelId) {
      showError("Impossible de retrouver ce label dans les données chargées.");
      return false;
    }

    const meta = getSubjectSidebarMeta(subjectKey);
    const previousLabels = Array.isArray(meta.labels) ? [...meta.labels] : [];
    const hasLabel = previousLabels.some((value) => normalizeSubjectLabelKey(value) === labelKey);
    const nextLabels = hasLabel
      ? previousLabels.filter((value) => normalizeSubjectLabelKey(value) !== labelKey)
      : [...previousLabels, displayLabel];

    setSubjectLabels(subjectKey, nextLabels);
    syncSubjectLabelMaps(subjectKey, labelId, !hasLabel);

    if (!options.skipRerender) {
      if (options.root) rerenderScope(options.root);
      else rerenderPanels();
    }

    try {
      const action = hasLabel ? "label:remove" : "label:add";
      const method = hasLabel ? "DELETE" : "POST";
      const endpoint = "/rest/v1/subject_labels";
      const payload = hasLabel
        ? { subject_id: `eq.${subjectKey}`, label_id: `eq.${labelId}` }
        : { subject_id: subjectKey, label_id: labelId };
      logSituationGridSupabaseMutation({
        action,
        field: "labels",
        subjectId: subjectKey,
        situationId: String(options.situationId || ""),
        value: labelId,
        method,
        endpoint,
        payload
      });
      if (hasLabel) await removeLabelFromSubjectInSupabase(subjectKey, labelId);
      else await addLabelToSubjectInSupabase(subjectKey, labelId);
      return true;
    } catch (error) {
      setSubjectLabels(subjectKey, previousLabels);
      syncSubjectLabelMaps(subjectKey, labelId, hasLabel);

      if (!options.skipRerender) {
        if (options.root) rerenderScope(options.root);
        else rerenderPanels();
      }

      console.warn("toggleSubjectLabel failed", error);
      showError(`Mise à jour Supabase impossible : ${String(error?.message || error || "Erreur inconnue")}`);
      return false;
    }
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
    const nextIds = wasLinked ? [] : [objectiveKey];
    const removedObjectiveIds = previousIds.filter((id) => !nextIds.includes(id));
    const addedObjectiveIds = nextIds.filter((id) => !previousIds.includes(id));

    setSubjectObjectiveIds(subjectKey, nextIds);
    if (!isDraftMetaTarget(subjectKey)) {
      removedObjectiveIds.forEach((id) => syncSubjectObjectiveMaps(subjectKey, id, false));
      addedObjectiveIds.forEach((id) => syncSubjectObjectiveMaps(subjectKey, id, true));
    }

    if (!options.skipRerender) {
      if (options.root) rerenderScope(options.root);
      else rerenderPanels();
    }

    if (isDraftMetaTarget(subjectKey)) {
      return true;
    }

    try {
      const action = wasLinked ? "objective:remove" : "objective:add";
      const method = wasLinked ? "DELETE" : "POST";
      const endpoint = "/rest/v1/milestone_subjects";
      logSituationGridSupabaseMutation({
        action,
        field: "objectives",
        subjectId: subjectKey,
        situationId: String(options.situationId || ""),
        value: objectiveKey,
        method,
        endpoint,
        payload: wasLinked
          ? { milestone_id: `eq.${objectiveKey}`, subject_id: `eq.${subjectKey}` }
          : { milestone_id: objectiveKey, subject_id: subjectKey }
      });
      if (wasLinked) await removeSubjectFromObjectiveInSupabase(objectiveKey, subjectKey);
      else await addSubjectToObjectiveInSupabase(objectiveKey, subjectKey);
      return true;
    } catch (error) {
      setSubjectObjectiveIds(subjectKey, previousIds);
      removedObjectiveIds.forEach((id) => syncSubjectObjectiveMaps(subjectKey, id, true));
      addedObjectiveIds.forEach((id) => syncSubjectObjectiveMaps(subjectKey, id, false));
      if (!options.skipRerender) {
        if (options.root) rerenderScope(options.root);
        else rerenderPanels();
      }
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
      setEntityReviewState("sujet", subjectId, "pending");
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
      setEntityReviewState("sujet", subjectId, "pending");
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
    subject.review_state = previous.review_state;
    if (subject.raw && typeof subject.raw === "object") {
      subject.raw.status = previous.raw?.status;
      subject.raw.closure_reason = previous.raw?.closure_reason;
      subject.raw.closed_at = previous.raw?.closed_at;
      subject.raw.review_state = previous.raw?.review_state;
    }
  }

  /**
   * Ce qu'on vient de trancher devient une proposition, jamais une écriture.
   *
   * Le sujet est déjà fermé quand on arrive ici : c'était le geste, il a
   * réussi, et rien de ce qui suit ne doit le remettre en cause. Une
   * proposition qui échoue laisse un sujet fermé sans sa décision — c'est
   * l'état d'avant cette étape, et on le **dit** plutôt que de rouvrir le
   * sujet dans le dos de quelqu'un.
   *
   * On ne demande pas les zones : la portée d'une décision prise dans un fil de
   * sujet n'est presque jamais connue de celui qui ferme, et une question de
   * plus au moment de fermer ferait renoncer. Elle vaut partout jusqu'à ce
   * qu'on la restreigne dans la proposition.
   */
  /**
   * Les valeurs que ce sujet mettait en débat, lues au moment de fermer.
   *
   * Lues **ici** et pas gardées d'avant : entre l'ouverture de l'écran et la
   * fermeture, quelqu'un a pu confirmer ou retirer une arête, et un raisonnement
   * qui enregistrerait l'état d'il y a dix minutes serait faux pour toujours
   * (règle 6).
   *
   * Muette en cas d'échec : le raisonnement dira qu'il ne sait pas — ce qui est
   * exact — plutôt que de faire échouer une fermeture que l'utilisateur a
   * demandée.
   */
  async function ceQueLeSujetMettaitEnDebat(projectId, subjectId, lire) {
    try {
      const [{ listerLesLiens }, { listProjectAssertions }] = await Promise.all([
        import("../../services/point-porte-sur-supabase.js"),
        import("../../services/project-memory-supabase.js")
      ]);

      const [liens, assertions] = await Promise.all([
        listerLesLiens(projectId),
        listProjectAssertions(projectId)
      ]);
      if (liens === null || assertions === null) return [];

      return lire(subjectId, { liens, assertions });
    } catch {
      return [];
    }
  }

  /**
   * Les documents que ce sujet a regardés, lus au moment de fermer.
   *
   * Les messages **et** les pièces jointes : une pièce ne se juge pas sans son
   * message, puisque c'est lui qui dit si l'échange était privé. Sans les deux,
   * rien — et l'étape reste creuse, ce qui est exact.
   *
   * Et **le corpus**, pour ce que le fil cite sans l'avoir joint : « cf. l'étude
   * géotechnique » est la phrase ordinaire, et le document n'est presque jamais
   * en pièce jointe. Le corpus, lui, peut manquer sans que tout s'arrête : on
   * montre alors les seules pièces jointes, ce qui est ce qu'on faisait, et l'on
   * ne prétend pas que rien d'autre n'a été regardé.
   */
  async function ceQueLeSujetARegarde(subjectId) {
    try {
      const [
        { listerLesCommentairesDunPoint, listerLesPiecesJointesDunPoint },
        { ceQueLePointAExamine },
        { listerLeCorpus },
        { resolveCurrentBackendProjectId }
      ] = await Promise.all([
        import("../../services/subject-messages-supabase.js"),
        import("../../services/ce-que-le-point-a-examine.js"),
        import("../../services/corpus-du-projet-supabase.js"),
        import("../../services/project-supabase-sync.js")
      ]);

      const projectId = String(await resolveCurrentBackendProjectId() || "").trim();

      const [messages, piecesJointes, documents] = await Promise.all([
        listerLesCommentairesDunPoint(subjectId),
        listerLesPiecesJointesDunPoint(subjectId),
        projectId ? listerLeCorpus(projectId) : null
      ]);
      if (messages === null || piecesJointes === null) return [];

      const sujet = getNestedSujet(subjectId);

      return ceQueLePointAExamine({
        // Le titre et la description viennent avec : ce sont deux des trois
        // endroits où l'on cite un document, et les oublier ferait manquer la
        // moitié des citations.
        point: {
          id: subjectId,
          title: sujet?.title ?? sujet?.raw?.title,
          description: sujet?.raw?.description
        },
        messages,
        piecesJointes,
        // `null` — le corpus n'a pas été lu — donne `[]` : on montre ce qu'on
        // sait, et l'on ne dit nulle part que rien d'autre n'a été regardé.
        documents: documents ?? []
      });
    } catch {
      return [];
    }
  }

  /**
   * Ce que le projet a déjà raisonné à partir des mêmes valeurs que ce sujet.
   *
   * ## Pourquoi cette lecture-là, et pas une autre
   *
   * Les arêtes confirmées du sujet donnent son **départ** ; les raisonnements de
   * la mémoire qui partent des mêmes valeurs sont ceux qu'on a intérêt à relire
   * avant de trancher. Ce sont les noms qui se comparent, jamais les questions —
   * deux personnes n'écrivent jamais la même.
   *
   * Muette en cas d'échec : ne pas retrouver ce qu'on a déjà raisonné ne doit
   * pas empêcher de fermer un sujet. La fenêtre s'ouvrira sans ce rappel, ce qui
   * est ce qu'elle faisait jusqu'ici.
   */
  async function cequOnADejaRaisonne(subjectId) {
    try {
      const [
        { listerLesLiens },
        { listProjectAssertions },
        { resolveCurrentBackendProjectId },
        { ceQueCePointMetEnDebat },
        { raisonnementsPartisDeCesValeurs }
      ] = await Promise.all([
        import("../../services/point-porte-sur-supabase.js"),
        import("../../services/project-memory-supabase.js"),
        import("../../services/project-supabase-sync.js"),
        import("../../services/point-porte-sur.js"),
        import("../../services/raisonnements-qui-se-ressemblent.js")
      ]);

      const projectId = String(await resolveCurrentBackendProjectId() || "").trim();
      if (!projectId) return [];

      const [liens, assertions] = await Promise.all([
        listerLesLiens(projectId),
        listProjectAssertions(projectId)
      ]);
      if (liens === null || assertions === null) return [];

      const entrees = ceQueCePointMetEnDebat(subjectId, { liens, assertions })
        .map((assertion) => ({ sujet: String(assertion?.payload?.subject ?? "").trim() }));

      return raisonnementsPartisDeCesValeurs(entrees, assertions).map((ligne) => ({
        question: String(ligne?.payload?.raisonnement?.question ?? "").trim(),
        // Ce qui avait été retenu, et rien d'autre : c'est la réponse à « voici
        // comment on avait raisonné la dernière fois ».
        retenu: (ligne?.payload?.raisonnement?.produit ?? [])
          .map((entree) => [entree?.sujet, entree?.valeur].filter(Boolean).join(" = "))
          .filter(Boolean).join(" · "),
        // La date, et pas l'auteur : le nommer demanderait une lecture des
        // profils de plus, au moment précis où l'on retient quelqu'un devant une
        // fenêtre. La ligne complète se lit dans la Mémoire.
        quand: formatDateFr(ligne?.decided_at)
      }));
    } catch {
      return [];
    }
  }

  /**
   * Ce qu'ailleurs on a tranché en partant des mêmes valeurs.
   *
   * ## Pourquoi maintenant, et pas dans la Mémoire
   *
   * Dans la Mémoire on relit un raisonnement déjà versé : il est trop tard. Ici
   * on n'a pas encore écrit — c'est le seul moment où le référentiel peut
   * changer quelque chose.
   *
   * ## Pourquoi par le départ, et pas par la conclusion
   *
   * La conclusion est ce qu'on s'apprête à écrire : on ne l'a pas. Le départ, si
   * — ce sont les valeurs que le sujet met en question. « En partant de là,
   * ailleurs, on a tranché ceci » est donc la seule question posable avant.
   *
   * Muette en cas d'échec : ne pas joindre le référentiel ne doit pas empêcher
   * de fermer un sujet, et dire « personne ne fait autrement » sur une lecture
   * ratée serait pire que se taire (règle 5).
   */
  async function cequOnATrancheAilleurs(subjectId) {
    try {
      const [
        { listerLesLiens },
        { listProjectAssertions },
        { resolveCurrentBackendProjectId },
        { ceQueCePointMetEnDebat },
        { listerLesFormes },
        { ceQuAilleursOnEnTire, phraseDeCeQuAilleursOnEnTire }
      ] = await Promise.all([
        import("../../services/point-porte-sur-supabase.js"),
        import("../../services/project-memory-supabase.js"),
        import("../../services/project-supabase-sync.js"),
        import("../../services/point-porte-sur.js"),
        import("../../services/referentiel-des-formes-supabase.js"),
        import("../../services/referentiel-des-formes.js")
      ]);

      const projectId = String(await resolveCurrentBackendProjectId() || "").trim();
      if (!projectId) return "";

      const [liens, assertions, formes] = await Promise.all([
        listerLesLiens(projectId),
        listProjectAssertions(projectId),
        listerLesFormes()
      ]);
      if (liens === null || assertions === null || formes === null) return "";

      const entrees = ceQueCePointMetEnDebat(subjectId, { liens, assertions })
        .map((assertion) => String(assertion?.payload?.subject ?? "").trim());

      return phraseDeCeQuAilleursOnEnTire(ceQuAilleursOnEnTire(entrees, formes));
    } catch {
      return "";
    }
  }

  /**
   * Le brouillon que le copilote écrit en relisant le fil.
   *
   * ## Ce qui ne part pas
   *
   * La conversation avec le copilote. `matiereDuPoint` la refuse par
   * `messageLisible`, qui refuse aussi les messages effacés — une seconde copie
   * de cette règle finirait par ne plus dire la même chose que la première, et
   * c'est la copie oubliée qui laisserait fuir.
   *
   * ## Ce qui revient n'est rien de plus qu'un brouillon
   *
   * Il tombe dans les champs d'une fenêtre qu'un humain relit, et ce qui en sort
   * est une proposition que quelqu'un signera. Deux portes humaines avant la
   * mémoire.
   *
   * Muet en cas d'échec : la fenêtre s'ouvrira sans lui, ce qu'elle faisait
   * jusqu'ici. Sauf si le contrôle l'a **écarté** — cela se dit, sinon on croit
   * que le copilote n'a rien trouvé et on recommence.
   */
  async function brouillonDeFermeture(subjectId) {
    try {
      const [
        { matiereDuPoint },
        { demanderLeBrouillon },
        { listerLesCommentairesDunPoint },
        { resolveCurrentBackendProjectId }
      ] = await Promise.all([
        import("../../services/brouillon-de-fermeture.js"),
        import("../../services/brouillon-de-fermeture-supabase.js"),
        import("../../services/subject-messages-supabase.js"),
        import("../../services/project-supabase-sync.js")
      ]);

      const projectId = String(await resolveCurrentBackendProjectId() || "").trim();
      const point = getNestedSujet(subjectId);
      if (!projectId || !point) return { brouillon: null, dit: "" };

      const messages = await listerLesCommentairesDunPoint(subjectId);
      if (messages === null) return { brouillon: null, dit: "" };

      const matiere = matiereDuPoint(
        { id: subjectId, title: point?.title ?? point?.raw?.title, description: point?.raw?.description },
        messages
      );
      if (!matiere) return { brouillon: null, dit: "" };

      return await demanderLeBrouillon({ projectId, matiere });
    } catch {
      return { brouillon: null, dit: "" };
    }
  }

  /** La date, telle qu'on l'écrit dans cette fenêtre. */
  function formatDateFr(quand) {
    const lue = Date.parse(String(quand ?? ""));
    if (!Number.isFinite(lue)) return "";
    return new Date(lue).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  async function proposerLaDecisionDuSujet(subjectId, tranche) {
    try {
      const [
        { decisionVersable },
        { preparerUneProposition },
        { resolveCurrentBackendProjectId },
        { referenceDuPoint },
        { raisonnementVersable },
        { ceQueCePointMetEnDebat }
      ] = await Promise.all([
        import("../../services/decision-versement.js"),
        import("../../services/atelier-proposition.js"),
        import("../../services/project-supabase-sync.js"),
        import("../../services/point-a-tranche.js"),
        import("../../services/raisonnement-du-point.js"),
        import("../../services/point-porte-sur.js")
      ]);

      const projectId = String(await resolveCurrentBackendProjectId() || "").trim();
      if (!projectId) return;

      const sujet = getNestedSujet(subjectId);
      const quand = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      const par = resolveDefaultHumanActorLabel();
      const affirmations = decisionVersable({
        // Le sujet est **la question** : c'est ce sur quoi on a tranché, et c'est
        // par ce nom que la valeur retrouvera sa décision.
        sujet: tranche.question,
        retenu: tranche.retenu,
        question: tranche.question,
        ecartes: tranche.ecartes,
        motif: tranche.motif,
        // Le même nom que celui dont ce fichier signe déjà ses décisions : deux
        // lectures de l'utilisateur finiraient par ne plus s'accorder (règle 4).
        par,
        quand,
        atelier: `Sujet « ${String(sujet?.title ?? "").trim()} »`,
        // La forme de l'arête aval n'est plus écrite ici : elle appartient au
        // fichier qui la relit. Une forme inventée à l'écriture et redevinée à
        // la lecture est exactement ce qui finit par diverger — et c'est ce qui
        // était arrivé : la chaîne était écrite, et personne ne la lisait.
        reference: referenceDuPoint(subjectId)
      });
      if (!affirmations.length) return;

      // **Sur quoi le débat portait.** Le savoir était déjà là — les arêtes
      // amont, confirmées une par une — et le raisonnement s'écrivait quand
      // même en disant « on ne sait pas ». C'est l'étape qui manquait pour
      // qu'un raisonnement se relise, et plus tard se rapproche d'un autre :
      // ce sont ses **entrées**.
      //
      // Confirmées seulement. Une arête proposée est un rapprochement de mots
      // que personne n'a relu ; l'écrire ici enregistrerait une machine à la
      // place d'un humain (règle 1).
      //
      // Une lecture ratée n'empêche pas de fermer : le raisonnement dira alors
      // qu'il ne sait pas, ce qui est exact, plutôt que de retenir la décision.
      const porteSur = await ceQueLeSujetMettaitEnDebat(projectId, subjectId, ceQueCePointMetEnDebat);

      // **Ce qu'on a regardé.** Les documents versés dans la discussion : quand
      // on débat d'une profondeur de fondation, l'étude géotechnique est jointe
      // au fil, et c'est précisément ce qu'on est allé lire.
      //
      // Les pièces d'un échange avec le copilote n'entrent jamais — leur seul
      // nom de fichier trahirait ce qui s'est dit dans une conversation privée —
      // et le refus vit dans le service, pas dans la requête.
      const examine = await ceQueLeSujetARegarde(subjectId);

      // Et **par où l'on est passé**. Le raisonnement ne répète pas la valeur —
      // il porte la question, sur quoi le débat portait, ce qui a été tranché et
      // ce que cela pose. Ce qu'on ne sait toujours pas d'ici — ce qui a été
      // regardé — reste vide et **se dit** : une étape creuse nommée vaut mieux
      // qu'un graphe qui a l'air entier.
      const chemin = raisonnementVersable({
        point: { id: subjectId, title: sujet?.title },
        question: tranche.question,
        porteSur,
        examine,
        produites: affirmations,
        par,
        quand,
        atelier: `Sujet « ${String(sujet?.title ?? "").trim()} »`
      });

      const rendu = await preparerUneProposition({
        projectId,
        titre: `Décision — ${tranche.question}`,
        intro: "Ce qui a été tranché en fermant un sujet. La décision porte la question et les "
          + "possibles écartés ; la valeur, s'il y en a une, la cite. La troisième ligne est le "
          + "chemin : par où l'on est passé, et ce qu'on n'a pas noté en le parcourant.",
        affirmations: [...affirmations, ...chemin],
        zones: []
      });

      if (!rendu.ok) {
        showError(`Le sujet est fermé, mais la décision n'a pas pu être proposée : ${rendu.raison}`);
        return;
      }

      // On va où la signature se donne, et sur la proposition elle-même. Le
      // bouton disait « fermer **et proposer** » : la proposition est la moitié
      // du geste, et la laisser derrière soi sans rien dire la ferait oublier.
      store.pendingPropositionId = rendu.proposition.id;
      const projet = String(store.currentProjectId || "").trim();
      if (projet) window.location.hash = `#project/${projet}/propositions`;
    } catch (error) {
      console.warn("proposerLaDecisionDuSujet failed", error);
      showError("Le sujet est fermé, mais la décision n'a pas pu être proposée.");
    }
  }

  async function applyIssueStatusAction(root, action) {
    const normalized = String(action || "");
    if (!normalized) return;

    const target = currentDecisionTarget(root);
    const isSubjectTarget = target?.type === "sujet";
    let optimisticPrevious = null;
    let tranche = null;

    if (isSubjectTarget) {
      const subject = getNestedSujet(target.id);
      if (!subject) return;

      // Fermer un sujet est une décision. On demande donc ce qu'on a tranché —
      // **avant** de fermer, parce qu'après on est passé à autre chose.
      //
      // Seulement « fermé comme réalisé » : un sujet fermé comme non pertinent
      // ou comme doublon ne tranche rien du projet, il dit que ce fil n'avait
      // pas lieu d'être. Y poser la question ferait entrer en mémoire des
      // décisions sur l'outil plutôt que sur l'ouvrage.
      if (normalized === "issue:close:realized") {
        const { demanderCeQuOnATranche, SANS_DECISION } = await import("../ui/decision-du-sujet.js");
        // Les trois lectures se font ensemble : la fenêtre n'attend pas trois
        // fois, elle attend une fois. Et aucune ne peut faire échouer les
        // autres — chacune se tait toute seule.
        const [dejaVus, ailleurs, ecritParLeCopilote] = await Promise.all([
          cequOnADejaRaisonne(target.id),
          cequOnATrancheAilleurs(target.id),
          brouillonDeFermeture(target.id)
        ]);

        const reponse = await demanderCeQuOnATranche({
          titre: subject?.title ?? subject?.raw?.title,
          // **Avant d'écrire, ce qu'on a déjà raisonné.** Une fois la décision
          // écrite, il est trop tard pour en tenir compte.
          dejaVus,
          // Et ce qu'on a tranché ailleurs en partant des mêmes valeurs.
          ailleurs,
          // Le brouillon du copilote remplit les champs, et chacun porte sa
          // marque tant que personne n'y a touché.
          brouillon: ecritParLeCopilote.brouillon,
          refus: ecritParLeCopilote.dit
        });

        // Renoncer à la fenêtre, c'est renoncer à fermer : on n'a encore rien
        // fait, et fermer quand même serait agir sur un geste annulé.
        if (reponse === null) return;
        if (reponse !== SANS_DECISION) tranche = reponse;
      }

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
        // Le sujet est fermé — c'était le geste. La décision se **propose**
        // ensuite : elle n'entre en mémoire qu'après signature (règle 1), et
        // l'échouer ne doit pas remettre en cause une fermeture réussie.
        if (tranche) await proposerLaDecisionDuSujet(target.id, tranche);
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
    setSubjectAssigneeIds,
    toggleSubjectAssignee,
    toggleSubjectSituation,
    setSubjectParent,
    toggleSubjectBlockedByRelation,
    toggleSubjectBlockingForRelation,
    reorderSubjectChildren,
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
