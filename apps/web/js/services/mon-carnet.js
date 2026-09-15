/**
 * Mon carnet : mes situations, où qu'elles regardent.
 *
 * ## Deux écrans, une seule liste
 *
 * Le même tableau se monte à deux endroits. Sur l'écran d'un projet, il montre
 * les situations de ce projet ; dans le carnet, il montre les miennes, toutes
 * affaires confondues. Ce qui change entre les deux n'est pas le tableau, c'est
 * **d'où l'on regarde** — et cela se demande ici, à un seul endroit.
 *
 * Deux valeurs pouvaient répondre à la question : `store.currentProjectId`, posé
 * par la route, et `situationsView.projectScopeId`, posé par le chargement. Les
 * laisser répondre toutes les deux, c'était accepter qu'elles se contredisent le
 * jour où l'une est mise à jour et pas l'autre (règle 4). **La route décide** :
 * le carnet est une adresse, pas un état des données.
 *
 * ## Le nom de l'écran
 *
 * Il est écrit ici parce que trois endroits le disent — le menu, l'en-tête, et
 * l'écran lui-même. Recopié, il aurait fini par différer d'un des trois, et
 * c'est toujours celui qu'on ne regarde pas qui reste faux (règle 10).
 */

/** Le nom de l'écran, partout le même. */
export const NOM_DU_CARNET = "Situations";

/** L'adresse du carnet. */
export const ROUTE_DU_CARNET = "#situations";

/**
 * Regarde-t-on le carnet, ou l'écran d'un projet ?
 *
 * Sans projet courant, il n'y a pas d'écran de projet à regarder : c'est le
 * carnet. Les routes hors projet posent `currentProjectId` à `null`, et c'est
 * précisément ce que cette question lit.
 *
 * @param {object} store le magasin, ou n'importe quoi qui lui ressemble
 */
export function estMonCarnet(store = null) {
  return !String(store?.currentProjectId ?? "").trim();
}

/**
 * Ce qu'un sujet dit des situations où on l'a mis.
 *
 * **« Situations » ne disait pas à qui.** Un sujet est du projet, et tout le
 * monde le lit ; la ligne qui le range dans une situation, elle, ne parle qu'à
 * une personne — la base ne rend les situations qu'à leur propriétaire. Un
 * libellé qui n'en dit rien laisse croire qu'on publie son organisation en
 * cochant une case, et c'est précisément ce qui fait qu'on ne coche rien.
 *
 * La garantie est tenue par la base, pas par ces mots. Ce qu'ils font, c'est
 * la rendre lisible.
 */
export const DANS_MON_CARNET = "Dans mon carnet";

/** Et quand il n'y est pas. « Aucune situation » se lisait comme un manque. */
export const PAS_DANS_MON_CARNET = "Pas dans mon carnet";

/** Pourquoi personne d'autre ne le voit, dit une fois, au survol. */
export const CARNET_PRIVE = "Vous seul voyez ce que vous mettez dans votre carnet.";

/**
 * Ce qu'on affiche quand on ne sait pas combien de sujets une situation porte.
 *
 * **Zéro serait un mensonge.** Une situation dont on n'a pas compté les sujets
 * n'en a pas zéro : on ne sait pas. Le tableau affichait « 0 », qui se lit comme
 * un chantier sans travail, et l'on serait allé chercher la panne ailleurs
 * (règle 5).
 */
export const COMPTE_INCONNU = "—";

/**
 * Pourquoi le compte manque, quand il manque.
 *
 * Nommer l'absence **et sa raison** : un tiret sans explication se lit comme une
 * panne, alors que c'est une limite connue.
 */
export const POURQUOI_LE_COMPTE_MANQUE =
  "Les sujets d'une situation automatique se comptent dans leur chantier.";

/**
 * Où emmener un ancien lien.
 *
 * `#project/<id>/situations` était l'adresse de l'onglet. Il n'existe plus, et
 * sans cette question la page retomberait sur Fichiers **sans rien dire** —
 * on aurait demandé ses situations et obtenu autre chose, sans savoir pourquoi
 * (règle 5).
 *
 * La connaissance « les anciens liens des situations mènent au carnet » vit
 * ici, et pas dans le routeur : c'est une règle sur le carnet, pas sur les
 * adresses en général (règle 10).
 *
 * @param {string[]} parties le chemin découpé, sans le `#`
 * @returns {string|null} l'adresse où aller, ou `null` s'il n'y a rien à faire
 */
export function adresseDunAncienLien(parties = []) {
  const chemin = Array.isArray(parties) ? parties.map((part) => String(part ?? "").trim()) : [];
  if (chemin[0] !== "project") return null;
  if (chemin[2] !== "situations") return null;
  return ROUTE_DU_CARNET;
}

/**
 * Ce que l'en-tête, tout en haut, dit quand on est dans le carnet.
 *
 * **Il ne nomme aucun chantier, et c'est le point.** La barre du haut portait
 * « Untel / Résidence Bertrand » ; garder ce nom au-dessus du carnet ferait
 * croire qu'on est encore dedans, et qu'on y lit les situations de ce
 * chantier-là. On en est sorti : le fil d'Ariane le montre.
 *
 * Écrit ici plutôt que dans l'en-tête pour la même raison que le reste : trois
 * endroits disent le nom de cet écran, et un nom vit à un seul endroit
 * (règle 10).
 *
 * @param {object|null} situationOuverte la situation qu'on regarde, s'il y en
 *   a une : le fil d'Ariane la nomme, et c'est la seule chose qui s'y ajoute.
 */
export function enTeteDuCarnet(situationOuverte = null) {
  const titre = situationOuverte ? String(situationOuverte.title || "Situation") : "";

  return {
    primary: NOM_DU_CARNET,
    secondary: "",
    // Aucun chantier au-dessus du carnet : on est sorti du projet.
    showSecondary: false,
    href: ROUTE_DU_CARNET,
    headerClass: "gh-header gh-header--global",
    breadcrumbTabLabel: titre ? NOM_DU_CARNET : "",
    breadcrumbCurrentLabel: titre,
    showSituationBreadcrumb: !!titre
  };
}
