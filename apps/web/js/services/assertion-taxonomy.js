/**
 * Le vocabulaire de la mémoire : ce qu'une affirmation **est**, et de quoi elle parle.
 *
 * La mémoire ne connaissait qu'une chose : d'où vient une affirmation. Elle
 * ignorait comment celle-ci **se comporte**, et c'est ce qui empêchait d'y
 * ranger un CCTP ou une étude de sol : un article du PLU et une réserve de
 * chantier ne se lèvent pas, ne se datent pas et ne se remplacent pas de la
 * même façon.
 *
 * Deux axes, et ils ne servent pas à la même chose.
 *
 * ## La nature : ce qui trancherait l'affirmation
 *
 * La question n'est pas « de quoi parle-t-elle ? » — c'est le domaine. C'est
 * **« qu'est-ce qui la trancherait ? »**, et chaque nature a sa réponse, une
 * seule. Ce discriminant est écrit ici en données, dans `SETTLED_BY` : une
 * définition qu'on ne peut pas interroger finit par ne plus être appliquée.
 *
 * - **Contrainte** — tranchée par un tiers. Un règlement, une norme, un arrêté,
 *   le marché. On ne la choisit pas et on ne la négocie pas. Sa valeur est
 *   *déterminée*, jamais retenue, et le fait qu'elle se déduise de la commune
 *   n'en fait pas une supposition : **la déduction fait partie de sa
 *   définition**. La zone de neige d'une ville n'est pas une estimation de
 *   cette ville, c'est une propriété de cette ville.
 * - **Hypothèse** — tranchée par une mesure qui n'a pas encore eu lieu.
 *   Vérifiable, plausible, tenue pour vraie parce que le travail ne peut pas
 *   attendre le résultat du sondage.
 * - **Constat** — tranché par l'observation, déjà faite. Daté, situé, signé.
 * - **Intendance** — rien ne la tranche : elle n'affirme rien sur l'ouvrage.
 *
 * ## Le domaine : de quoi elle parle
 *
 * Il vient du métier, pas de nous : structure, incendie, acoustique, thermique,
 * accessibilité, sol, urbanisme, environnement. Ces huit-là sont stables depuis
 * trente ans et communs à tous les intervenants d'une opération — c'est ce qui
 * en fait une hiérarchie utilisable plutôt qu'un rangement personnel.
 *
 * **Une règle gouverne tout ce fichier, et elle est plus importante que le
 * reste : un domaine deviné est pire qu'un domaine absent.** Rien ici ne
 * classe par mots-clés. Si le rattrapage rangeait les affirmations existantes
 * au jugé, une lecture « tout l'incendie » aurait l'air complète en étant
 * fausse, et personne ne pourrait s'en apercevoir — c'est précisément le genre
 * d'erreur qui se découvre en réunion de chantier. Ce qu'on ne sait pas se dit
 * « non classé », et se compte.
 *
 * La nature, elle, se **déduit** sans rien inventer : un avis est un constat,
 * un document et un rattachement relèvent de l'intendance. Ce n'est pas une
 * supposition, c'est une lecture de la provenance.
 */

import { ITEM_TYPE } from "./proposition-review.js";

/**
 * Ce qui tranche une affirmation. C'est le discriminant des natures.
 *
 * Écrit en données parce que c'est la définition elle-même, et qu'une
 * définition qui ne vit que dans un commentaire se contredit tôt ou tard —
 * ce fichier en portait la preuve : il donnait « zone de neige » comme exemple
 * d'hypothèse alors qu'aucune mesure ne tranche une zone de neige.
 */
export const SETTLED_BY = {
  /** Un règlement, une norme, un arrêté, le marché. Personne ici n'y peut rien. */
  TIERS: "tiers",
  /** Un essai, un sondage, un relevé — qui n'a pas encore eu lieu. */
  MESURE: "mesure",
  /** Une observation, déjà faite, par quelqu'un, à une date. */
  OBSERVATION: "observation",
  /**
   * Le projet lui-même : son programme, sa situation, ce qu'il a décidé d'être.
   *
   * Personne d'autre ne peut le trancher. Le maître d'ouvrage dit où est
   * l'opération et ce qu'on y fait ; ce n'est ni une mesure, ni une observation,
   * ni une règle imposée du dehors — c'est la définition que le projet donne de
   * lui-même, et c'est de là que part tout le reste.
   */
  PROJET: "projet"
};

/**
 * Comment une affirmation se comporte dans le temps.
 *
 * Chaque nature est définie par ce qui la trancherait, et **le sujet n'y fait
 * rien** : « zone de neige » et « portance du sol » se ressemblent, l'une est
 * fixée par un texte et l'autre par un essai — elles n'ont donc rien en commun.
 */
export const NATURE = {
  /**
   * Ce qui a été observé, à une date, par quelqu'un, sur le réel — le chantier,
   * un ouvrage, ou un document.
   *
   * Tranché par l'**observation**, et elle a déjà eu lieu. Un constat ne
   * devient jamais faux : il reste vrai à sa date. Il se lève quand le désordre
   * est traité, il s'aggrave, il reste — il ne se révise pas.
   *
   * → un avis de bureau de contrôle, une réserve, un désordre, un relevé.
   */
  CONSTAT: "constat",
  /**
   * Une proposition qu'une **mesure** trancherait, et qui n'a pas encore été
   * faite. Plausible, retenue faute de mieux, parce que le travail ne peut pas
   * attendre le résultat.
   *
   * Le test tient en une question : *quelle mesure la trancherait ?* Si on ne
   * peut nommer ni l'essai, ni le sondage, ni le relevé, ce n'est pas une
   * hypothèse. Ce seul critère écarte les zones climatiques : aucune mesure ne
   * tranche une zone de neige, c'est un texte qui la fixe.
   *
   * Elle est révisable **sans que personne soit en faute** — c'est ce qui la
   * sépare définitivement de la contrainte. Et **une seule valeur à la fois** :
   * ce qui en découle devient suspect quand elle change.
   *
   * Une hypothèse vérifiée ne disparaît pas : la mesure la remplace par un
   * constat. Elles sont faites pour être consommées.
   *
   * → portance du sol avant le G2, nature du mur mitoyen, niveau de la nappe,
   *   capacité du plancher existant.
   */
  HYPOTHESE: "hypothese",
  /**
   * Ce qui s'impose au projet, tranché par un **tiers**.
   *
   * On ne la choisit pas, on ne la négocie pas : on la respecte ou on est en
   * faute. Le test : *si je ne suis pas d'accord, ai-je un recours ?* Non →
   * contrainte.
   *
   * Elle ne se conteste pas et ne se lève pas. Elle se **corrige** si la valeur
   * retenue est fausse — et se tromper sur une contrainte est une erreur, pas
   * une révision : une hypothèse fausse a une histoire (on croyait, puis on a
   * mesuré), une contrainte fausse n'en a pas, elle n'aurait jamais dû être
   * écrite ainsi. Les deux ressemblent à un changement de valeur ; elles ne
   * veulent pas dire la même chose.
   *
   * → zones neige, vent et sismique, classement incendie, article du PLU, règle
   *   d'accessibilité, clause de marché.
   */
  CONTRAINTE: "contrainte",
  /**
   * Ce que le projet est, et qui sert d'entrée à tout ce qu'on en déduit.
   *
   * Tranchée par **le projet lui-même**. L'adresse, la commune, l'altitude, la
   * catégorie d'un ouvrage, l'usage d'un niveau, le classement de la voirie
   * riveraine : personne d'extérieur ne les décide, et aucune mesure ne les
   * établit — le projet les pose, et quelqu'un doit pouvoir les relire.
   *
   * **Elles se versionnent, et leur changement se propage.** C'est là qu'est la
   * valeur de tout ceci : reclasser une voirie riveraine en phase exécution
   * change l'isolement acoustique de façade, donc le calcul acoustique, donc les
   * menuiseries, donc les entrées d'air, donc l'isolant intérieur. Personne ne
   * tient cette chaîne de tête ; c'est le rôle des dépendances.
   *
   * Ce n'est pas une contrainte : une contrainte s'impose du dehors et le projet
   * la subit. Une donnée de base, le projet la choisit ou la constate de
   * lui-même — et peut la corriger sans que personne n'ait rien imposé.
   */
  DONNEE_BASE: "donnee-de-base",
  /**
   * Un document au corpus, une affaire rattachée : ce que le projet a rangé.
   *
   * **Ce n'est pas une connaissance, et probablement pas une nature.** Une
   * intendance n'affirme rien sur l'ouvrage : c'est la matière première dont
   * les trois autres s'extraient — si on applique tout ce que contiennent les
   * documents du projet, on obtient l'ouvrage construit.
   *
   * Le mot est mauvais et on le sait. Il est gardé tel quel le temps de trancher
   * une question antérieure : ces lignes ont-elles leur place dans la mémoire du
   * projet, ou dans le corpus ? Renommer avant de répondre reviendrait à graver
   * un choix qu'on n'a pas fait. Rien ne se construit sur cette nature d'ici là.
   */
  INTENDANCE: "intendance"
};

/**
 * Ce qui tranche chaque nature. La table de `SETTLED_BY`, par nature.
 *
 * L'intendance n'y figure pas : rien ne la tranche, parce qu'elle n'affirme
 * rien. Une absence ici se lit « cette nature n'est pas une connaissance ».
 */
const NATURE_SETTLED_BY = {
  [NATURE.CONSTAT]: SETTLED_BY.OBSERVATION,
  [NATURE.HYPOTHESE]: SETTLED_BY.MESURE,
  [NATURE.CONTRAINTE]: SETTLED_BY.TIERS,
  [NATURE.DONNEE_BASE]: SETTLED_BY.PROJET,
  [NATURE.INTENDANCE]: null
};

/** De quoi une affirmation parle. Huit domaines, et ils viennent du métier. */
export const DOMAIN = {
  STRUCTURE: "structure",
  INCENDIE: "incendie",
  ACOUSTIQUE: "acoustique",
  THERMIQUE: "thermique",
  ACCESSIBILITE: "accessibilite",
  SOL: "sol",
  URBANISME: "urbanisme",
  ENVIRONNEMENT: "environnement"
};

const NATURE_LABELS = {
  [NATURE.CONSTAT]: "Constat",
  [NATURE.HYPOTHESE]: "Hypothèse",
  [NATURE.CONTRAINTE]: "Contrainte",
  [NATURE.DONNEE_BASE]: "Donnée de base",
  [NATURE.INTENDANCE]: "Intendance"
};

const DOMAIN_LABELS = {
  [DOMAIN.STRUCTURE]: "Structure",
  [DOMAIN.INCENDIE]: "Incendie",
  [DOMAIN.ACOUSTIQUE]: "Acoustique",
  [DOMAIN.THERMIQUE]: "Thermique",
  [DOMAIN.ACCESSIBILITE]: "Accessibilité",
  [DOMAIN.SOL]: "Sol",
  [DOMAIN.URBANISME]: "Urbanisme",
  [DOMAIN.ENVIRONNEMENT]: "Environnement"
};

/**
 * La provenance d'une hypothèse déclarée par quelqu'un.
 *
 * Les autres provenances sont dérivées : un avis vient du moteur, un document
 * de la reconnaissance, un rattachement de l'identité. **Une hypothèse, non.**
 * Personne ne l'extrait aujourd'hui — elle est dans la note de calcul, dans la
 * tête de l'ingénieur, dans un mail — et tant qu'une extraction ne la propose
 * pas, elle n'entre que si quelqu'un l'écrit.
 *
 * Ce n'est pas une seconde mémoire : c'est la même table, avec une provenance
 * qui dit « un humain l'a posée », datée et signée comme le reste. La règle
 * « l'Atelier propose, la Mémoire enregistre » vise ce qui se **dérive** : elle
 * n'a jamais voulu dire qu'un projet ne peut pas énoncer ses propres
 * hypothèses.
 */
export const DECLARED_KIND = "hypothesis";

/**
 * La provenance d'une donnée de base posée par le projet.
 *
 * Distincte de l'hypothèse déclarée, et pas par goût du rangement : elles ne se
 * remplacent pas de la même façon. Une hypothèse a une valeur à la fois pour
 * tout le projet ; une donnée de base peut valoir différemment selon la partie
 * de l'ouvrage — le rez-de-chaussée est un ERP, les étages du logement — et sa
 * clé porte donc la zone. Un `kind` commun ferait périmer l'un par l'autre.
 */
export const BASE_DATUM_KIND = "base-datum";

/** Ce qu'on écrit quand on ne sait pas. Une seule formulation, partout. */
export const UNCLASSIFIED_LABEL = "Non classé";

function texte(value) {
  return String(value ?? "").trim().toLowerCase();
}

/** Les natures connues, dans l'ordre où on les lit. */
export const NATURES = [
  NATURE.DONNEE_BASE,
  NATURE.CONSTAT,
  NATURE.HYPOTHESE,
  NATURE.CONTRAINTE,
  NATURE.INTENDANCE
];

/** Les domaines connus, dans l'ordre du métier — du gros œuvre aux abords. */
export const DOMAINS = [
  DOMAIN.STRUCTURE,
  DOMAIN.SOL,
  DOMAIN.INCENDIE,
  DOMAIN.ACCESSIBILITE,
  DOMAIN.THERMIQUE,
  DOMAIN.ACOUSTIQUE,
  DOMAIN.URBANISME,
  DOMAIN.ENVIRONNEMENT
];

/**
 * Une nature reconnue, ou `null`.
 *
 * Une valeur inconnue n'est pas rapprochée de la plus proche : elle est
 * refusée. Accepter « constats » pour « constat » ouvrirait la porte à
 * l'orthographe libre, et deux graphies feraient deux colonnes dans un filtre.
 */
export function normalizeNature(value) {
  const brut = texte(value);
  return NATURES.includes(brut) ? brut : null;
}

/** Un domaine reconnu, ou `null`. Rien n'est deviné, rien n'est approché. */
export function normalizeDomain(value) {
  const brut = texte(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return DOMAINS.includes(brut) ? brut : null;
}

export function natureLabel(nature) {
  return NATURE_LABELS[normalizeNature(nature)] ?? UNCLASSIFIED_LABEL;
}

export function domainLabel(domain) {
  return DOMAIN_LABELS[normalizeDomain(domain)] ?? UNCLASSIFIED_LABEL;
}

/**
 * Ce qui trancherait une affirmation de cette nature, ou `null`.
 *
 * `null` a deux causes qu'il ne faut pas confondre, et l'appelant doit les
 * distinguer : une nature inconnue, et l'intendance — qui est connue et que
 * rien ne tranche, parce qu'elle n'affirme rien.
 */
export function settledBy(nature) {
  const connue = normalizeNature(nature);
  return connue ? NATURE_SETTLED_BY[connue] ?? null : null;
}

const SETTLED_BY_LABELS = {
  [SETTLED_BY.TIERS]: "un tiers — règlement, norme, marché",
  [SETTLED_BY.MESURE]: "une mesure qui n'a pas encore eu lieu",
  [SETTLED_BY.OBSERVATION]: "une observation, déjà faite",
  [SETTLED_BY.PROJET]: "le projet lui-même — son programme, sa situation"
};

/** Ce qui tranche, dit en français. Pour l'écran, et pour les messages d'erreur. */
export function settledByLabel(nature) {
  return SETTLED_BY_LABELS[settledBy(nature)] ?? "";
}

/**
 * Une affirmation sur laquelle on peut se prononcer — valider, contester.
 *
 * **Les hypothèses seulement.** Se prononcer suppose qu'un avis puisse changer
 * quelque chose : sur une contrainte, il ne change rien — cinq personnes
 * d'accord ne déplacent pas une zone de neige, et cinq personnes en désaccord
 * ne l'annulent pas. Sur un constat non plus : on ne conteste pas ce qui a été
 * vu, on constate autre chose, plus tard.
 *
 * Ce que l'on peut faire à une contrainte fausse est d'un autre ordre : la
 * **corriger**. Confondre les deux gestes ferait croire à un différend là où il
 * n'y a qu'une erreur.
 */
export function isContestable(nature) {
  return normalizeNature(nature) === NATURE.HYPOTHESE;
}

/**
 * Une affirmation sur laquelle le projet **calcule**.
 *
 * Les données de base, les hypothèses et les contraintes : ce sont les valeurs
 * d'entrée. Quand l'une d'elles change, ce qui a été dimensionné dessus devient
 * suspect.
 *
 * Les données de base en premier, parce qu'elles sont en amont de tout : une
 * voirie riveraine reclassée en phase exécution change l'isolement de façade,
 * donc le calcul acoustique, donc les menuiseries, donc les entrées d'air. C'est
 * cette chaîne que personne ne tient de tête.
 *
 * Longtemps seules les hypothèses entraînaient quelque chose, parce qu'on
 * croyait la zone de neige hypothétique. La corriger est même plus urgent
 * qu'une révision d'hypothèse : réviser une hypothèse est normal, corriger une
 * contrainte veut dire qu'on a calculé faux.
 *
 * Un constat n'entraîne rien : une réserve levée, un avis qui change de lettre
 * ne rendent rien d'autre douteux — ils se suffisent. Si tout mouvement
 * propageait un drapeau, la moitié du projet serait « à revérifier » au premier
 * lot de rapports, et un écran qui signale tout ne signale plus rien.
 */
export function isFoundational(nature) {
  const connue = normalizeNature(nature);
  return connue === NATURE.HYPOTHESE || connue === NATURE.CONTRAINTE || connue === NATURE.DONNEE_BASE;
}

/**
 * La nature d'une affirmation, déduite de sa provenance.
 *
 * Aucune invention : un avis est un constat, un document et un rattachement
 * relèvent de l'intendance. Les hypothèses et les contraintes ne se déduisent
 * pas d'une provenance — elles viendront d'une extraction qui les nomme, et
 * jusque-là aucune ligne n'en porte.
 *
 * @returns {string|null} la nature, ou `null` si la provenance ne dit rien
 */
export function natureFromKind(kind) {
  const brut = texte(kind);
  if (brut === DECLARED_KIND) return NATURE.HYPOTHESE;
  if (brut === BASE_DATUM_KIND) return NATURE.DONNEE_BASE;
  if (brut === ITEM_TYPE.AVIS) return NATURE.CONSTAT;
  if (brut === ITEM_TYPE.DOCUMENT || brut === ITEM_TYPE.ATTACHMENT) return NATURE.INTENDANCE;
  return null;
}

/**
 * Ce qu'une affirmation porte comme vocabulaire, écrite ou déduite.
 *
 * La colonne prime quand elle est renseignée : une extraction qui a lu
 * « hypothèse » dans un CCTP en sait plus que la provenance. À défaut, la
 * nature se déduit — c'est le rattrapage, et il se fait **à la lecture**. Ce
 * qui se recalcule n'a pas à être conservé, et reprendre trois cents lignes en
 * base pour y écrire ce qu'on sait déjà dire serait une occasion de se tromper
 * sans retour.
 *
 * Le domaine ne se déduit jamais.
 *
 * @returns {{nature: string|null, domain: string|null, natureDerived: boolean}}
 */
export function classifyAssertion(assertion = {}) {
  const ecrite = normalizeNature(assertion.nature);
  const deduite = ecrite ? null : natureFromKind(assertion.kind);

  return {
    nature: ecrite ?? deduite,
    // Jamais déduit. C'est toute la règle.
    domain: normalizeDomain(assertion.domain),
    natureDerived: !ecrite && Boolean(deduite)
  };
}

/**
 * Ce que la mémoire contient, par nature et par domaine.
 *
 * **Le nombre de non classés est un compteur de premier rang, pas un reste.**
 * Il dit ce que les filtres ne montreront pas, et c'est la seule façon qu'une
 * lecture filtrée ne se prenne pas pour une lecture complète.
 */
export function summarizeTaxonomy(assertions = []) {
  const lignes = Array.isArray(assertions) ? assertions : [];

  const parNature = new Map(NATURES.map((nature) => [nature, 0]));
  const parDomaine = new Map(DOMAINS.map((domaine) => [domaine, 0]));
  let natureInconnue = 0;
  let domaineInconnu = 0;

  for (const assertion of lignes) {
    const { nature, domain } = classifyAssertion(assertion);

    if (nature) parNature.set(nature, parNature.get(nature) + 1);
    else natureInconnue += 1;

    if (domain) parDomaine.set(domain, parDomaine.get(domain) + 1);
    else domaineInconnu += 1;
  }

  return {
    total: lignes.length,
    natures: [...parNature.entries()].map(([id, count]) => ({ id, label: natureLabel(id), count })),
    domains: [...parDomaine.entries()].map(([id, count]) => ({ id, label: domainLabel(id), count })),
    unclassifiedNature: natureInconnue,
    unclassifiedDomain: domaineInconnu
  };
}

/**
 * Le tri d'une mémoire par nature et par domaine.
 *
 * `"none"` demande explicitement ce qui n'est pas classé : c'est un filtre
 * comme un autre, et c'est ainsi qu'on va voir ce qui manque. `""` ne filtre
 * pas.
 */
export function filterByTaxonomy(assertions = [], { nature = "", domain = "" } = {}) {
  const lignes = Array.isArray(assertions) ? assertions : [];
  const natureVoulue = String(nature ?? "");
  const domaineVoulu = String(domain ?? "");

  return lignes.filter((assertion) => {
    const classe = classifyAssertion(assertion);

    if (natureVoulue === "none" && classe.nature) return false;
    if (natureVoulue && natureVoulue !== "none" && classe.nature !== natureVoulue) return false;

    if (domaineVoulu === "none" && classe.domain) return false;
    if (domaineVoulu && domaineVoulu !== "none" && classe.domain !== domaineVoulu) return false;

    return true;
  });
}
