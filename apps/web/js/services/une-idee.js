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
 * Les idées, rangées **par occurrence décroissante**.
 *
 * Le premier classement partait du nombre de chantiers, par la leçon des
 * sujets : un terme vu mille fois sur un seul chantier est le contenu de ce
 * chantier-là, pas du métier.
 *
 * Cette leçon tient toujours — mais elle est déjà tenue **ailleurs**, et mieux :
 * la base ne rend aucune idée vue sur moins de deux chantiers. Ce qui arrive
 * ici a donc déjà passé la porte. Entre deux idées qui l'ont passée, ce qu'on
 * veut lire est la plus fréquente, et c'est la seule chose qu'un classement par
 * chantiers ne montrait jamais : trois idées à deux chantiers se rangeaient par
 * ordre alphabétique.
 *
 * Un garde-fou posé à deux endroits n'est pas deux fois plus sûr : le second
 * déforme la lecture sans rien ajouter (règle 4).
 */
export function lesIdeesRangees(lignes = []) {
  return (Array.isArray(lignes) ? lignes : [])
    .map(uneIdee)
    .filter(Boolean)
    .sort((gauche, droite) => droite.affirmations - gauche.affirmations
      || droite.chantiers - gauche.chantiers
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

/**
 * Les idées rangées **par sorte de lien**.
 *
 * ## Pourquoi cette lecture manquait
 *
 * `LES_LIENS` dit depuis le début que les six sortes ne sont pas
 * interchangeables : « A entraîne B » dit que B arrive, « A afin de B » dit
 * seulement qu'on le vise. L'écran, lui, les alignait sans distinction.
 *
 * Mesuré sur le corpus entier : **quinze des vingt-cinq idées distinctes
 * viennent d'une liaison de but**, et deux seulement d'une cause. Une liste où
 * les deux se suivent fait croire à vingt-cinq faits, là où il y a dix faits et
 * quinze intentions — et faire passer une intention pour un fait est exactement
 * ce que la règle 12 interdit.
 *
 * Rendues dans l'ordre de `LES_LIENS`, les sortes absentes comprises : une
 * sorte à zéro est une information — elle dit que le corpus n'énonce pas cette
 * relation-là.
 */
export function lesIdeesParSorteDeLien(idees = []) {
  const lues = Array.isArray(idees) ? idees : [];

  const rangees = LES_LIENS.map((un) => {
    const siennes = lues.filter((une) => texte(une?.lien) === un.cle);
    return {
      cle: un.cle,
      libelle: un.libelle,
      explication: un.explication,
      idees: siennes.length,
      affirmations: siennes.reduce((somme, une) => somme + nombre(une?.affirmations), 0)
    };
  });

  // **Les sortes que cet écran ne connaît pas.** Une base en avance rendrait un
  // lien que `LES_LIENS` ignore ; le taire ferait un total qui ne tombe pas
  // juste, et l'on chercherait l'erreur ailleurs (règle 5).
  const inconnues = lues.filter((une) => !leLienDit(une?.lien));
  if (inconnues.length) {
    rangees.push({
      cle: null,
      libelle: "sorte inconnue",
      explication: "Ce lien vient d'une base en avance sur cet écran. Le ranger "
        + "sous une sorte connue afficherait un lien faux avec l'aplomb d'un juste.",
      idees: inconnues.length,
      affirmations: inconnues.reduce((somme, une) => somme + nombre(une?.affirmations), 0)
    });
  }

  return rangees;
}

/**
 * **La sorte qui ne fait pas une idée, mais une tâche.**
 *
 * `but` — « afin de », « pour permettre » — ne relie pas une chose à une chose :
 * il relie une **action** à son **but**. « Réaliser un carottage afin de drainer
 * la nappe » dit quoi faire et pourquoi ; ce n'est pas « A entraîne B ».
 *
 * Mesuré sur le corpus entier : quinze des vingt-six idées distinctes venaient
 * de là, et **aucune ne tenait comme idée** — leur membre de gauche est un verbe
 * à l'infinitif, parce que c'est une instruction.
 *
 * `permet` n'y est **pas**, et c'est délibéré. « Le garde-corps permet de
 * protéger la circulation » relie bien deux choses : c'est l'exemple de
 * référence de la doctrine, et le ranger parmi les tâches l'aurait perdu.
 */
export const LE_LIEN_DUNE_TACHE = "but";

/**
 * Les sortes de liens qui n'affirment qu'une intention.
 *
 * Plus large que la tâche : `permet` reste une idée, mais « possible » n'est pas
 * « fait », et l'écran doit pouvoir le dire.
 */
export const LES_LIENS_DINTENTION = [LE_LIEN_DUNE_TACHE, "permet"];

/** Ce qui fait une tâche plutôt qu'une idée. */
export function cestUneTache(idee) {
  return texte(idee?.lien) === LE_LIEN_DUNE_TACHE;
}

/**
 * Les idées d'un côté, les tâches de l'autre.
 *
 * **Elles ne se comptent pas ensemble, et c'est tout l'objet.** Une liste de
 * vingt-six lignes faisait croire à vingt-six faits, là où il y a onze idées et
 * quinze tâches. Faire passer une intention pour un fait est exactement ce que
 * la règle 12 interdit.
 *
 * Rien n'est jeté : une tâche justifiée est une information — « voici ce qu'il
 * faut faire, et voici pourquoi » est ce qu'un compte rendu de chantier écrit le
 * plus souvent. Elle n'est simplement pas une idée.
 */
export function lesIdeesEtLesTaches(idees = []) {
  const lues = Array.isArray(idees) ? idees : [];
  return {
    idees: lues.filter((une) => !cestUneTache(une)),
    taches: lues.filter(cestUneTache)
  };
}

/**
 * Ce qu'une tâche dit, en français.
 *
 * Pas « A vise B » : « faire A, pour B ». La forme compte — elle est la raison
 * pour laquelle ce n'est pas une idée, et l'écrire comme une idée reviendrait à
 * défaire la distinction qu'on vient de poser.
 */
export function laTacheDite(tache) {
  const quoi = texte(tache?.avant);
  const pourquoi = texte(tache?.apres);
  if (!quoi || !pourquoi) return "";
  return `${quoi} → pour ${pourquoi}`;
}

/** Ce que le partage des deux dit, en une phrase. */
export function phraseDesTaches(idees = []) {
  const { idees: vraies, taches } = lesIdeesEtLesTaches(idees);

  if (!taches.length) {
    return vraies.length
      ? `${vraies.length} idée${vraies.length > 1 ? "s" : ""}, et aucune tâche : `
        + "tout ce qui sort relie une chose à une chose."
      : "Ni idée, ni tâche.";
  }

  if (!vraies.length) {
    return `${taches.length} tâche${taches.length > 1 ? "s" : ""} et aucune idée. `
      + "Le corpus dit quoi faire et pourquoi ; il ne dit pas encore ce qui "
      + "entraîne quoi.";
  }

  return `${vraies.length} idée${vraies.length > 1 ? "s" : ""} et ${taches.length} `
    + `tâche${taches.length > 1 ? "s" : ""}. Une tâche relie une action à son but, `
    + "pas une chose à une chose : les compter ensemble ferait passer une "
    + "intention pour un fait.";
}

/**
 * Ce que la répartition des sortes dit, en une phrase.
 *
 * Elle ne dit pas « voici la répartition » : elle dit ce qu'il faut en
 * conclure. Un tableau de six nombres que personne ne sait lire ne vaut pas
 * mieux que pas de tableau.
 */
export function phraseDesSortesDeLiens(idees = []) {
  const lues = Array.isArray(idees) ? idees : [];
  if (!lues.length) return "Aucune idée : il n'y a pas de sorte à répartir.";

  const intentions = lues.filter(
    (une) => LES_LIENS_DINTENTION.includes(texte(une?.lien))).length;

  if (!intentions) {
    return `${lues.length} idée${lues.length > 1 ? "s" : ""}, et aucune n'est une `
      + "intention : toutes affirment quelque chose qui arrive, se conditionne ou "
      + "s'impose.";
  }

  if (intentions === lues.length) {
    return `Les ${lues.length} idées sont des intentions — « afin de », `
      + "« pour permettre ». Elles disent ce qu'on cherche, jamais ce qu'on "
      + "obtient : rien ici ne permet de prévoir.";
  }

  return `${intentions} des ${lues.length} idées sont des intentions — « afin de », `
    + `« pour permettre » —, et ${lues.length - intentions} affirment ce qui `
    + "arrive, se conditionne ou s'impose. Les aligner sans le dire ferait "
    + "passer une intention pour un fait.";
}
