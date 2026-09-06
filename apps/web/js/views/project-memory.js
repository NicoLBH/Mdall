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
import {
  renderNavList,
  renderNavListDivider,
  renderNavListGroup,
  renderNavListItem
} from "./ui/nav-list.js";
import {
  ZONE_TOUT_LOUVRAGE_LABEL,
  definedZones,
  describeZonesOf,
  zoneLabel,
  zonesOf
} from "../services/project-zones.js";
import {
  dropOtherTokens,
  onlyFilters,
  parseQuery,
  renderQueryMirror,
  suggestAt,
  withFilter
} from "../services/query-bar.js";
import {
  RAIL_MAX,
  RAIL_MIN,
  bindRailResizer,
  followRailScroll,
  railWidth,
  renderProjectRail
} from "./ui/project-rail.js";
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
  DOMAINS,
  NATURE,
  NATURES,
  UNCLASSIFIED_LABEL,
  classifyAssertion,
  isFoundational,
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
import { bindGhActionButtons, bindGhSelectMenus, renderGhActionButton, renderGhSelectMenu } from "./ui/gh-split-button.js";
import {
  LECTURE, preparerLaMemoire, fichierDuChemin, fichierEnClair,
  renderArbre, renderBarre, renderDossiers, renderFichiers, renderFichier
} from "./project-memoire-fichiers.js";
import { enClair } from "../services/memoire-en-texte.js";
import { propositionsSansTrace } from "../services/memoire-blame.js";
import { bindSideResizer } from "./ui/side-resizer.js";

/**
 * Les champs interrogeables de la mémoire.
 *
 * Ils sont écrits dans la barre de recherche, comme sur GitHub :
 * `nature:hypothese domaine:structure neige`. Les filtres et les mots vivent au
 * même endroit, et cet endroit est le champ de saisie — on lit ce qu'on
 * cherche, on le corrige au clavier, on le copie.
 */
/**
 * Ce qui s'écrit dans la barre pour un libellé.
 *
 * Les accents sont gardés — `nature:donnée-de-base` se lit, là où
 * `nature:donnee-de-base` fait code — mais la frappe reste tolérante : la barre
 * accepte l'un comme l'autre, quelle que soit la casse.
 */
function jeton(label) {
  return String(label ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

const MEMORY_FIELDS = [
  { key: "nature", label: "Nature", values: [
    ...NATURES.map((nature) => ({ value: nature, token: jeton(natureLabel(nature)), label: natureLabel(nature) })),
    { value: "none", token: jeton(UNCLASSIFIED_LABEL), label: UNCLASSIFIED_LABEL }
  ] },
  { key: "domaine", label: "Domaine", values: [
    ...DOMAINS.map((domaine) => ({ value: domaine, token: jeton(domainLabel(domaine)), label: domainLabel(domaine) })),
    { value: "none", token: jeton(UNCLASSIFIED_LABEL), label: UNCLASSIFIED_LABEL }
  ] },
  { key: "provenance", label: "Provenance", values: [
    { value: "avis", label: "Avis" },
    { value: "attachment", token: "rattachements", label: "Rattachements" },
    { value: "document", token: "documents", label: "Documents" }
  ] },
  { key: "etat", label: "État", values: [
    { value: "assumees", token: "assumées", label: "Assumées" },
    { value: "ecartees", token: "écartées", label: "Écartées" }
  ] },
  { key: "ouverts", label: "Constats", values: [{ value: "oui", label: "En cours" }] },
  { key: "remplacees", label: "Remplacées", values: [{ value: "oui", label: "Montrées" }] }
];

const ETAT_VERS_STATUT = { assumees: MEMORY.ASSUMED, ecartees: MEMORY.REJECTED };

/**
 * Ce que chaque lecture du rail veut dire, en filtres.
 *
 * Une lecture n'est pas un écran : c'est une requête toute faite. Le rail écrit
 * ces filtres dans la barre, et la barre reste modifiable — c'est ce qui permet
 * de partir d'« Hypothèses » puis d'ajouter « domaine:structure ».
 */
const READER_FILTERS = {
  [READER.ALL]: {},
  [READER.HYPOTHESES]: { nature: NATURE.HYPOTHESE },
  [READER.CONSTRAINTS]: { nature: NATURE.CONTRAINTE },
  [READER.FINDINGS]: { nature: NATURE.CONSTAT, ouverts: "oui" },
  [READER.BASE_DATA]: { nature: NATURE.DONNEE_BASE }
};

/**
 * La lecture que cette requête représente, ou « Tout ».
 *
 * **Elle se déduit, elle ne se retient pas.** Ajouter un filtre à la main fait
 * donc rebasculer le rail sur « Tout » sans que personne ait à y penser, et le
 * filtrage en cours reste intact — c'est exactement ce que fait GitHub quand on
 * complète une recherche partie d'un raccourci.
 */
function lectureDe(query) {
  const { filters } = parseQuery(query, MEMORY_FIELDS);
  const cles = Object.keys(filters).sort();

  for (const [lecture, attendus] of Object.entries(READER_FILTERS)) {
    const voulues = Object.keys(attendus).sort();
    if (voulues.length !== cles.length) continue;
    if (voulues.every((cle) => filters[cle] === attendus[cle])) return lecture;
  }
  return READER.ALL;
}

/** Où se retient le repli du panneau. Un réglage, pas un état de navigation. */
const NAV_COLLAPSED_KEY = "mdall.memoryNavCollapsed.v1";

/** Et sa largeur, qui est un réglage du même ordre. */
const NAV_WIDTH_KEY = "mdall.memoryNavWidth.v1";

function largeurRetenue() {
  try {
    const brut = Number(window.localStorage.getItem(NAV_WIDTH_KEY));
    return Number.isFinite(brut) && brut > 0 ? Math.max(RAIL_MIN, Math.min(RAIL_MAX, brut)) : 248;
  } catch {
    return 248;
  }
}

/** Retenir la largeur et le repli : ce sont des réglages, pas un état de page. */
function setNavWidth(largeur) {
  view.navWidth = largeur;
  try { window.localStorage.setItem(NAV_WIDTH_KEY, String(largeur)); } catch { /* un refus n'est pas une perte */ }
}

function setNavCollapsed(replie) {
  view.navCollapsed = Boolean(replie);
  try { window.localStorage.setItem(NAV_COLLAPSED_KEY, view.navCollapsed ? "1" : "0"); } catch { /* idem */ }
}

/** Le repli tel qu'on l'a laissé. Déplié par défaut : on ne cache rien d'office. */
function repliRetenu() {
  try {
    return window.localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

const view = {
  loading: true,
  /** `null` : la lecture a échoué. `[]` : le projet n'a rien versé. */
  assertions: null,
  projectId: "",
  query: "",
  /** La nature et le domaine voulus. `"none"` demande ce qui n'est pas classé. */
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
  navCollapsed: repliRetenu(),
  /** La proposition retenue dans la liste de complétion. */
  suggestion: -1,
  /** Les socles cochés, en attente de déclaration. */
  dependsDraft: [],
  navWidth: largeurRetenue(),
  /**
   * Où l'on est dans la mémoire, comme dans Documents.
   *
   * `[]` la racine et ses dossiers, `["Contraintes"]` un dossier et ses
   * fichiers, `["Contraintes", "Incendie"]` un fichier et son contenu.
   */
  chemin: [],
  /** Les dossiers repliés dans le rail. */
  replies: new Set(),
  /** « Code » ou « Blame » — deux questions, pas deux affichages. */
  lecture: LECTURE.CODE,
  /** Les noms des signataires, pour la marge du Blame. */
  auteurs: new Map(),
  /** Les propositions du projet, pour repérer celles qui n'ont rien versé. */
  propositions: [],
  draft: { subject: "", value: "", domain: "", zones: [] },
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
  view.query = onlyFilters(view.query, MEMORY_FIELDS, READER_FILTERS[reader] ?? {});
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

/**
 * La recherche, sur toute la largeur du tableau.
 *
 * Elle précède les filtres parce que c'est par elle qu'on commence : on cherche
 * un numéro d'avis ou un mot, et on affine ensuite. L'icône est à droite, en
 * gris : à gauche elle mangerait la place du texte au moment où on le tape.
 */
function renderSearch() {
  return `
    <div class="memory-search gh-field-focus">
      <div class="memory-search__field">
        <div class="memory-search__mirror" aria-hidden="true">${renderQueryMirror(view.query, MEMORY_FIELDS)}</div>
      <input
        type="search"
        class="gh-input memory-search__input"
        placeholder="Chercher dans la mémoire — un numéro d'avis, un mot du titre…"
        value="${escapeHtml(view.query)}"
        aria-label="Chercher dans la mémoire"
        data-memory-search
      >
      </div>
      <span class="memory-search__icon" aria-hidden="true">${svgIcon("search", { className: "octicon" })}</span>
      <div class="memory-search__suggestions" data-memory-suggestions hidden role="listbox"
        aria-label="Compléter la recherche"></div>
    </div>
  `;
}

/**
 * Les filtres, dans l'en-tête du tableau.
 *
 * Ils appartiennent au tableau qu'ils restreignent : posés au-dessus, ils
 * flottaient sans dire sur quoi ils portaient. Dans l'en-tête, la question ne
 * se pose plus.
 *
 * **Sans bordure.** Un filtre n'est pas une action : l'encadrer comme un bouton
 * en fait une chose à cliquer, alors qu'on ne le remarque que lorsqu'on cherche
 * à réduire la liste. Ils se signalent au survol, pas au repos.
 *
 * **Ce sont les menus de la maison, pas des `<select>` natifs.** Un `<select>`
 * fait dessiner sa liste par le système : sur fond sombre, les options
 * sortaient blanc sur blanc, illisibles, et aucune feuille de style ne peut les
 * atteindre. `renderGhSelectMenu` dessine la sienne — celle des autres écrans,
 * qui suit le thème.
 *
 * Ce qui a été remplacé est à gauche, seul de son espèce : c'est le seul
 * réglage qui **ajoute** des lignes au lieu d'en retirer, et le mêler aux
 * autres ferait croire l'inverse.
 */
function renderTableHead() {
  const { filters: filtres } = parseQuery(view.query, MEMORY_FIELDS);

  const menu = (id, options, valeur) =>
    renderGhSelectMenu({
      id,
      value: valeur,
      options,
      size: "sm",
      fieldClassName: "memory-filter",
      buttonClassName: "memory-filter__button"
    });

  return `
    <div class="memory-table__head">
      <label class="memory-table__toggle">
        <input type="checkbox" data-memory-superseded ${filtres.remplacees === "oui" ? "checked" : ""}>
        <span>Montrer ce qui a été remplacé</span>
      </label>
      <div class="memory-table__filters">
        ${menu("memoryKind", [
          { value: "", label: "Provenance" },
          { value: "avis", label: "Avis" },
          { value: "attachment", label: "Rattachements" },
          { value: "document", label: "Documents" }
        ], filtres.provenance ?? "")}
        ${menu("memoryNature", [
          { value: "", label: "Nature" },
          ...NATURES.map((nature) => ({ value: nature, label: natureLabel(nature) })),
          { value: "none", label: `${UNCLASSIFIED_LABEL}e` }
        ], filtres.nature ?? "")}
        ${menu("memoryDomain", [
          { value: "", label: "Domaine" },
          ...DOMAINS.map((domaine) => ({ value: domaine, label: domainLabel(domaine) })),
          { value: "none", label: UNCLASSIFIED_LABEL }
        ], filtres.domaine ?? "")}
        ${menu("memoryStatus", [
          { value: "", label: "État" },
          { value: "assumees", label: "Assumées" },
          { value: "ecartees", label: "Écartées" }
        ], filtres.etat ?? "")}
      </div>
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

  // La zone est toujours dite, même quand il n'y en a pas : « Ensemble — toutes
  // zones » est une portée, pas un vide. Ne rien écrire laisserait croire qu'on
  // a oublié de rattacher l'affirmation.
  const portee = describeZonesOf(assertion, view.assertions ?? []);

  return `
    ${nature ? etiquette(natureLabel(nature), "nature") : etiquette(UNCLASSIFIED_LABEL, "unknown")}
    ${domain ? etiquette(domainLabel(domain), "domain") : etiquette("Sans domaine", "unknown")}
    ${etiquette(portee, zonesOf(assertion).length ? "zone" : "unknown")}
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
  return renderMemoryList(lignes, page, { grouped: lectureDe(view.query) !== READER.ALL, reader: lectureDe(view.query) });
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
/**
 * Les caractéristiques d'une affirmation, toujours toutes affichées.
 *
 * **Y compris celles qui manquent.** Un écran qui n'affiche que ce qu'il sait
 * laisse croire que le reste n'existe pas ; le trait discontinu dit « cette
 * case est vide », ce qui est une information — et souvent celle qu'il faut
 * aller combler. C'est la même forme que dans le tableau : on retrouve d'un
 * écran à l'autre les mêmes pastilles, aux mêmes couleurs.
 */
function renderDetailTags(assertion, ecartee) {
  const { nature, domain } = classifyAssertion(assertion);
  const portees = zonesOf(assertion);

  const pastille = (valeur, vide) =>
    `<span class="memory-tag${vide ? " memory-tag--unknown" : " memory-tag--nature"}">${escapeHtml(valeur)}</span>`;

  return `
    <div class="memory-detail__tags">
      <span class="memory-detail__tags-label">Provenance</span>
      ${pastille(kindLabel(assertion.kind) || "Inconnue", !assertion.kind)}
      <span class="memory-detail__tags-label">Nature</span>
      ${pastille(nature ? natureLabel(nature) : UNCLASSIFIED_LABEL, !nature)}
      <span class="memory-detail__tags-label">Domaine</span>
      ${pastille(domain ? domainLabel(domain) : "Sans domaine", !domain)}
      <span class="memory-detail__tags-label">État</span>
      ${pastille(ecartee ? "Écartée" : "Assumée", false)}
      <span class="memory-detail__tags-label">Zones</span>
      ${
        portees.length === 0
          ? // Discontinu comme dans le tableau : « Ensemble — toutes zones » est la
            // valeur par défaut, et une valeur par défaut se signale partout de la
            // même façon — sinon on croit que l'un des deux écrans en sait plus.
            pastille(ZONE_TOUT_LOUVRAGE_LABEL, true)
          : portees.map((cle) => pastille(zoneLabel(cle, view.assertions ?? []), false)).join("")
      }
    </div>
  `;
}

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

      ${renderDetailTags(courante, ecartee)}

      ${
        faits.length > 0
          ? `<div class="memory-detail__facts"><h3 class="memory-detail__section">Ce qui l'établit</h3>
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
 * Les lectures, en colonne à gauche.
 *
 * Ce ne sont **pas** cinq écrans : ce sont cinq filtres sur la même table. Un
 * écran qui tiendrait ses propres données donnerait deux mémoires, et personne
 * ne saurait laquelle fait foi le jour où elles divergent.
 *
 * Le filet sépare deux ordres de choses. Au-dessus, ce que le projet **sait** —
 * ce qu'il a constaté, supposé, ce qu'on lui impose. En dessous, ce qu'il
 * **est** : les données de base, d'où partent toutes les déductions. Mettre les
 * deux dans la même liste ferait passer une entrée de calcul pour une
 * connaissance de plus.
 *
 * Chaque lecture porte le compte de ce qu'elle montre : passer d'une lecture à
 * l'autre sans savoir combien on va trouver oblige à cliquer pour l'apprendre.
 * Replié, il ne reste que les icônes — le compte disparaît avec le libellé, car
 * un nombre sans son sujet ne veut rien dire.
 */
function renderMemoryNav() {
  const replie = view.navCollapsed === true;

  const entree = (lecture) => {
    const combien = readerRows(view.assertions ?? [], lecture).length;
    const actif = lectureDe(view.query) === lecture;
    const libelle = readerLabel(lecture);

    return renderNavListItem({
      label: libelle,
      iconHtml: svgIcon(READER_ICONS[lecture] ?? "dot-fill-pending", { className: "octicon" }),
      trailing: String(combien),
      isActive: actif,
      dataAttributes: {
        "data-memory-reader": lecture,
        // Replié, le libellé n'est plus lisible : l'infobulle native le redonne,
        // et le compte avec lui.
        "data-tooltip": replie ? `${libelle} (${combien})` : ""
      }
    });
  };

  return renderProjectRail({
    id: "memoryRail",
    label: "Lectures de la mémoire",
    collapsed: replie,
    navHtml: renderNavList({
      label: "Lectures de la mémoire",
      html: `
        ${renderNavListGroup({
          items: [READER.ALL, READER.HYPOTHESES, READER.CONSTRAINTS, READER.FINDINGS].map(entree)
        })}
        ${renderNavListDivider()}
        ${renderNavListGroup({ items: [entree(READER.BASE_DATA)] })}
      `
    })
  });
}

/**
 * La poignée de largeur, et le calage du haut au fil du défilement.
 *
 * Les deux viennent du composant partagé : le rail de l'Atelier fait le même
 * geste, et deux copies de ce calage divergeraient au premier changement.
 */
function brancherRail(root) {
  if (poigneeDetacher) poigneeDetacher();
  if (railDetacher) railDetacher();

  railDetacher = followRailScroll(root.querySelector(".project-rail"));
  poigneeDetacher = bindRailResizer({
    root,
    id: "memoryRail",
    pageSelector: ".project-simple-page--memory",
    getWidth: () => view.navWidth,
    onEnd: (largeur) => {
      view.navWidth = largeur;
      try {
        window.localStorage.setItem(NAV_WIDTH_KEY, String(largeur));
      } catch {
        // Un navigateur qui refuse le stockage garde la largeur par défaut.
      }
    }
  });
}

/** De quoi retirer les écouteurs du rail précédent, et ceux de la poignée. */
let railDetacher = null;
let poigneeDetacher = null;

/** L'icône de chaque lecture. Une lecture sans icône se cherche, repliée. */
const READER_ICONS = {
  [READER.ALL]: "book",
  [READER.HYPOTHESES]: "issue-opened",
  [READER.CONSTRAINTS]: "shield",
  [READER.FINDINGS]: "tools",
  [READER.BASE_DATA]: "north-star"
};

/** La phrase de la lecture en cours, au-dessus de la liste. */
function renderReaderLead() {
  return `<p class="memory-readers__lead">${escapeHtml(readerLead(lectureDe(view.query)))}</p>`;
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
  return renderMemoryNav();
}

/**
 * La sidebar montée sur une mémoire donnée, pour une page d'aperçu.
 *
 * Exportée pour qu'un aperçu monte **cette** navigation-ci, et non une copie de
 * son HTML qui vieillirait à part.
 */
export function renderMemoryForPreview(assertions = [], { reader = READER.ALL, collapsed = false } = {}) {
  view.assertions = assertions;
  view.query = onlyFilters(view.query, MEMORY_FIELDS, READER_FILTERS[reader] ?? {});
  view.navCollapsed = collapsed;
  return `<div class="project-rail-layout${collapsed ? " project-rail-layout--collapsed" : ""}">${renderMemoryNav()}<div class="project-rail-layout__content">${renderReaderLead()}</div></div>`;
}

/**
 * À quelle partie de l'ouvrage l'affirmation s'applique.
 *
 * **« Ensemble — toutes zones » est coché par défaut**, parce que c'est le cas
 * ordinaire : une information vaut pour le projet entier tant que personne n'a
 * dit le contraire. Cocher une zone particulière le décoche ; tout décocher le
 * remet. On ne peut donc jamais se retrouver sans portée — et il n'y a pas de
 * différence entre « aucune zone » et « toutes », qui est justement la source
 * de confusion qu'on veut éviter.
 *
 * Si aucune zone n'est définie, on ne montre pas une case seule qui ne se
 * décoche pas : on dit où les définir.
 */
function renderZonePicker() {
  const zones = definedZones(view.assertions ?? []);
  const choisies = new Set(view.draft.zones ?? []);

  if (zones.length === 0) {
    return `
      <p class="memory-declare__hint">
        Cette affirmation vaudra pour l'ensemble du projet. Pour la rattacher à une partie,
        définissez d'abord un découpage dans Paramètres › Découpage du projet.
      </p>
    `;
  }

  const case_ = (cle, libelle, cochee) => `
    <label class="memory-zones__choice${cochee ? " is-checked" : ""}">
      <input type="checkbox" data-memory-zone="${escapeHtml(cle)}" ${cochee ? "checked" : ""}>
      <span>${escapeHtml(libelle)}</span>
    </label>
  `;

  return `
    <div class="memory-zones">
      <span class="memory-zones__label">Zones</span>
      <div class="memory-zones__choices">
        ${case_("", ZONE_TOUT_LOUVRAGE_LABEL, choisies.size === 0)}
        ${zones.map((zone) => case_(zone.key, zone.label, choisies.has(zone.key))).join("")}
      </div>
    </div>
  `;
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
      ${renderZonePicker()}
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
/**
 * Le titre de l'écran, d'après la lecture en cours.
 *
 * Un écran filtré qui garde le titre du tout se prend pour le tout : « La
 * mémoire du projet » au-dessus de quatre contraintes est faux. Le titre dit
 * donc ce qu'on regarde, et il change quand la lecture change.
 */
function titreDeLaLecture() {
  const titres = {
    [READER.ALL]: "Toute la mémoire du projet",
    [READER.HYPOTHESES]: "Hypothèses du projet",
    [READER.CONSTRAINTS]: "Contraintes du projet",
    [READER.FINDINGS]: "Constats du projet",
    [READER.BASE_DATA]: "Données de base du projet"
  };
  return titres[lectureDe(view.query)] ?? titres[READER.ALL];
}

export function renderMemoryHead(resume, { busy = false } = {}) {
  return `
    <header class="memory-head settings-card__head">
      <span class="settings-card__head-title">
        <h4>${escapeHtml(titreDeLaLecture())}</h4>
        <div class="memory-head__actions">
          ${renderExportButton(resume, busy)}
          ${renderVerserButton(busy)}
          <button type="button" class="gh-btn gh-btn--primary" data-memory-declare ${busy ? "disabled" : ""}>
            ${svgIcon("plus", { className: "octicon" })} Déclarer une hypothèse
          </button>
        </div>
      </span>
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
      { action: "export:csv", label: "Exporter en CSV" },
      // Copier le dossier de contexte est un export lui aussi : un fichier
      // qu'on relit d'un côté, une prose qu'on colle de l'autre, mais le même
      // geste — sortir la mémoire. Deux boutons pour un geste font une barre
      // qu'on lit deux fois.
      { action: "export:contexte", label: "Copier le dossier de contexte" }
    ]
  });
}

/**
 * Les versements, sous un seul bouton.
 *
 * Deux gestes de même nature — faire entrer en mémoire ce qui est déjà établi
 * ailleurs — et donc un seul bouton. Ils restent gris : ils n'écrivent que ce
 * qui a déjà été décidé, contrairement à la déclaration, qui est un acte.
 */
function renderVerserButton(busy = false) {
  return renderGhActionButton({
    id: "memoryVerser",
    label: "Verser",
    icon: svgIcon("plus-circle", { className: "octicon" }),
    size: "md",
    disabled: busy,
    items: [
      { action: "verser:site", label: "Verser les contraintes du site" },
      { action: "verser:propositions", label: "Verser les propositions fusionnées" }
    ]
  });
}

/**
 * Les deux versements, derrière un seul bouton.
 *
 * Séparé de l'export parce qu'ils ne vont pas dans le même sens : l'un sort la
 * mémoire, l'autre y fait entrer.
 */
function bindVerserButton(root) {
  const action = root.querySelector('[data-action-id="memoryVerser"]');
  if (!action) return;

  action.addEventListener("ghaction:action", (event) => {
    const quoi = String(event.detail?.action || "");
    if (quoi === "verser:site") void versSiteConstraints(root);
    if (quoi === "verser:propositions") void backfill(root);
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

    // La copie du dossier de contexte partage le bouton sans partager le
    // chemin : elle ne produit pas de fichier, elle remplit le presse-papier.
    if (quoi === "export:contexte") {
      await copyContext(root);
      return;
    }

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
    zones: view.draft.zones ?? [],
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
  view.draft = { subject: "", value: "", domain: "", zones: [] };
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

  // On repose sur ce que le projet a **posé** : une hypothèse, une contrainte,
  // une donnée de base. Un constat ne se choisit pas comme socle — il rapporte
  // ce qui a été vu, il ne fonde rien.
  const candidats = lignes.filter(
    (entry) => entry.id !== courante.id && isFoundational(classifyAssertion(entry).nature) && !socles.includes(entry.id)
  );

  const liste = (titre, aide, ids) =>
    ids.length === 0
      ? ""
      : `<div class="memory-depends__block">
           <h4>${escapeHtml(titre)}</h4>
           <p class="memory-depends__hint">${escapeHtml(aide)}</p>
           <ul>${ids.map((id) => `<li>${escapeHtml(nomDe(id))}</li>`).join("")}</ul>
         </div>`;

  const choisies = new Set(view.dependsDraft ?? []);

  return `
    <div class="memory-depends">
      <h3 class="memory-detail__section">Ce dont elle dépend</h3>
      ${liste(
        "Elle dépend de",
        "Si l'une de ces valeurs change, cette affirmation devient à revérifier.",
        socles
      )}
      ${liste(
        "En dépendent",
        "Ces affirmations deviendront à revérifier si celle-ci change.",
        dependants
      )}
      ${
        socles.length === 0 && dependants.length === 0
          ? `<p class="memory-depends__empty">Aucune dépendance déclarée. Une affirmation sans dépendance ne dit rien de faux — elle n'entraîne simplement rien, et rien ne l'entraîne.</p>`
          : ""
      }
      ${
        candidats.length === 0
          ? `<p class="memory-depends__empty">Rien sur quoi reposer : il n'y a dans cette mémoire ni hypothèse, ni contrainte, ni donnée de base qui ne soit déjà déclarée.</p>`
          : `<div class="memory-depends__form">
               <p class="memory-depends__label">Déclarer ce dont elle dépend</p>
               <p class="memory-depends__hint">
                 Plusieurs à la fois : une note de calcul repose souvent sur une zone climatique
                 <em>et</em> sur une portance de sol.
               </p>
               <div class="memory-depends__choices">
                 ${candidats
                   .map(
                     (entry) => `
                       <label class="memory-depends__choice${choisies.has(entry.id) ? " is-checked" : ""}">
                         <input type="checkbox" data-memory-depends-pick="${escapeHtml(entry.id)}"
                           ${choisies.has(entry.id) ? "checked" : ""}>
                         <span class="memory-tag memory-tag--nature">${escapeHtml(
                           natureLabel(classifyAssertion(entry).nature)
                         )}</span>
                         <span>${escapeHtml(entry.statement)}</span>
                       </label>
                     `
                   )
                   .join("")}
               </div>
               <button type="button" class="gh-btn" data-memory-depends="${escapeHtml(courante.id ?? "")}" ${
                 view.busy || choisies.size === 0 ? "disabled" : ""
               }>Déclarer ${choisies.size > 1 ? `les ${choisies.size} dépendances` : "la dépendance"}</button>
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
  const choisies = [...new Set(view.dependsDraft ?? [])].filter(Boolean);

  if (!cibleId || choisies.length === 0 || view.busy) return;

  const lignes = view.assertions ?? [];
  const cible = lignes.find((entry) => entry.id === cibleId) ?? null;

  const { planDependency } = await import("../services/assertion-dependencies.js");

  // On planifie tout avant d'écrire quoi que ce soit : un lot à moitié écrit
  // laisserait l'écran dire une chose et la base une autre.
  const plans = [];
  const existing = [...(view.dependencies ?? [])];
  for (const socleId of choisies) {
    const plan = planDependency({
      assertion: cible,
      dependsOn: lignes.find((entry) => entry.id === socleId) ?? null,
      existing,
      declaredBy: store.user?.id ?? null
    });
    if (!plan.ok) {
      view.notice = plan.reason;
      renderContent(root);
      return;
    }
    plans.push(plan.link);
    existing.push(plan.link);
  }

  view.busy = true;
  renderContent(root);

  const { declareDependency } = await import("../services/assertion-dependencies-supabase.js");
  let ecrits = 0;
  for (const lien of plans) {
    if (await declareDependency(lien)) ecrits += 1;
  }

  view.busy = false;
  view.dependsDraft = [];

  if (ecrits === 0) {
    view.notice = "Aucun lien n'a pu être enregistré.";
    renderContent(root);
    return;
  }

  view.notice = ecrits < plans.length
    ? `${ecrits} lien(s) sur ${plans.length} enregistré(s).`
    : "";

  // On relit les liens plutôt que de les deviner : c'est la base qui dit ce
  // qu'elle a accepté.
  try {
    const { listAssertionDependencies } = await import("../services/assertion-dependencies-supabase.js");
    view.dependencies = (await listAssertionDependencies(view.projectId)) ?? view.dependencies;
  } catch {
    // Le lien est écrit ; ne pas savoir le relire n'annule pas l'écriture.
  }

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
  const { filters, text } = parseQuery(view.query, MEMORY_FIELDS);

  // Les constats en cours ne se disent pas par une nature : c'est un constat
  // qu'aucune levée n'a fermé. Ce filtre-là s'applique donc à part.
  const departFin = filters.ouverts === "oui"
    ? readerRows(view.assertions ?? [], READER.FINDINGS)
    : (view.assertions ?? []);

  const filtrees = filterByTaxonomy(
    searchAssertions(departFin, {
      query: text,
      kind: filters.provenance ?? "",
      status: ETAT_VERS_STATUT[filters.etat] ?? "",
      includeSuperseded: filters.remplacees === "oui"
    }),
    { nature: filters.nature ?? "", domain: filters.domaine ?? "" }
  );

  // « À revérifier » se coche par-dessus les autres filtres : c'est une urgence,
  // pas une catégorie.
  return view.pending ? pendingReviews(filtrees) : filtrees;
}

function renderContent(root) {
  if (view.loading) {
    root.innerHTML = `
      <section class="project-simple-page project-simple-page--memory"
      style="--project-rail-width:${railWidth(view.navWidth, view.navCollapsed)}px">
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
      <section class="project-simple-page project-simple-page--memory"
      style="--project-rail-width:${railWidth(view.navWidth, view.navCollapsed)}px">
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
      <section class="project-simple-page project-simple-page--memory"
      style="--project-rail-width:${railWidth(view.navWidth, view.navCollapsed)}px">
        <div class="propositions-shell">${renderMemoryDetail(view.assertions, view.open)}</div>
      </section>
    `;
    bind(root);
    return;
  }

  const resume = summarizeMemory(view.assertions);
  const memoire = preparerLaMemoire(view.assertions);
  // La racine n'a pas de rail : le rail sert à passer d'un fichier à l'autre, et
  // à la racine il redirait mot pour mot ce que la page montre déjà. Un dépôt
  // ouvre de la même façon.
  const racine = view.chemin.length === 0;
  const ouverte = !racine && view.navCollapsed !== true;
  const largeur = ouverte ? Math.max(220, Math.min(520, Number(view.navWidth) || 280)) : 0;

  // La recherche traverse les dossiers : c'est le geste qu'on fait quand on ne
  // sait pas où c'est rangé, et un navigateur qui refuserait de chercher
  // obligerait à ouvrir cinq dossiers pour trouver une ligne.
  const cherche = String(view.query ?? "").trim().length > 0;

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--memory">
      <div class="propositions-shell">
        ${renderMemoryHead(resume, { busy: view.busy })}
        ${renderRattrapage()}
        ${view.notice ? `<div class="propositions-empty propositions-empty--warn"><p>${escapeHtml(view.notice)}</p></div>` : ""}
        ${renderHypothesisForm()}

        ${renderBarre({ chemin: view.chemin, query: view.query, ouverte, racine })}

        <div class="memoire-layout${ouverte ? "" : " memoire-layout--replie"}${racine ? " memoire-layout--racine" : ""}" style="--memoire-tree-width:${largeur}px">
          ${racine ? "" : renderArbre(memoire, { chemin: view.chemin, replies: view.replies, ouverte })}
          <div class="memoire-corps">
            ${
              cherche
                ? `<div class="memory-table">${renderTableHead()}${renderList(lignesVisibles(), view.page)}</div>`
                : renderVue(memoire)
            }
          </div>
        </div>
      </div>
    </section>
  `;

  bind(root);
}

/**
 * Ce qui manque à la mémoire, dit avant qu'on le cherche.
 *
 * Une proposition fusionnée qui n'a pas laissé une ligne est la signature d'un
 * défaut qu'on a corrigé — la fusion versait les lignes de l'analyse et elles
 * seules, donc rien pour une proposition venue de l'Atelier. Les propositions
 * signées avant le correctif restent muettes, et personne n'ira presser un
 * bouton dont il ignore l'existence.
 *
 * L'écran le dit donc lui-même, et propose le geste. Il ne le fait pas tout
 * seul : verser en mémoire est un acte, même quand c'en est le rattrapage.
 */
function renderRattrapage() {
  const manquantes = propositionsSansTrace(view.propositions ?? [], view.assertions ?? [], {
    porteuses: view.propositionsPorteuses ?? null
  });
  if (!manquantes.length) return "";

  const combien = manquantes.length;
  const numeros = manquantes
    .slice(0, 6)
    .map((proposition) => `#P${Number(proposition.number) || "?"}`)
    .join(", ");

  return `
    <div class="propositions-empty propositions-empty--warn memoire-rattrapage">
      <b>${combien} proposition${combien > 1 ? "s fusionnées n'ont" : " fusionnée n'a"} rien laissé en mémoire</b>
      <p>
        ${escapeHtml(numeros)}${combien > 6 ? `, et ${combien - 6} autre${combien - 6 > 1 ? "s" : ""}` : ""}.
        Leur procès-verbal est intact : le rattrapage relit ce qui a été décidé et le verse tel quel,
        avec les dates des fusions. Rien n'est recalculé, et le geste se rejoue sans dégât.
      </p>
      <button type="button" class="gh-btn gh-btn--primary" data-memory-backfill ${view.busy ? "disabled" : ""}>
        Rattraper ${combien > 1 ? "ces propositions" : "cette proposition"}
      </button>
    </div>
  `;
}

/**
 * L'écran qui correspond au chemin : la racine, un dossier, ou un fichier.
 *
 * Un chemin qui ne mène nulle part se dit plutôt que de retomber en silence sur
 * la racine — on saurait qu'on a cliqué, on ne saurait pas pourquoi il ne s'est
 * rien passé.
 */
function renderVue(memoire) {
  const contexte = { auteurs: view.auteurs ?? new Map(), propositions: propositionsParId() };

  if (view.chemin.length === 0) return renderDossiers(memoire, { assertions: view.assertions ?? [] });
  if (view.chemin.length === 1) return renderFichiers(memoire, view.chemin[0], contexte);

  const fichier = fichierDuChemin(memoire, view.chemin);
  if (!fichier) {
    return `<div class="propositions-empty"><b>Ce fichier n'existe plus</b>
      <p>Rien ne s'y range aujourd'hui. Il réapparaîtra dès qu'une proposition y versera une ligne.</p></div>`;
  }

  return renderFichier(fichier, { lecture: view.lecture, ...contexte });
}

/** Les propositions, retrouvables par leur identifiant — pour les intitulés. */
function propositionsParId() {
  return new Map((view.propositions ?? []).map((proposition) => [String(proposition.id), proposition]));
}

/**
 * Les gestes du navigateur : aller, plier, changer de lecture, copier.
 *
 * Le même vocabulaire que l'onglet Documents — un chemin, un fil d'Ariane, une
 * arborescence repliable et redimensionnable — parce que ce sont les mêmes
 * gestes, et qu'en apprendre deux pour un seul geste est un coût qu'on paie à
 * chaque écran.
 */
function bindNavigateur(root) {
  // Le rattrapage, proposé là où le manque se voit. Le bouton du menu « Verser »
  // reste : celui-ci est le raccourci de l'écran qui vient de dire ce qui
  // manque.
  root.querySelector("[data-memory-backfill]")?.addEventListener("click", () => { void backfill(root); });

  for (const bouton of root.querySelectorAll("[data-memoire-aller]")) {
    bouton.addEventListener("click", () => {
      const cible = bouton.getAttribute("data-memoire-aller") || "";
      view.chemin = cible ? cible.split("/").filter(Boolean) : [];
      // Changer de fichier ne change pas la question qu'on se pose : la lecture
      // reste celle qu'on avait choisie.
      renderContent(root);
    });
  }

  for (const bouton of root.querySelectorAll("[data-memoire-plier]")) {
    bouton.addEventListener("click", (event) => {
      event.stopPropagation();
      const nom = bouton.getAttribute("data-memoire-plier");
      if (view.replies.has(nom)) view.replies.delete(nom);
      else view.replies.add(nom);
      renderContent(root);
    });
  }

  root.querySelector("[data-memoire-replier]")?.addEventListener("click", () => {
    setNavCollapsed(!view.navCollapsed);
    renderContent(root);
  });

  for (const bouton of root.querySelectorAll("[data-memoire-lecture]")) {
    bouton.addEventListener("click", () => {
      view.lecture = bouton.getAttribute("data-memoire-lecture") === LECTURE.BLAME ? LECTURE.BLAME : LECTURE.CODE;
      renderContent(root);
    });
  }

  // Le blâme mène à la proposition qui a versé la ligne : c'est là qu'on lit la
  // discussion qui a mené là, et c'est la question à laquelle cette mémoire
  // existe pour répondre.
  for (const bouton of root.querySelectorAll("[data-memoire-proposition]")) {
    bouton.addEventListener("click", () => {
      store.pendingPropositionId = bouton.getAttribute("data-memoire-proposition");
      const projet = String(store.currentProjectId || "").trim();
      if (projet) window.location.hash = `#project/${projet}/propositions`;
    });
  }

  root.querySelector("[data-memoire-copier]")?.addEventListener("click", async () => {
    const memoire = preparerLaMemoire(view.assertions ?? []);
    const fichier = fichierDuChemin(memoire, view.chemin);
    if (!fichier) return;

    try {
      await navigator.clipboard.writeText(fichierEnClair(fichier, { enClair }));
      view.notice = "Le fichier est dans le presse-papiers.";
    } catch {
      // Un presse-papiers refusé n'est pas une raison de perdre le texte : on
      // l'affiche, il reste sélectionnable.
      window.prompt("Le presse-papiers a été refusé — copiez le texte ci-dessous.", fichierEnClair(fichier, { enClair }));
      view.notice = "";
    }
    renderContent(root);
  });

  const poignee = root.querySelector("#memoireTreeResize");
  if (poignee) {
    bindSideResizer({
      handle: poignee,
      guide: root.querySelector("#memoireTreeResizeGuide"),
      getWidth: () => Number(view.navWidth) || 280,
      onResize: (largeur) => {
        view.navWidth = largeur;
        root.querySelector(".memoire-layout")?.style.setProperty("--memoire-tree-width", `${largeur}px`);
      },
      onEnd: (largeur) => { setNavWidth(largeur); renderContent(root); }
    });
  }

  const chercher = root.querySelector("[data-memoire-query]");
  if (chercher) {
    chercher.addEventListener("input", (event) => {
      view.query = event.target.value;
      view.page = 1;
      renderContent(root);
      // Le curseur revient là où il était : redessiner l'écran à chaque touche
      // le renverrait au début du champ.
      const champ = root.querySelector("[data-memoire-query]");
      champ?.focus();
      champ?.setSelectionRange(champ.value.length, champ.value.length);
    });
  }
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
  bindNavigateur(root);

  const recherche = root.querySelector("[data-memory-search]");
  if (recherche) {
    recherche.addEventListener("scroll", () => syncMiroir(root), { passive: true });
    recherche.addEventListener("focus", () => syncSuggestions(root));
    recherche.addEventListener("click", () => syncSuggestions(root));
    // Le flou est différé : cliquer une proposition passe par un flou, et fermer
    // la liste avant le clic la rendrait inatteignable à la souris.
    recherche.addEventListener("blur", () => window.setTimeout(() => syncSuggestions(root), 120));

    recherche.addEventListener("keydown", (event) => {
      const hote = root.querySelector("[data-memory-suggestions]");
      if (!hote || hote.hidden) return;
      const combien = hote.querySelectorAll("[data-memory-suggestion]").length;
      if (combien === 0) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const pas = event.key === "ArrowDown" ? 1 : -1;
        view.suggestion = (view.suggestion + pas + combien) % combien;
        syncSuggestions(root);
        return;
      }

      // Entrée et Tabulation complètent ; Échap referme sans rien changer.
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        appliquerSuggestion(root, view.suggestion);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        view.suggestion = -1;
        hote.hidden = true;
      }
    });

    root.querySelector("[data-memory-suggestions]")?.addEventListener("mousedown", (event) => {
      const bouton = event.target.closest("[data-memory-suggestion]");
      if (!bouton) return;
      // `mousedown` plutôt que `click` : le clic arriverait après le flou du
      // champ, donc après la fermeture de la liste.
      event.preventDefault();
      appliquerSuggestion(root, Number(bouton.getAttribute("data-memory-suggestion")));
    });
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
      syncLecture(root);
      syncMiroir(root);
      syncSuggestions(root);
    });
  }





  root.querySelector("[data-memory-superseded]")?.addEventListener("change", (event) => {
    view.query = withFilter(view.query, MEMORY_FIELDS, "remplacees", event.target.checked ? "oui" : "");
    view.page = 1;
    renderContent(root);
  });

  // Le compteur des non classés mène à ce qu'il compte : un nombre qu'on ne
  // peut pas ouvrir ne fait que culpabiliser.
  root.querySelector("[data-memory-unclassified]")?.addEventListener("click", () => {
    view.query = withFilter(view.query, MEMORY_FIELDS, "domaine", "none");
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

  for (const case_ of root.querySelectorAll("[data-memory-depends-pick]")) {
    case_.addEventListener("change", () => {
      const id = case_.getAttribute("data-memory-depends-pick");
      const choisies = new Set(view.dependsDraft ?? []);
      if (case_.checked) choisies.add(id);
      else choisies.delete(id);
      view.dependsDraft = [...choisies];
      renderContent(root);
    });
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
      const lecture = bouton.getAttribute("data-memory-reader") || READER.ALL;
      view.query = onlyFilters(view.query, MEMORY_FIELDS, READER_FILTERS[lecture] ?? {});
      view.page = 1;
      // Changer de lecture ne garde pas les filtres de la précédente : on ne
      // cherche pas la même chose, et un filtre invisible ferait croire à une
      // liste vide.
      view.pending = false;
      renderContent(root);
    });
  }

  brancherRail(root);

  root.querySelector("[data-project-rail-collapse]")?.addEventListener("click", () => {
    view.navCollapsed = !view.navCollapsed;
    // Le repli est un réglage, pas un état de navigation : le perdre à chaque
    // visite obligerait à le refaire, et un réglage qu'on refait sans cesse
    // devient une gêne plutôt qu'un choix.
    try {
      window.localStorage.setItem(NAV_COLLAPSED_KEY, view.navCollapsed ? "1" : "0");
    } catch {
      // Un navigateur qui refuse le stockage garde simplement l'écran déplié.
    }
    renderContent(root);
  });

  root.querySelector("[data-memory-declare]")?.addEventListener("click", () => {
    view.declaring = !view.declaring;
    view.notice = "";
    renderContent(root);
  });

  root.querySelector("[data-memory-declare-cancel]")?.addEventListener("click", () => {
    view.declaring = false;
    view.draft = { subject: "", value: "", domain: "", zones: [] };
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

  for (const case_ of root.querySelectorAll("[data-memory-zone]")) {
    case_.addEventListener("change", (event) => {
      const cle = case_.getAttribute("data-memory-zone");
      const choisies = new Set(view.draft.zones ?? []);

      // « Ensemble » n'est pas une zone : c'est l'absence de zone. Le cocher
      // vide la sélection, et le décocher seul ne mènerait nulle part — on le
      // laisse coché plutôt que d'accepter un état sans portée.
      if (!cle) {
        view.draft = { ...view.draft, zones: [] };
      } else if (event.target.checked) {
        choisies.add(cle);
        view.draft = { ...view.draft, zones: [...choisies] };
      } else {
        choisies.delete(cle);
        view.draft = { ...view.draft, zones: [...choisies] };
      }
      renderContent(root);
    });
  }

  root.querySelector("[data-memory-declare-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    declareHypothesis(root);
  });

  bindVerserButton(root);

  // Le libellé ouvre le menu, comme le chevron : couper un filtre en deux
  // cibles demanderait de viser le chevron pour une liste qui s'ouvre de toute
  // façon. Le composant réserve le bouton principal à une action ; ici il n'y
  // en a pas d'autre que « montre-moi les choix ».
  for (const principal of root.querySelectorAll(".memory-filter .gh-action__main")) {
    principal.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      principal.closest(".gh-action")?.querySelector("[data-action-toggle]")?.click();
    });
  }

  // Les filtres passent par les menus de la maison : un seul rappel les sert
  // tous, et l'identifiant dit lequel a bougé.
  bindGhSelectMenus(root, {
    onChange: (id, value) => {
      const champ = {
        memoryKind: "provenance",
        memoryNature: "nature",
        memoryDomain: "domaine",
        memoryStatus: "etat"
      }[id];
      if (!champ) return;
      // Le menu écrit dans la barre : c'est elle qui fait foi, et le rail s'en
      // déduit — poser un filtre à la main rebascule donc sur « Tout » sans que
      // personne ait à y penser.
      view.query = withFilter(view.query, MEMORY_FIELDS, champ, value);
      // Filtrer ramène à la première page : rester en page 4 d'un résultat qui
      // en compte deux montrerait un vide qu'on prendrait pour une absence.
      view.page = 1;
      renderContent(root);
    }
  });

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

/**
 * Remet le titre et le rail d'accord avec la requête, sans redessiner la page.
 *
 * Taper dans la barre ne redessine que la liste — un rendu complet ferait
 * perdre le curseur à chaque touche. Mais la lecture se **déduit** de la
 * requête : ajouter « domaine:sol » à une lecture des contraintes n'est plus
 * une lecture des contraintes, et le rail doit le montrer sur-le-champ. On met
 * donc à jour les deux endroits qui en dépendent, en place.
 */
/**
 * Repeint le calque des jetons, et le fait défiler avec le champ.
 *
 * Le calque double le texte du champ pixel pour pixel ; s'il ne suit pas le
 * défilement horizontal, il se décale dès que la requête dépasse la largeur
 * visible — et le décalage se voit immédiatement, puisque les deux textes se
 * superposent.
 */
/**
 * La complétion : ce qu'on peut écrire, à l'endroit où l'on écrit.
 *
 * Une barre à jetons ne s'apprend pas dans une documentation — elle s'apprend en
 * tapant. Proposer les champs dès la première lettre, puis leurs valeurs une
 * fois le champ nommé, évite d'avoir à retenir un vocabulaire.
 *
 * **Elle ne s'ouvre que là où elle sert** : sur un mot de champ ou sur une
 * valeur. Ailleurs on écrit du texte libre, et une liste qui s'ouvre à chaque
 * mot gêne la frappe au lieu de l'aider.
 */
function syncSuggestions(root) {
  const champ = root.querySelector("[data-memory-search]");
  const hote = root.querySelector("[data-memory-suggestions]");
  if (!champ || !hote) return;

  const propose = document.activeElement === champ
    ? suggestAt(champ.value, MEMORY_FIELDS, champ.selectionStart ?? champ.value.length)
    : null;

  if (!propose) {
    hote.hidden = true;
    hote.innerHTML = "";
    view.suggestion = -1;
    return;
  }

  // Le premier est retenu d'office : la touche Entrée doit faire quelque chose
  // d'utile sans qu'on ait à descendre dans la liste.
  if (view.suggestion < 0 || view.suggestion >= propose.items.length) view.suggestion = 0;

  hote.innerHTML = propose.items
    .map(
      (item, rang) => `
        <button type="button" class="memory-search__suggestion${rang === view.suggestion ? " is-active" : ""}"
          role="option" aria-selected="${rang === view.suggestion ? "true" : "false"}" data-memory-suggestion="${rang}">
          <span class="memory-search__suggestion-label">${escapeHtml(item.label)}</span>
          <span class="memory-search__suggestion-hint">${escapeHtml(item.hint)}</span>
        </button>
      `
    )
    .join("");
  hote.hidden = false;
}

/**
 * Applique une proposition à la place du mot en cours.
 *
 * On remplace **le mot du curseur**, pas toute la requête : compléter au milieu
 * d'une recherche déjà écrite ne doit pas effacer le reste.
 */
function appliquerSuggestion(root, rang) {
  const champ = root.querySelector("[data-memory-search]");
  if (!champ) return;

  const propose = suggestAt(champ.value, MEMORY_FIELDS, champ.selectionStart ?? champ.value.length);
  const item = propose?.items?.[rang];
  if (!item) return;

  const avant = champ.value.slice(0, propose.start);
  const apres = champ.value.slice(propose.end);
  let curseur = avant.length + item.insert.length;
  let requete = `${avant}${item.insert}${apres}`;

  // Un champ à choix simple ne garde qu'une valeur : celle qu'on vient de
  // poser. Laisser la précédente montrerait deux natures pour une affirmation
  // qui n'en a qu'une, et la liste serait vide sans que rien ne l'explique.
  if (item.replacesField) {
    const nettoyee = dropOtherTokens(requete, MEMORY_FIELDS, item.replacesField, curseur - 1);
    curseur = Math.max(0, curseur - (requete.length - nettoyee.length));
    requete = nettoyee;
  }

  champ.value = requete;
  view.query = champ.value;
  view.page = 1;
  champ.setSelectionRange(curseur, curseur);
  view.suggestion = -1;

  const hote = root.querySelector(".memory-results, .propositions-empty:not(.propositions-empty--warn)");
  if (hote) hote.outerHTML = renderList(lignesVisibles(), view.page);
  bindPagination(root);
  syncLecture(root);
  syncMiroir(root);
  syncSuggestions(root);
}

function syncMiroir(root) {
  const champ = root.querySelector("[data-memory-search]");
  const miroir = root.querySelector(".memory-search__mirror");
  if (!champ || !miroir) return;

  miroir.innerHTML = renderQueryMirror(view.query, MEMORY_FIELDS);
  miroir.scrollLeft = champ.scrollLeft;
}

function syncLecture(root) {
  const lecture = lectureDe(view.query);

  const titre = root.querySelector(".memory-head h4");
  if (titre) titre.textContent = titreDeLaLecture();

  // La sélection vit sur le `li`, pas sur le contenu : c'est lui qui porte le
  // trait bleu. Continuer d'écrire sur le bouton laissait le rail figé sur la
  // lecture précédente — vider le champ ne ramenait donc pas sur « Tout ».
  for (const entree of root.querySelectorAll("[data-memory-reader]")) {
    const sienne = entree.getAttribute("data-memory-reader") === lecture;
    entree.setAttribute("aria-current", sienne ? "page" : "false");
    entree.closest(".nav-list__item")?.setAttribute("data-active", sienne ? "true" : "false");
  }
}

function bindTabReset() {
  if (tabResetBound) return;
  tabResetBound = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
    if (String(event?.detail?.tabId || "") !== "memoire") return;
    if (!mountedRoot?.isConnected) return;
    // La recherche en cours **survit** : revenir au tableau après avoir ouvert
    // une ligne est le geste normal, et refaire son filtrage à chaque
    // aller-retour décourage de s'en servir. Seul le détail ouvert se ferme.
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

  setProjectViewHeader({ contextLabel: "Mémoire", variant: "memory", hideBar: true });

  view.loading = true;
  view.notice = "";
  view.open = null;
  view.page = 1;
  view.navCollapsed = repliRetenu();
  view.navWidth = largeurRetenue();
  view.chemin = [];
  view.lecture = LECTURE.CODE;
  view.query = "";
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

      // Les noms des signataires, pour la marge du Blame. Un identifiant dans
      // la marge ne dit rien à personne : c'est le nom qu'on cherche quand on
      // se demande qui a décidé cela.
      // Les propositions fusionnées : c'est en les comparant à la mémoire qu'on
      // sait si l'une d'elles n'a rien laissé.
      const { listPropositions, loadAuthors, propositionsPorteuses } =
        await import("../services/propositions-supabase.js");
      view.propositions = view.projectId ? ((await listPropositions(view.projectId)) ?? []) : [];
      // Lesquelles portaient quelque chose. Une proposition vide n'a rien
      // manqué de verser, et la signaler ferait revenir la bannière pour
      // toujours.
      view.propositionsPorteuses = view.projectId ? await propositionsPorteuses(view.projectId) : null;

      const auteurs = await loadAuthors((view.assertions ?? []).map((row) => row.decided_by));
      view.auteurs = new Map(
        [...(auteurs ?? new Map()).entries()].map(([cle, valeur]) => [
          String(cle),
          typeof valeur === "string" ? valeur : String(valeur?.name || valeur?.full_name || valeur?.email || "")
        ])
      );
    } catch {
      view.assertions = null;
      view.dependencies = null;
      view.acts = null;
    }

    view.loading = false;
    if (root.isConnected) renderContent(root);
  })();
}
