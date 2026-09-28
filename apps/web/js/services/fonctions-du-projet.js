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
import { laValeurQuiFaitFoi } from "./le-temps-des-valeurs.js";
import { entreesDuBloc, nomsLusParLeBloc, parametresDuBloc } from "./memoire-en-lecture.js";
import { blocDeRegle, texteDesLignes } from "./memoire-en-texte.js";

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

/**
 * Les règles en vigueur de la mémoire, par sujet — **la dernière version de
 * chacune**.
 *
 * ## Pourquoi « la dernière », et non « la première trouvée »
 *
 * Tant que ceci ne servait qu'à dire **qu'un nom existe**, n'importe laquelle
 * faisait l'affaire. Depuis qu'on **reprend** une fonction versée pour la
 * corriger, ce n'en est plus une : on ajoutait un `rend:`, on signait, on
 * reprenait — et c'est le texte d'avant la correction qui revenait. On aurait
 * corrigé la même fonction indéfiniment sans jamais voir sa correction, et
 * chaque reprise aurait reversé l'ancienne version par-dessus la neuve.
 *
 * L'ordre dans lequel la base rend ses lignes n'est pas une réponse à
 * « laquelle vaut ». Ce qui tranche est le **même juge que partout ailleurs**
 * dans la mémoire : `laValeurQuiFaitFoi`, qui ordonne totalement et dit
 * laquelle fait foi. Un second départage écrit ici finirait par ne plus dire la
 * même chose que celui de l'écran des valeurs (règle 4).
 *
 * **La zone reste hors de la question**, comme avant : deux règles du même nom
 * sur deux bâtiments sont une question de portée, et l'écran d'écriture n'en
 * tient aucune. Ce qu'on choisit ici est la version la plus récente, pas le
 * bâtiment.
 */
function reglesParSujet(assertions = []) {
  const parSujet = new Map();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (!estUneRegle(assertion) || !enVigueur(assertion)) continue;
    const cle = cleDuSujet(texte(assertion?.payload?.subject) || texte(assertion?.subject_key));
    if (!cle) continue;
    if (!parSujet.has(cle)) parSujet.set(cle, []);
    parSujet.get(cle).push(assertion);
  }

  const par = new Map();
  for (const [cle, candidates] of parSujet) {
    const { enVigueur: laQuiVaut } = laValeurQuiFaitFoi(candidates);
    const assertion = laQuiVaut ?? candidates[0];
    const bloc = blocDeLaRegleVersee(assertion);
    if (bloc.sujet) par.set(cle, { bloc, assertion });
  }

  return par;
}

/**
 * La fonction versée qui porte ce nom — celle qui fait foi.
 *
 * **Un seul endroit décide laquelle** (règle 10). L'écran la cherchait
 * lui-même, avec son propre `find`, et prenait donc la première rendue par la
 * base : reprendre montrait une version, et le modèle en recevait une autre.
 * Deux réponses à la même question valent moins qu'une.
 */
export function laFonctionVersee(assertions = [], sujet = "") {
  const cle = cleDuSujet(texte(sujet));
  if (!cle) return null;

  return reglesParSujet(assertions).get(cle)?.assertion ?? null;
}

/**
 * Tout ce que la mémoire du projet conclut — un nom par règle versée.
 *
 * C'est ce que le **catalogue** montre : on parcourt ce que le projet sait
 * faire, même ce dont le brouillon n'a pas encore besoin.
 */
export function nomsConclusParLeProjet(assertions = []) {
  return [...reglesParSujet(assertions).values()].map(({ bloc, assertion }) => ({
    nom: bloc.sujet,
    /**
     * **Ce que la fonction dit d'elle-même** — son premier commentaire.
     *
     * Ce qui distingue « Coefficient de site » de « Coefficient de site » est
     * la phrase qui dit à quoi il sert. Sans elle, on ouvre la fonction pour
     * le savoir, et l'on est déjà en train de la reprendre.
     *
     * **Elle reste à l'écran** : elle ne monte pas au modèle. C'est de la
     * prose écrite dans ce projet — elle peut nommer un fournisseur, un site,
     * quelqu'un —, et ce qui sort d'un projet se décide, ça ne se déduit pas
     * d'un « ça aiderait ».
     */
    quoi: texte(assertion?.payload?.quoi),
    /**
     * **Ce qu'elle lit dehors**, et non tout ce que son corps nomme.
     *
     * `nomsLusParLeBloc` rend aussi ses `calcule` et son propre nom : la fiche
     * de `Prix TTC` annonçait « lit Prix HT, Taux de TVA, TVA, Prix TTC ».
     * `TVA` est sa locale, `Prix TTC` est elle-même — deux entrées à remplir
     * qu'on serait parti chercher, à l'écran comme dans la consigne du modèle.
     *
     * `entreesDuBloc` est la réponse que la vérification de la signature exige
     * déjà : la même question n'a pas deux réponses (règle 4).
     */
    lit: entreesDuBloc(bloc),
    // L'ordre dans lequel on lui donne ses valeurs, portée comprise : c'est ce
    // qu'un appel mire, et `lit` ne le dit pas.
    parametres: parametresDuBloc(bloc),
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

/**
 * Le **texte Mdall** d'une fonction versée, prêt à être repris et modifié.
 *
 * ## Le verrou
 *
 * Une fonction versée se relit, se rejoue, se nomme — et **ne se modifie pas.**
 * Y ajouter un `rend:`, corriger une ligne de barème, renommer une entrée
 * demandait de la réécrire à la main, de mémoire, en espérant n'avoir rien
 * oublié. Une fonction qu'on ne peut pas changer est une fonction qu'on
 * remplace par une autre qui lui ressemble — et le projet en tient deux.
 *
 * ## Ce n'est pas une modification en place
 *
 * Rien n'est écrit dans la mémoire ici : on rend un **texte**, qui revient dans
 * le brouillon. De là, le seul chemin reste celui de tout le monde — une
 * proposition relue ligne à ligne et signée (règle 1). La version reprise
 * remplacera l'ancienne quand elle sera signée, pas avant.
 *
 * ## C'est la même écriture que partout
 *
 * `blocDeRegle` écrit la fonction, ici comme dans l'écran des fichiers. Un
 * second écrivain aurait rendu deux textes différents pour la même règle, et
 * l'on aurait repris une fonction qui n'est pas celle qu'on lisait (règle 10).
 */
export function texteDeLaFonctionVersee(assertion = null) {
  const bloc = blocDeLaRegleVersee(assertion);
  if (!bloc.sujet) return "";

  const payload = assertion?.payload ?? {};

  return texteDesLignes(blocDeRegle({
    sujet: bloc.sujet,
    quoi: texte(payload.quoi),
    conditions: bloc.conditions,
    sinonSi: bloc.sinonSi,
    selon: bloc.selon,
    sauf: bloc.sauf,
    calculs: bloc.calculs,
    boucle: bloc.boucle,
    courbe: bloc.courbe,
    seLitEn: bloc.seLitEn,
    rend: bloc.rend,
    alors: bloc.alors,
    sinon: bloc.sinon,
    /**
     * **Ce qu'elle lit se redéclare**, et c'est ce qui la rend modifiable : une
     * signature reprise sans ses entrées serait refusée dès la relecture, et
     * l'on passerait le premier quart d'heure à réparer ce qu'on venait de
     * reprendre.
     *
     * On ne réécrit **pas** de lignes `importe` : elles disent d'où vient
     * chaque entrée, et on ne le sait pas d'ici. « depuis: inconnu » serait une
     * réponse inventée à une question qu'on ne nous a pas posée (règle 5).
     */
    signature: entreesDuBloc(bloc),
    preuve: texte(payload.citation)
  }));
}
