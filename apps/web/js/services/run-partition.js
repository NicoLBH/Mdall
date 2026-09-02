/**
 * Ce qui appartient au projet, et ce qui appartient à l'Atelier.
 *
 * ## Pourquoi séparer
 *
 * Le journal des actions raconte ce qui est arrivé au projet, et tous les
 * collaborateurs le lisent — c'est sa raison d'être. Mais l'Atelier n'a pas
 * cette nature : on y expérimente, on essaie un moteur, on relance dix fois
 * pour comprendre un écart. Ce sont des gestes de travail personnels. Les
 * publier revient à afficher le brouillon de quelqu'un, et la première
 * conséquence est qu'on cesse d'essayer.
 *
 * ## Deux faits, jamais confondus
 *
 * `origine` dit **d'où** l'exécution vient : l'Atelier, ou le projet.
 * `privee` dit **qui** a le droit de la voir.
 *
 * Ce ne sont pas la même chose, et les mélanger ferait mentir l'écran. Une
 * exécution d'Atelier écrite avant le cloisonnement vient bien de l'Atelier,
 * mais elle reste lisible par tout le monde : la ranger sous « visible par vous
 * seul » serait une promesse fausse, et c'est la pire espèce d'erreur pour un
 * écran dont tout le rôle est de dire qui voit quoi.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il ne protège rien. La séparation est tenue par la base — la règle de lecture
 * de `ct_analysis_runs` écarte les exécutions d'Atelier d'autrui. Ce fichier ne
 * fait que **ranger ce qui est déjà arrivé** ; s'il se trompait, on verrait mal
 * rangé, pas indûment.
 */

/** Les deux origines possibles. Il n'y en a pas de troisième. */
export const ORIGINE = {
  /** Un acte du projet : analyse d'une proposition, dépôt, lancement manuel. */
  PROJET: "projet",
  /** Un geste de travail dans l'Atelier. */
  ATELIER: "atelier"
};

/** Le nom des deux vues, tel qu'il s'affiche. */
export const ONGLETS = [
  {
    cle: ORIGINE.PROJET,
    libelle: "Partagées",
    explication: "Ce qui est arrivé au projet. Tous les collaborateurs le lisent."
  },
  {
    cle: ORIGINE.ATELIER,
    libelle: "Atelier",
    explication: "Vos essais dans l'Atelier. Ils ne sont pas partagés avec le projet."
  }
];

function origineDe(entry) {
  return entry?.origine === ORIGINE.ATELIER ? ORIGINE.ATELIER : ORIGINE.PROJET;
}

/** Les exécutions rangées par origine, dans l'ordre où elles arrivent. */
export function partitionnerActions(entries = []) {
  const liste = Array.isArray(entries) ? entries : [];
  return {
    [ORIGINE.PROJET]: liste.filter((entry) => origineDe(entry) === ORIGINE.PROJET),
    [ORIGINE.ATELIER]: liste.filter((entry) => origineDe(entry) === ORIGINE.ATELIER)
  };
}

/** L'onglet demandé, ramené à l'un des deux qui existent. */
export function ongletValide(cle) {
  return cle === ORIGINE.ATELIER ? ORIGINE.ATELIER : ORIGINE.PROJET;
}

/**
 * Ce qu'il faut dire de la visibilité d'une exécution.
 *
 * Trois cas, et le troisième est celui qui compte : une exécution d'Atelier
 * sans propriétaire date d'avant le cloisonnement. Elle est encore lue par tout
 * le monde, et l'écran doit le dire au lieu de la ranger sous une promesse
 * qu'elle ne tient pas.
 */
export function decrireVisibilite(entry = {}) {
  if (origineDe(entry) !== ORIGINE.ATELIER) return null;

  if (entry.privee === true) {
    return {
      marque: true,
      titre: "Atelier — visible par vous seul",
      note: ""
    };
  }

  return {
    marque: false,
    titre: "Atelier — antérieure au cloisonnement, encore visible par le projet",
    note: "antérieure au cloisonnement"
  };
}
