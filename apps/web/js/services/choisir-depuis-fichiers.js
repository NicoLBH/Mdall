/**
 * Choisir un document dans l'arborescence de Fichiers.
 *
 * ## Pourquoi l'Atelier va chercher, plutôt que Fichiers apporter
 *
 * Le premier essai faisait l'inverse : un bouton dans Fichiers posait le texte
 * dans une case et envoyait vers l'Atelier. Deux défauts, et le second est
 * dirimant.
 *
 * D'abord, le geste était au mauvais endroit : on ouvre un compte rendu dans
 * Fichiers **pour le lire**, pas pour décider de le faire analyser ; la décision
 * se prend à l'Atelier, quand on est venu pour ça.
 *
 * Ensuite et surtout, **Fichiers chargeait alors l'Atelier**. Il fallait une
 * case partagée entre les deux, donc une route, donc un morceau de l'écran de
 * lecture dans les dépendances d'un écran qui ne s'en sert pas. On alourdit le
 * navigateur de tous pour un bouton que peu utiliseront. Ici, rien ne remonte :
 * l'Atelier descend chercher, et Fichiers ne sait pas qu'il existe.
 *
 * ## Ce que ce fichier décide
 *
 * Ce qui se choisit, et ce qui ne se choisit pas. Un PDF **s'affiche** dans la
 * liste, éteint, avec la raison : le masquer ferait un dossier de douze comptes
 * rendus qui paraîtrait vide, ce qui se lirait comme une panne (règle 5).
 *
 * ## Il est pur
 *
 * Des dossiers et des fichiers entrent, une liste ordonnée sort. Le réseau vit
 * dans `choisir-depuis-fichiers-supabase.js`.
 */

import { estUnFichierTexte, nomDuFichier } from "./lire-un-fichier-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une entrée de la liste est. */
export const ENTREE = { DOSSIER: "dossier", FICHIER: "fichier" };

/**
 * Pourquoi un fichier ne se choisit pas.
 *
 * Une seule raison pour l'instant, et elle mérite d'être nommée : un PDF se lit
 * très bien à l'Atelier — mais en le déposant, parce qu'il faut l'extraire, et
 * l'extraction a besoin du fichier lui-même. Le jour où on saura le relire
 * depuis Fichiers, c'est cette raison-là qui disparaîtra.
 */
export const PAS_CHOISISSABLE = {
  PAS_DU_TEXTE: "pas-du-texte",
  RIEN_A_LIRE: "rien-a-lire"
};

export const PHRASES_DU_REFUS = {
  [PAS_CHOISISSABLE.PAS_DU_TEXTE]:
    "Ce document n'est pas du texte : il faut l'extraire, et l'extraction part du fichier. Déposez-le.",
  [PAS_CHOISISSABLE.RIEN_A_LIRE]:
    "Aucun contenu n'est attaché à ce document : son dépôt ne s'est pas terminé."
};

/** Pourquoi ce document ne se choisit pas — ou `""` s'il se choisit. */
export function pourquoiPasChoisissable(document = null) {
  if (!estUnFichierTexte(nomDuFichier(document))) return PAS_CHOISISSABLE.PAS_DU_TEXTE;

  const seau = texte(document?.storageBucket ?? document?.storage_bucket);
  const chemin = texte(document?.storagePath ?? document?.storage_path);
  return seau && chemin ? "" : PAS_CHOISISSABLE.RIEN_A_LIRE;
}

/**
 * Ce que le dossier ouvert contient, dans l'ordre où on le lit.
 *
 * **Les dossiers d'abord, puis les fichiers**, chacun par ordre alphabétique.
 * C'est l'ordre de l'onglet Fichiers : une même arborescence qui se range
 * autrement selon l'écran oblige à la relire à chaque fois.
 *
 * L'ordre est celui du **français**, et non celui des codes de caractères :
 * sans locale, on aurait « Zinguerie », « atelier », « Étanchéité » dans cet
 * ordre — majuscules d'abord, accents tout à la fin. Un dossier qui se range
 * autrement qu'à l'alphabet se cherche longtemps.
 *
 * Pas de `sensitivity` : un cassage a montré qu'aucune des valeurs possibles ne
 * changeait le résultat ici. Un réglage qu'aucune vérification ne justifie se
 * lit comme une précaution, et l'on hésite à y toucher pour rien.
 */
export function entreesDuDossier(contenu = null) {
  // **`null` n'est pas `undefined`.** Une valeur par défaut de déstructuration
  // ne couvre que le second, et la lecture d'un dossier peut très bien rendre
  // `null` : on lèverait alors au lieu d'afficher un dossier vide.
  const { folders = [], files = [] } = contenu ?? {};
  const parNom = (a, b) => a.nom.localeCompare(b.nom, "fr");

  const dossiers = (Array.isArray(folders) ? folders : [])
    .map((dossier) => ({
      type: ENTREE.DOSSIER,
      id: texte(dossier?.id),
      nom: texte(dossier?.name) || "Dossier",
      choisissable: false,
      pourquoi: ""
    }))
    .filter((entree) => entree.id)
    .sort(parNom);

  const fichiers = (Array.isArray(files) ? files : [])
    .map((fichier) => {
      const pourquoi = pourquoiPasChoisissable(fichier);
      return {
        type: ENTREE.FICHIER,
        id: texte(fichier?.id),
        nom: nomDuFichier(fichier) || "Document",
        choisissable: !pourquoi,
        pourquoi
      };
    })
    .filter((entree) => entree.id)
    .sort(parNom);

  return [...dossiers, ...fichiers];
}

/**
 * Le chemin du dossier ouvert, du plus haut au plus bas.
 *
 * Le premier morceau est **Fichiers**, sans identifiant : c'est la racine, et
 * sans elle on descend dans un dossier sans plus rien pour remonter.
 */
export function cheminDuDossier(breadcrumb = []) {
  return [
    { id: "", nom: "Fichiers" },
    ...(Array.isArray(breadcrumb) ? breadcrumb : [])
      .map((dossier) => ({ id: texte(dossier?.id), nom: texte(dossier?.name) || "Dossier" }))
      .filter((dossier) => dossier.id)
  ];
}

/**
 * Ce qu'on dit d'un dossier qui n'offre rien à choisir.
 *
 * Trois situations, trois phrases. « Ce dossier est vide » quand il l'est ;
 * « rien qui se lise ici » quand il ne porte que des PDF — et la nuance compte,
 * parce que la seconde invite à ouvrir un autre dossier quand la première
 * invite à en déposer. Et `""` quand il y a quelque chose : on ne commente pas
 * une liste qui se lit toute seule.
 */
export function phraseDuDossier(entrees = []) {
  const lues = Array.isArray(entrees) ? entrees : [];
  if (lues.length === 0) return "Ce dossier est vide.";

  if (lues.some((entree) => entree.choisissable)) return "";

  return lues.some((entree) => entree.type === ENTREE.DOSSIER)
    ? "Aucun document de texte ici. Ouvrez un dossier."
    : "Aucun document de texte ici.";
}
