/**
 * L'étude incendie, écrite.
 *
 * ## Ce que ce fichier branche
 *
 * `memoire-en-texte.js` sait écrire une affirmation, une exigence sans objet,
 * une décision. Il ne sait rien de l'incendie. Ce fichier fait la jointure : il
 * lit ce que le référentiel a conclu et le rend en lignes.
 *
 * C'est le même partage que pour le diff — un moteur, des carburants — et pour
 * la même raison. L'écriture d'un autre utilitaire s'ajoutera par un fichier de
 * ce genre, sans toucher au langage.
 *
 * ## Ce qui s'écrit, et ce qui s'écrit aussi
 *
 * Un module conclu qui exige quelque chose donne une ligne, avec son article
 * derrière la flèche. Mais deux autres états comptent autant, et l'écran les
 * faisait disparaître :
 *
 * - **sans objet** — le référentiel a examiné le cas et n'exige rien. Ce n'est
 *   pas une valeur manquante, c'est une conclusion, et c'est celle qu'on
 *   cherchera le jour où quelqu'un demandera « et pour la circulation
 *   horizontale ? » ;
 * - **en attente** — il manque une réponse. Ne pas savoir n'autorise pas à
 *   prétendre qu'il n'y a rien : la ligne s'écrit, avec le nom de ce qui la
 *   retient.
 *
 * Les **reformulations du cas** — « le bâtiment comporte un sous-sol » — n'ont
 * pas leur place dans un fichier d'exigences : elles décrivent l'entrée, pas la
 * sortie. Elles vivent dans l'en-tête du questionnaire, où on les a saisies.
 *
 * ## Ce n'est pas le moteur
 *
 * Le fichier ressemblera à un programme, et quelqu'un finira par croire qu'en
 * changeant une ligne il change le calcul. L'en-tête dit donc toujours ce qui
 * l'a produit — le référentiel, sa version, la date. C'est une transcription
 * d'une décision, pas la décision.
 */

import {
  enTeteDeFichier, ligneDAffirmation, ligneSansObjet, ligneEnAttente,
  nomDeFichier, cheminDeFichier
} from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le texte qui fonde une conclusion, tel qu'on le cite. */
export function sourceDuModule(module = {}, referentiel = "") {
  const pourquoi = module.pourquoi ?? {};
  const article = texte(pourquoi.article)
    ? `article ${texte(pourquoi.article)}${texte(pourquoi.paragraphe) ? `, ${texte(pourquoi.paragraphe)}` : ""}`
    : texte(module.article) ? `article ${texte(module.article)}` : "";

  return [texte(referentiel), article].filter(Boolean).join(", ");
}

/**
 * Un module du référentiel, en une ligne — ou rien.
 *
 * `null` quand le module ne dit rien qui concerne l'ouvrage : une reformulation
 * du cas, ou un module qui n'a pas commencé.
 */
export function ligneDuModule(module = {}, referentiel = "") {
  const sujet = texte(module.titre);
  if (!sujet) return null;

  // Ce qui ne pose aucune exigence décrit l'entrée, pas la sortie.
  if (module.exigence !== true) return null;

  if (texte(module.sansObjet)) {
    return { nature: "sans-objet", jetons: ligneSansObjet({ sujet, motif: texte(module.sansObjet), source: sourceDuModule(module, referentiel) }) };
  }

  if (texte(module.statut) === "enAttente") {
    const manque = Array.isArray(module.manque) ? module.manque : [];
    return { nature: "attente", jetons: ligneEnAttente({ sujet, manque }) };
  }

  if (texte(module.statut) !== "conclu") return null;

  const valeur = texte(module.valeur);
  if (!valeur) return null;

  return {
    nature: "affirmation",
    jetons: ligneDAffirmation({ sujet, valeur, source: sourceDuModule(module, referentiel) })
  };
}

/**
 * L'étude entière, en un fichier.
 *
 * L'ordre est celui du référentiel : il a posé ses questions dans l'ordre où
 * elles s'enchaînent, et relire le fichier dans un autre ordre ferait perdre le
 * fil du raisonnement.
 *
 * @param {object} vue ce que le référentiel a rendu
 * @param {object} options
 * @param {string[]} options.chemin où le fichier se range
 * @param {string} options.referentiel le texte appliqué
 * @param {string} options.produitPar l'utilitaire et sa version
 * @param {string} options.le la date, en clair
 */
export function fichierDeLEtude(vue, {
  chemin = ["Incendie", "Habitation"],
  referentiel = "arrêté du 31 janvier 1986 modifié",
  produitPar = "l'utilitaire incendie — habitation",
  le = ""
} = {}) {
  const modules = Array.isArray(vue?.modules) ? vue.modules : [];
  const corps = modules
    .map((module) => ligneDuModule(module, referentiel))
    .filter(Boolean);

  return {
    nom: nomDeFichier(chemin),
    chemin: cheminDeFichier(chemin),
    enTete: enTeteDeFichier({ chemin, produitPar, le }),
    lignes: corps,
    // Ce que le fichier porte, en chiffres. Rien n'est estimé : ce sont des
    // comptes, et ils disent ce qu'on lira avant d'ouvrir.
    compte: {
      affirmations: corps.filter((ligne) => ligne.nature === "affirmation").length,
      sansObjet: corps.filter((ligne) => ligne.nature === "sans-objet").length,
      attente: corps.filter((ligne) => ligne.nature === "attente").length
    }
  };
}
