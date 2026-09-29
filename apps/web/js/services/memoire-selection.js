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
 * La requête est la seule mémoire du filtrage — `nature:`, `autorite:`,
 * `forme:`, `rouvre:`, `domaine:`, `provenance:`, `etat:`, `ouverts:`,
 * `fonction:`, `remplacees:`, `zone:`, `seulement:`, plus le texte libre. Le rail de gauche n'est pas
 * un second état : il **écrit** dans la requête, et il se rallume en la
 * relisant. C'est ce qui a permis d'y brancher le cerveau sans rien inventer.
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
import { autoriteDe, formeDe } from "./axes-de-la-memoire.js";
import { ceQueCaRouvre } from "./ce-que-ca-rouvre.js";
import { READER, readerRows } from "./memory-readers.js";
import { parseQuery } from "./query-bar.js";
import {
  ZONE_TOUT_LOUVRAGE, definedZones, filterByZone, filterByZoneSeule
} from "./project-zones.js";
import {
  DOMAINS, NATURES, UNCLASSIFIED_LABEL, domainLabel, natureLabel
} from "./assertion-taxonomy.js";
import { AUTORITES, FORMES, autoriteCourte, formeCourte } from "./axes-de-la-memoire.js";

/**
 * Ce qu'on écrit pour dire « l'ouvrage entier » dans `seulement:`.
 *
 * La clé d'une zone est vide pour l'ouvrage entier, et une valeur vide dans une
 * requête ne se distingue pas d'un filtre absent. Il lui faut donc un mot à
 * elle — et il vit **ici**, avec le filtrage qui le lit, plutôt que dans l'écran
 * qui l'écrit : deux écrans finiraient par en écrire deux (règle 10).
 */
export const ZONE_TOUT_LOUVRAGE_SEUL = "tout-louvrage";

/* ════════════════════════════════════════════════════════════════════════════
 * Le vocabulaire de la barre de recherche
 *
 * Il s'écrit dans la barre, comme sur GitHub : `nature:hypothese
 * domaine:structure neige`. Les filtres et les mots vivent au même endroit, et
 * cet endroit est le champ de saisie — on lit ce qu'on cherche, on le corrige
 * au clavier, on le copie.
 *
 * **Il vit avec le filtrage qui le lit**, et non avec l'écran qui l'affiche :
 * l'écran s'en sert pour peindre la barre, le filtrage pour comprendre ce
 * qu'elle dit, et deux vocabulaires finiraient par ne plus se répondre — la
 * barre proposerait un mot que la sélection ne saurait pas lire (règle 10).
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * Ce qui s'écrit dans la barre pour un libellé.
 *
 * Les accents sont gardés — `nature:donnée-de-base` se lit, là où
 * `nature:donnee-de-base` fait code — mais la frappe reste tolérante : la barre
 * accepte l'un comme l'autre, quelle que soit la casse.
 */
function jeton(label) {
  return String(label ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

const MEMORY_FIELDS = [
  { key: "nature", label: "Nature", values: [
    ...NATURES.map((nature) => ({ value: nature, token: jeton(natureLabel(nature)), label: natureLabel(nature) })),
    { value: "none", token: jeton(UNCLASSIFIED_LABEL), label: UNCLASSIFIED_LABEL }
  ] },
  { key: "domaine", label: "Domaine", values: [
    ...DOMAINS.map((domaine) => ({ value: domaine, token: jeton(domainLabel(domaine)), label: domainLabel(domaine) })),
    { value: "none", token: jeton(UNCLASSIFIED_LABEL), label: UNCLASSIFIED_LABEL }
  ] },
  { key: "provenance", label: "Provenance", values: [
    { value: "avis", label: "Avis" },
    { value: "attachment", token: "rattachements", label: "Rattachements" },
    { value: "document", token: "documents", label: "Documents" }
  ] },
  { key: "etat", label: "État", values: [
    { value: "assumees", token: "assumées", label: "Assumées" },
    { value: "ecartees", token: "écartées", label: "Écartées" }
  ] },
  // Les deux axes que la nature mélangeait, et qui se tapent maintenant chacun
  // pour soi. `autorite:` est ce que la puce de la ligne affiche — une puce qu'on
  // ne peut pas interroger est un cul-de-sac. `forme:` est l'axe de complexité :
  // ce qu'on pose, ce qu'on déduit.
  { key: "autorite", label: "Autorité", values: [
    ...AUTORITES.map((autorite) => ({ value: autorite, token: jeton(autoriteCourte(autorite)), label: autoriteCourte(autorite) }))
  ] },
  { key: "forme", label: "Forme", values: [
    ...FORMES.map((forme) => ({ value: forme, token: jeton(formeCourte(forme)), label: formeCourte(forme) }))
  ] },
  // Une fonction n'est pas une nature : elle a son champ, et il se tape. Le mot
  // de l'écran est « fonction » — celui du langage ; « règle » reste dans le code.
  { key: "fonction", label: "Fonctions", values: [{ value: "oui", label: "Seulement" }] },
  // **Ce que la note met en tête se tape aussi.** Un chiffre qu'on ne peut pas
  // ouvrir est un cul-de-sac : on le lit, on le croit, et l'on ne peut rien en
  // faire. Les deux valeurs partagent la mémoire en deux, sans reste.
  { key: "rouvre", label: "Rouvre", values: [
    { value: "oui", label: "Un choix humain" },
    { value: "non", label: "Rien" }
  ] },
  { key: "ouverts", label: "Constats", values: [{ value: "oui", label: "En cours" }] },
  { key: "remplacees", label: "Remplacées", values: [{ value: "oui", label: "Montrées" }] }
];

/**
 * Les champs de la mémoire, **avec les zones de ce projet**.
 *
 * ## Pourquoi celui-là ne peut pas être une constante
 *
 * Les autres champs sont des listes fixes du langage — les natures, les
 * domaines, les autorités. Les zones, non : chaque chantier découpe son ouvrage
 * comme il veut, et le vocabulaire de la barre doit suivre.
 *
 * ## Pourquoi la zone manquait, alors qu'elle s'affiche
 *
 * Chaque ligne porte sa portée en toutes lettres — « Ensemble — toutes zones »,
 * « Bâtiment A » —, et c'était la seule puce de l'écran qu'on ne pouvait pas
 * interroger. **Une puce qu'on ne peut pas interroger est un cul-de-sac** : on
 * la lit, et l'on ne peut rien en faire.
 *
 * ## Les deux lectures, et elles ne se confondent pas
 *
 * `zone:bâtiment-a` — **ce qui s'applique** au bâtiment A : ce qui y est écrit,
 * **et ce qui vaut pour l'ouvrage entier**. C'est la lecture de tous les jours,
 * et retrancher la hauteur de référence du projet donnerait un bâtiment qui ne
 * porte plus ses propres entrées.
 *
 * `seulement:bâtiment-a` — **ce qui n'est écrit que là**. C'est la question de
 * l'audit : une zone qui ne porte rien en propre n'avait pas besoin d'exister,
 * et une zone qui porte trop cache une règle générale recopiée.
 * `seulement:ensemble` lit l'autre bout : ce qui n'est écrit pour aucune zone.
 *
 * **Rien tant que le projet n'a pas de zone.** Un champ dont aucune valeur n'est
 * connue ferait passer `zone:bâtiment-a` pour une faute de frappe, sur un projet
 * qui n'a simplement pas encore de découpage (règle 5).
 */
export function champsDeLaMemoire(assertions = []) {
  const zones = definedZones(Array.isArray(assertions) ? assertions : []);
  if (!zones.length) return MEMORY_FIELDS;

  const valeurs = zones.map((une) => ({ value: une.key, token: jeton(une.label), label: une.label }));

  return [
    ...MEMORY_FIELDS,
    { key: "zone", label: "Zone", values: valeurs },
    {
      key: "seulement",
      label: "Seulement",
      values: [
        { value: ZONE_TOUT_LOUVRAGE_SEUL, token: "ensemble", label: "Ensemble, et rien qu'elle" },
        ...valeurs
      ]
    }
  ];
}

/**
 * Le vocabulaire de la barre, pour la mémoire qu'on regarde.
 *
 * **Une seule façon de l'obtenir**, parce qu'il change avec le projet : vingt
 * appels qui liraient chacun la constante auraient tous oublié les zones, et
 * `zone:bâtiment-a` se lirait comme une faute de frappe dans dix-neuf d'entre
 * eux (règle 10).
 */


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
  if (filters.fonction === "oui") depart = readerRows(depart, READER.RULES);

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

  // Les deux axes que la nature mélangeait. Ils se filtrent **après** elle et
  // non à sa place : `nature:` reste la colonne de la base, et une requête qui
  // pose les deux — `nature:contrainte autorite:d'un-texte` — doit rendre
  // l'intersection, pas la dernière écrite.
  const parAxe = filtrees.filter((assertion) => {
    if (filters.autorite && autoriteDe(assertion) !== filters.autorite) return false;
    if (filters.forme && formeDe(assertion) !== filters.forme) return false;
    return true;
  });

  /**
   * **Où l'on regarde.** Deux lectures, et elles ne disent pas la même chose.
   *
   * `zone:` demande **ce qui s'applique** à une partie d'ouvrage : ce qui y est
   * écrit, et ce qui vaut pour l'ouvrage entier. C'est la lecture de tous les
   * jours, et c'est déjà ce que le rejeu fait — une zone qui perdrait la hauteur
   * de référence du projet ne porterait plus ses propres entrées.
   *
   * `seulement:` demande **ce qui n'est écrit que là**, qui est la question de
   * l'audit d'un découpage. Les deux passent par `project-zones.js`, où la
   * portée d'une affirmation se décide une fois (règle 10).
   */
  const parZone = filters.zone
    ? filterByZone(parAxe, filters.zone)
    : parAxe;

  const parPortee = filters.seulement
    ? filterByZoneSeule(parZone,
      filters.seulement === ZONE_TOUT_LOUVRAGE_SEUL ? ZONE_TOUT_LOUVRAGE : filters.seulement)
    : parZone;

  /**
   * Ce que la note met en tête, ouvert dans la liste.
   *
   * Calculé sur **la mémoire entière**, jamais sur ce que les filtres ont déjà
   * retenu : ce qu'une valeur rouvre dépend de la chaîne du projet, pas de ce
   * qu'on regarde. Le calculer sur la sélection ferait dire « rien à rouvrir »
   * dès qu'un domaine est coché, et le chiffre de la note ne se retrouverait
   * plus dans la liste qu'il vient d'ouvrir.
   */
  const rouvre = texte(filters.rouvre);
  if (!rouvre) return pending && typeof aRevoir === "function" ? aRevoir(parPortee) : parPortee;

  const rouvert = ceQueCaRouvre(lignes);
  const parRejeu = parPortee.filter(
    (assertion) => rouvert.has(texte(assertion?.id)) === (rouvre === "oui")
  );

  // « À revérifier » se coche par-dessus les autres filtres : c'est une urgence,
  // pas une catégorie.
  return pending && typeof aRevoir === "function" ? aRevoir(parRejeu) : parRejeu;
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
