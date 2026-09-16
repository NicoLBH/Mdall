/**
 * Une situation lue comme une vue : une icône, une couleur, une requête.
 *
 * ## Pourquoi elles se ressemblent tant
 *
 * L'écran des situations a grandi seul, avec son vocabulaire — « mode manuel »,
 * « mode automatique », un `filter_definition` en jsonb — pendant que l'onglet
 * Sujets se dotait de vues qu'on épingle avec une icône et une couleur, et
 * d'une grammaire de requête qu'on lit et corrige au clavier.
 *
 * **Ce sont deux fois la même chose.** Le mode automatique est une requête qui
 * n'ose pas dire son nom ; le mode manuel, une liste tenue à la main.
 *
 * Voir `docs/le-carnet-prend-la-forme-des-sujets.md`, étape 1.
 *
 * ## Rien n'est redéfini ici
 *
 * Les icônes et les couleurs sont **celles des vues** : `vues-des-sujets.js`
 * les tient, avec leurs valeurs par défaut. En redéclarer un jeu pour les
 * situations ferait deux listes qui se ressemblent assez pour qu'on les croie
 * identiques et diffèrent assez pour qu'on le voie — exactement ce qu'on répare
 * (règle 10).
 *
 * Ce fichier ne fait que **lire une situation** dans ce vocabulaire-là.
 *
 * ## La requête ne remplace pas encore le filtre
 *
 * `mode` et `filter_definition` restent : des situations s'en servent
 * aujourd'hui, et un constat ne devient pas faux (règle 6). La requête est ce
 * qu'on lit **en premier** ; le reste sert de repli tant qu'elle ne sait pas
 * tout dire. C'est l'étape 4 du plan qui les retirera.
 */

import { couleurDeLaVue, iconeDeLaVue } from "./vues-des-sujets.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'icône d'une situation, ramenée au jeu des vues. */
export function iconeDeLaSituation(situation = null) {
  return iconeDeLaVue(situation?.icon ?? situation?.icone);
}

/** Sa couleur, ramenée à la liste des vues — avec sa valeur hexadécimale. */
export function couleurDeLaSituation(situation = null) {
  return couleurDeLaVue(situation?.color ?? situation?.couleur);
}

/**
 * Ce qu'une situation retient, en requête.
 *
 * **Vide n'est pas « rien ».** Une situation sans requête retient ce que son
 * mode et son filtre disent — c'est le cas de toutes celles d'aujourd'hui. La
 * rendre comme une requête vide la ferait passer pour « tous les sujets », ce
 * qui est une affirmation et non une absence (règle 5).
 *
 * @returns {string} la requête écrite, ou `""` si elle n'en a pas encore
 */
export function requeteDeLaSituation(situation = null) {
  return texte(situation?.requete ?? situation?.query);
}

/**
 * Cette situation dit-elle déjà ce qu'elle retient par une requête ?
 *
 * La question se pose avant de lire `filter_definition` : les deux ne doivent
 * jamais s'appliquer ensemble, sinon une situation retiendrait l'intersection
 * de deux règles dont une seule est visible à l'écran (règle 4).
 */
export function seDitParUneRequete(situation = null) {
  return Boolean(requeteDeLaSituation(situation));
}

/**
 * Une situation sous la forme que le rail attend d'une vue épinglée.
 *
 * ## La forme est celle que `epinglesDuRail` consomme, et pas une qui lui
 * ressemble
 *
 * Elle rendait `nom` et `active`, et le rail lit `titre` et `auRail`. Résultat :
 * **aucune de mes situations n'est jamais apparue dans le rail** — le filtre
 * `auRail === true` les écartait toutes en silence, et le nom serait de toute
 * façon retombé sur la requête. C'est exactement le défaut que `vuePourLEcran`
 * porte écrit au-dessus d'elle, rencontré une seconde fois : deviner la graphie
 * ne rate pas bruyamment, ça rend `undefined`, et `undefined` prend la valeur
 * de repli.
 *
 * Un test fait donc traverser cette forme par `epinglesDuRail` plutôt que de
 * décrire à quoi elle ressemble : une fixture qui recopie les hypothèses du
 * code ne teste que elle-même.
 *
 * ## `auRail` se lit, il ne se suppose plus
 *
 * Il valait `true` pour tout le monde : le rail montrait alors **toutes** mes
 * situations, et sur un carnet qui en compte vingt-six la barre de gauche
 * devient une liste qu'on ne parcourt plus. C'était l'inverse de ce à quoi un
 * rail sert — il est court, et une entrée de plus coûte une place à celles
 * qu'on regarde tous les jours.
 *
 * C'est la règle que les vues portent déjà : une vue enregistrée vit sur son
 * écran et ne monte au rail que lorsqu'on l'y met. La situation a son tableau,
 * qui les montre toutes ; le rail garde celles qu'on y a mises.
 *
 * ## Ce qu'elle ne calcule pas
 *
 * Laquelle on regarde. `epinglesDuRail` le déduit déjà de la requête courante ;
 * le faire ici aussi ferait deux réponses à une même question, et c'est celle
 * qu'on ne regarde pas qui finirait par avoir raison (règle 4).
 */
export function situationCommeUneEpingle(situation = null) {
  return {
    id: texte(situation?.id),
    titre: texte(situation?.title) || "Situation",
    icone: iconeDeLaSituation(situation),
    couleur: couleurDeLaSituation(situation).cle,
    requete: requeteDeLaSituation(situation),
    auRail: situation?.au_rail === true || situation?.auRail === true
  };
}
