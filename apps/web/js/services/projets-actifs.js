/**
 * Les projets où l'on travaille vraiment, et ce qui vient de s'y passer.
 *
 * ## La question, et pourquoi le compte d'événements y répond mal
 *
 * « Mes cinq projets les plus actifs » veut dire : *ceux que j'ai dans les
 * mains en ce moment*. Compter les événements y répond de travers — un versement
 * de deux cents pièces un mardi matin ferait passer devant un projet qu'on n'a
 * pas rouvert depuis. Le nombre dirait « très actif » là où il s'est passé une
 * seule chose, une seule fois.
 *
 * ## Ce qu'on compte : **des jours**
 *
 * Le nombre de **jours distincts** où l'on y a fait quelque chose, sur les
 * quatre-vingt-dix derniers. Un projet ouvert tous les matins pendant trois
 * semaines compte vingt jours ; un projet où l'on a tout déposé d'un coup en
 * compte un. C'est exactement la différence qu'on cherche, et elle tient en une
 * phrase qu'on peut afficher à l'écran — un classement qu'on ne sait pas
 * expliquer est un classement qu'on soupçonne.
 *
 * Aucun réglage, aucune pondération : trois sources valent pareil, parce qu'on
 * ne saurait pas justifier qu'une vaille 1,4 fois l'autre. Un poids qu'on ne
 * peut pas défendre est un poids qu'on finira par retoucher au hasard.
 *
 * ## Ce que sont les traces, et pourquoi celles-là
 *
 * Trois, et **toutes miennes** : une discussion avec le Copilote, une
 * proposition que j'ai ouverte, une étude d'utilitaire que j'ai remplie. Elles
 * ont deux vertus rares : la base me les rend sans que j'aie à demander projet
 * par projet, et elles ne portent que mon travail — pas celui de l'équipe.
 *
 * Les dépôts de documents en seraient une quatrième, et la plus parlante ; la
 * table ne dit pas **qui** a déposé, et « le projet a bougé » n'est pas « j'y ai
 * travaillé ». On ne les compte donc pas, plutôt que de compter le travail des
 * autres sous le mien (règle 5).
 *
 * ## Les mêmes traces servent deux fois
 *
 * Le classement les compte, les actualités montrent les dernières. Deux
 * lectures séparées auraient fini par ne plus dire la même chose du même projet
 * (règle 4), et coûté deux fois le voyage.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une trace peut être. Le genre sert à la nommer à l'écran. */
export const GENRE = {
  DISCUSSION: "discussion",
  PROPOSITION: "proposition",
  ETUDE: "etude"
};

/** Combien de jours en arrière on regarde. */
export const FENETRE_EN_JOURS = 90;

const JOUR = 24 * 60 * 60 * 1000;

/** Le jour d'un instant, en `AAAA-MM-JJ`, ou `""` quand la date est illisible. */
export function jourDe(quand = "") {
  const lu = Date.parse(texte(quand));
  return Number.isFinite(lu) ? new Date(lu).toISOString().slice(0, 10) : "";
}

/** Les traces lisibles et récentes, les plus récentes d'abord. */
function tracesRetenues(traces = [], maintenant = Date.now(), fenetreEnJours = FENETRE_EN_JOURS) {
  const depuis = maintenant - Math.max(1, fenetreEnJours) * JOUR;

  return (Array.isArray(traces) ? traces : [])
    .map((trace) => {
      const lu = Date.parse(texte(trace?.quand));
      return {
        projet: texte(trace?.projet),
        genre: texte(trace?.genre),
        quoi: texte(trace?.quoi),
        quand: texte(trace?.quand),
        instant: Number.isFinite(lu) ? lu : null
      };
    })
    // **Une trace sans projet ou sans date ne compte pas.** Elle ne dit pas où
    // ni quand : la ranger quelque part reviendrait à lui inventer une place.
    .filter((trace) => trace.projet && trace.instant !== null && trace.instant >= depuis)
    .sort((gauche, droite) => droite.instant - gauche.instant);
}

/**
 * Mes projets, rangés par nombre de jours travaillés.
 *
 * **À égalité, le plus récent passe devant.** Deux projets à trois jours ne se
 * valent pas : celui d'hier est celui qu'on a dans les mains.
 *
 * @param {object} options
 * @param {{projet: string, quand: string, genre: string, quoi: string}[]} options.traces
 * @param {Record<string, string>} [options.nomsDesProjets]
 * @param {number} [options.maintenant]
 * @param {number} [options.combien] cinq, à l'écran
 * @returns {{id: string, nom: string, jours: number, dernier: string, genres: string[]}[]}
 */
export function projetsLesPlusActifs({
  traces = [], nomsDesProjets = {}, maintenant = Date.now(),
  combien = 5, fenetreEnJours = FENETRE_EN_JOURS
} = {}) {
  const noms = nomsDesProjets && typeof nomsDesProjets === "object" ? nomsDesProjets : {};
  const parProjet = new Map();

  for (const trace of tracesRetenues(traces, maintenant, fenetreEnJours)) {
    if (!parProjet.has(trace.projet)) {
      parProjet.set(trace.projet, { jours: new Set(), genres: new Set(), dernier: trace.quand });
    }
    const sien = parProjet.get(trace.projet);
    sien.jours.add(jourDe(trace.quand));
    if (trace.genre) sien.genres.add(trace.genre);
  }

  return [...parProjet.entries()]
    .map(([id, sien]) => ({
      id,
      // Un projet qu'on ne sait pas nommer montre son identifiant : une ligne
      // vide ferait croire à un projet sans nom (règle 5).
      nom: texte(noms[id]) || id,
      jours: sien.jours.size,
      dernier: sien.dernier,
      genres: [...sien.genres]
    }))
    .sort((gauche, droite) => (droite.jours - gauche.jours)
      || Date.parse(droite.dernier) - Date.parse(gauche.dernier))
    .slice(0, Math.max(0, combien));
}

/**
 * Ce qui vient de se passer : les dernières traces, nommées.
 *
 * **Une par ligne, et le projet avec.** « Une proposition ouverte » ne dit rien
 * sans dire où — c'est justement ce que l'accueil a de plus qu'un écran de
 * projet.
 *
 * @returns {{genre: string, quoi: string, projet: string, nomDuProjet: string,
 *   quand: string}[]}
 */
export function actualitesRecentes({
  traces = [], nomsDesProjets = {}, maintenant = Date.now(), combien = 4,
  // **Les actualités regardent plus loin que le classement.** Un mois sans rien
  // faire ne doit pas rendre l'accueil muet : on montre ce qu'il y a, même si
  // c'est vieux, et la date le dit.
  fenetreEnJours = 365
} = {}) {
  const noms = nomsDesProjets && typeof nomsDesProjets === "object" ? nomsDesProjets : {};

  return tracesRetenues(traces, maintenant, fenetreEnJours)
    .slice(0, Math.max(0, combien))
    .map((trace) => ({
      genre: trace.genre,
      quoi: trace.quoi,
      projet: trace.projet,
      nomDuProjet: texte(noms[trace.projet]) || trace.projet,
      quand: trace.quand
    }));
}

/**
 * Le nombre de jours, dit en toutes lettres.
 *
 * Le classement s'affiche à côté de ce qu'il compte : « 12 jours », et non un
 * score sans unité que personne ne peut vérifier.
 */
export function phraseDesJours(jours = 0) {
  const compte = Number(jours) || 0;
  if (compte <= 0) return "";
  return `${compte} jour${compte > 1 ? "s" : ""}`;
}
