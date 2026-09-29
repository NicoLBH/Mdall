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
 * La phrase, le projet pour le compteur, et **ce que le projet conclut déjà**.
 *
 * Ce dernier manquait, et c'était le défaut : « lance la fonction existante
 * dans la mémoire du projet » ne peut pas s'écrire par un modèle qui ne sait
 * pas qu'elle existe, ni ce qu'elle lit. Il écrivait donc un **appel de
 * fonction** — la seule chose qu'on peut écrire quand on ne sait pas —, et le
 * langage n'en a pas.
 *
 * **La mémoire entière ne monte pas pour autant** : seulement les fonctions
 * signées, avec ce que chacune lit et rend. Aucune valeur, aucune citation,
 * aucun auteur. Voir `ce-que-le-projet-sait.js`.
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
import { ceQueLeProjetSait, leProjetSaitQuelqueChose } from "./ce-que-le-projet-sait.js";
import { noterLeRefusDunAppel } from "./journal-des-refus-supabase.js";

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
export async function ecrireEnMdall({ dit = "", memoire = null } = {}) {
  const phrase = texte(dit);
  if (!phrase) return { ok: false, motif: REFUS.SANS_TEXTE, panne: "", coupee: false };

  // Ce que le projet conclut déjà. Vide quand on ne l'a pas lu : un projet dont
  // la mémoire n'est pas là et un projet qui ne conclut rien s'écrivent pareil
  // au modèle — il n'a rien à reprendre dans les deux cas.
  const su = ceQueLeProjetSait(memoire ?? []);

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        project_id: await projetCourant(),
        dit: phrase,
        ...(leProjetSaitQuelqueChose(su) ? { connu: su } : {})
      })
    });
  } catch {
    // **Ce qui n'aboutit pas se compte, comme ce qui aboutit.** Le motif rendu
    // ici s'affiche une seconde et meurt ; le journal garde le genre de la
    // panne, jamais son texte (`services/journal-des-refus.js`).
    noterLeRefusDunAppel({ url: URL_DE_LA_FONCTION, statut: 0, projectId: await projetCourant() });
    // Rien n'est parti, donc rien n'a été facturé. Le dire évite de réessayer
    // en craignant de payer deux fois.
    return { ok: false, motif: REFUS.INJOIGNABLE, panne: "", coupee: false };
  }

  if (!reponse.ok) {
    noterLeRefusDunAppel({
      url: URL_DE_LA_FONCTION, statut: reponse.status, projectId: await projetCourant()
    });

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
