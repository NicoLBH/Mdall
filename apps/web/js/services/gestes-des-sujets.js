/**
 * Ce qu'un clic demande, sur l'écran des sujets — sans toucher au DOM.
 *
 * ## Pourquoi cette fonction existe
 *
 * Le rail, la barre et les menus d'en-tête ont été dessinés complets, avec
 * tous leurs attributs, et **rien ne marchait** : personne ne les écoutait. Les
 * tests passaient, parce qu'ils vérifiaient le balisage — et un balisage juste
 * que nul ne lit a exactement l'air de marcher.
 *
 * Le défaut n'est pas d'avoir oublié un écouteur : c'est que la décision
 * « ce clic demande quoi ? » vivait dans un gestionnaire d'événements, où elle
 * ne s'exécute qu'avec un navigateur. On l'en sort : elle entre ici, pure, et
 * les tests l'appellent.
 *
 * C'est le patron de `gesteDeLaTete`, dans `tete-de-tableau.js`, écrit pour le
 * même problème. On ne l'invente pas une seconde fois — mais on ne peut pas
 * l'employer tel quel : sa zone est la tête du tableau, et le rail n'en fait
 * pas partie. C'est précisément pour cela qu'il ne voyait rien.
 *
 * Rien ici n'appelle quoi que ce soit : un nœud entre, un geste sort.
 */

const texte = (valeur) => String(valeur ?? "").trim();

export const GESTE = {
  RIEN: "rien",
  /** Poser une requête : le rail, une vue épinglée, une entrée de menu. */
  LECTURE: "lecture",
  /** Supprimer une recherche enregistrée — la vue n'existe plus. */
  DECROCHER: "decrocher",
  /** Retirer une vue du rail. Elle reste enregistrée : on la range, on ne la perd pas. */
  DERAILLER: "derailler",
  /** Aller à une sous-vue des Sujets : les objectifs, les labels. */
  SOUS_VUE: "sous_vue",
  /** Aller à un onglet voisin : les Situations. */
  ECRAN: "ecran",
  /** Replier ou déplier le rail. */
  REPLI: "repli",
  /** Ouvrir ou fermer un menu de filtre. */
  MENU: "menu",
  /** Vider la barre de recherche. */
  VIDER: "vider",
  /** Épingler ce qui est écrit dans la barre. */
  EPINGLER: "epingler",
  /** Appliquer une suggestion de complétion. */
  SUGGESTION: "suggestion",
  /** Ouvrir le formulaire d'une nouvelle vue. */
  VUE_NOUVELLE: "vue_nouvelle",
  /** Choisir l'icône d'une vue. */
  VUE_ICONE: "vue_icone",
  /** Choisir sa couleur. */
  VUE_COULEUR: "vue_couleur",
  /** Fermer le formulaire sans rien écrire. */
  VUE_ANNULER: "vue_annuler",
  /** Enregistrer la vue. */
  VUE_ENREGISTRER: "vue_enregistrer",
  /** Ouvrir le menu d'une ligne du tableau des vues. */
  VUE_MENU: "vue_menu",
  /** Épingler cette vue au rail, ou l'en retirer. */
  VUE_EPINGLER: "vue_epingler",
  /** Cocher ou décocher une ligne du tableau. */
  COCHER: "cocher",
  /** Cocher ou décocher tout ce que la requête retient. */
  COCHER_TOUT: "cocher_tout",
  /** Appliquer une action à tous les sujets cochés : `groupe:valeur`. */
  GROUPE: "groupe"
};

/**
 * L'ordre compte, et il va **du plus précis au plus général**.
 *
 * Le bouton qui décroche une épingle est *à l'intérieur* de l'entrée qui pose
 * sa requête : lu dans l'autre sens, retirer une vue poserait d'abord la
 * requête de celle qu'on retire.
 */
const ATTRIBUTS = [
  ["data-sujets-decrocher", GESTE.DECROCHER],
  ["data-sujets-cocher-tout", GESTE.COCHER_TOUT],
  ["data-sujets-cocher", GESTE.COCHER],
  ["data-sujets-groupe", GESTE.GROUPE],
  ["data-sujets-derailler", GESTE.DERAILLER],
  ["data-sujets-vue-epingler", GESTE.VUE_EPINGLER],
  ["data-sujets-vue-menu", GESTE.VUE_MENU],
  ["data-sujets-suggestion", GESTE.SUGGESTION],
  ["data-sujets-vider", GESTE.VIDER],
  ["data-sujets-epingler", GESTE.EPINGLER],
  ["data-sujets-menu", GESTE.MENU],
  ["data-sujets-vue-nouvelle", GESTE.VUE_NOUVELLE],
  ["data-sujets-vue-icone", GESTE.VUE_ICONE],
  ["data-sujets-vue-couleur", GESTE.VUE_COULEUR],
  ["data-sujets-vue-annuler", GESTE.VUE_ANNULER],
  ["data-sujets-vue-enregistrer", GESTE.VUE_ENREGISTRER],
  ["data-sujets-lecture", GESTE.LECTURE],
  ["data-sujets-sousvue", GESTE.SOUS_VUE],
  ["data-sujets-ecran", GESTE.ECRAN],
  ["data-project-rail-collapse", GESTE.REPLI]
];

/**
 * Ce que ce clic demande.
 *
 * @param {{closest: (selecteur: string) => any}} cible ce qui a été cliqué
 * @returns {{geste: string, valeur: string, noeud: object|null}}
 */
export function gesteDesSujets(cible) {
  const rien = { geste: GESTE.RIEN, valeur: "", noeud: null };
  if (!cible || typeof cible.closest !== "function") return rien;

  for (const [attribut, geste] of ATTRIBUTS) {
    const noeud = cible.closest(`[${attribut}]`);
    if (!noeud) continue;

    return { geste, valeur: texte(noeud.getAttribute?.(attribut)), noeud };
  }

  return rien;
}

/**
 * Les attributs que l'écran doit poser pour que ses gestes arrivent.
 *
 * **Le contrat entre le dessin et l'écoute, écrit une fois.** Un attribut
 * renommé d'un seul côté est la panne qui a coûté ce tour-ci : le rail portait
 * tout ce qu'il fallait, et rien ne l'écoutait.
 */
export const ATTRIBUTS_ECOUTES = ATTRIBUTS.map(([attribut]) => attribut);
