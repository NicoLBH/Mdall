/**
 * Les façons de lire la mémoire, et **aucune ne stocke quoi que ce soit**.
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
 * Les lectures répondent à des questions qu'on ne se pose pas au même moment :
 *
 *  - **Les contraintes** — « que doit-on respecter ? ». Elles ne se lèvent pas,
 *    elles se vérifient.
 *  - **Les décisions** — « qu'a-t-on tranché, et qu'a-t-on écarté ? ».
 *  - **Les raisonnements** — « par où est-on passé pour en arriver là ? ».
 *  - **Les constats en cours** — « qu'est-ce qui reste ouvert ? ». Le suivi des
 *    avis du bureau de contrôle, généralisé à toutes les sources.
 *  - **Les hypothèses** — « sur quoi bâtit-on ? ». C'est le document qu'on
 *    imprime avant une réunion : une ligne par sujet, à sa valeur en vigueur.
 *  - **Les données de base** — « qu'est-ce que le projet **est** ? ».
 *
 * ## Deux lectures vides, et qui disent pourquoi
 *
 * Décisions et raisonnements ne rendent rien : **rien ne les verse encore**.
 * Elles sont là quand même, et c'est délibéré — une lacune nommée vaut mieux
 * qu'une absence silencieuse (règle 5). Un projet dont la barre latérale ne
 * mentionne pas les décisions laisse croire que Mdall n'en a que faire ; le même
 * projet, avec une entrée qui dit « aucune, et voici pourquoi », dit la vérité
 * du moment et rend l'étape suivante évidente.
 *
 * Le **regroupement par domaine** est ce qui rend ces listes lisibles quand
 * elles comptent soixante-dix lignes. Ce qui n'est pas classé vient en dernier,
 * et se compte : une lecture « tout l'incendie » qui cacherait quarante lignes
 * non classées aurait l'air complète en étant fausse.
 */

import { DOMAINS, NATURE, classifyAssertion, domainLabel } from "./assertion-taxonomy.js";
import { MEMORY, currentAssertions } from "./project-memory.js";

/**
 * Les lectures de la mémoire, et la liste entière.
 *
 * `BASE_DATA` vient en dernier : les autres disent ce que le projet **sait**,
 * celle-ci dit ce qu'il **est**. C'est d'elle que partent les déductions, et
 * c'est là qu'un humain vient vérifier ce sur quoi tout le reste a été calculé.
 */
export const READER = {
  ALL: "all",
  HYPOTHESES: "hypotheses",
  CONSTRAINTS: "constraints",
  DECISIONS: "decisions",
  REASONINGS: "reasonings",
  FINDINGS: "findings",
  BASE_DATA: "base-data"
};

/**
 * L'ordre du rail, et il n'y en a qu'un.
 *
 * Il vit ici parce que c'est ici que les lectures sont définies : l'écrire dans
 * l'écran de la Mémoire ferait deux endroits à tenir, et le jour où une lecture
 * s'ajoute, l'un des deux l'oublierait (règle 4).
 *
 * L'ordre suit celui des natures — `NATURES` dans `assertion-taxonomy.js` —,
 * précédé de la liste entière. Ce qui s'impose, ce qu'on a tranché, le chemin
 * qui y mène, ce qu'on a vu, ce qu'on suppose, ce que le projet est.
 */
export const READERS = [
  READER.ALL,
  READER.CONSTRAINTS,
  READER.DECISIONS,
  READER.REASONINGS,
  READER.FINDINGS,
  READER.HYPOTHESES,
  READER.BASE_DATA
];

const READER_LABELS = {
  [READER.ALL]: "Tout",
  [READER.HYPOTHESES]: "Hypothèses",
  [READER.CONSTRAINTS]: "Contraintes",
  [READER.DECISIONS]: "Décisions",
  [READER.REASONINGS]: "Raisonnements",
  [READER.FINDINGS]: "Constats",
  [READER.BASE_DATA]: "Données de base"
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
  [READER.DECISIONS]:
    "Ce que des humains ont tranché, et ce qu'ils ont écarté en le faisant. Une décision ne porte pas la valeur : la valeur la cite.",
  [READER.REASONINGS]:
    "Par où le projet est passé : les règles enchaînées, et les endroits où quelqu'un a dû choisir. C'est là qu'on voit ce qu'une donnée nouvelle remet en cause.",
  [READER.FINDINGS]:
    "Ce qui reste ouvert : les avis et remarques que rien n'est encore venu lever.",
  [READER.BASE_DATA]:
    "Ce que le projet est, et d'où part tout ce qu'on en déduit. En changer une rend suspect ce qui a été calculé dessus — c'est ici qu'on vient vérifier avant de bâtir."
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

  if (reader === READER.DECISIONS || reader === READER.REASONINGS) {
    // Le filtre est écrit comme les autres, et il s'est rempli tout seul : la
    // fermeture d'un sujet verse désormais une décision **et** un raisonnement,
    // et ces deux lectures les ont reçus sans qu'on touche à une ligne d'ici.
    // Les décisions attendent encore leur premier versement hors fermeture.
    const voulue = reader === READER.DECISIONS ? NATURE.DECISION : NATURE.RAISONNEMENT;
    return currentAssertions(lignes).filter(
      (assertion) => classifyAssertion(assertion).nature === voulue
    );
  }

  if (reader === READER.FINDINGS) return currentAssertions(lignes).filter(isOpenFinding);

  if (reader === READER.BASE_DATA) {
    return currentAssertions(lignes).filter(
      (assertion) => classifyAssertion(assertion).nature === NATURE.DONNEE_BASE
    );
  }

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
  // Les deux phrases qui comptent : elles ne disent pas « il n'y en a pas »,
  // elles disent **pourquoi** il n'y en a pas. La différence est tout le sujet —
  // un projet prend des décisions tous les jours, et c'est Mdall qui ne savait
  // pas encore les garder.
  if (reader === READER.DECISIONS) {
    return "Le projet n'a encore enregistré aucune décision. Ce n'est pas qu'il n'en a pas pris — "
      + "c'est que Mdall ne savait pas encore les garder. Elles se cachent dans les comptes rendus de "
      + "réunion, dans les fils de sujets, dans les courriels : le copilote saura les y repérer et les "
      + "proposer, et un humain les signera.";
  }
  if (reader === READER.REASONINGS) {
    return "Le projet n'a encore enregistré aucun raisonnement. Les enchaînements de règles existent — "
      + "le cerveau du projet les dessine —, mais un raisonnement est plus que cela : c'est une chaîne "
      + "qui traverse des décisions humaines, et rien ne le devinera à partir du graphe. Il se verse, "
      + "comme le reste.";
  }
  if (reader === READER.FINDINGS) {
    return "Aucun constat n'est ouvert. Tout ce que le projet a relevé a été levé ou écarté.";
  }
  if (reader === READER.BASE_DATA) {
    return "Aucune donnée de base n'est posée. Tout ce qui se déduit du site — zones climatiques, sismicité, argiles — part de là : sans elles, rien ne se déduit.";
  }
  return "La mémoire de ce projet est vide.";
}
