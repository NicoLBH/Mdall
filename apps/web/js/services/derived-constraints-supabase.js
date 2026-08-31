/**
 * Le versement des contraintes du site dans la mémoire.
 *
 * Le même chemin que celui d'une hypothèse déclarée : on écrit d'abord, on
 * périme ensuite. Si l'écriture échoue, rien n'a été invalidé — le pire cas
 * laisse la mémoire telle qu'elle était.
 *
 * **Une contrainte se corrige, elle ne se révise pas.** Le mécanisme est le même
 * — une nouvelle valeur en périme une ancienne sur la même clé — mais ce qu'il
 * veut dire ne l'est pas : une hypothèse remplacée est le cours normal des
 * choses, une contrainte remplacée veut dire qu'on a calculé faux jusque-là.
 * C'est pourquoi ce qui reposait dessus est marqué à revérifier, comme pour une
 * hypothèse : `planReviewFlags` accepte désormais les deux natures.
 *
 * **Aucun acte n'est posé.** Une hypothèse versée reçoit son émission ; une
 * contrainte n'en reçoit pas, parce qu'on ne se prononce pas dessus. `planAct`
 * le refuse, et ce fichier n'essaie pas.
 */

import { listProjectAssertions, markSuperseded, writeAssertions } from "./project-memory-supabase.js";
import { constraintsFromContextFacts, plannedConstraintRows } from "./derived-constraints.js";
import { listProjectContextFacts } from "./project-context-facts-service.js";
import { planReviewFlags } from "./assertion-dependencies.js";
import { listAssertionDependencies, markNeedsReview } from "./assertion-dependencies-supabase.js";

/**
 * Ce que le site impose, tel que les faits de contexte l'établissent.
 *
 * Rien n'est calculé ici : les faits viennent des outils de l'Atelier, qui les
 * ont déjà écrits. Cette fonction ne fait que les lire et les traduire.
 */
export async function siteConstraintCandidates(projectId) {
  const faits = await listProjectContextFacts(projectId).catch(() => []);
  return constraintsFromContextFacts(faits);
}

/**
 * Verse les contraintes du site, et périme les valeurs qu'elles corrigent.
 *
 * @returns {Promise<{written: number, superseded: number, flagged: number}|null>}
 *   `null` si rien n'a pu être versé — l'appelant le dit, il ne le tait pas.
 */
export async function rememberSiteConstraints({ projectId, candidates = [], declaredBy = null, at = "" } = {}) {
  if (!projectId) return null;

  const lignes = plannedConstraintRows({ projectId, candidates, declaredBy, at });
  if (lignes.length === 0) return { written: 0, superseded: 0, flagged: 0 };

  const existantes = (await listProjectAssertions(projectId)) ?? [];

  // Une contrainte inchangée ne se réécrit pas. Reverser la même valeur ferait
  // une histoire de corrections là où il ne s'est rien passé, et le premier
  // effet serait de marquer à revérifier des notes que rien n'a touchées.
  const enVigueur = new Map(
    existantes
      .filter((entry) => !entry.superseded_by)
      .map((entry) => [`${entry.kind}|${entry.subject_key}`, entry])
  );
  const nouvelles = lignes.filter((ligne) => {
    const ancienne = enVigueur.get(`${ligne.kind}|${ligne.subject_key}`);
    return !ancienne || ancienne.statement !== ligne.statement;
  });
  if (nouvelles.length === 0) return { written: 0, superseded: 0, flagged: 0 };

  const ecrites = await writeAssertions(nouvelles);
  if (!ecrites || ecrites.length === 0) return null;

  const quand = at || new Date().toISOString();
  const parCle = new Map(ecrites.map((row) => [`${row.kind}|${row.subject_key}`, row]));

  const anciennes = [...enVigueur.values()].filter((entry) => {
    const remplacante = parCle.get(`${entry.kind}|${entry.subject_key}`);
    return Boolean(remplacante) && remplacante.id !== entry.id;
  });

  const liens = anciennes.map((entry) => ({
    oldId: entry.id,
    newId: parCle.get(`${entry.kind}|${entry.subject_key}`).id,
    at: quand
  }));
  if (liens.length > 0) await markSuperseded(liens);

  // Ce qui a été dimensionné sur l'ancienne valeur devient suspect. Ne pas savoir
  // le marquer ne défait pas le versement, qui, lui, a eu lieu.
  let flagged = 0;
  if (anciennes.length > 0) {
    try {
      const dependances = await listAssertionDependencies(projectId);
      const marques = planReviewFlags(anciennes, dependances ?? [], quand);
      flagged = await markNeedsReview(marques);
    } catch {
      flagged = 0;
    }
  }

  return { written: ecrites.length, superseded: liens.length, flagged };
}
