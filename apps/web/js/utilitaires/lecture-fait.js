/**
 * Ce que tout utilitaire lit d'un fait de contexte, de la même façon.
 *
 * Outil partagé, pas utilitaire — d'où le nom en tirets.
 *
 * Une règle unique le gouverne : **un fait qui ne dit pas sur quoi il a été
 * calculé est déclaré inconnu, pas sûr.** C'est le cas de tous ceux écrits avant
 * qu'on conserve les entrées ; les prendre pour certains rendrait une confiance
 * inventée, ce qu'on est précisément en train de corriger.
 */

import { RESERVE } from "./reserves.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une mesure, écrite comme la mémoire écrit ses mesures.
 *
 * ## Pourquoi cette fonction existe
 *
 * `toFixed(2)` rend « 2.59 ». Tout le reste de la mémoire écrit « 2,59 » — la
 * virgule décimale française, parce que les phrases se lisent en français. La
 * même profondeur hors gel s'écrivait donc de deux façons selon qu'un humain
 * l'avait tranchée ou qu'un utilitaire l'avait déduite, et une valeur écrite de
 * deux façons ne se compare plus : deux lignes du même sujet passaient pour
 * différentes, et une variante montrait des conséquences qui n'en étaient pas.
 *
 * C'est la règle 4 des fondamentaux appliquée à la forme : une valeur écrite à
 * deux endroits finit par diverger, et une valeur écrite de deux **façons**
 * diverge tout de suite.
 *
 * ## `null` n'est pas zéro
 *
 * `Number(null)` vaut `0`, et une altitude qu'on ne connaît pas s'écrivait donc
 * « 0,00 m ». Ce n'était pas qu'un affichage : `altitudeVersable` ne verse une
 * ligne que si l'écriture n'est pas vide, si bien qu'un projet dont l'altitude
 * était inconnue **proposait à la mémoire** une altitude de zéro mètre — et un
 * site au niveau de la mer devenait indistinguable d'un site qu'on n'a pas
 * relevé. Ce qu'on ne sait pas ne s'écrit pas (règle 5).
 */
export function mesureEcrite(valeur, decimales = 2, unite = "") {
  // `null`, `undefined` et la chaîne vide se rejettent **avant** la conversion :
  // les trois valent zéro pour `Number`, et zéro se calcule très bien.
  if (valeur === null || valeur === undefined || String(valeur).trim() === "") return "";
  const n = Number(valeur);
  if (!Number.isFinite(n)) return "";
  const dit = n.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return unite ? `${dit} ${unite}` : dit;
}

/** Les entrées conservées par le producteur du fait, ou `null` si aucune. */
export function entreesDe(fait = {}) {
  const entrees = fait?.fact_value?.inputs;
  return entrees && typeof entrees === "object" ? entrees : null;
}

/**
 * Les réserves que le producteur a nommées, comme un ensemble modifiable.
 *
 * Sans entrées ni réserves, l'ignorance est nommée plutôt que tue.
 */
export function reservesConservees(fait = {}) {
  const brutes = fait?.fact_value?.reserves;
  const nommees = Array.isArray(brutes) ? brutes.map((code) => String(code ?? "").trim()).filter(Boolean) : [];

  if (!entreesDe(fait) && nommees.length === 0) return new Set([RESERVE.ENTREES_INCONNUES]);
  return new Set(nommees);
}

/**
 * Les sujets du projet qu'un agent déclare lire, dans l'ordre où il les lit.
 *
 * ## Pourquoi une déclaration, et pas un rapprochement de noms
 *
 * Un utilitaire calcule au serveur, sur des faits de contexte, et la contrainte
 * qu'il produit ne garde qu'un **nombre** : `inputs.altitude = 13`. Rien dans ce
 * nombre ne dit qu'il vient de la donnée de base « Altitude du site » que le
 * projet a versée. Aller le deviner en rapprochant « altitude » de « Altitude du
 * site » serait un lien qui a l'air établi et qui n'est qu'une ressemblance —
 * l'erreur exacte que l'étape 1 du plan a corrigée.
 *
 * Alors l'utilitaire le **dit**. `lit` est une déclaration, écrite dans son
 * fichier, relue comme du code et figée par sa version : « mon entrée `altitude`
 * est le sujet *Altitude du site* du projet ». C'est exactement ce que fait une
 * règle `.ref` quand elle écrit `sujet: "Profondeur hors gel"` dans une
 * condition — elle ne cite pas d'identifiant non plus, elle nomme un sujet, et
 * le versement le résout une fois pour toutes.
 *
 * Le résultat suit donc le même chemin que les lectures d'une règle : résolu au
 * versement, dans la zone, avec son rang, et figé. Un renommage ultérieur ne le
 * défait pas.
 *
 * ## Une lecture sans valeur reste une lecture
 *
 * Un utilitaire qui déclare lire l'altitude et qui n'a rien reçu a **quand même
 * lu** — il a lu du vide, et il a calculé quelque chose malgré tout. C'est le
 * trou du raisonnement, et il se compte. Le taire ferait passer pour complet un
 * calcul qui ne l'était pas.
 *
 * @returns {{sujet: string, valeur: string}[]}
 */
export function lecturesDeclarees(utilitaire = {}, fait = {}) {
  const declarees = Array.isArray(utilitaire?.lit) ? utilitaire.lit : [];

  return declarees
    .map((entree) => ({
      sujet: texte(entree?.sujet),
      valeur: typeof entree?.lire === "function" ? texte(entree.lire(fait)) : ""
    }))
    .filter((lecture) => lecture.sujet);
}
