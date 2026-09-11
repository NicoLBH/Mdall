/**
 * Pourquoi la liste des sujets est vide.
 *
 * ## Le silence qui se prend pour une panne
 *
 * Un tableau vide sous « Aucun résultat pour les filtres actuels » ne dit pas
 * lequel des filtres a vidé la liste, ni s'il y avait quelque chose à vider. On
 * clique « Fermés », rien n'apparaît, et deux lectures sont possibles :
 *
 *  - le projet n'a fermé aucun sujet — la liste est vide **et c'est juste** ;
 *  - le filtre ne fait pas son travail.
 *
 * Rien à l'écran ne permet de trancher, et l'on conclut au défaut. C'est la
 * règle 5 appliquée à un tableau : ne pas savoir pourquoi c'est vide n'autorise
 * pas l'écran à se taire.
 *
 * ## Ce qu'elle dit, et ce qui la rend utile
 *
 * **Le nombre qui existe ailleurs.** « Aucun sujet fermé. Les 63 sujets de ce
 * projet sont ouverts » répond à la question sans qu'on ait à cliquer
 * l'autre bouton. C'est le seul renseignement qui distingue vraiment un
 * projet sans sujet fermé d'un filtre en panne.
 *
 * ## L'ordre, et pourquoi celui-là
 *
 * Ce qu'on vient de faire d'abord. Une recherche en cours explique une liste
 * vide mieux que tout le reste — c'est le dernier geste, et c'est celui qu'on
 * défait en premier. Le statut ensuite, la priorité enfin : elle se règle dans
 * un menu qu'on oublie plus facilement qu'un champ où l'on a tapé.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Math.max(0, Number(valeur)) : 0);

const PRIORITES = {
  critical: "critique",
  high: "haute",
  medium: "moyenne",
  low: "basse"
};

/**
 * Ce qu'un tableau vide doit dire de lui-même.
 *
 * @param {object} options
 * @param {string} [options.statut] `"open"` ou `"closed"`
 * @param {string} [options.priorite] la priorité filtrée, ou rien
 * @param {string} [options.recherche] ce qui est tapé dans le champ
 * @param {{open?: number, closed?: number}} [options.comptes] ce que porte le projet
 * @param {boolean} [options.paginee] vrai quand la liste est paginée
 * @returns {{titre: string, explication: string}}
 */
export function videDeLaListeDesSujets({
  statut = "open",
  priorite = "",
  recherche = "",
  comptes = {},
  paginee = false
} = {}) {
  const cherche = texte(recherche);
  const ferme = statut === "closed";
  const ouverts = nombre(comptes.open);
  const fermes = nombre(comptes.closed);

  if (cherche) {
    return {
      titre: "Aucun résultat",
      explication: `Rien ne correspond à « ${cherche} » parmi les sujets ${
        ferme ? "fermés" : "ouverts"
      }. Effacer la recherche les remontrera tous.`
    };
  }

  // Le cas qui a fait douter du filtre. On ne dit pas seulement « il n'y en a
  // pas » : on dit **combien il y en a de l'autre côté**, et c'est ce qui
  // permet de conclure sans cliquer.
  if (ferme && fermes === 0) {
    return {
      titre: "Aucun sujet fermé",
      explication: ouverts > 0
        ? `Aucun sujet de ce projet n'a encore été fermé. Les ${ouverts} sujets qu'il porte sont ouverts.`
        : "Ce projet ne porte encore aucun sujet."
    };
  }

  if (!ferme && ouverts === 0) {
    return {
      titre: "Aucun sujet ouvert",
      explication: fermes > 0
        ? `Tout est traité : les ${fermes} sujets de ce projet sont fermés.`
        : "Ce projet ne porte encore aucun sujet."
    };
  }

  const nommee = PRIORITES[texte(priorite)] ?? texte(priorite);
  if (nommee) {
    return {
      titre: "Aucun résultat",
      explication: `Aucun sujet ${ferme ? "fermé" : "ouvert"} n'est de priorité ${nommee}.`
    };
  }

  // Il reste le cas d'une page au-delà de la dernière : la liste n'est pas
  // vide, c'est la page qui l'est, et revenir en arrière suffit.
  return {
    titre: "Aucun résultat",
    explication: paginee
      ? "Cette page ne porte aucun sujet. Les précédentes en portent."
      : "Aucun résultat pour les filtres actuels."
  };
}
