import { store } from "../../../store.js";
import { readPersistedCurrentProjectState } from "../../../services/project-state-storage.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { getLastStudioToolResult, resolveStudioClimateTool } from "../../../services/studio-tools-service.js";

export function getEffectiveProjectLocation() {
  const persisted = readPersistedCurrentProjectState();
  const persistedForm = persisted?.projectForm && typeof persisted.projectForm === "object" ? persisted.projectForm : {};
  const liveForm = store.projectForm && typeof store.projectForm === "object" ? store.projectForm : {};
  return {
    city: String(liveForm.city || persistedForm.city || "").trim(),
    postalCode: String(liveForm.postalCode || persistedForm.postalCode || "").trim(),
    latitude: Number.isFinite(Number(liveForm.latitude)) ? Number(liveForm.latitude) : Number.isFinite(Number(persistedForm.latitude)) ? Number(persistedForm.latitude) : null,
    longitude: Number.isFinite(Number(liveForm.longitude)) ? Number(liveForm.longitude) : Number.isFinite(Number(persistedForm.longitude)) ? Number(persistedForm.longitude) : null,
    altitude: Number.isFinite(Number(liveForm.altitude)) ? Number(liveForm.altitude) : Number.isFinite(Number(persistedForm.altitude)) ? Number(persistedForm.altitude) : null,
    codeInsee: String(liveForm.codeInsee || persistedForm.codeInsee || "").trim()
  };
}

export async function hydrateClimateToolState(state, toolKey) {
  state.loading = true;
  state.error = "";
  try {
    const projectId = await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    state.location = getEffectiveProjectLocation();
    if (!state.projectId) throw new Error("Projet introuvable.");
    state.lastResult = await getLastStudioToolResult({ projectId: state.projectId, toolKey });
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}

export async function calculateClimateTool(state, toolKey) {
  state.loading = true;
  state.error = "";
  try {
    const projectId = state.projectId || await resolveCurrentBackendProjectId();
    state.projectId = String(projectId || "").trim();
    state.location = getEffectiveProjectLocation();
    if (!state.projectId) throw new Error("Projet introuvable.");
    const response = await resolveStudioClimateTool({
      projectId: state.projectId,
      toolKey,
      location: state.location
    });
    state.lastResult = {
      result_payload: response?.result || null,
      markdown_summary: response?.markdown_summary || ""
    };
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.loading = false;
  }
}
