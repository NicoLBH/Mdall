function defaultFirstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function normalizeId(value) {
  return String(value || "").trim();
}

export function readDeltaEntries(payload = {}, key = "added", firstNonEmpty = defaultFirstNonEmpty) {
  const list = payload?.delta?.[key];
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => firstNonEmpty(entry?.label, entry?.title, entry?.name, entry?.id))
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export function summarizeCollectionChange(payload = {}, entityLabel = "élément", firstNonEmpty = defaultFirstNonEmpty) {
  const added = readDeltaEntries(payload, "added", firstNonEmpty);
  const removed = readDeltaEntries(payload, "removed", firstNonEmpty);
  if (added.length === 1 && !removed.length) return `a ajouté ${added[0]}`;
  if (removed.length === 1 && !added.length) return `a retiré ${removed[0]}`;
  if (added.length || removed.length) {
    const parts = [];
    if (added.length) parts.push(`+${added.length}`);
    if (removed.length) parts.push(`-${removed.length}`);
    return `a mis à jour (${parts.join(" / ")} ${entityLabel}${added.length + removed.length > 1 ? "s" : ""})`;
  }
  return "";
}

export const BUSINESS_ACTIVITY_CONFIG = {
  subject_title_updated: { icon: "pencil", tone: "business-edit", verb: "a modifié le titre" },
  subject_description_updated: { icon: "note", tone: "business-edit", verb: "a modifié la description" },
  subject_assignees_changed: {
    icon: "person",
    tone: "business-people",
    verb: "a ajouté un assigné",
    summarize: (payload, firstNonEmpty) => summarizeCollectionChange(payload, "assigné", firstNonEmpty)
  },
  subject_labels_changed: {
    icon: "tag",
    tone: "business-labels",
    verb: "a mis à jour les labels",
    summarize: (payload, firstNonEmpty) => summarizeCollectionChange(payload, "label", firstNonEmpty)
  },
  subject_situations_changed: {
    icon: "project",
    tone: "business-rel",
    verb: "a mis à jour les situations",
    summarize: (payload, firstNonEmpty) => summarizeCollectionChange(payload, "situation", firstNonEmpty)
  },
  subject_objectives_changed: {
    icon: "goal",
    tone: "business-rel",
    verb: "a mis à jour les objectifs",
    summarize: (payload, firstNonEmpty) => summarizeCollectionChange(payload, "objectif", firstNonEmpty)
  },
  subject_parent_added: { icon: "arrow-up", tone: "business-rel", verb: "a ajouté un parent" },
  subject_parent_removed: { icon: "arrow-up", tone: "business-rel", verb: "a retiré un parent" },
  subject_child_added: { icon: "arrow-down", tone: "business-rel", verb: "a ajouté un sous-sujet" },
  subject_child_removed: { icon: "arrow-down", tone: "business-rel", verb: "a retiré un sous-sujet" },
  subject_blocked_by_added: { icon: "blocked", tone: "business-alert", verb: "a ajouté un blocage entrant" },
  subject_blocked_by_removed: { icon: "blocked", tone: "business-alert", verb: "a retiré un blocage entrant" },
  subject_blocking_for_added: { icon: "blocked", tone: "business-alert", verb: "a ajouté un blocage sortant" },
  subject_blocking_for_removed: { icon: "blocked", tone: "business-alert", verb: "a retiré un blocage sortant" },
  subject_closed: { icon: "check-circle", tone: "business-alert", verb: "a fermé le sujet" },
  subject_reopened: { icon: "issue-reopened", tone: "business-open", verb: "a rouvert le sujet" }
};

export function getBusinessActivityAppearance(eventType = "") {
  const normalized = String(eventType || "").toLowerCase();
  return BUSINESS_ACTIVITY_CONFIG[normalized] || {
    icon: "history",
    tone: "business-neutral",
    verb: "a mis à jour le sujet"
  };
}

export function buildBusinessActivitySummary({ payload = {}, appearance = null, fallbackMessage = "", firstNonEmpty = defaultFirstNonEmpty } = {}) {
  const summaryFromPayload = firstNonEmpty(
    payload?.display?.result_label,
    payload?.result_label
  );
  const summaryFromConfig = typeof appearance?.summarize === "function"
    ? String(appearance.summarize(payload, firstNonEmpty) || "").trim()
    : "";
  return firstNonEmpty(summaryFromPayload, summaryFromConfig, fallbackMessage, "a mis à jour le sujet");
}

export function mapBusinessEventRowToThreadActivity(row = {}, { firstNonEmpty = defaultFirstNonEmpty, nowIso = () => new Date().toISOString() } = {}) {
  const eventType = String(row.event_type || "");
  const eventPayload = row.event_payload && typeof row.event_payload === "object" ? row.event_payload : {};
  const resultLabel = firstNonEmpty(
    eventPayload?.display?.result_label,
    eventPayload?.result_label,
    row?.timeline_description,
    row?.description,
    row?.timeline_title,
    row?.title,
    "a effectué une action métier"
  );
  return {
    ts: firstNonEmpty(row.created_at, nowIso()),
    entity_type: "sujet",
    entity_id: normalizeId(row.subject_id),
    type: "ACTIVITY",
    kind: String(eventType || "").toLowerCase(),
    actor: firstNonEmpty(row.actor_label, "Utilisateur"),
    agent: "human",
    message: String(resultLabel || ""),
    meta: {
      source: "subject_history",
      id: normalizeId(row.id),
      event_type: eventType,
      event_payload: eventPayload
    }
  };
}
