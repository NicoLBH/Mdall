/**
 * L'épisode : **ce qui s'est passé, dans l'ordre où cela s'est passé**.
 *
 * ## L'unité de capitalisation
 *
 * Ce n'est ni le projet, ni le document, ni la réponse
 * (`docs/la-memoire-qui-predit.md`, § 3) :
 *
 * ```
 * épisode = (contexte, suite des sujets ouverts, constats rencontrés, issues)
 * ```
 *
 * Un projet en produit un, qui s'allonge. Et il est **daté de bout en bout** —
 * c'est ce qui rendra la mesure possible : *à la date T, avec seulement ce
 * qu'on savait alors, qu'aurait dit le moteur ?*
 *
 * ## Ce que personne d'autre n'a
 *
 * Les livres donnent les réponses, jamais la **séquence**. Après « profondeur
 * hors gel » vient « type de fondation », puis « reprise en sous-œuvre du
 * voisin » : cette suite n'est écrite nulle part ailleurs que dans la
 * chronologie d'une mémoire de projet.
 *
 * ## L'ordre du temps, jamais celui de la base
 *
 * C'est toute la valeur de l'objet. Une liste rendue dans l'ordre des
 * identifiants ressemble à une suite et n'en est pas une, et rien à l'écran ne
 * le dirait.
 *
 * **Ce qui n'a pas de date n'entre pas dans la suite.** Le placer au début ou à
 * la fin inventerait un moment ; il se compte à part, et se dit.
 *
 * ## Ce que cet épisode ne fait pas encore, et pourquoi c'est écrit ici
 *
 * **Il ne se compare pas à celui d'un autre projet.** Comparer deux suites
 * demande que les sujets portent un **nom commun** — une nomenclature —, et
 * cette réflexion n'est pas aboutie. Inventer un rapprochement sur les
 * libellés ferait tenir « Fondations bâtiment A » et « Fondation du hall » pour
 * le même sujet un jour, et pour deux un autre jour.
 *
 * L'épisode se **constitue** donc dès maintenant, daté, localement — parce que
 * c'est la partie irrattrapable — et le rapprochement attendra d'avoir un nom
 * (règle 5 : ne pas savoir n'autorise pas à prétendre qu'il n'y a rien).
 *
 * ## Il ne verse rien, et ne fait rien traverser
 *
 * C'est une **lecture** de ce que le projet porte déjà, refaite à chaque
 * affichage. La porte du fonds commun est une proposition signée, et elle
 * viendra en son temps (§ 6 et § 9 du plan).
 */

import { NATURE, classifyAssertion } from "./assertion-taxonomy.js";
import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'un constat vaut quand il ne demande plus rien. */
const LEVE = "RESOLVED";

/** Un instant comparable, ou `null`. Une date illisible n'est pas une date. */
function instant(valeur) {
  const quand = Date.parse(texte(valeur));
  return Number.isFinite(quand) ? quand : null;
}

/** Du plus ancien au plus récent — c'est une suite, pas un classement. */
function parLeTemps(gauche, droite) {
  return instant(gauche.quand) - instant(droite.quand);
}

/**
 * Les sujets ouverts, dans l'ordre où ils l'ont été.
 *
 * Le **titre** reste : c'est l'épisode du projet, et son propriétaire a le
 * droit de le lire. Ce qui traversera un jour n'est pas cet objet — c'est une
 * forme qu'on ne sait pas encore nommer.
 */
function lesOuvertures(sujets) {
  const lus = [];
  let sansDate = 0;

  for (const sujet of Array.isArray(sujets) ? sujets : []) {
    const quand = texte(sujet?.created_at);
    if (instant(quand) === null) {
      sansDate += 1;
      continue;
    }

    lus.push({
      cle: texte(sujet?.id),
      titre: texte(sujet?.title),
      quand,
      // Un sujet fermé clôt un pas de la suite ; un sujet ouvert dit où l'on en
      // est. `null` quand il n'est pas fermé, et non la date du jour.
      fermeLe: instant(sujet?.closed_at) === null ? null : texte(sujet.closed_at)
    });
  }

  return { ouvertures: lus.sort(parLeTemps), sansDate };
}

/**
 * Les constats rencontrés, et leur issue.
 *
 * **Un constat par sujet, et c'est le plus récent qui dit l'issue.** Un même
 * constat est versé plusieurs fois au fil de ses relectures : les compter tous
 * ferait lire dix problèmes là où le projet en a un.
 */
function lesConstats(assertions) {
  const parNom = new Map();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (classifyAssertion(assertion).nature !== NATURE.CONSTAT) continue;

    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    const quand = texte(assertion?.decided_at);
    if (!cle || instant(quand) === null) continue;

    const vu = parNom.get(cle);
    // Le premier versement dit **quand on l'a rencontré** ; le plus récent dit
    // **où il en est**. Les deux comptent, et ce ne sont pas les mêmes lignes.
    if (!vu) {
      parNom.set(cle, {
        cle,
        quoi: texte(assertion?.payload?.subject) || texte(assertion?.subject_key),
        // **Le domaine, parce que c'est ce qui se prédit.** Un nom de constat ne
        // se retrouve pas d'un chantier à l'autre ; son domaine, si — et c'est
        // sur lui que la ligne de base se mesure (`services/ligne-de-base.js`).
        domaine: texte(classifyAssertion(assertion).domain),
        quand,
        dernier: quand,
        leveLe: texte(assertion?.payload?.status) === LEVE ? quand : null
      });
      continue;
    }

    if (instant(quand) < instant(vu.quand)) vu.quand = quand;
    if (instant(quand) >= instant(vu.dernier)) {
      vu.dernier = quand;
      vu.leveLe = texte(assertion?.payload?.status) === LEVE ? quand : null;
    }
  }

  return [...parNom.values()]
    .map(({ dernier, ...constat }) => constat)
    .sort(parLeTemps);
}

/**
 * L'épisode d'un projet.
 *
 * @param {object} options
 * @param {object} [options.contexte] la forme du chantier (`vecteur-de-contexte.js`)
 * @param {object[]} [options.sujets] les sujets, tels que la base les rend
 * @param {object[]} [options.assertions] la mémoire du projet
 * @returns {{contexte: object|null, depuis: string, jusqua: string,
 *   ouvertures: object[], constats: object[], combien: object}}
 */
export function episodeDuProjet({ contexte = null, sujets = [], assertions = [] } = {}) {
  const { ouvertures, sansDate } = lesOuvertures(sujets);
  const constats = lesConstats(assertions);

  // Les bornes du temps : c'est par elles que la mesure rejouera l'épisode.
  const moments = [...ouvertures, ...constats]
    .map((pas) => instant(pas.quand))
    .filter((quand) => quand !== null);

  return {
    contexte,
    depuis: moments.length ? new Date(Math.min(...moments)).toISOString() : "",
    jusqua: moments.length ? new Date(Math.max(...moments)).toISOString() : "",
    ouvertures,
    constats,
    combien: {
      ouvertures: ouvertures.length,
      // Ce qui reste ouvert dit où l'on en est ; ce qui est fermé dit ce qui a
      // été tranché. Deux nombres, deux questions.
      enCours: ouvertures.filter((une) => !une.fermeLe).length,
      constats: constats.length,
      leves: constats.filter((un) => un.leveLe).length,
      // **Ce qui ne se situe pas se compte à part, et se dit.** Un sujet sans
      // date n'est pas un sujet de moins : c'est un pas de la suite qu'on a
      // perdu, et le taire ferait croire à une chronologie entière (règle 5).
      sansDate
    }
  };
}

/** L'épisode en une phrase. Vide quand il n'y a encore rien eu. */
export function phraseDeLEpisode(episode = null) {
  const combien = episode?.combien ?? {};
  const pas = Number(combien.ouvertures) || 0;
  const constats = Number(combien.constats) || 0;

  // Aucune garde en tête : sans pas ni constat, les deux tests ci-dessous sont
  // faux et la jointure rend la chaîne vide d'elle-même. Une garde qui ne peut
  // pas tomber ne se casse jamais, donc ne se vérifie pas (règle 4).
  const dits = [];
  if (pas) {
    dits.push(`${pas} ${pas > 1 ? "sujets ouverts" : "sujet ouvert"}`
      + (combien.enCours ? `, dont ${combien.enCours} ${combien.enCours > 1 ? "en cours" : "en cours"}` : ""));
  }
  if (constats) {
    dits.push(`${constats} ${constats > 1 ? "constats rencontrés" : "constat rencontré"}`
      + (combien.leves ? `, ${combien.leves} ${combien.leves > 1 ? "levés" : "levé"}` : ""));
  }

  return dits.join(" · ");
}

/**
 * Les pas de la suite qu'on ne sait pas situer.
 *
 * Vide quand il n'y en a pas — **zéro ne s'écrit pas**, ici comme partout : une
 * ligne « 0 sujet sans date » apprend à ne plus lire les lignes.
 */
export function phraseDesPasPerdus(episode = null) {
  const combien = Number(episode?.combien?.sansDate) || 0;
  if (!combien) return "";

  return combien > 1
    ? `${combien} sujets n'ont pas de date et ne tiennent pas dans la suite`
    : "1 sujet n'a pas de date et ne tient pas dans la suite";
}
