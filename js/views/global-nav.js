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

export function bindGlobalNav() {
  const menuBtn = document.getElementById("menuBtn");
  const globalNav = document.getElementById("globalNav");

  if (!menuBtn || !globalNav) return;

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    globalNav.classList.toggle("hidden");
  });

  globalNav.addEventListener("click", (e) => {
    const target = e.target;

    if (target?.tagName === "A") {
      globalNav.classList.add("hidden");
      return;
    }

    if (target === globalNav) {
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
}
