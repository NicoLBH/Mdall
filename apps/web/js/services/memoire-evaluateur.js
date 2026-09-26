/**
 * Exécuter une règle du projet.
 *
 * ## Ce qui manquait
 *
 * Une règle en mémoire est l'**instantané d'une exécution passée** : ses
 * conditions, son article, ce qu'elle a conclu. On savait la lire, la dessiner,
 * la remonter. On ne savait pas la **rejouer** — `OPERATEUR` ne servait qu'à
 * écrire et à colorer du texte, et rien nulle part n'évaluait
 * `si Hauteur du plancher bas ≤ 28 m`.
 *
 * Sans cela, « voir ce qu'un changement entraîne » ne pouvait rendre que des
 * noms : on savait *quoi* devenait suspect, jamais *ce que ça devenait*. Voir
 * `docs/rejouer-la-memoire.md`, étape 3.
 *
 * Ce module est pur. Il ne lit ni la base, ni l'écran, ni la mémoire : on lui
 * donne une règle et de quoi lire ses entrées, il rend un verdict.
 *
 * ## Trois valeurs de vérité, et la troisième est celle qui compte
 *
 * `vrai`, `faux`, et **`null` — indécidable**. Une condition dont l'entrée
 * manque n'est pas fausse : on ne sait pas. Les confondre ferait conclure
 * `sinon` sur une règle qu'on n'a pas pu évaluer, c'est-à-dire rendre un chiffre
 * indiscernable d'un chiffre calculé. *Ne pas savoir n'autorise pas à prétendre*
 * (`docs/fondamentaux.md`, règle 5).
 *
 * Les clauses se combinent donc en logique ternaire :
 *
 * ```
 * faux et ?  = faux      vrai ou ?  = vrai
 * vrai et ?  = ?         faux ou ?  = ?
 * ```
 *
 * On évalue **toutes** les clauses quand même, y compris celles qu'un
 * court-circuit rendrait inutiles : la trace sert à comprendre, et une trace qui
 * s'arrête au premier faux n'explique rien.
 *
 * ## L'ordre des clauses : de gauche à droite, sans priorité
 *
 * `si (A) et (B) ou (C)` se lit `((A et B) ou C)`. Il n'y a pas de parenthèses
 * entre clauses dans l'écriture, et inventer une priorité que le lecteur ne voit
 * pas serait la pire des libertés. Le mélange des deux joncteurs est **signalé**
 * dans le verdict : le référentiel n'en produit pas, et une règle écrite à la
 * main qui en contient mérite d'être relue.
 *
 * ## Les unités ne se supposent pas
 *
 * `si Hauteur ≤ 28 m` contre « 26 cm » : comparer 26 à 28 rendrait « vrai » par
 * accident. Deux unités différentes de part et d'autre rendent la comparaison
 * **indécidable**, nommément. Une seule des deux portée — le seuil ou la valeur —
 * ne pose pas de problème : c'est l'écriture usuelle.
 */

import { OPERATEUR, couperLUnite, lireUnNombre } from "./memoire-en-texte.js";
import { cleDuSujet } from "./memoire-identifiants.js";
import { calculer, ecrireLeCalcul, phraseDuRefus } from "./mdall-calcul.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une clause peut valoir. `null` est une valeur, pas une absence. */
export const VERITE = { VRAI: true, FAUX: false, INDECIDABLE: null };

/** Pourquoi une clause n'a pas pu être tranchée. Nommé, jamais tu. */
export const DOUTE = {
  /** Personne n'a versé de valeur pour ce sujet. */
  ENTREE_ABSENTE: "entree-absente",
  /** Une comparaison de nombres sur ce qui n'est pas un nombre. */
  PAS_UN_NOMBRE: "pas-un-nombre",
  /** Deux unités différentes de part et d'autre du signe. */
  UNITES_INCOMPARABLES: "unites-incomparables",
  /** Un opérateur que ce module ne connaît pas. */
  OPERATEUR_INCONNU: "operateur-inconnu",
  /**
   * Une fonction native : sa loi n'est pas dans le texte, et ne peut pas y être.
   *
   * Ce n'est pas un défaut du fichier ni une entrée qui manque : c'est la forme
   * même de la fonction (voir `docs/fondamentaux.md`, règle 9). Ce module lit
   * des conditions ; une fonction native n'en a pas, et il n'y a rien à lire.
   * Le seul rejeu possible est de **redemander le calcul** — c'est ce que fait
   * `utilitaires-rejeu.js`, avec la version qui l'a produit.
   *
   * Sans ce doute, une fonction native se serait évaluée sur zéro condition,
   * donc « vraie », et le rejeu aurait annoncé qu'elle tient — sans avoir rien
   * calculé. Une confirmation qu'on n'a pas obtenue est pire qu'un silence :
   * elle apprend à croire l'écran.
   */
  LOI_NON_ECRITE: "loi-non-ecrite",
  /**
   * Un `calcule` qui ne veut rien dire.
   *
   * Pas une entrée qui manque — cela reste `ENTREE_ABSENTE` —, mais une
   * arithmétique que le langage refuse : deux unités qui ne se composent pas,
   * une division par zéro, une parenthèse ouverte. La règle ne conclut rien, et
   * il faut dire **pourquoi** plutôt que de laisser croire qu'une valeur
   * manque : on chercherait la valeur, et elle est là.
   */
  CALCUL_REFUSE: "calcul-refuse"
};

const PHRASES = {
  [DOUTE.ENTREE_ABSENTE]: "personne n'a versé de valeur pour ce sujet",
  [DOUTE.PAS_UN_NOMBRE]: "cette comparaison attend des nombres",
  [DOUTE.UNITES_INCOMPARABLES]: "les deux côtés ne sont pas dans la même unité",
  [DOUTE.OPERATEUR_INCONNU]: "cet opérateur n'est pas du langage",
  [DOUTE.CALCUL_REFUSE]: "ce calcul ne se fait pas",
  [DOUTE.LOI_NON_ECRITE]: "la loi de cette fonction n'est pas écrite : elle se refait au serveur"
};

/** Un doute dit en français. Une clause indécidable sans raison est une panne. */
export function phraseDuDoute(code) {
  return PHRASES[texte(code)] ?? "";
}

/**
 * Deux valeurs sont-elles la même ?
 *
 * On plie la casse, les accents et les espaces — c'est la normalisation que le
 * projet emploie déjà pour les sujets, et l'appliquer aux valeurs évite de
 * déclarer différentes « 3e famille B » et « 3E Famille B ». On ne va pas plus
 * loin : rapprocher « CF 1 h » de « CF 1h » demanderait de deviner.
 */
function memeValeur(gauche, droite) {
  return cleDuSujet(gauche) === cleDuSujet(droite);
}

/** Les valeurs attendues d'une condition, toujours comme une liste. */
function attendues(condition) {
  const brute = condition?.valeur;
  return (Array.isArray(brute) ? brute : [brute]).map(texte).filter(Boolean);
}

/**
 * Une comparaison de nombres, unités comprises.
 *
 * @returns {{verite: boolean|null, doute: string}}
 */
function comparerDesNombres(operateur, lue, attendue, uniteDeclaree) {
  const gauche = couperLUnite(lue);
  const droite = couperLUnite(attendue);

  const a = lireUnNombre(gauche.nombre);
  const b = lireUnNombre(droite.nombre);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { verite: null, doute: DOUTE.PAS_UN_NOMBRE };

  // Le seuil porte souvent son unité à part — `unite: "m"` sur la condition —
  // plutôt que dans son texte. Les deux écritures disent la même chose.
  const uniteAttendue = droite.unite || texte(uniteDeclaree);
  if (gauche.unite && uniteAttendue && !memeValeur(gauche.unite, uniteAttendue)) {
    return { verite: null, doute: DOUTE.UNITES_INCOMPARABLES };
  }

  switch (operateur) {
    case OPERATEUR.AU_PLUS: return { verite: a <= b, doute: "" };
    case OPERATEUR.AU_MOINS: return { verite: a >= b, doute: "" };
    case OPERATEUR.MOINS_DE: return { verite: a < b, doute: "" };
    case OPERATEUR.PLUS_DE: return { verite: a > b, doute: "" };
    default: return { verite: null, doute: DOUTE.OPERATEUR_INCONNU };
  }
}

/**
 * Une clause, tranchée.
 *
 * @param {object} condition la clause écrite dans la règle
 * @param {{connu: boolean, valeur: string}} lue ce que le projet dit du sujet
 * @returns {{sujet: string, operateur: string, attendu: string[], lu: string,
 *   verite: boolean|null, doute: string}}
 */
export function evaluerLaCondition(condition = {}, lue = { connu: false, valeur: "" }) {
  const sujet = texte(condition?.sujet);
  const operateur = texte(condition?.operateur) || OPERATEUR.EGAL;
  const attendu = attendues(condition);
  const valeur = texte(lue?.valeur);
  const connu = Boolean(lue?.connu) && Boolean(valeur);

  const base = { sujet, operateur, attendu, lu: valeur, connu };

  // « renseigné » ne compare rien : il constate qu'on a répondu. Il se tranche
  // donc même — et surtout — quand la réponse manque.
  if (operateur === OPERATEUR.RENSEIGNE) return { ...base, verite: connu, doute: "" };
  if (operateur === OPERATEUR.NON_RENSEIGNE) return { ...base, verite: !connu, doute: "" };

  if (!connu) return { ...base, verite: null, doute: DOUTE.ENTREE_ABSENTE };

  if (operateur === OPERATEUR.EGAL || operateur === OPERATEUR.PARMI) {
    // Une liste se lit « ou » : c'est ce que `parmi` veut dire, et c'est ce que
    // l'écriture montre — « = A ou B ».
    return { ...base, verite: attendu.some((cible) => memeValeur(valeur, cible)), doute: "" };
  }

  if (operateur === OPERATEUR.DIFFERENT) {
    return { ...base, verite: !attendu.some((cible) => memeValeur(valeur, cible)), doute: "" };
  }

  if ([OPERATEUR.AU_PLUS, OPERATEUR.AU_MOINS, OPERATEUR.MOINS_DE, OPERATEUR.PLUS_DE].includes(operateur)) {
    // Un seuil multiple n'a pas de sens sur une comparaison de nombres : on
    // prend le premier, et l'on ne devine pas ce que les autres voulaient dire.
    const rendu = comparerDesNombres(operateur, valeur, attendu[0] ?? "", condition?.unite);
    return { ...base, verite: rendu.verite, doute: rendu.doute };
  }

  return { ...base, verite: null, doute: DOUTE.OPERATEUR_INCONNU };
}

/** `et` en logique ternaire : un faux tranche, un doute ne tranche que le vrai. */
function et(gauche, droite) {
  if (gauche === false || droite === false) return false;
  if (gauche === null || droite === null) return null;
  return true;
}

/** `ou` en logique ternaire : un vrai tranche, un doute ne tranche que le faux. */
function ou(gauche, droite) {
  if (gauche === true || droite === true) return true;
  if (gauche === null || droite === null) return null;
  return false;
}

/**
 * Les clauses combinées, de gauche à droite.
 *
 * La première est toujours jointe par `si` ; les suivantes portent leur `joint`,
 * « et » par défaut. Le référentiel n'en produit que des « et » ; un « ou »
 * vient d'une règle écrite à la main.
 */
function combiner(traces) {
  if (!traces.length) return { verite: null, melange: false };

  let verite = traces[0].verite;
  const joncteurs = new Set();

  for (const trace of traces.slice(1)) {
    const joint = texte(trace.joint).toLowerCase() === "ou" ? "ou" : "et";
    joncteurs.add(joint);
    verite = joint === "ou" ? ou(verite, trace.verite) : et(verite, trace.verite);
  }

  return { verite, melange: joncteurs.size > 1 };
}

/**
 * Les valeurs qu'une fonction pose en les calculant, dans l'ordre.
 *
 * ## Pourquoi dans l'ordre, et pourquoi chacune voit les précédentes
 *
 * `calcule TVA = Prix HT * 20%;` puis `calcule Prix TTC = Prix HT + TVA;` :
 * la seconde lit la première. C'est tout l'intérêt — on décompose un calcul en
 * étapes qu'on peut nommer, et chaque étape se lit à l'écran. Les évaluer sans
 * ordre demanderait de résoudre un graphe de dépendances, ce qui rendrait
 * indécidable le sens d'un fichier qu'on lit de haut en bas.
 *
 * ## Une locale qui ne se calcule pas n'existe pas
 *
 * Elle n'est pas posée à zéro, ni à une chaîne vide : **elle est absente**, et
 * les conditions qui la lisent deviennent indécidables. C'est la même règle que
 * pour une entrée qui manque, et pour la même raison — une valeur inventée est
 * indiscernable d'une valeur juste (règle 5).
 *
 * @returns {{lire: Function, noms: Set<string>, manquants: string[],
 *   doutes: string[], traces: object[]}}
 */
export function poserLesLocales(calculs = [], lire = () => ({ connu: false, valeur: "" })) {
  const poses = new Map();
  const noms = new Set();
  const manquants = [];
  const doutes = [];
  const traces = [];

  const lireAvecLesLocales = (sujet) => {
    const cle = cleDuSujet(sujet);
    if (poses.has(cle)) return poses.get(cle);
    return lire(sujet) ?? { connu: false, valeur: "" };
  };

  for (const calcul of Array.isArray(calculs) ? calculs : []) {
    const nom = texte(calcul?.nom);
    if (!nom) continue;
    noms.add(cleDuSujet(nom));

    const rendu = calculer(texte(calcul?.expression), lireAvecLesLocales);
    const ecrit = ecrireLeCalcul(rendu);

    traces.push({
      nom,
      expression: texte(calcul?.expression),
      ligne: Number(calcul?.ligne) || 0,
      connu: rendu.connu,
      valeur: ecrit,
      refus: texte(rendu.refus),
      pourquoi: rendu.refus ? phraseDuRefus(rendu.refus, rendu.ou) : "",
      manquants: rendu.manquants ?? []
    });

    if (rendu.refus) { doutes.push(DOUTE.CALCUL_REFUSE); continue; }
    if (!rendu.connu) { manquants.push(...(rendu.manquants ?? [])); continue; }

    poses.set(cleDuSujet(nom), { connu: true, valeur: ecrit });
  }

  return {
    lire: lireAvecLesLocales,
    noms,
    /**
     * Ce qu'aucun calcul n'a pu lire, **noms des locales compris**.
     *
     * Le tri se fait chez l'appelant : une locale manque aussi bien à un calcul
     * qui la lit qu'à une condition qui la teste, et les deux se filtrent au
     * même endroit — `evaluerLaRegle`. Un second filtre ici ne faisait tomber
     * aucun cas de plus (règle 12), et deux décisions sur une même question
     * auraient fini par ne plus dire la même chose (règle 10).
     */
    manquants: [...new Set(manquants)],
    doutes,
    traces
  };
}

/**
 * Ce qu'une conclusion vaut quand elle **nomme une locale**.
 *
 * `alors (Prix TTC);` rend la valeur calculée ; `alors ("3e famille B");` rend
 * son texte, comme toujours. La règle est décidable et tient en une ligne : on
 * ne regarde que les noms que **cette fonction** a posés, jamais ceux du
 * projet. Sans cette borne, `alors (Zone de vent)` cesserait d'être une chaîne
 * du jour où quelqu'un verse une valeur pour ce sujet, et un fichier changerait
 * de sens sans avoir bougé.
 */
export function conclusionDeLaRegle(dit = "", locales = null) {
  const brut = texte(dit);
  if (!brut || !locales?.noms?.has(cleDuSujet(brut))) return brut;

  const lue = locales.lire(brut);
  return lue?.connu ? texte(lue.valeur) : "";
}

/**
 * Exécuter une règle.
 *
 * @param {object} regle l'affirmation qui porte l'instantané — `payload.regle`
 * @param {(sujet: string) => {connu: boolean, valeur: string}} lire de quoi lire
 *   les entrées. **Seuls les sujets déclarés dans les clauses sont demandés** :
 *   une règle qui lirait autre chose ferait diverger le rejeu en silence, et le
 *   langage ne lui en donne pas le moyen.
 * @returns {{decidable: boolean, tient: boolean|null, valeur: string,
 *   conditions: object[], exceptions: object[], manquants: string[],
 *   melange: boolean, doutes: string[]}}
 */
export function evaluerLaRegle(regle = {}, lire = () => ({ connu: false, valeur: "" })) {
  // Une fonction native n'a pas de conditions à évaluer : sa loi est au serveur.
  // Sans cette sortie, `combiner([])` la déclarait vraie et le rejeu annonçait
  // qu'elle tient sans avoir rien calculé.
  if (regle?.payload?.agent ?? regle?.payload?.native) {
    return {
      decidable: false,
      tient: null,
      applique: null,
      valeur: "",
      conditions: [],
      exceptions: [],
      manquants: [],
      melange: false,
      doutes: [DOUTE.LOI_NON_ECRITE]
    };
  }

  const bloc = regle?.payload?.regle ?? {};

  // **Les locales d'abord.** Une condition peut porter sur une valeur que la
  // fonction vient de calculer, et une conclusion peut la nommer.
  const locales = poserLesLocales(bloc?.calculs, lire);

  const sinon = conclusionDeLaRegle(bloc?.sinon, locales);

  const tracer = (condition) => ({
    ...evaluerLaCondition(condition, locales.lire(texte(condition?.sujet)) ?? { connu: false, valeur: "" }),
    joint: texte(condition?.joint)
  });

  const exceptions = (Array.isArray(bloc.sauf) ? bloc.sauf : []).map(tracer);

  // Les exceptions se lisent en « ou » entre elles : *une* suffit à écarter la
  // règle. C'est ce que « sauf si » veut dire, et les enchaîner en « et »
  // demanderait qu'elles se produisent toutes ensemble.
  //
  // Elles écartent la **règle entière**, branches comprises : « sauf si » ne
  // vaut pas pour un cas sur trois.
  const ecartee = exceptions.length
    ? exceptions.map((trace) => trace.verite).reduce(ou, false)
    : false;

  /**
   * **Les branches, dans l'ordre : la première qui tient l'emporte.**
   *
   * La tête est la première — `conditions` et `alors` —, et `sinonSi` porte les
   * suivantes. C'est l'ordre écrit qui fait le sens.
   *
   * ## Une branche indécidable arrête tout, et c'est le point délicat
   *
   * `si A alors X; sinon si B alors Y;` avec A qu'on ne sait pas lire : on ne
   * peut **pas** passer à B. Le faire reviendrait à dire « A est faux » alors
   * qu'on n'en sait rien, et à conclure Y sur une supposition. La règle est
   * indécidable, et elle le dit (règle 5).
   *
   * ## Une branche qu'on n'a pas atteinte ne se lit pas
   *
   * Les entrées qu'elle seule demande ne comptent donc pas parmi les
   * manquants : la règle n'en a pas eu besoin. Le formulaire, lui, les offre
   * quand même — il ne sait pas d'avance quelle branche sera prise, et c'est
   * `dependancesDuBloc` qui le lui dit.
   */
  const branches = [
    { conditions: Array.isArray(bloc.conditions) ? bloc.conditions : [], alors: regle?.payload?.value },
    ...(Array.isArray(bloc.sinonSi) ? bloc.sinonSi : [])
      .map((branche) => ({
        conditions: Array.isArray(branche?.conditions) ? branche.conditions : [],
        alors: branche?.alors
      }))
  ];

  const lues = [];
  let retenue = -1;
  let indecise = false;

  for (const [rang, branche] of branches.entries()) {
    const traces = branche.conditions.map(tracer);
    const posee = combiner(traces);
    lues.push({ conditions: traces, verite: posee.verite, melange: posee.melange });

    if (posee.verite === null) { indecise = true; break; }
    if (posee.verite === true) { retenue = rang; break; }
  }

  const posee = lues[0] ?? { verite: null, melange: false };

  // La règle tient si **une** de ses branches tient, et qu'aucune exception ne
  // s'applique. Un doute d'un côté ou de l'autre suffit à ne pas trancher.
  const prise = indecise ? null : retenue >= 0;
  const tient = et(prise, ecartee === null ? null : !ecartee);

  const conditions = lues[0]?.conditions ?? [];
  // Ce que chaque branche a lu, dans l'ordre où on les a lues. La tête est
  // déjà dans `conditions` ; les suivantes n'avaient nulle part où se dire, et
  // l'écran montrait une règle qui conclut sans montrer pourquoi.
  const branchesLues = lues.slice(1);
  const alors = conclusionDeLaRegle(
    retenue >= 0 ? branches[retenue].alors : regle?.payload?.value, locales
  );

  const manquants = [
    // Ce qu'un calcul n'a pas pu lire compte autant que ce qu'une condition
    // n'a pas pu lire : c'est la même question posée à l'écran, et la taire
    // ferait un formulaire qui ne demande pas ce dont il a besoin.
    ...locales.manquants,
    ...[...lues.flatMap((une) => une.conditions), ...exceptions]
      .filter((trace) => trace.doute === DOUTE.ENTREE_ABSENTE)
      .map((trace) => trace.sujet)
  ]
    /**
     * **Une locale ne se demande jamais**, où qu'elle manque.
     *
     * Une condition qui porte sur une valeur que le calcul n'a pas su poser la
     * déclare absente, comme n'importe quelle entrée. Mais personne ne peut la
     * saisir : elle se calcule. La laisser passer ferait un champ qu'on ne sait
     * pas remplir — et il masquerait l'entrée réellement absente, deux lignes
     * plus haut, qui est celle qu'il faut fournir.
     */
    .filter((nom) => !locales.noms.has(cleDuSujet(nom)));

  return {
    decidable: tient !== null,
    tient,
    /**
     * La règle a-t-elle quelque chose à dire ?
     *
     * Vraie quand ses conditions tiennent, ou qu'elle porte un `sinon` — dans
     * les deux cas elle conclut. Fausse quand « si A alors B », sans `sinon`,
     * rencontre un A faux : elle ne dit **rien**. Lui faire conclure une valeur
     * vide effacerait ce que le projet tient, et une valeur effacée se lit
     * comme une valeur.
     */
    applique: tient === null ? null : tient === true || Boolean(sinon),
    // Ce que la règle conclut. Indécidable, elle ne conclut **rien** : rendre
    // `sinon` reviendrait à conclure une règle qu'on n'a pas pu évaluer.
    valeur: tient === true ? alors : tient === false ? sinon : "",
    conditions,
    /**
     * Ce que les branches suivantes ont lu, dans l'ordre. Vide quand la règle
     * n'en a pas, ou quand la première a tranché avant qu'on les atteigne.
     */
    sinonSi: branchesLues,
    /** Quelle branche a conclu : `0` pour la tête, `-1` quand aucune. */
    branche: retenue,
    exceptions,
    manquants: [...new Set(manquants)],
    melange: posee.melange,
    doutes: [...new Set([
      ...locales.doutes,
      ...[...lues.flatMap((une) => une.conditions), ...exceptions].map((trace) => trace.doute)
    ].filter(Boolean))],
    /**
     * Ce que chaque `calcule` a donné, dans l'ordre.
     *
     * C'est la trace du calcul, et elle compte autant que celle des
     * conditions : une règle qui rend un verdict sans montrer sa lecture
     * n'apprend rien, et un nombre sorti de nulle part est exactement ce qu'on
     * refuse à un agent.
     */
    calculs: locales.traces
  };
}

/**
 * Rejouer une règle appliquée, et comparer.
 *
 * C'est l'unité du rejeu à blanc : ce que la règle conclurait aujourd'hui, face
 * à ce que la mémoire tient. Trois issues, et il faut les trois.
 *
 * - **identique** — la règle rend ce que le projet affirme. Le plus fréquent, et
 *   c'est une information : on a regardé.
 * - **differente** — elle rend autre chose. Sur des entrées inchangées, c'est un
 *   **défaut de la mémoire** : ce que le projet affirme n'est plus ce que ses
 *   propres règles concluent.
 * - **indecidable** — une entrée manque, une unité ne se compare pas. On le
 *   nomme ; on n'invente pas de valeur.
 * - **sans objet** — les conditions ne tiennent plus et la règle n'a pas de
 *   `sinon` : elle ne dit rien. Ce n'est pas une valeur nouvelle, c'est la
 *   disparition de celle qui la portait, et il faut le dire autrement.
 *
 * @returns {{verdict: string, avant: string, apres: string, evaluation: object}}
 */
export const VERDICT = {
  IDENTIQUE: "identique",
  DIFFERENTE: "differente",
  INDECIDABLE: "indecidable",
  SANS_OBJET: "sans-objet"
};

export function rejouerLaRegle(regle = {}, lire = () => ({ connu: false, valeur: "" })) {
  const evaluation = evaluerLaRegle(regle, lire);
  const avant = texte(regle?.payload?.value);

  if (!evaluation.decidable) {
    return { verdict: VERDICT.INDECIDABLE, avant, apres: "", evaluation };
  }

  // La règle ne s'applique plus, et elle n'a rien à dire à la place. On ne rend
  // pas une valeur vide : ce que le projet tient reste écrit, et c'est son
  // fondement qui a disparu — une autre nouvelle, qui se dit autrement.
  if (evaluation.applique === false) {
    return { verdict: VERDICT.SANS_OBJET, avant, apres: "", evaluation };
  }

  const apres = evaluation.valeur;
  return {
    verdict: memeValeur(avant, apres) ? VERDICT.IDENTIQUE : VERDICT.DIFFERENTE,
    avant,
    apres,
    evaluation
  };
}

/**
 * De quoi lire les entrées d'une règle, dans une mémoire donnée.
 *
 * `valeurs` est une table sujet → valeur, sur les clés normalisées : c'est ainsi
 * que « Hauteur du plancher bas » et « hauteur du plancher  bas » désignent la
 * même entrée. Un sujet absent rend `{connu: false}` — et non une chaîne vide,
 * qui se lirait comme une valeur.
 */
export function lecteurDeValeurs(valeurs = new Map()) {
  const table = valeurs instanceof Map ? valeurs : new Map(Object.entries(valeurs ?? {}));
  const parCle = new Map([...table.entries()].map(([sujet, valeur]) => [cleDuSujet(sujet), texte(valeur)]));

  return (sujet) => {
    const cle = cleDuSujet(sujet);
    if (!parCle.has(cle)) return { connu: false, valeur: "" };
    const valeur = parCle.get(cle);
    return { connu: Boolean(valeur), valeur };
  };
}
