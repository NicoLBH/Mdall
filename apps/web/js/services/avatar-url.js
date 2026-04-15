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
  if (directAvatarUrl && looksLikeDirectAvatarUrl(directAvatarUrl)) return directAvatarUrl;

  const storagePath = safeString(avatarStoragePath || directAvatarUrl);
  if (!storagePath) return safeString(fallback) || DEFAULT_AVATAR_URL;

  try {
    return await createAvatarSignedUrl(storagePath, fallback);
  } catch {
    return safeString(fallback) || DEFAULT_AVATAR_URL;
  }
}
