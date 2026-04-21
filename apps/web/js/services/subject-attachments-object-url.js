import { supabase } from "../../assets/js/auth.js";
import {
  normalizeAttachmentBucket,
  normalizeSubjectAttachmentStoragePath
} from "./subject-attachments-storage-path.js";

const SUBJECT_ATTACHMENTS_BUCKET = "subject-message-attachments";
const ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export async function resolveSubjectAttachmentObjectUrl(bucket = SUBJECT_ATTACHMENTS_BUCKET, storagePath = "") {
  const normalizedBucket = normalizeAttachmentBucket(bucket, SUBJECT_ATTACHMENTS_BUCKET);
  const normalizedPath = normalizeSubjectAttachmentStoragePath(String(storagePath ?? ""), normalizedBucket);
  if (!normalizedBucket || !normalizedPath) return "";
  try {
    const { data, error } = await supabase.storage
      .from(normalizedBucket)
      .createSignedUrl(normalizedPath, ATTACHMENT_SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    return String(data?.signedUrl || "").trim();
  } catch (error) {
    console.warn("[subject-attachments] signed url failed; preview disabled until next refresh", {
      bucket: normalizedBucket,
      storagePath: normalizedPath,
      message: String(error?.message || error || "")
    });
    return "";
  }
}

export async function hydratePersistedSubjectAttachmentsObjectUrls(attachments = []) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return [];
  const hasUsableUrl = (attachment = {}) => String(
    attachment?.localPreviewUrl
    || attachment?.previewUrl
    || attachment?.remoteObjectUrl
    || attachment?.download_url
    || attachment?.signed_url
    || attachment?.url
    || attachment?.object_url
    || ""
  ).trim().length > 0;
  const urls = await Promise.all(list.map(async (attachment) => {
    if (hasUsableUrl(attachment)) return "";
    if (!String(attachment?.storage_path || "").trim()) return "";
    return resolveSubjectAttachmentObjectUrl(attachment?.storage_bucket, attachment?.storage_path);
  }));
  return list.map((attachment, index) => ({
    ...attachment,
    object_url: String(attachment?.object_url || urls[index] || ""),
    previewUrl: String(attachment?.previewUrl || attachment?.object_url || urls[index] || "")
  }));
}
