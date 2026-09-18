/**
 * Lire un fichier de texte : en code, et rendu.
 *
 * ## Ce qui manquait
 *
 * On sait maintenant **écrire** un fichier à la main dans Fichiers, et l'on ne
 * savait pas le **relire**. Un `.md` déposé ou collé y restait une ligne dans
 * un tableau : le seul moyen de voir ce qu'il portait était de le télécharger
 * et de l'ouvrir ailleurs.
 *
 * ## Deux lectures, et pourquoi pas une seule
 *
 * **Code** : le Markdown tel quel, ligne à ligne, numéroté. C'est la lecture
 * qui dit ce que le fichier porte *vraiment* — un titre est un `#`, un tableau
 * est fait de barres. Elle se cite aussi : « ligne 42 » désigne un endroit.
 *
 * **Aperçu** : le document rendu, comme il se lira. C'est la lecture qui dit ce
 * que le fichier *veut dire* — et c'est celle qu'on veut quand on colle une
 * notice de trois cents lignes pour vérifier qu'elle est entière.
 *
 * Aucune des deux ne remplace l'autre, et c'est pourquoi il y en a deux. La
 * Mémoire et la restitution de l'Atelier nomment déjà ces lectures « Code » et
 * « Aperçu » : un même geste ne s'appelle pas de deux façons selon l'écran
 * (règle 10).
 *
 * ## L'aperçu n'est offert que s'il veut dire quelque chose
 *
 * Un `.ref` ou un `.json` rendus en Markdown ne donnent pas un document : ils
 * donnent le même texte, sans ses retours à la ligne. Un bouton qui mène à cela
 * se clique une fois, et l'on cesse de regarder la barre entière. Ces fichiers
 * n'ont donc qu'une lecture, et c'est la bonne.
 *
 * ## Un fichier de texte n'a pas de pages, sauf s'il en porte
 *
 * Un compte rendu rangé par l'Atelier garde ses marqueurs `<!-- page n -->` :
 * c'est ce qui permet de le confronter au PDF page à page. Un fichier écrit à
 * la main n'en a pas, et il ne faut pas lui en inventer — mais il ne faut pas
 * non plus le déclarer illisible pour autant. Il est **un seul bloc**, et
 * `paginé` dit lequel des deux cas on a.
 *
 * ## Il est pur
 *
 * Du texte entre, des lignes et des pages sortent. Aucun réseau.
 */

import { EXTENSIONS_ECRITES, extensionDe } from "./fichier-a-la-main.js";
import { assemblerLeMarkdown, pagesDuFichierMarkdown } from "./reconstitution-markdown.js";
import { lignesDuFichier } from "./transcription-du-document.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les fichiers que cet écran sait relire.
 *
 * **Les mêmes que ceux qu'on sait écrire**, et lus au même endroit : une liste
 * recopiée ici aurait divergé à la première extension ajoutée, et l'on aurait
 * pu créer un fichier qu'on ne pourrait pas rouvrir (règle 10).
 */
export const EXTENSIONS_LISIBLES = EXTENSIONS_ECRITES;

/**
 * Celles qui veulent dire quelque chose une fois rendues.
 *
 * Markdown, et rien d'autre. `.txt` n'est pas du Markdown : le rendre
 * transformerait ses listes en paragraphes et ses lignes en une seule.
 */
export const EXTENSIONS_RENDUES = [".md"];

/** Les deux façons de regarder un fichier. Les mêmes mots que la Mémoire. */
export const LECTURE_DU_TEXTE = { CODE: "code", APERCU: "apercu" };

export const NOMS_DE_LA_LECTURE = {
  [LECTURE_DU_TEXTE.APERCU]: "Aperçu",
  [LECTURE_DU_TEXTE.CODE]: "Code"
};

export const QUOI_DE_LA_LECTURE = {
  [LECTURE_DU_TEXTE.APERCU]: "Le document rendu, comme il se lira.",
  [LECTURE_DU_TEXTE.CODE]: "Le fichier tel quel, ligne à ligne."
};

/** Le nom d'un document, d'où qu'il vienne. */
export function nomDuFichier(document = null) {
  if (typeof document === "string") return texte(document);
  return texte(document?.name)
    || texte(document?.original_filename)
    || texte(document?.originalFilename)
    || texte(document?.filename)
    || texte(document?.fileName);
}

/** Ce fichier se lit-il comme du texte ? */
export function estUnFichierTexte(document = null) {
  const nom = nomDuFichier(document);
  return nom ? EXTENSIONS_LISIBLES.includes(extensionDe(nom)) : false;
}

/** Et se rend-il ? */
export function seRendEnMarkdown(document = null) {
  const nom = nomDuFichier(document);
  return nom ? EXTENSIONS_RENDUES.includes(extensionDe(nom)) : false;
}

/**
 * Les lectures offertes pour ce fichier.
 *
 * Toujours le code ; l'aperçu quand il y a quelque chose à rendre. Une seule
 * lecture n'est pas un choix : la barre ne s'affiche alors pas, et l'écran
 * montre ce qu'il a.
 */
export function lecturesDuFichier(document = null) {
  return seRendEnMarkdown(document)
    ? [LECTURE_DU_TEXTE.APERCU, LECTURE_DU_TEXTE.CODE]
    : [LECTURE_DU_TEXTE.CODE];
}

/** La lecture d'ouverture : rendue quand c'est possible, le code sinon. */
export function lectureParDefaut(document = null) {
  return lecturesDuFichier(document)[0];
}

/**
 * Ce que le fichier contient, prêt à être montré.
 *
 * `null` quand la lecture a échoué — différent d'un fichier vide, qui est une
 * réponse (règle 5). C'est l'appelant qui distingue les deux : ici, `null`
 * n'entre pas.
 *
 * @returns {{lignes: object[], pages: object[], pagine: boolean, caracteres: number}}
 */
export function leFichierLu(contenu = "") {
  const tout = String(contenu ?? "");
  const pages = pagesDuTexte(tout);

  return {
    lignes: lignesDuFichier(tout),
    pages,
    // **Paginé, ou d'un seul tenant.** Ce n'est pas un détail d'affichage :
    // seul un fichier paginé se confronte page à page au PDF dont il vient.
    pagine: pages.length > 0 && aDesMarqueurs(tout),
    caracteres: tout.length
  };
}

/** Le texte porte-t-il les marqueurs de page d'une restitution rangée ? */
function aDesMarqueurs(contenu = "") {
  return pagesDuFichierMarkdown(contenu).length > 0;
}

/**
 * Les pages du fichier, `{page, markdown}`.
 *
 * Deux cas, et il ne faut pas les confondre :
 *
 *  - le fichier porte des marqueurs `<!-- page n -->` — il vient d'une
 *    restitution rangée, et sa pagination est celle du PDF. On la garde : c'est
 *    elle qui permettra de retrouver la page d'où sort un point ;
 *  - il n'en porte pas — il a été écrit, collé, exporté. Il est **une seule
 *    page**, qui est tout le document.
 *
 * Le second cas mérite un mot, parce que `pagesDuFichierMarkdown` rend une
 * liste vide dans cette situation, et elle a raison de le faire : une
 * restitution sans marqueurs ne peut plus être confrontée au PDF, et la donner
 * pour une page 1 ferait croire à un document d'une page. Ici, il n'y a pas de
 * PDF : le document *est* le texte, et « une page » ne prétend rien de faux.
 */
export function pagesDuTexte(contenu = "") {
  const tout = String(contenu ?? "").replace(/\r\n?/g, "\n");
  const rangees = pagesDuFichierMarkdown(tout);
  if (rangees.length > 0) return rangees;

  const seul = tout.replace(/\s+$/, "");
  return seul ? [{ page: 1, markdown: seul }] : [];
}

/**
 * Les mêmes pages, sous le nom que la chaîne de lecture leur donne.
 *
 * L'Atelier appelle `text` ce que la restitution appelle `markdown` : l'un est
 * ce qui sort du PDF, l'autre ce que le modèle en refait. Pour un fichier de
 * texte, **c'est le même texte** — et c'est précisément ce qui permet de se
 * passer de l'extraction et de la restitution.
 */
export function pagesLuesDuTexte(contenu = "") {
  return pagesDuTexte(contenu).map((page) => ({ page: page.page, text: page.markdown }));
}

/**
 * Ce qu'on dit en tête du fichier.
 *
 * Les lignes et les caractères, comme la Mémoire les dit de ses fichiers. La
 * pagination s'ajoute quand il y en a une — un fichier d'un seul tenant ne dit
 * pas « 1 page », qui se lirait comme une mesure alors que c'est une absence.
 */
export function phraseDuFichier(lu = null) {
  if (!lu) return "";

  const combien = lu.lignes.length;
  const lignes = combien === 1 ? "1 ligne" : `${combien} lignes`;
  const dit = [lignes, `${lu.caracteres} caractères`];
  if (lu.pagine) dit.push(lu.pages.length === 1 ? "1 page" : `${lu.pages.length} pages`);

  return dit.join(" · ");
}

/**
 * Ce qu'un document déjà écrit en texte donne à l'Atelier, **sans appel**.
 *
 * ## Pourquoi cette fonction existe, plutôt que six lignes dans l'écran
 *
 * Parce que c'est elle qui remplace les deux étapes payantes du parcours d'un
 * PDF : l'extraction et la restitution. Écrite dans l'écran, elle ne se serait
 * vérifiée qu'en relisant du code comme du texte, ou par une copie de ses
 * propres hypothèses (fondamental 13, et la façon dont on se le prouve).
 *
 * Ici, on lui donne un document et l'on regarde ce qui sort : les pages, le
 * texte remis bout à bout, les lignes numérotées, et les pages sous le nom que
 * la chaîne de lecture leur donne.
 *
 * ## Ce qu'elle ne rend pas, et c'est délibéré
 *
 * Aucune mesure. Il n'y a rien à comparer : le document *est* la restitution,
 * et « 100 % retrouvé » serait une tautologie présentée comme un résultat.
 *
 * @returns {{pages, texte, lignes, pagesLues}|null} `null` : rien à lire.
 */
export function laRestitutionDunTexte(contenu = "") {
  const pages = pagesDuTexte(contenu);
  if (pages.length === 0) return null;

  // **Assemblé par le service qui assemble déjà les restitutions du modèle.**
  // Un second assemblage aurait numéroté les lignes autrement, et « ligne 214 »
  // n'aurait plus désigné le même endroit selon la provenance du document.
  const assemble = assemblerLeMarkdown(pages);

  return {
    pages,
    texte: assemble.texte,
    lignes: assemble.lignes,
    pagesLues: pagesLuesDuTexte(contenu)
  };
}
