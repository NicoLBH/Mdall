import { store } from "../../store.js";
import { leGesteDuRangement } from "../../services/un-chantier-range.js";
import { rerenderProjectParametres } from "./project-parametres-core.js";
import { PROJECT_TAB_IDS } from "../../constants.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { bindGhEditableFields, renderGhEditableField } from "../ui/gh-input.js";
import {
  persistCurrentProjectNameToSupabase,
  syncCurrentProjectIdentityFromSupabase
} from "../../services/project-supabase-sync.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  bindBaseParametresUi,
  bindProjectTabToggles,
  refreshProjectTabsVisibility
} from "./project-parametres-core.js";

function renderProjectTabsFeatureCard(projectTabs) {
  const items = [
    {
      id: "tabVisibilityAtelier",
      key: PROJECT_TAB_IDS.STUDIO,
      label: "Atelier",
      description: "Affiche l’onglet Atelier et ses vues métier de travail projet."
    }
    // Les situations ne sont plus un onglet de ce projet : elles ont leur écran,
    // qui est celui d'une personne. Un interrupteur de projet n'a rien à dire
    // sur le carnet de quelqu'un (étape 3).
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

function resolveProjectCreatedAt() {
  return store?.currentProject?.created_at
    || store?.projectForm?.project?.created_at
    || store?.projectForm?.created_at
    || null;
}

function formatProjectCreatedAt(createdAtValue) {
  const createdAt = new Date(createdAtValue || "");
  if (Number.isNaN(createdAt.getTime())) return "Date inconnue";
  return createdAt.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).replace(",", " ·");
}

export function renderGeneralParametresContent() {
  const form = store.projectForm;
  const projectCreatedAt = formatProjectCreatedAt(resolveProjectCreatedAt());

  return `${renderSettingsBlock({
    id: "parametres-general",
    title: "",
    lead: "",
    isActive: true,
    isHero: false,
    cards: [
      renderSectionCard({
        title: "Nom du projet",
        description: "Ajouter ou modifier le nom de votre projet.",
        body: `<div class="form-row form-row--settings"><label for="projectName">Nom de projet</label></div>
        ${renderGhEditableField({ id: "projectName", label: "", value: form.projectName || "", placeholder: "Projet demo" })}
        <div class="form-row form-row--settings"><label>Date de création du projet</label></div>
        <div class="project-general-created-at">
          <div class="project-general-created-at__value">${escapeHtml(projectCreatedAt)}</div>
        </div>`
      }),
      renderSectionCard({
        title: "Fonctionnalités du projet",
        description: "Active ou masque certaines fonctionnalités optionnelles dans l’en-tête projet.",
        body: renderProjectTabsFeatureCard(form.projectTabs || {})
      }),
      renderCarteDuRangement()
    ]
  })}`;
}

/**
 * Ranger le chantier, en bas de page.
 *
 * ## Pourquoi en bas, et pourquoi pas de rouge
 *
 * En bas parce que c'est le dernier geste d'un chantier, et qu'on ne veut pas
 * le croiser en venant changer un nom. Et **pas en rouge** : le rouge dit
 * « ceci détruit », et ceci ne détruit rien. Un bouton rouge ferait hésiter
 * devant un geste sans conséquence, et banaliserait le rouge des gestes qui en
 * ont.
 *
 * ## Ce que la carte promet, et le tient
 *
 * Que rien n'est supprimé. C'est la seule chose qu'on ait besoin de savoir
 * avant de cliquer, et c'est écrit avant le bouton — pas dans une confirmation
 * qui arrive après qu'on a décidé.
 */
function renderCarteDuRangement() {
  const geste = leGesteDuRangement({ archivedAt: store.projectForm?.archivedAt });

  return renderSectionCard({
    title: geste.titre,
    description: geste.dit,
    body: `
      <div class="form-row form-row--settings">
        <button type="button" class="gh-btn" data-projet-rangement="${escapeHtml(geste.quoi)}">
          ${escapeHtml(geste.bouton)}
        </button>
      </div>
    `
  });
}

export function bindGeneralParametresSection(root) {
  bindBaseParametresUi();
  brancherLeRangement(root);

  if (!resolveProjectCreatedAt()) {
    syncCurrentProjectIdentityFromSupabase().catch((error) => {
      console.warn("syncCurrentProjectIdentityFromSupabase failed", error);
    });
  }

  bindGhEditableFields(document, {
    onValidate: async (id, value) => {
      if (id !== "projectName") return;

      const previousProjectName = String(store.projectForm.projectName || store.currentProject?.name || "Projet demo");
      persistCurrentProjectNameToSupabase(value).catch((error) => {
        console.warn("persistCurrentProjectNameToSupabase failed", error);
        persistCurrentProjectNameToSupabase(previousProjectName).catch(() => undefined);
      });
    }
  });

  bindProjectTabToggles();
  refreshProjectTabsVisibility();
}

export function getGeneralProjectParametresTab() {
  return {
    id: "parametres-general",
    label: "Général",
    iconName: "gear",
    isPrimary: true,
    renderContent: () => renderGeneralParametresContent(),
    bind: (root) => bindGeneralParametresSection(root)
  };
}

/**
 * Le geste de ranger, branché.
 *
 * **Le bouton se désarme pendant l'aller-retour.** Sans cela, deux clics
 * pressés envoient deux écritures, et la seconde répond sur un état qu'on ne
 * regarde plus. Et si la base refuse, on le dit : afficher le chantier comme
 * rangé alors qu'il ne l'est pas serait montrer une intention pour un fait
 * (règle 12).
 */
function brancherLeRangement(root) {
  const bouton = (root ?? document).querySelector("[data-projet-rangement]");
  if (!bouton) return;

  bouton.addEventListener("click", async () => {
    const ranger = bouton.dataset.projetRangement === "ranger";
    bouton.disabled = true;

    try {
      const { resolveCurrentBackendProjectId } = await import(
        "../../services/project-supabase-sync.js");
      const { rangerLeChantier } = await import(
        "../../services/un-chantier-range-supabase.js");

      const projetId = String((await resolveCurrentBackendProjectId()) || "").trim();
      if (!projetId) throw new Error("chantier introuvable");

      const quand = await rangerLeChantier(projetId, ranger);
      if (store.projectForm && typeof store.projectForm === "object") {
        store.projectForm.archivedAt = quand;
      }
      if (ranger) {
        // On repart à la liste : un chantier qu'on vient de ranger n'a plus
        // rien à dire dans ses propres paramètres, et c'est là qu'on vérifie
        // que le geste a eu lieu.
        location.hash = "#projects";
        return;
      }

      // Remis en cours, on reste : la carte redit le geste inverse, et le
      // bouton retrouve sa main.
      bouton.disabled = false;
      rerenderProjectParametres();
    } catch (erreur) {
      bouton.disabled = false;
      console.warn("rangerLeChantier a échoué", erreur);
      window.alert("Le chantier n'a pas pu être rangé. Rien n'a été modifié.");
    }
  });
}
