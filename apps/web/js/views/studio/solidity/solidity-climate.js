import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { getLastStudioToolResult, resolveStudioClimateTool } from "../../../services/studio-tools-service.js";
import { getEffectiveProjectLocation } from "./solidity-climate-tool-common.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { renderGhActionButton } from "../../ui/gh-split-button.js";

const TOOL_KEYS = ["snow", "wind", "frost"];
const TOOL_LABELS = {
  snow: "Neige",
  wind: "Vent",
  frost: "Gel"
};

const state = { loading: false, error: "", projectId: "", location: null, results: {} };

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
    <section class="arkolia-identity-preview arkolia-assise-card" data-solidity-tool-card="climate">
      <header class="arkolia-identity-preview__header">
        <div>
          <h3 class="arkolia-identity-preview__title">Neige, Vent &amp; Gel</h3>
          <p class="arkolia-identity-preview__meta">Résolution via service Supabase</p>
        </div>
      </header>
      <div class="arkolia-identity-preview__body">
        <p class="arkolia-identity-preview__meta">${escapeHtml(state.loading ? "Chargement..." : "Utilise la localisation projet actuelle.")}</p>
        ${state.error ? `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>` : ""}
        <div class="arkolia-identity-preview__coordinates">${renderCards()}</div>
      </div>
      <footer class="arkolia-identity-preview__footer" style="display:flex;gap:8px;">
        ${renderGhActionButton({ id: "solidityToolCalculate-climate", label: actionLabel, tone: "primary", size: "md", disabled: !!state.loading, mainAction: "" })}
        ${renderGhActionButton({ id: "solidityToolToSubject-climate", label: "Transformer en sujet", tone: "default", size: "md", disabled: !hasResult, mainAction: "" })}
      </footer>
    </section>
  `;
}

function renderCards() {
  return `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">${TOOL_KEYS.map((toolKey) => renderToolCard(toolKey)).join("")}</div>`;
}

function renderToolCard(toolKey) {
  const result = state.results?.[toolKey]?.result_payload || null;
  const title = TOOL_LABELS[toolKey] || toolKey;
  const details = toolKey === "snow"
    ? `<li>Zone neige: <strong>${escapeHtml(result?.snow_zone || "—")}</strong></li><li>Département: <strong>${escapeHtml(result?.department_code || "—")}</strong></li>`
    : toolKey === "wind"
      ? `<li>Zone vent: <strong>${escapeHtml(result?.wind_zone || "—")}</strong></li><li>Département: <strong>${escapeHtml(result?.department_code || "—")}</strong></li>`
      : `<li>H0: <strong>${escapeHtml(String(result?.h0_selected_m ?? "—"))}</strong></li><li>Altitude: <strong>${escapeHtml(String(result?.altitude ?? "—"))}</strong></li><li>H: <strong>${escapeHtml(String(result?.frost_depth_m ?? "—"))}</strong></li>`;

  return `
    <article class="arkolia-assise-card" style="padding:10px;">
      <h4 class="arkolia-identity-preview__title" style="font-size:14px;">${escapeHtml(title)}</h4>
      <ul>${details}</ul>
    </article>
  `;
}
