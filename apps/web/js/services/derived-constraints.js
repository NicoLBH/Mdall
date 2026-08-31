/**
 * Les contraintes que le site impose, déduites de l'adresse.
 *
 * Une zone de neige n'est pas une donnée du projet : c'est une **contrainte**,
 * fixée par un texte, et le fait qu'elle se déduise de la commune n'en fait pas
 * une supposition — cette déduction *est* sa définition. Il n'y a donc rien à
 * valider : au plus une entrée à corriger si l'adresse est fausse.
 *
 * C'est ce qui rend le versement automatique possible ici et impossible pour
 * une hypothèse. Personne n'a à « retenir » une zone de neige.
 *
 * ## La confiance porte sur les entrées, jamais sur la règle
 *
 * L'outil climatique écrivait `confidence: 1` sur chaque fait, y compris quand
 * il venait de calculer un avertissement qu'il jetait ensuite : canton courant
 * différent du canton réglementaire de 2014, plusieurs H0 possibles dans le
 * département. Une certitude fausse est pire qu'une absence.
 *
 * Le doute ne porte jamais sur le règlement — il est ce qu'il est. Il porte sur
 * **ce qu'on lui a donné à manger** : la bonne commune ? le bon canton ? une
 * altitude qui veut dire quelque chose ? Ce module nomme ces réserves, et la
 * confiance n'en est que le résumé.
 *
 * **La confiance ne se stocke pas.** Elle se recalcule des réserves à chaque
 * lecture, parce que ce qui est dérivé se recalcule — et parce qu'une seconde
 * copie d'une valeur finit toujours par diverger de la première. La mémoire de
 * ce projet en a déjà fait les frais avec une table de libellés recopiée.
 *
 * ## Ce que Géorisques ne produit pas
 *
 * Géorisques répond **par commune**, ou dans un rayon d'un kilomètre autour du
 * point. « Un PPRi existe sur cette commune » n'est pas « votre parcelle est en
 * zone réglementée ». En faire une contrainte fabriquerait exactement le bruit
 * qu'on a passé trois versions à supprimer. Ces faits sont donc écartés ici,
 * volontairement et nommément : ils appellent une vérification, pas une règle.
 */

import { DOMAIN, NATURE } from "./assertion-taxonomy.js";

/** La provenance d'une contrainte déduite du site. Ni un avis, ni une déclaration. */
export const DERIVED_CONSTRAINT_KIND = "site-constraint";

/**
 * Ce qui peut clocher dans les **entrées** d'une déduction.
 *
 * Aucune ne met en doute la règle. Toutes disent : « voilà ce dont je ne suis
 * pas sûr d'avoir nourri le calcul. »
 */
export const RESERVE = {
  /**
   * Le découpage cantonal a changé depuis 2014, et c'est celui de 2014 qui fait
   * règle. Le calcul a pu retomber sur le mauvais canton.
   */
  CANTON_2014: "canton-2014",
  /** Plusieurs valeurs H0 coexistent dans le département : une a été choisie. */
  H0_FOURCHETTE: "h0-fourchette",
  /**
   * Au-delà de 900 m, l'Annexe Nationale demande une étude spécifique. La valeur
   * rendue n'est pas fausse — elle ne suffit pas, et c'est un autre défaut.
   */
  ALTITUDE_HORS_TABLE: "altitude-hors-table",
  /** Le calcul avait besoin d'une altitude et n'en a pas eu. */
  ALTITUDE_ABSENTE: "altitude-absente",
  /**
   * Le fait ne dit pas sur quoi il a été calculé. Il a été écrit avant qu'on
   * conserve les entrées : on ne peut ni le confirmer ni le suspecter.
   */
  ENTREES_INCONNUES: "entrees-inconnues"
};

const RESERVE_PHRASES = {
  [RESERVE.CANTON_2014]: "le canton a changé depuis 2014, et c'est celui de 2014 qui fait règle",
  [RESERVE.H0_FOURCHETTE]: "plusieurs valeurs H0 existent dans ce département, une a été retenue",
  [RESERVE.ALTITUDE_HORS_TABLE]: "au-delà de 900 m, l'Annexe Nationale demande une étude spécifique",
  [RESERVE.ALTITUDE_ABSENTE]: "l'altitude du site n'est pas connue",
  [RESERVE.ENTREES_INCONNUES]: "ce calcul ne dit pas sur quoi il a été fait"
};

/** L'état des entrées d'une déduction. C'est de cela que parle la confiance. */
export const INPUTS = {
  /** Aucune réserve : la déduction a eu ce qu'il lui fallait. */
  SURES: "sures",
  /** Une réserve nommée pèse sur une entrée. */
  A_VERIFIER: "a-verifier",
  /** On ignore sur quoi le calcul repose. Ce n'est pas la même chose qu'un doute. */
  INCONNUES: "inconnues"
};

const CONFIDENCE = {
  [INPUTS.SURES]: 1,
  [INPUTS.A_VERIFIER]: 0.5,
  // Ne pas savoir n'autorise pas à annoncer un demi. `null` dit « non qualifiée ».
  [INPUTS.INCONNUES]: null
};

/**
 * Les faits de contexte qui décrivent une règle du site, et ce qu'ils énoncent.
 *
 * Tout fait absent de cette table n'est pas une contrainte — Géorisques en
 * premier lieu. L'omission est la décision.
 */
const CONSTRAINT_FACTS = {
  snow_zone: { subject: "Zone de neige", domain: DOMAIN.STRUCTURE, read: (v) => texte(v?.zone) },
  wind_zone: { subject: "Zone de vent", domain: DOMAIN.STRUCTURE, read: (v) => texte(v?.zone) },
  seismic_zone: { subject: "Zone de sismicité", domain: DOMAIN.STRUCTURE, read: (v) => texte(v?.value) },
  frost_depth: {
    subject: "Profondeur hors gel",
    // Une cote de fondation : c'est le sol qui la commande, pas la structure.
    domain: DOMAIN.SOL,
    // `Number(null)` vaut zéro : lire la profondeur sans écarter l'absence
    // d'abord ferait entrer « Profondeur hors gel : 0,00 m » — une cote de
    // fondation au niveau du sol, énoncée comme une règle.
    read: (v) => {
      const brut = v?.frost_depth_m;
      if (brut === null || brut === undefined || texte(brut) === "") return "";
      const metres = nombre(brut);
      return metres === null ? "" : `${metres.toFixed(2)} m`;
    }
  }
};

/** L'ordre de lecture : celui du métier, pas celui de la table. */
const FACT_ORDER = ["snow_zone", "wind_zone", "seismic_zone", "frost_depth"];

function texte(value) {
  return String(value ?? "").trim();
}

function nombre(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * La clé métier d'une contrainte du site.
 *
 * C'est la clé du fait, pas son libellé : deux versions du même fait doivent se
 * remplacer, et un libellé qu'on retouche en ferait deux contraintes en vigueur.
 */
export function constraintSubjectKey(factKey) {
  return `site:${texte(factKey).toLowerCase()}`;
}

/**
 * Les réserves d'un fait, dans un ordre stable.
 *
 * Deux sources : celles que le producteur a nommées, et celles qui se lisent des
 * entrées conservées. Un fait qui ne conserve ni l'une ni l'autre est déclaré
 * inconnu plutôt que sûr.
 */
export function reservesOf(fact = {}) {
  const valeur = fact?.fact_value ?? {};
  const nommees = Array.isArray(valeur.reserves) ? valeur.reserves.map(texte).filter(Boolean) : [];
  const entrees = valeur.inputs && typeof valeur.inputs === "object" ? valeur.inputs : null;

  if (!entrees && nommees.length === 0) return [RESERVE.ENTREES_INCONNUES];

  const trouvees = new Set(nommees.filter((code) => Object.values(RESERVE).includes(code)));

  const altitude = nombre(entrees?.altitude);
  if (altitude !== null && altitude > 900) trouvees.add(RESERVE.ALTITUDE_HORS_TABLE);
  if (entrees && texte(fact.fact_key) === "frost_depth" && altitude === null) {
    trouvees.add(RESERVE.ALTITUDE_ABSENTE);
  }

  return [...trouvees].sort();
}

/** L'état des entrées, déduit des réserves. */
export function inputsStateOf(reserves = []) {
  const liste = Array.isArray(reserves) ? reserves : [];
  if (liste.includes(RESERVE.ENTREES_INCONNUES)) return INPUTS.INCONNUES;
  return liste.length === 0 ? INPUTS.SURES : INPUTS.A_VERIFIER;
}

/**
 * La confiance, recalculée des réserves.
 *
 * `null` quand on ignore les entrées : c'est « non qualifiée », et ce n'est ni
 * un zéro ni un demi.
 */
export function confidenceOf(reserves = []) {
  return CONFIDENCE[inputsStateOf(reserves)];
}

/**
 * Les réserves dites en français, pour l'écran.
 *
 * Sans réserve, la phrase ne dit pas « sûr » : elle dit sur quoi elle se tait.
 * Prétendre à la certitude est ce qu'on est en train de corriger.
 */
export function describeReserves(reserves = []) {
  const liste = (Array.isArray(reserves) ? reserves : []).map((code) => RESERVE_PHRASES[code]).filter(Boolean);
  if (liste.length === 0) return "Aucune réserve sur les entrées de ce calcul.";
  const tete = liste.length > 1 ? "Réserves sur les entrées" : "Réserve sur l'entrée";
  return `${tete} : ${liste.join(" ; ")}.`;
}

/**
 * Les contraintes que ces faits de contexte énoncent.
 *
 * Rien n'est inventé : un fait sans valeur lisible ne produit pas de contrainte
 * vide, il n'en produit aucune. Un fait qui n'est pas dans la table n'en produit
 * pas non plus — Géorisques répond par commune, et une commune n'est pas une
 * parcelle.
 *
 * @returns {{factKey: string, subject: string, subjectKey: string, value: string,
 *   statement: string, domain: string, reserves: string[], inputsState: string,
 *   confidence: number|null, sourceRef: string|null, computedAt: string|null}[]}
 */
export function constraintsFromContextFacts(facts = []) {
  const lignes = Array.isArray(facts) ? facts : [];
  const parCle = new Map();

  for (const fait of lignes) {
    const cle = texte(fait?.fact_key);
    const modele = CONSTRAINT_FACTS[cle];
    if (!modele) continue;

    const valeur = modele.read(fait?.fact_value ?? {});
    if (!valeur) continue;

    // Le fait le plus récent l'emporte : deux producteurs pour une même règle ne
    // font pas deux règles.
    const precedent = parCle.get(cle);
    if (precedent && texte(precedent.computedAt) >= texte(fait?.updated_at)) continue;

    const reserves = reservesOf(fait);
    parCle.set(cle, {
      factKey: cle,
      subject: modele.subject,
      subjectKey: constraintSubjectKey(cle),
      value: valeur,
      statement: `${modele.subject} : ${valeur}`,
      domain: modele.domain,
      reserves,
      inputsState: inputsStateOf(reserves),
      confidence: confidenceOf(reserves),
      sourceRef: texte(fait?.source_ref) || null,
      computedAt: texte(fait?.updated_at) || null
    });
  }

  return FACT_ORDER.map((cle) => parCle.get(cle)).filter(Boolean);
}

/**
 * Les lignes à écrire dans la mémoire pour ces contraintes.
 *
 * Une contrainte du site n'a pas de proposition : elle ne vient d'aucun dépôt.
 * Elle porte en revanche ses réserves et ses entrées dans son `payload`, faute
 * de quoi on ne saurait plus, dans six mois, sur quoi elle a été calculée — et
 * une contrainte dont on ignore l'origine ne se corrige pas, elle se subit.
 */
export function plannedConstraintRows({ projectId = "", candidates = [], declaredBy = null, at = "" } = {}) {
  const projet = texte(projectId);
  if (!projet) return [];

  const quand = texte(at) || new Date().toISOString();

  return (Array.isArray(candidates) ? candidates : [])
    .filter((candidat) => texte(candidat?.value))
    .map((candidat) => ({
      project_id: projet,
      kind: DERIVED_CONSTRAINT_KIND,
      subject_key: candidat.subjectKey,
      statement: candidat.statement,
      detail: describeReserves(candidat.reserves),
      status: "assumed",
      nature: NATURE.CONTRAINTE,
      domain: candidat.domain ?? null,
      payload: {
        subject: candidat.subject,
        value: candidat.value,
        factKey: candidat.factKey,
        derived: true,
        reserves: candidat.reserves,
        inputsState: candidat.inputsState,
        sourceRef: candidat.sourceRef,
        computedAt: candidat.computedAt
      },
      proposition_id: null,
      proposition_number: null,
      source_document_id: null,
      decided_by: declaredBy ?? null,
      decided_at: quand
    }));
}
