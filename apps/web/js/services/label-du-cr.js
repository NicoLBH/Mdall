/**
 * Le label que porte tout sujet venu d'un compte rendu de chantier.
 *
 * ## Pourquoi un label, et pourquoi celui-là d'abord
 *
 * Un projet Mdall mélange ce qui vient du bureau de contrôle, ce qui vient des
 * réunions de chantier, et ce que quelqu'un a ouvert à la main. Sans marque
 * d'origine, on ne peut plus ni filtrer, ni compter, ni faire une situation sur
 * « ce que le chantier doit ».
 *
 * « CR chantier » est donc le premier, et il n'est pas optionnel : c'est lui
 * qui rendra possible tout le reste — le filtre, la situation créée d'office
 * dès qu'il y a deux sujets ouverts qui le portent, la vérification qu'un
 * nouveau compte rendu ne ferme pas des points qu'on suit.
 *
 * ## Un nom vit à un seul endroit
 *
 * Le nom du label est écrit **ici**, et nulle part ailleurs. Recopié dans
 * l'écran, dans le filtre et dans la situation, il finirait par exister en
 * trois versions — « CR chantier », « CR Chantier », « CR de chantier » — et
 * le filtre ne trouverait plus rien (règle 10).
 *
 * ## Il ne se crée pas ici
 *
 * Ce module dit **si** le label existe et **quoi en dire**. Il ne l'écrit pas :
 * créer un label dans un projet est une écriture, et une écriture passe par une
 * proposition (règle 1).
 *
 * Rien ici n'appelle quoi que ce soit : des labels entrent, une réponse sort.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Le nom du label, tel qu'il s'écrit. Un seul endroit. */
export const LABEL_DU_CR = "CR chantier";

/**
 * Deux noms de label désignent-ils le même label ?
 *
 * La casse et les accents ne comptent pas : la base elle-même refuse deux
 * labels homonymes à la casse près, et celui qui a déjà créé « cr chantier » à
 * la main ne doit pas s'en voir proposer un second.
 */
export function memeLabel(gauche, droite) {
  const aplati = (valeur) =>
    texte(valeur)
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("fr-FR");

  const cle = aplati(gauche);
  return cle.length > 0 && cle === aplati(droite);
}

/**
 * Le label « CR chantier » de ce projet, s'il y est.
 *
 * @param {object[]|null} labels les labels du projet — `null` quand on n'a pas
 *   pu les lire, ce qui n'est pas « le projet n'en a aucun » (règle 5)
 * @returns {{connu: boolean, existe: boolean, label: object|null}}
 */
export function labelDuCrDansLeProjet(labels = null) {
  if (labels === null || labels === undefined) return { connu: false, existe: false, label: null };

  const trouve = (Array.isArray(labels) ? labels : []).find(
    (label) => memeLabel(label?.name, LABEL_DU_CR) || memeLabel(label?.label_key, LABEL_DU_CR)
  ) ?? null;

  return { connu: true, existe: Boolean(trouve), label: trouve };
}

/**
 * Ce qu'il faut dire du label, en une phrase.
 *
 * **Trois phrases, et la troisième n'est pas la première.** Ne pas avoir pu
 * lire les labels du projet n'est pas « le projet n'a pas ce label » : la
 * seconde annoncerait une création qui n'aura peut-être pas lieu.
 */
export function phraseDuLabel(etat = {}) {
  if (!etat?.connu) {
    return `Les labels du projet n'ont pas pu être lus : on ne sait pas si « ${LABEL_DU_CR} » y est déjà.`;
  }

  if (etat.existe) {
    return `Chaque sujet ouvert ou relancé par ce compte rendu porterait le label « ${LABEL_DU_CR} », qui existe déjà dans ce projet.`;
  }

  return `Chaque sujet ouvert ou relancé par ce compte rendu porterait le label « ${LABEL_DU_CR} » — il n'existe pas encore dans ce projet, la proposition le créerait.`;
}
