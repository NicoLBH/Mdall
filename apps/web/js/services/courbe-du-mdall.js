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
  if (points.length < 2) return { points: [], lu: null, bornes: { x: [0, 0], y: [0, 0] } };

  const xs = points.map((un) => un.x);
  const ys = points.map((un) => un.y);
  const bornes = {
    x: [Math.min(...xs, x ?? Infinity), Math.max(...xs, x ?? -Infinity)],
    y: [Math.min(...ys, y ?? Infinity), Math.max(...ys, y ?? -Infinity)]
  };

  const sur = (valeur, [bas, haut]) => (haut === bas ? 0.5 : (valeur - bas) / (haut - bas));

  return {
    points: points.map((un) => ({
      x: sur(un.x, bornes.x), y: sur(un.y, bornes.y), dit: un.dit, vaut: un.vaut
    })),
    lu: Number.isFinite(x) && Number.isFinite(y)
      ? { x: sur(x, bornes.x), y: sur(y, bornes.y) }
      : null,
    bornes
  };
}
