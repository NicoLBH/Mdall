import { svgIcon } from "./ui/icons.js";

export const PROJECT_TAB_IDS = {
  DOCUMENTS: "documents",
  AVIS: "avis",
  SITUATIONS: "situations",
  PROPOSITIONS: "propositions",
  DISCUSSIONS: "discussions",
  ACTIONS: "actions",
  PILOTAGE: "pilotage",
  REFERENTIEL: "referentiel",
  RISQUES_SECURITE: "risquesSecurite",
  INSIGHTS: "insights",
  PARAMETRES: "parametres",
};

export const PROJECT_TAB_ROUTE_ALIASES = {
  coordination: PROJECT_TAB_IDS.DISCUSSIONS,
  workflows: PROJECT_TAB_IDS.ACTIONS,
  indicateurs: PROJECT_TAB_IDS.INSIGHTS,
  jalons: PROJECT_TAB_IDS.INSIGHTS,
  "risques-securite": PROJECT_TAB_IDS.RISQUES_SECURITE,
};

export const PROJECT_TABS_TOGGLEABLE = [
  PROJECT_TAB_IDS.PROPOSITIONS,
  PROJECT_TAB_IDS.DISCUSSIONS,
  PROJECT_TAB_IDS.PILOTAGE,
  PROJECT_TAB_IDS.REFERENTIEL,
  PROJECT_TAB_IDS.RISQUES_SECURITE,
];

export const DEFAULT_PROJECT_TABS_VISIBILITY = {
  [PROJECT_TAB_IDS.PROPOSITIONS]: true,
  [PROJECT_TAB_IDS.DISCUSSIONS]: false,
  [PROJECT_TAB_IDS.PILOTAGE]: false,
  [PROJECT_TAB_IDS.REFERENTIEL]: false,
  [PROJECT_TAB_IDS.RISQUES_SECURITE]: false,
};

export function normalizeProjectTabId(tab) {
  const value = String(tab || "").trim();
  if (!value) return PROJECT_TAB_IDS.DOCUMENTS;
  return PROJECT_TAB_ROUTE_ALIASES[value] || value;
}

export function isToggleableProjectTab(tabId) {
  return PROJECT_TABS_TOGGLEABLE.includes(tabId);
}

export function isProjectTabAllowedForUser(tabId, user) {
  if (tabId === PROJECT_TAB_IDS.AVIS) {
    return String(user?.role || "").toUpperCase() === "CT";
  }

  return true;
}

export const PROJECT_TABS = [
  {
    id: PROJECT_TAB_IDS.DOCUMENTS,
    label: "Documents",
    icon: svgIcon("file", { className: "octicon octicon-file" })
  },
  {
    id: PROJECT_TAB_IDS.AVIS,
    label: "Avis",
    icon: svgIcon("avis", { className: "octicon octicon-file" })
  },
  {
    id: PROJECT_TAB_IDS.SITUATIONS,
    label: "Sujets",
    icon: svgIcon("issue-opened", { className: "octicon octicon-issue-opened" }),
    countKey: "openSujets"
  },
  {
    id: PROJECT_TAB_IDS.PROPOSITIONS,
    label: "Propositions",
    icon: svgIcon("git-pull-request", { className: "octicon octicon-git-pull-request" })
  },
  {
    id: PROJECT_TAB_IDS.DISCUSSIONS,
    label: "Discussions",
    icon: svgIcon("comment-discussion", { className: "octicon octicon-comment-discussion" })
  },
  {
    id: PROJECT_TAB_IDS.ACTIONS,
    label: "Actions",
    icon: svgIcon("play", { className: "octicon octicon-play" })
  },
  {
    id: PROJECT_TAB_IDS.PILOTAGE,
    label: "Pilotage",
    icon: svgIcon("table", { className: "octicon octicon-table" })
  },
  {
    id: PROJECT_TAB_IDS.REFERENTIEL,
    label: "Référentiel",
    icon: svgIcon("book", { className: "octicon octicon-book" })
  },
  {
    id: PROJECT_TAB_IDS.RISQUES_SECURITE,
    label: "Risques & sécurité",
    icon: svgIcon("shield", { className: "octicon octicon-shield" })
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

export const ASK_LLM_URL_PROD =
  "https://nicolbh.app.n8n.cloud/webhook/rapsobot-poc-ask-llm";

export const ASSIST_LLM_URL_PROD =
  "https://nicolbh.app.n8n.cloud/webhook/rapsobot-poc-assistant";
