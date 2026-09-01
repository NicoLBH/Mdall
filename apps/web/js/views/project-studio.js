import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { bindSideNavPanels } from "./ui/side-nav-layout.js";
import {
  renderNavList,
  renderNavListDivider,
  renderNavListGroup,
  renderNavListItem
} from "./ui/nav-list.js";
import {
  bindRailResizer,
  followRailScroll,
  railWidth,
  renderProjectRail
} from "./ui/project-rail.js";
import {
  copiloteConversationId,
  copiloteConversations,
  forgetConversationLocally,
  openConversation,
  renameConversationLocally,
  renderCopilote,
  startNewConversation
} from "./studio/copilote/copilote.js";
import { conversationTitle } from "../services/copilote-conversations.js";
import {
  deleteConversation,
  renameConversation
} from "../services/copilote-conversations-supabase.js";
import { renderSolidityClimate } from "./studio/solidity/solidity-climate.js";
import { renderSolidityGeorisks } from "./studio/solidity/solidity-georisks.js";
import { renderSolidityArkolia } from "./studio/socotec/socotec-enr-pv-hangard-neuf.js";
import { renderSeismicGeneral } from "./studio/seismic/seismic-general.js";
import { renderCtContinuityLab } from "./studio/dev/ct-continuity-lab.js";
import { renderResolutionConflits } from "./studio/conflits/resolution-conflits.js";

/**
 * L'historique des discussions, sous l'entrée Copilote.
 *
 * Il est plat et sans intitulé de groupe : ce ne sont pas des utilitaires de
 * plus, ce sont les fils d'un seul. Le décalage à gauche le dit mieux qu'un
 * titre, qui ferait croire à une rubrique.
 */
function renderCopiloteHistorique() {
  const courante = copiloteConversationId();

  return renderNavListGroup({
    id: "studioCopiloteHistorique",
    className: "nav-list__list--sub",
    items: copiloteConversations().map((conversation) => {
      const titre = conversationTitle(conversation);
      return renderNavListItem({
        label: titre,
        // L'intitulé est tronqué par le rail : l'infobulle rend la question
        // entière, sans quoi deux discussions voisines se ressemblent.
        title: titre,
        className: "nav-list__item--sub",
        isActive: conversation.id === courante,
        // Pas de `data-side-nav-target` : rouvrir un fil se traite à part, sinon
        // le panneau se redessinerait deux fois — une fois par le routeur, une
        // fois par nous — et la seconde effacerait la discussion chargée.
        dataAttributes: { "data-copilote-conversation": conversation.id },
        actionHtml: `
          <button type="button" class="nav-list__action-btn" data-copilote-menu="${escapeHtml(conversation.id)}"
            aria-haspopup="menu" aria-expanded="false"
            aria-label="Actions sur cette discussion" title="Actions">
            ${svgIcon("kebab-horizontal")}
          </button>
          <div class="copilote-fil-menu" role="menu" data-copilote-menu-for="${escapeHtml(conversation.id)}" hidden>
            <button type="button" class="copilote-fil-menu__item" role="menuitem"
              data-copilote-rename="${escapeHtml(conversation.id)}">
              ${svgIcon("pencil")}<span>Renommer</span>
            </button>
            <button type="button" class="copilote-fil-menu__item is-danger" role="menuitem"
              data-copilote-delete="${escapeHtml(conversation.id)}">
              ${svgIcon("trash")}<span>Effacer</span>
            </button>
          </div>
        `
      });
    })
  });
}

function renderStudioNav() {
  return [
    renderNavListGroup({
      items: [
        renderNavListItem({
          label: "Copilote",
          dataAttributes: { "data-side-nav-target": "studio-copilote" },
          iconHtml: svgIcon("copilot", { className: "octicon octicon-copilot" }),
          isActive: true,
          // L'action est à côté de l'entrée, pas dedans : ouvrir une discussion
          // neuve n'est pas se rendre quelque part.
          actionHtml: `
            <button type="button" class="nav-list__action-btn" data-copilote-new
              aria-label="Nouvelle discussion" title="Nouvelle discussion">
              ${svgIcon("new-chat")}
            </button>
          `
        })
      ]
    }),
    renderCopiloteHistorique(),
    renderNavListDivider(),
    renderNavListGroup({
      label: "Solidité",
      items: [
        renderNavListItem({
          label: "Neige, Vent & Gel",
          dataAttributes: { "data-side-nav-target": "solidity-climate" },
          iconHtml: svgIcon("climate-tools", { className: "octicon octicon-gear" })
        }),
        renderNavListItem({
          label: "Risques Naturels & Technologiques",
          dataAttributes: { "data-side-nav-target": "solidity-georisks" },
          iconHtml: svgIcon("shield", { className: "octicon octicon-shield" })
        }),
      ]
    }),
    renderNavListDivider(),
    renderNavListGroup({
      label: "Mémoire",
      items: [
        renderNavListItem({
          label: "Résoudre les conflits",
          dataAttributes: { "data-side-nav-target": "conflits-resolution" },
          iconHtml: svgIcon("bug", { className: "octicon octicon-bug" })
        })
      ]
    }),
    renderNavListDivider(),
    renderNavListGroup({
      label: "Parasismique",
      items: [
        renderNavListItem({
          label: "Spectre",
          dataAttributes: { "data-side-nav-target": "seismic-general" },
          iconHtml: svgIcon("pulse", { className: "octicon octicon-pulse" })
        })
      ]
    }),
    renderNavListDivider(),
    renderNavListGroup({
      label: "Socotec",
      items: [
        renderNavListItem({
          label: "ENR - PV hangar neuf",
          dataAttributes: { "data-side-nav-target": "solidity-arkolia" },
          iconHtml: svgIcon("eye", { className: "octicon octicon-eye" })
        })
      ]
    }),
    renderNavListDivider(),
    renderNavListGroup({
      label: "Développements",
      items: [
        renderNavListItem({
          label: "Suivi des avis BC",
          dataAttributes: { "data-side-nav-target": "dev-ct-continuity-lab" },
          iconHtml: svgIcon("history", { className: "octicon octicon-history" }),
          trailing: "spike"
        })
      ]
    })
  ].join("");
}

/** Où se retiennent le repli et la largeur du rail. Des réglages, pas un état. */
const RAIL_COLLAPSED_KEY = "mdall.studioRailCollapsed.v1";
const RAIL_WIDTH_KEY = "mdall.studioRailWidth.v1";

const railState = { collapsed: false, width: 248 };

function lireReglages() {
  try {
    railState.collapsed = window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1";
    railState.width = railWidth(Number(window.localStorage.getItem(RAIL_WIDTH_KEY)) || 248);
  } catch {
    // Un navigateur qui refuse le stockage garde le rail déplié.
  }
}

function getRouterHtml() {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--studio"
      style="--project-rail-width:${railWidth(railState.width, railState.collapsed)}px">
      <div class="project-simple-scroll project-simple-scroll--parametres" id="projectStudioRouterScroll">
        <div class="settings-shell settings-shell--parametres">
          <div class="project-rail-layout${railState.collapsed ? " project-rail-layout--collapsed" : ""}">
            ${renderProjectRail({
              id: "studioRail",
              label: "Utilitaires de l'Atelier",
              collapsed: railState.collapsed,
              navHtml: renderNavList({ label: "Utilitaires de l'Atelier", html: renderStudioNav() })
            })}
            <div class="project-rail-layout__content settings-content settings-content--parametres project-studio-router__content">
              
              <section class="project-studio-router__panel is-active" data-side-nav-panel="studio-copilote">
                <div id="projectStudioCopilotePanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-climate">
                <div id="projectStudioSolidityClimatePanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-georisks">
                <div id="projectStudioSolidityGeorisksPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-arkolia">
                <div id="projectStudioSolidityArkoliaPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="conflits-resolution">
                <div id="projectStudioConflitsPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="seismic-general">
                <div id="projectStudioSeismicGeneralPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="dev-ct-continuity-lab">
                <div id="projectStudioCtContinuityLabPanel"></div>
              </section>
            
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

let studioRailDetacher = null;
let studioPoigneeDetacher = null;
let studioCopiloteDetacher = null;

export function renderProjectStudio(root) {
  if (!root) return;

  // Pas de barre de contexte : elle n'affichait qu'« ATELIER » au-dessus d'un
  // écran qui le dit déjà, et ses seize pixels décalaient le haut du rail.
  setProjectViewHeader({ contextLabel: "Atelier", variant: "studio", hideBar: true });

  lireReglages();
  root.innerHTML = getRouterHtml();
  brancherRail(root);

  const copiloteRoot = root.querySelector("#projectStudioCopilotePanel");
  const solidityClimateRoot = root.querySelector("#projectStudioSolidityClimatePanel");
  const solidityGeorisksRoot = root.querySelector("#projectStudioSolidityGeorisksPanel");
  const solidityArkoliaRoot = root.querySelector("#projectStudioSolidityArkoliaPanel");
  const seismicGeneralRoot = root.querySelector("#projectStudioSeismicGeneralPanel");
  const ctContinuityLabRoot = root.querySelector("#projectStudioCtContinuityLabPanel");
  const conflitsRoot = root.querySelector("#projectStudioConflitsPanel");

  if (copiloteRoot) renderCopilote(copiloteRoot);
  if (solidityClimateRoot) renderSolidityClimate(solidityClimateRoot, { force: true });
  if (solidityGeorisksRoot) renderSolidityGeorisks(solidityGeorisksRoot);
  if (solidityArkoliaRoot) renderSolidityArkolia(solidityArkoliaRoot);
  if (seismicGeneralRoot) renderSeismicGeneral(seismicGeneralRoot);
  if (ctContinuityLabRoot) renderCtContinuityLab(ctContinuityLabRoot);
  if (conflitsRoot) renderResolutionConflits(conflitsRoot);

  const getScrollSource = () => root.querySelector("#projectStudioRouterScroll");

  bindSideNavPanels(root, {
    defaultTarget: "studio-copilote",
    scrollContainer: getScrollSource()
  });

  root.querySelectorAll("[data-side-nav-target]").forEach((button) => {
    button.addEventListener("click", () => {
      registerProjectPrimaryScrollSource(getScrollSource());

      const targetId = String(button.dataset.sideNavTarget || "").trim();
      if (targetId === "solidity-climate" && solidityClimateRoot) renderSolidityClimate(solidityClimateRoot, { force: true });
      // Le copilote se redessine à chaque venue : la conversation a pu avancer
      // dans un autre onglet, et un fil figé donnerait l'impression d'avoir
      // perdu l'échange.
      if (targetId === "studio-copilote" && copiloteRoot) renderCopilote(copiloteRoot);
      // Les conflits se relisent à chaque venue : la mémoire a pu bouger dans
      // un autre onglet, et un écran d'arbitrage qui montre un état périmé est
      // pire qu'un écran vide.
      if (targetId === "conflits-resolution" && conflitsRoot) renderResolutionConflits(conflitsRoot, { force: true });

      marquerActif(root, targetId);
    });
  });

  brancherCopilote(root, copiloteRoot, getScrollSource);
  marquerActif(root, "studio-copilote");

  registerProjectPrimaryScrollSource(getScrollSource());
}

/**
 * Le repère de l'entrée courante.
 *
 * Le routeur de panneaux pose `is-active` sur le bouton ; la liste de
 * navigation, elle, porte le trait bleu sur le `li`. Les deux ne se parlaient
 * pas : le trait restait sur Copilote quel que soit l'utilitaire ouvert. Il se
 * pose ici, au même endroit que dans la Mémoire.
 *
 * L'entrée Copilote s'efface au profit de la discussion ouverte dès que
 * celle-ci figure dans l'historique : deux traits bleus pour un seul écran ne
 * désignent plus rien.
 */
function marquerActif(root, targetId) {
  // Le Copilote a sa propre mise en page : une seule barre de défilement, celle
  // du fil, et la saisie posée en bas. La classe le dit à la feuille de style
  // plutôt qu'un sélecteur qui devinerait le panneau actif.
  root.querySelector(".project-simple-page--studio")
    ?.classList.toggle("project-simple-page--copilote", targetId === "studio-copilote");

  const filCourant = copiloteConversationId();
  const historique = copiloteConversations().some((conversation) => conversation.id === filCourant);

  for (const item of root.querySelectorAll(".project-rail .nav-list__item")) {
    const fil = item.querySelector("[data-copilote-conversation]")?.dataset.copiloteConversation || "";
    const cible = item.querySelector("[data-side-nav-target]")?.dataset.sideNavTarget || "";

    const actif = fil
      ? targetId === "studio-copilote" && fil === filCourant
      : cible === targetId && !(cible === "studio-copilote" && historique);

    item.setAttribute("data-active", actif ? "true" : "false");
  }
}

/** Afficher un panneau sans passer par un clic : rouvrir un fil en a besoin. */
function afficherPanneau(root, targetId) {
  for (const panneau of root.querySelectorAll("[data-side-nav-panel]")) {
    panneau.classList.toggle("is-active", panneau.dataset.sideNavPanel === targetId);
  }
}

/**
 * Les discussions dans le rail : en ouvrir une neuve, en rouvrir une passée.
 *
 * La délégation est nécessaire, pas décorative : l'historique se réécrit à
 * chaque message, et des écouteurs posés sur les entrées disparaîtraient avec
 * elles — la deuxième discussion serait morte au clic.
 */
function brancherCopilote(root, copiloteRoot, getScrollSource) {
  // L'écouteur d'avant se retire : l'Atelier se redessine à chaque repli du
  // rail, et des écouteurs empilés redessineraient l'historique autant de fois
  // qu'on a replié.
  if (studioCopiloteDetacher) studioCopiloteDetacher();
  studioCopiloteDetacher = null;

  const rail = root.querySelector(".project-rail");
  if (!rail || !copiloteRoot) return;

  const venir = () => {
    registerProjectPrimaryScrollSource(getScrollSource());
    afficherPanneau(root, "studio-copilote");
    renderCopilote(copiloteRoot);
    marquerActif(root, "studio-copilote");
  };

  const fermerMenus = () => {
    for (const menu of rail.querySelectorAll("[data-copilote-menu-for]")) menu.hidden = true;
    for (const bouton of rail.querySelectorAll("[data-copilote-menu]")) bouton.setAttribute("aria-expanded", "false");
  };

  rail.addEventListener("click", async (event) => {
    if (event.target.closest("[data-copilote-new]")) {
      fermerMenus();
      startNewConversation();
      venir();
      return;
    }

    const kebab = event.target.closest("[data-copilote-menu]");
    if (kebab) {
      // Le menu ne doit pas ouvrir la discussion au passage : on l'ouvre pour
      // la renommer ou l'effacer, pas pour la lire.
      event.stopPropagation();
      const id = kebab.dataset.copiloteMenu;
      const menu = rail.querySelector(`[data-copilote-menu-for="${CSS.escape(id)}"]`);
      const ouvert = menu && !menu.hidden;
      fermerMenus();
      if (menu && !ouvert) {
        menu.hidden = false;
        kebab.setAttribute("aria-expanded", "true");
      }
      return;
    }

    const renommer = event.target.closest("[data-copilote-rename]");
    if (renommer) {
      event.stopPropagation();
      fermerMenus();
      await renommerFil(root, renommer.dataset.copiloteRename, copiloteRoot);
      return;
    }

    const effacer = event.target.closest("[data-copilote-delete]");
    if (effacer) {
      event.stopPropagation();
      fermerMenus();
      await effacerFil(root, effacer.dataset.copiloteDelete, copiloteRoot);
      return;
    }

    fermerMenus();

    const fil = event.target.closest("[data-copilote-conversation]");
    if (fil && openConversation(fil.dataset.copiloteConversation)) venir();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest?.(".project-rail")) fermerMenus();
  });

  // L'historique se redessine seul, sans toucher au reste du rail : redessiner
  // l'Atelier entier à chaque message replierait les réglages en cours.
  const rafraichir = () => {
    const liste = root.querySelector("#studioCopiloteHistorique");
    if (!liste?.isConnected) return;
    liste.outerHTML = renderCopiloteHistorique();
    marquerActif(root, "studio-copilote");
  };

  /**
   * Renommer.
   *
   * Le nom part en base avant d'apparaître à l'écran : l'ordre inverse
   * montrerait un nom que rien ne conserve, et il disparaîtrait au
   * rechargement sans que personne comprenne pourquoi.
   */
  async function renommerFil(hote, id, panneau) {
    const actuel = copiloteConversations().find((entree) => entree.id === id);
    const propose = window.prompt("Renommer cette discussion", conversationTitle(actuel) || "");
    if (propose === null) return;

    try {
      const nom = await renameConversation(id, propose);
      renameConversationLocally(id, nom);
      rafraichir();
    } catch (error) {
      window.alert(`Le nouveau nom n'a pas pu être enregistré. ${error?.message || ""}`.trim());
    }
  }

  /**
   * Effacer.
   *
   * On demande confirmation parce que c'est sans retour : la discussion et ses
   * messages partent de la base, et rien n'en garde de copie — c'est ce qu'on
   * promet à quelqu'un qui efface une conversation privée.
   */
  async function effacerFil(hote, id, panneau) {
    const actuel = copiloteConversations().find((entree) => entree.id === id);
    const nom = conversationTitle(actuel);
    if (!window.confirm(`Effacer « ${nom} » ? La discussion et ses messages seront supprimés, sans retour.`)) return;

    try {
      await deleteConversation(id);
      forgetConversationLocally(id);
      rafraichir();
      if (panneau) renderCopilote(panneau);
    } catch (error) {
      window.alert(`La discussion n'a pas pu être effacée. ${error?.message || ""}`.trim());
    }
  }

  const surConversations = () => rafraichir();

  document.addEventListener("copilote:conversations", surConversations);
  studioCopiloteDetacher = () => document.removeEventListener("copilote:conversations", surConversations);
}

/**
 * Le rail : son calage, sa poignée, son repli.
 *
 * Le même composant que la Mémoire — l'Atelier s'étoffe, et il lui faut la même
 * place. Redessiner l'écran entier au repli serait excessif : seul le rail et
 * la marge du contenu changent, et la variable les porte tous les deux.
 */
function brancherRail(root) {
  if (studioRailDetacher) studioRailDetacher();
  if (studioPoigneeDetacher) studioPoigneeDetacher();

  studioRailDetacher = followRailScroll(root.querySelector(".project-rail"));
  studioPoigneeDetacher = bindRailResizer({
    root,
    id: "studioRail",
    pageSelector: ".project-simple-page--studio",
    getWidth: () => railState.width,
    onEnd: (largeur) => {
      railState.width = largeur;
      try {
        window.localStorage.setItem(RAIL_WIDTH_KEY, String(largeur));
      } catch {
        // Sans stockage, la largeur revient à sa valeur par défaut.
      }
    }
  });

  root.querySelector("[data-project-rail-collapse]")?.addEventListener("click", () => {
    railState.collapsed = !railState.collapsed;
    try {
      window.localStorage.setItem(RAIL_COLLAPSED_KEY, railState.collapsed ? "1" : "0");
    } catch {
      // Le repli ne se retiendra pas, l'écran fonctionne quand même.
    }
    renderProjectStudio(root);
  });
}
