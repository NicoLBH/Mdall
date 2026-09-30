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
 * Ce qu'il reste à faire, nommément.
 *
 * **Une étape qui n'a pas été écrite n'avance pas de zéro pour cent, elle
 * n'existe pas** (règle 12). Le comptage de termes est la première couche, pas
 * la dernière ; l'écrire ici évite de laisser croire que la question est réglée.
 */
export const CE_QUI_MANQUE_ENCORE = [
  {
    quoi: "Regrouper les synonymes",
    ou: "nulle part",
    pourquoi: "« plancher beton », « dalle beton » et « plancher en beton » sont"
      + " trois sujets distincts aujourd'hui. Les rapprocher demande de comparer"
      + " des sens, pas des chaînes."
  },
  {
    quoi: "Rattacher un sujet à un domaine",
    ou: "nulle part",
    pourquoi: "rien ne dit encore que « nappe phreatique » relève du sol. Les"
      + " deux couches coexistent sans se parler."
  },
  {
    quoi: "Prédire sur les sujets plutôt que sur les domaines",
    ou: "la prédiction travaille toujours sur les huit cases",
    pourquoi: "c'est ce qui donnera « après une question de nappe, une question"
      + " de cuvelage » au lieu de « après le sol, la structure »."
  }
];
