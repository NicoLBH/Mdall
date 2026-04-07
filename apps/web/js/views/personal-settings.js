import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem
} from "./ui/side-nav-layout.js";

function getUserProfileModel() {
  const email = String(store.user?.email || "").trim();
  const firstName = String(store.user?.firstName || "").trim();
  const lastName = String(store.user?.lastName || "").trim();
  const fullName = String(store.user?.name || "").trim();
  const avatar = String(store.user?.avatar || "assets/images/260093543.png").trim() || "assets/images/260093543.png";

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

  const publicName = [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ").trim() || fullName || email || "Utilisateur";

  return {
    avatar,
    email,
    firstName: resolvedFirstName,
    lastName: resolvedLastName,
    fullName,
    publicName,
    bio: "",
    company: ""
  };
}

function renderPersonalSettingsNav() {
  return renderSideNavGroup({
    items: [
      renderSideNavItem({
        label: "Profil public",
        targetId: "personal-settings-public-profile",
        iconHtml: svgIcon("person", { className: "octicon octicon-person" }),
        isActive: true,
        isPrimary: true
      })
    ]
  });
}

function renderPublicProfilePanel(model) {
  return `
    <section class="personal-settings-panel is-active" data-side-nav-panel="personal-settings-public-profile">
      <header class="personal-settings-page__header">
        <h1>Profil public</h1>
      </header>

      <section class="personal-settings-card">
        <div class="personal-settings-card__body">
          <div class="personal-settings-card__main">
            <div class="personal-settings-form-grid">
              <label class="personal-settings-field">
                <span class="personal-settings-field__label">Nom</span>
                <input class="gh-input personal-settings-field__input" type="text" value="${escapeHtml(model.lastName)}">
              </label>

              <label class="personal-settings-field">
                <span class="personal-settings-field__label">Prénom</span>
                <input class="gh-input personal-settings-field__input" type="text" value="${escapeHtml(model.firstName)}">
              </label>

              <label class="personal-settings-field personal-settings-field--full">
                <span class="personal-settings-field__label">Email public</span>
                <input class="gh-input personal-settings-field__input" type="email" value="${escapeHtml(model.email)}">
              </label>

              <label class="personal-settings-field personal-settings-field--full">
                <span class="personal-settings-field__label">Bio</span>
                <textarea class="gh-input personal-settings-field__textarea" rows="4" placeholder="Parlez un peu de vous"></textarea>
              </label>

              <label class="personal-settings-field personal-settings-field--full">
                <span class="personal-settings-field__label">Entreprise</span>
                <input class="gh-input personal-settings-field__input" type="text" value="${escapeHtml(model.company)}">
              </label>
            </div>
          </div>

          <aside class="personal-settings-card__aside">
            <div class="personal-settings-avatar-card">
              <div class="personal-settings-avatar-card__title">Photo publique</div>
              <div class="personal-settings-avatar-card__figure">
                <img src="${escapeHtml(model.avatar)}" alt="Photo publique" class="personal-settings-avatar-card__img">
              </div>
            </div>
          </aside>
        </div>

        <div class="personal-settings-card__footer">
          <button class="gh-btn gh-btn--comment personal-settings-submit" type="button">Mettre à jour le profile</button>
        </div>
      </section>
    </section>
  `;
}

export function renderPersonalSettings(root) {
  if (!root) return;

  const model = getUserProfileModel();

  root.innerHTML = `
    <section class="page personal-settings-page">
      ${renderSideNavLayout({
        className: "personal-settings-layout",
        navClassName: "personal-settings-layout__nav",
        contentClassName: "personal-settings-layout__content",
        navHtml: renderPersonalSettingsNav(),
        contentHtml: renderPublicProfilePanel(model)
      })}
    </section>
  `;
}
