/**
 * Ce qu'un document **lie**, rassemblé : liaisons, idées, raisonnements.
 *
 * ## La question à laquelle cette page répond
 *
 * Une lecture rend des points — ce que le document dit. L'étape au-dessus est
 * ce qu'il **enchaîne** : quels mots de liaison il emploie, quelles idées ils
 * rendent, et ce que ces idées composent entre elles.
 *
 * Cela existait déjà, mais éclaté : la liste des idées dans l'analyse, les
 * raisonnements nulle part, les liaisons seulement dans la console
 * d'administration — c'est-à-dire sur tout le système, jamais sur le document
 * qu'on vient de lire. On ne pouvait donc pas répondre à « pourquoi ce
 * document-ci n'énonce que deux idées ? ».
 *
 * ## Les liaisons sont la première explication, et elles sont ici
 *
 * Un mot de liaison porté et jamais coupé dit autre chose qu'un mot absent :
 * le premier promet et ne tient pas, le second dit que le document n'enchaîne
 * rien. Les confondre fait corriger le découpage là où c'est le corpus qu'il
 * faut regarder (règle 5).
 *
 * ## Ce qu'elle ne fabrique pas
 *
 * **Aucune idée nouvelle.** Elle range ce que le relevé a rendu, compte, et
 * compose. Un raisonnement n'est pas relevé : il est **obtenu** — c'est le seul
 * endroit où quelque chose qui n'est écrit dans aucun document apparaît, et
 * c'est pour cela qu'il porte toujours les idées dont il sort.
 *
 * ## Elle est pure
 *
 * Des idées entrent, une synthèse sort.
 */

import { leLienDit, leCote } from "./une-idee.js";
import { lesIdeesRelevees } from "./une-idee-relevee.js";
import { lesRaisonnements } from "./un-raisonnement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les mots de liaison que ce document emploie, du plus fréquent au plus rare.
 *
 * Le **mot** et non la sorte : « donc » et « car » portent tous deux une cause
 * et ne se lisent pas pareil — l'un va de gauche à droite, l'autre à l'envers.
 * Les fondre dirait que le document emploie deux fois le même tour.
 *
 * @param {object[]} idees des idées relevées
 * @returns {{mot: string, lien: string, libelle: string, combien: number}[]}
 */
export function lesLiaisonsRelevees(idees = []) {
  const parMot = new Map();

  for (const idee of Array.isArray(idees) ? idees : []) {
    const mot = texte(idee?.mot);
    // **Sans mot, pas de ligne.** Une idée dont on ne sait pas par quel tour
    // elle a été coupée ne peut pas expliquer le découpage : la ranger sous un
    // mot vide ferait une ligne qui compte sans rien nommer.
    if (!mot) continue;

    const dit = leLienDit(idee?.lien);
    if (!dit) continue;

    const vu = parMot.get(mot);
    if (vu) vu.combien += 1;
    else parMot.set(mot, { mot, lien: dit.cle, libelle: dit.libelle, combien: 1 });
  }

  return [...parMot.values()].sort((gauche, droite) => droite.combien - gauche.combien
    || gauche.mot.localeCompare(droite.mot, "fr"));
}

/**
 * Les termes que ce document met en jeu, et combien de fois chacun.
 *
 * **Un terme qui revient des deux côtés est le pivot du document.** C'est lui
 * qu'on cherche quand on veut savoir de quoi une réunion a parlé *en
 * conséquences*, et non en intitulés.
 */
export function lesTermesReleves(idees = []) {
  const parTerme = new Map();

  const compter = (valeur, ou) => {
    const terme = leCote(valeur);
    if (!terme) return;
    const vu = parTerme.get(terme) ?? { terme, entre: 0, sort: 0 };
    vu[ou] += 1;
    parTerme.set(terme, vu);
  };

  for (const idee of Array.isArray(idees) ? idees : []) {
    compter(idee?.avant, "entre");
    compter(idee?.apres, "sort");
  }

  return [...parTerme.values()]
    .map((un) => ({ ...un, combien: un.entre + un.sort }))
    .sort((gauche, droite) => droite.combien - gauche.combien
      || gauche.terme.localeCompare(droite.terme, "fr"));
}

/**
 * La synthèse entière d'un document.
 *
 * @param {object[]} brutes ce que le relevé a rendu, tel quel
 * @returns {{idees, liaisons, termes, raisonnements}}
 */
export function laSyntheseDunDocument(brutes = []) {
  const idees = lesIdeesRelevees(brutes);

  return {
    idees,
    liaisons: lesLiaisonsRelevees(idees),
    termes: lesTermesReleves(idees),
    // **Les raisonnements se composent sur les idées de ce document seul.**
    // Les composer avec celles d'un autre document ferait une conséquence que
    // personne n'a lue au même endroit, et que rien ne permettrait de contester.
    raisonnements: lesRaisonnements(idees)
  };
}

/**
 * Ce que la synthèse vaut, en une phrase.
 *
 * **Trois choses à dire, et aucune ne se devine de l'autre** : combien de
 * liaisons le document emploie, combien d'idées elles rendent, et combien de
 * raisonnements s'en composent. Un document qui emploie dix liaisons pour deux
 * idées n'a pas le même défaut qu'un document qui n'en emploie aucune.
 */
export function phraseDeLaSynthese(synthese = null) {
  const liaisons = Array.isArray(synthese?.liaisons) ? synthese.liaisons.length : 0;
  const idees = Array.isArray(synthese?.idees) ? synthese.idees.length : 0;
  const chaines = Array.isArray(synthese?.raisonnements) ? synthese.raisonnements.length : 0;

  if (!idees) {
    return "Ce document n'énonce aucune idée que le découpage sache lire. "
      + "Seules les liaisons placées entre les deux membres d'une phrase sont "
      + "lues : un document fait d'intitulés n'en porte aucune.";
  }

  const dit = `${idees} idée${idees > 1 ? "s" : ""}, par ${liaisons} `
    + `mot${liaisons > 1 ? "s" : ""} de liaison`;

  return chaines
    ? `${dit}. ${chaines} raisonnement${chaines > 1 ? "s" : ""} s'en compose${
      chaines > 1 ? "nt" : ""} — une conséquence obtenue, écrite dans aucun document.`
    : `${dit}. Aucune ne s'enchaîne à une autre : il n'y a rien à composer.`;
}

/**
 * **Pourquoi la synthèse n'écrit pas de `fonction` mdall.**
 *
 * Une idée dit que A mène à B. Une `fonction` mdall dit *à partir de quelle
 * valeur* : `si (hauteur <= 28 m) alors …`. Ce seuil n'est écrit nulle part
 * dans ce que le découpage a lu — le document énonce un lien, pas une borne.
 *
 * L'écrire quand même produirait une règle qui a l'air d'une règle, se relit
 * comme une règle, et n'en est pas. C'est exactement le genre de chose qu'on ne
 * remarque qu'une fois qu'elle a servi à décider (règle 12).
 *
 * Ce que la synthèse écrit en mdall est donc l'**affirmation** : ce que le
 * document lie, avec sa citation et son statut. C'est elle qui passe en
 * proposition, et c'est d'elle que la règle se tirera — par quelqu'un.
 */
export const POURQUOI_PAS_DE_FONCTION =
  "Une idée dit que A mène à B ; une fonction mdall dit à partir de quelle "
  + "valeur. Ce seuil n'est pas dans le document : il s'écrit à la main, après. "
  + "Ce qui suit est donc l'affirmation que la proposition portera.";
