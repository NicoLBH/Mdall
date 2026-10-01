/**
 * Les sujets techniques que les chantiers emploient — et ce qu'ils valent.
 *
 * ## Le constat qui a rendu ce module nécessaire
 *
 * Sur trois chantiers et 7 857 affirmations, la console montrait **trois
 * domaines** : incendie, structure, sol. Et 83 % des affirmations n'en
 * portaient aucun.
 *
 * Ce n'est pas un défaut de classement. C'est que huit cases ne décrivent pas
 * un chantier — elles décrivent un sommaire. « Après une question de sol, une
 * question de structure » est une évidence de métier : personne ne paie pour
 * l'apprendre. Ce qui vaut quelque chose est d'un cran en dessous — **quoi** en
 * sol, **quoi** en structure.
 *
 * ## Ce que ces sujets sont, et ce qu'ils ne sont pas
 *
 * Ce sont les **termes** que les chantiers écrivent réellement : des mots et
 * des couples de mots, extraits des affirmations, comptés sur l'ensemble.
 * Ils ne sont pas déclarés, ils sont trouvés — et il y en a des milliers là où
 * il y avait huit cases.
 *
 * **Ce n'est pas de l'apprentissage**, et il faut le dire plutôt que de le
 * laisser croire. C'est du comptage de termes : cela ne dépend d'aucun modèle,
 * d'aucun service et d'aucune clé, cela se vérifie ligne à ligne, et cela
 * marche le jour où on le déploie. C'est aussi la couche sans laquelle un
 * modèle n'aurait rien sur quoi s'entraîner, ni rien à quoi se comparer.
 *
 * ## Il est pur
 *
 * Des lignes de comptes entrent, des classements et des phrases sortent.
 */

const nombre = (valeur) => Number(valeur) || 0;
const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les sujets, rangés.
 *
 * **Les couples avant les mots seuls, à compte égal.** « plancher beton » dit
 * ce que « beton » ne dit pas, et c'est précisément la granulométrie qu'on
 * cherche : un classement qui remonte les mots seuls redonnerait le sommaire
 * qu'on essaie de quitter.
 *
 * @param {object[]} lignes ce que rend `les_sujets_du_systeme()`
 */
export function lesSujetsRanges(lignes = []) {
  return (Array.isArray(lignes) ? lignes : [])
    .map((une) => ({
      sujet: texte(une?.sujet),
      mots: Math.max(1, nombre(une?.mots)),
      // Combien de formes écrites se rangent sous ce sujet : « planchers
      // betons », « plancher en beton », « beton plancher ». C'est la mesure du
      // regroupement, et elle voyage avec le sujet plutôt que de se recalculer
      // à l'écran (règle 4).
      formes: Math.max(1, nombre(une?.formes)),
      affirmations: nombre(une?.affirmations),
      chantiers: nombre(une?.chantiers)
    }))
    .filter((une) => une.sujet && une.affirmations > 0)
    /**
     * **Les termes qualifiés d'abord, et c'est un changement.**
     *
     * Le classement partait du nombre de chantiers : en tête venaient donc les
     * mots qu'on trouve partout — « corpus », « portes », « locaux », « mise ».
     * Ils sont sur cinq chantiers parce qu'ils sont sur tous les chantiers,
     * c'est-à-dire qu'ils ne distinguent rien.
     *
     * > « Plafonds, dispositions, passage, portes… et alors ? »
     *
     * Et alors rien, en effet. Un mot seul nomme un objet ; « plancher beton »
     * nomme un ouvrage. C'est la seule chose que ce comptage sache produire qui
     * ressemble à une idée, et elle se noyait au rang quatre-vingtième.
     */
    .sort((gauche, droite) => droite.mots - gauche.mots
      || droite.chantiers - gauche.chantiers
      || droite.affirmations - gauche.affirmations
      || gauche.sujet.localeCompare(droite.sujet, "fr"));
}

/**
 * **Ce que ce comptage n'est pas**, dit avant qu'on le prenne pour autre chose.
 *
 * ## Pourquoi cette phrase existe
 *
 * L'écran annonçait « voici ce que les affirmations disent réellement » et
 * déroulait : plafonds, dispositions, passage, portes.
 *
 * > « Le niveau de sémantique est très largement insuffisant pour porter du
 * > sens. On n'est pas là pour refaire un lexique du vocabulaire de
 * > construction. Où sont les idées, les raisonnements, les fonctions ? »
 *
 * La critique est juste, et elle porte sur la **mesure**, pas sur l'affichage.
 * Ce comptage relève des **termes** : des groupes nominaux, tirés des
 * affirmations par des règles de caractères. Un terme n'est ni une idée, ni une
 * fonction, ni un raisonnement — « portes » ne dit pas si elles ferment, si
 * elles manquent, ou ce qu'on en attend.
 *
 * Ce qu'il sert, et il ne sert qu'à cela : donner à la prédiction une
 * granulométrie plus fine que huit cases. « Après une question de nappe, une
 * question de cuvelage » se lit ; « après le sol, la structure » ne se lit pas.
 *
 * **Le dire est la seule chose honnête à faire tant que ce n'est pas réglé**
 * (règle 12) : une couche présentée pour ce qu'elle n'est pas fait croire la
 * question résolue, et personne ne la rouvre.
 */
export function phraseDeCeQueCeNestPas(sujets = []) {
  const tous = Array.isArray(sujets) ? sujets : [];
  if (!tous.length) return "";

  const seuls = tous.length - lesSujetsPrecis(tous).length;
  const part = Math.round((seuls / tous.length) * 100);

  return `Ce sont des termes, pas des idées : ${part} % d'entre eux tiennent en`
    + " un mot, et un mot nomme un objet sans rien en dire. Ce comptage sert à"
    + " une seule chose — donner à la prédiction une granulométrie plus fine que"
    + " huit cases. Il ne dit ni ce qu'on en attend, ni ce qui ne va pas, ni ce"
    + " qui en découle.";
}

/** Ceux qui portent plusieurs mots : les plus précis. */
export function lesSujetsPrecis(sujets = []) {
  return (Array.isArray(sujets) ? sujets : []).filter((une) => une.mots >= 2);
}

/**
 * Ce que la granulométrie vaut, en une phrase.
 *
 * **Le rapport au nombre de cases, pas le total.** « 4 000 sujets » ne dit
 * rien ; « 4 000 sujets là où il y avait 8 cases » dit tout, et c'est la seule
 * chose qu'on soit venu vérifier.
 */
export function phraseDeLaGranulometrie(sujets = [], combienDeDomaines = 0) {
  const tous = Array.isArray(sujets) ? sujets : [];
  if (!tous.length) {
    return "Aucun sujet n'est encore partagé par deux chantiers : il n'y a pas"
      + " de quoi parler de vocabulaire.";
  }

  const precis = lesSujetsPrecis(tous).length;
  const cases = Math.max(1, nombre(combienDeDomaines));
  return `${tous.length.toLocaleString("fr-FR")} sujets se dégagent, dont `
    + `${precis.toLocaleString("fr-FR")} en plusieurs mots — là où la taxonomie `
    + `n'a que ${cases} cases.`;
}

/**
 * Ce que la console ne montre pas, et pourquoi.
 *
 * **Taire ce qu'on cache montrerait un vocabulaire plus pauvre qu'il n'est**
 * (règle 5). Un terme vu sur un seul chantier est son contenu, pas du
 * vocabulaire : il reste dehors, et l'on dit combien.
 */
export function phraseDeCeQuiEstCache(mesure = null) {
  const caches = nombre(mesure?.caches);
  if (!caches) return "";
  return `${caches.toLocaleString("fr-FR")} autres termes n'apparaissent que sur`
    + " un seul chantier. Ils ne sont pas montrés : un mot propre à un chantier"
    + " est de son contenu, pas du vocabulaire commun.";
}

/** Sur combien de chantiers un sujet se montre, en une phrase. */
export function phraseDunSujet(ligne = null) {
  const chantiers = nombre(ligne?.chantiers);
  if (!chantiers) return "";
  return `${chantiers} ${chantiers > 1 ? "chantiers" : "chantier"}`;
}

/**
 * Combien de formes écrites se rangent sous un sujet.
 *
 * **Vide quand il n'y en a qu'une** : « 1 forme » est du bruit, et l'absence de
 * mention dit mieux que rien n'a été regroupé là.
 */
export function phraseDesFormes(ligne = null) {
  const formes = nombre(ligne?.formes);
  if (formes <= 1) return "";
  return `${formes} formes`;
}

/**
 * Ce que le regroupement a valu, en une phrase.
 *
 * **Le rapport, pas le total.** « 12 000 formes » ne dit rien ; « 12 000 formes
 * rangées sous 4 000 sujets » dit qu'on a divisé le vocabulaire par trois, et
 * c'est la seule chose qu'on soit venu vérifier.
 *
 * `null` quand rien n'a été regroupé : on ne se prononce pas sur un
 * regroupement qui n'a pas eu lieu (règle 5).
 */
export function phraseDuRegroupement(sujets = [], mesure = null) {
  const combien = (Array.isArray(sujets) ? sujets : []).length;
  const formes = nombre(mesure?.formes);
  if (!combien || formes <= combien) return "";

  return `${formes.toLocaleString("fr-FR")} formes écrites se rangent sous ces `
    + `${combien.toLocaleString("fr-FR")} sujets — pluriels, ordre des mots, et `
    + "mots-outils intercalés.";
}

/**
 * Ce qu'il reste à faire, nommément.
 *
 * **Une étape qui n'a pas été écrite n'avance pas de zéro pour cent, elle
 * n'existe pas** (règle 12). Le comptage de termes est la première couche, pas
 * la dernière ; l'écrire ici évite de laisser croire que la question est réglée.
 */
export const CE_QUI_MANQUE_ENCORE = [
  {
    quoi: "Lire une idée dont le lien est en tête de phrase",
    ou: "la rubrique « Les idées énoncées » lit les liaisons placées entre les"
      + " deux membres, et seulement celles-là",
    pourquoi: "« si le sol est argileux, les fondations descendent » commence par"
      + " son lien : à gauche, il n'y a rien à couper. Deviner la coupure sur une"
      + " virgule rendrait des idées fausses avec l'aplomb des vraies — et dans"
      + " un enchaînement, un maillon mal coupé contamine toute la chaîne."
  },
  {
    quoi: "Lire une idée que la phrase n'annonce par aucun mot",
    ou: "nulle part",
    pourquoi: "« l'étanchéité de la toiture n'est pas reprise » énonce bien"
      + " quelque chose, et aucune liaison ne le signale. Les tirer demande de"
      + " lire la phrase entière, pas d'y chercher des mots — et c'est là,"
      + " précisément, qu'un modèle apporterait quelque chose que le comptage"
      + " n'apporte pas."
  },
  {
    quoi: "Faire entrer une idée dans la mémoire d'un chantier",
    ou: "la console les mesure sur l'ensemble ; aucun projet n'en porte",
    pourquoi: "une idée relevée est une lecture, pas une vérité : elle ne doit"
      + " entrer dans la mémoire que par une proposition signée (règle 1). Ce"
      + " qui manque est l'affirmation d'idée dans une proposition — la forme"
      + " existe, le geste pas encore."
  },
  {
    quoi: "Rapprocher les mots qui veulent dire la même chose",
    ou: "nulle part",
    pourquoi: "les formes d'un même terme sont regroupées — pluriels, ordre des"
      + " mots, mots-outils intercalés. Mais « plancher » et « dalle » restent"
      + " deux sujets : les rapprocher demande de comparer des sens, et aucune"
      + " règle de caractères ne le fera."
  },
  {
    quoi: "Rattacher un sujet à un domaine",
    ou: "nulle part",
    pourquoi: "rien ne dit encore que « nappe phreatique » relève du sol. Les"
      + " deux couches coexistent sans se parler."
  },
  {
    quoi: "Prédire sur les sujets dans un chantier",
    ou: "la console les enchaîne ; l'écran d'un projet travaille toujours sur"
      + " les huit cases",
    pourquoi: "il faudrait que chaque affirmation porte ses sujets en base, et"
      + " non qu'on les recalcule à la lecture — sans quoi un chantier les"
      + " retrouverait à chaque ouverture, sur toute sa mémoire."
  }
];
