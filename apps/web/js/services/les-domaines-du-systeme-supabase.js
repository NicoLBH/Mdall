/**
 * Demander à la base quels domaines le système reconnaît.
 *
 * Un seul appel, une ligne par domaine, **rien que des mots d'un vocabulaire
 * fermé et des nombres**. La fonction interrogée est
 * `les_domaines_du_systeme()` : elle vérifie la porte elle-même, et sa
 * signature ne peut rendre ni texte d'affirmation, ni identifiant de projet,
 * ni auteur.
 */

import { supabase } from "../../assets/js/auth.js";

/**
 * Les lignes, ou `null`.
 *
 * **`null` veut dire « on n'a pas su »**, et l'écran doit le dire autrement que
 * « aucun domaine reconnu » : les deux mènent à des décisions opposées
 * (règle 5). Un tableau vide, lui, veut bien dire qu'il n'y a rien.
 */
export async function lesDomainesDuSysteme() {
  try {
    const { data, error } = await supabase.rpc("les_domaines_du_systeme");
    if (error) return null;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}
