/**
 * Les unités du bâtiment, et ce qui se convertit en quoi.
 *
 * ## Le défaut que ça répare, et il est silencieux
 *
 * Une erreur d'unité est la faute la plus chère du bâtiment, et la plus
 * discrète : rien ne la signale avant le chantier. Le langage portait déjà les
 * unités — une condition sait qu'elle compare des mètres — et il faisait la
 * moitié du travail :
 *
 * - `26 m` contre `28 kN` : **refusé**, et c'est juste ;
 * - `0,71 m + 35 cm` : **refusé aussi**, et c'est faux. Ce sont deux longueurs.
 *
 * Le second cas est le plus commun de tous — une cote en centimètres dans un
 * plan, une portée en mètres dans une note —, et il bloquait. La règle est donc
 * celle-ci, et elle tient en une phrase :
 *
 * > **Deux unités d'une même grandeur se convertissent ; deux grandeurs
 * > différentes se refusent.**
 *
 * ## Une table de bases, et les exposants s'en déduisent
 *
 * On ne liste pas `m²`, `cm²`, `dm²`, `m³`… On liste `m` et `cm`, et le carré
 * d'un facteur est son carré : `1 m = 100 cm` donne `1 m² = 10 000 cm²` sans
 * qu'on l'écrive. Une table qui les énumérerait aurait un trou dès la première
 * unité oubliée, et ce trou se lirait comme « incomparables ».
 *
 * `lireUneUnite` coupe `m²` en base et exposant, et vit ici : le vocabulaire
 * d'une unité précède ce qu'on en fait.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne compose pas les unités.** `kN/m` reste opaque, comme aujourd'hui :
 * deux `kN/m` s'additionnent, un `kN/m` et un `N/mm` se refusent, alors que ce
 * sont la même chose. Une algèbre dimensionnelle complète est un autre travail,
 * et prétendre la faire à moitié ferait accepter des conversions fausses — ce
 * qui est exactement pire que de refuser.
 *
 * **Il ne convertit pas les températures.** Un degré Celsius n'est pas un
 * facteur, c'est un facteur **et** un décalage : `0 °C` ne vaut pas `0 K`. Le
 * modèle de ce fichier est multiplicatif, et l'y forcer rendrait des sommes
 * fausses. `°C` reste donc une unité qui ne se convertit qu'à elle-même.
 *
 * **Il ne devine aucune unité.** Un symbole inconnu n'est pas rapproché du plus
 * proche : il est rendu tel quel, et deux symboles inconnus ne se comparent que
 * s'ils s'écrivent pareil. « daN » mal orthographié ne devient pas « dN ».
 */

const texte = (valeur) => String(valeur ?? "").trim();

/* ────────────────────────────────────────────────────────────────────────────
 * Lire et écrire une unité
 *
 * `m`, `m²`, `m³` sont la même unité à trois exposants. Ces deux fonctions
 * vivaient dans `mdall-calcul.js`, qui compose les unités d'un produit ; elles
 * sont ici parce que **le vocabulaire d'une unité précède ce qu'on en fait** —
 * le calculateur, l'évaluateur et le barème s'en servent tous les trois, et
 * laisser la lecture chez l'un des trois aurait fait dépendre les deux autres
 * de lui.
 * ──────────────────────────────────────────────────────────────────────────── */

const EXPOSANTS = { "²": 2, "³": 3 };
const SIGNES_DE_LEXPOSANT = { 2: "²", 3: "³" };

/** `m²` → `{ base: "m", exposant: 2 }`. Une unité opaque garde l'exposant 1. */
export function lireUneUnite(unite = "") {
  const brut = texte(unite);
  if (!brut) return { base: "", exposant: 0, opaque: false };

  const trouve = brut.match(/^([A-Za-zÀ-ÖØ-öø-ÿ°µ]+)([²³])$/);
  if (trouve) return { base: trouve[1], exposant: EXPOSANTS[trouve[2]], opaque: false };
  if (/^[A-Za-zÀ-ÖØ-öø-ÿ°µ€]+$/.test(brut)) return { base: brut, exposant: 1, opaque: false };

  // `km/h`, `kN/m²`, `%` : on ne sait ni les élever ni les composer entre
  // elles. On ne prétend pas le contraire.
  return { base: brut, exposant: 1, opaque: true };
}

/** `{ base: "m", exposant: 2 }` → `m²`. Un exposant qu'on ne sait pas écrire refuse. */
export function ecrireUneUnite({ base = "", exposant = 0 } = {}) {
  if (!base || exposant === 0) return "";
  if (exposant === 1) return base;
  return SIGNES_DE_LEXPOSANT[exposant] ? `${base}${SIGNES_DE_LEXPOSANT[exposant]}` : null;
}

/**
 * Les grandeurs que le métier manipule, et le nom qu'on leur donne à l'écran.
 *
 * Elles servent à **dire pourquoi** deux valeurs ne se comparent pas : « une
 * longueur et une force » se comprend, « m et kN » demande de réfléchir.
 */
export const GRANDEUR = {
  LONGUEUR: "longueur",
  SURFACE: "surface",
  VOLUME: "volume",
  MASSE: "masse",
  FORCE: "force",
  PRESSION: "pression",
  TEMPS: "temps",
  ANGLE: "angle",
  PUISSANCE: "puissance",
  TEMPERATURE: "température"
};

const NOMS = {
  [GRANDEUR.LONGUEUR]: "une longueur",
  [GRANDEUR.SURFACE]: "une surface",
  [GRANDEUR.VOLUME]: "un volume",
  [GRANDEUR.MASSE]: "une masse",
  [GRANDEUR.FORCE]: "une force",
  [GRANDEUR.PRESSION]: "une pression",
  [GRANDEUR.TEMPS]: "une durée",
  [GRANDEUR.ANGLE]: "un angle",
  [GRANDEUR.PUISSANCE]: "une puissance",
  [GRANDEUR.TEMPERATURE]: "une température"
};

/** Le nom d'une grandeur, pour une phrase. Vide quand on ne la connaît pas. */
export function nomDeLaGrandeur(grandeur) {
  return NOMS[texte(grandeur)] ?? "";
}

/**
 * Les unités de base, avec ce qu'elles valent dans la référence de leur
 * grandeur.
 *
 * La référence est l'unité du métier, pas celle du système international : on
 * dimensionne en mètres et en kilonewtons, pas en mètres et en newtons. Ce
 * choix ne change aucun calcul — il décide seulement de l'unité qu'un résultat
 * porte quand rien ne l'impose.
 *
 * **La casse compte**, et c'est voulu : `M` est méga, `m` est milli. Confondre
 * `mN` et `MN` est un facteur d'un milliard.
 */
/**
 * Les unités de base : **ce qu'elles mesurent**, et ce qu'elles valent dans la
 * référence du métier.
 *
 * ## Une dimension, pas une grandeur
 *
 * Chaque unité porte un **exposant par grandeur fondamentale** plutôt qu'une
 * grandeur unique. C'est ce qui manquait pour composer : `kN/m` et `N/mm` sont
 * la même chose — une force par unité de longueur —, et le langage les refusait
 * l'une à l'autre parce qu'aucune des deux n'était au tableau.
 *
 * Les grandeurs **dérivées** se disent donc en fondamentales : une surface est
 * une longueur au carré, une pression est une force par une surface. Elles
 * gardent leur nom à l'écran (« une pression »), et se comparent désormais à ce
 * qui les compose : `1 MPa` vaut `1000 kN/m²`, et les deux s'additionnent.
 *
 * ## La référence est celle du métier
 *
 * Le mètre, le kilogramme, le **kilonewton** — on dimensionne en kN, pas en N —,
 * l'heure, le degré, le kilowatt. Ce choix ne change aucun calcul : il décide
 * seulement de l'unité qu'un résultat porte quand rien ne l'impose.
 *
 * **La casse compte**, et c'est voulu : `M` est méga, `m` est milli. Confondre
 * `mN` et `MN` est un facteur d'un milliard.
 */
const UNITES = new Map(Object.entries({
  // Longueur — référence : le mètre.
  mm: { dimension: { [GRANDEUR.LONGUEUR]: 1 }, facteur: 0.001 },
  cm: { dimension: { [GRANDEUR.LONGUEUR]: 1 }, facteur: 0.01 },
  dm: { dimension: { [GRANDEUR.LONGUEUR]: 1 }, facteur: 0.1 },
  m: { dimension: { [GRANDEUR.LONGUEUR]: 1 }, facteur: 1 },
  km: { dimension: { [GRANDEUR.LONGUEUR]: 1 }, facteur: 1000 },

  // Surface et volume que la puissance d'une longueur ne donne pas.
  ha: { dimension: { [GRANDEUR.LONGUEUR]: 2 }, facteur: 10000 },
  a: { dimension: { [GRANDEUR.LONGUEUR]: 2 }, facteur: 100 },
  L: { dimension: { [GRANDEUR.LONGUEUR]: 3 }, facteur: 0.001 },
  mL: { dimension: { [GRANDEUR.LONGUEUR]: 3 }, facteur: 0.000001 },

  // Masse — référence : le kilogramme.
  g: { dimension: { [GRANDEUR.MASSE]: 1 }, facteur: 0.001 },
  kg: { dimension: { [GRANDEUR.MASSE]: 1 }, facteur: 1 },
  t: { dimension: { [GRANDEUR.MASSE]: 1 }, facteur: 1000 },

  /**
   * Force — référence : le kilonewton, celui des descentes de charge.
   *
   * **Elle est fondamentale ici, et pas dérivée de la masse.** Le système
   * international la tire d'une masse et d'une accélération ; ce métier ne
   * convertit jamais l'une en l'autre — il n'y a pas de `g` dans le langage —,
   * et les lier ferait accepter `3 kg + 2 kN` sur un facteur qu'aucune ligne
   * n'écrit. Refuser reste la bonne réponse (règle 5).
   */
  N: { dimension: { [GRANDEUR.FORCE]: 1 }, facteur: 0.001 },
  daN: { dimension: { [GRANDEUR.FORCE]: 1 }, facteur: 0.01 },
  kN: { dimension: { [GRANDEUR.FORCE]: 1 }, facteur: 1 },
  MN: { dimension: { [GRANDEUR.FORCE]: 1 }, facteur: 1000 },

  /**
   * Pression et contrainte — **une force par une surface**, en kN/m².
   *
   * C'est là que la composition se gagne : `1 MPa` vaut `1000 kN/m²`, et les
   * deux écritures se rencontrent tous les jours — le béton en MPa, la descente
   * de charge en kN/m². Elles se refusaient l'une à l'autre.
   */
  Pa: { dimension: { [GRANDEUR.FORCE]: 1, [GRANDEUR.LONGUEUR]: -2 }, facteur: 0.001 },
  kPa: { dimension: { [GRANDEUR.FORCE]: 1, [GRANDEUR.LONGUEUR]: -2 }, facteur: 1 },
  MPa: { dimension: { [GRANDEUR.FORCE]: 1, [GRANDEUR.LONGUEUR]: -2 }, facteur: 1000 },
  GPa: { dimension: { [GRANDEUR.FORCE]: 1, [GRANDEUR.LONGUEUR]: -2 }, facteur: 1000000 },
  bar: { dimension: { [GRANDEUR.FORCE]: 1, [GRANDEUR.LONGUEUR]: -2 }, facteur: 100 },

  // Durée — référence : l'heure, celle des degrés coupe-feu.
  s: { dimension: { [GRANDEUR.TEMPS]: 1 }, facteur: 1 / 3600 },
  min: { dimension: { [GRANDEUR.TEMPS]: 1 }, facteur: 1 / 60 },
  h: { dimension: { [GRANDEUR.TEMPS]: 1 }, facteur: 1 },
  j: { dimension: { [GRANDEUR.TEMPS]: 1 }, facteur: 24 },

  /**
   * Puissance — référence : le kilowatt.
   *
   * **Fondamentale elle aussi.** Un watt est un joule par seconde, et un joule
   * un newton-mètre : la dériver ferait convertir `kW` en `kN·m/h`, que
   * personne n'écrit et que le lexique ne sait pas lire. Elle ne se compare
   * donc qu'à elle-même, ce qui est le comportement d'hier.
   */
  W: { dimension: { [GRANDEUR.PUISSANCE]: 1 }, facteur: 0.001 },
  kW: { dimension: { [GRANDEUR.PUISSANCE]: 1 }, facteur: 1 },
  MW: { dimension: { [GRANDEUR.PUISSANCE]: 1 }, facteur: 1000 },

  // Angle, et la température qui ne se convertit qu'à elle-même — un degré
  // Celsius est un facteur **et** un décalage, et ce modèle est multiplicatif.
  "\u00b0": { dimension: { [GRANDEUR.ANGLE]: 1 }, facteur: 1 },
  "\u00b0C": { dimension: { [GRANDEUR.TEMPERATURE]: 1 }, facteur: 1 }
}));

/**
 * Les dimensions qui portent un nom, pour que l'écran puisse les dire.
 *
 * « une longueur et une force » se comprend ; « m et kN » demande de réfléchir,
 * et c'est au moment où l'on est pressé qu'on lit ce message. Une dimension qui
 * n'est pas là-dedans — `kN/m` — n'a pas de nom français : on montre alors les
 * symboles, plutôt que d'inventer « une force par longueur », qui n'apprend
 * rien de plus que `kN/m`.
 */
const NOMMEES = [
  [{ [GRANDEUR.LONGUEUR]: 1 }, GRANDEUR.LONGUEUR],
  [{ [GRANDEUR.LONGUEUR]: 2 }, GRANDEUR.SURFACE],
  [{ [GRANDEUR.LONGUEUR]: 3 }, GRANDEUR.VOLUME],
  [{ [GRANDEUR.MASSE]: 1 }, GRANDEUR.MASSE],
  [{ [GRANDEUR.FORCE]: 1 }, GRANDEUR.FORCE],
  [{ [GRANDEUR.FORCE]: 1, [GRANDEUR.LONGUEUR]: -2 }, GRANDEUR.PRESSION],
  [{ [GRANDEUR.TEMPS]: 1 }, GRANDEUR.TEMPS],
  [{ [GRANDEUR.ANGLE]: 1 }, GRANDEUR.ANGLE],
  [{ [GRANDEUR.PUISSANCE]: 1 }, GRANDEUR.PUISSANCE],
  [{ [GRANDEUR.TEMPERATURE]: 1 }, GRANDEUR.TEMPERATURE]
];

/**
 * Ce qui, dans un nombre, est de la précision — et ce qui est du bruit.
 *
 * Douze chiffres significatifs : au-delà, c'est le bruit du binaire. `0,1 + 0,2`
 * doit s'écrire `0,3` comme on l'a demandé, et `35 cm` ramenés en mètres doivent
 * valoir `0,35` et non `0,35000000000000003`.
 *
 * **La règle vivait dans l'écriture d'un calcul**, où elle décidait de
 * l'affichage. Elle décide aussi de l'égalité de deux mesures — `26 m` et
 * `2600 cm` sont la même hauteur —, et une égalité qui ne suivrait pas la même
 * règle que l'affichage dirait « différentes » de deux valeurs que l'écran
 * montre identiques. Elle est donc ici, une fois, pour les deux (règle 10).
 */
export function auJusteNecessaire(nombre) {
  return Number.isFinite(nombre) ? Number(nombre.toPrecision(12)) : nombre;
}

/** Le même vecteur, sans ses exposants nuls, et toujours dans le même ordre. */
function rangee(dimension = {}) {
  return Object.entries(dimension)
    .filter(([, exposant]) => exposant !== 0)
    .sort(([une], [autre]) => (une < autre ? -1 : une > autre ? 1 : 0));
}

/**
 * Le nom d'une dimension : celui du métier quand elle en a un, sinon une
 * signature qui ne sert qu'à comparer.
 *
 * La signature n'est **jamais montrée** : elle est là pour que deux unités qui
 * mesurent la même chose se reconnaissent, et `nomDeLaGrandeur` ne la traduit
 * pas — l'écran retombe alors sur les symboles, qui sont plus clairs.
 */
function nomDeLaDimension(dimension = {}) {
  const dite = rangee(dimension);
  if (!dite.length) return "";

  for (const [connue, nom] of NOMMEES) {
    const autre = rangee(connue);
    if (autre.length !== dite.length) continue;
    if (autre.every(([quoi, exposant], rang) =>
      dite[rang][0] === quoi && dite[rang][1] === exposant)) return nom;
  }

  return dite.map(([quoi, exposant]) => `${quoi}^${exposant}`).join("·");
}

/** `m²` en `{m: 2}`, avec son facteur élevé d'autant. */
function elever({ dimension, facteur }, exposant) {
  const eleve = {};
  for (const [quoi, combien] of Object.entries(dimension)) eleve[quoi] = combien * exposant;
  return { dimension: eleve, facteur: facteur ** exposant };
}

/** `kN` sur `m` : les exposants se soustraient, les facteurs se divisent. */
function diviser(haut, bas) {
  const dimension = { ...haut.dimension };
  for (const [quoi, combien] of Object.entries(bas.dimension)) {
    dimension[quoi] = (dimension[quoi] ?? 0) - combien;
  }
  return { dimension, facteur: haut.facteur / bas.facteur };
}

/** Un morceau d'unité écrit — `m`, `m²`, `mm³` — lu en dimension et facteur. */
function unMorceau(dit = "") {
  const trouve = texte(dit).match(/^([A-Za-zÀ-ÖØ-öø-ÿ°µ]+)([²³]?)$/);
  if (!trouve) return null;

  const connue = UNITES.get(trouve[1]);
  if (!connue) return null;

  const exposant = EXPOSANTS[trouve[2]] ?? 1;
  return elever(connue, exposant);
}

/**
 * Ce qu'une unité écrite **mesure**, et ce qu'elle vaut dans la référence.
 *
 * Les formes lues sont celles que le langage écrit : `m`, `m²`, `kN/m`,
 * `N/mm²`. Un symbole inconnu, un `%`, un `€` n'y sont pas — ils ne se
 * convertissent à rien et ne se comparent qu'à eux-mêmes, ce qui est le
 * comportement d'hier et la bonne réponse : deviner ferait pire que refuser.
 *
 * @returns {{dimension: object, facteur: number}|null}
 */
function dimensionDeLUnite(unite = "") {
  const dite = texte(unite);
  if (!dite) return null;

  const barre = dite.indexOf("/");
  if (barre < 0) return unMorceau(dite);

  const haut = unMorceau(dite.slice(0, barre));
  const bas = unMorceau(dite.slice(barre + 1));
  if (!haut || !bas) return null;

  return diviser(haut, bas);
}

/**
 * La grandeur d'une unité écrite, et ce qu'elle vaut dans la référence.
 *
 * @returns {{grandeur: string, facteur: number}|null} `null` quand l'unité
 *   n'est pas lisible — un symbole inconnu, `%`, `€`. Ce fichier ne prétend pas
 *   savoir ce qu'ils mesurent.
 */
export function grandeurDeLUnite(unite = "") {
  const lue = dimensionDeLUnite(unite);
  if (!lue) return null;

  const grandeur = nomDeLaDimension(lue.dimension);
  // `m/m` n'est plus une grandeur : c'est un nombre nu, et le rendre comparable
  // à toute autre dimension vide ferait additionner un rapport de longueurs à
  // un rapport de forces. On refuse, comme pour un symbole inconnu.
  if (!grandeur) return null;

  return { grandeur, facteur: lue.facteur };
}

/**
 * Deux unités mesurent-elles la même chose ?
 *
 * Deux unités illisibles — `%`, `€`, ou un symbole mal orthographié — ne se
 * comparent que si elles s'écrivent **exactement** pareil. C'est le
 * comportement d'avant, et il reste : deviner ferait pire que refuser.
 */
export function memeGrandeur(une = "", autre = "") {
  const gauche = texte(une);
  const droite = texte(autre);
  if (!gauche || !droite) return true;

  const a = grandeurDeLUnite(gauche);
  const b = grandeurDeLUnite(droite);
  if (!a || !b) return gauche === droite;

  return a.grandeur === b.grandeur;
}

/**
 * Un nombre, porté d'une unité à une autre.
 *
 * @returns {number|null} `null` quand les deux ne mesurent pas la même chose,
 *   ou quand l'une des deux n'est pas lisible. L'appelant refuse alors, il ne
 *   rend pas le nombre tel quel — un mètre pris pour un centimètre est une
 *   erreur d'un facteur cent, et elle ne se voit pas.
 */
export function convertir(nombre, de = "", vers = "") {
  if (!Number.isFinite(nombre)) return null;

  const depart = texte(de);
  const arrivee = texte(vers);
  // Sans unité d'un côté, il n'y a rien à convertir : le nombre vaut ce qu'il
  // vaut, dans l'unité de l'autre. C'est ce que le langage fait déjà quand on
  // écrit `2 * 3 m`.
  if (!depart || !arrivee || depart === arrivee) return nombre;

  const a = grandeurDeLUnite(depart);
  const b = grandeurDeLUnite(arrivee);
  if (!a || !b || a.grandeur !== b.grandeur) return null;

  return auJusteNecessaire((nombre * a.facteur) / b.facteur);
}

/**
 * Pourquoi deux unités ne se comparent pas, dit en français.
 *
 * Nommer les **grandeurs** plutôt que les symboles : « une longueur et une
 * force » se comprend d'un coup d'œil, « m et kN » demande de réfléchir — et
 * c'est au moment où l'on est pressé qu'on lit ce message.
 *
 * Une dimension composée n'a pas de nom français : `kN/m` se dit `kN/m`, et
 * c'est plus clair que « une force par longueur ».
 */
export function phraseDesUnites(une = "", autre = "") {
  const gauche = texte(une) || "sans unité";
  const droite = texte(autre) || "sans unité";

  const a = grandeurDeLUnite(une);
  const b = grandeurDeLUnite(autre);

  if (a && b && a.grandeur !== b.grandeur) {
    return `${nomDeLaGrandeur(a.grandeur)} et ${nomDeLaGrandeur(b.grandeur)} — ${gauche} et ${droite}`;
  }

  // L'une des deux n'est pas au tableau : on ne prétend pas savoir ce qu'elle
  // mesure, et on le dit ainsi plutôt que d'inventer une grandeur.
  return `${gauche} et ${droite}`;
}
