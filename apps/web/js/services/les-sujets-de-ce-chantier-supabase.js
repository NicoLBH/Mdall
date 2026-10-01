/**
 * Demander à la base les sujets que ce chantier emploie, par affirmation.
 *
 * ## Pourquoi la base, et pas un découpage ici
 *
 * L'extraction — minuscules, accents, mots de quatre lettres, mots-outils,
 * couples de mots voisins, radicaux rangés — vit dans `les_sujets_dun_texte()`,
 * et c'est **la même** qui nourrit la console. La refaire en JavaScript aurait
 * donné deux vocabulaires : l'écran d'un chantier aurait prédit sur des termes
 * que la console ne connaît pas, et les deux chiffres auraient cessé d'être
 * comparables sans que rien ne le dise (règle 4).
 *
 * ## La porte est celle de la table
 *
 * `les_sujets_de_ce_chantier()` est la seule fonction de sujets qui n'est pas
 * `security definer` : elle lit **un** chantier, et la politique de
 * `project_assertions` dit déjà qui en a le droit. Un appel pour un projet qu'on
 * n'a pas rend donc une liste vide, sans qu'aucun garde-fou n'ait eu à être
 * écrit une seconde fois.
 */

import { supabase } from "../../assets/js/auth.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les sujets de chaque affirmation de ce chantier — ou `null`.
 *
 * **`null` veut dire « on n'a pas su »**, et ce n'est pas « ce chantier n'a
 * aucun sujet » : les deux mènent à des lectures opposées (règle 5). L'écran
 * dira « la prédiction sur les sujets n'a pas pu être lue », et non « elle ne
 * trouve rien ».
 *
 * @returns {Promise<Map<string, string[]>|null>}
 */
export async function lesSujetsDeCeChantier(projectId = "") {
  if (!texte(projectId)) return null;

  try {
    const { data, error } = await supabase.rpc("les_sujets_de_ce_chantier", {
      le_chantier: texte(projectId)
    });
    if (error) return null;

    const par = new Map();
    for (const ligne of Array.isArray(data) ? data : []) {
      const id = texte(ligne?.affirmation);
      const sujet = texte(ligne?.sujet);
      if (!id || !sujet) continue;
      if (!par.has(id)) par.set(id, []);
      par.get(id).push(sujet);
    }
    return par;
  } catch {
    return null;
  }
}
