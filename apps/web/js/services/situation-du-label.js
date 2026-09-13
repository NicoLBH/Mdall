/**
 * La situation qui suit un label, et qui ne se crée pas toute seule.
 *
 * ## Ce qu'elle apporte
 *
 * Au troisième compte rendu déposé, un projet porte quarante sujets venus des
 * réunions, mêlés à ceux qui viennent d'ailleurs. Les retrouver demande de
 * refaire le même filtre à chaque fois — et personne ne le refait. Une
 * situation **automatique** fondée sur `label = CR chantier` les rassemble une
 * fois pour toutes : elle se tient à jour seule, puisqu'un sujet y entre dès
 * qu'il reçoit le label, et en sort dès qu'il le perd.
 *
 * C'est le premier endroit où la chaîne rend quelque chose sans qu'on l'ait
 * demandé.
 *
 * ## « Toute seule » ne veut pas dire « sans personne »
 *
 * Le plan disait « la situation se crée toute seule ». Elle ne se crée pas :
 * **elle se propose**. Rien n'entre directement dans la mémoire du projet, et
 * une situation en fait partie — elle a un titre, elle apparaît dans la barre,
 * on la partage. Créée dans le dos de quelqu'un, elle serait la première chose
 * du produit que personne n'a signée.
 *
 * Ce qui est automatique, c'est **son contenu** : une fois acceptée, elle n'a
 * plus besoin de personne.
 *
 * ## Une seule, jamais deux
 *
 * Une seconde situation sur le même label serait une seconde vérité sur le même
 * ensemble, et l'on ne saurait plus laquelle regarder (règle 10). Dès qu'une
 * situation automatique couvre déjà le label, on ne propose plus rien — même si
 * quelqu'un l'a renommée, déplacée ou refermée.
 *
 * Rien ici n'appelle quoi que ce soit : des sujets et des situations entrent,
 * une proposition sort.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const cle = (valeur) => texte(valeur).toLowerCase();

/**
 * **Deux, et pas un.** Une situation qui ne rassemble qu'un sujet ne rassemble
 * rien : c'est un sujet avec une page de plus. À partir de deux, elle commence
 * à répondre à « où en sont les points du chantier ».
 */
export const ASSEZ_POUR_UNE_SITUATION = 2;

export const SITUATION = {
  /** Il n'y a pas de quoi : moins de deux sujets ouverts portent le label. */
  TROP_TOT: "trop_tot",
  /** Une situation couvre déjà ce label : on n'en propose pas une seconde. */
  DEJA_LA: "deja_la",
  /** On ne sait pas ce que le projet porte : on ne propose rien. */
  INCONNU: "inconnu",
  /** Il y a de quoi, et rien ne la couvre encore. */
  A_PROPOSER: "a_proposer"
};

export const PHRASES_DE_LA_SITUATION = {
  [SITUATION.TROP_TOT]: "Un seul sujet suivi depuis les comptes rendus : il n'y a pas encore de quoi faire une situation.",
  [SITUATION.DEJA_LA]: "Une situation suit déjà ces sujets : les nouveaux y entreront d'eux-mêmes.",
  [SITUATION.INCONNU]: "On ne sait pas quelles situations le projet porte : aucune n'est proposée.",
  [SITUATION.A_PROPOSER]: "Assez de sujets viennent des comptes rendus pour qu'une situation les rassemble."
};

/**
 * Ce qu'une situation automatique sur ce label vaut d'explication, à l'écran.
 *
 * **Elle ne se referme pas.** Un sujet fermé sort du filtre, et la situation
 * maigrit ; elle ne prétend pas conserver l'histoire, c'est le rôle du sujet.
 */
export const CE_QUE_LA_SITUATION_FAIT =
  "Elle se tient à jour seule : un sujet y entre dès qu'il reçoit le label, et en sort dès qu'il "
  + "est fermé. Personne n'a à la remplir.";

/**
 * Le filtre qu'elle porterait.
 *
 * La forme est celle que la base attend (`situations.filter_definition`) : la
 * recopier approximativement ferait une situation qui ne rassemble rien, et
 * l'erreur ne se verrait qu'à l'usage.
 */
export function filtreDuLabel(labelCle = "") {
  return {
    status: ["open"],
    priorities: [],
    objectiveIds: [],
    labelIds: [cle(labelCle)].filter(Boolean),
    assigneeIds: [],
    blockedOnly: false
  };
}

/** Une situation automatique couvre-t-elle déjà ce label ? */
export function couvreLeLabel(situation, labelCle = "") {
  if (texte(situation?.mode).toLowerCase() !== "automatic") return false;

  const vises = Array.isArray(situation?.filter_definition?.labelIds)
    ? situation.filter_definition.labelIds.map(cle)
    : [];

  return vises.includes(cle(labelCle));
}

/**
 * Faut-il proposer une situation, et laquelle.
 *
 * @param {object} options
 * @param {string} options.labelCle la clé du label — « cr chantier »
 * @param {string} options.labelNom son nom tel qu'il s'écrit
 * @param {string[]|null} options.sujetsDuLabel les sujets **ouverts** qui le portent
 *   — `null` : on ne sait pas
 * @param {object[]|null} options.situations les situations du projet — `null` : on ne sait pas
 * @returns {{verdict: string, combien: number, situation: object|null}}
 */
export function situationDuLabel({
  labelCle = "", labelNom = "", sujetsDuLabel = null, situations = null
} = {}) {
  const rien = (verdict, combien = 0) => ({ verdict, combien, situation: null });

  // **Ne pas savoir n'autorise pas à créer.** Sans la liste des situations, on
  // ne peut pas affirmer qu'aucune ne couvre le label — et l'on en ferait une
  // seconde (règle 5).
  if (!Array.isArray(sujetsDuLabel) || !Array.isArray(situations) || !cle(labelCle)) {
    return rien(SITUATION.INCONNU);
  }

  const combien = sujetsDuLabel.map(texte).filter(Boolean).length;

  if (situations.some((situation) => couvreLeLabel(situation, labelCle))) {
    return rien(SITUATION.DEJA_LA, combien);
  }
  if (combien < ASSEZ_POUR_UNE_SITUATION) return rien(SITUATION.TROP_TOT, combien);

  return {
    verdict: SITUATION.A_PROPOSER,
    combien,
    situation: {
      // Le nom du label, et rien d'inventé : c'est ce que la situation
      // rassemble, et c'est sous ce nom qu'on la cherchera.
      title: texte(labelNom) || texte(labelCle),
      description: "Les sujets ouverts qui viennent des comptes rendus de chantier.",
      mode: "automatic",
      filter_definition: filtreDuLabel(labelCle)
    }
  };
}

/** Ce qu'il faut dire de la situation, en une phrase. */
export function phraseDeLaSituation(verdict = {}) {
  const dite = PHRASES_DE_LA_SITUATION[verdict?.verdict] ?? "";
  if (verdict?.verdict !== SITUATION.A_PROPOSER) return dite;

  return `${verdict.combien} sujets ouverts viennent des comptes rendus. ${CE_QUE_LA_SITUATION_FAIT}`;
}
