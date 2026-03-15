import { initRouter } from "./router.js";
import { store } from "./store.js";
import { mountAssistOverlay, bindGlobalAssistLauncher } from "./views/assist-overlay.js";
import { renderGlobalShell } from "./views/global-shell.js";
import { runAnalysis, resetAnalysisUi } from "./services/analysis-runner.js";
import { ensureProjectAutomationDefaults } from "./services/project-automation.js";

let analysisEventsBound = false;

function bindAnalysisEvents() {
  if (analysisEventsBound) return;

  document.addEventListener("runAnalysis", () => {
    runAnalysis();
  });

  document.addEventListener("resetAnalysisUi", () => {
    resetAnalysisUi();
  });

  analysisEventsBound = true;
}

function bootstrap() {
  console.log("RAPSOBOT V2 boot");

  store.user = {
    name: "demo"
  };

  ensureProjectAutomationDefaults();
  bindAnalysisEvents();

  // Très important :
  // le global shell doit être rerendu AVANT le router sur chaque hashchange,
  // pour que mountProjectShellChrome capture les bons noeuds du header courant.
  renderGlobalShell();
  window.addEventListener("hashchange", renderGlobalShell);

  mountAssistOverlay();
  bindGlobalAssistLauncher();
  initRouter();

  if (!location.hash) {
    location.hash = "#project/demo/situations";
  }
}

bootstrap();
