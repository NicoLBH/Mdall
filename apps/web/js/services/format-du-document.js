/**
 * Le format du papier, et la largeur qu'il vaut à l'écran.
 *
 * ## Pourquoi la restitution se lit mal en pleine largeur
 *
 * Un compte rendu est écrit pour une feuille : ses tableaux, ses colonnes et
 * ses retours à la ligne ont été composés pour une largeur d'A4. Étalé sur un
 * écran de 2 000 pixels, le même document devient une bande de texte de deux
 * cents caractères de long — chaque ligne se lit deux fois parce qu'on perd
 * l'origine de la suivante, et les tableaux s'étirent jusqu'à ce que leurs
 * colonnes n'aient plus de rapport avec ce qu'elles portent.
 *
 * On rend donc la restitution **dans la largeur du papier dont elle vient**.
 *
 * ## Ce n'est pas une constante : c'est une mesure
 *
 * Écrire « 794 pixels » quelque part ferait un A4 portrait de tous les
 * documents, y compris des plannings et des tableaux de synthèse qui sont en
 * paysage — et c'est précisément là que la largeur compte. Le PDF connaît la
 * taille de ses pages ; on la lui demande.
 *
 * Un point PostScript vaut 1/72 de pouce, un pixel CSS 1/96 : la conversion est
 * un rapport, pas une table de formats. Elle vaut donc aussi pour l'A3, le
 * Letter et le format bâtard qu'un traceur a produit.
 *
 * Rien ici n'appelle quoi que ce soit : des dimensions entrent, une largeur
 * sort.
 */

/** Un point PostScript fait 1/72 de pouce, un pixel CSS 1/96. */
const PIXELS_PAR_POINT = 96 / 72;

/**
 * En deçà, ce n'est pas une page : c'est une vignette ou une erreur de lecture.
 * Au-delà, c'est un plan — et un plan ne se lit pas en Markdown.
 */
const PLANCHER = 320;
const PLAFOND = 2000;

const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : 0);

/**
 * La largeur d'une page, en pixels d'écran. `0` quand on ne sait pas.
 *
 * **Zéro n'est pas « étroit »** : c'est l'absence de mesure, et l'écran doit
 * pouvoir la distinguer d'une page fine (règle 5).
 */
export function largeurDeLaPage(page = {}) {
  const points = nombre(page?.largeur);
  if (points <= 0) return 0;

  const pixels = Math.round(points * PIXELS_PAR_POINT);
  return pixels >= PLANCHER && pixels <= PLAFOND ? pixels : 0;
}

/**
 * La largeur du document : celle de sa page la plus large.
 *
 * **La plus large, et non la plus fréquente.** Un compte rendu de douze pages
 * portrait dont une seule est un planning paysage doit pouvoir montrer ce
 * planning : le composer dans la largeur des onze autres le tronquerait. Le
 * contraire — onze pages portrait au large — ne coûte que du blanc.
 *
 * @param {object[]} pages les pages lues, chacune portant `largeur` en points
 * @returns {{largeur: number, mesuree: number, total: number}} `largeur: 0`
 *   quand aucune page ne s'est laissé mesurer
 */
export function formatDuDocument(pages = []) {
  const lues = Array.isArray(pages) ? pages : [];
  const largeurs = lues.map(largeurDeLaPage).filter((largeur) => largeur > 0);

  return {
    largeur: largeurs.length > 0 ? Math.max(...largeurs) : 0,
    // Combien de pages ont livré leur géométrie : l'écran ne prétend pas avoir
    // mesuré ce qu'il n'a pas mesuré.
    mesuree: largeurs.length,
    total: lues.length
  };
}

/**
 * Ce qu'il faut dire du format, en une phrase. `""` quand il n'y a rien à dire.
 *
 * Le cas normal — toutes les pages mesurées — ne se commente pas : une phrase
 * qui s'affiche toujours ne s'affiche plus. Seule l'absence de mesure parle,
 * parce qu'elle explique pourquoi la restitution s'étale.
 */
export function phraseDuFormat(format = {}) {
  if (!format?.total) return "";
  if (format.largeur > 0) return "";

  return "La taille des pages n'a pas pu être lue : la restitution s'affiche en pleine largeur, "
    + "et non dans le format du document.";
}
