/**
 * Comment nommer une proposition.
 *
 * Le nom du premier fichier faisait l'affaire, et c'était mauvais : « 3_28-08-24
 * - 74LEREPOSOIRMAIRIE… » ne dit rien de ce qu'on soumet, et surtout rien de ce
 * qu'il y a d'autre dans le lot.
 *
 * Un bon titre est celui qu'on écrirait soi-même sur une pull request : il dit
 * **ce qu'on apporte**, pas d'où ça vient. Trois informations suffisent, et il
 * n'en faut pas une de plus — combien, de quelle nature, de qui :
 *
 *   « 3 rapports d'étape et 2 fiches avis travaux — SOCOTEC »
 *
 * Aucun appel à un modèle de langage. Tout est déjà là : la reconnaissance a
 * nommé chaque document, et le pack de l'émetteur sait comment ses livrables se
 * nomment au pluriel. Faire appeler un LLM pour assembler trois nombres serait
 * payer cher une phrase qu'on sait écrire.
 */

import { lowerFirst } from "../utils/lower-first.js";

/** Au-delà, on cesse d'énumérer : un titre n'est pas un inventaire. */
const MAX_NATURES = 2;

function countBy(values) {
  const tally = new Map();
  for (const value of values) tally.set(value, (tally.get(value) ?? 0) + 1);
  return [...tally.entries()].sort((left, right) => right[1] - left[1]);
}

/**
 * Le libellé d'une nature, accordé au nombre.
 *
 * Le pluriel vient du pack, jamais d'une règle appliquée au libellé : « Rapport
 * initial » donne « Rapports initiaux », qu'aucun « s » ajouté au premier mot ne
 * produirait.
 */
function nature(recognition, count) {
  const label = count > 1 ? recognition.kindLabelPlural ?? recognition.kindLabel : recognition.kindLabel;
  return String(label ?? "").trim();
}

/**
 * Le titre proposé pour un lot.
 *
 * Il reste **une proposition** : le champ est modifiable, et l'utilisateur qui
 * sait mieux écrit mieux. Ce qu'on lui doit, c'est de ne pas avoir à effacer
 * quelque chose d'absurde avant de commencer.
 *
 * @param {{recognition: object|null}[]} inspections ce que l'examen a compris de chaque fichier
 * @param {{fallbackCount?: number}} options le nombre de fichiers, quand aucun n'a été examiné
 */
export function proposeTitle(inspections = [], { fallbackCount = 0 } = {}) {
  const total = inspections.length || fallbackCount;
  const reconnus = inspections.filter((entry) => entry?.recognition?.kindLabel);

  if (reconnus.length === 0) {
    return total > 1 ? `Dépôt de ${total} documents` : "Dépôt d'un document";
  }

  // Les natures, de la plus représentée à la moins. Le lecteur veut savoir en
  // premier ce qu'il y a le plus.
  const parNature = new Map();
  for (const entry of reconnus) {
    const cle = entry.recognition.kindLabel;
    if (!parNature.has(cle)) parNature.set(cle, { recognition: entry.recognition, count: 0 });
    parNature.get(cle).count += 1;
  }

  const natures = [...parNature.values()].sort((left, right) => right.count - left.count);
  const nommees = natures.slice(0, MAX_NATURES);
  const reste = natures.slice(MAX_NATURES).reduce((somme, entry) => somme + entry.count, 0);

  const morceaux = nommees.map((entry) => `${entry.count} ${lowerFirst(nature(entry.recognition, entry.count))}`);
  if (reste > 0) morceaux.push(`${reste} autre${reste > 1 ? "s" : ""} livrable${reste > 1 ? "s" : ""}`);

  // « a, b et c » : la dernière conjonction est un « et », comme on parle.
  const enumeration =
    morceaux.length === 1
      ? morceaux[0]
      : `${morceaux.slice(0, -1).join(", ")} et ${morceaux[morceaux.length - 1]}`;

  // L'émetteur n'est nommé que s'il n'y en a qu'un. Deux bureaux de contrôle
  // dans un même lot méritent d'être lus dans le détail, pas résumés à l'un
  // d'eux.
  const auteurs = countBy(reconnus.map((entry) => entry.recognition.authorLabel).filter(Boolean));
  const signature = auteurs.length === 1 ? ` — ${auteurs[0][0]}` : "";

  const ignores = total - reconnus.length;
  const appoint = ignores > 0 ? `, et ${ignores} autre${ignores > 1 ? "s" : ""} document${ignores > 1 ? "s" : ""}` : "";

  return `${enumeration}${signature}${appoint}`;
}
