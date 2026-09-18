import assert from "node:assert/strict";
import test from "node:test";

import { creuserLesDossiers } from "./creuser-les-dossiers.js";

/**
 * Une arborescence en mémoire.
 *
 * **Le parcours s'exécute**, il ne se relit pas. La première version de ce code
 * vivait dans un module qui importe le SDK Supabase : rien ne pouvait
 * l'exercer, et il a livré au premier essai réel un défaut qu'un seul appel
 * aurait montré.
 */
function arborescence(dossiers = []) {
  const journal = { crees: [], listes: [] };
  let suivant = 1;

  const portes = {
    listerLesEnfants: async (_projectId, parent) => {
      journal.listes.push(parent);
      return dossiers.filter((dossier) => (dossier.parent ?? null) === (parent ?? null));
    },
    creerLeDossier: async (_projectId, parent, name) => {
      const cree = { id: `dossier-${suivant++}`, name, parent: parent ?? null };
      dossiers.push(cree);
      journal.crees.push({ name, parent: parent ?? null });
      return cree;
    }
  };

  return { portes, journal, dossiers };
}

const creuser = (options) => creuserLesDossiers({ projectId: "projet", ...options });

// ── La racine est un endroit, pas une panne ────────────────────────────────

test("sans dossier à traverser, on écrit là où l'on est", async () => {
  // **Le défaut que ce test aurait vu.** `null` est la racine de Documents :
  // rendu comme une panne, il faisait refuser tout fichier écrit à la racine
  // avec « le dossier n'a pas pu être créé » — alors qu'il n'y avait aucun
  // dossier à créer.
  const { portes, journal } = arborescence();
  const ou = await creuser({ depuis: null, dossiers: [], portes });

  assert.deepEqual(ou, { trouve: true, id: null, motif: "" });
  assert.deepEqual(journal.crees, [], "un dossier a été créé pour rien");
});

test("sans dossier à traverser, un sous-dossier ouvert reste le sien", async () => {
  const { portes } = arborescence();
  const ou = await creuser({ depuis: "f-1", dossiers: [], portes });
  assert.deepEqual(ou, { trouve: true, id: "f-1", motif: "" });
});

test("« trouvé » et « rien à créer » ne se confondent pas avec « raté »", async () => {
  const { portes } = arborescence();
  const racine = await creuser({ depuis: null, dossiers: [], portes });
  const rate = await creuser({ depuis: null, dossiers: ["perso"], portes: {
    ...portes, creerLeDossier: async () => null
  } });

  assert.equal(racine.trouve, true);
  assert.equal(rate.trouve, false);
  // Les deux rendent `id: null` — c'est `trouve` qui les sépare, et rien d'autre.
  assert.equal(racine.id, null);
  assert.equal(rate.id, null);
});

// ── Creuser ────────────────────────────────────────────────────────────────

test("un dossier absent se crée", async () => {
  const { portes, journal } = arborescence();
  const ou = await creuser({ depuis: null, dossiers: ["perso"], portes });

  assert.equal(ou.trouve, true);
  assert.deepEqual(journal.crees, [{ name: "perso", parent: null }]);
});

test("un dossier déjà là se reprend, à la casse près", async () => {
  // « Perso » et « perso » côte à côte se confondent à l'œil, et la base refuse
  // le doublon : on aurait échoué sans savoir pourquoi.
  const { portes, journal } = arborescence([{ id: "f-9", name: "Perso", parent: null }]);
  const ou = await creuser({ depuis: null, dossiers: ["perso"], portes });

  assert.equal(ou.id, "f-9");
  assert.deepEqual(journal.crees, []);
});

test("on creuse de proche en proche", async () => {
  const { portes, journal } = arborescence();
  const ou = await creuser({ depuis: null, dossiers: ["perso", "notices"], portes });

  assert.equal(ou.trouve, true);
  assert.deepEqual(journal.crees.map((cree) => cree.name), ["perso", "notices"]);
  // Le second est **dans** le premier : créés côte à côte, le fichier
  // atterrirait à un étage de la hiérarchie que personne n'a demandé.
  assert.equal(journal.crees[1].parent, journal.crees[0].parent === null ? "dossier-1" : null);
  assert.equal(ou.id, "dossier-2");
});

test("on cherche dans le dossier où l'on est, pas à la racine", async () => {
  const { portes, journal } = arborescence([{ id: "f-9", name: "perso", parent: null }]);
  await creuser({ depuis: "f-1", dossiers: ["perso"], portes });

  assert.deepEqual(journal.listes, ["f-1"], "on a cherché ailleurs");
  // Le « perso » de la racine n'est pas celui-ci : le reprendre écrirait dans
  // un dossier qu'on ne regardait pas.
  assert.deepEqual(journal.crees, [{ name: "perso", parent: "f-1" }]);
});

// ── Ce qui rate le dit ─────────────────────────────────────────────────────

test("un dossier qu'on n'a pas pu créer se nomme", async () => {
  const { portes } = arborescence();
  const ou = await creuser({ depuis: null, dossiers: ["a", "b"], portes: {
    ...portes,
    creerLeDossier: async (_p, _parent, name) => (name === "b" ? null : { id: "f-a", name })
  } });

  assert.equal(ou.trouve, false);
  // Lequel des deux : sans le nom, on cherche dans les deux.
  assert.match(ou.motif, /« b »/);
});

test("une panne de la base se dit, elle ne se tait pas", async () => {
  const { portes } = arborescence();
  const ou = await creuser({ depuis: null, dossiers: ["perso"], portes: {
    ...portes, listerLesEnfants: async () => { throw new Error("rls refuse"); }
  } });

  assert.equal(ou.trouve, false);
  assert.match(ou.motif, /rls refuse/);
});

test("sans projet et sans portes, on ne cherche rien", async () => {
  const { portes } = arborescence();
  assert.equal((await creuserLesDossiers({ depuis: null, portes })).trouve, false);
  assert.equal((await creuser({ depuis: null, portes: null })).trouve, false);
  assert.equal((await creuser({ depuis: null, portes: { creerLeDossier: async () => null } })).trouve, false);
});

test("un dossier sans nom ne se creuse pas", async () => {
  // Il vient d'un « // » que le service pur refuse déjà ; ici c'est la seconde
  // barrière, et elle ne crée pas un dossier qui s'appellerait « ».
  const { portes, journal } = arborescence();
  const ou = await creuser({ depuis: null, dossiers: ["perso", "  "], portes });

  assert.equal(ou.trouve, false);
  assert.deepEqual(journal.crees.map((cree) => cree.name), ["perso"]);
});
