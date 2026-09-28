/**
 * Ce que le projet sait déjà, dit au modèle qui écrit du Mdall.
 *
 * ## Le verrou
 *
 * « Ajoute une fonction qui demande le matériau, puis **lance la fonction
 * existante dans la mémoire du projet** “couleur des volets” sur le résultat. »
 *
 * Le modèle ne voyait que cette phrase. Il ne savait pas que « Couleur des
 * volets » existe, ni ce qu'elle lit, ni ce qu'elle rend — et il a donc écrit
 * la seule chose qu'on peut écrire quand on ne sait pas : un **appel de
 * fonction**, qui n'existe pas dans ce langage.
 *
 * Ce n'était pas une faute de grammaire : c'était une question à laquelle
 * personne ne lui avait donné les moyens de répondre.
 *
 * ## On ne monte pas la mémoire, on monte ce qu'elle conclut
 *
 * Faire monter une mémoire entière à chaque essai coûterait cher et ne
 * servirait pas : ce qu'il faut au modèle tient en une liste — **les fonctions
 * que le projet a signées**, avec ce que chacune lit et rend. Quelques lignes,
 * pas trois cents règles avec leur provenance, leur auteur et leurs zones.
 *
 * **Les noms déclarés n'y sont pas**, et c'est une limite assumée : leur
 * domaine fermé ne vit pas dans les assertions mais dans le fichier des
 * variables, qui se reconstruit à la lecture. C'est dit dans `à traiter plus
 * tard` plutôt que fait à moitié.
 *
 * ## Et rien de plus que des noms
 *
 * **Aucune valeur ne monte.** Ni les cotes, ni les conclusions, ni les
 * citations : le modèle a besoin de savoir qu'un nom existe et ce qu'il vaut
 * *comme domaine*, jamais ce que ce projet-ci a répondu. Envoyer les valeurs
 * ferait sortir du projet des choses que personne n'a demandé de faire sortir,
 * pour un gain nul.
 */

import { nomsConclusParLeProjet } from "./fonctions-du-projet.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Combien de noms au plus.
 *
 * **Une mémoire de trois cents règles noierait la consigne**, et la phrase
 * qu'on vient de taper se lirait au milieu d'un annuaire. Au-delà, on dit
 * combien il en reste plutôt que de laisser croire que c'est tout (règle 5).
 */
export const COMBIEN_AU_PLUS = 80;

/** Ce qu'une fonction versée dit d'elle-même, en une ligne. */
function ditDeLaFonction(une) {
  const lit = (une.lit ?? []).map(texte).filter(Boolean);
  const rend = une.rend?.valeurs?.length
    ? une.rend.valeurs.join(" ou ")
    : texte(une.rend?.unite);

  return {
    nom: texte(une.nom),
    lit,
    ...(rend ? { rend } : {}),
    ...(texte(une.forme) ? { forme: texte(une.forme) } : {})
  };
}

/**
 * Ce que le projet sait, prêt à monter avec la phrase.
 *
 * @param {object[]} assertions la mémoire du projet
 * @returns {{fonctions: object[], noms: object[], deplus: number}}
 */
export function ceQueLeProjetSait(assertions = []) {
  // Pas de second filtre sur le nom : `nomsConclusParLeProjet` ne rend que des
  // règles qui en ont un. Le réécrire ici ferait deux gardes pour une question,
  // et celle qu'on corrigerait un jour ne serait pas forcément celle qui
  // s'applique (règle 4).
  const fonctions = nomsConclusParLeProjet(Array.isArray(assertions) ? assertions : [])
    .map(ditDeLaFonction);

  return {
    fonctions: fonctions.slice(0, COMBIEN_AU_PLUS),
    /**
     * Ce qu'on a laissé dehors.
     *
     * Le taire ferait croire que le projet ne contient que cela, et le modèle
     * écrirait un nom de plus au lieu de reprendre celui qui existe (règle 5).
     */
    deplus: Math.max(0, fonctions.length - COMBIEN_AU_PLUS)
  };
}

/** Y a-t-il quelque chose à dire ? Un projet neuf n'a rien, et se tait. */
export function leProjetSaitQuelqueChose(su = null) {
  return Boolean((su?.fonctions ?? []).length);
}
