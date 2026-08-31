// La rédaction d'une note de dépôt.
//
// Le client calcule les faits — documents lus, avis apparus, avis modifiés,
// contradictions, documents illisibles — et les envoie ici. Cette fonction ne
// lit aucun PDF, n'interroge aucun moteur d'analyse : elle rédige au-dessus de
// ce qui a déjà été établi, et rend du Markdown.
//
// Deux raisons pour que l'instruction vive ici et pas dans le navigateur :
// la clé du fournisseur ne doit jamais atteindre le client, et une instruction
// envoyée par le client ferait de cette fonction un relais ouvert vers un
// modèle payant. Le client n'envoie que des données.
//
// Le plan et la règle absolue sont dupliqués depuis `apps/web/js/services/
// deposit-note.js`, qui les teste. Un test compare les deux : s'ils divergent,
// il échoue.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/require-user.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = Deno.env.get("OPENAI_DEPOSIT_NOTE_MODEL") || "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = 3000;
const MAX_FACTS_CHARS = 200000;

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

const PLAN = [
  "## Ce que ce lot apporte — la nature des documents et ce qu'ils traitent",
  "## L'état avant — ce que le projet savait déjà de ces sujets",
  "## Ce que le lot change — apparitions, modifications, contradictions",
  "## L'état après, si la proposition est fusionnée",
  "## Ce qui reste à trancher"
];

const REGLE = [
  "Tu rédiges la note de dépôt d'un lot de documents de chantier, dans un outil qui sert de mémoire à un projet de construction.",
  "",
  "RÈGLE ABSOLUE : tu n'ajoutes aucun fait. Chaque chiffre, chaque référence, chaque nom de document que tu écris doit provenir des faits fournis. Si une information manque, tu écris qu'elle manque. Une note qui invente est pire qu'une absence de note, parce qu'elle sera relue dans six mois comme un procès-verbal.",
  "",
  "Ce qui est marqué tronqué l'est : dis-le (« et 24 autres »), n'écris jamais une liste partielle comme si elle était complète.",
  "",
  "Écris en français, au présent, sans jargon anglais, sans formule d'accroche ni de conclusion. Tu ne t'adresses pas au lecteur, tu décris un état.",
  "",
  "Format : Markdown. Utilise les titres de niveau 2 donnés ci-dessous, dans cet ordre, sans en ajouter ni en retirer. Un tableau est le bon outil pour un avant/après ; utilise-le quand il y a des mouvements à comparer. Pas d'images (aucune ne t'est fournie).",
  "",
  "Une section sans matière se dit en une phrase — « Aucun avis n'est modifié. » — plutôt que d'être gonflée."
].join("\n");

function buildUserMessage(facts: unknown) {
  return [
    "Voici les faits relevés par l'analyse. Rédige la note à partir d'eux, et d'eux seuls.",
    "",
    "```json",
    JSON.stringify(facts, null, 2),
    "```",
    "",
    "Rappel : aucun fait ajouté. Ce qui n'est pas dans ces données n'existe pas pour cette note."
  ].join("\n");
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  // Qui appelle ? Le portail ne le vérifie pas — il rejetterait le préflight du
  // navigateur, qui arrive sans autorisation. La porte est donc ici, après lui.
  // Sans elle, qui connaît l'URL déclenche un appel payant.
  const garde = await requireUser(req, corsHeaders);
  if ("response" in garde) return garde.response;

  if (!openAiApiKey) {
    // Dire que la note n'a pas pu être écrite vaut mieux que d'en écrire une
    // vide : l'écran affichera l'absence, pas un texte sans contenu.
    return jsonResponse({ error: "LLM is not configured", code: "LLM_NOT_CONFIGURED" }, 503);
  }

  try {
    const body = await req.json();
    const propositionId = typeof body?.proposition_id === "string" ? body.proposition_id : "";
    const facts = body?.facts ?? null;

    if (!propositionId || !facts || typeof facts !== "object") {
      return jsonResponse({ error: "proposition_id and facts are required" }, 400);
    }

    const serialized = JSON.stringify(facts);
    if (serialized.length > MAX_FACTS_CHARS) {
      return jsonResponse({ error: "facts payload too large", code: "FACTS_TOO_LARGE" }, 413);
    }

    // La proposition doit exister : une note sans proposition n'a nulle part où
    // aller, et écrire quand même reviendrait à payer pour rien.
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: proposition, error: propositionError } = await supabase
      .from("propositions")
      .select("id, project_id, status")
      .eq("id", propositionId)
      .single();

    if (propositionError || !proposition) {
      return jsonResponse({ error: "proposition not found" }, 404);
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: `${REGLE}\n\nPlan imposé :\n${PLAN.join("\n")}`,
        input: buildUserMessage(facts),
        max_output_tokens: MAX_OUTPUT_TOKENS
      })
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("generate-deposit-note:llm-error", { status: response.status, details: details.slice(0, 500) });
      return jsonResponse({ error: "LLM request failed", code: "LLM_REQUEST_FAILED" }, 502);
    }

    const payload = await response.json();
    const markdown = extractText(payload);

    if (!markdown) {
      return jsonResponse({ error: "LLM returned nothing", code: "LLM_EMPTY_RESPONSE" }, 502);
    }

    return jsonResponse({
      markdown,
      model: MODEL,
      project_id: proposition.project_id
    });
  } catch (error) {
    console.error("generate-deposit-note:error", String(error));
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});
