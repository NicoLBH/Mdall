import { initRouter } from "./router.js";
import { store } from "./store.js";
import { mountAssistOverlay, bindGlobalAssistLauncher } from "./views/assist-overlay.js";
import { renderGlobalHeader } from "./views/global-header.js";

function bindGlobalNav() {
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
    if (
      !globalNav.classList.contains("hidden") &&
      !globalNav.contains(e.target) &&
      e.target !== menuBtn
    ) {
      globalNav.classList.add("hidden");
    }
  });

  window.addEventListener("hashchange", () => {
    globalNav.classList.add("hidden");
  });
}

function rerenderGlobalShell() {
  renderGlobalHeader();
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
