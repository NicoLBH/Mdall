/**
 * Les écrans qui ne sont d'aucun projet.
 *
 * ## Ce qu'ils sont
 *
 * Mdall range presque tout par projet : ses documents, ses sujets, ses
 * propositions, sa mémoire. Mais **on ne travaille pas un projet à la fois.**
 * On arrive le matin en se demandant ce qu'il y a à faire, pas sur quel
 * chantier le faire — et la réponse traverse les projets.
 *
 * Les situations l'ont montré les premières : elles sont sorties du giron d'un
 * projet parce qu'une situation dit ce qu'une **personne** se donne à faire.
 * Les sujets et les propositions se lisent de la même façon.
 *
 * ## Pourquoi leurs noms vivent ici
 *
 * Chaque entrée est dite à trois endroits au moins : le menu de gauche, la
 * route qui l'ouvre, et le titre de l'écran. Recopiée, elle finit par différer
 * de l'une des trois, et c'est toujours celle qu'on ne regarde pas qui reste
 * fausse (`docs/fondamentaux.md`, règle 10). C'est la règle que `mon-carnet.js`
 * applique déjà pour les situations.
 *
 * ## « Tous les projets », et non « Projets »
 *
 * L'entrée menait déjà à la liste de tous les projets ; son nom disait
 * seulement « Projets », ce qui se lit comme une catégorie plutôt que comme une
 * destination. Les trois entrées commencent maintenant par le même mot, et l'on
 * comprend d'un coup d'œil que ce sont trois façons de tout regarder.
 */

/** Les sujets de tous mes projets, dans un seul tableau. */
export const TOUS_LES_SUJETS = {
  nom: "Tous les sujets",
  route: "#sujets",
  /** Celle de l'onglet Sujets d'un projet : c'est la même chose, en plus large. */
  icone: "issue-opened"
};

/** Les propositions de tous mes projets. */
export const TOUTES_LES_PROPOSITIONS = {
  nom: "Toutes les propositions",
  route: "#propositions",
  /** Celle d'une demande ouverte, comme dans l'onglet d'un projet. */
  icone: "git-pull-request"
};

/**
 * Le Copilote, sans projet.
 *
 * **Il est l'exception qui confirme la règle des deux autres.** Tous les sujets
 * et toutes les propositions rassemblent ce qui existe dans chaque projet ; ici,
 * il n'y a rien à rassembler — les discussions de cet écran n'appartiennent à
 * aucun chantier, et c'est ce qui les définit. « Où en suis-je ? », « comment je
 * m'y prends pour une descente de charges ? » ne sont d'aucun projet, et les
 * poser obligeait à en ouvrir un au hasard.
 */
export const LE_COPILOTE = {
  nom: "Copilote",
  route: "#copilote",
  /** La sienne, celle de l'entrée du rail dans l'Atelier. */
  icone: "copilot"
};

/** La liste des projets eux-mêmes. */
export const TOUS_LES_PROJETS = {
  nom: "Tous les projets",
  route: "#projects"
};

/**
 * Le premier morceau d'une adresse, sans son dièse.
 *
 * Le menu et le routeur lisent la même chose : l'un pour savoir quelle entrée
 * est allumée, l'autre pour savoir quel écran monter. Deux lectures de la même
 * adresse finiraient par ne plus être d'accord (règle 4).
 */
export function cheminDe(ecran) {
  return String(ecran?.route ?? "").replace(/^#/, "").split("/")[0];
}
