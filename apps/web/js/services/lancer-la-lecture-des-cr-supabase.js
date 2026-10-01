/**
 * Les accès à la base pour lancer une lecture de comptes rendus.
 *
 * Ce module ne décide de rien : ce qu'on envoie, et ce qu'il advient d'une
 * demande qui ne part pas, vit dans `lancer-la-lecture-des-cr.js`, qui est pur
 * et éprouvé. Ici, il n'y a que des allers-retours.
 */

import { supabase, getSupabaseUrl, buildSupabaseAuthHeaders } from "../../assets/js/auth.js";
import { GESTE_DES_CR, lancerLaLectureDesCr } from "./lancer-la-lecture-des-cr.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Lancer la lecture de plusieurs comptes rendus, et rendre la main. */
export async function demanderLaLectureDesCr(documents = [], { projectId = "" } = {}) {
  return lancerLaLectureDesCr(documents, {
    projectId,
    portes: {
      poserLaLigne: async ({ projectId: projet, geste, documents: liste }) => {
        const { data, error } = await supabase
          .from("versements")
          // `owner_id` n'est pas envoyé : la base le pose à `auth.uid()`, et
          // l'envoyer d'ici reviendrait à accepter qu'on envoie celui d'un autre.
          .insert({ project_id: projet, geste, documents: liste ?? [] })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        return texte(data?.id);
      },

      reveiller: () => { void reveillerLaLecture(); }
    }
  });
}

/**
 * Réveiller la fonction qui lit les comptes rendus.
 *
 * **On ne l'attend pas.** Elle met des minutes, parfois une heure ; l'attendre
 * serait exactement ce qu'on vient de retirer de l'écran. Et si l'appel
 * n'aboutit pas, la ligne reste `en_attente` : le prochain réveil prendra la
 * plus ancienne, et rien n'est perdu.
 */
export async function reveillerLaLecture() {
  try {
    await fetch(`${getSupabaseUrl()}/functions/v1/lire-les-comptes-rendus`, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: "{}"
    });
  } catch (erreur) {
    // Rien à dire à l'écran : la demande est posée, elle partira au réveil
    // suivant.
    console.warn("[lecture-cr] réveil du serveur impossible", erreur);
  }
}

export { GESTE_DES_CR };

/**
 * **Ce qui tourne se lit ailleurs, et à un seul endroit.**
 *
 * `lesVersementsEnCours` (`la-file-des-versements-supabase.js`) rend les deux
 * files — les dépôts de messagerie et les lectures de comptes rendus —, parce
 * que c'est la même table et le même journal. Une seconde lecture ici aurait
 * fait deux endroits où l'on apprend qu'un travail est en cours, et l'un des
 * deux aurait fini par en oublier un geste (règle 10).
 */
