/**
 * La courbe d'activité, lue en base.
 *
 * ## Un appel, pas trois cents
 *
 * Le compte se fait côté base (`activite_des_projets`), et ce qui traverse le
 * réseau est ce qu'on dessine : un projet, une semaine, un nombre. La raison
 * est dite au long dans la migration — descendre les lignes pour les compter
 * ici voudrait dire ramener tous les commentaires de l'année, et une limite de
 * lecture tronquerait la courbe par son côté le plus ancien sans que rien ne le
 * dise.
 *
 * ## Une lecture qui échoue ne dessine pas une courbe plate
 *
 * `null`, et l'écran laisse la place vide. Une ligne à zéro dirait « ce projet
 * n'a rien vécu de l'année » — une information, et fausse (règle 5).
 */

import { supabase } from "../../assets/js/auth.js";
import { SEMAINES } from "./activite-des-projets.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le compte par projet et par semaine.
 *
 * @param {number} [semaines]
 * @returns {Promise<{projet: string, semaine: string, combien: number}[]|null>}
 */
export async function lireLActiviteDesProjets(semaines = SEMAINES) {
  const { data, error } = await supabase.rpc("activite_des_projets", { p_semaines: semaines });

  if (error) return null;

  return (Array.isArray(data) ? data : []).map((ligne) => ({
    projet: texte(ligne?.project_id),
    semaine: texte(ligne?.semaine),
    combien: Number(ligne?.combien) || 0
  }));
}
