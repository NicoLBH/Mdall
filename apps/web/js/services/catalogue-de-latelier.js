/**
 * Ce que l'Atelier contient, et ce que chaque utilitaire dit de lui-même.
 *
 * ## Pourquoi une donnée, et pas un dessin
 *
 * L'Atelier portait ses utilitaires dans son propre rendu : un intitulé, une
 * icône, une cible de navigation, écrits dans le balisage. Tant qu'il y en a
 * treize, cela tient. À deux cents, non — et surtout, **rien d'autre ne peut
 * les lire** : ni une recherche, ni un compteur d'usage, ni une fiche qui dit
 * ce qu'un utilitaire prend en entrée.
 *
 * Le catalogue vit donc ici, comme une donnée, à un seul endroit (règle 10).
 * L'écran le lit ; il ne le contient pas.
 *
 * ## Ce qu'une entrée porte, et pourquoi chaque champ
 *
 *  - **`entrees` et `sorties`** — ce qu'il faut avoir, ce qu'on obtient. C'est
 *    la première question qu'on se pose devant un utilitaire inconnu, et la
 *    seule à laquelle son nom ne répond jamais.
 *  - **`version`** — un utilitaire s'améliore par paliers, et l'on compare un
 *    résultat d'aujourd'hui à celui d'avant. Sans version affichée, la
 *    comparaison n'a pas de repère.
 *  - **`intelligence`** — l'utilitaire appelle-t-il un modèle ? Cela se dit
 *    **avant** de cliquer : une requête coûte, et un résultat produit par un
 *    modèle ne se lit pas comme un calcul déterministe.
 *  - **`aussiALaMain`** — par quel chemin un humain obtient la même chose sans
 *    l'IA. Un fondamental de Mdall : l'IA accélère, elle n'est jamais le seul
 *    chemin ni une boîte noire. Le champ existe pour que l'absence de réponse
 *    se voie.
 *  - **`mots`** — ce sous quoi on le cherche quand on ne connaît pas son nom :
 *    un domaine, une donnée d'entrée, une variable produite.
 *  - **`ajouteLe`** — quand il est entré à l'Atelier. C'est ce qui range
 *    « Ajouté récemment », et cela répond à une question qu'on se pose
 *    vraiment : qu'est-ce qui est nouveau depuis la dernière fois ?
 *
 * **Ce qui n'est pas un champ : la mise en avant.** Elle se compte, dans
 * `atelier_ouvertures`, sur tous les projets et tous les utilisateurs. Déclarée
 * ici, elle vieillirait sans que personne ne s'en aperçoive.
 *
 * ## Ce qui n'est pas ici
 *
 * **Comment l'utilitaire s'exécute.** L'orchestration — quels utilitaires
 * existent côté serveur, quand les appeler, comment ils s'enchaînent — vit sous
 * `supabase/functions/_shared/utilitaires/` et n'est pas lisible dans le
 * navigateur. Ce catalogue ne décrit que ce qui s'affiche.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les rayons de l'Atelier.
 *
 * Ce sont des **domaines de métier**, pas des familles techniques : on cherche
 * « ce qui concerne l'incendie », jamais « ce qui appelle un modèle ».
 */
export const RAYONS = {
  EXPLORATION: "exploration",
  SOLIDITE: "solidite",
  INCENDIE: "incendie",
  PARASISMIQUE: "parasismique",
  DOCUMENTS: "documents",
  MEMOIRE: "memoire",
  DEVELOPPEMENT: "developpement"
};

/**
 * L'icône de chaque rayon, dans la navigation verticale.
 *
 * Elle vit **avec le nom du rayon**, pas dans l'écran qui les dessine : ce sont
 * deux faces d'une même chose, et les séparer ferait qu'un rayon ajouté
 * arriverait sans icône ou avec celle du voisin (règle 10).
 */
export const ICONE_DU_RAYON = {
  [RAYONS.EXPLORATION]: "beaker",
  [RAYONS.SOLIDITE]: "gear",
  [RAYONS.INCENDIE]: "fire",
  [RAYONS.PARASISMIQUE]: "pulse",
  [RAYONS.DOCUMENTS]: "file",
  [RAYONS.MEMOIRE]: "memoire-vive",
  [RAYONS.DEVELOPPEMENT]: "markdown-code"
};

export const NOM_DU_RAYON = {
  [RAYONS.EXPLORATION]: "Explorations",
  [RAYONS.SOLIDITE]: "Solidité",
  [RAYONS.INCENDIE]: "Incendie",
  [RAYONS.PARASISMIQUE]: "Parasismique",
  [RAYONS.DOCUMENTS]: "Documents",
  [RAYONS.MEMOIRE]: "Mémoire",
  [RAYONS.DEVELOPPEMENT]: "Développements"
};

/**
 * Le catalogue.
 *
 * `cible` est ce que la navigation connaît déjà : changer ces valeurs
 * casserait les écrans qui existent, et rien ne l'exige.
 */
export const UTILITAIRES = [
  {
    cible: "studio-copilote",
    nom: "Copilote",
    rayon: RAYONS.EXPLORATION,
    resume: "Poser une question sur le projet, et obtenir une réponse qui cite ce qu'elle a lu.",
    entrees: ["La mémoire du projet", "Les documents versés"],
    sorties: ["Une réponse sourcée", "Des propositions à examiner"],
    version: "1.4",
    intelligence: true,
    aussiALaMain: "Parcourir la mémoire et les documents par l'onglet Mémoire.",
    mots: ["question", "discussion", "recherche", "assistant"],
    ajouteLe: "2025-10-10"
  },
  {
    cible: "exploration-variante",
    nom: "Tester une variante",
    rayon: RAYONS.EXPLORATION,
    resume: "Changer une valeur et rejouer tout le projet pour voir ce qui bouge.",
    entrees: ["Une valeur de la mémoire", "La valeur à essayer"],
    sorties: ["Ce qui change, règle par règle"],
    version: "1.2",
    intelligence: false,
    aussiALaMain: "Refaire les calculs dépendants un à un.",
    mots: ["simulation", "hypothèse", "rejeu", "et si"],
    ajouteLe: "2026-02-06"
  },
  {
    cible: "exploration-impact",
    nom: "Étude d'impact",
    rayon: RAYONS.EXPLORATION,
    resume: "Ce qui dépend d'une valeur, et jusqu'où la modifier se propage.",
    entrees: ["Une valeur de la mémoire"],
    sorties: ["La chaîne des dépendances"],
    version: "1.1",
    intelligence: false,
    aussiALaMain: "Remonter les lectures enregistrées de chaque règle.",
    mots: ["dépendances", "propagation", "aval"],
    ajouteLe: "2025-06-20"
  },
  {
    cible: "exploration-audit",
    nom: "Auditer la mémoire",
    rayon: RAYONS.EXPLORATION,
    resume: "Ce que la mémoire porte, ce qui manque, et ce qui se contredit.",
    entrees: ["La mémoire du projet"],
    sorties: ["Les lacunes", "Les contradictions"],
    version: "1.0",
    intelligence: false,
    aussiALaMain: "Relire la mémoire ligne à ligne.",
    mots: ["lacunes", "contradictions", "qualité", "contrôle"],
    ajouteLe: "2025-07-25"
  },
  {
    cible: "solidity-climate",
    nom: "Neige, Vent & Gel",
    rayon: RAYONS.SOLIDITE,
    resume: "Les charges climatiques du lieu, aux Eurocodes.",
    entrees: ["Commune", "Altitude"],
    sorties: ["Charge de neige", "Vitesse de vent", "Profondeur hors gel"],
    version: "1.3",
    intelligence: false,
    aussiALaMain: "Lire les cartes et annexes nationales.",
    mots: ["neige", "vent", "gel", "EC1", "climat", "altitude", "charges"],
    ajouteLe: "2026-08-28"
  },
  {
    cible: "solidity-georisks",
    nom: "Risques Naturels & Technologiques",
    rayon: RAYONS.SOLIDITE,
    resume: "Ce que les bases publiques disent des risques du terrain.",
    entrees: ["Adresse", "Parcelle"],
    sorties: ["Aléas recensés", "Servitudes"],
    version: "1.1",
    intelligence: false,
    aussiALaMain: "Consulter Géorisques commune par commune.",
    mots: ["risques", "aléa", "argile", "inondation", "seveso", "géorisques"],
    ajouteLe: "2025-11-21"
  },
  {
    cible: "solidity-fondations",
    nom: "Fondations superficielles",
    rayon: RAYONS.SOLIDITE,
    resume: "Le calcul d'une semelle, avec ce qu'il a lu pour le faire.",
    entrees: ["Contrainte admissible", "Descente de charges", "Hors gel"],
    sorties: ["Dimensions de semelle", "Ancrage"],
    version: "2.0",
    intelligence: false,
    aussiALaMain: "Le calcul est posé en toutes lettres, il se refait à la main.",
    mots: ["fondation", "semelle", "ancrage", "portance", "EC7"],
    ajouteLe: "2026-06-26"
  },
  {
    cible: "incendie-habitation",
    nom: "Incendie Habitation",
    rayon: RAYONS.INCENDIE,
    resume: "La famille du bâtiment, et ce qu'elle impose.",
    entrees: ["Nombre de niveaux", "Hauteur du dernier plancher", "Accès"],
    sorties: ["Famille", "Exigences applicables"],
    version: "1.5",
    intelligence: false,
    aussiALaMain: "Appliquer l'arrêté du 31 janvier 1986.",
    mots: ["incendie", "famille", "habitation", "1986", "désenfumage", "SSI"],
    ajouteLe: "2026-04-03"
  },
  {
    cible: "seismic-general",
    nom: "Spectre",
    rayon: RAYONS.PARASISMIQUE,
    resume: "Le spectre élastique du lieu, tracé.",
    entrees: ["Zone sismique", "Classe de sol", "Catégorie d'importance"],
    sorties: ["Spectre élastique", "Accélération de calcul"],
    version: "1.2",
    intelligence: false,
    aussiALaMain: "Construire le spectre selon l'EC8 et l'arrêté de 2010.",
    mots: ["sismique", "séisme", "spectre", "EC8", "zone", "sol", "accélération"],
    ajouteLe: "2026-05-29"
  },
  {
    cible: "solidity-arkolia",
    nom: "ENR — PV hangar neuf",
    rayon: RAYONS.SOLIDITE,
    resume: "La trame de vérification d'un hangar photovoltaïque neuf.",
    entrees: ["Descriptif du hangar"],
    sorties: ["Points à vérifier"],
    version: "0.9",
    intelligence: false,
    aussiALaMain: "Dérouler la trame à la main.",
    mots: ["photovoltaïque", "hangar", "ENR", "agricole"],
    ajouteLe: "2025-09-19"
  },
  {
    cible: "conflits-resolution",
    nom: "Résoudre les conflits",
    rayon: RAYONS.MEMOIRE,
    resume: "Deux valeurs qui se contredisent, et de quoi trancher.",
    entrees: ["La mémoire du projet"],
    sorties: ["Les conflits, avec leurs deux origines"],
    version: "1.0",
    intelligence: false,
    aussiALaMain: "Comparer les versements deux à deux.",
    mots: ["conflit", "contradiction", "divergence", "arbitrage"],
    ajouteLe: "2025-12-19"
  },
  {
    cible: "dev-ct-continuity-lab",
    nom: "Suivi des avis BC",
    rayon: RAYONS.DEVELOPPEMENT,
    resume: "Ce que devient un avis de bureau de contrôle d'un rapport au suivant.",
    entrees: ["Rapports de bureau de contrôle"],
    sorties: ["La suite de chaque avis"],
    version: "0.6",
    intelligence: true,
    aussiALaMain: "Comparer les rapports avis par avis.",
    mots: ["avis", "bureau de contrôle", "RICT", "continuité", "levée"],
    ajouteLe: "2026-08-07"
  },
  {
    cible: "dev-lecture-cr",
    nom: "Lecture des comptes rendus",
    rayon: RAYONS.DEVELOPPEMENT,
    resume: "Déposer un compte rendu de chantier et voir ce que le modèle en a compris.",
    entrees: ["Un compte rendu de chantier, en PDF"],
    sorties: [
      "Les points relevés, avec leur citation",
      "Ce qu'ils deviendraient face aux sujets du projet",
      "Le document refait en Markdown, sur demande"
    ],
    version: "0.2",
    intelligence: true,
    aussiALaMain: "Lire le compte rendu et ouvrir les sujets un par un.",
    mots: ["compte rendu", "CR", "chantier", "extraction", "pdf", "réunion", "points", "markdown"],
    ajouteLe: "2026-09-12"
  },
  {
    cible: "dev-variables",
    nom: "Variables mutualisées",
    rayon: RAYONS.DEVELOPPEMENT,
    resume: "Les variables que plusieurs règles se partagent, et qui les lit.",
    entrees: ["Les fichiers .ref du projet"],
    sorties: ["Les variables, avec leurs lecteurs"],
    version: "1.0",
    intelligence: false,
    aussiALaMain: "Lire les .ref.",
    mots: ["variable", "ref", "langage", "mutualisé"],
    ajouteLe: "2026-03-13"
  }
];

/** Un utilitaire par sa cible de navigation. */
export function utilitaireParCible(cible) {
  const cle = texte(cible);
  return UTILITAIRES.find((utilitaire) => utilitaire.cible === cle) ?? null;
}

/**
 * Ce qui se cherche dans une entrée.
 *
 * **Le nom ne suffit pas** : on cherche « altitude » sans savoir que
 * l'utilitaire s'appelle « Neige, Vent & Gel ». Tout ce qui décrit l'entrée
 * entre donc dans la recherche — le rayon, le résumé, les données d'entrée et
 * de sortie, les mots posés exprès.
 */
export function motsDeLUtilitaire(utilitaire = {}) {
  return [
    utilitaire.nom,
    NOM_DU_RAYON[utilitaire.rayon] ?? "",
    utilitaire.resume,
    ...(Array.isArray(utilitaire.entrees) ? utilitaire.entrees : []),
    ...(Array.isArray(utilitaire.sorties) ? utilitaire.sorties : []),
    ...(Array.isArray(utilitaire.mots) ? utilitaire.mots : [])
  ].map(texte).filter(Boolean).join(" ");
}

/** Sans accent ni casse : on tape « seisme », on trouve « séisme ». */
export function sansAccent(valeur = "") {
  return texte(valeur).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Les utilitaires que cette recherche retient.
 *
 * **Tous les mots, dans n'importe quel ordre.** « fondation gel » doit trouver
 * ce qui parle des deux ; exiger la suite exacte obligerait à deviner la
 * formulation, et chercher l'un *ou* l'autre rendrait la moitié du catalogue.
 *
 * **Chaque mot accroche un début de mot, pas n'importe où dedans.** On tape
 * « fond » et l'on veut « fondations » : le début suffit, et l'on ne finit
 * jamais de taper. Mais chercher n'importe où faisait répondre « Spectre » à
 * « portance » — par *im-portance* —, et une réponse qu'on ne s'explique pas
 * discrédite toutes les autres.
 *
 * Une recherche vide rend tout : un écran d'accueil qui se vide tant qu'on n'a
 * rien tapé ne montre pas ce qu'il contient.
 */
export function chercherDansLatelier(recherche = "", utilitaires = UTILITAIRES) {
  const liste = Array.isArray(utilitaires) ? utilitaires : [];
  const mots = sansAccent(recherche).split(/\s+/).filter(Boolean);
  if (mots.length === 0) return [...liste];

  return liste.filter((utilitaire) => {
    const dedans = sansAccent(motsDeLUtilitaire(utilitaire)).split(/[^a-z0-9]+/).filter(Boolean);
    return mots.every((mot) => dedans.some((connu) => connu.startsWith(mot)));
  });
}

/**
 * Ceux qu'on met en avant.
 *
 * **Ils se comptent, ils ne se déclarent pas.** Une liste écrite à la main
 * vieillit sans que personne ne s'en aperçoive : un utilitaire ajouté et
 * beaucoup employé reste invisible, un utilitaire mis en avant et jamais ouvert
 * garde sa place. Ce que la profession ouvre le plus est une donnée, pas une
 * opinion — et elle se lit dans `atelier_ouvertures`, tous projets et tous
 * utilisateurs confondus.
 *
 * Six au plus : au-delà, la rangée redevient une liste à parcourir et elle ne
 * met plus rien en avant — elle déplace le problème d'un cran.
 */
export const VEDETTES_AU_PLUS = 6;

/**
 * @param {object[]} utilitaires
 * @param {Record<string, number>|Map<string, number>} ouvertures combien de fois
 *   chaque cible a été ouverte
 * @returns {object[]} les plus ouverts d'abord
 */
export function vedettesDeLatelier(utilitaires = UTILITAIRES, ouvertures = null) {
  const liste = Array.isArray(utilitaires) ? utilitaires : [];
  const combien = (cible) => {
    if (ouvertures instanceof Map) return Number(ouvertures.get(cible) ?? 0);
    return Number(ouvertures?.[cible] ?? 0);
  };

  return [...liste]
    // **À égalité, l'ordre du catalogue tranche**, et non le hasard du tri : un
    // Atelier neuf, où rien n'a encore été ouvert, doit montrer la même rangée
    // à chaque ouverture. Une rangée qui se réordonne toute seule n'est plus un
    // repère.
    .map((utilitaire, rang) => ({ utilitaire, rang, vues: combien(utilitaire.cible) }))
    .sort((gauche, droite) => (droite.vues - gauche.vues) || (gauche.rang - droite.rang))
    .slice(0, VEDETTES_AU_PLUS)
    .map((entree) => entree.utilitaire);
}

/**
 * Les utilitaires du plus récemment ajouté au plus ancien.
 *
 * Un utilitaire sans date passe en dernier plutôt qu'en premier : ne pas savoir
 * quand il est arrivé n'en fait pas une nouveauté (règle 5).
 */
export function ajoutsRecents(utilitaires = UTILITAIRES) {
  return [...(Array.isArray(utilitaires) ? utilitaires : [])]
    .sort((gauche, droite) => texte(droite?.ajouteLe).localeCompare(texte(gauche?.ajouteLe)));
}

/** Les rayons présents, dans l'ordre où ils sont déclarés. */
export function rayonsDuCatalogue(utilitaires = UTILITAIRES) {
  const presents = new Set((Array.isArray(utilitaires) ? utilitaires : []).map((u) => u?.rayon));
  return Object.values(RAYONS).filter((rayon) => presents.has(rayon));
}
