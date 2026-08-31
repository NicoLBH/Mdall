/**
 * Quand deux affirmations parlent du même sujet et ne disent pas la même chose.
 *
 * Le système savait déjà repérer une contradiction et demander à l'humain de
 * trancher : « je garde ce qui était retenu » ou « j'assume le changement ».
 * Sur deux constats, c'est le bon geste. Sur une contrainte, c'est faux.
 *
 *   la règle dit  : zone de neige A2  — déduite de la commune, non négociable
 *   la note dit   : zone de neige A1  — observé dans un document, daté
 *
 * On ne garde pas A1. Il n'y a pas de différend : il y a une **non-conformité**,
 * et c'est le métier même du bureau de contrôle. Le verbe n'est pas « trancher »,
 * c'est « corriger » — et ce qui est à corriger n'est pas la règle.
 *
 * ## Trois écarts, trois gestes
 *
 * - **Non-conformité** — une contrainte contre ce que le projet retient. Le
 *   projet se corrige, ou l'entrée de la règle est fausse et c'est elle qu'on
 *   reprend. Jamais un arbitrage entre deux opinions.
 * - **Contradiction** — deux affirmations de même rang qui divergent. Là,
 *   l'humain tranche : c'est le geste que le système connaissait déjà.
 * - **Deux règles** — deux contraintes pour un même sujet. L'une est fausse,
 *   et il n'y a rien à arbitrer : un texte ne se négocie pas contre un autre.
 *
 * ## Ce qui n'est jamais deviné
 *
 * Deux affirmations ne parlent du même sujet que si **elles le nomment**, dans
 * leur `payload`. Rien n'est extrait d'un énoncé : rapprocher « Avis 166 — voile
 * béton » d'une zone de neige parce que deux mots se ressemblent produirait des
 * non-conformités imaginaires, et une seule suffirait à faire perdre confiance
 * à l'écran entier.
 *
 * **Limite, et elle est de taille.** Aujourd'hui seules les contraintes du site
 * et les hypothèses déclarées nomment leur sujet. Ce que le projet retient dans
 * une note de calcul — le vrai gisement de non-conformités — n'entre pas encore :
 * il faudrait qu'une extraction le propose. Ce module est prêt pour ce jour-là ;
 * d'ici là il ne voit que ce qui est nommé, et il ne prétend pas voir plus.
 */

import { NATURE, classifyAssertion } from "./assertion-taxonomy.js";
import { MEMORY, currentAssertions } from "./project-memory.js";

/** Les trois façons dont deux affirmations peuvent ne pas s'accorder. */
export const ECART = {
  /** Une contrainte contre ce que le projet retient. On corrige. */
  NON_CONFORMITE: "non-conformite",
  /** Deux affirmations de même rang. L'humain tranche. */
  CONTRADICTION: "contradiction",
  /** Deux contraintes pour un même sujet. L'une est fausse. */
  REGLE_DOUBLE: "regle-double"
};

const ECART_LABELS = {
  [ECART.NON_CONFORMITE]: "Non-conformité",
  [ECART.CONTRADICTION]: "Contradiction",
  [ECART.REGLE_DOUBLE]: "Deux règles pour un sujet"
};

function texte(value) {
  return String(value ?? "").trim();
}

/**
 * Deux valeurs qui désignent la même chose.
 *
 * Casse, accents et espaces seulement. « A2 » et « a2 » sont la même zone ;
 * « 0,2 MPa » et « 0.2 MPa » restent deux écritures différentes, et c'est
 * volontaire : décider qu'une virgule vaut un point sur une valeur numérique
 * reviendrait à interpréter, et une interprétation muette efface un écart réel.
 */
function memeValeur(gauche, droite) {
  return normalise(gauche) === normalise(droite);
}

function normalise(value) {
  return texte(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Le sujet qu'une affirmation nomme, ou `null`.
 *
 * Jamais extrait d'un énoncé. Une affirmation qui ne nomme pas son sujet n'est
 * comparée à rien — c'est le prix à payer pour n'inventer aucun rapprochement.
 */
export function namedSubjectOf(assertion = {}) {
  const sujet = texte(assertion?.payload?.subject);
  const valeur = texte(assertion?.payload?.value);
  if (!sujet || !valeur) return null;
  return { key: normalise(sujet), label: sujet, value: valeur };
}

/**
 * Les écarts que la mémoire porte aujourd'hui.
 *
 * Seules les affirmations en vigueur comptent : une valeur remplacée a déjà
 * cessé de valoir, et la faire figurer dans un écart ferait signaler un
 * désaccord entre le présent et un passé qu'on a nous-mêmes périmé.
 *
 * @returns {{type: string, subject: string, rule: object|null, held: object|null,
 *   others: object[], ruleValue: string|null, heldValue: string|null}[]}
 */
export function findNonConformities(assertions = []) {
  const courantes = currentAssertions(Array.isArray(assertions) ? assertions : []).filter(
    (entry) => entry?.status !== MEMORY.REJECTED
  );

  const parSujet = new Map();
  for (const assertion of courantes) {
    const sujet = namedSubjectOf(assertion);
    if (!sujet) continue;
    if (!parSujet.has(sujet.key)) parSujet.set(sujet.key, { label: sujet.label, lignes: [] });
    parSujet.get(sujet.key).lignes.push({ assertion, sujet, nature: classifyAssertion(assertion).nature });
  }

  const ecarts = [];

  for (const { label, lignes } of parSujet.values()) {
    const regles = lignes.filter((ligne) => ligne.nature === NATURE.CONTRAINTE);
    const tenues = lignes.filter((ligne) => ligne.nature !== NATURE.CONTRAINTE);

    if (regles.length > 1) {
      const divergentes = regles.filter((ligne) => !memeValeur(ligne.sujet.value, regles[0].sujet.value));
      if (divergentes.length > 0) {
        ecarts.push({
          type: ECART.REGLE_DOUBLE,
          subject: label,
          rule: regles[0].assertion,
          held: divergentes[0].assertion,
          others: divergentes.slice(1).map((ligne) => ligne.assertion),
          ruleValue: regles[0].sujet.value,
          heldValue: divergentes[0].sujet.value
        });
      }
      continue;
    }

    if (regles.length === 1) {
      for (const tenue of tenues) {
        if (memeValeur(tenue.sujet.value, regles[0].sujet.value)) continue;
        ecarts.push({
          type: ECART.NON_CONFORMITE,
          subject: label,
          rule: regles[0].assertion,
          held: tenue.assertion,
          others: [],
          ruleValue: regles[0].sujet.value,
          heldValue: tenue.sujet.value
        });
      }
      continue;
    }

    // Sans règle, deux valeurs qui divergent restent un différend : personne
    // n'est en faute tant qu'aucun texte ne tranche.
    const divergentes = tenues.filter((ligne) => !memeValeur(ligne.sujet.value, tenues[0]?.sujet.value));
    if (divergentes.length > 0) {
      ecarts.push({
        type: ECART.CONTRADICTION,
        subject: label,
        rule: null,
        held: tenues[0].assertion,
        others: divergentes.map((ligne) => ligne.assertion),
        ruleValue: null,
        heldValue: tenues[0].sujet.value
      });
    }
  }

  return ecarts;
}

/** Le nom d'un écart, en français. */
export function ecartLabel(type) {
  return ECART_LABELS[texte(type)] ?? "";
}

/**
 * Ce qu'un écart dit, et ce qu'il demande.
 *
 * La phrase et le geste vont ensemble : dire « non-conformité » puis proposer
 * de trancher entre deux valeurs annulerait ce que le mot vient d'établir.
 *
 * @returns {{label: string, sentence: string, ask: string}}
 */
export function describeEcart(ecart = {}) {
  const sujet = texte(ecart.subject) || "ce sujet";
  const regle = texte(ecart.ruleValue);
  const tenue = texte(ecart.heldValue);

  if (ecart.type === ECART.NON_CONFORMITE) {
    return {
      label: ecartLabel(ECART.NON_CONFORMITE),
      sentence: `${sujet} : la règle du site donne ${regle}, le projet retient ${tenue}.`,
      ask: "Ce n'est pas un différend : soit le projet se corrige, soit l'adresse qui a servi à déduire la règle est fausse."
    };
  }

  if (ecart.type === ECART.REGLE_DOUBLE) {
    return {
      label: ecartLabel(ECART.REGLE_DOUBLE),
      sentence: `${sujet} : deux règles coexistent, ${regle} et ${tenue}.`,
      ask: "Un texte ne se négocie pas contre un autre : l'une des deux est fausse, et il faut reprendre son origine."
    };
  }

  return {
    label: ecartLabel(ECART.CONTRADICTION),
    sentence: `${sujet} : deux valeurs coexistent, et aucune règle ne tranche.`,
    ask: "Personne n'est en faute tant qu'aucun texte ne tranche : c'est à quelqu'un de décider laquelle vaut."
  };
}

/**
 * Le résumé des écarts, pour un bandeau.
 *
 * Les non-conformités se comptent à part parce qu'elles ne se traitent pas
 * comme le reste : les noyer dans un total ferait perdre la seule information
 * qui commande une action immédiate.
 */
export function summarizeEcarts(ecarts = []) {
  const liste = Array.isArray(ecarts) ? ecarts : [];
  return {
    total: liste.length,
    nonConformities: liste.filter((ecart) => ecart.type === ECART.NON_CONFORMITE).length,
    contradictions: liste.filter((ecart) => ecart.type === ECART.CONTRADICTION).length,
    doubleRules: liste.filter((ecart) => ecart.type === ECART.REGLE_DOUBLE).length
  };
}
