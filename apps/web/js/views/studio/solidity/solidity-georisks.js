import { store } from "../../../store.js";
import { fetchGeorisquesForCommune } from "../../../services/georisques-service.js";
import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { persistCurrentProjectState, readPersistedCurrentProjectState } from "../../../services/project-state-storage.js";
import { shouldAutoRunProjectBaseDataEnrichment } from "../../../services/project-automation.js";

const georisksUiState = {
  isLoading: false,
  lastRequestKey: ""
};

let currentRoot = null;

function ensureGeorisquesState() {
  const form = store.projectForm || (store.projectForm = {});
  if (typeof form.city !== "string") form.city = "";
  if (typeof form.postalCode !== "string") form.postalCode = "";
  if (!form.georisques || typeof form.georisques !== "object") {
    form.georisques = {
      query: { city: "", postalCode: "" },
      datasets: [],
      error: "",
      requestedAt: "",
      commune: null
    };
  }
  if (!Array.isArray(form.georisques.datasets)) form.georisques.datasets = [];
  if (!form.georisques.query || typeof form.georisques.query !== "object") {
    form.georisques.query = { city: "", postalCode: "" };
  }
  return form.georisques;
}


function syncProjectLocationFromPersistedState() {
  const persisted = readPersistedCurrentProjectState();
  const persistedForm = persisted?.projectForm;
  if (!persistedForm || typeof persistedForm !== "object") return null;

  const location = {
    address: typeof persistedForm.address === "string" ? persistedForm.address : store.projectForm.address,
    city: typeof persistedForm.city === "string" ? persistedForm.city : store.projectForm.city,
    postalCode: typeof persistedForm.postalCode === "string" ? persistedForm.postalCode : store.projectForm.postalCode,
    latitude: Number.isFinite(persistedForm.latitude) ? persistedForm.latitude : store.projectForm.latitude,
    longitude: Number.isFinite(persistedForm.longitude) ? persistedForm.longitude : store.projectForm.longitude,
    altitude: Number.isFinite(persistedForm.altitude) ? persistedForm.altitude : store.projectForm.altitude,
    communeCp: typeof persistedForm.communeCp === "string" ? persistedForm.communeCp : store.projectForm.communeCp
  };

  Object.assign(store.projectForm, location);
  return location;
}

function getRequestKey(city = "", postalCode = "") {
  return `${String(city || "").trim().toLowerCase()}::${String(postalCode || "").trim()}`;
}

function normalizeFlatValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "string") return value.trim();
  return "";
}

function formatGeorisquesDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function flattenObjectForTable(value, prefix = "", acc = {}) {
  if (value == null) return acc;
  if (typeof value !== "object" || Array.isArray(value)) {
    if (prefix) acc[prefix] = normalizeFlatValue(value);
    return acc;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (nestedValue != null && typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
      flattenObjectForTable(nestedValue, nextPrefix, acc);
    } else {
      acc[nextPrefix] = Array.isArray(nestedValue)
        ? normalizeFlatValue(JSON.stringify(nestedValue))
        : normalizeFlatValue(nestedValue);
    }
  });

  return acc;
}

function collectTableCandidates(value, acc = []) {
  if (Array.isArray(value)) {
    if (value.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
      acc.push(value.map((item) => flattenObjectForTable(item)));
    }
    value.forEach((item) => collectTableCandidates(item, acc));
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

  if (best?.length) return uniqueRows(best);
  if (data != null && typeof data === "object") return [flattenObjectForTable(data)];
  if (data == null || data === "") return [];
  return [{ value: normalizeFlatValue(data) }];
}

function formatTableColumnLabel(key = "") {
  return String(key || "")
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");
}

function getDatasetDescription(datasetKey = "") {
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
    mvt: "Données sur les mouvements de terrain",
    retrait_gonflement_argiles: "Retrait-gonflement des argiles",
    zonage_sismique: "Zonage sismique de la commune"
  };

  return descriptions[String(datasetKey || "").trim()] || "";
}

function renderSectionCard({ title, description = "", badge = "", action = "", body = "" }) {
  return `
    <div class="settings-card settings-card--param">
      <div class="settings-card__head">
        <div>
          <span class="settings-card__head-title">
            <h4>${escapeHtml(title)}</h4>
            ${action || (badge ? `<span class="settings-badge mono">${escapeHtml(badge)}</span>` : "")}
          </span>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
      </div>
      ${body}
    </div>
  `;
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

function renderDataset(dataset = {}) {
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
    description: getDatasetDescription(dataset.key),
    badge: status,
    body
  });
}

function getLocationDerivedMutedClass() {
  const georisques = ensureGeorisquesState();
  const currentKey = getRequestKey(store.projectForm?.city, store.projectForm?.postalCode);
  const resolvedKey = getRequestKey(georisques.query?.city, georisques.query?.postalCode);
  return resolvedKey && currentKey !== resolvedKey ? " is-muted" : "";
}

function getButtonLabel() {
  if (georisksUiState.isLoading) return "Récupération…";

  return shouldAutoRunProjectBaseDataEnrichment()
    ? "Enrichissement automatique activé"
    : "Récupérer les données Géorisques";
}

function getButtonTooltip() {
  if (georisksUiState.isLoading) return "Récupération en cours…";
  if (!shouldAutoRunProjectBaseDataEnrichment()) {
    return "Relancer manuellement l’enrichissement des données de base projet.";
  }
  return "Un enrichissement est lancé automatiquement après validation d’une modification de la localisation projet. Ce bouton permet aussi un relancement manuel.";
}

function getViewHtml() {
  const georisques = ensureGeorisquesState();
  const city = String(store.projectForm.city || "").trim();
  const postalCode = String(store.projectForm.postalCode || "").trim();
  const requestedAt = formatGeorisquesDate(georisques.requestedAt);
  const successCount = georisques.datasets.filter((item) => item.status === "success").length;
  const errorCount = georisques.datasets.filter((item) => item.status !== "success").length;
  const datasetsHtml = georisques.datasets.length
    ? georisques.datasets.map((dataset) => renderDataset(dataset)).join("")
    : '<div class="settings-empty-note">Aucune donnée chargée pour le moment.</div>';

  const summaryHtml = `
    <div class="settings-georisques-summary${getLocationDerivedMutedClass()}" data-location-derived>
      <div class="settings-georisques-summary__row"><strong>Entrée projet :</strong> ${escapeHtml(`${city || "—"} ${postalCode || ""}`.trim() || "—")}</div>
      <div class="settings-georisques-summary__row"><strong>Commune résolue :</strong> ${escapeHtml(georisques.commune?.name || "—")}</div>
      <div class="settings-georisques-summary__row"><strong>Code INSEE :</strong> ${escapeHtml(georisques.commune?.codeInsee || "—")}</div>
      <div class="settings-georisques-summary__row"><strong>Dernière récupération :</strong> ${escapeHtml(requestedAt || "—")}</div>
      <div class="settings-georisques-summary__row"><strong>Jeux récupérés :</strong> ${escapeHtml(String(successCount))}${errorCount ? ` / erreurs : ${escapeHtml(String(errorCount))}` : ""}</div>
    </div>
  `;

  const actionHtml = `
    <button
      type="button"
      class="gh-btn gh-btn--primary"
      id="projectSolidityGeorisksFetchBtn"
      title="${escapeHtml(getButtonTooltip())}"
      ${georisksUiState.isLoading ? "disabled" : ""}
    >
      ${escapeHtml(getButtonLabel())}
    </button>
  `;

  const errorHtml = georisques.error
    ? `<div class="settings-inline-error">${escapeHtml(georisques.error)}</div>`
    : "";

  return `
    <section class="settings-section is-active">
      ${renderSectionCard({
        title: "Géorisques",
        description: "Chargement de l'ensemble des réponses disponibles actuellement tentées au niveau commune dans le PoC.",
        action: actionHtml,
        body: `
          <div class="settings-location-derived-block${getLocationDerivedMutedClass()}" data-location-derived>
            ${summaryHtml}
          </div>
          ${errorHtml}
          <div class="settings-location-derived-block${getLocationDerivedMutedClass()}" data-location-derived>
            ${datasetsHtml}
          </div>
        `
      })}
    </section>
  `;
}

function rerender() {
  if (!currentRoot) return;
  renderSolidityGeorisks(currentRoot);
}

async function loadGeorisques({ force = false } = {}) {
  syncProjectLocationFromPersistedState();

  const city = String(store.projectForm.city || "").trim();
  const postalCode = String(store.projectForm.postalCode || "").trim();
  const requestKey = getRequestKey(city, postalCode);
  const georisques = ensureGeorisquesState();

  if (!city || !postalCode) {
    georisques.error = "Renseigne d'abord la ville et le code postal dans Paramètres > Localisation.";
    rerender();
    return null;
  }

  if (georisksUiState.isLoading) return null;
  if (!force && georisques.datasets.length && georisksUiState.lastRequestKey === requestKey) {
    return georisques;
  }

  georisksUiState.isLoading = true;
  georisques.error = "";
  rerender();

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
    georisksUiState.lastRequestKey = requestKey;
    persistCurrentProjectState();
    return store.projectForm.georisques;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ensureGeorisquesState().error = message;
    persistCurrentProjectState();
    return null;
  } finally {
    georisksUiState.isLoading = false;
    rerender();
  }
}

function bindEvents(root) {
  const fetchBtn = root.querySelector("#projectSolidityGeorisksFetchBtn");
  if (fetchBtn) {
    fetchBtn.addEventListener("click", () => {
      loadGeorisques({ force: true });
    });
  }
}

export function renderSolidityGeorisks(root) {
  if (!root) return;
  currentRoot = root;
  syncProjectLocationFromPersistedState();
  ensureGeorisquesState();
  root.innerHTML = getViewHtml();
  bindEvents(root);
  registerProjectPrimaryScrollSource(root.closest("#projectSolidityRouterScroll") || document.getElementById("projectSolidityRouterScroll"));
}
