import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader, clearProjectActiveScrollSource, debugProjectScrollPolicy } from "./project-shell-chrome.js";
import { getRunLogEntries, getRunMetrics } from "../services/project-automation.js";
import { syncProjectActionsFromSupabase } from "../services/project-supabase-sync.js";
import { svgIcon } from "../ui/icons.js";
import { store } from "../store.js";
import {
  renderDataTableEmptyState,
  renderDataTableHead,
  renderDataTableShell
} from "./ui/data-table-shell.js";
import { normalizePaginationState, paginateItems, renderPaginationControls } from "./ui/pagination.js";

function getRunSuccessIconSvg() {
  return svgIcon("check-circle-fill", {
    className: "octicon octicon-check-circle-fill",
    width: 16,
    height: 16,
    style: "margin-top:2px"
  });
}

function getRunAlertIconSvg() {
  return svgIcon("stop-alert", {
    className: "octicon octicon-stop",
    width: 16,
    height: 16,
    style: "margin-top:2px"
  });
}

function getRunPendingIconSvg() {
  return svgIcon("dot-fill-pending", {
    className: "octicon octicon-dot-fill",
    width: 16,
    height: 16,
    style: "margin-top:2px"
  });
}

function getRunStateIcon(entry) {
  const status = String(entry?.outcomeStatus || entry?.status || "").toLowerCase();

  if (status === "success") {
    return `
      <span class="workflow-runs__state-icon workflow-runs__state-icon--success" title="Exécution réussie">
        ${getRunSuccessIconSvg()}
      </span>
    `;
  }

  if (status === "error" || status === "cancelled" || status === "interrupted") {
    return `
      <span class="workflow-runs__state-icon workflow-runs__state-icon--alert" title="Exécution en anomalie">
        ${getRunAlertIconSvg()}
      </span>
    `;
  }

  if (status === "running" || status === "queued" || status === "pending") {
    return `
      <span class="workflow-runs__state-icon workflow-runs__state-icon--pending" title="Exécution en cours">
        ${getRunPendingIconSvg()}
      </span>
    `;
  }

  return `
    <span class="workflow-runs__state-icon workflow-runs__state-icon--neutral"></span>
  `;
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatDuration(value) {
  const ms = Number(value);

  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;

  const seconds = ms / 1000;
  if (seconds < 60) {
    return seconds < 10 ? `${seconds.toFixed(1)} s` : `${Math.round(seconds)} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} min ${remainingSeconds}s`
      : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function getRunStatusMeta(entry) {
  const lifecycleStatus = String(entry?.lifecycleStatus || entry?.status || "").toLowerCase();
  const outcomeStatus = String(entry?.outcomeStatus || "").toLowerCase();

  if (lifecycleStatus === "running") {
    return {
      label: "En cours",
      className: "workflow-status-pill workflow-status-pill--running"
    };
  }

  if (outcomeStatus === "success") {
    return {
      label: "Réussi",
      className: "workflow-status-pill workflow-status-pill--success"
    };
  }

  if (outcomeStatus === "error") {
    return {
      label: "Échec",
      className: "workflow-status-pill workflow-status-pill--error"
    };
  }

  return {
    label: lifecycleStatus === "completed" ? "Terminé" : (outcomeStatus || lifecycleStatus || "—"),
    className: "workflow-status-pill"
  };
}

function getTriggerLabel(entry) {
  if (entry.triggerLabel) return entry.triggerLabel;

  if (entry.triggerType === "document-upload") {
    return "Dépôt de document";
  }

  if (entry.triggerType === "manual") {
    return "Lancement manuel";
  }

  if (entry.triggerType === "automatic") {
    return "Déclenchement automatique";
  }

  // Une exécution causée par une fusion porte normalement le numéro de la
  // proposition ; sans lui, dire d'où elle vient reste plus utile que « — ».
  if (entry.triggerType === "proposition") {
    return "Fusion d'une proposition";
  }

  return "—";
}

function renderRunStatus(entry) {
  const meta = getRunStatusMeta(entry);
  return `<span class="${meta.className}">${escapeHtml(meta.label)}</span>`;
}



function getStepLabel(stepKey) {
  const labels = {
    georisques: "Géorisques",
    seismicZone: "Zone sismique",
    snowRegion: "Zone de neige",
    frostZone: "Zone de gel",
    climaticZone: "Zone climatique",
    thermalZone: "Zone thermique",
    acousticFacade: "Isolement acoustique de façade"
  };

  return labels[stepKey] || stepKey;
}

function getStepStatusMeta(status) {
  const normalized = String(status || "pending").toLowerCase();

  if (normalized === "success") {
    return { label: "Réussi", className: "workflow-status-pill workflow-status-pill--success" };
  }

  if (normalized === "error" || normalized === "failed") {
    return { label: "Échec", className: "workflow-status-pill workflow-status-pill--error" };
  }

  if (normalized === "running") {
    return { label: "En cours", className: "workflow-status-pill workflow-status-pill--running" };
  }

  return { label: "En attente", className: "workflow-status-pill" };
}

function getOrderedStepEntries(steps) {
  const preferredOrder = [
    "georisques",
    "snowRegion",
    "frostZone",
    "climaticZone",
    "thermalZone",
    "seismicZone",
    "acousticFacade"
  ];

  return Object.entries(steps || {}).sort(([a], [b]) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);
    const safeA = aIndex === -1 ? 999 : aIndex;
    const safeB = bIndex === -1 ? 999 : bIndex;
    if (safeA !== safeB) return safeA - safeB;
    return a.localeCompare(b, "fr");
  });
}

function getStepSummary(stepKey, step = {}) {
  if (stepKey === "georisques") {
    const parts = [];
    if (step.communeName) parts.push(step.communeName);
    if (step.codeInsee) parts.push(`INSEE ${step.codeInsee}`);
    if (Number.isFinite(step.datasetsCount)) parts.push(`${step.datasetsCount} jeu(x)`);
    if (Number.isFinite(step.successCount) && step.successCount > 0) parts.push(`${step.successCount} réussi(s)`);
    if (Number.isFinite(step.errorCount) && step.errorCount > 0) parts.push(`${step.errorCount} erreur(s)`);
    if (step.error) parts.push(step.error);
    return parts.join(" · ");
  }

  const parts = [];
  if (step.value) parts.push(String(step.value));
  if (step.source) parts.push(`source : ${step.source}`);
  if (step.error) parts.push(step.error);
  return parts.join(" · ");
}

function renderRunPipelineSteps(entry) {
  const steps = entry?.details?.steps;
  if (!steps || typeof steps !== "object") return "";

  const orderedSteps = getOrderedStepEntries(steps);
  if (!orderedSteps.length) return "";

  return `
    <div class="workflow-runs__meta" style="margin-top:8px;">
      <div style="font-weight:600; margin-bottom:6px; color: var(--fgColor-muted, #656d76);">Pipeline</div>
      <div style="display:grid; gap:6px;">
        ${orderedSteps.map(([stepKey, step]) => {
          const meta = getStepStatusMeta(step?.status);
          const summary = getStepSummary(stepKey, step);
          return `
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
              <span style="min-width:132px; font-weight:600;">${escapeHtml(getStepLabel(stepKey))}</span>
              <span class="${meta.className}">${escapeHtml(meta.label)}</span>
              ${summary ? `<span style="color: var(--fgColor-muted, #656d76);">${escapeHtml(summary)}</span>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}


function getRunHistoryIconSvg() {
  return svgIcon("history", {
    className: "octicon octicon-history",
    width: 16,
    height: 16,
    style: "vertical-align:text-bottom"
  });
}

function renderRunCountInline() {
  const metrics = getRunMetrics();
  const totalRuns = Number(metrics.totalRuns || 0);

  return `
    <span class="workflow-runs__head-count" title="${escapeHtml(`${totalRuns} run${totalRuns > 1 ? "s" : ""} journalisé${totalRuns > 1 ? "s" : ""}`)}">
      ${getRunHistoryIconSvg()}
      <span>${escapeHtml(String(totalRuns))}</span>
      <span>run${totalRuns > 1 ? "s" : ""}</span>
    </span>
  `;
}

function renderRunRows(entries) {
  return entries.map((entry) => {
    const actionMeta = entry.documentName
      ? `<div class="workflow-runs__meta mono">${escapeHtml(entry.documentName)}</div>`
      : (entry.summary
          ? `<div class="workflow-runs__meta">${escapeHtml(entry.summary)}</div>`
          : "");

    const triggerMeta = entry.triggerType
      ? `<div class="workflow-runs__meta">${escapeHtml(entry.triggerType)}</div>`
      : "";

    return `
      <div class="workflow-runs__row">
        <div class="workflow-runs__cell workflow-runs__cell--action">
          <div class="workflow-runs__title-row">
            ${getRunStateIcon(entry)}
            <button type="button" class="workflow-runs__title workflow-runs__title--link" data-run-open="${escapeHtml(
              entry.id || ""
            )}">${escapeHtml(entry.name || "Run")}</button>
          </div>
          ${actionMeta}
        </div>

        <div class="workflow-runs__cell">
          <div class="workflow-runs__text">${escapeHtml(getTriggerLabel(entry))}</div>
          ${triggerMeta}
        </div>

        <div class="workflow-runs__cell workflow-runs__cell--muted">
          ${escapeHtml(formatDateTime(entry.startedAt))}
        </div>

        <div class="workflow-runs__cell workflow-runs__cell--muted">
          ${escapeHtml(formatDuration(entry.durationMs))}
        </div>

        <div class="workflow-runs__cell workflow-runs__cell--status">
          ${renderRunStatus(entry)}
        </div>
      </div>
    `;
  }).join("");
}

function renderRunsTable() {
  const entries = getRunLogEntries();
  if (!store.projectActionsView || typeof store.projectActionsView !== "object") {
    store.projectActionsView = { pagination: { mode: "client", pageSize: 25, currentPage: 1 } };
  }
  const pagination = normalizePaginationState({
    totalItems: entries.length,
    pageSize: store.projectActionsView?.pagination?.pageSize,
    currentPage: store.projectActionsView?.pagination?.currentPage
  });
  store.projectActionsView.pagination = {
    ...(store.projectActionsView.pagination && typeof store.projectActionsView.pagination === "object"
      ? store.projectActionsView.pagination
      : {}),
    mode: "client",
    pageSize: pagination.pageSize,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    totalItems: pagination.totalItems
  };
  const paged = paginateItems(entries, pagination);

  const tableHtml = renderDataTableShell({
    className: "workflow-runs-table data-table-shell--document-scroll",
    gridTemplate: "minmax(280px,1.6fr) 220px 170px 120px 120px",
    headHtml: renderDataTableHead({
      columns: [
        {
          html: `<span class="workflow-runs__head-label">Action</span>${renderRunCountInline()}`,
          className: "workflow-runs__head-col workflow-runs__head-col--action"
        },
        "Déclencheur",
        "Date",
        "Durée",
        "Statut"
      ]
    }),
    bodyHtml: renderRunRows(paged.items),
    state: paged.items.length ? "ready" : "empty",
    emptyHtml: renderDataTableEmptyState({
      title: "Aucune action exécutée",
      description: "Lance une analyse ou un enrichissement manuel pour alimenter le journal d’exécution."
    })
  });
  return `${tableHtml}${renderPaginationControls(pagination, { entity: "actions" })}`;
}

/**
 * Le détail d'une exécution.
 *
 * Le journal a grossi parce que les actions racontent l'histoire du projet :
 * qui a fait quoi, quand, et ce que la machine en a tiré. Un tableau ne peut pas
 * porter tout cela sans devenir illisible — d'où deux niveaux, comme sur les
 * pages d'exécution de GitHub : une ligne par acte, et une page par acte.
 *
 * La page dit trois choses, dans cet ordre : **ce que c'était** (l'action, son
 * état, sa cause), **ce qu'elle a lu**, et **ce qu'il faut en retenir** — les
 * annotations, c'est-à-dire ce qui n'allait pas. Une exécution sans annotation
 * le dit aussi : « aucune » est une information, une section vide n'en est pas
 * une.
 */
function renderRunDetail(entry) {
  const meta = getRunStatusMeta(entry);
  const corpus = entry?.details?.corpus ?? null;

  const identite = [
    ["Déclencheur", getTriggerLabel(entry)],
    ["Lancée le", formatDateTime(entry.startedAt)],
    ["Terminée le", entry.endedAt ? formatDateTime(entry.endedAt) : "—"],
    ["Durée", formatDuration(entry.durationMs)],
    ["Objet", entry.documentName || "—"]
  ];

  const lecture = corpus
    ? [
        corpus.proposition ? ["Proposition", corpus.proposition] : null,
        ["Livrables relus", `${corpus.documentCount || 0}`],
        [
          "Avis suivis",
          `${corpus.trackedAvisCount || 0}${corpus.avisCount ? ` sur ${corpus.avisCount} relevés` : ""}`
        ],
        corpus.engineVersion || corpus.packs?.length
          ? ["Lu par", [corpus.engineVersion, ...(corpus.packs ?? [])].filter(Boolean).join(" · ")]
          : null
      ].filter(Boolean)
    : [];

  const annotations = [];
  if (corpus?.guardViolationCount > 0) {
    annotations.push({
      tone: "warn",
      text: `${corpus.guardViolationCount} violation(s) de garde`,
      note: "Le moteur a signalé des lectures qu'il ne sait pas garantir. Le détail se retrouve dans l'atelier."
    });
  }
  if (entry.summary && String(entry.outcomeStatus || "").toLowerCase() === "error") {
    annotations.push({ tone: "error", text: entry.summary, note: "" });
  }

  const documents = corpus?.documents ?? [];

  return `
    <section class="run-detail">
      <div class="run-detail__head">
        <button type="button" class="gh-btn gh-btn--sm" data-run-back>← Journal des actions</button>
        <div class="run-detail__title-row">
          ${getRunStateIcon(entry)}
          <h2 class="run-detail__title">${escapeHtml(entry.name || "Run")}</h2>
          <span class="${meta.className}">${escapeHtml(meta.label)}</span>
        </div>
        <p class="run-detail__lead">${escapeHtml(entry.summary || getTriggerLabel(entry))}</p>
      </div>

      ${renderRunSection("L'exécution", identite)}
      ${lecture.length > 0 ? renderRunSection("Ce que l'analyse a lu", lecture) : ""}
      ${renderRunPipelineSteps(entry)}

      <section class="run-section">
        <h3 class="run-section__title">Annotations</h3>
        ${
          annotations.length === 0
            ? `<p class="run-section__empty">Aucune. L'exécution n'a rien signalé qu'il faille relire.</p>`
            : annotations
                .map(
                  (annotation) => `
                    <div class="run-annotation run-annotation--${annotation.tone}">
                      <b>${escapeHtml(annotation.text)}</b>
                      ${annotation.note ? `<span>${escapeHtml(annotation.note)}</span>` : ""}
                    </div>
                  `
                )
                .join("")
        }
      </section>

      ${
        documents.length > 0
          ? `<section class="run-section">
               <h3 class="run-section__title">Livrables lus <span class="run-section__count">${documents.length}</span></h3>
               <ul class="run-files">
                 ${documents.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}
               </ul>
             </section>`
          : ""
      }
    </section>
  `;
}

function renderRunSection(titre, lignes = []) {
  if (lignes.length === 0) return "";

  return `
    <section class="run-section">
      <h3 class="run-section__title">${escapeHtml(titre)}</h3>
      <div class="run-rows">
        ${lignes
          .map(
            ([label, valeur]) => `
              <div class="run-row">
                <span class="run-row__label">${escapeHtml(label)}</span>
                <span class="run-row__value">${escapeHtml(String(valeur ?? "—"))}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function getOpenRun() {
  const openId = String(store.projectActionsView?.openRunId || "");
  if (!openId) return null;
  return getRunLogEntries().find((entry) => String(entry.id) === openId) ?? null;
}

function renderProjectActionsContent(root) {
  const open = getOpenRun();

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="settings-content settings-content--project-page" style="max-width:1216px;margin:0 auto;padding:24px 32px 40px;">
        ${open ? renderRunDetail(open) : renderRunsTable()}
      </div>
    </section>
  `;
}

export function renderProjectActions(root) {
  root.className = "project-shell__content";
  clearProjectActiveScrollSource();

  // Entrer dans l'onglet, c'est ouvrir le journal — jamais retomber sur
  // l'exécution qu'on lisait la dernière fois.
  if (store.projectActionsView && typeof store.projectActionsView === "object") {
    store.projectActionsView.openRunId = "";
  }

  setProjectViewHeader({
    contextLabel: "Actions",
    variant: "actions"
  });

  renderProjectActionsContent(root);
  root.onclick = (event) => {
    if (!store.projectActionsView || typeof store.projectActionsView !== "object") store.projectActionsView = {};

    // Ouvrir une exécution, et en revenir. Le journal reste où il était : on
    // reprend sa lecture là où on l'avait laissée, page comprise.
    const opener = event.target?.closest?.("[data-run-open]");
    if (opener) {
      event.preventDefault();
      store.projectActionsView.openRunId = opener.getAttribute("data-run-open") || "";
      renderProjectActionsContent(root);
      return;
    }

    if (event.target?.closest?.("[data-run-back]")) {
      event.preventDefault();
      store.projectActionsView.openRunId = "";
      renderProjectActionsContent(root);
      return;
    }

    const trigger = event.target?.closest?.('[data-pagination-entity="actions"][data-pagination-page]');
    if (!trigger) return;
    event.preventDefault();
    const nextPage = Math.max(1, Number.parseInt(trigger.getAttribute("data-pagination-page") || "1", 10) || 1);
    if (!store.projectActionsView || typeof store.projectActionsView !== "object") store.projectActionsView = {};
    if (!store.projectActionsView.pagination || typeof store.projectActionsView.pagination !== "object") {
      store.projectActionsView.pagination = { mode: "client", pageSize: 25, currentPage: 1 };
    }
    store.projectActionsView.pagination.currentPage = nextPage;
    renderProjectActionsContent(root);
  };
  debugProjectScrollPolicy("render-project-actions");

  syncProjectActionsFromSupabase({ force: true })
    .then(() => {
      if (!root?.isConnected) return;
      const entries = getRunLogEntries();
      const pagination = normalizePaginationState({
        totalItems: entries.length,
        pageSize: store.projectActionsView?.pagination?.pageSize,
        currentPage: store.projectActionsView?.pagination?.currentPage
      });
      if (!store.projectActionsView || typeof store.projectActionsView !== "object") {
        store.projectActionsView = { pagination: { mode: "client", pageSize: 25, currentPage: 1 } };
      }
      if (!store.projectActionsView.pagination || typeof store.projectActionsView.pagination !== "object") {
        store.projectActionsView.pagination = { mode: "client", pageSize: 25, currentPage: 1 };
      }
      store.projectActionsView.pagination.currentPage = pagination.currentPage;
      renderProjectActionsContent(root);
    })
    .catch((error) => {
      console.warn("syncProjectActionsFromSupabase failed", error);
    });
}
