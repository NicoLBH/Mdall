/**
 * Le catalogue des utilitaires : qui déduit quoi, et dans quelle version.
 *
 * Un utilitaire est une **fonction de déduction nommée et versionnée**. Il lit
 * des données de base — une commune, une altitude, une réponse d'API — et rend
 * une contrainte. Rien de plus : il ne parle ni à la base, ni à l'écran.
 *
 * ## Pourquoi une version, et pourquoi elle se lit sur la contrainte
 *
 * Une règle déduite n'est vraie que selon la méthode qui l'a déduite. Le jour
 * où la méthode change — un zonage révisé, une lecture d'API corrigée, une
 * formule amendée — la valeur change sans que rien du projet n'ait bougé. Sans
 * la version inscrite sur la contrainte, on ne saurait pas laquelle des deux
 * situations on regarde : le site a changé, ou notre façon de le lire.
 *
 * C'est pourquoi la contrainte cite son utilitaire **et** sa version, et
 * pourquoi `v2` périme ce que `v1` avait versé au lieu de le réécrire : on doit
 * pouvoir lire « le projet a cru A2 pendant six mois, selon la v1 » — sans quoi
 * un calcul fait à l'époque devient incompréhensible.
 *
 * ## Un fichier par utilitaire, et un nom qui se lit
 *
 * `deduction_zone_sismique_georisques_V1` dit ce qu'il fait, sur quoi, d'après
 * quelle source, dans quelle version. Il y en aura beaucoup : un nom qui
 * demande d'ouvrir le fichier pour savoir ce qu'il fait est un nom raté.
 *
 * Monter une version, c'est **ajouter un fichier**, pas modifier celui qui
 * existe. Le `V1` doit continuer de rendre ce qu'il rendait, faute de quoi
 * l'histoire qu'on vient de conserver ment.
 */

import { DEDUCTION_ZONE_NEIGE_COMMUNE_V1 } from "./deduction_zone_neige_commune_V1.js";
import { DEDUCTION_ZONE_VENT_COMMUNE_V1 } from "./deduction_zone_vent_commune_V1.js";
import { DEDUCTION_PROFONDEUR_HORS_GEL_ALTITUDE_V1 } from "./deduction_profondeur_hors_gel_altitude_V1.js";
import { DEDUCTION_ZONE_SISMIQUE_GEORISQUES_V1 } from "./deduction_zone_sismique_georisques_V1.js";
import { DEDUCTION_RETRAIT_GONFLEMENT_ARGILES_GEORISQUES_V1 } from "./deduction_retrait_gonflement_argiles_georisques_V1.js";
import { EXTRACTION_AVIS_RAPPORTS_SOCOTEC_V1 } from "./extraction_avis_rapports_socotec_V1.js";
import { DIMENSIONNEMENT_FONDATIONS_SUPERFICIELLES_V1 } from "./dimensionnement_fondations_superficielles_V1.js";
import { PRODUIT } from "./vocabulaire.js";
import { AGENTS_CLIMATIQUES } from "./agents-climatiques.js";
import { AGENT_D_SPECTRE_ELASTIQUE_EC8_V1 } from "./agent-spectre.js";
import { AGENTS_RISQUES_NATURELS } from "./agent-risques-naturels.js";
import { cleDuSujet } from "../services/memoire-identifiants.js";

export { PRODUIT };

/**
 * Tous les utilitaires connus, dans l'ordre où on les lit.
 *
 * L'ordre est celui du métier — climat, sol, sismique — puis les extractions.
 * Un catalogue trié par nom de fichier n'aurait aucun sens pour un lecteur.
 */
export const UTILITAIRES = [
  DEDUCTION_ZONE_NEIGE_COMMUNE_V1,
  DEDUCTION_ZONE_VENT_COMMUNE_V1,
  DEDUCTION_PROFONDEUR_HORS_GEL_ALTITUDE_V1,
  DEDUCTION_ZONE_SISMIQUE_GEORISQUES_V1,
  DEDUCTION_RETRAIT_GONFLEMENT_ARGILES_GEORISQUES_V1,
  EXTRACTION_AVIS_RAPPORTS_SOCOTEC_V1,
  // En dernier, et à part : sa loi ne s'écrit pas. Voir `LOI.SECRETE` et
  // `docs/fondamentaux.md`, règle 9.
  DIMENSIONNEMENT_FONDATIONS_SUPERFICIELLES_V1
];

function texte(value) {
  return String(value ?? "").trim();
}

/** L'identifiant complet d'un utilitaire : son nom et sa version, en un mot. */
export function referenceOf(utilitaire = {}) {
  const nom = texte(utilitaire.nom);
  const version = texte(utilitaire.version);
  if (!nom) return "";
  return version ? `${nom}_${version}` : nom;
}

/** Un utilitaire par sa référence complète, ou `null`. Rien n'est approché. */
export function utilitaireByReference(reference = "") {
  const cle = texte(reference);
  return UTILITAIRES.find((outil) => referenceOf(outil) === cle) ?? null;
}

/**
 * Ce que le catalogue déclare d'un sujet, quel que soit l'utilitaire qui le porte.
 *
 * ## Pourquoi par le sujet, et pas par l'utilitaire
 *
 * Une affirmation cite l'agent qui l'a produite — quand elle en a un. Le
 * tableau d'entrée d'une fonction native, lui, est **saisi dans l'Atelier** : il
 * ne cite personne, et pourtant un utilitaire déclare exactement ce qu'il
 * contient, dans son `lit`. Sans cette recherche, la déclaration existerait sans
 * que rien ne puisse la retrouver.
 *
 * Deux utilitaires qui déclareraient le même sujet sont un désaccord à trancher,
 * pas un cas à gérer : le premier du catalogue répond, et l'ordre du catalogue
 * est celui du métier.
 *
 * @returns {{sujet: string, quoi: string, utilisation: string, structure: object[]|null,
 *            utilitaire: object} | null}
 */
export function declarationDuSujet(sujet = "") {
  const cherche = cleDuSujet(sujet);
  if (!cherche) return null;

  // Les agents d'abord : ce qu'ils lisent est l'**entrée** d'une chaîne, et
  // c'est ce qu'un lecteur cherche en premier. Un sujet déclaré des deux côtés
  // serait un désaccord à trancher, pas un cas à gérer.
  for (const porteur of [...AGENTS, ...UTILITAIRES]) {
    const declarations = [...(Array.isArray(porteur.lit) ? porteur.lit : []), porteur.rend].filter(Boolean);
    const trouvee = declarations.find((declaration) => cleDuSujet(declaration?.sujet) === cherche);
    if (!trouvee) continue;

    return {
      sujet: texte(trouvee.sujet),
      quoi: texte(trouvee.quoi),
      utilisation: texte(trouvee.utilisation),
      structure: Array.isArray(trouvee.structure) && trouvee.structure.length ? trouvee.structure : null,
      utilitaire: porteur
    };
  }

  return null;
}

/**
 * Les agents-D déclarés, dans l'ordre où la chaîne les traverse.
 *
 * Un **agent** n'est pas un agent : c'est un appel au serveur, et il pose
 * en général plusieurs sujets d'un coup. L'utilitaire, lui, est la **lecture**
 * d'un de ces sujets — son fichier, sa version, sa source. Les deux existent, et
 * les confondre reviendrait soit à perdre l'appel — c'est ce qui se passait —,
 * soit à ne plus pouvoir monter la version d'un seul zonage.
 */
// L'ordre est celui de la chaîne : le site d'abord — climat, puis risques —,
// et le spectre en dernier, parce qu'il lit ce que les autres ont posé.
export const AGENTS = [
  ...AGENTS_CLIMATIQUES,
  ...AGENTS_RISQUES_NATURELS,
  AGENT_D_SPECTRE_ELASTIQUE_EC8_V1
];

/** Un agent par sa référence complète, ou `null`. Rien n'est approché. */
export function agentByReference(reference = "") {
  const cle = texte(reference);
  return AGENTS.find((agent) => referenceOf(agent) === cle) ?? null;
}

/**
 * Ce qu'un agent pose, sortie par sortie, dans l'ordre où il les déclare.
 *
 * Une sortie qui renvoie à un outil — `{ outil: "snow" }` — est **résolue par le
 * catalogue** : son sujet, sa source et sa version viennent de l'utilitaire qui
 * la déduit, jamais d'une copie faite dans l'agent. Le jour où un zonage change
 * de nom, il n'y a qu'un fichier à toucher (règle 4).
 *
 * Une sortie déclarée en entier — le H0 de la table départementale — se rend
 * telle quelle : aucun utilitaire ne la déduit, le serveur la donne.
 *
 * @returns {{sujet: string, cle: string, quoi: string, utilitaire: object|null,
 *            decimales: number|null, unite: string}[]}
 */
export function sortiesDeLAgent(agent = null) {
  const dites = Array.isArray(agent?.rend) ? agent.rend : [];

  return dites.map((sortie) => {
    // `outil` dit **dans quel résultat** la valeur se lit — c'est la clé que le
    // serveur connaît. La sortie prend le sujet de l'utilitaire de cet outil,
    // sauf si elle déclare le sien : le H0 se lit dans le résultat du gel, mais
    // ce n'est pas la cote hors gel.
    const cleOutil = texte(sortie?.outil);
    const propre = texte(sortie?.sujet);
    const outil = propre
      ? null
      : UTILITAIRES.find((candidat) => texte(candidat?.rejeu?.outil) === cleOutil) ?? null;

    return {
      sujet: propre || texte(outil?.sujet),
      outil: cleOutil,
      // Le champ du résultat de l'outil où cette valeur se lit. **Toujours
      // déclaré** : la clé du fait de contexte que porte l'utilitaire
      // (`frost_depth`) n'est pas celle du résultat (`frost_depth_m`), et
      // retomber sur elle lirait un champ absent sans le dire.
      cle: texte(sortie?.cle),
      quoi: texte(sortie?.quoi),
      utilisation: texte(sortie?.utilisation),
      decimales: Number.isFinite(Number(sortie?.decimales)) ? Number(sortie.decimales) : null,
      unite: texte(sortie?.unite),
      // Une sortie peut être une **ligne** plutôt qu'une valeur : le spectre en
      // est une, huit colonnes qui décrivent une seule courbe. Sa forme est
      // déclarée, comme celle du tableau des massifs.
      tableau: sortie?.tableau === true,
      structure: Array.isArray(sortie?.structure) && sortie.structure.length ? sortie.structure : null,
      utilitaire: outil
    };
  }).filter((sortie) => sortie.sujet);
}

/**
 * L'agent qui pose ce sujet, ou `null`.
 *
 * C'est par là qu'une valeur remonte à l'appel qui l'a produite, et de l'appel à
 * ce qu'il a lu. Sans ce lien, une zone de neige ne dit pas d'où elle vient.
 */
export function agentDuSujet(sujet = "") {
  const cherche = cleDuSujet(sujet);
  if (!cherche) return null;
  return AGENTS.find((agent) =>
    sortiesDeLAgent(agent).some((sortie) => cleDuSujet(sortie.sujet) === cherche)) ?? null;
}

/**
 * Les utilitaires qui déduisent une contrainte, dans l'ordre du catalogue.
 *
 * C'est cette liste que le versement parcourt : ajouter une déduction, c'est
 * ajouter un fichier et une ligne au catalogue, rien d'autre.
 */
export function deductionsDeContrainte() {
  return UTILITAIRES.filter((outil) => outil.produit === PRODUIT.CONTRAINTE);
}

/**
 * La version la plus récente d'une même lignée d'utilitaires.
 *
 * La lignée est le nom sans la version : `deduction_zone_neige_commune`. C'est
 * elle qui dit que la `V2` remplace la `V1` — deux utilitaires de lignées
 * différentes sur un même sujet resteraient deux règles concurrentes, ce qui est
 * un autre problème, et il se voit à l'écran plutôt que de se résoudre ici.
 */
export function derniereVersion(lignee = "") {
  const cle = texte(lignee);
  const candidats = UTILITAIRES.filter((outil) => texte(outil.nom) === cle);
  if (candidats.length === 0) return null;

  return candidats.slice().sort((gauche, droite) => numeroDeVersion(droite) - numeroDeVersion(gauche))[0];
}

/**
 * Le numéro d'une version, pour comparer `V2` à `V10`.
 *
 * Comparer les textes rendrait `V10` antérieur à `V2`, et une montée de version
 * passerait pour un retour en arrière — silencieusement.
 */
export function numeroDeVersion(utilitaire = {}) {
  const brut = texte(utilitaire.version).replace(/^V/i, "");
  const numero = Number.parseInt(brut, 10);
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Ce qu'on affiche sous une contrainte pour dire d'où elle vient.
 *
 * La source d'abord — c'est elle qu'on va vérifier — puis l'utilitaire et sa
 * version, qui disent comment on l'a lue.
 */
export function describeProvenance(utilitaire = null) {
  if (!utilitaire) return "";
  const source = texte(utilitaire.source);
  const reference = referenceOf(utilitaire);
  if (!reference) return "";
  return source ? `${source} · ${reference}` : reference;
}
