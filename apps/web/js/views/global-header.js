import { PROJECT_TAB_IDS } from "../constants.js";
import { ATELIER_COPILOTE } from "../services/route-de-latelier.js";
import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import { signOut } from "../../assets/js/auth.js";
import { enTeteDuCarnet } from "../services/mon-carnet.js";
import { MARQUE_DES_SITUATIONS, RACCOURCIS_GLOBAUX } from "../services/raccourcis-de-la-barre.js";
import {
  LE_COPILOTE, TOUS_LES_PROJETS, TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS, cheminDe
} from "../services/ecrans-transversaux.js";

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
      /**
       * **Le projet, et non celui qui le regarde.**
       *
       * La barre disait « Untel / NOVACLIM ». Le nom de la personne y était sur
       * chaque écran d'un projet, et il n'apprenait rien : on sait qui l'on est,
       * et l'avatar le redit à trois centimètres de là, sur la même ligne. Il
       * prenait la place du seul nom qu'on vient y chercher.
       */
      primary: getProjectDisplayName(parts[1]),
      secondary: "",
      showSecondary: false,
      // Le fil compact du projet — l'onglet, puis le détail ouvert — reste : il
      // vivait dans la branche du nom, et partait avec lui.
      showCompactTab: true,
      href: `#project/${parts[1]}/documents`,
      headerClass: "gh-header gh-header--project",
      breadcrumbTabLabel: selectedSituation ? "Situations" : "",
      breadcrumbCurrentLabel: selectedSituation ? String(selectedSituation.title || "Situation") : "",
      showSituationBreadcrumb: !!selectedSituation,
      projectId: parts[1]
    };
  }

  // Mon carnet. Le fil d'Ariane d'une situation ouverte y vit aussi : il naissait
  // dans la branche « projet » avec l'onglet, et sans ceci une situation ouverte
  // dans le carnet n'aurait plus de chemin de retour (étape 3).
  if (parts[0] === "situations") {
    const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituation = selectedSituationId && Array.isArray(store.situationsView?.data)
      ? store.situationsView.data.find((situation) => String(situation?.id || "") === selectedSituationId)
      : null;

    return enTeteDuCarnet(selectedSituation, getUserDisplayIdentity().fullLabel || store.user?.name || "");
  }

  /**
   * **Les écrans qui traversent les projets se nomment eux-mêmes.**
   *
   * Les trois derniers tombaient dans le cas par défaut, et la barre annonçait
   * « Tableau de bord » sur le Copilote, sur Tous les sujets et sur Toutes les
   * propositions. On arrivait donc sur un écran que la barre appelait autrement
   * — et le premier réflexe est de croire qu'on a mal cliqué.
   *
   * Le nom vient de `ecrans-transversaux.js`, là où le menu et la route le
   * prennent déjà : recopié ici, il aurait fini par différer de l'entrée qui y
   * mène (règle 10).
   */
  for (const ecran of [TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS, LE_COPILOTE, TOUS_LES_PROJETS]) {
    if (parts[0] !== cheminDe(ecran)) continue;

    return {
      primary: ecran.nom,
      secondary: "",
      showSecondary: false,
      href: ecran.route,
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

  // **« Tableau de bord » dans la barre du haut, « Accueil » sur la page.** La
  // barre nomme *où l'on est* dans l'application ; le titre de la page nomme ce
  // qu'on y fait. « Accueil » aux deux endroits se lisait comme une répétition,
  // et n'apprenait rien la seconde fois.
  return {
    primary: "Tableau de bord",
    secondary: "",
    showSecondary: false,
    href: "#dashboard",
    headerClass: "gh-header gh-header--global"
  };
}

/**
 * Un raccourci de la barre du haut.
 *
 * **Cinq portes de même nature, donc un seul bouton.** En dessiner un par
 * raccourci obligerait à les recalibrer ensemble à chaque retouche, et l'un des
 * cinq finirait d'une autre taille que ses voisins.
 */
function renderRaccourci({ href, icone, nom, marque = "" }) {
  return `
    <div class="gh-action gh-raccourci">
      <a class="gh-raccourci__lien" href="${href}" title="${escapeHtml(nom)}" aria-label="${escapeHtml(nom)}"
        ${marque ? `data-raccourci="${escapeHtml(marque)}"` : ""}>
        ${icone}
      </a>
    </div>
  `;
}

/**
 * Le Copilote, à portée de la barre du haut.
 *
 * **C'est le point d'entrée de tout le reste**, et l'atteindre demandait
 * d'ouvrir l'Atelier puis de le retrouver dans son rail. Un péage de deux
 * gestes qu'on paie cent fois par jour finit par décider de ce qu'on fait :
 * on renonce à demander.
 *
 * Il ne paraît que **sur un projet**, parce qu'une discussion sans projet n'a
 * rien à lire — et un raccourci qui mène à un écran vide apprend à ne plus le
 * cliquer.
 *
 * **Il mène au Copilote, pas à l'Atelier.** Déposer sur la vitrine laisserait
 * un second geste à faire, c'est-à-dire la moitié du péage qu'on voulait
 * supprimer. Le quatrième segment de la route dit quel panneau ouvrir ; sans
 * lui, l'Atelier ouvre sa vitrine comme d'habitude.
 */
function renderRaccourciCopilote(model = {}) {
  const projectId = String(model?.projectId || "").trim();
  if (!projectId) return "";

  return renderRaccourci({
    href: `#project/${encodeURIComponent(projectId)}/${PROJECT_TAB_IDS.STUDIO}/${ATELIER_COPILOTE}`,
    icone: svgIcon("copilot", { className: "octicon octicon-copilot" }),
    // Le nom vient d'où il vit, avec les autres écrans qui se nomment : recopié
    // ici, il serait la version qui reste fausse le jour où l'autre change.
    nom: LE_COPILOTE.nom
  });
}

/**
 * Les portes qui ne dépendent d'aucun projet.
 *
 * **Elles sont dans la barre du haut, et non dans les onglets d'un projet.**
 * Un sujet, une proposition, une situation traversent les chantiers : les
 * ranger parmi les onglets de l'un d'eux brouillerait exactement ce que les
 * écrans transversaux installent. La barre du haut, elle, ne dit rien sur
 * l'endroit où l'on se trouve — c'est sa place.
 *
 * **La liste et son ordre vivent dans `raccourcis-de-la-barre.js`**, où des
 * épreuves peuvent les lire. Ici ne reste que le dessin : ce fichier parle à
 * l'authentification et ne s'importe pas hors d'un navigateur, ce qui rendait
 * la liste invérifiable tant qu'elle y était écrite (règle 12).
 */
function renderRaccourcisGlobaux() {
  return RACCOURCIS_GLOBAUX.map((un) => renderRaccourci({
    href: un.href,
    icone: svgIcon(un.icone, { className: `octicon octicon-${un.icone}` }),
    nom: un.nom,
    marque: un.marque
  })).join("");
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
            ${/*
              **La tête peut porter un geste.** Dans les Situations, elle referme
              la situation ouverte : le retour à la liste vivait dans le fil,
              sous le nom de l'écran répété après celui de la personne — ce nom
              est parti, et le répéter redonnerait le doublon qu'on avait défait.
            */""}
            <span class="gh-brand__name"${
              model.primaryRaccourci ? ` data-raccourci="${model.primaryRaccourci}"` : ""
            }>${model.primary}</span>
            ${
              model.showSecondary
                ? `
                  <span class="gh-brand__sep">/</span>
                  <span class="gh-brand__repo">${model.secondary}</span>
                `
                : ``
            }
            ${/*
              **Le fil compact ne dépend plus du second nom.** Il vivait dans la
              même branche, et il est parti avec le nom de la personne le jour où
              celui-ci a quitté la barre — c'est-à-dire que le détail ouvert n'avait
              plus de chemin de retour, sans qu'aucune erreur ne le dise.
            */""}
            ${
              model.showCompactTab
                ? `
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
              ${model.breadcrumbTabLabel ? `
                <span class="gh-brand__sep">/</span>
                <button type="button" class="gh-brand__trail-btn" id="globalHeaderSituationsBack">${model.breadcrumbTabLabel}</button>
              ` : ""}
              ${model.breadcrumbCurrentLabel ? `
                <span class="gh-brand__sep">/</span>
                <span class="gh-brand__trail-current">${model.breadcrumbCurrentLabel}</span>
              ` : ""}
            </span>
          ` : ""}
        </div>
      </div>

      <div class="gh-header__center"></div>

      <div class="gh-header__right">
        <div id="globalHeaderActions" class="gh-header__actions">
          ${renderRaccourciCopilote(model)}
          ${renderRaccourcisGlobaux()}
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
    // Le fil d'Ariane et le raccourci de la barre font la même chose : revenir à
    // la liste. Deux façons de le faire finiraient par ne plus se ressembler.
    const situationsBackBtn = event.target.closest?.("#globalHeaderSituationsBack")
      || event.target.closest?.(`[data-raccourci="${MARQUE_DES_SITUATIONS}"]`);
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
