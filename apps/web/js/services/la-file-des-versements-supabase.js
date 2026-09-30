/**
 * Les accès à la base pour envoyer un dépôt de messagerie.
 *
 * Ce module ne décide de rien : ce qu'on envoie, dans quel ordre, et ce qu'il
 * advient d'une montée ratée vit dans `la-file-des-versements.js`, qui est pur
 * et éprouvé. Ici, il n'y a que des allers-retours.
 */

import { supabase, getCurrentUser, getSupabaseUrl, buildSupabaseAuthHeaders } from "../../assets/js/auth.js";
import { CASIER, envoyerLesMails } from "./la-file-des-versements.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Envoyer des porteurs de mails, et rendre la main.
 *
 * @param {File[]} fichiers
 * @param {{projectId: string, avance?: (combien: number) => void}} ou
 */
export async function verserDesMails(fichiers = [], { projectId = "", avance = null } = {}) {
  return envoyerLesMails(fichiers, {
    projectId,
    avance,
    portes: {
      quiDepose: async () => texte((await getCurrentUser().catch(() => null))?.id),

      poserLaLigne: async ({ projectId: projet, fichiers: liste }) => {
        const { data, error } = await supabase
          .from("versements")
          // `owner_id` n'est pas envoyé : la base le pose à `auth.uid()`, et
          // l'envoyer d'ici reviendrait à accepter qu'on envoie celui d'un autre.
          .insert({ project_id: projet, fichiers: liste ?? [] })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        return texte(data?.id);
      },

      monter: async (chemin, fichier) => {
        const { error } = await supabase.storage
          .from(CASIER)
          .upload(chemin, fichier, {
            contentType: fichier?.type || "application/octet-stream",
            upsert: false
          });
        if (error) throw new Error(error.message);
      },

      completerLaLigne: async (id, montes) => {
        const { error } = await supabase
          .from("versements")
          .update({ fichiers: montes })
          .eq("id", id);
        if (error) throw new Error(error.message);
      },

      oublierLaLigne: async (id) => {
        // Une ligne sans fichier ne sera jamais versée : la laisser encombrerait
        // l'onglet Actions d'un versement qui n'a rien à verser.
        await supabase.from("versements").delete().eq("id", id);
      },

      reveiller: () => { void reveillerLeServeur(); }
    }
  });
}

/**
 * Réveiller la fonction qui vide la file.
 *
 * **On ne l'attend pas.** Elle met des minutes ; l'attendre serait exactement
 * ce qu'on vient de retirer de l'écran. Et si l'appel n'aboutit pas, la ligne
 * reste `en_attente` : le prochain réveil prendra la plus ancienne, et rien
 * n'est perdu.
 */
export async function reveillerLeServeur() {
  try {
    await fetch(`${getSupabaseUrl()}/functions/v1/verser-les-mails`, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: "{}"
    });
  } catch (erreur) {
    // Rien à dire à l'écran : le dépôt est posé, il partira au réveil suivant.
    console.warn("[versement] réveil du serveur impossible", erreur);
  }
}

/**
 * Ce qui attend ou tourne dans la file de ce projet.
 *
 * Lu par l'onglet Actions pour montrer un sablier pendant que le serveur
 * travaille. La politique ne rend que les siens.
 */
export async function lesVersementsEnCours(projectId = "") {
  if (!texte(projectId)) return [];
  const { data, error } = await supabase
    .from("versements")
    .select("id,project_id,statut,fichiers,avancement,arrete,cree_le,pris_le")
    .eq("project_id", texte(projectId))
    .in("statut", ["en_attente", "en_cours"])
    .order("cree_le", { ascending: false });

  // **Ne pas savoir n'est pas savoir qu'il n'y a rien.** Une lecture ratée qui
  // rendrait une liste vide ferait disparaître un dépôt en cours de l'écran qui
  // sert à le suivre (règle 5).
  if (error) return null;
  return data ?? [];
}
