/**
 * Demander la transcription d'une phrase en Mdall.
 *
 * ## Ce module ne transcrit rien
 *
 * La transcription se passe entièrement au serveur
 * (`supabase/functions/ecrire-en-mdall`). Ce module **demande** et **reçoit** :
 * il ne porte pas la consigne — qui enseigne la grammaire du langage, et c'est
 * du savoir-faire —, et il ne voit jamais la clé du modèle.
 *
 * ## Ce qui monte
 *
 * La phrase, et le projet pour le compteur. Rien d'autre : la transcription
 * n'a pas besoin de la mémoire du projet pour écrire une règle, et faire
 * monter une mémoire entière à chaque essai serait payer cher une chose qui ne
 * sert pas.
 *
 * ## Ce qui se lit sans réseau vit ailleurs
 *
 * `le-mdall-rendu.js` porte tout ce qui interprète la réponse, et s'éprouve.
 * Ce fichier-ci parle à l'authentification : **aucune épreuve de Node ne peut
 * l'importer**, et c'est exactement ainsi qu'un « n'est pas défini » est parti
 * en production une fois. Les noms qu'il fait passer sont donc **importés**,
 * jamais renvoyés de façade.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { REFUS, laTranscriptionLue, motifDuStatut, panneLue } from "./le-mdall-rendu.js";

const URL_DE_LA_FONCTION = `${getSupabaseUrl()}/functions/v1/ecrire-en-mdall`;

const texte = (valeur) => String(valeur ?? "").trim();

// **Importés au-dessus, et réexportés ici.** `export { x } from "…"` ferait
// passer les noms sans les lier dans ce fichier : c'est du JavaScript valide,
// `node --check` le confirme, et la première ligne qui s'en sert lève
// « n'est pas défini » — au clic, jamais avant. Voir
// `scripts/verifie-les-reexports`.
export { REFUS, laTranscriptionLue, motifDuStatut, panneLue };
export { PHRASES_DU_REFUS, phraseDeLaTranscription } from "./le-mdall-rendu.js";

async function projetCourant() {
  try {
    const { resolveCurrentBackendProjectId } = await import("./project-supabase-sync.js");
    return (await resolveCurrentBackendProjectId()) || null;
  } catch {
    // Une transcription reste possible sans savoir où l'on est : sa
    // consommation se range alors hors projet plutôt que d'être attribuée au
    // hasard.
    return null;
  }
}

/**
 * Transcrire une phrase, une fois.
 *
 * @returns {Promise<{ok: true, fichiers, lacunes, temperature, modele, coupee}
 *   |{ok: false, motif: string, panne: string, coupee: boolean}>}
 */
export async function ecrireEnMdall({ dit = "" } = {}) {
  const phrase = texte(dit);
  if (!phrase) return { ok: false, motif: REFUS.SANS_TEXTE, panne: "", coupee: false };

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ project_id: await projetCourant(), dit: phrase })
    });
  } catch {
    // Rien n'est parti, donc rien n'a été facturé. Le dire évite de réessayer
    // en craignant de payer deux fois.
    return { ok: false, motif: REFUS.INJOIGNABLE, panne: "", coupee: false };
  }

  if (!reponse.ok) {
    const refuse = await reponse.json().catch(() => null);
    return {
      ok: false,
      motif: motifDuStatut(reponse.status),
      // Ce que le serveur a nommé. Vide quand il n'a rien nommé : on n'invente
      // pas une explication vraisemblable (règle 5).
      panne: panneLue(refuse),
      coupee: Boolean(refuse?.coupee)
    };
  }

  const corps = await reponse.json().catch(() => null);
  return laTranscriptionLue(corps);
}
