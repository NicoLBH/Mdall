import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { itemsOfKind, loadCase, loadGroundTruth } from "./dataset.mjs";
import { writeJsonFile, writeTextFile } from "./json-io.mjs";
import { FIXTURES_DIR } from "./paths.mjs";

const EXAMPLE_CASE = resolve(FIXTURES_DIR, "example-harness-case/case.json");

test("loadCase charge la fixture d'exemple, résout les contenus et trie les sources", async () => {
  const testCase = await loadCase(EXAMPLE_CASE);

  assert.equal(testCase.caseId, "example-harness-case");
  assert.deepEqual(testCase.sources.map((source) => source.source_id), ["doc-a", "doc-b"]);
  assert.ok(testCase.sources[0].content.includes("ITEM 65"));
  assert.equal(testCase.sources[0].content_available, true);
  assert.match(testCase.sources[0].content_sha256, /^[0-9a-f]{64}$/);
  assert.equal(testCase.groundTruth.items.length, 6);
});

test("loadCase respecte l'ordre déclaré même si le tableau est désordonné", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mdall-spikes-"));
  try {
    const path = join(dir, "case.json");
    await writeJsonFile(path, {
      schema: "mdall.spike.case/1",
      case_id: "ordre",
      spike: "demo",
      sources: [
        { source_id: "second", source_type: "text", order: 2, content: "b" },
        { source_id: "first", source_type: "text", order: 1, content: "a" }
      ]
    });

    const testCase = await loadCase(path);
    assert.deepEqual(testCase.sources.map((source) => source.source_id), ["first", "second"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("une source sans contenu reste chargeable mais explicitement marquée indisponible", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mdall-spikes-"));
  try {
    const path = join(dir, "case.json");
    await writeJsonFile(path, {
      schema: "mdall.spike.case/1",
      case_id: "sans-contenu",
      spike: "demo",
      sources: [{ source_id: "pdf-non-extrait", source_type: "pdf" }]
    });

    const testCase = await loadCase(path);
    assert.equal(testCase.sources[0].content_available, false);
    assert.equal(testCase.sources[0].content, null);
    assert.equal(testCase.sources[0].content_sha256, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadCase refuse un schema inconnu, des sources vides ou un source_id dupliqué", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mdall-spikes-"));
  try {
    const badSchema = join(dir, "bad-schema.json");
    await writeJsonFile(badSchema, { schema: "autre/1", case_id: "x", spike: "demo", sources: [] });
    await assert.rejects(() => loadCase(badSchema), /schema attendu/);

    const noSources = join(dir, "no-sources.json");
    await writeJsonFile(noSources, { schema: "mdall.spike.case/1", case_id: "x", spike: "demo", sources: [] });
    await assert.rejects(() => loadCase(noSources), /tableau non vide/);

    const duplicate = join(dir, "duplicate.json");
    await writeJsonFile(duplicate, {
      schema: "mdall.spike.case/1",
      case_id: "x",
      spike: "demo",
      sources: [
        { source_id: "a", source_type: "text", content: "1" },
        { source_id: "a", source_type: "text", content: "2" }
      ]
    });
    await assert.rejects(() => loadCase(duplicate), /source_id dupliqué/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadCase refuse une ground truth qui cible un autre cas", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mdall-spikes-"));
  try {
    await writeJsonFile(join(dir, "gt.json"), {
      schema: "mdall.spike.ground-truth/1",
      case_id: "autre-cas",
      items: []
    });
    const path = join(dir, "case.json");
    await writeJsonFile(path, {
      schema: "mdall.spike.case/1",
      case_id: "mon-cas",
      spike: "demo",
      sources: [{ source_id: "a", source_type: "text", content: "1" }],
      ground_truth_ref: "./gt.json"
    });

    await assert.rejects(() => loadCase(path), /cible le cas "autre-cas"/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadGroundTruth refuse les clés dupliquées et les expectations inconnues", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mdall-spikes-"));
  try {
    const duplicate = join(dir, "dup.json");
    await writeJsonFile(duplicate, {
      schema: "mdall.spike.ground-truth/1",
      case_id: "x",
      items: [
        { key: "a", kind: "k" },
        { key: "a", kind: "k" }
      ]
    });
    await assert.rejects(() => loadGroundTruth(duplicate), /clé dupliquée/);

    const unknown = join(dir, "unknown.json");
    await writeJsonFile(unknown, {
      schema: "mdall.spike.ground-truth/1",
      case_id: "x",
      items: [{ key: "a", kind: "k", expectation: "PEUT-ETRE" }]
    });
    await assert.rejects(() => loadGroundTruth(unknown), /expectation inconnue/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("itemsOfKind filtre par nature d'item", async () => {
  const testCase = await loadCase(EXAMPLE_CASE);
  assert.equal(itemsOfKind(testCase.groundTruth, "demo_extraction").length, 6);
  assert.equal(itemsOfKind(testCase.groundTruth, "continuity").length, 0);
});

test("un content_ref pointe bien vers un fichier lu depuis le dossier du manifest", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mdall-spikes-"));
  try {
    await writeTextFile(join(dir, "texts/source.txt"), "contenu externe");
    const path = join(dir, "case.json");
    await writeJsonFile(path, {
      schema: "mdall.spike.case/1",
      case_id: "ref",
      spike: "demo",
      sources: [{ source_id: "a", source_type: "text", content_ref: "./texts/source.txt" }]
    });

    const testCase = await loadCase(path);
    assert.equal(testCase.sources[0].content.trim(), "contenu externe");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
