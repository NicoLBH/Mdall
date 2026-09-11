/**
 * Un avis de bureau de contrôle, tel qu'il se propose à la mémoire.
 *
 * ## Pourquoi l'avis entre en mémoire
 *
 * Il était lu et il restait dehors. Le moteur d'extraction sait depuis
 * longtemps tirer les avis d'un rapport — leur numéro, leur intitulé, leur
 * teneur, leur page —, et tout cela vivait dans une analyse : un tableau qu'on
 * consulte, que rien ne cite, et dont rien ne dépend.
 *
 * Or un avis de contrôle technique est un **fait sur le projet**, daté, signé
 * par un organisme qui engage sa responsabilité. C'est un `constat` au sens de
 * la taxonomie — qui le nomme d'ailleurs en exemple —, et un constat se verse
 * comme le reste : par une proposition que quelqu'un signe
 * (`docs/fondamentaux.md`, règle 1).
 *
 * ## Ce que le versement porte, et que rien d'autre ne portait
 *
 * **Qui l'a émis.** C'est le piège que le plan avait nommé : une affirmation
 * porte `decided_by`, qui est l'utilisateur Mdall ayant signé la proposition. Si
 * l'on s'en contentait, la mémoire dirait que le stagiaire a rendu un avis
 * favorable. L'organisme qui engage sa responsabilité est donc écrit
 * séparément, et il ne se déduit de rien.
 *
 * **Sur quoi il porte.** La liaison proposée par `services/avis-liaison.js`
 * voyage dans le payload. Elle ne devient un engagement qu'après la fusion —
 * c'est-à-dire après qu'un humain a signé la proposition qui la portait. La
 * signature **est** la confirmation ; il n'y a pas de second geste à faire, et
 * pas de file d'attente (règle 12).
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne juge pas l'avis. Favorable, suspendu, défavorable : la teneur se verse
 * telle qu'elle est écrite, et rien n'en découle ici. Un avis défavorable
 * s'accroche exactement comme un avis favorable — c'est même celui-là qu'on
 * veut voir tomber quand la valeur change.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";
import { LIAISON, intituleDeLAvis, liaisonsProposees } from "./avis-liaison.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le sujet d'un avis : son numéro le distingue, et rien d'autre ne le peut. */
export function sujetDeLAvis(avis = null) {
  const reference = texte(avis?.value?.external_reference_raw) || texte(avis?.reference);
  return reference ? `Avis de contrôle technique n° ${reference}` : "";
}

/** Ce que l'avis dit, tel que le rapport l'écrit. */
function teneurDeLAvis(avis = null) {
  return texte(avis?.opinion_label)
    || texte(avis?.value?.opinion_raw)
    || texte(avis?.opinion_raw)
    || "sans teneur lisible";
}

/**
 * Un avis, prêt à être proposé.
 *
 * `null` quand il n'a pas de numéro : un avis sans identité ne se suit pas d'un
 * rapport à l'autre, et deux avis anonymes du même rapport se périmeraient l'un
 * l'autre à la fusion.
 *
 * @param {object} options
 * @param {object} options.avis l'avis lu dans le rapport
 * @param {string} options.emisPar l'organisme qui l'a rendu — **jamais** deviné
 * @param {string} [options.rapport] le nom du rapport, tel qu'on le lit
 * @param {string} [options.documentId] le document d'où il sort
 * @param {string} [options.le] la date du rapport
 * @param {object|null} [options.liaison] ce que `avis-liaison.js` a proposé
 */
export function avisVersable({
  avis = null, emisPar = "", rapport = "", documentId = "", le = "", liaison = null
} = {}) {
  const sujet = sujetDeLAvis(avis);
  if (!sujet) return null;

  const organisme = texte(emisPar);
  const intitule = intituleDeLAvis(avis);
  const teneur = teneurDeLAvis(avis);
  const page = Number(avis?.provenance?.page ?? avis?.page);

  return {
    sujet,
    valeur: intitule ? `${teneur} — ${intitule}` : teneur,
    quoi: "Ce qu'un bureau de contrôle a écrit d'un point du projet, dans son rapport, à sa date.",
    utilisation: "Ce qu'il a examiné cesse d'être couvert le jour où la valeur change. "
      + "C'est ce que dit une variante avant de dire ce qui se recalcule.",
    // Un constat, et il le reste : il ne devient jamais faux, il reste vrai à
    // sa date (règle 6). C'est sa **couverture** qui tombe, pas lui.
    nature: NATURE.CONSTAT,
    provenance: {
      type: PROVENANCE.DOCUMENT,
      quoi: [organisme, rapport, Number.isFinite(page) ? `page ${page}` : "", le]
        .filter(Boolean).join(" — ")
    },
    statut: STATUT.RETENU,
    reference: `avis:${texte(avis?.value?.external_reference_normalized) || sujet}`,
    zones: [],
    atelier: "Suivi des avis",

    /**
     * Ce que la ligne versée gardera, et qui ne se déduit de rien.
     *
     * `emisPar` **n'est pas** `decided_by` : l'un est l'organisme qui engage sa
     * responsabilité, l'autre l'utilisateur Mdall qui a signé la proposition.
     * Les confondre ferait dire à la mémoire que celui qui a cliqué a rendu
     * l'avis.
     *
     * `porteSur` est la liaison **proposée**. Elle ne devient un engagement
     * qu'à la fusion, donc après une signature.
     */
    emisPar: organisme,
    documentId: texte(documentId),
    page: Number.isFinite(page) ? page : null,
    porteSur: texte(liaison?.assertion?.id),
    liaison: texte(liaison?.motif) || LIAISON.SANS_INTITULE
  };
}

/**
 * Tout ce qu'un rapport donne à proposer, avis par avis.
 *
 * **Tous les avis, y compris ceux qu'on n'a pas su accrocher.** Un avis
 * escamoté parce qu'on ne savait pas quoi en faire serait exactement ce qu'on
 * ne veut pas : il faut qu'il entre en mémoire, et qu'on voie qu'il n'est
 * accroché à rien.
 *
 * @returns {{versables: object[], sansLiaison: number}}
 */
export function avisDuRapport({
  avis = [], assertions = [], emisPar = "", rapport = "", documentId = "", le = ""
} = {}) {
  const liaisons = liaisonsProposees({ avis, assertions });

  const versables = liaisons
    .map((liaison) => avisVersable({
      avis: liaison.avis, emisPar, rapport, documentId, le, liaison
    }))
    .filter(Boolean);

  return {
    versables,
    // Ce qui entre sans être accroché. Se dit, se compte, et ne se cache pas :
    // c'est la mesure de ce que l'extraction n'a pas su reconnaître.
    sansLiaison: versables.filter((versable) => !versable.porteSur).length
  };
}
