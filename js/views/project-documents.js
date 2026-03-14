import { store } from "../store.js";
import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { bindGhActionButtons, initGhActionButton, renderGhActionButton } from "./ui/gh-split-button.js";
import { renderGhInput } from "./ui/gh-input.js";
import { svgIcon } from "../ui/icons.js";
import { renderDataTableShell, renderDataTableHead } from "./ui/data-table-shell.js";

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
  proposalName: "",
  isUploading: false,
  uploadProgress: 0,
  uploadTimer: null,
  selectedPhase: "APS",
  repoDocuments: []
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
  return svgIcon("file-directory", { className: "icon-directory" });
}

function getDocumentIconSvg() {
  return svgIcon("file", { className: "octicon octicon-file color-fg-muted" });
}

function getLargeDocumentIconSvg() {
  return svgIcon("file", {
    className: "octicon octicon-file mb-2 color-fg-muted",
    width: 32,
    height: 32
  });
}

function getCommitIconSvg() {
  return svgIcon("git-commit", { className: "octicon octicon-git-commit" });
}

function getProposalIconSvg() {
  return svgIcon("git-pull-request", {
    className: "octicon octicon-git-pull-request"
  });
}

function getRemoveIconSvg() {
  return svgIcon("x");
}

function getDocumentsTableGridTemplate() {
  return "minmax(280px, 1.2fr) minmax(220px, 1fr) 180px";
}

function renderDocumentsTableHeadHtml() {
  return renderDataTableHead({
    columns: [
      { className: "documents-repo__col documents-repo__col--name", label: "Nom" },
      { className: "documents-repo__col documents-repo__col--message", label: "Description" },
      { className: "documents-repo__col documents-repo__col--date", label: "Dernière mise à jour" }
    ]
  });
}

function renderDocumentsToolbar() {
  const phaseButton = renderGhActionButton({
    id: "documentsPhaseSplit",
    label: docsViewState.selectedPhase,
    tone: "default",
    items: PROJECT_PHASES.map((phase) => ({
      label: phase,
      action: `phase:${phase}`
    }))
  });

  const addButton = renderGhActionButton({
    id: "documentsAddSplit",
    label: "Ajouter",
    tone: "default",
    mainAction: "add-documents",
    items: [
      { label: "Ajouter des documents", action: "add-documents" },
      { label: "Ajouter un dossier", action: "add-folder" }
    ]
  });

  const documentsButton = renderGhActionButton({
    id: "documentsActionsSplit",
    label: "Documents",
    icon: getLargeDocumentIconSvg(),
    tone: "primary",
    mainAction: "download-zip",
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

function renderRepoDocumentRow(doc) {
  return `
    <div class="documents-repo__row documents-repo__row--file">
      <div class="documents-repo__cell documents-repo__cell--name">
        <span class="documents-repo__icon documents-repo__icon--document">${getDocumentIconSvg()}</span>
        <span class="documents-repo__name">${escapeHtml(doc.name)}</span>
      </div>
      <div class="documents-repo__cell documents-repo__cell--message">
        ${escapeHtml(doc.note || "Document prêt pour l'analyse")}
      </div>
      <div class="documents-repo__cell documents-repo__cell--date">${escapeHtml(doc.updatedAt || "À l'instant")}</div>
    </div>
  `;
}

function renderDocumentsListView() {
  const bodyHtml = `
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
    ${docsViewState.repoDocuments.map(renderRepoDocumentRow).join("")}
  `;

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="project-simple-scroll project-simple-scroll--documents" id="projectDocumentsScroll">
        <div class="documents-shell" id="projectDocumentScroll">
          ${renderDocumentsToolbar()}

          ${renderDataTableShell({
            className: "documents-repo",
            gridTemplate: getDocumentsTableGridTemplate(),
            headHtml: renderDocumentsTableHeadHtml(),
            bodyHtml
          })}
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
          <span class="documents-upload-progress__icon">${getLargeDocumentIconSvg()}</span>
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
        <span class="documents-uploaded-file__icon">${getLargeDocumentIconSvg()}</span>
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

function canSubmitUpload() {
  if (!docsViewState.file || docsViewState.isUploading) return false;
  if (docsViewState.depositMode === "proposal") {
    return docsViewState.proposalName.trim().length > 0;
  }
  return true;
}

function renderProposalField() {
  if (docsViewState.depositMode !== "proposal") return "";

  return `
    <div class="documents-form-field documents-form-field--proposal">
      <label for="documentsProposalNameInput">Nom de la modification</label>
      ${renderGhInput({
        id: "documentsProposalNameInput",
        value: docsViewState.proposalName,
        placeholder: "Ex. Ajustement du visa sur note parasismique V03",
        icon: getProposalIconSvg(),
        className: "documents-gh-input"
      })}
    </div>
  `;
}

function renderUploadView() {
  const isBusy = docsViewState.isUploading ? "is-busy" : "";
  const isDisabled = docsViewState.isUploading ? "disabled" : "";
  const submitLabel = docsViewState.depositMode === "proposal"
    ? "Proposer la modification"
    : "Valider";

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="project-simple-scroll project-simple-scroll--documents" id="projectDocumentsScroll">
        <div class="documents-shell documents-shell--upload" id="projectDocumentScroll">
          <div class="documents-upload-layout">
            <section class="documents-dropzone ${isBusy}" id="documentsDropzone">
              <input id="documentsFileInput" type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip,image/*">
              <div class="documents-dropzone__inner">
                <div class="documents-dropzone__icon">
                  ${getLargeDocumentIconSvg()}
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
                  src="assets/images/260093543.png"
                  alt="Avatar"
                  class="documents-commit-shell__avatar-img"
                >
              </div>

              <section class="documents-commit-card">
                <div class="documents-commit-card__title">Déposer le document</div>

                <div class="documents-form-field">
                  ${renderGhInput({
                    id: "documentsTitleInput",
                    value: docsViewState.title,
                    placeholder: "Ex. Note d'hypothèses parasismiques - version 03",
                    icon: getDocumentIconSvg()
                  })}
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

                ${renderProposalField()}
              </section>

              <section class="documents-commit-card documents-commit-card-actions">
                <div class="documents-commit-card__actions">
                  <button type="button" class="gh-btn gh-btn--validate" id="documentsSubmitBtn" ${canSubmitUpload() ? "" : "disabled"}>${submitLabel}</button>
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
  docsViewState.title = "";
  docsViewState.description = "";
  docsViewState.depositMode = "direct";
  docsViewState.proposalName = "";
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
  if (!docsViewState.title) {
    docsViewState.title = file.name.replace(/\.[^.]+$/, "");
  }
  simulateUpload(root, file);
}

function buildRepoDocumentFromState() {
  const title = docsViewState.title.trim();
  const description = docsViewState.description.trim();
  const baseNote = title || description || "Document prêt pour l'analyse";

  return {
    id: `doc-${Date.now()}`,
    name: docsViewState.file?.name || "Document",
    note: baseNote,
    updatedAt: "À l'instant"
  };
}

function commitDirectDocument(root) {
  if (!docsViewState.file) return;

  docsViewState.repoDocuments.unshift(buildRepoDocumentFromState());
  store.projectForm.pdfFile = docsViewState.file;
  closeUploadView(root);
}

function commitProposal(root) {
  if (!docsViewState.file) return;

  docsViewState.repoDocuments.unshift({
    id: `proposal-${Date.now()}`,
    name: docsViewState.file.name,
    note: `Proposition : ${docsViewState.proposalName.trim()}`,
    updatedAt: "À l'instant"
  });

  closeUploadView(root);
}

function handleSubmit(root) {
  if (!canSubmitUpload()) return;
  if (docsViewState.depositMode === "proposal") {
    commitProposal(root);
    return;
  }
  commitDirectDocument(root);
}

function bindDocumentsSplitActions(root) {
  bindGhActionButtons();

  const phaseSplit = document.querySelector('[data-action-id="documentsPhaseSplit"]');
  if (phaseSplit) {
    initGhActionButton(phaseSplit);
    phaseSplit.addEventListener("ghaction:action", (event) => {
      const action = event.detail?.action || "";
      if (!action.startsWith("phase:")) return;
      docsViewState.selectedPhase = action.slice("phase:".length) || docsViewState.selectedPhase;
      renderProjectDocuments(root);
    });
  }

  const addSplit = document.querySelector('[data-action-id="documentsAddSplit"]');
  if (addSplit) {
    initGhActionButton(addSplit, { mainAction: "add-documents" });
    addSplit.addEventListener("ghaction:action", (event) => {
      const action = event.detail?.action || "";
      if (action === "add-documents") {
        docsViewState.mode = "upload";
        renderProjectDocuments(root);
      }
      if (action === "add-folder") {
        // placeholder métier
      }
    });
  }

  const documentsSplit = document.querySelector('[data-action-id="documentsActionsSplit"]');
  if (documentsSplit) {
    initGhActionButton(documentsSplit, { mainAction: "download-zip" });
    documentsSplit.addEventListener("ghaction:action", (event) => {
      const action = event.detail?.action || "";
      if (action === "download-zip") {
        // placeholder métier
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

  const submitBtn = document.getElementById("documentsSubmitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      handleSubmit(root);
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
      docsViewState.file = null;
      docsViewState.isUploading = false;
      docsViewState.uploadProgress = 0;
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

  const proposalNameInput = document.getElementById("documentsProposalNameInput");
  if (proposalNameInput) {
    proposalNameInput.addEventListener("input", (event) => {
      docsViewState.proposalName = event.target.value;
      const submit = document.getElementById("documentsSubmitBtn");
      if (submit) submit.disabled = !canSubmitUpload();
    });
  }

  document.querySelectorAll('input[name="documentsDepositMode"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      docsViewState.depositMode = event.target.value;
      renderProjectDocuments(root);
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
