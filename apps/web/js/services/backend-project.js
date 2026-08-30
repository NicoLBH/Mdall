/**
 * Le projet Supabase qui correspond au projet ouvert à l'écran.
 *
 * Cette résolution vivait dans `analysis-runner.js`, où seule l'analyse d'un PDF
 * savait s'en servir. C'était une conséquence d'un défaut plus profond : **le
 * dépôt d'un document n'existait pas comme acte autonome.** Déposer se faisait
 * en passant, à l'intérieur de l'analyse, si bien que refuser l'analyse revenait
 * à ne rien déposer du tout — pendant que l'écran annonçait « le dépôt a été
 * enregistré ».
 *
 * Sortir cette fonction est le premier geste qui rend le dépôt indépendant :
 * pour écrire un document, il faut savoir dans quel projet, et cela ne regarde
 * pas l'analyse.
 */

import { store } from "../store.js";
import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";

function getFrontendProjectKey() {
  return String(store.currentProjectId || store.currentProject?.id || "default").trim() || "default";
}

function readFrontendProjectMap() {
  try {
    const raw = localStorage.getItem(FRONT_PROJECT_MAP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFrontendProjectMap(map) {
  try {
    localStorage.setItem(FRONT_PROJECT_MAP_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // no-op
  }
}

/**
 * Le projet Supabase déjà connu du projet courant, sans jamais en créer.
 *
 * Lire n'est pas écrire : une lecture qui créerait un projet en ferait naître un
 * à chaque coup d'œil sur un écran vide.
 */
export function mappedBackendProjectId() {
  return readFrontendProjectMap()[getFrontendProjectKey()] || "";
}

/**
 * Le projet Supabase du projet courant, créé s'il n'existe pas encore.
 *
 * La correspondance entre le projet de l'écran et celui de la base est gardée
 * dans le navigateur : c'est ainsi que le premier dépôt d'un projet crée sa
 * ligne, et que les suivants la retrouvent.
 */
export async function ensureBackendProject() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    throw new Error("Utilisateur authentifié introuvable pour la création du projet.");
  }

  const frontendProjectKey = getFrontendProjectKey();
  const map = readFrontendProjectMap();
  if (map[frontendProjectKey]) return map[frontendProjectKey];

  const projectName =
    String(store.currentProject?.name || store.projectForm?.projectName || frontendProjectKey).trim() ||
    frontendProjectKey;

  const description = [
    `Front project key: ${frontendProjectKey}`,
    store.projectForm?.city ? `Ville: ${store.projectForm.city}` : "",
    store.projectForm?.currentPhase ? `Phase: ${store.projectForm.currentPhase}` : ""
  ]
    .filter(Boolean)
    .join(" · ");

  const url = new URL(`${SUPABASE_URL}/rest/v1/projects`);
  url.searchParams.set("select", "id,name");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify({ name: projectName, description, owner_id: currentUser.id })
  });

  if (!res.ok) {
    throw new Error(`projects insert failed (${res.status}): ${await res.text().catch(() => "")}`);
  }

  const rows = await res.json();
  const row = Array.isArray(rows) ? (rows[0] ?? null) : rows;
  if (!row?.id) throw new Error("projects insert succeeded without id");

  map[frontendProjectKey] = row.id;
  writeFrontendProjectMap(map);
  return row.id;
}
