import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readJsonFile, sha256, sortKeysDeep, stableStringify, writeJsonFile, writeTextFile } from "./json-io.mjs";

test("stableStringify trie les clés à tous les niveaux", () => {
  const a = { b: 1, a: { d: 2, c: [{ z: 1, y: 2 }] } };
  const b = { a: { c: [{ y: 2, z: 1 }], d: 2 }, b: 1 };

  assert.equal(stableStringify(a), stableStringify(b));
  assert.equal(stableStringify({ b: 1, a: 2 }, 0), '{"a":2,"b":1}');
});

test("stableStringify accepte deux références vers le même objet mais refuse les cycles", () => {
  const shared = { x: 1 };
  assert.doesNotThrow(() => stableStringify({ first: shared, second: shared }));

  const cyclic = { name: "boucle" };
  cyclic.self = cyclic;
  assert.throws(() => stableStringify(cyclic), /cycle détecté/);
});

test("sortKeysDeep sérialise les dates en ISO", () => {
  assert.deepEqual(sortKeysDeep({ at: new Date("2026-08-26T00:00:00.000Z") }), {
    at: "2026-08-26T00:00:00.000Z"
  });
});

test("sha256 est stable et discrimine", () => {
  assert.equal(sha256("mdall"), sha256("mdall"));
  assert.notEqual(sha256("mdall"), sha256("mdall "));
});

test("écriture JSON : aller-retour, newline finale et sortie reproductible", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mdall-spikes-"));
  try {
    const path = join(dir, "nested/run.json");
    await writeJsonFile(path, { b: 1, a: [3, 2, 1] });
    const raw = await readFile(path, "utf8");

    assert.ok(raw.endsWith("\n"));
    assert.deepEqual(await readJsonFile(path), { a: [3, 2, 1], b: 1 });

    await writeJsonFile(path, { a: [3, 2, 1], b: 1 });
    assert.equal(await readFile(path, "utf8"), raw, "deux écritures équivalentes doivent produire le même fichier");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("readJsonFile signale le fichier fautif", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mdall-spikes-"));
  try {
    const path = join(dir, "broken.json");
    await writeTextFile(path, "{ pas du json");
    await assert.rejects(() => readJsonFile(path), /JSON invalide dans .*broken\.json/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
