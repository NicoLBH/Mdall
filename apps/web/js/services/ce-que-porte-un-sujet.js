/**
 * Ce qu'un sujet porte : ses labels, ses objectifs, ses assignés.
 *
 * ## La panne que ce fichier répare
 *
 * Une situation automatique est une requête : « les sujets ouverts, portant ce
 * label, assignés à celui-ci ». Pour y répondre il faut savoir ce que chaque
 * sujet porte — et on le lisait **au mauvais endroit**.
 *
 * Deux endroits disent ce qu'un sujet porte :
 *
 * 1. **la charge**, montée par le chargeur des sujets, qui est ce que la base
 *    sait — `labelIdsBySubjectId`, `objectiveIdsBySubjectId`, et les assignés ;
 * 2. **la surcouche de l'écran** (`bucket.subjectMeta.sujet`), où l'on note ce
 *    qu'on vient de changer avant que la base ne le confirme.
 *
 * La résolution des situations automatiques ne lisait que la **seconde**. Or
 * rien ne la remplit tant qu'on n'a rien modifié à la main : un filtre par
 * label ou par assigné ne trouvait donc **aucun sujet**, et la situation
 * s'affichait vide. Vide se lit comme « rien à faire ici », et l'on va chercher
 * la panne dans le filtre — pas dans la lecture (règle 5).
 *
 * ## L'ordre, et pourquoi il est celui-là
 *
 * **La surcouche d'abord, la charge ensuite.** C'est déjà l'ordre des assignés
 * ailleurs dans le code : ce qu'on vient de poser à l'écran doit se voir avant
 * le prochain rechargement, sinon cocher un label ferait disparaître le sujet
 * de la situation qu'on regarde, le temps d'un aller-retour.
 *
 * Une surcouche **absente** n'est pas une liste vide : elle veut dire « rien
 * n'a été changé ici », et c'est la charge qui répond. Confondre les deux
 * viderait tous les sujets dès qu'un seul a été modifié.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Des identifiants propres, sans blancs ni doublons, dans l'ordre lu. */
function identifiants(valeur) {
  if (!Array.isArray(valeur)) return [];
  return [...new Set(valeur.map(texte).filter(Boolean))];
}

/**
 * Ce qu'un sujet porte pour un champ donné.
 *
 * @param {object} options
 * @param {object} options.index l'index de la charge, par identifiant de sujet
 * @param {object} options.surcouche ce que l'écran a posé, par identifiant
 * @param {string} options.champ le nom du champ dans la surcouche
 * @param {string} options.sujet l'identifiant du sujet
 * @returns {string[]}
 */
export function cePortePar({ index = {}, surcouche = {}, champ = "", sujet = "" } = {}) {
  const cle = texte(sujet);
  if (!cle) return [];

  const pose = surcouche?.[cle];
  // `Array.isArray` et non « truthy » : une surcouche qui a vidé la liste dit
  // bien « plus rien », et ce n'est pas la même chose que « rien n'a changé ».
  if (pose && Array.isArray(pose[champ])) return identifiants(pose[champ]);

  return identifiants(index?.[cle]);
}

/** Les labels d'un sujet, en minuscules — c'est ainsi que le filtre compare. */
export function labelsDuSujet({ index, surcouche, sujet } = {}) {
  return cePortePar({ index, surcouche, champ: "labels", sujet }).map((entree) => entree.toLowerCase());
}

/** Les objectifs d'un sujet. */
export function objectifsDuSujet({ index, surcouche, sujet } = {}) {
  return cePortePar({ index, surcouche, champ: "objectiveIds", sujet });
}

/** Les personnes à qui le sujet est assigné. */
export function assignesDuSujet({ index, surcouche, sujet } = {}) {
  return cePortePar({ index, surcouche, champ: "assignees", sujet });
}
