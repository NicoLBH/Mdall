/**
 * Le dépouillement, mis en ordre : **lire, dédoublonner, ranger**.
 *
 * ## Il ne parle plus au réseau — il reçoit des portes
 *
 * Ce module faisait les deux : l'ordre des gestes et les appels à Supabase. Il
 * ne pouvait donc tourner que dans un navigateur, et **aucune épreuve ne l'a
 * jamais exécuté** — le module qu'il importait ouvre une session au chargement.
 * Tout ce qu'on savait de lui, on le savait en le lisant.
 *
 * Depuis que le dépôt se fait en file, c'est le serveur qui range, pas l'onglet.
 * Deux copies de cet ordre-là — une par navigateur, une par fonction de bord —
 * auraient rangé deux mails différemment sans que rien ne le dise (règle 4). Il
 * n'y en a donc qu'une, elle reçoit ses accès par `portes`, et elle s'exécute
 * enfin : en épreuve avec des portes de banc, au serveur avec celles de
 * Supabase.
 *
 * ## Ce qui est à lui, et ce qui lui est prêté
 *
 * Il ne décide rien de ce qui se décide ailleurs. Le partage du dépôt, les
 * destinations, le dédoublonnage et les phrases viennent de
 * `le-depouillement.js` ; le découpage en lots, le journal et l'avancement de
 * `le-convoi.js` ; la lecture des `.msg`, des `.eml` et des `.zip` de leurs
 * lecteurs respectifs. Ce module met tout cela dans l'ordre.
 *
 * ## Par lots, et il relâche
 *
 * Deux cents mails avec leurs pièces font des centaines de mégaoctets. Un lot
 * se lit, se dépose, et **ses octets sont relâchés** ; le lot suivant repart sur
 * une mémoire vide. Ce n'est pas une optimisation : sans cela, le travail meurt
 * tard, après vingt minutes, sans avoir rien déposé (`le-convoi.js`).
 *
 * ## Les pièces d'abord, le message ensuite
 *
 * Une panne entre les deux laisse des pièces sans leur message : elles se
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

import { creuserLesDossiers } from "./creuser-les-dossiers.js";
import {
  DOSSIER_DES_MAILS, DOSSIER_DES_PIECES, EXTENSION_DUN_MAIL, NATURE_DUNE_PIECE,
  NATURE_DUN_MAIL, leNomDeLaPieceDeposee, leNomDuMailDepose
} from "./le-dossier-des-mails.js";
import {
  LES_DESTINATIONS, lePartageDuDepot, lesPiecesDistinctes
} from "./le-depouillement.js";
import {
  PAR_LOT, SORT, enLots, noter, noterLesPieces, noterUnFichierLu, quatreALaFois,
  unJournalNeuf
} from "./le-convoi.js";
import { lesEmpreintes } from "./le-dedoublonnage.js";
import { lindexDunMail } from "./la-ligne-dun-mail.js";
import { LE_TYPE_DUN_MESSAGE, lesMessagesDunFichier } from "./les-messages-dun-fichier.js";
import { sha256HexBytes } from "../utils/sha256.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Au plus, par question à la base. Le plafond silencieux est à mille. */
export const AU_PLUS = 200;

/**
 * Ce dont ce module a besoin pour parler à la base.
 *
 * Six gestes, pas un de plus. Les nommer ici plutôt que de laisser chacun
 * deviner ce qu'il doit fournir est ce qui permet au banc d'en poser de faux
 * sans rien manquer.
 *
 * @typedef {object} PortesDuVersement
 * @property {(projectId: string, parentId: string|null) => Promise<object[]>} listerLesEnfants
 * @property {(projectId: string, parentId: string|null, nom: string) => Promise<object>} creerLeDossier
 * @property {(projectId: string, folderId: string|null) => Promise<string[]>} lesNomsDejaLa
 * @property {(projectId: string, empreintes: string[]) => Promise<Set<string>|null>} lesOctetsConnus
 * @property {(octets: Uint8Array, ou: object) => Promise<object>} ranger
 * @property {(messageId: string, piecesIds: string[]) => Promise<void>} marquerLaProvenance
 */

/** Les deux dossiers, creusés une seule fois, privés tous les deux. */
async function lesDeuxDossiers(projectId, portes) {
  // **Privé à chaque étage.** Un sous-dossier ordinaire dans un dossier privé
  // serait visible de l'équipe comme dossier, et ses documents avec lui : la
  // politique de lecture regarde le dossier du document, pas son grand-parent.
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

/**
 * Verser un dépôt de messagerie dans un projet.
 *
 * Les types sont écrits : sans eux, les valeurs par défaut font conclure que
 * `portes` **est** `null`, et la fonction de bord ne compile plus (Deno le dit,
 * l'éditeur aussi, et tous les deux ont raison).
 *
 * @param {File[]} fichiers ce qui a été déposé
 * @param {object} ou
 * @param {string} [ou.projectId] le projet en base
 * @param {string} [ou.deposant] qui dépose — sans lui, rien n'est rangé
 * @param {PortesDuVersement|null} [ou.portes] les six accès à la base
 * @param {((journal: object) => void)|null} [ou.avance] dit où l'on en est
 * @returns {Promise<object>} le journal, tel que `le-convoi.js` le tient
 */
export async function verser(fichiers = [], {
  projectId = "", deposant = "", portes = /** @type {PortesDuVersement|null} */ (null),
  avance = /** @type {((journal: object) => void)|null} */ (null)
} = {}) {
  const { porteurs } = lePartageDuDepot(fichiers);
  let journal = { ...unJournalNeuf(), fichiers: porteurs.length };
  const dire = () => { if (typeof avance === "function") avance(journal); };

  if (!texte(projectId)) return { ...journal, fini: true, arrete: "aucun projet" };
  if (!portes) return { ...journal, fini: true, arrete: "aucun accès à la base" };
  if (!porteurs.length) return { ...journal, fini: true };

  // **Sans déposant connu, on ne range rien.** La politique de lecture cache un
  // document quand son dossier est privé *et* que son déposant n'est pas vide :
  // un déposant absent publierait deux cents mails de correspondance, en
  // silence, et le dépôt se dirait réussi.
  if (!texte(deposant)) {
    return { ...journal, fini: true, arrete: "le déposant n'est pas connu : rien n'a été rangé" };
  }

  const dossiers = await lesDeuxDossiers(projectId, portes);
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
            // **Une image du corps n'est pas un document.** Une signature, un
            // bandeau : la galerie les écartera, et il faut que la pièce le
            // sache d'elle-même plutôt qu'on le redevine à la lecture.
            dansLeTexte: une.dansLeTexte === true,
            empreinte: empreintes.pieces[rang] ?? "",
            // De quel message elle vient. Le rang suffit : on ne connaîtra
            // l'identifiant du message qu'une fois sa ligne écrite, et elle
            // s'écrit après les pièces (voir plus bas pourquoi).
            deQuelMessage: aRanger.length
          }))
        });
      }
    }
    dire();

    const { distinctes } = lesPiecesDistinctes(aRanger.flatMap((un) => un.pieces));
    const connues = await portes.lesOctetsConnus(projectId, [
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
    const nomsDesPieces = [...(await portes.lesNomsDejaLa(projectId, dossiers.ou.pieces) ?? [])];
    let versees = 0;
    let piecesDejaLa = 0;

    // **Les noms se réservent d'abord, les octets partent ensuite.** Nommer au
    // moment de l'envoi, à quatre en même temps, donnerait deux fois le même
    // nom à deux pièces homonymes : chacune verrait une liste d'où l'autre est
    // absente.
    const aEnvoyer = [];
    for (const piece of distinctes) {
      if (piece.empreinte && connues.has(piece.empreinte)) { piecesDejaLa += 1; continue; }
      const nom = leNomDeLaPieceDeposee(piece.nom, { dejaLa: nomsDesPieces });
      nomsDesPieces.push(nom);
      aEnvoyer.push({ piece, nom });
      if (piece.empreinte) connues.add(piece.empreinte);
    }

    // **Quatre à la fois.** Un à la fois était le coût réel de l'attente :
    // vingt mails et leurs pièces font une centaine d'envois, et enchaînés
    // chacun paie son aller-retour.
    const sorts = await quatreALaFois(aEnvoyer.map(({ piece, nom }) => async () => {
      try {
        const ligne = await portes.ranger(piece.octets, {
          projectId, folderId: dossiers.ou.pieces, nom,
          type: piece.type || "application/octet-stream",
          nature: NATURE_DUNE_PIECE, deposant, empreinte: piece.empreinte,
          dansLeTexte: piece.dansLeTexte === true
        });
        return {
          ok: true, id: String(ligne?.id || ""),
          deQuelMessage: piece.deQuelMessage
        };
      } catch {
        return { ok: false, nom: piece.nom };
      }
    }));

    // Quelles pièces appartiennent à quel message, pour les marquer une fois sa
    // ligne écrite.
    const piecesParMessage = new Map();
    for (const sort of sorts) {
      if (!sort.ok || !sort.id) continue;
      const rang = sort.deQuelMessage;
      if (!piecesParMessage.has(rang)) piecesParMessage.set(rang, []);
      piecesParMessage.get(rang).push(sort.id);
    }

    for (const sort of sorts) {
      if (sort.ok) { versees += 1; continue; }
      // Une pièce qui résiste ne fait pas tomber son message : le propos vaut
      // plus que le plan, et le plan se retrouvera au dépôt suivant.
      journal = noter(journal, sort.nom, SORT.REFUSE, "pièce jointe non rangée");
    }
    journal = noterLesPieces(journal, { versees, dejaLa: piecesDejaLa });
    dire();

    const nomsDesMails = [...(await portes.lesNomsDejaLa(projectId, dossiers.ou.messages) ?? [])];
    for (const [rang, un] of aRanger.entries()) {
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
        const ligne = await portes.ranger(un.message.octets, {
          projectId, folderId: dossiers.ou.messages, nom,
          type: LE_TYPE_DUN_MESSAGE[un.message.extension] || "application/octet-stream",
          nature: NATURE_DUN_MAIL, deposant, empreinte: un.empreinte,
          index: lindexDunMail(un.message.lu)
        });
        if (un.empreinte) connues.add(un.empreinte);
        // **La provenance se marque ici, et pas avant.** Les pièces partent en
        // premier — une panne entre les deux laisse des pièces retrouvables par
        // leur empreinte, l'ordre inverse laisserait un message reconnu « déjà
        // là » dont les pièces ne seraient jamais redemandées. L'identifiant du
        // message n'existe donc qu'à cet instant.
        await portes.marquerLaProvenance(ligne?.id, piecesParMessage.get(rang) ?? []);
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
