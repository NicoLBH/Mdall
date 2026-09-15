/**
 * Une charge de sujets pour plusieurs chantiers.
 *
 * ## Pourquoi fusionner plutôt que recharger
 *
 * Le carnet regarde des situations qui traversent les projets. Pour savoir ce
 * qu'une situation contient, il faut les sujets des chantiers qu'elle désigne —
 * et le chargeur des sujets ne sait travailler que pour un projet à la fois.
 *
 * On le fait donc tourner une fois par chantier, et l'on met les résultats bout
 * à bout. **Aucune règle nouvelle n'est écrite ici** : ce fichier ne fait que
 * réunir. Recalculer les index aurait fait une seconde façon de les produire,
 * qui aurait fini par ne plus dire la même chose que la première (règle 10).
 *
 * ## Ce qu'il ne faut pas perdre en route
 *
 * Un chantier dont les labels n'ont pas pu être lus rend une charge dont les
 * index de labels sont vides. **Fusionnée sans précaution, cette absence devient
 * indiscernable d'un chantier sans labels** — et une situation filtrant par
 * label s'affiche vide, ce qui se lit comme « rien à faire ici ».
 *
 * `labelsHydrated` et `objectivesHydrated` ne valent donc vrai que si **tous**
 * les chantiers ont répondu. Ne pas savoir n'autorise pas à prétendre qu'il n'y
 * a rien (règle 5).
 */

/** Les listes se mettent bout à bout, sans doublon, dans l'ordre lu. */
function bouts(gauche, droite) {
  return [...new Set([...gauche, ...droite])];
}

/**
 * Deux index réunis.
 *
 * Les clés sont des identifiants de sujet, de label ou de situation : uniques
 * d'un chantier à l'autre. Quand la même clé revient malgré tout — deux
 * chantiers qui citent le même sujet — les listes se réunissent plutôt que de
 * s'écraser, parce qu'aucune des deux n'est plus vraie que l'autre.
 */
function reunirDeuxIndex(gauche = {}, droite = {}) {
  const reuni = { ...gauche };

  for (const [cle, valeur] of Object.entries(droite ?? {})) {
    const existant = reuni[cle];
    if (Array.isArray(existant) && Array.isArray(valeur)) reuni[cle] = bouts(existant, valeur);
    else reuni[cle] = valeur;
  }

  return reuni;
}

/** Les champs qui sont des listes, et se mettent bout à bout. */
const LISTES = ["subjects", "rootSubjectIds", "labels", "objectives"];

/**
 * Les champs qui affirment qu'une lecture a abouti.
 *
 * Ils ne valent vrai que si tous les chantiers l'ont dit : un seul silence et
 * l'on ne sait plus, ce qui n'est pas la même chose que « il n'y en a pas ».
 */
const CERTITUDES = ["labelsHydrated", "objectivesHydrated", "subjectSignalsRead"];

/**
 * Les charges de plusieurs chantiers, réunies en une.
 *
 * @param {object[]} charges une charge par chantier, dans l'ordre voulu
 * @returns {object} une charge de la même forme, utilisable partout où l'on
 *   attend celle d'un projet
 */
export function fusionnerLesCharges(charges = []) {
  const toutes = (Array.isArray(charges) ? charges : []).filter((charge) => charge && typeof charge === "object");

  if (!toutes.length) return { subjects: [], subjectsById: {}, rootSubjectIds: [] };
  if (toutes.length === 1) return toutes[0];

  const fusion = {};

  for (const charge of toutes) {
    for (const [cle, valeur] of Object.entries(charge)) {
      if (LISTES.includes(cle)) {
        fusion[cle] = [...(Array.isArray(fusion[cle]) ? fusion[cle] : []), ...(Array.isArray(valeur) ? valeur : [])];
        continue;
      }

      if (CERTITUDES.includes(cle)) {
        // Le `&&` est le point : un seul chantier muet et l'on ne sait plus.
        fusion[cle] = (fusion[cle] === undefined ? true : fusion[cle] === true) && valeur === true;
        continue;
      }

      if (valeur && typeof valeur === "object" && !Array.isArray(valeur)) {
        fusion[cle] = reunirDeuxIndex(fusion[cle] && typeof fusion[cle] === "object" ? fusion[cle] : {}, valeur);
        continue;
      }

      if (fusion[cle] === undefined) fusion[cle] = valeur;
    }
  }

  return fusion;
}
