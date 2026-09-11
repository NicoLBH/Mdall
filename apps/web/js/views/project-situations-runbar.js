import { svgIcon } from "../ui/icons.js";
import { bindGhActionButtons, initGhActionButton, renderGhActionButton } from "./ui/gh-split-button.js";
import { getAnalyzeButtonLabel } from "../services/project-automation.js";

let runbarState = {
  run_id: null,
  status: null,
  label: "",
  meta: "",
  isBusy: false
};

const PLAY_ICON = svgIcon("play", { className: "octicon octicon-play" });

/**
 * Le bouton n'a plus qu'un seul état.
 *
 * Il en avait deux : « Analyser », et « Analyse automatique activée » — grisé,
 * inerte, parce que le dépôt d'un document déclenchait l'analyse tout seul. Ce
 * déclenchement est parti : il produisait des sujets sans proposition, et
 * contournait la règle 1. Un bouton désactivé par un réglage qui n'existe plus
 * serait la pire trace qu'on puisse en laisser.
 */
function getRunbarButtonConfig() {
  return {
    mainAction: "run",
    mainLabel: getAnalyzeButtonLabel(),
    items: [
      { label: "Analyser", action: "run", icon: PLAY_ICON },
      { label: "Reset", action: "reset" }
    ]
  };
}

export function renderProjectSituationsRunbar() {
  const config = getRunbarButtonConfig();

  return `
    <div class="project-runbar" data-chrome-visibility="always">
      <div class="project-runbar__left">
        ${renderGhActionButton({
          id: "runAnalysisAction",
          label: config.mainLabel,
          icon: PLAY_ICON,
          tone: "primary",
          mainAction: config.mainAction,
          items: config.items
        })}
      </div>
      <div class="project-runbar__right">
        <span class="settings-badge mono">SUBJECT / SITUATION</span>
      </div>
    </div>
  `;
}

export function renderProjectSituationsTopBanner() {
  return `<div id="topBanner" class="gh-banner hidden" role="status" aria-live="polite"></div>`;
}

export function bindProjectSituationsRunbar(root = document) {
  bindGhActionButtons();

  const actionRoot = root.querySelector('[data-action-id="runAnalysisAction"]');
  if (!actionRoot) return;

  const config = getRunbarButtonConfig();
  initGhActionButton(actionRoot, { mainAction: config.mainAction });

  actionRoot.addEventListener("ghaction:action", (event) => {
    const action = event.detail?.action || "";

    if (action === "run") {
      if (runbarState.isBusy) return;
      document.dispatchEvent(new CustomEvent("runAnalysis"));
    }

    if (action === "reset") {
      document.dispatchEvent(new CustomEvent("resetAnalysisUi"));
    }
  });

  syncProjectSituationsRunbar(runbarState);
}

export function syncProjectSituationsRunbar(run = {}) {
  runbarState = {
    ...runbarState,
    ...run
  };

  const actionRoot = document.querySelector('[data-action-id="runAnalysisAction"]');
  const mainBtn = actionRoot?.querySelector("[data-action-main]");
  const toggleBtn = actionRoot?.querySelector("[data-action-toggle]");
  const labelNode = mainBtn?.querySelector(".gh-action__label");
  const topBanner = document.getElementById("topBanner");

  const isBusy = !!runbarState.isBusy || runbarState.status === "running";
  const bannerMode = runbarState.status === "running"
    ? "running"
    : runbarState.status === "error"
      ? "error"
      : null;

  if (mainBtn) {
    // Seule une analyse en cours désactive le bouton, désormais.
    mainBtn.disabled = isBusy;
    mainBtn.classList.toggle("is-disabled", isBusy);
    mainBtn.setAttribute("title", "");
  }

  if (toggleBtn) {
    toggleBtn.disabled = false;
  }

  if (actionRoot) {
    actionRoot.dataset.mainAction = "run";
  }

  if (labelNode) {
    labelNode.textContent = isBusy
      ? "Analyse en cours…"
      : getAnalyzeButtonLabel();
  }

  if (!topBanner) return;

  if (!bannerMode) {
    topBanner.classList.add("hidden");
    topBanner.innerHTML = "";
    topBanner.classList.remove("gh-banner--error", "gh-banner--info");
    return;
  }

  const isError = bannerMode === "error";
  const statusText = runbarState.label || runbarState.status || "";
  const metaText = runbarState.meta || "";

  topBanner.classList.remove("hidden");
  topBanner.classList.toggle("gh-banner--error", isError);
  topBanner.classList.toggle("gh-banner--info", !isError);

  topBanner.innerHTML = `
    <button class="gh-alert__close" id="runAlertClose" type="button" aria-label="Fermer">✕</button>
    <span class="mono">run_id=${runbarState.run_id || "-"}</span>
    <span class="gh-alert__status">${statusText}</span>
    ${metaText ? `<span class="gh-alert__meta">${metaText}</span>` : ""}
  `;

  const closeBtn = topBanner.querySelector("#runAlertClose");
  if (closeBtn) {
    closeBtn.onclick = () => {
      topBanner.classList.add("hidden");
      topBanner.innerHTML = "";
      topBanner.classList.remove("gh-banner--error", "gh-banner--info");
    };
  }
}
