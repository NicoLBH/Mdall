const EDGE_TRIM_PATTERN = /^[\s\u200B\u200C\u200D\u2060\uFEFF]+|[\s\u200B\u200C\u200D\u2060\uFEFF]+$/g;

function escapeRegExp(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeAttachmentBucket(bucket = "", fallbackBucket = "") {
  return String(bucket || fallbackBucket || "").trim();
}

export function normalizeSubjectAttachmentStoragePath(storagePath = "", bucket = "") {
  const rawValue = String(storagePath ?? "");
  const normalizedBucket = normalizeAttachmentBucket(bucket);
  let canonicalValue = rawValue.replace(EDGE_TRIM_PATTERN, "");

  canonicalValue = canonicalValue.replace(/\/{2,}/g, "/");
  canonicalValue = canonicalValue.replace(/^\/+/, "");

  if (normalizedBucket) {
    const bucketPrefixPattern = new RegExp(`^${escapeRegExp(normalizedBucket)}\/+`);
    canonicalValue = canonicalValue.replace(bucketPrefixPattern, "");
  }

  canonicalValue = canonicalValue.replace(/\/{2,}/g, "/");
  return canonicalValue;
}
