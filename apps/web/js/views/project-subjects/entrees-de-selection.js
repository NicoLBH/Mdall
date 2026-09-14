/**
 * Les entrées d'un menu de sélection : **une seule façon de les dessiner**.
 *
 * ## Pourquoi ce module existe
 *
 * La colonne de droite d'un sujet porte quatre menus — assignés, labels,
 * objectifs, situations — et tous les quatre ont la même forme : une case à
 * cocher, une décoration qui dit de quoi il s'agit (un avatar, une pastille de
 * couleur, un jalon, un tableau), un titre, et une ligne de dessous en gris.
 * C'est cette forme-là qu'on reconnaît, et c'est elle qu'on cherche des yeux.
 *
 * Les filtres de l'en-tête du tableau posaient les mêmes questions — quels
 * labels, quels assignés, quels objectifs — avec une liste nue : un titre, une
 * coche à droite, et rien pour distinguer une personne d'un label. Deux menus
 * qui posent la même question et ne se ressemblent pas obligent à réapprendre
 * le second, et divergent au premier réglage (`docs/fondamentaux.md`, règle 10).
 *
 * La forme vit donc ici, et les deux écrans l'appellent. Ce qui les sépare —
 * **d'où vient la sélection, et ce que le clic déclenche** — leur reste : le
 * détail coche ce que le sujet porte et écrit dans la base ; le filtre coche ce
 * que la requête dit et réécrit la requête.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne lit ni la base, ni le store, et ne cherche rien : on lui donne des
 * valeurs déjà filtrées et déjà décorées, il rend des entrées prêtes pour
 * `select-menu.js`. Il ne décide pas non plus de ce qui est proposé — une
 * valeur qu'on n'a pas le droit d'écrire ne doit pas lui parvenir.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * La coche et la décoration, côte à côte, en tête d'entrée.
 *
 * **La case d'abord, la décoration ensuite.** L'œil descend la colonne des
 * cases pour voir ce qui est pris ; une décoration qui la précéderait
 * déplacerait la case d'une ligne à l'autre selon la largeur de l'avatar.
 */
export function iconsetDeSelection({ choisie = false, decorHtml = "", classe = "" } = {}) {
  return `
    <span class="select-menu__iconset ${escapeHtml(classe)}" aria-hidden="true">
      <span class="select-menu__checkbox ${choisie ? "is-checked" : ""}">${
        svgIcon("check", { className: "octicon octicon-check" })}</span>
      ${decorHtml}
    </span>
  `;
}

/** La pastille de couleur d'un label. */
export function pastilleDeLabel(couleur = "") {
  return `<span class="select-menu__label-dot"
    style="--select-menu-label-dot:${escapeHtml(texte(couleur) || "#8b949e")};"></span>`;
}

/** Le jalon d'un objectif. */
export function jalonDObjectif() {
  return `<span class="select-menu__objective-milestone">${
    svgIcon("milestone", { className: "octicon octicon-milestone" })}</span>`;
}

/** Le tableau d'une situation — plein quand elle est fermée. */
export function tableDeSituation({ fermee = false } = {}) {
  return `<span class="select-menu__situation-icon">${
    svgIcon(fermee ? "table-check" : "table", { className: "ui-icon octicon octicon-table" })}</span>`;
}

/**
 * Une entrée, prête pour `renderSelectMenuSection`.
 *
 * @param {object} options
 * @param {string} options.cle ce qui identifie l'entrée dans le menu
 * @param {string} options.titre ce qu'on lit
 * @param {string} [options.sousTitre] la ligne de dessous — un rôle, une date,
 *   une description. Elle n'est pas décorative : c'est elle qui distingue deux
 *   homonymes, et un chantier en a toujours.
 * @param {boolean} [options.choisie]
 * @param {boolean} [options.active] celle que le clavier désigne
 * @param {string} [options.decorHtml] ce qui dit de quoi il s'agit
 * @param {string} [options.attribut] le nom de l'attribut que le clic cherche,
 *   sans son `data-`
 * @param {string} [options.valeur] ce que cet attribut porte — un identifiant
 *   pour le détail d'un sujet, une requête entière pour un filtre
 */
export function entreeDeSelection({
  cle = "", titre = "", sousTitre = "", choisie = false, active = false,
  decorHtml = "", attribut = "", valeur = "", classe = ""
} = {}) {
  return {
    key: texte(cle),
    title: texte(titre),
    isSelected: choisie === true,
    isActive: active === true,
    iconHtml: iconsetDeSelection({ choisie, decorHtml, classe }),
    metaHtml: sousTitre ? escapeHtml(texte(sousTitre)) : "",
    dataAttrs: attribut ? { [attribut]: valeur } : {}
  };
}

/**
 * L'ordre des groupes du trombinoscope d'un chantier.
 *
 * **Ce n'est pas l'alphabet.** On cherche d'abord qui décide, puis qui conçoit,
 * puis qui exécute : c'est l'ordre dans lequel on se pose la question, et c'est
 * celui des comptes rendus.
 */
export const ORDRE_DES_GROUPES = ["Maîtrise d'ouvrage", "Maîtrise d'œuvre", "Entreprises", "Divers"];

/**
 * Les entrées rangées par groupe, dans l'ordre du chantier.
 *
 * Un groupe qu'on ne connaît pas passe après les autres, par ordre
 * alphabétique : l'inventer une place ferait dépendre l'affichage de l'ordre
 * d'arrivée des lignes.
 */
export function sectionsParGroupe(entrees = [], { ordre = ORDRE_DES_GROUPES } = {}) {
  const par = new Map();

  for (const entree of Array.isArray(entrees) ? entrees : []) {
    const groupe = texte(entree?.groupLabel) || "Divers";
    if (!par.has(groupe)) par.set(groupe, []);
    par.get(groupe).push(entree);
  }

  const rang = (nom) => {
    const trouve = ordre.indexOf(nom);
    return trouve >= 0 ? trouve : Number.MAX_SAFE_INTEGER;
  };

  return [...par.entries()]
    .sort(([gauche], [droite]) => (rang(gauche) !== rang(droite)
      ? rang(gauche) - rang(droite)
      : gauche.localeCompare(droite, "fr")))
    .map(([title, items]) => ({ title, items }));
}
