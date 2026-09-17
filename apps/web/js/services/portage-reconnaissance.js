/**
 * La reconnaissance qui propose des arêtes, et **quand** elle tourne.
 *
 * Étapes 3 et 4 du branchement de la reconnaissance
 * (`docs/lobjet-de-la-connaissance.md`).
 *
 * ## Trois appelants, une seule décision
 *
 * La recherche à la demande, la naissance d'un point, l'entrée d'une
 * affirmation en mémoire : trois moments, **un seul endroit** qui décide ce
 * qu'on propose et l'écrit. Trois orchestrations séparées auraient fini par ne
 * plus proposer la même chose — et c'est la proposition, pas l'écran, qu'on
 * regarde pour juger si la reconnaissance est au bon niveau (règle 4).
 *
 * ## Deux moments, et pas un balayage
 *
 * Il n'y a que deux instants où un rapprochement **nouveau** peut naître, et ce
 * sont les deux côtés de la même arête :
 *
 * | quand | ce qu'on confronte à quoi |
 * | --- | --- |
 * | un point naît | son intitulé, à la mémoire entière |
 * | une affirmation entre | son nom, aux points ouverts |
 *
 * Chaque confrontation est donc bornée par ce qui vient de se produire. Passer
 * tous les points ouverts contre toute la mémoire à chaque événement serait un
 * balayage déguisé, qui redécouvrirait les mêmes rapprochements pour des points
 * que rien n'a touchés — et une alerte qui revient sans raison est une alerte
 * qu'on cesse de lire.
 *
 * ## Elle ne pose que du proposé
 *
 * Les arêtes écrites ici n'ont **pas d'auteur** : `declared_by` nul dit
 * « reconnu, pas encore confirmé ». Un point mal accroché contesterait en
 * silence une valeur que personne n'a mise en doute, et c'est un humain qui
 * tranche — ici comme partout (règle 1).
 *
 * ## Et elle ne fait jamais échouer ce qui l'appelle
 *
 * Elle est appelée après une fusion, après une création. Ces gestes ont réussi ;
 * manquer un rapprochement ne doit pas les défaire. Tout échec est donc muet et
 * rendu en nombre — l'appelant décide s'il le dit.
 */

import { liensAPoser, pointOuvert, portagesDeCesPoints } from "./point-porte-sur.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Propose les arêtes des confrontations données, et les écrit.
 *
 * @param {object} options
 * @param {string} options.projectId le projet, tel que la base le connaît
 * @param {{points: object[], assertions: object[]}[]} options.confrontations
 * @param {object[]} [options.liens] ce qui est déjà écrit — lu ici à défaut
 * @returns {Promise<{proposees: number, reconnues: number, parPoint: Map}|null>}
 *   `null` quand rien n'a pu être lu ou écrit : « on ne sait pas » n'est pas
 *   « il n'y avait rien » (règle 5).
 */
export async function proposerLesPortages({ projectId = "", confrontations = [], liens = null } = {}) {
  const projet = texte(projectId);
  if (!projet) return null;

  const aConfronter = (Array.isArray(confrontations) ? confrontations : [])
    .map((paire) => ({
      // **Les points fermés n'entrent pas.** Un débat soldé ne met plus rien en
      // question, et lui accrocher une valeur ferait présenter comme contestée
      // une valeur que plus personne ne discute.
      points: (Array.isArray(paire?.points) ? paire.points : []).filter(pointOuvert),
      assertions: Array.isArray(paire?.assertions) ? paire.assertions : []
    }))
    .filter((paire) => paire.points.length && paire.assertions.length);

  if (!aConfronter.length) return { proposees: 0, reconnues: 0, parPoint: new Map() };

  const { listerLesLiens, poserLesLiens } = await import("./point-porte-sur-supabase.js");

  const ecrits = liens ?? await listerLesLiens(projet);
  // Sans les liens, on ne sait pas ce qui a déjà été refusé — et proposer sans
  // mémoire du refus est pire que ne pas proposer.
  if (ecrits === null) return null;

  const { parPoint, combien } = portagesDeCesPoints({ confrontations: aConfronter, liens: ecrits });

  let reconnues = 0;
  const lignes = [];
  for (const dit of parPoint.values()) {
    reconnues += dit.reconnues.length;
    lignes.push(...liensAPoser({ point: dit.point, assertions: dit.aProposer, projectId: projet }));
  }

  if (lignes.length && await poserLesLiens(lignes) === null) return null;

  return { proposees: combien, reconnues, parPoint };
}

/**
 * Ce qu'une passe de reconnaissance a donné, en une phrase.
 *
 * Pour le journal d'une fusion, où il faut pouvoir lire après coup ce qui s'est
 * proposé tout seul. **Rien reconnu** et **rien à proposer** ne se disent pas
 * pareil : la première dit que la reconnaissance a tourné sans rien trouver, la
 * seconde que tout ce qu'elle trouve était déjà su (règle 5).
 */
export function phraseDesPortagesProposes(bilan = null) {
  if (!bilan) return "les rattachements n'ont pas pu être cherchés";
  if (bilan.proposees === 1) return "1 rattachement proposé, à confirmer";
  if (bilan.proposees > 1) return `${bilan.proposees} rattachements proposés, à confirmer`;
  if (bilan.reconnues > 0) return "rien de nouveau à rattacher";
  return "aucun nom de la mémoire reconnu";
}

/**
 * Chercher, pour **un** point qui vient de naître, sur quoi il porte.
 *
 * Le raccourci du cas le plus fréquent : quelqu'un vient d'ouvrir un sujet, son
 * intitulé n'a encore rencontré personne, et c'est le moment où le rapprochement
 * a le plus de chances d'être juste — le titre est frais, celui qui l'a écrit
 * est devant l'écran.
 *
 * **Jamais depuis une fusion.** Là, quarante sujets naissent d'un coup, et les
 * confronter un par un ferait quarante lectures de la mémoire : la fusion les
 * passe en une seule confrontation.
 *
 * Muette en cas d'échec, comme le reste : un sujet est ouvert, et manquer son
 * rattachement ne doit pas faire croire qu'il ne s'est pas ouvert.
 */
export async function chercherLePortageDuPointNe(point = null, { projectId = "" } = {}) {
  const projet = texte(projectId) || texte(point?.project_id);
  if (!projet || !texte(point?.id)) return null;

  try {
    const { listProjectAssertions } = await import("./project-memory-supabase.js");
    const memoire = await listProjectAssertions(projet);
    if (memoire === null) return null;

    return await proposerLesPortages({
      projectId: projet,
      confrontations: [{ points: [point], assertions: memoire }]
    });
  } catch {
    return null;
  }
}
