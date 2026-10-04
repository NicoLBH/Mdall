/**
 * Écrire une venue, et la prolonger.
 *
 * Deux allers-retours, et rien d'autre : **quand** battre se décide dans
 * `les-venues.js`, qui est pur, et le minuteur vit dans
 * `le-battement-des-venues.js`.
 *
 * **Rien ne se lit d'ici.** Une venue ne se relit pas : on ne montre à personne
 * le détail de sa propre présence — ce serait un écran dont l'existence seule
 * suggérerait qu'on en fait quelque chose. Le trafic se lit **agrégé**, par la
 * console, et par elle seule.
 *
 * **Et rien n'échoue bruyamment.** Une mesure qui empêcherait de travailler
 * serait une mesure retirée le lendemain : si la base ne répond pas, on ne
 * compte pas cette minute, et c'est tout.
 */

import { supabase } from "../../assets/js/auth.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ouvrir une venue, et rendre ce qu'il faut pour la prolonger.
 *
 * `owner_id` n'est **pas** envoyé : la base le pose depuis le jeton. L'envoyer
 * d'ici reviendrait à accepter qu'on envoie celui d'un autre, et la politique le
 * refuserait de toute façon — mais le code dirait qu'on a essayé.
 */
export async function commencerUneVenue() {
  try {
    const { data, error } = await supabase
      .from("venues")
      .insert({})
      .select("id,commencee_le,vue_le")
      .single();
    if (error || !data) return null;

    return {
      id: texte(data.id),
      commenceeLe: data.commencee_le ?? null,
      vueLe: data.vue_le ?? null
    };
  } catch {
    return null;
  }
}

/**
 * Prolonger une venue, et y ajouter des secondes éveillées.
 *
 * @returns {Promise<string|null>} l'instant du battement, ou `null`
 *
 * **`null` veut dire « cette venue n'est plus à prolonger »** — elle n'existe
 * pas, ou elle n'est pas à nous. L'appelant en ouvre alors une neuve plutôt que
 * de battre dans le vide. C'est la fonction de base qui le dit, et non une
 * erreur : une erreur aurait fait renoncer, et la venue suivante n'aurait jamais
 * été comptée (règle 5).
 */
export async function prolongerUneVenue(venueId = "", secondes = 0) {
  const cle = texte(venueId);
  if (!cle) return null;

  try {
    const { data, error } = await supabase.rpc("prolonger_une_venue", {
      p_venue: cle,
      // La borne vit aussi en base — c'est elle qui protège. Celle d'ici évite
      // d'envoyer un nombre dont on sait déjà qu'il sera rogné.
      p_secondes: Math.max(0, Math.trunc(Number(secondes) || 0))
    });
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}
