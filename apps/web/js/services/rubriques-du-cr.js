/**
 * Sous quels titres un compte rendu range ses points.
 *
 * ## Ce qui se perdait
 *
 * Un compte rendu de chantier ne fait pas une liste : il fait des sections.
 * Sept rubriques administratives — marché de travaux, installation de chantier,
 * situations, échange de documents —, puis un titre par lot : « Lot n° 1 :
 * Démolition / Gros Œuvre : Entreprise BERTRAND », et pour finir une section par
 * intervenant sous « DIVERS ».
 *
 * Ce découpage est la moitié de l'information du document. Lu à plat, le même
 * compte rendu rend cinquante points côte à côte dont on ne sait plus ni de
 * quel lot ils relèvent, ni à qui ils reviennent — et le projet accumule des
 * listes de quatre-vingt-dix lignes que personne ne parcourt.
 *
 * ## Ce que ce module fait
 *
 * Il relit ce que le modèle a rendu. Il ne lui fait pas confiance sur le genre
 * d'une rubrique : l'intitulé du document l'écrit, et **l'écrit l'emporte**.
 * Ce qui entre est une liste de rubriques et une liste de points ; ce qui sort
 * est le rangement, et le compte de ce qui n'a pas pu être rangé.
 *
 * Rien n'est créé ici : un sujet père est une écriture, et une écriture passe
 * par une proposition (règle 1).
 *
 * ## Le piège du numéro
 *
 * « 2. Installation de chantier » et « Lot n° 2 : CHARPENTE » commencent tous
 * deux par un 2, et ce ne sont pas les mêmes deux : l'un numérote un
 * paragraphe, l'autre un lot du marché. Prendre le premier pour un lot
 * créerait un « lot n° 2 » qui n'existe pas, et l'on y rangerait les points
 * d'installation de chantier.
 *
 * C'est **le mot « lot »** qui fait un lot, pas le chiffre. Sans lui, il faut
 * que le modèle ait explicitement rendu un numéro de lot — ce que la consigne
 * lui interdit de faire sur un numéro de paragraphe.
 *
 * ## Trois genres, et pas deux
 *
 * Un **lot** porte un numéro et, presque toujours, une entreprise. Une rubrique
 * d'**intervenant** désigne quelqu'un sans être un lot : le coordonnateur SPS,
 * le contrôle technique, le maître d'ouvrage. Une rubrique **administrative**
 * ne désigne personne — « Échange de documents » n'est à personne en
 * particulier, et lui assigner des points en ferait une tâche que personne ne
 * traitera.
 *
 * Rien ici n'appelle quoi que ce soit : des rubriques entrent, un rangement
 * sort.
 */

import { nomDuLot, numeroDuLot } from "./lots-du-cr.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Un entier, ou `null`.
 *
 * **`Number(null)` vaut zéro**, et zéro est un ordre comme un autre : sans ce
 * filtre, un point qui ne vise aucune rubrique viserait la rubrique n° 0, et
 * une rubrique sans ordre l'y accueillerait. Deux absences se seraient
 * rencontrées et auraient fait un rangement.
 */
function entier(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : null;
}

/** Ce qu'une rubrique désigne. */
export const GENRE = {
  LOT: "lot",
  INTERVENANT: "intervenant",
  ADMINISTRATIVE: "administrative"
};

/** Comment on la dit à l'écran. Un seul endroit (règle 10). */
export const MOTS_DU_GENRE = {
  [GENRE.LOT]: "Lot",
  [GENRE.INTERVENANT]: "Intervenant",
  [GENRE.ADMINISTRATIVE]: "Dispositions générales"
};

/**
 * Le mot qui fait un lot.
 *
 * En tête de l'intitulé : « Lot n° 1 : … », « LOT 02 — GROS ŒUVRE ». Ailleurs
 * dans la phrase, le mot ne prouve rien — « Documents d'exécution par lot » est
 * une rubrique administrative.
 */
const COMMENCE_PAR_LOT = /^\s*lots?\b/i;

/** « … : Entreprise BERTRAND » — la convention des en-têtes de lot. */
const NOMME_UNE_ENTREPRISE = /\bentreprises?\b\s*:?\s*(.+)$/i;

/** Ce que le modèle a dit du genre, quand c'est l'un des trois. */
function genreAnnonce(rubrique) {
  const dit = texte(rubrique?.genre).toLowerCase();
  return Object.values(GENRE).includes(dit) ? dit : "";
}

/**
 * Cette rubrique est-elle un lot du marché ?
 *
 * Deux façons de le savoir, et la seconde est bridée exprès : le mot « lot » en
 * tête de l'intitulé suffit ; sinon il faut que le modèle l'ait dit **et**
 * qu'il ait rendu un numéro de lot — un numéro scruté dans l'intitulé ne
 * compterait pas, puisque c'est précisément le piège du paragraphe numéroté.
 */
export function estUneRubriqueDeLot(rubrique = null) {
  if (COMMENCE_PAR_LOT.test(texte(rubrique?.intitule))) return true;
  return genreAnnonce(rubrique) === GENRE.LOT && Boolean(numeroDuLot(texte(rubrique?.numero)));
}

/**
 * Le numéro du lot d'une rubrique, ou "" quand elle n'en est pas un.
 *
 * Le numéro rendu par le modèle passe en premier : il a lu l'en-tête, et
 * l'intitulé peut n'être qu'un fragment.
 */
export function numeroDeLaRubrique(rubrique = null) {
  if (!estUneRubriqueDeLot(rubrique)) return "";
  return numeroDuLot(texte(rubrique?.numero)) || numeroDuLot(texte(rubrique?.intitule));
}

/**
 * L'entreprise que le titre de la rubrique nomme, ou "".
 *
 * **Lue dans le titre, jamais dans les points.** Une entreprise citée dans une
 * observation n'est pas celle dont la rubrique relève : « Contacter BERTRAND
 * pour dépose poutre étaiement » est écrit sous le lot charpente.
 */
export function societeDeLaRubrique(rubrique = null) {
  const annoncee = texte(rubrique?.societe);
  if (annoncee) return annoncee;

  const trouve = texte(rubrique?.intitule).match(NOMME_UNE_ENTREPRISE);
  return trouve ? texte(trouve[1]).replace(/^[:–—-]\s*/, "") : "";
}

/**
 * Ce que la rubrique désigne — l'écrit l'emporte sur le mot du modèle.
 *
 * Une rubrique qui nomme une entreprise désigne quelqu'un, quoi qu'en dise le
 * modèle. L'inverse n'est pas vrai : « Coordonnateur SPS » ne nomme aucune
 * société et désigne pourtant un intervenant — là, le modèle a vu la page et
 * l'on s'en remet à lui.
 *
 * Sans rien de tout cela, la rubrique est administrative : elle ne désigne
 * personne. Ce n'est pas un aveu d'ignorance, c'est ce qu'on a lu.
 */
export function genreDeLaRubrique(rubrique = null) {
  if (estUneRubriqueDeLot(rubrique)) return GENRE.LOT;
  if (societeDeLaRubrique(rubrique)) return GENRE.INTERVENANT;
  if (genreAnnonce(rubrique) === GENRE.INTERVENANT) return GENRE.INTERVENANT;
  return GENRE.ADMINISTRATIVE;
}

/**
 * Ce qui fait qu'une rubrique de deux comptes rendus est la même.
 *
 * **Le numéro du lot, jamais le nom de l'entreprise.** « BERTRAND » et
 * « BERTAND » sont la même société mal recopiée, et une identité par orthographe
 * ferait deux lots n° 1 — donc deux sujets pères, et des fils des deux côtés.
 *
 * Pour tout le reste, l'intitulé mis à plat : accents, ponctuation et numéro de
 * paragraphe ôtés, de sorte que « 2. Installation de chantier » et
 * « Installation de chantier » se retrouvent d'une réunion à l'autre.
 *
 * Rend "" quand rien ne se lit : une rubrique sans identité ne se propose pas.
 */
export function identiteDeLaRubrique(rubrique = null) {
  const numero = numeroDeLaRubrique(rubrique);
  if (numero) return `lot:${numero}`;

  const nom = nomDuLot(texte(rubrique?.intitule));
  if (!nom || nom.length < 2 || !/[a-z]{2}/.test(nom)) return "";

  return estUneRubriqueDeLot(rubrique) ? `lot:${nom}` : `rubrique:${nom}`;
}

/**
 * Le nom qu'on lit à l'écran. Jamais un blanc (règle 10).
 *
 * L'intitulé tel que le document l'écrit — on ne le reformule pas : c'est sous
 * ce titre-là que la personne qui tient le chantier va le chercher.
 */
export function nomDeLaRubrique(rubrique = null) {
  const intitule = texte(rubrique?.intitule);
  if (intitule) return intitule;

  const ordre = entier(rubrique?.ordre);
  return ordre !== null && ordre > 0 ? `Rubrique ${ordre}` : "Rubrique sans titre";
}

/**
 * Les rubriques d'un compte rendu, relues et mises en ordre.
 *
 * Une rubrique écrite deux fois dans le même document ne compte qu'une : le
 * premier intitulé fait foi, et **les deux ordres restent attachés à celle qui
 * reste** — sans quoi les points de la seconde deviendraient orphelins d'un
 * doublon dont ils n'ont pas à répondre.
 *
 * **Relire une liste déjà relue ne la change pas.** Une rubrique relue porte son
 * intitulé et ses ordres, et repasse donc ici à l'identique. Sans cela, un
 * appelant qui aurait déjà normalisé sa liste la verrait disparaître en
 * silence — et c'est exactement ce qui est arrivé.
 *
 * @returns {{ordres: number[], ordre: number|null, nom: string, genre: string,
 *   numero: string, societe: string, identite: string, provenance: object|null}[]}
 */
export function rubriquesDuCompteRendu(rubriques = []) {
  const parIdentite = new Map();

  for (const brute of Array.isArray(rubriques) ? rubriques : []) {
    const identite = identiteDeLaRubrique(brute);
    // Une rubrique qu'on ne saurait ni nommer ni numéroter ne se propose pas :
    // on ne crée pas un sujet père appelé « / ».
    if (!identite) continue;

    const ordre = entier(brute?.ordre);
    const deja = parIdentite.get(identite);

    // Une rubrique déjà relue porte tous les ordres qu'elle a absorbés.
    const ordres = Array.isArray(brute?.ordres) && brute.ordres.length > 0
      ? brute.ordres.map(entier).filter((valeur) => valeur !== null)
      : (ordre === null ? [] : [ordre]);

    if (deja) {
      for (const absorbe of ordres) {
        if (!deja.ordres.includes(absorbe)) deja.ordres.push(absorbe);
      }
      continue;
    }

    parIdentite.set(identite, {
      identite,
      ordre,
      ordres,
      /** L'intitulé brut, conservé : c'est lui qui refait l'identité au repassage. */
      intitule: texte(brute?.intitule),
      nom: nomDeLaRubrique(brute),
      genre: genreDeLaRubrique(brute),
      numero: numeroDeLaRubrique(brute),
      societe: societeDeLaRubrique(brute),
      provenance: brute?.provenance ?? null
    });
  }

  return [...parIdentite.values()];
}

/**
 * Les points rangés sous leurs rubriques.
 *
 * **Une rubrique sans point figure quand même.** Un lot dont le compte rendu ne
 * dit rien à cette réunion — son contenu se réduit à « / » — est une
 * information : c'est ce qui fait qu'un lot s'ouvre puis se ferme, et qu'il
 * rouvre à la réunion où il reçoit un point.
 *
 * **Un point sans rubrique reste un point.** Il ne se range pas au plus proche :
 * mal rangé ne se voit jamais, tandis qu'orphelin se compte (règle 5).
 *
 * @returns {{groupes: {rubrique: object, points: object[]}[], orphelins: object[]}}
 */
export function rangerLesPoints(points = [], rubriques = []) {
  const relues = rubriquesDuCompteRendu(rubriques);

  const groupes = relues.map((rubrique) => ({ rubrique, points: [] }));
  const parOrdre = new Map();
  for (const groupe of groupes) {
    for (const ordre of groupe.rubrique.ordres) parOrdre.set(ordre, groupe);
  }

  const orphelins = [];
  for (const point of Array.isArray(points) ? points : []) {
    const vise = entier(point?.rubrique);
    const groupe = vise === null ? null : parOrdre.get(vise);

    if (groupe) groupe.points.push(point);
    else orphelins.push(point);
  }

  return { groupes, orphelins };
}

/**
 * Ce que la lecture a rangé, en trois chiffres.
 *
 * **L'orphelin est celui qu'on surveille**, et sa variation plus que sa valeur.
 * Qu'un compte rendu en produise trois est normal : l'ouverture et le
 * préambule n'ont pas de rubrique. Qu'il en produise trente dit que la lecture
 * a dérivé — et c'est ce qu'aucun autre chiffre ne montre.
 *
 * @returns {{rubriques: number, points: number, rattaches: number, orphelins: number}}
 */
export function mesuresDesRubriques(points = [], rubriques = []) {
  const { groupes, orphelins } = rangerLesPoints(points, rubriques);
  const rattaches = groupes.reduce((total, groupe) => total + groupe.points.length, 0);

  return {
    rubriques: groupes.length,
    points: rattaches + orphelins.length,
    rattaches,
    orphelins: orphelins.length
  };
}
