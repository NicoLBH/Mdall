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
import { GESTE_DES_CR } from "./lancer-la-lecture-des-cr.js";
import { phraseDeLaFile } from "./la-file-des-comptes-rendus.js";

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => Number(valeur) || 0;

/** Le geste que cette ligne demande. `mails` quand rien ne le dit. */
function leGeste(ligne) {
  return texte(ligne?.geste) === GESTE_DES_CR ? GESTE_DES_CR : "mails";
}

/**
 * Combien de pièces cette ligne porte.
 *
 * **Deux colonnes, et le geste dit laquelle lire** : les mails portent des
 * chemins d'octets dans le casier, les comptes rendus des identifiants de
 * documents déjà rangés. Compter sur la mauvaise aurait annoncé « Lecture de 0
 * compte rendu » sur une file de dix-neuf.
 */
export function combienDePieces(ligne = null) {
  const liste = leGeste(ligne) === GESTE_DES_CR ? ligne?.documents : ligne?.fichiers;
  return Array.isArray(liste) ? liste.length : 0;
}

/**
 * Ce qu'on dit d'un travail qui n'a pas encore commencé.
 *
 * **« En attente » et « en cours » ne se disent pas pareil**, et c'est utile :
 * un travail qui attend depuis dix minutes n'a pas le même problème qu'un
 * travail qui tourne depuis dix minutes. Le premier n'a pas été pris — le
 * serveur n'a pas répondu au réveil —, le second avance.
 */
export function leMotDeLaFile(ligne = null) {
  const combien = combienDePieces(ligne);
  const desCr = leGeste(ligne) === GESTE_DES_CR;

  if (texte(ligne?.statut) === "en_attente") {
    return desCr
      ? `${combien} ${combien > 1 ? "comptes rendus envoyés" : "compte rendu envoyé"} : `
        + "le serveur va les prendre."
      : `${combien} ${combien > 1 ? "fichiers envoyés" : "fichier envoyé"} : `
        + "le serveur va les prendre.";
  }

  // En cours : le serveur écrit son avancement au fur et à mesure, et c'est la
  // **même phrase que partout ailleurs** pour le même compte — celle de la file
  // pour les comptes rendus, celle du convoi pour les mails. En écrire une
  // troisième ici aurait fait trois façons de dire le même avancement (règle 4).
  const dite = desCr
    ? phraseDeLaFile(ligne?.avancement)
    : phraseDuConvoi(ligne?.avancement);

  return dite || (desCr
    ? "Lecture en cours sur le serveur…"
    : "Rangement en cours sur le serveur…");
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

  const combien = combienDePieces(ligne);
  const desCr = leGeste(ligne) === GESTE_DES_CR;
  const debut = ligne?.cree_le ? new Date(ligne.cree_le).getTime() : Date.now();

  // **Deux gestes, deux noms, un seul endroit où ils s'écrivent** (règle 10).
  const nom = desCr
    ? `Lecture de ${combien} ${combien > 1 ? "comptes rendus" : "compte rendu"} de chantier`
    : leNomDeLaction(combien);
  const dAou = desCr ? "Lecture de comptes rendus" : "Dépôt de messagerie";

  return {
    // **L'identifiant de la file, tel quel.** Quand la course finira par
    // s'écrire dans `project_runs`, elle en portera un autre : les deux lignes
    // ne se confondront donc pas, et la vive s'effacera parce qu'elle ne sera
    // plus rendue par la file — pas parce qu'on l'aura devinée.
    id,
    name: nom,
    kind: LE_GESTE,
    agentKey: LE_GESTE,
    lifecycleStatus: "running",
    outcomeStatus: null,
    // Ce mot-là est ce qui fait apparaître le sablier, et ce qui fait qu'une
    // relecture de la base ne l'efface pas (`run-partition.js`).
    status: "running",
    triggerType: "manual",
    triggerLabel: dAou,
    trigger: { type: LE_GESTE, label: dAou },
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
          label: statut === "en_attente"
            ? "En attente du serveur"
            : (desCr ? "Lecture en cours" : "Rangement en cours"),
          ms: null,
          // **En cours n'est pas fait.** Cette étape portait « ok », et le
          // graphe la peignait en vert avec sa coche : on lisait « Rangement en
          // cours » sous une coche verte, pendant que le bandeau disait « En
          // cours ». Deux choses contraires dans la même vue, et c'est la
          // rassurante qu'on croit.
          //
          // Le mot est celui que le graphe connaît déjà pour une fusion en
          // route (`run-workflow.js`) : il en fait une icône qui tourne.
          statut: "en-cours",
          lignes: desCr
            ? [
              `Comptes rendus : ${combien}`,
              `Lus : ${(ligne?.avancement?.pas ?? []).filter((un) => un?.ou === "lu").length}`
            ]
            : [`Fichiers : ${combien}`, `Messages versés : ${nombre(ligne?.avancement?.verses)}`]
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
