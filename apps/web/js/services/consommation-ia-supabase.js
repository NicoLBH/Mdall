/**
 * Lire ce que l'IA a consommé.
 *
 * Les allers-retours avec la base, et rien d'autre : les tarifs, les totaux et
 * la mise en euros sont dans `consommation-ia.js`, qui est pur et se vérifie
 * sans réseau.
 *
 * **Rien ne s'écrit d'ici.** Les lignes sont posées par les fonctions de bord,
 * qui appellent le modèle et reçoivent le décompte. Un navigateur qui écrirait
 * son propre compteur reviendrait à demander à chacun de déclarer sa
 * consommation — et la table n'a d'ailleurs aucune politique d'écriture.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { appelPourLEcran } from "./consommation-ia.js";

const SUPABASE_URL = getSupabaseUrl();
const COLONNES = "id,project_id,owner_id,model,usage_kind,input_tokens,output_tokens,created_at";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * **`null` sur un échec, jamais `[]`.** Un mois sans appel et un mois qu'on n'a
 * pas pu lire n'appellent pas le même écran : le premier dit « rien n'a été
 * consommé », le second a quelque chose qu'on ne sait pas. Afficher zéro euro
 * sur un hoquet de réseau ferait croire à une facture nulle (règle 5).
 */
async function lire({ du = "", au = "", ...params }) {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/ai_usages`);
    url.searchParams.set("select", COLONNES);
    url.searchParams.set("order", "created_at.asc");
    for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, valeur);

    // **Les deux bornes passent par `and=`.** Deux paramètres `created_at`
    // posés l'un après l'autre s'écrasent — `URLSearchParams.set` garde le
    // dernier —, et l'on obtiendrait tout depuis le début du mois sans borne de
    // fin : une facture de septembre qui inclurait octobre.
    const debut = texte(du);
    const fin = texte(au);
    if (debut && fin) {
      url.searchParams.set("and", `(created_at.gte.${debut}T00:00:00Z,created_at.lte.${fin}T23:59:59Z)`);
    }

    const reponse = await fetch(url.toString(), {
      method: "GET",
      headers: await buildSupabaseAuthHeaders({ Accept: "application/json" }),
      cache: "no-store"
    });

    if (!reponse.ok) return null;
    const lignes = await reponse.json().catch(() => null);
    return Array.isArray(lignes) ? lignes.map(appelPourLEcran) : null;
  } catch {
    return null;
  }
}

/**
 * Ce que celui qui regarde a consommé sur une période, tous projets confondus.
 *
 * La politique de la table rend aussi les appels de ses collègues sur ses
 * projets : on filtre donc **par propriétaire**, sans quoi « ma consommation »
 * afficherait celle de l'équipe.
 */
export async function maConsommation({ du = "", au = "", ownerId = "" } = {}) {
  const cle = texte(ownerId);
  if (!cle) return null;

  return lire({ owner_id: `eq.${cle}`, du, au });
}

/** Ce que ce projet a consommé sur une période, tous collaborateurs confondus. */
export async function consommationDuProjet({ projectId = "", du = "", au = "" } = {}) {
  const projet = texte(projectId);
  if (!projet) return null;

  return lire({ project_id: `eq.${projet}`, du, au });
}
