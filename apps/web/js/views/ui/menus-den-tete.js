/**
 * Ouvrir et fermer les menus de filtre d'un en-tête de tableau.
 *
 * ## Pourquoi ce n'est pas écrit dans l'écran qui s'en sert
 *
 * `renderFiltreDenTeteHtml` dessine ces menus pour l'onglet Sujets d'un projet
 * et, depuis l'écran des situations, pour le tableau qu'on regarde en écrivant
 * une situation. Le dessin est partagé ; **l'ouverture ne l'était pas**, et
 * recopier les six lignes dans le second écran, c'est accepter qu'elles
 * diffèrent au premier réglage — un menu qui se referme ici et pas là, un
 * `aria-expanded` oublié d'un côté (règle 10).
 *
 * ## Ce qu'elles font, et ce qu'elles ne font pas
 *
 * Elles touchent au DOM et **ne redessinent rien**. C'est voulu : l'état ouvert
 * d'un menu est une classe, pas une donnée de l'écran. Le mettre dans l'état
 * obligerait à redessiner à chaque ouverture, et l'on perdrait le curseur du
 * champ de recherche qui vit dans le menu.
 *
 * ## Un seul ouvert à la fois
 *
 * Deux listes superposées se recouvrent, et l'on clique dans celle qu'on ne
 * regarde pas.
 */

/** La classe qui montre un menu — celle de `gh-menu`, partout dans l'application. */
export const MENU_OUVERT = "gh-menu--open";

/**
 * Le repère du bloc qui groupe ces menus.
 *
 * ## Pourquoi il est ici et pas dans l'écran qui le pose
 *
 * Les entrées d'un menu portent `data-sujets-lecture`, **comme les entrées du
 * rail** — et le rail, lui, change d'écran au clic. L'écran qui montre les deux
 * a donc besoin de les distinguer : sans ce repère, cliquer un label refermait
 * la situation qu'on était en train d'écrire.
 *
 * Il est écrit à deux endroits — le rendu le pose, l'écoute le cherche — et deux
 * écritures d'un même nom se renomment un jour d'un seul côté, en silence : le
 * bloc garderait son attribut, le clic ne le verrait plus, et l'on reviendrait
 * au défaut d'origine sans qu'aucune erreur ne soit levée (règle 10).
 */
export const BLOC_DES_FILTRES = "data-filtres-den-tete";

/** Ce nœud appartient-il à un bloc de menus de filtre ? */
export function dansUnBlocDeFiltres(noeud) {
  return Boolean(noeud?.closest?.(`[${BLOC_DES_FILTRES}]`));
}

export function basculerUnMenuDenTete(root, cle) {
  const id = String(cle || "").trim();
  if (!id) return;

  const bouton = root?.querySelector?.(`[data-sujets-menu="${id}"]`);
  const liste = root?.querySelector?.(`[data-sujets-menu-liste="${id}"]`);
  if (!bouton || !liste) return;

  const ouvert = liste.classList.contains(MENU_OUVERT);
  fermerLesMenusDenTete(root);
  if (ouvert) return;

  ouvrirUnMenuDenTete(root, id);
}

/**
 * Rouvrir un menu qu'un redessin vient de refermer.
 *
 * Taper dans le champ de recherche d'un menu redessine le panneau : la liste
 * repart fermée, et l'on se retrouve à taper dans un menu disparu. C'est le
 * même geste que l'ouverture, sans la bascule — sans quoi le rappeler après un
 * redessin refermerait ce qu'on veut rouvrir.
 */
export function ouvrirUnMenuDenTete(root, cle) {
  const id = String(cle || "").trim();
  if (!id) return;

  root?.querySelector?.(`[data-sujets-menu-liste="${id}"]`)?.classList?.add(MENU_OUVERT);
  root?.querySelector?.(`[data-sujets-menu="${id}"]`)?.setAttribute("aria-expanded", "true");
}

export function fermerLesMenusDenTete(root) {
  root?.querySelectorAll?.("[data-sujets-menu-liste]").forEach((liste) => {
    liste.classList.remove(MENU_OUVERT);
  });
  root?.querySelectorAll?.("[data-sujets-menu]").forEach((bouton) => {
    bouton.setAttribute("aria-expanded", "false");
  });
}
