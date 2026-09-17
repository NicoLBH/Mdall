/**
 * Les écrans d'un projet, et l'adresse qui mène à chacun.
 *
 * ## Le défaut que ça prépare
 *
 * Depuis le Copilote de tous les projets, on écrit « ouvre-moi le Copilote du
 * Restaurant scolaire au Reposoir ». Le modèle sait de quoi on parle — la liste
 * des projets est dans son contexte — mais il n'a aucun moyen d'y aller : il
 * répond « rendez-vous dans l'onglet Atelier », et l'on refait à la main le
 * chemin qu'on venait de décrire. Une application qui sait où sont ses écrans
 * ne devrait pas faire épeler l'itinéraire.
 *
 * ## Pourquoi le serveur, et pourquoi copié au navigateur
 *
 * Deux côtés en ont besoin, et pour deux raisons différentes : le serveur
 * **déclare au modèle** la liste des destinations possibles — une énumération,
 * donc un choix fermé, donc rien à inventer —, et le navigateur **compose
 * l'adresse** de celle qu'il a choisie. Écrite des deux côtés, la liste
 * divergerait au premier écran ajouté, et la divergence serait muette : un
 * `insights` que le modèle propose et que le navigateur ne sait pas ouvrir.
 *
 * `scripts/prepare-utilitaires.mjs` le copie donc dans
 * `apps/web/vendor/utilitaires/`, comme la déclaration des fondations et le
 * vocabulaire des régimes incendie. Il n'a rien de secret : ce sont les onglets
 * qu'on lit en haut de l'écran.
 *
 * ## Ce qui n'est pas ici
 *
 * **Les libellés.** « Fichiers », « Mémoire », « Indicateurs » vivent dans
 * `apps/web/js/constants.js`, avec les onglets eux-mêmes, et c'est là qu'ils
 * doivent rester : ce sont des mots d'écran. Ce fichier ne porte que des
 * identifiants et ce que chaque écran *est*, dit au modèle pour qu'il choisisse.
 * Un test tient les deux listes ensemble.
 */

/** Le préfixe de toute adresse de projet. Un nom vit à un seul endroit. */
const PROJET = "project";

/**
 * Les destinations, et ce que chacune montre.
 *
 * `quoi` s'adresse au modèle, pas à l'écran : il dit ce qu'on y trouve, pour
 * qu'« ouvre-moi les fichiers » et « montre-moi ce qui est déposé » mènent au
 * même endroit sans qu'on ait à énumérer les synonymes.
 *
 * Le Copilote est le premier de la liste parce que c'est la destination la plus
 * demandée, et parce qu'il est le seul à vivre **dans** un onglet.
 */
export const ECRANS_DU_PROJET = [
  {
    cle: "copilote",
    onglet: "atelier",
    // Le quatrième segment de la route de l'Atelier. `route-de-latelier.js` le
    // relit pour savoir quel panneau ouvrir ; un test tient les deux ensemble.
    panneau: "copilote",
    quoi: "La discussion avec le Copilote de ce projet-là, qui lit sa mémoire."
  },
  {
    cle: "atelier",
    onglet: "atelier",
    panneau: "",
    quoi: "L'Atelier et ses agents : fondations, sismique, incendie, climat."
  },
  {
    cle: "documents",
    onglet: "documents",
    panneau: "",
    quoi: "Les pièces déposées sur le projet : comptes rendus, notes, plans."
  },
  {
    cle: "sujets",
    onglet: "sujets",
    panneau: "",
    quoi: "Les sujets du projet : ce qui est ouvert, en attente, tranché."
  },
  {
    cle: "propositions",
    onglet: "propositions",
    panneau: "",
    quoi: "Les propositions déposées sur le projet, et leur état."
  },
  {
    cle: "memoire",
    onglet: "memoire",
    panneau: "",
    quoi: "Ce que le projet tient pour vrai : ses variables, ses règles, son cerveau."
  },
  {
    cle: "actions",
    onglet: "actions",
    panneau: "",
    quoi: "Les traitements qu'on lance sur le projet."
  },
  {
    cle: "insights",
    onglet: "insights",
    panneau: "",
    quoi: "Les indicateurs du projet : son activité, ses jalons."
  },
  {
    cle: "parametres",
    onglet: "parametres",
    panneau: "",
    quoi: "Les réglages du projet : son identité, ses zones, ses onglets."
  }
];

/** Les clés seules, dans l'ordre : c'est l'énumération déclarée au modèle. */
export const CLES_DES_ECRANS = ECRANS_DU_PROJET.map((ecran) => ecran.cle);

/** L'écran désigné, ou `null`. Une clé inconnue n'est pas rapprochée de la plus proche. */
export function ecranDuProjet(cle) {
  const vise = String(cle ?? "").trim();
  return ECRANS_DU_PROJET.find((ecran) => ecran.cle === vise) ?? null;
}

/**
 * L'adresse d'un écran d'un projet.
 *
 * **Un seul endroit la compose.** Elle s'écrivait déjà dans la barre du haut,
 * dans l'accueil et dans le routeur ; en ajouter une quatrième version ici
 * aurait fait la quatrième à corriger le jour où la route change (règle 4).
 * Celle-ci est la seule que le Copilote emploie, et un test la confronte à
 * celle que l'Atelier relit.
 *
 * @param {string} projetId l'identifiant du projet, tel que la base le porte
 * @param {string} cle une clé de `ECRANS_DU_PROJET`
 * @returns {string} l'adresse avec son `#`, ou `""` quand l'un des deux manque
 */
export function routeDeLEcran(projetId, cle) {
  const projet = String(projetId ?? "").trim();
  const ecran = ecranDuProjet(cle);
  if (!projet || !ecran) return "";

  const segments = [PROJET, encodeURIComponent(projet), ecran.onglet];
  if (ecran.panneau) segments.push(ecran.panneau);
  return `#${segments.join("/")}`;
}
