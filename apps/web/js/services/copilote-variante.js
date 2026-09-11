/**
 * Le pont entre une demande du copilote et le moteur de variante.
 *
 * ## Pourquoi celui-ci s'exécute au navigateur
 *
 * Tous les autres utilitaires du copilote s'exécutent au serveur : leur
 * catalogue, les phrases qui décident quand les appeler et leur enchaînement ne
 * doivent pas descendre dans la page. Voir `scripts/prepare-utilitaires.mjs`,
 * qui refuse de les copier.
 *
 * Le moteur de variante, lui, **est déjà là** : c'est l'écran « Tester une
 * variante », que n'importe qui ouvre depuis l'Atelier. Le porter au serveur en
 * ferait une seconde implémentation du même raisonnement, et deux réponses à
 * une même question finissent par ne plus dire la même chose (règle 4).
 *
 * Ce qui reste au serveur est ce qui compte, et qui n'est pas le calcul : la
 * **déclaration** de l'outil et les consignes qui règlent quand le modèle
 * l'appelle. Le navigateur n'apprend même pas son nom — le serveur marque
 * l'appel comme sien.
 *
 * ## Ce qui part au modèle, et ce qui n'en part pas
 *
 * Un résumé : ce qui change, l'avant, l'après, l'utilitaire, et ce qui n'a pas
 * pu se recalculer avec sa raison. Pas les lignes de mémoire entières, pas les
 * tableaux de massifs, pas les provenances — c'est ce qu'il faut à un écran,
 * c'est vingt fois trop pour une réponse écrite, et cela noierait les trois
 * chiffres qui comptent.
 */

import { testerUneVariante, resumeDeLaVariante, phraseDuRefusDemande } from "./variante-demandee.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le titre affiché pendant que ça tourne, et dans le compte rendu. */
export const TITRE_VARIANTE = "Test d'une variante";

/**
 * Les lectures enregistrées, quand la base les rend.
 *
 * Sans elles, la propagation se déduit des déclarations au lieu de se lire sur
 * ce que chaque règle a vraiment lu. C'est moins précis, et ce n'est pas une
 * panne : la variante le fait déjà pour l'écran quand l'index manque.
 */
async function applicationsDuProjet(projectId) {
  try {
    const { listerLesApplications } = await import("./memoire-applications-supabase.js");
    return await listerLesApplications(projectId);
  } catch {
    return null;
  }
}

/**
 * Exécuter la variante que le modèle vient de demander.
 *
 * Rend la même forme que les utilitaires du serveur — `{ resultat, pourLeModele }`
 * — pour que la boucle du copilote n'ait pas à distinguer les deux chemins.
 *
 * @param {object} options
 * @param {object} options.entrees ce que le modèle a décidé : `{ sujet, valeur }`
 * @param {object[]} options.assertions la mémoire lue pour cette question
 * @param {string} options.projectId le projet, en base
 * @param {Function} [options.onEtape] ce qui se raconte pendant
 * @param {Function} [options.tester] injecté par les tests ; sinon le moteur réel
 */
export async function executerLaVariante({
  entrees = {}, assertions = [], projectId = "", onEtape = null, tester = null
} = {}) {
  const sujet = texte(entrees?.sujet);
  const valeur = texte(entrees?.valeur);
  const dire = (dit, detail = "") => {
    if (typeof onEtape === "function") onEtape({ texte: dit, detail });
  };

  dire("Lecture de ce qui dépend de cette valeur", sujet ? `on fait varier ${sujet}` : "");

  const applications = await applicationsDuProjet(projectId);
  const moteur = tester ?? testerUneVariante;

  let rendu = null;
  try {
    rendu = await moteur({ projectId, assertions, applications, sujet, valeur });
  } catch (erreur) {
    const motif = erreur instanceof Error ? erreur.message : String(erreur);
    return refuse(`Le test de variante n'a pas abouti : ${motif}`);
  }

  if (!rendu?.ok) {
    // Un refus se **dit**, et se dit avec sa raison. Rendre « ça n'a pas marché »
    // ferait recommencer le modèle à l'identique au tour suivant.
    const phrase = phraseDuRefusDemande(rendu?.refus) || texte(rendu?.raison) || "cette variante ne se teste pas";
    return refuse(phrase, rendu?.candidats ?? []);
  }

  const resume = resumeDeLaVariante(rendu);
  dire("Variante calculée",
    `${resume.ontBouge} valeur${resume.ontBouge > 1 ? "s" : ""} bouge${resume.ontBouge > 1 ? "nt" : ""}`);

  return {
    resultat: {
      statut: "fait",
      titre: TITRE_VARIANTE,
      // Le rendu entier reste ici : c'est lui qu'un écran montrerait, ligne à
      // ligne, si l'on voulait ouvrir la variante depuis la conversation.
      rendu: rendu.rendu,
      resume
    },
    pourLeModele: resume
  };
}

/** Un refus, dans la forme que la boucle du copilote attend. */
function refuse(phrase, candidats = []) {
  return {
    resultat: { statut: "manque", titre: TITRE_VARIANTE, message: phrase, candidats },
    pourLeModele: {
      refus: phrase,
      ...(candidats.length ? { valeurs_possibles: candidats } : {})
    }
  };
}
