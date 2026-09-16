/**
 * Les propositions de tous mes projets, dans un tableau.
 *
 * ## Ce qu'il montre, et pourquoi
 *
 * Une proposition se reconnaît à quatre choses : **son état**, son numéro, son
 * titre, et le projet d'où elle vient. Les trois premières sont celles de
 * l'onglet d'un projet ; la quatrième est ce que cet écran-ci a de plus, et
 * c'est la seule raison de le regarder — deux propositions du même nom sur deux
 * projets sont deux lignes qu'on ne distingue plus sans dire d'où elles
 * viennent.
 *
 * Le nombre de documents accompagne chaque ligne. C'est la première question
 * qu'on se pose devant une proposition : y a-t-il quelque chose dedans.
 *
 * ## Ne pas savoir n'est pas « rien »
 *
 * `propositions` vaut `null` tant que la lecture n'a pas abouti. Rendre un
 * tableau vide ferait croire qu'il n'y en a aucune, alors qu'on n'a pas su
 * regarder (règle 5) — et l'on irait chercher la panne dans les projets.
 *
 * ## Rien n'est dessiné de neuf
 *
 * La coquille de tableau des autres écrans, ses cellules, sa pastille d'état et
 * les icônes des propositions d'un projet. Un second dessin aurait divergé au
 * premier réglage (règle 10).
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderStatusBadge } from "../ui/status-badges.js";
import { renderDataTableHead } from "../ui/data-table-shell.js";
import { renderIssuesTable } from "../ui/issues-table.js";
import { renderTableHeadFilterToggle } from "../ui/table-head-filter-toggle.js";
import { renderBoutonDeTri } from "../ui/tete-de-tableau.js";
import { paginateItems, renderPaginationControls } from "../ui/pagination.js";
import { etatDeLaProposition, renderIconeDetat } from "../ui/etats-des-lignes.js";
import {
  TRI, motDuTri, normaliserLeTri, trierLesSujets, triSuivant
} from "../../services/tri-des-sujets.js";
import { PROPOSITION } from "../../services/proposition-state.js";

/**
 * L'état d'une proposition vit avec celui d'un sujet, dans un seul fichier
 * (`ui/etats-des-lignes.js`). Il continue de se lire d'ici, où il est né et où
 * les appels le nomment.
 */
export { etatDeLaProposition };

/** Les attributs que la tête porte, et que l'écran écoute. Un seul endroit. */
export const GESTES_DES_PROPOSITIONS = {
  etat: "propositions-toutes-etat",
  tri: "propositions-toutes-tri"
};

/** Les colonnes, écrites une fois pour l'en-tête et pour les lignes (règle 4). */
const GRILLE = "minmax(0, 1fr) 84px 200px";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les propositions que cette recherche retient.
 *
 * **Le texte cherche dans le titre et dans le nom du projet.** Pas dans la
 * description : une recherche qui remonte une ligne dont le titre ne contient
 * pas le mot cherché se lit comme une erreur, et l'on ne voit pas où le mot se
 * cache. Le projet, lui, est à l'écran sur la ligne — « toutes celles de
 * Chamonix » est la question qu'on pose ici.
 */
export function propositionsRetenues({ propositions = [], cherche = "", nomsDesProjets = {} } = {}) {
  const mots = repli(cherche).split(/\s+/).filter(Boolean);
  if (!mots.length) return Array.isArray(propositions) ? propositions : [];

  return (Array.isArray(propositions) ? propositions : []).filter((proposition) => {
    const ou = nomsDesProjets?.[texte(proposition?.project_id)] ?? "";
    const dit = repli(`${texte(proposition?.title)} ${ou}`);
    return mots.every((mot) => dit.includes(mot));
  });
}

/** Sans accent ni casse : on tape rarement les accents dans une recherche. */
function repli(valeur) {
  return texte(valeur).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Ouverte, ou close ?
 *
 * **Fusionnée et refusée sont toutes deux closes**, et c'est la coupe de
 * l'onglet d'un projet : la question qu'on se pose devant la liste est « qu'est
 * -ce qui attend encore une décision ? ». Distinguer ici les deux façons de ne
 * plus attendre ferait trois onglets là où il y a deux questions — et l'état
 * exact reste écrit sur chaque ligne.
 */
function ouverte(proposition) {
  return etatDeLaProposition(proposition).cle === PROPOSITION.OPEN;
}

/**
 * Le tableau entier.
 *
 * @param {object} options
 * @param {object[]|null} options.propositions `null` tant qu'on n'a pas lu
 * @param {object} options.nomsDesProjets les projets qu'on sait nommer
 * @param {string} options.cherche ce qui est écrit dans la barre
 */
export function renderTableauDesPropositionsHtml({
  propositions = null, nomsDesProjets = {}, cherche = "",
  /**
   * Ouvertes, closes, ou les deux.
   *
   * **`""` n'est pas « ouvertes ».** C'est « on n'a rien restreint », et la
   * liste les montre toutes. Allumer « Ouvertes » par défaut dirait que la
   * liste est coupée alors qu'elle ne l'est pas, et l'on chercherait où sont
   * passées les autres (règle 5).
   */
  etat = "",
  /**
   * L'ordre. Celui des sujets, et le même bouton — une proposition porte les
   * mêmes dates, et « qu'est-ce qui a bougé ? » est la même question.
   */
  tri = "",
  /**
   * La page qu'on regarde, et sa taille.
   *
   * **Mille deux cents propositions ne tiennent pas sur une page.** Les rendre
   * toutes fait un document que le navigateur met une seconde à poser, et qu'on
   * ne parcourt pas — on cherche, on ne feuillette pas. `null` rend tout.
   */
  pagination = null
} = {}) {
  const noms = nomsDesProjets && typeof nomsDesProjets === "object" ? nomsDesProjets : {};
  const lues = Array.isArray(propositions) ? propositions : null;
  const cherchees = lues ? propositionsRetenues({ propositions: lues, cherche, nomsDesProjets: noms }) : [];

  // **Les comptes se prennent avant la coupe**, sur ce que la recherche retient.
  // Les prendre après rendrait « Closes : 0 » chaque fois qu'on regarde les
  // ouvertes, et le filtre dirait que l'autre moitié n'existe pas.
  const comptes = {
    open: cherchees.filter(ouverte).length,
    closed: cherchees.filter((proposition) => !ouverte(proposition)).length
  };

  const demande = texte(etat).toLowerCase();
  const retenues = demande === PROPOSITION.OPEN
    ? cherchees.filter(ouverte)
    : (demande === "closed" ? cherchees.filter((proposition) => !ouverte(proposition)) : cherchees);
  const rangees = trierLesSujets(retenues, tri);
  const combien = rangees.length;
  const range = normaliserLeTri(tri);

  const headHtml = renderDataTableHead({
    columns: [
      {
        className: "cell cell-theme",
        // **Le filtre d'abord, à gauche**, puis le compte : c'est l'ordre de
        // l'en-tête du tableau des sujets d'un projet, et les deux écrans se
        // lisent sans réapprendre où regarder.
        //
        // **Tant qu'on n'a pas lu, il n'y a pas de filtre.** « Ouvertes 0 »
        // pendant la lecture dit qu'il n'y en a aucune, alors qu'on n'a pas
        // encore regardé (règle 5).
        html: `<span class="situations-sujets-tete">
          ${lues ? renderTableHeadFilterToggle({
            activeValue: demande,
            items: [
              { label: "Ouvertes", value: PROPOSITION.OPEN, count: comptes.open, dataAttr: GESTES_DES_PROPOSITIONS.etat },
              { label: "Closes", value: "closed", count: comptes.closed, dataAttr: GESTES_DES_PROPOSITIONS.etat }
            ]
          }) : ""}
          <span class="situations-sujets-tete__compte">${escapeHtml(lues
            // **Le compte est celui de tout ce que la recherche retient**, et
            // non celui de la page : « 25 propositions » au-dessus d'une liste
            // qui en retient mille deux cents ferait croire que la recherche a
            // tout écarté.
            ? `${combien} proposition${combien > 1 ? "s" : ""}`
            : "Propositions")}</span>
        </span>`
      },
      // La colonne des documents n'a pas d'intitulé : l'icône le dit sur chaque
      // ligne, et un mot au-dessus de quatre-vingts pixels tiendrait mal.
      { className: "cell cell-messages-head", html: "" },
      {
        className: "cell",
        // Le tri est dans la dernière colonne de la tête, comme dans l'onglet
        // des sujets : c'est là qu'on va le chercher.
        html: `<span class="cell-assignees-head">
          <span>Projet</span>
          ${renderBoutonDeTri({
            attribut: GESTES_DES_PROPOSITIONS.tri,
            valeur: triSuivant(range),
            actif: range === TRI.DERNIERE_ACTIVITE,
            titre: motDuTri(range, "l'ordre d'arrivée")
          })}
        </span>`
      }
    ]
  });

  if (!lues) {
    return renderIssuesTable({
      gridTemplate: GRILLE,
      headHtml,
      state: "loading",
      loadingTitle: "Lecture des propositions…",
      loadingDescription: "On ne sait pas encore ce que vos projets contiennent."
    });
  }

  const dite = texte(cherche);
  const page = pagination ? paginateItems(rangees, pagination) : { items: rangees, totalPages: 1 };

  const tableau = renderIssuesTable({
    gridTemplate: GRILLE,
    headHtml,
    rowsHtml: page.items.map((proposition) => renderLigneHtml(proposition, noms)).join(""),
    emptyTitle: dite ? "Aucune proposition ne répond à cette recherche" : "Aucune proposition",
    emptyDescription: dite
      ? "Élargissez la recherche : elle porte sur le titre et sur le nom du projet."
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
 * **Elle ouvre la proposition, dans son projet.** Pas un écran de proposition
 * transversal : elle se lit, se discute et se tranche là où son corpus est, et
 * un détail monté ici montrerait la moitié de ce qu'elle est.
 *
 * L'adresse porte son identifiant — `#project/<projet>/propositions/<id>` —, ce
 * qui la rend copiable et partageable. Sans lui, la ligne menait à la liste de
 * l'onglet, et il fallait y retrouver à la main ce qu'on venait de désigner.
 *
 * Un projet qu'on ne sait pas nommer montre son identifiant plutôt qu'une
 * cellule vide, qui ferait croire que la proposition n'appartient à aucun
 * projet — ce qui n'arrive pas (règle 5).
 */
function renderLigneHtml(proposition, noms) {
  const etat = etatDeLaProposition(proposition);
  const projet = texte(proposition?.project_id);
  const numero = Number(proposition?.number);
  const documents = Number(proposition?.documentCount) || 0;

  return `
    <div class="issue-row issue-row--pb">
      <div class="cell cell-theme lvl0">
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status">${renderIconeDetat(etat)}</span>
          <span class="issue-row-title-grid__title">
            <a class="row-title-trigger theme-text theme-text--pb"
              href="#project/${escapeHtml(projet)}/propositions/${escapeHtml(texte(proposition?.id))}"
              >${escapeHtml(texte(proposition?.title) || "Proposition")}</a>
          </span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">
            ${renderStatusBadge({ label: etat.mot, tone: etat.ton })}
            ${Number.isFinite(numero) && numero > 0 ? `<span>#${escapeHtml(String(numero))}</span>` : ""}
          </span>
        </span>
      </div>
      <div class="cell cell-messages-value">${documents
        ? `<span class="issue-row-messages-count" aria-label="${
            escapeHtml(`${documents} document(s)`)}">
            ${svgIcon("file")}<span>${escapeHtml(String(documents))}</span>
          </span>`
        : '<span class="issue-row-messages-empty" aria-hidden="true"></span>'}</div>
      <div class="cell mono-small">${escapeHtml(noms[projet] || projet || "—")}</div>
    </div>
  `;
}
