/**
 * Les preuves du code : **chaque fonction, passée sur ses cas.**
 *
 * ## La question posée
 *
 * > « Il n'y a rien de perturbant à dire à l'utilisateur : on a transcrit vos
 * >   contenus en Mdall, voici le code ET voici les tests que nous avons
 * >   réalisés sur le code… vous pouvez signer, tout est bien fait. »
 *
 * Le code se lisait déjà (`mdall-de-la-proposition.js`). Les **tests sur ce
 * code**, non : on montrait une fonction et l'on demandait de la croire.
 *
 * ## Deux sources de cas, et aucune écrite à la main
 *
 * C'est la décision du tour, et la troisième possibilité a été écartée pour une
 * raison de fond : demander des cas à la main revient à demander à un architecte
 * d'écrire des tests, ce qu'il ne fera pas — et une liste de cas vide se lirait
 * « cette fonction a été vérifiée ».
 *
 * **1. Du document.** Chaque nom que la fonction lit prend la valeur que le
 * document en dit. On rejoue, et l'on compare à ce que le document conclut. Un
 * écart est un vrai défaut : la fonction ne retrouve pas la réponse du document
 * dont elle est tirée.
 *
 * **2. Des bornes de la fonction.** Un seuil écrit `<= 28 m` s'essaie à **28** et
 * à **29**, et l'on montre ce que la fonction fait de chaque côté.
 *
 * Le pas est **une unité à la précision du seuil écrit** : `28` donne 28 et 29,
 * `28,5` donne 28,5 et 28,6. C'est la plus petite marche que le seuil tel qu'il
 * est écrit sache distinguer, et elle s'explique en une phrase à l'écran.
 *
 * ## Une borne montre, elle ne juge pas — et c'est une correction
 *
 * Le premier jet annonçait que la borne « attrape l'erreur de comparaison
 * stricte, un `<` écrit pour un `<=` ». **C'est faux**, et il faut le dire
 * plutôt que de l'afficher : l'attente d'une borne était dérivée de l'opérateur
 * lui-même. Une règle écrite `< 28` s'essayait donc à 27 et 28, et passait — en
 * se donnant raison toute seule. C'est exactement ce qu'une épreuve qui recopie
 * les suppositions du code ne peut pas voir.
 *
 * Ce qu'une borne fait vraiment est **plus utile, et honnête** : elle montre, en
 * deux nombres concrets, **où la fonction bascule**. « Essayé à 28 m : elle
 * s'applique. Essayé à 29 m : elle ne s'applique plus. » Celui qui lit sait, lui,
 * si 28 doit être dedans — c'est son métier. **L'oracle est le lecteur**, et
 * c'est tout le propos de cet écran : montrer, et expliquer.
 *
 * Une borne ne compte donc **ni dans les conformes ni dans les écarts**. Les y
 * mettre gonflerait un taux avec des cas que personne n'a jugés, ce qui est la
 * façon la plus commode de se rassurer.
 *
 * ## Il ne rejoue rien lui-même
 *
 * `evaluerLaRegle` et `lecteurDeValeurs` font le travail — ce sont ceux du rejeu
 * de la mémoire et du bac d'essai. Un second évaluateur ici aurait donné à
 * l'écran de la proposition un verdict que la mémoire ne rend pas (règle 4), et
 * c'est la divergence la plus coûteuse qui soit : on signerait sur une preuve
 * qui n'est pas celle du moteur.
 *
 * ## Ce qu'il ne prouve pas, et qui est écrit à l'écran
 *
 * Que la fonction soit **juste**. Il prouve qu'elle retrouve la réponse du
 * document dont elle sort, et qu'elle bascule là où son seuil le dit. Une
 * fonction fausse recopiée fidèlement d'un document faux passe tous ces cas.
 */

import { OPERATEUR } from "./memoire-en-texte.js";
import { evaluerLaRegle, lecteurDeValeurs } from "./memoire-evaluateur.js";
import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/* ── Les verdicts ─────────────────────────────────────────────────────────── */

export const PREUVE = {
  /** La fonction a rendu ce qu'on attendait. */
  CONFORME: "conforme",
  /** Elle a rendu autre chose. C'est un défaut, et il se lit en premier. */
  ECART: "ecart",
  /**
   * Elle n'a pas pu conclure : il lui manque une entrée.
   *
   * **Ce n'est ni un succès ni un échec**, et cela se compte à part. Fondu avec
   * les réussites, cela ferait monter le taux de conformité quand la fonction
   * cesse de pouvoir répondre — la pire propriété possible pour un indicateur,
   * et celle que la batterie de perturbations existe pour attraper.
   */
  INDECIDABLE: "indecidable",
  /**
   * Elle a répondu, et **personne n'a d'attente à confronter**.
   *
   * C'est le cas de toute borne : l'attente qu'on en dériverait viendrait de
   * l'opérateur qu'elle éprouve, donc elle passerait toujours. Le cas montre
   * alors ce que la fonction fait, et la question va au lecteur.
   *
   * Distinct de `INDECIDABLE`, et cette distinction a coûté un défaut : les
   * deux étaient confondus, et l'écran disait « il manque une entrée » d'un cas
   * où rien ne manquait.
   */
  MONTRE: "montre"
};

/** D'où vient un cas. L'écran le dit : les deux ne se valent pas. */
export const DOU = {
  DOCUMENT: "document",
  BORNE: "borne"
};

/* ── Les cas qui viennent du document ─────────────────────────────────────── */

/**
 * Ce que le document dit des noms, en table `sujet → valeur`.
 *
 * On part des **blocs** du panneau, et non de la mémoire : ce sont les lignes de
 * ce dépôt-ci, celles qu'on s'apprête à signer. Prendre la mémoire ferait
 * éprouver la fonction sur un projet qu'elle ne connaît pas encore.
 */
export function ceQueLeDocumentDit(blocs = []) {
  const table = new Map();

  for (const bloc of Array.isArray(blocs) ? blocs : []) {
    if (!bloc || typeof bloc !== "object") continue;
    // Une règle ne porte pas une valeur du projet : elle en conclut une. La
    // mettre dans la table ferait lire à une autre règle la conclusion écrite
    // sur la ligne, au lieu de la recalculer — et la preuve serait circulaire.
    if (bloc.regle === true) continue;

    const sujet = texte(bloc.sujet);
    const valeur = texte(bloc.valeur);
    if (!sujet || !valeur) continue;
    table.set(sujet, valeur);
  }

  return table;
}

/* ── Les cas qui viennent des bornes ──────────────────────────────────────── */

/** Les opérateurs qui portent un seuil, et de quel côté ils basculent. */
const LES_SEUILS = {
  [OPERATEUR.AU_PLUS]: { dedans: 0, dehors: +1 },
  [OPERATEUR.MOINS_DE]: { dedans: -1, dehors: 0 },
  [OPERATEUR.AU_MOINS]: { dedans: 0, dehors: -1 },
  [OPERATEUR.PLUS_DE]: { dedans: +1, dehors: 0 }
};

/**
 * Le pas d'un seuil : **une unité à la précision où il est écrit.**
 *
 * `28` rend 1, `28,5` rend 0,1, `28,05` rend 0,01. C'est la plus petite marche
 * que le seuil tel qu'il est écrit sache distinguer. Un pas plus fin — toujours
 * 0,01 — éprouverait une précision que son auteur n'a pas écrite ; un pas plus
 * gros laisserait passer la comparaison stricte, qui est tout ce qu'on cherche.
 */
export function lePasDuSeuil(ecrit = "") {
  const dit = texte(ecrit).replace(",", ".");
  const apres = dit.split(".")[1] ?? "";
  // `10 ** -n` et non une division : `1 / 10 ** 2` vaut 0.01 exactement, là où
  // des soustractions répétées de 0,1 dérivent.
  return apres.length ? 10 ** -apres.length : 1;
}

/** Un nombre arrondi au pas, pour que « 28,1 » ne devienne pas « 28,099999 ». */
function auPas(valeur, pas) {
  const decimales = pas >= 1 ? 0 : String(pas).split(".")[1]?.length ?? 2;
  return Number(valeur.toFixed(decimales));
}

/**
 * Les deux cas d'un seuil : juste dedans, juste dehors.
 *
 * `null` quand la condition ne porte pas de seuil comparable — un `=` sur un
 * mot, un `renseigné`, un attendu qui n'est pas un nombre. On ne fabrique pas
 * un cas sur ce qu'on ne sait pas faire varier.
 */
export function lesBornesDeLaCondition(condition = null) {
  const operateur = texte(condition?.operateur);
  const cote = LES_SEUILS[operateur];
  if (!cote) return null;

  const sujet = texte(condition?.sujet);
  const ecrit = texte((Array.isArray(condition?.valeur) ? condition.valeur : [])[0]);
  const seuil = Number(ecrit.replace(",", "."));
  if (!sujet || !ecrit || !Number.isFinite(seuil)) return null;

  const pas = lePasDuSeuil(ecrit);
  const unite = texte(condition?.unite);

  return {
    sujet,
    operateur,
    seuil: ecrit,
    unite,
    pas,
    dedans: auPas(seuil + cote.dedans * pas, pas),
    dehors: auPas(seuil + cote.dehors * pas, pas)
  };
}

/* ── Les cas d'une fonction ───────────────────────────────────────────────── */

/**
 * Les clauses d'une règle, branches et exceptions comprises.
 *
 * Les branches comptent : une règle écrite en trois cas a trois seuils, et
 * n'éprouver que le premier laisserait deux tiers de la fonction sans preuve —
 * exactement le défaut que l'écran des fichiers a déjà payé une fois, quand une
 * règle à trois cas s'y réécrivait avec un seul.
 */
function lesClausesDeLaRegle(bloc = null) {
  return [
    ...(Array.isArray(bloc?.conditions) ? bloc.conditions : []),
    ...(Array.isArray(bloc?.sinonSi) ? bloc.sinonSi : [])
      .flatMap((branche) => (Array.isArray(branche?.conditions) ? branche.conditions : []))
  ];
}

/**
 * **Les conditions se lisent-elles toutes en « et » ?**
 *
 * C'est la question qui décide si une borne a une attente. En « et », pousser
 * une entrée dehors écarte la règle entière, et l'on peut donc attendre qu'elle
 * ne s'applique plus. En « ou », une autre condition peut la retenir : attendre
 * qu'elle s'écarte serait affirmer ce qu'on ne sait pas (règle 5).
 */
function toutesEnEt(conditions = []) {
  return conditions.slice(1).every((une) => texte(une?.joint).toLowerCase() !== "ou");
}

/**
 * Les cas d'une fonction, et ce que chacun a rendu.
 *
 * @param {object} bloc le bloc Mdall de la règle, tel que le panneau le porte
 * @param {object} [options]
 * @param {Map} [options.dit] ce que le document dit des noms
 * @returns {{cas: object[], assiette: object, pourquoiRien: string}}
 */
export function lesPreuvesDuBloc(bloc = null, { dit = new Map() } = {}) {
  const affirmation = bloc?.affirmation ?? null;
  if (bloc?.regle !== true || !affirmation) {
    return { cas: [], assiette: laSomme([]), pourquoiRien: "" };
  }

  // Une fonction native n'a pas de corps écrit : sa loi est au serveur, et
  // `evaluerLaRegle` le dit lui-même en rendant `decidable: false`. On ne
  // fabrique donc aucun cas, et l'on dit pourquoi plutôt que d'afficher une
  // liste vide (règle 5).
  if (affirmation?.payload?.agent ?? affirmation?.payload?.native) {
    return {
      cas: [],
      assiette: laSomme([]),
      pourquoiRien: "Cette fonction appelle un utilitaire : sa loi n'est pas "
        + "écrite dans le projet, elle est au serveur. Elle ne se rejoue pas ici."
    };
  }

  const regleDite = affirmation?.payload?.regle ?? null;
  const clauses = lesClausesDeLaRegle(regleDite);
  if (!clauses.length) {
    return {
      cas: [],
      assiette: laSomme([]),
      pourquoiRien: "Cette fonction ne porte aucune condition : il n'y a rien à "
        + "faire basculer, et rien à éprouver."
    };
  }

  const table = dit instanceof Map ? dit : new Map(Object.entries(dit ?? {}));
  const attendu = texte(affirmation?.payload?.value);
  const cas = [];

  /* 1. Le cas du document : toutes les entrées telles qu'il les dit. */
  const duDocument = unCas(affirmation, table, {
    dou: DOU.DOCUMENT,
    dit: "les valeurs que ce document relève",
    // **Le document conclut, et c'est l'attendu.** On ne compare pas la
    // fonction à elle-même : la valeur portée sur sa ligne est celle que le
    // document en dit, et la fonction doit la retrouver depuis les entrées.
    attenduValeur: attendu
  });
  if (duDocument) cas.push(duDocument);

  /**
   * 2. Les bornes, clause par clause — **et ce que la fonction en fait.**
   *
   * Les deux côtés d'un même seuil vont dans **un seul cas**, parce que c'est
   * le couple qui dit quelque chose : « à 28 elle s'applique, à 29 non » se lit,
   * et deux lignes séparées obligent à les rapprocher soi-même.
   *
   * `enEt` sert encore, mais à autre chose qu'à juger : en « ou », pousser une
   * entrée dehors ne dit rien de la règle, puisqu'une autre condition peut la
   * retenir. On le dit alors dans la phrase, plutôt que de montrer un
   * basculement qui n'en est pas un.
   */
  const enEt = toutesEnEt(clauses);
  for (const condition of clauses) {
    const borne = lesBornesDeLaCondition(condition);
    if (!borne) continue;
    cas.push(leCasDeLaBorne(affirmation, table, borne, enEt));
  }

  return { cas, assiette: laSomme(cas), pourquoiRien: "" };
}

/**
 * Le cas d'un seuil : **les deux côtés, et où ça bascule.**
 *
 * Il ne porte pas de verdict de conformité — voir `PREUVE.MONTRE`. Il porte ce
 * que la fonction rend de part et d'autre, et la question que cela pose au
 * lecteur : *est-ce le bon seuil ?* C'est lui qui sait.
 */
function leCasDeLaBorne(affirmation, table, borne, enEt) {
  const avec = (valeur) => {
    const copie = new Map(table);
    copie.set(borne.sujet, borne.unite ? `${valeur} ${borne.unite}` : String(valeur));
    return copie;
  };

  const lire = (valeurs) => {
    const evaluation = evaluerLaRegle(affirmation, lecteurDeValeurs(valeurs));
    if (!evaluation.decidable) return { applique: null, valeur: "" };
    const applique = evaluation.applique !== false && evaluation.tient !== false;
    return { applique, valeur: applique ? texte(evaluation.valeur) : "" };
  };

  const dedans = lire(avec(borne.dedans));
  const dehors = lire(avec(borne.dehors));
  const unite = borne.unite ? ` ${borne.unite}` : "";

  return {
    dou: DOU.BORNE,
    verdict: PREUVE.MONTRE,
    seuil: `${borne.sujet} ${borne.operateur} ${borne.seuil}${unite}`,
    dit: `${borne.sujet} ${borne.operateur} ${borne.seuil}${unite}`,
    cotes: [
      { essaye: `${borne.dedans}${unite}`, ...dedans, rendu: direLeCote(dedans) },
      { essaye: `${borne.dehors}${unite}`, ...dehors, rendu: direLeCote(dehors) }
    ],
    /**
     * **Bascule-t-elle vraiment entre ces deux valeurs ?**
     *
     * `false` est une information, pas un échec : une règle dont les deux côtés
     * répondent pareil est une règle dont ce seuil ne décide de rien — parce
     * qu'une autre condition l'écarte déjà, ou parce qu'elle se lit en « ou ».
     */
    bascule: dedans.applique !== dehors.applique,
    question: enEt
      ? `Le seuil est écrit à ${borne.seuil}${unite}. Est-ce le bon ?`
      : "Cette condition se lit en « ou » : une autre peut retenir la fonction, "
        + "et ce seuil ne décide donc pas seul.",
    entrees: [],
    rendu: "",
    attendu: "",
    manquants: []
  };
}

/** Ce qu'un côté d'un seuil a rendu, en clair. */
function direLeCote(cote) {
  if (cote.applique === null) return "indécidable — il manque une entrée";
  if (!cote.applique) return "la fonction ne s'applique pas";
  return cote.valeur ? `la fonction rend « ${cote.valeur} »` : "la fonction s'applique";
}

/**
 * Un cas rejoué, avec son verdict.
 *
 * `null` quand la fonction ne lit rien de ce qu'on a : fabriquer un cas sans
 * entrée donnerait un « indécidable » qui ne dit rien de la fonction.
 */
function unCas(affirmation, table, { dou = DOU.DOCUMENT, dit = "", attenduValeur = "" } = {}) {
  const evaluation = evaluerLaRegle(affirmation, lecteurDeValeurs(table));

  const entrees = [...table.entries()]
    .filter(([sujet]) => (evaluation.conditions ?? []).concat(evaluation.exceptions ?? [])
      .some((une) => cleDuSujet(texte(une?.sujet)) === cleDuSujet(sujet)))
    .map(([sujet, valeur]) => ({ sujet, valeur }));

  if (!evaluation.decidable) {
    return {
      dou, dit, entrees,
      verdict: PREUVE.INDECIDABLE,
      rendu: "",
      attendu: attenduValeur,
      // Les noms qui manquent, nommément : « indécidable » tout court envoie
      // chercher, et ce sont eux qu'on cherche.
      manquants: (evaluation.manquants ?? []).map(texte).filter(Boolean)
    };
  }

  const applique = evaluation.applique !== false && evaluation.tient !== false;
  const rendu = applique
    ? texte(evaluation.valeur)
    : "";

  /**
   * **Sans attendu, on montre : on ne juge pas.**
   *
   * Compter conforme un cas dont personne n'a dit la réponse serait se donner
   * raison tout seul — et c'est `MONTRE`, non `INDECIDABLE` : rien ne manque,
   * la fonction a répondu.
   */
  if (!texte(attenduValeur)) {
    return {
      dou, dit, entrees,
      verdict: PREUVE.MONTRE,
      rendu: applique ? (rendu || "la fonction s'applique") : "la fonction ne s'applique pas",
      attendu: "",
      manquants: []
    };
  }

  /**
   * **Le document conclut, et la fonction doit le retrouver.**
   *
   * Une fonction qui ne s'applique plus n'a rien rendu : ce n'est pas « une
   * autre valeur », c'est un écart d'un autre genre — le document conclut
   * quelque chose que la fonction, telle qu'elle est écrite, ne conclut pas.
   */
  if (!applique) {
    return {
      dou, dit, entrees,
      verdict: PREUVE.ECART,
      rendu: "la fonction ne s'applique pas sur ces valeurs",
      attendu: texte(attenduValeur),
      manquants: []
    };
  }

  return {
    dou, dit, entrees,
    verdict: memeReponse(rendu, attenduValeur) ? PREUVE.CONFORME : PREUVE.ECART,
    rendu,
    attendu: texte(attenduValeur),
    manquants: []
  };
}

/**
 * Deux réponses sont-elles la même ?
 *
 * Comparées **sans la casse, sans les espaces doubles et sur la virgule
 * décimale** : « 3e famille B » et « 3E Famille  B » sont la même réponse, et
 * « 0.5 m » est « 0,5 m ». Les distinguer ferait un écart à chaque fois qu'un
 * document écrit autrement qu'un autre, et la liste d'écarts deviendrait du
 * bruit qu'on cesse de lire.
 *
 * **Exportée pour être éprouvée seule**, et c'est la batterie de mutations qui
 * l'a demandé : par le chemin du document, `evaluation.valeur` est l'`alors` de
 * la règle, donc identique octet pour octet à ce que sa ligne porte. La
 * tolérance ne s'y exerce jamais, et retirer la normalisation ne faisait rien
 * tomber. Elle sert pour de vrai — un document écrit « 0.5 m » là où un autre
 * écrit « 0,5 m » —, mais ce n'est pas par là qu'elle s'éprouve (règle 4).
 */
export function memeReponse(gauche, droite) {
  const plat = (dit) => texte(dit).toLowerCase().replace(/\s+/g, " ").replace(",", ".");
  return plat(gauche) === plat(droite);
}

/**
 * Les comptes d'un ensemble de cas — **jamais un taux seul.**
 *
 * `conformes` sur `juges`, et les indécidables **hors du dénominateur** : les y
 * mettre ferait baisser le taux quand il manque une entrée, ce qui n'est pas un
 * défaut de la fonction. Les taire ferait monter le taux quand la fonction cesse
 * de pouvoir répondre, ce qui est pire. Ils se comptent donc à part, et l'écran
 * les montre.
 */
export function laSomme(cas = []) {
  const tous = Array.isArray(cas) ? cas : [];
  const combien = (quel) => tous.filter((un) => un?.verdict === quel).length;

  const conformes = combien(PREUVE.CONFORME);
  const ecarts = combien(PREUVE.ECART);
  const juges = conformes + ecarts;

  return {
    cas: tous.length,
    conformes,
    ecarts,
    indecidables: combien(PREUVE.INDECIDABLE),
    // **Les cas qui montrent, comptés à part et nommés.** Les mettre au
    // dénominateur gonflerait le taux avec des cas que personne n'a jugés —
    // la façon la plus commode de se rassurer.
    montres: combien(PREUVE.MONTRE),
    juges,
    // `null` et non 0 : « 0 % » se lit « tout est faux », là où c'est « rien
    // n'a été jugé ».
    pourcent: juges > 0 ? Math.round((conformes / juges) * 100) : null,
    dit: juges > 0
      ? `${conformes}/${juges} cas conformes`
      : "aucun cas jugé"
  };
}

/**
 * Ce que les preuves disent, en une phrase.
 *
 * **Les écarts d'abord, toujours.** Une phrase qui commence par ce qui marche
 * se lit comme un succès, et l'on ne retient pas la fin.
 */
export function ceQueLesPreuvesDisent(somme = null) {
  const compte = somme ?? laSomme([]);

  if (!compte.cas) return "Aucun cas n'a pu être construit pour cette fonction.";

  const debut = compte.ecarts
    ? `${compte.ecarts} cas sur ${compte.juges} ne rend pas ce qu'on attendait`
    : compte.dit;

  const reste = compte.indecidables
    ? `. ${compte.indecidables} cas ${compte.indecidables > 1 ? "restent" : "reste"} `
      + "indécidable" + (compte.indecidables > 1 ? "s" : "")
      + " — il manque une entrée, et cela ne compte ni pour ni contre."
    : ".";

  /**
   * **Ce que les seuils montrent se dit, et se dit comme autre chose.**
   *
   * Un seuil n'a pas été jugé : il montre où la fonction bascule, et c'est au
   * lecteur de dire si c'est le bon. Le taire ferait croire que ces cas sont
   * passés.
   */
  const montres = compte.montres
    ? ` ${compte.montres} seuil${compte.montres > 1 ? "s" : ""} `
      + `${compte.montres > 1 ? "montrent" : "montre"} où la fonction bascule : `
      + "à vous de dire si c'est le bon."
    : "";

  return `${debut}${reste}${montres}`;
}

/**
 * Ce que ces preuves ne prouvent pas, **nommé et non laissé en blanc.**
 *
 * Le premier est désagréable et c'est le plus important : une fonction fausse,
 * recopiée fidèlement d'un document faux, passe tous ces cas.
 */
export const CE_QUE_LES_PREUVES_NE_DISENT_PAS = [
  {
    quoi: "Que la fonction soit juste",
    pourquoi: "elle est tirée de ce document, et on l'éprouve sur ce document. "
      + "Une règle mal comprise mais recopiée fidèlement retrouve la réponse du "
      + "document à chaque fois. Ce qui est prouvé, c'est qu'elle ne s'est pas "
      + "trompée en chemin."
  },
  {
    quoi: "Que le seuil soit le bon",
    pourquoi: "les deux côtés d'un seuil montrent où la fonction bascule — « à "
      + "28 elle s'applique, à 29 non ». Ils ne disent pas que 28 soit la bonne "
      + "limite : l'attente qu'on en dériverait viendrait de l'opérateur lui-même, "
      + "et passerait toujours. C'est vous qui savez, et c'est pour cela qu'on "
      + "montre les deux nombres."
  },
  {
    quoi: "Les cas que personne n'a écrits",
    pourquoi: "les cas viennent de ce que le document dit et des seuils de la "
      + "fonction. Une entrée que ni l'un ni l'autre ne nomme n'est pas essayée."
  },
  {
    quoi: "Ce que fait un utilitaire",
    pourquoi: "une fonction qui appelle un utilitaire n'a pas sa loi dans le "
      + "projet : elle est au serveur, et ne se rejoue pas ici. C'est dit sous "
      + "la fonction, plutôt que montré comme une liste de cas vide."
  }
];
