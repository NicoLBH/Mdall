/**
 * Le dépouillement : **un fichier déposé en devient plusieurs**.
 *
 * ## Ce qui est vraiment neuf
 *
 * Fichiers savait déjà déposer, inspecter, reconnaître et proposer. Ce qu'il ne
 * savait pas faire, c'est **dépouiller** : un `.msg` vaut un message et ses
 * pièces, un `.zip` en vaut cent. `inspectFile` reconnaît, il ne fend rien
 * (`docs/nourrir-mdall.md`, § 8 quinquies).
 *
 * ## Une seule confidentialité, et c'est ce qui a simplifié l'écran
 *
 * On avait prévu de montrer deux destinations et **deux régimes** : le message
 * dans « Mails », privé ; la pièce dans Fichiers, partagée. Un dépôt qui
 * franchit cette frontière en silence n'est pas une commodité, c'est un défaut
 * de confidentialité — et une pièce jointe est de la correspondance autant que
 * le message qui la portait.
 *
 * Les deux vont donc dans le dossier privé. Le dépôt **ne franchit plus aucune
 * frontière**, et l'étape cesse d'être une demande de consentement pour devenir
 * ce qu'elle doit être : un état des lieux avant d'agir. Le consentement se
 * déplace là où il vaut quelque chose — au moment de sortir une pièce du dossier
 * privé, une à la fois, par un geste délibéré (`le-dossier-des-mails.js`).
 *
 * ## Deux endroits quand même, et ce ne sont pas deux régimes
 *
 * `Mails/` pour les messages, `Mails/Pièces jointes/` pour les pièces. Non par
 * prudence, mais parce qu'un dossier qui mêle deux cents `.eml` et quatre cents
 * plans ne se parcourt pas.
 *
 * ## Il est pur
 *
 * Il ne lit aucun fichier, ne dépose rien, ne dessine rien. Il partage, il
 * projette, il dit. Ce qui lit et ce qui dépose lui sont donnés
 * (`le-versement-en-ordre.js`).
 */

import {
  DOSSIER_DES_MAILS, DOSSIER_DES_PIECES, EXTENSION_DUN_MAIL
} from "./le-dossier-des-mails.js";
import { poidsDit } from "../utils/poids-dit.js";
// **Ce qu'un fichier porte se demande à un seul endroit.** Le dépouillement et
// la lecture des mails posent la même question ; deux réponses auraient fini
// par ne plus dire la même chose (règle 10).
import { estUnPorteurDeMails } from "./les-messages-dun-fichier.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Partager un dépôt en deux : ce qui se dépouille, et ce qui se dépose.
 *
 * **Les deux, dans le même geste.** Obliger à deux dépôts séparés — les plans
 * d'un côté, les mails de l'autre — ferait se tromper une fois sur deux. Ce qui
 * n'est pas un porteur de mails suit le chemin habituel, sans rien savoir de
 * celui-ci.
 */
export function lePartageDuDepot(fichiers = []) {
  const tous = [...(fichiers ?? [])];
  const porteurs = tous.filter((un) => estUnPorteurDeMails(un?.name));
  return {
    porteurs,
    ordinaires: tous.filter((un) => !estUnPorteurDeMails(un?.name))
  };
}

/**
 * Où va quoi. Nommé ici, pas dessiné dans l'écran.
 *
 * L'écran annonce ces chemins **avant** d'agir, et le dépôt les emprunte. Deux
 * listes auraient fini par annoncer un dossier et écrire dans un autre — c'est
 * exactement le genre de divergence qu'on ne voit jamais, puisque les deux
 * paraissent justes (règle 4).
 */
export const LES_DESTINATIONS = [
  { cle: "messages", chemin: [DOSSIER_DES_MAILS], quoi: "Les messages", unite: ["message", "messages"] },
  {
    cle: "pieces",
    chemin: [DOSSIER_DES_MAILS, DOSSIER_DES_PIECES],
    quoi: "Les pièces jointes",
    unite: ["pièce jointe", "pièces jointes"]
  }
];

/** Un chemin, tel qu'on le lit : « Mails / Pièces jointes ». */
export function cheminDit(chemin = []) {
  return (chemin ?? []).map((un) => texte(un)).filter(Boolean).join(" / ");
}

/**
 * Ce qui se répète, et **ce qu'on garde**.
 *
 * Le premier exemplaire de chaque empreinte, dans l'ordre d'arrivée. Sans
 * empreinte, jamais « déjà vu » : on ne sait pas, et ne pas savoir n'est pas
 * savoir que non (règle 5) — la pièce part donc, au risque d'un doublon, plutôt
 * que de disparaître.
 *
 * @returns {{distinctes: object[], repetees: number, poidsEvite: number}}
 */
export function lesPiecesDistinctes(pieces = []) {
  const vues = new Set();
  const distinctes = [];
  let repetees = 0;
  let poidsEvite = 0;

  for (const une of pieces ?? []) {
    const empreinte = texte(une?.empreinte);

    // **Une seule garde, et elle décide tout.** Il y en avait deux — une au
    // moment de comparer, une au moment de retenir —, et la seconde rendait la
    // première inatteignable : on pouvait la supprimer sans qu'aucune épreuve
    // ne tombe. Une décision écrite à deux endroits finit par ne plus être
    // relue qu'à un seul (règle 4).
    if (!empreinte) {
      distinctes.push(une);
      continue;
    }

    if (vues.has(empreinte)) {
      repetees += 1;
      poidsEvite += Number(une?.taille) || 0;
      continue;
    }

    vues.add(empreinte);
    distinctes.push(une);
  }

  return { distinctes, repetees, poidsEvite };
}

/**
 * Ce que ce dépôt va écrire, et où — avant de l'écrire.
 *
 * Les pièces sont comptées **après dédoublonnage** : annoncer quatre cents
 * pièces pour en déposer quarante ferait croire à une panne au moment du
 * compte rendu.
 *
 * **Ce qui ne compte pour rien ne s'annonce pas.** Un dépôt de messages sans
 * pièce ne doit pas promettre un dossier « Pièces jointes » qui restera vide.
 */
export function ceQuiIraOu({ messages = 0, pieces = 0, poidsDesPieces = 0 } = {}) {
  const combien = { messages: Number(messages) || 0, pieces: Number(pieces) || 0 };
  const poids = { messages: 0, pieces: Number(poidsDesPieces) || 0 };

  return LES_DESTINATIONS
    .filter((une) => combien[une.cle] > 0)
    .map((une) => ({
      ...une,
      combien: combien[une.cle],
      poids: poids[une.cle],
      dit: `${combien[une.cle]} ${combien[une.cle] > 1 ? une.unite[1] : une.unite[0]}`
        + (poids[une.cle] ? ` (${poidsDit(poids[une.cle])})` : "")
    }));
}

/**
 * Ce que l'écran dit du régime, en une phrase.
 *
 * Elle nomme **l'équipe**, et pas seulement « privé » : le mot seul laisse
 * chacun deviner de qui il se protège. Et elle dit comment en sortir — un régime
 * dont on ne sait pas sortir se contourne en ne l'utilisant pas.
 */
export function phraseDeLaConfidentialite() {
  return `Tout va dans « ${DOSSIER_DES_MAILS} » : le dossier est visible par `
    + "l'équipe, mais vous seul verrez ce que vous y déposez. Pour partager "
    + `une pièce, déplacez-la hors de « ${DOSSIER_DES_MAILS} » — c'est le seul `
    + "geste qui la rend visible.";
}

/**
 * Ce que le dépouillement a trouvé, en une phrase, **avant** d'agir.
 *
 * Vide quand il n'y a rien à dépouiller : une phrase « 0 message » apprend à ne
 * plus lire les phrases.
 */
export function phraseDuProjet({ fichiers = 0, messages = 0, pieces = 0, poidsDesPieces = 0 } = {}) {
  const combien = Number(fichiers) || 0;
  if (!combien) return "";

  const dits = [`${combien} ${combien > 1 ? "fichiers déposés" : "fichier déposé"}`];

  const m = Number(messages) || 0;
  if (m) dits.push(`${m} ${m > 1 ? "messages" : "message"}`);

  const p = Number(pieces) || 0;
  if (p) {
    dits.push(`${p} ${p > 1 ? "pièces jointes" : "pièce jointe"}`
      + (poidsDesPieces ? ` (${poidsDit(poidsDesPieces)})` : ""));
  }

  return dits.join(" · ");
}
