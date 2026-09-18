/**
 * Le corpus d'un projet, réduit à ce qu'une reconnaissance a besoin de savoir.
 *
 * ## Pourquoi une lecture de plus
 *
 * Les écrans du corpus ont la leur, lourde et liée à leur état : statut de
 * dépôt, analyse, pages, taille. Ce qu'on cherche ici tient en trois colonnes —
 * un identifiant, un nom, et s'il a été retiré. Faire monter toute la charge
 * d'un écran de suivi pour reconnaître un nom dans une phrase ferait payer au
 * geste de fermer un sujet ce qui ne le regarde pas.
 *
 * ## `null` n'est pas `[]`
 *
 * `null` quand la lecture a échoué, `[]` quand le projet n'a rien déposé.
 * L'appelant ne doit pas confondre « le fil ne cite aucun document » avec « je
 * n'ai pas pu lire le corpus » (règle 5).
 */

import { supabase } from "../../assets/js/auth.js";

/**
 * Les documents d'un projet, retirés compris.
 *
 * **Les retirés viennent aussi** : c'est la reconnaissance qui les écarte, et
 * elle le fait à un seul endroit. Les filtrer ici mettrait la règle à deux
 * endroits, et l'un des deux finirait par ne plus dire ce que l'autre dit
 * (règle 10).
 *
 * @returns {Promise<{id, original_filename, filename, deleted_at}[]|null>}
 */
export async function listerLeCorpus(projectId) {
  if (!projectId) return null;

  const { data, error } = await supabase
    .from("documents")
    .select("id,original_filename,filename,deleted_at")
    .eq("project_id", projectId);

  if (error) return null;

  return Array.isArray(data) ? data : [];
}
