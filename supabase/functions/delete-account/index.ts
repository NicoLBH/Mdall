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

const DELETE_ACCOUNT_CONFIRMATION_TEXT = "supprimer mon compte";
const DOCUMENTS_BUCKET = "documents";
const AVATARS_BUCKET = "avatars";

type DeleteAccountBody = {
  identityInput?: string;
  confirmationText?: string;
};

type ProfileRecord = {
  public_email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_storage_path?: string | null;
};

type ProjectRecord = {
  id: string;
};

type DocumentRecord = {
  storage_bucket?: string | null;
  storage_path?: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: jsonHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    if (!authHeader) {
      return jsonResponse({ ok: false, error: "Missing authorization header." }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const {
      data: { user },
      error: getUserError
    } = await userClient.auth.getUser(token);

    if (getUserError || !user?.id) {
      return jsonResponse({ ok: false, error: "Utilisateur non authentifié." }, 401);
    }

    const body = await safeReadJson<DeleteAccountBody>(req);
    const identityInput = safeString(body?.identityInput);
    const confirmationText = normalizeText(body?.confirmationText);

    if (confirmationText !== DELETE_ACCOUNT_CONFIRMATION_TEXT) {
      return jsonResponse({ ok: false, error: "Le texte de confirmation est invalide." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: profile, error: profileError } = await adminClient
      .from("user_public_profiles")
      .select("public_email, first_name, last_name, avatar_storage_path")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const acceptedIdentities = buildAcceptedIdentities(user, profile);
    if (!acceptedIdentities.includes(normalizeText(identityInput))) {
      return jsonResponse({ ok: false, error: "L'identifiant de confirmation ne correspond pas à votre compte." }, 400);
    }

    const { data: projects, error: projectsError } = await adminClient
      .from("projects")
      .select("id")
      .eq("owner_id", user.id)
      ;

    if (projectsError) throw projectsError;

    const projectRows = (projects || []) as ProjectRecord[];
    const projectIds = projectRows.map((project) => project.id).filter(Boolean);
    const storagePathsByBucket = new Map<string, string[]>();

    if (projectIds.length > 0) {
      const { data: documents, error: documentsError } = await adminClient
        .from("documents")
        .select("storage_bucket, storage_path")
        .in("project_id", projectIds)
        ;

      if (documentsError) throw documentsError;

      const documentRows = (documents || []) as DocumentRecord[];

      for (const document of documentRows) {
        const bucketName = safeString(document.storage_bucket) || DOCUMENTS_BUCKET;
        const storagePath = safeString(document.storage_path);
        if (!storagePath) continue;
        appendStoragePath(storagePathsByBucket, bucketName, storagePath);
      }
    }

    const avatarPath = safeString(profile?.avatar_storage_path);
    if (avatarPath) {
      appendStoragePath(storagePathsByBucket, AVATARS_BUCKET, avatarPath);
    }

    await removeStorageObjects(adminClient, storagePathsByBucket);

    if (projectIds.length > 0) {
      const { error: deleteProjectsError } = await adminClient
        .from("projects")
        .delete()
        .eq("owner_id", user.id);

      if (deleteProjectsError) throw deleteProjectsError;
    }

    const { error: deleteProfileError } = await adminClient
      .from("user_public_profiles")
      .delete()
      .eq("user_id", user.id);

    if (deleteProfileError) throw deleteProfileError;

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id, false);
    if (deleteUserError) throw deleteUserError;

    return jsonResponse({
      ok: true,
      deletedUserId: user.id,
      deletedProjectsCount: projectIds.length
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders
  });
}

async function safeReadJson<T>(req: Request): Promise<T | null> {
  try {
    return await req.json() as T;
  } catch {
    return null;
  }
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value: unknown): string {
  return safeString(value).toLowerCase();
}

function buildAcceptedIdentities(user: any, profile: ProfileRecord | null): string[] {
  const firstName = safeString(profile?.first_name || user?.user_metadata?.first_name || "");
  const lastName = safeString(profile?.last_name || user?.user_metadata?.last_name || "");
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return [
    safeString(profile?.public_email || ""),
    safeString(user?.email || ""),
    safeString(user?.user_metadata?.full_name || user?.user_metadata?.name || ""),
    fullName
  ]
    .filter(Boolean)
    .map(normalizeText);
}

function appendStoragePath(target: Map<string, string[]>, bucketName: string, storagePath: string) {
  const currentPaths = target.get(bucketName) || [];
  currentPaths.push(storagePath);
  target.set(bucketName, currentPaths);
}

async function removeStorageObjects(supabase: ReturnType<typeof createClient>, pathsByBucket: Map<string, string[]>) {
  for (const [bucketName, rawPaths] of pathsByBucket.entries()) {
    const uniquePaths = Array.from(new Set(rawPaths.map(safeString).filter(Boolean)));
    if (!uniquePaths.length) continue;

    for (let index = 0; index < uniquePaths.length; index += 100) {
      const batch = uniquePaths.slice(index, index + 100);
      const { error } = await supabase.storage.from(bucketName).remove(batch);
      if (error) throw error;
    }
  }
}
