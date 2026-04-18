import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json"
};

const BUCKET = "subject-message-attachments";
const EDGE_TRIM_PATTERN = /^[\s\u200B\u200C\u200D\u2060\uFEFF]+|[\s\u200B\u200C\u200D\u2060\uFEFF]+$/g;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: jsonHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("[upload-subject-message-attachment] missing Supabase environment variables");
      return jsonResponse({ ok: false, error: "Server misconfiguration." }, 500);
    }
    if (!authHeader) {
      return jsonResponse({ ok: false, error: "Missing authorization header." }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user?.id) {
      return jsonResponse({ ok: false, error: "Utilisateur non authentifié." }, 401);
    }

    const formData = await req.formData();
    const bucket = String(formData.get("bucket") || BUCKET).trim() || BUCKET;
    const rawStoragePath = String(formData.get("storagePath") || "");
    const storagePath = normalizeStoragePath(rawStoragePath, bucket);
    const upsert = String(formData.get("upsert") || "true").trim().toLowerCase() === "true";
    const contentType = String(formData.get("contentType") || "").trim();
    const file = formData.get("file");

    if (bucket !== BUCKET) {
      return jsonResponse({ ok: false, error: "Unsupported bucket." }, 400);
    }
    if (!storagePath) {
      return jsonResponse({ ok: false, error: "storagePath is required." }, 400);
    }
    if (storagePath.startsWith("/") || storagePath.includes("..")) {
      return jsonResponse({ ok: false, error: "Invalid storage path." }, 400);
    }
    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, error: "file is required." }, 400);
    }
    if (file.size <= 0) {
      return jsonResponse({ ok: false, error: "file is empty." }, 400);
    }

    const [projectId = "", subjectId = ""] = storagePath.split("/");
    if (!projectId) {
      return jsonResponse({ ok: false, error: "Invalid storage path." }, 400);
    }
    const logContext = {
      userId: user.id,
      projectId,
      subjectId: subjectId || null,
      storagePath,
      storagePathRaw: rawStoragePath
    };

    const { data: canAccess, error: accessError } = await userClient.rpc("can_access_project_subject_conversation", {
      p_project_id: projectId
    });
    if (accessError) {
      console.error("[upload-subject-message-attachment] access rpc failed", {
        ...logContext,
        message: accessError.message,
        code: accessError.code
      });
      return jsonResponse({ ok: false, error: "Project access check failed." }, 403);
    }
    if (!canAccess) {
      console.warn("[upload-subject-message-attachment] access denied", logContext);
      return jsonResponse({ ok: false, error: "Access denied." }, 403);
    }

    const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(storagePath, file, {
      upsert,
      cacheControl: "3600",
      contentType: contentType || file.type || "application/octet-stream"
    });
    if (uploadError) {
      console.error("[upload-subject-message-attachment] upload failed", {
        ...logContext,
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError
      });
      return jsonResponse({
        ok: false,
        error: uploadError.message || "Upload failed.",
        statusCode: uploadError.statusCode || null
      }, 400);
    }

    return jsonResponse({
      ok: true,
      bucket: BUCKET,
      storagePath
    }, 200);
  } catch (error) {
    console.error("[upload-subject-message-attachment] unexpected error", error);
    return jsonResponse({ ok: false, error: String(error?.message || error || "Unexpected error.") }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function normalizeStoragePath(storagePath = "", bucket = "") {
  const normalizedBucket = String(bucket || "").trim();
  let normalizedPath = String(storagePath ?? "").replace(EDGE_TRIM_PATTERN, "");
  normalizedPath = normalizedPath.replace(/\/{2,}/g, "/");
  normalizedPath = normalizedPath.replace(/^\/+/, "");
  if (normalizedBucket) {
    const bucketPrefixPattern = new RegExp(`^${escapeRegExp(normalizedBucket)}\/+`);
    normalizedPath = normalizedPath.replace(bucketPrefixPattern, "");
  }
  normalizedPath = normalizedPath.replace(/\/{2,}/g, "/");
  return normalizedPath;
}

function escapeRegExp(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
