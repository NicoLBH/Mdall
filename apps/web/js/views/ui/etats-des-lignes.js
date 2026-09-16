/**
 * L'état d'une ligne, et le signe qui le dit.
 *
 * ## Pourquoi un seul endroit
 *
 * Trois tableaux montrent des sujets — l'onglet d'un projet, le formulaire
 * d'une situation, l'écran de tous les sujets — et chacun dessinait son icône.
 * Deux d'entre eux ne connaissaient que deux états : ouvert, fermé. Un sujet
 * **abandonné** — clos parce qu'il ne tenait pas, ou parce qu'il faisait double
 * emploi — y prenait donc la coche verte de ce qui est fait. C'est le contraire
 * de ce qui s'est passé, et c'est la seule chose qu'on regarde en parcourant
 * une liste de soixante lignes.
 *
 * Un nom vit à un seul endroit (règle 10) ; un signe aussi. Ce module est cet
 * endroit — pour les sujets comme pour les propositions.
 *
 * ## Ce qu'on lit pour savoir, et dans quel ordre
 *
 * **L'abandon d'abord.** Il est porté par trois écritures, selon d'où vient la
 * ligne : le statut de la base (`closed_invalid`, `closed_duplicate`), le motif
 * de fermeture (`non_pertinent`, `duplicate`), et l'état de relecture
 * (`rejected`, `dismissed`) que l'écran d'un projet tient de son côté. Les
 * trois disent la même chose et n'arrivent pas ensemble : la charge
 * transversale lit les colonnes de la base, l'écran d'un projet lit ce que le
 * geste vient d'écrire. N'en regarder qu'une revient à ne voir l'abandon que
 * sur l'écran qui l'a provoqué.
 *
 * Ensuite seulement, ouvert ou fermé.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne lit ni la base, ni le store : on lui donne une ligne, il dit ce qu'elle
 * est. C'est ce qui permet de l'exécuter en test, plutôt que de lire le code en
 * espérant.
 */

import { svgIcon } from "../../ui/icons.js";
import { normalizeReviewState } from "./status-badges.js";
import { PROPOSITION } from "../../services/proposition-state.js";

const texte = (valeur) => String(valeur ?? "").trim();
const repli = (valeur) => texte(valeur).toLowerCase();

/** Les trois états d'un sujet, tels qu'on les nomme à l'écran. */
export const ETAT_DU_SUJET = {
  OUVERT: "ouvert",
  FERME: "ferme",
  ABANDONNE: "abandonne"
};

/** Les motifs de fermeture qui disent qu'on a renoncé, et non qu'on a fait. */
const MOTIFS_DABANDON = new Set(["non_pertinent", "duplicate"]);

/** Les statuts de la base qui portent le même renoncement. */
const STATUTS_DABANDON = new Set(["closed_invalid", "closed_duplicate"]);

/** Les états de relecture qui le portent aussi. */
const RELECTURES_DABANDON = new Set(["rejected", "dismissed"]);

/**
 * L'état d'un sujet : ce qu'il est, comment on le nomme, et son signe.
 *
 * Accepte aussi bien la ligne de la base que l'entité de l'écran d'un projet :
 * l'une porte `status` et `closure_reason`, l'autre y ajoute `review_state`, et
 * les deux rangent parfois la même chose sous `raw`.
 *
 * @param {object|null} sujet
 * @returns {{cle: string, mot: string, ton: string, icone: string, couleur: string}}
 */
export function etatDunSujet(sujet = null) {
  const statut = repli(sujet?.status ?? sujet?.raw?.status);
  const motif = repli(sujet?.closure_reason ?? sujet?.raw?.closure_reason);
  const relecture = normalizeReviewState(sujet?.review_state ?? sujet?.raw?.review_state ?? "");

  if (RELECTURES_DABANDON.has(relecture)
    || MOTIFS_DABANDON.has(motif)
    || STATUTS_DABANDON.has(statut)) {
    return {
      cle: ETAT_DU_SUJET.ABANDONNE,
      mot: "Abandonné",
      ton: "muted",
      icone: "skip",
      // Le gris de ce qui n'est plus en jeu — ni le vert de ce qui est fait, ni
      // le violet de ce qui est en cours.
      couleur: "rgb(145, 152, 161)"
    };
  }

  if (statut.startsWith("closed")) {
    return {
      cle: ETAT_DU_SUJET.FERME,
      mot: "Fermé",
      ton: "done",
      icone: "check-circle",
      couleur: "var(--fgColor-done)"
    };
  }

  return {
    cle: ETAT_DU_SUJET.OUVERT,
    mot: "Ouvert",
    ton: "success",
    icone: "issue-opened",
    couleur: "var(--fgColor-open)"
  };
}

/**
 * Le sujet est-il ouvert ?
 *
 * **Un sujet abandonné n'est pas ouvert.** Compter les ouverts en prenant tout
 * ce qui n'est pas `closed` les y remettrait, et le compte du filtre dirait
 * autre chose que la liste qu'il montre.
 */
export function sujetOuvert(sujet = null) {
  return etatDunSujet(sujet).cle === ETAT_DU_SUJET.OUVERT;
}

/**
 * Ce qu'on dit de l'état d'une proposition.
 *
 * **Refusée est une demande close, pas une alerte.** Quelqu'un a décidé ; il
 * n'y a rien à surveiller.
 */
export function etatDeLaProposition(proposition = null) {
  const statut = texte(proposition?.status) || PROPOSITION.OPEN;

  if (statut === PROPOSITION.MERGED) {
    return {
      cle: PROPOSITION.MERGED,
      mot: "Fusionnée",
      ton: "done",
      icone: "git-compare",
      couleur: "var(--fgColor-done)"
    };
  }
  if (statut === PROPOSITION.CLOSED) {
    return {
      cle: PROPOSITION.CLOSED,
      mot: "Refusée",
      ton: "muted",
      icone: "git-pull-request-closed",
      couleur: "rgb(145, 152, 161)"
    };
  }
  return {
    cle: PROPOSITION.OPEN,
    mot: "Ouverte",
    ton: "success",
    icone: "git-pull-request",
    couleur: "var(--fgColor-open)"
  };
}

/**
 * Le signe d'un état, dans la coquille que les trois tableaux posent déjà.
 *
 * La couleur est **dans l'attribut de style**, et non dans une classe : c'est
 * ainsi que l'icône de l'onglet d'un projet est peinte depuis le début, et
 * inventer ici une seconde façon de la colorer ferait diverger les deux au
 * premier réglage.
 *
 * ## Elle se nomme, parce qu'elle est seule à le dire
 *
 * La ligne portait **aussi** une pastille « Ouvert » / « Fermé », à côté du
 * titre : la même information deux fois, sur la ligne la plus chargée de
 * l'écran. La pastille est partie — c'est l'icône qu'on regarde en parcourant —
 * et l'icône reçoit son nom, sans quoi l'état ne serait plus lisible du tout
 * pour qui ne voit ni les formes ni les couleurs.
 */
export function renderIconeDetat(etat = null) {
  const sien = etat && typeof etat === "object" ? etat : etatDunSujet(null);
  const svg = svgIcon(sien.icone, { style: `color: ${sien.couleur}`, title: sien.mot });
  return `<span class="issue-status-icon">${svg}</span>`;
}
