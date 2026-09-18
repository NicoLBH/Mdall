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
import { extensionDe } from "./fichier-a-la-main.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une entrée de la liste est. */
export const ENTREE = { DOSSIER: "dossier", FICHIER: "fichier" };

/**
 * Ce qu'un document déjà déposé demande pour être lu.
 *
 * **Le texte ne demande rien** : il est déjà le document. **Un PDF demande une
 * extraction**, et c'est le seul parcours qui coûte un appel — il est donc dit,
 * à côté du document, avant qu'on clique.
 */
export const LECTURE_DU_CHOIX = { TEXTE: "texte", PDF: "pdf" };

export const CE_QUE_CA_DEMANDE = {
  [LECTURE_DU_CHOIX.TEXTE]: "",
  [LECTURE_DU_CHOIX.PDF]: "Ce document sera extrait puis restitué par le modèle."
};

/**
 * Pourquoi un fichier ne se choisit pas.
 *
 * Il ne reste que deux cas, et ni l'un ni l'autre n'est un format : un document
 * que Mdall ne sait pas lire, et un document dont le dépôt ne s'est pas terminé.
 */
export const PAS_CHOISISSABLE = {
  PAS_LISIBLE: "pas-lisible",
  RIEN_A_LIRE: "rien-a-lire"
};

export const PHRASES_DU_REFUS = {
  [PAS_CHOISISSABLE.PAS_LISIBLE]:
    "Mdall ne sait pas lire ce format : un PDF, ou un document de texte.",
  [PAS_CHOISISSABLE.RIEN_A_LIRE]:
    "Aucun contenu n'est attaché à ce document : son dépôt ne s'est pas terminé."
};

/** Comment ce document se lirait — `""` s'il ne se lit pas du tout. */
export function commentCaSeLit(document = null) {
  const nom = nomDuFichier(document);
  if (estUnFichierTexte(nom)) return LECTURE_DU_CHOIX.TEXTE;
  return extensionDe(nom) === ".pdf" ? LECTURE_DU_CHOIX.PDF : "";
}

/** Pourquoi ce document ne se choisit pas — ou `""` s'il se choisit. */
export function pourquoiPasChoisissable(document = null) {
  if (!commentCaSeLit(document)) return PAS_CHOISISSABLE.PAS_LISIBLE;

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
        pourquoi,
        // **Comment il se lira**, dit avant qu'on clique : un PDF coûtera un
        // appel, un texte non. Le découvrir après coup, sur une facture, n'est
        // pas une façon de décider (fondamental 13).
        //
        // Un document refusé garde sa nature : un `.md` dont le dépôt n'a pas
        // abouti est bien du texte, il n'y a simplement rien à lire. Le blanchir
        // aurait été une ligne qu'aucun cassage ne fait tomber — rien ne lit ce
        // champ sur une entrée qu'on ne peut pas prendre.
        lecture: commentCaSeLit(fichier)
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
 * « rien qui se lise ici » quand il ne porte que des formats qu'on ne sait pas
 * lire — et la nuance compte, parce que la seconde invite à ouvrir un autre
 * dossier quand la première invite à en déposer. Et `""` quand il y a quelque
 * chose : on ne commente pas une liste qui se lit toute seule.
 */
export function phraseDuDossier(entrees = []) {
  const lues = Array.isArray(entrees) ? entrees : [];
  if (lues.length === 0) return "Ce dossier est vide.";

  if (lues.some((entree) => entree.choisissable)) return "";

  return lues.some((entree) => entree.type === ENTREE.DOSSIER)
    ? "Rien à lire ici. Ouvrez un dossier."
    : "Rien à lire ici.";
}
