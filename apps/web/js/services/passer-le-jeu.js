/**
 * Passer le jeu de référence — **l'orchestration, et la lecture injectée.**
 *
 * Même forme que la batterie de perturbations, et pour les mêmes raisons : la
 * lecture coûte un appel et une facture, passée en paramètre tout s'éprouve sans
 * rien dépenser, et un lecteur qui tape le serveur se branche par la même
 * signature.
 *
 * ## Les deux refus
 *
 * 1. **un document annoté qu'on ne sait pas lire** ne se compte pas comme un
 *    échec de lecture : on ne sait rien de sa justesse si elle n'a pas eu lieu.
 *    Il se compte à part, sous son motif ;
 * 2. **une annotation sans relevé attendu** ne se confronte pas : la précision y
 *    vaudrait zéro sur tout ce qui est rendu, et le rappel serait sans objet.
 *    Un document dont on n'attend rien n'est pas un document facile, c'est une
 *    annotation qui n'a pas été écrite.
 */

import { confronter, leBilanDuJeu } from "./la-confrontation.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi un document annoté n'a pas été confronté. */
export const POURQUOI_PAS = {
  /** La lecture n'a pas abouti. */
  LECTURE_MANQUEE: "lecture_manquee",
  /** L'annotation n'attend aucun relevé : il n'y a rien à confronter. */
  RIEN_ATTENDU: "rien_attendu"
};

/**
 * **Le jeu se passe en paramètre, et n'a plus de défaut lu du disque.**
 *
 * Il valait `leJeuDeReference()`, qui lit un dossier. Deno n'a pas ce
 * dossier — et un défaut qui lève à l'import rendait ce module inimportable au
 * serveur, donc le jeu de référence inlançable depuis la console. L'appelant
 * dit maintenant d'où viennent ses annotations : du disque en ligne de
 * commande, du corpus descendu au serveur.
 *
 * @param {object} options
 * @param {Array} options.jeu les annotations
 * @param {function} options.lire `async ({document, famille}) => {ok, lecture}|{ok:false, motif}`
 */
export async function passerLeJeu({ jeu = [], lire = null } = {}) {
  const confrontations = [];
  const nonPassees = [];

  for (const annotation of (Array.isArray(jeu) ? jeu : [])) {
    if (!annotation.releve.length) {
      nonPassees.push({ document: annotation.document, pourquoiPas: POURQUOI_PAS.RIEN_ATTENDU,
        dit: "l'annotation n'attend aucun relevé : il n'y a rien à confronter" });
      continue;
    }

    const lu = await lire?.({ document: annotation.document, famille: annotation.famille });
    if (!lu?.ok) {
      nonPassees.push({ document: annotation.document, pourquoiPas: POURQUOI_PAS.LECTURE_MANQUEE,
        dit: `la lecture n'a pas abouti : ${texte(lu?.motif) || "cause inconnue"}` });
      continue;
    }

    confrontations.push(confronter(annotation, lu.lecture));
  }

  return {
    confrontations,
    nonPassees,
    bilan: { ...leBilanDuJeu(confrontations), nonPassees: nonPassees.length }
  };
}
