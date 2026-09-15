import { svgIcon } from "./ui/icons.js";
import { ROUTE_DU_CARNET } from "./services/mon-carnet.js";

export const PROJECT_TAB_IDS = {
  DOCUMENTS: "documents",
  SUBJECTS: "sujets",
  PROPOSITIONS: "propositions",
  MEMOIRE: "memoire",
  ACTIONS: "actions",
  STUDIO: "atelier",
  /**
   * Les situations ne sont plus un onglet du projet : elles ont leur écran, qui
   * est celui d'une personne (étape 3). L'identifiant reste pour que les
   * anciens liens `#project/<id>/situations` soient reconnus et renvoyés là où
   * l'écran a déménagé, plutôt que de retomber en silence sur Fichiers.
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
    /**
     * **Une porte, pas un onglet.**
     *
     * Les situations ne sont plus du projet — c'est tout l'objet de l'étape 3.
     * Mais c'est d'un chantier qu'on pense à son carnet, et l'y chercher dans un
     * menu qu'on n'ouvre jamais revient à ne pas l'avoir.
     *
     * Elle se tient donc dans la barre, à sa place, et **elle mène dehors** :
     * son adresse n'est pas celle d'un onglet de ce projet. On sort du projet en
     * la franchissant, et l'en-tête cesse d'en nommer un.
     */
    id: PROJECT_TAB_IDS.SITUATIONS,
    label: "Situations",
    href: ROUTE_DU_CARNET,
    icon: svgIcon("table", { className: "octicon octicon-table" })
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

