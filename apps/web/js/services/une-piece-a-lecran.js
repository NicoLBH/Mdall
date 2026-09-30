/**
 * Ce qu'on montre d'une pièce jointe : **quand elle date, et si elle se
 * regarde**.
 *
 * ## Deux questions, un seul module, et ce n'est pas un hasard
 *
 * Les deux se posent au même endroit — le dossier des pièces jointes — et
 * tiennent au même fait : **une pièce n'existe pas seule**. Elle est arrivée
 * dans un message, et c'est de lui qu'elle tient sa date ; elle a été décrite
 * par la messagerie qui l'a envoyée, et c'est d'elle qu'elle tient son type.
 *
 * ## La date du message, pas celle du dépôt
 *
 * Verser en une fois six mois de correspondance donne six mois de pièces à la
 * même seconde. Trier là-dessus ne range rien, et une photo de désordre datée
 * du jour où on l'a versée ne vaut rien : ce qu'on veut savoir, c'est **quand
 * elle a été prise**, et le message le dit.
 *
 * Faute de message connu, la date du dépôt — et l'écran dit laquelle des deux
 * il montre. Une date qu'on ne sait pas qualifier se lit comme une date sûre,
 * ce qui est pire que pas de date (règle 5).
 *
 * ## Ce qui se regarde
 *
 * **Le type déclaré d'abord, l'extension ensuite.** Une photo d'appareil arrive
 * parfois en `.jpeg`, parfois sans extension du tout ; son type, lui, est écrit
 * par la messagerie. Mais une pièce versée avant qu'on garde le type n'en a
 * pas, et l'extension est alors tout ce qui reste.
 *
 * On ne restreint pas à trois formats : le navigateur en lit une douzaine, et
 * une liste courte écartait des plans au motif qu'ils étaient en `.webp`.
 *
 * ## Il est pur
 *
 * Des lignes de documents entrent, des valeurs sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les extensions d'image que tout navigateur sait afficher.
 *
 * Elles ne servent qu'à **rattraper un type manquant**. `.heic` n'y est pas :
 * Safari le lit, les autres non, et proposer d'ouvrir ce qui restera noir vaut
 * moins que de laisser la ligne se télécharger.
 */
export const IMAGES_CONNUES = [
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif", "ico", "tif", "tiff"
];

/** L'extension d'un nom de fichier, en minuscules, sans le point. */
export function lextension(nom) {
  const marque = texte(nom).toLowerCase().match(/\.([^.\\/]+)$/);
  return marque ? marque[1] : "";
}

/**
 * Cette pièce se regarde-t-elle comme une image ?
 *
 * `image/svg+xml` en est une : elle s'affiche dans une balise `img`, qui ne
 * l'exécute pas — c'est la différence avec une insertion dans la page.
 */
export function cestUneImageAffichable(document = null) {
  const type = texte(document?.mimeType).toLowerCase();
  if (type.startsWith("image/")) return true;
  if (type) return false;

  // Sans type déclaré, l'extension est tout ce qui reste.
  const nom = texte(document?.fileName) || texte(document?.name) || texte(document?.originalFilename);
  return IMAGES_CONNUES.includes(lextension(nom));
}

/**
 * La date d'une pièce, et d'où elle vient.
 *
 * @param {object} piece la ligne de la pièce
 * @param {Map<string, object>} parId les messages, par identifiant de document
 * @returns {{quand: string, duMessage: boolean}}
 */
export function laDateDunePiece(piece = null, parId = new Map()) {
  const parent = parId instanceof Map ? parId.get(texte(piece?.pieceDuMessage)) : null;
  const duMessage = texte(parent?.mailQuand);
  if (duMessage) return { quand: duMessage, duMessage: true };
  return { quand: texte(piece?.createdAt), duMessage: false };
}

/**
 * Les messages rangés par identifiant, pour retrouver le porteur d'une pièce.
 *
 * **Fait une fois pour toute la liste.** Chercher le message d'une pièce en
 * parcourant tous les documents à chaque ligne rend un dossier de trois cents
 * pièces en quelques centaines de milliers de comparaisons.
 */
export function lesMessagesParId(documents = []) {
  return new Map((Array.isArray(documents) ? documents : [])
    .filter((un) => texte(un?.id))
    .map((un) => [texte(un.id), un]));
}

/**
 * Les pièces d'un message, telles qu'elles existent en base.
 *
 * ## Pourquoi il faut les apparier
 *
 * Le fil est lu **dans le fichier** : ses pièces jointes sont des noms et des
 * tailles, pas des lignes de base. Cliquer dessus ne menait donc nulle part —
 * on voyait la pastille d'un plan sans pouvoir l'ouvrir, ce qui est la pire
 * façon de montrer qu'un plan existe.
 *
 * Le dépôt a écrit chaque pièce comme un document, avec `piece_du_message`
 * pointant sur le message. On apparie **par le nom**, qui est ce que les deux
 * côtés portent.
 *
 * ## Deux pièces du même nom
 *
 * Un message peut en porter deux — `image001.png` et `image001.png`. On les
 * apparie alors dans l'ordre où elles viennent, et chaque ligne de base n'est
 * donnée qu'une fois : mieux vaut deux pastilles dont l'une ouvre la mauvaise
 * pièce que deux pastilles qui pointent toutes les deux sur la même.
 *
 * @param {object[]} pieces ce que le fichier déclare
 * @param {object[]} lignes les documents dont `pieceDuMessage` est ce message
 */
export function lesPiecesAppariees(pieces = [], lignes = []) {
  const restantes = new Map();
  for (const une of Array.isArray(lignes) ? lignes : []) {
    const nom = (texte(une?.originalFilename) || texte(une?.fileName) || texte(une?.name))
      .toLowerCase();
    if (!nom) continue;
    if (!restantes.has(nom)) restantes.set(nom, []);
    restantes.get(nom).push(une);
  }

  return (Array.isArray(pieces) ? pieces : []).map((une) => {
    const file = restantes.get(texte(une?.nom).toLowerCase());
    const ligne = file?.shift() ?? null;
    return { ...une, id: texte(ligne?.id) || "" };
  });
}

/** Les lignes qui sont des pièces de ce message. */
export function lesLignesDuMessage(documents = [], messageId = "") {
  const id = texte(messageId);
  if (!id) return [];
  return (Array.isArray(documents) ? documents : [])
    .filter((un) => texte(un?.pieceDuMessage) === id);
}
