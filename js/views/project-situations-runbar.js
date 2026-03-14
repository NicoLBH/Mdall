import { svgIcon } from "../ui/icons.js";

let runbarState = {
  run_id: null,
  status: null,
  label: "",
  meta: "",
  isBusy: false
};

const PLAY_ICON = svgIcon("play", { className: "octicon octicon-play" });

export function renderProjectSituationsRunbar() {
  return `
    <div class="project-runbar" data-chrome-visibility="always">
      <div class="project-runbar__left">
        <div class="gh-split-btn" id="runSplitBtn">
          <span data-component="icon" class="gh-btn gh-btn--primary gh-btn-icon">
            ${PLAY_ICON}
          </span>
          <span class="gh-btn gh-btn--primary" id="runAnalysisBtnTop">Analyser</span>
          <span class="gh-btn gh-btn--primary gh-btn--split" id="runMenuBtn" aria-label="Ouvrir le menu d’analyse">▼</span>
          <div class="gh-menu" id="runMenu">
            <div class="gh-menu__item" data-action="run">
              <span data-component="icon">
                ${PLAY_ICON}
              </span>
              <span>Analyser</span>
            </div>
            <div class="gh-menu__item" data-action="reset">Reset</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderProjectSituationsTopBanner() {
  return `<div id="topBanner" class="gh-banner hidden" role="status" aria-live="polite"></div>`;
}

export function bindProjectSituationsRunbar(root = document) {
  const runBtn = root.querySelector("#runAnalysisBtnTop");
  const menuBtn = root.querySelector("#runMenuBtn");
  const menu = root.querySelector("#runMenu");

  if (!runBtn || !menuBtn || !menu) return;

  runBtn.addEventListener("click", () => {
    if (runbarState.isBusy) return;
    document.dispatchEvent(new CustomEvent("runAnalysis"));
  });

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("gh-menu--open");
  });

  menu.addEventListener("click", (e) => {
    const item = e.target.closest(".gh-menu__item");
    if (!item) return;

    const action = item.dataset.action;
    menu.classList.remove("gh-menu--open");

    if (action === "run") {
      if (runbarState.isBusy) return;
      document.dispatchEvent(new CustomEvent("runAnalysis"));
    }

    if (action === "reset") {
      document.dispatchEvent(new CustomEvent("resetAnalysisUi"));
    }
  });

  document.addEventListener("click", () => {
    menu.classList.remove("gh-menu--open");
  });

  syncProjectSituationsRunbar(runbarState);
}

export function syncProjectSituationsRunbar(run = {}) {
  runbarState = {
    ...runbarState,
    ...run
  };

  const runBtn = document.getElementById("runAnalysisBtnTop");
  const menuBtn = document.getElementById("runMenuBtn");
  const topBanner = document.getElementById("topBanner");

  const isBusy = !!runbarState.isBusy || runbarState.status === "running";
  const bannerMode = runbarState.status === "running"
    ? "running"
    : runbarState.status === "error"
      ? "error"
      : null;

  if (runBtn) {
    if ("disabled" in runBtn) runBtn.disabled = isBusy;
    runBtn.classList.toggle("is-disabled", isBusy);
    runBtn.textContent = isBusy ? "Analyse en cours…" : "Analyser";
  }

  if (menuBtn && "disabled" in menuBtn) {
    menuBtn.disabled = false;
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
