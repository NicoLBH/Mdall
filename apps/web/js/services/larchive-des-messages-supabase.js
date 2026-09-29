/**
 * L'archive des messages, côté base.
 *
 * ## L'ordre des écritures, et ce qu'une panne laisse
 *
 * Les pièces d'abord (casier puis registre), le fichier du message ensuite, sa
 * ligne après, ses liens en dernier.
 *
 * Dans cet ordre, une panne au milieu laisse au pire des **octets que rien ne
 * nomme** et des liens manquants : le versement suivant reprend là où il s'est
 * arrêté, et rien n'est faux à l'écran. L'ordre inverse laisserait des lignes
 * qui promettent des fichiers absents, et des liens vers des pièces qui n'y
 * sont pas — un écran qui ment sans le savoir.
 *
 * **Les liens viennent en dernier, et c'est délibéré** : ils n'ont de sens que
 * si les deux bouts existent.
 *
 * ## Verser reste un geste, et il se raconte
 *
 * Ce qui échoue est compté, jamais tu. Un versement de cent messages qui
 * s'arrête au troisième sans le dire est pire qu'un versement qui n'a pas eu
 * lieu.
 */

import { supabase } from "../../assets/js/auth.js";
import { CASIER } from "./larchive-des-pieces.js";
import {
  AU_PLUS, avecLeursPieces, ceQuiResteAVerserDesMessages, cheminDuMessage,
  lesMessagesArchives, liensDesPieces, ligneDunMessage
} from "./larchive-des-messages.js";
import { lesPiecesArchivees } from "./larchive-des-pieces.js";

const REGISTRE = "messages_archives";
const LIENS = "pieces_des_messages";
const REGISTRE_DES_PIECES = "pieces_archivees";

/**
 * Parmi **ceux-ci**, lesquels l'archive porte-t-elle déjà ?
 *
 * La question bornée, pour la raison dite au long dans
 * `larchive-des-pieces-supabase.js` : demander « que contient l'archive ? » se
 * faisait plafonner à mille lignes **en silence**, et reversait tout au-delà.
 *
 * `null` quand la lecture échoue — et non un ensemble vide, qui ferait croire
 * que l'archive est neuve (règle 5).
 */
export async function lesMessagesConnus(empreintes = []) {
  const demandees = [...new Set([...(empreintes ?? [])].map((un) => String(un ?? "")).filter(Boolean))];
  if (!demandees.length) return new Set();

  const { data, error } = await supabase.from(REGISTRE)
    .select("empreinte")
    .in("empreinte", demandees);
  if (error) return null;
  return new Set((Array.isArray(data) ? data : []).map((un) => String(un?.empreinte ?? "")));
}

/** Une erreur qui dit seulement « c'est déjà là » n'est pas un échec. */
function dejaEcrit(erreur) {
  return Boolean(erreur) && /exists|duplicate|conflict/i.test(String(erreur?.message ?? ""));
}

/**
 * Verser des messages, leurs fichiers d'origine et leurs liens.
 *
 * Les pièces, elles, sont versées à part (`larchive-des-pieces-supabase.js`) :
 * elles ont leur propre dédoublonnage, et le même plan appartient à plusieurs
 * messages.
 *
 * @param {object[]} messages `{empreinte, octets, fichier, lu, pieces}`
 * @returns {Promise<{verses: number, dejaLa: number, refuses: number,
 *   liens: number, sansEmpreinte: number, lu: boolean}>}
 */
export async function verserLesMessages(messages = []) {
  const connus = await lesMessagesConnus(
    (Array.isArray(messages) ? messages : []).map((un) => un?.empreinte));
  // **On ne verse pas à l'aveugle.** Sans savoir ce qui est déjà là, tout
  // remonterait.
  if (!connus) {
    return { verses: 0, dejaLa: 0, refuses: 0, liens: 0, sansEmpreinte: 0, lu: false };
  }

  const { aVerser, dejaLa, sansEmpreinte } = ceQuiResteAVerserDesMessages(messages, connus);
  let verses = 0;
  let refuses = 0;
  let liens = 0;

  for (const un of aVerser) {
    // 1. Le fichier d'origine. C'est la source : sans lui, une meilleure
    //    lecture future n'aurait rien à relire.
    const chemin = cheminDuMessage(un.octetsEmpreinte);
    if (chemin) {
      const { error } = await supabase.storage.from(CASIER).upload(chemin, un.octetsDuFichier, {
        contentType: "application/vnd.ms-outlook",
        upsert: false
      });
      if (error && !dejaEcrit(error)) {
        refuses += 1;
        continue;
      }
    }

    // 2. La forme lue.
    const { error: erreurDuRegistre } = await supabase.from(REGISTRE).insert(
      ligneDunMessage(un.lu, {
        empreinte: un.empreinte, octets: un.octetsEmpreinte, fichier: un.fichier
      })
    );
    if (erreurDuRegistre && !dejaEcrit(erreurDuRegistre)) {
      refuses += 1;
      continue;
    }

    verses += 1;

    // 3. Les liens, en dernier : ils n'ont de sens que si les deux bouts sont
    //    là. Un lien refusé ne perd pas le message — il se réécrira au prochain
    //    versement, et sa clé le rend inoffensif.
    const desLiens = liensDesPieces(un.empreinte, un.pieces);
    if (!desLiens.length) continue;
    const { error: erreurDesLiens } = await supabase.from(LIENS).insert(desLiens);
    if (!erreurDesLiens || dejaEcrit(erreurDesLiens)) liens += desLiens.length;
  }

  return { verses, dejaLa, refuses, liens, sansEmpreinte, lu: true };
}

/**
 * Ce que l'archive porte, messages et pièces rattachées.
 *
 * Trois lectures, et **aucune n'est évitable** : les messages, les pièces, et
 * les liens entre les deux. Les rassembler côté base demanderait une vue ou une
 * jointure imbriquée, dont la forme se lirait moins bien que trois `select` —
 * et il en faudrait une seconde pour la liste des pièces seules.
 *
 * `null` quand la lecture des messages échoue : une liste vide dirait
 * « l'archive est vide », ce qui est une information, et fausse.
 */
export async function lireLesMessagesArchives() {
  const { data, error } = await supabase
    .from(REGISTRE)
    .select("empreinte,objet,qui_nom,qui_adresse,quand,fichier,combien_de_destinataires,corps,trous")
    // Une de plus que ce qu'on montre : c'est ce qui permet de dire qu'il y en
    // a davantage sans compter toute la table.
    .limit(AU_PLUS + 1);

  if (error) return null;

  const { messages, reste } = lesMessagesArchives(data);
  if (!messages.length) return { messages, reste };

  const cles = messages.map((un) => un.empreinte);
  const [desLiens, desPieces] = await Promise.all([
    supabase.from(LIENS).select("message,piece,nom,dans_le_texte").in("message", cles),
    supabase.from(REGISTRE_DES_PIECES).select("empreinte,nom,type_mime,taille,versee_le")
  ]);

  // Une panne sur les liens ne fait pas disparaître les messages : on les rend
  // sans leurs pièces, et l'écran dit qu'il n'en voit pas.
  return {
    messages: avecLeursPieces(
      messages,
      desLiens.error ? [] : desLiens.data,
      desPieces.error ? [] : lesPiecesArchivees(desPieces.data, Number.MAX_SAFE_INTEGER).pieces
    ),
    reste
  };
}
