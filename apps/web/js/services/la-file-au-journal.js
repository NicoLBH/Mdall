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

import { lorigineDunGeste } from "./run-partition.js";
import { LE_GESTE, leNomDeLaction } from "./le-journal-du-depouillement.js";
import { phraseDuConvoi } from "./le-convoi.js";
import { GESTE_DES_CR, LA_FONCTION_DU_GESTE, leGesteDeLaLigne } from "./reveiller-la-file.js";
import { ceQueLaFileDit } from "./les-familles-de-document.js";
import { phraseDeLaFile } from "./la-file-des-comptes-rendus.js";

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => Number(valeur) || 0;

/**
 * Ce geste est-il un travail de la file ?
 *
 * **La question se pose sur une course finie, pas sur une ligne de file.** Une
 * course écrit son geste dans `project_runs`, et l'onglet qui la range en dépend
 * : rangée dans « Partagées », elle annoncerait comme lue par tout le projet ce
 * que la base ne rend qu'à son auteur.
 *
 * La liste vient de `LA_FONCTION_DU_GESTE` : un geste de la file est, par
 * définition, un geste qu'une fonction de bord vide (règle 10).
 */
export function estUnGesteDeLaFile(geste = "") {
  return Object.hasOwn(LA_FONCTION_DU_GESTE, texte(geste));
}

/**
 * D'où vient ce geste, tel que l'écran le dit sous le nom de l'exécution.
 *
 * **Deux gestes, deux phrases, un seul endroit où elles s'écrivent** (règle 10).
 * Elles étaient écrites deux fois — une pour la ligne vive, une pour la course
 * finie — et la seconde n'en connaissait qu'une : une lecture de trois comptes
 * rendus s'affichait « Dépôt de messagerie », ce qu'elle n'est pas.
 */
export function laProvenanceDuGeste(geste = "") {
  // **Et non « tout ce qui n'est pas un compte rendu est un dépôt de mails ».**
  // Une lecture de rapports s'annonçait ainsi, déclencheur compris.
  return ceQueLaFileDit(texte(geste))?.provenance ?? "Dépôt de messagerie";
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
  const ou = ceQueLaFileDit(leGesteDeLaLigne(ligne))?.piecesDans ?? "fichiers";
  const liste = ligne?.[ou];
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
  const desCr = leGesteDeLaLigne(ligne) === GESTE_DES_CR;

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
 * Ce que la file donne à voir **pendant** qu'elle tourne.
 *
 * ## Le défaut, dit par celui qui regarde
 *
 * « On est en "En cours", puis boom d'un coup c'est terminé et on affiche douze
 * étapes, que l'on n'a pas vu se réaliser au fur et à mesure. »
 *
 * Il n'y avait **qu'une** étape : « Lecture en cours », avec deux compteurs.
 * Dix-neuf comptes rendus tournaient une heure derrière ce seul bloc, et rien
 * ne distinguait une file qui avance d'une file bloquée.
 *
 * ## Une étape par compte rendu
 *
 * La file les porte déjà, nommés et datés : il n'y avait qu'à les rendre. On
 * voit donc les dix-neuf, chacun passant de l'attente à la lecture puis au
 * vert — et, quand il a résisté, en orange avec son motif.
 *
 * ## Le temps vient de la file, jamais de l'écran
 *
 * `commenceLe` est posé par le serveur quand il prend le compte rendu. Compter
 * depuis le rendu de la page aurait remis le compteur à zéro à chaque
 * battement, c'est-à-dire mesuré la patience de l'écran et non celle du travail.
 */
export function lesEtapesDeLaFile(ligne = null, {
  statut = "", geste = "", combien = 0, maintenant = Date.now()
} = {}) {
  /**
   * **Les mots de l'étape viennent de la famille.**
   *
   * Ils étaient choisis par un booléen « est-ce un compte rendu ? » : une lecture
   * de rapports affichait donc « Rangement en cours — Fichiers : 0 », les mots du
   * dépôt de messagerie sur un travail qui n'en est pas un.
   */
  const laFile = ceQueLaFileDit(geste);
  const dit = {
    enCours: laFile?.enCours ?? "Rangement en cours",
    pieces: laFile?.pieces ?? "Fichiers"
  };
  // Une file dont les pas sont nommés document par document : les deux lectures.
  const parDocument = laFile?.piecesDans === "documents";
  // **Rien n'est pris : une seule étape, et elle le dit.** Détailler dix-neuf
  // attentes avant que le serveur ait seulement répondu ferait un mur de gris
  // qui n'apprend rien.
  if (statut === "en_attente") {
    return [{
      id: "en_attente",
      label: "En attente du serveur",
      ms: null,
      statut: "en-cours",
      lignes: [`${dit.pieces} : ${combien}`]
    }];
  }

  const pas = Array.isArray(ligne?.avancement?.pas) ? ligne.avancement.pas : [];

  // Un dépôt de messagerie n'a pas de pas nommés : ses fichiers se déplient en
  // messages, et c'est le convoi qui compte. On garde son bloc, et ses nombres.
  if (!parDocument || !pas.length) {
    return [{
      id: statut || "en_cours",
      label: dit.enCours,
      ms: null,
      // **En cours n'est pas fait.** Cette étape portait « ok », et le graphe
      // la peignait en vert avec sa coche : on lisait « Rangement en cours »
      // sous une coche verte pendant que le bandeau disait « En cours ».
      statut: "en-cours",
      lignes: parDocument
        ? [`${dit.pieces} : ${combien}`, `Lus : ${pas.filter((un) => un?.ou === "lu").length}`]
        : [`${dit.pieces} : ${combien}`, `Messages versés : ${nombre(ligne?.avancement?.verses)}`]
    }];
  }

  return pas.map((un, rang) => {
    const ou = texte(un?.ou);
    const rate = ou === "echoue";
    const court = ou === "en-cours";

    return {
      id: texte(un?.id) || `pas-${rang}`,
      label: texte(un?.nom) || "Compte rendu",
      /**
       * **Quand le serveur a pris ce compte rendu.**
       *
       * C'est ce qui permet de voir ce qui a tourné en même temps : depuis que
       * la file en lit trois de front, un chemin qui les dessine à la suite dit
       * que le quatrième a attendu le troisième. `null` quand rien n'a
       * commencé — et c'est une information, pas un zéro (règle 5).
       */
      debut: quandIlAcommence(un?.commenceLe),
      // La durée d'un pas fini. Celle d'un pas qui court se dit autrement : une
      // durée figée sous une icône qui tourne se lirait comme un temps total.
      ms: court ? null : (Number.isFinite(Number(un?.dureeMs)) ? Number(un.dureeMs) : null),
      statut: rate ? "echec" : court ? "en-cours" : (ou === "lu" ? "ok" : "attente"),
      lignes: lesMotsDunPas(un, { court, rate, maintenant })
    };
  });
}

/**
 * L'instant où le serveur a pris ce compte rendu, ou `null`.
 *
 * **La question se pose avant la conversion.** `Number(null)` et `Number("")`
 * valent **0**, qui est un instant fini : un pas en attente se serait rangé au
 * tout début de l'exécution, avec ceux qui ont réellement démarré, et le chemin
 * l'aurait empilé avec eux (règle 5).
 */
function quandIlAcommence(declare) {
  if (declare === null || declare === undefined || declare === "") return null;
  const quand = Number(declare);
  return Number.isFinite(quand) ? quand : null;
}

/** Ce qu'une étape de la file dit d'elle-même, sous son nom. */
function lesMotsDunPas(un, { court, rate, maintenant }) {
  if (rate) {
    return [{ niveau: "echec", texte: texte(un?.motif) || "n'a pas pu être lu" }];
  }

  if (court) {
    const debut = Number(un?.commenceLe);
    // **Depuis quand**, et non « en cours ». Une étape qui tourne depuis huit
    // minutes et une étape qui vient de partir se lisaient pareil, et c'est la
    // seule chose qu'on cherche à savoir en regardant.
    return Number.isFinite(debut) && maintenant > debut
      ? [`depuis ${enDuree(maintenant - debut)}`]
      : ["en cours…"];
  }

  return texte(un?.ou) === "lu" ? [texte(un?.lecture) || "lu"] : ["en attente"];
}

/**
 * Une durée, dite comme on la dit.
 *
 * Les secondes jusqu'à la minute, puis les minutes : « depuis 94 s » se lit
 * moins bien que « depuis 1 min 34 s », et personne ne compte en secondes
 * au-delà de la minute.
 */
export function enDuree(ms = 0) {
  const total = Math.max(0, Math.round(nombre(ms) / 1000));
  if (total < 60) return `${total} s`;

  const minutes = Math.floor(total / 60);
  const secondes = total % 60;
  if (minutes < 60) return secondes ? `${minutes} min ${secondes} s` : `${minutes} min`;

  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste ? `${heures} h ${reste} min` : `${heures} h`;
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

  const geste = leGesteDeLaLigne(ligne);
  const combien = combienDePieces(ligne);
  const debut = ligne?.cree_le ? new Date(ligne.cree_le).getTime() : Date.now();

  /**
   * **Le nom vient de la famille, et non d'un binaire.**
   *
   * Il y avait deux cas : comptes rendus, ou tout le reste. Une lecture de
   * rapports de bureau de contrôle tombait donc du côté des mails, et Actions
   * affichait « Versement de 0 fichier de messagerie » sur une analyse de
   * rapport — faux sur le travail, faux sur le nombre, et faux sur l'origine.
   *
   * Le repli garde l'ancien nom pour un geste qu'on ne connaît pas : une ligne
   * posée par une version plus récente que cet écran reste lisible.
   */
  const nom = ceQueLaFileDit(geste)?.titre(combien) ?? leNomDeLaction(combien);
  const dAou = laProvenanceDuGeste(geste);

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
    // **L'origine vient du geste, et la règle vit à un seul endroit**
    // (`run-partition.js`, `docs/dou-vient-une-execution.md`). Une lecture de
    // comptes rendus est un essai : elle relit des documents déjà là, et
    // s'affichait pourtant sous « Versements », où l'on cherche ce qu'on a
    // apporté.
    origine: lorigineDunGeste(geste),
    // Qui l'a lancée : le journal le dit pour toutes les exécutions, et une
    // ligne de file en est une.
    ownerId: texte(ligne?.owner_id),
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
        steps: lesEtapesDeLaFile(ligne, { statut, geste, combien })
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
