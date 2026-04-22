import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsPath = path.resolve(__dirname, "./project-subjects-events.js");
const eventsSource = fs.readFileSync(eventsPath, "utf8");
const viewPath = path.resolve(__dirname, "./project-subjects-view.js");
const viewSource = fs.readFileSync(viewPath, "utf8");
const servicePath = path.resolve(__dirname, "../../services/project-subjects-supabase.js");
const serviceSource = fs.readFileSync(servicePath, "utf8");
const migrationPath = path.resolve(__dirname, "../../../../../supabase/migrations/202606150026_subject_history_title_description_close_reopen.sql");
const migrationSource = fs.readFileSync(migrationPath, "utf8");

test("le submit de création de sous-sujet n'appelle plus rerenderPanels immédiatement après createSubjectFromDraft", () => {
  assert.match(eventsSource, /const submitPromise = createSubjectFromDraft\(\);\s*rerenderSubmitScope\(\);\s*const result = await submitPromise;/);
  assert.doesNotMatch(eventsSource, /const submitPromise = createSubjectFromDraft\(\);\s*rerenderPanels\(\);/);
});

test("le flux subissue conserve setSubjectParent avec skipRerender true", () => {
  assert.match(eventsSource, /await setSubjectParent\(result\.subjectId, parentSubjectId, \{ root: interactionRoot, skipRerender: true \}\);/);
});

test("createSubjectFromDraft ne force plus le chargement des versions de description juste après update", () => {
  assert.match(viewSource, /await updateSubjectDescriptionInSupabase\(\{\s*subjectId,\s*description,\s*uploadSessionId\s*\}\);/);
  assert.doesNotMatch(viewSource, /loadSubjectDescriptionVersionsInSupabase\(subjectId\)/);
});

test("loadSubjectDescriptionVersions ne console.warn plus quand aucun historique n'est renvoyé", () => {
  assert.doesNotMatch(serviceSource, /console\.warn\(`\$\{logPrefix\} fetch succeeded but returned no version rows`/);
  assert.match(serviceSource, /if \(!rows\.length && debugEnabled\) \{\s*console\.debug\(`\$\{logPrefix\} fetch succeeded but returned no version rows`/);
});

test("le RPC update_subject_description attendu par le front est celui qui insère dans subject_description_versions", () => {
  assert.match(serviceSource, /payload = await rpcCall\("update_subject_description", rpcPayload\);/);
  assert.match(migrationSource, /insert into public\.subject_description_versions \(/);
});
