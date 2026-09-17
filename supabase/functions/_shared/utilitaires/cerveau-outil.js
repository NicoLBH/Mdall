/**
 * « Lire le cerveau du projet », déclaré au modèle comme une fonction.
 *
 * ## Le défaut que ça répare
 *
 * On demandait au copilote comment l'application fonctionne, et il répondait
 * quelque chose de juste et de creux : « elle utilise une mémoire de projet »,
 * « elle intègre des agents spécialisés ». La même phrase vaut pour un projet
 * vide. Ce qu'on veut savoir, c'est **ce que ce projet-ci a dans la tête** —
 * combien de valeurs, combien de règles, et combien de chaînes se rejouent
 * vraiment.
 *
 * Le modèle ne peut pas le savoir : il reçoit la mémoire en prose, pas le
 * graphe. Ni les liens, ni leur couleur, ni la profondeur des chaînes. Le
 * laisser en parler revenait à lui faire dire du vraisemblable sur un dessin
 * qu'il n'a jamais vu — et c'est exactement ce qu'il faisait.
 *
 * ## Où il s'exécute, et pourquoi ce n'est pas ici
 *
 * **Au navigateur**, comme le moteur de variante et pour la même raison : le
 * graphe y est déjà — c'est le cerveau qu'on ouvre depuis la Mémoire. Le porter
 * au serveur en ferait un second calcul du même dessin, et deux dessins d'un
 * même projet finissent par ne plus se ressembler (règle 4).
 *
 * ## Ce qu'il rend, et ce que le modèle en fait
 *
 * Des **nombres**, et un **récit déjà écrit**. Le récit porte une grammaire
 * visuelle — un rond est une valeur, un cube est une règle, un lien bleu passe
 * par une règle, un lien orange non — et une grammaire ne se paraphrase pas :
 * elle se cite. Un modèle qui traduirait « cube » en « carré » ferait chercher
 * à l'écran quelque chose qui n'y est pas.
 */

/** Le nom de l'outil. Il voyage jusqu'au navigateur, qui route dessus. */
export const OUTIL_CERVEAU = "lire_le_cerveau";

/** La déclaration passée au modèle, dans la forme qu'attend l'API. */
export const DECLARATION_CERVEAU = {
  type: "function",
  name: OUTIL_CERVEAU,
  description: [
    "Lit le cerveau de ce projet — le graphe de son raisonnement — et rend ce qu'il contient :",
    "le nombre d'affirmations et de règles, les liens et combien d'entre eux passent par une",
    "règle, la longueur de la plus longue chaîne, les domaines qui pèsent, ce qui est signalé,",
    "ce qui pend. Il rend aussi un texte tout prêt qui décrit le dessin et sa grammaire.",
    "",
    "Appelle-le dès qu'une question porte sur ce que le projet sait, sur la façon dont Mdall",
    "raisonne, sur ce que l'application fait de la mémoire, ou dès qu'on te demande d'expliquer",
    "ou de montrer le raisonnement. Tu n'as pas le graphe : sans cet outil, tout ce que tu",
    "dirais du dessin serait deviné.",
    "",
    "Il ne calcule rien et n'écrit rien : c'est une lecture."
  ].join(" "),
  parameters: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false
  }
};

/**
 * Ce que le modèle doit savoir pour s'en servir sans se tromper.
 *
 * Dans les consignes et non dans la description : la description dit ce que
 * l'outil fait, les consignes disent comment se conduire avec ce qu'il rend.
 */
export const CONSIGNES_CERVEAU = [
  "",
  "L'outil `lire_le_cerveau` rend le graphe du raisonnement de ce projet :",
  "- **Reprends son champ `recit` tel quel**, dans ta réponse, sans le résumer ni le reformuler. Il porte la grammaire du dessin — rond, cube, lien bleu, lien orange — et ces mots sont ceux de l'écran : les traduire ferait chercher quelque chose qui n'y est pas.",
  "- Ce que tu ajoutes va **autour** : ce que la question demandait, ce que ces nombres veulent dire pour ce projet-là, ce qu'il faudrait faire ensuite. Pas une seconde description du dessin.",
  "- N'invente aucun chiffre du dessin. Tu n'as pas le graphe : tout ce que l'outil ne rend pas, tu ne le sais pas.",
  "- Le dessin est **posé dans ta réponse**, vivant, et s'ouvre en grand d'un bouton. Dis-le en une phrase plutôt que de tout décrire à sa place.",
  "",
  "**Propose-le sans qu'on te le demande.** Dès qu'une réponse parle de ce que le projet sait, de la façon dont il raisonne, de ce qui dépend de quoi, ou de ce que Mdall fait de la mémoire, appelle cet agent : montrer vaut mieux qu'énumérer, et l'utilisateur ne sait pas qu'il peut le demander. Ne le fais pas deux fois de suite dans une même conversation — un dessin par sujet suffit."
].join("\n");
