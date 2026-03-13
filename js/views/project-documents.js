import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { bindGhSplitButtons, initGhSplitButton, renderGhSplitButton } from "./ui/gh-split-button.js";

const DOCUMENT_FOLDERS = [
  { name: "Architecte", note: "Dossier discipline" },
  { name: "Structure", note: "Dossier discipline" },
  { name: "Fluides", note: "Dossier discipline" },
  { name: "Contrôle Technique", note: "Dossier discipline" },
  { name: "CSPS", note: "Dossier discipline" }
];

const PROJECT_PHASES = ["ESQ", "APS", "APD", "PRO", "DCE", "EXE", "DET", "AOR"];

const docsViewState = {
  mode: "list", // "list" | "upload"
  file: null,
  title: "",
  description: "",
  depositMode: "direct",
  isUploading: false,
  uploadProgress: 0,
  uploadTimer: null,
  selectedPhase: "APS"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function getFolderIconSvg() {
  return `
    <svg aria-hidden="true" focusable="false" class="icon-directory" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom;">
      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path>
    </svg>
  `;
}

function getDocumentIconSvg() {
  return `
    <svg height="32" aria-hidden="true" viewBox="0 0 24 24" version="1.1" width="32" data-view-component="true" class="octicon octicon-file mb-2 color-fg-muted">
      <path d="M3 3a2 2 0 0 1 2-2h9.982a2 2 0 0 1 1.414.586l4.018 4.018A2 2 0 0 1 21 7.018V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm2-.5a.5.5 0 0 0-.5.5v18a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V8.5h-4a2 2 0 0 1-2-2v-4Zm10 0v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0-.146-.336l-4.018-4.018A.5.5 0 0 0 15 2.5Z"></path>
    </svg>
  `;
}

function getCommitIconSvg() {
  return `
    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" class="octicon octicon-git-commit">
      <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
    </svg>
  `;
}

function getProposalIconSvg() {
  return `
    <svg aria-hidden="true" focusable="false" class="octicon octicon-git-pull-request" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom;">
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3.75 1.682v5.386a2.251 2.251 0 1 1-1.5 0V4.932A2.25 2.25 0 0 1 1.5 3.25Zm2.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.5-6.318V10.5a2.251 2.251 0 1 1-1.5 0V5.682A2.25 2.25 0 1 1 12.25 5.682ZM11.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm0 9.5a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM6.75 4a.75.75 0 0 1 .75-.75h2.19L8.97 2.53a.75.75 0 0 1 1.06-1.06l2 2a.75.75 0 0 1 0 1.06l-2 2a.75.75 0 0 1-1.06-1.06l.72-.72H7.5A.75.75 0 0 1 6.75 4Z"></path>
    </svg>
  `;
}

function getRemoveIconSvg() {
  return `
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
    </svg>
  `;
}

function getDownloadIconSvg() {
  return `
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom;">
      <path d="M7.25 1a.75.75 0 0 1 1.5 0v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V1Z"></path>
      <path d="M2.5 9.75a.75.75 0 0 1 .75.75v1.75c0 .138.112.25.25.25h9a.25.25 0 0 0 .25-.25V10.5a.75.75 0 0 1 1.5 0v1.75A1.75 1.75 0 0 1 12.5 14h-9A1.75 1.75 0 0 1 1.75 12.25V10.5a.75.75 0 0 1 .75-.75Z"></path>
    </svg>
  `;
}

function renderDocumentsToolbar() {
  const phaseButton = renderGhSplitButton({
    id: "documentsPhaseSplit",
    label: `<span class="gh-split__label">${escapeHtml(docsViewState.selectedPhase)}</span>`,
    items: PROJECT_PHASES.map((phase) => ({
      label: phase,
      action: `phase:${phase}`
    }))
  });

  const addButton = renderGhSplitButton({
    id: "documentsAddSplit",
    label: `<span class="gh-split__label">Ajouter</span>`,
    items: [
      { label: "Ajouter des documents", action: "add-documents" },
      { label: "Ajouter un dossier", action: "add-folder" }
    ]
  });

  const documentsButton = renderGhSplitButton({
    id: "documentsActionsSplit",
    label: `
      <span class="gh-split__label gh-split__label--with-icon">
        <span class="gh-split__icon">${getDocumentIconSvg()}</span>
        <span>Documents</span>
      </span>
    `,
    variant: "primary",
    items: [
      { label: "Télécharger le dossier ZIP", action: "download-zip" }
    ]
  });

  return `
    <div class="documents-toolbar">
      <div class="documents-toolbar__left">
        ${phaseButton}
      </div>

      <div class="documents-toolbar__right">
        ${addButton}
        ${documentsButton}
      </div>
    </div>
  `;
}

function renderDocumentsListView() {
  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="project-simple-scroll project-simple-scroll--documents" id="projectDocumentsScroll">
        <div class="documents-shell">
          ${renderDocumentsToolbar()}

          <div class="documents-repo">
            <div class="documents-repo__head">
              <div class="documents-repo__col documents-repo__col--name">Nom</div>
              <div class="documents-repo__col documents-repo__col--message">Description</div>
              <div class="documents-repo__col documents-repo__col--date">Dernière mise à jour</div>
            </div>

            <div class="documents-repo__body">
              ${DOCUMENT_FOLDERS.map((folder) => `
                <div class="documents-repo__row">
                  <div class="documents-repo__cell documents-repo__cell--name">
                    <span class="documents-repo__icon">${getFolderIconSvg()}</span>
                    <span class="documents-repo__name">${escapeHtml(folder.name)}</span>
                  </div>
                  <div class="documents-repo__cell documents-repo__cell--message">
                    ${escapeHtml(folder.note)}
                  </div>
                  <div class="documents-repo__cell documents-repo__cell--date">—</div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderUploadProgress() {
  if (!docsViewState.file) return "";

  if (docsViewState.isUploading) {
    return `
      <div class="documents-upload-progress">
        <div class="documents-upload-progress__file">
          <span class="documents-upload-progress__icon">${getDocumentIconSvg()}</span>
          <span class="documents-upload-progress__name">${escapeHtml(docsViewState.file.name)}</span>
        </div>
        <div class="documents-upload-progress__meta">
          Chargement du fichier... ${docsViewState.uploadProgress}%
        </div>
        <div class="documents-upload-progress__bar">
          <div class="documents-upload-progress__bar-fill" style="width:${docsViewState.uploadProgress}%"></div>
        </div>
      </div>
    `;
  }

  return `
    <div class="documents-uploaded-file">
      <div class="documents-uploaded-file__left">
        <span class="documents-uploaded-file__icon">${getDocumentIconSvg()}</span>
        <span class="documents-uploaded-file__name">${escapeHtml(docsViewState.file.name)}</span>
      </div>
      <button
        type="button"
        class="documents-uploaded-file__remove"
        id="documentsRemoveFileBtn"
        aria-label="Retirer le fichier"
        title="Retirer le fichier"
      >
        ${getRemoveIconSvg()}
      </button>
    </div>
  `;
}

function renderUploadView() {
  const isBusy = docsViewState.isUploading ? "is-busy" : "";
  const isDisabled = docsViewState.isUploading ? "disabled" : "";

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="project-simple-scroll project-simple-scroll--documents" id="projectDocumentsScroll">
        <div class="documents-shell documents-shell--upload">
          <div class="documents-upload-layout">
            <section class="documents-dropzone ${isBusy}" id="documentsDropzone">
              <input id="documentsFileInput" type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip,image/*">
              <div class="documents-dropzone__inner">
                <div class="documents-dropzone__icon">
                  ${getDocumentIconSvg()}
                </div>
                <h3>Glissez vos fichiers ici pour les ajouter au projet</h3>
                <p>
                  Ou
                  <button type="button" class="documents-dropzone__link" id="documentsChooseBtn" ${isDisabled}>choisissez votre fichier</button>
                </p>
              </div>
            </section>

            ${renderUploadProgress()}

            <div class="documents-commit-shell">
              <div class="documents-commit-shell__avatar">
                <img
                  src="260093543.png"
                  alt="Avatar"
                  class="documents-commit-shell__avatar-img"
                >
              </div>

              <section class="documents-commit-card">
                <div class="documents-commit-card__title">Déposer le document</div>

                <div class="documents-form-field">
                  <input
                    id="documentsTitleInput"
                    type="text"
                    class="gh-input"
                    value="${escapeHtml(docsViewState.title)}"
                    placeholder="Ex. Note d'hypothèses parasismiques - version 03"
                  >
                </div>

                <div class="documents-form-field">
                  <textarea
                    id="documentsDescriptionInput"
                    class="gh-input gh-textarea"
                    placeholder="Décrivez brièvement le contenu, le contexte ou les points d'attention."
                  >${escapeHtml(docsViewState.description)}</textarea>
                </div>

                <div class="documents-radio-group">
                  <label class="documents-radio-option">
                    <input type="radio" name="documentsDepositMode" value="direct" ${docsViewState.depositMode === "direct" ? "checked" : ""}>
                    <span class="documents-radio-option__icon">${getCommitIconSvg()}</span>
                    <span class="documents-radio-option__text">
                      Déposer directement les documents
                    </span>
                  </label>

                  <label class="documents-radio-option">
                    <input type="radio" name="documentsDepositMode" value="proposal" ${docsViewState.depositMode === "proposal" ? "checked" : ""}>
                    <span class="documents-radio-option__icon">${getProposalIconSvg()}</span>
                    <span class="documents-radio-option__text">
                      Créer une proposition avec demande de visa
                    </span>
                  </label>
                </div>
              </section>
              
              <section class="documents-commit-card">
                <div class="documents-commit-card__actions">
                  <button type="button" class="gh-btn gh-btn--validate" disabled>Valider</button>
                  <button type="button" class="gh-btn" id="documentsCancelBtn">Annuler</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function stopUploadSimulation() {
  if (docsViewState.uploadTimer) {
    clearInterval(docsViewState.uploadTimer);
    docsViewState.uploadTimer = null;
  }
}

function resetUploadState() {
  stopUploadSimulation();
  docsViewState.file = null;
  docsViewState.isUploading = false;
  docsViewState.uploadProgress = 0;
}

function simulateUpload(root, file) {
  stopUploadSimulation();
  docsViewState.file = file;
  docsViewState.isUploading = true;
  docsViewState.uploadProgress = 0;
  renderProjectDocuments(root);

  docsViewState.uploadTimer = setInterval(() => {
    const increment = docsViewState.uploadProgress < 70 ? 9 : 4;
    docsViewState.uploadProgress = Math.min(100, docsViewState.uploadProgress + increment);

    if (docsViewState.uploadProgress >= 100) {
      stopUploadSimulation();
      docsViewState.isUploading = false;
      docsViewState.uploadProgress = 100;
    }

    renderProjectDocuments(root);
  }, 120);
}

function closeUploadView(root) {
  resetUploadState();
  docsViewState.mode = "list";
  renderProjectDocuments(root);
}

function renderFromSelectedFile(root, file) {
  if (!file) return;
  simulateUpload(root, file);
}

function bindDocumentsSplitActions(root) {
  bindGhSplitButtons();

  const phaseSplit = document.querySelector('[data-split-id="documentsPhaseSplit"]');
  if (phaseSplit) {
    initGhSplitButton(phaseSplit);
    phaseSplit.addEventListener("ghsplit:action", (event) => {
      const action = event.detail?.action || "";
      if (!action.startsWith("phase:")) return;
      docsViewState.selectedPhase = action.slice("phase:".length) || docsViewState.selectedPhase;
      renderProjectDocuments(root);
    });
  }

  const addSplit = document.querySelector('[data-split-id="documentsAddSplit"]');
  if (addSplit) {
    initGhSplitButton(addSplit, { mainAction: "add-documents" });
    addSplit.addEventListener("ghsplit:action", (event) => {
      const action = event.detail?.action || "";
      if (action === "add-documents") {
        docsViewState.mode = "upload";
        renderProjectDocuments(root);
      }
      if (action === "add-folder") {
        // UI placeholder volontaire : le comportement métier/back sera branché plus tard.
      }
    });
  }

  const documentsSplit = document.querySelector('[data-split-id="documentsActionsSplit"]');
  if (documentsSplit) {
    initGhSplitButton(documentsSplit, { mainAction: "download-zip" });
    documentsSplit.addEventListener("ghsplit:action", (event) => {
      const action = event.detail?.action || "";
      if (action === "download-zip") {
        // UI placeholder volontaire : le téléchargement réel du ZIP sera branché plus tard.
      }
    });
  }
}

function bindDocumentsView(root) {
  const scrollEl = document.getElementById("projectDocumentsScroll");
  registerProjectPrimaryScrollSource(scrollEl);

  bindDocumentsSplitActions(root);

  const cancelBtn = document.getElementById("documentsCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeUploadView(root);
    });
  }

  const chooseBtn = document.getElementById("documentsChooseBtn");
  const fileInput = document.getElementById("documentsFileInput");
  const dropzone = document.getElementById("documentsDropzone");

  if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => {
      if (!docsViewState.isUploading) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0] || null;
      renderFromSelectedFile(root, file);
    });
  }

  if (dropzone && fileInput) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        if (!docsViewState.isUploading) {
          dropzone.classList.add("is-dragover");
        }
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
      });
    });

    dropzone.addEventListener("drop", (event) => {
      if (docsViewState.isUploading) return;
      const file = event.dataTransfer?.files?.[0] || null;
      renderFromSelectedFile(root, file);
    });
  }

  const removeFileBtn = document.getElementById("documentsRemoveFileBtn");
  if (removeFileBtn) {
    removeFileBtn.addEventListener("click", () => {
      resetUploadState();
      renderProjectDocuments(root);
    });
  }

  const titleInput = document.getElementById("documentsTitleInput");
  if (titleInput) {
    titleInput.addEventListener("input", (event) => {
      docsViewState.title = event.target.value;
    });
  }

  const descriptionInput = document.getElementById("documentsDescriptionInput");
  if (descriptionInput) {
    descriptionInput.addEventListener("input", (event) => {
      docsViewState.description = event.target.value;
    });
  }

  document.querySelectorAll('input[name="documentsDepositMode"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      docsViewState.depositMode = event.target.value;
    });
  });
}

export function renderProjectDocuments(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Documents",
    variant: "documents"
  });

  root.innerHTML = docsViewState.mode === "upload"
    ? renderUploadView()
    : renderDocumentsListView();

  bindDocumentsView(root);
}
