import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { signOut } from "../../assets/js/auth.js";

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


function getUserDisplayIdentity() {
  const firstName = String(store.user?.firstName || "").trim();
  const lastName = String(store.user?.lastName || "").trim();
  const fullName = String(store.user?.name || "").trim();
  const email = String(store.user?.email || "").trim();

  let resolvedFirstName = firstName;
  let resolvedLastName = lastName;

  if ((!resolvedFirstName || !resolvedLastName) && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (!resolvedFirstName && parts.length) {
      resolvedFirstName = parts[0] || "";
    }
    if (!resolvedLastName && parts.length > 1) {
      resolvedLastName = parts.slice(1).join(" ");
    }
  }

  const fullLabel = [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ").trim() || fullName;

  return {
    firstName: resolvedFirstName,
    lastName: resolvedLastName,
    fullLabel: fullLabel || email || "Utilisateur",
    secondaryLabel: fullLabel ? (email || "") : (email || "")
  };
}

function getHeaderModel() {
  const parts = parseHash();
  const inProject = parts[0] === "project" && !!parts[1];

  if (inProject) {
    const currentTab = String(parts[2] || "").trim();
    const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituation = currentTab === "situations" && selectedSituationId
      ? (Array.isArray(store.situationsView?.data)
          ? store.situationsView.data.find((situation) => String(situation?.id || "") === selectedSituationId)
          : null)
      : null;

    return {
      primary: store.user?.name || "Utilisateur",
      secondary: getProjectDisplayName(parts[1]),
      showSecondary: true,
      href: `#project/${parts[1]}/documents`,
      headerClass: "gh-header gh-header--project",
      breadcrumbTabLabel: selectedSituation ? "Situations" : "",
      breadcrumbCurrentLabel: selectedSituation ? String(selectedSituation.title || "Situation") : "",
      showSituationBreadcrumb: !!selectedSituation,
      projectId: parts[1]
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

  if (parts[0] === "settings" || parts[0] === "profile") {
    return {
      primary: "Réglages",
      secondary: "",
      showSecondary: false,
      href: "#settings/profile",
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
  const isAuthenticatedUser = Boolean(store.user?.email && store.user?.id);
  const identity = getUserDisplayIdentity();
  const topLabel = identity.fullLabel || identity.secondaryLabel || "Utilisateur";
  const secondaryLabel = identity.fullLabel ? (identity.secondaryLabel || "") : "";

  return `
    <div class="gh-user-menu gh-action" id="ghUserMenu">
      <button
        id="ghUserMenuBtn"
        class="gh-user-menu__trigger gh-action__button"
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-label="Compte utilisateur"
      >
        <img src="${currentAvatar}" alt="Avatar" class="documents-commit-shell__avatar-img gh-user-menu__avatar-img">
      </button>

      <div class="gh-user-menu__dropdown gh-menu" id="ghUserMenuDropdown" role="menu">
        <div class="gh-user-menu__profile-head" role="presentation">
          <img src="${currentAvatar}" alt="Avatar" class="gh-user-menu__profile-avatar">
          <span class="gh-user-menu__profile-meta">
            <span class="gh-user-menu__profile-name">${topLabel}</span>
            ${secondaryLabel ? `<span class="gh-user-menu__profile-email">${secondaryLabel}</span>` : ""}
          </span>
        </div>

        <div class="gh-user-menu__divider" role="separator"></div>

        <a href="#profile" class="gh-user-menu__item" role="menuitem">
          <span class="gh-user-menu__item-icon">${svgIcon("person", { className: "octicon octicon-person" })}</span>
          <span class="gh-user-menu__item-meta">
            <span class="gh-user-menu__item-name">Profile</span>
          </span>
        </a>

        <a href="#projects" class="gh-user-menu__item" role="menuitem">
          <span class="gh-user-menu__item-icon">${svgIcon("repo", { className: "octicon octicon-repo" })}</span>
          <span class="gh-user-menu__item-meta">
            <span class="gh-user-menu__item-name">Projets</span>
          </span>
        </a>

        <div class="gh-user-menu__divider" role="separator"></div>

        <a href="#settings/profile" class="gh-user-menu__item" role="menuitem">
          <span class="gh-user-menu__item-icon">${svgIcon("gear", { className: "octicon octicon-gear" })}</span>
          <span class="gh-user-menu__item-meta">
            <span class="gh-user-menu__item-name">Réglages</span>
          </span>
        </a>

        <div class="gh-user-menu__divider" role="separator"></div>

        <button type="button" class="gh-user-menu__item" id="ghUserMenuLogout" role="menuitem">
          <span class="gh-user-menu__item-icon">${svgIcon("sign-out", { className: "octicon octicon-sign-out" })}</span>
          <span class="gh-user-menu__item-meta">
            <span class="gh-user-menu__item-name">Se déconnecter</span>
          </span>
        </button>
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

        <div class="gh-brand-wrap">
          <a class="gh-brand" href="${model.href}">
            ${svgIcon("heimdall", { className: "gh-brand__logo", title: "Heimdall" })}
            <span class="gh-brand__name">${model.primary}</span>
            ${
              model.showSecondary
                ? `
                  <span class="gh-brand__sep">/</span>
                  <span class="gh-brand__repo">${model.secondary}</span>

                  <span id="projectCompactTab" class="gh-brand__compact-tab" aria-hidden="true">
                    <span class="gh-brand__sep">/</span>
                    <span id="projectCompactTabLabel" class="gh-brand__compact-tab-label">
                      <span id="projectCompactTabLabelPrimary" class="gh-brand__compact-tab-label-primary"></span>
                      <span id="projectCompactTabLabelSuffix" class="gh-brand__compact-tab-label-suffix"></span>
                    </span>
                  </span>
                `
                : ``
            }
          </a>

          ${model.showSituationBreadcrumb ? `
            <span class="gh-brand__trail">
              <span class="gh-brand__sep">/</span>
              <button type="button" class="gh-brand__trail-btn" id="globalHeaderSituationsBack">${model.breadcrumbTabLabel}</button>
              <span class="gh-brand__sep">/</span>
              <span class="gh-brand__trail-current">${model.breadcrumbCurrentLabel}</span>
            </span>
          ` : ""}
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
    const logoutBtn = event.target.closest?.("#ghUserMenuLogout");
    const situationsBackBtn = event.target.closest?.("#globalHeaderSituationsBack");
    const menu = document.getElementById("ghUserMenu");
    const dropdown = document.getElementById("ghUserMenuDropdown");
    const btn = document.getElementById("ghUserMenuBtn");

    if (situationsBackBtn) {
      if (store.situationsView && typeof store.situationsView === "object") {
        store.situationsView.selectedSituationId = null;
      }
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      return;
    }

    if (logoutBtn) {
      signOut()
        .catch((error) => console.error("signOut failed", error))
        .finally(() => {
          window.location.replace(new URL("login.html", window.location.href).toString());
        });
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
