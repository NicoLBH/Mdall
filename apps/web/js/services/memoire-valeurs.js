/**
 * Pour un nom et une zone, une seule valeur vaut.
 *
 * ## Le défaut
 *
 * `H0 retenu pour le département` se lisait ainsi dans `structure.ctr` :
 *
 * ```
 *    batiment-a: 0,5 m { … le: 9 septembre 2026 … statut: retenu },
 *    batiment-a: 0,5 m { … le: 7 septembre 2026 … statut: retenu },
 * ```
 *
 * Deux lignes, la même zone, le même nom, toutes deux « retenu ». Le second
 * versement n'avait pas remplacé le premier — personne n'avait posé
 * `superseded_by` —, alors les deux vivaient. À dix versements, un fichier
 * devient une pile où l'on ne sait plus ce que le projet tient pour vrai.
 *
 * C'est la règle 10 des fondamentaux, un cran plus bas : un nom vit à un seul
 * endroit, et **à un endroit donné il ne vaut qu'une chose à la fois**.
 *
 * ## La règle
 *
 * Le **dernier** versement d'un nom, pour une zone, est ce que le projet tient
 * pour vrai. Les précédents sont son histoire — ils restent lisibles dans
 * l'origine de la ligne, qui est l'endroit où on les cherche.
 *
 * Un versement n'en éclipse un autre que s'il porte **exactement la même
 * portée**. Corriger le bâtiment A ne dit rien du bâtiment B, et une valeur
 * versée « toutes zones » n'est pas la même affirmation qu'une valeur versée
 * pour un bâtiment : l'une vaut partout, l'autre ici. Laquelle l'emporte
 * lorsqu'elles se recouvrent est une question de portée, et elle se tranche
 * devant quelqu'un — pas ici, en silence.
 *
 * ## Ce qu'on ne fait pas en silence
 *
 * Quand les versements éclipsés disaient **autre chose**, ce n'est plus un
 * doublon : c'est un désaccord, et le taire reviendrait à trancher à la place
 * de quelqu'un. `valeursCorrigees` les nomme, et l'écran le dit.
 *
 * ## Pourquoi à la lecture, et pas à l'écriture
 *
 * Poser `superseded_by` au moment du versement serait mieux — et reste à
 * faire. Mais une mémoire déjà écrite ne se réécrit pas : la règle appliquée
 * ici remet d'aplomb ce qui existe **et** ce qui arrivera demain d'un
 * utilitaire tiers qui aurait oublié de remplacer.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { normalizeZoneKey } from "./project-zones.js";
import { laValeurQuiFaitFoi, ordreDesValeurs } from "./le-temps-des-valeurs.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les zones d'une affirmation, en clés de zone. Vide = « toutes zones ».
 *
 * `normalizeZoneKey` et non `cleDuSujet` : ce sont des zones, pas des sujets, et
 * la base les range en `batiment-a`. Deux normalisations pour la même chose
 * finiraient par ne plus se rencontrer.
 *
 * Le `payload` d'abord, comme partout : il garde ce que l'utilisateur a écrit.
 */
function zonesDe(assertion = {}) {
  const dites = Array.isArray(assertion?.payload?.zones) && assertion.payload.zones.length
    ? assertion.payload.zones
    : (Array.isArray(assertion?.zones) ? assertion.zones : []);
  return new Set(dites.map(normalizeZoneKey).filter(Boolean));
}

/** La portée d'un versement, sous une forme qui se compare. */
function portee(assertion = {}) {
  return [...zonesDe(assertion)].sort().join("\u0000");
}


/** Ce qu'un versement affirme, réduit à ce qui se compare. */
function dit(assertion = {}) {
  return texte(assertion?.payload?.value) || texte(assertion?.statement);
}

/**
 * Le versement le plus récent l'emporte ; à date égale, l'identifiant tranche.
 *
 * Il faut un ordre **total** : sans lui, deux lectures des mêmes affirmations
 * garderaient deux lignes différentes, et le fichier changerait d'un rendu à
 * l'autre sans que rien n'ait été versé.
 */
/**
 * Du plus récent au plus ancien — **le document d'abord, le versement ensuite**.
 *
 * L'ordre vit dans `le-temps-des-valeurs.js` et nulle part ailleurs : les trois
 * juges de ce fichier s'en servent tels quels. Deux tris écrits à deux endroits
 * finiraient par diverger, et l'écran montrerait une ligne pendant que le calcul
 * en consommerait une autre (règle 4).
 */
function duPlusRecent(versements = []) {
  return ordreDesValeurs(versements).ordonnees.map((une) => une.assertion);
}

/** Une affirmation qui ne porte pas de valeur — une règle — ne s'éclipse pas. */
function porteUneValeur(assertion) {
  return Boolean(assertion)
    && assertion?.payload?.referentiel !== true
    && !texte(assertion?.superseded_by)
    && Boolean(cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key)));
}

/**
 * Les versements qu'un plus récent a remplacés, sur toutes leurs zones.
 *
 * @param {object[]} assertions
 * @returns {Set<string>} leurs identifiants
 */
export function versementsEclipses(assertions = []) {
  const parNom = new Map();

  for (const assertion of (Array.isArray(assertions) ? assertions : []).filter(porteUneValeur)) {
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle).push(assertion);
  }

  const eclipses = new Set();

  for (const versements of parNom.values()) {
    if (versements.length < 2) continue;

    // **Le document le plus récent fait foi, et non le dernier versé.** Une
    // valeur lue dans un rapport de mars, saisie en septembre, écrasait celle
    // de juin : le projet cessait de dire ce qu'il disait la veille, sans que
    // rien ne le signale (voir `le-temps-des-valeurs.js`).
    //
    // Tant qu'aucun versement ne porte la date de son document, l'ordre ne
    // change pas : basculer sur une information absente ferait changer de sens
    // toute la mémoire déjà versée.
    const ordonnes = duPlusRecent(versements);

    for (let rang = 1; rang < ordonnes.length; rang += 1) {
      const ancien = ordonnes[rang];
      const sienne = portee(ancien);

      // Même nom, même portée, plus récent : c'est le même énoncé, refait.
      const refait = ordonnes.slice(0, rang).some((recent) => portee(recent) === sienne);
      if (refait) eclipses.add(texte(ancien.id));
    }
  }

  return eclipses;
}

/**
 * Les versements qui viennent d'un document antérieur à celui qui fait foi.
 *
 * **Ce ne sont pas des valeurs remplacées : ce sont des valeurs arrivées après
 * coup.** Elles ont été versées plus tard et lues dans un document plus ancien.
 * Elles restent dans l'histoire — elles sont vraies de leur jour — mais elles
 * ne disent pas ce que le projet dit aujourd'hui, et l'écran doit pouvoir le
 * dire au lieu de les présenter comme corrigées.
 *
 * @returns {{id: string, nom: string, enVigueur: object, retrospectif: object}[]}
 */
export function versementsRetrospectifs(assertions = []) {
  const parNom = new Map();
  for (const assertion of (Array.isArray(assertions) ? assertions : []).filter(porteUneValeur)) {
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle).push(assertion);
  }

  const trouves = [];

  for (const [nom, versements] of parNom.entries()) {
    // **On ne compare que ce qui porte la même chose.** Deux versements de
    // portées différentes ne se contredisent pas : l'un vaut pour une zone que
    // l'autre ne couvre pas.
    const parPortee = new Map();
    for (const versement of versements) {
      const sienne = portee(versement);
      if (!parPortee.has(sienne)) parPortee.set(sienne, []);
      parPortee.get(sienne).push(versement);
    }

    for (const candidats of parPortee.values()) {
      const { enVigueur, retrospectives } = laValeurQuiFaitFoi(candidats);
      for (const retrospectif of retrospectives) {
        trouves.push({ id: texte(retrospectif?.id), nom, enVigueur, retrospectif });
      }
    }
  }

  return trouves;
}

/**
 * Les noms dont un versement plus récent a changé la valeur, sans le dire.
 *
 * Un doublon — la même valeur versée deux fois — ne se signale pas : il n'y a
 * rien à trancher. Une valeur qui change en silence, si : quelqu'un doit savoir
 * que le projet ne dit plus la même chose qu'hier.
 *
 * @returns {{nom: string, avant: string, apres: string, zones: string[]}[]}
 */
export function valeursCorrigees(assertions = []) {
  const eclipses = versementsEclipses(assertions);
  if (!eclipses.size) return [];

  const parNom = new Map();
  for (const assertion of (Array.isArray(assertions) ? assertions : []).filter(porteUneValeur)) {
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle).push(assertion);
  }

  const corrections = [];

  for (const versements of parNom.values()) {
    const ordonnes = duPlusRecent(versements);
    const vivant = ordonnes.find((assertion) => !eclipses.has(texte(assertion.id)));
    if (!vivant) continue;

    // Un seul avis par nom : répéter la correction pour chaque versement
    // éclipsé ferait lire dix désaccords là où le projet en a un.
    const autre = ordonnes.find((assertion) =>
      eclipses.has(texte(assertion.id))
      && portee(assertion) === portee(vivant)
      && dit(assertion) !== dit(vivant));
    if (!autre) continue;

    corrections.push({
      nom: texte(vivant?.payload?.subject) || texte(vivant?.subject_key),
      avant: dit(autre),
      apres: dit(vivant),
      zones: [...zonesDe(vivant)]
    });
  }

  return corrections;
}


/**
 * Le versement qui vaut, dans une zone, parmi ceux d'un même nom.
 *
 * ## Les deux règles, et il en faut deux
 *
 * **La plus spécifique l'emporte.** Poser une valeur pour tout le projet puis la
 * raffiner sur un bâtiment est la façon normale de travailler — une généralité,
 * puis ses exceptions. Une valeur qui nomme la zone l'emporte donc sur une valeur
 * qui vaut partout ; ailleurs, c'est la générale qui s'applique.
 *
 * **À portée égale, la plus récente.** C'est la règle du haut de ce fichier, et
 * c'est elle qui manquait ici : les deux résolutions prenaient **la première du
 * tableau**, c'est-à-dire l'ordre où la base avait rendu ses lignes. L'écran
 * montrait « 42 m » et le calcul tournait sur « 13 m ». Une variante posée sur la
 * valeur affichée ne changeait alors rien en aval — elle mentait sans le dire.
 *
 * ## Pourquoi ici
 *
 * Parce qu'il ne peut y avoir qu'un juge. Ce que l'écran affiche et ce que le
 * rejeu consomme doivent être **la même ligne**, sans quoi la mémoire dit une
 * chose et le calcul en fait une autre — le pire des deux mondes, parce que rien
 * ne le signale.
 *
 * @param {object[]} candidats les versements d'un même nom
 * @param {string} [zone] la clé de zone, `""` pour la portée générale
 * @returns {object|null}
 */
export function versementQuiVaut(candidats = [], zone = "") {
  const voulue = normalizeZoneKey(zone);
  const dits = (Array.isArray(candidats) ? candidats : []).filter(porteUneValeur);

  const parRecence = (liste) => duPlusRecent(liste)[0] ?? null;

  // Ce qui nomme cette zone, d'abord. Puis ce qui vaut partout.
  const dansLaZone = voulue ? dits.filter((assertion) => zonesDe(assertion).has(voulue)) : [];
  if (dansLaZone.length) return parRecence(dansLaZone);

  return parRecence(dits.filter((assertion) => zonesDe(assertion).size === 0));
}

/**
 * Les valeurs d'une zone : `clé du nom → versement`.
 *
 * Le même juge, appliqué à toute la mémoire d'un coup. Une règle n'y entre pas :
 * elle produit une valeur, elle ne la porte pas.
 */
export function valeursDeLaPortee(assertions = [], zone = "") {
  const parNom = new Map();

  for (const assertion of (Array.isArray(assertions) ? assertions : []).filter(porteUneValeur)) {
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle).push(assertion);
  }

  const retenues = new Map();
  for (const [cle, candidats] of parNom) {
    const retenue = versementQuiVaut(candidats, zone);
    if (retenue) retenues.set(cle, retenue);
  }
  return retenues;
}


/**
 * Les exceptions qui répètent la valeur générale.
 *
 * `Toutes zones: 0,5 m` et `batiment-a: 0,5 m` : la seconde ne dit rien de plus
 * que la première **aujourd'hui**. C'est un piège, et il se referme plus tard :
 * le jour où la générale passe à 0,6 m, `batiment-a` reste à 0,5 m sans que
 * personne l'ait décidé — une exception que rien ne justifie fige une valeur que
 * tout le monde croit suivre.
 *
 * On ne la retire pas : peut-être quelqu'un a-t-il voulu, précisément, que ce
 * bâtiment ne bouge plus. On la **nomme**, et il décide.
 *
 * @returns {{nom: string, zones: string[], valeur: string}[]}
 */
export function exceptionsInutiles(assertions = []) {
  const dits = (Array.isArray(assertions) ? assertions : []).filter(porteUneValeur);
  const parNom = new Map();

  for (const assertion of dits) {
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle).push(assertion);
  }

  const inutiles = [];

  for (const candidats of parNom.values()) {
    const generale = versementQuiVaut(candidats, "");
    if (!generale) continue;

    const zones = new Set(candidats.flatMap((assertion) => [...zonesDe(assertion)]));
    const repetent = [...zones]
      .filter((zone) => {
        const ici = versementQuiVaut(candidats, zone);
        // Celle qui vaut ici est bien une exception — pas la générale elle-même
        // vue depuis cette zone —, et elle dit la même chose.
        return ici && ici !== generale && dit(ici) === dit(generale);
      })
      .sort();

    if (!repetent.length) continue;
    inutiles.push({
      nom: texte(generale?.payload?.subject) || texte(generale?.subject_key),
      zones: repetent,
      valeur: dit(generale)
    });
  }

  return inutiles;
}
