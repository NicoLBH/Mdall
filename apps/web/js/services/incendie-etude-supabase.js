/**
 * Les études incendie d'un projet, en base.
 *
 * ## Ce qui voyage, et ce qui ne voyage pas
 *
 * Les **réponses** au questionnaire, un titre, un rang. Jamais les conclusions :
 * un degré coupe-feu enregistré serait une vérité gelée le jour où on l'a lue,
 * et le référentiel progresse. Elles se recalculent à chaque ouverture, ce qui
 * coûte un aller-retour et garantit que ce qui s'affiche décrit le projet tel
 * que le raisonnement le voit aujourd'hui.
 *
 * Partent tout de même, à côté des réponses, la version du référentiel et une
 * **empreinte** des conclusions d'alors — une chaîne de huit caractères dont on
 * ne peut pas les relire. Elle ne fait jamais foi ; elle sert à dire « quelque
 * chose a changé depuis votre dernier passage ».
 *
 * ## Privé
 *
 * La table est propriétaire seulement, dans les deux sens : une étude est un
 * brouillon, et publier le brouillon de quelqu'un fait qu'on cesse d'essayer.
 * Ce fichier ne demande donc jamais l'étude d'un autre — il ne saurait pas quoi
 * en faire, et la base la refuserait.
 */

import { supabase } from "../../assets/js/auth.js";

const TABLE = "incendie_etudes";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une lecture qui ne fait pas tomber l'écran.
 *
 * La table peut ne pas exister encore, le réseau peut manquer : dans les deux
 * cas l'onglet doit s'ouvrir quand même. Un questionnaire qui refuse de se
 * dessiner parce qu'une liste d'études est illisible est pire qu'un
 * questionnaire sans liste.
 */
async function sansTomber(requete) {
  try {
    return await requete();
  } catch (erreur) {
    return { data: null, error: erreur };
  }
}

/** Les études du projet qui m'appartiennent, la dernière touchée en tête. */
export async function lireLesEtudes(projectId) {
  const projet = texte(projectId);
  if (!projet) return [];

  const { data, error } = await sansTomber(() => supabase
    .from(TABLE)
    .select("id,titre,reponses,referentiel,empreinte,rang,created_at,updated_at")
    .eq("project_id", projet)
    .order("rang", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(50));

  if (error) {
    console.warn("[incendie] études illisibles", error);
    return [];
  }
  return (data ?? []).map((ligne) => ({
    ...ligne,
    titre: texte(ligne.titre),
    reponses: ligne.reponses && typeof ligne.reponses === "object" ? ligne.reponses : {}
  }));
}

/**
 * Ouvrir une étude : elle n'existe qu'une fois créée, et elle l'est vide.
 *
 * On ne l'ouvre pas à la première réponse par magie : c'est l'écran qui décide
 * du moment, et il le dit. Une ligne créée par surprise se retrouve un jour
 * dans une liste sans que personne ne sache d'où elle vient.
 */
export async function ouvrirUneEtude(projectId, { titre = "", rang = 0 } = {}) {
  const projet = texte(projectId);
  if (!projet) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ project_id: projet, titre: texte(titre), rang, reponses: {} })
    .select("id,titre,reponses,referentiel,empreinte,rang,created_at,updated_at")
    .single();

  if (error) {
    console.warn("[incendie] étude non ouverte", error);
    return null;
  }
  return { ...data, titre: texte(data.titre), reponses: data.reponses ?? {} };
}

/**
 * Enregistrer ce qui a été répondu.
 *
 * Les champs absents ne sont pas écrasés : renommer une étude ne doit pas
 * effacer ses réponses parce que l'appelant n'en avait pas sous la main.
 */
export async function enregistrerLEtude(id, { titre, reponses, referentiel, empreinte, rang } = {}) {
  const cle = texte(id);
  if (!cle) return false;

  const champs = {};
  if (titre !== undefined) champs.titre = texte(titre);
  if (reponses !== undefined) champs.reponses = reponses && typeof reponses === "object" ? reponses : {};
  if (referentiel !== undefined) champs.referentiel = texte(referentiel);
  if (empreinte !== undefined) champs.empreinte = texte(empreinte);
  if (rang !== undefined) champs.rang = Number(rang) || 0;
  if (Object.keys(champs).length === 0) return true;

  const { error } = await supabase.from(TABLE).update(champs).eq("id", cle);
  if (error) {
    console.warn("[incendie] étude non enregistrée", error);
    return false;
  }
  return true;
}

/** Supprimer une étude. Ce qui a été effacé ne se retrouve pas : l'écran demande avant. */
export async function supprimerLEtude(id) {
  const cle = texte(id);
  if (!cle) return false;

  const { error } = await supabase.from(TABLE).delete().eq("id", cle);
  if (error) {
    console.warn("[incendie] étude non supprimée", error);
    return false;
  }
  return true;
}
