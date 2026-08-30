/**
 * Les propositions d'un projet — Onglet Propositions.
 *
 * Une proposition est un changement du corpus soumis à jugement : on y dépose
 * des documents, on lit ce qu'ils impliqueraient, on tranche, on fusionne.
 * L'écran est celui d'une liste de pull requests, et c'est délibéré : le geste
 * est le même, et il est déjà connu de qui l'a pratiqué ailleurs.
 *
 * Ce que cette vue ne fait pas encore : lire une proposition. La revue — le
 * diff des documents, des rattachements et des avis — vient à l'étape suivante.
 * Construire la liste avant de savoir lire ce qu'elle liste est délibéré : une
 * proposition qu'on peut créer et retrouver est vérifiable à la main, un écran
 * de revue bâti sur un objet qui n'existe pas ne l'est pas.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { clearProjectActiveScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { PROPOSITION } from "../services/proposition-state.js";

/** Ce que l'écran tient entre deux rendus. */
const view = {
  /** "open" | "closed" — le filtre, comme sur GitHub. */
  filter: PROPOSITION.OPEN,
  /** `null` tant qu'on n'a pas répondu, `[]` quand il n'y a rien. */
  propositions: null,
  /** Vrai si la base n'a pas répondu : ne rien savoir n'est pas savoir qu'il n'y a rien. */
  unreachable: false,
  loading: true
};

/** Le nombre d'ouvertes, pour la pastille de l'onglet. */
export function getOpenPropositionCount() {
  return (view.propositions ?? []).filter((entry) => entry.status === PROPOSITION.OPEN).length;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function renderFilters(counts) {
  const tab = (id, label, count) => `
    <button
      type="button"
      class="propositions-filter${view.filter === id ? " is-active" : ""}"
      data-propositions-filter="${id}"
      aria-pressed="${view.filter === id ? "true" : "false"}"
    >
      ${svgIcon(id === PROPOSITION.OPEN ? "git-pull-request" : "check-circle-fill", { className: "octicon" })}
      <span>${count} ${label}</span>
    </button>
  `;

  return `
    <div class="propositions-filters">
      ${tab(PROPOSITION.OPEN, "ouverte" + (counts.open > 1 ? "s" : ""), counts.open)}
      ${tab("closed", "close" + (counts.closed > 1 ? "es" : "e"), counts.closed)}
    </div>
  `;
}

/**
 * L'état vide, qui explique quoi faire.
 *
 * Trois états vides distincts, parce qu'ils appellent trois gestes différents :
 * il n'y en a jamais eu, il n'y en a plus d'ouvertes, ou la base n'a pas
 * répondu. Les confondre laisserait croire à une absence là où il y a une panne.
 */
function renderEmpty() {
  if (view.unreachable) {
    return `
      <div class="propositions-empty">
        <b>Les propositions n'ont pas pu être lues</b>
        <p>Le projet est peut-être injoignable. Rien n'est perdu : réessayez en rechargeant la page.</p>
      </div>
    `;
  }

  const jamais = (view.propositions ?? []).length === 0;
  return `
    <div class="propositions-empty">
      ${svgIcon("git-pull-request", { className: "octicon", width: 24, height: 24 })}
      <b>${jamais ? "Aucune proposition dans ce projet" : `Aucune proposition ${view.filter === PROPOSITION.OPEN ? "ouverte" : "close"}`}</b>
      <p>
        Une proposition rassemble des documents et ce qu'ils changeraient au projet,
        pour qu'on en juge avant de les accepter.
        Elle s'ouvre depuis l'onglet <b>Documents</b>, en déposant des fichiers.
      </p>
    </div>
  `;
}

function renderRow(proposition) {
  const merged = proposition.status === PROPOSITION.MERGED;
  const closed = proposition.status === PROPOSITION.CLOSED;
  const auteur = proposition.created_by === store.user?.id ? "vous" : "un collaborateur";

  return `
    <li class="propositions-row">
      <span class="propositions-row__icon propositions-row__icon--${proposition.status}">
        ${svgIcon(merged ? "check-circle-fill" : closed ? "stop-alert" : "git-pull-request", { className: "octicon" })}
      </span>
      <span class="propositions-row__body">
        <span class="propositions-row__title">${escapeHtml(proposition.title)}</span>
        <span class="propositions-row__meta">
          ouverte le ${escapeHtml(formatDate(proposition.created_at))} par ${auteur}
          · ${proposition.documentCount} document${proposition.documentCount > 1 ? "s" : ""}
          ${merged ? `· fusionnée le ${escapeHtml(formatDate(proposition.merged_at))}` : ""}
        </span>
      </span>
    </li>
  `;
}

function renderContent(root) {
  const all = view.propositions ?? [];
  const counts = {
    open: all.filter((entry) => entry.status === PROPOSITION.OPEN).length,
    closed: all.filter((entry) => entry.status !== PROPOSITION.OPEN).length
  };
  const shown =
    view.filter === PROPOSITION.OPEN
      ? all.filter((entry) => entry.status === PROPOSITION.OPEN)
      : all.filter((entry) => entry.status !== PROPOSITION.OPEN);

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--propositions">
      <div class="propositions-shell">
        ${renderFilters(counts)}
        ${
          view.loading
            ? `<div class="propositions-empty"><b>Lecture des propositions…</b></div>`
            : shown.length === 0
              ? renderEmpty()
              : `<ul class="propositions-list">${shown.map(renderRow).join("")}</ul>`
        }
      </div>
    </section>
  `;

  for (const button of root.querySelectorAll("[data-propositions-filter]")) {
    button.addEventListener("click", () => {
      view.filter = button.getAttribute("data-propositions-filter");
      renderContent(root);
    });
  }
}

export function renderProjectPropositions(root) {
  if (!root) return;
  root.className = "project-shell__content";
  clearProjectActiveScrollSource();

  setProjectViewHeader({ contextLabel: "Propositions", variant: "propositions" });

  view.loading = true;
  renderContent(root);

  (async () => {
    try {
      const [{ resolveCurrentBackendProjectId }, { listPropositions }] = await Promise.all([
        import("../services/project-supabase-sync.js"),
        import("../services/propositions-supabase.js")
      ]);

      const projectId = await resolveCurrentBackendProjectId().catch(() => "");
      const rows = projectId ? await listPropositions(projectId) : [];

      view.unreachable = rows === null;
      view.propositions = rows ?? [];
      // Le compteur de l'onglet ne s'invente pas : il vaut ce qu'on vient de lire.
      store.projectPropositionsView = { openCount: getOpenPropositionCount() };
    } catch {
      view.unreachable = true;
      view.propositions = [];
    }

    view.loading = false;
    if (root.isConnected) renderContent(root);
  })();
}
