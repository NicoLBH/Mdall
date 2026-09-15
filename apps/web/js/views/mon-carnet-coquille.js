/**
 * La coquille du carnet : sa mise en page, et rien d'autre.
 *
 * ## Pourquoi elle est à part
 *
 * L'écran du carnet monte le tableau des situations, qui parle à la base et ne
 * s'importe donc pas dans un test. La mise en page, elle, n'a besoin de rien :
 * séparée, elle s'exécute pour de vrai, et l'on vérifie qu'elle réutilise
 * réellement les classes du projet plutôt que de lire le fichier en espérant.
 *
 * ## Elle n'invente aucune largeur
 *
 * Ce sont les classes de la coquille d'un projet — `project-shell`, son corps,
 * son hôte de barre d'outils, son contenu — et celles de sa barre d'onglets.
 * En refaire une pour cet écran obligerait à recalibrer les deux à chaque
 * retouche, et l'une des deux finirait en retard sur l'autre.
 *
 * Une seule chose change, et c'est la seule qui devait changer : l'en-tête ne
 * porte pas les onglets d'un projet, parce qu'il n'y a pas de projet.
 */

import { svgIcon } from "../ui/icons.js";
import { NOM_DU_CARNET, ROUTE_DU_CARNET } from "../services/mon-carnet.js";

/**
 * L'en-tête du carnet : une seule entrée, celle où l'on est.
 *
 * Mêmes classes que la barre d'onglets d'un projet — même hauteur, même
 * calibrage, même repère pour l'œil. Un seul onglet, parce qu'un carnet n'a
 * rien à côté de quoi se ranger.
 */
export function renderCarnetHeader() {
  return `
    <section class="project-context-header" data-carnet="1">
      <nav class="project-tabs" aria-label="Mon carnet">
        <a href="${ROUTE_DU_CARNET}" class="active" data-carnet-tab-id="situations" aria-current="page">
          <span class="project-tabs__item">
            <span class="project-tabs__icon" aria-hidden="true">${svgIcon("table", { className: "octicon octicon-table" })}</span>
            <span class="project-tabs__label">${NOM_DU_CARNET}</span>
          </span>
        </a>
      </nav>
    </section>
  `;
}

/**
 * La coquille entière.
 *
 * @param {object} options
 * @param {string} options.banniere le bandeau du haut, fourni par l'appelant —
 *   il vient d'un module qui parle à la base, et la coquille n'a pas à le
 *   connaître pour savoir où le poser.
 */
export function renderCarnetShell({ banniere = "" } = {}) {
  return `
    <div class="project-shell" id="projectShell" data-carnet="1">
      ${renderCarnetHeader()}

      <div class="project-shell__body project-shell__body--situations">
        ${banniere}
        <div id="situationsToolbarHost" class="project-situations-toolbar-host"></div>
        <div id="project-content" class="project-shell__content"></div>
      </div>
    </div>
  `;
}
