/**
 * Les accès à la base pour lancer une lecture de comptes rendus.
 *
 * Ce module ne décide de rien : ce qu'on envoie, et ce qu'il advient d'une
 * demande qui ne part pas, vit dans `lancer-une-lecture.js`, qui est pur
 * et éprouvé. Ici, il n'y a que des allers-retours.
 */

import { supabase, getSupabaseUrl, buildSupabaseAuthHeaders } from "../../assets/js/auth.js";
import { GESTE_DES_CR, lancerUneLecture } from "./lancer-une-lecture.js";
import { laFamilleQuiSeLit } from "./les-familles-de-document.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Lancer la lecture de plusieurs documents, et rendre la main.
 *
 * **La famille décide de tout** : du geste écrit dans la file, donc de la fonction
 * de bord qui prendra la ligne. Elle vaut les comptes rendus par défaut, parce que
 * c'est d'eux que ce chemin vient — et le défaut disparaîtra quand les trois
 * écrans l'appelleront tous nommément.
 */
export async function demanderUneLecture(documents = [], { projectId = "", famille = GESTE_DES_CR } = {}) {
  return lancerUneLecture(documents, {
    projectId,
    famille,
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

      reveiller: () => { void reveillerLaLecture(famille); }
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
export async function reveillerLaLecture(famille = GESTE_DES_CR) {
  // **Le nom vient du registre.** L'écrire ici l'aurait écrit deux fois, et un
  // réveil envoyé à un nom que personne ne sert ne rend aucune erreur : il ne fait
  // rien, et la file reste bloquée sans que l'écran sache pourquoi (règle 10).
  const quoi = laFamilleQuiSeLit(famille);
  if (!quoi) return;

  try {
    await fetch(`${getSupabaseUrl()}/functions/v1/${quoi.fonction}`, {
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
