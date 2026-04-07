export function getAccountPersonalSettingsTab() {
  return {
    id: "personal-settings-account",
    label: "Compte",
    iconName: "gear",
    renderContent: renderAccountPanel,
    bind: bindAccountPanel
  };
}

function renderAccountPanel() {
  return `
    <section class="personal-settings-panel" data-side-nav-panel="personal-settings-account">
      <div class="settings-block__head personal-settings-page__header">
        <div class="settings-card__head-title settings-card__head-title--danger personal-settings-page__title">
          <h4>Supprimer votre compte
          </h4>
        </div>
      </div>

      <div class="personal-settings-panel__content personal-settings-panel__content--stacked">
        <p class="personal-settings-danger-copy">
          Une fois que vous aurez supprimé votre compte, aucun retour en arrière ne sera possible. S'il vous plaît, soyez certain avant de supprimer votre compte.
        </p>

        <div class="personal-settings-danger-actions">
          <button type="button" class="gh-btn gh-btn--danger personal-settings-danger-button">
            Supprimer votre compte
          </button>
        </div>
      </div>
    </section>
  `;
}

function bindAccountPanel() {}
