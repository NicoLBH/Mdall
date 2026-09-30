/**
 * Ce que la file des versements donne à lire dans Actions.
 *
 * ## Pourquoi une conversion, et pas une lecture directe
 *
 * L'onglet Actions dessine des **exécutions** : un nom, un état, une date, une
 * durée. Une ligne de file n'en est pas une — c'est un travail qui n'a pas
 * encore eu lieu. Mais pour celui qui regarde, c'est la même chose : « mon dépôt
 * de vingt-quatre mails, où en est-il ? ».
 *
 * On convertit donc, ici, une fois. Laisser l'écran lire la file directement
 * l'aurait obligé à connaître deux formes pour une même question, et la seconde
 * aurait fini par ne plus ressembler à la première (règle 4).
 *
 * ## Elle est vive, donc elle survit à la relecture
 *
 * `run-partition.js` garde les exécutions `running` que la base ne porte pas
 * encore. C'est exactement le cas d'un versement en cours : il n'aura sa ligne
 * dans `project_runs` qu'à la fin. La conversion pose donc `status: "running"`,
 * et l'écran montre le sablier.
 *
 * ## Elle est pure
 *
 * Des lignes entrent, des exécutions sortent. Ce qui les lit en base est
 * ailleurs.
 */

import { ORIGINE } from "./run-partition.js";
import { LE_GESTE, leNomDeLaction } from "./le-journal-du-depouillement.js";
import { phraseDuConvoi } from "./le-convoi.js";

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => Number(valeur) || 0;

/**
 * Ce qu'on dit d'un versement qui n'a pas encore commencé.
 *
 * **« En attente » et « en cours » ne se disent pas pareil**, et c'est utile :
 * un dépôt qui attend depuis dix minutes n'a pas le même problème qu'un dépôt
 * qui travaille depuis dix minutes. Le premier n'a pas été pris — le serveur
 * n'a pas répondu au réveil —, le second avance.
 */
export function leMotDeLaFile(ligne = null) {
  const combien = Array.isArray(ligne?.fichiers) ? ligne.fichiers.length : 0;
  if (texte(ligne?.statut) === "en_attente") {
    return `${combien} ${combien > 1 ? "fichiers envoyés" : "fichier envoyé"} : `
      + "le serveur va les prendre.";
  }

  // En cours : le serveur écrit son avancement au fur et à mesure, et c'est la
  // même phrase que partout ailleurs pour le même compte.
  const dite = phraseDuConvoi(ligne?.avancement);
  return dite || "Rangement en cours sur le serveur…";
}

/**
 * Une ligne de file, telle que l'onglet Actions la dessine.
 *
 * @param {object} ligne une ligne de `versements`
 * @returns {object|null} une exécution vive, ou `null` si la ligne n'en est pas
 */
export function laFileAuJournal(ligne = null) {
  const statut = texte(ligne?.statut);
  if (statut !== "en_attente" && statut !== "en_cours") return null;

  const id = texte(ligne?.id);
  if (!id) return null;

  const combien = Array.isArray(ligne?.fichiers) ? ligne.fichiers.length : 0;
  const debut = ligne?.cree_le ? new Date(ligne.cree_le).getTime() : Date.now();

  return {
    // **L'identifiant de la file, tel quel.** Quand la course finira par
    // s'écrire dans `project_runs`, elle en portera un autre : les deux lignes
    // ne se confondront donc pas, et la vive s'effacera parce qu'elle ne sera
    // plus rendue par la file — pas parce qu'on l'aura devinée.
    id,
    name: leNomDeLaction(combien),
    kind: LE_GESTE,
    agentKey: LE_GESTE,
    lifecycleStatus: "running",
    outcomeStatus: null,
    // Ce mot-là est ce qui fait apparaître le sablier, et ce qui fait qu'une
    // relecture de la base ne l'efface pas (`run-partition.js`).
    status: "running",
    triggerType: "manual",
    triggerLabel: "Dépôt de messagerie",
    trigger: { type: LE_GESTE, label: "Dépôt de messagerie" },
    origine: ORIGINE.VERSEMENT,
    privee: true,
    documentName: "",
    subject: { documentName: "" },
    startedAt: debut,
    endedAt: null,
    durationMs: null,
    summary: leMotDeLaFile(ligne),
    details: {
      corpus: {
        geste: LE_GESTE,
        steps: [{
          id: statut,
          label: statut === "en_attente" ? "En attente du serveur" : "Rangement en cours",
          ms: null,
          statut: "ok",
          lignes: [`Fichiers : ${combien}`, `Messages versés : ${nombre(ligne?.avancement?.verses)}`]
        }]
      }
    },
    createdAt: debut,
    updatedAt: Date.now()
  };
}

/** Toutes les lignes vives d'une file, les plus récentes d'abord. */
export function lesVersementsAuJournal(lignes = []) {
  return (Array.isArray(lignes) ? lignes : [])
    .map((une) => laFileAuJournal(une))
    .filter(Boolean);
}
