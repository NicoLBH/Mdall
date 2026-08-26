/**
 * Sérialisation JSON déterministe — sans aucune dépendance à Node.
 *
 * Séparé de `json-io.mjs` (qui, lui, touche au système de fichiers) pour que
 * les couches métriques, garde-fous et rapport restent utilisables partout,
 * y compris dans un navigateur.
 */

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
