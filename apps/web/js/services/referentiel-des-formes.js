/**
 * Le référentiel des formes de raisonnement : ce qu'il répond, et ce qu'il tait.
 *
 * ## Ce qu'on vient y chercher
 *
 * Une seule question, et c'est elle qui justifie tout le reste :
 *
 * > *J'ai à trancher une profondeur hors gel. Ailleurs, d'où part-on ?*
 *
 * La réponse — « de l'altitude et de la nature du sol » — vaut pour quelqu'un
 * qui n'a jamais ouvert cet autre projet, parce qu'elle ne contient rien de cet
 * autre projet. C'est le seul savoir qui traverse, et c'est celui-là qu'on
 * capitalise.
 *
 * ## Il ne rapporte jamais une valeur, parce qu'il n'en a pas
 *
 * Les formes n'ont pas de valeurs : `forme-dun-raisonnement.js` n'en laisse pas
 * sortir, et la table n'a pas de colonne pour en accueillir. Ce fichier n'a donc
 * rien à filtrer — il lit des noms, il rend des noms.
 *
 * C'est le sens de l'aller comme du retour : **on ne verse rien dans la mémoire
 * depuis le référentiel**, jamais. Il n'y a pas ici de fonction qui produise une
 * affirmation, une proposition ou une valeur, et il ne doit pas y en avoir : ce
 * qu'on apprend d'ailleurs, c'est **où regarder**, et c'est au projet de
 * regarder.
 *
 * ## Il ne dit pas « vous avez oublié »
 *
 * « Ailleurs, on part aussi de la pente du terrain » est un fait sur le
 * référentiel. « Vous avez oublié la pente du terrain » serait un jugement sur
 * un raisonnement qu'il ne connaît pas : peut-être la pente a-t-elle été
 * regardée et écartée, peut-être ne s'applique-t-elle pas ici. Le référentiel
 * n'en sait rien, et il ne fait pas semblant.
 *
 * ## `null` n'est pas `[]`
 *
 * `null` quand le référentiel n'a pas été lu, `[]` quand il ne connaît rien de
 * comparable. Les confondre ferait dire « personne ne fait autrement » à une
 * lecture qui a échoué — et ne pas savoir n'autorise pas à prétendre qu'il n'y a
 * rien (`docs/fondamentaux.md`, règle 5).
 *
 * ## Il est pur
 *
 * Il reçoit des formes et rend une lecture. Le transport est dans
 * `referentiel-des-formes-supabase.js`, et ce qui décide **quoi écrire** est
 * ici : une décision prise dans la couche de transport ne se teste pas.
 */

import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les noms d'une liste, repliés — vide si ce n'en est pas une. */
function nomsDe(liste) {
  const vus = new Set();
  for (const brut of Array.isArray(liste) ? liste : []) {
    const nom = cleDuSujet(texte(brut));
    if (nom) vus.add(nom);
  }
  return vus;
}

/**
 * La forme du référentiel qui est celle-ci — ou `null`.
 *
 * Par l'empreinte, et par rien d'autre : c'est elle que la base rend unique, et
 * reconnaître ici selon une autre règle qu'elle ferait croire à un doublon là où
 * la base n'en voit pas (règle 10).
 */
export function formeDejaConnue(forme = null, formes = null) {
  if (!forme || !Array.isArray(formes)) return null;

  const empreinte = texte(forme.empreinte);
  if (!empreinte) return null;

  return formes.find((ligne) => texte(ligne?.empreinte) === empreinte) ?? null;
}

/**
 * Les formes du référentiel qui aboutissent à l'un de ces noms.
 *
 * C'est la question posée à l'endroit : on sait ce qu'on a à trancher, on
 * cherche par où d'autres y sont arrivés.
 *
 * @returns {object[]|null} `null` si le référentiel n'a pas été lu.
 */
export function formesQuiAboutissentA(conclusions = [], formes = null) {
  if (!Array.isArray(formes)) return null;

  const cherchees = nomsDe(conclusions);
  if (!cherchees.size) return [];

  return formes.filter((ligne) =>
    [...nomsDe(ligne?.conclusions)].some((nom) => cherchees.has(nom)));
}

/**
 * Les formes du référentiel qui partent de l'un de ces noms.
 *
 * C'est la question posée à l'envers, et c'est la seule qu'on puisse poser
 * **avant** d'avoir tranché : on sait de quoi le débat part — les valeurs qu'il
 * met en question —, on ne sait pas encore où il va. « En partant de là,
 * ailleurs, on a tranché ceci » arrive donc au bon moment, celui où l'on peut
 * encore en tenir compte.
 *
 * @returns {object[]|null} `null` si le référentiel n'a pas été lu.
 */
export function formesQuiPartentDe(entrees = [], formes = null) {
  if (!Array.isArray(formes)) return null;

  const cherchees = nomsDe(entrees);
  if (!cherchees.size) return [];

  return formes.filter((ligne) =>
    [...nomsDe(ligne?.entrees)].some((nom) => cherchees.has(nom)));
}

/**
 * Ce qu'ailleurs on tire de ces valeurs-là.
 *
 * @returns {{noms: string[], formes: number}|null} `null` si le référentiel n'a
 *   pas été lu ; `noms` vide quand il ne connaît rien qui en parte.
 */
export function ceQuAilleursOnEnTire(entrees = [], formes = null) {
  const voisines = formesQuiPartentDe(entrees, formes);
  if (voisines === null) return null;

  const tires = new Set();
  for (const voisine of voisines) {
    for (const nom of nomsDe(voisine?.conclusions)) tires.add(nom);
  }

  return { noms: [...tires].sort(), formes: voisines.length };
}

/** Ce qu'on en dit — vide quand il n'y a rien à en dire. */
export function phraseDeCeQuAilleursOnEnTire(ailleurs = null) {
  if (!ailleurs?.noms?.length) return "";

  return `En partant de ces valeurs, ailleurs, on a tranché ${ailleurs.noms.join(", ")}.`;
}

/**
 * Ce qu'ailleurs on regarde et que cette forme ne regarde pas.
 *
 * Les entrées des formes qui aboutissent au même endroit, moins les siennes.
 * Elle-même est retirée : se comparer à soi ne dit rien.
 *
 * @returns {{noms: string[], formes: number}|null} `null` si le référentiel n'a
 *   pas été lu ; `noms` vide quand il ne connaît rien de plus.
 */
export function ceQuAilleursOnRegarde(forme = null, formes = null) {
  if (!forme || !Array.isArray(formes)) return null;

  // Elle-même est dans les voisines, et ce n'est pas un défaut : ses entrées
  // sont les siennes, donc `siennes` les retire toutes, et elle n'apporte ni nom
  // ni compte. L'écarter d'abord par son empreinte a été écrit, puis retiré —
  // cassé, il ne faisait tomber aucune garde, parce qu'il ne servait à rien.
  const voisines = formesQuiAboutissentA(forme.conclusions, formes) ?? [];

  const siennes = nomsDe(forme.entrees);
  const ailleurs = new Set();
  const formesQuiEnParlent = new Set();

  for (const voisine of voisines) {
    for (const nom of nomsDe(voisine?.entrees)) {
      if (siennes.has(nom)) continue;
      ailleurs.add(nom);
      formesQuiEnParlent.add(texte(voisine?.empreinte));
    }
  }

  return { noms: [...ailleurs].sort(), formes: formesQuiEnParlent.size };
}

/**
 * Ce qu'on en dit — vide quand il n'y a rien à en dire.
 *
 * Elle énonce un fait sur le référentiel, jamais un manque dans le raisonnement
 * qu'on regarde : le référentiel ne sait pas si la pente du terrain a été
 * examinée puis écartée.
 */
export function phraseDeCeQuAilleursOnRegarde(ailleurs = null) {
  if (!ailleurs?.noms?.length) return "";

  return `Ailleurs, on part aussi de ${ailleurs.noms.join(", ")}.`;
}

/**
 * La ligne à écrire pour verser cette forme — ou `null` si rien ne doit partir.
 *
 * Elle est ici, et non dans le transport : ce qui sort du projet est une
 * décision, et une décision qui vit dans une couche de transport ne se lit pas,
 * ne se teste pas, et finit par changer sans que personne le voie.
 *
 * `signePar` est obligatoire. Une forme versée sans signataire serait versée par
 * le logiciel, et rien ne sort d'un projet sans que quelqu'un en réponde
 * (règle 1, appliquée à la sortie).
 */
export function leVersementDuneForme(forme = null, {
  projectId = "", assertionId = "", signePar = ""
} = {}) {
  if (!forme) return null;

  const entrees = [...nomsDe(forme.entrees)].sort();
  const conclusions = [...nomsDe(forme.conclusions)].sort();
  // Une forme sans entrée ou sans conclusion n'apprend rien, et `forme-dun-
  // raisonnement.js` n'en produit pas. Si l'une arrivait quand même ici, c'est
  // qu'elle n'est pas passée par lui — et rien ne sort par une autre porte.
  if (!entrees.length || !conclusions.length) return null;

  const projet = texte(projectId);
  const signataire = texte(signePar);
  if (!projet || !signataire) return null;

  return {
    // La forme : des noms, un domaine, rien d'autre. L'empreinte n'est pas
    // envoyée — le serveur la compose, et l'envoyer ferait croire qu'on peut la
    // choisir.
    forme: { entrees, conclusions, domaine: cleDuSujet(texte(forme.domaine)) },
    // La signature : privée, et lisible du seul projet.
    signature: {
      project_id: projet,
      assertion_id: texte(assertionId) || null,
      signed_by: signataire
    }
  };
}

/**
 * Ce que le référentiel sait trancher, rangé par conclusion.
 *
 * ## C'est l'index, et c'est ce qu'on vient y chercher
 *
 * Une liste brute de formes est un fichier ; ce qu'on vient demander à un
 * référentiel est **« que sait-on trancher, et avec quoi ? »**. La conclusion
 * est donc l'entrée de l'index, et les départs viennent sous elle.
 *
 * ## Les départs se réunissent, ils ne se comptent pas deux fois
 *
 * Trois projets qui tranchent une profondeur hors gel en partant de l'altitude
 * font **une** ligne « altitude », pas trois. Le compte des formes reste dit à
 * part : « 4 manières » se lit, et ne se confond pas avec « 4 fois la même ».
 *
 * ## Ne pas savoir n'est pas savoir qu'il n'y a rien
 *
 * `null` quand le référentiel n'a pas été lu. Un index vide dirait « on ne sait
 * rien trancher » d'une lecture ratée (règle 5).
 *
 * @returns {{conclusion: string, entrees: string[], formes: number}[]|null}
 */
export function ceQueLeReferentielSaitTrancher(formes = null) {
  if (!Array.isArray(formes)) return null;

  const index = new Map();
  for (const ligne of formes) {
    for (const conclusion of nomsDe(ligne?.conclusions)) {
      const range = index.get(conclusion) ?? { conclusion, entrees: new Set(), formes: 0 };
      for (const nom of nomsDe(ligne?.entrees)) range.entrees.add(nom);
      range.formes += 1;
      index.set(conclusion, range);
    }
  }

  return [...index.values()]
    .map(({ conclusion, entrees, formes: combien }) => ({
      conclusion, entrees: [...entrees].sort(), formes: combien
    }))
    // Le plus su d'abord : c'est là que le référentiel a quelque chose à dire.
    // À égalité, l'ordre du nom — sans quoi deux lectures de la même mémoire ne
    // donneraient pas la même page (règle 10).
    .sort((gauche, droite) =>
      droite.formes - gauche.formes || gauche.conclusion.localeCompare(droite.conclusion));
}

/**
 * Les formes dont un nom contient ce qu'on cherche.
 *
 * ## Elle cherche dans les noms, et seulement dans les noms
 *
 * Il n'y a rien d'autre : ni question, ni valeur, ni projet. Ce que la recherche
 * ne peut pas trouver, c'est ce que le référentiel ne contient pas — et c'est
 * exactement ce qu'on veut d'un référentiel anonyme.
 *
 * ## Sur un morceau de nom, et non sur le mot entier
 *
 * « profond » doit trouver « profondeur hors gel ». Ailleurs — la reconnaissance
 * d'un nom dans un texte —, chercher sur un morceau serait faux : « argile » ne
 * se reconnaît pas dans « argileux ». Ici c'est l'inverse : quelqu'un tape ce
 * dont il se souvient, et exiger le mot exact d'un champ de recherche fait une
 * recherche qui ne trouve rien.
 *
 * @returns {object[]|null} `null` si le référentiel n'a pas été lu.
 */
export function formesQuiMentionnent(quoi = "", formes = null) {
  if (!Array.isArray(formes)) return null;

  const cherche = cleDuSujet(texte(quoi));
  if (!cherche) return formes;

  return formes.filter((ligne) =>
    [...nomsDe(ligne?.entrees), ...nomsDe(ligne?.conclusions), cleDuSujet(texte(ligne?.domaine))]
      .some((nom) => nom.includes(cherche)));
}

/**
 * Les domaines du référentiel, et combien de formes chacun porte.
 *
 * Les formes sans domaine ne se rangent pas sous un domaine inventé : elles
 * n'en ont pas, et leur en donner un ferait croire que quelqu'un l'a dit.
 *
 * @returns {{domaine: string, formes: number}[]|null}
 */
export function domainesDuReferentiel(formes = null) {
  if (!Array.isArray(formes)) return null;

  const comptes = new Map();
  for (const ligne of formes) {
    const domaine = cleDuSujet(texte(ligne?.domaine));
    if (!domaine) continue;
    comptes.set(domaine, (comptes.get(domaine) ?? 0) + 1);
  }

  return [...comptes.entries()]
    .map(([domaine, combien]) => ({ domaine, formes: combien }))
    .sort((gauche, droite) =>
      droite.formes - gauche.formes || gauche.domaine.localeCompare(droite.domaine));
}

/**
 * Le versement de cette forme par ce projet — ou `null`.
 *
 * Une signature retirée ne compte pas : elle a été retirée, et afficher
 * « versée » ferait croire que le geste n'a pas été pris.
 */
export function monVersementDeCetteForme(forme = null, {
  formes = null, versements = null
} = {}) {
  const connue = formeDejaConnue(forme, formes);
  if (!connue || !Array.isArray(versements)) return null;

  return versements.find((ligne) =>
    texte(ligne?.form_id) === texte(connue.id) && !texte(ligne?.retire_le)) ?? null;
}
