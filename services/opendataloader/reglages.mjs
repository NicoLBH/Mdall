/**
 * Les réglages de la restitution, décidés **une fois**.
 *
 * ## Pourquoi un fichier pour quatre lignes
 *
 * Ces réglages changent complètement ce qui sort : un tableau sans bordures
 * rendu en liste à puces plutôt qu'en tableau, des titres à plat plutôt que
 * hiérarchisés. Si l'essai en local et le service en ligne ne les partagent
 * pas, on juge la qualité sur autre chose que ce que Mdall recevra — et l'on
 * décide de garder ou de jeter l'outil sur un résultat qui n'est pas le sien
 * (règle 4).
 *
 * ## Ce que chacun fait, et pourquoi celui-là
 *
 * - `markdownPageSeparator` — la convention de Mdall, celle que
 *   `_shared/markdown-de-loutil.js` sait relire. Sans elle, le document
 *   revient d'un bloc et ne peut plus être aligné page par page.
 * - `tableMethod: "cluster"` — rattrape les tableaux sans bordures. Imparfait,
 *   mais un tableau approximatif vaut mieux qu'une liste à puces où les
 *   colonnes se sont mélangées.
 * - `headingHierarchy` — les titres gardent leur niveau. Sans lui, un compte
 *   rendu devient un mur de texte et l'on ne retrouve plus ses rubriques.
 * - `imageOutput: "off"` — on compare du texte. Écrire les images remplirait
 *   le disque pour rien.
 *
 * Le mode **hybride** (`hybrid: "docling-fast"`) améliore nettement les
 * tableaux sans bordures, mais il demande un serveur Python à côté. Il n'est
 * pas activé : on regarde d'abord ce que le mode libre donne sur de vrais
 * documents.
 */

/**
 * Le marqueur de page.
 *
 * `%page-number%` est remplacé par la ligne de commande. Il traverse ensuite
 * une frontière de processus, et c'est un test qui vérifie que l'analyseur de
 * Mdall sait relire ce que celui-ci écrit.
 */
export const MARQUEUR = "=== PAGE %page-number% ===";

/** Ce qu'on passe à la conversion, hormis les chemins. */
export const REGLAGES = {
  format: "markdown",
  markdownPageSeparator: MARQUEUR,
  imageOutput: "off",
  tableMethod: "cluster",
  headingHierarchy: true,
  quiet: true
};
