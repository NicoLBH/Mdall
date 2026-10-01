/**
 * Deux idées qui s'enchaînent — c'est-à-dire un raisonnement.
 *
 * ## Ce que c'est
 *
 * Une idée est une fonction : quelque chose entre, quelque chose sort
 * (`une-idee.js`). Deux fonctions composent quand la sortie de la première est
 * l'entrée de la seconde :
 *
 *     sol argileux ──entraîne──▶ plancher repris ──impose──▶ délai allongé
 *
 * On n'a rien ajouté : les deux idées étaient déjà dans le corpus, chacune dans
 * son coin, souvent dans deux documents qui ne se connaissent pas. Ce que la
 * composition donne est **la conséquence que personne n'a écrite** — et c'est
 * la seule chose de toute cette chaîne qui ressemble à du raisonnement.
 *
 * ## Ce qu'un raisonnement vaut ici, et pas plus
 *
 * Il vaut **son maillon le plus faible**. Une chaîne dont le premier lien est
 * vu sur quatre chantiers et le second sur deux est attestée par deux, pas par
 * quatre : prendre la somme, ou le premier, annoncerait une assise que la
 * chaîne n'a pas (règle 12).
 *
 * ## Les boucles ne se taisent pas
 *
 * « A entraîne B » et « B entraîne A » forment un cercle. Un parcours naïf y
 * tournerait sans fin ; celui-ci s'arrête au premier nœud déjà vu, et **le
 * dit**. Un cercle est une information : soit le corpus se contredit, soit il
 * décrit une boucle de rétroaction — et les deux méritent qu'on les regarde,
 * pas qu'on les cache (règle 5).
 *
 * ## Il est pur
 *
 * Des idées entrent, des chaînes et des phrases sortent. Aucun modèle, aucune
 * clé, aucun service : cela se vérifie à la main.
 */

import { cestUneIdee, leCote, leLienDit } from "./une-idee.js";

/**
 * La longueur au-delà de laquelle on arrête de suivre.
 *
 * Non par peur d'une boucle — les nœuds déjà vus s'en chargent —, mais parce
 * qu'une chaîne de douze maillons dont chacun peut être faux n'est pas un
 * raisonnement : c'est une suite de mots qui se tiennent par la main.
 */
export const AU_PLUS_LONG = 6;

/** Combien de chaînes au plus. Au-delà, personne ne lit. */
export const AU_PLUS_DE_CHAINES = 50;

const nombre = (valeur) => Number(valeur) || 0;

/**
 * Les raisonnements que ces idées composent.
 *
 * Les départs sont les entrées que rien ne produit : ce sont les causes
 * premières du corpus, et partir d'ailleurs redonnerait des bouts de chaînes
 * déjà contenus dans une plus longue. Quand il n'y en a aucun et qu'il reste
 * des liens, tout est en cercle : on part alors de partout, et les chaînes le
 * disent.
 *
 * @param {object[]} idees ce que `lesIdeesRangees` a rendu
 */
export function lesRaisonnements(idees = [], {
  auPlusLong = AU_PLUS_LONG, auPlus = AU_PLUS_DE_CHAINES
} = {}) {
  const bonnes = (Array.isArray(idees) ? idees : []).filter(cestUneIdee);
  if (!bonnes.length) return [];

  const parEntree = new Map();
  const produites = new Set();
  for (const une of bonnes) {
    const entree = leCote(une.avant);
    if (!parEntree.has(entree)) parEntree.set(entree, []);
    parEntree.get(entree).push(une);
    produites.add(leCote(une.apres));
  }

  const chaines = [];
  const bornes = { auPlusLong, auPlus };

  // **D'abord les entrées que rien ne produit** : les causes premières du
  // corpus. C'est de là que partent les chaînes les plus longues.
  //
  // Ces boucles ne comptent pas les chaînes : la borne du nombre est tenue dans
  // `suivre`, et à un seul endroit. Un second compte ici aurait eu l'air d'un
  // garde-fou sans pouvoir rien retenir que l'autre ne retienne déjà (règle 4).
  const departs = [...parEntree.keys()].filter((un) => !produites.has(un));
  for (const depart of departs) {
    suivre(depart, [], new Set(), parEntree, chaines, bornes);
  }

  /**
   * **Puis les cercles que rien n'atteint.**
   *
   * Un cercle n'a aucune entrée libre — chacun de ses nœuds est produit par le
   * précédent —, donc aucun départ ne mène à lui. S'en tenir aux départs
   * perdait « A entraîne B entraîne A » dès qu'une seule chaîne droite existait
   * ailleurs : la liste avait l'air complète, et il y manquait précisément les
   * contradictions (règle 5).
   *
   * **Atteignable, et non « déjà traversé »**, parce que ce n'est pas la même
   * chose : une chaîne arrêtée par la borne de longueur n'a pas traversé sa
   * propre queue, et repartir de là rendait la fin d'un raisonnement comme un
   * second raisonnement. Deux morceaux d'une même chaîne, présentés comme deux
   * trouvailles.
   */
  if (chaines.length < auPlus) {
    const atteignables = ceQuonAtteint(departs, parEntree);
    for (const entree of parEntree.keys()) {
      if (atteignables.has(entree)) continue;
      suivre(entree, [], new Set(), parEntree, chaines, bornes);
      // Le même cercle vu depuis chacun de ses nœuds est le même cercle. Sans
      // cela, « A entraîne B entraîne A » se rendait deux fois : une fois
      // depuis A, une fois depuis B.
      for (const un of ceQuonAtteint([entree], parEntree)) atteignables.add(un);
    }
  }

  return chaines
    .map(unRaisonnement)
    .sort((gauche, droite) => droite.chantiers - gauche.chantiers
      || droite.pas - gauche.pas
      || droite.affirmations - gauche.affirmations);
}

/**
 * Le parcours, en profondeur.
 *
 * Il ne garde que les chaînes d'au moins deux maillons : une idée seule est une
 * idée, pas un raisonnement, et elle est déjà montrée pour ce qu'elle est.
 */
function suivre(entree, chemin, vus, parEntree, chaines, bornes) {
  // **La borne du nombre, et elle est ici seule.** Tout parcours passe par
  // cette porte avant d'ajouter quoi que ce soit : une seconde vérification
  // dans les boucles d'appel n'aurait jamais pu retenir ce que celle-ci laisse
  // passer, et aurait ressemblé à un garde-fou (règle 4).
  if (chaines.length >= bornes.auPlus) return;

  // **Le nœud déjà vu arrête tout.** C'est la seule chose qui empêche
  // « A entraîne B entraîne A » de tourner jusqu'à la pile.
  if (vus.has(entree)) {
    if (chemin.length >= 2) {
      chaines.push({ idees: [...chemin], boucle: true, tronquee: false });
    }
    return;
  }

  const suites = parEntree.get(entree) ?? [];
  const trop = chemin.length >= bornes.auPlusLong;
  if (!suites.length || trop) {
    if (chemin.length >= 2) {
      // `tronquee` quand c'est la borne qui arrête, et non la fin du chemin :
      // une chaîne coupée et une chaîne finie ne disent pas la même chose.
      chaines.push({ idees: [...chemin], boucle: false, tronquee: trop && suites.length > 0 });
    }
    return;
  }

  vus.add(entree);
  for (const une of suites) {
    suivre(leCote(une.apres), [...chemin, une], vus, parEntree, chaines, bornes);
  }
  vus.delete(entree);
}

/**
 * Tout ce qu'on atteint depuis ces départs, sans borne de longueur.
 *
 * C'est la question « ce nœud est-il déjà dans une chaîne, quelque part ? »,
 * et elle ne se confond pas avec « l'a-t-on traversé ? » : la borne de longueur
 * arrête les parcours avant la fin, et laisse donc des nœuds non traversés au
 * milieu de chaînes qui existent bel et bien.
 */
function ceQuonAtteint(departs, parEntree) {
  const atteints = new Set();
  const aVoir = [...departs];

  while (aVoir.length) {
    const entree = aVoir.pop();
    if (atteints.has(entree)) continue;
    atteints.add(entree);
    for (const une of parEntree.get(entree) ?? []) aVoir.push(leCote(une.apres));
  }
  return atteints;
}

/**
 * Une chaîne, avec ce qu'elle vaut.
 *
 * `chantiers` et `affirmations` sont ceux du **maillon le plus faible** : une
 * chaîne n'est pas mieux attestée que le lien qui l'est le moins.
 *
 * Elle ne revérifie pas qu'il y a deux maillons : `suivre` est le seul endroit
 * qui décide ce qui devient une chaîne, et il n'en pousse aucune plus courte.
 * Le redire ici en aurait fait un garde-fou incapable de tomber (règle 4).
 */
function unRaisonnement(chaine) {
  const idees = chaine.idees;

  return {
    idees,
    pas: idees.length,
    boucle: chaine?.boucle === true,
    tronquee: chaine?.tronquee === true,
    chantiers: Math.min(...idees.map((une) => nombre(une.chantiers))),
    affirmations: Math.min(...idees.map((une) => nombre(une.affirmations)))
  };
}

/** La chaîne écrite comme une composition : ce qui entre, ce qui sort. */
export function leRaisonnementDit(chaine) {
  const idees = Array.isArray(chaine?.idees) ? chaine.idees : [];
  if (idees.length < 2) return "";
  return [idees[0].avant, ...idees.map((une) => une.apres)].join(" → ");
}

/**
 * La chaîne dite en français, avec le verbe de chaque lien.
 *
 * `""` quand un maillon porte une sorte de lien que cet écran ne connaît pas :
 * mieux vaut ne rien écrire qu'écrire une flèche sans verbe (règle 5).
 */
export function phraseDunRaisonnement(chaine) {
  const idees = Array.isArray(chaine?.idees) ? chaine.idees : [];
  if (idees.length < 2) return "";

  const liens = idees.map((une) => leLienDit(une.lien));
  if (liens.some((un) => !un)) return "";

  let dit = `${idees[0].avant} ${liens[0].fleche} ${idees[0].apres}`;
  for (let rang = 1; rang < idees.length; rang += 1) {
    dit += `, qui ${liens[rang].fleche} ${idees[rang].apres}`;
  }
  if (chaine?.boucle) return `${dit} — et l'on revient au départ`;
  return chaine?.tronquee ? `${dit} — et cela continue au-delà` : dit;
}

/**
 * Ce que les raisonnements relevés valent, en une phrase.
 *
 * Une liste vide n'est pas un silence : des idées sans aucune chaîne veut dire
 * que le corpus énonce des liens isolés, qui ne se touchent pas. C'est un
 * constat, et il se dit.
 */
export function phraseDesRaisonnements(chaines = [], idees = []) {
  const combien = Array.isArray(chaines) ? chaines.length : 0;
  const combienDIdees = Array.isArray(idees) ? idees.length : 0;

  if (!combienDIdees) {
    return "Sans idée relevée, il n'y a rien à enchaîner.";
  }
  if (!combien) {
    return `${combienDIdees} idée${combienDIdees > 1 ? "s" : ""}, et aucune qui `
      + "s'enchaîne : ce que l'une produit, aucune autre ne le reprend. Le corpus "
      + "énonce des liens isolés, pas encore de raisonnement.";
  }

  const boucles = chaines.filter((une) => une?.boucle).length;
  const dit = `${combien} enchaînement${combien > 1 ? "s" : ""} — une conséquence `
    + "que personne n'a écrite, obtenue en composant deux idées trouvées séparément.";

  return boucles
    ? `${dit} Dont ${boucles} qui revien${boucles > 1 ? "nent" : "t"} à son point de `
      + "départ : soit le corpus se contredit, soit il décrit une boucle."
    : dit;
}
