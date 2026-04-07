import {
  bindSideNavPanels,
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem,
  renderSideNavSeparator
} from "./ui/side-nav-layout.js";
import { getPublicProfilePersonalSettingsTab } from "./personal-settings/public-profile.js";
import { getAccountPersonalSettingsTab } from "./personal-settings/account.js";
import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import { DEFAULT_PUBLIC_AVATAR } from "../services/profile-supabase-sync.js";

const activePersonalSettingsTabs = [
  getPublicProfilePersonalSettingsTab(),
  getAccountPersonalSettingsTab()
];

const upcomingPersonalSettingsItems = [
  { label: "Apparence", icon: "paintbrush" },
  { label: "Accessibilité", icon: "accessibility" },
  { label: "Notifications", icon: "bell" }
];

const accessPersonalSettingsItems = [
  { label: "Factures et abonnement", icon: "credit-card" },
  { label: "Emails", icon: "mail-16" },
  { label: "Mot de passe et authentification", icon: "shield-lock" }
];

function getPersonalSettingsAccountModel() {
  const email = String(store.user?.publicProfile?.publicEmail || store.user?.email || "").trim();
  const firstName = String(store.user?.firstName || "").trim();
  const lastName = String(store.user?.lastName || "").trim();
  const fullName = String(store.user?.name || "").trim();
  const avatar = String(store.user?.avatar || DEFAULT_PUBLIC_AVATAR).trim() || DEFAULT_PUBLIC_AVATAR;

  let resolvedFirstName = firstName;
  let resolvedLastName = lastName;

  if ((!resolvedFirstName || !resolvedLastName) && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (!resolvedFirstName && parts.length) resolvedFirstName = parts[0] || "";
    if (!resolvedLastName && parts.length > 1) resolvedLastName = parts.slice(1).join(" ");
  }

  const displayName = [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ").trim() || fullName || email || "Utilisateur";

  return {
    avatar,
    displayName
  };
}

function renderPersonalSettingsAccountCard() {
  const model = getPersonalSettingsAccountModel();

  return `
    <div class="personal-settings-account-card">
      <div class="personal-settings-account-card__avatar-wrap">
        <img src="${escapeHtml(model.avatar)}" alt="Avatar du compte" class="personal-settings-account-card__avatar">
      </div>
      <div class="personal-settings-account-card__body">
        <div class="personal-settings-account-card__name">${escapeHtml(model.displayName)}</div>
        <div class="personal-settings-account-card__meta">Votre compte personnel</div>
      </div>
    </div>
  `;
}

function renderPersonalSettingsNav(activeTabId) {
  return `
    ${renderPersonalSettingsAccountCard()}
    ${renderSideNavGroup({
      items: activePersonalSettingsTabs.map((tab) => renderSideNavItem({
        label: tab.label,
        targetId: tab.id,
        iconHtml: tab.iconHtml || svgIcon(tab.iconName),
        isActive: tab.id === activeTabId,
        isPrimary: Boolean(tab.isPrimary)
      }))
    })}
    ${renderSideNavGroup({
      items: upcomingPersonalSettingsItems.map((item) => renderSideNavItem({
        label: item.label,
        iconHtml: svgIcon(item.icon),
        isDisabled: true,
        className: 'side-nav-layout__item--muted'
      }))
    })}
    ${renderSideNavSeparator()}
    ${renderSideNavGroup({
      sectionLabel: 'Accès',
      items: accessPersonalSettingsItems.map((item) => renderSideNavItem({
        label: item.label,
        iconHtml: svgIcon(item.icon),
        isDisabled: true,
        className: 'side-nav-layout__item--muted'
      }))
    })}
  `;
}

export function renderPersonalSettings(root) {
  if (!root) return;

  const defaultTab = activePersonalSettingsTabs[0];

  root.innerHTML = `
    <section class="page personal-settings-page">
      ${renderSideNavLayout({
        className: "settings-layout settings-layout--parametres personal-settings-layout",
        navClassName: "settings-nav settings-nav--parametres personal-settings-layout__nav",
        contentClassName: "settings-content settings-content--parametres personal-settings-layout__content",
        navHtml: renderPersonalSettingsNav(defaultTab.id),
        contentHtml: activePersonalSettingsTabs.map((tab) => tab.renderContent()).join("")
      })}
    </section>
  `;

  activePersonalSettingsTabs.forEach((tab) => {
    const panelRoot = root.querySelector(`[data-side-nav-panel="${tab.id}"]`);
    tab.bind?.(panelRoot);
  });

  const scrollContainer = root.querySelector(".side-nav-layout__content") || null;

  bindSideNavPanels(root, {
    defaultTarget: defaultTab.id,
    scrollContainer
  });
}
