/**
 * L'ordre des sujets ouverts, par ce que ça coûte de ne pas les trancher.
 *
 * Le branchement d'écran de l'étape 5 de `docs/lobjet-de-la-connaissance.md`.
 *
 * ## Ce que ce fichier fait, et ce qu'il ne fait pas
 *
 * Il **va chercher** ce qu'il faut — les arêtes, les points, la mémoire, le
 * graphe, les engagements — et il **range**. Ce qui décide de l'ordre vit dans
 * `services/ce-que-bloque-un-point.js`, qui est pur et testé : deux endroits qui
 * décideraient ce qu'un sujet bloque finiraient par ne plus dire la même chose
 * (règle 4).
 *
 * ## Cinq lectures, une fois
 *
 * On ne les demande qu'au moment où l'on choisit cet ordre-là, et une seule fois
 * par projet. Les faire au chargement de l'écran ferait payer cinq requêtes à
 * tout le monde pour un rangement que personne n'a demandé.
 *
 * ## Tant qu'on ne sait pas, la liste ne bouge pas
 *
 * `trierLesSujets` laisse la liste telle quelle sans places : ranger au hasard
 * en attendant serait affirmer un ordre qu'on n'a pas (règle 5). Quand les
 * lectures reviennent, l'écran se redessine — une fois.
 */

import { ordreDesPointsOuverts } from "../../services/ce-que-bloque-un-point.js";
import { couvertureDuProjet } from "../../services/ce-qui-couvre.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'état de la lecture, par projet. Une lecture en vol ne se relance pas. */
let lecture = { projectId: "", enCours: false, ordre: null };

/** Repartir de zéro — après un geste qui change les arêtes, ou de projet. */
export function oublierLOrdreDuBlocage() {
  lecture = { projectId: "", enCours: false, ordre: null };
}

/**
 * Les places connues pour ce projet, ou `null`.
 *
 * `null` dit « on ne sait pas encore », jamais « tout est à égalité ».
 *
 * La clé est **celle de l'écran**, pas celle de la base : c'est la seule que le
 * sélecteur ait sous la main, et deux clés pour un même projet feraient ranger
 * la liste d'un projet avec l'ordre d'un autre (règle 4). La correspondance vers
 * l'identifiant de la base est faite une fois, ici, au moment de lire.
 */
export function placesDuBlocage(scopeId = "") {
  return lecture.projectId === texte(scopeId) ? lecture.ordre : null;
}

/**
 * Demande les places, si on ne les a pas déjà.
 *
 * @param {string} scopeId l'identifiant de projet que l'écran porte
 * @param {() => void} quandCestPret de quoi redessiner l'écran une fois
 */
export async function demanderLOrdreDuBlocage(scopeId, quandCestPret = () => {}) {
  const portee = texte(scopeId);
  if (!portee) return;
  if (lecture.projectId === portee && (lecture.ordre || lecture.enCours)) return;

  lecture = { projectId: portee, enCours: true, ordre: null };

  const { resolveCurrentBackendProjectId } = await import("../../services/project-supabase-sync.js");
  const projet = texte(await resolveCurrentBackendProjectId());
  if (!projet || lecture.projectId !== portee) {
    lecture = { projectId: portee, enCours: false, ordre: null };
    return;
  }

  const [
    { listerLesLiens, listerLesPoints },
    { listProjectAssertions },
    { listAssertionDependencies },
    { listHypothesisActs }
  ] = await Promise.all([
    import("../../services/point-porte-sur-supabase.js"),
    import("../../services/project-memory-supabase.js"),
    import("../../services/assertion-dependencies-supabase.js"),
    import("../../services/memoire-actes-supabase.js")
  ]);

  const [liens, points, assertions, dependances, actes] = await Promise.all([
    listerLesLiens(projet),
    listerLesPoints(projet),
    listProjectAssertions(projet),
    listAssertionDependencies(projet),
    listHypothesisActs(projet)
  ]);

  // On a pu changer de projet pendant les lectures.
  if (lecture.projectId !== portee) return;

  // Une lecture ratée ne se montre pas comme une absence : sans les arêtes ni la
  // mémoire, il n'y a pas d'ordre à donner, et en inventer un rangerait la liste
  // sur rien.
  if (liens === null || points === null || assertions === null) {
    lecture = { projectId: portee, enCours: false, ordre: null };
    return;
  }

  const ranges = ordreDesPointsOuverts(points, {
    liens,
    assertions,
    dependances: dependances ?? [],
    // `null` vaut « on n'a pas lu les actes » : aucun engagement ne monte alors
    // le rang, et c'est plus honnête que d'en supposer.
    couvertures: couvertureDuProjet({ actes: actes ?? [] })
  });

  lecture = {
    projectId: portee,
    enCours: false,
    ordre: new Map(ranges.map((ligne, place) => [texte(ligne.point?.id), place]))
  };

  quandCestPret();
}
