/**
 * Le document refait, **relu depuis Fichiers** quand on rouvre une lecture.
 *
 * ## Ce qui s'était perdu
 *
 * Une lecture de compte rendu produit deux choses : une **analyse** — les
 * points relevés, la confrontation au projet — et un **document refait**, le
 * Markdown que le modèle a produit et que l'analyse a relu. L'analyse se
 * conserve avec la lecture ; le document refait, non : c'est de loin la plus
 * grosse part, et il est déjà posé dans Fichiers, sur la ligne du compte rendu
 * (`documents.transcription_markdown`).
 *
 * Le rouvrir ne montrait donc plus que l'analyse, et l'onglet du document avait
 * disparu avec elle. On voyait ce que la lecture avait conclu sans pouvoir
 * voir **sur quoi** — or c'est exactement la question qu'on se pose en
 * rouvrant : « d'où sort ce point-là ? ».
 *
 * ## Il se relit, il ne se recopie pas
 *
 * Le garder une seconde fois dans la lecture aurait fait deux copies du même
 * document, qui divergent à la première retouche de l'une (règle 4). On va
 * donc le chercher là où il vit, par l'identifiant du document que la lecture
 * porte déjà.
 *
 * ## Ce qu'il ne prétend pas savoir
 *
 * Une restitution fraîche porte ses mesures : les mots retrouvés, les titres
 * inventés, les pages absentes, ce qu'elle a coûté. **Rien de cela n'est
 * conservé**, et rien de cela n'est reconstitué ici : les cartes de mesure
 * n'apparaissent pas, plutôt que d'afficher des zéros qui se liraient comme des
 * résultats (règle 5).
 *
 * Il ne connaît pas non plus les pages : le Markdown rangé est un texte
 * continu. La lecture « Origine », qui met un numéro de page en regard de
 * chaque ligne, n'est donc pas offerte — une page devinée serait une provenance
 * inventée.
 *
 * ## Il est pur
 *
 * Un texte entre, un état d'affichage sort.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le document refait, prêt à s'afficher, ou `null` quand il n'y en a pas.
 *
 * `null` dit **deux choses différentes** selon ce qu'on lui a passé, et c'est
 * l'appelant qui le sait : une lecture en base qui a échoué, ou un document
 * sans transcription. L'écran le dira ; ce module n'en décide pas.
 *
 * @param {string} markdown le Markdown rangé dans Fichiers
 * @returns {{texte: string, lignes: {rang: number, texte: string}[]}|null}
 */
export function laRestitutionRelue(markdown = "") {
  const dit = String(markdown ?? "");
  if (!texte(dit)) return null;

  return {
    texte: dit,
    // Le rang part de 1 : c'est un numéro de ligne, et on le cite.
    lignes: dit.split("\n").map((ligne, rang) => ({ rang: rang + 1, texte: ligne }))
  };
}

/**
 * Ce que l'écran dit au-dessus d'un document relu.
 *
 * **Il ne vient pas de cette lecture-ci**, et le taire ferait croire qu'il a
 * été refait aujourd'hui, avec les mesures d'aujourd'hui.
 */
export const DIT_DE_LA_RELUE =
  "Ce document vient de Fichiers, où la lecture l'avait rangé : il n'est pas "
  + "conservé une seconde fois avec l'analyse. Ses mesures — mots retrouvés, "
  + "titres inventés, pages absentes — n'ont pas été gardées, et ne sont donc "
  + "pas affichées.";

/** Ce qu'on dit quand le document refait ne se retrouve pas. */
export const DIT_SANS_RELUE =
  "Le document refait ne se retrouve pas dans Fichiers. Ce n'est pas qu'il "
  + "était vide : on ne sait pas où il est passé. L'analyse ci-contre, elle, "
  + "reste celle du jour de la lecture.";
