/**
 * Ce que la mémoire du projet conclut, et qu'on peut nommer en écrivant.
 *
 * ## Le verrou que ça lève
 *
 * Une fonction versée est **la seule chose du projet qu'on ne pouvait pas
 * réutiliser.** On relit sa règle dans l'écran des fichiers, on la voit
 * conclure, on la voit se dérouler — et en ouvrant « Écrire du Mdall » pour
 * s'en servir, elle n'existait plus : ni dans la liste sous le curseur, ni dans
 * le catalogue qu'on parcourt. Il fallait la recopier.
 *
 * C'était la **quatrième source** du catalogue, la seule qui manquait : le
 * brouillon, le langage, l'établi… et ce que le projet a signé.
 *
 * ## Elle se lit d'ici, et c'est ce qui la distingue de l'établi
 *
 * Un utilitaire de l'établi se parcourt et **ne se propose pas** : il vit dans
 * un autre brouillon, et le nommer ferait écrire une règle que personne ne
 * conclut. Une fonction versée, elle, conclut vraiment — dans **ce projet**,
 * sur les valeurs de ce projet. La nommer marche, et le bac d'essai la rejoue
 * pour le montrer.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne va pas en base.** On lui donne les assertions ; l'écran les charge
 * comme il charge l'établi. C'est ce qui le rend éprouvable sans réseau.
 *
 * **Il ne prend pas tout.** Une mémoire de trois cents règles noierait la liste
 * sous le curseur. On ne retient que celles dont le brouillon a besoin — celles
 * qu'il nomme, puis celles que celles-là nomment, de proche en proche.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { estUneRegle } from "./assertion-taxonomy.js";
import { nomsLusParLeBloc } from "./memoire-en-lecture.js";

const texte = (valeur) => String(valeur ?? "").trim();
const enVigueur = (assertion) => !texte(assertion?.superseded_by);

/**
 * La règle versée, remise sous la forme d'un **bloc** — celle du langage.
 *
 * C'est l'exacte réciproque du versement : la proposition avait démonté le bloc
 * en `payload.regle`, on le remonte. Tant qu'un seul champ manque des deux
 * côtés, une fonction versée se rejoue plus simple qu'elle n'est — et rien ne
 * le dit, puisque ce qui reste est juste.
 */
export function blocDeLaRegleVersee(assertion = null) {
  const payload = assertion?.payload ?? {};
  const regle = payload.regle ?? {};

  return {
    sujet: texte(payload.subject) || texte(assertion?.subject_key),
    conditions: Array.isArray(regle.conditions) ? regle.conditions : [],
    sinonSi: Array.isArray(regle.sinonSi) ? regle.sinonSi : [],
    selon: Array.isArray(regle.selon) ? regle.selon : [],
    sauf: Array.isArray(regle.sauf) ? regle.sauf : [],
    calculs: Array.isArray(regle.calculs) ? regle.calculs : [],
    boucle: regle.boucle ?? null,
    courbe: regle.courbe ?? null,
    seLitEn: texte(regle.seLitEn),
    rend: regle.rend ?? null,
    alors: texte(payload.value),
    sinon: texte(regle.sinon),
    // **Un agent versé reste un agent** : sa loi n'est pas dans le fichier, et
    // le bac d'essai le dit plutôt que de faire semblant de la rejouer.
    ...(payload.agent ? { agent: texte(payload.agent?.genre) } : {})
  };
}

/** Les règles en vigueur de la mémoire, par sujet. */
function reglesParSujet(assertions = []) {
  const par = new Map();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (!estUneRegle(assertion) || !enVigueur(assertion)) continue;
    const bloc = blocDeLaRegleVersee(assertion);
    const cle = cleDuSujet(bloc.sujet);
    // Une seule par sujet : deux règles qui concluent le même nom sont une
    // question de zone, et l'écran d'écriture n'en tient aucune. La première
    // en vigueur suffit à dire que ce nom existe, et c'est tout ce qu'on
    // promet ici.
    if (cle && !par.has(cle)) par.set(cle, { bloc, assertion });
  }

  return par;
}

/**
 * Tout ce que la mémoire du projet conclut — un nom par règle versée.
 *
 * C'est ce que le **catalogue** montre : on parcourt ce que le projet sait
 * faire, même ce dont le brouillon n'a pas encore besoin.
 */
export function nomsConclusParLeProjet(assertions = []) {
  return [...reglesParSujet(assertions).values()].map(({ bloc }) => ({
    nom: bloc.sujet,
    lit: nomsLusParLeBloc(bloc),
    seLitEn: bloc.seLitEn,
    // De quoi dire « c'est un abaque » ou « ça déroule un tableau » sur la
    // fiche : on ne relit pas une courbe comme on relit une cascade de `si`.
    forme: bloc.courbe ? "courbe" : bloc.boucle ? "boucle" : bloc.selon.length ? "barème" : "",
    // Ce qu'elle annonce rendre : l'aide à la signature le montre, et c'est la
    // question qu'on se pose juste avant de la nommer.
    rend: bloc.rend ?? null
  })).filter((une) => une.nom);
}

/**
 * Les règles versées dont ce brouillon a besoin, de proche en proche.
 *
 * **On ne prend pas toute la mémoire.** Trois cents règles versées dans le bac
 * d'essai rendraient trois cents verdicts, et celui qu'on cherchait serait
 * quelque part au milieu. On part de ce que le brouillon lit, on prend les
 * règles qui le concluent, puis ce que celles-là lisent, et ainsi de suite.
 *
 * **Ce que le brouillon conclut lui-même gagne**, et n'est jamais repris du
 * projet : on écrit peut-être une nouvelle version de cette fonction-là, et
 * c'est celle qu'on est en train d'essayer qui doit répondre.
 *
 * @param {object[]} assertions la mémoire du projet
 * @param {object} quoi
 * @param {string[]} quoi.lus les noms que le brouillon lit
 * @param {string[]} quoi.conclus les noms que le brouillon conclut déjà
 */
export function reglesVerseesUtiles(assertions = [], { lus = [], conclus = [] } = {}) {
  const par = reglesParSujet(assertions);
  const siens = new Set((Array.isArray(conclus) ? conclus : []).map(cleDuSujet).filter(Boolean));

  const retenues = [];
  const vus = new Set();
  const aVoir = (Array.isArray(lus) ? lus : []).map(cleDuSujet).filter(Boolean);

  while (aVoir.length) {
    const cle = aVoir.shift();
    if (!cle || vus.has(cle) || siens.has(cle)) continue;
    vus.add(cle);

    const trouvee = par.get(cle);
    if (!trouvee) continue;

    retenues.push(trouvee);
    // Ce que cette règle lit à son tour : une chaîne versée se rejoue entière,
    // ou elle ne se rejoue pas.
    for (const nom of nomsLusParLeBloc(trouvee.bloc)) aVoir.push(cleDuSujet(nom));
  }

  return retenues;
}
