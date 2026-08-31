/**
 * Comment nommer une proposition.
 *
 * Le nom du premier fichier faisait l'affaire, et c'était mauvais : « 3_28-08-24
 * - 74LEREPOSOIRMAIRIE… » ne dit rien de ce qu'on soumet, et surtout rien de ce
 * qu'il y a d'autre dans le lot.
 *
 * Un bon titre est celui qu'on écrirait soi-même sur une pull request : il dit
 * **ce qu'on apporte**, pas d'où ça vient. Combien, de quelle nature, de qui —
 * et **quand**, qui est la seule chose qui distingue les unes des autres vingt
 * propositions faites de livrables SOCOTEC :
 *
 *   « Fiche avis travaux SOCOTEC du 8 septembre 2022 »
 *   « 3 rapports d'étape SOCOTEC, de mars à juin 2024 »
 *   « 3 rapports d'étape et 2 fiches avis travaux — SOCOTEC, avril 2022 »
 *
 * La date d'émission est celle du document, pas celle du dépôt : deux lots
 * déposés le même après-midi peuvent porter des rapports séparés de deux ans,
 * et c'est cet écart-là qu'on cherche dans une liste. À défaut de date, le
 * numéro que le document déclare fait le même office.
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
 * Les mois, en toutes lettres.
 *
 * Écrits ici plutôt que déduits d'une locale : un titre conservé en base ne doit
 * pas changer de langue selon le navigateur de celui qui l'a écrit.
 */
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

/** Une date d'émission, réduite à ce qu'on en lit : année, mois, jour. */
function jalon(value) {
  const brut = String(value ?? "").trim();
  if (!brut) return null;

  const date = new Date(brut);
  if (Number.isNaN(date.getTime())) return null;

  return {
    annee: date.getUTCFullYear(),
    mois: date.getUTCMonth(),
    jour: date.getUTCDate(),
    ordre: date.getTime()
  };
}

/**
 * Ce que les dates d'émission d'un lot disent, en une incise.
 *
 * Trois cas, et ils se lisent différemment :
 *
 *  - **une seule date** : « du 8 septembre 2022 » — le repère le plus précis ;
 *  - **un seul mois** : « de juin 2024 » — inutile d'énumérer trois jours ;
 *  - **une période** : « de mars à juin 2024 », « d'octobre 2023 à mars 2024 ».
 *
 * Un lot dont une partie des documents n'est pas datée n'en dit rien de faux :
 * l'incise décrit ce qui est daté, et les autres se comptent déjà ailleurs.
 */
export function describePeriod(values = []) {
  const jalons = (Array.isArray(values) ? values : []).map(jalon).filter(Boolean);
  if (jalons.length === 0) return "";

  const tri = [...jalons].sort((gauche, droite) => gauche.ordre - droite.ordre);
  const premier = tri[0];
  const dernier = tri[tri.length - 1];

  const memeJour = premier.ordre === dernier.ordre;
  if (memeJour) return `du ${premier.jour} ${MOIS[premier.mois]} ${premier.annee}`;

  const memeMois = premier.annee === dernier.annee && premier.mois === dernier.mois;
  if (memeMois) return `de ${MOIS[premier.mois]} ${premier.annee}`;

  const memeAnnee = premier.annee === dernier.annee;
  const debut = memeAnnee ? MOIS[premier.mois] : `${MOIS[premier.mois]} ${premier.annee}`;
  const fin = `${MOIS[dernier.mois]} ${dernier.annee}`;

  // « d'octobre » et non « de octobre » : l'élision se lit, et son absence
  // s'entend.
  const article = /^[aeiouâéêèîôû]/i.test(debut) ? "d'" : "de ";
  return `${article}${debut} à ${fin}`;
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

  // **Le repère temporel, qui est ce qui distingue une proposition d'une autre.**
  // Vingt dépôts de livrables SOCOTEC portaient vingt fois le même titre ; on ne
  // pouvait les reconnaître qu'en les ouvrant.
  const periode = describePeriod(reconnus.map((entry) => entry.recognition.issuedAt));

  // À défaut de date, le numéro que le document déclare — mais un seul, et
  // seulement s'il n'y en a qu'un : deux numéros dans un titre ne repèrent plus
  // rien.
  const references = countBy(reconnus.map((entry) => entry.recognition.declaredReference).filter(Boolean));
  const numero = !periode && references.length === 1 ? `n° ${references[0][0]}` : "";

  const repere = periode || numero;
  if (!repere) return `${enumeration}${signature}${appoint}`;

  // Avec un émetteur nommé, le repère le suit sur la même incise : « — SOCOTEC,
  // du 8 septembre 2022 ». Sans émetteur, il ouvre la sienne.
  return signature
    ? `${enumeration}${signature}, ${repere}${appoint}`
    : `${enumeration}, ${repere}${appoint}`;
}
