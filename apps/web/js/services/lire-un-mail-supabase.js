/**
 * Ouvrir un mail : **le message, et l'échange autour**.
 *
 * ## Le fil, et pas le seul message
 *
 * Comme dans une messagerie. Celui qui ouvre une réponse a besoin de la
 * question : la montrer seule obligerait à chercher dans deux cents lignes le
 * message d'avant, en se fiant à un objet qu'on n'a plus sous les yeux.
 *
 * Les messages d'un même échange se retrouvent par `mail_fil` — l'objet
 * débarrassé de ses « RE : », écrit au dépôt. Aucune relecture n'est nécessaire
 * pour les **trouver** ; il faut les rapatrier pour les **lire**, et c'est
 * pourquoi c'est borné.
 *
 * ## Borné, et le plafond se dit
 *
 * Un échange de cinquante messages existe. Rapatrier cinquante fichiers pour en
 * lire un ferait attendre ; on en prend les plus récents, et l'écran dit qu'il
 * en manque (règle 5).
 */

import { downloadDocumentFile } from "./document-deposit.js";
import { deplier } from "./la-correspondance-du-projet-supabase.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Au plus, par échange ouvert.
 *
 * **Vingt**, parce qu'un fil de chantier en dépasse rarement dix, et qu'au-delà
 * ce n'est plus une conversation mais un dossier — qui se lit dans la liste,
 * pas dans une page.
 */
export const AU_PLUS_PAR_FIL = 20;

/** Les documents d'un même échange, du plus ancien au plus récent. */
export function lesFreresDuFil(documents = [], fil = "") {
  const cherche = texte(fil);
  if (!cherche) return [];
  return (Array.isArray(documents) ? documents : [])
    .filter((un) => texte(un?.mailFil) === cherche);
}

/** Rapatrier un document et le déplier. `null` quand il n'a pas pu être lu. */
async function lire(document) {
  try {
    const fichier = await downloadDocumentFile({
      storage_bucket: document.storageBucket,
      storage_path: document.storagePath,
      original_filename: document.name,
      mime_type: document.mimeType
    });
    return deplier(new Uint8Array(await fichier.arrayBuffer()), document.name);
  } catch {
    return null;
  }
}

/**
 * L'échange auquel ce mail appartient, lu.
 *
 * @param {object} document la ligne du mail qu'on ouvre
 * @param {object[]} voisins les documents du même dossier, déjà chargés
 * @returns {Promise<{messages: object[], demande: object|null, lus: number, tous: number, illisibles: number}>}
 */
export async function lireLeFil(document, voisins = []) {
  const freres = lesFreresDuFil(voisins, document?.mailFil);
  // **Le message demandé d'abord, quoi qu'il arrive.** Sans lui, ouvrir un mail
  // pourrait n'afficher que ses voisins — et c'est celui-là qu'on a cliqué.
  const aLire = [document, ...freres.filter((un) => String(un?.id) !== String(document?.id))]
    .slice(0, AU_PLUS_PAR_FIL);

  const lus = await Promise.all(aLire.map(lire));
  const messages = lus.filter(Boolean);

  return {
    messages,
    demande: lus[0] ?? null,
    lus: messages.length,
    tous: Math.max(freres.length, 1),
    illisibles: lus.length - messages.length
  };
}
