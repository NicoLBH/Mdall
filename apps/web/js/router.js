import { renderGlobalDashboard } from "./views/global-dashboard.js";
import { renderProjectsList } from "./views/projects-list.js";
import { renderProjectLayout } from "./views/project-layout.js";
import { renderPersonalSettings } from "./views/personal-settings.js";
import { renderMonCarnet } from "./views/mon-carnet.js";
import { renderTousLesSujets } from "./views/tous-les-sujets.js";
import { renderToutesLesPropositions } from "./views/toutes-les-propositions.js";
import { renderCopiloteTransversal } from "./views/copilote-transversal.js";
import { renderLeReferentiel } from "./views/le-referentiel.js";
import { ROUTE_DU_CARNET, adresseDunAncienLien } from "./services/mon-carnet.js";
import {
  LE_COPILOTE, LE_REFERENTIEL, TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS, cheminDe
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

  /**
   * **Le Copilote qui n'est d'aucun projet.**
   *
   * Même marque que les autres : `currentProjectId` nul. C'est elle que le
   * service lit pour n'envoyer aucun identifiant de chantier, et que le rail lit
   * pour demander à la base les discussions qui n'en portent aucun.
   */
  if (parts[0] === cheminDe(LE_COPILOTE)) {
    store.currentProjectId = null;
    unmountProjectShellChrome();
    renderCopiloteTransversal(root);
    return;
  }

  /**
   * **Le référentiel des formes.**
   *
   * Même marque que les autres : `currentProjectId` nul. Ici elle dit quelque
   * chose de plus fort qu'ailleurs — il n'y a pas de projet à mettre, parce que
   * le référentiel n'appartient à aucun.
   */
  if (parts[0] === cheminDe(LE_REFERENTIEL)) {
    store.currentProjectId = null;
    unmountProjectShellChrome();
    renderLeReferentiel(root);
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
    // **Un quatrième morceau dit quoi ouvrir en arrivant.**
    //
    // `#project/<projet>/sujets/<sujet>` ouvre ce sujet-là ; sans lui, l'onglet
    // s'ouvre sur sa liste, comme avant. C'est ce qui permet à un écran qui
    // traverse les projets de mener quelque part : une ligne y désigne un sujet
    // précis, et l'ouvrir dans son projet est la seule façon de le montrer
    // entier — avec son fil, ses pièces et son arborescence.
    renderProjectLayout(root, projectId, tab, { ouvrir: parts[3] || "" });
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
