/**
 * Garder la place de ce qui défile, d'un redessin à l'autre.
 *
 * ## Le défaut que cela répare
 *
 * Les écrans de Mdall se réécrivent entiers à chaque geste — c'est ce qui les
 * rend simples à suivre : un seul rendu, à partir d'un seul état. Mais
 * `innerHTML` fabrique des éléments **neufs**, dont le défilement part de zéro.
 *
 * Cocher le douzième document d'un dossier renvoyait donc en haut de la liste,
 * et il fallait redescendre à chaque case. Sur trente comptes rendus, le geste
 * devenait impraticable.
 *
 * ## Pourquoi un module, et pas trois lignes dans chaque écran
 *
 * Parce qu'il y en aurait trois, puis dix, et que la dixième serait fausse.
 * C'est une règle, pas une astuce : un panneau marqué `data-garde-le-defilement`
 * retrouve sa place. Écrite une fois (règle 10).
 *
 * ## Pourquoi elle est éprouvable sans navigateur
 *
 * Elle ne demande qu'un objet qui sait `querySelectorAll` et des éléments qui
 * portent `scrollTop`. Un cassage a montré qu'elle pouvait disparaître sans
 * qu'aucune épreuve ne bouge : elle vivait dans une fonction de rendu, au milieu
 * d'un `innerHTML`, et rien ne pouvait l'atteindre.
 */

/** L'attribut qui marque un panneau dont la place se garde. */
export const MARQUE = "data-garde-le-defilement";

/**
 * Relever la place de chaque panneau, et rendre de quoi la reposer.
 *
 * @param {object} hote l'élément qu'on s'apprête à réécrire
 * @returns {() => void} à rappeler une fois le rendu refait
 */
export function garderLesPlaces(hote) {
  const places = new Map();
  for (const panneau of hote?.querySelectorAll?.(`[${MARQUE}]`) ?? []) {
    // **Les deux sens, et pas seulement le vertical.** Le chemin d'une
    // exécution se parcourt à l'horizontale, et il se redessine tout seul
    // pendant qu'une file avance : on le faisait donc défiler à la main, et il
    // revenait à gauche toutes les trois secondes. Une liste et un chemin ne
    // sont pas deux problèmes — c'est le même, dans l'autre sens.
    places.set(nomDuPanneau(panneau), { haut: panneau.scrollTop, gauche: panneau.scrollLeft });
  }

  return () => {
    for (const panneau of hote?.querySelectorAll?.(`[${MARQUE}]`) ?? []) {
      const place = places.get(nomDuPanneau(panneau));
      if (place === undefined) continue;

      // **Zéro est une place.** `if (place.haut)` aurait sauté le haut de liste
      // — ce qui ne se voit pas, puisque c'est déjà là que l'élément neuf se
      // trouve, et qui aurait donc rendu la garde à moitié muette.
      if (place.haut !== undefined) panneau.scrollTop = place.haut;
      if (place.gauche !== undefined) panneau.scrollLeft = place.gauche;
    }
  };
}

/**
 * Le nom d'un panneau.
 *
 * **Sans nom, pas de place gardée.** Deux panneaux anonymes se confondraient, et
 * le second prendrait la place du premier — une liste qui saute au défilement
 * d'une autre est pire qu'une liste qui remonte.
 */
function nomDuPanneau(panneau) {
  return String(panneau?.dataset?.gardeLeDefilement ?? panneau?.getAttribute?.(MARQUE) ?? "").trim();
}
