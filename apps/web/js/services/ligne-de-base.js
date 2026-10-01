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
 * ## Ce jour est arrivé, et rien d'autre n'a changé
 *
 * « Le jour où les sujets porteront un nom commun, le même instrument mesurera
 * le même prédicteur sur les noms, sans rien changer d'autre » : c'est écrit
 * ici depuis le début, et c'est exactement ce qui se passe.
 *
 * Les sujets sont ce nom commun — non pas le titre d'un constat, qui n'arrive
 * qu'une fois, mais les **termes techniques** qu'il emploie : « nappe
 * phreatique », « plancher beton », « cuvelage ». Ils viennent d'une seule
 * extraction, en SQL (`les_sujets_dun_texte`), la même qui nourrit la console.
 *
 * **Pourquoi huit cases ne suffisaient pas**, et c'est tout l'enjeu : « après le
 * sol, la structure » est une évidence, et personne ne paie pour une évidence.
 * « après une question de nappe phréatique, une question de cuvelage » est un
 * renseignement. Le prédicteur ne devient utile qu'à cette granulométrie.
 *
 * **Une affirmation porte plusieurs sujets**, là où elle ne portait qu'un
 * domaine. Les prédicteurs changent donc d'une chose, et d'une seule : la suite
 * n'est plus une suite de valeurs, c'est une suite d'**ensembles**. Tout le
 * reste — le classement, l'égalité tranchée à l'alphabet, le refus de deviner —
 * est le même, et c'est pour cela que les deux mesures se comparent.
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

/* ── Les mêmes deux bêtises, sur les sujets ───────────────────────────────── */

/**
 * La suite des **ensembles** de sujets, dans l'ordre où les constats sont venus.
 *
 * C'est la seule différence avec les domaines : une affirmation portait un
 * domaine, elle porte plusieurs sujets. Un constat qui n'en porte aucun ne fait
 * pas un pas vide dans la suite — il ne dit rien, et le garder décalerait les
 * couples d'un cran.
 *
 * **Aucun dédoublonnage ici.** Il y en avait un, et un cassage a montré qu'il ne
 * pouvait pas tomber : `episodeDuProjet` réunit déjà les sujets d'un constat
 * dans un ensemble, et la base les rend `distinct`. Une garde qui ne peut pas
 * tomber ne se casse jamais, donc ne se vérifie pas — et la croire utile ferait
 * chercher ici un défaut qui vivrait ailleurs (règle 4).
 */
function laSuiteDesSujets(episode = null) {
  return (episode?.constats ?? [])
    .map((un) => (Array.isArray(un?.sujets) ? un.sujets : []).map(texte).filter(Boolean))
    .filter((siens) => siens.length > 0);
}

/**
 * Les sujets, du plus fréquent au moins — **la ligne de base, sur les sujets**.
 *
 * Un sujet répété dans la même affirmation ne compte qu'une fois, et cela se
 * décide **à la source** : la base rend les sujets d'une affirmation `distinct`,
 * et `episodeDuProjet` les réunit dans un ensemble. Le redire ici aurait fait un
 * troisième endroit où la même règle vit (règle 4).
 */
export function lesSujetsLesPlusFrequents(episode = null) {
  const comptes = new Map();
  for (const siens of laSuiteDesSujets(episode)) {
    for (const sujet of siens) comptes.set(sujet, (comptes.get(sujet) ?? 0) + 1);
  }

  return [...comptes.entries()]
    .sort((gauche, droite) => (droite[1] - gauche[1])
      || gauche[0].localeCompare(droite[0], "fr"))
    .map(([sujet]) => sujet);
}

/**
 * Ce qui suit habituellement les sujets du dernier constat.
 *
 * ## Ce qui change quand un pas porte plusieurs sujets
 *
 * On compte les couples **de chaque sujet d'un pas vers chaque sujet du
 * suivant** — la généralisation honnête de « après ceci, il est venu cela », et
 * ce que fait déjà `les_enchainements_des_sujets()` en base. Un pas qui porte
 * cinq sujets pèse donc cinq fois : c'est voulu, une affirmation qui parle de
 * cinq choses annonce la suite de cinq choses.
 *
 * ## Les suites des derniers sujets se **somment**
 *
 * Le dernier constat porte plusieurs sujets, et chacun a sa propre suite
 * connue. On additionne, plutôt que de prendre celle du premier : un sujet qui
 * revient dans les suites de trois des derniers sujets est plus probable qu'un
 * qui n'apparaît que dans une, et ne pas les sommer aurait jeté cette
 * information.
 *
 * **Sans rien à dire, on ne dit rien.** Si aucun des derniers sujets n'a de
 * suite connue, la liste est vide : se rabattre sur le plus fréquent ferait
 * mesurer deux prédicteurs pour un, et l'on ne saurait plus lequel a marché.
 */
export function ceQuiSuitHabituellementEnSujets(episode = null) {
  const suite = laSuiteDesSujets(episode);

  const apres = new Map();
  for (let rang = 0; rang < suite.length - 1; rang += 1) {
    for (const avant of suite[rang]) {
      if (!apres.has(avant)) apres.set(avant, new Map());
      const siens = apres.get(avant);
      for (const puis of suite[rang + 1]) siens.set(puis, (siens.get(puis) ?? 0) + 1);
    }
  }

  const derniers = suite[suite.length - 1] ?? [];
  const cumul = new Map();
  for (const dernier of derniers) {
    for (const [puis, combien] of apres.get(dernier) ?? []) {
      cumul.set(puis, (cumul.get(puis) ?? 0) + combien);
    }
  }

  return [...cumul.entries()]
    .sort((gauche, droite) => (droite[1] - gauche[1])
      || gauche[0].localeCompare(droite[0], "fr"))
    .map(([sujet]) => sujet);
}

/**
 * Ce qui est réellement arrivé, en sujets — le pendant de `lesDomainesVenus`.
 *
 * **Une ligne par sujet venu**, et non une par constat : c'est ce que
 * l'instrument compare aux candidats, et un constat qui porte trois sujets en a
 * trois à confronter. La date est celle du constat, pour les trois : c'est elle
 * qui donne le délai d'avance.
 */
export function lesSujetsVenus(suite = null) {
  const venus = [];
  for (const un of suite?.constats ?? []) {
    const quand = texte(un?.quand);
    // Pas d'ensemble ici non plus : les constats viennent de l'épisode, qui les
    // a déjà réunis (voir `laSuiteDesSujets`).
    for (const sujet of (Array.isArray(un?.sujets) ? un.sujets : []).map(texte)) {
      if (sujet) venus.push({ quoi: sujet, quand });
    }
  }
  return venus;
}

/**
 * Les deux lignes de base **sur les sujets**, nommées.
 *
 * Même forme que `LIGNES_DE_BASE`, et c'est voulu : l'écran les affiche par le
 * même rendu, et l'instrument les mesure par le même appel. Deux listes de
 * forme différente auraient fait deux tableaux à recaler ensemble.
 */
export const LIGNES_DE_BASE_DES_SUJETS = [
  {
    cle: "les-sujets-les-plus-frequents",
    dit: "le sujet le plus fréquent",
    quoi: "ne regarde que les comptes, jamais l'ordre",
    predire: lesSujetsLesPlusFrequents
  },
  {
    cle: "ce-qui-suit-en-sujets",
    dit: "ce qui suit habituellement",
    quoi: "regarde la séquence : après ce sujet, il est venu celui-là",
    predire: ceQuiSuitHabituellementEnSujets
  }
];
