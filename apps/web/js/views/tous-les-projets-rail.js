/**
 * Le rail de « Tous les projets » : ses deux entrées, et rien d'autre.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * L'écran des projets parle à la base, et un module qui parle à la base **ne
 * s'importe pas dans un test** : l'authentification tire son client d'un CDN,
 * et l'import lève avant la première ligne. C'est ce qui avait poussé, pour les
 * écrans transversaux, à lire le code comme du texte — et un rail dessiné que
 * personne n'écoute passe alors sans bruit, ce qui est arrivé une fois au
 * carnet.
 *
 * Le dessin, lui, n'a besoin de rien. Séparé, il **s'exécute** : on lui donne
 * l'entrée active, il rend du balisage, et l'on regarde ce qui sort.
 *
 * ## Rien n'est dessiné de neuf
 *
 * La coque vient de `ui/project-rail.js` — celle de la Mémoire, de l'Atelier,
 * des Sujets d'un projet et du carnet : la poignée de largeur, le calage du
 * haut au défilement, le repli calé en bas. Les entrées viennent de
 * `ui/nav-list.js`, comme celles du rail des sujets.
 *
 * C'était auparavant un `<aside>` large de 296 px, ni réglable ni repliable :
 * arriver ici faisait perdre les deux gestes sans que rien ne l'explique.
 */

import { svgIcon } from "../ui/icons.js";
import { renderNavList, renderNavListGroup, renderNavListItem } from "./ui/nav-list.js";
import { renderProjectRail } from "./ui/project-rail.js";

/**
 * Les deux façons de regarder ses projets.
 *
 * Chacune porte son adresse : ce sont des **destinations**, pas des modes, et
 * l'adresse est ce qui les rend copiables et rechargeables.
 */
export const FILTRES_DES_PROJETS = {
  contributions: {
    id: "contributions",
    label: "Mes contributions",
    href: "#projects",
    iconName: "people"
  },
  mine: {
    id: "mine",
    label: "Mes projets",
    href: "#projects/mine",
    iconName: "person"
  }
};

/**
 * Le rail entier.
 *
 * Replié, il ne reste que les icônes : l'infobulle redonne le libellé, sans
 * quoi deux ronds gris se ressemblent trait pour trait.
 *
 * @param {string} actif l'identifiant de l'entrée qu'on regarde
 * @param {boolean} replie
 */
export function renderRailDesProjets(actif = "", replie = false) {
  return renderProjectRail({
    id: "projetsRail",
    label: "Projets",
    collapsed: replie,
    navHtml: renderNavList({
      label: "Projets",
      html: renderNavListGroup({
        items: Object.values(FILTRES_DES_PROJETS).map((entree) => renderNavListItem({
          // Une entrée qui mène quelque part est un lien : elle s'ouvre dans un
          // onglet, et le clic du milieu marche.
          as: "a",
          href: entree.href,
          label: entree.label,
          iconHtml: svgIcon(entree.iconName, { className: `octicon octicon-${entree.iconName}` }),
          isActive: entree.id === String(actif || ""),
          dataAttributes: { "data-tooltip": replie ? entree.label : "" }
        }))
      })
    })
  });
}
