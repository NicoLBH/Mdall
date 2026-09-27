/**
 * `pour chaque` : répéter un calcul, et en faire un tableau.
 *
 * ## Le verrou que ça lève
 *
 * Beaucoup de ce qu'un ingénieur écrit est la même formule appliquée à une
 * suite de valeurs : un moment pour chaque portée de 2 à 90 mètres, une
 * descente de charge niveau par niveau, un dimensionnement pour chaque diamètre
 * du catalogue. Jusqu'ici le langage savait poser **une** valeur ; répéter
 * demandait quarante-cinq `calcule` recopiés, ou une sortie vers le tableur —
 * c'est-à-dire vers un endroit où plus rien ne se rejoue.
 *
 * ## La règle qui rend ça relisible
 *
 * > **Une boucle produit un tableau, jamais une variable qui s'accumule.**
 *
 * Un accumulateur — `soit total = total + x` — ne se relit pas : il faut
 * simuler l'exécution dans sa tête pour savoir ce qu'il vaut à la fin. Les
 * quarante-cinq lignes d'un tableau, elles, sont **visibles**, donc
 * vérifiables ligne à ligne contre la note de calcul d'origine. C'est toute la
 * différence entre un langage qu'on relit et un langage qu'on exécute.
 *
 * Ce que la boucle rend se lit ensuite par un **agrégat** — `le plus grand de
 * Moment` —, qui est la seule façon d'en tirer une valeur. Nommés en français,
 * les agrégats ne donnent pas envie de les enchaîner : le mot choisi décide du
 * style qu'on écrira pendant dix ans.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne déroule pas la boucle.** Évaluer le corps demande de poser des
 * locales, ce qui vit dans l'évaluateur avec tout le reste. Ici vivent le
 * **vocabulaire** — lire une tête de boucle, lire un agrégat — et ce qui se
 * décide sans rien évaluer : la suite des valeurs, et ce qu'une colonne vaut.
 *
 * **Il n'imbrique pas.** Une seule boucle par fonction ; deux niveaux
 * demandent deux fonctions, comme il n'y a pas de condition imbriquée. Une
 * boucle dans une boucle est exactement ce qu'on ne sait plus relire dix-huit
 * mois plus tard.
 *
 * **Il ne sort pas en avance.** Pas de « s'arrêter quand » : le tableau fait
 * ce qu'il annonce, et l'on lit la ligne qui compte.
 */

import {
  AGREGAT, PHRASE_DE_LAGREGAT, lireUnNombre, couperLUnite, mesureEnFrancais
} from "./memoire-en-texte.js";
import { auJusteNecessaire, convertir, memeGrandeur, phraseDesUnites } from "./unites-du-metier.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le plus long tableau qu'on accepte de dérouler.
 *
 * **Ce n'est pas une limite technique, c'est une limite de lecture.** Le gain
 * de cette forme est qu'on relit les lignes une à une contre l'original ; un
 * tableau de dix mille lignes ne se relit pas, et l'on aurait rendu le langage
 * exactement aussi opaque que le tableur qu'il remplace. Au-delà, on refuse en
 * disant combien cela ferait — et non en tronquant, ce qui donnerait un total
 * faux sans un mot.
 */
export const PLUS_LONG_TABLEAU = 200;

/** Pourquoi une boucle ne se déroule pas. */
export const REFUS_DE_LA_BOUCLE = {
  /** Une borne qui n'est pas un nombre. */
  PAS_UN_NOMBRE: "pas-un-nombre",
  /** Un pas nul : la suite ne finirait jamais. */
  PAS_NUL: "pas-nul",
  /** Un pas qui s'éloigne de la fin : la suite ne finirait jamais non plus. */
  SENS: "sens",
  /** Des bornes qui ne mesurent pas la même chose. */
  UNITES: "unites",
  /** Un tableau plus long que ce qu'un humain relit. */
  TROP_LONG: "trop-long"
};

/** Ce qu'un refus dit, en français, à celui qui écrit. */
export function phraseDuRefusDeLaBoucle(code, quoi = "") {
  const dit = texte(quoi);

  switch (code) {
    case REFUS_DE_LA_BOUCLE.PAS_UN_NOMBRE:
      return `« ${dit} » n'est pas un nombre : une boucle va d'une valeur à une autre`;
    case REFUS_DE_LA_BOUCLE.PAS_NUL:
      return "un pas de zéro ne mène nulle part : la suite ne finirait jamais";
    case REFUS_DE_LA_BOUCLE.SENS:
      return "le pas s'éloigne de la fin : écrivez-le dans l'autre sens";
    case REFUS_DE_LA_BOUCLE.UNITES:
      return `les bornes ne mesurent pas la même chose — ${dit}`;
    case REFUS_DE_LA_BOUCLE.TROP_LONG:
      return `ce tableau ferait ${dit} lignes ; au-delà de ${PLUS_LONG_TABLEAU}, il ne se relit plus`;
    default:
      return "cette boucle ne se déroule pas";
  }
}

/**
 * La tête d'une boucle : `Portée de 2 m à 90 m par pas de 2 m`.
 *
 * **Les trois bornes s'écrivent en toutes lettres**, et dans l'ordre où on les
 * dit : d'où l'on part, où l'on va, de combien on avance. « de 2 à 90 pas 2 »
 * se taperait plus vite et se relirait moins bien — et c'est une note de calcul
 * qu'on relit des années après.
 *
 * @returns {{nom: string, de: string, a: string, pas: string}|null} `null`
 *   quand la ligne ne s'y prête pas : l'appelant la refuse en la nommant,
 *   plutôt que d'inventer une boucle vide.
 */
export function lireUnePourChaque(reste = "") {
  const dit = texte(reste).replace(/;\s*$/, "");
  const coupe = dit.match(/^(.+?)\s+de\s+(.+?)\s+(?:à|a)\s+(.+?)\s+par\s+pas\s+de\s+(.+)$/i);
  if (!coupe) return null;

  const nom = texte(coupe[1]);
  const de = texte(coupe[2]);
  const a = texte(coupe[3]);
  const pas = texte(coupe[4]);
  return nom && de && a && pas ? { nom, de, a, pas } : null;
}

/**
 * Un agrégat écrit : `le plus grand de Moment`.
 *
 * @returns {{quoi: string, colonne: string}|null} `null` quand l'expression
 *   n'est pas un agrégat — c'est alors un calcul ordinaire, et le calculateur
 *   s'en charge.
 */
export function lireUnAgregat(expression = "") {
  const dit = texte(expression).replace(/;\s*$/, "");
  const nu = dit.toLowerCase();

  for (const [phrase, quoi] of PHRASE_DE_LAGREGAT) {
    if (!nu.startsWith(`${phrase} `)) continue;
    const colonne = texte(dit.slice(phrase.length));
    return colonne ? { quoi, colonne } : null;
  }

  return null;
}

/**
 * Les trois bornes sont-elles écrites en clair ?
 *
 * **Une borne peut être un nom** — `pour chaque Point de 0 m à Portée par pas
 * de 0,5 m` est exactement ce qu'on veut écrire, et la portée vient du projet.
 * Ce qui vient du projet ne se vérifie qu'au lancement ; ce qui est écrit en
 * clair se vérifie **à la lecture**, et c'est là qu'une faute de frappe se
 * corrige le moins cher.
 *
 * On ne renonce donc pas au garde : on le pose là où il peut tenir.
 */
export function bornesLitterales(boucle = {}) {
  return [boucle?.de, boucle?.a, boucle?.pas]
    .every((borne) => Number.isFinite(borneDe(borne).nombre));
}

/** Un nombre et son unité, lus d'une borne écrite. */
function borneDe(dite) {
  const coupe = couperLUnite(texte(dite));
  return { nombre: lireUnNombre(coupe.nombre), unite: texte(coupe.unite), dite: texte(dite) };
}

/**
 * Les valeurs que la boucle parcourt, de la première à la dernière.
 *
 * **Les trois bornes se ramènent à l'unité de départ.** `de 20 cm à 2 m par pas
 * de 20 cm` est une suite de centimètres, et c'est celle qu'on a écrite en
 * premier qui décide — la même règle que partout ailleurs dans le langage.
 *
 * La dernière valeur est incluse quand le pas tombe juste, et le tableau
 * s'arrête avant sinon : `de 0 à 10 par pas de 3` fait 0, 3, 6, 9 — jamais 12.
 * Dépasser la fin annoncée serait un piège silencieux.
 *
 * @returns {{valeurs: {nombre: number, unite: string, dite: string}[],
 *   refus: string, ou: string}}
 */
export function valeursDeLaBoucle(boucle = {}) {
  const depart = borneDe(boucle?.de);
  const fin = borneDe(boucle?.a);
  const pas = borneDe(boucle?.pas);

  const refuse = (refus, ou = "") => ({ valeurs: [], refus, ou });

  for (const borne of [depart, fin, pas]) {
    if (!Number.isFinite(borne.nombre)) {
      return refuse(REFUS_DE_LA_BOUCLE.PAS_UN_NOMBRE, borne.dite);
    }
  }

  // Les trois bornes mesurent la même chose, ou la boucle ne veut rien dire :
  // aller de deux mètres à dix kilonewtons n'est pas une suite.
  for (const borne of [fin, pas]) {
    if (!memeGrandeur(depart.unite, borne.unite)) {
      return refuse(REFUS_DE_LA_BOUCLE.UNITES, phraseDesUnites(depart.unite, borne.unite));
    }
  }

  const jusqua = convertir(fin.nombre, fin.unite, depart.unite);
  const avance = convertir(pas.nombre, pas.unite, depart.unite);
  if (jusqua === null || avance === null) {
    return refuse(REFUS_DE_LA_BOUCLE.UNITES, phraseDesUnites(depart.unite, fin.unite));
  }

  if (avance === 0) return refuse(REFUS_DE_LA_BOUCLE.PAS_NUL);

  const chemin = jusqua - depart.nombre;
  // Un départ égal à la fin fait une ligne, quel que soit le pas : la suite est
  // parcourue, elle ne tient qu'en un point.
  if (chemin !== 0 && Math.sign(chemin) !== Math.sign(avance)) {
    return refuse(REFUS_DE_LA_BOUCLE.SENS);
  }

  /**
   * **Le compte se calcule, il ne se découvre pas en avançant.**
   *
   * Une boucle qui s'arrête « quand on dépasse » accumule le bruit du binaire
   * à chaque pas, et `0,1` ajouté dix fois ne vaut pas `1`. On compte donc les
   * pas une fois, et chaque valeur se pose par multiplication depuis le départ.
   */
  const combien = Math.floor(auJusteNecessaire(chemin / avance)) + 1;
  if (combien > PLUS_LONG_TABLEAU) {
    return refuse(REFUS_DE_LA_BOUCLE.TROP_LONG, String(combien));
  }

  const valeurs = [];
  for (let rang = 0; rang < combien; rang += 1) {
    const nombre = auJusteNecessaire(depart.nombre + rang * avance);
    valeurs.push({
      nombre,
      unite: depart.unite,
      dite: mesureEnFrancais(depart.unite ? `${nombre} ${depart.unite}` : `${nombre}`)
    });
  }

  return { valeurs, refus: "", ou: "" };
}

/**
 * Ce qu'une colonne du tableau vaut, une fois agrégée.
 *
 * **Une ligne qu'on n'a pas su calculer ne compte pas.** Elle ne vaut pas zéro :
 * une somme qui compterait les trous comme des zéros rendrait un total plus
 * petit que la réalité, et rien ne le dirait. Le nombre de lignes retenues se
 * lit d'ailleurs, par `le nombre de`.
 *
 * **Toutes les valeurs se ramènent à l'unité de la première.** Une colonne dont
 * les lignes portent des unités qui ne mesurent pas la même chose ne s'agrège
 * pas : c'est un doute, pas un total.
 *
 * @param {string} quoi une valeur de `AGREGAT`
 * @param {{valeur: string}[]} cellules les valeurs de la colonne, écrites
 * @returns {{connu: boolean, valeur: string, combien: number}}
 */
export function agregerUneColonne(quoi, cellules = []) {
  const lues = (Array.isArray(cellules) ? cellules : [])
    .map((une) => borneDe(une?.valeur ?? une))
    .filter((une) => Number.isFinite(une.nombre));

  const rien = { connu: false, valeur: "", combien: lues.length };
  if (quoi === AGREGAT.COMBIEN) {
    return { connu: true, valeur: String(lues.length), combien: lues.length };
  }
  if (!lues.length) return rien;

  const unite = lues[0].unite;
  const nombres = [];
  for (const une of lues) {
    const porte = convertir(une.nombre, une.unite, unite);
    // Une colonne qui mélange une longueur et une force ne s'additionne pas, et
    // ne se compare pas non plus : on ne rend rien plutôt qu'un total faux.
    if (porte === null) return rien;
    nombres.push(porte);
  }

  const total = nombres.reduce((somme, un) => somme + un, 0);
  const brut = quoi === AGREGAT.SOMME ? total
    : quoi === AGREGAT.PLUS_GRAND ? Math.max(...nombres)
      : quoi === AGREGAT.PLUS_PETIT ? Math.min(...nombres)
        : quoi === AGREGAT.MOYENNE ? total / nombres.length
          : null;

  if (brut === null) return rien;

  const nombre = auJusteNecessaire(brut);
  return {
    connu: true,
    valeur: mesureEnFrancais(unite ? `${nombre} ${unite}` : `${nombre}`),
    combien: nombres.length
  };
}
