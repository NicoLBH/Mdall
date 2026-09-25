/**
 * L'arithmétique du Mdall : ce qu'une règle sait calculer, et ce qu'elle refuse.
 *
 * ## Pourquoi cela n'existait pas, et pourquoi cela existe maintenant
 *
 * Mdall comparait et concluait ; il ne calculait pas. La consigne donnée au
 * modèle le disait mot pour mot — « ne l'invente pas » —, et pour une bonne
 * raison : **une arithmétique inventée est indiscernable d'une arithmétique
 * juste**, et personne ne s'en aperçoit. Tant qu'aucun calcul n'était écrit, la
 * seule façon d'en obtenir un était d'appeler un agent, dont la loi se rejoue.
 *
 * Mais une TVA à 20 %, une surface, une cote de plancher bas prise à un mètre
 * au-dessus du sol — ce sont les phrases les plus ordinaires d'un projet, et
 * les renvoyer toutes à un agent revient à dire que le langage ne sait pas
 * écrire ce qu'on lui demande le plus souvent.
 *
 * Ce module ne lève donc pas l'interdit : il le **déplace**. Ce qui est écrit
 * ici se lit, se rejoue et se vérifie ligne à ligne, comme une condition. Ce
 * qui n'est pas écrit ici reste un agent.
 *
 * ## Les trois choses qu'il ne fait jamais
 *
 * 1. **Il ne devine pas une valeur qui manque.** Un nom sans valeur rend
 *    `indécidable`, jamais zéro. `Number("")` vaut zéro, et une altitude à zéro
 *    se calcule sans broncher jusqu'à une cote de fondation fausse — c'est
 *    arrivé, et `lireUnNombre` porte déjà la cicatrice.
 * 2. **Il ne compose pas une unité qu'il ne sait pas composer.** `3 m + 2`
 *    n'est pas cinq mètres, et `2 m * 3 €` n'est rien du tout : il refuse, et
 *    il dit pourquoi. Ne pas savoir n'autorise pas à prétendre qu'on sait
 *    (règle 5).
 * 3. **Il ne rend jamais l'infini ni `NaN`.** Une division par zéro est un
 *    refus nommé, pas une valeur qui traverse trois écrans avant de se voir.
 *
 * ## La virgule décimale, et le point-virgule des arguments
 *
 * On écrit `0,2` : c'est la virgule décimale du français, et c'est celle que la
 * mémoire écrit déjà partout (`mesureEnFrancais`). Elle ne peut donc pas
 * séparer aussi les arguments d'une fonction — `min(1,5)` serait le minimum de
 * un et cinq, ou bien un et demi, sans qu'aucune règle ne tranche. Les
 * arguments se séparent donc d'un **point-virgule** : `min(1,5; 2)`. Une
 * virgule à cette place est refusée en le disant, plutôt que de choisir au
 * hasard entre deux lectures.
 *
 * ## Le pourcentage est un suffixe, pas un opérateur
 *
 * `20%` vaut `0,2`, sans unité. C'est ainsi qu'on écrit une TVA, un abattement,
 * une pente. Le modulo n'a pas d'emploi dans un projet de construction et
 * n'aurait fait qu'ajouter une lecture possible à un signe qui en a déjà une.
 */

import { lireUnNombre, mesureEnFrancais, estMesuree, couperLUnite } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'un calcul peut refuser, et chaque refus est nommé. */
export const REFUS_DU_CALCUL = {
  /** Il n'y a rien à calculer. */
  VIDE: "vide",
  /** Un caractère qui n'est pas du langage. */
  CARACTERE_INCONNU: "caractere-inconnu",
  /** Une parenthèse ouverte et jamais fermée, ou l'inverse. */
  PARENTHESE: "parenthese",
  /** Un opérateur sans son second membre : `2 +`. */
  MEMBRE_MANQUANT: "membre-manquant",
  /** Ce qui reste après la fin de l'expression : `2 3`. */
  RESTE: "reste",
  /** Une virgule là où le langage attend un point-virgule. */
  VIRGULE_ARGUMENT: "virgule-argument",
  /** Une fonction que le langage ne connaît pas. */
  FONCTION_INCONNUE: "fonction-inconnue",
  /** Le mauvais nombre d'arguments. */
  ARGUMENTS: "arguments",
  /** Deux unités qu'on ne sait pas additionner, ni composer. */
  UNITES: "unites",
  /** Une division par zéro. */
  DIVISION_PAR_ZERO: "division-par-zero",
  /** Une puissance que l'unité ne suit pas : la racine d'un mètre. */
  PUISSANCE_ET_UNITE: "puissance-et-unite",
  /** Une racine de nombre négatif, ou une puissance impossible. */
  HORS_DOMAINE: "hors-domaine"
};

const PHRASES_DU_REFUS = {
  [REFUS_DU_CALCUL.VIDE]: "il n'y a rien à calculer",
  [REFUS_DU_CALCUL.CARACTERE_INCONNU]: "ce caractère n'est pas du langage",
  [REFUS_DU_CALCUL.PARENTHESE]: "une parenthèse n'est pas refermée",
  [REFUS_DU_CALCUL.MEMBRE_MANQUANT]: "cet opérateur attend un second membre",
  [REFUS_DU_CALCUL.RESTE]: "ce qui suit ne se rattache à rien",
  [REFUS_DU_CALCUL.VIRGULE_ARGUMENT]:
    "la virgule est décimale : les arguments se séparent d'un point-virgule",
  [REFUS_DU_CALCUL.FONCTION_INCONNUE]: "cette fonction n'est pas du langage",
  [REFUS_DU_CALCUL.ARGUMENTS]: "cette fonction n'attend pas ce nombre d'arguments",
  [REFUS_DU_CALCUL.UNITES]: "ces deux unités ne se composent pas",
  [REFUS_DU_CALCUL.DIVISION_PAR_ZERO]: "on ne divise pas par zéro",
  [REFUS_DU_CALCUL.PUISSANCE_ET_UNITE]: "cette puissance ne s'applique pas à cette unité",
  [REFUS_DU_CALCUL.HORS_DOMAINE]: "ce calcul n'a pas de résultat réel"
};

/** Ce qu'un refus dit, en français. */
export function phraseDuRefus(code, quoi = "") {
  const dit = PHRASES_DU_REFUS[code] ?? "ce calcul ne se lit pas";
  return quoi ? `${dit} — ${quoi}` : dit;
}

/**
 * Les fonctions de base, et le nombre d'arguments que chacune prend.
 *
 * Elles sont peu nombreuses **exprès**. Chaque fonction de plus est une loi de
 * plus qu'il faut enseigner, écrire dans le wiki, et qu'un relecteur doit
 * connaître pour signer. Celles-ci répondent aux phrases qu'on écrit vraiment :
 * une racine, un arrondi, une borne.
 */
export const FONCTIONS = {
  racine: { arguments: [1] },
  abs: { arguments: [1] },
  arrondi: { arguments: [1, 2] },
  plafond: { arguments: [1] },
  plancher: { arguments: [1] },
  min: { arguments: [2, 3, 4, 5, 6, 7, 8] },
  max: { arguments: [2, 3, 4, 5, 6, 7, 8] }
};

/* ────────────────────────────────────────────────────────────────────────────
 * Les unités, avec leur exposant
 *
 * `m`, `m²`, `m³` sont la même unité à trois exposants ; les composer est alors
 * de l'addition d'exposants, et non une table de cas. Tout le reste — `km/h`,
 * `MPa` — est **opaque** : on sait l'additionner à elle-même et la multiplier
 * par un nombre nu, et l'on refuse le reste plutôt que d'inventer une algèbre
 * que personne n'a demandée.
 * ──────────────────────────────────────────────────────────────────────────── */

const EXPOSANTS = { "²": 2, "³": 3 };
const SIGNES_DE_LEXPOSANT = { 2: "²", 3: "³" };

/** `m²` → `{ base: "m", exposant: 2 }`. Une unité opaque garde l'exposant 1. */
export function lireUneUnite(unite = "") {
  const brut = texte(unite);
  if (!brut) return { base: "", exposant: 0, opaque: false };

  const trouve = brut.match(/^([A-Za-zÀ-ÖØ-öø-ÿ°µ]+)([²³])$/);
  if (trouve) return { base: trouve[1], exposant: EXPOSANTS[trouve[2]], opaque: false };
  if (/^[A-Za-zÀ-ÖØ-öø-ÿ°µ€]+$/.test(brut)) return { base: brut, exposant: 1, opaque: false };

  // `km/h`, `kN/m²`, `%` : on ne sait ni les élever ni les composer entre
  // elles. On ne prétend pas le contraire.
  return { base: brut, exposant: 1, opaque: true };
}

/** `{ base: "m", exposant: 2 }` → `m²`. Un exposant qu'on ne sait pas écrire refuse. */
export function ecrireUneUnite({ base = "", exposant = 0 } = {}) {
  if (!base || exposant === 0) return "";
  if (exposant === 1) return base;
  return SIGNES_DE_LEXPOSANT[exposant] ? `${base}${SIGNES_DE_LEXPOSANT[exposant]}` : null;
}

/** L'unité d'un produit ou d'un quotient, ou `null` si elle ne se compose pas. */
function composerLesUnites(gauche, droite, sens) {
  const un = lireUneUnite(gauche);
  const autre = lireUneUnite(droite);

  if (!autre.base) return gauche;
  if (!un.base) return sens > 0 ? droite : ecrireUneUnite({ base: autre.base, exposant: -autre.exposant });
  if (un.opaque || autre.opaque || un.base !== autre.base) return null;

  return ecrireUneUnite({ base: un.base, exposant: un.exposant + sens * autre.exposant });
}

/* ────────────────────────────────────────────────────────────────────────────
 * La lecture : du texte à un arbre
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Un nombre : « 12 », « 0,2 », « 1 200 », « 1.5 ».
 *
 * **Une seule alternative, et non deux.** Écrite avec un `|`, la première
 * branche gagnait sur « 1.5 » en ne prenant que le « 1 », et le point restait
 * derrière comme un caractère inconnu — un calcul juste, refusé.
 */
const NOMBRE = /^\d+(?:[    ]\d{3})*(?:[.,]\d+)?/;
/**
 * Un mot, et **ni `×` ni `÷`**.
 *
 * `À-ÿ` est une plage de points de code, pas un alphabet : le signe multiplié
 * (U+00D7) et le signe divisé (U+00F7) y tombent entre les lettres accentuées.
 * Écrite ainsi, « 6 × 7 » se lisait « 6 » suivi d'une unité nommée « × », et la
 * multiplication disparaissait sans un mot. Les deux trous sont donc ouverts à
 * la main — `À-Ö`, `Ø-ö`, `ø-ÿ` —, ici comme partout où ce module lit des
 * lettres.
 */
const MOT = /^[A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_'’]*/;
const UNITE = /^(?:[A-Za-zÀ-ÖØ-öø-ÿ°µ]+(?:\/[A-Za-zÀ-ÖØ-öø-ÿ°µ]+)?[²³]?|€)/;

/** Un refus de lecture, avec l'endroit où l'on a buté. */
const refuser = (motif, ou = "") => ({ ok: false, motif, ou: texte(ou) });

/**
 * L'arbre d'un calcul, ou pourquoi il ne se lit pas.
 *
 * @returns {{ok: true, arbre: object} | {ok: false, motif: string, ou: string}}
 */
export function lireUnCalcul(source = "") {
  const jetons = decouper(source);
  if (!jetons.ok) return jetons;
  if (!jetons.jetons.length) return refuser(REFUS_DU_CALCUL.VIDE);

  const etat = { jetons: jetons.jetons, rang: 0 };
  const arbre = lireUneSomme(etat);
  if (!arbre.ok) return arbre;

  const reste = etat.jetons[etat.rang];
  if (reste) {
    if (reste.type === "virgule") return refuser(REFUS_DU_CALCUL.VIRGULE_ARGUMENT, reste.texte);
    if (reste.type === "ferme") return refuser(REFUS_DU_CALCUL.PARENTHESE, reste.texte);
    return refuser(REFUS_DU_CALCUL.RESTE, reste.texte);
  }

  return { ok: true, arbre: arbre.arbre };
}

/** Le texte, en jetons. Les noms à plusieurs mots s'y recollent. */
function decouper(source) {
  let reste = String(source ?? "");
  const jetons = [];

  while (reste) {
    const blanc = reste.match(/^\s+/);
    if (blanc) { reste = reste.slice(blanc[0].length); continue; }

    const nombre = reste.match(NOMBRE);
    if (nombre) {
      reste = reste.slice(nombre[0].length);
      const valeur = lireUnNombre(nombre[0]);

      // Le pourcentage est un suffixe : `20%` vaut `0,2`, sans unité.
      const apresBlanc = reste.replace(/^[    ]*/, "");
      if (apresBlanc.startsWith("%")) {
        reste = apresBlanc.slice(1);
        jetons.push({ type: "nombre", valeur: valeur / 100, unite: "", texte: `${nombre[0]}%` });
        continue;
      }

      // L'unité suit le nombre, et **une seule** : au-delà, ce serait un nom.
      const unite = apresBlanc.match(UNITE);
      const colle = unite && !FONCTIONS[unite[0].toLowerCase()]
        && !apresBlanc.slice(unite[0].length).trimStart().startsWith("(");
      if (colle) reste = apresBlanc.slice(unite[0].length);

      jetons.push({ type: "nombre", valeur, unite: colle ? unite[0] : "", texte: nombre[0] });
      continue;
    }

    const mot = reste.match(MOT);
    if (mot) {
      // Un nom du projet porte des espaces — « Prix HT », « Zone de vent ». On
      // recolle donc les mots qui se suivent, et l'on s'arrête au premier signe.
      let nom = mot[0];
      reste = reste.slice(mot[0].length);

      if (FONCTIONS[nom.toLowerCase()] && reste.trimStart().startsWith("(")) {
        jetons.push({ type: "fonction", nom: nom.toLowerCase(), texte: nom });
        continue;
      }

      for (;;) {
        const suite = reste.match(/^[    ]+([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ0-9_'’]*)/);
        if (!suite) break;
        nom += ` ${suite[1]}`;
        reste = reste.slice(suite[0].length);
      }

      jetons.push({ type: "nom", nom, texte: nom });
      continue;
    }

    const signe = reste[0];
    reste = reste.slice(1);

    if ("+-*/^×÷".includes(signe)) { jetons.push({ type: "signe", texte: signe }); continue; }
    if (signe === "(") { jetons.push({ type: "ouvre", texte: signe }); continue; }
    if (signe === ")") { jetons.push({ type: "ferme", texte: signe }); continue; }
    if (signe === ";") { jetons.push({ type: "separateur", texte: signe }); continue; }
    if (signe === ",") { jetons.push({ type: "virgule", texte: signe }); continue; }

    return refuser(REFUS_DU_CALCUL.CARACTERE_INCONNU, signe);
  }

  return { ok: true, jetons };
}

const signeCourant = (etat) => (etat.jetons[etat.rang]?.type === "signe"
  ? etat.jetons[etat.rang].texte : "");

function lireUneSomme(etat) {
  let gauche = lireUnProduit(etat);
  if (!gauche.ok) return gauche;

  for (;;) {
    const signe = signeCourant(etat);
    if (signe !== "+" && signe !== "-") return gauche;
    etat.rang += 1;

    const droite = lireUnProduit(etat);
    if (!droite.ok) return droite;
    gauche = { ok: true, arbre: { quoi: "binaire", signe, gauche: gauche.arbre, droite: droite.arbre } };
  }
}

function lireUnProduit(etat) {
  let gauche = lireUnePuissance(etat);
  if (!gauche.ok) return gauche;

  for (;;) {
    const signe = signeCourant(etat);
    if (!"*/×÷".includes(signe) || !signe) return gauche;
    etat.rang += 1;

    const droite = lireUnePuissance(etat);
    if (!droite.ok) return droite;
    const normalise = signe === "×" ? "*" : signe === "÷" ? "/" : signe;
    gauche = { ok: true, arbre: { quoi: "binaire", signe: normalise, gauche: gauche.arbre, droite: droite.arbre } };
  }
}

/** `^` s'associe à droite : `2^3^2` vaut `2^(3^2)`, comme en mathématiques. */
function lireUnePuissance(etat) {
  const gauche = lireUnSigne(etat);
  if (!gauche.ok) return gauche;
  if (signeCourant(etat) !== "^") return gauche;

  etat.rang += 1;
  const droite = lireUnePuissance(etat);
  if (!droite.ok) return droite;
  return { ok: true, arbre: { quoi: "binaire", signe: "^", gauche: gauche.arbre, droite: droite.arbre } };
}

function lireUnSigne(etat) {
  const signe = signeCourant(etat);
  if (signe !== "-" && signe !== "+") return lireUnTerme(etat);

  etat.rang += 1;
  const dessous = lireUnSigne(etat);
  if (!dessous.ok) return dessous;
  return signe === "+"
    ? dessous
    : { ok: true, arbre: { quoi: "oppose", dessous: dessous.arbre } };
}

function lireUnTerme(etat) {
  const jeton = etat.jetons[etat.rang];
  if (!jeton) return refuser(REFUS_DU_CALCUL.MEMBRE_MANQUANT);

  if (jeton.type === "nombre") {
    etat.rang += 1;
    return { ok: true, arbre: { quoi: "nombre", valeur: jeton.valeur, unite: jeton.unite } };
  }

  if (jeton.type === "nom") {
    etat.rang += 1;
    return { ok: true, arbre: { quoi: "nom", nom: jeton.nom } };
  }

  if (jeton.type === "ouvre") {
    etat.rang += 1;
    const dedans = lireUneSomme(etat);
    if (!dedans.ok) return dedans;
    if (etat.jetons[etat.rang]?.type !== "ferme") return refuser(REFUS_DU_CALCUL.PARENTHESE);
    etat.rang += 1;
    return dedans;
  }

  if (jeton.type === "fonction") {
    etat.rang += 1;
    if (etat.jetons[etat.rang]?.type !== "ouvre") return refuser(REFUS_DU_CALCUL.PARENTHESE, jeton.nom);
    etat.rang += 1;

    const arguments_ = [];
    for (;;) {
      const argument = lireUneSomme(etat);
      if (!argument.ok) return argument;
      arguments_.push(argument.arbre);

      const suivant = etat.jetons[etat.rang];
      if (suivant?.type === "separateur") { etat.rang += 1; continue; }
      if (suivant?.type === "virgule") return refuser(REFUS_DU_CALCUL.VIRGULE_ARGUMENT, jeton.nom);
      break;
    }

    if (etat.jetons[etat.rang]?.type !== "ferme") return refuser(REFUS_DU_CALCUL.PARENTHESE, jeton.nom);
    etat.rang += 1;

    if (!FONCTIONS[jeton.nom].arguments.includes(arguments_.length)) {
      return refuser(REFUS_DU_CALCUL.ARGUMENTS, jeton.nom);
    }
    return { ok: true, arbre: { quoi: "appel", nom: jeton.nom, arguments: arguments_ } };
  }

  if (jeton.type === "virgule") return refuser(REFUS_DU_CALCUL.VIRGULE_ARGUMENT, jeton.texte);
  return refuser(REFUS_DU_CALCUL.MEMBRE_MANQUANT, jeton.texte);
}

/** Les noms qu'un calcul lit : de quoi demander ce qui manque avant de lancer. */
export function nomsDuCalcul(arbre = null) {
  const noms = [];
  const parcourir = (noeud) => {
    if (!noeud) return;
    if (noeud.quoi === "nom") { if (!noms.includes(noeud.nom)) noms.push(noeud.nom); return; }
    if (noeud.quoi === "oppose") return parcourir(noeud.dessous);
    if (noeud.quoi === "binaire") { parcourir(noeud.gauche); parcourir(noeud.droite); return; }
    if (noeud.quoi === "appel") noeud.arguments.forEach(parcourir);
  };
  parcourir(arbre);
  return noms;
}

/* ────────────────────────────────────────────────────────────────────────────
 * L'évaluation : de l'arbre à une mesure, ou à un aveu
 *
 * Trois issues, et elles ne se confondent jamais :
 *
 * - **une mesure** — `{ connu: true, nombre, unite }` ;
 * - **indécidable** — un nom qu'on n'a pas : `manquants` les nomme, et il n'y a
 *   pas de nombre. C'est l'issue qui apprend le langage, et celle qu'un zéro
 *   silencieux effacerait ;
 * - **un refus** — le calcul ne veut rien dire : `refus` le nomme.
 * ──────────────────────────────────────────────────────────────────────────── */

const indecidable = (manquants) => ({ connu: false, nombre: null, unite: "", refus: "", manquants });
const refuse = (motif, ou = "") =>
  ({ connu: false, nombre: null, unite: "", refus: motif, ou: texte(ou), manquants: [] });
const mesure = (nombre, unite = "") =>
  ({ connu: true, nombre, unite: texte(unite), refus: "", manquants: [] });

/**
 * Ce qu'un calcul vaut, avec ce qu'il a lu.
 *
 * @param {object} arbre l'arbre rendu par `lireUnCalcul`
 * @param {(nom: string) => {connu: boolean, valeur: string}} lire le lecteur de
 *   valeurs de l'évaluateur — le même que celui des conditions, pour qu'une
 *   règle et un calcul lisent la mémoire de la même façon (règle 10).
 */
export function evaluerUnCalcul(arbre = null, lire = () => ({ connu: false, valeur: "" })) {
  if (!arbre) return refuse(REFUS_DU_CALCUL.VIDE);

  if (arbre.quoi === "nombre") return mesure(arbre.valeur, arbre.unite);

  if (arbre.quoi === "nom") {
    const lue = lire(arbre.nom);
    if (!lue?.connu) return indecidable([arbre.nom]);

    // **La valeur doit être une mesure, et non pas seulement contenir un
    // chiffre.** `lireUnNombre` gratte les chiffres de ce qu'on lui donne :
    // « 3e famille B » lui rend **3**, et « Famille * 2 » aurait valu six. Une
    // famille de bâtiment n'est pas le nombre trois, et un calcul qui le croit
    // est exactement l'arithmétique inventée qu'on refuse (règle 5).
    //
    // `estMesuree` est le jugement que la mémoire porte déjà sur ses propres
    // valeurs — une mesure s'écrit nue, un texte entre guillemets. Un second
    // jugement écrit ici en aurait divergé (règle 4).
    if (!estMesuree(lue.valeur)) return indecidable([arbre.nom]);

    const { nombre, unite } = couperLUnite(lue.valeur);
    const lu = lireUnNombre(nombre);
    if (!Number.isFinite(lu)) return indecidable([arbre.nom]);

    return mesure(lu, unite);
  }

  if (arbre.quoi === "oppose") {
    const dessous = evaluerUnCalcul(arbre.dessous, lire);
    return dessous.connu ? mesure(-dessous.nombre, dessous.unite) : dessous;
  }

  if (arbre.quoi === "binaire") return evaluerUnSigne(arbre, lire);
  if (arbre.quoi === "appel") return evaluerUnAppel(arbre, lire);

  return refuse(REFUS_DU_CALCUL.RESTE, arbre.quoi);
}

/** Les deux membres, et le premier aveu l'emporte sur le second. */
function lesDeux(arbre, lire) {
  const gauche = evaluerUnCalcul(arbre.gauche, lire);
  const droite = evaluerUnCalcul(arbre.droite, lire);

  if (gauche.refus) return { arret: gauche };
  if (droite.refus) return { arret: droite };
  // Les deux manques se disent ensemble : corriger l'un pour découvrir l'autre
  // au lancement suivant fait deux allers-retours là où un suffit.
  if (!gauche.connu || !droite.connu) {
    return { arret: indecidable([...gauche.manquants, ...droite.manquants]) };
  }
  return { gauche, droite };
}

function evaluerUnSigne(arbre, lire) {
  const { arret, gauche, droite } = lesDeux(arbre, lire);
  if (arret) return arret;

  if (arbre.signe === "+" || arbre.signe === "-") {
    // **On n'additionne que ce qui est dans la même unité.** `3 m + 2` n'est
    // pas cinq mètres : c'est une ligne qu'il faut relire.
    if (texte(gauche.unite) !== texte(droite.unite)) {
      return refuse(REFUS_DU_CALCUL.UNITES, `${gauche.unite || "sans unité"} et ${droite.unite || "sans unité"}`);
    }
    const somme = arbre.signe === "+" ? gauche.nombre + droite.nombre : gauche.nombre - droite.nombre;
    return mesure(somme, gauche.unite);
  }

  if (arbre.signe === "*" || arbre.signe === "/") {
    if (arbre.signe === "/" && droite.nombre === 0) return refuse(REFUS_DU_CALCUL.DIVISION_PAR_ZERO);

    const unite = composerLesUnites(gauche.unite, droite.unite, arbre.signe === "*" ? 1 : -1);
    if (unite === null) {
      return refuse(REFUS_DU_CALCUL.UNITES, `${gauche.unite || "sans unité"} et ${droite.unite || "sans unité"}`);
    }
    const produit = arbre.signe === "*" ? gauche.nombre * droite.nombre : gauche.nombre / droite.nombre;
    return mesure(produit, unite);
  }

  if (arbre.signe === "^") {
    // L'exposant est un nombre nu : « au carré », « à la puissance un demi ».
    // Un exposant en mètres ne veut rien dire.
    if (droite.unite) return refuse(REFUS_DU_CALCUL.PUISSANCE_ET_UNITE, droite.unite);

    const unite = uniteDeLaPuissance(gauche.unite, droite.nombre);
    if (unite === null) return refuse(REFUS_DU_CALCUL.PUISSANCE_ET_UNITE, gauche.unite);

    const eleve = gauche.nombre ** droite.nombre;
    if (!Number.isFinite(eleve)) return refuse(REFUS_DU_CALCUL.HORS_DOMAINE);
    return mesure(eleve, unite);
  }

  return refuse(REFUS_DU_CALCUL.CARACTERE_INCONNU, arbre.signe);
}

/**
 * L'unité d'une puissance, ou `null`.
 *
 * `m² ^ 0,5` vaut `m` : c'est la racine d'une surface, et c'est la seule
 * puissance fractionnaire qu'une unité suit. `m ^ 0,5` n'a pas de nom, et l'on
 * ne va pas en inventer un.
 */
function uniteDeLaPuissance(unite, exposant) {
  if (!texte(unite)) return "";

  const lue = lireUneUnite(unite);
  if (lue.opaque) return null;

  // **Une seule décision sur les exposants qu'on sait écrire**, et elle est
  // dans `ecrireUneUnite` : elle rend `null` pour tout ce qui n'est ni nu, ni
  // carré, ni cube. Un second filtre écrit ici — « l'exposant doit être
  // entier » — ne faisait tomber aucun cas de plus, et il interdisait au
  // passage `m³ ^ (1/3)`, qui vaut des mètres et rien d'autre (règle 12).
  return ecrireUneUnite({ base: lue.base, exposant: lue.exposant * exposant });
}

function evaluerUnAppel(arbre, lire) {
  const valeurs = arbre.arguments.map((un) => evaluerUnCalcul(un, lire));

  const refusee = valeurs.find((une) => une.refus);
  if (refusee) return refusee;

  const manquants = valeurs.flatMap((une) => une.manquants);
  if (manquants.length) return indecidable([...new Set(manquants)]);

  const [premier, second] = valeurs;

  if (arbre.nom === "abs") return mesure(Math.abs(premier.nombre), premier.unite);
  if (arbre.nom === "plafond") return mesure(Math.ceil(premier.nombre), premier.unite);
  if (arbre.nom === "plancher") return mesure(Math.floor(premier.nombre), premier.unite);

  if (arbre.nom === "arrondi") {
    if (second && second.unite) return refuse(REFUS_DU_CALCUL.UNITES, second.unite);
    const decimales = second ? Math.trunc(second.nombre) : 0;
    if (decimales < 0 || decimales > 10) return refuse(REFUS_DU_CALCUL.HORS_DOMAINE, `${decimales}`);
    const facteur = 10 ** decimales;
    return mesure(Math.round(premier.nombre * facteur) / facteur, premier.unite);
  }

  if (arbre.nom === "racine") {
    if (premier.nombre < 0) return refuse(REFUS_DU_CALCUL.HORS_DOMAINE, "racine d'un nombre négatif");
    const unite = uniteDeLaPuissance(premier.unite, 0.5);
    if (unite === null) return refuse(REFUS_DU_CALCUL.PUISSANCE_ET_UNITE, premier.unite);
    return mesure(Math.sqrt(premier.nombre), unite);
  }

  if (arbre.nom === "min" || arbre.nom === "max") {
    // **Comparer demande la même unité.** Le plus petit de trois mètres et de
    // deux euros n'existe pas.
    const unite = texte(valeurs[0].unite);
    const autre = valeurs.find((une) => texte(une.unite) !== unite);
    if (autre) return refuse(REFUS_DU_CALCUL.UNITES, `${unite || "sans unité"} et ${autre.unite || "sans unité"}`);

    const nombres = valeurs.map((une) => une.nombre);
    return mesure(arbre.nom === "min" ? Math.min(...nombres) : Math.max(...nombres), unite);
  }

  return refuse(REFUS_DU_CALCUL.FONCTION_INCONNUE, arbre.nom);
}

/**
 * Lire et évaluer d'un coup : ce qu'appelle une règle.
 *
 * Rend toujours la même forme, refus de lecture compris — l'appelant n'a qu'un
 * cas à traiter, et il ne peut pas en oublier un.
 */
export function calculer(source = "", lire = () => ({ connu: false, valeur: "" })) {
  const lu = lireUnCalcul(source);
  if (!lu.ok) return refuse(lu.motif, lu.ou);
  return evaluerUnCalcul(lu.arbre, lire);
}

/**
 * Le résultat, écrit comme la mémoire écrit ses mesures.
 *
 * La virgule décimale, et l'unité derrière un espace : c'est `mesureEnFrancais`
 * qui le dit, et non une seconde façon d'écrire qui divergerait de la première
 * (règle 4).
 */
export function ecrireLeCalcul({ connu = false, nombre = null, unite = "" } = {}) {
  if (!connu || !Number.isFinite(nombre)) return "";

  // Douze décimales : ce qui reste au-delà est le bruit du binaire, pas une
  // précision. `0,1 + 0,2` doit s'écrire `0,3`, comme on l'a demandé.
  const arrondi = Number(nombre.toPrecision(12));
  return mesureEnFrancais(unite ? `${arrondi} ${unite}` : `${arrondi}`);
}
