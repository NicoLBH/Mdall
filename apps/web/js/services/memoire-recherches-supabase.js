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

const SUPABASE_URL = getSupabaseUrl();
const COLUMNS = "id,project_id,query,title,surface,created_at";

/**
 * L'écran d'où vient une épingle.
 *
 * **La Mémoire et les sujets partagent la table, pas les requêtes.** Les deux
 * barres ont la même grammaire mais pas le même vocabulaire : `nature:hypothese`
 * ne veut rien dire sur les sujets, et `label:cr-chantier` rien dans la Mémoire.
 * Mélanger les épingles ferait un rail dont la moitié ne rend jamais rien.
 *
 * La surface range ; elle n'autorise pas. C'est `owner_id` qui autorise, et la
 * politique de la table n'a pas changé d'un caractère.
 */
export const SURFACE = { MEMOIRE: "memoire", SUJETS: "sujets" };

/**
 * La surface demandée, ramenée à celles qui existent.
 *
 * **La Mémoire par défaut, et ce n'est pas arbitraire** : c'est la valeur que
 * la base pose sur les lignes déjà écrites, qui viennent toutes de là.
 */
function surfaceDe(valeur) {
  const dite = texte(valeur).toLowerCase();
  return Object.values(SURFACE).includes(dite) ? dite : SURFACE.MEMOIRE;
}

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
 * Ce qu'une ligne de la base devient à l'écran.
 *
 * Le titre se recalcule quand il est vide : la requête fait office de nom, et
 * c'est elle qu'on reconnaît. La recopier en base à la création la laisserait
 * diverger de la requête qu'elle résume.
 */
export function recherchePourLEcran(ligne = {}) {
  const requete = texte(ligne.query);
  return {
    id: texte(ligne.id),
    titre: texte(ligne.title) || requete,
    requete,
    surface: surfaceDe(ligne.surface)
  };
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
  projectId, requete, titre = "", surface = SURFACE.MEMOIRE
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
        surface: surfaceDe(surface)
      }]
    });

    const posee = lignes?.[0];
    return posee ? recherchePourLEcran(posee) : null;
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
