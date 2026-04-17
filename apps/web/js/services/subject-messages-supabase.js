import { store } from "../store.js";
import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId, resolveCurrentUserDirectoryPersonId } from "./project-supabase-sync.js";

const SUPABASE_URL = getSupabaseUrl();
const SUBJECT_ATTACHMENTS_BUCKET = "subject-message-attachments";

function normalizeId(value) {
  return String(value || "").trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

async function resolveProjectId(explicitProjectId = "") {
  const normalized = normalizeId(explicitProjectId);
  if (normalized) return normalized;
  return normalizeId(await resolveCurrentBackendProjectId().catch(() => ""));
}

async function resolveCurrentPersonId() {
  return normalizeId(await resolveCurrentUserDirectoryPersonId().catch(() => ""));
}

async function fetchMessageById(messageId) {
  const normalizedMessageId = normalizeId(messageId);
  if (!normalizedMessageId) return null;

  const params = new URLSearchParams();
  params.set("select", "id,project_id,subject_id,author_person_id");
  params.set("id", `eq.${normalizedMessageId}`);
  params.set("limit", "1");

  const rows = await restFetch("/rest/v1/subject_messages", params);
  return (Array.isArray(rows) ? rows[0] : rows) || null;
}

export function createSubjectMessagesSupabaseRepository() {
  return {
    async listMessages({ subjectId }) {
      const normalizedSubjectId = normalizeId(subjectId);
      if (!normalizedSubjectId) return [];

      const params = new URLSearchParams();
      params.set(
        "select",
        "id,project_id,subject_id,parent_message_id,author_person_id,author_user_id,body_markdown,created_at,updated_at,deleted_at,is_frozen,frozen_at,frozen_reason"
      );
      params.set("subject_id", `eq.${normalizedSubjectId}`);
      params.set("order", "created_at.asc");

      const rows = await restFetch("/rest/v1/subject_messages", params);
      return Array.isArray(rows) ? rows : [];
    },

    async listEvents({ subjectId }) {
      const normalizedSubjectId = normalizeId(subjectId);
      if (!normalizedSubjectId) return [];

      const params = new URLSearchParams();
      params.set("select", "id,project_id,subject_id,message_id,event_type,actor_person_id,actor_user_id,event_payload,created_at");
      params.set("subject_id", `eq.${normalizedSubjectId}`);
      params.set("order", "created_at.asc");

      const rows = await restFetch("/rest/v1/subject_message_events", params);
      return Array.isArray(rows) ? rows : [];
    },

    async getConversationSettings({ subjectId }) {
      const normalizedSubjectId = normalizeId(subjectId);
      if (!normalizedSubjectId) return null;

      const params = new URLSearchParams();
      params.set("select", "subject_id,project_id,is_locked,locked_at,locked_by_person_id,locked_by_user_id,lock_reason,updated_at");
      params.set("subject_id", `eq.${normalizedSubjectId}`);
      params.set("limit", "1");

      const rows = await restFetch("/rest/v1/subject_conversation_settings", params);
      return (Array.isArray(rows) ? rows[0] : rows) || null;
    },

    async createMessage(payload = {}) {
      const subjectId = normalizeId(payload.subjectId);
      const bodyMarkdown = String(payload.bodyMarkdown || "").trim();
      const projectId = await resolveProjectId(payload.projectId);
      const personId = await resolveCurrentPersonId();

      if (!subjectId) throw new Error("subjectId is required");
      if (!projectId) throw new Error("projectId is required");
      if (!personId) throw new Error("current person is required");
      if (!bodyMarkdown) throw new Error("bodyMarkdown is required");

      const rows = await restFetch("/rest/v1/subject_messages", null, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          project_id: projectId,
          subject_id: subjectId,
          parent_message_id: normalizeId(payload.parentMessageId) || null,
          author_person_id: personId,
          author_user_id: normalizeId(store?.user?.id || "") || null,
          body_markdown: bodyMarkdown
        })
      });

      return (Array.isArray(rows) ? rows[0] : rows) || null;
    },

    async markMessageRead({ messageId, subjectId = "", projectId = "" } = {}) {
      const normalizedMessageId = normalizeId(messageId);
      const personId = await resolveCurrentPersonId();
      if (!normalizedMessageId) throw new Error("messageId is required");
      if (!personId) throw new Error("current person is required");

      const message = await fetchMessageById(normalizedMessageId);
      if (!message?.id) throw new Error("message not found");

      const rows = await restFetch("/rest/v1/subject_message_reads", null, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify({
          message_id: normalizedMessageId,
          subject_id: normalizeId(subjectId) || normalizeId(message.subject_id),
          project_id: await resolveProjectId(projectId || message.project_id),
          reader_person_id: personId,
          reader_user_id: normalizeId(store?.user?.id || "") || null
        })
      });

      return (Array.isArray(rows) ? rows[0] : rows) || null;
    },

    async canEditMessage({ messageId }) {
      const normalizedMessageId = normalizeId(messageId);
      if (!normalizedMessageId) return false;
      const result = await rpcCall("subject_message_is_editable", { p_message_id: normalizedMessageId });
      return !!result;
    },

    async editMessage({ messageId, bodyMarkdown }) {
      const normalizedMessageId = normalizeId(messageId);
      const nextBody = String(bodyMarkdown || "").trim();
      if (!normalizedMessageId) throw new Error("messageId is required");
      if (!nextBody) throw new Error("bodyMarkdown is required");

      const params = new URLSearchParams();
      params.set("id", `eq.${normalizedMessageId}`);

      const rows = await restFetch("/rest/v1/subject_messages", params, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({ body_markdown: nextBody })
      });

      return (Array.isArray(rows) ? rows[0] : rows) || null;
    },

    async deleteMessage({ messageId }) {
      const normalizedMessageId = normalizeId(messageId);
      if (!normalizedMessageId) throw new Error("messageId is required");
      return rpcCall("soft_delete_subject_message", { p_message_id: normalizedMessageId });
    },

    async uploadTemporaryAttachment(payload = {}) {
      const subjectId = normalizeId(payload.subjectId);
      const projectId = await resolveProjectId(payload.projectId);
      const personId = await resolveCurrentPersonId();
      const storagePath = String(payload.storagePath || "").trim();
      const fileName = String(payload.fileName || "").trim();

      if (!subjectId) throw new Error("subjectId is required");
      if (!projectId) throw new Error("projectId is required");
      if (!personId) throw new Error("current person is required");
      if (!storagePath) throw new Error("storagePath is required");
      if (!fileName) throw new Error("fileName is required");

      const rows = await restFetch("/rest/v1/subject_message_attachments", null, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          project_id: projectId,
          subject_id: subjectId,
          upload_session_id: normalizeId(payload.uploadSessionId) || null,
          storage_bucket: String(payload.storageBucket || SUBJECT_ATTACHMENTS_BUCKET),
          storage_path: storagePath,
          file_name: fileName,
          mime_type: String(payload.mimeType || "") || null,
          size_bytes: Number.isFinite(Number(payload.sizeBytes)) ? Number(payload.sizeBytes) : null,
          width: Number.isFinite(Number(payload.width)) ? Number(payload.width) : null,
          height: Number.isFinite(Number(payload.height)) ? Number(payload.height) : null,
          sort_order: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
          uploaded_by_person_id: personId
        })
      });

      return (Array.isArray(rows) ? rows[0] : rows) || null;
    },

    async linkAttachmentsToMessage({ subjectId, messageId, uploadSessionId }) {
      const normalizedSubjectId = normalizeId(subjectId);
      const normalizedMessageId = normalizeId(messageId);
      const normalizedUploadSessionId = normalizeId(uploadSessionId);
      if (!normalizedSubjectId) throw new Error("subjectId is required");
      if (!normalizedMessageId) throw new Error("messageId is required");
      if (!normalizedUploadSessionId) throw new Error("uploadSessionId is required");

      const rows = await rpcCall("link_subject_message_attachments", {
        p_subject_id: normalizedSubjectId,
        p_message_id: normalizedMessageId,
        p_upload_session_id: normalizedUploadSessionId
      });

      return Array.isArray(rows) ? rows : [];
    },

    async lockConversation({ subjectId, reason = "" }) {
      const normalizedSubjectId = normalizeId(subjectId);
      if (!normalizedSubjectId) throw new Error("subjectId is required");
      return rpcCall("lock_subject_conversation", {
        p_subject_id: normalizedSubjectId,
        p_lock_reason: String(reason || "") || null
      });
    },

    async unlockConversation({ subjectId }) {
      const normalizedSubjectId = normalizeId(subjectId);
      if (!normalizedSubjectId) throw new Error("subjectId is required");
      return rpcCall("unlock_subject_conversation", { p_subject_id: normalizedSubjectId });
    },

    async listCollaboratorsForMentions({ projectId }) {
      const normalizedProjectId = await resolveProjectId(projectId);
      if (!normalizedProjectId) return [];

      const params = new URLSearchParams();
      params.set("select", "person_id,collaborator_user_id,collaborator_email,collaborator_name,collaborator_first_name,collaborator_last_name,status,role_group_code,role_group_label");
      params.set("project_id", `eq.${normalizedProjectId}`);
      params.set("removed_at", "is.null");

      const rows = await restFetch("/rest/v1/project_collaborators_view", params);
      const list = Array.isArray(rows) ? rows : [];
      return list
        .filter((row) => String(row?.status || "").trim().toLowerCase() !== "retiré")
        .map((row) => ({
          personId: normalizeId(row?.person_id),
          userId: normalizeId(row?.collaborator_user_id),
          email: String(row?.collaborator_email || "").trim(),
          label: String(
            row?.collaborator_name
              || [row?.collaborator_first_name, row?.collaborator_last_name].filter(Boolean).join(" ")
              || row?.collaborator_email
              || "Utilisateur"
          ).trim(),
          roleGroupCode: String(row?.role_group_code || "").trim().toLowerCase(),
          roleGroupLabel: String(row?.role_group_label || "").trim()
        }))
        .filter((row) => !!row.personId);
    },

    async listUnreadConversationNotifications({ projectId, personId = "" } = {}) {
      const normalizedProjectId = await resolveProjectId(projectId);
      const resolvedPersonId = normalizeId(personId) || await resolveCurrentPersonId();
      if (!normalizedProjectId || !resolvedPersonId) return [];

      const params = new URLSearchParams();
      params.set("select", "id,project_id,subject_id,person_id,notification_type,message_id,event_id,is_read,created_at,read_at");
      params.set("project_id", `eq.${normalizedProjectId}`);
      params.set("person_id", `eq.${resolvedPersonId}`);
      params.set("is_read", "eq.false");
      params.set("order", "created_at.desc");

      const rows = await restFetch("/rest/v1/subject_notifications", params);
      return Array.isArray(rows) ? rows : [];
    }
  };
}
