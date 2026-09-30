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
    .sort((gauche, droite) => droite.chantiers - gauche.chantiers
      || droite.mots - gauche.mots
      || droite.affirmations - gauche.affirmations
      || gauche.sujet.localeCompare(droite.sujet, "fr"));
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
