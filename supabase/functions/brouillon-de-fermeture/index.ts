// Le brouillon de ce qu'on a tranché, écrit à partir du fil d'un sujet.
//
// Fermer un sujet demande d'écrire la question, ce qu'on retient, les possibles
// écartés, le motif. Tout est déjà dit dans le fil — le titre, la description,
// les commentaires —, et personne n'a envie de le recopier à la main à la fin
// d'une journée. C'est le travail d'un modèle : relire et remettre en forme.
//
// L'INSTRUCTION VIT ICI, ET NULLE PART AILLEURS. Elle n'est pas dupliquée dans
// le navigateur : ce qu'on demande au modèle ne sort pas du serveur, et l'on ne
// le lit pas avec F12. C'est aussi ce qui empêche cette fonction d'être un
// relais ouvert vers un modèle payant — une instruction envoyée par le client la
// rendrait utilisable pour n'importe quoi.
//
// Le client envoie le fil, il ne compose rien.
//
// LA GARANTIE N'EST PAS DANS LA CONSIGNE. « N'invente aucun chiffre » est un
// vœu. Le contrôle est dans `_shared/fermeture-du-modele.js`, testé en Node :
// tout groupe de caractères portant un chiffre doit se retrouver tel quel dans
// le fil, sinon le brouillon entier est écarté.
//
// ET CE QU'ON REND N'EST PAS UNE DÉCISION. C'est un brouillon, qui tombe dans
// les champs d'une fenêtre qu'un humain relit ; ce qui en sort est une
// proposition que quelqu'un signera. Deux portes humaines avant la mémoire.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/require-user.ts";
import { deposerLaConsommation, jetonsDeLaReponse } from "../_shared/consommation-ia.ts";
import { brouillonVerifie, phraseDesEcarts } from "../_shared/fermeture-du-modele.js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = Deno.env.get("OPENAI_FERMETURE_MODEL") || "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = 900;
const MAX_MATIERE_CHARS = 60000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

const CONSIGNE = [
  "Tu relis le fil d'un sujet de chantier qu'on vient de fermer, et tu écris le brouillon",
  "de ce qui a été tranché. Tu ne tranches rien toi-même : tu remets en forme ce qui est",
  "déjà écrit.",
  "",
  "RÈGLE ABSOLUE : tu n'écris aucun chiffre qui ne figure pas tel quel dans le fil. Pas",
  "d'arrondi, pas de conversion d'unité, pas d'addition, pas de date déduite. Un chiffre",
  "venu de toi serait indiscernable d'une valeur du projet, et il tomberait dans un champ",
  "que personne ne relira à 19 h. Recopie, ou n'écris rien.",
  "",
  "LA QUESTION dit ce sur quoi on a tranché, en une ligne, sous forme de question. Elle",
  "reprend les mots du fil.",
  "",
  "CE QU'ON RETIENT est la valeur qui entre en mémoire, écrite « Nom = valeur ». S'il n'y",
  "en a pas — le fil ne conclut rien —, tu laisses vide. Laisser vide est une réponse",
  "juste ; inventer une conclusion ne l'est jamais.",
  "",
  "LES POSSIBLES ÉCARTÉS sont ce que le fil a envisagé puis rejeté, avec la raison quand",
  "elle est dite. C'est le champ qui compte le plus : c'est la réponse à « pourquoi pas… ? »",
  "six mois plus tard. N'y mets que ce qui a vraiment été envisagé dans le fil.",
  "",
  "LE MOTIF dit d'où vient la décision : une étude, un calcul, un arbitrage. Si le fil ne",
  "le dit pas, tu laisses vide — tu n'écris pas « décision technique » pour remplir.",
  "",
  "Tu écris en français. Tu réponds UNIQUEMENT par un objet JSON :",
  '{"question": "...", "retenu": "...", "ecartes": [{"quoi": "...", "pourquoi": "..."}], "motif": "..."}'
].join("\n");

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const blocs = Array.isArray(payload?.output) ? payload.output : [];
  const morceaux: string[] = [];
  for (const bloc of blocs) {
    for (const part of bloc?.content ?? []) {
      if (typeof part?.text === "string") morceaux.push(part.text);
    }
  }
  return morceaux.join("").trim();
}

/** Le JSON du modèle, quand il l'a entouré de texte ou de balises. */
function lireLeJson(brut: string): unknown {
  const debut = brut.indexOf("{");
  const fin = brut.lastIndexOf("}");
  if (debut < 0 || fin <= debut) return null;

  try {
    return JSON.parse(brut.slice(debut, fin + 1));
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  // Qui appelle ? Le portail ne le vérifie pas — il rejetterait le préflight du
  // navigateur. La porte est donc ici : sans elle, qui connaît l'URL déclenche
  // un appel payant.
  const garde = await requireUser(req, corsHeaders);
  if ("response" in garde) return garde.response;

  if (!openAiApiKey) {
    // Le dire, plutôt que de rendre un brouillon vide : la fenêtre s'ouvrira
    // sans lui, ce qu'elle faisait jusqu'ici, et elle saura pourquoi.
    return jsonResponse({ error: "LLM is not configured", code: "LLM_NOT_CONFIGURED" }, 503);
  }

  try {
    const body = await req.json();
    const projectId = typeof body?.project_id === "string" ? body.project_id : "";
    const matiere = typeof body?.matiere === "string" ? body.matiere : "";

    if (!projectId || !matiere.trim()) {
      return jsonResponse({ error: "project_id and matiere are required" }, 400);
    }
    if (matiere.length > MAX_MATIERE_CHARS) {
      return jsonResponse({ error: "matiere too large", code: "MATIERE_TOO_LARGE" }, 413);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: projet, error: projetError } = await supabase
      .from("projects").select("id").eq("id", projectId).single();

    if (projetError || !projet) return jsonResponse({ error: "project not found" }, 404);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        instructions: CONSIGNE,
        input: `Voici le fil du sujet.\n\n${matiere}`,
        max_output_tokens: MAX_OUTPUT_TOKENS
      })
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("brouillon-de-fermeture:llm-error", {
        status: response.status, details: details.slice(0, 500)
      });
      return jsonResponse({ error: "LLM request failed", code: "LLM_REQUEST_FAILED" }, 502);
    }

    const rendu = await response.json();

    void deposerLaConsommation({
      projectId, ownerId: garde.user.id, model: MODEL,
      usageKind: "brouillon-de-fermeture", jetons: jetonsDeLaReponse(rendu)
    });

    const brut = extractText(rendu);
    if (!brut) return jsonResponse({ error: "LLM returned nothing", code: "LLM_EMPTY_RESPONSE" }, 502);

    // Le contrôle. Un brouillon qui porte un chiffre absent du fil ne sort pas
    // d'ici : la fenêtre s'ouvre vide, et dit pourquoi. Le taire ferait passer
    // pour un silence ce qui est un refus.
    const lu = brouillonVerifie(lireLeJson(brut), { matiere });
    if (!lu.brouillon) {
      console.error("brouillon-de-fermeture:refused", { ecarts: lu.ecarts, inventes: lu.inventes });
      return jsonResponse({
        error: "LLM answer refused",
        code: "LLM_REFUSED",
        ecarts: lu.ecarts,
        inventes: lu.inventes,
        dit: phraseDesEcarts(lu.ecarts, lu.inventes)
      }, 422);
    }

    return jsonResponse({ brouillon: lu.brouillon, model: MODEL });
  } catch (error) {
    console.error("brouillon-de-fermeture:error", String(error));
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});
