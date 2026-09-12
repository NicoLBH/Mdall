/**
 * Combien de fois chaque utilitaire a été ouvert.
 *
 * Les allers-retours avec la base, et rien d'autre : le classement lui-même est
 * dans `catalogue-de-latelier.js`, qui est pur et se vérifie sans réseau.
 *
 * ## Ce qui ne part pas d'ici
 *
 * **Ni qui, ni quand, ni sur quel projet.** On envoie une cible, la base ajoute
 * un. Une ligne de `atelier_ouvertures` ne peut désigner personne, et ce n'est
 * pas un oubli : savoir qui ouvre quoi n'est utile à aucune décision de Mdall,
 * et ce serait une donnée de surveillance qu'il faudrait ensuite protéger.
 *
 * ## Ce qu'un échec coûte
 *
 * Rien. Un utilitaire s'ouvre, qu'on ait pu le compter ou non : faire dépendre
 * l'ouverture d'un compteur ferait payer l'essentiel par l'accessoire. On note
 * donc **après** avoir ouvert, sans attendre la réponse.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les compteurs, par cible.
 *
 * **`null` sur un échec, jamais `{}`.** Un Atelier dont on n'a pas pu lire les
 * compteurs et un Atelier où rien n'a été ouvert n'appellent pas le même
 * classement : le second se range par l'ordre du catalogue, le premier a
 * quelque chose qu'on ne sait pas (règle 5).
 *
 * @returns {Promise<Record<string, number>|null>}
 */
export async function lireLesOuvertures() {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/atelier_ouvertures`);
    url.searchParams.set("select", "cible,ouvertures");

    const reponse = await fetch(url.toString(), {
      method: "GET",
      headers: await buildSupabaseAuthHeaders({ Accept: "application/json" }),
      cache: "no-store"
    });

    if (!reponse.ok) return null;
    const lignes = await reponse.json().catch(() => null);
    if (!Array.isArray(lignes)) return null;

    const compteurs = {};
    for (const ligne of lignes) {
      const cible = texte(ligne?.cible);
      if (cible) compteurs[cible] = Number(ligne?.ouvertures ?? 0);
    }
    return compteurs;
  } catch {
    return null;
  }
}

/**
 * Noter qu'un utilitaire vient d'être ouvert.
 *
 * Par la fonction de la base, qui ne sait qu'ajouter un : un `update` ouvert
 * laisserait poser n'importe quelle valeur, et le classement ne voudrait plus
 * rien dire. L'incrément y est aussi atomique — deux ouvertures simultanées
 * n'en perdent aucune.
 */
export async function noterLOuverture(cible) {
  const cle = texte(cible);
  if (!cle) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/atelier_noter_ouverture`, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      }),
      body: JSON.stringify({ p_cible: cle })
    });
  } catch {
    // Un utilitaire s'ouvre, qu'on ait pu le compter ou non.
  }
}
