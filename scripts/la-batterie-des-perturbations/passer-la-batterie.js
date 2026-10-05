/**
 * Passer la batterie — **l'orchestration, et la lecture injectée.**
 *
 * ## Pourquoi `lire` est un paramètre
 *
 * La lecture coûte un appel et une facture. Passée en paramètre, la batterie
 * entière s'éprouve sans dépenser un centime : les épreuves lui donnent un
 * lecteur de carton qui rend ce qu'on veut, y compris ce qu'on redoute. C'est la
 * seule façon de savoir que la batterie **attrape** ce qu'elle prétend attraper
 * — un outil de mesure qu'on n'a jamais vu tomber ne mesure rien.
 *
 * C'est aussi ce qui rend l'outil extensible : un lecteur qui tape le serveur,
 * un autre qui rejoue des lectures gelées, un troisième qui compare deux
 * consignes. La batterie ne connaît que la signature.
 *
 * ## Les trois refus
 *
 * Ils sont la raison d'être de ce module, plus encore que la boucle :
 *
 *   1. **une perturbation qui rend le document inchangé** est refusée, et non
 *      comptée comme une réussite. C'est le piège central : la lecture serait
 *      identique par construction, la relation tiendrait toujours, et la
 *      batterie rendrait du vert sur un travail qu'elle n'a pas fait ;
 *   2. **une lecture qui n'aboutit pas** n'est pas un défaut de l'analyse — on
 *      ne sait rien de sa justesse si elle n'a pas eu lieu. Elle se compte à
 *      part, sous son motif ;
 *   3. **une relation sans objet** se compte à part elle aussi, parce qu'une
 *      épreuve qui n'a pas eu lieu n'est pas une épreuve qui passe (règle 5).
 */

import { lempreinteDuneLecture } from "../../apps/web/js/services/lempreinte-dune-lecture.js";
import { laRelationTient, VERDICT } from "./la-relation.js";
import { lesInvariantsDUneLecture } from "../../apps/web/js/services/les-invariants-dune-lecture.js";
import { LES_PERTURBATIONS } from "./les-perturbations.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi une épreuve n'a pas eu lieu. */
export const POURQUOI_PAS = {
  /** La perturbation ne s'applique pas à ce document. */
  INAPPLICABLE: "inapplicable",
  /** Elle a rendu le document inchangé : on refuse de compter ça. */
  SANS_EFFET: "sans_effet",
  /** Une des deux lectures n'a pas abouti. */
  LECTURE_MANQUEE: "lecture_manquee"
};

/**
 * Une épreuve : un document, une perturbation.
 *
 * @param {object} document `{nom, famille, texte}`
 * @param {object} perturbation une entrée de `LES_PERTURBATIONS`
 * @param {function} lire `async ({texte, famille, nom}) => {ok, lecture}|{ok:false, motif}`
 */
export async function passerUneEpreuve(document = null, perturbation = null, lire = null) {
  const socle = {
    document: texte(document?.nom),
    famille: texte(document?.famille),
    perturbation: texte(perturbation?.nom),
    relation: texte(perturbation?.relation)
  };

  const fait = perturbation?.applique?.(document?.texte ?? "") ?? null;
  if (!fait) {
    return { ...socle, verdict: VERDICT.SANS_OBJET, pourquoiPas: POURQUOI_PAS.INAPPLICABLE,
      dit: "ce document ne porte pas de quoi appliquer cette perturbation" };
  }

  /**
   * **Le refus central.** Une perturbation qui rend le texte inchangé n'a pas
   * perturbé : la lecture sera identique par construction, et la relation
   * tiendra sans rien avoir éprouvé.
   */
  if (texte(fait.texte) === texte(document?.texte)) {
    return { ...socle, verdict: VERDICT.SANS_OBJET, pourquoiPas: POURQUOI_PAS.SANS_EFFET,
      dit: "la perturbation dit avoir agi et rend le document inchangé : "
        + "l'épreuve tiendrait par construction" };
  }

  const [avant, apres] = await Promise.all([
    lire?.({ texte: document?.texte ?? "", famille: socle.famille, nom: socle.document }),
    lire?.({ texte: fait.texte, famille: socle.famille, nom: `${socle.document} (perturbé)` })
  ]);

  for (const [quoi, lu] of [["d'origine", avant], ["du document perturbé", apres]]) {
    if (!lu?.ok) {
      return { ...socle, verdict: VERDICT.SANS_OBJET, pourquoiPas: POURQUOI_PAS.LECTURE_MANQUEE,
        dit: `la lecture ${quoi} n'a pas abouti : ${texte(lu?.motif) || "cause inconnue"}` };
    }
  }

  const empreinteAvant = lempreinteDuneLecture(avant.lecture, socle.famille);
  const empreinteApres = lempreinteDuneLecture(apres.lecture, socle.famille);
  const verdict = laRelationTient(socle.relation, empreinteAvant, empreinteApres, fait);

  return {
    ...socle,
    ...verdict,
    perturbe: fait.dit,
    /**
     * Les invariants des deux lectures, posés dans le même geste. Ils
     * n'entrent pas dans le verdict de la relation : une citation introuvable
     * est un défaut **en soi**, qu'une relation qui tient ne rachète pas.
     */
    invariants: {
      avant: lesInvariantsDUneLecture(empreinteAvant, document?.texte ?? ""),
      apres: lesInvariantsDUneLecture(empreinteApres, fait.texte)
    }
  };
}

/**
 * Toute la batterie : chaque document, chaque perturbation.
 *
 * **En série.** Chaque épreuve coûte deux lectures ; les lancer toutes d'un coup
 * se ferait limiter, et l'on perdrait la batterie entière pour avoir voulu aller
 * vite. C'est déjà la règle de la lecture d'un lot, et elle vaut ici en pire.
 */
export async function passerLaBatterie({
  corpus = [], lire = null, perturbations = LES_PERTURBATIONS, surEpreuve = null
} = {}) {
  const epreuves = [];

  for (const document of (Array.isArray(corpus) ? corpus : [])) {
    for (const perturbation of (Array.isArray(perturbations) ? perturbations : [])) {
      const faite = await passerUneEpreuve(document, perturbation, lire);
      epreuves.push(faite);
      await surEpreuve?.(faite);
    }
  }

  return { epreuves, bilan: leBilan(epreuves) };
}

/**
 * Le bilan — **et les sans-objet comptés à part, jamais avec les réussites.**
 *
 * Un taux de réussite qui mêle les deux monterait quand la batterie cesse de
 * fonctionner, ce qui est la pire propriété possible pour un indicateur.
 */
export function leBilan(epreuves = []) {
  const toutes = Array.isArray(epreuves) ? epreuves : [];
  const parVerdict = (quel) => toutes.filter((une) => une?.verdict === quel);

  const tiennent = parVerdict(VERDICT.TIENT).length;
  const tombees = parVerdict(VERDICT.TOMBE).length;
  const sansObjet = parVerdict(VERDICT.SANS_OBJET);

  /**
   * **Les invariants posés, et non seulement ceux qui sont tombés.**
   *
   * `invariantsTombes` vivait seul, sans assiette : « 0 invariant tombé » se
   * lit comme un succès, et c'est indiscernable de « aucun invariant posé » —
   * qui est le cas d'une lecture muette, dont tout invariant tient par
   * construction. Le même défaut que cet outil existe pour attraper, dans
   * l'outil lui-même (règle 5).
   */
  const lesInvariants = toutes.flatMap((une) => [
    ...(une?.invariants?.avant ?? []), ...(une?.invariants?.apres ?? [])
  ]);
  const invariantsTombes = lesInvariants.filter((un) => un?.tient === false).length;

  return {
    posees: toutes.length,
    tiennent,
    tombees,
    sansObjet: sansObjet.length,
    /** Pourquoi les sans-objet n'ont pas eu lieu, comptés par motif. */
    pourquoiPas: sansObjet.reduce((compte, une) => {
      const quoi = texte(une?.pourquoiPas) || "relation sans objet";
      return { ...compte, [quoi]: (compte[quoi] ?? 0) + 1 };
    }, {}),
    invariants: lesInvariants.length,
    invariantsTombes,
    /**
     * **Sur les épreuves qui ont eu lieu, et le dénominateur est dit.** « 6 sur
     * 8 » ne veut rien dire si l'on ignore que quatre autres n'ont pas été
     * posées.
     */
    eues: tiennent + tombees
  };
}
