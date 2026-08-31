// Ce qu'une figure montre, et que le texte de l'avis ne dit pas.
//
// Une photo de rapport porte ce que sa phrase tait : l'ampleur d'une fissure,
// l'absence de repère de mesure, l'état de l'ouvrage autour. La question posée
// au modèle est donc **une seule**, et c'est celle-là — pas « décris cette
// image », qui rendrait une paraphrase du texte.
//
// La légende est **dérivée** : elle est écrite avec le nom du modèle qui l'a
// produite, et l'écran le dit. Elle ne remplace jamais ce que le bureau de
// contrôle a écrit — confondre les deux fabriquerait un faux.
//
// La description est demandée à la main, une figure à la fois : un rapport peut
// en porter trente, et les décrire toutes d'office coûterait trente appels pour
// une lecture que personne n'a demandée.

import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/require-user.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = Deno.env.get("OPENAI_FIGURE_MODEL") || "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = 400;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin"
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

const INSTRUCTION = [
  "Tu regardes une figure extraite d'un rapport de bureau de contrôle, dans un outil qui sert de mémoire à un projet de construction.",
  "",
  "Une seule question : QUE MONTRE CETTE IMAGE QUE LE TEXTE DE L'AVIS NE DIT PAS ? Tu ne paraphrases pas l'avis, tu décris ce qui s'ajoute à lui — l'ampleur, l'emplacement, l'état de l'ouvrage autour, la présence ou l'absence d'un repère de mesure.",
  "",
  "RÈGLE ABSOLUE : tu ne conclus pas. Tu ne dis pas si c'est grave, conforme, ou levé — ce sont des jugements qui appartiennent au bureau de contrôle et à celui qui décide. Tu décris ce qui est visible.",
  "",
  "Si l'image ne montre rien d'exploitable — une bande blanche, un fond, un logo —, réponds exactement : « Rien d'exploitable sur cette image. »",
  "",
  "Trois phrases au plus, en français, sans formule d'accroche."
].join("\n");

function toDataUrl(bytes: Uint8Array, contentType: string) {
  let binaire = "";
  for (const octet of bytes) binaire += String.fromCharCode(octet);
  return `data:${contentType};base64,${btoa(binaire)}`;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    if (!openAiApiKey) {
      return jsonResponse({ error: "LLM is not configured", code: "LLM_NOT_CONFIGURED" }, 503);
    }

    // Qui appelle ? Le portail ne le vérifie pas — il rejetterait le préflight du
    // navigateur, qui arrive sans autorisation. La porte est donc ici, après lui.
    const garde = await requireUser(req, corsHeaders);
    if ("response" in garde) return garde.response;

    try {
      const body = await req.json();
      const figureId = typeof body?.figure_id === "string" ? body.figure_id : "";
      if (!figureId) return jsonResponse({ error: "figure_id is required" }, 400);

      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { data: figure, error } = await supabase
        .from("avis_figures")
        .select("id,storage_bucket,storage_path,avis_reference,caption,caption_model")
        .eq("id", figureId)
        .single();

      if (error || !figure) return jsonResponse({ error: "figure not found" }, 404);

      // Déjà décrite : on rend ce qui existe plutôt que de payer deux fois la
      // même lecture.
      if (figure.caption) {
        return jsonResponse({ caption: figure.caption, model: figure.caption_model, cached: true });
      }

      const { data: fichier, error: erreurFichier } = await supabase.storage
        .from(figure.storage_bucket || "documents")
        .download(figure.storage_path);

      if (erreurFichier || !fichier) return jsonResponse({ error: "figure file not found" }, 404);

      const bytes = new Uint8Array(await fichier.arrayBuffer());
      const contexte = String(body?.sentence ?? "").trim();

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          instructions: INSTRUCTION,
          max_output_tokens: MAX_OUTPUT_TOKENS,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: contexte
                    ? `Texte de l'avis : « ${contexte} ». Que montre l'image qu'il ne dit pas ?`
                    : "Que montre cette image ?"
                },
                { type: "input_image", image_url: toDataUrl(bytes, fichier.type || "image/png") }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const details = await response.text().catch(() => "");
        console.error("describe-avis-figure:llm-error", { status: response.status, details: details.slice(0, 400) });
        return jsonResponse({ error: "LLM request failed", code: "LLM_REQUEST_FAILED" }, 502);
      }

      const payload = await response.json();
      const caption = String(payload?.output_text ?? "").trim() ||
        (Array.isArray(payload?.output)
          ? payload.output
              .flatMap((bloc: any) => bloc?.content ?? [])
              .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
              .join("")
              .trim()
          : "");

      if (!caption) return jsonResponse({ error: "LLM returned nothing", code: "LLM_EMPTY_RESPONSE" }, 502);

      await supabase
        .from("avis_figures")
        .update({ caption, caption_model: MODEL, caption_generated_at: new Date().toISOString() })
        .eq("id", figureId);

      return jsonResponse({ caption, model: MODEL, cached: false });
    } catch (error) {
      console.error("describe-avis-figure:error", String(error));
      return jsonResponse({ error: "Unexpected error" }, 500);
  }
});
