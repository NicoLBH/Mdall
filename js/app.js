import { initRouter } from "./router.js";
import { store } from "./store.js";
import { mountAssistOverlay, bindGlobalAssistLauncher } from "./views/assist-overlay.js";
import { renderGlobalHeader } from "./views/global-header.js";
import { renderGlobalNav, bindGlobalNav } from "./views/global-nav.js";

function rerenderGlobalShell() {
  renderGlobalHeader();
  renderGlobalNav();
  bindGlobalNav();
  bindGlobalAssistLauncher();
}

function bootstrap() {
  console.log("RAPSOBOT V2 boot");

  store.user = {
    name: "demo"
  };

  rerenderGlobalShell();
  mountAssistOverlay();
  initRouter();

  window.addEventListener("hashchange", () => {
    rerenderGlobalShell();
  });

  if (!location.hash) {
    location.hash = "#project/demo/situations";
  } else {
    rerenderGlobalShell();
  }
}

bootstrap();
