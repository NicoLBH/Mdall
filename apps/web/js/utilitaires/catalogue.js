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
import { PRODUIT } from "./vocabulaire.js";

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
  EXTRACTION_AVIS_RAPPORTS_SOCOTEC_V1
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
