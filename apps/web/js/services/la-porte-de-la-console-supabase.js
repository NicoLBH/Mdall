/**
 * La seule question qu'on pose à la table des administrateurs.
 *
 * ## `select` d'une colonne, et une seule ligne
 *
 * La politique de lecture ne rend que sa propre ligne — mais s'en remettre à
 * elle seule pour borner la requête serait imprudent : une politique se
 * réécrit, et le jour où quelqu'un l'élargirait, un `select *` sans limite
 * mettrait la liste des administrateurs dans le navigateur de chacun sans que
 * rien ne le signale.
 *
 * Donc **les deux** : la base borne, et l'appel borne aussi. Deux verrous pour
 * une porte qui, si elle s'ouvrait, donnerait un annuaire de gens à
 * démarcher.
 *
 * On ne lit pas l'adresse : `ouvert_le` suffit à savoir qu'une ligne existe, et
 * une colonne qu'on ne descend pas est une colonne qu'on ne peut pas afficher
 * par distraction.
 */

import { supabase } from "../../assets/js/auth.js";
import { laPorteEstOuverte } from "./la-porte-de-la-console.js";

/**
 * Suis-je administrateur ?
 *
 * @returns {Promise<boolean>} faux dès que la lecture n'aboutit pas
 */
export async function suisJeAdministrateur() {
  try {
    const reponse = await supabase
      .from("administrateurs")
      .select("ouvert_le")
      .limit(1);
    return laPorteEstOuverte(reponse);
  } catch {
    // Une session absente lève plutôt qu'elle ne rend une erreur. La porte
    // reste fermée, et l'application ne s'arrête pas pour autant.
    return false;
  }
}
