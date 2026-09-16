/**
 * Les colonnes d'une situation, écrites à un seul endroit.
 *
 * ## Ce que coûte une deuxième liste
 *
 * PostgREST ne rend que les colonnes nommées. Deux écrans lisaient les
 * situations, chacun avec sa propre chaîne de `select` — et le jour où une
 * colonne est arrivée, un seul des deux l'a demandée. L'écran servi par l'autre
 * affichait alors des situations sans propriétaire, c'est-à-dire, en toutes
 * lettres, « créée avant le cloisonnement » sur chacune.
 *
 * Rien ne lève, rien ne rougit : une colonne absente d'un `select` ment
 * doucement. C'est la règle 4 — une valeur écrite à deux endroits finit par
 * diverger — appliquée à une liste de noms.
 *
 * **Une seule liste, donc, et aucun lecteur n'écrit la sienne.** C'est
 * `colonnes-dune-situation.test.mjs` qui monte la garde : un module qui
 * reconstruirait sa chaîne casse la construction.
 *
 * ## Pourquoi tout le monde demande tout
 *
 * On pourrait servir à chaque écran ce dont il a besoin, et rien de plus. Mais
 * c'est exactement ainsi qu'on se retrouve à deux listes : le jour où un écran
 * affiche une chose de plus, il ajoute la colonne chez lui et nulle part
 * ailleurs. Une situation est une ligne courte ; la lire entière ne coûte rien
 * à côté de ce que coûte une liste oubliée.
 */

/**
 * Tout ce qu'une situation porte.
 *
 * L'ordre n'a aucune importance pour la base ; il est celui de la table, pour
 * qu'on retrouve d'un coup d'œil ce qui manque.
 */
export const COLONNES_DUNE_SITUATION = Object.freeze([
  "id",
  "project_id",
  "owner_id",
  "perimetre",
  "title",
  "description",
  // Une situation est une vue : son icône, sa couleur, sa requête (plan
  // `le-carnet-prend-la-forme-des-sujets.md`, étape 1).
  "icon",
  "color",
  "requete",
  // Où on la trouve : épinglée au rail du carnet, ou seulement au tableau.
  "au_rail",
  "objective_text",
  "status",
  "progress_percent",
  "mode",
  "filter_definition",
  "created_at",
  "updated_at",
  "closed_at"
]);

/** La chaîne à passer en `select`. */
export function clauseDesSituations() {
  return COLONNES_DUNE_SITUATION.join(",");
}
