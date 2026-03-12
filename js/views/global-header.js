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
        <button id="menuBtn" class="icon-btn" type="button" aria-label="Ouvrir le menu">
          <svg aria-hidden="true" focusable="false" class="octicon octicon-three-bars" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom"><path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"></path></svg>
        </button>

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
