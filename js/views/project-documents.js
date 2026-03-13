import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";

const DOCUMENT_FOLDERS = [
  { name: "Architecte", note: "Dossier discipline" },
  { name: "Structure", note: "Dossier discipline" },
  { name: "Fluides", note: "Dossier discipline" },
  { name: "Contrôle Technique", note: "Dossier discipline" },
  { name: "CSPS", note: "Dossier discipline" }
];

const docsViewState = {
  mode: "list", // "list" | "upload"
  file: null,
  title: "",
  description: "",
  depositMode: "direct"
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

function renderDocumentsToolbar() {
  return `
    <div class="documents-toolbar">
      <div class="documents-toolbar__left">
        <button type="button" class="gh-btn" id="documentsAddBtn">Ajouter un document</button>
      </div>
    </div>
  `;
}

function renderDocumentsListView() {
  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="project-simple-scroll" id="projectDocumentsScroll">
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
                <div class="documents-repo__cell documents-repo__cell--date">
                  —
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderUploadView() {
  const fileLabel = docsViewState.file
    ? `<div class="documents-upload__file mono">Fichier sélectionné : ${escapeHtml(docsViewState.file.name)}</div>`
    : `<div class="documents-upload__file">Aucun fichier sélectionné pour le moment.</div>`;

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="project-simple-scroll" id="projectDocumentsScroll">
        <div class="documents-toolbar">
          <div class="documents-toolbar__left">
            <button type="button" class="gh-btn" id="documentsBackBtn">Annuler</button>
          </div>
        </div>

        <div class="documents-upload-layout">
          <section class="documents-dropzone" id="documentsDropzone">
            <input id="documentsFileInput" type="file" hidden>
            <div class="documents-dropzone__inner">
              <div class="documents-dropzone__icon">
                ${getFolderIconSvg()}
              </div>
              <h3>Glissez vos fichiers ici pour les ajouter au projet</h3>
              <p>
                Ou
                <button type="button" class="documents-dropzone__link" id="documentsChooseBtn">choose your file</button>
              </p>
              ${fileLabel}
            </div>
          </section>

          <section class="documents-commit-card">
            <div class="documents-commit-card__title">Déposer le document</div>

            <div class="documents-form-field">
              <label for="documentsTitleInput">Titre</label>
              <input
                id="documentsTitleInput"
                type="text"
                class="gh-input"
                value="${escapeHtml(docsViewState.title)}"
                placeholder="Ex. Plan CVC niveau R+2 - version 03"
              >
            </div>

            <div class="documents-form-field">
              <label for="documentsDescriptionInput">Informations complémentaires</label>
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
                  <strong>Déposer directement les documents</strong>
                </span>
              </label>

              <label class="documents-radio-option">
                <input type="radio" name="documentsDepositMode" value="proposal" ${docsViewState.depositMode === "proposal" ? "checked" : ""}>
                <span class="documents-radio-option__icon">${getProposalIconSvg()}</span>
                <span class="documents-radio-option__text">
                  <strong>Créer une proposition avec demande de visa</strong>
                </span>
              </label>
            </div>

            <div class="documents-commit-card__actions">
              <button type="button" class="gh-btn gh-btn--validate" disabled>Valider</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function bindDocumentsView(root) {
  const scrollEl = document.getElementById("projectDocumentsScroll");
  registerProjectPrimaryScrollSource(scrollEl);

  const addBtn = document.getElementById("documentsAddBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      docsViewState.mode = "upload";
      renderProjectDocuments(root);
    });
  }

  const backBtn = document.getElementById("documentsBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      docsViewState.mode = "list";
      renderProjectDocuments(root);
    });
  }

  const chooseBtn = document.getElementById("documentsChooseBtn");
  const fileInput = document.getElementById("documentsFileInput");
  const dropzone = document.getElementById("documentsDropzone");

  if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      docsViewState.file = event.target.files?.[0] || null;
      renderProjectDocuments(root);
    });
  }

  if (dropzone && fileInput) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
      });
    });

    dropzone.addEventListener("drop", (event) => {
      const file = event.dataTransfer?.files?.[0] || null;
      docsViewState.file = file;
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
