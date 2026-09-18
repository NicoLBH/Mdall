/**
 * Le dossier où mène un chemin saisi, creusé s'il le faut.
 *
 * ## Pourquoi il vit à part, et avec des portes
 *
 * Il était six lignes dans le transport, à côté du téléversement — et il a
 * livré, au premier essai réel, un défaut qu'aucune vérification ne pouvait
 * voir : le module qui le portait importe le SDK Supabase, donc il ne
 * s'exécute pas hors navigateur, donc rien ne l'exerçait.
 *
 * Ici, les deux accès à la base entrent par `portes`. En test on les remplace,
 * et le parcours s'exécute : quel dossier on réutilise, lequel on crée, et
 * surtout **comment on distingue « la racine » de « ça n'a pas marché »**.
 *
 * ## Le défaut qu'il faut nommer
 *
 * La première version rendait un identifiant, ou `null` en cas d'échec. Or
 * `null` **est** la racine de Documents : un fichier écrit à la racine se
 * voyait donc refuser avec « le dossier n'a pas pu être créé », alors qu'il
 * n'y avait aucun dossier à créer. Deux situations, une seule valeur — c'est
 * exactement ce que la règle 5 interdit.
 *
 * Elle rend donc `{trouve, id}` : `trouve` dit si l'on sait où écrire, `id`
 * dit où — et `null` y est un endroit, pas une panne.
 */

const texte = (valeur) => String(valeur ?? "").trim();

const memeNom = (un, autre) =>
  texte(un).toLocaleLowerCase("fr-FR") === texte(autre).toLocaleLowerCase("fr-FR");

/**
 * Creuser le chemin depuis le dossier ouvert.
 *
 * ## On réutilise avant de créer
 *
 * Un dossier déjà là est repris, **à la casse près** : « Perso » et « perso »
 * côte à côte dans un même dossier se confondent à l'œil, et l'on ouvrirait le
 * mauvais. La base refuse d'ailleurs le doublon, et l'on aurait donc échoué
 * sans savoir pourquoi.
 *
 * ## On crée de proche en proche
 *
 * `a/b/c.md` fait `a`, puis `b` dans `a`. Un dossier créé en route reste créé
 * si la suite échoue : c'est ennuyeux, pas grave — et cela vaut mieux qu'un
 * fichier déposé à la racine parce qu'un maillon a manqué.
 *
 * @param {object} options
 * @param {string} [options.projectId]
 * @param {string|null} [options.depuis] le dossier ouvert — `null` : la racine
 * @param {string[]} [options.dossiers] les noms à traverser, dans l'ordre
 * @param {{listerLesEnfants: Function, creerLeDossier: Function}} options.portes
 * @returns {Promise<{trouve: boolean, id: string|null, motif: string}>}
 */
export async function creuserLesDossiers({
  projectId = "", depuis = null, dossiers = [], portes = null
} = {}) {
  const rate = (motif) => ({ trouve: false, id: null, motif });

  if (!texte(projectId)) return rate("aucun projet");
  if (!portes?.listerLesEnfants || !portes?.creerLeDossier) return rate("aucun accès aux dossiers");

  // **La racine est un endroit.** `null` ici veut dire « à la racine de
  // Documents », et non « je ne sais pas » : sans ce choix, écrire à la racine
  // se serait fait refuser avec « le dossier n'a pas pu être créé ».
  let courant = texte(depuis) || null;

  try {
    for (const nom of (Array.isArray(dossiers) ? dossiers : [])) {
      if (!texte(nom)) return rate("un dossier sans nom");

      const enfants = (await portes.listerLesEnfants(projectId, courant)) ?? [];
      const deja = (Array.isArray(enfants) ? enfants : [])
        .find((dossier) => memeNom(dossier?.name, nom));

      const dossier = deja ?? (await portes.creerLeDossier(projectId, courant, texte(nom)));
      if (!dossier?.id) return rate(`le dossier « ${texte(nom)} » n'a pas pu être créé`);
      courant = dossier.id;
    }
  } catch (erreur) {
    return rate(texte(erreur?.message) || "cause inconnue");
  }

  return { trouve: true, id: courant, motif: "" };
}
