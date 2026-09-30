/**
 * Demander à la base quels domaines en suivent d'autres.
 *
 * Un seul appel, une ligne par couple, **deux mots d'un vocabulaire fermé et
 * deux nombres**. La fonction interrogée est `les_enchainements_du_systeme()` :
 * elle vérifie la porte elle-même, et sa signature ne peut rendre ni texte
 * d'affirmation, ni identifiant de projet, ni auteur, ni date.
 */

import { supabase } from "../../assets/js/auth.js";

/**
 * Les lignes, ou `null`.
 *
 * **`null` veut dire « on n'a pas su »**, et l'écran doit le dire autrement que
 * « aucun enchaînement » : les deux mènent à des décisions opposées (règle 5).
 * Un tableau vide, lui, veut bien dire qu'il n'y a rien.
 */
export async function lesEnchainementsDuSysteme() {
  try {
    const { data, error } = await supabase.rpc("les_enchainements_du_systeme");
    if (error) return null;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}
