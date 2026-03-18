import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { DEMO_USERS, setCurrentDemoUser } from "../demo-context.js";

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
      primary: store.user?.name || "Utilisateur",
      secondary: getProjectDisplayName(parts[1]),
      showSecondary: true,
      href: `#project/${parts[1]}/documents`,
      headerClass: "gh-header gh-header--project"
    };
  }

  if (parts[0] === "projects") {
    return {
      primary: "Projets",
      secondary: "",
      showSecondary: false,
      href: "#projects",
      headerClass: "gh-header gh-header--global"
    };
  }

  return {
    primary: "Accueil",
    secondary: "",
    showSecondary: false,
    href: "#dashboard",
    headerClass: "gh-header gh-header--global"
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
          ${svgIcon("three-bars", { className: "octicon octicon-three-bars" })}
        </button>

        <a class="gh-brand" href="${model.href}">
          <img class="gh-brand__logo" src="assets/images/logo.png" />
          <span class="gh-brand__name">${model.primary}</span>
          ${
            model.showSecondary
              ? `
                <span class="gh-brand__sep">/</span>
                <span class="gh-brand__repo">${model.secondary}</span>

                <span id="projectCompactTab" class="gh-brand__compact-tab" aria-hidden="true">
                  <span class="gh-brand__sep">/</span>
                  <span id="projectCompactTabLabel" class="gh-brand__compact-tab-label"></span>
                </span>
              `
              : ``
          }
        </a>
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
