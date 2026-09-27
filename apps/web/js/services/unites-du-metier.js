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
const UNITES = new Map(Object.entries({
  // Longueur — référence : le mètre.
  mm: { grandeur: GRANDEUR.LONGUEUR, facteur: 0.001 },
  cm: { grandeur: GRANDEUR.LONGUEUR, facteur: 0.01 },
  dm: { grandeur: GRANDEUR.LONGUEUR, facteur: 0.1 },
  m: { grandeur: GRANDEUR.LONGUEUR, facteur: 1 },
  km: { grandeur: GRANDEUR.LONGUEUR, facteur: 1000 },

  // Surface et volume que la puissance d'une longueur ne donne pas.
  ha: { grandeur: GRANDEUR.SURFACE, facteur: 10000 },
  a: { grandeur: GRANDEUR.SURFACE, facteur: 100 },
  L: { grandeur: GRANDEUR.VOLUME, facteur: 0.001 },
  mL: { grandeur: GRANDEUR.VOLUME, facteur: 0.000001 },

  // Masse — référence : le kilogramme.
  g: { grandeur: GRANDEUR.MASSE, facteur: 0.001 },
  kg: { grandeur: GRANDEUR.MASSE, facteur: 1 },
  t: { grandeur: GRANDEUR.MASSE, facteur: 1000 },

  // Force — référence : le kilonewton, celui des descentes de charge.
  N: { grandeur: GRANDEUR.FORCE, facteur: 0.001 },
  daN: { grandeur: GRANDEUR.FORCE, facteur: 0.01 },
  kN: { grandeur: GRANDEUR.FORCE, facteur: 1 },
  MN: { grandeur: GRANDEUR.FORCE, facteur: 1000 },

  // Pression et contrainte — référence : le mégapascal, celui des bétons.
  Pa: { grandeur: GRANDEUR.PRESSION, facteur: 0.000001 },
  kPa: { grandeur: GRANDEUR.PRESSION, facteur: 0.001 },
  MPa: { grandeur: GRANDEUR.PRESSION, facteur: 1 },
  GPa: { grandeur: GRANDEUR.PRESSION, facteur: 1000 },
  bar: { grandeur: GRANDEUR.PRESSION, facteur: 0.1 },

  // Durée — référence : l'heure, celle des degrés coupe-feu.
  s: { grandeur: GRANDEUR.TEMPS, facteur: 1 / 3600 },
  min: { grandeur: GRANDEUR.TEMPS, facteur: 1 / 60 },
  h: { grandeur: GRANDEUR.TEMPS, facteur: 1 },
  j: { grandeur: GRANDEUR.TEMPS, facteur: 24 },

  // Puissance — référence : le kilowatt.
  W: { grandeur: GRANDEUR.PUISSANCE, facteur: 0.001 },
  kW: { grandeur: GRANDEUR.PUISSANCE, facteur: 1 },
  MW: { grandeur: GRANDEUR.PUISSANCE, facteur: 1000 },

  // Angle, et la température qui ne se convertit qu'à elle-même.
  "°": { grandeur: GRANDEUR.ANGLE, facteur: 1 },
  "°C": { grandeur: GRANDEUR.TEMPERATURE, facteur: 1 }
}));

/** Ce qu'un exposant fait à la grandeur d'une longueur. Ailleurs : rien. */
const PUISSANCES_DE_LA_LONGUEUR = {
  2: GRANDEUR.SURFACE,
  3: GRANDEUR.VOLUME
};

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

/**
 * La grandeur d'une unité écrite, et ce qu'elle vaut dans la référence.
 *
 * @returns {{grandeur: string, facteur: number}|null} `null` quand l'unité
 *   n'est pas au tableau — un symbole inconnu, ou une unité composée comme
 *   `kN/m`, que ce fichier ne prétend pas savoir convertir.
 */
export function grandeurDeLUnite(unite = "") {
  const dite = texte(unite);
  if (!dite) return null;

  // Une unité composée — `kN/m`, `%` — sort de `lireUneUnite` entière, base
  // comprise : elle ne peut donc pas être au tableau, et le tableau la refuse
  // sans qu'on ait à tester l'opacité une seconde fois.
  const { base, exposant } = lireUneUnite(dite);
  const connue = UNITES.get(base);
  if (!connue) return null;

  if (exposant === 1) return { grandeur: connue.grandeur, facteur: connue.facteur };

  // **Le carré d'un facteur est son carré**, et il n'y a que la longueur qui
  // s'élève : un `kg²` ne veut rien dire dans ce métier, et lui inventer une
  // grandeur ferait accepter une conversion que personne ne peut vérifier.
  if (connue.grandeur !== GRANDEUR.LONGUEUR) return null;

  const grandeur = PUISSANCES_DE_LA_LONGUEUR[exposant];
  if (!grandeur) return null;

  return { grandeur, facteur: connue.facteur ** exposant };
}

/**
 * Deux unités mesurent-elles la même chose ?
 *
 * Deux unités inconnues du tableau — `kN/m`, ou un symbole mal orthographié —
 * ne se comparent que si elles s'écrivent **exactement** pareil. C'est le
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
 *   ou quand l'une des deux n'est pas au tableau. L'appelant refuse alors, il
 *   ne rend pas le nombre tel quel — un mètre pris pour un centimètre est une
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
