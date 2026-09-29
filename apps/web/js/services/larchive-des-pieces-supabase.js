/**
 * L'archive des pièces, côté base.
 *
 * ## Deux écritures pour une pièce, et l'ordre compte
 *
 * Les octets d'abord, la ligne de registre ensuite. Dans cet ordre, une panne
 * au milieu laisse un objet que **rien ne nomme** — récupérable : le prochain
 * versement le réécrira au même endroit, et la ligne suivra.
 *
 * Dans l'autre ordre, elle laisserait une ligne de registre qui promet des
 * octets absents : l'écran afficherait une pièce qui ne s'ouvre pas, et rien
 * ne dirait pourquoi.
 *
 * ## Ce qui échoue se dit
 *
 * Une pièce refusée ne fait pas échouer les autres, et elle est comptée. Un
 * versement de cent pièces qui s'arrête à la troisième sans le dire est pire
 * qu'un versement qui n'a pas eu lieu.
 */

import { supabase } from "../../assets/js/auth.js";
import {
  AU_PLUS, CASIER, ceQuiResteAVerser, cheminDeLaPiece, lesPiecesArchivees, ligneDuRegistre
} from "./larchive-des-pieces.js";

const REGISTRE = "pieces_archivees";

/**
 * Parmi **celles-ci**, lesquelles l'archive porte-t-elle déjà ?
 *
 * ## La question qu'on ne pose plus, et pourquoi
 *
 * On demandait « que contient l'archive ? », d'un coup. Or **Supabase plafonne
 * toute réponse à mille lignes, en silence** : au-delà, l'ensemble rendu
 * cessait d'être celui de l'archive, le dédoublonnage ne voyait plus ce qui
 * était là, et **tout se reversait**. Le versement aurait dit « réussi » et
 * coûté deux fois, sans un mot.
 *
 * La bonne question est bornée, et elle l'est par nature : on ne demande jamais
 * plus que ce qu'on s'apprête à verser. Elle tient donc quelle que soit la
 * taille de l'archive — cent pièces ou cent mille.
 *
 * On interroge le **registre** et non le casier : une table répond en une
 * requête là où lister des objets demande de les parcourir par pages.
 *
 * `null` quand la lecture échoue — et non un ensemble vide, qui ferait croire
 * que l'archive est neuve et reverserait tout (règle 5).
 *
 * @param {Iterable<string>} empreintes celles qu'on s'apprête à verser
 * @returns {Promise<Set<string>|null>}
 */
export async function lesEmpreintesConnues(empreintes = []) {
  const demandees = [...new Set([...(empreintes ?? [])].map((une) => String(une ?? "")).filter(Boolean))];
  // Rien à demander : la réponse est connue sans aller la chercher.
  if (!demandees.length) return new Set();

  const { data, error } = await supabase.from(REGISTRE)
    .select("empreinte")
    .in("empreinte", demandees);
  if (error) return null;
  return new Set((Array.isArray(data) ? data : []).map((une) => String(une?.empreinte ?? "")));
}

/**
 * Verser des pièces dans l'archive.
 *
 * @param {object[]} pieces avec `empreinte`, `octets`, `nom`, `type`, `taille`
 * @returns {Promise<{versees: number, dejaLa: number, refusees: number,
 *   sansEmpreinte: number, lu: boolean}>}
 */
export async function verserLesPieces(pieces = []) {
  const connues = await lesEmpreintesConnues(
    (Array.isArray(pieces) ? pieces : []).map((une) => une?.empreinte));
  // **On ne verse pas à l'aveugle.** Sans savoir ce qui est déjà là, tout
  // remonterait — cinq mégaoctets par plan, cent fois par archive.
  if (!connues) {
    return { versees: 0, dejaLa: 0, refusees: 0, sansEmpreinte: 0, lu: false };
  }

  const { aVerser, dejaLa, sansEmpreinte } = ceQuiResteAVerser(pieces, connues);
  let versees = 0;
  let refusees = 0;

  for (const une of aVerser) {
    const { error } = await supabase.storage.from(CASIER).upload(une.chemin, une.octets, {
      contentType: une.type || "application/octet-stream",
      // **Jamais d'écrasement.** Un objet nommé par son contenu ne change pas ;
      // si le nom est pris, les octets sont déjà les bons.
      upsert: false
    });

    // « Déjà présent » n'est pas un échec : c'est un objet dont le registre
    // n'avait pas gardé la ligne, et la ligne suit juste après.
    const dejaDansLeCasier = error && /exists|duplicate/i.test(String(error?.message ?? ""));
    if (error && !dejaDansLeCasier) {
      refusees += 1;
      continue;
    }

    const { error: erreurDuRegistre } = await supabase.from(REGISTRE).insert(ligneDuRegistre(une));
    // Une ligne déjà écrite par un versement précédent : la pièce est en place.
    const dejaAuRegistre = erreurDuRegistre
      && /duplicate|conflict/i.test(String(erreurDuRegistre?.message ?? ""));
    if (erreurDuRegistre && !dejaAuRegistre) {
      refusees += 1;
      continue;
    }

    versees += 1;
  }

  return { versees, dejaLa, refusees, sansEmpreinte, lu: true };
}

/**
 * Ce que l'archive porte, prêt à être dessiné.
 *
 * `null` quand la lecture échoue : une liste vide dirait « l'archive est
 * vide », ce qui est une information, et fausse.
 */
export async function lireLArchive() {
  const { data, error } = await supabase
    .from(REGISTRE)
    .select("empreinte,nom,type_mime,taille,versee_le")
    .order("versee_le", { ascending: false })
    // **Une de plus que ce qu'on montre.** C'est ce qui permet de savoir qu'il
    // y en a davantage sans compter toute la table — et donc de le dire.
    .limit(AU_PLUS + 1);

  if (error) return null;
  return lesPiecesArchivees(data);
}

/**
 * Les octets d'une pièce, pour l'afficher.
 *
 * `null` quand ils ne viennent pas — l'écran le dit, plutôt que d'ouvrir un
 * lecteur vide.
 */
export async function octetsDeLaPiece(empreinte) {
  const chemin = cheminDeLaPiece(empreinte);
  if (!chemin) return null;

  const { data, error } = await supabase.storage.from(CASIER).download(chemin);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
