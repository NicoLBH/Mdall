import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader, clearProjectActiveScrollSource, debugProjectScrollPolicy } from "./project-shell-chrome.js";
import { getRunLogEntries, getRunMetrics } from "../services/project-automation.js";
import { syncProjectActionsFromSupabase } from "../services/project-supabase-sync.js";
import { svgIcon } from "../ui/icons.js";
import { buildRunGraph, formatStepDuration } from "../services/run-workflow.js";
import { store } from "../store.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
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

/**
 * L'échec : un disque rouge barré d'une croix.
 *
 * L'octogone d'alerte disait « attention » ; ici il s'agit de dire « cela n'a
 * pas abouti ». Comme la colonne « Statut » disparaît, cette icône porte seule
 * l'information : elle doit se lire sans hésitation.
 */
function getRunAlertIconSvg() {
  return svgIcon("x-circle-fill", {
    className: "octicon octicon-x-circle-fill",
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

/**
 * Une ligne du journal : l'acte, sa cause, sa date et sa durée.
 *
 * Trois colonnes plutôt que cinq. Le déclencheur descend sous le titre, en gris,
 * parce que c'est un complément et non une donnée qu'on compare de ligne en
 * ligne. Et la colonne « Statut » disparaît : son icône est déjà en tête de la
 * ligne — un état dit deux fois n'est pas dit deux fois mieux, il occupe deux
 * fois la place.
 */
function renderRunRows(entries) {
  return entries.map((entry) => {
    const objet = entry.documentName
      ? `<span class="workflow-runs__object">${escapeHtml(entry.documentName)}</span>`
      : "";
    const cause = `<span class="workflow-runs__trigger">${escapeHtml(getTriggerLabel(entry))}</span>`;

    return `
      <div class="workflow-runs__row">
        <div class="workflow-runs__cell workflow-runs__cell--action">
          <div class="workflow-runs__title-row">
            ${getRunStateIcon(entry)}
            <button type="button" class="workflow-runs__title workflow-runs__title--link" data-run-open="${escapeHtml(
              entry.id || ""
            )}">${escapeHtml(entry.name || "Run")}</button>
          </div>
          <div class="workflow-runs__meta workflow-runs__subline">
            ${objet}${objet && cause ? `<span class="workflow-runs__dot">·</span>` : ""}${cause}
          </div>
        </div>

        <div class="workflow-runs__cell workflow-runs__cell--when">
          <span class="workflow-runs__when-line">
            <span class="workflow-runs__when-icon">${svgIcon("calendar", { className: "octicon" })}</span>
            ${escapeHtml(formatDateTime(entry.startedAt))}
          </span>
          <span class="workflow-runs__when-line">
            <span class="workflow-runs__when-icon">${svgIcon("stopwatch", { className: "octicon" })}</span>
            ${escapeHtml(formatDuration(entry.durationMs))}
          </span>
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
    gridTemplate: "minmax(320px,2fr) 220px",
    headHtml: renderDataTableHead({
      columns: [
        {
          html: `<span class="workflow-runs__head-label">Action</span>${renderRunCountInline()}`,
          className: "workflow-runs__head-col workflow-runs__head-col--action"
        },
        "Quand"
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
        <div class="run-detail__title-row">
          ${getRunStateIcon(entry)}
          <h2 class="run-detail__title">${escapeHtml(entry.name || "Run")}</h2>
          <span class="${meta.className}">${escapeHtml(meta.label)}</span>
        </div>
        <p class="run-detail__lead">${escapeHtml(entry.summary || getTriggerLabel(entry))}</p>
      </div>

      ${renderRunGraph(entry)}
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

/**
 * Le chemin d'une exécution, en boîtes reliées.
 *
 * Un enchaînement se comprend d'un coup d'œil là où une liste de chiffres
 * demande de le reconstruire : une décision cause une analyse, l'analyse lit un
 * corpus, le corpus produit des avis, les avis deviennent le suivi.
 *
 * Chaque boîte porte un chiffre réellement écrit en base, et sa durée quand
 * l'exécution l'a mesurée. Les étapes restent **sur une ligne** et débordent si
 * besoin : plier un enchaînement en colonnes lui fait perdre ce qu'il a de plus
 * lisible, sa direction. Le déroulé horizontal, lui, se fait à la souris.
 */
function renderRunGraph(entry) {
  const nodes = buildRunGraph(entry);
  if (nodes.length === 0) return "";

  return `
    <section class="run-section run-section--graph" data-run-graph-section>
      <div class="run-section__head run-section__head--graph">
        <h3 class="run-section__title run-section__title--graph">Le chemin de cette exécution</h3>
        <div class="run-graph__tools" data-run-graph-tools hidden>
          <button type="button" class="run-graph__tool" data-graph-zoom="out" aria-label="Réduire">
            ${svgIcon("minus", { className: "octicon" })}
          </button>
          <button type="button" class="run-graph__tool" data-graph-zoom="in" aria-label="Agrandir">
            ${svgIcon("plus", { className: "octicon" })}
          </button>
          <button type="button" class="run-graph__tool" data-graph-full aria-label="Plein écran">
            ${svgIcon("screen-full", { className: "octicon" })}
          </button>
        </div>
      </div>

      <div class="run-graph" data-run-graph-viewport>
        <div class="run-graph__canvas" data-run-graph-canvas>
          ${nodes
            .map(
              (node, index) => `
                ${index > 0 ? `<span class="run-graph__link" aria-hidden="true"></span>` : ""}
                <div class="run-graph__node run-graph__node--${escapeHtml(node.tone)}">
                  <span class="run-graph__head">
                    <span class="run-graph__icon">${svgIcon(node.icon, { className: "octicon" })}</span>
                    <span class="run-graph__label">${escapeHtml(node.label)}</span>
                  </span>
                  <span class="run-graph__detail">${escapeHtml(node.detail)}</span>
                  ${
                    node.duration === null
                      ? ""
                      : `<span class="run-graph__duration">${escapeHtml(formatStepDuration(node.duration))}</span>`
                  }
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

/**
 * Les commandes du graphe, quand il déborde.
 *
 * Elles n'apparaissent que si elles servent : un bouton de zoom sur un dessin
 * qui tient déjà tout entier n'est qu'un bouton de plus à ignorer.
 */
function bindRunGraph(root) {
  const section = root.querySelector("[data-run-graph-section]");
  const viewport = root.querySelector("[data-run-graph-viewport]");
  const canvas = root.querySelector("[data-run-graph-canvas]");
  const tools = root.querySelector("[data-run-graph-tools]");
  if (!section || !viewport || !canvas || !tools) return;

  let zoom = 1;

  const sync = () => {
    canvas.style.setProperty("--run-graph-zoom", String(zoom));
    // `scrollWidth > clientWidth` dit exactement ce qu'on veut savoir : le
    // dessin ne tient pas, donc les commandes ont une utilité.
    tools.hidden = viewport.scrollWidth <= viewport.clientWidth + 1 && zoom === 1;
  };

  for (const bouton of tools.querySelectorAll("[data-graph-zoom]")) {
    bouton.addEventListener("click", () => {
      const pas = bouton.getAttribute("data-graph-zoom") === "in" ? 0.15 : -0.15;
      zoom = Math.min(1.6, Math.max(0.5, Math.round((zoom + pas) * 100) / 100));
      sync();
    });
  }

  tools.querySelector("[data-graph-full]")?.addEventListener("click", () => {
    section.classList.toggle("run-section--fullscreen");
    sync();
  });

  sync();
  // Le débordement dépend de la largeur disponible : ce qui tenait à l'ouverture
  // peut ne plus tenir après un redimensionnement.
  window.addEventListener("resize", sync, { passive: true });
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
      <div class="settings-content project-page-shell actions-shell">
        ${open ? renderRunDetail(open) : renderRunsTable()}
      </div>
    </section>
  `;

  if (open) bindRunGraph(root);
}

/**
 * Re-cliquer l'onglet « Actions » revient au journal.
 *
 * Le même geste que pour les sujets et les propositions : l'onglet ramène chez
 * lui, et c'est pour cela qu'il n'y a plus de bouton de retour dans le détail.
 * Le lien de l'onglet actif ne change pas l'adresse, donc aucun `hashchange`
 * n'a lieu : cet événement est le seul signal disponible.
 *
 * L'écran est reconstruit à chaque navigation ; l'écouteur lit donc l'écran
 * monté, jamais celui qu'il avait sous la main le jour où il a été posé.
 */
let tabResetBound = false;
let mountedRoot = null;

function bindTabReset() {
  if (tabResetBound) return;
  tabResetBound = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
    if (String(event?.detail?.tabId || "") !== "actions") return;
    if (!mountedRoot?.isConnected) return;
    if (!store.projectActionsView?.openRunId) return;

    store.projectActionsView.openRunId = "";
    renderProjectActionsContent(mountedRoot);
  });
}

export function renderProjectActions(root) {
  root.className = "project-shell__content";
  clearProjectActiveScrollSource();
  mountedRoot = root;
  bindTabReset();

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
