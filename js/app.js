import { initRouter } from "./router.js";
import { store } from "./store.js";
import { mountAssistOverlay, bindGlobalAssistLauncher } from "./views/assist-overlay.js";
import { renderGlobalShell } from "./views/global-shell.js";
import { runAnalysis, resetAnalysisUi } from "./services/analysis-runner.js";

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

  bindAnalysisEvents();

  renderGlobalShell();
  mountAssistOverlay();
  bindGlobalAssistLauncher();
  initRouter();

  window.addEventListener("hashchange", () => {
    renderGlobalShell();
  });

  if (!location.hash) {
    location.hash = "#project/demo/situations";
  } else {
    renderGlobalShell();
  }
}

bootstrap();
