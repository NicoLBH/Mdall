/**
 * Ce qu'une ligne de mail montre, et ce qu'on en garde.
 *
 * ## Une liste de mails n'est pas une liste de fichiers
 *
 * Un fichier se dit par son nom. Un mail se dit par **qui l'a écrit, de quoi il
 * parle, quand, et s'il portait quelque chose**. C'est ce que montre une
 * messagerie depuis trente ans, et ce n'est pas un hasard : ces quatre-là
 * suffisent à retrouver un message dans deux cents.
 *
 * ## L'écriture et la lecture décident au même endroit
 *
 * Ce module dit ce que le dépôt écrit sur la ligne `documents`, **et** ce que
 * l'écran en lit. Deux passages auraient fini par ne pas nommer la même
 * colonne, ou par tirer l'expéditeur d'un endroit différent (règle 10).
 *
 * ## Il est pur
 *
 * Un message déplié entre, des valeurs sortent. Aucun réseau, aucun rangement.
 */

import { objetNu } from "./un-mail-deplie.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Qui a écrit, en une ligne.
 *
 * **Le nom d'abord quand il existe, l'adresse sinon.** C'est l'inverse du choix
 * fait pour la chronologie, où l'adresse prime : là on désambiguïse deux
 * homonymes, ici on parcourt deux cents lignes, et « Ourdine Ferrand » se
 * reconnaît d'un coup d'œil là où une adresse demande de lire.
 *
 * Et l'adresse reste, entre parenthèses, quand les deux sont connus : le nom
 * d'affichage est ce qu'un expéditeur choisit, donc ce qu'il peut choisir de
 * travers.
 */
export function quiEcrit(qui = null) {
  if (typeof qui === "string") return texte(qui);
  const nom = texte(qui?.nom);
  const adresse = texte(qui?.adresse);
  if (nom && adresse && nom.toLowerCase() !== adresse.toLowerCase()) return `${nom} (${adresse})`;
  return nom || adresse;
}

/**
 * Ce que le dépôt écrit sur la ligne d'un mail.
 *
 * `mail_pieces` vaut **zéro** quand il n'y en a pas, et vide seulement quand ce
 * n'est pas un mail : ne pas savoir et savoir qu'il n'y en a pas ne se disent
 * pas pareil (règle 5).
 *
 * @param {object} lu ce que rend `unMailDeplie` ou `unMsgDeplie`
 */
export function lindexDunMail(lu = null) {
  const objet = texte(lu?.objet);
  return {
    mail_de: quiEcrit(lu?.qui) || null,
    mail_objet: objet || null,
    // Une date illisible n'est pas une date : on n'invente pas celle du jour.
    mail_quand: texte(lu?.quand) || null,
    mail_pieces: Array.isArray(lu?.pieces) ? lu.pieces.length : 0,
    // **Le fil est l'objet débarrassé de ses RE: et TR:**, et il vaut la même
    // chose que ce qui nomme le fichier. Sans objet, pas de fil : mettre tous
    // les messages sans objet dans le même échange les mélangerait.
    mail_fil: objetNu(objet) || null
  };
}

/** Cette ligne de document est-elle un mail indexé ? */
export function cestUnMailIndexe(document = null) {
  return document?.mailPieces !== undefined && document?.mailPieces !== null;
}

/**
 * Ce qu'une ligne montre, prête à dessiner.
 *
 * **Elle ne laisse aucune case vide.** Un mail dont l'expéditeur n'a pas été lu
 * afficherait une colonne blanche, qu'on prendrait pour un défaut d'affichage
 * plutôt que pour un mail sans expéditeur lisible (règle 5).
 */
export function laLigneDunMail(document = null) {
  const pieces = Number(document?.mailPieces) || 0;
  return {
    de: texte(document?.mailDe) || "expéditeur non lu",
    objet: texte(document?.mailObjet) || "(sans objet)",
    quand: texte(document?.mailQuand),
    pieces,
    // Le trombone ne se dessine qu'au-dessus de zéro : une colonne de trombones
    // barrés n'apprendrait rien.
    avecPieces: pieces > 0,
    titreDesPieces: pieces
      ? `${pieces} ${pieces > 1 ? "pièces jointes" : "pièce jointe"}`
      : ""
  };
}

/**
 * Le jour et l'heure d'un mail, à la manière d'une messagerie.
 *
 * **Aujourd'hui se dit par l'heure, le reste par la date.** C'est ce que fait
 * une messagerie, et pour une raison : dans une liste d'aujourd'hui, la date est
 * la même partout et ne distingue rien.
 */
export function quandDit(quand, maintenant = new Date()) {
  const lu = Date.parse(texte(quand));
  if (!Number.isFinite(lu)) return "";

  const instant = new Date(lu);
  const memeJour = instant.toDateString() === maintenant.toDateString();
  if (memeJour) {
    return instant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  const memeAnnee = instant.getFullYear() === maintenant.getFullYear();
  return instant.toLocaleDateString("fr-FR", memeAnnee
    ? { day: "2-digit", month: "short" }
    : { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Les messages d'un même fil, du plus ancien au plus récent.
 *
 * **Ce qui n'a pas de date passe à la fin**, et non au début : le placer avant
 * inventerait un moment antérieur à tout, et ferait lire une réponse avant sa
 * question.
 */
export function leFilRange(documents = []) {
  const tous = Array.isArray(documents) ? [...documents] : [];
  const instant = (un) => {
    const lu = Date.parse(texte(un?.mailQuand));
    return Number.isFinite(lu) ? lu : Number.POSITIVE_INFINITY;
  };
  return tous.sort((gauche, droite) => instant(gauche) - instant(droite));
}

/** Ce qu'on dit d'un fil de plusieurs messages. Vide quand il n'y en a qu'un. */
export function phraseDuFilRange(documents = []) {
  const combien = Array.isArray(documents) ? documents.length : 0;
  if (combien <= 1) return "";
  return `${combien} messages dans cet échange`;
}
