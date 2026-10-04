/**
 * Demander les comptes à la base.
 *
 * Trois allers-retours, et rien d'autre : la mise en forme est dans
 * `les-comptes-de-mdall.js`, qui est pur et se vérifie sans réseau.
 *
 * **La porte n'est pas ici.** Les trois fonctions interrogées la vérifient
 * elles-mêmes — `est_administrateur()` —, et chacune **journalise son accès**
 * avant de répondre (`acces_administrateurs`). Un contrôle écrit dans ce
 * fichier serait une suggestion : il se contourne en ouvrant les outils de
 * développement. Ce qui protège est en base, et ce qui trace l'est aussi.
 *
 * **Rien ne s'écrit d'ici**, sauf le journal des accès — que l'on n'écrit pas
 * non plus : la base le fait, et c'est bien le point. Une console qui pourrait
 * choisir de ne pas se journaliser ne se journalise pas.
 */

import { supabase } from "../../assets/js/auth.js";
import { PAR_PAGE, lePasPourLaBase } from "./les-comptes-de-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une page de comptes, ou `null`.
 *
 * **`null` veut dire « on n'a pas su »**, et l'écran doit le dire autrement que
 * « aucun compte » : les deux mènent à des décisions opposées. Un refus de la
 * porte arrive ici de la même façon — et c'est voulu, la console ne doit pas
 * apprendre à qui demande si c'est la porte ou le réseau qui a répondu.
 */
export async function lesComptesDeMdall({ page = 1, parPage = PAR_PAGE, cherche = "" } = {}) {
  try {
    const { data, error } = await supabase.rpc("les_comptes_de_mdall", {
      p_page: Math.max(1, Math.trunc(Number(page)) || 1),
      p_par_page: Math.max(1, Math.trunc(Number(parPage)) || PAR_PAGE),
      // `null` et non `""` : la fonction distingue « pas de recherche » de
      // « recherche vide », et une chaîne vide filtrerait sur rien du tout.
      p_cherche: texte(cherche) || null
    });
    if (error) return null;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

/** Le détail d'un compte, ou `null`. */
export async function leCompteDeMdall(identifiant = "") {
  const cle = texte(identifiant);
  if (!cle) return null;

  try {
    const { data, error } = await supabase.rpc("le_compte_de_mdall", { p_compte: cle });
    if (error) return null;
    // Une fonction `returns table` rend un tableau, même pour une seule ligne.
    // Un compte effacé en rend zéro : c'est `null`, et non une ligne de zéros
    // qui se lirait comme un compte sans activité.
    return (Array.isArray(data) ? data[0] : data) ?? null;
  } catch {
    return null;
  }
}

/**
 * Ce que l'IA a coûté à un compte, groupé par pas et par modèle.
 *
 * Le pas est traduit pour la base par `lePasPourLaBase` : la fonction n'en
 * accepte que trois, et lève sur les autres — elle ne doit pas laisser choisir
 * une granularité que l'axe du JavaScript ne sait pas dessiner.
 */
export async function laConsommationDunCompte({
  identifiant = "", du = "", au = "", pas = ""
} = {}) {
  const cle = texte(identifiant);
  if (!cle || !texte(du) || !texte(au)) return null;

  try {
    const { data, error } = await supabase.rpc("la_consommation_dun_compte", {
      p_compte: cle,
      p_du: texte(du),
      p_au: texte(au),
      p_pas: lePasPourLaBase(pas)
    });
    if (error) return null;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}
