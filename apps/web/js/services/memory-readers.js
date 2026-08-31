/**
 * Trois façons de lire la mémoire, et **aucune ne stocke quoi que ce soit**.
 *
 * « Un utilitaire qui rassemble toutes les hypothèses depuis le début » n'est
 * pas un utilitaire : c'est une lecture de la mémoire. S'il tenait ses propres
 * données, le projet aurait deux mémoires, et personne ne saurait laquelle fait
 * foi le jour où elles divergent — ce qui arrive toujours.
 *
 * Ce module ne contient donc que des **filtres et des regroupements**. Il ne
 * peut pas inventer une ligne : tout ce qu'il rend vient de la liste qu'on lui
 * donne, et une affirmation qu'on n'y trouve pas n'existe nulle part.
 *
 * Les trois lectures répondent à trois questions qu'on ne se pose pas au même
 * moment :
 *
 *  - **Les hypothèses** — « sur quoi bâtit-on ? ». C'est le document qu'on
 *    imprime avant une réunion : une ligne par sujet, à sa valeur en vigueur.
 *  - **Les contraintes** — « que doit-on respecter ? ». Elles ne se lèvent pas,
 *    elles se vérifient.
 *  - **Les constats en cours** — « qu'est-ce qui reste ouvert ? ». Le suivi des
 *    avis du bureau de contrôle, généralisé à toutes les sources.
 *
 * Le **regroupement par domaine** est ce qui rend ces listes lisibles quand
 * elles comptent soixante-dix lignes. Ce qui n'est pas classé vient en dernier,
 * et se compte : une lecture « tout l'incendie » qui cacherait quarante lignes
 * non classées aurait l'air complète en étant fausse.
 */

import { DOMAINS, NATURE, classifyAssertion, domainLabel } from "./assertion-taxonomy.js";
import { MEMORY, currentAssertions } from "./project-memory.js";

/** Les trois lectures, et la liste entière. */
export const READER = {
  ALL: "all",
  HYPOTHESES: "hypotheses",
  CONSTRAINTS: "constraints",
  FINDINGS: "findings"
};

const READER_LABELS = {
  [READER.ALL]: "Tout",
  [READER.HYPOTHESES]: "Hypothèses",
  [READER.CONSTRAINTS]: "Contraintes",
  [READER.FINDINGS]: "Constats en cours"
};

/**
 * Ce que chaque lecture promet, en une phrase.
 *
 * Elle est affichée sous le titre : une liste filtrée qui ne dit pas ce qu'elle
 * filtre se prend pour la liste entière.
 */
const READER_LEADS = {
  [READER.ALL]: "Toutes les affirmations du projet, dans l'ordre où elles ont été tranchées.",
  [READER.HYPOTHESES]:
    "Ce sur quoi le projet bâtit. Une ligne par sujet, à sa valeur en vigueur : changer cette valeur rend suspect ce qui en découle.",
  [READER.CONSTRAINTS]:
    "Ce que le projet doit respecter — un article du PLU, une règle d'accessibilité, une clause de notice. Une contrainte ne se lève pas : elle se vérifie.",
  [READER.FINDINGS]:
    "Ce qui reste ouvert : les avis et remarques que rien n'est encore venu lever."
};

export function readerLabel(reader) {
  return READER_LABELS[String(reader ?? "")] ?? READER_LABELS[READER.ALL];
}

export function readerLead(reader) {
  return READER_LEADS[String(reader ?? "")] ?? READER_LEADS[READER.ALL];
}

function texte(value) {
  return String(value ?? "").trim();
}

/**
 * Ce constat est-il encore en cours ?
 *
 * Un avis levé ne demande plus rien ; un avis écarté par le projet non plus.
 * **`REPORTED` reste en cours** : le rapport a constaté cette ligne, personne
 * n'a dit qu'elle était levée — et la compter comme close ferait disparaître
 * les deux tiers d'un rapport de contrôle sous prétexte qu'il porte des F.
 */
export function isOpenFinding(assertion = {}) {
  if (classifyAssertion(assertion).nature !== NATURE.CONSTAT) return false;
  if (assertion.status === MEMORY.REJECTED) return false;

  return texte(assertion.payload?.status) !== "RESOLVED";
}

/**
 * Les hypothèses du projet, une par sujet.
 *
 * Une hypothèse remplacée n'apparaît pas : c'est tout l'objet de cette
 * lecture — montrer **ce qui vaut**, pas l'histoire des valeurs successives.
 * L'histoire se lit dans le détail de chacune.
 */
export function currentHypotheses(assertions = []) {
  return currentAssertions(Array.isArray(assertions) ? assertions : []).filter(
    (assertion) => classifyAssertion(assertion).nature === NATURE.HYPOTHESE
  );
}

/**
 * Ce qu'une lecture montre.
 *
 * Toujours un sous-ensemble de ce qu'on lui donne — jamais une ligne de plus.
 */
export function readerRows(assertions = [], reader = READER.ALL) {
  const lignes = Array.isArray(assertions) ? assertions : [];

  if (reader === READER.HYPOTHESES) return currentHypotheses(lignes);

  if (reader === READER.CONSTRAINTS) {
    return currentAssertions(lignes).filter(
      (assertion) => classifyAssertion(assertion).nature === NATURE.CONTRAINTE
    );
  }

  if (reader === READER.FINDINGS) return currentAssertions(lignes).filter(isOpenFinding);

  return lignes;
}

/**
 * Les mêmes lignes, rangées par domaine.
 *
 * L'ordre des domaines est celui du métier — du gros œuvre aux abords —, et non
 * celui du nombre de lignes : un classement qui bouge à chaque dépôt ne se
 * mémorise pas. **Ce qui n'est pas classé vient en dernier**, et porte son
 * propre groupe : caché, il ferait passer une lecture partielle pour une
 * lecture complète.
 *
 * Un domaine sans ligne ne s'affiche pas ici — c'est une liste, pas un
 * inventaire des domaines possibles ; leurs compteurs à zéro se lisent déjà
 * dans le bandeau de l'écran.
 *
 * @returns {{domain: string|null, label: string, rows: object[]}[]}
 */
export function groupByDomain(rows = []) {
  const lignes = Array.isArray(rows) ? rows : [];

  const groupes = new Map(DOMAINS.map((domaine) => [domaine, []]));
  const nonClasse = [];

  for (const ligne of lignes) {
    const { domain } = classifyAssertion(ligne);
    if (domain && groupes.has(domain)) groupes.get(domain).push(ligne);
    else nonClasse.push(ligne);
  }

  const sortie = [...groupes.entries()]
    .filter(([, contenu]) => contenu.length > 0)
    .map(([domain, contenu]) => ({ domain, label: domainLabel(domain), rows: contenu }));

  if (nonClasse.length > 0) sortie.push({ domain: null, label: "Sans domaine", rows: nonClasse });

  return sortie;
}

/**
 * Ce qu'une lecture contient, en chiffres.
 *
 * `unclassified` est nommé à part parce qu'il dit ce que le regroupement ne
 * peut pas ranger — et c'est la seule façon qu'une lecture par domaine ne se
 * prenne pas pour la lecture entière.
 */
export function summarizeReader(rows = []) {
  const groupes = groupByDomain(rows);
  const sansDomaine = groupes.find((groupe) => groupe.domain === null)?.rows.length ?? 0;

  return {
    total: (Array.isArray(rows) ? rows : []).length,
    domains: groupes.filter((groupe) => groupe.domain !== null).length,
    unclassified: sansDomaine
  };
}

/**
 * Ce qu'une lecture vide veut dire — et ce n'est pas la même chose selon la
 * lecture.
 *
 * « Aucune contrainte » ne dit pas que le projet n'en a pas : il n'en a encore
 * versé aucune. Une phrase qui laisserait croire le contraire serait un faux
 * plus grave qu'un écran vide.
 */
export function describeEmptyReader(reader) {
  if (reader === READER.HYPOTHESES) {
    return "Aucune hypothèse n'a encore été posée. Elles se déclarent depuis le bandeau, ou viendront de l'extraction des documents.";
  }
  if (reader === READER.CONSTRAINTS) {
    return "Aucune contrainte n'a encore été versée. Ce n'est pas que le projet n'en a pas : rien ne les extrait encore des documents qui les portent — un PLU, une notice, un CCTP.";
  }
  if (reader === READER.FINDINGS) {
    return "Aucun constat n'est ouvert. Tout ce que le projet a relevé a été levé ou écarté.";
  }
  return "La mémoire de ce projet est vide.";
}
