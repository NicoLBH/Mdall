/**
 * Relire la correspondance déposée d'un projet.
 *
 * ## Un aller-retour par message, et c'est pour cela qu'il y a un plafond
 *
 * Les octets d'un mail sont dans le casier, pas dans la table : rien ne
 * s'agrège, chaque message se rapatrie. La lecture est donc **bornée**
 * (`AU_PLUS_DE_MESSAGES`), et l'on demande un de plus que le plafond pour
 * pouvoir dire « il y en a davantage » — un épisode silencieusement tronqué
 * ferait croire qu'on tient toute la chronologie (règle 5).
 *
 * ## Elle ne se fait pas au chargement de l'écran
 *
 * Deux cents rapatriements ne peuvent pas partir parce qu'on a ouvert les
 * Indicateurs. C'est un geste demandé, et il est dit avant d'être fait.
 *
 * ## Elle ne garde rien
 *
 * Aucune écriture, nulle part. Ce qui est lu est déplié en mémoire, rendu à
 * l'écran, et disparaît au rechargement de la page. La porte de la mémoire reste
 * une proposition signée (règle 1).
 */

import { downloadDocumentFile } from "./document-deposit.js";
import { DOSSIER_DES_MAILS, estLeDossierDesMails } from "./le-dossier-des-mails.js";
import { AU_PLUS_DE_MESSAGES, lesMessagesDeposes } from "./la-correspondance-du-projet.js";
import { unMsgDeplie } from "./un-msg-deplie.js";
import { unMailDeplie } from "./un-mail-deplie.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le dossier des mails de ce projet, s'il existe.
 *
 * **Par `prive`, et par le nom.** Le nom seul ne suffit pas — on peut appeler
 * « Mails » un dossier ordinaire —, et `prive` seul ne suffira pas le jour où un
 * autre dossier sera privé sans porter ce nom. C'est la même règle que pour le
 * cadenas (`le-dossier-des-mails.js`).
 */
export function leDossierDesMails(dossiers = []) {
  return (Array.isArray(dossiers) ? dossiers : [])
    .find((un) => un?.prive === true && estLeDossierDesMails(un?.name)) ?? null;
}

/** Ce qu'un document déposé porte comme forme, selon son extension. */
export function deplier(octets, nom) {
  const bas = texte(nom).toLowerCase();
  if (bas.endsWith(".msg")) return unMsgDeplie(octets);
  return unMailDeplie(octets);
}

/**
 * La correspondance de ce projet, relue.
 *
 * @param {string} projectId l'identifiant de la base, pas celui de la route
 * @returns {Promise<{messages: object[], lus: number, tous: number, illisibles: number, motif: string}|null>}
 *   `null` quand la base n'a pas répondu : **ne pas savoir n'est pas savoir
 *   qu'il n'y a rien** (règle 5), et un écran qui dirait « aucun mail » serait
 *   plus faux qu'un écran qui dit « je n'ai pas pu lire ».
 */
export async function lireLaCorrespondance(projectId = "") {
  if (!texte(projectId)) return { messages: [], lus: 0, tous: 0, illisibles: 0, motif: "aucun projet" };

  try {
    const { listDocumentFolders, listDocumentDirectory } =
      await import("./project-supabase-sync.js");

    const dossier = leDossierDesMails(await listDocumentFolders(projectId));
    if (!dossier?.id) {
      return {
        messages: [], lus: 0, tous: 0, illisibles: 0,
        motif: `aucun dossier « ${DOSSIER_DES_MAILS} » dans ce projet`
      };
    }

    const contenu = await listDocumentDirectory(projectId, dossier.id);
    // **Les plus récents d'abord** : le répertoire les rend déjà dans cet ordre,
    // et c'est le bon quand il faut en laisser. Ce qu'on relit est remis dans
    // l'ordre du temps par `episodeDuneArchive`, qui s'en charge déjà.
    const tous = lesMessagesDeposes(contenu?.files ?? []);
    const aLire = tous.slice(0, AU_PLUS_DE_MESSAGES);

    const messages = [];
    let illisibles = 0;
    for (const document of aLire) {
      try {
        const fichier = await downloadDocumentFile({
          storage_bucket: document.storageBucket,
          storage_path: document.storagePath,
          original_filename: document.name,
          mime_type: document.mimeType
        });
        const lu = deplier(new Uint8Array(await fichier.arrayBuffer()), document.name);
        // Un message dont rien ne se lit se compte, il ne disparaît pas : une
        // correspondance laissée derrière soi sans qu'on le sache est pire
        // qu'une correspondance qu'on sait avoir manquée (règle 5).
        if (!texte(lu?.corps) && !texte(lu?.objet)) illisibles += 1;
        else messages.push(lu);
      } catch {
        illisibles += 1;
      }
    }

    return { messages, lus: messages.length, tous: tous.length, illisibles, motif: "" };
  } catch {
    return null;
  }
}
