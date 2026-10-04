/**
 * Mettre en forme le trafic : combien de monde, combien de temps.
 *
 * ## Deux chiffres qu'on confond, et qui décident de choses opposées
 *
 * **Les venues ne sont pas les comptes.** Dix venues d'une personne ne font pas
 * dix personnes, et c'est le second chiffre qu'on croit lire sur un trafic. Un
 * produit ouvert quinze fois par jour par le même utilisateur et un produit
 * ouvert une fois par quinze personnes n'appellent ni le même tarif, ni le même
 * écran d'accueil, ni la même inquiétude.
 *
 * ## Ce que le temps mesure, et pourquoi la phrase est obligatoire
 *
 * On ne compte que le temps **éveillé** : l'onglet au premier plan, et un geste
 * dans les cinq dernières minutes. Ce n'est pas « du temps de travail » — lire
 * un document à côté de l'écran n'y est pas, et un onglet oublié non plus.
 *
 * La phrase vit dans `les-venues.js`, avec les seuils qu'elle décrit, et cet
 * écran la reprend. Six mois plus tard, « temps moyen : 34 minutes » se lira
 * « ils travaillent 34 minutes par jour » si personne ne dit ce qui a été
 * compté — et c'est précisément ainsi qu'un indicateur devient un mensonge
 * qu'on n'a jamais écrit (règle 5).
 *
 * ## Il ne parle à rien
 *
 * Des lignes entrent, des nombres et des phrases sortent.
 */

import { CE_QUE_LE_TEMPS_MESURE } from "./les-venues.js";
import { laVirgule, lePluriel } from "./lexploitation-de-mdall.js";

const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : 0);

export { CE_QUE_LE_TEMPS_MESURE };

/**
 * Une durée en secondes, dite comme on la dit.
 *
 * **Jamais en secondes au-delà de la minute** : « 2 100 s » ne se compare à rien
 * de ce qu'on connaît, « 35 min » si. Et jamais de décimale sur des minutes : la
 * mesure a un grain d'une minute, l'afficher plus fin serait une précision
 * qu'elle n'a pas.
 */
export function laDureeDite(secondes) {
  const combien = Math.max(0, Math.round(nombre(secondes)));
  if (combien < 60) return lePluriel(combien, "seconde");

  const minutes = Math.round(combien / 60);
  // **Soixante minutes se disent une heure.** Le seuil était à quatre-vingt-dix,
  // et une colonne alignait « 60 minutes » au-dessus de « 1 heure 30 » : deux
  // unités pour deux cases voisines, et l'œil compare mal.
  if (minutes < 60) return lePluriel(minutes, "minute");

  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste
    ? `${lePluriel(heures, "heure")} ${laVirgule(reste)}`
    : lePluriel(heures, "heure");
}

/**
 * Les pas d'un trafic, prêts à dessiner.
 *
 * Chacun porte **les deux comptes**, et la durée moyenne **par venue** — et non
 * par compte : une personne qui vient trois fois dans la journée a fait trois
 * visites, et c'est la longueur d'une visite qu'on regarde pour savoir si le
 * produit se consulte ou s'y travaille.
 */
export function lesPasDuTrafic(lignes = null) {
  return (Array.isArray(lignes) ? lignes : []).map((une) => {
    const venues = nombre(une?.venues);
    const secondes = nombre(une?.secondes_actives ?? une?.secondesActives);

    return {
      le: String(une?.le ?? ""),
      venues,
      comptes: nombre(une?.comptes),
      secondes,
      // Zéro venue rend zéro, et non `NaN` — qui s'afficherait « NaN min » et
      // ferait douter de tout le tableau.
      moyenne: venues > 0 ? secondes / venues : 0,
      mediane: nombre(une?.secondes_medianes ?? une?.secondesMedianes),
      maximum: nombre(une?.secondes_maximum ?? une?.secondesMaximum)
    };
  });
}

/**
 * Le total d'une fenêtre.
 *
 * **Les comptes ne s'additionnent pas d'un pas à l'autre** : quelqu'un venu
 * lundi et mardi compte une fois chaque jour, et deux si on somme. Le total des
 * comptes distincts de la fenêtre ne se déduit donc pas des pas, et on ne le
 * fabrique pas — on rend le plus haut pas observé, en le nommant pour ce qu'il
 * est (règle 5).
 */
export function leTotalDuTrafic(lignes = null) {
  const pas = lesPasDuTrafic(lignes);

  const venues = pas.reduce((somme, un) => somme + un.venues, 0);
  const secondes = pas.reduce((somme, un) => somme + un.secondes, 0);
  const plusHaut = pas.reduce(
    (haut, un) => (un.comptes > haut.comptes ? un : haut), { comptes: 0, le: "" });

  return {
    pas: pas.length,
    venues,
    secondes,
    moyenne: venues > 0 ? secondes / venues : 0,
    /**
     * **Le plus de comptes vus sur un seul pas**, et non leur somme. C'est le
     * seul chiffre de fréquentation que les pas permettent d'affirmer.
     */
    comptesAuPlus: plusHaut.comptes,
    quandAuPlus: String(plusHaut.le ?? ""),
    maximum: pas.reduce((haut, un) => Math.max(haut, un.maximum), 0)
  };
}

/**
 * La phrase d'ensemble.
 *
 * **Elle distingue toujours les venues des comptes**, parce que c'est la seule
 * confusion qui change une décision. Et elle ne dit jamais « personne » sur une
 * fenêtre vide : une fenêtre sans venue peut être une fenêtre d'avant la mesure.
 */
export function ceQueLeTraficDit(lignes = null, { depuis = "" } = {}) {
  const total = leTotalDuTrafic(lignes);

  if (!total.pas) {
    return "Aucune venue sur cette fenêtre. "
      + (depuis
        ? `La mesure a commencé le ${depuis} : avant, rien n'était compté.`
        : "Ce peut être une fenêtre d'avant la mesure, et non une fenêtre sans personne.");
  }

  return `${lePluriel(total.venues, "venue")} — `
    + `${lePluriel(total.comptesAuPlus, "compte")} au plus sur un même pas, `
    + `${laDureeDite(total.moyenne)} par venue en moyenne.`;
}

/**
 * Ce que le trafic ne dit pas, nommé.
 *
 * Trois angles morts, et chacun se découvrirait tôt ou tard le jour où il
 * coûterait quelque chose.
 */
export const CE_QUE_LE_TRAFIC_NE_DIT_PAS = [
  {
    quoi: "Qui a fait quoi, et où",
    pourquoi: "une venue porte une heure et une durée, jamais un écran, un "
      + "chantier ni un document. « Qui a passé du temps sur quoi » serait un "
      + "journal de navigation : on saurait qui lit quoi sans jamais lire une ligne."
  },
  {
    quoi: "Le temps de travail",
    pourquoi: CE_QUE_LE_TEMPS_MESURE
  },
  {
    quoi: "Les comptes distincts sur toute la fenêtre",
    pourquoi: "quelqu'un venu lundi et mardi compte une fois chaque jour. Les "
      + "sommer en ferait deux personnes ; on rend donc le plus haut pas observé, "
      + "et non un total qu'on aurait fabriqué."
  }
];
