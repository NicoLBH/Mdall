import { store } from "../store.js";
import { PROJECT_TAB_IDS } from "../constants.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import { brancherLaZoneDeDepot } from "./ui/zone-de-depot.js";
import { setProjectViewHeader, clearProjectActiveScrollSource, debugProjectScrollPolicy, resetProjectShellCompactState, bindProjectDocumentChromeCompact } from "./project-shell-chrome.js";
import { bindSideResizer } from "./ui/side-resizer.js";
import { brancherLesBoutonsCopier, copierDansLePressePapiers } from "./ui/bouton-copier.js";
import { brancherLeBoutonHaut } from "./ui/bouton-haut.js";
import {
  bindGhActionButtons,
  initGhActionButton,
  renderGhActionButton
} from "./ui/gh-split-button.js";
import { renderProjectTableToolbarGroup } from "./ui/project-table-toolbar.js";
import { renderGhInput } from "./ui/gh-input.js";
import { renderStateDot } from "./ui/status-badges.js";
import { renderUploadProgressBar } from "./ui/upload-progress.js";
import { svgIcon } from "../ui/icons.js";
import { renderDataTableShell, renderDataTableHead, renderDataTableEmptyState } from "./ui/data-table-shell.js";
import { escapeHtml } from "../utils/escape-html.js";
import { proposeTitle } from "../services/proposition-title.js";
import { addProjectDocument, decorateDocumentWithPhase, getEnabledProjectPhasesCatalog, getProjectDocumentById, getProjectDocumentPreviewUrl, getProjectDocuments, resolveDocumentRefs, setActiveProjectDocument } from "../services/project-documents-store.js";
import { listDocumentDirectory, listDocumentFolders, createDocumentFolder, renameDocumentFolder, moveDocumentFile, resolveCurrentBackendProjectId, syncProjectDocumentsFromSupabase } from "../services/project-supabase-sync.js";
import { getEffectiveSituationStatus, getEffectiveSujetStatus } from "./project-situations.js";
import {
  preparerLaMemoire, fichierDuChemin, adresseDuFichier, nomDuFichier as nomDuFichierDeLaMemoire,
  noeudsDeLaMemoire, renderLigneDArbre, renderPanneauDArbre,
  renderFilDAriane, renderRechercheDuProjet, renderTelechargerLaMemoire, renderTeteDuContenu, renderRecherche, renderDossiers, renderFichiers, renderFichier, fichierEnClair, ilYA, LECTURE,
  COLONNES_DU_TABLEAU, GABARIT_DU_TABLEAU, lignesAffichables
} from "./project-memoire-fichiers.js";
import { enClair } from "../services/memoire-en-texte.js";
import { emploisParAffirmation } from "../services/memoire-applications.js";
import { MEMOIRE, DOCUMENTS, phraseDeLaRacine } from "../services/memoire-rangement.js";
import { versementsDeLaMemoire } from "../services/memoire-blame.js";
import { sujetsDeclares, variablesDeLaMemoire, cleDuSujet } from "../services/memoire-identifiants.js";
import { rangVoisin } from "../services/memoire-recherche-texte.js";
import {
  lireAPropos, ecrireAPropos, topicsDeLaSaisie, descriptionDeLaSaisie,
  DESCRIPTION_MAX, TOPICS_MAX
} from "../services/projet-a-propos.js";
import { buildSupabaseAuthHeaders, getSupabaseAnonKey, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabaseAnonKey();
const PDFJS_CDN_VERSION = "4.4.168";
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.worker.min.mjs`;
const PDF_PREVIEW_ZOOM_STEPS = [
  0.01, 0.0625, 0.0833, 0.125, 0.25, 0.333, 0.5, 0.667, 0.75, 0.79, 1, 1.25, 1.5, 2, 2.38, 3, 4, 6, 8, 12, 16, 24, 32, 64
];

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

function logPdfPreviewDebug(label, payload = {}) {
  try {
    if (window.localStorage?.getItem("debug:project-scroll-policy") !== "1") return;
  } catch (_) {
    return;
  }

  console.info("[documents-pdf-preview]", label, payload);
}

/**
 * Les deux branches de l'onglet Fichiers.
 *
 * Elles se nomment ici et nulle part ailleurs. Une clé tirée du libellé —
 * « Mémoire ».toLowerCase() — rendait « mémoire », qui ne vaut aucune branche :
 * le clic ouvrait donc les Documents, et les fichiers de mémoire devenaient
 * inatteignables. Un identifiant qui se **dérive** d'un texte affiché finit par
 * en dépendre.
 */
const BRANCHE = { MEMOIRE: "memoire", DOCUMENTS: "documents" };

const docsViewState = {
  mode: "list", // "list" | "upload" | "report-preview" | "pdf-preview"
  /**
   * La branche ouverte de l'onglet Fichiers.
   *
   * ## Pourquoi les deux matières vivent au même endroit
   *
   * Les PDF et les fichiers de mémoire sont de même nature : ce sont les
   * **sources** du projet, celles à partir desquelles il se reconstruit. Les
   * PDF ne suffisent pas — qui a dit, quand, qui assume sont aussi des sources,
   * et l'application les produit. Le besoin est le même, l'écran l'était déjà
   * presque : un arbre, un tableau, un lecteur.
   *
   * `""` la racine, `BRANCHE.MEMOIRE` ce que le projet sait, `BRANCHE.DOCUMENTS`
   * ce qu'il a reçu.
   */
  branche: "",
  /** Le chemin ouvert dans la branche Mémoire : `["Incendie", "incendie.ctr"]`. */
  memoireChemin: [],
  /** Ce qu'on cherche dans la mémoire. Traverse les dossiers. */
  memoireQuery: "",
  /** Code ou Origine. */
  memoireLecture: "code",
  /** Les blocs repliés du fichier ouvert, par leur identifiant. */
  memoirePlies: new Set(),
  /**
   * Ce qu'on cherche **dans** le fichier ouvert : `{ouverte, mot, rang}`.
   *
   * Distinct de `memoireQuery`, qui cherche dans tout le projet. Les deux
   * partagent le même service et le même surlignage, mais pas le même geste :
   * l'une répond « où est-ce ? », l'autre « où en suis-je ? ».
   */
  memoireCherche: { ouverte: false, mot: "", rang: null },
  /** Le menu « Ajouter un fichier », ouvert ou non. */
  ajoutOuvert: false,
  /** Ce que le projet dit de lui-même. `null` tant qu'on n'a pas lu. */
  aPropos: null,
  /** La saisie de « À propos », ouverte ou non, et ce qu'elle porte. */
  aProposSaisie: null,
  /** Ce qui a empêché l'enregistrement, s'il y a lieu. */
  aProposEchec: "",
  /** Les racines repliées de l'arbre : « memoire », « documents ». */
  racinesRepliees: new Set(),
  /** Les dossiers repliés du rail de la Mémoire. */
  memoireReplies: new Set(),
  // Les fichiers choisis pour le prochain dépôt. `files`, plus bas, désigne tout
  // autre chose — le contenu du répertoire affiché —, d'où ce nom-ci.
  selectedFiles: [],
  /**
   * Ce qu'on fera du lot : « direct » pour l'écrire tel quel dans le projet,
   * « proposition » pour le soumettre à jugement, ou l'identifiant d'une
   * proposition ouverte à laquelle l'ajouter.
   *
   * `null` tant que l'examen des fichiers n'a pas suggéré de défaut. On ne
   * déplace jamais ce choix sous la main de l'utilisateur : `depositModeTouched`
   * le fige dès qu'il y a touché.
   */
  depositMode: null,
  depositModeTouched: false,
  /** Vrai dès que l'utilisateur a écrit le titre lui-même : on n'y touche plus. */
  titleTouched: false,
  /** L'examen des fichiers choisis, réutilisé au dépôt pour ne pas les relire. */
  inspection: { running: false, exploitable: 0, byFile: null },
  /** Les propositions ouvertes du projet, pour pouvoir y ajouter le lot. */
  openPropositions: [],
  title: "",
  description: "",
  isUploading: false,
  uploadProgress: null,
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
  },
  currentFolderId: null,
  breadcrumb: [],
  folders: [],
  files: [],
  // L'arbre est ouvert d'emblée : c'est lui qui montre les deux matières du
  // projet, et le replier par défaut cachait la moitié de ce qu'on vient voir.
  documentTreeOpen: true,
  moveModal: {
    isOpen: false,
    fileId: "",
    sourceFolderId: null,
    targetFolderId: null,
    folders: []
  },
  treeWidth: 280,
  treeResizeActive: false,
  treeExpandedFolderIds: []
};
const DOCUMENTS_TREE_EXPANDED_STORAGE_KEY = "mdall.documents.tree.expanded.v1";

function getFolderClosedIconSvg() {
  return `<svg data-component="Octicon" aria-hidden="true" focusable="false" class="octicon octicon-file-directory-fill" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path></svg>`;
}

function getFolderOpenIconSvg() {
  return `<svg data-component="Octicon" aria-hidden="true" focusable="false" class="octicon octicon-file-directory-open-fill" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1H13a1 1 0 0 1 1 1v.5H2.75a.75.75 0 0 0 0 1.5h11.978a1 1 0 0 1 .994 1.117L15 13.25A1.75 1.75 0 0 1 13.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75c0-.464.184-.91.513-1.237Z"></path></svg>`;
}

async function loadCurrentDirectory({ forceFolderId } = {}) {
  // La même résolution que le dépôt. Elle lisait auparavant `store.currentProject`
  // et retombait sur l'identifiant du projet de l'écran : le répertoire pouvait
  // alors être interrogé sur un projet différent de celui où les documents
  // venaient d'être écrits, et paraître vide sans que rien ne l'explique.
  const projectId = String((await resolveCurrentBackendProjectId().catch(() => "")) || "").trim();
  const folderId = forceFolderId === undefined ? docsViewState.currentFolderId : (forceFolderId || null);
  console.info("[documents-view] load-directory.start", { projectId, folderId });
  const directory = await listDocumentDirectory(projectId, folderId);
  docsViewState.currentFolderId = directory?.currentFolder?.id || null;
  docsViewState.breadcrumb = Array.isArray(directory?.breadcrumb) ? directory.breadcrumb : [];
  docsViewState.folders = Array.isArray(directory?.folders) ? directory.folders : [];
  docsViewState.files = Array.isArray(directory?.files) ? directory.files : [];
  console.info("[documents-view] load-directory.success", { projectId, folderId: docsViewState.currentFolderId, folders: docsViewState.folders.length, files: docsViewState.files.length });
}

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
  const host = document.getElementById("projectViewHeaderHost");
  if (host) {
    host.innerHTML = "";
    host.remove();
  }
}

/** Le gabarit vient d'un seul endroit : deux copies finiraient par se décaler. */
function getDocumentsTableGridTemplate() {
  return GABARIT_DU_TABLEAU;
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

/**
 * Retrouver une pièce, où qu'elle ait été lue.
 *
 * L'onglet tient **deux** listes de documents : celle du répertoire courant,
 * que le tableau affiche, et celle du projet entier, que l'arbre parcourt. Une
 * valeur écrite à deux endroits finit par diverger (`docs/fondamentaux.md`,
 * règle 4) — et elle divergeait : le tableau dessinait une ligne cliquable à
 * partir de sa propre liste, tandis que le geste cherchait la pièce dans
 * l'autre. Quand elle n'y était pas, le clic ne faisait rien, sans un mot.
 *
 * On cherche donc dans les deux, en commençant par celle qu'on regarde.
 */
function pieceDesFichiers(documentId) {
  const id = String(documentId || "").trim();
  if (!id) return null;

  const duRepertoire = (Array.isArray(docsViewState.files) ? docsViewState.files : [])
    .find((piece) => String(piece?.id || "") === id);

  return duRepertoire || getProjectDocumentById(id);
}

function getSelectedPdfDocument() {
  // Celle que l'aperçu a ouverte d'abord : c'est lui qui sait ce qu'il montre.
  // La sélection globale sert de repli — elle vaut pour l'arbre, qui surligne.
  const ouverte = String(docsViewState.pdfPreview?.sourceDocumentId || "").trim();
  const active = String(store.projectDocuments?.activeDocumentId || "").trim();
  return pieceDesFichiers(ouverte || active);
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
    zoomNode.value = formatPdfPreviewZoomPercent(docsViewState.pdfPreview?.zoomLevel || 1);
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
        void copierDansLePressePapiers(selectedText, { replier: false });
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
    if (target.id === "documentsPdfZoomValue" && event.key === "Enter") {
      event.preventDefault();
      const parsed = parsePdfZoomInputValue(target.value);
      if (parsed) {
        docsViewState.pdfPreview.zoomLevel = parsed;
        updatePdfPreviewToolbarState(root);
        schedulePdfPreviewRender(root);
      } else {
        updatePdfPreviewToolbarState(root);
      }
      return;
    }
    if (target.id !== "documentsPdfSearchInput") return;
    if (event.key === "Enter") {
      event.preventDefault();
      movePdfPreviewSearchSelection(root, event.shiftKey ? -1 : 1);
    }
  });

  root.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id !== "documentsPdfZoomValue") return;
    const parsed = parsePdfZoomInputValue(target.value);
    if (parsed) {
      docsViewState.pdfPreview.zoomLevel = parsed;
      schedulePdfPreviewRender(root);
    }
    updatePdfPreviewToolbarState(root);
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
    const zoomLevel = Math.min(64, Math.max(0.01, Number(docsViewState.pdfPreview?.zoomLevel || 1)));
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
  const currentIndex = resolveClosestPdfZoomStepIndex(currentZoom);
  const nextIndex = Math.min(PDF_PREVIEW_ZOOM_STEPS.length - 1, Math.max(0, currentIndex + (direction >= 0 ? 1 : -1)));
  const nextZoom = PDF_PREVIEW_ZOOM_STEPS[nextIndex];
  if (Math.abs(nextZoom - currentZoom) < 0.001) {
    logPdfPreviewDebug("zoom ignored: unchanged after clamp", { currentZoom, nextZoom, direction });
    return;
  }
  docsViewState.pdfPreview.zoomLevel = nextZoom;
  logPdfPreviewDebug("zoom updated", { currentZoom, nextZoom, direction });
  schedulePdfPreviewRender(root);
}

function resolveClosestPdfZoomStepIndex(zoomLevel = 1) {
  const target = Number(zoomLevel);
  if (!Number.isFinite(target)) return 10;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  PDF_PREVIEW_ZOOM_STEPS.forEach((step, index) => {
    const distance = Math.abs(step - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function parsePdfZoomInputValue(value = "") {
  const normalized = String(value || "").replace(",", ".").replace("%", "").trim();
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(64, Math.max(0.01, numeric / 100));
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

/**
 * L'en-tête du dépôt, aligné sur celui de la Mémoire.
 *
 * Les deux moitiés de l'onglet montrent la même chose — des fichiers, ce qui
 * leur est arrivé, quand — et deux tableaux différents pour un même geste
 * donnaient l'impression de deux applications. « Indicateurs » a disparu avec
 * sa colonne : des compteurs de sujets ouverts sur la ligne d'un PDF
 * répondaient à une question que personne ne pose en cherchant un fichier.
 */
function renderDocumentsTableHeadHtml() {
  const classe = { nom: "name", message: "message", date: "date" };
  return renderDataTableHead({
    columns: COLONNES_DU_TABLEAU.map((colonne) => ({
      className: `documents-repo__col documents-repo__col--${classe[colonne.cle]}`,
      label: colonne.libelle
    }))
  });
}


/**
 * Le menu du fil d'Ariane.
 *
 * Deux boutons — « Ajouter un dossier » et « + Documents » — occupaient la barre
 * pour deux gestes qu'on fait rarement, et il n'y avait de place nulle part pour
 * le troisième : **retirer un document**. Un dépôt fait par erreur n'avait aucune
 * correction, ce qui est le genre de manque qui fait qu'on n'ose plus déposer.
 *
 * Retirer ne supprime pas et ne se fait pas d'un clic : cela **prépare une
 * proposition**, comme tout ce qui touche au projet (voir
 * `docs/fondamentaux.md`). Le rouge dit la gravité du geste, pas son
 * immédiateté.
 */
function renderDocumentsMenu(selectedDocument) {
  const nomDuFichier = String(selectedDocument?.name || "").trim();

  return renderGhActionButton({
    id: "documentsMenu",
    icon: svgIcon("kebab-horizontal", { className: "octicon" }),
    iconOnly: true,
    menuOnly: true,
    tone: "default",
    // Ajouter un dossier et ajouter un document ont maintenant leur bouton dans
    // la même barre : les redire ici donnerait deux chemins pour un geste, et
    // deux libellés qui finiraient par ne plus dire la même chose.
    items: [
      {
        action: "documents-remove",
        icon: svgIcon("trash", { width: 14, height: 14 }),
        label: nomDuFichier ? "Retirer ce document" : "Retirer un document",
        danger: true,
        disabled: !nomDuFichier,
        title: nomDuFichier
          ? `Prépare une proposition qui sort « ${nomDuFichier} » du corpus`
          : "Ouvrez un document pour pouvoir le retirer"
      }
    ]
  });
}

/**
 * La barre des Documents : le chemin, et ce qu'on peut y faire.
 *
 * Une seule ligne, racine comprise. Le fil d'Ariane vivait au-dessus des deux
 * boutons, sur une ligne à lui, et la racine n'avait pas de barre du tout : on
 * y entrait sans plus voir d'où l'on venait.
 */
function renderDocumentsTopBar() {
  const enApercu = docsViewState.mode === "pdf-preview";
  const dansLesDocuments = docsViewState.branche === BRANCHE.DOCUMENTS;
  const gestes = dansLesDocuments
    ? `${renderProjectTableToolbarGroup({
         html: `<button type="button" class="gh-btn" id="documentsAddFolderBtn">Ajouter un dossier</button>`
       })}
       ${renderProjectTableToolbarGroup({
         html: renderGhActionButton({
           id: "documentsAddAction", label: "Documents", icon: getPlusIconSvg(),
           tone: "primary", mainAction: "add-documents"
         })
       })}`
    : "";

  return renderTeteDuContenu({
    replie: docsViewState.documentTreeOpen === false,
    fil: renderDocumentsBreadcrumb(),
    droite: `
      ${docsViewState.documentTreeOpen === false ? renderRechercheDuProjet(docsViewState.memoireQuery ?? "") : ""}
      ${gestes}
      ${
        // Ajouter, retirer, déplacer : des gestes sur des pièces déposées. Un
        // fichier de mémoire n'a pas de chemin qu'on choisit — il est calculé
        // — et proposer de le déplacer serait proposer de casser un rangement
        // qui n'appartient pas à celui qui lit.
        dansLesDocuments
          ? renderDocumentsMenu(enApercu ? decorateDocumentWithPhase(getSelectedPdfDocument()) : null)
          : ""
      }
    `
  });
}

/**
 * Le fil d'Ariane des Documents.
 *
 * Il commence à **Fichiers**, la racine de l'onglet. Sans elle, on entrait dans
 * les Documents sans plus rien pour revenir à l'accueil : le chemin disait
 * « Documents » et s'arrêtait là.
 *
 * Le dernier morceau est là où l'on se trouve : il s'écrit en clair, il ne se
 * clique pas. Un lien vers l'endroit où l'on est déjà ne mène nulle part.
 */
function renderDocumentsBreadcrumb() {
  const selectedDocument = docsViewState.mode === "pdf-preview" ? decorateDocumentWithPhase(getSelectedPdfDocument()) : null;

  const lien = (cible, libelle) =>
    `<button type="button" class="documents-breadcrumb__link" ${cible}>${escapeHtml(libelle)}</button>`;
  const ici = (libelle) => `<span class="documents-breadcrumb__current">${escapeHtml(libelle)}</span>`;
  const sep = `<span class="documents-breadcrumb__sep">/</span>`;

  const morceaux = [
    { libelle: "Fichiers", cible: `data-fichiers-branche=""` },
    { libelle: DOCUMENTS, cible: `data-breadcrumb-folder-id=""` },
    ...docsViewState.breadcrumb.map((dossier) => ({
      libelle: String(dossier.name || "Dossier"),
      cible: `data-breadcrumb-folder-id="${escapeHtml(String(dossier.id || ""))}"`
    })),
    ...(selectedDocument?.name ? [{ libelle: String(selectedDocument.name), cible: "" }] : [])
  ];

  // Un répertoire garde son slash final, un fichier n'en a pas : « Fichiers /
  // Documents / » se lit comme un endroit où l'on est, « … / plan.pdf » comme
  // une chose qu'on regarde.
  const surUnFichier = Boolean(selectedDocument?.name);

  const rendu = morceaux
    .map((morceau, rang) => (rang === morceaux.length - 1 ? ici(morceau.libelle) : lien(morceau.cible, morceau.libelle)))
    .join(sep);

  return `<div class="documents-breadcrumb">${rendu}${surUnFichier ? "" : sep}</div>`;
}

function renderRepoFolderRow(folder) {
  return `
    <div class="documents-repo__row documents-repo__row--folder is-clickable" data-folder-id="${escapeHtml(folder.id || "")}" role="button" tabindex="0" aria-label="Ouvrir le dossier">
      <div class="documents-repo__cell documents-repo__cell--name">
        <span class="documents-repo__icon documents-repo__icon--folder">${getFolderClosedIconSvg()}</span>
        <button type="button" class="documents-repo__name documents-repo__name-trigger js-folder-open-trigger" data-folder-id="${escapeHtml(folder.id || "")}">${escapeHtml(folder.name || "Dossier")}</button>
      </div>
      <div class="documents-repo__cell documents-repo__cell--message"><div class="documents-repo__message-main">Dossier</div></div>
      <div class="documents-repo__cell documents-repo__cell--date">
        <span>${escapeHtml(ilYA(folder.updated_at || folder.created_at) )}</span>
        <button type="button" class="gh-btn gh-btn--sm documents-repo__geste"
          data-folder-rename-id="${escapeHtml(folder.id || "")}"
          data-folder-rename-name="${escapeHtml(folder.name || "")}">Renommer</button>
      </div>
    </div>
  `;
}


function renderRepoDocumentRow(doc) {
  const decoratedDoc = decorateDocumentWithPhase(doc);
  const isPdf = isPdfDocument(decoratedDoc);
  const isPreviewablePdf = canPreviewPdf(decoratedDoc);
  const recognition = describeRecognition(decoratedDoc);
  // Un document hors corpus reste là, grisé, avec le mot qui le dit. Le faire
  // disparaître recréerait le mensonge qu'on a corrigé : un fichier qui existe
  // en base et n'apparaît nulle part.
  //
  // « Hors corpus » plutôt que « refusé » : les deux chemins y mènent — un
  // livrable écarté en revue, et un document retiré ensuite par une
  // proposition. Écrire « refusé » sur un document qui a servi trois mois
  // laisserait croire qu'il n'était jamais entré.
  const refuse = decoratedDoc.corpusState === "refused";

  return `
    <div
      class="documents-repo__row documents-repo__row--file${isPdf ? " documents-repo__row--pdf" : ""}${isPreviewablePdf ? " is-clickable" : ""}${refuse ? " documents-repo__row--refused" : ""}"
      data-document-id="${escapeHtml(decoratedDoc.id || "")}"
      ${isPreviewablePdf ? 'role="button" tabindex="0" aria-label="Ouvrir l’aperçu du PDF"' : ""}
    >
      <div class="documents-repo__cell documents-repo__cell--name">
        <span class="documents-repo__icon documents-repo__icon--document">${getDocumentIconSvg()}</span>
        <button type="button" class="documents-repo__name documents-repo__name-trigger js-document-title-trigger" data-document-id="${escapeHtml(decoratedDoc.id || "")}">${escapeHtml(decoratedDoc.name)}</button>
        ${refuse ? `<span class="documents-repo__refused" title="Ce document ne fait plus partie du corpus : il n'est plus lu par les analyses. Il reste en base, et l'histoire dit quand il en est sorti.">hors corpus</span>` : ""}
      </div>
      <div class="documents-repo__cell documents-repo__cell--message">
        <div class="documents-repo__message-main${recognition.known ? " documents-repo__message-main--known" : ""}" title="${escapeHtml(recognition.title)}">${escapeHtml(recognition.main)}</div>
        <div class="documents-repo__message-meta">${escapeHtml(recognition.meta)}</div>
      </div>
      <div class="documents-repo__cell documents-repo__cell--date">
        <span>${escapeHtml(ilYA(decoratedDoc.updatedAt))}</span>
        ${
          // Ajouter, retirer, déplacer : des gestes sur des pièces déposées. Un
          // fichier de mémoire n'a pas de chemin qu'on choisit — il est calculé.
          docsViewState.branche === BRANCHE.DOCUMENTS
            ? `<button type="button" class="gh-btn gh-btn--sm documents-repo__geste"
                 data-document-move-id="${escapeHtml(decoratedDoc.id || "")}">Déplacer</button>`
            : ""
        }
      </div>
    </div>
  `;
}

/**
 * Ce que Mdall a reconnu du document, dit sur la ligne du dépôt.
 *
 * La ligne annonçait jusqu'ici « source_pdf » ou « Document prêt pour
 * l'analyse » — un état technique qui n'apprenait rien. Elle annonce
 * maintenant la nature du document quand elle est connue, et la raison quand
 * elle ne l'est pas : un refus muet laisse chercher, un refus expliqué se
 * traite.
 *
 * La reconnaissance est générique : demain la même ligne dira « compte rendu
 * de chantier » sans qu'on ait à toucher ici.
 */
function describeRecognition(document = {}) {
  const detection = document.detection ?? null;
  const phase = `${document.phaseCode || ""}${document.phaseLabel ? ` - ${document.phaseLabel}` : ""}`;
  const fallback = document.note || "Document prêt pour l'analyse";

  // Un doublon ou une réédition passent avant tout le reste : c'est ce qu'il
  // faut savoir de ce document, et savoir DE QUI il double ou réédite. Le dire
  // sans nommer l'autre laisserait le lecteur chercher lequel.
  const twin = describeTwin(document);
  if (twin) return { known: false, main: twin, meta: phase, title: twin };

  if (!detection?.status) return { known: false, main: fallback, meta: phase, title: fallback };

  const known = detection.status === "RECOGNIZED" || detection.status === "RECOGNIZED_WITHOUT_CONTENT";
  const main = known ? detection.kindLabel || fallback : detection.reason || fallback;
  const parts = [
    detection.author ? detection.author.toLocaleUpperCase("fr") : null,
    detection.status === "RECOGNIZED_WITHOUT_CONTENT" ? "sans contenu exploitable" : null,
    detection.confidence === "probable" ? "reconnaissance probable" : null,
    phase || null
  ].filter(Boolean);

  return { known, main, meta: parts.join(" · "), title: detection.reason || main };
}

/**
 * Le document dont celui-ci est le double, ou la réédition — nommé.
 *
 * « Doublon » tout court oblige à chercher de quoi. Le nom de l'autre fichier
 * est la moitié de l'information, et c'est celle qui permet d'agir.
 */
function describeTwin(document = {}) {
  const identity = document.identity ?? null;
  if (!identity) return "";

  const nameOf = (id) => {
    const other = getProjectDocumentById(id);
    return other?.name || other?.fileName || "un autre document";
  };

  if (identity.duplicateOf) {
    return `Doublon de « ${nameOf(identity.duplicateOf)} » — même contenu, sous un autre nom.`;
  }
  if (identity.reissueOf) {
    return `Même référence que « ${nameOf(identity.reissueOf)} », contenu différent : réédition à vérifier.`;
  }
  return "";
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

  // Retomber en silence sur la liste était le pire des retours : l'écran
  // revenait exactement là où l'on avait cliqué, et le clic paraissait n'avoir
  // rien fait. On dit ce qu'on ne sait pas afficher.
  if (!documentItem) {
    docsViewState.activity = {
      tone: "error",
      title: "Ce fichier n'a pas pu être ouvert",
      message: "La pièce n'est plus dans la liste des documents du projet. Rechargez l'onglet."
    };
    docsViewState.mode = "list";
    return renderDocumentsListView();
  }

  const previewUrl = String(docsViewState.pdfPreview?.objectUrl || "").trim()
    || String(docsViewState.pdfPreview?.signedUrl || "").trim()
    || getProjectDocumentPreviewUrl(documentItem);
  const openInBrowserUrl = String(docsViewState.pdfPreview?.signedUrl || "").trim() || previewUrl;
  const isLoadingPreview = Boolean(docsViewState.pdfPreview?.isLoading);
  const previewErrorMessage = String(docsViewState.pdfPreview?.errorMessage || "").trim();
  const hasPdfBytes = docsViewState.pdfPreview?.bytes instanceof Uint8Array && docsViewState.pdfPreview.bytes.byteLength > 0;

  const treeHtml = renderArbreDesFichiers({
    memoire: preparerLaMemoire(docsViewState.memoireAssertions ?? []),
    ouverte: docsViewState.documentTreeOpen !== false,
    query: docsViewState.memoireQuery ?? ""
  });
  const topBar = renderDocumentsTopBar();
  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="documents-shell documents-shell--project-page documents-shell--pdf-preview documents-layout" id="projectDocumentScroll" style="--documents-tree-width:${docsViewState.documentTreeOpen ? Math.max(220, Math.min(520, Number(docsViewState.treeWidth || 280))) : 0}px">
        ${treeHtml}
        <main class="documents-main">
          ${topBar}
          ${renderDocumentsActivityBanner()}
          <div class="documents-report">

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
                    <input
                      type="text"
                      class="gh-input documents-pdf-viewer__zoom-value"
                      id="documentsPdfZoomValue"
                      inputmode="decimal"
                      value="${formatPdfPreviewZoomPercent(docsViewState.pdfPreview?.zoomLevel || 1)}"
                      aria-label="Niveau de zoom du PDF"
                    />
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
        </main>
      </div>
    </section>
  `;
}

/**
 * Ce que le projet sait, lu une fois par ouverture de l'onglet.
 *
 * Un échec ne vide pas la branche : il la laisse comme elle était, et l'écran
 * dira qu'il n'a rien pu lire plutôt que d'afficher une mémoire vide, qui se
 * lirait comme une perte.
 */
async function chargerLaMemoire() {
  const projet = String(store.currentProject?.backendProjectId || store.currentProjectId || "").trim();
  if (!projet) return;

  try {
    const [memoire, propositions] = await Promise.all([
      import("../services/project-memory-supabase.js"),
      import("../services/propositions-supabase.js")
    ]);

    docsViewState.memoireAssertions = (await memoire.listProjectAssertions(projet)) ?? [];

    // Ce que chaque règle a lu : c'est de là que vient « employée n fois ».
    // `null` quand la lecture échoue — « personne ne s'en sert » et « je ne sais
    // pas qui s'en sert » sont deux phrases différentes, et la vue les
    // distingue. Isolé du reste : un graphe illisible ne doit pas emporter les
    // fichiers, qui se lisent très bien sans lui.
    try {
      const { listerLesApplications } = await import("../services/memoire-applications-supabase.js");
      docsViewState.memoireApplications = await listerLesApplications(projet);
    } catch {
      docsViewState.memoireApplications = null;
    }

    const ouvertes = (await propositions.listPropositions(projet)) ?? [];
    docsViewState.memoirePropositions = new Map(ouvertes.map((entree) => [String(entree.id), entree]));

    // Le propriétaire aussi : c'est lui que la tête de l'onglet nomme, et il
    // n'a pas forcément versé quoi que ce soit.
    const auteurs = await propositions.loadAuthors([
      ...(docsViewState.memoireAssertions ?? []).map((ligne) => ligne.decided_by),
      store.currentProject?.ownerId
    ]);
    // Deux tables : les noms, que le blâme met dans une phrase, et les
    // portraits, que l'écran affiche. Les mêler donnerait « [object Object] »
    // sur chaque ligne de la mémoire.
    docsViewState.memoireAuteurs = new Map(
      [...(auteurs ?? new Map()).entries()].map(([cle, valeur]) => [
        String(cle),
        typeof valeur === "string" ? valeur : String(valeur?.name || valeur?.full_name || valeur?.email || "")
      ])
    );
    docsViewState.memoireAvatars = new Map(
      [...(auteurs ?? new Map()).entries()]
        .map(([cle, valeur]) => [String(cle), typeof valeur === "string" ? "" : String(valeur?.avatarUrl || "")])
        .filter(([, url]) => url)
    );
  } catch {
    docsViewState.memoireAssertions = docsViewState.memoireAssertions ?? [];
  }

  // Une lecture qui échoue rend `null` : « ce projet n'a rien dit » et « je
  // n'ai pas pu lire » sont deux phrases différentes, et les confondre
  // effacerait la présentation à la première écriture.
  const lu = await lireAPropos(projet);
  if (lu) docsViewState.aPropos = lu;
}

/**
 * Aller quelque part dans l'arbre.
 *
 * Une adresse, un préfixe, un endroit. `branche:memoire` ouvre une racine,
 * `memoire:Incendie/incendie.ref` un fichier de la mémoire, `documents:<id>` un
 * dossier déposé, `document:<id>` une pièce.
 *
 * ## Pourquoi une seule porte
 *
 * L'onglet avait deux navigations parallèles, une par matière. Elles se
 * ressemblaient assez pour qu'on les croie identiques, et différaient assez
 * pour que cliquer un fichier de mémoire depuis un dossier de documents ne
 * fasse rien : l'écouteur changeait le chemin de la Mémoire, mais pas la
 * branche affichée. Une seule porte ne peut pas avoir ce défaut-là.
 */
async function allerDansLArbre(root, adresse) {
  const [prefixe, ...reste] = String(adresse ?? "").split(":");
  const cible = reste.join(":");

  // Aller quelque part ferme ce qu'on regardait. Un aperçu de PDF qui survit à
  // la navigation oblige à le fermer à la main pour voir où l'on vient d'aller.
  if (docsViewState.mode !== "list") docsViewState.mode = "list";
  docsViewState.memoireQuery = "";

  if (prefixe === "branche") {
    docsViewState.branche = cible;
    docsViewState.memoireChemin = [];
    renderProjectDocumentsContent(root);
    return;
  }

  if (prefixe === "trouver") {
    // Aller sur une ligne trouvée : le fichier s'ouvre, le mot reste cherché, et
    // l'écran descend jusqu'à lui. Sans la dernière étape, on retombait en haut
    // d'un fichier de dix-sept cents lignes avec le mot quelque part dedans.
    const [adresse, rang, mot] = cible.split("\u0000");
    docsViewState.branche = BRANCHE.MEMOIRE;
    setActiveProjectDocument(null);
    docsViewState.memoireChemin = adresse ? adresse.split("/").filter(Boolean) : [];
    docsViewState.memoirePlies = new Set();
    docsViewState.memoireCherche = { ouverte: true, mot: mot ?? "", rang: Number(rang) || null };
    renderProjectDocumentsContent(root);
    descendreJusquALaLigne(root);
    return;
  }

  if (prefixe === "memoire") {
    docsViewState.branche = BRANCHE.MEMOIRE;
    // Une recherche vaut pour le fichier où on l'a tapée : la traîner dans le
    // suivant surlignerait des mots que personne n'y cherche.
    docsViewState.memoireCherche = { ouverte: false, mot: "", rang: null };
    // La pièce ouverte se referme : on ne regarde qu'une chose à la fois, et
    // l'arbre ne doit montrer qu'une sélection.
    setActiveProjectDocument(null);
    docsViewState.memoireChemin = cible ? cible.split("/").filter(Boolean) : [];
    docsViewState.memoirePlies = new Set();
    renderProjectDocumentsContent(root);
    return;
  }

  if (prefixe === "documents") {
    docsViewState.branche = BRANCHE.DOCUMENTS;
    await loadCurrentDirectory({ forceFolderId: cible || null });
    renderProjectDocumentsContent(root);
    return;
  }

  if (prefixe === "document" && cible) {
    docsViewState.branche = BRANCHE.DOCUMENTS;
    await openPdfPreview(root, cible);
  }
}

/**
 * Plier un nœud de l'arbre.
 *
 * Plier n'est pas naviguer : on n'entre pas dans « Mémoire » en la dépliant, on
 * y entre en la choisissant. Trois états de repli cohabitent — les racines, les
 * dossiers de la Mémoire, ceux des Documents — parce qu'ils n'ont pas la même
 * durée de vie : celui des Documents survit à la session, les autres non.
 */
function plierDansLArbre(root, adresse) {
  const [prefixe, ...reste] = String(adresse ?? "").split(":");
  const cible = reste.join(":");

  const bascule = (ensemble, cle) => {
    if (ensemble.has(cle)) ensemble.delete(cle);
    else ensemble.add(cle);
    return ensemble;
  };

  if (prefixe === "branche") {
    docsViewState.racinesRepliees = bascule(docsViewState.racinesRepliees ?? new Set(), cible);
  } else if (prefixe === "documents") {
    const deplies = new Set(Array.isArray(docsViewState.treeExpandedFolderIds) ? docsViewState.treeExpandedFolderIds : []);
    docsViewState.treeExpandedFolderIds = [...bascule(deplies, cible)];
    try {
      localStorage.setItem(DOCUMENTS_TREE_EXPANDED_STORAGE_KEY, JSON.stringify(docsViewState.treeExpandedFolderIds));
    } catch {
      // Un navigateur qui refuse le stockage replie tout à la prochaine visite.
    }
  } else if (prefixe === "dossier") {
    // Un dossier de la Mémoire : son repli se nomme par son nom, qui est son
    // identité — il n'a pas d'autre identifiant.
    docsViewState.memoireReplies = bascule(docsViewState.memoireReplies ?? new Set(), cible);
  }

  renderProjectDocumentsContent(root);
}

/**
 * Ce qui emploie chaque affirmation, et de quoi nommer les fonctions.
 *
 * Rendu comme un objet à étaler dans les options de `renderFichier` : la vue des
 * fichiers ne sait rien des lectures, et n'a pas à apprendre.
 */
function emploisDeLaMemoire() {
  const applications = docsViewState.memoireApplications;
  // `null` reste `null` : la vue distingue « personne ne s'en sert » de « je
  // n'ai pas pu lire qui s'en sert ».
  if (!Array.isArray(applications)) return { emplois: null, sujets: new Map() };

  return {
    emplois: emploisParAffirmation(applications),
    sujets: new Map(
      (docsViewState.memoireAssertions ?? [])
        .map((ligne) => [String(ligne?.id ?? ""), String(ligne?.payload?.subject || ligne?.subject_key || "")])
        .filter(([id]) => id)
    )
  };
}

/**
 * Le temps qu'on laisse à une frappe avant de refaire l'écran.
 *
 * Cette vue se redessine **entièrement** : trois cents affirmations recomposées
 * en texte, colorées, mesurées. Le faire à chaque touche coûtait plus de temps
 * qu'il n'en faut pour taper la suivante, et la saisie traînait derrière le
 * doigt. Personne ne cherche entre deux lettres : ce qui compte est d'avoir le
 * résultat quand on s'arrête.
 *
 * Assez court pour qu'on ne l'attende pas, assez long pour qu'un mot entier ne
 * coûte qu'un rendu.
 */
const ATTENTE_DE_FRAPPE = 180;

/**
 * Appeler une fois, quand la frappe s'arrête.
 *
 * L'appel immédiat reste possible — `maintenant()` — pour ce qui ne se tape
 * pas : une touche Entrée, un bouton. Attendre serait alors du retard pur.
 */
function quandLaFrappeSArrete(faire, attente = ATTENTE_DE_FRAPPE) {
  let minuterie = null;

  const differer = (...arguments_) => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => faire(...arguments_), attente);
  };
  differer.maintenant = (...arguments_) => {
    clearTimeout(minuterie);
    faire(...arguments_);
  };
  return differer;
}

/**
 * Redessiner sans perdre le curseur du champ de recherche.
 *
 * Tout l'écran se refait — c'est ainsi que cette vue fonctionne — et le champ
 * disparaît avec. Sans ce report, on tapait une lettre et le clavier se
 * retrouvait ailleurs : la recherche était inutilisable.
 */
function redessinerEnGardantLeChamp(root) {
  const avant = root.querySelector("[data-memoire-cherche-champ]");
  const place = avant?.selectionStart ?? null;

  renderProjectDocumentsContent(root);

  const apres = root.querySelector("[data-memoire-cherche-champ]");
  if (!apres) return;
  apres.focus();
  if (place !== null) apres.setSelectionRange(place, place);
}

/**
 * Passer à la trouvaille suivante — ou précédente —, et y descendre.
 *
 * On part de **la ligne que l'écran montre comme courante**, pas de l'état.
 * Après une frappe, l'état repart de `null` alors que la vue affiche déjà la
 * première trouvaille : la première pression sur Entrée demandait donc « la
 * suivante après rien », c'est-à-dire la première — celle où l'on était déjà.
 * Rien ne bougeait, et il fallait appuyer deux fois pour avancer d'un cran.
 */
function allerAlaTrouvaille(root, direction) {
  const rangs = [...root.querySelectorAll(".memoire-ligne--trouvee[data-memoire-rang]")]
    .map((ligne) => Number(ligne.getAttribute("data-memoire-rang")))
    .filter((rang) => Number.isFinite(rang));
  if (!rangs.length) return;

  const affichee = Number(root.querySelector(".memoire-ligne.is-courante")?.getAttribute("data-memoire-rang"));
  const depuis = Number.isFinite(affichee) ? affichee : docsViewState.memoireCherche?.rang;
  const suivant = rangVoisin(rangs, depuis, direction);
  docsViewState.memoireCherche = { ...docsViewState.memoireCherche, ouverte: true, rang: suivant };
  redessinerEnGardantLeChamp(root);
  descendreJusquALaLigne(root);
}

/**
 * Descendre jusqu'à la ligne courante de la recherche.
 *
 * `center` et non `start` : une ligne collée en haut de la fenêtre perd son
 * contexte, et c'est le contexte qu'on est venu chercher. Le défilement est
 * lisse parce qu'un saut instantané ne dit pas d'où l'on vient.
 */
function descendreJusquALaLigne(root) {
  if (typeof requestAnimationFrame !== "function") return;
  requestAnimationFrame(() => {
    const ligne = root.querySelector(".memoire-ligne.is-courante")
      ?? root.querySelector(".memoire-ligne--trouvee");
    ligne?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/**
 * Emporter la mémoire entière, en un ZIP.
 *
 * On écrit **ce que l'écran montre** : les mêmes fichiers, aux mêmes chemins,
 * avec le même texte que le bouton « copier » met dans le presse-papiers.
 * Reconstruire autre chose ici ferait deux vérités — celle qu'on lit et celle
 * qu'on emporte —, et c'est la seconde qu'on enverrait à un tiers.
 */
async function emporterLaMemoire() {
  const memoire = preparerLaMemoire(docsViewState.memoireAssertions ?? []);
  const fichiers = (memoire?.dossiers ?? []).flatMap((dossier) => dossier.fichiers ?? []);
  if (!fichiers.length) return;

  const { ecrireUnZip } = await import("../services/zip.js");
  const { enClair } = await import("../services/memoire-en-texte.js");

  const octets = ecrireUnZip(fichiers.map((fichier) => ({
    // Le chemin du dépôt, tel que l'arborescence le montre.
    chemin: `${fichier.chemin.join("/")}/${nomDuFichierDeLaMemoire(fichier)}`,
    contenu: fichierEnClair(fichier, { enClair, ouEcrit: memoire?.ouEcrit ?? null })
  })));

  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(new Blob([octets], { type: "application/zip" }));
  lien.download = `memoire-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  // L'URL d'un objet vit jusqu'à ce qu'on la relâche : ne pas le faire garde
  // toute l'archive en mémoire du navigateur jusqu'au rechargement.
  setTimeout(() => URL.revokeObjectURL(lien.href), 0);
}

/**
 * Les gestes de la branche Mémoire.
 *
 * Le même vocabulaire que la branche Documents — un chemin, un fil d'Ariane,
 * une arborescence repliable — parce que ce sont les mêmes gestes, et qu'en
 * apprendre deux pour un seul est un coût payé à chaque écran.
 */
function bindLaMemoire(root) {
  for (const bouton of root.querySelectorAll("[data-fichiers-branche]")) {
    bouton.addEventListener("click", () => {
      void allerDansLArbre(root, `branche:${bouton.getAttribute("data-fichiers-branche") || ""}`);
    });
  }

  // La recherche **dans** le fichier ouvert : ouvrir, taper, aller et venir.
  const ouvrirLaRecherche = root.querySelector("[data-memoire-chercher-ici]");
  if (ouvrirLaRecherche) {
    ouvrirLaRecherche.addEventListener("click", () => {
      const etat = docsViewState.memoireCherche;
      docsViewState.memoireCherche = etat.ouverte
        ? { ouverte: false, mot: "", rang: null }
        : { ...etat, ouverte: true };
      renderProjectDocumentsContent(root);
      root.querySelector("[data-memoire-cherche-champ]")?.focus();
    });
  }

  const champ = root.querySelector("[data-memoire-cherche-champ]");
  if (champ) {
    // L'état suit la frappe **tout de suite** — sinon un redessin venu
    // d'ailleurs réafficherait le champ avec l'avant-dernière lettre. Seul le
    // redessin attend que la frappe s'arrête.
    const chercherApresLaFrappe = quandLaFrappeSArrete(() => redessinerEnGardantLeChamp(root));

    // On tape, on cherche. Le rang repart de zéro : garder la position d'une
    // recherche précédente ferait sauter à une ligne qui ne porte plus le mot.
    champ.addEventListener("input", (event) => {
      docsViewState.memoireCherche = { ouverte: true, mot: event.target.value, rang: null };
      chercherApresLaFrappe();
    });
    champ.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        docsViewState.memoireCherche = { ouverte: false, mot: "", rang: null };
        renderProjectDocumentsContent(root);
        return;
      }
      if (event.key !== "Enter") return;
      event.preventDefault();
      // Entrée n'attend pas : on vient de demander le résultat.
      chercherApresLaFrappe.maintenant();
      allerAlaTrouvaille(root, event.shiftKey ? -1 : 1);
    });
  }

  for (const bouton of root.querySelectorAll("[data-memoire-cherche-pas]")) {
    bouton.addEventListener("click", () => {
      allerAlaTrouvaille(root, Number(bouton.getAttribute("data-memoire-cherche-pas")) || 1);
    });
  }

  root.querySelector("[data-memoire-cherche-fermer]")?.addEventListener("click", () => {
    docsViewState.memoireCherche = { ouverte: false, mot: "", rang: null };
    renderProjectDocumentsContent(root);
  });

  // Cliquer une ligne d'un résultat de recherche : on ouvre le fichier là.
  for (const bouton of root.querySelectorAll("[data-memoire-trouver]")) {
    bouton.addEventListener("click", () => {
      const adresse = bouton.getAttribute("data-memoire-trouver") || "";
      const rang = bouton.getAttribute("data-memoire-trouver-rang") || "";
      const mot = bouton.getAttribute("data-memoire-trouver-mot") || "";
      void allerDansLArbre(root, `trouver:${adresse}\u0000${rang}\u0000${mot}`);
    });
  }

  root.querySelector("[data-memoire-zip]")?.addEventListener("click", () => {
    void emporterLaMemoire();
  });

  for (const bouton of root.querySelectorAll("[data-memoire-aller]")) {
    bouton.addEventListener("click", () => {
      void allerDansLArbre(root, `memoire:${bouton.getAttribute("data-memoire-aller") || ""}`);
    });
  }

  // Un seul geste pour tout l'arbre : la Mémoire et les Documents ne sont plus
  // deux navigations qui se ressemblent, avec chacune sa façon de rater.
  for (const bouton of root.querySelectorAll("[data-arbre-aller]")) {
    bouton.addEventListener("click", () => {
      void allerDansLArbre(root, bouton.getAttribute("data-arbre-aller") || "");
    });
  }

  for (const bouton of root.querySelectorAll("[data-arbre-plier]")) {
    bouton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      plierDansLArbre(root, bouton.getAttribute("data-arbre-plier") || "");
    });
  }

  const chercher = root.querySelector("[data-memoire-query]");
  if (chercher) {
    // Elle traverse toute la mémoire : la refaire à chaque touche faisait
    // traîner la saisie derrière le doigt.
    const chercherApresLaFrappe = quandLaFrappeSArrete(() => {
      renderProjectDocumentsContent(root);
      // Le curseur revient où il était : redessiner l'écran le renverrait au
      // début du champ.
      const champ = root.querySelector("[data-memoire-query]");
      champ?.focus();
      champ?.setSelectionRange(champ.value.length, champ.value.length);
    });

    chercher.addEventListener("input", (event) => {
      docsViewState.memoireQuery = event.target.value;
      chercherApresLaFrappe();
    });
    chercher.addEventListener("keydown", (event) => {
      if (event.key === "Enter") chercherApresLaFrappe.maintenant();
    });
  }

  root.querySelector("[data-fichiers-a-propos]")?.addEventListener("click", () => {
    const aPropos = docsViewState.aPropos ?? { description: "", topics: [] };
    docsViewState.aProposSaisie = { description: aPropos.description, topics: [...aPropos.topics], enCours: false };
    docsViewState.aProposEchec = "";
    renderProjectDocumentsContent(root);
  });

  for (const bouton of root.querySelectorAll("[data-fichiers-a-propos-annuler]")) {
    bouton.addEventListener("click", () => {
      docsViewState.aProposSaisie = null;
      docsViewState.aProposEchec = "";
      renderProjectDocumentsContent(root);
    });
  }

  // Le brouillon se garde à la frappe : un rendu ne doit pas effacer ce qu'on
  // est en train d'écrire.
  root.querySelector("[data-fichiers-a-propos-description]")?.addEventListener("input", (event) => {
    if (!docsViewState.aProposSaisie) return;
    docsViewState.aProposSaisie.description = event.target.value;
    const reste = root.querySelector("[data-fichiers-a-propos-description] ~ small");
    if (reste) reste.textContent = `${DESCRIPTION_MAX - event.target.value.length} caractères restants`;
  });

  root.querySelector("[data-fichiers-a-propos-topics]")?.addEventListener("input", (event) => {
    if (!docsViewState.aProposSaisie) return;
    // La saisie garde ce qui est tapé — virgules comprises —, la normalisation
    // vient à l'enregistrement : couper « incendie » en « incendi » à la
    // troisième lettre rendrait le champ inutilisable.
    docsViewState.aProposSaisie.brut = event.target.value;
  });

  root.querySelector("[data-fichiers-a-propos-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saisie = docsViewState.aProposSaisie;
    if (!saisie || saisie.enCours) return;

    const projet = String(store.currentProject?.backendProjectId || store.currentProjectId || "").trim();
    if (!projet) {
      docsViewState.aProposEchec = "Aucun projet ouvert.";
      renderProjectDocumentsContent(root);
      return;
    }

    saisie.enCours = true;
    docsViewState.aProposEchec = "";
    renderProjectDocumentsContent(root);

    try {
      docsViewState.aPropos = await ecrireAPropos(projet, {
        description: descriptionDeLaSaisie(saisie.description),
        topics: topicsDeLaSaisie(saisie.brut ?? saisie.topics)
      });
      docsViewState.aProposSaisie = null;
    } catch (erreur) {
      // La saisie reste : une écriture perdue en silence ne se refait pas.
      docsViewState.aProposSaisie = { ...saisie, enCours: false };
      docsViewState.aProposEchec = erreur?.message || "La présentation n'a pas pu être enregistrée.";
    }

    renderProjectDocumentsContent(root);
  });

  // Le menu « Ajouter un fichier » : un déroulant, pas une navigation.
  const ajout = root.querySelector("[data-fichiers-ajout]");
  if (ajout) {
    ajout.addEventListener("click", (event) => {
      event.stopPropagation();
      docsViewState.ajoutOuvert = !docsViewState.ajoutOuvert;
      renderProjectDocumentsContent(root);
    });
    // Un menu qui reste ouvert quand on regarde ailleurs finit par gêner.
    document.addEventListener("click", () => {
      if (!docsViewState.ajoutOuvert) return;
      docsViewState.ajoutOuvert = false;
      renderProjectDocumentsContent(root);
    }, { once: true });
  }

  root.querySelector("[data-fichiers-deposer]")?.addEventListener("click", (event) => {
    event.stopPropagation();
    docsViewState.ajoutOuvert = false;
    docsViewState.mode = "upload";
    renderProjectDocuments(root);
  });

  // Chercher depuis l'accueil entre dans la branche qui sait afficher des
  // résultats. La recherche porte sur les deux matières : les lignes de la
  // mémoire et le nom des pièces déposées.
  const chercherDepuisLaRacine = root.querySelector("[data-fichiers-query]");
  if (chercherDepuisLaRacine) {
    const chercherApresLaFrappe = quandLaFrappeSArrete(() => {
      renderProjectDocumentsContent(root);
      const champ = root.querySelector("[data-memoire-query]");
      champ?.focus();
      champ?.setSelectionRange(champ.value.length, champ.value.length);
    });

    chercherDepuisLaRacine.addEventListener("input", (event) => {
      docsViewState.memoireQuery = event.target.value;
      docsViewState.branche = BRANCHE.MEMOIRE;
      docsViewState.memoireChemin = [];
      chercherApresLaFrappe();
    });
    chercherDepuisLaRacine.addEventListener("keydown", (event) => {
      if (event.key === "Enter") chercherApresLaFrappe.maintenant();
    });
  }

  // Une seule poignée pour tout l'onglet : l'arbre est le même des deux côtés.
  bindSideResizer({
    handle: document.getElementById("fichiersTreeResize"),
    guide: document.getElementById("fichiersTreeResizeGuide"),
    getWidth: () => Number(docsViewState.treeWidth || 280),
    onResize: (largeur) => {
      docsViewState.treeWidth = largeur;
      const arbre = root.querySelector(".memoire-tree");
      arbre?.style.setProperty("--memoire-tree-width", `${largeur}px`);
      arbre?.style.setProperty("--documents-tree-width", `${largeur}px`);
      root.querySelector(".memoire-layout")?.style.setProperty("--memoire-tree-width", `${largeur}px`);
      document.getElementById("projectDocumentScroll")?.style.setProperty("--documents-tree-width", `${largeur}px`);
    },
    onEnd: (largeur) => {
      docsViewState.treeWidth = largeur;
      renderProjectDocumentsContent(root);
    }
  });

  root.querySelector("[data-memoire-replier]")?.addEventListener("click", async () => {
    docsViewState.documentTreeOpen = !docsViewState.documentTreeOpen;
    if (docsViewState.documentTreeOpen) {
      // L'arbre des Documents se lit à l'ouverture : il n'a pas de raison
      // d'être à jour tant qu'on ne le regarde pas.
      const projet = String(store.currentProject?.backendProjectId || store.currentProject?.id || store.currentProjectId || "");
      docsViewState.moveModal.folders = await listDocumentFolders(projet);
    }
    renderProjectDocumentsContent(root);
  });

  for (const bouton of root.querySelectorAll("[data-memoire-lecture]")) {
    bouton.addEventListener("click", () => {
      const voulue = bouton.getAttribute("data-memoire-lecture");
      // Une lecture inconnue retombe sur le code : c'est celle qui ne demande
      // rien d'autre que le fichier.
      docsViewState.memoireLecture = [LECTURE.BLAME, LECTURE.EMPLOIS].includes(voulue) ? voulue : LECTURE.CODE;
      renderProjectDocumentsContent(root);
    });
  }

  // Le pliage ne repasse pas par un rendu : replier cent blocs redessinerait
  // cinq cents lignes pour en cacher quatre cents, et la page sauterait.
  for (const bouton of root.querySelectorAll("[data-memoire-plier-bloc]")) {
    bouton.addEventListener("click", () => {
      const cle = bouton.getAttribute("data-memoire-plier-bloc") || "";
      const plies = docsViewState.memoirePlies ?? new Set();
      const replie = !plies.has(cle);
      if (replie) plies.add(cle);
      else plies.delete(cle);
      docsViewState.memoirePlies = plies;

      // Le pliage est récursif : une ligne se cache si **l'un de ses ancêtres**
      // est replié. Sans cela, replier une zone ne cachait que les têtes de ses
      // blocs et laissait leurs détails orphelins à l'écran.
      //
      // Son accolade fermante reste : un bloc replié garde ses deux bornes.
      for (const ligne of root.querySelectorAll("[data-memoire-ancetres]")) {
        const ancetres = (ligne.getAttribute("data-memoire-ancetres") || "").split(" ").filter(Boolean);
        const ferme = ligne.getAttribute("data-memoire-ferme") || "";
        ligne.hidden = ancetres.some((ancetre) => ancetre !== ferme && plies.has(ancetre));
      }
      // La tête porte la marque du repli : l'icône dit qu'il y a du texte là.
      bouton.closest(".memoire-ligne")?.classList.toggle("memoire-ligne--plie", replie);
      bouton.setAttribute("aria-expanded", replie ? "false" : "true");
      bouton.setAttribute("aria-label", replie ? "Déplier ce bloc" : "Replier ce bloc");
      bouton.innerHTML = svgIcon(replie ? "chevron-right" : "chevron-down", { className: "octicon" });
    });
  }

  // Un seul composant pour tous les boutons de copie de l'onglet : le chemin du
  // fil d'Ariane, et le fichier de mémoire entier. Le texte du second ne voyage
  // pas dans un attribut — trois cents lignes n'ont rien à faire dans du HTML.
  // Le retour en haut, par délégation : la barre se redessine à chaque
  // navigation, et un écouteur posé sur le bouton partirait avec lui.
  brancherLeBoutonHaut(root);

  brancherLesBoutonsCopier(root, {
    texteDe: (cible) => {
      if (!cible.startsWith("fichier:")) return "";
      const memoire = preparerLaMemoire(docsViewState.memoireAssertions ?? []);
      const fichier = fichierDuChemin(memoire, cible.slice("fichier:".length).split("/").filter(Boolean));
      return fichier ? fichierEnClair(fichier, { enClair, ouEcrit: memoire?.ouEcrit ?? null }) : "";
    }
  });

  for (const bouton of root.querySelectorAll("[data-memoire-proposition]")) {
    bouton.addEventListener("click", () => {
      store.pendingPropositionId = bouton.getAttribute("data-memoire-proposition");
      const projet = String(store.currentProjectId || "").trim();
      if (projet) window.location.hash = `#project/${projet}/propositions`;
    });
  }
}

/** Ce qu'on ne sait pas d'un auteur. Le dire vaut mieux que le deviner. */
const AUTEUR_INCONNU = "auteur inconnu";

/**
 * Un avatar : le portrait de la personne, ou de quoi tenir sa place.
 *
 * Le portrait d'abord — c'est à cela qu'on reconnaît quelqu'un dans une liste.
 * Les initiales quand on n'a que le nom. Une silhouette quand on n'a rien :
 * « auteur inconnu » ne se réduit pas à « AI », deux lettres se lisent comme un
 * nom et l'écran affirmerait quelqu'un là où il ne sait rien.
 */
function avatarDe(nom, { petit = false, url = "" } = {}) {
  const classe = `fichiers-racine__avatar${petit ? " fichiers-racine__avatar--petit" : ""}`;
  const propre = String(nom ?? "").trim();
  const portrait = String(url ?? "").trim();

  if (portrait) {
    return `<img class="${classe}" src="${escapeHtml(portrait)}"
      alt="" aria-hidden="true" loading="lazy" decoding="async">`;
  }

  if (!propre || propre === AUTEUR_INCONNU) {
    return `<span class="${classe}" aria-hidden="true">${svgIcon("person", { className: "octicon" })}</span>`;
  }

  const mots = propre.split(/\s+/).filter(Boolean);
  const initiales = (mots.length === 1 ? mots[0].slice(0, 2) : `${mots[0][0]}${mots[mots.length - 1][0]}`).toUpperCase();
  return `<span class="${classe}" aria-hidden="true">${escapeHtml(initiales)}</span>`;
}

/** Le portrait d'une personne, s'il a pu être lu. */
function portraitDe(identifiant) {
  return String((docsViewState.memoireAvatars ?? new Map()).get(String(identifiant || "").trim()) || "");
}

/** Le nom d'une personne, ou de quoi ne pas mentir sur son absence. */
function nomDeLAuteur(identifiant) {
  const connu = (docsViewState.memoireAuteurs ?? new Map()).get(String(identifiant || "").trim());
  return String(connu || "").trim() || AUTEUR_INCONNU;
}

/** Le nom du créateur du projet. */
function createurDuProjet() {
  return nomDeLAuteur(store.currentProject?.ownerId);
}

/**
 * Qui a mis quelque chose dans ce projet.
 *
 * On compte les **identifiants**, jamais les noms : deux personnes dont on
 * ignore le nom sont deux personnes, et les fondre en une seule — ou pire, les
 * effacer — dirait que le projet n'a pas d'auteur alors qu'il en a deux.
 */
function contributeursDuProjet(assertions = []) {
  const gens = new Map();

  const proprietaire = String(store.currentProject?.ownerId || "").trim();
  if (proprietaire) gens.set(proprietaire, { nom: nomDeLAuteur(proprietaire), url: portraitDe(proprietaire) });

  for (const assertion of assertions) {
    const qui = String(assertion?.decided_by || "").trim();
    if (qui && !gens.has(qui)) gens.set(qui, { nom: nomDeLAuteur(qui), url: portraitDe(qui) });
  }

  return [...gens.values()];
}

/** La date de dernière modification d'un document, telle que la base la donne. */
function quandDocument(entree) {
  return String(entree?.updated_at || entree?.updatedAt || entree?.created_at || entree?.createdAt || "").trim();
}

/** La plus récente de plusieurs dates. `null` si aucune ne se lit. */
function laPlusRecente(dates = []) {
  let record = null;
  for (const date of dates) {
    const quand = Date.parse(String(date ?? ""));
    if (Number.isFinite(quand) && (record === null || quand > record)) record = quand;
  }
  return record === null ? null : new Date(record).toISOString();
}

/**
 * Les langages du projet : une extension est un langage.
 *
 * `.ref` n'est pas `.ctr` — l'une porte des règles, l'autre ce qu'elles
 * imposent, et chacune a sa forme d'écriture. Un dépôt annonce ses langages
 * pour dire de quoi il est fait ; celui-ci n'a pas de raison de faire autrement.
 */
function langagesDuProjet(memoire) {
  const compte = new Map();
  for (const fichier of memoire.fichiers ?? []) {
    const nom = `.${fichier.extension}`;
    compte.set(nom, (compte.get(nom) ?? 0) + fichier.lignes.length);
  }

  const pieces = Array.isArray(docsViewState.files) ? docsViewState.files : [];
  for (const piece of pieces) {
    const nom = String(piece?.name || piece?.original_filename || "").trim();
    const point = nom.lastIndexOf(".");
    const extension = point > 0 ? nom.slice(point).toLowerCase() : ".sans extension";
    compte.set(extension, (compte.get(extension) ?? 0) + 1);
  }

  const total = [...compte.values()].reduce((somme, valeur) => somme + valeur, 0);
  const part = (combien) => (total ? Math.round((combien / total) * 1000) / 10 : 0);

  const classes = [...compte.entries()]
    .sort((gauche, droite) => droite[1] - gauche[1] || gauche[0].localeCompare(droite[0], "fr"))
    .map(([nom, combien]) => ({ nom, combien, part: part(combien) }));

  // Quatre langages nommés, le reste sous « Autre ». Une légende de quinze
  // entrées ne se lit pas, et les queues de distribution n'apprennent rien :
  // ce qu'on veut savoir, c'est de quoi le projet est majoritairement fait.
  const NOMMES = 4;
  const tetes = classes.slice(0, NOMMES);
  const queue = classes.slice(NOMMES);
  const reste = queue.reduce((somme, langage) => somme + langage.combien, 0);

  return {
    total,
    combien: classes.length,
    langages: reste
      ? [...tetes, { nom: "Autre", combien: reste, part: part(reste), autre: true }]
      : tetes
  };
}

/**
 * La racine de l'onglet Fichiers : les deux matières du projet.
 *
 * Ce que le projet **sait** d'un côté, ce qu'il a **reçu** de l'autre. Ce sont
 * les mêmes sources — celles à partir desquelles il se reconstruit — et c'est
 * pour cela qu'elles vivent au même endroit.
 *
 * L'écran se lit comme la page d'accueil d'un dépôt, et c'est voulu : le geste
 * qu'on vient y faire est le même — voir de quoi le projet est fait, entrer
 * quelque part, y déposer une pièce. Deux lignes qui menaient chacune à un
 * écran de facture différente donnaient l'impression de deux applications.
 */
function renderRacineDesFichiers() {
  const memoire = preparerLaMemoire(docsViewState.memoireAssertions ?? []);
  const assertions = docsViewState.memoireAssertions ?? [];
  const { versements, plusRecent } = versementsDeLaMemoire(assertions);

  const dossiers = Array.isArray(docsViewState.folders) ? docsViewState.folders : [];
  const pieces = Array.isArray(docsViewState.files) ? docsViewState.files : [];
  const quandDocuments = laPlusRecente([...dossiers, ...pieces].map(quandDocument));

  // Le même nom que l'en-tête, et pour la même raison : deux façons de nommer
  // un projet finissent par le nommer différemment sur deux écrans.
  const nomDuProjet = String(store.currentProject?.name || store.currentProject?.title || "").trim();
  const identifiant = String(store.currentProjectId || "").trim()
    || String(location.hash || "").replace(/^#/, "").split("/")[1] || "";
  const projet = nomDuProjet || (identifiant ? `Projet ${identifiant}` : "Projet");
  const createur = createurDuProjet();
  const { total, combien: combienDeLangages, langages } = langagesDuProjet(memoire);

  const ligne = (branche, nom, phrase, quand) => `
    <button type="button" class="fichiers-racine__ligne" data-fichiers-branche="${escapeHtml(branche)}">
      <span class="fichiers-racine__nom">
        ${svgIcon("file-directory", { className: "octicon" })}
        ${escapeHtml(nom)}
      </span>
      <span class="fichiers-racine__phrase">${escapeHtml(phrase)}</span>
      <span class="fichiers-racine__date">${escapeHtml(quand ? ilYA(quand) : "—")}</span>
    </button>
  `;

  const vus = contributeursDuProjet(assertions);

  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="documents-shell documents-shell--project-page">
        <main class="documents-main">
          <header class="fichiers-racine__tete">
            ${avatarDe(createur, { url: portraitDe(store.currentProject?.ownerId) })}
            <h2 class="fichiers-racine__titre">${escapeHtml(projet)}</h2>
            <span class="fichiers-racine__pastille">Privé</span>
          </header>

          <div class="fichiers-racine__grille">
            <div class="fichiers-racine__principal">
              <div class="fichiers-racine__barre">
                <span class="fichiers-racine__espace"></span>
                <label class="memoire-recherche">
                  ${svgIcon("search", { className: "octicon" })}
                  <input type="search" class="gh-input" data-fichiers-query
                    value="${escapeHtml(docsViewState.memoireQuery ?? "")}" placeholder="Chercher dans le projet">
                </label>
                <div class="fichiers-ajout">
                  <button type="button" class="gh-btn gh-btn--primary fichiers-ajout__bouton" data-fichiers-ajout
                    aria-haspopup="true" aria-expanded="${docsViewState.ajoutOuvert ? "true" : "false"}">
                    Ajouter un fichier
                    ${svgIcon("chevron-down", { className: "octicon" })}
                  </button>
                  <div class="fichiers-ajout__menu" ${docsViewState.ajoutOuvert ? "" : "hidden"}>
                    <span class="fichiers-ajout__item fichiers-ajout__item--muet"
                      title="Écrire du mdall à même l'écran viendra plus tard.">
                      ${svgIcon("plus", { className: "octicon" })}
                      Créer un nouveau fichier
                    </span>
                    <button type="button" class="fichiers-ajout__item" data-fichiers-deposer>
                      ${svgIcon("upload", { className: "octicon" })}
                      Déposer un fichier
                    </button>
                  </div>
                </div>
              </div>

              <div class="fichiers-racine__tableau">
                <div class="fichiers-racine__entete">
                  <span class="fichiers-racine__espace"></span>
                  <span class="fichiers-racine__depuis">${escapeHtml(plusRecent ? ilYA(plusRecent) : "aucun versement")}</span>
                  <span class="fichiers-racine__versements">
                    ${svgIcon("history", { className: "octicon" })}
                    <b>${versements}</b> versement${versements > 1 ? "s" : ""}
                  </span>
                </div>
                ${ligne(BRANCHE.MEMOIRE, MEMOIRE, phraseDeLaRacine(MEMOIRE), plusRecent)}
                ${ligne(BRANCHE.DOCUMENTS, DOCUMENTS, phraseDeLaRacine(DOCUMENTS), quandDocuments)}
              </div>
            </div>

            <aside class="fichiers-racine__meta">
              ${renderAPropos()}

              <section class="fichiers-meta">
                <h3 class="fichiers-meta__titre">Contributeurs <span class="fichiers-meta__compte">${vus.length}</span></h3>
                ${
                  vus.length
                    ? `<ul class="fichiers-meta__gens">${vus
                        .map(({ nom, url }) => `<li>${avatarDe(nom, { petit: true, url })}${escapeHtml(nom)}</li>`)
                        .join("")}</ul>`
                    : `<p class="fichiers-meta__vide">Personne n'a encore rien versé ni rien déposé.</p>`
                }
              </section>

              <section class="fichiers-meta">
                <h3 class="fichiers-meta__titre">Langages <span class="fichiers-meta__compte">${combienDeLangages}</span></h3>
                ${
                  total
                    ? `<div class="fichiers-meta__barre">${langages
                        .map((langage, rang) => `<span class="fichiers-langage--${langage.autre ? "autre" : rang}"
                             style="width:${langage.part}%"
                             title="${escapeHtml(`${langage.nom} — ${langage.combien}`)}"></span>`)
                        .join("")}</div>
                       <ul class="fichiers-meta__langages">${langages
                        .map((langage, rang) => `
                          <li>
                            <span class="fichiers-meta__pastille fichiers-langage--${langage.autre ? "autre" : rang}" aria-hidden="true"></span>
                            <span class="fichiers-meta__langage">${escapeHtml(langage.nom)}</span>
                            <span class="fichiers-meta__part">${escapeHtml(String(langage.part))} %</span>
                          </li>`)
                        .join("")}</ul>`
                    : `<p class="fichiers-meta__vide">Le projet n'a encore aucun fichier.</p>`
                }
              </section>
            </aside>
          </div>
          ${renderSaisieDAPropos()}
        </main>
      </div>
    </section>
  `;
}

/**
 * Ce que le projet dit de lui-même.
 *
 * Une description vide n'est pas un défaut : beaucoup de projets n'en auront
 * jamais. Mais on ne peut pas la deviner, et un encart absent ne dirait pas
 * qu'on peut l'écrire — d'où l'invitation, plutôt que rien.
 */
function renderAPropos() {
  const aPropos = docsViewState.aPropos ?? { description: "", topics: [] };

  return `
    <section class="fichiers-meta">
      <h3 class="fichiers-meta__titre">
        À propos
        <button type="button" class="fichiers-meta__reglage" data-fichiers-a-propos
          aria-label="Modifier la présentation du projet" title="Modifier la présentation du projet">
          ${svgIcon("gear", { className: "octicon" })}
        </button>
      </h3>
      ${
        aPropos.description
          ? `<p class="fichiers-meta__description">${escapeHtml(aPropos.description)}</p>`
          : `<p class="fichiers-meta__vide">Ce projet n'a pas encore dit de quoi il parle.</p>`
      }
      ${
        aPropos.topics.length
          ? `<ul class="fichiers-meta__topics">${aPropos.topics
              .map((topic) => `<li>${escapeHtml(topic)}</li>`)
              .join("")}</ul>`
          : ""
      }
    </section>
  `;
}

/** Le formulaire de la présentation. Il n'existe que pendant qu'on écrit. */
function renderSaisieDAPropos() {
  const saisie = docsViewState.aProposSaisie;
  if (!saisie) return "";

  const restants = DESCRIPTION_MAX - String(saisie.description ?? "").length;

  return `
    <div class="fichiers-saisie" role="dialog" aria-modal="true" aria-label="Présentation du projet">
      <form class="fichiers-saisie__boite" data-fichiers-a-propos-form>
        <header class="fichiers-saisie__tete">
          <b>Présentation du projet</b>
          <button type="button" class="fichiers-saisie__fermer" data-fichiers-a-propos-annuler
            aria-label="Fermer">${svgIcon("x", { className: "octicon" })}</button>
        </header>

        <label class="fichiers-saisie__champ">
          <span>Description</span>
          <textarea class="gh-input" rows="3" maxlength="${DESCRIPTION_MAX}"
            data-fichiers-a-propos-description
            placeholder="De quoi ce projet parle, en une phrase">${escapeHtml(saisie.description ?? "")}</textarea>
          <small class="${restants < 0 ? "fichiers-saisie__trop" : ""}">${restants} caractères restants</small>
        </label>

        <label class="fichiers-saisie__champ">
          <span>Sujets</span>
          <input type="text" class="gh-input" data-fichiers-a-propos-topics
            value="${escapeHtml((saisie.topics ?? []).join(", "))}"
            placeholder="incendie, structure, erp">
          <small>Séparés par des virgules. ${TOPICS_MAX} au plus, en minuscules sans accent.</small>
        </label>

        ${docsViewState.aProposEchec
          ? `<p class="fichiers-saisie__echec">${escapeHtml(docsViewState.aProposEchec)}</p>`
          : ""}

        <footer class="fichiers-saisie__pied">
          <button type="button" class="gh-btn" data-fichiers-a-propos-annuler>Annuler</button>
          <button type="submit" class="gh-btn gh-btn--primary"
            ${saisie.enCours ? "disabled" : ""}>${saisie.enCours ? "Enregistrement…" : "Enregistrer"}</button>
        </footer>
      </form>
    </div>
  `;
}

/**
 * La branche Mémoire : le même navigateur que l'onglet Mémoire portait.
 *
 * Le kebab et « Déplacer » n'y paraissent pas : les chemins des fichiers de
 * mémoire sont **calculés**, et les déplacer serait décider d'un rangement qui
 * n'appartient pas à celui qui lit.
 */
/**
 * Ce qu'on sait de chaque nom, indexé par sa clé.
 *
 * Une seule lecture par rendu : la recalculer pour chaque jeton ferait
 * parcourir tous les fichiers à chaque mot d'un fichier de trois cents lignes.
 */
function contexteDesVariables(memoire) {
  const fichiers = (memoire?.dossiers ?? []).flatMap((dossier) => dossier.fichiers ?? []);
  const variables = variablesDeLaMemoire(fichiers, (fichier) => lignesAffichables(fichier, { ouEcrit: memoire?.ouEcrit ?? null }));
  return new Map(variables.map((variable) => [cleDuSujet(variable.nom), variable]));
}

function renderBrancheMemoire() {
  const memoire = preparerLaMemoire(docsViewState.memoireAssertions ?? []);
  const chemin = docsViewState.memoireChemin ?? [];
  const racine = chemin.length === 0;
  // Un seul état de repli : deux — un par matière — laissaient la barre ouverte
  // d'un côté et fermée de l'autre pour un seul et même panneau.
  const ouverte = docsViewState.documentTreeOpen !== false;
  const largeur = ouverte ? Math.max(220, Math.min(520, Number(docsViewState.treeWidth) || 280)) : 48;

  const contexte = {
    auteurs: docsViewState.memoireAuteurs ?? new Map(),
    avatars: docsViewState.memoireAvatars ?? new Map(),
    propositions: docsViewState.memoirePropositions ?? new Map(),
    // Ce que la mémoire **entière** déclare : un renvoi se cherche dans tout le
    // projet, pas dans le seul fichier qu'on regarde — une règle incendie
    // s'appuie sur une donnée de base, qui vit ailleurs.
    declares: sujetsDeclares(docsViewState.memoireAssertions ?? []),
    // Et ce qu'on sait de chaque nom, pour le dire au survol : entre deux noms
    // voisins on se trompe vite, et se tromper ne se voit pas.
    variables: contexteDesVariables(memoire),
    // Où chaque valeur est écrite : c'est ce qui permet à une règle de dire
    // d'où viennent ses entrées et où va son résultat, sans le deviner.
    ouEcrit: memoire.ouEcrit ?? null,
    // Les noms qu'un versement a voulu écrire ailleurs que chez eux. Règle 10,
    // temps 3 : ils ont rejoint leur domicile, et le fichier le dit.
    conflits: memoire.conflits ?? [],
    // Et ce qu'un versement plus récent a refait : le fichier n'en montre que
    // la dernière valeur, et le dire évite de la relire pour celle d'hier.
    corrections: memoire.corrections ?? [],
    // Et les exceptions qui répètent le général : un piège qui se referme le
    // jour où la valeur générale change.
    inutiles: memoire.inutiles ?? []
  };

  // Un fichier se cherche **avant** de conclure qu'on est dans un dossier : la
  // racine de la Mémoire en porte un, `variables-du-projet.ref`, dont l'adresse
  // tient en un seul morceau. Exiger deux morceaux pour reconnaître un fichier
  // faisait lire son nom comme celui d'un dossier — on entrait dedans et l'on
  // tombait sur la liste des fichiers d'un dossier qui n'existe pas.
  const fichier = fichierDuChemin(memoire, chemin);

  // La recherche traverse les dossiers : c'est le geste qu'on fait quand on ne
  // sait pas où c'est rangé, et un navigateur qui refuserait de chercher
  // obligerait à ouvrir cinq dossiers pour trouver une ligne.
  const query = String(docsViewState.memoireQuery ?? "").trim();

  const vue = query
    ? renderRecherche(memoire, query, { pieces: getProjectDocuments() })
    : racine
    ? renderDossiers(memoire, contexte)
    : fichier
      ? renderFichier(fichier, {
          lecture: [LECTURE.BLAME, LECTURE.EMPLOIS].includes(docsViewState.memoireLecture)
            ? docsViewState.memoireLecture : LECTURE.CODE,
          plies: docsViewState.memoirePlies ?? new Set(),
          recherche: docsViewState.memoireCherche,
          ...emploisDeLaMemoire(),
          ...contexte
        })
      : chemin.length === 1
        ? renderFichiers(memoire, chemin[0], contexte)
        : `<div class="propositions-empty"><b>Ce fichier n'existe plus</b>
             <p>Rien ne s'y range aujourd'hui. Il réapparaîtra dès qu'une proposition y versera une ligne.</p></div>`;

  // Toute largeur dès qu'on est entré dans une racine, et l'arbre entier avec.
  // Un deuxième écran plus étroit, sans arbre, obligeait à revenir en arrière
  // pour changer de dossier — et cachait l'autre moitié du projet.
  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="documents-shell documents-shell--project-page">
        <main class="documents-main">
          <div class="memoire-layout${ouverte ? "" : " memoire-layout--replie"} memoire-layout--pleine"
               style="--memoire-tree-width:${largeur}px">
            ${renderArbreDesFichiers({ memoire, ouverte, query: docsViewState.memoireQuery ?? "" })}
            <div class="memoire-corps">
              ${renderTeteDuContenu({
                replie: !ouverte,
                fil: renderFilDAriane({ chemin }),
                droite: `
                  ${ouverte ? "" : renderRechercheDuProjet(docsViewState.memoireQuery ?? "")}
                  ${racine ? renderTelechargerLaMemoire() : ""}
                `
              })}
              ${vue}
            </div>
          </div>
        </main>
      </div>
    </section>
  `;
}

/**
 * L'arbre des Fichiers : deux racines, et tout ce qu'elles portent.
 *
 * Il n'y en a qu'un, et il montre les deux matières quelle que soit celle qu'on
 * parcourt. Deux arbres séparés cachaient chacun la moitié du projet : on
 * entrait dans la Mémoire et les Documents disparaissaient, sans même un chemin
 * pour y revenir.
 *
 * Les racines se plient comme des dossiers, mais leur libellé **navigue** : on
 * n'entre pas dans « Mémoire » en la dépliant, on y entre en la choisissant.
 */
function renderArbreDesFichiers({ memoire, ouverte = true, query = "" } = {}) {
  const repliees = docsViewState.racinesRepliees ?? new Set();
  const chemin = docsViewState.memoireChemin ?? [];

  const racine = (branche, nom, actif, enfants) => {
    const ouvert = !repliees.has(branche);
    return [
      {
        aller: `branche:${branche}`,
        plier: `branche:${branche}`,
        libelle: nom,
        profondeur: 0,
        genre: "dossier",
        ouvrable: enfants.length > 0,
        ouvert,
        actif
      },
      ...(ouvert ? enfants : [])
    ];
  };

  const noeuds = [
    ...racine(BRANCHE.MEMOIRE, MEMOIRE,
      docsViewState.branche === BRANCHE.MEMOIRE && chemin.length === 0,
      noeudsDeLaMemoire(memoire, {
        chemin: docsViewState.branche === BRANCHE.MEMOIRE ? chemin : [],
        replies: docsViewState.memoireReplies ?? new Set(),
        profondeur: 1
      })),
    ...racine(BRANCHE.DOCUMENTS, DOCUMENTS,
      // La racine ne s'allume que si rien de plus précis ne l'est : un dossier
      // ouvert, ou une pièce en lecture. Sans quoi deux nœuds paraissaient
      // actifs — celui qu'on regarde, et la racine qui le contient.
      docsViewState.branche === BRANCHE.DOCUMENTS
        && !docsViewState.currentFolderId
        && !String(store.projectDocuments?.activeDocumentId || "").trim(),
      noeudsDesDocuments({ profondeur: 1 }))
  ];

  return renderPanneauDArbre(noeuds.map(renderLigneDArbre).join(""), {
    ouverte,
    query,
    largeur: docsViewState.treeWidth
  });
}

function renderDocumentsListView() {
  const folders = Array.isArray(docsViewState.folders) ? docsViewState.folders : [];
  const documents = Array.isArray(docsViewState.files) ? docsViewState.files : [];
  const hasDocuments = folders.length + documents.length > 0;
  const bodyHtml = [...folders.map(renderRepoFolderRow), ...documents.map(renderRepoDocumentRow)].join("");

  const isRoot = !docsViewState.currentFolderId;
  // L'arbre est là dès la racine des Documents : on doit pouvoir passer d'une
  // matière à l'autre sans revenir en arrière.
  const treeHtml = renderArbreDesFichiers({
    memoire: preparerLaMemoire(docsViewState.memoireAssertions ?? []),
    ouverte: docsViewState.documentTreeOpen !== false,
    query: docsViewState.memoireQuery ?? ""
  });
  const topBar = renderDocumentsTopBar();
  const moveModalHtml = docsViewState.moveModal?.isOpen ? renderMoveFileModal() : "";
  const emptyTitle = isRoot ? "La racine est vide." : "Ce dossier est vide.";
  const emptyDescription = isRoot
    ? "Ajoutez un dossier ou importez un document pour commencer."
    : "Ajoutez un sous-dossier ou importez un document dans ce dossier.";
  return `
    <section class="project-simple-page project-simple-page--documents">
      <div class="documents-shell documents-shell--project-page documents-layout" id="projectDocumentScroll" style="--documents-tree-width:${docsViewState.documentTreeOpen ? Math.max(220, Math.min(520, Number(docsViewState.treeWidth || 280))) : 0}px">
          ${treeHtml}
          <main class="documents-main">
            ${topBar}
            ${renderDocumentsActivityBanner()}
            ${renderDataTableShell({
              className: "documents-repo data-table-shell--document-scroll",
              gridTemplate: getDocumentsTableGridTemplate(),
              headHtml: renderDocumentsTableHeadHtml(),
              bodyHtml,
              state: hasDocuments ? "ready" : "empty",
              emptyHtml: renderDataTableEmptyState({
                title: emptyTitle,
                description: emptyDescription
              })
            })}
          </main>
        </div>
        ${moveModalHtml}
    </section>
  `;
}

/**
 * Les lignes des Documents dans l'arbre des Fichiers.
 *
 * Des lignes, pas un panneau : l'arbre a deux racines et il n'y en a qu'un.
 * La racine « Documents » est posée par l'appelant, avec celle de la Mémoire.
 */
function noeudsDesDocuments({ profondeur = 1 } = {}) {
  const dossiers = Array.isArray(docsViewState.moveModal?.folders) && docsViewState.moveModal.folders.length
    ? docsViewState.moveModal.folders
    : (Array.isArray(docsViewState.folders) ? docsViewState.folders : []);

  const parParent = new Map();
  for (const dossier of dossiers) {
    const parent = String(dossier.parent_folder_id || "");
    if (!parParent.has(parent)) parParent.set(parent, []);
    parParent.get(parent).push(dossier);
  }
  for (const enfants of parParent.values()) {
    enfants.sort((gauche, droite) => String(gauche.name || "").localeCompare(String(droite.name || ""), "fr"));
  }

  const piecesParDossier = new Map();
  for (const piece of Array.isArray(getProjectDocuments()) ? getProjectDocuments() : []) {
    const parent = String(piece?.folder_id || "");
    if (!piecesParDossier.has(parent)) piecesParDossier.set(parent, []);
    piecesParDossier.get(parent).push(piece);
  }

  const deplies = new Set(Array.isArray(docsViewState.treeExpandedFolderIds) ? docsViewState.treeExpandedFolderIds : []);
  // La pièce ouverte ne compte que si l'on est dans les Documents : sinon un
  // PDF regardé tout à l'heure restait en surbrillance pendant qu'on lisait un
  // fichier de mémoire, et deux nœuds paraissaient actifs à la fois.
  const dansLesDocuments = docsViewState.branche === BRANCHE.DOCUMENTS;
  const documentOuvert = dansLesDocuments ? String(store.projectDocuments?.activeDocumentId || "").trim() : "";

  const parcourir = (parent, niveau) => {
    const noeuds = [];

    for (const dossier of parParent.get(parent) ?? []) {
      const id = String(dossier.id || "");
      const enfants = parParent.get(id) ?? [];
      const pieces = piecesParDossier.get(id) ?? [];
      const ouvert = deplies.has(id);

      noeuds.push({
        aller: `documents:${id}`,
        libelle: String(dossier.name || "Dossier"),
        profondeur: niveau,
        genre: "dossier",
        ouvrable: enfants.length > 0 || pieces.length > 0,
        ouvert,
        actif: dansLesDocuments && String(docsViewState.currentFolderId || "") === id,
        compte: pieces.length || ""
      });

      if (!ouvert) continue;

      noeuds.push(...parcourir(id, niveau + 1));
      for (const piece of pieces) {
        noeuds.push({
          aller: `document:${String(piece?.id || "")}`,
          libelle: String(piece?.name || piece?.original_filename || piece?.filename || "Fichier"),
          profondeur: niveau + 1,
          genre: "fichier",
          actif: documentOuvert === String(piece?.id || "")
        });
      }
    }

    return noeuds;
  };

  // Les pièces déposées à la racine des Documents s'y voient aussi : rangées
  // nulle part, elles disparaissaient de l'arbre.
  const noeuds = parcourir("", profondeur);
  for (const piece of piecesParDossier.get("") ?? []) {
    noeuds.push({
      aller: `document:${String(piece?.id || "")}`,
      libelle: String(piece?.name || piece?.original_filename || piece?.filename || "Fichier"),
      profondeur,
      genre: "fichier",
      actif: documentOuvert === String(piece?.id || "")
    });
  }

  return noeuds;
}

function renderMoveFolderOption(folder, depth = 0) {
  const indent = Math.min(depth, 6) * 16;
  const folderId = String(folder.id || "");
  const selected = String(docsViewState.moveModal?.targetFolderId || "") === folderId;
  return `<button type="button" class="documents-move-modal__target${selected ? " is-active" : ""}" data-move-target-folder-id="${escapeHtml(folderId)}" style="padding-left:${indent + 12}px">${getFolderClosedIconSvg()} ${escapeHtml(folder.name || "Dossier")}</button>`;
}

function renderMoveFileModal() {
  const folders = Array.isArray(docsViewState.moveModal?.folders) ? docsViewState.moveModal.folders : [];
  const folderMap = new Map(folders.map((f) => [String(f.id || ""), f]));
  const byParent = new Map();
  folders.forEach((folder) => {
    const parentKey = String(folder.parent_folder_id || "");
    if (!byParent.has(parentKey)) byParent.set(parentKey, []);
    byParent.get(parentKey).push(folder);
  });
  byParent.forEach((items) => items.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "fr")));
  const flatten = (parentKey = "", depth = 0) => {
    const items = byParent.get(parentKey) || [];
    return items.flatMap((item) => [renderMoveFolderOption(item, depth), ...flatten(String(item.id || ""), depth + 1)]);
  };
  const sourceFolder = docsViewState.moveModal?.sourceFolderId ? folderMap.get(String(docsViewState.moveModal.sourceFolderId || "")) : null;
  const sourceLabel = sourceFolder ? String(sourceFolder.name || "Dossier") : "Racine / Documents";
  const rootSelected = docsViewState.moveModal?.targetFolderId == null;
  return `
    <div class="documents-move-modal__backdrop" id="documentsMoveModalBackdrop">
      <div class="documents-move-modal" role="dialog" aria-modal="true" aria-label="Déplacer le fichier">
        <header class="documents-move-modal__header"><h3>Déplacer le fichier</h3><button type="button" class="gh-btn" id="documentsMoveModalCloseBtn">Fermer</button></header>
        <div class="documents-move-modal__current">Dossier actuel : <strong>${escapeHtml(sourceLabel)}</strong></div>
        <div class="documents-move-modal__targets">
          <button type="button" class="documents-move-modal__target${rootSelected ? " is-active" : ""}" data-move-target-folder-id="">${getFolderOpenIconSvg()} <span class="documents-tree__label">Racine / Documents</span></button>
          ${flatten("").join("")}
        </div>
        <footer class="documents-move-modal__actions"><button type="button" class="gh-btn gh-btn--validate" id="documentsMoveModalConfirmBtn">Déplacer ici</button></footer>
      </div>
    </div>
  `;
}

function renderUploadProgress() {
  const files = docsViewState.selectedFiles;
  if (files.length === 0) return "";

  if (docsViewState.isUploading) {
    const { done = 0, total = files.length, name = "" } = docsViewState.uploadProgress || {};
    return `
      <div class="documents-upload-progress">
        <div class="documents-upload-progress__file">
          <span class="documents-upload-progress__icon">${getLargeDocumentIconSvg()}</span>
          <span class="documents-upload-progress__name">${escapeHtml(name || "Dépôt en cours")}</span>
        </div>
        <div class="documents-upload-progress__meta">
          Dépôt ${done}/${total}…
        </div>
        ${renderUploadProgressBar({ progressPercent: total ? Math.round((done / total) * 100) : 0 })}
      </div>
    `;
  }

  // Un fichier par ligne, chacun retirable : sur un lot de dix-sept, se tromper
  // d'un fichier ne doit pas obliger à tout recommencer.
  return files
    .map(
      (file, index) => `
        <div class="documents-uploaded-file">
          <div class="documents-uploaded-file__left">
            <span class="documents-uploaded-file__icon">${getLargeDocumentIconSvg()}</span>
            <span class="documents-uploaded-file__name">${escapeHtml(file.name)}</span>
          </div>
          <button
            type="button"
            class="documents-uploaded-file__remove"
            data-documents-remove-file="${index}"
            aria-label="Retirer ${escapeHtml(file.name)}"
            title="Retirer le fichier"
          >
            ${getRemoveIconSvg()}
          </button>
        </div>
      `
    )
    .join("");
}

function canSubmitUpload() {
  return docsViewState.selectedFiles.length > 0 && !docsViewState.isUploading;
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
              <input id="documentsFileInput" type="file" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip,image/*">
              <div class="documents-dropzone__inner">
                <div class="documents-dropzone__icon">
                  ${getLargeDocumentIconSvg()}
                </div>
                <h3>Glissez vos fichiers ici pour les ajouter au projet</h3>
                <p>
                  Ou
                  <button type="button" class="documents-dropzone__link" id="documentsChooseBtn" ${isDisabled}>choisissez vos fichiers</button>
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
                <div class="documents-commit-card__title">${
                  docsViewState.selectedFiles.length > 1
                    ? `Déposer ${docsViewState.selectedFiles.length} documents`
                    : "Déposer le document"
                }</div>

                <div class="documents-form-field">
                  ${renderGhInput({
                    id: "documentsTitleInput",
                    value: docsViewState.title,
                    placeholder: "Ex. Note d'hypothèses - version 03",
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

                ${renderDepositMode()}
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

function resetUploadState() {
  docsViewState.selectedFiles = [];
  docsViewState.depositMode = null;
  docsViewState.depositModeTouched = false;
  docsViewState.titleTouched = false;
  docsViewState.inspection = { running: false, exploitable: 0, byFile: null };
  docsViewState.openPropositions = [];
  docsViewState.isUploading = false;
  docsViewState.uploadProgress = null;
  docsViewState.title = "";
  docsViewState.description = "";

  const fileInput = document.getElementById("documentsFileInput");
  if (fileInput) {
    fileInput.value = "";
  }
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
  const documentItem = pieceDesFichiers(documentId);

  // Une pièce introuvable, ou sans rien à lire : on le dit. Un clic sans effet
  // est le pire des retours — il ne distingue pas « ce fichier n'est pas
  // lisible » de « l'application est cassée ».
  if (!documentItem) {
    docsViewState.activity = {
      tone: "warning",
      title: "Ce fichier n'est plus dans la liste",
      message: "Il a peut-être été déplacé ou retiré depuis l'ouverture de l'onglet. Rechargez pour voir l'état réel."
    };
    renderProjectDocumentsContent(root);
    return;
  }
  if (!isPdfDocument(documentItem)) {
    docsViewState.activity = {
      tone: "info",
      title: `« ${String(documentItem.name || "Ce fichier")} » n'est pas un PDF`,
      message: "Le lecteur ne sait afficher que des PDF. Téléchargez la pièce pour l'ouvrir ailleurs."
    };
    renderProjectDocumentsContent(root);
    return;
  }
  if (!canPreviewPdf(documentItem)) {
    docsViewState.activity = {
      tone: "error",
      title: `« ${String(documentItem.name || "Ce fichier")} » n'a rien à lire`,
      message: "Aucun contenu n'est attaché à cette pièce : le dépôt ne s'est pas terminé. Redéposez le fichier."
    };
    renderProjectDocumentsContent(root);
    return;
  }

  docsViewState.activity = null;

  setActiveProjectDocument(documentItem.id);
  docsViewState.mode = "pdf-preview";
  debugProjectScrollPolicy("documents-open-pdf-preview-reset-compact", {
    beforeBodyClass: document.body?.className || "",
    beforeScrollY: Number(window.scrollY || 0)
  });
  resetProjectShellCompactState({ scrollToTop: false });
  requestAnimationFrame(() => {
    if (docsViewState.mode !== "pdf-preview") return;
    resetProjectShellCompactState({ scrollToTop: false });
  });
  debugProjectScrollPolicy("documents-open-pdf-preview-after-reset", {
    afterBodyClass: document.body?.className || "",
    afterScrollY: Number(window.scrollY || 0),
    tabsClass: document.querySelector(".project-tabs")?.className || null
  });
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

/**
 * Ajoute des fichiers à la sélection en cours.
 *
 * Ils s'ajoutent au lieu de se remplacer : on peut choisir cinq fichiers, puis
 * en glisser trois autres. Un même fichier choisi deux fois n'entre qu'une fois
 * — c'est le geste le plus courant quand on hésite.
 */
function addSelectedFiles(root, fileList) {
  const incoming = [...(fileList ?? [])];
  if (incoming.length === 0) return;

  const known = new Set(docsViewState.selectedFiles.map((file) => `${file.name}|${file.size}`));
  for (const file of incoming) {
    const key = `${file.name}|${file.size}`;
    if (known.has(key)) continue;
    known.add(key);
    docsViewState.selectedFiles.push(file);
  }

  // Un titre proposé, jamais imposé. Le nom du premier fichier ne disait rien
  // de ce qu'on dépose ; celui-ci se précisera dès que l'examen aura nommé les
  // documents.
  if (!docsViewState.titleTouched) {
    docsViewState.title = proposeTitle([], { fallbackCount: docsViewState.selectedFiles.length });
  }

  renderProjectDocuments(root);
  inspectSelection(root);
  loadOpenPropositions(root);
}

/**
 * Les propositions ouvertes du projet, pour pouvoir y ajouter ce lot.
 *
 * Lues une fois par sélection : elles ne changent pas pendant qu'on choisit des
 * fichiers, et les relire à chaque rendu ferait une requête par frappe au clavier.
 */
async function loadOpenPropositions(root) {
  if (docsViewState.openPropositions.length > 0) return;

  try {
    const { listPropositions } = await import("../services/propositions-supabase.js");
    const projectId = await resolveCurrentBackendProjectId().catch(() => "");
    if (!projectId) return;

    const ouvertes = (await listPropositions(projectId, { status: "open" })) ?? [];
    if (ouvertes.length === 0) return;

    docsViewState.openPropositions = ouvertes;
    if (root?.isConnected) renderProjectDocuments(root);
  } catch {
    // Sans propositions joignables, les deux choix ordinaires suffisent.
  }
}

/**
 * Examine les fichiers choisis, en arrière-plan.
 *
 * Il s'agit de savoir si le lot contient au moins un livrable exploitable — un
 * document dont Mdall saura tirer quelque chose —, car c'est ce qui décide du
 * choix proposé par défaut : soumettre à jugement plutôt que déposer tel quel.
 *
 * L'examen ne bloque pas la sélection : les fichiers s'affichent aussitôt, et le
 * défaut se pose quand la lecture aboutit. Faire attendre plusieurs secondes
 * devant une liste vide pour un bouton radio serait payer très cher un détail.
 *
 * Et il ne bouge rien si l'utilisateur a déjà choisi : un contrôle qui se
 * déplace sous la main est pire qu'un mauvais défaut.
 */
async function inspectSelection(root) {
  const files = [...docsViewState.selectedFiles];
  if (files.length === 0) return;

  docsViewState.inspection = { running: true, exploitable: 0, byFile: new Map() };
  renderProjectDocuments(root);

  try {
    const [{ inspectFile }, { isExploitable }] = await Promise.all([
      import("../services/document-intake.js"),
      import("../services/document-recognition.js")
    ]);

    const byFile = new Map();
    let exploitable = 0;
    for (const file of files) {
      const inspection = await inspectFile(file);
      byFile.set(file, inspection);
      if (inspection?.recognition && isExploitable(inspection.recognition)) exploitable += 1;
    }

    // La sélection a pu changer pendant la lecture : ce qu'on vient d'examiner
    // ne décrirait alors plus ce que l'utilisateur a sous les yeux.
    const inchangee =
      docsViewState.selectedFiles.length === files.length &&
      docsViewState.selectedFiles.every((file, index) => file === files[index]);
    if (!inchangee) return;

    docsViewState.inspection = { running: false, exploitable, byFile };
    if (!docsViewState.depositModeTouched) {
      docsViewState.depositMode = exploitable > 0 ? "proposition" : "direct";
    }
    // Maintenant qu'on sait ce que sont les documents, le titre peut le dire :
    // « 3 rapports d'étape et 2 fiches avis travaux — SOCOTEC » plutôt qu'un
    // nom de fichier. Il reste modifiable, et on n'y touche plus si on l'a écrit.
    if (!docsViewState.titleTouched) {
      docsViewState.title = proposeTitle(files.map((file) => byFile.get(file) ?? null).filter(Boolean));
    }
  } catch {
    // Ne pas savoir ce que sont les fichiers n'empêche pas de les déposer : on
    // retombe sur le dépôt direct, et l'utilisateur garde le choix.
    docsViewState.inspection = { running: false, exploitable: 0, byFile: null };
    if (!docsViewState.depositModeTouched) docsViewState.depositMode = "direct";
  }

  if (root?.isConnected) renderProjectDocuments(root);
}

/**
 * Les deux choix du dépôt, à la manière de GitHub.
 *
 * Le troisième n'apparaît que lorsqu'une proposition est ouverte : proposer
 * d'ajouter à quelque chose qui n'existe pas serait offrir une porte sur un mur.
 */
function renderDepositMode() {
  if (docsViewState.selectedFiles.length === 0) return "";

  const mode = docsViewState.depositMode ?? "direct";
  const { running, exploitable } = docsViewState.inspection;

  const choix = (value, icon, label, hint) => `
    <label class="documents-deposit-mode${mode === value ? " is-selected" : ""}">
      <input type="radio" name="documents-deposit-mode" value="${escapeHtml(value)}" ${
        mode === value ? "checked" : ""
      }>
      <span class="documents-deposit-mode__icon">${svgIcon(icon, { className: "octicon" })}</span>
      <span class="documents-deposit-mode__body">
        <span class="documents-deposit-mode__label">${label}</span>
        ${hint ? `<span class="documents-deposit-mode__hint">${hint}</span>` : ""}
      </span>
    </label>
  `;

  const ouvertes = docsViewState.openPropositions
    .map((proposition) =>
      choix(
        proposition.id,
        "git-compare",
        `Ajouter à « ${escapeHtml(proposition.title)} »`,
        "Une proposition ouverte, comme on pousse un commit sur une pull request."
      )
    )
    .join("");

  return `
    <div class="documents-deposit-modes">
      ${choix("direct", "git-commit", "Déposer directement dans le projet", "Les documents entrent aussitôt dans le corpus.")}
      ${choix(
        "proposition",
        "git-compare",
        "Ouvrir une proposition pour ces documents",
        "Ils attendront d'être relus avant d'entrer dans le corpus."
      )}
      ${ouvertes}
      ${
        running
          ? `<p class="documents-deposit-modes__note">Lecture des documents…</p>`
          : exploitable > 0
            ? `<p class="documents-deposit-modes__note">${exploitable} document${
                exploitable > 1 ? "s" : ""
              } dont Mdall saura tirer quelque chose : une proposition est proposée par défaut.</p>`
            : ""
      }
    </div>
  `;
}

/**
 * La ligne locale d'un document qui vient d'être déposé.
 *
 * Le répertoire affiché est relu depuis la base ; ce store-ci sert aux autres
 * écrans, qui n'ont pas de raison d'ignorer un document jusqu'au prochain
 * rechargement.
 */
function buildRepoDocumentFor(file, documentId) {
  const title = docsViewState.title.trim();
  const description = docsViewState.description.trim();
  const enabledPhases = getEnabledProjectPhasesCatalog();
  const currentPhase = enabledPhases.find((item) => item.code === docsViewState.selectedPhase) || null;
  const fileName = file?.name || "Document";
  const mimeType = String(file?.type || "").trim();

  return {
    id: documentId || undefined,
    name: fileName,
    title: docsViewState.selectedFiles.length === 1 ? title || fileName : fileName,
    note: description || title || "Document prêt pour l'analyse",
    updatedAt: "À l'instant",
    phaseCode: currentPhase?.code || docsViewState.selectedPhase || "APS",
    phaseLabel: currentPhase?.label || "",
    fileName,
    mimeType,
    extension: getFileExtension(fileName),
    previewUrl: "",
    localFile: mimeType === "application/pdf" ? file : null
  };
}

/**
 * Dépose les fichiers choisis, pour de bon.
 *
 * C'est le geste qui manquait. Jusqu'ici, `commitDirectDocument` n'écrivait que
 * dans le store local et confiait le véritable téléversement à l'analyse : si
 * l'analyse automatique était désactivée, l'écran annonçait « le dépôt a été
 * enregistré » alors que rien n'était parti. Le fichier disparaissait au
 * rechargement, et personne ne pouvait le savoir.
 *
 * Déposer et analyser sont désormais deux actes distincts. Le dépôt a lieu quoi
 * qu'il arrive ; l'analyse, si elle a lieu, vient après et ne le conditionne
 * plus.
 */
async function commitDeposit(root) {
  const files = [...docsViewState.selectedFiles];
  if (files.length === 0 || docsViewState.isUploading) return;

  docsViewState.isUploading = true;
  docsViewState.uploadProgress = { done: 0, total: files.length, name: files[0]?.name ?? "" };
  renderProjectDocuments(root);

  let results = [];
  try {
    const [{ ensureBackendProject }, { depositBatch, orientationDuDepot, summarizeDeposit, ENTRY }] = await Promise.all([
      import("../services/backend-project.js"),
      import("../services/document-batch.js")
    ]);

    const projectId = await ensureBackendProject();
    results = await depositBatch(files, {
      projectId,
      folderId: docsViewState.currentFolderId || null,
      // L'examen fait à la sélection est réutilisé : relire dix-sept PDF une
      // seconde fois pour écrire les mêmes colonnes serait du temps volé.
      inspections: docsViewState.inspection.byFile,
      onProgress: (progress) => {
        docsViewState.uploadProgress = progress;
        renderProjectDocuments(root);
      }
    });

    const summary = summarizeDeposit(results);

    // Seuls les documents réellement écrits rejoignent une proposition. Y
    // rattacher un doublon ferait basculer en attente un document DÉJÀ dans le
    // corpus : on le retirerait du projet en croyant en ajouter un.
    const entres = results.filter((result) => result.entry === ENTRY.DEPOSITED);

    // Le dépôt a eu lieu quoi qu'il arrive ; ce qui suit ne fait que dire ce
    // qu'on en fait. Une proposition qui échoue laisse donc des documents
    // déposés, et l'écran doit le dire plutôt que de laisser croire à une perte.
    const proposition = await submitToProposition(
      projectId,
      entres.map((result) => result.documentId)
    );

    // Les autres écrans n'ont pas à ignorer un document jusqu'au prochain
    // rechargement — mais un document soumis à une proposition n'est pas encore
    // dans le corpus, et le faire figurer ici le montrerait comme s'il l'était.
    if (!proposition || proposition.failed) {
      for (const result of entres) addProjectDocument(buildRepoDocumentFor(result.file, result.documentId));
    }

    // Nommer ce qui n'est pas entré, un par un. Un fichier écarté en silence est
    // un fichier que l'utilisateur croit avoir déposé.
    const ecartes = results
      .filter((result) => result.entry !== ENTRY.DEPOSITED)
      .map((result) => `${result.file?.name ?? "Document"} — ${result.reason ?? ""}`.trim());

    docsViewState.isUploading = false;
    docsViewState.uploadProgress = null;
    resetUploadState();
    docsViewState.mode = "list";

    await loadCurrentDirectory().catch(() => {});

    const suite = proposition?.message ? ` ${proposition.message}` : "";
    // **L'aiguillage se dit ici.** Il se décide au dépôt, par la reconnaissance ;
    // le taire jusqu'à l'ouverture de la proposition laissait croire qu'un dépôt
    // ne faisait rien — c'est exactement ce qu'on reprochait à l'écran.
    const vers = orientationDuDepot(results);
    setDocumentsActivity({
      tone: proposition?.failed ? "warning" : summary.tone,
      title: summary.deposited > 0 ? "Documents déposés" : "Dépôt sans effet",
      message: `${ecartes.length > 0 ? `${summary.message} ${ecartes.join(" · ")}` : summary.message}${
        vers ? ` ${vers}` : ""}${suite}`
    });
    // `setDocumentsActivity` ne fait que poser l'état : sans ce rendu, le bandeau
    // resterait celui du dépôt précédent.
    renderProjectDocuments(root);

  } catch (error) {
    docsViewState.isUploading = false;
    docsViewState.uploadProgress = null;
    renderProjectDocuments(root);
    setDocumentsActivity({
      tone: "error",
      title: "Dépôt impossible",
      message: String(error?.message || error || "Le dépôt n'a pas abouti.")
    });
    renderProjectDocuments(root);
  }
}

/** Le nombre de propositions ouvertes, relu après en avoir créé une. */
async function refreshOpenPropositionCount(projectId) {
  try {
    const { listPropositions } = await import("../services/propositions-supabase.js");
    const ouvertes = await listPropositions(projectId, { status: "open" });
    if (ouvertes !== null) store.projectPropositionsView = { openCount: ouvertes.length };
  } catch {
    // Un compteur qu'on n'a pas su relire reste tel quel : mieux vaut une
    // pastille en retard qu'une pastille inventée.
  }
}

/**
 * Soumet à une proposition les documents qui viennent d'être déposés.
 *
 * Trois issues, selon ce que l'utilisateur a choisi : rien (dépôt direct), une
 * proposition nouvelle, ou une proposition ouverte à laquelle on ajoute — comme
 * on pousse un commit sur une pull request.
 *
 * Ce qui compte ici, c'est ce qui ne se produit pas : **un échec ne perd rien.**
 * Les documents sont déjà en base quand on arrive, et le pire cas laisse un
 * dépôt ordinaire au lieu d'une proposition. L'écran le dit ; il ne prétend
 * jamais qu'une proposition a été ouverte quand elle ne l'a pas été.
 *
 * @returns {Promise<{message: string, failed: boolean}|null>} `null` pour un
 *   dépôt direct — il n'y a alors rien à raconter de plus.
 */
async function submitToProposition(projectId, documentIds = []) {
  const mode = docsViewState.depositMode ?? "direct";
  if (mode === "direct" || documentIds.length === 0) return null;

  try {
    const { attachDocuments, createProposition } = await import("../services/propositions-supabase.js");

    const proposition =
      mode === "proposition"
        ? await createProposition({
            projectId,
            title: docsViewState.title.trim() || `Ajout de ${documentIds.length} documents`,
            description: docsViewState.description
          })
        : docsViewState.openPropositions.find((entry) => entry.id === mode) ?? null;

    if (!proposition?.id) {
      return { failed: true, message: "La proposition n'a pas pu être ouverte : les documents restent déposés." };
    }

    const attached = await attachDocuments(proposition.id, documentIds);
    if (attached === null) {
      return {
        failed: true,
        message: "La proposition a été ouverte, mais les documents n'ont pas pu lui être rattachés."
      };
    }

    // La pastille de l'onglet doit refléter ce qui vient d'être créé, sans
    // attendre qu'on aille voir : un compteur en retard vaut un compteur faux.
    await refreshOpenPropositionCount(projectId);

    return {
      failed: false,
      message: `Ils attendent d'être relus dans « ${proposition.title} ».`
    };
  } catch {
    return { failed: true, message: "La proposition n'a pas pu être ouverte : les documents restent déposés." };
  }
}

/**
 * Ce qui se passe désormais après un dépôt : **rien d'automatique**.
 *
 * ## Ce qui vivait ici, et pourquoi c'est parti
 *
 * `triggerAnalysisAfterDeposit` lançait l'ancienne pipeline d'analyse dès qu'un
 * PDF était déposé hors proposition, si la case « Déclencher l'analyse IA des
 * sujets après le dépôt d'un document » était cochée dans les Paramètres. Elle
 * produisait des sujets **à partir d'un PDF, sans proposition** : elle
 * contournait la règle 1, celle qui veut que rien n'entre directement.
 *
 * Elle avait deux autres défauts qui ne se rattrapent pas : elle ne traitait
 * qu'un seul document du lot, et elle ne regardait pas ce que le document
 * était — le même traitement pour un rapport de bureau de contrôle et pour un
 * compte rendu de chantier.
 *
 * ## Ce qui la remplace
 *
 * L'aiguillage, et il se fait à la lecture d'une proposition :
 *
 *  - un **livrable de bureau de contrôle** part vers les avis ;
 *  - un **compte rendu de chantier** part vers les points à traiter, que la
 *    proposition fait signer un par un avant d'ouvrir quoi que ce soit.
 *
 * Voir `services/proposition-analysis.js` pour la bifurcation, et
 * `services/document-recognizer-cr.js` pour ce qui la décide.
 *
 * `runAnalysis` existe toujours et reste joignable à la main, depuis l'écran
 * d'analyse. Ce qui disparaît est son **déclenchement automatique au dépôt**,
 * pas l'écran : les confondre aurait retiré le seul chemin qui marchait encore.
 */

function handleSubmit(root) {
  if (!canSubmitUpload()) return;
  commitDeposit(root);
  loadCurrentDirectory()
    .then(() => {
      renderProjectDocumentsContent(root);
    })
    .catch((error) => {
      console.error("[documents-upload] refresh-current-directory.failed", {
        error: error instanceof Error ? error.message : String(error || "")
      });
    });
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

  const menu = document.querySelector('[data-action-id="documentsMenu"]');
  if (menu) {
    menu.addEventListener("ghaction:action", (event) => {
      const action = event.detail?.action || "";
      if (action === "add-documents") {
        docsViewState.mode = "upload";
        renderProjectDocuments(root);
        return;
      }
      if (action === "documents-add-folder") { void creerUnDossier(root); return; }
      if (action === "documents-remove") void retirerLeDocument(root);
    });
  }
}

/** Créer un dossier. Le même geste depuis le bouton et depuis le menu. */
async function creerUnDossier(root) {
  const name = String(window.prompt("Nom du dossier ?") || "").trim();
  if (!name) {
    setDocumentsActivity({ tone: "warning", title: "Nom invalide", message: "Le nom du dossier ne peut pas être vide." });
    renderProjectDocumentsContent(root);
    return;
  }
  try {
    console.info("[documents-view] create-folder.submit", { parentFolderId: docsViewState.currentFolderId || null });
    await createDocumentFolder(String(store.currentProject?.backendProjectId || store.currentProject?.id || store.currentProjectId || ""), docsViewState.currentFolderId || null, name);
    await loadCurrentDirectory();
    if (docsViewState.documentTreeOpen) console.info("[documents-tree] refresh-after-mutation", { action: "create-folder" });
    renderProjectDocumentsContent(root);
  } catch (error) {
    setDocumentsActivity({ tone: "error", title: "Création impossible", message: error instanceof Error ? error.message : "Erreur Supabase lors de la création du dossier." });
    renderProjectDocumentsContent(root);
  }
}

/**
 * Retirer un document du corpus.
 *
 * **Rien n'est supprimé, et rien n'est immédiat.** Le geste prépare une
 * proposition ; le fichier reste en base, et il n'en sortira qu'une fois cette
 * proposition signée — après quoi il restera visible et marqué, jamais effacé :
 * un fichier qui existe en base et n'apparaît nulle part est le mensonge qu'on
 * a déjà corrigé une fois.
 *
 * C'est ce qui manquait pour oser déposer : une erreur de dépôt n'avait aucune
 * correction, et la seule issue était de vivre avec.
 */
async function retirerLeDocument(root) {
  const fichier = decorateDocumentWithPhase(getSelectedPdfDocument());
  if (!fichier?.id) return;

  const nom = String(fichier.name || fichier.original_filename || "ce document").trim();
  const motif = window.prompt(
    `Retirer « ${nom} » du corpus du projet ?\n\n`
    + "Une proposition sera préparée. Le fichier ne sera pas effacé, et rien ne se produit "
    + "tant que quelqu'un ne l'a pas signée.\n\nPourquoi le retirer ? (facultatif)",
    ""
  );
  if (motif === null) return;

  try {
    const [{ itemsPourRetirerDesDocuments, descriptionDuRetrait }, { preparerUneProposition },
      { resolveCurrentBackendProjectId }] = await Promise.all([
      import("../services/proposition-defaire.js"),
      import("../services/atelier-proposition.js"),
      import("../services/project-supabase-sync.js")
    ]);

    const projet = await resolveCurrentBackendProjectId().catch(() => "");
    const fiche = { id: fichier.id, original_filename: nom };
    const rendu = await preparerUneProposition({
      projectId: projet,
      titre: `Retirer « ${nom} » du corpus`,
      affirmations: itemsPourRetirerDesDocuments([fiche]),
      description: descriptionDuRetrait([fiche], String(motif || "").trim())
    });

    if (!rendu.ok) {
      setDocumentsActivity({ tone: "warning", title: "Retrait non préparé", message: rendu.raison });
      renderProjectDocumentsContent(root);
      return;
    }

    // On va où la signature se donne, et sur la proposition elle-même.
    store.pendingPropositionId = rendu.proposition.id;
    const projetAffiche = String(store.currentProjectId || "").trim();
    if (projetAffiche) window.location.hash = `#project/${projetAffiche}/propositions`;
  } catch (erreur) {
    setDocumentsActivity({
      tone: "warning",
      title: "Retrait non préparé",
      message: erreur?.message || "La proposition n'a pas pu être ouverte."
    });
    renderProjectDocumentsContent(root);
  }
}

function bindDocumentsView(root) {
  bindDocumentsSplitActions(root);
  bindLaMemoire(root);
  const documentsShell = root.querySelector(".documents-shell");
  if (documentsShell) {
    // En lecture, ce n'est plus la page qui défile mais le document : c'est
    // donc **son** ascenseur qu'on écoute. Branché sur la page, le repli de
    // l'en-tête ne se déclenchait jamais — la page ne bougeait pas d'un pixel.
    const enLecture = docsViewState.mode === "pdf-preview";
    const ascenseurDuPdf = enLecture ? root.querySelector(".documents-report-table__body--pdf") : null;

    bindProjectDocumentChromeCompact({
      scrollEl: ascenseurDuPdf || document,
      chromeEl: documentsShell,
      classHost: document.body,
      bodyClassName: "documents-local-chrome-compact",
      compactThreshold: 8,
      key: enLecture ? "documents-pdf-shell" : "documents-list-shell",
      // L'en-tête quitte la mise en page en se repliant : la colonne doit
      // reprendre la place qu'il laisse, sinon une bande vide reste en bas.
      onCompactChange: () => requestAnimationFrame(mesurerLaHauteurDuContenu)
    });
  }
  // Le même glisser-déposer que le rail de la Mémoire : un seul composant, une
  // seule façon de se tromper. Le code vivait ici en double, à deux endroits de
  // ce fichier.
  bindSideResizer({
    handle: document.getElementById("documentsTreeResizeHandle"),
    guide: document.getElementById("documentsTreeResizeGuide"),
    getWidth: () => Number(docsViewState.treeWidth || 280),
    onResize: (largeur) => {
      docsViewState.treeResizeActive = true;
      docsViewState.treeWidth = largeur;
      document.getElementById("projectDocumentScroll")?.style.setProperty("--documents-tree-width", `${largeur}px`);
    },
    onEnd: (largeur) => {
      docsViewState.treeResizeActive = false;
      docsViewState.treeWidth = largeur;
      renderProjectDocumentsContent(root);
    }
  });
  const addFolderBtn = document.getElementById("documentsAddFolderBtn");
  if (addFolderBtn) addFolderBtn.addEventListener("click", () => { void creerUnDossier(root); });

  document.querySelectorAll("[data-folder-rename-id]").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const folderId = btn.getAttribute("data-folder-rename-id") || "";
      const currentName = btn.getAttribute("data-folder-rename-name") || "";
      const name = String(window.prompt("Nouveau nom du dossier :", currentName) || "").trim();
      if (!name) {
        setDocumentsActivity({ tone: "warning", title: "Nom invalide", message: "Le nom du dossier ne peut pas être vide." });
        renderProjectDocumentsContent(root);
        return;
      }
      try {
        console.info("[documents-view] rename-folder.submit", { folderId });
        await renameDocumentFolder(String(store.currentProject?.backendProjectId || store.currentProject?.id || store.currentProjectId || ""), folderId, name);
        await loadCurrentDirectory();
        if (docsViewState.documentTreeOpen) console.info("[documents-tree] refresh-after-mutation", { action: "rename-folder" });
        renderProjectDocumentsContent(root);
      } catch (error) {
        setDocumentsActivity({ tone: "error", title: "Renommage impossible", message: error instanceof Error ? error.message : "Erreur Supabase lors du renommage du dossier." });
        renderProjectDocumentsContent(root);
      }
    });
  });

  document.querySelectorAll(".js-folder-open-trigger[data-folder-id]").forEach((trigger) => {
    const folderId = trigger.getAttribute("data-folder-id") || "";
    trigger.addEventListener("click", async (event) => {
      event.preventDefault();
      console.info("[documents-view] open-folder", { folderId });
      await loadCurrentDirectory({ forceFolderId: folderId });
      renderProjectDocumentsContent(root);
    });
  });

  document.querySelectorAll("[data-breadcrumb-folder-id]").forEach((crumb) => {
    crumb.addEventListener("click", async () => {
      const folderId = crumb.getAttribute("data-breadcrumb-folder-id") || null;
      console.info("[documents-view] breadcrumb-click", { folderId: folderId || null });
      await loadCurrentDirectory({ forceFolderId: folderId || null });
      renderProjectDocumentsContent(root);
    });
  });

  document.querySelectorAll("[data-document-move-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const fileId = btn.getAttribute("data-document-move-id") || "";
      const file = (Array.isArray(docsViewState.files) ? docsViewState.files : []).find((item) => String(item.id || "") === fileId) || null;
      const projectId = String(store.currentProject?.backendProjectId || store.currentProject?.id || store.currentProjectId || "");
      docsViewState.moveModal = {
        isOpen: true,
        fileId,
        sourceFolderId: file?.folder_id || null,
        targetFolderId: file?.folder_id || null,
        folders: await listDocumentFolders(projectId)
      };
      console.info("[documents-view] move-file.open", { fileId });
      console.info("[documents-files] move-modal.open", { fileId });
      renderProjectDocumentsContent(root);
    });
  });

  const moveCloseBtn = document.getElementById("documentsMoveModalCloseBtn");
  if (moveCloseBtn) {
    moveCloseBtn.addEventListener("click", () => {
      docsViewState.moveModal.isOpen = false;
      renderProjectDocumentsContent(root);
    });
  }
  document.querySelectorAll("[data-move-target-folder-id]").forEach((targetBtn) => {
    targetBtn.addEventListener("click", () => {
      const targetFolderId = targetBtn.getAttribute("data-move-target-folder-id") || null;
      docsViewState.moveModal.targetFolderId = targetFolderId || null;
      console.info("[documents-files] move-modal.select-target", { targetFolderId: targetFolderId || null });
      renderProjectDocumentsContent(root);
    });
  });
  const moveConfirmBtn = document.getElementById("documentsMoveModalConfirmBtn");
  if (moveConfirmBtn) {
    moveConfirmBtn.addEventListener("click", async () => {
      const projectId = String(store.currentProject?.backendProjectId || store.currentProject?.id || store.currentProjectId || "");
      const { fileId, sourceFolderId, targetFolderId } = docsViewState.moveModal;
      if (!fileId) return;
      if ((sourceFolderId || null) === (targetFolderId || null)) {
        setDocumentsActivity({ tone: "info", title: "Déplacement", message: "Le fichier est déjà dans ce dossier." });
        docsViewState.moveModal.isOpen = false;
        renderProjectDocumentsContent(root);
        return;
      }
      console.info("[documents-files] move-modal.confirm", { fileId, targetFolderId: targetFolderId || null });
      try {
        await moveDocumentFile(projectId, fileId, targetFolderId || null);
        console.info("[documents-files] move-modal.success", { fileId, targetFolderId: targetFolderId || null });
        docsViewState.moveModal.isOpen = false;
        await loadCurrentDirectory();
        if (docsViewState.documentTreeOpen) console.info("[documents-tree] refresh-after-mutation", { action: "move-file" });
        renderProjectDocumentsContent(root);
      } catch (error) {
        console.info("[documents-files] move-modal.failure", { fileId, error: error instanceof Error ? error.message : String(error || "") });
        setDocumentsActivity({ tone: "error", title: "Déplacement impossible", message: error instanceof Error ? error.message : "Erreur inconnue." });
        renderProjectDocumentsContent(root);
      }
    });
  }

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

  // Le geste se branche sur **toutes** les pièces, y compris celles qu'on ne
  // saura pas ouvrir. Un titre qui ne réagit pas laisse croire à une panne de
  // l'écran ; l'écran doit dire ce qu'il ne sait pas faire plutôt que de se
  // taire (`docs/fondamentaux.md`, règle 5).
  document.querySelectorAll(".js-document-title-trigger[data-document-id]").forEach((trigger) => {
    const documentId = trigger.getAttribute("data-document-id") || "";

    trigger.addEventListener("click", async (event) => {
      event.preventDefault();
      const piece = pieceDesFichiers(documentId);
      console.info("[documents-view] open-file", { documentId, trouve: Boolean(piece) });
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
      // La liste doit être recopiée avant que le champ ne soit vidé : `files`
      // pointe sur le même objet, et `value = ""` le vide aussi.
      addSelectedFiles(root, event.target.files);
    });
  }

  // Le même branchement que le copilote et le composeur d'un sujet : ces vingt
  // lignes existaient en trois exemplaires, et ne disaient déjà plus tout à
  // fait la même chose — l'une éteignait le cadre au survol d'un enfant.
  brancherLaZoneDeDepot(dropzone, {
    actif: () => !docsViewState.isUploading,
    onFichiers: (fichiers) => addSelectedFiles(root, fichiers)
  });

  for (const button of document.querySelectorAll("[data-documents-remove-file]")) {
    button.addEventListener("click", () => {
      if (docsViewState.isUploading) return;
      const index = Number(button.getAttribute("data-documents-remove-file"));
      if (!Number.isInteger(index)) return;
      docsViewState.selectedFiles.splice(index, 1);
      renderProjectDocuments(root);
    });
  }

  for (const radio of document.querySelectorAll('input[name="documents-deposit-mode"]')) {
    radio.addEventListener("change", () => {
      docsViewState.depositMode = radio.value;
      // Dès qu'on y a touché, l'examen ne déplacera plus le choix.
      docsViewState.depositModeTouched = true;
      renderProjectDocuments(root);
    });
  }

  const titleInput = document.getElementById("documentsTitleInput");
  if (titleInput) {
    titleInput.addEventListener("input", (event) => {
      docsViewState.title = event.target.value;
      docsViewState.titleTouched = true;
    });
  }

  const descriptionInput = document.getElementById("documentsDescriptionInput");
  if (descriptionInput) {
    descriptionInput.addEventListener("input", (event) => {
      docsViewState.description = event.target.value;
    });
  }
}

/**
 * La hauteur du contenu, mesurée depuis sa position réelle.
 *
 * Elle se **re-mesure** quand la chrome se replie : en lecture, l'en-tête du
 * projet disparaît de la mise en page, et une hauteur figée au premier rendu
 * laissait alors une bande vide en bas de l'écran.
 */
function mesurerLaHauteurDuContenu() {
  const contentHost = document.getElementById("project-content");
  if (!contentHost) return;

  const top = contentHost.getBoundingClientRect().top || 0;
  const height = Math.max(320, Math.floor((window.innerHeight || 0) - top - 8));
  contentHost.style.setProperty("--documents-content-height", `${height}px`);
}

function renderProjectDocumentsContent(root) {
  syncDocumentsProjectViewHeader();
  mesurerLaHauteurDuContenu();

  root.innerHTML = docsViewState.mode === "list" && docsViewState.branche === ""
    ? renderRacineDesFichiers()
    : docsViewState.mode === "list" && docsViewState.branche === BRANCHE.MEMOIRE
    ? renderBrancheMemoire()
    : docsViewState.mode === "upload"
    ? renderUploadView()
    : docsViewState.mode === "report-preview"
      ? renderReportPreviewView()
      : docsViewState.mode === "pdf-preview"
        ? renderPdfPreviewView()
        : renderDocumentsListView();

  document.body.classList.toggle("documents-pdf-sticky-mode", docsViewState.mode === "pdf-preview");

  if (docsViewState.mode === "pdf-preview") {
    const projectShellBody = document.querySelector(".project-shell__body");
    const projectShellBodyStyle = projectShellBody ? window.getComputedStyle(projectShellBody) : null;
    const topbar = document.querySelector(".memoire-corps__tete");
    const pdfToolbar = document.querySelector(".documents-report-table__header--pdf-preview");
    const pdfBody = document.querySelector(".documents-report-table__body--pdf");
    const treePanel = document.querySelector(".documents-tree__panel");
    const getNodeStyle = (node) => {
      if (!node) return null;
      const computed = window.getComputedStyle(node);
      return {
        position: computed.position,
        top: computed.top,
        overflow: computed.overflow,
        overflowX: computed.overflowX,
        overflowY: computed.overflowY,
        height: computed.height,
        maxHeight: computed.maxHeight
      };
    };
    const scrollingElement = document.scrollingElement || document.documentElement || document.body || null;
    logPdfPreviewDebug("scroll-policy", {
      bodyClassName: document.body?.className || "",
      windowScrollY: Number(window.scrollY || 0),
      documentScrollingElementScrollTop: Number(scrollingElement?.scrollTop || 0),
      projectShellBodyOverflow: projectShellBodyStyle?.overflow || null,
      projectShellBodyPosition: projectShellBodyStyle?.position || null,
      documentsTopbar: getNodeStyle(topbar),
      documentsPdfToolbar: getNodeStyle(pdfToolbar),
      documentsPdfBody: getNodeStyle(pdfBody),
      documentsTreePanel: getNodeStyle(treePanel)
    });
  }

  bindDocumentsView(root);
}

/**
 * Revenir à l'accueil de l'onglet.
 *
 * Entrer dans l'onglet Fichiers, c'est venir voir de quoi le projet est fait —
 * pas reprendre le dossier qu'on parcourait la dernière fois. Rester au fond
 * d'une arborescence obligeait à remonter le fil à chaque visite, et l'accueil
 * devenait un écran qu'on ne revoyait plus.
 */
function retourALAccueilDesFichiers() {
  docsViewState.branche = "";
  docsViewState.memoireChemin = [];
  docsViewState.memoireQuery = "";
  docsViewState.memoirePlies = new Set();
  docsViewState.ajoutOuvert = false;
  docsViewState.currentFolderId = null;
  docsViewState.breadcrumb = [];
}

let ongletFichiersBranche = false;
/** L'écran monté, pour le redessiner quand on reclique l'onglet. */
let racineMontee = null;

/** Recliquer l'onglet ramène à l'accueil, comme y arriver d'ailleurs. */
function brancherLeRetourALAccueil() {
  if (ongletFichiersBranche) return;
  ongletFichiersBranche = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
    if (String(event?.detail?.tabId || "") !== PROJECT_TAB_IDS.DOCUMENTS) return;
    if (!racineMontee?.isConnected) return;
    retourALAccueilDesFichiers();
    renderProjectDocumentsContent(racineMontee);
  });
}

export function renderProjectDocuments(root) {
  racineMontee = root;
  brancherLeRetourALAccueil();
  retourALAccueilDesFichiers();
  syncDocumentsSelectedPhase();
  if (!Array.isArray(docsViewState.treeExpandedFolderIds) || !docsViewState.treeExpandedFolderIds.length) {
    try {
      const raw = localStorage.getItem(DOCUMENTS_TREE_EXPANDED_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      docsViewState.treeExpandedFolderIds = Array.isArray(parsed) ? parsed.map((item) => String(item || "")).filter(Boolean) : [];
    } catch {
      docsViewState.treeExpandedFolderIds = [];
    }
  }

  root.className = "project-shell__content";
  clearProjectActiveScrollSource();

  debugProjectScrollPolicy("render-project-documents", { mode: docsViewState.mode });
  Promise.all([
    syncProjectDocumentsFromSupabase({ force: true }),
    loadCurrentDirectory(),
    // Les deux matières se chargent ensemble : l'onglet les montre côte à côte,
    // et n'en charger qu'une ferait clignoter la racine.
    chargerLaMemoire()
  ])
    .then(() => {
      if (!root?.isConnected) return;
      renderProjectDocumentsContent(root);
    })
    .catch((error) => {
      console.warn("syncProjectDocumentsFromSupabase failed", error);
    });
}
