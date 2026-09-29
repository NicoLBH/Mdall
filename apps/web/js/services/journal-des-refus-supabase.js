/**
 * Noter ce qui n'a pas abouti, et le relire.
 *
 * Les allers-retours avec la base, et rien d'autre : le domaine des genres de
 * panne, la lecture d'un code de réponse et les regroupements vivent dans
 * `journal-des-refus.js`, qui est pur et se vérifie sans réseau.
 *
 * ## Pourquoi c'est le navigateur qui écrit
 *
 * C'est l'inverse du compteur de consommation, et pour une raison qui décide :
 * **les pannes les plus graves sont invisibles du serveur**. Si le portail est
 * en panne, la fonction de bord ne s'exécute jamais — elle n'a rien à écrire,
 * et son silence ressemble à celui d'une journée sans incident. Seul celui qui
 * a lancé l'appel sait qu'il n'a pas abouti.
 *
 * Ce que cela permettrait — écrire n'importe quoi dans une table
 * d'exploitation — est fermé par le domaine : huit genres, un nom de fonction
 * contraint par sa forme, **aucun texte libre**, et la base le vérifie
 * elle-même.
 *
 * ## Noter ne casse jamais rien
 *
 * Celui qui appelle vient d'essuyer une panne ; lui en ajouter une seconde
 * serait de la cruauté sans profit. Toute erreur ici s'arrête ici, en silence.
 * C'est la même règle que le compteur de consommation côté serveur.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { motifDuRefus, nomDeLaFonction, refusANoter } from "./journal-des-refus.js";

const SUPABASE_URL = getSupabaseUrl();
const COLONNES = "id,project_id,fonction,motif,statut,survenu_le";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Noter un refus. Ne rend rien, ne jette jamais, n'attend pas d'être attendu.
 *
 * @param {object} refus
 * @param {string} refus.fonction la fonction appelée, telle qu'elle se déploie
 * @param {string} refus.motif une clé de `MOTIF_DU_REFUS`
 * @param {number} [refus.statut] le code de réponse, quand il y en a eu un
 * @param {string} [refus.projectId] le projet, quand l'appel en a un
 */
export async function noterUnRefus(refus = {}) {
  try {
    const ligne = refusANoter(refus);
    // Un refus qu'on ne sait pas nommer ne s'invente pas : la base le
    // refuserait, et une ligne « inconnu » dans un journal d'exploitation est
    // du bruit qui fait cesser de le lire (règle 5).
    if (!ligne) return;

    await fetch(`${SUPABASE_URL}/rest/v1/refus_des_fonctions`, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({
        "Content-Type": "application/json",
        // Rien à relire : on note et l'on passe. Demander la ligne écrite
        // ferait attendre celui qui vient déjà d'attendre pour rien.
        Prefer: "return=minimal"
      }),
      body: JSON.stringify(ligne)
    });
  } catch {
    // Celui qui appelle vient d'essuyer une panne. Le journal ne lui en ajoute
    // pas une seconde.
  }
}

/**
 * Noter le refus d'un appel, à partir de ce qu'on a sous la main.
 *
 * C'est la forme que les services appellent : l'adresse de la fonction — d'où
 * le nom se lit — et le code de la réponse, `0` quand rien n'a répondu. Le
 * genre de panne se déduit du code, à l'endroit qui sait le faire.
 *
 * **Ne s'attend pas.** Celui qui appelle vient d'essuyer une panne ; si c'est le
 * réseau, attendre cette écriture-ci lui ferait subir une seconde attente pour
 * rien. On note, et l'on rend la main.
 */
export function noterLeRefusDunAppel({ url = "", statut = 0, projectId = "" } = {}) {
  void noterUnRefus({
    fonction: nomDeLaFonction(url),
    motif: motifDuRefus(statut),
    statut,
    projectId
  });
}

/**
 * **`null` sur un échec, jamais `[]`.** Une période sans panne et une période
 * qu'on n'a pas pu lire n'appellent pas le même écran : la première dit « tout
 * a abouti », la seconde a quelque chose qu'on ne sait pas. Afficher « aucune
 * panne » sur un hoquet de réseau serait le pire des mensonges, puisque c'est
 * précisément le moment où il y en a une (règle 5).
 */
async function lire({ du = "", au = "", ...params }) {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/refus_des_fonctions`);
    url.searchParams.set("select", COLONNES);
    url.searchParams.set("order", "survenu_le.desc");
    for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, valeur);

    // Les deux bornes par `and=` : deux paramètres `survenu_le` posés l'un
    // après l'autre s'écrasent, et l'on lirait tout depuis le début.
    const debut = texte(du);
    const fin = texte(au);
    if (debut && fin) {
      url.searchParams.set("and", `(survenu_le.gte.${debut}T00:00:00Z,survenu_le.lte.${fin}T23:59:59Z)`);
    }

    const reponse = await fetch(url.toString(), {
      method: "GET",
      headers: await buildSupabaseAuthHeaders({ Accept: "application/json" }),
      cache: "no-store"
    });

    if (!reponse.ok) return null;
    const lignes = await reponse.json().catch(() => null);
    return Array.isArray(lignes) ? lignes : null;
  } catch {
    return null;
  }
}

/**
 * Ce que celui qui regarde a essuyé, tous projets confondus.
 *
 * La politique de la table rend aussi les refus de ses collègues sur ses
 * projets : on filtre donc **par propriétaire**, sans quoi « mes pannes »
 * afficherait celles de l'équipe.
 */
export async function mesRefus({ du = "", au = "", ownerId = "" } = {}) {
  const cle = texte(ownerId);
  if (!cle) return null;

  return lire({ owner_id: `eq.${cle}`, du, au });
}

/** Ce que ce projet a essuyé, tous collaborateurs confondus. */
export async function refusDuProjet({ projectId = "", du = "", au = "" } = {}) {
  const projet = texte(projectId);
  if (!projet) return null;

  return lire({ project_id: `eq.${projet}`, du, au });
}
