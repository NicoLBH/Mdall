/**
 * Demander à la base quels sujets techniques les chantiers emploient.
 *
 * Deux appels, parce que deux questions : **ce qu'on montre** et **ce qu'on
 * cache**. Les fonctions vérifient la porte elles-mêmes, et leur signature ne
 * rend que des termes partagés par plusieurs chantiers — un mot vu sur un seul
 * n'en sort pas, c'est du contenu.
 */

import { supabase } from "../../assets/js/auth.js";

/**
 * Les sujets, ou `null`.
 *
 * **`null` veut dire « on n'a pas su »**, et l'écran doit le dire autrement que
 * « aucun sujet » : les deux mènent à des décisions opposées (règle 5).
 */
export async function lesSujetsDuSysteme() {
  try {
    const { data, error } = await supabase.rpc("les_sujets_du_systeme");
    if (error) return null;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

/** Combien de termes passent le seuil, et combien ne le passent pas. */
export async function laMesureDesSujets() {
  try {
    const { data, error } = await supabase.rpc("la_mesure_des_sujets");
    if (error) return null;
    return (Array.isArray(data) ? data[0] : data) ?? null;
  } catch {
    return null;
  }
}
