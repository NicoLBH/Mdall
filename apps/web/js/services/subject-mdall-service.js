import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const SUBJECT_MDALL_EXCHANGE_FN_URL = `${SUPABASE_URL}/functions/v1/subject-mdall-exchange`;
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
  return JSON.stringify(data, null, 2);
}

async function getAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
}

async function invokeSubjectMdallExchange(payload = {}) {
  const response = await fetch(SUBJECT_MDALL_EXCHANGE_FN_URL, {
    method: "POST",
    headers: await getAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json"
    }),
    cache: "no-store",
    body: JSON.stringify(payload)
  });

  const text = await response.text().catch(() => "");
  const json = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const details = typeof json?.error === "string" && json.error.trim()
      ? json.error.trim()
      : text || `HTTP ${response.status}`;
    throw new Error(`Mdall est momentanément indisponible. ${details}`.trim());
  }

  return json;
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

  try {
    const payload = {
      subject_id: normalizedSubjectId,
      body_markdown: normalizedBody,
      is_ephemeral: !!isEphemeral,
      parent_message_id: normalizeId(parentMessageId) || null,
      mentions: Array.isArray(mentions) ? mentions : []
    };

    const raw = await invokeSubjectMdallExchange(payload);

    if (!raw?.user_message_id || !raw?.subject_id) {
      throw new Error("Réponse serveur Mdall invalide.");
    }

    debugLog("user-message-created", {
      userMessageId: raw.user_message_id,
      subjectId: raw.subject_id,
      projectId: raw.project_id || null,
      visibleUntil: raw.visible_until || null
    });

    const parsedReply = parseAssistantReply(raw);

    debugLog("llm-response", {
      hasRaw: !!raw,
      replyLength: String(parsedReply || "").length,
      userMessageId: raw.user_message_id,
      replyMessageId: raw.reply_message_id || null
    });

    debugLog("exchange-completed", {
      subjectId: raw.subject_id,
      projectId: raw.project_id || null,
      isEphemeral: !!raw.is_ephemeral
    });

    return {
      userMessageId: normalizeId(raw.user_message_id),
      subjectId: normalizeId(raw.subject_id) || normalizedSubjectId,
      projectId: normalizeId(raw.project_id),
      visibleUntil: raw.visible_until || null,
      replyMessageId: normalizeId(raw.reply_message_id),
      replyMarkdown: parsedReply
    };
  } catch (error) {
    debugLog("exchange-error", {
      message: String(error?.message || error || "unknown error"),
      subjectId: normalizedSubjectId,
      isEphemeral: !!isEphemeral
    });

    throw new Error("Mdall est momentanément indisponible.");
  }
}
