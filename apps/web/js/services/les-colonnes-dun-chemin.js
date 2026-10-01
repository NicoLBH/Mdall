/**
 * Ce qui s'est passé **en même temps**, dans le chemin d'une exécution.
 *
 * ## Le défaut, dit par celui qui regarde
 *
 * « On voit bien que 3 tâches ont été lancées en même temps, mais le chemin les
 * dessine toujours les unes après les autres, de gauche à droite. »
 *
 * Depuis que la file lit trois comptes rendus de front, le chemin d'une
 * exécution de dix-neuf en dessinait dix-neuf à la suite. Ce dessin dit une
 * chose fausse — que le quatrième a attendu le troisième — et il la dit
 * d'autant mieux qu'il est par ailleurs juste : chaque boîte porte sa durée,
 * et on les additionne de l'œil.
 *
 * ## Ce que ce module décide
 *
 * Une **colonne** du chemin. Deux étapes sont dans la même colonne quand leurs
 * temps se recouvrent : l'une a commencé avant que l'autre ne finisse, et
 * réciproquement. Elles se dessinent alors l'une au-dessus de l'autre, et la
 * colonne suivante est ce qui a commencé après.
 *
 * Le recouvrement est vérifié **avec toute la colonne**, pas seulement avec la
 * dernière étape entrée : trois lectures lancées ensemble forment une colonne,
 * une quatrième partie à la fin de la première n'en fait pas partie — elle n'a
 * jamais tourné avec la troisième.
 *
 * ## Ce qu'il refuse de supposer
 *
 * **Une étape qui n'a pas commencé n'a pas de temps**, et n'est donc dans
 * aucune colonne : elle reste seule, à sa place dans la file. La ranger avec
 * ses voisines affirmerait qu'elles partiront ensemble — ce que personne ne
 * sait, et ce qui est faux dès qu'une lecture déborde (règle 5).
 *
 * De même, une étape qui tourne encore n'a pas de fin : elle recouvre tout ce
 * qui commence après elle, et c'est la vérité du moment où on regarde.
 *
 * ## Il est pur
 *
 * Des étapes entrent, des colonnes sortent. L'ordre donné est conservé : c'est
 * celui de la file, et le relire autrement ferait lire la file à l'envers.
 */

/**
 * Le début et la fin d'une étape, en millisecondes — ou `null` si elle n'a pas
 * commencé.
 *
 * `Number(null)` vaut **0**, qui est un instant fini : la question « a-t-elle
 * commencé ? » se pose donc avant toute conversion, sans quoi une étape en
 * attente se rangerait au tout début de l'exécution.
 */
function laDuree(declaree) {
  if (declaree === null || declaree === undefined || declaree === "") return null;
  const duree = Number(declaree);
  return Number.isFinite(duree) ? duree : null;
}

function leTemps(etape) {
  const declare = etape?.debut;
  if (declare === null || declare === undefined || declare === "") return null;

  const debut = Number(declare);
  if (!Number.isFinite(debut)) return null;

  // **Pas de durée : elle tourne encore.** Sa fin est donc plus tard que tout
  // ce qu'on connaît, et non « tout de suite ». Et la question se pose encore
  // avant la conversion : `Number(null)` vaut 0, qui est une durée finie —
  // une étape en cours se serait terminée à l'instant où elle a commencé, et
  // n'aurait donc recouvert personne.
  const duree = laDuree(etape?.ms);
  return { debut, fin: duree === null ? Infinity : debut + Math.max(0, duree) };
}

/**
 * Les colonnes du chemin, dans l'ordre où elles se sont suivies.
 *
 * @param {object[]} etapes des étapes portant `debut` (ms) et `ms` (durée)
 * @returns {object[][]} une liste de colonnes, chacune une liste d'étapes
 */
export function lesColonnesDunChemin(etapes = []) {
  const liste = (Array.isArray(etapes) ? etapes : []).filter(Boolean);

  const colonnes = [];
  // Les bornes de la colonne ouverte : la fin la plus tôt, et le début le plus
  // tard. Elles suffisent à savoir si une étape recouvre **toute** la colonne.
  let bornes = null;

  for (const etape of liste) {
    const temps = leTemps(etape);

    if (temps && bornes && temps.debut < bornes.finLaPlusTot && bornes.leDernierDebut < temps.fin) {
      colonnes[colonnes.length - 1].push(etape);
      bornes = {
        finLaPlusTot: Math.min(bornes.finLaPlusTot, temps.fin),
        leDernierDebut: Math.max(bornes.leDernierDebut, temps.debut)
      };
      continue;
    }

    colonnes.push([etape]);
    bornes = temps ? { finLaPlusTot: temps.fin, leDernierDebut: temps.debut } : null;
  }

  return colonnes;
}

/**
 * Le rang de colonne de chaque étape, posé sur elle.
 *
 * C'est ce que le dessin consomme : il n'a pas à refaire le regroupement, et
 * deux regroupements — un pour décider, un pour dessiner — auraient fini par ne
 * plus s'accorder (règle 4).
 */
export function lesEtapesEnColonnes(etapes = []) {
  return lesColonnesDunChemin(etapes).flatMap((colonne, rang) => (
    colonne.map((etape) => ({ ...etape, colonne: rang }))
  ));
}

/**
 * Ce que le chemin dit de ses colonnes, en une phrase — ou rien.
 *
 * **Rien quand rien n'a été mené de front**, et c'est le cas le plus fréquent.
 * Une phrase sur chaque exécution ferait un gabarit qu'on apprend à ignorer.
 */
export function phraseDesColonnes(etapes = []) {
  const colonnes = lesColonnesDunChemin(etapes);
  const deFront = colonnes.filter((colonne) => colonne.length > 1);
  if (!deFront.length) return "";

  const leplus = Math.max(...deFront.map((colonne) => colonne.length));

  return `${deFront.length} étape${deFront.length > 1 ? "s" : ""} du chemin ${
    deFront.length > 1 ? "ont été menées" : "a été menée"} de front — jusqu'à ${
    leplus} à la fois. Ce qui est empilé a tourné en même temps.`;
}
