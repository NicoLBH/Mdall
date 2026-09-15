import { svgIcon } from "./ui/icons.js";

export const PROJECT_TAB_IDS = {
  DOCUMENTS: "documents",
  SUBJECTS: "sujets",
  PROPOSITIONS: "propositions",
  MEMOIRE: "memoire",
  ACTIONS: "actions",
  STUDIO: "atelier",
  /**
   * Les situations ne sont plus un onglet du projet, et n'y reviennent pas :
   * une situation est **au-dessus** des projets, et la ranger parmi leurs
   * onglets brouille exactement ce que tout ce plan installe. On y va par la
   * barre du haut, qui ne dit rien sur l'endroit où l'on se trouve.
   *
   * L'identifiant reste pour que les anciens liens `#project/<id>/situations`
   * soient reconnus et renvoyés là où l'écran a déménagé, plutôt que de
   * retomber en silence sur Fichiers.
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

