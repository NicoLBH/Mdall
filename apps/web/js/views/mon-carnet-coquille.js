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
 * **Elle sert les trois écrans qui ne sont d'aucun projet** : les situations,
 * tous les sujets, toutes les propositions. C'est la même mise en page — une
 * coquille de projet, sans projet —, et en écrire une seconde pour les deux
 * nouveaux aurait fait deux calages à retoucher ensemble, dont l'un finirait en
 * retard sur l'autre (règle 10).
 *
 * @param {object} options
 * @param {string} options.banniere le bandeau du haut, fourni par l'appelant —
 *   il vient d'un module qui parle à la base, et la coquille n'a pas à le
 *   connaître pour savoir où le poser.
 * @param {string} options.hoteDOutils l'identifiant de l'hôte de barre
 *   d'outils. Chaque écran a le sien : deux écrans qui s'écriraient dans le
 *   même y laisseraient les boutons de l'autre.
 */
export function renderCoquilleTransversale({
  banniere = "", hoteDOutils = "situationsToolbarHost"
} = {}) {
  return `
    <div class="project-shell" id="projectShell" data-sans-projet="1">
      <div class="project-shell__body project-shell__body--situations">
        ${banniere}
        <div id="${hoteDOutils}" class="project-situations-toolbar-host"></div>
        <div id="project-content" class="project-shell__content"></div>
      </div>
    </div>
  `;
}
