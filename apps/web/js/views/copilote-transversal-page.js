/**
 * Ce que l'écran du Copilote transverse dessine.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * L'écran parle à la base, et un module qui parle à la base **ne s'importe pas
 * dans un test** : l'authentification tire son client d'un CDN, et l'import
 * lève avant la première ligne. Le dessin, lui, n'a besoin de rien — séparé, il
 * s'exécute, et l'on regarde ce qui sort. C'est la forme prise par les autres
 * écrans transverses, pour la même raison.
 *
 * ## Il n'invente aucune largeur
 *
 * La coque est celle de l'Atelier, le rail est celui de tous les rails, et
 * `project-simple-page--copilote` est la classe qui donne au fil sa pleine
 * hauteur et **son unique ascenseur**. En écrire une seconde ici obligerait à
 * recalibrer les deux écrans à chaque retouche, et l'un des deux finirait en
 * retard sur l'autre.
 *
 * ## Ce qu'il ne construit pas
 *
 * Le contenu du rail. Les discussions se lisent en base, et le module qui les
 * tient n'est pas importable ici — l'appelant le lui passe tout fait, comme la
 * coquille transversale reçoit sa bannière.
 */

import { renderProjectRail, railWidth } from "./ui/project-rail.js";
import { renderNavList } from "./ui/nav-list.js";

/** L'hôte du Copilote. Un nom, pas une chaîne recopiée (règle 10). */
export const HOTE_DU_COPILOTE = "copiloteTransversalPanel";

/** Celui du rail, tel que la poignée de largeur le désigne. */
export const RAIL_DU_COPILOTE = "copiloteTransversalRail";

/**
 * La page entière.
 *
 * @param {object} options
 * @param {string} options.navHtml le contenu du rail, construit par l'appelant
 * @param {boolean} [options.railReplie]
 * @param {number} [options.railLargeur]
 */
export function renderPageDuCopiloteTransversal({
  navHtml = "", railReplie = false, railLargeur = 248
} = {}) {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--copilote"
      style="--project-rail-width:${railWidth(railLargeur, railReplie)}px">
      <div class="project-simple-scroll project-simple-scroll--parametres">
        <div class="settings-shell settings-shell--parametres">
          ${/*
            **La structure du rail est celle de tous les autres.** Le rail est en
            position fixe, le contenu s'écarte par une marge, et la largeur passe
            par une variable CSS — c'est elle que la poignée fait bouger sans
            rien redessiner. Une grille écrite ici compterait la largeur deux
            fois.
          */""}
          <div class="project-rail-layout${railReplie ? " project-rail-layout--collapsed" : ""}">
            ${renderProjectRail({
              id: RAIL_DU_COPILOTE,
              label: "Discussions du Copilote",
              collapsed: railReplie,
              navHtml: renderNavList({ label: "Discussions du Copilote", html: navHtml })
            })}
            <div class="project-rail-layout__content">
              <div id="${HOTE_DU_COPILOTE}"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
