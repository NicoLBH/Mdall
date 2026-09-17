/**
 * « Transformer » — la seule sortie d'un agent de l'Atelier.
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
 *  - **Ajouter à une proposition ouverte** — une de plus dans celle qui est
 *    déjà en cours, plutôt qu'une deuxième à côté. Voir
 *    `services/proposition-branche.js` : ce n'est pas une branche au sens de
 *    git, c'est une proposition qui n'est pas mono-action.
 *
 * ## Trois issues, et le verbe ne porte plus seul la différence
 *
 * À deux issues, c'était le verbe qui les séparait : on *ouvre* un sujet — c'est
 * un début —, on *fait* une proposition — c'est une fin. La troisième garde ce
 * partage et y ajoute son objet : « ajouter **à #58 Reprise des fondations** »
 * ne se confond avec rien, parce qu'elle nomme la proposition qu'elle vise. Un
 * menu qui aurait dit « ajouter à une proposition ouverte » sans dire laquelle
 * aurait demandé un deuxième clic pour savoir de quoi il parlait.
 *
 * ## Ce que le menu ne dit jamais
 *
 * Que les propositions ouvertes sont lisibles quand elles ne le sont pas. Une
 * base muette rend `null`, et le menu affiche alors une ligne éteinte qui le
 * dit. Afficher « aucune proposition ouverte » ferait en ouvrir une deuxième à
 * côté de celle qu'on ne voyait pas (règle 5).
 *
 * ## Pourquoi un seul composant
 *
 * Trois écrans le portent — climat, fondations, incendie — et il en viendra
 * d'autres. Trois boutons écrits trois fois auraient trois libellés au bout de
 * six mois, et l'un des trois finirait par écrire directement « puisque c'est
 * plus simple ». Un composant unique rend cette dérive visible.
 */

import { renderGhActionButton } from "./gh-split-button.js";
import { libelleDeLaBranche } from "../../services/proposition-branche.js";
import { svgIcon } from "../../ui/icons.js";

/** Les issues. L'écran qui pose le bouton écoute ces actions. */
export const TRANSFORMER = {
  SUJET: "transformerEnSujet",
  PROPOSITION: "transformerEnProposition",
  /** Suivie de `:` et de l'identifiant de la proposition visée. */
  AJOUTER: "transformerDansUneProposition"
};

/**
 * La proposition que vise une action « ajouter à », ou `""` si ce n'en est pas une.
 *
 * L'identifiant voyage dans le nom de l'action parce que le menu ne transporte
 * rien d'autre. Le découper ici, une fois, plutôt que dans chacun des quatre
 * écrans qui posent le bouton : quatre découpages finiraient par ne plus
 * s'accorder le jour où la forme change (règle 10).
 */
export function brancheDeLAction(action = "") {
  const dit = String(action ?? "");
  const prefixe = `${TRANSFORMER.AJOUTER}:`;
  return dit.startsWith(prefixe) ? dit.slice(prefixe.length) : "";
}

/**
 * Le bouton et son menu.
 *
 * Les libellés sont courts **et** disent ce qu'ils font : « Créer un sujet à
 * partir des résultats » se lit deux fois avant d'être compris, et un menu de
 * lignes qui commencent toutes par « Créer un… » ne se distingue plus du regard.
 * Ce qui les sépare est dit en tête de fichier.
 *
 * @param {object} options
 * @param {object[]|null} [options.ouvertes] les propositions qu'on peut enrichir,
 *   ou `null` quand la base n'a pas répondu — les deux ne s'affichent pas pareil.
 */
export function renderTransformer({
  id = "atelierTransformer",
  disabled = false,
  tone = "default",
  size = "md",
  ouvertes = []
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
      },
      ...lignesDesBranches(ouvertes)
    ]
  });
}

/**
 * Les propositions ouvertes, sous un trait.
 *
 * Rien du tout quand il n'y en a aucune : un menu qui montrerait une rubrique
 * vide ferait chercher ce qui devrait s'y trouver.
 */
function lignesDesBranches(ouvertes) {
  // `null` seulement : `undefined` ne parvient jamais ici, le paramètre valant
  // `[]` par défaut — un appelant qui ne sait rien des propositions ouvertes
  // n'en propose aucune, il ne prétend pas qu'il n'y en a pas.
  if (ouvertes === null) {
    return [
      { separator: true },
      {
        action: `${TRANSFORMER.AJOUTER}:`,
        disabled: true,
        label: "Propositions ouvertes : lecture impossible",
        title: "La base n'a pas répondu. Ce projet en a peut-être, et elles ne sont pas listées ici."
      }
    ];
  }

  const branches = Array.isArray(ouvertes) ? ouvertes : [];
  if (!branches.length) return [];

  return [
    { separator: true },
    ...branches.map((branche) => ({
      action: `${TRANSFORMER.AJOUTER}:${branche?.id ?? ""}`,
      icon: svgIcon("git-branch", { width: 14, height: 14 }),
      label: `Ajouter à ${libelleDeLaBranche(branche)}`
    }))
  ];
}
