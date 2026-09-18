/**
 * L'aller-retour du brouillon de fermeture.
 *
 * Le transport, et rien d'autre. Ce qui compose la matière vit dans
 * `brouillon-de-fermeture.js`, qui est pur et testé ; ce qu'on demande au
 * modèle vit dans `supabase/functions/brouillon-de-fermeture/`, au serveur.
 *
 * **Aucune consigne ne vit ici.** Elle ne se lit pas avec F12, et une
 * instruction envoyée par le client ferait de cette fonction Edge un relais
 * ouvert vers un modèle payant. Le client envoie du texte, il ne compose rien.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Demander le brouillon au serveur.
 *
 * @returns {Promise<{brouillon: object|null, dit: string}>} `brouillon` à `null`
 *   quand rien n'est venu — le serveur n'a pas de modèle, l'appel a échoué, ou
 *   le contrôle a écarté ce qu'il a rendu. `dit` porte la raison quand le
 *   serveur l'a donnée, pour que la fenêtre n'ait pas à la deviner.
 */
export async function demanderLeBrouillon({ projectId = "", matiere = "" } = {}) {
  if (!texte(projectId) || !texte(matiere)) return { brouillon: null, dit: "" };

  try {
    const reponse = await fetch(`${getSupabaseUrl()}/functions/v1/brouillon-de-fermeture`, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({
        Accept: "application/json", "Content-Type": "application/json"
      }),
      body: JSON.stringify({ project_id: projectId, matiere })
    });

    const lu = await reponse.json().catch(() => null);

    // Un refus du contrôle porte sa phrase : « le copilote a écrit un chiffre
    // qui ne figure nulle part dans ce sujet ». La taire ferait passer pour un
    // silence ce qui est un refus, et l'on rappellerait le copilote en boucle.
    if (!reponse.ok) return { brouillon: null, dit: texte(lu?.dit) };

    return { brouillon: lu?.brouillon ?? null, dit: "" };
  } catch {
    return { brouillon: null, dit: "" };
  }
}
