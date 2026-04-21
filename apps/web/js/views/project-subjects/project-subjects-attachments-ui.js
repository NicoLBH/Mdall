export function renderSubjectAttachmentTile(attachment = {}, options = {}) {
  const {
    escapeHtml = (value) => String(value ?? ""),
    svgIcon = () => "",
    forceImage = false,
    uploadState = "",
    uploadStateText = ""
  } = options;

  const fileName = String(attachment?.file_name || attachment?.fileName || "Pièce jointe");
  const mimeType = String(attachment?.mime_type || attachment?.mimeType || "").toLowerCase();
  const extension = String(fileName.split(".").pop() || "").toLowerCase();
  const previewUrl = String(attachment?.localPreviewUrl || attachment?.previewUrl || attachment?.object_url || "");
  const downloadUrl = String(
    attachment?.remoteObjectUrl
    || attachment?.download_url
    || attachment?.signed_url
    || attachment?.url
    || attachment?.object_url
    || previewUrl
    || ""
  );
  const isImage = forceImage || mimeType.startsWith("image/");
  const normalizedUploadState = String(uploadState || "").trim().toLowerCase();
  const normalizedUploadStateText = String(uploadStateText || "").trim();
  const typeIcon = mimeType === "application/pdf" || extension === "pdf"
    ? "file-pdf"
    : mimeType.includes("javascript") || extension === "js" || extension === "ts"
      ? "file-js"
      : extension === "dwg" || mimeType.includes("autocad") || mimeType.includes("dwg")
        ? "file-dwg"
        : "file-generic";

  let progressHtml = "";
  let uploadIndicatorHtml = "";
  if (normalizedUploadState === "uploading") {
    uploadIndicatorHtml = `
      <span class="subject-attachment__upload-indicator is-spinning" aria-label="Envoi en cours">
        ${svgIcon("attachment-upload-spinner", { className: "subject-attachment__spinner anim-rotate" })}
      </span>
    `;
  } else if (normalizedUploadState === "ready") {
    uploadIndicatorHtml = `
      <span class="subject-attachment__upload-indicator" aria-label="Pièce jointe prête">
        ${svgIcon("check-circle-fill", { className: "subject-attachment__spinner" })}
      </span>
    `;
  } else if (normalizedUploadState === "error") {
    progressHtml = `<div class="subject-attachment__state mono-small">${escapeHtml(normalizedUploadStateText || "Erreur d’upload")}</div>`;
  } else if (normalizedUploadState) {
    progressHtml = `<div class="subject-attachment__state mono-small">${escapeHtml(normalizedUploadState)}</div>`;
  }

  const metaLine = [
    mimeType || "fichier",
    Number.isFinite(Number(attachment?.size_bytes || attachment?.sizeBytes))
      ? `${Math.max(1, Math.round(Number(attachment?.size_bytes || attachment?.sizeBytes) / 1024))} KB`
      : ""
  ].filter(Boolean).join(" · ");

  if (isImage && previewUrl) {
    return `
      <div class="subject-attachment subject-attachment--image">
        <a href="${escapeHtml(downloadUrl || previewUrl)}" target="_blank" rel="noopener noreferrer">
          <img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(fileName)}" loading="lazy" />
        </a>
        <div class="subject-attachment__caption mono-small">
          <span class="subject-attachment__caption-name">${escapeHtml(fileName)}</span>
          ${uploadIndicatorHtml}
        </div>
        ${progressHtml}
      </div>
    `;
  }

  return `
    <div class="subject-attachment subject-attachment--file">
      <div class="subject-attachment__file-icon" aria-hidden="true">${svgIcon(typeIcon)}</div>
      <div class="subject-attachment__file-body">
        <div class="subject-attachment__file-head">
          ${downloadUrl
            ? `<a class="subject-attachment__file-name mono-small subject-attachment__file-link--name" href="${escapeHtml(downloadUrl)}" rel="noopener noreferrer" download="${escapeHtml(fileName)}">${escapeHtml(fileName)}</a>`
            : `<div class="subject-attachment__file-name mono-small">${escapeHtml(fileName)}</div>`}
          ${uploadIndicatorHtml}
        </div>
        <div class="subject-attachment__file-meta mono-small">${escapeHtml(metaLine || "fichier")}</div>
        ${progressHtml}
      </div>
      ${downloadUrl ? `<a class="subject-attachment__file-link" href="${escapeHtml(downloadUrl)}" rel="noopener noreferrer" download="${escapeHtml(fileName)}">Télécharger</a>` : ""}
    </div>
  `;
}

export function renderSubjectAttachmentsPreviewList({
  attachments = [],
  removeAction = "",
  messageId = "",
  escapeHtml = (value) => String(value ?? ""),
  svgIcon = () => "",
  normalizeAttachmentId = (value) => String(value || "").trim()
} = {}) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return "";

  return `
    <div class="subject-composer-attachments">
      ${list.map((attachment, index) => `
        <div class="subject-composer-attachment-item">
          ${renderSubjectAttachmentTile(attachment, {
            escapeHtml,
            svgIcon,
            forceImage: !!attachment?.isImage,
            uploadState: attachment?.error
              ? "error"
              : String(attachment?.uploadStatus || "").trim() === "uploading"
                ? "uploading"
                : "ready",
            uploadStateText: attachment?.error ? "Erreur d’upload" : ""
          })}
          ${removeAction
            ? `<button
                class="subject-composer-attachment-remove"
                type="button"
                data-action="${escapeHtml(removeAction)}"
                data-message-id="${messageId ? escapeHtml(String(messageId)) : ""}"
                data-attachment-id="${escapeHtml(normalizeAttachmentId(attachment?.id))}"
                data-temp-id="${escapeHtml(String(attachment?.tempId || index))}"
                aria-label="Retirer la pièce jointe"
              >
                ${svgIcon("x")}
              </button>`
            : ""}
        </div>
      `).join("")}
    </div>
  `;
}
