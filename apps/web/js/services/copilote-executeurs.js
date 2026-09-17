/**
 * Les outils que le navigateur exécute lui-même, rangés par rôle.
 *
 * ## Pourquoi un fichier à part
 *
 * Pour qu'il se vérifie. `copilote-service.js` parle à la base et ne s'importe
 * pas dans un test : l'import lève avant la première ligne. Cette table, elle,
 * est exactement le point où un décalage se paie — et il faut pouvoir la
 * confronter, en vrai, à la table des rôles du serveur.
 *
 * ## Un rôle, jamais un nom d'outil
 *
 * Le navigateur n'a pas de catalogue — c'est le but : router sur le nom
 * d'outil lui apprendrait quels outils existent, et c'est précisément ce que
 * la cloison protège. Le serveur nomme un **rôle**, appel par appel, et cette
 * table dit ce qu'on en fait.
 *
 * ## Elle sert deux fois
 *
 * Elle exécute, et elle **s'annonce** : ses clés partent avec chaque question,
 * et le serveur n'offre au modèle que les outils dont le rôle y figure. Sans
 * cela, le serveur et le site se déployant séparément, un outil tout neuf était
 * offert au modèle avant que la page ne sache l'exécuter — et l'ancien
 * aiguillage lançait alors l'outil d'à côté.
 *
 * Deux listes, l'une pour exécuter et l'autre pour annoncer, auraient divergé au
 * premier rôle ajouté (règle 4). Il n'y en a donc qu'une.
 */

import { executerLaVariante } from "./copilote-variante.js";
import { executerLeCerveau } from "./copilote-cerveau.js";
import { executerLaNavigation } from "./copilote-navigation.js";

/** Ce que le navigateur sait faire, rangé sous le rôle que le serveur emploie. */
export const EXECUTEURS_DU_NAVIGATEUR = {
  cerveau: ({ assertions, projectId, dire }) =>
    executerLeCerveau({ assertions, projectId, onEtape: dire }),

  variante: ({ entrees, assertions, projectId, dire }) =>
    executerLaVariante({ entrees, assertions, projectId, onEtape: dire }),

  // Il ne déplace personne : il reconnaît le projet et rend l'adresse. Le
  // déplacement a lieu quand le tour est fini et la réponse enregistrée —
  // partir au milieu emporterait la conversation qu'on écrit.
  navigation: ({ entrees, dire }) => executerLaNavigation({ entrees, onEtape: dire })
};

/** Ce que le navigateur annonce savoir faire. La même table, lue autrement. */
export const ROLES_QUE_CE_NAVIGATEUR_SAIT = Object.keys(EXECUTEURS_DU_NAVIGATEUR);

