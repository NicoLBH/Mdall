/**
 * Demander à la base ce que les chantiers énoncent — et non plus seulement ce
 * qu'ils nomment.
 *
 * Deux appels, parce que deux questions : **ce qu'on montre** et **ce qu'on
 * cache**. Les fonctions vérifient la porte elles-mêmes, et leur signature ne
 * rend que des idées partagées par au moins deux chantiers : une idée vue sur
 * un seul est le contenu de ce chantier-là, pas une idée de métier.
 */

import { supabase } from "../../assets/js/auth.js";

/**
 * Les idées, ou `null`.
 *
 * **`null` veut dire « on n'a pas su »**, et l'écran doit le dire autrement que
 * « aucune idée » : les deux mènent à des décisions opposées (règle 5).
 */
export async function lesIdeesDuSysteme() {
  try {
    const { data, error } = await supabase.rpc("les_idees_du_systeme");
    if (error) return null;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

/**
 * Sur quoi on a cherché, combien d'affirmations portent un lien, combien en
 * rendent une idée entière, et combien d'idées la console ne montre pas.
 */
export async function laMesureDesIdees() {
  try {
    const { data, error } = await supabase.rpc("la_mesure_des_idees");
    if (error) return null;
    return (Array.isArray(data) ? data[0] : data) ?? null;
  } catch {
    return null;
  }
}
