/**
 * Ce que la Mémoire montre, tous filtres appliqués — **une seule fois**.
 *
 * ## Pourquoi ce fichier existe
 *
 * L'écran filtrait déjà en un seul endroit, et il avait raison : la recherche
 * avait un jour redessiné la liste avec ses propres critères, en oubliant la
 * nature, le domaine et « à revérifier ». Taper une lettre faisait réapparaître
 * ce qu'on venait d'écarter.
 *
 * Le cerveau, lui, n'a jamais rien su de tout cela. Il recevait la mémoire
 * **entière** — pas la sélection, pas même le calque d'une variante — pendant
 * que le tableau juste derrière n'en montrait que douze lignes. Deux rendus,
 * deux contenus, et rien à l'écran pour dire lequel disait vrai. C'est la
 * règle 4 sur ce qu'on regarde plutôt que sur ce qu'on écrit : *un seul état de
 * filtrage, deux rendus.*
 *
 * D'où ce fichier : la sélection s'écrit ici, une fois, et les deux la lisent.
 *
 * ## Ce qui est **dans** la sélection, et ce qui n'y est pas
 *
 * La requête est la seule mémoire du filtrage — `nature:`, `domaine:`,
 * `provenance:`, `etat:`, `ouverts:`, `remplacees:`, plus le texte libre. Le
 * rail de gauche n'est pas un second état : il **écrit** dans la requête, et il
 * se rallume en la relisant. C'est ce qui a permis d'y brancher le cerveau sans
 * rien inventer.
 *
 * « À revérifier » s'applique **par-dessus** : c'est une urgence, pas une
 * catégorie.
 *
 * Le calque d'une variante n'est **pas** ici. Il se pose avant, sur la liste
 * qu'on donne en entrée : le tableau lit une mémoire avec variante, le cerveau
 * lit la mémoire réelle, et chacun passe la sienne. Mêler les deux ferait
 * dessiner un cerveau d'un projet qui n'existe pas.
 */

import { filterByTaxonomy } from "./assertion-taxonomy.js";
import { READER, readerRows } from "./memory-readers.js";
import { parseQuery } from "./query-bar.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * La sélection, à partir d'une liste et d'une requête.
 *
 * @param {object[]} assertions ce qu'on filtre — avec ou sans calque, au choix
 *   de l'appelant
 * @param {object} options
 * @param {string} [options.query] la requête, telle qu'elle est tapée
 * @param {object[]} [options.champs] le vocabulaire des `champ:valeur` reconnus
 * @param {object} [options.etats] la table `etat:` → statut de la mémoire
 * @param {Function} [options.chercher] la recherche plein texte, injectée parce
 *   qu'elle vit avec la mémoire et non avec le filtrage
 * @param {Function} [options.aRevoir] « à revérifier », injectée pour la même raison
 * @param {boolean} [options.pending] cocher « à revérifier »
 * @returns {object[]}
 */
export function selectionDeLaMemoire(assertions = [], {
  query = "",
  champs = [],
  etats = {},
  chercher = null,
  aRevoir = null,
  pending = false
} = {}) {
  const lignes = Array.isArray(assertions) ? assertions : [];
  const { filters, text } = parseQuery(query, champs);

  // Les constats en cours ne se disent pas par une nature : c'est un constat
  // qu'aucune levée n'a fermé. Ce filtre-là s'applique donc à part.
  let depart = filters.ouverts === "oui" ? readerRows(lignes, READER.FINDINGS) : lignes;

  // **Une règle ne se dit pas par une nature** : elle n'en a pas. Ce filtre-là
  // s'applique donc à part, comme celui des constats en cours — et sans lui,
  // une fonction versée n'apparaissait sous aucune lecture du rail.
  if (filters.regle === "oui") depart = readerRows(depart, READER.RULES);

  const cherchees = typeof chercher === "function"
    ? chercher(depart, {
        query: text,
        kind: filters.provenance ?? "",
        status: etats[filters.etat] ?? "",
        includeSuperseded: filters.remplacees === "oui"
      })
    : depart;

  const filtrees = filterByTaxonomy(cherchees, {
    nature: filters.nature ?? "",
    domain: filters.domaine ?? ""
  });

  // « À revérifier » se coche par-dessus les autres filtres : c'est une urgence,
  // pas une catégorie.
  return pending && typeof aRevoir === "function" ? aRevoir(filtrees) : filtrees;
}

/**
 * Vrai si la requête restreint quelque chose.
 *
 * Sert à savoir s'il faut **dire** ce qu'on regarde. Montrer un cerveau de
 * douze nœuds sans prévenir qu'un filtre est posé ferait croire à un projet de
 * douze affirmations — et l'on chercherait longtemps ce qui manque.
 */
export function laRequeteRestreint(query = "", champs = []) {
  const { filters, text } = parseQuery(query, champs);
  return Boolean(texte(text)) || Object.keys(filters).length > 0;
}
