/**
 * « Lire le cerveau du projet », exécuté depuis la conversation.
 *
 * ## Pourquoi au navigateur
 *
 * Le graphe du raisonnement y est déjà : c'est le dessin qu'on ouvre depuis la
 * Mémoire. Le porter au serveur en ferait un second calcul du même dessin, et
 * deux dessins d'un même projet finissent par ne plus se ressembler (règle 4).
 *
 * ## Ce qui part au modèle, et ce qui reste ici
 *
 * Au modèle : des **nombres**, et un **récit déjà écrit**. Le récit porte la
 * grammaire du dessin — rond, cube, lien bleu, lien orange —, et une grammaire
 * se cite, elle ne se paraphrase pas : un modèle qui traduirait « cube » en
 * « carré » ferait chercher à l'écran quelque chose qui n'y est pas.
 *
 * Ici restent les **nœuds eux-mêmes**, qui ne lui apprendraient rien et
 * pèseraient lourd : c'est la conversation qui s'en sert, pour rouvrir le
 * dessin en grand sans le recalculer.
 */

import { cerveauDuProjet, noeudsIsoles, signauxDeLAudit } from "./memoire-cerveau.js";
import { lireLeCerveau, raconterLeCerveau } from "./lecture-du-cerveau.js";
import { applicationsDuProjet, actesDuProjet } from "./copilote-variante.js";

export const TITRE_CERVEAU = "Le cerveau du projet";

/**
 * Lire le cerveau, pour le copilote.
 *
 * @param {object} options
 * @param {object[]} options.assertions la mémoire lue pour cette question
 * @param {string} options.projectId le projet, en base
 * @param {Function} [options.onEtape] ce qui se raconte pendant
 * @param {Function} [options.lire] injecté par les tests ; sinon le vrai graphe
 */
export async function executerLeCerveau({
  assertions = [], projectId = "", onEtape = null, lire = null
} = {}) {
  const dire = (dit, detail = "") => {
    if (typeof onEtape === "function") onEtape({ texte: dit, detail });
  };

  dire("Lecture du raisonnement du projet");

  // Les lectures enregistrées et les actes : sans elles, le graphe se devine à
  // partir des noms, et le récit le dit. Une lecture qui échoue ne fait pas
  // tomber le dessin — elle le rend moins sûr, et il l'annonce (règle 5).
  const [applications, actes] = await Promise.all([
    applicationsDuProjet(projectId).catch(() => null),
    actesDuProjet(projectId).catch(() => null)
  ]);

  const construire = lire ?? ((memoire) =>
    cerveauDuProjet(memoire, applications, { avecLesFonctions: true, actes }));

  let cerveau = null;
  try {
    cerveau = construire(assertions);
  } catch (erreur) {
    const motif = erreur instanceof Error ? erreur.message : String(erreur);
    return {
      resultat: { statut: "manque", titre: TITRE_CERVEAU, message: `Le cerveau n'a pas pu être lu : ${motif}` },
      pourLeModele: { refus: `Le cerveau n'a pas pu être lu : ${motif}` }
    };
  }

  const lecture = lireLeCerveau(cerveau, {
    signales: signauxDeLAudit(assertions).size,
    isoles: noeudsIsoles(cerveau).size
  });
  const recit = raconterLeCerveau(lecture);

  dire("Cerveau lu", `${lecture.valeurs.total} affirmations, ${lecture.regles} règles, `
    + `${lecture.liens.total} liens`);

  return {
    resultat: {
      statut: "fait",
      titre: TITRE_CERVEAU,
      lecture,
      recit,
      // De quoi rouvrir le dessin en grand sans le refaire. Il ne part pas au
      // modèle : des milliers de nœuds ne lui apprendraient rien et coûteraient
      // la moitié de sa fenêtre.
      cerveau: { assertions, applications, actes }
    },
    pourLeModele: { ...lecture, recit }
  };
}
