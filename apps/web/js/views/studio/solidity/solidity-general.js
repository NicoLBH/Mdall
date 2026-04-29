import { resolveFrenchCommune, fetchFrenchAltitude } from "../../../services/georisques-service.js";
import { getCantonByCommuneCode } from "../../../services/zoning/canton-service.js";
import { getWindRegionsByDepartmentCode } from "../../../services/zoning/wind-regions-service.js";
import { getSnowRegionsByDepartmentCode } from "../../../services/zoning/snow-regions-service.js";
import { getWindZoneByDepartmentAndCanton } from "../../../services/zoning/wind-canton-regions-service.js";
import { getSnowZoneByDepartmentAndCanton } from "../../../services/zoning/snow-canton-regions-service.js";
import { getFrostDepthByDepartmentCode } from "../../../services/zoning/frost-depth-service.js";
import { buildGoogleMapsPlaceEmbedUrl } from "../../../services/google-maps-embed-service.js";
import { readPersistedCurrentProjectState } from "../../../services/project-state-storage.js";
import { store } from "../../../store.js";
import { svgIcon } from "../../../ui/icons.js";
import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";

const solidityGeneralUiState = {
  loading: false,
  error: "",
  detailsExpanded: true,
  selected: null,
  locationSignature: "",
  requestSequence: 0
};

let currentRoot = null;

const COPY_ICON_HTML = svgIcon("copy", { className: "octicon octicon-copy" });
const COPY_SUCCESS_ICON_HTML = svgIcon("check", {
  className: "octicon octicon-check",
  style: "color: var(--success);"
});

function escapeAttribute(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function renderNewSubjectButton() {
  return renderGhActionButton({
    id: "solidityGeneralNewSubjectAction",
    label: "Nouveau sujet",
    tone: "primary",
    size: "md",
    mainAction: ""
  });
}

function renderCopyButton({ value = "", title, ariaLabel }) {
  const valueAttr = value ? ` data-solidity-general-copy-value="${escapeAttribute(value)}"` : "";
  return `
    <button
      type="button"
      class="arkolia-identity-preview__copy"
      ${valueAttr}
      title="${escapeAttribute(title)}"
      aria-label="${escapeAttribute(ariaLabel || title)}"
    >
      ${COPY_ICON_HTML}
    </button>
  `;
}

function resetCopyButtonState(button, defaultTitle) {
  if (!button) return;
  const resetTimerId = Number(button.dataset.solidityGeneralCopyResetTimer || 0);
  if (resetTimerId) {
    window.clearTimeout(resetTimerId);
  }
  button.classList.remove("is-copied");
  button.innerHTML = COPY_ICON_HTML;
  button.removeAttribute("data-solidity-general-copy-reset-timer");
  if (defaultTitle) {
    button.setAttribute("title", defaultTitle);
    button.setAttribute("aria-label", defaultTitle);
  }
}

function showCopyButtonSuccess(button, copiedTitle, defaultTitle) {
  if (!button) return;
  resetCopyButtonState(button, defaultTitle);
  button.classList.add("is-copied");
  button.innerHTML = COPY_SUCCESS_ICON_HTML;
  button.setAttribute("title", copiedTitle);
  button.setAttribute("aria-label", copiedTitle);
  const timerId = window.setTimeout(() => {
    resetCopyButtonState(button, defaultTitle);
  }, 2000);
  button.dataset.solidityGeneralCopyResetTimer = String(timerId);
}

function getEffectiveProjectLocation() {
  const persisted = readPersistedCurrentProjectState();
  const persistedForm = persisted?.projectForm && typeof persisted.projectForm === "object"
    ? persisted.projectForm
    : {};
  const liveForm = store.projectForm && typeof store.projectForm === "object"
    ? store.projectForm
    : {};

  return {
    address: String(liveForm.address || persistedForm.address || "").trim(),
    city: String(liveForm.city || persistedForm.city || "").trim(),
    postalCode: String(liveForm.postalCode || persistedForm.postalCode || "").trim(),
    latitude: Number.isFinite(Number(liveForm.latitude)) ? Number(liveForm.latitude) : Number.isFinite(Number(persistedForm.latitude)) ? Number(persistedForm.latitude) : null,
    longitude: Number.isFinite(Number(liveForm.longitude)) ? Number(liveForm.longitude) : Number.isFinite(Number(persistedForm.longitude)) ? Number(persistedForm.longitude) : null,
    altitude: Number.isFinite(Number(liveForm.altitude)) ? Number(liveForm.altitude) : Number.isFinite(Number(persistedForm.altitude)) ? Number(persistedForm.altitude) : null,
    codeInsee: String(liveForm.codeInsee || persistedForm.codeInsee || "").trim()
  };
}

function getProjectLocationSignature() {
  const location = getEffectiveProjectLocation();
  return [
    String(location.address || "").trim().toLowerCase(),
    String(location.city || "").trim().toLowerCase(),
    String(location.postalCode || "").trim(),
    Number.isFinite(location.latitude) ? Number(location.latitude).toFixed(6) : "",
    Number.isFinite(location.longitude) ? Number(location.longitude).toFixed(6) : "",
    Number.isFinite(location.altitude) ? String(Number(location.altitude)) : "",
    String(location.codeInsee || "").trim()
  ].join("|");
}

async function refreshSolidityGeneralData({ force = false } = {}) {
  if (!currentRoot) return;

  const nextLocationSignature = getProjectLocationSignature();
  if (
    !force
    && !solidityGeneralUiState.loading
    && nextLocationSignature === solidityGeneralUiState.locationSignature
    && (solidityGeneralUiState.selected || solidityGeneralUiState.error)
  ) {
    return;
  }

  const requestId = ++solidityGeneralUiState.requestSequence;
  solidityGeneralUiState.loading = true;
  solidityGeneralUiState.error = "";
  solidityGeneralUiState.selected = null;
  solidityGeneralUiState.locationSignature = nextLocationSignature;
  renderContent();

  try {
    const selection = await buildProjectClimateSelection();
    if (requestId !== solidityGeneralUiState.requestSequence) return;
    solidityGeneralUiState.selected = selection;
    if (!selection) {
      solidityGeneralUiState.error = "Aucune localisation projet complète n'est actuellement disponible dans Paramètres → Localisation.";
    }
  } catch (error) {
    if (requestId !== solidityGeneralUiState.requestSequence) return;
    solidityGeneralUiState.error = error instanceof Error ? error.message : "Impossible de charger les données climatiques du projet.";
  } finally {
    if (requestId !== solidityGeneralUiState.requestSequence) return;
    solidityGeneralUiState.loading = false;
    renderContent();
  }
}

function bindSolidityGeneralLifecycle(root) {
  if (!root || root.dataset.solidityGeneralLifecycleBound === "true") return;
  root.dataset.solidityGeneralLifecycleBound = "true";

  document.addEventListener("projectLocationChanged", () => {
    if (!currentRoot || currentRoot !== root) return;
    refreshSolidityGeneralData({ force: true });
  });
}


function parseFrenchDecimalToNumber(value) {
  const normalized = String(value ?? "").trim().replace(/,/g, ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatMeters(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function normalizeAltitude(value) {
  return Number.isFinite(value) ? `${value} m` : "—";
}

function normalizeCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : "—";
}

function renderGoogleMapsBlock(selected) {
  const latitude = Number(selected?.lat);
  const longitude = Number(selected?.lon);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!hasCoordinates) {
    return `
      <div class="arkolia-map arkolia-map--placeholder${!selected ? " is-empty" : ""}" aria-hidden="true">
        <div class="arkolia-map__placeholder-surface"></div>
        <div class="arkolia-map__placeholder-blur"></div>
      </div>
    `;
  }

  const embedUrl = buildGoogleMapsPlaceEmbedUrl({
    latitude,
    longitude,
    zoom: 16,
    mapType: "satellite"
  });

  if (!embedUrl) {
    return `
      <div class="arkolia-map arkolia-map--placeholder${!selected ? " is-empty" : ""}" aria-hidden="true">
        <div class="arkolia-map__placeholder-surface"></div>
        <div class="arkolia-map__placeholder-blur"></div>
      </div>
    `;
  }

  return `
    <div class="arkolia-map">
      <iframe
        title="Carte Google Maps de la localisation projet"
        src="${escapeHtml(embedUrl)}"
        loading="lazy"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>
  `;
}

function renderCityHeader(selected) {
  if (!selected) {
    return `
      <div class="arkolia-summary-card__header">
        <div class="arkolia-summary-card__title-wrap">
          <div class="arkolia-summary-card__eyebrow">Ville</div>
          <div class="arkolia-summary-card__title is-placeholder">Localisation projet indisponible</div>
        </div>
      </div>
    `;
  }

  const cityTitle = escapeHtml(selected.name || "Ville du projet");
  const alertIcon = selected.hasCantonMismatch
    ? `<span class="arkolia-summary-card__alert" title="Attention : canton actuel différent du canton 2014">${svgIcon("alert", { className: "octicon octicon-alert" })}</span>`
    : "";

  return `
    <div class="arkolia-summary-card__header">
      <div class="arkolia-summary-card__title-wrap">
        <div class="arkolia-summary-card__eyebrow">Ville</div>
        <div class="arkolia-summary-card__title-row">
          <div class="arkolia-summary-card__title">${cityTitle}</div>
          ${alertIcon}
        </div>
      </div>
    </div>
  `;
}

function renderKeyValue(label, value, options = {}) {
  const classes = ["arkolia-summary-card__item"];
  if (options.compact) classes.push("is-compact");
  if (options.muted) classes.push("is-muted");
  return `
    <div class="${classes.join(" ")}">
      <div class="arkolia-summary-card__item-label">${escapeHtml(label)}</div>
      <div class="arkolia-summary-card__item-value">${escapeHtml(value || "—")}</div>
    </div>
  `;
}

function renderSummaryCard(selected) {
  const hasSelection = Boolean(selected);
  const postalCode = hasSelection ? (selected.postalCode || "—") : "—";
  const departmentValue = hasSelection
    ? [selected.departmentCode || "", selected.departmentName || ""].filter(Boolean).join(" — ") || "—"
    : "—";

  const extraRows = hasSelection ? [
    renderKeyValue("Zone de vent", selected.windZone || "—", { compact: true }),
    renderKeyValue("Zone de neige", selected.snowZone || "—", { compact: true }),
    renderKeyValue("Altitude", normalizeAltitude(selected.altitude), { compact: true }),
    renderKeyValue("H0 retenu", selected.frostDepthH0Label || "—", { compact: true, muted: selected.hasMultipleFrostDepthH0Values }),
    renderKeyValue("H calculé", selected.frostDepthHLabel || "—", { compact: true }),
    renderKeyValue("Canton actuel", selected.currentCantonName || "—", { compact: true }),
    renderKeyValue("Canton 2014", selected.cantonName2014 || selected.cantonName || "—", { compact: true, muted: selected.hasCantonMismatch }),
    renderKeyValue("Coordonnées", `${normalizeCoordinate(selected.lat)} / ${normalizeCoordinate(selected.lon)}`, { compact: true }),
    renderKeyValue("Code INSEE", selected.codeInsee || "—", { compact: true })
  ].join("") : "";

  return `
    <div class="settings-seismic-summary-card arkolia-summary-card">
      ${renderCityHeader(selected)}

      <div class="arkolia-summary-card__body">
        <div class="arkolia-summary-card__main-list">
          ${renderKeyValue("Code postal", postalCode)}
          ${renderKeyValue("Département", departmentValue)}
        </div>

        <div class="arkolia-summary-card__divider"></div>

        <div class="arkolia-summary-card__actions">
          <button
            type="button"
            class="arkolia-summary-card__toggle"
            data-solidity-general-toggle-details
            aria-expanded="${solidityGeneralUiState.detailsExpanded ? "true" : "false"}"
          >
            <span>${solidityGeneralUiState.detailsExpanded ? "Afficher moins" : "Afficher +"}</span>
            <span class="arkolia-summary-card__toggle-chevron${solidityGeneralUiState.detailsExpanded ? " is-open" : ""}">${svgIcon("chevron-down")}</span>
          </button>
        </div>

        <div class="arkolia-summary-card__details${solidityGeneralUiState.detailsExpanded ? " is-expanded" : ""}">
          <div class="arkolia-summary-card__details-scroll">
            ${extraRows || '<div class="arkolia-summary-card__empty">Définissez une localisation projet dans Paramètres pour afficher les détails complémentaires.</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function getFrostDepthCalculation(selected) {
  const rawValues = Array.isArray(selected?.frostDepthH0Values) ? selected.frostDepthH0Values : [];
  const h0Numbers = rawValues.map(parseFrenchDecimalToNumber).filter((value) => Number.isFinite(value));
  const h0 = h0Numbers.length ? Math.max(...h0Numbers) : null;
  const altitude = Number(selected?.altitude);
  const h = Number.isFinite(h0) && Number.isFinite(altitude)
    ? h0 + ((altitude - 150) / 4000)
    : null;

  return {
    h0,
    h,
    altitude: Number.isFinite(altitude) ? altitude : null,
    hasMultipleH0Values: h0Numbers.length > 1
  };
}

function getAssiseText(selected) {
  const { h } = getFrostDepthCalculation(selected);
  const hValue = Number.isFinite(h) ? formatMeters(h, 2) : "…";
  return `Pour mémoire, la profondeur de fondation est soumise à 3 conditions de stabilité, la stabilité mécanique (portance et tassement), la stabilité hydrique (retrait / gonflement) et stabilité au gel. La plus défavorable étant à respecter impérativement.\n\nNota: En application du NF DTU 13.1, les fondations devront respecter la cote hors gel mini par rapport au niveau extérieur fini H (en mètres) tel que:\nH > ${hValue} m\n\nNota: Profondeur hors gel et atteinte du bon sol à vérifier à l'ouverture des fouilles.`;
}

function renderAssiseCard(selected) {
  const { hasMultipleH0Values } = getFrostDepthCalculation(selected);
  const alertIcon = hasMultipleH0Values
    ? `<span class="arkolia-identity-preview__alert" title="Attention : deux valeurs de H0 existent pour ce département, la plus élevée a été retenue">${svgIcon("alert", { className: "octicon octicon-alert" })}</span>`
    : "";

  return `
    <div class="arkolia-identity-preview arkolia-assise-card">
      <div class="arkolia-identity-preview__head">
        <div class="arkolia-identity-preview__title-wrap">
          <div class="arkolia-identity-preview__title">Niveau d'assise</div>
          ${alertIcon}
        </div>
        ${renderCopyButton({ value: "assise", title: "Copier le texte du niveau d'assise" })}
      </div>
      <textarea class="gh-textarea arkolia-identity-preview__textarea arkolia-assise-card__textarea" readonly data-solidity-general-assise-output>${escapeHtml(getAssiseText(selected))}</textarea>
    </div>
  `;
}

function renderLoadingState() {
  return `
    <div class="settings-seismic-sizing-layout">
      <div class="settings-seismic-sizing-layout__row settings-seismic-sizing-layout__row--top arkolia-result-layout">
        <div class="settings-seismic-sizing-main">
          <div class="settings-seismic-chart-card arkolia-map-card is-empty">
            <div class="arkolia-map arkolia-map--placeholder" aria-hidden="true">
              <div class="arkolia-map__placeholder-surface"></div>
              <div class="arkolia-map__placeholder-blur"></div>
            </div>
          </div>
        </div>
        <div class="settings-seismic-sizing-side">
          <div class="settings-seismic-summary-card arkolia-summary-card">
            <div class="arkolia-summary-card__header">
              <div class="arkolia-summary-card__title-wrap">
                <div class="arkolia-summary-card__eyebrow">Ville</div>
                <div class="arkolia-summary-card__title is-placeholder">Chargement…</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${renderAssiseCard(null)}
    </div>
  `;
}

function renderErrorState(message) {
  return `
    <div class="settings-seismic-sizing-layout">
      <div class="settings-seismic-sizing-layout__row settings-seismic-sizing-layout__row--top arkolia-result-layout">
        <div class="settings-seismic-sizing-main">
          <div class="settings-seismic-chart-card arkolia-map-card is-empty">
            ${renderGoogleMapsBlock(null)}
          </div>
        </div>
        <div class="settings-seismic-sizing-side">
          <div class="settings-seismic-summary-card arkolia-summary-card">
            ${renderCityHeader(null)}
            <div class="arkolia-summary-card__body">
              <div class="arkolia-summary-card__empty">${escapeHtml(message || "Impossible de charger la localisation projet.")}</div>
            </div>
          </div>
        </div>
      </div>
      ${renderAssiseCard(null)}
    </div>
  `;
}

function renderContent() {
  if (!currentRoot) return;
  const mount = currentRoot.querySelector("[data-solidity-general-result]");
  if (!mount) return;

  if (solidityGeneralUiState.loading) {
    mount.innerHTML = renderLoadingState();
    return;
  }

  if (solidityGeneralUiState.error) {
    mount.innerHTML = renderErrorState(solidityGeneralUiState.error);
    bindActions();
    return;
  }

  const selected = solidityGeneralUiState.selected;
  mount.innerHTML = `
    <div class="settings-seismic-sizing-layout">
      <div class="settings-seismic-sizing-layout__row settings-seismic-sizing-layout__row--top arkolia-result-layout">
        <div class="settings-seismic-sizing-main">
          <div class="settings-seismic-chart-card arkolia-map-card${!selected ? " is-empty" : ""}">
            ${renderGoogleMapsBlock(selected)}
          </div>
        </div>

        <div class="settings-seismic-sizing-side">
          ${renderSummaryCard(selected)}
        </div>
      </div>

      ${renderAssiseCard(selected)}
    </div>
  `;

  bindActions();
}

function bindActions() {
  if (!currentRoot || currentRoot.dataset.solidityGeneralBound === "true") return;
  currentRoot.dataset.solidityGeneralBound = "true";

  currentRoot.addEventListener("click", async (event) => {
    const toggle = event.target.closest("[data-solidity-general-toggle-details]");
    if (toggle) {
      solidityGeneralUiState.detailsExpanded = !solidityGeneralUiState.detailsExpanded;
      renderContent();
      return;
    }

    const copyButton = event.target.closest("[data-solidity-general-copy-value]");
    if (!copyButton) return;

    const kind = copyButton.getAttribute("data-solidity-general-copy-value");
    if (kind !== "assise") return;

    const textarea = currentRoot.querySelector("[data-solidity-general-assise-output]");
    const text = getAssiseText(solidityGeneralUiState.selected);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (textarea) {
        textarea.removeAttribute("readonly");
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.setAttribute("readonly", "readonly");
      }
      showCopyButtonSuccess(copyButton, "Texte du niveau d'assise copié", "Copier le texte du niveau d'assise");
    } catch (_error) {
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }
  });
}

async function buildProjectClimateSelection() {
  const location = getEffectiveProjectLocation();
  const city = String(location.city || "").trim();
  const postalCode = String(location.postalCode || "").trim();

  if (!city || !postalCode) {
    return null;
  }

  const commune = await resolveFrenchCommune({ city, postalCode });
  const lat = Number.isFinite(location.latitude) ? location.latitude : Number(commune.lat);
  const lon = Number.isFinite(location.longitude) ? location.longitude : Number(commune.lon);

  let altitude = Number.isFinite(location.altitude) ? location.altitude : null;
  if (!Number.isFinite(altitude) && Number.isFinite(lat) && Number.isFinite(lon)) {
    try {
      const altitudeResult = await fetchFrenchAltitude({ latitude: lat, longitude: lon });
      altitude = Number(altitudeResult?.altitude);
    } catch {
      altitude = null;
    }
  }

  const canton = commune.codeInsee ? await getCantonByCommuneCode(commune.codeInsee) : null;
  const departmentCode = String(commune?.codeInsee || location.codeInsee || "").slice(0, 2) || "";
  const [windDepartment, snowDepartment, frostDepth, windZone, snowZone] = await Promise.all([
    getWindRegionsByDepartmentCode(departmentCode),
    getSnowRegionsByDepartmentCode(departmentCode),
    getFrostDepthByDepartmentCode(departmentCode),
    getWindZoneByDepartmentAndCanton(departmentCode, canton?.cantonName || canton?.cantonName2014 || ""),
    getSnowZoneByDepartmentAndCanton(departmentCode, canton?.cantonName || canton?.cantonName2014 || "")
  ]);

  const h0Values = Array.isArray(frostDepth?.h0Values) ? frostDepth.h0Values : [];
  const h0Numbers = h0Values.map(parseFrenchDecimalToNumber).filter((value) => Number.isFinite(value));
  const retainedH0 = h0Numbers.length ? Math.max(...h0Numbers) : null;
  const calculatedH = Number.isFinite(retainedH0) && Number.isFinite(altitude)
    ? retainedH0 + ((altitude - 150) / 4000)
    : null;

  return {
    name: commune.city || city,
    postalCode: commune.postalCode || postalCode,
    codeInsee: commune.codeInsee || location.codeInsee || "",
    departmentCode,
    departmentName: windDepartment?.departmentName || snowDepartment?.departmentName || frostDepth?.departmentName || "",
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    altitude: Number.isFinite(altitude) ? altitude : null,
    windZone: String(windZone?.windZone || "").trim(),
    snowZone: String(snowZone?.snowZone || "").trim(),
    currentCantonName: String(canton?.cantonNameCurrent || "").trim(),
    cantonName: String(canton?.cantonName || "").trim(),
    cantonName2014: String(canton?.cantonName2014 || "").trim(),
    hasCantonMismatch: Boolean(canton?.cantonNameCurrent && canton?.cantonName2014 && canton.cantonNameCurrent !== canton.cantonName2014),
    frostDepthH0Values: h0Values,
    hasMultipleFrostDepthH0Values: h0Numbers.length > 1,
    frostDepthH0Label: Number.isFinite(retainedH0) ? `${formatMeters(retainedH0, 2)} m` : "—",
    frostDepthHLabel: Number.isFinite(calculatedH) ? `${formatMeters(calculatedH, 2)} m` : "—"
  };
}

export async function renderSolidityGeneral(root, { force = true } = {}) {
  if (!root) return;
  currentRoot = root;
  solidityGeneralUiState.error = "";
  solidityGeneralUiState.detailsExpanded = true;

  if (root.dataset.solidityGeneralRendered !== "true") {
    root.innerHTML = `
      <section class="settings-section is-active">
        <div class="settings-card settings-card--param">
          <div class="settings-card__head settings-card__head--arkolia">
            <div class="arkolia-head-main">
              <div class="arkolia-head-main__top">
                <span class="settings-card__head-title">
                  <h4>Zones et charges climatiques</h4>
                </span>
                <div class="arkolia-head-main__actions">
                  ${renderNewSubjectButton()}
                </div>
              </div>
              <p>Définition automatique des zones climatiques et des charges associées à partir de la localisation de projet définie dans Paramètres.</p>
            </div>
          </div>

          <div class="settings-stack settings-stack--lg">
            <div data-solidity-general-result></div>
          </div>
        </div>
      </section>
    `;
    root.dataset.solidityGeneralRendered = "true";
  }

  bindSolidityGeneralLifecycle(root);
  renderContent();
  registerProjectPrimaryScrollSource(root.closest("#projectSolidityRouterScroll") || document.getElementById("projectSolidityRouterScroll"));
  await refreshSolidityGeneralData({ force });
}
