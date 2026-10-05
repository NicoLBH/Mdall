/**
 * La ligne du temps d'un chantier — **deux lignes, et jamais une seule.**
 *
 * ## Les trois règles
 *
 * 1. **L'ordre du dépôt reste la vérité de ce qu'on savait.** Il ne bouge
 *    jamais, il est journalisé, et c'est lui qui explique les décisions prises.
 *    La ligne reconstituée est une **seconde** lecture, et non une correction de
 *    la première.
 * 2. **Un fait daté traverse, une déduction non.** La règle est déjà écrite dans
 *    `la-chronologie-des-sources.js` ; elle monte ici d'un étage et vaut pour
 *    toutes les familles. C'est `cequElleRevise` qui la tient, et on la réemploie
 *    plutôt que de l'écrire une seconde fois (règle 4).
 * 3. **Ce qu'on ne sait pas dater se dit, et ne s'insère pas.** Une suite fausse
 *    est pire qu'une suite incomplète (règle 5). Le compte de ce qui n'a pas pu
 *    être daté voyage avec la ligne.
 *
 * ## Pourquoi deux lignes
 *
 * **La ligne vécue** est l'ordre d'arrivée des documents : ce qu'on savait, et
 * quand. **La ligne reconstituée** est l'ordre des faits : ce qui s'est passé.
 *
 * Elles diffèrent dès qu'une archive est déposée après coup, et la différence
 * n'est pas une erreur à corriger — c'est une information. Si le document A
 * (mars) arrive après le document B (septembre), la ligne reconstituée dira
 * « A puis B », et ce sera juste. Mais **personne, sur ce chantier, n'a réfléchi
 * dans cet ordre** : les décisions de septembre ont été prises sans A.
 *
 * Une prédiction entraînée sur la ligne reconstituée apprend des enchaînements
 * **logiques** ; entraînée sur la ligne vécue, elle apprend des enchaînements
 * **vécus**. Les deux sont utiles et ne répondent pas à la même question, et
 * c'est pourquoi ce module rend les deux et refuse d'en élire une.
 *
 * ## Et l'ordre n'est pas la cause
 *
 * « A puis B, quatorze fois » ne dit pas que A entraîne B. C'est la limite que
 * la rubrique « Ce qui s'enchaîne » de la console nomme déjà, et cette ligne-ci
 * la rendra plus tentante, pas moins. Elle est donc redite ici, dans le code qui
 * la produit, et non seulement dans l'écran qui la montre.
 */

import { lesFaitsDatesDuneLecture } from "./les-faits-dates.js";
import {
  PLACE, cequElleRevise, laPlaceDeLaSource, leJourDeLaSource
} from "./la-chronologie-des-sources.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Une lecture, replacée dans ce qui la précède **de sa propre famille**.
 *
 * **De sa propre famille, et c'est la correction qui compte.** Un rapport de
 * contrôle ne recule pas parce qu'un compte rendu plus récent existe : ils ne
 * révisent pas les mêmes sujets, et les mêler ferait reculer tout ce qui n'est
 * pas de la famille la plus bavarde.
 */
export function laPlaceDesLectures(lectures = []) {
  const parFamille = new Map();

  for (const une of liste(lectures)) {
    const famille = texte(une?.famille);
    if (!parFamille.has(famille)) parFamille.set(famille, []);
    parFamille.get(famille).push(une);
  }

  const placees = [];
  for (const [, dUneFamille] of parFamille) {
    /**
     * **Dans l'ordre du dépôt**, et non dans celui des documents : « ce qui
     * était déjà connu » est ce qu'on avait **lu**, pas ce qui existait.
     */
    const parDepot = [...dUneFamille]
      .sort((a, b) => texte(a?.deposeLe).localeCompare(texte(b?.deposeLe)));

    const connues = [];
    for (const une of parDepot) {
      placees.push({
        ...une,
        placement: laPlaceDeLaSource({ date: une?.quand, connues: [...connues] })
      });
      const jour = leJourDeLaSource(une?.quand);
      if (jour) connues.push(jour);
    }
  }

  return placees;
}

/**
 * La ligne du temps d'un ensemble de lectures.
 *
 * @param {Array} lectures `[{lecture, document, famille, quand, deposeLe}]`
 *   où `quand` est la date du **document** et `deposeLe` celle de son arrivée.
 */
export function laLigneDuTemps(lectures = []) {
  const placees = laPlaceDesLectures(lectures);

  const faits = [];
  let sansDate = 0;

  for (const une of placees) {
    const dou = {
      document: texte(une?.document),
      famille: texte(une?.famille),
      quand: texte(une?.quand)
    };
    const tires = lesFaitsDatesDuneLecture(une?.lecture, dou);
    sansDate += tires.sansDate;

    for (const un of tires.faits) {
      faits.push({
        ...un,
        /**
         * **Ce que ce fait a le droit de réviser**, depuis là où son document se
         * place. La règle vient de `la-chronologie-des-sources.js` : un fait daté
         * traverse le temps, une déduction non.
         */
        revise: [...cequElleRevise(une.placement.place)],
        /** D'où son document parle, et depuis quand on le sait. */
        place: une.placement.place,
        deposeLe: texte(une?.deposeLe)
      });
    }
  }

  return {
    /**
     * **La ligne vécue** : l'ordre où les faits sont entrés dans ce qu'on sait.
     * C'est elle qui explique les décisions prises, et elle ne bouge jamais.
     */
    vecue: [...faits].sort((a, b) =>
      texte(a.deposeLe).localeCompare(texte(b.deposeLe))
      || texte(a.dou.quand).localeCompare(texte(b.dou.quand))),

    /**
     * **La ligne reconstituée** : l'ordre où les faits ont eu lieu. C'est elle
     * qu'on interroge pour un enchaînement logique — en sachant que personne ne
     * l'a vécu dans cet ordre.
     */
    reconstituee: [...faits].sort((a, b) =>
      a.quand.localeCompare(b.quand)
      || texte(a.dou.quand).localeCompare(texte(b.dou.quand))),

    /** Ce qui n'a pas pu être daté, et qui n'est donc dans aucune des deux. */
    sansDate,
    bilan: leBilanDeLaLigne(faits, placees, sansDate)
  };
}

/**
 * De combien les deux lignes diffèrent.
 *
 * **C'est le chiffre qui dit si la distinction sert.** Sur un chantier dont les
 * documents sont arrivés dans l'ordre, les deux lignes sont la même et il n'y a
 * rien à arbitrer. Le jour où une archive est déposée, l'écart saute — et c'est
 * ce jour-là qu'il faut savoir laquelle des deux on interroge.
 */
export function ceQuiSepareLesDeuxLignes(vecue = [], reconstituee = []) {
  const clef = (un) => `${un?.quand}|${un?.reference}|${un?.nature}|${un?.dou?.document}`;
  const laVecue = liste(vecue).map(clef);
  const laReconstituee = liste(reconstituee).map(clef);

  let memeRang = 0;
  for (const [rang, une] of laVecue.entries()) {
    if (laReconstituee[rang] === une) memeRang += 1;
  }

  return {
    combien: laVecue.length,
    memeRang,
    /** Les faits que la reconstitution déplace. Zéro : les deux lignes coïncident. */
    deplaces: laVecue.length - memeRang
  };
}

/** Le bilan d'une ligne du temps. */
export function leBilanDeLaLigne(faits = [], placees = [], sansDate = 0) {
  const tous = liste(faits);
  const parNature = tous.reduce((compte, un) => ({
    ...compte, [un.nature]: (compte[un.nature] ?? 0) + 1
  }), {});

  return {
    faits: tous.length,
    sansDate,
    parNature,
    documents: liste(placees).length,
    /**
     * Les documents arrivés après plus récent qu'eux. **Ce sont eux qui écartent
     * les deux lignes**, et eux seuls dont la déduction par absence est refusée.
     */
    retrospectifs: liste(placees).filter((une) =>
      une?.placement?.place === PLACE.RETROSPECTIVE).length,
    /**
     * Ceux qu'on n'a pas su dater. Ils n'ont produit aucun fait daté, et leur
     * compte dit la part du corpus qui reste hors de la ligne.
     */
    sansRepere: liste(placees).filter((une) =>
      une?.placement?.place === PLACE.SANS_DATE
      || une?.placement?.place === PLACE.SANS_REPERE).length,
    /**
     * **Les engagements sont des promesses, pas des observations.** Les compter
     * à part est ce qui empêche de lire « 14 faits en mai » quand il s'agit de
     * quatorze choses promises pour mai.
     */
    aVenir: tous.filter((un) => un.nature === "engagement").length
  };
}
