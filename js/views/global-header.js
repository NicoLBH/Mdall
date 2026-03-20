import { store } from "../store.js";

function parseHash() {
  const hash = String(location.hash || "").replace(/^#/, "").trim();
  if (!hash) return ["dashboard"];
  return hash.split("/");
}

function menuIcon() {
  return `<svg aria-hidden="true" focusable="false" class="octicon octicon-three-bars" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom;"><path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H1.75Z"></path></svg>`;
}

function getHeaderModel() {
  const [root] = parseHash();
  const isProjectRoute = root === "project";
  const projectName = String(store.currentProject?.name || store.projectForm?.projectName || "Projet demo").trim();

  return {
    isProjectRoute,
    headerClass: isProjectRoute ? "gh-header gh-header--project" : "gh-header gh-header--global",
    repoLabel: isProjectRoute ? projectName : "Projets",
    brandHref: isProjectRoute
      ? `#project/${store.currentProjectId || ""}/documents`
      : "#projects"
  };
}

function renderUserMenu() {
  const currentAvatar = store.user?.avatar || "assets/images/260093543.png";
  const otherUsers = DEMO_USERS.filter((user) => user.id !== store.user?.id);

  return `
    <div class="gh-user-menu gh-action" id="ghUserMenu">
      <button
        id="ghUserMenuBtn"
        class="gh-user-menu__trigger gh-action__button"
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-label="Changer de contributeur"
      >
        <img src="${currentAvatar}" alt="Avatar" class="documents-commit-shell__avatar-img gh-user-menu__avatar-img">
      </button>

      <div class="gh-user-menu__dropdown gh-menu" id="ghUserMenuDropdown" role="menu">
        ${otherUsers.map((user) => `
          <button
            type="button"
            class="gh-user-menu__item"
            data-user-switch="${user.id}"
            role="menuitem"
          >
            <img src="${user.avatar}" alt="" class="gh-user-menu__item-avatar">
            <span class="gh-user-menu__item-meta">
              <span class="gh-user-menu__item-name">${user.firstName} ${user.lastName}</span>
              <span class="gh-user-menu__item-role">${user.role}</span>
            </span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderGlobalHeader() {
  const host = document.getElementById("globalHeaderHost");
  if (!host) return;

  const model = getHeaderModel();

  host.innerHTML = `
    <header class="${model.headerClass}">
      <div class="gh-header__left">
        <button id="menuBtn" class="icon-btn" type="button" aria-label="Ouvrir le menu">
          ${menuIcon()}
        </button>

        <a class="gh-brand" href="${model.brandHref}">
          <img class="gh-brand__logo" src="assets/images/logo.png" alt="Rapsobot">
          <span class="gh-brand__name">RAPSOBOT</span>
          <span class="gh-brand__sep">/</span>
          <span class="gh-brand__repo">${model.repoLabel}</span>
        </a>

        <div id="projectCompactTab" class="gh-brand__compact-tab is-empty" aria-hidden="true">
          <span class="gh-brand__compact-tab-label" id="projectCompactTabLabel"></span>
        </div>
      </div>

      <div class="gh-header__center"></div>
      <div class="gh-header__right">
        <div id="globalHeaderActions" class="gh-header__actions">
          ${renderUserMenu()}
        </div>
      </div>
    </header>
  `;
}

let userMenuBound = false;

export function bindGlobalHeader() {
  if (userMenuBound) return;

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("#ghUserMenuBtn");
    const switchBtn = event.target.closest?.("[data-user-switch]");
    const menu = document.getElementById("ghUserMenu");
    const dropdown = document.getElementById("ghUserMenuDropdown");
    const btn = document.getElementById("ghUserMenuBtn");

    if (switchBtn) {
      setCurrentDemoUser(switchBtn.dataset.userSwitch || "");
      renderGlobalHeader();
      return;
    }

    if (trigger) {
      const wrapper = document.getElementById("ghUserMenu");
      const isOpen = wrapper?.classList.contains("is-open");
      wrapper?.classList.toggle("is-open", !isOpen);
      btn?.setAttribute("aria-expanded", isOpen ? "false" : "true");
      return;
    }

    if (menu && !menu.contains(event.target)) {
      menu.classList.remove("is-open");
      dropdown?.classList.remove("gh-menu--open");
      btn?.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("click", () => {
    const wrapper = document.getElementById("ghUserMenu");
    const dropdown = document.getElementById("ghUserMenuDropdown");
    if (!wrapper || !dropdown) return;
    dropdown.classList.toggle("gh-menu--open", wrapper.classList.contains("is-open"));
  });

  userMenuBound = true;
}
