import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type ExchangeRequest = {
  subject_id?: string;
  body_markdown?: string;
  is_ephemeral?: boolean;
  parent_message_id?: string | null;
  mentions?: unknown[];
};

type MessageContextItem = {
  id: string;
  created_at: string;
  origin: string;
  visibility: string;
  visible_until: string | null;
  body_markdown: string;
};

type SubjectMdallContext = {
  project: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    title: string;
    status: string;
    description: string;
    created_at: string | null;
    updated_at: string | null;
  };
  relations: {
    parent_subject: { id: string; title: string; status: string } | null;
    children_subjects: Array<{ id: string; title: string; status: string }>;
    labels: Array<{ id: string; name: string }>;
    assignees: Array<{ id: string; display_name: string }>;
  };
  recent_messages: MessageContextItem[];
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

const MODEL = "gpt-4.1-mini";
const MAX_MESSAGE_HISTORY = 25;
const MAX_SUBJECT_DESCRIPTION_CHARS = 4000;
const MAX_MESSAGE_CHARS = 1000;
const MAX_PROMPT_CHARS = 28000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Missing Authorization bearer token" }, 401);
    }

    const body = (await req.json().catch(() => null)) as ExchangeRequest | null;
    const subjectId = String(body?.subject_id || "").trim();
    const bodyMarkdown = String(body?.body_markdown || "").trim();
    const isEphemeral = !!body?.is_ephemeral;
    const parentMessageId = normalizeUuid(body?.parent_message_id);
    const mentions = Array.isArray(body?.mentions) ? body?.mentions : [];

    if (!subjectId) {
      return json({ error: "subject_id is required" }, 400);
    }

    if (!bodyMarkdown) {
      return json({ error: "body_markdown is required" }, 400);
    }

    console.log("subject-mdall-exchange:start", {
      subject_id: subjectId,
      is_ephemeral: isEphemeral,
      has_parent_message_id: !!parentMessageId,
      mentions_count: mentions.length
    });

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: exchangeRaw, error: createExchangeError } = await userSupabase.rpc("create_subject_mdall_exchange", {
      p_subject_id: subjectId,
      p_body_markdown: bodyMarkdown,
      p_is_ephemeral: isEphemeral,
      p_parent_message_id: parentMessageId,
      p_mentions: mentions
    });

    if (createExchangeError) {
      throw new Error(`create_subject_mdall_exchange failed: ${createExchangeError.message}`);
    }

    const exchange = normalizeRpcJsonResult(exchangeRaw);

    if (!exchange?.user_message_id || !exchange?.subject_id || !exchange?.project_id || !exchange?.mdall_person_id) {
      throw new Error("create_subject_mdall_exchange returned invalid payload");
    }

    const context = await buildSubjectMdallContext(serviceSupabase, {
      subjectId: String(exchange.subject_id),
      projectId: String(exchange.project_id),
      userMessageId: String(exchange.user_message_id),
      isEphemeral
    });

    console.log("subject-mdall-exchange:context-built", {
      subject_id: exchange.subject_id,
      project_id: exchange.project_id,
      messages_count: context.recent_messages.length
    });

    const prompt = buildSubjectMdallPrompt({
      context,
      userMessage: bodyMarkdown,
      isEphemeral
    });

    console.log("subject-mdall-exchange:openai-request", {
      model: MODEL,
      subject_id: exchange.subject_id,
      prompt_chars: prompt.length
    });

    const openAiReply = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        instructions:
          "Tu es Mdall, assistant intégré à l'application Mdall. " +
          "Tu réponds en français, en markdown simple, de manière utile, précise, synthétique et orientée action.",
        input: prompt
      })
    });

    if (!openAiReply.ok) {
      const errorText = await openAiReply.text();
      throw new Error(`OpenAI request failed (${openAiReply.status}): ${errorText}`);
    }

    const openAiJson = await openAiReply.json();
    const replyMarkdown = extractOpenAiText(openAiJson).trim();

    if (!replyMarkdown) {
      throw new Error("OpenAI returned an empty reply");
    }

    const { data: insertedReplyRaw, error: insertReplyError } = await userSupabase.rpc("insert_subject_mdall_reply", {
      p_subject_id: String(exchange.subject_id),
      p_body_markdown: replyMarkdown,
      p_mdall_person_id: String(exchange.mdall_person_id),
      p_is_ephemeral: isEphemeral,
      p_parent_message_id: parentMessageId,
      p_llm_request_id: normalizeUuid(exchange.client_request_id),
      p_metadata: {
        mdall_exchange: true,
        client_request_id: exchange.client_request_id || null,
        actor: "subject-mdall-exchange"
      }
    });

    if (insertReplyError) {
      throw new Error(`insert_subject_mdall_reply failed: ${insertReplyError.message}`);
    }

    const insertedReply = normalizeRpcJsonResult(insertedReplyRaw);

    console.log("subject-mdall-exchange:reply-inserted", {
      subject_id: exchange.subject_id,
      user_message_id: exchange.user_message_id,
      reply_message_id: insertedReply?.message_id || null,
      is_ephemeral: isEphemeral
    });

    return json({
      user_message_id: String(exchange.user_message_id),
      reply_message_id: insertedReply?.message_id ? String(insertedReply.message_id) : null,
      subject_id: String(exchange.subject_id),
      project_id: String(exchange.project_id),
      is_ephemeral: !!exchange.is_ephemeral,
      visible_until: exchange.visible_until || null,
      reply_markdown: replyMarkdown
    });
  } catch (error) {
    console.error("subject-mdall-exchange:error", serializeError(error));
    return json({ error: "Mdall est momentanément indisponible." }, 500);
  }
});

async function buildSubjectMdallContext(
  supabase: ReturnType<typeof createClient>,
  {
    subjectId,
    projectId,
    userMessageId
  }: { subjectId: string; projectId: string; userMessageId: string; isEphemeral: boolean }
): Promise<SubjectMdallContext> {
  const { data: subjectRow, error: subjectError } = await supabase
    .from("subjects")
    .select("id, project_id, parent_subject_id, title, status, description, created_at, updated_at")
    .eq("id", subjectId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (subjectError || !subjectRow) {
    throw new Error(`Failed to load subject context: ${subjectError?.message || "subject not found"}`);
  }

  const [projectRes, childrenRes, labelsRes, assigneesRes, messagesRes] = await Promise.all([
    supabase.from("projects").select("id,name").eq("id", projectId).maybeSingle(),
    supabase
      .from("subjects")
      .select("id,title,status")
      .eq("project_id", projectId)
      .eq("parent_subject_id", subjectId)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("subject_labels")
      .select("id,name")
      .eq("project_id", projectId)
      .eq("subject_id", subjectId)
      .limit(10),
    supabase
      .from("subject_assignees")
      .select("person_id,directory_people!inner(id,first_name,last_name,email)")
      .eq("project_id", projectId)
      .eq("subject_id", subjectId)
      .limit(10),
    supabase
      .from("subject_messages")
      .select("id,created_at,deleted_at,origin,visibility,visible_until,body_markdown")
      .eq("subject_id", subjectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(MAX_MESSAGE_HISTORY + 5)
  ]);

  const project = projectRes.data || { id: projectId, name: "" };

  const parentSubject = subjectRow.parent_subject_id
    ? await fetchParentSubject(supabase, projectId, String(subjectRow.parent_subject_id))
    : null;

  const now = Date.now();
  const recentMessages = (messagesRes.data || [])
    .filter((row) => {
      if (row.deleted_at) return false;
      if (String(row.visibility || "normal") !== "ephemeral") return true;
      const visibleUntil = Date.parse(String(row.visible_until || ""));
      return Number.isFinite(visibleUntil) && visibleUntil > now;
    })
    .reverse()
    .slice(-MAX_MESSAGE_HISTORY)
    .map((row) => ({
      id: String(row.id),
      created_at: String(row.created_at || ""),
      origin: String(row.origin || "human"),
      visibility: String(row.visibility || "normal"),
      visible_until: row.visible_until ? String(row.visible_until) : null,
      body_markdown: truncate(String(row.body_markdown || ""), MAX_MESSAGE_CHARS)
    }));

  if (!recentMessages.some((message) => message.id === userMessageId)) {
    const { data: userMessageRow } = await supabase
      .from("subject_messages")
      .select("id,created_at,origin,visibility,visible_until,body_markdown")
      .eq("id", userMessageId)
      .maybeSingle();

    if (userMessageRow) {
      recentMessages.push({
        id: String(userMessageRow.id),
        created_at: String(userMessageRow.created_at || ""),
        origin: String(userMessageRow.origin || "human"),
        visibility: String(userMessageRow.visibility || "normal"),
        visible_until: userMessageRow.visible_until ? String(userMessageRow.visible_until) : null,
        body_markdown: truncate(String(userMessageRow.body_markdown || ""), MAX_MESSAGE_CHARS)
      });
    }
  }

  return {
    project: {
      id: String(project.id || projectId),
      name: String(project.name || "")
    },
    subject: {
      id: String(subjectRow.id),
      title: String(subjectRow.title || ""),
      status: String(subjectRow.status || ""),
      description: truncate(String(subjectRow.description || ""), MAX_SUBJECT_DESCRIPTION_CHARS),
      created_at: subjectRow.created_at ? String(subjectRow.created_at) : null,
      updated_at: subjectRow.updated_at ? String(subjectRow.updated_at) : null
    },
    relations: {
      parent_subject: parentSubject,
      children_subjects: (childrenRes.data || []).map((row) => ({
        id: String(row.id),
        title: String(row.title || ""),
        status: String(row.status || "")
      })),
      labels: (labelsRes.data || []).map((row) => ({
        id: String(row.id),
        name: String(row.name || "")
      })),
      assignees: normalizeAssignees(assigneesRes.data || [])
    },
    recent_messages: recentMessages
  };
}

function buildSubjectMdallPrompt({
  context,
  userMessage,
  isEphemeral
}: {
  context: SubjectMdallContext;
  userMessage: string;
  isEphemeral: boolean;
}) {
  const payload = {
    mode: isEphemeral ? "ephemeral" : "normal",
    directives: {
      role: "Tu es Mdall, assistant intégré à l'application Mdall.",
      scope: "Tu aides dans le contexte précis du sujet uniquement.",
      language: "Tu réponds en français.",
      format: "Tu réponds en markdown simple.",
      honesty: "Tu ne prétends pas avoir accès à des informations absentes du contexte.",
      ephemeral_note: isEphemeral
        ? "Le mode est éphémère: ta réponse est une aide temporaire visible brièvement."
        : "Le mode est normal: ta réponse est stockée durablement dans la discussion.",
      style: "Sois utile, précis, synthétique, orienté action."
    },
    context,
    user_message: truncate(userMessage, MAX_MESSAGE_CHARS)
  };

  return truncate(JSON.stringify(payload, null, 2), MAX_PROMPT_CHARS);
}

async function fetchParentSubject(supabase: ReturnType<typeof createClient>, projectId: string, parentId: string) {
  const { data } = await supabase
    .from("subjects")
    .select("id,title,status")
    .eq("project_id", projectId)
    .eq("id", parentId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: String(data.id),
    title: String(data.title || ""),
    status: String(data.status || "")
  };
}

function normalizeAssignees(rows: any[]) {
  return rows.map((row) => {
    const person = Array.isArray(row.directory_people) ? row.directory_people[0] : row.directory_people;
    const firstName = String(person?.first_name || "").trim();
    const lastName = String(person?.last_name || "").trim();
    const fallback = String(person?.email || "").trim();
    return {
      id: String(person?.id || row.person_id || ""),
      display_name: `${firstName} ${lastName}`.trim() || fallback
    };
  });
}

function extractOpenAiText(payload: any): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const outputs = Array.isArray(payload?.output) ? payload.output : [];
  const chunks: string[] = [];

  for (const output of outputs) {
    const content = Array.isArray(output?.content) ? output.content : [];
    for (const item of content) {
      if (item?.type === "output_text" && typeof item?.text === "string") {
        chunks.push(item.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function normalizeUuid(value: unknown): string | null {
  const raw = String(value || "").trim();
  return raw || null;
}

function normalizeRpcJsonResult(value: any): any {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: jsonHeaders
  });
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return { message: String(error) };
}
