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
 * Ce qu'on retient d'un document dans la liste du lot.
 *
 * Deux formes de documents arrivent ici et doivent produire la même entrée :
 * ceux que l'atelier vient de lire, et les lignes `documents` relues du projet.
 * Le nom n'y est que pour pouvoir écrire la phrase — un document retiré du
 * projet n'a plus de ligne où aller le lire.
 */
function corpusEntry(document) {
  return {
    document_id: document?.documentId ?? document?.document_id ?? document?.id ?? null,
    fingerprint: String(document?.fingerprint ?? document?.content_fingerprint ?? "") || null,
    name: document?.original_filename ?? document?.filename ?? null
  };
}

/**
 * La liste de ce qui a été lu, conservée avec l'exécution.
 *
 * Elle est triée par empreinte, comme `corpusFingerprint` : ni l'ordre de dépôt
 * ni les noms de fichiers n'entrent dans l'identité d'un lot.
 *
 * Un document sans empreinte lisible en est absent. Il n'entre pas non plus
 * dans l'empreinte du lot, et il n'a pas pu être analysé : le faire figurer ici
 * le montrerait « nouveau » à chaque ouverture, indéfiniment.
 */
export function corpusEntries(documents = []) {
  return documents
    .map(corpusEntry)
    .filter((entry) => entry.fingerprint)
    .sort((left, right) => left.fingerprint.localeCompare(right.fingerprint));
}

/**
 * Ce qui a changé entre le lot analysé et les documents que le projet contient.
 *
 * La comparaison porte sur les **empreintes de contenu**, jamais sur les
 * identifiants ni les noms : un même rapport redéposé sous un autre nom n'est
 * pas un nouveau document, et c'est précisément le genre de faux positif qui
 * ferait relancer une analyse pour rien.
 *
 * `known` vaut `false` pour une exécution enregistrée avant que la liste ne
 * soit conservée. On sait alors que le lot a changé — l'empreinte le dit —,
 * sans pouvoir nommer quoi. Le dire ainsi vaut mieux que de laisser croire
 * qu'il n'y a rien de nouveau.
 *
 * @returns {{known: boolean, added: object[], removed: object[]}}
 */
export function diffCorpus(run, documents = []) {
  const before = Array.isArray(run?.corpus_documents) ? run.corpus_documents : null;
  if (!before) return { known: false, added: [], removed: [] };

  const seenBefore = new Set(before.map((entry) => entry?.fingerprint).filter(Boolean));
  const now = corpusEntries(documents);
  const seenNow = new Set(now.map((entry) => entry.fingerprint));

  return {
    known: true,
    added: now.filter((entry) => !seenBefore.has(entry.fingerprint)),
    removed: before.filter((entry) => entry?.fingerprint && !seenNow.has(entry.fingerprint))
  };
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
 *
 * Elle porte aussi **ce qui l'a causée** : la proposition dont la fusion l'a
 * déclenchée, ou rien quand c'est une main qui a lancé l'atelier. C'est par là
 * qu'on remonte d'un chiffre du suivi à la décision qui l'a produit.
 */
export function toRunRow(
  result,
  {
    projectId,
    corpusFingerprint: fingerprint,
    documentCount,
    corpusDocuments = null,
    propositionId = null,
    triggerSource = null
  } = {}
) {
  const indicators = result?.indicators ?? {};

  return {
    project_id: projectId,
    corpus_fingerprint: fingerprint ?? null,
    // Ce qui a causé l'exécution. Deux fusions différentes peuvent aboutir au
    // même corpus : l'empreinte ne distinguera jamais ce que cette colonne dit.
    proposition_id: propositionId,
    trigger_source: triggerSource ?? (propositionId ? "proposition" : "manual"),
    // Ce que l'empreinte ne peut pas dire : lesquels. Sans cette liste, l'écran
    // ne sait annoncer qu'« le lot a changé ».
    corpus_documents: corpusDocuments,
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
