/**
 * Le dépouillement, pour de vrai : **lire, dédoublonner, ranger**.
 *
 * ## Ce qui est à lui, et ce qui lui est prêté
 *
 * Il ne décide rien de ce qui se décide ailleurs. Le partage du dépôt, les
 * destinations, le dédoublonnage et les phrases viennent de
 * `le-depouillement.js` ; le découpage en lots, le journal et l'avancement du
 * `le-convoi.js` ; la lecture des `.msg`, des `.eml` et des `.zip` de leurs
 * lecteurs respectifs. Ce module met tout cela dans l'ordre et parle au réseau.
 *
 * ## Par lots, et il relâche
 *
 * Deux cents mails avec leurs pièces font des centaines de mégaoctets. Un lot
 * se lit, se dépose, et **ses octets sont relâchés** ; le lot suivant repart sur
 * une mémoire vide. Ce n'est pas une optimisation : sans cela, l'onglet meurt
 * tard, après vingt minutes, sans avoir rien déposé (`le-convoi.js`).
 *
 * ## Les pièces d'abord, le message ensuite
 *
 * Une panne entre les deux laisse alors des pièces sans leur message : elles se
 * retrouveront par leur empreinte à la reprise, et rien n'est perdu. Dans
 * l'autre ordre, elle laisserait un message **dont les pièces ne seront jamais
 * redemandées**, puisque le message, lui, sera reconnu comme déjà là.
 *
 * ## L'empreinte des octets, et pourquoi pas celle qui existait
 *
 * Un mail et une pièce s'identifient par leurs octets. `sha256_hash` porte un
 * index unique **global** — deux chantiers ne pourraient pas recevoir le même
 * plan —, et `content_fingerprint` est l'empreinte du *texte* d'un document.
 * D'où `empreinte_des_octets` (`migrations/202610230003_...`), et une question
 * **bornée** au lot qu'on s'apprête à déposer : demander « que contient ce
 * projet ? » se fait plafonner à mille lignes en silence.
 *
 * ## Rien n'entre dans la mémoire
 *
 * Des fichiers sont rangés dans un dossier privé. Aucun constat, aucune
 * assertion, aucune proposition : ce qui entre un jour dans la mémoire y entrera
 * par une proposition signée, comme tout le reste (règle 1).
 */

import { currentUserId, insertDocumentRow, uploadDocumentToStorage } from "./document-deposit.js";
import { creuserLesDossiers } from "./creuser-les-dossiers.js";
import {
  DOSSIER_DES_MAILS, DOSSIER_DES_PIECES, EXTENSION_DUN_MAIL, NATURE_DUNE_PIECE,
  NATURE_DUN_MAIL, leNomDeLaPieceDeposee, leNomDuMailDepose
} from "./le-dossier-des-mails.js";
import {
  LES_DESTINATIONS, lePartageDuDepot, lesPiecesDistinctes
} from "./le-depouillement.js";
import {
  PAR_LOT, SORT, enLots, noter, noterLesPieces, noterUnFichierLu, unJournalNeuf
} from "./le-convoi.js";
import { lesEmpreintes } from "./le-dedoublonnage.js";
import { LE_TYPE_DUN_MESSAGE, lesMessagesDunFichier } from "./les-messages-dun-fichier.js";
import { sha256HexBytes } from "../utils/sha256.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Au plus, par question à la base. Le plafond silencieux est à mille. */
export const AU_PLUS = 200;

/**
 * Ce que ce projet connaît déjà de ces octets-là.
 *
 * Bornée au lot, et **par tranches** : `.in()` sur deux cents valeurs tient
 * dans une adresse, sur dix mille non.
 *
 * @returns {Promise<Set<string>|null>} `null` quand la base n'a pas répondu
 */
export async function lesOctetsConnus(projectId, empreintes = []) {
  const voulues = [...new Set((empreintes ?? []).map(texte).filter(Boolean))];
  if (!texte(projectId) || !voulues.length) return new Set();

  const { supabase } = await import("../../assets/js/auth.js");
  const connues = new Set();

  for (let ou = 0; ou < voulues.length; ou += AU_PLUS) {
    const tranche = voulues.slice(ou, ou + AU_PLUS);
    const { data, error } = await supabase
      .from("documents")
      .select("empreinte_des_octets")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .in("empreinte_des_octets", tranche);

    // **Ne pas savoir n'est pas savoir que non.** Une lecture ratée qui rendrait
    // un ensemble vide ferait tout redéposer en double (règle 5).
    if (error) return null;
    for (const ligne of data ?? []) connues.add(texte(ligne?.empreinte_des_octets));
  }

  return connues;
}

/** Les deux dossiers, creusés une seule fois, privés tous les deux. */
async function lesDeuxDossiers(projectId) {
  const { createDocumentFolder, listDocumentFolderChildren } =
    await import("./project-supabase-sync.js");
  // **Privé à chaque étage.** Un sous-dossier ordinaire dans un dossier privé
  // serait visible de l'équipe comme dossier, et ses documents avec lui : la
  // politique de lecture regarde le dossier du document, pas son grand-parent.
  const portes = {
    listerLesEnfants: listDocumentFolderChildren,
    creerLeDossier: (projet, parent, nom) =>
      createDocumentFolder(projet, parent, nom, { prive: true })
  };

  const ou = {};
  for (const destination of LES_DESTINATIONS) {
    const creuse = await creuserLesDossiers({
      projectId, depuis: null, dossiers: destination.chemin, portes
    });
    if (!creuse.trouve) return { trouve: false, motif: creuse.motif, ou: null };
    ou[destination.cle] = creuse.id;
  }

  return { trouve: true, motif: "", ou };
}

/** Les noms déjà pris dans un dossier, pour ne pas écraser un homonyme. */
async function nomsDejaDans(projectId, folderId) {
  const { listDocumentDirectory } = await import("./project-supabase-sync.js");
  const contenu = await listDocumentDirectory(projectId, folderId || null);
  return (contenu?.files ?? []).map((un) =>
    texte(un?.name ?? un?.original_filename ?? un?.filename));
}

/** Ranger un fichier, et rendre sa ligne. */
async function ranger(octets, {
  projectId, folderId, nom, type, nature, deposant, empreinte
}) {
  const fichier = new File([octets], nom, { type });
  const stockage = await uploadDocumentToStorage(fichier, {
    projectId, scope: `${folderId || "racine"}/mails`
  });
  return insertDocumentRow({
    project_id: projectId,
    folder_id: folderId,
    filename: nom,
    original_filename: nom,
    mime_type: type,
    document_kind: nature,
    upload_status: "uploaded",
    storage_bucket: stockage.storage_bucket,
    storage_path: stockage.storage_path,
    file_size_bytes: fichier.size || 0,
    empreinte_des_octets: empreinte || null,
    deposant
  }, "id,project_id,folder_id,filename,document_kind");
}

/**
 * Dépouiller un dépôt.
 *
 * @param {File[]} fichiers ce que l'utilisateur a choisi
 * @param {{projectId: string, avance?: (journal: object) => void}} ou
 * @returns {Promise<object>} le journal, tel que `le-convoi.js` le tient
 */
export async function depouiller(fichiers = [], { projectId = "", avance = null } = {}) {
  const { porteurs } = lePartageDuDepot(fichiers);
  let journal = { ...unJournalNeuf(), fichiers: porteurs.length };
  const dire = () => { if (typeof avance === "function") avance(journal); };

  if (!texte(projectId)) return { ...journal, fini: true, arrete: "aucun projet" };
  if (!porteurs.length) return { ...journal, fini: true };

  // **Sans déposant connu, on ne range rien.** La politique de lecture cache un
  // document quand son dossier est privé *et* que son déposant n'est pas vide :
  // un déposant absent publierait deux cents mails de correspondance, en
  // silence, et le dépôt se dirait réussi.
  const deposant = await currentUserId().catch(() => null);
  if (!deposant) {
    return { ...journal, fini: true, arrete: "votre session n'a pas répondu : rien n'a été rangé" };
  }

  const dossiers = await lesDeuxDossiers(projectId);
  if (!dossiers.trouve) return { ...journal, fini: true, arrete: dossiers.motif };

  // **Où c'est allé fait partie du compte rendu.** Sans cela, l'écran annonce
  // « 187 messages versés » et laisse chercher où — le dossier a pu être créé à
  // l'instant, et rien à l'écran ne l'a encore montré.
  journal = { ...journal, ou: dossiers.ou };

  const lots = enLots(porteurs, PAR_LOT);
  journal = { ...journal, lots: lots.length };
  dire();

  for (const lot of lots) {
    // Lus d'abord, tout le lot : les empreintes se demandent en une fois, et
    // c'est ce qui rend la question bornée.
    const lus = [];
    for (const fichier of lot) {
      const { messages, motif } = await lesMessagesDunFichier(fichier);
      // Ouvert ou non, ce fichier-là est traité : c'est ce que l'avancement
      // compte, et c'est le seul dénominateur qu'on connaisse d'avance.
      journal = noterUnFichierLu(journal);
      if (!messages.length) {
        journal = noter(journal, fichier.name, SORT.ILLISIBLE, motif);
        dire();
        continue;
      }
      dire();
      lus.push({ fichier, messages });
    }

    // Les empreintes, une seule fois, sur les octets qu'on a déjà en main.
    const aRanger = [];
    for (const { fichier, messages } of lus) {
      for (const message of messages) {
        if (!message.octets) {
          journal = noter(journal, message.nom, SORT.ILLISIBLE,
            "entrée d'archive illisible");
          continue;
        }
        const empreintes = await lesEmpreintes(message.lu);
        aRanger.push({
          fichier,
          message,
          empreinte: (await sha256HexBytes(message.octets)) ?? "",
          pieces: (message.lu?.pieces ?? []).map((une, rang) => ({
            octets: une.octets,
            nom: une.nom,
            type: une.type,
            taille: une.taille,
            empreinte: empreintes.pieces[rang] ?? ""
          }))
        });
      }
    }
    dire();

    const { distinctes } = lesPiecesDistinctes(aRanger.flatMap((un) => un.pieces));
    const connues = await lesOctetsConnus(projectId, [
      ...aRanger.map((un) => un.empreinte),
      ...distinctes.map((une) => une.empreinte)
    ]);
    if (connues === null) {
      return { ...journal, fini: true, arrete: "la base n'a pas répondu : le lot n'a pas été rangé" };
    }

    // **Les pièces d'abord.** Une panne ensuite laisse des pièces sans message,
    // qui se retrouveront par leur empreinte ; dans l'autre ordre, elle
    // laisserait un message reconnu « déjà là » dont les pièces ne seraient
    // jamais redemandées.
    const nomsDesPieces = await nomsDejaDans(projectId, dossiers.ou.pieces);
    let versees = 0;
    let piecesDejaLa = 0;
    for (const piece of distinctes) {
      if (piece.empreinte && connues.has(piece.empreinte)) { piecesDejaLa += 1; continue; }
      const nom = leNomDeLaPieceDeposee(piece.nom, { dejaLa: nomsDesPieces });
      nomsDesPieces.push(nom);
      try {
        await ranger(piece.octets, {
          projectId, folderId: dossiers.ou.pieces, nom,
          type: piece.type || "application/octet-stream",
          nature: NATURE_DUNE_PIECE, deposant, empreinte: piece.empreinte
        });
        if (piece.empreinte) connues.add(piece.empreinte);
        versees += 1;
      } catch {
        // Une pièce qui résiste ne fait pas tomber son message : le propos vaut
        // plus que le plan, et le plan se retrouvera au dépôt suivant.
        journal = noter(journal, piece.nom, SORT.REFUSE, "pièce jointe non rangée");
      }
    }
    journal = noterLesPieces(journal, { versees, dejaLa: piecesDejaLa });
    dire();

    const nomsDesMails = await nomsDejaDans(projectId, dossiers.ou.messages);
    for (const un of aRanger) {
      if (un.empreinte && connues.has(un.empreinte)) {
        journal = noter(journal, un.message.nom, SORT.DEJA_LA);
        dire();
        continue;
      }
      const nom = leNomDuMailDepose(un.message.lu, {
        dejaLa: nomsDesMails, extension: un.message.extension
      });
      nomsDesMails.push(nom);
      try {
        await ranger(un.message.octets, {
          projectId, folderId: dossiers.ou.messages, nom,
          type: LE_TYPE_DUN_MESSAGE[un.message.extension] || "application/octet-stream",
          nature: NATURE_DUN_MAIL, deposant, empreinte: un.empreinte
        });
        if (un.empreinte) connues.add(un.empreinte);
        journal = noter(journal, un.message.nom, SORT.VERSE);
      } catch (erreur) {
        journal = noter(journal, un.message.nom, SORT.REFUSE, texte(erreur?.message));
      }
      dire();
    }

    // Le lot relâche ses octets : rien de ce qu'il a lu ne reste accroché.
    aRanger.length = 0;
    lus.length = 0;
  }

  journal = { ...journal, fini: true };
  dire();
  return journal;
}
