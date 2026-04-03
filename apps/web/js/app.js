import { initRouter, rerenderRoute } from "./router.js";
import { store } from "./store.js";
import { mountAssistOverlay, bindGlobalAssistLauncher } from "./views/assist-overlay.js";
import { renderGlobalShell } from "./views/global-shell.js";
import { runAnalysis, resetAnalysisUi } from "./services/analysis-runner.js";
import { ensureProjectAutomationDefaults } from "./services/project-automation.js";
import { bindGhActionButtons } from "./views/ui/gh-split-button.js";
import { initializeDemoContext } from "./demo-context.js";
import { PROJECT_IDENTITY_UPDATED_EVENT } from "./services/project-supabase-sync.js";

let analysisEventsBound = false;
let projectIdentityEventsBound = false;

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

function bindProjectIdentityEvents() {
  if (projectIdentityEventsBound) return;

  window.addEventListener(PROJECT_IDENTITY_UPDATED_EVENT, () => {
    renderGlobalShell();
    rerenderRoute();
  });

  projectIdentityEventsBound = true;
}

function bootstrap() {
  console.log("RAPSOBOT V2 boot");

  initializeDemoContext();

  ensureProjectAutomationDefaults();
  bindProjectIdentityEvents();
  bindAnalysisEvents();
  bindGhActionButtons();

  renderGlobalShell();
  window.addEventListener("hashchange", renderGlobalShell);

  mountAssistOverlay();
  bindGlobalAssistLauncher();
  initRouter();

  if (!location.hash) {
    location.hash = "#projects";
  }
}

bootstrap();
