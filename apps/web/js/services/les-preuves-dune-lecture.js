/**
 * Les preuves d'une lecture : **ce qu'on a vérifié de ce document-ci.**
 *
 * ## La question posée, et pourquoi elle n'est pas celle de la console
 *
 * Trois questions de justesse, trois endroits
 * (`docs/montrer-le-raisonnement.md`, § 4). Celle-ci est la première :
 *
 * > **Ce document a-t-il été bien lu ?**
 *
 * Elle se pose à chaque lecture, par celui qui l'a lancée, et sur **ce**
 * document. La console, elle, répond à « le procédé tient-il, sur tout le
 * corpus » — un agrégat, et un autre lecteur.
 *
 * ## Quatre contrôles, et chacun avec son assiette
 *
 * Ils existaient, dispersés : les avis écartés dans l'encart d'identité, la
 * citation retrouvée dans le détail d'un compte rendu, la structure non
 * reconnue dans un encart d'accroc, les marques hors légende dans la section
 * Légende. Quatre endroits, et nulle part la liste de ce qui a été vérifié —
 * donc nulle part la liste de ce qui **ne** l'a pas été.
 *
 * Chacun porte « 31 sur 33 » et jamais « 94 % » seul : un taux sans son
 * assiette ne se lit pas, et c'est la même règle que partout ailleurs.
 *
 * ## Ce sont les invariants de la batterie, et c'est voulu
 *
 * Les deux premiers sont **exactement** ceux que
 * `les-invariants-dune-lecture.js` pose, et c'est ce module-ci
 * qui les tient maintenant : la batterie les lui demande. Deux écritures de
 * « cette citation figure-t-elle dans le document » auraient fini par ne plus
 * répondre la même chose, et l'écran aurait dit vert là où la mesure disait
 * rouge (règle 4) — sur l'indicateur que le produit met en avant.
 *
 * Les deux suivants n'y sont pas, et ne doivent pas y entrer : les ajouter
 * changerait l'assiette de la batterie et donc les bilans déjà déposés dans la
 * console, qui ne se corrigent pas (règle 6).
 *
 * ## Il ne parle à rien
 *
 * Des relevés et un document entrent, des comptes et des phrases sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/* ── La normalisation, et elle seule ──────────────────────────────────────── */

/**
 * Ce qu'on met de côté avant de chercher une citation dans un document.
 *
 * **Trois normalisations, nommées une par une.** Une liste qu'on allonge sans y
 * penser finit par rendre vraie n'importe quelle citation. Ni la casse, ni les
 * accents, ni la ponctuation : elles portent du sens.
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

/* ── Les quatre contrôles ─────────────────────────────────────────────────── */

export const CONTROLE = {
  CITATION: "citation_retrouvee",
  MARQUE: "marque_declaree",
  STRUCTURE: "structure_reconnue",
  DATE: "date_presente"
};

/**
 * Un contrôle, toujours de la même forme.
 *
 * `sansObjet` n'est **ni un succès ni un échec**, et c'est la distinction qui
 * décide de tout : une lecture dont aucun relevé ne porte de citation n'a pas
 * « 100 % de citations retrouvées », elle n'a aucune citation à retrouver. Les
 * confondre ferait monter le vert quand la lecture cesse de rendre quoi que ce
 * soit (règle 5).
 */
function unControle(quoi, { tenus = 0, sur = 0, manques = [], sansObjet = "", libelle = "",
  question = "", dit = "", pourquoi = "" } = {}) {
  return {
    quoi,
    libelle,
    question,
    tenus,
    sur,
    manques,
    sansObjet: texte(sansObjet),
    tient: !texte(sansObjet) && manques.length === 0,
    // `null` quand il n'y a rien à mesurer : « 0 % » se lirait « tout est faux ».
    pourcent: sur > 0 ? Math.round((tenus / sur) * 100) : null,
    // **Le couple, toujours.** « 94 % » seul cache que l'assiette est de 33.
    dit: texte(dit) || (sur > 0 ? `${tenus}/${sur}` : ""),
    pourquoi
  };
}

/**
 * Toute citation se retrouve dans le document d'où elle sort.
 *
 * **C'est le meilleur indicateur du produit**, et il ne coûte rien : une
 * citation qui ne figure pas dans le document est une phrase que personne n'a
 * écrite, présentée avec l'aplomb d'une phrase lue.
 *
 * @param {{cle: string, citation: string}[]} releves
 * @param {string} document le texte d'où la lecture est tirée
 */
export function lesCitationsSeRetrouvent(releves = [], document = "") {
  const dans = pourChercherUneCitation(document);
  const manques = [];
  let citees = 0;

  for (const un of liste(releves)) {
    const citation = pourChercherUneCitation(un?.citation);
    if (!citation) continue;
    citees += 1;
    if (!dans.includes(citation)) manques.push(texte(un?.cle));
  }

  return unControle(CONTROLE.CITATION, {
    tenus: citees - manques.length,
    sur: citees,
    manques,
    libelle: "Chaque citation figure dans le document",
    question: "La phrase citée a-t-elle vraiment été écrite là ?",
    // **Pas de citation n'est pas une faute**, c'est une couverture : l'exiger
    // de chacun ferait tomber le contrôle sur les lectures qui n'en rendent
    // aucune, et l'on cesserait de le regarder.
    sansObjet: citees === 0 && !texte(dans)
      ? "le document transcrit n'est pas là : on ne peut rien y chercher"
      : (citees === 0 ? "aucun relevé ne porte de citation" : ""),
    pourquoi: "Une citation absente du document est une phrase que personne n'a "
      + "écrite, présentée avec l'aplomb d'une phrase lue. C'est la faute la plus "
      + "grave qu'une lecture puisse commettre, et la moins visible."
  });
}

/**
 * Toute marque employée est déclarée dans la légende.
 *
 * Une marque qui ne se résout pas n'est pas forcément une faute du modèle :
 * c'est souvent un fait du document, et la lecture a raison de la rendre telle
 * quelle. Ce qui se mesure est **combien**.
 */
export function lesMarquesSontDeclarees(releves = [], legende = []) {
  const declarees = new Set(liste(legende).map((une) => texte(une?.marque ?? une)).filter(Boolean));

  if (!declarees.size) {
    return unControle(CONTROLE.MARQUE, {
      libelle: "Chaque marque employée est dans la légende",
      question: "« F », « S », « D » — le document dit-il ce qu'elles veulent dire ?",
      sansObjet: "aucune légende n'a été lue : la question ne se pose pas",
      pourquoi: "Un rapport n'écrit pas « avis favorable », il écrit « F ». Une "
        + "marque employée hors légende ne se résout pas, et ce qu'elle dit reste "
        + "inconnu."
    });
  }

  const manques = [];
  let employees = 0;
  for (const un of liste(releves)) {
    const marque = texte(un?.marque);
    if (!marque) continue;
    employees += 1;
    if (!declarees.has(marque)) manques.push(`${texte(un?.cle)} → « ${marque} »`);
  }

  return unControle(CONTROLE.MARQUE, {
    tenus: employees - manques.length,
    sur: employees,
    manques,
    libelle: "Chaque marque employée est dans la légende",
    question: "« F », « S », « D » — le document dit-il ce qu'elles veulent dire ?",
    sansObjet: employees === 0 ? "aucun relevé ne porte de marque" : "",
    pourquoi: "Un rapport n'écrit pas « avis favorable », il écrit « F ». Une "
      + "marque employée hors légende ne se résout pas, et ce qu'elle dit reste "
      + "inconnu."
  });
}

/**
 * La forme du document a été reconnue.
 *
 * **Un seul cas, et l'assiette est 1.** Ce n'est pas un taux : soit la lecture a
 * su dire de quel genre de document il s'agit, soit elle a buté — et dans ce
 * second cas tout ce qui suit est fait sur une forme supposée.
 */
export function laStructureEstReconnue({ sansStructure = false, nature = "" } = {}) {
  const reconnue = sansStructure !== true;

  return unControle(CONTROLE.STRUCTURE, {
    tenus: reconnue ? 1 : 0,
    sur: 1,
    manques: reconnue ? [] : ["la forme du document n'a pas été reconnue"],
    libelle: "La forme du document a été reconnue",
    question: "Sait-on de quel genre de document il s'agit ?",
    dit: reconnue ? (texte(nature) || "reconnue") : "non reconnue",
    pourquoi: "Tout le reste de la lecture se fait sur la forme reconnue. Si elle "
      + "a été supposée, ce qui en sort l'est aussi — et c'est la première chose "
      + "à regarder quand un relevé surprend."
  });
}

/**
 * Toute date relevée figure dans le document.
 *
 * **Le contrôle qui n'existait nulle part.** Une date est ce qui range un
 * constat dans le temps, donc ce sur quoi toute la prédiction repose : une date
 * inventée déplace un fait, et le déplacement ne se voit pas — la frise reste
 * plausible.
 *
 * On cherche la date **sous ses deux écritures usuelles** : celle du relevé, et
 * la forme française `jj/mm/aaaa`. Chercher la seule forme ISO ferait tomber le
 * contrôle sur tout document français, c'est-à-dire sur tous.
 */
export function lesDatesSontDansLeDocument(releves = [], document = "") {
  const dans = pourChercherUneCitation(document);
  const manques = [];
  let datees = 0;

  for (const un of liste(releves)) {
    const date = texte(un?.le);
    if (!date) continue;
    datees += 1;
    if (!lesEcrituresDeLaDate(date).some((forme) => dans.includes(forme))) {
      manques.push(`${texte(un?.cle)} → ${date}`);
    }
  }

  return unControle(CONTROLE.DATE, {
    tenus: datees - manques.length,
    sur: datees,
    manques,
    libelle: "Chaque date relevée figure dans le document",
    question: "Le document porte-t-il vraiment cette date ?",
    sansObjet: datees === 0
      ? "aucun relevé n'est daté — et c'est en soi une information"
      : "",
    pourquoi: "Une date range un constat dans le temps, et c'est là que toute la "
      + "prédiction commence. Une date inventée déplace un fait sans que rien ne "
      + "le montre : la chronologie reste plausible, et elle est fausse."
  });
}

/**
 * Les écritures d'une date qu'on accepte de trouver.
 *
 * `2026-04-18` se cherche aussi comme `18/04/2026` et `18/04/26`. Rien de plus :
 * une liste de formats qu'on allonge finit par trouver n'importe quelle date
 * dans n'importe quel document.
 */
export function lesEcrituresDeLaDate(date = "") {
  const dit = texte(date);
  const iso = dit.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!iso) return [dit];

  const [, annee, mois, jour] = iso;
  return [dit, `${jour}/${mois}/${annee}`, `${jour}/${mois}/${annee.slice(2)}`];
}

/* ── Les quatre, posés d'un coup ──────────────────────────────────────────── */

/**
 * Les quatre contrôles d'une lecture, **les quatre, toujours**.
 *
 * Un contrôle sans objet reste dans la liste, avec sa phrase. C'est la même
 * règle que celle des crans et celle des outils de la console : trois lignes
 * vertes quand il y en a quatre se lisent « tout va bien » (règle 12).
 *
 * @param {object} lecture `{avis|points, legende, markdown, sansStructure}`
 */
export function lesPreuvesDeLaLecture(lecture = null) {
  const releves = lesRelevesDeLaLecture(lecture);
  const document = texte(lecture?.markdown);

  return [
    laStructureEstReconnue({
      sansStructure: lecture?.sansStructure === true,
      nature: texte(lecture?.structure?.nature)
    }),
    lesCitationsSeRetrouvent(releves, document),
    lesMarquesSontDeclarees(releves, liste(lecture?.legende)),
    lesDatesSontDansLeDocument(releves, document)
  ];
}

/**
 * Les relevés d'une lecture, quelle que soit la famille du document.
 *
 * Un rapport relève des **avis**, un compte rendu des **points**. Les deux
 * portent une référence, une citation, une marque et parfois une date : c'est la
 * même forme, et les contrôles n'ont pas à savoir lequel ils regardent.
 */
export function lesRelevesDeLaLecture(lecture = null) {
  const bruts = liste(lecture?.avis).length ? liste(lecture?.avis) : liste(lecture?.points);

  return bruts.map((un) => ({
    cle: texte(un?.reference) || texte(un?.numero) || texte(un?.intitule) || texte(un?.sujet),
    citation: texte(un?.citation) || texte(un?.parceQue) || texte(un?.extrait),
    marque: texte(un?.marque),
    le: texte(un?.le) || texte(un?.date)
  }));
}

/**
 * Ce que les contrôles disent, **les manques d'abord.**
 *
 * Une phrase qui commence par ce qui tient se lit comme un succès, et l'on ne
 * retient pas la fin.
 */
export function ceQueLesPreuvesDeLaLectureDisent(controles = []) {
  const tous = liste(controles);
  const tombes = tous.filter((un) => !un.tient && !un.sansObjet);
  const sansObjet = tous.filter((un) => un.sansObjet);

  if (!tous.length) return "Aucun contrôle n'a pu être posé sur cette lecture.";

  const debut = tombes.length
    ? `${tombes.length} contrôle${tombes.length > 1 ? "s" : ""} sur ${tous.length} `
      + `ne ${tombes.length > 1 ? "tiennent" : "tient"} pas`
    : `${tous.length - sansObjet.length} contrôle`
      + `${tous.length - sansObjet.length > 1 ? "s" : ""} sur ${tous.length} tiennent`;

  const reste = sansObjet.length
    ? `. ${sansObjet.length} ne se pose${sansObjet.length > 1 ? "nt" : ""} pas sur ce `
      + "document : ce n'est ni un succès ni un échec."
    : ".";

  return `${debut}${reste}`;
}

/**
 * Ce que ces contrôles ne disent pas.
 *
 * Le premier est celui qui gêne, et c'est le même que partout : ils disent que
 * la lecture est **possible**, pas qu'elle est **juste**.
 */
export const CE_QUE_LES_CONTROLES_NE_DISENT_PAS = [
  {
    quoi: "Que la lecture soit juste",
    pourquoi: "ces quatre contrôles attrapent ce qui ne peut pas être juste — une "
      + "citation absente du document, une marque hors légende. Une lecture "
      + "parfaitement possible et parfaitement fausse les passe tous."
  },
  {
    quoi: "Ce que la lecture n'a pas relevé",
    pourquoi: "on vérifie ce qu'elle a rendu, et le document ne dit pas combien "
      + "de relevés il contenait. Un rapport dont la moitié des avis a été "
      + "manquée peut tenir les quatre contrôles."
  }
];
