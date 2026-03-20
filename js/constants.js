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

function renderVerifiedTabIcon() {
  return `
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-verified ui-icon" fill="currentColor" overflow="visible">
      <path d="m9.585.52.929.68c.153.112.331.186.518.215l1.138.175a2.678 2.678 0 0 1 2.24 2.24l.174 1.139c.029.187.103.365.215.518l.68.928a2.677 2.677 0 0 1 0 3.17l-.68.928a1.174 1.174 0 0 0-.215.518l-.175 1.138a2.678 2.678 0 0 1-2.241 2.241l-1.138.175a1.17 1.17 0 0 0-.518.215l-.928.68a2.677 2.677 0 0 1-3.17 0l-.928-.68a1.174 1.174 0 0 0-.518-.215L3.83 14.41a2.678 2.678 0 0 1-2.24-2.24l-.175-1.138a1.17 1.17 0 0 0-.215-.518l-.68-.928a2.677 2.677 0 0 1 0-3.17l.68-.928c.112-.153.186-.331.215-.518l.175-1.14a2.678 2.678 0 0 1 2.24-2.24l1.139-.175c.187-.029.365-.103.518-.215l.928-.68a2.677 2.677 0 0 1 3.17 0ZM7.303 1.728l-.927.68a2.67 2.67 0 0 1-1.18.489l-1.137.174a1.179 1.179 0 0 0-.987.987l-.174 1.136a2.677 2.677 0 0 1-.489 1.18l-.68.928a1.18 1.18 0 0 0 0 1.394l.68.927c.256.348.424.753.489 1.18l.174 1.137c.078.509.478.909.987.987l1.136.174a2.67 2.67 0 0 1 1.18.489l.928.68c.414.305.979.305 1.394 0l.927-.68a2.67 2.67 0 0 1 1.18-.489l1.137-.174a1.18 1.18 0 0 0 .987-.987l.174-1.136a2.67 2.67 0 0 1 .489-1.18l.68-.928a1.176 1.176 0 0 0 0-1.394l-.68-.927a2.686 2.686 0 0 1-.489-1.18l-.174-1.137a1.179 1.179 0 0 0-.987-.987l-1.136-.174a2.677 2.677 0 0 1-1.18-.489l-.928-.68a1.176 1.176 0 0 0-1.394 0ZM11.28 6.78l-3.75 3.75a.75.75 0 0 1-1.06 0L4.72 8.78a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L7 8.94l3.22-3.22a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"></path>
    </svg>
  `.replace(/\s+/g, " ").trim();
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
    icon: renderVerifiedTabIcon()
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
