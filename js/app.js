import { initRouter } from "./router.js";
import { store } from "./store.js";
import { mountAssistOverlay, bindGlobalAssistLauncher } from "./views/assist-overlay.js";
import { renderGlobalShell } from "./views/global-shell.js";
import { runAnalysis, resetAnalysisUi } from "./services/analysis-runner.js";
import { ensureProjectAutomationDefaults } from "./services/project-automation.js";
import { bindGhActionButtons } from "./views/ui/gh-split-button.js";
import { initializeDemoContext, getPersistedDemoProjectId } from "./demo-context.js";

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

  initializeDemoContext();

  ensureProjectAutomationDefaults();
  bindAnalysisEvents();
  bindGhActionButtons();

  renderGlobalShell();
  window.addEventListener("hashchange", renderGlobalShell);

  mountAssistOverlay();
  bindGlobalAssistLauncher();
  initRouter();

  if (!location.hash) {
    location.hash = `#project/${getPersistedDemoProjectId()}/situations`;
  }
}

bootstrap();
