import test from "node:test";
import assert from "node:assert/strict";

test("hydratePersistedSubjectAttachmentsObjectUrls enrichit les pièces jointes persistées", async (t) => {
  let authModule;
  let attachmentModule;
  try {
    authModule = await import("../../assets/js/auth.js");
    attachmentModule = await import("./subject-attachments-object-url.js");
  } catch (error) {
    t.skip(`imports indisponibles dans cet environnement de test: ${String(error?.code || error?.message || error)}`);
    return;
  }

  const { supabase } = authModule;
  const { hydratePersistedSubjectAttachmentsObjectUrls } = attachmentModule;
  const originalStorage = supabase.storage;
  const calls = [];

  supabase.storage = {
    from(bucket) {
      return {
        async createSignedUrl(path, ttl) {
          calls.push({ bucket, path, ttl });
          return { data: { signedUrl: `https://signed.example/${bucket}/${path}` }, error: null };
        }
      };
    }
  };

  try {
    const hydrated = await hydratePersistedSubjectAttachmentsObjectUrls([
      {
        id: "a1",
        storage_bucket: "subject-message-attachments",
        storage_path: "project-1/subject-1/file.png",
        mime_type: "image/png"
      }
    ]);

    assert.equal(hydrated.length, 1);
    assert.equal(hydrated[0].object_url, "https://signed.example/subject-message-attachments/project-1/subject-1/file.png");
    assert.equal(calls.length, 1);
  } finally {
    supabase.storage = originalStorage;
  }
});
