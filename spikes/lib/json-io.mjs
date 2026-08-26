/**
 * Lecture/écriture JSON déterministe pour le harness des spikes.
 *
 * La sérialisation elle-même vit dans `stable-json.mjs`, sans dépendance à
 * Node : ce module n'ajoute que ce qui touche au disque.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

import { sortKeysDeep, stableStringify } from "./stable-json.mjs";

export { sortKeysDeep, stableStringify };

export function sha256(text) {
  return createHash("sha256").update(String(text), "utf8").digest("hex");
}

export async function readTextFile(path) {
  return readFile(path, "utf8");
}

export async function readJsonFile(path) {
  const raw = await readFile(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`JSON invalide dans ${path}: ${error.message}`);
  }
}

export async function writeTextFile(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const withNewline = content.endsWith("\n") ? content : `${content}\n`;
  await writeFile(path, withNewline, "utf8");
  return path;
}

export async function writeJsonFile(path, value) {
  return writeTextFile(path, stableStringify(value));
}
