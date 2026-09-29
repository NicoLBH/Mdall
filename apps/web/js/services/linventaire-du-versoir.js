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
 * Il ne verse rien, ne classe rien, ne rapproche rien. Il compte. Le tri, la
 * signature et le fonds commun viennent après, et ailleurs.
 *
 * ## Il est pur
 *
 * Des messages dépliés entrent, des nombres sortent. Aucun réseau, aucun
 * écran, aucune horloge.
 */

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
 * Un poids, écrit comme on le lit.
 *
 * **En base mille, et non mille vingt-quatre.** C'est ce que l'explorateur de
 * Windows affiche, et celui qui dépose ses archives compare avec ce qu'il voit
 * chez lui : un écart de sept pour cent sans explication ferait douter du
 * reste.
 *
 * **Et avec une virgule**, comme tout le reste de Mdall. « 6.4 ko » sur un écran
 * français se lit une fois de trop.
 */
export function poidsDit(octets = 0) {
  const combien = Number(octets);
  if (!Number.isFinite(combien) || combien < 0) return "";
  const virgule = (valeur, apres) => valeur.toFixed(apres).replace(".", ",");
  if (combien < 1000) return `${Math.round(combien)} o`;
  if (combien < 1000000) return `${virgule(combien / 1000, combien < 10000 ? 1 : 0)} ko`;
  return `${virgule(combien / 1000000, combien < 10000000 ? 1 : 0)} Mo`;
}

/**
 * Ce qu'un message déposé porte.
 *
 * @param {object} lu ce que rend `unMsgDeplie`
 * @param {string} [fichier] le nom du fichier déposé, pour pouvoir y revenir
 */
export function inventaireDunMessage(lu = null, fichier = "") {
  const pieces = Array.isArray(lu?.pieces) ? lu.pieces : [];
  const rangees = pieces.map((une) => ({
    nom: texte(une?.nom),
    type: texte(une?.type),
    taille: Number(une?.taille) || 0,
    quoi: une?.dansLeTexte ? PIECE.VIGNETTE : PIECE.DOCUMENT
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
