import { svgIcon } from "../ui/icons.js";
import { registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import {
  renderSideNavGroup,
  renderSideNavItem,
  renderSideNavSeparator,
  bindSideNavPanels
} from "./ui/side-nav-layout.js";
import {
  bindRailResizer,
  followRailScroll,
  railWidth,
  renderProjectRail
} from "./ui/project-rail.js";
import { renderStudioGeneral } from "./studio/studio-general.js";
import { renderSolidityClimate } from "./studio/solidity/solidity-climate.js";
import { renderSolidityGeorisks } from "./studio/solidity/solidity-georisks.js";
import { renderSolidityArkolia } from "./studio/socotec/socotec-enr-pv-hangard-neuf.js";
import { renderSeismicGeneral } from "./studio/seismic/seismic-general.js";
import { renderCtContinuityLab } from "./studio/dev/ct-continuity-lab.js";
import { renderResolutionConflits } from "./studio/conflits/resolution-conflits.js";

function renderStudioNav() {
  return [
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      items: [
        renderSideNavItem({
          label: "Bienvenue",
          targetId: "studio-general",
          iconHtml: svgIcon("home", { className: "octicon octicon-home" }),
          isActive: true,
          isPrimary: true
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Solidité",
      items: [
        renderSideNavItem({
          label: "Neige, Vent & Gel",
          targetId: "solidity-climate",
          iconHtml: svgIcon("climate-tools", { className: "octicon octicon-gear" })
        }),
        renderSideNavItem({
          label: "Risques Naturels & Technologiques",
          targetId: "solidity-georisks",
          iconHtml: svgIcon("shield", { className: "octicon octicon-shield" })
        }),
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Mémoire",
      items: [
        renderSideNavItem({
          label: "Résoudre les conflits",
          targetId: "conflits-resolution",
          iconHtml: svgIcon("bug", { className: "octicon octicon-bug" })
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Parasismique",
      items: [
        renderSideNavItem({
          label: "Spectre",
          targetId: "seismic-general",
          iconHtml: svgIcon("pulse", { className: "octicon octicon-pulse" })
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Socotec",
      items: [
        renderSideNavItem({
          label: "ENR - PV hangar neuf",
          targetId: "solidity-arkolia",
          iconHtml: svgIcon("eye", { className: "octicon octicon-eye" })
        })
      ]
    }),
    renderSideNavSeparator(),
    renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      sectionLabel: "Développements",
      items: [
        renderSideNavItem({
          label: "Suivi des avis BC",
          targetId: "dev-ct-continuity-lab",
          iconHtml: svgIcon("history", { className: "octicon octicon-history" }),
          tag: "spike"
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
              navHtml: renderStudioNav()
            })}
            <div class="project-rail-layout__content settings-content settings-content--parametres project-studio-router__content">
              
              <section class="project-studio-router__panel is-active" data-side-nav-panel="studio-general">
                <div id="projectStudioGeneralPanel"></div>
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

export function renderProjectStudio(root) {
  if (!root) return;

  lireReglages();
  root.innerHTML = getRouterHtml();
  brancherRail(root);

  const generalRoot = root.querySelector("#projectStudioGeneralPanel");
  const solidityClimateRoot = root.querySelector("#projectStudioSolidityClimatePanel");
  const solidityGeorisksRoot = root.querySelector("#projectStudioSolidityGeorisksPanel");
  const solidityArkoliaRoot = root.querySelector("#projectStudioSolidityArkoliaPanel");
  const seismicGeneralRoot = root.querySelector("#projectStudioSeismicGeneralPanel");
  const ctContinuityLabRoot = root.querySelector("#projectStudioCtContinuityLabPanel");
  const conflitsRoot = root.querySelector("#projectStudioConflitsPanel");

  if (generalRoot) renderStudioGeneral(generalRoot);
  if (solidityClimateRoot) renderSolidityClimate(solidityClimateRoot, { force: true });
  if (solidityGeorisksRoot) renderSolidityGeorisks(solidityGeorisksRoot);
  if (solidityArkoliaRoot) renderSolidityArkolia(solidityArkoliaRoot);
  if (seismicGeneralRoot) renderSeismicGeneral(seismicGeneralRoot);
  if (ctContinuityLabRoot) renderCtContinuityLab(ctContinuityLabRoot);
  if (conflitsRoot) renderResolutionConflits(conflitsRoot);

  const getScrollSource = () => root.querySelector("#projectStudioRouterScroll");

  bindSideNavPanels(root, {
    defaultTarget: "studio-general",
    scrollContainer: getScrollSource()
  });

  root.querySelectorAll("[data-side-nav-target]").forEach((button) => {
    button.addEventListener("click", () => {
      registerProjectPrimaryScrollSource(getScrollSource());

      const targetId = String(button.dataset.sideNavTarget || "").trim();
      if (targetId === "solidity-climate" && solidityClimateRoot) renderSolidityClimate(solidityClimateRoot, { force: true });
      // Les conflits se relisent à chaque venue : la mémoire a pu bouger dans
      // un autre onglet, et un écran d'arbitrage qui montre un état périmé est
      // pire qu'un écran vide.
      if (targetId === "conflits-resolution" && conflitsRoot) renderResolutionConflits(conflitsRoot, { force: true });
    });
  });

  registerProjectPrimaryScrollSource(getScrollSource());
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
