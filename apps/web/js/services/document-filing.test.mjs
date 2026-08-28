import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultFolderNameFor,
  pickFolderHoldingKind,
  resolveDepositFolder,
  sameFolderName
} from "./document-filing.js";

test("une famille reconnue a un nom de dossier, une famille inconnue n'en a pas", () => {
  assert.equal(defaultFolderNameFor("ct_report"), "Bureau de Contrôle - livrables");
  // Le point qui compte : ne pas inventer de dossier pour ce qu'on n'a pas su
  // reconnaître. Le document ira à la racine plutôt que sous une étiquette fausse.
  assert.equal(defaultFolderNameFor("compte_rendu_chantier"), null);
  assert.equal(defaultFolderNameFor(null), null);
  assert.equal(defaultFolderNameFor(""), null);
});

test("le dossier d'une famille est celui qui en abrite déjà des documents", () => {
  const choisi = pickFolderHoldingKind([
    { folder_id: "f-bc", created_at: "2026-01-01" },
    { folder_id: "f-bc", created_at: "2026-02-01" },
    { folder_id: "f-plans", created_at: "2026-03-01" }
  ]);

  assert.equal(choisi, "f-bc", "le plus fourni l'emporte");
});

test("à égalité, le dossier le plus récemment alimenté l'emporte", () => {
  const choisi = pickFolderHoldingKind([
    { folder_id: "f-ancien", created_at: "2026-01-01" },
    { folder_id: "f-recent", created_at: "2026-06-01" }
  ]);

  assert.equal(choisi, "f-recent");
});

test("la racine n'est pas un dossier", () => {
  // Un document à la racine n'est pas une décision de rangement, c'est
  // l'absence de décision : la prendre pour un choix condamnerait le projet à
  // ne jamais avoir de dossier.
  assert.equal(pickFolderHoldingKind([{ folder_id: null }, { folder_id: null }]), null);
  assert.equal(pickFolderHoldingKind([]), null);

  assert.equal(
    pickFolderHoldingKind([{ folder_id: null }, { folder_id: null }, { folder_id: "f-bc" }]),
    "f-bc",
    "un seul dossier réel bat n'importe quel nombre de documents à la racine"
  );
});

/** Un jeu de dépendances qui note ce qu'on lui a demandé. */
function stub({ folders = [], documents = [] } = {}) {
  const created = [];
  return {
    created,
    listFolders: async () => folders,
    listDocumentsOfKind: async () => documents,
    createFolder: async (projectId, parentId, name) => {
      created.push({ projectId, parentId, name });
      return { id: `f-${created.length}`, name };
    }
  };
}

test("le dossier est créé quand le projet n'en a aucun", async () => {
  const deps = stub();

  const resolved = await resolveDepositFolder({ projectId: "p-1", kind: "ct_report", ...deps });

  assert.deepEqual(resolved, { id: "f-1", name: "Bureau de Contrôle - livrables", created: true });
  assert.deepEqual(deps.created, [
    { projectId: "p-1", parentId: null, name: "Bureau de Contrôle - livrables" }
  ]);
});

test("un dossier renommé reste le dossier de la famille", async () => {
  // Le cas signalé : l'utilisateur renomme « Bureau de Contrôle - livrables »
  // en « Bureau de controle », et un second dossier apparaissait. Le nom ne
  // décide plus rien — ce sont les documents qu'il contient qui le désignent.
  const deps = stub({
    folders: [{ id: "f-42", name: "Bureau de controle", parent_folder_id: null }],
    documents: [{ folder_id: "f-42", created_at: "2026-05-01" }]
  });

  const resolved = await resolveDepositFolder({ projectId: "p-1", kind: "ct_report", ...deps });

  assert.deepEqual(resolved, { id: "f-42", name: "Bureau de controle", created: false });
  assert.deepEqual(deps.created, [], "rien n'a été créé");
});

test("un nom que personne n'aurait deviné fait aussi bien l'affaire", async () => {
  // « BC », « RICT et Fiches », « Suivi chantier » : la liste des noms possibles
  // n'a pas de fin. Aucun n'est deviné, et aucun n'a besoin de l'être.
  for (const nom of ["BC", "RICT et Fiches", "Livrables SOCOTEC 2026"]) {
    const deps = stub({
      folders: [{ id: "f-x", name: nom, parent_folder_id: null }],
      documents: [{ folder_id: "f-x", created_at: "2026-05-01" }]
    });

    const resolved = await resolveDepositFolder({ projectId: "p-1", kind: "ct_report", ...deps });
    assert.deepEqual(resolved, { id: "f-x", name: nom, created: false }, nom);
    assert.deepEqual(deps.created, [], nom);
  }
});

test("un dossier profond est retenu s'il abrite la famille", async () => {
  // La règle du contenu ne se limite pas à la racine : celui qui a rangé ses
  // livrables dans « Chantier › Contrôle technique » veut y voir arriver les
  // suivants.
  const deps = stub({
    folders: [{ id: "f-sub", name: "Contrôle technique", parent_folder_id: "f-parent" }],
    documents: [{ folder_id: "f-sub", created_at: "2026-05-01" }]
  });

  const resolved = await resolveDepositFolder({ projectId: "p-1", kind: "ct_report", ...deps });

  assert.equal(resolved.id, "f-sub");
  assert.deepEqual(deps.created, []);
});

test("faute de documents, un dossier vide au nom attendu est réutilisé", async () => {
  // Le dossier créé à l'avance, que rien ne peut désigner par son contenu. Sans
  // cette règle on tenterait d'en créer un homonyme, ce que la base refuse.
  const deps = stub({
    folders: [{ id: "f-vide", name: "bureau de controle - livrables", parent_folder_id: null }],
    documents: []
  });

  const resolved = await resolveDepositFolder({ projectId: "p-1", kind: "ct_report", ...deps });

  assert.deepEqual(resolved, { id: "f-vide", name: "bureau de controle - livrables", created: false });
  assert.deepEqual(deps.created, []);
});

test("le contenu l'emporte sur le nom", async () => {
  const deps = stub({
    folders: [
      { id: "f-nom", name: "Bureau de Contrôle - livrables", parent_folder_id: null },
      { id: "f-contenu", name: "BC", parent_folder_id: null }
    ],
    documents: [{ folder_id: "f-contenu", created_at: "2026-05-01" }]
  });

  const resolved = await resolveDepositFolder({ projectId: "p-1", kind: "ct_report", ...deps });

  assert.equal(resolved.id, "f-contenu", "les documents savent mieux que les noms");
});

test("une famille inconnue ne déclenche aucun accès à la base", async () => {
  let touched = false;
  const resolved = await resolveDepositFolder({
    projectId: "p-1",
    kind: "plan_beton_arme",
    listFolders: async () => { touched = true; return []; },
    listDocumentsOfKind: async () => { touched = true; return []; },
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
    listDocumentsOfKind: async () => [],
    createFolder: async () => ({ id: "f-1" })
  });

  // `null` veut dire « à la racine ». Ne pas savoir ranger un document n'est
  // pas une raison de refuser de le déposer.
  assert.equal(resolved, null);
});

test("la comparaison de noms ignore casse et accents", () => {
  assert.equal(sameFolderName("Bureau de Contrôle - livrables", "bureau de controle - livrables"), true);
  assert.equal(sameFolderName("  Bureau  de Contrôle - livrables ", "Bureau de Contrôle - livrables"), true);
  assert.equal(sameFolderName("Bureau de Contrôle", "Bureau de Contrôle - livrables"), false);
  assert.equal(sameFolderName("", ""), false, "deux riens ne sont pas le même dossier");
});
