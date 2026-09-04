/**
 * Ce que la mémoire d'un projet tient encore pour vrai.
 *
 * La même règle que côté navigateur, et pour la même raison : pré-remplir une
 * entrée avec une valeur qu'une autre a remplacée ferait calculer sur un état
 * que le projet a quitté. La lecture complète de la mémoire — natures, actes,
 * dépendances — reste dans `apps/web/js/services/project-memory.js` ; ici on
 * n'a besoin que de ce filtre, et le dupliquer coûte moins cher que de faire
 * dépendre une fonction serveur de tout l'écran Mémoire.
 */
export function currentAssertions(assertions = []) {
  return (Array.isArray(assertions) ? assertions : []).filter((entree) => !entree?.superseded_by);
}
