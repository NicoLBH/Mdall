import { store } from "../store.js";
import { buildSupabaseAuthHeaders, getSupabaseUrl, supabase } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId, resolveCurrentUserDirectoryPersonId } from "./project-supabase-sync.js";
import {
  EDGE_UPLOAD_MODE,
  logSubjectAttachmentUploadTransport,
  resolveSubjectAttachmentUploadTransportMode,
  shouldFallbackToDirectUploadFromEdgeHttpFailure,
  shouldFallbackToDirectUploadFromEdgeNetworkFailure
} from "./subject-message-attachments-transport.js";

const SUPABASE_URL = getSupabaseUrl();
const SUBJECT_ATTACHMENTS_BUCKET = "subject-message-attachments";
const ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeMentions(rawMentions = []) {
  const list = Array.isArray(rawMentions) ? rawMentions : [];
  const seen = new Set();
  return list
    .map((entry) => ({
      personId: normalizeId(entry?.personId || entry?.mentionedPersonId),
      label: String(entry?.label || entry?.displayLabel || "").trim()
    }))
    .filter((entry) => {
      if (!entry.personId || seen.has(entry.personId)) return false;
      seen.add(entry.personId);
      return true;
    });
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

function randomToken() {
  return Math.random().toString(36).slice(2, 10);
}

function inferMimeTypeFromFileName(fileName = "") {
  const normalized = String(fileName || "").trim().toLowerCase();
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".gif")) return "image/gif";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".svg")) return "image/svg+xml";
  if (normalized.endsWith(".pdf")) return "application/pdf";
  if (normalized.endsWith(".txt")) return "text/plain";
  if (normalized.endsWith(".csv")) return "text/csv";
  if (normalized.endsWith(".json")) return "application/json";
  return "";
}

function encodeStoragePath(path = "") {
  return String(path || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function createAttachmentSignedUrl(bucket = SUBJECT_ATTACHMENTS_BUCKET, storagePath = "") {
  const normalizedBucket = String(bucket || SUBJECT_ATTACHMENTS_BUCKET).trim();
  const normalizedPath = String(storagePath || "").trim();
  if (!normalizedBucket || !normalizedPath) return "";

  const { data, error } = await supabase.storage
    .from(normalizedBucket)
    .createSignedUrl(normalizedPath, ATTACHMENT_SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return String(data?.signedUrl || "").trim();
}

async function resolveAttachmentObjectUrl(bucket = SUBJECT_ATTACHMENTS_BUCKET, storagePath = "") {
  const normalizedBucket = String(bucket || SUBJECT_ATTACHMENTS_BUCKET).trim();
  const normalizedPath = String(storagePath || "").trim();
  if (!normalizedBucket || !normalizedPath) return "";
  try {
    const signedUrl = await createAttachmentSignedUrl(normalizedBucket, normalizedPath);
    if (signedUrl) return signedUrl;
  } catch (error) {
    console.warn("[subject-attachments] signed url failed; preview disabled until next refresh", {
      bucket: normalizedBucket,
      storagePath: normalizedPath,
      message: String(error?.message || error || "")
    });
  }
  return "";
}

async function uploadStorageObject({
  bucket = SUBJECT_ATTACHMENTS_BUCKET,
  storagePath = "",
  file,
  mimeType = "",
  upsert = true
} = {}) {
  const normalizedBucket = String(bucket || SUBJECT_ATTACHMENTS_BUCKET).trim();
  const normalizedPath = String(storagePath || "").trim();
  if (!normalizedBucket) throw new Error("bucket is required");
  if (!normalizedPath) throw new Error("storagePath is required");
  if (!(file instanceof Blob)) throw new Error("file must be a Blob");

  const contentType = String(mimeType || file.type || "application/octet-stream");
  const functionUrl = `${SUPABASE_URL}/functions/v1/upload-subject-message-attachment`;
  const formData = new FormData();
  formData.set("bucket", normalizedBucket);
  formData.set("storagePath", normalizedPath);
  formData.set("upsert", upsert ? "true" : "false");
  formData.set("contentType", contentType);
  formData.set("file", file, String(file?.name || "attachment.bin"));

  const functionHeaders = await getAuthHeaders();
  delete functionHeaders["Content-Type"];
  const transportMode = resolveSubjectAttachmentUploadTransportMode();
  const allowDirectFallback = transportMode === EDGE_UPLOAD_MODE.EDGE_WITH_DIRECT_FALLBACK;
  logSubjectAttachmentUploadTransport(transportMode, { host: String(window?.location?.hostname || "") });

  try {
    const functionResponse = await fetch(functionUrl, {
      method: "POST",
      headers: functionHeaders,
      body: formData
    });
    if (functionResponse.ok) return true;

    const functionBody = await functionResponse.text().catch(() => "");
    const fallbackEligible = shouldFallbackToDirectUploadFromEdgeHttpFailure(functionResponse.status, functionBody);
    if (!(allowDirectFallback && fallbackEligible)) {
      const error = new Error(`storage upload failed (${functionResponse.status}): ${functionBody || functionResponse.statusText || "edge function failed"}`);
      error.status = functionResponse.status;
      error.statusCode = String(functionResponse.status);
      error.responseBody = functionBody;
      throw error;
    }
    console.warn("[subject-attachments] edge upload unavailable, fallback to direct storage", {
      status: functionResponse.status,
      body: functionBody
    });
  } catch (functionError) {
    const fallbackEligible = shouldFallbackToDirectUploadFromEdgeNetworkFailure(functionError);
    if (!(allowDirectFallback && fallbackEligible)) throw functionError;
    console.warn("[subject-attachments] edge upload network failure, fallback to direct storage", {
      message: String(functionError?.message || functionError || "")
    });
  }

  const directUrl = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(normalizedBucket)}/${encodeStoragePath(normalizedPath)}`;
  const directResponse = await fetch(directUrl, {
    method: "POST",
    headers: await getAuthHeaders({
      "x-upsert": upsert ? "true" : "false",
      "Content-Type": contentType
    }),
    body: file
  });
  if (!directResponse.ok) {
    const bodyText = await directResponse.text().catch(() => "");
    const message = bodyText || directResponse.statusText || "storage upload failed";
    const error = new Error(`storage upload failed (${directResponse.status}): ${message}`);
    error.status = directResponse.status;
    error.statusCode = String(directResponse.status);
    error.responseBody = bodyText;
    throw error;
  }
  return true;
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

async function resolveProjectIdFromSubject(subjectId = "") {
  const normalizedSubjectId = normalizeId(subjectId);
  if (!normalizedSubjectId) return "";
  const params = new URLSearchParams();
  params.set("select", "project_id");
  params.set("id", `eq.${normalizedSubjectId}`);
  params.set("limit", "1");
  const rows = await restFetch("/rest/v1/subjects", params).catch(() => null);
  const row = Array.isArray(rows) ? rows[0] : rows;
  return normalizeId(row?.project_id);
}

async function resolveCurrentPersonId() {
  return normalizeId(await resolveCurrentUserDirectoryPersonId().catch(() => ""));
}

async function gatherAttachmentUploadDiagnostics({
  projectId = "",
  subjectId = "",
  uploadSessionId = "",
  storagePath = "",
  fileName = "",
  mimeType = "",
  sizeBytes = null
} = {}) {
  const normalizedProjectId = normalizeId(projectId);
  const normalizedSubjectId = normalizeId(subjectId);

  const [sessionResult, personResult, accessResult, subjectResult, projectResult] = await Promise.allSettled([
    supabase.auth.getSession(),
    rpcCall("current_person_id", {}),
    normalizedProjectId
      ? rpcCall("can_access_project_subject_conversation", { p_project_id: normalizedProjectId })
      : Promise.resolve(null),
    normalizedSubjectId
      ? restFetch("/rest/v1/subjects", (() => {
          const params = new URLSearchParams();
          params.set("select", "id,project_id");
          params.set("id", `eq.${normalizedSubjectId}`);
          params.set("limit", "1");
          return params;
        })())
      : Promise.resolve(null),
    normalizedProjectId
      ? restFetch("/rest/v1/projects", (() => {
          const params = new URLSearchParams();
          params.set("select", "id,owner_id");
          params.set("id", `eq.${normalizedProjectId}`);
          params.set("limit", "1");
          return params;
        })())
      : Promise.resolve(null)
  ]);

  const session = sessionResult.status === "fulfilled" ? sessionResult.value : null;
  const personValue = personResult.status === "fulfilled" ? personResult.value : null;
  const accessValue = accessResult.status === "fulfilled" ? accessResult.value : null;
  const subjectValue = subjectResult.status === "fulfilled" ? subjectResult.value : null;
  const projectValue = projectResult.status === "fulfilled" ? projectResult.value : null;

  const normalizedPersonId = (() => {
    if (Array.isArray(personValue)) return normalizeId(personValue[0] || "");
    if (personValue && typeof personValue === "object") return normalizeId(personValue.id || personValue.current_person_id || "");
    return normalizeId(personValue);
  })();

  const canAccessProject = (() => {
    if (typeof accessValue === "boolean") return accessValue;
    if (Array.isArray(accessValue)) return Boolean(accessValue[0]);
    if (accessValue && typeof accessValue === "object") {
      if (typeof accessValue.can_access_project_subject_conversation === "boolean") {
        return accessValue.can_access_project_subject_conversation;
      }
      if (typeof accessValue.result === "boolean") return accessValue.result;
    }
    return null;
  })();

  const subjectRow = Array.isArray(subjectValue) ? subjectValue[0] : subjectValue;
  const projectRow = Array.isArray(projectValue) ? projectValue[0] : projectValue;
  const sessionUser = session?.data?.session?.user || null;

  return {
    uploadContext: {
      projectId: normalizedProjectId,
      subjectId: normalizedSubjectId,
      uploadSessionId: normalizeId(uploadSessionId),
      storagePath: String(storagePath || ""),
      fileName: String(fileName || ""),
      mimeType: String(mimeType || ""),
      sizeBytes: Number.isFinite(Number(sizeBytes)) ? Number(sizeBytes) : null
    },
    auth: {
      userId: normalizeId(sessionUser?.id || ""),
      email: String(sessionUser?.email || ""),
      hasSession: Boolean(session?.data?.session)
    },
    rpc: {
      currentPersonId: normalizedPersonId,
      canAccessProjectSubjectConversation: canAccessProject
    },
    visibility: {
      subjectProjectId: normalizeId(subjectRow?.project_id || ""),
      projectOwnerId: normalizeId(projectRow?.owner_id || ""),
      projectVisible: Boolean(projectRow?.id),
      subjectVisible: Boolean(subjectRow?.id)
    },
    transport: {
      currentPersonIdRpc: personResult.status,
      canAccessRpc: accessResult.status,
      subjectRead: subjectResult.status,
      projectRead: projectResult.status
    }
  };
}

export function createSubjectMessagesSupabaseRepository() {
  async function listAttachmentsByMessageIds(messageIds = []) {
    const ids = (Array.isArray(messageIds) ? messageIds : [])
      .map((value) => normalizeId(value))
      .filter(Boolean);
    if (!ids.length) return new Map();

    const params = new URLSearchParams();
    params.set("select", "id,project_id,subject_id,message_id,storage_bucket,storage_path,file_name,mime_type,size_bytes,width,height,sort_order,created_at,linked_at");
    params.set("message_id", `in.(${ids.join(",")})`);
    params.set("deleted_at", "is.null");
    params.set("order", "sort_order.asc");
    params.append("order", "created_at.asc");
    const rows = await restFetch("/rest/v1/subject_message_attachments", params);
    const grouped = new Map();
    const attachmentRows = Array.isArray(rows) ? rows : [];
    const resolvedObjectUrls = await Promise.all(
      attachmentRows.map((row) => resolveAttachmentObjectUrl(row?.storage_bucket, row?.storage_path))
    );

    attachmentRows.forEach((row, index) => {
      const messageId = normalizeId(row?.message_id);
      if (!messageId) return;
      const list = grouped.get(messageId) || [];
      list.push({
        ...row,
        id: normalizeId(row?.id),
        message_id: messageId,
        storage_bucket: String(row?.storage_bucket || SUBJECT_ATTACHMENTS_BUCKET),
        storage_path: String(row?.storage_path || ""),
        file_name: String(row?.file_name || ""),
        mime_type: String(row?.mime_type || ""),
        object_url: String(resolvedObjectUrls[index] || "")
      });
      grouped.set(messageId, list);
    });
    return grouped;
  }

  async function listMentionsByMessageIds(messageIds = []) {
    const ids = (Array.isArray(messageIds) ? messageIds : [])
      .map((value) => normalizeId(value))
      .filter(Boolean);
    if (!ids.length) return new Map();

    const params = new URLSearchParams();
    params.set("select", "id,project_id,subject_id,message_id,mentioned_person_id,display_label,created_at");
    params.set("message_id", `in.(${ids.join(",")})`);
    params.set("order", "created_at.asc");
    const rows = await restFetch("/rest/v1/subject_message_mentions", params);
    const grouped = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const messageId = normalizeId(row?.message_id);
      if (!messageId) return;
      const mentions = grouped.get(messageId) || [];
      mentions.push({
        id: normalizeId(row?.id),
        message_id: messageId,
        mentioned_person_id: normalizeId(row?.mentioned_person_id),
        display_label: String(row?.display_label || "").trim(),
        created_at: String(row?.created_at || "")
      });
      grouped.set(messageId, mentions);
    });
    return grouped;
  }

  async function insertMessageMentions({ message = null, mentions = [] } = {}) {
    const messageId = normalizeId(message?.id);
    const projectId = normalizeId(message?.project_id);
    const subjectId = normalizeId(message?.subject_id);
    if (!messageId || !projectId || !subjectId) return [];

    const normalizedMentions = normalizeMentions(mentions);
    if (!normalizedMentions.length) return [];

    const rows = await restFetch("/rest/v1/subject_message_mentions", null, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(normalizedMentions.map((mention) => ({
        project_id: projectId,
        subject_id: subjectId,
        message_id: messageId,
        mentioned_person_id: mention.personId,
        display_label: mention.label || null
      })))
    });
    return Array.isArray(rows) ? rows : [];
  }

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
      const messages = Array.isArray(rows) ? rows : [];
      const mentionsByMessageId = await listMentionsByMessageIds(messages.map((message) => message?.id));
      const attachmentsByMessageId = await listAttachmentsByMessageIds(messages.map((message) => message?.id));
      return messages.map((message) => {
        const messageId = normalizeId(message?.id);
        return {
          ...message,
          mentions: mentionsByMessageId.get(messageId) || [],
          attachments: attachmentsByMessageId.get(messageId) || []
        };
      });
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

      const createdMessage = (Array.isArray(rows) ? rows[0] : rows) || null;
      const mentions = normalizeMentions(payload.mentions);
      if (!createdMessage || !mentions.length) return createdMessage;
      const insertedMentions = await insertMessageMentions({ message: createdMessage, mentions });
      return {
        ...createdMessage,
        mentions: insertedMentions
      };
    },

    async markMessageRead({ messageId, subjectId = "", projectId = "" } = {}) {
      const normalizedMessageId = normalizeId(messageId);
      if (!normalizedMessageId) throw new Error("messageId is required");
      return rpcCall("mark_subject_message_read", { p_message_id: normalizedMessageId });
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

    async uploadAttachmentFile(payload = {}) {
      const file = payload?.file;
      if (!(file instanceof File || file instanceof Blob)) {
        throw new Error("file is required");
      }

      const subjectId = normalizeId(payload.subjectId);
      const requestedProjectId = await resolveProjectId(payload.projectId);
      const uploadSessionId = normalizeId(payload.uploadSessionId);
      if (!subjectId) throw new Error("subjectId is required");
      if (!uploadSessionId) throw new Error("uploadSessionId is required");

      const subjectProjectId = await resolveProjectIdFromSubject(subjectId);
      const projectId = subjectProjectId || requestedProjectId;
      if (!projectId) throw new Error("projectId is required");
      if (requestedProjectId && subjectProjectId && requestedProjectId !== subjectProjectId) {
        console.warn("[subject-attachments] project id mismatch, using subject.project_id", {
          subjectId,
          requestedProjectId,
          subjectProjectId
        });
      }

      const fileName = String(file?.name || payload.fileName || "attachment").trim();
      const storagePath = String(
        payload.storagePath
          || `${projectId}/${subjectId}/temporary/${uploadSessionId}/${Date.now()}-${randomToken()}-${normalizeFileName(fileName) || "attachment"}`
      ).trim();
      if (!storagePath) throw new Error("storagePath is required");
      const resolvedMimeType = String(file?.type || payload.mimeType || inferMimeTypeFromFileName(fileName) || "").trim();
      const uploadOptions = {
        upsert: true,
        cacheControl: "3600"
      };
      if (resolvedMimeType) uploadOptions.contentType = resolvedMimeType;
      console.info("[subject-attachments] upload start", {
        bucket: SUBJECT_ATTACHMENTS_BUCKET,
        subjectId,
        projectId,
        requestedProjectId,
        subjectProjectId,
        uploadSessionId,
        storagePath,
        fileName,
        mimeType: resolvedMimeType,
        sizeBytes: Number(file?.size || payload.sizeBytes || 0)
      });

      try {
        await uploadStorageObject({
          bucket: SUBJECT_ATTACHMENTS_BUCKET,
          storagePath,
          file,
          mimeType: uploadOptions.contentType || resolvedMimeType || file?.type || "",
          upsert: Boolean(uploadOptions.upsert)
        });
      } catch (uploadError) {
        const runtimeDiagnostics = await gatherAttachmentUploadDiagnostics({
          projectId,
          subjectId,
          uploadSessionId,
          storagePath,
          fileName,
          mimeType: resolvedMimeType,
          sizeBytes: Number(file?.size || payload.sizeBytes || 0)
        }).catch((error) => ({
          diagnosticCollectionFailed: true,
          message: String(error?.message || error || "")
        }));
        const diagnostic = {
          bucket: SUBJECT_ATTACHMENTS_BUCKET,
          subjectId,
          projectId,
          requestedProjectId,
          subjectProjectId,
          uploadSessionId,
          storagePath,
          fileName,
          mimeType: resolvedMimeType,
          sizeBytes: Number(file?.size || payload.sizeBytes || 0),
          statusCode: uploadError?.statusCode || uploadError?.status || "unknown",
          message: String(uploadError?.message || uploadError || ""),
          error: uploadError,
          responseBody: String(uploadError?.responseBody || ""),
          runtimeDiagnostics
        };
        console.error("[subject-attachments] upload failed", diagnostic);
        throw new Error(
          `Attachment upload failed (${String(uploadError?.statusCode || uploadError?.status || "unknown")}): ${String(uploadError?.message || uploadError)}`
          + ` | context=${JSON.stringify({
            subjectId,
            projectId,
            requestedProjectId,
            subjectProjectId,
            uploadSessionId,
            storagePath,
            mimeType: resolvedMimeType,
            sizeBytes: Number(file?.size || payload.sizeBytes || 0),
            runtimeDiagnostics
          })}`
        );
      }

      const attachment = await this.uploadTemporaryAttachment({
        subjectId,
        projectId,
        uploadSessionId,
        storagePath,
        storageBucket: SUBJECT_ATTACHMENTS_BUCKET,
        fileName,
        mimeType: resolvedMimeType,
        sizeBytes: Number(file?.size || payload.sizeBytes || 0),
        width: payload.width,
        height: payload.height,
        sortOrder: payload.sortOrder
      });
      const objectUrl = await resolveAttachmentObjectUrl(SUBJECT_ATTACHMENTS_BUCKET, storagePath).catch((error) => {
        console.warn("[subject-attachments] object url resolution failed; preview disabled", {
          bucket: SUBJECT_ATTACHMENTS_BUCKET,
          storagePath,
          message: String(error?.message || error || "")
        });
        return "";
      });

      return {
        ...attachment,
        object_url: objectUrl
      };
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

    async removeTemporaryAttachment({ attachmentId }) {
      const normalizedAttachmentId = normalizeId(attachmentId);
      if (!normalizedAttachmentId) throw new Error("attachmentId is required");

      const readParams = new URLSearchParams();
      readParams.set("select", "id,storage_bucket,storage_path");
      readParams.set("id", `eq.${normalizedAttachmentId}`);
      readParams.set("limit", "1");
      const currentRows = await restFetch("/rest/v1/subject_message_attachments", readParams);
      const currentAttachment = (Array.isArray(currentRows) ? currentRows[0] : currentRows) || null;

      const patchParams = new URLSearchParams();
      patchParams.set("id", `eq.${normalizedAttachmentId}`);
      await restFetch("/rest/v1/subject_message_attachments", patchParams, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ deleted_at: new Date().toISOString() })
      });

      if (currentAttachment?.storage_path) {
        await fetch(
          `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(String(currentAttachment.storage_bucket || SUBJECT_ATTACHMENTS_BUCKET))}/${encodeStoragePath(currentAttachment.storage_path)}`,
          {
            method: "DELETE",
            headers: await getAuthHeaders()
          }
        ).catch(() => {});
      }

      return true;
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
      params.set("select", "person_id,collaborator_user_id,collaborator_email,first_name,last_name,full_name,email,status,removed_at,role_group_code,role_group_label");
      params.set("project_id", `eq.${normalizedProjectId}`);
      params.set("removed_at", "is.null");

      const rows = await restFetch("/rest/v1/project_collaborators_view", params);
      const list = Array.isArray(rows) ? rows : [];
      return list
        .filter((row) => String(row?.status || "").trim().toLowerCase() !== "retiré")
        .map((row) => ({
          personId: normalizeId(row?.person_id),
          userId: normalizeId(row?.collaborator_user_id),
          email: String(row?.email || row?.collaborator_email || "").trim(),
          label: String(
            row?.full_name
              || [row?.first_name, row?.last_name].filter(Boolean).join(" ")
              || row?.email
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
