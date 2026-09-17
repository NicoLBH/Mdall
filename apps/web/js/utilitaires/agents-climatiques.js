/**
 * Les deux agents-D du climat, et la localisation qu'ils lisent.
 *
 * ## Le défaut qu'on ferme
 *
 * « Neige, Vent & Gel » est antérieur aux standards. Il calculait bien — les
 * tables sont au serveur, la loi n'en descend pas —, mais rien de ce qu'il
 * faisait ne s'écrivait comme un raisonnement :
 *
 * - **l'appel n'existait nulle part.** Cinq valeurs entraient dans la mémoire,
 *   chacune seule, sans que rien dise qu'un même calcul les avait posées
 *   ensemble ni à partir de quoi ;
 * - **son entrée non plus.** La commune vivait dans le formulaire du projet,
 *   pas dans sa mémoire : on ne pouvait ni la relire, ni la faire varier, ni
 *   savoir laquelle avait servi ;
 * - **rien ne se rejouait.** Ces cinq valeurs ne citaient pas leur utilitaire,
 *   donc une variante d'altitude ne les reprenait pas — elle les rangeait « à
 *   revérifier », c'est-à-dire qu'elle rendait la main.
 *
 * ## Deux agents, et pas trois
 *
 * Le serveur porte trois clés — `snow`, `wind`, `frost` —, et c'est juste : les
 * zonages neige et vent sont révisés séparément, chacun a son fichier et sa
 * version. Mais du point de vue du projet, ce sont **deux appels** :
 *
 * | agent | ce qu'il lit | ce qu'il pose |
 * | --- | --- | --- |
 * | **zones climatiques** | la commune | zone de neige, zone de vent |
 * | **profondeur hors gel** | le département, l'altitude | la cote hors gel, le H0 retenu |
 *
 * Le premier ne lit qu'une commune ; le second lit une altitude, et c'est lui
 * seul qu'une variante d'altitude concerne. Les tenir ensemble ferait rejouer
 * les zonages à chaque mètre d'altitude essayé, pour rien.
 *
 * ## Ce qu'un agent déclare
 *
 * Ses **entrées** — les sujets du projet qu'il lit, et par quel champ de l'appel
 * chacun y entre — et ses **sorties**, dans l'ordre où on les lit.
 *
 * Une sortie que le catalogue porte déjà ne se redit pas : `{ outil: "snow" }`
 * renvoie à l'utilitaire qui la déduit, avec son sujet, sa source et sa version.
 * Recopier le sujet ici ferait deux vérités à tenir, et le jour où un zonage
 * change de nom l'une des deux mentirait (règle 4). Les autres — le H0 que la
 * table départementale donne, et qu'aucun agent ne « déduit » puisqu'il est
 * lu tel quel — se déclarent en entier, ici, une fois.
 *
 * Sa **loi** non plus, et pour une raison inverse de celle des fondations : elle
 * est publique — un décret, une annexe nationale, une table du DTU — mais elle
 * vit dans une table du serveur, pas dans une formule. Ce qui s'écrit dans le
 * projet est donc l'**appel**, et la valeur qu'il a rendue.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";

/**
 * La localisation du projet, telle que le calcul la reçoit.
 *
 * ## Pourquoi elle entre dans la mémoire
 *
 * C'est l'entrée de toute la chaîne climatique, et elle n'était nulle part. Le
 * formulaire du projet la portait — utile pour afficher une carte, sans plus :
 * on ne pouvait pas dire *avec quelle commune* une zone de neige avait été
 * calculée, ni la corriger sans que rien ne se rejoue, ni l'essayer autrement.
 *
 * Elle entre comme n'importe quelle donnée de base : par une proposition que
 * quelqu'un signe. C'est ce qui rend la suite rejouable — et c'est aussi ce qui
 * fera, à l'étape 4 du plan, qu'un déplacement de projet se propage jusqu'aux
 * fondations.
 *
 * ## Le code INSEE, et pas le nom de la commune
 *
 * Deux communes françaises portent le même nom ; aucune ne partage son code
 * INSEE. Le serveur exige donc celui-ci, et l'écran ne calcule pas sans lui —
 * il le dit plutôt que de rendre le zonage d'une homonyme.
 *
 * ## Une adresse, ou un point : c'est **une** localisation
 *
 * Un projet qui n'est pas construit n'a pas d'adresse. Il est dans un champ, et
 * ce qui le situe est un couple de coordonnées qu'on est allé pointer sur une
 * vue satellite. Une localisation qui n'aurait su être qu'une adresse aurait
 * obligé à en inventer une — « lieu-dit Les Sables, sans numéro » —, c'est-à-dire
 * à écrire en mémoire quelque chose que personne n'a constaté.
 *
 * Les coordonnées sont donc **des colonnes de la même ligne**, au même titre que
 * la commune. Deux formes d'un même fait, pas deux faits : l'adresse peut
 * manquer, le point peut manquer, la ligne existe dès que l'un des deux est là.
 *
 * ## `enBloc` : six colonnes, **une** valeur
 *
 * Un tableau offre d'ordinaire ses colonnes une par une : c'est ce qui rend la
 * contrainte de sol d'un tableau de fondations atteignable, et c'est juste —
 * chaque colonne y est un fait indépendant.
 *
 * La localisation ne marche pas comme cela. Personne ne veut « faire varier une
 * latitude » : on veut *déplacer le projet*. L'écran de variante offrait donc
 * six valeurs pour un seul choix, dont cinq n'ont aucun sens seules — un code
 * INSEE sans sa commune, une longitude sans sa latitude. Et changer l'une sans
 * les autres décrit un endroit qui n'existe pas.
 *
 * `enBloc` le dit : ces colonnes ne se font pas varier séparément. Elles se
 * proposent comme **une** valeur, qui se remplace d'un coup. La déclaration vit
 * dans la structure, donc elle voyage avec la ligne versée, et l'écran n'a aucun
 * nom de sujet à connaître.
 */
export const SUJET_LOCALISATION = "Localisation du projet";

export const STRUCTURE_DE_LA_LOCALISATION = [
  {
    nom: "commune", enBloc: true, cle: "commune", type: "texte",
    quoi: "Le nom de la commune, tel qu'on le lit. Il sert à relire ce qui a été calculé ; "
      + "ce n'est pas lui qui décide — deux communes peuvent le partager."
  },
  {
    nom: "code INSEE", enBloc: true, cle: "codeInsee", type: "texte",
    quoi: "Les cinq chiffres qui désignent la commune sans ambiguïté. C'est par lui que les "
      + "tables de zonage se lisent, et rien ne se calcule sans lui."
  },
  {
    nom: "code postal", enBloc: true, cle: "codePostal", type: "texte",
    quoi: "Le code postal. Ses deux premiers chiffres donnent le département, dont dépend le "
      + "H0 de la table du NF DTU 13.1."
  },
  {
    nom: "adresse", enBloc: true, cle: "adresse", type: "texte",
    quoi: "L'adresse du projet, quand il en a une. Elle ne décide de rien dans les zonages : "
      + "elle situe. Un projet qui n'est pas construit n'en a pas, et c'est le point qui le situe."
  },
  {
    nom: "latitude", enBloc: true, cle: "latitude", type: "nombre",
    quoi: "La latitude du point retenu, en degrés décimaux. C'est elle qui situe le projet "
      + "au mètre près — une commune fait des kilomètres, et le relief change dedans."
  },
  {
    nom: "longitude", enBloc: true, cle: "longitude", type: "nombre",
    quoi: "La longitude du point retenu, en degrés décimaux. Avec la latitude, elle donne "
      + "l'altitude, et elle dit qu'un projet a bougé même sans changer de commune."
  }
];

/**
 * La localisation, telle que **tout ce qui la lit** la lit.
 *
 * **Le même objet partout**, et pas cinq copies : ce que ce sujet est, ce à quoi
 * il sert et la forme qu'il a ne changent pas selon qui le lit. L'altitude, elle,
 * a deux phrases différentes — les deux agents la lisent pour deux raisons
 * différentes —, et c'est légitime.
 *
 * ## Pourquoi `champ` est ici, et pourquoi il compte
 *
 * La localisation se verse comme **un tableau d'une ligne à quatre colonnes** —
 * c'est un endroit, pas quatre faits. `champ` dit par laquelle elle entre dans
 * un calcul : le **code INSEE**, et lui seul. L'adresse, comme le dit sa propre
 * définition, « ne décide de rien dans les zonages : elle situe ».
 *
 * Les trois déductions climatiques répétaient `entree: "code_insee"` chacune de
 * leur côté, **sans** `champ`. Le rejeu ne pouvait donc pas savoir qu'une
 * variante d'adresse ne les concernait pas : il envoyait l'adresse entière dans
 * le champ du code INSEE, le serveur répondait 400, et l'écran affichait
 * « l'outil n'a pas répondu » — on cherchait une panne de réseau là où il n'y
 * avait qu'une colonne qui ne décide de rien. Un même fait écrit à quatre
 * endroits finit par diverger (règle 4) : il s'écrit ici, et les quatre
 * l'importent.
 */
export const LIT_LA_LOCALISATION = {
  sujet: SUJET_LOCALISATION,
  // Le champ de l'appel qui porte ce sujet, et la clé du tableau qui l'alimente :
  // la localisation est une ligne à plusieurs colonnes, et c'est le code INSEE
  // qui entre dans le calcul.
  entree: "code_insee",
  champ: "codeInsee",
  quoi: "Où le projet se trouve : sa commune, son code INSEE, son code postal et son adresse. "
    + "C'est l'entrée de toute la chaîne climatique.",
  utilisation: "Ce que le projet conserve pour pouvoir refaire ses zonages : le jour où la "
    + "localisation est corrigée, les zones et la cote hors gel se recalculent depuis elle.",
  structure: STRUCTURE_DE_LA_LOCALISATION
};

/**
 * Le sujet de l'altitude, nommé une fois.
 *
 * Il vit ici parce que les deux agents le lisent — l'un pour la réserve au-delà
 * de 900 m, l'autre parce que la formule du hors gel en dépend — et qu'un nom
 * écrit à deux endroits finit par diverger (règle 10).
 */
export const SUJET_ALTITUDE = "Altitude du site";

/**
 * Le H0 de la table départementale, nommé une fois.
 *
 * L'agent du gel le **pose**, l'utilitaire du hors gel le **lit** : ce sont deux
 * rôles, pas deux définitions. Le nom, lui, vit ici, et les deux l'importent.
 */
export const SUJET_H0 = "H0 retenu pour le département";

/**
 * Les zones climatiques, d'après la commune.
 *
 * Elle pose deux contraintes d'un coup — neige et vent —, parce que c'est un
 * seul geste : la même commune, la même table communale, la même lecture. Les
 * séparer en deux appels ferait deux lignes de raisonnement pour un seul.
 */
export const AGENT_D_ZONES_CLIMATIQUES_COMMUNE_V1 = {
  nom: "agent_d_zones_climatiques_commune",
  version: "V1",
  libelle: "Zones climatiques d'après la commune",
  source: "Annexes Nationales NF EN 1991-1-3 et NF EN 1991-1-4",
  domaine: DOMAIN.STRUCTURE,
  quoi: "Lit les zonages neige et vent de la commune dans les tables des annexes nationales. "
    + "Les tables vivent au serveur : cet appel les interroge, il ne les recopie pas.",

  /** Les clés que le serveur connaît, pour l'appel et pour le rejeu. */
  outils: ["snow", "wind"],

  /**
   * Ce qu'il pose. Les deux zonages, chacun avec son fichier et sa version.
   *
   * `cle` est le champ du **résultat de l'outil**, et il se déclare : ce n'est
   * pas la clé du fait de contexte que l'utilitaire porte — `snow_zone` d'un
   * côté, `snow_zone` de l'autre par chance, `frost_depth_m` contre
   * `frost_depth` en dessous. Deviner l'une depuis l'autre lirait un jour un
   * champ absent et rendrait une valeur vide sans un mot.
   */
  rend: [
    { outil: "snow", cle: "snow_zone" },
    { outil: "wind", cle: "wind_zone" }
  ],

  /**
   * Ce qu'elle lit du projet.
   *
   * `entree` dit **par quel champ de l'appel** ce sujet y entre — donc lequel se
   * fait varier. L'altitude en a un : au-delà de 900 m, l'annexe nationale ne
   * suffit plus et la réserve le dit, si bien qu'une variante d'altitude doit
   * atteindre cette lecture-ci.
   */
  lit: [
    LIT_LA_LOCALISATION,
    { sujet: SUJET_ALTITUDE, entree: "altitude", nombre: true,
      quoi: "L'altitude du site. Elle ne change pas la zone, elle décide de la réserve : "
        + "au-delà de 900 m, l'annexe nationale demande une étude particulière." }
  ]
};

/**
 * La profondeur hors gel, d'après le département et l'altitude.
 *
 *   H = H0 + (altitude − 150) / 4000
 *
 * Son propre agent, et c'est la raison d'être du découpage : c'est le seul des
 * deux qu'une variante d'altitude fasse vraiment bouger. Le tenir avec les
 * zonages rejouerait deux tables communales à chaque mètre essayé, pour rien.
 */
export const AGENT_D_PROFONDEUR_HORS_GEL_V1 = {
  nom: "agent_d_profondeur_hors_gel",
  version: "V1",
  libelle: "Profondeur hors gel d'après le département et l'altitude",
  source: "NF DTU 13.1",
  domaine: DOMAIN.SOL,
  quoi: "Calcule la cote hors gel à partir du H0 de la table départementale et de l'altitude "
    + "du site. La table vit au serveur ; le choix du H0, quand le département en offre "
    + "plusieurs, est signalé par une réserve.",

  outils: ["frost"],

  /**
   * Ce qu'il pose : la cote, et le H0 dont elle sort.
   *
   * Le H0 se déclare en entier parce qu'aucun utilitaire ne le déduit — la table
   * départementale le **donne**, et l'utilitaire du hors gel le lit pour en
   * tirer H. Le taire ferait de la cote un chiffre sans origine, et personne ne
   * pourrait dire, six mois plus tard, quelle valeur avait été retenue quand le
   * département en offrait une fourchette.
   */
  rend: [
    { outil: "frost", cle: "frost_depth_m", decimales: 2, unite: "m" },
    {
      // Le même appel que la cote — c'est la table du gel qui donne les deux —,
      // mais son propre sujet : le déclarer ici est ce qui empêche de le prendre
      // pour la cote elle-même.
      outil: "frost",
      sujet: SUJET_H0,
      cle: "h0_selected_m",
      decimales: 1,
      unite: "m",
      quoi: "Le H0 que la table départementale du NF DTU 13.1 donne pour ce département. "
        + "Quand elle en offre une fourchette, quelqu'un a tranché — et c'est une décision, "
        + "pas un relevé."
    }
  ],

  lit: [
    LIT_LA_LOCALISATION,
    { sujet: SUJET_ALTITUDE, entree: "altitude", nombre: true,
      quoi: "L'altitude du site, second terme de la formule. Sans elle, la cote est "
        + "calculée à 150 m — ce qui n'est vrai nulle part en particulier." }
  ]
};

/** Les deux agents, dans l'ordre où la chaîne les traverse. */
export const AGENTS_CLIMATIQUES = [
  AGENT_D_ZONES_CLIMATIQUES_COMMUNE_V1,
  AGENT_D_PROFONDEUR_HORS_GEL_V1
];
