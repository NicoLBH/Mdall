import { renderGlobalDashboard } from "./views/global-dashboard.js";
import { renderProjectsList } from "./views/projects-list.js";
import { renderProjectLayout } from "./views/project-layout.js";
import { getStore } from "./store.js";

function parseHash() {
  const hash = location.hash.replace(/^#/, "").trim();
  if (!hash) return ["dashboard"];
  return hash.split("/");
}

function route() {
  const parts = parseHash();
  const root = document.getElementById("app");

  if (!root) return;

  root.innerHTML = "";

  if (parts[0] === "dashboard") {
    store.currentProjectId = null;
    renderGlobalDashboard(root);
    return;
  }

  if (parts[0] === "projects") {
    store.currentProjectId = null;
    renderProjectsList(root);
    return;
  }

  if (parts[0] === "project") {
    const projectId = parts[1];
    const tab = parts[2] || "dashboard";

    store.currentProjectId = projectId || null;
    renderProjectLayout(root, projectId, tab);
    return;
  }

  store.currentProjectId = null;
  renderGlobalDashboard(root);
}

export function initRouter() {
  window.addEventListener("hashchange", route);
  route();
}

export function rerenderRoute() {
  route();
}
