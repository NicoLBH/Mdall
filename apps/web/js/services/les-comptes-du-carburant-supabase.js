/**
 * Demander les comptes du carburant à la base.
 *
 * Un seul appel, une seule ligne, **rien que des nombres et deux dates**. La
 * fonction interrogée est `comptes_du_carburant()` : elle vérifie la porte
 * elle-même, et sa signature ne peut rendre ni contenu ni identifiant.
 */

import { supabase } from "../../assets/js/auth.js";

/**
 * Les comptes, ou `null`.
 *
 * **`null` veut dire « on n'a pas su »**, et l'écran doit le dire autrement que
 * « rien n'a été déposé » : les deux mènent à des décisions opposées (règle 5).
 */
export async function lesComptesDuCarburant() {
  try {
    const { data, error } = await supabase.rpc("comptes_du_carburant");
    if (error) return null;
    // Une fonction `returns table` rend un tableau, même pour une seule ligne.
    return (Array.isArray(data) ? data[0] : data) ?? null;
  } catch {
    return null;
  }
}
