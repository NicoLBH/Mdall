import { initRouter } from "./router.js";
import { store } from "./store.js";
import { runAnalysis, resetAnalysisUi } from "./services/analysis-runner.js";

function initGlobalNav() {
  const menuBtn = document.getElementById("menuBtn");
  const globalNav = document.getElementById("globalNav");

  if (!menuBtn || !globalNav) return;

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    globalNav.classList.toggle("hidden");
  });

  globalNav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      globalNav.classList.add("hidden");
      return;
    }
    if (e.target === globalNav) {
      globalNav.classList.add("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (!globalNav.classList.contains("hidden") && !globalNav.contains(e.target) && e.target !== menuBtn) {
      globalNav.classList.add("hidden");
    }
  });

  window.addEventListener("hashchange", () => {
    globalNav.classList.add("hidden");
  });
}

function bootstrap() {
  console.log("RAPSOBOT V2 boot");
  store.user = {
    name: "demo"
  };
  initGlobalNav();
  initRouter();
  if (!location.hash) {
    location.hash = "#dashboard";
  }
}

function initTopActions() {
  const runBtn = document.getElementById("runBtnTop");
  const resetBtn = document.getElementById("resetBtnTop");

  if (runBtn) runBtn.addEventListener("click", runAnalysis);
  if (resetBtn) resetBtn.addEventListener("click", resetAnalysisUi);
}

bootstrap();
initTopActions();
