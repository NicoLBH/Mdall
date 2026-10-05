/**
 * Les faits datés — **l'unité n'est pas le document, c'est le fait.**
 *
 * ## Ce que cela change
 *
 * Un document n'a pas *une* date : il a la sienne, et il parle d'événements qui
 * ont chacun la leur. Un compte rendu du 30 avril peut dire « le ferraillage a
 * été coulé le 22 avril » et « la reprise est prévue le 15 mai ». Trois dates,
 * trois natures.
 *
 * Ordonner les **documents** suffisait pour décider d'une fermeture — c'est ce
 * que fait `la-chronologie-des-sources.js`, et sa doctrine reste entière.
 * Ordonner les **faits** est ce qu'il faut pour chercher un enchaînement
 * reproductible, parce que c'est entre les faits que l'enchaînement se produit.
 *
 * ## `quand` et `dou.quand` sont deux choses
 *
 * Et c'est tout l'intérêt. Un fait du 22 avril rapporté le 30 avril entre dans
 * l'histoire à sa place, **et l'on sait aussi quand on l'a appris**. La seconde
 * date explique pourquoi personne n'a réagi avant le 30 — ce qui est souvent la
 * vraie question.
 *
 * ## Pourquoi la projection est ici et non dans le registre des familles
 *
 * Le document de stratégie disait qu'elle devait vivre dans
 * `les-familles-de-document.js`, « et nulle part ailleurs ». Elle n'y est pas,
 * et c'est un choix qu'il faut assumer plutôt que taire :
 *
 *   * le registre est chargé par **tous** les écrans ; l'extraction des faits ne
 *     sert qu'à la ligne du temps, et l'y mettre alourdirait le navigateur de
 *     tous pour une mécanique que peu d'écrans emploient ;
 *   * la même décision avait déjà été prise pour l'empreinte d'une lecture, et
 *     deux conventions pour la même question coûtent plus que la seconde place.
 *
 * Ce qui rend la seconde place tenable est qu'elle **refuse** : une famille
 * absente d'ici lève, elle ne se saute pas. Un moteur qui ignore poliment ce
 * qu'il ne sait pas faire rend une chronologie sur un corpus qu'il n'a pas lu.
 */

import { FAMILLE } from "./les-familles-de-document.js";
import { leJourDeLaSource } from "./la-chronologie-des-sources.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Ce qu'un fait est, et donc ce qu'il a le droit de faire.
 *
 * **La nature n'est pas une étiquette de classement.** Elle décide : un constat
 * dit ce qui a eu lieu, un engagement dit ce qui devrait avoir lieu, et les
 * ranger ensemble sur une même ligne ferait lire une promesse comme un fait
 * accompli — c'est-à-dire la confusion la plus chère du bâtiment.
 */
export const NATURE = {
  /** Ce qui a été observé. Daté du jour où ça a eu lieu. */
  CONSTAT: "constat",
  /** Ce qui est promis. Daté de l'échéance, et donc **dans le futur**. */
  ENGAGEMENT: "engagement",
  /** Un verdict de contrôle. Daté du rapport qui le porte. */
  AVIS: "avis"
};

/** Ce qu'on écrit à l'écran pour chaque nature. */
export const CE_QUE_DIT_LA_NATURE = {
  [NATURE.CONSTAT]: "constaté",
  [NATURE.ENGAGEMENT]: "promis pour",
  [NATURE.AVIS]: "avis rendu"
};

/**
 * Un fait daté, ramené à la forme commune.
 *
 * **`null` quand il n'est pas datable**, et jamais un fait sans date : une suite
 * fausse est pire qu'une suite incomplète (règle 5). Ce qu'on ne sait pas dater
 * se dit, et ne s'insère pas — c'est la troisième règle de la ligne du temps, et
 * elle se tient ici, à la source.
 */
export function unFaitDate({
  quand = "", dit = "", nature = "", reference = "", dou = null
} = {}) {
  const jour = leJourDeLaSource(quand);
  if (!jour || !texte(dit) || !CE_QUE_DIT_LA_NATURE[texte(nature)]) return null;

  return {
    /** Le jour de l'événement. Pas celui du document. */
    quand: jour,
    dit: texte(dit),
    nature: texte(nature),
    reference: texte(reference),
    /** Le document qui le rapporte, **et sa propre date**. */
    dou: {
      document: texte(dou?.document),
      famille: texte(dou?.famille),
      /** Le jour où on l'a appris. C'est lui qui explique les délais de réaction. */
      quand: leJourDeLaSource(dou?.quand)
    }
  };
}

/**
 * Ce que chaque famille produit comme faits datés.
 *
 * **Une famille absente lève.** Voir le cartouche du module : un moteur qui
 * saute en silence ce qu'il ne sait pas lire rend une chronologie sur un corpus
 * qu'il n'a pas lu.
 */
const CE_QUE_LA_FAMILLE_DATE = {
  /**
   * Un avis de bureau de contrôle est daté **du rapport qui le porte**.
   *
   * Il n'a pas de date propre : le bureau se prononce le jour de son rapport, et
   * lui prêter la date de l'ouvrage examiné ferait remonter un avis d'avril au
   * mois de la coulée. C'est le cas où `quand` et `dou.quand` coïncident, et
   * c'est normal — ils ne coïncident pas toujours, voilà tout.
   */
  [FAMILLE.CONTROLE]: (lecture, dou) => liste(lecture?.avis).map((un) => unFaitDate({
    quand: dou?.quand,
    dit: [texte(un?.intitule), texte(un?.marque) && `— ${texte(un.marque)}`, texte(un?.constat)]
      .filter(Boolean).join(" "),
    nature: NATURE.AVIS,
    reference: texte(un?.reference),
    dou
  })),

  /**
   * Un point de compte rendu produit **jusqu'à deux faits**, et c'est voulu.
   *
   * Sa colonne de fermeture — « coulé le 22 avril » — est un constat daté du
   * jour où la chose a eu lieu. Son échéance — « reprise prévue le 15 mai » —
   * est un engagement daté du futur. Les fondre en un seul fait à la date de la
   * réunion perdrait exactement ce que la ligne du temps existe pour voir.
   *
   * Et le point sans aucune des deux reste un constat, daté de la réunion : le
   * document l'a bien relevé ce jour-là.
   */
  [FAMILLE.CR]: (lecture, dou) => liste(lecture?.points).flatMap((un) => {
    const quoi = [texte(un?.titre), texte(un?.description)].filter(Boolean).join(" — ");
    const reference = texte(un?.reference);

    const faits = [unFaitDate({
      quand: texte(un?.faitLe) || dou?.quand,
      dit: quoi,
      nature: NATURE.CONSTAT,
      reference,
      dou
    })];

    if (texte(un?.echeance)) {
      faits.push(unFaitDate({
        quand: un.echeance,
        dit: quoi,
        nature: NATURE.ENGAGEMENT,
        reference,
        dou
      }));
    }

    return faits;
  })
};

/** Les familles dont on sait tirer des faits datés. */
export const LES_FAMILLES_DATEES = Object.keys(CE_QUE_LA_FAMILLE_DATE);

/**
 * Les faits datés d'une lecture.
 *
 * @param {object} lecture la lecture, telle qu'elle est gelée
 * @param {object} dou `{document, famille, quand}` — le document, et **sa** date
 * @throws si la famille n'a pas de projection
 */
export function lesFaitsDatesDuneLecture(lecture = null, dou = null) {
  const famille = texte(dou?.famille);
  const projeter = CE_QUE_LA_FAMILLE_DATE[famille];
  if (!projeter) {
    throw new Error(`La ligne du temps ne sait pas dater les faits de la famille `
      + `« ${famille || "(vide)"} » (elle sait : ${LES_FAMILLES_DATEES.join(", ")}).`);
  }

  const tous = projeter(lecture, dou);

  /**
   * **Ce qui n'a pas pu être daté se compte, et ne s'insère pas.**
   *
   * `unFaitDate` rend `null` plutôt qu'un fait sans date ; les compter ici dit
   * combien de la lecture échappe à la ligne du temps. Les taire ferait croire
   * que tout y est entré.
   */
  return {
    faits: tous.filter(Boolean),
    sansDate: tous.filter((un) => un === null).length
  };
}
