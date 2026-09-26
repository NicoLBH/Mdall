/**
 * Du texte Mdall vers le graphe : l'autre sens de la flèche.
 *
 * ## Pourquoi il existe
 *
 * Tant que le langage n'était qu'une vue, la mémoire vivait dans la base et le
 * texte n'en était qu'un rendu. Deux besoins ont renversé cela :
 *
 * - **un architecte doit pouvoir écrire à la main.** Trois lignes dans un
 *   éditeur, collées dans l'Atelier, et le projet retient une décision. C'est
 *   la porte d'entrée la moins chère qui existe, et elle ne demande aucun
 *   utilitaire ;
 * - **les utilitaires n'écrivent que du mdall.** Incendie, neige, vent, gel :
 *   tous produisent des affirmations, des règles, des preuves. Si le texte est
 *   le format commun, un utilitaire nouveau n'a plus rien à brancher.
 *
 * ## La loi de réciprocité
 *
 * ```
 * lire(écrire(G)) = G
 * ```
 *
 * Chaque information du graphe apparaît **une fois** dans le texte, et rien de
 * déductible n'y apparaît. Un test la vérifie sur des blocs réels. C'est elle
 * qui autorise à dire que le texte **est** la mémoire, et pas une vue de la
 * mémoire — et c'est elle qui interdit d'ajouter au langage une information
 * qu'on ne saurait pas relire.
 *
 * ## Ce que la lecture pardonne
 *
 * Elle accepte les deux guillemets, droits et français. Elle accepte les
 * comparateurs écrits en signes ou en toutes lettres. Elle accepte une
 * indentation de deux, trois ou quatre espaces, et la tabulation, qu'elle
 * ramène au pas canonique. Personne ne doit être refusé pour une raison
 * typographique : ce qui compte est le sens, et il est toujours porté par le
 * premier mot de la ligne.
 *
 * ## Ce qu'elle refuse
 *
 * Elle ne devine pas. Une ligne qu'elle ne comprend pas n'est pas ignorée en
 * silence : elle est rendue avec son numéro et sa raison, pour que celui qui a
 * écrit sache où corriger. Une lecture qui avale ce qu'elle ne comprend pas
 * ferait entrer en mémoire un fichier amputé sans que personne ne le sache.
 */

import {
  OPERATEUR, PROVENANCES, STATUTS, RETRAIT, JETON,
  ligneDAffirmation, ligneDeDonnee, ligneDeCondition, ligneDeConsequence,
  ligneDeProvenance, ligneDePreuve, ligneDeStatut, ligneDeDate, ligneDeNote, ligneDeLocale,
  ligneDImport, ligneDeDecision, ligneDeFonction, ligneDeLocaleVide, ligneDAffectation,
  jetonsDeValeur, AGENT, AGENTS, VERBES
} from "./memoire-en-texte.js";
import { lireUnCalcul, phraseDuRefus } from "./mdall-calcul.js";
// La clé d'un sujet vient d'un seul endroit : comparer « Couleur des volets » à
// « couleur des volets » avec une seconde normalisation écrite ici finirait par
// ne plus dire la même chose que celle du projet (règle 10).
import { cleDuSujet } from "./memoire-identifiants.js";
import { jetonsEcrits } from "./mdall-en-ecriture.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les comparateurs, écrits comme on veut.
 *
 * L'écriture rend `<=`, parce que c'est ce qu'un architecte peut taper. La
 * lecture accepte aussi `≤`, parce qu'un fichier plus ancien en porte, et
 * qu'une mémoire ne refuse pas ce qu'elle a elle-même écrit.
 */
const COMPARATEURS = new Map([
  ["=", OPERATEUR.EGAL],
  ["==", OPERATEUR.EGAL],
  ["!=", OPERATEUR.DIFFERENT],
  ["<>", OPERATEUR.DIFFERENT],
  ["≠", OPERATEUR.DIFFERENT],
  ["<=", OPERATEUR.AU_PLUS],
  ["≤", OPERATEUR.AU_PLUS],
  [">=", OPERATEUR.AU_MOINS],
  ["≥", OPERATEUR.AU_MOINS],
  ["<", OPERATEUR.MOINS_DE],
  [">", OPERATEUR.PLUS_DE],
  ["parmi", OPERATEUR.PARMI]
]);

/** Les deux constats qui ne comparent rien : ils closent la ligne. */
const CONSTATS = new Map([
  ["renseigné", OPERATEUR.RENSEIGNE],
  ["renseigne", OPERATEUR.RENSEIGNE],
  ["non renseigné", OPERATEUR.NON_RENSEIGNE],
  ["non renseigne", OPERATEUR.NON_RENSEIGNE]
]);

/**
 * Les mots de tête, du plus long au plus court : « sauf si » avant « si ».
 *
 * Les mots suivis de deux points se cherchent avec leur deux-points : `statut:`
 * et non `statut`. Sans cela, une donnée nommée « Statut de la façade » se
 * lirait comme un statut.
 */
const TETES = [
  "sauf si", "parce que:", "statut:", "fichier:", "note:", "le:", "zone:",
  "fonction", "soit", "calcule", "alors", "sinon", "si", "et", "ou", "non",
  ...PROVENANCES.map((type) => `${type}:`)
];

/**
 * Ce qu'on écrit pour soi, et que rien n'interprète.
 *
 * `//` jusqu'au bout de la ligne, `/* … *\/` sur une ou plusieurs. Une règle de
 * quinze lignes a besoin qu'on dise **pourquoi** une condition existe, ce qui
 * est autre chose que dire ce qu'elle teste.
 */
export function estUnCommentaire(ligne = "") {
  const dit = texte(ligne);
  return dit.startsWith("//") || dit.startsWith("/*") || dit.startsWith("*");
}

/**
 * Une locale de règle : `soit texte = "…";`
 *
 * Le nom porte le sens — c'est le type de provenance, ou `parce que`. Rendre
 * `null` quand la ligne ne s'y prête pas laisse l'appelant la refuser en la
 * nommant, plutôt que d'inventer une locale vide.
 */
export function lireUneLocale(reste = "") {
  const dit = texte(reste).replace(/;\s*$/, "");
  const coupe = dit.match(/^(.*?)\s*=\s*([\s\S]*)$/);
  if (!coupe) return null;

  const nom = texte(coupe[1]);
  const { valeur } = lireUneValeur(texte(coupe[2]));
  return nom && valeur ? { nom, valeur } : null;
}

/**
 * Un calcul de fonction : `calcule Prix TTC = Prix HT + TVA;`
 *
 * **L'expression ne se met pas entre guillemets** : ce n'est pas un texte, c'est
 * une arithmétique qui se lit, se rejoue et se vérifie. Elle est rendue telle
 * qu'elle est écrite — la lire ici reviendrait à la lire deux fois, et c'est
 * `mdall-calcul.js` qui sait le faire, au moment de l'évaluer.
 *
 * `null` quand la ligne ne pose aucun nom ou aucune expression : l'appelant la
 * refuse en la nommant, plutôt que d'inventer un calcul vide.
 */
export function lireUnCalculDeFonction(reste = "") {
  const dit = texte(reste).replace(/;\s*$/, "");
  const coupe = dit.match(/^(.*?)\s*=\s*([\s\S]*)$/);
  if (!coupe) return null;

  const nom = texte(coupe[1]);
  const expression = texte(coupe[2]);
  return nom && expression ? { nom, expression } : null;
}

/**
 * Les formes multi-lignes d'un `.ref`, reconnues à leur seule ligne.
 *
 * Un lecteur ligne à ligne ne peut pas se permettre d'ambiguïté : chaque ligne
 * doit dire ce qu'elle ouvre, ce qu'elle porte ou ce qu'elle ferme, sans
 * dépendre de ce qui précède au-delà d'un état minimal. C'est ce que ces motifs
 * garantissent, et c'est aussi ce qui rend le fichier relisible par un humain
 * qui tombe au milieu.
 */
const CONCLUSION_OUVRANTE = /^(alors|sinon)\s*\($/i;
const ENREGISTRE_OUVRANT = /^enregistre\s*\($/i;
const IMPORT_LIGNE = /^importe\s*\((.*)\)\s*;?$/i;
const DECISION_LIGNE = /^décision humaine assumée\s*\((.*)\)\s*;?$/i;
const FERMETURE = /^\)+\s*;?$/;
const CHAMP_DENREGISTREMENT = /^([^:]+)\s*:\s*(.*?),?$/;
/** `tableau: [` — les valeurs d'un tableau, dans le fichier qui le range. */
const TABLEAU_DE_VALEURS = /^(tableau|entrées|entrees)\s*:\s*\[$/i;
/** `{` ou `},` — un objet du tableau qui s'ouvre ou se ferme. */
const OBJET_OUVRANT = /^\{$/;
const OBJET_FERMANT = /^\}\s*,?$/;
/** `clé: [` et `clé: {` — un champ qui contient autre chose qu'une valeur. */
const CHAMP_OUVRANT = /^(.+?)\s*:\s*([[{])$/;
/** `]` ou `],` — la fin d'une liste. */
const LISTE_FERMANTE = /^\]\s*,?$/;

/** `Sujet = [` — une variable qui ouvre ses valeurs, une par zone. */
const TABLEAU_OUVRANT = /^(.*?)\s*=\s*\[$/;
/** `]` ou `];` — la fin du tableau. */
const TABLEAU_FERMANT = /^\]\s*;?$/;
/**
 * `résultat = agent-D (agent: …, version: V1);`
 *
 * La seule ligne d'une fonction qui ne se lit pas. Elle se **lit** — l'agent,
 * l'utilitaire et sa version sont ce qui permet de refaire le travail — mais
 * elle ne se **déplie** pas : la loi n'est pas là, et la ligne le dit.
 */
const APPEL_DAGENT = /^résultat\s*=\s*(agent-D|agent-IA)\s*\((.*)\)\s*;?$/i;
/** `résultat = agent-D (` — l'appel qui s'ouvre, ses arguments dessous. */
const APPEL_DAGENT_OUVRANT = /^résultat\s*=\s*(agent-D|agent-IA)\s*\($/i;
/**
 * `const Zone de vent = {` — une **déclaration de variable** qui s'ouvre.
 *
 * ## Le fichier qui s'écrivait et ne se relisait pas
 *
 * `variables-du-projet.ref` s'engendre depuis les autres fichiers, et personne
 * ne le reparsait : la lecture refusait donc chacune de ses lignes — `type`
 * n'est pas une provenance, `déjà utilisé dans` n'ouvre rien — sans que ça se
 * voie nulle part, puisque rien ne le lui demandait.
 *
 * Le bac d'essai, lui, laisse **écrire** une déclaration à la main. Un fichier
 * qu'on vient de taper et qui se fait refuser ligne à ligne n'apprend rien : il
 * dit que le langage se contredit. `lire(écrire(G)) = G` vaut pour cette forme
 * comme pour les autres.
 */
const DECLARATION_OUVRANTE = /^const\s+(.+?)\s*=$/i;
/**
 * Les champs d'une déclaration, et le fait que la liste soit **fermée**.
 *
 * Un champ inconnu se refuse : c'est ce qui distingue une déclaration d'un sac.
 * Sans cette fermeture, `typo: "mesure"` passerait sans un mot et la variable
 * n'aurait pas de type — on chercherait longtemps pourquoi elle ne se compare
 * à rien.
 */
const CHAMPS_DE_LA_DECLARATION = new Set([
  "type", "unité", "unite", "description", "utilisation",
  "valeurs possibles", "ce que le projet en dit"
]);
/** `déjà utilisé dans: [` et `structure attendue: [` — ce qui s'ouvre en liste. */
const LISTES_DE_LA_DECLARATION = /^(déjà utilisé dans|deja utilise dans|structure attendue)\s*:\s*\[\]?,?$/i;

/** `const Profondeur hors gel à retenir;` — une locale déclarée, pas encore posée. */
const LOCALE_VIDE = /^const\s+(.+?)\s*;$/i;
/**
 * `alors (X = Y)` ou `sinon (X = importe (…));`
 *
 * Une branche qui **pose une locale** plutôt que de conclure une valeur. Tout ce
 * qu'elle porte se déduit — le nom de la locale vient de l'entrée, l'adresse du
 * fichier qui la déclare —, et elle se lit donc pour ne pas être refusée.
 */
const AFFECTATION = /^(alors|sinon)\s*\(\s*(.+?)\s*=\s*(.+?)\s*\)\s*;?$/i;

/**
 * Un `importe (variable: X, depuis: fichier);`
 *
 * Ce qu'il porte est **déductible** — la variable est le sujet d'une condition,
 * le fichier est celui qui la déclare — et ne se conserve donc pas. On le lit
 * pour pouvoir le réécrire à l'identique, pas pour le garder.
 */
export function lireUnImport(ligne = "") {
  const trouve = texte(ligne).match(IMPORT_LIGNE);
  if (!trouve) return null;

  const champs = new Map(
    trouve[1].split(",").map((morceau) => {
      const coupe = texte(morceau).match(/^([^:]+)\s*:\s*(.*)$/);
      return coupe ? [texte(coupe[1]).toLowerCase(), texte(coupe[2])] : null;
    }).filter(Boolean)
  );

  const variable = champs.get("variable") ?? "";
  // La zone fait partie de l'emprunt : une variable n'a pas une valeur, elle en
  // a une par partie d'ouvrage. La perdre ici faisait réécrire « zones: zones »
  // là où le fichier disait « zones: Bâtiment A ».
  return variable
    ? { variable, depuis: champs.get("depuis") ?? "", zones: champs.get("zones") ?? "" }
    : null;
}

/**
 * Une ligne d'un tableau de valeurs, ajoutée à ce qu'on lit.
 *
 * Une grammaire bornée, et c'est ce qui la rend sûre : une accolade ouvre un
 * objet, un crochet une liste, `clé: valeur` pose un champ, et la fermeture du
 * dernier niveau clôt le tableau. Rien d'autre n'y est admis — un tableau qui
 * accepterait n'importe quoi ne se relirait pas.
 *
 * Les valeurs reviennent **telles qu'elles sont écrites** : « 1,20 m » et non
 * `1.2`. La mémoire compare des phrases, et reconvertir en nombre ici ferait
 * deux écritures de la même cote.
 *
 * @returns {boolean} `true` tant que le tableau continue
 */
export function lireLeTableau(lecture, ligne = "") {
  const dit = texte(ligne);
  const dessus = lecture.pile.at(-1) ?? null;

  if (OBJET_OUVRANT.test(dit)) {
    const objet = {};
    if (dessus?.liste) dessus.liste.push(objet);
    else lecture.lignes.push(objet);
    lecture.pile.push({ objet });
    return true;
  }

  if (OBJET_FERMANT.test(dit)) { lecture.pile.pop(); return true; }

  if (LISTE_FERMANTE.test(dit)) {
    // Le crochet du dernier niveau ferme le tableau lui-même.
    if (!lecture.pile.length) return false;
    lecture.pile.pop();
    return true;
  }

  const ouvrant = dit.match(CHAMP_OUVRANT);
  if (ouvrant && dessus?.objet) {
    const cle = texte(ouvrant[1]);
    if (ouvrant[2] === "[") {
      const liste = [];
      dessus.objet[cle] = liste;
      lecture.pile.push({ liste });
    } else {
      const objet = {};
      dessus.objet[cle] = objet;
      lecture.pile.push({ objet });
    }
    return true;
  }

  const champ = dit.match(CHAMP_DENREGISTREMENT);
  if (champ && dessus?.objet) {
    const brut = texte(champ[2]).replace(/,$/, "");
    const lue = lireUneValeur(brut);
    // `—` est ce qu'on écrit pour une valeur qu'on n'a pas : elle revient vide,
    // et non comme un tiret que personne n'a posé.
    dessus.objet[texte(champ[1])] = brut === "—" ? "" : (lue.unite ? `${lue.valeur} ${lue.unite}` : lue.valeur);
    return true;
  }

  // Une ligne qu'on ne sait pas placer ferme le tableau plutôt que de l'avaler :
  // mieux vaut la refuser plus bas, avec son numéro, que la perdre ici.
  return false;
}

/**
 * Un `résultat = calcul natif (agent: X, version: V1);`
 *
 * Ce qu'il rend est ce qui permet de refaire le calcul plus tard : le nom de
 * l'agent et sa version. Rien d'autre n'est là — c'est tout le propos
 * d'une fonction native, et la lecture ne va pas inventer un corps qui n'a
 * jamais été écrit.
 */
export function lireUnAppelDAgent(ligne = "") {
  const trouve = texte(ligne).match(APPEL_DAGENT);
  if (!trouve) return null;
  // `résultat = agent-D (` ouvre un bloc : ses champs sont sur les lignes
  // suivantes, et cette fonction-ci ne lit que la forme en une ligne.
  if (!texte(trouve[2])) return null;

  const champs = new Map(
    trouve[2].split(",").map((morceau) => {
      const coupe = texte(morceau).match(/^([^:]+)\s*:\s*(.*)$/);
      return coupe ? [texte(coupe[1]).toLowerCase(), texte(coupe[2])] : ["", ""];
    })
  );

  const utilitaire = champs.get("utilitaire") ?? "";
  if (!utilitaire) return null;
  return { agent: texte(trouve[1]), utilitaire, version: champs.get("version") ?? "" };
}

/**
 * `décision humaine assumée (réunion du 3 mars, par: X, le: …);`
 *
 * Ce qui se conserve est la provenance — « réunion du 3 mars » — ; l'auteur et
 * la date se lisent sur la ligne de la mémoire, et les garder ici en ferait une
 * seconde vérité. On les relit pour pouvoir réécrire la ligne, pas pour les
 * ranger.
 */
export function lireUneDecision(ligne = "") {
  const trouve = texte(ligne).match(DECISION_LIGNE);
  if (!trouve) return null;

  const morceaux = trouve[1].split(",").map(texte).filter(Boolean);
  const champs = new Map();
  const restes = [];

  for (const morceau of morceaux) {
    const coupe = morceau.match(/^(par|le)\s*:\s*(.*)$/i);
    if (coupe) champs.set(texte(coupe[1]).toLowerCase(), texte(coupe[2]));
    else restes.push(morceau);
  }

  const quoi = restes.join(", ");
  return quoi ? { quoi, par: champs.get("par") ?? "", le: champs.get("le") ?? "" } : null;
}

/**
 * Ce qu'une clause de règle dit, débarrassé de ses bornes.
 *
 * Un `.ref` écrit `si (Hauteur du plancher bas <= 28 m)` et `alors ("3e famille
 * B");` — les parenthèses et le point-virgule bornent, ils ne disent rien.
 * On les retire pour lire, et on les remet pour écrire : ce qui est **déductible
 * de la forme** ne se conserve pas, sans quoi il finirait par diverger d'elle.
 *
 * Un fichier écrit à la main sans elles se lit exactement pareil. C'est
 * volontaire : la ponctuation rend la règle exécutable, elle ne la rend pas
 * obligatoire.
 *
 * @returns {{corps: string, borne: boolean}} `borne` dit si les parenthèses y
 *   étaient — c'est ce qui permet de réécrire la ligne telle qu'elle était.
 */
export function sansBornes(reste = "") {
  const dit = texte(reste).replace(/;\s*$/, "");
  const parentheses = dit.match(/^\(([\s\S]*)\)$/);
  return parentheses
    ? { corps: texte(parentheses[1]), borne: true }
    : { corps: dit, borne: false };
}

/** Ce qu'une ligne ouvre ou ferme. L'accolade borne, elle ne dit rien d'autre. */
function bornesDe(ligne) {
  const nu = texte(ligne);
  // `},` ferme aussi : dans un tableau de valeurs par zone, une entrée qui n'est
  // pas la dernière porte sa virgule. Sans cela, la lecture avalait l'entrée
  // suivante.
  return {
    ferme: nu === "}" || nu === "},",
    ouvre: nu.endsWith("{"),
    // Le contenu, une fois l'accolade retirée.
    corps: nu.endsWith("{") ? texte(nu.slice(0, -1)) : nu
  };
}

/** La profondeur d'indentation d'une ligne, en pas. */
function retraitDe(ligne) {
  const blancs = (String(ligne).match(/^[\t ]*/) ?? [""])[0].replace(/\t/g, RETRAIT);
  return Math.floor(blancs.length / RETRAIT.length);
}

/** Le mot de tête d'une ligne, et ce qui le suit. */
export function teteDe(ligne = "") {
  const nu = texte(ligne);
  for (const mot of TETES) {
    if (nu.toLowerCase() === mot) return { mot, reste: "" };
    if (nu.toLowerCase().startsWith(`${mot} `)) return { mot, reste: texte(nu.slice(mot.length)) };
  }
  return { mot: "", reste: nu };
}

/**
 * La signature d'une règle : le sujet, et ses entrées entre parenthèses.
 *
 * Les entrées ne se conservent pas — ce sont les sujets des conditions, et une
 * signature recopiée diverge. On les lit pour les jeter : ce qui compte, c'est
 * que la parenthèse ne soit pas prise pour une partie du sujet.
 */
export function lireUneSignature(ligne = "") {
  const dit = texte(ligne);
  const signature = dit.match(/^(.*?)\s*\(([^()]*)\)$/);
  if (!signature) return { sujet: dit, entrees: [] };

  return {
    sujet: texte(signature[1]),
    entrees: signature[2].split(",").map(texte).filter(Boolean)
  };
}

/**
 * Une valeur écrite, ramenée à ce qu'elle est.
 *
 * Les guillemets disent « ceci est un texte » et disparaissent à la lecture.
 * Leur absence dit « ceci se mesure » : le nombre et son unité se séparent, et
 * l'on peut comparer 26 m à 28 m sans comparer des chaînes.
 */
export function lireUneValeur(brut = "") {
  const dit = texte(brut);
  if (!dit) return { valeur: "", unite: "", citee: false };

  const guillemets = dit.match(/^["'«]\s*([\s\S]*?)\s*["'»]$/);
  if (guillemets) return { valeur: guillemets[1], unite: "", citee: true };

  const mesure = dit.match(/^(-?\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (mesure) return { valeur: mesure[1], unite: texte(mesure[2]), citee: false };

  return { valeur: dit, unite: "", citee: false };
}

/**
 * Une condition : `Sujet ≤ 28 m`, `Voie-engins parmi "a" ou "b"`.
 *
 * ## Le piège du « ou »
 *
 * « Habitation individuelle ou collective = collective » contient un « ou » qui
 * n'est pas une disjonction. La disjonction ne se cherche donc **qu'à droite du
 * comparateur**, là où un « ou » ne peut être qu'un « ou ». Le comparateur, lui,
 * se cherche sur la ligne entière : un sujet ne contient jamais `=` ni `≤`.
 */
export function lireUneCondition(corps = "") {
  const dit = texte(corps);
  if (!dit) return null;

  // Les deux constats ferment la ligne : « Classement du bâtiment renseigné ».
  for (const [mot, operateur] of CONSTATS) {
    const motif = new RegExp(`^(.*?)\\s+${mot}$`, "i");
    const trouve = dit.match(motif);
    if (trouve) return { sujet: texte(trouve[1]), operateur, valeur: [], unite: "", logique: false };
  }

  const signe = dit.match(/^(.*?)\s*(≤|≥|≠|<=|>=|<>|!=|==|=|<|>)\s*(.*)$/)
    ?? dit.match(/^(.*?)\s+(parmi)\s+(.*)$/i);
  if (!signe) return null;

  const sujet = texte(signe[1]);
  if (!sujet) return null;

  const operateur = COMPARATEURS.get(texte(signe[2]).toLowerCase()) ?? OPERATEUR.EGAL;
  const morceaux = texte(signe[3]).split(/\s+ou\s+/i).map(texte).filter(Boolean);
  const lues = morceaux.map(lireUneValeur);

  return {
    sujet,
    operateur,
    valeur: lues.map((lue) => lue.valeur),
    unite: lues.find((lue) => lue.unite)?.unite ?? "",
    // Oui / non n'est ni un texte cité ni une mesure : c'est une réponse.
    logique: lues.length > 0 && lues.every((lue) => !lue.citee && /^(oui|non)$/i.test(lue.valeur))
  };
}

/** Une ligne de tête : `Sujet = valeur @ zone`, ou `Sujet` seul pour une règle. */
export function lireUneTete(ligne = "") {
  const brut = texte(ligne);
  if (!brut) return null;

  // `fonction` ouvre une règle. Le mot ne se conserve pas — il **est** le fait
  // d'être une règle, et le garder à côté le laisserait diverger de lui.
  //
  // Il n'y a **qu'un genre de fonction**. La v4.5 en avait inventé un second —
  // `fonction native …` —, ce qui laissait croire qu'une fonction pouvait être
  // opaque. Ce qui l'est, c'est l'agent qu'elle appelle, et c'est la ligne
  // d'appel qui le porte. Le mot est encore lu pour ne pas refuser un fichier
  // écrit avant, et il ne se conserve pas.
  const regle = /^fonction\s+/i.test(brut);
  const dit = regle ? texte(brut.replace(/^fonction\s+(?:native\s+)?/i, "")) : brut;

  const egal = dit.match(/^(.*?)\s*=\s*(.*)$/);
  // Pas de `=` : c'est la tête d'une règle, avec sa signature éventuelle.
  if (!egal) {
    const { sujet, entrees } = lireUneSignature(dit);
    return { sujet, valeur: "", unite: "", entrees, regle: regle || entrees.length > 0 };
  }

  const lue = lireUneValeur(egal[2]);
  return { sujet: texte(egal[1]), valeur: lue.valeur, unite: lue.unite, entrees: [], regle };
}

/**
 * Un fichier entier : ses blocs, et ce qui n'a pas pu être lu.
 *
 * Un bloc s'ouvre sur une ligne non indentée et se ferme à la suivante. Il n'y
 * a pas d'autre délimiteur : l'indentation est la syntaxe, et une accolade
 * serait un mot de programmeur.
 *
 * @returns {{chemin: string, blocs: object[], refus: {ligne: number, texte: string, raison: string}[]}}
 */
export function lireUnFichier(contenu = "") {
  const lignes = String(contenu ?? "").split(/\r?\n/);
  const blocs = [];
  const declarations = [];
  const refus = [];
  let chemin = "";
  let zone = "";
  let courant = null;
  // La conclusion en cours d'écriture, quand elle s'étale sur plusieurs lignes.
  // C'est le seul état que la lecture porte au-delà d'une ligne, et il tient en
  // un mot : « alors » ou « sinon ».
  let conclusion = "";
  // Le sujet d'un tableau de valeurs par zone, tant qu'il est ouvert. Les
  // entrées qui suivent portent une zone, et empruntent ce nom-là.
  let tableau = "";
  // Un `enregistre (` ouvert **hors** d'un `alors`. C'est la forme d'une
  // fonction native : elle n'a pas de branche à prendre, elle a un résultat à
  // ranger, et ses sorties se lisent donc là plutôt que sous une conclusion.
  let enregistrement = false;
  // L'appel d'une fonction native, tant qu'il est ouvert. Ce qu'il porte se
  // déduit de la signature — sauf l'utilitaire et sa version, qui sont ce qui
  // permet de refaire le calcul.
  let calcul = false;
  // La déclaration de variable en cours. Elle ne produit **aucun bloc** : ce
  // fichier définit des noms, il n'affirme rien sur le projet. En faire des
  // affirmations donnerait à chaque nom une valeur qu'il n'a pas.
  let declaration = null;
  /**
   * Le tableau de valeurs en cours de lecture, avec la pile de ce qu'il ouvre.
   *
   * Un tableau **ne se déduit de rien** : c'est ce que l'appel a rendu, ligne à
   * ligne. Le sauter reviendrait à perdre la moitié de ce que le fichier dit —
   * et la lecture le refuserait ligne après ligne, ce qui est pire.
   */
  let tableauLu = null;

  const fermer = () => {
    if (courant) {
      // `accolade` sert à la lecture, pas au sens : elle ne ressort pas.
      const { accolade, conclue, affecte, agent, utilitaire, version, enregistre, tableau, ...bloc } = courant;

      /**
       * **Sans agent, une affectation en branche se refuse.**
       *
       * Une fonction conclut **sous son propre nom** : elle n'a pas à se le
       * réaffecter, et la valeur qu'elle pose est ce qui suit `alors`. Le dire
       * ici plutôt que de l'avaler est tout l'écart entre une règle qu'on
       * corrige en trois secondes et une règle qui « conclut » le vide.
       */
      if (!agent) {
        for (const ligne of affecte ?? []) {
          const sienne = cleDuSujet(ligne.sujet) === cleDuSujet(bloc.sujet);
          refus.push({
            ligne: ligne.ligne,
            texte: ligne.texte,
            raison: sienne
              ? `une fonction conclut sous son nom : écrivez « alors (${ligne.valeur}); » sans « ${ligne.sujet} = ».`
              : `« ${ligne.sujet} » ne se pose pas ici : une branche conclut une valeur, elle n'affecte pas un autre nom.`
          });
        }
      }
      // Un tableau ne ressort que s'il y en a un : le champ vide sur toutes les
      // affirmations ferait croire que chacune en porte un.
      if (Array.isArray(tableau) && tableau.length) bloc.tableau = tableau;
      // Ce qui n'est pas natif ne porte pas les champs d'une fonction native.
      // Les laisser vides sur tous les blocs ferait croire qu'une règle a un
      // utilitaire, et il faudrait aller lire sa valeur pour savoir que non.
      // Une fonction qui appelle un agent ne porte **pas** les branches qu'on
      // vient de lire : elles disent seulement quelle entrée retenir, et elles
      // se déduisent de la signature. Les garder ferait une règle là où il n'y
      // a qu'un appel — et l'appel n'apparaît qu'après elles dans le fichier,
      // d'où ce tri à la fermeture plutôt qu'à la lecture.
      blocs.push(agent
        ? { ...bloc, conditions: [], alors: "", sinon: "", sauf: [], calculs: [], agent, utilitaire, version, enregistre }
        : bloc);
    }
    courant = null;
    conclusion = "";
    enregistrement = false;
    calcul = false;
    tableauLu = null;
  };

  lignes.forEach((brute, rang) => {
    const numero = rang + 1;

    // Un tableau de valeurs, tant qu'il est ouvert. Il passe **avant les
    // bornes** : ses accolades ouvrent et ferment des objets, et la lecture des
    // bornes les prendrait pour celles d'un bloc — la première `}` du tableau
    // fermait l'affirmation, et tout le reste du fichier était refusé ligne à
    // ligne.
    const nu = texte(brute);
    if (tableauLu) {
      if (lireLeTableau(tableauLu, nu)) return;
      if (courant) courant.tableau = tableauLu.lignes;
      tableauLu = null;
      return;
    }

    const ouvreUnTableauDeValeurs = nu.match(TABLEAU_DE_VALEURS);
    if (ouvreUnTableauDeValeurs && courant) {
      tableauLu = { nom: texte(ouvreUnTableauDeValeurs[1]), lignes: [], pile: [] };
      return;
    }

    const { ferme, ouvre, corps } = bornesDe(brute);
    if (!corps && !ferme) return;

    // **Une déclaration de variable, tant qu'elle est ouverte.** Elle passe
    // avant les bornes : son `};` fermerait sinon « le bloc courant, ou la
    // zone », et ses champs se liraient comme des provenances — c'est
    // exactement ce qui faisait refuser `variables-du-projet.ref` ligne à
    // ligne, dans un fichier que le projet engendre lui-même.
    if (declaration) {
      // `};` — la fermeture d'une déclaration. `bornesDe` ne la connaît pas :
      // un bloc ordinaire finit par `}` tout court, et lui apprendre le
      // point-virgule changerait la lecture de tous les fichiers pour un besoin
      // qui n'existe qu'ici.
      if (ferme || corps === "};") { declarations.push(declaration); declaration = null; return; }
      if (estUnCommentaire(corps)) return;
      lireUnChampDeclare(declaration, corps, {
        refuser: (raison) => refus.push({ ligne: numero, texte: corps, raison })
      });
      return;
    }

    const ouvreUneDeclaration = ouvre ? corps.match(DECLARATION_OUVRANTE) : null;
    if (ouvreUneDeclaration) {
      fermer();
      declaration = { nom: texte(ouvreUneDeclaration[1]), valeurs: [] };
      return;
    }

    // Une accolade seule ferme ce qui est ouvert : le bloc courant s'il y en a
    // un, la zone sinon. On ne la refuse jamais — une borne en trop est une
    // faute d'écriture, pas une perte de sens.
    if (ferme) {
      if (courant) fermer();
      else zone = "";
      return;
    }

    // Un commentaire ne dit rien au raisonnement : il ne ferme ni n'ouvre, et
    // il ne se refuse jamais. Le refuser serait dire qu'écrire pour soi est une
    // faute.
    if (estUnCommentaire(corps)) return;

    // Les formes d'un `.ref` qui s'étalent sur plusieurs lignes. Tout ce qu'un
    // `importe` et un `enregistre` portent se **déduit** — la variable est le
    // sujet d'une condition, le fichier celui qui la déclare, la portée celle
    // de l'affirmation. On les lit pour ne pas les refuser, pas pour les garder.
    if (lireUnImport(corps)) return;

    // Une décision signée : ce qui se conserve est sa provenance. L'auteur et la
    // date vivent sur la ligne de la mémoire, pas dans son écriture.
    const decision = lireUneDecision(corps);
    if (decision && courant) { courant.provenance = { type: "décision", quoi: decision.quoi }; return; }
    if (FERMETURE.test(corps)) { conclusion = ""; enregistrement = false; calcul = false; return; }
    // Sous un `alors (`, l'`enregistre` ne fait que redire ce que la branche
    // pose : il s'ignore. Seul, il **est** la sortie, et ce qu'il porte est la
    // seule trace de ce qu'un calcul natif a décidé.
    if (ENREGISTRE_OUVRANT.test(corps)) { enregistrement = !conclusion; return; }

    // L'appel d'un agent. On garde de quoi le refaire — l'agent, l'utilitaire,
    // sa version — et rien de plus : il n'y a rien de plus. Ses arguments se
    // déduisent de la signature, et une signature recopiée diverge.
    const ouvreUnAppel = corps.match(APPEL_DAGENT_OUVRANT);
    if (ouvreUnAppel && courant) {
      calcul = true;
      courant.agent = texte(ouvreUnAppel[1]);
      return;
    }
    if (calcul && courant) {
      const champ = corps.match(CHAMP_DENREGISTREMENT);
      const cle = texte(champ?.[1]).toLowerCase();
      if (cle === "utilitaire") courant.utilitaire = texte(champ[2]).replace(/,$/, "");
      if (cle === "version") courant.version = texte(champ[2]).replace(/,$/, "");
      return;
    }

    const appel = lireUnAppelDAgent(corps);
    if (appel && courant) {
      courant.agent = appel.agent;
      courant.utilitaire = appel.utilitaire;
      courant.version = appel.version;
      return;
    }

    // Ce qu'une fonction retient de ses entrées : une locale déclarée, puis deux
    // branches qui disent laquelle prendre. Tout s'en déduit — le nom vient de
    // l'entrée, l'adresse du fichier qui la déclare —, et l'écrire une seconde
    // fois dans le graphe le laisserait diverger de la signature.
    //
    // Ces deux formes ne se rencontrent nulle part ailleurs : une règle conclut
    // sur une **valeur** (`alors ("3e famille B")`), jamais sur une affectation.
    // On peut donc les reconnaître sans savoir encore qu'un agent sera appelé
    // plus bas.
    if (courant && LOCALE_VIDE.test(corps)) return;

    /**
     * **Une branche qui affecte se retient, elle ne s'oublie plus.**
     *
     * `alors (X = importe (…));` appartient à une fonction qui appelle un
     * agent : ses branches disent seulement quelle entrée retenir, et tout ce
     * qu'elles portent se déduit de la signature. On les passe donc.
     *
     * Mais `alors (Couleur des volets = "violet");` dans une règle ordinaire est
     * **la transcription la plus littérale de la phrase française** — « alors
     * couleur des volets = violet » —, et c'est la première chose qu'on écrit.
     * Passée de la même façon, elle ne laissait rien : la fonction gardait sa
     * condition, ne concluait plus rien, et l'écran annonçait « conclut » suivi
     * du vide. Aucun refus, aucune trace (règle 5).
     *
     * On ne peut pas trancher ici : l'appel à l'agent s'écrit **après** les
     * branches. On retient donc la ligne, et c'est la fermeture du bloc qui
     * décide — comme elle décide déjà du reste pour la même raison.
     */
    const affecte = courant ? corps.match(AFFECTATION) : null;
    if (affecte) {
      courant.affecte.push({ ligne: numero, texte: corps, sujet: texte(affecte[2]), valeur: texte(affecte[3]) });
      return;
    }

    const ouvreUneConclusion = corps.match(CONCLUSION_OUVRANTE);
    if (ouvreUneConclusion && courant) { conclusion = ouvreUneConclusion[1].toLowerCase(); return; }

    // Les sorties d'une fonction native. `dans` et `zones` se déduisent — le
    // fichier est celui qu'on écrit, la portée celle de la fonction — et ne se
    // conservent donc pas ; tout le reste est un sujet que le calcul a posé.
    if (enregistrement && courant) {
      const champ = corps.match(CHAMP_DENREGISTREMENT);
      const cle = texte(champ?.[1]).toLowerCase();
      if (champ && cle !== "dans" && cle !== "zones") {
        const lue = lireUneValeur(texte(champ[2]));
        courant.enregistre.push({ sujet: texte(champ[1]), valeur: lue.valeur, unite: lue.unite });
      }
      return;
    }

    if (conclusion && courant) {
      const champ = corps.match(CHAMP_DENREGISTREMENT);
      const cle = texte(champ?.[1]).toLowerCase();
      // `dans` et `zones` se déduisent ; le reste est le sujet enregistré, et sa
      // valeur est ce que la branche pose.
      if (champ && cle !== "dans" && cle !== "zones") {
        const lue = lireUneValeur(texte(champ[2]));
        courant[conclusion] = lue.unite ? `${lue.valeur} ${lue.unite}` : lue.valeur;
      }
      return;
    }

    const { mot, reste } = teteDe(corps);

    if (mot === "fichier:") { fermer(); chemin = reste; return; }
    // Une note ne porte jamais de sens : elle ne rouvre ni ne ferme rien.
    if (mot === "note:") return;

    if (mot === "zone:") { fermer(); zone = reste; return; }

    // `Sujet = [` ouvre les valeurs d'une variable, une par zone. Le nom est
    // écrit une fois ; chaque entrée dit seulement où elle vaut.
    const ouvreUnTableau = corps.match(TABLEAU_OUVRANT);
    if (ouvreUnTableau && !courant) { tableau = texte(ouvreUnTableau[1]); return; }
    if (TABLEAU_FERMANT.test(corps)) { fermer(); tableau = ""; return; }

    // Une ligne qui **ouvre** ferme celle qui l'était : deux blocs ne
    // s'emboîtent pas. Sans cette règle, un bloc dont l'accolade fermante
    // manque avalait le suivant, puis l'accolade de la zone fermait ce bloc-là
    // au lieu de la zone — une borne oubliée dérangeait tout le fichier.
    if (ouvre && courant) fermer();

    // Un bloc ouvert **sans** accolade se ferme à la première ligne non
    // indentée : c'est l'ancienne règle, et elle reste, parce qu'un architecte
    // qui tape à la main n'ajoutera pas toujours ses bornes.
    if (courant && !courant.accolade && retraitDe(brute) === 0) fermer();

    if (!courant) {
      // Dans un tableau, la tête porte la zone et non le sujet : `Bâtiment A:
      // "CF 1/2 h"`. Le nom vient du tableau, écrit une fois au-dessus.
      const dansLeTableau = tableau ? corps.match(CHAMP_DENREGISTREMENT) : null;
      const tete = dansLeTableau
        ? { sujet: tableau, ...lireUneValeur(texte(dansLeTableau[2])), entrees: [] }
        : lireUneTete(corps);

      if (!tete?.sujet) {
        refus.push({ ligne: numero, texte: corps, raison: "cette ligne n'ouvre aucune donnée." });
        return;
      }
      courant = {
        sujet: tete.sujet, valeur: tete.valeur, unite: tete.unite,
        zone: dansLeTableau ? texte(dansLeTableau[1]) : zone,
        /**
         * **Où ce bloc commence, dans le fichier lu.**
         *
         * Un refus porte son numéro de ligne depuis toujours ; un bloc, non. Ce
         * qui se reproche à un bloc — une condition sur un nom que rien ne
         * déclare, une fonction qui ne dit pas où va son résultat — n'avait donc
         * nulle part où se poser, et l'écran renvoyait chercher.
         */
        ligne: numero,
        accolade: ouvre,
        conditions: [], alors: "", sinon: "", sauf: [],
        // Où chaque issue a été posée, pour refuser la seconde en la situant.
        // Sert à la lecture seule, et ne ressort pas du bloc.
        conclue: {},
        // Les branches qui affectent au lieu de conclure. On ne peut les juger
        // qu'à la fermeture : l'appel à l'agent qui les rendrait légitimes
        // s'écrit après elles.
        affecte: [],
        // Les valeurs que la fonction pose en les calculant, dans l'ordre où
        // elles sont écrites : la seconde peut lire la première.
        calculs: [],
        provenance: null, preuve: "", statut: "", le: "",
        // Ce qu'une fonction qui appelle un agent porte, et qu'une règle n'a
        // pas : quel agent, de quoi le refaire, et ce qu'elle a rangé.
        agent: "", utilitaire: "", version: "", enregistre: [],
        // Et ce qu'une affirmation porte quand sa valeur est un tableau.
        tableau: null
      };
      return;
    }

    // Le mot-clé de provenance **est** son type : `texte:`, `document:`, `calcul:`…
    const type = mot.endsWith(":") ? mot.slice(0, -1) : "";
    if (PROVENANCES.includes(type)) {
      courant.provenance = { type, quoi: reste };
      return;
    }

    if (mot === "parce que:") { courant.preuve = lireUneValeur(reste).valeur; return; }

    // `soit texte = "…";` — la même chose, écrite comme une locale de règle.
    // Le nom **est** le concept : un type de provenance, ou « parce que ».
    if (mot === "soit") {
      const locale = lireUneLocale(reste);
      if (!locale) {
        refus.push({ ligne: numero, texte: corps, raison: "cette déclaration ne pose aucune valeur." });
        return;
      }
      if (locale.nom.toLowerCase() === "parce que") { courant.preuve = locale.valeur; return; }
      if (PROVENANCES.includes(locale.nom)) { courant.provenance = { type: locale.nom, quoi: locale.valeur }; return; }
      refus.push({ ligne: numero, texte: corps, raison: `« ${locale.nom} » n'est pas une provenance connue.` });
      return;
    }

    // `calcule Prix TTC = Prix HT + TVA;` — une valeur que la fonction pose en
    // la calculant, pour elle seule. Elle ne sort que par `alors` et par
    // `enregistre` : il n'y a pas de seconde porte vers la mémoire (règle 1).
    if (mot === "calcule") {
      const calcul = lireUnCalculDeFonction(reste);
      if (!calcul) {
        refus.push({ ligne: numero, texte: corps, raison: "ce calcul ne pose ni nom ni expression." });
        return;
      }

      // **Le calcul est lu ici, et refusé ici s'il ne se lit pas.** Une
      // expression fausse laissée passer jusqu'au lancement ferait une règle
      // qui ne conclut rien sans qu'on sache pourquoi (règle 5).
      const lu = lireUnCalcul(calcul.expression);
      if (!lu.ok) {
        refus.push({
          ligne: numero,
          texte: corps,
          raison: `« ${calcul.nom} » ne se calcule pas : ${phraseDuRefus(lu.motif, lu.ou)}.`
        });
        return;
      }

      courant.calculs.push({ ...calcul, ligne: numero });
      return;
    }

    if (mot === "le:") { courant.le = reste; return; }

    if (mot === "statut:") {
      const etat = reste.toLowerCase();
      if (!STATUTS.includes(etat)) {
        refus.push({ ligne: numero, texte: corps, raison: `« ${etat} » n'est pas un statut connu.` });
        return;
      }
      courant.statut = etat;
      return;
    }

    if (mot === "alors" || mot === "sinon") {
      /**
       * **« sinon si (…) » n'existe pas, et l'avaler était le pire.**
       *
       * Une fonction porte une condition et deux issues ; elle n'enchaîne pas
       * les branches. Écrite quand même, la ligne se lisait comme une
       * conclusion dont la **valeur** était le texte `si (Type de TVA =
       * "neuf")`. La fonction concluait donc une phrase au lieu d'un taux,
       * celles qui la lisaient ne savaient plus quoi en faire, et rien nulle
       * part ne disait pourquoi (règle 5). Un cas marchait, l'autre non.
       *
       * Une conclusion ordinaire commence par sa parenthèse ou par sa valeur :
       * aucune ne commence par le mot `si`.
       */
      if (/^si\b/i.test(reste)) {
        refus.push({
          ligne: numero,
          texte: corps,
          /**
           * **Un refus dit quoi écrire, sinon il laisse devant un mur.**
           *
           * Deux cas — « existant » ou « neuf » — s'écrivent avec un `sinon`
           * qui ne répète pas la condition : c'est presque toujours ce que la
           * phrase demandait, et la correction tient en un mot. Trois cas se
           * découpent. Le dire ici évite d'aller chercher dans le wiki ce que
           * la ligne refusée aurait pu dire elle-même.
           */
          raison: `« ${mot} si » n'existe pas. Pour deux cas, écrivez « sinon (la valeur); » sans répéter la condition. Pour trois cas ou plus, découpez en deux fonctions.`
        });
        return;
      }

      // **Une seconde issue du même nom écrasait la première, sans un mot.**
      // Deux `alors` dans une fonction, et elle concluait le dernier écrit :
      // la valeur qu'on lisait à l'écran n'était pas celle qu'on croyait avoir
      // écrite, et le fichier avait l'air juste.
      if (courant.conclue[mot]) {
        refus.push({
          ligne: numero,
          texte: corps,
          raison: `« ${mot} » est déjà posé ligne ${courant.conclue[mot]} : une fonction ne conclut qu'une fois par issue.`
        });
        return;
      }

      const lue = lireUneValeur(sansBornes(reste).corps);
      courant[mot] = lue.unite ? `${lue.valeur} ${lue.unite}` : lue.valeur;
      courant.conclue[mot] = numero;
      return;
    }

    if (mot === "si" || mot === "et" || mot === "ou" || mot === "non" || mot === "sauf si") {
      const condition = lireUneCondition(sansBornes(reste).corps);
      if (!condition) {
        refus.push({ ligne: numero, texte: corps, raison: "cette condition ne compare rien." });
        return;
      }
      if (mot === "sauf si") courant.sauf.push(condition);
      else if (mot === "si") courant.conditions.push(condition);
      else courant.conditions.push({ ...condition, joint: mot });
      return;
    }

    // Un mot-clé en deux points qu'on ne connaît pas est presque toujours une
    // provenance mal orthographiée : le dire aide plus que « mot inconnu ».
    if (mot.endsWith(":") || /^[^\s:]+:\s/.test(corps)) {
      const propose = mot.endsWith(":") ? mot.slice(0, -1) : corps.split(":")[0];
      refus.push({ ligne: numero, texte: corps, raison: `« ${propose} » n'est pas une provenance connue.` });
      return;
    }

    refus.push({ ligne: numero, texte: corps, raison: "aucun mot de la langue n'ouvre cette ligne." });
  });

  fermer();

  // Une déclaration laissée ouverte — l'accolade fermante manque — se rend
  // quand même : ce qu'elle porte a été lu, et le taire ferait disparaître une
  // variable entière pour une borne oubliée.
  if (declaration) declarations.push(declaration);

  return { chemin, blocs, declarations, refus };
}

/**
 * Un champ d'une déclaration de variable.
 *
 * ## La liste est fermée, et c'est tout l'intérêt
 *
 * Un champ inconnu se refuse. Sans cette fermeture, `typo: "mesure"` passerait
 * sans un mot : la variable n'aurait pas de type, et l'on chercherait longtemps
 * pourquoi elle ne se compare à rien.
 *
 * ## Ce qui s'ouvre en liste se lit, et ne se garde pas
 *
 * `déjà utilisé dans` se **recalcule** à chaque nouvelle utilisation, et
 * `structure attendue` décrit un tableau. Les relire ici pour les reposer en
 * ferait deux vérités qui divergeraient au premier usage (règle 4). On les
 * traverse donc sans les retenir — mais sans les refuser non plus, sans quoi un
 * fichier engendré par le projet se ferait refuser par le projet.
 */
export function lireUnChampDeclare(declaration, corps = "", { refuser = null } = {}) {
  const dit = texte(corps);
  if (!dit) return;

  // Ce qui ouvre ou ferme une liste, et ce qu'elle contient. On passe.
  if (LISTES_DE_LA_DECLARATION.test(dit) || LISTE_FERMANTE.test(dit) || CHAMP_OUVRANT.test(dit)) return;

  const champ = dit.match(CHAMP_DENREGISTREMENT);
  if (!champ) {
    // Une entrée de liste : `Vitesse de référence (vent.ref)`. Elle ne porte
    // rien qu'on garde, et la refuser ferait refuser le fichier que le projet
    // engendre lui-même.
    if (/^[^:]+\s*\([^)]*\)\s*,?$/.test(dit)) return;
    refuser?.("cette ligne n'est pas un champ de déclaration.");
    return;
  }

  const cle = texte(champ[1]).toLowerCase();
  if (!CHAMPS_DE_LA_DECLARATION.has(cle)) {
    refuser?.(`« ${texte(champ[1])} » n'est pas un champ d'une déclaration.`);
    return;
  }

  const brut = texte(champ[2]).replace(/,$/, "");

  // **Le domaine fermé d'un nom.** Il s'écrit comme partout ailleurs dans le
  // langage — `"1" ou "2" ou "3"` —, et non entre crochets : une seconde façon
  // d'énumérer ferait deux grammaires pour la même idée.
  if (cle === "valeurs possibles") {
    declaration.valeurs = brut.split(/\s+ou\s+/i)
      .map((morceau) => lireUneValeur(texte(morceau)).valeur)
      .filter(Boolean);
    return;
  }

  const { valeur } = lireUneValeur(brut);
  if (cle === "unité" || cle === "unite") declaration.unite = valeur;
  else declaration[cle === "ce que le projet en dit" ? "ceQueLeProjetEnDit" : cle] = valeur;
}

/**
 * Ce dont un bloc dépend : les sujets de ses conditions, et rien d'autre.
 *
 * C'est ce qui remplace l'ancien `dépend de` écrit à la main. Une dépendance
 * calculée ne peut pas diverger de la règle dont elle sort, alors qu'une
 * dépendance recopiée diverge le jour où quelqu'un modifie la règle sans y
 * penser.
 */
export function dependancesDuBloc(bloc = {}) {
  const sujets = [
    ...(bloc?.conditions ?? []).map((condition) => texte(condition?.sujet)),
    ...(bloc?.sauf ?? []).map((condition) => texte(condition?.sujet))
  ].filter(Boolean);

  return [...new Set(sujets)];
}

/**
 * Les noms qu'un bloc **produit** : son sujet, et ceux où il dit s'enregistrer.
 *
 * ## Pourquoi les deux, et pourquoi ici
 *
 * Une fonction conclut sous son propre nom ; un `enregistre (Cote: …, dans:
 * …)` dit qu'elle conclut aussi sous celui-là. Les deux sont **déduits**, et
 * aucun des deux ne se demande : un formulaire qui offrirait un champ « Taux
 * de TVA » alors qu'une règle le conclut ferait taper à la main la réponse
 * qu'on venait chercher — c'est le défaut qu'on a vu à l'écran.
 *
 * Le graphe des blocs le savait à moitié : il appelait « produit » le sujet du
 * bloc, et ignorait ses `enregistre`. Un seul endroit le dit maintenant, et
 * tout le monde y lit la même chose (règle 10).
 */
export function nomsProduitsParLeBloc(bloc = {}) {
  return [...new Set([
    texte(bloc?.sujet),
    ...(bloc?.enregistre ?? []).map((sortie) => texte(sortie?.sujet))
  ].filter(Boolean))];
}

/**
 * Ce qu'un bloc **conclut par lui-même**, et que le bac peut donc calculer.
 *
 * ## Pourquoi ce n'est pas tout ce qu'il produit
 *
 * Une fonction qui appelle un agent **range** des résultats sans les calculer :
 * sa loi n'est pas dans le fichier (fondamental 9), et personne ici ne sait ce
 * qu'elle rendrait. Les retirer du formulaire priverait d'un champ qu'on veut
 * justement remplir à la main pour éprouver ce qui en dépend — et la règle
 * d'en face resterait indécidable pour toujours, sans qu'un mot dise pourquoi.
 *
 * La mémoire du projet, elle, **les produit** : l'agent y est appelé pour de
 * bon. Les deux questions sont donc différentes, et se posent séparément.
 */
export function nomsConclusParLeBloc(bloc = {}) {
  if (texte(bloc?.agent)) return [];
  return nomsProduitsParLeBloc(bloc);
}

/**
 * Le graphe d'un jeu de blocs : qui a besoin de quoi.
 *
 * Un sujet qu'aucun bloc ne produit est une **entrée** : c'est ce qu'il faudra
 * demander, ou lire dans un document. Les compter, c'est mesurer ce qu'un
 * référentiel coûte à celui qui l'utilise.
 */
export function grapheDesBlocs(blocs = []) {
  const liste = Array.isArray(blocs) ? blocs : [];
  const produits = new Set(liste.flatMap(nomsProduitsParLeBloc));
  const liens = [];
  const entrees = new Set();

  for (const bloc of liste) {
    const vers = texte(bloc?.sujet);
    for (const socle of dependancesDuBloc(bloc)) {
      liens.push({ de: socle, vers });
      if (!produits.has(socle)) entrees.add(socle);
    }
  }

  return { produits: [...produits], liens, entrees: [...entrees].sort() };
}

/**
 * Ce qu'il faut revérifier quand une donnée change.
 *
 * C'est la question à laquelle cette mémoire existe pour répondre : « la
 * hauteur passe de 26 à 28,40 m, qu'est-ce qui tombe ? ». On descend le graphe,
 * ce qui dépend d'elle, puis ce qui dépend de cela.
 *
 * Un cycle ne fait pas boucler : un sujet déjà vu ne se reparcourt pas. Un
 * corpus circulaire est possible, et une page qui gèle est pire qu'une réponse
 * incomplète.
 */
export function aRevoirSi(sujet = "", blocs = []) {
  const { liens } = grapheDesBlocs(blocs);
  const depuis = new Map();
  for (const lien of liens) {
    if (!depuis.has(lien.de)) depuis.set(lien.de, []);
    depuis.get(lien.de).push(lien.vers);
  }

  const touches = [];
  const vus = new Set([texte(sujet)]);
  const file = [texte(sujet)];
  while (file.length) {
    for (const suivant of depuis.get(file.shift()) ?? []) {
      if (vus.has(suivant)) continue;
      vus.add(suivant);
      touches.push(suivant);
      file.push(suivant);
    }
  }

  return touches;
}

/**
 * Une ligne de texte, recolorée.
 *
 * ## Pourquoi elle passe par la lecture
 *
 * Le diff garde ses lignes en texte, parce que c'est ainsi qu'il les compare :
 * deux chaînes égales sont deux lignes inchangées, et rien de plus subtil n'est
 * nécessaire. Mais l'écran doit les **colorer**, et pour colorer il faut savoir
 * de quelle espèce est chaque morceau.
 *
 * On relit donc la ligne, et on la réécrit. `lire(écrire(G)) = G` garantit que
 * rien ne se perd au passage — c'est exactement à cela que sert cette loi. La
 * seule autre solution serait de transporter les jetons à côté du texte, et
 * deux représentations de la même ligne finiraient par diverger.
 *
 * @returns {{type: string, texte: string}[]}
 */
export function jetonsDeLaLigne(ligne = "") {
  const brute = String(ligne ?? "");
  const blancs = (brute.match(/^[\t ]*/) ?? [""])[0];
  const nu = texte(brute);
  if (!nu) return [];

  const marge = blancs ? [{ type: JETON.NEUTRE, texte: blancs }] : [];

  // Un commentaire se rend tel quel : rien à interpréter, donc rien à
  // recomposer — et le rendre autrement le ferait mentir.
  if (estUnCommentaire(nu)) return [...marge, { type: JETON.COMMENTAIRE, texte: nu }];

  const { mot, reste } = teteDe(nu);

  const type = mot.endsWith(":") ? mot.slice(0, -1) : "";
  if (PROVENANCES.includes(type)) {
    return [...marge, ...(ligneDeProvenance({ type, quoi: reste }, 0) ?? []).slice(1)];
  }

  if (mot === "fichier:") return [...marge, ...ligneDeSectionLue(reste)];
  if (mot === "note:") return [...marge, ...ligneDeNote(reste)];
  if (mot === "parce que:") return [...marge, ...(ligneDePreuve(lireUneValeur(reste).valeur, 0) ?? []).slice(1)];
  if (mot === "statut:") return [...marge, ...(ligneDeStatut(reste, 0) ?? []).slice(1)];
  if (mot === "le:") return [...marge, ...(ligneDeDate(reste, 0) ?? []).slice(1)];

  // Les lignes d'un `.ref` qui s'étalent : on les rend telles qu'elles sont
  // écrites. Elles n'ont rien à recomposer — leur contenu est déductible —,
  // mais elles ont tout à colorer.
  const importe = lireUnImport(nu);
  if (importe) return [...marge, ...(ligneDImport(importe, 0) ?? []).slice(1)];

  const decision = lireUneDecision(nu);
  if (decision) return [...marge, ...(ligneDeDecision(decision, 0) ?? []).slice(1)];

  // L'appel d'une fonction native, qui ouvre son bloc. Il passe **avant** la
  // lecture d'un champ : sans cette priorité, `résultat = calcul natif (` se
  // lirait comme le sujet « résultat » valant « calcul natif ( ».
  const ouvreUnAppelDAgent = nu.match(APPEL_DAGENT_OUVRANT);
  if (ouvreUnAppelDAgent) {
    return [...marge,
      { type: JETON.NOM_LOCAL, texte: "résultat" },
      { type: JETON.NEUTRE, texte: " " },
      { type: JETON.OPERATEUR, texte: "=" },
      { type: JETON.NEUTRE, texte: " " },
      { type: JETON.MOT_NATIF, texte: ouvreUnAppelDAgent[1] },
      { type: JETON.NEUTRE, texte: " " },
      { type: JETON.PONCTUATION, texte: "(" }];
  }

  /**
   * `const Zone de vent = {` — la tête d'une déclaration de variable.
   *
   * Elle passe **avant** la lecture d'une tête de bloc : sans cela,
   * « const Zone de vent » devenait un sujet d'un seul tenant, et le mot du
   * langage se colorait comme un nom du projet.
   */
  const ouvreUneDeclarationLue = nu.match(/^const\s+(.+?)\s*=\s*\{$/i);
  if (ouvreUneDeclarationLue) {
    return [...marge,
      { type: JETON.MOT_CONST, texte: "const" },
      { type: JETON.NEUTRE, texte: " " },
      { type: JETON.SUJET, texte: texte(ouvreUneDeclarationLue[1]) },
      { type: JETON.NEUTRE, texte: " " },
      { type: JETON.OPERATEUR, texte: OPERATEUR.EGAL },
      { type: JETON.NEUTRE, texte: " " },
      { type: JETON.PONCTUATION, texte: "{" }];
  }

  /** `};` — la fin d'une déclaration. Deux ponctuations, et rien d'autre. */
  if (nu === "};") {
    return [...marge, { type: JETON.PONCTUATION, texte: "}" }, { type: JETON.PONCTUATION, texte: ";" }];
  }

  /**
   * Un champ de déclaration : `type:`, `valeurs possibles:`, `description:`…
   *
   * ## Pourquoi leur liste, et pas le contexte
   *
   * Cette lecture est **sans mémoire** : elle voit une ligne, jamais le bloc
   * qui l'entoure. Sans ce détour, `description:` se lisait comme un sujet du
   * projet — et la Mémoire, qui colore en rouge ce qu'aucune ligne ne déclare,
   * peignait en rouge **chaque champ de chaque déclaration**. Un fichier
   * entièrement en alerte n'alerte plus de rien.
   *
   * La liste est celle du lecteur, à un seul endroit (règle 10).
   */
  const champDeclare = nu.match(CHAMP_DENREGISTREMENT);
  const cleDeclaree = texte(champDeclare?.[1]).toLowerCase();
  if (champDeclare && (CHAMPS_DE_LA_DECLARATION.has(cleDeclaree) || LISTES_DE_LA_DECLARATION.test(nu))) {
    const virguleFinale = /,\s*$/.test(nu) ? [{ type: JETON.PONCTUATION, texte: "," }] : [];
    const dit = texte(champDeclare[2]).replace(/,$/, "");

    // `déjà utilisé dans: [` et `structure attendue: [` ouvrent une liste : on
    // rend le crochet tel quel plutôt que de le citer comme une valeur.
    const valeursDites = /^\[/.test(dit)
      ? [{ type: JETON.PONCTUATION, texte: dit }]
      : dit.split(/\s+ou\s+/i).flatMap((morceau, place) => [
        ...(place ? [
          { type: JETON.NEUTRE, texte: " " },
          { type: JETON.MOT_CONDITION, texte: "ou" },
          { type: JETON.NEUTRE, texte: " " }
        ] : []),
        { type: JETON.VALEUR, texte: texte(morceau) }
      ]);

    return [...marge,
      { type: JETON.LOCALE, texte: texte(champDeclare[1]) },
      { type: JETON.PONCTUATION, texte: ":" },
      { type: JETON.NEUTRE, texte: " " },
      ...valeursDites,
      ...virguleFinale];
  }

  // `const X;` — une locale déclarée, pas encore posée.
  const declaree = nu.match(LOCALE_VIDE);
  if (declaree) return [...marge, ...(ligneDeLocaleVide(declaree[1], 0) ?? []).slice(1)];

  // `alors (X = Y)` / `sinon (X = importe (…));` — une branche qui pose une
  // locale. Elle passe avant `alors`/`sinon` ordinaires : ceux-là posent une
  // **valeur**, et lire celle-ci comme telle en ferait un texte cité.
  const affecte = nu.match(AFFECTATION);
  if (affecte) {
    const emprunt = lireUnImport(texte(affecte[3]));
    return [...marge, ...(ligneDAffectation(affecte[1], {
      nom: texte(affecte[2]),
      valeur: texte(affecte[3]),
      importe: emprunt,
      fin: /;\s*$/.test(nu)
    }, 0) ?? []).slice(1)];
  }

  const ouvreUneConclusion = nu.match(CONCLUSION_OUVRANTE);
  if (ouvreUneConclusion) {
    return [...marge,
      { type: JETON.MOT_CONDITION, texte: ouvreUneConclusion[1] },
      { type: JETON.NEUTRE, texte: " " },
      { type: JETON.PONCTUATION, texte: "(" }];
  }

  if (ENREGISTRE_OUVRANT.test(nu)) {
    return [...marge,
      { type: JETON.MOT_NATIF, texte: "enregistre" },
      { type: JETON.NEUTRE, texte: " " },
      { type: JETON.PONCTUATION, texte: "(" }];
  }

  if (FERMETURE.test(nu)) return [...marge, { type: JETON.PONCTUATION, texte: nu }];

  const champ = nu.match(CHAMP_DENREGISTREMENT);
  if (champ && !mot) {
    const cle = texte(champ[1]);
    const suite = texte(champ[2]);
    const virgule = /,\s*$/.test(nu) ? [{ type: JETON.PONCTUATION, texte: "," }] : [];
    const nomEnCle = cle.toLowerCase();

    // `dans:` porte un fichier, `zones:` une portée, le reste est le sujet qu'on
    // enregistre — trois natures, trois couleurs.
    const dit = suite.replace(/,$/, "");

    // Quatre clés du langage, quatre natures : un fichier, une portée, un
    // utilitaire, une version. Les trois dernières ne se citent pas — ce sont
    // des noms, pas des textes du projet.
    const COULEURS = { dans: JETON.CHEMIN, zones: JETON.PORTEE, utilitaire: JETON.SOURCE, version: JETON.SOURCE };

    if (COULEURS[nomEnCle]) {
      return [...marge,
        { type: JETON.LOCALE, texte: cle },
        { type: JETON.PONCTUATION, texte: ":" },
        { type: JETON.NEUTRE, texte: " " },
        { type: COULEURS[nomEnCle], texte: dit },
        ...virgule];
    }

    const lue = lireUneValeur(dit);
    // Troisième loi de lecture, prolongée : un texte porte des guillemets, une
    // mesure n'en porte pas — et ce qui n'est **ni l'un ni l'autre** est un
    // **nom**. `Profondeur hors gel: Profondeur hors gel à retenir` passe une
    // locale ; le citer en ferait un texte que le projet affirmerait.
    const reference = !lue.citee && !lue.unite && !/^-?\d/.test(dit) && Boolean(dit);

    return [...marge,
      { type: JETON.SUJET, texte: cle },
      { type: JETON.PONCTUATION, texte: ":" },
      { type: JETON.NEUTRE, texte: " " },
      ...(reference ? [{ type: JETON.NOM_LOCAL, texte: dit }] : jetonsDeValeur(lue.valeur, lue.unite)),
      ...virgule];
  }

  /**
   * `calcule Prix TTC = Prix HT + TVA;`
   *
   * **La ligne entière part au peintre de la saisie.** Lui seul découpe une
   * expression au caractère près — opérateurs, parenthèses, nombres, unités —,
   * et il le fait déjà pour la zone de code. Recomposer la ligne ici en
   * donnerait une seconde lecture, qui divergerait de la première au premier
   * signe ajouté au langage (règle 10).
   */
  if (mot === VERBES.CALCULE) return jetonsEcrits(brute);

  // `soit texte = "…";` — une locale de règle. Le nom porte le sens, la valeur
  // se cite : on la relit pour la réécrire telle qu'elle était.
  if (mot === "soit") {
    const locale = lireUneLocale(reste);
    if (locale) return [...marge, ...(ligneDeLocale(locale.nom, locale.valeur, 0) ?? []).slice(1)];
  }

  if (mot === "alors" || mot === "sinon") {
    // Les bornes disent que la ligne vient d'un `.ref` : on les retire pour
    // lire et on les remet pour écrire, à l'identique.
    const { corps, borne } = sansBornes(reste);
    const lue = lireUneValeur(corps);
    return [...marge, ...ligneDeConsequence(mot, lue.valeur, lue.unite, 0, { regle: borne }).slice(1)];
  }

  if (mot === "si" || mot === "et" || mot === "ou" || mot === "non" || mot === "sauf si") {
    const { corps, borne } = sansBornes(reste);
    const condition = lireUneCondition(corps);
    if (condition) return [...marge, ...ligneDeCondition(mot, condition, 0, { regle: borne }).slice(1)];
  }

  // Une tête de bloc : une affirmation, ou une fonction avec sa signature.
  //
  // L'accolade se retire avant de lire et se remet après. La garder faisait
  // avaler la signature entière par le sujet — « Classement du bâtiment(zones,
  // Hauteur) { » en un seul jeton —, et une règle apparaissait dans un diff
  // sans aucune de ses entrées colorées.
  const ouvrante = /\s*\{$/.test(nu);
  const sansAccolade = ouvrante ? texte(nu.replace(/\s*\{$/, "")) : nu;
  const borne = ouvrante ? [{ type: JETON.NEUTRE, texte: " " }, { type: JETON.ACCOLADE, texte: "{" }] : [];

  const tete = lireUneTete(sansAccolade);
  if (tete?.regle && /^fonction\s/i.test(nu)) return [...marge, ...ligneDeFonction(tete.sujet, tete.entrees), ...borne];
  if (tete?.regle) return [...marge, ...ligneDeDonnee(tete.sujet, tete.entrees, { regle: false }), ...borne];
  if (tete?.entrees?.length) return [...marge, ...ligneDeDonnee(tete.sujet, tete.entrees), ...borne];
  if (tete?.valeur) return [...marge, ...ligneDAffirmation({ sujet: tete.sujet, valeur: tete.valeur, unite: tete.unite }), ...borne];
  if (tete?.sujet) return [...marge, ...ligneDeDonnee(tete.sujet), ...borne];

  // Ce qu'on ne sait pas lire s'affiche tel quel, sans couleur. Le taire serait
  // pire : la ligne existe, et elle doit rester lisible.
  return [...marge, { type: JETON.NEUTRE, texte: nu }];
}

/** `fichier: …` — le chemin se colore comme une section. */
function ligneDeSectionLue(chemin) {
  return [
    { type: JETON.MOT_FICHIER, texte: "fichier:" },
    { type: JETON.NEUTRE, texte: " " },
    { type: JETON.SECTION, texte: texte(chemin) }
  ];
}
