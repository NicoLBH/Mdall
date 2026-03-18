function parseHash() {
  const hash = String(location.hash || "").replace(/^#/, "").trim();
  if (!hash) return ["dashboard"];
  return hash.split("/");
}

function getNavModel() {
  const parts = parseHash();
  const active = parts[0] || "dashboard";

  return {
    activeDashboard: active === "dashboard",
    activeProjects: active === "projects" || active === "project"
  };
}

function homeIcon() {
  return `<svg aria-hidden="true" focusable="false" class="octicon octicon-home" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom;"><path d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366l5.25-4.2Zm1.25 1.171a.25.25 0 0 0-.312 0l-5.25 4.2a.25.25 0 0 0-.094.196v7.019c0 .138.112.25.25.25H5.5V8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v5.25h2.75a.25.25 0 0 0 .25-.25V6.23a.25.25 0 0 0-.094-.195Z"></path></svg>`;
}

function repoIcon() {
  return `<svg aria-hidden="true" focusable="false" class="octicon octicon-repo" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom;"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path></svg>`;
}

function closeIcon() {
  return `<svg aria-hidden="true" focusable="false" class="octicon octicon-x" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom;"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>`;
}

function renderNavLink({ href, icon, label, isActive = false }) {
  return `
    <a href="${href}" class="global-nav__link settings-nav__item ${isActive ? "is-active" : ""}">
      <span class="global-nav__icon settings-nav__icon">${icon}</span>
      <span class="global-nav__label">${label}</span>
    </a>
  `;
}

export function renderGlobalNav() {
  const host = document.getElementById("globalNavHost");
  if (!host) return;

  const model = getNavModel();

  host.innerHTML = `
    <div id="globalNav" class="global-nav hidden" aria-hidden="true">
      <div class="global-nav__panel settings-nav settings-nav--parametres">
        <div class="global-nav__topbar">
          <img class="global-nav__brand-logo" src="assets/images/logo.png" alt="Rapsobot">
          <button id="globalNavCloseBtn" class="global-nav__close" type="button" aria-label="Fermer le menu">
            ${closeIcon()}
          </button>
        </div>

        <div class="global-nav__group settings-nav__group settings-nav__group--project">
          ${renderNavLink({ href: "#dashboard", icon: homeIcon(), label: "Accueil", isActive: model.activeDashboard })}
          ${renderNavLink({ href: "#projects", icon: repoIcon(), label: "Projets", isActive: model.activeProjects })}
        </div>
      </div>
    </div>
  `;
}

let globalNavBound = false;

export function bindGlobalNav() {
  if (globalNavBound) return;
  globalNavBound = true;

  document.addEventListener("click", (e) => {
    const menuBtn = e.target.closest?.("#menuBtn");
    const closeBtn = e.target.closest?.("#globalNavCloseBtn");
    const globalNav = document.getElementById("globalNav");

    if (menuBtn) {
      const isHidden = globalNav?.classList.contains("hidden");
      globalNav?.classList.toggle("hidden", !isHidden);
      globalNav?.setAttribute("aria-hidden", isHidden ? "false" : "true");
      return;
    }

    if (closeBtn) {
      globalNav?.classList.add("hidden");
      globalNav?.setAttribute("aria-hidden", "true");
      return;
    }

    if (globalNav && !globalNav.classList.contains("hidden") && !globalNav.querySelector(".global-nav__panel")?.contains(e.target)) {
      globalNav.classList.add("hidden");
      globalNav.setAttribute("aria-hidden", "true");
    }
  });
}

export function closeGlobalNav() {
  const globalNav = document.getElementById("globalNav");
  globalNav?.classList.add("hidden");
  globalNav?.setAttribute("aria-hidden", "true");
}
