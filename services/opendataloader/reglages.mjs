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
 * - `imageOutput: "off"` — on compare du texte. Écrire les images remplirait
 *   le disque pour rien.
 *
 * ## Ce qui n'y est pas, et pourquoi
 *
 * **`headingHierarchy` a été retiré : l'option n'existe pas.** Elle figure dans
 * la documentation du projet, pas dans la version 2.5.8 — ni dans l'aide de la
 * ligne de commande, ni dans le code du paquet npm. Elle était donc passée et
 * **ignorée en silence**, ce qui est la pire façon de ne pas marcher : on croit
 * régler quelque chose. Les titres sortent hiérarchisés sans elle.
 *
 * **`tableMethod` a été retiré aussi**, pour une raison mesurée : sur un compte
 * rendu réel de onze pages, `default`, `cluster` et `--use-struct-tree`
 * produisent des fichiers **identiques au caractère près**. L'option ne changeait
 * rien, et la garder aurait laissé croire qu'un réglage pouvait corriger le
 * découpage des phrases en colonnes. Il ne peut pas : c'est l'analyse de mise en
 * page qui se trompe, et aucune option ne la reprend.
 *
 * Ce qui viserait juste, c'est le mode **hybride** (`hybrid: "docling-fast"`) :
 * il remplace précisément l'analyse des tableaux. Il demande un serveur Python
 * à côté, dans le même conteneur. Non essayé : à mesurer avant de l'activer.
 */

/**
 * Le marqueur de page.
 *
 * `%page-number%` est remplacé par la ligne de commande. Il traverse ensuite
 * une frontière de processus, et c'est un test qui vérifie que l'analyseur de
 * Mdall sait relire ce que celui-ci écrit.
 */
export const MARQUEUR = "=== PAGE %page-number% ===";

/**
 * Ce qu'on passe à la conversion, hormis les chemins.
 *
 * Court, et c'est le résultat d'une mesure : les options qu'on avait ajoutées
 * ne changeaient rien, ou n'existaient pas. Voir l'en-tête.
 */
export const REGLAGES = {
  format: "markdown",
  markdownPageSeparator: MARQUEUR,
  imageOutput: "off",
  quiet: true
};
