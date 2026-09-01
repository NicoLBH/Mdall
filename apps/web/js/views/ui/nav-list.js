/**
 * Une liste de navigation : `nav > ul > li > a`, comme il se doit.
 *
 * Le rail était fait de `<button>` posés les uns sous les autres. C'était une
 * suite d'actions, pas une liste de destinations — et cette confusion se payait
 * à l'affichage : un bouton porte à la fois le repère de sélection et son propre
 * fond, si bien qu'on ne pouvait pas arrondir l'un sans coller à l'autre, ni
 * réduire le fond à l'icône sans déplacer le repère.
 *
 * En séparant les deux, chacun retrouve son rôle :
 *
 *   li      porte le **repère** — le trait bleu, à gauche, hors du contenu ;
 *   contenu porte le **fond** — arrondi, et qui se réduit à l'icône au repli.
 *
 * C'est aussi ce que le lecteur d'écran attend : une navigation annonce le
 * nombre d'entrées et la position courante, ce qu'une pile de boutons ne dit
 * pas.
 */

import { escapeHtml } from "../../utils/escape-html.js";

/**
 * Une entrée.
 *
 * `as: "a"` quand l'entrée mène quelque part et mérite d'être ouverte dans un
 * onglet ; `"button"` quand elle ne fait que changer ce qu'on regarde. Le
 * composant ne tranche pas à la place de l'appelant.
 */
export function renderNavListItem({
  label = "",
  iconHtml = "",
  trailing = "",
  isActive = false,
  href = "",
  as = "button",
  className = "",
  dataAttributes = {}
} = {}) {
  const balise = as === "a" ? "a" : "button";
  const attrs = [];

  if (balise === "a") attrs.push(`href="${escapeHtml(href || "#")}"`);
  else attrs.push(`type="button"`);

  for (const [cle, valeur] of Object.entries(dataAttributes || {})) {
    if (!String(cle).toLowerCase().startsWith("data-")) continue;
    attrs.push(`${escapeHtml(cle)}="${escapeHtml(valeur)}"`);
  }

  // `aria-current` plutôt qu'une classe seule : c'est ce qui dit « vous êtes
  // ici » à qui n'a pas les couleurs sous les yeux.
  attrs.push(`aria-current="${isActive ? "page" : "false"}"`);

  return `
    <li class="nav-list__item ${className}" data-active="${isActive ? "true" : "false"}">
      <${balise} class="nav-list__content" ${attrs.join(" ")}>
        ${iconHtml ? `<span class="nav-list__visual">${iconHtml}</span>` : ""}
        <span class="nav-list__label">${escapeHtml(label)}</span>
        ${trailing ? `<span class="nav-list__trailing">${escapeHtml(trailing)}</span>` : ""}
      </${balise}>
    </li>
  `;
}

/** Un groupe d'entrées, avec son intitulé s'il en a un. */
export function renderNavListGroup({ label = "", items = [] } = {}) {
  return `
    ${label ? `<h3 class="nav-list__group-label">${escapeHtml(label)}</h3>` : ""}
    <ul class="nav-list__list">${items.join("")}</ul>
  `;
}

/** Le filet entre deux groupes. */
export function renderNavListDivider() {
  return `<div class="nav-list__divider" role="presentation"></div>`;
}

/**
 * La navigation entière.
 *
 * `aria-label` est obligatoire en pratique : une page qui compte deux
 * navigations sans les nommer laisse le lecteur d'écran annoncer deux fois
 * « navigation », ce qui n'aide personne.
 */
export function renderNavList({ label = "Navigation", html = "", className = "" } = {}) {
  return `
    <nav class="nav-list ${className}" aria-label="${escapeHtml(label)}">
      ${html}
    </nav>
  `;
}
