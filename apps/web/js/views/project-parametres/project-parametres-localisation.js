import { store } from "../../store.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { bindGhEditableFields } from "../ui/gh-input.js";
import {
  ensureProjectAutomationDefaults,
  shouldAutoRunProjectBaseDataEnrichment,
  startRunLogEntry,
  finishRunLogEntry
} from "../../services/project-automation.js";
import {
  fetchGeorisquesForCommune,
  fetchFrenchAltitude,
  searchFrenchCommunes,
  searchFrenchPostalCodes,
  searchIgnAddresses,
  resolveFrenchAddress,
  resolveFrenchCommune,
  resolveFrenchPostalCode
} from "../../services/georisques-service.js";
import { persistCurrentProjectState } from "../../services/project-state-storage.js";
import { saveProjectLocationToSupabase, loadProjectLocationFromSupabase } from "../../services/project-location-supabase.js";
import { svgIcon } from "../../ui/icons.js";
import { buildGoogleMapsPlaceEmbedUrl, hasGoogleMapsEmbedApiKey } from "../../services/google-maps-embed-service.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  bindBaseParametresUi,
  rerenderProjectParametres,
  getParametresUiState
} from "./project-parametres-core.js";

function ensureLocalisationUiState() {
  const parametresUiState = getParametresUiState();

  if (typeof parametresUiState.georisquesIsLoading !== "boolean") {
    parametresUiState.georisquesIsLoading = false;
  }
  if (typeof parametresUiState.georisquesLastRequestKey !== "string") {
    parametresUiState.georisquesLastRequestKey = "";
  }
  if (typeof parametresUiState.altitudeIsLoading !== "boolean") {
    parametresUiState.altitudeIsLoading = false;
  }
  if (!parametresUiState.locationAutocomplete || typeof parametresUiState.locationAutocomplete !== "object") {
    parametresUiState.locationAutocomplete = {
      address: { items: [], loading: false, open: false, activeIndex: -1 },
      city: { items: [], loading: false, open: false, activeIndex: -1 },
      postalCode: { items: [], loading: false, open: false, activeIndex: -1 }
    };
  }
  if (typeof parametresUiState.locationAutocompleteDocumentBound !== "boolean") {
    parametresUiState.locationAutocompleteDocumentBound = false;
  }
  if (typeof parametresUiState.locationEditBaseSignature !== "string") {
    parametresUiState.locationEditBaseSignature = "";
  }
  if (!Number.isInteger(parametresUiState.locationMapRefreshNonce)) {
    parametresUiState.locationMapRefreshNonce = 0;
  }
  if (!parametresUiState.locationSupabasePlaceholders || typeof parametresUiState.locationSupabasePlaceholders !== "object") {
    parametresUiState.locationSupabasePlaceholders = { address: "", city: "", postalCode: "" };
  }
  if (typeof parametresUiState.locationSupabaseHydrating !== "boolean") {
    parametresUiState.locationSupabaseHydrating = false;
  }

  return parametresUiState;
}

function renderLocationAutocompleteField({ id, label, value = "", placeholder = "", width = "", fieldKey = "city", inputMode = "text", placeholderStrong = false }) {
  const pencil = svgIcon("pencil", { className: "octicon" });
  const check = svgIcon("check", { className: "octicon" });
  const dropdownId = `${id}AutocompleteList`;

  return `
    <div class="${width}">
      <div class="form-row form-row--settings">
        ${label ? `<label for="${escapeHtml(id)}">${escapeHtml(label)}</label>` : ""}
        <div class="gh-editable-field gh-editable-field--autocomplete" data-editable-field>
          <div class="gh-editable-field__control">
            <input
              id="${escapeHtml(id)}"
              type="text"
              inputmode="${escapeHtml(inputMode)}"
              class="gh-input gh-editable-field__input${placeholderStrong ? " gh-input--placeholder-strong" : ""}"
              value="${escapeHtml(value)}"
              placeholder="${escapeHtml(placeholder)}"
              autocomplete="off"
              readonly
              data-editable-input
              data-location-autocomplete-input="${escapeHtml(fieldKey)}"
              aria-autocomplete="list"
              aria-expanded="false"
              aria-controls="${escapeHtml(dropdownId)}"
            >
            <div
              class="gh-autocomplete gh-autocomplete--cities"
              id="${escapeHtml(dropdownId)}"
              data-location-autocomplete-suggestions="${escapeHtml(fieldKey)}"
              role="listbox"
              hidden
            ></div>
          </div>
          <button
            type="button"
            class="gh-btn gh-btn--ghost gh-editable-field__btn"
            data-editable-toggle
            aria-label="Modifier"
            data-edit-label="Modifier"
            data-validate-label="Valider"
          >
            <span class="gh-editable-field__btn-icon" data-editable-icon>${pencil}</span>
            <span class="gh-editable-field__btn-text" data-editable-text>Modifier</span>
          </button>

          <template data-icon-edit>${pencil}</template>
          <template data-icon-validate>${check}</template>
        </div>
      </div>
    </div>
  `;
}

function ensureGeorisquesState() {
  if (!store.projectForm.georisques || typeof store.projectForm.georisques !== "object") {
    store.projectForm.georisques = {
      query: { city: "", postalCode: "" },
      commune: null,
      requestedAt: "",
      datasets: [],
      error: ""
    };
  }

  if (!Array.isArray(store.projectForm.georisques.datasets)) {
    store.projectForm.georisques.datasets = [];
  }

  if (!store.projectForm.georisques.query || typeof store.projectForm.georisques.query !== "object") {
    store.projectForm.georisques.query = { city: "", postalCode: "" };
  }

  return store.projectForm.georisques;
}

function getGeorisquesRequestKey(city = "", postalCode = "") {
  return `${String(city || "").trim().toLowerCase()}::${String(postalCode || "").trim()}`;
}

function getCurrentProjectLocationRequestKey() {
  return getGeorisquesRequestKey(store.projectForm.city, store.projectForm.postalCode);
}

function getProjectLocationSignature() {
  const address = String(store.projectForm.address || "").trim().toLowerCase();
  const city = String(store.projectForm.city || "").trim().toLowerCase();
  const postalCode = String(store.projectForm.postalCode || "").trim();
  const latitude = Number.isFinite(store.projectForm.latitude) ? String(store.projectForm.latitude) : "";
  const longitude = Number.isFinite(store.projectForm.longitude) ? String(store.projectForm.longitude) : "";

  return [address, city, postalCode, latitude, longitude].join("|");
}

function getLocationEditBaseSignature() {
  return String(ensureLocalisationUiState().locationEditBaseSignature || "") || getProjectLocationSignature();
}


function getLocationFieldPlaceholder(fieldKey = "", fallback = "") {
  const uiState = ensureLocalisationUiState();
  const supabasePlaceholders = uiState.locationSupabasePlaceholders || {};
  const snapshot = store.projectForm?.locationSavedSnapshot || {};
  if (fieldKey === "address") return String(supabasePlaceholders.address || snapshot.address || "").trim() || fallback;
  if (fieldKey === "city") return String(supabasePlaceholders.city || snapshot.city || "").trim() || fallback;
  if (fieldKey === "postalCode") return String(supabasePlaceholders.postalCode || snapshot.postalCode || "").trim() || fallback;
  return fallback;
}


function hasStrongPlaceholder(fieldKey = "") {
  const uiState = ensureLocalisationUiState();
  const fromSupabase = uiState.locationSupabasePlaceholders || {};
  if (fieldKey === "address") return Boolean(String(fromSupabase.address || "").trim());
  if (fieldKey === "city") return Boolean(String(fromSupabase.city || "").trim());
  if (fieldKey === "postalCode") return Boolean(String(fromSupabase.postalCode || "").trim());
  return false;
}

async function hydrateLocationPlaceholdersFromSupabase() {
  const uiState = ensureLocalisationUiState();
  if (uiState.locationSupabaseHydrating) return;
  const projectId = String(store.currentProjectId || "").trim();
  if (!projectId) return;
  uiState.locationSupabaseHydrating = true;
  try {
    const row = await loadProjectLocationFromSupabase(projectId);
    uiState.locationSupabasePlaceholders = {
      address: String(row?.address || "").trim(),
      city: String(row?.city || "").trim(),
      postalCode: String(row?.postal_code || "").trim()
    };

    syncProjectLocationFields({
      address: row?.address,
      city: row?.city,
      postalCode: row?.postal_code,
      latitude: row?.latitude,
      longitude: row?.longitude,
      altitude: row?.altitude
    });

    rerenderProjectParametres();
  } catch (error) {
    console.warn("[project-location] hydrate.placeholder.failure", error);
  } finally {
    uiState.locationSupabaseHydrating = false;
  }
}

function renderProjectLocationMapBlock() {
  const latitude = Number(store.projectForm.latitude);
  const longitude = Number(store.projectForm.longitude);
  const isValidLocation = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!isValidLocation || !hasGoogleMapsEmbedApiKey()) {
    return `
      <div class="settings-location-map-card${!isValidLocation ? " is-blurred" : ""}">
        <div class="arkolia-map arkolia-map--placeholder${!isValidLocation ? " is-empty" : ""}" aria-hidden="true">
          <div class="arkolia-map__placeholder-surface"></div>
          <div class="arkolia-map__placeholder-blur"></div>
        </div>
      </div>
    `;
  }

  const embedUrl = buildGoogleMapsPlaceEmbedUrl({
    latitude,
    longitude,
    zoom: 16,
    mapType: "satellite"
  });
  const mapRefreshNonce = Number(ensureLocalisationUiState().locationMapRefreshNonce || 0);

  if (!embedUrl) {
    return `
      <div class="settings-location-map-card is-blurred">
        <div class="arkolia-map arkolia-map--placeholder" aria-hidden="true">
          <div class="arkolia-map__placeholder-surface"></div>
          <div class="arkolia-map__placeholder-blur"></div>
        </div>
      </div>
    `;
  }

  let iframeUrl = embedUrl;
  if (mapRefreshNonce > 0) {
    try {
      const parsed = new URL(embedUrl);
      parsed.searchParams.set("mdall_refresh", String(mapRefreshNonce));
      iframeUrl = parsed.toString();
    } catch {
      iframeUrl = `${embedUrl}${embedUrl.includes("?") ? "&" : "?"}mdall_refresh=${mapRefreshNonce}`;
    }
  }

  return `
    <div class="settings-location-map-card">
      <div class="arkolia-map">
        <iframe
          title="Carte Google Maps de la localisation projet"
          src="${escapeHtml(iframeUrl)}"
          loading="lazy"
          allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  `;
}

function hasProjectLocationChanged(previousSignature = "") {
  return String(previousSignature || "") !== getProjectLocationSignature();
}

function hasStaleLocationDerivedData() {
  const georisques = ensureGeorisquesState();
  const currentKey = getCurrentProjectLocationRequestKey();
  const resolvedKey = getGeorisquesRequestKey(georisques.query?.city, georisques.query?.postalCode);

  if (!resolvedKey) return false;
  return currentKey !== resolvedKey;
}

function syncLocationDerivedStaleUi() {
  const isMuted = hasStaleLocationDerivedData();
  document.querySelectorAll("[data-location-derived]").forEach((node) => {
    node.classList.toggle("is-muted", isMuted);
  });
}

function dispatchProjectLocationChanged() {
  document.dispatchEvent(new CustomEvent("projectLocationChanged", {
    detail: {
      projectId: String(store.currentProjectId || "").trim(),
      locationSignature: getProjectLocationSignature()
    }
  }));
}

async function refreshAltitudeForCurrentProject() {
  const latitude = store.projectForm.latitude;
  const longitude = store.projectForm.longitude;
  const parametresUiState = ensureLocalisationUiState();

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    store.projectForm.altitude = null;
    return;
  }

  parametresUiState.altitudeIsLoading = true;
  rerenderProjectParametres();

  try {
    const result = await fetchFrenchAltitude({ latitude, longitude });
    store.projectForm.altitude = Number.isFinite(result?.altitude) ? result.altitude : null;
  } catch {
    store.projectForm.altitude = null;
  } finally {
    parametresUiState.altitudeIsLoading = false;
    rerenderProjectParametres();
  }
}

function collectTableCandidates(value, acc = []) {
  if (Array.isArray(value)) {
    if (!value.length) return acc;

    const hasStructuredItems = value.some((item) => item != null && typeof item === "object");
    acc.push(
      value.map((item) => (item != null && typeof item === "object"
        ? flattenObjectForTable(item)
        : { value: normalizeFlatValue(item) }))
    );

    if (hasStructuredItems) {
      value.forEach((item) => collectTableCandidates(item, acc));
    }
    return acc;
  }

  if (value != null && typeof value === "object") {
    Object.values(value).forEach((nestedValue) => collectTableCandidates(nestedValue, acc));
  }

  return acc;
}

function uniqueRows(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const signature = JSON.stringify(
      Object.keys(row)
        .sort()
        .reduce((acc, key) => {
          acc[key] = row[key];
          return acc;
        }, {})
    );

    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function getTabularRowsFromGeorisquesData(data) {
  const candidates = collectTableCandidates(data, []);
  const best = candidates
    .filter((rows) => Array.isArray(rows) && rows.length)
    .sort((a, b) => b.length - a.length)[0];

  if (best?.length) {
    return uniqueRows(best);
  }

  if (data != null && typeof data === "object") {
    return [flattenObjectForTable(data)];
  }

  if (data == null || data === "") return [];
  return [{ value: normalizeFlatValue(data) }];
}

function formatGeorisquesDate(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return String(value);
  }
}

function normalizeFlatValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}

function flattenObjectForTable(value, prefix = "") {
  const row = {};

  if (Array.isArray(value)) {
    row[prefix || "value"] = value.map((item) => normalizeFlatValue(item)).join(", ");
    return row;
  }

  if (value != null && typeof value === "object") {
    Object.entries(value).forEach(([key, nestedValue]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      if (nestedValue != null && typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
        Object.assign(row, flattenObjectForTable(nestedValue, nextPrefix));
      } else if (Array.isArray(nestedValue)) {
        row[nextPrefix] = nestedValue.map((item) => normalizeFlatValue(item)).join(", ");
      } else {
        row[nextPrefix] = normalizeFlatValue(nestedValue);
      }
    });
    return row;
  }

  row[prefix || "value"] = normalizeFlatValue(value);
  return row;
}

function renderGeorisquesTable(rows = []) {
  if (!rows.length) {
    return '<div class="settings-empty-note">Aucune ligne exploitable dans la réponse.</div>';
  }

  const columns = [];
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!columns.includes(key)) columns.push(key);
    });
  });

  return `
    <div class="settings-table-wrap">
      <table class="settings-table settings-table--compact">
        <thead>
          <tr>
            ${columns.map((column) => `<th>${escapeHtml(formatTableColumnLabel(column))}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => `<td>${escapeHtml(normalizeFlatValue(row[column]))}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatTableColumnLabel(key = "") {
  return String(key || "")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");
}

function findFirstMatchingValueDeep(value, matcher) {
  if (matcher(value)) return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findFirstMatchingValueDeep(item, matcher);
      if (match !== undefined) return match;
    }
    return undefined;
  }

  if (value != null && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (matcher(nestedValue, key)) return nestedValue;
      const match = findFirstMatchingValueDeep(nestedValue, matcher);
      if (match !== undefined) return match;
    }
  }

  return undefined;
}

function extractSeismicZoneNumber(value = "") {
  const normalized = normalizeFlatValue(value);
  const match = normalized.match(/(?:^|\b)([1-5])(?:\b|\s*-)/);
  return match ? match[1] : "";
}

function normalizeSeismicLabel(value = "") {
  const normalized = normalizeFlatValue(value);
  if (!normalized || normalized === "—") return "";
  return normalized.toUpperCase();
}

function formatSeismicZoneSummary(zoneValue = "", labelValue = "") {
  const cleanZone = normalizeFlatValue(zoneValue);
  const cleanLabel = normalizeSeismicLabel(labelValue);
  const zoneNumber = extractSeismicZoneNumber(cleanZone || cleanLabel);

  if (cleanZone && /[1-5]\s*-/.test(cleanZone)) {
    return cleanZone;
  }

  if (zoneNumber && cleanLabel && !cleanLabel.includes(zoneNumber)) {
    return `${zoneNumber} - ${cleanLabel}`;
  }

  if (zoneNumber) return zoneNumber;
  if (cleanZone && cleanZone !== "—") return cleanZone;
  if (cleanLabel && cleanLabel !== "—") return cleanLabel;
  return "";
}

function getGeorisquesDataset(datasetKey = "") {
  const georisques = ensureGeorisquesState();
  return georisques.datasets.find((item) => String(item?.key || "").trim() === String(datasetKey || "").trim()) || null;
}

function getGeorisquesSismiqueSummary() {
  const dataset = getGeorisquesDataset("zonage_sismique");
  if (!dataset || dataset.status !== "success") return "";

  const rows = getTabularRowsFromGeorisquesData(dataset.data);
  const zoneKeyPattern = /(zone(_sismique|_sismicite)?|code_zone|niveau_zone)/i;
  const labelKeyPattern = /(libelle|label|intitule|niveau|qualification)/i;

  for (const row of rows) {
    let zoneValue = "";
    let labelValue = "";

    for (const [key, rawValue] of Object.entries(row)) {
      const value = normalizeFlatValue(rawValue);
      if (!value || value === "—") continue;

      if (!zoneValue && zoneKeyPattern.test(key) && extractSeismicZoneNumber(value)) {
        zoneValue = value;
        continue;
      }

      if (!labelValue && labelKeyPattern.test(key)) {
        labelValue = value;
      }
    }

    const formatted = formatSeismicZoneSummary(zoneValue, labelValue);
    if (formatted) return formatted;
  }

  const directZone = findFirstMatchingValueDeep(dataset.data, (candidate, key = "") => {
    if (!zoneKeyPattern.test(String(key || ""))) return false;
    return Boolean(extractSeismicZoneNumber(candidate));
  });

  const directLabel = findFirstMatchingValueDeep(dataset.data, (candidate, key = "") => {
    if (!labelKeyPattern.test(String(key || ""))) return false;
    const value = normalizeFlatValue(candidate);
    return Boolean(value && value !== "—");
  });

  return formatSeismicZoneSummary(directZone, directLabel);
}

function renderAutoResolvedField(label, value, hint = "Données récupérées automatiquement sur Géorisques.", options = {}) {
  const mutedClass = options?.muted ? " is-muted" : "";

  return `
    <div class="settings-auto-field${mutedClass}" data-location-derived>
      <div class="settings-auto-field__label"><strong>${escapeHtml(label)} <span class="settings-auto-field__asterisk">*</span></strong></div>
      <div class="settings-auto-field__value">${escapeHtml(value || "—")}</div>
      <div class="settings-auto-field__hint">${escapeHtml(hint)}</div>
    </div>
  `;
}

function getGeorisquesDatasetDescription(datasetKey = "") {
  const descriptions = {
    risques: "Liste des détails des risques",
    ppr: "Liste des différents documents PPR (Plan de Prévention des Risques)",
    catnat: "Liste des arrêtés de catastrophe naturelle",
    dicrim: "Liste des Documents d'Information Communal sur les Risques Majeurs",
    tim: "Liste des dossiers de Transmission d'Information au Maire",
    papi: "Liste des Programmes d'Actions de Prévention des Inondations",
    azi: "Liste des Atlas de Zones Inondables",
    tri: "Liste des Territoires à Risques importants d'Inondation",
    tri_zonage_reglementaire: "Liste des Territoires à Risques importants d'Inondation",
    radon: "Potentiel radon",
    cavites: "Liste des cavités souterraines",
    mvt: "Données sur les mouvements de terrain"
  };

  return descriptions[String(datasetKey || "").trim()] || "";
}

function renderGeorisquesDataset(dataset = {}) {
  const status = dataset.status === "success" ? "OK" : "Erreur";

  let body = `<div class="settings-inline-error">${escapeHtml(dataset.error || "Requête indisponible")}</div>`;

  if (dataset.status === "success") {
    if (dataset.key === "ppr") {
      body = `<pre class="settings-json-block settings-json-block--scrollable">${escapeHtml(JSON.stringify(dataset.data, null, 2))}</pre>`;
    } else {
      body = renderGeorisquesTable(getTabularRowsFromGeorisquesData(dataset.data));
    }
  }

  return renderSectionCard({
    title: dataset.label || dataset.key || "Donnée",
    description: getGeorisquesDatasetDescription(dataset.key),
    badge: status,
    body
  });
}

function renderGeorisquesSection() {
  const georisques = ensureGeorisquesState();
  const city = String(store.projectForm.city || "").trim();
  const postalCode = String(store.projectForm.postalCode || "").trim();
  const requestedAt = formatGeorisquesDate(georisques.requestedAt);
  const successCount = georisques.datasets.filter((item) => item.status === "success").length;
  const errorCount = georisques.datasets.filter((item) => item.status !== "success").length;

  const summaryHtml = `
    <div class="settings-georisques-summary${hasStaleLocationDerivedData() ? " is-muted" : ""}" data-location-derived>
      <div class="settings-georisques-summary__row"><strong>Entrée projet :</strong> ${escapeHtml(`${city || "—"} ${postalCode || ""}`.trim() || "—")}</div>
      <div class="settings-georisques-summary__row"><strong>Commune résolue :</strong> ${escapeHtml(georisques.commune?.name || "—")}</div>
      <div class="settings-georisques-summary__row"><strong>Code INSEE :</strong> ${escapeHtml(georisques.commune?.codeInsee || "—")}</div>
      <div class="settings-georisques-summary__row"><strong>Dernière récupération :</strong> ${escapeHtml(requestedAt || "—")}</div>
      <div class="settings-georisques-summary__row"><strong>Jeux récupérés :</strong> ${escapeHtml(String(successCount))}${errorCount ? ` / erreurs : ${escapeHtml(String(errorCount))}` : ""}</div>
    </div>
  `;

  const parametresUiState = ensureLocalisationUiState();
  const actionsHtml = `
    <button
      type="button"
      class="gh-btn gh-btn--primary"
      id="projectGeorisquesFetchBtn"
      title="${escapeHtml(getProjectBaseDataEnrichmentButtonTooltip())}"
      ${parametresUiState.georisquesIsLoading ? "disabled" : ""}
    >
      ${escapeHtml(getProjectBaseDataEnrichmentButtonLabel())}
    </button>
  `;

  const errorHtml = georisques.error
    ? `<div class="settings-inline-error">${escapeHtml(georisques.error)}</div>`
    : "";

  const datasetsHtml = georisques.datasets.length
    ? georisques.datasets.map((dataset) => renderGeorisquesDataset(dataset)).join("")
    : `<div class="settings-empty-note">Aucune donnée chargée pour le moment.</div>`;

  return renderSettingsBlock({
    id: "parametres-georisques",
    title: "Géorisques",
    lead: "",
    hideHead: true,
    cards: [
      renderSectionCard({
        title: "Géorisques",
        description: "Chargement de l’ensemble des réponses disponibles actuellement tentées au niveau commune dans le PoC.",
        action: actionsHtml,
        body: `
          <div class="settings-location-derived-block${hasStaleLocationDerivedData() ? " is-muted" : ""}" data-location-derived>
            ${summaryHtml}
          </div>
          ${errorHtml}
          <div class="settings-location-derived-block${hasStaleLocationDerivedData() ? " is-muted" : ""}" data-location-derived>
            ${datasetsHtml}
          </div>
        `
      })
    ]
  });
}

function getProjectBaseDataEnrichmentButtonLabel() {
  if (ensureLocalisationUiState().georisquesIsLoading) {
    return "Récupération…";
  }

  return shouldAutoRunProjectBaseDataEnrichment()
    ? "Enrichissement automatique activé"
    : "Récupérer les données Géorisques";
}

function getProjectBaseDataEnrichmentButtonTooltip() {
  if (!shouldAutoRunProjectBaseDataEnrichment()) return "Relancer manuellement l’enrichissement des données de base projet.";

  return "Un enrichissement est lancé automatiquement après validation d’une modification de la localisation projet. Ce bouton permet aussi un relancement manuel.";
}

function buildProjectBaseDataEnrichmentDetails({ georisquesStatus = "pending", georisquesError = "" } = {}) {
  const georisques = ensureGeorisquesState();
  const seismicSummary = getGeorisquesSismiqueSummary();
  const successCount = georisques.datasets.filter((item) => item.status === "success").length;
  const errorCount = georisques.datasets.filter((item) => item.status !== "success").length;

  return {
    location: {
      address: String(store.projectForm.address || "").trim(),
      city: String(store.projectForm.city || "").trim(),
      postalCode: String(store.projectForm.postalCode || "").trim(),
      latitude: Number.isFinite(store.projectForm.latitude) ? store.projectForm.latitude : null,
      longitude: Number.isFinite(store.projectForm.longitude) ? store.projectForm.longitude : null
    },
    steps: {
      georisques: {
        status: georisquesStatus,
        requestKey: getCurrentProjectLocationRequestKey(),
        communeName: georisques.commune?.name || null,
        codeInsee: georisques.commune?.codeInsee || null,
        datasetsCount: georisques.datasets.length,
        successCount,
        errorCount,
        error: georisquesError || georisques.error || ""
      },
      seismicZone: {
        status: seismicSummary ? "success" : "pending",
        source: "ui",
        value: seismicSummary || ""
      }
    }
  };
}

function getProjectBaseDataEnrichmentSummary(details = {}) {
  const georisques = details?.steps?.georisques || {};
  const seismicZone = details?.steps?.seismicZone || {};
  const parts = [];

  if (georisques.status === "success") {
    parts.push(`Géorisques : ${georisques.successCount || 0} jeu(x) réussi(s)`);
    if (georisques.errorCount) {
      parts.push(`${georisques.errorCount} erreur(s)`);
    }
  } else if (georisques.error) {
    parts.push(`Géorisques : ${georisques.error}`);
  }

  if (seismicZone.value) {
    parts.push(`Sismique : ${seismicZone.value}`);
  }

  return parts.join(" · ") || "Enrichissement des données de base projet.";
}

async function runProjectBaseDataEnrichment({ triggerType = "manual", triggerLabel = "Lancement manuel depuis Paramètres", force = true } = {}) {
  const city = String(store.projectForm.city || "").trim();
  const postalCode = String(store.projectForm.postalCode || "").trim();
  const georisques = ensureGeorisquesState();
  const parametresUiState = ensureLocalisationUiState();

  if (!city || !postalCode) {
    georisques.error = "Renseigne d'abord la ville et le code postal dans la section Localisation.";
    rerenderProjectParametres();
    return null;
  }

  if (parametresUiState.georisquesIsLoading) return null;

  const runEntry = startRunLogEntry({
    name: "Enrichissement des données de base projet",
    kind: "enrichment",
    agentKey: "project-base-data",
    triggerType,
    triggerLabel,
    status: "running",
    summary: triggerType === "automatic"
      ? "Enrichissement déclenché automatiquement après validation d’une modification de la localisation projet."
      : "Enrichissement déclenché manuellement depuis Paramètres > Géorisques.",
    details: buildProjectBaseDataEnrichmentDetails({ georisquesStatus: "running" })
  });

  try {
    await loadGeorisquesForCurrentProject({ force });
    const details = buildProjectBaseDataEnrichmentDetails({ georisquesStatus: "success" });
    store.projectForm.baseDataEnrichment.lastLocationSignature = getProjectLocationSignature();
    return finishRunLogEntry(runEntry.id, {
      status: "success",
      summary: getProjectBaseDataEnrichmentSummary(details),
      details
    });
  } catch (error) {
    const details = buildProjectBaseDataEnrichmentDetails({
      georisquesStatus: "error",
      georisquesError: error instanceof Error ? error.message : String(error)
    });
    return finishRunLogEntry(runEntry.id, {
      status: "error",
      summary: getProjectBaseDataEnrichmentSummary(details),
      details
    });
  }
}

async function refreshLocationDerivedData({ runEnrichment = false, triggerType = "manual", triggerLabel = "" } = {}) {
  syncLocationDerivedStaleUi();

  const city = String(store.projectForm.city || "").trim();
  const postalCode = String(store.projectForm.postalCode || "").trim();

  if (!city || !postalCode) {
    store.projectForm.altitude = null;
    persistCurrentProjectState();
    dispatchProjectLocationChanged();
    rerenderProjectParametres();
    return;
  }

  await refreshAltitudeForCurrentProject();

  if (runEnrichment) {
    await runProjectBaseDataEnrichment({ triggerType, triggerLabel, force: true });
  }

  const codeInsee = String(store.projectForm?.georisques?.commune?.codeInsee || "").trim() || null;
  const projectId = String(store.currentProjectId || "").trim();

  console.info("[project-location] save.start", {
    projectId,
    address: String(store.projectForm.address || "").trim(),
    city,
    postalCode,
    latitude: store.projectForm.latitude,
    longitude: store.projectForm.longitude,
    altitude: store.projectForm.altitude,
    codeInsee
  });

  try {
    const savedProject = await saveProjectLocationToSupabase({
      projectId,
      address: store.projectForm.address,
      city,
      postalCode,
      latitude: store.projectForm.latitude,
      longitude: store.projectForm.longitude,
      altitude: store.projectForm.altitude,
      codeInsee
    });

    store.projectForm.locationSavedSnapshot = {
      address: String(store.projectForm.address || "").trim(),
      city,
      postalCode
    };
    ensureLocalisationUiState().locationMapRefreshNonce += 1;

    console.info("[project-location] save.success", {
      projectId,
      savedProjectId: String(savedProject?.id || "").trim() || null
    });
  } catch (error) {
    console.error("[project-location] save.failure", {
      projectId,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  persistCurrentProjectState();
  dispatchProjectLocationChanged();
  rerenderProjectParametres();
}

async function loadGeorisquesForCurrentProject({ force = false } = {}) {
  const city = String(store.projectForm.city || "").trim();
  const postalCode = String(store.projectForm.postalCode || "").trim();
  const requestKey = getGeorisquesRequestKey(city, postalCode);
  const georisques = ensureGeorisquesState();
  const parametresUiState = ensureLocalisationUiState();

  if (!city || !postalCode) {
    georisques.error = "Renseigne d'abord la ville et le code postal dans la section Localisation.";
    rerenderProjectParametres();
    throw new Error(georisques.error);
  }

  if (parametresUiState.georisquesIsLoading) return null;
  if (!force && georisques.datasets.length && parametresUiState.georisquesLastRequestKey === requestKey) {
    return georisques;
  }

  parametresUiState.georisquesIsLoading = true;
  georisques.error = "";
  rerenderProjectParametres();

  try {
    const result = await fetchGeorisquesForCommune({
      city,
      postalCode,
      latitude: store.projectForm.latitude,
      longitude: store.projectForm.longitude
    });
    store.projectForm.georisques = {
      ...result,
      error: ""
    };
    parametresUiState.georisquesLastRequestKey = requestKey;
    store.projectForm.baseDataEnrichment.lastLocationSignature = getProjectLocationSignature();
    persistCurrentProjectState();
    return store.projectForm.georisques;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ensureGeorisquesState().error = message;
    persistCurrentProjectState();
    throw error instanceof Error ? error : new Error(message);
  } finally {
    parametresUiState.georisquesIsLoading = false;
    rerenderProjectParametres();
  }
}

function getLocationAutocompleteState(fieldKey) {
  const parametresUiState = ensureLocalisationUiState();

  if (!parametresUiState.locationAutocomplete[fieldKey]) {
    parametresUiState.locationAutocomplete[fieldKey] = {
      items: [],
      loading: false,
      open: false,
      activeIndex: -1
    };
  }

  return parametresUiState.locationAutocomplete[fieldKey];
}

function resetLocationAutocompleteState(fieldKey) {
  const state = getLocationAutocompleteState(fieldKey);
  state.items = [];
  state.loading = false;
  state.open = false;
  state.activeIndex = -1;
}

function renderLocationAutocompleteDropdown(fieldKey, container, input) {
  if (!container || !input) return;

  const state = getLocationAutocompleteState(fieldKey);
  const items = Array.isArray(state.items) ? state.items : [];
  const isOpen = state.open && (state.loading || items.length > 0);

  input.setAttribute("aria-expanded", isOpen ? "true" : "false");
  container.hidden = !isOpen;

  if (!isOpen) {
    container.innerHTML = "";
    return;
  }

  if (state.loading) {
    container.innerHTML = `<div class="gh-autocomplete__status">Recherche…</div>`;
    return;
  }

  container.innerHTML = items.map((item, index) => {
    const primary = fieldKey === "postalCode"
      ? (item.postalCode || item.label || "")
      : (item.label || item.name || item.postalCode || "");
    const meta = fieldKey === "address"
      ? [item.city, item.postalCode].filter(Boolean).join(" · ")
      : fieldKey === "postalCode"
        ? [item.name, item.codeInsee ? `INSEE ${item.codeInsee}` : ""].filter(Boolean).join(" · ")
        : [item.postalCodes?.join(", ") || item.postalCode || "", item.codeInsee ? `INSEE ${item.codeInsee}` : ""].filter(Boolean).join(" · ");
    const isActive = index === state.activeIndex;

    return `
      <button
        type="button"
        class="gh-autocomplete__item ${isActive ? "is-active" : ""}"
        data-location-option-field="${escapeHtml(fieldKey)}"
        data-location-option-index="${index}"
        role="option"
        aria-selected="${isActive ? "true" : "false"}"
      >
        <span class="gh-autocomplete__item-main">${escapeHtml(primary || "—")}</span>
        ${meta ? `<span class="gh-autocomplete__item-meta">${escapeHtml(meta)}</span>` : ""}
      </button>
    `;
  }).join("");
}

function syncProjectLocationFields({ address, city, postalCode, latitude, longitude, altitude } = {}) {
  if (address !== undefined) {
    store.projectForm.address = String(address || "").trim();
  }

  if (city !== undefined) {
    store.projectForm.city = String(city || "").trim();
  }

  if (postalCode !== undefined) {
    store.projectForm.postalCode = String(postalCode || "").trim();
  }

  if (latitude !== undefined) {
    store.projectForm.latitude = Number.isFinite(latitude) ? latitude : null;
  }

  if (longitude !== undefined) {
    store.projectForm.longitude = Number.isFinite(longitude) ? longitude : null;
  }

  if (altitude !== undefined) {
    store.projectForm.altitude = Number.isFinite(altitude) ? altitude : null;
  }

  store.projectForm.communeCp = [store.projectForm.city, store.projectForm.postalCode].filter(Boolean).join(" ").trim();
  syncLocationDerivedStaleUi();
}

function applyLocationSelection(fieldKey, item) {
  if (!item) return;

  const addressInput = document.getElementById("projectAddress");
  const cityInput = document.getElementById("projectCity");
  const postalCodeInput = document.getElementById("projectPostalCode");

  if (fieldKey === "address") {
    resolveFrenchAddress(item.label || item.name || "")
      .then((resolved) => {
        if (addressInput) addressInput.value = resolved.address || item.label || "";
        if (cityInput) cityInput.value = resolved.city || "";
        if (postalCodeInput) postalCodeInput.value = resolved.postalCode || "";
        syncProjectLocationFields({
          address: resolved.address || item.label || "",
          city: resolved.city,
          postalCode: resolved.postalCode,
          latitude: resolved.lat,
          longitude: resolved.lon
        });
        resetLocationAutocompleteState(fieldKey);
        renderLocationAutocompleteDropdown(fieldKey, document.querySelector('[data-location-autocomplete-suggestions="address"]'), addressInput);
      })
      .catch(() => {});
    return;
  }

  if (fieldKey === "city") {
    if (cityInput) cityInput.value = item.name || item.label || "";
    if (postalCodeInput) postalCodeInput.value = item.postalCode || item.postalCodes?.[0] || "";
    syncProjectLocationFields({
      address: "",
      city: item.name || item.label || "",
      postalCode: item.postalCode || item.postalCodes?.[0] || "",
      latitude: item.lat,
      longitude: item.lon
    });
    resetLocationAutocompleteState(fieldKey);
    renderLocationAutocompleteDropdown(fieldKey, document.querySelector('[data-location-autocomplete-suggestions="city"]'), cityInput);
    return;
  }

  if (fieldKey === "postalCode") {
    if (postalCodeInput) postalCodeInput.value = item.postalCode || item.label || "";
    if (cityInput) cityInput.value = item.name || item.city || "";
    syncProjectLocationFields({
      address: "",
      city: item.name || item.city || "",
      postalCode: item.postalCode || item.label || "",
      latitude: item.lat,
      longitude: item.lon
    });
    resetLocationAutocompleteState(fieldKey);
    renderLocationAutocompleteDropdown(fieldKey, document.querySelector('[data-location-autocomplete-suggestions="postalCode"]'), postalCodeInput);
  }
}

function bindLocationAutocompleteField(fieldKey) {
  const input = document.querySelector(`[data-location-autocomplete-input="${fieldKey}"]`);
  const dropdown = document.querySelector(`[data-location-autocomplete-suggestions="${fieldKey}"]`);

  if (!input || !dropdown || input.dataset.autocompleteBound === "true") return;
  input.dataset.autocompleteBound = "true";

  let requestSequence = 0;
  let debounceTimer = null;

  const closeDropdown = () => {
    resetLocationAutocompleteState(fieldKey);
    renderLocationAutocompleteDropdown(fieldKey, dropdown, input);
  };

  const openWithLoading = () => {
    const state = getLocationAutocompleteState(fieldKey);
    state.loading = true;
    state.open = true;
    state.items = [];
    state.activeIndex = -1;
    renderLocationAutocompleteDropdown(fieldKey, dropdown, input);
  };

  input.addEventListener("input", () => {
    const query = String(input.value || "").trim();

    if (fieldKey === "address") {
      syncProjectLocationFields({ address: query, city: store.projectForm.city, postalCode: store.projectForm.postalCode, altitude: null });
    } else if (fieldKey === "city") {
      syncProjectLocationFields({ address: "", city: query, postalCode: store.projectForm.postalCode, altitude: null });
    } else if (fieldKey === "postalCode") {
      syncProjectLocationFields({ address: "", city: store.projectForm.city, postalCode: query.replace(/\D+/g, ""), altitude: null });
      input.value = store.projectForm.postalCode;
    }

    if (debounceTimer) clearTimeout(debounceTimer);

    const minLength = fieldKey === "postalCode" ? 2 : (fieldKey === "address" ? 3 : 2);
    if (query.length < minLength) {
      closeDropdown();
      return;
    }

    openWithLoading();
    const currentRequestId = ++requestSequence;

    debounceTimer = setTimeout(async () => {
      try {
        const items = fieldKey === "address"
          ? await searchIgnAddresses({ query, limit: 6 })
          : fieldKey === "postalCode"
            ? await searchFrenchPostalCodes({ query, limit: 6 })
            : await searchFrenchCommunes({ query, postalCode: String(store.projectForm.postalCode || "").trim(), limit: 6 });

        if (currentRequestId !== requestSequence) return;

        const state = getLocationAutocompleteState(fieldKey);
        state.items = items;
        state.loading = false;
        state.open = items.length > 0;
        state.activeIndex = items.length ? 0 : -1;
        renderLocationAutocompleteDropdown(fieldKey, dropdown, input);
      } catch {
        if (currentRequestId !== requestSequence) return;
        closeDropdown();
      }
    }, 180);
  });

  input.addEventListener("keydown", (event) => {
    const state = getLocationAutocompleteState(fieldKey);
    if (!state.open || !state.items.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.activeIndex = (state.activeIndex + 1) % state.items.length;
      renderLocationAutocompleteDropdown(fieldKey, dropdown, input);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.activeIndex = (state.activeIndex - 1 + state.items.length) % state.items.length;
      renderLocationAutocompleteDropdown(fieldKey, dropdown, input);
      return;
    }

    if (event.key === "Enter") {
      const selected = state.items[state.activeIndex] || state.items[0];
      if (!selected) return;
      event.preventDefault();
      applyLocationSelection(fieldKey, selected);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  });

  dropdown.addEventListener("mousedown", (event) => {
    const option = event.target.closest('[data-location-option-field]');
    if (!option || option.getAttribute("data-location-option-field") !== fieldKey) return;
    event.preventDefault();
    const index = Number(option.getAttribute("data-location-option-index"));
    const selected = getLocationAutocompleteState(fieldKey).items[index];
    applyLocationSelection(fieldKey, selected);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!document.activeElement || !dropdown.contains(document.activeElement)) {
        closeDropdown();
      }
    }, 120);
  });

  const parametresUiState = ensureLocalisationUiState();
  if (!parametresUiState.locationAutocompleteDocumentBound) {
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".gh-editable-field--autocomplete")) {
        ["address", "city", "postalCode"].forEach((key) => {
          resetLocationAutocompleteState(key);
          const activeDropdown = document.querySelector(`[data-location-autocomplete-suggestions="${key}"]`);
          const activeInput = document.querySelector(`[data-location-autocomplete-input="${key}"]`);
          if (activeDropdown && activeInput) {
            renderLocationAutocompleteDropdown(key, activeDropdown, activeInput);
          }
        });
      }
    });
    parametresUiState.locationAutocompleteDocumentBound = true;
  }
}

function bindProjectLocationAutocomplete() {
  bindLocationAutocompleteField("address");
}

export function renderLocalisationParametresContent() {
  ensureProjectAutomationDefaults();
  ensureLocalisationUiState();

  const form = store.projectForm;
  const parametresUiState = getParametresUiState();

  return `${renderSettingsBlock({
    id: "parametres-localisation",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Localisation",
        description: "Localisation administrative et d’usage du projet.",
        badge: "LIVE",
        body: `<div class="settings-form-grid">
          ${renderLocationAutocompleteField({ id: "projectAddress", width: "col-span-2", fieldKey: "address", label: "Adresse", value: form.address || "", placeholder: getLocationFieldPlaceholder("address", "Ex. 12 avenue de la Gare, Annecy"), placeholderStrong: hasStrongPlaceholder("address") })}
        </div>
        ${(ensureGeorisquesState().commune || Number.isFinite(form.latitude) || Number.isFinite(form.longitude)) ? `
          <div class="settings-auto-fields">
            ${renderAutoResolvedField("Commune résolue", ensureGeorisquesState().commune?.name || form.city || "—", "Données de localisation résolues automatiquement.", { muted: hasStaleLocationDerivedData() })}
            ${renderAutoResolvedField("Code INSEE", ensureGeorisquesState().commune?.codeInsee || "—", "Données récupérées automatiquement sur Géorisques.", { muted: hasStaleLocationDerivedData() })}
            ${renderAutoResolvedField("Longitude", Number.isFinite(form.longitude) ? String(form.longitude) : "—", "Coordonnée automatiquement déterminée à partir de l’adresse ou du centre de commune.", { muted: hasStaleLocationDerivedData() })}
            ${renderAutoResolvedField("Latitude", Number.isFinite(form.latitude) ? String(form.latitude) : "—", "Coordonnée automatiquement déterminée à partir de l’adresse ou du centre de commune.", { muted: hasStaleLocationDerivedData() })}
            ${renderAutoResolvedField(
              "Altitude",
              parametresUiState.altitudeIsLoading
                ? "Chargement…"
                : (Number.isFinite(form.altitude) ? `${String(form.altitude)} m` : "—"),
              "Altitude automatiquement récupérée via l’API altimétrie IGN / GeoPF.",
              { muted: hasStaleLocationDerivedData() }
            )}
          </div>
        ` : ""}
        ${renderProjectLocationMapBlock()}
      `
      })
    ]
  })}`;
}

export function bindLocalisationParametresSection(root) {
  void root;
  ensureLocalisationUiState();
  bindBaseParametresUi();
  void hydrateLocationPlaceholdersFromSupabase();

  bindGhEditableFields(document, {
    onEditStart: (id) => {
      const addressInput = document.getElementById("projectAddress");
      const cityInput = document.getElementById("projectCity");
      const postalCodeInput = document.getElementById("projectPostalCode");
      const parametresUiState = ensureLocalisationUiState();

      if (id === "projectAddress") {
        parametresUiState.locationEditBaseSignature = getProjectLocationSignature();
      }
      if (id === "projectAddress") {
        syncProjectLocationFields({ address: store.projectForm.address, city: "", postalCode: "", latitude: null, longitude: null, altitude: null });
        if (cityInput) cityInput.value = "";
        if (postalCodeInput) postalCodeInput.value = "";
        syncLocationDerivedStaleUi();
      }
    },
    onValidate: async (id, value) => {
      switch (id) {
        case "projectAddress": {
          const previousLocationSignature = getLocationEditBaseSignature();
          try {
            const resolved = await resolveFrenchAddress(value);
            syncProjectLocationFields({ address: resolved.address, city: resolved.city, postalCode: resolved.postalCode, latitude: resolved.lat, longitude: resolved.lon });
          } catch {
            syncProjectLocationFields({ address: value, altitude: null });
          }
          await refreshLocationDerivedData({ runEnrichment: hasProjectLocationChanged(previousLocationSignature) && shouldAutoRunProjectBaseDataEnrichment(), triggerType: "automatic", triggerLabel: "Validation d’une modification de la localisation projet" });
          ensureLocalisationUiState().locationEditBaseSignature = "";
          break;
        }
      }
    }
  });

  bindProjectLocationAutocomplete();
  syncLocationDerivedStaleUi();

  const georisquesFetchBtn = document.getElementById("projectGeorisquesFetchBtn");
  if (georisquesFetchBtn) {
    georisquesFetchBtn.addEventListener("click", () => {
      runProjectBaseDataEnrichment({ triggerType: "manual", triggerLabel: "Lancement manuel depuis Paramètres" });
    });
  }
}

export function getLocalisationProjectParametresTab() {
  return {
    id: "parametres-localisation",
    label: "Localisation",
    iconName: "pin",
    isPrimary: false,
    renderContent: () => renderLocalisationParametresContent(),
    bind: (root) => bindLocalisationParametresSection(root)
  };
}
