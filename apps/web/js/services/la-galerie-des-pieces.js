/**
 * La galerie : **toutes les pièces d'un coup, avec la date de leur message**.
 *
 * ## Le bénéfice le plus évident, et le moins cher
 *
 * Copier-coller sa messagerie dans Mdall ne rend rien pour l'instant : les
 * mails sont du carburant. Ce qui se voit tout de suite, c'est de pouvoir
 * regarder **toutes les pièces jointes réunies** sans rouvrir les messages un à
 * un — et les photos en grille, qui sont ce qu'un chantier produit le plus.
 *
 * ## Deux familles, et elles ne se regardent pas pareil
 *
 * Une **photo** se regarde en vignettes, par date : c'est un relevé de
 * chantier, et ce qu'on y cherche est visuel. Un **document** se lit par son
 * nom, et s'ouvre. Les mélanger dans une grille ferait des rectangles gris au
 * milieu des photos.
 *
 * ## Ce qui n'y entre pas
 *
 * Les **images du corps** — signatures, bandeaux, logos. Elles sont des images,
 * elles ont une date, et elles noieraient la galerie sous huit exemplaires du
 * même logo par message. Le dépôt les marque déjà comme telles.
 *
 * ## Il est pur
 *
 * Des lignes de documents entrent, des groupes sortent. Aucune lecture.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qui se regarde comme une image.
 *
 * **Le type déclaré, pas l'extension.** Une photo d'appareil arrive parfois en
 * `.jpeg`, parfois sans extension du tout ; son type, lui, est écrit par la
 * messagerie qui l'a envoyée.
 */
export function cestUneImage(document = null) {
  return texte(document?.mimeType).toLowerCase().startsWith("image/");
}

/** Cette ligne est-elle une pièce jointe de mail ? */
export function cestUnePieceJointe(document = null) {
  return document?.pieceDansLeTexte !== undefined && document?.pieceDansLeTexte !== null;
}

/**
 * Ce qui entre dans la galerie : les pièces, sans les images du corps.
 *
 * Une pièce dont on ne sait pas si elle est une image du corps y entre : ne pas
 * savoir n'autorise pas à l'écarter (règle 5). Elle a été déposée avant qu'on
 * garde cette information, et l'écarter ferait disparaître des plans.
 */
export function lesPiecesRegardables(documents = []) {
  return (Array.isArray(documents) ? documents : [])
    .filter(cestUnePieceJointe)
    .filter((un) => un.pieceDansLeTexte !== true);
}

/**
 * La galerie, en deux familles, chacune du plus récent au plus ancien.
 *
 * La date est celle du **message**, pas celle du dépôt : deux cents mails
 * déposés le même jour porteraient tous la même, et l'on ne retrouverait rien.
 * Faute de message connu, la date du dépôt — et l'écran le dira.
 */
export function laGalerie(documents = [], messages = []) {
  const parId = new Map((Array.isArray(messages) ? messages : [])
    .map((un) => [texte(un?.id), un]));

  const pieces = lesPiecesRegardables(documents).map((un) => {
    const message = parId.get(texte(un?.pieceDuMessage)) ?? null;
    return {
      ...un,
      // Ce qu'on affiche sous la vignette : la date du message, et de qui.
      quand: texte(message?.mailQuand) || texte(un?.createdAt),
      quandEstCelleDuMessage: Boolean(texte(message?.mailQuand)),
      de: texte(message?.mailDe),
      objet: texte(message?.mailObjet)
    };
  });

  const parLeTemps = (gauche, droite) => {
    const a = Date.parse(gauche.quand);
    const b = Date.parse(droite.quand);
    // Ce qui n'a pas de date lisible passe à la fin : lui inventer un moment
    // le mettrait au milieu des autres sans qu'on sache pourquoi.
    return (Number.isFinite(b) ? b : -Infinity) - (Number.isFinite(a) ? a : -Infinity);
  };

  return {
    images: pieces.filter(cestUneImage).sort(parLeTemps),
    documents: pieces.filter((un) => !cestUneImage(un)).sort(parLeTemps)
  };
}

/**
 * Ce qu'on dit de la galerie, en une phrase.
 *
 * Vide quand il n'y a rien : « 0 pièce » apprend à ne plus lire les phrases.
 */
export function phraseDeLaGalerie(galerie = null) {
  const images = galerie?.images?.length ?? 0;
  const documents = galerie?.documents?.length ?? 0;
  if (!images && !documents) return "";

  const dits = [];
  if (images) dits.push(`${images} ${images > 1 ? "photos" : "photo"}`);
  if (documents) dits.push(`${documents} ${documents > 1 ? "documents" : "document"}`);
  return dits.join(" · ");
}

/**
 * Ce qu'on dit des pièces dont on ne connaît pas le message.
 *
 * **On ne se tait pas.** Une date de dépôt présentée comme une date de message
 * ferait chercher un échange qui n'existe pas à ce moment-là (règle 5).
 */
export function phraseDesSansProvenance(galerie = null) {
  const toutes = [...(galerie?.images ?? []), ...(galerie?.documents ?? [])];
  const sans = toutes.filter((une) => !une.quandEstCelleDuMessage).length;
  if (!sans) return "";

  return `${sans} ${sans > 1 ? "pièces ne savent pas" : "pièce ne sait pas"} `
    + `de quel message ${sans > 1 ? "elles viennent" : "elle vient"} : `
    + `${sans > 1 ? "elles portent" : "elle porte"} la date de leur dépôt.`;
}
