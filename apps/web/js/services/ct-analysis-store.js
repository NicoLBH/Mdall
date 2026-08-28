/**
 * Ce qui se garde d'une analyse d'avis, et ce qui se recalcule.
 *
 * Les documents sont des faits : ils sont déposés, stockés, reconnus. Les avis
 * n'en sont que la conséquence — ils se recalculent, et la moindre correction
 * du moteur ou du vocabulaire peut les changer. On ne les conserve donc pas
 * comme une vérité, mais comme l'état connu à un moment, daté et signé par le
 * moteur qui l'a produit.
 *
 * **Aucun recalcul incrémental.** Un document plus ancien qui arrive en retard
 * réécrit l'histoire : un avis qu'on croyait né en 2025 naît en 2023, un avis
 * « sans nouvelles » était couvert par un rapport que personne n'avait déposé.
 * Invalider finement une chaîne chronologique ordonnée est bien plus difficile
 * que de tout recalculer, et produit des anomalies irreproductibles. Dix-sept
 * documents se relisent en une seconde ; deux cents resteront dans les
 * secondes. Un dossier de chantier a des dizaines de rapports, pas des
 * millions — c'est une contrainte de taille qui nous est offerte.
 *
 * **Un avis n'est jamais supprimé.** Il est mis à jour par son identité
 * naturelle — le projet et le numéro que le bureau de contrôle lui a
 * lui-même attribué —, et celui qui disparaît du lot est marqué absent, sa
 * preuve d'alors conservée. Cette règle prépare la promotion des avis en
 * sujets, qui viendra plus tard : un sujet ne peut pas être supprimé, donc
 * rien de ce à quoi il se rattachera ne doit pouvoir l'être non plus.
 */

import { sha256Hex } from "../utils/sha256.js";

/** La version du moteur, consignée avec chaque exécution. */
export const ENGINE_VERSION = "ct-continuity/1";

/**
 * L'empreinte d'un lot de documents.
 *
 * Elle ne dépend ni de l'ordre de dépôt ni des noms de fichiers : ce sont les
 * empreintes de contenu, triées. Deux lots de mêmes documents ont la même
 * empreinte, et ajouter un document — fût-il plus ancien que tous les autres —
 * la change. C'est ce qui dit qu'il faut tout recalculer.
 */
export async function corpusFingerprint(documents = []) {
  const parts = documents
    .map((document) => String(document?.fingerprint ?? document?.content_fingerprint ?? ""))
    .filter(Boolean)
    .sort();

  if (parts.length === 0) return null;
  return sha256Hex(parts.join("\n"));
}

/**
 * Traduit l'état des avis calculé par le moteur en lignes à conserver.
 *
 * Seuls les avis numérotés sont retenus. C'est déjà la doctrine du suivi : un
 * avis sans numéro n'a pas d'identité que le métier ait fixée, et lui en
 * inventer une reviendrait à deviner.
 */
export function toAvisRows(result, { projectId, documentIds = {} } = {}) {
  const context = new Map(
    (result?.predictions ?? [])
      .filter((prediction) => prediction.kind === "extraction" && prediction.value?.external_reference_raw)
      .map((prediction) => [prediction.value.external_reference_normalized, prediction])
  );

  return (result?.avisStatus ?? []).map((summary) => {
    const prediction = context.get(summary.reference) ?? null;

    return {
      project_id: projectId,
      external_reference: summary.reference,
      title: prediction?.title_raw ?? null,
      opinion_raw: summary.opinion_raw ?? prediction?.value?.opinion_raw ?? null,
      opinion_label: prediction?.opinion_label ?? null,
      status: summary.status,
      resolution_reason: summary.resolution_reason ?? null,
      raised_at: summary.raised_at ?? null,
      raised_in_document_id: documentIds[summary.raised_in] ?? null,
      last_seen_document_id: documentIds[summary.last_seen_document_id] ?? null,
      resolved_at: summary.resolved_at ?? null,
      // La preuve d'alors, conservée avec l'avis. Un avis qui ne peut plus se
      // justifier ne vaut pas mieux qu'une affirmation.
      evidence: summary.evidence ?? null,
      pack_id: prediction?.pack_id ?? null,
      pack_version: prediction?.pack_version ?? null,
      absent_from_corpus: false
    };
  });
}

/**
 * Confronte ce qui vient d'être calculé à ce qui était conservé.
 *
 * Trois issues, et aucune n'est une suppression :
 *
 *  - l'avis est calculé et connu : on met à jour ;
 *  - l'avis est calculé et inconnu : on l'ajoute ;
 *  - l'avis est connu mais ne ressort plus du lot : on le marque absent, sans
 *    toucher à ce qu'on en savait. Un document a pu être écarté, un numéro mal
 *    lu la veille — dans les deux cas, effacer l'avis effacerait aussi la
 *    trace de ce qui a permis de l'affirmer.
 *
 * @returns {{upserts: object[], missing: object[]}}
 */
export function reconcileAvis(known = [], computed = []) {
  const byReference = new Map(computed.map((row) => [String(row.external_reference), row]));

  const missing = known
    .filter((row) => !byReference.has(String(row.external_reference)))
    // Le marquer deux fois n'apprend rien de plus et réécrit une ligne pour rien.
    .filter((row) => row.absent_from_corpus !== true)
    .map((row) => ({ id: row.id, external_reference: row.external_reference, absent_from_corpus: true }));

  return { upserts: computed, missing };
}

/**
 * La ligne d'exécution : ce qui a été lu, par quoi, et ce qu'on en a tiré.
 *
 * Sans elle, deux lectures d'un même dossier ne se distinguent pas, et l'on ne
 * peut pas dire si un écart vient des documents ou d'une correction du moteur.
 */
export function toRunRow(result, { projectId, corpusFingerprint: fingerprint, documentCount } = {}) {
  const indicators = result?.indicators ?? {};

  return {
    project_id: projectId,
    corpus_fingerprint: fingerprint ?? null,
    document_count: documentCount ?? 0,
    avis_count: (result?.predictions ?? []).length,
    tracked_avis_count: (result?.avisStatus ?? []).length,
    guard_violation_count: (indicators.guardViolations ?? []).length,
    packs_used: result?.packsUsed ?? {},
    engine_version: ENGINE_VERSION,
    computed_at: new Date().toISOString()
  };
}

/**
 * Vrai si l'état conservé porte encore sur ce lot, lu par ce moteur.
 *
 * Le lot a changé, le moteur a changé, ou le vocabulaire a changé : dans les
 * trois cas ce qui est conservé ne décrit plus rien, et il faut tout refaire.
 */
export function isRunCurrent(run, { corpusFingerprint: fingerprint, packsUsed = {} } = {}) {
  if (!run || !fingerprint) return false;
  if (run.corpus_fingerprint !== fingerprint) return false;
  if (run.engine_version !== ENGINE_VERSION) return false;

  const before = JSON.stringify(run.packs_used ?? {});
  const now = JSON.stringify(packsUsed ?? {});
  return before === now;
}
