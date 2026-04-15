import { supabase } from "../../assets/js/auth.js";

export const DEFAULT_AVATAR_URL = "assets/images/260093543.png";

const AVATARS_BUCKET = "avatars";
const AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

function safeString(value = "") {
  return String(value ?? "").trim();
}

function looksLikeDirectAvatarUrl(value = "") {
  const candidate = safeString(value).toLowerCase();
  return candidate.startsWith("http://")
    || candidate.startsWith("https://")
    || candidate.startsWith("data:")
    || candidate.startsWith("blob:")
    || candidate.startsWith("/")
    || candidate.startsWith("assets/");
}

function buildUrl(value = "") {
  const candidate = safeString(value);
  if (!candidate) return null;
  try {
    return new URL(candidate, window.location.origin || "http://localhost");
  } catch {
    return null;
  }
}

function extractStoragePathFromSupabaseUrl(value = "") {
  const url = buildUrl(value);
  if (!url) return "";
  const path = safeString(url.pathname || "");
  if (!path) return "";

  const directMatch = path.match(/\/storage\/v1\/object\/(?:public|sign)\/avatars\/(.+)$/i);
  if (directMatch?.[1]) return safeString(decodeURIComponent(directMatch[1]));

  const encodedMatch = path.match(/\/storage\/v1\/object\/sign\/avatars\/(.+)$/i);
  if (encodedMatch?.[1]) return safeString(decodeURIComponent(encodedMatch[1]));

  return "";
}

function isLikelyExpiringSignedAvatarUrl(value = "") {
  const url = buildUrl(value);
  if (!url) return false;
  const path = safeString(url.pathname || "").toLowerCase();
  if (!/\/storage\/v1\/object\/sign\/avatars\//.test(path)) return false;
  return url.searchParams.has("token") || url.searchParams.has("expires") || url.searchParams.has("t");
}

function buildPublicAvatarUrl(storagePath = "", fallback = DEFAULT_AVATAR_URL) {
  const normalizedPath = safeString(storagePath);
  if (!normalizedPath) return safeString(fallback) || DEFAULT_AVATAR_URL;
  const { data } = supabase.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(normalizedPath);
  return safeString(data?.publicUrl) || safeString(fallback) || DEFAULT_AVATAR_URL;
}

export async function createAvatarSignedUrl(storagePath = "", fallback = DEFAULT_AVATAR_URL) {
  const normalizedPath = safeString(storagePath);
  if (!normalizedPath) return safeString(fallback) || DEFAULT_AVATAR_URL;

  const { data, error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .createSignedUrl(normalizedPath, AVATAR_SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  return safeString(data?.signedUrl) || safeString(fallback) || DEFAULT_AVATAR_URL;
}

export async function resolveAvatarUrl({
  avatarUrl = "",
  avatar = "",
  avatarStoragePath = "",
  fallback = DEFAULT_AVATAR_URL
} = {}) {
  const directAvatarUrl = safeString(avatarUrl || avatar);
  const storagePathFromDirectUrl = extractStoragePathFromSupabaseUrl(directAvatarUrl);

  if (directAvatarUrl && looksLikeDirectAvatarUrl(directAvatarUrl) && !isLikelyExpiringSignedAvatarUrl(directAvatarUrl)) {
    return directAvatarUrl;
  }

  const storagePath = safeString(avatarStoragePath || storagePathFromDirectUrl || directAvatarUrl);
  if (!storagePath) return safeString(fallback) || DEFAULT_AVATAR_URL;

  try {
    return await createAvatarSignedUrl(storagePath, fallback);
  } catch {
    return buildPublicAvatarUrl(storagePath, fallback);
  }
}
