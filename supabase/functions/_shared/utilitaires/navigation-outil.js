/**
 * « Ouvrir un écran », déclaré au modèle comme une fonction.
 *
 * ## Le défaut que ça répare
 *
 * Depuis le Copilote de tous les projets, on écrit « ouvre-moi le Copilote du
 * Restaurant scolaire au Reposoir ». Le modèle sait de quoi on parle — la liste
 * des projets est dans son contexte — et répondait « rendez-vous dans l'onglet
 * Atelier, puis Copilote ». On refaisait alors à la main le chemin qu'il venait
 * de décrire. Une application qui sait où sont ses écrans ne devrait pas faire
 * épeler l'itinéraire.
 *
 * ## Il nomme le projet, il ne choisit pas son identifiant
 *
 * C'est la règle du contexte transversal, écrite dans `profil-de-travail.js` :
 * le modèle **nomme** le projet à ouvrir plutôt que d'inventer un chiffre
 * plausible. Un identifiant deviné mènerait à un projet réel — celui de
 * quelqu'un d'autre —, et rien à l'écran ne dirait que ce n'était pas celui
 * qu'on demandait.
 *
 * Le nom, lui, se rapproche de ce que la personne suit vraiment, et le
 * rapprochement se fait au navigateur, qui a la liste. Quand deux projets
 * répondent, on ne choisit pas : on le dit (règle 5).
 *
 * ## Où il s'exécute, et pourquoi ce n'est pas ici
 *
 * **Au navigateur**, comme le moteur de variante et la lecture du cerveau. Le
 * serveur ne peut pas changer l'adresse d'une page, et il n'a pas la liste des
 * projets de la personne — le navigateur l'a déjà chargée pour le contexte.
 */

import { CLES_DES_ECRANS, ECRANS_DU_PROJET } from "./ecrans-du-projet.js";

/** Le nom de l'outil. Il reste ici : le navigateur route sur un rôle, pas sur un nom. */
export const OUTIL_NAVIGATION = "ouvrir_un_ecran";

/** Ce que chaque destination montre, tel que la déclaration le dit au modèle. */
const CE_QUE_MONTRE_CHAQUE_ECRAN = ECRANS_DU_PROJET
  .map((ecran) => `${ecran.cle} : ${ecran.quoi}`)
  .join(" ");

/** La déclaration passée au modèle, dans la forme qu'attend l'API. */
export const DECLARATION_NAVIGATION = {
  type: "function",
  name: OUTIL_NAVIGATION,
  description: [
    "Ouvre un écran d'un projet dans l'application, et y emmène la personne.",
    "",
    "Appelle-le dès qu'on te demande d'ouvrir, d'aller, de montrer ou d'afficher un écran —",
    "« ouvre-moi le copilote du projet X », « montre-moi les sujets de Y », « les fichiers de Z ».",
    "C'est la seule façon d'y aller : décrire le chemin par écrit oblige à le refaire à la main.",
    "",
    "Il n'ouvre rien tant que le projet n'est pas reconnu : si le nom que tu donnes désigne",
    "plusieurs projets, ou aucun, il te le dit et personne n'est déplacé. Dans ce cas, redis la",
    "question à la personne — ne rappelle pas l'outil avec un nom que tu aurais choisi.",
    "",
    "Il ne lit rien du projet et n'écrit rien : c'est un déplacement.",
    "",
    `Ce que chaque écran montre — ${CE_QUE_MONTRE_CHAQUE_ECRAN}`
  ].join(" "),
  parameters: {
    type: "object",
    properties: {
      projet: {
        type: "string",
        description: "Le nom du projet, tel qu'il figure dans la liste des projets de la personne. "
          + "Recopie-le, ne l'abrège pas, et n'invente jamais un identifiant."
      },
      ecran: {
        type: "string",
        enum: CLES_DES_ECRANS,
        description: "L'écran à ouvrir dans ce projet."
      }
    },
    required: ["projet", "ecran"],
    additionalProperties: false
  }
};

/**
 * Ce que le modèle doit savoir pour s'en servir sans se tromper.
 *
 * Dans les consignes et non dans la description : la description dit ce que
 * l'outil fait, les consignes disent comment se conduire avec ce qu'il rend.
 */
export const CONSIGNES_NAVIGATION = [
  "",
  "L'outil `ouvrir_un_ecran` emmène la personne sur un écran d'un projet :",
  "- **Le déplacement a lieu, il ne s'annonce pas.** N'écris jamais « je vous emmène vers… », « je vais ouvrir… » ni « rendez-vous dans l'onglet Atelier » : appelle l'outil, et dis ensuite, en une phrase, où l'on est arrivé.",
  "- **Ne demande pas confirmation.** « Voulez-vous que je l'ouvre ? » ajoute un tour pour un geste qui se défait d'un clic. Quelqu'un qui écrit « ouvre-moi » ou « je voudrais parler au copilote de tel projet » a déjà demandé.",
  "- **N'écris jamais que la personne est quelque part si cet outil n'a pas tourné dans ce message-ci.** L'écran, lui, ne bouge pas : dire « vous êtes maintenant dans le copilote de ce projet » alors qu'on n'y est pas se voit immédiatement, et fait douter de tout le reste de ce que tu dis.",
  "- Le nom du projet se **recopie** depuis la liste de ses projets. Tu n'as pas d'identifiant, et un identifiant deviné mène au projet de quelqu'un d'autre.",
  "- Quand l'outil répond qu'il n'a pas reconnu le projet, ou que plusieurs répondent, **personne n'a bougé**. Redis la question — cite les projets qu'il te rend — et attends la réponse. Ne rappelle pas l'outil avec un nom choisi par toi : ce serait décider à la place de quelqu'un.",
  "- Tu ne sais rien de ce que l'écran contient : tu l'ouvres, tu ne le lis pas. N'annonce aucune valeur du projet d'après cet appel."
].join("\n");
