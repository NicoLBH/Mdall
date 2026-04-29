import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { calculateClimateTool, hydrateClimateToolState } from "./solidity-climate-tool-common.js";
import { renderSolidityToolCard } from "./solidity-tool-card.js";

const state = { loading: false, error: "", lastResult: null, projectId: "", location: null };

export async function renderSolidityFrost(root, { force = false } = {}) {
  if (!root) return;
  if (!force && root.dataset.solidityFrostMounted === "true") return;
  root.dataset.solidityFrostMounted = "true";

  await hydrateClimateToolState(state, "frost");
  render(root);

  root.onclick = async (event) => {
    const calculateTrigger = event.target.closest('[data-action-id="solidityToolCalculate-frost"]');
    if (calculateTrigger) {
      console.info("[studio-tools] calculate.click", { toolKey: "frost" });
      await calculateClimateTool(state, "frost");
      render(root);
      return;
    }

    const toSubjectTrigger = event.target.closest('[data-action-id="solidityToolToSubject-frost"]');
    if (toSubjectTrigger) {
      console.info("[studio-tools] transform-to-subject.click", { toolKey: "frost" });
      console.info("[studio-tools] transform-to-subject.todo", { toolKey: "frost" });
    }
  };

  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

function render(root) {
  const result = state.lastResult?.result_payload || null;
  const details = state.error
    ? `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>`
    : result
      ? `<ul><li>H0: <strong>${escapeHtml(String(result.h0_selected_m ?? "—"))}</strong></li><li>Altitude: <strong>${escapeHtml(String(result.altitude ?? "—"))}</strong></li><li>H: <strong>${escapeHtml(String(result.frost_depth_m ?? "—"))}</strong></li></ul>`
      : `<p class="gh-text-muted">Aucun résultat calculé pour le moment.</p>`;

  root.innerHTML = renderSolidityToolCard({ toolKey: "frost", title: "Gel", subtitle: "Résolution via service Supabase", statusText: state.loading ? "Chargement..." : "Utilise la localisation projet actuelle.", detailsHtml: details, isLoading: state.loading, hasResult: Boolean(result) });
}
