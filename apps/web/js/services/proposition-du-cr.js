/**
 * Ce qu'un compte rendu de chantier **propose**, une fois lu.
 *
 * ## Pourquoi ce module existe
 *
 * L'écran de lecture savait tout : quels points ouvrent un sujet, lesquels en
 * relancent un, lesquels en rouvrent un fermé, quels lots manquent, quels
 * labels seraient à créer. **Rien n'en sortait.** Le bouton « Transformer »
 * répondait par une phrase disant que ce n'était pas branché, et le procédé
 * s'arrêtait là — on relisait un document sans jamais pouvoir en tirer quoi que
 * ce soit.
 *
 * Ce fichier fait la jonction : il traduit ce que la lecture a compris en
 * **affirmations d'une proposition**, la forme que le reste de l'application
 * sait déjà signer, refuser ligne à ligne, et appliquer à la fusion.
 *
 * ## Rien n'entre directement, et c'est tout l'objet
 *
 * Un sujet ouvert engage quelqu'un à le traiter. Le déposer au versement
 * reviendrait à décider à la place de l'équipe — c'est exactement ce que
 * l'ancienne chaîne faisait, et ce pour quoi elle a été retirée
 * (`docs/fondamentaux.md`, règle 1). Ici, on **propose** ; quelqu'un signe.
 *
 * ## Ce qui sort, et ce qui ne sort pas encore
 *
 * Sortent : les points qui **ouvrent un sujet**, et le document lui-même, qui
 * entre au corpus.
 *
 * Ne sortent pas : les labels, les lots et les objectifs. Ils sont calculés et
 * affichés, mais **la fusion ne sait pas encore les appliquer** — les porter
 * quand même ferait signer des lignes dont rien n'arriverait, ce qui est pire
 * que de ne pas les porter : on croirait le rangement fait (règle 5). L'écran
 * le dit, plutôt que de le taire.
 *
 * Les points qui **relancent** ou **rouvrent** un sujet existant ne sortent pas
 * non plus. Ils ne sont pas oubliés — la confrontation les montre —, mais les
 * porter reviendrait à créer un second sujet au même titre : la fusion ouvre ce
 * qu'on lui donne, elle ne sait pas encore commenter un sujet qui est là.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il n'écrit rien, ne lit ni la base ni le store : des points entrent, des
 * affirmations sortent.
 */

import { SORT } from "./lecture-du-cr.js";
import { titreAplati } from "./sujets-du-cr.js";
import { documentItems, sujetItems } from "./proposition-review.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qui empêche de faire une proposition de ce compte rendu. */
export const REFUS = {
  /** La confrontation n'a pas eu lieu : on ne sait pas ce que le projet suit. */
  SANS_CONFRONTATION: "sans_confrontation",
  /** Elle a eu lieu, et tout est déjà suivi. */
  RIEN_A_OUVRIR: "rien_a_ouvrir",
  /** Le document n'a pas pu être rangé : sans lui, rien ne se vérifie. */
  SANS_DOCUMENT: "sans_document"
};

export const PHRASES_DU_REFUS = {
  [REFUS.SANS_CONFRONTATION]:
    "Les sujets du projet n'ont pas pu être lus : on ne sait pas lesquels de ces points sont "
    + "déjà suivis, et en proposer vingt qui le sont serait pire que de n'en proposer aucun.",
  [REFUS.RIEN_A_OUVRIR]:
    "Tous les points de ce compte rendu sont déjà suivis par un sujet du projet. "
    + "Il n'y a donc rien à ouvrir, et c'est une bonne nouvelle : le chantier est à jour.",
  [REFUS.SANS_DOCUMENT]:
    "Le compte rendu n'a pas pu être rangé dans Fichiers. Une proposition qui porterait des "
    + "points sans le document d'où ils sortent ne se vérifierait pas."
};

export function phraseDuRefus(motif) {
  return PHRASES_DU_REFUS[texte(motif)] ?? "";
}

/**
 * Ce qui empêche de proposer, ou `""`.
 *
 * **`null` n'est pas « aucun sujet ».** Une confrontation qui n'a pas pu avoir
 * lieu rend `null` ; la prendre pour une liste vide ferait de chaque point un
 * point neuf, et un compte rendu déjà traité proposerait vingt sujets de plus
 * (règle 5).
 */
export function refusDeLaProposition({ confrontes = null, documentId = "" } = {}) {
  if (confrontes === null || confrontes === undefined) return REFUS.SANS_CONFRONTATION;
  if (!texte(documentId)) return REFUS.SANS_DOCUMENT;
  if (pointsAOuvrir(confrontes).length === 0) return REFUS.RIEN_A_OUVRIR;
  return "";
}

/**
 * La clé d'un point, celle qui le suit d'une réunion à l'autre.
 *
 * **Son numéro d'abord.** « 12.02.1 » désigne le même point d'un compte rendu
 * au suivant — c'est ce que la numérotation du métier veut dire, et la seule
 * chose qui survive à une reformulation. À défaut, le titre réduit : c'est
 * imparfait, et c'est mieux que le rang dans la page, qui change dès qu'un
 * point est soldé au-dessus.
 */
export function cleDuPoint(point = {}) {
  return texte(point?.reference) || titreAplati(point?.titre) || "";
}

/**
 * Les points qui ouvrent un sujet, dans la forme qu'une proposition porte.
 *
 * **Seulement ceux-là.** Un point qui relance ou rouvre un sujet existant ne
 * doit pas en ouvrir un second au même titre : toute l'histoire d'avant
 * resterait dans le premier, invisible à qui lit le nouveau.
 *
 * Un point sans clé est écarté : sans elle, il se reproposerait à chaque
 * réunion, et l'on redemanderait douze fois d'accepter la même chose.
 */
export function pointsAOuvrir(confrontes = []) {
  const vus = new Set();

  return (Array.isArray(confrontes) ? confrontes : [])
    .filter((point) => point?.sort === SORT.NOUVEAU)
    .map((point) => ({
      key: cleDuPoint(point),
      titre: texte(point?.titre),
      description: texte(point?.description),
      lot: texte(point?.lot) || null,
      reference: texte(point?.reference) || null,
      qui: texte(point?.qui) || null,
      echeance: texte(point?.echeance) || null,
      etat: texte(point?.etat) || null,
      // **La provenance voyage avec le point.** Un sujet ouvert par une lecture
      // automatique doit pouvoir se contester : sans sa page et sa citation, il
      // ne se remonte plus au document qui l'a produit.
      provenance: {
        page: Number.isFinite(Number(point?.page)) ? Number(point.page) : null,
        excerpt: texte(point?.citation) || null
      }
    }))
    .filter((point) => {
      if (!point.key || !point.titre) return false;
      // Un compte rendu peut porter deux fois le même numéro ; la proposition,
      // non — sa contrainte d'unicité l'écraserait en silence.
      if (vus.has(point.key)) return false;
      vus.add(point.key);
      return true;
    });
}

/**
 * Les affirmations que la proposition portera.
 *
 * Le document d'abord : c'est lui qui permet de vérifier tout le reste, et
 * l'accepter est la première question qu'on se pose en relisant.
 */
export function itemsDuCompteRendu({ confrontes = [], document: doc = null } = {}) {
  return [
    ...(doc?.id ? documentItems([doc]) : []),
    ...sujetItems(pointsAOuvrir(confrontes))
  ];
}

/**
 * Le titre de la proposition.
 *
 * **Le numéro de réunion et sa date**, parce que c'est ainsi qu'on désigne un
 * compte rendu sur un chantier — pas par le nom de son fichier, qui change d'un
 * expéditeur à l'autre. À défaut, le nom du fichier : il vaut mieux qu'un titre
 * générique sous lequel douze propositions se ressembleraient.
 */
export function titreDeLaProposition({ nom = "", identite = null } = {}) {
  const numero = texte(identite?.numero);
  const quand = texte(identite?.tenueLe);

  if (numero) return `CR n° ${numero}${quand ? ` du ${quand}` : ""}`;

  const fichier = texte(nom).replace(/\.pdf$/i, "");
  return fichier ? `Compte rendu — ${fichier}` : "Compte rendu de chantier";
}

/**
 * Ce que la proposition dit d'elle-même en tête.
 *
 * **Au conditionnel, et en comptant ce qu'elle porte vraiment.** Rien n'est
 * écrit tant que personne n'a signé, et un présent ferait croire que c'est
 * fait. Ce qu'elle ne porte pas se dit aussi : un point déjà suivi qu'on ne
 * retrouve pas dans la liste ferait chercher une perte.
 */
export function introDuCompteRendu({ confrontes = [], nom = "" } = {}) {
  const aOuvrir = pointsAOuvrir(confrontes).length;
  const tous = Array.isArray(confrontes) ? confrontes.length : 0;
  const suivis = Math.max(0, tous - aOuvrir);

  const lignes = [
    `Lecture de ${texte(nom) || "un compte rendu de chantier"}.`,
    `Cette proposition ouvrirait ${aOuvrir} sujet${aOuvrir > 1 ? "s" : ""}`
      + (tous === 1 ? " sur le seul point relevé." : ` sur les ${tous} points relevés.`)
  ];

  if (suivis === 1) {
    lignes.push(
      "L'autre est déjà suivi par un sujet du projet : le compte rendu le reporte, "
      + "il ne le rouvre pas."
    );
  } else if (suivis > 1) {
    lignes.push(
      `Les ${suivis} autres sont déjà suivis par des sujets du projet : le compte rendu les `
      + "reporte, il ne les rouvre pas."
    );
  }

  return lignes.join(" ");
}
