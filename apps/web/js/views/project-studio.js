import { svgIcon } from "../ui/icons.js";
import { registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem,
  renderSideNavSeparator,
  bindSideNavPanels
} from "./ui/side-nav-layout.js";
import { renderStudioGeneral } from "./studio/studio-general.js";
import { renderSolidityClimate } from "./studio/solidity/solidity-climate.js";
import { renderSolidityGeorisks } from "./studio/solidity/solidity-georisks.js";
import { renderSolidityArkolia } from "./studio/socotec/socotec-enr-pv-hangard-neuf.js";
import { renderSeismicGeneral } from "./studio/seismic/seismic-general.js";

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
      sectionLabel: "Parasismique",
      items: [
        renderSideNavItem({
          label: "Spectre",
          targetId: "seismic-general",
          iconHtml: svgIcon("gear", { className: "octicon octicon-gear" })
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
    })
  ].join("");
}

function getRouterHtml() {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--studio">
      <div class="project-simple-scroll project-simple-scroll--parametres" id="projectStudioRouterScroll">
        <div class="settings-shell settings-shell--parametres">
          ${renderSideNavLayout({
            className: "settings-layout settings-layout--parametres project-studio-router",
            navClassName: "settings-nav settings-nav--parametres",
            contentClassName: "settings-content settings-content--parametres project-studio-router__content",
            navHtml: renderStudioNav(),
            contentHtml: `
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
              <section class="project-studio-router__panel" data-side-nav-panel="seismic-general">
                <div id="projectStudioSeismicGeneralPanel"></div>
              </section>
            `
          })}
        </div>
      </div>
    </section>
  `;
}

export function renderProjectStudio(root) {
  if (!root) return;

  root.innerHTML = getRouterHtml();

  const generalRoot = root.querySelector("#projectStudioGeneralPanel");
  const solidityClimateRoot = root.querySelector("#projectStudioSolidityClimatePanel");
  const solidityGeorisksRoot = root.querySelector("#projectStudioSolidityGeorisksPanel");
  const solidityArkoliaRoot = root.querySelector("#projectStudioSolidityArkoliaPanel");
  const seismicGeneralRoot = root.querySelector("#projectStudioSeismicGeneralPanel");

  if (generalRoot) renderStudioGeneral(generalRoot);
  if (solidityClimateRoot) renderSolidityClimate(solidityClimateRoot, { force: true });
  if (solidityGeorisksRoot) renderSolidityGeorisks(solidityGeorisksRoot);
  if (solidityArkoliaRoot) renderSolidityArkolia(solidityArkoliaRoot);
  if (seismicGeneralRoot) renderSeismicGeneral(seismicGeneralRoot);

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
    });
  });

  registerProjectPrimaryScrollSource(getScrollSource());
}
