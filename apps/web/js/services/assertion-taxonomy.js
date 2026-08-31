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
 * **La nature** dit comment l'affirmation se conduit dans le temps. C'est elle
 * qui décidera, à l'étape suivante, qu'une hypothèse remplacée rend suspect
 * tout ce qui en découle — un constat, lui, se lève sans rien entraîner.
 *
 * **Le domaine** dit de quoi elle parle. Il vient du métier, pas de nous :
 * structure, incendie, acoustique, thermique, accessibilité, sol, urbanisme,
 * environnement. Ces huit-là sont stables depuis trente ans et communs à tous
 * les intervenants d'une opération — c'est ce qui en fait une hiérarchie
 * utilisable plutôt qu'un rangement personnel.
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

/** Comment une affirmation se comporte dans le temps. */
export const NATURE = {
  /** Un avis, une remarque de CR, un désordre : daté, ponctuel. Se lève ou s'aggrave. */
  CONSTAT: "constat",
  /**
   * Zone de neige, portance du sol, classement incendie.
   *
   * **Une seule valeur à la fois** : ce qui en découle devient faux quand elle
   * change. C'est la nature qui donne à Mdall ce qu'aucun autre outil ne fait.
   */
  HYPOTHESE: "hypothese",
  /**
   * Un article du PLU, une règle PMR, une clause de notice.
   *
   * Permanente, datée par un tiers. Elle se **vérifie** — elle ne se lève pas :
   * on ne « lève » pas une règle d'accessibilité, on démontre qu'on la respecte.
   */
  CONTRAINTE: "contrainte",
  /** Un document au corpus, une affaire rattachée : ce que le projet a rangé. */
  INTENDANCE: "intendance"
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

/** Ce qu'on écrit quand on ne sait pas. Une seule formulation, partout. */
export const UNCLASSIFIED_LABEL = "Non classé";

function texte(value) {
  return String(value ?? "").trim().toLowerCase();
}

/** Les natures connues, dans l'ordre où on les lit. */
export const NATURES = [NATURE.CONSTAT, NATURE.HYPOTHESE, NATURE.CONTRAINTE, NATURE.INTENDANCE];

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
