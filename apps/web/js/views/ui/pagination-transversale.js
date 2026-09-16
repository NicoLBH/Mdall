/**
 * Brancher les commandes de pagination d'un tableau.
 *
 * ## Pourquoi c'est un module
 *
 * `renderPaginationControls` dessine les boutons avec deux attributs —
 * `data-pagination-entity` et `data-pagination-page` — et chaque écran les
 * écoute. Les deux écrans qui traversent les projets ont le même geste ; en
 * écrire deux copies, c'est accepter qu'elles diffèrent au premier réglage
 * (règle 10).
 *
 * ## L'entité compte
 *
 * Deux tableaux paginés sur une même page écouteraient les boutons l'un de
 * l'autre : c'est l'attribut d'entité qui les sépare, et c'est pour cela qu'il
 * se donne plutôt que de se deviner.
 */

/**
 * @param {Element} racine où chercher les boutons
 * @param {string} entite le nom que le rendu leur a donné
 * @param {(page: number) => void} allerA ce qu'on fait de la page demandée
 */
export function brancherLaPagination(racine, entite, allerA) {
  const nom = String(entite || "").trim();
  if (!racine || !nom || typeof allerA !== "function") return;

  racine.querySelectorAll(`[data-pagination-entity="${nom}"][data-pagination-page]`)
    .forEach((bouton) => {
      bouton.addEventListener("click", (event) => {
        event.preventDefault();

        // **Un bouton désactivé ne fait rien**, et il est là pour la place qu'il
        // tient : « Précédent » qui disparaîtrait à la première page ferait
        // sauter toute la rangée d'un cran à chaque bord.
        if (bouton.getAttribute("aria-disabled") === "true") return;

        const page = Number.parseInt(bouton.getAttribute("data-pagination-page"), 10);
        if (!Number.isFinite(page) || page < 1) return;
        allerA(page);
      });
    });
}
