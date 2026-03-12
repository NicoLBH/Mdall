let runbarState = {
  run_id: null,
  status: null
};

export function renderProjectSituationsRunbar() {
  return `
    <div class="project-runbar">
      <div class="project-runbar__left">
        <div class="gh-split-btn" id="runSplitBtn">
          <button class="gh-btn gh-btn--primary" id="runAnalysisBtnTop">Run analysis</button>
          <button class="gh-btn gh-btn--primary gh-btn--split" id="runMenuBtn">▼</button>
          <div class="gh-menu" id="runMenu">
            <div class="gh-menu__item" data-action="run">Run analysis</div>
            <div class="gh-menu__item" data-action="reset">Reset</div>
          </div>
        </div>
      </div>
    </div>
    <div id="runStatusAlertHost"></div>
  `;
}

export function bindProjectSituationsRunbar(root = document) {

  const runBtn = root.querySelector("#runAnalysisBtnTop");
  const menuBtn = root.querySelector("#runMenuBtn");
  const menu = root.querySelector("#runMenu");

  if (!runBtn || !menuBtn || !menu) return;
  /* run direct */
  runBtn.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("runAnalysis"));
  });
  /* toggle menu */
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("gh-menu--open");
  });
  /* menu actions */
  menu.addEventListener("click", (e) => {
    const item = e.target.closest(".gh-menu__item");
    if (!item) return;
    const action = item.dataset.action;
    menu.classList.remove("gh-menu--open");
    if (action === "run") {
      document.dispatchEvent(new CustomEvent("runAnalysis"));
    }
    if (action === "reset") {
      document.dispatchEvent(new CustomEvent("resetAnalysisUi"));
    }
  });
  /* close menu outside */
  document.addEventListener("click", () => {
    menu.classList.remove("gh-menu--open");
  });
}

export function syncProjectSituationsRunbar(run = {}) {
  runbarState = run;
  const host = document.getElementById("runStatusAlertHost");
  if (!host) return;
  if (!run.run_id && !run.status) {
    host.innerHTML = "";
    return;
  }
  const isError = run.status === "error";
  host.innerHTML = `
    <div class="gh-alert ${isError ? "gh-alert--error" : ""}">
      <button class="gh-alert__close" id="runAlertClose">✕</button>
      <span class="mono">run_id=${run.run_id || "-"}</span>
      <span class="gh-alert__status">${run.status || ""}
      </span>
    </div>
  `;
  const closeBtn = host.querySelector("#runAlertClose");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      host.innerHTML = "";
    });
  }
}
