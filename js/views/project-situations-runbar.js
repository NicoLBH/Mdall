let runbarState = {
  run_id: null,
  status: null,
  label: "",
  meta: "",
  isBusy: false
};

export function renderProjectSituationsRunbar() {
  return `
    <div class="project-runbar">
      <div class="project-runbar__left">
        <div class="gh-split-btn" id="runSplitBtn">
          <span data-component="icon">
            <svg aria-hidden="true" focusable="false" class="octicon octicon-play" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"></path></svg>
          </span>
          <span class="gh-btn gh-btn--primary" id="runAnalysisBtnTop">Run analysis</span>
          <span class="gh-btn gh-btn--primary gh-btn--split" id="runMenuBtn" aria-label="Ouvrir le menu d’analyse">▼</span>
          <div class="gh-menu" id="runMenu">
            <div class="gh-menu__item" data-action="run">
              <span data-component="icon">
                <svg aria-hidden="true" focusable="false" class="octicon octicon-play" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"></path></svg>
              </span>
              <span>Run analysis</span>
            </div>
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

  const host = document.getElementById("runStatusAlertHost");
  const runBtn = document.getElementById("runAnalysisBtnTop");
  const menuBtn = document.getElementById("runMenuBtn");

  const isBusy = !!runbarState.isBusy || runbarState.status === "running";

  if (runBtn) {
    runBtn.disabled = isBusy;
    runBtn.classList.toggle("is-disabled", isBusy);
    runBtn.textContent = isBusy ? "Analysis running…" : "Run analysis";
  }

  if (menuBtn) {
    menuBtn.disabled = false;
  }

  if (!host) return;

  if (!runbarState.run_id && !runbarState.status) {
    host.innerHTML = "";
    return;
  }

  const isError = runbarState.status === "error";
  const statusText = runbarState.label || runbarState.status || "";
  const metaText = runbarState.meta || "";

  host.innerHTML = `
    <div id ="topBanner" class="gh-banner ${isError ? "gh-banner--error" : ""}">
      <button class="gh-alert__close" id="runAlertClose">✕</button>
      <span class="mono">run_id=${runbarState.run_id || "-"}</span>
      <span class="gh-alert__status">${statusText}</span>
      ${metaText ? `<span class="gh-alert__meta">${metaText}</span>` : ""}
    </div>
  `;

  const closeBtn = host.querySelector("#runAlertClose");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      host.innerHTML = "";
    });
  }
}
