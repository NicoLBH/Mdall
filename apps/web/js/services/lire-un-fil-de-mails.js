/**
 * Lire un fil de mails déjà déposés dans le projet, dans l'ordre.
 *
 * ## Ce qui manquait, et pourquoi le tableau avait une colonne vide
 *
 * *Analyse de documents* sait **montrer** les fils déjà lus et rouvrir leur
 * détail : la famille Mails y a son rail, son tableau, sa ligne. Ce qu'elle
 * n'avait pas, c'est de quoi en **lancer** une — la lecture d'un fil ne partait
 * que de son ancien utilitaire, où l'on déposait des `.eml` depuis le disque.
 *
 * Autrement dit : les mails versés dans un chantier restaient là, et l'écran qui
 * existe pour dire « qu'est-ce qui a déjà été analysé ici » ne pouvait rien en
 * faire. Le voici appelé.
 *
 * ## Pourquoi ce chemin ne passe pas par la file du serveur
 *
 * Les deux autres familles y passent, et c'est la règle de l'écran. Celle-ci
 * fait exception, pour une raison qui tient en une phrase : **un fil est un
 * appel, pas un lot.**
 *
 * La file existe parce que dix-neuf comptes rendus font dix-neuf appels de
 * plusieurs minutes, qu'un navigateur fermé interromprait. Un fil, lui, monte
 * **une fois**, tous ses messages ensemble — c'est ce qui le rend bon marché, et
 * c'est aussi ce qui le rend court. Le mettre en file coûterait une fonction de
 * bord, un geste, une table de plus, pour supprimer une attente de quelques
 * secondes qui n'existe pas.
 *
 * Et le dépliage est **gratuit dans le navigateur** : séparer le propos de la
 * citation, recoudre l'ordre, retrouver les doublons ne demande aucun modèle. Le
 * faire au serveur ferait monter huit fois la même correspondance privée pour
 * n'en garder qu'une version.
 *
 * **Ce qui ferait changer d'avis** : un fil assez gros pour devoir être coupé en
 * plusieurs appels. Ce jour-là, c'est un lot, et il ira en file comme les autres.
 *
 * ## Ce module n'appelle le réseau nulle part
 *
 * Les deux allers-retours lui sont **passés** : descendre les octets d'un
 * document, et relever le fil. Il décide de l'ordre, de ce qu'un échec laisse
 * passer, et de ce que la lecture devient. C'est ce qui permet d'éprouver le
 * parcours entier, échecs compris, sans serveur — y compris le cas qu'aucun
 * essai en ligne ne reproduit : un document sur trois qui ne descend pas.
 */

import { leFilDesMails } from "./le-fil-des-mails.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Pourquoi une lecture de fil n'a pas eu lieu.
 *
 * Nommés : l'écran doit pouvoir le dire, et les trois appellent des gestes
 * différents — choisir des mails, en choisir d'autres, ou réessayer.
 */
export const REFUS_DU_FIL = {
  /** On n'a rien choisi. */
  SANS_MAIL: "sans-mail",
  /** Les fichiers choisis n'ont porté aucun message lisible. */
  SANS_MESSAGE: "sans-message",
  /**
   * Le relevé n'a pas abouti.
   *
   * **Et la lecture ne se garde pas pour autant.** Un fil déplié sans relevé se
   * redéplie gratuitement ; en garder une ligne ferait une liste d'essais au
   * lieu d'une liste de fils lus (règle 6).
   */
  SANS_RELEVE: "sans-releve"
};

export const PHRASES_DU_REFUS_DU_FIL = {
  [REFUS_DU_FIL.SANS_MAIL]: "aucun mail n'a été choisi : il n'y a pas de fil à lire",
  [REFUS_DU_FIL.SANS_MESSAGE]: "aucun message n'a pu être tiré de ces fichiers — "
    + "une archive vide, ou des dépôts qui ne se sont pas terminés",
  [REFUS_DU_FIL.SANS_RELEVE]: "le relevé des prises de position n'a pas abouti : "
    + "le fil n'est pas conservé, et se relira sans rien coûter de plus"
};

export function phraseDuRefusDuFil(motif) {
  return PHRASES_DU_REFUS_DU_FIL[texte(motif)] ?? "";
}

/** Les étapes, pour que l'écran dise où l'on en est. */
export const ETAPE_DU_FIL = {
  OCTETS: "octets",
  FIL: "fil",
  RELEVE: "releve"
};

export const PHRASES_DES_ETAPES_DU_FIL = {
  [ETAPE_DU_FIL.OCTETS]: "Descente des mails",
  [ETAPE_DU_FIL.FIL]: "Dépliage du fil",
  [ETAPE_DU_FIL.RELEVE]: "Relevé des prises de position"
};

/**
 * Lire un fil à partir des documents choisis.
 *
 * @param {object[]} documents les mails choisis, tels que Fichiers les décrit
 * @param {object} outils
 * @param {(document: object) => Promise<{octets: Uint8Array, nom: string}|null>} outils.octetsDu
 * @param {(octets: Uint8Array, nom: string) => Promise<{messages: object[]}>} outils.messagesDe
 * @param {(quoi: {filId: string, messages: object[]}) => Promise<object>} outils.releverLeFil
 * @param {(quoi: {quoi: string, combien?: number}) => void} [outils.onEtape]
 */
export async function lireUnFilDeMails(documents = [], {
  octetsDu = null,
  messagesDe = null,
  releverLeFil = null,
  onEtape = null
} = {}) {
  const choisis = liste(documents);
  if (!choisis.length) return { ok: false, motif: REFUS_DU_FIL.SANS_MAIL };

  /* ── 1. Les octets ───────────────────────────────────────────────────────── */

  await onEtape?.({ quoi: ETAPE_DU_FIL.OCTETS, combien: choisis.length });

  const porteurs = [];
  const perdus = [];
  for (const document of choisis) {
    const descendu = await octetsDu?.(document);
    // **Un document qui ne descend pas ne fait pas tomber le fil.** Trois mails
    // sur quatre valent mieux qu'aucun ; ce qui manque est compté et se dit, et
    // c'est ce qui distingue un fil troué d'un fil complet (règle 5).
    if (descendu?.octets) porteurs.push(descendu);
    else perdus.push(texte(document?.nom) || texte(document?.original_filename) || "un document");
  }

  /* ── 2. Le fil ───────────────────────────────────────────────────────────── */

  await onEtape?.({ quoi: ETAPE_DU_FIL.FIL, combien: porteurs.length });

  const messages = [];
  for (const porteur of porteurs) {
    // **Un fichier déposé en vaut plusieurs.** Un `.zip` porte tout un dossier
    // de messages ; les donner un à un au fil, c'est ce qui fait qu'un export
    // d'Outlook se lit ici comme ailleurs.
    const dedans = await messagesDe?.(porteur.octets, porteur.nom);
    for (const un of liste(dedans?.messages)) if (un?.octets) messages.push(un);
  }

  if (!messages.length) {
    return { ok: false, motif: REFUS_DU_FIL.SANS_MESSAGE, perdus };
  }

  const fil = leFilDesMails(messages.map((un) => un.octets));
  const fichiers = messages.map((un) => texte(un?.nom)).filter(Boolean);

  /* ── 3. Le relevé ────────────────────────────────────────────────────────── */

  await onEtape?.({ quoi: ETAPE_DU_FIL.RELEVE, combien: liste(fil?.messages).length });

  const releve = await releverLeFil?.({
    filId: texte(fil?.objet),
    messages: liste(fil?.messages)
  });

  if (!releve?.ok) {
    return {
      ok: false,
      motif: REFUS_DU_FIL.SANS_RELEVE,
      perdus,
      // Ce que le relevé a répondu, pour que l'écran dise *pourquoi* : une
      // session expirée et un fournisseur en panne se réparent autrement.
      refus: texte(releve?.motif),
      fil
    };
  }

  return {
    ok: true,
    perdus,
    /**
     * Ce que l'écran garde et conserve.
     *
     * C'est la **forme de la vue** du lecteur de mails, celle que
     * `laLigneDunFil` sait écrire et que `laVueDunFil` sait rouvrir. En
     * fabriquer une seconde ici aurait donné deux formes de lecture de fil, et
     * la plus récente aurait été illisible par l'écran le plus ancien (règle 4).
     */
    vue: { fil, fichiers, releve, idees: [] }
  };
}

/**
 * Ce que l'écran annonce avant de lire.
 *
 * **Le nombre de mails, et le fait qu'ils n'en font qu'un.** « Lire 7 mails »
 * laisserait croire à sept lectures, donc à sept appels ; ce qui part est un
 * fil, et il coûte une fois.
 */
export function leMotDuFilALire(combien = 0) {
  const nombre = Math.max(0, Math.trunc(Number(combien) || 0));
  if (nombre === 0) return "";
  return nombre === 1
    ? "Lire 1 mail"
    : `Lire ${nombre} mails en un fil`;
}

/**
 * Ce qu'on dit d'un fil lu, une fois la lecture conservée.
 *
 * Les mails qui n'ont pas pu descendre y figurent : un fil troué qui se
 * présenterait comme complet ferait lire une correspondance à laquelle il
 * manque une réponse, sans que rien ne le signale.
 */
export function leMotDuFilLu({ fil = null, perdus = [] } = {}) {
  const combien = liste(fil?.messages).length;
  const morceaux = [`${combien} message${combien > 1 ? "s" : ""} lu${combien > 1 ? "s" : ""}`];

  const manquants = liste(perdus).filter(Boolean);
  if (manquants.length) {
    morceaux.push(`${manquants.length} mail${manquants.length > 1 ? "s" : ""} `
      + `n'${manquants.length > 1 ? "ont" : "a"} pas pu être descendu${
        manquants.length > 1 ? "s" : ""} : le fil est incomplet`);
  }

  return `${morceaux.join(" — ")}.`;
}
