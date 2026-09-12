// Le titre et le résumé d'une proposition, écrits à partir de son diff.
//
// Vingt-cinq propositions intitulées « Fondations superficielles —
// dimensionnement » : six mois plus tard la liste ne dit plus rien. Le client
// calcule le diff — ce qui change, de quelle valeur à quelle valeur, dans
// quelle zone — et l'envoie ici ; cette fonction rédige au-dessus.
//
// L'INSTRUCTION VIT ICI, ET NULLE PART AILLEURS. Elle n'est pas dupliquée dans
// le navigateur, ni testée par comparaison de texte comme celle de la note de
// dépôt : elle n'a pas à être lisible avec F12. Le client n'envoie que des
// données ; ce qu'on demande au modèle ne sort pas du serveur. C'est aussi ce
// qui empêche cette fonction d'être un relais ouvert vers un modèle payant —
// une instruction envoyée par le client la rendrait utilisable pour n'importe
// quoi.
//
// La règle « aucune valeur inventée » n'est pas seulement écrite dans la
// consigne : elle est VÉRIFIÉE, dans `redaction.js`, qui est testé en Node.
// Une consigne est un vœu ; un contrôle est une garantie.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/require-user.ts";
import { deposerLaConsommation, jetonsDeLaReponse } from "../_shared/consommation-ia.ts";
import { redactionDuTexte, redactionRecevable, REFUS } from "./redaction.js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = Deno.env.get("OPENAI_PROPOSITION_TITLE_MODEL") || "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = 500;
const MAX_FACTS_CHARS = 60000;

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
  "Tu nommes une proposition de modification de la mémoire d'un projet de construction.",
  "",
  "RÈGLE ABSOLUE : tu ne produis aucune valeur. Chaque chiffre que tu écris doit figurer",
  "tel quel dans les données reçues. Tu n'arrondis pas, tu ne convertis pas d'unité, tu",
  "n'additionnes pas, tu ne déduis aucune date. Un chiffre venu de toi serait indiscernable",
  "d'une donnée du projet, et personne ne va vérifier un titre.",
  "",
  "LE TITRE dit ce qui change et pour quelle partie de l'ouvrage, en une ligne, sans point",
  "final. Il commence par le sujet, pas par le nom de l'outil qui a calculé.",
  "  bon   : Massifs du bâtiment A descendus à 0,66 m après relevé d'altitude",
  "  mauvais : Fondations superficielles — dimensionnement",
  "  mauvais : Mise à jour des données du projet",
  "",
  "LE RÉSUMÉ tient en deux ou trois phrases : ce qui change, d'où cela vient, ce que le",
  "relecteur doit regarder. Il ne répète pas le tableau ligne à ligne — le relecteur l'a",
  "sous les yeux. Il ne conclut pas à la place de qui signera.",
  "",
  "Tu écris en français, au présent. Tu réponds UNIQUEMENT par un objet JSON :",
  '{"titre": "...", "resume": "..."}'
].join("\n");

/**
 * Ce qu'on met sous les yeux du modèle.
 *
 * Le diff, et rien d'autre : ni la mémoire entière, ni les documents, ni la
 * conversation. Ce qui n'est pas nécessaire à la phrase ne part pas — c'est
 * moins de jetons, et surtout moins de matière à reprendre par erreur.
 */
function buildUserMessage(facts: unknown): string {
  return `Voici le diff de la proposition.\n\n${JSON.stringify(facts, null, 2)}`;
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
    // Le dire, plutôt que de rendre un titre vide : l'écran gardera le titre
    // d'origine et saura pourquoi.
    return jsonResponse({ error: "LLM is not configured", code: "LLM_NOT_CONFIGURED" }, 503);
  }

  try {
    const body = await req.json();
    const projectId = typeof body?.project_id === "string" ? body.project_id : "";
    const facts = body?.facts ?? null;

    if (!projectId || !facts || typeof facts !== "object") {
      return jsonResponse({ error: "project_id and facts are required" }, 400);
    }

    const serialized = JSON.stringify(facts);
    if (serialized.length > MAX_FACTS_CHARS) {
      return jsonResponse({ error: "facts payload too large", code: "FACTS_TOO_LARGE" }, 413);
    }

    // Le projet doit exister. La proposition, elle, n'existe pas encore : on la
    // nomme **avant** de l'ouvrir, parce qu'un titre qu'on ne peut plus corriger
    // n'est pas une proposition de titre.
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: projet, error: projetError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (projetError || !projet) {
      return jsonResponse({ error: "project not found" }, 404);
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: CONSIGNE,
        input: buildUserMessage(facts),
        max_output_tokens: MAX_OUTPUT_TOKENS
      })
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("generate-proposition-title:llm-error", {
        status: response.status,
        details: details.slice(0, 500)
      });
      return jsonResponse({ error: "LLM request failed", code: "LLM_REQUEST_FAILED" }, 502);
    }

    // On garde la réponse entière : le décompte y est, et n'extraire que le
    // texte le jetterait avec elle.
    const rendu = await response.json();

    void deposerLaConsommation({
      projectId, ownerId: garde.user.id, model: MODEL,
      usageKind: "titre-de-proposition", jetons: jetonsDeLaReponse(rendu)
    });

    const brut = extractText(rendu);
    if (!brut) return jsonResponse({ error: "LLM returned nothing", code: "LLM_EMPTY_RESPONSE" }, 502);

    const lu = redactionDuTexte(brut);
    if (!lu) {
      console.error("generate-proposition-title:unreadable", { debut: brut.slice(0, 200) });
      return jsonResponse({ error: "LLM answer unreadable", code: "LLM_REFUSED", refus: REFUS.ILLISIBLE }, 422);
    }

    // Le contrôle. Une rédaction qui porte un chiffre absent du diff ne sort pas
    // d'ici : l'écran garde le titre d'origine, et dit lequel a été écarté et
    // pourquoi. Le taire ferait passer pour un choix ce qui est un refus.
    const verdict = redactionRecevable(lu, serialized);
    if (!verdict.ok) {
      console.error("generate-proposition-title:refused", { refus: verdict.refus, valeurs: verdict.valeurs });
      return jsonResponse({
        error: "LLM answer refused",
        code: "LLM_REFUSED",
        refus: verdict.refus,
        valeurs: verdict.valeurs ?? []
      }, 422);
    }

    return jsonResponse({ titre: verdict.titre, resume: verdict.resume, model: MODEL });
  } catch (error) {
    console.error("generate-proposition-title:error", String(error));
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});
