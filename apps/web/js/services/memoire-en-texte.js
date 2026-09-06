/**
 * La mémoire du projet, écrite.
 *
 * ## Pourquoi un langage, alors qu'on avait dit non
 *
 * On avait écarté l'idée d'inventer une syntaxe **que les gens écriraient** :
 * cela demande une grammaire, un analyseur, des messages d'erreur, et le jour
 * où quelqu'un se trompe d'un mot, quelqu'un doit décider quoi lui répondre.
 * C'est un produit à part entière, et ce n'est pas celui-ci.
 *
 * Ce fichier fait l'inverse : une syntaxe **que Mdall écrit**. Le sens de la
 * flèche change tout.
 *
 * ```
 * mémoire  →  texte     le texte est une vue, régénérée à volonté      ← ici
 * texte    →  mémoire   les gens éditent, Mdall relit                  ← jamais
 * ```
 *
 * ## Ce que cela résout
 *
 * Une ligne de texte n'a pas d'identité — c'est ce qui rend illisible le diff
 * d'un PDF reformaté. Mais une ligne **engendrée depuis un repère** hérite de
 * son identité : elle est stable parce qu'elle est calculée, pas parce qu'on
 * espère qu'elle ne bougera pas.
 *
 * L'ancrage d'un commentaire ne repose donc jamais sur le numéro affiché. Le
 * numéro est un point où poser le doigt ; l'adresse, c'est le repère.
 *
 * ## L'identité de l'écriture
 *
 * On reprend les usages de l'informatique — une ligne, un fichier, une couleur
 * par nature de mot — sans copier aucun langage. Les marques viennent de
 * l'écrit technique et juridique, qui est la langue du métier :
 *
 * | marque | ce qu'elle dit | d'où elle vient |
 * | --- | --- | --- |
 * | `§` | le titre du fichier | le signe de section, celui des CCTP et des arrêtés |
 * | `¶` | une note sur le fichier lui-même | le pied-de-mouche du typographe |
 * | `←` | ce qui fonde la valeur | l'invention propre à Mdall |
 * | `si · alors · sinon` | une décision | l'arrêté, mot pour mot |
 * | `✓ retenu` / `✗ écarté` | la branche prise | la revue de projet |
 *
 * Rien de `const`, de `function` ni de `//` : ce sont des mots de programmeur,
 * et ils annonceraient un programme là où il n'y a qu'une transcription. La
 * flèche `←` est celle qui compte le plus — **chaque valeur pointe vers ce qui
 * la fonde, sur sa propre ligne**. Aucun langage ne fait cela, et c'est
 * exactement ce qu'une mémoire de chantier réclame.
 *
 * ## Ce qu'on n'aligne pas avec des espaces
 *
 * L'écriture ne remplit jamais une colonne de blancs pour aligner les valeurs.
 * Elle le pourrait — c'est joli en monospace —, et le jour où quelqu'un dépose
 * une affirmation au sujet plus long que les autres, **toutes** les lignes du
 * fichier changeraient d'un espace, et le diff annoncerait douze modifications
 * pour un ajout. L'alignement est donc affaire de mise en page, pas de texte.
 *
 * ## L'écriture porte sa version
 *
 * Le texte étant engendré, changer ce fichier change toutes les lignes de tous
 * les fichiers — et le prochain diff deviendrait du bruit. La version est donc
 * écrite dans l'en-tête : un changement de rendu s'annonce comme tel, « la
 * façon d'écrire a changé, pas ce qui est écrit ». Même doctrine que la pile de
 * lecture d'une analyse.
 *
 * ## Ce n'est pas un programme
 *
 * Un utilitaire dont la décision s'écrit en `si / alors` ressemblera à du code,
 * et quelqu'un finira par croire qu'en modifiant la ligne il change le calcul.
 * L'en-tête dit donc toujours **ce qui a produit le fichier** — quel
 * utilitaire, quelle version, quelle date. C'est une transcription d'une
 * décision, pas le moteur de la décision.
 */

/**
 * La version de l'écriture. Elle change quand la façon d'écrire change.
 *
 * v2.0 — une mémoire de projet ne garde pas que des valeurs. Elle garde des
 * décisions, des hypothèses, des raisonnements, des justifications, des
 * exceptions et des dépendances. L'écriture les dit maintenant.
 */
export const ECRITURE = "2.0";

/** Ce qu'un morceau de ligne est, pour qui le colore. */
export const JETON = {
  /** `§` — le titre d'un fichier. */
  SECTION: "section",
  /** `¶` — une note sur le fichier : ce qui l'a produit, comment il s'écrit. */
  NOTE: "note",
  /** Le sujet d'une affirmation : « altitude du site ». */
  SUJET: "sujet",
  /** Ce qu'elle vaut : « 490,03 ». */
  VALEUR: "valeur",
  /** Son unité, colorée à part : « m », « bars », « h ». */
  UNITE: "unite",
  /** `←` — la flèche de provenance. */
  DEPUIS: "depuis",
  /** Ce qui fonde la valeur : « NF EN 1991-1-3/NA, carte ». */
  SOURCE: "source",
  /** Un mot de la langue du métier : si, alors, sinon, sauf si. */
  MOT: "mot",
  /** `✓ retenu`, `✗ écarté` — la branche prise. */
  MARQUE: "marque",
  /** « sans objet » — le référentiel a conclu qu'il n'exige rien ici. */
  SANS_OBJET: "sans-objet",
  /** « en attente » — il manque une réponse pour conclure. */
  ATTENTE: "attente",
  /** `⇐` — la double flèche : cette valeur a été **calculée**. */
  DEDUIT: "deduit",
  /** Le calcul et ses entrées, derrière la double flèche. */
  CALCUL: "calcul",
  /** `@ escalier B` — la portée d'une affirmation. */
  PORTEE: "portee",
  /**
   * Ce qui n'est pas un fait.
   *
   * Une mémoire de projet ne garde pas que des valeurs relevées. Elle garde
   * **ce que quelqu'un a décidé** (« on retient 8 m »), **ce qu'on suppose en
   * attendant** (« on suppose 0,2 MPa »), et il faut que la ligne le dise :
   * lues pareil, une mesure et un choix se confondent, et l'on discute six mois
   * plus tard d'un chiffre qu'on croyait mesuré.
   */
  GESTE: "geste",
  /**
   * Les mots-clés du raisonnement, un type par construction.
   *
   * ## Pourquoi ils ne partagent pas le type `MOT`
   *
   * Un éditeur de code ne colore pas `if`, `throw` et `import` de la même
   * teinte : la couleur du mot dit de quelle **espèce** est la ligne, et c'est
   * ce qui permet de survoler un fichier sans le lire. Écrites toutes en rouge,
   * les quatre constructions du raisonnement se lisaient comme une seule prose,
   * et il fallait déchiffrer chaque ligne pour savoir laquelle justifiait,
   * laquelle limitait, laquelle liait.
   */
  MOT_CONDITION: "mot-condition",
  /** `parce que` — le mot qui introduit ce qui fonde. */
  MOT_RAISON: "mot-raison",
  /** `sauf si` — le mot qui introduit la limite. */
  MOT_EXCEPTION: "mot-exception",
  /** `dépend de` — le mot qui introduit les socles. */
  MOT_DEPENDANCE: "mot-dependance",
  /** `parce que …` — ce qui fonde le raisonnement, pas la valeur. */
  RAISON: "raison",
  /** `sauf si …` — le cas où la règle ne s'applique pas. */
  EXCEPTION: "exception",
  /** `dépend de …` — ce qui, en changeant, oblige à refaire. */
  DEPENDANCE: "dependance",
  /** Ce qui ne se colore pas : les espaces, les séparateurs. */
  NEUTRE: "neutre"
};

/** Les mots de la langue du métier. Aucun n'est emprunté à un langage. */
export const MOTS = ["si", "alors", "sinon", "sauf si", "parce que", "dépend de", "et", "ou"];

/**
 * Ce qu'une ligne est, quand ce n'est pas un simple relevé.
 *
 * Le geste précède le sujet, et se lit avant lui : « on retient 8 m » n'est pas
 * « 8 m ». Sans le geste, une décision de réunion et une mesure de géomètre
 * s'écrivent identiquement — et l'on rediscute six mois plus tard d'un chiffre
 * qu'on croyait mesuré.
 */
export const GESTE = {
  /** Un relevé, une lecture. Rien ne précède le sujet. */
  FAIT: "",
  /** Quelqu'un a tranché. « on retient » — et l'on sait qu'on peut en rediscuter. */
  DECISION: "on retient",
  /** On suppose, en attendant mieux. Ce qui en dépend devient suspect si ça change. */
  HYPOTHESE: "on suppose"
};

const texte = (valeur) => String(valeur ?? "").trim();
const jeton = (type, contenu) => ({ type, texte: contenu });

/**
 * Le pas d'indentation, et pourquoi c'en est un.
 *
 * ## L'indentation est la syntaxe
 *
 * Une ligne indentée **appartient** à la ligne pleine qui la précède. C'est la
 * seule chose qui disait à qui se rapportait un « dépend de Commune du projet »
 * flottant en tête de fichier : rien. On lisait quatre lignes de raisonnement
 * sans savoir ce qu'elles justifiaient.
 *
 * Le langage n'emprunte pas ses mots à l'informatique, mais il lui emprunte
 * cette convention-là — un bloc s'indente sous ce qu'il détaille — parce
 * qu'elle n'est pas informatique : c'est celle d'un alinéa, d'un sous-article,
 * d'une note sous un tableau.
 *
 * Trois espaces, jamais une tabulation : la largeur d'une tabulation dépend de
 * qui la lit, et une mémoire qui se lit différemment selon l'écran n'est pas
 * une mémoire.
 */
export const RETRAIT = "   ";

/**
 * Une valeur et son unité, séparées.
 *
 * « 490,03 m » se lit mieux quand le nombre et l'unité ne portent pas la même
 * couleur : l'œil saute d'une valeur à l'autre sans relire les unités. Ce qui
 * n'a pas d'unité — « 3e famille A », « A2 » — reste d'un bloc, parce qu'y
 * découper une syllabe finale inventerait une unité qui n'existe pas.
 */
export function couperLUnite(valeur) {
  const brut = texte(valeur);
  const trouve = brut.match(/^(-?[\d]+(?:[.,\s]\d+)*)\s+(.+)$/);
  if (!trouve) return { nombre: brut, unite: "" };
  return { nombre: trouve[1], unite: trouve[2] };
}

/**
 * Une affirmation, en une ligne.
 *
 * `sujet` puis `valeur`, et la provenance derrière la flèche quand on la
 * connaît. Une valeur sans provenance n'écrit pas de flèche vide : on ne
 * dessine pas une case pour dire qu'elle est vide (fondamentaux, règle 5 — ce
 * qui manque n'apparaît pas, plutôt que d'apparaître creux).
 */
export function ligneDAffirmation({
  sujet = "", valeur = "", source = "", zones = [], deduitDe = null, geste = GESTE.FAIT
} = {}) {
  const { nombre, unite } = couperLUnite(valeur);
  const jetons = [];

  // Le geste d'abord : c'est ce qui change la nature de la phrase, et on le lit
  // avant de lire le chiffre.
  if (texte(geste)) {
    jetons.push(jeton(JETON.GESTE, texte(geste)));
    jetons.push(jeton(JETON.NEUTRE, " "));
  }
  jetons.push(jeton(JETON.SUJET, texte(sujet)));

  // La portée fait partie de l'identité, donc de la ligne. Deux études sur deux
  // zones produisent deux affirmations différentes, et rien ne le disait :
  // l'écran annonçait quarante-huit lignes nouvelles là où vingt-cinq
  // portaient le même sujet sur une autre zone.
  const portees = (Array.isArray(zones) ? zones : [zones]).map(texte).filter(Boolean);
  if (portees.length) {
    jetons.push(jeton(JETON.NEUTRE, " "));
    jetons.push(jeton(JETON.PORTEE, `@ ${portees.join(" + ")}`));
  }

  if (nombre) {
    jetons.push(jeton(JETON.NEUTRE, "  "));
    jetons.push(jeton(JETON.VALEUR, nombre));
    if (unite) {
      jetons.push(jeton(JETON.NEUTRE, " "));
      jetons.push(jeton(JETON.UNITE, unite));
    }
  }

  // Deux flèches, deux choses différentes, et les confondre coûte cher :
  //
  //   ←  je l'ai **lu** ici       une valeur relevée, qui tient toute seule
  //   ⇐  je l'ai **calculé**      une valeur qui ne tient que tant que ses
  //                               entrées tiennent
  //
  // La seconde nomme le calcul et ce qui y est entré. C'est ce qui permet, le
  // jour où l'altitude change, de savoir sans chercher ce qu'il faut refaire.
  if (deduitDe && texte(deduitDe.calcul)) {
    const entrees = (deduitDe.entrees ?? [])
      .map((entree) => `${texte(entree?.sujet)} = ${texte(entree?.valeur)}`)
      .filter((phrase) => phrase !== " = ");

    jetons.push(jeton(JETON.NEUTRE, "  "));
    jetons.push(jeton(JETON.DEDUIT, "⇐"));
    jetons.push(jeton(JETON.NEUTRE, " "));
    jetons.push(jeton(JETON.CALCUL, `${texte(deduitDe.calcul)}${entrees.length ? `(${entrees.join(" ; ")})` : ""}`));
  }

  if (texte(source)) {
    jetons.push(jeton(JETON.NEUTRE, "  "));
    jetons.push(jeton(JETON.DEPUIS, "←"));
    jetons.push(jeton(JETON.NEUTRE, " "));
    jetons.push(jeton(JETON.SOURCE, texte(source)));
  }

  return jetons;
}

/**
 * Une exigence que le référentiel a écartée.
 *
 * « sans objet » n'est pas une valeur manquante : c'est une conclusion. Le
 * référentiel a examiné le cas et n'exige rien — et cela se lit, parce que
 * l'absence d'exigence est une information qu'on cherchera un jour.
 */
export function ligneSansObjet({ sujet = "", motif = "", source = "" } = {}) {
  const jetons = [
    jeton(JETON.SUJET, texte(sujet)),
    jeton(JETON.NEUTRE, "  "),
    jeton(JETON.SANS_OBJET, "sans objet")
  ];

  if (texte(motif)) {
    jetons.push(jeton(JETON.NEUTRE, "  "));
    jetons.push(jeton(JETON.SANS_OBJET, `— ${texte(motif)}`));
  }
  if (texte(source)) {
    jetons.push(jeton(JETON.NEUTRE, "  "), jeton(JETON.DEPUIS, "←"),
      jeton(JETON.NEUTRE, " "), jeton(JETON.SOURCE, texte(source)));
  }
  return jetons;
}

/**
 * Ce qui ne peut pas encore conclure, et ce qui manque pour cela.
 *
 * Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien (fondamentaux,
 * règle 5). Une exigence en attente s'écrit, avec le nom de ce qui la retient —
 * sans quoi elle disparaîtrait du fichier, et personne n'irait la chercher.
 */
export function ligneEnAttente({ sujet = "", manque = [] } = {}) {
  const attendus = (Array.isArray(manque) ? manque : [manque]).map(texte).filter(Boolean);
  const jetons = [
    jeton(JETON.SUJET, texte(sujet)),
    jeton(JETON.NEUTRE, "  "),
    jeton(JETON.ATTENTE, "en attente")
  ];

  if (attendus.length) {
    jetons.push(jeton(JETON.NEUTRE, "  "));
    jetons.push(jeton(JETON.ATTENTE, `— il manque ${attendus.join(", ")}`));
  }
  return jetons;
}

/**
 * Le nom du fichier d'une rubrique.
 *
 * Une arborescence qui s'arrête sur un dossier laisse le lecteur devant du vide :
 * on est habitué à trouver **quelque chose** au bout, et un contenu qui apparaît
 * sans porter de nom perturbe plus qu'il n'informe. La dernière marche du chemin
 * devient donc un fichier, et l'extension dit dans quelle écriture il est.
 *
 * Les accents partent, les espaces deviennent des tirets : c'est ce qu'on
 * attend d'un nom de fichier, et cela le rend citable dans une phrase.
 */
export function nomDeFichier(chemin = []) {
  const morceaux = (Array.isArray(chemin) ? chemin : []).map(texte).filter(Boolean);
  const dernier = morceaux[morceaux.length - 1] ?? "sans-rubrique";

  const base = dernier
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "sans-rubrique"}.mdall`;
}

/** Le chemin complet d'un fichier : les dossiers, puis son nom. */
export function cheminDeFichier(chemin = []) {
  const morceaux = (Array.isArray(chemin) ? chemin : []).map(texte).filter(Boolean);
  const dossiers = morceaux.slice(0, -1).map((morceau) =>
    morceau.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  return [...dossiers, nomDeFichier(chemin)].filter(Boolean).join("/");
}

/** Le titre d'un fichier : `§ Données de base · Structure`. */
export function ligneDeSection(chemin = []) {
  const morceaux = (Array.isArray(chemin) ? chemin : []).map(texte).filter(Boolean);
  return [
    jeton(JETON.SECTION, "§"),
    jeton(JETON.NEUTRE, " "),
    jeton(JETON.SECTION, morceaux.join(" · ") || "Sans rubrique")
  ];
}

/** Une note sur le fichier : `¶ écriture Mdall v1.0`. */
export function ligneDeNote(phrase = "") {
  return [jeton(JETON.NOTE, `¶ ${texte(phrase)}`)];
}

/**
 * L'en-tête d'un fichier.
 *
 * Le titre, puis ce qui l'a produit, puis comment il s'écrit. Les deux notes
 * comptent autant l'une que l'autre : la première dit qu'on lit une
 * transcription et non un programme ; la seconde permet de distinguer, six mois
 * plus tard, un changement de valeur d'un changement de façon d'écrire.
 */
export function enTeteDeFichier({ chemin = [], produitPar = "", le = "" } = {}) {
  const lignes = [ligneDeSection(chemin)];

  if (texte(produitPar)) {
    lignes.push(ligneDeNote(`établi par ${texte(produitPar)}${texte(le) ? `, le ${texte(le)}` : ""}`));
  }
  lignes.push(ligneDeNote(`écriture Mdall v${ECRITURE}`));

  return lignes;
}

/**
 * Un raisonnement, tel qu'on le relit.
 *
 * ## Ce qu'une mémoire garde en plus des valeurs
 *
 * Une valeur seule ne se conteste pas : on l'accepte ou on la refuse, sans
 * savoir sur quoi. Ce qui permet d'en discuter, six mois plus tard, ce sont les
 * quatre choses qui l'entourent :
 *
 * ```
 * si … alors … sinon …    le raisonnement — ce qui a été appliqué
 * parce que …             la justification — pourquoi cette règle
 * sauf si …               l'exception — quand elle ne s'applique pas
 * dépend de …             les dépendances — ce qui, en changeant, oblige à refaire
 * ```
 *
 * Les trois dernières manquaient, et leur absence coûtait cher : sans la
 * justification on rediscute la règle à chaque projet ; sans l'exception on la
 * découvre en réunion ; sans les dépendances on ne sait pas quoi recalculer
 * quand une entrée bouge.
 *
 * ## L'ordre, qui n'est pas décoratif
 *
 * Le raisonnement, puis sa raison, puis son exception, puis la valeur qui en
 * sort, puis ce dont elle dépend. On lit du général au particulier, et la
 * valeur arrive **après** ce qui la fonde — c'est l'inverse d'un tableur, et
 * c'est voulu.
 *
 * @param {object} bloc
 * @param {string} bloc.condition   « hauteur du dernier plancher > 8 m »
 * @param {string} bloc.alors       ce qui vaut si la condition tient
 * @param {string} bloc.sinon       ce qui vaut sinon
 * @param {string} bloc.retenu      la branche prise
 * @param {string} bloc.parceQue    ce qui fonde la règle
 * @param {string[]} bloc.saufSi    les cas où elle ne s'applique pas
 * @param {string[]} bloc.dependDe  ce qui, en changeant, oblige à refaire
 * @returns {object[][]} des lignes de jetons
 */
export function blocDeRaisonnement({
  condition = "", alors = "", sinon = "", retenu = "",
  parceQue = "", saufSi = [], dependDe = []
} = {}) {
  const lignes = lignesDeDecision({ condition, alors, sinon, retenu });

  if (texte(parceQue)) {
    lignes.push([
      jeton(JETON.NEUTRE, RETRAIT),
      jeton(JETON.MOT_RAISON, "parce que"),
      jeton(JETON.NEUTRE, " "),
      jeton(JETON.RAISON, texte(parceQue))
    ]);
  }

  for (const cas of (Array.isArray(saufSi) ? saufSi : [saufSi]).map(texte).filter(Boolean)) {
    lignes.push([
      jeton(JETON.NEUTRE, RETRAIT),
      jeton(JETON.MOT_EXCEPTION, "sauf si"),
      jeton(JETON.NEUTRE, " "),
      jeton(JETON.EXCEPTION, cas)
    ]);
  }

  const socles = (Array.isArray(dependDe) ? dependDe : [dependDe]).map(texte).filter(Boolean);
  if (socles.length) {
    lignes.push([
      jeton(JETON.NEUTRE, RETRAIT),
      jeton(JETON.MOT_DEPENDANCE, "dépend de"),
      jeton(JETON.NEUTRE, " "),
      // Les dépendances se lisent séparées d'un point médian, jamais d'une
      // virgule : un sujet peut en contenir une, et l'on ne saurait plus où
      // finit le premier socle.
      jeton(JETON.DEPENDANCE, socles.join(" · "))
    ]);
  }

  return lignes;
}

/**
 * Une décision, telle que l'arrêté l'écrit.
 *
 * `si … alors … sinon …`, et la branche prise marquée. Ce sont les mots du
 * texte réglementaire, pas ceux d'un langage : les emprunter à l'informatique
 * annoncerait un programme, et un programme, on croit qu'on peut le modifier.
 */
export function lignesDeDecision({ condition = "", alors = "", sinon = "", retenu = "" } = {}) {
  const lignes = [];
  if (!texte(condition)) return lignes;

  lignes.push([
    jeton(JETON.NEUTRE, RETRAIT),
    jeton(JETON.MOT_CONDITION, "si"),
    jeton(JETON.NEUTRE, " "),
    jeton(JETON.SUJET, texte(condition))
  ]);

  const branche = (mot, valeur) => {
    if (!texte(valeur)) return;
    const jetons = [
      jeton(JETON.NEUTRE, RETRAIT + RETRAIT),
      jeton(JETON.MOT_CONDITION, mot),
      jeton(JETON.NEUTRE, " "),
      jeton(JETON.VALEUR, texte(valeur))
    ];
    if (texte(retenu) && texte(retenu) === texte(valeur)) {
      jetons.push(jeton(JETON.NEUTRE, "  "));
      jetons.push(jeton(JETON.MARQUE, "✓ retenu"));
    }
    lignes.push(jetons);
  };

  branche("alors", alors);
  branche("sinon", sinon);
  return lignes;
}

/** Une ligne de jetons, remise à plat. C'est ce qui part dans un extrait. */
export function enClair(jetons = []) {
  return (Array.isArray(jetons) ? jetons : []).map((entree) => entree.texte).join("");
}

/**
 * De quelle nature est une ligne, lue depuis son texte.
 *
 * Sert au rendu d'un extrait cité dans une discussion : le message ne porte que
 * du texte, et c'est à sa première marque qu'on retrouve comment le colorer.
 * C'est le seul chemin qui relit l'écriture au lieu de l'écrire — et il ne lit
 * que la marque de tête, jamais le contenu.
 */
export function natureDeLaLigne(ligne = "") {
  // Les colonnes de numéros passent avant la marque : un extrait cité les
  // porte, et lire le tout premier caractère y trouvait un espace. La marque
  // est le premier caractère qui ne soit ni un blanc ni un chiffre.
  const marque = String(ligne ?? "").replace(/^[\s\d]+/, "")[0] ?? "";

  if (marque === "§") return "section";
  if (marque === "¶") return "note";
  if (marque === "-") return "retire";
  if (marque === "+") return "ajoute";
  return "contexte";
}
