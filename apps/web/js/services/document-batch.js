/**
 * Déposer un lot de documents.
 *
 * Jusqu'ici, déposer n'existait pas comme acte. L'écran ne prenait qu'un fichier
 * à la fois, et surtout il n'écrivait rien par lui-même : le seul téléversement
 * vers la base se trouvait **à l'intérieur de l'analyse**. Refuser l'analyse
 * revenait donc à ne rien déposer, pendant que l'écran annonçait « le dépôt a
 * été enregistré ». C'était faux, et invisible.
 *
 * Ce module rend au dépôt son autonomie : on dépose N documents, un point c'est
 * tout. Ce qu'on en fait ensuite — les analyser, les soumettre à une
 * proposition — est une autre décision, prise ailleurs.
 *
 * Il compose, il n'invente rien : `document-intake.js` examine, `document-deposit.js`
 * écrit, `document-filing.js` range. La seule chose qui lui appartienne est
 * l'ordre dans lequel il les appelle, et ce qu'il faut dire du résultat.
 */

import { inspectFile, relateToKnown, toDocumentColumns } from "./document-intake.js";
import { IDENTITY } from "./document-identity.js";

/**
 * L'écriture est chargée à la demande.
 *
 * `document-deposit.js` passe par le SDK Supabase, importé depuis le réseau, que
 * l'exécution des tests hors navigateur ne saurait résoudre. Différer cet import
 * garde `planBatch` et `summarizeDeposit` — les deux fonctions qui décident ce
 * qui entre — vérifiables sans navigateur.
 */
const writer = () => import("./document-deposit.js");

/** Ce qu'un fichier peut devenir en entrant. */
export const ENTRY = {
  /** Déposé, avec sa ligne en base. */
  DEPOSITED: "DEPOSITED",
  /** Même contenu qu'un document déjà présent : on ne le redépose pas. */
  DUPLICATE: "DUPLICATE",
  /** Refusé avant même d'essayer : ce n'est pas un fichier qu'on sait recevoir. */
  UNSUPPORTED: "UNSUPPORTED",
  /** Le dépôt a été tenté et a échoué. */
  FAILED: "FAILED"
};

/**
 * Les extensions que l'écran de dépôt annonce accepter.
 *
 * La liste est celle de l'`accept` du champ de fichiers : promettre à l'écran
 * qu'un `.dwg` est le bienvenu et le refuser en silence à l'entrée serait un
 * mensonge de plus.
 */
const ACCEPTED = /\.(pdf|docx?|xlsx?|dwg|zip|png|jpe?g|gif|webp|heic)$/i;

/**
 * Répartit un lot entre ce qu'on peut recevoir et ce qu'on refuse d'emblée.
 *
 * Pur, et testé, parce que c'est ici que se décide ce qui entre — et qu'un lot
 * de dix-sept fichiers dont un refusé sans qu'on le dise est exactement le genre
 * de silence qu'on a passé trois étapes à supprimer.
 *
 * @returns {{accepted: File[], rejected: {file: File, entry: string, reason: string}[]}}
 */
export function planBatch(files = []) {
  const accepted = [];
  const rejected = [];

  for (const file of files) {
    const name = String(file?.name ?? "");
    if (ACCEPTED.test(name) || String(file?.type ?? "").startsWith("image/")) {
      accepted.push(file);
    } else {
      rejected.push({
        file,
        entry: ENTRY.UNSUPPORTED,
        reason: "Ce type de fichier n'est pas accepté dans les documents du projet."
      });
    }
  }

  return { accepted, rejected };
}

/**
 * Ce qu'il faut dire d'un dépôt, en une phrase.
 *
 * L'écran annonçait « le dépôt a été enregistré » quoi qu'il advienne. Une
 * phrase qui ne varie pas ne renseigne sur rien : celle-ci compte, et nomme.
 */
export function summarizeDeposit(results = []) {
  const count = (entry) => results.filter((result) => result.entry === entry).length;

  const deposited = count(ENTRY.DEPOSITED);
  const duplicates = count(ENTRY.DUPLICATE);
  const unsupported = count(ENTRY.UNSUPPORTED);
  const failed = count(ENTRY.FAILED);

  const parts = [];
  if (deposited > 0) parts.push(`${deposited} document${deposited > 1 ? "s" : ""} déposé${deposited > 1 ? "s" : ""}`);
  if (duplicates > 0) parts.push(`${duplicates} déjà présent${duplicates > 1 ? "s" : ""}`);
  if (unsupported > 0) parts.push(`${unsupported} refusé${unsupported > 1 ? "s" : ""}`);
  if (failed > 0) parts.push(`${failed} en échec`);

  return {
    deposited,
    duplicates,
    unsupported,
    failed,
    // Un dépôt dont rien n'est entré n'est pas un dépôt réussi, même sans erreur.
    tone: failed > 0 ? "warning" : deposited > 0 ? "success" : "info",
    message: parts.length > 0 ? `${parts.join(", ")}.` : "Aucun fichier à déposer.",
    documentIds: results.filter((result) => result.documentId).map((result) => result.documentId)
  };
}

/**
 * Dépose un lot dans un projet, fichier par fichier.
 *
 * Trois règles, qui sont les mêmes qu'à l'atelier parce qu'il n'y a qu'un seul
 * chemin de dépôt :
 *
 *  - un échec sur un fichier n'arrête pas les autres, et il est nommé ;
 *  - un document dont le contenu est déjà dans le projet n'est pas redéposé :
 *    on rend l'identifiant de celui qui y est ;
 *  - l'examen enrichit le dépôt, il ne le conditionne pas — un PDF que pdf.js
 *    refuse d'ouvrir entre quand même, sans qu'on prétende savoir ce qu'il est.
 *
 * @param {File[]} files
 * @param {{projectId: string, folderId: string|null,
 *          onProgress?: (progress: {done: number, total: number, name: string}) => void}} options
 * @returns {Promise<object[]>} un résultat par fichier, dans l'ordre du lot
 */
export async function depositBatch(files = [], { projectId, folderId = null, onProgress = null } = {}) {
  const { accepted, rejected } = planBatch(files);
  const results = [...rejected];
  if (accepted.length === 0 || !projectId) return results;

  const { currentUserId, fetchDocumentIdentities, insertDocumentRow, uploadDocumentToStorage } = await writer();

  const known = await fetchDocumentIdentities(projectId).catch(() => []);
  const createdBy = await currentUserId().catch(() => null);
  // Un lot, un emplacement de stockage : deux dépôts du même nom ne s'écrasent pas.
  const scope = `upload-${Date.now().toString(36)}`;

  let done = 0;
  for (const file of accepted) {
    onProgress?.({ done, total: accepted.length, name: file.name });

    try {
      const inspection = await inspectFile(file);
      const related = relateToKnown(inspection, known);

      if (related?.verdict === IDENTITY.DUPLICATE) {
        results.push({
          file,
          entry: ENTRY.DUPLICATE,
          documentId: related.document.id,
          reason: `Même contenu que « ${related.document.filename} » : ce document est déjà dans le projet.`
        });
        done += 1;
        continue;
      }

      const storage = await uploadDocumentToStorage(file, { projectId, scope });
      const row = await insertDocumentRow(
        {
          project_id: projectId,
          folder_id: folderId,
          created_by: createdBy,
          filename: file.name,
          original_filename: file.name,
          mime_type: file.type || "application/octet-stream",
          storage_bucket: storage.storage_bucket,
          storage_path: storage.storage_path,
          file_size_bytes: file.size || null,
          upload_status: "uploaded",
          document_kind: "source_pdf",
          ...toDocumentColumns(inspection, related)
        },
        "id,content_fingerprint,declared_reference,original_filename"
      );

      if (row?.id) {
        // Le fichier suivant doit pouvoir se comparer à celui-ci : deux copies du
        // même document dans un même lot n'entrent qu'une fois.
        known.push(row);
        results.push({ file, entry: ENTRY.DEPOSITED, documentId: row.id });
      } else {
        results.push({ file, entry: ENTRY.FAILED, reason: "La base n'a pas rendu de document." });
      }
    } catch (error) {
      results.push({
        file,
        entry: ENTRY.FAILED,
        reason: String(error?.message || error || "Échec du dépôt.")
      });
    }

    done += 1;
  }

  onProgress?.({ done, total: accepted.length, name: "" });
  return results;
}
