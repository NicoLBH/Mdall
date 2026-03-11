import { store } from "../store.js";

export function renderProjectDocuments(root) {
  const fileLabel = store.projectForm.pdfFile?.name
    ? `<div class="mono" style="margin-top:8px;">Fichier sélectionné : ${store.projectForm.pdfFile.name}</div>`
    : "";

  root.innerHTML = `
    <h2>Documents</h2>

    <div class="form-row">
      <label>PDF étude</label>
      <input id="pdfFile" type="file" accept="application/pdf">
      ${fileLabel}
    </div>
  `;

  bindDocumentsEvents();
}

function bindDocumentsEvents() {
  const pdfFile = document.getElementById("pdfFile");

  if (pdfFile) {
    pdfFile.addEventListener("change", (e) => {
      store.projectForm.pdfFile = e.target.files?.[0] || null;
      renderProjectDocuments(document.getElementById("project-content"));
    });
  }
}
