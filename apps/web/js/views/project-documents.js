import { store } from "../store.js";
import { setProjectViewHeader, clearProjectActiveScrollSource } from "./project-shell-chrome.js";
import {
  bindGhActionButtons,
  initGhActionButton,
  renderGhActionButton
} from "./ui/gh-split-button.js";
import {
  renderProjectTableToolbar,
  renderProjectTableToolbarGroup
} from "./ui/project-table-toolbar.js";
import { renderGhInput } from "./ui/gh-input.js";
import { renderStateDot } from "./ui/status-badges.js";
import { renderUploadProgressBar } from "./ui/upload-progress.js";
import { svgIcon } from "../ui/icons.js";
import { renderDataTableShell, renderDataTableHead, renderDataTableEmptyState } from "./ui/data-table-shell.js";
import { escapeHtml } from "../utils/escape-html.js";
import { shouldAutoRunAnalysisAfterUpload } from "../services/project-automation.js";
import {
  getCurrentAnalysisRunMeta,
  isAnalysisRunning,
  runAnalysis
} from "../services/analysis-runner.js";
import { addProjectDocument, decorateDocumentWithPhase, getEnabledProjectPhasesCatalog, getProjectDocumentById, getProjectDocumentPreviewUrl, getProjectDocuments, resolveDocumentRefs, setActiveProjectDocument } from "../services/project-documents-store.js";
import { getDocumentStatsMap } from "../services/project-document-selectors.js";
import { syncProjectDocumentsFromSupabase } from "../services/project-supabase-sync.js";
import { getEffectiveSituationStatus, getEffectiveSujetStatus } from "./project-situations.js";
import { buildSupabaseAuthHeaders, getSupabaseAnonKey, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabaseAnonKey();
const PDFJS_CDN_VERSION = "4.4.168";
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.worker.min.mjs`;

let pdfJsLibPromise = null;
let pdfPreviewRenderToken = 0;

const pdfPreviewController = {
  root: null,
  isBound: false,
  renderPromise: Promise.resolve(),
  pdfDocument: null,
  documentCacheKey: "",
  rawBytes: null,
  sourceDocumentId: "",
  searchResults: [],
  activeSearchIndex: -1
};

function logPdfPreviewDebug() {}

const docsViewState = {
  mode: "list", // "list" | "upload" | "report-preview" | "pdf-preview"
  file: null,
  title: "",
  description: "",
  isUploading: false,
  uploadProgress: 0,
  uploadTimer: null,
  selectedPhase: store.projectForm?.currentPhase || store.projectForm?.phase || "APS",
  reportNumber: 1,
  activity: {
    tone: "info",
    title: "",
    message: ""
  },
  pdfPreview: {
    objectUrl: "",
    signedUrl: "",
    sourceDocumentId: "",
    isLoading: false,
    errorMessage: "",
    bytes: null,
    pageCount: 0,
    zoomLevel: 1,
    rotation: 0,
    searchQuery: "",
    darkMode: false
  }
};

function syncDocumentsSelectedPhase() {
  const enabledPhases = getEnabledProjectPhasesCatalog();
  const fallbackPhase = enabledPhases[0]?.code || "APS";

  if (!enabledPhases.some((item) => item.code === docsViewState.selectedPhase)) {
    docsViewState.selectedPhase =
      enabledPhases.find((item) => item.code === store.projectForm?.currentPhase)?.code ||
      enabledPhases.find((item) => item.code === store.projectForm?.phase)?.code ||
      fallbackPhase;
  }
}

function getDocumentIconSvg() {
  return svgIcon("file", { className: "octicon octicon-file color-fg-muted" });
}

function getPlusIconSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M8 3.25v9.5M3.25 8h9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;
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

function getSocotecLogoSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="52" fill="none"><path d="M21.09 27.614c-3.879 0-7.03-3.17-7.03-7.07 0-3.902 3.151-7.072 7.03-7.072a7.005 7.005 0 0 1 5.46 2.62c1.623-1.324 3.5-2.845 5.46-4.45-2.577-3.198-6.51-5.24-10.92-5.24-7.771 0-14.057 6.338-14.057 14.141 0 7.818 6.3 14.142 14.056 14.142 4.41 0 8.344-2.042 10.92-5.24l-5.46-4.45a7.005 7.005 0 0 1-5.46 2.62Z" fill="#0082DE"/><path d="M26.55 24.98a7.052 7.052 0 0 0 1.567-4.451c0-1.69-.588-3.24-1.568-4.451-3.22 2.62-5.46 4.451-5.46 4.451l5.46 4.451ZM42.173 20.543c0-5.057-1.764-9.705-4.704-13.353-1.806 1.479-3.668 3-5.46 4.451a14.134 14.134 0 0 1 3.136 8.902c0 3.367-1.176 6.465-3.136 8.902l5.46 4.451c2.954-3.648 4.704-8.296 4.704-13.353Z" fill="#00ACE8"/><path d="M32.023 11.641c-1.96 1.606-3.836 3.127-5.46 4.451a7.052 7.052 0 0 1 1.568 4.451c0 1.69-.588 3.24-1.568 4.451l5.46 4.451a14.134 14.134 0 0 0 3.136-8.902c-.014-3.38-1.176-6.48-3.136-8.902Z" fill="#005499"/><path d="M21.108 43.853c-.311.275-.699.405-1.14.42-.448-.015-.85-.16-1.162-.443-.319-.298-.478-.68-.47-1.145 0-.458.167-.847.478-1.153.304-.297.691-.45 1.147-.465.433 0 .806.137 1.132.374l.988-1.008a2.942 2.942 0 0 0-1.337-.633 3.31 3.31 0 0 0-.623-.07h-.16c-.038 0-.076 0-.114.009h-.015a3.319 3.319 0 0 0-.623.084 3.036 3.036 0 0 0-1.444.755c-.584.557-.888 1.26-.896 2.122-.008.863.289 1.558.874 2.1.197.183.41.328.646.45.455.229.964.343 1.534.336h.046a3.297 3.297 0 0 0 1.512-.397 2.72 2.72 0 0 0 .577-.405l-.95-.931Zm22.876 0c-.312.275-.7.405-1.14.42-.448-.015-.85-.16-1.162-.443-.32-.298-.479-.68-.471-1.145 0-.458.167-.847.478-1.153.304-.297.692-.45 1.148-.465.433 0 .805.137 1.131.374l.988-1.008a2.942 2.942 0 0 0-1.337-.633 3.312 3.312 0 0 0-.623-.07h-.16c-.037 0-.075 0-.113.009h-.016a3.319 3.319 0 0 0-.623.084 3.036 3.036 0 0 0-1.443.755c-.585.557-.889 1.26-.896 2.122-.008.863.288 1.558.873 2.1.198.183.41.328.646.45.456.229.965.343 1.535.336h.045a3.297 3.297 0 0 0 1.512-.397 2.72 2.72 0 0 0 .577-.405l-.95-.931Zm-18.636 1.756c-.859 0-1.573-.283-2.143-.863-.57-.58-.85-1.275-.85-2.1 0-.824.28-1.518.85-2.098.57-.58 1.284-.863 2.143-.863.858 0 1.572.282 2.142.863.57.58.851 1.274.851 2.099 0 .824-.281 1.519-.85 2.1-.57.58-1.285.862-2.143.862Zm0-1.351c.433 0 .775-.153 1.063-.458.281-.298.433-.695.433-1.153 0-.466-.144-.855-.433-1.153a1.402 1.402 0 0 0-1.063-.458c-.433 0-.783.153-1.072.458-.28.298-.417.695-.417 1.153 0 .466.136.855.417 1.153.282.305.639.458 1.072.458Zm-12.346 1.35c-.858 0-1.573-.282-2.142-.862-.57-.58-.851-1.275-.851-2.1 0-.824.28-1.518.85-2.098.57-.58 1.285-.863 2.143-.863.859 0 1.573.282 2.143.863.57.58.85 1.274.85 2.099 0 .824-.28 1.519-.85 2.1-.57.58-1.284.862-2.143.862Zm0-1.35c.433 0 .775-.153 1.064-.458.28-.298.433-.695.433-1.153 0-.466-.145-.855-.433-1.153a1.402 1.402 0 0 0-1.064-.458c-.433 0-.783.153-1.071.458-.281.298-.418.695-.418 1.153 0 .466.137.855.418 1.153.289.305.646.458 1.071.458Zm20.581-4.45h-4.87v1.29h1.406c.167 0 .296.137.296.297v4.114h1.459v-4.114c0-.168.136-.298.296-.298h1.413v-1.29Zm5.356 4.42h-2.545a.297.297 0 0 1-.296-.299v-.687h2.173v-1.198h-2.173v-.634c0-.168.136-.297.296-.297h2.477V39.83h-4.24v5.702h4.3v-1.305h.008ZM7.372 42.09c-1.132-.214-1.26-.435-1.245-.672.022-.26.334-.39.767-.405a3.092 3.092 0 0 1 1.58.374l.904-.984c-.699-.45-1.595-.687-2.507-.657-1.36.046-2.241.802-2.203 1.832v.015c.03.978.813 1.42 2.09 1.665 1.116.213 1.253.404 1.26.603v.015c.008.26-.44.435-.942.45-.63.023-1.36-.137-1.937-.572H5.13l-.881.977.076.053c.767.558 1.747.84 2.773.81 1.489-.054 2.408-.87 2.37-1.886v-.015c-.038-.962-.835-1.36-2.097-1.603Z" fill="#000"/></svg>
  `;
}

function getRemoveIconSvg() {
  return svgIcon("x");
}

function getDownloadIconSvg() {
  return svgIcon("download");
}

function getPdfZoomInIconSvg() {
  return svgIcon("plus");
}

function getPdfZoomOutIconSvg() {
  return svgIcon("minus");
}

function getPdfRotateCounterClockwiseIconSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M5.029 2.217a6.5 6.5 0 0 1 9.437 5.11.75.75 0 1 0 1.492-.154 8 8 0 0 0-14.315-4.03L.427 1.927A.25.25 0 0 0 0 2.104V5.75A.25.25 0 0 0 .25 6h3.646a.25.25 0 0 0 .177-.427L2.715 4.215a6.491 6.491 0 0 1 2.314-1.998ZM1.262 8.169a.75.75 0 0 0-1.22.658 8.001 8.001 0 0 0 14.315 4.03l1.216 1.216a.25.25 0 0 0 .427-.177V10.25a.25.25 0 0 0-.25-.25h-3.646a.25.25 0 0 0-.177.427l1.358 1.358a6.501 6.501 0 0 1-11.751-3.11.75.75 0 0 0-.272-.506Z"></path>
    </svg>
  `;
}

function getPdfRotateClockwiseIconSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M10.971 2.217a6.5 6.5 0 0 0-9.437 5.11.75.75 0 1 1-1.492-.154 8 8 0 0 1 14.315-4.03l1.216-1.216A.25.25 0 0 1 16 2.104V5.75a.25.25 0 0 1-.25.25h-3.646a.25.25 0 0 1-.177-.427l1.358-1.358a6.491 6.491 0 0 0-2.314-1.998ZM14.738 8.169a.75.75 0 0 1 1.22.658 8.001 8.001 0 0 1-14.315 4.03L.427 14.073A.25.25 0 0 1 0 13.896V10.25A.25.25 0 0 1 .25 10h3.646a.25.25 0 0 1 .177.427l-1.358 1.358a6.501 6.501 0 0 0 11.751-3.11.75.75 0 0 1 .272-.506Z"></path>
    </svg>
  `;
}

function getProjectViewCompactHeaderState() {
  const documentItem = docsViewState.mode === "pdf-preview" ? decorateDocumentWithPhase(getSelectedPdfDocument()) : null;
  const documentName = String(documentItem?.name || documentItem?.fileName || documentItem?.title || "").trim();
  return {
    compactLabel: "Documents",
    compactLabelSuffix: documentName
  };
}

function syncDocumentsProjectViewHeader() {
  const compactHeaderState = getProjectViewCompactHeaderState();
  setProjectViewHeader({
    contextLabel: "Documents",
    compactLabel: compactHeaderState.compactLabel,
    compactLabelSuffix: compactHeaderState.compactLabelSuffix,
    variant: "documents"
  });
}

function getDocumentsTableGridTemplate() {
  return "minmax(280px, 1.2fr) minmax(220px, 1fr) 180px minmax(260px, 1.1fr)";
}

function getFileExtension(value = "") {
  const match = String(value || "").trim().toLowerCase().match(/\.([^.]+)$/);
  return match ? match[1] : "";
}

function isPdfDocument(documentItem = null) {
  if (!documentItem) return false;
  const mimeType = String(documentItem.mimeType || "").toLowerCase();
  const extension = String(documentItem.extension || getFileExtension(documentItem.fileName || documentItem.name || "")).toLowerCase();
  return mimeType === "application/pdf" || extension === "pdf";
}

function canPreviewPdf(documentItem = null) {
  return isPdfDocument(documentItem) && (
    !!String(getProjectDocumentPreviewUrl(documentItem) || "").trim() ||
    (!!String(documentItem?.storageBucket || "").trim() && !!String(documentItem?.storagePath || "").trim())
  );
}

function getSelectedPdfDocument() {
  const activeDocumentId = String(store.projectDocuments?.activeDocumentId || "").trim();
  return activeDocumentId ? getProjectDocumentById(activeDocumentId) : null;
}

function revokePdfPreviewObjectUrl() {
  const currentObjectUrl = String(docsViewState.pdfPreview?.objectUrl || "").trim();
  if (!currentObjectUrl || typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;

  try {
    URL.revokeObjectURL(currentObjectUrl);
  } catch {
    // ignore cleanup errors
  }

  docsViewState.pdfPreview.objectUrl = "";
}

function cleanupPdfPreviewController() {
  pdfPreviewController.root = null;
  pdfPreviewController.isBound = false;
  pdfPreviewController.documentCacheKey = "";
  pdfPreviewController.rawBytes = null;
  pdfPreviewController.sourceDocumentId = "";
  if (pdfPreviewController.pdfDocument) {
    pdfPreviewController.pdfDocument.destroy().catch(() => {});
    pdfPreviewController.pdfDocument = null;
  }
}

function getPdfPreviewRenderRoot(root = null) {
  if (root?.isConnected) {
    pdfPreviewController.root = root;
    return root;
  }
  return pdfPreviewController.root?.isConnected ? pdfPreviewController.root : null;
}

function setPdfPreviewRawBytes(sourceDocumentId = "", bytes = null) {
  const normalizedSourceDocumentId = String(sourceDocumentId || "").trim();
  if (bytes instanceof Uint8Array && bytes.byteLength > 0) {
    pdfPreviewController.rawBytes = bytes.slice();
    pdfPreviewController.sourceDocumentId = normalizedSourceDocumentId;
    return pdfPreviewController.rawBytes;
  }
  pdfPreviewController.rawBytes = null;
  pdfPreviewController.sourceDocumentId = normalizedSourceDocumentId;
  return null;
}

function getPdfPreviewBytesSnapshot() {
  const sourceDocumentId = String(docsViewState.pdfPreview?.sourceDocumentId || "").trim();
  const stateBytes = docsViewState.pdfPreview?.bytes;
  if (stateBytes instanceof Uint8Array && stateBytes.byteLength > 0) {
    if (pdfPreviewController.sourceDocumentId !== sourceDocumentId || !(pdfPreviewController.rawBytes instanceof Uint8Array) || pdfPreviewController.rawBytes.byteLength !== stateBytes.byteLength) {
      setPdfPreviewRawBytes(sourceDocumentId, stateBytes);
    }
    return stateBytes;
  }

  if (
    pdfPreviewController.sourceDocumentId === sourceDocumentId &&
    pdfPreviewController.rawBytes instanceof Uint8Array &&
    pdfPreviewController.rawBytes.byteLength > 0
  ) {
    const restoredBytes = pdfPreviewController.rawBytes.slice();
    docsViewState.pdfPreview.bytes = restoredBytes;
    logPdfPreviewDebug("pdf bytes restored from controller cache", {
      sourceDocumentId,
      byteLength: restoredBytes.byteLength
    });
    return restoredBytes;
  }

  return null;
}
function formatPdfPreviewZoomPercent(zoomLevel = 1) {
  const safeZoomLevel = Number.isFinite(Number(zoomLevel)) ? Number(zoomLevel) : 1;
  return `${Math.round(safeZoomLevel * 100)}%`;
}

function updatePdfPreviewToolbarState(root = null) {
  const activeRoot = getPdfPreviewRenderRoot(root);
  if (!activeRoot) return;

  const zoomNode = activeRoot.querySelector("#documentsPdfZoomValue");
  if (zoomNode) {
    zoomNode.textContent = formatPdfPreviewZoomPercent(docsViewState.pdfPreview?.zoomLevel || 1);
  }

  const darkModeButton = activeRoot.querySelector('[data-pdf-preview-action="toggle-dark-mode"]');
  if (darkModeButton) {
    const isDarkMode = Boolean(docsViewState.pdfPreview?.darkMode);
    darkModeButton.textContent = isDarkMode ? "Mode clair" : "Mode sombre";
    darkModeButton.setAttribute("aria-pressed", isDarkMode ? "true" : "false");
  }

  const searchInput = activeRoot.querySelector("#documentsPdfSearchInput");
  if (searchInput && searchInput.value !== String(docsViewState.pdfPreview?.searchQuery || "")) {
    searchInput.value = String(docsViewState.pdfPreview?.searchQuery || "");
  }

  const resultsNode = activeRoot.querySelector("#documentsPdfSearchResults");
  if (resultsNode) {
    if (!String(docsViewState.pdfPreview?.searchQuery || "").trim()) {
      resultsNode.textContent = "";
    } else if (!pdfPreviewController.searchResults.length) {
      resultsNode.textContent = "0 résultat";
    } else {
      const activeIndex = Math.max(0, pdfPreviewController.activeSearchIndex);
      resultsNode.textContent = `${activeIndex + 1}/${pdfPreviewController.searchResults.length}`;
    }
  }
}

function escapeHtmlAttribute(value = "") {
  return escapeHtml(String(value || "")).replace(/"/g, "&quot;");
}

function applyPdfPreviewDarkModeToCanvas(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const background = { r: 13, g: 17, b: 23 };
  const foreground = { r: 230, g: 237, b: 243 };

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha === 0) continue;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    const mapped = 1 - luminance;

    data[index] = Math.round(background.r + (foreground.r - background.r) * mapped);
    data[index + 1] = Math.round(background.g + (foreground.g - background.g) * mapped);
    data[index + 2] = Math.round(background.b + (foreground.b - background.b) * mapped);
  }

  context.putImageData(imageData, 0, 0);
}

function clearPdfPreviewSearchHighlights(root = null) {
  const activeRoot = getPdfPreviewRenderRoot(root);
  if (!activeRoot) return;

  activeRoot.querySelectorAll(".documents-pdf-viewer__text-item").forEach((node) => {
    const originalText = node.getAttribute("data-original-text") || node.textContent || "";
    node.textContent = originalText;
  });

  activeRoot.querySelectorAll(".documents-pdf-viewer__text-item.is-search-active").forEach((node) => {
    node.classList.remove("is-search-active");
  });

  pdfPreviewController.searchResults = [];
  pdfPreviewController.activeSearchIndex = -1;
  updatePdfPreviewToolbarState(activeRoot);
}

function applyPdfPreviewSearch(root = null) {
  const activeRoot = getPdfPreviewRenderRoot(root);
  if (!activeRoot) return;

  clearPdfPreviewSearchHighlights(activeRoot);
  const query = String(docsViewState.pdfPreview?.searchQuery || "").trim();
  if (!query) return;

  const queryLower = query.toLocaleLowerCase();
  const textItems = Array.from(activeRoot.querySelectorAll(".documents-pdf-viewer__text-item"));
  const matches = [];

  textItems.forEach((node) => {
    const originalText = node.getAttribute("data-original-text") || node.textContent || "";
    const haystack = originalText.toLocaleLowerCase();
    if (!haystack.includes(queryLower)) return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let hitCount = 0;
    while (cursor < originalText.length) {
      const nextIndex = haystack.indexOf(queryLower, cursor);
      if (nextIndex < 0) {
        fragment.append(document.createTextNode(originalText.slice(cursor)));
        break;
      }
      if (nextIndex > cursor) {
        fragment.append(document.createTextNode(originalText.slice(cursor, nextIndex)));
      }
      const mark = document.createElement("mark");
      mark.className = "documents-pdf-viewer__search-hit";
      mark.textContent = originalText.slice(nextIndex, nextIndex + query.length);
      mark.setAttribute("data-search-hit-index", String(matches.length + hitCount));
      fragment.append(mark);
      hitCount += 1;
      cursor = nextIndex + query.length;
    }

    node.replaceChildren(fragment);
    node.querySelectorAll("mark.documents-pdf-viewer__search-hit").forEach((mark) => {
      matches.push(mark);
    });
  });

  pdfPreviewController.searchResults = matches;
  pdfPreviewController.activeSearchIndex = matches.length ? 0 : -1;
  focusPdfPreviewSearchResult(activeRoot, 0);
  updatePdfPreviewToolbarState(activeRoot);
}

function focusPdfPreviewSearchResult(root = null, requestedIndex = 0) {
  const activeRoot = getPdfPreviewRenderRoot(root);
  if (!activeRoot) return;

  const results = pdfPreviewController.searchResults || [];
  if (!results.length) {
    pdfPreviewController.activeSearchIndex = -1;
    updatePdfPreviewToolbarState(activeRoot);
    return;
  }

  const nextIndex = ((requestedIndex % results.length) + results.length) % results.length;
  pdfPreviewController.activeSearchIndex = nextIndex;

  activeRoot.querySelectorAll(".documents-pdf-viewer__text-item.is-search-active").forEach((node) => {
    node.classList.remove("is-search-active");
  });

  results.forEach((node, index) => {
    node.classList.toggle("is-active", index == nextIndex);
  });

  const activeResult = results[nextIndex];
  activeResult?.closest?.(".documents-pdf-viewer__text-item")?.classList?.add("is-search-active");
  activeResult?.scrollIntoView?.({ block: "center", inline: "nearest", behavior: "smooth" });
  updatePdfPreviewToolbarState(activeRoot);
}

function movePdfPreviewSearchSelection(root = null, step = 1) {
  const activeRoot = getPdfPreviewRenderRoot(root);
  if (!activeRoot || !pdfPreviewController.searchResults.length) {
    updatePdfPreviewToolbarState(activeRoot);
    return;
  }
  const currentIndex = pdfPreviewController.activeSearchIndex >= 0 ? pdfPreviewController.activeSearchIndex : 0;
  focusPdfPreviewSearchResult(activeRoot, currentIndex + step);
}

function schedulePdfPreviewRender(root = null) {
  const renderRoot = getPdfPreviewRenderRoot(root);
  if (!renderRoot || docsViewState.mode !== "pdf-preview") {
    logPdfPreviewDebug("render skipped", {
      hasRenderRoot: !!renderRoot,
      mode: docsViewState.mode
    });
    return;
  }

  logPdfPreviewDebug("render scheduled", {
    zoomLevel: docsViewState.pdfPreview?.zoomLevel,
    rotation: docsViewState.pdfPreview?.rotation,
    sourceDocumentId: docsViewState.pdfPreview?.sourceDocumentId
  });

  pdfPreviewController.renderPromise = pdfPreviewController.renderPromise
    .catch(() => {})
    .then(async () => {
      const activeRoot = getPdfPreviewRenderRoot(renderRoot);
      if (!activeRoot || docsViewState.mode !== "pdf-preview") return;
      await renderPdfPreviewPages(activeRoot);
    });
}

function bindPdfPreviewControls(root) {
  if (!root) {
    logPdfPreviewDebug("bind skipped: missing root");
    return;
  }
  if (pdfPreviewController.root === root && pdfPreviewController.isBound) {
    logPdfPreviewDebug("bind skipped: already bound on current root");
    return;
  }

  pdfPreviewController.root = root;
  if (pdfPreviewController.isBound) {
    logPdfPreviewDebug("bind skipped: controller already bound on previous root", {
      sameRoot: pdfPreviewController.root === root
    });
    return;
  }

  logPdfPreviewDebug("binding pdf preview controls", {
    hasRoot: !!root,
    mode: docsViewState.mode
  });

  root.addEventListener("click", (event) => {
    const actionButton = event.target?.closest?.("[data-pdf-preview-action]");
    if (!actionButton || !root.contains(actionButton)) return;

    event.preventDefault();
    event.stopPropagation();

    const action = String(actionButton.getAttribute("data-pdf-preview-action") || "").trim();
    logPdfPreviewDebug("control click captured", {
      action,
      buttonId: actionButton.id || null,
      className: actionButton.className || "",
      zoomLevelBefore: docsViewState.pdfPreview?.zoomLevel,
      rotationBefore: docsViewState.pdfPreview?.rotation
    });
    if (action === "rotate-ccw") {
      updatePdfPreviewRotation(root, -90);
      return;
    }
    if (action === "rotate-cw") {
      updatePdfPreviewRotation(root, 90);
      return;
    }
    if (action === "zoom-out") {
      updatePdfPreviewZoom(root, -0.25);
      return;
    }
    if (action === "zoom-in") {
      updatePdfPreviewZoom(root, 0.25);
      return;
    }
    if (action === "toggle-dark-mode") {
      docsViewState.pdfPreview.darkMode = !Boolean(docsViewState.pdfPreview?.darkMode);
      updatePdfPreviewToolbarState(root);
      schedulePdfPreviewRender(root);
      return;
    }
    if (action === "copy-selection") {
      const selectedText = String(window.getSelection?.()?.toString?.() || "").trim();
      if (selectedText && navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(selectedText).catch(() => {});
      }
      return;
    }
    if (action === "search-prev") {
      movePdfPreviewSearchSelection(root, -1);
      return;
    }
    if (action === "search-next") {
      movePdfPreviewSearchSelection(root, 1);
    }
  });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id !== "documentsPdfSearchInput") return;
    docsViewState.pdfPreview.searchQuery = target.value || "";
    applyPdfPreviewSearch(root);
  });

  root.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id !== "documentsPdfSearchInput") return;
    if (event.key === "Enter") {
      event.preventDefault();
      movePdfPreviewSearchSelection(root, event.shiftKey ? -1 : 1);
    }
  });

  pdfPreviewController.isBound = true;
}

function resetPdfPreviewState() {
  cleanupPdfPreviewController();
  revokePdfPreviewObjectUrl();
  docsViewState.pdfPreview = {
    objectUrl: "",
    signedUrl: "",
    sourceDocumentId: "",
    isLoading: false,
    errorMessage: "",
    bytes: null,
    pageCount: 0,
    zoomLevel: 1,
    rotation: 0,
    searchQuery: "",
    darkMode: false
  };
  pdfPreviewController.searchResults = [];
  pdfPreviewController.activeSearchIndex = -1;
}

async function createSupabaseSignedStorageUrl(documentItem = null, expiresInSeconds = 3600) {
  const storageBucket = String(documentItem?.storageBucket || "").trim();
  const storagePath = String(documentItem?.storagePath || "").trim();
  if (!storageBucket || !storagePath) return "";

  const encodedBucket = encodeURIComponent(storageBucket);
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${encodedBucket}/${encodedPath}`, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
    cache: "no-store"
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(responseText || `storage signed url failed (${response.status})`);
  }

  const payload = await response.json().catch(() => ({}));
  const signedPath = String(payload?.signedURL || payload?.signedUrl || payload?.path || "").trim();
  if (!signedPath) {
    throw new Error("Supabase n'a pas retourné d'URL signée pour ce document.");
  }

  if (/^https?:\/\//i.test(signedPath)) {
    return signedPath;
  }

  if (signedPath.startsWith('/storage/v1/')) {
    return `${SUPABASE_URL}${signedPath}`;
  }

  if (signedPath.startsWith('/object/')) {
    return `${SUPABASE_URL}/storage/v1${signedPath}`;
  }

  return `${SUPABASE_URL}/storage/v1/${signedPath.replace(/^\/+/, '')}`;
}

function buildSupabaseStorageObjectUrl(documentItem = null) {
  const storageBucket = String(documentItem?.storageBucket || "").trim();
  const storagePath = String(documentItem?.storagePath || "").trim();
  if (!storageBucket || !storagePath) return "";

  const encodedBucket = encodeURIComponent(storageBucket);
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/authenticated/${encodedBucket}/${encodedPath}`;
}

async function fetchPdfPreviewPayload(documentItem = null, signedUrl = "") {
  const objectUrl = buildSupabaseStorageObjectUrl(documentItem);
  const fetchTargets = [
    objectUrl
      ? {
          url: objectUrl,
          headers: await buildSupabaseAuthHeaders()
        }
      : null,
    signedUrl
      ? {
          url: signedUrl,
          headers: {}
        }
      : null
  ].filter(Boolean);

  let lastError = null;

  for (const target of fetchTargets) {
    try {
      const response = await fetch(target.url, {
        method: "GET",
        headers: target.headers,
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`pdf fetch failed (${response.status})`);
      }

      const pdfBuffer = await response.arrayBuffer();
      if (!(pdfBuffer instanceof ArrayBuffer) || pdfBuffer.byteLength <= 0) {
        throw new Error("PDF vide ou illisible.");
      }

      const pdfSignature = new TextDecoder("ascii").decode(pdfBuffer.slice(0, 5));
      if (pdfSignature !== "%PDF-") {
        throw new Error("Le fichier récupéré n'est pas un PDF valide.");
      }

      const safeFileName = String(documentItem?.fileName || documentItem?.name || "document.pdf").trim() || "document.pdf";
      const normalizedPdfBlob = typeof File === "function"
        ? new File([pdfBuffer], safeFileName, { type: "application/pdf" })
        : new Blob([pdfBuffer], { type: "application/pdf" });

      revokePdfPreviewObjectUrl();
      return {
        objectUrl: URL.createObjectURL(normalizedPdfBlob),
        bytes: new Uint8Array(pdfBuffer)
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Impossible de charger le PDF pour la prévisualisation.");
}

async function loadPdfJsLib() {
  if (!pdfJsLibPromise) {
    logPdfPreviewDebug("loading pdf.js module", {
      moduleUrl: PDFJS_MODULE_URL,
      workerUrl: PDFJS_WORKER_MODULE_URL
    });
    pdfJsLibPromise = import(PDFJS_MODULE_URL)
      .then((module) => {
        const pdfjsLib = module?.default || module;
        if (pdfjsLib?.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_MODULE_URL;
        }
        logPdfPreviewDebug("pdf.js module loaded", {
          version: pdfjsLib?.version || null,
          workerSrc: pdfjsLib?.GlobalWorkerOptions?.workerSrc || null
        });
        return pdfjsLib;
      })
      .catch((error) => {
        pdfJsLibPromise = null;
        throw error;
      });
  }

  return pdfJsLibPromise;
}

async function renderPdfPreviewPages(root) {
  const activeRoot = getPdfPreviewRenderRoot(root);
  const container = activeRoot?.querySelector?.("#documentsPdfCanvasHost");
  const loadingNode = activeRoot?.querySelector?.("#documentsPdfCanvasLoading");
  if (!container) {
    logPdfPreviewDebug("render aborted: missing canvas host");
    return;
  }

  const bytes = getPdfPreviewBytesSnapshot();
  const cachedPdfDocument = pdfPreviewController.pdfDocument;
  const cachedSourceDocumentId = String(pdfPreviewController.sourceDocumentId || "").trim();
  const activeSourceDocumentId = String(docsViewState.pdfPreview?.sourceDocumentId || "").trim();
  if (!(bytes instanceof Uint8Array) || bytes.byteLength <= 0) {
    if (!cachedPdfDocument || cachedSourceDocumentId !== activeSourceDocumentId) {
      logPdfPreviewDebug("render aborted: missing PDF bytes", {
        hasBytes: bytes instanceof Uint8Array,
        byteLength: bytes?.byteLength || 0,
        hasCachedPdfDocument: !!cachedPdfDocument,
        cachedSourceDocumentId,
        activeSourceDocumentId
      });
      return;
    }
    logPdfPreviewDebug("render continues with cached pdf document despite detached bytes", {
      sourceDocumentId: activeSourceDocumentId,
      cachedSourceDocumentId
    });
  }

  const renderToken = ++pdfPreviewRenderToken;
  logPdfPreviewDebug("render started", {
    renderToken,
    zoomLevel: docsViewState.pdfPreview?.zoomLevel,
    rotation: docsViewState.pdfPreview?.rotation,
    sourceDocumentId: docsViewState.pdfPreview?.sourceDocumentId
  });
  container.replaceChildren();
  container.setAttribute("aria-busy", "true");
  if (loadingNode) loadingNode.hidden = false;

  try {
    const pdfjsLib = await loadPdfJsLib();
    if (renderToken !== pdfPreviewRenderToken || docsViewState.mode !== "pdf-preview") return;

    const cacheKey = `${docsViewState.pdfPreview?.sourceDocumentId || ""}:${bytes?.byteLength || pdfPreviewController.rawBytes?.byteLength || 0}`;
    let pdfDocument = pdfPreviewController.pdfDocument;

    if (!pdfDocument || pdfPreviewController.documentCacheKey !== cacheKey) {
      if (!(bytes instanceof Uint8Array) || bytes.byteLength <= 0) {
        throw new Error("Impossible de recharger le PDF : les octets de la session ont été perdus.");
      }
      if (pdfDocument) {
        await pdfDocument.destroy().catch(() => {});
      }
      const loadingTask = pdfjsLib.getDocument({
        data: bytes.slice(),
        disableWorker: true,
        useSystemFonts: true
      });
      pdfDocument = await loadingTask.promise;
      pdfPreviewController.pdfDocument = pdfDocument;
      pdfPreviewController.documentCacheKey = cacheKey;
      pdfPreviewController.sourceDocumentId = String(docsViewState.pdfPreview?.sourceDocumentId || "").trim();
    }

    if (renderToken !== pdfPreviewRenderToken || docsViewState.mode !== "pdf-preview") return;

    docsViewState.pdfPreview.pageCount = Number(pdfDocument.numPages || 0);
    logPdfPreviewDebug("pdf document ready", {
      renderToken,
      pageCount: docsViewState.pdfPreview.pageCount,
      cacheKey,
      reusedCachedDocument: pdfPreviewController.documentCacheKey === cacheKey
    });
    const zoomLevel = Math.min(3, Math.max(0.5, Number(docsViewState.pdfPreview?.zoomLevel || 1)));
    const rotation = Number(docsViewState.pdfPreview?.rotation || 0);
    const outputScale = window.devicePixelRatio && window.devicePixelRatio > 1 ? window.devicePixelRatio : 1;

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      if (renderToken !== pdfPreviewRenderToken || docsViewState.mode !== "pdf-preview") break;

      const page = await pdfDocument.getPage(pageNumber);
      const fitViewport = page.getViewport({ scale: 1, rotation });
      const availableWidth = Math.max(320, (container.clientWidth || container.parentElement?.clientWidth || 960) - 24);
      const fitScale = availableWidth / Math.max(fitViewport.width, 1);
      const viewport = page.getViewport({ scale: fitScale * zoomLevel, rotation });

      const pageNode = document.createElement("div");
      pageNode.className = "documents-pdf-viewer__page";
      pageNode.style.width = `${Math.ceil(viewport.width)}px`;
      pageNode.setAttribute("data-page-number", String(pageNumber));

      const canvas = document.createElement("canvas");
      canvas.className = "documents-pdf-viewer__canvas";
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        throw new Error("Impossible d'initialiser le rendu PDF dans ce navigateur.");
      }

      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
      await page.render({
        canvasContext: context,
        viewport,
        transform
      }).promise;

      if (docsViewState.pdfPreview?.darkMode) {
        applyPdfPreviewDarkModeToCanvas(canvas);
      }

      const textLayer = document.createElement("div");
      textLayer.className = "documents-pdf-viewer__text-layer";
      textLayer.style.width = `${Math.floor(viewport.width)}px`;
      textLayer.style.height = `${Math.floor(viewport.height)}px`;

      const textContent = await page.getTextContent();
      const textItems = Array.isArray(textContent?.items) ? textContent.items : [];
      textItems.forEach((item) => {
        if (!item?.str) return;
        const textNode = document.createElement("span");
        textNode.className = "documents-pdf-viewer__text-item";
        textNode.setAttribute("data-original-text", item.str);
        textNode.textContent = item.str;
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const angle = Math.atan2(tx[1], tx[0]);
        const fontHeight = Math.hypot(tx[2], tx[3]);
        const fontWidth = Math.hypot(tx[0], tx[1]);
        const left = tx[4];
        const top = tx[5] - fontHeight;
        const scaleX = item.width > 0 ? Math.max((fontWidth * item.width) / Math.max(textNode.textContent.length, 1), 1) : fontWidth;
        textNode.style.left = `${left}px`;
        textNode.style.top = `${top}px`;
        textNode.style.fontSize = `${fontHeight}px`;
        textNode.style.transform = `rotate(${angle}rad) scaleX(1)`;
        textNode.style.transformOrigin = "0% 0%";
        textLayer.appendChild(textNode);
      });

      pageNode.appendChild(canvas);
      pageNode.appendChild(textLayer);
      container.appendChild(pageNode);
    }

    if (renderToken !== pdfPreviewRenderToken || docsViewState.mode !== "pdf-preview") return;
    if (loadingNode) loadingNode.hidden = true;
    container.setAttribute("aria-busy", "false");
    applyPdfPreviewSearch(activeRoot);
    updatePdfPreviewToolbarState(activeRoot);
    logPdfPreviewDebug("render completed", {
      renderToken,
      pageCount: docsViewState.pdfPreview.pageCount,
      zoomLevel: docsViewState.pdfPreview?.zoomLevel,
      rotation: docsViewState.pdfPreview?.rotation
    });
  } catch (error) {
    console.warn("PDF preview render failed", error);
    logPdfPreviewDebug("render failed", {
      renderToken,
      message: error instanceof Error ? error.message : String(error)
    });
    if (renderToken !== pdfPreviewRenderToken || docsViewState.mode !== "pdf-preview") return;
    docsViewState.pdfPreview.errorMessage = error instanceof Error
      ? error.message
      : "Impossible de générer la prévisualisation PDF dans le navigateur.";
    docsViewState.pdfPreview.bytes = null;
    cleanupPdfPreviewController();
    if (loadingNode) loadingNode.hidden = true;
    container.setAttribute("aria-busy", "false");
    renderProjectDocumentsContent(activeRoot || root);
  }
}

async function ensurePdfPreviewObjectUrl(documentItem = null) {
  if (!documentItem || !isPdfDocument(documentItem)) {
    resetPdfPreviewState();
    return "";
  }

  if (
    (docsViewState.pdfPreview.objectUrl || docsViewState.pdfPreview.signedUrl) &&
    docsViewState.pdfPreview.sourceDocumentId === String(documentItem.id || "").trim()
  ) {
    const cachedBytes = getPdfPreviewBytesSnapshot();
    logPdfPreviewDebug("reusing existing pdf preview session", {
      sourceDocumentId: docsViewState.pdfPreview.sourceDocumentId,
      hasCachedBytes: cachedBytes instanceof Uint8Array,
      cachedByteLength: cachedBytes?.byteLength || 0
    });
    return docsViewState.pdfPreview.objectUrl || docsViewState.pdfPreview.signedUrl;
  }

  const localPreviewUrl = getProjectDocumentPreviewUrl(documentItem);
  if (!String(documentItem.storageBucket || "").trim() || !String(documentItem.storagePath || "").trim()) {
    setPdfPreviewRawBytes(String(documentItem.id || "").trim(), null);
    docsViewState.pdfPreview = {
      objectUrl: localPreviewUrl,
      signedUrl: "",
      sourceDocumentId: String(documentItem.id || "").trim(),
      isLoading: false,
      errorMessage: "",
      bytes: null,
      pageCount: 0,
      zoomLevel: 1,
      rotation: 0,
    searchQuery: docsViewState.pdfPreview?.searchQuery || "",
    darkMode: docsViewState.pdfPreview?.darkMode || false
    };
    return localPreviewUrl;
  }

  setPdfPreviewRawBytes(String(documentItem.id || "").trim(), null);
  docsViewState.pdfPreview = {
    objectUrl: "",
    signedUrl: "",
    sourceDocumentId: String(documentItem.id || "").trim(),
    isLoading: true,
    errorMessage: "",
    bytes: null,
    pageCount: 0,
    zoomLevel: 1,
    rotation: 0,
    searchQuery: docsViewState.pdfPreview?.searchQuery || "",
    darkMode: docsViewState.pdfPreview?.darkMode || false
  };

  const signedUrl = await createSupabaseSignedStorageUrl(documentItem);
  const previewPayload = await fetchPdfPreviewPayload(documentItem, signedUrl);
  const objectUrl = String(previewPayload?.objectUrl || "").trim();

  const normalizedSourceDocumentId = String(documentItem.id || "").trim();
  const previewBytes = previewPayload?.bytes instanceof Uint8Array ? previewPayload.bytes.slice() : null;
  setPdfPreviewRawBytes(normalizedSourceDocumentId, previewBytes);

  docsViewState.pdfPreview = {
    objectUrl,
    signedUrl,
    sourceDocumentId: normalizedSourceDocumentId,
    isLoading: false,
    errorMessage: objectUrl ? "" : "Impossible de charger ce PDF pour cette session.",
    bytes: previewBytes instanceof Uint8Array ? previewBytes.slice() : null,
    pageCount: 0,
    zoomLevel: 1,
    rotation: 0,
    searchQuery: docsViewState.pdfPreview?.searchQuery || "",
    darkMode: docsViewState.pdfPreview?.darkMode || false
  };

  return objectUrl || signedUrl;
}


function updatePdfPreviewZoom(root, direction = 0) {
  if (docsViewState.mode !== "pdf-preview") {
    logPdfPreviewDebug("zoom ignored: not in pdf-preview mode", { mode: docsViewState.mode, direction });
    return;
  }
  const currentZoom = Number(docsViewState.pdfPreview?.zoomLevel || 1);
  const nextZoom = Math.min(3, Math.max(0.5, Number((currentZoom + direction).toFixed(2))));
  if (Math.abs(nextZoom - currentZoom) < 0.001) {
    logPdfPreviewDebug("zoom ignored: unchanged after clamp", { currentZoom, nextZoom, direction });
    return;
  }
  docsViewState.pdfPreview.zoomLevel = nextZoom;
  logPdfPreviewDebug("zoom updated", { currentZoom, nextZoom, direction });
  schedulePdfPreviewRender(root);
}

function updatePdfPreviewRotation(root, direction = 0) {
  if (docsViewState.mode !== "pdf-preview") {
    logPdfPreviewDebug("rotation ignored: not in pdf-preview mode", { mode: docsViewState.mode, direction });
    return;
  }
  const currentRotation = Number(docsViewState.pdfPreview?.rotation || 0);
  const normalizedStep = direction >= 0 ? 90 : -90;
  const nextRotation = (((currentRotation + normalizedStep) % 360) + 360) % 360;
  if (nextRotation === currentRotation) {
    logPdfPreviewDebug("rotation ignored: unchanged", { currentRotation, nextRotation, direction });
    return;
  }
  docsViewState.pdfPreview.rotation = nextRotation;
  logPdfPreviewDebug("rotation updated", { currentRotation, nextRotation, direction });
  schedulePdfPreviewRender(root);
}

function setDocumentsActivity({ tone = "info", title = "", message = "" } = {}) {
  docsViewState.activity = {
    tone,
    title,
    message
  };
}

function clearDocumentsActivity() {
  docsViewState.activity = {
    tone: "info",
    title: "",
    message: ""
  };
}

function renderDocumentsActivityBanner() {
  const title = String(docsViewState.activity?.title || "").trim();
  const message = String(docsViewState.activity?.message || "").trim();

  if (!title && !message) return "";

  const tone = String(docsViewState.activity?.tone || "info").toLowerCase();
  const className =
    tone === "success"
      ? "documents-activity-banner documents-activity-banner--success"
      : tone === "warning"
        ? "documents-activity-banner documents-activity-banner--warning"
        : tone === "error"
          ? "documents-activity-banner documents-activity-banner--error"
          : "documents-activity-banner documents-activity-banner--info";

  return `
    <div class="${className}" role="status" aria-live="polite">
      <div class="documents-activity-banner__body">
        ${title ? `<div class="documents-activity-banner__title">${escapeHtml(title)}</div>` : ""}
        ${message ? `<div class="documents-activity-banner__message">${escapeHtml(message)}</div>` : ""}
      </div>
      <button
        type="button"
        class="documents-activity-banner__close"
        id="documentsActivityCloseBtn"
        aria-label="Fermer"
        title="Fermer"
      >
        ${getRemoveIconSvg()}
      </button>
    </div>
  `;
}

function renderDocumentsTableHeadHtml() {
  return renderDataTableHead({
    columns: [
      { className: "documents-repo__col documents-repo__col--name", label: "Nom" },
      { className: "documents-repo__col documents-repo__col--message", label: "Description" },
      { className: "documents-repo__col documents-repo__col--date", label: "Dernière mise à jour" },
      { className: "documents-repo__col documents-repo__col--stats", label: "Indicateurs" }
    ]
  });
}

function renderDocumentsToolbar() {
  const documentsButton = renderGhActionButton({
    id: "documentsAddAction",
    label: "Documents",
    icon: getPlusIconSvg(),
    tone: "primary",
    mainAction: "add-documents"
  });

  const rightHtml = [
    renderProjectTableToolbarGroup({ html: documentsButton })
  ].join("");

  return renderProjectTableToolbar({
    className: "project-table-toolbar--documents",
    leftHtml: "",
    rightHtml
  });
}


function renderDocumentsCountBadge({ iconHtml = "", label = "", count = 0 } = {}) {
  return `
    <span class="documents-count-badge" title="${escapeHtml(`${label} : ${count}`)}">
      <span class="documents-count-badge__icon" aria-hidden="true">${iconHtml}</span>
      <span class="documents-count-badge__count">${escapeHtml(String(count))}</span>
    </span>
  `;
}

function renderDocumentStatsCell(doc) {
  const statsMap = getDocumentStatsMap({
    getSituationStatus: getEffectiveSituationStatus,
    getSujetStatus: getEffectiveSujetStatus
  });
  const stats = statsMap.get(doc.id) || {
    openSituations: 0,
    openSujets: 0,
    blockedSubjects: 0
  };

  return `
    <div class="documents-repo__stats" aria-label="Indicateurs liés au document">
      ${renderDocumentsCountBadge({ iconHtml: svgIcon("table"), label: "Situations ouvertes", count: stats.openSituations })}
      ${renderDocumentsCountBadge({ iconHtml: svgIcon("issue-opened"), label: "Sujets ouverts", count: stats.openSujets })}
      ${renderDocumentsCountBadge({ iconHtml: svgIcon("blocked"), label: "Sujets bloqués", count: stats.blockedSubjects })}
    </div>
  `;
}

function renderRepoDocumentRow(doc) {
  const decoratedDoc = decorateDocumentWithPhase(doc);
  const isPdf = isPdfDocument(decoratedDoc);
  const isPreviewablePdf = canPreviewPdf(decoratedDoc);

  return `
    <div
      class="documents-repo__row documents-repo__row--file${isPdf ? " documents-repo__row--pdf" : ""}${isPreviewablePdf ? " is-clickable" : ""}"
      data-document-id="${escapeHtml(decoratedDoc.id || "")}"
      ${isPreviewablePdf ? 'role="button" tabindex="0" aria-label="Ouvrir l’aperçu du PDF"' : ""}
    >
      <div class="documents-repo__cell documents-repo__cell--name">
        <span class="documents-repo__icon documents-repo__icon--document">${getDocumentIconSvg()}</span>
        <button type="button" class="documents-repo__name documents-repo__name-trigger js-document-title-trigger" data-document-id="${escapeHtml(decoratedDoc.id || "")}">${escapeHtml(decoratedDoc.name)}</button>
      </div>
      <div class="documents-repo__cell documents-repo__cell--message">
        <div class="documents-repo__message-main">${escapeHtml(decoratedDoc.note || "Document prêt pour l'analyse")}</div>
        <div class="documents-repo__message-meta">${escapeHtml(`${decoratedDoc.phaseCode}${decoratedDoc.phaseLabel ? ` - ${decoratedDoc.phaseLabel}` : ""}`)}</div>
      </div>
      <div class="documents-repo__cell documents-repo__cell--date">${escapeHtml(decoratedDoc.updatedAt || "À l'instant")}</div>
      <div class="documents-repo__cell documents-repo__cell--stats">${renderDocumentStatsCell(decoratedDoc)}</div>
    </div>
  `;
}

function getReportTitle() {
  return `Rapport chrono n° ${docsViewState.reportNumber}`;
}

function formatReportDate(value = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(value);
}

function getReportAuthorName() {
  return String(store.user?.name || "demo");
}

function getEntitySummary(entity = null) {
  const raw = entity?.raw || {};
  return String(raw.summary || raw.message || raw.comment || raw.reasoning || raw.analysis || entity?.title || "Aucune synthèse disponible.");
}

function getEntityReferenceLine(entity = null) {
  const refs = resolveDocumentRefs(Array.isArray(entity?.document_ref_ids) ? entity.document_ref_ids : [])
    .map((doc) => decorateDocumentWithPhase(doc))
    .filter(Boolean);

  if (!refs.length) {
    return "Références documentaires : —";
  }

  return `Références documentaires : ${refs.map((doc) => `${doc.name}${doc.phaseCode ? ` (${doc.phaseCode})` : ""}`).join(" · ")}`;
}

function normalizeWorkflowStatus(status = "open") {
  const value = String(status || "open").trim().toLowerCase();
  if (["closed", "close", "ferme", "fermé"].includes(value)) return "fermé";
  if (["reopened", "reopen", "réouvert", "reopenend"].includes(value)) return "réouvert";
  return "ouvert";
}

function isHumanValidated(entity = null) {
  return String(entity?.review_state || "pending").toLowerCase() === "validated";
}

function shouldIncludeInReport(entity = null) {
  if (!entity) return false;
  return !entity.is_published || !!entity.has_changes_since_publish;
}

function buildReportPreviewItems() {
  const situations = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
  const items = [];

  const hasIncludedDescendant = (subject) => {
    const children = Array.isArray(subject?.children) ? subject.children : [];
    return children.some((child) => shouldIncludeInReport(child) || hasIncludedDescendant(child));
  };

  const pushSubjectItems = (subject, depth = 1) => {
    const includedSubject = shouldIncludeInReport(subject);
    const childSubjects = Array.isArray(subject?.children) ? subject.children : [];
    const visibleChildren = childSubjects.filter((child) => shouldIncludeInReport(child) || hasIncludedDescendant(child));

    if (includedSubject || visibleChildren.length) {
      items.push({
        key: `sujet:${subject.id}`,
        entityType: "sujet",
        entity: subject,
        number: subject.id,
        stateLabel: normalizeWorkflowStatus(getEffectiveSujetStatus(subject.id)),
        title: subject.title || subject.id,
        depth
      });
    }

    for (const child of visibleChildren) {
      pushSubjectItems(child, Math.min(depth + 1, 2));
    }
  };

  for (const situation of situations) {
    const includedSituation = shouldIncludeInReport(situation);
    const rootSubjects = Array.isArray(situation?.sujets) ? situation.sujets : [];
    const visibleRoots = rootSubjects.filter((subject) => shouldIncludeInReport(subject) || hasIncludedDescendant(subject));

    if (!includedSituation && !visibleRoots.length) continue;

    items.push({
      key: `situation:${situation.id}`,
      entityType: "situation",
      entity: situation,
      number: situation.id,
      stateLabel: normalizeWorkflowStatus(getEffectiveSituationStatus(situation.id)),
      title: situation.title || situation.id,
      depth: 0
    });

    for (const subject of visibleRoots) {
      pushSubjectItems(subject, 1);
    }
  }

  return items;
}

function renderReportPreviewItem(item) {
  const entity = item.entity || null;
  const invalidClass = isHumanValidated(entity) ? "" : " documents-report-item--needs-review";
  const depth = Number.isFinite(item.depth) ? Math.max(0, Math.min(2, item.depth)) : 0;

  return `
    <article class="documents-report-item documents-report-item--depth-${depth}${invalidClass}" data-report-entity-type="${escapeHtml(item.entityType)}">
      <div class="documents-report-item__line documents-report-item__line--title">
        <span class="documents-report-item__number">#${escapeHtml(String(item.number || ""))}</span>
        <span class="documents-report-item__state">${escapeHtml(String(item.stateLabel || ""))}</span>
        <span class="documents-report-item__title">${escapeHtml(String(item.title || "Sans titre"))}</span>
      </div>
      <div class="documents-report-item__line documents-report-item__line--description">
        ${escapeHtml(getEntitySummary(entity))}
      </div>
      <div class="documents-report-item__line documents-report-item__line--references">
        ${escapeHtml(getEntityReferenceLine(entity))}
      </div>
    </article>
  `;
}

function renderReportPreviewView() {
  const previewItems = buildReportPreviewItems();
  const reportTitle = getReportTitle();
  const projectName = String(store.projectForm?.projectName || "Projet");
  const breadcrumb = `${projectName} / Documents / ${reportTitle}`;
  const authorName = getReportAuthorName();

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="documents-shell documents-shell--report documents-shell--project-page" id="projectDocumentScroll">
          ${renderDocumentsActivityBanner()}

          <div class="documents-report">
            <div class="documents-report__path">${escapeHtml(breadcrumb)}</div>

            <section class="documents-report-table">
              <header class="documents-report-table__header">
                <div class="documents-report-table__author">${escapeHtml(authorName)}</div>
                <div class="documents-report-table__actions">
                  <button type="button" class="gh-btn" id="documentsReportBackBtn">Annuler</button>
                  <button type="button" class="gh-btn gh-btn--validate" disabled>Valider</button>
                  <button type="button" class="gh-btn" disabled>Modifier</button>
                  <button type="button" class="gh-btn" disabled>Diffuser</button>
                </div>
              </header>

              <div class="documents-report-table__body">
                <header class="documents-report__hero">
                  <div class="documents-report__hero-brand">
                    <div class="documents-report__logo-wrap">${getSocotecLogoSvg()}</div>
                    <div class="documents-report__hero-copy">
                      <h1 class="documents-report__title">${escapeHtml(reportTitle)}</h1>
                      <div class="documents-report__meta">Intervenant : ${escapeHtml(authorName)}</div>
                      <div class="documents-report__meta">Date du rapport : ${escapeHtml(formatReportDate())}</div>
                    </div>
                  </div>
                </header>

                <div class="documents-report__page-break" aria-hidden="true"></div>

                ${previewItems.length
                  ? previewItems.map(renderReportPreviewItem).join("")
                  : `<div class="documents-report__empty">Aucun élément nouveau ou modifié à inclure dans ce rapport.</div>`}
              </div>
            </section>
          </div>
        </div>
    </section>
  `;
}

function renderPdfPreviewView() {
  const projectName = String(store.projectForm?.projectName || "Projet");
  const documentItem = decorateDocumentWithPhase(getSelectedPdfDocument());

  if (!documentItem) {
    return renderDocumentsListView();
  }

  const breadcrumb = `${projectName} / Documents / ${documentItem.name}`;
  const previewUrl = String(docsViewState.pdfPreview?.objectUrl || "").trim()
    || String(docsViewState.pdfPreview?.signedUrl || "").trim()
    || getProjectDocumentPreviewUrl(documentItem);
  const openInBrowserUrl = String(docsViewState.pdfPreview?.signedUrl || "").trim() || previewUrl;
  const isLoadingPreview = Boolean(docsViewState.pdfPreview?.isLoading);
  const previewErrorMessage = String(docsViewState.pdfPreview?.errorMessage || "").trim();
  const hasPdfBytes = docsViewState.pdfPreview?.bytes instanceof Uint8Array && docsViewState.pdfPreview.bytes.byteLength > 0;

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="documents-shell documents-shell--report documents-shell--pdf-preview documents-shell--project-page" id="projectDocumentScroll">
          ${renderDocumentsActivityBanner()}

          <div class="documents-report">
            <div class="documents-report__path">${escapeHtml(breadcrumb)}</div>

            <section class="documents-report-table documents-report-table--pdf">
              <header class="documents-report-table__header documents-report-table__header--pdf-preview">
                <div class="documents-report-table__actions documents-report-table__actions--pdf-preview">
                  <div class="documents-report-table__actions-group documents-report-table__actions-group--start">
                    <button
                      type="button"
                      class="gh-btn documents-report-table__icon-btn"
                      id="documentsPdfRotateCounterClockwiseBtn"
                      data-pdf-preview-action="rotate-ccw"
                      aria-label="Rotation -90°"
                      title="Rotation -90°"
                    >
                      ${getPdfRotateCounterClockwiseIconSvg()}
                    </button>
                    <button
                      type="button"
                      class="gh-btn documents-report-table__icon-btn"
                      id="documentsPdfRotateClockwiseBtn"
                      data-pdf-preview-action="rotate-cw"
                      aria-label="Rotation +90°"
                      title="Rotation +90°"
                    >
                      ${getPdfRotateClockwiseIconSvg()}
                    </button>
                    <button
                      type="button"
                      class="gh-btn documents-report-table__icon-btn"
                      id="documentsPdfZoomOutBtn"
                      data-pdf-preview-action="zoom-out"
                      aria-label="Zoom arrière"
                      title="Zoom arrière"
                    >
                      ${getPdfZoomOutIconSvg()}
                    </button>
                    <span class="documents-pdf-viewer__zoom-value" id="documentsPdfZoomValue">${formatPdfPreviewZoomPercent(docsViewState.pdfPreview?.zoomLevel || 1)}</span>
                    <button
                      type="button"
                      class="gh-btn documents-report-table__icon-btn"
                      id="documentsPdfZoomInBtn"
                      data-pdf-preview-action="zoom-in"
                      aria-label="Zoom avant"
                      title="Zoom avant"
                    >
                      ${getPdfZoomInIconSvg()}
                    </button>
                    <button
                      type="button"
                      class="gh-btn documents-report-table__text-btn"
                      data-pdf-preview-action="copy-selection"
                    >
                      Copier la sélection
                    </button>
                    <button
                      type="button"
                      class="gh-btn documents-report-table__text-btn"
                      data-pdf-preview-action="toggle-dark-mode"
                      aria-pressed="${docsViewState.pdfPreview?.darkMode ? "true" : "false"}"
                    >
                      ${docsViewState.pdfPreview?.darkMode ? "Mode clair" : "Mode sombre"}
                    </button>
                    <div class="documents-pdf-viewer__search-toolbar">
                      <input
                        type="search"
                        class="gh-input documents-pdf-viewer__search-input"
                        id="documentsPdfSearchInput"
                        value="${escapeHtmlAttribute(docsViewState.pdfPreview?.searchQuery || "")}"
                        placeholder="Rechercher dans le PDF"
                        autocomplete="off"
                        spellcheck="false"
                      />
                      <span class="documents-pdf-viewer__search-results" id="documentsPdfSearchResults"></span>
                      <button
                        type="button"
                        class="gh-btn documents-report-table__text-btn"
                        data-pdf-preview-action="search-prev"
                      >
                        Préc.
                      </button>
                      <button
                        type="button"
                        class="gh-btn documents-report-table__text-btn"
                        data-pdf-preview-action="search-next"
                      >
                        Suiv.
                      </button>
                    </div>
                  </div>
                  <div class="documents-report-table__actions-group documents-report-table__actions-group--end">
                    ${openInBrowserUrl
                      ? `
                        <a
                          class="gh-btn documents-report-table__icon-btn"
                          href="${escapeHtml(openInBrowserUrl)}"
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Télécharger le PDF"
                          title="Télécharger le PDF"
                        >
                          ${getDownloadIconSvg()}
                        </a>
                      `
                      : ""}
                    <button
                      type="button"
                      class="gh-btn documents-report-table__icon-btn"
                      id="documentsPdfBackBtn"
                      aria-label="Fermer la prévisualisation"
                      title="Fermer la prévisualisation"
                    >
                      ${getRemoveIconSvg()}
                    </button>
                  </div>
                </div>
              </header>

              <div class="documents-report-table__body documents-report-table__body--pdf">
                <section class="documents-pdf-viewer">
                  ${isLoadingPreview
                    ? `
                      <div class="documents-pdf-viewer__fallback documents-pdf-viewer__fallback--empty">
                        <p>Chargement du PDF depuis Supabase…</p>
                      </div>
                    `
                    : previewUrl && hasPdfBytes
                      ? `
                        <div class="documents-pdf-viewer__canvas-shell${docsViewState.pdfPreview?.darkMode ? " is-dark-mode" : ""}">
                          <div class="documents-pdf-viewer__fallback documents-pdf-viewer__fallback--empty" id="documentsPdfCanvasLoading">
                            <p>Préparation de la prévisualisation du PDF…</p>
                          </div>
                          <div
                            class="documents-pdf-viewer__pages"
                            id="documentsPdfCanvasHost"
                            aria-label="Prévisualisation PDF ${escapeHtml(documentItem.name || "Document")}"
                            aria-busy="true"
                          ></div>
                        </div>
                      `
                      : `
                        <div class="documents-pdf-viewer__fallback documents-pdf-viewer__fallback--empty">
                          <p>${escapeHtml(previewErrorMessage || "Impossible de charger ce PDF pour cette session.")}</p>
                        </div>
                      `}
                </section>
              </div>
            </section>
          </div>
        </div>
    </section>
  `;
}

function renderDocumentsListView() {
  const documents = getProjectDocuments();
  const hasDocuments = documents.length > 0;
  const bodyHtml = documents.map(renderRepoDocumentRow).join("");

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="documents-shell documents-shell--project-page" id="projectDocumentScroll">
          ${renderDocumentsToolbar()}
          ${renderDocumentsActivityBanner()}

          ${renderDataTableShell({
            className: "documents-repo data-table-shell--document-scroll",
            gridTemplate: getDocumentsTableGridTemplate(),
            headHtml: renderDocumentsTableHeadHtml(),
            bodyHtml,
            state: hasDocuments ? "ready" : "empty",
            emptyHtml: renderDataTableEmptyState({
              title: "Aucun document n’a encore été déposé.",
              description: "Ajoutez des documents pour commencer à constituer le dossier du projet."
            })
          })}
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
        ${renderUploadProgressBar({ progressPercent: docsViewState.uploadProgress })}
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
  return !!docsViewState.file && !docsViewState.isUploading;
}

function renderUploadView() {
  const isBusy = docsViewState.isUploading ? "is-busy" : "";
  const isDisabled = docsViewState.isUploading ? "disabled" : "";
  const submitLabel = "Valider";

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="documents-shell documents-shell--upload documents-shell--project-page" id="projectDocumentScroll">
        ${renderDocumentsActivityBanner()}
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
                  src="${escapeHtml(String(store.user?.avatar || "assets/images/260093543.png"))}"
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

  const fileInput = document.getElementById("documentsFileInput");
  if (fileInput) {
    fileInput.value = "";
  }
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

function closeReportPreview(root) {
  docsViewState.mode = "list";
  renderProjectDocuments(root);
}

export function setProjectDocumentsViewMode(mode = "list") {
  docsViewState.mode = String(mode || "list");
}

function openReportPreview(root) {
  setProjectDocumentsViewMode("report-preview");
  renderProjectDocuments(root);
}

async function openPdfPreview(root, documentId) {
  const documentItem = getProjectDocumentById(documentId);
  if (!canPreviewPdf(documentItem)) return;

  setActiveProjectDocument(documentItem.id);
  docsViewState.mode = "pdf-preview";
  docsViewState.pdfPreview = {
    objectUrl: "",
    signedUrl: "",
    sourceDocumentId: String(documentItem.id || "").trim(),
    isLoading: true,
    errorMessage: "",
    bytes: null,
    pageCount: 0,
    zoomLevel: 1,
    rotation: 0,
    searchQuery: docsViewState.pdfPreview?.searchQuery || "",
    darkMode: docsViewState.pdfPreview?.darkMode || false
  };
  renderProjectDocumentsContent(root);

  try {
    await ensurePdfPreviewObjectUrl(documentItem);
  } catch (error) {
    setPdfPreviewRawBytes(String(documentItem.id || "").trim(), null);
    docsViewState.pdfPreview = {
      objectUrl: "",
      signedUrl: "",
      sourceDocumentId: String(documentItem.id || "").trim(),
      isLoading: false,
      errorMessage: error instanceof Error ? error.message : "Impossible de charger ce PDF depuis Supabase.",
      bytes: null,
      pageCount: 0,
      zoomLevel: 1,
      rotation: 0,
    searchQuery: docsViewState.pdfPreview?.searchQuery || "",
    darkMode: docsViewState.pdfPreview?.darkMode || false
    };
  }

  if (!root?.isConnected || docsViewState.mode !== "pdf-preview") return;
  renderProjectDocumentsContent(root);
}

function closePdfPreview(root) {
  resetPdfPreviewState();
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
  const enabledPhases = getEnabledProjectPhasesCatalog();
  const currentPhase = enabledPhases.find((item) => item.code === docsViewState.selectedPhase) || null;
  const fileName = docsViewState.file?.name || "Document";
  const mimeType = String(docsViewState.file?.type || "").trim();
  const extension = getFileExtension(fileName);
  const previewUrl = "";

  return {
    name: fileName,
    title: title || fileName || "Document",
    note: baseNote,
    updatedAt: "À l'instant",
    phaseCode: currentPhase?.code || docsViewState.selectedPhase || "APS",
    phaseLabel: currentPhase?.label || "",
    fileName,
    mimeType,
    extension,
    previewUrl,
    localFile: mimeType === "application/pdf" ? docsViewState.file : null
  };
}

function triggerAutoAnalysisAfterDirectUpload(root, document = null) {
  const documentName = document?.name || "";
  if (!shouldAutoRunAnalysisAfterUpload()) {
    setDocumentsActivity({
      tone: "info",
      title: "Document déposé",
      message: "Le dépôt a été enregistré. L’analyse automatique n’est pas activée pour ce projet."
    });
    return;
  }

  if (isAnalysisRunning()) {
    const currentRun = getCurrentAnalysisRunMeta();
    setDocumentsActivity({
      tone: "warning",
      title: "Document déposé",
      message: `Le dépôt a été enregistré, mais l’analyse automatique n’a pas été relancée car un traitement est déjà en cours${currentRun.runId ? ` (${currentRun.runId})` : ""}.`
    });
    return;
  }

  setDocumentsActivity({
    tone: "success",
    title: "Document déposé",
    message: "Le dépôt a été enregistré et l’analyse parasismique automatique a été lancée."
  });

  runAnalysis({
    triggerType: "document-upload",
    triggerLabel: "Dépôt de document",
    documentName,
    documentIds: document?.id ? [document.id] : [],
    summary: "Analyse déclenchée automatiquement après dépôt réussi d’un document."
  });

  renderProjectDocuments(root);
}

function commitDirectDocument(root) {
  if (!docsViewState.file) return;

  const documentFile = docsViewState.file;
  const repoDocument = addProjectDocument(buildRepoDocumentFromState());

  store.projectForm.pdfFile = documentFile;

  closeUploadView(root);
  triggerAutoAnalysisAfterDirectUpload(root, repoDocument);
}

function handleSubmit(root) {
  if (!canSubmitUpload()) return;
  commitDirectDocument(root);
}

function bindDocumentsSplitActions(root) {
  bindGhActionButtons();


  const addAction = document.querySelector('[data-action-id="documentsAddAction"]');
  if (addAction) {
    initGhActionButton(addAction, { mainAction: "add-documents" });
    addAction.addEventListener("ghaction:action", (event) => {
      const action = event.detail?.action || "";
      if (action === "add-documents") {
        docsViewState.mode = "upload";
        renderProjectDocuments(root);
      }
    });
  }
}

function bindDocumentsView(root) {
  bindDocumentsSplitActions(root);

    const activityCloseBtn = document.getElementById("documentsActivityCloseBtn");
  if (activityCloseBtn) {
    activityCloseBtn.addEventListener("click", () => {
      clearDocumentsActivity();
      renderProjectDocuments(root);
    });
  }

  const submitBtn = document.getElementById("documentsSubmitBtn");
  const syncSubmitState = () => {
    if (!submitBtn) return;
    submitBtn.disabled = !canSubmitUpload();
  };

  syncSubmitState();

  const handleAnalysisStateChanged = () => {
    if (docsViewState.mode !== "list") return;
    renderProjectDocuments(root);
  };

  document.removeEventListener("analysisStateChanged", handleAnalysisStateChanged);
  document.addEventListener("analysisStateChanged", handleAnalysisStateChanged, { once: true });

  const cancelBtn = document.getElementById("documentsCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeUploadView(root);
    });
  }

  const reportBackBtn = document.getElementById("documentsReportBackBtn");
  if (reportBackBtn) {
    reportBackBtn.addEventListener("click", () => {
      closeReportPreview(root);
    });
  }

  const pdfBackBtn = document.getElementById("documentsPdfBackBtn");
  if (pdfBackBtn) {
    pdfBackBtn.addEventListener("click", () => {
      closePdfPreview(root);
    });
  }

  if (docsViewState.mode === "pdf-preview") {
    bindPdfPreviewControls(root);
    updatePdfPreviewToolbarState(root);
  }

  if (docsViewState.mode === "pdf-preview" && docsViewState.pdfPreview?.bytes instanceof Uint8Array) {
    schedulePdfPreviewRender(root);
  }

  document.querySelectorAll(".js-document-title-trigger[data-document-id]").forEach((trigger) => {
    const documentId = trigger.getAttribute("data-document-id") || "";
    const documentItem = getProjectDocumentById(documentId);
    if (!canPreviewPdf(documentItem)) return;

    trigger.addEventListener("click", async (event) => {
      event.preventDefault();
      await openPdfPreview(root, documentId);
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      if (!canSubmitUpload()) return;
      submitBtn.disabled = true;
      handleSubmit(root);
    });
  }

  const chooseBtn = document.getElementById("documentsChooseBtn");
  const fileInput = document.getElementById("documentsFileInput");
  const dropzone = document.getElementById("documentsDropzone");

  if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => {
      if (docsViewState.isUploading) return;
      fileInput.value = "";
      fileInput.click();
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
      stopUploadSimulation();
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
}

function renderProjectDocumentsContent(root) {
  syncDocumentsProjectViewHeader();

  root.innerHTML = docsViewState.mode === "upload"
    ? renderUploadView()
    : docsViewState.mode === "report-preview"
      ? renderReportPreviewView()
      : docsViewState.mode === "pdf-preview"
        ? renderPdfPreviewView()
        : renderDocumentsListView();

  bindDocumentsView(root);
}

export function renderProjectDocuments(root) {
  syncDocumentsSelectedPhase();

  root.className = "project-shell__content";
  clearProjectActiveScrollSource();

  renderProjectDocumentsContent(root);

  syncProjectDocumentsFromSupabase({ force: true })
    .then(() => {
      if (!root?.isConnected) return;
      renderProjectDocumentsContent(root);
    })
    .catch((error) => {
      console.warn("syncProjectDocumentsFromSupabase failed", error);
    });
}
