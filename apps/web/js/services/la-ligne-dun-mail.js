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
import { lexpediteurNettoye, lidentiteDite } from "./une-adresse-lisible.js";

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
/**
 * Qui écrit, **tel qu'on peut le lire**.
 *
 * Il rendait l'adresse quelle qu'elle soit, et un `.msg` interne en porte une
 * qui n'en est pas une : trois lignes d'identifiant d'annuaire Exchange à la
 * place d'un nom. Ce qui est montrable se décide dans
 * `une-adresse-lisible.js`, une fois pour tous les écrans (règle 10).
 */
export function quiEcrit(qui = null) {
  return lidentiteDite(qui);
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
    // **Nettoyé à la lecture aussi.** `mail_de` est écrit au dépôt et ne se
    // recalcule pas : les mails versés avant que la règle existe portent en
    // base l'identifiant d'annuaire entier.
    de: lexpediteurNettoye(document?.mailDe) || "expéditeur non lu",
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

/**
 * Les deux sens dans lesquels on lit une messagerie.
 *
 * **Le plus récent en haut par défaut.** C'est ce que fait toute messagerie, et
 * pour une raison : ce qui vient d'arriver est ce qu'on n'a pas encore lu.
 * L'écran empilait du plus ancien au plus récent, donc il fallait dérouler
 * jusqu'en bas pour voir ce qui venait d'être versé.
 */
export const SENS = { RECENT: "recent", ANCIEN: "ancien" };

/** Le sens demandé, ramené à l'un des deux. */
export function sensValide(cle) {
  return String(cle ?? "").trim() === SENS.ANCIEN ? SENS.ANCIEN : SENS.RECENT;
}

/** Ce que le clic demandera, et ce qu'on en dit. */
export function lautreSens(cle) {
  return sensValide(cle) === SENS.RECENT ? SENS.ANCIEN : SENS.RECENT;
}

/** Ce que le bouton annonce — le geste, pas l'état. */
export function laPhraseDuTri(cle) {
  return sensValide(cle) === SENS.RECENT
    ? "Afficher les plus anciens en premier"
    : "Afficher les plus récents en premier";
}

/**
 * Les mails rangés par leur date.
 *
 * ## Sur quelle date, et pourquoi pas celle du dépôt
 *
 * Celle du **message**, pas celle du versement. Verser en une fois six mois de
 * correspondance donne six mois de messages à la même seconde de dépôt : trier
 * là-dessus ne range rien, et l'ordre qu'on verrait serait celui du dossier
 * d'Outlook.
 *
 * ## Un message sans date ne disparaît pas
 *
 * Il va **au bout**, dans les deux sens. Le mettre en tête le ferait passer
 * pour le plus récent ; le retirer ferait disparaître un mail de la liste — ce
 * qui est la seule chose qu'on ne peut pas se permettre. Ne pas savoir n'est
 * pas une place (règle 5).
 */
export function lesMailsTries(documents = [], sens = SENS.RECENT) {
  const ordre = sensValide(sens) === SENS.RECENT ? -1 : 1;

  return [...(Array.isArray(documents) ? documents : [])]
    .map((un, rang) => ({ un, rang, quand: Date.parse(texte(un?.mailQuand)) }))
    .sort((gauche, droite) => {
      const gaucheSait = Number.isFinite(gauche.quand);
      const droiteSait = Number.isFinite(droite.quand);
      if (!gaucheSait && !droiteSait) return gauche.rang - droite.rang;
      if (!gaucheSait) return 1;
      if (!droiteSait) return -1;
      if (gauche.quand !== droite.quand) return (gauche.quand - droite.quand) * ordre;
      // À la même seconde, on garde l'ordre d'arrivée : un tri qui change à
      // chaque rendu fait clignoter la liste.
      return gauche.rang - droite.rang;
    })
    .map((une) => une.un);
}
