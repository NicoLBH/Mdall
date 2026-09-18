/**
 * Une valeur que la mémoire ne connaît pas encore, avancée par un point.
 *
 * ## Le cul-de-sac qu'on ouvre
 *
 * La reconnaissance cherche les noms **que la mémoire porte déjà**. Quand elle
 * ne trouve rien, l'écran disait « aucun nom de la mémoire reconnu » et
 * s'arrêtait là. Or c'est précisément le moment le plus intéressant : un sujet
 * qui ne rapproche rien est souvent un sujet qui **apporte** quelque chose.
 *
 * « Profondeur hors gel : l'entreprise annonce 0,60 m » n'accroche rien parce
 * que la mémoire ne sait pas encore ce qu'est une profondeur hors gel. Il
 * faudrait l'y mettre — et l'écran ne proposait aucun chemin pour le faire.
 *
 * ## Ce que le système ne peut pas deviner
 *
 * Il ne peut **pas** repérer tout seul un nom inconnu : reconnaître un nom, c'est
 * le trouver dans la mémoire, et un nom absent de la mémoire est, par
 * construction, introuvable. C'est donc un humain qui le nomme. L'écran ouvre la
 * porte ; il ne remplit rien à sa place.
 *
 * ## Supposée, jamais acquise
 *
 * Ce qu'un sujet ouvert avance n'est pas un fait du projet : c'est ce que
 * quelqu'un dit, et le débat n'est pas tranché. La ligne entre donc en
 * `HYPOTHESE` / `SUPPOSE`, et sa provenance dit d'où elle vient — le sujet, son
 * auteur, sa date.
 *
 * La faire entrer comme acquise ferait exactement l'inverse de ce que ce sujet
 * existe pour faire : elle réglerait le débat en l'ouvrant.
 *
 * ## Elle ne cite pas le sujet comme l'ayant tranchée
 *
 * `reference` porte l'arête **aval** — « cette valeur vient de ce débat-là ». Le
 * débat est ouvert : l'écrire ferait lire la valeur comme tranchée par un sujet
 * qui n'a rien tranché (règle 6). Le lien entre le sujet et sa valeur se fait
 * par l'arête amont, que la reconnaissance propose une fois le nom en mémoire.
 *
 * ## Elle ne verse rien
 *
 * Elle **prépare**. Rien n'entre dans la mémoire sans une proposition signée
 * (règle 1), et ce fichier ne parle pas à la base.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'il manque pour pouvoir proposer, nommé. */
export const MANQUE = {
  NOM: "nom",
  VALEUR: "valeur"
};

/**
 * Ce qu'on dit d'un manque.
 *
 * Jamais « champ obligatoire » : chaque phrase dit **pourquoi**, parce qu'un
 * refus qu'on ne comprend pas se contourne au lieu de se corriger.
 */
export const MANQUES_DITS = {
  [MANQUE.NOM]: "sans nom, la valeur ne se retrouvera jamais dans la mémoire",
  [MANQUE.VALEUR]: "sans valeur, il n'y a rien à retenir — seulement un nom"
};

/**
 * Ce qui manque pour proposer cette valeur.
 *
 * Les deux sont exigés, et pour deux raisons différentes : un nom sans valeur
 * n'apprend rien, une valeur sans nom ne se retrouve pas. Le reste est
 * facultatif — forcer un motif ferait écrire des motifs inventés pour passer
 * l'écran, et un motif fabriqué est pire qu'un motif absent (règle 5).
 */
export function cequiManquePourProposer({ sujet = "", valeur = "" } = {}) {
  const manque = [];
  if (!texte(sujet)) manque.push(MANQUE.NOM);
  if (!texte(valeur)) manque.push(MANQUE.VALEUR);

  return manque;
}

/** Ce qui manque, en une phrase. Vide quand rien ne manque. */
export function phraseDeCeQuiManque(manque = []) {
  const dits = (Array.isArray(manque) ? manque : []).map((quoi) => MANQUES_DITS[quoi]).filter(Boolean);
  return dits.length ? `${dits.join(" ; ")}.` : "";
}

/**
 * La ligne à proposer pour cette valeur — vide s'il manque quelque chose.
 *
 * Une seule ligne : une valeur avancée est une valeur, pas une décision. Le jour
 * où le sujet se ferme, la décision viendra s'écrire à côté et la remplacera —
 * c'est déjà ce que fait `decision-versement.js`, et lui seul.
 *
 * @param {object} options
 * @param {string} options.sujet le nom de la valeur, tel qu'il vivra dans la mémoire
 * @param {string} options.valeur ce qu'elle vaut
 * @param {object} [options.point] le sujet d'où elle vient
 * @param {string} [options.par] qui l'avance
 * @param {string} [options.quand] à quelle date, déjà mise en forme
 * @param {string} [options.pourquoi] d'où elle sort — libre, facultatif
 * @param {string[]} [options.zones] sur quelle partie de l'ouvrage
 */
export function valeurVersableDepuisUnPoint({
  sujet = "", valeur = "", point = null, par = "", quand = "", pourquoi = "", zones = []
} = {}) {
  if (cequiManquePourProposer({ sujet, valeur }).length) return [];

  const intitule = texte(point?.title) || texte(point?.titre);
  const atelier = intitule ? `Sujet « ${intitule} »` : "Sujet";

  return [{
    sujet: texte(sujet),
    valeur: texte(valeur),
    // Ce que quelqu'un avance dans un débat ouvert n'est pas acquis. Le dire
    // acquis réglerait le débat en l'ouvrant.
    nature: NATURE.HYPOTHESE,
    statut: STATUT.SUPPOSE,
    provenance: {
      type: PROVENANCE.HYPOTHESE,
      quoi: intitule ? `avancée dans le sujet « ${intitule} »` : "avancée dans un sujet",
      par: texte(par),
      le: texte(quand)
    },
    // Ce que l'humain a bien voulu dire de l'origine. Vide plutôt qu'inventé :
    // l'histoire de la valeur nommera le trou (règle 5).
    citation: texte(pourquoi),
    zones: Array.isArray(zones) ? zones : [],
    atelier
  }];
}

/**
 * Le titre de la proposition qu'on ouvre.
 *
 * Il dit **quoi** et **d'où**, parce que c'est une ligne de liste qu'on relira
 * sans contexte, six mois plus tard, dans le tableau des propositions.
 */
export function titreDeLaProposition({ sujet = "", valeur = "" } = {}) {
  const nom = texte(sujet);
  const dite = texte(valeur);
  if (!nom || !dite) return "";

  return `Valeur avancée — ${nom} = ${dite}`;
}
