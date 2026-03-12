import { initRouter } from "./router.js";
import { store } from "./store.js";
import { mountAssistOverlay, bindGlobalAssistLauncher } from "./views/assist-overlay.js";

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

function parseHash() {
  const hash = String(location.hash || "").replace(/^#/, "").trim();
  if (!hash) return ["dashboard"];
  return hash.split("/");
}

function getProjectDisplayName(projectId) {
  const explicitName =
    store.currentProject?.name ||
    store.currentProject?.title ||
    "";

  if (explicitName) return explicitName;
  if (projectId) return `Projet ${projectId}`;
  return "Projet";
}

function updateGlobalHeader() {
  const parts = parseHash();

  const primary = document.getElementById("ghHeaderPrimary");
  const secondary = document.getElementById("ghHeaderSecondary");
  const sep = document.getElementById("ghHeaderSep");

  if (!primary || !secondary || !sep) return;

  if (parts[0] === "project" && parts[1]) {
    const projectId = parts[1];
    const userName = store.user?.name || "user";
    const projectName = getProjectDisplayName(projectId);

    primary.textContent = userName;
    secondary.textContent = projectName;
    secondary.style.display = "";
    sep.style.display = "";
    return;
  }

  if (parts[0] === "projects") {
    primary.textContent = "Projects";
    secondary.textContent = "";
    secondary.style.display = "none";
    sep.style.display = "none";
    return;
  }

  primary.textContent = "Dashboard";
  secondary.textContent = "";
  secondary.style.display = "none";
  sep.style.display = "none";
}

function bootstrap() {
  console.log("RAPSOBOT V2 boot");

  store.user = {
    name: "demo"
  };

  initGlobalNav();
  mountAssistOverlay();
  bindGlobalAssistLauncher();
  initRouter();

  updateGlobalHeader();
  window.addEventListener("hashchange", updateGlobalHeader);

  if (!location.hash) {
    location.hash = "#project/demo/situations";
  } else {
    updateGlobalHeader();
  }
}

bootstrap();
