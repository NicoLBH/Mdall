import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { calculateClimateTool, hydrateClimateToolState } from "./solidity-climate-tool-common.js";
import { renderSolidityToolCard } from "./solidity-tool-card.js";

const state = { loading: false, error: "", lastResult: null, projectId: "", location: null };

export async function renderSolidityWind(root, { force = false } = {}) {
  if (!root) return;
  if (!force && root.dataset.solidityWindMounted === "true") return;
  root.dataset.solidityWindMounted = "true";

  await hydrateClimateToolState(state, "wind");
  render(root);

  root.onclick = async (event) => {
    if (event.target.closest("#solidityToolCalculate-wind")) {
      await calculateClimateTool(state, "wind");
      render(root);
      return;
    }
    if (event.target.closest("#solidityToolToSubject-wind")) {
      console.info("[studio-tools] transform-to-subject.todo", { toolKey: "wind" });
    }
  };

  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

function render(root) {
  const result = state.lastResult?.result_payload || null;
  const details = state.error
    ? `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>`
    : result
      ? `<ul><li>Zone vent: <strong>${escapeHtml(result.wind_zone || "—")}</strong></li><li>Département: <strong>${escapeHtml(result.department_code || "—")}</strong></li></ul>`
      : `<p class="gh-text-muted">Aucun résultat calculé pour le moment.</p>`;

  root.innerHTML = renderSolidityToolCard({ toolKey: "wind", title: "Vent", subtitle: "Résolution via service Supabase", statusText: state.loading ? "Chargement..." : "Utilise la localisation projet actuelle.", detailsHtml: details, isLoading: state.loading, hasResult: Boolean(result) });
}
