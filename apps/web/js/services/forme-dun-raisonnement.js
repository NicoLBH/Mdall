/**
 * Ce qu'un raisonnement peut emporter hors de son projet — et rien d'autre.
 *
 * ## Ce qui se capitalise vraiment
 *
 * Deux projets ne partagent jamais leurs valeurs. Ils partagent leurs **formes
 * de raisonnement** : « de l'altitude et de la nature du sol, on tire une
 * profondeur hors gel ». Cette forme se retrouve sur cent chantiers, elle
 * s'apprend, et c'est elle qui vaut d'être mise en commun.
 *
 * ## La frontière est nette, et elle est mécanique
 *
 * **Les noms voyagent. Les valeurs, jamais.** « Altitude » est le vocabulaire du
 * métier ; « 742,30 » est ce projet-ci. La ligne ne se discute pas au cas par
 * cas — elle est dans la structure même de ce fichier, qui ne lit que des noms.
 *
 * Et **la question ne voyage pas non plus**. « Quelle profondeur hors gel au
 * bâtiment A du collège de Montholon ? » est du texte libre : il porte des lieux,
 * des ouvrages, parfois des personnes. C'est la chose la plus tentante à emporter
 * — elle se lit si bien — et la plus dangereuse.
 *
 * ## Ce qu'aucune règle ne peut garantir
 *
 * Un nom **peut** être propre à un projet : « Hauteur sous plafond du bureau de
 * la directrice » est un nom, et il ne doit pas sortir. Aucune règle mécanique ne
 * distingue cela d'un nom de métier.
 *
 * Ce fichier ne prétend donc pas décider seul. Il **prépare une forme et la
 * montre en entier**, pour qu'un humain voie exactement ce qui partirait avant
 * que quoi que ce soit parte (règle 1, appliquée à la sortie du projet). Les
 * refus ci-dessous ne sont pas la sécurité : ils allègent le travail de celui
 * qui signe.
 *
 * ## Les refus qu'on sait tenir
 *
 * **Un nom qui est une partie de l'ouvrage.** « Bâtiment A », « Pignon nord » :
 * ce sont les zones du projet, et elles ne veulent rien dire ailleurs.
 *
 * **Un nom qui est une valeur du projet.** Il désignerait ici ce qu'il vaut
 * là-bas, et la confusion voyagerait avec lui.
 *
 * **Une forme sans entrée ou sans conclusion.** Elle n'apprend rien : « on est
 * parti de rien » et « on n'a rien conclu » ne se réutilisent pas.
 *
 * Et le refus porte sur **la forme entière**, jamais sur le seul nom fautif :
 * retirer un nom en silence donnerait une forme qui n'a jamais existé.
 *
 * ## Il est pur
 *
 * Il reçoit un raisonnement et la mémoire de son projet, et rend une lecture.
 * Il ne parle à rien, n'écrit nulle part, et c'est ce qui permet de l'exécuter
 * et de regarder exactement ce qui sort.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { zonesLisibles } from "./memoire-blame.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi une forme ne peut pas voyager. */
export const REFUS = {
  SANS_ENTREE: "sans-entree",
  SANS_CONCLUSION: "sans-conclusion",
  NOM_DE_LOUVRAGE: "nom-de-louvrage",
  NOM_QUI_EST_UNE_VALEUR: "nom-qui-est-une-valeur"
};

/**
 * Ce qu'on dit d'un refus.
 *
 * Chaque phrase dit **ce qui bloque**, pour qu'on sache quoi regarder. « Forme
 * non exportable » n'apprend rien ; « un de ses noms est une partie de
 * l'ouvrage » se vérifie d'un coup d'œil.
 */
export const REFUS_DITS = {
  [REFUS.SANS_ENTREE]: "on ne sait pas de quoi ce raisonnement est parti",
  [REFUS.SANS_CONCLUSION]: "ce raisonnement n'a rien posé dans la mémoire",
  [REFUS.NOM_DE_LOUVRAGE]: "un de ses noms est une partie de l'ouvrage, et ne veut rien dire ailleurs",
  [REFUS.NOM_QUI_EST_UNE_VALEUR]: "un de ses noms est une valeur de ce projet"
};

/** Les noms d'une liste de `{sujet}`, repliés comme la mémoire les replie. */
function nomsDe(entrees = []) {
  const vus = new Set();
  for (const entree of Array.isArray(entrees) ? entrees : []) {
    const nom = cleDuSujet(texte(entree?.sujet));
    if (nom) vus.add(nom);
  }
  return [...vus].sort();
}

/** Les parties de l'ouvrage que ce projet nomme, repliées. */
function ouvragesDuProjet(assertions = []) {
  const vus = new Set();
  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    for (const zone of zonesLisibles(assertion)) {
      const cle = cleDuSujet(zone);
      if (cle) vus.add(cle);
    }
  }
  return vus;
}

/** Les valeurs en vigueur de ce projet, repliées. */
function valeursDuProjet(assertions = []) {
  const vus = new Set();
  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (texte(assertion?.superseded_by)) continue;

    const cle = cleDuSujet(texte(assertion?.payload?.value));
    if (cle) vus.add(cle);
  }
  return vus;
}

/**
 * Ce qui empêche cette forme de sortir du projet — vide quand rien n'empêche.
 *
 * Nommés et non rédigés : c'est l'écran qui écrit la phrase.
 */
export function pourquoiElleNeVoyagePas(raisonnement = null, { assertions = [] } = {}) {
  const entrees = nomsDe(raisonnement?.porteSur);
  const conclusions = nomsDe(raisonnement?.produit);

  const refus = [];
  if (!entrees.length) refus.push(REFUS.SANS_ENTREE);
  if (!conclusions.length) refus.push(REFUS.SANS_CONCLUSION);

  const tous = [...entrees, ...conclusions];
  const ouvrages = ouvragesDuProjet(assertions);
  const valeurs = valeursDuProjet(assertions);

  if (tous.some((nom) => ouvrages.has(nom))) refus.push(REFUS.NOM_DE_LOUVRAGE);
  if (tous.some((nom) => valeurs.has(nom))) refus.push(REFUS.NOM_QUI_EST_UNE_VALEUR);

  return refus;
}

/** Les refus, en une phrase. Vide quand la forme peut voyager. */
export function phraseDesRefus(refus = []) {
  const dits = (Array.isArray(refus) ? refus : []).map((quoi) => REFUS_DITS[quoi]).filter(Boolean);
  if (!dits.length) return "";

  return `Cette forme ne peut pas sortir du projet : ${dits.join(" ; ")}.`;
}

/**
 * La forme d'un raisonnement, telle qu'elle partirait — ou `null`.
 *
 * **Tout ce qui sort est là, et rien d'autre n'y est.** C'est la propriété qu'on
 * vient vérifier en la lisant : pas de valeur, pas de portée, pas de question,
 * pas de date, pas de nom de personne, pas d'identifiant de projet.
 *
 * L'**empreinte** est lisible plutôt que chiffrée : elle se compare d'un projet
 * à l'autre, et elle se relit. Une empreinte qu'on ne sait pas lire est une
 * empreinte qu'on ne sait pas vérifier.
 *
 * @param {object} assertion la ligne de raisonnement
 * @param {object} options
 * @param {object[]} [options.assertions] la mémoire du projet, pour les refus
 * @returns {{entrees: string[], conclusions: string[], domaine: string, empreinte: string}|null}
 */
export function formeDunRaisonnement(assertion = null, { assertions = [] } = {}) {
  const raisonnement = assertion?.payload?.raisonnement ?? null;
  if (!raisonnement) return null;
  if (pourquoiElleNeVoyagePas(raisonnement, { assertions }).length) return null;

  const entrees = nomsDe(raisonnement.porteSur);
  const conclusions = nomsDe(raisonnement.produit);

  return {
    entrees,
    conclusions,
    // Le domaine est du vocabulaire de métier — « gros-oeuvre », « incendie ».
    // Il vient de la charge et jamais du texte : il n'y a rien de ce projet
    // dedans, et il permet de ranger les formes sans les lire.
    domaine: cleDuSujet(texte(assertion?.payload?.domain) || texte(assertion?.domain)),
    empreinte: `${entrees.join(" + ")} > ${conclusions.join(" + ")}`
  };
}

/**
 * La forme, en une phrase qu'on relit avant de signer.
 *
 * Elle écrit **exactement** ce qui partirait. Une phrase qui résumerait ferait
 * signer autre chose que ce qui part.
 *
 * Et elle se passe d'articles : « de l'altitude », « du sol », « de la nature du
 * sol » demanderaient de connaître le genre de chaque nom. Les deviner les
 * écrirait faux une fois sur trois, et les tirer d'une liste ferait de ce
 * fichier un dictionnaire à tenir à jour. Les noms se posent donc tels que la
 * mémoire les a, et la phrase se construit autour.
 */
export function phraseDeLaForme(forme = null) {
  if (!forme) return "";

  return `${forme.entrees.join(" et ")} donnent ${forme.conclusions.join(" et ")}.`;
}
