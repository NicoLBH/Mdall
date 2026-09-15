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

  function renderModePill(mode) {
    return renderStatusBadge({
      label: normalizeSituationMode(mode) === "automatic" ? "Automatique" : "Manuelle",
      tone: normalizeSituationMode(mode) === "automatic" ? "accent" : "default"
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
                ${renderModePill(situation.mode)}
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
