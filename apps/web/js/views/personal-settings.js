import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem
} from "./ui/side-nav-layout.js";

const DEFAULT_AVATAR = "assets/images/260093543.png";
const CROP_VIEWPORT_SIZE = 420;

const personalSettingsUiState = {
  photoMenuOpen: false,
  cropModalOpen: false,
  cropImageSrc: "",
  cropImageNaturalWidth: 0,
  cropImageNaturalHeight: 0,
  cropScale: 1,
  cropOffsetX: 0,
  cropOffsetY: 0,
  isDraggingCrop: false,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0
};

let currentPersonalSettingsRoot = null;
let personalSettingsCropperBound = false;

function getUserProfileModel() {
  const email = String(store.user?.email || "").trim();
  const firstName = String(store.user?.firstName || "").trim();
  const lastName = String(store.user?.lastName || "").trim();
  const fullName = String(store.user?.name || "").trim();
  const avatar = String(store.user?.avatar || DEFAULT_AVATAR).trim() || DEFAULT_AVATAR;

  let resolvedFirstName = firstName;
  let resolvedLastName = lastName;

  if ((!resolvedFirstName || !resolvedLastName) && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (!resolvedFirstName && parts.length) resolvedFirstName = parts[0] || "";
    if (!resolvedLastName && parts.length > 1) resolvedLastName = parts.slice(1).join(" ");
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
    company: "",
    hasCustomAvatar: avatar && avatar !== DEFAULT_AVATAR
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

function renderAvatarMenu(model) {
  return `
    <div class="personal-settings-avatar-card__actions">
      <button
        type="button"
        class="gh-btn gh-btn--sm personal-settings-avatar-menu__trigger"
        id="personalSettingsAvatarMenuBtn"
        aria-haspopup="menu"
        aria-expanded="${personalSettingsUiState.photoMenuOpen ? "true" : "false"}"
      >
        <span class="gh-action__icon">${svgIcon("pencil", { className: "octicon octicon-pencil" })}</span>
        <span class="gh-action__label">Modifier</span>
      </button>

      <div class="personal-settings-avatar-menu gh-menu${personalSettingsUiState.photoMenuOpen ? " gh-menu--open" : ""}" id="personalSettingsAvatarMenu" role="menu">
        <button type="button" class="gh-menu__item personal-settings-avatar-menu__item" data-avatar-action="upload" role="menuitem">
          Télécharger une photo...
        </button>
        ${model.hasCustomAvatar ? `
          <button type="button" class="gh-menu__item personal-settings-avatar-menu__item" data-avatar-action="remove" role="menuitem">
            Supprimer la photo
          </button>
        ` : ""}
      </div>
    </div>
  `;
}

function renderCropModal() {
  if (!personalSettingsUiState.cropModalOpen || !personalSettingsUiState.cropImageSrc) return "";

  const imageWidth = Math.max(1, Math.round(personalSettingsUiState.cropImageNaturalWidth * personalSettingsUiState.cropScale));
  const imageHeight = Math.max(1, Math.round(personalSettingsUiState.cropImageNaturalHeight * personalSettingsUiState.cropScale));
  const imageLeft = Math.round((CROP_VIEWPORT_SIZE - imageWidth) / 2 + personalSettingsUiState.cropOffsetX);
  const imageTop = Math.round((CROP_VIEWPORT_SIZE - imageHeight) / 2 + personalSettingsUiState.cropOffsetY);

  return `
    <div class="personal-settings-crop-modal" id="personalSettingsCropModal">
      <div class="personal-settings-crop-modal__backdrop" data-close-crop-modal="true"></div>

      <div class="personal-settings-crop-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="personalSettingsCropModalTitle">
        <div class="personal-settings-crop-modal__head">
          <h3 id="personalSettingsCropModalTitle" class="personal-settings-crop-modal__title">Définir votre nouvelle photo de profil</h3>
          <button type="button" class="personal-settings-crop-modal__close" data-close-crop-modal="true" aria-label="Fermer">
            ${svgIcon("x")}
          </button>
        </div>

        <div class="personal-settings-crop-modal__body">
          <div
            class="personal-settings-cropper"
            id="personalSettingsCropper"
            data-cropper="true"
            aria-label="Recadrage de la photo de profil"
          >
            <img
              src="${escapeHtml(personalSettingsUiState.cropImageSrc)}"
              alt="Photo à recadrer"
              class="personal-settings-cropper__image"
              id="personalSettingsCropImage"
              draggable="false"
              style="width:${imageWidth}px;height:${imageHeight}px;left:${imageLeft}px;top:${imageTop}px;"
            >
            <div class="personal-settings-cropper__mask" aria-hidden="true"></div>
            <div class="personal-settings-cropper__circle" aria-hidden="true"></div>
          </div>
        </div>

        <div class="personal-settings-crop-modal__footer">
          <button type="button" class="gh-btn gh-btn--primary personal-settings-crop-modal__submit" id="personalSettingsCropSubmit">
            Définir la photo de profil
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPublicProfilePanel(model) {
  return `
    <section class="personal-settings-panel is-active" data-side-nav-panel="personal-settings-public-profile">
      <div class="settings-block__head personal-settings-page__header">
        <h3>Profil public</h3>
      </div>

      <div class="personal-settings-panel__content">
        <div class="personal-settings-form-grid">
          <label class="personal-settings-field">
            <span class="personal-settings-field__label">Nom</span>
            <input class="gh-input" type="text" value="${escapeHtml(model.lastName)}">
          </label>

          <label class="personal-settings-field">
            <span class="personal-settings-field__label">Prénom</span>
            <input class="gh-input" type="text" value="${escapeHtml(model.firstName)}">
          </label>

          <label class="personal-settings-field personal-settings-field--full">
            <span class="personal-settings-field__label">Email public</span>
            <input class="gh-input" type="email" value="${escapeHtml(model.email)}">
          </label>

          <label class="personal-settings-field personal-settings-field--full">
            <span class="personal-settings-field__label">Bio</span>
            <textarea class="gh-input personal-settings-field__textarea" rows="4" placeholder="Parlez un peu de vous"></textarea>
          </label>

          <label class="personal-settings-field personal-settings-field--full">
            <span class="personal-settings-field__label">Entreprise</span>
            <input class="gh-input" type="text" value="${escapeHtml(model.company)}">
          </label>
        </div>

        <aside class="personal-settings-avatar-card">
          <div class="personal-settings-avatar-card__title">Photo publique</div>
          <div class="personal-settings-avatar-card__figure-wrap">
            <div class="personal-settings-avatar-card__figure">
              <img src="${escapeHtml(model.avatar)}" alt="Photo publique" class="personal-settings-avatar-card__img" id="personalSettingsAvatarImg">
            </div>
            ${renderAvatarMenu(model)}
          </div>
        </aside>
      </div>

      <div class="personal-settings-page__footer">
        <button class="gh-btn gh-btn--primary personal-settings-submit" type="button">Mettre à jour le profile</button>
      </div>

      <input id="personalSettingsAvatarFileInput" type="file" accept="image/*" hidden>
      ${renderCropModal()}
    </section>
  `;
}

function syncVisibleAvatarImages(newSrc) {
  document.querySelectorAll(".gh-user-menu__avatar-img, .gh-user-menu__profile-avatar, .personal-settings-avatar-card__img").forEach((img) => {
    if (img instanceof HTMLImageElement) {
      img.src = newSrc;
    }
  });
}

function rerenderPersonalSettings() {
  if (!currentPersonalSettingsRoot) return;
  renderPersonalSettings(currentPersonalSettingsRoot);
}

function closeAvatarMenu() {
  if (!personalSettingsUiState.photoMenuOpen) return;
  personalSettingsUiState.photoMenuOpen = false;
  rerenderPersonalSettings();
}

function closeCropModal() {
  personalSettingsUiState.cropModalOpen = false;
  personalSettingsUiState.cropImageSrc = "";
  personalSettingsUiState.cropImageNaturalWidth = 0;
  personalSettingsUiState.cropImageNaturalHeight = 0;
  personalSettingsUiState.cropScale = 1;
  personalSettingsUiState.cropOffsetX = 0;
  personalSettingsUiState.cropOffsetY = 0;
  personalSettingsUiState.isDraggingCrop = false;
  rerenderPersonalSettings();
}

function openCropModal(imageSrc, imageWidth, imageHeight) {
  const fitScale = Math.max(CROP_VIEWPORT_SIZE / Math.max(1, imageWidth), CROP_VIEWPORT_SIZE / Math.max(1, imageHeight));

  personalSettingsUiState.cropModalOpen = true;
  personalSettingsUiState.cropImageSrc = imageSrc;
  personalSettingsUiState.cropImageNaturalWidth = imageWidth;
  personalSettingsUiState.cropImageNaturalHeight = imageHeight;
  personalSettingsUiState.cropScale = fitScale;
  personalSettingsUiState.cropOffsetX = 0;
  personalSettingsUiState.cropOffsetY = 0;
  personalSettingsUiState.isDraggingCrop = false;

  rerenderPersonalSettings();
}

function readSelectedImage(file) {
  if (!(file instanceof File)) return;

  const reader = new FileReader();
  reader.onload = () => {
    const imageSrc = String(reader.result || "");
    if (!imageSrc) return;

    const image = new Image();
    image.onload = () => {
      openCropModal(imageSrc, image.naturalWidth || image.width || CROP_VIEWPORT_SIZE, image.naturalHeight || image.height || CROP_VIEWPORT_SIZE);
    };
    image.src = imageSrc;
  };
  reader.readAsDataURL(file);
}

function buildCroppedAvatarDataUrl() {
  const canvas = document.createElement("canvas");
  canvas.width = CROP_VIEWPORT_SIZE;
  canvas.height = CROP_VIEWPORT_SIZE;

  const context = canvas.getContext("2d");
  const image = document.getElementById("personalSettingsCropImage");
  if (!context || !(image instanceof HTMLImageElement)) return "";

  const imageWidth = personalSettingsUiState.cropImageNaturalWidth * personalSettingsUiState.cropScale;
  const imageHeight = personalSettingsUiState.cropImageNaturalHeight * personalSettingsUiState.cropScale;
  const drawX = (CROP_VIEWPORT_SIZE - imageWidth) / 2 + personalSettingsUiState.cropOffsetX;
  const drawY = (CROP_VIEWPORT_SIZE - imageHeight) / 2 + personalSettingsUiState.cropOffsetY;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.beginPath();
  context.arc(CROP_VIEWPORT_SIZE / 2, CROP_VIEWPORT_SIZE / 2, CROP_VIEWPORT_SIZE / 2 - 1, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.drawImage(image, drawX, drawY, imageWidth, imageHeight);
  context.restore();

  return canvas.toDataURL("image/png");
}

function applyNewAvatar() {
  const avatarDataUrl = buildCroppedAvatarDataUrl();
  if (!avatarDataUrl) return;

  store.user = {
    ...(store.user || {}),
    avatar: avatarDataUrl
  };

  syncVisibleAvatarImages(avatarDataUrl);
  closeCropModal();
}

function removeAvatar() {
  store.user = {
    ...(store.user || {}),
    avatar: DEFAULT_AVATAR
  };
  syncVisibleAvatarImages(DEFAULT_AVATAR);
  closeAvatarMenu();
}

function bindAvatarCropper(root) {
  const cropper = root.querySelector("#personalSettingsCropper");
  if (!cropper) return;

  if (cropper.dataset.bound !== "true") {
    cropper.dataset.bound = "true";

    cropper.addEventListener("mousedown", (event) => {
      event.preventDefault();
      personalSettingsUiState.isDraggingCrop = true;
      personalSettingsUiState.dragStartX = event.clientX;
      personalSettingsUiState.dragStartY = event.clientY;
      personalSettingsUiState.dragOriginX = personalSettingsUiState.cropOffsetX;
      personalSettingsUiState.dragOriginY = personalSettingsUiState.cropOffsetY;
      cropper.classList.add("is-dragging");
    });

    cropper.addEventListener("touchstart", (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      personalSettingsUiState.isDraggingCrop = true;
      personalSettingsUiState.dragStartX = touch.clientX;
      personalSettingsUiState.dragStartY = touch.clientY;
      personalSettingsUiState.dragOriginX = personalSettingsUiState.cropOffsetX;
      personalSettingsUiState.dragOriginY = personalSettingsUiState.cropOffsetY;
      cropper.classList.add("is-dragging");
    }, { passive: true });
  }

  if (personalSettingsCropperBound) return;
  personalSettingsCropperBound = true;

  const onMove = (clientX, clientY) => {
    if (!personalSettingsUiState.isDraggingCrop) return;
    personalSettingsUiState.cropOffsetX = personalSettingsUiState.dragOriginX + (clientX - personalSettingsUiState.dragStartX);
    personalSettingsUiState.cropOffsetY = personalSettingsUiState.dragOriginY + (clientY - personalSettingsUiState.dragStartY);

    const image = document.getElementById("personalSettingsCropImage");
    if (!(image instanceof HTMLImageElement)) return;

    const imageWidth = Math.max(1, Math.round(personalSettingsUiState.cropImageNaturalWidth * personalSettingsUiState.cropScale));
    const imageHeight = Math.max(1, Math.round(personalSettingsUiState.cropImageNaturalHeight * personalSettingsUiState.cropScale));
    image.style.left = `${Math.round((CROP_VIEWPORT_SIZE - imageWidth) / 2 + personalSettingsUiState.cropOffsetX)}px`;
    image.style.top = `${Math.round((CROP_VIEWPORT_SIZE - imageHeight) / 2 + personalSettingsUiState.cropOffsetY)}px`;
  };

  const stopDrag = () => {
    personalSettingsUiState.isDraggingCrop = false;
    document.getElementById("personalSettingsCropper")?.classList.remove("is-dragging");
  };

  window.addEventListener("mousemove", (event) => onMove(event.clientX, event.clientY));
  window.addEventListener("touchmove", (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    onMove(touch.clientX, touch.clientY);
  }, { passive: true });
  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("touchend", stopDrag);
  window.addEventListener("blur", stopDrag);
}

function bindPersonalSettings(root) {
  if (!root || root.dataset.personalSettingsBound === "true") return;
  root.dataset.personalSettingsBound = "true";

  root.addEventListener("click", (event) => {
    const avatarMenuBtn = event.target.closest?.("#personalSettingsAvatarMenuBtn");
    const avatarAction = event.target.closest?.("[data-avatar-action]");
    const closeCropBtn = event.target.closest?.("[data-close-crop-modal]");
    const cropSubmitBtn = event.target.closest?.("#personalSettingsCropSubmit");

    if (avatarMenuBtn) {
      event.preventDefault();
      personalSettingsUiState.photoMenuOpen = !personalSettingsUiState.photoMenuOpen;
      rerenderPersonalSettings();
      return;
    }

    if (avatarAction) {
      const action = avatarAction.getAttribute("data-avatar-action") || "";
      if (action === "upload") {
        closeAvatarMenu();
        root.querySelector("#personalSettingsAvatarFileInput")?.click();
        return;
      }
      if (action === "remove") {
        removeAvatar();
        return;
      }
    }

    if (closeCropBtn) {
      closeCropModal();
      return;
    }

    if (cropSubmitBtn) {
      applyNewAvatar();
    }
  });

  root.addEventListener("change", (event) => {
    const input = event.target.closest?.("#personalSettingsAvatarFileInput");
    if (!input) return;
    const file = input.files?.[0];
    if (file) {
      readSelectedImage(file);
    }
    input.value = "";
  });

  document.addEventListener("click", (event) => {
    if (!currentPersonalSettingsRoot?.contains(event.target)) return;

    const menuBtn = currentPersonalSettingsRoot.querySelector("#personalSettingsAvatarMenuBtn");
    const menu = currentPersonalSettingsRoot.querySelector("#personalSettingsAvatarMenu");
    if (!personalSettingsUiState.photoMenuOpen) return;
    if (menuBtn?.contains(event.target) || menu?.contains(event.target)) return;
    closeAvatarMenu();
  });
}

export function renderPersonalSettings(root) {
  if (!root) return;

  currentPersonalSettingsRoot = root;
  const model = getUserProfileModel();

  root.innerHTML = `
    <section class="page personal-settings-page">
      ${renderSideNavLayout({
        className: "settings-layout settings-layout--parametres personal-settings-layout",
        navClassName: "settings-nav settings-nav--parametres personal-settings-layout__nav",
        contentClassName: "settings-content settings-content--parametres personal-settings-layout__content",
        navHtml: renderPersonalSettingsNav(),
        contentHtml: renderPublicProfilePanel(model)
      })}
    </section>
  `;

  bindPersonalSettings(root);
  bindAvatarCropper(root);
}
