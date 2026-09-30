/**
 * Faire un travail par lots, en rendant la main entre chacun.
 *
 * ## Le défaut que cela répare
 *
 * On lâche vingt-six mails dans la zone de dépôt. Le geste ajoute les
 * vingt-six, puis redessine l'écran **une fois** : entre le lâcher et le
 * premier nom affiché, rien ne bouge. Sur un lot un peu gros, on ne sait pas si
 * le dépôt a été pris en compte, et l'on recommence.
 *
 * Le remède n'est pas d'aller plus vite : c'est de **montrer pendant**. Cinq
 * noms apparaissent, puis cinq autres. On voit tout de suite que ça marche, et
 * l'on voit lesquels.
 *
 * ## Rendre la main, et pourquoi `setTimeout` plutôt qu'une promesse
 *
 * Une promesse déjà tenue (`Promise.resolve()`) reprend la main **dans le même
 * tour de boucle** : le navigateur n'a pas l'occasion de peindre, et l'écran
 * reste figé exactement comme avant. `setTimeout` rend la main à la boucle
 * d'événements, qui peint et traite les clics avant de revenir.
 *
 * C'est la différence entre « découper le travail » et « laisser respirer ».
 * Seule la seconde se voit.
 *
 * ## Il est pur, sauf là où il ne peut pas l'être
 *
 * `lesLots` découpe et se vérifie ; `rendreLaMain` attend, et c'est tout ce
 * qu'elle fait.
 */

/**
 * Combien d'éléments par lot.
 *
 * **Cinq**, et c'est un arbitrage : un lot de un redessine l'écran vingt-six
 * fois pour vingt-six fichiers, ce qui coûte plus que ça ne montre ; un lot de
 * cinquante ne montre plus rien. Cinq donne une poignée de noms à chaque
 * respiration, ce qui se lit comme une liste qui se remplit.
 */
export const PAR_LOT = 5;

/**
 * Les éléments, découpés en lots.
 *
 * @param {Array} elements ce qu'il y a à traiter
 * @param {number} taille combien par lot
 */
export function lesLots(elements = [], taille = PAR_LOT) {
  const tous = Array.isArray(elements) ? elements : [];
  // **Jamais zéro ni moins.** Une taille de lot nulle ferait une boucle qui ne
  // termine pas, sur un écran qu'on n'aurait plus aucun moyen de quitter.
  const combien = Math.max(1, Math.floor(Number(taille) || 0) || PAR_LOT);

  const lots = [];
  for (let debut = 0; debut < tous.length; debut += combien) {
    lots.push(tous.slice(debut, debut + combien));
  }
  return lots;
}

/**
 * Rendre la main à la boucle d'événements, le temps d'une peinture.
 *
 * `setTimeout` et non `Promise.resolve` : voir l'en-tête. Le délai est zéro —
 * ce qu'on demande n'est pas d'attendre, c'est de céder son tour.
 */
export function rendreLaMain() {
  return new Promise((tenir) => { setTimeout(tenir, 0); });
}
