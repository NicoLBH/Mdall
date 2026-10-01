/**
 * Une idée, et ce qui la distingue d'un terme.
 *
 * ## Le constat qui a rendu ce module nécessaire
 *
 * La console déroulait les sujets que les chantiers emploient : « plafonds »,
 * « dispositions », « passage », « portes ».
 *
 * > « Et alors ? Ça ne sert à rien, on n'est pas là pour refaire un lexique du
 * > vocabulaire de construction. Où sont les idées, les raisonnements, les
 * > fonctions ? Comment est-ce que ça s'enchaîne ? »
 *
 * Et alors rien, en effet. Un terme **nomme** une chose. Il ne dit pas ce
 * qu'elle fait, ni ce qu'elle entraîne, ni ce qu'elle interdit. Compter des
 * termes, c'est inventorier un chantier ; on ne décide sur rien.
 *
 * ## Ce qu'est une idée, ici
 *
 * **Une fonction.** Quelque chose entre, quelque chose en sort, et un lien
 * nommé dit de quelle façon :
 *
 *     sol argileux  ──entraîne──▶  plancher repris
 *     plan de calepinage  ──conditionne──▶  commande des menuiseries
 *
 * C'est la définition la plus pauvre qui tienne, et c'est voulu : elle se
 * vérifie. Une idée a deux côtés et un lien ; si l'un des trois manque, ce
 * n'est pas une idée, et le module le refuse plutôt que d'afficher une moitié
 * de phrase en prétendant qu'elle raisonne.
 *
 * Deux idées dont la sortie de l'une est l'entrée de l'autre composent — et
 * c'est ce qu'on appelle un raisonnement (`un-raisonnement.js`).
 *
 * ## Où les mots de liaison vivent, et pourquoi pas ici
 *
 * « donc », « car », « à condition que », « faute de » : la liste est dans la
 * base, avec le découpage qui s'en sert (`les_mots_de_liaison()`), comme les
 * mots-outils des sujets. La recopier ici en ferait une seconde liste à tenir,
 * et c'est toujours la seconde qu'on oublie de corriger (règle 4).
 *
 * Ce module garde ce que l'écran doit savoir : **les sortes de liens**, leur
 * nom en français, et ce que chacune affirme réellement. Une épreuve confronte
 * les deux : une sorte que la base sait produire et que celui-ci ignore
 * afficherait un lien vide à l'écran, sans que rien ne tombe.
 *
 * ## Ce que ce n'est pas
 *
 * Ce n'est **pas** un modèle, et cela ne doit pas en devenir un. Le découpage
 * se fait sur des mots de liaison écrits dans la phrase : cela ne dépend
 * d'aucune clé, d'aucun service, se vérifie ligne à ligne, et marche le jour
 * où on le déploie. Un modèle lirait mieux — il n'est là que pour rendre la vie
 * plus confortable, et l'on doit pouvoir s'en passer.
 *
 * ## Il est pur
 *
 * Des lignes de comptes entrent, des idées et des phrases sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => Number(valeur) || 0;

/**
 * Les sortes de liens, et ce que chacune affirme.
 *
 * Elles ne sont pas interchangeables, et c'est tout l'intérêt de les nommer :
 * « A entraîne B » dit que B arrive ; « A afin de B » dit seulement qu'on le
 * vise. Les confondre ferait passer une intention pour un fait (règle 12).
 */
export const LES_LIENS = [
  {
    cle: "cause",
    libelle: "entraîne",
    fleche: "entraîne",
    explication: "Ce qui est à gauche fait arriver ce qui est à droite. "
      + "C'est le lien le plus fort, et le seul qui autorise à prévoir."
  },
  {
    cle: "condition",
    libelle: "conditionne",
    fleche: "conditionne",
    explication: "Ce qui est à droite ne vaut que si ce qui est à gauche est "
      + "tenu. Rien n'est affirmé du reste du temps."
  },
  {
    cle: "obligation",
    libelle: "impose",
    fleche: "impose",
    explication: "Ce qui est à gauche rend ce qui est à droite obligatoire. "
      + "C'est une contrainte, pas une conséquence : elle se décide, elle "
      + "n'arrive pas toute seule."
  },
  {
    cle: "permet",
    libelle: "permet",
    fleche: "permet",
    explication: "Ce qui est à gauche rend ce qui est à droite possible — et "
      + "rien de plus. Possible n'est pas fait."
  },
  {
    cle: "but",
    libelle: "vise",
    fleche: "vise",
    explication: "Ce qui est à droite est le but de ce qui est à gauche. "
      + "C'est une intention : elle dit ce qu'on cherche, jamais ce qu'on obtient."
  },
  {
    cle: "empechement",
    libelle: "empêche",
    fleche: "empêche",
    explication: "Ce qui est à gauche interdit ce qui est à droite. "
      + "C'est la seule sorte qui retire une possibilité au lieu d'en ajouter une."
  }
];

/** Les clés des sortes de liens, pour confronter ce que la base sait produire. */
export const LES_SORTES_DE_LIENS = LES_LIENS.map((un) => un.cle);

/**
 * Ce qu'une sorte de lien affirme — et `null` quand on ne la connaît pas.
 *
 * **`null`, et non le premier de la liste.** Une sorte inconnue viendrait d'une
 * base en avance sur cet écran ; la ranger sous « entraîne » afficherait un
 * lien faux avec l'aplomb d'un lien juste (règle 5). L'écran, lui, sait dire
 * qu'il ne sait pas.
 */
export function leLienDit(cle) {
  const demande = texte(cle);
  return LES_LIENS.find((un) => un.cle === demande) ?? null;
}

/**
 * Les deux côtés d'une idée, ramenés à ce qui permet de les comparer.
 *
 * Même règle des deux côtés : c'est par là que la sortie de l'une se reconnaît
 * dans l'entrée de l'autre, et deux normalisations différentes ne
 * s'enchaîneraient jamais (règle 4).
 */
export function leCote(valeur) {
  return texte(valeur).toLowerCase().replace(/\s+/g, " ");
}

/**
 * Vrai si cette ligne énonce bien une idée.
 *
 * Trois refus, et chacun a coûté un affichage qui avait l'air d'un résultat :
 *
 *   · **un côté vide** — « entraîne plancher repris » ne raisonne sur rien ;
 *   · **une sorte de lien inconnue** — l'écran écrirait une flèche sans verbe ;
 *   · **les deux côtés identiques** — « nappe entraîne nappe » est vrai, et
 *     c'est précisément ce qui le rend inutile. C'est la même tautologie que la
 *     prédiction écarte sous le nom de banal.
 */
export function cestUneIdee(idee) {
  const avant = leCote(idee?.avant);
  const apres = leCote(idee?.apres);
  if (!avant || !apres) return false;
  if (!leLienDit(idee?.lien)) return false;
  return avant !== apres;
}

/**
 * Une idée, telle qu'on la garde — ou `null` si ce n'en est pas une.
 *
 * Les comptes voyagent avec elle plutôt que de se recalculer à l'écran : c'est
 * la base qui les a mesurés, sur tout le corpus, et un second comptage par-
 * dessus finirait par ne pas dire la même chose (règle 4).
 */
export function uneIdee(ligne) {
  const idee = {
    avant: texte(ligne?.avant),
    lien: texte(ligne?.lien),
    apres: texte(ligne?.apres),
    affirmations: nombre(ligne?.affirmations),
    chantiers: nombre(ligne?.chantiers)
  };
  return cestUneIdee(idee) ? idee : null;
}

/**
 * Les idées, rangées.
 *
 * **Par nombre de chantiers d'abord.** Une idée vue sur quatre chantiers est du
 * métier ; la même vue mille fois sur un seul est le contenu de ce chantier-là.
 * C'est la leçon des sujets, où le classement par fréquence remontait les mots
 * qu'on trouve partout parce qu'on les trouve partout.
 */
export function lesIdeesRangees(lignes = []) {
  return (Array.isArray(lignes) ? lignes : [])
    .map(uneIdee)
    .filter(Boolean)
    .sort((gauche, droite) => droite.chantiers - gauche.chantiers
      || droite.affirmations - gauche.affirmations
      || gauche.avant.localeCompare(droite.avant, "fr")
      || gauche.apres.localeCompare(droite.apres, "fr"));
}

/**
 * L'idée écrite comme une fonction : ce qui entre, ce qui sort.
 *
 * `""` quand ce n'en est pas une — à l'appelant de ne rien dessiner plutôt que
 * de dessiner une flèche entre deux riens.
 */
export function laFonctionDite(idee) {
  if (!cestUneIdee(idee)) return "";
  return `${texte(idee.avant)} → ${texte(idee.apres)}`;
}

/** L'idée dite en français, avec le verbe de son lien. */
export function phraseDuneIdee(idee) {
  const lien = cestUneIdee(idee) ? leLienDit(idee.lien) : null;
  if (!lien) return "";
  return `${texte(idee.avant)} ${lien.fleche} ${texte(idee.apres)}`;
}

/**
 * Ce que les idées relevées valent, en une phrase — et ce qu'on n'a pas vu.
 *
 * **Deux refus de se taire.** Une liste vide peut vouloir dire deux choses
 * opposées : le corpus n'énonce aucun lien, ou il en énonce et aucun n'est
 * partagé par deux chantiers. La première est un constat sur la matière, la
 * seconde sur le seuil — et elles ne mènent pas aux mêmes décisions (règle 5).
 *
 * @param {object[]} idees ce que `lesIdeesRangees` a rendu
 * @param {object|null} mesure ce que `la_mesure_des_idees()` a rendu
 */
export function phraseDeCeQueLesIdeesValent(idees = [], mesure = null) {
  const combien = Array.isArray(idees) ? idees.length : 0;
  const affirmations = nombre(mesure?.affirmations);
  const liantes = nombre(mesure?.liantes);

  if (!mesure) {
    return combien
      ? `${combien} idée${combien > 1 ? "s" : ""} relevée${combien > 1 ? "s" : ""}. `
        + "Sur quelle part du corpus, on ne le sait pas : la mesure n'a pas été lue."
      : "Aucune idée relevée, et la mesure n'a pas été lue : on ne sait pas si "
        + "le corpus n'en énonce aucune ou si rien n'a pu être compté.";
  }

  const part = affirmations
    ? Math.round((liantes / affirmations) * 100)
    : 0;

  const dit = `${part} % des affirmations énoncent un lien `
    + `(${liantes.toLocaleString("fr-FR")} sur ${affirmations.toLocaleString("fr-FR")}).`;

  if (combien) return `${dit} ${combien} idée${combien > 1 ? "s" : ""} en ressort${
    combien > 1 ? "ent" : ""}, partagée${combien > 1 ? "s" : ""} par au moins deux chantiers.`;

  return liantes
    ? `${dit} Aucune n'est encore partagée par deux chantiers : il y a des liens, `
      + "pas encore de quoi les comparer."
    : `${dit} Le corpus nomme des choses ; il ne dit pas encore ce qu'elles se font.`;
}
