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
 *
 * ## Les deux contrôles ne vivent plus ici : ils sont au produit
 *
 * `services/les-preuves-dune-lecture.js` les tient, parce que **l'écran les
 * montre aussi** : « ce document a-t-il été bien lu » est une question de
 * l'utilisateur, posée à chaque lecture, et plus seulement une mesure de
 * laboratoire.
 *
 * Deux écritures de « cette citation figure-t-elle dans le document » auraient
 * fini par ne plus répondre la même chose, et l'écran aurait dit vert là où la
 * mesure disait rouge (règle 4) — sur l'indicateur que le produit met en avant.
 *
 * Ce module reste donc, et il garde ce qui lui appartient : **l'adaptation de
 * l'empreinte**. L'empreinte est la forme de la mesure, pas celle du produit ;
 * la faire connaître au service du produit l'aurait fait dépendre de l'outil qui
 * le mesure.
 */

import {
  lesCitationsSeRetrouvent as citationsDuProduit,
  lesMarquesSontDeclarees as marquesDuProduit,
  pourChercherUneCitation
} from "../../apps/web/js/services/les-preuves-dune-lecture.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * La normalisation, **ré-exportée et non recopiée**.
 *
 * Les épreuves de la batterie s'en servent pour fabriquer un document où une
 * citation se retrouve. Une seconde copie ici répondrait un jour autrement que
 * celle du produit, et la batterie mesurerait sa propre normalisation.
 */
export { pourChercherUneCitation };

/** Les invariants que la batterie sait poser. */
export const INVARIANT = {
  CITATION_RETROUVEE: "citation_retrouvee",
  MARQUE_DECLAREE: "marque_declaree"
};

/**
 * Les relevés d'une empreinte, dans la forme que les contrôles attendent.
 *
 * C'est tout ce que ce module traduit : une `Map` de la mesure devient la liste
 * `{cle, citation, marque}` du produit.
 */
function lesRelevesDeLempreinte(empreinte) {
  return [...(empreinte?.parCle ?? new Map()).values()]
    .map((un) => ({ cle: texte(un?.cle), citation: un?.citation, marque: un?.marque }));
}

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
  const controle = citationsDuProduit(lesRelevesDeLempreinte(empreinte), document);
  const citees = controle.sur;
  const manquantes = controle.manques;

  // **La forme de l'invariant reste celle de la batterie.** Elle est déposée
  // dans la console et comparée d'un passage à l'autre : la changer ferait des
  // bilans qui ne se comparent plus à ceux d'avant (règle 6).
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
  const legende = Array.isArray(empreinte?.legende) ? empreinte.legende : [];
  const controle = marquesDuProduit(lesRelevesDeLempreinte(empreinte), legende);

  // **La légende se teste ici, et non dans la phrase du contrôle.** Chercher
  // « légende » dans `sansObjet` marchait, et aurait cessé de marcher à la
  // première reformulation — sans que rien ne tombe, en rendant simplement un
  // invariant qui ne se pose plus.
  if (!legende.filter(Boolean).length) {
    return {
      quoi: INVARIANT.MARQUE_DECLAREE,
      employees: 0,
      sansSens: [],
      tient: true,
      dit: "aucune légende lue : l'invariant ne se pose pas"
    };
  }

  const employees = controle.sur;
  const sansSens = controle.manques;

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
