/**
 * Ce qu'une étude climatique propose à la mémoire du projet.
 *
 * ## Elle ne verse rien
 *
 * Comme partout : **rien n'entre jamais directement dans la mémoire du projet**
 * (`docs/fondamentaux.md`, règle 1). Ce fichier construit les lignes ; c'est une
 * proposition qui les fait entrer, et quelqu'un la signe.
 *
 * ## Ce qui manquait, et que ces lignes referment
 *
 * L'écran versait cinq valeurs, chacune seule. Aucune ne disait par quel appel
 * elle avait été obtenue, ni à partir de quelle commune, ni comment la refaire.
 * Résultat : le raisonnement climatique s'arrêtait à sa première ligne, et une
 * variante d'altitude rangeait tout ce qui en découlait « à revérifier » —
 * c'est-à-dire qu'elle rendait la main là où elle devait calculer.
 *
 * On verse donc, comme pour les fondations, ce qu'il faut pour **refaire** :
 *
 * | ce que c'est | où cela va | pourquoi |
 * | --- | --- | --- |
 * | **la localisation** — commune, INSEE, code postal | `donnees-de-base.ddb` | c'est l'entrée de toute la chaîne |
 * | **l'altitude** | `donnees-de-base.ddb` | second terme de la formule du hors gel |
 * | **les deux appels** — agent, version, ce qu'ils ont lu | `*.ref` | c'est le raisonnement |
 * | **les zones et la cote** | `*.ctr` | c'est ce que le projet retient |
 *
 * ## Deux appels, et non un
 *
 * Les zonages ne lisent qu'une commune ; la cote hors gel lit une altitude. Les
 * verser sous un seul appel ferait rejouer les tables communales à chaque mètre
 * d'altitude essayé, et l'écran de variante montrerait une dépendance qui
 * n'existe pas. Voir `utilitaires/agents-climatiques.js`.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT, AGENT } from "./memoire-en-texte.js";
import { AGENTS_CLIMATIQUES, SUJET_ALTITUDE, SUJET_LOCALISATION } from "../utilitaires/agents-climatiques.js";
import {
  altitudeVersable,
  ligneDeLaLocalisation,
  localisationVersable,
  phraseDeLaLocalisation
} from "./localisation-versement.js";
import { referenceOf, sortiesDeLAgent } from "../utilitaires/catalogue.js";
import { mesureEcrite } from "../utilitaires/lecture-fait.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** L'atelier d'où ces lignes viennent. Il s'affiche sur chacune. */
export const ATELIER = "Neige, Vent & Gel";

/**
 * Réexportée : la mémoire n'a qu'une façon d'écrire une mesure.
 *
 * Elle en a eu deux le temps d'une version — une ici, une dans `lecture-fait.js`
 * —, ce qui est exactement ce que la règle 4 interdit : « 2.59 m » et « 2,59 m »
 * sont la même cote écrite de deux façons, et deux écritures ne se comparent
 * plus. L'écran climatique l'emploie sous ce nom-là.
 */
export { mesureEcrite as mesure };

/**
 * La localisation et l'altitude ne se construisent **pas ici**.
 *
 * Deux écrans les posent — les Paramètres, où le projet dit où il est, et cet
 * atelier, qui les corrige pour un calcul. Si chacun bâtissait sa ligne, les
 * deux finiraient par ne plus décrire la même chose (règle 4). Elles sont donc
 * réexportées telles quelles depuis `localisation-versement.js` : l'écran
 * climatique les emploie sans avoir à savoir d'où elles viennent.
 */
export { ligneDeLaLocalisation, localisationVersable, phraseDeLaLocalisation, altitudeVersable };

/**
 * Ce qu'un agent a lu du projet, avec la valeur lue.
 *
 * À la date de l'appel, et non par renvoi au catalogue : le jour où une V2 lira
 * autre chose, cette ligne-ci doit continuer de dire ce que la V1 a lu.
 */
function lecturesDeLAgent(agent, { localisation = null, altitude = "" } = {}) {
  const valeurs = {
    [SUJET_LOCALISATION]: phraseDeLaLocalisation(localisation),
    [SUJET_ALTITUDE]: altitude
  };

  return (Array.isArray(agent?.lit) ? agent.lit : [])
    .map((lue) => ({ sujet: texte(lue?.sujet), valeur: texte(valeurs[texte(lue?.sujet)]) }))
    .filter((lue) => lue.sujet);
}

/**
 * L'appel d'un agent, versé comme la fonction qu'il est.
 *
 * `referentiel: true` le range dans un `.ref` : c'est du raisonnement, pas un
 * fait du projet. Et `agent.genre = agent-D` dit que l'appel est déterministe —
 * mêmes entrées, même sortie —, donc qu'il se rejoue pour vérifier. Un agent-IA
 * ne se rejouerait pas pour ça : sa sortie peut varier à entrées égales, et le
 * rejeu ferait passer une variation du modèle pour un changement du projet.
 */
export function appelVersable(agent, { localisation = null, altitude = "", zone = "", resultats = {} } = {}) {
  const sorties = sortiesDeLAgent(agent);
  // Un appel qui n'a rien rendu ne se verse pas : la ligne dirait qu'un
  // raisonnement a eu lieu là où le serveur n'a pas répondu.
  const posees = sorties.filter((sortie) => texte(valeurDeLaSortie(sortie, resultats)));
  if (!posees.length) return null;

  return {
    sujet: agent.libelle,
    valeur: posees.map((sortie) => sortie.sujet).join(" · "),
    referentiel: true,
    agent: {
      genre: AGENT.D,
      utilitaire: agent.nom,
      version: agent.version,
      lit: (Array.isArray(agent.lit) ? agent.lit : []).map((lue) => texte(lue?.sujet)).filter(Boolean),
      ecrit: posees.map((sortie) => ({ sujet: sortie.sujet }))
    },
    quoi: agent.quoi,
    utilitaire: referenceOf(agent),
    lectures: lecturesDeLAgent(agent, { localisation, altitude }),
    nature: null,
    domaine: agent.domaine,
    provenance: { type: PROVENANCE.CALCUL, quoi: `${agent.libelle} — ${referenceOf(agent)}` },
    source: agent.source,
    reference: `agent:${referenceOf(agent)}`,
    zones: texte(zone) ? [texte(zone)] : [],
    atelier: ATELIER
  };
}

/**
 * La valeur d'une sortie, lue dans ce que le serveur a rendu.
 *
 * `resultats` est ce que l'écran a reçu, par clé d'outil. **Les deux clés sont
 * déclarées** : celle de l'outil dit dans quel résultat lire, celle du fait —
 * `snow_zone`, `frost_depth_m`, `h0_selected_m` — dit quoi y lire. Les deviner
 * du nom du sujet serait une machine à se tromper en silence.
 */
export function valeurDeLaSortie(sortie, resultats = {}) {
  const brut = resultats?.[sortie.outil];
  const charge = brut?.result_payload ?? brut ?? {};
  const valeur = charge?.[sortie.cle];
  if (valeur === null || valeur === undefined || texte(valeur) === "") return "";
  return sortie.decimales === null ? texte(valeur) : mesureEcrite(valeur, sortie.decimales, sortie.unite);
}

/**
 * Ce qu'un agent a posé, prêt à être proposé.
 *
 * Chaque ligne cite **son** utilitaire — celui qui la déduit, avec sa version —
 * et non l'agent : c'est ce qui permet de monter la version d'un seul zonage, et
 * c'est ce que le rejeu suit pour refaire cette valeur-là.
 *
 * Une sortie qu'aucun agent ne déduit — le H0 de la table — cite l'agent,
 * faute de mieux, et dit d'où elle vient dans sa provenance.
 */
export function sortiesVersables(agent, { resultats = {}, localisation = null, altitude = "", zone = "" } = {}) {
  const commune = phraseDeLaLocalisation(localisation);

  return sortiesDeLAgent(agent).map((sortie) => {
    const valeur = valeurDeLaSortie(sortie, resultats);
    if (!valeur) return null;

    const outil = sortie.utilitaire;
    // Ce que **cet utilitaire-là** a déclaré lire, avec la valeur qu'il a lue.
    // Un sujet déclaré dont on n'a pas la valeur reste déclaré : c'est le trou
    // du raisonnement, et le taire ferait passer pour complet un calcul qui ne
    // l'était pas (règle 5).
    const lues = {
      [SUJET_LOCALISATION]: texte(localisation?.codeInsee),
      [SUJET_ALTITUDE]: texte(altitude)
    };
    const lectures = (Array.isArray(outil?.lit) ? outil.lit : [])
      .map((lue) => ({ sujet: texte(lue?.sujet), valeur: texte(lues[texte(lue?.sujet)]) }))
      .filter((lue) => lue.sujet);

    return {
      sujet: sortie.sujet,
      valeur,
      // Une zone de neige est **tranchée par un tiers** : un texte la fixe, et le
      // fait qu'elle se déduise de la commune n'en fait pas une supposition — la
      // déduction fait partie de sa définition.
      nature: NATURE.CONTRAINTE,
      domaine: outil?.domaine ?? agent.domaine,
      quoi: sortie.quoi || "",
      source: texte(outil?.source) || agent.source,
      // Elle renvoie à l'appel qui l'a posée, et l'appel dit ce qu'il a lu :
      // c'est par là qu'on remonte jusqu'à la commune.
      provenance: {
        type: PROVENANCE.CALCUL,
        quoi: `${agent.libelle}${commune ? ` — ${commune}` : ""}`
      },
      statut: STATUT.RETENU,
      utilitaire: outil ? referenceOf(outil) : referenceOf(agent),
      lectures,
      reference: `climat:${sortie.cle}`,
      zones: texte(zone) ? [texte(zone)] : [],
      atelier: ATELIER
    };
  }).filter(Boolean);
}

/**
 * Toutes les lignes d'une étude climatique, dans l'ordre où on les lit.
 *
 * L'entrée d'abord, l'appel ensuite, ce qu'il a posé enfin. C'est l'ordre de la
 * chaîne, et c'est celui qu'on veut retrouver dans la proposition : un lecteur
 * qui signe doit voir d'où l'on part avant de voir ce qu'on en conclut.
 */
export function lignesVersables({ localisation = {}, resultats = {}, zone = "" } = {}) {
  const ligne = ligneDeLaLocalisation(localisation);
  const altitude = mesureEcrite(localisation?.altitude, 2, "m");

  const lignes = [
    localisationVersable(localisation, { zone, ou: ATELIER }),
    altitudeVersable(localisation, { zone, ou: ATELIER })
  ];

  for (const agent of AGENTS_CLIMATIQUES) {
    lignes.push(appelVersable(agent, { localisation: ligne, altitude, zone, resultats }));
    lignes.push(...sortiesVersables(agent, { resultats, localisation: ligne, altitude, zone }));
  }

  return lignes.filter(Boolean);
}
