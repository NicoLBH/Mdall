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
import { PROPOSITION } from "../../services/proposition-state.js";

/** Les colonnes, écrites une fois pour l'en-tête et pour les lignes (règle 4). */
const GRILLE = "minmax(0, 1fr) 84px 200px";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qu'on dit de l'état d'une proposition.
 *
 * **Refusée est une demande close, pas une alerte.** Quelqu'un a décidé ; il
 * n'y a rien à surveiller. C'est le même signe que dans l'onglet d'un projet.
 */
export function etatDeLaProposition(proposition = null) {
  const statut = texte(proposition?.status) || PROPOSITION.OPEN;

  if (statut === PROPOSITION.MERGED) {
    return { mot: "Fusionnée", ton: "done", icone: "git-compare" };
  }
  if (statut === PROPOSITION.CLOSED) {
    return { mot: "Refusée", ton: "muted", icone: "git-pull-request-closed" };
  }
  return { mot: "Ouverte", ton: "success", icone: "git-pull-request" };
}

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
 * Le tableau entier.
 *
 * @param {object} options
 * @param {object[]|null} options.propositions `null` tant qu'on n'a pas lu
 * @param {object} options.nomsDesProjets les projets qu'on sait nommer
 * @param {string} options.cherche ce qui est écrit dans la barre
 */
export function renderTableauDesPropositionsHtml({
  propositions = null, nomsDesProjets = {}, cherche = ""
} = {}) {
  const noms = nomsDesProjets && typeof nomsDesProjets === "object" ? nomsDesProjets : {};
  const lues = Array.isArray(propositions) ? propositions : null;
  const retenues = lues ? propositionsRetenues({ propositions: lues, cherche, nomsDesProjets: noms }) : [];
  const combien = retenues.length;

  const headHtml = renderDataTableHead({
    columns: [
      {
        className: "cell cell-theme",
        label: lues ? `${combien} proposition${combien > 1 ? "s" : ""}` : "Propositions"
      },
      // La colonne des documents n'a pas d'intitulé : l'icône le dit sur chaque
      // ligne, et un mot au-dessus de quatre-vingts pixels tiendrait mal.
      { className: "cell cell-messages-head", html: "" },
      { className: "cell", label: "Projet" }
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

  return renderIssuesTable({
    gridTemplate: GRILLE,
    headHtml,
    rowsHtml: retenues.map((proposition) => renderLigneHtml(proposition, noms)).join(""),
    emptyTitle: dite ? "Aucune proposition ne répond à cette recherche" : "Aucune proposition",
    emptyDescription: dite
      ? "Élargissez la recherche : elle porte sur le titre et sur le nom du projet."
      : "Une proposition naît d'un dépôt de documents, dans l'onglet Propositions d'un projet."
  });
}

/**
 * Une ligne.
 *
 * **Elle mène à l'onglet du projet**, et non à un écran de proposition
 * transversal : la proposition se lit, se discute et se tranche là où son
 * corpus est. Un détail monté ici montrerait la moitié de ce qu'elle est.
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
          <span class="issue-row-title-grid__status" aria-hidden="true">${
            svgIcon(etat.icone, { className: "octicon" })}</span>
          <span class="issue-row-title-grid__title">
            <a class="row-title-trigger theme-text theme-text--pb"
              href="#project/${escapeHtml(projet)}/propositions"
              data-proposition-transversale="${escapeHtml(texte(proposition?.id))}"
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
