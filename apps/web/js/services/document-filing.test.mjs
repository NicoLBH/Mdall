import test from "node:test";
import assert from "node:assert/strict";

import { defaultFolderNameFor, resolveDepositFolder, sameFolderName } from "./document-filing.js";

test("une famille reconnue a un dossier, une famille inconnue n'en a pas", () => {
  assert.equal(defaultFolderNameFor("ct_report"), "Bureau de Contrôle - livrables");
  // Le point qui compte : ne pas inventer de dossier pour ce qu'on n'a pas su
  // reconnaître. Le document ira à la racine plutôt que sous une étiquette fausse.
  assert.equal(defaultFolderNameFor("compte_rendu_chantier"), null);
  assert.equal(defaultFolderNameFor(null), null);
  assert.equal(defaultFolderNameFor(""), null);
});

test("un dossier créé à la main est reconnu malgré la casse et les accents", () => {
  assert.equal(sameFolderName("Bureau de Contrôle - livrables", "bureau de controle - livrables"), true);
  assert.equal(sameFolderName("  Bureau  de Contrôle - livrables ", "Bureau de Contrôle - livrables"), true);
  assert.equal(sameFolderName("Bureau de Contrôle", "Bureau de Contrôle - livrables"), false);
  assert.equal(sameFolderName("", ""), false, "deux riens ne sont pas le même dossier");
});

/** Un couple de dépendances qui note ce qu'on lui a demandé. */
function stubFolders(existing = []) {
  const created = [];
  return {
    created,
    listFolders: async () => existing,
    createFolder: async (projectId, parentId, name) => {
      created.push({ projectId, parentId, name });
      return { id: `f-${created.length}`, name };
    }
  };
}

test("le dossier est créé à la racine quand il n'existe pas", async () => {
  const folders = stubFolders([]);

  const resolved = await resolveDepositFolder({ projectId: "p-1", kind: "ct_report", ...folders });

  assert.deepEqual(resolved, { id: "f-1", name: "Bureau de Contrôle - livrables", created: true });
  assert.deepEqual(folders.created, [
    { projectId: "p-1", parentId: null, name: "Bureau de Contrôle - livrables" }
  ]);
});

test("un dossier existant est réutilisé, jamais redoublé", async () => {
  // Le cas qui fâche : l'utilisateur a créé « bureau de controle - livrables »
  // sans accent. Un second dossier presque identique serait un dégât, pas un rangement.
  const folders = stubFolders([{ id: "f-42", name: "bureau de controle - livrables" }]);

  const resolved = await resolveDepositFolder({ projectId: "p-1", kind: "ct_report", ...folders });

  assert.deepEqual(resolved, { id: "f-42", name: "bureau de controle - livrables", created: false });
  assert.deepEqual(folders.created, [], "rien n'a été créé");
});

test("une famille inconnue ne déclenche aucun accès à la base", async () => {
  let touched = false;
  const resolved = await resolveDepositFolder({
    projectId: "p-1",
    kind: "plan_beton_arme",
    listFolders: async () => { touched = true; return []; },
    createFolder: async () => { touched = true; return null; }
  });

  assert.equal(resolved, null);
  assert.equal(touched, false);
});

test("une base muette ne bloque pas le dépôt : pas de dossier, pas d'erreur", async () => {
  const resolved = await resolveDepositFolder({
    projectId: "p-1",
    kind: "ct_report",
    listFolders: async () => { throw new Error("réseau"); },
    createFolder: async () => ({ id: "f-1" })
  });

  // `null` veut dire « à la racine ». Ne pas savoir ranger un document n'est
  // pas une raison de refuser de le déposer.
  assert.equal(resolved, null);
});
