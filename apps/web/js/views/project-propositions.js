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
import { bindOverlayChromeCompact, renderOverlayChromeHead } from "./ui/overlay-chrome.js";
import { bindLightTabs, renderLightTabs } from "./ui/light-tabs.js";
import {
  renderMessageThread,
  renderMessageThreadActivity,
  renderMessageThreadComment
} from "./ui/message-thread.js";
import { STORY, buildStory } from "../services/proposition-story.js";
import { renderSharedDetailsTitleWrap } from "./ui/detail-header.js";
import { ITEM, PROPOSITION, describeMerge } from "../services/proposition-state.js";
import {
  buildSnapshot,
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
  tab: "conversation"
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
      ${svgIcon(id === PROPOSITION.OPEN ? "git-pull-request" : "check-circle-fill", { className: "octicon" })}
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
        ${svgIcon(merged ? "check-circle-fill" : closed ? "stop-alert" : "git-compare", { className: "octicon" })}
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

  return renderOverlayChromeHead({
    headId: "propositionsDetailsTitle",
    titleHtml: titleWrapHtml,
    headClassName: "review-head",
    actionsHtml:
      `<button type="button" class="gh-btn gh-btn--sm" data-review-back>` +
      `Toutes les propositions</button>`
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
 * Ce qu'on dit d'une proposition qui ne se fusionnera plus.
 *
 * Fusionnée et abandonnée ne sont pas la même fin, et les confondre sous un
 * même « close » ferait perdre la seule chose qui les distingue : dans un cas
 * les documents sont entrés, dans l'autre non.
 */
function closedNote(proposition) {
  return proposition.status === PROPOSITION.MERGED
    ? "Cette proposition a été fusionnée : elle ne peut plus l'être une seconde fois."
    : "Cette proposition a été abandonnée. Ses documents restent au projet, marqués refusés.";
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
  if (review.gap) {
    return `
      <div class="propositions-empty propositions-empty--warn">
        <b>État partiellement conservé</b>
        <p>${escapeHtml(review.gap)}</p>
      </div>
    `;
  }

  const quand = proposition.snapshot?.frozenAt ?? proposition.merged_at ?? null;
  const lu = [proposition.snapshot?.engine, ...(proposition.snapshot?.packs ?? [])].filter(Boolean).join(" · ");

  return `
    <div class="review-frozen">
      <span class="review-frozen__mark">${svgIcon("history", { className: "octicon" })}</span>
      <p class="review-frozen__text">
        État de la proposition ${
          proposition.status === PROPOSITION.MERGED ? "au moment de sa fusion" : "au moment de son abandon"
        }${quand ? `, le ${escapeHtml(formatDate(quand))}` : ""}.
        Cet écran ne se recalcule pas : il montre ce qui a été décidé${
          lu ? `, tel que ${escapeHtml(lu)} l'avait lu` : ""
        }.
      </p>
    </div>
  `;
}

/** Ce qu'une proposition close a fait, au passé. */
function describeFrozen(items = []) {
  const refuses = items.filter((entry) => entry.status === ITEM.REFUSED).length;
  const acceptes = items.length - refuses;

  if (items.length === 0) return "Aucune affirmation n'a été conservée pour cette proposition.";

  return refuses > 0
    ? `${acceptes} affirmation${acceptes > 1 ? "s" : ""} acceptée${acceptes > 1 ? "s" : ""}, ` +
        `${refuses} refusée${refuses > 1 ? "s" : ""}.`
    : `${acceptes} affirmation${acceptes > 1 ? "s" : ""} acceptée${acceptes > 1 ? "s" : ""}.`;
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
  { id: "analysis", label: "Analyse", iconName: "pulse" },
  { id: "changes", label: "Ce qui change", iconName: "file-directory" }
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
 * La conversation : la description comme premier message, puis les actes.
 *
 * GitHub présente la description d'une pull request comme le premier message
 * d'un fil, et c'est un choix de fond : ce texte n'est pas un champ de
 * formulaire, c'est **quelqu'un qui dit pourquoi**. Le jour où plusieurs
 * personnes proposeront des changements sur le même projet, c'est cette forme —
 * un auteur, une date, un propos — qui permettra de s'y retrouver.
 *
 * Les composants sont ceux des sujets (`renderMessageThread*`) : une discussion
 * de proposition et une discussion de sujet sont la même chose, et deux rendus
 * différents divergeraient au premier ajustement.
 */
function renderConversation(proposition, review) {
  const histoire = review.story ?? [];
  const auteur = histoire[0]?.who ?? "Un collaborateur";

  const description = proposition.description
    ? `<p>${escapeHtml(proposition.description)}</p>`
    : `<p class="review-empty-note">Aucune description n'a été donnée. La proposition parle alors d'elle-même : ce qu'elle dépose et ce qu'on en décide.</p>`;

  const messages = renderMessageThreadComment({
    idx: 0,
    author: auteur,
    tsHtml: `<span class="gh-comment-ts">a ouvert cette proposition le ${escapeHtml(
      formatDate(proposition.created_at)
    )}</span>`,
    bodyHtml: description,
    avatarInitial: (auteur[0] ?? "?").toUpperCase(),
    avatarType: "human"
  });

  const actes = histoire
    .filter((event) => event.kind !== STORY.OPENED)
    .map((event, index) =>
      renderMessageThreadActivity({
        idx: index + 1,
        iconHtml: `<span class="tl-activity__icon">${svgIcon(STORY_ICON[event.kind] ?? "git-commit", {
          className: "octicon"
        })}</span>`,
        textHtml: `<b>${escapeHtml(event.who)}</b> ${escapeHtml(event.text)}${
          event.at ? ` <span class="tl-activity__date">le ${escapeHtml(formatDate(event.at))}</span>` : ""
        }${event.detail ? `<span class="tl-activity__detail">${escapeHtml(event.detail)}</span>` : ""}`
      })
    )
    .join("");

  return `
    ${renderMessageThread({ itemsHtml: `${messages}${actes}`, className: "review-thread" })}
    ${renderMergeBox(proposition, review)}
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
 * ses checks : ce qui bloque doit se lire sans avoir à cliquer pour découvrir
 * que ça ne marche pas.
 */
function renderMergeBox(proposition, review) {
  const items = review.items ?? [];
  const gele = review.frozen === true;
  const blocage = describeBlocking(review.conflicts ?? []);

  if (proposition.status !== PROPOSITION.OPEN) {
    return `
      <section class="merge-box merge-box--done">
        <div class="merge-box__row merge-box__row--done">
          <span class="merge-box__icon">${svgIcon(
            proposition.status === PROPOSITION.MERGED ? "git-compare" : "skip",
            { className: "octicon" }
          )}</span>
          <div>
            <b>${escapeHtml(closedNote(proposition))}</b>
            <span class="merge-box__note">${escapeHtml(describeFrozen(items))}</span>
          </div>
        </div>
      </section>
    `;
  }

  const lignes = [
    {
      tone: review.error ? "warn" : "ok",
      icon: review.error ? "alert" : "check-circle-fill",
      text: review.error ? "L'analyse n'a pas abouti" : "L'analyse a abouti",
      note: review.error ? review.error : describeAnalysis(review)
    },
    {
      tone: blocage ? "warn" : "ok",
      icon: blocage ? "alert" : "check-circle-fill",
      text: blocage ? "La mémoire du projet est contredite" : "Rien ne contredit la mémoire du projet",
      note: blocage || "Aucune décision passée n'est remise en cause par ce lot."
    },
    {
      tone: "neutral",
      icon: "checklist",
      text: describeMerge(items),
      note: gele ? "" : "Ce qui n'a pas été tranché sera accepté."
    }
  ];

  return `
    <section class="merge-box">
      ${lignes
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
      <div class="merge-box__actions">
        <button type="button" class="gh-btn gh-btn--danger" data-review-abandon ${
          review.merging ? "disabled" : ""
        }>${review.abandoning ? "Confirmer l'abandon" : "Abandonner"}</button>
        <button type="button" class="gh-btn gh-btn--primary" data-review-merge ${
          review.merging || blocage ? "disabled" : ""
        }>${review.merging ? "Fusion en cours…" : "Fusionner la proposition"}</button>
      </div>
    </section>
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

/** Le retour à la liste, les cases, les raisons, et la fusion. */
function bindReview(root) {
  // Le même mécanisme que pour un sujet : la page défile, la coque prend
  // `overlay-chrome--compact`, l'en-tête prend `details-head--compact`, et le
  // CSS partagé échange les deux titres.
  // `document.documentElement` et non `document` : la fonction s'en sert pour
  // marquer qu'elle a déjà posé son écouteur, et un `Document` ne porte pas
  // d'attribut — on rebrancherait un écouteur à chaque rendu.
  bindOverlayChromeCompact(
    document.documentElement,
    root.querySelector("[data-review-chrome]"),
    "propositions"
  );

  root.querySelector("[data-review-back]")?.addEventListener("click", () => backToList(root));

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

  root.querySelector("[data-review-merge]")?.addEventListener("click", () => merge(root));
  root.querySelector("[data-review-abandon]")?.addEventListener("click", () => abandon(root));
}

function findItem(cle) {
  const [itemType, ...reste] = String(cle ?? "").split("|");
  const itemKey = reste.join("|");
  return (view.review?.items ?? []).find((entry) => entry.itemType === itemType && entry.itemKey === itemKey) ?? null;
}

function backToList(root) {
  view.open = null;
  view.review = null;
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
      snapshot: gele
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
    // L'écran devient le procès-verbal sans attendre un rechargement : les
    // cases disparaissent, l'état affiché est celui qu'on vient d'arrêter.
    view.review.frozen = true;
    view.open = {
      ...proposition,
      status: PROPOSITION.MERGED,
      merged_at: new Date().toISOString(),
      snapshot: gele
    };

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
    view.open = { ...proposition, status: PROPOSITION.CLOSED, snapshot: gele };

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
      documentCount: analyse.reports.length
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

    const names = await propositions.loadAuthorNames([
      proposition.created_by,
      proposition.merged_by,
      proposition.closed_by,
      ...documents.map((row) => row.created_by),
      ...stored.map((row) => row.decided_by)
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
      story: buildStory({ proposition, documents, decisions: stored, names }),
      items: itemsFromDecisions(stored)
    };
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

    const names = await propositions.loadAuthorNames([
      proposition.created_by,
      proposition.merged_by,
      proposition.closed_by,
      ...documents.map((row) => row.created_by),
      ...decisions.map((row) => row.decided_by)
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
      story: buildStory({ proposition, documents, decisions, names }),
      items: applyDecisions(
        [...documentItems(documents), ...attachmentItems(analyse.attachments), ...avisItems(analyse.diff)],
        decisions
      )
    };

    // Les conflits portent les mêmes objets que les blocs — pas des copies : ce
    // qu'on tranche dans l'un se voit dans l'autre, et la fusion se débloque
    // sans qu'on ait à recalculer quoi que ce soit.
    view.review.conflicts = findMemoryConflicts(view.review.items, assumees);
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

export function renderProjectPropositions(root) {
  if (!root) return;
  root.className = "project-shell__content";
  clearProjectActiveScrollSource();

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
