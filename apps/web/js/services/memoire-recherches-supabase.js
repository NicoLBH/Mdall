/**
 * Les recherches épinglées de la Mémoire — et à personne d'autre.
 *
 * ## Pourquoi elles existent
 *
 * On revient toujours aux mêmes questions : « les hypothèses du bâtiment A »,
 * « ce qui reste sans domaine », « les contraintes incendie versées ce
 * mois-ci ». Les retaper à chaque fois use, et l'on finit par ne plus filtrer
 * du tout — c'est-à-dire par lire trois cents lignes à l'œil.
 *
 * ## Pourquoi elles sont en base, et pourquoi elles restent privées
 *
 * Elles ont vécu dans le navigateur, le temps d'une version. C'était la
 * garantie la plus simple qui soit, et elle se payait comme se paie toujours
 * celle-là : une épingle perdue en changeant de poste, effacée avec les données
 * du site, introuvable le lendemain sur un autre écran.
 *
 * Elles passent en base, et la garantie change de nature : elle ne repose plus
 * sur l'absence d'écriture mais sur **la politique de sécurité de la table**,
 * qui est propriétaire seul dans les deux sens. Une recherche épinglée dit ce
 * que quelqu'un surveille ; c'est une information sur lui, pas sur le projet.
 * Voir la migration `202609170001_memory_pinned_searches.sql`, qui porte le
 * raisonnement en entier.
 *
 * Comme partout dans la mémoire : `null` quand la lecture a échoué, `[]` quand
 * il n'y a rien. Confondre les deux ferait afficher « aucune épingle » à
 * quelqu'un qui en a posé douze.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
// **La traduction de cette table vit ailleurs, et elle est pure.** Enfermée ici,
// derrière un import de réseau, aucun test ne pouvait l'exécuter — et le titre
// qu'elle rend n'arrivait pas jusqu'à l'écran des vues sans que rien ne le dise.
import { SURFACE, recherchePourLEcran, surfaceDe } from "./recherche-epinglee.js";

export { SURFACE, recherchePourLEcran };

const SUPABASE_URL = getSupabaseUrl();
// `owner_id` et `updated_at` sont **lus, jamais écrits d'ici** : la base les
// pose elle-même (`default auth.uid()`, `default now()`). L'écran des vues en a
// besoin pour dire de qui vient une vue et quand elle a bougé — sans quoi une
// liste de douze vues ne se distingue plus que par son nom.
const COLUMNS = "id,project_id,owner_id,query,title,description,icon,color,surface,rail,created_at,updated_at";

const texte = (valeur) => String(valeur ?? "").trim();

async function request(path, { method = "GET", body = null, headers = {}, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!response.ok) throw new Error(`${path} (${response.status})`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

/**
 * Les épingles de qui regarde, sur ce projet.
 *
 * @returns {Promise<object[]|null>} `null` si la lecture a échoué
 */
export async function listerLesRecherches(projectId, { surface = SURFACE.MEMOIRE } = {}) {
  const projet = texte(projectId);
  if (!projet) return [];

  try {
    const lignes = (await request("memory_pinned_searches", {
      params: {
        select: COLUMNS,
        project_id: `eq.${projet}`,
        surface: `eq.${surfaceDe(surface)}`,
        order: "created_at.asc"
      }
    })) ?? [];

    return lignes.map(recherchePourLEcran).filter((entree) => entree.id && entree.requete);
  } catch {
    return null;
  }
}

/**
 * Épingler la recherche courante.
 *
 * Le doublon est ignoré plutôt que rejeté : épingler deux fois la même requête
 * est un geste sans conséquence, et le refuser bruyamment ferait passer une
 * répétition pour une erreur. La contrainte d'unicité de la table s'en charge.
 *
 * `owner_id` n'est pas envoyé : la base le pose à `auth.uid()`, et la politique
 * refuse toute autre valeur. L'écrire ici reviendrait à laisser croire que
 * l'appelant peut le choisir.
 *
 * @returns {Promise<object|null>} l'épingle posée, ou `null`
 */
export async function epinglerLaRecherche({
  projectId, requete, titre = "", surface = SURFACE.MEMOIRE, habits = null
} = {}) {
  const projet = texte(projectId);
  const dite = texte(requete);
  if (!projet || !dite) return null;

  try {
    const lignes = await request("memory_pinned_searches", {
      method: "POST",
      params: { select: COLUMNS, on_conflict: "owner_id,project_id,surface,query" },
      headers: { Prefer: "return=representation,resolution=merge-duplicates" },
      body: [{
        project_id: projet, query: dite, title: texte(titre) || null,
        surface: surfaceDe(surface),
        // Ce qui habille une vue — description, icône, couleur — n'existe que
        // là où on le donne. Une épingle de la Mémoire n'en a pas, et les
        // colonnes restent nulles plutôt que de porter des valeurs vides.
        ...(habits && typeof habits === "object" ? habits : {})
      }]
    });

    const posee = lignes?.[0];
    return posee ? recherchePourLEcran(posee) : null;
  } catch {
    return null;
  }
}

/**
 * Épingler une vue au rail, ou l'en retirer.
 *
 * Elle reste enregistrée dans les deux cas : c'est sa place dans la barre de
 * gauche qui change, pas son existence. La retirer du rail ne la supprime pas —
 * confondre les deux ferait perdre une recherche qu'on voulait seulement
 * ranger.
 */
export async function epinglerAuRail(id, auRail = true) {
  const cle = texte(id);
  if (!cle) return null;

  try {
    const lignes = await request("memory_pinned_searches", {
      method: "PATCH",
      params: { select: COLUMNS, id: `eq.${cle}` },
      headers: { Prefer: "return=representation" },
      body: { rail: auRail === true, updated_at: new Date().toISOString() }
    });

    const changee = lignes?.[0];
    return changee ? recherchePourLEcran(changee) : null;
  } catch {
    return null;
  }
}

/** Renommer. Un titre vide se refuse : une entrée sans nom ne se retrouve pas. */
export async function renommerLaRecherche(id, titre) {
  const cle = texte(id);
  const nom = texte(titre);
  if (!cle || !nom) return null;

  try {
    const lignes = await request("memory_pinned_searches", {
      method: "PATCH",
      params: { select: COLUMNS, id: `eq.${cle}` },
      headers: { Prefer: "return=representation" },
      body: { title: nom, updated_at: new Date().toISOString() }
    });

    const changee = lignes?.[0];
    return changee ? recherchePourLEcran(changee) : null;
  } catch {
    return null;
  }
}

/** Désépingler. `true` quand la base a pris. */
export async function oublierLaRecherche(id) {
  const cle = texte(id);
  if (!cle) return false;

  try {
    await request("memory_pinned_searches", { method: "DELETE", params: { id: `eq.${cle}` } });
    return true;
  } catch {
    return false;
  }
}
