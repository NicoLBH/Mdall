/**
 * L'ordre des documents dans le tableau d'*Analyse de documents*.
 *
 * ## La question posée
 *
 * > « Trier par date de documents si jamais celui-ci en a une, trier par date
 * >   d'analyse (pour savoir lequel a été analysé en dernier). »
 *
 * Ce sont deux questions, et elles n'ont pas le même usage. « Lequel a été
 * analysé en dernier » est la question d'un essai : on vient de lancer une
 * lecture et l'on veut la retrouver. « Le compte rendu du 16 avril » est la
 * question du chantier : on cherche un document par sa date, pas par le jour
 * où on l'a lu.
 *
 * ## Les deux dates existent déjà, et séparément
 *
 * `unDocumentAnalyse` les garde distinctes depuis le début : `quand` est celle
 * du document — la réunion, l'établissement du rapport —, `lueLe` celle de
 * l'analyse. Rien à inventer, et surtout rien à fondre.
 *
 * ## Et chacune se lit dans les deux sens
 *
 * « Lequel vient d'être lu » et « lequel a été lu il y a le plus longtemps »
 * sont la même date parcourue à l'envers, et la seconde est celle qu'on pose
 * quand on cherche ce qui dort : un document lu il y a six mois par un procédé
 * qu'on a changé depuis. Les deux axes se parcourent donc dans les deux sens,
 * ce qui fait quatre ordres — tous dérivés des deux axes, et aucun écrit deux
 * fois.
 *
 * ## Un document sans date ne se range pas au hasard
 *
 * C'est la même règle que `tri-des-sujets.js`, et elle vaut doublement ici :
 * **beaucoup de documents n'ont pas de date**. Un fil de mails en cours, un
 * rapport dont la lecture n'a pas trouvé le cartouche, un document en attente
 * de lecture — aucun ne porte `quand`.
 *
 * Ils restent **derrière**, dans leur ordre d'origine. En tête, ils se liraient
 * comme les plus récents ; entremêlés, on leur inventerait une place. Et
 * l'écran dit combien il y en a, sans quoi un tri par date du document
 * paraîtrait n'avoir rien trié.
 *
 * ## Il ne filtre pas et ne compte pas
 *
 * Il reçoit la liste déjà filtrée et rend la même, dans un autre ordre : le
 * nombre de documents ne change jamais en triant, et c'est ce qui permet au
 * compteur et à la liste de rester d'accord.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les deux axes de rangement. Ce ne sont **pas** les ordres : un axe se parcourt
 * dans les deux sens, et c'est le sens qui fait l'ordre.
 */
export const TRI_DES_DOCUMENTS = {
  ANALYSE: "analyse",
  DOCUMENT: "document"
};

/**
 * Les deux sens.
 *
 * ## Pourquoi les deux, et nommés par ce qu'ils mettent en tête
 *
 * « Croissant » et « décroissant » demandent de savoir croissant **de quoi** :
 * d'une date, et une date croissante met le plus ancien devant. On le relit
 * deux fois à chaque clic. Nommés par ce qui arrive en tête — le plus récent,
 * le plus ancien —, il n'y a plus rien à retourner dans sa tête.
 */
export const SENS = { RECENT: "recent", ANCIEN: "ancien" };

/**
 * Ce que chaque axe range, et ce qu'il répond dans chaque sens.
 *
 * **Les quatre ordres se dérivent d'ici**, et ne sont pas écrits à la main :
 * quatre entrées recopiées, c'est un libellé qu'on corrige d'un côté et pas de
 * l'autre, et un champ qui finit par ne plus désigner la même date (règle 10).
 */
const LES_AXES = [
  {
    axe: TRI_DES_DOCUMENTS.ANALYSE,
    champ: "lueLe",
    dit: {
      [SENS.RECENT]: {
        libelle: "Analysé en dernier",
        question: "Lequel vient d'être lu ?"
      },
      [SENS.ANCIEN]: {
        libelle: "Analysé en premier",
        question: "Lequel a été lu il y a le plus longtemps ?"
      }
    }
  },
  {
    axe: TRI_DES_DOCUMENTS.DOCUMENT,
    champ: "quand",
    dit: {
      [SENS.RECENT]: {
        libelle: "Document le plus récent",
        question: "Où en est le chantier ?"
      },
      [SENS.ANCIEN]: {
        libelle: "Document le plus ancien",
        question: "Par quoi le chantier a-t-il commencé ?"
      }
    }
  }
];

/** La clé d'un ordre : son axe et son sens, séparés. */
export function laCleDuTri(axe, sens) {
  return `${texte(axe)}:${texte(sens)}`;
}

/**
 * Les quatre ordres offerts, dans l'ordre du menu.
 *
 * L'axe de l'analyse d'abord, parce que c'est celui sur lequel on atterrit et
 * celui qu'on veut pendant un essai : on vient de lancer une lecture, on la
 * cherche.
 */
export const LES_TRIS_DES_DOCUMENTS = LES_AXES.flatMap((un) => (
  [SENS.RECENT, SENS.ANCIEN].map((sens) => ({
    cle: laCleDuTri(un.axe, sens),
    axe: un.axe,
    sens,
    champ: un.champ,
    libelle: un.dit[sens].libelle,
    question: un.dit[sens].question
  }))
));

/** L'ordre d'arrivée : le plus récemment analysé en tête. */
export const LE_TRI_PAR_DEFAUT = laCleDuTri(TRI_DES_DOCUMENTS.ANALYSE, SENS.RECENT);

/**
 * L'ordre demandé, ramené à l'un de ceux qui existent.
 *
 * **Un ordre inconnu retombe sur celui d'arrivée**, et c'est ce qui permet à un
 * écran ouvert avant ce changement — qui gardait `"analyse"` sans son sens — de
 * s'ouvrir sur ce qu'il montrait hier, plutôt que sur un tableau non rangé.
 */
export function leTriDesDocumentsValide(tri) {
  const demande = texte(tri);
  return LES_TRIS_DES_DOCUMENTS.some((un) => un.cle === demande)
    ? demande
    : LE_TRI_PAR_DEFAUT;
}

/** Un ordre entier — son axe, son sens, son nom, ce qu'il répond. */
export function leTriDit(tri) {
  const cle = leTriDesDocumentsValide(tri);
  return LES_TRIS_DES_DOCUMENTS.find((un) => un.cle === cle);
}

/**
 * La date sur laquelle un ordre range, ou `null`.
 *
 * `null` quand le document n'en porte pas, ou quand elle ne se lit pas —
 * **jamais la date du jour**. Un document sans date remonterait sinon en tête
 * comme s'il venait d'arriver, et c'est le défaut que `tri-des-sujets.js` a
 * déjà payé une fois.
 */
export function linstantDuDocument(document, tri) {
  const champ = leTriDit(tri).champ;
  const dit = texte(document?.[champ]);
  if (!dit) return null;

  const lu = Date.parse(dit);
  return Number.isFinite(lu) ? lu : null;
}

/**
 * Les documents, rangés — du plus récent au plus ancien.
 *
 * La liste d'origine n'est jamais modifiée : elle est aussi celle que comptent
 * les pastilles, et un tri en place les ferait compter dans un ordre qu'elles
 * n'ont pas demandé.
 *
 * Les documents sans date restent derrière, dans leur ordre d'origine — le tri
 * de JavaScript est stable, ce qui suffit à le garantir.
 */
export function trierLesDocuments(documents = [], tri = LE_TRI_PAR_DEFAUT) {
  const tous = Array.isArray(documents) ? documents : [];
  const ce = leTriDit(tri);

  return tous.slice().sort((gauche, droite) => {
    const a = linstantDuDocument(gauche, tri);
    const b = linstantDuDocument(droite, tri);
    /**
     * **Un document sans date reste derrière dans les deux sens.**
     *
     * On pourrait croire que « le plus ancien d'abord » devrait le mettre en
     * tête — après tout, il n'a pas de date, donc il pourrait être très vieux.
     * C'est exactement le raisonnement à ne pas faire : on ne sait pas quand il
     * date, et le poser en tête d'un ordre chronologique lui invente une place
     * (règle 5). Il reste derrière, et l'écran dit combien ils sont.
     */
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return ce.sens === SENS.ANCIEN ? a - b : b - a;
  });
}

/**
 * Combien de documents n'ont pas la date sur laquelle on range.
 *
 * **L'écran le dit**, sinon un tri par date du document paraîtrait n'avoir rien
 * trié : la moitié de la liste serait restée en place, et rien n'expliquerait
 * pourquoi.
 */
export function combienSansLaDate(documents = [], tri = LE_TRI_PAR_DEFAUT) {
  return (Array.isArray(documents) ? documents : [])
    .filter((un) => linstantDuDocument(un, tri) === null).length;
}

/**
 * Ce que l'écran dit de l'ordre, sous l'en-tête.
 *
 * `""` quand tout est daté et que l'ordre est celui d'origine : il n'y a alors
 * rien à expliquer, et une phrase qui s'affiche toujours ne se lit jamais.
 */
export function ceQueLeTriDit(documents = [], tri = LE_TRI_PAR_DEFAUT) {
  const ce = leTriDit(tri);
  const sans = combienSansLaDate(documents, ce.cle);
  if (!sans) return "";

  /**
   * **Le verbe s'accorde aussi.**
   *
   * « 1 document ne portent pas » — l'épreuve l'a trouvé au premier passage.
   * `lePluriel` accorde les noms ; un verbe demande ses deux formes, et les
   * écrire côte à côte est la seule façon de ne pas en oublier une.
   */
  const plusieurs = sans > 1;
  const quoi = ce.axe === TRI_DES_DOCUMENTS.DOCUMENT
    ? (plusieurs ? "ne portent pas de date de document" : "ne porte pas de date de document")
    : (plusieurs ? "n'ont pas encore été analysés" : "n'a pas encore été analysé");

  return `${sans} document${plusieurs ? "s" : ""} ${quoi} : `
    + `${plusieurs ? "ils restent" : "il reste"} à la fin, dans l'ordre d'arrivée.`;
}
