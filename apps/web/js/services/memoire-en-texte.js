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

/** La version de l'écriture. Elle change quand la façon d'écrire change. */
export const ECRITURE = "1.0";

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
  /** Ce qui ne se colore pas : les espaces, les séparateurs. */
  NEUTRE: "neutre"
};

/** Les mots de la langue du métier. Aucun n'est emprunté à un langage. */
export const MOTS = ["si", "alors", "sinon", "sauf si", "dans le cas où", "et", "ou"];

const texte = (valeur) => String(valeur ?? "").trim();
const jeton = (type, contenu) => ({ type, texte: contenu });

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
export function ligneDAffirmation({ sujet = "", valeur = "", source = "" } = {}) {
  const { nombre, unite } = couperLUnite(valeur);
  const jetons = [jeton(JETON.SUJET, texte(sujet))];

  if (nombre) {
    jetons.push(jeton(JETON.NEUTRE, "  "));
    jetons.push(jeton(JETON.VALEUR, nombre));
    if (unite) {
      jetons.push(jeton(JETON.NEUTRE, " "));
      jetons.push(jeton(JETON.UNITE, unite));
    }
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
    jeton(JETON.MOT, "si"),
    jeton(JETON.NEUTRE, " "),
    jeton(JETON.SUJET, texte(condition))
  ]);

  const branche = (mot, valeur) => {
    if (!texte(valeur)) return;
    const jetons = [
      jeton(JETON.NEUTRE, "   "),
      jeton(JETON.MOT, mot),
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
