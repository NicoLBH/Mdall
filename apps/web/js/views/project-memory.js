/**
 * L'onglet Mémoire : ce que le projet tient pour vrai.
 *
 * On disait « on compare le nouveau dépôt à la mémoire du projet » sans qu'un
 * écran puisse la montrer. Une mémoire qu'on ne peut pas consulter n'en est pas
 * une : personne ne peut vérifier ce qu'elle contient, ni corriger ce qu'elle a
 * retenu de travers, ni s'en servir pour décider.
 *
 * Ce que cet écran montre est **une liste d'affirmations**, pas une liste de
 * sujets. Un sujet est ce qu'un humain a décidé de suivre ; une affirmation est
 * un fait daté. C'est le partage de GitHub : tous les commits sont la mémoire,
 * seuls quelques-uns deviennent des issues.
 *
 * Trois gestes y vivent :
 *
 *  - **lire** : chercher, filtrer, et voir d'où vient chaque affirmation ;
 *  - **transmettre** : copier le dossier de contexte, qui est cette mémoire
 *    mise à plat, dans un ordre déterministe, avec ses dates et ses sources ;
 *  - **rattraper** : verser les propositions fusionnées avant que cette table
 *    n'existe. Leur procès-verbal a été conservé au gel — c'est précisément ce
 *    qui rend le rattrapage possible sans rien recalculer.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { clearProjectActiveScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import {
  MEMORY,
  assertionHistory,
  currentAssertions,
  buildContextExport,
  describeAssertionFacts,
  kindLabel,
  searchAssertions,
  summarizeMemory
} from "../services/project-memory.js";
import { normalizePaginationState, paginateItems, renderPaginationControls } from "./ui/pagination.js";
import {
  READER,
  describeEmptyReader,
  groupByDomain,
  readerLabel,
  readerLead,
  readerRows,
  summarizeReader
} from "../services/memory-readers.js";
import {
  ECART,
  describeEcart,
  findNonConformities,
  summarizeEcarts
} from "../services/memory-nonconformity.js";
import {
  DOMAINS,
  NATURE,
  NATURES,
  UNCLASSIFIED_LABEL,
  classifyAssertion,
  domainLabel,
  filterByTaxonomy,
  natureLabel,
  summarizeTaxonomy
} from "../services/assertion-taxonomy.js";
import {
  dependenciesOf,
  dependentsOf,
  describeDependents,
  describeReviewFlag,
  needsReview,
  pendingReviews
} from "../services/assertion-dependencies.js";
import {
  ACT,
  actsOf,
  corroboration,
  describeCorroboration,
  stateLabel,
  stateOf,
  verdictLabel
} from "../services/hypothesis-acts.js";
import { bindGhActionButtons, renderGhActionButton } from "./ui/gh-split-button.js";

const view = {
  loading: true,
  /** `null` : la lecture a échoué. `[]` : le projet n'a rien versé. */
  assertions: null,
  projectId: "",
  query: "",
  kind: "",
  status: "",
  /** La nature et le domaine voulus. `"none"` demande ce qui n'est pas classé. */
  nature: "",
  domain: "",
  /** `null` : le graphe des dépendances n'a pas pu être lu. `[]` : il est vide. */
  dependencies: null,
  /** Les actes portés sur les hypothèses. `null` : lecture impossible. */
  acts: null,
  /** Le formulaire de contestation ouvert, s'il y en a un. */
  contesting: null,
  contestDraft: { value: "", note: "" },
  /** Vrai quand on ne montre que ce qui attend une revérification. */
  pending: false,
  /** La lecture ouverte : tout, hypothèses, contraintes, constats en cours. */
  reader: READER.ALL,
  /** Le formulaire d'hypothèse, quand il est ouvert. */
  declaring: false,
  draft: { subject: "", value: "", domain: "" },
  includeSuperseded: false,
  notice: "",
  busy: false,
  /** L'affirmation dont on lit l'histoire : `{kind, subjectKey}` ou `null`. */
  open: null,
  page: 1
};

/**
 * Prête un état à l'écran, pour une page d'aperçu.
 *
 * Le rendu d'une ligne lit le graphe des dépendances et la mémoire entière —
 * il ne peut pas s'en passer sans mentir sur ce qu'il montre. Une page d'essai
 * qui recopierait son HTML finirait par diverger ; celle-ci monte le vrai
 * rendu, avec un état qu'on lui donne.
 */
export function __setMemoryStateForPreview({
  assertions = null,
  dependencies = null,
  acts = null,
  declaring = false,
  reader = READER.ALL
} = {}) {
  view.assertions = assertions;
  view.dependencies = dependencies;
  view.acts = acts;
  view.declaring = declaring;
  view.reader = reader;
}

let mountedRoot = null;
let tabResetBound = false;

function formatDate(value) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "date inconnue";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function nameOf(userId) {
  if (!userId) return "un collaborateur";
  return userId === store.user?.id ? "vous" : "un collaborateur";
}

/** Les compteurs : des comptes, jamais des estimations. */
/** Ce qu'une page porte. Au-delà, on ne lit plus, on fait défiler. */
const PAGE_SIZE = 25;

const KIND_ICON = {
  avis: "checklist",
  attachment: "cross-reference",
  document: "file",
  hypothesis: "pin"
};

function kindIcon(kind) {
  return KIND_ICON[String(kind ?? "")] ?? "dot-fill-pending";
}

function renderCounts(resume, vocabulaire, enAttente = 0) {
  const cellule = (valeur, mot, className = "") =>
    `<span class="memory-counts__item${className}"><b>${valeur}</b> ${escapeHtml(mot)}</span>`;

  return `
    <div class="memory-counts">
      ${cellule(resume.current, resume.current > 1 ? "affirmations en vigueur" : "affirmation en vigueur")}
      ${cellule(resume.assumed, "assumée(s)")}
      ${cellule(resume.rejected, "écartée(s)")}
      ${cellule(resume.superseded, "remplacée(s)")}
      ${
        // Ce qui attend une revérification passe devant : c'est la seule ligne
        // de ce bandeau qui appelle un geste aujourd'hui.
        enAttente > 0
          ? `<button type="button" class="memory-counts__item memory-counts__item--pending" data-memory-pending>
               <b>${enAttente}</b> à revérifier
             </button>`
          : ""
      }
      ${
        // **Ce qui n'est pas classé se compte au premier rang, pas en note de
        // bas de page.** C'est la seule façon qu'une lecture filtrée par domaine
        // ne se prenne pas pour une lecture complète : « tout l'incendie » aurait
        // l'air exhaustif alors que trois cents affirmations ne sont classées
        // nulle part. Le compteur est cliquable — on va voir ce qui manque.
        vocabulaire.unclassifiedDomain > 0
          ? `<button type="button" class="memory-counts__item memory-counts__item--unclassified" data-memory-unclassified>
               <b>${vocabulaire.unclassifiedDomain}</b> sans domaine
             </button>`
          : cellule(0, "sans domaine")
      }
    </div>
  `;
}

function renderFilters() {
  const option = (valeur, label, actuel) =>
    `<option value="${escapeHtml(valeur)}"${valeur === actuel ? " selected" : ""}>${escapeHtml(label)}</option>`;

  return `
    <div class="memory-filters">
      <input
        type="search"
        class="gh-input memory-filters__search"
        placeholder="Chercher dans la mémoire — un numéro d'avis, un mot du titre…"
        value="${escapeHtml(view.query)}"
        data-memory-search
      >
      <select class="gh-input memory-filters__select" data-memory-kind aria-label="Provenance">
        ${option("", "Toutes provenances", view.kind)}
        ${option("avis", "Avis", view.kind)}
        ${option("attachment", "Rattachements", view.kind)}
        ${option("document", "Documents", view.kind)}
      </select>
      <select class="gh-input memory-filters__select" data-memory-nature aria-label="Nature">
        ${option("", "Toutes natures", view.nature)}
        ${NATURES.map((nature) => option(nature, natureLabel(nature), view.nature)).join("")}
        ${option("none", `${UNCLASSIFIED_LABEL}e`, view.nature)}
      </select>
      <select class="gh-input memory-filters__select" data-memory-domain aria-label="Domaine">
        ${option("", "Tous domaines", view.domain)}
        ${DOMAINS.map((domaine) => option(domaine, domainLabel(domaine), view.domain)).join("")}
        ${option("none", UNCLASSIFIED_LABEL, view.domain)}
      </select>
      <select class="gh-input memory-filters__select" data-memory-status aria-label="État">
        ${option("", "Assumées et écartées", view.status)}
        ${option(MEMORY.ASSUMED, "Assumées", view.status)}
        ${option(MEMORY.REJECTED, "Écartées", view.status)}
      </select>
      <label class="memory-filters__toggle">
        <input type="checkbox" data-memory-superseded ${view.includeSuperseded ? "checked" : ""}>
        <span>Montrer ce qui a été remplacé</span>
      </label>
    </div>
  `;
}

/**
 * Une affirmation, avec de quoi en répondre.
 *
 * Trois choses se lisent sans cliquer : **de quoi il s'agit** (l'icône de la
 * nature et le titre), **ce que le projet en fait** (une pastille nommée —
 * « Assumée », « Écartée » —, parce qu'une coche verte demande d'être devinée),
 * et **d'où cela vient** (la date, la personne, la proposition citée `#P4`).
 *
 * Le titre est un lien : ce qu'une ligne ne peut pas porter — l'extrait qui la
 * fonde, les états successifs, la suite des décisions — se lit derrière lui.
 * Une mémoire réduite à des titres ne se vérifie pas.
 */
function renderAssertion(assertion) {
  const remplacee = Boolean(assertion.superseded_by);
  const ecartee = assertion.status === MEMORY.REJECTED;

  return `
    <li class="memory-row${remplacee ? " memory-row--superseded" : ""}">
      <span class="memory-row__mark" title="${escapeHtml(kindLabel(assertion.kind))}">
        ${svgIcon(kindIcon(assertion.kind), { className: "octicon" })}
      </span>
      <div class="memory-row__body">
        <div class="memory-row__head">
          <button
            type="button"
            class="memory-row__statement"
            data-memory-kind="${escapeHtml(assertion.kind ?? "")}"
            data-memory-open="${escapeHtml(assertion.subject_key ?? "")}"
          >${escapeHtml(assertion.statement)}</button>
          <span class="memory-pill memory-pill--${ecartee ? "rejected" : "assumed"}">
            ${svgIcon(ecartee ? "x-circle-fill" : "check-circle-fill", { className: "octicon" })}
            ${escapeHtml(ecartee ? "Écartée" : "Assumée")}
          </span>
        </div>
        ${renderHypothesisState(assertion)}
        ${renderReviewBanner(assertion)}
        ${assertion.detail ? `<span class="memory-row__detail">${escapeHtml(assertion.detail)}</span>` : ""}
        ${renderDependentsCount(assertion)}
        <span class="memory-row__meta">
          ${renderTaxonomy(assertion)}
          ${escapeHtml(kindLabel(assertion.kind))} ${escapeHtml(assertion.subject_key)}
          · ${escapeHtml(ecartee ? "écartée" : "assumée")} le ${escapeHtml(formatDate(assertion.decided_at))}
          par ${escapeHtml(nameOf(assertion.decided_by))}
          ${assertion.proposition_number ? `· <a href="#" class="md-proposition-link" data-memory-proposition="${escapeHtml(assertion.proposition_id ?? "")}">#P${Number(assertion.proposition_number)}</a>` : ""}
          ${remplacee ? `· <span class="memory-row__superseded">remplacée le ${escapeHtml(formatDate(assertion.superseded_at))}</span>` : ""}
        </span>
      </div>
    </li>
  `;
}

/**
 * L'état d'une hypothèse, sur sa ligne.
 *
 * **Candidate, validée ou contestée** — et le mot compte : une valeur que
 * personne n'a confirmée n'est pas une valeur acquise, et l'écran ne doit pas
 * la montrer comme telle. La corroboration l'accompagne sans la promouvoir :
 * « reprise par 3 sources, jamais validée » est une phrase honnête.
 *
 * Une contestation dit ce qu'elle avance, quand elle avance quelque chose :
 * c'est le doute, nommé plutôt qu'arbitré.
 */
function renderHypothesisState(assertion) {
  if (classifyAssertion(assertion).nature !== NATURE.HYPOTHESE) return "";
  if (view.acts === null) return "";

  const etat = stateOf(assertion.id, view.acts);
  const compte = describeCorroboration(corroboration(assertion.id, view.acts));

  const avance = etat.proposedValue
    ? `<span class="hypothesis-state__proposed">avance « ${escapeHtml(etat.proposedValue)} »</span>`
    : "";

  return `
    <span class="hypothesis-state">
      <span class="hypothesis-pill hypothesis-pill--${escapeHtml(etat.state)}">${escapeHtml(stateLabel(etat.state))}</span>
      ${etat.since ? `<span class="hypothesis-state__since">depuis le ${escapeHtml(formatDate(etat.since))}</span>` : ""}
      ${avance}
      <span class="hypothesis-state__count">${escapeHtml(compte)}</span>
    </span>
  `;
}

/**
 * Le bandeau d'une affirmation devenue suspecte.
 *
 * Il nomme l'hypothèse et la date : « à revérifier » sans dire pourquoi ni
 * depuis quand est une inquiétude, pas une information. Et il porte le geste
 * qui la lève — sans quoi on constaterait un problème sans pouvoir y répondre.
 */
function renderReviewBanner(assertion) {
  if (!needsReview(assertion)) return "";

  const hypothese = (view.assertions ?? []).find(
    (entry) => entry.id === dependenciesOf(assertion.id, view.dependencies ?? [])[0]
  );

  return `
    <div class="memory-review">
      <span class="memory-review__mark">${svgIcon("alert", { className: "octicon" })}</span>
      <span class="memory-review__text">${escapeHtml(describeReviewFlag(assertion, hypothese))}</span>
      <button type="button" class="gh-btn gh-btn--sm" data-memory-reviewed="${escapeHtml(assertion.id ?? "")}" ${
        view.busy ? "disabled" : ""
      }>Marquer revérifiée</button>
    </div>
  `;
}

/**
 * Ce qu'une hypothèse entraîne, sous elle.
 *
 * Le compte porte sur ce qui **attend encore** une revérification : une fois
 * revérifiées, ces affirmations ne demandent plus rien, et le répéter ferait un
 * compteur qu'on apprend à ignorer.
 */
function renderDependentsCount(assertion) {
  if (classifyAssertion(assertion).nature !== NATURE.HYPOTHESE) return "";

  const dependants = dependentsOf(assertion.id, view.dependencies ?? []);
  if (dependants.length === 0) return "";

  const enAttente = (view.assertions ?? []).filter(
    (entry) => dependants.includes(entry.id) && needsReview(entry)
  );

  const phrase = describeDependents(enAttente.length);
  if (!phrase) {
    return `<span class="memory-row__dependents">${escapeHtml(
      `${dependants.length} affirmation${dependants.length > 1 ? "s" : ""} en dépend${dependants.length > 1 ? "ent" : ""}`
    )}</span>`;
  }

  return `
    <button type="button" class="memory-row__dependents memory-row__dependents--pending" data-memory-pending>
      ${svgIcon("alert", { className: "octicon" })} ${escapeHtml(phrase)}
    </button>
  `;
}

/**
 * Le vocabulaire d'une affirmation, sur sa ligne.
 *
 * Deux étiquettes, et la seconde compte autant quand elle est vide : « non
 * classé » se lit, il ne se cache pas. Une mémoire dont on ne voit pas les
 * trous se croit complète.
 */
function renderTaxonomy(assertion) {
  const { nature, domain } = classifyAssertion(assertion);

  const etiquette = (texte, modificateur) =>
    `<span class="memory-tag memory-tag--${modificateur}">${escapeHtml(texte)}</span>`;

  return `
    ${nature ? etiquette(natureLabel(nature), "nature") : etiquette(UNCLASSIFIED_LABEL, "unknown")}
    ${domain ? etiquette(domainLabel(domain), "domain") : etiquette("Sans domaine", "unknown")}
  `;
}

/**
 * La liste des affirmations.
 *
 * Exportée parce qu'elle se regarde ailleurs que dans l'application : sans
 * session, l'écran de connexion s'affiche et cet onglet reste inatteignable —
 * une page d'essai qui recopierait son HTML finirait par mentir sur ce qu'elle
 * montre.
 */
export function renderMemoryList(lignes, page = 1, { grouped = false, reader = READER.ALL } = {}) {
  if (lignes.length === 0) {
    return `
      <div class="propositions-empty">
        <b>${escapeHtml(grouped ? readerLabel(reader) : "Rien ne correspond")}</b>
        <p>${escapeHtml(
          grouped
            ? describeEmptyReader(reader)
            : "Aucune affirmation ne répond à cette recherche. Ce qui a été remplacé est masqué par défaut."
        )}</p>
      </div>
    `;
  }

  // Une mémoire grossit à chaque fusion ; une page, non. Cinq cents lignes
  // d'un coup ne se lisent pas — et le navigateur les peine.
  const pagination = paginateItems(lignes, { pageSize: PAGE_SIZE, currentPage: page });

  // **Le regroupement se fait sur la page affichée, pas sur toute la liste** :
  // grouper d'abord et paginer ensuite couperait un domaine au milieu sans
  // qu'on sache qu'il continue.
  const corps = grouped
    ? groupByDomain(pagination.items)
        .map(
          (groupe) => `
            <section class="memory-group">
              <h3 class="memory-group__title">
                ${escapeHtml(groupe.label)}
                <span class="memory-group__count">${groupe.rows.length}</span>
              </h3>
              <ul class="memory-list">${groupe.rows.map(renderAssertion).join("")}</ul>
            </section>
          `
        )
        .join("")
    : `<ul class="memory-list">${pagination.items.map(renderAssertion).join("")}</ul>`;

  return `
    <div class="memory-results">
      ${corps}
      ${renderPaginationControls(pagination, { entity: "memory" })}
    </div>
  `;
}

/** La liste telle que cet écran la veut : groupée dès qu'on lit par lecture. */
function renderList(lignes, page = 1) {
  return renderMemoryList(lignes, page, { grouped: view.reader !== READER.ALL, reader: view.reader });
}

/**
 * Le détail d'une affirmation : son histoire, et ce sur quoi elle s'appuie.
 *
 * C'est ici que la mémoire cesse d'être une liste. « A12 » a été émis, puis
 * levé, puis rouvert : trois affirmations d'une même chose, et c'est la suite
 * qu'on vient lire. Chaque étape porte sa date, sa proposition et ce qui la
 * fonde — l'extrait du rapport, l'état d'avant, l'état d'après.
 *
 * Ce qui vaut aujourd'hui est en tête, en clair. Le reste est du passé, et se
 * lit comme tel.
 *
 * Exportée comme la liste : sans session, l'onglet est inatteignable, et une
 * page d'essai qui recopierait son HTML finirait par mentir sur ce qu'elle
 * montre.
 */
export function renderMemoryDetail(assertions, cible = {}) {
  const suite = assertionHistory(assertions, cible);
  if (suite.length === 0) {
    return `
      <div class="propositions-empty">
        <b>Cette affirmation n'est plus dans la mémoire</b>
        <p>Elle a peut-être été filtrée, ou la mémoire a été relue depuis.</p>
      </div>
    `;
  }

  const courante = suite.find((entry) => !entry.superseded_by) ?? suite[suite.length - 1];
  const ecartee = courante.status === MEMORY.REJECTED;
  const faits = describeAssertionFacts(courante);

  const etape = (assertion, rang) => {
    const propres = describeAssertionFacts(assertion);
    const perimee = Boolean(assertion.superseded_by);

    return `
      <li class="memory-step${perimee ? " memory-step--past" : ""}">
        <span class="memory-step__mark">${svgIcon(
          assertion.status === MEMORY.REJECTED ? "x-circle-fill" : "check-circle-fill",
          { className: "octicon" }
        )}</span>
        <div class="memory-step__body">
          <b>${escapeHtml(assertion.statement)}</b>
          <span class="memory-step__meta">
            ${escapeHtml(assertion.status === MEMORY.REJECTED ? "écartée" : "assumée")}
            le ${escapeHtml(formatDate(assertion.decided_at))} par ${escapeHtml(nameOf(assertion.decided_by))}
            ${assertion.proposition_number ? `· <a href="#" class="md-proposition-link" data-memory-proposition="${escapeHtml(assertion.proposition_id ?? "")}">#P${Number(assertion.proposition_number)}</a>` : ""}
            ${perimee ? `· remplacée le ${escapeHtml(formatDate(assertion.superseded_at))}` : "· en vigueur"}
          </span>
          ${
            propres.length > 0
              ? `<dl class="memory-facts">${propres
                  .map(
                    ([label, valeur]) =>
                      `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(valeur)}</dd>`
                  )
                  .join("")}</dl>`
              : ""
          }
        </div>
      </li>
    `;
  };

  return `
    <section class="memory-detail">
      <header class="memory-detail__head">
        <span class="memory-detail__mark">${svgIcon(kindIcon(courante.kind), { className: "octicon" })}</span>
        <div>
          <h2 class="memory-detail__title">${escapeHtml(courante.statement)}</h2>
          <p class="memory-detail__lead">
            ${escapeHtml(kindLabel(courante.kind))} ${escapeHtml(courante.subject_key)} ·
            ${escapeHtml(suite.length > 1 ? `${suite.length} états successifs` : "un seul état")} ·
            ${escapeHtml(ecartee ? "écartée aujourd'hui" : "assumée aujourd'hui")}
          </p>
        </div>
        <span class="memory-pill memory-pill--${ecartee ? "rejected" : "assumed"}">
          ${svgIcon(ecartee ? "x-circle-fill" : "check-circle-fill", { className: "octicon" })}
          ${escapeHtml(ecartee ? "Écartée" : "Assumée")}
        </span>
      </header>

      ${
        faits.length > 0
          ? `<div class="memory-detail__facts"><h3 class="memory-detail__section">Ce sur quoi elle s'appuie</h3>
              <dl class="memory-facts">${faits
                .map(([label, valeur]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(valeur)}</dd>`)
                .join("")}</dl></div>`
          : ""
      }

      ${renderActsPanel(courante)}
      ${renderDependencyPanel(courante)}

      <h3 class="memory-detail__section">Son histoire</h3>
      <ol class="memory-steps">${suite.map(etape).join("")}</ol>

      <p class="memory-detail__back">Re-cliquez l'onglet « Mémoire » pour revenir à la liste.</p>
    </section>
  `;
}

/**
 * Les trois lectures, et la liste entière.
 *
 * Ce ne sont **pas** trois écrans : ce sont trois filtres sur la même table.
 * Un utilitaire qui rassemblerait « toutes les hypothèses » en tenant ses
 * propres données donnerait deux mémoires, et personne ne saurait laquelle fait
 * foi le jour où elles divergent.
 *
 * Chaque lecture porte le compte de ce qu'elle montre : passer d'un onglet à
 * l'autre sans savoir combien on va trouver oblige à cliquer pour l'apprendre.
 */
/**
 * Les écarts que la mémoire porte, en tête de liste.
 *
 * Séparé des lectures parce qu'il ne se lit pas comme elles : une lecture dit
 * ce que le projet sait, celui-ci dit ce qui ne s'accorde pas. Le mêler à la
 * liste ferait passer un désaccord pour une connaissance de plus.
 *
 * Les non-conformités sont annoncées d'abord et nommées comme telles : elles
 * n'appellent pas un arbitrage mais une correction, et les noyer dans un total
 * ferait perdre la seule information qui commande une action.
 */
export function renderEcarts(assertions = view.assertions) {
  const ecarts = findNonConformities(assertions);
  if (ecarts.length === 0) return "";

  const resume = summarizeEcarts(ecarts);
  const tete = resume.nonConformities
    ? `${resume.nonConformities} non-conformité${resume.nonConformities > 1 ? "s" : ""}`
    : `${resume.total} écart${resume.total > 1 ? "s" : ""}`;

  const cartes = ecarts
    .map((ecart) => {
      const dit = describeEcart(ecart);
      const grave = ecart.type === ECART.NON_CONFORMITE;
      return `
        <li class="memory-ecart${grave ? " memory-ecart--grave" : ""}">
          <span class="memory-ecart__label">${escapeHtml(dit.label)}</span>
          <p class="memory-ecart__sentence">${escapeHtml(dit.sentence)}</p>
          <p class="memory-ecart__ask">${escapeHtml(dit.ask)}</p>
        </li>
      `;
    })
    .join("");

  return `
    <section class="memory-ecarts" aria-label="Écarts">
      <h5 class="memory-ecarts__title">${escapeHtml(tete)}</h5>
      <ul class="memory-ecarts__list">${cartes}</ul>
    </section>
  `;
}

function renderReaderTabs() {
  const onglet = (lecture) => {
    const combien = readerRows(view.assertions ?? [], lecture).length;
    const actif = view.reader === lecture;

    return `
      <button type="button" class="memory-readers__tab${actif ? " is-active" : ""}"
        data-memory-reader="${escapeHtml(lecture)}" ${actif ? 'aria-current="page"' : ""}>
        ${escapeHtml(readerLabel(lecture))}
        <span class="memory-readers__count">${combien}</span>
      </button>
    `;
  };

  return `
    <div class="memory-readers">
      <div class="memory-readers__tabs">
        ${[READER.ALL, READER.HYPOTHESES, READER.CONSTRAINTS, READER.FINDINGS].map(onglet).join("")}
      </div>
      <p class="memory-readers__lead">${escapeHtml(readerLead(view.reader))}</p>
    </div>
  `;
}

/**
 * Le formulaire d'une hypothèse.
 *
 * **Le sujet et la valeur sont deux champs, et c'est le point.** Une hypothèse
 * s'identifie par son sujet — « portance du sol » — et porte une valeur —
 * « 0,2 MPa ».
 * Les mêler dans un seul champ donnerait deux hypothèses en vigueur le jour où
 * la valeur change, alors qu'il n'y en a qu'une, qui a changé.
 *
 * Le domaine est facultatif et par défaut vide : on ne devine pas, ici non plus.
 */
export function renderMemoryFormForPreview() {
  return renderReaderTabs();
}

function renderHypothesisForm() {
  if (!view.declaring) return "";

  const option = (valeur, label) =>
    `<option value="${escapeHtml(valeur)}"${valeur === view.draft.domain ? " selected" : ""}>${escapeHtml(label)}</option>`;

  return `
    <form class="memory-declare" data-memory-declare-form>
      <p class="memory-declare__lead">
        Une hypothèse est ce qu'une mesure viendra trancher, et qui n'a pas encore été mesuré :
        on la retient parce que le travail ne peut pas attendre l'essai. Elle n'a qu'une valeur à
        la fois, et en changer rend suspect ce qui en découle. Le sujet reste, la valeur bouge.
      </p>
      <p class="memory-declare__lead">
        Une zone de neige, de vent ou sismique n'en est pas une : aucune mesure ne la tranche, un
        texte la fixe. Ce sont des contraintes.
      </p>
      <div class="memory-declare__row">
        <label class="memory-declare__field">
          <span>Sujet</span>
          <input class="gh-input" data-memory-draft="subject" value="${escapeHtml(view.draft.subject)}"
            placeholder="portance du sol" autocomplete="off">
        </label>
        <label class="memory-declare__field">
          <span>Valeur</span>
          <input class="gh-input" data-memory-draft="value" value="${escapeHtml(view.draft.value)}"
            placeholder="0,2 MPa" autocomplete="off">
        </label>
        <label class="memory-declare__field">
          <span>Domaine</span>
          <select class="gh-input" data-memory-draft="domain">
            ${option("", "Non classé")}
            ${DOMAINS.map((domaine) => option(domaine, domainLabel(domaine))).join("")}
          </select>
        </label>
      </div>
      <div class="memory-declare__actions">
        <button type="button" class="gh-btn" data-memory-declare-cancel>Annuler</button>
        <button type="submit" class="gh-btn gh-btn--primary" ${view.busy ? "disabled" : ""}>Déclarer</button>
      </div>
    </form>
  `;
}

/**
 * L'en-tête de l'écran.
 *
 * Il reprend celui d'un utilitaire de l'Atelier — « Suivi des avis du Bureau de
 * Contrôle » : le titre à gauche, les actions à droite, un filet dessous, puis
 * la phrase qui dit à quoi sert l'écran. C'est le même geste — consulter un
 * outil du projet —, il se présente donc de la même façon, et avec les mêmes
 * classes : deux en-têtes dessinés séparément divergent au premier changement.
 *
 * Exporté pour qu'une page d'aperçu monte cet en-tête-ci, et non une copie de
 * son HTML qui vieillirait à part.
 */
export function renderMemoryHead(resume, { busy = false } = {}) {
  return `
    <header class="memory-head settings-card__head">
      <span class="settings-card__head-title">
        <h4>La mémoire du projet</h4>
        <div class="memory-head__actions">
          ${renderExportButton(resume, busy)}
          <button type="button" class="gh-btn" data-memory-export ${
            resume.total === 0 || busy ? "disabled" : ""
          }>${svgIcon("copy", { className: "octicon" })} Copier le dossier de contexte</button>
          <button type="button" class="gh-btn gh-btn--primary" data-memory-declare ${busy ? "disabled" : ""}>
            ${svgIcon("plus", { className: "octicon" })} Déclarer une hypothèse
          </button>
          <button type="button" class="gh-btn" data-memory-site ${busy ? "disabled" : ""}>
            ${svgIcon("climate-tools", { className: "octicon" })} Verser les contraintes du site
          </button>
          <button type="button" class="gh-btn" data-memory-backfill ${busy ? "disabled" : ""}>
            ${svgIcon("history", { className: "octicon" })} Verser les propositions fusionnées
          </button>
        </div>
      </span>
      <p class="memory-head__lead">
        Ce que le projet tient pour vrai, avec la date à laquelle il l'a tranché et la proposition
        qui l'a versé. Ce qui se dérive d'un document — avis, rattachements, entrées au corpus —
        entre par la fusion d'une proposition. Une hypothèse, personne ne l'extrait encore : elle se
        déclare, et elle est datée et signée comme le reste. Les contraintes du site — zones de
        neige, de vent, de sismicité, profondeur hors gel — se déduisent de l'adresse : personne
        n'a à les retenir, elles se versent.
      </p>
    </header>
  `;
}

/**
 * Le bouton d'export, sur la ligne du titre.
 *
 * Le même qu'en tête d'une proposition, et volontairement : les deux fichiers
 * se comparent, et deux boutons dessinés différemment feraient croire à deux
 * exports de natures différentes.
 *
 * Il reste distinct de « Copier le dossier de contexte », qui met la mémoire en
 * prose dans le presse-papier pour la coller dans une conversation. Ici on
 * écrit un fichier structuré, qu'on ouvre dans un tableur ou qu'on relit.
 */
function renderExportButton(resume, busy = false) {
  return renderGhActionButton({
    id: "memoryExport",
    label: "Exporter",
    icon: svgIcon("download", { className: "octicon" }),
    size: "md",
    mainActionMode: "first-item",
    disabled: resume.total === 0 || busy,
    items: [
      { action: "export:json", label: "Exporter en JSON" },
      { action: "export:csv", label: "Exporter en CSV" }
    ]
  });
}

/** L'export de la mémoire : ce que la liste tient, écrit dans un fichier. */
function bindExportButton(root) {
  bindGhActionButtons();

  const action = root.querySelector('[data-action-id="memoryExport"]');
  if (!action) return;

  action.addEventListener("ghaction:action", async (event) => {
    const quoi = String(event.detail?.action || "");
    if (!quoi.startsWith("export:")) return;

    const [{ buildMemoryExport, memoryExportCsv, memoryExportFilename }, telechargement] = await Promise.all([
      import("../services/project-memory-export.js"),
      import("../utils/download-file.js")
    ]);

    // Tout est exporté, pas seulement la page affichée ni le filtre en cours :
    // un export partiel se comparerait mal, et rien à l'écran ne dirait qu'il
    // l'était.
    const exporte = buildMemoryExport({
      project: { id: view.projectId, ...(store.projectForm ?? {}) },
      assertions: view.assertions,
      generatedAt: new Date().toISOString()
    });

    if (quoi === "export:csv") {
      telechargement.downloadCsvFile({
        filename: memoryExportFilename(exporte, "csv"),
        text: memoryExportCsv(exporte)
      });
      return;
    }

    telechargement.downloadJsonFile({
      filename: memoryExportFilename(exporte, "json"),
      data: exporte
    });
  });
}

/**
 * Enregistre un acte porté sur une hypothèse.
 *
 * Une contestation marque aussitôt ce qui repose dessus — **sans attendre le
 * remplacement**. Attendre l'indice 2 de la note de calcul, c'est laisser
 * passer des semaines pendant lesquelles quelqu'un bâtit sur une valeur qu'on
 * sait déjà douteuse.
 */
async function recordHypothesisAct(root, { assertionId, verdict, proposedValue = "", note = "" } = {}) {
  if (!assertionId || view.busy) return;

  const [{ planAct }, { recordAct }] = await Promise.all([
    import("../services/hypothesis-acts.js"),
    import("../services/hypothesis-acts-supabase.js")
  ]);

  const plan = planAct({
    assertion: (view.assertions ?? []).find((entry) => entry.id === assertionId) ?? null,
    verdict,
    proposedValue,
    note,
    declaredBy: store.user?.id ?? null
  });

  if (!plan.ok) {
    view.notice = plan.reason;
    renderContent(root);
    return;
  }

  view.busy = true;
  view.notice = "";
  renderContent(root);

  const resultat = await recordAct(plan.act);
  view.busy = false;

  if (!resultat) {
    view.notice = "L'acte n'a pas pu être enregistré. L'hypothèse reste dans l'état où elle était.";
    renderContent(root);
    return;
  }

  view.acts = [...(view.acts ?? []), resultat.act];
  view.contesting = null;
  view.contestDraft = { value: "", note: "" };

  // Une contestation a pu lever des drapeaux ailleurs : on relit la mémoire
  // plutôt que d'afficher un écran qui n'est plus celui de la base.
  if (resultat.flagged > 0) {
    const memoire = await import("../services/project-memory-supabase.js");
    view.assertions = await memoire.listProjectAssertions(view.projectId);
    view.notice = `Contestation enregistrée. ${resultat.flagged} affirmation(s) qui reposent dessus sont à revérifier.`;
  }

  renderContent(root);
}

/**
 * Verse une hypothèse déclarée à la main.
 *
 * Le refus est nommé, jamais silencieux : un formulaire qui ne fait rien sans
 * dire pourquoi apprend à ne plus s'en servir.
 */
async function declareHypothesis(root) {
  if (view.busy) return;

  const [{ declaredHypothesis }, { rememberHypothesis }] = await Promise.all([
    import("../services/project-memory.js"),
    import("../services/project-memory-supabase.js")
  ]);

  const plan = declaredHypothesis({
    projectId: view.projectId,
    subject: view.draft.subject,
    value: view.draft.value,
    domain: view.draft.domain,
    declaredBy: store.user?.id ?? null
  });

  if (!plan.ok) {
    view.notice = plan.reason;
    renderContent(root);
    return;
  }

  view.busy = true;
  view.notice = "";
  renderContent(root);

  const resultat = await rememberHypothesis(plan.row);
  view.busy = false;

  if (!resultat) {
    view.notice = "L'hypothèse n'a pas pu être versée. Rien n'a changé dans la mémoire.";
    renderContent(root);
    return;
  }

  // On relit : le versement a pu périmer une valeur précédente et lever des
  // drapeaux ailleurs. Recopier la seule ligne écrite montrerait une mémoire
  // qui n'est plus celle de la base.
  const memoire = await import("../services/project-memory-supabase.js");
  view.assertions = await memoire.listProjectAssertions(view.projectId);

  view.declaring = false;
  view.draft = { subject: "", value: "", domain: "" };
  view.notice = resultat.flagged
    ? `Hypothèse versée. ${resultat.flagged} affirmation(s) qui en dépendent sont à revérifier.`
    : resultat.superseded
      ? "Hypothèse versée. Elle remplace la valeur précédente du même sujet."
      : "Hypothèse versée.";
  renderContent(root);
}

/**
 * Ce que les gens ont fait à cette hypothèse.
 *
 * Son histoire d'actes, et les deux gestes qu'on peut poser. **Tout le monde
 * peut valider comme tout le monde peut contester** : aucune qualification
 * n'est vérifiée, l'acte porte qui l'a posé et quand, et c'est au lecteur de
 * juger ce que vaut la signature.
 *
 * La contestation demande ce qu'elle avance — « le projet est en zone E » —,
 * facultativement : on peut contester sans savoir par quoi remplacer. Ce
 * qu'elle avance n'entre pas en mémoire ; il reste sur l'acte, et le doute se
 * lit au lieu d'être tranché par la machine.
 */
function renderActsPanel(courante) {
  if (classifyAssertion(courante).nature !== NATURE.HYPOTHESE) return "";

  if (view.acts === null) {
    return `
      <div class="memory-acts memory-acts--unknown">
        <h3 class="memory-detail__section">Ce qu'on en a dit</h3>
        <p>Les actes n'ont pas pu être lus. Ce n'est pas qu'il n'y en a aucun.</p>
      </div>
    `;
  }

  const histoire = actsOf(courante.id, view.acts);
  const enContestation = view.contesting === courante.id;

  const ligne = (acte) => `
    <li class="memory-acts__item">
      <b>${escapeHtml(verdictLabel(acte.verdict))}</b>
      le ${escapeHtml(formatDate(acte.created_at))} par ${escapeHtml(nameOf(acte.declared_by))}
      ${acte.proposed_value ? ` · avance « ${escapeHtml(acte.proposed_value)} »` : ""}
      ${acte.note ? `<span class="memory-acts__note">${escapeHtml(acte.note)}</span>` : ""}
    </li>
  `;

  return `
    <div class="memory-acts">
      <h3 class="memory-detail__section">Ce qu'on en a dit</h3>
      ${
        histoire.length > 0
          ? `<ol class="memory-acts__list">${histoire.map(ligne).join("")}</ol>`
          : `<p class="memory-acts__empty">Personne ne s'est encore prononcé. Elle est candidate — posée, pas confirmée.</p>`
      }

      ${
        enContestation
          ? `<form class="memory-acts__form" data-memory-contest-form="${escapeHtml(courante.id ?? "")}">
               <label class="memory-declare__field">
                 <span>Ce que vous avancez (facultatif)</span>
                 <input class="gh-input" data-memory-contest="value" value="${escapeHtml(view.contestDraft.value)}"
                   placeholder="E" autocomplete="off">
               </label>
               <label class="memory-declare__field">
                 <span>Pourquoi</span>
                 <input class="gh-input" data-memory-contest="note" value="${escapeHtml(view.contestDraft.note)}"
                   placeholder="le projet se situe en zone E" autocomplete="off">
               </label>
               <div class="memory-declare__actions">
                 <button type="button" class="gh-btn" data-memory-contest-cancel>Annuler</button>
                 <button type="submit" class="gh-btn" ${view.busy ? "disabled" : ""}>Contester</button>
               </div>
             </form>`
          : `<div class="memory-acts__actions">
               <button type="button" class="gh-btn" data-memory-validate="${escapeHtml(courante.id ?? "")}" ${
                 view.busy ? "disabled" : ""
               }>Je la valide</button>
               <button type="button" class="gh-btn" data-memory-contest-open="${escapeHtml(courante.id ?? "")}" ${
                 view.busy ? "disabled" : ""
               }>Je la conteste</button>
             </div>`
      }
    </div>
  `;
}

/**
 * Sur quoi cette affirmation repose, et ce qui repose sur elle.
 *
 * Les deux sens, parce qu'on vient y chercher deux questions différentes. Sur
 * une hypothèse : « qu'est-ce que je casse si je la change ? ». Sur une note de
 * calcul : « sur quoi ai-je bâti ça ? ».
 *
 * Le champ de déclaration n'accepte que des hypothèses, et il le dit. C'est le
 * geste manuel du plan — celui qui existe **à défaut** que la proposition le
 * dise elle-même.
 */
function renderDependencyPanel(courante) {
  const liens = view.dependencies;
  if (liens === null) {
    return `
      <div class="memory-depends memory-depends--unknown">
        <p>Les dépendances n'ont pas pu être lues. Ce n'est pas qu'il n'y en a aucune.</p>
      </div>
    `;
  }

  const lignes = currentAssertions(view.assertions ?? []);
  const nomDe = (id) => lignes.find((entry) => entry.id === id)?.statement ?? "une affirmation retirée";

  const socles = dependenciesOf(courante.id, liens);
  const dependants = dependentsOf(courante.id, liens);

  // Une affirmation ne repose que sur une hypothèse : proposer autre chose dans
  // la liste ferait offrir un geste qui sera refusé.
  const hypotheses = lignes.filter(
    (entry) => entry.id !== courante.id && classifyAssertion(entry).nature === NATURE.HYPOTHESE
  );

  const liste = (titre, ids) =>
    ids.length === 0
      ? ""
      : `<div class="memory-depends__block">
           <h4>${escapeHtml(titre)}</h4>
           <ul>${ids.map((id) => `<li>${escapeHtml(nomDe(id))}</li>`).join("")}</ul>
         </div>`;

  return `
    <div class="memory-depends">
      <h3 class="memory-detail__section">Ce qui la relie</h3>
      ${liste("Elle repose sur", socles)}
      ${liste("Reposent sur elle", dependants)}
      ${
        socles.length === 0 && dependants.length === 0
          ? `<p class="memory-depends__empty">Aucun lien déclaré. Une affirmation sans lien ne dit rien de faux — elle n'entraîne simplement rien.</p>`
          : ""
      }
      ${
        hypotheses.length === 0
          ? `<p class="memory-depends__empty">Aucune hypothèse dans la mémoire de ce projet : il n'y a rien sur quoi reposer.</p>`
          : `<div class="memory-depends__form">
               <label for="memoryDependsChoice">Déclarer qu'elle repose sur une hypothèse</label>
               <div class="memory-depends__row">
                 <select class="gh-input" id="memoryDependsChoice" data-memory-depends-choice>
                   ${hypotheses
                     .map(
                       (entry) =>
                         `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.statement)}</option>`
                     )
                     .join("")}
                 </select>
                 <button type="button" class="gh-btn" data-memory-depends="${escapeHtml(courante.id ?? "")}" ${
                   view.busy ? "disabled" : ""
                 }>Déclarer</button>
               </div>
             </div>`
      }
    </div>
  `;
}

/**
 * Marque une affirmation revérifiée.
 *
 * La date de suspicion **reste** : on doit pouvoir lire « suspectée le 12,
 * revérifiée le 14 ». Revérifier lève un drapeau, ça ne réécrit pas l'histoire.
 */
async function markAsReviewed(root, assertionId) {
  if (!assertionId || view.busy) return;

  view.busy = true;
  view.notice = "";
  renderContent(root);

  const quand = new Date().toISOString();
  const { markReviewed } = await import("../services/assertion-dependencies-supabase.js");
  const pris = await markReviewed({ assertionId, reviewedBy: store.user?.id ?? null, at: quand });

  view.busy = false;

  if (!pris) {
    view.notice = "La revérification n'a pas pu être enregistrée. L'affirmation reste signalée.";
    renderContent(root);
    return;
  }

  // On met à jour ce qu'on a sous la main plutôt que de tout relire : la base a
  // pris, l'écran doit le montrer, et relire trois cents lignes pour une date
  // ferait clignoter la page.
  view.assertions = (view.assertions ?? []).map((entry) =>
    entry.id === assertionId ? { ...entry, reviewed_at: quand, reviewed_by: store.user?.id ?? null } : entry
  );
  renderContent(root);
}

/**
 * Déclare qu'une affirmation repose sur une hypothèse.
 *
 * C'est le geste manuel, celui qui existe **à défaut** : quand une proposition
 * ne dit pas d'elle-même sur quoi elle s'appuie, quelqu'un qui le sait peut
 * l'écrire. Sans lui, le graphe ne se remplirait que le jour où les documents
 * citeront leurs hypothèses, c'est-à-dire jamais tout à fait.
 */
async function declareDependsOn(root, bouton) {
  const cibleId = bouton.getAttribute("data-memory-depends") || "";
  const hote = bouton.closest(".memory-depends");
  const choix = hote?.querySelector("[data-memory-depends-choice]");
  const hypotheseId = choix?.value || "";

  if (!cibleId || !hypotheseId || view.busy) return;

  const lignes = view.assertions ?? [];
  const { planDependency } = await import("../services/assertion-dependencies.js");
  const plan = planDependency({
    assertion: lignes.find((entry) => entry.id === cibleId) ?? null,
    dependsOn: lignes.find((entry) => entry.id === hypotheseId) ?? null,
    existing: view.dependencies ?? [],
    declaredBy: store.user?.id ?? null
  });

  if (!plan.ok) {
    view.notice = plan.reason;
    renderContent(root);
    return;
  }

  view.busy = true;
  renderContent(root);

  const { declareDependency } = await import("../services/assertion-dependencies-supabase.js");
  const ecrit = await declareDependency(plan.link);

  view.busy = false;

  if (!ecrit) {
    view.notice = "Le lien n'a pas pu être enregistré.";
    renderContent(root);
    return;
  }

  view.dependencies = [...(view.dependencies ?? []), ecrit];
  view.notice = "";
  renderContent(root);
}

/**
 * Ce que l'écran montre, tous filtres appliqués.
 *
 * **Un seul endroit décide.** La recherche redessinait la liste avec ses
 * propres critères, en oubliant la nature, le domaine et « à revérifier » :
 * taper une lettre faisait réapparaître ce qu'on venait d'écarter. Deux
 * endroits qui filtrent finissent toujours par filtrer différemment.
 */
function lignesVisibles() {
  // La lecture choisie s'applique d'abord : c'est elle qui décide de quoi on
  // parle, les autres filtres ne font que restreindre à l'intérieur.
  const filtrees = filterByTaxonomy(
    searchAssertions(readerRows(view.assertions ?? [], view.reader), {
      query: view.query,
      kind: view.kind,
      status: view.status,
      includeSuperseded: view.includeSuperseded
    }),
    { nature: view.nature, domain: view.domain }
  );

  // « À revérifier » se coche par-dessus les autres filtres : c'est une urgence,
  // pas une catégorie.
  return view.pending ? pendingReviews(filtrees) : filtrees;
}

function renderContent(root) {
  if (view.loading) {
    root.innerHTML = `
      <section class="project-simple-page project-simple-page--memory">
        <div class="propositions-shell">
          <div class="propositions-empty"><b>Lecture de la mémoire…</b></div>
        </div>
      </section>
    `;
    return;
  }

  // `null` ne se dit pas comme `[]`. « Le projet ne sait rien » et « je n'ai
  // pas pu lire » sont deux phrases différentes, et les confondre a déjà coûté
  // une soirée.
  if (view.assertions === null) {
    root.innerHTML = `
      <section class="project-simple-page project-simple-page--memory">
        <div class="propositions-shell">
          <div class="propositions-empty propositions-empty--warn">
            <b>La mémoire n'a pas pu être lue</b>
            <p>Ce n'est pas qu'elle est vide : la base n'a pas répondu. Rechargez la page pour réessayer.</p>
          </div>
        </div>
      </section>
    `;
    return;
  }

  if (view.open) {
    root.innerHTML = `
      <section class="project-simple-page project-simple-page--memory">
        <div class="propositions-shell">${renderMemoryDetail(view.assertions, view.open)}</div>
      </section>
    `;
    bind(root);
    return;
  }

  const resume = summarizeMemory(view.assertions);
  // Le vocabulaire se compte sur **ce qui vaut aujourd'hui**, pas sur toute
  // l'histoire : « 40 sans domaine » doit dire quarante affirmations à classer,
  // pas quarante états successifs de quatre d'entre elles.
  const vocabulaire = summarizeTaxonomy(currentAssertions(view.assertions));
  const lignes = lignesVisibles();
  const enAttente = pendingReviews(currentAssertions(view.assertions)).length;

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--memory">
      <div class="propositions-shell">
        ${renderMemoryHead(resume, { busy: view.busy })}

        ${renderReaderTabs()}

        ${renderEcarts(view.assertions)}

        ${renderHypothesisForm()}

        ${view.notice ? `<div class="propositions-empty propositions-empty--warn"><p>${escapeHtml(view.notice)}</p></div>` : ""}

        ${renderCounts(resume, vocabulaire, enAttente)}
        ${renderFilters()}
        ${renderList(lignes, view.page)}
      </div>
    </section>
  `;

  bind(root);
}

/**
 * Les gestes portés par les lignes de la liste, branchés **une seule fois**.
 *
 * La recherche redessine la liste seule — pour ne pas perdre le curseur à
 * chaque touche — et les lignes reconstruites n'étaient plus branchées. Le
 * titre était une ancre vers « # » : cliquer une affirmation après avoir tapé
 * un mot ne l'ouvrait pas, cela vidait le hash, et le routeur emmenait à
 * l'accueil.
 *
 * La délégation traite toute la classe : elle écoute la racine, qui ne change
 * pas, plutôt que des lignes qui se refont. Et le titre est devenu un bouton :
 * ouvrir une affirmation n'est pas une navigation, et rien ne doit se produire
 * si le geste n'a pas été compris.
 */
let listeDelegateeSur = null;

function bindListDelegation(root) {
  if (listeDelegateeSur === root) return;
  listeDelegateeSur = root;

  root.addEventListener("click", (event) => {
    const titre = event.target.closest?.("[data-memory-open]");
    if (titre) {
      const kind = titre.getAttribute("data-memory-kind") || "";
      // La clé métier est lue telle quelle : celle d'un rattachement porte des
      // « | », et la découper les perdait.
      const subjectKey = titre.getAttribute("data-memory-open") || "";
      if (!kind || !subjectKey) return;
      view.open = { kind, subjectKey };
      renderContent(root);
      return;
    }

    const proposition = event.target.closest?.("[data-memory-proposition]");
    if (proposition) {
      event.preventDefault();
      store.pendingPropositionId = proposition.getAttribute("data-memory-proposition") || "";
      const projet = String(location.hash || "").split("/")[1] || "";
      location.hash = `#project/${projet}/propositions`;
    }
  });
}

function bind(root) {
  bindListDelegation(root);
  bindExportButton(root);

  const recherche = root.querySelector("[data-memory-search]");
  if (recherche) {
    recherche.addEventListener("input", (event) => {
      view.query = event.target.value;
      // On redessine la liste seule : redessiner la page ferait perdre le
      // curseur à chaque touche.
      // Chercher ramène à la première page : rester en page 4 d'un résultat qui
      // en compte deux montrerait un vide qu'on prendrait pour une absence.
      view.page = 1;
      const hote = root.querySelector(".memory-results, .propositions-empty:not(.propositions-empty--warn)");
      // Les mêmes filtres que l'écran entier, sinon taper une lettre ferait
      // réapparaître ce que la nature ou le domaine venaient d'écarter.
      if (hote) hote.outerHTML = renderList(lignesVisibles(), view.page);
      bindPagination(root);
    });
  }

  root.querySelector("[data-memory-kind]")?.addEventListener("change", (event) => {
    view.kind = event.target.value;
    view.page = 1;
    renderContent(root);
  });

  root.querySelector("[data-memory-status]")?.addEventListener("change", (event) => {
    view.status = event.target.value;
    view.page = 1;
    renderContent(root);
  });

  root.querySelector("[data-memory-nature]")?.addEventListener("change", (event) => {
    view.nature = event.target.value;
    view.page = 1;
    renderContent(root);
  });

  root.querySelector("[data-memory-domain]")?.addEventListener("change", (event) => {
    view.domain = event.target.value;
    view.page = 1;
    renderContent(root);
  });

  root.querySelector("[data-memory-superseded]")?.addEventListener("change", (event) => {
    view.includeSuperseded = event.target.checked;
    view.page = 1;
    renderContent(root);
  });

  // Le compteur des non classés mène à ce qu'il compte : un nombre qu'on ne
  // peut pas ouvrir ne fait que culpabiliser.
  root.querySelector("[data-memory-unclassified]")?.addEventListener("click", () => {
    view.domain = "none";
    view.page = 1;
    renderContent(root);
  });

  for (const bouton of root.querySelectorAll("[data-memory-pending]")) {
    bouton.addEventListener("click", () => {
      view.pending = !view.pending;
      view.page = 1;
      renderContent(root);
    });
  }

  for (const bouton of root.querySelectorAll("[data-memory-reviewed]")) {
    bouton.addEventListener("click", () => markAsReviewed(root, bouton.getAttribute("data-memory-reviewed")));
  }

  for (const bouton of root.querySelectorAll("[data-memory-depends]")) {
    bouton.addEventListener("click", () => declareDependsOn(root, bouton));
  }

  root.querySelector("[data-memory-validate]")?.addEventListener("click", (event) => {
    recordHypothesisAct(root, { assertionId: event.currentTarget.getAttribute("data-memory-validate"), verdict: ACT.VALIDATED });
  });

  root.querySelector("[data-memory-contest-open]")?.addEventListener("click", (event) => {
    view.contesting = event.currentTarget.getAttribute("data-memory-contest-open");
    view.contestDraft = { value: "", note: "" };
    renderContent(root);
  });

  root.querySelector("[data-memory-contest-cancel]")?.addEventListener("click", () => {
    view.contesting = null;
    renderContent(root);
  });

  for (const champ of root.querySelectorAll("[data-memory-contest]")) {
    const cle = champ.getAttribute("data-memory-contest");
    champ.addEventListener("input", (event) => {
      view.contestDraft = { ...view.contestDraft, [cle]: event.target.value };
    });
  }

  root.querySelector("[data-memory-contest-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    recordHypothesisAct(root, {
      assertionId: event.currentTarget.getAttribute("data-memory-contest-form"),
      verdict: ACT.CONTESTED,
      proposedValue: view.contestDraft.value,
      note: view.contestDraft.note
    });
  });

  for (const bouton of root.querySelectorAll("[data-memory-reader]")) {
    bouton.addEventListener("click", () => {
      view.reader = bouton.getAttribute("data-memory-reader") || READER.ALL;
      view.page = 1;
      // Changer de lecture ne garde pas les filtres de la précédente : on ne
      // cherche pas la même chose, et un filtre invisible ferait croire à une
      // liste vide.
      view.pending = false;
      renderContent(root);
    });
  }

  root.querySelector("[data-memory-declare]")?.addEventListener("click", () => {
    view.declaring = !view.declaring;
    view.notice = "";
    renderContent(root);
  });

  root.querySelector("[data-memory-declare-cancel]")?.addEventListener("click", () => {
    view.declaring = false;
    view.draft = { subject: "", value: "", domain: "" };
    renderContent(root);
  });

  // Le brouillon se garde à la frappe : un rendu de l'écran ne doit pas effacer
  // ce qu'on est en train d'écrire.
  for (const champ of root.querySelectorAll("[data-memory-draft]")) {
    champ.addEventListener("input", (event) => {
      view.draft = { ...view.draft, [champ.getAttribute("data-memory-draft")]: event.target.value };
    });
    champ.addEventListener("change", (event) => {
      view.draft = { ...view.draft, [champ.getAttribute("data-memory-draft")]: event.target.value };
    });
  }

  root.querySelector("[data-memory-declare-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    declareHypothesis(root);
  });

  root.querySelector("[data-memory-export]")?.addEventListener("click", () => copyContext(root));
  root.querySelector("[data-memory-backfill]")?.addEventListener("click", () => backfill(root));
  root.querySelector("[data-memory-site]")?.addEventListener("click", () => versSiteConstraints(root));

  bindPagination(root);


}

/** Les pages. Le même mécanisme que le journal des actions, aux mêmes classes. */
function bindPagination(root) {
  for (const bouton of root.querySelectorAll('[data-pagination-entity="memory"][data-pagination-page]')) {
    bouton.addEventListener("click", (event) => {
      event.preventDefault();
      view.page = Math.max(1, Number.parseInt(bouton.getAttribute("data-pagination-page") || "1", 10) || 1);
      renderContent(root);
    });
  }
}

/**
 * Copie le dossier de contexte.
 *
 * Ce qu'on copie est ce qu'on donnerait à un modèle : la mémoire à plat, dans
 * un ordre déterministe, avec ses dates et ses sources — y compris ce qui a été
 * remplacé, mis à part. Le taire ferait répondre comme si un document périmé
 * valait encore.
 */
async function copyContext(root) {
  const texte = buildContextExport({
    project: { name: store.projectForm?.name ?? "" },
    assertions: view.assertions ?? [],
    generatedAt: new Date().toISOString()
  });

  try {
    await navigator.clipboard.writeText(texte);
    view.notice = "Le dossier de contexte est dans le presse-papiers.";
  } catch {
    view.notice = "Le presse-papiers a refusé la copie. Le dossier n'a pas été copié.";
  }
  renderContent(root);
}

/**
 * Verse les propositions fusionnées avant que la mémoire n'existe.
 *
 * Rien n'est recalculé : on lit leur procès-verbal, celui qui a été écrit au
 * gel, et on le verse tel quel. Les dates sont celles des fusions, pas celle
 * d'aujourd'hui — dater une décision de six mois du jour où l'on rattrape
 * serait réécrire l'histoire pour se simplifier la vie.
 *
 * Le geste est rejouable : une proposition ne verse qu'une fois chaque
 * affirmation, la base s'en assure.
 */
async function backfill(root) {
  if (view.busy) return;
  view.busy = true;
  view.notice = "Versement des propositions fusionnées…";
  renderContent(root);

  try {
    const [propositions, memoire] = await Promise.all([
      import("../services/propositions-supabase.js"),
      import("../services/project-memory-supabase.js")
    ]);

    const toutes = (await propositions.listPropositions(view.projectId)) ?? [];
    const fusionnees = toutes
      .filter((entry) => entry.status === "merged")
      .sort((gauche, droite) => String(gauche.merged_at ?? "").localeCompare(String(droite.merged_at ?? "")));

    let versees = 0;
    let echecs = 0;

    for (const proposition of fusionnees) {
      const items = await propositions.listPropositionItems(proposition.id);
      const resultat = await memoire.rememberProposition({
        proposition,
        items: (items ?? []).map((row) => ({
          itemType: row.item_type,
          itemKey: row.item_key,
          payload: row.payload,
          status: row.status,
          reason: row.reason
        }))
      });
      if (!resultat) echecs += 1;
      else versees += resultat.written;
    }

    view.assertions = await memoire.listProjectAssertions(view.projectId);
    view.notice = echecs
      ? `${versees} affirmation(s) versée(s). ${echecs} proposition(s) n'ont pas pu l'être.`
      : versees > 0
        ? `${versees} affirmation(s) versée(s) depuis ${fusionnees.length} proposition(s) fusionnée(s).`
        : "Rien à rattraper : la mémoire portait déjà tout ce que les propositions fusionnées ont décidé.";
  } catch {
    view.notice = "Le rattrapage n'a pas abouti. La mémoire reste ce qu'elle était.";
  }

  view.busy = false;
  renderContent(root);
}

/**
 * Verse les contraintes que le site impose.
 *
 * Rien n'est calculé ici : les zones ont été établies par les outils de
 * l'Atelier, et ce geste ne fait que les faire entrer en mémoire. Il ne demande
 * donc pas de trancher — une contrainte ne se retient pas, elle s'impose — mais
 * il reste un geste humain, daté et signé comme le reste.
 *
 * Le message dit ce qui porte une réserve, parce que c'est la seule chose que
 * le lecteur ait à faire ensuite : vérifier une entrée, pas juger une règle.
 */
async function versSiteConstraints(root) {
  if (view.busy) return;
  view.busy = true;
  view.notice = "Lecture des contraintes du site…";
  renderContent(root);

  try {
    const [site, memoire] = await Promise.all([
      import("../services/derived-constraints-supabase.js"),
      import("../services/project-memory-supabase.js")
    ]);

    const candidats = await site.siteConstraintCandidates(view.projectId);

    if (candidats.length === 0) {
      // Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien : on dit d'où
      // ces contraintes viendraient, plutôt que « aucune contrainte ».
      view.notice =
        "Aucune contrainte du site n'est encore calculée. Elles viennent des outils de l'Atelier — " +
        "zones climatiques, sismicité — et il faut les avoir lancés une fois.";
    } else {
      const resultat = await site.rememberSiteConstraints({
        projectId: view.projectId,
        candidates: candidats,
        declaredBy: store.user?.id ?? null
      });

      if (!resultat) {
        view.notice = "Le versement n'a pas abouti. La mémoire reste ce qu'elle était.";
      } else {
        const reserves = candidats.filter((candidat) => candidat.reserves.length > 0).length;
        const suite = reserves
          ? ` ${reserves} porte(nt) une réserve sur ses entrées : c'est l'adresse qu'on vérifie, pas la règle.`
          : "";
        view.notice = resultat.written
          ? `${resultat.written} contrainte(s) versée(s).${
              resultat.superseded ? ` ${resultat.superseded} valeur(s) corrigée(s).` : ""
            }${resultat.flagged ? ` ${resultat.flagged} affirmation(s) à revérifier.` : ""}${suite}`
          : `Rien de nouveau : la mémoire porte déjà ces ${candidats.length} contrainte(s).${suite}`;
        view.assertions = await memoire.listProjectAssertions(view.projectId);
      }
    }
  } catch {
    view.notice = "Le versement n'a pas abouti. La mémoire reste ce qu'elle était.";
  }

  view.busy = false;
  renderContent(root);
}

function bindTabReset() {
  if (tabResetBound) return;
  tabResetBound = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
    if (String(event?.detail?.tabId || "") !== "memoire") return;
    if (!mountedRoot?.isConnected) return;
    view.query = "";
    view.kind = "";
    view.status = "";
    view.includeSuperseded = false;
    view.notice = "";
    view.open = null;
    view.page = 1;
    renderContent(mountedRoot);
  });
}

export function renderProjectMemory(root) {
  if (!root) return;
  root.className = "project-shell__content";
  clearProjectActiveScrollSource();
  mountedRoot = root;
  bindTabReset();

  setProjectViewHeader({ contextLabel: "Mémoire", variant: "memory" });

  view.loading = true;
  view.notice = "";
  view.open = null;
  view.page = 1;
  renderContent(root);

  (async () => {
    try {
      const [{ resolveCurrentBackendProjectId }, memoire] = await Promise.all([
        import("../services/project-supabase-sync.js"),
        import("../services/project-memory-supabase.js")
      ]);

      // L'identifiant de route n'est pas celui de la base : les lire l'un pour
      // l'autre rend une liste vide sans erreur, ce qui est la pire des pannes.
      view.projectId = (await resolveCurrentBackendProjectId().catch(() => "")) || "";
      view.assertions = view.projectId ? await memoire.listProjectAssertions(view.projectId) : null;

      // Le graphe des dépendances se lit avec la mémoire : sans lui, une
      // affirmation suspecte s'afficherait sans dire de quelle hypothèse elle
      // dépend, et une hypothèse sans son compteur.
      const { listAssertionDependencies } = await import("../services/assertion-dependencies-supabase.js");
      view.dependencies = view.projectId ? await listAssertionDependencies(view.projectId) : null;

      // Les actes disent l'état d'une hypothèse : sans eux, toutes paraîtraient
      // candidates, y compris celles que le bureau de contrôle a validées.
      const { listHypothesisActs } = await import("../services/hypothesis-acts-supabase.js");
      view.acts = view.projectId ? await listHypothesisActs(view.projectId) : null;
    } catch {
      view.assertions = null;
      view.dependencies = null;
      view.acts = null;
    }

    view.loading = false;
    if (root.isConnected) renderContent(root);
  })();
}
