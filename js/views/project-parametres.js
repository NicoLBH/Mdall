import { store } from "../store.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import {
  DEFAULT_PROJECT_TABS_VISIBILITY,
  PROJECT_TAB_IDS,
  isToggleableProjectTab
} from "../constants.js";
import { svgIcon } from "../ui/icons.js";
import { renderGhEditableField, bindGhEditableFields } from "./ui/gh-input.js";
import { renderGhSelectMenu, bindGhSelectMenus } from "./ui/gh-split-button.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem,
  renderSideNavSeparator,
  bindSideNavPanels
} from "./ui/side-nav-layout.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function importanceCodeToLabel(value) {
  const normalized = String(value || "").trim();

  if (normalized === "I" || normalized === "Catégorie d'importance I") return "Catégorie d'importance I";
  if (normalized === "II" || normalized === "Catégorie d'importance II") return "Catégorie d'importance II";
  if (normalized === "III" || normalized === "Catégorie d'importance III") return "Catégorie d'importance III";
  if (normalized === "IV" || normalized === "Catégorie d'importance IV") return "Catégorie d'importance IV";

  return "Catégorie d'importance II";
}

function importanceLabelToCode(value) {
  const normalized = String(value || "").trim();

  if (normalized === "Catégorie d'importance I" || normalized === "I") return "I";
  if (normalized === "Catégorie d'importance II" || normalized === "II") return "II";
  if (normalized === "Catégorie d'importance III" || normalized === "III") return "III";
  if (normalized === "Catégorie d'importance IV" || normalized === "IV") return "IV";

  return "II";
}

function liquefactionCodeToLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "yes" ||
    normalized === "true" ||
    normalized === "sol liquéfiable" ||
    normalized === "sol liquefiable"
  ) {
    return "Sol liquéfiable";
  }

  if (
    normalized === "no" ||
    normalized === "false" ||
    normalized === "sol non liquéfiable" ||
    normalized === "sol non liquefiable" ||
    normalized === ""
  ) {
    return "Sol non liquéfiable";
  }

  if (normalized === "non défini à ce stade" || normalized === "non defini a ce stade") {
    return "Non défini à ce stade";
  }

  return "Sol non liquéfiable";
}

function liquefactionLabelToCode(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "sol liquéfiable" || normalized === "sol liquefiable") return "yes";
  if (normalized === "non défini à ce stade" || normalized === "non defini a ce stade") return "";
  return "no";
}

function ensureProjectFormDefaults() {
  const form = store.projectForm;

  if (typeof form.projectName !== "string" || !form.projectName.trim()) {
    form.projectName = "Projet demo";
  }

  if (typeof form.city !== "string" || !form.city.trim()) {
    form.city = "Annecy";
  }

  if (typeof form.postalCode !== "string" || !form.postalCode.trim()) {
    form.postalCode = "74000";
  }

  if (typeof form.zoneSismique !== "string" || !form.zoneSismique.trim()) {
    form.zoneSismique = "4";
  }

  if (typeof form.phase !== "string" || !form.phase.trim()) {
    form.phase = "APS";
  }

  if (typeof form.referential !== "string" || !form.referential.trim()) {
    form.referential = "EC8";
  }

  if (typeof form.soilClass !== "string" || !form.soilClass.trim()) {
    form.soilClass = "A";
  }

  if (typeof form.riskCategory !== "string" || !form.riskCategory.trim()) {
    form.riskCategory = "Risque normal";
  }

  if ((!form.city || !form.postalCode) && form.communeCp) {
    const raw = String(form.communeCp).trim();
    const match = raw.match(/^(.*?)(?:\s*[,-]?\s*)(\d{4,5})$/);
    if (match) {
      form.city = form.city || match[1].trim();
      form.postalCode = form.postalCode || match[2].trim();
    } else {
      form.city = form.city || raw;
    }
  }

  form.communeCp = [form.city, form.postalCode].filter(Boolean).join(" ").trim();

  form.importance = importanceLabelToCode(form.importance || form.importanceCategory || "II");
  form.importanceCategory = importanceCodeToLabel(form.importanceCategory || form.importance || "II");

  form.liquefactionText = liquefactionCodeToLabel(form.liquefactionText || form.liquefaction || "no");
  form.liquefaction = liquefactionLabelToCode(form.liquefactionText || form.liquefaction || "no");

  form.projectTabs = Object.fromEntries(
    Object.entries(DEFAULT_PROJECT_TABS_VISIBILITY).map(([tabId, defaultValue]) => {
      const currentValue = form.projectTabs?.[tabId];
      return [tabId, typeof currentValue === "boolean" ? currentValue : defaultValue];
    })
  );
}

function renderNavIcon(name) {
  const icons = {
    general: svgIcon("gear", { className: "octicon octicon-gear" }),
    people: svgIcon("people", { className: "octicon octicon-people" }),
    pin: svgIcon("pin", { className: "octicon" }),
    book: svgIcon("book", { className: "octicon" }),
    shield: svgIcon("shield", { className: "octicon" }),
    checklist: svgIcon("checklist", { className: "octicon" })
  };
  return icons[name] || icons.general;
}

const PARAMETRES_NAV_GROUPS = [
  {
    title: "Paramètres",
    items: [
      { targetId: "parametres-general", label: "Général", icon: "general", isPrimary: true, isActive: true }
    ]
  },
  {
    sectionLabel: "Données de base projet",
    items: [
      { targetId: "parametres-localisation", label: "Localisation", icon: "pin" },
      { targetId: "parametres-phase", label: "Phase", icon: "checklist" },
      { targetId: "parametres-collaborateurs", label: "Collaborateurs", icon: "people" },
      { targetId: "parametres-lots", label: "Lots", icon: "book" },
      { targetId: "parametres-zones-batiments", label: "Zones / bâtiments / niveaux", icon: "book" }
    ]
  },
  {
    sectionLabel: "Référentiels techniques et réglementaires",
    items: [
      { targetId: "parametres-zones-reglementaires", label: "Solidité des ouvrages", icon: "shield" },
      { targetId: "parametres-incendie", label: "Sécurité incendie", icon: "shield" },
      { targetId: "parametres-accessibilite", label: "Accessibilité PMR", icon: "shield" },
      { targetId: "parametres-parasismiques", label: "Protection parasismique", icon: "shield" },
      { targetId: "parametres-thermiques", label: "Performances thermiques", icon: "book" },
      { targetId: "parametres-acoustique", label: "Performances acoustiques", icon: "book" },
      { targetId: "parametres-normes", label: "DTU / Eurocodes / normes", icon: "book" },
      { targetId: "parametres-doctrines", label: "Doctrines particulières MOA", icon: "book" }
    ]
  },
  {
    sectionLabel: "Gouvernance",
    items: [
      { targetId: "parametres-droits", label: "Droits par acteur", icon: "people" },
      { targetId: "parametres-circuits", label: "Circuits de validation", icon: "checklist" },
      { targetId: "parametres-taxonomie", label: "Taxonomie des sujets", icon: "book" },
      { targetId: "parametres-criticite", label: "Règles de criticité", icon: "shield" },
      { targetId: "parametres-nomenclature", label: "Nomenclature documentaire", icon: "book" },
      { targetId: "parametres-workflow-pr", label: "Workflow de PR", icon: "checklist" },
      { targetId: "parametres-cloture", label: "Politique de clôture des sujets", icon: "shield" }
    ]
  },
  {
    sectionLabel: "Paramètres opérationnels",
    items: [
      { targetId: "parametres-jalons", label: "Jalons", icon: "checklist" },
      { targetId: "parametres-responsabilites", label: "Responsabilités", icon: "people" },
      { targetId: "parametres-champs", label: "Champs obligatoires", icon: "checklist" },
      { targetId: "parametres-modeles", label: "Modèles de documents", icon: "book" },
      { targetId: "parametres-templates", label: "Templates de remarques", icon: "book" },
      { targetId: "parametres-diffusion", label: "Matrices de diffusion", icon: "people" }
    ]
  }
];

function renderParametresNav() {
  return PARAMETRES_NAV_GROUPS.map((group, groupIndex) => {
    const html = renderSideNavGroup({
      title: group.title || "",
      sectionLabel: group.sectionLabel || "",
      className: groupIndex === 0 ? "settings-nav__group settings-nav__group--project" : "settings-nav__group settings-nav__group--project",
      items: group.items.map((item) =>
        renderSideNavItem({
          label: item.label,
          targetId: item.targetId,
          iconHtml: renderNavIcon(item.icon),
          isActive: !!item.isActive,
          isPrimary: !!item.isPrimary
        })
      )
    });

    if (groupIndex === PARAMETRES_NAV_GROUPS.length - 1) return html;
    return `${html}${renderSideNavSeparator()}`;
  }).join("");
}

function renderSectionCard({ id = "", title, description = "", body = "", badge = "" }) {
  return `
    <div class="settings-card settings-card--param" ${id ? `id="${escapeHtml(id)}"` : ""}>
      <div class="settings-card__head">
        <div>
          <h4>${escapeHtml(title)}</h4>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
        ${badge ? `<span class="settings-badge mono">${escapeHtml(badge)}</span>` : ""}
      </div>
      ${body}
    </div>
  `;
}

function renderInputField({ id, label, value = "", placeholder = "", width = "" }) {
  return `
    <div class="${width}">
      ${renderGhEditableField({
        id,
        label,
        value,
        placeholder
      })}
    </div>
  `;
}

function renderSelectField({ id, label, value = "", options = [] }) {
  return renderGhSelectMenu({
    id,
    label,
    value,
    options,
    tone: "default",
    size: "md"
  });
}

function renderPlaceholderList(items) {
  return `
    <ul class="settings-list settings-list--tight">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderProjectTabsFeatureCard(projectTabs) {
  const items = [
    {
      id: "tabVisibilityPropositions",
      key: PROJECT_TAB_IDS.PROPOSITIONS,
      label: "Propositions",
      description: "Affiche l’onglet Propositions dans la barre d’onglets du projet."
    },
    {
      id: "tabVisibilityDiscussions",
      key: PROJECT_TAB_IDS.DISCUSSIONS,
      label: "Discussions",
      description: "Affiche l’onglet Discussions pour les échanges de coordination."
    },
    {
      id: "tabVisibilityPilotage",
      key: PROJECT_TAB_IDS.PILOTAGE,
      label: "Pilotage",
      description: "Affiche l’onglet Pilotage actuellement branché sur les jalons projet."
    },
    {
      id: "tabVisibilityReferentiel",
      key: PROJECT_TAB_IDS.REFERENTIEL,
      label: "Référentiel",
      description: "Affiche l’onglet Référentiel dans la navigation projet."
    },
    {
      id: "tabVisibilityRisquesSecurite",
      key: PROJECT_TAB_IDS.RISQUES_SECURITE,
      label: "Risques & sécurité",
      description: "Affiche l’onglet Risques & sécurité dans la navigation projet."
    }
  ];

  return `
    <div class="settings-features-card">
      <div class="settings-features-card__title">Fonctionnalités</div>
      <div class="settings-features-list">
        ${items.map((item) => `
          <label class="settings-feature-row" for="${escapeHtml(item.id)}">
            <div class="settings-feature-row__control">
              <input
                id="${escapeHtml(item.id)}"
                type="checkbox"
                data-project-tab-toggle="${escapeHtml(item.key)}"
                ${projectTabs?.[item.key] !== false ? "checked" : ""}
              >
            </div>
            <div class="settings-feature-row__body">
              <div class="settings-feature-row__label">${escapeHtml(item.label)}</div>
              <div class="settings-feature-row__desc">${escapeHtml(item.description)}</div>
            </div>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSettingsBlock({ id, title, lead = "", cards = [], isActive = false, isHero = false }) {
  return `
    <section
      class="settings-block ${isActive ? "is-active" : ""} ${isHero ? "settings-block--hero" : ""}"
      data-settings-block="${escapeHtml(id)}"
      data-side-nav-panel="${escapeHtml(id)}"
    >
      ${isHero ? `
        <header class="settings-page-header settings-page-header--parametres">
          <h2>${escapeHtml(title)}</h2>
          ${lead ? `<p>${escapeHtml(lead)}</p>` : ""}
        </header>
      ` : `
        <div class="settings-block__head">
          <h3>${escapeHtml(title)}</h3>
          ${lead ? `<p class="settings-lead">${escapeHtml(lead)}</p>` : ""}
        </div>
      `}
      ${cards.join("")}
    </section>
  `;
}

function getPageHtml(form) {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--parametres">
      <div class="project-simple-scroll project-simple-scroll--parametres" id="projectParametresScroll">
        <div class="settings-shell settings-shell--parametres">
          ${renderSideNavLayout({
            className: "settings-layout settings-layout--parametres",
            navClassName: "settings-nav settings-nav--parametres",
            contentClassName: "settings-content settings-content--parametres",
            navHtml: renderParametresNav(),
            contentHtml: `
              ${renderSettingsBlock({
                id: "parametres-general",
                title: "General",
                lead: "",
                isActive: true,
                isHero: false,
                cards: [
                  renderSectionCard({
                    title: "Nom du projet",
                    description: "Description",
                    body: `<div class="settings-form-grid settings-form-grid--thirds">
                      ${renderInputField({ id: "projectName", label: "Nom de projet", value: form.projectName || "", placeholder: "Projet demo" })}
                    </div>`
                  }),
                  renderSectionCard({
                    title: "Fonctionnalités du projet",
                    description: "Active ou masque certaines fonctionnalités optionnelles dans l’en-tête projet.",
                    body: renderProjectTabsFeatureCard(form.projectTabs || {})
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-localisation",
                title: "Données de base projet",
                lead: "",
                cards: [
                  renderSectionCard({
                    title: "Localisation",
                    description: "Localisation administrative et d’usage du projet.",
                    badge: "LIVE",
                    body: `<div class="settings-form-grid settings-form-grid--thirds">
                      ${renderInputField({ id: "projectCity", label: "Ville", value: form.city || "", placeholder: "Ex. Annecy" })}
                      ${renderInputField({ id: "projectPostalCode", label: "CP", value: form.postalCode || "", placeholder: "Ex. 74000" })}
                    </div>`
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-phase",
                title: "Données de base projet",
                lead: "Positionnement du projet dans son cycle de production.",
                cards: [
                  renderSectionCard({
                    title: "Phase",
                    description: "",
                    body: `<div class="settings-form-grid settings-form-grid--thirds">
                      ${renderSelectField({ id: "projectPhase", label: "Phase", value: form.phase || "APS", options: ["ESQ", "APS", "APD", "PRO", "DCE", "EXE", "DET", "AOR"] })}
                    </div>`
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-collaborateurs",
                title: "Données de base projet",
                lead: "",
                cards: [
                  renderSectionCard({
                    title: "Collaborateurs",
                    description: "Acteurs clés, profils et rôles mobilisés sur le projet.",
                    body: renderPlaceholderList([
                      "MOA, MOE, architecte, BET, CT, SPS, OPC, entreprises, exploitant.",
                      "Droits d'écriture, validation, revue et diffusion par acteur.",
                      "Capacités de création de sujets, propositions et clôtures."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-lots",
                title: "Données de base projet",
                lead: "",
                cards: [
                  renderSectionCard({
                    title: "Lots",
                    description: "Organisation des disciplines et périmètres techniques du projet.",
                    body: renderPlaceholderList([
                      "Gros œuvre, structure, fluides, électricité, SSI, VRD, enveloppe, second œuvre, exploitation.",
                      "Découpage compatible avec les tableaux Documents, Situations et Propositions."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-zones-batiments",
                title: "Données de base projet",
                lead: "",
                cards: [
                  renderSectionCard({
                    title: "Zones / bâtiments / niveaux",
                    description: "Découpage spatial utilisé dans les analyses et les livrables.",
                    body: renderPlaceholderList([
                      "Bâtiments, ailes, niveaux, zones techniques, secteurs fonctionnels et zones de diffusion."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-zones-reglementaires",
                title: "Référentiels techniques et réglementaires",
                lead: "Cadre réglementaire principal lié à la solidité et à la structure.",
                cards: [
                  renderSectionCard({
                    title: "Solidité des ouvrages",
                    description: "Références réglementaires, hypothèses générales et domaine d’application.",
                    body: renderPlaceholderList([
                      "Code de la construction, Eurocodes, règles professionnelles, cas particuliers et exigences du programme."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-incendie",
                title: "Référentiels techniques et réglementaires",
                lead: "Corpus incendie principal retenu pour le projet.",
                cards: [
                  renderSectionCard({
                    title: "Règlement incendie applicable",
                    description: "Corpus incendie principal retenu pour le projet.",
                    body: renderPlaceholderList([
                      "ERP / IGH / habitation / bureaux / code du travail / ICPE selon le cas.",
                      "Références d’arrêtés, versions et doctrines internes applicables."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-accessibilite",
                title: "Référentiels techniques et réglementaires",
                lead: "Base normative accessibilité PMR et dispositions complémentaires retenues.",
                cards: [
                  renderSectionCard({
                    title: "Règlement accessibilité",
                    description: "Base normative accessibilité PMR et dispositions complémentaires retenues.",
                    body: renderPlaceholderList([
                      "Exigences réglementaires, cas particuliers, dérogations et pièces justificatives attendues."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-parasismiques",
                title: "Référentiels techniques et réglementaires",
                lead: "Cadre réglementaire et hypothèses d’entrée du lot parasismique.",
                cards: [
                  renderSectionCard({
                    title: "Protection parasismique",
                    description: "Centralise désormais les paramètres auparavant répartis entre type d’ouvrage et solidité des ouvrages.",
                    badge: "LIVE",
                    body: `<div class="settings-form-grid settings-form-grid--thirds">
                      ${renderSelectField({ id: "riskCategory", label: "Catégorie de risque", value: form.riskCategory || form.risk || "Risque normal", options: ["Risque normal", "Risque spécial"] })}
                      ${renderSelectField({ id: "importanceCategory", label: "Catégorie d'importance", value: form.importanceCategory || form.importance || "II", options: ["Catégorie d'importance I", "Catégorie d'importance II", "Catégorie d'importance III", "Catégorie d'importance IV"] })}
                      ${renderSelectField({ id: "zoneSismique", label: "Zone sismique", value: form.zoneSismique || "4", options: ["1", "2", "3", "4", "5"] })}
                      ${renderSelectField({ id: "liquefactionText", label: "Liquéfaction", value: form.liquefactionText || "Sol non liquéfiable", options: ["Sol non liquéfiable", "Sol liquéfiable", "Non défini à ce stade"] })}
                      ${renderSelectField({ id: "soilClass", label: "Classe de sol", value: form.soilClass || "A", options: ["A", "B", "C", "D", "E"] })}
                      ${renderSelectField({ id: "referential", label: "Référentiel parasismique", value: form.referential || "EC8", options: ["EC8", "PS92"] })}
                    </div>`
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-thermiques",
                title: "Référentiels techniques et réglementaires",
                lead: "Références thermiques et énergétiques applicables.",
                cards: [
                  renderSectionCard({
                    title: "Référentiels thermiques",
                    description: "Références thermiques et énergétiques applicables.",
                    body: renderPlaceholderList([
                      "RE2020, RT existant, labels et exigences contractuelles complémentaires."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-acoustique",
                title: "Référentiels techniques et réglementaires",
                lead: "Normes, objectifs contractuels et seuils d’acceptation acoustiques.",
                cards: [
                  renderSectionCard({
                    title: "Référentiels acoustique",
                    description: "Normes, objectifs contractuels et seuils d’acceptation acoustiques.",
                    body: renderPlaceholderList([
                      "NRA, programmes spécifiques, cahiers des charges de performance et modalités de contrôle."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-normes",
                title: "Référentiels techniques et réglementaires",
                lead: "Bibliothèque normative de référence du projet.",
                cards: [
                  renderSectionCard({
                    title: "DTU / Eurocodes / normes projet",
                    description: "Bibliothèque normative de référence du projet.",
                    body: renderPlaceholderList([
                      "DTU, Eurocodes, NF, guides, règles professionnelles et prescriptions spécifiques."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-doctrines",
                title: "Référentiels techniques et réglementaires",
                lead: "Exigences internes et doctrines projet non strictement réglementaires.",
                cards: [
                  renderSectionCard({
                    title: "Doctrines particulières du maître d’ouvrage",
                    description: "Exigences internes et doctrines projet non strictement réglementaires.",
                    body: renderPlaceholderList([
                      "Standards internes, listes rouges, bibliothèques de détails, prescriptions d’exploitation et d’entretien."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-droits",
                title: "Gouvernance",
                lead: "Garde-fous organisationnels qui encadrent la production, la revue, la qualification et la clôture.",
                cards: [
                  renderSectionCard({ title: "Droits par acteur", body: renderPlaceholderList(["Droits d’ouverture, commentaire, validation, rejet, diffusion et clôture par rôle."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-circuits",
                title: "Gouvernance",
                lead: "Règles d’approbation et d’escalade du projet.",
                cards: [
                  renderSectionCard({ title: "Circuits de validation", body: renderPlaceholderList(["Règles d’approbation, escalade, quorum et cas bloquants selon la nature du sujet."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-taxonomie",
                title: "Gouvernance",
                lead: "Structuration de la classification métier.",
                cards: [
                  renderSectionCard({ title: "Taxonomie des sujets", body: renderPlaceholderList(["Arborescence de thèmes, sous-thèmes, disciplines et codes de classification réutilisés partout."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-criticite",
                title: "Gouvernance",
                lead: "Critères de sévérité, impact et urgence.",
                cards: [
                  renderSectionCard({ title: "Règles de criticité", body: renderPlaceholderList(["Critères de sévérité, probabilité, impact, urgence et seuils d’alerte."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-nomenclature",
                title: "Gouvernance",
                lead: "Convention de nommage et d’identification documentaire.",
                cards: [
                  renderSectionCard({ title: "Nomenclature documentaire", body: renderPlaceholderList(["Convention de nommage, identifiants, versions, lots, zones et statuts documentaires."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-workflow-pr",
                title: "Gouvernance",
                lead: "Cadre de traitement des propositions.",
                cards: [
                  renderSectionCard({ title: "Workflow de PR", body: renderPlaceholderList(["Règles d’ouverture, revue, approbation, intégration et traçabilité des propositions."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-cloture",
                title: "Gouvernance",
                lead: "Règles de fermeture et de réouverture.",
                cards: [
                  renderSectionCard({ title: "Politique de clôture des sujets", body: renderPlaceholderList(["Preuves minimales, validations attendues et critères de fermeture / réouverture."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-jalons",
                title: "Paramètres opérationnels",
                lead: "Échéances et points de passage du projet.",
                cards: [
                  renderSectionCard({ title: "Jalons", body: renderPlaceholderList(["Jalons de revue, échéances, fenêtres de diffusion et points de contrôle."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-responsabilites",
                title: "Paramètres opérationnels",
                lead: "Répartition des rôles d’exécution.",
                cards: [
                  renderSectionCard({ title: "Responsabilités", body: renderPlaceholderList(["Répartition RACI ou équivalent par type d’action, lot et phase."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-champs",
                title: "Paramètres opérationnels",
                lead: "Informations minimales imposées selon les objets créés.",
                cards: [
                  renderSectionCard({ title: "Champs obligatoires", body: renderPlaceholderList(["Données minimales exigées selon l’objet créé : sujet, avis, document, proposition, diffusion."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-modeles",
                title: "Paramètres opérationnels",
                lead: "Gabarits de livrables et supports projet.",
                cards: [
                  renderSectionCard({ title: "Modèles de documents", body: renderPlaceholderList(["Gabarits de fiches, bordereaux, rapports, notices et documents de synthèse."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-templates",
                title: "Paramètres opérationnels",
                lead: "Bibliothèque de formulations réutilisables.",
                cards: [
                  renderSectionCard({ title: "Templates de remarques", body: renderPlaceholderList(["Bibliothèque de formulations normalisées par discipline et niveau de criticité."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-diffusion",
                title: "Paramètres opérationnels",
                lead: "Règles de diffusion selon le contexte et les destinataires.",
                cards: [
                  renderSectionCard({ title: "Matrices de diffusion", body: renderPlaceholderList(["Destinataires, visas, pièces jointes et conditions de diffusion selon le contexte."]) })
                ]
              })}
            `
          })}
        </div>
      </div>
    </section>
  `;
}

export function renderProjectParametres(root) {
  ensureProjectFormDefaults();

  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Paramètres",
    variant: "parametres",
    title: "",
    subtitle: "",
    metaHtml: "",
    toolbarHtml: ""
  });

  root.innerHTML = getPageHtml(store.projectForm);

  registerProjectPrimaryScrollSource(document.getElementById("projectParametresScroll"));
  bindParametresEvents();
  bindParametresNav();
}

function bindValue(id, handler, eventName = "input") {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(eventName, (e) => handler(e.target.value));
}

function refreshProjectTabsVisibility() {
  const tabsRoot = document.querySelector(".project-tabs");
  if (!tabsRoot) return;

  const visibility = store.projectForm.projectTabs || {};

  tabsRoot.querySelectorAll("[data-project-tab-id]").forEach((link) => {
    const tabId = link.getAttribute("data-project-tab-id");
    if (!isToggleableProjectTab(tabId)) return;

    const isVisible = visibility[tabId] !== false;
    link.style.display = isVisible ? "" : "none";
    link.setAttribute("aria-hidden", isVisible ? "false" : "true");
  });
}

function bindProjectTabToggles() {
  document.querySelectorAll("[data-project-tab-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const key = event.target.getAttribute("data-project-tab-toggle");
      if (!key) return;
      store.projectForm.projectTabs[key] = !!event.target.checked;
      refreshProjectTabsVisibility();
    });
  });
}

function bindParametresEvents() {
  bindGhEditableFields(document, {
    onValidate: (id, value) => {
      switch (id) {
        case "projectName":
          store.projectForm.projectName = value;
          break;
        case "projectCity":
          store.projectForm.city = value;
          store.projectForm.communeCp = [store.projectForm.city, store.projectForm.postalCode].filter(Boolean).join(" ").trim();
          break;
        case "projectPostalCode":
          store.projectForm.postalCode = value;
          store.projectForm.communeCp = [store.projectForm.city, store.projectForm.postalCode].filter(Boolean).join(" ").trim();
          break;
        case "climateZoneWinter":
          store.projectForm.climateZoneWinter = value;
          break;
        case "climateZoneSummer":
          store.projectForm.climateZoneSummer = value;
          break;
        case "climateBaseTemperatures":
          store.projectForm.climateBaseTemperatures = value;
          break;
        default:
          break;
      }
    }
  });

  bindGhSelectMenus(document, {
    onChange: (id, value) => {
      switch (id) {
        case "riskCategory":
          store.projectForm.riskCategory = value;
          store.projectForm.risk = value;
          break;

        case "importanceCategory":
          store.projectForm.importanceCategory = value;
          store.projectForm.importance = importanceLabelToCode(value);
          break;

        case "projectPhase":
          store.projectForm.phase = value;
          break;

        case "zoneSismique":
          store.projectForm.zoneSismique = value;
          break;

        case "liquefactionText":
          store.projectForm.liquefactionText = value;
          store.projectForm.liquefaction = liquefactionLabelToCode(value);
          break;

        case "referential":
          store.projectForm.referential = value;
          break;

        case "soilClass":
          store.projectForm.soilClass = value;
          break;

        default:
          break;
      }
    }
  });

  bindProjectTabToggles();
  refreshProjectTabsVisibility();
}

function bindParametresNav() {
  const scrollEl = document.getElementById("projectParametresScroll");
  if (!scrollEl) return;

  bindSideNavPanels(document, {
    navSelector: "[data-side-nav-target]",
    panelSelector: "[data-side-nav-panel]",
    defaultTarget: "parametres-general",
    scrollContainer: scrollEl
  });
}
