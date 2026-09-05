/**
 * « Transformer » — la seule sortie d'un utilitaire de l'Atelier.
 *
 * ## Pourquoi ce bouton existe, et pourquoi il n'écrit rien
 *
 * Un utilitaire produit de la matière : des zones climatiques, des cotes de
 * massifs, des degrés coupe-feu. Cette matière ne va **jamais** directement dans
 * la mémoire du projet — voir `docs/fondamentaux.md`. Elle sort par l'un de deux
 * chemins, et l'utilisateur choisit lequel :
 *
 *  - **Ouvrir un sujet** — il y a quelque chose à régler avec l'équipe avant de
 *    conclure. Un coefficient, un niveau qu'on n'est pas deux à compter pareil,
 *    une hypothèse à faire confirmer.
 *  - **Faire une proposition** — c'est prêt. Le système la prépare à partir de
 *    ce que l'Atelier a produit ; elle reste **ouverte**, et quelqu'un la signe.
 *    C'est là que les conflits avec ce que le projet a déjà décidé se voient et
 *    s'arbitrent.
 *
 * ## Pourquoi un seul composant
 *
 * Trois écrans le portent — climat, fondations, incendie — et il en viendra
 * d'autres. Trois boutons écrits trois fois auraient trois libellés au bout de
 * six mois, et l'un des trois finirait par écrire directement « puisque c'est
 * plus simple ». Un composant unique rend cette dérive visible.
 */

import { renderGhActionButton } from "./gh-split-button.js";
import { svgIcon } from "../../ui/icons.js";

/** Les deux issues. L'écran qui pose le bouton écoute ces actions. */
export const TRANSFORMER = {
  SUJET: "transformerEnSujet",
  PROPOSITION: "transformerEnProposition"
};

/**
 * Le bouton et son menu.
 *
 * Les libellés sont courts **et** disent ce qu'ils font : « Créer un sujet à
 * partir des résultats » se lit deux fois avant d'être compris, et un menu de
 * deux lignes qui commencent toutes deux par « Créer un… » ne se distingue plus
 * du regard. Le verbe change, et c'est lui qui porte la différence : on *ouvre*
 * un sujet — c'est un début —, on *fait* une proposition — c'est une fin.
 *
 * @param {{id: string, disabled?: boolean, tone?: string, quoi?: string}} options
 *   `quoi` nomme la matière en un mot — « ces résultats », « ces massifs ».
 */
export function renderTransformer({
  id = "atelierTransformer",
  disabled = false,
  tone = "default",
  size = "md"
} = {}) {
  return renderGhActionButton({
    id,
    label: "Transformer",
    tone,
    size,
    disabled,
    menuOnMain: true,
    items: [
      {
        action: TRANSFORMER.SUJET,
        icon: svgIcon("issue-opened", { width: 14, height: 14 }),
        label: "Ouvrir un sujet"
      },
      {
        action: TRANSFORMER.PROPOSITION,
        icon: svgIcon("git-pull-request", { width: 14, height: 14 }),
        label: "Faire une proposition"
      }
    ]
  });
}
