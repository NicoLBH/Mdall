/**
 * Les propositions, dans un tableau — d'un projet, ou de tous.
 *
 * ## Un seul tableau, deux écrans
 *
 * L'onglet d'un projet montrait une liste à lui : ses propres classes, son
 * propre filtre à deux onglets, son propre dessin de ligne. L'écran qui
 * traverse les projets montrait un tableau. Les deux disaient la même chose de
 * deux façons, et la moindre retouche demandait deux calages — c'est
 * exactement ce qu'on cherche à ne plus faire (règle 10).
 *
 * Une seule chose les sépare, et elle se donne en paramètre : la **colonne du
 * projet**, qui n'a de sens que là où l'on en traverse plusieurs.
 *
 * ## Ce qu'une ligne montre
 *
 * Son **état**, son titre, son numéro, qui l'a ouverte et quand, ce qu'elle
 * contient. Les quatre premiers se lisent en parcourant ; le nombre de
 * documents répond à la première question qu'on se pose devant une proposition
 * — y a-t-il quelque chose dedans.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne décide pas de ce qu'on regarde. La requête est appliquée par
 * `champs-des-propositions.js`, l'ordre par `tri-des-sujets.js`, et les
 * commandes de l'en-tête — filtre d'état, tri, menus — lui arrivent **toutes
 * dessinées**, comme au tableau des sujets. Un tableau qui trierait ou
 * filtrerait de son côté et un écran qui compte sur son propre état finiraient
 * par ne plus montrer la même première ligne (règle 4).
 *
 * ## Ne pas savoir n'est pas « rien »
 *
 * `propositions` vaut `null` tant que la lecture n'a pas abouti. Rendre un
 * tableau vide ferait croire qu'il n'y en a aucune, alors qu'on n'a pas su
 * regarder (règle 5) — et l'on irait chercher la panne dans les projets.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderDataTableHead } from "../ui/data-table-shell.js";
import { renderIssuesTable } from "../ui/issues-table.js";
import { paginateItems, renderPaginationControls } from "../ui/pagination.js";
import { etatDeLaProposition, renderIconeDetat } from "../ui/etats-des-lignes.js";
import { trierLesSujets } from "../../services/tri-des-sujets.js";
import { propositionsFiltrees } from "../../services/champs-des-propositions.js";

/**
 * L'état d'une proposition vit avec celui d'un sujet, dans un seul fichier
 * (`ui/etats-des-lignes.js`). Il continue de se lire d'ici, où il est né et où
 * les appels le nomment.
 */
export { etatDeLaProposition };

/**
 * Les colonnes, écrites une fois pour l'en-tête et pour les lignes (règle 4).
 *
 * Celles du tableau des sujets, plus le projet là où l'écran en traverse
 * plusieurs : deux propositions du même nom sur deux projets sont deux lignes
 * qu'on ne distingue plus sans dire d'où elles viennent.
 */
const GRILLE_TRANSVERSALE = "minmax(0, 1fr) 84px 200px";
const GRILLE_DUN_PROJET = "minmax(0, 1fr) 84px";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le jour, tel qu'on l'écrit partout dans les propositions. */
function leJour(valeur) {
  const dit = texte(valeur);
  if (!dit) return "";
  const date = new Date(dit);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Le tableau entier.
 *
 * @param {object} options
 * @param {object[]|null} options.propositions `null` tant qu'on n'a pas lu
 * @param {object} [options.nomsDesProjets] les projets qu'on sait nommer
 * @param {string} [options.requete] ce qui est écrit dans la barre
 * @param {object[]} [options.champs] ceux de `champsDesPropositions`
 * @param {string|string[]} [options.moi] qui regarde
 * @param {object} [options.auteurs] les gens qu'on sait nommer, par identifiant
 *   de compte — pour dire qui a ouvert la proposition plutôt que « quelqu'un »
 * @param {boolean} [options.avecLeProjet] la colonne du projet
 * @param {boolean} [options.surPlace] le titre ouvre la proposition **ici**,
 *   sans changer d'adresse : c'est ce que fait l'onglet d'un projet, qui montre
 *   la revue à la place de la liste. Ailleurs, le titre est un lien.
 * @param {string} [options.statutHtml] le filtre ouvertes/closes, tout dessiné
 * @param {string} [options.triHtml] le bouton qui range, tout dessiné
 * @param {string} [options.filtresHtml] les menus de l'en-tête
 * @param {string} [options.tri] l'ordre demandé
 * @param {object|null} [options.pagination]
 */
export function renderTableauDesPropositionsHtml({
  propositions = null, nomsDesProjets = {}, requete = "", champs = [], moi = "",
  auteurs = {}, avecLeProjet = true, surPlace = false,
  statutHtml = "", triHtml = "", filtresHtml = "",
  tri = "",
  pagination = null
} = {}) {
  const noms = nomsDesProjets && typeof nomsDesProjets === "object" ? nomsDesProjets : {};
  const lues = Array.isArray(propositions) ? propositions : null;

  const { propositions: retenues } = lues
    ? propositionsFiltrees({ propositions: lues, requete, champs, moi, nomsDesProjets: noms })
    : { propositions: [] };

  // **Le tableau reçoit la liste et la range**, mais ne choisit pas l'ordre :
  // c'est l'écran qui le tient, et le bouton de tri qu'il dessine dit lequel.
  const rangees = trierLesSujets(retenues, tri);
  const combien = rangees.length;
  const grille = avecLeProjet ? GRILLE_TRANSVERSALE : GRILLE_DUN_PROJET;

  const headHtml = renderDataTableHead({
    columns: [
      {
        className: "cell cell-theme",
        // **Le filtre d'abord, à gauche**, puis le compte, puis les menus :
        // c'est l'ordre de l'en-tête du tableau des sujets, et les deux écrans
        // se lisent sans réapprendre où regarder.
        html: `<span class="situations-sujets-tete">
          ${statutHtml}
          <span class="situations-sujets-tete__compte">${escapeHtml(lues
            // **Le compte est celui de tout ce que la requête retient**, et non
            // celui de la page : « 25 propositions » au-dessus d'une liste qui
            // en retient mille deux cents ferait croire que la recherche a tout
            // écarté.
            ? `${combien} proposition${combien > 1 ? "s" : ""}`
            : "Propositions")}</span>
          ${filtresHtml}
        </span>`
      },
      // La colonne des documents n'a pas d'intitulé : l'icône le dit sur chaque
      // ligne, et un mot au-dessus de quatre-vingts pixels tiendrait mal.
      { className: "cell cell-messages-head", html: "" },
      ...(avecLeProjet
        ? [{
          className: "cell",
          // Le tri est dans la dernière colonne de la tête, comme dans l'onglet
          // des sujets : c'est là qu'on va le chercher.
          html: `<span class="cell-assignees-head"><span>Projet</span>${triHtml}</span>`
        }]
        : [{ className: "cell cell-messages-head", html: triHtml }])
    ]
  });

  if (!lues) {
    return renderIssuesTable({
      gridTemplate: grille,
      headHtml,
      state: "loading",
      loadingTitle: "Lecture des propositions…",
      loadingDescription: "On ne sait pas encore ce que vos projets contiennent."
    });
  }

  const dite = texte(requete);
  const page = pagination ? paginateItems(rangees, pagination) : { items: rangees, totalPages: 1 };
  const decor = { noms, auteurs: auteurs && typeof auteurs === "object" ? auteurs : {}, avecLeProjet, surPlace };

  const tableau = renderIssuesTable({
    gridTemplate: grille,
    headHtml,
    rowsHtml: page.items.map((proposition) => renderLigneHtml(proposition, decor)).join(""),
    emptyTitle: dite ? "Aucune proposition ne répond à cette recherche" : "Aucune proposition",
    emptyDescription: dite
      ? "Élargissez la requête : elle porte sur le titre, le projet, l'auteur et l'état."
      : "Une proposition naît d'un dépôt de documents, dans l'onglet Propositions d'un projet."
  });

  // Les commandes ne s'affichent que s'il y a plus d'une page : le composant
  // partagé le sait, et rend `""` sinon.
  return pagination
    ? `${tableau}${renderPaginationControls(page, { entity: "propositions-transversales" })}`
    : tableau;
}

/**
 * Une ligne.
 *
 * **Le titre ouvre la proposition là où elle se tranche.** Sur l'écran qui
 * traverse les projets, c'est un lien vers son projet : elle se lit, se discute
 * et se tranche là où son corpus est, et un détail monté ailleurs montrerait la
 * moitié de ce qu'elle est — la moitié qui manque étant celle où l'on décide.
 * L'adresse porte son identifiant, ce qui la rend copiable et partageable.
 *
 * Dans l'onglet d'un projet, la revue **remplace la liste** sans changer
 * d'adresse : le titre y est un bouton, et c'est l'écran qui sait quoi en
 * faire.
 *
 * Un projet qu'on ne sait pas nommer montre son identifiant plutôt qu'une
 * cellule vide, qui ferait croire que la proposition n'appartient à aucun
 * projet — ce qui n'arrive pas (règle 5).
 */
function renderLigneHtml(proposition, decor = {}) {
  const etat = etatDeLaProposition(proposition);
  const projet = texte(proposition?.project_id);
  const id = texte(proposition?.id);
  const numero = Number(proposition?.number);
  const documents = Number(proposition?.documentCount) || 0;
  const titre = texte(proposition?.title) || "Proposition";

  // **Qui l'a ouverte, nommé.** « un collaborateur » était la seule chose qu'on
  // savait dire : on ne pouvait pas chercher qui, ni reconnaître les siennes
  // autrement qu'en les ouvrant.
  const auteur = decor.auteurs?.[texte(proposition?.created_by)] ?? "";
  const ouverte = leJour(proposition?.created_at);
  const fusionnee = leJour(proposition?.merged_at);

  const lien = decor.surPlace
    ? `<button type="button" class="row-title-trigger theme-text theme-text--pb"
        data-proposition-open="${escapeHtml(id)}">${escapeHtml(titre)}</button>`
    : `<a class="row-title-trigger theme-text theme-text--pb"
        href="#project/${escapeHtml(projet)}/propositions/${escapeHtml(id)}"
        >${escapeHtml(titre)}</a>`;

  return `
    <div class="issue-row issue-row--pb">
      <div class="cell cell-theme lvl0">
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status">${renderIconeDetat(etat)}</span>
          <span class="issue-row-title-grid__title issue-row-subject-title-line">${lien}</span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">
            ${Number.isFinite(numero) && numero > 0 ? `<span>#${escapeHtml(String(numero))}</span>` : ""}
            ${ouverte ? `<span>ouverte le ${escapeHtml(ouverte)}</span>` : ""}
            ${auteur ? `<span class="issue-row-author-name">${escapeHtml(auteur)}</span>` : ""}
            ${fusionnee ? `<span>fusionnée le ${escapeHtml(fusionnee)}</span>` : ""}
          </span>
        </span>
      </div>
      <div class="cell cell-messages-value">${documents
        ? `<span class="issue-row-messages-count" aria-label="${
            escapeHtml(`${documents} document(s)`)}">
            ${svgIcon("file")}<span>${escapeHtml(String(documents))}</span>
          </span>`
        : '<span class="issue-row-messages-empty" aria-hidden="true"></span>'}</div>
      ${decor.avecLeProjet
        ? `<div class="cell mono-small">${escapeHtml(decor.noms?.[projet] || projet || "—")}</div>`
        : '<div class="cell"></div>'}
    </div>
  `;
}
