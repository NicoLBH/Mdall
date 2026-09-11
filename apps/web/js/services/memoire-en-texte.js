/**
 * La mémoire du projet, écrite — et relue.
 *
 * ## Le sens de la flèche a changé
 *
 * Ce fichier écrivait, et rien d'autre : `mémoire → texte`, jamais l'inverse.
 * C'était prudent et c'est devenu faux. Un architecte doit pouvoir écrire une
 * ligne à la main et l'injecter ; un utilitaire de l'Atelier ne fait finalement
 * rien d'autre qu'écrire du mdall. Les deux sens comptent :
 *
 * ```
 * mémoire  →  texte     ici, dans ce fichier
 * texte    →  mémoire   dans `memoire-en-lecture.js`
 * ```
 *
 * Et une seule loi les relie, vérifiée par un test : **lire(écrire(G)) = G**.
 * Chaque information du graphe apparaît une fois dans le texte, et rien de
 * déductible n'y apparaît. C'est cette réciprocité qui fait du texte la
 * mémoire, et non une vue de la mémoire.
 *
 * ## Les cinq objets, et pourquoi ils ne se mélangent plus
 *
 * La v2 écrivait tout sur un bloc unique, et mélangeait :
 *
 * | l'objet | ce qu'il est | où il vit maintenant |
 * | --- | --- | --- |
 * | la donnée | « Hauteur du plancher bas… » | le sujet, en tête de ligne |
 * | la valeur | « 26 m » | après le `=` |
 * | la règle | `si … alors …` | un fichier de référentiel, réutilisable |
 * | la preuve | l'article, puis sa citation | `←` puis `parce que` |
 * | le statut | « retenu », « supposé » | `statut`, sur sa ligne |
 *
 * La conséquence la plus lourde : **la règle quitte le fichier de projet**. Une
 * règle vaut pour mille projets, une valeur pour un seul. Les garder ensemble
 * produisait des « règles » du genre `si hauteur = 26`, vraies d'un bâtiment et
 * d'aucun autre, qui ne capitalisaient rien et faisaient mentir le diff dans
 * les deux sens.
 *
 * ## Ce qui a disparu, et pourquoi
 *
 * - **`dépend de`** — la dépendance se déduit des conditions de la règle.
 *   L'écrire une seconde fois, c'est la laisser diverger le jour où quelqu'un
 *   modifie la règle sans y penser (fondamentaux, règle 4).
 * - **`✓ retenu` sur la ligne `alors`** — mélangeait la conséquence de la règle
 *   et l'état du raisonnement dans **ce** projet. Le second est `statut`.
 * - **`⇐ calcul(…)`** — un calcul est une provenance comme une autre :
 *   `← calcul`.
 * - **`on retient` / `on suppose`** — un geste n'est pas un préfixe, c'est une
 *   provenance : `← décision`, `← hypothèse`.
 *
 * ## L'identité de l'écriture, et pourquoi elle a bougé
 *
 * Ce fichier a longtemps refusé les marques de programmeur : rien de `const`,
 * de `function` ni de `//`, au motif qu'elles annonceraient un programme là où
 * il n'y a qu'un raisonnement transcrit.
 *
 * Cela tenait tant que la mémoire ne faisait que **se lire**. Un `.ref` ne se
 * lit pas : il s'**exécute**. Ses conditions se composent, sa conclusion se
 * pose, et le jour où on l'écrira à la main il faudra savoir, sans ambiguïté,
 * où une clause commence et où une instruction finit. Trois conditions
 * enchaînées sans parenthèses ne se relisent déjà pas ; elles ne se parseraient
 * pas du tout.
 *
 * Les fichiers de règles portent donc, **et eux seuls**, la ponctuation qui les
 * rend exécutables : `fonction`, les parenthèses de chaque clause, le
 * point-virgule qui termine ce que la règle pose. Ce ne sont pas des mots de
 * programmeur empruntés pour faire sérieux : ce sont les bornes sans lesquelles
 * un raisonnement composé ne se relit pas.
 *
 * Les autres fichiers ne bougent pas. Un `.ctr` énonce des paires, un `.ddb`
 * déclare : ni l'un ni l'autre n'a de clause à borner, et leur mettre des
 * parenthèses ne dirait rien de plus.
 *
 * ## Tout se tape au clavier
 *
 * `§`, `¶`, `←`, `≤`, `≥`, `≠` étaient jolis et intapables. Un langage qu'un
 * architecte doit pouvoir écrire à la main ne peut pas exiger une table de
 * caractères : chaque marque est remplacée par un **mot suivi de deux points**,
 * qui dit en plus ce qu'elle voulait dire.
 *
 * | ligne | ce qu'elle dit |
 * | --- | --- |
 * | `fichier:` | le chemin du fichier |
 * | `note:` | une note sur le fichier lui-même |
 * | `=` | ce que la donnée vaut |
 * | `texte: · document: · calcul: · règle: · décision: · hypothèse:` | d'où cela vient |
 * | `si · et · ou · non · alors · sinon · sauf si` | la règle, dans les mots de l'arrêté |
 * | `parce que:` | la preuve, citée entre guillemets |
 * | `statut:` | l'état du raisonnement dans ce projet |
 * | `le:` | la date d'un constat |
 *
 * La provenance n'a plus de flèche **ni** de type derrière : le mot-clé **est**
 * le type. Une ligne de moins à comprendre, et une de moins à écrire.
 *
 * ## Une règle se lit comme une fonction
 *
 * ```
 * fonction Classement du bâtiment(Habitation individuelle ou collective, Nombre d'étages) {
 *    si (Habitation individuelle ou collective = "collective")
 *    et (Nombre d'étages <= 3)
 *    alors ("2e famille");
 * }
 * ```
 *
 * La parenthèse nomme les **entrées**, et c'est ce qui manquait le plus : on
 * voit d'un coup d'œil de quoi la règle a besoin, sans lire ses conditions. Ce
 * n'est pas une concession à l'informatique — un article d'arrêté commence lui
 * aussi par dire de quoi il parle.
 *
 * Elle ne se stocke pas : les entrées **sont** les sujets des conditions. Une
 * signature recopiée diverge le jour où quelqu'un ajoute une condition.
 *
 * ## La portée est le dossier, plus une marque sur la ligne
 *
 * `@ escalier B` a disparu. Les fichiers se rangent par zone — `escalier-b/
 * incendie.ctr` — et une marque de portée en plus dirait deux fois la même
 * chose. Une affirmation qui vaut pour deux zones apparaît dans les deux
 * fichiers : c'est la même, vue de deux endroits.
 *
 * ## Trois lois de lecture
 *
 * 1. **L'indentation est l'appartenance.** Une ligne indentée détaille la ligne
 *    pleine qui la précède. Trois espaces, jamais une tabulation : sa largeur
 *    dépend de qui la lit, et une mémoire qui se lit différemment selon l'écran
 *    n'est pas une mémoire.
 * 2. **Un mot-clé ne compte qu'en tête de ligne**, après le retrait. « Habitation
 *    individuelle **ou** collective » est un sujet, pas une disjonction.
 * 3. **Une valeur textuelle porte des guillemets, une valeur mesurée n'en porte
 *    pas.** `= "3e famille B"` contre `= 26 m`. La lecture accepte les deux
 *    formes de guillemets, droits et français : personne ne doit être refusé
 *    pour une raison typographique.
 *
 * ## Ce qu'on n'aligne pas avec des espaces
 *
 * L'écriture ne remplit jamais une colonne de blancs pour aligner les valeurs.
 * Le jour où quelqu'un dépose une affirmation au sujet plus long que les
 * autres, **toutes** les lignes du fichier changeraient d'un espace, et le diff
 * annoncerait douze modifications pour un ajout.
 *
 * ## L'écriture porte sa version
 *
 * Le texte étant engendré, changer ce fichier change toutes les lignes de tous
 * les fichiers. La version est donc écrite dans l'en-tête : un changement de
 * rendu s'annonce comme tel, « la façon d'écrire a changé, pas ce qui est
 * écrit ».
 */

import { valeursDeclarees } from "./tableau-structure.js";

/**
 * La version de l'écriture. Elle change quand la façon d'écrire change.
 *
 * v4.0 — tout se tape au clavier : les marques `§`, `¶`, `←`, `≤` deviennent
 * des mots suivis de deux points. Une règle porte sa signature. Chaque nature
 * a sa forme et son extension, et la portée est le dossier.
 *
 * v4.1 — un `.ref` s'écrit comme il s'exécute : `fonction` ouvre la règle, ses
 * entrées sont ses paramètres, chaque clause porte ses parenthèses et ce qu'elle
 * pose se termine par un point-virgule. Les autres fichiers ne changent pas.
 *
 * v4.2 — ce qui fonde une règle se déclare en tête, comme les `const` d'une
 * fonction : `soit texte = …`, `soit parce que = …`. Les commentaires `//` et
 * `/* … *\/` entrent dans le langage, et `const` définit un nom du projet.
 *
 * v4.3 — une fonction est **auto-portée** : un commentaire dit à quoi elle sert,
 * `importe` d'où viennent ses entrées, `enregistre` où va son résultat, et la
 * portée est son premier paramètre. Une déclaration de variable porte ce qu'elle
 * désigne, ce à quoi elle sert et où elle sert déjà.
 *
 * v4.4 — le commentaire passe **dans** la fonction, pour qu'elle se copie
 * entière d'un projet à l'autre ; `importe` porte la zone de ce qu'il emprunte ;
 * et une variable s'écrit une fois, avec ses valeurs par zone en tableau —
 * `Sujet = [ Bâtiment A: …, Bâtiment B: … ];`.
 *
 * v4.5 — `fonction native` : une fonction dont la loi ne s'écrit pas. Son corps
 * tient en une ligne, `résultat = calcul natif (…)`, et tout le reste — ce
 * qu'elle importe, ce qu'elle enregistre — s'écrit comme pour n'importe quelle
 * fonction. Un `enregistre` peut porter plusieurs sujets, parce qu'un calcul
 * qui rend un tableau ne rend pas une valeur.
 *
 * v4.7 — **une fonction s'écrit toujours en entier ; un agent s'appelle.** La
 * v4.5 avait fait un amalgame : `fonction native NOM(…)` laissait croire que
 * la fonction était opaque, alors que seul l'appel l'est. Le mot `native`
 * disparaît de la tête, et le corps porte `agent-D (…)` — ou `agent-IA (…)`
 * quand ce qui répond est un modèle, dont la sortie peut varier à entrées
 * égales. « Calcul » était trop étroit : un utilitaire cherche, lit ou rédige
 * aussi bien qu'il calcule.
 *
 * v4.6 — **un appel s'écrit, un résultat se range.** La v4.5 dépliait les
 * quatre-vingts sorties d'un calcul de fondations dans le `.ref` : le fichier
 * de code portait les données, on ne voyait plus ni ce que la fonction
 * consommait, ni comment l'appeler. Une fonction native écrit donc maintenant
 * sa **signature** — la portée et ses entrées nommées —, ses entrées à retenir,
 * son appel avec ses arguments, et **un seul** `enregistre` qui range le
 * résultat entier. Les données vont dans le `.ctr`, et la forme du tableau se
 * déclare une fois dans `variables-du-projet.ref`, sous `structure attendue`.
 */
export const ECRITURE = "4.7";

/** Le pas d'indentation. Trois espaces, jamais une tabulation. */
export const RETRAIT = "   ";

/** Ce qu'un morceau de ligne est, pour qui le colore. */
export const JETON = {
  /** `fichier:` — le mot qui ouvre l'en-tête. */
  MOT_FICHIER: "mot-fichier",
  /** Le chemin du fichier, derrière `fichier:`. */
  SECTION: "section",
  /** `note:` et ce qui suit — une remarque sur le fichier, jamais interprétée. */
  NOTE: "note",
  /** Le sujet d'une donnée : « Hauteur du plancher bas du logement le plus haut ». */
  SUJET: "sujet",
  /** Ce qu'elle vaut : « 26 », « 3e famille B ». */
  VALEUR: "valeur",
  /** Son unité, colorée à part : « m », « h », « dm² ». */
  UNITE: "unite",
  /** `=`, `≤`, `≥`, `<`, `>`, `≠` — la comparaison, ou l'affectation. */
  OPERATEUR: "operateur",
  /** `si`, `et`, `ou`, `non`, `alors`, `sinon` — les mots de la règle. */
  MOT_CONDITION: "mot-condition",
  /** `sauf si` — le mot qui borne la règle. */
  MOT_EXCEPTION: "mot-exception",
  /** `écarté:` — le mot qui ouvre un possible que la décision a laissé. */
  MOT_ECARTE: "mot-ecarte",
  /** Ce qui a été écarté : « ardoise », « membrane EPDM ». */
  ECARTE: "ecarte",
  /** `parce que` — le mot qui introduit la preuve. */
  MOT_RAISON: "mot-raison",
  /** La preuve elle-même, citée. */
  RAISON: "raison",
  /** `texte:`, `document:`, `calcul:`… — le mot-clé **est** le type. */
  PROVENANCE: "provenance",
  /** Ce qui est désigné derrière le type : « arrêté …, article 6 ». */
  SOURCE: "source",
  /** `statut:` — le mot. */
  MOT_STATUT: "mot-statut",
  /** Son contenu : retenu, supposé, contesté, remplacé, écarté. */
  STATUT: "statut",
  /** `le:` — le mot qui ouvre la date d'un constat. */
  MOT_DATE: "mot-date",
  /** La date elle-même. */
  DATE: "date",
  /** Les entrées d'une règle, entre parenthèses. */
  ENTREES: "entrees",
  /** `fonction`, et `native` derrière lui — les mots qui ouvrent une fonction. */
  MOT_FONCTION: "mot-fonction",
  /** `soit` — le mot qui déclare une locale, en tête de règle. */
  MOT_SOIT: "mot-soit",
  /** `const` — le mot qui déclare une variable du projet. */
  MOT_CONST: "mot-const",
  /** `enregistre`, `décision humaine assumée` — les verbes qui agissent. */
  MOT_NATIF: "mot-natif",
  /**
   * `importe` — le seul verbe qui n'agit pas : il déclare une dépendance, comme
   * un `import` de module. Il prend donc la couleur des mots-clés, pas celle
   * des appels.
   */
  MOT_IMPORTE: "mot-importe",
  /**
   * Le chemin d'un fichier, cité dans un `importe` ou un `enregistre`.
   *
   * `chemin` et non `fichier` : `mdall-fichier` désigne déjà, dans la feuille
   * de style, la **carte** qui encadre un fichier de l'Atelier. Deux sens pour
   * une classe donnaient une bordure autour d'un chemin.
   */
  CHEMIN: "chemin",
  /** `zones` — le paramètre de portée, cité comme tel. */
  PORTEE: "portee",
  /**
   * Le nom d'un **champ du langage** : `utilitaire`, `version`, `dans`, `zones`,
   * `variable`, `depuis`, `texte`, `parce que`. La liste est fermée, et c'est ce
   * qui en fait un langage — ils se colorent donc comme `statut:` et `le:`, qui
   * sont les mêmes.
   */
  LOCALE: "locale",
  /**
   * Le nom d'une **locale d'une fonction** : `résultat`, `Profondeur hors gel à
   * retenir`.
   *
   * Distinct d'un sujet, et c'est tout l'intérêt : un sujet est un nom du
   * **projet**, qu'on peut chercher, qui a une déclaration quelque part et dont
   * l'absence est une lacune. Une locale ne vit que dans sa fonction. Les
   * confondre faisait souligner « Profondeur hors gel à retenir » comme un
   * renvoi sans déclaration, à la ligne même où elle est déclarée.
   */
  NOM_LOCAL: "nom-local",
  /** `// …` ou `/* … *\/` — ce qu'on écrit pour soi, jamais interprété. */
  COMMENTAIRE: "commentaire",
  /** Un paramètre de la règle : une entrée, nommée. */
  PARAMETRE: "parametre",
  /** `(`, `)`, `,`, `;` — ce qui borne et sépare, sans rien dire. */
  PONCTUATION: "ponctuation",
  /** `{` et `}` — les bornes d'un bloc. */
  ACCOLADE: "accolade",
  /** `zone:` — le mot qui ouvre une section de portée. */
  MOT_ZONE: "mot-zone",
  /** Le nom de la zone. */
  ZONE: "zone",
  /** Ce qui ne se colore pas : les espaces, les séparateurs. */
  NEUTRE: "neutre"
};

/**
 * D'où une valeur vient. Six réponses, et pas une de plus.
 *
 * ## Pourquoi la provenance n'est pas une « origine » déclarée
 *
 * On pourrait écrire `origine "règle"` à côté de `← règle …`. Ce serait la même
 * information deux fois. Le **type de la provenance est l'origine** : une ligne
 * qui renvoie à une règle est déduite, une ligne qui renvoie à un plan est lue,
 * une ligne qui renvoie à un calcul est calculée. Rien à déclarer.
 *
 * Les deux dernières sont les seules qui ne se déduisent de rien d'autre :
 * un choix humain, et une supposition. Ce sont donc les seules qu'il faut
 * écrire — et les seules qui engagent quelqu'un.
 */
export const PROVENANCE = {
  /** Un texte réglementaire, une norme, un DTU. */
  TEXTE: "texte",
  /** Une pièce du projet : plan, note, compte rendu. */
  DOCUMENT: "document",
  /** Un calcul, avec ce qu'il a lu. */
  CALCUL: "calcul",
  /** Une règle d'un référentiel — la valeur en est déduite. */
  REGLE: "règle",
  /** Quelqu'un a tranché. */
  DECISION: "décision",
  /** On suppose, en attendant mieux. */
  HYPOTHESE: "hypothèse"
};

/** Les six types, pour qui veut vérifier qu'il en écrit un vrai. */
export const PROVENANCES = Object.values(PROVENANCE);

/**
 * L'état d'un raisonnement dans **ce** projet.
 *
 * Ce n'est pas une propriété de la valeur, ni de la règle : c'est ce que le
 * projet en fait aujourd'hui. La même règle donne « retenu » ici et « contesté »
 * là, sans que rien ne change dans le référentiel.
 */
export const STATUT = {
  /** Le projet le tient pour acquis. */
  RETENU: "retenu",
  /** En attendant mieux. Ce qui en dépend devient suspect si cela change. */
  SUPPOSE: "supposé",
  /** Quelqu'un ne l'admet pas. La valeur reste, le désaccord aussi. */
  CONTESTE: "contesté",
  /** Une décision plus récente a pris sa place. */
  REMPLACE: "remplacé",
  /** Refusé en revue. Un refus est une information, pas une valeur du projet. */
  ECARTE: "écarté",
  /**
   * Examiné, et rien n'est exigé.
   *
   * Ce n'est pas une absence : c'est une conclusion, et c'est celle qu'on
   * cherchera le jour où quelqu'un demandera « et pour la circulation
   * horizontale ? ». La ligne s'écrit, avec sa valeur quand il y en a une —
   * une donnée sans exigence reste une donnée dont d'autres règles dépendent.
   */
  SANS_OBJET: "sans objet",
  /**
   * Il manque une réponse.
   *
   * Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien : la ligne
   * s'écrit, et `parce que` dit ce qui la retient.
   */
  EN_ATTENTE: "en attente"
};

export const STATUTS = Object.values(STATUT);

/**
 * Les comparateurs, dans les signes qu'on lit.
 *
 * `<=` plutôt que `≤` : le second est plus joli et ne se tape pas. Un langage
 * qu'un architecte doit pouvoir écrire à la main ne peut pas exiger une table
 * de caractères. La lecture accepte les deux.
 */
export const OPERATEUR = {
  EGAL: "=",
  DIFFERENT: "!=",
  AU_PLUS: "<=",
  AU_MOINS: ">=",
  MOINS_DE: "<",
  PLUS_DE: ">",
  PARMI: "parmi",
  RENSEIGNE: "renseigné",
  NON_RENSEIGNE: "non renseigné"
};

export const OPERATEURS = Object.values(OPERATEUR);

/**
 * Les mots de la langue, et l'ordre dans lequel on les cherche.
 *
 * « sauf si » avant « si », sans quoi « sauf si » se lirait comme « sauf » suivi
 * d'un sujet nommé « si ». C'est la seule subtilité de la grammaire, et elle
 * tient dans cet ordre.
 */
export const MOTS = [
  "sauf si", "parce que", "statut", "fichier", "note", "le", "zone",
  // Les mots d'un `.ref`, et eux seuls. Ils sont empruntés à un langage de
  // programmation parce qu'un `.ref` en est un : il s'exécute. `fonction`
  // l'ouvre, `soit` déclare ce qui la fonde, `const` définit un nom du projet.
  // Voir l'en-tête, « L'identité de l'écriture, et pourquoi elle a bougé ».
  "fonction", "soit", "const",
  "si", "et", "ou", "non", "alors", "sinon",
  ...Object.values(PROVENANCE)
];

/** La zone de ce qui vaut partout. Le premier bloc d'un fichier, toujours. */
export const TOUTES_ZONES = "Toutes zones";

const texte = (valeur) => String(valeur ?? "").trim();
const jeton = (type, contenu) => ({ type, texte: contenu });
const espace = (largeur = " ") => jeton(JETON.NEUTRE, largeur);

/**
 * Ce qui, dans une valeur, est le nombre et ce qui est l'unité.
 *
 * « 490,03 m » se coupe, « CF 1/2 h » ne se coupe pas — c'est un degré, pas une
 * mesure, et le couper produirait « CF » suivi de « 1/2 h ». La coupe n'a lieu
 * que si tout ce qui précède l'espace est un nombre.
 */
export function couperLUnite(valeur) {
  const brut = texte(valeur);
  const trouve = brut.match(/^(-?[\d]+(?:[.,\s]\d+)*)\s+(.+)$/);
  if (!trouve) return { nombre: brut, unite: "" };
  return { nombre: trouve[1], unite: trouve[2] };
}

/**
 * Une valeur est-elle mesurée, ou textuelle ?
 *
 * Une mesure s'écrit nue — `= 26 m` —, un texte entre guillemets —
 * `= "3e famille B"`. Sans cette différence, on ne saurait pas relire `= 3` :
 * trois quoi, ou la chaîne « 3 » ? La question se pose vraiment : la famille
 * d'un bâtiment est la catégorie « 3 », pas le nombre trois.
 */
/**
 * Le nombre qu'un texte porte, ou `NaN`.
 *
 * « 490,03 m », « 490.03 », « 1 200 m » disent le même nombre : la virgule
 * décimale, l'espace fine des milliers et l'unité qui suit sont des façons
 * d'écrire, pas des valeurs différentes.
 *
 * `NaN` plutôt que zéro quand il n'y a rien à lire. `Number("")` vaut zéro, et
 * une altitude à zéro se calcule sans broncher jusqu'à une cote de fondation
 * fausse — c'est arrivé.
 */
export function lireUnNombre(valeur) {
  if (typeof valeur === "number") return Number.isFinite(valeur) ? valeur : NaN;

  const brut = texte(valeur)
    .replace(/[\u202f\u00a0]/g, "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.+-]/g, "");
  if (!brut) return NaN;

  const nombre = Number(brut);
  return Number.isFinite(nombre) ? nombre : NaN;
}

export function estMesuree(valeur) {
  const { nombre } = couperLUnite(valeur);
  return /^-?\d+(?:[.,\s]\d+)*$/.test(texte(nombre));
}

/**
 * Une mesure, écrite avec la virgule décimale — la seule que la mémoire écrive.
 *
 * ## Le défaut
 *
 * Un utilitaire versait « 0.5 m », un autre « 0,50 m », et les deux se lisaient
 * dans le même fichier, l'un sous l'autre. C'est la règle 4 appliquée à la
 * forme : une valeur écrite de deux **façons** diverge tout de suite — deux
 * lignes du même sujet passent pour différentes, et une variante annonce des
 * conséquences qui n'en sont pas.
 *
 * On corrige donc **à l'écriture**, ici, et non chez chaque producteur : un
 * versement qui arriverait demain d'un utilitaire tiers, ou d'un utilisateur,
 * passe par le même chemin.
 *
 * ## Ce qu'on ne touche pas
 *
 * Seul un nombre suivi — ou non — d'une unité est une mesure. « NF DTU 13.1 »
 * n'en est pas une, ni « V1 », ni `structure.ctr` : le point y appartient au
 * nom, et le changer en virgule inventerait une cote. Un nombre qui porte déjà
 * une virgule, ou plusieurs points, se laisse tel quel : deviner s'il s'agit
 * d'un séparateur de milliers ou d'une décimale ferait dire au texte autre
 * chose que ce qu'on a versé.
 */
export function mesureEnFrancais(valeur) {
  const brut = texte(valeur);
  if (!estMesuree(brut)) return brut;

  const { nombre, unite } = couperLUnite(brut);
  if (nombre.includes(",") || (nombre.match(/\./g) ?? []).length !== 1) return brut;

  const dit = nombre.replace(".", ",");
  return unite ? `${dit} ${unite}` : dit;
}

/**
 * Une valeur, écrite selon qu'elle se mesure ou se cite.
 *
 * Exportée parce que la lecture en a besoin pour recolorer une valeur trouvée
 * ailleurs que sur une ligne d'affirmation — dans un `enregistre`, par exemple.
 * Deux façons d'écrire une valeur finiraient par ne plus s'accorder.
 */
export function jetonsDeValeur(valeur, unite = "") {
  const brut = texte(valeur);
  if (!brut) return [];

  const uniteDite = texte(unite);
  if (uniteDite) return [jeton(JETON.VALEUR, brut), espace(), jeton(JETON.UNITE, uniteDite)];

  if (estMesuree(brut)) {
    const coupe = couperLUnite(brut);
    return coupe.unite
      ? [jeton(JETON.VALEUR, coupe.nombre), espace(), jeton(JETON.UNITE, coupe.unite)]
      : [jeton(JETON.VALEUR, coupe.nombre)];
  }

  return [jeton(JETON.VALEUR, `"${brut}"`)];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les lignes
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Une donnée et ce qu'elle vaut : la ligne de tête d'un bloc.
 *
 * `Sujet = valeur`, et rien d'autre. La provenance, la preuve et le statut sont
 * des lignes indentées dessous, parce que ce sont des objets différents. La
 * portée n'y est plus : c'est le dossier qui la porte.
 */
export function ligneDAffirmation({ sujet = "", valeur = "", unite = "" } = {}) {
  const jetons = [jeton(JETON.SUJET, texte(sujet))];

  const dit = texte(valeur);
  if (dit) {
    jetons.push(espace(), jeton(JETON.OPERATEUR, OPERATEUR.EGAL), espace());
    jetons.push(...jetonsDeValeur(dit, unite));
  }

  return jetons;
}

/**
 * La tête d'une **règle** : la donnée, et ses entrées entre parenthèses.
 *
 * ```
 * Classement du bâtiment (Habitation individuelle ou collective, Nombre d'étages)
 * ```
 *
 * La signature ne se stocke pas : les entrées **sont** les sujets des
 * conditions, et une signature recopiée diverge le jour où quelqu'un ajoute une
 * condition. Elle se calcule ici, à l'écriture.
 */
export function ligneDeDonnee(sujet = "", entrees = [], { regle = false } = {}) {
  const jetons = regle
    ? [jeton(JETON.MOT_FONCTION, "fonction"), espace(), jeton(JETON.SUJET, texte(sujet))]
    : [jeton(JETON.SUJET, texte(sujet))];

  const noms = [...new Set((Array.isArray(entrees) ? entrees : [entrees]).map(texte).filter(Boolean))];

  // Une règle porte toujours sa parenthèse, même vide : `Colonne sèche()` se
  // lit comme une fonction sans entrée, `Colonne sèche` comme un nom. La
  // différence compte le jour où l'on écrira ces fichiers à la main.
  if (regle) {
    jetons.push(jeton(JETON.PONCTUATION, "("));
    noms.forEach((nom, rang) => {
      if (rang > 0) jetons.push(jeton(JETON.PONCTUATION, ","), espace());
      jetons.push(jeton(JETON.PARAMETRE, nom));
    });
    jetons.push(jeton(JETON.PONCTUATION, ")"));
    return jetons;
  }

  if (noms.length) {
    jetons.push(espace(), jeton(JETON.ENTREES, `(${noms.join(", ")})`));
  }

  return jetons;
}

/**
 * Une condition : `si Sujet <= 28 m`, `et Voie-engins parmi "a" ou "b"`.
 *
 * @param {string} mot `si`, `et`, `ou`, `non`, `sauf si`
 * @param {object} condition `{sujet, operateur, valeur, unite, logique}`
 */
export function ligneDeCondition(mot, condition = {}, profondeur = 1, { regle = false } = {}) {
  const cle = texte(mot);
  const jetons = [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(cle === "sauf si" ? JETON.MOT_EXCEPTION : JETON.MOT_CONDITION, cle),
    espace()
  ];

  // Dans une règle, chaque clause porte ses propres parenthèses : `si (…)`,
  // `et (…)`. Une seule parenthèse ouverte sur la première condition et fermée
  // sur la dernière ferait bouger deux lignes dès qu'on en ajoute une, et le
  // diff ne dirait plus « une condition de plus ».
  if (regle) jetons.push(jeton(JETON.PONCTUATION, "("));
  jetons.push(jeton(JETON.SUJET, texte(condition.sujet)));

  const fermer = () => { if (regle) jetons.push(jeton(JETON.PONCTUATION, ")")); };

  const operateur = texte(condition.operateur) || OPERATEUR.EGAL;
  // « renseigné » se suffit : il ne compare rien, il constate qu'on a répondu.
  //
  // C'est un **mot** de la langue, pas un signe : il se colore donc comme `si`
  // et `alors`, et non comme `=`. En gris d'opérateur il se lisait comme une
  // partie du nom qui le précède.
  if (operateur === OPERATEUR.RENSEIGNE || operateur === OPERATEUR.NON_RENSEIGNE) {
    jetons.push(espace(), jeton(JETON.MOT_CONDITION, operateur));
    fermer();
    return jetons;
  }

  jetons.push(espace(), jeton(JETON.OPERATEUR, operateur), espace());

  const valeurs = Array.isArray(condition.valeur) ? condition.valeur : [condition.valeur];
  // Une liste se sépare d'un « ou » : c'est ce que « parmi » veut dire, et le
  // lecteur ne doit pas avoir à le deviner d'une virgule.
  valeurs.map(texte).filter(Boolean).forEach((valeur, rang) => {
    if (rang > 0) jetons.push(espace(), jeton(JETON.MOT_CONDITION, "ou"), espace());
    // Un oui/non n'est pas un texte : il ne prend pas de guillemets.
    jetons.push(...(condition.logique === true
      ? [jeton(JETON.VALEUR, valeur)]
      : jetonsDeValeur(valeur, condition.unite)));
  });

  fermer();
  return jetons;
}

/** `alors …` ou `sinon …` — ce que la règle pose. */
export function ligneDeConsequence(mot, valeur = "", unite = "", profondeur = 1, { regle = false } = {}) {
  const jetons = [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_CONDITION, texte(mot)),
    espace()
  ];

  // `alors ("3e famille B");` — ce qui **conclut** est une instruction, et une
  // instruction se termine. C'est ce qui dit, à la lecture comme à la relecture
  // par une machine, où s'arrête ce que la règle pose.
  if (regle) jetons.push(jeton(JETON.PONCTUATION, "("));
  jetons.push(...jetonsDeValeur(valeur, unite));
  if (regle) jetons.push(jeton(JETON.PONCTUATION, ")"), jeton(JETON.PONCTUATION, ";"));

  return jetons;
}

/**
 * Les verbes du langage — ce qu'une règle sait **faire**, et pas seulement dire.
 *
 * ## Pourquoi un langage de métier a des verbes
 *
 * Une règle qui se contente de conclure laisse la moitié du travail à celui qui
 * la lit : où est-ce écrit ? qui l'a décidé ? que fait-on si le référentiel ne
 * s'applique pas ? Ces gestes-là reviennent dans tous les projets, et les
 * écrire en prose à chaque fois donne mille formulations pour une seule chose.
 *
 * La liste est **fermée**, et c'est ce qui en fait un langage : un verbe de plus
 * inventé au fil de l'eau ne se relirait nulle part.
 *
 * | verbe | ce qu'il fait |
 * | --- | --- |
 * | `importe` | dit d'où vient une entrée, et où aller la lire |
 * | `enregistre` | écrit une valeur dans un fichier, sur une portée |
 * | `décision humaine assumée` | quelqu'un a tranché, et il signe |
 *
 * D'autres suivront, et le besoin les nommera plutôt que l'imagination :
 * `constate` (une observation datée), `suppose` (avec ce qui la lèverait),
 * `sans objet` (le référentiel ne s'applique pas, ce qui n'est pas une
 * condition fausse), `à vérifier` (la machine s'arrête et appelle quelqu'un).
 */
export const VERBES = {
  IMPORTE: "importe",
  ENREGISTRE: "enregistre",
  DECISION: "décision humaine assumée"
};

/**
 * Les **agents** : ce que le langage appelle sans pouvoir le lire.
 *
 * ## Une fonction s'écrit toujours en entier
 *
 * C'est la règle, et l'amalgame précédent la contredisait : on écrivait
 * `fonction native NOM(…) { … }`, comme si la fonction elle-même était opaque.
 * Elle ne l'est pas. Son commentaire, ses entrées, ses branches, ce qu'elle
 * enregistre : tout cela s'écrit, se lit et se rejoue. Une seule ligne de son
 * corps ne se lit pas — **l'appel d'agent** — et c'est celle-là qui porte le
 * mot.
 *
 * ## Pourquoi « agent » et non « calcul »
 *
 * Parce que « calcul » est trop étroit. Un utilitaire de fondations calcule ; un
 * autre cherche dans une table ; un troisième lit un document et n'en extrait
 * qu'une date. Le point commun n'est pas le calcul : c'est qu'**un tiers fait le
 * travail et rend un résultat**, sans que sa loi descende dans le projet.
 *
 * ## Pourquoi deux agents, et pas un
 *
 * La différence n'est pas la technique, c'est la **reproductibilité** — et une
 * mémoire de projet ne peut pas l'ignorer :
 *
 * | | mêmes entrées | ce qu'on peut en dire |
 * | --- | --- | --- |
 * | `agent-D` | **même sortie, toujours** | rejouer suffit à vérifier |
 * | `agent-IA` | sortie qui peut varier | il faut conserver ce qu'il a rendu |
 *
 * Un `agent-D` se rejoue et l'on compare ; un `agent-IA` ne se rejoue pas pour
 * vérifier — le rejouer donnerait peut-être autre chose, sans que le projet ait
 * bougé. Ce qu'il a répondu **ce jour-là** est donc la seule vérité, et se
 * conserve. Confondre les deux ferait passer une variation du modèle pour un
 * changement du projet, ce qui est le pire des faux signaux.
 *
 * Les deux s'appellent de la même façon, et pourront travailler côte à côte
 * dans une même fonction : c'est ce que le mot rend possible.
 */
export const AGENT = {
  /** Un enchaînement déterministe : mêmes entrées, même sortie. */
  D: "agent-D",
  /** Un agent qui juge, rédige ou interprète : sa sortie peut varier. */
  IA: "agent-IA"
};

/** Les deux, pour ce qui doit les reconnaître sans les distinguer. */
export const AGENTS = Object.values(AGENT);

/**
 * `décision humaine assumée (réunion de chantier du 3 mars, par: Nicolas L., le: 12 mars 2026);`
 *
 * ## Pourquoi un verbe, et non une provenance de plus
 *
 * `hypothèse:` dit d'où une valeur vient ; **ce verbe dit qui la porte**. Les
 * deux ne se remplacent pas : une hypothèse se lève quand la donnée arrive, une
 * décision se conteste devant celui qui l'a prise. Sans nom et sans date, une
 * valeur tranchée à la main se relit six mois plus tard comme un fait établi —
 * et personne ne sait plus qu'elle était un choix.
 *
 * Il remplace la ligne `décision:` quand on sait qui a tranché et quand : la
 * mémoire le sait depuis toujours — `decided_by`, `decided_at` — et ne le
 * montrait nulle part.
 */
export function ligneDeDecision({ quoi = "", par = "", le = "" } = {}, profondeur = 1) {
  const dit = texte(quoi);
  if (!dit) return null;

  const jetons = [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.MOT_NATIF, VERBES.DECISION),
    espace(),
    jeton(JETON.PONCTUATION, "("),
    jeton(JETON.SOURCE, dit)
  ];

  // Qui, et quand. Une décision sans auteur ni date n'est pas une décision :
  // c'est une valeur dont plus personne ne répond.
  for (const [cle, dit] of [["par", texte(par)], ["le", texte(le)]]) {
    if (!dit) continue;
    jetons.push(jeton(JETON.PONCTUATION, ","), espace(),
      jeton(JETON.LOCALE, cle), jeton(JETON.PONCTUATION, ":"), espace(),
      jeton(cle === "le" ? JETON.DATE : JETON.SOURCE, dit));
  }

  jetons.push(jeton(JETON.PONCTUATION, ")"), jeton(JETON.PONCTUATION, ";"));
  return jetons;
}

/**
 * `importe (variable: Champ d'application du titre VI, depuis: memoire/incendie.ctr, zones: zones);`
 *
 * ## Pourquoi une règle dit d'où viennent ses entrées
 *
 * Sans cela, une fonction lue seule ne se comprend pas : « Champ d'application
 * du titre VI » apparaît dans une condition sans qu'on sache qui le pose ni où
 * aller le lire. Il faut alors parcourir les autres fichiers pour reconstituer
 * la chaîne — et c'est précisément ce que la mémoire existe pour éviter.
 *
 * Une fonction **auto-portée** se lit d'un bout à l'autre : ce dont elle a
 * besoin, d'où cela vient, ce qu'elle en fait, et où le résultat va.
 *
 * Un import par ligne : ajouter une entrée ajoute exactement une ligne, et le
 * diff dit « une entrée de plus » plutôt que de redessiner un bloc.
 */
export function ligneDImport({ variable = "", depuis = "", zones = "zones" } = {}, profondeur = 1) {
  const nom = texte(variable);
  if (!nom) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_IMPORTE, "importe"),
    espace(),
    jeton(JETON.PONCTUATION, "("),
    jeton(JETON.LOCALE, "variable"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.SUJET, nom),
    jeton(JETON.PONCTUATION, ","),
    espace(),
    jeton(JETON.LOCALE, "depuis"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.CHEMIN, texte(depuis) || "inconnu"),
    jeton(JETON.PONCTUATION, ","),
    espace(),
    // La zone fait partie de l'emprunt : une variable n'a pas une valeur, elle
    // en a une **par partie d'ouvrage**. Importer sans dire laquelle
    // reviendrait à en prendre une au hasard.
    jeton(JETON.LOCALE, "zones"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.PORTEE, texte(zones) || "zones"),
    jeton(JETON.PONCTUATION, ")"),
    jeton(JETON.PONCTUATION, ";")
  ];
}

/**
 * `enregistre ( Sujet: "valeur", dans: incendie.ctr, zones: zones )`
 *
 * Ce que la règle **fait** de sa conclusion. Une règle qui se contente de
 * conclure laisse ouverte la question qui vient toujours après : « et alors, où
 * est-ce écrit ? ». Le bloc y répond sur place — le fichier qui reçoit, et la
 * portée sur laquelle cela vaut.
 *
 * Il s'écrit sur plusieurs lignes, contrairement à l'import : chacun de ses
 * trois champs peut changer seul, et une seule ligne les ferait tous bouger
 * ensemble dans le diff.
 *
 * Il porte **un sujet ou plusieurs** : `valeurs` remplace alors le trio
 * `sujet`/`valeur`/`unite`. Une règle conclut sur une valeur, un calcul qui
 * dimensionne rend un tableau, et le fichier doit pouvoir dire les deux.
 *
 * @param {{sujet?: string, valeur?: string, unite?: string,
 *          valeurs?: {sujet: string, valeur: string, unite?: string}[],
 *          dans?: string, zones?: string}} quoi
 * @returns {object[][]} les lignes du bloc
 */
export function blocDEnregistrement({
  sujet = "", valeur = "", unite = "", valeurs = null, dans = "", zones = "zones"
} = {}, profondeur = 2) {
  // Un seul sujet, ou plusieurs. Une règle conclut sur une valeur ; un calcul
  // qui dimensionne un massif en rend huit d'un coup — les cotes, le volume,
  // le verdict — et les éclater en huit `enregistre` séparés répéterait sept
  // fois le fichier et la zone pour un seul geste.
  const ecrites = (Array.isArray(valeurs) ? valeurs : [{ sujet, valeur, unite }])
    .filter((ligne) => texte(ligne?.sujet));
  if (!ecrites.length) return [];

  const dedans = profondeur + 1;
  const lignes = [[
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.MOT_NATIF, "enregistre"),
    espace(),
    jeton(JETON.PONCTUATION, "(")
  ]];

  for (const ligne of ecrites) {
    lignes.push([
      espace(RETRAIT.repeat(dedans)),
      jeton(JETON.SUJET, texte(ligne.sujet)),
      jeton(JETON.PONCTUATION, ":"),
      espace(),
      // Une **référence** cite un nom — `résultat` —, une valeur en est une.
      // Les guillemets font la différence à la lecture : sans eux, « résultat »
      // serait un texte que le projet affirme, au lieu de ce que l'appel a rendu.
      ...(ligne.reference === true
        ? [jeton(JETON.NOM_LOCAL, texte(ligne.valeur))]
        : jetonsDeValeur(ligne.valeur, ligne.unite)),
      jeton(JETON.PONCTUATION, ",")
    ]);
  }

  lignes.push([
    espace(RETRAIT.repeat(dedans)),
    jeton(JETON.LOCALE, "dans"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.CHEMIN, texte(dans) || "inconnu"),
    jeton(JETON.PONCTUATION, ",")
  ]);

  lignes.push([
    espace(RETRAIT.repeat(dedans)),
    jeton(JETON.LOCALE, "zones"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.PORTEE, texte(zones) || "zones")
  ]);

  lignes.push([espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.PONCTUATION, ")")]);
  return lignes;
}

/**
 * `soit texte = "arrêté du 31 janvier 1986, article 98";`
 *
 * Une locale d'une règle. Elle se pose en tête du bloc, avant les conditions,
 * comme on déclare les `const` d'une fonction avant de s'en servir : ce qui
 * fonde la règle se lit avant ce qu'elle fait, et non après.
 *
 * Le nom reste celui du concept — `texte`, `document`, `règle`, `parce que` —
 * parce que c'est lui qui porte le sens. `soit machin = …` ne dirait rien.
 */
export function ligneDeLocale(nom = "", valeur = "", profondeur = 1) {
  const quoi = texte(valeur);
  if (!texte(nom) || !quoi) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_SOIT, "soit"),
    espace(),
    jeton(JETON.LOCALE, texte(nom)),
    espace(),
    jeton(JETON.OPERATEUR, OPERATEUR.EGAL),
    espace(),
    jeton(JETON.VALEUR, `"${quoi.replace(/^["\u00ab]\s*/, "").replace(/\s*["\u00bb]$/, "")}"`),
    jeton(JETON.PONCTUATION, ";")
  ];
}

/**
 * ```
 * tableau: [
 *    {
 *       désignation: "Semelle 1",
 *       section Lx: 1,20 m,
 *       vérification: "vérifiée",
 *       entrées: {
 *          arase supérieure: -0,10 m
 *       }
 *    },
 *    { … }
 * ]
 * ```
 *
 * Les **valeurs** d'un tableau, écrites dans le fichier qui le range.
 *
 * ## Pourquoi elles s'écrivent, et pas seulement leur résumé
 *
 * Une affirmation dont la valeur est un tableau n'affichait que sa phrase :
 * « 11 massifs, 8,74 m³ de béton — 11 vérifiées ». Deux choses en découlaient,
 * et les deux sont graves :
 *
 * - **le diff ne disait plus rien.** Une semelle dont la section passe de 1,20 à
 *   1,60 m ne changeait pas la phrase si le volume total tombait juste : le
 *   fichier était identique, et le projet avait bougé ;
 * - **on ne pouvait plus refaire le calcul.** Ce qui est entré dans l'appel
 *   n'était nulle part lisible, donc pas vérifiable — et « ne pas savoir
 *   n'autorise pas à prétendre qu'il n'y a rien ».
 *
 * ## Ce que la forme dit, et ce qu'elle ne dit pas
 *
 * Elle rend l'objet tel qu'il est, imbrication comprise. Elle ne l'interprète
 * pas : les valeurs se lisent comme partout ailleurs — un texte porte des
 * guillemets, une mesure n'en porte pas — et la **forme attendue** de ce tableau
 * se déclare, elle, une fois pour toutes dans `variables-du-projet.ref`.
 *
 * Un tableau vide ne s'écrit pas : `tableau: []` n'apprend rien qu'une ligne
 * absente ne dise déjà.
 *
 * @param {object[]} lignes les lignes du tableau, telles que la mémoire les porte
 * @param {string} [nom] le mot qui l'ouvre — `tableau` par défaut
 * @returns {object[][]} les lignes du bloc
 */
export function lignesDeTableau(lignes = null, profondeur = 1, nom = "tableau") {
  const dites = Array.isArray(lignes) ? lignes.filter((ligne) => ligne && typeof ligne === "object") : [];
  if (!dites.length) return [];

  const rendues = [[
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.LOCALE, texte(nom) || "tableau"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.PONCTUATION, "[")
  ]];

  const virgule = (dernier) => (dernier ? [] : [jeton(JETON.PONCTUATION, ",")]);

  /** Un champ scalaire : `section Lx: 1,20 m,`. */
  const champ = (cle, valeur, niveau, dernier) => {
    const dit = texte(valeur);
    return [
      espace(RETRAIT.repeat(niveau)),
      jeton(JETON.SUJET, texte(cle)),
      jeton(JETON.PONCTUATION, ":"),
      espace(),
      // Une valeur vide s'écrit `—` : une clé sans rien derrière se lirait comme
      // une ligne tronquée, alors que c'est une valeur qu'on n'a pas.
      ...(dit ? jetonsDeValeur(...separerLUnite(dit)) : [jeton(JETON.VALEUR, "—")]),
      ...virgule(dernier)
    ];
  };

  /**
   * Un objet, et ce qu'il contient — **récursivement**.
   *
   * Les charges d'un massif sont un objet de cas de charge, dont chacun est un
   * objet de composantes : deux niveaux, et il y en aura d'autres. Une descente
   * limitée à un niveau écrivait « [object Object] », ce qui est exactement le
   * genre de trou qu'un fichier de mémoire ne doit pas avoir.
   */
  const objet = (contenu, niveau, dernier, cle = "") => {
    const tete = [espace(RETRAIT.repeat(niveau))];
    if (texte(cle)) tete.push(jeton(JETON.SUJET, texte(cle)), jeton(JETON.PONCTUATION, ":"), espace());
    tete.push(jeton(JETON.PONCTUATION, "{"));
    rendues.push(tete);

    const cles = Object.keys(contenu ?? {});
    cles.forEach((nomDuChamp, rang) => {
      const valeur = contenu[nomDuChamp];
      const fin = rang === cles.length - 1;

      if (Array.isArray(valeur)) {
        rendues.push([
          espace(RETRAIT.repeat(niveau + 1)),
          jeton(JETON.SUJET, nomDuChamp), jeton(JETON.PONCTUATION, ":"), espace(), jeton(JETON.PONCTUATION, "[")
        ]);
        valeur.forEach((entree, place) => objet(entree, niveau + 2, place === valeur.length - 1));
        rendues.push([espace(RETRAIT.repeat(niveau + 1)), jeton(JETON.PONCTUATION, "]"), ...virgule(fin)]);
        return;
      }

      if (valeur && typeof valeur === "object") {
        objet(valeur, niveau + 1, fin, nomDuChamp);
        return;
      }

      rendues.push(champ(nomDuChamp, valeur, niveau + 1, fin));
    });

    rendues.push([espace(RETRAIT.repeat(niveau)), jeton(JETON.PONCTUATION, "}"), ...virgule(dernier)]);
  };

  dites.forEach((ligne, rang) => objet(ligne, profondeur + 1, rang === dites.length - 1));
  rendues.push([espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.PONCTUATION, "]")]);
  return rendues;
}

/**
 * Une valeur écrite, séparée de son unité — pour la réécrire telle quelle.
 *
 * `« 1,20 m »` s'écrit `1,20` puis `m`, en deux jetons de couleurs différentes ;
 * `« vérifiée »` reste une chaîne, citée. C'est la troisième loi de lecture
 * appliquée à ce qu'un tableau porte.
 */
function separerLUnite(brute) {
  const dit = texte(brute);
  if (!dit || !estMesuree(dit)) return [dit, ""];
  const coupe = couperLUnite(dit);
  return [coupe.nombre, coupe.unite];
}

/**
 * ```
 * structure attendue: [
 *    designation: "texte",
 *    nombre de massifs: nombre,
 *    règlement: "texte",
 *    section Lx: "nombre, en m"
 * ]
 * ```
 *
 * Ce qu'une ligne d'un tableau contient.
 *
 * ## Pourquoi une variable de type tableau ne se suffit pas d'un type
 *
 * « type: tableau » ne dit rien. Une fonction qui attend « les données d'entrée
 * du calcul des fondations » ne s'appelle pas tant qu'on ignore ce qu'il faut
 * mettre dans une ligne — et personne n'ira lire le code du serveur pour le
 * savoir. La déclaration porte donc la forme, une fois, à l'endroit où l'on
 * cherche déjà le nom.
 *
 * ## Pourquoi elle s'imbrique
 *
 * Un champ peut lui-même être un groupe — les hypothèses réglementaires d'un
 * massif en sont un. On le rend en profondeur plutôt qu'à plat : `règlement` et
 * `hypothèses réglementaires.règlement` ne se lisent pas pareil, et le second ne
 * se lit pas du tout.
 *
 * Elle ne dit que la **forme**, jamais une valeur : ce qu'un projet met dedans
 * vit dans le fichier où le tableau est rangé.
 *
 * @param {{nom: string, type: string, champs?: object[]}[]} champs
 * @returns {object[][]} les lignes, ou `[]` si rien n'est déclaré
 */
export function lignesDeStructure(champs = null, profondeur = 1) {
  const dits = (Array.isArray(champs) ? champs : []).filter((champ) => texte(champ?.nom));
  if (!dits.length) return [];

  const lignes = [[
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.LOCALE, "structure attendue"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.PONCTUATION, "[")
  ]];

  const poser = (liste, niveau) => {
    liste.forEach((champ, rang) => {
      const virgule = rang < liste.length - 1 ? [jeton(JETON.PONCTUATION, ",")] : [];
      const dedans = (Array.isArray(champ.champs) ? champ.champs : []).filter((sous) => texte(sous?.nom));

      if (dedans.length) {
        lignes.push([
          espace(RETRAIT.repeat(niveau)),
          jeton(JETON.SUJET, texte(champ.nom)),
          jeton(JETON.PONCTUATION, ":"),
          espace(),
          jeton(JETON.PONCTUATION, "[")
        ]);
        poser(dedans, niveau + 1);
        lignes.push([espace(RETRAIT.repeat(niveau)), jeton(JETON.PONCTUATION, "]"), ...virgule]);
        return;
      }

      // Un champ à choix fermé dit ses valeurs plutôt que son type : « texte »
      // n'apprend rien quand seuls « Meyerhoff » et « Constante » sont admis.
      // Elles se séparent d'un « ou », comme partout ailleurs dans le langage.
      // Les valeurs telles que l'utilitaire les déclare — au format nu, ou avec
      // leur sens. Le fichier n'écrit que le mot : le sens sert aux écrans à
      // colorer, il n'a rien à faire dans le code qu'on relit. Relire la forme
      // ici plutôt que d'appeler `valeursDeclarees` ferait deux lectures d'une
      // même déclaration, et c'est ainsi qu'elles divergent (règle 4).
      const admises = valeursDeclarees(champ).map((valeur) => valeur.nom);
      const dit = admises.length
        ? admises.flatMap((valeur, place) => [
            ...(place ? [espace(), jeton(JETON.MOT_CONDITION, "ou"), espace()] : []),
            jeton(JETON.VALEUR, `"${valeur}"`)
          ])
        : [jeton(JETON.VALEUR, `"${texte(champ.type) || "inconnu"}"`)];

      lignes.push([
        espace(RETRAIT.repeat(niveau)),
        jeton(JETON.SUJET, texte(champ.nom)),
        jeton(JETON.PONCTUATION, ":"),
        espace(),
        ...dit,
        ...virgule
      ]);
    });
  };

  poser(dits, profondeur + 1);
  lignes.push([espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.PONCTUATION, "]"), jeton(JETON.PONCTUATION, ",")]);
  return lignes;
}

/**
 * ```
 * const Hauteur du plancher bas = {
 *    type: "mesure",
 *    unité: "m",
 *    description: "Hauteur du plancher bas du logement le plus haut…",
 *    utilisation: "Entrée du classement en famille, article 3 de l'arrêté…",
 *    déjà utilisé dans: [
 *       Classement du bâtiment (incendie.ref)
 *    ]
 * };
 * ```
 *
 * ## Ce que ce bloc dit, et ce qu'il ne dit pas
 *
 * Elle **définit** un nom : ce qu'il désigne, comment il se mesure. Elle ne dit
 * pas ce qu'il vaut dans ce projet — une variable prend plusieurs valeurs au
 * fil d'une étude, et une définition qui porterait l'une d'elles cesserait
 * d'être vraie au premier versement.
 *
 * C'est ce qu'on lit **avant** d'écrire une règle : pour réutiliser un nom qui
 * existe plutôt que d'en inventer un voisin. Entre « Hauteur du plancher bas »
 * et « Hauteur du dernier plancher », on se trompe vite, et un nom mal
 * orthographié fabrique une seconde variable qui ne servira jamais.
 *
 * ## Pourquoi il en dit autant
 *
 * Dix-huit mois de chantier et douze mois d'études font des milliers de noms.
 * Si personne ne sait dire ce que fait celui-ci, chacun en recréera un voisin —
 * et la mémoire se remplira de synonymes qui ne se rejoignent jamais. Le nom, le
 * type et l'unité ne suffisent pas : il faut ce qu'il **désigne**, ce à quoi il
 * **sert**, et où il sert **déjà**.
 *
 * @param {{nom: string, type?: string, unite?: string, description?: string,
 *          utilisation?: string, usages?: {fonction: string, fichier: string}[]}} variable
 */
export function blocDeVariable({
  nom = "", type = "", unite = "", description = "", utilisation = "", usages = [], structure = null,
  ceQueLeProjetEnDit = null
} = {}, profondeur = 0) {
  const dit = texte(nom);
  if (!dit) return [];

  const dedans = profondeur + 1;
  const lignes = [[
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.MOT_CONST, "const"),
    espace(),
    // Le nom porte le jeton d'un sujet : c'est le même nom que les règles
    // citent, et il doit se colorer et se survoler comme lui.
    jeton(JETON.SUJET, dit),
    espace(),
    jeton(JETON.OPERATEUR, OPERATEUR.EGAL),
    espace(),
    jeton(JETON.PONCTUATION, "{")
  ]];

  const champ = (cle, valeur, virgule = true) => [
    espace(RETRAIT.repeat(dedans)),
    jeton(JETON.LOCALE, cle),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.VALEUR, `"${texte(valeur)}"`),
    ...(virgule ? [jeton(JETON.PONCTUATION, ",")] : [])
  ];

  lignes.push(champ("type", texte(type) || "inconnu"));
  if (texte(unite)) lignes.push(champ("unité", texte(unite)));
  lignes.push(champ("description", texte(description) || À_DÉCRIRE.description));
  lignes.push(champ("utilisation", texte(utilisation) || À_DÉCRIRE.utilisation));

  /**
   * Ce que le projet **porte** à son sujet, par nature.
   *
   * On ouvre ce fichier pour décider si l'on réutilise un nom ou si l'on en
   * crée un autre, et c'est souvent la vraie question : ce nom porte-t-il une
   * contrainte tranchée par un texte, un constat daté, une hypothèse que
   * personne n'a confirmée — ou rien du tout ?
   *
   * « Rien du tout » est la réponse la plus utile : un nom qu'une règle cite et
   * qu'aucune affirmation ne porte est un trou du raisonnement.
   *
   * Absent quand la carte n'a pas été demandée : le fichier ne prétend pas
   * répondre à une question qu'on ne lui a pas posée (règle 5).
   */
  if (texte(ceQueLeProjetEnDit)) lignes.push(champ("ce que le projet en dit", ceQueLeProjetEnDit));

  // Ce qu'un tableau contient, champ par champ. Une variable dont le type est
  // « tableau » ne dit rien tant qu'on ignore ce qu'il y a dans une ligne — et
  // c'est justement ce qu'il faut savoir pour appeler la fonction qui l'attend.
  lignes.push(...lignesDeStructure(structure, dedans));

  // Où elle sert déjà : la fonction, et le fichier où on la trouve. C'est la
  // liste qui empêche d'en recréer une treize millième — on voit d'un coup
  // d'œil que celle-ci fait déjà le travail.
  const emplois = (Array.isArray(usages) ? usages : []).filter((usage) => texte(usage?.fonction));
  lignes.push([
    espace(RETRAIT.repeat(dedans)),
    jeton(JETON.LOCALE, "déjà utilisé dans"),
    jeton(JETON.PONCTUATION, ":"),
    espace(),
    jeton(JETON.PONCTUATION, emplois.length ? "[" : "[]")
  ]);

  emplois.forEach((usage, rang) => {
    lignes.push([
      espace(RETRAIT.repeat(dedans + 1)),
      jeton(JETON.SUJET, texte(usage.fonction)),
      espace(),
      jeton(JETON.PONCTUATION, "("),
      jeton(JETON.CHEMIN, texte(usage.fichier) || "inconnu"),
      jeton(JETON.PONCTUATION, ")"),
      ...(rang < emplois.length - 1 ? [jeton(JETON.PONCTUATION, ",")] : [])
    ]);
  });

  if (emplois.length) lignes.push([espace(RETRAIT.repeat(dedans)), jeton(JETON.PONCTUATION, "]")]);

  lignes.push([espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.PONCTUATION, "}"), jeton(JETON.PONCTUATION, ";")]);
  return lignes;
}

/**
 * Ce qu'on écrit quand personne n'a encore écrit.
 *
 * Pas une phrase vague, pas un champ absent : une phrase qui **appelle** celui
 * qui passe à la remplir. Sur douze mille variables, une description manquante
 * qui ne se voit pas est une variable qu'on recréera.
 */
export const À_DÉCRIRE = {
  description: "À DÉCRIRE — que désigne exactement ce nom, et comment se mesure-t-il ?",
  utilisation: "À DÉCRIRE — dans quel calcul, selon quel texte, pour décider de quoi ?"
};

/**
 * `// ce qu'on écrit pour soi`
 *
 * Un commentaire n'est jamais interprété : il ne pose rien, ne conditionne
 * rien, et se relit tel quel. Il devient nécessaire dès qu'une règle passe
 * quinze lignes — expliquer pourquoi une condition existe est autre chose que
 * dire ce qu'elle teste.
 *
 * `note:` existait déjà, mais pour le **fichier** : une note en tête dit d'où
 * il vient. Un commentaire se met où l'on veut, et c'est ce qui manquait.
 */
export function ligneDeCommentaire(phrase = "", profondeur = 0) {
  const dit = texte(phrase);
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.COMMENTAIRE, dit.startsWith("//") || dit.startsWith("/*") ? dit : `// ${dit}`)
  ];
}

/**
 * `texte: arrêté du 31 janvier 1986 modifié, article 6`
 *
 * Le mot-clé **est** le type, et le type **est** l'origine de la valeur : une
 * ligne qui dit `règle:` est déduite, `document:` est lue, `calcul:` est
 * calculée. Rien à déclarer en plus, et une flèche de moins à taper.
 */
export function ligneDeProvenance({ type = PROVENANCE.TEXTE, quoi = "", par = "", le = "" } = {}, profondeur = 1, { regle = false } = {}) {
  const dit = texte(quoi);
  if (!dit) return null;

  // Une décision se signe. Quand on sait qui a tranché et quand, la ligne le
  // dit : sans nom ni date, une valeur choisie à la main se relit six mois
  // plus tard comme un fait établi, et personne ne sait plus que c'était un
  // choix. La mémoire le savait déjà et ne le montrait pas.
  if (texte(type) === PROVENANCE.DECISION && (texte(par) || texte(le))) {
    return ligneDeDecision({ quoi: dit, par, le }, profondeur);
  }

  // Dans une règle, la provenance se **déclare** : elle se pose en tête du
  // bloc, comme les `const` d'une fonction, et le nom de la locale reste le
  // type — `soit texte = …`, `soit document = …`. On sait ainsi d'où la règle
  // sort avant de lire ce qu'elle fait, plutôt qu'après.
  if (regle) return ligneDeLocale(texte(type) || PROVENANCE.TEXTE, dit, profondeur);

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.PROVENANCE, `${texte(type) || PROVENANCE.TEXTE}:`),
    espace(),
    jeton(JETON.SOURCE, dit)
  ];
}

/**
 * `parce que: "…"` — la preuve, sous la provenance qu'elle appuie.
 *
 * Elle est indentée d'un cran de plus : une preuve appartient à une provenance,
 * et le jour où une règle en portera plusieurs, on saura laquelle appuie
 * laquelle sans rien changer à la grammaire.
 */
export function ligneDePreuve(citation = "", profondeur = 2, { regle = false } = {}) {
  const dit = texte(citation).replace(/^[«"\u0027]\s*/, "").replace(/\s*[»"\u0027]$/, "");
  if (!dit) return null;

  // Dans une règle, la preuve se déclare comme la provenance : en tête, et au
  // même cran qu'elle. Indentée d'un de plus, elle paraissait appartenir à la
  // ligne du dessus alors qu'elle fonde le bloc entier.
  if (regle) return ligneDeLocale("parce que", dit, Math.max(1, profondeur));

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_RAISON, "parce que:"),
    espace(),
    jeton(JETON.RAISON, `"${dit}"`)
  ];
}

/**
 * `écarté: ardoise` — un possible que la décision a laissé de côté.
 *
 * ## Pourquoi ces lignes existent, et pourquoi elles sont plusieurs
 *
 * C'est **ce qui distingue une décision de tout le reste**, et c'est exactement
 * ce que personne ne retrouve six mois plus tard. « Pourquoi pas de l'ardoise ? »
 * a une réponse quelque part dans la tête de trois personnes — ou nulle part. Le
 * plus grand service que Mdall puisse rendre est de la garder.
 *
 * Une ligne par possible, jamais une phrase qui les énumère : trois écartés dans
 * une seule ligne ne se relisent pas, et le jour où l'un d'eux revient sur la
 * table on veut pouvoir le désigner.
 *
 * Le motif suit, indenté d'un cran, sous la forme qu'a déjà toute preuve dans ce
 * langage — `parce que:`. Il peut manquer : on se rappelle souvent qu'on a
 * écarté l'ardoise sans se rappeler l'argument, et l'écarté sans son motif vaut
 * mieux que rien.
 */
export function lignesDesEcartes(ecartes = [], profondeur = 1) {
  const lignes = [];

  for (const ecarte of Array.isArray(ecartes) ? ecartes : []) {
    const quoi = texte(ecarte?.quoi);
    if (!quoi) continue;

    lignes.push([
      espace(RETRAIT.repeat(Math.max(1, profondeur))),
      jeton(JETON.MOT_ECARTE, "écarté:"),
      espace(),
      jeton(JETON.ECARTE, quoi)
    ]);

    const pourquoi = ligneDePreuve(ecarte?.pourquoi, profondeur + 1);
    if (pourquoi) lignes.push(pourquoi);
  }

  return lignes;
}

/**
 * `question: quelle couverture pour le bâtiment A ?`
 *
 * Sans elle il reste une valeur, et une valeur n'engage personne. Elle ouvre le
 * bloc parce que c'est par elle qu'on le lit : on cherche « ce sur quoi on a
 * tranché » avant de chercher ce qui a été retenu.
 */
export function ligneDeQuestion(question = "", profondeur = 1) {
  const dit = texte(question);
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.PROVENANCE, "question:"),
    espace(),
    jeton(JETON.SOURCE, dit)
  ];
}

/** `statut: retenu` — l'état du raisonnement dans ce projet. */
export function ligneDeStatut(statut = "", profondeur = 1) {
  const dit = texte(statut);
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_STATUT, "statut:"),
    espace(),
    jeton(JETON.STATUT, dit)
  ];
}

/**
 * `le: 12 mars 2026` — quand un constat a été fait.
 *
 * Propre aux constats, et indispensable à eux : un constat sans date ne vaut
 * rien. « L'escalier n'était pas encloisonné » — quand ? avant ou après la
 * reprise ? Une observation qu'on ne peut pas situer dans le temps ne se
 * conteste ni ne se lève.
 */
export function ligneDeDate(quand = "", profondeur = 1) {
  const dit = texte(quand);
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_DATE, "le:"),
    espace(),
    jeton(JETON.DATE, dit)
  ];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Les blocs : une forme par nature
 *
 * Un constat ne se présente pas comme une règle, et une règle pas comme une
 * contrainte. Chaque nature a sa forme, et son extension de fichier l'annonce —
 * `.ref`, `.ctr`, `.ddb`, `.hyp`, `.cst`. On sait ce qu'on lit avant d'avoir lu.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Une accolade, seule sur sa ligne.
 *
 * ## Pourquoi des accolades, alors que l'indentation suffisait
 *
 * Elle suffisait à la machine, pas à l'œil. Un bloc de sept lignes dont la
 * fin ne se marque que par un retour au niveau zéro se relit mal sur un écran,
 * et se relit très mal quand deux blocs se suivent. L'accolade dit où le bloc
 * finit, sans qu'il faille compter les espaces.
 *
 * Elle n'est pas un mot de programmeur : c'est une **borne**, et un CCTP en
 * emploie d'autres pour la même raison. Elle rend en outre le pliage possible,
 * qui est ce qui rend un fichier de cent affirmations lisible.
 *
 * On ne dépend donc plus de la seule mise en forme du rendu : le texte brut,
 * copié dans un éditeur quelconque, garde sa structure.
 */
export function ligneOuvrante(profondeur = 0) {
  return [espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.ACCOLADE, "{")];
}

export function ligneFermante(profondeur = 0) {
  return [espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.ACCOLADE, "}")];
}

/** Une ligne vide, qui sépare deux blocs. */
export function ligneVide() {
  return [];
}

/**
 * `zone: Bâtiment A {` — l'ouverture d'une section de portée.
 *
 * ## Pourquoi la zone est dans le fichier, et non dans l'arborescence
 *
 * L'unité de production est le **domaine** : une étude incendie touche
 * plusieurs zones d'un coup. Avec la zone en répertoire, une seule étude se
 * dispersait en autant de fichiers, donc autant de groupes dans le diff, pour
 * un seul acte.
 *
 * La zone est une **facette**, pas un lieu. Le fichier s'organise comme on
 * produit ; la Mémoire s'organise comme on consulte, et c'est là que la vue par
 * zone a sa place, sans coûter un répertoire.
 *
 * « Toutes zones » vient toujours en premier : ce qui vaut partout se lit avant
 * ce qui ne vaut qu'ici.
 */
export function ligneDeZone(zone = TOUTES_ZONES, profondeur = 0) {
  return [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    jeton(JETON.MOT_ZONE, "zone:"),
    espace(),
    jeton(JETON.ZONE, texte(zone) || TOUTES_ZONES),
    espace(),
    jeton(JETON.ACCOLADE, "{")
  ];
}

/**
 * Une règle, telle qu'un référentiel la porte. Fichier `.ref`.
 *
 * ```
 * fonction Classement du bâtiment(Logements superposés, Hauteur du plancher bas) {
 *    soit texte = "arrêté du 31 janvier 1986 modifié, article 3, 3°";
 *    soit parce que = "Troisième famille B : …";
 *
 *    si (Logements superposés = oui)
 *    et (Hauteur du plancher bas <= 28 m)
 *    alors ("3e famille B");
 * }
 * ```
 *
 * Aucune valeur de projet n'y figure, et c'est tout l'intérêt : ce bloc vaut
 * pour mille bâtiments. Aucun statut non plus — un référentiel n'a pas d'état
 * dans un projet.
 *
 * @param {number} profondeur le cran d'indentation du bloc, dans sa zone
 */
export function blocDeRegle({
  sujet = "", quoi = "", conditions = [], alors = "", sinon = "", sauf = [],
  provenance = null, preuve = "", importe = [], enregistre = null, portee = PORTEE_DUNE_FONCTION
} = {}, profondeur = 0) {
  const dedans = profondeur + 1;
  const toutes = [...(Array.isArray(conditions) ? conditions : []), ...(Array.isArray(sauf) ? sauf : [])];

  const commeUneRegle = { regle: true };

  const corps = [];

  // D'où viennent les entrées, d'abord : une fonction lue seule doit dire où
  // aller lire ce dont elle a besoin, sinon il faut parcourir les autres
  // fichiers pour reconstituer la chaîne.
  for (const entree of Array.isArray(importe) ? importe : []) {
    const ligne = ligneDImport(entree, dedans);
    if (ligne) corps.push(ligne);
  }
  if (corps.length) corps.push(ligneVide());

  // Puis les locales, comme les `const` d'une fonction : ce qui fonde la règle
  // se lit avant ce qu'elle fait. Elles étaient en bas, après la conclusion —
  // c'est-à-dire là où on ne les cherche plus.
  const localesDebut = corps.length;
  const depuis = provenance ? ligneDeProvenance(provenance, dedans, commeUneRegle) : null;
  if (depuis) corps.push(depuis);

  const pourquoi = ligneDePreuve(preuve, dedans, commeUneRegle);
  if (pourquoi) corps.push(pourquoi);

  // Une ligne vide entre ce qu'on pose et ce qu'on en fait : sans elle, les
  // deux se lisent comme une seule suite d'instructions.
  if (corps.length > localesDebut) corps.push(ligneVide());

  (Array.isArray(conditions) ? conditions : []).forEach((condition, rang) => {
    corps.push(ligneDeCondition(rang === 0 ? "si" : (condition.joint || "et"), condition, dedans, commeUneRegle));
  });

  // La conclusion, et ce qu'on en fait. Un `enregistre` répond à la question
  // qui vient toujours après « alors quoi ? » : où est-ce écrit, et pour quelle
  // partie de l'ouvrage.
  if (texte(alors)) {
    corps.push(...(enregistre
      ? lignesDeConclusion("alors", { ...enregistre, sujet: texte(enregistre.sujet) || texte(sujet), valeur: alors, zones: portee }, dedans)
      : [ligneDeConsequence("alors", alors, "", dedans, commeUneRegle)]));
  }
  if (texte(sinon)) {
    corps.push(...(enregistre
      ? lignesDeConclusion("sinon", { ...enregistre, sujet: texte(enregistre.sujet) || texte(sujet), valeur: sinon, zones: portee }, dedans)
      : [ligneDeConsequence("sinon", sinon, "", dedans, commeUneRegle)]));
  }

  for (const exception of (Array.isArray(sauf) ? sauf : [sauf]).filter(Boolean)) {
    corps.push(ligneDeCondition("sauf si", exception, dedans, commeUneRegle));
  }

  // La portée est un paramètre, et le premier : une même règle s'applique à
  // plusieurs parties de l'ouvrage, et la recopier par zone en ferait trois
  // règles à maintenir pour un seul raisonnement.
  const entrees = [texte(portee) || PORTEE_DUNE_FONCTION, ...toutes.map((condition) => condition?.sujet)];

  const tete = [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    ...ligneDeDonnee(sujet, entrees, commeUneRegle)
  ];

  // Le commentaire vit **dans** la fonction, en première ligne. Au-dessus, il
  // appartenait au fichier : copier la fonction pour la porter dans un autre
  // projet — ce qu'on fait, et ce qu'on fera de plus en plus — laissait
  // l'explication derrière. Une fonction auto-portée emporte ce qu'elle dit
  // d'elle-même.
  const dit = ligneDeCommentaire(quoi, dedans);

  return corps.length || dit
    ? [
        [...tete, espace(), jeton(JETON.ACCOLADE, "{")],
        ...(dit ? [dit, ...(corps.length ? [ligneVide()] : [])] : []),
        ...corps,
        ligneFermante(profondeur)
      ]
    : [tete];
}

/**
 * `const Profondeur hors gel à retenir;`
 *
 * Une locale d'une fonction, déclarée avant d'être posée. Elle ne vaut rien
 * encore : les deux lignes qui suivent disent ce qu'elle vaudra, selon qu'on lui
 * a passé la valeur ou qu'il faut aller la lire.
 *
 * Le mot est `const` et non `soit` : `soit` déclare **et** pose en une ligne
 * (`soit texte = "…"`), ce qui ne convient pas à une valeur dont on ne connaît
 * pas encore la branche. Le nom porte le jeton d'un sujet, parce que c'en est
 * un : c'est ce nom-là que l'appel cite plus bas.
 */
export function ligneDeLocaleVide(nom = "", profondeur = 1) {
  const dit = texte(nom);
  if (!dit) return null;

  return [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_CONST, "const"),
    espace(),
    jeton(JETON.NOM_LOCAL, dit),
    jeton(JETON.PONCTUATION, ";")
  ];
}

/**
 * `alors (Profondeur hors gel à retenir = Profondeur hors gel)`
 * `sinon (Profondeur hors gel à retenir = importe (variable: …, depuis: …, zones: …));`
 *
 * Une branche qui **pose une locale** plutôt que de conclure une valeur.
 *
 * ## Pourquoi cette forme existe
 *
 * C'est la variante, écrite dans le langage. Une fonction reçoit ses entrées
 * quand on l'appelle avec des valeurs essayées ; le reste du temps on ne lui
 * passe rien, et elle va lire ce que la mémoire porte. Les deux cas sont le même
 * appel, et c'est exactement ce qu'un lecteur doit comprendre pour savoir
 * comment s'en servir.
 *
 * Sans elle, la fonction aurait un `importe` en tête, sans dire qu'un paramètre
 * peut le remplacer — et le jour où l'on teste une altitude, l'écran ferait
 * quelque chose que le code ne dit pas.
 *
 * Le point-virgule ferme la seconde branche, pas la première : c'est une seule
 * instruction en deux lignes.
 */
export function ligneDAffectation(mot, { nom = "", valeur = "", importe = null, fin = false } = {}, profondeur = 1) {
  const pose = texte(nom);
  if (!pose) return null;

  const jetons = [
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.MOT_CONDITION, texte(mot)),
    espace(),
    jeton(JETON.PONCTUATION, "("),
    // À gauche une locale, à droite le sujet du projet qu'on lui donne : deux
    // couleurs, parce que ce sont deux choses.
    jeton(JETON.NOM_LOCAL, pose),
    espace(),
    jeton(JETON.OPERATEUR, OPERATEUR.EGAL),
    espace()
  ];

  // Ce qu'elle prend : un autre nom, ou ce que la mémoire porte à une adresse.
  // L'`importe` est ici une **expression**, pas une instruction : son
  // point-virgule appartient à l'affectation, et le garder en ferait deux.
  if (importe) {
    const emprunt = (ligneDImport(importe, 0) ?? []).slice(1);
    jetons.push(...emprunt.filter((piece) => piece?.texte !== ";"));
  } else {
    jetons.push(jeton(JETON.SUJET, texte(valeur)));
  }

  jetons.push(jeton(JETON.PONCTUATION, ")"));
  if (fin) jetons.push(jeton(JETON.PONCTUATION, ";"));
  return jetons;
}

/**
 * ```
 * résultat = agent-D (
 *    utilitaire: dimensionnement_fondations_superficielles,
 *    version: V1,
 *    zones: Bâtiment A,
 *    Profondeur hors gel: Profondeur hors gel à retenir
 * );
 * ```
 *
 * **L'appel d'un agent : la seule ligne d'une fonction qui ne se lit pas.**
 *
 * ## Ce qui est opaque, et ce qui ne l'est pas
 *
 * La fonction qui contient cette ligne s'écrit en entier : son commentaire, ses
 * entrées, ses branches, ce qu'elle enregistre. Ce qui ne s'écrit pas est ce que
 * l'agent fait — et c'est **cette ligne-ci** qui le dit, en le nommant.
 *
 * Un pré-dimensionnement de fondations parcourt trois cent quatre-vingt-huit
 * combinaisons ; sa loi **est** le produit, et l'écrire dans un projet
 * reviendrait à la donner. On ne peut pas non plus la taire : il a décidé de
 * cotes, et « ne pas savoir n'autorise pas à prétendre qu'il n'y a rien ».
 *
 * ## Ce que la ligne garde, et pourquoi
 *
 * L'agent, l'utilitaire, sa **version**, et ce qu'on lui passe. La version est
 * ce qui distingue « la cote a changé » de « notre façon de la trouver a
 * changé » : sans elle, une reprise six mois plus tard passerait pour un projet
 * qui a bougé.
 *
 * ## Pourquoi un bloc, et non une ligne
 *
 * Parce qu'un appel porte ses arguments. À trois entrées la ligne dépasse la
 * largeur d'un écran, et surtout le diff bougerait tout l'appel dès qu'une
 * seule entrée change — la même raison qui a mis `enregistre` sur plusieurs
 * lignes.
 *
 * @param {{agent?: string, utilitaire: string, version?: string,
 *          arguments?: {nom: string, valeur: string}[]}} appel
 * @returns {object[][]} les lignes du bloc
 */
export function blocDAppelDAgent({
  agent = AGENT.D, utilitaire = "", version = "", arguments: args = []
} = {}, profondeur = 1) {
  const nom = texte(utilitaire);
  if (!nom) return [];

  const dedans = profondeur + 1;
  const champs = [
    { nom: "utilitaire", valeur: nom, type: JETON.SOURCE, duLangage: true },
    ...(texte(version) ? [{ nom: "version", valeur: texte(version), type: JETON.SOURCE, duLangage: true }] : []),
    ...(Array.isArray(args) ? args : [])
      .filter((argument) => texte(argument?.nom))
      .map((argument) => ({
        nom: texte(argument.nom),
        valeur: texte(argument.valeur),
        // `zones` est un mot du langage et sa valeur une portée ; les autres
        // arguments nomment des variables du projet et reçoivent des locales.
        duLangage: texte(argument.nom) === "zones",
        type: texte(argument.nom) === "zones" ? JETON.PORTEE : JETON.NOM_LOCAL
      }))
  ];

  const rendues = [[
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.NOM_LOCAL, "résultat"),
    espace(),
    jeton(JETON.OPERATEUR, OPERATEUR.EGAL),
    espace(),
    jeton(JETON.MOT_NATIF, AGENTS.includes(texte(agent)) ? texte(agent) : AGENT.D),
    espace(),
    jeton(JETON.PONCTUATION, "(")
  ]];

  champs.forEach((champ, rang) => {
    rendues.push([
      espace(RETRAIT.repeat(dedans)),
      jeton(champ.duLangage ? JETON.LOCALE : JETON.SUJET, champ.nom),
      jeton(JETON.PONCTUATION, ":"),
      espace(),
      jeton(champ.type, champ.valeur),
      ...(rang < champs.length - 1 ? [jeton(JETON.PONCTUATION, ",")] : [])
    ]);
  });

  rendues.push([
    espace(RETRAIT.repeat(Math.max(1, profondeur))),
    jeton(JETON.PONCTUATION, ")"),
    jeton(JETON.PONCTUATION, ";")
  ]);
  return rendues;
}


/**
 * `fonction Prédimensionnement des fondations superficielles(zones, Profondeur hors gel, …)`
 *
 * La tête d'une fonction, sans son accolade. Elle sert deux fois : au bloc qu'on
 * écrit, et à la ligne qu'on recolore dans un diff. Une seconde version pour le
 * diff finirait par colorer autrement ce qu'on a écrit.
 *
 * **Il n'y a qu'un genre de fonction.** La v4.5 en avait inventé un second —
 * `fonction native …` —, ce qui laissait croire qu'une fonction pouvait être
 * opaque. Elle ne l'est jamais : ce qui l'est, c'est l'agent qu'elle appelle, et
 * c'est la ligne d'appel qui le porte.
 */
export function ligneDeFonction(nom = "", entrees = []) {
  return [
    jeton(JETON.MOT_FONCTION, "fonction"),
    espace(),
    jeton(JETON.SUJET, texte(nom)),
    jeton(JETON.PONCTUATION, "("),
    ...(Array.isArray(entrees) ? entrees : []).filter(Boolean).flatMap((entree, rang) => [
      ...(rang ? [jeton(JETON.PONCTUATION, ","), espace()] : []),
      jeton(JETON.PARAMETRE, texte(entree))
    ]),
    jeton(JETON.PONCTUATION, ")")
  ];
}


/**
 * Le nom sous lequel une fonction reçoit sa portée.
 *
 * Un seul endroit : la signature, l'`importe`, l'appel de l'agent et
 * l'`enregistre` doivent écrire le même mot, faute de quoi la fonction se
 * lirait comme si elle changeait de portée en cours de route.
 */
export const PORTEE_DUNE_FONCTION = "zones";

/** Le nom de la locale qui porte l'entrée retenue pour un appel. */
export function nomARetenir(entree = "") {
  const dit = texte(entree);
  return dit ? `${dit} à retenir` : "";
}

/**
 * ```
 * fonction Prédimensionnement des fondations superficielles(zones, Profondeur hors gel, Données d'entrée…) {
 *    // Dimensionne les massifs superficiels d'une zone. La loi de calcul
 *    // appartient à l'utilitaire — elle ne s'écrit pas ici.
 *
 *    const Profondeur hors gel à retenir;
 *    si (Profondeur hors gel renseigné)
 *    alors (Profondeur hors gel à retenir = Profondeur hors gel)
 *    sinon (Profondeur hors gel à retenir = importe (variable: Profondeur hors gel, depuis: sol.ctr, zones: zones));
 *
 *    résultat = agent-D (
 *       utilitaire: dimensionnement_fondations_superficielles,
 *       version: V1,
 *       zones: zones,
 *       Profondeur hors gel: Profondeur hors gel à retenir
 *    );
 *
 *    enregistre (
 *       Résultat du calcul des fondations superficielles: résultat,
 *       dans: structure.ctr,
 *       zones: zones
 *    )
 * }
 * ```
 *
 * Une fonction du projet qui **appelle un agent**.
 *
 * ## Une fonction s'écrit toujours en entier
 *
 * C'est la règle, et c'est ce qui a été corrigé. Tout ce que cette fonction
 * fait est lisible : son commentaire, ses entrées, la branche qui décide quelle
 * profondeur retenir, ce qu'elle range et où. Une seule ligne ne se lit pas —
 * l'appel — et c'est elle qui porte le mot.
 *
 * ## Ce que le lecteur doit pouvoir en tirer
 *
 * Quatre questions, et le bloc y répond dans cet ordre :
 *
 * 1. **Que consomme-t-elle ?** La signature les nomme toutes — la portée
 *    d'abord, puis chaque entrée.
 * 2. **Comment l'appeler ?** L'appel montre ses arguments, un par ligne.
 * 3. **Sous quelle forme sort le résultat ?** Il porte un nom, et ce nom se
 *    déclare dans `variables-du-projet.ref` avec sa `structure attendue`.
 * 4. **Où est-il rangé ?** L'`enregistre` le dit — le fichier, et la portée.
 *
 * ## La portée est un paramètre, pas une valeur
 *
 * La signature nomme `zones`, et le corps ne cite que `zones` — jamais
 * `batiment-a`. Une déclaration qui porterait la zone du jour se lirait comme
 * une fonction propre à ce bâtiment, alors qu'elle vaut pour tous : c'est
 * l'**appel** qui dit sur quoi elle a tourné, et le `.ctr` qui garde le
 * résultat, zone par zone. Écrire la zone ici en ferait autant de fonctions
 * qu'il y a de bâtiments, toutes identiques, toutes à corriger séparément.
 *
 * @param {{nom: string, quoi?: string,
 *          entrees?: {nom: string, depuis?: string}[],
 *          agent?: string, utilitaire?: string, version?: string,
 *          enregistre?: {sujet: string, dans?: string}[]}} fonction
 * @returns {object[][]} les lignes du bloc
 */
export function blocDeFonction({
  nom = "", quoi = "", entrees = [],
  agent = AGENT.D, utilitaire = "", version = "", enregistre = []
} = {}, profondeur = 0) {
  const dit = texte(nom);
  if (!dit) return [];

  const dedans = profondeur + 1;
  // Le nom du paramètre, et rien d'autre. Voir plus haut.
  const zones = PORTEE_DUNE_FONCTION;
  const prises = (Array.isArray(entrees) ? entrees : []).filter((entree) => texte(entree?.nom));

  const corps = [];

  // Ce qu'on retient pour chaque entrée : ce qu'on nous a passé, sinon ce que la
  // mémoire porte. C'est la variante écrite dans le langage — le même appel,
  // avec ou sans valeur essayée.
  for (const entree of prises) {
    const nomDeLEntree = texte(entree.nom);
    const local = nomARetenir(nomDeLEntree);
    const depuis = texte(entree.depuis);

    // Sans adresse en mémoire, il n'y a pas de branche à écrire : l'entrée est
    // ce qu'on passe, et rien d'autre. Inventer un `importe` vers un fichier
    // qu'on ne connaît pas ferait lire « va chercher là » là où il n'y a rien.
    if (!depuis) continue;

    corps.push(ligneDeLocaleVide(local, dedans));
    corps.push(ligneDeCondition("si", { sujet: nomDeLEntree, operateur: OPERATEUR.RENSEIGNE }, dedans, { regle: true }));
    corps.push(ligneDAffectation("alors", { nom: local, valeur: nomDeLEntree }, dedans));
    corps.push(ligneDAffectation("sinon", {
      nom: local,
      importe: { variable: nomDeLEntree, depuis, zones },
      fin: true
    }, dedans));
    corps.push(ligneVide());
  }

  corps.push(...blocDAppelDAgent({
    agent,
    utilitaire,
    version,
    arguments: [
      { nom: "zones", valeur: zones },
      ...prises.map((entree) => ({
        nom: texte(entree.nom),
        // La locale quand il y en a une, l'entrée elle-même sinon.
        valeur: texte(entree.depuis) ? nomARetenir(entree.nom) : texte(entree.nom)
      }))
    ]
  }, dedans));

  const sorties = (Array.isArray(enregistre) ? enregistre : []).filter((sortie) => texte(sortie?.sujet));
  if (sorties.length) corps.push(ligneVide());

  for (const sortie of sorties) {
    corps.push(...blocDEnregistrement({
      // Ce que la fonction range est **ce que l'agent vient de rendre** : la
      // ligne cite la locale, elle ne recopie pas sa valeur. Une valeur écrite
      // à deux endroits finit par diverger, et celle-ci en a quatre-vingts.
      valeurs: [{ sujet: texte(sortie.sujet), valeur: "résultat", reference: true }],
      dans: texte(sortie.dans),
      zones
    }, dedans));
  }

  const tete = [
    espace(RETRAIT.repeat(Math.max(0, profondeur))),
    ...ligneDeFonction(dit, [zones, ...prises.map((entree) => texte(entree.nom))]),
    espace(),
    jeton(JETON.ACCOLADE, "{")
  ];

  const explique = ligneDeCommentaire(quoi, dedans);

  return [
    tete,
    ...(explique ? [explique, ligneVide()] : []),
    ...corps.filter(Boolean),
    ligneFermante(profondeur)
  ];
}


/**
 * `alors ( enregistre ( … ) );` — la conclusion, et ce qu'elle écrit.
 *
 * Deux niveaux de parenthèses, comme un appel dans un appel : c'est ce que
 * c'est. `alors` dit que la branche est prise, `enregistre` dit ce qu'on en
 * fait — et les séparer permet de conclure sans rien écrire, ce qui arrive
 * pour une règle qui ne fait que produire une valeur intermédiaire.
 */
export function lignesDeConclusion(mot, enregistre = {}, profondeur = 1) {
  return [
    [
      espace(RETRAIT.repeat(Math.max(1, profondeur))),
      jeton(JETON.MOT_CONDITION, texte(mot)),
      espace(),
      jeton(JETON.PONCTUATION, "(")
    ],
    ...blocDEnregistrement(enregistre, profondeur + 1),
    [espace(RETRAIT.repeat(Math.max(1, profondeur))), jeton(JETON.PONCTUATION, ")"), jeton(JETON.PONCTUATION, ";")]
  ];
}

/**
 * Une affirmation de projet. Fichiers `.ctr`, `.ddb`, `.hyp`, `.cst`.
 *
 * ```
 * Colonne sèche = "exigée, une colonne sèche de 65 mm par escalier" {
 *    règle: Colonne sèche — arrêté du 31 janvier 1986, article 98
 *    statut: retenu
 * }
 * ```
 *
 * La règle n'est pas recopiée ici : elle a son fichier, à côté.
 *
 * Une affirmation qui ne porte rien d'autre que sa valeur ne s'entoure pas
 * d'accolades : une paire de bornes autour de rien serait du bruit.
 */
export function blocDAffirmation({
  sujet = "", valeur = "", unite = "", provenance = null, preuve = "", statut = "", le = "",
  zone = "", virgule = false,
  // Ce qui fait une décision. Absent partout ailleurs : une contrainte ne
  // tranche rien, elle s'impose.
  decision = null
} = {}, profondeur = 0) {
  const dedans = profondeur + 1;
  const corps = [];

  // La question ouvre le bloc : c'est par elle qu'on lit une décision, et on la
  // cherche avant de chercher ce qui a été retenu.
  const demande = ligneDeQuestion(decision?.question, dedans);
  if (demande) corps.push(demande);

  // La date passe avant la provenance : un constat se situe d'abord dans le
  // temps, et c'est la première question qu'on lui pose.
  const quand = ligneDeDate(le, dedans);
  if (quand) corps.push(quand);

  const depuis = provenance ? ligneDeProvenance(provenance, dedans) : null;
  if (depuis) corps.push(depuis);

  const pourquoi = ligneDePreuve(preuve, dedans + 1);
  if (pourquoi) corps.push(pourquoi);

  // Les écartés après la provenance : on sait d'abord qui a tranché, puis entre
  // quoi. L'inverse ferait lire une liste avant de savoir de qui elle vient.
  corps.push(...lignesDesEcartes(decision?.ecartes, dedans));

  const etat = ligneDeStatut(statut, dedans);
  if (etat) corps.push(etat);

  // Dans un tableau de valeurs, la tête porte la **zone** et non le sujet : le
  // sujet est écrit une fois, au-dessus. `Bâtiment A: "CF 1/2 h"` — un
  // deux-points, comme un champ, parce que c'en est un.
  const tete = texte(zone)
    ? [
        espace(RETRAIT.repeat(Math.max(0, profondeur))),
        jeton(JETON.ZONE, texte(zone)),
        jeton(JETON.PONCTUATION, ":"),
        espace(),
        ...jetonsDeValeur(valeur, unite)
      ]
    : [
        espace(RETRAIT.repeat(Math.max(0, profondeur))),
        ...ligneDAffirmation({ sujet, valeur, unite })
      ];

  const fin = virgule ? [jeton(JETON.PONCTUATION, ",")] : [];

  return corps.length
    ? [
        [...tete, espace(), jeton(JETON.ACCOLADE, "{")],
        ...corps,
        [...ligneFermante(profondeur), ...fin]
      ]
    : [[...tete, ...fin]];
}

/**
 * Une variable et ses valeurs, une par zone.
 *
 * ```
 * Degré coupe-feu des planchers = [
 *    Toutes zones: "CF 1 h" {
 *       règle: arrêté du 31 janvier 1986, article 6
 *       statut: retenu
 *    },
 *    Bâtiment A: "CF 1/2 h" { … }
 * ];
 * ```
 *
 * ## Pourquoi un tableau, et non trois sections
 *
 * Le fichier se découpait par zone, et le nom de la variable se répétait dans
 * chacune. Trois fois le même nom à trois endroits différents, pour une seule
 * chose : **une variable du projet, qui prend une valeur par partie
 * d'ouvrage**. Chercher « degré coupe-feu des planchers » donnait trois
 * réponses sans dire qu'il s'agissait de la même.
 *
 * Écrite ainsi, la question qu'il faut se poser devient impossible à éviter :
 * *dans quelle zone ?*. C'est pour cela que `importe` porte lui aussi une
 * portée — emprunter une variable sans dire laquelle reviendrait à en prendre
 * une au hasard.
 *
 * Chaque entrée garde sa provenance et son statut : ce sont deux décisions
 * différentes, prises peut-être par deux personnes, à deux dates. Les mettre en
 * commun effacerait ce que la mémoire existe pour tenir.
 *
 * Une valeur unique qui vaut partout n'ouvre pas de tableau : une paire de
 * crochets autour d'une seule entrée serait du bruit.
 */
export function blocParZone({ sujet = "", valeurs = [] } = {}, profondeur = 0) {
  const entrees = (Array.isArray(valeurs) ? valeurs : []).filter((entree) => entree);
  if (!entrees.length) return [];

  const seule = entrees.length === 1 && texte(entrees[0].zone) === TOUTES_ZONES;
  if (seule) return blocDAffirmation({ ...entrees[0], sujet, zone: "" }, profondeur);

  const dedans = profondeur + 1;

  return [
    [
      espace(RETRAIT.repeat(Math.max(0, profondeur))),
      jeton(JETON.SUJET, texte(sujet)),
      espace(),
      jeton(JETON.OPERATEUR, OPERATEUR.EGAL),
      espace(),
      jeton(JETON.PONCTUATION, "[")
    ],
    ...entrees.flatMap((entree, rang) => blocDAffirmation(
      { ...entree, sujet, zone: texte(entree.zone) || TOUTES_ZONES, virgule: rang < entrees.length - 1 },
      dedans
    )),
    [espace(RETRAIT.repeat(Math.max(0, profondeur))), jeton(JETON.PONCTUATION, "]"), jeton(JETON.PONCTUATION, ";")]
  ];
}

/**
 * Un fichier entier : ses zones, et les blocs de chacune.
 *
 * ## L'ordre, et le blanc entre les blocs
 *
 * « Toutes zones » d'abord : ce qui vaut partout se lit avant ce qui ne vaut
 * qu'ici. Puis les zones dans l'ordre où le projet les a découpées.
 *
 * Une ligne vide sépare deux blocs. Ce n'est pas de l'ornement : sans elle,
 * l'accolade fermante d'un bloc et la tête du suivant se collent, et l'œil ne
 * voit plus où l'un finit.
 *
 * @param {{zone: string, blocs: object[][]}[]} sections
 */
export function corpsDuFichier(sections = []) {
  const lignes = [];

  const rangees = (Array.isArray(sections) ? sections : []).filter((section) => section?.blocs?.length);
  rangees.forEach((section, rang) => {
    if (rang > 0) lignes.push(ligneVide());
    lignes.push(ligneDeZone(section.zone));

    section.blocs.forEach((bloc, position) => {
      if (position > 0) lignes.push(ligneVide());
      lignes.push(...bloc);
    });

    lignes.push(ligneFermante(0));
  });

  return lignes;
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'en-tête d'un fichier
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Le nom d'un fichier : son sujet, et l'extension qui dit ce qu'il contient.
 *
 * ## Pourquoi une extension par nature
 *
 * Deux `incendie.mdall` à deux endroits de l'arborescence n'ont pas de sens, et
 * c'est dangereux : on ouvre l'un en croyant l'autre. L'extension dit ce qu'on
 * lit avant de l'avoir lu, comme `.html`, `.css` et `.js` disent trois choses
 * différentes du même `app`.
 *
 * ```
 * escalier-b/incendie.ref    les règles appliquées
 * escalier-b/incendie.ctr    ce qui s'impose
 * escalier-b/incendie.ddb    ce qui a été relevé
 * escalier-b/incendie.hyp    ce qu'on suppose
 * escalier-b/incendie.cst    ce qui a été constaté, à une date
 * escalier-b/incendie.crp    ce qui est entré au dossier
 * ```
 *
 * Même nom de base, extensions différentes : c'est le même sujet, vu sous cinq
 * angles. Et chaque extension annonce une **forme** — une règle ne se présente
 * pas comme un constat.
 */
/**
 * L'extension de ce dont personne n'a déclaré la nature.
 *
 * Elle vit ici, avec les fonctions qui nomment les fichiers : c'est leur défaut,
 * et un défaut qui se déclare ailleurs finit par ne plus être le même.
 * `memoire-rangement.js` la reprend.
 */
export const SANS_NATURE = "mdall";

export function nomDeFichier(chemin = [], extension = SANS_NATURE) {
  const morceaux = (Array.isArray(chemin) ? chemin : [chemin]).map(texte).filter(Boolean);
  const dernier = morceaux[morceaux.length - 1] ?? "memoire";
  return `${normaliser(dernier)}.${texte(extension) || SANS_NATURE}`;
}

/**
 * « escalier-b/incendie.ctr » — le chemin entier.
 *
 * L'extension **se donne**. Le défaut est `.mdall`, qui veut dire « personne ne
 * s'est prononcé sur la nature » : c'est une alerte, pas un repli commode. Le
 * diff d'une proposition l'appelait sans extension, et affichait donc
 * `memoire/donnees-de-base.mdall` pour un fichier que la mémoire nomme
 * `donnees-de-base.ddb` — un défaut invisible, parce qu'un défaut plausible.
 */
export function cheminDeFichier(chemin = [], extension = SANS_NATURE) {
  const morceaux = (Array.isArray(chemin) ? chemin : [chemin]).map(texte).filter(Boolean);
  if (morceaux.length < 2) return nomDeFichier(morceaux, extension);
  return `${morceaux.slice(0, -1).map(normaliser).join("/")}/${nomDeFichier(morceaux, extension)}`;
}

function normaliser(morceau) {
  return texte(morceau)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "memoire";
}

/** `fichier: escalier-b/incendie.ctr` */
export function ligneDeSection(chemin = [], extension = "mdall") {
  return [
    jeton(JETON.MOT_FICHIER, "fichier:"),
    espace(),
    jeton(JETON.SECTION, cheminDeFichier(chemin, extension))
  ];
}

/** `note: une remarque` */
export function ligneDeNote(phrase = "") {
  return [jeton(JETON.NOTE, "note:"), espace(), jeton(JETON.NOTE, texte(phrase))];
}

/**
 * L'en-tête : ce que le fichier est, ce qui l'a produit, comment il s'écrit.
 *
 * Les deux dernières comptent autant l'une que l'autre : la première dit qu'on
 * lit une transcription et non un programme ; la seconde permet de distinguer,
 * six mois plus tard, un changement de valeur d'un changement de façon d'écrire.
 */
export function enTeteDeFichier({ chemin = [], extension = "mdall", produitPar = "", le = "" } = {}) {
  const lignes = [ligneDeSection(chemin, extension)];

  if (texte(produitPar)) {
    lignes.push(ligneDeNote(`établi par ${texte(produitPar)}${texte(le) ? `, le ${texte(le)}` : ""}`));
  }
  lignes.push(ligneDeNote(`écriture Mdall v${ECRITURE}`));

  return lignes;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Mise à plat
 * ──────────────────────────────────────────────────────────────────────────── */

/** Une ligne de jetons, remise à plat. C'est ce qui part dans un extrait. */
export function enClair(jetons = []) {
  return (Array.isArray(jetons) ? jetons : []).map((entree) => entree.texte).join("");
}

/** Un fichier entier, remis à plat. */
export function texteDesLignes(lignes = []) {
  return (Array.isArray(lignes) ? lignes : []).map(enClair).join("\n");
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
  const nu = String(ligne ?? "").replace(/^[\s\d]+/, "");
  const marque = nu[0] ?? "";

  if (marque === "-") return "retire";
  if (marque === "+") return "ajoute";
  if (/^fichier:/i.test(nu)) return "section";
  if (/^note:/i.test(nu)) return "note";
  return "contexte";
}
