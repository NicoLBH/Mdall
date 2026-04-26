import { ASK_LLM_URL_PROD } from "../constants.js";
import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const DEBUG_FLAG = "mdall:debug-subject-mdall";

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeMarkdown(value) {
  return String(value || "").trim();
}

function isMdallDebugEnabled() {
  const values = [];
  try {
    values.push(globalThis?.localStorage?.getItem(DEBUG_FLAG));
  } catch {
    // noop
  }
  try {
    values.push(globalThis?.sessionStorage?.getItem(DEBUG_FLAG));
  } catch {
    // noop
  }
  return values.some((value) => {
    const raw = String(value || "").trim().toLowerCase();
    return raw && raw !== "0" && raw !== "false" && raw !== "off" && raw !== "no";
  });
}

function debugLog(event, payload = {}) {
  if (!isMdallDebugEnabled()) return;
  try {
    console.info(`[subject-mdall] ${event}`, payload);
  } catch {
    // noop
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseAssistantReply(data) {
  if (!data) return "Je n’ai pas reçu de réponse exploitable.";
  if (typeof data === "string") return data.trim() || "Réponse vide.";
  if (typeof data.reply_markdown === "string" && data.reply_markdown.trim()) return data.reply_markdown.trim();
  if (typeof data.reply === "string" && data.reply.trim()) return data.reply.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (Array.isArray(data.messages) && data.messages.length) {
    const last = data.messages[data.messages.length - 1];
    if (typeof last?.content === "string" && last.content.trim()) return last.content.trim();
  }
  return JSON.stringify(data, null, 2);
}

async function getAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
}

async function restFetch(pathname, searchParams = null, options = {}) {
  const url = new URL(`${SUPABASE_URL}${pathname}`);
  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((value, key) => url.searchParams.append(key, value));
  }

  const response = await fetch(url.toString(), {
    method: options.method || "GET",
    headers: await getAuthHeaders({ Accept: "application/json", ...(options.headers || {}) }),
    cache: options.cache || "no-store",
    body: options.body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${pathname} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  const text = await response.text().catch(() => "");
  if (!text) return null;
  return safeJsonParse(text);
}

async function rpcCall(functionName, payload = {}) {
  return restFetch(`/rest/v1/rpc/${functionName}`, null, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function isMessageVisible(row = {}) {
  if (row?.deleted_at) return false;
  if (String(row?.visibility || "normal") !== "ephemeral") return true;
  const visibleUntil = Date.parse(String(row?.visible_until || ""));
  if (!Number.isFinite(visibleUntil)) return false;
  return visibleUntil > Date.now();
}

async function fetchSubjectContext(subjectId = "", projectId = "", isEphemeral = false) {
  const normalizedSubjectId = normalizeId(subjectId);
  const normalizedProjectId = normalizeId(projectId);

  const subjectParams = new URLSearchParams();
  subjectParams.set("select", "id,project_id,title,status,description");
  subjectParams.set("id", `eq.${normalizedSubjectId}`);
  subjectParams.set("limit", "1");

  const projectParams = new URLSearchParams();
  projectParams.set("select", "id,name");
  projectParams.set("id", `eq.${normalizedProjectId}`);
  projectParams.set("limit", "1");

  const messagesParams = new URLSearchParams();
  messagesParams.set(
    "select",
    "id,project_id,subject_id,parent_message_id,author_person_id,author_user_id,body_markdown,created_at,deleted_at,visibility,visible_until,origin,llm_request_id,metadata"
  );
  messagesParams.set("subject_id", `eq.${normalizedSubjectId}`);
  messagesParams.set("deleted_at", "is.null");
  messagesParams.set("order", "created_at.desc");
  messagesParams.set("limit", "30");

  const [subjectRows, projectRows, messageRows] = await Promise.all([
    restFetch("/rest/v1/subjects", subjectParams).catch(() => []),
    normalizedProjectId ? restFetch("/rest/v1/projects", projectParams).catch(() => []) : Promise.resolve([]),
    restFetch("/rest/v1/subject_messages", messagesParams).catch(() => [])
  ]);

  const subject = (Array.isArray(subjectRows) ? subjectRows[0] : subjectRows) || null;
  const project = (Array.isArray(projectRows) ? projectRows[0] : projectRows) || null;
  const rows = Array.isArray(messageRows) ? messageRows : [];

  return {
    subject: {
      id: normalizeId(subject?.id) || normalizedSubjectId,
      project_id: normalizeId(subject?.project_id) || normalizedProjectId,
      title: String(subject?.title || ""),
      status: String(subject?.status || ""),
      description: String(subject?.description || "")
    },
    project: {
      id: normalizeId(project?.id) || normalizedProjectId,
      name: String(project?.name || "")
    },
    is_ephemeral: !!isEphemeral,
    recent_messages: rows
      .filter((row) => isMessageVisible(row))
      .reverse()
      .map((row) => ({
        id: normalizeId(row?.id),
        parent_message_id: normalizeId(row?.parent_message_id),
        author_person_id: normalizeId(row?.author_person_id),
        origin: String(row?.origin || "human"),
        visibility: String(row?.visibility || "normal"),
        visible_until: row?.visible_until || null,
        created_at: String(row?.created_at || ""),
        body_markdown: String(row?.body_markdown || "")
      }))
  };
}

function normalizeRpcJsonResult(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

export async function sendSubjectMdallExchange({
  subjectId,
  bodyMarkdown,
  isEphemeral = false,
  parentMessageId = null,
  mentions = []
} = {}) {
  const normalizedSubjectId = normalizeId(subjectId);
  const normalizedBody = normalizeMarkdown(bodyMarkdown);

  if (!normalizedSubjectId) throw new Error("subjectId is required");
  if (!normalizedBody) throw new Error("bodyMarkdown is required");

  debugLog("exchange-start", {
    subjectId: normalizedSubjectId,
    isEphemeral: !!isEphemeral,
    hasParentMessageId: !!normalizeId(parentMessageId),
    mentionsCount: Array.isArray(mentions) ? mentions.length : 0
  });

  const createdExchangeRaw = await rpcCall("create_subject_mdall_exchange", {
    p_subject_id: normalizedSubjectId,
    p_body_markdown: normalizedBody,
    p_is_ephemeral: !!isEphemeral,
    p_parent_message_id: normalizeId(parentMessageId) || null,
    p_mentions: Array.isArray(mentions) ? mentions : []
  });
  const createdExchange = normalizeRpcJsonResult(createdExchangeRaw);

  if (!createdExchange?.user_message_id || !createdExchange?.mdall_person_id) {
    throw new Error("create_subject_mdall_exchange returned an invalid payload");
  }

  debugLog("user-message-created", {
    userMessageId: createdExchange.user_message_id,
    mdallPersonId: createdExchange.mdall_person_id,
    projectId: createdExchange.project_id,
    visibleUntil: createdExchange.visible_until || null,
    clientRequestId: createdExchange.client_request_id || null
  });

  const context = await fetchSubjectContext(
    normalizedSubjectId,
    normalizeId(createdExchange.project_id),
    !!isEphemeral
  );

  const llmPayload = {
    channel: "subject_mdall",
    user_message: normalizedBody,
    subject_id: normalizedSubjectId,
    project_id: normalizeId(createdExchange.project_id),
    user_message_id: normalizeId(createdExchange.user_message_id),
    client_request_id: createdExchange.client_request_id || null,
    is_ephemeral: !!isEphemeral,
    context
  };

  debugLog("llm-request", {
    endpoint: ASK_LLM_URL_PROD,
    subjectId: normalizedSubjectId,
    projectId: normalizeId(createdExchange.project_id),
    clientRequestId: createdExchange.client_request_id || null,
    isEphemeral: !!isEphemeral
  });

  try {
    let response = null;
    try {
      response = await fetch(ASK_LLM_URL_PROD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(llmPayload)
      });
    } catch (networkError) {
      const isFetchFailure = /failed to fetch/i.test(String(networkError?.message || ""));
      if (isFetchFailure) {
        throw new Error(
          "Impossible de contacter le webhook Mdall (erreur réseau/CORS). Vérifiez Access-Control-Allow-Origin."
        );
      }
      throw networkError;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Webhook Mdall en erreur (${response.status})${text ? ` — ${text.slice(0, 220)}` : ""}`);
    }

    const raw = await response.json().catch(() => null);
    const parsedReply = parseAssistantReply(raw);

    debugLog("llm-response", {
      hasRaw: !!raw,
      replyLength: String(parsedReply || "").length,
      clientRequestId: createdExchange.client_request_id || null
    });

    const replyInsertRaw = await rpcCall("insert_subject_mdall_reply", {
      p_subject_id: normalizedSubjectId,
      p_body_markdown: parsedReply,
      p_mdall_person_id: createdExchange.mdall_person_id,
      p_is_ephemeral: !!isEphemeral,
      p_parent_message_id: normalizeId(parentMessageId) || null,
      p_llm_request_id: createdExchange.client_request_id || null,
      p_metadata: {
        mdall_exchange: true,
        client_request_id: createdExchange.client_request_id || null,
        llm_raw: raw && typeof raw === "object" ? raw : null
      }
    });

    const insertedReply = normalizeRpcJsonResult(replyInsertRaw);

    debugLog("reply-inserted", {
      messageId: insertedReply?.message_id || null,
      subjectId: normalizedSubjectId,
      visibility: insertedReply?.visibility || (isEphemeral ? "ephemeral" : "normal")
    });

    return {
      userMessageId: normalizeId(createdExchange.user_message_id),
      mdallPersonId: normalizeId(createdExchange.mdall_person_id),
      subjectId: normalizeId(createdExchange.subject_id) || normalizedSubjectId,
      projectId: normalizeId(createdExchange.project_id),
      visibleUntil: createdExchange.visible_until || null,
      clientRequestId: createdExchange.client_request_id || null,
      replyMessageId: normalizeId(insertedReply?.message_id),
      replyMarkdown: parsedReply,
      llmRaw: raw
    };
  } catch (error) {
    debugLog("exchange-error", {
      message: String(error?.message || error || "unknown error"),
      subjectId: normalizedSubjectId,
      isEphemeral: !!isEphemeral
    });

    if (isEphemeral) {
      throw error;
    }

    const fallbackBody = "Mdall est momentanément indisponible. Réessayez dans un instant.";

    const fallbackInsertRaw = await rpcCall("insert_subject_mdall_reply", {
      p_subject_id: normalizedSubjectId,
      p_body_markdown: fallbackBody,
      p_mdall_person_id: createdExchange.mdall_person_id,
      p_is_ephemeral: false,
      p_parent_message_id: normalizeId(parentMessageId) || null,
      p_llm_request_id: createdExchange.client_request_id || null,
      p_metadata: {
        mdall_exchange: true,
        client_request_id: createdExchange.client_request_id || null,
        error: String(error?.message || error || "unknown error")
      }
    }).catch(() => null);

    const fallbackInserted = normalizeRpcJsonResult(fallbackInsertRaw);

    debugLog("reply-inserted", {
      messageId: fallbackInserted?.message_id || null,
      subjectId: normalizedSubjectId,
      visibility: "normal",
      fallback: true
    });

    return {
      userMessageId: normalizeId(createdExchange.user_message_id),
      mdallPersonId: normalizeId(createdExchange.mdall_person_id),
      subjectId: normalizeId(createdExchange.subject_id) || normalizedSubjectId,
      projectId: normalizeId(createdExchange.project_id),
      visibleUntil: createdExchange.visible_until || null,
      clientRequestId: createdExchange.client_request_id || null,
      replyMessageId: normalizeId(fallbackInserted?.message_id),
      replyMarkdown: fallbackBody,
      llmRaw: null,
      error: String(error?.message || error || "unknown error")
    };
  }
}
