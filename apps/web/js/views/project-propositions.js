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
import { ITEM, PROPOSITION, describeMerge } from "../services/proposition-state.js";
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
  review: null
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
    root.innerHTML = `
      <section class="project-simple-page project-simple-page--propositions">
        <div class="propositions-shell">${renderReview(root)}</div>
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

/** L'état d'une proposition, tel qu'on le montre : un mot et une couleur. */
const PROPOSITION_BADGE = {
  [PROPOSITION.OPEN]: { label: "Ouverte", icon: "git-pull-request", tone: "open" },
  [PROPOSITION.MERGED]: { label: "Fusionnée", icon: "check-circle-fill", tone: "merged" },
  [PROPOSITION.CLOSED]: { label: "Fermée", icon: "stop-alert", tone: "closed" }
};

/**
 * L'en-tête d'une proposition, à la manière d'une pull request.
 *
 * Il est écrit ici plutôt que confié à `setProjectViewHeader` pour une raison
 * précise : ce composant échappe le HTML de son titre, et ne peut donc pas
 * porter la pastille d'état. Le rétrécissement au défilement, lui, est bien
 * mutualisé — il suit la classe `project-shell-compact` que la coque pose déjà
 * sur le `body`, et tout se passe en CSS.
 */
function renderReviewHead(proposition) {
  const badge = PROPOSITION_BADGE[proposition.status] ?? PROPOSITION_BADGE[PROPOSITION.OPEN];

  return `
    <header class="review-head">
      <button type="button" class="gh-btn gh-btn--sm review-head__back" data-review-back>← Toutes les propositions</button>
      <h2 class="review-head__title">
        ${escapeHtml(proposition.title)}
        <span class="review-head__number">#${Number(proposition.number) || "?"}</span>
      </h2>
      <div class="review-head__status">
        <span class="review-badge review-badge--${badge.tone}">
          ${svgIcon(badge.icon, { className: "octicon" })}
          <span>${badge.label}</span>
        </span>
        <span class="review-head__meta">
          ouverte le ${escapeHtml(formatDate(proposition.created_at))}
          ${proposition.merged_at ? `· fusionnée le ${escapeHtml(formatDate(proposition.merged_at))}` : ""}
        </span>
      </div>
      ${proposition.description ? `<p class="review-head__description">${escapeHtml(proposition.description)}</p>` : ""}
    </header>
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
  const cle = `${item.itemType}|${item.itemKey}`;

  return `
    <li class="review-item${refuse ? " is-refused" : ""}">
      <label class="review-item__check">
        <input type="checkbox" data-review-item="${escapeHtml(cle)}" ${refuse ? "" : "checked"}>
      </label>
      <div class="review-item__body">
        ${body}
        ${
          refuse
            ? `<input
                 type="text"
                 class="gh-input review-item__reason"
                 data-review-reason="${escapeHtml(cle)}"
                 value="${escapeHtml(item.reason ?? "")}"
                 placeholder="Pourquoi l'écarter ? (facultatif)"
               >`
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
 * Un bloc de la revue, avec sa case de tête.
 *
 * La case de tête vaut pour tout le bloc : elle est cochée quand tout l'est,
 * indéterminée quand une partie seulement l'est. C'est ce qui permet d'écarter
 * dix-sept avis d'un geste — ou de les accepter, ce qui est le cas courant.
 *
 * Un bloc vide se dit, il ne se cache pas : savoir qu'aucun avis ne change est
 * une information, pas une absence d'information.
 */
function renderReviewBlock(type, titre, items, renderer, vide) {
  const acceptes = items.filter((entry) => entry.status !== ITEM.REFUSED).length;
  const tous = items.length > 0 && acceptes === items.length;
  const aucun = acceptes === 0;

  return `
    <section class="review-block">
      <div class="review-block__head">
        ${
          items.length > 0
            ? `<label class="review-block__all">
                 <input
                   type="checkbox"
                   data-review-block="${escapeHtml(type)}"
                   ${tous ? "checked" : ""}
                   ${!tous && !aucun ? 'data-indeterminate="1"' : ""}
                 >
                 <span>Tout accepter</span>
               </label>`
            : ""
        }
        <h3 class="review-block__title">${escapeHtml(titre)} <span class="review-block__count">${items.length}</span></h3>
      </div>
      ${
        items.length === 0
          ? `<p class="review-block__empty">${escapeHtml(vide)}</p>`
          : `<ul class="review-list">${items.map(renderer).join("")}</ul>`
      }
    </section>
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

  if (review.error) {
    return `
      ${entete}
      <div class="propositions-empty">
        <b>L'analyse n'a pas abouti</b>
        <p>${escapeHtml(review.error)}</p>
      </div>
    `;
  }

  const items = review.items ?? [];
  const parType = (type) => items.filter((entry) => entry.itemType === type);
  const fusionnee = proposition.status !== PROPOSITION.OPEN;

  const avertissement = review.notice
    ? `<div class="propositions-empty propositions-empty--warn"><b>Réponse non conservée</b><p>${escapeHtml(
        review.notice
      )}</p></div>`
    : "";

  return `
    ${entete}
    ${
      review.unreachable.length > 0
        ? `<div class="propositions-empty propositions-empty--warn">
             <b>${review.unreachable.length} livrable(s) n'ont pas pu être rapatriés</b>
             <p>Ce qui manque au dossier et les avis sans nouvelles sont à lire avec cette réserve.</p>
           </div>`
        : ""
    }
    ${avertissement}
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
      review.result
        ? `Aucun avis ne change. ${review.diff.unchanged} avis restent en l'état.`
        : "Aucun livrable exploitable : il n'y a pas d'avis à en tirer."
    )}
    <footer class="review-merge">
      <p class="review-merge__summary">${escapeHtml(describeMerge(items))}</p>
      ${
        fusionnee
          ? `<p class="review-merge__done">Cette proposition a été fusionnée : elle ne peut plus l'être une seconde fois.</p>`
          : `<button type="button" class="gh-btn gh-btn--validate" data-review-merge ${
              review.merging ? "disabled" : ""
            }>${review.merging ? "Fusion en cours…" : "Fusionner la proposition"}</button>`
      }
    </footer>
  `;
}

/** Le retour à la liste, les cases, les raisons, et la fusion. */
function bindReview(root) {
  root.querySelector("[data-review-back]")?.addEventListener("click", () => backToList(root));

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

  root.querySelector("[data-review-merge]")?.addEventListener("click", () => merge(root));
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

  view.review.merging = true;
  view.review.notice = null;
  renderContent(root);

  try {
    const [{ mergeProposition }, { rememberProjectMarkers }, { markersToRemember }] = await Promise.all([
      import("../services/propositions-supabase.js"),
      import("../services/project-identity-supabase.js"),
      import("../services/project-identity.js")
    ]);

    const documents = items.filter((entry) => entry.itemType === ITEM_TYPE.DOCUMENT);
    const applique = await mergeProposition({
      proposition,
      acceptedDocumentIds: documents.filter((entry) => entry.status !== ITEM.REFUSED).map((entry) => entry.itemKey),
      refusedDocumentIds: documents.filter((entry) => entry.status === ITEM.REFUSED).map((entry) => entry.itemKey)
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
    view.open = { ...proposition, status: PROPOSITION.MERGED, merged_at: new Date().toISOString() };

    await recomputeAfterMerge(root, proposition);
  } catch {
    view.review.merging = false;
    view.review.notice = "La fusion n'a pas abouti. La proposition reste ouverte : rien n'a été perdu.";
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
  view.review = { running: true, step: "", items: [], unreachable: [], diff: { unchanged: 0 }, error: null };

  // La barre compacte nomme la proposition : c'est elle qu'on lit, pas l'onglet.
  setProjectViewHeader({
    contextLabel: "Propositions",
    variant: "propositions",
    compactLabel: `#${Number(proposition.number) || "?"} ${proposition.title}`,
    onCompactLabelClick: () => backToList(root)
  });
  renderContent(root);

  try {
    const [{ analyzeProposition }, propositions, { loadCtAnalysis }, { loadProjectMarkers }] = await Promise.all([
      import("../services/proposition-analysis.js"),
      import("../services/propositions-supabase.js"),
      import("../services/ct-analysis-supabase.js"),
      import("../services/project-identity-supabase.js")
    ]);

    const projectId = proposition.project_id;
    const [memoire, marqueurs, decisions] = await Promise.all([
      loadCtAnalysis(projectId),
      loadProjectMarkers(projectId),
      propositions.listPropositionItems(proposition.id)
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

    view.review = {
      running: false,
      step: "",
      merging: false,
      error: analyse.error,
      unreachable: analyse.unreachable,
      diff: analyse.diff,
      result: analyse.result,
      notice: null,
      items: applyDecisions(
        [...documentItems(documents), ...attachmentItems(analyse.attachments), ...avisItems(analyse.diff)],
        decisions
      )
    };
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
