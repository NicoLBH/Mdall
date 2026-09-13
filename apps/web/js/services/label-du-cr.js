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
 * Les labels de qualification, et pourquoi la liste est **fermée**.
 *
 * « CR chantier » dit d'où vient un sujet ; ceux-ci disent ce qu'il vaut. Un
 * compte rendu de chantier ne les porte pas comme des étiquettes : il les dit en
 * toutes lettres — « urgent », « pour rappel », « pour information » — et c'est
 * cela que le modèle relève.
 *
 * **La liste est fermée, et ce n'est pas une limitation, c'est le point.** Un
 * modèle libre d'inventer des labels en produit quinze en trois comptes rendus :
 * « Urgent », « Très urgent », « Prioritaire », « À traiter vite ». Le projet se
 * remplit d'étiquettes qui disent la même chose, aucun filtre ne trouve plus
 * rien, et personne ne nettoiera. Un label hors de cette liste est écarté au
 * serveur, comme une citation qu'on ne retrouve pas.
 *
 * Trois suffisent, et elles correspondent à ce qu'un compte rendu distingue
 * réellement : ce qui presse, ce qui se répète, et ce qui n'attend rien de
 * personne.
 */
export const LABELS_DE_QUALIFICATION = ["Urgent", "Rappel", "Information générale"];

/** Ce que chacun veut dire — la même phrase pour le modèle et pour l'écran. */
export const QUOI_DU_LABEL = {
  Urgent: "Le document le marque urgent, ou fixe une échéance immédiate.",
  Rappel: "Le point est redit d'un compte rendu à l'autre, ou porte la mention « pour rappel ».",
  "Information générale": "Le document l'écrit pour information : il n'attend d'action de personne."
};

/** Tous les labels qu'un compte rendu peut poser. */
export const LABELS_DU_CR = [LABEL_DU_CR, ...LABELS_DE_QUALIFICATION];

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
 * Les labels que ce compte rendu poserait, et ceux qu'il faudrait créer.
 *
 * « CR chantier » y est toujours : c'est la marque d'origine, et tout sujet venu
 * d'un compte rendu la porte. Les autres ne viennent que des points où le
 * document les dit — et ils ont déjà été ramenés à la liste fermée au serveur.
 *
 * @param {object[]} points la lecture assemblée
 * @param {object[]|null} labelsDuProjet — `null` quand on n'a pas pu les lire
 * @returns {{connu: boolean, poses: {nom: string, points: number, existe: boolean}[],
 *   aCreer: string[]}}
 */
export function labelsAProposer(points = [], labelsDuProjet = null) {
  const comptes = new Map([[LABEL_DU_CR, 0]]);

  for (const point of Array.isArray(points) ? points : []) {
    comptes.set(LABEL_DU_CR, comptes.get(LABEL_DU_CR) + 1);

    for (const nom of Array.isArray(point?.labels) ? point.labels : []) {
      const propre = texte(nom);
      // La liste est fermée : ce qui n'en est pas ne se compte pas. Le serveur
      // l'écarte déjà — ceci est la seconde porte, pas la première.
      if (!LABELS_DE_QUALIFICATION.some((connu) => memeLabel(connu, propre))) continue;

      const officiel = LABELS_DE_QUALIFICATION.find((connu) => memeLabel(connu, propre));
      comptes.set(officiel, (comptes.get(officiel) ?? 0) + 1);
    }
  }

  const connu = labelsDuProjet !== null && labelsDuProjet !== undefined;
  const duProjet = Array.isArray(labelsDuProjet) ? labelsDuProjet : [];
  const existeDeja = (nom) =>
    duProjet.some((label) => memeLabel(label?.name, nom) || memeLabel(label?.label_key, nom));

  const poses = [...comptes]
    .filter(([, points]) => points > 0)
    .map(([nom, points]) => ({ nom, points, existe: connu ? existeDeja(nom) : false }));

  return {
    connu,
    poses,
    // **Vide quand on ne sait pas**, et non « tous à créer » : annoncer la
    // création d'un label qui existe déjà ferait promettre ce qui n'aura pas
    // lieu (règle 5).
    aCreer: connu ? poses.filter((label) => !label.existe).map((label) => label.nom) : []
  };
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
