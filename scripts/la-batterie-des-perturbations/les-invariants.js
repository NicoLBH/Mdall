/**
 * Les invariants — **ce qui doit tenir sur une lecture, sans en connaître la
 * bonne réponse.**
 *
 * ## Ce qu'ils ne sont pas
 *
 * Ils ne mesurent pas la justesse. Ils attrapent les fautes qui **ne peuvent pas
 * être justes**, quel que soit le document : une citation qui ne figure pas dans
 * le document n'est pas une citation, une marque employée sans être déclarée ne
 * se résout pas.
 *
 * ## Pourquoi ils vivent ici, à côté des perturbations
 *
 * Une perturbation compare deux lectures ; un invariant juge une lecture seule.
 * Les deux se posent dans le même geste — on vient de payer deux lectures, il
 * serait absurde de ne poser qu'une question — et un invariant qui tombe
 * **explique** souvent une relation qui tombe : si la citation de l'avis A-12 ne
 * se retrouve pas dans le document, il n'est pas étonnant que sa marque bouge.
 *
 * ## La citation, et ce qu'on s'autorise
 *
 * On ne compare pas octet pour octet. Une transcription normalise les espaces,
 * les apostrophes et les tirets, et exiger l'identité ferait tomber tous les
 * invariants sur toutes les lectures — une épreuve qui crie toujours
 * n'apprend rien. On normalise donc ces trois-là, **et rien d'autre** : ni la
 * casse, ni les accents, ni la ponctuation, qui portent du sens.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Ce qu'on met de côté avant de chercher une citation dans un document.
 *
 * **Trois normalisations, nommées une par une.** Une liste qu'on allonge sans y
 * penser finit par rendre vraie n'importe quelle citation.
 */
export function pourChercherUneCitation(valeur = "") {
  return String(valeur ?? "")
    // les apostrophes typographiques et droites sont la même apostrophe
    .replace(/[‘’ʼ]/g, "'")
    // les tirets longs, demi-cadratins et insécables sont le même tiret
    .replace(/[‐-―−]/g, "-")
    // toute suite d'espaces, de tabulations et de retours vaut un espace
    .replace(/\s+/g, " ")
    .trim();
}

/** Les invariants que la batterie sait poser. */
export const INVARIANT = {
  CITATION_RETROUVEE: "citation_retrouvee",
  MARQUE_DECLAREE: "marque_declaree"
};

/**
 * Toute citation se retrouve dans le document d'où elle sort.
 *
 * **C'est le meilleur indicateur du produit**, et il ne coûte rien : une
 * citation qui ne figure pas dans le document est une phrase que personne n'a
 * écrite, présentée avec l'aplomb d'une phrase lue.
 *
 * Un relevé sans citation n'est pas une faute ici — c'est une mesure de
 * couverture, qui se compte à part : exiger une citation de chacun ferait tomber
 * l'invariant sur les lectures qui n'en rendent pas du tout, et l'on cesserait
 * de le regarder.
 */
export function lesCitationsSeRetrouvent(empreinte = null, document = "") {
  const dans = pourChercherUneCitation(document);
  const manquantes = [];
  let citees = 0;

  for (const un of (empreinte?.parCle ?? new Map()).values()) {
    const citation = pourChercherUneCitation(un.citation);
    if (!citation) continue;
    citees += 1;
    if (!dans.includes(citation)) manquantes.push(un.cle);
  }

  return {
    quoi: INVARIANT.CITATION_RETROUVEE,
    citees,
    manquantes,
    tient: manquantes.length === 0,
    dit: citees === 0
      ? "aucun relevé ne porte de citation : l'invariant ne se pose pas"
      : (manquantes.length
        ? `${manquantes.length} citations sur ${citees} ne figurent pas dans le document `
          + `(${manquantes.slice(0, 3).join(", ")}${manquantes.length > 3 ? "…" : ""})`
        : `${citees} citations retrouvées mot pour mot`)
  };
}

/**
 * Toute marque employée est déclarée dans la légende.
 *
 * Une marque qui ne se résout pas n'est pas une faute du modèle : c'est un fait
 * du document, et la lecture a raison de la rendre telle quelle. Ce qui se
 * mesure ici est **combien**, pour que la courbe le dise ; et la lecture doit
 * avoir lu une légende, sans quoi la question ne se pose pas.
 */
export function lesMarquesSontDeclarees(empreinte = null) {
  const declarees = new Set(liste(empreinte?.legende).map((une) => texte(une)));
  if (!declarees.size) {
    return {
      quoi: INVARIANT.MARQUE_DECLAREE,
      employees: 0,
      sansSens: [],
      tient: true,
      dit: "aucune légende lue : l'invariant ne se pose pas"
    };
  }

  const sansSens = [];
  let employees = 0;
  for (const un of (empreinte?.parCle ?? new Map()).values()) {
    const marque = texte(un.marque);
    if (!marque) continue;
    employees += 1;
    if (!declarees.has(marque)) sansSens.push(`${un.cle} → « ${marque} »`);
  }

  return {
    quoi: INVARIANT.MARQUE_DECLAREE,
    employees,
    sansSens,
    tient: sansSens.length === 0,
    dit: sansSens.length
      ? `${sansSens.length} marques sur ${employees} ne figurent pas dans la légende `
        + `(${sansSens.slice(0, 3).join(", ")}${sansSens.length > 3 ? "…" : ""})`
      : `${employees} marques, toutes déclarées`
  };
}

/** Les deux, posés d'un coup sur une lecture et son document. */
export function lesInvariantsDUneLecture(empreinte = null, document = "") {
  return [
    lesCitationsSeRetrouvent(empreinte, document),
    lesMarquesSontDeclarees(empreinte)
  ];
}
