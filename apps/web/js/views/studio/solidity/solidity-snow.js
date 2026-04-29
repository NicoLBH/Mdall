import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { calculateClimateTool, hydrateClimateToolState } from "./solidity-climate-tool-common.js";
import { renderSolidityToolCard } from "./solidity-tool-card.js";

const state = { loading: false, error: "", lastResult: null, projectId: "", location: null };

export async function renderSoliditySnow(root, { force = false } = {}) {
  if (!root) return;
  if (!force && root.dataset.soliditySnowMounted === "true") return;
  root.dataset.soliditySnowMounted = "true";

  await hydrateClimateToolState(state, "snow");
  render(root);

  root.onclick = async (event) => {
    const actionRoot = event.target.closest(".gh-action");
    const actionId = String(actionRoot?.dataset?.actionId || "").trim();
    if (actionId === "solidityToolCalculate-snow") {
      console.info("[studio-tools] snow.calculate.click");
      await calculateClimateTool(state, "snow");
      render(root);
      return;
    }
    if (actionId === "solidityToolToSubject-snow") {
      console.info("[studio-tools] transform-to-subject.todo", { toolKey: "snow" });
    }
  };

  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}

function render(root) {
  const result = state.lastResult?.result_payload || null;
  const details = state.error
    ? `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>`
    : result
      ? `<ul><li>Zone neige: <strong>${escapeHtml(result.snow_zone || "—")}</strong></li><li>Département: <strong>${escapeHtml(result.department_code || "—")}</strong></li></ul>`
      : `<p class="gh-text-muted">Aucun résultat calculé pour le moment.</p>`;

  root.innerHTML = renderSolidityToolCard({
    toolKey: "snow",
    title: "Neige",
    subtitle: "Résolution via service Supabase",
    statusText: state.loading ? "Chargement..." : "Utilise la localisation projet actuelle.",
    detailsHtml: details,
    isLoading: state.loading,
    hasResult: Boolean(result)
  });
}
