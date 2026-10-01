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

/**
 * Où le découpage casse, mot par mot.
 *
 * C'est la seule lecture qui réponde à « pourquoi un pour cent ? » : un mot que
 * beaucoup d'affirmations portent et qui ne rend aucune idée est un mot qui
 * promet et ne tient pas.
 */
export async function leDetailDesLiaisons() {
  try {
    const { data, error } = await supabase.rpc("le_detail_des_liaisons");
    if (error) return null;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

/**
 * Sur quoi le découpage travaille : des phrases, ou des intitulés ?
 *
 * Un corpus de titres — « Menuiseries extérieures » — ne porte aucun lien, et
 * ce n'est alors pas le découpage qu'il faut corriger.
 */
export async function laFormeDesAffirmations() {
  try {
    const { data, error } = await supabase.rpc("la_forme_des_affirmations");
    if (error) return null;
    return (Array.isArray(data) ? data[0] : data) ?? null;
  } catch {
    return null;
  }
}

/**
 * Le corpus **en clair** : le texte des affirmations, et ce que la coupe en a
 * tiré.
 *
 * ## C'est du contenu de chantier, et c'est assumé
 *
 * Tout le reste de ce module rend des comptes. Celui-ci rend des phrases,
 * parce qu'on ne peut pas améliorer le découpage sans voir ce qu'il n'a pas su
 * lire — et ce qu'il n'a pas su lire est précisément ce qui ne sort jamais.
 *
 * La porte est dans la base : la fonction est réservée aux administrateurs.
 * L'interrupteur de l'écran empêche un clic distrait, rien de plus
 * (`services/la-porte-du-developpement.js`).
 */
export async function leCorpusEnClair({ auPlus = 20000 } = {}) {
  try {
    const { data, error } = await supabase.rpc("le_corpus_en_clair", { au_plus: auPlus });
    if (error) return null;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}
