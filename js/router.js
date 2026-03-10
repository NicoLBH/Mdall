import { renderGlobalDashboard } from "./views/global-dashboard.js";
import { renderProjectsList } from "./views/projects-list.js";
import { renderProjectLayout } from "./views/project-layout.js";

function parseHash() {
  const hash = location.hash.replace("#", "");

  const parts = hash.split("/");

  return parts;
}

function route() {
  const parts = parseHash();

  const root = document.getElementById("app");

  if (!root) return;

  root.innerHTML = "";

  if (parts[0] === "dashboard") {
    renderGlobalDashboard(root);
    return;
  }

  if (parts[0] === "projects") {
    renderProjectsList(root);
    return;
  }

  if (parts[0] === "project") {
    const projectId = parts[1];
    const tab = parts[2] || "dashboard";

    renderProjectLayout(root, projectId, tab);
    return;
  }

  renderGlobalDashboard(root);
}

export function initRouter() {
  window.addEventListener("hashchange", route);
  route();
}
