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
 * Deux gestes y vivent :
 *
 *  - **lire** : parcourir les dossiers, chercher, et voir d'où vient chaque
 *    affirmation ;
 *  - **transmettre** : copier le dossier de contexte, qui est cette mémoire
 *    mise à plat, dans un ordre déterministe, avec ses dates et ses sources.
 *
 * Il n'y en a pas de troisième. Cet écran **n'écrit pas** dans la mémoire : ce
 * que le projet retient passe par une proposition, et quelqu'un la signe.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { copierDansLePressePapiers } from "./ui/bouton-copier.js";
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
  describeFilters,
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
  summarizeMemory,
  titreDeLAffirmation
} from "../services/project-memory.js";
import { paginateItems, renderPaginationControls } from "./ui/pagination.js";
import {
  READER,
  READERS,
  describeEmptyReader,
  groupByDomain,
  readerLabel,
  readerLead,
  readerRows,
  summarizeReader
} from "../services/memory-readers.js";
import {
  DOMAINS,
  ICONE_DE_LA_DECISION,
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
} from "../services/memoire-actes.js";
import { ceQuiCouvre, phraseDeLaCouvertureDe } from "../services/ce-qui-couvre.js";
import { bindGhActionButtons, bindGhSelectMenus, renderGhActionButton, renderGhSelectMenu } from "./ui/gh-split-button.js";
import { renderLightTabs, bindLightTabs } from "./ui/light-tabs.js";
import { renderSharedDetailsTitleWrap } from "./ui/detail-header.js";
import { renderOverlayChromeHead, bindOverlayChromeCompact } from "./ui/overlay-chrome.js";
import { enClair } from "../services/memoire-en-texte.js";
import { lignesDeLAssertion, ouChaqueValeurEstEcrite, ouChaqueLigneEstEcrite } from "./project-memoire-fichiers.js";
import { fichiersDeLaMemoire, zonesLisibles } from "../services/memoire-blame.js";
import { chaineDuRaisonnement, traceDesLignes, grapheDuRaisonnement } from "../services/memoire-raisonnement.js";
import { tracerLesLiens } from "./ui/graphe-liaisons.js";
import {
  renderEspaceDuRaisonnement, ancresDuCode, espaceParDefaut, BORNES, VUES
} from "./project-memoire-raisonnement.js";
import { bindSideResizer } from "./ui/side-resizer.js";
import { renderBandeauVariante, brancherLeBandeauVariante } from "./ui/bandeau-variante.js";
import { ouvrirLeCerveau } from "./ui/cerveau-du-projet.js";
import { selectionDeLaMemoire, laRequeteRestreint } from "../services/memoire-selection.js";
import { ouvrirLePlanDeRecalcul } from "./ui/fenetre-plan.js";
import { planDeRecalcul } from "../services/memoire-plan.js";
import { OU, estServi, libelleDeLUsage, usagesDe } from "../services/usages-du-rejeu.js";
import { quandLaVarianteChange, varianteEnCours } from "../services/variante-en-cours.js";
import { laMemoireABouge, memoireAvecLaVariante } from "../services/memoire-variante.js";

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
  // Les deux natures qui ne portent encore rien s'écrivent comme les autres :
  // `nature:decision` se tape dans la barre et rend zéro ligne, ce qui est la
  // vérité. Un raccourci qui n'aurait pas de requête équivalente serait le seul
  // du rail à ne pas se corriger au clavier.
  [READER.DECISIONS]: { nature: NATURE.DECISION },
  [READER.REASONINGS]: { nature: NATURE.RAISONNEMENT },
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
  /**
   * La mémoire telle qu'elle a été lue en base.
   *
   * `null` : la lecture a échoué. `[]` : le projet n'a rien versé. Une variante
   * ne la touche jamais — elle se superpose à la lecture, et disparaît sans
   * laisser de trace.
   */
  memoire: null,
  projectId: "",
  query: "",
  /** La nature et le domaine voulus. `"none"` demande ce qui n'est pas classé. */
  /** `null` : le graphe des dépendances n'a pas pu être lu. `[]` : il est vide. */
  dependencies: null,
  /**
   * Ce que chaque règle a lu — `assertion_applications`.
   *
   * `null` quand la lecture a échoué : « personne ne s'en sert » et « je ne sais
   * pas qui s'en sert » sont deux phrases différentes, et l'étude d'impact les
   * distingue.
   */
  applications: null,
  /** Les actes portés sur les hypothèses. `null` : lecture impossible. */
  acts: null,
  /** Le formulaire de contestation ouvert, s'il y en a un. */
  contesting: null,
  contestDraft: { value: "", note: "" },
  /** Vrai quand on ne montre que ce qui attend une revérification. */
  pending: false,
  /** Sous une variante : vrai quand on ne montre que ce que la variante touche. */
  varianteSeulement: false,
  /** Le formulaire d'hypothèse, quand il est ouvert. */
  declaring: false,
  navCollapsed: repliRetenu(),
  /** Les recherches épinglées de ce projet. Elles vivent dans le navigateur. */
  recherches: [],
  /** La proposition retenue dans la liste de complétion. */
  suggestion: -1,
  navWidth: largeurRetenue(),
  /** Les noms des signataires, pour la marge du Blame. */
  auteurs: new Map(),
  /** Les propositions du projet, pour repérer celles qui n'ont rien versé. */
  propositions: [],
  draft: { subject: "", value: "", domain: "", zones: [] },
  /** L'espace de raisonnement : carte désignée, zoom, plein écran, largeurs. */
  raisonnement: espaceParDefaut(),
  /** Le schéma dessiné au dernier rendu : les traits s'y reposent. */
  raisonnementGraphe: null,
  /** Où chaque carte du schéma tombe dans le code : carte → rang de ligne. */
  raisonnementAncres: new Map(),
  notice: "",
  busy: false,
  /** L'affirmation dont on lit l'histoire : `{kind, subjectKey}` ou `null`. */
  open: null,
  /** L'onglet ouvert dans son détail. */
  detailOnglet: "etablit",
  page: 1
};

/**
 * Ce que l'écran lit : la mémoire, ou la mémoire vue sous une variante.
 *
 * Tous les écrans de la mémoire — la liste, le détail, la chaîne du
 * raisonnement, le schéma des dépendances — sont des fonctions d'une liste
 * d'affirmations. Leur en donner une autre suffit : c'est ce qui rend une
 * variante gratuite, et c'est pourquoi il n'y a pas un seul écran à réécrire.
 *
 * `view.assertions` reste ce qu'il était pour tout le fichier — la liste à
 * lire —, et `view.memoire` porte ce qui vient de la base. Écrire dans l'un
 * remplit l'autre : ainsi aucune variante ne peut être prise pour la mémoire,
 * même par un chemin qu'on aurait oublié.
 */
let calqueDeLaVariante = { source: null, variante: null, rendu: null };

Object.defineProperty(view, "assertions", {
  enumerable: true,
  get() {
    const source = view.memoire;
    const variante = varianteEnCours();
    if (!variante || !Array.isArray(source)) return source;

    // Le calque se recalcule quand la mémoire ou la variante change, jamais à
    // chaque lecture : un rendu touche cette propriété une dizaine de fois.
    if (calqueDeLaVariante.source === source && calqueDeLaVariante.variante === variante) {
      return calqueDeLaVariante.rendu;
    }
    calqueDeLaVariante = { source, variante, rendu: memoireAvecLaVariante(source, variante) };
    return calqueDeLaVariante.rendu;
  },
  set(valeur) {
    view.memoire = valeur;
  }
});

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
  onglet = "",
  copilote = false,
  ouverte = null,
  reader = READER.ALL
} = {}) {
  view.assertions = assertions;
  view.dependencies = dependencies;
  view.acts = acts;
  view.declaring = declaring;
  // L'onglet ouvert du détail : sans lui, une page d'essai ne pourrait montrer
  // que la première des trois lectures.
  if (onglet) view.detailOnglet = onglet;
  // L'affirmation ouverte, quand la page d'essai en montre une : sans elle,
  // seul le tableau se dessine.
  view.open = ouverte ?? null;
  view.loading = false;
  // La colonne de discussion : une page d'essai doit pouvoir la montrer, sinon
  // seule la moitié de l'écran se vérifie.
  view.raisonnement = { ...espaceParDefaut(), copiloteOuvert: copilote === true };
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

/** L'icône de chaque lecture, dans le rail — et sur les lignes qu'elle retient. */
const READER_ICONS = {
  [READER.ALL]: "book",
  [READER.HYPOTHESES]: "issue-opened",
  [READER.CONSTRAINTS]: "shield",
  // Deux possibles mis face à face, un seul retenu : c'est le dessin même d'une
  // décision. Et pour le raisonnement, une suite d'étapes reliées.
  //
  // Le nom vient du vocabulaire : trois écrans posent cette icône, et trois
  // chaînes écrites à la main finiraient par ne plus montrer la même chose.
  [READER.DECISIONS]: ICONE_DE_LA_DECISION,
  [READER.REASONINGS]: "project-roadmap",
  [READER.FINDINGS]: "tools",
  [READER.BASE_DATA]: "north-star"
};

/**
 * La marque d'une ligne : l'icône de sa **nature**.
 *
 * C'était une pastille grise — la même pour tout ce que la table ne savait pas
 * nommer par sa provenance. Elle ne disait rien, et elle occupait la place où
 * l'œil cherche à quoi il a affaire.
 *
 * On y met l'icône que le rail emploie déjà pour cette nature : le bouclier des
 * contraintes, la question des hypothèses, la lunette des constats, l'étoile des
 * données de base. Deux dessins pour une même chose obligeraient à apprendre
 * deux vocabulaires pour un seul.
 *
 * À défaut de nature — un document, un rattachement —, la provenance reprend la
 * main : c'est elle qui dit alors quelque chose.
 */
const NATURE_ICON = {
  [NATURE.HYPOTHESE]: READER_ICONS[READER.HYPOTHESES],
  [NATURE.CONTRAINTE]: READER_ICONS[READER.CONSTRAINTS],
  [NATURE.CONSTAT]: READER_ICONS[READER.FINDINGS],
  [NATURE.DONNEE_BASE]: READER_ICONS[READER.BASE_DATA],
  [NATURE.DECISION]: READER_ICONS[READER.DECISIONS],
  [NATURE.RAISONNEMENT]: READER_ICONS[READER.REASONINGS]
};

function marqueDeLaLigne(assertion) {
  const { nature } = classifyAssertion(assertion);
  const icone = NATURE_ICON[String(nature ?? "")];
  return {
    icone: icone ?? kindIcon(assertion?.kind),
    // L'infobulle dit la nature quand on la connaît, la provenance sinon : le
    // mot doit correspondre au dessin.
    titre: icone ? natureLabel(nature) : kindLabel(assertion?.kind),
    nature: icone ? String(nature) : ""
  };
}

function renderCounts(resume, vocabulaire, enAttente = 0, plan = { derivees: 0 }) {
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
      ${
        // La forme du raisonnement, à côté de son volume. « 3 pas » dit ce
        // qu'aucun autre compteur ne dit : jusqu'où le projet enchaîne. Le
        // bouton ouvre le plan, où l'on voit aussi ce qui ne se rejoue pas —
        // et ce chiffre-là est la mesure honnête de ce qu'on promet.
        plan.derivees > 0
          ? `<button type="button" class="memory-counts__item memory-counts__item--plan" data-memory-plan>
               <b>${plan.profondeur}</b> ${plan.profondeur > 1 ? "pas" : "pas"} de raisonnement
               <span class="memory-counts__part">${plan.rejouables}/${plan.derivees} rejouables</span>
             </button>`
          : ""
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
      ${/* Dans le champ, pas après lui : la loupe est un bloc qui suit la barre,
           et poser les gestes par-dessus les aurait mis sur elle. */""}
      <div class="memory-search__gestes">
        <button type="button" class="bouton-discret memory-search__geste" data-memory-epingler
          title="Épingler cette recherche" aria-label="Épingler cette recherche"
          ${view.query.trim() ? "" : "disabled"}>
          ${svgIcon("pin", { className: "octicon" })}
        </button>
        <button type="button" class="bouton-discret memory-search__geste" data-memory-vider
          title="Effacer la recherche" aria-label="Effacer la recherche"
          ${view.query.trim() ? "" : "disabled"}>
          ${svgIcon("x", { className: "octicon" })}
        </button>
      </div>
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
/**
 * Ce qu'une variante fait à cette ligne, dit sur la ligne.
 *
 * C'était le trou du premier jet : on entrait dans une variante, la mémoire se
 * relisait avec les nouvelles valeurs — et rien, dans le tableau, ne disait
 * lesquelles avaient bougé. Une mémoire relue qu'on ne peut pas comparer à
 * celle d'avant ne sert à rien : c'est l'**écart** qu'on vient lire.
 *
 * Quatre effets, quatre phrases, et jamais un chiffre inventé :
 *
 * - **variante** — la valeur qu'on a soi-même substituée ;
 * - **recalculée** — un utilitaire rejoué a rendu autre chose ;
 * - **rejouée** — la **règle du projet** a été exécutée avec les nouvelles
 *   entrées et conclut autre chose. Ce n'est plus une propagation : c'est un
 *   raisonnement refait ;
 * - **supposée** — rejouée, mais en supposant l'altitude de départ, parce que
 *   le calcul d'origine ne la conservait pas. La condition voyage avec le
 *   chiffre : elle est écrite sur la ligne, ici comme dans la fenêtre ;
 * - **relue** — le même utilitaire a rendu la même chose : on a regardé, et
 *   c'est une information, différente de « on n'a pas regardé » ;
 * - **à revérifier** — elle est concernée, et nous ne savons pas la rejouer.
 *   Sa valeur affichée reste celle d'avant, et le mot le dit.
 */
const EFFETS_DE_VARIANTE = {
  variante: { nom: "Variante", quoi: "la valeur que vous essayez" },
  recalculee: { nom: "Recalculée", quoi: "rejouée avec la nouvelle valeur" },
  rejouee: { nom: "Rejouée", quoi: "" },
  relue: { nom: "Relue", quoi: "rejouée, et elle ne bouge pas" },
  "a-revoir": { nom: "À revérifier", quoi: "" }
};

function renderMarqueDeVariante(assertion) {
  const effet = assertion?.variante?.effet;
  const dit = EFFETS_DE_VARIANTE[effet];
  if (!dit) return "";

  const avant = String(assertion?.variante?.avant ?? "").trim();
  const apres = String(assertion?.payload?.value ?? "").trim();
  const pourquoi = String(assertion?.variante?.pourquoi ?? "").trim();

  return `
    <span class="memory-row__variante memory-row__variante--${escapeHtml(effet)}">
      <span class="memory-row__variante-nom">${svgIcon("beaker", { className: "octicon" })} ${escapeHtml(dit.nom)}</span>
      ${
        // L'écart, quand il y en a un. On ne l'écrit jamais pour « à
        // revérifier » : il n'y a pas de valeur nouvelle, et en montrer une
        // ferait passer du propagé pour du calculé.
        effet !== "a-revoir" && avant && avant !== apres
          ? `<span class="memory-row__variante-avant">${escapeHtml(avant)}</span>
             ${svgIcon("arrow-right", { className: "octicon" })}
             <span class="memory-row__variante-apres">${escapeHtml(apres)}</span>
             ${pourquoi ? `<span class="memory-row__variante-quoi">${escapeHtml(pourquoi)}</span>` : ""}`
          : `<span class="memory-row__variante-quoi">${escapeHtml(pourquoi || dit.quoi || `la valeur affichée est celle d'avant`)}</span>`
      }
    </span>
  `;
}

function renderAssertion(assertion) {
  const remplacee = Boolean(assertion.superseded_by);
  const ecartee = assertion.status === MEMORY.REJECTED;
  const effet = assertion?.variante?.effet;

  return `
    <li class="memory-row${remplacee ? " memory-row--superseded" : ""}${effet ? ` memory-row--variante memory-row--variante-${effet}` : ""}">
      ${(() => {
        const marque = marqueDeLaLigne(assertion);
        return `<span class="memory-row__mark${marque.nature ? ` memory-row__mark--${escapeHtml(marque.nature)}` : ""}"
          title="${escapeHtml(marque.titre)}">${svgIcon(marque.icone, { className: "octicon" })}</span>`;
      })()}
      <div class="memory-row__body">
        <div class="memory-row__head">
          <button
            type="button"
            class="memory-row__statement"
            data-memory-kind="${escapeHtml(assertion.kind ?? "")}"
            data-memory-open="${escapeHtml(assertion.subject_key ?? "")}"
          >${escapeHtml(titreDeLAffirmation(assertion))}</button>
          <span class="memory-pill memory-pill--${ecartee ? "rejected" : "assumed"}">
            ${svgIcon(ecartee ? "x-circle-fill" : "attestation", { className: "octicon" })}
            ${escapeHtml(ecartee ? "Écartée" : "Assumée")}
          </span>
        </div>
        ${renderMarqueDeVariante(assertion)}
        ${renderHypothesisState(assertion)}
        ${renderCeQuiCouvre(assertion)}
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
 * Ce qui couvre cette valeur, sur sa ligne.
 *
 * ## Une mention, jamais un état
 *
 * Une valeur examinée ne change pas d'état : son histoire s'allonge, c'est tout
 * (règle 12). D'où une **mention discrète** et non une pastille : une pastille
 * se lit comme un statut, et un statut appelle un circuit — exactement ce que
 * Mdall ne sera jamais.
 *
 * ## Et rien du tout quand rien ne couvre
 *
 * Pas de « non examinée » sur chaque ligne de la mémoire. L'absence de mention
 * **est** l'absence d'examen ; le répéter partout donnerait à l'écran l'air de
 * réclamer quelque chose à quelqu'un.
 *
 * ## Le rang se voit, il ne se lit pas
 *
 * Le rang — relu en interne, avis d'un bureau de contrôle — ne s'écrit nulle
 * part en toutes lettres : il donne sa nuance à la mention. Ce qui se lit est ce
 * qui a été fait, et par qui. Le survol donne la liste entière, avec ses dates.
 */
function renderCeQuiCouvre(assertion) {
  if (view.acts === null) return "";

  const couverture = ceQuiCouvre(assertion?.id, { actes: view.acts, nommer: nameOf });
  if (!couverture.couverte) return "";

  // Toute la liste au survol : la mention dit le dernier examen, et on veut
  // parfois savoir s'il y en a eu d'autres, et lesquels.
  const detail = couverture.lignes
    .map((ligne) => [formatDate(ligne.quand), ligne.organisme || ligne.qui, ligne.quoi]
      .filter(Boolean).join(" — "))
    .join("\n");

  return `
    <span class="memory-couverture memory-couverture--${escapeHtml(couverture.rang)}"
      title="${escapeHtml(detail)}">
      ${svgIcon("check-circle", { className: "octicon" })}
      ${escapeHtml(phraseDeLaCouvertureDe(couverture, { dater: formatDate }))}
    </span>
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
export function renderMemoryList(lignes, page = 1, {
  grouped = false, reader = READER.ALL, enteteHtml = ""
} = {}) {
  if (lignes.length === 0) {
    // L'en-tête reste : ses filtres sont ce par quoi on sort d'une recherche
    // vide, et les retirer là où ils servent le plus serait une farce.
    return `
      <div class="memory-table">
        ${enteteHtml}
        <div class="propositions-empty">
          <b>${escapeHtml(grouped ? readerLabel(reader) : "Rien ne correspond")}</b>
          <p>${escapeHtml(
            grouped
              ? describeEmptyReader(reader)
              : "Aucune affirmation ne répond à cette recherche. Ce qui a été remplacé est masqué par défaut."
          )}</p>
        </div>
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

  // La pagination sort du tableau : elle n'est pas une ligne de plus, c'est ce
  // qui dit où l'on en est dans la liste. Dedans, elle se lisait comme une
  // dernière ligne encadrée par la bordure du tableau.
  return `
    <div class="memory-table">
      ${enteteHtml}
      <div class="memory-results">${corps}</div>
    </div>
    ${renderPaginationControls(pagination, { entity: "memory" })}
  `;
}

/**
 * La liste telle que cet écran la veut : groupée dès qu'on lit par lecture.
 *
 * Le tableau porte sa bordure, la pagination se pose **dessous** : elle dit où
 * l'on en est dans la liste, elle n'en fait pas partie.
 */
function renderList(lignes, page = 1) {
  // **Un conteneur stable**, et c'est ce qui manquait. `renderMemoryList` rend
  // le tableau **et** sa pagination ; les redessins remplaçaient `.memory-results`,
  // c'est-à-dire l'**intérieur** du tableau. Chaque frappe imbriquait donc un
  // tableau complet — en-tête et filtres compris — dans le précédent, et l'écran
  // se remplissait de barres de filtres vides.
  //
  // Avec cette enveloppe, il y a une chose à remplacer et elle se nomme.
  return `
    <div class="memory-liste" data-memory-liste>
      ${renderMemoryList(lignes, page, {
        grouped: lectureDe(view.query) !== READER.ALL,
        reader: lectureDe(view.query),
        enteteHtml: renderTableHead()
      })}
    </div>
  `;
}

/**
 * Redessiner la liste seule, sans redessiner la page.
 *
 * Redessiner la page ferait perdre le curseur à chaque touche. Un seul endroit
 * sait comment s'y prendre : deux écritures de ce geste finiraient par ne plus
 * remplacer la même chose (règle 4).
 */
function redessinerLaListe(root) {
  const hote = root.querySelector("[data-memory-liste]");
  if (hote) hote.outerHTML = renderList(lignesVisibles(), view.page);
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
function pastillesDuDetail(assertion) {
  const { nature, domain } = classifyAssertion(assertion);
  const portees = zonesOf(assertion);

  // La valeur en bleu, sans bordure, dans la fonte à chasse fixe : elle se
  // détache de la phrase grise sans se donner l'air d'un bouton. Ce qui manque
  // garde le trait discontinu — « cette case est vide » est une information.
  const pastille = (valeur, vide) =>
    `<span class="memory-tag memory-tag--valeur mono${vide ? " memory-tag--unknown" : ""}">${escapeHtml(valeur)}</span>`;

  return [
    { label: "Provenance", html: pastille(kindLabel(assertion.kind) || "Inconnue", !assertion.kind) },
    { label: "Nature", html: pastille(nature ? natureLabel(nature) : UNCLASSIFIED_LABEL, !nature) },
    { label: "Domaine", html: pastille(domain ? domainLabel(domain) : "Sans domaine", !domain) },
    // Pas d'« État » : la pastille qui ouvre la ligne dit déjà « Assumé », et le
    // répéter deux centimètres plus loin fait relire pour rien.
    {
      label: "Zones",
      html: portees.length === 0
        // Discontinu comme dans le tableau : « Ensemble — toutes zones » est la
        // valeur par défaut, et une valeur par défaut se signale partout de la
        // même façon — sinon on croit que l'un des deux écrans en sait plus.
        ? pastille(ZONE_TOUT_LOUVRAGE_LABEL, true)
        // Le libellé écrit, pas la clé : « batiment-a » se lit moins bien que
        // « Bâtiment A », et c'est le même endroit de l'ouvrage.
        : zonesDuDetail(assertion).map((zone) => pastille(zone, false)).join("")
    }
  ];
}

/** Les zones d'une affirmation, en clair. Le libellé écrit d'abord, la clé sinon. */
function zonesDuDetail(assertion) {
  const dits = zonesLisibles(assertion);
  if (dits.length) return dits;
  return zonesOf(assertion).map((cle) => zoneLabel(cle, view.assertions ?? []));
}

/** La pastille d'état : haute, ronde, la même que « Fusionnée » sur une proposition. */
function renderPastilleDEtat(ecartee) {
  return `<span class="gh-state ${ecartee ? "gh-state--rejected" : "gh-state--closed"}">
    <span class="gh-state-dot" aria-hidden="true">${svgIcon(ecartee ? "x-circle-fill" : "attestation", { style: "color: #fff" })}</span>
    ${ecartee ? "Écarté" : "Assumé"}</span>`;
}

/**
 * Qui assume, quand, et pour quelle partie de l'ouvrage.
 *
 * ## Pourquoi une phrase, et non un tableau
 *
 * « Provenance · Nature · Domaine · État · Zones » alignés en colonnes se lisent
 * comme un formulaire : on les parcourt sans les lire. Une affirmation de projet
 * est un **engagement de quelqu'un**, et une phrase le dit — « Nicolas a assumé
 * ce constat le 12 mars pour le bâtiment A ».
 *
 * Les caractéristiques suivent, en pastilles, une fois la phrase lue. Elles
 * répondent à une autre question — « de quel genre est-ce ? » — et ne sont pas
 * ce qu'on cherche en ouvrant l'écran.
 *
 * ## Le singulier et le pluriel s'écrivent
 *
 * « pour la (les) zone(s) » fait lire deux mots pour n'en retenir aucun. On
 * accorde : une zone, ou plusieurs.
 */
function renderProvenanceDuDetail(assertion, suite = [], ecartee = false) {
  const portees = zonesDuDetail(assertion);
  const qui = nameOf(assertion.decided_by);
  const quand = formatDate(assertion.decided_at);
  const verbe = ecartee ? "écarté" : "assumé";

  const ou = portees.length === 0
    ? "pour l'ouvrage entier"
    : portees.length === 1
      ? `pour la zone ${portees[0]}`
      : `pour les zones ${portees.join(", ")}`;

  const histoire = suite.length > 1 ? ` · ${suite.length} états successifs` : "";

  return `
    <span class="memory-detail__provenance">
      ${renderPastilleDEtat(ecartee)}
      <span class="memory-detail__qui"><b>${escapeHtml(qui)}</b> a ${escapeHtml(verbe)} ce constat
        le ${escapeHtml(quand)} ${escapeHtml(ou)}${escapeHtml(histoire)}</span>
      ${pastillesDuDetail(assertion)
        .map(({ label, html }) => `<span class="memory-detail__trait">${escapeHtml(label)}</span>${html}`)
        .join("")}
    </span>
  `;
}

/**
 * Les mêmes caractéristiques, **sans leurs intitulés**.
 *
 * Dans la barre compactée il n'y a de la place que pour une ligne, et les
 * intitulés y prennent la moitié pour ne rien apprendre : « Contrainte » se lit
 * comme une nature sans qu'on écrive « Nature » devant. Ce sont les valeurs
 * qu'on cherche du regard en faisant défiler.
 */
function renderDetailTagsCompacts(assertion) {
  return `<span class="memory-detail__tags memory-detail__tags--compacts">${
    pastillesDuDetail(assertion).map(({ html }) => html).join("")}</span>`;
}

/**
 * Les trois lectures d'une affirmation.
 *
 * Dans cet ordre, et il n'est pas indifférent : **ce qui l'établit** est ce
 * qu'on vient chercher — la source, l'article, la citation ; **son histoire**
 * dit ce qu'elle a été ; **comment on en est arrivé là** est le poste de
 * travail, celui qu'on ouvre quand la valeur surprend.
 *
 * Elles étaient empilées sur une seule page. À cinq panneaux, on faisait
 * défiler pour retrouver une citation, et le raisonnement — qui prend l'écran —
 * poussait l'histoire hors de vue.
 */
const DETAIL = { ETABLIT: "etablit", HISTOIRE: "histoire", RAISONNEMENT: "raisonnement" };

const ONGLETS_DU_DETAIL = [
  { id: DETAIL.ETABLIT, label: "Ce qui l'établit", iconName: "book" },
  { id: DETAIL.HISTOIRE, label: "Son histoire", iconName: "history" },
  { id: DETAIL.RAISONNEMENT, label: "Comment on en est arrivé là", iconName: "graph" }
];

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
  const titre = titreDeLAffirmation(courante);

  // Trois lectures d'une même affirmation, et elles n'ont pas la même largeur.
  // Ce qui l'établit et son histoire se lisent comme un texte — une colonne
  // étroite, comme le détail d'une proposition. Le raisonnement est un poste de
  // travail : il prend l'écran, comme les Changements.
  const onglet = ONGLETS_DU_DETAIL.some((tab) => tab.id === view.detailOnglet)
    ? view.detailOnglet
    : DETAIL.ETABLIT;
  const pleine = onglet === DETAIL.RAISONNEMENT;

  const etape = (assertion, rang) => {
    const propres = describeAssertionFacts(assertion);
    const perimee = Boolean(assertion.superseded_by);

    return `
      <li class="memory-step${perimee ? " memory-step--past" : ""}">
        <span class="memory-step__mark">${svgIcon(
          assertion.status === MEMORY.REJECTED ? "x-circle-fill" : "attestation",
          { className: "octicon" }
        )}</span>
        <div class="memory-step__body">
          <b>${escapeHtml(titreDeLAffirmation(assertion))}</b>
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

  // L'en-tête est celui d'un sujet et d'une proposition, du DOM aux bascules :
  // `renderSharedDetailsTitleWrap` rend les deux titres — l'étendu et le
  // compact —, et le CSS partagé échange l'un pour l'autre au défilement. Une
  // troisième barre de titre écrite ici aurait fini par ne plus leur ressembler.
  const titreEtendu = renderSharedDetailsTitleWrap(courante, {
    emptyText: "Aucune affirmation",
    buildTitleTextHtml: () => `<span class="details-title-text">${escapeHtml(titre)}</span>`,
    // Rien à droite du titre. La clé métier en était la translittération —
    // « degre-coupe-feu-des-planchers@batiment-a » redit mot pour mot ce qui est
    // lu au-dessus, en moins lisible. La zone l'avait remplacée, mais la ligne
    // du dessous la dit déjà, en toutes lettres et dans une phrase : l'écrire
    // deux fois à dix pixels d'intervalle ne la met pas en valeur, cela fait
    // douter qu'il s'agisse de la même.
    buildIdHtml: () => "",
    buildExpandedBottomHtml: () => renderProvenanceDuDetail(courante, suite, ecartee),
    buildCompactConfig: (_, { titleTextHtml }) => ({
      variant: "grid",
      wrapClass: "details-title--compact-grid",
      leftHtml: renderPastilleDEtat(ecartee),
      topHtml: titleTextHtml,
      // Les valeurs seules : dans une ligne, les intitulés prennent la moitié
      // de la place pour ne rien apprendre.
      bottomHtml: renderDetailTagsCompacts(courante)
    })
  });

  return `
    <section class="memory-detail">
      ${renderOverlayChromeHead({
        headId: "memoryDetailsTitle",
        titleHtml: titreEtendu,
        // Comme les Changements d'une proposition : sur l'onglet du
        // raisonnement, la barre prend l'écran. Un titre resté dans une colonne
        // de lecture au-dessus d'un poste de travail pleine largeur se lit
        // comme le titre d'autre chose.
        headClassName: `memory-detail__head${pleine ? " memory-detail__head--pleine" : ""}`
      })}

      <div class="memory-detail__tagsrow${pleine ? " memory-detail__tagsrow--pleine" : ""}">
        ${renderLightTabs({
          tabs: ONGLETS_DU_DETAIL,
          activeTabId: onglet,
          className: "memory-detail__tabs",
          ariaLabel: "Sections de cette affirmation"
        })}
      </div>

      <div class="memory-detail__panneau${pleine ? " memory-detail__panneau--pleine" : ""}">
        ${
          onglet === DETAIL.HISTOIRE
            ? `<ol class="memory-steps">${suite.map(etape).join("")}</ol>`
            : onglet === DETAIL.RAISONNEMENT
              ? renderRaisonnement(courante)
              : `${
                  faits.length > 0
                    ? `<dl class="memory-facts">${faits
                        .map(([label, valeur]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(valeur)}</dd>`)
                        .join("")}</dl>`
                    : `<p class="memory-detail__vide">Cette affirmation ne porte ni source, ni article, ni
                       citation. Ce n'est pas qu'elle n'en a pas : personne ne les a écrits.</p>`
                }${renderActsPanel(courante)}${renderCouverturePanel(courante)}`
        }
      </div>

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

  // Les lectures ensemble : ce sont des filtres sur la même table, et isoler
  // l'une d'elles sous un trait laissait croire qu'elle était d'une autre
  // nature. Sous le trait vient ce qui **appartient à qui lit** : ses recherches.
  //
  // L'ordre vient de `READERS`, dans le service : le rail ne tient pas sa propre
  // liste, sans quoi une lecture ajoutée là-bas manquerait ici.
  const lectures = READERS;

  return renderProjectRail({
    id: "memoryRail",
    label: "Lectures de la mémoire",
    collapsed: replie,
    navHtml: renderNavList({
      label: "Lectures de la mémoire",
      html: `
        ${renderNavListGroup({ items: lectures.map(entree) })}
        ${renderNavListDivider()}
        ${renderRecherchesEpinglees(replie)}
      `
    })
  });
}

/**
 * Les recherches épinglées, sous le trait.
 *
 * On revient toujours aux mêmes questions — « les hypothèses du bâtiment A »,
 * « ce qui reste sans domaine ». Les retaper à chaque fois use, et l'on finit
 * par ne plus filtrer du tout, c'est-à-dire par lire trois cents lignes à l'œil.
 *
 * Le menu est celui des discussions du copilote : renommer, effacer. Deux
 * dessins pour deux listes qu'on entretient de la même façon finiraient par ne
 * plus se ressembler.
 */
function renderRecherchesEpinglees(replie) {
  const liste = view.recherches ?? [];

  if (liste.length === 0) {
    return replie ? "" : `<p class="memory-rail__vide">Épinglez une recherche depuis la barre de recherche : elle se
      rangera ici, prête à rejouer.</p>`;
  }

  return renderNavListGroup({
    label: "Recherches",
    items: liste.map((recherche) => renderNavListItem({
      label: recherche.titre,
      title: recherche.requete,
      iconHtml: svgIcon("pin", { className: "octicon" }),
      isActive: view.query.trim() === recherche.requete,
      dataAttributes: {
        "data-memory-recherche": recherche.id,
        "data-tooltip": replie ? recherche.titre : ""
      },
      actionHtml: `
        <button type="button" class="nav-list__action-btn" data-recherche-menu="${escapeHtml(recherche.id)}"
          aria-haspopup="menu" aria-expanded="false"
          aria-label="Actions sur cette recherche" title="Actions">
          ${svgIcon("kebab-horizontal")}
        </button>
        <div class="copilote-fil-menu" role="menu" data-recherche-menu-for="${escapeHtml(recherche.id)}" hidden>
          <button type="button" class="copilote-fil-menu__item" role="menuitem"
            data-recherche-renommer="${escapeHtml(recherche.id)}">
            ${svgIcon("pencil")}<span>Renommer</span>
          </button>
          <button type="button" class="copilote-fil-menu__item is-danger" role="menuitem"
            data-recherche-oublier="${escapeHtml(recherche.id)}">
            ${svgIcon("trash")}<span>Désépingler</span>
          </button>
        </div>
      `
    }))
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
export function renderMemoryForPreview(assertions = [], {
  reader = READER.ALL, collapsed = false, projet = "", recherches = null
} = {}) {
  view.assertions = assertions;
  view.query = onlyFilters(view.query, MEMORY_FIELDS, READER_FILTERS[reader] ?? {});
  view.navCollapsed = collapsed;
  // Les recherches épinglées font partie du rail : une page d'essai qui les
  // ignorerait ne montrerait que la moitié de ce qu'on regarde. Elle les donne,
  // plutôt que d'aller les lire — une page d'essai ne parle pas à la base.
  if (projet) view.projectId = projet;
  if (Array.isArray(recherches)) view.recherches = recherches;
  return `<div class="project-rail-layout${collapsed ? " project-rail-layout--collapsed" : ""}">${
    renderMemoryNav()}<div class="project-rail-layout__content">${renderSearch()}${renderReaderLead()}</div></div>`;
}

/**
 * Monter l'écran **entier** dans une page d'essai, branchements compris.
 *
 * `renderMemoryForPreview` rend du HTML ; il ne branche rien, donc rien ne se
 * clique. Ce qui se vérifie mal — le clic d'une carte qui doit amener sa
 * fonction sous les yeux, la bascule d'une vue — passe par les branchements,
 * et une sonde qui les recopierait vérifierait sa propre copie.
 *
 * L'état se pose avec `__setMemoryStateForPreview` avant l'appel.
 */
export function __mountMemoryForPreview(root) {
  if (!root) return;
  mountedRoot = root;
  // Le vrai écran s'abonne aux variantes en se montant : une page d'essai qui
  // ne le ferait pas laisserait croire que sortir d'une variante ne redessine
  // rien — et c'est précisément ce qu'il faut pouvoir vérifier.
  brancherLaVariante();
  renderContent(root);
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
  // Une hypothèse déclarée depuis une variante serait décidée d'après une
  // lecture fausse. Le bouton a disparu de la tête ; le formulaire aussi.
  if (varianteEnCours()) return "";

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
    [READER.DECISIONS]: "Décisions du projet",
    [READER.REASONINGS]: "Raisonnements du projet",
    [READER.FINDINGS]: "Constats du projet",
    [READER.BASE_DATA]: "Données de base du projet"
  };
  return titres[lectureDe(view.query)] ?? titres[READER.ALL];
}

export function renderMemoryHead(resume, { busy = false } = {}) {
  // Sous une variante, on lit une mémoire qui n'existe pas. Y écrire — verser,
  // déclarer — ferait entrer en base une valeur décidée d'après une lecture
  // fausse ; l'exporter la ferait circuler comme si elle était vraie. C'est le
  // seul moyen qu'une variante avait de salir le projet, et on le ferme.
  const enVariante = Boolean(varianteEnCours());

  return `
    <header class="memory-head settings-card__head">
      <span class="settings-card__head-title">
        <h4>${escapeHtml(titreDeLaLecture())}</h4>
        <div class="memory-head__actions">
          ${
            enVariante
              ? `<span class="memory-head__variante">Lecture seule : on regarde une variante.</span>`
              : `${renderExportButton(resume, busy)}
                 ${renderVerserButton(busy)}
                 ${renderBoutonCerveau(busy)}
                 <button type="button" class="gh-btn gh-btn--primary" data-memory-declare ${busy ? "disabled" : ""}>
                   ${svgIcon("plus", { className: "octicon" })} Déclarer une hypothèse
                 </button>`
          }
        </div>
      </span>
    </header>
  `;
}

/**
 * Deux rendus de la même sélection : la liste, et le cerveau.
 *
 * ## Pourquoi une bascule, et non un bouton de plus
 *
 * C'était un bouton isolé, à côté d'Exporter et de Verser — c'est-à-dire au
 * milieu des **outils**. Or le cerveau n'est pas un outil : c'est l'autre façon
 * de regarder ce que la liste montre déjà. La liste pour lire, le cerveau pour
 * voir.
 *
 * Le dire par la forme du contrôle plutôt que par une phrase : deux moitiés
 * accolées, celle qu'on regarde marquée. Un bouton l'aurait fait lire comme une
 * action de plus, et l'on n'aurait pas su que le dessin obéit au même filtre.
 *
 * **La liste est toujours celle qu'on regarde** : le cerveau s'ouvre par-dessus
 * et se referme sur elle. La marque le dit, plutôt que de prétendre à un
 * troisième écran qui n'existe pas.
 *
 * L'usage se lit dans `services/usages-du-rejeu.js` plutôt que d'être écrit
 * ici : la liste des usages dit déjà lequel vit dans la Mémoire, et le récrire
 * ferait deux vérités à tenir (règle 4). Un usage que le moteur ne sert pas
 * encore s'éteint et dit son étape, plutôt que de promettre ce qu'il ne fait pas.
 */
function renderBoutonCerveau(busy = false) {
  const usage = usagesDe(OU.MEMOIRE)[0];
  if (!usage) return "";

  const servi = estServi(usage);
  return `
    <span class="memory-bascule" role="group" aria-label="Comment regarder cette sélection">
      <button type="button" class="memory-bascule__part is-active" aria-pressed="true"
        title="Ce que vous regardez : la sélection, ligne par ligne." disabled>
        ${svgIcon("table", { className: "octicon" })} Liste
      </button>
      <button type="button" class="memory-bascule__part" data-memoire-cerveau aria-pressed="false"
        title="${escapeHtml(usage.quoi)}" ${busy || !servi ? "disabled" : ""}>
        ${svgIcon("memoire-vive", { className: "octicon" })} ${escapeHtml(libelleDeLUsage(usage))}
      </button>
    </span>
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
      { separator: true },
      {
        action: "verser:lectures",
        label: "Reconstruire les liens du raisonnement",
        // Ce n'est pas un versement : rien n'entre en mémoire. C'est une
        // relecture de ce que les règles disent déjà, écrite là où elle se
        // compte. Elle est ici parce que c'est le même geste — rendre explicite
        // ce qui était implicite — et parce qu'elle écrit, donc elle se demande.
        title: "Relit ce que chaque règle a lu, et l'enregistre avec son rang et sa zone. "
          + "Les liens résolus après coup sont marqués comme tels."
      }
    ]
  });
}

/**
 * Le versement, derrière son bouton.
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
    if (quoi === "verser:lectures") void reconstruireLesLectures(root);
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

    const [
      { buildMemoryExport, memoryExportCsv, memoryExportFilename },
      { listerLesApplications },
      telechargement
    ] = await Promise.all([
      import("../services/project-memory-export.js"),
      import("../services/memoire-applications-supabase.js"),
      import("../utils/download-file.js")
    ]);

    // Tout est exporté, pas seulement la page affichée ni le filtre en cours :
    // un export partiel se comparerait mal, et rien à l'écran ne dirait qu'il
    // l'était.
    //
    // Les lectures avec : sans elles, le fichier dit ce que le projet affirme et
    // jamais comment il y est arrivé — et c'est précisément là que vivent les
    // défauts qu'on cherche quand on exporte pour comprendre. `null` si l'index
    // n'a pas pu être lu, ce qui n'est pas la même chose qu'un index vide.
    const exporte = buildMemoryExport({
      project: { id: view.projectId, ...(store.projectForm ?? {}) },
      assertions: view.assertions,
      applications: await listerLesApplications(view.projectId),
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
    import("../services/memoire-actes.js"),
    import("../services/memoire-actes-supabase.js")
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
 * Ce qui couvre cette valeur, et le seul geste qu'on pose dessus.
 *
 * ## Le geste le plus léger possible
 *
 * **« J'ai vérifié »**, et rien d'autre. Il écrit une ligne et ne demande rien à
 * personne : aucune notification ne part, personne n'est bloqué, aucune file ne
 * se remplit. C'est la ligne que Mdall ne franchira pas (règle 12) — il existe
 * d'excellents outils de gestion de visas, et Mdall n'en sera jamais un.
 *
 * On peut ne jamais s'en servir : la valeur ne change pas d'état, seule son
 * histoire s'allonge.
 *
 * ## Sur tout, et pas seulement sur les hypothèses
 *
 * Examiner vaut partout — une zone de neige n'est pas une hypothèse, et un
 * bureau de contrôle porte pourtant bien un avis sur elle. Se **prononcer**,
 * en revanche, n'a de sens que sur une hypothèse : c'est l'autre panneau.
 *
 * ## Ce que la liste montre
 *
 * Qui s'est engagé, quand, et ce qui a été dit. Le rang ne s'écrit nulle part :
 * il donne sa nuance à la ligne. Un nombre appellerait une arithmétique qui n'a
 * aucun sens — « poids 5 > poids 3, donc on garde ».
 */
function renderCouverturePanel(courante) {
  if (view.acts === null) {
    return `
      <div class="memory-acts memory-acts--unknown">
        <h3 class="memory-detail__section">Ce qui la couvre</h3>
        <p>Les actes n'ont pas pu être lus. Ce n'est pas qu'il n'y en a aucun.</p>
      </div>
    `;
  }

  const couverture = ceQuiCouvre(courante?.id, { actes: view.acts, nommer: nameOf });

  const ligne = (entree) => `
    <li class="memory-acts__item memory-acts__item--${escapeHtml(entree.rang)}">
      <b>${escapeHtml(entree.organisme || entree.qui || "quelqu'un")}</b>
      le ${escapeHtml(formatDate(entree.quand))}
      ${entree.quoi ? `<span class="memory-acts__note">${escapeHtml(entree.quoi)}</span>` : ""}
    </li>
  `;

  return `
    <div class="memory-acts">
      <h3 class="memory-detail__section">Ce qui la couvre</h3>
      ${
        couverture.couverte
          ? `<ol class="memory-acts__list">${couverture.lignes.map(ligne).join("")}</ol>`
          : `<p class="memory-acts__empty">Personne ne l'a examinée. Ce n'est pas un manque :
               une valeur se tient toute seule, et Mdall ne réclame rien à personne.</p>`
      }
      <div class="memory-acts__actions">
        <button type="button" class="gh-btn" data-memory-couvre="${escapeHtml(courante?.id ?? "")}" ${
          view.busy ? "disabled" : ""
        }>J'ai vérifié</button>
      </div>
    </div>
  `;
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
/**
 * Comment on en est arrivé là — le code, et ce qu'il vaut.
 *
 * ## Pourquoi deux fenêtres
 *
 * Une seule ne peut pas répondre aux deux questions qu'on se pose devant une
 * valeur qu'on ne s'explique pas. À gauche, **le raisonnement** : les fonctions
 * qui ont mené là, dans l'ordre où on les lit, avec leurs conditions et leurs
 * textes. À droite, **l'état du projet** : ce que chaque nom cité vaut
 * aujourd'hui, dans la zone de la contrainte qu'on regarde.
 *
 * Mélangées, elles donneraient un code truffé de valeurs — c'est-à-dire un
 * raisonnement vrai d'un seul bâtiment, exactement ce que le langage refuse
 * d'écrire. Côte à côte, la comparaison se fait de l'œil, ligne à ligne.
 *
 * ## Ce qu'on ne fait pas
 *
 * Pas de verdict « vrai / faux » en face des conditions : ce serait rejouer le
 * référentiel dans le navigateur, et un verdict faux affiché avec aplomb est
 * pire que pas de verdict. On montre ce que le projet dit, et le lecteur
 * conclut — il a la ligne sous les yeux.
 */
function renderRaisonnement(courante) {
  // Le schéma du rendu précédent ne vaut plus : le garder ferait reposer des
  // traits entre des cartes qui ne sont plus à l'écran.
  view.raisonnementGraphe = null;
  view.raisonnementAncres = new Map();

  const assertions = view.assertions ?? [];
  // La **clé** pour comparer et filtrer, le **libellé** pour l'écrire : « lu
  // pour batiment-a » se lit moins bien que « lu pour Bâtiment A », et les deux
  // désignent la même partie de l'ouvrage.
  const zone = (zonesOf(courante) ?? [])[0] ?? "";
  // Le libellé que la ligne porte d'abord : c'est celui que son auteur a écrit.
  // La définition de zone ensuite, quand le projet en a une. La clé en dernier
  // recours — mieux vaut une clé qu'un vide.
  const zoneEnClair = zone ? (zonesLisibles(courante)[0] || zoneLabel(zone, assertions)) : "";
  const sujet = String(courante?.payload?.subject ?? courante?.subject_key ?? "").trim();
  const { fonctions, entrees, manquants } = chaineDuRaisonnement(sujet, assertions, { zone });

  if (!fonctions.length) {
    return `
      <div class="memory-raisonnement memory-raisonnement--vide">
        <p>Aucune règle du projet ne produit cette valeur : elle a été relevée ou décidée,
        pas déduite. Sa provenance, sous « Ce qui l'établit », dit d'où elle vient.</p>
      </div>
    `;
  }

  // Le code, dans l'ordre de lecture : ce dont une règle a besoin avant elle.
  // Avec le même contexte que les fichiers — d'où viennent les entrées, où va
  // le résultat —, sinon on lirait ici un code qui n'est pas celui du dépôt.
  const fichiers = fichiersDeLaMemoire(assertions);
  const ouEcrit = ouChaqueValeurEstEcrite(fichiers);
  const ouVivent = ouChaqueLigneEstEcrite(fichiers);
  const lignes = fonctions.flatMap((regle, rang) => [
    ...(rang > 0 ? [{ jetons: [], nature: "vide" }] : []),
    ...lignesDeLAssertion(regle, 0, { ouEcrit })
  ]);
  const trace = traceDesLignes(lignes, { assertions, zone });

  // Le schéma se garde : les traits se posent après la mise en page, et les
  // reposer demande de savoir quels nœuds relier. Le recalculer à chaque trait
  // parcourrait la mémoire entière pour un dessin qui n'a pas bougé.
  const graphe = grapheDuRaisonnement(sujet, assertions, { zone, ouEcrit, ouVivent });
  const ancres = ancresDuCode(lignes, trace, graphe);
  view.raisonnementGraphe = graphe;
  view.raisonnementAncres = ancres.parCarte;

  const resume = `${escapeHtml(`${fonctions.length} fonction${fonctions.length > 1 ? "s" : ""}`)},
    ${escapeHtml(`${entrees.length} donnée${entrees.length > 1 ? "s" : ""} d'entrée`)}${
      manquants.length
        ? ` — <b class="raison-grille__trou">${escapeHtml(`${manquants.length} que personne n'a versée${manquants.length > 1 ? "s" : ""}`)}</b>`
        : ""}${zoneEnClair ? ` · lu pour ${escapeHtml(zoneEnClair)}` : ""}`;

  return renderEspaceDuRaisonnement({
    graphe, lignes, trace, ancres: ancres.parRang, resume,
    titre: titreDeLAffirmation(courante),
    pastilles: renderDetailTagsCompacts(courante),
    etat: view.raisonnement
  });
}

/** Les jetons d'une ligne, colorés comme dans un fichier. */
function renderJetonsDuRaisonnement(jetons = []) {
  return (jetons ?? [])
    .map((jeton) => `<span class="mdall-${escapeHtml(jeton.type)}">${escapeHtml(jeton.texte)}</span>`)
    .join("");
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
  // La source, pas la lecture : sous une variante, réécrire `view.assertions`
  // ferait entrer le calque dans ce qu'on croit avoir lu en base.
  view.memoire = (view.memoire ?? []).map((entry) =>
    entry.id === assertionId ? { ...entry, reviewed_at: quand, reviewed_by: store.user?.id ?? null } : entry
  );
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
  const retenues = selectionMemoire(view.assertions ?? []);

  // Sous une variante, ne garder que ce qu'elle touche. « Relue » en fait
  // partie : savoir qu'une valeur a été rejouée sans bouger est le contraire de
  // ne rien savoir d'elle.
  if (!varianteEnCours() || !view.varianteSeulement) return retenues;
  return retenues.filter((assertion) => Boolean(assertion?.variante?.effet));
}

/**
 * La sélection, telle que la requête la définit — sans le calque d'une variante.
 *
 * Deux appelants, et c'est tout l'objet de `memoire-selection.js` : le tableau,
 * qui lit une mémoire avec calque, et le cerveau, qui lit la mémoire réelle.
 * Chacun passe la sienne ; le filtrage, lui, est le même.
 */
function selectionMemoire(assertions) {
  return selectionDeLaMemoire(assertions, {
    query: view.query,
    champs: MEMORY_FIELDS,
    etats: ETAT_VERS_STATUT,
    chercher: searchAssertions,
    aRevoir: pendingReviews,
    pending: view.pending
  });
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
    // La coque d'un détail, celle des sujets et des propositions : c'est elle
    // que `bindOverlayChromeCompact` marque au défilement, et c'est sa classe
    // qui fait basculer le titre étendu vers le titre compact, en CSS.
    root.innerHTML = `
      <section class="project-simple-page project-simple-page--memory"
      style="--project-rail-width:${railWidth(view.navWidth, view.navCollapsed)}px">
        <div class="propositions-shell overlay-chrome overlay-chrome--proposition" data-memory-chrome>
          ${renderBandeauVariante(varianteEnCours(), { aBouge: laMemoireABouge(varianteEnCours(), view.memoire ?? []), seulement: view.varianteSeulement })}
          ${renderMemoryDetail(view.assertions, view.open)}
        </div>
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
  // La forme du raisonnement se dérive avec le reste : rien n'est stocké, et un
  // plan gardé de côté divergerait dès la règle suivante.
  const plan = planDeRecalcul(view.assertions ?? []);

  // Le navigateur de fichiers a déménagé dans l'onglet Fichiers : les PDF et
  // les fichiers de mémoire sont la même matière — les **sources** du projet.
  //
  // Ce qui reste ici **exécute** la mémoire plutôt que de la ranger : les
  // lectures du rail sont des filtres pré-sélectionnés — « les hypothèses »,
  // « ce qui s'impose », « ce qui a été constaté » —, et le tableau montre ce
  // qu'elles retiennent. Rien ne s'y stocke : tout se recalcule depuis les
  // fichiers.
  root.innerHTML = `
    <section class="project-simple-page project-simple-page--memory"
      style="--project-rail-width:${railWidth(view.navWidth, view.navCollapsed)}px">
      <div class="propositions-shell">
        ${renderBandeauVariante(varianteEnCours(), { aBouge: laMemoireABouge(varianteEnCours(), view.memoire ?? []), seulement: view.varianteSeulement })}
        ${renderMemoryHead(resume, { busy: view.busy })}

        <div class="project-rail-layout${view.navCollapsed ? " project-rail-layout--collapsed" : ""}">
          ${renderMemoryNav()}

          <div class="project-rail-layout__content">
            ${renderHypothesisForm()}

            ${view.notice ? `<div class="propositions-empty propositions-empty--warn"><p>${escapeHtml(view.notice)}</p></div>` : ""}

            ${renderCounts(resume, vocabulaire, enAttente, plan)}
            ${renderSearch()}
            ${renderList(lignes, view.page)}
          </div>
        </div>
      </div>
    </section>
  `;

  bind(root);
}

/**
 * Les gestes du schéma des dépendances.
 *
 * ## Les traits se posent après coup
 *
 * Leur départ et leur arrivée dépendent de la hauteur réelle de chaque carte,
 * donc du texte qu'elle porte, donc du navigateur. On ne peut pas les écrire
 * dans le HTML ; on les pose une fois la mise en page connue, et on les repose
 * à chaque grossissement et à chaque redimensionnement.
 *
 * ## Désigner une carte resserre la chaîne
 *
 * Sur douze étapes, l'intérêt n'est pas de tout voir : c'est de suivre **une**
 * valeur. Cliquer une carte ne montre plus que son chemin — ce qui la décide et
 * ce qu'elle entraîne —, et recliquer la même le rouvre en entier.
 */
function brancherLEspace(root) {
  const espace = root?.querySelector("[data-raison-espace]");
  if (!espace) return;

  const etat = view.raisonnement;
  const graphe = view.raisonnementGraphe;
  const bloc = espace.querySelector("[data-graphe-bloc]");

  // Les traits se posent après la mise en page : leur départ et leur arrivée
  // dépendent de la hauteur réelle de chaque carte, donc du texte qu'elle
  // porte, donc du navigateur.
  const reposer = () => {
    if (!bloc || !graphe) return;
    tracerLesLiens(bloc, { graphe, selection: etat.carte, survol: etat.survol, zoom: etat.zoom });
  };
  reposer();

  // Redimensionner change la largeur des colonnes : des traits laissés en place
  // partiraient à côté des cartes, ce qui se lit comme un dessin faux.
  if (bloc && typeof ResizeObserver === "function") {
    const oeil = new ResizeObserver(() => reposer());
    oeil.observe(bloc);
  }

  brancherLeSurvolDesCartes(espace, reposer);
  brancherLesGestesDeLEspace(root, espace);
  brancherLesPoignees(root, espace);
  monterLeCopilote(espace);

  // La carte demandée au rendu précédent : on l'honore maintenant, sur le
  // panneau qui vient d'être construit.
  if (etat.viser) {
    const vise = etat.viser;
    etat.viser = null;
    allerALaFonction(espace, vise);
  }

  // Le plein écran fige la page derrière lui : deux ascenseurs superposés se
  // disputent la molette, et l'on croit faire glisser le schéma quand c'est la
  // page qui bouge.
  figerLaPage(etat.pleinEcran);
}

/**
 * Le survol d'une carte allume sa chaîne.
 *
 * On regarde une carte du coin de l'œil bien plus souvent qu'on ne la choisit :
 * demander un clic pour voir ses liens fait cliquer partout, et l'on perd la
 * sélection qu'on avait. Le survol ne change donc **que** le dessin des traits.
 */
function brancherLeSurvolDesCartes(espace, reposer) {
  const etat = view.raisonnement;

  const designer = (id) => {
    if (etat.survol === id) return;
    etat.survol = id;
    reposer();
  };

  espace.addEventListener("pointerover", (evenement) => {
    const carte = evenement.target?.closest?.("[data-graphe-noeud]");
    if (carte) designer(carte.dataset.grapheNoeud);
  });

  espace.addEventListener("pointerleave", () => designer(null));
  espace.querySelector("[data-graphe-vue]")?.addEventListener("pointerleave", () => designer(null));
}

/**
 * Ce que l'on peut faire dans l'espace.
 *
 * Cliquer une carte **emmène au code** : c'est le geste qu'on fait vingt fois —
 * « et celle-là, elle a lu quoi ? » — et le faire à la molette sur cent lignes
 * fait perdre le fil. La carte reste désignée, et le schéma se resserre sur sa
 * chaîne ; recliquer la même rouvre tout.
 */
function brancherLesGestesDeLEspace(root, espace) {
  const etat = view.raisonnement;

  espace.addEventListener("click", (evenement) => {
    const carte = evenement.target?.closest?.("[data-graphe-noeud]");
    if (carte) {
      const id = carte.dataset.grapheNoeud;
      etat.carte = etat.carte === id ? null : id;
      // Le défilement se **demande**, il ne se fait pas ici : le rendu qui suit
      // remplace le panneau de code, et la position qu'on venait de poser
      // partait avec l'ancien. On atterrissait en haut du fichier, à chaque
      // clic, sur la ligne 1 — ce qui ressemblait à « ça ne marche pas ».
      etat.viser = id;
      renderContent(root);
      return;
    }

    if (evenement.target?.closest?.("[data-graphe-chemin]")) {
      etat.carte = null;
      renderContent(root);
      return;
    }

    const zoom = evenement.target?.closest?.("[data-graphe-zoom]");
    if (zoom) {
      const pas = zoom.dataset.grapheZoom === "in" ? 0.1 : -0.1;
      // Bornes : en deçà de 50 % les intitulés ne se lisent plus, au-delà de
      // 200 % une carte occupe l'écran et le schéma ne montre plus de forme.
      etat.zoom = Math.min(2, Math.max(0.5, Math.round((etat.zoom + pas) * 10) / 10));
      renderContent(root);
      return;
    }

    // Le plein écran du schéma seul n'a plus lieu d'être : c'est l'espace
    // entier qui s'agrandit, code et discussion compris. Le composant ne le
    // dessine donc plus ici — voir `peutSAgrandir`.
    if (evenement.target?.closest?.("[data-raison-plein-ecran]")) {
      etat.pleinEcran = !etat.pleinEcran;
      renderContent(root);
      return;
    }

    // La discussion se masque seule : elle a sa colonne.
    const panneau = evenement.target?.closest?.("[data-raison-panneau]");
    if (panneau) {
      const cle = panneau.dataset.raisonPanneau;
      etat[cle] = etat[cle] === false;
      renderContent(root);
      return;
    }

    // Le schéma et le code se relaient dans la même colonne : un sélecteur à
    // trois positions, qui ne peut pas produire d'écran vide.
    const vue = evenement.target?.closest?.("[data-raison-vue]");
    if (vue) {
      const suivante = VUES.find((entree) => entree.cle === vue.dataset.raisonVue);
      if (!suivante) return;
      etat.schemaOuvert = suivante.schema;
      etat.codeOuvert = suivante.code;
      renderContent(root);
    }
  });
}

/**
 * Aller à la fonction d'une carte, dans le code.
 *
 * Le conteneur a une hauteur fixe — c'est ce qui rend le défilement possible :
 * un bloc qui s'étire à la hauteur de son contenu n'a rien à faire défiler, et
 * le geste ne ferait rien.
 */
function allerALaFonction(espace, carte) {
  const rang = view.raisonnementAncres?.get(carte);
  if (rang === undefined) return;

  const vue = espace.querySelector("[data-raison-code]");
  const ligne = vue?.querySelector(`[data-raison-rang="${rang}"]`);
  // La rangée est un `display:contents` : elle n'a pas de boîte, donc pas de
  // position. C'est sa première cellule qu'on mesure — et par sa position à
  // l'écran, non par `offsetTop`, qui compterait depuis un ancêtre positionné
  // dont on ne veut pas dépendre.
  const cellule = ligne?.firstElementChild;
  if (!vue || !cellule) return;

  // On vise le haut, sous la ligne de titres qui reste collée : centrer ferait
  // disparaître la tête de fonction dans le haut de l'écran une fois sur deux.
  const tete = vue.querySelector(".raison-ligne--tete .raison-ligne__code");
  const marge = tete ? tete.getBoundingClientRect().height : 0;
  const ecart = cellule.getBoundingClientRect().top - vue.getBoundingClientRect().top;

  vue.scrollTo({ top: Math.max(0, vue.scrollTop + ecart - marge - 8), behavior: "smooth" });

  for (const autre of vue.querySelectorAll(".raison-ligne--visee")) autre.classList.remove("raison-ligne--visee");
  ligne.classList.add("raison-ligne--visee");
}

/**
 * Les trois poignées.
 *
 * La hauteur du schéma, le partage entre le code et les valeurs, la largeur de
 * la discussion. La largeur s'applique pendant le glissé — redimensionner sans
 * voir revient à viser en aveugle — et l'état n'est rangé qu'au relâchement.
 */
function brancherLesPoignees(root, espace) {
  const etat = view.raisonnement;

  const poser = (nom, valeur) => {
    espace.style.setProperty(`--raison-${nom}`, `${Math.round(valeur)}px`);
  };

  const poignees = [
    { nom: "schema", champ: "hauteurSchema", axe: "y", sens: 1 },
    // La gouttière des numéros : on la tire **vers la droite** pour élargir les
    // valeurs, qui sont collées au bord gauche.
    { nom: "etat", champ: "largeurEtat", axe: "x", sens: 1 },
    // La discussion est collée au bord droit : on tire sa poignée vers la
    // gauche pour l'agrandir.
    { nom: "copilote", champ: "largeurCopilote", axe: "x", sens: -1 }
  ];

  for (const poignee of poignees) {
    const handle = espace.querySelector(`[data-raison-poignee="${poignee.nom}"]`);
    if (!handle) continue;

    bindSideResizer({
      handle,
      axe: poignee.axe,
      sens: poignee.sens,
      min: BORNES[poignee.nom].min,
      max: BORNES[poignee.nom].max,
      getWidth: () => etat[poignee.champ],
      onResize: (valeur) => poser(poignee.nom, valeur),
      onEnd: (valeur) => {
        etat[poignee.champ] = valeur;
        // Pas de rendu complet : il perdrait la position de défilement du code
        // et la discussion en cours. La variable CSS a déjà tout dit.
        poser(poignee.nom, valeur);
      }
    });
  }
}

/**
 * La discussion, montée telle qu'elle vit dans l'Atelier.
 *
 * Le même composant, le même fil, les mêmes discussions. Une seconde salle de
 * discussion aurait deux historiques et deux comportements, et l'on ne saurait
 * plus où l'on a posé quoi.
 */
function monterLeCopilote(espace) {
  // `data-raison-discussion` désigne l'**hôte**, pas le bouton qui l'ouvre. Les
  // deux ont partagé un attribut, et le fil de discussion se montait alors à
  // l'intérieur du bouton — vingt-huit pixels de côté, et l'on cherchait la
  // panne dans le composant.
  const hote = espace.querySelector("[data-raison-discussion]");
  if (!hote) return;

  // Le copilote lit la mémoire du projet, pas la variante affichée. Il ne ment
  // donc pas — mais il répondrait « 0,99 m » devant un écran qui montre
  // « 1,17 m », et c'est indiscernable d'une panne. On le dit avant qu'il parle.
  if (varianteEnCours() && !espace.querySelector(".raison-espace__variante")) {
    const note = document.createElement("p");
    note.className = "raison-espace__variante";
    note.textContent = "Le copilote répond sur la mémoire du projet, pas sur la variante affichée.";
    // Avant l'hôte, pas dedans : `renderCopilote` réécrit tout son contenu, et
    // la note disparaîtrait à la première réponse.
    hote.insertAdjacentElement("beforebegin", note);
  }

  void import("./studio/copilote/copilote.js")
    .then(({ renderCopilote }) => {
      if (hote.isConnected) renderCopilote(hote, { garderLeDefilement: true });
    })
    .catch(() => {
      hote.innerHTML = `<p class="raison-espace__panne">La discussion n'a pas pu être ouverte.</p>`;
    });
}

/**
 * La page derrière ne défile pas pendant le plein écran — et ne paraît plus.
 *
 * Calé sous l'en-tête global, l'espace laissait voir le nom du projet et sa
 * barre d'onglets : ce n'était pas le plein écran, c'était un grand panneau.
 * L'en-tête s'efface donc, comme il s'efface déjà sous une barre de titre
 * compactée — `#app` est un contexte d'empilement, et aucun `z-index` posé à
 * l'intérieur ne peut monter au-dessus de lui.
 */
function figerLaPage(fige) {
  if (typeof document === "undefined") return;
  // Sur les deux : selon la page, c'est `html` ou `body` qui porte le
  // défilement, et n'en figer qu'un laissait la seconde barre.
  document.body.classList.toggle("est-fige-par-le-graphe", fige === true);
  document.documentElement.classList.toggle("est-fige-par-le-graphe", fige === true);
  document.body.classList.toggle("memoire-raisonnement-plein-ecran", fige === true);
}

/**
 * Le titre d'une affirmation se compacte au défilement.
 *
 * Le même mécanisme que pour un sujet et pour une proposition, et le même
 * composant : la page défile, la coque prend `overlay-chrome--compact`,
 * l'en-tête prend `details-head--compact`, et le CSS partagé échange les deux
 * titres. Un troisième mécanisme écrit ici aurait fini par se comporter
 * autrement que les deux autres — et c'est le genre de différence qu'on ne
 * remarque qu'après l'avoir subie.
 */
function brancherLeCompactage(root) {
  // Hors du détail, la marque tombe : laissée en place, elle effacerait
  // l'en-tête global au-dessus du tableau, sans rien pour le remplacer.
  if (!root.querySelector("[data-memory-chrome]")) {
    document.body.classList.remove("project-memory-details-top-compact");
    return;
  }

  bindOverlayChromeCompact(
    document.documentElement,
    root.querySelector("[data-memory-chrome]"),
    "memoire",
    {
      alsoCompactWhen: () => document.body.classList.contains("project-shell-compact"),
      // La barre compacte prend la place de l'en-tête global — elle ne passe
      // pas devant. `#app` est un contexte d'empilement : un `z-index` posé à
      // l'intérieur ne peut pas monter au-dessus d'un élément extérieur.
      onCompactChange: (colle) => {
        document.body.classList.toggle("project-memory-details-top-compact", colle === true);
      }
    }
  );
}

/**
 * Les recherches épinglées : les poser, les rejouer, les entretenir.
 *
 * Tout par délégation sur la racine, qui ne change pas : le rail et la barre de
 * recherche se refont à chaque rendu, et des écouteurs posés sur eux partiraient
 * avec eux.
 */
function brancherLesRecherches(root) {
  if (root.dataset.recherchesBranche === "true") return;
  root.dataset.recherchesBranche = "true";

  const fermerLesMenus = () => {
    for (const menu of root.querySelectorAll("[data-recherche-menu-for]")) menu.hidden = true;
    for (const bouton of root.querySelectorAll("[data-recherche-menu]")) bouton.setAttribute("aria-expanded", "false");
  };

  root.addEventListener("click", async (evenement) => {
    const menu = evenement.target.closest?.("[data-recherche-menu]");
    if (menu) {
      evenement.stopPropagation();
      const cible = root.querySelector(`[data-recherche-menu-for="${menu.dataset.rechercheMenu}"]`);
      const ouvert = cible?.hidden === false;
      fermerLesMenus();
      if (cible) cible.hidden = ouvert;
      menu.setAttribute("aria-expanded", ouvert ? "false" : "true");
      return;
    }

    const renommer = evenement.target.closest?.("[data-recherche-renommer]");
    if (renommer) {
      evenement.stopPropagation();
      fermerLesMenus();
      const id = renommer.dataset.rechercheRenommer;
      const actuelle = (view.recherches ?? []).find((entree) => entree.id === id);
      const propose = window.prompt("Renommer cette recherche", actuelle?.titre ?? "");
      if (propose === null) return;

      const { renommerLaRecherche } = await import("../services/memoire-recherches-supabase.js");
      const changee = await renommerLaRecherche(id, propose);
      if (!changee) {
        view.notice = "Le nouveau nom n'a pas pu être enregistré.";
        renderContent(root);
        return;
      }
      view.recherches = (view.recherches ?? []).map((entree) => (entree.id === id ? changee : entree));
      renderContent(root);
      return;
    }

    const oublier = evenement.target.closest?.("[data-recherche-oublier]");
    if (oublier) {
      evenement.stopPropagation();
      fermerLesMenus();
      const id = oublier.dataset.rechercheOublier;

      const { oublierLaRecherche } = await import("../services/memoire-recherches-supabase.js");
      if (!(await oublierLaRecherche(id))) {
        view.notice = "L'épingle n'a pas pu être retirée.";
        renderContent(root);
        return;
      }
      view.recherches = (view.recherches ?? []).filter((entree) => entree.id !== id);
      renderContent(root);
      return;
    }

    const rejouer = evenement.target.closest?.("[data-memory-recherche]");
    if (rejouer) {
      const trouvee = (view.recherches ?? []).find((entree) => entree.id === rejouer.dataset.memoryRecherche);
      if (!trouvee) return;
      view.query = trouvee.requete;
      view.page = 1;
      renderContent(root);
      return;
    }

    if (evenement.target.closest?.("[data-memory-epingler]")) {
      // Le nom se donne après : demander un titre avant d'épingler ferait
      // renoncer une fois sur deux. La requête fait office, et c'est elle qu'on
      // reconnaît.
      const { epinglerLaRecherche } = await import("../services/memoire-recherches-supabase.js");
      const posee = await epinglerLaRecherche({ projectId: view.projectId, requete: view.query });
      if (!posee) {
        view.notice = "L'épingle n'a pas pu être enregistrée.";
        renderContent(root);
        return;
      }
      // Déjà là : la base a rendu la ligne existante plutôt qu'un doublon.
      view.recherches = (view.recherches ?? []).some((entree) => entree.id === posee.id)
        ? view.recherches
        : [...(view.recherches ?? []), posee];
      renderContent(root);
      return;
    }

    if (evenement.target.closest?.("[data-memory-vider]")) {
      view.query = "";
      view.page = 1;
      renderContent(root);
      return;
    }

    fermerLesMenus();
  });
}

/** Les propositions, retrouvables par leur identifiant — pour les intitulés. */
function propositionsParId() {
  return new Map((view.propositions ?? []).map((proposition) => [String(proposition.id), proposition]));
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
      // Un autre constat, un autre raisonnement : garder la carte désignée du
      // précédent resserrerait le schéma sur un chemin qui n'existe plus. Et
      // l'on revient à la première lecture — c'est ce qu'on vient chercher.
      view.raisonnement = espaceParDefaut();
      view.detailOnglet = DETAIL.ETABLIT;
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
  brancherLeBandeauVariante(root);
  brancherLeFiltreDeVariante(root);
  brancherLeCerveau(root);
  brancherLeCompactage(root);
  brancherLEspace(root);
  brancherLesRecherches(root);

  // Les trois lectures d'une affirmation. Changer d'onglet ne touche à rien
  // d'autre : la recherche, la page et l'affirmation ouverte restent.
  bindLightTabs(root, {
    selector: ".memory-detail__tabs [data-light-tab-target]",
    onChange: (onglet) => {
      if (view.detailOnglet === onglet) return;
      view.detailOnglet = onglet;
      renderContent(root);
    }
  });

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
      // Les mêmes filtres que l'écran entier, sinon taper une lettre ferait
      // réapparaître ce que la nature ou le domaine venaient d'écarter.
      redessinerLaListe(root);
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

  // Le compte des pas mène au plan : un chiffre qu'on ne peut pas ouvrir ne
  // fait que décorer.
  root.querySelector("[data-memory-plan]")?.addEventListener("click", () => {
    ouvrirLePlanDeRecalcul({ assertions: view.assertions ?? [] });
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

  // « J'ai vérifié » : une ligne de plus dans l'histoire de la valeur, et rien
  // d'autre. Pas de note demandée — la demander ferait un formulaire, et un
  // formulaire fait une procédure.
  root.querySelector("[data-memory-couvre]")?.addEventListener("click", (event) => {
    recordHypothesisAct(root, {
      assertionId: event.currentTarget.getAttribute("data-memory-couvre"),
      verdict: ACT.COUVRE,
      note: "Vérifiée dans le projet"
    });
  });

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

  // Le repli du composant — une invite qui garde le texte — n'est pas une
  // copie : la phrase le dit, plutôt que d'annoncer un succès qui n'a pas eu
  // lieu.
  view.notice = await copierDansLePressePapiers(texte)
    ? "Le dossier de contexte est dans le presse-papiers."
    : "Le presse-papiers a refusé la copie. Le texte vous a été proposé à la main.";
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
/**
 * Relire ce que chaque règle a lu, et l'enregistrer.
 *
 * Rien n'entre en mémoire : on écrit le **graphe**, pas des affirmations. C'est
 * néanmoins un geste — il écrit —, et il se demande.
 *
 * Ce qui a été enregistré au versement n'est pas touché : un lien résolu contre
 * la mémoire que la règle a vue vaut mieux qu'un lien résolu contre celle
 * d'aujourd'hui, et l'écran doit pouvoir dire lequel des deux il montre.
 */
async function reconstruireLesLectures(root) {
  if (view.busy) return;
  view.busy = true;
  view.notice = "Relecture des règles…";
  renderContent(root);

  try {
    const { reconstruireLesApplications } = await import("../services/memoire-applications-supabase.js");
    const rendu = await reconstruireLesApplications(view.projectId);

    if (!rendu) {
      view.notice = "Les liens n'ont pas pu être relus. La mémoire reste ce qu'elle était.";
    } else if (!rendu.lues) {
      // Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien : on dit d'où
      // ces liens viendraient plutôt que « aucun lien ».
      view.notice =
        "Aucune règle appliquée dans ce projet : il n'y a pas de lecture à enregistrer. "
        + "Les règles arrivent avec une étude de l'Atelier.";
    } else {
      view.notice =
        `${rendu.lues} lecture(s) relue(s) : ${rendu.ecrites} enregistrée(s) après coup`
        + `${rendu.deja ? `, ${rendu.deja} laissée(s) telle(s) quelle(s) — déjà enregistrée(s) au versement` : ""}. `
        + "Un lien résolu après coup l'est contre la mémoire d'aujourd'hui, pas contre celle que la règle a vue.";

      // L'index à l'écran suit : rouvrir l'étude d'impact sur l'ancien graphe
      // montrerait un compte que la relecture vient de démentir.
      const { listerLesApplications } = await import("../services/memoire-applications-supabase.js");
      view.applications = await listerLesApplications(view.projectId);
    }
  } catch {
    view.notice = "Les liens n'ont pas pu être relus. La mémoire reste ce qu'elle était.";
  }

  view.busy = false;
  renderContent(root);
}

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

  redessinerLaListe(root);
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

/** Une seule inscription pour tout l'onglet, quel que soit le nombre de montages. */
let abonneALaVariante = false;

/**
 * Ouvrir la fenêtre des variantes depuis la barre de la mémoire.
 *
 * La mémoire lue est passée telle quelle : c'est celle qui est à l'écran, et la
 * relire en base risquerait de calculer une variante sur une autre liste que
 * celle qu'on regarde.
 */
function brancherLeFiltreDeVariante(root) {
  for (const bouton of root.querySelectorAll("[data-variante-filtre]")) {
    bouton.addEventListener("click", () => {
      view.varianteSeulement = !view.varianteSeulement;
      view.page = 1;
      renderContent(root);
    });
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Le cerveau du projet
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Brancher le seul usage du moteur de rejeu qui reste ici.
 *
 * Les trois autres — variante, étude d'impact, audit — ont déménagé dans
 * l'Atelier : ils **préparent une proposition**, et la Mémoire ne montre que ce
 * que le projet tient pour vrai. Le cerveau, lui, ne prépare rien : il dessine
 * la forme de ce qui est là, et c'est une lecture. Voir
 * `docs/a-traiter-plus-tard.md`, § 14, et `services/usages-du-rejeu.js`.
 */
function brancherLeCerveau(root) {
  root.querySelector("[data-memoire-cerveau]")?.addEventListener("click", () => {
    // **La même sélection que le tableau.** Le cerveau recevait la mémoire
    // entière pendant que la liste juste derrière n'en montrait que douze
    // lignes : deux rendus, deux contenus, et rien pour dire lequel disait vrai.
    //
    // Le calque d'une variante reste dehors, lui, et c'est délibéré : le cerveau
    // montre la forme du raisonnement du projet, pas celle d'une lecture qu'on
    // essaie — dessiner un raisonnement qu'on sait faux ne dirait rien de vrai.
    // C'est pour cela qu'on filtre `view.memoire` et non `view.assertions`.
    ouvrirLeCerveau({
      assertions: selectionMemoire(view.memoire ?? []),
      applications: view.applications,
      // Ce qui a été examiné, et par qui. `null` quand la lecture a échoué : le
      // cerveau distingue « personne ne s'est engagé » de « on n'a pas regardé ».
      actes: view.acts,
      // Ce qu'on regarde, en toutes lettres. Un cerveau de douze nœuds sans
      // prévenir qu'un filtre est posé ferait croire à un projet de douze
      // affirmations, et l'on chercherait longtemps ce qui manque (règle 5).
      selection: descriptionDeLaSelection()
    });
  });
}

/**
 * Ce que la requête retient, en une phrase — ou `""` quand elle ne retient rien.
 *
 * Les mêmes mots que la barre de recherche : elle nomme déjà chaque filtre, et
 * une deuxième façon de les dire finirait par ne plus dire la même chose.
 */
function descriptionDeLaSelection() {
  if (!laRequeteRestreint(view.query, MEMORY_FIELDS)) return "";

  const dits = describeFilters(view.query, MEMORY_FIELDS)
    .map((filtre) => `${filtre.label} : ${filtre.valueLabel}`);

  const { text } = parseQuery(view.query, MEMORY_FIELDS);
  if (String(text ?? "").trim()) dits.push(`« ${String(text).trim()} »`);
  if (view.pending) dits.push("à revérifier");

  return dits.join(" · ");
}

/**
 * Se redessiner quand on entre dans une variante, ou qu'on en sort.
 *
 * La sortie peut venir d'ailleurs que de cet écran — d'un autre onglet, d'un
 * bouton qu'on ajoutera demain. Redessiner depuis le magasin plutôt que depuis
 * le bouton garantit qu'aucune page ne reste sur une lecture qui n'a plus cours.
 */
function brancherLaVariante() {
  if (abonneALaVariante) return;
  abonneALaVariante = true;

  quandLaVarianteChange((variante) => {
    if (!mountedRoot?.isConnected) return;
    // En entrant, on ne montre que l'écart : c'est ce qu'on vient voir, et sur
    // trois cents lignes il est introuvable autrement. Le bandeau porte le
    // bouton qui rouvre la mémoire entière.
    view.varianteSeulement = Boolean(variante);
    // On revient à la liste : le détail ouvert parlait d'une valeur qui vient
    // de changer sous lui, et le relire tel quel montrerait un titre d'un monde
    // et un raisonnement de l'autre.
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
  brancherLaVariante();

  setProjectViewHeader({ contextLabel: "Mémoire", variant: "memory", hideBar: true });

  view.loading = true;
  view.notice = "";
  view.open = null;
  view.page = 1;
  view.navCollapsed = repliRetenu();
  view.navWidth = largeurRetenue();
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

      // Les épingles de qui regarde, sur ce projet-ci. Elles ne sont visibles
      // que de lui : la politique de la table le garantit, pas cet écran.
      const { listerLesRecherches } = await import("../services/memoire-recherches-supabase.js");
      view.recherches = (view.projectId ? await listerLesRecherches(view.projectId) : []) ?? [];

      // Le graphe des dépendances se lit avec la mémoire : sans lui, une
      // affirmation suspecte s'afficherait sans dire de quelle hypothèse elle
      // dépend, et une hypothèse sans son compteur.
      const { listAssertionDependencies } = await import("../services/assertion-dependencies-supabase.js");
      view.dependencies = view.projectId ? await listAssertionDependencies(view.projectId) : null;

      // Ce que chaque règle a lu, avec son rang et sa zone : c'est de là que
      // l'étude d'impact tire « employée n fois », et le graphe des dépendances
      // les liens qu'il ne déduit plus par nom.
      const { listerLesApplications } = await import("../services/memoire-applications-supabase.js");
      view.applications = view.projectId ? await listerLesApplications(view.projectId) : null;

      // Les actes disent l'état d'une hypothèse : sans eux, toutes paraîtraient
      // candidates, y compris celles que le bureau de contrôle a validées.
      const { listHypothesisActs } = await import("../services/memoire-actes-supabase.js");
      view.acts = view.projectId ? await listHypothesisActs(view.projectId) : null;

      // Les noms des signataires, pour la marge du Blame. Un identifiant dans
      // la marge ne dit rien à personne : c'est le nom qu'on cherche quand on
      // se demande qui a décidé cela.
      // Les propositions fusionnées : c'est en les comparant à la mémoire qu'on
      // sait si l'une d'elles n'a rien laissé.
      const { listPropositions, loadAuthors } = await import("../services/propositions-supabase.js");
      view.propositions = view.projectId ? ((await listPropositions(view.projectId)) ?? []) : [];

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
      view.applications = null;
      view.acts = null;
    }

    view.loading = false;
    if (root.isConnected) renderContent(root);
  })();
}
