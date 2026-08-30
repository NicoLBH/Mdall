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
  documentItems,
  summarizeReview
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
 * ──────────────────────────────────────────────────────────────────────────── */

/** Le libellé d'un verdict de rattachement, en français. */
function attachmentTone(verdict) {
  return verdict === "FOREIGN" ? "danger" : "warn";
}

function renderReviewItem(item, body) {
  const refuse = item.status === ITEM.REFUSED;
  const accepte = item.status === ITEM.ACCEPTED;

  return `
    <li class="review-item${refuse ? " is-refused" : ""}${accepte ? " is-accepted" : ""}">
      <div class="review-item__body">${body}</div>
      <div class="review-item__decision">
        ${
          refuse
            ? `<span class="review-item__verdict review-item__verdict--refused">Refusé — ${escapeHtml(item.reason ?? "")}</span>`
            : accepte
              ? `<span class="review-item__verdict review-item__verdict--accepted">Accepté</span>`
              : ""
        }
        <div class="review-item__actions">
          <button type="button" class="gh-btn gh-btn--sm" data-review-accept="${escapeHtml(item.itemType)}|${escapeHtml(item.itemKey)}">
            ${accepte ? "Accepté" : "Accepter"}
          </button>
          <button type="button" class="gh-btn gh-btn--sm gh-btn--danger" data-review-refuse="${escapeHtml(item.itemType)}|${escapeHtml(item.itemKey)}">
            ${refuse ? "Refusé" : "Refuser"}
          </button>
        </div>
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
      ${reason && !kindLabel ? `<span class="review-item__reason">${escapeHtml(reason)}</span>` : ""}
    `
  );
}

function renderAttachmentItem(item) {
  const { label, verdict, reason, documents } = item.payload;
  return renderReviewItem(
    item,
    `
      <span class="review-item__title review-item__title--${attachmentTone(verdict)}">Affaire ${escapeHtml(label)}</span>
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
  const { change, reference, title, status, previousStatus, opinion } = item.payload;
  return renderReviewItem(
    item,
    `
      <span class="review-item__title">
        <span class="review-item__badge review-item__badge--${change}">${change === "added" ? "Nouvel avis" : "Change d'état"}</span>
        n° ${escapeHtml(reference)}${title ? ` — ${escapeHtml(title)}` : ""}
      </span>
      <span class="review-item__meta">
        ${previousStatus ? `${escapeHtml(previousStatus)} → ` : ""}${escapeHtml(status ?? "")}
        ${opinion ? ` · avis ${escapeHtml(opinion)}` : ""}
      </span>
    `
  );
}

/**
 * Un bloc de la revue.
 *
 * Un bloc vide se dit, il ne se cache pas : savoir qu'aucun avis ne change est
 * une information, pas une absence d'information.
 */
function renderReviewBlock(titre, items, renderer, vide) {
  return `
    <section class="review-block">
      <h3 class="review-block__title">${escapeHtml(titre)} <span class="review-block__count">${items.length}</span></h3>
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

  const entete = `
    <header class="review-head">
      <button type="button" class="gh-btn gh-btn--sm" data-review-back>← Toutes les propositions</button>
      <h2 class="review-head__title">
        ${escapeHtml(proposition.title)}
        <span class="review-head__number">#${Number(proposition.number) || "?"}</span>
      </h2>
      ${proposition.description ? `<p class="review-head__description">${escapeHtml(proposition.description)}</p>` : ""}
    </header>
  `;

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
  const bilan = summarizeReview(items);
  const avertissement = review.notice
    ? `<div class="propositions-empty propositions-empty--warn"><b>Réponse non conservée</b><p>${escapeHtml(
        review.notice
      )}</p></div>`
    : "";
  const parType = (type) => items.filter((entry) => entry.itemType === type);

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
    <p class="review-summary">${escapeHtml(describeMerge(items))}</p>
    ${renderReviewBlock(
      "Documents",
      parType(ITEM_TYPE.DOCUMENT),
      renderDocumentItem,
      "Cette proposition n'apporte aucun document."
    )}
    ${renderReviewBlock(
      "Rattachements",
      parType(ITEM_TYPE.ATTACHMENT),
      renderAttachmentItem,
      "Toutes les affaires du lot sont déjà rattachées à ce projet : rien à trancher."
    )}
    ${renderReviewBlock(
      "Avis",
      parType(ITEM_TYPE.AVIS),
      renderAvisItem,
      review.result
        ? `Aucun avis ne change. ${review.diff.unchanged} avis restent en l'état.`
        : "Aucun livrable exploitable : il n'y a pas d'avis à en tirer."
    )}
    <p class="review-note">
      ${bilan.undecided > 0
        ? `${bilan.undecided} affirmation${bilan.undecided > 1 ? "s" : ""} sans réponse. La fusion viendra à l'étape suivante.`
        : "Tout a été tranché. La fusion viendra à l'étape suivante."}
    </p>
  `;
}

/** Le retour à la liste, et les deux réponses possibles sur chaque affirmation. */
function bindReview(root) {
  root.querySelector("[data-review-back]")?.addEventListener("click", () => {
    view.open = null;
    view.review = null;
    setPropositionsHeader();
    renderContent(root);
  });

  for (const button of root.querySelectorAll("[data-review-accept]")) {
    button.addEventListener("click", () => decide(root, button.getAttribute("data-review-accept"), ITEM.ACCEPTED));
  }

  for (const button of root.querySelectorAll("[data-review-refuse]")) {
    button.addEventListener("click", () => decide(root, button.getAttribute("data-review-refuse"), ITEM.REFUSED));
  }
}

/**
 * L'humain tranche une affirmation.
 *
 * Un refus exige une raison, et l'écran la demande plutôt que d'accepter un
 * refus muet : c'est elle qui permettra plus tard de contester la décision
 * plutôt que de la subir.
 *
 * Rien n'est affiché comme tranché si la base n'a pas répondu. Laisser croire
 * qu'une réponse a été retenue alors qu'elle est perdue ferait reposer la même
 * question au prochain rechargement, sans qu'on comprenne pourquoi.
 */
async function decide(root, cle, status) {
  const [itemType, ...reste] = String(cle ?? "").split("|");
  const itemKey = reste.join("|");
  const item = (view.review?.items ?? []).find((entry) => entry.itemType === itemType && entry.itemKey === itemKey);
  if (!item) return;

  let reason = item.reason ?? null;
  if (status === ITEM.REFUSED) {
    const saisie = window.prompt("Pourquoi refuser cette affirmation ?", reason ?? "");
    if (saisie === null) return;
    if (!saisie.trim()) {
      view.review.error = null;
      view.review.notice = "Un refus sans raison ne peut pas être enregistré : c'est elle qui permet de le contester.";
      renderContent(root);
      return;
    }
    reason = saisie.trim();
  } else {
    reason = null;
  }

  try {
    const { decidePropositionItem } = await import("../services/propositions-supabase.js");
    const ok = await decidePropositionItem({
      propositionId: view.open.id,
      projectId: view.open.project_id,
      item,
      status,
      reason
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

  item.status = status;
  item.reason = reason;
  view.review.notice = null;
  renderContent(root);
}

/** L'en-tête de la liste — celui qui se compacte au défilement comme les autres. */
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

  // Le même en-tête que partout, avec son titre qui rétrécit au défilement.
  setProjectViewHeader({
    contextLabel: "Propositions",
    variant: "propositions",
    title: proposition.title,
    subtitle: `#${Number(proposition.number) || "?"}`,
    compactLabel: `#${Number(proposition.number) || "?"} ${proposition.title}`,
    onCompactLabelClick: () => {
      view.open = null;
      view.review = null;
      setPropositionsHeader();
      renderContent(root);
    }
  });
  renderContent(root);

  try {
    const [{ analyzeProposition }, { listPropositionItems }, { loadCtAnalysis }, { loadProjectMarkers }] =
      await Promise.all([
        import("../services/proposition-analysis.js"),
        import("../services/propositions-supabase.js"),
        import("../services/ct-analysis-supabase.js"),
        import("../services/project-identity-supabase.js")
      ]);

    const projectId = proposition.project_id;
    const [memoire, marqueurs, decisions] = await Promise.all([
      loadCtAnalysis(projectId),
      loadProjectMarkers(projectId),
      listPropositionItems(proposition.id)
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

    const { listPropositionDocuments } = await import("../services/propositions-supabase.js");
    const documents = await listPropositionDocuments(proposition.id);

    view.review = {
      running: false,
      step: "",
      error: analyse.error,
      unreachable: analyse.unreachable,
      diff: analyse.diff,
      result: analyse.result,
      notice: null,
      items: applyDecisions(
        [
          ...documentItems(documents),
          ...attachmentItems(analyse.attachments),
          ...avisItems(analyse.diff)
        ],
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
