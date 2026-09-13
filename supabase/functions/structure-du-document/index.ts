/**
 * Reconnaître la structure d'un document, avant de le transcrire.
 *
 * ## Pourquoi un appel de plus
 *
 * Une transcription page par page décide page par page : le même tableau gagne
 * dix colonnes à la page 1, huit à la page 2 et d'autres en-têtes à la page 3.
 * Non parce que le modèle lit mal, mais parce qu'on lui fait trancher douze fois
 * une question qui n'a qu'une réponse.
 *
 * Cette fonction tranche une fois. Elle regarde un échantillon de pages, rend le
 * squelette — nature, découpage, en-tête et pied répétés, tableaux et leurs
 * colonnes — et ce squelette entre dans la consigne de transcription.
 *
 * ## Ce qu'elle coûte, et pourquoi c'est peu
 *
 * Elle ne voit que six pages au plus, et ne rend qu'un squelette : quelques
 * centaines de jetons en sortie là où la transcription en rend des dizaines de
 * milliers. C'est l'appel le moins cher des trois, et celui qui décide le plus.
 *
 * ## Elle ne bloque rien
 *
 * Une reconnaissance qui échoue laisse la transcription se faire comme avant.
 * On perd la cohérence entre pages, pas la lecture — et l'écran le dit.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";
import { deposerLaConsommation, jetonsDeLaReponse } from "../_shared/consommation-ia.ts";
import { pagesEnTexte } from "../_shared/citation-verifiee.js";
import { panneDuFournisseur } from "../_shared/sujets-du-modele.js";
import {
  CONSIGNES_DE_STRUCTURE,
  SCHEMA_DE_LA_STRUCTURE,
  pagesPourLaStructure,
  structureLue
} from "../_shared/structure-du-document.js";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

/**
 * Le même modèle que la transcription : c'est le même métier.
 *
 * Reconnaître qu'une colonne étroite sans en-tête est la date de fermeture d'une
 * remarque est du raisonnement sur la mise en page. Le petit modèle rend là des
 * squelettes plausibles et faux — et un squelette faux est pire qu'aucun, parce
 * que les douze pages obéiront à la mauvaise forme.
 */
const MODELE = Deno.env.get("OPENAI_STRUCTURE_MODEL") || "gpt-5";

/** Six pages au plus, et de quoi les porter. Le squelette, lui, est petit. */
const PAGES_REGARDEES = 6;
const MAX_CARACTERES = 90000;
const MAX_JETONS = 8000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function reponse(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), { status, headers: jsonHeaders });
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const garde = await requireUser(req, corsHeaders);
    if ("response" in garde) return garde.response;

    if (req.method !== "POST") return reponse({ error: "Method not allowed" }, 405);

    const body = await req.json();
    const pages = Array.isArray(body?.pages) ? body.pages : [];
    const projectId = String(body?.project_id ?? "").trim() || null;

    if (!pages.length) return reponse({ error: "pages is required" }, 400);

    const regardees = pagesPourLaStructure(pages, { combien: PAGES_REGARDEES });
    const texte = pagesEnTexte(regardees, { maxCaracteres: MAX_CARACTERES });
    if (!texte.trim()) return reponse({ error: "pages carry no text" }, 400);

    const appel = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELE,
        instructions: CONSIGNES_DE_STRUCTURE,
        input: texte,
        max_output_tokens: MAX_JETONS,
        // Reconnaître une forme demande de comparer plusieurs pages entre
        // elles : c'est là qu'un peu de raisonnement paie le plus.
        reasoning: { effort: "medium" },
        text: { format: { type: "json_schema", ...SCHEMA_DE_LA_STRUCTURE } }
      })
    });

    if (!appel.ok) {
      return reponse({
        error: "OpenAI request failed",
        panne: panneDuFournisseur(await appel.text().catch(() => ""), appel.status)
      }, 502);
    }

    const rendu = await appel.json();

    void deposerLaConsommation({
      projectId, ownerId: garde.user.id, model: MODELE,
      usageKind: "structure-du-document", jetons: jetonsDeLaReponse(rendu)
    });

    const lu = lireLaReponse(rendu);
    if (!lu) {
      return reponse({
        error: "No structured output returned",
        panne: {
          status: 200,
          type: String(rendu?.status ?? "") === "incomplete" ? "reponse_coupee" : "reponse_illisible",
          code: String(rendu?.incomplete_details?.reason ?? ""),
          message: "La reconnaissance de structure n'a rien rendu de structuré."
        }
      }, 502);
    }

    return reponse({
      structure: structureLue(lu),
      /** Les pages effectivement regardées. Se disent : l'échantillon n'est pas le document. */
      pages_regardees: regardees.map((page: { page?: unknown }) => Number(page?.page)),
      modele: MODELE,
      jetons: jetonsDeLaReponse(rendu)
    });
  } catch (error) {
    return reponse({ error: "Unexpected error", details: String(error) }, 500);
  }
});

/** Ce que l'API rend, quel que soit le chemin par lequel elle le rend. */
function lireLaReponse(rendu: Record<string, unknown>): Record<string, unknown> | null {
  const direct = (rendu as { output_parsed?: unknown })?.output_parsed;
  if (direct && typeof direct === "object") return direct as Record<string, unknown>;

  const texte = (rendu as { output_text?: unknown })?.output_text
    ?? ((rendu as { output?: { content?: { text?: string }[] }[] })?.output ?? [])
      .flatMap((bloc) => bloc?.content ?? [])
      .map((morceau) => morceau?.text ?? "")
      .join("");

  if (typeof texte !== "string" || !texte.trim()) return null;

  try {
    return JSON.parse(texte);
  } catch {
    return null;
  }
}
