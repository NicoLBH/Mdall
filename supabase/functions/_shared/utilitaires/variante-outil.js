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

import { DECLARATION_CERVEAU, OUTIL_CERVEAU } from "./cerveau-outil.js";
import { DECLARATION_NAVIGATION, OUTIL_NAVIGATION } from "./navigation-outil.js";

/** Le nom de l'outil. Il voyage jusqu'au navigateur, qui route dessus. */
export const OUTIL_VARIANTE = "tester_une_variante";

/**
 * Les outils que le navigateur exécute lui-même. Fermée, et courte.
 *
 * Trois, et pour la même raison : ce qu'ils font **est déjà dans la page** — le
 * moteur de variante est l'écran « Tester une variante », le cerveau est le
 * dessin qu'on ouvre depuis la Mémoire, et l'adresse d'une page ne se change
 * que là où la page est. Les porter au serveur en ferait une seconde
 * implémentation du même raisonnement (règle 4).
 *
 * **C'est la seule table qui dit où un outil s'exécute, et lequel c'est.** Le
 * navigateur ne la reçoit pas : il reçoit, appel par appel, un `ou` et un rôle.
 * La lui donner reviendrait à lui apprendre quels outils existent.
 */
export const ROLES_DU_NAVIGATEUR = {
  [OUTIL_VARIANTE]: "variante",
  [OUTIL_CERVEAU]: "cerveau",
  [OUTIL_NAVIGATION]: "navigation"
};

/**
 * Et la liste s'en déduit.
 *
 * Elle s'écrivait à part, et le rôle avec elle : deux listes pour un même fait,
 * donc un outil qu'on ajoute à l'une en oubliant l'autre — il partirait au
 * navigateur sans rôle, et celui-ci l'exécuterait comme le premier venu
 * (règle 4).
 */
export const OUTILS_DU_NAVIGATEUR = Object.keys(ROLES_DU_NAVIGATEUR);

/** Le rôle d'un outil au navigateur, ou `""` quand il tourne au serveur. */
export function roleDuNavigateur(nom) {
  return ROLES_DU_NAVIGATEUR[String(nom ?? "").trim()] ?? "";
}

/** La déclaration passée au modèle, dans la forme qu'attend l'API. */
export const DECLARATION_VARIANTE = {
  type: "function",
  name: OUTIL_VARIANTE,
  description: [
    "Teste une variante sur la mémoire de ce projet : remplace une valeur par une autre et",
    "rejoue tout ce qui en dépend — zonages climatiques, zone de sismicité, cote hors gel,",
    "spectre sismique, pré-dimensionnement des fondations. Rend ce qui change, avec l'avant,",
    "l'après et l'agent qui l'a recalculé, et ce qui n'a pas pu se recalculer, avec la raison.",
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
  "- **Une demande d'ouvrir un écran n'est pas une variante.** « Ouvre-moi le copilote de tel projet », « montre-moi ses sujets », « je voudrais parler au copilote de… » ne changent aucune valeur : ils demandent d'aller quelque part, et c'est `ouvrir_un_ecran` qui y va. Appeler cet outil-ci sur une telle demande affiche à l'écran un test qui n'a pas eu lieu, avec le motif de son refus — et l'on croit à une panne alors qu'on avait seulement demandé un déplacement.",
  "- Reprends ses chiffres tels quels, avec l'avant et l'après, et cite l'agent qui a recalculé chaque valeur.",
  "- Distingue ce qui a **bougé** de ce qui a été **recalculé sans bouger** : « la zone de vent est recalculée et reste la même » est une information utile, pas un silence.",
  "- Dis ce qui n'a **pas** pu se recalculer et pourquoi : une variante partielle présentée comme complète est le seul vrai danger de cet outil.",
  "- Rien de tout cela n'entre dans la mémoire. C'est une exploration ; quelqu'un décidera, et par une proposition.",
  "",
  "Quand l'outil rend `neCouvrentPlus`, **commence par là**. Un zonage se recalcule en une seconde ; un avis de bureau de contrôle se redemande en six semaines, et c'est cette moitié-là de la réponse qui fait décider :",
  "- Dis ce qui ne couvre plus, ce qui avait été examiné, et quand. Jamais « invalidé » ni « périmé » : un constat reste vrai à sa date, c'est sa couverture qui tombe.",
  "- N'écris jamais les mots « visa », « à viser », « validé », « en attente » ni « approbation ». Dis ce qui a été fait, par qui, et quand.",
  "- `aRevoirCote` n'est pas la même chose : ce qui a été examiné n'a pas bougé, mais une de ses entrées si. Dis « à revérifier », pas « ne couvre plus ».",
  "- Ne conclus jamais qu'un examen tient toujours parce que le changement te paraît favorable. Tu n'as pas à en juger : dis ce qui a bougé, quelqu'un tranchera.",
  "- Chaque engagement porte `qui` : ce que ça coûterait de passer outre. Dis-le en toutes lettres — « celui-là vient d'un bureau de contrôle » — et jamais sous forme de note, de score ou de nombre de validations. Il ne sert à rien d'autre : il n'arbitre aucun calcul et ne départage aucune valeur."
].join("\n");

/**
 * Les rôles qu'un navigateur d'avant savait exécuter.
 *
 * ## Le défaut que ça répare
 *
 * Le serveur et le site se déploient séparément. Le jour où l'ouverture d'un
 * écran est arrivée, le serveur l'a offerte au modèle **avant** que le site ne
 * soit à jour : le modèle l'a appelée, l'appel est parti au navigateur avec le
 * rôle `navigation`, et l'ancien aiguillage — un ternaire, « cerveau ou sinon
 * variante » — a lancé **le moteur de variante**. On lisait à l'écran « Test
 * d'une variante — il faut dire ce qu'on change » après avoir demandé d'ouvrir
 * un projet, et le journal disait pourtant « Lancement de ouvrir un ecran ».
 *
 * Un défaut de ce genre ne se voit sur aucune branche : les deux moitiés sont
 * justes, c'est leur décalage qui ne l'est pas, et il dure le temps d'un
 * déploiement ou d'un cache de navigateur.
 *
 * ## Le navigateur dit ce qu'il sait faire
 *
 * Il envoie **ses rôles**, pas des noms d'outils : il n'en apprend donc aucun,
 * et c'est toujours le serveur qui décide où chaque appel s'exécute. Le serveur
 * n'offre au modèle que les outils dont le rôle est dans cette liste — un outil
 * qu'on ne sait pas exécuter n'est pas proposé, donc jamais appelé.
 *
 * Un navigateur qui ne dit rien est un navigateur d'avant : on lui suppose les
 * deux rôles qui existaient alors. Supposer les trois lui en enverrait un qu'il
 * ne sait pas faire, c'est-à-dire exactement le défaut qu'on répare.
 */
export const ROLES_HISTORIQUES = ["variante", "cerveau"];

/** Les trois déclarations dont l'exécution a lieu dans la page. */
export const DECLARATIONS_DU_NAVIGATEUR = [
  DECLARATION_VARIANTE, DECLARATION_CERVEAU, DECLARATION_NAVIGATION
];

/**
 * Celles que ce navigateur-ci saura exécuter.
 *
 * @param {string[]} [roles] ce que le navigateur a dit savoir faire
 * @returns {object[]} les déclarations à offrir au modèle
 */
export function declarationsPourCeNavigateur(roles = null) {
  const dits = Array.isArray(roles) ? roles.map((role) => String(role ?? "").trim()).filter(Boolean) : [];
  const sait = new Set(dits.length ? dits : ROLES_HISTORIQUES);

  return DECLARATIONS_DU_NAVIGATEUR.filter((outil) => sait.has(roleDuNavigateur(outil?.name)));
}
