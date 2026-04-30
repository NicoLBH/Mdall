import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { getLastStudioToolResult, resolveStudioClimateTool } from "../../../services/studio-tools-service.js";
import { getEffectiveProjectLocation } from "./solidity-climate-tool-common.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";
import { fetchGoogleMapsPlaceEmbedUrl } from "../../../services/google-maps-embed-service.js";
import { renderProjectLocationMapCard } from "../../shared/project-location-map-card.js";

const TOOL_KEYS = ["snow", "wind", "frost"];
const TOOL_LABELS = {
  snow: "Neige",
  wind: "Vent",
  frost: "Gel"
};

const state = { loading: false, error: "", projectId: "", location: null, results: {}, mapUrl: "", mapLoading: false };

export async function renderSolidityClimate(root, { force = false } = {}) {
  if (!root) return;
  if (!force && root.dataset.solidityClimateMounted === "true") return;
  root.dataset.solidityClimateMounted = "true";

  await hydrateState();
  render(root);

  root.onclick = async (event) => {
    const calculateTrigger = event.target.closest('[data-action-id="solidityToolCalculate-climate"]');
    if (calculateTrigger) {
      await calculateAll();
      render(root);
      return;
    }

    const toSubjectTrigger = event.target.closest('[data-action-id="solidityToolToSubject-climate"]');
    if (toSubjectTrigger) {
      console.info("[studio-tools] transform-to-subject.click", { toolKey: "climate" });
      console.info("[studio-tools] transform-to-subject.todo", { toolKeys: TOOL_KEYS });
    }
  };

  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

async function hydrateState() {
  state.loading = true;
  state.error = "";
  try {
    const projectId = await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    state.location = getEffectiveProjectLocation();
    if (!state.projectId) throw new Error("Projet introuvable.");
    const rows = await Promise.all(TOOL_KEYS.map((toolKey) => getLastStudioToolResult({ projectId: state.projectId, toolKey })));
    state.results = Object.fromEntries(rows.map((row, index) => [TOOL_KEYS[index], row]));
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}

async function calculateAll() {
  state.loading = true;
  state.error = "";
  try {
    const projectId = state.projectId || await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    state.location = getEffectiveProjectLocation();
    if (!state.projectId) throw new Error("Projet introuvable.");

    const responses = await Promise.all(TOOL_KEYS.map((toolKey) => resolveStudioClimateTool({
      projectId: state.projectId,
      toolKey,
      location: state.location
    })));

    state.results = Object.fromEntries(responses.map((response, index) => [
      TOOL_KEYS[index],
      { result_payload: response?.result || null, markdown_summary: response?.markdown_summary || "" }
    ]));
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}

function render(root) {
  const hasResult = TOOL_KEYS.some((toolKey) => Boolean(state.results?.[toolKey]?.result_payload));
  const actionLabel = state.loading ? "Calcul en cours..." : hasResult ? "Recalculer" : "Calculer";

  root.innerHTML = `
    <section class="settings-section is-active" data-solidity-tool-card="climate">
      <div class="settings-card settings-card--param studio-tool-card">
        <div class="settings-card__head studio-tool-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Zones et charges climatiques</h4>
              <div class="studio-tool-card__actions">
                ${renderGhActionButton({ id: "solidityToolToSubject-climate", label: "Transformer en sujet", tone: "default", size: "md", disabled: !hasResult, mainAction: "" })}
                ${renderGhActionButton({ id: "solidityToolCalculate-climate", label: actionLabel, tone: "primary", size: "md", disabled: !!state.loading, mainAction: "" })}
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          ${state.error ? `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>` : ""}
          <div data-solidity-climate-map class="studio-tool-map-layer">
            ${renderMapCard()}
          </div>
          <div class="studio-tool-overlay-grid" style="display:grid;grid-template-columns:300px minmax(0px, 1fr);gap:16px;align-items:start;">
            ${renderCards()}
          </div>
        </div>
      </div>
    </section>
  `;
  void refreshMapCard(root);
}

function renderCards() {
  return `<div class="studio-tool-cards-column">${renderAddressCard()}${TOOL_KEYS.map((toolKey) => renderToolCard(toolKey)).join("")}</div><div></div>`;
}

function renderAddressCard() {
  const location = state.location || {};
  const address = [location.address, location.postalCode, location.city].filter(Boolean).join(", ");
  return `<article class="studio-tool-info-card"><h4>Adresse</h4><ul><li>${escapeHtml(address || "—")}</li></ul></article>`;
}

function renderToolCard(toolKey) {
  const result = state.results?.[toolKey]?.result_payload || null;
  const title = TOOL_LABELS[toolKey] || toolKey;
  const altitudeValue = Number(result?.altitude ?? state.location?.altitude);
  const altitudeLabel = Number.isFinite(altitudeValue) ? `${Math.round(altitudeValue)} m` : "—";
  const details = toolKey === "snow"
    ? `<li>Région: <strong>${escapeHtml(result?.snow_zone || "—")}</strong></li><li>Altitude: <strong>${escapeHtml(altitudeLabel)}</strong></li>`
    : toolKey === "wind"
      ? `<li>Région: <strong>${escapeHtml(result?.wind_zone || "—")}</strong></li>`
      : `<li>Profondeur hors gel: <strong>${escapeHtml(String(result?.frost_depth_m ?? "—"))}</strong></li><li>H0: <strong>${escapeHtml(String(result?.h0_selected_m ?? "—"))}</strong></li>`;

  return `
    <article class="studio-tool-info-card">
      <h4 class="studio-tool-info-card-title">${escapeHtml(title)}</h4>
      <ul>${details}</ul>
    </article>
  `;
}

function renderMapCard() {
  return renderProjectLocationMapCard({
    latitude: state.location?.latitude,
    longitude: state.location?.longitude,
    embedUrl: state.mapUrl,
    isLoading: state.mapLoading,
    showSpinner: true,
    iframeTitle: "Carte Google Maps de la localisation du projet",
    height: "calc(100vh - 210px)",
    containerClassName: "studio-tool-map-card"
  });
}

async function refreshMapCard(root) {
  if (!root || !Number.isFinite(Number(state.location?.latitude)) || !Number.isFinite(Number(state.location?.longitude))) return;
  state.mapLoading = true;
  const host = root.querySelector("[data-solidity-climate-map]");
  if (host) host.innerHTML = renderMapCard();
  try {
    state.mapUrl = await fetchGoogleMapsPlaceEmbedUrl({ latitude: Number(state.location.latitude), longitude: Number(state.location.longitude), zoom: 16, mapType: "satellite" });
  } catch {
    state.mapUrl = "";
  } finally {
    state.mapLoading = false;
    if (host) host.innerHTML = renderMapCard();
  }
}
