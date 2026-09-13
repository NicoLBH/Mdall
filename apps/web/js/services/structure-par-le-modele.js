/**
 * Demander au serveur de reconnaître la structure d'un document.
 *
 * ## Ce fichier ne reconnaît rien
 *
 * Il ne porte ni consigne, ni clé, ni modèle : la reconnaissance se passe
 * entièrement au serveur (`supabase/functions/structure-du-document`), et le
 * navigateur n'envoie que des pages. Une consigne descendue ici serait lisible
 * par quiconque ouvre les outils du navigateur.
 *
 * ## Elle ne bloque rien
 *
 * Une reconnaissance qui échoue rend `null`, et la transcription se fait comme
 * avant : page par page, sans savoir ce que les autres pages contiennent. On
 * perd la cohérence entre pages, pas la lecture — et l'écran le dit plutôt que
 * de le taire (règle 5).
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const URL_DE_LA_FONCTION = `${getSupabaseUrl()}/functions/v1/structure-du-document`;

const texte = (valeur) => String(valeur ?? "").trim();

/** Le projet, pour le compteur de consommation. La reconnaissance n'en a pas besoin. */
async function projetCourant() {
  try {
    const { resolveCurrentBackendProjectId } = await import("./project-supabase-sync.js");
    return (await resolveCurrentBackendProjectId()) || null;
  } catch {
    return null;
  }
}

/**
 * Reconnaître la structure, une fois.
 *
 * @param {{pages: {page: number, text: string}[]}} options les pages reposées
 * @returns {Promise<{ok: true, structure: object, pagesRegardees: number[], modele: string,
 *   jetons: object}|{ok: false, panne: string}>}
 */
export async function reconnaitreLaStructure({ pages = [] } = {}) {
  const lisibles = (Array.isArray(pages) ? pages : []).filter((page) => texte(page?.text));
  if (!lisibles.length) return { ok: false, panne: "" };

  let reponse = null;
  try {
    reponse = await fetch(URL_DE_LA_FONCTION, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        project_id: await projetCourant(),
        pages: lisibles.map((page) => ({ page: Number(page?.page), text: texte(page?.text) }))
      })
    });
  } catch {
    return { ok: false, panne: "la reconnaissance de structure n'a pas pu être demandée" };
  }

  if (!reponse.ok) {
    const refuse = await reponse.json().catch(() => null);
    const panne = refuse?.panne ?? null;
    const morceaux = [
      `HTTP ${reponse.status}`, texte(panne?.type), texte(panne?.code), texte(panne?.message)
    ].filter(Boolean);

    return { ok: false, panne: morceaux.length > 1 ? morceaux.join(" · ") : "" };
  }

  const rendu = await reponse.json().catch(() => null);
  const structure = rendu?.structure ?? null;
  if (!structure) return { ok: false, panne: "" };

  return {
    ok: true,
    structure,
    // L'échantillon n'est pas le document : ce qui n'a pas été regardé se dit.
    pagesRegardees: Array.isArray(rendu?.pages_regardees) ? rendu.pages_regardees : [],
    modele: texte(rendu?.modele),
    jetons: {
      entree: Number.isFinite(rendu?.jetons?.input_tokens) ? rendu.jetons.input_tokens : null,
      sortie: Number.isFinite(rendu?.jetons?.output_tokens) ? rendu.jetons.output_tokens : null
    }
  };
}
