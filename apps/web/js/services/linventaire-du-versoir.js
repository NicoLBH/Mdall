/**
 * L'inventaire du versoir : **ce qu'on a dans les mains avant de décider**.
 *
 * ## Pourquoi un inventaire, et pas une importation
 *
 * Cent archives de chantier, c'est dix mille messages et trente mille pièces.
 * Le premier geste n'est pas de les verser — c'est de **savoir ce qu'il y a**.
 * Combien de messages se lisent, combien résistent, combien de pièces sont de
 * vrais documents et combien ne sont que les images d'une signature répétée
 * cinq cents fois.
 *
 * Cette réponse-là ne coûte rien : elle se calcule sur le poste de celui qui
 * dépose, à partir d'octets qu'il a déjà. Aucun appel, aucun dépôt.
 *
 * ## Ce qui décide qu'une pièce est un document
 *
 * Un `.msg` ne distingue pas « le plan du R+1 » de « le logo de la signature » :
 * ce sont deux pièces jointes. Ce qui les sépare, c'est qu'une image collée
 * dans le texte porte un **identifiant de contenu**, par lequel le corps HTML
 * la rappelle — et qu'un document n'en a pas.
 *
 * C'est une distinction de structure, pas une devinette sur le nom ou la
 * taille : « plan.png » reste un document, et une vignette de deux mégaoctets
 * reste une vignette.
 *
 * ## Ce qu'on garde, et ce qu'on ne saura pas exploiter tout de suite
 *
 * **Les documents se gardent entiers.** Le jour où l'on saura tirer quelque
 * chose d'un plan, il ne faudra pas redistribuer le carburant : une archive
 * qu'on n'a pas prise aujourd'hui, on ne l'aura plus dans trois ans
 * (`docs/nourrir-mdall.md`).
 *
 * **Les vignettes se gardent aussi** — on ne jette rien, c'est le principe de
 * cette page. Mais elles se comptent **à part**, et leur poids se dit : sur le
 * message réel qui a servi de référence, huit images de signature pesaient deux
 * mégaoctets et demi, et les plans dont parlait le corps n'étaient pas dans le
 * fichier du tout. Confondre les deux ferait croire à des archives trois fois
 * plus riches qu'elles ne sont.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne verse rien, ne classe rien, ne jette rien. Il compte — **y compris ce
 * qui se répète**, parce que c'est le premier chiffre à connaître : sur cent
 * historiques de chantier, le volume réel est une fraction du volume apparent
 * (`le-dedoublonnage.js`). Le tri, la signature et le fonds commun viennent
 * après, et ailleurs.
 *
 * ## Il est pur
 *
 * Des messages dépliés entrent, des nombres sortent. Aucun réseau, aucun
 * écran, aucune horloge.
 */

import { ceQuiSeRepete } from "./le-dedoublonnage.js";
import { poidsDit } from "../utils/poids-dit.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une pièce jointe peut être, pour le versoir. */
export const PIECE = {
  DOCUMENT: "document",
  VIGNETTE: "vignette"
};

/** Un instant comparable, ou `null`. Une date illisible n'est pas une date. */
function instant(valeur) {
  const quand = Date.parse(texte(valeur));
  return Number.isFinite(quand) ? quand : null;
}

/**
 * Ce qu'un message déposé porte.
 *
 * @param {object} lu ce que rend `unMsgDeplie`
 * @param {string} [fichier] le nom du fichier déposé, pour pouvoir y revenir
 * @param {{message?: string, pieces?: (string|null)[]}} [empreintes] ce que rend
 *   `lesEmpreintes` — sans elles, rien ne se rapproche de rien
 */
export function inventaireDunMessage(lu = null, fichier = "", empreintes = null) {
  const pieces = Array.isArray(lu?.pieces) ? lu.pieces : [];
  const rangees = pieces.map((une, rang) => ({
    nom: texte(une?.nom),
    type: texte(une?.type),
    taille: Number(une?.taille) || 0,
    quoi: une?.dansLeTexte ? PIECE.VIGNETTE : PIECE.DOCUMENT,
    // L'empreinte des octets, quand on a su la calculer. Vide sinon, et une
    // pièce sans empreinte n'est jamais rapprochée d'une autre (règle 5).
    empreinte: texte(empreintes?.pieces?.[rang])
  }));

  const documents = rangees.filter((une) => une.quoi === PIECE.DOCUMENT);
  const vignettes = rangees.filter((une) => une.quoi === PIECE.VIGNETTE);
  const pese = (lesquelles) => lesquelles.reduce((somme, une) => somme + une.taille, 0);

  // **Un message dont rien ne se lit n'est pas un message de moins** : c'est
  // une archive qu'on laisse derrière soi, et il faut pouvoir la nommer pour y
  // revenir (règle 5).
  const illisible = !texte(lu?.corps) && !texte(lu?.objet);

  return {
    fichier: texte(fichier),
    empreinte: texte(empreintes?.message),
    objet: texte(lu?.objet),
    qui: texte(lu?.qui?.adresse) || texte(lu?.qui?.nom),
    quand: texte(lu?.quand),
    // Les destinataires se comptent, ils ne se listent pas : l'inventaire
    // répond à « qu'est-ce qu'il y a », pas à « qui est dedans ».
    combienDeDestinataires: (Array.isArray(lu?.a) ? lu.a.length : 0)
      + (Array.isArray(lu?.copie) ? lu.copie.length : 0),
    signesDuCorps: texte(lu?.corps).length,
    pieces: rangees,
    documents,
    vignettes,
    poidsDesDocuments: pese(documents),
    poidsDesVignettes: pese(vignettes),
    illisible,
    trous: Array.isArray(lu?.trous) ? lu.trous : []
  };
}

/**
 * L'inventaire de tout ce qui a été déposé.
 *
 * @param {object[]} messages ce que rend `inventaireDunMessage`, message par message
 */
export function inventaireDuVersoir(messages = []) {
  const lus = Array.isArray(messages) ? messages : [];
  const lisibles = lus.filter((un) => !un?.illisible);

  const moments = lus.map((un) => instant(un?.quand)).filter((un) => un !== null);
  const somme = (quoi) => lus.reduce((total, un) => total + (Number(un?.[quoi]) || 0), 0);
  const compte = (quoi) => lus.reduce((total, un) => total + (un?.[quoi]?.length || 0), 0);

  return {
    messages: lus.length,
    illisibles: lus.length - lisibles.length,
    // **Ce qui se répète, compté au même endroit que le reste.** Un écran qui
    // dirait « 400 messages » sans dire que 260 sont le même message cité
    // quinze fois ferait croire à une matière qu'on n'a pas.
    repetitions: ceQuiSeRepete(lus),
    documents: compte("documents"),
    vignettes: compte("vignettes"),
    poidsDesDocuments: somme("poidsDesDocuments"),
    poidsDesVignettes: somme("poidsDesVignettes"),
    // **Ce qu'on ne sait pas dater se compte à part.** Une période qui
    // n'engloberait que les messages datés se lirait comme la période de
    // l'archive, et elle ne l'est pas.
    sansDate: lus.length - moments.length,
    depuis: moments.length ? new Date(Math.min(...moments)).toISOString() : "",
    jusqua: moments.length ? new Date(Math.max(...moments)).toISOString() : ""
  };
}

/**
 * L'inventaire en une phrase.
 *
 * Vide quand rien n'a été déposé : une phrase « 0 message » apprend à ne plus
 * lire les phrases.
 */
export function phraseDuVersoir(inventaire = null) {
  const messages = Number(inventaire?.messages) || 0;
  if (!messages) return "";

  const dits = [`${messages} ${messages > 1 ? "messages" : "message"}`];

  const documents = Number(inventaire?.documents) || 0;
  if (documents) {
    dits.push(`${documents} ${documents > 1 ? "documents" : "document"}`
      + ` (${poidsDit(inventaire.poidsDesDocuments)})`);
  }

  // **« Écartées » serait faux, et ce mot avait été écrit.** Rien n'est jeté :
  // les vignettes sont gardées comme le reste. Ce que cette ligne dit, c'est
  // qu'elles ne sont pas des documents — et combien de poids elles prennent.
  const vignettes = Number(inventaire?.vignettes) || 0;
  if (vignettes) {
    dits.push(`${vignettes} ${vignettes > 1 ? "images de signature" : "image de signature"}`
      + ` (${poidsDit(inventaire.poidsDesVignettes)})`);
  }

  const illisibles = Number(inventaire?.illisibles) || 0;
  if (illisibles) {
    dits.push(`${illisibles} ${illisibles > 1 ? "ne se lisent pas" : "ne se lit pas"}`);
  }

  return dits.join(" · ");
}

/**
 * Ce que le dédoublonnage épargne, en une phrase.
 *
 * Elle vit ici, avec l'autre phrase du versoir et avec `poidsDit` : le
 * comptage est ailleurs, parce qu'il resservira — la phrase, non.
 *
 * Vide quand rien ne se répète. « 0 doublon » apprend à ne plus lire les
 * lignes, ici comme partout.
 */
export function phraseDeCeQuiSeRepete(inventaire = null) {
  const repetitions = inventaire?.repetitions ?? {};
  const dits = [];

  const messages = Number(repetitions.messages?.repetes) || 0;
  if (messages) dits.push(`${messages} ${messages > 1 ? "messages déjà vus" : "message déjà vu"}`);

  const pieces = (Number(repetitions.documents?.repetes) || 0)
    + (Number(repetitions.vignettes?.repetes) || 0);
  if (pieces) dits.push(`${pieces} ${pieces > 1 ? "pièces déjà vues" : "pièce déjà vue"}`);

  // Aucune garde sur la liste vide : un poids épargné ne peut exister sans une
  // répétition, donc sans une ligne — la jointure rend la chaîne vide d'elle-
  // même. Une garde qui ne peut pas tomber ne se casse jamais, donc ne se
  // vérifie pas (règle 4).
  const poids = (Number(repetitions.documents?.poidsEvite) || 0)
    + (Number(repetitions.vignettes?.poidsEvite) || 0);
  // Le poids épargné est le chiffre qui décide : c'est ce qu'on ne relira, ne
  // rangera et ne paiera nulle part ensuite.
  return poids ? `${dits.join(" · ")} — ${poidsDit(poids)} qu'on ne relira pas` : dits.join(" · ");
}

/**
 * Les images de signature, **en une ligne**.
 *
 * Sur le message réel qui a servi de référence, elles étaient huit, et elles
 * remplissaient l'écran. On vient chercher un plan : le faire chercher au
 * milieu de huit logos, c'est rater la seule chose que ces écrans doivent
 * montrer. Elles sont gardées — on ne jette rien —, elles ne sont simplement
 * pas détaillées.
 *
 * Elle vit ici parce que **deux écrans la disent** : le versoir, et l'archive.
 * Écrite deux fois, elle aurait fini par ne plus dire la même chose (règle 4).
 *
 * Vide quand il n'y en a pas.
 */
export function phraseDesImagesDeSignature(combien = 0, poids = 0) {
  const lesquelles = Number(combien) || 0;
  if (!lesquelles) return "";

  return `${lesquelles} ${lesquelles > 1 ? "images" : "image"} de signature`
    + ` (${poidsDit(poids)}) : gardées, mais ce ne sont pas des documents`;
}

/**
 * Ce qu'on ne sait pas rapprocher, et qui se compte donc à part.
 *
 * `crypto.subtle` manque d'une page servie sans TLS. Sans lui, aucune pièce ne
 * porte d'empreinte, et **rien ne se dédoublonne** — le taire ferait lire
 * « aucun doublon » là où il faudrait lire « on n'a pas pu regarder ».
 */
export function phraseDeCeQuOnNeSaitPasRapprocher(inventaire = null) {
  const repetitions = inventaire?.repetitions ?? {};
  const combien = (Number(repetitions.documents?.sansEmpreinte) || 0)
    + (Number(repetitions.vignettes?.sansEmpreinte) || 0);
  if (!combien) return "";

  return combien > 1
    ? `${combien} pièces n'ont pas d'empreinte : on ne sait pas si elles se répètent`
    : "1 pièce n'a pas d'empreinte : on ne sait pas si elle se répète";
}
