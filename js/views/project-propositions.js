import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import { svgIcon } from "../ui/icons.js";
import { getProjectProposals, ensureProjectProposalsState } from "../services/project-proposals.js";
import {
  renderDataTableEmptyState,
  renderDataTableHead,
  renderDataTableShell
} from "./ui/data-table-shell.js";

function getProposalIconSvg() {
  return svgIcon("git-pull-request", {
    className: "octicon octicon-git-pull-request",
    width: 16,
    height: 16
  });
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

function getStatusMeta(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "open") {
    return {
      label: "Open",
      className: "workflow-status-pill workflow-status-pill--success"
    };
  }

  if (normalized === "merged") {
    return {
      label: "Merged",
      className: "workflow-status-pill"
    };
  }

  if (normalized === "rejected") {
    return {
      label: "Rejected",
      className: "workflow-status-pill workflow-status-pill--error"
    };
  }

  return {
    label: normalized || "—",
    className: "workflow-status-pill"
  };
}

function renderProposalStatus(proposal) {
  const meta = getStatusMeta(proposal.status);
  return `<span class="${meta.className}">${escapeHtml(meta.label)}</span>`;
}

function renderProposalRows(entries) {
  return entries.map((proposal) => `
    <div class="workflow-runs__row workflow-runs__row--proposal">
      <div class="workflow-runs__cell workflow-runs__cell--action">
        <div class="workflow-runs__title-row">
          <span class="workflow-runs__state-icon workflow-runs__state-icon--proposal">
            ${getProposalIconSvg()}
          </span>
          <span class="workflow-runs__title workflow-runs__title--strong">
            ${escapeHtml(proposal.title || "Proposition")}
          </span>
        </div>
        <div class="workflow-runs__meta">${escapeHtml(proposal.fileName || "Fichier")}</div>
      </div>

      <div class="workflow-runs__cell">
        <div class="workflow-runs__text">Demande de visa</div>
        <div class="workflow-runs__meta">${proposal.needsVisa ? "Visa requis" : "Sans visa"}</div>
      </div>

      <div class="workflow-runs__cell workflow-runs__cell--muted">
        ${escapeHtml(formatDateTime(proposal.createdAt))}
      </div>

      <div class="workflow-runs__cell workflow-runs__cell--status">
        ${renderProposalStatus(proposal)}
      </div>
    </div>
  `).join("");
}

function renderProposalsTable() {
  const entries = getProjectProposals();

  return renderDataTableShell({
    className: "workflow-runs-table workflow-runs-table--proposals",
    gridTemplate: "minmax(340px,1.8fr) 220px 170px 120px",
    headHtml: renderDataTableHead({
      columns: [
        "Proposition",
        "Type",
        "Créée le",
        "Statut"
      ]
    }),
    bodyHtml: renderProposalRows(entries),
    state: entries.length ? "ready" : "empty",
    emptyHtml: renderDataTableEmptyState({
      title: "Aucune proposition enregistrée",
      description: "Crée une proposition avec demande de visa depuis l’onglet Documents pour alimenter ce tableau."
    })
  });
}

export function renderProjectPropositions(root) {
  ensureProjectProposalsState();

  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Propositions",
    variant: "propositions"
  });

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectPropositionsScroll">
        <div class="settings-content" style="max-width:1216px;margin:0 auto;padding:24px 32px 40px;">
          ${renderProposalsTable()}
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById("projectPropositionsScroll"));
}
