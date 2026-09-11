/**
 * « Tester une variante », déclaré au modèle comme une fonction.
 *
 * ## Pourquoi il n'est pas dans le catalogue des utilitaires
 *
 * Les utilitaires calculent une valeur à partir d'entrées qu'on leur donne :
 * une cote hors gel, un spectre, un pré-dimensionnement. Celui-ci ne calcule
 * rien de nouveau — il **rejoue ce que le projet a déjà**, avec une valeur
 * remplacée, et rend ce qui bouge. Son entrée n'est pas une liste de cotes,
 * c'est la mémoire entière du projet.
 *
 * Il a donc sa déclaration à lui, et un chemin d'exécution à lui.
 *
 * ## Où il s'exécute, et pourquoi ce n'est pas ici
 *
 * **Au navigateur**, et c'est la seule exception de ce genre. Les autres
 * utilitaires s'exécutent au serveur pour que leur méthode n'y descende pas :
 * le catalogue, les phrases qui décident, l'enchaînement. Le moteur de variante,
 * lui, *est déjà* dans la page — c'est l'écran « Tester une variante », que
 * n'importe qui peut ouvrir depuis l'Atelier. Le porter ici en ferait une
 * seconde implémentation du même raisonnement, et deux réponses à une même
 * question finissent par diverger (règle 4).
 *
 * Ce qui reste ici est ce qui compte : **la décision**. Le modèle ne sait de cet
 * outil que ce que cette déclaration en dit, et c'est elle qui règle quand il
 * l'appelle. Le navigateur n'apprend qu'un nom.
 *
 * ## Deux entrées, et pas une de plus
 *
 * Ce qu'on change, et la valeur qu'on essaie. Toutes deux **requises** : un
 * modèle qui appellerait cet outil sans valeur lui ferait deviner un endroit, et
 * une conséquence calculée sur une adresse inventée est le pire des résultats —
 * elle est juste, vérifiable, et sans rapport avec la question.
 */

/** Le nom de l'outil. Il voyage jusqu'au navigateur, qui route dessus. */
export const OUTIL_VARIANTE = "tester_une_variante";

/** Les outils que le navigateur exécute lui-même. Fermée, et courte. */
export const OUTILS_DU_NAVIGATEUR = [OUTIL_VARIANTE];

/** La déclaration passée au modèle, dans la forme qu'attend l'API. */
export const DECLARATION_VARIANTE = {
  type: "function",
  name: OUTIL_VARIANTE,
  description: [
    "Teste une variante sur la mémoire de ce projet : remplace une valeur par une autre et",
    "rejoue tout ce qui en dépend — zonages climatiques, zone de sismicité, cote hors gel,",
    "spectre sismique, pré-dimensionnement des fondations. Rend ce qui change, avec l'avant,",
    "l'après et l'utilitaire qui l'a recalculé, et ce qui n'a pas pu se recalculer, avec la raison.",
    "Rien n'est écrit dans la mémoire : c'est une exploration.",
    "",
    "Appelle-le dès qu'une question porte sur une conséquence — « et si », « qu'est-ce que ça",
    "change si », « quelles conséquences », « est-ce que ça suffirait encore » — et qu'elle",
    "nomme la valeur à essayer. Ne raisonne jamais toi-même sur ce qui découlerait d'un",
    "changement : la chaîne fait plusieurs maillons et se termine sur des cotes de fondation.",
    "",
    "Changer l'adresse ou la commune déplace le projet : donne l'adresse telle que l'utilisateur",
    "l'a écrite, elle sera résolue en commune, code INSEE et coordonnées."
  ].join(" "),
  parameters: {
    type: "object",
    properties: {
      sujet: {
        type: "string",
        description: "Ce qu'on change, dans les mots de l'utilisateur : « l'adresse du projet », "
          + "« l'altitude », « la contrainte de sol », « la classe de sol ». Reprends sa "
          + "formulation, ne la traduis pas en clé technique."
      },
      valeur: {
        type: "string",
        description: "La valeur à essayer, telle que l'utilisateur l'a dite : « avenue de "
          + "l'Aiguille à Chamonix », « 1200 m », « 0,15 MPa ». N'en invente jamais une : si "
          + "l'utilisateur n'a pas dit laquelle, ne l'appelle pas et demande-la."
      }
    },
    required: ["sujet", "valeur"],
    additionalProperties: false
  }
};

/**
 * Ce que le modèle doit savoir pour s'en servir sans se tromper.
 *
 * Ajouté aux consignes, et non à la description : la description dit ce que
 * l'outil fait, les consignes disent comment se conduire avec ce qu'il rend.
 */
export const CONSIGNES_VARIANTE = [
  "",
  "L'outil `tester_une_variante` rejoue la mémoire du projet avec une valeur remplacée :",
  "- Une question sur une conséquence — « et si on déplaçait le projet à… ? » — s'y répond par cet outil, jamais par un raisonnement de ta part. La chaîne va de la commune aux cotes de fondation, et personne ne la refait de tête.",
  "- Reprends ses chiffres tels quels, avec l'avant et l'après, et cite l'utilitaire qui a recalculé chaque valeur.",
  "- Distingue ce qui a **bougé** de ce qui a été **recalculé sans bouger** : « la zone de vent est recalculée et reste la même » est une information utile, pas un silence.",
  "- Dis ce qui n'a **pas** pu se recalculer et pourquoi : une variante partielle présentée comme complète est le seul vrai danger de cet outil.",
  "- Rien de tout cela n'entre dans la mémoire. C'est une exploration ; quelqu'un décidera, et par une proposition."
].join("\n");
