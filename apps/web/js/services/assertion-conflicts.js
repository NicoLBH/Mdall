/**
 * Quand deux informations de la mémoire ne s'accordent pas.
 *
 * Mdall ne prononce pas de conformité — ce n'est pas son métier, et ce
 * vocabulaire-là appartient au contrôle technique. Mdall **détecte que deux
 * informations se contredisent**, les met côte à côte, et laisse quelqu'un
 * décider. La machine repère ; l'humain tranche.
 *
 * La nuance n'est pas de politesse. Dire « non-conformité » revient à avoir déjà
 * jugé qui a tort, et donc à décider à la place de celui qui sait. Dire
 * « conflit » énonce ce qu'on a vu — deux valeurs pour une même chose — sans
 * rien conclure.
 *
 *   la règle du site donne  : zone de neige E
 *   le projet retient       : zone de neige A2
 *
 * Trois formes de conflit, qui ne se résolvent pas de la même façon :
 *
 * - **Une règle et une valeur retenue.** L'une des deux est à reprendre : soit
 *   ce que le projet retient, soit l'entrée qui a servi à déduire la règle.
 * - **Deux valeurs de même rang.** Rien ne les départage tout seul.
 * - **Deux règles.** Un texte ne se négocie pas contre un autre : l'une des deux
 *   vient d'une origine qu'il faut reprendre.
 *
 * Dans les trois cas la phrase décrit, elle ne commande pas.
 *
 * ## Ce module détecte, il n'affiche pas
 *
 * Il est lu par l'utilitaire « Résoudre les conflits » de l'Atelier. La Mémoire
 * ne s'en sert plus : elle sert à **voir** ce que le projet tient pour vrai, et
 * mêler à cette lecture ce qui ne s'accorde pas ferait passer un désaccord pour
 * une connaissance de plus. Exploiter la mémoire est le travail de l'Atelier.
 *
 * ## Ce qui n'est jamais deviné
 *
 * Deux affirmations ne parlent du même sujet que si **elles le nomment**, dans
 * leur `payload`. Rien n'est extrait d'un énoncé : rapprocher « Avis 166 — voile
 * béton » d'une zone de neige parce que deux mots se ressemblent produirait des
 * conflits imaginaires, et un seul suffirait à faire perdre confiance à l'écran
 * entier.
 *
 * **Limite, et elle est de taille.** Aujourd'hui seules les contraintes du site
 * et les affirmations déclarées nomment leur sujet. Ce que le projet retient
 * dans une note de calcul — le vrai gisement de conflits — n'entre pas encore :
 * il faudrait qu'une extraction le propose. Ce module est prêt pour ce jour-là ;
 * d'ici là il ne voit que ce qui est nommé, et il ne prétend pas voir plus.
 */

import { NATURE, classifyAssertion } from "./assertion-taxonomy.js";
import { MEMORY, currentAssertions } from "./project-memory.js";

/** Les trois façons dont deux informations peuvent ne pas s'accorder. */
export const CONFLIT = {
  /** Une règle du site et ce que le projet retient. */
  REGLE_ET_VALEUR: "regle-et-valeur",
  /** Deux informations de même rang. */
  DEUX_VALEURS: "deux-valeurs",
  /** Deux règles pour un même sujet. */
  DEUX_REGLES: "deux-regles"
};

const CONFLIT_LABELS = {
  [CONFLIT.REGLE_ET_VALEUR]: "Une règle et une valeur retenue",
  [CONFLIT.DEUX_VALEURS]: "Deux valeurs pour un sujet",
  [CONFLIT.DEUX_REGLES]: "Deux règles pour un sujet"
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
export function findConflicts(assertions = []) {
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

  const conflits = [];

  for (const { label, lignes } of parSujet.values()) {
    const regles = lignes.filter((ligne) => ligne.nature === NATURE.CONTRAINTE);
    const tenues = lignes.filter((ligne) => ligne.nature !== NATURE.CONTRAINTE);

    if (regles.length > 1) {
      const divergentes = regles.filter((ligne) => !memeValeur(ligne.sujet.value, regles[0].sujet.value));
      if (divergentes.length > 0) {
        conflits.push({
          type: CONFLIT.DEUX_REGLES,
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
        conflits.push({
          type: CONFLIT.REGLE_ET_VALEUR,
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
      conflits.push({
        type: CONFLIT.DEUX_VALEURS,
        subject: label,
        rule: null,
        held: tenues[0].assertion,
        others: divergentes.map((ligne) => ligne.assertion),
        ruleValue: null,
        heldValue: tenues[0].sujet.value
      });
    }
  }

  return conflits;
}

/** Le nom d'un écart, en français. */
export function conflictLabel(type) {
  return CONFLIT_LABELS[texte(type)] ?? "";
}

/**
 * Ce qu'un écart dit, et ce qu'il demande.
 *
 * La phrase et le geste vont ensemble : dire « non-conformité » puis proposer
 * de trancher entre deux valeurs annulerait ce que le mot vient d'établir.
 *
 * @returns {{label: string, sentence: string, ask: string}}
 */
export function describeConflict(conflit = {}) {
  const sujet = texte(conflit.subject) || "ce sujet";
  const regle = texte(conflit.ruleValue);
  const tenue = texte(conflit.heldValue);

  if (conflit.type === CONFLIT.REGLE_ET_VALEUR) {
    return {
      label: conflictLabel(CONFLIT.REGLE_ET_VALEUR),
      sentence: `${sujet} : la règle du site donne ${regle}, le projet retient ${tenue}.`,
      ask: "L'une des deux est à reprendre : ce que le projet retient, ou l'entrée qui a servi à déduire la règle."
    };
  }

  if (conflit.type === CONFLIT.DEUX_REGLES) {
    return {
      label: conflictLabel(CONFLIT.DEUX_REGLES),
      sentence: `${sujet} : deux règles coexistent, ${regle} et ${tenue}.`,
      ask: "Un texte ne se négocie pas contre un autre : l'une des deux vient d'une origine qu'il faut reprendre."
    };
  }

  return {
    label: conflictLabel(CONFLIT.DEUX_VALEURS),
    sentence: `${sujet} : deux valeurs coexistent, et aucune règle ne les départage.`,
    ask: "Rien ne les départage tout seul : c'est à quelqu'un de décider laquelle vaut."
  };
}

/**
 * Le résumé des conflits, par forme.
 *
 * Chaque forme se compte à part parce qu'elles ne se résolvent pas de la même
 * façon : un total unique ferait croire à une seule pile à traiter.
 */
export function summarizeConflicts(conflits = []) {
  const liste = Array.isArray(conflits) ? conflits : [];
  return {
    total: liste.length,
    ruleAgainstValue: liste.filter((entry) => entry.type === CONFLIT.REGLE_ET_VALEUR).length,
    twoValues: liste.filter((entry) => entry.type === CONFLIT.DEUX_VALEURS).length,
    twoRules: liste.filter((entry) => entry.type === CONFLIT.DEUX_REGLES).length
  };
}
