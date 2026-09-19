/**
 * Demander le relevé d'un fil, et rendre ce qui a franchi la porte.
 *
 * ## Ce module ne lit rien
 *
 * Le relevé se passe entièrement au serveur
 * (`supabase/functions/relever-un-fil`). Ce module **demande** et **reçoit** :
 * il ne porte pas la consigne, il ne voit pas la clé du modèle, et il ne
 * refait pas la vérification des citations — ce qui n'a pas été cité n'est
 * jamais descendu jusqu'ici.
 *
 * ## Ce qui monte, et ce qui ne monte pas
 *
 * **Le propos de chaque message, une fois.** Pas les citations qu'il recopie
 * (étape 2), pas les messages en double (étape 3), pas les en-têtes, pas les
 * adresses des destinataires, pas les pièces jointes. Un fil de correspondance
 * privée ne monte que réduit à ce qu'on veut en relever.
 *
 * L'auteur et la date montent, eux : sans eux le modèle ne comprend pas qui
 * répond à qui. Mais on ne les lui **demande** pas en retour — ils sont déjà
 * connus, et une seconde source finirait par contredire la première (règle 4).
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { REFUS, leReleveLu, motifDuStatut, panneLue } from "./le-releve-rendu.js";

const URL_DE_LA_FONCTION = `${getSupabaseUrl()}/functions/v1/relever-un-fil`;

const texte = (valeur) => String(valeur ?? "").trim();

// **Tout ce qui se lit sans réseau vit ailleurs, et se réexporte d'ici.** Les
// appelants n'ont pas à savoir que ce module a été coupé en deux ; ce qui
// change, c'est que la moitié pure peut désormais s'éprouver (règle 12).
export { messagesAEnvoyer } from "./le-fil-des-mails.js";
export {
  PHRASES_DU_REFUS, QUE_FAIRE, REFUS, leReleveLu, motifDuStatut, panneLue, phraseDuRefus, queFaire
} from "./le-releve-rendu.js";

async function projetCourant() {
  try {
    const { resolveCurrentBackendProjectId } = await import("./project-supabase-sync.js");
    return (await resolveCurrentBackendProjectId()) || null;
  } catch {
    // Un relevé reste possible sans savoir où l'on est : sa consommation se
    // range alors hors projet plutôt que d'être attribuée au hasard.
    return null;
  }
}

/**
 * Relever un fil, une fois.
 *
 * @returns {Promise<{ok: true, prises: object[], ecartees: number,
 *   lesEcartees: object[], muets: number[]|null, oublies: number[]|null}
 *   |{ok: false, motif: string}>}
 */
export async function releverLeFil({ filId = "", messages = [] } = {}) {
  const aEnvoyer = messagesAEnvoyer(messages);
  if (!aEnvoyer.length) return { ok: false, motif: REFUS.SANS_TEXTE, panne: "", coupee: false };

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        project_id: await projetCourant(),
        fil_id: texte(filId),
        messages: aEnvoyer
      })
    });
  } catch {
    return { ok: false, motif: REFUS.INJOIGNABLE, panne: "", coupee: false };
  }

  if (!reponse.ok) {
    const refuse = await reponse.json().catch(() => null);
    return {
      ok: false,
      motif: motifDuStatut(reponse.status),
      // Ce que le serveur a nommé. Vide quand il n'a rien nommé : on n'invente
      // pas une explication vraisemblable (règle 5).
      panne: panneLue(refuse, reponse.status),
      coupee: Boolean(refuse?.coupee)
    };
  }

  // **La lecture du rendu vit ailleurs, et elle est pure.** Ce module parle au
  // réseau ; ce qu'il y a à comprendre d'une réponse se lit sans clé ni appel,
  // et doit pouvoir s'éprouver (règle 12).
  return leReleveLu(await reponse.json().catch(() => null));
}
