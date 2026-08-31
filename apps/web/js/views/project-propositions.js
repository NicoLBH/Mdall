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
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import {
  PROJECT_SHELL_COMPACT_CHANGE_EVENT,
  clearProjectActiveScrollSource,
  setProjectViewHeader
} from "./project-shell-chrome.js";
import { bindOverlayChromeCompact, renderOverlayChromeHead } from "./ui/overlay-chrome.js";
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
  applyDecisions,
  attachmentItems,
  avisItems,
  describeAvisChange,
  documentItems
} from "../services/proposition-review.js";

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
  /** De quoi citer dans ce projet : ses sujets et ses propositions. */
  refs: [],
  /** Le menu de citation ouvert sous le champ, s'il y en a un. */
  refMenu: null
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
    return;
  }

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
function renderReviewHead(proposition) {
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
  return renderOverlayChromeHead({
    headId: "propositionsDetailsTitle",
    titleHtml: titleWrapHtml,
    headClassName: "review-head"
  });
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
  const { reference, title, change } = item.payload;
  const mouvement = describeAvisChange(item.payload);

  return renderReviewItem(
    item,
    `
      <span class="review-item__title">
        <span class="review-item__badge review-item__badge--${change}">${escapeHtml(mouvement.label)}</span>
        n° ${escapeHtml(reference)}${title ? ` — ${escapeHtml(title)}` : ""}
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
function renderConflict(conflict) {
  const dit = describeConflict(conflict);
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
        <p class="conflict__side conflict__side--memory">${escapeHtml(dit.memory)}</p>
        <p class="conflict__side conflict__side--now">${escapeHtml(dit.now)}</p>
      </div>
      ${
        tranche
          ? `<p class="conflict__settled">${escapeHtml(
              conflict.item.status === ITEM.REFUSED ? dit.keep : dit.take
            )} — vous pouvez fusionner.</p>`
          : `<div class="conflict__actions">
               <button type="button" class="gh-btn gh-btn--sm" data-conflict-keep="${escapeHtml(cle)}">${escapeHtml(
                 dit.keep
               )}</button>
               <button type="button" class="gh-btn gh-btn--sm gh-btn--primary" data-conflict-take="${escapeHtml(
                 cle
               )}">${escapeHtml(dit.take)}</button>
             </div>`
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
function renderConflicts(conflicts = []) {
  if (conflicts.length === 0) return "";

  const restants = unresolvedConflicts(conflicts).length;

  return `
    <section class="review-block">
      <div class="review-panel review-panel--conflict">
        <div class="review-block__head">
          <div class="review-block__headbody">
            <h3 class="review-block__title">
              Contradictions avec la mémoire du projet
              <span class="review-block__count">${conflicts.length}</span>
            </h3>
            <span class="review-block__state${restants > 0 ? " is-blocking" : ""}">
              ${restants > 0 ? `${restants} à trancher` : "toutes tranchées"}
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

  return `
    <section class="review-block">
      <div class="review-panel">
        <div class="review-block__head${ecartes > 0 ? " is-partial" : ""}">
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
              ${escapeHtml(titre)} <span class="review-block__count">${items.length}</span>
            </h3>
            ${items.length > 0 ? `<span class="review-block__state">${escapeHtml(etat)}</span>` : ""}
          </div>
        </div>
        ${
          items.length === 0
            ? `<p class="review-block__empty">${escapeHtml(vide)}</p>`
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
      who: names.get(String(document.created_by ?? "")) || "Un collaborateur",
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
 *  - **Analyse** — qu'en dit la machine ? (les checks) Ce que l'analyse a lu,
 *    ce qu'elle en tire, et ce qu'elle n'a pas pu lire.
 *  - **Ce qui change** — qu'accepte-t-on, une affirmation à la fois ? (le diff)
 *
 * La valeur de ce découpage se voit surtout **six mois plus tard** : on revient
 * presque toujours pour la Conversation — qui a décidé, quand, sur quelle
 * base — et presque jamais pour la liste des fichiers. Mélanger les quatre
 * obligerait à relire un diff de dix-sept lignes pour retrouver une phrase.
 * ──────────────────────────────────────────────────────────────────────────── */

const REVIEW_TABS = [
  { id: "conversation", label: "Conversation", iconName: "comment-discussion" },
  { id: "deposits", label: "Dépôts", iconName: "git-commit" },
  { id: "analysis", label: "Analyse", iconName: "report" },
  { id: "changes", label: "Ce qui change", iconName: "file-diff" }
];

function reviewTabs(review) {
  const items = review.items ?? [];
  const compte = {
    deposits: (review.deposits ?? []).length,
    changes: items.length
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
function renderConversationActivity(event, index) {
  const identite = identityOf(event);

  return renderMessageThreadActivity({
    idx: index,
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

  const raconter = (events, depart) =>
    events
      .map((event, index) => {
        if (event.kind === STORY.COMMENT) return renderConversationComment(event, depart + index);
        return renderConversationActivity(event, depart + index);
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
    ${proposition.status === PROPOSITION.OPEN ? renderMergeBox(proposition, review) : ""}
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
function renderMergeBox(proposition, review) {
  const items = review.items ?? [];
  const blocage = describeBlocking(review.conflicts ?? []);
  const empeche = Boolean(blocage) || Boolean(review.error);

  const conditions = [
    {
      tone: review.error ? "warn" : "ok",
      // Le disque porte déjà la couleur : l'icône n'a plus qu'à être un signe.
      // `check-circle-fill` dessinerait un second cercle dans le premier.
      icon: review.error ? "alert" : "check",
      text: review.error ? "L'analyse n'a pas abouti" : "L'analyse a abouti",
      note: review.error ? review.error : describeAnalysis(review)
    },
    {
      tone: blocage ? "warn" : "ok",
      icon: blocage ? "alert" : "check",
      text: blocage ? "La mémoire du projet est contredite" : "Rien ne contredit la mémoire du projet",
      note: blocage || "Aucune décision passée n'est remise en cause par ce lot."
    }
  ];

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
            review.confirming
              ? ""
              : `
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
          `
          }

          ${review.confirming ? renderMergeForm(proposition, review) : renderMergeAction(review, empeche, blocage)}
        </div>
      </div>
    </section>
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
            ? "Tranchez ce qui est en attente pour pouvoir fusionner."
            : "Vous écrirez le message de la fusion avant qu'elle ne s'applique."
        )}
        ${
          blocage
            ? `<button type="button" class="merge-box__link" data-review-goto-changes>Régler les conflits</button>`
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

/** Ce que l'analyse a produit, en une phrase. */
function describeAnalysis(review) {
  const items = review.items ?? [];
  const avis = items.filter((entry) => entry.itemType === ITEM_TYPE.AVIS).length;
  const documents = items.filter((entry) => entry.itemType === ITEM_TYPE.DOCUMENT).length;
  const inchanges = Number.isFinite(review.diff?.unchanged) ? `, ${review.diff.unchanged} inchangé(s)` : "";

  return `${documents} livrable(s) soumis, ${avis} avis en mouvement${inchanges}.`;
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
function renderDeposits(review) {
  const depots = review.deposits ?? [];
  if (depots.length === 0) {
    return `<div class="propositions-empty"><b>Aucun dépôt</b><p>Cette proposition n'apporte aucun document.</p></div>`;
  }

  return depots
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
                    <li class="review-item review-item--plain">
                      <span class="review-item__check">${svgIcon("file-pdf", { className: "octicon" })}</span>
                      <div class="review-item__body">
                        <span class="review-item__title">${escapeHtml(
                          document.original_filename ?? document.filename ?? "Document"
                        )}</span>
                        <span class="review-item__meta">
                          ${escapeHtml(document.detected_kind_label ?? "Nature inconnue")}
                          ${document.detected_author ? ` · ${escapeHtml(document.detected_author)}` : ""}
                          ${document.issued_at ? ` · émis le ${escapeHtml(formatDate(document.issued_at))}` : ""}
                        </span>
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
function renderAnalysis(proposition, review) {
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
      review.unreachable.length > 0 ? nameSome(review.unreachable.map((row) => row?.original_filename)) : "aucun"
    ],
    [
      "Lu par",
      gele
        ? [snapshot?.engine, ...(snapshot?.packs ?? [])].filter(Boolean).join(" · ") || "non conservé"
        : [review.result?.engineVersion, ...Object.values(review.result?.packsUsed ?? {}).map((pack) => `${pack.pack_id} v${pack.pack_version}`)]
            .filter(Boolean)
            .join(" · ") || "—"
    ]
  ];

  return `
    <section class="review-block">
      <div class="review-panel">
        <div class="review-block__head">
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

/** Ce qui change : les contradictions d'abord, puis les affirmations. */
function renderChanges(review) {
  const items = review.items ?? [];
  const parType = (type) => items.filter((entry) => entry.itemType === type);
  const gele = review.frozen === true;

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
  `;
}

function renderReview(root) {
  const proposition = view.open;
  const review = view.review;
  const entete = renderReviewHead(proposition);

  if (!review || review.running) {
    return `
      ${entete}
      <div class="propositions-empty">
        <b>Analyse en cours…</b>
        <p>${escapeHtml(review?.step ?? "Lecture des livrables du projet et de ceux de cette proposition.")}</p>
      </div>
    `;
  }

  if (review.error && (review.items ?? []).length === 0) {
    return `
      ${entete}
      <div class="propositions-empty">
        <b>L'analyse n'a pas abouti</b>
        <p>${escapeHtml(review.error)}</p>
      </div>
    `;
  }

  const gele = review.frozen === true;
  const onglet = REVIEW_TABS.some((tab) => tab.id === view.tab) ? view.tab : "conversation";

  const avertissement = review.notice
    ? `<div class="propositions-empty propositions-empty--warn"><b>Réponse non conservée</b><p>${escapeHtml(
        review.notice
      )}</p></div>`
    : "";

  const panneau =
    onglet === "deposits"
      ? renderDeposits(review)
      : onglet === "analysis"
        ? renderAnalysis(proposition, review)
        : onglet === "changes"
          ? renderChanges(review)
          : renderConversation(proposition, review);

  return `
    ${entete}
    ${gele ? renderFrozenNote(proposition, review) : ""}
    ${avertissement}
    ${renderLightTabs({
      tabs: reviewTabs(review),
      activeTabId: onglet,
      className: "review-tabs",
      ariaLabel: "Sections de la proposition"
    })}
    <div class="review-tabpanel">${panneau}</div>
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

/** Le retour à la liste, les cases, les raisons, et la fusion. */
function bindReview(root) {
  // Le même mécanisme que pour un sujet : la page défile, la coque prend
  // `overlay-chrome--compact`, l'en-tête prend `details-head--compact`, et le
  // CSS partagé échange les deux titres.
  bindReviewCompact(root);


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

  // Le premier clic ouvre le formulaire ; c'est « Confirmer » qui fusionne.
  root.querySelector("[data-review-merge]")?.addEventListener("click", () => {
    const { title, note } = defaultMergeMessage({ proposition: view.open, items: view.review?.items ?? [] });
    view.mergeTitle = title;
    view.mergeNote = note;
    view.review.confirming = true;
    renderContent(root);
  });

  root.querySelector("[data-merge-cancel]")?.addEventListener("click", () => {
    view.review.confirming = false;
    renderContent(root);
  });

  const titre = root.querySelector("[data-merge-title]");
  if (titre) titre.addEventListener("input", (event) => { view.mergeTitle = event.target.value; });
  const note = root.querySelector("[data-merge-note]");
  if (note) note.addEventListener("input", (event) => { view.mergeNote = event.target.value; });

  root.querySelector("[data-merge-confirm]")?.addEventListener("click", () => merge(root));
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

  // « Régler les conflits » ne fusionne rien : il emmène là où l'on trancherait.
  root.querySelector("[data-review-goto-changes]")?.addEventListener("click", () => {
    view.tab = "changes";
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

async function postComment(root, { keepGoing = false } = {}) {
  const proposition = view.open;
  const texte = String(view.draft ?? "").trim();
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

    view.draft = "";
    view.preview = false;
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

    view.review.merging = false;
    view.review.confirming = false;
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
  } catch {
    view.review.merging = false;
    view.review.notice = "La fusion n'a pas abouti. La proposition reste ouverte : rien n'a été perdu.";
  }

  renderContent(root);
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

    const analyse = await analyzeProposition({
      projectId: proposition.project_id,
      // Ses documents sont désormais dans le corpus accepté : il n'y a plus rien
      // à y ajouter, et l'analyse porte donc sur le projet tel qu'il est devenu.
      proposition,
      project: store.projectForm ?? {},
      knownAvis: [],
      knownMarkers: await loadProjectMarkers(proposition.project_id)
    });

    if (!analyse.result) return;

    const documentIds = Object.fromEntries(
      analyse.reports.filter((report) => report.documentId).map((report) => [report.sourceId, report.documentId])
    );

    // L'écriture est la seule phase que l'analyse ne peut pas mesurer
    // elle-même : c'est ici qu'elle a lieu, c'est donc ici qu'on la chronomètre.
    const debutEcriture = Date.now();
    const ecrire = (steps) => [...steps, { id: "suivi", label: "Suivi écrit", ms: Date.now() - debutEcriture }];

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
  setProjectViewHeader({ contextLabel: "Propositions", variant: "propositions" });
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
    const [stored, documents] = await Promise.all([
      propositions.listPropositionItems(proposition.id),
      // Les documents restent lisibles : ils disent qui a déposé quoi, et quand.
      // Ce sont des faits, ils ne se recalculent pas.
      propositions.listPropositionDocuments(proposition.id)
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
      items: itemsFromDecisions(stored)
    };

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
  view.review = { running: true, step: "", items: [], unreachable: [], diff: { unchanged: 0 }, error: null };

  // La barre compacte nomme la proposition : c'est elle qu'on lit, pas l'onglet.
  setProjectViewHeader({
    contextLabel: "Propositions",
    variant: "propositions",
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
    const [{ analyzeProposition }, propositions, { loadCtAnalysis }, { loadProjectMarkers }] = await Promise.all([
      import("../services/proposition-analysis.js"),
      import("../services/propositions-supabase.js"),
      import("../services/ct-analysis-supabase.js"),
      import("../services/project-identity-supabase.js")
    ]);

    const projectId = proposition.project_id;
    const [memoire, marqueurs, decisions, assumees] = await Promise.all([
      loadCtAnalysis(projectId),
      loadProjectMarkers(projectId),
      propositions.listPropositionItems(proposition.id),
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

    const documents = await propositions.listPropositionDocuments(proposition.id);

    const { listPropositionComments } = await import("../services/proposition-comments.js");
    const comments = await listPropositionComments(proposition.id);

    const names = await propositions.loadAuthors([
      proposition.created_by,
      proposition.merged_by,
      proposition.closed_by,
      ...documents.map((row) => row.created_by),
      ...decisions.map((row) => row.decided_by),
      ...comments.map((row) => row.author_id)
    ]);

    view.review = {
      running: false,
      step: "",
      merging: false,
      error: analyse.error,
      unreachable: analyse.unreachable,
      diff: analyse.diff,
      result: analyse.result,
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
      story: buildStory({ proposition, documents, decisions, comments, names }),
      items: applyDecisions(
        [...documentItems(documents), ...attachmentItems(analyse.attachments), ...avisItems(analyse.diff)],
        decisions
      )
    };

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
