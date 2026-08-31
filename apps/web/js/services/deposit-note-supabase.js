/**
 * Les allers-retours de la note de dépôt.
 *
 * La règle de ce module tient en une phrase : **une note qui n'a pas pu être
 * écrite ne s'invente pas.** Chaque échec rend `null`, et l'écran affiche
 * l'absence plutôt qu'un texte vide qui aurait l'air d'une note. Un lecteur qui
 * voit « la note n'a pas pu être écrite » sait quoi en penser ; un lecteur qui
 * voit une note creuse en conclut que le lot ne dit rien.
 *
 * Les notes s'empilent, elles ne se remplacent pas : la plus récente s'affiche,
 * les précédentes disent ce que le projet croyait comprendre du lot ce jour-là.
 */

import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const COLUMNS = "id,proposition_id,project_id,markdown,facts,fingerprint,model,source,generated_by,created_at";

async function request(path, { method = "GET", body = null, headers = {}, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!response.ok) throw new Error(`${path} (${response.status})`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

/**
 * La note en vigueur, ou rien.
 *
 * @returns {Promise<object|null>} la dernière note écrite, `null` si aucune —
 *   et `null` aussi si la base n'a pas répondu. L'appelant ne doit pas
 *   distinguer les deux : dans les deux cas, il n'a pas de note à montrer.
 */
export async function loadLatestNote(propositionId) {
  if (!propositionId) return null;

  try {
    const rows = await request("proposition_notes", {
      params: {
        select: COLUMNS,
        proposition_id: `eq.${propositionId}`,
        order: "created_at.desc",
        limit: "1"
      }
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Écrit une note de plus. Les précédentes restent. */
export async function saveNote({
  propositionId,
  projectId,
  markdown,
  facts = null,
  fingerprint = "",
  model = "",
  source = "machine"
} = {}) {
  const texte = String(markdown ?? "").trim();
  if (!propositionId || !projectId || !texte) return null;

  try {
    const generatedBy = (await getCurrentUser())?.id ?? null;
    const rows = await request("proposition_notes", {
      method: "POST",
      params: { select: COLUMNS },
      headers: { Prefer: "return=representation" },
      body: {
        proposition_id: propositionId,
        project_id: projectId,
        markdown: texte,
        facts,
        fingerprint: String(fingerprint || ""),
        model: String(model || ""),
        source,
        generated_by: generatedBy
      }
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Demande la rédaction d'une note à partir des faits.
 *
 * Seules les données partent : l'instruction vit dans la fonction, avec la clé
 * du fournisseur. Un client qui enverrait son propre texte ferait de cette
 * fonction un relais ouvert vers un modèle payant.
 *
 * **L'échec dit lequel.** « La note n'a pas pu être écrite » a envoyé quelqu'un
 * lire la console du navigateur pour découvrir qu'une fonction n'était pas
 * déployée ; c'est une réponse que l'écran pouvait donner. Un échec sans cause
 * n'est pas plus honnête qu'un texte inventé — il est seulement moins utile.
 *
 * @returns {Promise<{markdown: string, model: string}|{error: string}>}
 */
export async function requestDepositNote({ propositionId, facts } = {}) {
  if (!propositionId || !facts) return { error: "empty" };

  let response = null;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/generate-deposit-note`, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ proposition_id: propositionId, facts })
    });
  } catch {
    // Le navigateur n'a pas obtenu de réponse : fonction absente, hors ligne,
    // ou préflight refusé. De l'intérieur, les trois se ressemblent.
    return { error: "unreachable" };
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const code = String(payload?.code ?? "");
    if (response.status === 503 || code === "LLM_NOT_CONFIGURED") return { error: "unconfigured" };
    if (response.status === 404) return { error: "unreachable" };
    return { error: "refused" };
  }

  const payload = await response.json().catch(() => null);
  const markdown = String(payload?.markdown ?? "").trim();
  if (!markdown) return { error: "empty" };

  return { markdown, model: String(payload?.model ?? "") };
}
