import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderStatusBadge } from "../ui/status-badges.js";
import { renderTableHeadFilterToggle } from "../ui/table-head-filter-toggle.js";
import { renderDataTableHead } from "../ui/data-table-shell.js";
import { renderIssuesTable } from "../ui/issues-table.js";
import { normalizePaginationState, renderPaginationControls } from "../ui/pagination.js";
import { motDeLAppartenance, pourquoiPasModifiable } from "../../services/situations-privees.js";
import { phraseDuPerimetre, projetsRegardes, regardeToutMonTravail } from "../../services/perimetre-dune-situation.js";
import { detailDeLAvancement, phraseDeLAvancement } from "../../services/avancement-dune-situation.js";
import { couleurDeLaSituation, iconeDeLaSituation } from "../../services/situation-comme-une-vue.js";
import { definitionDeLabel, renderPastilleDeLabel } from "../ui/pastille-de-label.js";
import { renderKebabDeLaSituation } from "./kebab-dune-situation.js";
import { personnesDuProjet } from "../../services/meta-des-sujets.js";

/**
 * Le tableau des sujets qu'une requête retient, sous le formulaire.
 *
 * ## Pourquoi il est là
 *
 * **On voit ce que la recherche rend pendant qu'on l'écrit.** Enregistrer une
 * situation sans avoir vu ce qu'elle montre, c'est enregistrer une promesse —
 * c'est déjà la raison d'être du tableau sous le formulaire d'une vue, et c'est
 * la même ici (étape 3).
 *
 * ## Le chantier est une colonne, et il n'est pas décoratif
 *
 * Une situation du carnet traverse les projets : deux sujets du même nom dans
 * deux chantiers différents sont deux lignes qu'on ne distingue plus si l'on ne
 * dit pas d'où elles viennent. Sur l'écran d'un projet, la colonne dit la même
 * chose et ne coûte rien — un chantier unique se lit d'un coup d'œil.
 *
 * ## Ne pas savoir n'est pas « rien »
 *
 * `sujets` vaut `null` tant que la charge n'a pas été lue. Rendre un tableau
 * vide ferait croire que la requête ne retient rien, alors qu'on n'a pas encore
 * regardé (règle 5) — le tableau dit donc qu'il charge.
 *
 * Aucune classe nouvelle : la coquille de tableau des autres écrans, ses
 * cellules et sa pastille de statut, au même calibrage.
 */
export function renderTableauDesSujetsRetenusHtml({
  sujets = null, nomsDesProjets = {}, requete = "",
  /**
   * Les menus de filtre, au-dessus de la colonne des sujets.
   *
   * **Sans eux, il fallait connaître la grammaire pour écrire une requête.**
   * On tapait un mot, rien ne répondait, et rien ne disait ce qu'on aurait pu
   * demander. Ce sont les mêmes menus que l'en-tête du tableau des sujets d'un
   * projet : ils posent un jeton dans la requête, et la requête reste lisible
   * et corrigeable au clavier.
   */
  filtresHtml = "",
  /**
   * Une situation qui se remplit à la main n'a pas de requête, et ne retient
   * donc **rien pour l'instant** — surtout pas tout. Montrer les six cent
   * quatre-vingt-dix-huit sujets du carnet ferait croire qu'elle les prend.
   */
  aLaMain = false,
  /**
   * Ce que chaque sujet porte — labels, auteur, blocage —, par identifiant.
   *
   * **La même surcouche que l'écran lit pour filtrer.** La recalculer ici
   * ferait une seconde lecture des mêmes colonnes, et c'est celle qu'on ne
   * regarde pas qui finirait par avoir raison (règle 4).
   */
  meta = {},
  /** Les définitions des labels, pour les nommer et les colorer. */
  labels = [],
  /** Qui travaille sur ces chantiers, pour nommer l'auteur. */
  personnes = [],
  /** La longueur du fil de discussion de chaque sujet, par identifiant. */
  messages = {}
} = {}) {
  const dite = String(requete ?? "").trim();
  const noms = nomsDesProjets && typeof nomsDesProjets === "object" ? nomsDesProjets : {};
  const decor = {
    meta: meta && typeof meta === "object" ? meta : {},
    labels: indexDesLabels(labels),
    personnes: indexDesPersonnes(personnes),
    messages: messages && typeof messages === "object" ? messages : {}
  };
  const lus = Array.isArray(sujets) ? sujets : null;
  const combien = lus ? lus.length : 0;

  const compte = lus ? `${combien} sujet${combien > 1 ? "s" : ""}` : "Sujets";
  const headHtml = renderDataTableHead({
    columns: [
      {
        className: "cell cell-theme",
        html: `<span class="situations-sujets-tete">
          <span class="situations-sujets-tete__compte">${escapeHtml(compte)}</span>
          ${filtresHtml}
        </span>`
      },
      // La colonne du fil n'a pas d'intitulé : l'icône le dit sur chaque ligne,
      // et un mot au-dessus de quatre-vingts pixels tiendrait mal.
      { className: "cell cell-messages-head", html: "" },
      // « Projet » : un projet en conception n'est pas encore un chantier, et la
      // colonne le nomme comme le filtre le nomme.
      { className: "cell", label: "Projet" }
    ]
  });

  if (aLaMain) {
    return renderIssuesTable({
      gridTemplate: TABLEAU_DES_SUJETS_RETENUS,
      headHtml,
      emptyTitle: "Cette situation se remplit à la main",
      emptyDescription: "Aucune requête : vous y mettrez les sujets un par un, "
        + "depuis l'onglet Sujets de leur projet."
    });
  }

  if (!lus) {
    return renderIssuesTable({
      gridTemplate: TABLEAU_DES_SUJETS_RETENUS,
      headHtml,
      state: "loading",
      loadingTitle: "Lecture des sujets…",
      loadingDescription: "On ne sait pas encore ce que cette recherche retient."
    });
  }

  return renderIssuesTable({
    gridTemplate: TABLEAU_DES_SUJETS_RETENUS,
    headHtml,
    rowsHtml: lus.map((sujet) => renderSujetRetenuHtml(sujet, noms, decor)).join(""),
    emptyTitle: dite ? "Aucun sujet ne répond à cette recherche" : "Aucun sujet retenu",
    emptyDescription: dite
      ? "Élargissez la requête : une situation qui ne retient rien ne montrera rien."
      : "Écrivez une requête : c'est elle qui dit ce que la situation retient."
  });
}

/**
 * La largeur des colonnes, écrite une fois pour l'en-tête et les lignes.
 *
 * **Celles du tableau des sujets d'un projet, plus le chantier.** Le carnet
 * traverse les chantiers : deux sujets du même nom dans deux chantiers
 * différents sont deux lignes qu'on ne distingue plus sans dire d'où elles
 * viennent — c'est la colonne que cet écran a de plus, et la seule.
 */
const TABLEAU_DES_SUJETS_RETENUS = "minmax(0, 1fr) 84px 180px";

/** Les labels par identifiant **et par clé** : la surcouche range par les deux. */
function indexDesLabels(labels = []) {
  const index = new Map();

  for (const brut of Array.isArray(labels) ? labels : []) {
    const definition = definitionDeLabel(brut);
    if (definition.id) index.set(definition.id, definition);
    if (definition.key) index.set(definition.key, definition);
  }

  return index;
}

/** Les personnes par identifiant, pour nommer un auteur. */
function indexDesPersonnes(personnes = []) {
  return new Map(personnesDuProjet(personnes).map((sien) => [sien.id, sien.name]));
}

/**
 * Une ligne de ce tableau.
 *
 * ## Ce qu'elle montrait, et ce qui manquait
 *
 * Un titre, une pastille d'état, un chantier. L'onglet Sujets d'un projet, lui,
 * montre les **labels**, l'**auteur**, le **blocage** et la longueur du **fil**
 * — et c'est sur ces quatre-là qu'on reconnaît un sujet dans une liste de
 * soixante. On écrivait une requête dans le carnet et l'on obtenait une liste
 * de titres nus, qu'il fallait ouvrir un par un pour savoir ce qu'on regardait.
 *
 * ## Rien n'est recalculé ici
 *
 * Les labels, l'auteur et le blocage viennent de la **surcouche** que l'écran
 * lit déjà pour filtrer (`metaDesSujets`), et la pastille est celle des labels
 * d'un projet. Une seconde lecture des mêmes colonnes finirait par ne plus dire
 * la même chose que la première (règles 4 et 10).
 *
 * ## Le chantier est nommé, ou son identifiant est montré tel quel
 *
 * Rendre une cellule vide quand on ne sait pas nommer le projet ferait croire
 * que le sujet n'appartient à aucun chantier, ce qui n'arrive pas (règle 5).
 */
function renderSujetRetenuHtml(sujet, noms, decor = {}) {
  const id = String(sujet?.id ?? "").trim();
  const ouvert = String(sujet?.status || "open") !== "closed";
  const chantier = String(sujet?.project_id ?? sujet?.projectId ?? "").trim();
  const sien = decor.meta?.[id] ?? {};

  const pastilles = (Array.isArray(sien.labels) ? sien.labels : [])
    .map((cle) => decor.labels?.get(String(cle)))
    .filter(Boolean)
    .map((definition) => renderPastilleDeLabel(definition))
    .join("");

  // **L'auteur, et non l'assigné.** Les deux se confondent souvent et divergent
  // toujours au moment où ça compte. Un auteur qu'on ne sait pas nommer se dit
  // par son identifiant plutôt que de disparaître (règle 5).
  const qui = String((Array.isArray(sien.auteurs) ? sien.auteurs : [])[0] ?? "").trim();
  const auteur = qui ? (decor.personnes?.get(qui) || qui) : "";

  const combienDeMessages = Number(decor.messages?.[id] ?? 0);
  const fil = Number.isFinite(combienDeMessages) && combienDeMessages > 0 ? combienDeMessages : 0;

  return `
    <div class="issue-row issue-row--pb">
      <div class="cell cell-theme lvl0">
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status" aria-hidden="true">${
            svgIcon(ouvert ? "issue-opened" : "check-circle", { className: "octicon" })}</span>
          <span class="issue-row-title-grid__title issue-row-subject-title-line">
            <span class="theme-text theme-text--pb">${
              escapeHtml(String(sujet?.title || "Sujet"))}</span>
            ${pastilles ? `<span class="issue-row-subject-labels">${pastilles}</span>` : ""}
          </span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">
            ${sien.bloque === true
              ? `<span class="issue-row-blocked-pill" aria-label="Sujet bloqué">${
                svgIcon("blocked", { className: "octicon octicon-blocked fgColor-danger" })
                }<span>Bloqué</span></span>`
              : ""}
            ${renderStatusBadge({
              label: ouvert ? "Ouvert" : "Fermé",
              tone: ouvert ? "success" : "muted"
            })}
            ${auteur ? `<span class="issue-row-author-name">${escapeHtml(auteur)}</span>` : ""}
          </span>
        </span>
      </div>
      <div class="cell cell-messages-value">${fil
        ? `<span class="issue-row-messages-count" aria-label="${escapeHtml(`${fil} message(s)`)}">
            ${svgIcon("message")}<span>${escapeHtml(String(fil))}</span>
          </span>`
        : '<span class="issue-row-messages-empty" aria-hidden="true"></span>'}</div>
      <div class="cell mono-small">${escapeHtml(noms[chantier] || chantier || "—")}</div>
    </div>
  `;
}

/**
 * Les trois colonnes, écrites une fois pour l'en-tête et pour les lignes.
 *
 * Deux écritures de la même grille se décalent d'une colonne au premier ajout,
 * et l'en-tête se retrouve au-dessus de la mauvaise (règle 4).
 */
const GRILLE_DES_SITUATIONS = "minmax(420px, 1.6fr) 90px 44px";

export function createProjectSituationsTable({
  store,
  uiState,
  getSituations,
  getPaginatedSituations,
  getSituationsPaginationState,
  normalizeSituationStatus,
  renderSituationCount,
  formatSituationUpdatedLabel,
  getCurrentSituationsStatusFilter,
  getSituationsStatusCounts
}) {
  /**
   * L'exception, dite à voix haute.
   *
   * Une situation écrite avant le cloisonnement n'appartient à personne : son
   * projet la voyait hier et rien ne justifie de la lui retirer, mais la base
   * refuse de la réécrire au nom d'un autre. Se taire là-dessus laisserait
   * devant un geste qui échoue sans raison visible.
   *
   * Aucune classe nouvelle : c'est la pastille des autres écrans, avec le même
   * calibrage.
   */
  function renderAppartenancePill(situation) {
    const mot = motDeLAppartenance(situation);
    if (!mot) return "";

    return `<span title="${escapeHtml(pourquoiPasModifiable(situation))}">${renderStatusBadge({ label: mot })}</span>`;
  }

  /**
   * Ce que la situation regarde — et quand cela vaut la peine d'être dit.
   *
   * **Sur l'écran d'un projet, le cas normal ne se commente pas.** Une situation
   * qui ne regarde que ce projet y est la règle : nommer le chantier sur chacune
   * des quinze lignes ferait un bruit qu'on cesse de lire au bout de trois, et
   * la seule qui compte — celle qui en regarde quatre — s'y noierait.
   *
   * **Dans le carnet, tout se dit.** Là, rien n'est acquis : les situations
   * viennent de partout, et une ligne qui ne nomme pas son chantier oblige à
   * l'ouvrir pour savoir de quoi elle parle.
   *
   * On ne compare pas au projet courant — l'écran ne connaît que la clé du
   * navigateur, la situation porte l'identifiant de la base. `projectScopeId`
   * dit lequel des deux écrans on regarde, et il est nul dans le carnet parce
   * que ce n'est la liste d'aucun projet.
   *
   * Aucune classe nouvelle : la pastille des autres écrans, au même calibrage.
   */
  function renderPerimetrePill(situation) {
    const dansLeCarnet = !store.situationsView?.projectScopeId;
    if (!dansLeCarnet && !regardeToutMonTravail(situation) && projetsRegardes(situation).length <= 1) return "";

    const phrase = phraseDuPerimetre(situation, store.situationsView?.nomsDesProjets || {});
    return phrase ? renderStatusBadge({ label: phrase, tone: "accent" }) : "";
  }

  /**
   * L'icône d'une situation, dans sa couleur.
   *
   * **C'est à cela qu'on la reconnaît en descendant la liste**, comme une vue
   * dans le rail des sujets — et c'est précisément ce que le choix d'une icône
   * sert à faire. Toutes portaient le même pictogramme de tableau, ce qui
   * revenait à n'en porter aucun.
   *
   * Une situation fermée garde son icône : son état se lit à la colonne des
   * statuts, et lui en changer ferait deux façons de dire la même chose — dont
   * l'une effacerait le choix qu'on a fait (règle 4).
   *
   * Le jeu d'icônes et celui des couleurs sont ceux des vues : rien n'est
   * redéclaré ici.
   */
  function renderIconeDeLaSituation(situation) {
    const couleur = couleurDeLaSituation(situation).valeur;
    return `<span style="color:${escapeHtml(couleur)}">${
      svgIcon(iconeDeLaSituation(situation), { className: "octicon" })}</span>`;
  }

  /**
   * Où en est la situation.
   *
   * **Rien ne s'affiche quand on ne sait pas.** Une situation dont les sujets
   * n'ont pas pu être lus n'est pas à 0 % : « 0 % » se lirait comme « rien n'a
   * avancé », et l'on irait chercher pourquoi le chantier dort (règle 5).
   *
   * Rien non plus sur une situation vide : un pourcentage sur zéro sujet ne
   * dit rien qu'on ne voie déjà dans la colonne du compte.
   *
   * Aucune classe nouvelle : la pastille des autres écrans, au même calibrage.
   */
  function renderAvancementPill(situation) {
    const avancement = uiState.avancementParSituationId?.[String(situation?.id || "")];
    const phrase = phraseDeLAvancement(avancement);
    if (!phrase) return "";

    return `<span title="${escapeHtml(detailDeLAvancement(avancement))}">${renderStatusBadge({ label: phrase })}</span>`;
  }

  /**
   * **Le menu vit dans `kebab-dune-situation.js`.** Le détail d'une situation
   * le porte aussi, et le recopier aurait fait deux menus qui divergent à la
   * première entrée ajoutée (règle 10). Seul l'état ouvert vient d'ici.
   *
   * Pas de « Modifier » : chaque ligne porte déjà son crayon, et deux chemins
   * pour un geste font que l'un des deux finit par ne plus marcher.
   */
  function renderKebabDeLaLigne(situation) {
    return renderKebabDeLaSituation(situation, {
      ouvert: String(uiState.menuDeLaSituation || "") === String(situation?.id || "")
    });
  }

  function getSituationsTableHeadHtml() {
    const current = getCurrentSituationsStatusFilter();
    const counts = getSituationsStatusCounts();
    return renderDataTableHead({
      columns: [
        {
          className: "cell cell-theme",
          html: renderTableHeadFilterToggle({
            activeValue: current,
            items: [
              { label: "Ouverts", value: "open", count: counts.open, dataAttr: "situations-status-filter" },
              { label: "Fermés", value: "closed", count: counts.closed, dataAttr: "situations-status-filter" }
            ]
          })
        },
        { className: "cell", label: "Nb sujets" },
        // L'en-tête de la colonne du kebab reste vide : « Actions » au-dessus
        // d'un bouton qui dit déjà ce qu'il est n'ajoute qu'un mot à lire.
        { className: "cell", label: "" }
      ]
    });
  }

  function renderSituationTitleCell(situation) {
    const title = escapeHtml(situation.title);
    const updatedLabel = escapeHtml(formatSituationUpdatedLabel(situation.updated_at || situation.created_at || ""));
    const selectedClass = store.situationsView?.selectedSituationId === situation.id ? " selected subissue-row--selected" : "";

    return `
      <div class="issue-row issue-row--sit${selectedClass}">
        <div class="cell cell-theme lvl0">
          <span class="issue-row-title-grid">
            <span class="issue-row-title-grid__status" aria-hidden="true">${renderIconeDeLaSituation(situation)}</span>
            <span class="issue-row-title-grid__title">
              <span class="project-situations-table__title-inline">
                <button type="button" class="row-title-trigger theme-text theme-text--sit project-situations-table__title-trigger" data-open-situation="${escapeHtml(situation.id)}">${title}</button>
                ${renderAvancementPill(situation)}
                ${renderPerimetrePill(situation)}
                ${renderAppartenancePill(situation)}
              </span>
            </span>
            <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${updatedLabel}</span>
          </span>
        </div>
        <div class="cell mono">${escapeHtml(renderSituationCount(situation.id))}</div>
        <div class="cell cell--gestes">${renderKebabDeLaLigne(situation)}</div>
      </div>
    `;
  }

  function renderSituationsTable() {
    const allSituations = getSituations();
    const selectorPagination = typeof getSituationsPaginationState === "function" ? getSituationsPaginationState(allSituations.length) : null;
    const pagination = normalizePaginationState({
      totalItems: allSituations.length,
      pageSize: store?.situationsView?.pagination?.pageSize ?? selectorPagination?.pageSize,
      currentPage: store?.situationsView?.pagination?.currentPage ?? selectorPagination?.currentPage
    });
    const situations = typeof getPaginatedSituations === "function" ? getPaginatedSituations() : allSituations;

    if (uiState.error) {
      return `<div class="settings-inline-error">${escapeHtml(uiState.error)}</div>`;
    }

    if (uiState.loading && !situations.length) {
      return renderIssuesTable({
        gridTemplate: GRILLE_DES_SITUATIONS,
        headHtml: getSituationsTableHeadHtml(),
        emptyTitle: "Chargement des situations…",
        emptyDescription: ""
      });
    }

    const tableHtml = renderIssuesTable({
      // **La coquille doit laisser sortir le menu du kebab.** Elle coupe son
      // débordement par défaut, et le menu d'une ligne s'ouvre vers le bas :
      // il était tronqué net. L'écran des vues porte déjà cette exception, à
      // la même classe près.
      className: "issues-table project-situations-table",
      gridTemplate: GRILLE_DES_SITUATIONS,
      headHtml: getSituationsTableHeadHtml(),
      rowsHtml: situations.map((situation) => renderSituationTitleCell(situation)).join(""),
      emptyTitle: "Aucune situation",
      emptyDescription: "Aucune situation n’est disponible pour ce projet."
    });
    const paginationHtml = renderPaginationControls(pagination, { entity: "situations" });
    return `${tableHtml}${paginationHtml}`;
  }

  return {
    getSituationsTableHeadHtml,
    renderKebabDeLaSituation,
    renderSituationTitleCell,
    renderSituationsTable
  };
}
