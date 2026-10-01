import { svgIcon } from "./ui/icons.js";
import { ICONE_DU_CARNET, NOM_DU_CARNET } from "./services/mon-carnet.js";

export const PROJECT_TAB_IDS = {
  DOCUMENTS: "documents",
  SUBJECTS: "sujets",
  PROPOSITIONS: "propositions",
  MEMOIRE: "memoire",
  ACTIONS: "actions",
  STUDIO: "atelier",
  /**
   * **Les situations sont deux écrans, et non deux vérités.**
   *
   * Une situation appartient à une personne : la base ne rend que les siennes,
   * et cela ne change pas. Ce que cet onglet ajoute est un **cadrage**, pas un
   * droit — mes situations sur ce chantier-ci, plutôt que toutes.
   *
   * Il avait été retiré au profit du seul carnet
   * (`docs/les-situations-traversent-les-projets.md`, étape 3) : traverser les
   * chantiers était l'acquis, et le prix a été de ne plus pouvoir regarder
   * **un** chantier. Les deux cadrages existent donc, montés sur le même
   * tableau et sur la même règle de lecture (règle 4).
   */
  SITUATIONS: "situations",
  INSIGHTS: "insights",
  PARAMETRES: "parametres",
};

export const PROJECT_TAB_ROUTE_ALIASES = {
  avis: PROJECT_TAB_IDS.SUBJECTS,
  workflows: PROJECT_TAB_IDS.ACTIONS,
  indicateurs: PROJECT_TAB_IDS.INSIGHTS,
  jalons: PROJECT_TAB_IDS.INSIGHTS,
};

export const PROJECT_TABS_TOGGLEABLE = [
  PROJECT_TAB_IDS.STUDIO,
];

export const DEFAULT_PROJECT_TABS_VISIBILITY = {
  [PROJECT_TAB_IDS.STUDIO]: true,
};

export function normalizeProjectTabId(tab) {
  const value = String(tab || "").trim();
  if (!value) return PROJECT_TAB_IDS.DOCUMENTS;
  return PROJECT_TAB_ROUTE_ALIASES[value] || value;
}

export function isToggleableProjectTab(tabId) {
  return PROJECT_TABS_TOGGLEABLE.includes(tabId);
}

export function isProjectTabAllowedForUser() {
  return true;
}

export const PROJECT_TABS = [
  {
    id: PROJECT_TAB_IDS.DOCUMENTS,
    // « Fichiers » et non « Documents » : l'onglet porte les deux matières du
    // projet, les pièces déposées **et** ce que le projet sait. Ce sont les
    // mêmes sources — celles à partir desquelles il se reconstruit.
    label: "Fichiers",
    icon: svgIcon("file", { className: "octicon octicon-file" })
  },
  {
    id: PROJECT_TAB_IDS.SUBJECTS,
    label: "Sujets",
    icon: svgIcon("issue-opened", { className: "octicon octicon-file" }),
    countKey: "openSujets"
  },
  {
    id: PROJECT_TAB_IDS.SITUATIONS,
    // Juste après les Sujets, parce qu'une situation en **désigne** : elle ne
    // les possède pas, et la lire loin d'eux ferait croire le contraire.
    // Le nom et l'icône viennent de `services/mon-carnet.js` : le menu du haut
    // mène au même tableau, et deux écrans qui portent deux noms pour la même
    // chose se cherchent l'un l'autre (règle 10).
    label: NOM_DU_CARNET,
    icon: svgIcon(ICONE_DU_CARNET, { className: `octicon octicon-${ICONE_DU_CARNET}` })
  },
  {
    id: PROJECT_TAB_IDS.PROPOSITIONS,
    label: "Propositions",
    icon: svgIcon("git-pull-request", { className: "octicon octicon-git-pull-request" }),
    countKey: "openPropositions"
  },
  {
    id: PROJECT_TAB_IDS.MEMOIRE,
    label: "Mémoire",
    // Une base de données traversée d'un éclair : cet onglet ne range plus la
    // mémoire, il l'**exécute** — les règles s'y rejouent. L'horloge de
    // l'historique disait ce qu'il était, pas ce qu'il est devenu.
    icon: svgIcon("memoire-vive", { className: "octicon octicon-memoire-vive" })
  },
  {
    id: PROJECT_TAB_IDS.STUDIO,
    label: "Atelier",
    icon: svgIcon("cpu", { className: "octicon octicon-cpu" })
  },
  {
    id: PROJECT_TAB_IDS.ACTIONS,
    label: "Actions",
    icon: svgIcon("play", { className: "octicon octicon-play" })
  },
  {
    id: PROJECT_TAB_IDS.INSIGHTS,
    label: "Indicateurs",
    icon: svgIcon("graph", { className: "octicon octicon-graph" })
  },
  {
    id: PROJECT_TAB_IDS.PARAMETRES,
    label: "Paramètres",
    icon: svgIcon("gear", { className: "octicon octicon-gear" })
  }
];

