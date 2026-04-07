import { store } from "../../store.js";
import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { deleteCurrentUserAccount, DELETE_ACCOUNT_CONFIRMATION_TEXT } from "../../services/account-supabase-sync.js";
import { renderSettingsModal } from "../ui/settings-modal.js";

const deleteAccountUiState = {
  modalOpen: false,
  identityValue: "",
  confirmValue: "",
  submitting: false,
  errorMessage: "",
  successMessage: ""
};

export function getAccountPersonalSettingsTab() {
  return {
    id: "personal-settings-account",
    label: "Compte",
    iconName: "gear",
    renderContent: renderAccountPanel,
    bind: bindAccountPanel
  };
}

function getAccountIdentityLabel() {
  const publicEmail = String(store.user?.publicProfile?.publicEmail || "").trim();
  const email = String(store.user?.email || "").trim();
  const name = String(store.user?.name || "").trim();
  return publicEmail || email || name || "";
}

function renderDeleteAccountModal() {
  if (!deleteAccountUiState.modalOpen) return "";

  const isSubmitEnabled =
    deleteAccountUiState.identityValue.trim().length > 0 &&
    deleteAccountUiState.confirmValue.trim().toLowerCase() === DELETE_ACCOUNT_CONFIRMATION_TEXT;

  return renderSettingsModal({
    modalId: "personalSettingsDeleteModal",
    title: "Êtes-vous sûr de vouloir faire cela ?",
    closeDataAttribute: "data-close-delete-modal",
    variant: "danger",
    bodyHtml: `
      <div class="gh-alert gh-alert--error settings-modal__alert settings-modal__alert--danger">
        <span class="settings-modal__alert-icon">${svgIcon("alert")}</span>
        <span>Ceci est extrêmement important.</span>
      </div>

      <div class="settings-modal__copy">
        <p>
          Nous supprimerons immédiatement votre compte Mdall, ainsi que tous vos projets, documents, sujets, automatisations et paramètres associés.
        </p>
        <p>
          Vous ne pourrez plus accéder à Mdall avec ce compte.
        </p>
      </div>

      <label class="settings-modal__field">
        <span class="settings-modal__label">Votre nom d'utilisateur ou email&nbsp;:</span>
        <input
          type="text"
          class="gh-input settings-modal__input"
          id="personalSettingsDeleteIdentity"
          value="${escapeHtml(deleteAccountUiState.identityValue)}"
          autocomplete="off"
          spellcheck="false"
        >
      </label>

      <label class="settings-modal__field">
        <span class="settings-modal__label">Pour vérifier, tapez <em>${escapeHtml(DELETE_ACCOUNT_CONFIRMATION_TEXT)}</em> exactement comme affiché&nbsp;:</span>
        <input
          type="text"
          class="gh-input settings-modal__input"
          id="personalSettingsDeleteConfirmation"
          value="${escapeHtml(deleteAccountUiState.confirmValue)}"
          autocomplete="off"
          spellcheck="false"
        >
      </label>

      <div class="settings-modal__note">
        Vous devrez confirmer votre identité avant la suppression du compte.
      </div>

      ${deleteAccountUiState.errorMessage ? `<div class="gh-alert gh-alert--error settings-modal__feedback">${escapeHtml(deleteAccountUiState.errorMessage)}</div>` : ""}
      ${deleteAccountUiState.successMessage ? `<div class="settings-modal__note settings-modal__note--success">${escapeHtml(deleteAccountUiState.successMessage)}</div>` : ""}

      <button
        type="button"
        class="gh-btn gh-btn--danger-alt settings-modal__submit"
        id="personalSettingsDeleteSubmit"
        ${isSubmitEnabled && !deleteAccountUiState.submitting ? "" : "disabled"}
      >
        ${deleteAccountUiState.submitting ? "Suppression en cours…" : "Annuler le forfait et supprimer ce compte"}
      </button>
    `
  });
}

function renderAccountPanel() {
  return `
    <section class="personal-settings-panel" data-side-nav-panel="personal-settings-account">
      <div class="settings-block__head personal-settings-page__header">
        <div class="settings-card__head-title settings-card__head-title--danger personal-settings-page__title">Supprimer votre compte</div>
      </div>

      <div class="personal-settings-panel__content personal-settings-panel__content--stacked">
        <p class="personal-settings-danger-copy">
          Une fois que vous aurez supprimé votre compte, aucun retour en arrière ne sera possible. S'il vous plaît, soyez certain avant de supprimer votre compte.
        </p>

        <button type="button" class="gh-btn gh-btn--danger-alt personal-settings-danger-button" id="personalSettingsDeleteAccountButton">
          Supprimer votre compte
        </button>
      </div>

      ${renderDeleteAccountModal()}
    </section>
  `;
}

function rerenderAccountPanel(panelRoot) {
  const livePanelRoot =
    panelRoot && panelRoot.isConnected
      ? panelRoot
      : document.querySelector('[data-side-nav-panel="personal-settings-account"]');

  if (!livePanelRoot) return null;

  livePanelRoot.outerHTML = renderAccountPanel();
  const nextPanelRoot = document.querySelector('[data-side-nav-panel="personal-settings-account"]');
  if (nextPanelRoot) bindAccountPanel(nextPanelRoot);
  return nextPanelRoot;
}

function closeDeleteModal(panelRoot) {
  if (!deleteAccountUiState.modalOpen) return;
  deleteAccountUiState.modalOpen = false;
  deleteAccountUiState.submitting = false;
  deleteAccountUiState.errorMessage = "";
  deleteAccountUiState.successMessage = "";
  document.body.classList.remove("modal-open");
  rerenderAccountPanel(panelRoot);
}

async function openDeleteModal(panelRoot) {
  deleteAccountUiState.modalOpen = true;
  deleteAccountUiState.identityValue = getAccountIdentityLabel();
  deleteAccountUiState.confirmValue = "";
  deleteAccountUiState.submitting = false;
  deleteAccountUiState.errorMessage = "";
  deleteAccountUiState.successMessage = "";
  document.body.classList.add("modal-open");
  rerenderAccountPanel(panelRoot);

  queueMicrotask(() => {
    const confirmationInput = document.getElementById("personalSettingsDeleteConfirmation");
    confirmationInput?.focus();
  });
}

export function bindAccountPanel(panelRoot) {
  if (!panelRoot) return;

  const openButton = panelRoot.querySelector("#personalSettingsDeleteAccountButton");
  openButton?.addEventListener("click", () => {
    void openDeleteModal(panelRoot);
  });

  const modal = panelRoot.querySelector("#personalSettingsDeleteModal");
  if (!modal) return;

  modal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest?.("[data-close-delete-modal]");
    if (closeTarget) {
      closeDeleteModal(panelRoot);
    }
  });

  const identityInput = modal.querySelector("#personalSettingsDeleteIdentity");
  const confirmationInput = modal.querySelector("#personalSettingsDeleteConfirmation");
  const submitButton = modal.querySelector("#personalSettingsDeleteSubmit");

  const syncSubmitState = () => {
    deleteAccountUiState.identityValue = identityInput?.value || "";
    deleteAccountUiState.confirmValue = confirmationInput?.value || "";
    const isEnabled =
      deleteAccountUiState.identityValue.trim().length > 0 &&
      deleteAccountUiState.confirmValue.trim().toLowerCase() === DELETE_ACCOUNT_CONFIRMATION_TEXT &&
      !deleteAccountUiState.submitting;
    if (submitButton) submitButton.disabled = !isEnabled;
  };

  identityInput?.addEventListener("input", () => {
    deleteAccountUiState.identityValue = identityInput?.value || "";
    if (deleteAccountUiState.errorMessage || deleteAccountUiState.successMessage) {
      deleteAccountUiState.errorMessage = "";
      deleteAccountUiState.successMessage = "";
      rerenderAccountPanel(panelRoot);
      return;
    }
    syncSubmitState();
  });
  confirmationInput?.addEventListener("input", () => {
    deleteAccountUiState.confirmValue = confirmationInput?.value || "";
    if (deleteAccountUiState.errorMessage || deleteAccountUiState.successMessage) {
      deleteAccountUiState.errorMessage = "";
      deleteAccountUiState.successMessage = "";
      rerenderAccountPanel(panelRoot);
      return;
    }
    syncSubmitState();
  });
  syncSubmitState();

  submitButton?.addEventListener("click", async () => {
    if (deleteAccountUiState.submitting) return;

    deleteAccountUiState.submitting = true;
    deleteAccountUiState.errorMessage = "";
    deleteAccountUiState.successMessage = "";
    rerenderAccountPanel(panelRoot);

    try {
      await deleteCurrentUserAccount({
        identityInput: deleteAccountUiState.identityValue,
        confirmationText: deleteAccountUiState.confirmValue
      });

      deleteAccountUiState.successMessage = "Compte supprimé. Redirection en cours…";
      window.location.replace(new URL("login.html", window.location.href).toString());
    } catch (error) {
      deleteAccountUiState.submitting = false;
      deleteAccountUiState.errorMessage = error instanceof Error ? error.message : String(error);
      rerenderAccountPanel(panelRoot);
    }
  });

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDeleteModal(panelRoot);
    }
  });
}
