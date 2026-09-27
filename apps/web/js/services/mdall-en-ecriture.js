/**
 * Colorer du Mdall **qu'on est en train d'écrire**.
 *
 * ## Pourquoi ce module existe, et pourquoi il ne pouvait pas être l'autre
 *
 * `jetonsDeLaLigne` colore le Mdall **de la mémoire** : il lit la ligne, la
 * comprend, et la **recompose** dans sa forme canonique. C'est exactement ce
 * qu'il faut pour relire le projet — la ligne qu'on montre est celle que le
 * projet tient pour vraie, quelle que soit la façon dont elle a été tapée.
 *
 * Sous une zone de saisie, c'est un défaut, et il est grave. La couche colorée
 * se pose **sous** le texte, au caractère près ; si elle ne peint pas les mêmes
 * caractères, le curseur et ce qu'on voit se désalignent, et l'écart grandit le
 * long de la ligne. Mesuré sur le peintre de la mémoire :
 *
 * | ce qu'on tape | ce qui se peignait |
 * | --- | --- |
 * | `si (A = "3")` | `si (A = 3)` — les guillemets disparaissent |
 * | `si (A = "3` (on tape) | `si (A = ""3"` — **des guillemets apparaissent** |
 * | `alors ("120 km/h");` | `alors (120 km/h);` |
 * | `importe (variable: X);` | `importe (variable: X, depuis: inconnu, zones: zones);` |
 * | `soit TVA = Prix HT * 0,2` | `soit TVA = "Prix HT * 0,2";` |
 * | `si (x = 1)` + espaces | l'espace final est mangé |
 *
 * C'est tout ce qui était rapporté comme un défaut de clavier : « on ne peut
 * pas se déplacer avec les flèches », « parfois des doubles guillemets
 * s'affichent », « il n'est pas possible d'écrire entre les guillemets », « les
 * retours à la ligne, pas toujours possibles ». Le clavier marchait : le curseur
 * allait où le texte est, et l'œil visait où la peinture était.
 *
 * ## La seule loi de ce module
 *
 * **Ce qui est peint est exactement ce qui est écrit.** La concaténation des
 * jetons rend la ligne, caractère pour caractère, y compris à moitié tapée, y
 * compris fausse, y compris vide. Rien n'est ajouté, rien n'est retiré, rien
 * n'est normalisé. Une épreuve le tient sur **tous les préfixes** d'un fichier
 * d'essai — c'est-à-dire sur chaque frappe d'une saisie du premier au dernier
 * caractère.
 *
 * ## Les couleurs restent celles de la mémoire
 *
 * Les types de jetons sont ceux de `JETON` : une ligne qu'on écrit et la même
 * ligne relue prennent les mêmes couleurs, et il n'y a pas une seconde palette
 * à recalibrer contre la première (règle 10). Le vocabulaire vient lui aussi des
 * listes partagées — `MOTS`, `VERBES`, `PROVENANCES`, `AGENTS` — plutôt que
 * d'une copie qui divergerait au premier mot ajouté au langage (règle 4).
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne comprend rien. Il ne dit pas si la ligne est juste — c'est la console
 * qui le dit, et elle lit le fichier pour de bon. Un colorateur qui refuserait
 * de peindre ce qu'il ne comprend pas laisserait la moitié d'une ligne en train
 * de naître sans couleur, ce qui est le moment où l'on en a le plus besoin.
 */

import {
  JETON, MOTS, VERBES, PROVENANCES, AGENTS, PHRASE_DE_LAGREGAT, POUR_CHAQUE, PORTEE_DUNE_FONCTION
} from "./memoire-en-texte.js";

/**
 * Les mots qui ouvrent une ligne, et ce qu'ils valent.
 *
 * **Ils ne comptent qu'en tête de ligne.** « le », « note », « zone », « si »
 * sont des mots français ordinaires : les colorer partout ferait clignoter la
 * moitié d'un nom de sujet — « Hauteur de la note de calcul » en porte deux.
 * En tête, ils ne peuvent être que des mots du langage.
 */
const EN_TETE = new Map([
  // Le repli vient **en premier** : une `Map` garde la dernière valeur d'une
  // clé répétée, donc les types nommés en dessous doivent la suivre pour la
  // remplacer. Écrit dans l'autre ordre, « fonction » prenait la couleur d'un
  // mot de condition.
  ...MOTS.map((mot) => [mot, JETON.MOT_CONDITION]),
  ["fonction", JETON.MOT_FONCTION],
  ["const", JETON.MOT_CONST],
  ["soit", JETON.MOT_SOIT],
  ["sauf si", JETON.MOT_EXCEPTION],
  ["si", JETON.MOT_CONDITION],
  ["alors", JETON.MOT_CONDITION],
  // « sinon si » avant « sinon », comme dans la langue : le peintre de la
  // saisie lit les mots du plus long au plus court, et « sinon » seul aurait
  // pris les deux premières lettres de la forme enchaînée.
  ["sinon si", JETON.MOT_CONDITION],
  ["sinon", JETON.MOT_CONDITION],
  ["parce que", JETON.MOT_RAISON],
  ["statut", JETON.MOT_STATUT],
  ["fichier", JETON.MOT_FICHIER],
  ["note", JETON.NOTE],
  ["le", JETON.MOT_DATE],
  ["zone", JETON.MOT_ZONE],
  ["écarté", JETON.MOT_ECARTE],
  [VERBES.IMPORTE, JETON.MOT_IMPORTE],
  [VERBES.ENREGISTRE, JETON.MOT_NATIF],
  [VERBES.DECISION, JETON.MOT_NATIF],
  [VERBES.CALCULE, JETON.MOT_NATIF],
  ...PROVENANCES.map((mot) => [mot, JETON.PROVENANCE])
].map(([mot, type]) => [String(mot).toLowerCase(), type]));

/**
 * Les mots qui valent partout : ceux qui **relient**.
 *
 * `et`, `ou`, `non` se lisent au milieu d'une condition comme d'une liste de
 * valeurs possibles ; les réserver à la tête de ligne les laisserait gris là
 * où ils font le sens.
 */
const PARTOUT = new Map([
  ["et", JETON.MOT_CONDITION],
  ["ou", JETON.MOT_CONDITION],
  ["non", JETON.MOT_CONDITION],
  ["native", JETON.MOT_FONCTION],
  [PORTEE_DUNE_FONCTION, JETON.PORTEE],
  ...AGENTS.map((agent) => [agent, JETON.MOT_NATIF])
].map(([mot, type]) => [String(mot).toLowerCase(), type]));

/** Les mots de plusieurs mots, cherchés avant les autres — « sauf si » d'abord. */
const COMPOSES = [...EN_TETE.keys(), ...PARTOUT.keys()]
  .filter((mot) => mot.includes(" "))
  .sort((un, autre) => autre.length - un.length);

/**
 * Les phrases des agrégats — `le plus grand de`, `la somme de`.
 *
 * **Elles ne se colorent qu'après le `=` d'un `calcule`.** « la somme de » est
 * une suite de mots français ordinaires : la colorer partout ferait clignoter
 * trois mots au milieu d'un nom de sujet, et le langage cesserait de se voir
 * là où il est. Derrière un `=`, elle ne peut être que ce qu'elle est.
 */
const AGREGATS = PHRASE_DE_LAGREGAT.map(([phrase]) => phrase)
  .sort((un, autre) => autre.length - un.length);

/** Le troisième mot d'une tête de boucle, et il en fait trois : c'est un mot. */
const PAR_PAS_DE = "par pas de";

/** Un blanc. Il compte : une indentation de trois espaces se voit. */
const BLANCS = /^[ \t]+/;
/** Une chaîne, **ouverte comprise** : on tape le premier guillemet avant l'autre. */
const CHAINE = /^"(?:[^"\\]|\\.)*"?/;
/** Un nombre, à la virgule comme au point : on écrit « 0,2 » en France. */
const NOMBRE = /^\d+(?:[.,]\d+)*/;
/** Un chemin de fichier du projet, cité dans un `importe` ou un `enregistre`. */
const CHEMIN = /^[\wÀ-ÖØ-öø-ÿ-]+\.(?:ref|ddb|ctr|md)\b/i;
/**
 * Un mot : lettres accentuées comprises, et le tiret **à l'intérieur** de
 * « agent-D ». Jamais en tête : `a - b` porte une soustraction, pas un mot qui
 * commencerait par un tiret — et elle se colorait en nom de sujet.
 */
const MOT = /^[\wÀ-ÖØ-öø-ÿ'’][\wÀ-ÖØ-öø-ÿ'’-]*/;
/** Les comparateurs et l'arithmétique, les plus longs d'abord. */
const OPERATEUR = /^(?:<=|>=|!=|[=<>≠≤≥+\-*/^%])/;
const PONCTUATION = /^[(),;:]/;
const ACCOLADE = /^[{}[\]]/;
/** Une unité, juste derrière un nombre : « m », « km/h », « m² », « € », « % ». */
const UNITE = /^(?:[A-Za-zÀ-ÖØ-öø-ÿ°µ]+(?:\/[A-Za-zÀ-ÖØ-öø-ÿ]+)?[²³]?|%|€)/;

/**
 * Les jetons d'une ligne **telle qu'elle est tapée**.
 *
 * @param {string} ligne une ligne, complète ou à moitié écrite
 * @returns {{type: string, texte: string}[]} des jetons dont la concaténation
 *   rend la ligne, caractère pour caractère.
 */
export function jetonsEcrits(ligne = "") {
  const tout = String(ligne ?? "");
  const jetons = [];
  const poser = (type, texte) => { if (texte) jetons.push({ type, texte }); };

  let reste = tout;
  // A-t-on déjà posé autre chose qu'un blanc ? C'est cela, « en tête de ligne ».
  let enTete = true;
  // Le dernier jeton qui n'est pas un blanc : il dit si un mot est une unité.
  let precedent = null;
  // Un `calcule` dont le `=` est passé : ce qui suit peut être un agrégat.
  let attendUneValeur = false;
  /**
   * Où l'on en est dans une tête de boucle : `""` hors d'une, `"nom"` tant
   * qu'on écrit le nom de la variable, `"bornes"` une fois le premier `de`
   * passé.
   *
   * **Sans cet état, la tête entière se peignait en noms de sujet** : `de`, `à`
   * et `par pas de` sont des mots du langage à cet endroit-là, et des mots
   * français ordinaires partout ailleurs. Le nom, lui, est une **locale** — il
   * ne vit que dans sa fonction, et le peindre comme un sujet du projet le
   * ferait souligner comme un renvoi sans déclaration.
   */
  let dansLaBoucle = "";

  const avancer = (type, texte) => {
    poser(type, texte);
    reste = reste.slice(texte.length);
    if (type !== JETON.NEUTRE) {
      const bas = String(texte).toLowerCase();
      if (enTete) {
        attendUneValeur = bas === VERBES.CALCULE;
        dansLaBoucle = bas === POUR_CHAQUE ? "nom" : "";
      } else if (dansLaBoucle === "nom" && bas === "de") {
        dansLaBoucle = "bornes";
      }
      enTete = false;
      precedent = { type, texte };
    }
  };

  while (reste) {
    const blanc = reste.match(BLANCS);
    if (blanc) { avancer(JETON.NEUTRE, blanc[0]); continue; }

    /**
     * **Un agrégat se peint d'un seul tenant**, et comme un verbe du langage :
     * c'en est un. Découpé en quatre mots, « le plus grand de » se serait peint
     * en quatre noms de sujet, et l'on aurait cru lire quatre renvois vers rien.
     */
    if (attendUneValeur && precedent?.texte === "=") {
      const agregat = AGREGATS.find((phrase) => reste.toLowerCase().startsWith(`${phrase} `));
      if (agregat) { avancer(JETON.MOT_NATIF, reste.slice(0, agregat.length)); continue; }
    }

    /**
     * **« par pas de » est un mot, et se peint d'un seul tenant.**
     *
     * Découpé en trois, ses deux espaces restaient neutres au milieu d'un mot
     * du langage — et le module qui **écrit** la même ligne, lui, le pose
     * entier. Les deux peintres se seraient tus sur ce désaccord, et la même
     * fonction aurait changé de couleur selon l'écran qui la montre (règle 10).
     */
    if (dansLaBoucle === "bornes" && reste.toLowerCase().startsWith(`${PAR_PAS_DE} `)) {
      avancer(JETON.MOT_CONDITION, reste.slice(0, PAR_PAS_DE.length));
      continue;
    }

    // Un commentaire prend la fin de la ligne, telle quelle : il n'y a rien à
    // interpréter derrière, et rien à colorer autrement.
    if (reste.startsWith("//")) { avancer(JETON.COMMENTAIRE, reste); continue; }

    const chaine = reste.match(CHAINE);
    if (chaine) { avancer(JETON.VALEUR, chaine[0]); continue; }

    const chemin = reste.match(CHEMIN);
    if (chemin) { avancer(JETON.CHEMIN, chemin[0]); continue; }

    const nombre = reste.match(NOMBRE);
    if (nombre) { avancer(JETON.VALEUR, nombre[0]); continue; }

    const compose = COMPOSES.find((mot) =>
      reste.toLowerCase().startsWith(mot) && !MOT.test(reste.slice(mot.length)));
    if (compose) {
      avancer(EN_TETE.get(compose) ?? PARTOUT.get(compose), reste.slice(0, compose.length));
      continue;
    }

    const mot = reste.match(MOT);
    if (mot) {
      avancer(
        typeDuMot(mot[0], { enTete, precedent, suivi: reste.slice(mot[0].length), dansLaBoucle }),
        mot[0]
      );
      continue;
    }

    const operateur = reste.match(OPERATEUR);
    if (operateur) { avancer(JETON.OPERATEUR, operateur[0]); continue; }

    const accolade = reste.match(ACCOLADE);
    if (accolade) { avancer(JETON.ACCOLADE, accolade[0]); continue; }

    const ponctuation = reste.match(PONCTUATION);
    if (ponctuation) { avancer(JETON.PONCTUATION, ponctuation[0]); continue; }

    // **Un caractère qu'on ne sait pas nommer se peint quand même.** Le refuser
    // laisserait un trou dans la couche, et le curseur cesserait de tomber en
    // face de ce qu'on voit — c'est-à-dire le défaut qu'on répare.
    avancer(JETON.NEUTRE, reste.slice(0, 1));
  }

  return jetons;
}

/** Les mots qui articulent une tête de boucle, et qui n'y sont pas des sujets. */
const ARTICULE_LA_BOUCLE = new Set(["de", "à", "a"]);

/** Ce qu'un mot vaut, à cet endroit de la ligne. */
function typeDuMot(mot, { enTete = false, precedent = null, suivi = "", dansLaBoucle = "" } = {}) {
  const bas = mot.toLowerCase();

  if (enTete && EN_TETE.has(bas)) return EN_TETE.get(bas);

  if (dansLaBoucle) {
    if (ARTICULE_LA_BOUCLE.has(bas)) return JETON.MOT_CONDITION;
    // Le nom de la variable est une locale : il ne vit que dans sa fonction.
    if (dansLaBoucle === "nom") return JETON.NOM_LOCAL;
  }

  // **Un mot collé à un deux-points est une étiquette**, et non un sujet :
  // `type:`, `unité:`, `variable:`, `depuis:`, `vers:`. Il passe avant les mots
  // qui valent partout, sans quoi l'étiquette `zones:` prendrait la couleur de
  // la portée qu'elle annonce — et l'on ne distinguerait plus la question de la
  // réponse.
  if (String(suivi).startsWith(":")) return JETON.LOCALE;

  if (PARTOUT.has(bas)) return PARTOUT.get(bas);

  // Une unité se reconnaît à sa place : elle suit un nombre. « 890 m » —
  // « m » n'est une unité que là, et « 3 ou 4 » n'en a pas.
  if (precedent?.type === JETON.VALEUR && NOMBRE.test(precedent.texte) && UNITE.test(mot)) {
    return JETON.UNITE;
  }

  return JETON.SUJET;
}

/**
 * Le Mdall d'une unité, avec son `/` : « km/h ».
 *
 * Le découpage en mots s'arrête sur le `/`, qui est un opérateur partout
 * ailleurs. Une unité composée se recolle donc ici, et seulement si elle suit
 * un nombre.
 */
export function uniteApresUnNombre(reste = "") {
  const trouve = String(reste ?? "").match(UNITE);
  return trouve ? trouve[0] : "";
}
