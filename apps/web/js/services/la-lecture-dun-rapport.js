/**
 * Ce qu'une lecture de rapport de contrôle garde, et ce qu'on en rouvre.
 *
 * ## Pourquoi ce lecteur-là, et maintenant
 *
 * Le corpus entier l'a montré trois rounds de suite : **4 223 affirmations sur
 * 9 488 sont des intitulés d'avis**, et aucune ne porte de mot de liaison. Le
 * raisonnement d'un bureau de contrôle n'est pas dans l'étiquette « Avis 146 —
 * Giron des marches ≥ 28 cm » : il est dans le texte écrit **sous** elle, et ce
 * texte n'est pas en mémoire. C'est la plus grande réserve de matière du
 * produit, et elle était inatteignable.
 *
 * ## Ce que ce module remplace
 *
 * L'utilitaire lisait ces rapports par **motifs** — des expressions régulières
 * sur le texte extrait, réglées à la main dans un champ de l'écran. Deux
 * conséquences :
 *
 *   1. rien n'était conservé : on repayait l'extraction pour revoir ce qu'elle
 *      avait trouvé, et l'on ne comparait deux réglages qu'en gardant deux
 *      captures d'écran ;
 *   2. un motif ne lit pas une légende. Un rapport écrit « F », « D », « SO »
 *      dans une colonne étroite et n'explique qu'une fois, en page 2 ou en
 *      dernière page. Un motif qui cherche « favorable » dans le corps ne
 *      trouve rien, parce que le mot n'y est pas.
 *
 * Le rapport suit maintenant le chemin du compte rendu : **reconnaître la
 * structure — et la légende —, transcrire en Markdown, puis analyser.** C'est
 * le même procédé, pour la même raison : on juge à l'œil ce que le modèle a
 * compris, par paliers comparables (fondamental 13).
 *
 * ## Une lecture est une photographie
 *
 * Elle gèle ce que la lecture a vu, et ne le recalcule jamais : la structure
 * telle qu'elle a été reconnue, la légende telle qu'elle a été lue, le Markdown
 * tel qu'il a été transcrit, les avis tels qu'ils ont été relevés **ce
 * jour-là**. Un rapport relu six mois plus tard, avec une consigne qui a bougé,
 * ne rendrait pas la même chose — et une analyse qui change sous l'œil de celui
 * qui la relit n'est plus une analyse (règle 6).
 *
 * **La légende surtout.** Celle d'un autre rapport du même bureau n'est pas
 * celle-ci : les marques changent d'une édition à l'autre, et résoudre « S »
 * avec la table du voisin donnerait des avis faux avec l'aplomb des vrais.
 *
 * ## Il est pur
 *
 * Un état d'écran entre, une ligne sort — et inversement. C'est ce qui permet de
 * l'éprouver sans réseau.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Le procédé de lecture d'un rapport, et sa version.
 *
 * Il voyage avec chaque lecture conservée : sans lui, comparer deux lectures ne
 * dit pas si c'est le **rapport** qui a changé ou la **façon de le lire**.
 *
 * `v1` est la première version à passer par la reconnaissance de structure. Ce
 * qui précédait ne portait pas de nom, et c'est en partie pourquoi on ne
 * comparait rien.
 */
export const LE_PROCEDE_DUN_RAPPORT = "lecture d'un rapport v1";

/** Par quoi un rapport a été lu : le modèle, et la version du procédé. */
export function leLecteurDunRapport(modele = "") {
  return [texte(modele), LE_PROCEDE_DUN_RAPPORT].filter(Boolean).join(" · ");
}

/** Les colonnes d'une lecture qu'on rouvre, écrites une fois (règle 10). */
export const LE_SELECT_DUN_RAPPORT =
  "id,project_id,document,document_id,numero_de_rapport,etabli_le,nature,legende,"
  + "mesures,lu_par,analyse_gelee,proposition_id,created_at";

/**
 * Les colonnes qu'il suffit de lire pour **dresser le tableau**.
 *
 * `analyse_gelee` n'en est pas : c'est la plus grosse — elle porte le Markdown
 * entier —, et le tableau n'en montre rien. La charger pour cinquante lignes
 * afin d'en ouvrir une ferait passer cinquante transcriptions sur le réseau pour
 * en regarder une.
 *
 * `legende` en est une, elle : le tableau dit combien de marques le rapport
 * déclare, et c'est l'indicateur qui fait cliquer.
 */
export const LE_SELECT_DUNE_LIGNE_DE_RAPPORT =
  "id,project_id,document,document_id,numero_de_rapport,etabli_le,nature,legende,"
  + "mesures,lu_par,proposition_id,created_at";

/**
 * Les colonnes qu'il faut pour **suivre un avis d'un rapport au suivant**.
 *
 * Ce sont celles du tableau, plus les avis seuls — `analyse_gelee->lecture->avis`,
 * et non l'analyse entière. La frise d'un chantier de cent rapports demanderait
 * sinon cent transcriptions complètes sur le réseau pour en lire les numéros.
 *
 * **L'alias importe.** La colonne arrive sous le nom `avis`, et c'est celui que
 * `le-devenir-dun-avis.js` lit : une lecture tirée par ce select et une lecture
 * gelée entière doivent donner la même frise (règle 4).
 */
export const LE_SELECT_DES_AVIS_DUN_RAPPORT =
  "id,project_id,document,numero_de_rapport,etabli_le,legende,created_at,"
  + "avis:analyse_gelee->lecture->avis";

/**
 * Une entrée de légende, ramenée à ce qui se lit.
 *
 * Une marque sans signification n'explique rien ; une signification sans marque
 * ne désigne rien. On écarte plutôt que de garder une table à trous, dont
 * personne ne saurait quelle moitié manque.
 */
function uneMarque(brute) {
  const marque = texte(brute?.marque);
  const signification = texte(brute?.signification);
  if (!marque || !signification) return null;
  return { marque, signification, ou: texte(brute?.ou) };
}

/** La légende d'une lecture, dans l'ordre où le rapport la déclare. */
export function laLegendeDuRapport(brutes) {
  return liste(brutes).map(uneMarque).filter(Boolean);
}

/**
 * Deux lectures de la légende **du même document**, réunies.
 *
 * ## Pourquoi réunir, et pourquoi ce n'est pas emprunter
 *
 * Deux étapes voient la table des marques : la reconnaissance de structure, qui
 * va la chercher exprès, et le relevé des avis, qui la ramasse en passant. Elles
 * lisent le même document — compléter l'une par l'autre ne fait donc pas ce que
 * ce module interdit ailleurs, qui est de résoudre un rapport avec la légende du
 * voisin.
 *
 * ## La première gagne
 *
 * En cas de désaccord sur une marque, celle de la première liste est gardée :
 * c'est la reconnaissance, qui a regardé les pages de légende pour cela. Prendre
 * la plus récente ferait dépendre le sens de « S » de l'ordre des appels.
 *
 * La comparaison ignore la casse, comme `leSensDeLaMarque` : un tableau qui écrit
 * « f » là où la légende écrit « F » ne déclare pas une seconde marque.
 */
export function laLegendeComplete(premiere, seconde) {
  const retenues = laLegendeDuRapport(premiere);
  const deja = new Set(retenues.map((une) => une.marque.toLocaleUpperCase("fr-FR")));

  for (const une of laLegendeDuRapport(seconde)) {
    const haute = une.marque.toLocaleUpperCase("fr-FR");
    if (deja.has(haute)) continue;
    deja.add(haute);
    retenues.push(une);
  }

  return retenues;
}

/**
 * Ce que signifie une marque, selon **cette** légende.
 *
 * `null` quand la légende ne la déclare pas — et c'est l'information qui compte.
 * Deviner « S » comme « sans objet » parce qu'un autre bureau l'écrit ainsi
 * rendrait un avis faux avec l'aplomb d'un vrai (règle 5). La comparaison ignore
 * la casse et les espaces, parce qu'un tableau écrit « f » là où la légende écrit
 * « F » sans que cela veuille dire autre chose.
 */
export function leSensDeLaMarque(marque, legende) {
  const cherche = texte(marque).toLocaleUpperCase("fr-FR");
  if (!cherche) return null;

  const trouvee = laLegendeDuRapport(legende)
    .find((une) => une.marque.toLocaleUpperCase("fr-FR") === cherche);
  return trouvee ? trouvee.signification : null;
}

/**
 * Ce qu'on gèle d'une lecture de rapport.
 *
 * `null` quand il n'y a rien à geler : une lecture sans Markdown n'est pas une
 * lecture, et en garder la coquille ferait une ligne qu'on ouvre pour rien.
 *
 * @param {object} vue l'état de l'écran après la lecture
 */
export function lanalyseDunRapportAconserver(vue = null) {
  const lecture = vue?.lecture ?? null;
  if (!texte(lecture?.markdown)) return null;

  return {
    lecture: {
      nom: texte(lecture.nom),
      identite: {
        numero: texte(lecture?.identite?.numero),
        etabliLe: texte(lecture?.identite?.etabliLe)
      },
      /**
       * **La structure reconnue, gelée avec le reste.**
       *
       * C'est la première étape, et c'est elle qui a décidé de la forme du
       * Markdown. La relire plus tard avec une consigne qui a bougé rendrait une
       * autre structure, et l'on ne saurait plus laquelle a produit cette
       * transcription-là.
       */
      structure: lecture.structure ?? null,
      /** La légende telle qu'elle a été lue. Celle du voisin n'est pas celle-ci. */
      legende: laLegendeDuRapport(lecture.legende),
      /** Le Markdown transcrit, tel quel : c'est ce que l'écran redessine. */
      markdown: texte(lecture.markdown),
      pages: liste(lecture.pages),
      /** Les avis relevés, avec la marque que le document leur donne. */
      avis: liste(lecture.avis),
      mesure: lecture.mesure ?? null,
      lueSur: texte(lecture.lueSur),
      luPar: texte(lecture.luPar),
      /**
       * Ce que la reconnaissance de structure n'a pas pu faire, s'il y a lieu.
       *
       * Une transcription sans structure reconnue reste une transcription — elle
       * perd la cohérence entre pages, pas la lecture. Le taire ferait croire
       * que les deux étapes ont eu lieu (règle 5).
       */
      sansStructure: lecture.sansStructure === true
    },

    /** La version de ce qu'on gèle. Elle dira, un jour, comment relire d'anciennes lignes. */
    forme: 1
  };
}

/**
 * La ligne à écrire pour une lecture de rapport.
 *
 * `null` quand il manque de quoi la retrouver : sans projet, personne ne la
 * reverra.
 */
export function laLigneDunRapport(vue = null, {
  projectId = "", documentId = "", propositionId = ""
} = {}) {
  const lecture = vue?.lecture ?? null;
  if (!texte(projectId) || !texte(lecture?.markdown)) return null;

  return {
    project_id: texte(projectId),
    document: texte(lecture?.nom),
    // `null` et non `""` : la colonne est une clé étrangère, et une chaîne vide
    // n'est pas un identifiant absent — c'est un identifiant invalide.
    document_id: texte(documentId) || null,
    numero_de_rapport: texte(lecture?.identite?.numero),
    etabli_le: texte(lecture?.identite?.etabliLe),
    nature: texte(lecture?.structure?.nature),
    legende: laLegendeDuRapport(lecture?.legende),
    mesures: lecture.mesure ?? {},
    lu_par: texte(lecture?.luPar),
    analyse_gelee: lanalyseDunRapportAconserver(vue),
    proposition_id: texte(propositionId) || null
  };
}

/**
 * Ce qu'une lecture de rapport a valu.
 *
 * **`null` quand on n'a pas relevé**, et jamais zéro : « aucun avis relevé » et
 * « on n'a pas su relever » mènent à des gestes opposés, et `Number(null)` vaut
 * zéro — qui est fini (règle 5).
 */
export function lesMesuresDunRapport(lecture = null) {
  const avis = liste(lecture?.avis);
  const aReleve = Array.isArray(lecture?.avis);

  return {
    pages: liste(lecture?.pages).length,
    caracteres: texte(lecture?.markdown).length,
    /** Combien de marques la légende déclare. Zéro est une réponse : le rapport n'en a pas. */
    marques: laLegendeDuRapport(lecture?.legende).length,
    avis: aReleve ? avis.length : null,
    /** Ceux dont la marque se résout dans **cette** légende. */
    lisibles: aReleve
      ? avis.filter((un) => leSensDeLaMarque(un?.marque, lecture?.legende)).length
      : null,
    /**
     * Ceux dont la marque ne se résout pas. C'est le chiffre qui dit si la
     * légende a été bien lue : beaucoup d'avis illisibles sur un rapport qui
     * déclare six marques, c'est la légende qui est fausse, pas le document.
     */
    illisibles: aReleve
      ? avis.filter((un) => texte(un?.marque) && !leSensDeLaMarque(un?.marque, lecture?.legende)).length
      : null,
    /** Ceux qui ne portent aucune marque du tout : le document ne tranche pas. */
    sansMarque: aReleve ? avis.filter((un) => !texte(un?.marque)).length : null
  };
}

/** L'état d'écran d'une lecture conservée. `null` quand la ligne ne porte pas d'analyse. */
export function laVueDunRapport(ligne = null) {
  const analyse = ligne?.analyse_gelee ?? null;
  if (!analyse?.lecture) return null;

  return {
    phase: "lue",
    etape: "",
    conservee: {
      id: texte(ligne?.id),
      documentId: texte(ligne?.document_id),
      propositionId: texte(ligne?.proposition_id),
      lueLe: texte(ligne?.created_at)
    },
    lecture: analyse.lecture
  };
}

/** Les lectures de rapports, de la plus récente à la plus ancienne. */
export function lesLecturesDeRapportsEnOrdre(lignes = []) {
  return liste(lignes)
    .filter((une) => texte(une?.id))
    .slice()
    .sort((a, b) => texte(b?.created_at).localeCompare(texte(a?.created_at)));
}

/**
 * Le tableau des rapports déjà analysés : **une ligne par rapport**, la plus
 * récente lecture de chacun.
 *
 * ## Pourquoi par rapport et non par lecture
 *
 * Relire un rapport pour ajuster une consigne est la chose qu'on fait le plus
 * souvent ici. Un tableau par lecture montrerait huit fois le même rapport et
 * rien d'autre, et l'on perdrait de vue combien de rapports du chantier ont été
 * lus — qui est la question de l'accueil.
 *
 * Les lectures précédentes ne sont pas perdues : elles ont leur ligne en base, et
 * `combien` dit qu'il y en a. C'est le détail d'un rapport qui les montre.
 *
 * Le regroupement se fait sur le **nom du fichier**, et non sur le numéro de
 * rapport : un rapport dont la reconnaissance n'a pas trouvé le numéro n'est pas
 * le même document que tous les autres sans numéro.
 */
export function lesRapportsLus(lignes = []) {
  const parDocument = new Map();

  for (const ligne of lesLecturesDeRapportsEnOrdre(lignes)) {
    const cle = texte(ligne?.document) || texte(ligne?.id);
    const deja = parDocument.get(cle);

    if (!deja) {
      parDocument.set(cle, {
        id: texte(ligne?.id),
        document: texte(ligne?.document),
        documentId: texte(ligne?.document_id),
        numero: texte(ligne?.numero_de_rapport),
        etabliLe: texte(ligne?.etabli_le),
        nature: texte(ligne?.nature),
        marques: laLegendeDuRapport(ligne?.legende).length,
        mesures: ligne?.mesures ?? {},
        luPar: texte(ligne?.lu_par),
        propositionId: texte(ligne?.proposition_id),
        lueLe: texte(ligne?.created_at),
        combien: 1
      });
      continue;
    }

    // **Le nombre de lectures, et rien de plus.** Les lectures plus anciennes ne
    // remplacent aucun champ : la ligne du tableau est la plus récente, et c'est
    // la seule qui soit à jour.
    deja.combien += 1;
  }

  return [...parDocument.values()];
}

/** Ce que l'accueil dit du tableau, avant qu'on clique. */
export function phraseDesRapportsLus(lignes = []) {
  const rapports = lesRapportsLus(lignes);
  if (!rapports.length) {
    return "Aucun rapport n'a encore été lu sur ce chantier.";
  }

  const relus = rapports.filter((un) => un.combien > 1).length;
  const dit = `${rapports.length} rapport${rapports.length > 1 ? "s" : ""} lu${
    rapports.length > 1 ? "s" : ""}`;

  return relus
    ? `${dit}, dont ${relus} relu${relus > 1 ? "s" : ""} au moins une fois. `
      + "Le détail d'un rapport montre ses lectures précédentes."
    : `${dit}. Cliquer sur une ligne rouvre son analyse, telle qu'elle a été faite.`;
}
