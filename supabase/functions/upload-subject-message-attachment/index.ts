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
      throw new Error("Missing Supabase environment variables.");
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
    const storagePath = String(formData.get("storagePath") || "").trim();
    const upsert = String(formData.get("upsert") || "true").trim().toLowerCase() === "true";
    const contentType = String(formData.get("contentType") || "").trim();
    const file = formData.get("file");

    if (bucket !== BUCKET) {
      return jsonResponse({ ok: false, error: "Unsupported bucket." }, 400);
    }
    if (!storagePath) {
      return jsonResponse({ ok: false, error: "storagePath is required." }, 400);
    }
    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, error: "file is required." }, 400);
    }

    const projectId = storagePath.split("/")[0] || "";
    if (!projectId) {
      return jsonResponse({ ok: false, error: "Invalid storage path." }, 400);
    }

    const { data: canAccess, error: accessError } = await userClient.rpc("can_access_project_subject_conversation", {
      p_project_id: projectId
    });
    if (accessError) {
      console.error("[upload-subject-message-attachment] access rpc failed", accessError);
      return jsonResponse({ ok: false, error: "Project access check failed." }, 403);
    }
    if (!canAccess) {
      return jsonResponse({ ok: false, error: "Access denied." }, 403);
    }

    const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(storagePath, file, {
      upsert,
      cacheControl: "3600",
      contentType: contentType || file.type || "application/octet-stream"
    });
    if (uploadError) {
      console.error("[upload-subject-message-attachment] upload failed", {
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
