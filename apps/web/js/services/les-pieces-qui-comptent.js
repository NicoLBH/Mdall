/**
 * Les pièces jointes qui comptent, et celles qui n'en sont pas.
 *
 * ## Ce qu'un vrai fil a affiché
 *
 *     Pièces jointes : image001.png, image002.png, image003.png, image004.png,
 *     image005.png, image007.png, image009.png, image011.png, bon de commande
 *     socotec.pdf, 23-154-PP-003-f BPAURA Chamonix.pdf, image006.png
 *
 * Onze noms. **Deux comptent.** Les neuf autres sont les morceaux d'un logo et
 * d'un bandeau de signature : ce sont des pièces jointes pour le format du
 * message, pas pour celui qui le lit. Les nommer noie les deux qu'on cherchait.
 *
 * ## Comment on les distingue
 *
 * Par ce que le message **déclare**, pas par leur nom. Une pièce appelée par le
 * corps HTML — un `cid:` — est une image de mise en page ; le lecteur de `.msg`
 * le sait déjà et l'écrit (`dansLeTexte`). Deviner sur le nom aurait écarté la
 * photo d'un désordre appelée `image012.png`, qui est justement ce qu'on veut
 * voir.
 *
 * Quand le message ne déclare rien — un `.eml` sans corps HTML —, on ne devine
 * pas : la pièce compte. Ne pas savoir n'autorise pas à prétendre qu'elle ne
 * sert à rien (règle 5).
 *
 * ## On ne les jette pas
 *
 * Elles sont comptées et dites — « et 9 images de signature ». Les faire
 * disparaître sans le dire laisserait croire à une pièce perdue le jour où le
 * compte ne tombe pas juste.
 *
 * ## Il est pur
 *
 * Des pièces entrent, deux listes sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on montre d'une pièce. */
function uneFois(piece) {
  return {
    nom: texte(piece?.nom) || "sans nom",
    taille: Number(piece?.taille) || 0,
    type: texte(piece?.type),
    // **L'identifiant de la ligne en base, quand il a été retrouvé.** Sans lui,
    // la pastille n'est qu'un nom : on voyait qu'un plan existait sans pouvoir
    // l'ouvrir. Il est posé par `lesPiecesAppariees`, et vaut `""` pour une
    // pièce qu'aucune ligne ne porte — ce qui n'est pas une erreur : une pièce
    // d'un message reconstitué d'une citation n'a jamais été versée.
    id: texte(piece?.id)
  };
}

/**
 * Les pièces d'un message, rangées en deux.
 *
 * @returns {{gardees: object[], cachees: object[]}}
 */
export function lesPiecesQuiComptent(pieces = []) {
  const gardees = [];
  const cachees = [];

  for (const une of Array.isArray(pieces) ? pieces : []) {
    // **`true` seulement.** `undefined` veut dire « le message n'a rien dit »,
    // et ce n'est pas « non » : une pièce d'un `.eml` sans corps HTML compte.
    if (une?.dansLeTexte === true) cachees.push(uneFois(une));
    else gardees.push(uneFois(une));
  }

  return { gardees, cachees };
}

/**
 * Ce qu'on dit de celles qu'on ne nomme pas.
 *
 * Vide quand il n'y en a pas : une phrase « et 0 image » serait du bruit.
 */
export function phraseDesPiecesCachees(cachees = []) {
  const combien = (Array.isArray(cachees) ? cachees : []).length;
  if (!combien) return "";
  return `et ${combien} ${combien > 1 ? "images de mise en page" : "image de mise en page"}`;
}

/**
 * Les pièces d'un échange entier, sans doublon.
 *
 * **Par leur nom et leur taille**, faute de mieux : ici les octets ne sont pas
 * en main, et deux pièces identiques attachées à deux réponses d'un même fil
 * portent le même nom et la même taille. Ce rapprochement-là est faux dans un
 * cas sur mille ; ne pas le faire montre quinze fois le même plan.
 */
export function lesPiecesDuFil(messages = []) {
  const vues = new Set();
  const pieces = [];

  for (const lu of Array.isArray(messages) ? messages : []) {
    for (const une of lesPiecesQuiComptent(lu?.pieces).gardees) {
      const cle = `${une.nom}|${une.taille}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      pieces.push({ ...une, quand: texte(lu?.quand) });
    }
  }

  return pieces;
}
