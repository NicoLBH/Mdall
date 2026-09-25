/**
 * L'établi : les allers-retours avec la base, et rien d'autre.
 *
 * Ce qu'un utilitaire de l'établi **est** — sa fiche, ce qu'il prend, ce qu'il
 * rend — vit dans `utilitaire-de-letabli.js`, qui est pur et se vérifie sans
 * réseau. Ici, on écrit et on lit.
 *
 * ## Aucun projet ne passe par ici
 *
 * Ni en lecture, ni en écriture, et ce n'est pas un oubli : un utilitaire de
 * l'établi est à son auteur, pas au chantier où il l'a écrit. Voir la migration
 * `202610170001_letabli_des_utilitaires.sql`, qui porte le raisonnement.
 *
 * ## `null` quand ça a raté, `[]` quand il n'y a rien
 *
 * Comme partout dans la mémoire. Confondre les deux ferait afficher « votre
 * établi est vide » à quelqu'un qui y a posé douze outils — et il en
 * réécrirait un treizième.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import {
  REFUS_DE_LETABLI, refusDeLaBase, utilitaireDeLetabli
} from "./utilitaire-de-letabli.js";

const SUPABASE_URL = getSupabaseUrl();

/**
 * `owner_id` est **lu, jamais écrit d'ici** : la base le pose elle-même
 * (`default auth.uid()`), et la politique refuse toute autre valeur. L'envoyer
 * laisserait croire que l'appelant peut le choisir.
 */
const COLONNES = "id,nom,resume,rayon,version,created_at,updated_at";

const texte = (valeur) => String(valeur ?? "").trim();

async function appel(chemin, { method = "GET", body = null, headers = {}, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${chemin}`);
  for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, valeur);

  const reponse = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!reponse.ok) {
    // **Ce que la base refuse se rapporte, il ne s'avale pas.** Un nom déjà
    // pris rendait un `409` que l'écran traduisait en « réessayez » — et
    // réessayer échouait exactement pareil. Le corps de l'erreur dit laquelle
    // des deux unicités a été heurtée ; on l'emporte avec l'échec.
    const erreur = new Error(`${chemin} (${reponse.status})`);
    erreur.dit = await reponse.json().catch(() => null);
    throw erreur;
  }
  return reponse.status === 204 ? null : reponse.json().catch(() => null);
}

/**
 * Tout l'établi de qui regarde, le dernier repris en tête.
 *
 * ## Pourquoi les fichiers viennent avec
 *
 * Ce qu'un utilitaire **prend** et ce qu'il **rend** se déduisent de son texte,
 * et rien d'autre ne les porte. Une liste sans les fichiers ne pourrait donc
 * afficher ni l'un ni l'autre — ou les afficherait d'après un champ recopié,
 * qui divergerait du code au premier enregistrement (règle 4).
 *
 * Un établi tient dans quelques dizaines d'outils de quelques dizaines de
 * lignes ; c'est une requête, pas un chargement.
 *
 * @returns {Promise<object[]|null>} `null` si la lecture a échoué
 */
export async function listerLetabli() {
  try {
    const lignes = (await appel("etabli_utilitaires", {
      params: {
        select: `${COLONNES},etabli_versions(version,fichiers,dit)`,
        order: "updated_at.desc"
      }
    })) ?? [];

    return lignes
      .map((ligne) => {
        const derniere = laDerniereVersion(ligne);
        return utilitaireDeLetabli(ligne, derniere.fichiers, derniere.dit);
      })
      .filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * La version courante, parmi celles qui sont venues : son texte **et son cahier
 * des charges**.
 *
 * La base rend les versions dans l'ordre qu'elle veut ; on prend celle dont le
 * numéro est le plus haut plutôt que la dernière du tableau — un ordre supposé
 * est un ordre qui change le jour où la requête change.
 *
 * Les deux se lisent ensemble parce qu'ils appartiennent à la même version :
 * pris dans deux passes, l'un pourrait venir de la `v3` et l'autre de la `v4`,
 * et l'on relirait un code avec l'intention d'un autre.
 */
function laDerniereVersion(ligne = null) {
  const versions = Array.isArray(ligne?.etabli_versions) ? ligne.etabli_versions : [];
  if (!versions.length) return { fichiers: [], dit: "" };

  const derniere = versions.reduce(
    (haute, une) => ((Number(une?.version) || 0) > (Number(haute?.version) || 0) ? une : haute)
  );
  return {
    fichiers: Array.isArray(derniere?.fichiers) ? derniere.fichiers : [],
    dit: String(derniere?.dit ?? "")
  };
}

/**
 * Poser un utilitaire sur l'établi, ou l'y reprendre.
 *
 * Tout passe par la fonction de la base : elle compare le texte au précédent,
 * monte la version s'il a changé, et écrit dans les deux tables — ou dans
 * aucune. Fait en trois appels depuis ici, un échec au milieu laisserait un
 * utilitaire dont la version annoncée n'existe pas.
 *
 * ## Elle rend un refus, jamais un silence
 *
 * « Ça n'a pas marché » n'est pas une réponse : un nom déjà pris se corrige en
 * trois lettres, une panne se réessaie, et l'écran ne peut pas le deviner.
 *
 * @returns {Promise<{ok: boolean, utilitaire?: object, motif?: string}>}
 */
export async function enregistrerSurLetabli({
  id = "", nom = "", resume = "", rayon = "", fichiers = [], dit = ""
} = {}) {
  // `dit` est le cahier des charges, en paramètre : le nom de l'outil s'appelle
  // donc `sonNom`. Les deux se sont un temps appelés pareil, et le module ne se
  // chargeait plus du tout — voir l'épreuve qui relit la syntaxe de tous les
  // modules du navigateur.
  const sonNom = texte(nom);
  const gardes = Array.isArray(fichiers) ? fichiers : [];
  if (!sonNom || !gardes.length) return { ok: false, motif: REFUS_DE_LETABLI.PANNE };

  try {
    const ligne = await appel("rpc/etabli_enregistrer", {
      method: "POST",
      body: {
        p_nom: sonNom,
        p_fichiers: gardes,
        p_id: texte(id) || null,
        p_resume: texte(resume),
        p_rayon: texte(rayon) || "exploration",
        /**
         * Le cahier des charges, **non rogné**. `texte()` couperait les blancs
         * de bord — et une zone de français se termine souvent par une ligne
         * vide qu'on a laissée là exprès, en écrivant. Le rendre autrement
         * qu'on l'a tapé ferait monter une version pour un retour à la ligne.
         */
        p_dit: String(dit ?? "")
      }
    });

    // La fonction rend une ligne ; certaines passerelles l'enveloppent dans un
    // tableau. On accepte les deux plutôt que d'en supposer une.
    const rendue = Array.isArray(ligne) ? ligne[0] : ligne;
    const utilitaire = utilitaireDeLetabli(rendue, gardes, String(dit ?? ""));

    // Une réponse sans ligne : `p_id` ne désigne aucun des siens. Ce n'est pas
    // une panne, c'est un utilitaire qu'on n'a pas — et le dire « réessayez »
    // ferait réessayer sans fin.
    return utilitaire ? { ok: true, utilitaire } : { ok: false, motif: REFUS_DE_LETABLI.PANNE };
  } catch (erreur) {
    return { ok: false, motif: refusDeLaBase(erreur?.dit) };
  }
}

/**
 * Retirer un utilitaire de son établi.
 *
 * Ses versions partent avec lui (`on delete cascade`) : garder le texte d'un
 * outil qu'on a retiré ferait une mémoire cachée dont personne ne saurait
 * qu'elle existe.
 *
 * @returns {Promise<boolean>} vrai si la base l'a bien retiré
 */
export async function retirerDeLetabli(id = "") {
  const cle = texte(id);
  if (!cle) return false;

  try {
    await appel("etabli_utilitaires", {
      method: "DELETE",
      params: { id: `eq.${cle}` },
      headers: { Prefer: "return=minimal" }
    });
    return true;
  } catch {
    return false;
  }
}
