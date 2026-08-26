/**
 * Lecture/écriture JSON déterministe pour le harness des spikes.
 *
 * Objectif : deux runs identiques doivent produire des fichiers identiques
 * octet pour octet (clés triées, indentation stable, newline finale).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

/**
 * Clone la valeur en triant les clés d'objet à tous les niveaux.
 * Les cycles sont refusés explicitement plutôt que sérialisés silencieusement.
 */
export function sortKeysDeep(value, ancestors = new Set()) {
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error("sortKeysDeep: cycle détecté dans la valeur");
    ancestors.add(value);
    const out = value.map((entry) => sortKeysDeep(entry, ancestors));
    ancestors.delete(value);
    return out;
  }

  if (value instanceof Date) return value.toISOString();

  if (value && typeof value === "object") {
    if (ancestors.has(value)) throw new Error("sortKeysDeep: cycle détecté dans la valeur");
    ancestors.add(value);
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeysDeep(value[key], ancestors);
    }
    ancestors.delete(value);
    return out;
  }

  return value;
}

export function stableStringify(value, indent = 2) {
  return JSON.stringify(sortKeysDeep(value), null, indent);
}

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
