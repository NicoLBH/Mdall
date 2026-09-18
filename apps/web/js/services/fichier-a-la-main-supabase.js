/**
 * Écrire et relire un fichier de texte, en base.
 *
 * ## Le transport, et rien d'autre
 *
 * Ce qui décide du nom, de l'extension et des refus vit dans
 * `fichier-a-la-main.js`, qui est pur et testé. Ici il n'y a que les deux
 * allers-retours : téléverser le texte, écrire la ligne ; et relire le texte
 * d'un fichier déjà là.
 *
 * ## Le contenu vit à un seul endroit
 *
 * Dans le stockage, comme tout fichier. Le recopier sur la ligne du document
 * ferait deux vérités qui divergeraient à la première correction (règle 4) —
 * et `transcription_markdown` dit ce que le **modèle** a lu, ce qui n'est pas
 * la même chose qu'un texte écrit à la main.
 *
 * ## Une lecture qui échoue rend `null`
 *
 * Et non une chaîne vide : « ce fichier est vide » et « je n'ai pas su le lire »
 * demandent deux gestes différents (règle 5).
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import {
  currentUserId, insertDocumentRow, updateDocumentRow, uploadDocumentToStorage
} from "./document-deposit.js";
import { leFichierAEcrire, leFichierAReecrire } from "./fichier-a-la-main.js";

const SUPABASE_URL = getSupabaseUrl();

/**
 * Créer un fichier écrit à la main.
 *
 * @returns {Promise<{ecrit: boolean, document: object|null, motif: string}>}
 */
export async function ecrireLeFichier(saisi = "", {
  contenu = "", projectId = "", folderId = null, dejaLa = []
} = {}) {
  const rate = (motif) => ({ ecrit: false, document: null, motif });

  const qui = await currentUserId().catch(() => "");
  const aEcrire = leFichierAEcrire(saisi, { contenu, projectId, folderId, parQui: qui, dejaLa });
  if (!aEcrire) return rate("ce nom ne convient pas");

  try {
    // Un `File` plutôt qu'un `Blob` : le téléversement nomme l'objet de stockage
    // d'après `file.name`, et un `Blob` n'en a pas — le fichier arriverait sous
    // un nom que personne n'a choisi.
    const fichier = new File([aEcrire.contenu], aEcrire.nom, { type: aEcrire.type });
    const stockage = await uploadDocumentToStorage(fichier, {
      projectId, scope: `${folderId || "racine"}/ecrit`
    });

    const document = await insertDocumentRow({
      ...aEcrire.ligne,
      storage_bucket: stockage.storage_bucket,
      storage_path: stockage.storage_path,
      file_size_bytes: fichier.size || 0
    }, "id,project_id,folder_id,filename,original_filename,mime_type,storage_bucket,storage_path,document_kind");

    if (!document?.id) return rate("la ligne n'a pas pu être écrite");
    return { ecrit: true, document, motif: "" };
  } catch (erreur) {
    return rate(String(erreur?.message ?? "") || "cause inconnue");
  }
}

/**
 * Le texte d'un fichier déjà déposé.
 *
 * @returns {Promise<string|null>} `null` si la lecture a échoué.
 */
export async function lireLeTexteDuFichier(document = null) {
  const seau = String(document?.storageBucket ?? document?.storage_bucket ?? "").trim();
  const chemin = String(document?.storagePath ?? document?.storage_path ?? "").trim();
  if (!seau || !chemin) return null;

  try {
    const url = `${SUPABASE_URL}/storage/v1/object/${seau}/${
      chemin.split("/").map(encodeURIComponent).join("/")}`;
    const reponse = await fetch(url, {
      headers: await buildSupabaseAuthHeaders({}), cache: "no-store"
    });

    if (!reponse.ok) return null;
    return await reponse.text();
  } catch {
    return null;
  }
}

/**
 * Enregistrer un fichier qu'on vient de modifier.
 *
 * ## Le transport, et rien d'autre
 *
 * Tout ce qui se décide — le nom, le type, le chemin de stockage, ce que la
 * ligne reçoit — vit dans `leFichierAReecrire`, qui est pur et vérifié.
 *
 * ## L'ordre : le contenu d'abord, la ligne ensuite
 *
 * Si le téléversement échoue, la ligne n'a pas bougé et le fichier est tel
 * qu'il était. L'inverse — écrire la ligne puis rater le contenu — laisserait un
 * document qui pointe sur un objet qui n'existe pas.
 *
 * @returns {Promise<{enregistre: boolean, document: object|null, motif: string}>}
 */
export async function enregistrerLeFichier(document = null, {
  nom = "", contenu = "", projectId = "", folderId = null, dejaLa = []
} = {}) {
  const rate = (motif) => ({ enregistre: false, document: null, motif });

  if (!projectId) return rate("aucun projet");
  const aEcrire = leFichierAReecrire(document, {
    saisi: nom, contenu, folderId, dejaLa, quand: Date.now()
  });
  if (!aEcrire) return rate("ce nom ne convient pas");

  try {
    const fichier = new File([aEcrire.contenu], aEcrire.nom, { type: aEcrire.type });
    const stockage = await uploadDocumentToStorage(fichier, { projectId, scope: aEcrire.scope });

    const ligne = await updateDocumentRow(document.id, {
      ...aEcrire.patch,
      storage_bucket: stockage.storage_bucket,
      storage_path: stockage.storage_path,
      file_size_bytes: fichier.size || 0
    }, "id,project_id,folder_id,filename,original_filename,mime_type,storage_bucket,storage_path,document_kind");

    if (!ligne?.id) return rate("la ligne n'a pas pu être mise à jour");
    return { enregistre: true, document: ligne, motif: "" };
  } catch (erreur) {
    return rate(String(erreur?.message ?? "") || "cause inconnue");
  }
}
