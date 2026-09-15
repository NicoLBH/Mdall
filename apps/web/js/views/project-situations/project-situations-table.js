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
import { couleurDeLaSituation, iconeDeLaSituation, seDitParUneRequete } from "../../services/situation-comme-une-vue.js";

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
  sujets = null, nomsDesProjets = {}, requete = ""
} = {}) {
  const dite = String(requete ?? "").trim();
  const noms = nomsDesProjets && typeof nomsDesProjets === "object" ? nomsDesProjets : {};
  const lus = Array.isArray(sujets) ? sujets : null;
  const combien = lus ? lus.length : 0;

  const headHtml = renderDataTableHead({
    columns: [
      { className: "cell cell-theme", label: lus ? `${combien} sujet${combien > 1 ? "s" : ""}` : "Sujets" },
      { className: "cell", label: "Chantier" }
    ]
  });

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
    rowsHtml: lus.map((sujet) => renderSujetRetenuHtml(sujet, noms)).join(""),
    emptyTitle: dite ? "Aucun sujet ne répond à cette recherche" : "Aucun sujet retenu",
    emptyDescription: dite
      ? "Élargissez la requête : une situation qui ne retient rien ne montrera rien."
      : "Écrivez une requête : c'est elle qui dit ce que la situation retient."
  });
}

/** La largeur des deux colonnes, écrite une fois pour l'en-tête et les lignes. */
const TABLEAU_DES_SUJETS_RETENUS = "minmax(360px, 1.6fr) 200px";

/**
 * Une ligne de ce tableau.
 *
 * **Le chantier est nommé, ou son identifiant est montré tel quel.** Rendre une
 * cellule vide quand on ne sait pas nommer le projet ferait croire que le sujet
 * n'appartient à aucun chantier, ce qui n'arrive pas (règle 5).
 */
function renderSujetRetenuHtml(sujet, noms) {
  const ouvert = String(sujet?.status || "open") !== "closed";
  const chantier = String(sujet?.project_id ?? sujet?.projectId ?? "").trim();

  return `
    <div class="issue-row">
      <div class="cell cell-theme lvl0">
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status" aria-hidden="true">${
            svgIcon(ouvert ? "issue-opened" : "check-circle", { className: "octicon" })}</span>
          <span class="issue-row-title-grid__title">${escapeHtml(String(sujet?.title || "Sujet"))}</span>
          <span class="issue-row-title-grid__meta">${
            renderStatusBadge({
              label: ouvert ? "Ouvert" : "Fermé",
              tone: ouvert ? "success" : "muted"
            })}</span>
        </span>
      </div>
      <div class="cell mono-small">${escapeHtml(noms[chantier] || chantier || "—")}</div>
    </div>
  `;
}

export function createProjectSituationsTable({
  store,
  uiState,
  getSituations,
  getPaginatedSituations,
  getSituationsPaginationState,
  normalizeSituationMode,
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
   * « Manuelle » ou « Automatique » — et seulement quand ça veut encore dire
   * quelque chose.
   *
   * **Une situation qui porte une requête ne se lit pas par son mode.** Elle
   * retient ce que sa recherche retient, et le mode reste en base à la valeur
   * qu'il avait à la création : une situation écrite au formulaire s'affichait
   * « Manuelle » alors qu'elle ne tient aucune liste à la main. Deux façons de
   * dire ce qu'une situation retient, dont l'une est fausse (règle 4).
   *
   * C'est la même règle que sur le panneau de détail, et c'est pour cela
   * qu'elle est écrite une fois : `seDitParUneRequete`. L'étape 4 retirera le
   * mode et cette pastille avec lui.
   */
  function renderModePill(situation) {
    if (seDitParUneRequete(situation)) return "";

    const automatique = normalizeSituationMode(situation?.mode) === "automatic";
    return renderStatusBadge({
      label: automatique ? "Automatique" : "Manuelle",
      tone: automatique ? "accent" : "default"
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
        { className: "cell", label: "Nb sujets" }
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
                ${renderModePill(situation)}
                ${renderAvancementPill(situation)}
                ${renderPerimetrePill(situation)}
                ${renderAppartenancePill(situation)}
              </span>
            </span>
            <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${updatedLabel}</span>
          </span>
        </div>
        <div class="cell mono">${escapeHtml(renderSituationCount(situation.id))}</div>
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
        gridTemplate: "minmax(420px, 1.6fr) 90px",
        headHtml: getSituationsTableHeadHtml(),
        emptyTitle: "Chargement des situations…",
        emptyDescription: ""
      });
    }

    const tableHtml = renderIssuesTable({
      gridTemplate: "minmax(420px, 1.6fr) 90px",
      headHtml: getSituationsTableHeadHtml(),
      rowsHtml: situations.map((situation) => renderSituationTitleCell(situation)).join(""),
      emptyTitle: "Aucune situation",
      emptyDescription: "Aucune situation n’est disponible pour ce projet."
    });
    const paginationHtml = renderPaginationControls(pagination, { entity: "situations" });
    return `${tableHtml}${paginationHtml}`;
  }

  return {
    renderModePill,
    getSituationsTableHeadHtml,
    renderSituationTitleCell,
    renderSituationsTable
  };
}
