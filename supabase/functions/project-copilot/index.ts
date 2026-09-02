/**
 * Le copilote d'un projet, côté serveur.
 *
 * Il remplace un webhook n8n public vers lequel le navigateur postait. Ce
 * webhook posait deux problèmes qu'aucun code servi au navigateur ne pouvait
 * résoudre : n'importe qui connaissant l'URL pouvait déclencher un appel payant,
 * et rien ne vérifiait que le demandeur avait le droit de lire le projet dont il
 * envoyait la mémoire. La porte est ici, sur notre propre infrastructure, à
 * côté des autres fonctions de Mdall.
 *
 * ## Ce qui est vérifié, dans cet ordre
 *
 *  1. **Qui appelle** — un jeton porteur qui désigne un utilisateur réel
 *     (`requireUser`). La clé anonyme du projet est elle-même un jeton signé :
 *     une simple vérification de présence la laisserait passer.
 *  2. **Ce qu'il a le droit de lire** — le projet est relu avec **le jeton de
 *     l'appelant**, donc à travers RLS. S'il ne peut pas lire la ligne, il n'a
 *     rien à demander sur ce projet, et l'appel s'arrête avant de coûter.
 *
 * L'ordre compte : on ne dépense rien avant d'avoir répondu aux deux questions.
 *
 * ## Rien n'est écrit. C'est le garde-fou, pas un oubli.
 *
 * Une conversation avec le copilote est **privée**, et « privée » ne peut pas
 * être une intention : ce doit être une propriété de la construction. Cette
 * fonction n'a donc aucune table, aucun `insert`, aucun client de service. Ce
 * qui n'est jamais écrit ne peut pas fuir par une politique RLS mal posée, ni
 * apparaître dans un fil de sujet, ni être exporté avec le projet.
 *
 * Les journaux suivent la même règle : on y compte des caractères, on n'y
 * recopie ni la question ni la réponse. Un journal partagé par l'équipe qui
 * contiendrait les questions de chacun serait exactement la fuite qu'on refuse.
 *
 * La contrepartie est réelle et assumée : rien ne se retrouve d'un poste à
 * l'autre. Le prix d'une conversation qui ne fuit pas.
 *
 * ## L'orchestration des utilitaires
 *
 * Un modèle de langage ne calcule pas : il rédige un calcul plausible. Les
 * utilitaires de l'Atelier, eux, calculent. Cette fonction fait donc
 * l'aiguilleur, et rien de plus :
 *
 *   elle décrit les outils au modèle, qui **choisit** lequel appeler ;
 *   elle rend la demande au navigateur, qui **exécute** ;
 *   elle repasse le résultat au modèle, qui **raconte**.
 *
 * **Le calcul n'a pas lieu ici.** Les utilitaires sont du JavaScript de
 * l'application, testés et affichés par les écrans de l'Atelier ; les porter
 * dans cette fonction en ferait une seconde implémentation, et « une valeur
 * écrite à deux endroits finit par diverger ». Le prix est un aller-retour de
 * plus par outil appelé ; il est bien inférieur à celui de deux spectres qui
 * ne s'accordent pas.
 *
 * L'échange est donc **sans mémoire d'un tour à l'autre** : le navigateur
 * renvoie les appels et leurs résultats, et la fonction reconstitue la suite.
 * Un état gardé côté serveur serait un état de plus à faire vivre, pour une
 * conversation qui appartient déjà au navigateur.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/require-user.ts";

type ToolDeclaration = {
  type?: string;
  name?: string;
  description?: string;
  parameters?: unknown;
};

/** Un appel déjà passé, et ce que le navigateur en a rapporté. */
type ToolExchange = {
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
};

type CopilotRequest = {
  project_id?: string;
  question?: string;
  history?: Array<{ role?: string; content?: string }>;
  memory?: { lue?: boolean; texte?: string };
  screen?: unknown;
  tools?: ToolDeclaration[];
  tool_exchanges?: ToolExchange[];
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

const MODEL = "gpt-4.1-mini";

/**
 * Les limites, et d'où elles viennent.
 *
 * La première version en portait six, toutes choisies à vue de nez — 60 000
 * caractères de mémoire, douze messages d'historique — et elles coupaient bien
 * avant que le modèle ne s'en plaigne. Le contexte arrivait tronqué sans que
 * personne l'ait décidé.
 *
 * Elles se dérivent maintenant d'une seule grandeur : la fenêtre du modèle.
 * `gpt-4.1-mini` accepte de l'ordre du million de jetons ; le français coûte
 * environ 3,5 caractères par jeton. On s'en tient à une fraction prudente —
 * assez pour qu'une mémoire de projet entière (quelque 75 000 caractères pour
 * trois cents affirmations) passe sans être touchée.
 *
 * Ce qui reste ici n'est donc plus une politique de coupe, c'est un garde-fou
 * contre une charge aberrante. Et quand il joue, il **se dit** : le modèle est
 * averti dans ses consignes qu'il lit un texte amputé.
 */
const CHARS_PAR_JETON = 3.5;
const BUDGET_JETONS = 200_000;
const BUDGET_CHARS = Math.floor(BUDGET_JETONS * CHARS_PAR_JETON);

const MAX_QUESTION_CHARS = 16_000;
const MAX_MEMORY_CHARS = 500_000;
const MAX_HISTORY_MESSAGES = 40;
const MAX_HISTORY_MESSAGE_CHARS = 20_000;
const MAX_SCREEN_CHARS = 20_000;
const MAX_TOOLS = 40;
const MAX_TOOL_EXCHANGES = 12;
const MAX_TOOL_OUTPUT_CHARS = 20_000;

const MARQUE_TRONQUE = "[…tronqué faute de place]";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function texte(value: unknown) {
  return String(value ?? "").trim();
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max)}\n\n${MARQUE_TRONQUE}`;
}

/**
 * Les consignes du copilote.
 *
 * Elles disent d'abord ce qu'il ne doit pas faire, parce que c'est là qu'un
 * assistant de projet nuit : en comblant un vide. Une mémoire qui ne dit rien
 * sur un point est une information — pas une invitation à improviser.
 */
function systemPrompt(memoryWasRead: boolean, tronque: boolean) {
  const regles = [
    "Tu es le copilote d'un projet de construction dans l'application Mdall.",
    "Tu réponds en français, en markdown, de façon brève et utile.",
    "",
    "La mémoire du projet t'est fournie ci-dessous. C'est la seule source sur laquelle tu peux t'appuyer pour dire ce que ce projet tient pour vrai.",
    "",
    "Règles, dans cet ordre :",
    "- Ce qui n'est pas dans la mémoire n'est pas connu de ce projet. Dis-le, ne le devine pas. Une valeur inventée sur un chantier coûte plus cher qu'une absence de réponse.",
    "- Cite ce sur quoi tu t'appuies : la clé de l'affirmation, sa date, et l'utilitaire qui l'a déduite quand il est indiqué.",
    "- Distingue les natures. Une hypothèse se conteste ; une contrainte fausse ne se conteste pas, elle se corrige — et cela veut dire qu'on a calculé faux.",
    "- Si une affirmation est marquée « à revérifier », dis-le avant de t'en servir.",
    "- Ce qui figure sous « Ce qui a été remplacé » ne vaut plus. Ne réponds jamais à partir de ces lignes sans préciser qu'elles sont périmées.",
    "- Tu ne crées rien et tu ne modifies rien : tu peux préparer un texte, quelqu'un le versera.",
    "",
    "Les utilitaires de l'Atelier te sont accessibles comme fonctions. Ils calculent, toi non :",
    "- Dès qu'une question demande une valeur qu'un utilitaire sait calculer, appelle-le. Ne calcule jamais toi-même, même si le calcul te paraît simple : un nombre plausible se relit sans qu'on le voie.",
    "- Reprends ses résultats **tels quels**, sans les arrondir, les convertir ni les corriger.",
    "- Cite l'utilitaire et sa version dans ta réponse : c'est ce qui la rend vérifiable.",
    "- S'il manque des entrées, l'utilitaire te le dit et l'écran demandera les valeurs à l'utilisateur. Annonce ce qui manque et arrête-toi là ; n'invente aucune valeur d'entrée pour pouvoir calculer quand même.",
    "- Un résultat d'utilitaire n'entre pas dans la mémoire du projet. C'est une exploration ; quelqu'un décidera.",
    "- Quand un résultat contredit ce que le projet tient pour vrai, l'utilitaire te donne l'écart. Montre-le, sans désigner de fautif : dis ce qui est calculé, ce qui est retenu, et ce qu'il faudrait reprendre.",
    "",
    "Tes connaissances générales du bâtiment servent à expliquer et à raisonner, jamais à fournir une valeur que ce projet n'a pas tranchée."
  ];

  if (!memoryWasRead) {
    regles.push(
      "",
      "ATTENTION : la mémoire de ce projet n'a pas pu être lue pour cette question. Tu ne sais donc rien de ce que ce projet tient pour vrai. Dis-le, et n'affirme ni ne nie aucune valeur du projet."
    );
  }

  if (tronque) {
    // Sans cette phrase, le modèle lirait « […tronqué faute de place] » comme
    // une curiosité du texte et conclurait à une absence là où il n'y a qu'une
    // coupe. Une troncature muette est un mensonge sur ce que le projet sait.
    regles.push(
      "",
      `ATTENTION : le texte reçu porte la marque « ${MARQUE_TRONQUE} ». Il est incomplet. Ne conclus jamais qu'une chose est absente de ce projet : dis que tu n'as reçu qu'une partie de sa mémoire.`
    );
  }

  return regles.join("\n");
}

/**
 * Ce que le modèle dit avoir consommé.
 *
 * Repris tel quel, jamais estimé : un compteur approché est un compteur faux, et
 * on lit un compteur pour décider d'un usage. Quand le champ manque, on rend
 * `null` — « 0 jeton » serait une affirmation, l'absence est un aveu.
 */
function extractUsage(payload: unknown) {
  const usage = (payload as Record<string, unknown>)?.usage as Record<string, unknown> | undefined;
  const nombre = (valeur: unknown) => (typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null);

  return {
    input_tokens: nombre(usage?.input_tokens ?? usage?.prompt_tokens),
    output_tokens: nombre(usage?.output_tokens ?? usage?.completion_tokens),
    total_tokens: nombre(usage?.total_tokens)
  };
}

/**
 * Les appels d'utilitaires que le modèle a décidés.
 *
 * Ils sont rendus au navigateur tels quels — `call_id` compris, qui est ce qui
 * permettra d'apparier le résultat à sa demande au tour suivant. Les renuméroter
 * ou les renommer casserait l'appariement, et le modèle lirait un résultat comme
 * la réponse à une autre question.
 */
function extractToolCalls(payload: unknown) {
  const output = Array.isArray((payload as Record<string, unknown>)?.output)
    ? (payload as Record<string, unknown>).output as Record<string, unknown>[]
    : [];

  return output
    .filter((item) => item?.type === "function_call")
    .map((item) => ({
      call_id: texte(item.call_id),
      name: texte(item.name),
      arguments: texte(item.arguments) || "{}"
    }))
    .filter((appel) => appel.call_id && appel.name);
}

function extractOpenAiText(payload: unknown): string {
  const data = payload as Record<string, unknown>;
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text;

  const output = Array.isArray(data?.output) ? data.output : [];
  const morceaux: string[] = [];
  for (const item of output) {
    const contenus = Array.isArray((item as Record<string, unknown>)?.content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];
    for (const contenu of contenus) {
      const text = (contenu as Record<string, unknown>)?.text;
      if (typeof text === "string") morceaux.push(text);
    }
  }
  return morceaux.join("").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 1. Qui appelle. Le portail ne peut pas le faire à notre place : il
  // rejetterait le préflight, qui arrive sans autorisation par construction.
  const garde = await requireUser(req, corsHeaders);
  if ("response" in garde) return garde.response;

  let payload: CopilotRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const projectId = texte(payload.project_id);
  const question = texte(payload.question);

  if (!projectId) return json({ error: "project_id est requis." }, 400);
  if (!question) return json({ error: "La question est vide." }, 400);

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";

  // 2. Ce qu'il a le droit de lire. La relecture se fait avec **son** jeton :
  // c'est RLS qui répond, pas nous. Un client de service ici rendrait la
  // vérification décorative.
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: projet, error: projetError } = await authClient
    .from("projects")
    .select("id,name")
    .eq("id", projectId)
    .maybeSingle();

  if (projetError) return json({ error: "Forbidden", details: projetError.message }, 403);
  if (!projet?.id) return json({ error: "Forbidden" }, 403);

  if (!openAiApiKey) {
    return json({ error: "Le copilote n'est pas configuré (clé du modèle absente)." }, 503);
  }

  const memoryWasRead = payload.memory?.lue === true;
  const memoire = truncate(texte(payload.memory?.texte), MAX_MEMORY_CHARS);

  const history = (Array.isArray(payload.history) ? payload.history : [])
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message?.role === "user" ? "user" : "assistant",
      content: truncate(texte(message?.content), MAX_HISTORY_MESSAGE_CHARS)
    }))
    .filter((message) => message.content);

  const ecran = truncate(JSON.stringify(payload.screen ?? null), MAX_SCREEN_CHARS);

  const contexte = [
    `# Projet\n\n${texte(projet.name) || "sans nom"}`,
    memoire || "# Mémoire du projet\n\n(aucune mémoire transmise)",
    `# Ce que l'utilisateur regarde\n\nCeci dit ce qui est affiché, jamais ce qui est vrai. N'en tire aucune affirmation sur le projet.\n\n\`\`\`json\n${ecran}\n\`\`\``,
    history.length
      ? `# La conversation jusqu'ici\n\n${history.map((message) => `**${message.role === "user" ? "Utilisateur" : "Toi"}** : ${message.content}`).join("\n\n")}`
      : "",
    `# La question\n\n${truncate(question, MAX_QUESTION_CHARS)}`
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  // Le dernier garde-fou : si l'ensemble dépasse encore le budget, on coupe —
  // et le modèle en est averti dans ses consignes. Une coupe qu'on ne signale
  // pas vaut une mémoire qu'on invente.
  const corps = truncate(contexte, BUDGET_CHARS);
  const tronque = corps.includes(MARQUE_TRONQUE);

  const outils = (Array.isArray(payload.tools) ? payload.tools : [])
    .slice(0, MAX_TOOLS)
    .filter((outil) => texte(outil?.name) && outil?.parameters);

  /**
   * La suite de l'échange, reconstituée depuis ce que le navigateur renvoie.
   *
   * Les deux items vont par paire et dans cet ordre : l'appel que le modèle a
   * décidé, puis ce que l'utilitaire a répondu. Rendre le second sans le
   * premier ferait lire au modèle un résultat qu'il n'a pas demandé.
   */
  const echanges = (Array.isArray(payload.tool_exchanges) ? payload.tool_exchanges : [])
    .slice(-MAX_TOOL_EXCHANGES)
    .filter((echange) => texte(echange?.call_id) && texte(echange?.name));

  const input: unknown[] = [
    { role: "user", content: [{ type: "input_text", text: corps }] }
  ];

  for (const echange of echanges) {
    input.push({
      type: "function_call",
      call_id: texte(echange.call_id),
      name: texte(echange.name),
      arguments: texte(echange.arguments) || "{}"
    });
    input.push({
      type: "function_call_output",
      call_id: texte(echange.call_id),
      output: truncate(texte(echange.output) || "{}", MAX_TOOL_OUTPUT_CHARS)
    });
  }

  // On compte, on ne recopie pas : un journal qui contiendrait les questions de
  // chacun serait la fuite même qu'on refuse.
  console.log("project-copilot:request", {
    model: MODEL,
    project_id: projectId,
    memory_was_read: memoryWasRead,
    memory_chars: memoire.length,
    history_messages: history.length,
    input_chars: corps.length,
    tools: outils.length,
    tool_exchanges: echanges.length,
    tronque
  });

  try {
    const reponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: systemPrompt(memoryWasRead, tronque),
        input,
        ...(outils.length ? { tools: outils } : {})
      })
    });

    if (!reponse.ok) {
      const details = await reponse.text().catch(() => "");
      console.error("project-copilot:model-error", { status: reponse.status, details_chars: details.length });
      return json({ error: `Le modèle a refusé la demande (${reponse.status}).` }, 502);
    }

    const brut = await reponse.json();
    const reply = extractOpenAiText(brut).trim();
    const usage = extractUsage(brut);
    const appels = extractToolCalls(brut);

    // Le modèle demande un ou plusieurs utilitaires : on rend la main au
    // navigateur, qui seul sait les exécuter. La réponse viendra au tour
    // suivant, quand il aura rapporté les résultats.
    if (appels.length > 0) {
      console.log("project-copilot:tool-calls", {
        project_id: projectId,
        outils: appels.map((appel) => appel.name),
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens
      });

      // Le texte éventuel qui accompagne l'appel est rendu aussi : le modèle
      // annonce parfois ce qu'il s'apprête à faire, et le taire donnerait un
      // écran muet pendant l'exécution.
      return json({ tool_calls: appels, reply_markdown: reply || null, usage });
    }

    if (!reply) {
      return json({ error: "Le modèle a répondu, mais sans contenu." }, 502);
    }

    console.log("project-copilot:reply", {
      project_id: projectId,
      reply_chars: reply.length,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens
    });

    // Rien n'est enregistré ici : ni la question, ni la réponse. Ce que le
    // navigateur en garde, il l'écrit sous sa propre identité, dans des tables
    // dont la politique est propriétaire seul.
    return json({ reply_markdown: reply, usage });
  } catch (error) {
    console.error("project-copilot:failed", { message: error instanceof Error ? error.message : "unknown" });
    return json({ error: "Le copilote est momentanément indisponible." }, 502);
  }
});
