import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

export function normalizeVerdict(verdict) {
  const v = String(verdict || "").trim().toUpperCase();
  if (!v) return "";
  if (v === "WARN") return "WARNING";
  if (v === "DEFAVORABLE") return "KO";
  if (v === "FAVORABLE") return "OK";
  return v;
}

export function normalizeReviewState(state) {
  const value = String(state || "").trim().toLowerCase();

  if (!value) return "pending";
  if (value === "approved") return "validated";
  if (value === "published" || value === "diffused" || value === "diffuse") return "published";
  if (value === "rejected") return "rejected";
  if (value === "dismissed") return "dismissed";
  if (value === "validated") return "validated";
  return "pending";
}

function verdictBadgeClass(verdict) {
  const v = normalizeVerdict(verdict) || "—";
  const safe = v.replace(/[^A-Z0-9_-]/g, "");

  if (["F", "D", "S", "HM", "PM", "SO"].includes(safe)) {
    return `verdict-badge verdict-${safe}`;
  }
  if (safe === "OK") return "verdict-badge verdict-F";
  if (safe === "KO") return "verdict-badge verdict-D";
  if (safe === "WARNING") return "verdict-badge verdict-S";

  return "verdict-badge";
}

function verdictDotClass(verdict) {
  const v = normalizeVerdict(verdict);

  if (v === "F" || v === "OK") return "v-dot v-dot--f";
  if (v === "S" || v === "WARNING") return "v-dot v-dot--s";
  if (v === "D" || v === "KO") return "v-dot v-dot--d";
  if (v === "HM") return "v-dot v-dot--hm";
  if (v === "PM") return "v-dot v-dot--pm";
  if (v === "SO") return "v-dot v-dot--so";

  return "v-dot";
}

export function renderStatusBadge({
  label = "",
  tone = "default",
  className = ""
} = {}) {
  const safeTone = String(tone || "default").toLowerCase();
  const toneClass = safeTone === "default" ? "badge" : `badge badge--${escapeHtml(safeTone)}`;
  const extraClass = className ? ` ${escapeHtml(className)}` : "";
  return `<span class="${toneClass}${extraClass}">${escapeHtml(label)}</span>`;
}

export function renderCountBadge(value = 0, options = {}) {
  const {
    className = "project-tabs__counter",
    ariaLabel
  } = options;

  const count = Number(value || 0);
  const safeClassName = escapeHtml(className);
  const safeAriaLabel = escapeHtml(ariaLabel || `${count} élément(s)`);

  return `<span class="${safeClassName}" aria-label="${safeAriaLabel}">${count}</span>`;
}

export function renderVerdictPill(verdict) {
  const label = normalizeVerdict(verdict) || "—";
  return `<span class="${verdictBadgeClass(verdict)}">${escapeHtml(label)}</span>`;
}

export function renderStateDot(state) {
  return `<span class="${verdictDotClass(state)}" aria-hidden="true"></span>`;
}

export function renderReviewStateIcon(
  state,
  {
    entityType = "",
    isPublished = false,
    hasChangesSincePublish = false,
    isSeen = false,
    className = ""
  } = {}
) {
  const normalized = normalizeReviewState(state);

  if ((isPublished && !hasChangesSincePublish) || normalized === "published") {
    return "";
  }

  let iconName = "dot-fill-pending";
  let toneClass = isSeen ? "review-state-icon--rejected" : "review-state-icon--pending";

  if (normalized === "validated") {
    iconName = "check";
    toneClass = "review-state-icon--validated";
  } else if (normalized === "rejected" || normalized === "dismissed") {
    iconName = "skip";
    toneClass = "review-state-icon--rejected";
  }

  const extraClass = className ? ` ${escapeHtml(className)}` : "";

  return `
    <span class="review-state-icon ${toneClass}${extraClass}" aria-hidden="true">
      ${svgIcon(iconName, { width: 16, height: 16 })}
    </span>
  `;
}
