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

export function renderGlobalNav() {
  const host = document.getElementById("globalNavHost");
  if (!host) return;

  const model = getNavModel();

  host.innerHTML = `
    <div id="globalNav" class="global-nav hidden">
      <div class="global-nav__panel">
        <h3>Navigation</h3>

        <a href="#dashboard" class="${model.activeDashboard ? "is-active" : ""}">
          Dashboard
        </a>

        <a href="#projects" class="${model.activeProjects ? "is-active" : ""}">
          Projects
        </a>
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
    const globalNav = document.getElementById("globalNav");

    if (menuBtn) {
      e.stopPropagation();
      globalNav?.classList.toggle("hidden");
      return;
    }

    if (!globalNav || globalNav.classList.contains("hidden")) return;

    const navLink = e.target.closest?.("#globalNav a");
    if (navLink) {
      globalNav.classList.add("hidden");
      return;
    }

    const insidePanel = e.target.closest?.(".global-nav__panel");
    if (!insidePanel) {
      globalNav.classList.add("hidden");
    }
  });

  window.addEventListener("hashchange", () => {
    const globalNav = document.getElementById("globalNav");
    globalNav?.classList.add("hidden");
  });
}

export function closeGlobalNav() {
  document.getElementById("globalNav")?.classList.add("hidden");
}

export function isGlobalNavOpen() {
  const el = document.getElementById("globalNav");
  return !!el && !el.classList.contains("hidden");
}
