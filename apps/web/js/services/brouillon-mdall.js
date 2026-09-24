/**
 * Un brouillon de Mdall : du français d'un côté, des fichiers de l'autre.
 *
 * ## Ce qu'il est, et ce qu'il n'est pas
 *
 * C'est **un bac d'essai**. Rien de ce qu'il porte n'est écrit nulle part : ni
 * dans la mémoire du projet, ni dans ses fichiers. Le seul chemin vers le
 * projet est celui de tout le monde — une proposition, examinée et signée
 * (règle 1).
 *
 * ## Plusieurs fichiers, parce que le langage en a plusieurs
 *
 * Une règle vit dans un `.ref`, une donnée de base dans un `.ddb`, une
 * contrainte dans un `.ctr`, et les déclarations de variables dans
 * `variables-du-projet.ref`. Tout écrire dans un seul fichier ferait un
 * brouillon qu'on ne pourrait pas verser sans le redécouper — et l'écran
 * mentirait sur ce que le langage demande.
 *
 * Les onglets de l'écran **sont** ces fichiers. Il n'y a pas d'onglet sans
 * fichier ni de fichier sans onglet (règle 10).
 *
 * ## Il est pur
 *
 * Du texte entre, du texte sort. Aucun réseau, aucun DOM, aucune horloge :
 * c'est ce qui permet de le vérifier, et c'est ce qui permettra au serveur de
 * s'en servir pour ranger ce qu'un modèle aura écrit.
 */

import { EXTENSIONS, EXTENSION_REGLE, langageDeLExtension } from "./memoire-rangement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les fichiers qu'un brouillon porte au départ.
 *
 * **Trois, et ils sont vides.** Un brouillon qui s'ouvrirait sur un exemple
 * ferait verser l'exemple le jour où quelqu'un oublie de l'effacer ; un
 * brouillon qui s'ouvrirait sur un seul fichier ferait croire que le langage
 * n'en a qu'un.
 *
 * L'ordre est celui de la lecture : ce qu'on déclare, ce qu'on raisonne, ce
 * qu'on pose. On lit un raisonnement après avoir su de quoi il parle.
 */
export const FICHIERS_DU_BROUILLON = [
  { nom: "variables-du-projet.ref", quoi: "Ce que chaque nom désigne" },
  { nom: "essai.ref", quoi: "Les règles — ce qui se raisonne" },
  { nom: "essai.ddb", quoi: "Les données de base — ce que l'ouvrage est" }
];

/** Un brouillon neuf : trois fichiers vides, et pas une ligne d'exemple. */
export function brouillonNeuf() {
  return {
    dit: "",
    fichiers: FICHIERS_DU_BROUILLON.map(({ nom, quoi }) => ({ nom, quoi, contenu: "" })),
    ouvert: FICHIERS_DU_BROUILLON[1].nom
  };
}

/**
 * L'extension d'un nom de fichier, telle que le rangement la connaît.
 *
 * `""` quand ce n'est pas une extension du langage : on ne devine pas. Un
 * brouillon nommé `essai.txt` n'est pas du Mdall, et le colorer comme tel
 * ferait croire qu'il se versera.
 */
export function extensionDuNom(nom = "") {
  const morceau = texte(nom).split(".").pop()?.toLowerCase() ?? "";
  // La liste se **dérive** du rangement : une quatrième liste d'extensions,
  // écrite ici, oublierait celle qu'on ajoute demain (règle 4).
  const connues = new Set([...Object.values(EXTENSIONS), EXTENSION_REGLE]);
  return connues.has(morceau) ? morceau : "";
}

/** Le langage d'un fichier du brouillon, pour que la coloration soit la bonne. */
export function langageDuFichier(nom = "") {
  return langageDeLExtension(extensionDuNom(nom));
}

/**
 * Le fichier ouvert, ou le premier.
 *
 * **Jamais `null`.** Un écran sans fichier ouvert n'aurait rien à montrer à
 * droite, et l'on chercherait longtemps pourquoi la moitié de l'écran est vide
 * alors que le brouillon porte du texte.
 */
export function fichierOuvert(brouillon = null) {
  const fichiers = Array.isArray(brouillon?.fichiers) ? brouillon.fichiers : [];
  if (!fichiers.length) return null;
  return fichiers.find((fichier) => fichier.nom === brouillon?.ouvert) ?? fichiers[0];
}

/**
 * Le brouillon, avec ce fichier réécrit.
 *
 * Rendu neuf plutôt que modifié : l'état de l'écran se remplace, il ne se
 * bricole pas — et un objet qu'on modifie en place se compare mal à celui
 * d'avant, ce qui est exactement ce qu'on veut faire pour savoir si quelque
 * chose a bougé.
 */
export function avecLeFichier(brouillon = null, nom = "", contenu = "") {
  const fichiers = Array.isArray(brouillon?.fichiers) ? brouillon.fichiers : [];
  return {
    ...brouillon,
    fichiers: fichiers.map((fichier) =>
      (fichier.nom === nom ? { ...fichier, contenu: String(contenu ?? "") } : fichier))
  };
}

/** Le brouillon, avec ce texte français. */
export function avecLeDit(brouillon = null, dit = "") {
  return { ...brouillon, dit: String(dit ?? "") };
}

/** Le brouillon, ouvert sur ce fichier — ou inchangé si ce nom n'existe pas. */
export function ouvertSur(brouillon = null, nom = "") {
  const fichiers = Array.isArray(brouillon?.fichiers) ? brouillon.fichiers : [];
  return fichiers.some((fichier) => fichier.nom === nom) ? { ...brouillon, ouvert: nom } : brouillon;
}

/**
 * Ce que le brouillon porte d'écrit, tous fichiers confondus.
 *
 * Sert à une seule question, et elle compte : **y a-t-il quelque chose à
 * perdre ?** Un écran qui proposerait d'effacer un brouillon vide poserait une
 * question pour rien ; un écran qui effacerait sans demander ferait perdre une
 * demi-heure.
 */
export function brouillonEcrit(brouillon = null) {
  const fichiers = Array.isArray(brouillon?.fichiers) ? brouillon.fichiers : [];
  return Boolean(texte(brouillon?.dit)) || fichiers.some((fichier) => texte(fichier.contenu));
}

/**
 * Les fichiers qui portent quelque chose, dans l'ordre du brouillon.
 *
 * C'est ce qu'on vérifie, ce qu'on lance, et ce qu'on proposera : un fichier
 * vide n'a rien à dire, et le faire entrer ferait compter des refus sur du
 * néant.
 */
export function fichiersRemplis(brouillon = null) {
  const fichiers = Array.isArray(brouillon?.fichiers) ? brouillon.fichiers : [];
  return fichiers.filter((fichier) => texte(fichier.contenu));
}
