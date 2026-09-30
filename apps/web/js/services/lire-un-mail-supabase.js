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
import { leFilDesMails } from "./le-fil-des-mails.js";

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

/** Rapatrier les octets d'un document. `null` quand il n'a pas pu être lu. */
async function lesOctets(document) {
  try {
    const fichier = await downloadDocumentFile({
      storage_bucket: document.storageBucket,
      storage_path: document.storagePath,
      original_filename: document.name,
      mime_type: document.mimeType
    });
    return new Uint8Array(await fichier.arrayBuffer());
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

  const octets = await Promise.all(aLire.map(lesOctets));
  const sources = octets.filter(Boolean);

  // **Le fil se construit, il ne s'empile pas.** On rendait les documents
  // dépliés les uns après les autres, corps entier compris. Or un `.msg`
  // d'Outlook porte tout l'historique dans son corps : le troisième message
  // contenait le deuxième, qui contenait le premier, et l'écran affichait le
  // même texte trois fois — sous trois expéditeurs différents.
  //
  // `leFilDesMails` fait le travail : il découpe les citations, écarte les
  // doublons, remonte les messages cités qu'aucun fichier ne porte, et range le
  // tout par les références quand les dates manquent. Il était écrit et éprouvé
  // ; il n'était appelé que par l'Atelier.
  const fil = leFilDesMails(sources);

  // Le message demandé est celui qu'on a mis en tête des sources : son rang de
  // dépôt le suit à travers le dédoublonnage et le classement.
  const demande = fil.messages.find((un) => un.depot === 0) ?? fil.messages[0] ?? null;

  return {
    messages: fil.messages,
    demande,
    ordre: fil.ordre,
    doublons: fil.doublons,
    trous: fil.trous,
    lus: sources.length,
    tous: Math.max(freres.length, 1),
    illisibles: octets.length - sources.length
  };
}
