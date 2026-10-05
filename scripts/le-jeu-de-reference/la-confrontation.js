/**
 * Confronter une lecture à son annotation — **par étape, et jamais un score.**
 *
 * ## Pourquoi pas un score unique
 *
 * « Qualité : 87 % » ne dit pas quoi réparer. Une mesure **par étape** —
 * structure reconnue, légende lue, relevés trouvés, marques justes, pièges
 * évités — dit où ça casse, et c'est la seule chose qu'on veuille savoir. Un
 * chiffre unique mélange une structure non reconnue avec une marque fausse, qui
 * n'appellent ni le même diagnostic ni la même correction.
 *
 * ## Précision et rappel, et pourquoi les deux
 *
 * **Le rappel** dit ce qu'on a manqué : un avis non relevé est un avis perdu.
 * **La précision** dit ce qu'on a inventé : un avis relevé qui n'existe pas est
 * pire, parce qu'il a l'aplomb d'un vrai.
 *
 * L'un sans l'autre se truque trivialement : tout relever donne un rappel
 * parfait, ne rien relever donne une précision parfaite. Ils ne se résument donc
 * pas en un nombre, et ce module n'en propose pas.
 *
 * ## Les pièges comptent à part
 *
 * Un piège relevé est un faux positif, et il entre déjà dans la précision. Il se
 * compte **aussi** à part, parce qu'il est nommé : savoir que la lecture a pris
 * la légende pour quatre avis vaut mieux que savoir qu'elle a quatre faux
 * positifs.
 */

import { lempreinteDuneLecture } from "../../apps/web/js/services/lempreinte-dune-lecture.js";
import { laCleDunReleve } from "../../apps/web/js/services/lempreinte-dune-lecture.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** Les étapes qu'on mesure séparément. */
export const ETAPE = {
  STRUCTURE: "structure",
  LEGENDE: "legende",
  RELEVE: "releve",
  MARQUE: "marque",
  PIEGES: "pieges"
};

/**
 * Une proportion, rendue avec son assiette.
 *
 * **Jamais un taux sans ce sur quoi il repose** — « 100 % » sur un relevé est
 * la même phrase que « 100 % » sur quatre cents, et ce n'est pas la même
 * information. `null` quand il n'y a rien à mesurer : zéro sur zéro n'est pas
 * zéro, et l'écrire 0 % ferait lire un échec là où il n'y a pas d'épreuve.
 */
export function laPart(combien = 0, sur = 0) {
  const assiette = Number(sur) || 0;
  return {
    combien: Number(combien) || 0,
    sur: assiette,
    part: assiette > 0 ? (Number(combien) || 0) / assiette : null
  };
}

/**
 * Ce que la lecture a fait de ce document, étape par étape.
 *
 * @param {object} annotation la bonne réponse, écrite à la main
 * @param {object} lecture ce que la lecture a rendu
 */
export function confronter(annotation = null, lecture = null) {
  const empreinte = lempreinteDuneLecture(lecture, annotation?.famille);

  const attendus = new Map(liste(annotation?.releve).map((un) => [un.cle, un]));
  const rendus = empreinte.parCle;

  const trouves = [...attendus.keys()].filter((cle) => rendus.has(cle));
  const manques = [...attendus.keys()].filter((cle) => !rendus.has(cle));
  const enTrop = [...rendus.keys()].filter((cle) => !attendus.has(cle));

  /**
   * **La marque ne se juge que sur ce qui a été trouvé.** La compter fausse sur
   * un relevé manqué compterait deux fois le même défaut, et ferait croire à
   * deux problèmes là où il n'y en a qu'un.
   */
  const marquesJustes = trouves.filter((cle) =>
    texte(rendus.get(cle)?.marque) === texte(attendus.get(cle)?.marque));

  /**
   * Les pièges effectivement tombés, **nommés**.
   *
   * Un piège est reconnu quand son intitulé se retrouve dans un relevé rendu —
   * par sa clé normalisée, comme tout le reste. Dire « quatre faux positifs »
   * est moins utile que dire « elle a pris la légende pour quatre avis ».
   */
  const piegesTombes = liste(annotation?.pieges)
    .filter((un) => rendus.has(laCleDunReleve({ intitule: un.quoi })));

  return {
    document: texte(annotation?.document),
    famille: texte(annotation?.famille),
    [ETAPE.STRUCTURE]: {
      attendue: annotation?.structureReconnue === true,
      rendue: empreinte.sansStructure !== true,
      tient: (annotation?.structureReconnue === true) === (empreinte.sansStructure !== true)
    },
    [ETAPE.LEGENDE]: {
      /** Combien des marques attendues la lecture a lues. */
      rappel: laPart(
        liste(annotation?.legende).filter((une) => empreinte.legende.includes(une)).length,
        liste(annotation?.legende).length),
      /**
       * **Et combien de ce qu'elle a lu était attendu.**
       *
       * Le rappel seul se truque comme celui des relevés : tout rendre le rend
       * parfait. La batterie de mutations l'a montré sans équivoque — une
       * lecture qui ajoutait la section « Divers » aux rubriques d'un compte
       * rendu gardait 100 %, parce que rien ne regardait ce qu'elle avait rendu
       * en trop.
       */
      precision: laPart(
        empreinte.legende.filter((une) => liste(annotation?.legende).includes(une)).length,
        empreinte.legende.length),
      enTrop: empreinte.legende.filter((une) => !liste(annotation?.legende).includes(une))
    },
    [ETAPE.RELEVE]: {
      /** Ce qu'on a trouvé sur ce qu'il fallait trouver. */
      rappel: laPart(trouves.length, attendus.size),
      /** Ce qui était juste sur ce qu'on a rendu. */
      precision: laPart(trouves.length, rendus.size),
      manques,
      enTrop
    },
    [ETAPE.MARQUE]: {
      justesse: laPart(marquesJustes.length, trouves.length),
      fausses: trouves.filter((cle) => !marquesJustes.includes(cle)).map((cle) =>
        `${cle} : attendu « ${attendus.get(cle).marque} », lu « ${rendus.get(cle).marque}` + " »")
    },
    [ETAPE.PIEGES]: {
      evites: laPart(liste(annotation?.pieges).length - piegesTombes.length,
        liste(annotation?.pieges).length),
      tombes: piegesTombes.map((un) => `${un.quoi} — ${un.pourquoi}`)
    }
  };
}

/**
 * Le bilan du jeu entier, **étape par étape**.
 *
 * Les parts s'additionnent sur leurs assiettes et non entre elles : la moyenne
 * de deux taux pèse autant un document de deux avis qu'un de quarante, et le
 * jeu de référence n'a pas assez de documents pour s'offrir ça.
 */
export function leBilanDuJeu(confrontations = []) {
  const toutes = liste(confrontations);
  const somme = (quoi, ou) => toutes.reduce((total, une) => {
    const part = ou.split(".").reduce((dans, clef) => dans?.[clef], une);
    return { combien: total.combien + (part?.combien ?? 0), sur: total.sur + (part?.sur ?? 0) };
  }, { combien: 0, sur: 0 });

  const reprendre = (ou) => { const { combien, sur } = somme("", ou); return laPart(combien, sur); };

  return {
    documents: toutes.length,
    [ETAPE.STRUCTURE]: laPart(toutes.filter((une) => une[ETAPE.STRUCTURE]?.tient).length,
      toutes.length),
    legendeRappel: reprendre(`${ETAPE.LEGENDE}.rappel`),
    legendePrecision: reprendre(`${ETAPE.LEGENDE}.precision`),
    rappel: reprendre(`${ETAPE.RELEVE}.rappel`),
    precision: reprendre(`${ETAPE.RELEVE}.precision`),
    [ETAPE.MARQUE]: reprendre(`${ETAPE.MARQUE}.justesse`),
    [ETAPE.PIEGES]: reprendre(`${ETAPE.PIEGES}.evites`),
    /** Les pièges tombés, tous documents confondus — c'est la liste qu'on lit. */
    piegesTombes: toutes.flatMap((une) => une[ETAPE.PIEGES]?.tombes ?? [])
  };
}
