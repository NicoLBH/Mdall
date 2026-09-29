/**
 * La ligne de base — **le prédicteur bête, et le mur contre lequel cogner**.
 *
 * ## Pourquoi on le construit avant le vrai
 *
 * > « Si le moteur ne bat pas la ligne de base, ce n'est pas un moat, c'est une
 * > décoration — et il vaut mieux le savoir au premier mois qu'à la troisième
 * > année. » (`docs/la-memoire-qui-predit.md`, § 4)
 *
 * Un chiffre de précision sans référence ne veut rien dire. « 44 % » est
 * excellent si le hasard fait 12 %, et lamentable si compter les occurrences en
 * fait 60 %. C'est **la comparaison** qui informe, jamais le chiffre seul.
 *
 * ## Ce qu'on prédit ici, et pourquoi pas le sujet
 *
 * **Le domaine du prochain constat**, et non son nom.
 *
 * Un nom de constat ne se retrouve pas d'un chantier à l'autre — et pas même
 * deux fois dans le même : « Fissure en pignon » n'arrive qu'une fois. Prédire
 * un nom, sur un seul projet, est impossible **par construction**, et un
 * instrument qui mesurerait cela ne mesurerait que du bruit.
 *
 * Le domaine, lui, revient : `structure`, `incendie`, `acoustique`… C'est un
 * **domaine fermé** (`DOMAIN`, dans `assertion-taxonomy.js`), donc comptable,
 * et c'est exactement ce qu'une ligne de base sait faire.
 *
 * Le jour où les sujets porteront un nom commun — la nomenclature, dont la
 * réflexion n'est pas aboutie —, le même instrument mesurera le même prédicteur
 * sur les noms, sans rien changer d'autre.
 *
 * ## Deux bêtises, et la seconde n'est pas plus bête
 *
 * **Le plus fréquent** ne regarde que les comptes : ce chantier parle surtout
 * de structure, donc le prochain constat sera en structure. C'est la ligne de
 * base au sens strict.
 *
 * **Ce qui suit habituellement** regarde la **séquence** : après un constat de
 * structure, qu'est-ce qui est venu, les fois précédentes ? C'est déjà la forme
 * du vrai prédicteur, en plus petit — et le comparer au premier dit si la
 * séquence apporte quelque chose que le simple comptage n'a pas.
 *
 * C'est la première fois qu'on peut répondre à cette question avec un chiffre.
 *
 * ## Ils ne devinent rien
 *
 * Un prédicteur qui ne sait rien **rend une liste vide**, et l'instrument
 * compte le point comme non noté. Rendre « structure » par défaut, parce que
 * c'est le plus courant en général, ferait mesurer un préjugé.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le domaine de chaque constat, dans l'ordre où ils sont arrivés.
 *
 * Un constat sans domaine n'entre pas : on ne compte pas « sans domaine »
 * comme un domaine de plus, sans quoi il finirait en tête des fréquences sur
 * une mémoire mal rangée.
 */
function laSuiteDesDomaines(episode = null) {
  return (episode?.constats ?? [])
    .map((un) => texte(un?.domaine))
    .filter(Boolean);
}

/**
 * Les domaines, du plus fréquent au moins — **la ligne de base**.
 *
 * À égalité, l'ordre alphabétique : deux lectures du même passé doivent rendre
 * la même liste, sinon la mesure changerait d'un rejeu à l'autre.
 */
export function leplusFrequent(episode = null) {
  const comptes = new Map();
  for (const domaine of laSuiteDesDomaines(episode)) {
    comptes.set(domaine, (comptes.get(domaine) ?? 0) + 1);
  }

  return [...comptes.entries()]
    .sort((gauche, droite) => (droite[1] - gauche[1])
      || gauche[0].localeCompare(droite[0], "fr"))
    .map(([domaine]) => domaine);
}

/**
 * Ce qui suit habituellement le dernier domaine vu.
 *
 * On compte les **couples** : après `structure`, on a vu `incendie` trois fois
 * et `sol` une. Rien n'est vu après le dernier constat — il n'a pas encore de
 * suite —, donc le dernier couple s'arrête à l'avant-dernier.
 *
 * **Sans rien à dire, on ne dit rien.** Si le dernier domaine n'a jamais eu de
 * suite connue, la liste est vide : se rabattre sur le plus fréquent ferait
 * mesurer deux prédicteurs pour un, et l'on ne saurait plus lequel a marché.
 */
export function ceQuiSuitHabituellement(episode = null) {
  const suite = laSuiteDesDomaines(episode);

  // Aucune garde en tête : à un seul constat, la boucle ne tourne pas, aucun
  // couple ne se forme, et le dernier domaine n'a pas de suite connue — la
  // liste sort vide d'elle-même. Une garde qui ne peut pas tomber ne se casse
  // jamais, donc ne se vérifie pas (règle 4).
  const apres = new Map();
  for (let rang = 0; rang < suite.length - 1; rang += 1) {
    const avant = suite[rang];
    if (!apres.has(avant)) apres.set(avant, new Map());
    const siens = apres.get(avant);
    siens.set(suite[rang + 1], (siens.get(suite[rang + 1]) ?? 0) + 1);
  }

  const dernier = suite[suite.length - 1];
  const siens = apres.get(dernier);
  if (!siens) return [];

  return [...siens.entries()]
    .sort((gauche, droite) => (droite[1] - gauche[1])
      || gauche[0].localeCompare(droite[0], "fr"))
    .map(([domaine]) => domaine);
}

/**
 * Ce qui est réellement arrivé, sous la forme que l'instrument attend.
 *
 * Le pendant exact des prédicteurs : des domaines, et **leurs dates**. C'est la
 * date qui donne le délai d'avance, et la perdre ferait savoir qu'on a visé
 * juste sans savoir de combien on était en avance.
 */
export function lesDomainesVenus(suite = null) {
  return (suite?.constats ?? [])
    .map((un) => ({ quoi: texte(un?.domaine), quand: texte(un?.quand) }))
    .filter((un) => un.quoi);
}

/** Les deux lignes de base, nommées — c'est ce qu'un écran affiche. */
export const LIGNES_DE_BASE = [
  {
    cle: "le-plus-frequent",
    dit: "le domaine le plus fréquent",
    quoi: "ne regarde que les comptes, jamais l'ordre",
    predire: leplusFrequent
  },
  {
    cle: "ce-qui-suit",
    dit: "ce qui suit habituellement",
    quoi: "regarde la séquence : après ceci, il est venu cela",
    predire: ceQuiSuitHabituellement
  }
];
