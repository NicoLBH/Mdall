/**
 * Ce qu'un point a **regardé** : les documents versés dans sa discussion.
 *
 * ## L'étape qui restait creuse
 *
 * Le chemin d'un raisonnement porte cinq étapes. Quatre se remplissent ; celle
 * qui dit **ce qui a été examiné** partait vide, et le graphe l'avouait — « on
 * ne sait pas ce qui a été examiné ». C'était exact, et c'était dommage : quand
 * on débat d'une profondeur de fondation, l'étude géotechnique est jointe au fil,
 * et c'est précisément ce qu'on est allé regarder.
 *
 * ## Trois refus, et le premier est celui qui compte
 *
 * **Une pièce jointe à un échange avec le copilote ne se montre jamais.** Ces
 * conversations sont privées par construction (`visibility = 'ephemeral'`), et
 * le **seul nom de fichier** d'un document qu'on y a déposé suffirait à trahir
 * ce qui s'y est dit. La règle est celle de `ce-que-le-point-nomme.js`, et c'est
 * la même fonction qui la tient : une seconde lecture de la confidentialité
 * finirait par ne pas refuser la même chose (règle 10).
 *
 * **Un dépôt que personne n'a posté ne compte pas.** Une pièce jointe sans
 * `message_id` est un envoi en cours : le fichier existe, personne ne l'a mis
 * dans la discussion. Dire « on a examiné ceci » d'un brouillon serait faux.
 *
 * **Un message qu'on n'a pas lu ne se juge pas.** Si les messages manquent, on
 * ne peut pas savoir lesquels étaient privés — et montrer dans le doute est
 * exactement ce qu'on ne fait pas. L'étape reste alors creuse et le dit (règle 5).
 *
 * ## Le nom du fichier, et rien d'autre
 *
 * Ni le chemin de stockage — qui n'est pas une information de projet —, ni le
 * texte du message auquel il était joint : citer un commentaire ici le sortirait
 * de la conversation où il a été écrit.
 *
 * ## Il est pur
 *
 * Il reçoit les messages et les pièces jointes, et rend une lecture.
 */

import { messageLisible } from "./ce-que-le-point-nomme.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce que ce point a regardé, dans l'ordre où cela est entré dans la discussion.
 *
 * @param {object} options
 * @param {object} [options.point] le point
 * @param {object[]} [options.messages] ses commentaires, bruts
 * @param {object[]} [options.piecesJointes] les pièces jointes, brutes
 * @returns {{quoi: string, ou: string}[]} prêt pour `raisonnementDuPoint`
 */
export function ceQueLePointAExamine({ point = null, messages = [], piecesJointes = [] } = {}) {
  const pointId = texte(point?.id);

  // Les messages qu'on a le droit de lire, par identifiant. Ce qui n'y est pas
  // n'est pas « absent » : c'est « on ne sait pas », et les deux se refusent
  // pareil ici.
  const lisibles = new Set(
    (Array.isArray(messages) ? messages : [])
      .filter((message) => messageLisible(message))
      .map((message) => texte(message?.id))
      .filter(Boolean)
  );

  const vus = new Set();
  const regardes = [];

  for (const piece of trierParArrivee(piecesJointes)) {
    // Les pièces d'un autre point n'ont rien à faire ici : l'appelant peut
    // passer celles d'un projet entier.
    if (pointId && texte(piece?.subject_id) && texte(piece.subject_id) !== pointId) continue;

    // Retirée par celui qui l'avait déposée. La faire parler encore reviendrait
    // à ne pas l'avoir retirée.
    if (texte(piece?.deleted_at)) continue;

    // Sans message, c'est un envoi en cours : personne ne l'a mis dans la
    // discussion, et « on a examiné ceci » serait faux.
    const message = texte(piece?.message_id);
    if (!message || !lisibles.has(message)) continue;

    const nom = texte(piece?.file_name);
    // Le même document joint deux fois n'a été regardé qu'une fois.
    if (!nom || vus.has(nom)) continue;

    vus.add(nom);
    // `ou` reste vide : il dit *où retrouver* ce qu'on a examiné — une page, un
    // article. Un document joint à la discussion du point est déjà là, et
    // écrire « dans la discussion » n'apprendrait rien.
    regardes.push({ quoi: nom, ou: "" });
  }

  return regardes;
}

/** Dans l'ordre où elles sont entrées dans la discussion. */
function trierParArrivee(piecesJointes) {
  return [...(Array.isArray(piecesJointes) ? piecesJointes : [])]
    .sort((gauche, droite) => texte(gauche?.created_at).localeCompare(texte(droite?.created_at)));
}
