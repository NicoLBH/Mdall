/**
 * L'archive des pièces : **ce qu'on garde pour ne pas avoir à le reprendre**.
 *
 * ## Le nom d'une pièce est son empreinte
 *
 * Chaque pièce est rangée sous `pieces/<empreinte>`. Ce n'est pas une
 * commodité : c'est ce qui fait que le dédoublonnage n'a plus besoin d'être
 * décidé. Le même plan attaché à quinze réponses d'un fil écrit quinze fois au
 * même endroit le même contenu — donc une fois.
 *
 * Et le chemin ne porte rien : ni nom de fichier, ni chantier, ni personne.
 * Soixante-quatre caractères hexadécimaux.
 *
 * ## Ce qui ne monte pas
 *
 * **Ce qu'on ne sait pas empreindre.** Sans empreinte, il n'y a pas de nom
 * sous lequel écrire, et en inventer un (un compteur, un hasard) ferait perdre
 * exactement la propriété qui justifie tout le reste : deux versements du même
 * fichier deviendraient deux objets. On ne verse pas, et **on le dit**
 * (règle 5).
 *
 * **Ce qui est déjà là.** Redemander la même écriture ne casserait rien, mais
 * ferait remonter cinq mégaoctets pour rien, cent fois par archive.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne trie pas, ne classe pas, ne rapproche pas d'un projet. Il garde. Le
 * lien entre une pièce et le message qui la portait viendra quand les messages
 * eux-mêmes seront gardés — et c'est le prochain irrattrapable
 * (`docs/nourrir-mdall.md`).
 *
 * ## Il est pur
 *
 * Aucun réseau, aucun écran. Ce qui parle à Supabase vit dans
 * `larchive-des-pieces-supabase.js`.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Le casier de stockage. Un seul, nommé à un seul endroit (règle 10). */
export const CASIER = "archives";

/** Le dossier, dans le casier. Ce qui n'est pas une pièce n'y est pas. */
const LE_DOSSIER = "pieces";

/** Une empreinte a cette forme, ou ce n'en est pas une. */
const UNE_EMPREINTE = /^[0-9a-f]{64}$/;

/**
 * Le chemin d'une pièce dans le casier.
 *
 * Vide quand l'empreinte n'en est pas une : mieux vaut ne rien écrire que
 * d'écrire sous un nom qu'on ne saura pas relire.
 */
export function cheminDeLaPiece(empreinte) {
  const nu = texte(empreinte).toLowerCase();
  return UNE_EMPREINTE.test(nu) ? `${LE_DOSSIER}/${nu}` : "";
}

/**
 * Ce qu'il faut verser, au vu de ce qui est déjà là.
 *
 * **Une seule fois chacune, même déposée dix fois.** Les pièces arrivent avec
 * leurs messages, et le même plan revient à chaque réponse d'un fil : sans ce
 * repli, on téléverserait dix fois le même objet à la même adresse.
 *
 * @param {object[]} pieces les pièces des messages ouverts, avec `empreinte` et `octets`
 * @param {Iterable<string>} dejaLa les empreintes que l'archive porte déjà
 * @returns {{aVerser: object[], dejaLa: number, sansEmpreinte: number}}
 */
export function ceQuiResteAVerser(pieces = [], dejaLa = []) {
  const connues = new Set([...(dejaLa ?? [])].map((une) => texte(une).toLowerCase()));
  const vues = new Set();
  const aVerser = [];
  let dejaLaCombien = 0;
  let sansEmpreinte = 0;

  for (const une of Array.isArray(pieces) ? pieces : []) {
    const chemin = cheminDeLaPiece(une?.empreinte);
    if (!chemin) {
      // Pas de nom sous lequel écrire. On ne verse pas, et cela se compte.
      sansEmpreinte += 1;
      continue;
    }

    const empreinte = texte(une.empreinte).toLowerCase();
    if (connues.has(empreinte)) {
      dejaLaCombien += 1;
      continue;
    }
    // Le même fichier deux fois dans le même dépôt : une seule écriture, et le
    // second exemplaire compte comme déjà là.
    if (vues.has(empreinte)) {
      dejaLaCombien += 1;
      continue;
    }

    vues.add(empreinte);
    aVerser.push({ ...une, empreinte, chemin });
  }

  return { aVerser, dejaLa: dejaLaCombien, sansEmpreinte };
}

/**
 * La ligne de registre d'une pièce.
 *
 * Le registre dit ce que les octets sont ; le casier dit qu'ils existent. Sans
 * lui, il faudrait télécharger cinq mégaoctets pour afficher un nom.
 *
 * `versee_par` n'y figure pas : la base le pose elle-même, et un appelant qui
 * le déclarerait ferait porter un versement à quelqu'un d'autre.
 */
export function ligneDuRegistre(piece = null) {
  return {
    empreinte: texte(piece?.empreinte).toLowerCase(),
    nom: texte(piece?.nom),
    type_mime: texte(piece?.type),
    taille: Number(piece?.taille) || 0
  };
}

/** Ce qu'une ligne de registre devient à l'écran. */
export function unePieceArchivee(ligne = null) {
  const empreinte = texte(ligne?.empreinte).toLowerCase();
  const type = texte(ligne?.type_mime);

  return {
    empreinte,
    nom: texte(ligne?.nom),
    type,
    taille: Number(ligne?.taille) || 0,
    versee: texte(ligne?.versee_le),
    // **Ce que la console sait ouvrir, et rien d'autre.** Le lecteur de PDF est
    // celui de l'onglet Documents (`ct-lab-pdf-view.js`) ; lui donner un ZIP
    // afficherait un cadre vide sans dire pourquoi.
    seLit: type === "application/pdf"
  };
}

/**
 * Combien de pièces l'écran montre au plus.
 *
 * **Une archive de cent mille pièces ne se lit pas d'un coup**, et une liste
 * tronquée en silence est pire qu'une liste courte : on croit voir le tout.
 * On en demande donc un nombre choisi, et l'on dit qu'il y en a davantage.
 */
export const AU_PLUS = 200;

/**
 * Les pièces de l'archive, de la plus récente à la plus ancienne.
 *
 * L'ordre vient du temps, jamais de la base : une liste rendue dans l'ordre des
 * identifiants ressemble à une chronologie et n'en est pas une.
 *
 * `reste` dit qu'on n'a pas tout montré. Le taire ferait lire « voici
 * l'archive » là où il faut lire « en voici les deux cents dernières »
 * (règle 5).
 *
 * @param {object[]} lignes ce que la base a rendu — une de plus que demandé
 * @returns {{pieces: object[], reste: boolean}}
 */
export function lesPiecesArchivees(lignes = [], auPlus = AU_PLUS) {
  const lues = (Array.isArray(lignes) ? lignes : [])
    .map(unePieceArchivee)
    .filter((une) => une.empreinte)
    .sort((gauche, droite) => String(droite.versee).localeCompare(String(gauche.versee)));

  return { pieces: lues.slice(0, auPlus), reste: lues.length > auPlus };
}

/**
 * Ce qu'un versement a fait, en une phrase.
 *
 * Vide quand il n'y avait rien à verser : « 0 pièce versée » apprend à ne plus
 * lire les lignes.
 */
export function phraseDuVersement(bilan = null) {
  const versees = Number(bilan?.versees) || 0;
  const dejaLa = Number(bilan?.dejaLa) || 0;
  const refusees = Number(bilan?.refusees) || 0;

  const dits = [];
  if (versees) dits.push(`${versees} ${versees > 1 ? "pièces versées" : "pièce versée"}`);
  if (dejaLa) dits.push(`${dejaLa} ${dejaLa > 1 ? "étaient déjà là" : "était déjà là"}`);
  // Un échec ne se tait pas : celui qui dépose croirait tout versé.
  if (refusees) dits.push(`${refusees} ${refusees > 1 ? "n'ont pas pu être versées" : "n'a pas pu être versée"}`);

  return dits.join(" · ");
}
