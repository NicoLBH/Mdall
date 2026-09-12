/**
 * Lire les avis d'un document de bureau de contrôle, par le modèle.
 *
 * ## Pourquoi cette fonction existe
 *
 * L'extraction en dur marchait sur **un** modèle de rapport. Le métier en
 * produit beaucoup plus — RICT, fiche d'examen de document, fiche de travaux,
 * rapport d'étape, RFCT, RVRAT — et par bureau de contrôle. Et les émetteurs
 * refont leurs maquettes : SOCOTEC vient de refaire les siennes. Un extracteur
 * par forme, c'est quarante-cinq extracteurs à réparer à chaque changement.
 *
 * Un appel s'exécute **une fois par pièce**, au versement, jamais à la lecture.
 * Comparé au coût de maintenance, un appel cher est bon marché.
 *
 * ## Elle est au serveur, et c'est la seule place possible
 *
 * La clé du modèle n'entre jamais dans le navigateur, et la consigne
 * d'extraction non plus : elle décrit ce que Mdall sait lire, et c'est du
 * savoir-faire. Le navigateur envoie des pages et reçoit des avis vérifiés.
 *
 * ## Ce qui revient est vérifié avant de partir
 *
 * Chaque avis rendu porte la ligne du document d'où il sort, et cette ligne est
 * recherchée dans le texte de la page — **ici**, avant la réponse. Ce qui ne se
 * retrouve pas est écarté et compté. Un modèle qui invente ne passe pas la
 * porte ; et ce qu'on a jeté se dit, parce que c'est la mesure de ce que la
 * lecture n'a pas su faire (règle 5).
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";
import { deposerLaConsommation, jetonsDeLaReponse } from "../_shared/consommation-ia.ts";
import {
  CONSIGNES, SCHEMA_DES_AVIS, avisAuFormatDuMoteur, pagesEnTexte, verifierLesAvis
} from "../_shared/avis-du-modele.js";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

/** Le même que l'extraction d'observations : un seul fournisseur à exploiter. */
const MODELE = "gpt-4.1-mini";
const MAX_CARACTERES = 120000;
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

    // Le portail ne vérifie pas l'appelant — il rejetterait le préflight du
    // navigateur, qui arrive sans autorisation. La porte est donc ici.
    const garde = await requireUser(req, corsHeaders);
    if ("response" in garde) return garde.response;

    if (req.method !== "POST") return reponse({ error: "Method not allowed" }, 405);

    const body = await req.json();
    const pages = Array.isArray(body?.pages) ? body.pages : [];
    const sourceId = String(body?.source_id ?? "").trim();

    // **Le projet ne sert qu'au compteur de consommation.** La relecture n'en a
    // pas besoin : elle ne voit que des pages. Il est donc facultatif — sans
    // lui, la consommation se range hors projet plutôt qu'au hasard.
    const projectId = String(body?.project_id ?? "").trim() || null;

    if (!pages.length) return reponse({ error: "pages is required" }, 400);

    const texte = pagesEnTexte(pages, { maxCaracteres: MAX_CARACTERES });
    if (!texte.trim()) return reponse({ error: "pages carry no text" }, 400);

    const appel = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELE,
        instructions: CONSIGNES,
        input: texte,
        max_output_tokens: MAX_JETONS,
        text: { format: { type: "json_schema", ...SCHEMA_DES_AVIS } }
      })
    });

    if (!appel.ok) {
      return reponse({ error: "OpenAI request failed", details: await appel.text() }, 502);
    }

    const rendu = await appel.json();

    void deposerLaConsommation({
      projectId, ownerId: garde.user.id, model: MODELE,
      usageKind: "extraction-avis", jetons: jetonsDeLaReponse(rendu)
    });
    const lu = lireLaReponse(rendu);
    if (!lu) return reponse({ error: "No structured output returned", raw: rendu }, 502);

    // **La porte.** Ce que le modèle n'a pas su citer ne sort pas d'ici.
    const { retenus, ecartes, pagesCorrigees } = verifierLesAvis({ avis: lu.avis ?? [], pages });

    return reponse({
      organisme: lu.organisme ?? null,
      type_de_rapport: lu.type_de_rapport ?? null,
      reference_du_rapport: lu.reference_du_rapport ?? null,
      emis_le: lu.emis_le ?? null,
      legende: Array.isArray(lu.legende) ? lu.legende : [],
      avis: avisAuFormatDuMoteur(retenus, { sourceId }),
      // Ce qui a été jeté, et pourquoi. Se dit, se compte, ne se cache pas.
      ecartes: ecartes.map((ecart: { motif: string }) => ecart.motif),
      pages_corrigees: pagesCorrigees,
      modele: MODELE
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
