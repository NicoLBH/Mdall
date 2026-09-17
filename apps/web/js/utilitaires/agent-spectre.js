/**
 * L'agent-D du spectre élastique, et les trois choses qu'il lit du projet.
 *
 * ## Le défaut qu'on ferme
 *
 * L'écran Spectre calculait juste, et **rien n'en sortait**. Ni entrée ni sortie
 * n'entrait dans la mémoire : la classe de sol, la catégorie d'importance et
 * l'amortissement vivaient dans le formulaire du projet ; ag, S, TB, TC, TD se
 * traçaient à l'écran et mouraient avec lui.
 *
 * Trois conséquences, et la troisième est la raison d'être de cette étape :
 *
 * - personne ne pouvait dire, six mois plus tard, **avec quelle classe de sol**
 *   un spectre avait été tracé ;
 * - le spectre ne citait pas la **zone de sismicité** du projet, alors qu'il en
 *   dépend entièrement — la chaîne s'arrêtait là ;
 * - **changer la localisation ne changeait rien.** C'est pourtant la moitié de
 *   la démonstration : déplacer un projet change sa zone sismique, donc son
 *   spectre, donc tout ce qui se dimensionne dessus.
 *
 * ## Où le calcul vit, et pourquoi il y reste
 *
 * Dans `supabase/functions/_shared/utilitaires/seismic-spectrum.js`, **copié au
 * navigateur au moment du build** (`scripts/prepare-utilitaires.mjs`). Un seul
 * fichier, deux exécutions : aucune divergence possible.
 *
 * C'est une exception assumée à « les calculs restent au serveur », et elle a
 * trois raisons :
 *
 * 1. **Sa loi est un décret.** L'Eurocode 8 et son annexe nationale sont
 *    publics ; les cacher ne protégerait rien, contrairement à un
 *    pré-dimensionnement dont la loi *est* le produit (`LOI.SECRETE`).
 * 2. **L'écran la trace.** La courbe se redessine à chaque frappe sur
 *    l'amortissement — un aller-retour réseau par pixel serait absurde.
 * 3. **Le rejeu n'a donc pas de réseau à attendre.** Une variante de zone
 *    sismique recalcule le spectre sur place, immédiatement.
 *
 * Si la décision devait s'inverser un jour, elle ne coûte qu'un déplacement de
 * l'appel : la déclaration ci-dessous ne changerait pas d'une ligne.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
// La zone n'est pas à lui : c'est l'agent des risques naturels qui la pose, et
// c'est là qu'elle se nomme. Elle se redisait ici, et deux écritures d'un même
// nom finissent par ne plus désigner la même chose (règle 10).
import { SUJET_ZONE_SISMIQUE } from "./agent-risques-naturels.js";

/**
 * Ce que le projet est du point de vue du séisme, et qui commande le spectre.
 *
 * Les trois se **saisissent** : aucune ne se déduit de la commune. La zone, si —
 * elle est posée par `deduction_zone_sismique_georisques_V1`, et c'est pour cela
 * qu'elle est lue et non versée ici : deux écrans qui poseraient le même sujet
 * en feraient deux valeurs concurrentes.
 */
export { SUJET_ZONE_SISMIQUE };
export const SUJET_CLASSE_DE_SOL = "Classe de sol EC8";
export const SUJET_CATEGORIE_IMPORTANCE = "Catégorie d'importance de l'ouvrage";
export const SUJET_AMORTISSEMENT = "Amortissement visqueux";

/** Ce que l'appel rend : une ligne, huit colonnes. */
export const SUJET_SPECTRE = "Spectre élastique de calcul";

/**
 * La forme de la ligne de spectre.
 *
 * Huit paramètres qui ne se lisent jamais séparément : ils décrivent **une**
 * courbe, et en isoler un n'a pas de sens pour un ingénieur. C'est donc une
 * ligne à huit colonnes et non huit sujets — mais chacune porte sa clé, si bien
 * qu'une variante peut faire varier `…#S` sans toucher au reste.
 *
 * Chaque `quoi` dit ce que le paramètre **fait**, pas comment il se calcule :
 * la formule est dans le texte, et la répéter ici en ferait deux vérités.
 */
export const STRUCTURE_DU_SPECTRE = [
  { nom: "agr", cle: "agr", type: "nombre, en m/s²",
    quoi: "L'accélération de référence au rocher, donnée par la zone du zonage français. "
      + "C'est la secousse que le territoire impose, avant tout ce que le projet en fait." },
  { nom: "γI", cle: "gammaI", type: "nombre",
    quoi: "Le coefficient d'importance : ce que l'on accepte de perdre. 1 pour un bâtiment "
      + "courant, 1,4 pour un ouvrage qui doit rester debout après la secousse." },
  { nom: "ag", cle: "ag", type: "nombre, en m/s²",
    quoi: "L'accélération de calcul du projet : agr × γI. C'est elle qui entre dans tous les "
      + "calculs de structure." },
  { nom: "η", cle: "eta", type: "nombre",
    quoi: "La correction d'amortissement. Un ouvrage qui dissipe plus que 5 % voit son spectre "
      + "s'abaisser ; η ne descend jamais sous 0,55." },
  { nom: "S", cle: "S", type: "nombre",
    quoi: "Le paramètre de sol : combien le terrain amplifie la secousse. 1 sur le rocher, "
      + "jusqu'à 1,8 sur un sol mou." },
  { nom: "TB", cle: "TB", type: "nombre, en s",
    quoi: "Le début du palier d'accélération constante. En deçà, le spectre monte." },
  { nom: "TC", cle: "TC", type: "nombre, en s",
    quoi: "La fin de ce palier. Au-delà, le spectre décroît — un bâtiment souple est moins "
      + "sollicité qu'un bâtiment raide." },
  { nom: "TD", cle: "TD", type: "nombre, en s",
    quoi: "Le début de la branche à déplacement constant, où la décroissance s'accentue." }
];

/**
 * L'agent-D du spectre élastique.
 *
 * Un seul appel, une seule sortie : il n'y a qu'une courbe. Le découper — un
 * agent pour ag, un pour les périodes — ferait deux lignes de raisonnement pour
 * un seul geste, et l'on ne pourrait plus dire ce qui a été tracé.
 */
export const AGENT_D_SPECTRE_ELASTIQUE_EC8_V1 = {
  nom: "agent_d_spectre_elastique_ec8",
  version: "V1",
  libelle: "Spectre élastique d'après la zone, le sol et l'importance",
  source: "NF EN 1998-1 et son annexe nationale",
  domaine: DOMAIN.STRUCTURE,
  quoi: "Établit le spectre de réponse élastique du projet : l'accélération de calcul, la "
    + "correction d'amortissement, le paramètre de sol et les trois périodes qui décrivent "
    + "la courbe. La loi est celle de l'Eurocode 8 ; elle ne se recopie pas ici.",

  /**
   * L'outil qui exécute — et il ne parle pas au réseau.
   *
   * Voir l'en-tête : le module du spectre est le même des deux côtés, copié au
   * build. `outil` reste déclaré parce que c'est par lui que le rejeu retrouve
   * comment refaire cet appel.
   */
  outils: ["spectre"],

  /**
   * Comment cet appel se refait.
   *
   * **Les agents climatiques n'en déclarent pas**, et ce n'est pas un oubli :
   * chacune de leurs sorties cite l'agent qui la déduit, et c'est cette
   * ligne-là que la variante reprend — une par valeur, chacune avec sa version.
   * Le spectre, lui, ne pose qu'une ligne, et elle ne cite que lui : sans cette
   * déclaration, une variante de zone sismique la laisserait derrière elle.
   */
  rejeu: { outil: "spectre" },

  rend: [
    {
      outil: "spectre",
      sujet: SUJET_SPECTRE,
      tableau: true,
      quoi: "Le spectre de réponse élastique du projet : accélérations, correction "
        + "d'amortissement, paramètre de sol et périodes caractéristiques.",
      utilisation: "Ce dont part tout calcul de structure sous séisme. Il se refait quand la "
        + "zone, le sol ou l'importance changent — donc quand le projet se déplace.",
      structure: STRUCTURE_DU_SPECTRE
    }
  ],

  /**
   * Ce qu'il lit du projet.
   *
   * La zone d'abord : c'est elle qui vient d'ailleurs — de la commune, par
   * Géorisques — et c'est par elle que la chaîne se referme jusqu'à la
   * localisation. Les trois autres sont des choix du projet.
   */
  lit: [
    { sujet: SUJET_ZONE_SISMIQUE, entree: "zoneSismique",
      quoi: "La zone du zonage français, de 1 (très faible) à 5 (forte). Elle ne se choisit "
        + "pas : elle se lit sur la commune." },
    { sujet: SUJET_CLASSE_DE_SOL, entree: "soilClass",
      quoi: "Comment le terrain amplifie la secousse. A est un rocher, D un sol mou qui la "
        + "démultiplie : deux projets identiques sur A et sur D ne se ferraillent pas pareil." },
    { sujet: SUJET_CATEGORIE_IMPORTANCE, entree: "importanceCategory",
      quoi: "Ce que l'on accepte de perdre. II est un bâtiment courant, IV un bâtiment qui "
        + "doit rester debout après le séisme — hôpital, secours, salle de crise." },
    { sujet: SUJET_AMORTISSEMENT, entree: "dampingRatio", nombre: true,
      quoi: "L'amortissement visqueux de l'ouvrage, en pourcentage. 5 % est la valeur de "
        + "référence ; au-delà, le spectre s'abaisse." }
  ]
};
