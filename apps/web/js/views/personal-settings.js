import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem
} from "./ui/side-nav-layout.js";

const DEFAULT_AVATAR = "assets/images/260093543.png";
const CROP_VIEWPORT_SIZE = 412;
const DEFAULT_SELECTION_DIAMETER = 290;
const MIN_SELECTION_DIAMETER = 120;
const OUTPUT_AVATAR_SIZE = 512;

const personalSettingsUiState = {
  photoMenuOpen: false,
  cropModalOpen: false,
  cropImageSrc: "",
  cropImageNaturalWidth: 0,
  cropImageNaturalHeight: 0,
  cropDisplayWidth: 0,
  cropDisplayHeight: 0,
  cropDisplayLeft: 0,
  cropDisplayTop: 0,
  selectionCenterX: CROP_VIEWPORT_SIZE / 2,
  selectionCenterY: CROP_VIEWPORT_SIZE / 2,
  selectionDiameter: DEFAULT_SELECTION_DIAMETER,
  pointerMode: "idle",
  activeHandle: "",
  dragStartX: 0,
  dragStartY: 0,
  dragOriginCenterX: CROP_VIEWPORT_SIZE / 2,
  dragOriginCenterY: CROP_VIEWPORT_SIZE / 2,
  dragOriginDiameter: DEFAULT_SELECTION_DIAMETER,
  dragOriginVectorX: 0,
  dragOriginVectorY: 0,
  dragOriginDistance: 0
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

  const radius = personalSettingsUiState.selectionDiameter / 2;
  const left = Math.round(personalSettingsUiState.selectionCenterX - radius);
  const top = Math.round(personalSettingsUiState.selectionCenterY - radius);
  const size = Math.round(personalSettingsUiState.selectionDiameter);

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
              style="width:${Math.round(personalSettingsUiState.cropDisplayWidth)}px;height:${Math.round(personalSettingsUiState.cropDisplayHeight)}px;left:${Math.round(personalSettingsUiState.cropDisplayLeft)}px;top:${Math.round(personalSettingsUiState.cropDisplayTop)}px;"
            >
            <div class="personal-settings-cropper__mask" aria-hidden="true"></div>
            <div
              class="personal-settings-cropper__selection"
              id="personalSettingsCropSelection"
              style="width:${size}px;height:${size}px;left:${left}px;top:${top}px;"
              aria-hidden="true"
            >
              <div class="personal-settings-cropper__circle"></div>
              <button type="button" class="personal-settings-cropper__handle personal-settings-cropper__handle--nw" data-resize-handle="nw" tabindex="-1" aria-hidden="true"></button>
              <button type="button" class="personal-settings-cropper__handle personal-settings-cropper__handle--ne" data-resize-handle="ne" tabindex="-1" aria-hidden="true"></button>
              <button type="button" class="personal-settings-cropper__handle personal-settings-cropper__handle--sw" data-resize-handle="sw" tabindex="-1" aria-hidden="true"></button>
              <button type="button" class="personal-settings-cropper__handle personal-settings-cropper__handle--se" data-resize-handle="se" tabindex="-1" aria-hidden="true"></button>
            </div>
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

function resetCropInteraction() {
  personalSettingsUiState.pointerMode = "idle";
  personalSettingsUiState.activeHandle = "";
}

function closeCropModal() {
  personalSettingsUiState.cropModalOpen = false;
  personalSettingsUiState.cropImageSrc = "";
  personalSettingsUiState.cropImageNaturalWidth = 0;
  personalSettingsUiState.cropImageNaturalHeight = 0;
  personalSettingsUiState.cropDisplayWidth = 0;
  personalSettingsUiState.cropDisplayHeight = 0;
  personalSettingsUiState.cropDisplayLeft = 0;
  personalSettingsUiState.cropDisplayTop = 0;
  personalSettingsUiState.selectionCenterX = CROP_VIEWPORT_SIZE / 2;
  personalSettingsUiState.selectionCenterY = CROP_VIEWPORT_SIZE / 2;
  personalSettingsUiState.selectionDiameter = DEFAULT_SELECTION_DIAMETER;
  resetCropInteraction();
  rerenderPersonalSettings();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMaxDiameterForCenter(centerX, centerY) {
  const radiusLimit = Math.min(centerX, CROP_VIEWPORT_SIZE - centerX, centerY, CROP_VIEWPORT_SIZE - centerY);
  return Math.max(MIN_SELECTION_DIAMETER, radiusLimit * 2);
}

function syncSelectionElement() {
  const selection = document.getElementById("personalSettingsCropSelection");
  if (!(selection instanceof HTMLElement)) return;

  const size = Math.round(personalSettingsUiState.selectionDiameter);
  const left = Math.round(personalSettingsUiState.selectionCenterX - (size / 2));
  const top = Math.round(personalSettingsUiState.selectionCenterY - (size / 2));

  selection.style.width = `${size}px`;
  selection.style.height = `${size}px`;
  selection.style.left = `${left}px`;
  selection.style.top = `${top}px`;
}

function setSelectionGeometry(centerX, centerY, diameter) {
  const safeDiameter = clamp(diameter, MIN_SELECTION_DIAMETER, CROP_VIEWPORT_SIZE);
  const radius = safeDiameter / 2;
  const clampedCenterX = clamp(centerX, radius, CROP_VIEWPORT_SIZE - radius);
  const clampedCenterY = clamp(centerY, radius, CROP_VIEWPORT_SIZE - radius);
  const maxDiameter = getMaxDiameterForCenter(clampedCenterX, clampedCenterY);

  personalSettingsUiState.selectionCenterX = clampedCenterX;
  personalSettingsUiState.selectionCenterY = clampedCenterY;
  personalSettingsUiState.selectionDiameter = clamp(safeDiameter, MIN_SELECTION_DIAMETER, maxDiameter);

  syncSelectionElement();
}

function openCropModal(imageSrc, imageWidth, imageHeight) {
  const fitScale = Math.min(CROP_VIEWPORT_SIZE / Math.max(1, imageWidth), CROP_VIEWPORT_SIZE / Math.max(1, imageHeight));
  const displayWidth = imageWidth * fitScale;
  const displayHeight = imageHeight * fitScale;

  personalSettingsUiState.cropModalOpen = true;
  personalSettingsUiState.cropImageSrc = imageSrc;
  personalSettingsUiState.cropImageNaturalWidth = imageWidth;
  personalSettingsUiState.cropImageNaturalHeight = imageHeight;
  personalSettingsUiState.cropDisplayWidth = displayWidth;
  personalSettingsUiState.cropDisplayHeight = displayHeight;
  personalSettingsUiState.cropDisplayLeft = (CROP_VIEWPORT_SIZE - displayWidth) / 2;
  personalSettingsUiState.cropDisplayTop = (CROP_VIEWPORT_SIZE - displayHeight) / 2;
  personalSettingsUiState.selectionCenterX = CROP_VIEWPORT_SIZE / 2;
  personalSettingsUiState.selectionCenterY = CROP_VIEWPORT_SIZE / 2;
  personalSettingsUiState.selectionDiameter = Math.min(DEFAULT_SELECTION_DIAMETER, getMaxDiameterForCenter(CROP_VIEWPORT_SIZE / 2, CROP_VIEWPORT_SIZE / 2));
  resetCropInteraction();

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
  canvas.width = OUTPUT_AVATAR_SIZE;
  canvas.height = OUTPUT_AVATAR_SIZE;

  const context = canvas.getContext("2d");
  const image = document.getElementById("personalSettingsCropImage");
  if (!context || !(image instanceof HTMLImageElement)) return "";

  const diameter = personalSettingsUiState.selectionDiameter;
  const radius = diameter / 2;
  const selectionLeft = personalSettingsUiState.selectionCenterX - radius;
  const selectionTop = personalSettingsUiState.selectionCenterY - radius;
  const scaleToCanvas = OUTPUT_AVATAR_SIZE / diameter;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.beginPath();
  context.arc(OUTPUT_AVATAR_SIZE / 2, OUTPUT_AVATAR_SIZE / 2, OUTPUT_AVATAR_SIZE / 2 - 1, 0, Math.PI * 2);
  context.closePath();
  context.clip();

  const drawX = (personalSettingsUiState.cropDisplayLeft - selectionLeft) * scaleToCanvas;
  const drawY = (personalSettingsUiState.cropDisplayTop - selectionTop) * scaleToCanvas;
  const drawWidth = personalSettingsUiState.cropDisplayWidth * scaleToCanvas;
  const drawHeight = personalSettingsUiState.cropDisplayHeight * scaleToCanvas;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
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

function startMoveSelection(clientX, clientY, cropper) {
  personalSettingsUiState.pointerMode = "move";
  personalSettingsUiState.dragStartX = clientX;
  personalSettingsUiState.dragStartY = clientY;
  personalSettingsUiState.dragOriginCenterX = personalSettingsUiState.selectionCenterX;
  personalSettingsUiState.dragOriginCenterY = personalSettingsUiState.selectionCenterY;
  cropper.classList.add("is-moving-selection");
}

function startResizeSelection(clientX, clientY, handle, cropper) {
  personalSettingsUiState.pointerMode = "resize";
  personalSettingsUiState.activeHandle = handle;
  personalSettingsUiState.dragStartX = clientX;
  personalSettingsUiState.dragStartY = clientY;
  personalSettingsUiState.dragOriginCenterX = personalSettingsUiState.selectionCenterX;
  personalSettingsUiState.dragOriginCenterY = personalSettingsUiState.selectionCenterY;
  personalSettingsUiState.dragOriginDiameter = personalSettingsUiState.selectionDiameter;

  const vectorX = clientX - personalSettingsUiState.selectionCenterX;
  const vectorY = clientY - personalSettingsUiState.selectionCenterY;
  personalSettingsUiState.dragOriginVectorX = vectorX;
  personalSettingsUiState.dragOriginVectorY = vectorY;
  personalSettingsUiState.dragOriginDistance = Math.max(1, Math.hypot(vectorX, vectorY));

  cropper.classList.add("is-resizing-selection");
}

function bindAvatarCropper(root) {
  const cropper = root.querySelector("#personalSettingsCropper");
  if (!cropper) return;

  if (cropper.dataset.bound !== "true") {
    cropper.dataset.bound = "true";

    cropper.addEventListener("mousedown", (event) => {
      const handle = event.target.closest?.("[data-resize-handle]")?.getAttribute("data-resize-handle") || "";
      const selection = event.target.closest?.("#personalSettingsCropSelection");
      if (!handle && !selection) return;

      event.preventDefault();
      if (handle) {
        startResizeSelection(event.clientX, event.clientY, handle, cropper);
        return;
      }
      startMoveSelection(event.clientX, event.clientY, cropper);
    });

    cropper.addEventListener("touchstart", (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;

      const touchTarget = event.target;
      const handle = touchTarget.closest?.("[data-resize-handle]")?.getAttribute("data-resize-handle") || "";
      const selection = touchTarget.closest?.("#personalSettingsCropSelection");
      if (!handle && !selection) return;

      if (handle) {
        startResizeSelection(touch.clientX, touch.clientY, handle, cropper);
      } else {
        startMoveSelection(touch.clientX, touch.clientY, cropper);
      }
    }, { passive: true });
  }

  if (personalSettingsCropperBound) return;
  personalSettingsCropperBound = true;

  const onMove = (clientX, clientY) => {
    if (personalSettingsUiState.pointerMode === "move") {
      const nextCenterX = personalSettingsUiState.dragOriginCenterX + (clientX - personalSettingsUiState.dragStartX);
      const nextCenterY = personalSettingsUiState.dragOriginCenterY + (clientY - personalSettingsUiState.dragStartY);
      setSelectionGeometry(nextCenterX, nextCenterY, personalSettingsUiState.selectionDiameter);
      return;
    }

    if (personalSettingsUiState.pointerMode === "resize") {
      const moveDeltaX = clientX - personalSettingsUiState.dragStartX;
      const moveDeltaY = clientY - personalSettingsUiState.dragStartY;
      const originDistance = Math.max(1, personalSettingsUiState.dragOriginDistance);
      const unitX = personalSettingsUiState.dragOriginVectorX / originDistance;
      const unitY = personalSettingsUiState.dragOriginVectorY / originDistance;
      const projectedDelta = (moveDeltaX * unitX) + (moveDeltaY * unitY);
      const originRadius = personalSettingsUiState.dragOriginDiameter / 2;
      const nextRadius = originRadius + projectedDelta;
      const newDiameter = clamp(
        nextRadius * 2,
        MIN_SELECTION_DIAMETER,
        getMaxDiameterForCenter(
          personalSettingsUiState.dragOriginCenterX,
          personalSettingsUiState.dragOriginCenterY
        )
      );
      setSelectionGeometry(
        personalSettingsUiState.dragOriginCenterX,
        personalSettingsUiState.dragOriginCenterY,
        newDiameter
      );
    }
  };

  const stopInteraction = () => {
    resetCropInteraction();
    document.getElementById("personalSettingsCropper")?.classList.remove("is-moving-selection", "is-resizing-selection");
  };

  window.addEventListener("mousemove", (event) => onMove(event.clientX, event.clientY));
  window.addEventListener("touchmove", (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    onMove(touch.clientX, touch.clientY);
  }, { passive: true });
  window.addEventListener("mouseup", stopInteraction);
  window.addEventListener("touchend", stopInteraction);
  window.addEventListener("blur", stopInteraction);
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
