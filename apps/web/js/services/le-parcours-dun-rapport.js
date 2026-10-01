/**
 * Les trois étapes de la lecture d'un rapport de contrôle, et où l'on en est.
 *
 * ## Pourquoi un module pour trois étapes
 *
 * Le compte rendu les a apprises à ses dépens : une transcription page par page
 * décide page par page, et le même tableau gagne dix colonnes à la page 1, huit
 * à la page 2. On tranche donc **une fois**, avant de transcrire.
 *
 * Un rapport de contrôle a le même défaut, et un de plus : il n'écrit pas ses
 * avis en toutes lettres. Il pose « F », « D », « SO » dans une colonne étroite
 * et n'explique qu'une fois, en page 2 ou en dernière page. **La légende est donc
 * reconnue avec la structure**, au même moment et pour la même raison : la
 * question n'a qu'une réponse par document, et la poser douze fois en donnerait
 * douze.
 *
 *     reconnaître la structure et la légende
 *       → transcrire en Markdown
 *         → relever les avis
 *
 * ## Ce que ce module fait, et ne fait pas
 *
 * Il nomme les étapes, dit laquelle est en cours, et ce qui reste. Il n'appelle
 * rien : les deux premiers appels vivent dans `structure-par-le-modele.js` et
 * `markdown-par-le-modele.js`, qui sont ceux du compte rendu — une seconde
 * version aurait lu un rapport autrement sans que rien ne le dise (règle 4).
 *
 * Il est pur, et c'est ce qui permet d'éprouver le parcours sans réseau.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** Les trois étapes, dans l'ordre où elles ont lieu. */
export const ETAPE = {
  /** Reconnaître la forme du document **et sa légende**. L'appel le moins cher. */
  STRUCTURE: "structure",
  /** Transcrire le document entier, sous la forme reconnue. */
  MARKDOWN: "markdown",
  /** Relever les avis dans le Markdown, et résoudre leurs marques. */
  AVIS: "avis"
};

/** L'ordre, écrit une fois : trois endroits qui le recopient finiraient par diverger. */
export const LES_ETAPES = [ETAPE.STRUCTURE, ETAPE.MARKDOWN, ETAPE.AVIS];

/**
 * Ce que chaque étape fait, en une phrase, et ce qu'elle coûte.
 *
 * Le coût n'est pas décoratif : il dit pourquoi la reconnaissance passe en
 * premier. Elle ne voit que six pages et ne rend qu'un squelette ; c'est l'appel
 * le moins cher des trois, et celui qui décide le plus.
 */
export const CE_QUE_FAIT_LETAPE = {
  [ETAPE.STRUCTURE]: {
    titre: "Reconnaître la structure et la légende",
    // **`ceQuelleFait`, et non `quoi`.** `quoi` nomme déjà l'étape elle-même dans
    // `lEtatDuParcours`, et la description y était répandue par-dessus : l'étape
    // « structure » s'appelait « Six pages au plus, et l'on en tire… », donc
    // `lEtapeQuiReste` rendait une phrase au lieu d'un nom. Un nom vit à un seul
    // endroit (règle 10), et le banc l'a dit avant le déploiement.
    ceQuelleFait: "Six pages au plus, et l'on en tire la nature du document, son "
      + "découpage, ses tableaux avec leurs colonnes — et la table des marques "
      + "qui rend les avis lisibles.",
    pourquoi: "Un rapport n'écrit pas « Avis favorable » : il écrit « F », et "
      + "n'explique qu'une fois. Sans cette table, deux cents avis sont "
      + "illisibles — et devinables de travers.",
    cout: "l'appel le moins cher des trois, et celui qui décide le plus"
  },
  [ETAPE.MARKDOWN]: {
    titre: "Transcrire en Markdown",
    ceQuelleFait: "Le document entier, sous la forme qui vient d'être reconnue. Les "
      + "marques restent telles quelles : la légende les accompagne, elle ne les "
      + "remplace pas.",
    pourquoi: "Remplacer « F » par « Avis favorable » réécrirait le document au "
      + "lieu de le transcrire, et une légende mal lue se propagerait à toutes "
      + "les lignes sans laisser de trace.",
    cout: "le plus cher : des dizaines de milliers de jetons en sortie"
  },
  [ETAPE.AVIS]: {
    titre: "Relever les avis",
    ceQuelleFait: "Chaque avis, avec sa référence, son intitulé et sa marque — puis la "
      + "marque résolue dans la légende de ce rapport-ci.",
    pourquoi: "C'est la matière qu'on vient chercher : 4 223 des 9 488 "
      + "affirmations de la mémoire sont des intitulés d'avis, et aucune ne dit "
      + "ce que le bureau en a pensé.",
    cout: "lu dans le Markdown déjà transcrit"
  }
};

/** Ce qu'une étape fait, ou `null` quand on ne la connaît pas (règle 5). */
export function ceQueFaitLetape(quoi) {
  return CE_QUE_FAIT_LETAPE[texte(quoi)] ?? null;
}

/**
 * L'état des trois étapes, d'après ce que la lecture porte déjà.
 *
 * ## Il se déduit, il ne se stocke pas
 *
 * Un drapeau par étape se désynchronise du contenu à la première interruption :
 * on garderait « transcrit » sur une lecture sans Markdown. L'état se lit donc de
 * ce qui est là — la structure est faite si l'on en a une, la transcription si
 * l'on a du Markdown.
 *
 * `enCours` nomme l'étape qu'on attend, et `null` quand tout est fait.
 */
export function lEtatDuParcours(lecture = null, { enCours = "" } = {}) {
  const demandee = texte(enCours);

  const faites = {
    [ETAPE.STRUCTURE]: Boolean(lecture?.structure) || lecture?.sansStructure === true,
    [ETAPE.MARKDOWN]: Boolean(texte(lecture?.markdown)),
    [ETAPE.AVIS]: Array.isArray(lecture?.avis)
  };

  return LES_ETAPES.map((quoi) => ({
    quoi,
    ...ceQueFaitLetape(quoi),
    faite: faites[quoi],
    /**
     * **Une étape sautée se dit.** La reconnaissance peut échouer sans rien
     * bloquer : la transcription se fait alors sans squelette, et l'on perd la
     * cohérence entre pages, pas la lecture. Le taire ferait croire que les deux
     * étapes ont eu lieu (règle 5).
     */
    sautee: quoi === ETAPE.STRUCTURE && lecture?.sansStructure === true,
    enCours: quoi === demandee && !faites[quoi]
  }));
}

/** L'étape qu'on attend, ou `null` quand les trois sont faites. */
export function lEtapeQuiReste(lecture = null) {
  const etat = lEtatDuParcours(lecture);
  return etat.find((une) => !une.faite)?.quoi ?? null;
}

/**
 * Ce que le parcours dit de lui-même.
 *
 * Il ne dit pas « 2/3 » : un compte ne dit pas ce qui manque, et c'est ce qui
 * manque qu'on veut savoir pour décider du geste suivant.
 */
export function phraseDuParcours(lecture = null) {
  const reste = lEtapeQuiReste(lecture);
  if (!reste) {
    const sansStructure = lecture?.sansStructure === true;
    return sansStructure
      ? "Lecture faite, mais la structure n'a pas été reconnue : la transcription "
        + "s'est faite sans squelette, et la légende n'a pas été lue. Les marques "
        + "des avis ne se résolvent donc pas."
      : "Les trois étapes sont faites : la structure et la légende reconnues, le "
        + "document transcrit, les avis relevés.";
  }

  const ce = ceQueFaitLetape(reste);
  return ce ? `Il reste à ${ce.titre.toLocaleLowerCase("fr-FR")}.` : "";
}

/**
 * Les marques que le relevé emploie et que la légende ne déclare pas.
 *
 * ## Pourquoi c'est l'indicateur qui compte
 *
 * Une marque qui ne se résout pas veut dire l'une de deux choses : la légende a
 * été mal lue, ou le document emploie une marque qu'il n'a pas déclarée. Les
 * deux appellent un geste, et les confondre avec « le document ne tranche pas »
 * ferait régler la mauvaise étape.
 *
 * Rendues dans l'ordre de leur première apparition, et sans doublon : ce qu'on
 * veut voir, c'est la liste des marques à ajouter à la légende.
 */
export function lesMarquesSansSens(lecture = null) {
  const declarees = new Set(
    liste(lecture?.legende)
      .map((une) => texte(une?.marque).toLocaleUpperCase("fr-FR"))
      .filter(Boolean)
  );

  const vues = [];
  for (const un of liste(lecture?.avis)) {
    const marque = texte(un?.marque);
    if (!marque) continue;
    const haute = marque.toLocaleUpperCase("fr-FR");
    if (declarees.has(haute) || vues.some((une) => une.haute === haute)) continue;
    vues.push({ marque, haute, combien: 0 });
  }

  // Le compte se fait après, pour que l'ordre reste celui de la première
  // apparition : compter en découvrant donnerait l'ordre du dernier avis vu.
  for (const un of liste(lecture?.avis)) {
    const haute = texte(un?.marque).toLocaleUpperCase("fr-FR");
    const trouvee = vues.find((une) => une.haute === haute);
    if (trouvee) trouvee.combien += 1;
  }

  return vues.map(({ marque, combien }) => ({ marque, combien }));
}

/** Ce que l'écran dit des marques qui ne se résolvent pas. */
export function phraseDesMarquesSansSens(lecture = null) {
  const sans = lesMarquesSansSens(lecture);
  if (!sans.length) {
    return liste(lecture?.legende).length
      ? "Toutes les marques employées sont déclarées dans la légende."
      : "Ce rapport ne déclare aucune légende : les avis sont pris tels qu'ils "
        + "sont écrits, sans être résolus.";
  }

  const dites = sans.map((une) => `« ${une.marque} » (${une.combien})`).join(", ");
  return `${sans.length} marque${sans.length > 1 ? "s" : ""} employée${
    sans.length > 1 ? "s" : ""} et non déclarée${sans.length > 1 ? "s" : ""} : ${dites}. `
    + "Soit la légende a été mal lue, soit le rapport emploie une marque qu'il "
    + "n'annonce pas — et les deux ne se corrigent pas au même endroit.";
}
