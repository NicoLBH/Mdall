/**
 * Ce qu'un point bloque, et dans quel ordre les regarder.
 *
 * Étape 5 de `docs/lobjet-de-la-connaissance.md`.
 *
 * ## Ce qui n'allait pas
 *
 * `priority` est un champ qu'on coche : une opinion saisie à la main, un jour,
 * par quelqu'un qui n'avait pas le graphe sous les yeux. Pendant ce temps, la
 * marche dans les dépendances sait exactement ce qu'un point bloque — et
 * personne ne le lui demandait.
 *
 * Les points ouverts se trient donc par **ce que ça coûte de ne pas trancher**.
 *
 * ## La profondeur n'est pas l'importance
 *
 * C'est la réserve qui commande tout le reste. **Quatorze conclusions en aval
 * dont aucune n'est engagée coûtent moins qu'une seule sur laquelle un bureau de
 * contrôle s'est prononcé.** Un tri par nombre d'aval mettrait donc en tête
 * exactement ce qu'il ne faut pas regarder en premier.
 *
 * Le rang passe avant la portée, toujours. La portée ne départage qu'à
 * engagement égal.
 *
 * ## On ne fabrique pas de poids
 *
 * Pas de « poids 5 > poids 3 ». Il n'y a ici **aucun score** : un rang, qui est
 * un mot dont la place dans une échelle fait tout le sens, et des choses qu'on
 * nomme — quatre conclusions, un avis. Compter des conclusions qu'on peut
 * énumérer n'est pas fabriquer une note : la première se vérifie en ouvrant la
 * liste, la seconde ne se vérifie nulle part.
 *
 * ## Un point sans arête n'est pas un point qui ne bloque rien
 *
 * C'est la distinction que cette étape peut rater. Un point sur lequel personne
 * n'a posé d'arête n'a pas un coût nul : **il n'a pas de coût mesuré**, et
 * afficher « ne bloque rien » serait affirmer une absence qu'on n'a pas
 * vérifiée (règle 5).
 *
 * Il ne se range donc pas parmi les mesurés — ni en tête, ce qui serait faux, ni
 * mêlé à eux, ce qui ferait croire qu'on l'a pesé. Il se range après, entre eux,
 * dans l'ordre du champ saisi.
 *
 * ## Le champ saisi reste
 *
 * Quelqu'un l'a écrit, et un constat ne devient pas faux (règle 6). Il cesse
 * seulement d'être la seule chose qu'on regarde : il départage ce que le graphe
 * n'a pas départagé.
 */

import { ORDRE_DES_RANGS, RANG, phraseDuRang, rangLePlusHaut } from "./ce-qui-couvre.js";
import { dependentsOf } from "./assertion-dependencies.js";
import { MOT_A_LECRAN, pointOuvert, surQuoiCePointPorte } from "./point-porte-sur.js";
import { pointQuiATranche } from "./point-a-tranche.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le champ saisi, du plus léger au plus lourd.
 *
 * Il vit ici plutôt que dans l'écran qui le peint, parce que deux endroits en
 * ont maintenant besoin : le badge, et ce tri. Les graphies anciennes sont
 * reconnues — `p1`, `hight` — parce qu'elles sont écrites en base et qu'on ne
 * réécrit pas ce que des gens ont posé (règle 6).
 */
export const ORDRE_DES_PRIORITES = ["low", "medium", "high", "critical"];

const PRIORITES_ANCIENNES = { hight: "high", p1: "critical", p2: "high", p3: "medium" };

/** La priorité saisie, ramenée au vocabulaire. `""` quand rien n'a été coché. */
export function prioriteSaisie(valeur = "") {
  const brut = texte(valeur).toLowerCase();
  if (!brut) return "";

  const connue = PRIORITES_ANCIENNES[brut] ?? brut;
  return ORDRE_DES_PRIORITES.includes(connue) ? connue : brut;
}

/**
 * Tout ce qui repose sur ces versions, de proche en proche.
 *
 * Les valeurs de départ n'y sont pas : ce qu'un point bloque est ce qui **en
 * découle**, pas ce qu'il met en question — celui-là est déjà nommé à part.
 *
 * Un cycle ne fige rien : une version déjà vue ne se réexplore pas. Un
 * référentiel mal versé ne doit pas bloquer un écran, il doit se voir.
 */
export function conclusionsEnAval(assertionIds = [], dependances = []) {
  const depart = new Set((Array.isArray(assertionIds) ? assertionIds : []).map(texte).filter(Boolean));

  const vues = new Set(depart);
  const atteintes = [];
  const aVoir = [...depart];

  while (aVoir.length) {
    for (const suivante of dependentsOf(aVoir.shift(), dependances)) {
      if (vues.has(suivante)) continue;
      vues.add(suivante);
      atteintes.push(suivante);
      aVoir.push(suivante);
    }
  }

  return atteintes;
}

/**
 * Le rang d'une version : ce qui s'est engagé dessus, acte ou débat.
 *
 * Les deux se croisent par `rangLePlusHaut`, et c'est l'engagement le plus
 * coûteux qui compte. Un point qu'on ne connaît pas ne monte rien : on ne sait
 * pas s'il a été fermé, et le supposer fermé ferait dire « tranché avec
 * l'équipe » d'un débat encore ouvert (règle 5).
 */
export function rangDeLaVersion(assertion = null, { couvertures = null, points = [] } = {}) {
  const parActe = couvertures?.get?.(texte(assertion?.id))?.rang ?? RANG.RIEN;

  const quiATranche = pointQuiATranche(assertion);
  const point = quiATranche
    ? (Array.isArray(points) ? points : []).find((candidat) => texte(candidat?.id) === quiATranche)
    : null;
  const parLequipe = point && !pointOuvert(point) ? RANG.EQUIPE : RANG.RIEN;

  return rangLePlusHaut([parActe, parLequipe]);
}

/**
 * Ce qu'un point bloque : ce qu'il met en question, ce qui en découle, et ce que
 * ça coûterait de le casser.
 *
 * `mesure` dit si l'on a pesé quoi que ce soit. `false` ne veut pas dire « ne
 * bloque rien » — il veut dire « personne n'a dit sur quoi il porte », et les
 * deux ne se rangent pas pareil.
 *
 * @param {object} point le point
 * @param {object} options
 * @param {object[]} options.liens les lignes de `subject_assertion_links`
 * @param {object[]} options.assertions la mémoire du projet
 * @param {object[]} options.dependances le graphe, `{assertion_id, depends_on_assertion_id}`
 * @param {Map} [options.couvertures] ce que `couvertureDuProjet` a monté en une passe
 * @param {object[]} [options.points] les points du projet, pour l'échelon d'équipe
 * @returns {{valeurs, conclusions, rang, engagee, mesure, phrase}}
 */
export function ceQueBloqueUnPoint(point = null, {
  liens = [], assertions = [], dependances = [], couvertures = null, points = []
} = {}) {
  const valeurs = surQuoiCePointPorte(texte(point?.id), { liens, assertions });

  const parId = new Map(
    (Array.isArray(assertions) ? assertions : []).map((assertion) => [texte(assertion?.id), assertion])
  );

  const conclusions = conclusionsEnAval(valeurs.map((valeur) => texte(valeur?.id)), dependances)
    .map((id) => parId.get(id))
    // Une version atteinte qu'on ne porte pas ne se compte pas : on ne sait ni
    // ce qu'elle dit ni ce qui l'engage, et la compter gonflerait le coût d'un
    // point avec des lignes qu'on ne saurait pas montrer.
    .filter(Boolean);

  // L'engagement le plus coûteux, sur ce que le point met en question **et** sur
  // ce qui en découle. Une valeur nue dont dépend une conclusion couverte par un
  // avis coûte cher à casser : c'est l'aval qui porte l'engagement.
  let engagee = null;
  let rang = RANG.RIEN;
  for (const version of [...valeurs, ...conclusions]) {
    const sien = rangDeLaVersion(version, { couvertures, points });
    if (ORDRE_DES_RANGS.indexOf(sien) > ORDRE_DES_RANGS.indexOf(rang)) {
      rang = sien;
      engagee = version;
    }
  }

  const bilan = { valeurs, conclusions, rang, engagee, mesure: valeurs.length > 0 };
  return { ...bilan, phrase: phraseDeCeQueBloque(bilan) };
}

/** « une valeur », « trois valeurs » — et rien quand il n'y en a pas. */
function combien(nombre, un, plusieurs) {
  if (!nombre) return "";
  return nombre === 1 ? `une ${un}` : `${nombre} ${plusieurs}`;
}

/**
 * Ce qu'un point bloque, en une phrase.
 *
 * **Jamais un chiffre d'importance.** Ce qu'on lit est ce qu'on peut aller
 * vérifier : combien de conclusions, et ce qui s'est engagé sur l'une d'elles.
 *
 * Vide quand rien n'a été pesé — l'écran n'écrit pas « ne bloque rien » d'un
 * point sur lequel personne n'a posé d'arête.
 *
 * L'engagement se dit **au singulier**, « dont l'une est … », quel qu'en soit le
 * nombre : c'est le plus coûteux qui compte, et en annoncer deux ferait croire
 * qu'ils s'additionnent.
 */
export function phraseDeCeQueBloque(bilan = null) {
  if (!bilan?.mesure) return "";

  const porte = combien(bilan.valeurs?.length ?? 0, "valeur", "valeurs");
  const aval = bilan.conclusions?.length ?? 0;

  const dont = aval
    ? `dont ${dependent(aval)}`
    : "dont aucune conclusion ne dépend";

  const engagement = bilan.rang && bilan.rang !== RANG.RIEN
    ? `, dont l'une est ${phraseDuRang(bilan.rang)}`
    : ", et personne ne s'est prononcé dessus";

  return `ce ${MOT_A_LECRAN.un} porte sur ${porte} ${dont}${engagement}`;
}

/** « dépend une conclusion », « dépendent quatre conclusions ». */
function dependent(nombre) {
  return nombre === 1 ? "dépend une conclusion" : `dépendent ${nombre} conclusions`;
}

/**
 * Les points ouverts, du plus coûteux à ne pas trancher au moins coûteux.
 *
 * L'ordre, et chaque cran dit pourquoi il est là :
 *
 * 1. **ce qu'on a pesé** avant ce qu'on n'a pas pesé — un point sans arête n'est
 *    pas bon marché, il est inconnu, et le mêler aux autres ferait croire qu'on
 *    l'a regardé ;
 * 2. **le rang**, parce que la profondeur n'est pas l'importance ;
 * 3. **la portée**, à engagement égal seulement ;
 * 4. **le champ saisi**, qui départage ce que le graphe n'a pas départagé ;
 * 5. **la date**, du plus ancien au plus récent : à tout point égal, c'est celui
 *    qui traîne depuis six mois qu'on regarde d'abord — et un ordre qui dépend
 *    de celui où la base a rendu ses lignes se relit différemment à chaque
 *    chargement.
 *
 * Les points fermés n'y sont pas : ils ont fait leur travail.
 */
export function ordreDesPointsOuverts(points = [], options = {}) {
  const ouverts = (Array.isArray(points) ? points : []).filter(pointOuvert);

  return ouverts
    .map((point) => ({ point, bilan: ceQueBloqueUnPoint(point, { ...options, points }) }))
    .sort((gauche, droite) => {
      if (gauche.bilan.mesure !== droite.bilan.mesure) return gauche.bilan.mesure ? -1 : 1;

      const rangs = ORDRE_DES_RANGS.indexOf(droite.bilan.rang) - ORDRE_DES_RANGS.indexOf(gauche.bilan.rang);
      if (rangs) return rangs;

      const portees = droite.bilan.conclusions.length - gauche.bilan.conclusions.length;
      if (portees) return portees;

      const saisies = ORDRE_DES_PRIORITES.indexOf(prioriteSaisie(droite.point?.priority))
        - ORDRE_DES_PRIORITES.indexOf(prioriteSaisie(gauche.point?.priority));
      if (saisies) return saisies;

      return texte(gauche.point?.created_at).localeCompare(texte(droite.point?.created_at));
    });
}

/** Le vocabulaire de l'engagement, repris tel quel : une seule échelle pour tous. */
export { RANG, phraseDuRang };
