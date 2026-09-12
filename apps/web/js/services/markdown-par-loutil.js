/**
 * Demander au serveur de refaire un document **sans modèle**.
 *
 * ## Ce que ce fichier ne sait pas, et c'est voulu
 *
 * Il ne sait pas quel outil reconstruit le document, ni où il tourne :
 * l'adresse vit au serveur (`supabase/functions/reconstituer-par-loutil`).
 * Descendue ici, elle serait lisible par quiconque ouvre les outils du
 * navigateur — et le PDF d'un chantier partirait vers une adresse visible de
 * tous.
 *
 * ## Il envoie le PDF, pas le texte
 *
 * C'est la différence avec la lecture par le modèle, et elle est toute la
 * raison d'être de cette seconde reconstitution : l'outil fait **sa propre**
 * extraction. Lui donner le texte déjà extrait reviendrait à comparer deux
 * lectures du même brouillon.
 *
 * ## Il ne coûte rien
 *
 * Aucun jeton, donc rien à déposer au compteur. Si cette reconstitution suffit,
 * l'appel au modèle disparaît — c'est ce que la comparaison sert à décider.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

/**
 * Les motifs de refus vivent dans le module pur, pas ici.
 *
 * L'écran doit pouvoir les nommer, et il ne peut pas importer ce fichier — qui
 * tire l'authentification, donc le réseau. Ils sont réexportés pour que
 * l'appelant n'ait qu'une porte à connaître, mais ils n'ont qu'un domicile
 * (règle 10).
 */
export {
  COMMENT_BRANCHER,
  PHRASES_DU_REFUS_DE_LOUTIL as PHRASES_DU_REFUS,
  REFUS_DE_LOUTIL as REFUS,
  phraseDuRefusDeLoutil as phraseDuRefus
} from "./reconstitution-markdown.js";

import { REFUS_DE_LOUTIL as REFUS } from "./reconstitution-markdown.js";

const URL_DE_LA_FONCTION = `${getSupabaseUrl()}/functions/v1/reconstituer-par-loutil`;

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Refaire un document par l'outil, une fois.
 *
 * @param {object} options
 * @param {File|Blob} options.fichier le PDF, tel qu'il a été déposé
 * @returns {Promise<{ok: true, pages: object[], outil: string}|{ok: false, motif: string}>}
 */
export async function refaireParLoutil({ fichier = null } = {}) {
  if (!fichier || !fichier.size) return { ok: false, motif: REFUS.SANS_FICHIER };

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/pdf" }),
      body: fichier
    });
  } catch {
    return { ok: false, motif: REFUS.INJOIGNABLE };
  }

  const rendu = await reponse.json().catch(() => null);

  if (!reponse.ok) {
    // Le motif du serveur d'abord : « non branché » et « injoignable » ne se
    // corrigent pas de la même façon, et les confondre ferait chercher une
    // panne là où il n'y a qu'une variable à renseigner.
    return { ok: false, motif: texte(rendu?.motif) || REFUS.REFUSE };
  }

  const pages = Array.isArray(rendu?.pages) ? rendu.pages : [];
  if (!pages.length) return { ok: false, motif: REFUS.RIEN_RENDU };

  return { ok: true, pages, outil: texte(rendu?.outil) };
}
