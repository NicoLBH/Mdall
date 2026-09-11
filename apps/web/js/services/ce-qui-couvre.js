/**
 * Ce qui couvre une valeur, et ce que ça pèse.
 *
 * ## Pourquoi pas un nombre
 *
 * « Une valeur validée par cinq personnes ne doit pas compter comme une valeur
 * que personne n'a regardée. » C'est vrai, et pourtant **un nombre est la
 * mauvaise abstraction** (`docs/ce-qui-couvre-une-valeur.md`) :
 *
 * 1. cinq signatures du même bureau ne font pas cinq vérifications ;
 * 2. un nombre appelle une arithmétique qui n'a aucun sens — « poids 5 > poids
 *    3, donc on garde » ;
 * 3. ce dont un ingénieur a besoin n'est pas « combien », c'est **ce que ça
 *    coûte de le casser**.
 *
 * Rien n'est donc stocké. Deux choses se **dérivent** des actes :
 *
 * **La liste** — « SOCOTEC, rapport-4.pdf, 12 mars ». Actionnable, vérifiable,
 * citable, et c'est elle qu'on lit avant de décider.
 *
 * **Un rang qualitatif**, tiré de la qualité de celui qui s'est engagé. Il sert
 * à l'affichage — une nuance dans la mémoire, une densité dans le cerveau du
 * projet. Il ne sert **jamais** à arbitrer un calcul ni à départager deux
 * valeurs.
 *
 * ## Ce que le rang sait dire, et ce qu'il ne sait pas encore
 *
 * Le vocabulaire est ordonné en entier, parce que **l'ordre est son sens** : un
 * rang isolé ne veut rien dire, c'est sa place qui parle. Mais trois niveaux
 * seulement sont atteignables aujourd'hui, et le dire vaut mieux que de faire
 * croire que les autres ne se rencontrent jamais (règle 5) :
 *
 * | rang | ce qui l'établit | atteignable |
 * | --- | --- | --- |
 * | rien | aucun acte | oui |
 * | relu en interne | quelqu'un du projet a signé | oui |
 * | visé par la maîtrise d'œuvre | le rôle du signataire | **non** — Mdall ne connaît pas les rôles |
 * | avis d'un bureau de contrôle | un organisme reconnu dans la pièce | oui |
 * | acté contractuellement | la nature contractuelle de la pièce | **non** — rien ne la porte |
 *
 * Les deux manquants demandent chacun **une** chose, nommée ci-dessus. Le jour
 * où elle existe, une ligne suffit ici.
 *
 * ## Un document non attribué ne monte pas le rang
 *
 * Un acte qui cite une pièce dont l'organisme n'a pas été reconnu reste « relu
 * en interne ». C'est délibéré : un rang qui reposerait sur une pièce qu'on n'a
 * pas su attribuer dirait « bureau de contrôle » sans pouvoir nommer lequel, et
 * c'est exactement le faux plausible que le projet refuse partout ailleurs.
 */

import { acteQuiCouvre } from "./memoire-actes.js";
import { nommeEntierement } from "./avis-liaison.js";
import { ORGANISMES } from "./emetteur-du-document.js";
import { aplati } from "./recherche-de-valeur.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qui couvre une valeur, du plus léger au plus lourd.
 *
 * Ordonné, et l'ordre **est** le sens : c'est la place d'un rang qui dit ce
 * qu'il coûte de casser ce qu'il couvre.
 */
export const RANG = {
  /** Personne ne s'est engagé. */
  RIEN: "rien",
  /** Quelqu'un du projet l'a examinée et a signé. */
  INTERNE: "interne",
  /** Le signataire engage la maîtrise d'œuvre. Pas encore distinguable. */
  MAITRISE_DOEUVRE: "maitrise-doeuvre",
  /** Un bureau de contrôle l'a examinée, et il est nommé dans la pièce. */
  CONTROLE_TECHNIQUE: "controle-technique",
  /** La pièce qui la porte engage contractuellement. Pas encore distinguable. */
  CONTRACTUEL: "contractuel"
};

/** L'ordre du vocabulaire. Rien d'autre ne dit ce qu'un rang vaut. */
export const ORDRE_DES_RANGS = [
  RANG.RIEN, RANG.INTERNE, RANG.MAITRISE_DOEUVRE, RANG.CONTROLE_TECHNIQUE, RANG.CONTRACTUEL
];

/**
 * Ce qu'un rang dit, en français.
 *
 * **Jamais « visé », « validé », « approuvé ».** Le mot du métier reste dans le
 * code et ne monte pas à l'écran (règle 12) : ce qu'on lit est ce qui a été
 * fait, et par qui, pas le nom du mécanisme.
 */
export const PHRASES_DU_RANG = {
  [RANG.RIEN]: "personne ne s'est prononcé",
  [RANG.INTERNE]: "examinée dans le projet",
  [RANG.MAITRISE_DOEUVRE]: "examinée par la maîtrise d'œuvre",
  [RANG.CONTROLE_TECHNIQUE]: "examinée par un bureau de contrôle",
  [RANG.CONTRACTUEL]: "actée contractuellement"
};

export function phraseDuRang(rang) {
  return PHRASES_DU_RANG[texte(rang)] ?? "";
}

/** Ce que ce rang coûterait à casser, dit sans chiffre. */
export function rangEstAuMoins(rang, plancher) {
  return ORDRE_DES_RANGS.indexOf(texte(rang)) >= ORDRE_DES_RANGS.indexOf(texte(plancher));
}

/** Le plus haut de plusieurs rangs. C'est l'engagement le plus coûteux qui compte. */
export function rangLePlusHaut(rangs = []) {
  let haut = RANG.RIEN;
  for (const rang of rangs) {
    if (ORDRE_DES_RANGS.indexOf(texte(rang)) > ORDRE_DES_RANGS.indexOf(haut)) haut = texte(rang);
  }
  return haut;
}

/**
 * L'organisme qu'un texte nomme, s'il en nomme un de la liste.
 *
 * Sur des mots entiers, comme partout ailleurs : `includes` nu reconnaîtrait
 * « apave » dans un mot qui ne l'est pas.
 */
export function organismeNomme(valeur = "") {
  const plat = aplati(valeur);
  if (!plat) return null;

  for (const organisme of ORGANISMES) {
    for (const nom of organisme.noms ?? []) {
      if (nommeEntierement(plat, aplati(nom))) return organisme;
    }
  }
  return null;
}

/**
 * Le rang d'un acte, seul.
 *
 * Ce qui l'établit est **qui s'est engagé**, jamais ce que la valeur vaut ni
 * combien de fois on l'a dite.
 */
export function rangDeLActe(acte = null) {
  if (!acteQuiCouvre(acte)) return RANG.RIEN;

  // La note d'un engagement commence par l'organisme qui a rendu l'avis
  // (`services/avis-engagement.js`). C'est le seul endroit où il se lit.
  return organismeNomme(acte?.note) ? RANG.CONTROLE_TECHNIQUE : RANG.INTERNE;
}

/**
 * Une ligne de la liste : ce qu'on lit, et ce qui permet d'y retourner.
 *
 * `quoi` d'abord, parce que c'est ce qu'on cherche — l'organisme et la teneur.
 * La date ensuite. Et l'identité de la pièce voyage à côté pour que l'écran
 * puisse ouvrir le PDF à sa page, sans quoi la liste serait à croire sur parole.
 */
function ligneDeLActe(acte, nommer = null) {
  const quand = texte(acte?.created_at).slice(0, 10);
  const organisme = organismeNomme(acte?.note);

  return {
    acteId: texte(acte?.id) || null,
    rang: rangDeLActe(acte),
    quoi: texte(acte?.note),
    organisme: organisme?.label ?? "",
    // Qui a signé dans Mdall. **Pas** qui a rendu l'avis : les confondre ferait
    // dire à la mémoire que celui qui a cliqué engage sa responsabilité.
    qui: nommer ? texte(nommer(texte(acte?.declared_by))) : texte(acte?.declared_by),
    quand,
    documentId: texte(acte?.source_document_id) || null,
    page: Number.isFinite(Number(acte?.source_page)) ? Number(acte.source_page) : null,
    avisId: texte(acte?.source_assertion_id) || null
  };
}

/**
 * Ce qui couvre cette valeur : le rang, et la liste.
 *
 * Sur **cette version-là** de la valeur, jamais sur le sujet : c'est ce qui fait
 * qu'un engagement tombe tout seul quand la valeur est remplacée
 * (`services/couverture.js`).
 *
 * @param {string} assertionId la version examinée
 * @param {object} options
 * @param {object[]} options.actes tous les actes du projet
 * @param {(id: string) => string} [options.nommer] comment afficher un signataire
 * @returns {{rang: string, lignes: object[], couverte: boolean}}
 */
export function ceQuiCouvre(assertionId, { actes = [], nommer = null } = {}) {
  const cible = texte(assertionId);

  const lignes = (Array.isArray(actes) ? actes : [])
    .filter((acte) => texte(acte?.assertion_id) === cible && acteQuiCouvre(acte))
    .map((acte) => ligneDeLActe(acte, nommer))
    // Le plus récent d'abord : c'est le dernier examen qui intéresse.
    .sort((gauche, droite) => droite.quand.localeCompare(gauche.quand));

  return {
    rang: rangLePlusHaut(lignes.map((ligne) => ligne.rang)),
    lignes,
    couverte: lignes.length > 0
  };
}

/**
 * Ce qui couvre chaque valeur du projet, en une passe.
 *
 * Une `Map` plutôt qu'un appel par ligne : la mémoire d'un gros projet porte
 * des milliers d'affirmations, et parcourir tous les actes pour chacune ferait
 * un carré là où une passe suffit.
 */
export function couvertureDuProjet({ actes = [], nommer = null } = {}) {
  const parAssertion = new Map();

  for (const acte of Array.isArray(actes) ? actes : []) {
    if (!acteQuiCouvre(acte)) continue;

    const cible = texte(acte?.assertion_id);
    if (!cible) continue;

    if (!parAssertion.has(cible)) parAssertion.set(cible, []);
    parAssertion.get(cible).push(ligneDeLActe(acte, nommer));
  }

  const couvertures = new Map();
  for (const [cible, lignes] of parAssertion) {
    lignes.sort((gauche, droite) => droite.quand.localeCompare(gauche.quand));
    couvertures.set(cible, {
      rang: rangLePlusHaut(lignes.map((ligne) => ligne.rang)),
      lignes,
      couverte: true
    });
  }

  return couvertures;
}

/**
 * Ce qui couvre une valeur, en une ligne.
 *
 * L'organisme d'abord quand il y en a un : c'est lui qu'on cherche. Sinon la
 * personne. Et la date, toujours — un examen sans date ne se situe pas dans
 * l'histoire du projet, et c'est l'histoire qui fait la mémoire.
 *
 * Vide quand rien ne couvre : on n'écrit pas « non examinée » sur chaque ligne
 * de la mémoire. L'absence de mention **est** l'absence d'examen, et un écran
 * qui le répéterait partout aurait l'air de réclamer quelque chose (règle 12).
 */
export function phraseDeLaCouvertureDe(couverture = null, { dater = null } = {}) {
  const premiere = couverture?.lignes?.[0] ?? null;
  if (!premiere) return "";

  const qui = premiere.organisme || premiere.qui;
  const combien = couverture.lignes.length;
  // La date se met en français **à l'écran**, pas ici : un service qui formate
  // une locale décide de l'affichage à la place de celui qui affiche.
  const quand = premiere.quand ? (dater ? dater(premiere.quand) : premiere.quand) : "";

  return [
    "Examinée",
    qui ? `par ${qui}` : "",
    quand ? `le ${quand}` : "",
    combien > 1 ? `· ${combien} examens` : ""
  ].filter(Boolean).join(" ");
}
