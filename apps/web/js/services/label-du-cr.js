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
 * Le label que porte une rubrique qui désigne quelqu'un.
 *
 * **C'est le mot du métier, et c'est lui qui fera la vue.** Un maître d'œuvre
 * demande « montre-moi les lots », pas « montre-moi les rubriques de niveau
 * supérieur ». La vue sera une recherche `label:LOT`, et elle rendra la
 * quinzaine de lignes sous lesquelles tout le reste se range.
 *
 * **Y compris sur le contrôle technique et le coordonnateur SPS**, qui ne sont
 * pas des lots du marché. La question que la vue pose n'est pas « quels sont
 * les lots » mais « qui a quelque chose à faire » — et ceux-là en ont. C'est un
 * abus de langage assumé : si l'usage montre qu'il faut les distinguer, un
 * second label le fera sans rien casser, un label s'ajoutant sans se migrer.
 */
export const LABEL_DU_LOT = "LOT";

/**
 * Le label des rubriques qui ne désignent personne.
 *
 * « Marché de travaux », « Installation de chantier », « Échange de
 * documents » : elles rangent des points sans que quiconque en réponde. Les
 * marquer `LOT` les ferait apparaître dans une vue où l'on cherche des
 * entreprises, et l'on croirait qu'une procédure a du travail en retard.
 */
export const LABEL_DES_DISPOSITIONS = "Dispositions générales";

/**
 * Le label d'une rubrique, d'après ce qu'elle désigne.
 *
 * Un seul endroit décide (règle 10) : l'écran de la proposition, la fusion et
 * la vue lisent tous celui-ci, et un label posé ici mais cherché autrement
 * rendrait une vue vide sans rien dire.
 */
export function labelDeLaRubrique(genre = "") {
  return texte(genre) === "administrative" ? LABEL_DES_DISPOSITIONS : LABEL_DU_LOT;
}

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
 * La couleur de chaque label, décidée ici et nulle part ailleurs.
 *
 * ## Pourquoi elles vivent avec les noms
 *
 * `project_labels` porte trois couleurs par label — texte, fond, bordure. Ce
 * sont elles que la proposition écrira en créant le label, et ce sont elles que
 * l'écran affiche avant. Les choisir à l'écran et les réécrire à la création
 * ferait deux jeux de couleurs : le label apparaîtrait d'une teinte dans
 * l'analyse et d'une autre dans le projet, sans que rien ne l'explique
 * (règle 4).
 *
 * ## Pourquoi celles-là
 *
 * Elles disent ce que le label dit. Le rouge pour ce qui presse, l'ambre pour
 * ce qui se répète, le gris pour ce qui n'attend rien de personne, le bleu pour
 * la marque d'origine — qui n'est pas un jugement et ne doit pas crier.
 */
export const COULEURS_DU_LABEL = {
  [LABEL_DU_CR]: { texte: "#4493f8", fond: "rgba(68, 147, 248, .12)", bordure: "rgba(68, 147, 248, .45)" },
  Urgent: { texte: "#f85149", fond: "rgba(248, 81, 73, .12)", bordure: "rgba(248, 81, 73, .45)" },
  Rappel: { texte: "#d29922", fond: "rgba(210, 153, 34, .12)", bordure: "rgba(210, 153, 34, .45)" },
  "Information générale": { texte: "#8b949e", fond: "rgba(139, 148, 158, .12)", bordure: "rgba(139, 148, 158, .4)" }
};

/**
 * La couleur d'un label, prête à poser sur un élément.
 *
 * Un label qu'on ne connaît pas rend "" : il ne se colore pas plutôt que de
 * prendre une couleur au hasard, qui le ferait passer pour l'un des trois.
 */
export function styleDuLabel(nom = "") {
  const couleurs = COULEURS_DU_LABEL[texte(nom)]
    ?? COULEURS_DU_LABEL[LABELS_DU_CR.find((connu) => memeLabel(connu, nom))];

  if (!couleurs) return "";
  return `color:${couleurs.texte};background:${couleurs.fond};border-color:${couleurs.bordure};`;
}

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
 * **Les rubriques y viennent aussi.** Un sujet père porte `LOT` ou
 * « Dispositions générales » : ces labels doivent être créés au projet comme
 * les autres, sinon la fusion poserait sur les pères un label qui n'existe pas,
 * et la vue `label:LOT` ne rendrait rien.
 *
 * @param {object[]} points la lecture assemblée
 * @param {object[]|null} labelsDuProjet — `null` quand on n'a pas pu les lire
 * @param {object[]} [rubriques] les rubriques relues du compte rendu
 * @returns {{connu: boolean, poses: {nom: string, points: number, existe: boolean}[],
 *   aCreer: string[]}}
 */
export function labelsAProposer(points = [], labelsDuProjet = null, rubriques = []) {
  const comptes = new Map([[LABEL_DU_CR, 0]]);

  for (const rubrique of Array.isArray(rubriques) ? rubriques : []) {
    const nom = labelDeLaRubrique(rubrique?.genre);
    comptes.set(nom, (comptes.get(nom) ?? 0) + 1);
  }

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
