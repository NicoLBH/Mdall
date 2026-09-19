/**
 * Ce qu'on n'a pas su placer dans un mail, et la phrase qui le dit.
 *
 * ## Pourquoi cette liste vit seule
 *
 * Lire un fil de mails se fait en plusieurs passes — déplier le `.eml`,
 * séparer le propos de la citation, reconstituer le fil, relever ce qu'il
 * porte — et **chacune peut buter**. Si chaque passe nommait ses manques
 * elle-même, le même trou finirait écrit de trois façons, et l'écran devrait
 * savoir laquelle vient d'où.
 *
 * Ce qui remplace la mesure de fidélité d'un compte rendu n'est pas un
 * chiffre, mais une question : **qu'est-ce qu'on n'a pas su placer ?** La
 * réponse se fabrique à plusieurs endroits, mais elle se dit d'un seul
 * (règle 10).
 *
 * ## Un trou n'est pas une erreur
 *
 * Il ne fait rien échouer. Il accompagne ce qui a été lu, et dit sur quoi on
 * n'est pas sûr — pour que le lecteur sache où regarder, plutôt que de croire
 * que tout a été vu (règle 5).
 */

/** Ce qu'on peut ne pas savoir placer, nommé pour que l'écran puisse le dire. */
export const TROU = {
  PAS_UN_MAIL: "pas-un-mail",
  SANS_EXPEDITEUR: "sans-expediteur",
  SANS_DATE: "sans-date",
  DATE_ILLISIBLE: "date-illisible",
  FUSEAU_ABSENT: "fuseau-absent",
  SANS_IDENTITE: "sans-identite",
  EN_TETE_INDECHIFFRABLE: "en-tete-indechiffrable",
  LIGNE_EGAREE: "ligne-egaree",
  SANS_CORPS: "sans-corps",
  CORPS_NON_DECODE: "corps-non-decode",
  CORPS_EN_HTML: "corps-en-html",
  JEU_DE_SECOURS: "jeu-de-secours",
  FRONTIERE_ABSENTE: "frontiere-absente",
  FRONTIERE_NON_FERMEE: "frontiere-non-fermee",
  PIECE_SANS_NOM: "piece-sans-nom",
  CHEVRON_ISOLE: "chevron-isole",
  BANDEAU_PROBABLE: "bandeau-probable",
  RIEN_QUE_DES_CITATIONS: "rien-que-des-citations"
};

/** Un trou : ce qui manque, où, et ce qui était écrit à cet endroit. */
export function unTrou(quoi, ou, detail) {
  return detail === undefined ? { quoi, ou } : { quoi, ou, detail };
}

const PHRASES = {
  [TROU.PAS_UN_MAIL]: "ce fichier n'a pas l'allure d'un mail : aucun en-tête n'y a été reconnu",
  [TROU.SANS_EXPEDITEUR]: "ce message ne dit pas qui l'a écrit",
  [TROU.SANS_DATE]: "ce message ne porte pas de date",
  [TROU.DATE_ILLISIBLE]: "la date de ce message ne se lit pas",
  [TROU.FUSEAU_ABSENT]: "la date de ce message ne dit pas son fuseau : l'heure affichée peut être décalée",
  [TROU.SANS_IDENTITE]: "ce message n'a pas d'identifiant : son rang dans le fil se devinera par sa date",
  [TROU.EN_TETE_INDECHIFFRABLE]: "un en-tête encodé n'a pas pu être lu, et s'affiche tel quel",
  [TROU.LIGNE_EGAREE]: "une ligne des en-têtes n'a pas été reconnue, et a été laissée de côté",
  [TROU.SANS_CORPS]: "aucun texte n'a été trouvé dans ce message",
  [TROU.CORPS_NON_DECODE]: "le corps de ce message n'a pas pu être décodé",
  [TROU.CORPS_EN_HTML]: "ce message n'existe qu'en HTML : son texte a été réduit, la mise en forme est perdue",
  [TROU.JEU_DE_SECOURS]: "le jeu de caractères annoncé ne tenait pas : le texte a été lu autrement",
  [TROU.FRONTIERE_ABSENTE]: "une partie annonce plusieurs morceaux, et sa frontière est introuvable",
  [TROU.FRONTIERE_NON_FERMEE]: "le message s'arrête avant sa fin : le dernier morceau est peut-être incomplet",
  [TROU.PIECE_SANS_NOM]: "une pièce jointe n'a pas de nom",
  [TROU.CHEVRON_ISOLE]: "une ligne commence par « > » sans faire bloc : elle a été gardée dans le propos",
  [TROU.BANDEAU_PROBABLE]: "des en-têtes de message traînent dans le propos : une citation n'a pas été reconnue",
  [TROU.RIEN_QUE_DES_CITATIONS]: "ce message n'ajoute rien de son auteur : il ne fait que citer"
};

/**
 * La phrase d'un trou.
 *
 * Elle vit ici, et pas dans l'écran : les mêmes trous seront montrés par le
 * fil, par le relevé et par la proposition, et un même manque ne se dit pas de
 * trois façons selon l'endroit (règle 10).
 */
export function phraseDuTrou(trou) {
  const connue = PHRASES[trou?.quoi];
  if (!connue) return "quelque chose n'a pas pu être placé";
  return trou.ou ? `${connue} (${trou.ou})` : connue;
}
