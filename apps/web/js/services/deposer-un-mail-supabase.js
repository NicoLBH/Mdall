/**
 * Déposer un `.eml` dans le dossier privé des mails.
 *
 * ## Ce que ce module fait, et ce qu'il ne fait pas
 *
 * Il range. Il ne lit pas — le dépliage est pur et vit ailleurs (étapes 1 à 3)
 * —, il ne décide d'aucun accès — la garde vit dans la base —, et il ne
 * transforme rien.
 *
 * ## Le dossier d'abord, le fichier ensuite
 *
 * « Mails » est créé s'il n'existe pas, **privé**, à la racine de Fichiers.
 * Déposer d'abord et créer ensuite laisserait le mail à la racine de Documents
 * le jour où la création du dossier rate — c'est-à-dire de la correspondance
 * posée là où tout le monde regarde.
 *
 * ## Un dépôt qui rate n'efface pas ce qu'on a lu
 *
 * Le fil est déplié **avant** d'être rangé, et il s'affiche même si le
 * rangement échoue. C'est l'ordre du procédé : le dépliage ne coûte rien et ne
 * dépend de rien, le rangement demande le réseau. Les lier ferait perdre le
 * premier quand le second tombe.
 */

import { currentUserId, insertDocumentRow, uploadDocumentToStorage } from "./document-deposit.js";
import { creuserLesDossiers } from "./creuser-les-dossiers.js";
import {
  DOSSIER_DES_MAILS, EXTENSION_DUN_MAIL, NATURE_DUN_MAIL, leNomDuMailDepose
} from "./le-dossier-des-mails.js";

const TYPE_DUN_MAIL = "message/rfc822";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les portes des dossiers, telles qu'elles sont en vrai.
 *
 * Le dossier des mails se crée **privé** : c'est sa seule différence avec les
 * autres, et elle est portée par la porte plutôt que par la décision, qui reste
 * pure et vérifiable dans `creuser-les-dossiers.js`.
 */
async function portesDuDossierPrive() {
  const { createDocumentFolder, listDocumentFolderChildren } = await import("./project-supabase-sync.js");
  return {
    listerLesEnfants: listDocumentFolderChildren,
    creerLeDossier: (projectId, parent, nom) =>
      createDocumentFolder(projectId, parent, nom, { prive: true })
  };
}

async function nomsDejaDans(projectId, folderId) {
  const { listDocumentDirectory } = await import("./project-supabase-sync.js");
  const contenu = await listDocumentDirectory(projectId, folderId || null);
  return (contenu?.files ?? []).map((fichier) =>
    texte(fichier?.name ?? fichier?.original_filename ?? fichier?.filename));
}

/**
 * Ranger des mails déjà dépliés.
 *
 * @param {{octets: Uint8Array, message: object}[]} mails
 * @returns {Promise<{ranges: number, motif: string}>}
 */
export async function rangerLesMails(mails = [], { projectId = "" } = {}) {
  if (!texte(projectId)) return { ranges: 0, motif: "aucun projet" };
  if (!mails.length) return { ranges: 0, motif: "" };

  try {
    const ou = await creuserLesDossiers({
      projectId, depuis: null, dossiers: [DOSSIER_DES_MAILS], portes: await portesDuDossierPrive()
    });
    if (!ou.trouve) return { ranges: 0, motif: ou.motif };

    const qui = await currentUserId().catch(() => null);
    const dejaLa = await nomsDejaDans(projectId, ou.id);
    let ranges = 0;

    for (const mail of mails) {
      const nom = leNomDuMailDepose(mail.message, { dejaLa });
      dejaLa.push(nom);
      const fichier = new File([mail.octets], nom, { type: TYPE_DUN_MAIL });
      const stockage = await uploadDocumentToStorage(fichier, {
        projectId, scope: `${ou.id || "racine"}/mails`
      });
      const ligne = await insertDocumentRow({
        project_id: projectId,
        folder_id: ou.id,
        filename: nom,
        original_filename: nom,
        mime_type: TYPE_DUN_MAIL,
        document_kind: NATURE_DUN_MAIL,
        upload_status: "uploaded",
        storage_bucket: stockage.storage_bucket,
        storage_path: stockage.storage_path,
        file_size_bytes: fichier.size || 0,
        ...(qui ? { deposant: qui } : {})
      }, "id,project_id,folder_id,filename,document_kind");
      if (ligne?.id) ranges += 1;
    }

    return { ranges, motif: ranges === mails.length ? "" : "certains mails n'ont pas pu être rangés" };
  } catch (erreur) {
    return { ranges: 0, motif: String(erreur?.message ?? "") || "cause inconnue" };
  }
}

/** Ce qui ressemble à un mail déposable. */
export function estUnMailDepose(nom) {
  return texte(nom).toLowerCase().endsWith(EXTENSION_DUN_MAIL);
}
