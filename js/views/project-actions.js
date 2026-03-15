import { escapeHtml } from "../utils/escape-html.js";
import { renderDoctrinePage } from "./project-doctrine-page.js";
import {
  getRunLogEntries
} from "../services/project-automation.js";
import {
  renderDataTableEmptyState,
  renderDataTableHead,
  renderDataTableShell
} from "./ui/data-table-shell.js";

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

function getRunStatusMeta(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "running") {
    return {
      label: "En cours",
      className: "workflow-status-pill workflow-status-pill--running"
    };
  }

  if (normalized === "success") {
    return {
      label: "Réussi",
      className: "workflow-status-pill workflow-status-pill--success"
    };
  }

  if (normalized === "error") {
    return {
      label: "Échec",
      className: "workflow-status-pill workflow-status-pill--error"
    };
  }

  return {
    label: normalized || "—",
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

  return "—";
}

function renderRunStatus(entry) {
  const meta = getRunStatusMeta(entry.status);
  return `<span class="${meta.className}">${escapeHtml(meta.label)}</span>`;
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
          <div class="workflow-runs__title">${escapeHtml(entry.name || "Run")}</div>
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

  return renderDataTableShell({
    className: "workflow-runs-table",
    gridTemplate: "minmax(280px,1.6fr) 220px 170px 120px 120px",
    headHtml: renderDataTableHead({
      columns: [
        "Action",
        "Déclencheur",
        "Date",
        "Durée",
        "Statut"
      ]
    }),
    bodyHtml: renderRunRows(entries),
    state: entries.length ? "ready" : "empty",
    emptyHtml: renderDataTableEmptyState({
      title: "Aucune action exécutée",
      description: "Lance une analyse manuelle depuis l’onglet Situations pour alimenter le journal d’exécution."
    })
  });
}

function renderRunsSection() {
  return `
    <section class="settings-section" id="workflows-runs">
      <h3>Exécutions et journal</h3>
      <p class="settings-lead">
        Cet espace devient le journal opératoire du projet. Il affiche les actions réellement exécutées par Rapsobot, leur déclencheur, leur date, leur durée et leur statut.
      </p>

      <div class="settings-card">
        <div class="settings-card__head">
          <div>
            <h4>Journal des actions</h4>
            <p>
              Première implémentation locale du run log partagé. Cette vue prépare la future traçabilité serveur, les validations humaines et les automatisations multi-documents.
            </p>
          </div>
          <span class="settings-badge mono">RUN LOG</span>
        </div>

        ${renderRunsTable()}
      </div>
    </section>
  `;
}

export function renderProjectWorkflows(root) {
  renderDoctrinePage(root, {
    contextLabel: "Actions",
    variant: "workflows",
    scrollId: "projectWorkflowsScroll",
    navTitle: "Actions",
    pageTitle: "Actions",
    pageIntro: "Cet onglet transpose GitHub Actions au projet de construction. Il montre les actions exécutées, leurs déclencheurs et leur traçabilité, sans jamais remplacer la validation humaine métier.",
    navItems: [
      { id: "workflows-runs", label: "Exécutions" },
      { id: "workflows-bibliotheque", label: "Bibliothèque" },
      { id: "workflows-approbations", label: "Approbations" },
      { id: "workflows-checks", label: "Checks" }
    ],
    topHtml: renderRunsSection(),
    sections: [
      {
        id: "workflows-bibliotheque",
        title: "Bibliothèque de workflows",
        lead: "La page affichera les automatismes disponibles pour le projet : diffusion, mise à jour de statuts, notifications, contrôles de complétude et déclenchement de revues ciblées.",
        blocks: [
          {
            title: "Exemples de workflows affichés",
            description: "Chaque ligne décrira le déclencheur, les prérequis et l'effet métier attendu.",
            items: [
              "Après approbation d'une proposition : intégrer la pièce, historiser l'ancienne version, notifier les intervenants.",
              "Avant jalon : alerter si des sujets bloquants restent ouverts.",
              "Sur changement de produit sensible : demander une revue sécurité/réglementaire complémentaire.",
              "Après clôture de sujet : vérifier qu'une preuve est bien associée."
            ],
            actions: [
              { label: "Nouveau workflow" },
              { label: "Voir déclencheurs" }
            ]
          }
        ]
      },
      {
        id: "workflows-approbations",
        title: "Étapes d'approbation humaine",
        lead: "La différence essentielle avec l'informatique est ici : le workflow prépare et trace, mais la validation reste portée par les acteurs compétents.",
        blocks: [
          {
            title: "Gates humains affichés",
            description: "Les cartes d'approbation expliqueront quels accords seront requis selon le type de changement.",
            items: [
              "Validation MOE ou architecte.",
              "Avis CT sur l'incidence réglementaire ou technique.",
              "Arbitrage MOA si impact coût, programme ou planning.",
              "Visa entreprise / BET si impact exécution."
            ],
            actions: [
              { label: "Voir validations requises" }
            ]
          }
        ]
      },
      {
        id: "workflows-checks",
        title: "Checks automatiques",
        lead: "Les checks jouent le rôle de garde-fous procéduraux : complétude, cohérence de nomenclature, présence d'impacts, rattachement à un sujet ou à un document de référence.",
        blocks: [
          {
            title: "Vérifications visibles",
            description: "Chaque check doit être explicite pour être compris et auditable.",
            items: [
              "Présence des champs obligatoires.",
              "Présence des pièces jointes minimales.",
              "Lien avec documents et sujets concernés.",
              "Présence d'une justification de changement.",
              "Présence des relecteurs attendus selon la nature de la proposition."
            ]
          }
        ]
      }
    ]
  });
}
