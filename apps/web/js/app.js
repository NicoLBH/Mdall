import { initRouter, rerenderRoute } from "./router.js";
import { store } from "./store.js";
import { renderGlobalShell } from "./views/global-shell.js";
import { runAnalysis, resetAnalysisUi } from "./services/analysis-runner.js";
import { ensureProjectAutomationDefaults } from "./services/project-automation.js";
import { bindGhActionButtons } from "./views/ui/gh-split-button.js";
import { initializeDemoContext } from "./demo-context.js";
import { PROJECT_IDENTITY_UPDATED_EVENT } from "./services/project-supabase-sync.js";
import { requireAuth } from "../assets/js/auth.js";
import { hydrateStoreUserPublicProfile } from "./services/profile-supabase-sync.js";

let analysisEventsBound = false;
let projectIdentityEventsBound = false;

function bindAnalysisEvents() {
  if (analysisEventsBound) return;

  document.addEventListener("runAnalysis", () => {
    runAnalysis();
  });

  document.addEventListener("resetAnalysisUi", () => {
    resetAnalysisUi();
  });

  analysisEventsBound = true;
}

function bindProjectIdentityEvents() {
  if (projectIdentityEventsBound) return;

  window.addEventListener(PROJECT_IDENTITY_UPDATED_EVENT, () => {
    renderGlobalShell();
    rerenderRoute();
  });

  projectIdentityEventsBound = true;
}

async function bootstrap() {

  const authenticatedUser = await requireAuth();
  if (!authenticatedUser) return;

  store.user = {
    id: authenticatedUser.id,
    email: authenticatedUser.email || "",
    firstName: authenticatedUser.user_metadata?.first_name || "",
    lastName: authenticatedUser.user_metadata?.last_name || "",
    name:
      authenticatedUser.user_metadata?.full_name
      || authenticatedUser.user_metadata?.name
      || authenticatedUser.email
      || "Utilisateur",
    role: authenticatedUser.user_metadata?.role || "Utilisateur",
    avatar: "assets/images/260093543.png"
  };

  await hydrateStoreUserPublicProfile().catch((error) => {
    console.warn("hydrateStoreUserPublicProfile failed", error);
  });

  initializeDemoContext();

  ensureProjectAutomationDefaults();
  bindProjectIdentityEvents();
  bindAnalysisEvents();
  bindGhActionButtons();

  renderGlobalShell();
  window.addEventListener("hashchange", renderGlobalShell);

  /**
   * **Le battement des venues.**
   *
   * Il mesure le temps où l'application est au premier plan et où quelqu'un l'a
   * touchée dans les cinq minutes — ni les écrans ouverts, ni les chantiers, ni
   * les gestes : une heure et une durée, rien d'autre
   * (`services/les-venues.js`).
   *
   * Chargé à la demande, après que tout le reste est en place : c'est une mesure,
   * et une mesure ne doit jamais retarder l'écran qu'elle mesure.
   */
  void (async () => {
    const [{ fairebattreLesVenues }, venues] = await Promise.all([
      import("./services/le-battement-des-venues.js"),
      import("./services/les-venues-supabase.js")
    ]);
    fairebattreLesVenues({
      commencerUneVenue: venues.commencerUneVenue,
      prolongerUneVenue: venues.prolongerUneVenue
    });
  })().catch(() => {
    // **Une mesure qui empêcherait de travailler serait retirée le lendemain.**
    // Si elle ne part pas, on ne compte pas, et l'application ne s'en aperçoit
    // pas.
  });

  initRouter();

  if (!location.hash) {
    location.hash = "#projects";
  }
}

bootstrap().catch((error) => {
  console.error("bootstrap failed", error);
});
