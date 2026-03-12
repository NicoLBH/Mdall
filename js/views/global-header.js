import { store } from "../store.js";

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

function getHeaderModel() {
  const parts = parseHash();
  const inProject = parts[0] === "project" && !!parts[1];

  if (inProject) {
    return {
      primary: store.user?.name || "user",
      secondary: getProjectDisplayName(parts[1]),
      showSecondary: true,
      href: `#project/${parts[1]}/dashboard`,
      headerClass: "gh-header gh-header--project"
    };
  }

  if (parts[0] === "projects") {
    return {
      primary: "Projects",
      secondary: "",
      showSecondary: false,
      href: "#projects",
      headerClass: "gh-header gh-header--global"
    };
  }

  return {
    primary: "Dashboard",
    secondary: "",
    showSecondary: false,
    href: "#dashboard",
    headerClass: "gh-header gh-header--global"
  };
}

export function renderGlobalHeader() {
  const host = document.getElementById("globalHeaderHost");
  if (!host) return;

  const model = getHeaderModel();

  host.innerHTML = `
    <header class="${model.headerClass}">
      <div class="gh-header__left">
        <button id="menuBtn" class="icon-btn" type="button" aria-label="Ouvrir le menu">☰</button>

        <a class="gh-brand" href="${model.href}">
          <img class="gh-brand__logo" src="logo.png" />
          <span class="gh-brand__name">${model.primary}</span>
          ${
            model.showSecondary
              ? `<span class="gh-brand__sep">/</span><span class="gh-brand__repo">${model.secondary}</span>`
              : ``
          }
        </a>
      </div>

      <div class="gh-header__center"></div>

      <div class="gh-header__right">
        <div id="globalHeaderActions" class="gh-header__actions"></div>
      </div>
    </header>
  `;
}
