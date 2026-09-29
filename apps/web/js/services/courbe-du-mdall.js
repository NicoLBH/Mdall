/**
 * La courbe : un abaque recopié tel qu'il est tracé, et la règle entre ses points.
 *
 * ## Le verrou que ça lève
 *
 * Les Eurocodes sont pleins d'**abaques** : un coefficient de forme selon la
 * pente, un coefficient d'exposition selon l'altitude, une pression selon la
 * hauteur. Jusqu'ici il fallait les retranscrire en arithmétique — une suite de
 * `si` et de produits que **personne ne peut comparer à la figure d'origine**.
 * Un contrôleur technique regarde une courbe ; il ne relit pas une régression.
 *
 * Écrite en points, la fonction **ressemble à l'abaque** : l'auteur recopie, le
 * contrôleur compare ligne à ligne, et la trace dit entre quels deux points la
 * lecture est tombée.
 *
 * ## Les deux déclarations qui font tout le travail
 *
 * > **L'interpolation est déclarée, donc vérifiable.**
 *
 * `entre les points:` dit comment on passe d'un point au suivant — une droite,
 * ou un palier. Deux abaques dessinés pareil se lisent différemment, et rien
 * dans les points ne le dit : il faut l'écrire.
 *
 * > **`hors bornes: refuse` empêche un abaque d'être extrapolé en silence.**
 *
 * C'est la faute classique, et la plus chère : une courbe donnée de 0 à 60°
 * prolongée jusqu'à 75° rend un nombre parfaitement plausible, qui ne vient
 * d'aucun texte. Les deux déclarations sont donc **obligatoires** — une courbe
 * qui n'en porte pas une se refuse à la lecture plutôt que de supposer.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il n'ajuste aucune loi.** Pas de régression, pas de spline, pas de
 * polynôme : ce qui n'est pas entre deux points écrits n'existe pas. Une courbe
 * lissée rendrait des valeurs que le texte d'origine ne porte pas, et personne
 * ne pourrait dire d'où elles sortent.
 *
 * **Il ne trie pas les points.** Une courbe dont les abscisses ne montent pas
 * est une faute de recopie, et la corriger en silence ferait passer pour juste
 * un tableau qui ne l'est pas. Elle se refuse, en nommant la ligne.
 */

import { couperLUnite, estMesuree, lireUnNombre, mesureEnFrancais } from "./memoire-en-texte.js";
import { auJusteNecessaire, convertir, phraseDesUnites } from "./unites-du-metier.js";
import { traceDesSeries } from "./trace-dun-graphique.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Comment on passe d'un point au suivant.
 *
 * Deux façons, et elles suffisent : la droite d'un abaque, et le palier d'un
 * tableau à seuils. Une troisième — une spline, une puissance — rendrait des
 * valeurs qu'aucun texte ne porte.
 */
export const ENTRE = {
  /** Une droite entre les deux points qui encadrent la valeur lue. */
  LINEAIRE: "linéaire",
  /** La valeur du point atteint, jusqu'au suivant : un palier. */
  ESCALIER: "en escalier"
};

/** Ce qu'on fait d'une valeur qui sort de la courbe. */
export const HORS = {
  /** On refuse. C'est ce qu'il faut écrire neuf fois sur dix. */
  REFUSE: "refuse",
  /** On prend la valeur de l'extrémité, quand le texte le dit. */
  BORNE: "borne"
};

/** Ce que chaque mot veut dire, à l'écran et dans le catalogue. */
export const DIT_DE_LENTRE = {
  [ENTRE.LINEAIRE]: "une droite entre les deux points qui encadrent la valeur",
  [ENTRE.ESCALIER]: "la valeur du point atteint, jusqu'au suivant"
};

export const DIT_DU_HORS = {
  [HORS.REFUSE]: "au-delà des points écrits, la courbe ne conclut pas",
  [HORS.BORNE]: "au-delà, la valeur de l'extrémité"
};

/** Pourquoi une courbe ne se lit pas. */
export const REFUS_DE_LA_COURBE = {
  /** Moins de deux points : ce n'est pas une courbe. */
  TROP_COURTE: "trop-courte",
  /** Un point dont l'abscisse ou l'ordonnée n'est pas un nombre. */
  PAS_UN_NOMBRE: "pas-un-nombre",
  /** Des abscisses qui ne montent pas. */
  DESORDRE: "desordre",
  /** Des points qui ne mesurent pas la même chose. */
  UNITES: "unites",
  /** La valeur lue sort des points écrits, et la courbe refuse. */
  HORS_BORNES: "hors-bornes",
  /** La valeur lue n'est pas un nombre. */
  LECTURE: "lecture"
};

/** Ce qu'un refus dit, en français, à celui qui écrit. */
export function phraseDuRefusDeLaCourbe(code, quoi = "") {
  const dit = texte(quoi);

  switch (code) {
    case REFUS_DE_LA_COURBE.TROP_COURTE:
      return "une courbe demande au moins deux points : un seul ne dit rien de ce qu'il y a entre";
    case REFUS_DE_LA_COURBE.PAS_UN_NOMBRE:
      return `« ${dit} » n'est pas un nombre : une courbe joint des mesures`;
    case REFUS_DE_LA_COURBE.DESORDRE:
      return `les abscisses ne montent pas : « ${dit} » vient après une valeur plus grande`;
    case REFUS_DE_LA_COURBE.UNITES:
      return `les points ne mesurent pas la même chose — ${dit}`;
    case REFUS_DE_LA_COURBE.HORS_BORNES:
      return `${dit} sort de la courbe, et elle refuse d'aller au-delà de ce qui est écrit`;
    case REFUS_DE_LA_COURBE.LECTURE:
      return `« ${dit} » n'est pas un nombre : la courbe ne sait pas où le placer`;
    default:
      return "cette courbe ne se lit pas";
  }
}

/**
 * Un point : `| 30° | 0,80 |`.
 *
 * @returns {{x: string, y: string}|null} `null` quand la ligne ne porte pas
 *   exactement deux cases — l'appelant la refuse en la nommant.
 */
export function lireUnPoint(cases = []) {
  const deux = (Array.isArray(cases) ? cases : []).map(texte);
  if (deux.length !== 2 || !deux[0] || !deux[1]) return null;
  return { x: deux[0], y: deux[1] };
}

/**
 * Un nombre et son unité, lus d'une case écrite.
 *
 * ## Un libellé n'est pas une mesure, et la lecture des nombres ne le sait pas
 *
 * `lireUnNombre` gratte les chiffres de ce qu'on lui donne : elle tire **3** de
 * « 3e famille B » et **1** de « CF 1 h ». Une courbe qui accepterait cela
 * placerait un classement coupe-feu sur un axe d'angles et rendrait un
 * coefficient — un nombre parfaitement plausible, sorti de nulle part.
 *
 * C'est le même défaut que celui du barème, et la même réponse : **c'est
 * `estMesuree` qui tranche**, le jugement que la mémoire porte déjà sur ses
 * propres valeurs (règle 10).
 */
function mesureDe(dite) {
  const dit = texte(dite);
  const coupe = couperLUnite(dit);
  return {
    nombre: estMesuree(dit) ? lireUnNombre(coupe.nombre) : NaN,
    unite: texte(coupe.unite),
    dite: dit
  };
}

/**
 * Les points d'une courbe, lus et vérifiés.
 *
 * **Tout se vérifie ici, et à la lecture du fichier** : le nombre de points,
 * les unités de chaque colonne, et l'ordre des abscisses. Une courbe fausse
 * laissée passer jusqu'au lancement rendrait un nombre plausible, et personne
 * ne saurait d'où il sort (règle 5).
 *
 * @returns {{points: {x: number, y: number, dit: string, vaut: string}[],
 *   uniteX: string, uniteY: string, refus: string, ou: string}}
 */
export function pointsDeLaCourbe(ecrits = []) {
  const bruts = (Array.isArray(ecrits) ? ecrits : []).map((un) => ({
    x: mesureDe(un?.x), y: mesureDe(un?.y)
  }));

  const refuse = (refus, ou = "") => ({ points: [], uniteX: "", uniteY: "", refus, ou });

  if (bruts.length < 2) return refuse(REFUS_DE_LA_COURBE.TROP_COURTE);

  for (const point of bruts) {
    for (const cote of [point.x, point.y]) {
      if (!Number.isFinite(cote.nombre)) return refuse(REFUS_DE_LA_COURBE.PAS_UN_NOMBRE, cote.dite);
    }
  }

  /**
   * **Chaque colonne mesure une seule chose**, et se ramène à l'unité de son
   * premier point. Une abscisse en kilonewtons au milieu d'abscisses en degrés
   * n'est pas une faute de frappe qu'on rattrape : c'est une courbe dont on ne
   * sait plus ce qu'elle trace.
   *
   * **Chaque côté se refuse avec ses deux unités à lui.** Une ordonnée
   * étrangère nommée avec les unités de l'abscisse ferait chercher la faute
   * dans la colonne de gauche, qui va très bien.
   */
  const uniteX = bruts[0].x.unite;
  const uniteY = bruts[0].y.unite;

  const points = [];
  for (const point of bruts) {
    const x = convertir(point.x.nombre, point.x.unite, uniteX);
    if (x === null) return refuse(REFUS_DE_LA_COURBE.UNITES, phraseDesUnites(uniteX, point.x.unite));

    const y = convertir(point.y.nombre, point.y.unite, uniteY);
    if (y === null) return refuse(REFUS_DE_LA_COURBE.UNITES, phraseDesUnites(uniteY, point.y.unite));

    /**
     * **Les abscisses montent, strictement.** Deux points au même x donneraient
     * deux valeurs pour une lecture, et une abscisse qui redescend est une
     * ligne recopiée dans le désordre. Les trier en silence ferait passer pour
     * juste un tableau qui ne l'est pas.
     */
    if (points.length && x <= points[points.length - 1].x) {
      return refuse(REFUS_DE_LA_COURBE.DESORDRE, point.x.dite);
    }

    points.push({ x, y, dit: point.x.dite, vaut: point.y.dite });
  }

  return { points, uniteX, uniteY, refus: "", ou: "" };
}

/** Une mesure écrite à la française, avec son unité quand elle en a une. */
const ecrire = (nombre, unite) => mesureEnFrancais(
  unite ? `${auJusteNecessaire(nombre)} ${unite}` : `${auJusteNecessaire(nombre)}`
);

/**
 * Ce que la courbe conclut pour une valeur lue.
 *
 * **La trace dit entre quels deux points on est tombé**, et c'est ce qu'on
 * regarde en premier : un abaque se vérifie en retrouvant la ligne du tableau,
 * pas en refaisant le calcul.
 *
 * @param {object} courbe `{points, uniteX, uniteY}`, tels que `pointsDeLaCourbe` les rend
 * @param {string} lue la valeur de l'abscisse, écrite
 * @param {object} comment `{entre, hors}`
 * @returns {{connu: boolean, valeur: string, refus: string, pourquoi: string,
 *   entre: {de: string, a: string}|null, borne: string}}
 */
export function interpoler(courbe = null, lue = "", { entre = ENTRE.LINEAIRE, hors = HORS.REFUSE } = {}) {
  const points = courbe?.points ?? [];
  const rien = (refus, ou = "") => ({
    connu: false,
    valeur: "",
    refus,
    pourquoi: phraseDuRefusDeLaCourbe(refus, ou),
    sur: "",
    entre: null,
    borne: ""
  });

  if (!points.length) return rien(REFUS_DE_LA_COURBE.TROP_COURTE);

  const mesure = mesureDe(lue);
  if (!Number.isFinite(mesure.nombre)) return rien(REFUS_DE_LA_COURBE.LECTURE, mesure.dite || "rien");

  // La valeur lue se ramène à l'unité de la courbe, ou elle ne mesure pas ce
  // que la courbe trace — et `convertir` le dit en rendant `null`.
  const x = convertir(mesure.nombre, mesure.unite, courbe.uniteX);
  if (x === null) return rien(REFUS_DE_LA_COURBE.UNITES, phraseDesUnites(courbe.uniteX, mesure.unite));

  const premier = points[0];
  const dernier = points[points.length - 1];

  if (x < premier.x || x > dernier.x) {
    if (hors === HORS.REFUSE) {
      return rien(REFUS_DE_LA_COURBE.HORS_BORNES,
        `${mesure.dite} — la courbe va de ${premier.dit} à ${dernier.dit}`);
    }
    const bout = x < premier.x ? premier : dernier;
    return {
      connu: true,
      valeur: ecrire(bout.y, courbe.uniteY),
      refus: "",
      pourquoi: "",
      sur: "",
      entre: null,
      // **On dit qu'on a borné.** Une valeur rendue sans un mot ferait croire
      // qu'elle vient de la courbe, alors qu'elle vient de son extrémité.
      borne: bout.dit
    };
  }

  // Le dernier point dont l'abscisse ne dépasse pas la valeur lue : c'est là
  // qu'on est, et c'est ce que la trace montre.
  let rang = 0;
  while (rang < points.length - 1 && points[rang + 1].x <= x) rang += 1;

  const de = points[rang];
  const a = points[rang + 1] ?? de;

  /**
   * **Tomber sur un point écrit n'est pas tomber entre deux.** C'est le cas
   * qu'on veut voir en premier — la ligne du tableau se retrouve telle quelle —,
   * et dire « entre 60° et 60° » ferait douter d'une lecture exacte.
   */
  if (x === de.x) {
    return {
      connu: true,
      valeur: ecrire(de.y, courbe.uniteY),
      refus: "",
      pourquoi: "",
      sur: de.dit,
      entre: null,
      borne: ""
    };
  }

  /**
   * **En escalier, la valeur du point atteint.** C'est le palier des tableaux à
   * seuils : on garde ce que la ligne dit jusqu'à la ligne suivante.
   */
  const y = entre === ENTRE.ESCALIER
    ? de.y
    : de.y + ((x - de.x) / (a.x - de.x)) * (a.y - de.y);

  return {
    connu: true,
    valeur: ecrire(y, courbe.uniteY),
    refus: "",
    pourquoi: "",
    sur: "",
    entre: { de: de.dit, a: a.dit },
    borne: ""
  };
}

/**
 * Où la lecture est tombée, dit en français.
 *
 * **C'est la première chose qu'on regarde devant un abaque** : on retrouve la
 * ligne du tableau, et l'on vérifie que c'est bien celle du texte d'origine.
 * Le nombre rendu, lui, ne se vérifie qu'après — et seulement si l'on sait
 * d'où il vient.
 */
export function phraseDeLaLecture(lecture = null) {
  if (!lecture) return "";
  if (texte(lecture.sur)) return `lu sur le point ${texte(lecture.sur)}`;
  if (texte(lecture.borne)) return `hors de la courbe : la valeur de ${texte(lecture.borne)}`;
  if (lecture.entre?.de && lecture.entre?.a) {
    return `lu entre ${texte(lecture.entre.de)} et ${texte(lecture.entre.a)}`;
  }
  return "";
}

/**
 * Le tracé d'une courbe, en coordonnées de 0 à 1.
 *
 * **Le dessin est la vérification.** Un abaque se compare à sa figure d'origine
 * d'un coup d'œil ; relire onze couples de nombres demande de les tracer dans
 * sa tête. Ce qui décide de la forme est donc ici, pur et éprouvable, et l'écran
 * n'a qu'à poser les points sur sa grille.
 *
 * Une courbe plate — toutes les ordonnées égales — se dessine **au milieu**
 * plutôt que sur un bord : divisée par une hauteur nulle, elle sortirait du
 * cadre ou n'apparaîtrait pas.
 *
 * @returns {{points: {x: number, y: number, dit: string, vaut: string}[],
 *   lu: {x: number, y: number}|null, bornes: {x: number[], y: number[]}}}
 */
export function traceDeLaCourbe(courbe = null, { x = null, y = null } = {}) {
  const points = courbe?.points ?? [];
  const vide = { points: [], lu: null, bornes: { x: [0, 0], y: [0, 0] } };
  if (points.length < 2) return vide;

  /**
   * **Un abaque est une série, et une seule.** La géométrie est celle de tous
   * les dessins du langage — le tableau d'une boucle en porte plusieurs —, et
   * elle vit à un seul endroit : deux cadres écrits séparément se seraient
   * recalibrés l'un contre l'autre à chaque retouche (règle 10).
   */
  const trace = traceDesSeries([{ nom: "", points }], { marque: { x, y } });
  const une = trace.series[0];
  if (!une) return vide;

  return { points: une.points, lu: trace.marque, bornes: trace.bornes };
}

/* ════════════════════════════════════════════════════════════════════════════
 * L'abaque à double entrée
 *
 * ## Le verrou
 *
 * Les Eurocodes n'ont pas que des courbes : ils ont des **nappes** — un
 * coefficient d'exposition selon l'altitude **et** la zone de vent, une
 * pression selon la hauteur **et** la catégorie de terrain. Elles s'écrivaient
 * en barème, c'est-à-dire par paliers : on perdait l'interpolation sur l'un des
 * deux axes, et l'on rendait la valeur d'un seuil là où le texte d'origine
 * trace une droite.
 *
 * ## Ce qu'on montre, qui était le vrai verrou
 *
 * « Interpoler sur deux axes » est un travail connu ; ce qui ne l'était pas,
 * c'est **ce qu'on relit ensuite**. Une surface ne se compare pas à une figure
 * d'un coup d'œil, et le gain de cette écriture est précisément là.
 *
 * > **Une nappe est une famille de courbes, une par colonne — et on la lit
 * > comme l'ingénieur lit l'abaque imprimé : on se place sur une courbe, puis
 * > on la lit.**
 *
 * La seconde entrée choisit (ou interpole) **une courbe**, et cette courbe est
 * une courbe ordinaire : elle se dessine, se trace et se relit avec tout ce qui
 * existe déjà. La trace dit les deux pas — « entre les colonnes 1 et 2 », puis
 * « entre 500 m et 1000 m » —, et l'on retrouve les quatre cases du tableau
 * d'origine.
 *
 * Rien de neuf dans le calcul, donc : deux interpolations qu'on sait faire,
 * dans l'ordre où on les lit.
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * Les cases d'une nappe, lues et vérifiées.
 *
 * L'en-tête porte les valeurs de la **seconde** entrée, sa première case vide :
 * c'est le coin du tableau, et il n'y a rien à y écrire.
 *
 * ```
 * |        |    1 |    2 |    3 |
 * |    0 m | 1,00 | 1,05 | 1,10 |
 * | 1000 m | 1,25 | 1,35 | 1,45 |
 * ```
 *
 * **Tout se vérifie ici**, comme pour une courbe : les deux axes montent, les
 * unités de chaque axe sont les mêmes, et chaque ligne a autant de cases que
 * l'en-tête. Une nappe fausse laissée passer jusqu'au lancement rendrait un
 * nombre plausible, et personne ne saurait d'où il sort (règle 5).
 *
 * @param {string[]} entetes la première ligne, coin compris
 * @param {{x: string, valeurs: string[]}[]} lignes les autres
 * @returns {{colonnes: {z: number, dit: string}[],
 *   lignes: {x: number, dit: string, valeurs: number[], dits: string[]}[],
 *   uniteX: string, uniteY: string, uniteZ: string, refus: string, ou: string}}
 */
export function nappeDesCases(entetes = [], lignes = []) {
  const refuse = (refus, ou = "") => ({
    colonnes: [], lignes: [], uniteX: "", uniteY: "", uniteZ: "", refus, ou
  });

  // Le coin, puis au moins deux colonnes : une nappe d'une seule colonne est
  // une courbe, et elle s'écrit comme une courbe.
  const tetes = (Array.isArray(entetes) ? entetes : []).map(texte);
  const dits = tetes.slice(1);
  if (dits.length < 2) return refuse(REFUS_DE_LA_NAPPE.TROP_ETROITE);
  if (texte(tetes[0])) return refuse(REFUS_DE_LA_NAPPE.COIN, tetes[0]);

  const rangees = (Array.isArray(lignes) ? lignes : []);
  if (rangees.length < 2) return refuse(REFUS_DE_LA_COURBE.TROP_COURTE);

  // ── Les colonnes : la seconde entrée, qui monte elle aussi ───────────────
  const brutesZ = dits.map(mesureDe);
  for (const une of brutesZ) {
    if (!Number.isFinite(une.nombre)) return refuse(REFUS_DE_LA_COURBE.PAS_UN_NOMBRE, une.dite);
  }

  const uniteZ = brutesZ[0].unite;
  const colonnes = [];
  for (const une of brutesZ) {
    const z = convertir(une.nombre, une.unite, uniteZ);
    if (z === null) return refuse(REFUS_DE_LA_COURBE.UNITES, phraseDesUnites(uniteZ, une.unite));
    if (colonnes.length && z <= colonnes[colonnes.length - 1].z) {
      return refuse(REFUS_DE_LA_NAPPE.DESORDRE_DES_COLONNES, une.dite);
    }
    colonnes.push({ z, dit: une.dite });
  }

  // ── Les lignes : la première entrée, et les cases ────────────────────────
  let uniteX = "";
  let uniteY = "";
  const lues = [];

  for (const rangee of rangees) {
    const cases = (Array.isArray(rangee?.valeurs) ? rangee.valeurs : []).map(texte);
    if (cases.length !== colonnes.length) {
      return refuse(REFUS_DE_LA_NAPPE.LIGNE_BANCALE, texte(rangee?.x));
    }

    const abscisse = mesureDe(rangee?.x);
    if (!Number.isFinite(abscisse.nombre)) {
      return refuse(REFUS_DE_LA_COURBE.PAS_UN_NOMBRE, abscisse.dite);
    }
    if (!lues.length) uniteX = abscisse.unite;

    const x = convertir(abscisse.nombre, abscisse.unite, uniteX);
    if (x === null) return refuse(REFUS_DE_LA_COURBE.UNITES, phraseDesUnites(uniteX, abscisse.unite));
    if (lues.length && x <= lues[lues.length - 1].x) {
      return refuse(REFUS_DE_LA_COURBE.DESORDRE, abscisse.dite);
    }

    const valeurs = [];
    for (const dite of cases) {
      const quoi = mesureDe(dite);
      if (!Number.isFinite(quoi.nombre)) return refuse(REFUS_DE_LA_COURBE.PAS_UN_NOMBRE, quoi.dite);
      if (!lues.length && !valeurs.length) uniteY = quoi.unite;

      const y = convertir(quoi.nombre, quoi.unite, uniteY);
      if (y === null) return refuse(REFUS_DE_LA_COURBE.UNITES, phraseDesUnites(uniteY, quoi.unite));
      valeurs.push(y);
    }

    lues.push({ x, dit: abscisse.dite, valeurs, dits: cases });
  }

  return { colonnes, lignes: lues, uniteX, uniteY, uniteZ, refus: "", ou: "" };
}

/** Ce qu'une nappe refuse, en plus de ce qu'une courbe refuse. */
export const REFUS_DE_LA_NAPPE = {
  /** Une seule colonne : c'est une courbe, et elle s'écrit comme une courbe. */
  TROP_ETROITE: "trop-etroite",
  /** Le coin de l'en-tête porte quelque chose : il n'y a rien à y écrire. */
  COIN: "coin",
  /** Les valeurs de la seconde entrée ne montent pas. */
  DESORDRE_DES_COLONNES: "desordre-des-colonnes",
  /** Une ligne n'a pas autant de cases que l'en-tête a de colonnes. */
  LIGNE_BANCALE: "ligne-bancale",
  /** La seconde entrée sort des colonnes écrites, et la nappe refuse. */
  HORS_DES_COLONNES: "hors-des-colonnes"
};

/** Ce qu'un refus de nappe dit, en français. */
export function phraseDuRefusDeLaNappe(code, quoi = "") {
  const dit = texte(quoi);

  switch (code) {
    case REFUS_DE_LA_NAPPE.TROP_ETROITE:
      return "un abaque à double entrée demande au moins deux colonnes : une seule est une courbe, "
        + "et s'écrit comme une courbe";
    case REFUS_DE_LA_NAPPE.COIN:
      return `le coin de l'en-tête porte « ${dit} » : il n'y a rien à y écrire, `
        + "les colonnes commencent après";
    case REFUS_DE_LA_NAPPE.DESORDRE_DES_COLONNES:
      return `les colonnes ne montent pas : « ${dit} » vient après une valeur plus grande`;
    case REFUS_DE_LA_NAPPE.LIGNE_BANCALE:
      return `la ligne « ${dit} » n'a pas autant de cases que l'en-tête a de colonnes`;
    case REFUS_DE_LA_NAPPE.HORS_DES_COLONNES:
      return `${dit} : l'abaque refuse d'aller au-delà de ce qui est écrit`;
    default:
      return phraseDuRefusDeLaCourbe(code, quoi);
  }
}

/**
 * La courbe d'une nappe, à la valeur de sa seconde entrée.
 *
 * **C'est le premier des deux pas, et c'est celui qu'on montre.** L'ingénieur
 * devant un abaque imprimé choisit d'abord sa courbe — « je suis en zone 2 » —,
 * puis la lit. Entre deux colonnes, la courbe est la moyenne pondérée des deux,
 * point par point : c'est ce que trace la règle à la main entre deux traits du
 * document.
 *
 * @returns {{courbe: {points, uniteX, uniteY}|null, sur: string,
 *   entre: {de: string, a: string}|null, borne: string,
 *   refus: string, pourquoi: string}}
 */
export function courbeDeLaColonne(nappe = null, lue = "", { entre = ENTRE.LINEAIRE, hors = HORS.REFUSE } = {}) {
  const colonnes = nappe?.colonnes ?? [];
  const lignes = nappe?.lignes ?? [];
  const rien = (refus, ou = "") => ({
    courbe: null, sur: "", entre: null, borne: "",
    refus, pourquoi: phraseDuRefusDeLaNappe(refus, ou)
  });

  if (colonnes.length < 2 || lignes.length < 2) return rien(REFUS_DE_LA_NAPPE.TROP_ETROITE);

  const mesure = mesureDe(lue);
  if (!Number.isFinite(mesure.nombre)) return rien(REFUS_DE_LA_COURBE.LECTURE, mesure.dite || "rien");

  const z = convertir(mesure.nombre, mesure.unite, nappe.uniteZ);
  if (z === null) return rien(REFUS_DE_LA_COURBE.UNITES, phraseDesUnites(nappe.uniteZ, mesure.unite));

  const premiere = colonnes[0];
  const derniere = colonnes[colonnes.length - 1];

  /** La courbe faite des valeurs d'une colonne, ou de deux colonnes pesées. */
  const courbeDe = (prendre) => ({
    points: lignes.map((ligne) => {
      const y = prendre(ligne);
      return { x: ligne.x, y, dit: ligne.dit, vaut: ecrire(y, nappe.uniteY) };
    }),
    uniteX: nappe.uniteX,
    uniteY: nappe.uniteY
  });

  if (z < premiere.z || z > derniere.z) {
    if (hors === HORS.REFUSE) {
      return rien(REFUS_DE_LA_NAPPE.HORS_DES_COLONNES,
        `« ${mesure.dite} » sort des colonnes, qui vont de ${premiere.dit} à ${derniere.dit}`);
    }
    const bout = z < premiere.z ? 0 : colonnes.length - 1;
    return {
      courbe: courbeDe((ligne) => ligne.valeurs[bout]),
      sur: "", entre: null, borne: colonnes[bout].dit, refus: "", pourquoi: ""
    };
  }

  let rang = 0;
  while (rang < colonnes.length - 1 && colonnes[rang + 1].z <= z) rang += 1;

  const de = colonnes[rang];
  const a = colonnes[rang + 1] ?? de;

  // Tomber sur une colonne écrite n'est pas tomber entre deux : la colonne du
  // tableau se retrouve telle quelle, et c'est ce qu'on veut voir en premier.
  if (z === de.z) {
    return {
      courbe: courbeDe((ligne) => ligne.valeurs[rang]),
      sur: de.dit, entre: null, borne: "", refus: "", pourquoi: ""
    };
  }

  // **En escalier sur la seconde entrée aussi.** `entre les points:` vaut pour
  // les deux axes : un tableau à seuils l'est dans les deux sens, et déclarer
  // deux interpolations pour un seul tableau ferait deux choses à vérifier là
  // où le texte d'origine n'en dit qu'une.
  if (entre === ENTRE.ESCALIER) {
    return {
      courbe: courbeDe((ligne) => ligne.valeurs[rang]),
      sur: "", entre: { de: de.dit, a: a.dit }, borne: "", refus: "", pourquoi: ""
    };
  }

  const part = (z - de.z) / (a.z - de.z);
  return {
    courbe: courbeDe((ligne) =>
      ligne.valeurs[rang] + part * (ligne.valeurs[rang + 1] - ligne.valeurs[rang])),
    sur: "", entre: { de: de.dit, a: a.dit }, borne: "", refus: "", pourquoi: ""
  };
}

/**
 * Ce qu'une nappe conclut pour deux valeurs lues.
 *
 * Les deux pas, dans l'ordre où on les lit : la colonne d'abord — elle donne
 * une courbe —, puis la courbe. La trace porte les deux, parce qu'un abaque se
 * vérifie en retrouvant ses cases, pas en refaisant le calcul.
 *
 * @returns {{connu, valeur, refus, pourquoi, sur, entre, borne, colonne, courbe}}
 */
export function interpolerLaNappe(nappe = null, lue = "", selon = "", comment = {}) {
  const colonne = courbeDeLaColonne(nappe, selon, comment);
  if (!colonne.courbe) {
    return {
      connu: false, valeur: "", refus: colonne.refus, pourquoi: colonne.pourquoi,
      sur: "", entre: null, borne: "", colonne, courbe: null
    };
  }

  const lecture = interpoler(colonne.courbe, lue, comment);
  return { ...lecture, colonne, courbe: colonne.courbe };
}

/**
 * Où la lecture d'une nappe est tombée, dit en français — **les deux pas**.
 *
 * « sur la colonne 2, lu entre 500 m et 1000 m » : on retrouve les deux cases
 * du tableau, et l'on vérifie qu'elles sont bien celles du texte d'origine.
 */
export function phraseDeLaLectureDeLaNappe(lecture = null) {
  const ou = [];

  const colonne = lecture?.colonne;
  if (texte(colonne?.sur)) ou.push(`sur la colonne ${texte(colonne.sur)}`);
  else if (texte(colonne?.borne)) ou.push(`hors des colonnes : celle de ${texte(colonne.borne)}`);
  else if (colonne?.entre?.de && colonne?.entre?.a) {
    ou.push(`entre les colonnes ${texte(colonne.entre.de)} et ${texte(colonne.entre.a)}`);
  }

  const dans = phraseDeLaLecture(lecture);
  if (dans) ou.push(dans);

  return ou.join(", ");
}
