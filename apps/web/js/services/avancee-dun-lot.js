/**
 * Où en est une modification qui porte sur beaucoup de sujets.
 *
 * ## Pourquoi il fallait le dire
 *
 * Poser un label sur quarante sujets, c'est quarante écritures en base, l'une
 * après l'autre, puis une relecture complète de la liste. Cela prend plusieurs
 * secondes, et pendant ces secondes l'écran ne bougeait pas : on recliquait, on
 * doutait d'avoir cliqué, on changeait de filtre au milieu. Une attente qui ne
 * se voit pas se lit comme une panne.
 *
 * Ce qui manque n'est pas un sablier — un sablier dit « attends » et rien de
 * plus. Ce qu'on veut savoir, c'est **combien c'est fait**, parce que c'est la
 * seule chose qui distingue une écriture lente d'une écriture bloquée.
 *
 * ## Les trois états, et pourquoi le troisième existe
 *
 * En cours, terminé, et **en souci**. Une modification de lot peut échouer au
 * douzième sujet ; se taire alors afficherait « terminé » sur un rangement fait
 * à moitié, et l'on ne s'en apercevrait qu'en cherchant, des semaines plus tard,
 * pourquoi douze sujets n'ont pas le label qu'on croyait leur avoir posé
 * (`docs/fondamentaux.md`, règle 5). L'échec se dit, et il dit ce qui est passé.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il n'écrit rien, ne lit ni la base ni le store, ne dessine pas et ne compte
 * pas le temps : on lui donne où l'on en est, il rend ce qu'il y a à montrer.
 * C'est l'écran qui applique, et c'est lui qui tient la minuterie.
 */

const texte = (valeur) => String(valeur ?? "").trim();

const entier = (valeur) => Math.max(0, Math.trunc(Number(valeur) || 0));

export const TON = {
  COURS: "cours",
  FINI: "fini",
  SOUCI: "souci"
};

/**
 * L'icône de chaque état.
 *
 * **Le cercle se remplit, la coche conclut, le triangle alerte.** Les trois
 * viennent du jeu de l'application : en inventer une ici ferait une icône que
 * nul autre écran ne peut reprendre.
 */
export const ICONES_DU_TON = {
  [TON.FINI]: "check",
  [TON.SOUCI]: "alert"
};

/** Ce qu'on dit quand l'échec n'a pas de phrase à lui. */
export const PHRASE_DU_SOUCI = "La modification n'a pas abouti";

/**
 * Où en est le lot, prêt à dessiner.
 *
 * @param {object} options
 * @param {number} options.faits combien de sujets sont écrits
 * @param {number} options.total combien il y en a en tout
 * @param {string} [options.souci] ce qui a échoué, s'il y a lieu
 * @param {boolean} [options.fini] l'écriture est allée jusqu'au bout
 * @returns {{ton: string, faits: number, total: number, part: number,
 *   phrase: string, icone: string}}
 */
export function avanceeDunLot({ faits = 0, total = 0, souci = "", fini = false } = {}) {
  const enTout = entier(total);
  // **Jamais plus que le total.** Un compte qui dépasse ferait une barre remplie
  // au-delà de son cadre, et un « 41/40 » qui fait douter de tout le reste.
  const combien = Math.min(entier(faits), enTout || entier(faits));
  const dit = texte(souci);

  const ton = dit ? TON.SOUCI : (fini ? TON.FINI : TON.COURS);

  return {
    ton,
    faits: combien,
    total: enTout,
    // La part sert au remplissage du cercle. Sans total connu, elle vaut zéro :
    // un cercle plein sur un lot qu'on n'a pas compté dirait « c'est fait ».
    part: enTout > 0 ? combien / enTout : 0,
    phrase: phraseDeLAvancee({ ton, faits: combien, total: enTout, souci: dit }),
    icone: ICONES_DU_TON[ton] ?? ""
  };
}

/**
 * Ce qui s'écrit à droite du cercle.
 *
 * **Pendant, on compte ; après, on conclut.** Le compte n'a d'intérêt que tant
 * qu'il bouge : le laisser affiché une fois fini ferait relire « 40/40 » pour
 * comprendre que c'est terminé, alors que le mot le dit.
 */
export function phraseDeLAvancee({ ton = TON.COURS, faits = 0, total = 0, souci = "" } = {}) {
  if (ton === TON.SOUCI) return texte(souci) || PHRASE_DU_SOUCI;
  if (ton === TON.FINI) return "Terminé";

  const enTout = entier(total);
  if (!enTout) return "Modification en cours…";

  return `${entier(faits)}/${enTout} sujet${enTout > 1 ? "s" : ""}`;
}

/**
 * Combien de temps la notification reste, une fois le lot passé.
 *
 * **Un échec reste plus longtemps qu'une réussite.** « Terminé » se comprend
 * d'un coup d'œil ; une phrase qui dit ce qui a échoué se lit, et une
 * notification qui s'efface avant qu'on l'ait lue équivaut à se taire
 * (règle 5).
 */
export const COMBIEN_RESTE_LAVANCEE = { FINI: 2400, SOUCI: 6000 };
