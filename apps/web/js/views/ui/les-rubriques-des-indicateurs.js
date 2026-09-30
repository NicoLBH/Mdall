/**
 * Les rubriques de l'écran des Indicateurs.
 *
 * ## Pourquoi il a fallu les nommer
 *
 * L'écran empilait tout : les cartes d'exécution, la bande de pilotage, les
 * graphiques, la forme du chantier, la correspondance, la consommation. Chaque
 * tour en ajoutait, et chacun se défendait — pris un par un, ils disent tous
 * quelque chose. Mis bout à bout, ils font une page qu'on déroule sans
 * retrouver ce qu'on y cherchait, et **le message se noie**.
 *
 * Paramètres a résolu la même chose de la même façon : un menu à gauche, une
 * rubrique à la fois. On reprend son gabarit (`side-nav-layout.js`) plutôt que
 * d'en dessiner un second, qu'il faudrait recalibrer à chaque retouche.
 *
 * ## Ce que ce module décide, et ce qu'il ne décide pas
 *
 * Il dit **quelles** rubriques existent, dans quel ordre, et sous quel nom.
 * Il ne dessine rien : ce qui remplit chacune vit déjà ailleurs, et c'est bien
 * pour cela qu'on peut les ranger sans les toucher.
 *
 * ## Il est pur
 *
 * Une clé entre, une rubrique sort.
 */

/**
 * Les cinq, dans l'ordre où on les lit.
 *
 * **L'ordre n'est pas décoratif** : il va du plus factuel au plus interprété.
 * Ce qui a été exécuté, puis ce que cela vaut, puis à quoi ressemble le
 * chantier, puis ce qu'on en a reçu, puis ce que cela coûte. Quelqu'un qui
 * ouvre l'écran sans savoir ce qu'il cherche descend cette liste dans l'ordre.
 */
export const RUBRIQUES = [
  { cle: "execution", dit: "Exécution", icone: "pulse" },
  { cle: "pilotage", dit: "Pilotage", icone: "meter" },
  { cle: "forme", dit: "Forme", icone: "viseur" },
  { cle: "correspondance", dit: "Correspondance", icone: "mail" },
  { cle: "consommation", dit: "Consommation", icone: "credit-card" }
];

/** Celle qu'on ouvre quand rien n'a été choisi. */
export const RUBRIQUE_PAR_DEFAUT = RUBRIQUES[0].cle;

/**
 * La rubrique demandée, ramenée à l'une des cinq.
 *
 * **Une clé inconnue ouvre la première**, elle ne laisse pas l'écran vide : un
 * état gardé d'une version où la rubrique s'appelait autrement ne doit pas
 * donner une page blanche qu'on prendrait pour une panne.
 */
export function rubriqueValide(cle) {
  const dit = String(cle ?? "").trim();
  return RUBRIQUES.some((une) => une.cle === dit) ? dit : RUBRIQUE_PAR_DEFAUT;
}

/** La rubrique entière, pas seulement sa clé. */
export function laRubrique(cle) {
  const valide = rubriqueValide(cle);
  return RUBRIQUES.find((une) => une.cle === valide) ?? RUBRIQUES[0];
}
