import { svgIcon } from "./ui/icons.js";

export const PROJECT_TAB_IDS = {
  DOCUMENTS: "documents",
  SUBJECTS: "sujets",
  ACTIONS: "actions",
  STUDIO: "atelier",
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
  PROJECT_TAB_IDS.SITUATIONS,
];

export const DEFAULT_PROJECT_TABS_VISIBILITY = {
  [PROJECT_TAB_IDS.STUDIO]: true,
  [PROJECT_TAB_IDS.SITUATIONS]: true,
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
    label: "Documents",
    icon: svgIcon("file", { className: "octicon octicon-file" })
  },
  {
    id: PROJECT_TAB_IDS.SUBJECTS,
    label: "Sujets",
    icon: svgIcon("issue-opened", { className: "octicon octicon-file" }),
    countKey: "openSujets"
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
    id: PROJECT_TAB_IDS.SITUATIONS,
    label: "Situations",
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

export const ASSIST_LLM_URL_PROD =
  "https://nicolbh.app.n8n.cloud/webhook/rapsobot-poc-assistant";
