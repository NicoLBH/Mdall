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
import { journal as journalDExecution } from "../services/run-journal.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import {
  PROJECT_SHELL_COMPACT_CHANGE_EVENT,
  clearProjectActiveScrollSource,
  setProjectViewHeader
} from "./project-shell-chrome.js";
import { bindOverlayChromeCompact, renderOverlayChromeHead } from "./ui/overlay-chrome.js";
import { bindGhActionButtons, renderGhActionButton } from "./ui/gh-split-button.js";
import { bindLightTabs, renderLightTabs } from "./ui/light-tabs.js";
import {
  renderMessageThread,
  renderMessageThreadActivity,
  renderMessageThreadComment
} from "./ui/message-thread.js";
import { renderCommentComposer } from "./ui/comment-composer.js";
import { getAuthorIdentity } from "./ui/author-identity.js";
import { renderMarkdownToHtml } from "../utils/markdown-renderer.js";
import {
  REF,
  applyRefSuggestion,
  formatRef,
  linkifyRefsInHtml,
  resolveRefTriggerContext,
  searchRefSuggestions
} from "../utils/entity-refs.js";
import { STORY, buildStory } from "../services/proposition-story.js";
import { composerActions } from "../services/proposition-composer.js";
import { renderSharedDetailsTitleWrap } from "./ui/detail-header.js";
import { ITEM, PROPOSITION, describeMerge } from "../services/proposition-state.js";
import {
  buildSnapshot,
  defaultMergeMessage,
  describeSnapshotGap,
  freezeDecisions,
  itemsFromDecisions
} from "../services/proposition-freeze.js";
import {
  describeBlocking,
  describeConflict,
  findMemoryConflicts,
  unresolvedConflicts
} from "../services/memory-conflict.js";
import {
  ITEM_TYPE,
  STATUS_LABELS,
  applyDecisions,
  attachmentItems,
  avisItems,
  describeAvisChange,
  diffAvis,
  documentItems
} from "../services/proposition-review.js";
import {
  CHANGEMENT,
  CHANGEMENT_LABELS,
  affirmationsDUneProposition,
  resumeDuTableau,
  tableauAvantApres
} from "../services/proposition-avant-apres.js";
import { depotDeLaProposition, resumeDuDepot } from "../services/proposition-depot.js";
import { ETAT, arbreDesReperes, comparerDesReperes, resumeDuDiff } from "../services/depot-reperes.js";
import { aChange, reperesDuDepot } from "../services/depot-carburants.js";
import { limiterAuDepot } from "../services/depot-portee.js";
import { ISSUE, passerLesControles, resumeDesControles } from "../services/depot-controles.js";
import { bindSideResizer, renderSideResizer } from "./ui/side-resizer.js";
import { avisFromFigures, mergeAvis } from "../services/avis-from-figures.js";
import { describeReadingStack } from "../services/run-workflow.js";

/** Ce que l'écran tient entre deux rendus. */
const view = {
  /** "open" | "closed" — le filtre, comme sur GitHub. */
  filter: PROPOSITION.OPEN,
  /** `null` tant qu'on n'a pas répondu, `[]` quand il n'y a rien. */
  propositions: null,
  /** Vrai si la base n'a pas répondu : ne rien savoir n'est pas savoir qu'il n'y a rien. */
  unreachable: false,
  loading: true,
  /** La proposition ouverte, quand on en lit une. `null` sur la liste. */
  open: null,
  /** Où en est l'analyse de la proposition ouverte. */
  review: null,
  /** L'onglet ouvert dans le détail d'une proposition. */
  tab: "conversation",
  /** Le message en cours d'écriture, et son aperçu. */
  draft: "",
  preview: false,
  /** Le message en cours de modification, s'il y en a un. */
  editing: null,
  editDraft: "",
  editPreview: false,
  /** Ce qu'on écrira en fusionnant. */
  mergeTitle: "",
  mergeNote: "",
  /** Le panneau de fusion, ouvert par la barre de titre. */
  mergeDrawer: false,
  /** L'arborescence du diff, et ce qu'il montre. */
  diffTreeOpen: true,
  diffTreeWidth: 280,
  /** Les familles repliées dans l'arborescence, et les groupes repliés du diff. */
  diffTreeReplies: new Set(),
  diffGroupesReplies: new Set(),
  /** La boîte pour commenter depuis le diff. */
  diffComment: false,
  diffDraft: "",
  diffPreview: false,
  /** Les blocs de l'onglet Dépôts qu'on a dépliés. Repliés par défaut. */
  blocsOuverts: new Set(),
  /** De quoi citer dans ce projet : ses sujets et ses propositions. */
  refs: [],
  /** Le menu de citation ouvert sous le champ, s'il y en a un. */
  refMenu: null,
  /**
   * Le livrable qu'on lit, s'il y en a un.
   *
   * `{documentId, name, page, pageCount, bytes, loading, error, drawn}`. Les
   * octets sont gardés le temps de la lecture : feuilleter un rapport de
   * quarante pages ne doit pas le retélécharger quarante fois.
   */
  viewer: null
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

/**
 * L'accord d'un mot avec son nombre.
 *
 * « 0 fermée », « 1 fermée », « 2 fermées » : en français le singulier tient
 * jusqu'à un, et l'écran ne doit pas laisser passer un « 1 ouvertes ».
 */
function accorde(count, singulier, pluriel) {
  return count > 1 ? pluriel : singulier;
}

function renderFilters(counts) {
  const tab = (id, label, count) => `
    <button
      type="button"
      class="propositions-filter${view.filter === id ? " is-active" : ""}"
      data-propositions-filter="${id}"
      aria-pressed="${view.filter === id ? "true" : "false"}"
    >
      ${svgIcon(id === PROPOSITION.OPEN ? "git-pull-request" : "check", { className: "octicon" })}
      <span>${count} ${label}</span>
    </button>
  `;

  return `
    <div class="propositions-filters">
      ${tab(PROPOSITION.OPEN, accorde(counts.open, "ouverte", "ouvertes"), counts.open)}
      ${tab("closed", accorde(counts.closed, "fermée", "fermées"), counts.closed)}
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
      ${svgIcon("git-compare", { className: "octicon", width: 24, height: 24 })}
      <b>${
        jamais
          ? "Aucune proposition dans ce projet"
          : `Aucune proposition ${view.filter === PROPOSITION.OPEN ? "ouverte" : "fermée"}`
      }</b>
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
  const documents = proposition.documentCount;

  return `
    <li class="propositions-row">
      <span class="propositions-row__icon propositions-row__icon--${proposition.status}">
        ${
          // L'icône de la fusion, pas une coche dans un disque : c'est le même
          // signe que partout ailleurs — la pastille de l'en-tête, l'acte du
          // fil, la carte de fin. Une proposition ouverte prend celui d'une
          // demande ouverte : deux états ne peuvent pas porter le même dessin.
          svgIcon(merged ? "git-compare" : closed ? "stop-alert" : "git-pull-request", {
            className: "octicon"
          })
        }
      </span>
      <span class="propositions-row__body">
        <a
          class="propositions-row__title"
          href="#"
          data-proposition-open="${escapeHtml(proposition.id)}"
        >${escapeHtml(proposition.title)}</a>
        <span class="propositions-row__meta">
          <span class="propositions-row__number">#${Number(proposition.number) || "?"}</span>
          ouverte le ${escapeHtml(formatDate(proposition.created_at))} par ${auteur}
          · ${documents} ${accorde(documents, "document", "documents")}
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

  if (view.open) {
    // La coque d'un détail, celle des sujets : c'est elle que
    // `bindOverlayChromeCompact` marque au défilement, et c'est sa classe qui
    // fait basculer le titre étendu vers le titre compact, en CSS.
    root.innerHTML = `
      <section class="project-simple-page project-simple-page--propositions">
        <div class="propositions-shell overlay-chrome overlay-chrome--proposition" data-review-chrome>
          ${renderReview(root)}
        </div>
      </section>
    `;
    bindReview(root);
    // Le panneau vit hors de l'écran, sur `document.body` : il se resynchronise
    // après chaque rendu, sans quoi il porterait l'état d'avant.
    syncMergeDrawer(root);
    return;
  }

  // Retour à la liste : le panneau n'a plus de proposition à fusionner.
  closeMergeDrawer();

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

  for (const link of root.querySelectorAll("[data-proposition-open]")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openProposition(root, link.getAttribute("data-proposition-open"));
    });
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * La revue d'une proposition
 *
 * Rien ici n'est calculé pour la première fois : les documents ont été reconnus
 * au dépôt, les rattachements évalués par `project-identity.js`, les avis
 * produits par le moteur du suivi. La revue ne fabrique aucun savoir — elle
 * donne un lieu à ce qu'on savait déjà et que personne ne voyait.
 *
 * L'UI est celle d'une case à cocher, pas de deux boutons par ligne. Dix-sept
 * avis à accepter un par un, ce n'est pas une revue, c'est une corvée : cochée
 * vaut accepté, décochée vaut refusé, et l'en-tête de chaque bloc bascule tout
 * d'un geste.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * L'état d'une proposition, tel qu'on le montre.
 *
 * Les classes sont celles des sujets — `gh-state`, `gh-state--open`,
 * `gh-state--closed`, `gh-state--rejected` — et pas des nôtres. Une pastille
 * verte, violette ou grise veut déjà dire quelque chose dans cette
 * application ; en redéfinir une deuxième famille pour dire la même chose ne
 * ferait que promettre une différence qui n'existe pas.
 */
const PROPOSITION_STATE = {
  [PROPOSITION.OPEN]: { label: "Ouverte", icon: "git-pull-request", className: "gh-state--open" },
  [PROPOSITION.MERGED]: { label: "Fusionnée", icon: "git-compare", className: "gh-state--closed" },
  [PROPOSITION.CLOSED]: { label: "Fermée", icon: "skip", className: "gh-state--rejected" }
};

function statePill(proposition) {
  const state = PROPOSITION_STATE[proposition?.status] ?? PROPOSITION_STATE[PROPOSITION.OPEN];
  return `<span class="gh-state ${state.className}"><span class="gh-state-dot" aria-hidden="true">${svgIcon(
    state.icon,
    { style: "color: #fff" }
  )}</span>${state.label}</span>`;
}

function propositionMetaHtml(proposition) {
  const ouverture = `ouverte le ${escapeHtml(formatDate(proposition.created_at))}`;
  const fusion = proposition.merged_at ? ` · fusionnée le ${escapeHtml(formatDate(proposition.merged_at))}` : "";
  return `<span class="details-title-meta">${ouverture}${fusion}</span>`;
}

/**
 * Le bouton d'export, dans l'en-tête.
 *
 * Gris, à droite du titre : ce n'est pas une action de décision, c'est une
 * sortie. Le vert est réservé à ce qui engage — commenter, fusionner.
 *
 * Deux formats parce qu'ils ne servent pas la même chose. Le **JSON** conserve
 * la structure : c'est celui qu'on joint à un rapport de défaut, et celui qui
 * permet de dire « voilà exactement ce que le système a retenu ». Le **CSV** se
 * lit dans un tableur : c'est celui qu'on trie, qu'on filtre, et qu'on compare
 * à l'export de la mémoire du projet.
 */
function renderExportButton() {
  return renderGhActionButton({
    id: "propositionExport",
    label: "Exporter",
    icon: svgIcon("download", { className: "octicon" }),
    size: "sm",
    mainActionMode: "first-item",
    items: [
      { action: "export:json", label: "Exporter en JSON" },
      { action: "export:csv", label: "Exporter en CSV" }
    ]
  });
}

/**
 * L'en-tête d'une proposition — le même que celui d'un sujet.
 *
 * Rien n'est réinventé ici : `renderSharedDetailsTitleWrap` produit les deux
 * titres — l'étendu et le compact —, `renderOverlayChromeHead` produit la
 * barre, et `bindOverlayChromeCompact` bascule les classes au défilement. Une
 * proposition et un sujet sont deux choses qu'on lit de la même façon ; leur
 * donner deux en-têtes différents obligerait à corriger deux fois chaque
 * défaut, et à les voir diverger entre-temps.
 *
 * Ce que la proposition met dans ces cases lui est propre : son numéro à la
 * place de la référence, sa pastille d'état à la place de celle du sujet.
 */
/**
 * L'état de l'analyse, et l'accès à la fusion — dans la barre de titre.
 *
 * Un même bouton dit deux choses selon le moment : ce que la machine est en
 * train de faire, et si l'on peut signer. Il vit dans la barre parce que la
 * barre reste : jusqu'ici, décider imposait de revenir dans la conversation
 * puis de descendre jusqu'au bas du fil — trois gestes pour un seul acte, et
 * l'état de l'analyse invisible depuis les trois autres onglets.
 *
 * Il ne fusionne pas. Il ouvre le panneau qui énonce les conditions, et c'est
 * là qu'on signe, en deux temps comme avant.
 */
function renderMergeStateButton(proposition, review) {
  // Une proposition close n'attend plus rien : le bouton n'aurait ni état à
  // dire ni acte à proposer.
  if (!proposition || proposition.status !== PROPOSITION.OPEN) return "";

  // Pendant l'analyse : le spinner seul. Écrire « Analyse » à côté d'une roue
  // qui tourne dit deux fois la même chose, et fait sauter le bouton de largeur
  // quand elle s'arrête.
  if (review?.running) {
    return `
      <button type="button" class="gh-btn gh-btn--sm merge-state merge-state--running" disabled
        aria-label="Analyse en cours"
        title="${escapeHtml(review.step || "Lecture des livrables du projet et de ceux de cette proposition.")}">
        <span class="merge-state__spin">${svgIcon("sync", { className: "octicon" })}</span>
      </button>
    `;
  }

  const blocage = describeBlocking(review?.conflicts ?? []);
  const empeche = fusionRetenue(review ?? {});

  // La pastille porte la couleur, le bouton reste gris : c'est la lecture de
  // GitHub, et elle vaut mieux qu'un bouton entier coloré — le vert d'un bouton
  // dit « appuyez ici », celui d'une pastille dit « c'est prêt ».
  return `
    <button type="button" class="gh-btn gh-btn--sm merge-state merge-state--${empeche ? "held" : "ready"}"
      data-merge-open>
      <span class="merge-state__pastille">${svgIcon(empeche ? "alert" : "check", { className: "octicon" })}</span>
      <span>${escapeHtml(empeche ? "À arbitrer" : "Prêt à fusionner")}</span>
    </button>
  `;
}

/**
 * Le panneau de fusion, ouvert par-dessus l'écran.
 *
 * Le même contenu que le pavé de fin de conversation — les conditions, puis le
 * formulaire —, sorti de son cadre vert : ici, la couleur ne dit plus rien
 * qu'un bouton d'état ne dise déjà.
 *
 * **Il n'existe qu'à un seul endroit à la fois.** La conversation cesse de le
 * rendre pendant qu'il est ouvert : deux copies simultanées partageraient les
 * mêmes identifiants de champ, et l'écran écrirait le message de la fusion
 * dans celle qu'on ne regarde pas.
 */
function renderMergeDrawer(proposition, review) {
  const blocage = describeBlocking(review.conflicts ?? []);
  const empeche = fusionRetenue(review);

  return `
    <aside class="merge-drawer__panneau gh-panel gh-panel--details" role="dialog" aria-modal="true"
      aria-label="Fusionner la proposition">
      <header class="merge-drawer__tete gh-panel__head gh-panel__head--tight">
        <b>Fusionner la proposition #${Number(proposition.number) || "?"}</b>
        <button type="button" class="merge-drawer__fermer" data-merge-drawer-close
          aria-label="Fermer">${svgIcon("x", { className: "octicon" })}</button>
      </header>
      <div class="merge-drawer__corps details-body">
        <div class="merge-box__panel merge-box__panel--drawer">
          ${review.confirming ? "" : renderMergeConditions(review, empeche, blocage)}
          ${review.confirming ? renderMergeForm(proposition, review) : renderMergeAction(review, empeche, blocage)}
        </div>
      </div>
    </aside>
  `;
}

/**
 * Le panneau vit sur `document.body`, pas dans l'écran.
 *
 * Rendu dans la coque des propositions, il passait **sous** la barre du projet :
 * un ancêtre positionné crée un contexte d'empilement, et un `position: fixed`
 * qui y est pris n'en sort plus, si haut soit son `z-index`. C'est le mécanisme
 * exact qui avait déjà coupé le menu des Documents.
 *
 * Les panneaux latéraux de l'application vivent tous là pour cette raison — on
 * reprend leur coque (`overlay-host--side`, qui s'ancre à droite) plutôt que
 * d'en inventer une cinquième.
 */
function syncMergeDrawer(root) {
  const existant = document.getElementById("propositionMergeDrawer");
  const proposition = view.open;
  const review = view.review;
  const ouvert = Boolean(view.mergeDrawer) && proposition?.status === PROPOSITION.OPEN && review && !review.running;

  if (!ouvert) {
    existant?.remove();
    document.body.classList.remove("proposition-merge-open");
    return;
  }

  const hote = existant ?? document.createElement("div");
  if (!existant) {
    hote.id = "propositionMergeDrawer";
    document.body.appendChild(hote);
  }
  hote.className = "overlay-host overlay-host--side is-open merge-drawer";
  hote.innerHTML = `<div class="merge-drawer__voile" data-merge-drawer-close></div>${renderMergeDrawer(proposition, review)}`;
  document.body.classList.add("proposition-merge-open");

  bindMergePanel(hote, root);
}

/** Fermer le panneau quand on quitte la proposition : il n'a plus d'objet. */
function closeMergeDrawer() {
  view.mergeDrawer = false;
  document.getElementById("propositionMergeDrawer")?.remove();
  document.body.classList.remove("proposition-merge-open");
}

function renderReviewHead(proposition, review) {
  const titleWrapHtml = renderSharedDetailsTitleWrap(proposition, {
    emptyText: "Aucune proposition",
    buildTitleTextHtml: (entry) => `<span class="details-title-text">${escapeHtml(entry.title)}</span>`,
    buildIdHtml: (entry) => `#${Number(entry.number) || "?"}`,
    buildExpandedBottomHtml: (entry) => `${statePill(entry)}${propositionMetaHtml(entry)}`,
    buildCompactConfig: (entry, { titleTextHtml, idHtml }) => ({
      variant: "grid",
      wrapClass: "details-title--compact-grid",
      leftHtml: statePill(entry),
      topHtml: titleTextHtml,
      bottomHtml: propositionMetaHtml(entry),
      idHtml
    })
  });

  // Aucun bouton de retour : re-cliquer l'onglet « Propositions » ramène à la
  // liste, comme l'onglet « Sujets » ramène à la sienne. Un bouton de plus dans
  // l'en-tête ferait apprendre deux gestes pour un seul chemin — et c'est celui
  // qu'on connaît déjà, parce qu'il est le même dans toute l'application.
  //
  // L'export, lui, a sa place ici : il porte sur la proposition entière, pas
  // sur l'onglet ouvert. Un bouton par onglet exporterait quatre morceaux de ce
  // qui n'a de sens qu'entier.
  return renderOverlayChromeHead({
    headId: "propositionsDetailsTitle",
    titleHtml: titleWrapHtml,
    // La barre de titre s'élargit avec l'onglet des Changements : un titre
    // centré au-dessus d'un diff pleine largeur laisse deux gouttières vides
    // et donne l'impression de deux pages superposées.
    headClassName: `review-head${view.tab === "changes" ? " review-head--pleine" : ""}`,
    actionsHtml: `${renderMergeStateButton(proposition, review)}${renderExportButton()}`
  });
}

/**
 * Les figures d'un avis, sous ce qu'il dit.
 *
 * Le rapport montrait déjà ce que sa phrase ne disait pas ; l'écran le montre à
 * son tour. La vignette porte sa provenance en info-bulle — le document et la
 * page — et s'ouvre en grand : une image qu'on ne peut pas vérifier ne vaut pas
 * mieux qu'une affirmation.
 *
 * Les pixels ne sont pas dans le HTML : le stockage demande une autorisation,
 * donc la source arrive après, une fois l'écran dessiné.
 */
function renderItemFigures(item) {
  if (item.itemType !== ITEM_TYPE.AVIS) return "";

  const figures = figuresOfAvis(item);
  if (figures.length === 0) return "";

  return `<div class="review-figures">${figures.map(renderFigure).join("")}</div>`;
}

/**
 * Une figure : sa vignette, la ligne du tableau qui la porte, et ce qu'elle
 * montre.
 *
 * La ligne est écrite sous l'image — rubrique, avis, numéro **quand il
 * existe** — parce que c'est elle qui donne son sens à la photo. Une image sans
 * la ligne qui la porte ne se rattache à rien, et un numéro emprunté à une
 * autre ligne fabriquerait un avis qui n'existe pas.
 */
function renderFigure(figure) {
  const ligne = [
    String(figure.rubric ?? "").trim(),
    // Une case d'avis vide se dit : sur un rapport réel, certaines lignes n'en
    // portent aucun. La taire laisserait croire à un oubli de lecture.
    String(figure.avis_letter ?? "").trim() ? `avis ${String(figure.avis_letter).trim()}` : "avis non indiqué",
    String(figure.avis_reference ?? "").trim() ? `n° ${String(figure.avis_reference).trim()}` : "",
    `page ${figure.page}`
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <figure class="review-figure-card">
      <button
        type="button"
        class="review-figure"
        data-figure-open="${escapeHtml(figure.id)}"
        title="${escapeHtml(ligne)}"
      >
        <img class="review-figure__img" alt="${escapeHtml(ligne)}" data-figure-src="${escapeHtml(figure.id)}">
        <span class="review-figure__page">p. ${escapeHtml(String(figure.page))}</span>
      </button>
      <figcaption class="review-figure__caption">
        <span class="review-figure__row">${escapeHtml(ligne)}</span>
        ${
          String(figure.observation ?? "").trim()
            ? `<span class="review-figure__observation">${escapeHtml(figure.observation)}</span>`
            : ""
        }
        ${
          figure.caption
            ? `<span class="review-figure__read">${escapeHtml(figure.caption)}</span>
               <span class="review-figure__derived">Lecture automatique${
                 figure.caption_model ? ` (${escapeHtml(figure.caption_model)})` : ""
               } — ce que dit le rapport reste son texte.</span>`
            : `<button type="button" class="review-figure__ask" data-figure-describe="${escapeHtml(
                figure.id
              )}">Que montre cette image ?</button>`
        }
      </figcaption>
    </figure>
  `;
}

/**
 * Une affirmation : une case, ce qu'elle dit, et sa raison si on l'a refusée.
 *
 * Cochée vaut accepté. C'est la règle posée avec la fusion — un item qu'on
 * laisse tel quel est un item auquel on ne s'oppose pas — et la case la rend
 * lisible d'un coup d'œil au lieu de la cacher dans une phrase.
 */
function renderReviewItem(item, body) {
  const refuse = item.status === ITEM.REFUSED;
  const gele = view.review?.frozen === true;
  const cle = `${item.itemType}|${item.itemKey}`;

  return `
    <li class="review-item${refuse ? " is-refused" : ""}">
      <span class="review-item__check">
        ${
          gele
            ? // Une case à cocher sur un procès-verbal inviterait à changer ce
              // qui a été décidé. On montre la décision, on ne la propose pas.
              `<span class="review-item__mark review-item__mark--${refuse ? "refused" : "accepted"}"
                     title="${refuse ? "Refusé" : "Accepté"}" aria-label="${refuse ? "Refusé" : "Accepté"}">
                 ${svgIcon(refuse ? "x" : "check", { className: "octicon" })}
               </span>`
            : `<input type="checkbox" data-review-item="${escapeHtml(cle)}" ${refuse ? "" : "checked"}>`
        }
      </span>
      <div class="review-item__body">
        ${body}
        ${renderItemFigures(item)}
        ${refuse ? `<span class="review-item__status">Refusé</span>` : ""}
        ${
          refuse && !gele
            ? `<input
                 type="text"
                 class="gh-input review-item__reason"
                 data-review-reason="${escapeHtml(cle)}"
                 value="${escapeHtml(item.reason ?? "")}"
                 placeholder="Pourquoi l'écarter ? (facultatif)"
               >`
            : refuse && item.reason
              ? `<span class="review-item__reason-text">${escapeHtml(item.reason)}</span>`
              : ""
        }
      </div>
    </li>
  `;
}

function renderDocumentItem(item) {
  const { name, kindLabel, author, issuedAt, reason, duplicateOf, reissueOf } = item.payload;
  return renderReviewItem(
    item,
    `
      <span class="review-item__title">${escapeHtml(name)}</span>
      <span class="review-item__meta">
        ${kindLabel ? escapeHtml(kindLabel) : "Nature inconnue"}
        ${author ? ` · ${escapeHtml(author)}` : ""}
        ${issuedAt ? ` · émis le ${escapeHtml(formatDate(issuedAt))}` : ""}
        ${duplicateOf ? " · doublon d'un document déjà présent" : ""}
        ${reissueOf ? " · réédition d'un document déjà présent" : ""}
      </span>
      ${reason && !kindLabel ? `<span class="review-item__reason-text">${escapeHtml(reason)}</span>` : ""}
    `
  );
}

function renderAttachmentItem(item) {
  const { label, verdict, reason, documents } = item.payload;
  return renderReviewItem(
    item,
    `
      <span class="review-item__title review-item__title--${verdict === "FOREIGN" ? "danger" : "warn"}">
        Affaire ${escapeHtml(label)}
      </span>
      <span class="review-item__meta">${escapeHtml(reason ?? "")}</span>
      <span class="review-item__meta">
        ${documents
          .slice(0, 3)
          .map((document) => escapeHtml(document.name ?? ""))
          .join(", ")}${documents.length > 3 ? ` et ${documents.length - 3} autre(s)` : ""}
      </span>
    `
  );
}

function renderAvisItem(item) {
  const { reference, title, change, page } = item.payload;
  const mouvement = describeAvisChange(item.payload);

  // Un avis sans numéro se nomme par sa rubrique : « n° fiche:ab12cd34 » ne
  // désigne rien pour personne. La plupart des lignes d'une fiche d'avis
  // travaux n'ont pas de numéro — c'est le cas ordinaire, pas l'exception.
  const numero = String(reference ?? "").trim();
  const nom = numero
    ? `n° ${escapeHtml(numero)}${title ? ` — ${escapeHtml(title)}` : ""}`
    : escapeHtml(title || "Ligne sans intitulé");

  // Sans numéro, la page est ce qui permet d'aller voir : elle remplace la
  // référence comme point d'entrée dans le document.
  const situe = !numero && page ? `<span class="review-item__where">page ${escapeHtml(String(page))}</span>` : "";

  return renderReviewItem(
    item,
    `
      <span class="review-item__title">
        <span class="review-item__badge review-item__badge--${change}">${escapeHtml(mouvement.label)}</span>
        ${nom}${situe}
      </span>
      <span class="review-item__meta">${escapeHtml(mouvement.detail)}</span>
    `
  );
}

/**
 * Une contradiction avec la mémoire du projet.
 *
 * Elle ne se coche pas : elle se tranche. Deux boutons qui nomment leur
 * conséquence — garder ce qui avait été décidé, ou assumer ce que l'analyse
 * dit maintenant — parce qu'une case cochée d'un geste distrait ne vaut pas
 * décision quand elle défait une décision antérieure.
 *
 * Les deux versions sont montrées côte à côte, datées. Sans la date, « vous
 * aviez retenu » n'est qu'une affirmation de plus.
 */
/**
 * Un côté d'une contradiction : ce qu'il affirme, et sur quoi.
 *
 * **L'extrait est la raison d'être de ce panneau.** On demandait d'arbitrer
 * entre deux étiquettes — « Ouvert · avis S » contre « Levé » — sans montrer
 * d'où elles sortent. Personne ne peut trancher là-dessus ; celui qui tranche
 * quand même ne décide pas, il devine.
 *
 * Ce qui manque **se dit** : « aucun extrait conservé pour cette lecture » est
 * une information, un blanc se lirait comme l'absence de preuve. Et le lien
 * vers la page n'apparaît que si le document est à portée — promettre une
 * page qu'on ne sait pas ouvrir serait pire que de ne rien promettre.
 *
 * Le bouton est le même des deux côtés, et il dit la même chose : retenir
 * celle-ci. C'est ce que fait l'humain — il garde l'une ou l'autre lecture, il
 * n'« assume » rien.
 */
function renderConflictSide(cote = {}, { action = "take", cle = "", tranche = false } = {}) {
  const document_ = cote.documentId
    ? (view.review?.documentRows ?? []).find((row) => String(row.id) === String(cote.documentId))
    : null;

  const provenance = [
    document_ ? escapeHtml(document_.original_filename ?? document_.filename ?? "document") : "",
    cote.page ? `page ${escapeHtml(String(cote.page))}` : ""
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <div class="conflict__side conflict__side--${action === "keep" ? "memory" : "now"}">
      <span class="conflict__heading">${escapeHtml(cote.heading ?? "")}</span>
      <span class="conflict__statement">${escapeHtml(cote.statement ?? "")}</span>
      ${
        cote.excerpt
          ? `<blockquote class="conflict__excerpt">${escapeHtml(cote.excerpt)}${
              cote.retrouve
                ? `<span class="conflict__retrouve" title="Cette décision n'avait pas gardé d'extrait ; celui-ci vient du suivi des avis, pour la même référence.">retrouvé dans le suivi des avis</span>`
                : ""
            }</blockquote>`
          : `<p class="conflict__excerpt conflict__excerpt--none">Aucun extrait conservé pour cette lecture, et le suivi des avis n'en a pas non plus.</p>`
      }
      ${provenance ? `<span class="conflict__source">${provenance}</span>` : ""}
      ${
        document_?.storage_path
          ? `<button type="button" class="conflict__open" data-deposit-open="${escapeHtml(
              document_.id ?? ""
            )}"${cote.page ? ` data-deposit-page="${escapeHtml(String(cote.page))}"` : ""}>Voir dans le document</button>`
          : ""
      }
      ${
        tranche
          ? ""
          : `<button type="button" class="gh-btn gh-btn--sm conflict__choose" data-conflict-${action}="${escapeHtml(
              cle
            )}">Retenir cette lecture</button>`
      }
    </div>
  `;
}

function renderConflict(conflict) {
  // Le suivi des avis sert de secours quand la décision figée en base n'a pas
  // gardé d'extrait : arbitrer sans voir ce que dit le document, ce n'est pas
  // décider, c'est deviner.
  const dit = describeConflict(conflict, { memoire: view.review?.suiviDesAvis ?? null });
  const tranche = conflict.item.status !== ITEM.PROPOSED;
  const cle = `${conflict.item.itemType}|${conflict.item.itemKey}`;

  return `
    <li class="conflict${tranche ? " is-settled" : ""}">
      <div class="conflict__head">
        <span class="conflict__title">${escapeHtml(dit.title)}</span>
        ${
          conflict.decidedAt
            ? `<span class="conflict__date">décidé le ${escapeHtml(formatDate(conflict.decidedAt))}</span>`
            : ""
        }
      </div>
      <div class="conflict__sides">
        ${renderConflictSide(dit.before, { action: "keep", cle, tranche })}
        ${renderConflictSide(dit.after, { action: "take", cle, tranche })}
      </div>
      ${
        tranche
          ? `<p class="conflict__settled">${escapeHtml(
              conflict.item.status === ITEM.REFUSED ? dit.keep : dit.take
            )} — vous pouvez fusionner.</p>`
          : ""
      }
    </li>
  `;
}

/**
 * Le bloc des contradictions, en tête de la revue.
 *
 * Il est premier parce qu'il bloque : lire dix-sept avis pour découvrir en bas
 * de page qu'on ne peut pas fusionner serait faire perdre son temps à celui qui
 * lit. Quand il n'y a rien, il ne s'affiche pas — un bloc vide se dit quand son
 * absence est une information, et ici l'absence de contradiction se lit déjà
 * dans le fait qu'on peut fusionner.
 */
export function renderConflicts(conflicts = []) {
  if (conflicts.length === 0) return "";

  const restants = unresolvedConflicts(conflicts).length;

  return `
    <section class="review-block">
      <div class="review-panel review-panel--conflict">
        <div class="review-block__head review-block__head--plain">
          <div class="review-block__headbody">
            <h3 class="review-block__title">
              Contradictions avec la mémoire du projet
              <span class="review-block__count">${conflicts.length}</span>
            </h3>
            <span class="review-block__state${restants > 0 ? " is-blocking" : ""}">
              ${restants > 0 ? `${restants} à arbitrer` : "toutes arbitrées"}
            </span>
          </div>
        </div>
        <p class="conflict__doctrine">
          On a le droit de faire évoluer le projet même si cela contredit une décision passée.
          Ce qu'on ne peut plus faire, c'est le faire sans le savoir.
        </p>
        <ul class="conflict-list">${conflicts.map(renderConflict).join("")}</ul>
      </div>
    </section>
  `;
}

/**
 * Un bloc de la revue, avec sa case de tête.
 *
 * La case de tête est **dans la même colonne** que celles des lignes, parce
 * qu'elle fait la même chose : elle coche tout, puis on décoche ce qu'on
 * écarte. Décalée, elle aurait l'air de commander autre chose.
 *
 * Elle est cochée quand tout l'est, indéterminée quand une partie seulement
 * l'est — mais un trait dans une case est un signal faible, et à dix-sept
 * lignes on ne le voit pas. Le compte l'écrit donc en toutes lettres : « 3
 * écartés sur 17 ». Ce qui n'est pas accepté doit se lire sans compter.
 *
 * Un bloc vide se dit, il ne se cache pas : savoir qu'aucun avis ne change est
 * une information, pas une absence d'information.
 */
function renderReviewBlock(type, titre, items, renderer, vide) {
  const ecartes = items.filter((entry) => entry.status === ITEM.REFUSED).length;
  const tous = items.length > 0 && ecartes === 0;
  const aucun = items.length > 0 && ecartes === items.length;

  const etat = aucun
    ? `Tout est écarté`
    : ecartes > 0
      ? `${ecartes} écarté${ecartes > 1 ? "s" : ""} sur ${items.length}`
      : `Tout est accepté`;

  // Replié par défaut, et c'est ce qu'on veut : un dépôt de soixante-huit avis
  // se lit d'abord par son nombre. On l'ouvre quand on va trancher.
  //
  // Le caret existe **même à zéro**. « Cette proposition n'apporte aucun
  // document » écrit sous chaque bloc vide occupait trois paragraphes pour dire
  // trois fois rien, alors que le compteur le disait déjà. La phrase reste — un
  // bloc vide sur lequel on clique doit répondre quelque chose —, elle attend
  // simplement qu'on la demande.
  const ouvert = view.blocsOuverts?.has(type) === true;

  return `
    <section class="review-block">
      <div class="review-panel">
        <div class="review-block__head${ecartes > 0 ? " is-partial" : ""}${ouvert ? "" : " review-block__head--replie"}">
          <button type="button" class="review-block__caret" data-review-block-toggle="${escapeHtml(type)}"
            aria-expanded="${ouvert ? "true" : "false"}"
            aria-label="${escapeHtml(ouvert ? `Replier ${titre}` : `Déplier ${titre}`)}">
            ${svgIcon(ouvert ? "chevron-down" : "chevron-right", { className: "octicon" })}
          </button>
          <label class="review-item__check">
            ${
              items.length > 0 && view.review?.frozen !== true
                ? `<input
                     type="checkbox"
                     data-review-block="${escapeHtml(type)}"
                     ${tous ? "checked" : ""}
                     ${!tous && !aucun ? 'data-indeterminate="1"' : ""}
                     aria-label="Tout accepter"
                   >`
                : ""
            }
          </label>
          <div class="review-block__headbody">
            <h3 class="review-block__title">
              <button type="button" class="review-block__titre-bouton" data-review-block-toggle="${escapeHtml(type)}">${escapeHtml(titre)}</button>
              <span class="review-block__count">${items.length}</span>
            </h3>
            ${items.length > 0 ? `<span class="review-block__state">${escapeHtml(etat)}</span>` : ""}
          </div>
        </div>
        ${
          !ouvert
            ? ""
            : items.length === 0
              // Alignée sur le titre : une phrase qui repartirait du bord
              // gauche se lirait comme le texte d'un autre bloc.
              ? `<p class="review-block__empty review-block__empty--aligne">${escapeHtml(vide)}</p>`
              : `<ul class="review-list">${items.map(renderer).join("")}</ul>`
        }
      </div>
    </section>
  `;
}

/**
 * Le bandeau d'un procès-verbal.
 *
 * Il dit deux choses, et la seconde est la plus importante : à quelle date cet
 * état a été arrêté, et que **rien ici ne se recalcule**. Sans elle, un lecteur
 * qui trouverait l'écran figé pourrait croire à un cache, et cliquer partout
 * pour le rafraîchir.
 */
function renderFrozenNote(proposition, review) {
  // Une proposition close le dit assez : sa pastille, sa carte de fin, ses
  // cases devenues des marques. Un bandeau de plus au-dessus de tout cela
  // répétait ce que l'écran montrait déjà, et occupait la place du premier
  // message.
  //
  // Ce qui reste est ce que l'écran ne peut pas montrer autrement : qu'il
  // manque une partie de l'état. Le taire ferait passer une trace partielle
  // pour un procès-verbal complet.
  if (!review.gap) return "";

  return `
    <div class="propositions-empty propositions-empty--warn">
      <b>État partiellement conservé</b>
      <p>${escapeHtml(review.gap)}</p>
    </div>
  `;
}

/** Trois noms, puis un compte : une liste de dix-sept fichiers n'est plus une phrase. */
function nameSome(rows = [], limit = 3) {
  const noms = rows.map((row) => row?.original_filename ?? row?.filename ?? "").filter(Boolean);
  if (noms.length === 0) return "Les fichiers concernés n'ont pas été retenus.";

  return `${noms.slice(0, limit).join(", ")}${noms.length > limit ? ` et ${noms.length - limit} autre(s)` : ""}.`;
}

/**
 * Les documents regroupés par geste de dépôt.
 *
 * Même règle que l'histoire : ce qui est arrivé dans la même minute, de la même
 * main, est un seul geste. Dix-sept lignes en base, un envoi.
 */
function groupDeposits(documents = [], names = new Map()) {
  const groupes = new Map();

  for (const document of documents) {
    const cle = `${document.created_by ?? ""}|${String(document.created_at ?? "").slice(0, 16)}`;
    const groupe = groupes.get(cle) ?? {
      at: document.created_at ?? null,
      // La table des auteurs porte un nom **et** un visage depuis qu'on affiche
      // les avatars : prendre l'entrée telle quelle écrivait « [object Object]
      // a déposé 17 livrables ».
      who: nameOfAuthor(names.get(String(document.created_by ?? ""))),
      documents: []
    };
    groupe.documents.push(document);
    groupes.set(cle, groupe);
  }

  return [...groupes.values()].sort((gauche, droite) => new Date(gauche.at ?? 0) - new Date(droite.at ?? 0));
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les quatre questions d'une proposition
 *
 * GitHub découpe une pull request en quatre onglets, et ce n'est pas un
 * rangement : ce sont quatre questions différentes, qui n'ont pas les mêmes
 * lecteurs ni le même âge. Ici :
 *
 *  - **Conversation** — pourquoi, par qui, et que décide-t-on ? C'est là que
 *    vit le bouton de fusion, comme sur GitHub : on ne fusionne pas au milieu
 *    d'un tableau, on fusionne au bout d'une discussion.
 *  - **Dépôts** — qu'est-ce qui est entré, quand, déposé par qui ? (les commits)
 *  - **Vérifications** — qu'en dit la machine ? (les checks) Ce que l'analyse a
 *    lu, ce qu'elle en tire, et ce qu'elle n'a pas pu lire.
 *  - **Changements** — qu'accepte-t-on, et par rapport à quoi ? (le diff) Un
 *    tableau avant / après en tête, puis les mouvements du corpus.
 *
 * La valeur de ce découpage se voit surtout **six mois plus tard** : on revient
 * presque toujours pour la Conversation — qui a décidé, quand, sur quelle
 * base — et presque jamais pour la liste des fichiers. Mélanger les quatre
 * obligerait à relire un diff de dix-sept lignes pour retrouver une phrase.
 * ──────────────────────────────────────────────────────────────────────────── */

const REVIEW_TABS = [
  { id: "conversation", label: "Conversation", iconName: "comment-discussion" },
  { id: "deposits", label: "Dépôts", iconName: "git-commit" },
  { id: "analysis", label: "Vérifications", iconName: "report" },
  { id: "changes", label: "Changements", iconName: "file-diff" }
];

/**
 * Le diff du dépôt, recalculé à partir de ce que la revue porte.
 *
 * Il ne se stocke pas ailleurs qu'ici : deux copies d'un même écart finissent
 * par ne plus dire la même chose, et c'est celle qu'on ne regarde pas qui a
 * raison le jour où l'on cherche.
 */
function recalculerLeDiff(review) {
  if (!review) return;
  review.diffDuDepot = comparerDesReperes(reperesDuDepot({
    items: review.items ?? [],
    avantApres: review.avantApres ?? null
  }));
}

/**
 * Le compteur d'ajouts et de suppressions, à droite des onglets.
 *
 * Celui de GitHub : deux nombres et une barre de cases. On ne le lit pas, on le
 * voit — et il dit en un coup d'œil si l'on a affaire à trois lignes ou à trois
 * cents, avant même d'ouvrir l'onglet.
 */
function renderDiffStat(review) {
  const lignes = review.diffDuDepot?.lignes ?? [];
  if (lignes.length === 0) return "";

  // Une modification compte des deux côtés : elle retire une valeur et en met
  // une autre. C'est ce que fait un diff de code, et pour la même raison — une
  // correction n'est pas un ajout.
  let ajouts = 0;
  let retraits = 0;
  for (const ligne of lignes) {
    for (const champ of ligne.champs ?? []) {
      if (champ.etat === ETAT.INCHANGE) continue;
      if (champ.avant) retraits += 1;
      if (champ.apres) ajouts += 1;
    }
  }
  if (ajouts + retraits === 0) return "";

  const total = ajouts + retraits;
  const cases = Array.from({ length: 5 }, (_, rang) => {
    const part = Math.round((ajouts / total) * 5);
    return rang < part ? "ajout" : "retrait";
  });

  return `
    <span class="diff-stat" title="${escapeHtml(`${ajouts} ajout${ajouts > 1 ? "s" : ""}, ${retraits} suppression${retraits > 1 ? "s" : ""}`)}">
      <span class="diff-stat__plus">+${ajouts}</span>
      <span class="diff-stat__moins">−${retraits}</span>
      <span class="diff-stat__cases">${cases
        .map((ton) => `<span class="diff-stat__case diff-stat__case--${ton}"></span>`)
        .join("")}</span>
    </span>
  `;
}

function reviewTabs(review) {
  const compte = {
    // La proposition est elle-même un dépôt — c'est la carte de tête —, et les
    // lots de documents s'ajoutent à elle.
    deposits: 1 + (review.deposits ?? []).length,
    // Les changements comptent ce qui **a bougé**, pas ce que le dépôt contient.
    // Un dépôt de trois cents repères dont deux changent annonce deux : c'est
    // le nombre qu'on veut voir avant de cliquer.
    changes: (review.diffDuDepot?.lignes ?? []).filter(aChange).length
  };

  return REVIEW_TABS.map((tab) => ({
    ...tab,
    label: compte[tab.id] > 0 ? `${tab.label} ${compte[tab.id]}` : tab.label
  }));
}

/**
 * Le visage et le nom d'un acteur, comme dans la discussion d'un sujet.
 *
 * Ce sont les mêmes personnes, dans le même projet : leur donner deux
 * apparences selon l'écran ferait douter qu'il s'agisse des mêmes.
 */
function identityOf(event) {
  const moi = event.authorId && event.authorId === String(store.user?.id ?? "");

  return getAuthorIdentity({
    author: event.who,
    avatarUrl: event.avatarUrl || "",
    currentUserAvatar: moi ? store.user?.avatar || "" : "",
    agent: moi ? "human" : "",
    humanAvatarHtml: svgIcon("avatar-human", { width: 20, height: 20 }),
    fallbackName: "Un collaborateur"
  });
}

function isMine(event) {
  return Boolean(event.authorId) && event.authorId === String(store.user?.id ?? "");
}

/**
 * Un texte écrit par quelqu'un : du Markdown, puis ses citations.
 *
 * Un projet a deux familles de choses numérotées qui se répondent — les sujets
 * et les propositions —, et elles se citent constamment : « le RICT de #P4
 * confirme ce qu'on disait dans #12 ». Sans renvoi, cette phrase oblige son
 * lecteur à retrouver les deux à la main, et il ne le fait pas.
 */
function humanTextHtml(markdown) {
  return linkifyRefsInHtml(renderMarkdownToHtml(markdown ?? "", { preserveMessageLineBreaks: true }), {
    resolveRef: ({ kind, number }) =>
      (view.refs ?? []).find((entry) => entry.kind === kind && entry.number === number) ?? null
  });
}

/**
 * Le texte d'une note : du Markdown, sans les retours à la ligne des messages.
 *
 * Une note porte des titres et des tableaux ; conserver les lignes vides d'un
 * message y ajouterait des sauts au milieu d'une structure.
 */
function noteTextHtml(markdown) {
  return linkifyRefsInHtml(renderMarkdownToHtml(markdown ?? ""), {
    resolveRef: ({ kind, number }) =>
      (view.refs ?? []).find((entry) => entry.kind === kind && entry.number === number) ?? null
  });
}

/**
 * Pourquoi la note manque.
 *
 * « La note n'a pas pu être écrite » a envoyé quelqu'un lire la console du
 * navigateur pour découvrir qu'une fonction n'était pas déployée. L'écran
 * savait quoi dire ; il ne le disait pas. Un échec sans cause n'est pas plus
 * honnête qu'un texte inventé, il est seulement moins utile.
 */
function describeNoteFailure(code) {
  const fin = "Les documents et l'analyse, eux, sont là.";

  if (code === "unreachable") {
    return `La note n'a pas pu être écrite : le service de rédaction n'a pas répondu. ${fin}`;
  }
  if (code === "unconfigured") {
    return `La note n'a pas pu être écrite : le service de rédaction n'est pas configuré. ${fin}`;
  }
  return `La note n'a pas pu être écrite. ${fin}`;
}

/**
 * La note de dépôt, en tête du fil.
 *
 * Une pull request porte un texte écrit par celui qui l'ouvre : il sait ce
 * qu'il a changé, il vient de l'écrire. Celui qui dépose dix-sept PDF ne sait
 * pas ce qu'ils contiennent — c'est la machine qui les a lus. Le corps du
 * message revient donc à la machine, et il est signé comme tel : un message de
 * Mdall, à sa place dans le fil, juste après celui qui a ouvert.
 *
 * Elle se place là plutôt qu'à sa date : une note décrit un lot, et sa place
 * est là où le lot entre. Sa date, elle, est dite — c'est ce qui permet de
 * savoir qu'elle a été réécrite après un second dépôt.
 */
function renderDepositNote(review) {
  const etat = review.noteState ?? "idle";
  const note = review.note ?? null;
  if (!note && etat === "idle") return "";

  const identite = getAuthorIdentity({ author: "system", agent: "system" });

  const corps = note
    ? `${noteTextHtml(note.markdown)}
       <p class="deposit-note__source">${escapeHtml(
         `Rédigée à partir des faits relevés par l'analyse${note.model ? ` (${note.model})` : ""}. Elle ne dit rien qui n'ait été calculé.`
       )}</p>`
    : etat === "writing"
      ? `<p class="review-empty-note">Mdall lit le lot et rédige sa note…</p>`
      : `<p class="review-comment__notice">${escapeHtml(describeNoteFailure(review.noteError))}</p>`;

  // Une note ratée se redemande : c'est un appel qui a échoué, pas un état du
  // dossier. Une note écrite pendant qu'une autre s'écrit ne se redemande pas.
  const reprise =
    etat === "failed"
      ? `<div class="deposit-note__retry"><button type="button" class="gh-btn gh-btn--sm" data-note-retry>Réessayer</button></div>`
      : "";

  return renderMessageThreadComment({
    idx: 0,
    author: identite.displayName,
    tsHtml: `<span class="gh-comment-ts">${escapeHtml(
      note?.created_at ? `a rédigé la note de dépôt le ${formatDate(note.created_at)}` : "rédige la note de dépôt"
    )}</span>`,
    bodyHtml: `${corps}${reprise}`,
    avatarHtml: identite.avatarHtml,
    avatarType: identite.avatarType,
    avatarInitial: identite.avatarInitial,
    className: "review-deposit-note"
  });
}

/** Le corps d'un message : du Markdown, comme dans un sujet. */
function commentBodyHtml(event) {
  if (event.deleted) {
    return `<p class="review-comment__removed">Ce message a été retiré.</p>`;
  }
  return humanTextHtml(event.body);
}

/**
 * Un message du fil, avec ce qu'on peut en faire.
 *
 * On ne modifie et on ne retire que ses propres messages. Retirer ne supprime
 * rien : le texte reste en base, l'écran cesse de le montrer. Un message retiré
 * peut être la seule trace d'une objection, et c'est aussi ce à quoi d'autres
 * ont répondu.
 */
function renderConversationComment(event, index) {
  const identite = identityOf(event);
  const enEdition = view.editing === event.commentId;

  const actions =
    isMine(event) && !event.deleted && !enEdition
      ? `<div class="review-comment__actions">
           <button type="button" class="review-comment__action" data-comment-edit="${escapeHtml(
             event.commentId
           )}">Modifier</button>
           <button type="button" class="review-comment__action review-comment__action--danger" data-comment-remove="${escapeHtml(
             event.commentId
           )}">Retirer</button>
         </div>`
      : "";

  const corps = enEdition
    ? renderCommentComposer({
        hideAvatar: true,
        hideTitle: true,
        previewMode: view.editPreview === true,
        textareaId: `propositionCommentEdit-${event.commentId}`,
        previewId: `propositionCommentEditPreview-${event.commentId}`,
        textareaValue: view.editDraft ?? "",
        textareaAttributes: { "data-comment-edit-draft": event.commentId },
        placeholder: "Modifier le message…",
        tabWriteAction: "proposition-edit-tab-write",
        tabPreviewAction: "proposition-edit-tab-preview",
        composerClassName: "comment-composer--proposition-edit",
        previewHtml: humanTextHtml(view.editDraft ?? ""),
        actionsHtml: `
          <button type="button" class="gh-btn gh-btn--sm" data-comment-edit-cancel>Annuler</button>
          <button type="button" class="gh-btn gh-btn--sm gh-btn--primary" data-comment-edit-save="${escapeHtml(
            event.commentId
          )}">Enregistrer</button>
        `
      })
    : commentBodyHtml(event);

  return renderMessageThreadComment({
    idx: index,
    author: identite.displayName,
    tsHtml: `<span class="gh-comment-ts">a commenté${
      event.at ? ` le ${escapeHtml(formatDate(event.at))}` : ""
    }${event.editedAt ? ` · modifié le ${escapeHtml(formatDate(event.editedAt))}` : ""}</span>`,
    bodyHtml: corps,
    avatarHtml: identite.avatarHtml,
    avatarType: identite.avatarType,
    avatarInitial: identite.avatarInitial,
    headerRightHtml: actions,
    className: event.deleted ? "review-comment--removed" : ""
  });
}

/**
 * La fin d'une proposition, encadrée.
 *
 * Une ligne d'activité de plus ne dirait pas ce qui s'est passé : fusionner est
 * l'aboutissement de tout ce qui précède, et cela se voit. Le violet est celui
 * des propositions fusionnées, déjà employé par leur pastille — la couleur dit
 * la même chose partout.
 */
function renderOutcomeCard(event) {
  const fusionnee = event.kind === STORY.MERGED;

  return `
    <section class="outcome-card outcome-card--${fusionnee ? "merged" : "closed"}">
      <span class="outcome-card__mark">${svgIcon(fusionnee ? "git-compare" : "skip", {
        className: "octicon",
        width: 20,
        height: 20
      })}</span>
      <div class="outcome-card__panel">
        <b>${escapeHtml(
          event.title || (fusionnee ? "Proposition fusionnée et close" : "Proposition abandonnée et close")
        )}</b>
        ${event.note ? `<span class="outcome-card__note">${escapeHtml(event.note)}</span>` : ""}
        <span>${escapeHtml(
          fusionnee
            ? `${event.detail || "Ses affirmations sont entrées au projet."} Elle ne peut plus être fusionnée une seconde fois, et son état est conservé tel quel.`
            : "Ses documents restent au projet, marqués refusés. Ce qu'elle proposait reste lisible."
        )}</span>
      </div>
    </section>
  `;
}

/** Une ligne d'activité : un acte qui n'est pas une parole. */
function renderConversationActivity(event, index, { defaisable = false } = {}) {
  const identite = identityOf(event);

  // Défaire se propose **là où la fusion s'est produite**, sur la ligne qui la
  // raconte. Un bouton ailleurs demanderait de chercher ce qu'on veut annuler.
  const defaire = defaisable && event.kind === STORY.MERGED
    ? `<button type="button" class="gh-btn gh-btn--sm proposition-defaire" data-proposition-defaire
        ${view.review?.defaisant ? "disabled" : ""}>${
        view.review?.defaisant ? "Préparation…" : "Défaire"}</button>`
    : "";

  return renderMessageThreadActivity({
    idx: index,
    trailingHtml: defaire,
    // La même pastille que dans un sujet : un disque, un contour de la couleur du
    // fond, qui pose l'icône sur la ligne du fil sans la couper.
    iconHtml: `<span class="tl-ico-wrap tl-ico-${escapeHtml(event.kind)}">${svgIcon(
      STORY_ICON[event.kind] ?? "git-commit",
      { className: "octicon" }
    )}</span>`,
    authorIconHtml: identite.avatarHtml
      ? `<span class="tl-activity__avatar">${identite.avatarHtml}</span>`
      : "",
    textHtml: `<b>${escapeHtml(event.who)}</b> ${escapeHtml(event.text)}${
      event.at ? ` <span class="tl-activity__date">le ${escapeHtml(formatDate(event.at))}</span>` : ""
    }${event.detail ? `<span class="tl-activity__detail">${escapeHtml(event.detail)}</span>` : ""}`
  });
}

/**
 * Le champ pour écrire.
 *
 * Il reste après la fusion, et c'est délibéré : la décision est figée, la
 * conversation ne l'est pas. C'est souvent après coup qu'on comprend ce qui
 * s'est joué, et le dire là où cela s'est joué vaut mieux que de le dire
 * ailleurs.
 */
function renderConversationComposer(proposition, review) {
  const actions = composerActions({
    draft: view.draft,
    posting: review.posting,
    abandoning: review.abandoning
  });
  const peutFermer = proposition.status === PROPOSITION.OPEN;

  const moi = getAuthorIdentity({
    author: "vous",
    agent: "human",
    currentUserAvatar: store.user?.avatar || "",
    humanAvatarHtml: svgIcon("avatar-human", { width: 20, height: 20 }),
    fallbackName: "vous"
  });

  return renderCommentComposer({
    title: "Ajouter un commentaire",
    avatarHtml: moi.avatarHtml,
    previewMode: view.preview === true,
    textareaId: "propositionCommentBox",
    previewId: "propositionCommentPreview",
    textareaValue: view.draft ?? "",
    textareaAttributes: { "data-comment-draft": "1" },
    placeholder: "Laisser un commentaire — ce qui se dit ici se relit dans six mois.",
    composerClassName: "comment-composer--proposition",
    tabWriteAction: "proposition-tab-write",
    tabPreviewAction: "proposition-tab-preview",
    previewHtml: humanTextHtml(view.draft ?? ""),
    hintHtml: review.commentNotice
      ? `<span class="review-comment__notice">${escapeHtml(review.commentNotice)}</span>`
      : "",
    // Fermer sans fusionner se fait ici, à côté de « Commenter », et non dans
    // le pavé de fusion : ce n'est pas une variante de la fusion, c'est le
    // contraire. Avec un texte en cours, le bouton propose de le publier en
    // partant — un abandon sans un mot est le genre de silence qu'on regrette.
    // Il porte le gris d'« Annuler », pas le rouge d'une destruction : fermer
    // une proposition n'efface rien — ses documents restent au projet et son
    // histoire reste lisible. Le rouge promettrait une perte qui n'a pas lieu.
    actionsHtml: `
      ${
        peutFermer
          ? `<button type="button" class="gh-btn review-close-btn" data-review-abandon ${
              review.merging ? "disabled" : ""
            }>${svgIcon("git-pull-request-closed", {
              className: "octicon review-close-btn__icon"
            })}<span data-review-abandon-label>${escapeHtml(actions.closeLabel)}</span></button>`
          : ""
      }
      <button type="button" class="gh-btn gh-btn--primary" data-comment-post ${
        actions.canPost ? "" : "disabled"
      }>${review.posting ? "Envoi…" : "Commenter"}</button>
    `
  });
}

/**
 * Le menu des citations, sous le champ.
 *
 * Il s'ouvre au `#` et propose les deux familles : les sujets, qui gardent leur
 * dièse nu, et les propositions, qui prennent un `P`. Personne n'a à retenir
 * cette lettre — c'est le menu qui écrit le jeton.
 *
 * Il est posé sous le champ plutôt qu'au curseur. La version flottante des
 * sujets suppose une mesure de la position du curseur dans un `textarea`, qui
 * est un morceau de machinerie à part entière ; sous le champ, la liste est
 * lisible, prévisible, et ne se place jamais hors de l'écran.
 */
function renderRefMenu() {
  const menu = view.refMenu;
  if (!menu?.open) return "";

  const suggestions = menu.suggestions ?? [];

  return `
    <div class="ref-menu" data-ref-menu>
      ${
        suggestions.length === 0
          ? `<div class="ref-menu__empty">Aucun sujet ni proposition ne correspond.</div>`
          : suggestions
              .map(
                (entry, index) => `
                  <button
                    type="button"
                    class="ref-menu__item${index === (menu.activeIndex ?? 0) ? " is-active" : ""}"
                    data-ref-pick="${escapeHtml(`${entry.kind}:${entry.number}`)}"
                  >
                    <span class="ref-menu__icon">${svgIcon(
                      entry.kind === REF.PROPOSITION ? "git-pull-request" : "issue-opened",
                      { className: "octicon" }
                    )}</span>
                    <span class="ref-menu__title">${escapeHtml(entry.title || "Sans titre")}</span>
                    <span class="ref-menu__number">${escapeHtml(formatRef(entry.kind, entry.number))}</span>
                  </button>
                `
              )
              .join("")
      }
    </div>
  `;
}

/**
 * La conversation : la description comme premier message, puis les actes.
 *
 * GitHub présente la description d'une pull request comme le premier message
 * d'un fil, et c'est un choix de fond : ce texte n'est pas un champ de
 * formulaire, c'est **quelqu'un qui dit pourquoi**. Les messages des autres s'y
 * mêlent dans l'ordre du temps, entre les actes qu'ils commentent.
 *
 * Les composants sont ceux des sujets (`renderMessageThread*`,
 * `renderCommentComposer`) : une discussion de proposition et une discussion de
 * sujet sont la même chose, et deux rendus différents divergeraient au premier
 * ajustement.
 */
function renderConversation(proposition, review) {
  const histoire = review.story ?? [];
  const ouverture = histoire.find((event) => event.kind === STORY.OPENED);
  const identite = identityOf(ouverture ?? {});

  const description = proposition.description
    ? humanTextHtml(proposition.description)
    : `<p class="review-empty-note">Aucune description n'a été donnée. La proposition parle alors d'elle-même : ce qu'elle dépose et ce qu'on en décide.</p>`;

  const premier = renderMessageThreadComment({
    idx: 0,
    author: identite.displayName,
    tsHtml: `<span class="gh-comment-ts">a ouvert cette proposition le ${escapeHtml(
      formatDate(proposition.created_at)
    )}</span>`,
    bodyHtml: description,
    avatarHtml: identite.avatarHtml,
    avatarType: identite.avatarType,
    avatarInitial: identite.avatarInitial
  });

  // Le trait épais sépare deux moments, pas deux zones d'écran : ce qui s'est
  // dit **avant** que la proposition ne soit tranchée, et ce qui se dit après.
  // Un message écrit après la fusion ne pesait pas dans la décision — le lire à
  // la suite des autres ferait croire le contraire. Le fil repart donc à zéro
  // sous le trait, avec sa propre ligne verticale.
  const rangFin = histoire.findIndex((event) => event.kind === STORY.MERGED || event.kind === STORY.CLOSED);
  const avant = rangFin >= 0 ? histoire.slice(0, rangFin + 1) : histoire;
  const apres = rangFin >= 0 ? histoire.slice(rangFin + 1) : [];

  // Défaire ne se propose que sur une proposition **fusionnée**, et une seule
  // fois : sur celle qui défait déjà quelque chose, le bouton reviendrait à
  // défaire le fait de défaire, ce qui ne veut plus rien dire à l'écran. Elle
  // reste défaisable comme une autre depuis sa propre page.
  const defaisable = proposition?.status === PROPOSITION.MERGED;

  const raconter = (events, depart) =>
    events
      .map((event, index) => {
        if (event.kind === STORY.COMMENT) return renderConversationComment(event, depart + index);
        return renderConversationActivity(event, depart + index, { defaisable });
      })
      .join("");

  const note = renderDepositNote(review);
  const suite = raconter(avant.filter((event) => event.kind !== STORY.OPENED), 1);
  const depuis = raconter(apres, avant.length);

  // La carte de fin clôt la page, après tout ce qui s'est dit — y compris ce
  // qui s'est dit depuis. C'est le procès-verbal : il se lit en dernier.
  const fin = rangFin >= 0 ? histoire[rangFin] : null;

  return `
    <div class="review-thread-host">
      ${renderMessageThread({
        itemsHtml: `${premier}${note}${suite}`,
        // Quand un second fil suit, la ligne du premier ne s'arrête plus à son
        // dernier acte : elle traverse le trait et rejoint ce qui se dit depuis.
        className: `review-thread review-thread--before${depuis ? " review-thread--continues" : ""}`
      })}
    </div>
    <div class="review-end" role="separator" aria-label="Fin de la discussion"></div>
    ${
      // Le pavé s'efface pendant que le panneau de la barre de titre est
      // ouvert : deux copies partageraient les identifiants de leurs champs.
      proposition.status === PROPOSITION.OPEN && !view.mergeDrawer ? renderMergeBox(proposition, review) : ""
    }
    ${
      depuis
        ? `<div class="review-thread-host review-thread-host--after">
            ${renderMessageThread({
              itemsHtml: depuis,
              className: "review-thread review-thread--after review-thread--continues"
            })}
            <div class="review-since-end" role="separator" aria-label="Fin des messages depuis la fusion"></div>
          </div>`
        : ""
    }
    ${fin ? renderOutcomeCard(fin) : ""}
    ${renderConversationComposer(proposition, review)}
    ${renderRefMenu()}
  `;
}

/** L'icône de chaque acte : la même famille que partout ailleurs. */
const STORY_ICON = {
  [STORY.OPENED]: "git-pull-request",
  [STORY.DEPOSIT]: "git-commit",
  [STORY.DECISION]: "check",
  [STORY.MERGED]: "git-compare",
  [STORY.CLOSED]: "skip"
};

/**
 * Le pavé de fusion, au bout de la conversation.
 *
 * Il énonce ses conditions **avant** le bouton, comme GitHub énonce l'état de
 * ses checks : ce qui bloque doit se lire sans cliquer pour découvrir que ça ne
 * marche pas. Vert quand tout est prêt, ambre quand quelque chose retient —
 * la couleur se lit avant la phrase.
 *
 * Et fusionner se fait en deux temps. Le premier clic ouvre un formulaire, pas
 * une fusion : on écrit ce qu'on fait, puis on confirme. Git demande un message
 * au moment du commit pour cette raison exacte — c'est le seul instant où
 * l'auteur peut dire pourquoi, et l'instant où il s'en souvient encore.
 */
/** Le bilan d'un sous-ensemble de contrôles, pour en écrire le résumé. */
function bilanDe(lignes = []) {
  const bilan = { tenu: 0, "non-tenu": 0, "sans-objet": 0, "non-verifiable": 0, "en-cours": 0 };
  for (const ligne of lignes) bilan[ligne.issue] += 1;
  return bilan;
}

/**
 * Ce qui retient la fusion.
 *
 * Un contrôle **requis** qui n'est pas tenu, ou une analyse qui n'a pas abouti.
 * Un contrôle non vérifiable ne bloque pas : ne pas savoir n'est pas un échec,
 * et c'est à l'humain de décider s'il signe sans savoir.
 */
function fusionRetenue(review) {
  if (review.running) return true;
  if (review.error) return true;
  return passerLesControles(contexteDesControles(view.open ?? {}, review)).bloque;
}

/**
 * Ce qui retient, en toutes lettres.
 *
 * « Arbitrez ce qui est en attente » ne disait pas quoi. Un blocage qu'on ne
 * sait pas lever n'est qu'un mur, et l'on cherche dans quatre onglets.
 */
function retenuPar(review) {
  if (review.running) return "L'analyse est en cours";
  if (review.error) return "L'analyse n'a pas abouti";

  const retenus = passerLesControles(contexteDesControles(view.open ?? {}, review))
    .lignes.filter((ligne) => ligne.bloquant && ligne.issue === ISSUE.NON_TENU);

  if (retenus.length === 0) return "Quelque chose retient la fusion";
  if (retenus.length === 1) return retenus[0].label;
  return `${retenus.length} contrôles requis ne sont pas tenus`;
}

function renderMergeBox(proposition, review) {
  // Pendant l'analyse, les conditions ne veulent rien dire : elles compteraient
  // zéro avis en mouvement sur un lot qu'on n'a pas encore lu. Le pavé dit donc
  // qu'on attend, et l'état exact se lit dans la barre de titre.
  if (review.running) {
    return `
      <section class="merge-area">
        <div class="merge-box merge-box--waiting">
          <span class="merge-box__avatar">${svgIcon("git-compare", { className: "octicon", width: 20, height: 20 })}</span>
          <div class="merge-box__panel">
            <div class="merge-box__body">
              <div class="merge-box__row merge-box__row--lead">
                <span class="merge-box__icon merge-box__icon--plain">${svgIcon("sync", { className: "octicon" })}</span>
                <div>
                  <b>L'analyse est en cours</b>
                  <span class="merge-box__note">${escapeHtml(
                    review.step || "Lecture des livrables du projet et de ceux de cette proposition."
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  const blocage = describeBlocking(review.conflicts ?? []);
  const empeche = fusionRetenue(review);

  return `
    <section class="merge-area">
      <div class="merge-box merge-box--${empeche ? "blocked" : "ready"}${
        review.confirming ? " merge-box--confirming" : ""
      }">
        <span class="merge-box__avatar">${svgIcon("git-compare", {
          className: "octicon",
          width: 20,
          height: 20
        })}</span>

        <div class="merge-box__panel">
          ${
            // Au moment de signer, les conditions s'effacent : elles ont servi à
            // décider, et ce qui reste à faire est d'écrire. Les garder sous le
            // formulaire ferait relire un état déjà admis.
            review.confirming ? "" : renderMergeConditions(review, empeche, blocage)
          }
          ${review.confirming ? renderMergeForm(proposition, review) : renderMergeAction(review, empeche, blocage)}
        </div>
      </div>
    </section>
  `;
}

/**
 * Ce que la fusion fera, et ce qui la retient.
 *
 * Énoncé **avant** le bouton, comme GitHub énonce l'état de ses checks : ce qui
 * bloque doit se lire sans cliquer pour découvrir que ça ne marche pas. Le
 * pavé de la conversation et le panneau ouvert par la barre de titre montrent
 * exactement les mêmes lignes — une seule source, sinon les deux divergent et
 * l'on ne sait plus laquelle croire.
 */
function renderMergeConditions(review, empeche, blocage = "") {
  // Les conditions ne se réécrivent plus ici : ce sont **les contrôles**, et ce
  // qui bloque la fusion est ce qu'ils disent. Deux listes de conditions — une
  // dans l'onglet Vérifications, une dans le pavé — auraient fini par ne plus
  // dire la même chose, et c'est celle qu'on ne regarde pas qui aurait raison.
  const controles = passerLesControles(contexteDesControles(view.open ?? {}, review));
  const requis = controles.lignes.filter((ligne) => ligne.bloquant);
  const autres = controles.lignes.filter((ligne) => !ligne.bloquant);

  const conditions = [
    {
      tone: review.error ? "warn" : "ok",
      // Le disque porte déjà la couleur : l'icône n'a plus qu'à être un signe.
      // `check-circle-fill` dessinerait un second cercle dans le premier.
      icon: review.error ? "alert" : "check",
      text: review.error ? "L'analyse n'a pas abouti" : "L'analyse a abouti",
      note: review.error ? review.error : describeAnalysis(review)
    },
    // Un contrôle requis se lit en toutes lettres : c'est lui qui retient, et
    // « la fusion est bloquée » sans dire par quoi n'est qu'un mur.
    ...requis.map((ligne) => ({
      tone: ligne.issue === ISSUE.TENU || ligne.issue === ISSUE.SANS_OBJET ? "ok" : "warn",
      icon: ligne.icone,
      text: ligne.label,
      note: [ligne.phrase, ligne.detail].filter(Boolean).join(" ")
    })),
    {
      tone: "ok",
      icon: "checklist",
      text: `${autres.length} autre${autres.length > 1 ? "s contrôles" : " contrôle"}`,
      note: resumeDesControles({ lignes: autres, bilan: bilanDe(autres) })
    }
  ];

  return `
    <div class="merge-box__body">
      <div class="merge-box__row merge-box__row--lead">
        <span class="merge-box__icon merge-box__icon--plain">${svgIcon("pulse", { className: "octicon" })}</span>
        <div>
          <b>Le suivi des avis sera réécrit</b>
          <span class="merge-box__note">
            La fusion fait entrer les documents acceptés au corpus, puis relit tout le dossier.
            Rien n'est calculé à moitié.
          </span>
        </div>
      </div>

      ${conditions
        .map(
          (ligne) => `
            <div class="merge-box__row merge-box__row--${ligne.tone}">
              <span class="merge-box__icon">${svgIcon(ligne.icon, { className: "octicon" })}</span>
              <div>
                <b>${escapeHtml(ligne.text)}</b>
                ${ligne.note ? `<span class="merge-box__note">${escapeHtml(ligne.note)}</span>` : ""}
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

/**
 * Le premier temps : un bouton, et ce qu'il fera.
 *
 * Quand la mémoire du projet est contredite, dire « tranchez ce qui est en
 * attente » sans dire où ferait chercher : le lien y mène directement, dans
 * l'onglet où les arbitrages se prennent. Un blocage qu'on ne sait pas lever
 * n'est qu'un mur.
 */
function renderMergeAction(review, empeche, blocage = "") {
  return `
    <div class="merge-box__actions">
      <button type="button" class="gh-btn gh-btn--primary" data-review-merge ${
        review.merging || empeche ? "disabled" : ""
      }>Fusionner la proposition</button>
      <span class="merge-box__hint">
        ${escapeHtml(
          empeche
            ? `${retenuPar(review)} — la fusion attend.`
            : "Vous écrirez le message de la fusion avant qu'elle ne s'applique."
        )}
        ${
          blocage
            ? `<button type="button" class="merge-box__link" data-review-goto-changes>Régler les conflits</button>`
            : empeche
              ? `<button type="button" class="merge-box__link" data-review-goto-checks>Voir les contrôles</button>`
              : ""
        }
        ${
          review.error
            ? `<button type="button" class="merge-box__link" data-review-retry>Relancer l'analyse</button>`
            : ""
        }
      </span>
    </div>
  `;
}

/**
 * Le second temps : ce qu'on écrit en fusionnant.
 *
 * Les champs sont pré-remplis, jamais vides. Un champ vide obtient une ligne
 * bâclée ; un champ pré-rempli obtient soit un accord — et la phrase par défaut
 * est juste —, soit une correction, qui vaut mieux qu'une invention.
 *
 * La signature est annoncée avant le clic : fusionner engage quelqu'un, et
 * savoir qui doit se lire au moment où on le devient.
 */
function renderMergeForm(proposition, review) {
  return `
    <div class="merge-form">
      <label class="merge-form__label" for="propositionMergeTitle">Message de la fusion</label>
      <input
        type="text"
        id="propositionMergeTitle"
        class="gh-input merge-form__input"
        data-merge-title
        value="${escapeHtml(view.mergeTitle ?? "")}"
      >

      <label class="merge-form__label" for="propositionMergeNote">Description</label>
      <textarea
        id="propositionMergeNote"
        class="textarea merge-form__textarea"
        data-merge-note
        rows="4"
      >${escapeHtml(view.mergeNote ?? "")}</textarea>

      <p class="merge-form__signature">
        Cette fusion sera signée par ${escapeHtml(store.user?.name || store.user?.email || "vous")}.
      </p>

      <div class="merge-form__actions">
        <button type="button" class="gh-btn gh-btn--primary" data-merge-confirm ${
          review.merging ? "disabled" : ""
        }>${review.merging ? "Fusion en cours…" : "Confirmer la fusion"}</button>
        <button type="button" class="gh-btn" data-merge-cancel ${review.merging ? "disabled" : ""}>Annuler</button>
      </div>
    </div>
  `;
}

/**
 * Quand l'analyse échoue, dire quoi faire.
 *
 * « L'analyse n'a pas abouti » informe et abandonne : celui qui le lit n'a
 * aucun geste à faire, et il n'en fait aucun. Une panne dont on ne peut rien
 * faire est pire qu'une panne, parce qu'elle donne l'impression que le produit
 * s'est arrêté là.
 *
 * Trois choses manquaient : la cause telle que le système la connaît, ce qu'on
 * peut vérifier soi-même, et un bouton pour recommencer. Rien n'est perdu
 * pendant ce temps — les documents sont déposés, la proposition existe, et
 * relancer ne relit que des fichiers.
 */
function renderAnalysisFailure(review) {
  const illisibles = review.unreachable ?? [];

  return `
    <div class="propositions-empty propositions-empty--warn analysis-failure">
      <b>L'analyse n'a pas abouti</b>
      <p class="analysis-failure__cause">${escapeHtml(review.error || "La cause n'a pas été rapportée.")}</p>

      ${
        illisibles.length > 0
          ? `<p>Le stockage n'a pas rendu ${escapeHtml(
              illisibles.length > 1 ? "ces livrables" : "ce livrable"
            )} : ${escapeHtml(nameSome(illisibles))} L'analyse a porté sur le reste.</p>`
          : ""
      }

      <p>Rien n'est perdu : les documents sont déposés, la proposition existe, et ce qui suit
      ne relit que des fichiers.</p>

      <ul class="analysis-failure__steps">
        <li><b>Relancez</b> — une lecture interrompue (réseau, fichier en cours d'écriture) aboutit souvent au second essai.</li>
        <li><b>Vérifiez les livrables</b> — un PDF vide, protégé par mot de passe ou entièrement scanné sans texte ne se lit pas. Ouvrez-les depuis l'onglet Dépôts.</li>
        <li><b>Si cela recommence</b> — l'onglet Actions garde le détail de chaque exécution : c'est là que se lit ce qui a échoué, et à quelle étape.</li>
      </ul>

      <div class="analysis-failure__actions">
        <button type="button" class="gh-btn gh-btn--primary" data-review-retry>Relancer l'analyse</button>
      </div>
    </div>
  `;
}

/** Ce que l'analyse a produit, en une phrase. */
function describeAnalysis(review) {
  const items = review.items ?? [];
  const avis = items.filter((entry) => entry.itemType === ITEM_TYPE.AVIS).length;
  const documents = items.filter((entry) => entry.itemType === ITEM_TYPE.DOCUMENT).length;
  const inchanges = Number.isFinite(review.diff?.unchanged) ? `, ${review.diff.unchanged} inchangé(s)` : "";
  const silences = (review.diff?.silent ?? []).length;

  return `${documents} livrable(s) soumis, ${avis} avis en mouvement${inchanges}${
    silences > 0 ? `, ${silences} non repris` : ""
  }.`;
}

/**
 * Va chercher les pixels des figures dessinées.
 *
 * Le stockage demande une autorisation : une balise `img` ne peut pas pointer
 * vers lui. On rapatrie donc chaque figure une fois, on garde le lien objet le
 * temps de la session, et on l'oublie avec l'écran — révoquer trop tôt
 * laisserait des cadres vides à la première réouverture d'onglet.
 */
const figureUrls = new Map();

function hydrateFigures(root) {
  const toutes = view.review?.figures ?? [];
  if (toutes.length === 0) return;

  const parId = new Map(toutes.map((figure) => [String(figure.id), figure]));

  for (const image of root.querySelectorAll("[data-figure-src]")) {
    const id = image.getAttribute("data-figure-src") || "";
    const connue = figureUrls.get(id);
    if (connue) {
      image.src = connue;
      continue;
    }

    const figure = parId.get(id);
    if (!figure) continue;

    import("../services/avis-figures-supabase.js")
      .then(({ loadFigureUrl }) => loadFigureUrl(figure))
      .then((url) => {
        if (!url) return;
        figureUrls.set(id, url);
        // L'écran a pu changer entre-temps : on ne pose la source que si
        // l'image est encore là.
        if (image.isConnected) image.src = url;
      })
      .catch(() => {
        // Une figure illisible laisse sa vignette vide plutôt que de faire
        // échouer la revue.
      });
  }

  for (const bouton of root.querySelectorAll("[data-figure-describe]")) {
    bouton.addEventListener("click", () => describeFigure(root, bouton));
  }

  for (const bouton of root.querySelectorAll("[data-figure-open]")) {
    bouton.addEventListener("click", () => {
      const url = figureUrls.get(bouton.getAttribute("data-figure-open") || "");
      if (url) window.open(url, "_blank");
    });
  }
}

/** Le nom d'un auteur, quelle que soit la forme sous laquelle il est rangé. */
function nameOfAuthor(entree) {
  if (!entree) return "Un collaborateur";
  return (typeof entree === "string" ? entree : entree.name) || "Un collaborateur";
}

/**
 * Ce qu'un livrable montre.
 *
 * Une fiche d'avis travaux ne fait souvent que montrer : une rubrique, une
 * lettre d'avis, une photo, et rien d'autre. Ses figures se lisent donc sous
 * leur document — c'est le seul endroit où elles se rattachent à coup sûr,
 * puisque la plupart des lignes ne portent aucun numéro d'avis.
 */
function renderDocumentFigures(document, toutes) {
  const figures = figuresOfDocument(document?.id, toutes);
  if (figures.length === 0) return "";

  return `<div class="review-figures review-figures--deposit">${figures.map(renderFigure).join("")}</div>`;
}

/**
 * Ouvre un livrable dans le visualiseur de l'application.
 *
 * **Visualiser n'est pas télécharger.** L'écran ouvrait le PDF dans un onglet
 * du navigateur, ce qui, selon le poste, l'enregistrait dans les
 * téléchargements : on demandait à vérifier une ligne, on repartait avec une
 * copie du document sur son disque. Ce sont deux gestes différents, et c'est le
 * premier qu'on voulait.
 *
 * Le lecteur est celui d'Atelier — mêmes classes, même rendu que l'onglet
 * Documents. Les octets viennent du stockage, qui demande une autorisation :
 * un lien direct ne fonctionnerait pas.
 */
async function openDeposit(root, bouton) {
  const id = bouton.getAttribute("data-deposit-open") || "";
  const ligne = (view.review?.documentRows ?? []).find((row) => String(row.id) === id);
  if (!ligne || bouton.disabled) return;

  releaseViewer();
  view.viewer = {
    documentId: id,
    // La page qu'on est venu voir, quand le geste en désigne une : ouvrir un
    // rapport de douze pages sur la première quand on cherche la septième
    // laisse le travail à faire.
    gotoPage: Number(bouton.getAttribute("data-deposit-page")) || null,
    name: ligne.original_filename ?? ligne.filename ?? "Document",
    page: 1,
    pageCount: 0,
    bytes: null,
    loading: true,
    error: null,
    drawn: false
  };
  showPdfViewer(root);

  try {
    const { downloadDocumentFile } = await import("../services/document-deposit.js");
    const fichier = await downloadDocumentFile(ligne);
    const octets = await fichier.arrayBuffer();

    // On a pu refermer le lecteur, ou en ouvrir un autre, pendant le
    // rapatriement : ce qui arrive ne décrirait plus ce qu'on regarde.
    if (view.viewer?.documentId !== id) return;

    view.viewer.bytes = octets;
    view.viewer.loading = false;
  } catch {
    if (view.viewer?.documentId !== id) return;
    view.viewer.loading = false;
    view.viewer.error = "Ce livrable n'a pas pu être lu depuis le stockage.";
  }

  showPdfViewer(root);
}

/** Ferme le lecteur, sans rien changer à la proposition. */
function closeViewer() {
  if (!view.viewer) return;
  // Le document pdf.js reste ouvert tant qu'on lit ; on le rend en partant.
  try {
    view.viewer.dispose?.();
  } catch {
    // sans conséquence : le lecteur disparaît de toute façon
  }
  view.viewer = null;
  // L'onglet n'a pas bougé : le redessiner ferait clignoter une liste qu'on
  // n'a pas touchée, et coûterait le rechargement de toutes ses vignettes.
  removePdfViewerHost();
}

/**
 * Le lecteur, page par page.
 *
 * Une page à la fois : un rapport de suivi de chantier en porte quarante, et
 * les dessiner toutes pour en lire une coûterait plusieurs secondes et autant
 * de mémoire. La barre dit toujours où l'on est — « page 3 sur 40 » — parce
 * qu'un lecteur sans repère ne permet pas de citer ce qu'on a vu.
 */
export function renderPdfViewer(etat = view.viewer) {
  const lecteur = etat;
  if (!lecteur) return "";

  const corps = lecteur.error
    ? `<div class="propositions-empty propositions-empty--warn"><b>Lecture impossible</b><p>${escapeHtml(
        lecteur.error
      )}</p></div>`
    : `<div class="review-pdf__canvas" data-review-pdf-canvas aria-busy="${lecteur.bytes ? "false" : "true"}">${
        lecteur.loading ? `<div class="propositions-empty"><b>Ouverture du livrable…</b></div>` : ""
      }</div>`;

  // Le document se parcourt, il ne se feuillette plus bouton par bouton : la
  // barre dit sa longueur, le défilement fait le reste.
  const pages = lecteur.pageCount > 0 ? `${lecteur.pageCount} page${lecteur.pageCount > 1 ? "s" : ""}` : "";

  return `
    <div class="review-pdf" role="dialog" aria-modal="true" aria-label="${escapeHtml(lecteur.name)}">
      <div class="review-pdf__panel">
        <header class="review-pdf__head">
          <div class="review-pdf__title">
            ${svgIcon("file-pdf", { className: "octicon" })}
            <span>${escapeHtml(lecteur.name)}</span>
          </div>
          <div class="review-pdf__nav">
            <span class="review-pdf__count mono">${escapeHtml(pages)}</span>
            <button type="button" class="icon-btn icon-btn--sm" data-review-pdf-close aria-label="Fermer le lecteur">✕</button>
          </div>
        </header>
        <div class="review-pdf__body">${corps}</div>
      </div>
    </div>
  `;
}

/**
 * Dessine la page courante.
 *
 * `drawn` évite de redessiner à chaque rendu de l'écran : un commentaire écrit
 * pendant qu'on lit un rapport ne doit pas relancer le rendu de sa page.
 */
async function drawPdfPage() {
  const lecteur = view.viewer;
  const hote = viewerHost?.querySelector("[data-review-pdf-canvas]");
  if (!lecteur?.bytes || !hote || lecteur.drawn) return;

  lecteur.drawn = true;

  try {
    const { renderPdfDocument } = await import("../services/ct-lab-pdf-view.js");
    const largeur = Math.max(320, (hote.clientWidth || 900) - 8);
    const { pageCount, dispose } = await renderPdfDocument(hote, { bytes: lecteur.bytes, width: largeur });

    // Le lecteur a pu se refermer pendant l'ouverture du document : ce qu'on
    // vient de préparer ne décrirait plus ce qu'on regarde.
    if (view.viewer !== lecteur) {
      dispose();
      return;
    }

    // Le document reste ouvert tant que le lecteur l'est : le refermer
    // obligerait à relire le fichier à chaque page qui approche de l'écran.
    lecteur.dispose = dispose;
    lecteur.pageCount = pageCount;
    syncViewerNav();

    // La page citée, amenée sous les yeux. Son cadre existe déjà — il porte sa
    // taille avant d'être peint —, donc le défilement est juste dès maintenant.
    if (lecteur.gotoPage > 1) {
      hote.querySelector(`[data-pdf-page="${lecteur.gotoPage}"]`)?.scrollIntoView({ block: "start" });
    }
  } catch (error) {
    if (view.viewer !== lecteur) return;
    lecteur.error = String(error?.message || "Ce livrable n'a pas pu être affiché.");
    if (viewerHost) viewerHost.innerHTML = renderPdfViewer();
  }
}

/**
 * Met la barre du lecteur à jour, sans toucher au canevas.
 *
 * Tout ce qui change à cet instant tient en trois éléments : le compteur et
 * l'état des deux flèches. Passer par un rendu complet pour cela détruirait la
 * page dessinée — c'est exactement le défaut qu'on corrige.
 */
function syncViewerNav() {
  const lecteur = view.viewer;
  if (!lecteur || !viewerHost) return;

  const compteur = viewerHost.querySelector(".review-pdf__count");
  if (compteur) {
    compteur.textContent =
      lecteur.pageCount > 0 ? `${lecteur.pageCount} page${lecteur.pageCount > 1 ? "s" : ""}` : "";
  }
}

/**
 * Les dépôts : ce qui est entré, quand, et par qui.
 *
 * L'équivalent des commits d'une pull request. Une proposition peut en
 * accumuler plusieurs — c'est ce qui la distingue d'un dépôt isolé — et les
 * montrer par geste plutôt que par fichier rend visible la façon dont un
 * dossier s'est constitué : un envoi de dix-sept livrables, puis un rapport
 * oublié trois jours plus tard.
 */
export function renderDeposits(review) {
  const depots = review.deposits ?? [];
  return `
    ${renderDepotDeLaProposition(review)}
    ${depots.map((depot) => renderDepotDeDocuments(depot, review.figures)).join("")}
    ${renderDepotLignes(view.open, review)}
  `;
}

/**
 * Le dépôt de la proposition elle-même.
 *
 * Verser le résultat d'un utilitaire **est** un dépôt : quelqu'un a produit de
 * la matière et l'apporte au projet. L'onglet ne montrait que des fichiers, et
 * une proposition venue de l'Atelier s'y lisait vide — comme si rien n'avait
 * été déposé.
 *
 * La carte se clique et mène aux Changements, comme un commit mène à son diff :
 * on lit ici *qu'*il y a eu un dépôt, on lit là-bas *ce qu'*il change.
 */
function renderDepotDeLaProposition(review) {
  const depot = depotDeLaProposition({
    proposition: view.open,
    // Les lignes brutes, pas celles du tableau : c'est leur `payload` qui dit
    // d'où vient chaque valeur — le texte et son article, ou l'utilitaire.
    affirmations: affirmationsDUneProposition(review.decisionRows ?? []),
    documents: review.documentRows ?? [],
    unreachable: review.unreachable ?? [],
    analyseFaite: !review.running && !review.error
  });

  const identite = identityOf(
    (review.story ?? []).find((event) => event.kind === STORY.OPENED) ?? {}
  );

  return `
    <section class="review-block">
      <div class="review-panel">
        <button type="button" class="depot-carte" data-review-goto-changes>
          <span class="depot-carte__icone">${svgIcon("git-commit", { className: "octicon" })}</span>
          <span class="depot-carte__corps">
            <span class="depot-carte__titre">${escapeHtml(depot.titre)}</span>
            <span class="depot-carte__meta">
              ${identite.avatarHtml ? `<span class="depot-carte__avatar">${identite.avatarHtml}</span>` : ""}
              <b>${escapeHtml(identite.displayName)}</b>
              ${depot.quand ? ` a déposé le ${escapeHtml(formatDate(depot.quand))}` : " a déposé"}
              · ${escapeHtml(resumeDuDepot(depot))}
            </span>
          </span>
          <span class="depot-carte__sceau depot-carte__sceau--${escapeHtml(depot.provenance)}"
            title="${escapeHtml(depot.pourquoi)}">${escapeHtml(depot.provenanceLabel)}</span>
        </button>
      </div>
    </section>
  `;
}

function renderDepotDeDocuments(depot, figures) {
  return [depot]
    .map(
      (depot) => `
        <section class="review-block">
          <div class="review-panel">
            <div class="deposit__head">
              <span class="deposit__icon">${svgIcon("git-commit", { className: "octicon" })}</span>
              <div>
                <b>${escapeHtml(depot.who)}</b> a déposé ${depot.documents.length} livrable(s)
                <span class="deposit__date">le ${escapeHtml(formatDate(depot.at))}</span>
              </div>
            </div>
            <ul class="review-list">
              ${depot.documents
                .map(
                  (document) => `
                    <li class="review-item review-item--plain deposit-item">
                      <span class="review-item__check">${svgIcon("file-pdf", { className: "octicon" })}</span>
                      <div class="review-item__body">
                        <span class="review-item__title">${escapeHtml(
                          document.original_filename ?? document.filename ?? "Document"
                        )}</span>
                        <span class="review-item__meta">
                          ${escapeHtml(document.detected_kind_label ?? "Nature inconnue")}
                          ${document.detected_author ? ` · ${escapeHtml(document.detected_author)}` : ""}
                          ${document.issued_at ? ` · émis le ${escapeHtml(formatDate(document.issued_at))}` : ""}
                          ${
                            // « Sur la foi de quoi ? » se répond en ouvrant le
                            // document. Le lien vit dans la ligne qui le
                            // décrit — sa nature, son auteur, sa date — et non
                            // dans une colonne à lui : c'est la même phrase
                            // qu'on prolonge. Il attend le survol : présent
                            // quand on le cherche, absent quand on lit la
                            // liste.
                            document.storage_path
                              ? `<span class="deposit-item__link"> · <button type="button" class="deposit-item__open" data-deposit-open="${escapeHtml(
                                  document.id ?? ""
                                )}" title="Visualiser le PDF">Visualiser le PDF</button></span>`
                              : ""
                          }
                        </span>
                        ${renderDocumentFigures(document, figures)}
                      </div>
                    </li>
                  `
                )
                .join("")}
            </ul>
          </div>
        </section>
      `
    )
    .join("");
}

/**
 * L'analyse : ce que la machine affirme, et ce qu'elle n'a pas pu lire.
 *
 * L'équivalent des checks. Elle se relit surtout dans un cas : quand un chiffre
 * du suivi surprend, six mois plus tard, et qu'on veut savoir quel moteur et
 * quel vocabulaire l'avaient produit.
 */
/**
 * Les contrôles d'un dépôt — la liste de checks d'une pull request.
 *
 * L'écran ne connaît aucun contrôle : il affiche ce que `depot-controles.js`
 * lui rend. Un contrôle de plus n'ajoute pas une ligne ici.
 */
function renderControles(proposition, review) {
  const rendu = passerLesControles(contexteDesControles(proposition, review));

  return `
    <section class="review-block">
      <div class="review-panel">
        <div class="review-block__head review-block__head--plain">
          <div class="review-block__headbody">
            <h3 class="review-block__title">
              Contrôles
              <span class="review-block__count">${rendu.lignes.length}</span>
            </h3>
            <span class="review-block__state${rendu.bloque ? " is-blocking" : ""}">${escapeHtml(
              resumeDesControles(rendu)
            )}</span>
          </div>
        </div>
        <ul class="controles">
          ${rendu.lignes
            .map(
              (ligne) => `
                <li class="controle controle--${escapeHtml(ligne.issue)}">
                  <span class="controle__pastille">${svgIcon(ligne.icone, { className: "octicon" })}</span>
                  <div class="controle__corps">
                    <span class="controle__label">${escapeHtml(ligne.label)}</span>
                    <span class="controle__phrase">${escapeHtml(ligne.phrase)}</span>
                    ${ligne.detail ? `<span class="controle__detail">${escapeHtml(ligne.detail)}</span>` : ""}
                  </div>
                  <span class="controle__issue">
                    ${escapeHtml(ligne.issueLabel)}
                    ${ligne.bloquant ? `<span class="controle__requis" title="Ce contrôle retient la fusion tant qu'il n'est pas tenu">requis</span>` : ""}
                  </span>
                </li>
              `
            )
            .join("")}
        </ul>
      </div>
    </section>
  `;
}

/**
 * Ce sur quoi les contrôles se prononcent.
 *
 * Rassemblé ici, une fois. Chaque contrôle y puise ce qui le concerne et ignore
 * le reste — c'est ce qui permet d'en ajouter un sans toucher aux autres.
 */
function contexteDesControles(proposition, review) {
  const items = review.items ?? [];
  const documents = review.documentRows ?? [];

  return {
    enCours: review.running === true,
    depot: depotDeLaProposition({
      proposition,
      affirmations: affirmationsDUneProposition(review.decisionRows ?? []),
      documents,
      unreachable: review.unreachable ?? [],
      analyseFaite: !review.running && !review.error
    }),
    conflits: review.conflicts ?? [],
    blocage: describeBlocking(review.conflicts ?? []),
    documents,
    unreachable: review.unreachable ?? [],
    analyseFaite: !review.running && !review.error,
    pile: review.frozen === true
      ? describeReadingStack(proposition.snapshot?.engine, proposition.snapshot?.packs)
      : describeReadingStack(
          review.result?.engineVersion,
          Object.values(review.result?.packsUsed ?? {}).map((pack) => `${pack.pack_id} v${pack.pack_version}`)
        ),
    avis: items.filter((entry) => entry.itemType === ITEM_TYPE.AVIS).length,
    avisHorsDepot: Number(review.diff?.horsDepot) || 0
  };
}

function renderAnalysis(proposition, review) {
  if (review.running) {
    return `
      ${renderControles(proposition, review)}
      <p class="review-empty-note">${escapeHtml(
        review.step || "Lecture des livrables du projet et de ceux de cette proposition."
      )}</p>
    `;
  }

  const gele = review.frozen === true;
  const snapshot = proposition.snapshot ?? null;
  const items = review.items ?? [];
  const avis = items.filter((entry) => entry.itemType === ITEM_TYPE.AVIS);

  const lignes = [
    ["Livrables soumis", `${items.filter((entry) => entry.itemType === ITEM_TYPE.DOCUMENT).length}`],
    ["Avis en mouvement", `${avis.length}`],
    [
      "Avis inchangés",
      Number.isFinite(review.diff?.unchanged) ? `${review.diff.unchanged}` : "non conservé"
    ],
    ["Affaires à trancher", `${items.filter((entry) => entry.itemType === ITEM_TYPE.ATTACHMENT).length}`],
    [
      "Livrables non rapatriés",
      review.unreachable.length > 0 ? nameSome(review.unreachable) : "aucun"
    ],
    [
      "Lu par",
      gele
        ? describeReadingStack(snapshot?.engine, snapshot?.packs) || "non conservé"
        : describeReadingStack(
            review.result?.engineVersion,
            Object.values(review.result?.packsUsed ?? {}).map((pack) => `${pack.pack_id} v${pack.pack_version}`)
          ) || "—"
    ]
  ];

  return `
    ${renderControles(proposition, review)}
    <section class="review-block">
      <div class="review-panel">
        <div class="review-block__head review-block__head--plain">
          <div class="review-block__headbody">
            <h3 class="review-block__title">${escapeHtml(
              gele ? "Ce que l'analyse avait lu" : "Ce que l'analyse a lu"
            )}</h3>
            <span class="review-block__state${review.error ? " is-blocking" : ""}">
              ${escapeHtml(review.error ? "n'a pas abouti" : "a abouti")}
            </span>
          </div>
        </div>
        <div class="analysis-rows">
          ${lignes
            .map(
              ([label, valeur]) => `
                <div class="analysis-row">
                  <span class="analysis-row__label">${escapeHtml(label)}</span>
                  <span class="analysis-row__value">${escapeHtml(valeur)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
    ${
      gele
        ? ""
        : `<p class="review-empty-note">
             L'analyse est refaite à chaque ouverture tant que la proposition est ouverte : c'est ce qui
             garantit qu'on décide sur l'état d'aujourd'hui. Une fois close, elle ne bouge plus.
           </p>`
    }
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Le tableau avant / après
 *
 * Une proposition qui n'affiche que ce qu'elle apporte demande de connaître par
 * cœur ce que le projet dit déjà. Personne ne le connaît. On met donc les deux
 * valeurs côte à côte, une ligne par sujet, et l'écart se lit sans rien ouvrir.
 *
 * L'ordre des lignes est celui du métier — du gros œuvre aux abords —, pas
 * l'ordre d'arrivée : on relit une proposition par domaine, jamais par ordre de
 * saisie.
 * ──────────────────────────────────────────────────────────────────────────── */

const CHANGEMENT_TONES = {
  [CHANGEMENT.NOUVEAU]: "avant-apres__tag--nouveau",
  [CHANGEMENT.CORRECTION]: "avant-apres__tag--correction",
  [CHANGEMENT.RETRAIT]: "avant-apres__tag--retrait",
  [CHANGEMENT.IDENTIQUE]: "avant-apres__tag--identique",
  [CHANGEMENT.INCONNU]: "avant-apres__tag--inconnu"
};

/** Une case vide se dit, elle ne se laisse pas blanche : blanc se lit « bug ». */
function renderCellule(valeur, absence) {
  return valeur
    ? `<span class="avant-apres__valeur">${escapeHtml(valeur)}</span>`
    : `<span class="avant-apres__vide">${escapeHtml(absence)}</span>`;
}

function renderAvantApres(proposition, review) {
  const tableau = review.avantApres;
  const lignes = tableau?.lignes ?? [];
  if (!lignes.length) return "";

  // Sur une proposition fusionnée, « aujourd'hui » désignerait un état qui
  // contient déjà ce qu'elle a écrit : les colonnes se nomment autrement.
  const fusionnee = proposition?.status === PROPOSITION.MERGED;
  const enteteGauche = fusionnee ? "Avant" : "Ce que le projet dit aujourd'hui";
  const enteteDroite = fusionnee ? "Après" : "Ce que cette proposition dit";
  const absenceGauche = fusionnee ? "rien avant" : "le projet ne dit rien";
  const absenceDroite = "sort de la mémoire";

  let domaineCourant = null;
  const corps = lignes
    .map((ligne) => {
      const enTete =
        ligne.domaineLabel !== domaineCourant
          ? `<tr class="avant-apres__domaine"><th colspan="4" scope="colgroup">${escapeHtml(ligne.domaineLabel)}</th></tr>`
          : "";
      domaineCourant = ligne.domaineLabel;

      const portee = Array.isArray(ligne.zones) && ligne.zones.length ? ligne.zones.join(", ") : "";
      const appui = [ligne.source, ligne.article].filter(Boolean).join(" · ");

      return `
        ${enTete}
        <tr class="avant-apres__ligne avant-apres__ligne--${escapeHtml(ligne.changement)}">
          <th scope="row" class="avant-apres__sujet">
            <span class="avant-apres__titre">${escapeHtml(ligne.sujet)}</span>
            ${portee ? `<span class="avant-apres__portee">${escapeHtml(portee)}</span>` : ""}
            ${appui ? `<span class="avant-apres__appui">${escapeHtml(appui)}</span>` : ""}
          </th>
          <td class="avant-apres__avant">${renderCellule(ligne.avant, absenceGauche)}</td>
          <td class="avant-apres__apres">${renderCellule(ligne.apres, absenceDroite)}</td>
          <td class="avant-apres__etat">
            <span class="avant-apres__tag ${CHANGEMENT_TONES[ligne.changement] ?? ""}">${escapeHtml(
              CHANGEMENT_LABELS[ligne.changement] ?? ligne.changement
            )}</span>
            ${ligne.refusee ? `<span class="avant-apres__refus">écartée</span>` : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="review-block">
      <div class="review-panel">
        <div class="review-block__head review-block__head--plain">
          <div class="review-block__headbody">
            <h3 class="review-block__title">
              Affirmations
              <span class="review-block__count">${lignes.length}</span>
            </h3>
            <span class="review-block__state">${escapeHtml(resumeDuTableau(tableau))}</span>
          </div>
        </div>
        <div class="avant-apres__scroll">
          <table class="avant-apres">
            <thead>
              <tr>
                <th scope="col">Sujet</th>
                <th scope="col">${escapeHtml(enteteGauche)}</th>
                <th scope="col">${escapeHtml(enteteDroite)}</th>
                <th scope="col">Ce qui change</th>
              </tr>
            </thead>
            <tbody>${corps}</tbody>
          </table>
        </div>
        ${
          tableau.memoireLue
            ? ""
            : `<p class="review-silent__note">
                 La mémoire du projet n'a pas pu être lue : la colonne de gauche manque, et aucune ligne
                 ne prétend être nouvelle. Rouvrir la proposition relira.
               </p>`
        }
      </div>
    </section>
  `;
}

/** Ce qui change : les contradictions d'abord, puis les affirmations. */
/**
 * Ce que le dépôt apporte, ligne par ligne — et ce qu'on en accepte.
 *
 * C'est le contenu d'un commit, pas celui d'un diff. GitHub sépare les deux
 * pour une raison qui vaut ici : un commit est un **acte**, daté, signé, avec
 * ce qu'il apporte ; un diff est une **soustraction**, que personne ne signe.
 * Les cases à cocher appartiennent à l'acte — on accepte ou l'on refuse ce qui
 * est déposé, pas un écart.
 *
 * Une différence assumée avec GitHub : là-bas on ne prend pas un commit ligne
 * par ligne. Ici si, parce qu'un rapport de bureau de contrôle n'est pas un
 * patch qu'on prend ou qu'on laisse en bloc — on lève un avis et pas l'autre.
 */
function renderDepotLignes(proposition, review) {
  const items = review.items ?? [];
  const parType = (type) => items.filter((entry) => entry.itemType === type);
  const gele = review.frozen === true;

  if (review.running) {
    return `<p class="review-empty-note">${escapeHtml(
      review.step || "Les documents, les rattachements et les avis arrivent avec l'analyse."
    )}</p>`;
  }

  return `
    ${renderConflicts(review.conflicts ?? [])}
    ${renderReviewBlock(
      ITEM_TYPE.DOCUMENT,
      "Documents",
      parType(ITEM_TYPE.DOCUMENT),
      renderDocumentItem,
      "Cette proposition n'apporte aucun document."
    )}
    ${renderReviewBlock(
      ITEM_TYPE.ATTACHMENT,
      "Rattachements",
      parType(ITEM_TYPE.ATTACHMENT),
      renderAttachmentItem,
      "Toutes les affaires du lot sont déjà rattachées à ce projet : rien à trancher."
    )}
    ${renderReviewBlock(
      ITEM_TYPE.AVIS,
      "Avis",
      parType(ITEM_TYPE.AVIS),
      renderAvisItem,
      Number.isFinite(review.diff?.unchanged)
        ? `Aucun avis ne change. ${review.diff.unchanged} avis restent en l'état.`
        : gele
          ? "Aucun avis ne changeait, ou l'état conservé ne le dit pas."
          : "Aucun livrable exploitable : il n'y a pas d'avis à en tirer."
    )}
    ${renderSilentAvis(review)}
  `;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les changements : un diff, et rien d'autre
 *
 * Une barre latérale qui range ce qui a bougé, un panneau qui montre l'écart
 * champ par champ. Le châssis est celui de GitHub ; l'unité comparée ne l'est
 * pas — ce n'est pas la ligne de texte, c'est le **repère** : un avis, un
 * article, un point d'ordre du jour, une donnée de base. Voir
 * `depot-reperes.js` pour ce qui a mené là.
 *
 * L'écran ne connaît aucun de ces types. Il affiche ce que le moteur lui rend,
 * et un carburant de plus n'ajoute pas une ligne ici.
 * ──────────────────────────────────────────────────────────────────────────── */

function renderChanges(proposition, review) {
  const diff = review.diffDuDepot ?? { lignes: [], compte: {} };
  const lignes = diff.lignes ?? [];

  if (review.running && lignes.length === 0) {
    return `<p class="review-empty-note">${escapeHtml(
      review.step || "Les écarts se calculent au fur et à mesure de la lecture des livrables."
    )}</p>`;
  }

  if (lignes.length === 0) {
    return `<div class="propositions-empty"><b>Rien à comparer</b><p>Ce dépôt n'apporte aucun repère identifié.</p></div>`;
  }

  const groupes = arbreDesReperes(lignes);
  const ouverte = view.diffTreeOpen !== false;
  const largeur = ouverte ? Math.max(220, Math.min(520, Number(view.diffTreeWidth) || 280)) : 0;

  return `
    <div class="diff-barre">
      <button type="button" class="documents-tree__toggle" data-diff-tree-toggle
        aria-label="${escapeHtml(ouverte ? "Replier la barre latérale" : "Étendre la barre latérale")}"
        title="${escapeHtml(ouverte ? "Replier la barre latérale" : "Étendre la barre latérale")}">
        ${svgIcon(ouverte ? "sidebar-collapse" : "sidebar-expand", { className: "octicon" })}
      </button>
      <span class="diff-barre__resume">${escapeHtml(resumeDuDiff(diff.compte))}</span>
      <button type="button" class="gh-btn gh-btn--primary gh-btn--sm" data-diff-comment-open>
        Soumettre un commentaire
      </button>
    </div>

    <div class="diff-layout${ouverte ? "" : " diff-layout--replie"}" style="--diff-tree-width:${largeur}px">
      ${renderDiffTree(groupes, ouverte)}
      <div class="diff-corps">
        ${groupes.map(renderDiffGroupe).join("")}
      </div>
    </div>
    ${renderDiffCommentBox(proposition, review)}
  `;
}

/**
 * L'arborescence, celle de l'onglet Documents.
 *
 * Mêmes classes, même allure, même poignée de redimensionnement : deux
 * arborescences qui se ressemblent à peu près donnent l'impression de deux
 * applications. Le chemin d'un repère devient une hiérarchie réelle —
 * « Données de base » puis « Structure » —, et non un libellé où l'on aurait
 * écrit une barre oblique.
 */
function renderDiffTree(groupes, ouverte) {
  // Deux rangs, parce que le chemin en a deux : la famille, puis la rubrique.
  // Les aplatir en « Données de base / Structure » ferait d'une hiérarchie une
  // chaîne de caractères, et l'on ne replierait plus une famille entière.
  const familles = new Map();
  for (const groupe of groupes) {
    const racine = groupe.chemin[0] ?? "Sans rubrique";
    if (!familles.has(racine)) familles.set(racine, []);
    familles.get(racine).push(groupe);
  }

  const corps = [...familles.entries()]
    .map(([racine, enfants]) => {
      const replieeFamille = view.diffTreeReplies?.has(racine) === true;
      const bouge = enfants.reduce((total, groupe) => total + groupe.compte, 0);

      return `
        <div class="documents-tree__row">
          <button type="button" class="documents-tree__caret" data-diff-tree-fold="${escapeHtml(racine)}"
            aria-expanded="${replieeFamille ? "false" : "true"}">
            ${svgIcon(replieeFamille ? "chevron-right" : "chevron-down", { className: "octicon" })}
          </button>
          <button type="button" class="documents-tree__item" data-diff-tree-fold="${escapeHtml(racine)}">
            <span class="documents-tree__icon-slot">${svgIcon("file-directory", { className: "octicon" })}</span>
            <span class="documents-tree__label">${escapeHtml(racine)}</span>
            ${bouge > 0 ? `<span class="diff-tree__compte">${bouge}</span>` : ""}
          </button>
        </div>
        ${
          replieeFamille
            ? ""
            : enfants
                .map(
                  (groupe) => `
                    <div class="documents-tree__row">
                      <span class="documents-tree__indent"><span class="documents-tree__divider is-expanded"></span></span>
                      <span class="documents-tree__caret-spacer"></span>
                      <button type="button" class="documents-tree__item" data-diff-goto="${escapeHtml(groupe.cle)}">
                        <span class="documents-tree__icon-slot">${svgIcon("file-directory", { className: "octicon" })}</span>
                        <span class="documents-tree__label">${escapeHtml(groupe.chemin[1] ?? groupe.label)}</span>
                        ${groupe.compte > 0 ? `<span class="diff-tree__compte">${groupe.compte}</span>` : ""}
                      </button>
                    </div>
                  `
                )
                .join("")
        }
      `;
    })
    .join("");

  return `
    <aside class="documents-tree diff-tree${ouverte ? " is-open" : " is-collapsed"}" aria-label="Ce qui a changé">
      <div class="documents-tree__panel">${corps}</div>
      ${renderSideResizer({ id: "propositionDiffTreeResize", className: "documents-tree__resize-handle" })}
    </aside>
  `;
}

/**
 * Un groupe et ses lignes — la « hunk » d'un diff.
 *
 * Cinq valeurs de neige et de vent occupaient cinq encadrés séparés, chacun
 * avec son en-tête et son pied. On regroupe : un titre par rubrique, puis les
 * lignes, numérotées. C'est exactement la lecture d'un fichier dans un diff, et
 * c'est ce qu'on cherchait.
 */
function renderDiffGroupe(groupe) {
  const replie = view.diffGroupesReplies?.has(groupe.cle) === true;
  // Deux compteurs, comme dans un diff unifié : la ligne d'avant et celle
  // d'après. Une valeur retirée n'a pas de numéro à droite, une valeur ajoutée
  // n'en a pas à gauche — et c'est ce déséquilibre qui se lit d'un coup d'œil.
  const numero = { avant: 0, apres: 0 };
  const corps = groupe.lignes.map((ligne) => lignesDuRepere(groupe, ligne, numero)).join("");

  return `
    <section class="diff-groupe" id="diff-groupe-${escapeHtml(cleHtml(groupe.cle))}">
      <header class="diff-groupe__tete">
        <button type="button" class="diff-groupe__caret" data-diff-groupe-fold="${escapeHtml(groupe.cle)}"
          aria-expanded="${replie ? "false" : "true"}">
          ${svgIcon(replie ? "chevron-right" : "chevron-down", { className: "octicon" })}
        </button>
        <button type="button" class="diff-groupe__titre" data-diff-groupe-fold="${escapeHtml(groupe.cle)}">
          ${escapeHtml(groupe.chemin.join(" / "))}
        </button>
        <span class="diff-groupe__compte">${groupe.lignes.length} entrée${groupe.lignes.length > 1 ? "s" : ""}</span>
      </header>
      ${replie ? "" : `<div class="diff-groupe__corps">${corps}</div>`}
    </section>
  `;
}

/**
 * Les lignes d'un repère.
 *
 * Un champ modifié en fait deux — l'avant et l'après —, un champ inchangé une
 * seule, sans signe : c'est la ligne de contexte d'un diff de code. Le nom du
 * champ n'apparaît que lorsque le repère en porte plusieurs : sur une donnée de
 * base, qui n'a qu'une valeur, écrire « Valeur » à chaque ligne n'apprend rien.
 */
function lignesDuRepere(groupe, ligne, numero) {
  const plusieurs = ligne.champs.length > 1;
  const libelle = (champ) => (plusieurs ? `${ligne.titre} · ${champ.nom}` : ligne.titre);

  return ligne.champs
    .map((champ, rang) => {
      const ancre = { groupe, ligne, champ, rang };

      if (champ.etat === ETAT.INCHANGE) {
        numero.avant += 1;
        numero.apres += 1;
        return renderDiffLigne({
          gauche: numero.avant, droite: numero.apres, signe: " ",
          nom: libelle(champ), valeur: champ.apres || champ.avant, ton: "inchange",
          ancre: { ...ancre, cote: COTE.CONTEXTE }
        });
      }

      const cellules = [];
      if (champ.avant) {
        numero.avant += 1;
        cellules.push(renderDiffLigne({
          gauche: numero.avant, droite: null, signe: "-",
          nom: libelle(champ), valeur: champ.avant, ton: "retire",
          ancre: { ...ancre, cote: COTE.AVANT }
        }));
      }
      if (champ.apres) {
        numero.apres += 1;
        cellules.push(renderDiffLigne({
          gauche: null, droite: numero.apres, signe: "+",
          nom: libelle(champ), valeur: champ.apres, ton: "ajoute",
          ancre: { ...ancre, cote: COTE.APRES }
        }));
      }
      return cellules.join("");
    })
    .join("");
}

/**
 * Une ligne du diff, et le bouton qui l'annote.
 *
 * Deux colonnes de numéros, comme dans un diff unifié. Ce ne sont pas des
 * numéros de lignes d'un fichier — il n'y a pas de fichier — mais des repères
 * de lecture : un point où poser le doigt quand on discute à deux devant
 * l'écran, et l'endroit d'où part une remarque.
 *
 * **Ce à quoi la remarque se rattache n'est pas le numéro.** C'est le repère,
 * son champ, et son côté. Un commentaire ancré sur « la ligne 3 » deviendrait
 * faux au premier dépôt qui insère une valeur au-dessus ; ancré sur
 * `affirmation:zone-de-neige · Valeur`, il reste juste. C'est la différence
 * avec GitHub, dont les commentaires passent « outdated » — et elle nous est
 * offerte par le travail déjà fait sur les repères.
 */
function renderDiffLigne({ gauche, droite, signe, nom, valeur, ton, ancre }) {
  const cle = ancreDeLigne(ancre);

  return `
    <div class="diff-ligne diff-ligne--${escapeHtml(ton)}">
      <span class="diff-ligne__num">${gauche ?? ""}</span>
      <span class="diff-ligne__num">${droite ?? ""}</span>
      <button type="button" class="diff-ligne__annoter" data-diff-annoter="${escapeHtml(cle)}"
        title="Commenter cette ligne" aria-label="Commenter cette ligne">
        ${svgIcon("plus", { className: "octicon" })}
      </button>
      <span class="diff-ligne__signe">${escapeHtml(signe)}</span>
      <span class="diff-ligne__nom">${escapeHtml(nom)}</span>
      <span class="diff-ligne__valeur">${escapeHtml(valeur || "—")}</span>
    </div>
  `;
}

/**
 * De quel côté de l'écart une ligne se trouve.
 *
 * Une modification en produit deux — la valeur d'avant, celle d'après — et
 * elles se commentent séparément. Sans ce côté dans l'adresse, une remarque
 * posée sur « A1 » citait « A2 » : le signe d'une ligne et la valeur de
 * l'autre. C'est la sonde de rendu qui l'a montré.
 */
const COTE = { AVANT: "avant", APRES: "apres", CONTEXTE: "contexte" };

/**
 * L'adresse d'une ligne, stable d'un dépôt à l'autre.
 *
 * Le repère, le champ, le côté. Rien du numéro affiché, qui bougera dès qu'un
 * dépôt insérera une valeur au-dessus.
 */
function ancreDeLigne({ ligne, champ, rang, cote }) {
  return `${ligne.id}|${champ.nom || rang}|${cote}`;
}

/** Retrouver la ligne visée à partir de son adresse. */
function ligneDeLAncre(cle) {
  for (const groupe of arbreDesReperes(view.review?.diffDuDepot?.lignes ?? [])) {
    for (const ligne of groupe.lignes) {
      for (const [rang, champ] of ligne.champs.entries()) {
        for (const cote of Object.values(COTE)) {
          if (ancreDeLigne({ ligne, champ, rang, cote }) === cle) return { groupe, ligne, champ, cote };
        }
      }
    }
  }
  return null;
}

/**
 * L'extrait qui part avec la remarque.
 *
 * Le commentaire va dans le fil, où il se relira dans six mois — quand le
 * dépôt aura été fusionné et que l'écran des changements aura disparu. Sans
 * l'extrait, il ne resterait qu'un avis sur rien. On l'écrit donc **dans le
 * message**, en clair, plutôt que de le rattacher à un état qui ne durera pas.
 */
export function extraitDeLaLigne(cible) {
  if (!cible) return "";
  const { groupe, ligne, champ, cote } = cible;
  // Le signe et la valeur viennent du **même** côté. Les mélanger citait « - »
  // devant la valeur d'après : une remarque sur ce que personne n'avait écrit.
  const signe = cote === COTE.AVANT ? "-" : cote === COTE.APRES ? "+" : " ";
  const valeur = cote === COTE.AVANT ? champ.avant : champ.apres || champ.avant;
  const nom = ligne.champs.length > 1 ? `${ligne.titre} · ${champ.nom}` : ligne.titre;

  return [
    `> **${groupe.chemin.join(" / ")}**`,
    ">",
    "> ```",
    `> ${signe} ${nom} : ${valeur || "—"}`,
    "> ```",
    ""
  ].join("\n");
}

/** Une clé de chemin, utilisable comme identifiant HTML. */
function cleHtml(cle) {
  return String(cle ?? "").replace(/[^\w-]+/g, "-");
}

/**
 * Écrire depuis le diff.
 *
 * C'est là qu'on a la remarque en tête — devant l'écart, pas au bout d'une
 * conversation qu'il faut aller rouvrir. Le message part **dans le fil**, où
 * il se relira six mois plus tard avec le reste : un commentaire rangé à part
 * dans un onglet de diff serait perdu le jour où la proposition est close.
 */
function renderDiffCommentBox(proposition, review) {
  if (!view.diffComment) return "";

  return `
    <div class="diff-comment" data-diff-comment>
      <div class="diff-comment__voile" data-diff-comment-close></div>
      <div class="diff-comment__boite" role="dialog" aria-modal="true" aria-label="Soumettre un commentaire">
        <header class="diff-comment__tete">
          <b>Soumettre un commentaire</b>
          <button type="button" class="merge-drawer__fermer" data-diff-comment-close
            aria-label="Fermer">${svgIcon("x", { className: "octicon" })}</button>
        </header>
        ${renderCommentComposer({
          hideAvatar: true,
          hideTitle: true,
          previewMode: view.diffPreview === true,
          textareaId: "propositionDiffComment",
          previewId: "propositionDiffCommentPreview",
          textareaValue: view.diffDraft ?? "",
          textareaAttributes: { "data-diff-comment-draft": "1" },
          placeholder: "Ce que cet écart vous inspire — il se relira dans six mois.",
          composerClassName: "comment-composer--proposition-diff",
          tabWriteAction: "proposition-diff-tab-write",
          tabPreviewAction: "proposition-diff-tab-preview",
          previewHtml: humanTextHtml(view.diffDraft ?? ""),
          hintHtml: review.commentNotice
            ? `<span class="review-comment__notice">${escapeHtml(review.commentNotice)}</span>`
            : "",
          actionsHtml: `
            <button type="button" class="gh-btn gh-btn--sm" data-diff-comment-close>Annuler</button>
            <button type="button" class="gh-btn gh-btn--sm gh-btn--primary" data-diff-comment-post ${
              String(view.diffDraft ?? "").trim() && !review.posting ? "" : "disabled"
            }>${review.posting ? "Envoi…" : "Soumettre"}</button>
          `
        })}
      </div>
    </div>
  `;
}

/**
 * Ce que le lot ne reprend pas.
 *
 * Un rapport de visite ne rappelle pas tout ce qui existe : il porte ce qui a
 * été créé ou modifié depuis le précédent. Les avis qu'il ne cite pas n'ont pas
 * bougé — et les compter comme des mouvements demandait de confirmer
 * soixante-douze fois ce que personne n'avait dit.
 *
 * Le silence reste écrit, parce qu'il fait partie de ce qu'on a vu ce jour-là.
 * Il n'est simplement pas une décision à prendre : aucune case, aucun bouton.
 */
function renderSilentAvis(review) {
  const silencieux = review.diff?.silent ?? [];
  if (silencieux.length === 0) return "";

  return `
    <section class="review-block">
      <div class="review-panel">
        <div class="review-block__head review-block__head--plain">
          <div class="review-block__headbody">
            <h3 class="review-block__title">
              Non repris par ce lot
              <span class="review-block__count">${silencieux.length}</span>
            </h3>
            <span class="review-block__state">rien à décider</span>
          </div>
        </div>
        <p class="review-silent__note">
          Aucun document de cette proposition ne parle de ces avis. Un rapport ne rappelle pas tout
          ce qui existe : ils restent dans l'état où le dernier document les a laissés.
        </p>
        <ul class="review-list">
          ${silencieux
            .slice(0, 12)
            .map(
              (avis) => `
                <li class="review-item review-item--plain">
                  <span class="review-item__check">${svgIcon("dot-fill-pending", { className: "octicon" })}</span>
                  <div class="review-item__body">
                    <span class="review-item__title">${escapeHtml(
                      `Avis ${avis.reference}${avis.title ? ` — ${avis.title}` : ""}`
                    )}</span>
                    <span class="review-item__meta">${escapeHtml(
                      `reste ${STATUS_LABELS[avis.previousStatus] ?? avis.previousStatus ?? "en l'état"}`
                    )}</span>
                  </div>
                </li>
              `
            )
            .join("")}
        </ul>
        ${
          silencieux.length > 12
            ? `<p class="review-silent__note">et ${silencieux.length - 12} autre(s).</p>`
            : ""
        }
      </div>
    </section>
  `;
}

function renderReview(root) {
  const proposition = view.open;
  const review = view.review;
  const entete = renderReviewHead(proposition, review);

  // La conversation et les affirmations n'attendent plus l'analyse : elles sont
  // en base. Ce qui reste à savoir — où en est la lecture des livrables — se
  // dit dans la barre de titre, visible depuis les quatre onglets. Le plein
  // cadre « Analyse en cours… » cachait une page entière déjà écrite.
  if (!review || (review.running && !review.story)) {
    return `
      ${entete}
      <div class="propositions-empty">
        <b>Ouverture de la proposition…</b>
        <p>Lecture de la discussion, des dépôts et de ce que le projet dit déjà.</p>
      </div>
    `;
  }

  if (!review.running && review.error && (review.items ?? []).length === 0) {
    return `${entete}${renderAnalysisFailure(review)}`;
  }

  const gele = review.frozen === true;
  const onglet = REVIEW_TABS.some((tab) => tab.id === view.tab) ? view.tab : "conversation";

  const avertissement = review.notice
    ? `<div class="propositions-empty propositions-empty--warn"><b>Réponse non conservée</b><p>${escapeHtml(
        review.notice
      )}</p></div>`
    : "";

  // Ce qui continue après la fusion.
  //
  // La décision est prise dès que la base a marqué la proposition fusionnée :
  // l'écran le dit à cet instant-là, et non à la fin des écritures qui suivent.
  // Celles-ci — la mémoire, les drapeaux, le suivi des avis — se disent ici,
  // pendant qu'elles se font. Attendre pour tout montrer d'un coup laissait
  // l'écran figé sur le formulaire pendant près de deux minutes, sans rien qui
  // dise si l'on avait cliqué.
  const suite = review.finishing
    ? `<div class="review-finishing">
         <span class="review-finishing__spin">${svgIcon("sync", { className: "octicon" })}</span>
         <span>${escapeHtml(review.step || "Écritures en cours…")}</span>
       </div>`
    : "";

  const panneau =
    onglet === "deposits"
      ? renderDeposits(review)
      : onglet === "analysis"
        ? renderAnalysis(proposition, review)
        : onglet === "changes"
          ? renderChanges(proposition, review)
          : renderConversation(proposition, review);

  return `
    ${entete}
    ${gele ? renderFrozenNote(proposition, review) : ""}
    ${suite}
    ${avertissement}
    <div class="review-tabs-row${onglet === "changes" ? " review-tabs-row--pleine" : ""}">
      ${renderLightTabs({
        tabs: reviewTabs(review),
        activeTabId: onglet,
        className: "review-tabs",
        ariaLabel: "Sections de la proposition"
      })}
      ${renderDiffStat(review)}
    </div>
    <div class="review-tabpanel${onglet === "changes" ? " review-tabpanel--pleine" : ""}">${panneau}</div>
  `;
}

/**
 * Le compactage de l'en-tête au défilement.
 *
 * Deux sources, parce qu'une seule s'est révélée insuffisante. L'écouteur de
 * défilement d'abord — le mécanisme des sujets, repris tel quel. Et l'état que
 * **la coque du projet** calcule déjà : c'est elle qui compacte sa propre barre,
 * elle sait donc quel élément défile, y compris quand ce n'est pas le document.
 * L'en-tête d'une proposition n'a aucune raison de le savoir moins bien qu'elle.
 *
 * L'abonnement se remplace à chaque rendu : sans quoi chaque affichage
 * laisserait un écouteur de plus sur `window`.
 */
let compactSubscription = null;

/** L'en-tête global s'efface quand la barre compacte prend sa place. */
function setTopCompact(on) {
  document.body.classList.toggle("project-proposition-details-top-compact", !!on);
}

function bindReviewCompact(root) {
  const sync = bindOverlayChromeCompact(
    document.documentElement,
    root.querySelector("[data-review-chrome]"),
    "propositions",
    {
      alsoCompactWhen: () => document.body.classList.contains("project-shell-compact"),
      // La barre compacte prend la place de l'en-tête global — elle ne passe pas
      // devant. `#app` est un contexte d'empilement : un `z-index` posé à
      // l'intérieur ne peut pas monter au-dessus d'un élément extérieur, et la
      // barre se dessinait derrière l'en-tête, donc invisible. Les sujets
      // masquent l'en-tête par cette même bascule depuis le début.
      onCompactChange: (scrolled) => setTopCompact(scrolled)
    }
  );

  if (compactSubscription) {
    window.removeEventListener(PROJECT_SHELL_COMPACT_CHANGE_EVENT, compactSubscription);
    compactSubscription = null;
  }
  if (!sync) return;

  compactSubscription = () => sync();
  window.addEventListener(PROJECT_SHELL_COMPACT_CHANGE_EVENT, compactSubscription);
}

/**
 * L'export : ce que l'écran tient, écrit dans un fichier.
 *
 * Rien n'est relu ni recalculé — on écrit `view.open` et `view.review` tels
 * qu'ils sont. C'est la seule façon qu'un export serve à vérifier l'écran :
 * s'il repassait par la base, il pourrait dire autre chose que ce qu'on voit,
 * et ne prouverait plus rien.
 */
function bindExportButton(root) {
  bindGhActionButtons();

  const action = root.querySelector('[data-action-id="propositionExport"]');
  if (!action) return;

  action.addEventListener("ghaction:action", async (event) => {
    const quoi = String(event.detail?.action || "");
    if (!quoi.startsWith("export:")) return;
    if (!view.open) return;

    const [{ buildPropositionExport, propositionExportCsv, propositionExportFilename }, telechargement] =
      await Promise.all([
        import("../services/proposition-export.js"),
        import("../utils/download-file.js")
      ]);

    const exporte = buildPropositionExport({
      proposition: view.open,
      review: view.review,
      project: store.projectForm ?? {},
      generatedAt: new Date().toISOString()
    });
    if (!exporte) return;

    if (quoi === "export:csv") {
      telechargement.downloadCsvFile({
        filename: propositionExportFilename(exporte, "csv"),
        text: propositionExportCsv(exporte)
      });
      return;
    }

    telechargement.downloadJsonFile({
      filename: propositionExportFilename(exporte, "json"),
      data: exporte
    });
  });
}

/**
 * Échap ferme le lecteur, où qu'on ait le curseur.
 *
 * Écouté une seule fois, sur le document : un abonnement par rendu en
 * laisserait un de plus à chaque frappe dans le champ de commentaire.
 */
let viewerEscapeBound = false;

function bindViewerEscape() {
  if (viewerEscapeBound) return;
  viewerEscapeBound = true;

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !view.viewer || !mountedRoot?.isConnected) return;
    closeViewer();
  });
}

/**
 * L'hôte du lecteur, **à la racine du document**.
 *
 * `#app` est un contexte d'empilement, et il commence sous le bandeau de
 * l'application : un panneau posé à l'intérieur passe forcément **derrière**
 * l'en-tête, quel que soit son `z-index` — un `z-index` ne franchit pas la
 * frontière d'un contexte. On voyait donc la barre du lecteur coupée par le
 * bandeau. La descendre de 90px l'aurait dégagée en amputant d'autant la
 * hauteur de lecture : ce n'est pas la position qu'il fallait corriger, c'est
 * l'endroit où le panneau est accroché.
 *
 * C'est le geste que l'application fait déjà pour ses autres panneaux flottants.
 */
let viewerHost = null;

function pdfViewerHost() {
  if (viewerHost?.isConnected) return viewerHost;

  viewerHost = document.createElement("div");
  viewerHost.className = "review-pdf-host";
  document.body.appendChild(viewerHost);
  return viewerHost;
}

function removePdfViewerHost() {
  viewerHost?.remove();
  viewerHost = null;
}

/** Le lecteur qu'on remplace rend d'abord le document qu'il tenait. */
function releaseViewer() {
  try {
    view.viewer?.dispose?.();
  } catch {
    // sans conséquence
  }
}

/**
 * Monte le lecteur, ou le remonte quand son état a changé.
 *
 * Appelé aux seuls moments où le lecteur change — on l'ouvre, ses octets
 * arrivent, sa lecture échoue — et **jamais depuis le rendu de l'onglet**. Le
 * panneau vit hors de la coque du projet ; le redessiner à chaque rendu de
 * l'écran effacerait la page qu'on est en train de lire dès qu'un commentaire
 * est écrit à côté. Feuilleter, lui, ne remonte rien : il repeint la page.
 */
function showPdfViewer(root) {
  if (!view.viewer) {
    removePdfViewerHost();
    return;
  }

  bindViewerEscape();

  const hote = pdfViewerHost();
  hote.innerHTML = renderPdfViewer();

  hote.querySelector("[data-review-pdf-close]")?.addEventListener("click", () => closeViewer());

  // Fermer d'un clic hors du panneau et de la touche Échap : ce sont les deux
  // gestes qu'on tente sans réfléchir devant une lecture ouverte.
  hote.querySelector(".review-pdf")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeViewer();
  });

  // Le panneau est neuf : la page qu'il portait n'y est plus.
  view.viewer.drawn = false;
  drawPdfPage();
}

/** Le retour à la liste, les cases, les raisons, et la fusion. */
/**
 * La poignée de l'arborescence du diff.
 *
 * Le même composant que l'arbre des Documents et le rail de la Mémoire : une
 * seule façon de redimensionner, donc une seule façon de se tromper.
 */
function bindDiffTreeResize(root) {
  const handle = root.querySelector("#propositionDiffTreeResize");
  if (!handle) return;

  bindSideResizer({
    handle,
    guide: root.querySelector("#propositionDiffTreeResizeGuide"),
    getWidth: () => Number(view.diffTreeWidth) || 280,
    onResize: (largeur) => {
      view.diffTreeWidth = largeur;
      // Pendant le glissé, on écrit la variable : refaire l'écran à chaque
      // pixel le rendrait poussif, et redimensionner sans voir revient à viser
      // en aveugle.
      root.querySelector(".diff-layout")?.style.setProperty("--diff-tree-width", `${largeur}px`);
    },
    onEnd: (largeur) => {
      view.diffTreeWidth = largeur;
      renderContent(root);
    }
  });
}

/**
 * Écrire depuis le diff.
 *
 * Le message part dans le fil de la conversation, pas dans un coin de l'onglet :
 * c'est là qu'on relira, six mois plus tard, pourquoi cette valeur-là a été
 * discutée. Le fil le range tout seul — avant l'encart de fusion tant que la
 * proposition est ouverte, après le procès-verbal une fois qu'elle est close.
 */
function bindDiffComment(root) {
  root.querySelector("[data-diff-comment-open]")?.addEventListener("click", () => {
    view.diffComment = true;
    view.diffPreview = false;
    renderContent(root);
  });

  // Commenter une ligne : la boîte s'ouvre avec l'extrait déjà écrit, et le
  // curseur en dessous. On ne recopie pas la valeur dont on parle — c'est
  // précisément ce qu'on recopiait de travers.
  for (const bouton of root.querySelectorAll("[data-diff-annoter]")) {
    bouton.addEventListener("click", () => {
      const cible = ligneDeLAncre(bouton.getAttribute("data-diff-annoter"));
      const extrait = extraitDeLaLigne(cible);
      view.diffDraft = extrait ? `${extrait}\n` : "";
      view.diffComment = true;
      view.diffPreview = false;
      renderContent(root);
      // Le curseur va après l'extrait : on écrit sa remarque, on ne réédite pas
      // la citation.
      const champ = root.querySelector("[data-diff-comment-draft]");
      if (champ) {
        champ.focus();
        champ.setSelectionRange(champ.value.length, champ.value.length);
      }
    });
  }

  for (const bouton of root.querySelectorAll("[data-diff-comment-close]")) {
    bouton.addEventListener("click", () => {
      view.diffComment = false;
      renderContent(root);
    });
  }

  const champ = root.querySelector("[data-diff-comment-draft]");
  if (champ) {
    champ.addEventListener("input", (event) => {
      view.diffDraft = event.target.value;
      // Le bouton s'active à la première lettre, mais la frappe ne redessine
      // rien : un rendu par touche ferait sauter le curseur.
      const envoyer = root.querySelector("[data-diff-comment-post]");
      if (envoyer) envoyer.disabled = !String(view.diffDraft).trim();
    });
  }

  root.querySelector('[data-action="proposition-diff-tab-preview"]')?.addEventListener("click", () => {
    view.diffPreview = true;
    renderContent(root);
  });
  root.querySelector('[data-action="proposition-diff-tab-write"]')?.addEventListener("click", () => {
    view.diffPreview = false;
    renderContent(root);
  });

  root.querySelector("[data-diff-comment-post]")?.addEventListener("click", () => postComment(root, { source: "diff" }));
}

/**
 * Les gestes du pavé de fusion, où qu'il soit rendu.
 *
 * Deux racines possibles — l'écran, et le panneau monté sur `document.body` —
 * pour un seul jeu de gestes. `scope` dit où chercher les boutons ; `root` dit
 * quoi redessiner, et c'est toujours l'écran.
 */
function bindMergePanel(scope, root) {
  // Le premier clic ouvre le formulaire ; c'est « Confirmer » qui fusionne.
  scope.querySelector("[data-review-merge]")?.addEventListener("click", () => {
    const { title, note } = defaultMergeMessage({ proposition: view.open, items: view.review?.items ?? [] });
    view.mergeTitle = title;
    view.mergeNote = note;
    view.review.confirming = true;
    renderContent(root);
  });

  for (const bouton of scope.querySelectorAll("[data-merge-drawer-close]")) {
    bouton.addEventListener("click", () => {
      view.mergeDrawer = false;
      view.review.confirming = false;
      renderContent(root);
    });
  }

  scope.querySelector("[data-merge-cancel]")?.addEventListener("click", () => {
    // Annuler le formulaire ne referme pas le panneau : on revient aux
    // conditions, qui sont ce qu'on relit avant de renoncer ou de recommencer.
    view.review.confirming = false;
    renderContent(root);
  });

  const titre = scope.querySelector("[data-merge-title]");
  if (titre) titre.addEventListener("input", (event) => { view.mergeTitle = event.target.value; });
  const note = scope.querySelector("[data-merge-note]");
  if (note) note.addEventListener("input", (event) => { view.mergeNote = event.target.value; });

  scope.querySelector("[data-merge-confirm]")?.addEventListener("click", () => merge(root));

  // « Régler les conflits » ne fusionne rien : il emmène là où l'on trancherait.
  // La carte d'un dépôt y mène aussi — un dépôt dit qu'il s'est passé quelque
  // chose, les Changements disent quoi, comme un commit mène à son diff.
  for (const bouton of scope.querySelectorAll("[data-review-goto-changes]")) {
    bouton.addEventListener("click", () => {
      view.tab = "changes";
      view.mergeDrawer = false;
      renderContent(root);
    });
  }

  for (const bouton of scope.querySelectorAll("[data-review-goto-checks]")) {
    bouton.addEventListener("click", () => {
      view.tab = "analysis";
      view.mergeDrawer = false;
      renderContent(root);
    });
  }
}

function bindReview(root) {
  // Le même mécanisme que pour un sujet : la page défile, la coque prend
  // `overlay-chrome--compact`, l'en-tête prend `details-head--compact`, et le
  // CSS partagé échange les deux titres.
  bindReviewCompact(root);

  bindExportButton(root);

  hydrateFigures(root);

  for (const bouton of root.querySelectorAll("[data-deposit-open]")) {
    bouton.addEventListener("click", () => openDeposit(root, bouton));
  }

  // Relancer, c'est refaire ce que l'ouverture fait : rien d'autre n'a besoin
  // d'exister, et une seconde façon de lancer l'analyse divergerait de la
  // première au premier changement.
  for (const bouton of root.querySelectorAll("[data-review-retry]")) {
    bouton.addEventListener("click", () => {
      const id = view.open?.id;
      if (id) openProposition(root, id);
    });
  }

  // Changer d'onglet ne relance rien : les quatre panneaux lisent le même état.
  bindLightTabs(root, {
    onChange(tabId) {
      view.tab = tabId;
      renderContent(root);
    }
  });

  // Une case de tête à moitié cochée ne s'écrit pas en HTML : c'est une
  // propriété, pas un attribut.
  for (const box of root.querySelectorAll('[data-indeterminate="1"]')) box.indeterminate = true;

  for (const box of root.querySelectorAll("[data-review-item]")) {
    box.addEventListener("change", () => {
      const item = findItem(box.getAttribute("data-review-item"));
      if (item) decide(root, [item], box.checked ? ITEM.ACCEPTED : ITEM.REFUSED);
    });
  }

  for (const box of root.querySelectorAll("[data-review-block]")) {
    box.addEventListener("change", () => {
      const type = box.getAttribute("data-review-block");
      const items = (view.review?.items ?? []).filter((entry) => entry.itemType === type);
      decide(root, items, box.checked ? ITEM.ACCEPTED : ITEM.REFUSED);
    });
  }

  for (const champ of root.querySelectorAll("[data-review-reason]")) {
    // À la sortie du champ, pas à chaque frappe : écrire une lettre à la fois
    // ferait une requête par caractère.
    champ.addEventListener("change", () => {
      const item = findItem(champ.getAttribute("data-review-reason"));
      if (item) decide(root, [item], ITEM.REFUSED, champ.value);
    });
  }

  // Trancher une contradiction, c'est décider de l'affirmation elle-même :
  // garder ce qui avait été décidé, c'est refuser ce que l'analyse propose.
  for (const bouton of root.querySelectorAll("[data-conflict-keep]")) {
    bouton.addEventListener("click", () => {
      const item = findItem(bouton.getAttribute("data-conflict-keep"));
      if (item) decide(root, [item], ITEM.REFUSED);
    });
  }

  for (const bouton of root.querySelectorAll("[data-conflict-take]")) {
    bouton.addEventListener("click", () => {
      const item = findItem(bouton.getAttribute("data-conflict-take"));
      if (item) decide(root, [item], ITEM.ACCEPTED);
    });
  }

  bindConversation(root);
  bindRefLinks(root);

  // Les blocs de l'onglet Dépôts se déplient au clic — sur le caret comme sur
  // le titre : viser un chevron de douze pixels est un geste de précision pour
  // une action qui n'en demande aucune.
  for (const bouton of root.querySelectorAll("[data-review-block-toggle]")) {
    bouton.addEventListener("click", () => {
      const type = bouton.getAttribute("data-review-block-toggle");
      if (view.blocsOuverts.has(type)) view.blocsOuverts.delete(type);
      else view.blocsOuverts.add(type);
      renderContent(root);
    });
  }

  // La barre latérale du diff se replie, comme celle des Documents : sur un
  // dépôt de trois cents repères on veut la voir, sur trois on veut la place.
  root.querySelector("[data-diff-tree-toggle]")?.addEventListener("click", () => {
    view.diffTreeOpen = view.diffTreeOpen === false;
    renderContent(root);
  });

  for (const bouton of root.querySelectorAll("[data-diff-tree-fold]")) {
    bouton.addEventListener("click", () => {
      const racine = bouton.getAttribute("data-diff-tree-fold");
      if (view.diffTreeReplies.has(racine)) view.diffTreeReplies.delete(racine);
      else view.diffTreeReplies.add(racine);
      renderContent(root);
    });
  }

  for (const bouton of root.querySelectorAll("[data-diff-groupe-fold]")) {
    bouton.addEventListener("click", () => {
      const cle = bouton.getAttribute("data-diff-groupe-fold");
      if (view.diffGroupesReplies.has(cle)) view.diffGroupesReplies.delete(cle);
      else view.diffGroupesReplies.add(cle);
      renderContent(root);
    });
  }

  for (const bouton of root.querySelectorAll("[data-diff-goto]")) {
    bouton.addEventListener("click", () => {
      const cible = root.querySelector(`#diff-groupe-${CSS.escape(cleHtml(bouton.getAttribute("data-diff-goto")))}`);
      cible?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  bindDiffTreeResize(root);
  bindDiffComment(root);

  // Le bouton de la barre de titre : il ouvre le panneau, il ne fusionne pas.
  root.querySelector("[data-merge-open]")?.addEventListener("click", () => {
    view.mergeDrawer = true;
    view.review.confirming = false;
    renderContent(root);
  });

  bindMergePanel(root, root);
  root.querySelector("[data-review-abandon]")?.addEventListener("click", () => abandon(root));
}

/**
 * Écrire, relire, envoyer, modifier, retirer.
 *
 * La frappe ne redessine rien : le texte se conserve dans l'état de l'écran, et
 * l'écran ne se rejoue qu'aux moments qui le méritent — bascule d'onglet, envoi,
 * annulation. Redessiner à chaque touche ferait sauter le curseur.
 */
function bindConversation(root) {
  const draft = root.querySelector("[data-comment-draft]");
  if (draft) {
    draft.addEventListener("input", (event) => {
      view.draft = event.target.value;
      syncComposerActions(root);
      syncRefMenu(root, event.target);
    });
    // Le curseur seul peut entrer ou sortir d'un `#` déjà écrit : la frappe
    // n'est pas le seul geste qui change ce qu'on est en train de citer.
    draft.addEventListener("click", () => syncRefMenu(root, draft));
    draft.addEventListener("keyup", (event) => {
      if (event.key === "Escape") {
        closeRefMenu(root);
        return;
      }
      if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
        syncRefMenu(root, draft);
      }
    });
  }

  for (const bouton of root.querySelectorAll("[data-ref-pick]")) {
    bouton.addEventListener("click", () => pickRef(root, bouton.getAttribute("data-ref-pick")));
  }

  for (const champ of root.querySelectorAll("[data-comment-edit-draft]")) {
    champ.addEventListener("input", (event) => {
      view.editDraft = event.target.value;
    });
  }

  root.querySelector('[data-action="proposition-tab-preview"]')?.addEventListener("click", () => {
    view.preview = true;
    renderContent(root);
  });
  root.querySelector('[data-action="proposition-tab-write"]')?.addEventListener("click", () => {
    view.preview = false;
    renderContent(root);
  });
  root.querySelector('[data-action="proposition-edit-tab-preview"]')?.addEventListener("click", () => {
    view.editPreview = true;
    renderContent(root);
  });
  root.querySelector('[data-action="proposition-edit-tab-write"]')?.addEventListener("click", () => {
    view.editPreview = false;
    renderContent(root);
  });

  // Une note ratée se redemande : c'est un appel qui a échoué, pas un état du
  // dossier. On repart des mêmes faits, ceux que l'analyse a déjà établis.
  root.querySelector("[data-note-retry]")?.addEventListener("click", () => retryDepositNote(root));

  root.querySelector("[data-comment-post]")?.addEventListener("click", () => postComment(root));

  for (const bouton of root.querySelectorAll("[data-comment-edit]")) {
    bouton.addEventListener("click", () => {
      const id = bouton.getAttribute("data-comment-edit");
      const message = (view.review?.story ?? []).find((event) => event.commentId === id);
      view.editing = id;
      view.editDraft = message?.body ?? "";
      view.editPreview = false;
      renderContent(root);
    });
  }

  root.querySelector("[data-comment-edit-cancel]")?.addEventListener("click", () => {
    view.editing = null;
    view.editDraft = "";
    renderContent(root);
  });

  root.querySelector("[data-comment-edit-save]")?.addEventListener("click", (event) => {
    saveComment(root, event.currentTarget.getAttribute("data-comment-edit-save"));
  });

  for (const bouton of root.querySelectorAll("[data-comment-remove]")) {
    bouton.addEventListener("click", () => removeComment(root, bouton.getAttribute("data-comment-remove")));
  }

  root.querySelector("[data-proposition-defaire]")
    ?.addEventListener("click", () => void defaireLaProposition(root));
}

/**
 * Défaire une proposition fusionnée.
 *
 * **On avance en défaisant, on ne recule jamais.** Rien n'est effacé et rien
 * n'est rejoué à l'envers : on prépare une proposition de plus, celle qui remet
 * ce qui valait avant, et quelqu'un la signe. La mémoire portera l'aller **et**
 * le retour, ce qui est exactement ce qu'on veut relire six mois plus tard.
 */
async function defaireLaProposition(root) {
  const proposition = view.open;
  if (!proposition?.id || proposition.status !== PROPOSITION.MERGED) return;
  if (view.review?.defaisant) return;

  view.review.defaisant = true;
  view.review.notice = null;
  renderContent(root);

  try {
    const [
      { ceQuUnePropositionADonne, itemsPourDefaire, titreDuDefaire, descriptionDuDefaire },
      { listProjectAssertions },
      { preparerUneProposition },
      propositionsApi
    ] = await Promise.all([
      import("../services/proposition-defaire.js"),
      import("../services/project-memory-supabase.js"),
      import("../services/atelier-proposition.js"),
      import("../services/propositions-supabase.js")
    ]);

    const memoire = await listProjectAssertions(proposition.project_id);
    if (memoire === null) {
      view.review.defaisant = false;
      // Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien : proposer de
      // défaire sur une mémoire qu'on n'a pas lue écrirait n'importe quoi.
      view.review.notice = "La mémoire du projet n'a pas pu être lue : rien n'a été préparé.";
      renderContent(root);
      return;
    }

    const { restaurations, retraits, depassees } = ceQuUnePropositionADonne(proposition, memoire);
    // Les documents que cette proposition avait fait entrer au corpus en
    // sortent : c'est la moitié documentaire du même geste.
    const documents = (await propositionsApi.listPropositionDocuments(proposition.id))
      .filter((document) => String(document?.corpus_state ?? "accepted") === "accepted");

    const items = itemsPourDefaire({ restaurations, retraits, documents });
    if (!items.length) {
      view.review.defaisant = false;
      view.review.notice = depassees.length
        ? "Rien à défaire : tout ce que cette proposition avait posé a déjà été remplacé depuis."
        : "Rien à défaire : cette proposition n'a rien laissé en mémoire ni au corpus.";
      renderContent(root);
      return;
    }

    const rendu = await preparerUneProposition({
      projectId: proposition.project_id,
      titre: titreDuDefaire(proposition),
      affirmations: items,
      // Ce qu'on remet, ce qu'on écarte, et ce qu'on laisse : une liste de
      // valeurs ne dirait pas la troisième, qui est la plus importante.
      description: descriptionDuDefaire({ proposition, restaurations, retraits, depassees, documents })
    });

    view.review.defaisant = false;
    if (!rendu.ok) {
      view.review.notice = rendu.raison;
      renderContent(root);
      return;
    }

    // La liste se recharge en même temps qu'on ouvre : sans cela, la proposition
    // qu'on vient de préparer n'existerait pas dans le rail derrière elle.
    view.review.notice = null;
    view.propositions = [rendu.proposition, ...(view.propositions ?? [])];
    openProposition(root, rendu.proposition.id);
  } catch (erreur) {
    view.review.defaisant = false;
    view.review.notice = `La proposition qui défait n'a pas pu être préparée. ${erreur?.message || ""}`.trim();
    renderContent(root);
  }
}

/**
 * Les citations mènent quelque part.
 *
 * Une proposition citée s'ouvre ici même — c'est le même écran. Un sujet cité
 * change d'onglet : le fil d'une proposition n'est pas le lieu où lire un sujet,
 * et l'y déplier ferait deux écrans dans un seul.
 */
function bindRefLinks(root) {
  for (const lien of root.querySelectorAll(".md-proposition-link[data-proposition-id]")) {
    lien.addEventListener("click", (event) => {
      event.preventDefault();
      openProposition(root, lien.dataset.propositionId);
    });
  }

  for (const lien of root.querySelectorAll(".md-subject-link[data-subject-id]")) {
    lien.addEventListener("click", (event) => {
      event.preventDefault();
      const id = lien.dataset.subjectId;
      if (!id) return;
      // On passe par la route du projet : c'est elle qui sait monter l'onglet
      // Sujets et sa coque, ce qu'un lien ne peut pas faire tout seul. Le lien
      // ouvre l'onglet, pas encore le sujet précis : le déplier depuis ici
      // demanderait d'atteindre la mécanique de sélection des sujets, et un
      // demi-mécanisme vaut moins qu'un geste qui fait ce qu'il annonce.
      const projectId = String(store.currentProjectId || "");
      if (!projectId || !id) return;
      window.location.hash = `#project/${encodeURIComponent(projectId)}/sujets`;
    });
  }
}

/**
 * Ouvre, met à jour ou referme le menu des citations.
 *
 * Le menu ne se rouvre pas tout seul après un choix : on vient de citer, la
 * suite de la phrase n'a pas à être interrompue par une liste.
 */
/**
 * Les boutons suivent ce qui est écrit, sans redessiner.
 *
 * Redessiner à chaque touche ferait perdre le curseur ; ne rien faire faisait
 * pire — le bouton « Commenter » naissait désactivé et le restait, si bien
 * qu'un message écrit ne pouvait pas partir et que rien ne le disait.
 */
function syncComposerActions(root) {
  const actions = composerActions({
    draft: view.draft,
    posting: view.review?.posting,
    abandoning: view.review?.abandoning
  });

  const envoyer = root.querySelector("[data-comment-post]");
  if (envoyer) envoyer.disabled = !actions.canPost;

  const fermer = root.querySelector("[data-review-abandon-label]");
  if (fermer) fermer.textContent = actions.closeLabel;
}

function syncRefMenu(root, textarea) {
  const contexte = resolveRefTriggerContext(textarea.value ?? "", textarea.selectionStart ?? 0);
  if (!contexte) {
    if (view.refMenu?.open) closeRefMenu(root);
    return;
  }

  const suggestions = searchRefSuggestions(view.refs ?? [], contexte.query, 8);
  const avant = view.refMenu;
  view.refMenu = { open: true, ...contexte, suggestions, activeIndex: 0 };

  // Ne redessiner que si la liste a changé : autrement le champ perdrait le
  // focus à chaque touche.
  const memeListe =
    avant?.open &&
    avant.suggestions?.length === suggestions.length &&
    avant.suggestions.every((entry, index) => entry.id === suggestions[index].id);
  if (!memeListe) renderMenuOnly(root);
}

function closeRefMenu(root) {
  if (!view.refMenu?.open) return;
  view.refMenu = null;
  renderMenuOnly(root);
}

/**
 * Redessine le seul menu.
 *
 * Rejouer tout l'écran remplacerait le champ et ferait sauter le curseur au
 * milieu d'une phrase : c'est le genre de détail qui rend un éditeur pénible.
 */
function renderMenuOnly(root) {
  const hote = root.querySelector("[data-ref-menu]");
  const html = renderRefMenu();

  if (hote) {
    hote.outerHTML = html || "";
  } else if (html) {
    root.querySelector(".comment-composer--proposition")?.insertAdjacentHTML("afterend", html);
  }

  for (const bouton of root.querySelectorAll("[data-ref-pick]")) {
    bouton.addEventListener("click", () => pickRef(root, bouton.getAttribute("data-ref-pick")));
  }
}

/** Écrit la citation choisie à la place du `#` en cours. */
function pickRef(root, cle) {
  const [kind, numero] = String(cle ?? "").split(":");
  const suggestion = { kind, number: Number(numero) };
  const textarea = root.querySelector("[data-comment-draft]");
  if (!textarea || !view.refMenu?.open) return;

  const resultat = applyRefSuggestion(textarea.value ?? "", view.refMenu, suggestion);
  view.draft = resultat.nextText;
  textarea.value = resultat.nextText;
  textarea.setSelectionRange(resultat.nextCursorIndex, resultat.nextCursorIndex);
  textarea.focus();

  closeRefMenu(root);
}

/** Relit les messages et refait l'histoire, sans relancer l'analyse. */
async function refreshComments(root) {
  const proposition = view.open;
  if (!proposition || !view.review) return;

  const [{ listPropositionComments }, propositions] = await Promise.all([
    import("../services/proposition-comments.js"),
    import("../services/propositions-supabase.js")
  ]);

  const comments = await listPropositionComments(proposition.id);
  const names = await propositions.loadAuthors([
    proposition.created_by,
    proposition.merged_by,
    proposition.closed_by,
    ...comments.map((row) => row.author_id),
    ...(view.review.authorIds ?? [])
  ]);

  view.review.comments = comments;
  view.review.authors = names;
  view.review.story = buildStory({
    proposition,
    documents: view.review.documentRows ?? [],
    decisions: view.review.decisionRows ?? [],
    comments,
    names
  });

  if (root.isConnected) renderContent(root);
}

async function postComment(root, { keepGoing = false, source = "conversation" } = {}) {
  const proposition = view.open;
  // Deux champs pour un seul fil : celui du bas de la conversation, et celui de
  // la boîte ouverte depuis le diff. Ce qu'ils écrivent va au même endroit.
  const depuisLeDiff = source === "diff";
  const texte = String((depuisLeDiff ? view.diffDraft : view.draft) ?? "").trim();
  if (!proposition || !texte || view.review.posting) return;

  view.review.posting = true;
  view.review.commentNotice = null;
  if (!keepGoing) renderContent(root);

  try {
    const { addPropositionComment } = await import("../services/proposition-comments.js");
    const ecrit = await addPropositionComment({
      propositionId: proposition.id,
      projectId: proposition.project_id,
      body: texte
    });

    view.review.posting = false;
    if (!ecrit) {
      // Ne pas effacer le texte : il n'est nulle part ailleurs, et le perdre
      // pour une base injoignable serait la pire façon de l'apprendre.
      view.review.commentNotice = "Le message n'a pas pu être envoyé. Il est toujours là.";
      renderContent(root);
      return;
    }

    if (depuisLeDiff) {
      view.diffDraft = "";
      view.diffPreview = false;
      view.diffComment = false;
    } else {
      view.draft = "";
      view.preview = false;
    }
    if (!keepGoing) await refreshComments(root);
  } catch {
    view.review.posting = false;
    view.review.commentNotice = "Le message n'a pas pu être envoyé. Il est toujours là.";
    renderContent(root);
  }
}

async function saveComment(root, commentId) {
  const texte = String(view.editDraft ?? "").trim();
  if (!commentId || !texte) return;

  try {
    const { editPropositionComment } = await import("../services/proposition-comments.js");
    const ecrit = await editPropositionComment({ commentId, body: texte });
    if (!ecrit) {
      view.review.commentNotice = "La modification n'a pas pu être enregistrée.";
      renderContent(root);
      return;
    }

    view.editing = null;
    view.editDraft = "";
    await refreshComments(root);
  } catch {
    view.review.commentNotice = "La modification n'a pas pu être enregistrée.";
    renderContent(root);
  }
}

async function removeComment(root, commentId) {
  if (!commentId) return;

  try {
    const { removePropositionComment } = await import("../services/proposition-comments.js");
    // Retirer n'efface pas : le texte reste en base, l'écran cesse de le
    // montrer. Un message retiré est aussi ce à quoi d'autres ont répondu.
    const ok = await removePropositionComment(commentId);
    if (!ok) {
      view.review.commentNotice = "Le message n'a pas pu être retiré.";
      renderContent(root);
      return;
    }
    await refreshComments(root);
  } catch {
    view.review.commentNotice = "Le message n'a pas pu être retiré.";
    renderContent(root);
  }
}

function findItem(cle) {
  const [itemType, ...reste] = String(cle ?? "").split("|");
  const itemKey = reste.join("|");
  return (view.review?.items ?? []).find((entry) => entry.itemType === itemType && entry.itemKey === itemKey) ?? null;
}

function backToList(root) {
  view.open = null;
  view.review = null;
  releaseViewer();
  view.viewer = null;
  removePdfViewerHost();
  // Sans quoi l'en-tête global resterait masqué sur la liste, et ailleurs.
  setTopCompact(false);
  setPropositionsHeader();
  renderContent(root);
}

/**
 * L'humain tranche, seul ou en bloc.
 *
 * Rien n'est affiché comme tranché si la base n'a pas répondu : laisser croire
 * qu'une réponse a été retenue alors qu'elle est perdue ferait reposer la même
 * question au prochain rechargement, sans qu'on comprenne pourquoi.
 */
async function decide(root, items, status, reason = null) {
  if (items.length === 0) return;

  const decisions = items.map((item) => ({
    item,
    status,
    // Une raison ne se conserve que sur un refus : la garder sur une acceptation
    // laisserait traîner le motif d'un refus qu'on vient d'annuler.
    reason: status === ITEM.REFUSED ? (reason ?? item.reason ?? null) : null
  }));

  try {
    const { decidePropositionItems } = await import("../services/propositions-supabase.js");
    const ok = await decidePropositionItems({
      propositionId: view.open.id,
      projectId: view.open.project_id,
      decisions
    });

    if (!ok) {
      view.review.notice = "La réponse n'a pas pu être enregistrée. Elle sera redemandée.";
      renderContent(root);
      return;
    }
  } catch {
    view.review.notice = "La réponse n'a pas pu être enregistrée. Elle sera redemandée.";
    renderContent(root);
    return;
  }

  for (const decision of decisions) {
    decision.item.status = decision.status;
    decision.item.reason = decision.reason;
  }
  view.review.notice = null;
  renderContent(root);
}

/**
 * Applique la proposition au corpus.
 *
 * Fusionner n'enregistre pas un état : cela enregistre des réponses. Les
 * documents acceptés entrent, les refusés sont marqués — jamais supprimés —, les
 * rattachements tranchés rejoignent la mémoire du projet avec leur signe, et le
 * suivi des avis est réécrit par un recalcul complet.
 *
 * Le suivi est réécrit **après** l'entrée des documents, jamais avant : il doit
 * refléter le corpus tel qu'il est devenu, pas tel qu'il était.
 */
async function merge(root) {
  const proposition = view.open;
  const items = view.review?.items ?? [];
  if (!proposition || proposition.status !== PROPOSITION.OPEN || view.review.merging) return;

  // Le bouton est déjà désactivé ; la règle est répétée ici parce qu'elle n'a
  // pas à dépendre de l'état d'un bouton pour tenir.
  if (unresolvedConflicts(view.review.conflicts ?? []).length > 0) return;

  view.review.merging = true;
  view.review.notice = null;
  renderContent(root);

  try {
    const [propositions, { rememberProjectMarkers }, { markersToRemember }] = await Promise.all([
      import("../services/propositions-supabase.js"),
      import("../services/project-identity-supabase.js"),
      import("../services/project-identity.js")
    ]);

    // Geler avant de fermer. Une proposition marquée fusionnée dont l'état
    // n'aurait pas été écrit serait précisément le procès-verbal manquant
    // qu'on cherche à ne plus produire — et rien ne permettrait de le
    // reconstituer après coup.
    const gele = await freeze(propositions, proposition);
    if (!gele) {
      view.review.merging = false;
      view.review.notice = "L'état de la proposition n'a pas pu être conservé. Rien n'a été fusionné.";
      renderContent(root);
      return;
    }

    const documents = items.filter((entry) => entry.itemType === ITEM_TYPE.DOCUMENT);
    const applique = await propositions.mergeProposition({
      proposition,
      acceptedDocumentIds: documents.filter((entry) => entry.status !== ITEM.REFUSED).map((entry) => entry.itemKey),
      refusedDocumentIds: documents.filter((entry) => entry.status === ITEM.REFUSED).map((entry) => entry.itemKey),
      snapshot: gele,
      // Ce que quelqu'un a écrit en signant. Il ne se réécrit pas ensuite.
      mergeTitle: String(view.mergeTitle ?? "").trim(),
      mergeNote: String(view.mergeNote ?? "").trim()
    });

    if (!applique) {
      view.review.merging = false;
      view.review.notice = "La fusion n'a pas abouti. La proposition reste ouverte : rien n'a été perdu.";
      renderContent(root);
      return;
    }

    view.review.merging = false;
    view.review.confirming = false;
    // Le panneau se referme : ce qu'il proposait vient d'avoir lieu.
    view.mergeDrawer = false;
    // L'écran devient le procès-verbal sans attendre un rechargement : les
    // cases disparaissent, l'état affiché est celui qu'on vient d'arrêter.
    view.review.frozen = true;
    view.open = {
      ...proposition,
      status: PROPOSITION.MERGED,
      // La date et l'auteur sont ceux que la base a reçus, pas ceux que l'écran
      // reconstituerait de son côté.
      merged_at: applique.mergedAt ?? new Date().toISOString(),
      merged_by: applique.mergedBy ?? null,
      merge_title: String(view.mergeTitle ?? "").trim(),
      merge_note: String(view.mergeNote ?? "").trim(),
      snapshot: gele
    };

    // **On l'affiche maintenant.** La base a marqué la proposition fusionnée :
    // c'est fait, et rien de ce qui suit ne peut le défaire. Tout ce qui restait
    // — les rattachements, la mémoire, le suivi des avis — s'écrivait avant le
    // premier rendu, et l'écran restait sur son formulaire près de deux minutes
    // sans dire s'il avait entendu le clic.
    //
    // L'histoire se refait ici avec les noms déjà chargés : recharger les
    // auteurs pour afficher la fusion ferait attendre un aller-retour de plus
    // pour un nom qu'on a en main. `restoryAfterClosing` la reprendra ensuite,
    // avec celui de la personne qui vient de signer.
    view.review.finishing = true;
    view.review.step = "Écriture de la mémoire du projet";
    view.review.story = buildStory({
      proposition: view.open,
      documents: view.review.documentRows ?? [],
      decisions: view.review.decisionRows ?? [],
      comments: view.review.comments ?? [],
      names: view.review.authors ?? new Map()
    });
    renderContent(root);

    // Les rattachements tranchés deviennent la mémoire du projet, avec leur
    // signe : accepté rattache l'affaire, refusé l'écarte pour de bon.
    const rattachements = items.filter((entry) => entry.itemType === ITEM_TYPE.ATTACHMENT);
    for (const entry of rattachements) {
      const rejected = entry.status === ITEM.REFUSED;
      await rememberProjectMarkers(
        proposition.project_id,
        markersToRemember(entry.payload.markers ?? [], [], { rejected })
      );
    }

    // Ce que la proposition fait entrer devient la mémoire du projet : des
    // affirmations datées, signées, tracées jusqu'à la proposition qui les a
    // portées — y compris celles qu'on a écartées. Un refus est une
    // information, et souvent la plus sûre.
    //
    // L'échec ne défait pas la fusion : les documents sont entrés, le suivi
    // sera réécrit, et la mémoire se rattrape depuis l'onglet Mémoire. Le taire
    // serait pire — on croirait la mémoire à jour.
    try {
      const memoire = await import("../services/project-memory-supabase.js");
      const verse = await memoire.rememberProposition({ proposition: view.open, items });
      if (!verse) {
        view.review.notice =
          "Les documents sont entrés, mais la mémoire du projet n'a pas pu être mise à jour. " +
          "Elle se rattrape depuis l'onglet Mémoire.";
      }
    } catch {
      view.review.notice =
        "Les documents sont entrés, mais la mémoire du projet n'a pas pu être mise à jour. " +
        "Elle se rattrape depuis l'onglet Mémoire.";
    }

    // L'histoire se refait maintenant : sans cela, le fil resterait celui d'une
    // proposition ouverte — sans acte de fusion, sans carte de fin — jusqu'au
    // prochain rechargement, et un message écrit dans la foulée se retrouverait
    // avant une fusion déjà faite.
    await restoryAfterClosing(propositions);

    // La liste dit la même chose que l'écran. Sans cela, revenir en arrière
    // montrerait la proposition encore ouverte, et la rouvrir la ferait
    // ré-analyser — précisément ce qu'une proposition close ne doit plus subir.
    const ligne = (view.propositions ?? []).find((entry) => entry.id === proposition.id);
    if (ligne) Object.assign(ligne, view.open);
    store.projectPropositionsView = { openCount: getOpenPropositionCount() };

    await recomputeAfterMerge(root, proposition);

    // Le tableau avant / après se relit sur ce que la fusion a écrit : « avant »
    // n'est plus l'état d'aujourd'hui mais ce que la proposition a remplacé.
    await relireLeTableau(proposition);
    view.review.finishing = false;
    view.review.step = "";
  } catch {
    view.review.merging = false;
    view.review.finishing = false;
    view.review.notice = "La fusion n'a pas abouti. La proposition reste ouverte : rien n'a été perdu.";
  }

  renderContent(root);
}

/**
 * Relit le tableau avant / après après une fusion.
 *
 * La mémoire porte désormais ce que la proposition a écrit : lue telle quelle,
 * elle afficherait la même valeur des deux côtés. `tableauAvantApres` sait le
 * faire — encore faut-il lui redonner la mémoire d'après, et une proposition
 * dont le statut a changé.
 */
async function relireLeTableau(proposition) {
  if (!view.open || view.open.id !== proposition.id || !view.review) return;

  try {
    const { listProjectAssertions } = await import("../services/project-memory-supabase.js");
    const affirmations = await listProjectAssertions(proposition.project_id);
    if (!view.open || view.open.id !== proposition.id || !view.review) return;

    view.review.avantApres = tableauAvantApres({
      proposition: view.open,
      items: view.review.decisionRows ?? [],
      assertions: affirmations
    });
    recalculerLeDiff(view.review);
  } catch {
    // Le tableau reste celui d'avant la fusion. Il est daté par l'écran qui le
    // porte, et une relecture ratée ne défait pas une fusion.
  }
}

/**
 * Les figures des rapports déposés.
 *
 * Un rapport de bureau de contrôle montre autant qu'il écrit — et une fiche
 * d'avis travaux ne fait souvent que montrer : une rubrique, une lettre, une
 * photo. On lit donc les images là où le document les pose, et la ligne du
 * tableau à laquelle elles appartiennent.
 *
 * Trois bornes, et elles ne sont pas des détails.
 *
 * **Seuls les documents de la proposition sont lus.** Le corpus accepté en
 * compte cent vingt ; les rouvrir tous à chaque affichage rendrait l'écran
 * inutilisable pour un gain nul.
 *
 * **Un document n'est lu qu'une fois.** Ses figures sont en base ; les
 * retrouver coûte une requête, les refaire coûte un rendu par page.
 *
 * **Ne pas savoir fait s'abstenir.** Si la lecture des figures existantes
 * échoue, on ne découpe rien : mieux vaut ne rien ajouter que d'ajouter deux
 * fois ce qu'on croyait absent.
 */
async function ensureAvisFigures(root, proposition, analyse, documents = []) {
  if (!view.review || view.open?.id !== proposition.id) return;

  const nôtres = new Set((documents ?? []).map((row) => String(row.id)));
  const rapports = (analyse.reports ?? []).filter((report) => nôtres.has(String(report.documentId)));
  if (rapports.length === 0) return;

  const figures = await import("../services/avis-figures-supabase.js");
  const existantes = await figures.listFiguresForDocuments(rapports.map((report) => report.documentId));
  if (existantes === null) return;

  const dejaLus = new Set(existantes.map((row) => String(row.document_id)));
  const nouvelles = [];

  for (const report of rapports) {
    if (dejaLus.has(String(report.documentId))) continue;

    try {
      const { captureFigures } = await import("../services/avis-figure-capture.js");
      const trouvees = await captureFigures({ file: report.file, pages: report.pages });

      for (const figure of trouvees) {
        const ecrite = await figures.saveFigure({
          projectId: proposition.project_id,
          documentId: report.documentId,
          figure
        });
        if (ecrite) nouvelles.push(ecrite);
      }
    } catch {
      // Une lecture ratée ne compromet ni l'analyse ni la revue : le document se
      // lit sans ses figures, et la prochaine ouverture réessaiera.
    }
  }

  if (!view.review || view.open?.id !== proposition.id) return;

  view.review.figures = [...existantes, ...nouvelles];
  if (root.isConnected) renderContent(root);
}

/**
 * Demande ce que montre une figure.
 *
 * À la main, une figure à la fois : un rapport peut en porter trente, et les
 * décrire toutes d'office coûterait trente appels pour une lecture que personne
 * n'a demandée. La légende est **dérivée** — l'écran le dit sous elle, parce
 * qu'une lecture automatique prise pour la parole du bureau de contrôle serait
 * un faux.
 */
async function describeFigure(root, bouton) {
  const id = bouton.getAttribute("data-figure-describe") || "";
  if (!id || bouton.disabled) return;

  bouton.disabled = true;
  bouton.textContent = "Lecture…";

  const figure = (view.review?.figures ?? []).find((entree) => String(entree.id) === id);
  const { describeFigure: demander } = await import("../services/avis-figures-supabase.js");
  // Le contexte est la ligne du tableau : c'est ce dont le modèle a besoin pour
  // dire ce que l'image ajoute, plutôt que de la décrire dans le vide.
  const reponse = await demander({
    figureId: id,
    sentence: [figure?.rubric, figure?.observation].filter(Boolean).join(" — ")
  });

  if (!reponse?.caption) {
    bouton.disabled = false;
    bouton.textContent =
      reponse?.error === "unconfigured" ? "Lecture non configurée" : "La lecture n'a pas abouti";
    return;
  }

  view.review.figures = (view.review.figures ?? []).map((entree) =>
    String(entree.id) === id ? { ...entree, caption: reponse.caption, caption_model: reponse.model } : entree
  );

  if (root.isConnected) renderContent(root);
}

/**
 * Les figures d'un avis numéroté.
 *
 * Elles ne s'y rangent que si la ligne du tableau portait ce numéro. Une ligne
 * favorable n'en a pas : ses photos se lisent sous leur document, dans les
 * dépôts, et pas sous un avis auquel rien ne les rattache.
 */
function figuresOfAvis(item = {}) {
  const toutes = view.review?.figures ?? [];

  // Un avis relevé sur une ligne de fiche **est** une figure : il porte son
  // identifiant. Le chercher par numéro n'aurait rien donné — ces lignes-là
  // n'en ont pas, et c'est le cas ordinaire.
  const figureId = String(item?.payload?.figureId ?? "").trim();
  if (figureId) return toutes.filter((figure) => String(figure.id) === figureId);

  const cle = String(item?.itemKey ?? "").trim();
  if (!cle) return [];
  return toutes.filter((figure) => String(figure.avis_reference ?? "").trim() === cle);
}

/** Les figures d'un livrable, dans l'ordre où le rapport les montre. */
function figuresOfDocument(documentId, toutes = view.review?.figures) {
  const cle = String(documentId ?? "");
  if (!cle) return [];
  return (toutes ?? [])
    .filter((figure) => String(figure.document_id) === cle)
    .sort((gauche, droite) => Number(gauche.page) - Number(droite.page));
}

/**
 * Ce que le projet tient déjà pour vrai des avis.
 *
 * Deux sources, et il faut les deux. La **mémoire du suivi** porte les avis que
 * le moteur a relevés au fil des rapports. Les **décisions fusionnées** portent
 * ce que des propositions précédentes ont fait entrer — dont les lignes de
 * fiches, que le moteur ne sait pas relire et qui ne reviendraient donc jamais
 * par la première source.
 *
 * Sans cette seconde source, chaque ouverture reproposerait les mêmes lignes
 * comme nouvelles : on aurait remplacé soixante-douze fausses questions par
 * autant de doublons.
 */
function knownAvisFor(knownAvis = [], decisions = []) {
  const connus = new Map(
    (knownAvis ?? []).map((avis) => [String(avis.external_reference ?? ""), avis]).filter(([cle]) => cle)
  );

  for (const decision of decisions ?? []) {
    if (decision.item_type !== ITEM_TYPE.AVIS) continue;
    const cle = String(decision.item_key ?? "");
    // La mémoire du suivi prime : elle est recalculée sur les documents, là où
    // une décision est un instantané de ce qu'on avait sous les yeux.
    if (!cle || connus.has(cle)) continue;

    connus.set(cle, {
      external_reference: cle,
      status: decision.payload?.status ?? null,
      opinion_raw: decision.payload?.opinion ?? null
    });
  }

  return [...connus.values()];
}

/**
 * Fait entrer les lignes des fiches dans ce qui change.
 *
 * Une fiche d'avis sur travaux ne porte pas de phrases : le moteur n'y trouvait
 * rien, et le document entrait au corpus sans rien y déposer. Ses lignes sont
 * pourtant lues — c'est ce que fait la découpe des figures. Il ne reste qu'à
 * les nommer, et à refaire la comparaison sur la liste entière.
 */
function mergeFigureAvis(root, { knownAvis = [], decisions = [], assumees = [], documents = [], analyse = null } = {}) {
  if (!view.review || view.review.frozen) return;

  const lignes = avisFromFigures(view.review.figures ?? []);
  if (lignes.length === 0) return;

  const complet = mergeAvis(analyse?.computedAvis ?? [], lignes);
  const connus = knownAvisFor(knownAvis, decisions);

  // La même garde qu'à l'analyse : les fiches viennent des livrables du dépôt,
  // et refaire le diff ici sans la portée réintroduirait les avis du corpus
  // entier — que l'analyse venait justement d'écarter.
  view.review.diff = limiterAuDepot(diffAvis(connus, complet), {
    documentIds: documents.map((row) => row.id),
    reports: analyse?.reports ?? []
  });
  view.review.items = applyDecisions(
    [
      ...documentItems(documents),
      ...attachmentItems(analyse?.attachments ?? []),
      ...avisItems(view.review.diff)
    ],
    decisions
  );
  recalculerLeDiff(view.review);
  view.review.conflicts = findMemoryConflicts(view.review.items, assumees);

  // La note de dépôt s'appuie sur ce diff-là : lui laisser l'ancien lui ferait
  // décrire un lot dont les fiches n'auraient rien apporté.
  if (view.review.noteMatter) view.review.noteMatter.diff = view.review.diff;

  if (root.isConnected) renderContent(root);
}

/**
 * Écrit la note de dépôt, quand il y a lieu.
 *
 * Deux règles, et ce sont celles de tout le reste du projet.
 *
 * **Ce qui est dérivé se recalcule tant que ça sert à décider.** Une note
 * décrit un lot ; tant que le lot bouge — un dépôt de plus, un rapport oublié
 * trois jours après — elle est réécrite. Son empreinte dit sur quoi elle
 * portait : tant que l'empreinte ne bouge pas, on ne redemande rien, parce
 * qu'une note coûte un appel et que la relire ne change rien.
 *
 * **Ce qui a été décidé se conserve.** Une proposition close ne réécrit plus :
 * on lit la dernière note écrite, telle quelle. C'est le même geste que pour
 * les affirmations et le suivi.
 *
 * Et une note qui n'a pas pu être écrite ne s'invente pas : l'écran dit qu'elle
 * manque. Un texte creux ferait croire que le lot ne dit rien.
 */
async function ensureDepositNote(root, proposition, matiere = {}) {
  if (!view.review || view.open?.id !== proposition.id) return;

  const [{ buildDepositFacts, depositFingerprint }, notes] = await Promise.all([
    import("../services/deposit-note.js"),
    import("../services/deposit-note-supabase.js")
  ]);

  const empreinte = depositFingerprint(matiere.documents ?? []);
  const existante = await loadNoteInto(root, proposition, notes);

  const ouverte = proposition.status === PROPOSITION.OPEN;
  const aJour = existante && String(existante.fingerprint || "") === empreinte;
  if (!ouverte || aJour) return;
  // Un lot vide n'a rien à raconter : payer un appel pour l'écrire serait payer
  // pour une phrase creuse.
  if ((matiere.documents ?? []).length === 0) return;

  view.review.noteState = "writing";
  if (root.isConnected) renderContent(root);

  const facts = buildDepositFacts({ proposition, ...matiere });
  const ecrite = await notes.requestDepositNote({ propositionId: proposition.id, facts });

  if (!view.review || view.open?.id !== proposition.id) return;

  if (!ecrite?.markdown) {
    view.review.noteState = "failed";
    view.review.noteError = ecrite?.error ?? "refused";
    if (root.isConnected) renderContent(root);
    return;
  }

  const ligne = await notes.saveNote({
    propositionId: proposition.id,
    projectId: proposition.project_id,
    markdown: ecrite.markdown,
    facts,
    fingerprint: empreinte,
    model: ecrite.model
  });

  if (!view.review || view.open?.id !== proposition.id) return;

  // La base a pu refuser l'écriture ; le texte, lui, existe. On l'affiche —
  // il sera réécrit au prochain passage, ce qui est le pire qui puisse arriver.
  view.review.note = ligne ?? {
    markdown: ecrite.markdown,
    model: ecrite.model,
    created_at: new Date().toISOString(),
    fingerprint: empreinte
  };
  view.review.noteState = "idle";
  view.review.noteError = null;
  if (root.isConnected) renderContent(root);
}

/**
 * Redemande la note, sans relancer l'analyse.
 *
 * Écrire une phrase ne relit pas cent vingt PDF : les faits sont conservés
 * depuis la première rédaction, et c'est d'eux qu'on repart.
 */
async function retryDepositNote(root) {
  const proposition = view.open;
  if (!proposition || !view.review || view.review.noteState === "writing") return;

  await ensureDepositNote(root, proposition, view.review.noteMatter ?? { documents: view.review.documentRows ?? [] });
}

/** La note en vigueur, posée dans l'écran. */
async function loadNoteInto(root, proposition, notes) {
  const existante = await notes.loadLatestNote(proposition.id);
  if (!view.review || view.open?.id !== proposition.id) return existante;

  if (existante) {
    view.review.note = existante;
    view.review.noteState = "idle";
    if (root.isConnected) renderContent(root);
  }
  return existante;
}

/**
 * Refait l'histoire une fois la proposition fermée.
 *
 * Fermer ajoute un acte — fusionnée, ou abandonnée — et cet acte a un auteur et
 * une date. Sans cette relecture, l'écran garderait le fil d'une proposition
 * ouverte jusqu'au prochain rechargement : pas d'acte de fusion, pas de carte de
 * fin, et un message écrit dans la foulée se rangerait avant une fusion déjà
 * faite. Rien n'est relu en base que les noms des signataires.
 */
async function restoryAfterClosing(propositions) {
  if (!view.open || !view.review) return;

  const documents = view.review.documentRows ?? [];
  const decisions = view.review.decisionRows ?? [];
  const comments = view.review.comments ?? [];

  try {
    view.review.authors = await propositions.loadAuthors([
      view.open.created_by,
      view.open.merged_by,
      view.open.closed_by,
      ...documents.map((row) => row.created_by),
      ...decisions.map((row) => row.decided_by),
      ...comments.map((row) => row.author_id)
    ]);
  } catch {
    // Un nom manquant se dit « un collaborateur » : ce n'est pas une raison
    // pour ne pas raconter la fusion.
  }

  view.review.story = buildStory({
    proposition: view.open,
    documents,
    decisions,
    comments,
    names: view.review.authors ?? new Map()
  });
}

/**
 * Écrit l'état de la proposition avant qu'elle ne se ferme.
 *
 * Deux choses partent, et la première est la moins évidente : **toutes** les
 * affirmations, y compris celles que personne n'a touchées. Ailleurs dans la
 * revue, ne rien dire vaut acceptation ; cette acceptation tacite n'existait
 * jusqu'ici nulle part en base. Sans elle, le procès-verbal garderait les trois
 * écarts et perdrait les quatorze accords — le contraire de ce qui s'est passé.
 *
 * La seconde est le résumé de ce qu'aucune affirmation ne porte : les avis
 * restés en l'état, les livrables que le stockage n'avait pas rendus, le moteur
 * qui a lu.
 *
 * @returns {Promise<object|null>} le résumé à écrire, ou `null` si les
 *   affirmations n'ont pas pu être conservées — on ne ferme alors rien.
 */
async function freeze(propositions, proposition) {
  const review = view.review ?? {};
  const items = review.items ?? [];

  const ok = await propositions.decidePropositionItems({
    propositionId: proposition.id,
    projectId: proposition.project_id,
    decisions: freezeDecisions(items)
  });
  if (!ok) return null;

  return buildSnapshot({
    items,
    diff: review.diff ?? {},
    unreachable: review.unreachable ?? [],
    result: review.result ?? null
  });
}

/**
 * Renonce à une proposition.
 *
 * Abandonner n'est pas fusionner un lot vide : les documents ne sont pas
 * entrés, ils sont marqués refusés, et l'onglet Documents les montre grisés.
 * C'est la sortie qui manquait — sans elle, une proposition ouverte par erreur
 * restait ouverte pour toujours, et la liste des propositions ouvertes cessait
 * peu à peu de vouloir dire quelque chose.
 *
 * Deux clics, parce qu'un abandon ne se répare pas : une proposition close ne
 * se rouvre pas, on en ouvre une autre. Le second clic est le même bouton, qui
 * dit alors ce qu'il va faire — un `confirm()` du navigateur poserait la
 * question ailleurs que là où on l'a posée.
 */
async function abandon(root) {
  const proposition = view.open;
  if (!proposition || proposition.status !== PROPOSITION.OPEN || view.review.merging) return;

  if (!view.review.abandoning) {
    view.review.abandoning = true;
    renderContent(root);
    return;
  }

  // Le mot qu'on a commencé à écrire part avec l'abandon : un renoncement sans
  // un mot est le genre de silence qu'on regrette six mois plus tard.
  if (String(view.draft ?? "").trim()) await postComment(root, { keepGoing: true });

  view.review.merging = true;
  view.review.notice = null;
  renderContent(root);

  try {
    const propositions = await import("../services/propositions-supabase.js");
    const documents = (view.review.items ?? []).filter((entry) => entry.itemType === ITEM_TYPE.DOCUMENT);

    // Une proposition abandonnée est un procès-verbal comme une autre : ce
    // qu'elle proposait mérite d'être lisible dans six mois, ne serait-ce que
    // pour savoir ce qu'on avait renoncé à faire entrer.
    const gele = await freeze(propositions, proposition);
    if (!gele) {
      view.review.merging = false;
      view.review.abandoning = false;
      view.review.notice = "L'état de la proposition n'a pas pu être conservé. Elle reste ouverte.";
      renderContent(root);
      return;
    }

    const ferme = await propositions.closeProposition({
      proposition,
      documentIds: documents.map((entry) => entry.itemKey),
      snapshot: gele
    });

    if (!ferme) {
      view.review.merging = false;
      view.review.abandoning = false;
      view.review.notice = "L'abandon n'a pas abouti. La proposition reste ouverte : rien n'a été perdu.";
      renderContent(root);
      return;
    }

    view.review.merging = false;
    view.review.abandoning = false;
    view.review.frozen = true;
    view.open = {
      ...proposition,
      status: PROPOSITION.CLOSED,
      closed_at: ferme.closedAt ?? new Date().toISOString(),
      closed_by: ferme.closedBy ?? null,
      snapshot: gele
    };
    await restoryAfterClosing(propositions);

    // La liste et le compteur de l'onglet disent la même chose que l'écran.
    const ligne = (view.propositions ?? []).find((entry) => entry.id === proposition.id);
    if (ligne) Object.assign(ligne, { status: PROPOSITION.CLOSED, snapshot: gele });
    store.projectPropositionsView = { openCount: getOpenPropositionCount() };
  } catch {
    view.review.merging = false;
    view.review.abandoning = false;
    view.review.notice = "L'abandon n'a pas abouti. La proposition reste ouverte : rien n'a été perdu.";
  }

  renderContent(root);
}

/**
 * Réécrit le suivi des avis après une fusion.
 *
 * Recalcul complet, jamais incrémental : c'est la doctrine posée avec la
 * persistance. Un document plus ancien arrivé en retard réécrit la chronologie,
 * et invalider finement une chaîne ordonnée produirait des anomalies
 * irreproductibles.
 *
 * Un échec ici ne défait pas la fusion : les documents sont entrés, ce qui est
 * le fait ; le suivi se rattrapera à la prochaine analyse, et l'écran le dit.
 */
async function recomputeAfterMerge(root, proposition) {
  try {
    const [{ analyzeProposition }, { saveCtAnalysis }, store_, { loadProjectMarkers }] = await Promise.all([
      import("../services/proposition-analysis.js"),
      import("../services/ct-analysis-supabase.js"),
      import("../services/ct-analysis-store.js"),
      import("../services/project-identity-supabase.js")
    ]);

    view.review.step = "Mise à jour du suivi des avis";
    renderContent(root);

    const { PORTEE } = await import("../services/depot-portee.js");
    const analyse = await analyzeProposition({
      projectId: proposition.project_id,
      // Ses documents sont désormais dans le corpus accepté : il n'y a plus rien
      // à y ajouter, et l'analyse porte donc sur le projet tel qu'il est devenu.
      // C'est le seul appel qui regarde le projet entier — et c'est sa raison
      // d'être : réécrire le suivi, pas décrire un dépôt.
      portee: PORTEE.PROJET,
      proposition,
      project: store.projectForm ?? {},
      knownAvis: [],
      knownMarkers: await loadProjectMarkers(proposition.project_id)
    });

    if (!analyse.result) return;

    const documentIds = Object.fromEntries(
      analyse.reports.filter((report) => report.documentId).map((report) => [report.sourceId, report.documentId])
    );

    // L'écriture ne peut pas se chronométrer : le journal part **avec** elle,
    // donc il est clos avant qu'elle commence. Ce qui était mesuré ici, c'était
    // sa préparation — l'empreinte du lot, le rattachement des livrables. Une
    // durée qui mesure autre chose que son intitulé est pire qu'une absence :
    // l'étape n'en porte donc pas, et son journal dit pourquoi.
    const carnet = journalDExecution();
    carnet.dire(`${(analyse.result?.avisStatus ?? []).length} avis à écrire au suivi`);
    carnet.dire(`${analyse.reports.length} livrable(s) rattachés à l'exécution`);
    if ((analyse.unreachable ?? []).length > 0) {
      carnet.avertir(`${analyse.unreachable.length} livrable(s) n'ont pas été rapatriés : le suivi est écrit sans eux`);
    }
    carnet.dire("L'écriture n'est pas chronométrée : ce journal part avec elle, donc il se ferme avant qu'elle commence.");
    const ecrire = (steps) => [
      ...steps,
      { id: "suivi", label: "Suivi écrit", ms: null, statut: "ok", lignes: carnet.lignes() }
    ];

    await saveCtAnalysis({
      projectId: proposition.project_id,
      result: analyse.result,
      documentIds,
      // L'exécution porte sa cause : c'est par elle qu'on remonte, depuis
      // l'onglet Actions, du chiffre du suivi à la décision qui l'a produit.
      propositionId: proposition.id,
      triggerSource: "proposition",
      corpusFingerprint: await store_.corpusFingerprint(analyse.reports),
      corpusDocuments: store_.corpusEntries(analyse.reports),
      documentCount: analyse.reports.length,
      steps: ecrire(analyse.steps ?? [])
    });
  } catch {
    view.review.notice =
      "Les documents sont entrés, mais le suivi des avis n'a pas pu être réécrit. " +
      "Il le sera à la prochaine analyse.";
  }
}

/** L'en-tête de la liste. */
function setPropositionsHeader() {
  setProjectViewHeader({ contextLabel: "Propositions", variant: "propositions", hideBar: true });
}

/**
 * Ouvre une proposition close : on lit ce qu'elle fut.
 *
 * Aucune analyse, aucun PDF rapatrié, aucun appel au moteur. Ce qui s'affiche
 * vient de ce qui a été écrit au moment de la fermeture — les affirmations et
 * leurs décisions, plus le résumé de ce qu'aucune d'elles ne portait.
 *
 * C'est le pendant exact de la règle qui gouverne une proposition ouverte : là
 * on recalcule tout parce qu'il faut décider, ici on ne recalcule rien parce
 * qu'il a été décidé. La même doctrine, appliquée aux deux moments.
 */
async function openFrozen(root, proposition) {
  try {
    const propositions = await import("../services/propositions-supabase.js");
    const { listProjectAssertions } = await import("../services/project-memory-supabase.js");
    const [stored, documents, affirmationsDuProjet] = await Promise.all([
      propositions.listPropositionItems(proposition.id),
      // Les documents restent lisibles : ils disent qui a déposé quoi, et quand.
      // Ce sont des faits, ils ne se recalculent pas.
      propositions.listPropositionDocuments(proposition.id),
      // La mémoire n'est pas rejouée : elle est lue. Ce que cette proposition y
      // a écrit porte son identifiant et ce qu'il remplaçait.
      listProjectAssertions(proposition.project_id)
    ]);

    if (!view.open || view.open.id !== proposition.id) return;

    const { listPropositionComments } = await import("../services/proposition-comments.js");
    const comments = await listPropositionComments(proposition.id);

    const names = await propositions.loadAuthors([
      proposition.created_by,
      proposition.merged_by,
      proposition.closed_by,
      ...documents.map((row) => row.created_by),
      ...stored.map((row) => row.decided_by),
      ...comments.map((row) => row.author_id)
    ]);

    const snapshot = proposition.snapshot ?? null;
    view.review = {
      running: false,
      frozen: true,
      step: "",
      merging: false,
      error: null,
      // Les noms des livrables que le stockage n'avait pas rendus ce jour-là :
      // l'analyse portait sur moins de documents, et cela se lit encore.
      unreachable: (snapshot?.unreachable ?? []).map((name) => ({ original_filename: name })),
      diff: { unchanged: snapshot?.unchangedAvis ?? null },
      result: null,
      notice: null,
      gap: describeSnapshotGap(proposition, stored.length),
      deposits: groupDeposits(documents, names),
      documentRows: documents,
      decisionRows: stored,
      comments,
      authors: names,
      posting: false,
      commentNotice: null,
      // La décision est figée, la conversation ne l'est pas : on commente une
      // proposition close comme une autre.
      story: buildStory({ proposition, documents, decisions: stored, comments, names }),
      items: itemsFromDecisions(stored),
      // Sur une proposition fusionnée, « avant » se lit dans l'histoire écrite
      // en mémoire — ce que la proposition a posé, et ce que cela remplaçait.
      avantApres: tableauAvantApres({ proposition, items: stored, assertions: affirmationsDuProjet })
    };
    recalculerLeDiff(view.review);

    // Les photos ne se recalculent pas : elles ont été découpées, hachées et
    // écrites en base au moment de l'analyse. Une proposition close les perdait
    // parce que personne ne les relisait — pas parce qu'elles n'existaient
    // plus. Ce qui a été établi se conserve, et se remontre.
    const { listFiguresForDocuments } = await import("../services/avis-figures-supabase.js");
    const figures = await listFiguresForDocuments(documents.map((row) => row.id));
    if (!view.open || view.open.id !== proposition.id) return;
    // `null` : la lecture a échoué. On s'abstient plutôt que d'afficher un
    // rapport sans ses photos comme s'il n'en avait jamais eu.
    view.review.figures = figures ?? [];

    // Une proposition close ne réécrit plus sa note : on lit la dernière, telle
    // qu'elle était au moment où l'on a tranché.
    const notes = await import("../services/deposit-note-supabase.js");
    await loadNoteInto(root, proposition, notes);
  } catch {
    if (!view.open || view.open.id !== proposition.id) return;
    view.review = {
      running: false,
      frozen: true,
      items: [],
      unreachable: [],
      diff: { unchanged: null },
      error: "L'état conservé de cette proposition n'a pas pu être lu."
    };
  }

  if (root.isConnected) renderContent(root);
}

/**
 * Ouvre une proposition et lance son analyse.
 *
 * L'analyse démarre seule, comme une CI : on ouvre, elle tourne, le diff
 * apparaît. Aucun bouton « Analyser » — ce serait faire porter à l'utilisateur
 * un geste que la machine sait déclencher.
 */
async function openProposition(root, propositionId) {
  const proposition = (view.propositions ?? []).find((entry) => entry.id === propositionId);
  if (!proposition) return;

  view.open = proposition;
  // On entre par la conversation : c'est là qu'on comprend de quoi il s'agit.
  view.tab = "conversation";
  view.draft = "";
  view.preview = false;
  view.editing = null;
  view.editDraft = "";
  // Un livrable ouvert appartient à la proposition qu'on quitte.
  releaseViewer();
  view.viewer = null;
  removePdfViewerHost();
  view.review = {
    running: true, step: "", items: [], unreachable: [], diff: { unchanged: 0 }, error: null,
    // L'écran se dessine avec ces listes vides pendant le temps des quatre
    // requêtes qui les remplissent. Elles doivent exister : un onglet qui lit
    // `undefined.length` casse le rendu avant d'avoir rien montré.
    story: [], comments: [], deposits: [], documentRows: [], decisionRows: [], conflicts: [],
    authors: new Map(), avantApres: null
  };
  view.mergeDrawer = false;

  // La barre compacte nomme la proposition : c'est elle qu'on lit, pas l'onglet.
  setProjectViewHeader({
    contextLabel: "Propositions",
    variant: "propositions",
    // La barre du projet n'affichait que le mot « Propositions », déjà écrit
    // dans l'onglet actif juste au-dessus, et juste au-dessus du titre de la
    // proposition. Trois lignes pour dire où l'on est. Les écrans les plus
    // denses — Situations, Mémoire, Atelier — la masquent déjà.
    hideBar: true,
    compactLabel: `#${Number(proposition.number) || "?"} ${proposition.title}`,
    onCompactLabelClick: () => backToList(root)
  });
  renderContent(root);

  // Une proposition close n'est plus une question : c'est le procès-verbal
  // d'une décision. On le lit, on ne le rejoue pas.
  if (proposition.status !== PROPOSITION.OPEN) {
    await openFrozen(root, proposition);
    return;
  }

  try {
    const [propositions, { listPropositionComments }, { listProjectAssertions }] = await Promise.all([
      import("../services/propositions-supabase.js"),
      import("../services/proposition-comments.js"),
      import("../services/project-memory-supabase.js")
    ]);

    const projectId = proposition.project_id;

    // ── Ce qui se lit sans analyse ──────────────────────────────────────────
    //
    // La conversation, les dépôts et les affirmations sont en base : les lire
    // coûte quatre requêtes. L'écran les affichait pourtant derrière un
    // « Analyse en cours… » plein cadre, parce qu'ils étaient chargés **après**
    // une analyse qui relit cent vingt PDF. On ouvrait une proposition et on
    // attendait une minute pour lire une phrase déjà écrite.
    //
    // Ils arrivent donc d'abord, les onglets s'affichent, et l'analyse remplit
    // les siens quand elle aboutit. Son état se lit dans la barre de titre, où
    // il reste visible quel que soit l'onglet ouvert.
    const [decisions, documents, comments, affirmationsDuProjet] = await Promise.all([
      propositions.listPropositionItems(proposition.id),
      propositions.listPropositionDocuments(proposition.id),
      listPropositionComments(proposition.id),
      // Ce que le projet dit aujourd'hui : la colonne de gauche du tableau
      // avant / après. `null` quand la lecture a échoué — et le tableau le dit
      // plutôt que d'annoncer des entrées nouvelles.
      listProjectAssertions(projectId)
    ]);

    if (!view.open || view.open.id !== proposition.id) return;

    const names = await propositions.loadAuthors([
      proposition.created_by,
      proposition.merged_by,
      proposition.closed_by,
      ...documents.map((row) => row.created_by),
      ...decisions.map((row) => row.decided_by),
      ...comments.map((row) => row.author_id)
    ]);

    if (!view.open || view.open.id !== proposition.id) return;

    view.review = {
      running: true,
      step: "",
      merging: false,
      error: null,
      unreachable: [],
      diff: { unchanged: 0 },
      result: null,
      notice: null,
      deposits: groupDeposits(documents, names),
      // Conservés pour pouvoir refaire l'histoire après un message, sans
      // relancer l'analyse : écrire une phrase ne relit pas cent vingt PDF.
      documentRows: documents,
      decisionRows: decisions,
      comments,
      authors: names,
      posting: false,
      commentNotice: null,
      conflicts: [],
      story: buildStory({ proposition, documents, decisions, comments, names }),
      items: [],
      // Les affirmations de la proposition, en face de ce que le projet dit
      // aujourd'hui. Elles ne passent pas par `items` : celui-ci porte les
      // mouvements du corpus, qui n'ont pas de valeur d'avant.
      avantApres: tableauAvantApres({ proposition, items: decisions, assertions: affirmationsDuProjet })
    };
    recalculerLeDiff(view.review);
    renderContent(root);

    // ── Ce qui demande de tout relire ───────────────────────────────────────
    const [{ analyzeProposition }, { loadCtAnalysis }, { loadProjectMarkers }] = await Promise.all([
      import("../services/proposition-analysis.js"),
      import("../services/ct-analysis-supabase.js"),
      import("../services/project-identity-supabase.js")
    ]);

    const [memoire, marqueurs, assumees] = await Promise.all([
      loadCtAnalysis(projectId),
      loadProjectMarkers(projectId),
      // Ce que le projet a déjà assumé, et que l'analyse pourrait contredire.
      propositions.listProjectDecisions(projectId, { exceptPropositionId: proposition.id })
    ]);

    const analyse = await analyzeProposition({
      projectId,
      proposition,
      project: store.projectForm ?? {},
      knownAvis: memoire?.avis ?? [],
      knownMarkers: marqueurs,
      onProgress: (step) => {
        if (!view.open || view.open.id !== proposition.id) return;
        view.review.step = `${step.label} (${step.done}/${step.total})`;
        renderContent(root);
      }
    });

    // La proposition a pu être refermée pendant l'analyse : ce qu'on vient de
    // calculer ne décrirait plus ce que l'utilisateur a sous les yeux.
    if (!view.open || view.open.id !== proposition.id) return;

    view.review = {
      ...view.review,
      running: false,
      step: "",
      error: analyse.error,
      unreachable: analyse.unreachable,
      diff: analyse.diff,
      result: analyse.result,
      // Le suivi des avis, indexé par référence : c'est lui qui redonne un
      // extrait aux décisions figées avant qu'on ne les conserve.
      suiviDesAvis: new Map(
        (memoire?.avis ?? [])
          .map((avis) => [String(avis.external_reference ?? "").trim(), avis])
          .filter(([cle]) => cle)
      ),
      items: applyDecisions(
        [...documentItems(documents), ...attachmentItems(analyse.attachments), ...avisItems(analyse.diff)],
        decisions
      )
    };
    recalculerLeDiff(view.review);

    // Les conflits portent les mêmes objets que les blocs — pas des copies : ce
    // qu'on tranche dans l'un se voit dans l'autre, et la fusion se débloque
    // sans qu'on ait à recalculer quoi que ce soit.
    view.review.conflicts = findMemoryConflicts(view.review.items, assumees);

    // La note vient après tout le reste : elle se rédige au-dessus de faits
    // établis, et elle n'a pas à retarder l'affichage de ce qui les établit.
    // La matière est conservée pour qu'une reprise n'ait pas à relire cent
    // vingt PDF pour réécrire une page.
    view.review.noteMatter = {
      documents,
      reports: analyse.reports,
      knownAvis: memoire?.avis ?? [],
      diff: analyse.diff,
      conflicts: view.review.conflicts,
      unreachable: analyse.unreachable,
      attachments: analyse.attachments
    };
    await ensureDepositNote(root, proposition, view.review.noteMatter);

    // Les figures viennent en dernier : elles enrichissent la lecture, elles ne
    // conditionnent aucune décision, et un rendu de page coûte cher.
    await ensureAvisFigures(root, proposition, analyse, documents);

    // Les lignes des fiches deviennent des avis. Elles arrivent après le
    // diff parce que leur découpe coûte un rendu de page ; le diff se refait
    // donc ici, sur la liste complète.
    mergeFigureAvis(root, { knownAvis: memoire?.avis ?? [], decisions, assumees, documents, analyse });
  } catch (error) {
    if (!view.open || view.open.id !== proposition.id) return;
    view.review = {
      running: false,
      items: [],
      unreachable: [],
      diff: { unchanged: 0 },
      error: String(error?.message || error || "L'analyse n'a pas abouti.")
    };
  }

  if (root.isConnected) renderContent(root);
}

/**
 * Re-cliquer l'onglet « Propositions » revient à la liste.
 *
 * C'est le geste des sujets, et le même dans toute l'application : l'onglet
 * ramène chez lui. Deux chemins pour un seul retour — un bouton ici, un onglet
 * là — se traduisent surtout par un utilisateur qui cherche.
 *
 * Le lien de l'onglet actif ne change pas l'adresse (le `hashchange` n'a pas
 * lieu), d'où cet événement : c'est le seul signal qu'on reçoit.
 */
let tabResetBound = false;
// L'écran est reconstruit à chaque navigation : un écouteur qui garderait le
// premier `root` parlerait à un élément détaché, et le retour ne marcherait
// qu'une fois. On lui donne donc l'écran monté, pas celui d'alors.
let mountedRoot = null;

function bindTabReset() {
  if (tabResetBound) return;
  tabResetBound = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
    const onglet = String(event?.detail?.tabId || "");
    if (onglet !== "propositions") return;
    if (!view.open || !mountedRoot?.isConnected) return;
    backToList(mountedRoot);
  });
}

export function renderProjectPropositions(root) {
  if (!root) return;
  root.className = "project-shell__content";

  // Entrer dans l'onglet, c'est ouvrir la liste — jamais retomber sur la
  // proposition qu'on lisait la dernière fois. L'état du module survit à la
  // navigation ; l'écran ne doit pas en hériter.
  view.open = null;
  view.review = null;
  mountedRoot = root;
  bindTabReset();
  clearProjectActiveScrollSource();
  setTopCompact(false);

  setPropositionsHeader();

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

      // De quoi citer, chargé une fois pour l'onglet : les sujets comme les
      // propositions, sans dépendre de ce qu'un autre écran aurait laissé.
      const { listProjectRefs } = await import("../services/propositions-supabase.js");
      // `null` dit qu'on n'a pas pu demander. Ici, garder ce qu'on avait vaut
      // mieux que de repartir de rien : une citation déjà écrite reste un lien.
      view.refs = (projectId ? await listProjectRefs(projectId) : []) ?? view.refs ?? [];

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

    // Une proposition citée depuis un sujet s'ouvre en arrivant : cliquer un
    // lien qui se contenterait d'afficher la liste ferait chercher à la main ce
    // qu'on venait de désigner.
    const attendue = String(store.pendingPropositionId || "");
    if (attendue) {
      store.pendingPropositionId = "";
      if (root.isConnected && (view.propositions ?? []).some((entry) => entry.id === attendue)) {
        openProposition(root, attendue);
      }
    }
  })();
}
