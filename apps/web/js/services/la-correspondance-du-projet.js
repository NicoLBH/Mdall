/**
 * La correspondance d'un projet : **ce qu'on peut relire de ce qui a été
 * déposé**.
 *
 * ## Pourquoi cela vit dans le projet, et pas dans une archive à part
 *
 * La console avait construit une archive à elle, sans projet, et lisait un
 * épisode de cet ensemble. Sans frontière de chantier, le chiffre qui compte —
 * « après tel domaine vient tel autre » — n'était pas illisible, il était
 * **faux** : il enjambait quarante chantiers qui n'ont rien à voir
 * (`docs/nourrir-mdall.md`, § 8 quater).
 *
 * Un projet est la bonne maille. Et il en découle ce qu'on n'attendait pas : un
 * chantier commencé depuis dix-huit mois peut être nourri de sa correspondance,
 * puis se servir de Mdall comme les autres.
 *
 * ## Rien n'entre dans la mémoire, et cela n'a rien d'un détail
 *
 * Ce module **lit**. Aucun constat tiré d'ici n'est écrit, signé, ni versé : ce
 * qui entre un jour dans la mémoire du projet y entrera par une proposition
 * signée, comme tout le reste (règle 1). Ce que l'écran montre est refait à
 * chaque affichage.
 *
 * ## La réserve, et elle est sérieuse
 *
 * Un épisode tiré de correspondance privée **hérite de sa confidentialité**. Ce
 * qui se lit ici ne se lit que par celui qui a déposé les mails : la base y
 * veille (le dossier est privé), mais l'écran doit le dire — sans quoi
 * quelqu'un montrera sa chronologie en réunion en croyant montrer un indicateur
 * de projet.
 *
 * ## Il est pur
 *
 * Il dit ce qui compte comme message déposé, combien on en lit au plus, et ce
 * qu'on en dit. La lecture est ailleurs (`la-correspondance-du-projet-supabase.js`).
 */

import { NATURE_DUN_MAIL } from "./le-dossier-des-mails.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Combien de messages on relit, au plus.
 *
 * Chaque message doit être **rapatrié puis déplié** : c'est un aller-retour par
 * message, et rien ne s'agrège côté base. À deux cents, la lecture dure une
 * poignée de secondes ; à deux mille, on regarde une page blanche.
 *
 * Et le plafond se **dit**. Un épisode silencieusement tronqué est pire qu'un
 * épisode partiel annoncé : on croirait tenir toute la chronologie (règle 5).
 */
export const AU_PLUS_DE_MESSAGES = 200;

/** Un document déposé est-il un message ? */
export function estUnMessageDepose(document = null) {
  return texte(document?.documentKind || document?.document_kind) === NATURE_DUN_MAIL;
}

/**
 * Les messages, parmi ce que porte un dossier.
 *
 * Les pièces jointes sont dans le même dossier privé et portent leur propre
 * nature : les donner au lecteur de mails les compterait toutes « illisibles »,
 * et le compte rendu dirait que la moitié de la correspondance a résisté.
 */
export function lesMessagesDeposes(documents = []) {
  return (Array.isArray(documents) ? documents : []).filter(estUnMessageDepose);
}

/**
 * Ce qu'on a lu, en une phrase — **et ce qu'on n'a pas lu**.
 *
 * @param {{lus: number, tous: number, illisibles: number}} bilan
 */
export function phraseDeLaCorrespondance({ lus = 0, tous = 0, illisibles = 0 } = {}) {
  const combien = Number(lus) || 0;
  if (!combien) return "";

  const dits = [`${combien} ${combien > 1 ? "messages relus" : "message relu"}`];

  const total = Number(tous) || 0;
  if (total > combien) {
    dits.push(`sur ${total} déposés — les ${combien} plus récents`);
  }

  const durs = Number(illisibles) || 0;
  if (durs) dits.push(`${durs} ne ${durs > 1 ? "se sont" : "s'est"} pas laissé relire`);

  return dits.join(" · ");
}

/**
 * La réserve, dite à l'écran.
 *
 * Elle n'est pas là pour se couvrir : elle est là parce que quelqu'un montrera
 * cet écran en réunion, et qu'il doit savoir ce qu'il montre.
 */
export const LA_RESERVE =
  "Cette lecture vient de vos mails déposés, qui sont privés : personne d'autre "
  + "dans le projet ne la voit, et rien de ce qui est écrit ici n'entre dans la "
  + "mémoire du chantier.";
