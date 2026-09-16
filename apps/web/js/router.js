import { renderGlobalDashboard } from "./views/global-dashboard.js";
import { renderProjectsList } from "./views/projects-list.js";
import { renderProjectLayout } from "./views/project-layout.js";
import { renderPersonalSettings } from "./views/personal-settings.js";
import { renderMonCarnet } from "./views/mon-carnet.js";
import { renderTousLesSujets } from "./views/tous-les-sujets.js";
import { renderToutesLesPropositions } from "./views/toutes-les-propositions.js";
import { ROUTE_DU_CARNET, adresseDunAncienLien } from "./services/mon-carnet.js";
import {
  TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS, cheminDe
} from "./services/ecrans-transversaux.js";
import { unmountProjectShellChrome } from "./views/project-shell-chrome.js";
import { store } from "./store.js";
import { syncCurrentProjectFromRoute } from "./demo-context.js";

function parseHash() {
  const hash = location.hash.replace(/^#/, "").trim();
  if (!hash) return ["projects"];
  return hash.split("/");
}

function route() {
  const parts = parseHash();
  const root = document.getElementById("app");

  if (!root) return;

  root.innerHTML = "";
  root.style.padding = "";
  document.body.classList.remove("route--projects-list");

  if (parts[0] === "dashboard") {
    store.currentProjectId = null;
    unmountProjectShellChrome();
    renderGlobalDashboard(root);
    return;
  }

  if (parts[0] === "projects") {
    store.currentProjectId = null;
    unmountProjectShellChrome();
    renderProjectsList(root);
    return;
  }

  // Mon carnet. Il n'a pas de projet, et c'est ce qui le définit : une situation
  // dit ce qu'une personne se donne à faire, à travers tous ses chantiers.
  // `currentProjectId` nul est la seule chose qui distingue les deux écrans, et
  // c'est `estMonCarnet` qui la lit (étape 3).
  if (parts[0] === "situations") {
    store.currentProjectId = null;
    unmountProjectShellChrome();
    renderMonCarnet(root);
    return;
  }

  /**
   * **Les deux écrans qui traversent les projets.**
   *
   * Ils se reconnaissent à la même chose que le carnet : `currentProjectId` nul.
   * C'est la seule marque qui distingue « tous mes projets » de « celui-ci », et
   * elle vit dans le magasin — un second drapeau dirait un jour autre chose que
   * le premier (règle 4).
   */
  if (parts[0] === cheminDe(TOUS_LES_SUJETS)) {
    store.currentProjectId = null;
    unmountProjectShellChrome();
    renderTousLesSujets(root);
    return;
  }

  if (parts[0] === cheminDe(TOUTES_LES_PROPOSITIONS)) {
    store.currentProjectId = null;
    unmountProjectShellChrome();
    renderToutesLesPropositions(root);
    return;
  }

  if (parts[0] === "settings" || parts[0] === "profile") {
    store.currentProjectId = null;
    unmountProjectShellChrome();
    renderPersonalSettings(root);
    return;
  }

  if (parts[0] === "project") {
    const projectId = parts[1];
    const tab = parts[2] || "dashboard";

    // **Un ancien lien ne se perd pas en silence.** `#project/<id>/situations`
    // était l'adresse de l'onglet ; il n'existe plus, et sans ceci la page
    // retomberait sur Fichiers sans rien dire (règle 5).
    const ailleurs = adresseDunAncienLien(parts);
    if (ailleurs) {
      location.hash = ailleurs;
      return;
    }

    store.currentProjectId = projectId || null;
    syncCurrentProjectFromRoute(projectId);
    renderProjectLayout(root, projectId, tab);
    return;
  }

  store.currentProjectId = null;
  unmountProjectShellChrome();
  renderGlobalDashboard(root);
}

export function initRouter() {
  window.addEventListener("hashchange", route);
  route();
}

export function rerenderRoute() {
  route();
}
