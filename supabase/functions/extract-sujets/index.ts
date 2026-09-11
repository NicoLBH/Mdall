/**
 * Lire les points à traiter d'un compte rendu de chantier, par le modèle.
 *
 * ## Pourquoi cette fonction existe
 *
 * Déposer un compte rendu de chantier n'ajoutait aucun sujet. L'ancienne
 * pipeline en produisait bien, mais à partir d'un PDF et **sans proposition** :
 * elle contournait la règle 1, et elle s'en va avec cette version. Ce qui la
 * remplace ne verse rien — il propose, et quelqu'un tranche.
 *
 * ## Elle est au serveur, et c'est la seule place possible
 *
 * La clé du modèle n'entre jamais dans le navigateur, et la consigne de lecture
 * non plus : elle décrit ce que Mdall sait lire d'un compte rendu, et c'est du
 * savoir-faire. Le navigateur envoie des pages et reçoit des points vérifiés.
 *
 * ## Ce qui revient est vérifié avant de partir
 *
 * Chaque point rendu porte la ligne du compte rendu d'où il sort, et cette
 * ligne est recherchée dans le texte de la page — **ici**, avant la réponse.
 * Ce qui ne se retrouve pas est écarté et compté.
 *
 * Le garde-fou pèse plus lourd ici que pour les avis : un point inventé est
 * plausible. « Reprise d'étanchéité en toiture terrasse » pourrait figurer dans
 * n'importe quel compte rendu, et rien dans la réponse du modèle ne le
 * distinguerait d'un vrai. Ce qui l'en distingue, c'est le document.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";
import {
  CONSIGNES, SCHEMA_DES_SUJETS, pagesEnTexte, sujetsAuFormatDuMoteur, verifierLesSujets
} from "../_shared/sujets-du-modele.js";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

/** Le même que les deux autres lectures : un seul fournisseur à exploiter. */
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
        text: { format: { type: "json_schema", ...SCHEMA_DES_SUJETS } }
      })
    });

    if (!appel.ok) {
      return reponse({ error: "OpenAI request failed", details: await appel.text() }, 502);
    }

    const rendu = await appel.json();
    const lu = lireLaReponse(rendu);
    if (!lu) return reponse({ error: "No structured output returned", raw: rendu }, 502);

    // **La porte.** Ce que le modèle n'a pas su citer ne sort pas d'ici.
    const { retenus, ecartes, pagesCorrigees } = verifierLesSujets({
      sujets: (lu.sujets as unknown[]) ?? [],
      pages
    });

    return reponse({
      numero_de_reunion: lu.numero_de_reunion ?? null,
      tenue_le: lu.tenue_le ?? null,
      redige_par: lu.redige_par ?? null,
      sujets: sujetsAuFormatDuMoteur(retenus, { sourceId }),
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
