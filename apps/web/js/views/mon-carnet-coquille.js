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
 * **Et elle n'a pas d'en-tête d'onglets.** Une barre qui ne porterait qu'une
 * seule entrée, toujours active, n'offre aucun choix : elle ne fait que répéter
 * le nom de l'écran qu'on regarde déjà. On y vient par la barre du haut.
 */

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
      <div class="project-shell__body project-shell__body--situations">
        ${banniere}
        <div id="situationsToolbarHost" class="project-situations-toolbar-host"></div>
        <div id="project-content" class="project-shell__content"></div>
      </div>
    </div>
  `;
}
